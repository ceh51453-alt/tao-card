/**
 * src/lib/ai/batchGenerator.ts — Batch Lorebook Generator Pipeline
 * Spec Phần 7.3: BatchGenConfig, system prompt, user message builder, runBatchGeneration
 */

import type { ProxyProfile, GenerationParams, ChatMessage, AIGeneratedEntry, CharacterCardV3, LorebookEntry } from '../../types';
import { callAI } from './client';
import { materializeEntry, nextEntryId } from '../converters/cardDefaults';
import { TFIDFIndex } from '../rag/tfidfIndexer';
import { buildRAGContext } from '../rag/ragContextBuilder';
import { isDuplicateEntry } from './deduplicator';
import { checkAntiSummarization } from '../completionVerifier/antiSummarization';
import { buildCoherenceContext } from './coherenceManager';
import type { EntryCategory, CardType } from '../worldbook/worldbookConfig';
import { cascadeSearch } from './webScraper';
import { getProfileExtractionContext } from './worldbuildingDefaults';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface BatchGenConfig {
  topicPrompt: string;
  useCardContext: boolean;
  totalEntries: number;
  entriesPerBatch: number;
  defaultPosition: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  defaultDepth?: number;
  defaultRole?: 0 | 1 | 2;
  insertionOrderMode: 'same' | 'increment';
  insertionOrderStart: number;
  maxRetriesPerBatch: number;
  maxConsecutiveErrors: number;
  modelOverride?: string;
  concurrentBatches?: number;  // số batch gọi song song (mặc định 1)
  category?: EntryCategory;    // loại entry theo guide worldbook
  cardType?: CardType;         // thẻ đơn vs nhiều nhân vật
  useWebSearch?: boolean;      // Kích hoạt SOTA Web Search
  autoConfig?: boolean;        // true = AI tự quyết order/position/depth per entry
  schemaContext?: string;      // MVUZOD schema context — inject vào prompt khi có schema
}

export interface BatchProgress {
  batch: number;
  totalBatches: number;
  created: number;
  total: number;
  status: 'running' | 'paused' | 'done' | 'error' | 'stopped';
}

