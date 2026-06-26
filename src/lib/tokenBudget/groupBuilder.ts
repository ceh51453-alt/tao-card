/**
 * src/lib/tokenBudget/groupBuilder.ts — Merge Analysis → Groups → Budget Allocation
 * 
 * Phase 2: Local computation (không cần API)
 * Nhận kết quả phân tích từ Phase 1, xây dựng nhóm và phân bổ budget.
 */

import type { AnalyzedEntry, TctrlAnalysisConfig } from './tokenAnalyzer';
import type { MVUZODSchema, MVUZODField } from '../../types/mvuzod.types';

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
  variables: TctrlVariable[];
  hasExistingSchema: boolean;
  stats: {
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    tokensByGroup: Record<string, number>;
  };
}

export interface TctrlVariable {
  name: string;                    // "location", "era"
  type: 'string' | 'number' | 'boolean';
  getvarPath: string;              // "stat_data.Trạng thái thế giới.Khu vực" or "stat_data.@@tctrl.location"
  defaultValue: string;
  possibleValues: string[];
  source: 'mvuzod' | 'auto';      // From schema vs auto-detected
  affectedEntries: number[];
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
  mvuzodSchema?: MVUZODSchema | null,
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

  // Resolve variables
  const hasExistingSchema = !!(mvuzodSchema && mvuzodSchema.fields.length > 0);
  const variables = resolveVariables(analyzed, mvuzodSchema ?? null);

  if (variables.length > 0) {
    recommendations.push(`🔗 Phát hiện ${variables.length} biến điều khiển: ${variables.map(v => `${v.name}(${v.source})`).join(', ')}`);
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
    variables,
    hasExistingSchema,
    stats: { byCategory, byPriority, tokensByGroup },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIABLE RESOLUTION — Merge hints + MVUZOD schema
// ═══════════════════════════════════════════════════════════════════════════

// Vietnamese → English name mapping for schema field matching
const VARIABLE_FIELD_ALIASES: Record<string, string[]> = {
  location: ['khu vực', 'vị trí', 'địa điểm', 'location', 'area', 'region', 'nơi'],
  era: ['thời đại', 'thời kỳ', 'era', 'age', 'epoch', 'niên đại'],
  time_of_day: ['thời gian', 'giờ', 'time', 'buổi', 'thời điểm'],
  mood: ['tâm trạng', 'cảm xúc', 'mood', 'emotion', 'feeling'],
  combat_state: ['chiến đấu', 'combat', 'battle', 'trận'],
  quest_stage: ['nhiệm vụ', 'quest', 'mission', 'giai đoạn'],
  relationship: ['quan hệ', 'relationship', 'hảo cảm', 'tình cảm'],
};

function findSchemaFieldForVariable(
  variableName: string,
  schema: MVUZODSchema,
): { field: MVUZODField; path: string } | null {
  const aliases = VARIABLE_FIELD_ALIASES[variableName] ?? [variableName];

  // Recursive search through schema fields
  function searchFields(fields: MVUZODField[], parentPath: string): { field: MVUZODField; path: string } | null {
    for (const field of fields) {
      const fieldName = field.path.split('/').pop()?.toLowerCase() ?? '';
      const fieldLabel = field.label.toLowerCase();

      // Match by name or label
      for (const alias of aliases) {
        if (fieldName.includes(alias.toLowerCase()) || fieldLabel.includes(alias.toLowerCase())) {
          const fullPath = parentPath ? `${parentPath}.${field.path.split('/').pop()}` : `stat_data.${field.path.replace(/\//g, '.')}`;
          return { field, path: fullPath };
        }
      }

      // Search children
      if (field.children?.length) {
        const childPath = parentPath ? `${parentPath}.${field.path.split('/').pop()}` : `stat_data.${field.path.replace(/\//g, '.')}`;
        const found = searchFields(field.children, childPath);
        if (found) return found;
      }
    }
    return null;
  }

  return searchFields(schema.fields, '');
}

function resolveVariables(
  analyzed: AnalyzedEntry[],
  mvuzodSchema: MVUZODSchema | null,
): TctrlVariable[] {
  // Collect all control hints
  const hintMap = new Map<string, {
    entries: number[];
    values: Set<string>;
    conditions: string[];
  }>();

  for (const entry of analyzed) {
    if (!entry.controlHint) continue;
    const { variableName, matchValue, condition } = entry.controlHint;

    if (!hintMap.has(variableName)) {
      hintMap.set(variableName, { entries: [], values: new Set(), conditions: [] });
    }
    const data = hintMap.get(variableName)!;
    data.entries.push(entry.entryId);
    data.values.add(matchValue);
    if (!data.conditions.includes(condition)) data.conditions.push(condition);
  }

  // Build variables with schema resolution
  const variables: TctrlVariable[] = [];

  for (const [name, data] of hintMap) {
    // Try to find matching MVUZOD schema field
    const schemaMatch = mvuzodSchema ? findSchemaFieldForVariable(name, mvuzodSchema) : null;

    if (schemaMatch) {
      // Kịch bản B: Reuse existing schema path
      variables.push({
        name,
        type: schemaMatch.field.type === 'number' ? 'number'
            : schemaMatch.field.type === 'boolean' ? 'boolean'
            : 'string',
        getvarPath: schemaMatch.path,
        defaultValue: String(schemaMatch.field.defaultValue ?? ''),
        possibleValues: Array.from(data.values),
        source: 'mvuzod',
        affectedEntries: data.entries,
      });
    } else {
      // Kịch bản A/C: Create new @@tctrl variable
      const type = data.conditions.some(c => c.includes('>') || c.includes('<')) ? 'number'
                 : data.conditions.some(c => c.includes('true') || c.includes('false')) ? 'boolean'
                 : 'string';
      variables.push({
        name,
        type,
        getvarPath: `stat_data.@@tctrl.${name}`,
        defaultValue: type === 'number' ? '0' : type === 'boolean' ? 'false' : '',
        possibleValues: Array.from(data.values),
        source: 'auto',
        affectedEntries: data.entries,
      });
    }
  }

  return variables;
}
