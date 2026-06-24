/**
 * src/lib/rag/ragContextBuilder.ts — Build RAG injection text for AI prompts
 * Spec Phần 9B.2: buildRAGContext with negatives + style reference
 */

import { TFIDFIndex, type RAGSearchResult } from './tfidfIndexer';

export interface RAGContextOptions {
  topK?: number;
  includeNegatives?: boolean;
  maxTokensForContext?: number;
}

export interface RAGContext {
  injectionText: string;
  relevantEntries: RAGSearchResult[];
  tokenEstimate: number;
}

/**
 * Build RAG context string for injection into AI prompts.
 * Includes:
 * - Negative list (entries to NOT recreate)
 * - Style reference (content samples from similar entries)
 */
export function buildRAGContext(
  query: string,
  index: TFIDFIndex,
  options: RAGContextOptions = {},
): RAGContext {
  const { topK = 5, includeNegatives = true, maxTokensForContext = 1000 } = options;

  if (!index.isIndexed || index.size === 0) {
    return { injectionText: '', relevantEntries: [], tokenEstimate: 0 };
  }

  const relevant = index.search(query, { topK });
  const parts: string[] = [];

  // Negative examples (entries to NOT recreate)
  if (includeNegatives && relevant.length > 0) {
    const negLines = relevant.slice(0, 10).map(r =>
      `  - "${r.entry.comment}" [${(r.score * 100).toFixed(0)}%] keys: [${r.entry.keys.slice(0, 3).join(', ')}]`
    );
    parts.push(`=== ENTRIES CÓ THỂ TRÙNG (KHÔNG TẠO LẠI) ===\n${negLines.join('\n')}`);
  }

  // Style reference (content samples from top matches)
  if (relevant.length > 0) {
    const relLines = relevant.slice(0, 3).map(r =>
      `  - "${r.entry.comment}": ${r.entry.content.slice(0, 120)}...`
    );
    parts.push(`=== ENTRIES LIÊN QUAN (THAM KHẢO PHONG CÁCH) ===\n${relLines.join('\n')}`);
  }

  const injectionText = parts.join('\n\n');
  const tokenEstimate = Math.ceil(injectionText.length / 4);

  // Truncate if exceeds token budget
  if (tokenEstimate > maxTokensForContext && injectionText.length > 0) {
    const maxChars = maxTokensForContext * 4;
    return {
      injectionText: injectionText.slice(0, maxChars) + '\n[...đã cắt bớt do giới hạn token]',
      relevantEntries: relevant,
      tokenEstimate: maxTokensForContext,
    };
  }

  return { injectionText, relevantEntries: relevant, tokenEstimate };
}
