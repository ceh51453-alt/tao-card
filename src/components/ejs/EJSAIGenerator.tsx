/**
 * EJSAIGenerator — AI-Powered EJS Code Generator (Phase 2 Upgrade)
 * Nằm trong right panel của EJS Studio. Gọi AI sinh EJS code
 * và tự động tạo worldbook entry mới.
 *
 * Phase 2 additions:
 * - Entry picker: chọn entries cụ thể cho context
 * - Schema field picker: chọn fields cụ thể
 * - Iteration mode: gửi code hiện tại + feedback cho AI sửa
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Wand2, Loader2, Copy, Check, Plus,
  ChevronDown, Sparkles, AlertTriangle,
  BookPlus, RotateCcw, ListFilter, Columns3, Pencil,
} from 'lucide-react';
import type { MVUZODSchema } from '../../types/mvuzod.types';
import type { LorebookEntry, ChatMessage } from '../../types';
import { DEFAULT_ENTRY_EXT } from '../../types/lorebook.types';
import { useCardStore } from '../../store/cardStore';
import { useSettingsStore } from '../../store/settingsStore';
import { callAI } from '../../lib/ai/client';
import { nextEntryId } from '../../lib/converters/cardDefaults';
import {
  EJS_SYSTEM_PROMPT,
  EJS_TEMPLATE_LABELS,
  buildEjsUserPrompt,
  parseEjsResponse,
  flattenAllFields,
  type EJSTemplateCategory,
  type EJSGenerationResult,
} from '../../prompts/ejsPrompt';

// ─── Props ──────────────────────────────────────────────────────────────────

interface EJSAIGeneratorProps {
  schema: MVUZODSchema | null;
  onInsertCode: (code: string) => void;
  currentEditorCode?: string; // Phase 2: for iteration mode
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EJSAIGenerator({ schema, onInsertCode, currentEditorCode }: EJSAIGeneratorProps) {
  const card = useCardStore(s => s.card);
  const addEntry = useCardStore(s => s.addEntry);
  const entries = useMemo(
    () => card.data.character_book?.entries ?? [],
    [card.data.character_book?.entries],
  );
  const characterName = card.data.name || 'Character';

  // State — Generation
  const [category, setCategory] = useState<EJSTemplateCategory>('conditional_entry');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [result, setResult] = useState<EJSGenerationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<number | null>(null);
  const [showContext, setShowContext] = useState(false);

  // State — Phase 2: Smart context
  const [showEntryPicker, setShowEntryPicker] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(new Set());
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [selectedFieldPaths, setSelectedFieldPaths] = useState<Set<string>>(new Set());

  // State — Phase 2: Iteration mode
  const [iterationMode, setIterationMode] = useState(false);
  const [iterationFeedback, setIterationFeedback] = useState('');

  // Derived data
  const nonEjsEntries = useMemo(
    () => entries.filter(e => !e.content.trimStart().startsWith('@@preprocessing')),
    [entries],
  );

  const flatFields = useMemo(
    () => schema ? flattenAllFields(schema.fields) : [],
    [schema],
  );

  // Context summary
  const contextSummary = useMemo(() => {
    const schemaFields = schema?.fields?.length ?? 0;
    const ejsEntries = entries.filter(e => e.content.trimStart().startsWith('@@preprocessing')).length;
    const normalEntries = entries.length - ejsEntries;
    return { schemaFields, ejsEntries, normalEntries, characterName };
  }, [schema, entries, characterName]);

  // ─── Toggle Helpers ───
  const toggleEntryId = useCallback((id: number) => {
    setSelectedEntryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleFieldPath = useCallback((path: string) => {
    setSelectedFieldPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // ─── Generate Handler ───
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setResult(null);
    setSavedEntryId(null);
    setLoadingStatus('Đang chuẩn bị...');

    try {
      const activeProfile = useSettingsStore.getState().getActiveProfile();
      const params = useSettingsStore.getState().generationParams;

      if (!activeProfile?.apiKey) {
        throw new Error('Chưa cấu hình API AI. Vui lòng vào Settings để cấu hình API Key và Model.');
      }

      setLoadingStatus(`Đang kết nối ${activeProfile.label}...`);

      const userPrompt = buildEjsUserPrompt(
        category,
        schema,
        entries,
        characterName,
        customInstructions,
        {
          selectedEntryIds: selectedEntryIds.size > 0 ? [...selectedEntryIds] : undefined,
          selectedFieldPaths: selectedFieldPaths.size > 0 ? [...selectedFieldPaths] : undefined,
          iterationCode: iterationMode ? currentEditorCode : undefined,
          iterationFeedback: iterationMode ? iterationFeedback : undefined,
        },
      );

      const messages: ChatMessage[] = [
        { role: 'system', content: EJS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ];

      setLoadingStatus('Đang gửi yêu cầu tới AI...');

      // Call AI with retry
      const MAX_RETRIES = 2;

      for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        if (attempt > 1) {
          setLoadingStatus(`Thử lại lần ${attempt}/${MAX_RETRIES + 1}...`);
        }

        try {
          let fullText = '';
          let isTruncated = true;
          let callCount = 0;
          const maxCalls = 3;
          let currentMessages = [...messages];

          while (isTruncated && callCount < maxCalls) {
            callCount++;
            if (callCount > 1) {
              setLoadingStatus(`Token limit, yêu cầu viết tiếp (lượt ${callCount})...`);
            }

            const response = await callAI({
              profile: activeProfile,
              params: {
                ...params,
                temperature: attempt > 1 ? 0.3 : params.temperature,
                useJsonResponseFormat: true,
              },
              messages: currentMessages,
            });

            fullText += response.text;
            const reason = response.finishReason;

            isTruncated = ['MAX_TOKENS', 'max_tokens', 'length'].includes(reason || '');

            if (isTruncated && response.text.trim()) {
              currentMessages = [
                ...currentMessages,
                { role: 'assistant', content: response.text },
                { role: 'user', content: 'Viết tiếp phần JSON bị bỏ dở. KHÔNG viết lại phần đã có.' },
              ];
            } else {
              isTruncated = false;
            }
          }

          setLoadingStatus('Đang phân tích phản hồi...');

          const parsed = parseEjsResponse(fullText);
          setResult(parsed);

          // Auto-save to worldbook entry (skip in iteration mode — just update editor)
          if (!iterationMode) {
            const newId = nextEntryId(entries);
            const newEntry: LorebookEntry = {
              id: newId,
              keys: ['@@ejs'],
              secondary_keys: [],
              comment: parsed.entryComment || `EJS: ${EJS_TEMPLATE_LABELS[category].label}`,
              content: parsed.code,
              constant: true,
              selective: false,
              insertion_order: 100,
              enabled: true,
              position: 'before_char',
              use_regex: false,
              extensions: {
                ...DEFAULT_ENTRY_EXT,
                position: 4,
                depth: 4,
                display_index: newId,
                exclude_recursion: true,
                prevent_recursion: true,
              },
            };

            addEntry(newEntry);
            setSavedEntryId(newId);
            setLoadingStatus(`Đã tạo entry #${newId} thành công!`);
          } else {
            setLoadingStatus('AI đã sửa code. Nhấn "Chèn vào Editor" để áp dụng.');
          }

          break; // Success
        } catch (e) {
          if (attempt > MAX_RETRIES) throw e;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoadingStatus('');
    } finally {
      setGenerating(false);
    }
  }, [category, schema, entries, characterName, customInstructions, addEntry,
    selectedEntryIds, selectedFieldPaths, iterationMode, currentEditorCode, iterationFeedback]);

  // ─── Handlers ───
  const handleCopy = useCallback(() => {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleInsert = useCallback(() => {
    if (!result?.code) return;
    onInsertCode(result.code);
  }, [result, onInsertCode]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoadingStatus('');
    setSavedEntryId(null);
    setIterationMode(false);
    setIterationFeedback('');
  }, []);

  const catEntries = Object.entries(EJS_TEMPLATE_LABELS) as [EJSTemplateCategory, typeof EJS_TEMPLATE_LABELS[EJSTemplateCategory]][];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="text-xs font-semibold flex items-center gap-1.5 mb-2">
        <Wand2 className="w-3.5 h-3.5 text-primary" />
        AI EJS Generator
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium ml-auto">v2</span>
      </div>

      {/* Mode toggle: Generate vs Iterate */}
      {currentEditorCode && (
        <div className="flex gap-1">
          <button
            onClick={() => setIterationMode(false)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
              !iterationMode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3 h-3" /> Tạo mới
          </button>
          <button
            onClick={() => setIterationMode(true)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
              iterationMode ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil className="w-3 h-3" /> Sửa code
          </button>
        </div>
      )}

      {/* Iteration mode feedback */}
      {iterationMode && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-1.5">
          <p className="text-[9px] text-amber-400 font-medium">
            📝 Sẽ gửi code trong editor hiện tại cho AI sửa
          </p>
          <textarea
            value={iterationFeedback}
            onChange={e => setIterationFeedback(e.target.value)}
            placeholder="Mô tả cần sửa gì... VD: 'Thêm check null cho getvar', 'Sửa logic HP bar'"
            rows={2}
            className="w-full px-2 py-1.5 text-[10px] rounded-md border border-amber-500/20 bg-background
              focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-y placeholder:text-muted-foreground/40"
          />
        </div>
      )}

      {/* Template selector (hidden in iteration mode) */}
      {!iterationMode && (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground block mb-1">Loại template</label>
          <div className="space-y-1">
            {catEntries.map(([key, val]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                disabled={generating}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] transition-all ${
                  category === key
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{val.emoji}</span>
                  <span className="font-medium">{val.label}</span>
                </div>
                {category === key && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 ml-5">{val.desc}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Context summary + pickers */}
      <div>
        <button
          onClick={() => setShowContext(!showContext)}
          className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showContext ? <ChevronDown className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 -rotate-90" />}
          Context ({contextSummary.schemaFields} fields, {contextSummary.normalEntries} entries)
          {(selectedEntryIds.size > 0 || selectedFieldPaths.size > 0) && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary ml-1">
              {selectedEntryIds.size > 0 ? `${selectedEntryIds.size} entries` : ''}
              {selectedEntryIds.size > 0 && selectedFieldPaths.size > 0 ? ' + ' : ''}
              {selectedFieldPaths.size > 0 ? `${selectedFieldPaths.size} fields` : ''}
            </span>
          )}
        </button>
        {showContext && (
          <div className="mt-1 space-y-2">
            <div className="rounded-md bg-muted/20 p-2 text-[9px] text-muted-foreground space-y-0.5">
              <p>🧩 Schema fields: {contextSummary.schemaFields}</p>
              <p>📝 Normal entries: {contextSummary.normalEntries}</p>
              <p>⚡ EJS entries: {contextSummary.ejsEntries}</p>
              <p>👤 Character: {contextSummary.characterName}</p>
            </div>

            {/* Entry picker */}
            <div>
              <button
                onClick={() => setShowEntryPicker(!showEntryPicker)}
                className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
              >
                <ListFilter className="w-3 h-3" />
                Chọn entries cụ thể
                {selectedEntryIds.size > 0 && (
                  <span className="text-[8px] text-primary">({selectedEntryIds.size})</span>
                )}
              </button>
              {showEntryPicker && (
                <div className="mt-1 rounded-md border border-border max-h-32 overflow-y-auto scrollbar-thin">
                  {nonEjsEntries.length > 0 ? (
                    <>
                      <button
                        onClick={() => setSelectedEntryIds(new Set())}
                        className="w-full text-left px-2 py-1 text-[9px] text-muted-foreground hover:bg-muted/30 border-b border-border/50"
                      >
                        ✖ Bỏ chọn tất cả
                      </button>
                      {nonEjsEntries.map(e => (
                        <label key={e.id} className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted/20 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedEntryIds.has(e.id)}
                            onChange={() => toggleEntryId(e.id)}
                            className="w-3 h-3 rounded border-border"
                          />
                          <span className="text-[9px] truncate flex-1">
                            {e.comment || `#${e.id}`}
                          </span>
                          <span className="text-[8px] text-muted-foreground/50">
                            {e.keys.slice(0, 2).join(', ')}
                          </span>
                        </label>
                      ))}
                    </>
                  ) : (
                    <p className="text-[9px] text-muted-foreground/50 p-2">Không có entries</p>
                  )}
                </div>
              )}
            </div>

            {/* Field picker */}
            {schema && flatFields.length > 0 && (
              <div>
                <button
                  onClick={() => setShowFieldPicker(!showFieldPicker)}
                  className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <Columns3 className="w-3 h-3" />
                  Chọn schema fields
                  {selectedFieldPaths.size > 0 && (
                    <span className="text-[8px] text-primary">({selectedFieldPaths.size})</span>
                  )}
                </button>
                {showFieldPicker && (
                  <div className="mt-1 rounded-md border border-border max-h-32 overflow-y-auto scrollbar-thin">
                    <button
                      onClick={() => setSelectedFieldPaths(new Set())}
                      className="w-full text-left px-2 py-1 text-[9px] text-muted-foreground hover:bg-muted/30 border-b border-border/50"
                    >
                      ✖ Bỏ chọn tất cả
                    </button>
                    {flatFields.map(f => (
                      <label
                        key={f.path}
                        className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted/20 cursor-pointer"
                        style={{ paddingLeft: `${8 + f.depth * 12}px` }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFieldPaths.has(f.path)}
                          onChange={() => toggleFieldPath(f.path)}
                          className="w-3 h-3 rounded border-border"
                        />
                        <span className="text-[9px] truncate flex-1">{f.label}</span>
                        <span className="text-[8px] text-muted-foreground/50">{f.type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom instructions */}
      {!iterationMode && (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground block mb-1">
            Yêu cầu chi tiết {category !== 'custom' ? '(tuỳ chọn)' : '(bắt buộc)'}
          </label>
          <textarea
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            disabled={generating}
            placeholder={
              category === 'conditional_entry'
                ? 'VD: Bật entry "WB: Cổ đại" khi era = "Cổ đại"...'
                : category === 'custom'
                ? 'Mô tả EJS bạn muốn AI tạo...'
                : 'Yêu cầu bổ sung...'
            }
            rows={3}
            className="w-full px-2.5 py-1.5 text-[10px] rounded-lg border border-border bg-background
              focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y placeholder:text-muted-foreground/40"
          />
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={
          generating ||
          (!iterationMode && category === 'custom' && !customInstructions.trim()) ||
          (iterationMode && !currentEditorCode?.trim())
        }
        className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium
          ${iterationMode
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
          } text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm`}
      >
        {generating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{loadingStatus || 'Đang xử lý...'}</span>
          </>
        ) : iterationMode ? (
          <>
            <Pencil className="w-3.5 h-3.5" />
            Sửa code bằng AI
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Tạo EJS bằng AI
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-400">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2">
          {/* Explanation */}
          {result.explanation && (
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5">
              <p className="text-[10px] text-emerald-400">{result.explanation}</p>
            </div>
          )}

          {/* Saved notification */}
          {savedEntryId !== null && (
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 flex items-center gap-2">
              <BookPlus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <p className="text-[10px] text-blue-400">
                Đã tạo entry <strong>#{savedEntryId}</strong> — &quot;{result.entryComment}&quot;
              </p>
            </div>
          )}

          {/* Code preview */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-2.5 py-1.5 border-b border-border bg-muted/20 flex items-center gap-2">
              <span className="text-[10px] font-medium flex-1 truncate">
                {result.entryComment}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {result.code.split('\n').length} dòng
              </span>
            </div>
            <pre className="px-2.5 py-2 text-[9px] font-mono leading-relaxed overflow-x-auto max-h-48 overflow-y-auto scrollbar-thin bg-background/50">
              {result.code}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5">
            <button
              onClick={handleInsert}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium
                bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Chèn vào Editor
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium
                bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Đã copy' : 'Copy'}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium
                bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Tạo lại"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
