/**
 * src/lib/tokenBudget/tokenAnalyzer.ts — AI Batch Analysis Pipeline
 * 
 * Chia entries thành batches, gọi AI phân tích từng batch.
 * Pattern giống batchGenerator.ts: retry, concurrent, pause/resume, fallback local.
 * 
 * NGUYÊN TẮC: KHÔNG BAO GIỜ DỪNG — worst case = fallback phân tích local.
 */

import type { LorebookEntry } from '../../types/lorebook.types';
import type { ProxyProfile, GenerationParams, ChatMessage, CharacterCardV3 } from '../../types';
import { callAI } from '../ai/client';
import { categorizeEntry, type AutoCategory } from '../worldbook/lorebookCategorizer';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TctrlAnalysisConfig {
  entriesPerBatch: number;       // UI: 20/30/50/80/100 (default 50)
  maxRetries: number;            // 3 per batch
  maxConsecutiveErrors: number;  // 5
  concurrentBatches: number;     // UI: 1/2/3/5/10 (default 2)
  targetBudgetPercent: number;   // UI slider: 20-80% (default 40)
  inputContext: number;          // 131072
}

export const DEFAULT_TCTRL_CONFIG: TctrlAnalysisConfig = {
  entriesPerBatch: 50,
  maxRetries: 3,
  maxConsecutiveErrors: 5,
  concurrentBatches: 2,
  targetBudgetPercent: 40,
  inputContext: 131072,
};

export interface AnalyzedEntry {
  entryId: number;
  comment: string;
  category: AutoCategory;
  xmlTag: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tokenEstimate: number;
  groupSuggestion: string;
  isDead: boolean;
  duplicateOf: number | null;
  reason: string;
  controlHint?: {
    variableName: string;    // "location" | "era" | "mood" | "quest_stage" | ...
    condition: string;       // "=== 'Khu rừng'" | "> 50"
    matchValue: string;      // "Khu rừng", "50"
  };
}

export interface TctrlProgress {
  phase: 'analyze' | 'group' | 'generate' | 'optimize' | 'done' | 'error';
  batchCurrent: number;
  batchTotal: number;
  entriesProcessed: number;
  entriesTotal: number;
  tctrlGenerated: number;
  tctrlTotal: number;
  apiCalls: number;
  errors: number;
  retries: number;
  startedAt: number;
  estimatedRemaining: number;
  currentConcurrency: number;
}

