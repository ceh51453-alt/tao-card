/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { parseWikiUrl, fetchWikiNavigation, fetchFandomLocalNavigation, type WikiMenuItem, META_FILTERS, titleMatchesMeta, extractNavigationFromJsonInHtml, parseHtmlToMenuTree, fetchHtmlWithProxyRotation } from '../../lib/ai/wikiCrawlerEngine';
import { Search, Loader2, Play, CheckSquare, Square, ChevronRight, ChevronDown, ListTree, Filter } from 'lucide-react';
export function WikiCollectorPanel() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuTree, setMenuTree] = useState<WikiMenuItem[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [excludeMetaKeys, setExcludeMetaKeys] = useState<string[]>(META_FILTERS.map(f => f.key)); // All checked by default
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const handleCrawlNav = async () => {
    if (!url) return;
    setLoading(true);
    setMenuTree([]);
    setSelectedUrls(new Set());
    
    try {
      const parsed = parseWikiUrl(url);
      if (!parsed.domain) throw new Error('URL không hợp lệ');

      let tree: WikiMenuItem[] = [];
      // Attempt to fetch menu
      if (parsed.isMediaWiki) {
        tree = await fetchFandomLocalNavigation(parsed.domain);
        if (!tree.length && parsed.apiUrl) {
          tree = await fetchWikiNavigation(parsed.apiUrl, parsed.domain);
        }
      }
      
      // Fallback: fetch homepage and parse
      if (!tree.length) {
        try {
          const html = await fetchHtmlWithProxyRotation(`https://${parsed.domain}/`);
          if (html) {
            tree = extractNavigationFromJsonInHtml(html, parsed.domain);
            if (!tree.length) {
              tree = parseHtmlToMenuTree(html, parsed.domain);
            }
          }
        } catch (e) {
          console.warn("Fallback HTML crawl failed", e);
        }
      }

      setMenuTree(tree);
      // Auto-expand top level
      const newExpanded = new Set<string>();
      tree.forEach(n => newExpanded.add(n.title));
      setExpandedNodes(newExpanded);
      
    } catch (err) {
      console.error(err);
      alert('Lỗi khi cào dữ liệu navigation.');
    } finally {
      setLoading(false);
    }
  };

  const toggleNodeSelection = (node: WikiMenuItem, currentSelected: Set<string>) => {
    const newSelected = new Set(currentSelected);
    const setAllChildren = (item: WikiMenuItem, select: boolean) => {
      if (item.url) {
        if (select) newSelected.add(item.url);
        else newSelected.delete(item.url);
      }
      if (item.children) {
        item.children.forEach(c => setAllChildren(c, select));
      }
    };
    
    const isCurrentlySelected = node.url ? newSelected.has(node.url) : false;
    setAllChildren(node, !isCurrentlySelected);
    return newSelected;
  };

  const toggleExpand = (title: string) => {
    const next = new Set(expandedNodes);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    setExpandedNodes(next);
  };

  const renderTree = (items: WikiMenuItem[], level = 0) => {
    return (
      <ul className={`pl-${level === 0 ? 0 : 4} space-y-1`}>
        {items.map((item, i) => {
          const isFiltered = item.title && titleMatchesMeta(item.title, excludeMetaKeys);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedNodes.has(item.title);
          const isSelected = item.url ? selectedUrls.has(item.url) : false;

          if (isFiltered && !hasChildren) return null; // Skip rendering if filtered and leaf

          return (
            <li key={i} className="text-sm">
              <div className="flex items-center gap-1.5 p-1 hover:bg-white/5 rounded">
                {hasChildren ? (
                  <button onClick={() => toggleExpand(item.title)} className="p-0.5 text-gray-400 hover:text-white">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <span className="w-[18px]"></span>
                )}
                
                <button 
                  onClick={() => setSelectedUrls(toggleNodeSelection(item, selectedUrls))}
                  className="text-gray-400 hover:text-white"
                >
                  {isSelected ? <CheckSquare size={14} className="text-blue-400" /> : <Square size={14} />}
                </button>
                
                <span className={`truncate ${isFiltered ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {item.title}
                </span>
                
                {item.isLink && !hasChildren && (
                  <span className="text-xs text-blue-400/50 bg-blue-500/10 px-1.5 py-0.5 rounded">link</span>
                )}
              </div>
              
              {hasChildren && isExpanded && (
                <div className="ml-4 border-l border-white/10 mt-1">
                  {renderTree(item.children!, level + 1)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-white/10 overflow-hidden">
      {/* HEADER */}
      <div className="p-3 border-b border-white/10 bg-slate-800/50 flex flex-col gap-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <ListTree size={16} className="text-blue-400" />
          Wiki Collector
        </h3>
        
        <div className="flex gap-2">
          <input 
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Nhập link Wiki chính (vd: genshin-impact.fandom.com)"
            className="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            onKeyDown={e => e.key === 'Enter' && handleCrawlNav()}
          />
          <button onClick={handleCrawlNav} disabled={loading || !url} className="shrink-0 gap-2 flex items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Duyệt Menu
          </button>
        </div>
      </div>
      
      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Tree View */}
        <div className="w-2/3 border-r border-white/10 p-3 overflow-y-auto">
          {menuTree.length > 0 ? (
            renderTree(menuTree)
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              {loading ? 'Đang phân tích cấu trúc wiki...' : 'Nhập URL Wiki để duyệt danh mục'}
            </div>
          )}
        </div>
        
        {/* RIGHT: Filters & Actions */}
        <div className="w-1/3 p-3 overflow-y-auto bg-slate-800/30 flex flex-col gap-4">
          <div>
            <h4 className="font-medium text-sm text-gray-300 mb-2 flex items-center gap-2">
              <Filter size={14} />
              Bộ lọc Meta (Loại bỏ)
            </h4>
            <div className="space-y-1">
              {META_FILTERS.map(f => (
                <label key={f.key} className="flex items-start gap-2 text-xs text-gray-400 hover:text-gray-200 cursor-pointer">
                  <input 
                    type="checkbox"
                    className="mt-0.5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-800"
                    checked={excludeMetaKeys.includes(f.key)}
                    onChange={(e) => {
                      if (e.target.checked) setExcludeMetaKeys(prev => [...prev, f.key]);
                      else setExcludeMetaKeys(prev => prev.filter(k => k !== f.key));
                    }}
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-white/10">
            <button 
              className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded"
              disabled={selectedUrls.size === 0}
            >
              <Play size={16} />
              Cào {selectedUrls.size} trang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

