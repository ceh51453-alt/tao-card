/**
 * tagManager.ts — Quản lý hệ thống tag <tên_idN> cho Worldbook
 * 
 * Theo quy chuẩn Minh Nguyệt Thu Thanh:
 * - ID tăng dần: thế giới quan → xem lướt NV → nhân vật chính → NPC
 * - Cùng nhân vật dùng CHUNG ID
 * - Tag bọc nội dung entry: <tên_idN>...</tên_idN>
 */

import type { LorebookEntry } from '../../types';
import { categorizeEntry, type AutoCategory } from './lorebookCategorizer';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TagAllocation {
  entryId: number;
  tagId: number;
  tagName: string;         // e.g. "秋明月" or "thế_giới_quan"
  fullTag: string;          // e.g. "秋明月_id5"
  category: AutoCategory;
}

export interface TagSummary {
  totalTags: number;
  allocations: TagAllocation[];
  byCharacter: Record<string, number>;    // charName → tagId
  worldviewIds: number[];
  characterIds: number[];
  npcIds: number[];
  overviewId: number;       // Cố định = 0
}

// ═══════════════════════════════════════════════════════════════════════════
// TAG EXTRACTION — Phát hiện tag đã có trong content
// ═══════════════════════════════════════════════════════════════════════════

const TAG_REGEX = /^<([^>]+_id(\d+))>([\s\S]*)<\/\1>$/s;
const TAG_OPEN_REGEX = /<([^>]+_id(\d+))>/;

export interface ParsedTag {
  fullTag: string;          // e.g. "秋明月_id5"
  tagName: string;          // e.g. "秋明月"
  tagId: number;            // e.g. 5
  innerContent: string;
}

/** Phân tích tag từ nội dung entry */
export function parseEntryTag(content: string): ParsedTag | null {
  const trimmed = content.trim();
  const match = trimmed.match(TAG_REGEX);
  if (!match) return null;
  
  const fullTag = match[1];
  const tagId = parseInt(match[2], 10);
  const innerContent = match[3].trim();
  const tagName = fullTag.replace(/_id\d+$/, '');
  
  return { fullTag, tagName, tagId, innerContent };
}

/** Kiểm tra xem entry đã có tag chưa */
export function hasTag(content: string): boolean {
  return TAG_OPEN_REGEX.test(content.trim());
}

// ═══════════════════════════════════════════════════════════════════════════
// TAG ALLOCATION — Phân bổ ID theo quy tắc phân cấp
// ═══════════════════════════════════════════════════════════════════════════

interface EntryInfo {
  entry: LorebookEntry;
  category: AutoCategory;
  characterName?: string;   // Tên nhân vật (nếu là character/npc entry)
}

/** Trích xuất tên nhân vật từ entry (comment hoặc keys) */
function extractCharacterName(entry: LorebookEntry): string | undefined {
  // Ưu tiên comment vì thường chứa tên rõ ràng
  const comment = entry.comment.trim();
  
  // Pattern: [NPC] Tên, [Character] Tên, hoặc tên thuần túy
  const bracketMatch = comment.match(/^\[(?:npc|character|char|nhân vật)\]\s*(.+)/i);
  if (bracketMatch) return bracketMatch[1].trim();
  
  // Nếu comment không rỗng và ngắn, có thể là tên
  if (comment && comment.length < 50 && !comment.includes('\n')) {
    return comment;
  }
  
  // Fallback: key đầu tiên nếu có
  if (entry.keys.length > 0 && entry.keys[0].length < 30) {
    return entry.keys[0];
  }
  
  return undefined;
}

