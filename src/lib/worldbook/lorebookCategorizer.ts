/**
 * lorebookCategorizer.ts — Auto-categorize lorebook entries
 * Analyzes entry content, keys, and comment to automatically assign categories
 * and suggest keywords based on content patterns.
 *
 * Categories: Character, Location, Lore, System, EJS, MVU, NPC, Item, Quest, Rule
 */

import type { LorebookEntry } from '../../types';
import { isPreprocessingEntry } from '../ejs/ejsParser';

// ─── Types ──────────────────────────────────────────────────────────────

export type AutoCategory =
  | 'character'    // Main character info
  | 'npc'          // NPC entries
  | 'location'     // Places, maps
  | 'lore'         // World lore, history
  | 'system'       // System rules, instructions
  | 'ejs'          // @@preprocessing entries
  | 'mvu'          // MVU/ZOD variable entries
  | 'item'         // Items, equipment, skills
  | 'quest'        // Quests, missions
  | 'rule'         // Game rules, guidelines
  | 'uncategorized';

export interface CategoryResult {
  category: AutoCategory;
  confidence: number; // 0-1
  suggestedKeywords: string[];
  issues: string[];
  tokenCount: number;
}

export interface CategorizationSummary {
  total: number;
  byCategory: Record<AutoCategory, number>;
  issues: Array<{ entryId: number; comment: string; issues: string[] }>;
  duplicateKeywords: Array<{ keyword: string; entryIds: number[] }>;
  emptyEntries: number[];
  overlapGroups: Array<{ entries: number[]; sharedKeys: string[] }>;
}

// ─── Category Detection ─────────────────────────────────────────────────

