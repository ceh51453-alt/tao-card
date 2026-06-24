/**
 * Sidebar — Navigation + Project list
 * spec Phần 4.1
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Settings, FileText, BookOpen, Puzzle, Wrench, ScrollText,
  Plus, Trash2, Wand2
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { cn } from '../../lib/utils';

interface SidebarProps {
  open: boolean;
}

const NAV_ITEMS = [
  { path: '/auto-creator', icon: Wand2, label: 'Auto Creator', emoji: '🪄' },
  { path: '/settings', icon: Settings, label: 'Cài đặt', emoji: '⚙' },
  { path: '/editor', icon: FileText, label: 'Card Editor', emoji: '📝' },
  { path: '/lorebook', icon: BookOpen, label: 'Lorebook', emoji: '📚' },
  { path: '/regex', icon: Puzzle, label: 'Regex Lab', emoji: '🧩' },
  { path: '/mvuzod', icon: Wrench, label: 'MVUZOD', emoji: '🛠' },
  { path: '/ejs-studio', icon: ScrollText, label: 'EJS Studio', emoji: '📜' },
  { path: '/wiki', icon: BookOpen, label: 'Wiki Collector', emoji: '🕸️' },
];

export function Sidebar({ open }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    projects, currentProjectId,
    loadProject, createNewProject, refreshProjectList, deleteProject,
  } = useCardStore();

  useEffect(() => {
    refreshProjectList();
  }, [refreshProjectList]);

  return (
    <aside
      className={cn(
        'h-full bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-200 overflow-hidden',
        open ? 'w-52' : 'w-12'
      )}
    >
      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-primary font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
              title={item.label}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {open && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="mx-3 my-2 border-t border-sidebar-border" />

      {/* Projects */}
      {open && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-1.5">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Projects
            </span>
            <button
              onClick={() => createNewProject()}
              className="p-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Tạo project mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            {projects.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'group flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                  p.id === currentProjectId
                    ? 'bg-sidebar-accent text-primary font-medium'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50'
                )}
              >
                <button
                  onClick={() => loadProject(p.id)}
                  className="truncate flex-1 text-left"
                >
                  {p.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Bạn có chắc chắn muốn xóa dự án này?')) {
                      deleteProject(p.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="Xóa dự án"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {projects.length === 0 && (
              <p className="text-[10px] text-muted-foreground px-2 py-4 text-center">
                Chưa có project nào.
                <br />
                Nhấn + để tạo mới.
              </p>
            )}
          </div>
        </div>
      )}

      {!open && (
        <div className="flex-1 flex flex-col items-center gap-1 px-1 py-2">
          <button
            onClick={() => createNewProject()}
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
            title="Tạo project mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
