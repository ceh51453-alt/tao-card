/**
 * src/lib/ai/wikiScraper.ts — Wiki/Fandom scraping pipeline
 * Spec Phần 7.5, 7G: Fetch wiki content via CORS proxy, extract lorebook entries
 * Upgraded: Batch processing, RAG dedup, anti-summarization, autoConfig, pause/resume
 */

import type { CharacterCardV3, LorebookEntry, ChatMessage, ProxyProfile, GenerationParams } from '../../types';
import { callAI } from './client';
import { materializeEntry, nextEntryId } from '../converters/cardDefaults';
import { tryExtractJsonArray, AUTO_CONFIG_ADDON } from './batchGenerator';
import { TFIDFIndex } from '../rag/tfidfIndexer';
import { buildRAGContext } from '../rag/ragContextBuilder';
import { isDuplicateEntry } from './deduplicator';
import { checkAntiSummarization } from '../completionVerifier/antiSummarization';
import { cascadeSearch } from './webScraper';
import { getProfileExtractionContext } from './worldbuildingDefaults';
import type { EntryCategory, CardType } from '../worldbook/worldbookConfig';

// ═══════════════════════════════════════════════════════════════════════════
// WIKI FETCHER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Attempt to fetch wiki page content. Tries multiple approaches:
 * 1. Fandom REST API (if Fandom URL)
 * 2. MediaWiki API (generic wikis)
 * 3. CORS proxy fallback
 */
export async function fetchWikiContent(url: string): Promise<{ title: string; content: string; source: string }> {
  const parsed = new URL(url);

  // Fandom API
  if (parsed.hostname.includes('fandom.com')) {
    const wikiName = parsed.hostname.split('.')[0];
    const pageName = decodeURIComponent(parsed.pathname.split('/wiki/')[1] || '');
    if (pageName) {
      try {
        const apiUrl = `https://${wikiName}.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName)}&prop=wikitext&format=json&origin=*`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const json = await res.json();
          const wikitext = json.parse?.wikitext?.['*'] ?? '';
          if (wikitext) {
            return { title: json.parse?.title ?? pageName, content: cleanWikitext(wikitext), source: 'Fandom API' };
          }
        }
      } catch { /* fallback */ }
    }
  }

  // MediaWiki API (generic)
  try {
    const apiBase = `${parsed.origin}/api.php`;
    const pageName = decodeURIComponent(parsed.pathname.split('/wiki/')[1] || parsed.pathname.split('/').pop() || '');
    const apiUrl = `${apiBase}?action=parse&page=${encodeURIComponent(pageName)}&prop=wikitext&format=json&origin=*`;
    const res = await fetch(apiUrl);
    if (res.ok) {
      const json = await res.json();
      const wikitext = json.parse?.wikitext?.['*'] ?? '';
      if (wikitext) {
        return { title: json.parse?.title ?? pageName, content: cleanWikitext(wikitext), source: 'MediaWiki API' };
      }
    }
  } catch { /* fallback */ }

  // CORS proxy fallback — fetch raw HTML
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const html = await res.text();
      const content = extractTextFromHtml(html);
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      return { title: titleMatch?.[1]?.replace(/ - .+$/, '') ?? 'Wiki Page', content, source: 'CORS Proxy' };
    }
  } catch { /* give up */ }

  throw new Error(`Không thể tải nội dung từ: ${url}`);
}

function cleanWikitext(text: string): string {
  return text
    .replace(/\{\{[^}]*\}\}/g, '')       // Remove templates
    .replace(/\[\[File:[^\]]*\]\]/gi, '') // Remove file links
    .replace(/\[\[Category:[^\]]*\]\]/gi, '') // Remove categories
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2') // [[link|text]] → text
    .replace(/\[\[([^\]]*)\]\]/g, '$1')   // [[link]] → link
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '') // Remove references
    .replace(/<[^>]+>/g, '')               // Remove HTML tags
    .replace(/'{2,}/g, '')                 // Remove bold/italic markup
    .replace(/={2,}(.*?)={2,}/g, '\n## $1\n') // Headers
    .replace(/\n{3,}/g, '\n\n')            // Clean whitespace
    .trim();
}

