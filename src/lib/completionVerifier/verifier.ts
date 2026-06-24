/**
 * src/lib/completionVerifier/verifier.ts — Completion Verification Loop
 * Spec Phần 7F.3: runChecks, gap detection, fill-in batches, coherence check
 */

import type { LorebookEntry, ProxyProfile, GenerationParams, ChatMessage, CharacterCardV3 } from '../../types';
import type { CompletionCriteria, VerificationReport, VerificationCheck } from './criteria';
import type { BatchGenConfig, BatchRunContext } from '../ai/batchGenerator';
import { runBatchGeneration } from '../ai/batchGenerator';
import { callAI } from '../ai/client';
import { checkContentSimilarity } from '../ai/deduplicator';

// ═══════════════════════════════════════════════════════════════════════════
// CHECKS
// ═══════════════════════════════════════════════════════════════════════════

export function runChecks(entries: LorebookEntry[], criteria: CompletionCriteria): VerificationCheck[] {
  const checks: VerificationCheck[] = [];

  // 1. Min entry count
  if (criteria.minEntryCount !== undefined) {
    const passed = entries.length >= criteria.minEntryCount;
    checks.push({
      criteria: 'minEntryCount',
      passed,
      detail: `${entries.length}/${criteria.minEntryCount} entries`,
      gap: passed ? undefined : `Cần thêm ${criteria.minEntryCount - entries.length} entry`,
    });
  }

  // 2. Min content length
  if (criteria.minContentLengthPerEntry !== undefined) {
    const short = entries.filter(e => e.content.length < criteria.minContentLengthPerEntry!);
    const passed = short.length === 0;
    checks.push({
      criteria: 'minContentLength',
      passed,
      detail: passed ? 'Tất cả entries đủ dài' : `${short.length} entry quá ngắn`,
      gap: short.length > 0
        ? `Entries cần bổ sung nội dung: ${short.slice(0, 5).map(e => `"${e.comment}" (${e.content.length} chars)`).join(', ')}`
        : undefined,
    });
  }

  // 3. Duplicate ratio
  if (criteria.maxDuplicateRatio !== undefined) {
    let dupCount = 0;
    for (let i = 0; i < entries.length; i++) {
      const others = entries.filter((_, j) => j !== i);
      const check = checkContentSimilarity(entries[i].content, others, 0.7);
      if (check.isDuplicate) dupCount++;
    }
    // Limit check to first 100 entries to avoid O(n²) blowup
    const checkedCount = Math.min(entries.length, 100);
    const ratio = checkedCount > 0 ? dupCount / checkedCount : 0;
    const passed = ratio <= criteria.maxDuplicateRatio;
    checks.push({
      criteria: 'duplicateRatio',
      passed,
      detail: `${(ratio * 100).toFixed(1)}% trùng lặp (giới hạn: ${(criteria.maxDuplicateRatio * 100).toFixed(1)}%)`,
      gap: passed ? undefined : `${dupCount} entries bị trùng lặp nội dung, cần entries mới hoàn toàn`,
    });
  }

  // 4. Required topics
  for (const topic of criteria.requiredTopics ?? []) {
    const relevant = entries.filter(e =>
      topic.keywords.some(kw =>
        e.content.toLowerCase().includes(kw.toLowerCase()) ||
        e.keys.some(k => k.toLowerCase().includes(kw.toLowerCase())) ||
        e.comment.toLowerCase().includes(kw.toLowerCase())
      )
    );
    const min = topic.minEntries ?? 1;
    const passed = relevant.length >= min;
    checks.push({
      criteria: `topic:${topic.topic}`,
      passed,
      detail: `${relevant.length}/${min} entries về "${topic.topic}"`,
      gap: passed ? undefined : `Thiếu thông tin về: ${topic.topic} (keywords: ${topic.keywords.join(', ')})`,
    });
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// COHERENCE CHECK (AI-based, costs extra API call)
// ═══════════════════════════════════════════════════════════════════════════

async function runCoherenceCheck(
  entries: LorebookEntry[],
  profile: ProxyProfile,
  params: GenerationParams,
): Promise<number> {
  if (entries.length < 3) return 1.0;

  // Sample max 20 entries for coherence check
  const sampled = entries.length > 20
    ? entries.sort(() => Math.random() - 0.5).slice(0, 20)
    : entries;

  const entrySummary = sampled.map(e =>
    `- "${e.comment}": ${e.content.slice(0, 150)}`
  ).join('\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Bạn là chuyên gia đánh giá tính nhất quán (coherence) của Lorebook entries.
Phân tích danh sách entries và cho điểm từ 0.0 đến 1.0:
- 1.0: Hoàn toàn nhất quán (tên, số liệu, mối quan hệ, timeline)
- 0.7: Khá nhất quán, có vài chi tiết nhỏ không khớp
- 0.5: Trung bình, có mâu thuẫn đáng chú ý
- 0.3: Nhiều mâu thuẫn
- 0.0: Hoàn toàn không nhất quán

CHỈ trả về MỘT SỐ THỰC từ 0.0 đến 1.0, KHÔNG giải thích.`,
    },
    {
      role: 'user',
      content: `Đánh giá tính nhất quán của ${sampled.length} entries sau:\n\n${entrySummary}`,
    },
  ];

  try {
    const raw = await callAI({ profile, params, messages });
    const score = parseFloat(raw.text.trim());
    if (!isNaN(score) && score >= 0 && score <= 1) return score;
    return 0.7; // Fallback
  } catch {
    return 0.7; // Fallback on error
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN VERIFICATION LOOP
// ═══════════════════════════════════════════════════════════════════════════

export interface VerificationContext {
  card: CharacterCardV3;
  profile: ProxyProfile;
  generationParams: GenerationParams;
  stopped: boolean;
  log: (msg: string) => void;
  onReport: (report: VerificationReport) => void;
  appendEntry: (entry: LorebookEntry) => void;
}

export async function runWithVerification(
  config: BatchGenConfig,
  criteria: CompletionCriteria,
  ctx: VerificationContext,
): Promise<VerificationReport> {
  const maxLoops = criteria.maxVerifyLoops ?? 3;
  const report: VerificationReport = {
    passed: false,
    loopsDone: 0,
    checks: [],
    addedEntries: 0,
  };

  ctx.log('🎯 Bắt đầu Completion Verification...');

  for (let loop = 0; loop < maxLoops; loop++) {
    if (ctx.stopped) break;

    report.loopsDone = loop + 1;
    const entries = ctx.card.data.character_book?.entries ?? [];
    const checks = runChecks(entries, criteria);

    // Coherence check (optional, extra API call)
    if (criteria.coherenceCheck) {
      ctx.log('🧠 Kiểm tra Coherence bằng AI...');
      const score = await runCoherenceCheck(entries, ctx.profile, ctx.generationParams);
      const threshold = criteria.coherenceThreshold ?? 0.7;
      checks.push({
        criteria: 'coherence',
        passed: score >= threshold,
        detail: `Điểm nhất quán: ${(score * 100).toFixed(0)}%`,
        gap: score < threshold ? 'Entries thiếu tính nhất quán timeline/logic' : undefined,
      });
    }

    report.checks = checks;
    ctx.onReport({ ...report });

    // Log check results
    for (const c of checks) {
      ctx.log(`${c.passed ? '✅' : '❌'} [${c.criteria}]: ${c.detail}`);
    }

    // All passed?
    if (checks.every(c => c.passed)) {
      report.passed = true;
      ctx.log('🏆 Tất cả tiêu chí ĐẠT!');
      break;
    }

    // Find gaps and fill
    const gaps = checks.filter(c => !c.passed && c.gap).map(c => c.gap!);
    if (gaps.length === 0) {
      ctx.log('⚠️ Có tiêu chí không đạt nhưng không tìm được khoảng trống cụ thể.');
      break;
    }

    ctx.log(`🔍 Loop ${loop + 1}: ${gaps.length} khoảng trống, bổ sung...`);
    const fillPrompt = `${config.topicPrompt}\n\n### BỔ SUNG (CÁC KHOẢNG TRỐNG PHÁT HIỆN)\n${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}`;

    const fillCount = Math.min(
      gaps.length * (config.entriesPerBatch || 3),
      (criteria.maxFillInBatchesPerLoop ?? 5) * (config.entriesPerBatch || 3),
    );

    const fillConfig: BatchGenConfig = {
      ...config,
      topicPrompt: fillPrompt,
      totalEntries: fillCount,
    };

    // Create a batch context that wraps the verification context
    const batchCtx: BatchRunContext = {
      card: ctx.card,
      profile: ctx.profile,
      generationParams: ctx.generationParams,
      paused: false,
      get stopped() { return ctx.stopped; },
      log: ctx.log,
      onProgress: () => {},
      appendEntry: (entry) => {
        ctx.appendEntry(entry);
        report.addedEntries++;
      },
    };

    await runBatchGeneration(fillConfig, batchCtx);
  }

  ctx.onReport({ ...report });
  ctx.log(`\n📋 Verification Report: ${report.passed ? 'PASS ✅' : 'FAIL ❌'} (${report.loopsDone} loops, +${report.addedEntries} entries)`);
  return report;
}
