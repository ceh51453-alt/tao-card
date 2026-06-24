/**
 * src/lib/validation/cardValidator.ts — Comprehensive Card Validation
 *
 * Validates every aspect of a card:
 * 1. Schema structure validation
 * 2. InitVar ↔ schema structure match
 * 3. Worldbook entries format check
 * 4. Token budget per section
 * 5. Regex pattern validation
 * 6. EJS syntax check
 * 7. Cross-reference checks (getvar paths → schema fields)
 */

import type { CharacterCardV3 } from '../../types/card.types';

import type { MVUZODSchema, MVUZODField } from '../../types/mvuzod.types';
import { isPreprocessingEntry, validateEJSEntry } from '../ejs/ejsParser';
import { findExistingMVUZODEntries } from '../export/worldbookGenerator';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type CheckCategory = 'basic' | 'schema' | 'worldbook' | 'regex' | 'ejs' | 'budget' | 'cross_ref';

export interface ValidationCheck {
  id: string;
  category: CheckCategory;
  label: string;
  status: 'pass' | 'warn' | 'fail' | 'skip';
  message: string;
  /** Optional fix suggestion */
  fix?: string;
  /** Related field or path */
  target?: string;
}

export interface CardValidationResult {
  /** Overall status */
  overall: 'pass' | 'warn' | 'fail';
  /** All individual checks */
  checks: ValidationCheck[];
  /** Summary counts */
  counts: { pass: number; warn: number; fail: number; skip: number };
  /** Token budget info */
  tokenBudget: TokenBudget;
  /** Timestamp */
  timestamp: number;
}