function extractTextFromHtml(html: string): string {
  // Remove script, style, nav, header, footer
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');
  // Extract text from content area
  const contentMatch = clean.match(/<div[^>]*(?:class|id)="[^"]*(?:content|article|mw-parser-output)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch) clean = contentMatch[1];
  // Strip remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return clean;
}

// ═══════════════════════════════════════════════════════════════════════════
// FANDOM PRIORITY SEARCH (Spec 7G)
// ═══════════════════════════════════════════════════════════════════════════

/** Tag → Fandom wiki slug mapping */
const FANDOM_TAG_MAP: Record<string, string> = {
  genshin: 'genshin-impact', 'honkai star rail': 'honkai-star-rail',
  'honkai impact': 'honkai-impact-3', 'blue archive': 'blue-archive',
  azurlane: 'azur-lane', arknights: 'arknights', naruto: 'naruto',
  'one piece': 'onepiece', 'attack on titan': 'attackontitan',
  're:zero': 'rezero', overlord: 'overlordmaruyama',
  'kimetsu no yaiba': 'kimetsu-no-yaiba', 'my hero academia': 'bokunoheroacademia',
  'sword art online': 'swordartonline', 'demon slayer': 'kimetsu-no-yaiba',
  'jujutsu kaisen': 'jujutsu-kaisen', 'dragon ball': 'dragonball',
  pokemon: 'pokemon', 'fate': 'typemoon', 'elden ring': 'eldenring',
  'dark souls': 'darksouls', skyrim: 'elderscrolls', witcher: 'witcher',
  'league of legends': 'leagueoflegends', dota: 'dota2',
};

export interface FandomSearchItem {
  priority: number;
  label: string;
  url: string;
}

/**
 * Build a priority queue of wiki sources to try for a given subject.
 * Priority 1: Tag-matched Fandom wikis
 * Priority 2: Card name slug → Fandom
 * Priority 3: Wikia (legacy Fandom)
 * Priority 4: Wikipedia
 */
export function buildFandomSearchQueue(
  subject: string,
  card: CharacterCardV3,
  customMappings?: Record<string, string>,
): FandomSearchItem[] {
  const queue: FandomSearchItem[] = [];
  const tags = card.data.tags ?? [];
  const cardName = card.data.name;

  // Merge custom mappings
  const tagMap = { ...FANDOM_TAG_MAP, ...customMappings };

  // Priority 1: Tags map → Fandom slug
  for (const tag of tags) {
    const tagLower = tag.toLowerCase();
    for (const [keyword, wikiSlug] of Object.entries(tagMap)) {
      if (tagLower.includes(keyword)) {
        queue.push({
          priority: 1,
          label: `Fandom (${wikiSlug})`,
          url: `https://${wikiSlug}.fandom.com/wiki/${encodeURIComponent(subject)}`,
        });
        break;
      }
    }
  }

  // Priority 2: Card name slug → Fandom
  const slug = cardName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (slug) {
    queue.push({
      priority: 2,
      label: 'Fandom (card name)',
      url: `https://${slug}.fandom.com/wiki/${encodeURIComponent(subject)}`,
    });
  }

  // Priority 3: Wikia (legacy Fandom)
  if (slug) {
    queue.push({
      priority: 3,
      label: 'Wikia',
      url: `https://${slug}.wikia.com/wiki/${encodeURIComponent(subject)}`,
    });
  }

  // Priority 4: Wikipedia
  queue.push({
    priority: 4,
    label: 'Wikipedia',
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(subject)}`,
  });

  // Dedup + sort by priority
  const seen = new Set<string>();
  return queue.filter(i => {
    const dup = seen.has(i.url);
    seen.add(i.url);
    return !dup;
  }).sort((a, b) => a.priority - b.priority);
}

/**
 * Fetch wiki page with priority-based fallback.
 * Tries each source in priority order until one returns sufficient content.
 */
export async function fetchWikiPageWithFallback(
  subject: string,
  card: CharacterCardV3,
  log: (msg: string) => void,
  customMappings?: Record<string, string>,
): Promise<{ title: string; content: string; source: string }> {
  const queue = buildFandomSearchQueue(subject, card, customMappings);

  for (const item of queue) {
    log(`🔍 Thử [${item.label}]: ${item.url}`);
    try {
      const result = await fetchWikiContent(item.url);
      if (result.content.length > 500) {
        log(`✅ Thành công từ [${item.label}] (${result.content.length} chars)`);
        return { ...result, source: item.label };
      }
      log(`⚠️ [${item.label}] ít nội dung (${result.content.length} chars), thử tiếp...`);
    } catch (e) {
      log(`❌ [${item.label}] lỗi: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`Không lấy được dữ liệu về "${subject}" từ bất kỳ nguồn nào`);
}

