/**
 * EJSEditor — Code editor + Variable panel + Validation for @@preprocessing entries
 * Spec 8B.4: Auto-detect EJS, syntax highlight, variable panel, validate, preview
 */

import { useState, useCallback, useMemo } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle,
  Play, Info, Variable,
} from 'lucide-react';
import type { MVUZODSchema } from '../../types/mvuzod.types';
import {
  parseEJS, validateEJSEntry, isPreprocessingEntry,
  generateGetvarCall, flattenSchemaForPanel,
  type ValidationResult,
} from '../../lib/ejs/ejsParser';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EJS EDITOR
// ═══════════════════════════════════════════════════════════════════════════

export function EJSEditor({ content, onChange, schema }: {
  content: string;
  onChange: (content: string) => void;
  schema: MVUZODSchema | null;
}) {
  const [showPanel, setShowPanel] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [previewOutput, setPreviewOutput] = useState<string | null>(null);

  const isEJS = isPreprocessingEntry(content);
  const tokens = useMemo(() => parseEJS(content), [content]);

  const handleValidate = useCallback(() => {
    const result = validateEJSEntry(content, schema ?? undefined);
    setValidationResult(result);
  }, [content, schema]);

  const handlePreview = useCallback(() => {
    // Simulate EJS execution with mock getvar
    try {
      const mockOutput = simulateEJS(content);
      setPreviewOutput(mockOutput);
    } catch (e) {
      setPreviewOutput(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [content]);

  const handleInsertGetvar = useCallback((path: string, defaultValue: unknown) => {
    const call = generateGetvarCall(path, defaultValue);
    const varName = '_' + (path.split('/').pop() ?? 'var').replace(/\s+/g, '_').replace(/[^\w\u00C0-\u024F\u1E00-\u1EFF]/g, '');
    const line = `if (typeof ${varName} === 'undefined') var ${varName} = ${call};\n`;
    // Insert before last _%>
    const lastSlurp = content.lastIndexOf('_%>');
    if (lastSlurp !== -1) {
      onChange(content.slice(0, lastSlurp) + line + content.slice(lastSlurp));
    } else {
      onChange(content + '\n' + line);
    }
  }, [content, onChange]);

  return (
    <div className="space-y-3">
      {/* Mode indicator */}
      {isEJS && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-medium text-blue-400">Chế độ: EJS @@preprocessing</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Code editor */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border bg-background overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/20">
              <button onClick={handleValidate}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:bg-muted transition-colors">
                <CheckCircle className="w-3 h-3" /> Validate
              </button>
              <button onClick={handlePreview}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:bg-muted transition-colors">
                <Play className="w-3 h-3" /> Preview
              </button>
              <button onClick={() => setShowPanel(!showPanel)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:bg-muted transition-colors ml-auto">
                <Variable className="w-3 h-3" /> {showPanel ? 'Ẩn' : 'Hiện'} Panel
              </button>
            </div>

            {/* Syntax-highlighted editor */}
            <div className="relative">
              <textarea
                value={content}
                onChange={e => onChange(e.target.value)}
                rows={14}
                spellCheck={false}
                className="w-full px-4 py-3 bg-transparent text-xs font-mono resize-y
                  focus:outline-none leading-relaxed"
                style={{ tabSize: 2 }}
              />
              {/* Overlay: syntax colored tokens (decorative only for now) */}
            </div>

            {/* Token summary */}
            <div className="px-3 py-1.5 border-t border-border bg-muted/10 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{tokens.length} tokens</span>
              <span>{tokens.filter(t => t.type === 'statement').length} statements</span>
              <span>{tokens.filter(t => t.type === 'expression').length} expressions</span>
              <span>{tokens.filter(t => t.type === 'comment').length} comments</span>
            </div>
          </div>

          {/* Validation result */}
          {validationResult && (
            <ValidationDisplay result={validationResult} />
          )}

          {/* Preview output */}
          {previewOutput !== null && (
            <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">Preview Output</span>
                <button onClick={() => setPreviewOutput(null)}
                  className="text-muted-foreground hover:text-foreground">
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
              <pre className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground">
                {previewOutput || '(no output — preprocessing entries suppress output)'}
              </pre>
            </div>
          )}
        </div>

        {/* Variable panel */}
        {showPanel && schema && (
          <VariablePanel schema={schema} onInsert={handleInsertGetvar} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIABLE PANEL
// ═══════════════════════════════════════════════════════════════════════════

function VariablePanel({ schema, onInsert }: {
  schema: MVUZODSchema;
  onInsert: (path: string, defaultValue: unknown) => void;
}) {
  const flatFields = useMemo(
    () => flattenSchemaForPanel(schema.fields),
    [schema.fields],
  );

  return (
    <div className="w-56 shrink-0 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/20">
        <p className="text-[10px] font-medium flex items-center gap-1.5">
          <Variable className="w-3 h-3 text-primary" /> Schema Variables
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">Click → paste getvar()</p>
      </div>

      <div className="max-h-80 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
        {flatFields.map((field, i) => {
          const typeColors: Record<string, string> = {
            string: 'text-emerald-400', number: 'text-blue-400', boolean: 'text-amber-400',
            object: 'text-purple-400', record: 'text-orange-400', array: 'text-cyan-400',
          };
          const isLeaf = !['object'].includes(field.type);

          return (
            <button
              key={i}
              onClick={() => isLeaf && onInsert(field.fullPath, field.defaultValue)}
              disabled={!isLeaf}
              className={`w-full text-left px-2 py-1 rounded-md text-[10px] transition-colors ${
                isLeaf ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default'
              }`}
              style={{ paddingLeft: `${8 + field.depth * 12}px` }}
            >
              <span className={`${isLeaf ? '' : 'font-medium'} ${typeColors[field.type] ?? ''}`}>
                {field.depth > 0 && <span className="text-muted-foreground/30 mr-1">├</span>}
                {field.path}
              </span>
              <span className="text-muted-foreground/50 ml-1">{field.type}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

function ValidationDisplay({ result }: { result: ValidationResult }) {
  return (
    <div className={`mt-2 rounded-lg border p-3 ${
      result.valid && result.warnings.length === 0
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : result.valid
        ? 'bg-amber-500/5 border-amber-500/20'
        : 'bg-destructive/5 border-destructive/20'
    }`}>
      <div className="flex items-center gap-2 mb-1.5">
        {result.valid && result.warnings.length === 0 ? (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        ) : result.valid ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-destructive" />
        )}
        <span className="text-xs font-medium">
          {result.valid ? 'Valid' : 'Invalid'} EJS
          · {result.getvarCalls.length} getvar calls
          · {result.errors.length} errors
          · {result.warnings.length} warnings
        </span>
      </div>

      {result.errors.length > 0 && (
        <div className="space-y-0.5 mt-1.5">
          {result.errors.map((err, i) => (
            <p key={i} className="text-[10px] text-destructive flex items-center gap-1">
              <XCircle className="w-2.5 h-2.5 shrink-0" /> {err}
            </p>
          ))}
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="space-y-0.5 mt-1.5">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-[10px] text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}

      {result.getvarCalls.length > 0 && (
        <details className="mt-2">
          <summary className="text-[10px] text-muted-foreground cursor-pointer">
            {result.getvarCalls.length} getvar() calls
          </summary>
          <div className="mt-1 space-y-0.5">
            {result.getvarCalls.map((call, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[9px] font-mono">
                {call.inSchema === true ? <CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> :
                 call.inSchema === false ? <XCircle className="w-2.5 h-2.5 text-amber-400" /> :
                 <Info className="w-2.5 h-2.5 text-muted-foreground" />}
                <span className="text-muted-foreground">L{call.line}:</span>
                <span className="text-primary">{call.path}</span>
                {call.defaults && <span className="text-muted-foreground/50">(def: {call.defaults})</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION
// ═══════════════════════════════════════════════════════════════════════════

function simulateEJS(content: string): string {
  // For @@preprocessing, output is suppressed — just check for errors
  const tokens = parseEJS(content);
  const hasDirective = tokens.some(t => t.type === 'directive');
  if (hasDirective) {
    return '(@@preprocessing — output suppressed, logic executed server-side)';
  }

  // For non-preprocessing EJS, show what would be output
  return tokens
    .filter(t => t.type === 'literal' || t.type === 'expression')
    .map(t => t.type === 'expression' ? `{{${t.value}}}` : t.value)
    .join('');
}
