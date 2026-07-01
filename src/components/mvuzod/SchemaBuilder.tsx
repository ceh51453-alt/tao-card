/**
 * SchemaBuilder — Thay thế SchemaWizard hoàn toàn.
 * Tham khảo spec MVU_ZOD (enterprise20020924-web/-):
 *   - Schema = z.object({ ... }) code thực
 *   - Prefix _ (readonly), $ (hidden)
 *   - z.coerce.number(), z.string().prefault(), z.record(), z.partialRecord()
 *   - Object-level .transform() (takeRight, pickBy)
 *
 * Kiến trúc: 2-panel layout
 *   Left:  Schema Tree + Source selection
 *   Right: Field Detail Editor + Actions + Live Zod Code Preview
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Trash2, ChevronRight, ChevronDown, Wand2,
  FileJson, Copy, CheckCircle, AlertTriangle, EyeOff,
  Lock, FolderPlus,
  Code, Layers, Scan, RotateCcw,
  Zap, ListOrdered, LayoutList, Square,
  Lightbulb, Brain, Loader2, Sparkles,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import type { MVUZODSchema, MVUZODField, MVUZODConstraints } from '../../types/mvuzod.types';
import type { LorebookEntry, CardExtensions } from '../../types';
import { MVUZOD_TEMPLATES, type MVUZODTemplate } from '../../lib/mvuzod/templateLibrary';
import { analyzeLorebookForSchema, buildMinimalSchemaFromReport, parseSchemaInferenceResponse, schemaToZodCode } from '../../lib/mvuzod/schemaInferencer';
import { buildMVUZODScripts } from '../../lib/mvuzod/tavernScriptBuilder';
import { useSettingsStore } from '../../store/settingsStore';
import { callAI } from '../../lib/ai/client';
import { MVUZOD_SCHEMA_INFERENCE_PROMPT, MVUZOD_IDEA_TO_SCHEMA_PROMPT, MVUZOD_EXPAND_VARIABLES_PROMPT } from '../../prompts/modeMVUZOD';
import type { ChatMessage } from '../../types';
import { cn } from '../../lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function SchemaBuilder() {
  const card = useCardStore(s => s.card);
  const setMvuzodSchema = useCardStore(s => s.setMvuzodSchema);
  const createSnapshot = useCardStore(s => s.createSnapshot);

  // Load schema from store (single source of truth)
  const schema: MVUZODSchema | null = useMemo(() => {
    const ext = card.data.extensions as unknown as Record<string, unknown>;
    if (ext?.mvuzod) {
      return (ext.mvuzod as Record<string, unknown>).schema as MVUZODSchema ?? null;
    }
    return null;
  }, [card.data.extensions]);

  const [selectedFieldPath, setSelectedFieldPath] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(!schema);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Entries for lorebook-based analysis
  const entries = useMemo(
    () => card.data.character_book?.entries ?? [],
    [card.data.character_book?.entries],
  );

  // ─── Schema mutations ───────────────────────────────────────────────
  const updateSchema = useCallback((newSchema: MVUZODSchema) => {
    setMvuzodSchema(newSchema);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }, [setMvuzodSchema]);

  const handleApplyTemplate = useCallback(async (template: MVUZODTemplate) => {
    if (schema) {
      await createSnapshot('Trước khi áp dụng template');
    }
    updateSchema({ ...template.schema });
    setShowSource(false);
  }, [schema, createSnapshot, updateSchema]);

  const handleApplyInferredSchema = useCallback(async (inferred: MVUZODSchema) => {
    if (schema) {
      await createSnapshot('Trước khi áp dụng AI inference');
    }
    updateSchema(inferred);
    setShowSource(false);
  }, [schema, createSnapshot, updateSchema]);

  const handleCreateNew = useCallback(async () => {
    if (schema) {
      await createSnapshot('Trước khi tạo schema mới');
    }
    updateSchema({
      version: '1.0',
      fields: [
        {
          path: '/世界',
          type: 'object',
          label: '世界',
          defaultValue: {},
          constraints: {},
          children: [
            { path: '/世界/当前時間', type: 'string', label: '当前時間', defaultValue: '', constraints: { prefault: 'Chưa khởi tạo' } },
            { path: '/世界/当前地点', type: 'string', label: '当前地点', defaultValue: '', constraints: { prefault: 'Chưa khởi tạo' } },
          ],
        },
        {
          path: '/主角',
          type: 'object',
          label: '主角',
          defaultValue: {},
          constraints: {},
          children: [
            { path: '/主角/物品栏', type: 'record', label: '物品栏', defaultValue: {}, constraints: { describe: '物品名', transform: 'pickBy' } },
          ],
        },
      ],
    });
    setShowSource(false);
  }, [schema, createSnapshot, updateSchema]);

  // ─── Field operations ───────────────────────────────────────────────
  const updateField = useCallback((path: string, updated: MVUZODField) => {
    if (!schema) return;
    const newFields = updateFieldInTree(schema.fields, path, updated);
    updateSchema({ ...schema, fields: newFields });
  }, [schema, updateSchema]);

  const deleteField = useCallback(async (path: string) => {
    if (!schema) return;
    await createSnapshot('Xóa field');
    const newFields = deleteFieldFromTree(schema.fields, path);
    updateSchema({ ...schema, fields: newFields });
    if (selectedFieldPath === path) setSelectedFieldPath(null);
  }, [schema, createSnapshot, updateSchema, selectedFieldPath]);

  const addField = useCallback((parentPath: string | null, type: MVUZODField['type']) => {
    if (!schema) return;
    const newField: MVUZODField = {
      path: parentPath ? `${parentPath}/Mới` : '/Mới',
      type,
      label: 'Mới',
      defaultValue: type === 'number' ? 0 : type === 'boolean' ? false : type === 'object' || type === 'record' ? {} : '',
      constraints: {},
      ...(type === 'object' ? { children: [] } : {}),
    };
    if (parentPath) {
      const newFields = addChildToTree(schema.fields, parentPath, newField);
      updateSchema({ ...schema, fields: newFields });
    } else {
      updateSchema({ ...schema, fields: [...schema.fields, newField] });
    }
    setSelectedFieldPath(newField.path);
  }, [schema, updateSchema]);

  // ─── Scripts ────────────────────────────────────────────────────────

  const handleCreateScripts = useCallback(async () => {
    if (!schema) return;
    await createSnapshot('Trước khi tạo scripts');
    const scripts = buildMVUZODScripts(schema, card.data.name);
    // Inject scripts into card.data.extensions.tavern_helper.scripts
    useCardStore.getState().updateCard(c => {
      const ext = (c.data.extensions ?? {}) as Record<string, unknown>;
      const th = (ext.tavern_helper ?? {}) as Record<string, unknown>;
      const existing = (th.scripts ?? []) as Array<{ name: string; content: string; enabled: boolean }>;
      for (const script of scripts) {
        const idx = existing.findIndex(s => s.name === script.name);
        if (idx >= 0) {
          existing[idx] = script;
        } else {
          existing.push(script);
        }
      }
      th.scripts = existing;
      ext.tavern_helper = th;
      c.data.extensions = ext as unknown as CardExtensions;
    });
  }, [schema, card.data.name, createSnapshot]);

  // ─── Selected field ─────────────────────────────────────────────────
  const selectedField = useMemo(() => {
    if (!selectedFieldPath || !schema) return null;
    return findFieldByPath(schema.fields, selectedFieldPath);
  }, [selectedFieldPath, schema]);

  // ─── Zod code preview ──────────────────────────────────────────────
  const zodCode = useMemo(() => {
    if (!schema) return '';
    try { return schemaToZodCode(schema, card.data.name); } catch { return '// Lỗi tạo Zod code'; }
  }, [schema, card.data.name]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        <button
          onClick={() => setShowSource(!showSource)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            showSource ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
        >
          <Layers className="w-3.5 h-3.5" /> Nguồn
        </button>

        <button
          onClick={() => setShowCodePreview(!showCodePreview)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            showCodePreview ? 'bg-violet-500/10 text-violet-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
        >
          <Code className="w-3.5 h-3.5" /> Zod Preview
        </button>

        <div className="flex-1" />

        {/* Save status indicator */}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <CheckCircle className="w-3 h-3" /> Auto-saved
          </span>
        )}

        {schema && (
          <span className="text-[10px] text-muted-foreground">
            {countFields(schema.fields)} fields
          </span>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Source or Tree */}
        <div className="w-1/2 border-r border-border overflow-y-auto">
          {showSource || !schema ? (
            <SchemaSourcePanel
              hasExistingSchema={!!schema}
              entries={entries}
              onApplyTemplate={handleApplyTemplate}
              onApplyInferred={handleApplyInferredSchema}
              onCreateNew={handleCreateNew}
            />
          ) : (
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schema Tree</h3>
                <div className="flex gap-1">
                  {(['object', 'string', 'number', 'record'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => addField(null, t)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      title={`Thêm ${t} gốc`}
                    >
                      +{t}
                    </button>
                  ))}
                </div>
              </div>
              {schema.fields.map(field => (
                <FieldTreeNode
                  key={field.path}
                  field={field}
                  depth={0}
                  selectedPath={selectedFieldPath}
                  onSelect={setSelectedFieldPath}
                  onDelete={deleteField}
                  onAddChild={(parentPath) => addField(parentPath, 'string')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel — Detail or Actions or Code */}
        <div className="w-1/2 overflow-y-auto">
          {showCodePreview && schema ? (
            <ZodCodePreview code={zodCode} />
          ) : selectedField && schema ? (
            <SchemaFieldDetail
              field={selectedField}
              onUpdate={(updated) => updateField(selectedFieldPath!, updated)}
              onDelete={() => deleteField(selectedFieldPath!)}
            />
          ) : schema ? (
            <ActionsPanel
              schema={schema}
              onCreateScripts={handleCreateScripts}
              onReset={() => { setShowSource(true); setSelectedFieldPath(null); }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              ← Chọn nguồn schema để bắt đầu
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA SOURCE PANEL
// ═══════════════════════════════════════════════════════════════════════════

function SchemaSourcePanel({
  hasExistingSchema,
  entries,
  onApplyTemplate,
  onApplyInferred,
  onCreateNew,
}: {
  hasExistingSchema: boolean;
  entries: Array<{ id: number; comment: string; content: string; keys: string[] }>;
  onApplyTemplate: (t: MVUZODTemplate) => void;
  onApplyInferred: (schema: MVUZODSchema) => Promise<void>;
  onCreateNew: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonImport, setShowJsonImport] = useState(false);

  // Scan mode state
  type ScanMode = 'all' | 'single' | 'batch';
  const [scanMode, setScanMode] = useState<ScanMode>('all');
  const [batchSize, setBatchSize] = useState(5);
  const [parallelCount, setParallelCount] = useState(1);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; results: string[] } | null>(null);
  const cancelRef = useRef(false);

  const entryCount = entries.length;
  const canAnalyze = entryCount >= 1;

  // Core AI call for a subset of entries
  const callAIForEntries = useCallback(async (
    subset: typeof entries,
    label: string,
  ): Promise<string> => {
    const activeProfile = useSettingsStore.getState().getActiveProfile();
    const params = useSettingsStore.getState().generationParams;
    if (!activeProfile || !activeProfile.apiKey) {
      throw new Error('Chưa cấu hình API AI. Vào Settings → API Key.');
    }

    setLoadingStatus(`${label} — Gửi ${subset.length} entries tới ${activeProfile.label}...`);

    const formattedEntries = subset
      .map(e => `ID: ${e.id}\nComment: ${e.comment}\nKeys: ${e.keys.join(',')}\nContent:\n${e.content}`)
      .join('\n\n---\n\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: MVUZOD_SCHEMA_INFERENCE_PROMPT },
      { role: 'user', content: `Dưới đây là ${subset.length} entries:\n\n${formattedEntries}\n\nPhân tích và trả về JSON.` },
    ];

    let fullText = '';
    let isTruncated = true;
    let callCount = 0;
    let currentMessages = messages;

    while (isTruncated && callCount < 4) {
      callCount++;
      if (callCount > 1) setLoadingStatus(`${label} — Tiếp tục phản hồi (lượt ${callCount})...`);

      const response = await callAI({
        profile: activeProfile,
        params: { ...params, useJsonResponseFormat: true },
        messages: currentMessages,
      });

      fullText += response.text;
      isTruncated = ['MAX_TOKENS', 'max_tokens', 'length'].includes(response.finishReason || '');

      if (isTruncated && response.text.trim()) {
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.text },
          { role: 'user', content: 'Viết tiếp phần còn thiếu.' },
        ];
      } else {
        isTruncated = false;
      }
    }

    return fullText;
  }, []);

  // Merge multiple partial schemas into one via AI
  const mergeSchemas = useCallback(async (partialResults: string[]): Promise<string> => {
    const activeProfile = useSettingsStore.getState().getActiveProfile();
    const params = useSettingsStore.getState().generationParams;
    if (!activeProfile || !activeProfile.apiKey) {
      throw new Error('Chưa cấu hình API AI. Vào Settings → API Key.');
    }

    setLoadingStatus('Tổng hợp kết quả từ các batch...');

    const mergePrompt = `Bạn là AI chuyên gia tổng hợp MVUZOD schema.

Dưới đây là ${partialResults.length} kết quả phân tích schema từ các batch entries khác nhau.
Hãy MERGE (hợp nhất) tất cả thành MỘT schema duy nhất.

Quy tắc merge:
• Gộp các fields trùng path thành một, giữ constraints đầy đủ nhất
• Gộp enum values từ các batch
• Gộp analysis.groups, cộng dồn count
• Giữ warnings từ tất cả batch
• Trả về đúng cấu trúc JSON như MVUZOD_SCHEMA_INFERENCE_PROMPT yêu cầu

CHỈ trả về JSON, KHÔNG giải thích.`;

    const batchSummary = partialResults.map((r, i) => `=== Batch ${i + 1} ===\n${r}`).join('\n\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: mergePrompt },
      { role: 'user', content: batchSummary },
    ];

    let fullText = '';
    let isTruncated = true;
    let callCount = 0;
    let currentMessages = messages;

    while (isTruncated && callCount < 4) {
      callCount++;
      const response = await callAI({
        profile: activeProfile,
        params: { ...params, useJsonResponseFormat: true },
        messages: currentMessages,
      });
      fullText += response.text;
      isTruncated = ['MAX_TOKENS', 'max_tokens', 'length'].includes(response.finishReason || '');
      if (isTruncated && response.text.trim()) {
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.text },
          { role: 'user', content: 'Viết tiếp phần còn thiếu.' },
        ];
      } else {
        isTruncated = false;
      }
    }

    return fullText;
  }, []);

  const handleAIAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    cancelRef.current = false;
    setScanProgress(null);
    setLoadingStatus('Đang kết nối AI...');

    try {
      let finalText: string;

      if (scanMode === 'all') {
        // ─── Mode 1: Quét tất cả cùng lúc ───
        finalText = await callAIForEntries(entries, `Quét tất cả (${entries.length})`);
      } else {
        // ─── Mode 2 & 3: Quét từng entry hoặc theo batch ───
        const chunkSize = scanMode === 'single' ? 1 : batchSize;
        const chunks: (typeof entries)[] = [];
        for (let i = 0; i < entries.length; i += chunkSize) {
          chunks.push(entries.slice(i, i + chunkSize));
        }

        const concurrency = scanMode === 'single' ? parallelCount : parallelCount;
        const partialResults: (string | null)[] = new Array(chunks.length).fill(null);
        let completed = 0;
        setScanProgress({ current: 0, total: chunks.length, results: [] });

        // Process chunks with concurrency limit
        for (let wave = 0; wave < chunks.length; wave += concurrency) {
          if (cancelRef.current) break;

          const waveEnd = Math.min(wave + concurrency, chunks.length);
          const waveIndices = Array.from({ length: waveEnd - wave }, (_, k) => wave + k);

          setLoadingStatus(
            concurrency > 1
              ? `Song song ${waveIndices.length} batch (${wave + 1}–${waveEnd}/${chunks.length})...`
              : scanMode === 'single'
                ? `Entry ${wave + 1}/${chunks.length}: ${chunks[wave][0]?.comment || `ID ${chunks[wave][0]?.id}`}`
                : `Batch ${wave + 1}/${chunks.length} (${chunks[wave].length} entries)`
          );

          const wavePromises = waveIndices.map(async (idx) => {
            const chunk = chunks[idx];
            const label = scanMode === 'single'
              ? `Entry ${idx + 1}/${chunks.length}: ${chunk[0]?.comment || `ID ${chunk[0]?.id}`}`
              : `Batch ${idx + 1}/${chunks.length} (${chunk.length} entries)`;
            return { idx, result: await callAIForEntries(chunk, label) };
          });

          const settled = await Promise.allSettled(wavePromises);

          for (const outcome of settled) {
            if (outcome.status === 'fulfilled') {
              partialResults[outcome.value.idx] = outcome.value.result;
              completed++;
            } else {
              console.error('Batch failed:', outcome.reason);
              completed++;
            }
          }

          setScanProgress({
            current: completed,
            total: chunks.length,
            results: partialResults.filter((r): r is string => r !== null),
          });
        }

        // Handle cancel with partial results
        const validResults = partialResults.filter((r): r is string => r !== null);
        if (cancelRef.current) {
          setLoadingStatus('Đã hủy quét.');
          if (validResults.length > 0) {
            setLoadingStatus('Tổng hợp kết quả đã quét...');
            if (validResults.length === 1) {
              finalText = validResults[0];
            } else {
              finalText = await mergeSchemas(validResults);
            }
            setLoadingStatus('Phân tích phản hồi...');
            const parsed = parseSchemaInferenceResponse(finalText!);
            if (parsed.proposedSchema) {
              await onApplyInferred(parsed.proposedSchema);
            }
          }
          return;
        }

        // Merge results if multiple batches
        if (validResults.length === 1) {
          finalText = validResults[0];
        } else if (validResults.length > 1) {
          finalText = await mergeSchemas(validResults);
        } else {
          throw new Error('Không có kết quả nào từ quét.');
        }
      }

      setLoadingStatus('Phân tích phản hồi...');
      const parsed = parseSchemaInferenceResponse(finalText!);
      if (!parsed.proposedSchema) throw new Error('AI không trả về schema hợp lệ.');

      await onApplyInferred(parsed.proposedSchema);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setLoadingStatus('');
      setScanProgress(null);
      cancelRef.current = false;
    }
  }, [entries, onApplyInferred, scanMode, batchSize, parallelCount, callAIForEntries, mergeSchemas]);

  const handleStaticAnalyze = useCallback(async () => {
    const report = analyzeLorebookForSchema(entries as LorebookEntry[]);
    const minimal = buildMinimalSchemaFromReport(report);
    await onApplyInferred(minimal);
  }, [entries, onApplyInferred]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  // ─── Idea-to-schema state & handler ───
  const [ideaText, setIdeaText] = useState('');
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [ideaStatus, setIdeaStatus] = useState('');

  const IDEA_CHIPS = [
    { label: '⚔️ RPG chiến đấu', text: 'Game RPG chiến đấu với hệ thống HP, MP, cấp độ, kỹ năng, túi đồ, và NPC đồng hành' },
    { label: '🏔️ Tu tiên / Tu luyện', text: 'Card tu tiên tu luyện với cảnh giới, linh lực, kỹ pháp, đan dược, và hệ thống tông môn' },
    { label: '💕 Hẹn hò / Dating sim', text: 'Dating sim với nhiều NPC có cảm xúc, sự kiện hẹn hò, quà tặng, và nhiều route' },
    { label: '🏰 Chiến lược / Đế quốc', text: 'Game chiến lược đế quốc với tài nguyên (vàng/lương/quân), lãnh thổ, ngoại giao, và hội đồng' },
    { label: '🗡️ Dungeon Crawler', text: 'Dungeon crawler với HP, giáp, vũ khí, tầng, boss, bẫy, và kho báu' },
    { label: '🌸 Đời thường', text: 'Slice of life với tâm trạng, sức khỏe, tiền, công việc, mối quan hệ, và thời tiết' },
    { label: '🔍 Trinh thám', text: 'Trinh thám mystery với manh mối, nghi phạm, địa điểm điều tra, và timeline' },
    { label: '💰 Kinh tế', text: 'Kinh tế thương mại với vàng, hàng hóa, danh tiếng, hợp đồng, và thị trường' },
  ];

  const handleIdeaGenerate = useCallback(async () => {
    if (!ideaText.trim()) return;

    setIdeaLoading(true);
    setError(null);
    setIdeaStatus('Đang kết nối AI...');

    try {
      const activeProfile = useSettingsStore.getState().getActiveProfile();
      const params = useSettingsStore.getState().generationParams;

      if (!activeProfile || !activeProfile.apiKey) {
        throw new Error('Chưa cấu hình API AI. Vào Settings → API Key.');
      }

      setIdeaStatus(`Đang gửi ý tưởng tới ${activeProfile.label}...`);

      const messages: ChatMessage[] = [
        { role: 'system', content: MVUZOD_IDEA_TO_SCHEMA_PROMPT },
        { role: 'user', content: `Ý TƯỞNG CỦA TÔI:\n\n${ideaText.trim()}\n\nHãy thiết kế MVUZOD schema phù hợp. Trả về JSON.` },
      ];

      let fullText = '';
      let isTruncated = true;
      let callCount = 0;
      let currentMessages = messages;

      while (isTruncated && callCount < 4) {
        callCount++;
        if (callCount > 1) setIdeaStatus(`Tiếp tục phản hồi (lượt ${callCount})...`);

        const response = await callAI({
          profile: activeProfile,
          params: { ...params, useJsonResponseFormat: true },
          messages: currentMessages,
        });

        fullText += response.text;
        isTruncated = ['MAX_TOKENS', 'max_tokens', 'length'].includes(response.finishReason || '');

        if (isTruncated && response.text.trim()) {
          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.text },
            { role: 'user', content: 'Viết tiếp phần còn thiếu.' },
          ];
        } else {
          isTruncated = false;
        }
      }

      setIdeaStatus('Phân tích phản hồi...');
      const parsed = parseSchemaInferenceResponse(fullText);
      if (!parsed.proposedSchema) throw new Error('AI không trả về schema hợp lệ.');

      await onApplyInferred(parsed.proposedSchema);
      setIdeaStatus('Tạo schema thành công!');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIdeaLoading(false);
      setTimeout(() => setIdeaStatus(''), 2000);
    }
  }, [ideaText, onApplyInferred]);

  const isAnyLoading = loading || ideaLoading;

  return (
    <div className="p-4 space-y-5">
      {hasExistingSchema && (
        <div className="rounded-lg p-3 border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
          Đã có schema. Chọn nguồn mới sẽ <strong>ghi đè</strong> (có snapshot backup).
        </div>
      )}

      {/* Lorebook status */}
      <div className={cn(
        'rounded-lg p-3 border',
        entryCount >= 20 ? 'bg-emerald-500/5 border-emerald-500/20' :
        entryCount >= 5 ? 'bg-amber-500/5 border-amber-500/20' :
        'bg-destructive/5 border-destructive/20',
      )}>
        <div className="flex items-center gap-2 text-xs">
          {entryCount >= 20 ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> :
           <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
          <span className="font-medium">{entryCount} entries trong Lorebook</span>
        </div>
      </div>

      {/* AI Inference */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-primary" /> Phân tích AI
        </h4>

        {error && (
          <div className="rounded-lg p-3 border border-destructive/20 bg-destructive/5 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Scan mode selector */}
        {!loading && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Chế độ quét</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { mode: 'all' as ScanMode, icon: Zap, label: 'Tất cả', desc: `Gửi ${entryCount} entries 1 lần` },
                { mode: 'single' as ScanMode, icon: ListOrdered, label: 'Từng entry', desc: 'Quét lần lượt từng cái' },
                { mode: 'batch' as ScanMode, icon: LayoutList, label: 'Theo batch', desc: `Quét mỗi lần N entries` },
              ]).map(({ mode, icon: Icon, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => setScanMode(mode)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-center transition-all',
                    scanMode === mode
                      ? 'border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/10'
                      : 'border-border bg-background/50 text-muted-foreground hover:border-primary/20 hover:bg-primary/5',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-medium">{label}</span>
                  <span className="text-[8px] leading-tight opacity-70">{desc}</span>
                </button>
              ))}
            </div>

            {/* Batch size config */}
            {scanMode === 'batch' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Số entries / batch:</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, entryCount)}
                  value={batchSize}
                  onChange={e => setBatchSize(Math.max(1, Math.min(entryCount, parseInt(e.target.value) || 1)))}
                  className="w-14 px-2 py-1 text-xs text-center rounded border border-border bg-background
                    focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <span className="text-[9px] text-muted-foreground">
                  = {Math.ceil(entryCount / batchSize)} batch{Math.ceil(entryCount / batchSize) > 1 ? 'es' : ''}
                </span>
              </div>
            )}

            {/* Parallel concurrency config — shown for batch & single modes */}
            {(scanMode === 'batch' || scanMode === 'single') && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-500/20 bg-violet-500/5">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Song song:</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, scanMode === 'batch' ? Math.ceil(entryCount / batchSize) : entryCount)}
                  value={parallelCount}
                  onChange={e => {
                    const maxP = scanMode === 'batch' ? Math.ceil(entryCount / batchSize) : entryCount;
                    setParallelCount(Math.max(1, Math.min(maxP, parseInt(e.target.value) || 1)));
                  }}
                  className="w-14 px-2 py-1 text-xs text-center rounded border border-border bg-background
                    focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                />
                <span className="text-[9px] text-muted-foreground">
                  {parallelCount === 1 ? 'tuần tự' : `${parallelCount} cùng lúc`}
                </span>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg p-4 border border-primary/20 bg-primary/5 flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-[10px] text-muted-foreground animate-pulse text-center">{loadingStatus}</p>

            {/* Progress bar for batch/single mode */}
            {scanProgress && (
              <div className="w-full space-y-1.5">
                <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
                    style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>{scanProgress.current}/{scanProgress.total} {scanMode === 'single' ? 'entries' : 'batches'}</span>
                  <span>{Math.round((scanProgress.current / scanProgress.total) * 100)}%</span>
                </div>
              </div>
            )}

            {/* Cancel button */}
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10
                text-destructive text-[10px] font-medium hover:bg-destructive/20 transition-colors"
            >
              <Square className="w-3 h-3" /> Dừng quét
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleAIAnalyze} disabled={!canAnalyze}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium
                hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Scan className="w-3.5 h-3.5" />
              {scanMode === 'all' ? 'AI Inference' : scanMode === 'single' ? 'Quét từng entry' : `Quét batch (×${batchSize})`}
            </button>
            <button onClick={handleStaticAnalyze} disabled={!canAnalyze}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-medium
                hover:bg-muted/80 disabled:opacity-50 transition-colors">
              Phân tích tĩnh
            </button>
          </div>
        )}
      </div>

      {/* ─── Idea-to-schema ─── */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Tạo từ ý tưởng
        </h4>
        <p className="text-[10px] text-muted-foreground">
          Mô tả ý tưởng game/card — AI sẽ thiết kế schema phù hợp, không cần lorebook.
        </p>

        {/* Quick genre chips */}
        <div className="flex flex-wrap gap-1">
          {IDEA_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => setIdeaText(prev => prev ? `${prev}\n${chip.text}` : chip.text)}
              disabled={isAnyLoading}
              className="px-2 py-1 rounded-full text-[9px] border border-border bg-background/50
                hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Idea textarea */}
        <textarea
          value={ideaText}
          onChange={e => setIdeaText(e.target.value)}
          disabled={isAnyLoading}
          placeholder={`Mô tả chi tiết ý tưởng card của bạn. Ví dụ:

• Game tu tiên có 9 cảnh giới, hệ thống linh lực, kỹ pháp, đan dược
• Nhân vật chính có HP/MP, inventory, và NPC đồng hành
• Có hệ thống tông môn với ranking và nhiệm vụ
• Muốn track mối quan hệ với 5 NPC chính`}
          className="w-full px-3 py-2.5 text-xs rounded-lg border border-border bg-background
            placeholder:text-muted-foreground/40 resize-y
            focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400/40 transition-all"
          rows={5}
        />

        {/* Generate button & status */}
        {ideaLoading ? (
          <div className="rounded-lg p-4 border border-amber-500/20 bg-amber-500/5 flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-[10px] text-muted-foreground animate-pulse text-center">{ideaStatus}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleIdeaGenerate}
              disabled={!ideaText.trim() || isAnyLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500
                text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all
                shadow-sm shadow-amber-500/20"
            >
              <Brain className="w-3.5 h-3.5" /> AI Thiết kế Schema
            </button>
            {ideaStatus && (
              <span className="text-[10px] text-emerald-400">{ideaStatus}</span>
            )}
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-violet-400" /> Templates có sẵn
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {MVUZOD_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => onApplyTemplate(t)}
              className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-border bg-background/50
                hover:bg-primary/5 hover:border-primary/30 transition-colors text-left">
              <span className="text-base">{t.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium truncate">{t.name}</p>
                <p className="text-[9px] text-muted-foreground truncate">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Create new / JSON import */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-emerald-400" /> Khác
        </h4>
        <div className="flex gap-2">
          <button onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs
              hover:bg-primary/5 hover:border-primary/30 transition-colors">
            <FolderPlus className="w-3.5 h-3.5" /> Tạo trống
          </button>
          <button onClick={() => setShowJsonImport(!showJsonImport)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs
              hover:bg-primary/5 hover:border-primary/30 transition-colors">
            <FileJson className="w-3.5 h-3.5" /> Import JSON
          </button>
        </div>

        {showJsonImport && (
          <div className="space-y-1.5">
            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder='{"version":"1.0","fields":[...]}'
              rows={4}
              className="w-full px-3 py-2 text-[10px] font-mono rounded-lg border border-border bg-background
                focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            />
            <button
              onClick={async () => {
                try {
                  const parsed = JSON.parse(jsonInput) as MVUZODSchema;
                  if (!parsed.fields) throw new Error('Missing fields');
                  await onApplyInferred(parsed);
                  setShowJsonImport(false);
                  setJsonInput('');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'JSON không hợp lệ');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
            >
              Áp dụng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD TREE NODE
// ═══════════════════════════════════════════════════════════════════════════

function FieldTreeNode({
  field,
  depth,
  selectedPath,
  onSelect,
  onDelete,
  onAddChild,
}: {
  field: MVUZODField;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onAddChild: (parentPath: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = field.children && field.children.length > 0;
  const isObject = field.type === 'object';
  const name = field.path.split('/').pop() ?? field.path;
  const isSelected = selectedPath === field.path;
  const isReadonly = name.startsWith('_') || field.constraints?.readOnly;
  const isHidden = name.startsWith('$') || field.constraints?.hidden;

  const typeColor: Record<string, string> = {
    string: 'text-emerald-400', number: 'text-blue-400', boolean: 'text-amber-400',
    object: 'text-purple-400', record: 'text-orange-400', array: 'text-cyan-400',
  };

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div
        onClick={() => onSelect(field.path)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer group transition-colors text-xs',
          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50',
        )}
      >
        {hasChildren || isObject ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : <div className="w-3" />}

        <span className="font-medium flex-1 truncate">{name}</span>

        <span className={cn('text-[9px] font-mono', typeColor[field.type] ?? 'text-muted-foreground')}>
          {field.type}
        </span>

        {isReadonly && <Lock className="w-2.5 h-2.5 text-amber-400" />}
        {isHidden && <EyeOff className="w-2.5 h-2.5 text-muted-foreground" />}

        {field.constraints?.clamp && (
          <span className="text-[8px] text-blue-400">[{field.constraints?.clamp[0]},{field.constraints?.clamp[1]}]</span>
        )}

        {isObject && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(field.path); }}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(field.path); }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {expanded && hasChildren && field.children!.map(child => (
        <FieldTreeNode
          key={child.path}
          field={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD DETAIL EDITOR
// ═══════════════════════════════════════════════════════════════════════════

function SchemaFieldDetail({
  field,
  onUpdate,
  onDelete,
}: {
  field: MVUZODField;
  onUpdate: (updated: MVUZODField) => void;
  onDelete: () => void;
}) {
  const name = field.path.split('/').pop() ?? field.path;

  const updateConstraint = useCallback(<K extends keyof MVUZODConstraints>(key: K, value: MVUZODConstraints[K]) => {
    onUpdate({ ...field, constraints: { ...field.constraints, [key]: value } });
  }, [field, onUpdate]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          <span className="font-mono">{name}</span>
        </h3>
        <button onClick={onDelete} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
          <Trash2 className="w-3 h-3" /> Xóa
        </button>
      </div>

      {/* Basic */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground font-medium">Tên (label)</label>
          <input
            type="text" value={field.label}
            onChange={e => {
              const newLabel = e.target.value;
              const segments = field.path.split('/');
              segments[segments.length - 1] = newLabel;
              onUpdate({ ...field, label: newLabel, path: segments.join('/') });
            }}
            className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-lg border border-border bg-background
              focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-medium">Type</label>
          <select
            value={field.type}
            onChange={e => {
              const newType = e.target.value as MVUZODField['type'];
              const updated = { ...field, type: newType };
              if (newType === 'object' && !updated.children) updated.children = [];
              onUpdate(updated);
            }}
            className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-lg border border-border bg-background"
          >
            {['string', 'number', 'boolean', 'object', 'record', 'array'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Flags */}
      <div className="flex gap-3">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={!!field.constraints?.readOnly}
            onChange={e => updateConstraint('readOnly', e.target.checked || undefined)}
            className="rounded border-border"
          />
          <Lock className="w-3 h-3 text-amber-400" /> Readonly (_)
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={!!field.constraints?.hidden}
            onChange={e => updateConstraint('hidden', e.target.checked || undefined)}
            className="rounded border-border"
          />
          <EyeOff className="w-3 h-3 text-muted-foreground" /> Hidden ($)
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={!!field.constraints?.coerce}
            onChange={e => updateConstraint('coerce', e.target.checked || undefined)}
            className="rounded border-border"
          />
          Coerce
        </label>
      </div>

      {/* Prefault */}
      <div>
        <label className="text-[10px] text-muted-foreground font-medium">Prefault (giá trị mặc định khi AI bỏ trống)</label>
        <input
          type="text"
          value={String(field.constraints?.prefault ?? '')}
          onChange={e => updateConstraint('prefault', e.target.value || undefined)}
          placeholder="z.string().prefault('...')"
          className="w-full mt-0.5 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background
            focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Describe (for record keys) */}
      <div>
        <label className="text-[10px] text-muted-foreground font-medium">Describe (mô tả key cho z.record)</label>
        <input
          type="text"
          value={field.constraints?.describe ?? ''}
          onChange={e => updateConstraint('describe', e.target.value || undefined)}
          placeholder="z.string().describe('物品名')"
          className="w-full mt-0.5 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background
            focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Number: clamp */}
      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-medium">Clamp Min</label>
            <input
              type="number"
              value={field.constraints?.clamp?.[0] ?? ''}
              onChange={e => {
                const min = Number(e.target.value);
                const max = field.constraints?.clamp?.[1] ?? 100;
                updateConstraint('clamp', [min, max]);
                updateConstraint('transform', 'clamp');
              }}
              className="w-full mt-0.5 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background
                focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-medium">Clamp Max</label>
            <input
              type="number"
              value={field.constraints?.clamp?.[1] ?? ''}
              onChange={e => {
                const min = field.constraints?.clamp?.[0] ?? 0;
                const max = Number(e.target.value);
                updateConstraint('clamp', [min, max]);
                updateConstraint('transform', 'clamp');
              }}
              className="w-full mt-0.5 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background
                focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
      )}

      {/* Transform */}
      {(field.type === 'record' || field.type === 'array' || field.type === 'object') && (
        <div>
          <label className="text-[10px] text-muted-foreground font-medium">Transform (object/record level)</label>
          <select
            value={field.constraints?.transform ?? ''}
            onChange={e => updateConstraint('transform', e.target.value || undefined)}
            className="w-full mt-0.5 px-2 py-1.5 text-xs rounded-lg border border-border bg-background"
          >
            <option value="">Không</option>
            <option value="pickBy">pickBy — Xóa items không hợp lệ</option>
            <option value="takeRight">takeRight — Giữ N items cuối</option>
            <option value="custom">Custom expression</option>
          </select>
          {field.constraints?.transform === 'custom' && (
            <input
              type="text"
              value={field.constraints?.transformExpr ?? ''}
              onChange={e => updateConstraint('transformExpr', e.target.value)}
              placeholder="data => _.pickBy(data, ({ 数量 }) => 数量 > 0)"
              className="w-full mt-1 px-2 py-1.5 text-[10px] font-mono rounded-lg border border-border bg-background
                focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          )}
        </div>
      )}

      {/* Enum values */}
      <div>
        <label className="text-[10px] text-muted-foreground font-medium">Enum Values (dùng cho z.enum / z.record key)</label>
        <input
          type="text"
          value={(field.constraints?.enumValues ?? []).join(', ')}
          onChange={e => {
            const vals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            updateConstraint('enumValues', vals.length > 0 ? vals : undefined);
          }}
          placeholder="力量, 敏捷, 体質 (phân cách bằng dấu phẩy)"
          className="w-full mt-0.5 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background
            focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Check Rules */}
      <div>
        <label className="text-[10px] text-muted-foreground font-medium">
          Check Rules (hướng dẫn AI khi update biến này)
        </label>
        <div className="space-y-1 mt-1">
          {(field.constraints?.checkRules ?? []).map((rule, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">•</span>
              <input
                type="text" value={rule}
                onChange={e => {
                  const rules = [...(field.constraints?.checkRules ?? [])];
                  rules[i] = e.target.value;
                  updateConstraint('checkRules', rules);
                }}
                className="flex-1 px-2 py-0.5 text-[10px] font-mono rounded border border-border bg-background
                  focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button onClick={() => {
                const rules = (field.constraints?.checkRules ?? []).filter((_, j) => j !== i);
                updateConstraint('checkRules', rules.length ? rules : undefined);
              }} className="text-muted-foreground hover:text-destructive p-0.5">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <button onClick={() => updateConstraint('checkRules', [...(field.constraints?.checkRules ?? []), ''])}
            className="text-[9px] text-primary hover:text-primary/80 flex items-center gap-0.5">
            <Plus className="w-2.5 h-2.5" /> Thêm rule
          </button>
        </div>
      </div>

      {/* Update Rules fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground font-medium">Update Range (cho biến số)</label>
          <input
            type="text"
            value={field.constraints?.updateRange ?? ''}
            onChange={e => updateConstraint('updateRange', e.target.value || undefined)}
            placeholder="0~100"
            className="w-full mt-0.5 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background
              focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-medium">Format (định dạng)</label>
          <input
            type="text"
            value={field.constraints?.updateFormat ?? ''}
            onChange={e => updateConstraint('updateFormat', e.target.value || undefined)}
            placeholder="YYYY-MM-DD HH:MM"
            className="w-full mt-0.5 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-background
              focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS PANEL (when no field selected)
// ═══════════════════════════════════════════════════════════════════════════

function ActionsPanel({
  schema,
  onCreateScripts,
  onReset,
}: {
  schema: MVUZODSchema;
  onCreateScripts: () => void;
  onReset: () => void;
}) {
  const [scriptsCreated, setScriptsCreated] = useState(false);

  return (
    <div className="p-4 space-y-5">
      <h3 className="text-sm font-semibold">Actions</h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Fields" value={countFields(schema.fields)} />
        <StatCard label="Objects" value={schema.fields.filter(f => f.type === 'object').length} />
        <StatCard label="Records" value={countByType(schema.fields, 'record')} />
      </div>

      {/* Create Scripts */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5 text-violet-400" /> Tạo TavernHelper Scripts
        </h4>
        <p className="text-[10px] text-muted-foreground">
          MVU Import + Zod Schema Registration → inject vào card
        </p>
        {scriptsCreated ? (
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Đã tạo scripts!
          </p>
        ) : (
          <button onClick={() => { onCreateScripts(); setScriptsCreated(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium
              hover:bg-violet-500/90 transition-colors">
            <Code className="w-3.5 h-3.5" /> Tạo Scripts
          </button>
        )}
      </div>

      {/* AI Expand Variables */}
      <AIExpandVariables schema={schema} />

      {/* Reset */}
      <button onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground
          hover:text-foreground hover:bg-muted/50 transition-colors">
        <RotateCcw className="w-3.5 h-3.5" /> Chọn nguồn schema khác
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AI EXPAND VARIABLES
// ═══════════════════════════════════════════════════════════════════════════

const EXPAND_CHIPS = [
  { label: '👥 +NPC Record', text: 'Thêm Record NPC mới với các trường: cấp bậc, chủng tộc, có mặt, quan hệ' },
  { label: '🎒 +Inventory', text: 'Thêm Record túi đồ/inventory với tên vật phẩm, số lượng, mô tả' },
  { label: '⚔️ +Stat số', text: 'Thêm stat số mới (HP, MP, Attack, Defense...) với clamp min/max' },
  { label: '🌟 +Kỹ năng', text: 'Thêm hệ thống kỹ năng với Record kỹ năng: tên, level, cooldown, mô tả' },
  { label: '💕 +Quan hệ', text: 'Thêm hệ thống quan hệ: thiện cảm (number 0-100), trạng thái, sự kiện' },
  { label: '🏠 +Địa điểm', text: 'Thêm hệ thống địa điểm với Record: tên, đã khám phá, mô tả, NPC có mặt' },
  { label: '📋 +Quest', text: 'Thêm hệ thống nhiệm vụ với Record quest: tên, trạng thái, phần thưởng, tiến độ' },
  { label: '⏰ +Thời gian', text: 'Thêm hệ thống thời gian: ngày, giờ, mùa, thời tiết' },
];

function AIExpandVariables({ schema }: { schema: MVUZODSchema }) {
  const [expandText, setExpandText] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setMvuzodSchema = useCardStore(s => s.setMvuzodSchema);
  const createSnapshot = useCardStore(s => s.createSnapshot);

  const handleExpand = useCallback(async () => {
    if (!expandText.trim()) return;
    setLoading(true);
    setError(null);
    setStatus('Đang kết nối AI...');

    try {
      const activeProfile = useSettingsStore.getState().getActiveProfile();
      const params = useSettingsStore.getState().generationParams;
      if (!activeProfile?.apiKey) throw new Error('Chưa cấu hình API AI.');

      const schemaDesc = JSON.stringify(schema, null, 2);
      setStatus('Đang gửi schema + mô tả...');

      const messages: ChatMessage[] = [
        { role: 'system', content: MVUZOD_EXPAND_VARIABLES_PROMPT },
        {
          role: 'user',
          content: `SCHEMA HIỆN TẠI:\n${schemaDesc}\n\nYÊU CẦU THÊM BIẾN:\n${expandText.trim()}\n\nHãy thiết kế các fields mới cần thêm. Trả về JSON.`,
        },
      ];

      const response = await callAI({
        profile: activeProfile,
        params: { ...params, useJsonResponseFormat: true },
        messages,
      });

      setStatus('Phân tích phản hồi...');
      const parsed = parseSchemaInferenceResponse(response.text);
      const newFields = (parsed as Record<string, unknown>).newFields as MVUZODField[] | undefined;

      if (!newFields || !Array.isArray(newFields) || newFields.length === 0) {
        throw new Error('AI không trả về fields mới hợp lệ.');
      }

      // Snapshot before merge
      await createSnapshot('Trước khi thêm biến mới');

      // Merge new fields into existing schema
      const updatedSchema = structuredClone(schema);
      for (const newField of newFields) {
        // Check if field needs to be added as child of existing object
        const parentPath = newField.path.split('/').slice(0, -1).join('/');
        if (parentPath && parentPath !== '') {
          const parent = findFieldByPath(updatedSchema.fields, parentPath);
          if (parent && parent.children) {
            // Check no duplicate
            if (!parent.children.some(c => c.path === newField.path)) {
              parent.children.push(newField);
            }
            continue;
          }
        }
        // Add as root field if not added as child
        if (!updatedSchema.fields.some(f => f.path === newField.path)) {
          updatedSchema.fields.push(newField);
        }
      }

      setMvuzodSchema(updatedSchema);
      setStatus(`✅ Đã thêm ${newFields.length} field(s) mới!`);
      setExpandText('');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('');
    } finally {
      setLoading(false);
    }
  }, [expandText, schema, setMvuzodSchema, createSnapshot]);

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2.5">
      <h4 className="text-xs font-semibold flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> AI Mở rộng biến
      </h4>
      <p className="text-[10px] text-muted-foreground">
        Mô tả biến muốn thêm — AI sẽ merge vào schema hiện tại (không ghi đè).
      </p>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1">
        {EXPAND_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => setExpandText(prev => prev ? `${prev}\n${chip.text}` : chip.text)}
            disabled={loading}
            className="px-2 py-0.5 rounded-full text-[9px] border border-border bg-background/50
              hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={expandText}
        onChange={e => setExpandText(e.target.value)}
        disabled={loading}
        placeholder={`VD: Thêm hệ thống kỹ năng gồm 3 slot, mỗi slot có:\n• Tên kỹ năng (string)\n• Level (number 1-10)\n• Cooldown (number 0-99)`}
        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background
          placeholder:text-muted-foreground/40 resize-y
          focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400/40 transition-all"
        rows={3}
      />

      {/* Action row */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span className="animate-pulse">{status}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpand}
            disabled={!expandText.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500
              text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
              transition-all shadow-sm shadow-emerald-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Thêm biến
          </button>
          {status && <span className="text-[10px] text-emerald-400">{status}</span>}
        </div>
      )}

      {error && (
        <p className="text-[10px] text-red-400 mt-1" title={error}>
          ❌ {error}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ZOD CODE PREVIEW
// ═══════════════════════════════════════════════════════════════════════════

function ZodCodePreview({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const fullCode = `import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

${code}

$(() => {
  registerMvuSchema(Schema);
});`;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5 text-violet-400" /> Zod Code Output
        </h3>
        <button
          onClick={() => {
            navigator.clipboard.writeText(fullCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Đã copy!' : 'Copy'}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-[#0d1117] p-3 overflow-x-auto">
        <pre className="text-[10px] font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed">
          {fullCode}
        </pre>
      </div>

      <div className="rounded-lg bg-muted/20 border border-border p-3 space-y-1">
        <p className="text-[10px] text-muted-foreground">
          <strong>Cách dùng:</strong> Copy code này vào <strong>酒馆助手脚本库 → 角色脚本</strong>, đặt tên &quot;Cấu trúc biến&quot;.
        </p>
        <p className="text-[10px] text-muted-foreground">
          <code>z</code> (Zod 4) và <code>_</code> (Lodash) đã global — <strong>không cần import</strong>.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border px-3 py-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TREE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function findFieldByPath(fields: MVUZODField[], path: string): MVUZODField | null {
  for (const f of fields) {
    if (f.path === path) return f;
    if (f.children) {
      const found = findFieldByPath(f.children, path);
      if (found) return found;
    }
  }
  return null;
}

function updateFieldInTree(fields: MVUZODField[], path: string, updated: MVUZODField): MVUZODField[] {
  return fields.map(f => {
    if (f.path === path) return updated;
    if (f.children) return { ...f, children: updateFieldInTree(f.children, path, updated) };
    return f;
  });
}

function deleteFieldFromTree(fields: MVUZODField[], path: string): MVUZODField[] {
  return fields.filter(f => f.path !== path).map(f => {
    if (f.children) return { ...f, children: deleteFieldFromTree(f.children, path) };
    return f;
  });
}

function addChildToTree(fields: MVUZODField[], parentPath: string, child: MVUZODField): MVUZODField[] {
  return fields.map(f => {
    if (f.path === parentPath) {
      return { ...f, children: [...(f.children ?? []), child] };
    }
    if (f.children) return { ...f, children: addChildToTree(f.children, parentPath, child) };
    return f;
  });
}

function countFields(fields: MVUZODField[]): number {
  let count = 0;
  for (const f of fields) {
    count++;
    if (f.children) count += countFields(f.children);
  }
  return count;
}

function countByType(fields: MVUZODField[], type: string): number {
  let count = 0;
  for (const f of fields) {
    if (f.type === type) count++;
    if (f.children) count += countByType(f.children, type);
  }
  return count;
}
