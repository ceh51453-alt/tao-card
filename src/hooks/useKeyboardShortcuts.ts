/**
 * useKeyboardShortcuts — Global keyboard shortcuts hook
 * Ctrl+1..6: Navigate to pages
 * Ctrl+/: Toggle Copilot
 * Ctrl+K: Quick search (future)
 * Ctrl+S: Save project
 * Ctrl+E: Export
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const ROUTES = [
  '/settings',      // Ctrl+1
  '/editor',        // Ctrl+2
  '/lorebook',      // Ctrl+3
  '/regex',         // Ctrl+4
  '/mvuzod',        // Ctrl+5
  '/ejs-studio',    // Ctrl+6
];

export interface ShortcutCallbacks {
  onToggleCopilot?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onQuickSearch?: () => void;
}

export function useKeyboardShortcuts(callbacks: ShortcutCallbacks = {}) {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Only allow Escape in inputs
      if (e.key !== 'Escape') return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Ctrl+1..6 — Page navigation
    if (ctrl && !shift && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      const idx = parseInt(e.key) - 1;
      if (ROUTES[idx]) navigate(ROUTES[idx]);
      return;
    }

    // Ctrl+/ — Toggle copilot
    if (ctrl && e.key === '/') {
      e.preventDefault();
      callbacks.onToggleCopilot?.();
      return;
    }

    // Ctrl+S — Save
    if (ctrl && e.key === 's') {
      e.preventDefault();
      callbacks.onSave?.();
      return;
    }

    // Ctrl+Shift+E — Export
    if (ctrl && shift && e.key === 'E') {
      e.preventDefault();
      callbacks.onExport?.();
      return;
    }

    // Ctrl+K — Quick search
    if (ctrl && e.key === 'k') {
      e.preventDefault();
      callbacks.onQuickSearch?.();
      return;
    }
  }, [navigate, callbacks]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// ─── Shortcut label helper ──────────────────────────────────────────────

const isMac = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');

export function formatShortcut(key: string): string {
  const prefix = isMac ? '⌘' : 'Ctrl';
  return `${prefix}+${key}`;
}

export const SHORTCUT_LIST = [
  { keys: formatShortcut('1'), action: 'Cài đặt' },
  { keys: formatShortcut('2'), action: 'Card Editor' },
  { keys: formatShortcut('3'), action: 'Lorebook' },
  { keys: formatShortcut('4'), action: 'Regex Lab' },
  { keys: formatShortcut('5'), action: 'MVUZOD Studio' },
  { keys: formatShortcut('6'), action: 'EJS Studio' },
  { keys: formatShortcut('/'), action: 'Mở/Đóng Copilot' },
  { keys: formatShortcut('S'), action: 'Lưu project' },
  { keys: formatShortcut('Shift+E'), action: 'Export' },
  { keys: formatShortcut('K'), action: 'Quick Search' },
];