// ═══════════════════════════════════════════════════════════════════════════
// WIKI EXTRACTION SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

const WIKI_SYSTEM_PROMPT = `Bạn là trợ lý tổng hợp dữ liệu từ Wiki/Fandom thành Lorebook SillyTavern.

PHƯƠNG PHÁP STYLE MIMICRY: Phân tích phong cách viết của entries hiện tại
(độ dài, cấu trúc, văn phong) và bắt chước để entries mới nhất quán.

QUY TẮC ANTI-DATA-LOSS:
• KHÔNG bỏ sót thông tin quan trọng — thà tạo nhiều entry nhỏ hơn ít entry lớn
• KHÔNG tóm tắt làm mất chi tiết
• KHÔNG bịa thông tin không có trong nguồn wiki
• KHÔNG dùng "..." hoặc "[rút gọn]"

--- QUY TẮC VIẾT CONTENT ---
1. VIẾT ĐẦY ĐỦ: Mỗi entry phải chứa thông tin hoàn chỉnh, không viết tắt.
2. CÁCH LY GIỌNG ĐIỆU: Trường "content" viết ở ngôi thứ ba, khách quan, trung lập.
   Viết theo định dạng database (YAML/danh sách), KHÔNG viết như tiểu thuyết.
3. KHÔNG TRÙNG LẶP: Không tạo lại các chủ đề đã có trong danh sách "Entries đã có".
4. KHÔNG TÓM TẮT: Không dùng "...", "[rút gọn]", "v.v.", "tương tự entry X".
5. NÉN KHÔNG PHẢI XÓA: Dùng ít chữ nhất để nói rõ mọi thiết lập.

--- HƯỚNG DẪN KỸ THUẬT SILLYTAVERN ---
• keys: Bao phủ TẤT CẢ cách xưng hô có thể
• Ngăn cách bằng dấu phẩy tiếng Anh (,), KHÔNG có khoảng trắng sau phẩy

CHỈ trả về MỘT MẢNG JSON hợp lệ:
[{"comment":"...","keys":["..."],"content":"..."},...  ]
KHÔNG thêm giải thích, KHÔNG markdown, KHÔNG code block.`;

// ═══════════════════════════════════════════════════════════════════════════
// WIKI SCRAPE PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

export interface WikiScrapeConfig {
  url: string;
  additionalInstructions: string;
  maxEntries: number;
  defaultPosition: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  defaultDepth?: number;
  defaultRole?: 0 | 1 | 2;
  insertionOrderStart: number;
  insertionOrderMode: 'same' | 'increment';
  category?: EntryCategory;
  cardType?: CardType;
  // Batch fields (parity with BatchGenConfig)
  useCardContext: boolean;
  useWebSearch: boolean;
  entriesPerBatch: number;
  concurrentBatches: number;
  maxRetriesPerBatch: number;
  maxConsecutiveErrors: number;
  modelOverride?: string;
  autoConfig: boolean;
  topicPrompt: string;  // per-tab prompt
}

