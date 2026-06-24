/**
 * src/lib/rag/tfidfIndexer.ts — TF-IDF In-Browser RAG Engine
 * Spec Phần 9B.1: TF-IDF index, cosine similarity, no external deps
 */

import type { LorebookEntry } from '../../types';

export interface RAGSearchResult {
  entry: LorebookEntry;
  score: number;
}

export class TFIDFIndex {
  private entries: Array<{ id: number; comment: string; vector: Map<string, number> }> = [];
  private idf = new Map<string, number>();
  private _source: LorebookEntry[] = [];
  private _indexed = false;

  get isIndexed() { return this._indexed; }
  get size() { return this._source.length; }

  /**
   * Index entries — rebuilds the entire index.
   * For batch operations, call once after adding a batch of entries.
   */
  indexWithSource(entries: LorebookEntry[]): void {
    this._source = [...entries];
    this.entries = [];
    this.idf.clear();

    if (entries.length === 0) {
      this._indexed = true;
      return;
    }

    const df = new Map<string, number>();
    const docs = entries.map(entry => {
      const text = [
        entry.comment,
        ...entry.keys,
        entry.content,
      ].join(' ').toLowerCase().replace(/[^\p{L}\w\s]/gu, ' ').replace(/\s+/g, ' ').trim();

      const terms = text.split(' ').filter(t => t.length > 1);
      const uniqueTerms = new Set(terms);
      uniqueTerms.forEach(t => df.set(t, (df.get(t) ?? 0) + 1));
      return { entry, terms };
    });

    const N = entries.length;
    df.forEach((freq, term) => {
      this.idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);
    });

    for (const { entry, terms } of docs) {
      const tf = new Map<string, number>();
      terms.forEach(t => tf.set(t, (tf.get(t) ?? 0) + 1));
      const vector = new Map<string, number>();
      tf.forEach((count, term) => {
        vector.set(term, (count / terms.length) * (this.idf.get(term) ?? 0));
      });
      this.entries.push({ id: entry.id, comment: entry.comment, vector });
    }

    this._indexed = true;
  }

  /**
   * Search for entries similar to query string.
   * Returns top-K results sorted by cosine similarity.
   */
  search(query: string, options: { topK?: number } = {}): RAGSearchResult[] {
    const { topK = 5 } = options;
    if (this.entries.length === 0) return [];

    const qTerms = query.toLowerCase()
      .replace(/[^\p{L}\w\s]/gu, ' ')
      .split(' ')
      .filter(t => t.length > 1);

    if (qTerms.length === 0) return [];

    // Build query vector
    const qVec = new Map<string, number>();
    qTerms.forEach(t => {
      const idfVal = this.idf.get(t) ?? 0;
      qVec.set(t, ((qVec.get(t) ?? 0) + 1) * idfVal);
    });

    // Compute cosine similarity for each document
    const scores = this.entries.map(e => {
      let dot = 0, normA = 0, normB = 0;
      qVec.forEach((qw, term) => {
        const ew = e.vector.get(term) ?? 0;
        dot += qw * ew;
        normA += qw ** 2;
      });
      e.vector.forEach(w => { normB += w ** 2; });
      const sim = normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
      return { id: e.id, score: sim };
    });

    return scores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => ({
        entry: this._source.find(e => e.id === s.id)!,
        score: s.score,
      }))
      .filter(r => r.entry != null);
  }

  /**
   * Get all indexed terms with their IDF scores (for debug panel).
   */
  getTermStats(): Array<{ term: string; idf: number; docCount: number }> {
    const stats: Array<{ term: string; idf: number; docCount: number }> = [];
    this.idf.forEach((idf, term) => {
      stats.push({ term, idf, docCount: Math.round((this._source.length + 1) / Math.exp(idf - 1) - 1) });
    });
    return stats.sort((a, b) => b.idf - a.idf).slice(0, 50);
  }
}
