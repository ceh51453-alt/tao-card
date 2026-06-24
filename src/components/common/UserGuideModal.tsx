import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, BookOpen, ChevronRight, HelpCircle } from 'lucide-react';
import userGuideContent from '../../../USER_GUIDE.md?raw';

interface UserGuideModalProps {
  open: boolean;
  onClose: () => void;
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export function UserGuideModal({ open, onClose }: UserGuideModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Extract headings for Sidebar navigation
  const headings = useMemo<HeadingItem[]>(() => {
    const lines = userGuideContent.split('\n');
    const items: HeadingItem[] = [];
    let inCode = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inCode = !inCode;
        continue;
      }
      if (inCode) continue;

      const match = trimmed.match(/^([#]{1,3})\s+(.*)/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim()
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1');
        const id = text.toLowerCase()
          .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '')
          .replace(/\s+/g, '-');
        items.push({ id, text, level });
      }
    }
    return items;
  }, []);

  // Simple parser function
  const parsedHtml = useMemo(() => {
    return parseMarkdown(userGuideContent);
  }, []);

  const handleHeadingClick = (id: string) => {
    const element = document.getElementById(`guide-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 animate-fade-in">
      <div className="bg-card border border-border rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                Hướng Dẫn Sử Dụng
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Studio V2.0
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">Tài liệu hướng dẫn tính năng Tavern Card Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Box */}
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nội dung..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background/50 placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inner container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-64 border-r border-border bg-muted/5 shrink-0 hidden md:flex flex-col p-4 overflow-y-auto scrollbar-thin">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              Mục lục tài liệu
            </h4>
            <div className="flex flex-col gap-0.5">
              {headings.map((h, i) => {
                return (
                  <button
                    key={i}
                    onClick={() => handleHeadingClick(h.id)}
                    className={`w-full text-left rounded-lg py-1.5 px-2.5 text-xs transition-all hover:bg-muted/70 flex items-center gap-1.5 ${
                      h.level === 1
                        ? 'font-semibold text-foreground/90 mt-2 border-b border-border/20 pb-1 rounded-none'
                        : h.level === 2
                          ? 'pl-4 text-muted-foreground hover:text-foreground'
                          : 'pl-8 text-muted-foreground/80 hover:text-foreground text-[11px]'
                    }`}
                  >
                    {h.level > 1 && <span className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />}
                    <span className="truncate">{h.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background/30">
            {searchQuery && (
              <div className="px-6 py-2.5 bg-primary/5 border-b border-primary/10 text-xs text-primary flex items-center justify-between shrink-0">
                <span>Đang lọc kết quả theo từ khóa: <strong>"{searchQuery}"</strong></span>
                <button onClick={() => setSearchQuery('')} className="underline hover:text-primary/80">
                  Xóa bộ lọc
                </button>
              </div>
            )}

            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto scrollbar-thin px-6 md:px-8 py-6 prose prose-sm prose-invert max-w-none"
            >
              {searchQuery ? (
                <SearchResultFilter html={parsedHtml} query={searchQuery} onHeadingClick={handleHeadingClick} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: parsedHtml }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchResultFilter({ html, query }: { html: string; query: string; onHeadingClick: (id: string) => void }) {
  const filteredBlocks = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild as HTMLElement;
    if (!container) return [];

    const blocks: Array<{ type: string; html: string; text: string }> = [];
    const children = Array.from(container.children);

    let currentHeading = 'Giới thiệu chung';

    children.forEach((child) => {
      if (['H1', 'H2', 'H3', 'H4'].includes(child.tagName)) {
        currentHeading = child.textContent || 'Giới thiệu';
      }

      const text = child.textContent || '';
      if (text.toLowerCase().includes(query.toLowerCase())) {
        blocks.push({
          type: currentHeading,
          html: child.outerHTML,
          text: text,
        });
      }
    });

    return blocks;
  }, [html, query]);

  if (filteredBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center gap-2">
        <HelpCircle className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm">Không tìm thấy nội dung phù hợp với từ khóa tìm kiếm.</p>
        <p className="text-xs text-muted-foreground/60">Hãy thử nhập từ khóa ngắn gọn hoặc tìm kiếm mục lục.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">Tìm thấy {filteredBlocks.length} đoạn văn bản phù hợp:</p>
      {filteredBlocks.map((block, idx) => (
        <div key={idx} className="p-4 rounded-xl border border-border/50 bg-muted/15 space-y-2">
          <div className="text-[10px] font-bold text-primary tracking-wider uppercase">
            📍 Mục: {block.type}
          </div>
          <div
            className="text-xs leading-relaxed text-muted-foreground"
            dangerouslySetInnerHTML={{
              __html: block.html.replace(
                new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'),
                '<mark class="bg-primary/20 text-primary font-medium px-0.5 rounded">$1</mark>'
              ),
            }}
          />
        </div>
      ))}
    </div>
  );
}

function parseMarkdown(md: string): string {
  const lines = md.split('\n');
  let result = '';
  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inList = false;
  let inBlockquote = false;
  let bqType: 'note' | 'tip' | 'important' | 'warning' | 'caution' | 'normal' = 'normal';
  let bqLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushList = () => {
    if (inList) {
      result += '</ul>';
      inList = false;
    }
  };

  const flushBlockquote = () => {
    if (inBlockquote) {
      let bqClass = 'border-l-4 pl-4 py-2.5 my-4 rounded-r-lg ';
      let title = '';
      switch (bqType) {
        case 'note':
          bqClass += 'bg-blue-500/10 border-blue-500/85 text-blue-300';
          title = 'NOTE';
          break;
        case 'tip':
          bqClass += 'bg-emerald-500/10 border-emerald-500/85 text-emerald-300';
          title = 'TIP';
          break;
        case 'important':
          bqClass += 'bg-amber-500/10 border-amber-500/85 text-amber-300';
          title = 'IMPORTANT';
          break;
        case 'warning':
          bqClass += 'bg-orange-500/10 border-orange-500/85 text-orange-300';
          title = 'WARNING';
          break;
        case 'caution':
          bqClass += 'bg-red-500/10 border-red-500/85 text-red-300';
          title = 'CAUTION';
          break;
        default:
          bqClass += 'bg-muted/30 border-muted-foreground/30 text-muted-foreground';
      }

      const content = bqLines.map((l) => parseInline(l)).join('<br/>');
      result += `<div class="${bqClass}">`;
      if (title) {
        result += `<div class="text-[10px] font-bold tracking-wider mb-1 text-inherit opacity-90">${title}</div>`;
      }
      result += `<div class="text-xs leading-relaxed">${content}</div></div>`;
      inBlockquote = false;
      bqLines = [];
    }
  };

  const flushTable = () => {
    if (inTable) {
      result += '<div class="overflow-x-auto my-4 border border-border/50 rounded-xl bg-muted/5">';
      result += '<table class="w-full text-xs text-left border-collapse">';

      tableRows.forEach((row, idx) => {
        if (idx === 0) {
          result += '<thead class="bg-muted/30 text-muted-foreground border-b border-border font-medium">';
          result += '<tr>';
          row.forEach((cell) => {
            result += `<th class="px-4 py-2.5 border-r border-border/30 last:border-0">${parseInline(cell)}</th>`;
          });
          result += '</tr></thead><tbody>';
        } else {
          result += '<tr class="border-b border-border/20 last:border-0 hover:bg-muted/15">';
          row.forEach((cell) => {
            result += `<td class="px-4 py-2 border-r border-border/30 last:border-0">${parseInline(cell)}</td>`;
          });
          result += '</tr>';
        }
      });

      result += '</tbody></table></div>';
      inTable = false;
      tableRows = [];
    }
  };

  const parseInline = (text: string): string => {
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    escaped = escaped.replace(
      /`([^`]+)`/g,
      '<code class="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-primary border border-border/40">$1</code>'
    );
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em class="italic text-muted-foreground">$1</em>');

    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt, url) => {
      return `<a href="${url}" class="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">${txt}</a>`;
    });

    return escaped;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    if (line.trim().startsWith('```')) {
      flushList();
      flushBlockquote();
      flushTable();

      if (inCode) {
        const codeContent = codeLines
          .join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        result += `<div class="relative group my-4 rounded-xl overflow-hidden border border-border/60 bg-black/30 font-mono text-[11px]">`;
        result += `<div class="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50 text-[10px] text-muted-foreground font-sans">`;
        result += `<span>${codeLang.toUpperCase() || 'CODE'}</span>`;
        result += `<button class="hover:text-foreground active:scale-95 transition-all text-[10px] bg-muted/50 px-2 py-0.5 rounded border border-border/30" onclick="navigator.clipboard.writeText(\`${codeLines
          .join('\\n')
          .replace(/`/g, '\\`')
          .replace(/\$/g, '\\$')}\`); alert('Đã sao chép mã nguồn!');">Copy</button>`;
        result += `</div>`;
        result += `<pre class="p-4 overflow-x-auto scrollbar-thin text-zinc-300 leading-relaxed"><code>${codeContent}</code></pre></div>`;
        inCode = false;
        codeLines = [];
      } else {
        inCode = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(lines[i]);
      continue;
    }