export interface WikiScrapeProgress {
  batch: number;
  totalBatches: number;
  created: number;
  total: number;
  status: 'fetching' | 'extracting' | 'running' | 'paused' | 'done' | 'error' | 'stopped';
}

export interface WikiScrapeContext {
  card: CharacterCardV3;
  profile: ProxyProfile;
  generationParams: GenerationParams;
  paused: boolean;
  stopped: boolean;
  log: (msg: string) => void;
  onProgress: (progress: WikiScrapeProgress) => void;
  appendEntry: (entry: LorebookEntry) => void;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Upgraded wiki scrape pipeline with batch processing, RAG dedup,
 * anti-summarization, autoConfig, card context, web search,
 * pause/resume, retry logic, and concurrent batches.
 */
export async function runWikiScrape(config: WikiScrapeConfig, ctx: WikiScrapeContext) {
  if (!ctx.card.data.character_book) {
    ctx.card.data.character_book = { name: ctx.card.data.name, entries: [] };
  }
  if (!ctx.card.data.character_book.entries) {
    ctx.card.data.character_book.entries = [];
  }
  
  let created = 0;
  let consecutiveErrors = 0;
  const seen: Array<{ comment: string; keys: string[] }> = (
    ctx.card.data.character_book?.entries ?? []
  ).map(e => ({ comment: e.comment, keys: e.keys }));

  const profile = config.modelOverride
    ? { ...ctx.profile, selectedModel: config.modelOverride }
    : ctx.profile;

  // Step 1: Fetch wiki content
  ctx.log(`🕸️ Đang tải: ${config.url}`);
  ctx.onProgress({ batch: 0, totalBatches: 0, created: 0, total: config.maxEntries, status: 'fetching' });

  let wikiData: { title: string; content: string; source: string };
  try {
    wikiData = await fetchWikiContent(config.url);
    ctx.log(`✅ Đã tải "${wikiData.title}" (${wikiData.content.length} chars) — nguồn: ${wikiData.source}`);
  } catch (err) {
    ctx.log(`❌ Lỗi tải: ${err instanceof Error ? err.message : String(err)}`);
    ctx.onProgress({ batch: 0, totalBatches: 0, created: 0, total: config.maxEntries, status: 'error' });
    return;
  }

  if (ctx.stopped) {
    ctx.log('⏹ Đã dừng.');
    ctx.onProgress({ batch: 0, totalBatches: 0, created: 0, total: config.maxEntries, status: 'stopped' });
    return;
  }

  // Step 2: Split content into chunks
  const CHUNK_SIZE = 12000;
  const chunks: string[] = [];
  let pos = 0;
  while (pos < wikiData.content.length) {
    let end = Math.min(pos + CHUNK_SIZE, wikiData.content.length);
    if (end < wikiData.content.length) {
      const boundary = wikiData.content.lastIndexOf('\n\n', end);
      if (boundary > pos + CHUNK_SIZE * 0.7) end = boundary + 2;
    }
    chunks.push(wikiData.content.slice(pos, end));
    pos = end;
  }

  ctx.log(`📄 Chia thành ${chunks.length} chunk(s) để AI xử lý`);

  // Step 3: Calculate batches — each chunk is a "batch"
  const totalBatches = Math.min(chunks.length, Math.ceil(config.maxEntries / config.entriesPerBatch));
  const concurrency = Math.max(1, Math.min(config.concurrentBatches, 10));

  ctx.log(`🚀 Bắt đầu trích xuất ${config.maxEntries} entries trong ${totalBatches} batches` +
    (concurrency > 1 ? ` (${concurrency} song song)` : ''));

  // Initialize RAG index
  const ragIndex = new TFIDFIndex();
  ragIndex.indexWithSource(ctx.card.data.character_book?.entries ?? []);
  ctx.log(`📊 RAG index: ${ragIndex.size} entries đã index`);
  let entriesSinceLastRebuild = 0;

  // Step 4: Process chunks in rounds of concurrency
  for (let roundStart = 0; roundStart < totalBatches; roundStart += concurrency) {
    if (ctx.stopped || created >= config.maxEntries) break;
    while (ctx.paused) {
      ctx.onProgress({ batch: roundStart, totalBatches, created, total: config.maxEntries, status: 'paused' });
      await sleep(300);
    }

    const roundEnd = Math.min(roundStart + concurrency, totalBatches);
    const batchIndices: number[] = [];
    for (let i = roundStart; i < roundEnd; i++) batchIndices.push(i);

    // Build tasks
    const tasks = (await Promise.all(batchIndices.map(async (chunkIdx) => {
      const countThisBatch = Math.min(config.entriesPerBatch, config.maxEntries - created - (chunkIdx - roundStart) * config.entriesPerBatch);
      if (countThisBatch <= 0 || chunkIdx >= chunks.length) return null;

      // Build user message
      const parts: string[] = [];

      // Card context
      if (config.useCardContext) {
        parts.push(`### Ngữ cảnh nhân vật\nTên: ${ctx.card.data.name}\nDescription: ${ctx.card.data.description.slice(0, 1000)}\nPersonality: ${ctx.card.data.personality.slice(0, 500)}\nScenario: ${ctx.card.data.scenario.slice(0, 500)}`);
      }

      // Wiki content
      parts.push(`### Trang Wiki: ${wikiData.title}`);
      parts.push(`### Nội dung — Chunk ${chunkIdx + 1}/${chunks.length}\n${chunks[chunkIdx]}`);

      // Topic prompt
      if (config.topicPrompt.trim()) {
        parts.push(`### Yêu cầu nội dung\n${config.topicPrompt}`);
      }

      // Additional instructions
      if (config.additionalInstructions.trim()) {
        parts.push(`### Hướng dẫn thêm\n${config.additionalInstructions}`);
      }

      // Existing entries (dedup)
      if (seen.length > 0) {
        const existingList = seen.slice(-30).map(e => `- "${e.comment}" — keys: [${e.keys.join(', ')}]`).join('\n');
        parts.push(`### Entries đã có (KHÔNG tạo lại)\n${existingList}`);
      }

      // RAG context
      const ragCtx = buildRAGContext(config.topicPrompt || wikiData.title, ragIndex, { topK: 8, includeNegatives: true });
      if (ragCtx.injectionText) {
        parts.push(`### RAG Context\n${ragCtx.injectionText}`);
      }

      // Web search
      if (config.useWebSearch) {
        const searchQuery = seen.length > 0
          ? `${wikiData.title} ${seen[seen.length - 1].comment}`
          : wikiData.title;
        ctx.log(`🌐 [Chunk ${chunkIdx + 1}] Đang cào dữ liệu web cho: "${searchQuery}"...`);
        const searchResults = await cascadeSearch(searchQuery, profile.webSearchProxyUrl);
        if (searchResults.length > 0) {
          const webInjectionText = searchResults.map(r => `Nguồn: ${r.source}\nNội dung: ${r.content}`).join('\n\n');
          parts.push(`### Kiến thức từ Web\n${webInjectionText}`);
        } else {
          ctx.log(`⚠️ [Chunk ${chunkIdx + 1}] Không tìm thấy thêm dữ liệu trên Web.`);
        }
      }

      parts.push(`[SỐ LƯỢNG YÊU CẦU LẦN NÀY]: Hãy sinh ra đúng ${countThisBatch} entries hợp lệ (batch ${chunkIdx + 1}/${totalBatches}).`);

      // System prompt: base + autoConfig addon
      const systemPrompt = WIKI_SYSTEM_PROMPT
        + (config.autoConfig ? AUTO_CONFIG_ADDON : '\n\nCHỈ trả về MỘT MẢNG JSON hợp lệ:\n[{"comment":"...","keys":["..."],"content":"..."},...  ]')
        + getProfileExtractionContext(profile);

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: parts.join('\n\n') },
      ];

      return { chunkIdx, countThisBatch, messages };
    }))).filter((t): t is NonNullable<typeof t> => t !== null);

