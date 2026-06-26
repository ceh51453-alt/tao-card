/**
 * src/lib/tokenBudget/groupBuilder.ts — Merge Analysis → Groups → Budget Allocation
 * 
 * Phase 2: Local computation (không cần API)
 * Nhận kết quả phân tích từ Phase 1, xây dựng nhóm và phân bổ budget.
 */

import type { AnalyzedEntry, TctrlAnalysisConfig } from './tokenAnalyzer';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TctrlGroup {
  id: string;
  name: string;
  xmlTags: string[];
  hierarchy: number;          // 1=highest priority, 5=lowest
  priority: 'critical' | 'high' | 'medium' | 'low';
  entries: number[];          // entry IDs
  totalTokens: number;
  budgetAllocation: number;
  strategy: 'constant' | 'normal';
  stConfig: {
    position: number;         // 0-7
    depth: number;
    order: number;
    role: 'system' | null;
  };
}

export interface TctrlAnalysis {
  totalEntries: number;
  totalTokens: number;
  constantTokens: number;
  effectiveBudget: number;
  groups: TctrlGroup[];
  deadEntries: AnalyzedEntry[];
  duplicates: Array<{ keep: number; remove: number; comment: string }>;
  recommendations: string[];
  stats: {
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    tokensByGroup: Record<string, number>;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HIERARCHY MAPPING (from user's "chinh lorebook.txt")
// ═══════════════════════════════════════════════════════════════════════════

interface HierarchyRule {
  id: string;
  name: string;
  xmlTags: string[];
  groupSuggestions: string[];   // match from AI groupSuggestion
  hierarchy: number;
  strategy: 'constant' | 'normal';
  stConfig: { position: number; depth: number; order: number; role: 'system' | null };
}

const HIERARCHY_RULES: HierarchyRule[] = [
  {
    id: 'core_system',
    name: 'Hệ thống cốt lõi & Meta',
    xmlTags: ['<Meta>', '<System>', '<Mechanic>', '<Rule>'],
    groupSuggestions: ['core system', 'core system & meta', 'system', 'meta', 'mechanic', 'rules & guidelines'],
    hierarchy: 1,
    strategy: 'constant',
    stConfig: { position: 4, depth: 0, order: 900, role: 'system' },
  },
  {
    id: 'worldview',
    name: 'Thế giới quan & Dòng thời gian',
    xmlTags: ['<Worldview>', '<Timeline>'],
    groupSuggestions: ['worldview', 'worldview & timeline', 'lore & history', 'world'],
    hierarchy: 2,
    strategy: 'constant',
    stConfig: { position: 4, depth: 4, order: 800, role: 'system' },
  },
  {
    id: 'characters',
    name: 'Nhân vật',
    xmlTags: ['<Character>'],
    groupSuggestions: ['characters', 'nhân vật chính', 'nhân vật', 'main character'],
    hierarchy: 3,
    strategy: 'normal',
    stConfig: { position: 1, depth: 4, order: 200, role: null },
  },
  {
    id: 'factions',
    name: 'Phe phái & Tổ chức',
    xmlTags: ['<Faction>', '<Organization>', '<Religion>'],
    groupSuggestions: ['factions', 'factions & organizations', 'tổ chức', 'phe phái'],
    hierarchy: 4,
    strategy: 'normal',
    stConfig: { position: 0, depth: 4, order: 150, role: null },
  },
  {
    id: 'locations',
    name: 'Địa điểm & Khu vực',
    xmlTags: ['<Location>', '<Area>'],
    groupSuggestions: ['locations', 'locations & areas', 'địa điểm', 'khu vực'],
    hierarchy: 5,
    strategy: 'normal',
    stConfig: { position: 0, depth: 4, order: 100, role: null },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export function buildGroupsFromAnalysis(
  analyzed: AnalyzedEntry[],
  config: TctrlAnalysisConfig,
): TctrlAnalysis {
  const effectiveBudget = Math.floor(config.inputContext * config.targetBudgetPercent / 100);

  // Separate dead and duplicates
  const deadEntries = analyzed.filter(e => e.isDead);
  const duplicates: TctrlAnalysis['duplicates'] = [];
  const duplicateIds = new Set<number>();

  for (const entry of analyzed) {
    if (entry.duplicateOf !== null && !duplicateIds.has(entry.entryId)) {
      duplicates.push({
        keep: entry.duplicateOf,
        remove: entry.entryId,
        comment: entry.comment,
      });
      duplicateIds.add(entry.entryId);
    }
  }

  // Filter out dead + duplicate entries for grouping
  const deadIds = new Set(deadEntries.map(e => e.entryId));
  const activeEntries = analyzed.filter(e => !deadIds.has(e.entryId) && !duplicateIds.has(e.entryId));

  // Group entries by matching hierarchy rules
  const groupMap = new Map<string, { rule: HierarchyRule; entries: AnalyzedEntry[] }>();

  // Initialize all hierarchy groups
  for (const rule of HIERARCHY_RULES) {
    groupMap.set(rule.id, { rule, entries: [] });
  }

  // Assign entries to groups
  for (const entry of activeEntries) {
    let assigned = false;

    // 1. Match by XML tag (highest priority)
    if (entry.xmlTag) {
      for (const rule of HIERARCHY_RULES) {
        if (rule.xmlTags.some(t => t.toLowerCase() === entry.xmlTag!.toLowerCase())) {
          groupMap.get(rule.id)!.entries.push(entry);
          assigned = true;
          break;
        }
      }
    }

    // 2. Match by groupSuggestion (from AI)
    if (!assigned && entry.groupSuggestion) {
      const suggestion = entry.groupSuggestion.toLowerCase().trim();
      for (const rule of HIERARCHY_RULES) {
        if (rule.groupSuggestions.some(gs => suggestion.includes(gs) || gs.includes(suggestion))) {
          groupMap.get(rule.id)!.entries.push(entry);
          assigned = true;
          break;
        }
      }
    }

    // 3. Match by category
    if (!assigned) {
      const categoryToGroup: Record<string, string> = {
        'character': 'characters',
        'npc': 'characters',
        'location': 'locations',
        'system': 'core_system',
        'rule': 'core_system',
        'lore': 'worldview',
        'mvu': 'core_system',
        'ejs': 'core_system',
      };
      const groupId = categoryToGroup[entry.category];
      if (groupId && groupMap.has(groupId)) {
        groupMap.get(groupId)!.entries.push(entry);
        assigned = true;
      }
    }

    // 4. Fallback: add to a misc group
    if (!assigned) {
      if (!groupMap.has('misc')) {
        groupMap.set('misc', {
          rule: {
            id: 'misc',
            name: 'Khác (Chưa phân loại)',
            xmlTags: [],
            groupSuggestions: [],
            hierarchy: 6,
            strategy: 'normal',
            stConfig: { position: 0, depth: 4, order: 50, role: null },
          },
          entries: [],
        });
      }
      groupMap.get('misc')!.entries.push(entry);
    }
  }

  // Build TctrlGroup objects
  const groups: TctrlGroup[] = [];
  let constantTokens = 0;

  for (const [, { rule, entries }] of groupMap) {
    if (entries.length === 0) continue;

    const totalTokens = entries.reduce((sum, e) => sum + e.tokenEstimate, 0);
    if (rule.strategy === 'constant') constantTokens += totalTokens;

    groups.push({
      id: rule.id,
      name: rule.name,
      xmlTags: rule.xmlTags,
      hierarchy: rule.hierarchy,
      priority: rule.strategy === 'constant' ? 'critical' : (rule.hierarchy <= 3 ? 'high' : 'medium'),
      entries: entries.map(e => e.entryId),
      totalTokens,
      budgetAllocation: 0, // Calculated below
      strategy: rule.strategy,
      stConfig: rule.stConfig,
    });
  }

  // Sort by hierarchy
  groups.sort((a, b) => a.hierarchy - b.hierarchy);

  // Budget allocation
  const remainingBudget = Math.max(0, effectiveBudget - constantTokens);
  const normalGroups = groups.filter(g => g.strategy === 'normal');
  const totalNormalTokens = normalGroups.reduce((sum, g) => sum + g.totalTokens, 0);

  for (const group of groups) {
    if (group.strategy === 'constant') {
      group.budgetAllocation = group.totalTokens; // Unlimited for constant
    } else if (totalNormalTokens > 0) {
      // Proportional allocation weighted by hierarchy (lower hierarchy = higher weight)
      const weight = (7 - group.hierarchy) / normalGroups.reduce((sum, g) => sum + (7 - g.hierarchy), 0);
      group.budgetAllocation = Math.floor(remainingBudget * weight);
    }
  }

  // Stats
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const tokensByGroup: Record<string, number> = {};

  for (const entry of analyzed) {
    byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
    byPriority[entry.priority] = (byPriority[entry.priority] ?? 0) + 1;
  }
  for (const group of groups) {
    tokensByGroup[group.name] = group.totalTokens;
  }

  // Recommendations
  const totalTokens = analyzed.reduce((sum, e) => sum + e.tokenEstimate, 0);
  const recommendations: string[] = [];

  if (totalTokens > effectiveBudget * 1.5) {
    recommendations.push(`⚠️ Token tổng (${totalTokens.toLocaleString()}) vượt budget (${effectiveBudget.toLocaleString()}) ${((totalTokens / effectiveBudget) * 100 - 100).toFixed(0)}%. Cần giảm mạnh.`);
  }
  if (deadEntries.length > 0) {
    recommendations.push(`🗑️ Phát hiện ${deadEntries.length} entries "chết" — sẽ tắt để giảm noise.`);
  }
  if (duplicates.length > 0) {
    recommendations.push(`🔄 Phát hiện ${duplicates.length} cặp entries trùng — sẽ giữ bản mới nhất.`);
  }

  const largestGroup = groups.reduce((a, b) => a.totalTokens > b.totalTokens ? a : b, groups[0]);
  if (largestGroup && largestGroup.totalTokens > effectiveBudget * 0.4) {
    recommendations.push(`📊 Nhóm "${largestGroup.name}" chiếm ${((largestGroup.totalTokens / totalTokens) * 100).toFixed(0)}% tổng token. Cân nhắc chia nhỏ.`);
  }

  return {
    totalEntries: analyzed.length,
    totalTokens,
    constantTokens,
    effectiveBudget,
    groups,
    deadEntries,
    duplicates,
    recommendations,
    stats: { byCategory, byPriority, tokensByGroup },
  };
}