export interface BatchRunContext {
  card: CharacterCardV3;
  profile: ProxyProfile;
  generationParams: GenerationParams;
  // Control
  paused: boolean;
  stopped: boolean;
  // Callbacks
  log: (message: string) => void;
  onProgress: (progress: BatchProgress) => void;
  appendEntry: (entry: LorebookEntry) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const BATCH_SYSTEM_PROMPT = `Bạn là trợ lý chuyên tạo Lorebook (World Info) cho SillyTavern.
Nhiệm vụ: dựa trên YÊU CẦU và NGỮ CẢNH NHÂN VẬT, tạo các mục Lorebook MỚI,
KHÔNG TRÙNG LẶP với danh sách "Entries đã có".

--- QUY TẮC VIẾT CONTENT (ANTI-DATA-LOSS PROTOCOL) ---
1. VIẾT ĐẦY ĐỦ: Mỗi entry phải chứa thông tin hoàn chỉnh, không viết tắt,
   không lược bỏ, không viết "xem thêm ở entry khác".
2. CÁCH LY GIỌNG ĐIỆU: Trường "content" viết ở ngôi thứ ba, khách quan, trung lập.
   Viết theo định dạng database (YAML/danh sách), KHÔNG viết như tiểu thuyết.
3. KHÔNG TRÙNG LẶP: Không tạo lại các chủ đề đã có trong danh sách "Entries đã có".
4. KHÔNG TÓM TẮT: Không dùng "...", "[rút gọn]", "v.v.", "tương tự entry X".
5. THÔNG TIN CỤ THỂ: Ghi đầy đủ số liệu, tên riêng, mô tả chi tiết.
6. NÉN KHÔNG PHẢI XÓA: Dùng ít chữ nhất để nói rõ mọi thiết lập.
   Thay "là một", "tồn tại", "được cấu thành từ" bằng dấu hai chấm và liệt kê.

--- HƯỚNG DẪN KỸ THUẬT SILLYTAVERN ---
• keys: Bao phủ TẤT CẢ cách xưng hô có thể:
  - Nhân vật/NPC: tên đầy đủ, biệt danh, ngoại hiệu, chức vụ
  - Cảnh vật: tên địa danh, tên gọi khác, hành động liên quan
  - Thế lực: tên đầy đủ, viết tắt, địa danh trụ sở
  - Ngăn cách bằng dấu phẩy tiếng Anh (,), KHÔNG có khoảng trắng sau phẩy
• constant: true cho entry thường trú (thế giới quan, bối cảnh, nhân vật thẻ đơn)
• selective: true cho entry tải theo nhu cầu (NPC, cảnh vật, sự kiện)
• insertion_order: worldview=1-3, overview=4, character=10-50, scene=50-98, NPC=100

CHỈ trả về MỘT MẢNG JSON hợp lệ. KHÔNG thêm giải thích, KHÔNG markdown, KHÔNG code block.`;

// ─── AUTO-CONFIG ADDON (chỉ inject khi autoConfig=true) ──────────────────

export const AUTO_CONFIG_ADDON = `

--- AUTO-CONFIG PER ENTRY (QUAN TRỌNG — ĐỌC KỸ) ---

Ngoài comment/keys/content, bạn PHẢI trả thêm config cho MỖI entry. Dưới đây là BẢNG PHÂN LOẠI CHUẨN:

═══ 7 LOẠI ENTRY & CẤU HÌNH TƯƠNG ỨNG ═══

1. THẾ GIỚI QUAN / BỐI CẢNH (Tổng cương thế giới)
   → constant=true, selective=false
   → position=0 (before_char), depth=4
   → insertion_order=1-3
   → scan_depth=null (constant không cần scan)
   Nội dung: Tên thế giới, quy tắc cốt lõi, khu vực lớn. Viết dạng YAML/database.
   Luôn thường trú (đèn xanh dương). Dùng ít chữ nhất nói rõ mọi thiết lập.

2. TỔNG QUAN KHU VỰC (Xem lướt)
   → constant=true, selective=false
   → position=0 (before_char), depth=4
   → insertion_order=4-10
   → scan_depth=null
   Nội dung: Liệt kê khu vực + 1 câu định vị. KHÔNG triển khai chi tiết.

3. XEM LƯỚT NHÂN VẬT (Character Overview)
   → constant=true, selective=false
   → position=0 (before_char), depth=4
   → insertion_order=4
   → scan_depth=null
   Nội dung: Giới thiệu vắn tắt tất cả nhân vật. Luôn thường trú.

4. CHI TIẾT NHÂN VẬT CỐT LÕI
   Thẻ đơn (1 nhân vật):
     → constant=true, selective=false ← QUY LUẬT THÉP: thẻ đơn = toàn bộ đèn xanh dương
     → position=1 (after_char), depth=4
     → insertion_order=10-50 (cơ bản=10, ngoại hình=20, tính cách=30, bối cảnh=40, NSFW=50)
     → scan_depth=null
   Thẻ nhiều nhân vật (2+ nhân vật):
     → constant=false, selective=true ← đèn xanh lá, chỉ tải khi nhắc đến
     → position=1 (after_char), depth=4
     → insertion_order=99
     → scan_depth=2

5. NPC (Vai phụ)
   → constant=false, selective=true
   → position=1 (after_char), depth=4
   → insertion_order=100
   → scan_depth=2
   Từ khóa: Tên đầy đủ, biệt danh, ngoại hiệu, chức vụ, tất cả cách gọi có thể.
   Ví dụ: "Vương Tĩnh,Cô giáo Vương,Giáo viên chủ nhiệm"

6. CẢNH VẬT / SỰ KIỆN / ĐỊA DANH
   → constant=false, selective=true
   → position=1 (after_char), depth=4
   → insertion_order=50-98
   → scan_depth=2
   Từ khóa: Tên cảnh vật, tên khu vực, tên gọi khác, hành động liên quan.
   Ví dụ: "Thư viện,Thư viện trường,Mượn sách"

7. GIẢI THÍCH LẦN HAI / CHỈ ĐẠO AI (D0)
   → constant=false, selective=true
   → position=4 (@depth), depth=0, role=0 (system)
   → insertion_order=1
   → scan_depth=2
   Nội dung: Điều chỉnh hành vi AI cho nhân vật cụ thể. D0 = vị trí AI đọc cuối cùng = sức ảnh hưởng mạnh nhất.
   Từ khóa: Tên nhân vật cần điều chỉnh.

═══ QUY TẮC THIẾT KẾ TỪ KHÓA ═══
• Ngăn cách bằng dấu phẩy tiếng Anh (,), KHÔNG có khoảng trắng sau phẩy
• Bao phủ TẤT CẢ cách xưng hô: tên đầy đủ, biệt danh, ngoại hiệu, chức vụ, tên gọi khác
• Thế lực: tên đầy đủ, viết tắt, địa danh trụ sở
• NPC: tên đầy đủ, biệt danh, ngoại hiệu, chức vụ
• Cảnh vật: tên địa danh, tên gọi khác, hành động liên quan
• Entry thường trú (constant=true) → KHÔNG cần từ khóa

═══ QUY TẮC VIẾT CONTENT ═══
• Dùng định dạng database (YAML/danh sách), KHÔNG viết như tiểu thuyết
• NÉN KHÔNG PHẢI XÓA: dùng ít chữ nhất nói rõ mọi thiết lập
• Thay "là một", "tồn tại", "được cấu thành từ" bằng dấu hai chấm và liệt kê
• Tiêu chuẩn: xóa câu này đi AI có diễn sai không? Không thì xóa
• KHÔNG viết đánh giá chủ quan ("hùng mạnh", "bí ẩn"), KHÔNG viết hình ảnh tu từ

═══ BẢNG TÓM TẮT NHANH ═══
Loại             | const | selec | pos | depth | order  | scan
Thế giới quan    | true  | false | 0   | 4     | 1-3    | null
Tổng quan KV     | true  | false | 0   | 4     | 4-10   | null
Xem lướt NV      | true  | false | 0   | 4     | 4      | null
Chi tiết NV(đơn) | true  | false | 1   | 4     | 10-50  | null
Chi tiết NV(đa)  | false | true  | 1   | 4     | 99     | 2
NPC              | false | true  | 1   | 4     | 100    | 2
Cảnh vật/SK      | false | true  | 1   | 4     | 50-98  | 2
Chỉ đạo AI(D0)  | false | true  | 4   | 0     | 1      | 2

JSON FORMAT BẮT BUỘC:
[{
  "comment": "Tên entry",
  "keys": ["từ khóa 1","từ khóa 2"],
  "content": "Nội dung dạng database...",
  "constant": true/false,
  "selective": true/false,
  "insertion_order": number,
  "position": 0|1|4,
  "depth": 4,
  "role": null,
  "scan_depth": 2|null
}, ...]
`;

// ═══════════════════════════════════════════════════════════════════════════
// USER MESSAGE BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildBatchUserMessage(
  config: BatchGenConfig,
  card: CharacterCardV3,
  seen: Array<{ comment: string; keys: string[] }>,
  ragInjection: string,
  coherenceInjection: string,
  webInjection: string,
  countThisBatch: number,
  batchIndex: number,
  totalBatches: number,
): string {
  const parts: string[] = [];

  if (config.useCardContext) {
    parts.push(`### Ngữ cảnh nhân vật
Tên: ${card.data.name}
Description: ${card.data.description.slice(0, 1000)}
Personality: ${card.data.personality.slice(0, 500)}
Scenario: ${card.data.scenario.slice(0, 500)}`);
  }

  // Inject schema context khi có MVUZOD schema
  if (config.schemaContext) {
    parts.push(`### Schema biến (MVUZOD)\n${config.schemaContext}`);
  }

  parts.push(`### Yêu cầu nội dung
${config.topicPrompt}`);

  if (seen.length > 0) {
    const existingList = seen.map(e => `- "${e.comment}" — keys: [${e.keys.join(', ')}]`).join('\n');
    parts.push(`### Entries đã có (KHÔNG tạo lại)
${existingList}`);
  }

  parts.push(`### RAG Context (KHÔNG tạo lại các entry này)
${ragInjection ? `\n[NGỮ CẢNH RAG LỊCH SỬ]:\n${ragInjection}` : ''}
${coherenceInjection ? `\n[TÍNH NHẤT QUÁN COHERENCE]:\n${coherenceInjection}` : ''}
${webInjection ? `\n[KIẾN THỨC TỪ WEB (LIVE)]:\n${webInjection}` : ''}

[SỐ LƯỢNG YÊU CẦU LẦN NÀY]: Hãy sinh ra đúng ${countThisBatch} entries hợp lệ (batch ${batchIndex}/${totalBatches}).`);

  return parts.join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON ARRAY EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

export function tryExtractJsonArray(text: string): AIGeneratedEntry[] | null {
  // Try raw parse first
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed) && parsed.length > 0) return validateEntries(parsed);
  } catch { /* continue */ }

  // Try extracting from code fence
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (Array.isArray(parsed)) return validateEntries(parsed);
    } catch { /* continue */ }
  }

  // Try finding array in text
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return validateEntries(parsed);
    } catch { /* continue */ }
  }

  return null;
}

