/**
 * TokenBudgetWizard — @@TCTRL Token Budget Controller UI
 * 
 * One-click hoặc manual: Phân tích 3000+ entries qua AI,
 * sinh @@TCTRL EJS controllers, tối ưu config.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Zap, Loader2, AlertTriangle, Check, Pause, Square,
  ChevronDown, ChevronRight, Undo2, BarChart3, Settings2,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  runTctrlAnalysis, DEFAULT_TCTRL_CONFIG,
  type TctrlAnalysisConfig, type TctrlProgress,
} from '../../lib/tokenBudget/tokenAnalyzer';
import { buildGroupsFromAnalysis, type TctrlAnalysis } from '../../lib/tokenBudget/groupBuilder';
import {
  generateTctrlEntries, materializeTctrlEntry,
  type TctrlSummary,
} from '../../lib/tokenBudget/tctrlGenerator';
import { optimizeConfigs, applyConfigPatches } from '../../lib/tokenBudget/configOptimizer';
import { nextEntryId } from '../../lib/converters/cardDefaults';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const BATCH_SIZE_OPTIONS = [20, 30, 50, 80, 100] as const;
const CONCURRENT_OPTIONS = [1, 2, 3, 5, 10] as const;

export function TokenBudgetWizard() {
  const card = useCardStore(s => s.card);
  const addEntry = useCardStore(s => s.addEntry);
  const updateEntry = useCardStore(s => s.updateEntry);
  const createSnapshot = useCardStore(s => s.createSnapshot);
  const undoToSnapshot = useCardStore(s => s.undoToSnapshot);
  const settings = useSettingsStore();

  const entries = useMemo(() => card.data.character_book?.entries ?? [], [card]);
  const totalTokensEstimate = useMemo(() => Math.ceil(entries.reduce((s, e) => s + (e.content?.length ?? 0), 0) / 4), [entries]);

  // Read existing MVUZOD schema from card
  const mvuzodSchema = useMemo(() => {
    const ext = card.data.extensions as unknown as Record<string, unknown>;
    if (ext?.mvuzod) {
      return (ext.mvuzod as Record<string, unknown>).schema as import('../../types/mvuzod.types').MVUZODSchema ?? null;
    }
    return null;
  }, [card]);

  // ─── Config state ───────────────────────────────────────────────────
  const [config, setConfig] = useState<TctrlAnalysisConfig>({
    ...DEFAULT_TCTRL_CONFIG,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ─── Run state ──────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<TctrlProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<{
    analysis: TctrlAnalysis;
    summary: TctrlSummary;
  } | null>(null);
  const [hasApplied, setHasApplied] = useState(false);

  const ctxRef = useRef<{ paused: boolean; stopped: boolean }>({ paused: false, stopped: false });
  const logEndRef = useRef<HTMLDivElement>(null);

  const activeProfile = useMemo(
    () => settings.profiles.find(p => p.id === settings.activeProfileId),
    [settings.profiles, settings.activeProfileId],
  );

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const totalBatches = useMemo(() => Math.ceil(entries.length / config.entriesPerBatch), [entries.length, config.entriesPerBatch]);
  const totalRounds = useMemo(() => Math.ceil(totalBatches / config.concurrentBatches), [totalBatches, config.concurrentBatches]);
  const estimatedMinutes = useMemo(() => (totalRounds * 5 / 60).toFixed(1), [totalRounds]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // ─── Main handler ──────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (!activeProfile) {
      addLog('❌ Chưa cấu hình proxy profile. Vào Settings để tạo.');
      return;
    }
    if (entries.length === 0) {
      addLog('❌ Card không có entries để phân tích.');
      return;
    }

    setIsRunning(true);
    setResult(null);
    setHasApplied(false);
    setLogs([]);
    ctxRef.current = { paused: false, stopped: false };

    try {
      // Snapshot before changes
      await createSnapshot('Before @@TCTRL');
      addLog('📸 Đã tạo snapshot backup');

      const runCtx = {
        card: structuredClone(card),
        profile: activeProfile,
        generationParams: settings.generationParams,
        get paused() { return ctxRef.current.paused; },
        get stopped() { return ctxRef.current.stopped; },
        log: addLog,
        onProgress: setProgress,
      };

      // ═══ PHASE 1: AI Batch Analysis ═══
      addLog(`\n━━━ PHASE 1: Phân tích ${entries.length} entries ━━━`);
      const analyzed = await runTctrlAnalysis(entries, config, runCtx);

      if (ctxRef.current.stopped) {
        addLog('⏹ Đã dừng bởi user.');
        setIsRunning(false);
        return;
      }

      // ═══ PHASE 2: Local Grouping ═══
      addLog('\n━━━ PHASE 2: Xây dựng nhóm & phân bổ budget ━━━');
      setProgress(prev => prev ? { ...prev, phase: 'group' } : null);
      const analysis = buildGroupsFromAnalysis(analyzed, config, mvuzodSchema);

      addLog(`📊 ${analysis.groups.length} nhóm tạo:`);
      for (const group of analysis.groups) {
        addLog(`  ├─ ${group.name}: ${group.entries.length} entries, ~${group.totalTokens.toLocaleString()} tokens [${group.strategy}]`);
      }

      // Log detected variables
      if (analysis.variables.length > 0) {
        addLog(`\n🔗 Biến điều khiển phát hiện (${analysis.variables.length}):`);
        for (const v of analysis.variables) {
          const icon = v.source === 'mvuzod' ? '🔗' : '🆕';
          addLog(`  ${icon} ${v.name} (${v.source}) → ${v.getvarPath} → ${v.affectedEntries.length} entries`);
          if (v.possibleValues.length > 0) {
            addLog(`     Giá trị: ${v.possibleValues.slice(0, 5).join(', ')}${v.possibleValues.length > 5 ? '...' : ''}`);
          }
        }
      }

      for (const rec of analysis.recommendations) {
        addLog(`  ${rec}`);
      }

      if (ctxRef.current.stopped) {
        addLog('⏹ Đã dừng bởi user.');
        setIsRunning(false);
        return;
      }

      // ═══ PHASE 3: AI Generate TCTRL ═══
      addLog('\n━━━ PHASE 3: Sinh @@TCTRL EJS entries ━━━');
      const tctrlResult = await generateTctrlEntries(
        analysis, analyzed, runCtx,
        { apiCalls: 0 } as TctrlProgress,
      );

      if (ctxRef.current.stopped) {
        addLog('⏹ Đã dừng bởi user.');
        setIsRunning(false);
        return;
      }

      // ═══ PHASE 4: Config Optimizer ═══
      addLog('\n━━━ PHASE 4: Tối ưu config ━━━');
      setProgress(prev => prev ? { ...prev, phase: 'optimize' } : null);
      const patches = optimizeConfigs(entries, analysis, analyzed, addLog);

      // Apply everything
      addLog('\n━━━ ÁP DỤNG THAY ĐỔI ━━━');

      // Add TCTRL entries
      for (const tctrl of tctrlResult.entries) {
        const id = nextEntryId(useCardStore.getState().card.data.character_book?.entries ?? []);
        const entry = materializeTctrlEntry(tctrl, id);
        addEntry(entry);
        addLog(`➕ Thêm: ${tctrl.comment}`);
      }

      // Apply config patches
      applyConfigPatches(patches, updateEntry);

      setResult({ analysis, summary: { ...tctrlResult.summary, entriesConfigChanged: patches.length } });
      setHasApplied(true);
      setProgress(prev => prev ? { ...prev, phase: 'done' } : null);

      addLog(`\n🏁 HOÀN THÀNH! ${tctrlResult.entries.length} @@TCTRL entries + ${patches.length} config patches`);

    } catch (err) {
      addLog(`\n❌ Lỗi: ${err instanceof Error ? err.message : String(err)}`);
      setProgress(prev => prev ? { ...prev, phase: 'error' } : null);
    } finally {
      setIsRunning(false);
    }
  }, [activeProfile, entries, card, config, settings.generationParams, createSnapshot, addEntry, updateEntry, addLog, mvuzodSchema]);

  const handlePause = useCallback(() => {
    ctxRef.current.paused = !ctxRef.current.paused;
    setIsPaused(ctxRef.current.paused);
    addLog(ctxRef.current.paused ? '⏸ Tạm dừng...' : '▶️ Tiếp tục...');
  }, [addLog]);

  const handleStop = useCallback(() => {
    ctxRef.current.stopped = true;
    addLog('⏹ Đang dừng...');
  }, [addLog]);

  const handleUndo = useCallback(async () => {
    const ok = await undoToSnapshot();
    if (ok) {
      addLog('↩️ Đã undo tất cả thay đổi');
      setResult(null);
      setHasApplied(false);
    } else {
      addLog('⚠️ Không tìm thấy snapshot để undo');
    }
  }, [undoToSnapshot, addLog]);

  // ─── Phase labels ──────────────────────────────────────────────────

  const phaseLabels: Record<string, string> = {
    analyze: 'Phân tích bằng AI',
    group: 'Xây dựng nhóm',
    generate: 'Sinh EJS controllers',
    optimize: 'Tối ưu config',
    done: 'Hoàn thành',
    error: 'Lỗi',
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Sinh EJS điều khiển entries
          <span className="text-xs font-mono text-muted-foreground">@@TCTRL</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tự động phân tích & tối ưu {entries.length.toLocaleString()} entries
          ({totalTokensEstimate.toLocaleString()} tokens ước tính)
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Config section */}
        {!isRunning && !result && (
          <div className="space-y-3">
            {/* Budget slider */}
            <div>
              <label className="text-sm font-medium flex items-center justify-between">
                <span>🎯 Budget worldbook</span>
                <span className="text-amber-400 font-mono">
                  {config.targetBudgetPercent}% → ~{Math.floor(config.inputContext * config.targetBudgetPercent / 100).toLocaleString()} tokens
                </span>
              </label>
              <input
                type="range" min={10} max={80} step={5}
                value={config.targetBudgetPercent}
                onChange={e => setConfig(c => ({ ...c, targetBudgetPercent: Number(e.target.value) }))}
                className="w-full mt-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10%</span>
                <span>Chat history: ~{Math.floor(config.inputContext * (100 - config.targetBudgetPercent) / 100).toLocaleString()} tokens</span>
                <span>80%</span>
              </div>
            </div>

            {/* Concurrent batches */}
            <div>
              <label className="text-sm font-medium">🚀 Batch song song</label>
              <div className="flex gap-1 mt-1">
                {CONCURRENT_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setConfig(c => ({ ...c, concurrentBatches: n }))}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      config.concurrentBatches === n
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Cao hơn = nhanh hơn, nhưng dễ bị rate limit (auto giảm khi gặp)
              </p>
            </div>

            {/* Advanced settings */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Settings2 className="w-3 h-3" /> Nâng cao
            </button>

            {showAdvanced && (
              <div className="space-y-2 pl-4 border-l-2 border-border">
                <div className="flex items-center gap-2">
                  <label className="text-sm w-32">Entries/batch:</label>
                  <select
                    value={config.entriesPerBatch}
                    onChange={e => setConfig(c => ({ ...c, entriesPerBatch: Number(e.target.value) }))}
                    className="bg-card border border-border rounded px-2 py-1 text-sm"
                  >
                    {BATCH_SIZE_OPTIONS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm w-32">Input context:</label>
                  <input
                    type="number"
                    value={config.inputContext}
                    onChange={e => setConfig(c => ({ ...c, inputContext: Number(e.target.value) }))}
                    className="bg-card border border-border rounded px-2 py-1 text-sm w-32"
                  />
                </div>
              </div>
            )}

            {/* Estimate */}
            <div className="bg-card/50 rounded-lg p-3 border border-border text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="w-4 h-4" />
                <span>Ước tính: {totalBatches} batches × {config.concurrentBatches} song song = ~{totalRounds} rounds ≈ {estimatedMinutes} phút</span>
              </div>
            </div>

            {/* Start button */}
            <button
              onClick={handleStart}
              disabled={!activeProfile || entries.length === 0}
              className="w-full py-3 rounded-lg font-bold text-base flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Zap className="w-5 h-5" />
              Bắt đầu tối ưu — {entries.length.toLocaleString()} entries
            </button>

            {!activeProfile && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Chưa cấu hình AI profile. Vào Settings để tạo.
              </p>
            )}
          </div>
        )}

        {/* Progress section */}
        {isRunning && progress && (
          <div className="space-y-3">
            {/* Phase progress bars */}
            {(['analyze', 'group', 'generate', 'optimize'] as const).map(phase => {
              const isActive = progress.phase === phase;
              const isDone = ['analyze', 'group', 'generate', 'optimize'].indexOf(progress.phase) >
                ['analyze', 'group', 'generate', 'optimize'].indexOf(phase);

              let pct = 0;
              if (isDone) pct = 100;
              else if (isActive) {
                if (phase === 'analyze') pct = progress.batchTotal > 0 ? (progress.batchCurrent / progress.batchTotal) * 100 : 0;
                else if (phase === 'generate') pct = progress.tctrlTotal > 0 ? (progress.tctrlGenerated / progress.tctrlTotal) * 100 : 0;
                else pct = 50; // group/optimize are fast, just show indeterminate
              }

              return (
                <div key={phase} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isActive ? 'text-amber-300 font-medium' : isDone ? 'text-emerald-400' : 'text-muted-foreground'}>
                      {isDone ? <Check className="w-3 h-3 inline mr-1" /> : isActive ? <Loader2 className="w-3 h-3 inline mr-1 animate-spin" /> : null}
                      {phaseLabels[phase]}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {isActive && phase === 'analyze' && `${progress.batchCurrent}/${progress.batchTotal}`}
                      {isActive && phase === 'generate' && `${progress.tctrlGenerated}/${progress.tctrlTotal}`}
                      {isDone && '✓'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isDone ? 'bg-emerald-500' : isActive ? 'bg-amber-500' : 'bg-muted'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Stats */}
            {progress.phase === 'analyze' && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-card/50 rounded p-2">
                  <div className="font-mono text-amber-300">{progress.entriesProcessed}/{progress.entriesTotal}</div>
                  <div className="text-muted-foreground">Entries</div>
                </div>
                <div className="bg-card/50 rounded p-2">
                  <div className="font-mono text-blue-300">{progress.apiCalls}</div>
                  <div className="text-muted-foreground">API calls</div>
                </div>
                <div className="bg-card/50 rounded p-2">
                  <div className="font-mono text-muted-foreground">{progress.estimatedRemaining > 0 ? `~${Math.ceil(progress.estimatedRemaining)}s` : '...'}</div>
                  <div className="text-muted-foreground">Còn lại</div>
                </div>
              </div>
            )}

            {/* Concurrency indicator */}
            {progress.currentConcurrency !== config.concurrentBatches && (
              <p className="text-xs text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Song song giảm: {progress.currentConcurrency} (rate limit detected)
              </p>
            )}

            {/* Controls */}
            <div className="flex gap-2">
              <button
                onClick={handlePause}
                className="flex-1 py-2 rounded-md border border-border text-sm flex items-center justify-center gap-1 hover:bg-card/50 transition-colors"
              >
                <Pause className="w-4 h-4" />
                {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
              </button>
              <button
                onClick={handleStop}
                className="flex-1 py-2 rounded-md border border-red-500/30 text-red-400 text-sm flex items-center justify-center gap-1 hover:bg-red-500/10 transition-colors"
              >
                <Square className="w-4 h-4" />
                Dừng hẳn
              </button>
            </div>
          </div>
        )}

        {/* Result section */}
        {result && !isRunning && (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-base">
                <Check className="w-5 h-5" />
                Hoàn thành!
              </h3>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">@@TCTRL entries thêm:</span>
                  <span className="font-mono text-amber-300">{result.summary.tctrlEntriesAdded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entries tắt (dead/dup):</span>
                  <span className="font-mono text-red-300">{result.summary.entriesDisabled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Config cập nhật:</span>
                  <span className="font-mono text-blue-300">{result.summary.entriesConfigChanged}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-2">
                  <span className="text-muted-foreground">Token trước:</span>
                  <span className="font-mono">{result.summary.tokensBefore.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token sau (ước tính):</span>
                  <span className="font-mono text-emerald-300">{result.summary.tokensAfterEstimate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Giảm:</span>
                  <span className="font-mono text-emerald-400">
                    ↓{Math.round((1 - result.summary.tokensAfterEstimate / result.summary.tokensBefore) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Group breakdown */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">📊 Phân bổ theo nhóm</h4>
              {result.analysis.groups.map(group => {
                const pct = result.analysis.totalTokens > 0
                  ? (group.totalTokens / result.analysis.totalTokens) * 100 : 0;
                return (
                  <div key={group.id} className="flex items-center gap-2 text-xs">
                    <span className="w-36 truncate" title={group.name}>{group.name}</span>
                    <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${group.strategy === 'constant' ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="font-mono text-muted-foreground w-20 text-right">
                      {group.totalTokens.toLocaleString()} tk
                    </span>
                    <span className={`text-xs px-1 rounded ${group.strategy === 'constant' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                      {group.strategy}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {hasApplied && (
                <button
                  onClick={handleUndo}
                  className="flex-1 py-2 rounded-md border border-border text-sm flex items-center justify-center gap-1 hover:bg-card/50 transition-colors"
                >
                  <Undo2 className="w-4 h-4" />
                  Undo tất cả
                </button>
              )}
              <button
                onClick={() => { setResult(null); setLogs([]); setProgress(null); }}
                className="flex-1 py-2 rounded-md border border-border text-sm flex items-center justify-center gap-1 hover:bg-card/50 transition-colors"
              >
                Chạy lại
              </button>
            </div>
          </div>
        )}

        {/* Log area */}
        {logs.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground">📋 Log</h4>
            <div className="bg-background rounded-lg p-2 max-h-48 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin">
              {logs.map((log, i) => (
                <div key={i} className={
                  log.includes('❌') ? 'text-red-400'
                    : log.includes('⚠️') ? 'text-yellow-400'
                      : log.includes('✅') ? 'text-emerald-400'
                        : log.includes('━━━') ? 'text-amber-300 font-bold'
                          : 'text-muted-foreground'
                }>
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
