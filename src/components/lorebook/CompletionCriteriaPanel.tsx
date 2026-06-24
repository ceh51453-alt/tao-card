/**
 * CompletionCriteriaPanel — Accordion for setting completion criteria + verification report
 * Spec Phần 7F.4: Toggle, min entries, min length, topics, coherence, report display
 */

import { useState, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Target, Plus, Trash2,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import type { CompletionCriteria, RequiredTopic, VerificationReport } from '../../lib/completionVerifier/criteria';

export function CompletionCriteriaPanel({
  criteria, onChange, report, isVerifying,
}: {
  criteria: CompletionCriteria;
  onChange: (c: CompletionCriteria) => void;
  report: VerificationReport | null;
  isVerifying: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const update = useCallback(<K extends keyof CompletionCriteria>(key: K, val: CompletionCriteria[K]) => {
    onChange({ ...criteria, [key]: val });
  }, [criteria, onChange]);

  const addTopic = useCallback(() => {
    const topics = [...(criteria.requiredTopics ?? []), { topic: '', keywords: [], minEntries: 1 }];
    update('requiredTopics', topics);
  }, [criteria.requiredTopics, update]);

  const removeTopic = useCallback((idx: number) => {
    const topics = (criteria.requiredTopics ?? []).filter((_, i) => i !== idx);
    update('requiredTopics', topics);
  }, [criteria.requiredTopics, update]);

  const updateTopic = useCallback((idx: number, field: keyof RequiredTopic, val: string | string[] | number) => {
    const topics = [...(criteria.requiredTopics ?? [])];
    topics[idx] = { ...topics[idx], [field]: val };
    update('requiredTopics', topics);
  }, [criteria.requiredTopics, update]);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Accordion header */}
      <button onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card/50 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">🎯 Tiêu chí hoàn thành</span>
          {criteria.enabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">BẬT</span>
          )}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="border-t border-border p-4 space-y-4 bg-background">
          {/* Toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={criteria.enabled} onChange={e => update('enabled', e.target.checked)}
              className="settings-checkbox" />
            Bật Completion Verification
          </label>

          {criteria.enabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="settings-label">Số entry tối thiểu</label>
                  <input type="number" value={criteria.minEntryCount ?? ''} min={1}
                    onChange={e => update('minEntryCount', parseInt(e.target.value) || undefined)}
                    className="settings-input" placeholder="10" />
                </div>
                <div>
                  <label className="settings-label">Độ dài tối thiểu / entry (chars)</label>
                  <input type="number" value={criteria.minContentLengthPerEntry ?? ''} min={10}
                    onChange={e => update('minContentLengthPerEntry', parseInt(e.target.value) || undefined)}
                    className="settings-input" placeholder="100" />
                </div>
              </div>

              {/* Topic coverage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="settings-label !mb-0">Topic Coverage</label>
                  <button onClick={addTopic}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                    <Plus className="w-3 h-3" /> Thêm topic
                  </button>
                </div>
                {(criteria.requiredTopics ?? []).map((topic, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <input type="text" value={topic.topic} placeholder="Tên topic"
                      onChange={e => updateTopic(idx, 'topic', e.target.value)}
                      className="settings-input flex-1 text-xs" />
                    <input type="text" value={topic.keywords.join(', ')} placeholder="keywords, ..."
                      onChange={e => updateTopic(idx, 'keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      className="settings-input flex-[2] text-xs" />
                    <input type="number" value={topic.minEntries ?? 1} min={1}
                      onChange={e => updateTopic(idx, 'minEntries', parseInt(e.target.value) || 1)}
                      className="settings-input w-14 text-xs" title="Min entries" />
                    <button onClick={() => removeTopic(idx)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Coherence */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={criteria.coherenceCheck ?? false}
                    onChange={e => update('coherenceCheck', e.target.checked)}
                    className="settings-checkbox" />
                  Kiểm tra Coherence bằng AI
                  <span className="text-[10px] text-amber-400">(tốn thêm API call)</span>
                </label>
              </div>

              {/* Max loops */}
              <div>
                <label className="settings-label">Số vòng lặp verify tối đa</label>
                <input type="number" value={criteria.maxVerifyLoops ?? 3} min={1} max={10}
                  onChange={e => update('maxVerifyLoops', parseInt(e.target.value) || 3)}
                  className="settings-input w-20" />
              </div>
            </>
          )}

          {/* Verification Report */}
          {(report || isVerifying) && (
            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                {isVerifying ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-primary" /> Đang verify...</>
                ) : report?.passed ? (
                  <><CheckCircle className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-400">PASS</span></>
                ) : (
                  <><XCircle className="w-4 h-4 text-destructive" /> <span className="text-destructive">FAIL</span></>
                )}
                {report && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {report.loopsDone} loop(s) · +{report.addedEntries} entries
                  </span>
                )}
              </div>

              {report?.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {check.passed
                    ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    : <XCircle className="w-3 h-3 text-destructive shrink-0" />}
                  <span className={check.passed ? 'text-muted-foreground' : 'text-foreground'}>
                    <span className="font-medium">[{check.criteria}]</span> {check.detail}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
