/**
 * src/lib/ai/wikiScraper.ts — Wiki/Fandom scraping pipeline
 * Spec Phần 7.5, 7G: Fetch wiki content via CORS proxy, extract lorebook entries
 */

import type { CharacterCardV3, LorebookEntry, ChatMessage, ProxyProfile, GenerationParams } from '../../types';
import { callAI } from './client';
import { materializeEntry, nextEntryId } from '../converters/cardDefaults';
import { tryExtractJsonArray } from './batchGenerator';
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
  insertionOrderStart: number;
  category?: EntryCategory;
  cardType?: CardType;
}

export interface WikiScrapeContext {
  card: CharacterCardV3;
  profile: ProxyProfile;
  generationParams: GenerationParams;
  stopped: boolean;
  log: (msg: string) => void;
  onProgress: (entriesCreated: number, status: 'fetching' | 'extracting' | 'done' | 'error' | 'stopped') => void;
  appendEntry: (entry: LorebookEntry) => void;
}

export async function runWikiScrape(config: WikiScrapeConfig, ctx: WikiScrapeContext) {
  let entriesCreated = 0;

  // Step 1: Fetch wiki content
  ctx.log(`🕸️ Đang tải: ${config.url}`);
  ctx.onProgress(0, 'fetching');

  let wikiData: { title: string; content: string; source: string };
  try {
    wikiData = await fetchWikiContent(config.url);
    ctx.log(`✅ Đã tải "${wikiData.title}" (${wikiData.content.length} chars) — nguồn: ${wikiData.source}`);
  } catch (err) {
    ctx.log(`❌ Lỗi tải: ${err instanceof Error ? err.message : String(err)}`);
    ctx.onProgress(0, 'error');
    return;
  }

  if (ctx.stopped) { ctx.log('⏹ Đã dừng.'); ctx.onProgress(0, 'stopped'); return; }

  // Step 2: Split content if too long, send to AI
  ctx.onProgress(0, 'extracting');
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

  for (let i = 0; i < chunks.length; i++) {
    if (ctx.stopped || entriesCreated >= config.maxEntries) break;

    const remaining = config.maxEntries - entriesCreated;
    const userParts = [
      `### Trang Wiki: ${wikiData.title}`,
      `### Nội dung — Chunk ${i + 1}/${chunks.length}\n${chunks[i]}`,
      config.additionalInstructions ? `### Hướng dẫn thêm\n${config.additionalInstructions}` : '',
      `Tạo tối đa ${Math.min(remaining, 10)} Lorebook entries từ nội dung trên.`,
    ].filter(Boolean);

    const messages: ChatMessage[] = [
      { role: 'system', content: WIKI_SYSTEM_PROMPT },
      { role: 'user', content: userParts.join('\n\n') },
    ];

    try {
      ctx.log(`📡 Chunk ${i + 1}/${chunks.length} — gọi AI...`);
      const raw = await callAI({ profile: ctx.profile, params: ctx.generationParams, messages });
      const entries = tryExtractJsonArray(raw.text);
      if (entries) {
        for (const ai of entries) {
          if (entriesCreated >= config.maxEntries) break;
          const id = nextEntryId(ctx.card.data.character_book?.entries ?? []);
          const entry = materializeEntry(ai, {
            category: config.category,
            cardType: config.cardType,
            defaultPosition: config.defaultPosition,
            insertionOrderStart: config.insertionOrderStart + entriesCreated,
          }, id);
          ctx.appendEntry(entry);
          entriesCreated++;
          ctx.log(`✅ "${entry.comment}"`);
        }
      } else {
        ctx.log(`⚠️ Chunk ${i + 1} — không parse được JSON từ AI.`);
      }
    } catch (err) {
      ctx.log(`⚠️ Chunk ${i + 1} — lỗi: ${err instanceof Error ? err.message : String(err)}`);
    }

    ctx.onProgress(entriesCreated, 'extracting');
  }

  ctx.onProgress(entriesCreated, ctx.stopped ? 'stopped' : 'done');
  ctx.log(`\n🏁 Hoàn thành: ${entriesCreated} entries từ "${wikiData.title}".`);
}
