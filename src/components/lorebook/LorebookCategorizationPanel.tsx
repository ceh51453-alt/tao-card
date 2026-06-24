/**
 * LorebookCategorizationPanel — Auto-categorize and analyze lorebook entries
 * Shows category breakdown, health issues, keyword overlaps, and suggestions
 */

import { useState, useMemo } from 'react';
import {
  PieChart, AlertTriangle, CheckCircle, Tag,
  ChevronDown, ChevronRight, Lightbulb, XCircle,
  Layers,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import {
  categorizeEntry, categorizeAllEntries,
  CATEGORY_LABELS, type AutoCategory,
} from '../../lib/worldbook/lorebookCategorizer';

export function LorebookCategorizationPanel() {
  const entries = useCardStore(s => s.card.data.character_book?.entries ?? []);
  const updateEntry = useCardStore(s => s.updateEntry);
  const [filter, setFilter] = useState<AutoCategory | 'all'>('all');
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  // Run categorization
  const entryResults = useMemo(() => {
    return entries.map(entry => ({
      entry,
      result: categorizeEntry(entry),
    }));
  }, [entries]);

  const summary = useMemo(() => categorizeAllEntries(entries), [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entryResults.filter(({ result }) => {
      if (filter !== 'all' && result.category !== filter) return false;
      if (showIssuesOnly && result.issues.length === 0) return false;
      return true;
    });
  }, [entryResults, filter, showIssuesOnly]);

  // Category counts for filter
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    for (const { result } of entryResults) {
      counts[result.category] = (counts[result.category] ?? 0) + 1;
    }
    return counts;
  }, [entryResults, entries.length]);

  const totalTokens = useMemo(() =>
    entryResults.reduce((sum, { result }) => sum + result.tokenCount, 0),
  [entryResults]);

  const issueCount = summary.issues.length;

  return (
    <div className="space-y-5 p-5">
      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Entries" value={String(entries.length)} icon={<Layers className="w-4 h-4 text-primary" />} />
        <StatCard label="Est. Tokens" value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : String(totalTokens)} icon={<PieChart className="w-4 h-4 text-blue-400" />} />
        <StatCard label="Issues" value={String(issueCount)} icon={issueCount > 0 ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Key Overlaps" value={String(summary.duplicateKeywords.length)} icon={<Tag className="w-4 h-4 text-violet-400" />} />
      </div>

      {/* Category breakdown */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5 text-primary" />
          Phân loại tự động
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip
            cat="all" label="Tất cả" count={categoryCounts['all'] ?? 0}
            isActive={filter === 'all'} onClick={() => setFilter('all')}
          />
          {(Object.entries(CATEGORY_LABELS) as Array<[AutoCategory, typeof CATEGORY_LABELS[AutoCategory]]>).map(([key, info]) => {
            const count = categoryCounts[key] ?? 0;
            if (count === 0) return null;
            return (
              <CategoryChip key={key}
                cat={key} label={`${info.icon} ${info.label}`} count={count}
                isActive={filter === key} onClick={() => setFilter(key as AutoCategory)}
              />
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showIssuesOnly} onChange={e => setShowIssuesOnly(e.target.checked)}
            className="settings-checkbox w-3.5 h-3.5" />
          Chỉ hiện entries có vấn đề
        </label>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">
          {filteredEntries.length} / {entries.length} entries
        </span>
      </div>

      {/* Entry list */}
      <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin">
        {filteredEntries.map(({ entry, result }) => {
          const catInfo = CATEGORY_LABELS[result.category];
          const isExpanded = expandedEntry === entry.id;

          return (
            <div key={entry.id}
              className={`rounded-lg border transition-all ${
                result.issues.length > 0
                  ? 'border-amber-500/20 bg-amber-500/5'
                  : 'border-border bg-card/50'
              }`}>
              {/* Header */}
              <button onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors rounded-lg">
                {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                <span className={`text-[10px] ${catInfo.color}`}>{catInfo.icon}</span>
                <span className="text-xs font-medium truncate flex-1">
                  {entry.comment || `#${entry.id}`}
                </span>
                <span className="text-[9px] text-muted-foreground/50">{result.tokenCount}t</span>
                {result.confidence < 0.4 && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">?</span>
                )}
                {result.issues.length > 0 && (
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                  {/* Category + confidence */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${catInfo.color} bg-current/5`}>
                      {catInfo.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      Confidence: {(result.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Current keys */}
                  <div>
                    <span className="text-[9px] text-muted-foreground">Keys: </span>
                    {entry.keys.length > 0
                      ? entry.keys.map((k, i) => (
                          <span key={i} className="inline-block text-[9px] font-mono bg-muted/30 rounded px-1 py-0.5 mr-1 mb-0.5">
                            {k}
                          </span>
                        ))
                      : <span className="text-[9px] text-muted-foreground/50">—</span>
                    }
                  </div>

                  {/* Suggested keywords */}
                  {result.suggestedKeywords.length > 0 && (
                    <div>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1 mb-1">
                        <Lightbulb className="w-3 h-3 text-amber-400" /> Gợi ý thêm keys:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {result.suggestedKeywords.map((kw, i) => (
                          <button key={i}
                            onClick={() => {
                              const newKeys = [...entry.keys, kw];
                              updateEntry(entry.id, { keys: newKeys });
                            }}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary
                              hover:bg-primary/20 transition-colors cursor-pointer"
                            title={`Thêm "${kw}" vào keys`}>
                            + {kw}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues */}
                  {result.issues.length > 0 && (
                    <div className="space-y-0.5">
                      {result.issues.map((issue, i) => (
                        <p key={i} className="text-[9px] text-amber-400 flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5 shrink-0" /> {issue}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Content preview */}
                  <details>
                    <summary className="text-[9px] text-muted-foreground cursor-pointer">
                      Preview ({entry.content.length} chars)
                    </summary>
                    <pre className="mt-1 text-[9px] font-mono text-muted-foreground/70 max-h-20 overflow-y-auto
                      bg-muted/20 rounded p-1.5 whitespace-pre-wrap leading-relaxed">
                      {entry.content.slice(0, 500)}{entry.content.length > 500 ? '...' : ''}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Keyword overlaps */}
      {summary.duplicateKeywords.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-violet-400" />
            Keywords trùng lặp ({summary.duplicateKeywords.length})
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
            {summary.duplicateKeywords.slice(0, 20).map((dup, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">{dup.keyword}</code>
                <span className="text-muted-foreground">→ {dup.entryIds.length} entries</span>
                <span className="text-muted-foreground/50">({dup.entryIds.map(id => `#${id}`).join(', ')})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-semibold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function CategoryChip({ label, count, isActive, onClick }: {
  cat?: string; label: string; count: number; isActive: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
        isActive
          ? 'bg-primary/10 text-primary border border-primary/30'
          : 'bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent'
      }`}>
      {label}
      <span className={`${isActive ? 'text-primary/60' : 'text-muted-foreground/50'}`}>
        {count}
      </span>
    </button>
  );
}
