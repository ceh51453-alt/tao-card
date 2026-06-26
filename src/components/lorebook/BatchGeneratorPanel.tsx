/**
 * BatchGeneratorPanel — Tab "AI Sinh theo Batch" in Lorebook
 * Spec Phần 7.3.2: Config form + progress bar + log
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Play, Pause, Square, ChevronDown, ChevronRight,
  Zap, AlertCircle, Check, Loader2,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { useSettingsStore } from '../../store/settingsStore';
import { runBatchGeneration, type BatchGenConfig, type BatchProgress } from '../../lib/ai/batchGenerator';
import { CompletionCriteriaPanel } from './CompletionCriteriaPanel';
import type { CompletionCriteria, VerificationReport } from '../../lib/completionVerifier/criteria';
import { DEFAULT_CRITERIA } from '../../lib/completionVerifier/criteria';
import { runWithVerification } from '../../lib/completionVerifier/verifier';
import {
  getPreset, getStrategyLabel,
  type EntryCategory, type CardType,
} from '../../lib/worldbook/worldbookConfig';
import { buildSchemaContextForBatch, getSchemaPreviewSummary } from '../../lib/mvuzod/schemaContextBuilder';
import type { MVUZODSchema } from '../../types/mvuzod.types';

const POSITION_LABELS: Record<number, string> = {
  0: '↑ Before Char', 1: '↓ After Char', 2: '📝 Top AN',
  3: '📝 Bot AN', 4: '@Depth', 5: '← Before Ex', 6: '→ After Ex', 7: '🔌 Outlet',
};

export function BatchGeneratorPanel() {
  const addEntry = useCardStore(s => s.addEntry);
  const card = useCardStore(s => s.card);
  const settings = useSettingsStore();

  // ─── Config state ───────────────────────────────────────────────────
  type TabKey = 'main_char' | 'multi_char' | 'worldview' | 'region' | 'scene' | 'secondary' | 'custom';

  interface TabData {
    id: TabKey;
    label: string;
    icon: string;
    cardType: CardType;
    category: EntryCategory;
    placeholder: string;
  }

  const TABS: TabData[] = useMemo(() => [
    { id: 'main_char', label: 'Nhân vật chính', icon: '👑', cardType: 'single', category: 'character_detail', placeholder: 'Ví dụ: Tạo một nam chính lạnh lùng, sử dụng kiếm thuật hệ băng, mang trong mình dòng máu ma tộc...' },
    { id: 'multi_char', label: 'Nhân vật phụ (NPC)', icon: '👥', cardType: 'multi', category: 'npc', placeholder: 'Ví dụ: Tạo 5 thành viên của nhóm lính đánh thuê Hắc Vũ, bao gồm cung thủ, pháp sư, đấu sĩ...' },
    { id: 'worldview', label: 'Thế giới quan', icon: '🌍', cardType: 'single', category: 'worldview', placeholder: 'Ví dụ: Mô tả thế giới tu tiên hiện đại, nơi linh khí khô kiệt và con người dùng máy móc để tu luyện...' },
    { id: 'region', label: 'Địa lý & Khu vực', icon: '🗺', cardType: 'single', category: 'region_overview', placeholder: 'Ví dụ: Tạo các khu vực trong tông môn như Tàng Kinh Các, Dược Viên, Ngoại Môn, Nội Môn...' },
    { id: 'scene', label: 'Cảnh vật & Sự kiện', icon: '🏞', cardType: 'single', category: 'scene', placeholder: 'Ví dụ: Sự kiện Đại hội Tỉ võ 10 năm một lần hoặc cảnh Thung lũng sương mù...' },
    { id: 'secondary', label: 'Chỉ đạo AI (D0)', icon: '🎯', cardType: 'single', category: 'secondary_explanation', placeholder: 'Ví dụ: Căn dặn AI luôn viết văn phong kiếm hiệp cổ trang và tập trung mô tả nội tâm...' },
    { id: 'custom', label: 'Tuỳ chỉnh tự do', icon: '⚙️', cardType: 'single', category: 'custom', placeholder: 'Nhập nội dung bất kỳ bạn muốn tạo...' },
  ], []);

  const [activeTab, setActiveTab] = useState<TabKey>('main_char');
  const [prompts, setPrompts] = useState<Record<TabKey, string>>({
    main_char: '', multi_char: '', worldview: '', region: '', scene: '', secondary: '', custom: ''
  });

  const [useCardContext, setUseCardContext] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [useSchemaContext, setUseSchemaContext] = useState(false);
  const [autoConfig, setAutoConfig] = useState(true);
  const [totalEntries, setTotalEntries] = useState(10);
  const [entriesPerBatch, setEntriesPerBatch] = useState(5);
  const [concurrentBatches, setConcurrentBatches] = useState(1);
  const [defaultPosition, setDefaultPosition] = useState<0|1|2|3|4|5|6|7>(0);
  const [insertionOrderMode, setInsertionOrderMode] = useState<'same' | 'increment'>('increment');
  const [insertionOrderStart, setInsertionOrderStart] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxRetries, setMaxRetries] = useState(2);
  const [maxConsecErrors, setMaxConsecErrors] = useState(3);
  const [modelOverride, setModelOverride] = useState('');

  // ─── Run state ──────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const ctxRef = useRef<{ paused: boolean; stopped: boolean }>({ paused: false, stopped: false });
  const logEndRef = useRef<HTMLDivElement>(null);

  // ─── Completion Verification state ──────────────────────────────────
  const [criteria, setCriteria] = useState<CompletionCriteria>(DEFAULT_CRITERIA);
  const [verifyReport, setVerifyReport] = useState<VerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const totalBatches = useMemo(() => Math.ceil(totalEntries / entriesPerBatch), [totalEntries, entriesPerBatch]);
  const totalRounds = useMemo(() => Math.ceil(totalBatches / concurrentBatches), [totalBatches, concurrentBatches]);
  const activeProfile = useMemo(() => settings.profiles.find(p => p.id === settings.activeProfileId), [settings.profiles, settings.activeProfileId]);

  // Read MVUZOD schema from card store
  const mvuzodSchema = useMemo<MVUZODSchema | null>(() => {
    const ext = card.data.extensions as unknown as Record<string, unknown>;
    if (ext?.mvuzod) {
      return (ext.mvuzod as Record<string, unknown>).schema as MVUZODSchema ?? null;
    }
    return null;
  }, [card.data.extensions]);

  const schemaPreview = useMemo(() => {
    if (!mvuzodSchema) return null;
    return getSchemaPreviewSummary(mvuzodSchema);
  }, [mvuzodSchema]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleStart = useCallback(async (runAll: boolean) => {
    if (!activeProfile) {
      addLog('❌ Chưa cấu hình proxy profile. Vào Settings để tạo.');
      return;
    }

    const tabsToRun = runAll
      ? TABS.filter(t => prompts[t.id].trim().length > 0)
      : [TABS.find(t => t.id === activeTab)!].filter(t => prompts[t.id].trim().length > 0);

    if (tabsToRun.length === 0) {
      addLog('❌ Nhập chủ đề / yêu cầu nội dung vào tab trước khi chạy.');
      return;
    }

    setIsRunning(true);
    setProgress(null);
    setLogs([]);
    ctxRef.current = { paused: false, stopped: false };

    try {
      for (let i = 0; i < tabsToRun.length; i++) {
        if (ctxRef.current.stopped) break;
        
        const tab = tabsToRun[i];
        if (tabsToRun.length > 1) {
          addLog(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚀 Đang chạy tab: ${tab.label} (${i + 1}/${tabsToRun.length})...\n━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        }
        
        const config: BatchGenConfig = {
          topicPrompt: prompts[tab.id].trim(),
          useCardContext,
          useWebSearch,
          totalEntries,
          entriesPerBatch,
          defaultPosition,
          insertionOrderMode,
          insertionOrderStart,
          maxRetriesPerBatch: maxRetries,
          maxConsecutiveErrors: maxConsecErrors,
          modelOverride: modelOverride || undefined,
          concurrentBatches,
          category: tab.category !== 'custom' ? tab.category : undefined,
          cardType: tab.cardType,
          autoConfig,
          schemaContext: useSchemaContext && mvuzodSchema
            ? buildSchemaContextForBatch(mvuzodSchema)
            : undefined,
        };

        await runBatchGeneration(config, {
          card: structuredClone(useCardStore.getState().card),
          profile: activeProfile,
          generationParams: settings.generationParams,
          get paused() { return ctxRef.current.paused; },
          get stopped() { return ctxRef.current.stopped; },
          log: addLog,
          onProgress: setProgress,
          appendEntry: (entry) => { addEntry(entry); },
        });

        // Run verification after batch if enabled
        if (criteria.enabled && !ctxRef.current.stopped) {
          setIsVerifying(true);
          addLog(`\n🎯 Bắt đầu Completion Verification cho tab: ${tab.label}...`);
          const report = await runWithVerification(config, criteria, {
            card: structuredClone(useCardStore.getState().card),
            profile: activeProfile,
            generationParams: settings.generationParams,
            get stopped() { return ctxRef.current.stopped; },
            log: addLog,
            onReport: setVerifyReport,
            appendEntry: (entry) => { addEntry(entry); },
          });
          setVerifyReport(report);
          setIsVerifying(false);
        }
      }
    } catch (err) {
      addLog(`💥 Lỗi nghiêm trọng: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    setIsRunning(false);
    setIsVerifying(false);
  }, [activeProfile, prompts, activeTab, TABS, useCardContext, useWebSearch, useSchemaContext, mvuzodSchema, totalEntries, entriesPerBatch, concurrentBatches,
      defaultPosition, insertionOrderMode, insertionOrderStart, maxRetries,
      maxConsecErrors, modelOverride, autoConfig, settings.generationParams, addEntry, addLog, criteria]);

  const handlePause = useCallback(() => {
    const next = !ctxRef.current.paused;
    ctxRef.current.paused = next;
    setIsPaused(next);
    addLog(next ? '⏸ Tạm dừng...' : '▶️ Tiếp tục...');
  }, [addLog]);

  const handleStop = useCallback(() => {
    ctxRef.current.stopped = true;
    addLog('⏹ Dừng hẳn...');
  }, [addLog]);

  // ─── Render ─────────────────────────────────────────────────────────

  const progressPercent = progress ? Math.round((progress.created / progress.total) * 100) : 0;

  return (
    <div className="space-y-5 p-5 max-w-2xl mx-auto">
      {/* Category Tabs */}
      <div className="flex flex-col gap-2">
        <label className="settings-label text-sm mb-1">Loại nội dung muốn tạo (Chọn Tab & Nhập ý tưởng)</label>
        <div className="flex flex-wrap gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : prompts[tab.id].trim()
                    ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400 opacity-80'
                    : 'bg-muted border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
              disabled={isRunning}
            >
              <span>{tab.icon}</span> {tab.label}
              {prompts[tab.id].trim() && activeTab !== tab.id && <Check className="w-3 h-3 ml-1" />}
            </button>
          ))}
        </div>

        {/* Active Tab Textarea */}
        <div className="bg-muted/10 border border-border rounded-xl p-4 space-y-3 mt-1">
          <textarea
            value={prompts[activeTab]}
            onChange={e => setPrompts(p => ({ ...p, [activeTab]: e.target.value }))}
            rows={4}
            className="settings-input text-sm resize-y"
            disabled={isRunning}
            placeholder={TABS.find(t => t.id === activeTab)?.placeholder}
          />
          
          {/* Preset Info */}
          {(() => {
            const tab = TABS.find(t => t.id === activeTab);
            if (!tab || tab.category === 'custom') return null;
            const preset = getPreset(tab.category, tab.cardType);
            if (!preset) return null;
            const s = getStrategyLabel(preset.defaults.constant, preset.defaults.selective);
            return (
              <div className="text-xs space-y-1 text-muted-foreground pt-2 border-t border-border/50">
                <div className={`flex items-center gap-1.5 ${s.color}`}>
                  <span>{s.icon}</span>
                  <span className="font-medium">{s.label}</span>
                </div>
                <p className="text-[10px]">
                  pos={preset.defaults.position === 0 ? 'before_char' : preset.defaults.position === 1 ? 'after_char' : `@D${preset.defaults.depth}`}
                  {' · '}order={preset.defaults.insertion_order}
                  {preset.defaults.scan_depth !== null && ` · scan=${preset.defaults.scan_depth}`}
                  {' · '}đệ quy=✅
                </p>
                <p className="text-[10px] text-muted-foreground/60">Từ khóa: {preset.keywordHint}</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Context toggles */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={useCardContext} onChange={e => setUseCardContext(e.target.checked)}
            className="settings-checkbox" disabled={isRunning} />
          Dùng Description/Personality/Scenario làm ngữ cảnh
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer text-blue-400">
          <input type="checkbox" checked={useWebSearch} onChange={e => setUseWebSearch(e.target.checked)}
            className="settings-checkbox" disabled={isRunning} />
          🌐 Kích hoạt Tìm Kiếm Web Mỗi Lượt (SOTA Web Search)
        </label>

        {/* Schema-aware toggle — only show when schema exists */}
        {mvuzodSchema && schemaPreview && (
          <div className={`rounded-lg border p-3 space-y-1.5 transition-colors ${
            useSchemaContext
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-border/50 bg-muted/10'
          }`}>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={useSchemaContext} onChange={e => setUseSchemaContext(e.target.checked)}
                className="settings-checkbox" disabled={isRunning} />
              <span className={`font-medium ${useSchemaContext ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                🧬 Sinh entries dựa theo Schema biến (MVUZOD)
              </span>
            </label>
            <p className={`text-[10px] ml-6 ${useSchemaContext ? 'text-emerald-400/70' : 'text-muted-foreground/60'}`}>
              Schema hiện có: {schemaPreview.summary}
            </p>
            {useSchemaContext && (
              <p className="text-[10px] ml-6 text-muted-foreground">
                AI sẽ tạo entries có tham chiếu đến các biến trong schema (quan hệ, vật phẩm, trạng thái...)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Entries config */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="settings-label">Tổng số Entries</label>
          <input type="number" value={totalEntries} onChange={e => setTotalEntries(Math.max(1, parseInt(e.target.value) || 1))}
            className="settings-input" min={1} max={500} disabled={isRunning} />
        </div>
        <div>
          <label className="settings-label">Entries / Batch</label>
          <input type="number" value={entriesPerBatch} onChange={e => setEntriesPerBatch(Math.max(1, parseInt(e.target.value) || 1))}
            className="settings-input" min={1} max={20} disabled={isRunning} />
        </div>
        <div>
          <label className="settings-label">Batch song song</label>
          <input type="number" value={concurrentBatches} onChange={e => setConcurrentBatches(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="settings-input" min={1} max={10} disabled={isRunning} />
        </div>
      </div>

      {/* Calculated batches */}
      <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
        → Sẽ thực hiện <span className="text-foreground font-medium">{totalBatches}</span> lượt gọi AI
        {concurrentBatches > 1 && (
          <> (<span className="text-foreground font-medium">{totalRounds}</span> vòng × {concurrentBatches} song song)</>)}
      </div>

      {/* AI Auto-Config Toggle */}
      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={autoConfig} onChange={e => setAutoConfig(e.target.checked)}
            className="settings-checkbox" disabled={isRunning} />
          <span className="font-medium text-violet-400">🤖 AI tự sắp xếp order & config cho từng entry</span>
        </label>
        {autoConfig && (
          <p className="text-[10px] text-muted-foreground ml-6">
            AI sẽ tự quyết định <code className="px-1 py-0.5 rounded bg-muted">insertion_order</code>,{' '}
            <code className="px-1 py-0.5 rounded bg-muted">position</code>,{' '}
            <code className="px-1 py-0.5 rounded bg-muted">depth</code>,{' '}
            <code className="px-1 py-0.5 rounded bg-muted">constant/selective</code>{' '}
            cho từng entry dựa trên nội dung. Worldview sẽ được gán order=1-3, NPC=100+, etc.
          </p>
        )}
      </div>

      {/* Position & Insertion Order — chỉ hiện khi tắt autoConfig */}
      {!autoConfig && (
        <>
          {/* Position */}
          <div>
            <label className="settings-label">Vị trí mặc định</label>
            <select value={defaultPosition} onChange={e => setDefaultPosition(Number(e.target.value) as 0|1|2|3|4|5|6|7)}
              className="settings-input" disabled={isRunning}>
              {Object.entries(POSITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Insertion order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="settings-label">Insertion Order</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="radio" name="ioMode" checked={insertionOrderMode === 'same'} disabled={isRunning}
                    onChange={() => setInsertionOrderMode('same')} className="settings-checkbox" /> Giữ nguyên
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="radio" name="ioMode" checked={insertionOrderMode === 'increment'} disabled={isRunning}
                    onChange={() => setInsertionOrderMode('increment')} className="settings-checkbox" /> Tăng dần
                </label>
              </div>
            </div>
            <div>
              <label className="settings-label">Bắt đầu từ</label>
              <input type="number" value={insertionOrderStart}
                onChange={e => setInsertionOrderStart(parseInt(e.target.value) || 100)}
                className="settings-input" min={0} disabled={isRunning} />
            </div>
          </div>
        </>
      )}

      {/* Advanced */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
          Tuỳ chọn nâng cao
          {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {showAdvanced && (
          <div className="px-4 pb-4 pt-3 border-t border-border space-y-3">
            <div>
              <label className="settings-label">Model Override (để trống = dùng profile mặc định)</label>
              <input type="text" value={modelOverride} onChange={e => setModelOverride(e.target.value)}
                className="settings-input text-xs font-mono" placeholder="gpt-4o-mini" disabled={isRunning} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="settings-label">Max Retries / Batch</label>
                <input type="number" value={maxRetries} onChange={e => setMaxRetries(parseInt(e.target.value) || 2)}
                  className="settings-input" min={0} max={5} disabled={isRunning} />
              </div>
              <div>
                <label className="settings-label">Max Consecutive Errors</label>
                <input type="number" value={maxConsecErrors} onChange={e => setMaxConsecErrors(parseInt(e.target.value) || 3)}
                  className="settings-input" min={1} max={10} disabled={isRunning} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completion Criteria */}
      <CompletionCriteriaPanel
        criteria={criteria}
        onChange={setCriteria}
        report={verifyReport}
        isVerifying={isVerifying}
      />

      {/* Control buttons */}
      <div className="flex gap-2">
        {!isRunning ? (
          <>
            <button onClick={() => handleStart(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/50 font-medium text-sm hover:bg-blue-600/30 transition-colors">
              <Play className="w-4 h-4" /> Chạy Tab Hiện Tại
            </button>
            <button onClick={() => handleStart(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
              <Zap className="w-4 h-4" /> 🚀 Chạy Tất Cả Tab Đã Nhập
            </button>
          </>
        ) : (
          <>
            <button onClick={handlePause}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
            </button>
            <button onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 transition-colors">
              <Square className="w-4 h-4" /> Dừng hẳn
            </button>
          </>
        )}
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Batch {progress.batch}/{progress.totalBatches}
            </span>
            <span className="text-foreground font-medium">
              {progress.created}/{progress.total} entries
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            {progress.status === 'running' && <><Loader2 className="w-3 h-3 animate-spin text-primary" /> Đang chạy...</>}
            {progress.status === 'paused' && <><Pause className="w-3 h-3 text-amber-400" /> Tạm dừng</>}
            {progress.status === 'done' && <><Check className="w-3 h-3 text-emerald-400" /> Hoàn thành</>}
            {progress.status === 'error' && <><AlertCircle className="w-3 h-3 text-destructive" /> Lỗi</>}
            {progress.status === 'stopped' && <><Square className="w-3 h-3 text-muted-foreground" /> Đã dừng</>}
          </div>
        </div>
      )}

      {/* Summary banner */}
      {progress && (progress.status === 'done' || progress.status === 'stopped') && (
        <div className={`rounded-xl p-4 border text-sm ${
          progress.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-muted border-border text-muted-foreground'
        }`}>
          {progress.status === 'done'
            ? `✅ Hoàn thành! Đã tạo ${progress.created}/${progress.total} entries.`
            : `⏹ Đã dừng. Tạo được ${progress.created}/${progress.total} entries.`}
        </div>
      )}

      {/* Log */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs text-muted-foreground font-medium">
            Log ({logs.length})
          </div>
          <div className="max-h-60 overflow-y-auto scrollbar-thin px-4 py-2 space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className="text-xs font-mono text-muted-foreground leading-relaxed">{log}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
