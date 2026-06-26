/**
 * src/lib/tokenBudget/tctrlGenerator.ts — Generate @@TCTRL EJS entries
 * 
 * Phase 3: Gọi AI sinh EJS controller code cho mỗi nhóm.
 * Fallback: template có sẵn nếu AI fail.
 */

import type { LorebookEntry } from '../../types/lorebook.types';
import type { ProxyProfile, GenerationParams, ChatMessage } from '../../types';
import { callAI } from '../ai/client';
import { DEFAULT_ENTRY_EXT } from '../../types/lorebook.types';
import type { TctrlAnalysis, TctrlGroup } from './groupBuilder';
import type { AnalyzedEntry, TctrlProgress, TctrlRunContext } from './tokenAnalyzer';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TctrlEntry {
  comment: string;
  content: string;
  keys: string[];
  constant: boolean;
  position: number;
  depth: number;
  order: number;
}

export interface TctrlGenerationResult {
  entries: TctrlEntry[];
  configPatches: ConfigPatch[];
  summary: TctrlSummary;
}

export interface ConfigPatch {
  entryId: number;
  patches: Partial<{
    extensions: Partial<LorebookEntry['extensions']>;
    enabled: boolean;
    insertion_order: number;
  }>;
  reason: string;
}

export interface TctrlSummary {
  tctrlEntriesAdded: number;
  entriesDisabled: number;
  entriesConfigChanged: number;
  tokensBefore: number;
  tokensAfterEstimate: number;
  apiCalls: number;
  totalTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const TCTRL_SYSTEM_PROMPT = `Bạn là chuyên gia viết EJS preprocessing cho SillyTavern.
Nhiệm vụ: Sinh code EJS @@preprocessing để kiểm soát worldbook entries.

BUILT-IN FUNCTIONS có thể dùng:
- setEntryEnabled(comment, bool) — Bật/tắt entry theo comment text
- getvar(key, opts) — Đọc biến
- setvar(key, value) — Ghi biến
- getwi(comment) — Đọc nội dung entry
- getChatMessages(idx, role) — Đọc tin nhắn chat

QUY TẮC:
1. Mở đầu bằng @@preprocessing
2. Dòng đầu code: <%# @@TCTRL — AUTO TOKEN CONTROLLER — DO NOT READ %>
3. Dùng <%_ _%> (whitespace slurp)
4. Dùng var (không let/const)
5. Comment rõ ràng mục đích mỗi block
6. setEntryEnabled dùng CHÍNH XÁC comment text của entry

CHỈ trả về code EJS. KHÔNG markdown, KHÔNG giải thích.`;

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE FALLBACKS (khi AI fail)
// ═══════════════════════════════════════════════════════════════════════════

function generateFallbackGateKeeper(analysis: TctrlAnalysis): string {
  const lines = [
    '@@preprocessing',
    '<%# @@TCTRL::GateKeeper_Main — AUTO TOKEN CONTROLLER — DO NOT READ %>',
    '<%_',
    `// ═══ AUTO TOKEN CONTROLLER (Generated) ═══`,
    `// Total entries: ${analysis.totalEntries}`,
    `// Total tokens: ~${analysis.totalTokens.toLocaleString()}`,
    `// Budget: ${analysis.effectiveBudget.toLocaleString()} tokens (${Math.round(analysis.effectiveBudget / analysis.totalTokens * 100)}% of total)`,
    `// Groups: ${analysis.groups.length}`,
    '',
  ];

  // Overview of groups
  for (const group of analysis.groups) {
    lines.push(`// ${group.name}: ${group.entries.length} entries, ~${group.totalTokens.toLocaleString()} tokens [${group.strategy}]`);
  }

  lines.push('', '// Controller is active — individual group controllers handle specifics.', '_%>');
  return lines.join('\n');
}

function generateFallbackGroupController(
  group: TctrlGroup,
  entriesInGroup: Array<{ id: number; comment: string; priority: string; tokens: number }>,
): string {
  const lines = [
    '@@preprocessing',
    `<%# @@TCTRL::Group_${group.id} — ${group.name} Controller — DO NOT READ %>`,
    '<%_',
    `// ═══ GROUP: ${group.name} ═══`,
    `// Entries: ${group.entries.length} | Tokens: ~${group.totalTokens.toLocaleString()} | Budget: ~${group.budgetAllocation.toLocaleString()}`,
    `// Strategy: ${group.strategy}`,
    '',
  ];

  if (group.strategy === 'constant') {
    lines.push('// Constant group — tất cả entries luôn bật, không cần kiểm soát.');
  } else {
    // Disable low priority entries
    const lowPriority = entriesInGroup.filter(e => e.priority === 'low');
    if (lowPriority.length > 0) {
      lines.push(`// Tắt ${lowPriority.length} entries priority LOW để tiết kiệm token:`);
      for (const entry of lowPriority) {
        if (entry.comment) {
          lines.push(`setEntryEnabled('${entry.comment.replace(/'/g, "\\'")}', false); // ~${entry.tokens} tokens`);
        }
      }
    }
  }

  lines.push('_%>');
  return lines.join('\n');
}

function generateFallbackPriorityGate(
  deadEntries: AnalyzedEntry[],
  duplicates: TctrlAnalysis['duplicates'],
): string {
  const lines = [
    '@@preprocessing',
    '<%# @@TCTRL::PriorityGate — Dead + Duplicate Cleaner — DO NOT READ %>',
    '<%_',
    '// ═══ PRIORITY GATE — Tắt entries chết và trùng ═══',
    '',
  ];

  if (deadEntries.length > 0) {
    lines.push(`// --- Dead entries (${deadEntries.length}) ---`);
    for (const entry of deadEntries.slice(0, 100)) { // Cap at 100 to avoid huge entries
      if (entry.comment) {
        lines.push(`setEntryEnabled('${entry.comment.replace(/'/g, "\\'")}', false); // ${entry.reason}`);
      }
    }
    if (deadEntries.length > 100) {
      lines.push(`// ... và ${deadEntries.length - 100} entries nữa (xem log)`);
    }
  }

  if (duplicates.length > 0) {
    lines.push('', `// --- Duplicate entries (${duplicates.length}) ---`);
    for (const dup of duplicates.slice(0, 50)) {
      if (dup.comment) {
        lines.push(`setEntryEnabled('${dup.comment.replace(/'/g, "\\'")}', false); // trùng với #${dup.keep}`);
      }
    }
  }

  lines.push('_%>');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GENERATION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseEjsResponse(text: string): string {
  // Remove markdown code fences if present
  let code = text.trim();
  const fenceMatch = code.match(/```(?:ejs|javascript|js)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) code = fenceMatch[1].trim();

  // Validate it starts with @@preprocessing
  if (!code.startsWith('@@preprocessing')) {
    // Try to find it
    const idx = code.indexOf('@@preprocessing');
    if (idx >= 0) code = code.slice(idx);
    else throw new Error('Response does not contain @@preprocessing');
  }

  return code;
}

export async function generateTctrlEntries(
  analysis: TctrlAnalysis,
  analyzedEntries: AnalyzedEntry[],
  ctx: TctrlRunContext,
  progressBase: Partial<TctrlProgress>,
): Promise<TctrlGenerationResult> {
  const tctrlEntries: TctrlEntry[] = [];
  const configPatches: ConfigPatch[] = [];
  let apiCalls = 0;
  const startedAt = Date.now();

  // Determine TCTRL entries to generate
  const normalGroups = analysis.groups.filter(g => g.strategy === 'normal' && g.entries.length > 0);
  const tctrlTotal = 1 + normalGroups.length + 1; // GateKeeper + per-group + PriorityGate
  let tctrlGenerated = 0;

  const updateProgress = () => {
    ctx.onProgress({
      ...progressBase as TctrlProgress,
      phase: 'generate',
      tctrlGenerated,
      tctrlTotal,
      apiCalls: (progressBase.apiCalls ?? 0) + apiCalls,
    });
  };

  ctx.log(`\n🤖 PHASE 3: Sinh ${tctrlTotal} @@TCTRL entries...`);

  // 1. GateKeeper_Main
  ctx.log('📡 Sinh @@TCTRL::GateKeeper_Main...');
  const gateKeeperCode = await tryGenerateWithAI(
    ctx,
    `Sinh EJS @@preprocessing cho CONTROLLER CHÍNH (GateKeeper).
Thông tin card:
- Tổng: ${analysis.totalEntries} entries, ~${analysis.totalTokens.toLocaleString()} tokens
- Budget: ${analysis.effectiveBudget.toLocaleString()} tokens
- Groups: ${analysis.groups.map(g => `${g.name} (${g.entries.length} entries, ~${g.totalTokens.toLocaleString()} tokens, ${g.strategy})`).join('; ')}

Comment entry: @@TCTRL::GateKeeper_Main
Mục đích: Overview controller, chứa thống kê, KHÔNG disable entries (các group controllers sẽ làm việc đó).`,
    () => generateFallbackGateKeeper(analysis),
  );
  apiCalls++;
  tctrlGenerated++;
  updateProgress();

  tctrlEntries.push({
    comment: '@@TCTRL::GateKeeper_Main',
    content: gateKeeperCode,
    keys: ['@@tctrl'],
    constant: true,
    position: 4,
    depth: 0,
    order: 999,
  });
  ctx.log('✅ @@TCTRL::GateKeeper_Main');

  // 2. Per-group controllers (only for normal groups)
  for (const group of normalGroups) {
    if (ctx.stopped) break;
    while (ctx.paused) await sleep(300);

    const entriesInGroup = group.entries.map(id => {
      const analyzed = analyzedEntries.find(e => e.entryId === id);
      return {
        id,
        comment: analyzed?.comment ?? `Entry #${id}`,
        priority: analyzed?.priority ?? 'medium',
        tokens: analyzed?.tokenEstimate ?? 0,
      };
    });

