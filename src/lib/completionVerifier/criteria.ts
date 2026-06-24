/**
 * src/lib/completionVerifier/criteria.ts — Completion Verification Types
 * Spec Phần 7F.2: CompletionCriteria, VerificationReport
 */

export interface RequiredTopic {
  topic: string;
  keywords: string[];
  minEntries?: number;
}

export interface CompletionCriteria {
  enabled: boolean;
  minEntryCount?: number;
  minContentLengthPerEntry?: number;
  maxDuplicateRatio?: number;        // default 0.05
  requiredTopics?: RequiredTopic[];
  coherenceCheck?: boolean;
  coherenceThreshold?: number;       // default 0.7
  maxVerifyLoops?: number;           // default 3
  maxFillInBatchesPerLoop?: number;  // default 5
}

export interface VerificationCheck {
  criteria: string;
  passed: boolean;
  detail: string;
  gap?: string;
}

export interface VerificationReport {
  passed: boolean;
  loopsDone: number;
  checks: VerificationCheck[];
  addedEntries: number;
}

export const DEFAULT_CRITERIA: CompletionCriteria = {
  enabled: false,
  minEntryCount: 10,
  minContentLengthPerEntry: 100,
  maxDuplicateRatio: 0.05,
  requiredTopics: [],
  coherenceCheck: false,
  coherenceThreshold: 0.7,
  maxVerifyLoops: 3,
  maxFillInBatchesPerLoop: 5,
};