    if (tasks.length === 0) break;

    // Execute all tasks in this round
    const results = await Promise.all(tasks.map(async (task) => {
      let result: ReturnType<typeof tryExtractJsonArray> = null;
      for (let attempt = 0; attempt <= config.maxRetriesPerBatch; attempt++) {
        if (ctx.stopped) return { chunkIdx: task.chunkIdx, entries: null };
        try {
          ctx.log(`📡 Chunk ${task.chunkIdx + 1}/${totalBatches} — gọi AI${attempt > 0 ? ` (thử lại ${attempt})` : ''}...`);
          const raw = await callAI({ profile, params: ctx.generationParams, messages: task.messages });
          result = tryExtractJsonArray(raw.text);
          if (result) break;
          ctx.log(`⚠️ Chunk ${task.chunkIdx + 1} — AI trả về không phải JSON array, thử lại...`);
        } catch (err) {
          ctx.log(`⚠️ Chunk ${task.chunkIdx + 1} — lỗi: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      return { chunkIdx: task.chunkIdx, entries: result };
    }));

    // Process results sequentially (for dedup ordering safety)
    for (const { chunkIdx, entries: result } of results) {
      if (ctx.stopped) break;

      if (!result) {
        ctx.log(`❌ Chunk ${chunkIdx + 1} thất bại sau ${config.maxRetriesPerBatch + 1} lần thử.`);
        consecutiveErrors++;
        if (consecutiveErrors >= config.maxConsecutiveErrors) {
          ctx.log(`🛑 Dừng: ${config.maxConsecutiveErrors} lỗi liên tiếp.`);
          ctx.onProgress({ batch: totalBatches, totalBatches, created, total: config.maxEntries, status: 'error' });
          return;
        }
        continue;
      }
      consecutiveErrors = 0;

      let batchCreated = 0;
      for (const ai of result) {
        if (created >= config.maxEntries) break;

        // 3-layer duplicate check
        const dupCheck = isDuplicateEntry(ai, ctx.card.data.character_book?.entries ?? [], ragIndex);
        if (dupCheck.isDuplicate) {
          ctx.log(`⏭️ Bỏ qua "${ai.comment}" — trùng với "${dupCheck.conflictWith}" (${dupCheck.reason})`);
          continue;
        }

        // Anti-summarization check
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
        ctx.log(`✅ Chunk ${chunkIdx + 1} · "${entry.comment}" (${entry.keys.join(', ')})`);
      }

      // Batch rebuild RAG index every 10 entries
      if (entriesSinceLastRebuild >= 10) {
        ragIndex.indexWithSource(ctx.card.data.character_book?.entries ?? []);
        entriesSinceLastRebuild = 0;
        ctx.log(`🔄 RAG index rebuilt (${ragIndex.size} entries)`);
      }

      ctx.onProgress({ batch: chunkIdx + 1, totalBatches, created, total: config.maxEntries, status: 'running' });
      ctx.log(`📊 Chunk ${chunkIdx + 1} hoàn thành: +${batchCreated} entries (tổng: ${created}/${config.maxEntries})`);
    }

    if (consecutiveErrors >= config.maxConsecutiveErrors) break;
  }

  ctx.onProgress({ batch: totalBatches, totalBatches, created, total: config.maxEntries, status: ctx.stopped ? 'stopped' : 'done' });
  ctx.log(`\n🏁 Hoàn thành: ${created}/${config.maxEntries} entries từ "${wikiData.title}".`);
}