    ctx.log(`📡 Sinh @@TCTRL::Group_${group.id}...`);

    const groupCode = await tryGenerateWithAI(
      ctx,
      `Sinh EJS @@preprocessing cho GROUP CONTROLLER.
Group: "${group.name}"
- ${group.entries.length} entries, ~${group.totalTokens.toLocaleString()} tokens
- Budget: ~${group.budgetAllocation.toLocaleString()} tokens
- Strategy: ${group.strategy}

Entries trong nhóm (top 30):
${entriesInGroup.slice(0, 30).map(e => `- [id=${e.id}] "${e.comment}" priority:${e.priority} ~${e.tokens}tokens`).join('\n')}
${entriesInGroup.length > 30 ? `\n... và ${entriesInGroup.length - 30} entries nữa` : ''}

Comment entry: @@TCTRL::Group_${group.id}
Mục đích: Kiểm soát bật/tắt entries trong nhóm "${group.name}".
- Entries priority LOW → disable bằng setEntryEnabled(comment, false)
- Entries priority MEDIUM → giữ nguyên (để SillyTavern keyword matching quản lý)
- Entries priority HIGH/CRITICAL → không tắt`,
      () => generateFallbackGroupController(group, entriesInGroup),
    );
    apiCalls++;
    tctrlGenerated++;
    updateProgress();

