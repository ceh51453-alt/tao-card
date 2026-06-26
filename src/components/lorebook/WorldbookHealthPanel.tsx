/**
 * WorldbookHealthPanel — Kiểm tra sức khỏe cấu hình Worldbook
 * Hiển thị kết quả health check + nút auto-fix
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronRight, Wrench, AlertTriangle, Info } from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { checkWorldbookHealth, type HealthReport, type HealthWarning } from '../../lib/worldbook/worldbookHealthCheck';
import type { CardType } from '../../lib/worldbook/worldbookConfig';

export function WorldbookHealthPanel() {
  const card = useCardStore(s => s.card);
  const updateEntry = useCardStore(s => s.updateEntry);
  const entries = useMemo(() => card.data.character_book?.entries ?? [], [card.data.character_book?.entries]);

  const [expanded, setExpanded] = useState(false);
  const [cardType, setCardType] = useState<CardType>('single');

  const [report, setReport] = useState<HealthReport>({ errors: 0, warnings: 0, infos: 0, items: [] });

  useEffect(() => {
    checkWorldbookHealth(entries, cardType).then(setReport);
  }, [entries, cardType]);

  const hasIssues = report.errors > 0 || report.warnings > 0;
  const fixableItems = useMemo(() => report.items.filter(i => i.autoFixable), [report.items]);

  const handleFixOne = useCallback((item: HealthWarning) => {
    if (!item.fix) return;
    const currentEntries = useCardStore.getState().card.data.character_book?.entries ?? [];
    const entry = currentEntries.find(e => e.id === item.entryId);
    if (!entry) return;

    const { extensions: extPatch, ...entryPatch } = item.fix;
    const updated = {
      ...entry,
      ...entryPatch,
      extensions: extPatch
        ? { ...entry.extensions, ...extPatch }
        : entry.extensions,
    };
    updateEntry(entry.id, updated);
  }, [updateEntry]);

  const handleFixAll = useCallback(() => {
    for (const item of fixableItems) {
      handleFixOne(item);
    }
  }, [fixableItems, handleFixOne]);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {hasIssues
            ? <ShieldAlert className="w-4 h-4 text-amber-400" />
            : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
          <span className="font-medium text-foreground">Health Check</span>
          {report.errors > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-medium">
              {report.errors} lỗi
            </span>
          )}
          {report.warnings > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-medium">
              {report.warnings} cảnh báo
            </span>
          )}
          {report.infos > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-medium">
              {report.infos} gợi ý
            </span>
          )}
          {!hasIssues && report.infos === 0 && (
            <span className="text-xs text-emerald-400">OK</span>
          )}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {/* Card type selector */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Loại thẻ:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="hc-cardType" checked={cardType === 'single'}
                onChange={() => setCardType('single')} className="settings-checkbox" />
              Nhân vật đơn
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="hc-cardType" checked={cardType === 'multi'}
                onChange={() => setCardType('multi')} className="settings-checkbox" />
              Nhiều nhân vật
            </label>
          </div>

          {/* Fix all button */}
          {fixableItems.length > 0 && (
            <button onClick={handleFixAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
              <Wrench className="w-3.5 h-3.5" />
              Auto-fix {fixableItems.length} vấn đề
            </button>
          )}

          {/* Issues list */}
          {report.items.length === 0 ? (
            <div className="text-xs text-emerald-400/80 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Tất cả entries đều cấu hình đúng!
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {report.items.map((item, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                  item.level === 'error' ? 'bg-destructive/5 border border-destructive/20' :
                  item.level === 'warning' ? 'bg-amber-500/5 border border-amber-500/20' :
                  'bg-blue-500/5 border border-blue-500/20'
                }`}>
                  {item.level === 'error' && <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />}
                  {item.level === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                  {item.level === 'info' && <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">{item.comment || `Entry #${item.entryId}`}</span>
                    <p className="text-muted-foreground mt-0.5">{item.message}</p>
                  </div>
                  {item.autoFixable && (
                    <button onClick={() => handleFixOne(item)}
                      className="shrink-0 px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-[10px] font-medium">
                      Fix
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
