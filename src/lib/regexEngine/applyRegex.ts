/**
 * src/lib/regexEngine/applyRegex.ts — Regex execution engine
 * Spec Phần 3.4, 3.9, 3.10: Apply regex scripts to text for live preview
 */

import type { RegexScript } from '../../types';

export interface RegexResult {
  original: string;
  result: string;
  matchCount: number;
  error?: string;
}

/**
 * Parse findRegex string → RegExp.
 * Handles both "/pattern/flags" format and plain strings.
 */
export function parseRegex(findRegex: string): RegExp {
  // "/pattern/flags" format
  const slashMatch = findRegex.match(/^\/(.+)\/([gimsuy]*)$/s);
  if (slashMatch) {
    return new RegExp(slashMatch[1], slashMatch[2]);
  }
  // Plain string — escape and use global + case-insensitive
  return new RegExp(escapeRegExp(findRegex), 'gi');
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply a single regex script to text.
 */
export function applyRegex(script: RegexScript, text: string): RegexResult {
  if (script.disabled || !script.findRegex) {
    return { original: text, result: text, matchCount: 0 };
  }

  try {
    const regex = parseRegex(script.findRegex);
    let matchCount = 0;
    const result = text.replace(regex, (...args) => {
      matchCount++;
      // Handle substituteRegex: 0=None, 1=Raw, 2=Escaped
      const replacement = script.replaceString;
      if (script.substituteRegex === 0) {
        // Standard replacement with group refs ($1, $2, etc.)
        return replacement.replace(/\$(\d+)/g, (_, n) => args[parseInt(n)] ?? '');
      }
      return replacement;
    });

    // Apply trimStrings
    let finalResult = result;
    for (const trim of script.trimStrings) {
      if (trim) {
        finalResult = finalResult.split(trim).join('');
      }
    }

    return { original: text, result: finalResult, matchCount };
  } catch (e) {
    return {
      original: text,
      result: text,
      matchCount: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Apply all enabled regex scripts to text (in order).
 */
export function applyAllRegex(scripts: RegexScript[], text: string): {
  result: string;
  steps: Array<{ scriptName: string; matchCount: number; error?: string }>;
} {
  let current = text;
  const steps: Array<{ scriptName: string; matchCount: number; error?: string }> = [];

  for (const script of scripts) {
    if (script.disabled) continue;
    const res = applyRegex(script, current);
    current = res.result;
    steps.push({ scriptName: script.scriptName, matchCount: res.matchCount, error: res.error });
  }

  return { result: current, steps };
}

/**
 * Validate a regex pattern string.
 */
export function validateRegex(findRegex: string): { valid: boolean; error?: string } {
  if (!findRegex) return { valid: false, error: 'Pattern trống' };
  try {
    parseRegex(findRegex);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}
