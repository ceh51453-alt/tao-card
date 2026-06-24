/**
 * ExportWizard — Step-by-step card export wizard
 * Steps: Review → Configure → Preview → Export
 * Renders as a modal dialog.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Download, X, ChevronRight, ChevronLeft, Check,
  AlertTriangle, Info, AlertCircle, FileJson, Image,
  Package, Settings2, Eye, Sparkles, Shield,
  BookOpen, FileCode, Loader2,
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import type { MVUZODSchema } from '../../types/mvuzod.types';
import {
  packageCard, downloadPackageResult, validateCardForExport,
  type PackageOptions, type PackageResult, type ValidationIssue, type ExportFormat,
} from '../../lib/export/cardPackager';
import { findExistingMVUZODEntries } from '../../lib/export/worldbookGenerator';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ExportWizardProps {
  open: boolean;
  onClose: () => void;
}

type WizardStep = 'review' | 'configure' | 'preview' | 'export';

const STEPS: { id: WizardStep; label: string; icon: typeof Eye }[] = [
  { id: 'review', label: 'Kiểm tra', icon: Eye },
  { id: 'configure', label: 'Cấu hình', icon: Settings2 },
  { id: 'preview', label: 'Xem trước', icon: Package },
  { id: 'export', label: 'Xuất file', icon: Download },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ExportWizard({ open, onClose }: ExportWizardProps) {
  const card = useCardStore(s => s.card);
  const [step, setStep] = useState<WizardStep>('review');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<PackageResult | null>(null);

  // Config state
  const [format, setFormat] = useState<ExportFormat>('both');
  const [injectWorldbook, setInjectWorldbook] = useState(true);
  const [injectRegex, setInjectRegex] = useState(true);
  const [injectScripts, setInjectScripts] = useState(true);
  const [replaceExisting, setReplaceExisting] = useState(true);

  // Detect schema from card extensions
  const schema = useMemo<MVUZODSchema | null>(() => {
    return card.data.extensions?.mvuzod?.schema ?? null;
  }, [card.data.extensions?.mvuzod?.schema]);

  // Validation
  const validation = useMemo(() => {
    return validateCardForExport(card, schema);
  }, [card, schema]);

  // Existing MVUZOD entries
  const existingEntries = useMemo(() => {
    const entries = card.data.character_book?.entries ?? [];
    return findExistingMVUZODEntries(entries);
  }, [card.data.character_book?.entries]);

  const existingEntryCount = Object.values(existingEntries).flat().length;

  // Stats
  const stats = useMemo(() => {
    const entries = card.data.character_book?.entries ?? [];
    const totalContent = [
      card.data.description, card.data.personality, card.data.scenario,
      card.data.system_prompt, card.data.first_mes,
      ...entries.map(e => e.content),
    ].join('\n');
    return {
      entryCount: entries.length,
      tokenEstimate: Math.ceil(totalContent.length / 4),
      regexCount: card.data.extensions.regex_scripts?.length ?? 0,
      scriptCount: card.data.extensions.tavern_helper?.scripts?.length ?? 0,
      hasAvatar: card.avatar !== 'none' && !!card.avatar,
    };
  }, [card]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const options: PackageOptions = {
        format,
        injectWorldbook: injectWorldbook && !!schema,
        injectRegex: injectRegex && !!schema,
        injectScripts: injectScripts && !!schema,
        replaceExisting,
      };

      const result = await packageCard(card, schema, options);
      setExportResult(result);
      setStep('export');
    } catch (err) {
      console.error('Export error:', err);
      alert(err instanceof Error ? err.message : 'Lỗi export không xác định');
    } finally {
      setIsExporting(false);
    }
  }, [card, schema, format, injectWorldbook, injectRegex, injectScripts, replaceExisting]);

  const handleDownload = useCallback(() => {
    if (exportResult) {
      downloadPackageResult(exportResult);
    }
  }, [exportResult]);

  const handleClose = useCallback(() => {
    setStep('review');
    setExportResult(null);
    onClose();
  }, [onClose]);

  if (!open) return null;

  const stepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Export Card Package</h2>
              <p className="text-[10px] text-muted-foreground">{card.data.name}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-border/50 bg-muted/10">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = i < stepIdx;
            return (
              <div key={s.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
                <button
                  onClick={() => i <= stepIdx && setStep(s.id)}
                  disabled={i > stepIdx}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' :
                    isDone ? 'text-emerald-400 hover:bg-muted/30' :
                    'text-muted-foreground/40 cursor-not-allowed'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  {s.label}
                </button>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'review' && (
            <StepReview
              validation={validation}
              stats={stats}
              hasSchema={!!schema}
              existingEntryCount={existingEntryCount}
            />
          )}
          {step === 'configure' && (
            <StepConfigure
              schema={schema}
              format={format}
              setFormat={setFormat}
              injectWorldbook={injectWorldbook}
              setInjectWorldbook={setInjectWorldbook}
              injectRegex={injectRegex}
              setInjectRegex={setInjectRegex}
              injectScripts={injectScripts}
              setInjectScripts={setInjectScripts}
              replaceExisting={replaceExisting}
              setReplaceExisting={setReplaceExisting}
            />
          )}
          {step === 'preview' && (
            <StepPreview
              card={card}
              schema={schema}
              injectWorldbook={injectWorldbook}
              injectRegex={injectRegex}
              injectScripts={injectScripts}
            />
          )}
          {step === 'export' && exportResult && (
            <StepExportResult result={exportResult} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10">
          <div className="text-[10px] text-muted-foreground">
            {step === 'review' && `${validation.filter(v => v.severity === 'warning').length} cảnh báo`}
            {step === 'configure' && `Format: ${format === 'both' ? 'JSON + PNG' : format.toUpperCase()}`}
            {step === 'export' && exportResult && `${(exportResult.totalSize / 1024).toFixed(1)} KB`}
          </div>
          <div className="flex items-center gap-2">
            {stepIdx > 0 && step !== 'export' && (
              <button
                onClick={() => setStep(STEPS[stepIdx - 1].id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-muted/50 transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Quay lại
              </button>
            )}

            {step === 'review' && (
              <button
                onClick={() => setStep('configure')}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Tiếp tục
                <ChevronRight className="w-3 h-3" />
              </button>
            )}

            {step === 'configure' && (
              <button
                onClick={() => setStep('preview')}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Xem trước
                <ChevronRight className="w-3 h-3" />
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-primary to-violet-500 text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {isExporting ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Đang xuất...</>
                ) : (
                  <><Download className="w-3 h-3" /> Xuất Card</>
                )}
              </button>
            )}

            {step === 'export' && exportResult && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                <Download className="w-3 h-3" />
                Tải về
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function StepReview({
  validation, stats, hasSchema, existingEntryCount,
}: {
  validation: ValidationIssue[];
  stats: { entryCount: number; tokenEstimate: number; regexCount: number; scriptCount: number; hasAvatar: boolean };
  hasSchema: boolean;
  existingEntryCount: number;
}) {
  const errors = validation.filter(v => v.severity === 'error');
  const warnings = validation.filter(v => v.severity === 'warning');
  const infos = validation.filter(v => v.severity === 'info');

  return (
    <>
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Eye className="w-4 h-4 text-primary" />
        Kiểm tra Card
      </h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Lorebook Entries', value: stats.entryCount, icon: BookOpen },
          { label: 'Token ước tính', value: `~${stats.tokenEstimate.toLocaleString()}`, icon: FileCode },
          { label: 'Regex Scripts', value: stats.regexCount, icon: Shield },
          { label: 'TH Scripts', value: stats.scriptCount, icon: Sparkles },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg bg-muted/20 p-2.5 border border-border/50">
              <div className="flex items-center gap-1 mb-1">
                <Icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-sm font-semibold tabular-nums">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* MVUZOD status */}
      <div className={`rounded-lg p-3 border ${hasSchema ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/20 border-border/50'}`}>
        <div className="flex items-center gap-1.5">
          <Sparkles className={`w-3.5 h-3.5 ${hasSchema ? 'text-emerald-400' : 'text-muted-foreground'}`} />
          <span className="text-xs font-medium">MVUZOD Schema: {hasSchema ? '✅ Có' : '⬛ Chưa tạo'}</span>
        </div>
        {hasSchema && existingEntryCount > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1 ml-5">
            {existingEntryCount} entries MVUZOD đã tồn tại trong lorebook
          </p>
        )}
      </div>

      {/* Validation issues */}
      {(errors.length > 0 || warnings.length > 0 || infos.length > 0) && (
        <div className="space-y-1.5">
          {errors.map((issue, i) => (
            <IssueRow key={`e${i}`} issue={issue} />
          ))}
          {warnings.map((issue, i) => (
            <IssueRow key={`w${i}`} issue={issue} />
          ))}
          {infos.map((issue, i) => (
            <IssueRow key={`i${i}`} issue={issue} />
          ))}
        </div>
      )}
    </>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const icons = {
    error: <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />,
    info: <Info className="w-3 h-3 text-blue-400 shrink-0" />,
  };
  const colors = {
    error: 'bg-red-500/5 border-red-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
    info: 'bg-blue-500/5 border-blue-500/20',
  };
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${colors[issue.severity]}`}>
      {icons[issue.severity]}
      <div>
        <span className="text-[11px] text-foreground/80">{issue.message}</span>
        <span className="text-[9px] text-muted-foreground ml-1.5">({issue.field})</span>
      </div>
    </div>
  );
}

function StepConfigure({
  schema, format, setFormat,
  injectWorldbook, setInjectWorldbook,
  injectRegex, setInjectRegex,
  injectScripts, setInjectScripts,
  replaceExisting, setReplaceExisting,
}: {
  schema: MVUZODSchema | null;
  format: ExportFormat;
  setFormat: (f: ExportFormat) => void;
  injectWorldbook: boolean; setInjectWorldbook: (v: boolean) => void;
  injectRegex: boolean; setInjectRegex: (v: boolean) => void;
  injectScripts: boolean; setInjectScripts: (v: boolean) => void;
  replaceExisting: boolean; setReplaceExisting: (v: boolean) => void;
}) {
  return (
    <>
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Settings2 className="w-4 h-4 text-primary" />
        Cấu hình Export
      </h3>

      {/* Format selection */}
      <div>
        <label className="text-[11px] text-muted-foreground font-medium mb-2 block">Định dạng xuất</label>
        <div className="flex gap-2">
          {[
            { id: 'json' as const, label: 'JSON', icon: FileJson, desc: 'Character Card V3' },
            { id: 'png' as const, label: 'PNG', icon: Image, desc: 'Ảnh + metadata embedded' },
            { id: 'both' as const, label: 'Cả hai', icon: Package, desc: 'JSON + PNG' },
          ].map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => setFormat(opt.id)}
                className={`flex-1 p-3 rounded-lg border transition-all text-left ${
                  format === opt.id
                    ? 'border-primary/40 bg-primary/5 shadow-sm shadow-primary/5'
                    : 'border-border hover:border-primary/20'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${format === opt.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-xs font-medium">{opt.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MVUZOD injection options */}
      {schema && (
        <div className="space-y-2.5">
          <label className="text-[11px] text-muted-foreground font-medium block">Tự động inject MVUZOD</label>

          <ToggleOption
            label="Inject Worldbook Entries"
            desc="5 system entries: initvar, variable list, update rules, output format, emphasis"
            checked={injectWorldbook}
            onChange={setInjectWorldbook}
            icon={BookOpen}
          />
          <ToggleOption
            label="Inject Regex Patterns"
            desc="4 regex ẩn <UpdateVariable>, <initvar>, <JSONPatch>, <StatusPlaceHolder>"
            checked={injectRegex}
            onChange={setInjectRegex}
            icon={Shield}
          />
          <ToggleOption
            label="Inject Tavern Helper Scripts"
            desc="MVU Import script + Schema registration script"
            checked={injectScripts}
            onChange={setInjectScripts}
            icon={FileCode}
          />

          {injectWorldbook && (
            <ToggleOption
              label="Thay thế entries cũ"
              desc="Tự động thay thế entries MVUZOD đã tồn tại (dedup)"
              checked={replaceExisting}
              onChange={setReplaceExisting}
              icon={Sparkles}
            />
          )}
        </div>
      )}

      {!schema && (
        <div className="rounded-lg bg-muted/20 border border-border/50 p-3 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 inline mr-1.5 text-blue-400" />
          Chưa có MVUZOD Schema — các tùy chọn injection sẽ bị bỏ qua.
          Tạo schema trong MVUZOD Studio trước nếu muốn inject entries tự động.
        </div>
      )}
    </>
  );
}

