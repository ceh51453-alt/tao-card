/**
 * src/lib/completionVerifier/antiSummarization.ts — Enhanced Anti-Summarization
 * Spec Phần 7H.2: Detect summarization signals in AI-generated content
 */

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARIZATION SIGNALS
// ═══════════════════════════════════════════════════════════════════════════

const SUMMARIZATION_SIGNALS: Array<{ pattern: RegExp; label: string; weight: number }> = [
  { pattern: /\[\.{3}\]/, label: 'Ký hiệu [...]', weight: 0.2 },
  { pattern: /\(xem thêm\)/i, label: '"(xem thêm)"', weight: 0.2 },
  { pattern: /\(tiếp theo\)/i, label: '"(tiếp theo)"', weight: 0.15 },
  { pattern: /tương tự (như|với) (trên|trước)/i, label: '"tương tự như trước"', weight: 0.25 },
  { pattern: /như đã đề cập/i, label: '"như đã đề cập"', weight: 0.2 },
  { pattern: /v\.v\.|etc\.|và nhiều hơn nữa/i, label: '"v.v." / "etc."', weight: 0.2 },
  { pattern: /chi tiết ở entry/i, label: '"chi tiết ở entry"', weight: 0.25 },
  { pattern: /\[bỏ qua\]/i, label: '"[bỏ qua]"', weight: 0.3 },
  { pattern: /\[rút gọn\]/i, label: '"[rút gọn]"', weight: 0.3 },
  { pattern: /\.{3}/, label: 'Dấu "..."', weight: 0.1 },
  { pattern: /xem thêm ở/i, label: '"xem thêm ở"', weight: 0.2 },
  { pattern: /và nhiều .+ khác/i, label: '"và nhiều ... khác"', weight: 0.15 },
  { pattern: /tương tự entry/i, label: '"tương tự entry"', weight: 0.25 },
  { pattern: /giữ nguyên phần trên/i, label: '"giữ nguyên phần trên"', weight: 0.3 },
  { pattern: /same as before/i, label: '"same as before"', weight: 0.3 },
];

// ═══════════════════════════════════════════════════════════════════════════
// CHECKER
// ═══════════════════════════════════════════════════════════════════════════

export interface AntiSummarizationResult {
  isSummarized: boolean;
  warnings: string[];
  score: number;           // 0.0 = ok, 1.0 = definitely summarized
}

/**
 * Check if content shows signs of AI summarization.
 * @param newContent — the new content to check
 * @param originalContent — (optional) original content to compare length ratio
 */
export function checkAntiSummarization(
  newContent: string,
  originalContent?: string,
): AntiSummarizationResult {
  const warnings: string[] = [];
  let score = 0;

  // Pattern detection
  for (const signal of SUMMARIZATION_SIGNALS) {
    if (signal.pattern.test(newContent)) {
      warnings.push(`Tín hiệu tóm tắt: ${signal.label}`);
      score += signal.weight;
    }
  }

  // Length ratio check (if original provided)
  if (originalContent) {
    const ratio = newContent.length / Math.max(originalContent.length, 1);
    if (ratio < 0.6) {
      warnings.push(`⚠️ Content mới ngắn hơn ${((1 - ratio) * 100).toFixed(0)}% so với bản cũ`);
      score += 0.4;
    } else if (ratio < 0.8) {
      warnings.push(`Content mới ngắn hơn ${((1 - ratio) * 100).toFixed(0)}% so với bản cũ`);
      score += 0.15;
    }
  }

  // Min length check
  if (newContent.length < 50) {
    warnings.push(`Quá ngắn (${newContent.length} chars)`);
    score += 0.3;
  } else if (newContent.length < 80) {
    warnings.push(`Khá ngắn (${newContent.length} chars)`);
    score += 0.1;
  }

  return {
    isSummarized: score >= 0.4,
    warnings,
    score: Math.min(score, 1),
  };
}

/**
 * Quick check for update_entry actions — warns if content got much shorter
 */
export function checkUpdateShrinkage(
  newContent: string,
  originalContent: string,
): { shouldWarn: boolean; message: string } {
  const ratio = newContent.length / Math.max(originalContent.length, 1);
  if (ratio < 0.6) {
    return {
      shouldWarn: true,
      message: `⚠️ Content mới ngắn hơn đáng kể (${((1 - ratio) * 100).toFixed(0)}% shorter). Kiểm tra kỹ trước khi áp dụng.`,
    };
  }
  return { shouldWarn: false, message: '' };
}