    const bqMatch = line.match(/^\s*>\s*(.*)/);
    if (bqMatch) {
      flushList();
      flushTable();
      inBlockquote = true;
      const bqContent = bqMatch[1].trim();

      const alertMatch = bqContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (alertMatch) {
        bqType = alertMatch[1].toLowerCase() as 'note' | 'tip' | 'important' | 'warning' | 'caution';
      } else {
        if (bqLines.length === 0) {
          bqType = 'normal';
        }
        bqLines.push(bqContent);
      }
      continue;
    } else {
      flushBlockquote();
    }

    const listMatch = line.match(/^\s*[-*+]\s*(.*)/);
    if (listMatch) {
      flushTable();
      if (!inList) {
        result += '<ul class="list-disc pl-5 my-3 space-y-1.5 text-xs text-muted-foreground">';
        inList = true;
      }
      result += `<li>${parseInline(listMatch[1])}</li>`;
      continue;
    } else {
      flushList();
    }

    if (line.trim().startsWith('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isSep = cells.every((c) => c.startsWith(':') || c.startsWith('-') || c.endsWith(':'));

      if (isSep) {
        continue;
      }

      if (!inTable) {
        inTable = true;
      }
      tableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    const hMatch = line.match(/^([#]{1,6})\s+(.*)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const title = hMatch[2].trim();
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '')
        .replace(/\s+/g, '-');

      let hClass = 'font-semibold text-foreground tracking-tight ';
      if (level === 1) hClass += 'text-lg border-b border-border pb-1.5 mt-8 mb-4';
      else if (level === 2)
        hClass += 'text-sm mt-7 mb-3.5 flex items-center gap-1.5 border-b border-border/20 pb-1';
      else if (level === 3) hClass += 'text-xs mt-5 mb-2.5 text-primary';
      else hClass += 'text-xs mt-4 mb-2 text-muted-foreground';

      result += `<h${level} id="guide-${id}" class="${hClass}">${parseInline(title)}</h${level}>`;
      continue;
    }

    if (line.trim() === '---') {
      result += '<div class="my-6 border-t border-border/40"></div>';
      continue;
    }

    if (line.trim() !== '') {
      result += `<p class="my-2.5 text-xs leading-relaxed text-muted-foreground">${parseInline(line)}</p>`;
    } else {
      result += '<div class="h-2"></div>';
    }
  }

  flushList();
  flushBlockquote();
  flushTable();

  return result;
}