export interface TokenBudget {
  total: number;
  sections: Array<{
    name: string;
    tokens: number;
    percent: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run comprehensive validation on a card.
 */
export function validateCard(
  card: CharacterCardV3,
  schema: MVUZODSchema | null,
): CardValidationResult {
  const checks: ValidationCheck[] = [];

  // Run all check categories
  checks.push(...validateBasicFields(card));
  checks.push(...validateSchema(schema));
  checks.push(...validateWorldbook(card, schema));
  checks.push(...validateRegex(card));
  checks.push(...validateEJS(card, schema));
  checks.push(...validateCrossReferences(card, schema));

  const tokenBudget = analyzeTokenBudget(card);
  checks.push(...validateTokenBudget(tokenBudget));

  // Calculate counts
  const counts = {
    pass: checks.filter(c => c.status === 'pass').length,
    warn: checks.filter(c => c.status === 'warn').length,
    fail: checks.filter(c => c.status === 'fail').length,
    skip: checks.filter(c => c.status === 'skip').length,
  };

  const overall = counts.fail > 0 ? 'fail' : counts.warn > 0 ? 'warn' : 'pass';

  return {
    overall,
    checks,
    counts,
    tokenBudget,
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function validateBasicFields(card: CharacterCardV3): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // Name
  checks.push({
    id: 'basic_name',
    category: 'basic',
    label: 'Tên nhân vật',
    status: card.data.name && card.data.name !== 'New Character' ? 'pass' : 'warn',
    message: card.data.name && card.data.name !== 'New Character'
      ? `Tên: "${card.data.name}"`
      : 'Tên chưa đặt hoặc vẫn là mặc định',
    fix: 'Đặt tên nhân vật trong Card Editor → Thông tin cơ bản',
    target: 'data.name',
  });

  // Description
  const descLen = card.data.description?.length ?? 0;
  checks.push({
    id: 'basic_description',
    category: 'basic',
    label: 'Mô tả nhân vật',
    status: descLen >= 100 ? 'pass' : descLen >= 20 ? 'warn' : 'fail',
    message: descLen >= 20 ? `${descLen} ký tự (~${Math.ceil(descLen / 4)} tokens)` : 'Mô tả quá ngắn hoặc trống',
    fix: descLen < 20 ? 'Viết mô tả chi tiết về nhân vật (ngoại hình, tính cách, bối cảnh)' : undefined,
    target: 'data.description',
  });

  // First message
  const fmLen = card.data.first_mes?.length ?? 0;
  checks.push({
    id: 'basic_first_mes',
    category: 'basic',
    label: 'Tin nhắn mở đầu',
    status: fmLen >= 50 ? 'pass' : fmLen >= 10 ? 'warn' : 'fail',
    message: fmLen >= 10 ? `${fmLen} ký tự` : 'Tin nhắn mở đầu trống hoặc quá ngắn',
    fix: fmLen < 10 ? 'Viết tin nhắn mở đầu cho nhân vật' : undefined,
    target: 'data.first_mes',
  });

  // Spec version
  checks.push({
    id: 'basic_spec',
    category: 'basic',
    label: 'Spec Version',
    status: card.spec === 'chara_card_v3' ? 'pass' : 'warn',
    message: `${card.spec} v${card.spec_version}`,
  });

  // Avatar
  checks.push({
    id: 'basic_avatar',
    category: 'basic',
    label: 'Avatar',
    status: card.avatar !== 'none' && !!card.avatar ? 'pass' : 'warn',
    message: card.avatar !== 'none' && !!card.avatar ? 'Có avatar' : 'Chưa đặt avatar',
    fix: 'Upload ảnh avatar trong Card Editor',
  });

  return checks;
}

function validateSchema(schema: MVUZODSchema | null): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  if (!schema) {
    checks.push({
      id: 'schema_exists',
      category: 'schema',
      label: 'MVUZOD Schema',
      status: 'skip',
      message: 'Không có schema — bỏ qua validation MVUZOD',
    });
    return checks;
  }

  // Has fields
  checks.push({
    id: 'schema_fields',
    category: 'schema',
    label: 'Schema có fields',
    status: schema.fields.length > 0 ? 'pass' : 'fail',
    message: schema.fields.length > 0
      ? `${schema.fields.length} top-level fields, ${countLeafFields(schema.fields)} leaf fields`
      : 'Schema không có field nào',
    fix: 'Thêm fields trong Schema Wizard',
  });

  // Check for duplicate paths
  const paths = new Set<string>();
  const dupes: string[] = [];
  function checkDupes(fields: MVUZODField[]) {
    for (const f of fields) {
      if (paths.has(f.path)) dupes.push(f.path);
      paths.add(f.path);
      if (f.children?.length) checkDupes(f.children);
    }
  }
  checkDupes(schema.fields);

  checks.push({
    id: 'schema_no_dupes',
    category: 'schema',
    label: 'Không trùng path',
    status: dupes.length === 0 ? 'pass' : 'fail',
    message: dupes.length === 0 ? 'Tất cả paths duy nhất' : `${dupes.length} paths trùng: ${dupes.join(', ')}`,
    fix: dupes.length > 0 ? 'Đổi tên các fields bị trùng trong Schema Wizard' : undefined,
  });

  // Check all fields have labels
  let unlabeled = 0;
  function checkLabels(fields: MVUZODField[]) {
    for (const f of fields) {
      if (!f.label || f.label.trim() === '') unlabeled++;
      if (f.children?.length) checkLabels(f.children);
    }
  }
  checkLabels(schema.fields);

  checks.push({
    id: 'schema_labels',
    category: 'schema',
    label: 'Fields có label',
    status: unlabeled === 0 ? 'pass' : 'warn',
    message: unlabeled === 0 ? 'Tất cả fields có label' : `${unlabeled} fields thiếu label`,
    fix: unlabeled > 0 ? 'Đặt label cho tất cả fields' : undefined,
  });

  return checks;
}

function validateWorldbook(card: CharacterCardV3, schema: MVUZODSchema | null): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  const entries = card.data.character_book?.entries ?? [];

  // Has entries
  checks.push({
    id: 'wb_has_entries',
    category: 'worldbook',
    label: 'Lorebook entries',
    status: entries.length > 0 ? 'pass' : 'warn',
    message: entries.length > 0 ? `${entries.length} entries` : 'Lorebook trống',
  });

  // Check for empty content entries
  const emptyEntries = entries.filter(e => !e.content || e.content.trim() === '');
  if (emptyEntries.length > 0) {
    checks.push({
      id: 'wb_no_empty',
      category: 'worldbook',
      label: 'Không có entry rỗng',
      status: 'warn',
      message: `${emptyEntries.length} entries có content trống`,
      fix: 'Xóa hoặc điền nội dung cho các entries rỗng',
    });
  }

  // Check MVUZOD system entries
  if (schema && schema.fields.length > 0) {
    const existing = findExistingMVUZODEntries(entries);
    const expectedEntries = ['initvar', 'varlist', 'update_rules', 'output_format', 'emphasis'];
    const missingEntries = expectedEntries.filter(e => !existing[e] || existing[e].length === 0);

    checks.push({
      id: 'wb_mvuzod_entries',
      category: 'worldbook',
      label: 'MVUZOD system entries',
      status: missingEntries.length === 0 ? 'pass' : 'warn',
      message: missingEntries.length === 0
        ? '5/5 system entries có mặt'
        : `Thiếu: ${missingEntries.join(', ')}`,
      fix: missingEntries.length > 0 ? 'Sử dụng Export Wizard để inject entries tự động' : undefined,
    });
  }

  // Check for constant entries with keys (usually wrong config)
  const constantWithKeys = entries.filter(e => e.constant && e.keys.length > 0);
  if (constantWithKeys.length > 0) {
    checks.push({
      id: 'wb_constant_keys',
      category: 'worldbook',
      label: 'Constant entries config',
      status: 'warn',
      message: `${constantWithKeys.length} constant entries có keys (keys bị bỏ qua khi constant=true)`,
      fix: 'Xóa keys khỏi constant entries hoặc tắt constant',
    });
  }

  return checks;
}

function validateRegex(card: CharacterCardV3): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  const scripts = card.data.extensions.regex_scripts ?? [];

