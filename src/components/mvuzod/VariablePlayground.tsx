/* eslint-disable react-hooks/set-state-in-effect */
/**
 * VariablePlayground — Interactive playground for testing MVUZOD variables
 * Input raw values → validate/transform → see results + errors
 * Also includes JSON Patch test panel
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Play, RotateCcw, AlertTriangle, CheckCircle, XCircle,
  Zap, Pencil, FlaskConical, ArrowRight, ChevronDown, ChevronRight,
} from 'lucide-react';
import type { MVUZODSchema, MVUZODField, JSONPatchOp } from '../../types/mvuzod.types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface FieldValidation {
  path: string;
  label: string;
  inputValue: unknown;
  outputValue: unknown;
  valid: boolean;
  error?: string;
  transformed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function VariablePlayground({ schema }: { schema: MVUZODSchema | null }) {
  const [inputJson, setInputJson] = useState('');
  const [results, setResults] = useState<FieldValidation[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [activePanel, setActivePanel] = useState<'validate' | 'patch'>('validate');

  // Patch panel state
  const [patchOps, setPatchOps] = useState('');
  const [patchResult, setPatchResult] = useState<{ success: boolean; state: string; errors: string[] } | null>(null);

  // Build default state from schema
  const defaultState = useMemo(() => {
    if (!schema) return {};
    function buildDefaults(fields: MVUZODField[]): Record<string, unknown> {
      const obj: Record<string, unknown> = {};
      for (const f of fields) {
        const name = f.path.split('/').filter(Boolean).pop() ?? f.path;
        if (f.children?.length) {
          obj[name] = buildDefaults(f.children);
        } else {
          obj[name] = f.defaultValue ?? getTypeDefault(f.type);
        }
      }
      return obj;
    }
    return buildDefaults(schema.fields);
  }, [schema]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setInputJson(JSON.stringify(defaultState, null, 2));
    setResults([]);
    setHasRun(false);
    setPatchResult(null);
  }, [defaultState]);

  // Initialize input on first render
  useEffect(() => {
    if (!inputJson && Object.keys(defaultState).length > 0) {
      setInputJson(JSON.stringify(defaultState, null, 2));
    }
  }, [defaultState, inputJson]);

  // Run validation
  const handleValidate = useCallback(() => {
    if (!schema) return;

    let parsedInput: Record<string, unknown>;
    try {
      parsedInput = JSON.parse(inputJson);
    } catch (e) {
      setResults([{
        path: '__root__',
        label: 'JSON Parse',
        inputValue: inputJson,
        outputValue: null,
        valid: false,
        error: `JSON không hợp lệ: ${e instanceof Error ? e.message : String(e)}`,
        transformed: false,
      }]);
      setHasRun(true);
      return;
    }

    const validations: FieldValidation[] = [];

    function validateFields(
      fields: MVUZODField[],
      data: Record<string, unknown>,
      prefix: string,
    ) {
      for (const field of fields) {
        const name = field.path.split('/').filter(Boolean).pop() ?? field.path;
        const fullPath = prefix ? `${prefix}.${name}` : name;
        const inputValue = data[name];

        if (field.children?.length) {
          if (typeof inputValue === 'object' && inputValue !== null) {
            validateFields(field.children, inputValue as Record<string, unknown>, fullPath);
          } else {
            validations.push({
              path: fullPath,
              label: field.label,
              inputValue,
              outputValue: null,
              valid: false,
              error: `Cần object, nhận được ${typeof inputValue}`,
              transformed: false,
            });
          }
          continue;
        }

        // Leaf field validation
        const result = validateField(field, inputValue);
        validations.push({
          path: fullPath,
          label: field.label,
          inputValue,
          outputValue: result.value,
          valid: result.valid,
          error: result.error,
          transformed: result.transformed,
        });
      }
    }

    validateFields(schema.fields, parsedInput, '');
    setResults(validations);
    setHasRun(true);
  }, [schema, inputJson]);

  // Run JSON Patch
  const handlePatch = useCallback(() => {
    let currentState: Record<string, unknown>;
    try {
      currentState = JSON.parse(inputJson);
    } catch {
      setPatchResult({ success: false, state: '', errors: ['Input state JSON không hợp lệ'] });
      return;
    }

    let ops: JSONPatchOp[];
    try {
      ops = JSON.parse(patchOps);
      if (!Array.isArray(ops)) throw new Error('Patch phải là mảng JSON');
    } catch (e) {
      setPatchResult({ success: false, state: '', errors: [`Patch JSON không hợp lệ: ${e instanceof Error ? e.message : ''}`] });
      return;
    }

    const errors: string[] = [];

    // Apply patches
    try {
      for (const op of ops) {
        if (!op.op) {
          errors.push(`Op thiếu "op": ${JSON.stringify(op)}`);
          continue;
        }

        if (op.op === 'move') {
          errors.push(`Op "move" chưa được hỗ trợ trong playground`);
          continue;
        }

        if (!('path' in op) || !op.path) {
          errors.push(`Op thiếu "path": ${JSON.stringify(op)}`);
          continue;
        }

        const pathSegments = op.path.split('/').filter(Boolean);
        let target: Record<string, unknown> = currentState;

        for (let i = 0; i < pathSegments.length - 1; i++) {
          const seg = pathSegments[i];
          if (typeof target[seg] !== 'object' || target[seg] === null) {
            target[seg] = {};
          }
          target = target[seg] as Record<string, unknown>;
        }

        const lastKey = pathSegments[pathSegments.length - 1];

        switch (op.op) {
          case 'replace':
          case 'insert':
            target[lastKey] = op.value;
            break;
          case 'remove':
            delete target[lastKey];
            break;
          case 'delta':
            if (typeof target[lastKey] === 'number') {
               target[lastKey] = (target[lastKey] as number) + op.value;
            } else {
               target[lastKey] = op.value;
            }
            break;
          default:
            errors.push(`Op "${op.op}" không được hỗ trợ`);
        }
      }
    } catch (e) {
      errors.push(`Lỗi apply patch: ${e instanceof Error ? e.message : String(e)}`);
    }

    setPatchResult({
      success: errors.length === 0,
      state: JSON.stringify(currentState, null, 2),
      errors,
    });

    // Update input with patched state
    if (errors.length === 0) {
      setInputJson(JSON.stringify(currentState, null, 2));
    }
  }, [inputJson, patchOps]);

  if (!schema) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <FlaskConical className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Tạo schema trước để sử dụng Playground</p>
      </div>
    );
  }

  const passCount = results.filter(r => r.valid).length;
  const failCount = results.filter(r => !r.valid).length;
  const transformCount = results.filter(r => r.transformed).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FlaskConical className="w-4 h-4 text-primary" />
          Variable Playground
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setActivePanel('validate')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              activePanel === 'validate' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Zap className="w-3 h-3 inline mr-1" />Validate
          </button>
          <button
            onClick={() => setActivePanel('patch')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              activePanel === 'patch' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Pencil className="w-3 h-3 inline mr-1" />JSON Patch
          </button>
        </div>
      </div>

      {/* Input panel */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Input State (JSON)
          </span>
          <button onClick={handleReset}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:bg-muted transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
        <textarea
          value={inputJson}
          onChange={e => setInputJson(e.target.value)}
          className="w-full h-48 p-3 text-xs font-mono bg-background text-foreground/90 resize-y focus:outline-none"
          spellCheck={false}
          placeholder='{"fieldName": value, ...}'
        />
      </div>

      {/* Action button */}
      {activePanel === 'validate' ? (
        <button onClick={handleValidate}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-primary to-violet-500 text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
          <Play className="w-3.5 h-3.5" />
          Chạy Validate + Transform
        </button>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/20">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                JSON Patch Operations
              </span>
            </div>
            <textarea
              value={patchOps}
              onChange={e => setPatchOps(e.target.value)}
              className="w-full h-32 p-3 text-xs font-mono bg-background text-foreground/90 resize-y focus:outline-none"
              spellCheck={false}
              placeholder={`[
  { "op": "replace", "path": "/fieldName", "value": 50 },
  { "op": "insert", "path": "/newField", "value": "hello" }
]`}
            />
          </div>
          <button onClick={handlePatch}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium hover:opacity-90 transition-opacity">
            <ArrowRight className="w-3.5 h-3.5" />
            Apply Patch
          </button>
        </>
      )}

      {/* Results */}
      {activePanel === 'validate' && hasRun && (
        <div className="space-y-2">
          {/* Summary */}
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle className="w-3 h-3" /> {passCount} pass
            </span>
            {failCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="w-3 h-3" /> {failCount} fail
              </span>
            )}
            {transformCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Zap className="w-3 h-3" /> {transformCount} transformed
              </span>
            )}
          </div>

          {/* Per-field results */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {results.map((r, i) => (
              <ValidationRow key={i} result={r} />
            ))}
          </div>
        </div>
      )}

      {activePanel === 'patch' && patchResult && (
        <div className="space-y-2">
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${
            patchResult.success
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/5 border-red-500/20 text-red-400'
          }`}>
            {patchResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            <span className="text-xs font-medium">
              {patchResult.success ? 'Patch áp dụng thành công' : `${patchResult.errors.length} lỗi`}
            </span>
          </div>

          {patchResult.errors.length > 0 && (
            <div className="space-y-1">
              {patchResult.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10">
                  <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-red-300">{err}</span>
                </div>
              ))}
            </div>
          )}

          {patchResult.success && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/20">
                <span className="text-[10px] font-semibold text-muted-foreground">Patched State</span>
              </div>
              <pre className="p-3 text-xs font-mono text-foreground/80 max-h-48 overflow-y-auto">
                {patchResult.state}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION ROW
// ═══════════════════════════════════════════════════════════════════════════

function ValidationRow({ result }: { result: FieldValidation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border-b border-border/50 last:border-0 ${!result.valid ? 'bg-red-500/3' : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/20 transition-colors"
      >
        {result.valid
          ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
          : <XCircle className="w-3 h-3 text-red-400 shrink-0" />
        }
        <span className="text-xs font-medium flex-1 truncate">{result.label}</span>
        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
          {JSON.stringify(result.inputValue)}
        </span>
        {result.transformed && (
          <>
            <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[10px] text-amber-400 font-mono truncate max-w-[120px]">
              {JSON.stringify(result.outputValue)}
            </span>
          </>
        )}
        {expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
      </button>
      {expanded && (
        <div className="px-3 pb-2 ml-5 text-[10px] text-muted-foreground space-y-0.5">
          <div>Path: <span className="font-mono">{result.path}</span></div>
          <div>Input: <span className="font-mono text-foreground/80">{JSON.stringify(result.inputValue)}</span></div>
          <div>Output: <span className="font-mono text-foreground/80">{JSON.stringify(result.outputValue)}</span></div>
          {result.error && <div className="text-red-400">❌ {result.error}</div>}
          {result.transformed && <div className="text-amber-400">⚡ Value đã được transform</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════

function validateField(
  field: MVUZODField,
  value: unknown,
): { valid: boolean; value: unknown; error?: string; transformed: boolean } {
  if (value === undefined || value === null) {
    if (field.defaultValue !== undefined) {
      return { valid: true, value: field.defaultValue, transformed: true };
    }
    return { valid: false, value, error: 'Giá trị bị thiếu (undefined/null)', transformed: false };
  }

  switch (field.type) {
    case 'number': {
      let num: number;
      if (field.constraints.coerce) {
        num = Number(value);
        if (isNaN(num)) {
          return { valid: false, value, error: `Không thể coerce "${value}" thành number`, transformed: false };
        }
      } else {
        if (typeof value !== 'number') {
          return { valid: false, value, error: `Cần number, nhận được ${typeof value}`, transformed: false };
        }
        num = value;
      }

      let transformed = field.constraints.coerce && typeof value !== 'number';

      // Clamp
      if (field.constraints.clamp) {
        const [min, max] = field.constraints.clamp;
        const clamped = Math.max(min, Math.min(max, num));
        if (clamped !== num) {
          num = clamped;
          transformed = true;
        }
      } else {
        // Min/max
        if (field.constraints.min !== undefined && num < field.constraints.min) {
          return { valid: false, value: num, error: `Giá trị ${num} < min ${field.constraints.min}`, transformed };
        }
        if (field.constraints.max !== undefined && num > field.constraints.max) {
          return { valid: false, value: num, error: `Giá trị ${num} > max ${field.constraints.max}`, transformed };
        }
      }

      return { valid: true, value: num, transformed };
    }

    case 'string': {
      if (typeof value !== 'string') {
        return { valid: false, value, error: `Cần string, nhận được ${typeof value}`, transformed: false };
      }
      if (field.constraints.pattern) {
        try {
          const regex = new RegExp(field.constraints.pattern);
          if (!regex.test(value)) {
            return { valid: false, value, error: `Không match pattern /${field.constraints.pattern}/`, transformed: false };
          }
        } catch {
          // Invalid regex in schema — skip check
        }
      }
      return { valid: true, value, transformed: false };
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        return { valid: false, value, error: `Cần boolean, nhận được ${typeof value}`, transformed: false };
      }
      return { valid: true, value, transformed: false };
    }

    case 'array': {
      if (!Array.isArray(value)) {
        return { valid: false, value, error: `Cần array, nhận được ${typeof value}`, transformed: false };
      }
      return { valid: true, value, transformed: false };
    }

    case 'record': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { valid: false, value, error: `Cần object/record, nhận được ${typeof value}`, transformed: false };
      }
      return { valid: true, value, transformed: false };
    }

    default:
      return { valid: true, value, transformed: false };
  }
}

function getTypeDefault(type: string): unknown {
  switch (type) {
    case 'number': return 0;
    case 'boolean': return false;
    case 'string': return '';
    case 'array': return [];
    case 'record': return {};
    default: return null;
  }
}

