/**
 * src/lib/regexEngine/regexValidator.ts — ReplaceString Syntax Validator
 * Guide §7: JS syntax check, HTML tag balance check, capture group sanitization.
 */

import type { ValidationIssue, ReplaceStringValidation } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a replaceString — runs both JS and HTML checks.
 */
export function validateReplaceString(content: string): ReplaceStringValidation {
  const jsIssues = validateJSSyntax(content);
  const htmlIssues = validateHTMLBalance(content);

  return {
    valid: ![...jsIssues, ...htmlIssues].some(i => i.type === 'error'),
    jsIssues,
    htmlIssues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// JS SYNTAX VALIDATION — Guide §7.1
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract and validate JS syntax within <script> blocks.
 * Sanitizes capture groups and template vars before checking.
 */
export function validateJSSyntax(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Extract all <script> blocks
  const scriptBlocks: string[] = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(content)) !== null) {
    scriptBlocks.push(match[1]);
  }

  if (scriptBlocks.length === 0) return issues;

  for (let i = 0; i < scriptBlocks.length; i++) {
    const block = scriptBlocks[i];
    const sanitized = sanitizeForSyntaxCheck(block);

    try {
      // Use new Function() to check syntax (does not execute)
      new Function(sanitized);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      issues.push({
        type: 'error',
        message: `Script block ${i + 1}: ${msg}`,
      });
    }

    // Check for common issues
    if (block.includes('eval(')) {
      issues.push({ type: 'warning', message: `Script block ${i + 1}: Sử dụng eval() — có thể gây vấn đề bảo mật` });
    }

    if (block.includes('document.write')) {
      issues.push({ type: 'warning', message: `Script block ${i + 1}: Sử dụng document.write — có thể ghi đè toàn bộ trang` });
    }
  }

  // Check bracket balance across all script blocks
  const allScript = scriptBlocks.join('\n');
  const openBraces = (allScript.match(/{/g) ?? []).length;
  const closeBraces = (allScript.match(/}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      type: 'warning',
      message: `Braces không cân: ${openBraces} mở, ${closeBraces} đóng`,
    });
  }

  const openParens = (allScript.match(/\(/g) ?? []).length;
  const closeParens = (allScript.match(/\)/g) ?? []).length;
  if (openParens !== closeParens) {
    issues.push({
      type: 'warning',
      message: `Parentheses không cân: ${openParens} mở, ${closeParens} đóng`,
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML TAG BALANCE — Guide §7.2
// ═══════════════════════════════════════════════════════════════════════════

/** Self-closing tags that don't need a closing counterpart */
const SELF_CLOSING_TAGS = new Set([
  'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base',
  'col', 'embed', 'source', 'track', 'wbr',
]);

/**
 * Check HTML tag balance in the content.
 * Warns if open/close tag counts differ by more than 2.
 */
export function validateHTMLBalance(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Remove script/style content to avoid false positives from JS template strings
  const stripped = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<%[\s\S]*?%>/g, '');

  // Count open tags (not self-closing)
  const openTagRegex = /<([a-zA-Z][\w-]*)[^>]*(?<!\/)>/g;
  const closeTagRegex = /<\/([a-zA-Z][\w-]*)>/g;

  const openCounts = new Map<string, number>();
  const closeCounts = new Map<string, number>();

  let m: RegExpExecArray | null;

  while ((m = openTagRegex.exec(stripped)) !== null) {
    const tag = m[1].toLowerCase();
    if (!SELF_CLOSING_TAGS.has(tag)) {
      openCounts.set(tag, (openCounts.get(tag) ?? 0) + 1);
    }
  }

  while ((m = closeTagRegex.exec(stripped)) !== null) {
    const tag = m[1].toLowerCase();
    closeCounts.set(tag, (closeCounts.get(tag) ?? 0) + 1);
  }

  // Check each tag
  const allTags = new Set([...openCounts.keys(), ...closeCounts.keys()]);
  let totalDiff = 0;

  for (const tag of allTags) {
    const opens = openCounts.get(tag) ?? 0;
    const closes = closeCounts.get(tag) ?? 0;
    const diff = Math.abs(opens - closes);
    totalDiff += diff;

    if (diff > 0) {
      if (opens > closes) {
        issues.push({
          type: diff > 2 ? 'error' : 'warning',
          message: `<${tag}>: ${opens} mở, ${closes} đóng (thiếu ${diff} closing tag)`,
        });
      } else {
        issues.push({
          type: diff > 2 ? 'error' : 'warning',
          message: `<${tag}>: ${opens} mở, ${closes} đóng (thừa ${diff} closing tag)`,
        });
      }
    }
  }

  if (totalDiff > 2) {
    issues.push({
      type: 'error',
      message: `HTML tag mismatch tổng: chênh lệch ${totalDiff} tags`,
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS — Guide §7.1
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanitize script content before syntax checking.
 * Replaces capture groups and template vars with safe placeholder strings.
 */
function sanitizeForSyntaxCheck(scriptContent: string): string {
  return scriptContent
    .replace(/\$(\d+)/g, '"__CAPTURE_$1__"')       // $1, $2, ... → string literal
    .replace(/\$&/g, '"__CAPTURE_FULL__"')          // $& → string literal
    .replace(/\{\{[^}]+\}\}/g, '"__TEMPLATE__"')    // {{var}} → string literal
    .replace(/getvar\(/g, '(function(){return "";})(')  // getvar() → safe call
    .replace(/setvar\(/g, '(function(){return "";})('); // setvar() → safe call
}