const CATEGORY_PATTERNS: Array<{
  category: AutoCategory;
  commentPatterns: RegExp[];
  contentPatterns: RegExp[];
  keyPatterns: RegExp[];
  weight: number;
}> = [
  {
    category: 'ejs',
    commentPatterns: [/@@preprocessing/i, /\bejs\b/i, /\bscript\b/i],
    contentPatterns: [/@@preprocessing/, /<%[_=-]/, /getvar\s*\(/, /setvar\s*\(/],
    keyPatterns: [],
    weight: 1.0,
  },
  {
    category: 'mvu',
    commentPatterns: [/\binitvar\b/i, /\bvariable\b/i, /\b变量\b/, /\b初始\b/, /\bmvu\b/i, /\bzod\b/i, /\bstat_data\b/i],
    contentPatterns: [/stat_data/, /z\.object/, /prefault/, /registerMvuSchema/, /\bInitVar\b/],
    keyPatterns: [/stat_data/i, /initvar/i],
    weight: 0.9,
  },
  {
    category: 'npc',
    commentPatterns: [/\bnpc\b/i, /\[npc\]/i, /^\[.*?\]\s*\w+/],
    contentPatterns: [/性格|tính cách|personality/i, /外貌|ngoại hình|appearance/i, /关系|mối quan hệ|relationship/i],
    keyPatterns: [/npc/i],
    weight: 0.8,
  },
  {
    category: 'character',
    commentPatterns: [/\bchar\b/i, /\bnhân vật\b/i, /\bcharacter\b/i, /\b人物\b/],
    contentPatterns: [/{{char}}/, /{{user}}/, /tính cách|personality/i, /ngoại hình|appearance/i],
    keyPatterns: [/char/i, /nhân vật/i],
    weight: 0.7,
  },
  {
    category: 'location',
    commentPatterns: [/\blocation\b/i, /\bđịa điểm\b/i, /\bnơi\b/i, /\b地点\b/, /\bmap\b/i],
    contentPatterns: [/地形|terrain/i, /位于|nằm ở|located/i, /đường|road|path|phố/i],
    keyPatterns: [/location/i, /địa/i, /nơi/i],
    weight: 0.7,
  },
  {
    category: 'item',
    commentPatterns: [/\bitem\b/i, /\bvật phẩm\b/i, /\bkỹ năng\b/i, /\bskill\b/i, /\b物品\b/, /\b技能\b/],
    contentPatterns: [/tấn công|attack|damage/i, /phòng thủ|defense/i, /hiệu ứng|effect/i, /ATK|DEF|HP/],
    keyPatterns: [/item/i, /skill/i, /vật phẩm/i],
    weight: 0.7,
  },
  {
    category: 'quest',
    commentPatterns: [/\bquest\b/i, /\bnhiệm vụ\b/i, /\bmission\b/i, /\b任务\b/],
    contentPatterns: [/mục tiêu|objective|target/i, /phần thưởng|reward/i, /điều kiện|condition/i],
    keyPatterns: [/quest/i, /nhiệm vụ/i],
    weight: 0.7,
  },
  {
    category: 'rule',
    commentPatterns: [/\brule\b/i, /\bquy tắc\b/i, /\bhướng dẫn\b/i, /\bguide\b/i, /\b规则\b/],
    contentPatterns: [/\bphải\b.*\bkhông\b|\bNGHIÊM CẤM\b|\bBẮT BUỘC\b/i, /MUST|SHALL NOT|FORBIDDEN/i],
    keyPatterns: [/rule/i, /guide/i],
    weight: 0.8,
  },
  {
    category: 'system',
    commentPatterns: [/\bsystem\b/i, /\bhệ thống\b/i, /\bformat\b/i, /\btemplate\b/i],
    contentPatterns: [/\[System\]/i, /\[Instructions\]/i, /format.*output/i],
    keyPatterns: [/system/i],
    weight: 0.6,
  },
  {
    category: 'lore',
    commentPatterns: [/\blore\b/i, /\bhistory\b/i, /\blịch sử\b/i, /\bthế giới\b/i, /\bworld\b/i],
    contentPatterns: [/năm|thế kỷ|triều đại/i, /history|era|age|kingdom/i],
    keyPatterns: [/lore/i, /world/i],
    weight: 0.5,
  },
];

// ─── Main Functions ─────────────────────────────────────────────────────

export function categorizeEntry(entry: LorebookEntry): CategoryResult {
  const issues: string[] = [];
  const suggestedKeywords: string[] = [];

  // Quick check for EJS
  if (isPreprocessingEntry(entry.content)) {
    return {
      category: 'ejs',
      confidence: 1.0,
      suggestedKeywords: [],
      issues: entry.keys.length === 0 ? ['EJS entry không cần keys (ok)'] : [],
      tokenCount: estimateTokens(entry.content),
    };
  }

  // Score each category
  const scores = new Map<AutoCategory, number>();

  for (const pattern of CATEGORY_PATTERNS) {
    let score = 0;

    // Check comment
    for (const re of pattern.commentPatterns) {
      if (re.test(entry.comment)) score += 3 * pattern.weight;
    }

    // Check content
    for (const re of pattern.contentPatterns) {
      if (re.test(entry.content)) score += 2 * pattern.weight;
    }

    // Check keys
    for (const key of entry.keys) {
      for (const re of pattern.keyPatterns) {
        if (re.test(key)) score += 1.5 * pattern.weight;
      }
    }

    if (score > 0) {
      scores.set(pattern.category, (scores.get(pattern.category) ?? 0) + score);
    }
  }

  // Find best category
  let bestCategory: AutoCategory = 'uncategorized';
  let bestScore = 0;

  for (const [cat, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  // Confidence (normalize)
  const maxPossibleScore = 15; // rough max
  const confidence = Math.min(1.0, bestScore / maxPossibleScore);

  // Issue detection
  if (!entry.content.trim()) {
    issues.push('Entry không có nội dung');
  }
  if (entry.content.length > 4000) {
    issues.push(`Entry quá dài (${entry.content.length} chars / ~${estimateTokens(entry.content)} tokens)`);
  }
  if (entry.keys.length === 0 && !entry.constant) {
    issues.push('Entry không có keys và không phải constant → AI sẽ không bao giờ kích hoạt');
  }
  if (entry.keys.some(k => k.length <= 1)) {
    issues.push('Có key quá ngắn (1 ký tự) → trigger quá rộng');
  }

  // Keyword suggestions based on content
  const words = entry.content.match(/[\p{L}]{3,}/gu) ?? [];
  const wordFreq = new Map<string, number>();
  for (const w of words) {
    const lower = w.toLowerCase();
    wordFreq.set(lower, (wordFreq.get(lower) ?? 0) + 1);
  }
  const existingKeys = new Set(entry.keys.map(k => k.toLowerCase()));
  const topWords = [...wordFreq.entries()]
    .filter(([w, c]) => c >= 2 && !existingKeys.has(w) && w.length >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
  suggestedKeywords.push(...topWords);

  return {
    category: bestCategory,
    confidence,
    suggestedKeywords,
    issues,
    tokenCount: estimateTokens(entry.content),
  };
}

export function categorizeAllEntries(entries: LorebookEntry[]): CategorizationSummary {
  const byCategory: Record<AutoCategory, number> = {
    character: 0, npc: 0, location: 0, lore: 0, system: 0,
    ejs: 0, mvu: 0, item: 0, quest: 0, rule: 0, uncategorized: 0,
  };
  const allIssues: CategorizationSummary['issues'] = [];
  const emptyEntries: number[] = [];

  // Keyword overlap detection
  const keywordToEntries = new Map<string, number[]>();

  for (const entry of entries) {
    const result = categorizeEntry(entry);
    byCategory[result.category]++;

    if (result.issues.length > 0) {
      allIssues.push({ entryId: entry.id, comment: entry.comment, issues: result.issues });
    }
    if (!entry.content.trim()) {
      emptyEntries.push(entry.id);
    }

    // Track keywords
    for (const key of entry.keys) {
      const lower = key.toLowerCase();
      if (!keywordToEntries.has(lower)) {
        keywordToEntries.set(lower, []);
      }
      keywordToEntries.get(lower)!.push(entry.id);
    }
  }

  // Find duplicate keywords
  const duplicateKeywords: CategorizationSummary['duplicateKeywords'] = [];
  for (const [keyword, entryIds] of keywordToEntries) {
    if (entryIds.length > 1) {
      duplicateKeywords.push({ keyword, entryIds });
    }
  }

  // Find overlap groups (entries that share 2+ keys)
  const overlapGroups: CategorizationSummary['overlapGroups'] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const sharedKeys = entries[i].keys.filter(k =>
        entries[j].keys.some(k2 => k2.toLowerCase() === k.toLowerCase()),
      );
      if (sharedKeys.length >= 2) {
        overlapGroups.push({
          entries: [entries[i].id, entries[j].id],
          sharedKeys,
        });
      }
    }
  }

  return {
    total: entries.length,
    byCategory,
    issues: allIssues,
    duplicateKeywords,
    emptyEntries,
    overlapGroups,
  };
}

// ─── Category Labels ────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<AutoCategory, { label: string; icon: string; color: string }> = {
  character:     { label: 'Nhân vật',      icon: '👤', color: 'text-blue-400' },
  npc:           { label: 'NPC',           icon: '👥', color: 'text-indigo-400' },
  location:      { label: 'Địa điểm',     icon: '📍', color: 'text-emerald-400' },
  lore:          { label: 'Lore',          icon: '📖', color: 'text-amber-400' },
  system:        { label: 'Hệ thống',     icon: '⚙️', color: 'text-gray-400' },
  ejs:           { label: 'EJS',           icon: '📜', color: 'text-cyan-400' },
  mvu:           { label: 'MVU/ZOD',       icon: '🔧', color: 'text-violet-400' },
  item:          { label: 'Vật phẩm',      icon: '🎒', color: 'text-orange-400' },
  quest:         { label: 'Nhiệm vụ',     icon: '⚔️', color: 'text-red-400' },
  rule:          { label: 'Quy tắc',       icon: '📋', color: 'text-yellow-400' },
  uncategorized: { label: 'Chưa phân loại', icon: '❓', color: 'text-muted-foreground' },
};

function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}
