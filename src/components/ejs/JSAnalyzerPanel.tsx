/**
 * JSAnalyzerPanel — Analyze TavernHelper JS scripts for variable accesses
 * Spec 8C.5: Stats, issues, linked accesses, unused fields
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Microscope, CheckCircle, XCircle, AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { MVUZODSchema } from '../../types/mvuzod.types';
import {
  analyzeScript, linkToSchema, findUnusedFields,
  type ScriptAnalysis, type LinkedAccess,
} from '../../lib/jsAnalyzer/variableExtractor';

export function JSAnalyzerPanel({ code, schema }: {
  code: string;
  schema: MVUZODSchema | null;
}) {
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
  const [linked, setLinked] = useState<LinkedAccess[]>([]);

  const handleAnalyze = useCallback(() => {
    const a = analyzeScript(code);
    setAnalysis(a);
    if (schema) {
      setLinked(linkToSchema(a.accesses, schema));
    }
  }, [code, schema]);

  const unusedFields = useMemo(() => {
    if (!analysis || !schema) return [];
    return findUnusedFields(analysis.accesses, schema);
  }, [analysis, schema]);

  const reads = analysis?.accesses.filter(a => a.operation === 'read') ?? [];
  const writes = analysis?.accesses.filter(a => a.operation === 'write') ?? [];
  const issues = linked.filter(l => l.issue);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Microscope className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">JS Analyzer</span>
          {analysis && (
            <span className="text-[10px] text-muted-foreground">
              {reads.length} đọc · {writes.length} ghi · {issues.length} vấn đề
            </span>
          )}
        </div>
        <button onClick={handleAnalyze}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <RefreshCw className="w-3 h-3" /> Phân tích
        </button>
      </div>

      {!analysis ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          Bấm "Phân tích" để quét biến trong script
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <MiniStat label="Đọc" value={reads.length} color="text-blue-400" />
            <MiniStat label="Ghi" value={writes.length} color="text-emerald-400" />
            <MiniStat label="Vấn đề" value={issues.length} color={issues.length > 0 ? 'text-destructive' : 'text-muted-foreground'} />
            <MiniStat label="Imports" value={analysis.imports.length} color="text-purple-400" />
          </div>

          {/* Errors */}
          {analysis.errors.length > 0 && (
            <div className="space-y-1">
              {analysis.errors.map((err, i) => (
                <p key={i} className="text-[10px] text-destructive flex items-center gap-1">
                  <XCircle className="w-2.5 h-2.5 shrink-0" /> {err}
                </p>
              ))}
            </div>
          )}

          {/* Linked accesses */}
          {linked.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Biến truy cập:</p>
              {linked.map((l, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] ${
                  l.issue === 'missing_from_schema' ? 'bg-destructive/5 border border-destructive/20' :
                  l.issue === 'read_only_but_written' ? 'bg-amber-500/5 border border-amber-500/20' :
                  'bg-muted/30'
                }`}>
                  {!l.issue ? <CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> :
                   l.issue === 'read_only_but_written' ? <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" /> :
                   <XCircle className="w-2.5 h-2.5 text-destructive shrink-0" />}

                  <span className="font-mono text-primary">{l.access.jsonPointer}</span>
                  <span className={`px-1 py-0.5 rounded text-[8px] font-medium ${
                    l.access.operation === 'read' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {l.access.operation.toUpperCase()}
                  </span>

                  {l.schemaField && (
                    <span className="text-muted-foreground/60">
                      {l.schemaField.type}
                      {l.schemaField.constraints.clamp && `[${l.schemaField.constraints.clamp.join(',')}]`}
                    </span>
                  )}

                  {l.suggestion && (
                    <span className="ml-auto text-[9px] text-muted-foreground truncate max-w-32">
                      {l.suggestion}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Unused schema fields */}
          {unusedFields.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">
                📋 Schema fields không được dùng:
              </p>
              {unusedFields.slice(0, 8).map((f, i) => (
                <p key={i} className="text-[10px] text-muted-foreground/60 pl-3 font-mono">
                  {f.path}
                </p>
              ))}
              {unusedFields.length > 8 && (
                <p className="text-[9px] text-muted-foreground/40 pl-3">
                  ... +{unusedFields.length - 8} fields khác
                </p>
              )}
            </div>
          )}

          {/* Function calls */}
          {analysis.functionCalls.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {analysis.functionCalls.map((fn, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono text-muted-foreground">
                  {fn}()
                </span>
              ))}
            </div>
          )}

          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div className="space-y-0.5">
              {analysis.warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border px-2 py-1.5 text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
