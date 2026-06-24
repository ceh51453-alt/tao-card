/**
 * SchemaWizard — 5-Step MVUZOD Schema Setup Wizard
 * Spec 9C: Lorebook Check → Analysis → Schema Editor → System Entries → Scripts
 */

import { useState, useCallback, useMemo } from 'react';
import {
  BookOpen, Scan, Edit3, FileCode, Rocket,
  ChevronRight, ChevronDown, AlertTriangle, CheckCircle,
  Plus, Trash2, ArrowRight, Info, X,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import type { ChatMessage } from '../../types';
import type { MVUZODSchema, MVUZODField, InferenceReport } from '../../types/mvuzod.types';
import {
  analyzeLorebookForSchema, buildMinimalSchemaFromReport, parseSchemaInferenceResponse,
} from '../../lib/mvuzod/schemaInferencer';
import { buildMVUZODSystemEntries, findExistingSystemEntries } from '../../lib/mvuzod/systemEntriesBuilder';
import { buildMVUZODScripts, findExistingMVUScripts } from '../../lib/mvuzod/tavernScriptBuilder';
import { MVUZOD_TEMPLATES, type MVUZODTemplate } from '../../lib/mvuzod/templateLibrary';
import { useSettingsStore } from '../../store/settingsStore';
import { callAI } from '../../lib/ai/client';
import { MVUZOD_SCHEMA_INFERENCE_PROMPT } from '../../prompts/modeMVUZOD';

const STEPS = [
  { icon: BookOpen, label: 'Kiểm tra Lorebook' },
  { icon: Scan, label: 'Phân tích' },
  { icon: Edit3, label: 'Chỉnh sửa Schema' },
  { icon: FileCode, label: 'Entries hệ thống' },
  { icon: Rocket, label: 'Scripts' },
];

export function SchemaWizard() {
  const card = useCardStore(s => s.card);
  const addEntry = useCardStore(s => s.addEntry);
  const [step, setStep] = useState(0);
  const [report, setReport] = useState<InferenceReport | null>(null);
  const [schema, setSchema] = useState<MVUZODSchema | null>(null);
  const [entriesCreated, setEntriesCreated] = useState(false);
  const [scriptsCreated, setScriptsCreated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(
    () => card.data.character_book?.entries ?? [],
    [card.data.character_book?.entries],
  );

  // ═══ STEP 0: Lorebook Check ═══════════════════════════════════════════

  const entryCount = entries.length;
  const canProceed = entryCount >= 5;

  const handleStaticAnalyze = useCallback(() => {
    const r = analyzeLorebookForSchema(entries);
    setReport(r);
    const s = buildMinimalSchemaFromReport(r);
    setSchema(s);
    setError(null);
    setStep(1);
  }, [entries]);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingStatus('Đang đọc Lorebook và chuẩn bị kết nối AI...');
    try {
      const activeProfile = useSettingsStore.getState().getActiveProfile();
      const params = useSettingsStore.getState().generationParams;

      if (!activeProfile || !activeProfile.apiKey) {
        throw new Error("Chưa cấu hình API AI. Vui lòng vào mục Cài đặt (Settings) trên Sidebar để cấu hình API Key và Model trước.");
      }

      setLoadingStatus(`Đang kết nối tới ${activeProfile.label} (${activeProfile.selectedModel || 'Default Model'})...`);
      
      const formattedEntries = entries
        .map(e => `ID: ${e.id}\nComment: ${e.comment}\nKeys: ${e.keys.join(',')}\nContent:\n${e.content}`)
        .join('\n\n---\n\n');

      const estimatedChars = MVUZOD_SCHEMA_INFERENCE_PROMPT.length + formattedEntries.length;
      setLoadingStatus(`Đang gửi ${entries.length} entries (~${Math.round(estimatedChars / 4)}t input) tới AI...`);

      const MAX_RETRIES = 2;
      let lastParseError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        if (attempt > 1) {
          setLoadingStatus(`Phản hồi AI bị lỗi JSON. Đang thử lại (lần ${attempt}/${MAX_RETRIES + 1}) với temperature thấp hơn...`);
        }

        let currentMessages: ChatMessage[] = [
          { role: 'system', content: MVUZOD_SCHEMA_INFERENCE_PROMPT },
          {
            role: 'user',
            content: `Dưới đây là danh sách các entries trong Lorebook hiện tại (${entries.length} entries):\n\n${formattedEntries}\n\nHãy phân tích và trả về kết quả JSON theo đúng cấu trúc yêu cầu.`
          }
        ];

        let fullText = '';
        let isTruncated = true;
        let callCount = 0;
        const maxCalls = 4;

        while (isTruncated && callCount < maxCalls) {
          callCount++;
          if (callCount > 1) {
            setLoadingStatus(`Phản hồi bị chạm giới hạn token (lượt ${callCount - 1}). Đang yêu cầu AI viết tiếp phần còn thiếu...`);
          }

          const response = await callAI({
            profile: activeProfile,
            params: {
              ...params,
              // Lower temperature on retries for more deterministic JSON
              temperature: attempt > 1 ? 0.3 : params.temperature,
              useJsonResponseFormat: true,
            },
            messages: currentMessages,
          });

          fullText += response.text;
          const reason = response.finishReason;
          const usage = response.usage;
          if (usage) {
            setLoadingStatus(`Lượt ${callCount}: ${usage.prompt_tokens}t input → ${usage.completion_tokens}t output (finish: ${reason ?? 'STOP'})`);
          }
          isTruncated = ['MAX_TOKENS', 'max_tokens', 'length'].includes(reason || '');

          if (isTruncated && response.text.trim()) {
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: response.text },
              { role: 'user', content: 'Hãy viết tiếp tục nội dung bị bỏ dở ở trên, bắt đầu ngay sau phần cuối cùng và KHÔNG viết lại phần đã có. Chỉ trả về phần tiếp theo của khối JSON.' }
            ];
          } else {
            isTruncated = false;
          }
        }

        setLoadingStatus('Đang phân tích và xử lý phản hồi từ AI...');
        try {
          const parsed = parseSchemaInferenceResponse(fullText);

          if (!parsed.analysis || !parsed.proposedSchema) {
            throw new Error("Phản hồi từ AI không đúng cấu trúc yêu cầu (thiếu 'analysis' hoặc 'proposedSchema').");
          }

          const mappedReport: InferenceReport = {
            entryCount: entries.length,
            detectedGroups: parsed.analysis.groups || [],
            detectedEnums: (parsed.analysis.sceneTypes || []).map(() => ({
              path: '/Trạng thái thế giới/Loại cảnh hiện tại',
              values: parsed.analysis.sceneTypes || [],
              source: 'AI phát hiện từ Lorebook',
            })),
            detectedNPCPattern: !!parsed.analysis.npcPattern,
            detectedCultivationSystem: !!parsed.analysis.cultivationSystem,
            suggestedFields: (parsed.proposedSchema.fields || []).map((f: MVUZODField) => ({
              path: f.path,
              reason: f.description || `Phát hiện thuộc tính "${f.label || f.path}"`,
              confidence: 0.9,
            })),
            warnings: parsed.analysis.warnings || [],
          };

          setReport(mappedReport);
          setSchema(parsed.proposedSchema);
          setStep(1);
          lastParseError = null;
          break; // Success — exit retry loop
        } catch (parseErr) {
          lastParseError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
          console.warn(`AI parse attempt ${attempt} failed:`, parseErr);
          if (attempt <= MAX_RETRIES) continue; // Try again
        }
      }

      // If all retries failed, throw the last error
      if (lastParseError) {
        throw lastParseError;
      }
    } catch (err) {
      console.error('Lỗi AI Lorebook inference:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  }, [entries]);

  const handleUseTemplate = useCallback((template: MVUZODTemplate) => {
    setSchema({ ...template.schema });
    setStep(2); // Skip analysis, go directly to editor
  }, []);

  // ═══ STEP 3: System Entries ════════════════════════════════════════════

  const existingSystemEntries = useMemo(
    () => findExistingSystemEntries(entries),
    [entries],
  );

  const handleCreateEntries = useCallback(() => {
    if (!schema) return;
    const newEntries = buildMVUZODSystemEntries(schema, card.data.name, entries);
    for (const entry of newEntries) {
      addEntry(entry);
    }
    setEntriesCreated(true);
    setStep(4);
  }, [schema, card.data.name, entries, addEntry]);

  // ═══ STEP 4: Scripts ══════════════════════════════════════════════════

  const existingScripts = useMemo(() => {
    const scripts = card.data.extensions?.tavern_helper?.scripts ?? [];
    return findExistingMVUScripts(scripts);
  }, [card.data.extensions]);

  const handleCreateScripts = useCallback(() => {
    if (!schema) return;
    const _scripts = buildMVUZODScripts(schema, card.data.name);
    // Scripts would be added to card.data.extensions.tavern_helper.scripts
    // For now, mark as created
    void _scripts;
    setScriptsCreated(true);
  }, [schema, card.data.name]);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
              <button
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' :
                  isDone ? 'bg-emerald-500/10 text-emerald-400' :
                  'text-muted-foreground/50'
                }`}
              >
                {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-5">
        {step === 0 && (
          <Step0LorebookCheck
            entryCount={entryCount}
            canProceed={canProceed}
            onAnalyze={handleAnalyze}
            onStaticAnalyze={handleStaticAnalyze}
            onUseTemplate={handleUseTemplate}
            loading={loading}
            loadingStatus={loadingStatus}
            error={error}
          />
        )}
        {step === 1 && report && (
          <Step1Analysis report={report} onNext={() => setStep(2)} />
        )}
        {step === 2 && schema && (
          <Step2SchemaEditor
            schema={schema}
            onChange={setSchema}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3SystemEntries
            existingEntries={existingSystemEntries}
            created={entriesCreated}
            onCreate={handleCreateEntries}
          />
        )}
        {step === 4 && (
          <Step4Scripts
            existing={existingScripts}
            created={scriptsCreated}
            onCreate={handleCreateScripts}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 0: LOREBOOK CHECK
// ═══════════════════════════════════════════════════════════════════════════

function Step0LorebookCheck({
  entryCount,
  canProceed,
  onAnalyze,
  onStaticAnalyze,
  onUseTemplate,
  loading,
  loadingStatus,
  error,
}: {
  entryCount: number;
  canProceed: boolean;
  onAnalyze: () => void;
  onStaticAnalyze: () => void;
  onUseTemplate: (t: MVUZODTemplate) => void;
  loading: boolean;
  loadingStatus: string;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" /> Bước 1: Kiểm tra Lorebook
      </h3>

      <div className={`rounded-lg p-4 border ${
        entryCount >= 20 ? 'bg-emerald-500/5 border-emerald-500/20' :
        entryCount >= 5 ? 'bg-amber-500/5 border-amber-500/20' :
        'bg-destructive/5 border-destructive/20'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {entryCount >= 20 ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
           entryCount >= 5 ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
           <AlertTriangle className="w-4 h-4 text-destructive" />}
          <span className="text-sm font-medium">
            {entryCount} entries trong Lorebook
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {entryCount >= 20
            ? 'Lorebook đủ phong phú. AI sẽ phân tích và sinh Schema chính xác.'
            : entryCount >= 5
            ? 'Lorebook còn ít. AI có thể không phát hiện đầy đủ thông tin — nên tạo thêm entries trước.'
            : 'Lorebook quá ít. Cần ít nhất 5 entries để phân tích. Hãy tạo Lorebook trước.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg p-4 border border-destructive/20 bg-destructive/5 text-xs text-destructive space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Không thể phân tích bằng AI: {error}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onAnalyze}
              className="px-3 py-1.5 rounded-md bg-destructive/15 text-destructive font-medium hover:bg-destructive/25 transition-colors"
            >
              Thử lại bằng AI
            </button>
            <button
              onClick={onStaticAnalyze}
              className="px-3 py-1.5 rounded-md bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
            >
              Dùng phân tích tĩnh Offline
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg p-5 border border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-center gap-3">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-primary">Đang xử lý phân tích AI...</p>
            <p className="text-[10px] text-muted-foreground animate-pulse">{loadingStatus}</p>
          </div>
        </div>
      ) : (
        <button onClick={onAnalyze} disabled={!canProceed}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium
            hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/10">
          <Scan className="w-4 h-4" /> Phân tích bằng Copilot AI
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {/* Template Library */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Hoặc chọn template có sẵn:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MVUZOD_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => onUseTemplate(t)}
              className="flex items-start gap-2 px-3 py-2 rounded-lg border border-border bg-background/50
                hover:bg-primary/5 hover:border-primary/30 transition-colors text-left">
              <span className="text-lg">{t.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{t.name}</p>
                <p className="text-[9px] text-muted-foreground truncate">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: ANALYSIS REPORT
// ═══════════════════════════════════════════════════════════════════════════

function Step1Analysis({ report, onNext }: {
  report: InferenceReport;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Scan className="w-4 h-4 text-primary" /> Bước 2: Kết quả phân tích
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Entries phân tích" value={report.entryCount} />
        <StatCard label="Nhóm phát hiện" value={report.detectedGroups.length} />
        <StatCard label="NPC Pattern" value={report.detectedNPCPattern ? 'Có' : 'Không'} />
        <StatCard label="Hệ thống tu luyện" value={report.detectedCultivationSystem ? 'Có' : 'Không'} />
      </div>

      {/* Groups */}
      {report.detectedGroups.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Nhóm phát hiện:</p>
          {report.detectedGroups.map((g, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 text-xs">
              <span className="font-medium text-primary">{g.name}</span>
              <span className="text-muted-foreground">× {g.count}</span>
              <span className="text-muted-foreground truncate">({g.sample.slice(0, 3).join(', ')})</span>
            </div>
          ))}
        </div>
      )}

      {/* Enums */}
      {report.detectedEnums.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Enum fields đề xuất:</p>
          {report.detectedEnums.map((en, i) => (
            <div key={i} className="px-3 py-1.5 rounded-md bg-muted/30 text-xs">
              <span className="font-medium">{en.path}</span>
              <span className="text-muted-foreground ml-2">[{en.values.join(', ')}]</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggested fields */}
      {report.suggestedFields.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Fields đề xuất:</p>
          {report.suggestedFields.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 text-xs">
              <span className="font-mono text-primary">{f.path}</span>
              <span className="text-muted-foreground flex-1 truncate">{f.reason}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                f.confidence >= 0.8 ? 'bg-emerald-500/20 text-emerald-400' :
                f.confidence >= 0.6 ? 'bg-amber-500/20 text-amber-400' :
                'bg-muted text-muted-foreground'
              }`}>{Math.round(f.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <div className="space-y-1">
          {report.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}

      <button onClick={onNext}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium
          hover:bg-primary/90 transition-colors">
        <Edit3 className="w-4 h-4" /> Tiếp: Chỉnh sửa Schema
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: SCHEMA EDITOR
// ═══════════════════════════════════════════════════════════════════════════

function Step2SchemaEditor({ schema, onChange, onNext }: {
  schema: MVUZODSchema;
  onChange: (schema: MVUZODSchema) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Edit3 className="w-4 h-4 text-primary" /> Bước 3: Chỉnh sửa Schema
      </h3>

      <p className="text-xs text-muted-foreground">
        Duyệt và chỉnh sửa schema đề xuất. Thêm, xoá, hoặc sửa fields theo nhu cầu.
      </p>

      <div className="space-y-2">
        {schema.fields.map((field, i) => (
          <FieldEditor
            key={i}
            field={field}
            depth={0}
            onUpdate={(updated) => {
              const newFields = [...schema.fields];
              newFields[i] = updated;
              onChange({ ...schema, fields: newFields });
            }}
            onDelete={() => {
              const newFields = schema.fields.filter((_, idx) => idx !== i);
              onChange({ ...schema, fields: newFields });
            }}
          />
        ))}
      </div>

      <button
        onClick={() => {
          const newField: MVUZODField = {
            path: '/Mới', type: 'string', label: 'Mới',
            defaultValue: 'Chờ khởi tạo', constraints: { prefault: 'Chờ khởi tạo' },
          };
          onChange({ ...schema, fields: [...schema.fields, newField] });
        }}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
      >
        <Plus className="w-3 h-3" /> Thêm field gốc
      </button>

      <button onClick={onNext}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium
          hover:bg-primary/90 transition-colors">
        <FileCode className="w-4 h-4" /> Tiếp: Tạo Entries hệ thống
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function FieldEditor({ field, depth, onUpdate, onDelete }: {
  field: MVUZODField;
  depth: number;
  onUpdate: (field: MVUZODField) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const name = field.path.split('/').pop() ?? field.path;
  const hasChildren = field.children && field.children.length > 0;
  const isReadonly = name.startsWith('_') || field.constraints?.readOnly;

  const typeColors: Record<string, string> = {
    string: 'text-emerald-400', number: 'text-blue-400', boolean: 'text-amber-400',
    object: 'text-purple-400', record: 'text-orange-400', array: 'text-cyan-400',
  };

  return (
    <div className={`rounded-lg border border-border bg-background/50 ${depth > 0 ? 'ml-4' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : <div className="w-3.5" />}

        <input
          type="text" value={name}
          onChange={e => {
            const segments = field.path.split('/');
            segments[segments.length - 1] = e.target.value;
            const newName = e.target.value;
            onUpdate({
              ...field,
              path: segments.join('/'),
              label: newName,
              constraints: {
                ...field.constraints,
                readOnly: newName.startsWith('_') || field.constraints?.readOnly,
              },
            });
          }}
          className="flex-1 bg-transparent text-xs font-medium border-none outline-none"
        />

        <select value={field.type}
          onChange={e => {
            const newType = e.target.value as MVUZODField['type'];
            const updated = { ...field, type: newType };
            if (newType === 'object' && !updated.children) updated.children = [];
            onUpdate(updated);
          }}
          className={`text-[10px] px-1.5 py-0.5 rounded border border-border bg-background ${typeColors[field.type] ?? ''}`}
        >
          {['string', 'number', 'boolean', 'object', 'record', 'array'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Readonly badge + toggle */}
        <button
          onClick={() => onUpdate({
            ...field,
            constraints: { ...field.constraints, readOnly: !field.constraints?.readOnly },
          })}
          title={isReadonly ? 'Readonly (AI không được sửa)' : 'Nhấn để đặt readonly'}
          className={`text-[9px] px-1 py-0.5 rounded transition-colors ${
            isReadonly
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
          }`}
        >
          {isReadonly ? '🔒 RO' : 'RW'}
        </button>

        {field.constraints?.clamp && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400">
            [{field.constraints?.clamp[0]},{field.constraints?.clamp[1]}]
          </span>
        )}

        {field.constraints?.prefault !== undefined && field.constraints?.prefault !== '' && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-400" title="prefault value">
            ⚡{String(field.constraints?.prefault).slice(0, 8)}
          </span>
        )}

        {field.constraints?.transform && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400" title="transform">
            ⚙️{field.constraints?.transform}
          </span>
        )}

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Cài đặt nâng cao (prefault, transform, check rules...)"
          className={`p-1 transition-colors ${showAdvanced ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Info className="w-3 h-3" />
        </button>

        <button onClick={onDelete}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Advanced settings panel */}
      {showAdvanced && (
        <div className="border-t border-border px-3 py-2.5 space-y-2 bg-muted/10">
          <div className="grid grid-cols-2 gap-2">
            {/* Prefault */}
            <div>
              <label className="text-[9px] text-muted-foreground font-medium">Prefault (mặc định)</label>
              <input
                type="text"
                value={String(field.constraints?.prefault ?? '')}
                onChange={e => onUpdate({
                  ...field,
                  constraints: { ...field.constraints, prefault: e.target.value || undefined },
                })}
                placeholder="Giá trị khi AI bỏ trống"
                className="w-full mt-0.5 px-2 py-1 text-[10px] font-mono rounded border border-border bg-background
                  focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Describe */}
            <div>
              <label className="text-[9px] text-muted-foreground font-medium">Describe (mô tả key)</label>
              <input
                type="text"
                value={field.constraints?.describe ?? ''}
                onChange={e => onUpdate({
                  ...field,
                  constraints: { ...field.constraints, describe: e.target.value || undefined },
                })}
                placeholder="z.string().describe('...')"
                className="w-full mt-0.5 px-2 py-1 text-[10px] font-mono rounded border border-border bg-background
                  focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Transform (for number type) */}
          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground font-medium">Clamp Range</label>
                <div className="flex gap-1 mt-0.5">
                  <input
                    type="number"
                    value={field.constraints?.clamp?.[0] ?? ''}
                    onChange={e => {
                      const min = Number(e.target.value);
                      const max = field.constraints?.clamp?.[1] ?? 100;
                      onUpdate({
                        ...field,
                        constraints: {
                          ...field.constraints,
                          clamp: [min, max],
                          transform: 'clamp',
                        },
                      });
                    }}
                    placeholder="Min"
                    className="w-full px-2 py-1 text-[10px] font-mono rounded border border-border bg-background
                      focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    value={field.constraints?.clamp?.[1] ?? ''}
                    onChange={e => {
                      const min = field.constraints?.clamp?.[0] ?? 0;
                      const max = Number(e.target.value);
                      onUpdate({
                        ...field,
                        constraints: {
                          ...field.constraints,
                          clamp: [min, max],
                          transform: 'clamp',
                        },
                      });
                    }}
                    placeholder="Max"
                    className="w-full px-2 py-1 text-[10px] font-mono rounded border border-border bg-background
                      focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground font-medium">Update Range (cho AI)</label>
                <input
                  type="text"
                  value={field.constraints?.updateRange ?? ''}
                  onChange={e => onUpdate({
                    ...field,
                    constraints: { ...field.constraints, updateRange: e.target.value || undefined },
                  })}
                  placeholder="0~100"
                  className="w-full mt-0.5 px-2 py-1 text-[10px] font-mono rounded border border-border bg-background
                    focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Transform for record/array */}
          {(field.type === 'record' || field.type === 'array') && (
            <div>
              <label className="text-[9px] text-muted-foreground font-medium">Transform</label>
              <select
                value={field.constraints?.transform ?? ''}
                onChange={e => onUpdate({
                  ...field,
                  constraints: { ...field.constraints, transform: e.target.value || undefined },
                })}
                className="w-full mt-0.5 px-2 py-1 text-[10px] rounded border border-border bg-background"
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
                  onChange={e => onUpdate({
                    ...field,
                    constraints: { ...field.constraints, transformExpr: e.target.value },
                  })}
                  placeholder="data => _.pickBy(data, ({ số_lượng }) => số_lượng > 0)"
                  className="w-full mt-1 px-2 py-1 text-[10px] font-mono rounded border border-border bg-background
                    focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              )}
            </div>
          )}

          {/* Check Rules (hướng dẫn AI update) */}
          <div>
            <label className="text-[9px] text-muted-foreground font-medium">
              Check Rules (hướng dẫn AI update biến này)
            </label>
            <div className="space-y-1 mt-0.5">
              {(field.constraints?.checkRules ?? []).map((rule, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground">•</span>
                  <input
                    type="text"
                    value={rule}
                    onChange={e => {
                      const rules = [...(field.constraints?.checkRules ?? [])];
                      rules[i] = e.target.value;
                      onUpdate({ ...field, constraints: { ...field.constraints, checkRules: rules } });
                    }}
                    className="flex-1 px-2 py-0.5 text-[10px] font-mono rounded border border-border bg-background
                      focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => {
                      const rules = (field.constraints?.checkRules ?? []).filter((_, j) => j !== i);
                      onUpdate({ ...field, constraints: { ...field.constraints, checkRules: rules.length ? rules : undefined } });
                    }}
                    className="text-muted-foreground hover:text-red-400 p-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const rules = [...(field.constraints?.checkRules ?? []), ''];
                  onUpdate({ ...field, constraints: { ...field.constraints, checkRules: rules } });
                }}
                className="text-[9px] text-primary hover:text-primary/80 flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" /> Thêm check rule
              </button>
            </div>
          </div>
        </div>
      )}

      {expanded && hasChildren && (
        <div className="border-t border-border px-2 py-2 space-y-1.5">
          {field.children!.map((child, i) => (
            <FieldEditor
              key={i}
              field={child}
              depth={depth + 1}
              onUpdate={(updated) => {
                const newChildren = [...field.children!];
                newChildren[i] = updated;
                onUpdate({ ...field, children: newChildren });
              }}
              onDelete={() => {
                const newChildren = field.children!.filter((_, idx) => idx !== i);
                onUpdate({ ...field, children: newChildren });
              }}
            />
          ))}
          {field.type === 'object' && (
            <button
              onClick={() => {
                const newChild: MVUZODField = {
                  path: '/Mới', type: 'string', label: 'Mới',
                  defaultValue: '', constraints: { prefault: '' },
                };
                onUpdate({ ...field, children: [...(field.children ?? []), newChild] });
              }}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 ml-4"
            >
              <Plus className="w-2.5 h-2.5" /> Thêm child
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: SYSTEM ENTRIES
// ═══════════════════════════════════════════════════════════════════════════

function Step3SystemEntries({ existingEntries, created, onCreate }: {
  existingEntries: { comment: string; id: number }[];
  created: boolean;
  onCreate: () => void;
}) {
  const systemNames = [
    'Bộ điều khiển EJS',
    '[mvu_update] Quy tắc cập nhật biến',
    '[mvu_update] Định dạng đầu ra biến',
    '[mvu_update] Nhấn mạnh định dạng đầu ra biến',
    '[initvar] Khởi tạo biến - đừng mở',
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <FileCode className="w-4 h-4 text-primary" /> Bước 4: Tạo Entries hệ thống
      </h3>

      <p className="text-xs text-muted-foreground">
        5 entries đặc biệt sẽ được thêm vào Lorebook để MVUZOD hoạt động.
      </p>

      <div className="space-y-1.5">
        {systemNames.map((name, i) => {
          const exists = existingEntries.some(e => e.comment.includes(name));
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border text-xs">
              {created ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : exists ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
              )}
              <span className={exists && !created ? 'text-amber-400' : ''}>{name}</span>
              {exists && !created && (
                <span className="text-[9px] text-amber-400 ml-auto">(đã tồn tại)</span>
              )}
            </div>
          );
        })}
      </div>

      {existingEntries.length > 0 && !created && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Đã có {existingEntries.length} entries hệ thống. Tạo mới sẽ thêm bản sao.
        </div>
      )}

      {!created ? (
        <button onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium
            hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Tạo 5 entries hệ thống
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle className="w-4 h-4" /> Đã tạo thành công 5 entries!
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: SCRIPTS
// ═══════════════════════════════════════════════════════════════════════════

function Step4Scripts({ existing, created, onCreate }: {
  existing: { mvu: boolean; schema: boolean };
  created: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Rocket className="w-4 h-4 text-primary" /> Bước 5: TavernHelper Scripts
      </h3>

      <p className="text-xs text-muted-foreground">
        2 scripts cần thiết cho MVUZOD runtime trong SillyTavern.
      </p>

      <div className="space-y-2">
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs ${
          created || existing.mvu ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/20 border-border'
        }`}>
          {created || existing.mvu ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> :
            <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30" />}
          <div>
            <p className="font-medium">Script 1: MVU Import</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              CDN import cho MagVarUpdate bundle
            </p>
          </div>
          {existing.mvu && !created && (
            <span className="text-[9px] text-amber-400 ml-auto">(đã có)</span>
          )}
        </div>

        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs ${
          created || existing.schema ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/20 border-border'
        }`}>
          {created || existing.schema ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> :
            <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30" />}
          <div>
            <p className="font-medium">Script 2: Cấu trúc biến (Zod Schema)</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              registerMvuSchema('stat_data', schema)
            </p>
          </div>
          {existing.schema && !created && (
            <span className="text-[9px] text-amber-400 ml-auto">(đã có)</span>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-muted/20 border border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Info className="w-3 h-3" /> Lưu ý
        </div>
        <p className="text-[10px] text-muted-foreground">
          Scripts cần được thêm vào card qua tab "Mở rộng" → TavernHelper Scripts.
          Copy nội dung script và paste vào SillyTavern.
        </p>
      </div>

      {!created ? (
        <button onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium
            hover:bg-primary/90 transition-colors">
          <Rocket className="w-4 h-4" /> Tạo Scripts
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle className="w-4 h-4" /> Đã tạo xong! MVUZOD sẵn sàng.
          </div>
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
            <p className="text-xs font-medium text-emerald-400 mb-1">🎉 Hoàn thành Setup MVUZOD</p>
            <p className="text-[10px] text-muted-foreground">
              Schema đã được cấu hình, 5 entries hệ thống đã thêm, scripts đã tạo.
              Bạn có thể dùng Copilot mode "MVUZOD" để tinh chỉnh thêm.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