    tctrlEntries.push({
      comment: `@@TCTRL::Group_${group.id}`,
      content: groupCode,
      keys: ['@@tctrl'],
      constant: true,
      position: 4,
      depth: 0,
      order: 998 - group.hierarchy,
    });
    ctx.log(`✅ @@TCTRL::Group_${group.id}`);
  }

  // 3. PriorityGate
  if (!ctx.stopped) {
    ctx.log('📡 Sinh @@TCTRL::PriorityGate...');
    const priorityGateCode = await tryGenerateWithAI(
      ctx,
      `Sinh EJS @@preprocessing cho PRIORITY GATE.
Mục đích: Tắt entries "chết" và entries trùng lặp.

Dead entries (${analysis.deadEntries.length}):
${analysis.deadEntries.slice(0, 40).map(e => `- [id=${e.entryId}] "${e.comment}" reason: ${e.reason}`).join('\n')}
${analysis.deadEntries.length > 40 ? `\n... và ${analysis.deadEntries.length - 40} entries nữa` : ''}

Duplicate entries (${analysis.duplicates.length}):
${analysis.duplicates.slice(0, 20).map(d => `- "${d.comment}" trùng với #${d.keep} → disable`).join('\n')}
${analysis.duplicates.length > 20 ? `\n... và ${analysis.duplicates.length - 20} cặp nữa` : ''}

Comment entry: @@TCTRL::PriorityGate
Dùng setEntryEnabled(comment, false) cho từng entry cần tắt.`,
      () => generateFallbackPriorityGate(analysis.deadEntries, analysis.duplicates),
    );
    apiCalls++;
    tctrlGenerated++;
    updateProgress();

    tctrlEntries.push({
      comment: '@@TCTRL::PriorityGate',
      content: priorityGateCode,
      keys: ['@@tctrl'],
      constant: true,
      position: 4,
      depth: 0,
      order: 990,
    });
    ctx.log('✅ @@TCTRL::PriorityGate');
  }

  // Build summary
  const summary: TctrlSummary = {
    tctrlEntriesAdded: tctrlEntries.length,
    entriesDisabled: analysis.deadEntries.length + analysis.duplicates.length,
    entriesConfigChanged: configPatches.length,
    tokensBefore: analysis.totalTokens,
    tokensAfterEstimate: Math.max(0, analysis.totalTokens
      - analysis.deadEntries.reduce((s, e) => s + e.tokenEstimate, 0)
      - analysis.duplicates.length * 200 // rough estimate per duplicate
    ),
    apiCalls,
    totalTime: Date.now() - startedAt,
  };

  ctx.log(`\n📊 Phase 3 hoàn thành: ${tctrlEntries.length} @@TCTRL entries, ${apiCalls} API calls`);

  return { entries: tctrlEntries, configPatches, summary };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Try AI with fallback
// ═══════════════════════════════════════════════════════════════════════════

async function tryGenerateWithAI(
  ctx: TctrlRunContext,
  userPrompt: string,
  fallback: () => string,
  maxRetries = 2,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: TCTRL_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ];

      const response = await callAI({
        profile: ctx.profile,
        params: ctx.generationParams,
        messages,
      });

      return parseEjsResponse(response.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        ctx.log(`⚠️ Retry ${attempt + 1}: ${msg}`);
        await sleep(2000);
      } else {
        ctx.log(`⚠️ AI fail — dùng template fallback: ${msg}`);
        return fallback();
      }
    }
  }
  return fallback(); // Should not reach here
}

// ═══════════════════════════════════════════════════════════════════════════
// MATERIALIZE — Convert TctrlEntry to LorebookEntry
// ═══════════════════════════════════════════════════════════════════════════

export function materializeTctrlEntry(tctrl: TctrlEntry, id: number): LorebookEntry {
  return {
    id,
    keys: tctrl.keys,
    secondary_keys: [],
    comment: tctrl.comment,
    content: tctrl.content,
    constant: tctrl.constant,
    selective: false,
    insertion_order: tctrl.order,
    enabled: true,
    position: 'before_char',
    use_regex: false,
    extensions: {
      ...DEFAULT_ENTRY_EXT,
      position: tctrl.position as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
      depth: tctrl.depth,
      exclude_recursion: true,
      prevent_recursion: true,
      scan_depth: null,
      ignore_budget: true,
    },
  };
}