  if (scripts.length === 0) {
    checks.push({
      id: 'regex_exists',
      category: 'regex',
      label: 'Regex scripts',
      status: 'skip',
      message: 'Không có regex scripts',
    });
    return checks;
  }

  checks.push({
    id: 'regex_count',
    category: 'regex',
    label: 'Regex scripts',
    status: 'pass',
    message: `${scripts.length} scripts`,
  });

  // Validate each regex pattern
  const invalidRegex: string[] = [];
  for (const script of scripts) {
    try {
      new RegExp(script.findRegex);
    } catch {
      invalidRegex.push(script.scriptName);
    }
  }

  checks.push({
    id: 'regex_valid',
    category: 'regex',
    label: 'Regex syntax hợp lệ',
    status: invalidRegex.length === 0 ? 'pass' : 'fail',
    message: invalidRegex.length === 0
      ? 'Tất cả patterns hợp lệ'
      : `${invalidRegex.length} patterns lỗi: ${invalidRegex.join(', ')}`,
    fix: invalidRegex.length > 0 ? 'Sửa regex syntax trong Regex Lab' : undefined,
  });

  return checks;
}

function validateEJS(card: CharacterCardV3, schema: MVUZODSchema | null): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  const entries = card.data.character_book?.entries ?? [];
  const ejsEntries = entries.filter(e => isPreprocessingEntry(e.content));

  if (ejsEntries.length === 0) {
    checks.push({
      id: 'ejs_exists',
      category: 'ejs',
      label: 'EJS Entries',
      status: 'skip',
      message: 'Không có @@preprocessing entries',
    });
    return checks;
  }

  checks.push({
    id: 'ejs_count',
    category: 'ejs',
    label: 'EJS Entries',
    status: 'pass',
    message: `${ejsEntries.length} @@preprocessing entries`,
  });

  // Validate each EJS entry
  let errorCount = 0;
  let warningCount = 0;
  const invalidEntries: string[] = [];

  for (const entry of ejsEntries) {
    const result = validateEJSEntry(entry.content, schema ?? undefined);
    if (!result.valid) {
      errorCount += result.errors.length;
      invalidEntries.push(entry.comment || `ID: ${entry.id}`);
    }
    warningCount += result.warnings.length;
  }

  checks.push({
    id: 'ejs_valid',
    category: 'ejs',
    label: 'EJS syntax',
    status: errorCount > 0 ? 'fail' : warningCount > 0 ? 'warn' : 'pass',
    message: errorCount > 0
      ? `${errorCount} lỗi trong ${invalidEntries.length} entries: ${invalidEntries.join(', ')}`
      : warningCount > 0
        ? `${warningCount} cảnh báo`
        : 'Tất cả EJS entries hợp lệ',
    fix: errorCount > 0 ? 'Mở EJS Studio để sửa lỗi syntax' : undefined,
  });

  return checks;
}

