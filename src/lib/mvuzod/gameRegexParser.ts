/**
 * src/lib/mvuzod/gameRegexParser.ts — Parser + Validator cho AI-generated Regex Scripts
 * Dùng bởi GameFrontendPreview khi parse response từ AI.
 */

import type { RegexScript, RegexPlacement } from '../../types';
import { parseRegex } from '../regexEngine/applyRegex';

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ParsedGameRegex {
  scripts: Omit<RegexScript, 'id'>[];
  explanation: string;
}

export interface ValidationIssue {
  index: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ─── PARSER ─────────────────────────────────────────────────────────────────

/**
 * Parse AI response text into structured regex scripts.
 * Handles: direct JSON, fenced JSON (```json...```), and JSON object extraction.
 */
export function parseGameRegexResponse(text: string): ParsedGameRegex {
  const trimmed = text.trim();

  // Try multiple extraction strategies
  const strategies = [
    () => JSON.parse(trimmed),
    () => {
      const fence = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/);
      if (!fence) throw new Error('No fenced JSON');
      return JSON.parse(fence[1].trim());
    },
    () => {
      const objMatch = trimmed.match(/\{[\s\S]+\}/);
      if (!objMatch) throw new Error('No JSON object');
      return JSON.parse(objMatch[0]);
    },
    () => {
      // Try fixing common AI JSON issues: trailing commas, single quotes
      const objMatch = trimmed.match(/\{[\s\S]+\}/);
      if (!objMatch) throw new Error('No JSON object');
      const fixed = objMatch[0]
        .replace(/,\s*([}\]])/g, '$1')     // trailing commas
        .replace(/'/g, '"');                 // single quotes → double
      return JSON.parse(fixed);
    },
  ];

  let parsed: unknown = null;
  let lastError: Error | null = null;

  for (const strategy of strategies) {
    try {
      parsed = strategy();
      break;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (!parsed) {
    throw new Error(`Không thể parse JSON từ phản hồi AI: ${lastError?.message ?? 'Unknown error'}`);
  }

  return normalizeResponse(parsed);
}

/**
 * Normalize parsed JSON into our expected structure.
 */
function normalizeResponse(raw: unknown): ParsedGameRegex {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Phản hồi AI không phải object');
  }

  const obj = raw as Record<string, unknown>;

  // Handle both { scripts: [...] } and direct [...]
  let scriptsRaw: unknown[];
  if (Array.isArray(obj.scripts)) {
    scriptsRaw = obj.scripts;
  } else if (Array.isArray(raw)) {
    scriptsRaw = raw as unknown[];
  } else {
    throw new Error('Phản hồi AI thiếu mảng "scripts"');
  }

  const scripts = scriptsRaw.map(normalizeScript).filter(Boolean) as Omit<RegexScript, 'id'>[];

  if (scripts.length === 0) {
    throw new Error('AI không tạo được script nào hợp lệ');
  }

  return {
    scripts,
    explanation: typeof obj.explanation === 'string' ? obj.explanation : '',
  };
}

/**
 * Normalize a single script object from AI response.
 */
function normalizeScript(raw: unknown): Omit<RegexScript, 'id'> | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const s = raw as Record<string, unknown>;

  // Required fields
  if (typeof s.scriptName !== 'string' || !s.scriptName.trim()) return null;
  if (typeof s.findRegex !== 'string' || !s.findRegex.trim()) return null;
  if (typeof s.replaceString !== 'string' && s.replaceString !== '') return null;

  // Normalize placement
  let placement = [2] as RegexPlacement[];
  if (Array.isArray(s.placement)) {
    const filtered = s.placement.filter(p => typeof p === 'number' && p >= 1 && p <= 5) as RegexPlacement[];
    if (filtered.length > 0) placement = filtered;
  }

  // Normalize substituteRegex
  let substituteRegex: 0 | 1 | 2 = 0;
  if (s.substituteRegex === 1 || s.substituteRegex === 2) {
    substituteRegex = s.substituteRegex;
  }

  return {
    scriptName: String(s.scriptName).trim(),
    findRegex: String(s.findRegex).trim(),
    replaceString: String(s.replaceString ?? ''),
    trimStrings: Array.isArray(s.trimStrings)
      ? s.trimStrings.filter(t => typeof t === 'string') as string[]
      : [],
    placement,
    disabled: s.disabled === true,
    markdownOnly: s.markdownOnly === true,
    promptOnly: s.promptOnly === true,
    runOnEdit: s.runOnEdit === true,
    substituteRegex,
    minDepth: typeof s.minDepth === 'number' ? s.minDepth : null,
    maxDepth: typeof s.maxDepth === 'number' ? s.maxDepth : null,
  };
}

// ─── VALIDATOR ──────────────────────────────────────────────────────────────

/**
 * Validate an array of parsed regex scripts.
 */