function validateEntries(arr: unknown[]): AIGeneratedEntry[] | null {
  const valid: AIGeneratedEntry[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    if (typeof e.comment !== 'string' || !Array.isArray(e.keys) || typeof e.content !== 'string') continue;
    if (!e.comment.trim() || !e.content.trim() || e.keys.length === 0) continue;
    valid.push({
      comment: e.comment,
      keys: e.keys.map(String),
      secondary_keys: Array.isArray(e.secondary_keys) ? e.secondary_keys.map(String) : undefined,
      content: e.content,
      constant: typeof e.constant === 'boolean' ? e.constant : undefined,
      selective: typeof e.selective === 'boolean' ? e.selective : undefined,
      insertion_order: typeof e.insertion_order === 'number' ? e.insertion_order : undefined,
      // AI Auto-Config per entry
      position: typeof e.position === 'number' && [0,1,2,3,4,5,6,7].includes(e.position)
        ? e.position as AIGeneratedEntry['position'] : undefined,
      depth: typeof e.depth === 'number' ? e.depth : undefined,
      role: typeof e.role === 'number' && [0,1,2].includes(e.role)
        ? e.role as AIGeneratedEntry['role'] : (e.role === null ? null : undefined),
      scan_depth: typeof e.scan_depth === 'number' ? e.scan_depth : undefined,
      category_hint: typeof e.category_hint === 'string' ? e.category_hint : undefined,
    });
  }
  return valid.length > 0 ? valid : null;
}