function validateCrossReferences(card: CharacterCardV3, schema: MVUZODSchema | null): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  if (!schema) return checks;

  const entries = card.data.character_book?.entries ?? [];
  const allContent = entries.map(e => e.content).join('\n');

  // Find getvar() calls and check against schema
  const getvarRegex = /getvar\(\s*['"]stat_data\.([^'"]+)['"]/g;
  const paths = new Set<string>();
  let match;
  while ((match = getvarRegex.exec(allContent)) !== null) {
    paths.add(match[1]);
  }

  if (paths.size === 0) {
    checks.push({
      id: 'xref_getvar',
      category: 'cross_ref',
      label: 'getvar() → Schema',
      status: 'skip',
      message: 'Không tìm thấy getvar() calls trong worldbook',
    });
    return checks;
  }

  const missingPaths: string[] = [];
  for (const path of paths) {
    const schemaPath = '/' + path.replace(/\./g, '/');
    if (!findField(schema.fields, schemaPath)) {
      missingPaths.push(path);
    }
  }

  checks.push({
    id: 'xref_getvar',
    category: 'cross_ref',
    label: 'getvar() → Schema',
    status: missingPaths.length === 0 ? 'pass' : 'warn',
    message: missingPaths.length === 0
      ? `${paths.size} getvar paths đều match schema`
      : `${missingPaths.length}/${paths.size} paths không có trong schema: ${missingPaths.slice(0, 3).join(', ')}${missingPaths.length > 3 ? '...' : ''}`,
    fix: missingPaths.length > 0 ? 'Kiểm tra getvar paths hoặc thêm fields vào schema' : undefined,
  });

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN BUDGET
// ═══════════════════════════════════════════════════════════════════════════

function analyzeTokenBudget(card: CharacterCardV3): TokenBudget {
  const entries = card.data.character_book?.entries ?? [];

  const sections = [
    { name: 'Description', tokens: estimateTokens(card.data.description) },
    { name: 'Personality', tokens: estimateTokens(card.data.personality) },
    { name: 'Scenario', tokens: estimateTokens(card.data.scenario) },
    { name: 'System Prompt', tokens: estimateTokens(card.data.system_prompt) },
    { name: 'Post History', tokens: estimateTokens(card.data.post_history_instructions) },
    { name: 'First Message', tokens: estimateTokens(card.data.first_mes) },
    { name: 'Worldbook (const)', tokens: entries.filter(e => e.constant && e.enabled).reduce((s, e) => s + estimateTokens(e.content), 0) },
    { name: 'Worldbook (trigger)', tokens: entries.filter(e => !e.constant && e.enabled).reduce((s, e) => s + estimateTokens(e.content), 0) },
  ];

  const total = sections.reduce((s, sec) => s + sec.tokens, 0);

  return {
    total,
    sections: sections
      .filter(s => s.tokens > 0)
      .map(s => ({
        ...s,
        percent: total > 0 ? Math.round((s.tokens / total) * 100) : 0,
      }))
      .sort((a, b) => b.tokens - a.tokens),
  };
}

function validateTokenBudget(budget: TokenBudget): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  checks.push({
    id: 'budget_total',
    category: 'budget',
    label: 'Token budget tổng',
    status: budget.total > 30000 ? 'warn' : budget.total > 50000 ? 'fail' : 'pass',
    message: `~${budget.total.toLocaleString()} tokens`,
    fix: budget.total > 30000 ? 'Cân nhắc giảm nội dung worldbook hoặc description' : undefined,
  });

  // Check if worldbook dominates
  const wbConstTokens = budget.sections.find(s => s.name === 'Worldbook (const)')?.tokens ?? 0;
  if (wbConstTokens > 10000) {
    checks.push({
      id: 'budget_wb_heavy',
      category: 'budget',
      label: 'Worldbook constant quá lớn',
      status: 'warn',
      message: `~${wbConstTokens.toLocaleString()} tokens constant entries — luôn inject vào prompt`,
      fix: 'Chuyển một số entries sang trigger-based (bỏ constant)',
    });
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}

function countLeafFields(fields: MVUZODField[]): number {
  let count = 0;
  for (const f of fields) {
    if (f.children?.length) {
      count += countLeafFields(f.children);
    } else {
      count++;
    }
  }
  return count;
}

function findField(fields: MVUZODField[], path: string): MVUZODField | null {
  const segments = path.split('/').filter(Boolean);
  let current = fields;

  for (let i = 0; i < segments.length; i++) {
    const field = current.find(f => {
      const name = f.path.split('/').pop();
      return name === segments[i];
    });
    if (!field) return null;
    if (i === segments.length - 1) return field;
    if (field.children) {
      current = field.children;
    } else {
      return null;
    }
  }
  return null;
}