/** Phân bổ tag ID cho tất cả entries */
export function allocateTags(entries: LorebookEntry[]): TagSummary {
  const entryInfos: EntryInfo[] = entries.map(entry => {
    const result = categorizeEntry(entry);
    const characterName = ['character', 'npc'].includes(result.category)
      ? extractCharacterName(entry)
      : undefined;
    return { entry, category: result.category, characterName };
  });

  let nextId = 1;
  const charIdMap: Record<string, number> = {};
  const allocations: TagAllocation[] = [];
  const worldviewIds: number[] = [];
  const characterIds: number[] = [];
  const npcIds: number[] = [];

  // ─── Bước 1: Thế giới quan ───
  const worldviewEntries = entryInfos.filter(e => 
    e.category === 'lore' || e.category === 'system'
  );
  for (const info of worldviewEntries) {
    const tagId = nextId++;
    worldviewIds.push(tagId);
    allocations.push({
      entryId: info.entry.id,
      tagId,
      tagName: 'thế_giới_quan',
      fullTag: `thế_giới_quan_id${tagId}`,
      category: info.category,
    });
  }

  // ─── Bước 2: Nhân vật chính ───
  const charEntries = entryInfos.filter(e => e.category === 'character');
  for (const info of charEntries) {
    const name = info.characterName ?? `char_${info.entry.id}`;
    if (!charIdMap[name]) {
      charIdMap[name] = nextId++;
      characterIds.push(charIdMap[name]);
    }
    const tagId = charIdMap[name];
    allocations.push({
      entryId: info.entry.id,
      tagId,
      tagName: name,
      fullTag: `${name}_id${tagId}`,
      category: info.category,
    });
  }

  // ─── Bước 3: NPC ───
  const npcEntries = entryInfos.filter(e => e.category === 'npc');
  for (const info of npcEntries) {
    const name = info.characterName ?? `npc_${info.entry.id}`;
    if (!charIdMap[name]) {
      charIdMap[name] = nextId++;
      npcIds.push(charIdMap[name]);
    }
    const tagId = charIdMap[name];
    allocations.push({
      entryId: info.entry.id,
      tagId,
      tagName: name,
      fullTag: `${name}_id${tagId}`,
      category: info.category,
    });
  }

  // ─── Bước 4: Entries khác (item, quest, rule, ejs, mvu...) ───
  const otherEntries = entryInfos.filter(e =>
    !['lore', 'system', 'character', 'npc'].includes(e.category)
  );
  for (const info of otherEntries) {
    const tagId = nextId++;
    const tagName = info.entry.comment.trim().replace(/\s+/g, '_').toLowerCase() || `entry_${info.entry.id}`;
    allocations.push({
      entryId: info.entry.id,
      tagId,
      tagName,
      fullTag: `${tagName}_id${tagId}`,
      category: info.category,
    });
  }

  return {
    totalTags: allocations.length,
    allocations,
    byCharacter: charIdMap,
    worldviewIds,
    characterIds,
    npcIds,
    overviewId: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TAG APPLICATION — Bọc content với tag
// ═══════════════════════════════════════════════════════════════════════════

/** Bọc nội dung entry với tag, bảo toàn tag cũ nếu có */
export function wrapWithTag(content: string, fullTag: string): string {
  const trimmed = content.trim();
  
  // Nếu đã có tag rồi, strip tag cũ trước
  const existing = parseEntryTag(trimmed);
  const innerContent = existing ? existing.innerContent : trimmed;
  
  return `<${fullTag}>\n${innerContent}\n</${fullTag}>`;
}

/** Strip tag khỏi content, trả về nội dung thuần */
export function stripTag(content: string): string {
  const parsed = parseEntryTag(content.trim());
  return parsed ? parsed.innerContent : content.trim();
}

/** Áp dụng tag cho toàn bộ entries dựa trên allocation */
export function applyTagsToEntries(
  entries: LorebookEntry[],
  allocations: TagAllocation[]
): LorebookEntry[] {
  const allocMap = new Map(allocations.map(a => [a.entryId, a]));
  
  return entries.map(entry => {
    const alloc = allocMap.get(entry.id);
    if (!alloc) return entry;
    
    return {
      ...entry,
      content: wrapWithTag(entry.content, alloc.fullTag),
    };
  });
}