// (Old simple checks replaced by deduplicator.ts and completionVerifier/antiSummarization.ts)

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runBatchGeneration(config: BatchGenConfig, ctx: BatchRunContext) {
  if (!ctx.card.data.character_book) {
    ctx.card.data.character_book = { name: ctx.card.data.name, entries: [] };
  }
  if (!ctx.card.data.character_book.entries) {
    ctx.card.data.character_book.entries = [];
  }
  
  const totalBatches = Math.ceil(config.totalEntries / config.entriesPerBatch);
  const concurrency = Math.max(1, Math.min(config.concurrentBatches ?? 1, 10));
  let created = 0;
  let consecutiveErrors = 0;
  const seen: Array<{ comment: string; keys: string[] }> = (
    ctx.card.data.character_book?.entries ?? []
  ).map(e => ({ comment: e.comment, keys: e.keys }));

  const profile = config.modelOverride
    ? { ...ctx.profile, selectedModel: config.modelOverride }
    : ctx.profile;

  ctx.log(`🚀 Bắt đầu sinh ${config.totalEntries} entries trong ${totalBatches} batches` +
    (concurrency > 1 ? ` (${concurrency} song song)` : ''));

  // Initialize RAG index
  const ragIndex = new TFIDFIndex();
  ragIndex.indexWithSource(ctx.card.data.character_book?.entries ?? []);
  ctx.log(`📊 RAG index: ${ragIndex.size} entries đã index`);
  let entriesSinceLastRebuild = 0;

  // Process batches in rounds of `concurrency`
  for (let roundStart = 1; roundStart <= totalBatches; roundStart += concurrency) {
    if (ctx.stopped) { ctx.log('⏹ Đã dừng.'); break; }
    while (ctx.paused) { await sleep(300); }

    const roundEnd = Math.min(roundStart + concurrency - 1, totalBatches);
    const batchIndices: number[] = [];
    for (let i = roundStart; i <= roundEnd; i++) batchIndices.push(i);

    // Build tasks for this round
    const tasks = (await Promise.all(batchIndices.map(async i => {
      const countThisBatch = Math.min(config.entriesPerBatch, config.totalEntries - created - (i - roundStart) * config.entriesPerBatch);
      if (countThisBatch <= 0) return null;

      const ragCtx = buildRAGContext(config.topicPrompt, ragIndex, { topK: 8, includeNegatives: true });
      const coherenceCtx = buildCoherenceContext(ctx.card.data.character_book?.entries ?? []);
      
      let webInjection = '';
      if (config.useWebSearch) {
        // Tìm kiếm linh hoạt: Dùng topicPrompt, nhưng nếu có entry rồi thì lấy entry mới nhất ghép vào để tìm cái mới
        const searchQuery = seen.length > 0 
          ? `${config.topicPrompt} ${seen[seen.length - 1].comment}`
          : config.topicPrompt;
        ctx.log(`🌐 [Batch ${i}] Đang cào dữ liệu web cho: "${searchQuery}"...`);
        const searchResults = await cascadeSearch(searchQuery, ctx.profile.webSearchProxyUrl);
        if (searchResults.length > 0) {
          webInjection = searchResults.map(r => `Nguồn: ${r.source}\nNội dung: ${r.content}`).join('\n\n');
        } else {
          ctx.log(`⚠️ [Batch ${i}] Không tìm thấy thêm dữ liệu trên Web.`);
        }
      }

      const userMessage = buildBatchUserMessage(config, ctx.card, seen, ragCtx.injectionText, coherenceCtx, webInjection, countThisBatch, i, totalBatches);
      const schemaAddon = config.schemaContext
        ? '\n\n--- SCHEMA-AWARE MODE ---\nCard này có hệ biến MVU-ZOD. Khi viết content, hãy THAM CHIẾU đến các biến liên quan (nếu phù hợp ngữ cảnh entry). Ví dụ: mô tả NPC thì đề cập ảnh hưởng đến biến quan hệ, mô tả vật phẩm thì đề cập biến inventory. KHÔNG viết code EJS trong content.'
        : '';
      const messages: ChatMessage[] = [
        { role: 'system', content: BATCH_SYSTEM_PROMPT + (config.autoConfig ? AUTO_CONFIG_ADDON : '\n\nCHỈ trả về MỘT MẢNG JSON hợp lệ:\n[{"comment":"...","keys":["..."],"content":"..."},...  ]') + schemaAddon + getProfileExtractionContext(profile) },
        { role: 'user', content: userMessage },
      ];

      return { batchIndex: i, countThisBatch, messages };
    }))).filter((t): t is NonNullable<typeof t> => t !== null);

    if (tasks.length === 0) break;

    // Execute all tasks in this round
    const results = await Promise.all(tasks.map(async (task) => {
      let result: AIGeneratedEntry[] | null = null;
      for (let attempt = 0; attempt <= config.maxRetriesPerBatch; attempt++) {
        if (ctx.stopped) return { batchIndex: task.batchIndex, entries: null };
        try {
          ctx.log(`📡 Batch ${task.batchIndex}/${totalBatches} — gọi AI${attempt > 0 ? ` (thử lại ${attempt})` : ''}...`);
          const raw = await callAI({ profile, params: ctx.generationParams, messages: task.messages });
          result = tryExtractJsonArray(raw.text);
          if (result) break;
          ctx.log(`⚠️ Batch ${task.batchIndex} — AI trả về không phải JSON array, thử lại...`);
        } catch (err) {
          ctx.log(`⚠️ Batch ${task.batchIndex} — lỗi: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      return { batchIndex: task.batchIndex, entries: result };
    }));

    // Process results sequentially (for dedup ordering safety)
    for (const { batchIndex, entries: result } of results) {
      if (ctx.stopped) break;

      if (!result) {
        ctx.log(`❌ Batch ${batchIndex} thất bại sau ${config.maxRetriesPerBatch + 1} lần thử.`);
        consecutiveErrors++;
        if (consecutiveErrors >= config.maxConsecutiveErrors) {
          ctx.log(`🛑 Dừng: ${config.maxConsecutiveErrors} lỗi liên tiếp.`);
          ctx.onProgress({ batch: totalBatches, totalBatches, created, total: config.totalEntries, status: 'error' });
          return;
        }
        continue;
      }
      consecutiveErrors = 0;

      let batchCreated = 0;
      for (const ai of result) {
        // 3-layer duplicate check
        const dupCheck = isDuplicateEntry(ai, ctx.card.data.character_book?.entries ?? [], ragIndex);
        if (dupCheck.isDuplicate) {
          ctx.log(`⏭️ Bỏ qua "${ai.comment}" — trùng với "${dupCheck.conflictWith}" (${dupCheck.reason})`);
          continue;
        }

        // Enhanced anti-summarization check
        const sumCheck = checkAntiSummarization(ai.content);
        if (sumCheck.isSummarized) {
          ctx.log(`⚠️ "${ai.comment}" có dấu hiệu tóm tắt (score: ${sumCheck.score.toFixed(2)}): ${sumCheck.warnings.join('; ')}`);
        }

        // Calculate insertion order
        const insertionOrder = config.insertionOrderMode === 'increment'
          ? config.insertionOrderStart + created
          : config.insertionOrderStart;

        const id = nextEntryId(ctx.card.data.character_book?.entries ?? []);
        const entry = materializeEntry(
          { ...ai, insertion_order: insertionOrder },
          {
            category: config.category,
            cardType: config.cardType,
            defaultPosition: config.defaultPosition,
            defaultDepth: config.defaultDepth,
            defaultRole: config.defaultRole,
            insertionOrderStart: insertionOrder,
          },
          id,
        );

        ctx.appendEntry(entry);
        ctx.card.data.character_book!.entries.push(entry);
        seen.push({ comment: entry.comment, keys: entry.keys });
        created++;
        batchCreated++;
        entriesSinceLastRebuild++;
        ctx.log(`✅ Batch ${batchIndex} · "${entry.comment}" (${entry.keys.join(', ')})`);
      }

      // Batch rebuild RAG index every 10 entries (spec optimization)
      if (entriesSinceLastRebuild >= 10) {
        ragIndex.indexWithSource(ctx.card.data.character_book?.entries ?? []);
        entriesSinceLastRebuild = 0;
        ctx.log(`🔄 RAG index rebuilt (${ragIndex.size} entries)`);
      }

      ctx.onProgress({ batch: batchIndex, totalBatches, created, total: config.totalEntries, status: 'running' });
      ctx.log(`📊 Batch ${batchIndex} hoàn thành: +${batchCreated} entries (tổng: ${created}/${config.totalEntries})`);
    }

    if (consecutiveErrors >= config.maxConsecutiveErrors) break;
  }

  ctx.onProgress({ batch: totalBatches, totalBatches, created, total: config.totalEntries, status: ctx.stopped ? 'stopped' : 'done' });
  ctx.log(`\n🏁 Hoàn thành: ${created}/${config.totalEntries} entries đã tạo.`);
}
