/**
 * WikiScraperPanel — Tab "Cào Wiki / Fandom" in Lorebook
 * Upgraded: Feature parity with BatchGeneratorPanel
 * Category Tabs, autoConfig, batch config, RAG dedup, progress bar, pause/resume,
 * Completion Criteria, Advanced accordion, dual-action buttons
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Globe, Square, Loader2, Check, AlertCircle, Search,
  ChevronDown, ChevronRight, Plus, Trash2,
  Play, Pause, Zap,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  runWikiScrape, fetchWikiPageWithFallback,
  buildFandomSearchQueue,
  type WikiScrapeConfig, type WikiScrapeProgress, type FandomSearchItem,
} from '../../lib/ai/wikiScraper';
import {
  ENTRY_CATEGORY_LABELS, getPreset, getStrategyLabel,
  type EntryCategory, type CardType,
} from '../../lib/worldbook/worldbookConfig';
import { CompletionCriteriaPanel } from './CompletionCriteriaPanel';
import type { CompletionCriteria, VerificationReport } from '../../lib/completionVerifier/criteria';
import { DEFAULT_CRITERIA } from '../../lib/completionVerifier/criteria';
import { runWithVerification } from '../../lib/completionVerifier/verifier';
import type { BatchGenConfig } from '../../lib/ai/batchGenerator';

const POSITION_LABELS: Record<number, string> = {
  0: '↑ Before Char', 1: '↓ After Char', 2: '📝 Top AN',
  3: '📝 Bot AN', 4: '@Depth', 5: '← Before Ex', 6: '→ After Ex', 7: '🔌 Outlet',
};

// ─── Category Tabs (same structure as BatchGeneratorPanel) ────────────────

type TabKey = 'main_char' | 'multi_char' | 'worldview' | 'region' | 'scene' | 'secondary' | 'custom';

interface TabData {
  id: TabKey;
  label: string;
  icon: string;
  cardType: CardType;
  category: EntryCategory;
  placeholder: string;
}

export function WikiScraperPanel() {
  const card = useCardStore(s => s.card);
  const addEntry = useCardStore(s => s.addEntry);
  const settings = useSettingsStore();

  // ─── Category Tabs ──────────────────────────────────────────────────
  const TABS: TabData[] = useMemo(() => [
    { id: 'main_char', label: 'Nhân vật chính', icon: '👑', cardType: 'single', category: 'character_detail', placeholder: 'Ví dụ: Trích xuất chi tiết nhân vật chính — ngoại hình, kỹ năng, biến đổi...' },
    { id: 'multi_char', label: 'Nhân vật phụ (NPC)', icon: '👥', cardType: 'multi', category: 'npc', placeholder: 'Ví dụ: Trích xuất tất cả NPC và vai phụ xuất hiện trên trang wiki...' },
    { id: 'worldview', label: 'Thế giới quan', icon: '🌍', cardType: 'single', category: 'worldview', placeholder: 'Ví dụ: Trích xuất bối cảnh thế giới, hệ thống sức mạnh, quy tắc...' },
    { id: 'region', label: 'Địa lý & Khu vực', icon: '🗺', cardType: 'single', category: 'region_overview', placeholder: 'Ví dụ: Trích xuất các khu vực, địa danh quan trọng...' },
    { id: 'scene', label: 'Cảnh vật & Sự kiện', icon: '🏞', cardType: 'single', category: 'scene', placeholder: 'Ví dụ: Trích xuất các sự kiện lớn, trận chiến, arc...' },
    { id: 'secondary', label: 'Chỉ đạo AI (D0)', icon: '🎯', cardType: 'single', category: 'secondary_explanation', placeholder: 'Ví dụ: Tạo entry chỉ đạo AI dựa trên wiki — giọng điệu, phong cách...' },
    { id: 'custom', label: 'Tuỳ chỉnh tự do', icon: '⚙️', cardType: 'single', category: 'custom', placeholder: 'Nhập hướng dẫn trích xuất tuỳ ý...' },
  ], []);

  const [activeTab, setActiveTab] = useState<TabKey>('main_char');
  const [prompts, setPrompts] = useState<Record<TabKey, string>>({
    main_char: '', multi_char: '', worldview: '', region: '', scene: '', secondary: '', custom: ''
  });

  // ─── Wiki source config ─────────────────────────────────────────────
  const [mode, setMode] = useState<'url' | 'subject'>('url');
  const [url, setUrl] = useState('');
  const [subject, setSubject] = useState('');
  const [showTagMap, setShowTagMap] = useState(false);
  const [customTags, setCustomTags] = useState<Array<{ tag: string; slug: string }>>([]);

  // ─── Batch config ───────────────────────────────────────────────────
  const [useCardContext, setUseCardContext] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [autoConfig, setAutoConfig] = useState(true);
  const [maxEntries, setMaxEntries] = useState(30);
  const [entriesPerBatch, setEntriesPerBatch] = useState(5);
  const [concurrentBatches, setConcurrentBatches] = useState(1);
  const [defaultPosition, setDefaultPosition] = useState<0|1|2|3|4|5|6|7>(0);
  const [insertionOrderMode, setInsertionOrderMode] = useState<'same' | 'increment'>('increment');
  const [insertionOrderStart, setInsertionOrderStart] = useState(100);

  // ─── Advanced ───────────────────────────────────────────────────────
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxRetries, setMaxRetries] = useState(2);
  const [maxConsecErrors, setMaxConsecErrors] = useState(3);
  const [modelOverride, setModelOverride] = useState('');

  // ─── Completion Verification ────────────────────────────────────────
  const [criteria, setCriteria] = useState<CompletionCriteria>(DEFAULT_CRITERIA);
  const [verifyReport, setVerifyReport] = useState<VerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // ─── Run state ──────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<WikiScrapeProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const ctxRef = useRef<{ paused: boolean; stopped: boolean }>({ paused: false, stopped: false });
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const activeProfile = useMemo(() => settings.profiles.find(p => p.id === settings.activeProfileId), [settings.profiles, settings.activeProfileId]);
  const totalBatches = useMemo(() => Math.ceil(maxEntries / entriesPerBatch), [maxEntries, entriesPerBatch]);
  const totalRounds = useMemo(() => Math.ceil(totalBatches / concurrentBatches), [totalBatches, concurrentBatches]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // ─── Priority sources display ───────────────────────────────────────

  const customMappings = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ct of customTags) {
      if (ct.tag.trim() && ct.slug.trim()) map[ct.tag.trim().toLowerCase()] = ct.slug.trim();
    }
    return map;
  }, [customTags]);

  const priorityQueue: FandomSearchItem[] = useMemo(() => {
    if (mode !== 'subject' || !subject.trim()) return [];
    return buildFandomSearchQueue(subject.trim(), card, Object.keys(customMappings).length > 0 ? customMappings : undefined);
  }, [mode, subject, card, customMappings]);

  const prioritySources = mode === 'url' && url ? (() => {
    try {
      const parsed = new URL(url);
      const sources: string[] = [];
      if (parsed.hostname.includes('fandom.com')) {
        sources.push('1. Fandom REST API (ưu tiên)');
        sources.push('2. MediaWiki API (fallback)');
      } else {
        sources.push('1. MediaWiki API');
      }
      sources.push(`${sources.length + 1}. CORS Proxy (fallback cuối)`);
      return sources;
    } catch { return []; }
  })() : [];

  // ─── Run ────────────────────────────────────────────────────────────

  const handleStart = useCallback(async (runAll: boolean) => {
    if (!activeProfile) {
      addLog('❌ Chưa cấu hình proxy profile. Vào Settings để tạo.');
      return;
    }

    if (mode === 'url' && !url.trim()) { addLog('❌ Nhập URL.'); return; }
    if (mode === 'subject' && !subject.trim()) { addLog('❌ Nhập chủ đề.'); return; }

    const tabsToRun = runAll
      ? TABS.filter(t => prompts[t.id].trim().length > 0)
      : [TABS.find(t => t.id === activeTab)!];

    // For non-runAll with empty prompt, still run current tab (wiki content is primary source)
    if (tabsToRun.length === 0) {
      addLog('❌ Nhập yêu cầu nội dung vào ít nhất 1 tab trước khi chạy tất cả.');
      return;
    }

    setIsRunning(true);
    setProgress(null);
    setLogs([]);
    ctxRef.current = { paused: false, stopped: false };

    try {
      // Resolve wiki URL for subject mode
      let resolvedUrl = url.trim();
      if (mode === 'subject' && subject.trim()) {
        addLog(`🔍 Tìm kiếm wiki cho: "${subject.trim()}"...`);
        try {
          const result = await fetchWikiPageWithFallback(
            subject.trim(), card, addLog,
            Object.keys(customMappings).length > 0 ? customMappings : undefined,
          );
          resolvedUrl = result.source;
          addLog(`✅ Đã tìm thấy nguồn: ${result.source}`);
        } catch (err) {
          addLog(`❌ Không tìm thấy wiki: ${err instanceof Error ? err.message : String(err)}`);
          setIsRunning(false);
          return;
        }
      } else {
        try { new URL(resolvedUrl); } catch { addLog('❌ URL không hợp lệ.'); setIsRunning(false); return; }
      }

      for (let i = 0; i < tabsToRun.length; i++) {
        if (ctxRef.current.stopped) break;

        const tab = tabsToRun[i];
        if (tabsToRun.length > 1) {
          addLog(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚀 Đang chạy tab: ${tab.label} (${i + 1}/${tabsToRun.length})...\n━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        }

        const config: WikiScrapeConfig = {
          url: resolvedUrl,
          additionalInstructions: '',
          maxEntries,
          defaultPosition,
          insertionOrderStart,
          insertionOrderMode,
          category: tab.category !== 'custom' ? tab.category : undefined,
          cardType: tab.cardType,
          useCardContext,
          useWebSearch,
          entriesPerBatch,
          concurrentBatches,
          maxRetriesPerBatch: maxRetries,
          maxConsecutiveErrors: maxConsecErrors,
          modelOverride: modelOverride || undefined,
          autoConfig,
          topicPrompt: prompts[tab.id].trim(),
        };

        await runWikiScrape(config, {
          card: structuredClone(useCardStore.getState().card),
          profile: activeProfile,
          generationParams: settings.generationParams,
          get paused() { return ctxRef.current.paused; },
          get stopped() { return ctxRef.current.stopped; },
          log: addLog,
          onProgress: setProgress,
          appendEntry: (entry) => { addEntry(entry); },
        });

        // Run verification after wiki scrape if enabled
        if (criteria.enabled && !ctxRef.current.stopped) {
          setIsVerifying(true);
          addLog(`\n🎯 Bắt đầu Completion Verification cho tab: ${tab.label}...`);

          // Adapt WikiScrapeConfig to BatchGenConfig for verifier
          const batchConfig: BatchGenConfig = {
            topicPrompt: prompts[tab.id].trim() || `Trích xuất từ wiki: ${resolvedUrl}`,
            useCardContext,
            useWebSearch,
            totalEntries: maxEntries,
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
          };

          const report = await runWithVerification(batchConfig, criteria, {
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
  }, [mode, url, subject, activeProfile, activeTab, TABS, prompts, customMappings,
      useCardContext, useWebSearch, maxEntries, entriesPerBatch, concurrentBatches,
      defaultPosition, insertionOrderMode, insertionOrderStart, maxRetries,
      maxConsecErrors, modelOverride, autoConfig, card, settings.generationParams,
      addEntry, addLog, criteria]);

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
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        <button onClick={() => setMode('url')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === 'url' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`} disabled={isRunning}>
          <Globe className="w-3.5 h-3.5 inline mr-1" /> URL trực tiếp
        </button>
        <button onClick={() => setMode('subject')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === 'subject' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`} disabled={isRunning}>
          <Search className="w-3.5 h-3.5 inline mr-1" /> Tìm theo chủ đề (Priority)
        </button>
      </div>

      {/* URL input */}
      {mode === 'url' ? (
        <div>
          <label className="settings-label">URL trang Wiki / Fandom</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="url" value={url} onChange={e => setUrl(e.target.value)}
              className="settings-input pl-9" disabled={isRunning}
              placeholder="https://dragonball.fandom.com/wiki/Goku" />
          </div>
        </div>
      ) : (
        <div>
          <label className="settings-label">Chủ đề tìm kiếm</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="settings-input pl-9" disabled={isRunning}
              placeholder="Ví dụ: Goku, Naruto, Kirito..." />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Sẽ tự động tìm trên Fandom/Wikia/Wikipedia theo thứ tự ưu tiên dựa vào tags của card.
          </p>
        </div>
      )}

      {/* Priority queue display (subject mode) */}
      {mode === 'subject' && priorityQueue.length > 0 && (
        <div className="rounded-lg bg-muted/30 border border-border px-4 py-2.5">
          <p className="text-xs text-muted-foreground font-medium mb-1">Thứ tự ưu tiên nguồn:</p>
          {priorityQueue.map((item, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">P{item.priority}.</span> {item.label}
            </p>
          ))}
        </div>
      )}

      {/* Priority sources (URL mode) */}
      {mode === 'url' && prioritySources.length > 0 && (
        <div className="rounded-lg bg-muted/30 border border-border px-4 py-2.5">
          <p className="text-xs text-muted-foreground font-medium mb-1">Thứ tự nguồn:</p>
          {prioritySources.map((s, i) => (
            <p key={i} className="text-xs text-muted-foreground">{s}</p>
          ))}
        </div>
      )}

      {/* Tag-to-Fandom Map Editor (accordion) */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button onClick={() => setShowTagMap(!showTagMap)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
          Tag-to-Fandom Mapping (tuỳ chỉnh)
          {showTagMap ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {showTagMap && (
          <div className="px-4 pb-3 pt-2 border-t border-border space-y-2">
            {customTags.map((ct, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input type="text" value={ct.tag} placeholder="keyword (vd: genshin)"
                  onChange={e => { const t = [...customTags]; t[idx] = { ...t[idx], tag: e.target.value }; setCustomTags(t); }}
                  className="settings-input flex-1 text-xs" />
                <span className="text-xs text-muted-foreground">→</span>
                <input type="text" value={ct.slug} placeholder="fandom slug"
                  onChange={e => { const t = [...customTags]; t[idx] = { ...t[idx], slug: e.target.value }; setCustomTags(t); }}
                  className="settings-input flex-1 text-xs" />
                <button onClick={() => setCustomTags(customTags.filter((_, i) => i !== idx))}
                  className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            <button onClick={() => setCustomTags([...customTags, { tag: '', slug: '' }])}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
              <Plus className="w-3 h-3" /> Thêm mapping
            </button>
          </div>
        )}
      </div>

      {/* ═══ Category Tabs ═══ */}
      <div className="flex flex-col gap-2">
        <label className="settings-label text-sm mb-1">Loại nội dung trích xuất (Chọn Tab & Nhập hướng dẫn)</label>
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
            rows={3}
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
      </div>

      {/* Entries config */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="settings-label">Tổng số Entries</label>
          <input type="number" value={maxEntries} onChange={e => setMaxEntries(Math.max(1, parseInt(e.target.value) || 1))}
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
            cho từng entry dựa trên nội dung wiki. Worldview sẽ được gán order=1-3, NPC=100+, etc.
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
                  <input type="radio" name="ws-ioMode" checked={insertionOrderMode === 'same'} disabled={isRunning}
                    onChange={() => setInsertionOrderMode('same')} className="settings-checkbox" /> Giữ nguyên
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="radio" name="ws-ioMode" checked={insertionOrderMode === 'increment'} disabled={isRunning}
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/50 font-medium text-sm hover:bg-blue-600/30 transition-colors"
              disabled={mode === 'url' ? !url.trim() : !subject.trim()}>
              <Play className="w-4 h-4" /> Chạy Tab Hiện Tại
            </button>
            <button onClick={() => handleStart(true)}
              disabled={(mode === 'url' ? !url.trim() : !subject.trim()) || !TABS.some(t => prompts[t.id].trim())}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
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
            {(progress.status === 'fetching' || progress.status === 'extracting' || progress.status === 'running') && <><Loader2 className="w-3 h-3 animate-spin text-primary" /> {progress.status === 'fetching' ? 'Đang tải wiki...' : 'Đang trích xuất...'}</>}
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
