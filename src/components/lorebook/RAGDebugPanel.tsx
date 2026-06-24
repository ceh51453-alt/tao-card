/**
 * RAGDebugPanel — Collapsible RAG debug display
 * Spec Phần 9B.3: Shows query, top matches with scores, token budget
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Search, ChevronDown, ChevronRight, Database, Zap,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { TFIDFIndex, type RAGSearchResult } from '../../lib/rag/tfidfIndexer';
import { buildRAGContext } from '../../lib/rag/ragContextBuilder';

export function RAGDebugPanel() {
  const card = useCardStore(s => s.card);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RAGSearchResult[]>([]);
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [searchTime, setSearchTime] = useState(0);

  // Build index from current entries
  const index = useMemo(() => {
    const idx = new TFIDFIndex();
    idx.indexWithSource(card.data.character_book?.entries ?? []);
    return idx;
  }, [card.data.character_book?.entries]);

  const handleSearch = useCallback(() => {
    if (!query.trim() || !index.isIndexed) return;
    const start = performance.now();
    const ctx = buildRAGContext(query, index, { topK: 10, includeNegatives: true });
    const elapsed = performance.now() - start;
    setResults(ctx.relevantEntries);
    setTokenEstimate(ctx.tokenEstimate);
    setSearchTime(Math.round(elapsed * 100) / 100);
  }, [query, index]);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <button onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card/50 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">RAG Debug</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {index.size} entries indexed
          </span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="border-t border-border p-4 space-y-3 bg-background">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="settings-input pl-8 text-xs" placeholder="Test RAG query..." />
            </div>
            <button onClick={handleSearch}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
              <Zap className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stats */}
          {results.length > 0 && (
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span>⏱ {searchTime}ms</span>
              <span>📊 {results.length} matches</span>
              <span>🪙 ~{tokenEstimate} tokens injection</span>
            </div>
          )}

          {/* Results */}
          {results.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {results.map((r, i) => {
                const pct = Math.round(r.score * 100);
                return (
                  <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30 text-xs">
                    <span className={`shrink-0 font-mono font-bold ${
                      pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-muted-foreground'
                    }`}>
                      [{pct}%]
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{r.entry.comment}</span>
                      <span className="text-muted-foreground ml-1.5">
                        keys: [{r.entry.keys.slice(0, 3).join(', ')}]
                      </span>
                      <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                        {r.entry.content.slice(0, 100)}...
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : query && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nhập query và nhấn Enter để test RAG search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
