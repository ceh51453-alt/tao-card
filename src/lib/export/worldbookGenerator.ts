/**
 * src/lib/export/worldbookGenerator.ts — Auto-generate MVUZOD Worldbook Entries
 *
 * Creates the 5 system worldbook entries needed for MVU ZOD framework:
 * 1. [initvar] — Initial variable values (disabled entry)
 * 2. Danh sách biến — Variable list display for AI
 * 3. [mvu_update] Update Rules — How AI should update variables
 * 4. [mvu_update] Output Format — JSON Patch format spec
 * 5. [mvu_update] Emphasis — D0 reminder for AI
 *
 * Also handles deduplication: detects existing entries and replaces them.
 */

import type { LorebookEntry } from '../../types/lorebook.types';
import type { MVUZODSchema } from '../../types/mvuzod.types';
import { DEFAULT_ENTRY_EXT } from '../../types/lorebook.types';
import {
  generateInitVarYAML,
  generateVariableListEntry,
  generateUpdateRulesEntry,
  generateOutputFormatEntry,
  generateEmphasisEntry,
} from '../mvuzod/scriptGenerator';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GeneratedSystemEntry {
  /** Unique identifier for deduplication */
  systemId: string;
  /** Display name / comment */
  comment: string;
  /** Entry content */
  content: string;
  /** Whether this entry should be constant (always active) */
  constant: boolean;
  /** Whether this entry should be disabled (initvar pattern) */
  enabled: boolean;
  /** Position: 0=before_char, 1=after_char, 4=@depth */
  position: 0 | 1 | 4;
  /** Depth for @depth position */
  depth: number;
  /** Role: 0=system, 1=user, 2=assistant, null=default */
  role: 0 | 1 | 2 | null;
  /** Insertion order */
  insertionOrder: number;
  /** Description for UI */
  description: string;
}