function ToggleOption({
  label, desc, checked, onChange, icon: Icon,
}: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; icon: typeof BookOpen;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
        checked
          ? 'border-primary/30 bg-primary/5'
          : 'border-border/50 hover:border-border'
      }`}
    >
      <div className={`mt-0.5 w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked ? 'border-primary bg-primary' : 'border-muted-foreground/30'
      }`}>
        {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

function StepPreview({
  card, schema, injectWorldbook, injectRegex, injectScripts,
}: {
  card: ReturnType<typeof useCardStore.getState>['card'];
  schema: MVUZODSchema | null;
  injectWorldbook: boolean;
  injectRegex: boolean;
  injectScripts: boolean;
}) {
  const entries = card.data.character_book?.entries ?? [];
  const willInject = schema && (injectWorldbook || injectRegex || injectScripts);

  return (
    <>
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Package className="w-4 h-4 text-primary" />
        Xem trước Package
      </h3>

      {/* Card summary */}
      <div className="rounded-lg bg-muted/20 border border-border/50 p-3 space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div><span className="text-muted-foreground">Tên:</span> <span className="font-medium">{card.data.name}</span></div>
          <div><span className="text-muted-foreground">Version:</span> <span className="font-medium">{card.data.character_version}</span></div>
          <div><span className="text-muted-foreground">Entries:</span> <span className="font-medium">{entries.length}</span></div>
          <div><span className="text-muted-foreground">Creator:</span> <span className="font-medium">{card.data.creator || '(chưa đặt)'}</span></div>
        </div>
      </div>

      {/* What will be injected */}
      {willInject && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <h4 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Sẽ được inject khi export
          </h4>
          <div className="space-y-1.5 text-[11px]">
            {injectWorldbook && (
              <div className="flex items-center gap-1.5 text-foreground/80">
                <BookOpen className="w-3 h-3 text-emerald-400" />
                5 worldbook entries (initvar, varlist, update rules, output format, emphasis)
              </div>
            )}
            {injectRegex && (
              <div className="flex items-center gap-1.5 text-foreground/80">
                <Shield className="w-3 h-3 text-amber-400" />
                4 regex patterns (ẩn UpdateVariable, initvar, JSONPatch, StatusPlaceHolder)
              </div>
            )}
            {injectScripts && (
              <div className="flex items-center gap-1.5 text-foreground/80">
                <FileCode className="w-3 h-3 text-violet-400" />
                2 Tavern Helper scripts (MVU Import + Schema Registration)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Final entry count */}
      <div className="rounded-lg bg-muted/10 border border-border/50 p-3">
        <div className="text-xs text-muted-foreground">
          <strong className="text-foreground">Tổng kết:</strong> Card sẽ có{' '}
          <span className="font-medium text-foreground">
            {entries.length + (injectWorldbook && schema ? 5 : 0)} entries
          </span>
          {injectWorldbook && schema && <span className="text-emerald-400"> (+5 MVUZOD)</span>},{' '}
          <span className="font-medium text-foreground">
            {(card.data.extensions.regex_scripts?.length ?? 0) + (injectRegex && schema ? 4 : 0)} regex
          </span>
          {injectRegex && schema && <span className="text-amber-400"> (+4)</span>},{' '}
          <span className="font-medium text-foreground">
            {(card.data.extensions.tavern_helper?.scripts?.length ?? 0) + (injectScripts && schema ? 2 : 0)} scripts
          </span>
          {injectScripts && schema && <span className="text-violet-400"> (+2)</span>}
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground text-center">
        Nhấn "Xuất Card" để tạo file → tải về
      </div>
    </>
  );
}

function StepExportResult({ result }: { result: PackageResult }) {
  return (
    <>
      <div className="text-center py-2">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Check className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold">Export thành công!</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          {result.filename} — {(result.totalSize / 1024).toFixed(1)} KB
        </p>
      </div>

      {/* Files generated */}
      <div className="space-y-1.5">
        {result.jsonBlob && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs font-medium">{result.filename}_v3.json</div>
                <div className="text-[10px] text-muted-foreground">{(result.jsonBlob.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        )}
        {result.pngBlob && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-violet-400" />
              <div>
                <div className="text-xs font-medium">{result.filename}.png</div>
                <div className="text-[10px] text-muted-foreground">{(result.pngBlob.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        )}
      </div>

      {/* Injections summary */}
      {result.injections.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <h4 className="text-[11px] font-semibold text-primary mb-1.5">Đã inject:</h4>
          <ul className="text-[10px] text-foreground/80 space-y-0.5">
            {result.injections.map((inj, i) => (
              <li key={i} className="flex items-center gap-1">
                <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                {inj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation warnings (if any) */}
      {result.validation.filter(v => v.severity === 'warning').length > 0 && (
        <div className="space-y-1">
          {result.validation.filter(v => v.severity === 'warning').map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
        </div>
      )}
    </>
  );
}