export function validateGameRegexScripts(
  scripts: Omit<RegexScript, 'id'>[]
): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];

    // Validate regex pattern
    try {
      parseRegex(s.findRegex);
    } catch (e) {
      issues.push({
        index: i,
        field: 'findRegex',
        message: `Regex không hợp lệ: ${e instanceof Error ? e.message : String(e)}`,
        severity: 'error',
      });
    }

    // Warn about markdownOnly + promptOnly both true
    if (s.markdownOnly && s.promptOnly) {
      issues.push({
        index: i,
        field: 'markdownOnly/promptOnly',
        message: 'markdownOnly và promptOnly đều true — vô nghĩa, script sẽ không hoạt động',
        severity: 'error',
      });
    }

    // Warn about empty replaceString with markdownOnly (might be intentional for hiding)
    if (s.markdownOnly && s.replaceString === '' && !s.scriptName.toLowerCase().includes('ẩn')) {
      issues.push({
        index: i,
        field: 'replaceString',
        message: 'replaceString rỗng với markdownOnly=true — sẽ ẩn nội dung match khỏi UI',
        severity: 'warning',
      });
    }

    // Validate placement range
    for (const p of s.placement) {
      if (p < 1 || p > 5) {
        issues.push({
          index: i,
          field: 'placement',
          message: `Placement ${p} ngoài phạm vi hợp lệ (1-5)`,
          severity: 'error',
        });
      }
    }

    // Check empty scriptName
    if (!s.scriptName.trim()) {
      issues.push({
        index: i,
        field: 'scriptName',
        message: 'Tên script trống',
        severity: 'error',
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

// ─── JSON REPAIR FOR CONTINUATION ───────────────────────────────────────────

/**
 * Repair concatenated JSON chunks from multi-call AI responses.
 * Handles: duplicate fragments, unclosed brackets, trailing commas.
 */
export function repairConcatenatedJson(chunks: string[]): string {
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0];

  // Strategy 1: Try the full concatenation first (AI might have continued perfectly)
  let combined = chunks.join('');

  // Try parse directly
  try {
    JSON.parse(combined);
    return combined;
  } catch { /* continue repair */ }

  // Strategy 2: Extract JSON object from the combined text
  const objMatch = combined.match(/\{[\s\S]+\}/);
  if (objMatch) {
    try {
      JSON.parse(objMatch[0]);
      return objMatch[0];
    } catch { /* continue */ }
  }

  // Strategy 3: Smart merge — find overlap between chunks and deduplicate
  combined = smartMergeChunks(chunks);

  // Strategy 4: Fix common structural issues
  combined = fixJsonStructure(combined);

  return combined;
}

/**
 * Smart merge: detect if AI repeated part of previous output and deduplicate.
 */
function smartMergeChunks(chunks: string[]): string {
  let result = chunks[0];

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Check if chunk starts with content that overlaps with end of result
    // Look for overlap in the last 200 chars of result vs first 200 chars of chunk
    const overlapWindow = Math.min(200, result.length, chunk.length);
    let bestOverlap = 0;

    for (let len = 10; len <= overlapWindow; len++) {
      const tail = result.slice(-len);
      if (chunk.startsWith(tail)) {
        bestOverlap = len;
      }
    }

    if (bestOverlap > 10) {
      // Found overlap — skip the duplicated part
      result += chunk.slice(bestOverlap);
    } else {
      result += chunk;
    }
  }

  return result;
}

/**
 * Fix common JSON structural issues in concatenated responses.
 */
function fixJsonStructure(text: string): string {
  let fixed = text.trim();

  // Remove markdown fences
  fixed = fixed.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/, '');
  fixed = fixed.trim();

  // Fix trailing commas before closing brackets
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  // Count open/close braces and brackets
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of fixed) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  // Close unclosed brackets/braces
  // Remove any trailing comma before we close
  fixed = fixed.replace(/,\s*$/, '');

  while (brackets > 0) { fixed += ']'; brackets--; }
  while (braces > 0) { fixed += '}'; braces--; }

  return fixed;
}

/**
 * Count approximate number of scripts in a partial/incomplete JSON response.
 * Uses "scriptName" field occurrences as a proxy.
 */
export function countScriptsInPartial(text: string): number {
  const matches = text.match(/"scriptName"\s*:\s*"/g);
  return matches ? matches.length : 0;
}

/**
 * Get expected script count range for a component type.
 */
export function getExpectedScriptCount(component: string): { min: number; max: number } {
  switch (component) {
    case 'status_bar': return { min: 2, max: 4 };
    case 'opening_form': return { min: 2, max: 3 };
    case 'game_screen': return { min: 3, max: 5 };
    case 'full_set': return { min: 6, max: 15 };
    case 'free_form': return { min: 1, max: 20 };
    default: return { min: 1, max: 10 };
  }
}
