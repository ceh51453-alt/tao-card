/**
 * AppShell — Main layout wrapper
 * spec Phần 4.1: Sidebar + Main content + Copilot Drawer
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { CopilotDrawer } from './CopilotDrawer';
import { ErrorBoundary } from './ErrorBoundary';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useCardStore } from '../../store/cardStore';

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(max-width: 1024px)').matches;
  });
  const [copilotOpen, setCopilotOpen] = useState(false);
  const save = useCardStore(s => s.save);

  const handleSave = useCallback(() => {
    save().catch(() => {});
  }, [save]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onToggleCopilot: () => setCopilotOpen(prev => !prev),
    onSave: handleSave,
  });

  // Responsive: auto-collapse sidebar on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar open={sidebarOpen} />

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center bg-background text-muted-foreground text-sm h-full w-full">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tải trang...</span>
                </div>
              </div>
            }>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        <CopilotDrawer
          open={copilotOpen}
          onToggle={() => setCopilotOpen(!copilotOpen)}
        />
      </div>
    </div>
  );
}