export interface TctrlRunContext {
  card: CharacterCardV3;
  profile: ProxyProfile;
  generationParams: GenerationParams;
  paused: boolean;
  stopped: boolean;
  log: (message: string) => void;
  onProgress: (progress: TctrlProgress) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const ANALYSIS_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích Worldbook SillyTavern.
Nhiệm vụ: Phân tích danh sách entries và trả về phân loại cho TỪNG entry.

Với MỖI entry, xác định:
1. entryId: Giữ nguyên ID được cung cấp
2. category: character | npc | location | lore | system | item | quest | rule | uncategorized
3. xmlTag: Detect XML tag chính trong content (<Character>, <Location>, <Meta>, <System>, <Mechanic>, <Rule>, <Worldview>, <Timeline>, <Faction>, <Organization>, <Religion>, <Area>) — null nếu không có
4. priority:
   - critical: constant=true, system rules, core setup → LUÔN phải bật
   - high: main character, worldview → rất quan trọng
   - medium: NPC, location, lore → quan trọng trung bình
   - low: chi tiết phụ, entry ít dùng → có thể tắt
5. groupSuggestion: Gợi ý nhóm ngắn gọn (VD: "Core System", "Nhân vật chính", "NPC Vùng A", "Lore Cổ đại")
6. isDead: true nếu: entry có content rỗng, HOẶC không có keys và không constant, HOẶC nội dung vô nghĩa
7. duplicateOf: ID entry khác nếu nội dung gần giống (>80% overlap) — null nếu không trùng
8. reason: 1 dòng ngắn giải thích phân loại
9. controlHint: Gợi ý biến điều khiển entry này. null nếu entry luôn bật hoặc chỉ cần keyword matching.
   - variableName: tên biến ngắn gọn bằng tiếng Anh (location, era, mood, quest_stage, time_of_day, combat_state, relationship)
   - condition: điều kiện EJS bật entry ("=== 'Khu rừng'" hoặc "> 50" hoặc "=== true")
   - matchValue: giá trị tương ứng ("Khu rừng", "50", "true")

CHỈ trả về JSON array. KHÔNG markdown, KHÔNG giải thích bên ngoài.
[{"entryId":1,"category":"character","xmlTag":"<Character>","priority":"high","groupSuggestion":"Nhân vật chính","isDead":false,"duplicateOf":null,"reason":"Main character entry","controlHint":null}]`;

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL FALLBACK ANALYZER (khi AI fail)
// ═══════════════════════════════════════════════════════════════════════════

const XML_TAG_REGEX = /<(Meta|System|Mechanic|Rule|Worldview|Timeline|Character|Faction|Organization|Religion|Location|Area)>/i;

function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}

export function analyzeLocal(entry: LorebookEntry): AnalyzedEntry {
  const catResult = categorizeEntry(entry);
  const xmlMatch = entry.content.match(XML_TAG_REGEX);
  const xmlTag = xmlMatch ? `<${xmlMatch[1]}>` : null;

  // Priority detection
  let priority: AnalyzedEntry['priority'] = 'medium';
  if (entry.constant) priority = 'critical';
  else if (catResult.category === 'character') priority = 'high';
  else if (catResult.category === 'system' || catResult.category === 'rule') priority = 'high';
  else if (catResult.category === 'lore' || catResult.category === 'location') priority = 'medium';
  else if (catResult.category === 'uncategorized') priority = 'low';

  // Dead detection
  const isDead = !entry.content.trim()
    || (entry.keys.length === 0 && !entry.constant && !entry.content.trimStart().startsWith('@@preprocessing'))
    || entry.content.trim().length < 10;

  // Group suggestion from category + xml tag
  const groupMap: Partial<Record<AutoCategory, string>> = {
    character: 'Characters',
    npc: 'NPC',
    location: 'Locations',
    lore: 'Lore & History',
    system: 'Core System',
    ejs: 'EJS Scripts',
    mvu: 'MVU Variables',
    item: 'Items & Skills',
    quest: 'Quests',
    rule: 'Rules & Guidelines',
  };

  // XML tag → group mapping (override)
  const xmlGroupMap: Record<string, string> = {
    '<Meta>': 'Core System & Meta',
    '<System>': 'Core System & Meta',
    '<Mechanic>': 'Core System & Meta',
    '<Rule>': 'Core System & Meta',
    '<Worldview>': 'Worldview & Timeline',
    '<Timeline>': 'Worldview & Timeline',
    '<Character>': 'Characters',
    '<Faction>': 'Factions & Organizations',
    '<Organization>': 'Factions & Organizations',
    '<Religion>': 'Factions & Organizations',
    '<Location>': 'Locations & Areas',
    '<Area>': 'Locations & Areas',
  };

  const groupSuggestion = xmlTag ? (xmlGroupMap[xmlTag] ?? groupMap[catResult.category] ?? 'Uncategorized')
    : (groupMap[catResult.category] ?? 'Uncategorized');

  return {
    entryId: entry.id,
    comment: entry.comment,
    category: catResult.category,
    xmlTag,
    priority,
    tokenEstimate: estimateTokens(entry.content),
    groupSuggestion,
    isDead,
    duplicateOf: null, // Local không detect duplicate
    reason: `Local: ${catResult.category} (confidence ${catResult.confidence.toFixed(2)})`,
    controlHint: detectControlHintLocal(entry, catResult.category, xmlTag),
  };
}

// ─── Heuristic variable detection ───────────────────────────────────────

const VARIABLE_HEURISTICS: Array<{
  variableName: string;
  patterns: RegExp[];
  extractor: (match: RegExpMatchArray) => { condition: string; matchValue: string };
}> = [
  {
    variableName: 'era',
    patterns: [/(?:cổ đại|thời cổ|ancient|medieval)/i, /(?:hiện đại|modern|contemporary)/i, /(?:tương lai|futuristic|sci-?fi)/i],
    extractor: (m) => ({ condition: `=== '${m[0]}'`, matchValue: m[0] }),
  },
  {
    variableName: 'time_of_day',
    patterns: [/(?:ban đêm|đêm tối|night|midnight)/i, /(?:ban ngày|buổi sáng|dawn|morning|daytime)/i, /(?:hoàng hôn|chiều tối|dusk|evening)/i],
    extractor: (m) => ({ condition: `=== '${m[0]}'`, matchValue: m[0] }),
  },
  {
    variableName: 'mood',
    patterns: [/(?:giận dữ|tức giận|angry|rage)/i, /(?:buồn bã|đau khổ|sad|sorrow)/i, /(?:vui vẻ|hạnh phúc|happy|joy)/i, /(?:sợ hãi|hoảng loạn|fear|panic)/i],
    extractor: (m) => ({ condition: `=== '${m[0]}'`, matchValue: m[0] }),
  },
  {
    variableName: 'combat_state',
    patterns: [/(?:chiến đấu|combat|battle|fight)/i, /(?:an toàn|peaceful|safe)/i],
    extractor: (m) => ({ condition: '=== true', matchValue: 'true' }),
  },
];

function detectControlHintLocal(
  entry: LorebookEntry,
  category: AutoCategory,
  xmlTag: string | null,
): AnalyzedEntry['controlHint'] {
  // System/EJS/MVU entries → no control hint
  if (category === 'system' || category === 'ejs' || category === 'mvu' || category === 'rule') return undefined;
  // Constant entries → no hint (they're always on)
  if (entry.constant) return undefined;

  // Location entries → variable "location"
  if (category === 'location' || xmlTag === '<Location>' || xmlTag === '<Area>') {
    const locationName = entry.comment || entry.keys[0] || '';
    if (locationName) {
      return { variableName: 'location', condition: `=== '${locationName}'`, matchValue: locationName };
    }
  }

  // Check content against heuristics
  const content = entry.content;
  for (const heuristic of VARIABLE_HEURISTICS) {
    for (const pattern of heuristic.patterns) {
      const match = content.match(pattern);
      if (match) {
        return { variableName: heuristic.variableName, ...heuristic.extractor(match) };
      }
    }
  }

  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI BATCH ANALYSIS — MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildAnalysisUserMessage(
  batch: LorebookEntry[],
  batchIndex: number,
  totalBatches: number,
): string {
  const entrySummaries = batch.map(e => {
    const enabledStr = e.enabled ? '✅' : '❌';
    const constantStr = e.constant ? ' [CONSTANT]' : '';
    const keys = e.keys.length > 0 ? ` keys:[${e.keys.slice(0, 5).join(',')}]` : ' keys:[]';
    const contentPreview = e.content.slice(0, 300).replace(/\n/g, ' ');
    return `[id=${e.id}] ${enabledStr}${constantStr}${keys} comment:"${e.comment || '(none)'}"\n  content: ${contentPreview}${e.content.length > 300 ? '...' : ''}`;
  }).join('\n\n');

  return `Batch ${batchIndex}/${totalBatches} — Phân tích ${batch.length} entries:\n\n${entrySummaries}`;
}

function parseAnalysisResponse(text: string): AnalyzedEntry[] {
  // Try raw parse
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) return validateAnalyzedEntries(parsed);
  } catch { /* continue */ }

  // Try code fence
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (Array.isArray(parsed)) return validateAnalyzedEntries(parsed);
    } catch { /* continue */ }
  }

  // Try find array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return validateAnalyzedEntries(parsed);
    } catch { /* continue */ }
  }

  throw new Error('Cannot parse AI response as JSON array');
}

function validateAnalyzedEntries(arr: unknown[]): AnalyzedEntry[] {
  const validCategories = ['character', 'npc', 'location', 'lore', 'system', 'item', 'quest', 'rule', 'uncategorized', 'ejs', 'mvu'];
  const validPriorities = ['critical', 'high', 'medium', 'low'];

  return arr.filter((item): item is Record<string, unknown> =>
    typeof item === 'object' && item !== null && 'entryId' in item
  ).map(item => {
    // Parse controlHint
    let controlHint: AnalyzedEntry['controlHint'] = undefined;
    if (item.controlHint && typeof item.controlHint === 'object') {
      const h = item.controlHint as Record<string, unknown>;
      if (h.variableName && h.condition && h.matchValue) {
        controlHint = {
          variableName: String(h.variableName),
          condition: String(h.condition),
          matchValue: String(h.matchValue),
        };
      }
    }

    return {
      entryId: Number(item.entryId),
      comment: String(item.comment ?? ''),
      category: (validCategories.includes(String(item.category)) ? String(item.category) : 'uncategorized') as AutoCategory,
      xmlTag: typeof item.xmlTag === 'string' ? item.xmlTag : null,
      priority: (validPriorities.includes(String(item.priority)) ? String(item.priority) : 'medium') as AnalyzedEntry['priority'],
      tokenEstimate: typeof item.tokenEstimate === 'number' ? item.tokenEstimate : 0,
      groupSuggestion: String(item.groupSuggestion ?? 'Uncategorized'),
      isDead: Boolean(item.isDead),
      duplicateOf: typeof item.duplicateOf === 'number' ? item.duplicateOf : null,
      reason: String(item.reason ?? ''),
      controlHint,
    };
  });
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /rate.?limit|429|too many requests|quota/i.test(msg);
}

export async function runTctrlAnalysis(
  entries: LorebookEntry[],
  config: TctrlAnalysisConfig,
  ctx: TctrlRunContext,
): Promise<AnalyzedEntry[]> {
  const totalBatches = Math.ceil(entries.length / config.entriesPerBatch);
  const allResults: AnalyzedEntry[] = [];
  let consecutiveErrors = 0;
  let apiCalls = 0;
  let retries = 0;
  let currentConcurrency = config.concurrentBatches;
  const startedAt = Date.now();

  ctx.log(`🚀 Bắt đầu phân tích ${entries.length} entries trong ${totalBatches} batches (${currentConcurrency} song song)`);

  const makeProgress = (batch: number): TctrlProgress => ({
    phase: 'analyze',
    batchCurrent: batch,
    batchTotal: totalBatches,
    entriesProcessed: allResults.length,
    entriesTotal: entries.length,
    tctrlGenerated: 0,
    tctrlTotal: 0,
    apiCalls,
    errors: consecutiveErrors,
    retries,
    startedAt,
    estimatedRemaining: batch > 0
      ? ((Date.now() - startedAt) / batch) * (totalBatches - batch) / 1000
      : 0,
    currentConcurrency,
  });

  // Process in rounds of `currentConcurrency`
  for (let roundStart = 0; roundStart < totalBatches; roundStart += currentConcurrency) {
    // Pause/resume
    while (ctx.paused) await sleep(300);
    if (ctx.stopped) { ctx.log('⏹ Đã dừng.'); break; }

    const roundEnd = Math.min(roundStart + currentConcurrency, totalBatches);
    const batchIndices: number[] = [];
    for (let i = roundStart; i < roundEnd; i++) batchIndices.push(i);

    // Build tasks
    const tasks = batchIndices.map(i => {
      const slice = entries.slice(
        i * config.entriesPerBatch,
        (i + 1) * config.entriesPerBatch,
      );
      return { batchIndex: i, slice };
    }).filter(t => t.slice.length > 0);

    if (tasks.length === 0) break;

    // Execute all tasks in this round concurrently
    const results = await Promise.all(tasks.map(async (task) => {
      let result: AnalyzedEntry[] | null = null;

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        if (ctx.stopped) return { batchIndex: task.batchIndex, entries: null, usedLocal: false };

        try {
          ctx.log(`📡 Batch ${task.batchIndex + 1}/${totalBatches} (${task.slice.length} entries)${attempt > 0 ? ` — thử lại ${attempt}` : ''}`);
          apiCalls++;

          const userMessage = buildAnalysisUserMessage(task.slice, task.batchIndex + 1, totalBatches);
          const messages: ChatMessage[] = [
            { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ];

          const response = await callAI({
            profile: ctx.profile,
            params: { ...ctx.generationParams, useJsonResponseFormat: true },
            messages,
          });

          result = parseAnalysisResponse(response.text);

          // Backfill tokenEstimate if AI didn't provide it
          for (const r of result) {
            if (!r.tokenEstimate) {
              const src = task.slice.find(e => e.id === r.entryId);
              if (src) r.tokenEstimate = estimateTokens(src.content);
            }
            if (!r.comment) {
              const src = task.slice.find(e => e.id === r.entryId);
              if (src) r.comment = src.comment;
            }
          }

          break; // Success
        } catch (err) {
          retries++;

          // Rate limit → auto-throttle
          if (isRateLimitError(err)) {
            const oldConcurrency = currentConcurrency;
            currentConcurrency = 1;
            ctx.log(`⚠️ Rate limit! Giảm song song ${oldConcurrency} → 1. Chờ 5s...`);
            await sleep(5000);
          }

          if (attempt === config.maxRetries) {
            // FALLBACK: local analysis
            ctx.log(`⚠️ Batch ${task.batchIndex + 1} thất bại ${config.maxRetries + 1} lần — dùng phân tích local`);
            result = task.slice.map(e => analyzeLocal(e));
            return { batchIndex: task.batchIndex, entries: result, usedLocal: true };
          }
        }
      }

      return { batchIndex: task.batchIndex, entries: result, usedLocal: false };
    }));

    // Process results
    for (const { batchIndex, entries: batchEntries, usedLocal } of results) {
      if (ctx.stopped) break;

      if (batchEntries) {
        allResults.push(...batchEntries);
        consecutiveErrors = 0;
        const label = usedLocal ? '📋 (local)' : '✅';
        ctx.log(`${label} Batch ${batchIndex + 1}: +${batchEntries.length} entries (tổng: ${allResults.length}/${entries.length})`);
      } else {
        // Should not happen due to fallback, but just in case
        consecutiveErrors++;
        ctx.log(`❌ Batch ${batchIndex + 1} thất bại hoàn toàn`);
      }

      ctx.onProgress(makeProgress(batchIndex + 1));
    }

    // If too many consecutive errors, fallback all remaining
    if (consecutiveErrors >= config.maxConsecutiveErrors) {
      ctx.log(`⚠️ ${consecutiveErrors} lỗi liên tiếp — chuyển sang phân tích local`);
      for (let r = roundEnd; r < totalBatches; r++) {
        const remaining = entries.slice(
          r * config.entriesPerBatch,
          (r + 1) * config.entriesPerBatch,
        );
        allResults.push(...remaining.map(e => analyzeLocal(e)));
        ctx.onProgress(makeProgress(r + 1));
      }
      break;
    }

    // Try to restore concurrency after successful round
    if (currentConcurrency < config.concurrentBatches && consecutiveErrors === 0) {
      currentConcurrency = config.concurrentBatches;
      ctx.log(`🔄 Khôi phục song song: ${currentConcurrency}`);
    }
  }

  ctx.log(`\n📊 Phân tích hoàn thành: ${allResults.length}/${entries.length} entries, ${apiCalls} API calls, ${retries} retries`);
  return allResults;
}
