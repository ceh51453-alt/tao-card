/**
 * TopBar — spec Phần 4.1
 * [≡] [Tên Project ▾] [● Đã lưu 10:42] [Import][Export] [↩️] [🌙]
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Menu, Upload, Download, Undo2, Moon, Sun, ChevronDown,
  FileJson, BookOpen, FileText, AlertCircle, Check, Image, Plus, Folder, Shield, LayoutGrid, Eraser, ArrowUp, ArrowDown,
  HelpCircle
} from 'lucide-react';
import { useCardStore } from '../../store/cardStore';
import { importCard, exportCardV3, exportCardV2Compat, exportStandaloneLorebook, exportCharacterOnly } from '../../lib/converters/lorebookConvert';
import { extractCharaFromPng, writeCharaToPng, convertToPngBuffer, getDefaultCardPng } from '../../lib/converters/pngMetadata';
import type { ImportFormat } from '../../lib/converters/lorebookConvert';
import { cn } from '../../lib/utils';
import { ExportWizard } from '../export/ExportWizard';
import { ValidationDashboard } from '../common/ValidationDashboard';
import { TemplateGallery } from '../templates/TemplateGallery';
import { UserGuideModal } from '../common/UserGuideModal';
import { db } from '../../lib/db/db';

interface TopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const FORMAT_LABELS: Record<ImportFormat, string> = {
  v3_card: 'Character Card V3',
  v2_card: 'Character Card V2 (chuyển đổi)',
  standalone_lorebook: 'Standalone Lorebook',
  unknown: 'Không xác định',
};

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const {
    card, isDirty, isSaving, lastSavedAt, undoToSnapshot, setCard, createSnapshot,
    projects, currentProjectId, loadProject, createNewProject, renameProject,
  } = useCardStore();
  const [isDark, setIsDark] = useState(true);
  const [showExportWizard, setShowExportWizard] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);

  // App Updater
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAppUpdate = async (type: 'upgrade' | 'downgrade') => {
    if (!confirm(type === 'upgrade' ? 'Bạn có muốn kéo (pull) phiên bản mới nhất từ GitHub?' : 'Bạn có muốn lùi (reset) về phiên bản trước đó 1 commit?')) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/app/${type}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Thành công!\n\n' + data.message);
        window.location.reload();
      } else {
        alert('Lỗi:\n\n' + data.error);
      }
    } catch (err) {
      alert('Không thể kết nối đến server nội bộ. Vui lòng đảm bảo bạn đang chạy Vite server.\nLỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUpdating(false);
    }
  };

  // Export dropdown
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Project dropdown
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentProjectName = currentProject ? currentProject.name : 'New Character';

  // State to hold the project rename input
  const [renameInput, setRenameInput] = useState(currentProjectName);
  const [prevProjectName, setPrevProjectName] = useState(currentProjectName);
  const [prevDropdown, setPrevDropdown] = useState(showProjectsDropdown);

  if (currentProjectName !== prevProjectName || showProjectsDropdown !== prevDropdown) {
    setPrevProjectName(currentProjectName);
    setPrevDropdown(showProjectsDropdown);
    setRenameInput(currentProjectName);
  }

  // Import toast
  const [importToast, setImportToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRename = () => {
    if (currentProjectId && renameInput.trim() && renameInput.trim() !== currentProjectName) {
      renameProject(currentProjectId, renameInput.trim());
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false);
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!importToast) return;
    const t = setTimeout(() => setImportToast(null), 4000);
    return () => clearTimeout(t);
  }, [importToast]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const formatSaveTime = () => {
    if (isSaving) return '● Đang lưu...';
    if (!lastSavedAt) return '';
    const d = new Date(lastSavedAt);
    return `● Đã lưu ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // ─── Import ─────────────────────────────────────────────────────────

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.png';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        let json: Record<string, unknown>;
        let avatarBase64: string | undefined = undefined;

        if (file.name.toLowerCase().endsWith('.png')) {
          const arrayBuffer = await file.arrayBuffer();
          const charaJsonStr = extractCharaFromPng(arrayBuffer);
          if (!charaJsonStr) {
            throw new Error('Không tìm thấy dữ liệu character card trong file PNG này.');
          }
          json = JSON.parse(charaJsonStr) as Record<string, unknown>;

          // Store the PNG image itself as base64 in card.avatar
          avatarBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        } else {
          const text = await file.text();
          json = JSON.parse(text) as Record<string, unknown>;
        }

        const result = importCard(json);
        if (avatarBase64) {
          result.card.avatar = avatarBase64;
        }

        // Create snapshot before overwriting
        await createSnapshot(`Trước import ${file.name}`);

        setCard(result.card);

        const warningText = result.warnings.length > 0 ? ` (${result.warnings.join('; ')})` : '';
        setImportToast({
          type: 'success',
          message: `Import thành công: ${FORMAT_LABELS[result.format] || 'Character Card'}${warningText}`,
        });
      } catch (err) {
        setImportToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Lỗi import không xác định.',
        });
      }
    };
    input.click();
  }, [createSnapshot, setCard]);

  // ─── Export helpers ─────────────────────────────────────────────────

  const downloadJson = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  }, []);

  const safeName = card.data.name.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF_-]/g, '_') || 'card';

  const handleExportV3 = useCallback(() => {
    downloadJson(exportCardV3(card), `${safeName}_v3.json`);
  }, [card, safeName, downloadJson]);

  const handleExportPng = useCallback(async () => {
    try {
      const v3Json = exportCardV3(card);
      const v2Json = exportCardV2Compat(card);
      let pngBuffer: ArrayBuffer;

      if (card.avatar && card.avatar.startsWith('data:image/')) {
        pngBuffer = await convertToPngBuffer(card.avatar);
      } else {
        // Fallback to generating a default template PNG
        pngBuffer = await getDefaultCardPng(card.data.name);
      }

      // Embed the metadata (ccv3 + chara chunks)
      const outputBuffer = writeCharaToPng(pngBuffer, v3Json, v2Json);

      // Download
      const blob = new Blob([outputBuffer], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExport(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi xuất file PNG.');
    }
  }, [card, safeName]);

  const handleExportLorebook = useCallback(() => {
    downloadJson(exportStandaloneLorebook(card), `${safeName}_lorebook.json`);
  }, [card, safeName, downloadJson]);

  const handleExportCharOnly = useCallback(() => {
    downloadJson(exportCharacterOnly(card), `${safeName}_char_only.json`);
  }, [card, safeName, downloadJson]);

  return (
    <header className="h-12 border-b border-border bg-card flex items-center px-3 gap-2 shrink-0 relative">
      {/* Sidebar toggle */}
      <button onClick={onToggleSidebar}
        className="p-1.5 rounded-md hover:bg-accent transition-colors" aria-label="Toggle sidebar">
        <Menu className="w-4 h-4" />
      </button>

      {/* Project name */}
      <div className="relative" ref={projectDropdownRef}>
        <button
          onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors text-sm font-medium truncate max-w-[200px]"
        >
          <span className="truncate">{currentProjectName || 'Untitled Project'}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>

        {showProjectsDropdown && (
          <div className="absolute left-0 top-full mt-1 w-72 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">Quản lý dự án</p>
            </div>
            
            {/* Rename section */}
            <div className="p-3 border-b border-border bg-muted/10">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Tên dự án hiện tại
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleRenameKeyDown}
                  className="flex-1 px-2.5 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-foreground"
                  placeholder="Nhập tên dự án..."
                />
              </div>
            </div>

            {/* Project List */}
            <div className="max-h-60 overflow-y-auto scrollbar-thin p-1.5 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                Chuyển dự án ({projects.length})
              </span>
              {projects.map((p) => {
                const isActive = p.id === currentProjectId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      loadProject(p.id);
                      setShowProjectsDropdown(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground/75 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Create project at the bottom */}
            <div className="p-1.5 border-t border-border bg-muted/20">
              <button
                onClick={async () => {
                  await createNewProject();
                  setShowProjectsDropdown(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Tạo dự án mới
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save status */}
      <span className={cn('text-xs whitespace-nowrap', isDirty ? 'text-amber-500' : 'text-muted-foreground')}>
        {formatSaveTime()}
      </span>

      <div className="flex-1" />

      {/* Import toast */}
      {importToast && (
        <div className={cn(
          'absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-2',
          importToast.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-destructive/15 text-destructive border border-destructive/20',
        )}>
          {importToast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="max-w-md truncate">{importToast.message}</span>
        </div>
      )}

      {/* Import */}
      <button onClick={handleImport}
        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Import" title="Import JSON">
        <Upload className="w-4 h-4" />
      </button>

      {/* Export dropdown */}
      <div className="relative" ref={exportRef}>
        <button onClick={() => setShowExport(!showExport)}
          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Export" title="Export">
          <Download className="w-4 h-4" />
        </button>

        {showExport && (
          <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">Xuất file</p>
            </div>
            <div className="p-1.5">
              <ExportOption icon={Download} label="📦 Export Package (Wizard)"
                desc="Wizard đầy đủ: inject MVUZOD + validate + export" onClick={() => { setShowExport(false); setShowExportWizard(true); }} />
              <div className="h-px bg-border my-1" />
              <ExportOption icon={Image} label="Character Card PNG"
                desc="Xuất ảnh PNG kèm dữ liệu nhân vật" onClick={handleExportPng} />
              <ExportOption icon={FileJson} label="Card V3 (đầy đủ)"
                desc="File .json hoàn chỉnh cho SillyTavern" onClick={handleExportV3} />
              <ExportOption icon={BookOpen} label="Standalone Lorebook"
                desc="Chỉ xuất lorebook entries" onClick={handleExportLorebook} />
              <ExportOption icon={FileText} label="Nhân vật (không lorebook)"
                desc="Card nhẹ, không có lorebook" onClick={handleExportCharOnly} />
            </div>
          </div>
        )}
      </div>

      {/* Undo */}
      <button onClick={() => undoToSnapshot()}
        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Undo" title="Hoàn tác (Ctrl+Z)">
        <Undo2 className="w-4 h-4" />
      </button>

      {/* Validation */}
      <button onClick={() => setShowValidation(true)}
        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Validate" title="Validation Dashboard">
        <Shield className="w-4 h-4" />
      </button>

      {/* Templates */}
      <button onClick={() => setShowTemplates(true)}
        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Templates" title="Template Gallery">
        <LayoutGrid className="w-4 h-4" />
      </button>

      {/* Clear Cache */}
      <button onClick={async () => {
        if (confirm('BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ DỮ LIỆU?\n\nViệc này sẽ XÓA TẤT CẢ các dự án, nhân vật, lịch sử chat và thiết lập API. Không thể khôi phục!')) {
          localStorage.clear();
          sessionStorage.clear();
          try {
            await db.delete();
          } catch (e) {
            console.error('Lỗi khi xóa db:', e);
          }
          window.location.reload();
        }
      }}
        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
        aria-label="Clear All Data" title="Xóa toàn bộ dữ liệu">
        <Eraser className="w-4 h-4" />
      </button>

      {/* App Updater */}
      <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
        <button onClick={() => handleAppUpdate('upgrade')} disabled={isUpdating}
          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-emerald-500 disabled:opacity-50"
          aria-label="Cập nhật (GitHub)" title="Cập nhật (GitHub pull)">
          <ArrowUp className="w-4 h-4" />
        </button>
        <button onClick={() => handleAppUpdate('downgrade')} disabled={isUpdating}
          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-rose-500 disabled:opacity-50"
          aria-label="Hạ bản (GitHub)" title="Hạ bản 1 commit (GitHub reset)">
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>

      {/* Hướng dẫn sử dụng */}
      <button onClick={() => setShowUserGuide(true)}
        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-primary"
        aria-label="User Guide" title="Hướng dẫn sử dụng">
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Theme toggle */}
      <button onClick={toggleTheme}
        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Toggle theme">
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Export Wizard Modal */}
      <ExportWizard open={showExportWizard} onClose={() => setShowExportWizard(false)} />

      {/* Validation Dashboard Modal */}
      <ValidationDashboard open={showValidation} onClose={() => setShowValidation(false)} />

      {/* Template Gallery Modal */}
      <TemplateGallery open={showTemplates} onClose={() => setShowTemplates(false)} />

      {/* User Guide Modal */}
      <UserGuideModal open={showUserGuide} onClose={() => setShowUserGuide(false)} />
    </header>
  );
}

function ExportOption({ icon: Icon, label, desc, onClick }: {
  icon: React.ElementType; label: string; desc: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted/50 transition-colors">
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}
