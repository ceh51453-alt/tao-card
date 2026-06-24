/**
 * WikiScraperPanel — Tab "Cào Wiki / Fandom" in Lorebook
 * Spec Phần 7.5: URL input, fetch wiki, extract entries
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Globe, Square, Loader2, Check, AlertCircle, Search,
  ChevronDown, ChevronRight, Plus, Trash2,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  runWikiScrape, fetchWikiPageWithFallback,
  buildFandomSearchQueue,
  type WikiScrapeConfig, type FandomSearchItem,
} from '../../lib/ai/wikiScraper';
import {
  ENTRY_CATEGORY_LABELS, getPreset, getStrategyLabel,
  type EntryCategory, type CardType,
} from '../../lib/worldbook/worldbookConfig';

const POSITION_LABELS: Record<number, string> = {
  0: '↑ Before Char', 1: '↓ After Char', 2: '📝 Top AN',
  3: '📝 Bot AN', 4: '@Depth', 5: '← Before Ex', 6: '→ After Ex', 7: '🔌 Outlet',
};

export function WikiScraperPanel() {
  const card = useCardStore(s => s.card);
  const addEntry = useCardStore(s => s.addEntry);
  const settings = useSettingsStore();

  // Config
  const [mode, setMode] = useState<'url' | 'subject'>('url');
  const [url, setUrl] = useState('');
  const [subject, setSubject] = useState('');
  const [instructions, setInstructions] = useState('');
  const [maxEntries, setMaxEntries] = useState(30);
  const [defaultPosition, setDefaultPosition] = useState<0|1|2|3|4|5|6|7>(0);
  const [insertionOrderStart, setInsertionOrderStart] = useState(100);
  const [showTagMap, setShowTagMap] = useState(false);
  const [customTags, setCustomTags] = useState<Array<{ tag: string; slug: string }>>([]);
  const [entryCategory, setEntryCategory] = useState<EntryCategory>('custom');
  const [cardType, setCardType] = useState<CardType>('single');

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [entriesCreated, setEntriesCreated] = useState(0);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'extracting' | 'done' | 'error' | 'stopped'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const stoppedRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const activeProfile = settings.profiles.find(p => p.id === settings.activeProfileId);

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

  const handleStart = useCallback(async () => {
    if (!activeProfile) return;

    setIsRunning(true);
    setLogs([]);
    setEntriesCreated(0);
    setStatus('idle');
    stoppedRef.current = false;

    if (mode === 'subject' && subject.trim()) {
      // Fandom Priority Search mode
      try {
        setStatus('fetching');
        const result = await fetchWikiPageWithFallback(
          subject.trim(), card, addLog,
          Object.keys(customMappings).length > 0 ? customMappings : undefined,
        );

        // Now scrape the found content
        const config: WikiScrapeConfig = {
          url: `https://auto-priority/${encodeURIComponent(subject.trim())}`,
          additionalInstructions: instructions,
          maxEntries,
          defaultPosition,
          insertionOrderStart,
          category: entryCategory !== 'custom' ? entryCategory : undefined,
          cardType,
        };

        // Create a mock context that uses the already-fetched content
        setStatus('extracting');
        await runWikiScrape({ ...config, url: result.source }, {
          card: structuredClone(card),
          profile: activeProfile,
          generationParams: settings.generationParams,
          get stopped() { return stoppedRef.current; },
          log: addLog,
          onProgress: (created, s) => { setEntriesCreated(created); setStatus(s); },
          appendEntry: (entry) => addEntry(entry),
        });
      } catch (err) {
        addLog(`💥 Lỗi: ${err instanceof Error ? err.message : String(err)}`);
        setStatus('error');
      }
    } else if (mode === 'url' && url.trim()) {
      try { new URL(url); } catch { addLog('❌ URL không hợp lệ.'); setIsRunning(false); return; }

      const config: WikiScrapeConfig = {
        url: url.trim(),
        additionalInstructions: instructions,
        maxEntries,
        defaultPosition,
        insertionOrderStart,
        category: entryCategory !== 'custom' ? entryCategory : undefined,
        cardType,
      };

      try {
        await runWikiScrape(config, {
          card: structuredClone(card),
          profile: activeProfile,
          generationParams: settings.generationParams,
          get stopped() { return stoppedRef.current; },
          log: addLog,
          onProgress: (created, s) => { setEntriesCreated(created); setStatus(s); },
          appendEntry: (entry) => addEntry(entry),
        });
      } catch (err) {
        addLog(`💥 Lỗi: ${err instanceof Error ? err.message : String(err)}`);
        setStatus('error');
      }
    }
    setIsRunning(false);
  }, [mode, url, subject, activeProfile, instructions, maxEntries, defaultPosition, insertionOrderStart, card, settings.generationParams, addEntry, addLog, customMappings, entryCategory, cardType]);

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

      {/* Instructions */}
      <div>
        <label className="settings-label">Hướng dẫn thêm</label>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
          rows={2} className="settings-input text-sm resize-y" disabled={isRunning}
          placeholder="Ví dụ: Tập trung vào kỹ năng chiến đấu và biến đổi..." />
      </div>

      {/* Entry Category Selector */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="settings-label">Loại thẻ</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name="ws-cardType" checked={cardType === 'single'}
                  onChange={() => setCardType('single')} className="settings-checkbox" disabled={isRunning} />
                Nhân vật đơn
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name="ws-cardType" checked={cardType === 'multi'}
                  onChange={() => setCardType('multi')} className="settings-checkbox" disabled={isRunning} />
                Nhiều NV
              </label>
            </div>
          </div>
          <div>
            <label className="settings-label">Loại Entry sẽ tạo</label>
            <select value={entryCategory} onChange={e => setEntryCategory(e.target.value as EntryCategory)}
              className="settings-input text-xs" disabled={isRunning}>
              {Object.entries(ENTRY_CATEGORY_LABELS).map(([key, { label, icon }]) => (
                <option key={key} value={key}>{icon} {label}</option>
              ))}
            </select>
          </div>
        </div>
        {entryCategory !== 'custom' && (() => {
          const preset = getPreset(entryCategory, cardType);
          if (!preset) return null;
          const s = getStrategyLabel(preset.defaults.constant, preset.defaults.selective);
          return (
            <div className={`flex items-center gap-1.5 text-xs ${s.color}`}>
              <span>{s.icon}</span>
              <span className="font-medium">{s.label}</span>
            </div>
          );
        })()}
      </div>

      {/* Config row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="settings-label">Giới hạn entries</label>
          <input type="number" value={maxEntries}
            onChange={e => setMaxEntries(Math.max(1, parseInt(e.target.value) || 30))}
            className="settings-input" min={1} max={100} disabled={isRunning} />
        </div>
        <div>
          <label className="settings-label">Vị trí</label>
          <select value={defaultPosition} onChange={e => setDefaultPosition(Number(e.target.value) as 0|1|2|3|4|5|6|7)}
            className="settings-input" disabled={isRunning}>
            {Object.entries(POSITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="settings-label">Insertion Order</label>
          <input type="number" value={insertionOrderStart}
            onChange={e => setInsertionOrderStart(parseInt(e.target.value) || 100)}
            className="settings-input" min={0} disabled={isRunning} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!isRunning ? (
          <button onClick={handleStart}
            disabled={(mode === 'url' ? !url.trim() : !subject.trim()) || !activeProfile}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
            {mode === 'subject' ? <Search className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            {mode === 'subject' ? '🔍 Tìm và cào' : '🕸️ Bắt đầu cào'}
          </button>
        ) : (
          <button onClick={() => { stoppedRef.current = true; }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm">
            <Square className="w-4 h-4" /> Dừng
          </button>
        )}
      </div>

      {/* Status */}
      {status !== 'idle' && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          {status === 'fetching' && <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm">Đang tải trang wiki...</span></>}
          {status === 'extracting' && <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm">Đang trích xuất... ({entriesCreated} entries)</span></>}
          {status === 'done' && <><Check className="w-5 h-5 text-emerald-400" /><span className="text-sm text-emerald-400">Hoàn thành! {entriesCreated} entries.</span></>}
          {status === 'error' && <><AlertCircle className="w-5 h-5 text-destructive" /><span className="text-sm text-destructive">Lỗi.</span></>}
          {status === 'stopped' && <><Square className="w-5 h-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Đã dừng. {entriesCreated} entries.</span></>}
        </div>
      )}

      {/* Log */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs text-muted-foreground font-medium">
            Log ({logs.length})
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-thin px-4 py-2 space-y-0.5">
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
