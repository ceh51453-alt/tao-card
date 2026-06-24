/**
 * EJSStudioPage — Upgraded 3-Panel EJS & Script Studio
 * Panel 1: Entry selector / File tree (left sidebar)
 * Panel 2: Code editor (center)
 * Panel 3: Preview + Analysis (right)
 *
 * Spec 8B + 8C + Reference: EJS实战指南_2026_ZOD版.md
 */

import { useState, useMemo, useCallback } from 'react';
import {
  ScrollText, FileCode, Microscope, ChevronDown, Eye,
  PanelLeftClose, PanelRightClose, BookOpen,
  Sparkles, Code2, Layers, Check,
} from 'lucide-react';
import { useCardStore } from '../store/cardStore';
import { EJSEditor } from '../components/ejs/EJSEditor';
import { EJSPreviewPanel } from '../components/ejs/EJSPreviewPanel';
import { EJS_SNIPPETS } from '../components/ejs/ejsSnippets';
import { JSAnalyzerPanel } from '../components/ejs/JSAnalyzerPanel';
import type { MVUZODSchema } from '../types/mvuzod.types';
import { isPreprocessingEntry } from '../lib/ejs/ejsParser';

type ActiveView = 'ejs' | 'analyzer';
type RightPanel = 'preview' | 'analysis' | 'reference';

const SAMPLE_EJS = `@@preprocessing
<%_
// Đọc biến từ stat_data (TavernHelper variables)
if (typeof _era === 'undefined') var _era = getvar('stat_data.Trạng thái thế giới.Thời đại hiện tại', { defaults: 'Đấu 1' });
if (typeof _sType === 'undefined') var _sType = getvar('stat_data.Trạng thái thế giới.Loại cảnh hiện tại', { defaults: 'Hàng ngày' });

// Kích hoạt/tắt entries theo era
// activateEntry(id, bool) hoặc setEntryEnabled(comment, bool)
_%>`;

const SAMPLE_JS = `import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

export const schema = z.object({
  "Trạng thái thế giới": z.object({
    "Thời đại hiện tại": z.string().prefault('Chờ khởi tạo'),
    "Loại cảnh hiện tại": z.string().prefault('Hàng ngày'),
  }).prefault({}),
}).prefault({});

registerMvuSchema('stat_data', schema);

on("message_received", (msg) => {
  const patches = extractPatches(msg.content);
  // Apply patches to state...
});`;

// ─── Built-in function reference ────────────────────────────────────────

const BUILTIN_FUNCTIONS = [
  { group: '📖 Đọc/Ghi biến', funcs: [
    { name: 'getvar(key, opts)', desc: 'Đọc biến. opts: { defaults, scope }', example: "getvar('stat_data.HP', { defaults: 100 })" },
    { name: 'setvar(key, value)', desc: 'Ghi biến', example: "setvar('stat_data.HP', 80)" },
    { name: 'getMvuData(opts)', desc: 'Đọc MVU state', example: "Mvu.getMvuData({type:'message',message_id:'latest'})" },
  ]},
  { group: '📝 Output', funcs: [
    { name: 'print(text)', desc: 'In text vào prompt', example: "print('Hello World')" },
    { name: '<%= expr %>', desc: 'In giá trị expression', example: "<%= getvar('stat_data.HP') %>" },
    { name: '<%- html %>', desc: 'In HTML không escape', example: "<%- '<b>Bold</b>' %>" },
  ]},
  { group: '📚 Worldbook', funcs: [
    { name: 'getwi(comment)', desc: 'Đọc nội dung entry theo comment', example: "getwi('Kỹ năng')" },
    { name: 'activateEntry(id, bool)', desc: 'Bật/tắt entry theo ID', example: "activateEntry(42, true)" },
    { name: 'setEntryEnabled(comment, bool)', desc: 'Bật/tắt entry theo comment', example: "setEntryEnabled('WB: Cổ đại', false)" },
    { name: 'setEntryContent(comment, text)', desc: 'Ghi nội dung entry', example: "setEntryContent('Dynamic', 'text...')" },
  ]},
  { group: '💉 Injection', funcs: [
    { name: 'injectPrompt(opts)', desc: 'Inject text vào prompt context', example: "injectPrompt({ text: '...', position: 'in_chat', depth: 4 })" },
  ]},
  { group: '💬 Chat', funcs: [
    { name: 'getChatMessages(idx, role)', desc: 'Đọc tin nhắn chat', example: "getChatMessages(-1, 'assistant')" },
  ]},
  { group: '📌 Constants', funcs: [
    { name: 'CHARS_COUNT', desc: 'Số nhân vật trong group', example: 'CHARS_COUNT' },
    { name: 'CHAT_ID', desc: 'ID chat hiện tại', example: 'CHAT_ID' },
    { name: 'MESSAGE_ID', desc: 'ID tin nhắn hiện tại', example: 'MESSAGE_ID' },
  ]},
];

