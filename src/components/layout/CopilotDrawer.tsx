/**
 * Copilot Drawer — AI Assistant panel (right side)
 * Stub for Phase 0, full implementation in Phase 11
 */

import { MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { WORLDBUILDING_MODE_LABELS } from '../../types';
import { cn } from '../../lib/utils';

interface CopilotDrawerProps {
  open: boolean;
  onToggle: () => void;
}

export function CopilotDrawer({ open, onToggle }: CopilotDrawerProps) {
  const { mode, setMode, messages } = useChatStore();

  return (
    <>
      {/* Toggle button (always visible) */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 z-10',
          'p-1 bg-card border border-border rounded-l-md shadow-sm',
          'text-muted-foreground hover:text-foreground transition-colors',
          open && 'hidden'
        )}
        title="Mở Copilot"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Drawer */}
      <aside
        className={cn(
          'h-full bg-card border-l border-border flex flex-col shrink-0 transition-all duration-200 overflow-hidden',
          open ? 'w-80' : 'w-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI Copilot</span>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="px-3 py-2 border-b border-border shrink-0">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            className="w-full text-xs bg-secondary text-secondary-foreground rounded-md px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {(Object.entries(WORLDBUILDING_MODE_LABELS) as [typeof mode, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Chat area (placeholder) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Chào bạn! Tôi là AI Copilot.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Hỏi bất kỳ điều gì về card của bạn.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'text-xs px-3 py-2 rounded-lg max-w-[90%] animate-fade-in',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground self-end'
                      : msg.role === 'system'
                      ? 'bg-muted text-muted-foreground self-center text-center'
                      : 'bg-secondary text-secondary-foreground self-start'
                  )}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input (placeholder) */}
        <div className="px-3 py-2 border-t border-border shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập yêu cầu..."
              className="flex-1 text-xs bg-secondary text-secondary-foreground rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-ring"
              disabled
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Cài đặt AI proxy trước khi sử dụng.
          </p>
        </div>
      </aside>
    </>
  );
}
