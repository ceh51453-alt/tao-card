/**
 * QualityCheckPanel.tsx — Panel kiểm tra chất lượng theo tiêu chuẩn Minh Nguyệt
 */

import { useState, useMemo } from 'react';
import {
  ShieldCheck, AlertTriangle, Info, XCircle,
  ChevronDown, ChevronRight, Sparkles, Tag, FileCode2, Palette,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { runQualityCheck, type QualityReport, type QualityIssue, type QualityCategory } from '../../lib/validation/qualityChecker';
import { cn } from '../../lib/utils';

const CATEGORY_META: Record<QualityCategory, { label: string; icon: React.ReactNode; color: string }> = {
  bat_co: { label: 'Bát Cổ (八股)', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-amber-500' },
  tag: { label: 'Tag Integrity', icon: <Tag className="w-3.5 h-3.5" />, color: 'text-blue-500' },
  structure: { label: 'Cấu trúc', icon: <Palette className="w-3.5 h-3.5" />, color: 'text-purple-500' },
  content: { label: 'Nội dung', icon: <FileCode2 className="w-3.5 h-3.5" />, color: 'text-emerald-500' },
  ejs: { label: 'EJS Code', icon: <FileCode2 className="w-3.5 h-3.5" />, color: 'text-cyan-500' },
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono">{score}</span>
    </div>
  );
}

function IssueItem({ issue }: { issue: QualityIssue }) {
  const [expanded, setExpanded] = useState(false);
  
  const levelIcon = issue.level === 'error'
    ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
    : issue.level === 'warning'
    ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
    : <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />;

  return (
    <div
      className={cn(
        'border rounded-lg px-3 py-2 text-xs cursor-pointer transition-colors',
        issue.level === 'error' ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'
          : issue.level === 'warning' ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
          : 'border-border bg-muted/30 hover:bg-muted/50'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        {levelIcon}
        <div className="flex-1 min-w-0">
          <div className="font-medium">{issue.message}</div>
          {issue.entryComment && (
            <div className="text-muted-foreground mt-0.5">
              Entry: {issue.entryComment} {issue.lineNumber ? `(dòng ${issue.lineNumber})` : ''}
            </div>
          )}
        </div>
        {issue.suggestion && (
          expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
        )}
      </div>
      {expanded && issue.suggestion && (
        <div className="mt-2 pl-5 text-muted-foreground border-l-2 border-primary/20">
          💡 {issue.suggestion}
        </div>
      )}
      {expanded && issue.matchedText && (
        <div className="mt-1 pl-5">
          <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{issue.matchedText}</code>
        </div>
      )}
    </div>
  );
}

export function QualityCheckPanel() {
  const card = useCardStore((s) => s.card);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [filterCategory, setFilterCategory] = useState<QualityCategory | 'all'>('all');
  const [isRunning, setIsRunning] = useState(false);

  const entries = card.data.character_book?.entries ?? [];

  const handleRunCheck = () => {
    setIsRunning(true);
    // Small delay for UI feedback
    requestAnimationFrame(() => {
      const result = runQualityCheck(entries);
      setReport(result);
      setIsRunning(false);
    });
  };

  const filteredIssues = useMemo(() => {
    if (!report) return [];
    if (filterCategory === 'all') return report.issues;
    return report.issues.filter(i => i.category === filterCategory);
  }, [report, filterCategory]);

  const categoryCountMap = useMemo(() => {
    if (!report) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const issue of report.issues) {
      map[issue.category] = (map[issue.category] ?? 0) + 1;
    }
    return map;
  }, [report]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Kiểm tra chất lượng Minh Nguyệt
        </h3>
        <button
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg font-medium transition-all',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            isRunning && 'opacity-50 cursor-not-allowed'
          )}
          onClick={handleRunCheck}
          disabled={isRunning || entries.length === 0}
        >
          {isRunning ? (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 animate-spin" /> Đang kiểm tra...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" /> Chạy kiểm tra
            </span>
          )}
        </button>
      </div>

      {entries.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6">
          Chưa có entries. Tạo lorebook trước khi kiểm tra chất lượng.
        </div>
      )}

      {/* Score Dashboard */}
      {report && (
        <div className="space-y-3">
          {/* Overall Score */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10">
            <div className={cn(
              'text-2xl font-bold',
              report.scores.overall >= 80 ? 'text-emerald-500' :
              report.scores.overall >= 60 ? 'text-amber-500' : 'text-red-500'
            )}>
              {report.scores.overall}
            </div>
            <div className="flex-1 text-xs">
              <div className="font-medium">{report.summary}</div>
              <div className="text-muted-foreground mt-0.5">
                {report.totalEntries} entries đã kiểm tra
              </div>
            </div>
          </div>

          {/* Individual Scores */}
          <div className="space-y-1.5 p-3 rounded-lg border bg-card">
            <ScoreBar score={report.scores.batCo} label="Anti-bát-cổ" />
            <ScoreBar score={report.scores.tagIntegrity} label="Tag" />
            <ScoreBar score={report.scores.structureComplete} label="Cấu trúc" />
            <ScoreBar score={report.scores.contentQuality} label="Nội dung" />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1">
            <button
              className={cn(
                'px-2 py-1 text-[10px] rounded-md border transition-colors',
                filterCategory === 'all'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/30'
              )}
              onClick={() => setFilterCategory('all')}
            >
              Tất cả ({report.issueCount})
            </button>
            {(Object.keys(CATEGORY_META) as QualityCategory[]).map(cat => {
              const count = categoryCountMap[cat] ?? 0;
              if (count === 0) return null;
              const meta = CATEGORY_META[cat];
              return (
                <button
                  key={cat}
                  className={cn(
                    'px-2 py-1 text-[10px] rounded-md border transition-colors flex items-center gap-1',
                    filterCategory === cat
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/30'
                  )}
                  onClick={() => setFilterCategory(cat)}
                >
                  <span className={meta.color}>{meta.icon}</span>
                  {meta.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Issue List */}
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {filteredIssues.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-4">
                ✅ Không có vấn đề nào{filterCategory !== 'all' ? ` trong danh mục "${CATEGORY_META[filterCategory]?.label}"` : ''}
              </div>
            ) : (
              filteredIssues.map(issue => (
                <IssueItem key={issue.id} issue={issue} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