// ─── Main Component ─────────────────────────────────────────────────────

export function EJSStudioPage() {
  const card = useCardStore(s => s.card);
  const updateEntry = useCardStore(s => s.updateEntry);
  const [activeView, setActiveView] = useState<ActiveView>('ejs');
  const [rightPanel, setRightPanel] = useState<RightPanel>('preview');
  const [ejsContent, setEjsContent] = useState(SAMPLE_EJS);
  const [jsContent, setJsContent] = useState(SAMPLE_JS);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // Get schema from card
  const schema: MVUZODSchema | null = useMemo(() => {
    const ext = card.data.extensions as unknown as Record<string, unknown> | undefined;
    return (ext?.mvuzod as Record<string, unknown>)?.schema as MVUZODSchema ?? null;
  }, [card.data.extensions]);

  // Find EJS entries & TavernHelper scripts
  const entries = useMemo(() => card.data.character_book?.entries ?? [], [card.data.character_book?.entries]);
  const ejsEntries = useMemo(() => entries.filter(e => isPreprocessingEntry(e.content)), [entries]);
  const scripts = useMemo(() => card.data.extensions?.tavern_helper?.scripts ?? [], [card.data.extensions]);

  // Handle entry selection
  const handleSelectEntry = useCallback((id: number) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      setEjsContent(entry.content);
      setSelectedEntryId(id);
      setActiveView('ejs');
      setIsDirty(false);
    }
  }, [entries]);

  // Handle script selection
  const handleSelectScript = useCallback((idx: number) => {
    const script = scripts[idx];
    if (script) {
      setJsContent(typeof script === 'string' ? script : JSON.stringify(script, null, 2));
      setActiveView('analyzer');
      setIsDirty(false);
    }
  }, [scripts]);

  // Save back to entry
  const handleSaveToEntry = useCallback(() => {
    if (selectedEntryId === null) return;
    updateEntry(selectedEntryId, { content: ejsContent });
    setIsDirty(false);
  }, [selectedEntryId, ejsContent, updateEntry]);

  // Insert snippet
  const handleInsertSnippet = useCallback((code: string) => {
    setEjsContent(code);
    setActiveView('ejs');
    setIsDirty(true);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-2 shrink-0">
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/10">
          <ScrollText className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            EJS & Script Studio
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">v2.0</span>
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            @@preprocessing • EJS templates • TavernHelper JS • Built-in functions
          </p>
        </div>

        {/* Panel toggles */}
        <div className="flex items-center gap-1">
          <button onClick={() => setShowLeftPanel(!showLeftPanel)}
            title="Toggle left panel"
            className={`p-1.5 rounded-lg transition-colors ${showLeftPanel ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
            <PanelLeftClose className="w-4 h-4" />
          </button>
          <button onClick={() => setShowRightPanel(!showRightPanel)}
            title="Toggle right panel"
            className={`p-1.5 rounded-lg transition-colors ${showRightPanel ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border shrink-0" />

      {/* 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ═══ LEFT PANEL: File Tree ═══ */}
        {showLeftPanel && (
          <div className="w-56 shrink-0 border-r border-border bg-card/30 flex flex-col overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/10">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Files
              </span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-3">
              {/* EJS Entries */}
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase px-1 mb-1 flex items-center gap-1">
                  <Code2 className="w-3 h-3" /> EJS Entries ({ejsEntries.length})
                </div>
                {ejsEntries.map(e => (
                  <button key={e.id}
                    onClick={() => handleSelectEntry(e.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-[10px] truncate transition-colors ${
                      selectedEntryId === e.id && activeView === 'ejs'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <FileCode className="w-3 h-3 shrink-0" />
                      <span className="truncate">{e.comment || `#${e.id}`}</span>
                    </div>
                  </button>
                ))}
                {ejsEntries.length === 0 && (
                  <p className="text-[9px] text-muted-foreground/50 px-2 py-1">Không có EJS entry</p>
                )}
              </div>

              {/* Scripts */}
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase px-1 mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> TH Scripts ({scripts.length})
                </div>
                {scripts.map((_, idx) => (
                  <button key={idx}
                    onClick={() => handleSelectScript(idx)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-[10px] truncate transition-colors ${
                      activeView === 'analyzer' ? 'hover:bg-muted/50 text-muted-foreground hover:text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <Microscope className="w-3 h-3 shrink-0" />
                      <span>Script #{idx + 1}</span>
                    </div>
                  </button>
                ))}
                {scripts.length === 0 && (
                  <p className="text-[9px] text-muted-foreground/50 px-2 py-1">Không có scripts</p>
                )}
              </div>

              {/* Snippets */}
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase px-1 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Snippets
                </div>
                {EJS_SNIPPETS.map(s => (
                  <button key={s.id}
                    onClick={() => handleInsertSnippet(s.code)}
                    className="w-full text-left px-2 py-1.5 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 shrink-0 text-amber-400/60" />
                      <span className="truncate">{s.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ CENTER PANEL: Code Editor ═══ */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Editor mode tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/10 shrink-0">
            <button onClick={() => setActiveView('ejs')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                activeView === 'ejs' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <FileCode className="w-3 h-3" /> EJS Editor
            </button>
            <button onClick={() => setActiveView('analyzer')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                activeView === 'analyzer' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Microscope className="w-3 h-3" /> JS Analyzer
            </button>

            <div className="flex-1" />

            {/* Save button */}
            {activeView === 'ejs' && selectedEntryId !== null && isDirty && (
              <button onClick={handleSaveToEntry}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Check className="w-3 h-3" /> Lưu vào Entry #{selectedEntryId}
              </button>
            )}
          </div>

          {/* Editor content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {activeView === 'ejs' && (
              <EJSEditor
                content={ejsContent}
                onChange={(v) => { setEjsContent(v); setIsDirty(true); }}
                schema={schema}
              />
            )}
            {activeView === 'analyzer' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background overflow-hidden">
                  <div className="px-4 py-2 border-b border-border bg-muted/20">
                    <span className="text-xs font-medium">TavernHelper Script (JS)</span>
                  </div>
                  <textarea
                    value={jsContent}
                    onChange={e => setJsContent(e.target.value)}
                    rows={14}
                    spellCheck={false}
                    className="w-full px-4 py-3 bg-transparent text-xs font-mono resize-y
                      focus:outline-none leading-relaxed"
                    style={{ tabSize: 2 }}
                  />
                </div>
                <JSAnalyzerPanel code={jsContent} schema={schema} />
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL: Preview + Analysis ═══ */}
        {showRightPanel && (
          <div className="w-80 shrink-0 border-l border-border bg-card/30 flex flex-col overflow-hidden">
            {/* Right panel tabs */}
            <div className="flex gap-0.5 p-1.5 border-b border-border bg-muted/10 shrink-0">
              {([
                { id: 'preview', label: 'Preview', icon: Eye },
                { id: 'reference', label: 'Reference', icon: BookOpen },
              ] as const).map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id}
                    onClick={() => setRightPanel(t.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      rightPanel === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    <Icon className="w-3 h-3" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Right panel content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
              {rightPanel === 'preview' && (
                <EJSPreviewPanel content={activeView === 'ejs' ? ejsContent : jsContent} schema={schema} />
              )}
              {rightPanel === 'reference' && (
                <BuiltinReference />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Built-in Function Reference ────────────────────────────────────────

function BuiltinReference() {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(BUILTIN_FUNCTIONS[0].group);

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold flex items-center gap-1.5 mb-3">
        <BookOpen className="w-3.5 h-3.5 text-primary" />
        Built-in Functions Reference
      </div>

      {BUILTIN_FUNCTIONS.map(group => (
        <div key={group.group} className="rounded-lg border border-border overflow-hidden">
          <button onClick={() => setExpandedGroup(expandedGroup === group.group ? null : group.group)}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium hover:bg-muted/30 transition-colors">
            {expandedGroup === group.group ? <ChevronDown className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 -rotate-90" />}
            {group.group}
            <span className="text-muted-foreground/50 ml-auto">{group.funcs.length}</span>
          </button>

          {expandedGroup === group.group && (
            <div className="px-3 pb-3 space-y-2">
              {group.funcs.map((func, i) => (
                <div key={i} className="rounded-md bg-muted/20 p-2">
                  <code className="text-[10px] font-mono text-primary block">{func.name}</code>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{func.desc}</p>
                  <code className="text-[9px] font-mono text-muted-foreground/60 mt-1 block bg-background/50 rounded px-1.5 py-0.5">
                    {func.example}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Warnings */}
      <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-1.5 mt-4">
        <p className="text-[10px] font-medium text-amber-400">⚠️ Lưu ý quan trọng</p>
        <p className="text-[9px] text-amber-400/80">• KHÔNG dùng <code>this.variables</code> trong @@preprocessing — dùng <code>getvar()</code></p>
        <p className="text-[9px] text-amber-400/80">• stat_data dùng dấu chấm (<code>.</code>) làm path separator, KHÔNG phải gạch chéo (<code>/</code>)</p>
        <p className="text-[9px] text-amber-400/80">• Khi tạo card: <strong>tắt</strong> EJS để AI thấy code gốc</p>
        <p className="text-[9px] text-amber-400/80">• Khi chơi: <strong>bật</strong> EJS để AI thấy kết quả render</p>
      </div>
    </div>
  );
}
