/**
 * src/lib/mvuzod/patchExtractor.ts — Extract JSON Patch ops from AI response
 * Spec 9C: Parse both XML <UpdateVariable> tags and ```mvuzod code fences
 * When both present, prioritize XML, skip fence to avoid duplicates
 */

import type { JSONPatchOp } from '../../types/mvuzod.types';

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract JSON Patch operations from AI response text.
 * Supports two formats:
 * 1. XML: <UpdateVariable>[...ops...]</UpdateVariable>
 * 2. Code fence: ```mvuzod [...ops...] ```
 * When both present, XML takes priority.
 */
export function extractPatches(aiResponse: string): {
  ops: JSONPatchOp[];
  source: 'xml' | 'fence' | 'none';
  raw: string;
} {
  // Try XML format first
  const xmlMatch = aiResponse.match(/<UpdateVariable>([\s\S]+?)<\/UpdateVariable>/i);
  if (xmlMatch) {
    const parsed = tryParseOps(xmlMatch[1].trim());
    if (parsed.length > 0) {
      return { ops: parsed, source: 'xml', raw: xmlMatch[1].trim() };
    }
  }

  // Fallback: try code fence
  const fenceMatch = aiResponse.match(/```mvuzod\s*([\s\S]+?)```/i);
  if (fenceMatch) {
    const parsed = tryParseOps(fenceMatch[1].trim());
    if (parsed.length > 0) {
      return { ops: parsed, source: 'fence', raw: fenceMatch[1].trim() };
    }
  }

  // Also try generic JSON array at end of response
  const jsonArrayMatch = aiResponse.match(/\[\s*\{[\s\S]*"op"\s*:\s*"[\s\S]*\}\s*\]\s*$/);
  if (jsonArrayMatch) {
    const parsed = tryParseOps(jsonArrayMatch[0]);
    if (parsed.length > 0) {
      return { ops: parsed, source: 'fence', raw: jsonArrayMatch[0] };
    }
  }

  return { ops: [], source: 'none', raw: '' };
}

/**
 * Try to parse a string as JSON array of patch operations.
 */
function tryParseOps(raw: string): JSONPatchOp[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidOp);
  } catch {
    // Try to fix common issues: trailing commas, single quotes
    const fixed = raw
      .replace(/,\s*]/g, ']')           // trailing comma
      .replace(/'/g, '"')                // single → double quotes
      .replace(/(\w+)\s*:/g, '"$1":');   // unquoted keys
    try {
      const parsed = JSON.parse(fixed);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidOp);
    } catch {
      return [];
    }
  }
}

/**
 * Validate a single patch operation.
 */
function isValidOp(op: unknown): op is JSONPatchOp {
  if (typeof op !== 'object' || op === null) return false;
  const o = op as Record<string, unknown>;
  if (typeof o.op !== 'string') return false;

  const validOps = ['replace', 'delta', 'insert', 'remove', 'move'];
  if (!validOps.includes(o.op)) return false;

  // All ops need path (except move needs from+to)
  if (o.op === 'move') {
    return typeof o.from === 'string' && typeof o.to === 'string';
  }

  if (typeof o.path !== 'string') return false;

  // delta must have numeric value
  if (o.op === 'delta' && typeof o.value !== 'number') return false;

  // replace and insert need value
  if ((o.op === 'replace' || o.op === 'insert') && o.value === undefined) return false;

  return true;
}

/**
 * Strip UpdateVariable blocks from AI response text (for display).
 */
export function stripPatchBlocks(text: string): string {
  return text
    .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi, '')
    .replace(/```mvuzod[\s\S]*?```/gi, '')
    .trim();
}
