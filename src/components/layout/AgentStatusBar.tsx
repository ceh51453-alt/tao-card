/**
 * AgentStatusBar — Global status indicator for AI operations
 * Spec 11.4: Progress bar, status text, loop counter for all AI pipelines
 */

import { Loader2, Pause, Play, Square, CheckCircle, XCircle } from 'lucide-react';

export type AgentStatus =
  | { type: 'idle' }
  | { type: 'running'; label: string; step?: number; maxSteps?: number }
  | { type: 'paused'; label: string }
  | { type: 'error'; label: string }
  | { type: 'done'; label: string };

export function AgentStatusBar({ status, onPause, onResume, onStop }: {
  status: AgentStatus;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}) {
  if (status.type === 'idle') return null;

  const bgColor = status.type === 'error' ? 'bg-destructive/10 border-destructive/20'
    : status.type === 'done' ? 'bg-emerald-500/10 border-emerald-500/20'
    : status.type === 'paused' ? 'bg-amber-500/10 border-amber-500/20'
    : 'bg-primary/5 border-primary/20';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bgColor} animate-in fade-in slide-in-from-top-1`}>
      {/* Icon */}
      {status.type === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
      {status.type === 'paused' && <Pause className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
      {status.type === 'done' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
      {status.type === 'error' && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}

      {/* Label */}
      <span className="text-xs flex-1 truncate">
        {status.label}
      </span>

      {/* Progress */}
      {'step' in status && status.step != null && status.maxSteps != null && (
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(status.step / status.maxSteps) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {status.step}/{status.maxSteps}
          </span>
        </div>
      )}

      {/* Controls */}
      {(status.type === 'running' || status.type === 'paused') && (
        <div className="flex gap-0.5">
          {status.type === 'running' && onPause && (
            <button onClick={onPause}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Pause className="w-3 h-3" />
            </button>
          )}
          {status.type === 'paused' && onResume && (
            <button onClick={onResume}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Play className="w-3 h-3" />
            </button>
          )}
          {onStop && (
            <button onClick={onStop}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Square className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
