/**
 * src/lib/ai/coherenceManager.ts — Entry Coherence System
 * Spec Phần 7H.3: Build coherence context for AI prompts to maintain consistency
 */

import type { LorebookEntry } from '../../types';

/**
 * Build coherence context string from existing entries.
 * Groups entries by their group field and creates a summary
 * with consistency rules for AI to follow.
 */
export function buildCoherenceContext(entries: LorebookEntry[]): string {
  if (entries.length === 0) return '';

  // Group entries by their group field
  const groups: Record<string, LorebookEntry[]> = {};
  for (const e of entries) {
    const g = e.extensions?.group || 'Chung';
    if (!groups[g]) groups[g] = [];
    groups[g].push(e);
  }

  const summary = Object.entries(groups)
    .map(([theme, ents]) => `• [${theme}]: ${ents.map(e => `"${e.comment}"`).join(', ')}`)
    .join('\n');

  return `=== BỐI CẢNH CÁC ENTRIES HIỆN CÓ (DUY TRÌ TÍNH NHẤT QUÁN) ===
${summary}

QUY TẮC MẠCH LẠC (BẮT BUỘC):
• Tên nhân vật/địa điểm phải NHẤT QUÁN với tên đã có
• Số liệu (năm, khoảng cách, tuổi...) phải NHẤT QUÁN
• Mối quan hệ nhân vật không được mâu thuẫn
• Nếu mở rộng entry đã có, dùng @ref:tên_entry_gốc để liên kết`;
}

/**
 * Extract key facts from entries for coherence checking.
 * Returns a map of entity name → facts mentioned across entries.
 */
export function extractKeyFacts(entries: LorebookEntry[]): Map<string, string[]> {
  const facts = new Map<string, string[]>();

  for (const entry of entries) {
    // Use comment as entity name
    const entity = entry.comment.trim();
    if (!entity) continue;

    // Extract key facts from content
    const lines = entry.content.split('\n').filter(l => l.trim().length > 10);
    const existingFacts = facts.get(entity) ?? [];
    existingFacts.push(...lines.slice(0, 5));
    facts.set(entity, existingFacts);
  }

  return facts;
}

/**
 * Build a concise coherence summary (for token-limited contexts).
 * Only includes entity names and their key count.
 */
export function buildCoherenceSummary(entries: LorebookEntry[]): string {
  if (entries.length === 0) return '';

  // Count entries per group
  const groups: Record<string, number> = {};
  for (const e of entries) {
    const g = e.extensions?.group || 'Chung';
    groups[g] = (groups[g] ?? 0) + 1;
  }

  const summary = Object.entries(groups)
    .sort(([, a], [, b]) => b - a)
    .map(([g, count]) => `${g} (${count})`)
    .join(', ');

  return `[Coherence: ${entries.length} entries — ${summary}]`;
}
