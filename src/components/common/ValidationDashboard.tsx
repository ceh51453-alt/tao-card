/**
 * ValidationDashboard — Comprehensive card health check UI
 * Runs all validation checks and shows results as a categorized checklist.
 * Accessible from TopBar or Sidebar.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Shield, X, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  SkipForward, ChevronDown, ChevronRight, Sparkles,
  FileText, BookOpen, Code2, Cpu, BarChart3, Link2, Loader2,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import type { MVUZODSchema } from '../../types/mvuzod.types';
import {
  validateCard,
  type CardValidationResult, type CheckCategory, type ValidationCheck,
} from '../../lib/validation/cardValidator';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ValidationDashboardProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_CONFIG: Record<CheckCategory, { label: string; icon: typeof Shield; color: string }> = {
  basic: { label: 'Thông tin cơ bản', icon: FileText, color: 'text-blue-400' },
  schema: { label: 'MVUZOD Schema', icon: Sparkles, color: 'text-violet-400' },
  worldbook: { label: 'Worldbook', icon: BookOpen, color: 'text-emerald-400' },
  regex: { label: 'Regex Scripts', icon: Code2, color: 'text-amber-400' },
  ejs: { label: 'EJS Templates', icon: Cpu, color: 'text-cyan-400' },
  budget: { label: 'Token Budget', icon: BarChart3, color: 'text-pink-400' },
  cross_ref: { label: 'Cross References', icon: Link2, color: 'text-orange-400' },
};

const STATUS_ICONS = {
  pass: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  fail: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  skip: <SkipForward className="w-3.5 h-3.5 text-muted-foreground/40" />,
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ValidationDashboard({ open, onClose }: ValidationDashboardProps) {
  const card = useCardStore(s => s.card);
  const [result, setResult] = useState<CardValidationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<CheckCategory>>(new Set());

  const schema = useMemo<MVUZODSchema | null>(() => {
    return card.data.extensions?.mvuzod?.schema ?? null;
  }, [card.data.extensions?.mvuzod?.schema]);

  const handleRun = useCallback(() => {
    setIsRunning(true);
    // Use requestAnimationFrame for UI responsiveness
    requestAnimationFrame(() => {
      const validationResult = validateCard(card, schema);
      setResult(validationResult);
      setIsRunning(false);
      // Auto-expand categories with issues
      const issueCategories = new Set<CheckCategory>(
        validationResult.checks
          .filter(c => c.status === 'fail' || c.status === 'warn')
          .map(c => c.category),
      );
      setExpandedCategories(issueCategories);
    });
  }, [card, schema]);

  const toggleCategory = useCallback((cat: CheckCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // Group checks by category — must be before early return to respect Rules of Hooks
  const groupedChecks = useMemo(() => {
    if (!result) return new Map<CheckCategory, ValidationCheck[]>();
    const map = new Map<CheckCategory, ValidationCheck[]>();
    for (const check of result.checks) {
      if (!map.has(check.category)) map.set(check.category, []);
      map.get(check.category)!.push(check);
    }
    return map;
  }, [result]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Validation Dashboard</h2>
              <p className="text-[10px] text-muted-foreground">Kiểm tra sức khỏe card toàn diện</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!result ? (
            /* No results yet */
            <div className="text-center py-8">
              <Shield className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Chạy validation để kiểm tra tất cả components của card
              </p>
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-violet-500 text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {isRunning ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang kiểm tra...</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5" /> Chạy Validation</>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Overall badge */}
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    result.overall === 'pass' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    result.overall === 'warn' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {result.overall === 'pass' ? '✅ PASS' : result.overall === 'warn' ? '⚠️ WARNINGS' : '❌ FAIL'}
                  </div>

                  {/* Counts */}
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-emerald-400">{result.counts.pass} pass</span>
                    {result.counts.warn > 0 && <span className="text-amber-400">{result.counts.warn} warn</span>}
                    {result.counts.fail > 0 && <span className="text-red-400">{result.counts.fail} fail</span>}
                    {result.counts.skip > 0 && <span className="text-muted-foreground">{result.counts.skip} skip</span>}
                  </div>
                </div>

                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] text-muted-foreground hover:bg-muted transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
                  Chạy lại
                </button>
              </div>

              {/* Token budget bar chart */}
              {result.tokenBudget.sections.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-muted/10 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Token Budget: ~{result.tokenBudget.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {result.tokenBudget.sections.map(sec => (
                      <div key={sec.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-28 truncate shrink-0">{sec.name}</span>
                        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary/60 to-violet-500/60 rounded-full transition-all"
                            style={{ width: `${Math.min(100, sec.percent)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground w-16 text-right shrink-0">
                          {sec.tokens.toLocaleString()} ({sec.percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category groups */}
              <div className="space-y-1.5">
                {Array.from(groupedChecks.entries()).map(([category, checks]) => {
                  const config = CATEGORY_CONFIG[category];
                  const Icon = config.icon;
                  const isExpanded = expandedCategories.has(category);
                  const catPass = checks.filter(c => c.status === 'pass').length;
                  const catTotal = checks.filter(c => c.status !== 'skip').length;
                  const hasIssues = checks.some(c => c.status === 'fail' || c.status === 'warn');

                  return (
                    <div key={category} className="rounded-xl border border-border bg-card overflow-hidden">
                      {/* Category header */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/20 transition-colors"
                      >
                        {isExpanded
                          ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                          : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        }
                        <Icon className={`w-3.5 h-3.5 ${config.color} shrink-0`} />
                        <span className="text-xs font-medium flex-1 text-left">{config.label}</span>
                        <span className={`text-[10px] font-mono ${hasIssues ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {catPass}/{catTotal}
                        </span>
                      </button>

                      {/* Expanded checks */}
                      {isExpanded && (
                        <div className="border-t border-border/50">
                          {checks.map(check => (
                            <CheckRow key={check.id} check={check} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Timestamp */}
              <div className="text-[9px] text-muted-foreground/50 text-center">
                Validated: {new Date(result.timestamp).toLocaleTimeString()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK ROW
// ═══════════════════════════════════════════════════════════════════════════

function CheckRow({ check }: { check: ValidationCheck }) {
  const [showFix, setShowFix] = useState(false);

  return (
    <div className={`border-b border-border/30 last:border-0 ${
      check.status === 'fail' ? 'bg-red-500/3' :
      check.status === 'warn' ? 'bg-amber-500/3' : ''
    }`}>
      <div
        className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={() => check.fix && setShowFix(!showFix)}
      >
        <div className="mt-0.5 shrink-0">{STATUS_ICONS[check.status]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">{check.label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{check.message}</div>
        </div>
        {check.fix && (
          <ChevronDown className={`w-3 h-3 text-muted-foreground/40 mt-1 shrink-0 transition-transform ${showFix ? 'rotate-180' : ''}`} />
        )}
      </div>
      {showFix && check.fix && (
        <div className="mx-3 mb-2 px-3 py-1.5 rounded-md bg-primary/5 border border-primary/10">
          <span className="text-[10px] text-primary">💡 {check.fix}</span>
        </div>
      )}
    </div>
  );
}