export interface WorldbookGeneratorResult {
  /** Generated entries ready to add to lorebook */
  entries: LorebookEntry[];
  /** IDs of existing entries that were replaced */
  replacedEntryIds: number[];
  /** Warnings (e.g. "initvar already exists, will be replaced") */
  warnings: string[];
  /** Summary of what was generated */
  summary: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM ENTRY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Canonical comment patterns for identifying existing system entries */
const SYSTEM_ENTRY_PATTERNS: Record<string, RegExp> = {
  initvar: /\[initvar\]|初始化变量|khởi tạo biến/i,
  varlist: /Danh sách biến|variable.?list|biến số/i,
  update_rules: /\[mvu_update\].*(?:quy tắc|rules|更新規則)/i,
  output_format: /\[mvu_update\].*(?:định dạng|format|格式)/i,
  emphasis: /\[mvu_update\].*(?:nhấn mạnh|emphasis|強調)/i,
};

function buildSystemEntrySpecs(schema: MVUZODSchema): GeneratedSystemEntry[] {
  return [
    {
      systemId: 'initvar',
      comment: '[initvar] Khởi tạo biến - đừng mở',
      content: generateInitVarYAML(schema),
      constant: false,
      enabled: false,  // MVU reads initvar only when DISABLED
      position: 0,
      depth: 4,
      role: null,
      insertionOrder: 10,
      description: 'Giá trị biến ban đầu. Entry phải ở trạng thái TẮT (disabled).',
    },
    {
      systemId: 'varlist',
      comment: 'Danh sách biến',
      content: generateVariableListEntry(schema, 'full'),
      constant: true,
      enabled: true,
      position: 4,  // @depth
      depth: 0,     // D0
      role: 0,      // system
      insertionOrder: 200,
      description: 'Hiển thị biến hiện tại cho AI. Đặt D0/D1, luôn bật.',
    },
    {
      systemId: 'update_rules',
      comment: '[mvu_update] Quy tắc cập nhật biến',
      content: generateUpdateRulesEntry(schema),
      constant: true,
      enabled: true,
      position: 0,  // before_char
      depth: 4,
      role: null,
      insertionOrder: 100,
      description: 'Hướng dẫn AI cách cập nhật biến. Tiền tố [mvu_update] bắt buộc.',
    },
    {
      systemId: 'output_format',
      comment: '[mvu_update] Định dạng đầu ra biến',
      content: generateOutputFormatEntry(schema),
      constant: true,
      enabled: true,
      position: 0,
      depth: 4,
      role: null,
      insertionOrder: 101,
      description: 'Quy định format JSON Patch cho AI xuất biến.',
    },
    {
      systemId: 'emphasis',
      comment: '[mvu_update] Nhấn mạnh định dạng đầu ra biến',
      content: generateEmphasisEntry(),
      constant: true,
      enabled: true,
      position: 4,  // @depth
      depth: 0,     // D0 — end of conversation for maximum impact
      role: 0,      // system
      insertionOrder: 999,
      description: 'Nhắc nhở AI luôn xuất UpdateVariable. Đặt D0 để ở cuối prompt.',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate all MVUZOD system worldbook entries.
 *
 * @param schema - The MVUZOD schema to generate entries from
 * @param existingEntries - Current lorebook entries (for dedup and ID allocation)
 * @param options - Configuration options
 * @returns Generated entries + dedup info
 */
export function generateWorldbookEntries(
  schema: MVUZODSchema,
  existingEntries: LorebookEntry[],
  options: {
    /** Which entries to generate (default: all) */
    include?: string[];
    /** Whether to replace existing system entries (default: true) */
    replaceExisting?: boolean;
    /** Custom initvar values (overrides schema defaults) */
    initVarValues?: Record<string, unknown>;
  } = {},
): WorldbookGeneratorResult {
  const {
    include,
    replaceExisting = true,
    initVarValues,
  } = options;

  const specs = buildSystemEntrySpecs(schema);
  const warnings: string[] = [];
  const summary: string[] = [];
  const replacedEntryIds: number[] = [];

  // Override initvar content if custom values provided
  if (initVarValues && Object.keys(initVarValues).length > 0) {
    const initvarSpec = specs.find(s => s.systemId === 'initvar');
    if (initvarSpec) {
      initvarSpec.content = generateInitVarYAML(schema, initVarValues);
    }
  }

  // Filter specs based on include list
  const filteredSpecs = include
    ? specs.filter(s => include.includes(s.systemId))
    : specs;

  // Find and mark existing entries for replacement
  if (replaceExisting) {
    for (const spec of filteredSpecs) {
      const pattern = SYSTEM_ENTRY_PATTERNS[spec.systemId];
      if (!pattern) continue;

      const existing = existingEntries.filter(e => pattern.test(e.comment));
      if (existing.length > 0) {
        for (const e of existing) {
          replacedEntryIds.push(e.id);
          warnings.push(`Entry "${e.comment}" (ID: ${e.id}) sẽ được thay thế bởi entry mới.`);
        }
      }
    }
  }

  // Calculate next available ID
  const allIds = existingEntries.map(e => e.id);
  let nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 0;

  // Generate LorebookEntry objects
  const generatedEntries: LorebookEntry[] = filteredSpecs.map(spec => {
    const entry: LorebookEntry = {
      id: nextId++,
      keys: [],
      secondary_keys: [],
      comment: spec.comment,
      content: spec.content,
      constant: spec.constant,
      selective: false,
      insertion_order: spec.insertionOrder,
      enabled: spec.enabled,
      position: spec.position === 0 ? 'before_char' : 'after_char',
      use_regex: true,
      extensions: {
        ...DEFAULT_ENTRY_EXT,
        position: spec.position,
        depth: spec.depth,
        role: spec.role,
        scan_depth: 0,  // System entries don't need scan
        display_index: nextId - 1,
        exclude_recursion: true,
        prevent_recursion: true,
      },
    };

    summary.push(`✅ ${spec.comment} — ${spec.description}`);
    return entry;
  });

  return {
    entries: generatedEntries,
    replacedEntryIds,
    warnings,
    summary,
  };
}

/**
 * Find existing MVUZOD system entries in the lorebook.
 * Returns a map of systemId → existing entry IDs.
 */
export function findExistingMVUZODEntries(
  entries: LorebookEntry[],
): Record<string, number[]> {
  const result: Record<string, number[]> = {};

  for (const [systemId, pattern] of Object.entries(SYSTEM_ENTRY_PATTERNS)) {
    const matching = entries.filter(e => pattern.test(e.comment));
    if (matching.length > 0) {
      result[systemId] = matching.map(e => e.id);
    }
  }

  return result;
}

/**
 * Apply generated entries to an existing lorebook.
 * Handles dedup by removing replaced entries and appending new ones.
 *
 * @returns The new complete entries array
 */
export function applyGeneratedEntries(
  existingEntries: LorebookEntry[],
  generated: WorldbookGeneratorResult,
): LorebookEntry[] {
  // Remove replaced entries
  const filtered = existingEntries.filter(
    e => !generated.replacedEntryIds.includes(e.id),
  );

  // Append new entries
  return [...filtered, ...generated.entries];
}
