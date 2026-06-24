/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-empty */
/* eslint-disable prefer-const */
// Inline fetchWithTimeout
async function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
}
import { heuristicBucket, type WikiBucketKey } from './titleBucket';

export interface WikiMenuItem {
  title: string;
  url?: string;
  isLink?: boolean;
  children?: WikiMenuItem[];
}

export interface WikiPageData {
  title: string;
  url: string;
  content: string;
  links: string[]; // Related flat links
  menuTree: WikiMenuItem[]; // Nested/flyout multi-level tree menus
}

export interface WikiParseResult {
  domain: string;
  title: string;
  isMediaWiki: boolean;
  apiUrl: string;
}

// ──────────────────────────────────────────────────────────────────────────
// BỘ LỌC MỤC "NGOÀI CỐT TRUYỆN" (META / REAL-WORLD) — có thể bật/tắt từng loại.
// Mặc định trong UI: TẤT CẢ đều bị loại (user tick để giữ lại loại nào cần).
// Khớp theo từ-ranh-giới (\b...\b) trên tiêu đề (tiếng Anh) để tránh khớp nhầm.
// ──────────────────────────────────────────────────────────────────────────
export interface MetaFilterCategory {
  key: string;
  label: string;
  keywords: string[];
}

// Bộ lọc META (nội dung KHÔNG phục vụ roleplay). Tất cả mặc định BỎ (keptMeta=[]).
// Khớp theo TIÊU ĐỀ trang + word-boundary. Nếu loại nào quét quá tay, người dùng tick "GIỮ LẠI".
export const META_FILTERS: MetaFilterCategory[] = [
  { key: 'author', label: 'Tác giả / Họa sĩ / Người viết',
    keywords: ['author', 'authors', 'artist', 'illustrator', 'illustration', 'mangaka', 'writer', 'written by', 'drawn by', 'creator', 'art by', 'character designer', 'original creator', 'created by', 'storyboard', 'scenario writer'] },
  { key: 'publisher', label: 'Nhà phát hành / Sản xuất / Studio',
    keywords: ['publisher', 'publishing', 'producer', 'production company', 'productions', 'animation studio', 'studio', 'distributor', 'imprint', 'serialization', 'serialized in'] },
  { key: 'release', label: 'Năm / Ngày phát hành',
    keywords: ['release date', 'release year', 'released on', 'publication date', 'run date', 'air date', 'airdate', 'premiere', 'first aired', 'broadcast history'] },
  { key: 'episodes', label: 'Tập / Chương / Volume / Season / Anime / Manga',
    keywords: ['episode list', 'list of episodes', 'episode', 'episodes', 'episode guide', 'chapter list', 'list of chapters', 'chapter', 'chapters', 'volume list', 'list of volumes', 'volume', 'volumes', 'manga volumes', 'light novel volumes', 'tankobon', 'season', 'cour', 'anime', 'manga', 'light novel', 'ova', 'ona', 'guidebook'] },
  { key: 'seiyuu', label: 'Diễn viên lồng tiếng (Seiyuu) / Cast',
    keywords: ['voice actor', 'voice actress', 'voice cast', 'seiyuu', 'voiced by', 'english dub', 'japanese dub', 'voice actors', 'cast list', 'casting'] },
  { key: 'ost', label: 'Nhạc phim / OST / Bài hát',
    keywords: ['soundtrack', 'ost', 'original soundtrack', 'theme song', 'opening theme', 'ending theme', 'character song', 'insert song', 'image song', 'discography', 'music album'] },
  { key: 'reviews', label: 'Đánh giá / Doanh số / Giải thưởng',
    keywords: ['review', 'reviews', 'rating', 'ratings', 'reception', 'critical reception', 'sales', 'box office', 'award', 'awards', 'popularity poll', 'popularity'] },
  { key: 'bts', label: 'Hậu trường / Trivia / Phát triển',
    keywords: ['behind the scenes', 'behind-the-scenes', 'making of', 'making-of', 'trivia', 'production note', 'production notes', 'real-world', 'real world', 'development', 'concept art', 'early design', 'interview', "author's note", 'afterword', 'commentary', 'promotional material', 'promotional', 'recording in progress', 'icon present'] },
  { key: 'gallery', label: 'Gallery / Hình ảnh / Media',
    keywords: ['gallery', 'image gallery', 'images', 'screenshots', 'media gallery', 'artwork', 'wallpaper', 'official art'] },
  { key: 'merch', label: 'Merchandise / Figure / Hàng hóa',
    keywords: ['merchandise', 'merch', 'figure', 'figurine', 'nendoroid', 'figma', 'plush', 'plushie', 'keychain', 'collectible', 'merchandising'] },
  { key: 'adaptation', label: 'Live-action / Sân khấu / Drama CD / Home video',
    keywords: ['live action', 'live-action', 'stage play', 'stage musical', 'musical', 'drama cd', 'audio drama', 'radio drama', 'novelization', 'blu-ray', 'bluray', 'home video', 'audio release', 'audio releases'] },
  { key: 'gameplay', label: 'Gameplay meta (tier list, patch, banner, guide)',
    keywords: ['tier list', 'patch notes', 'changelog', 'update history', 'version history', 'banner history', 'gacha rate', 'drop rate', 'walkthrough', 'farming guide', 'beginner guide', 'team comp', 'best build', 'rerun'] },
  { key: 'noncanon', label: 'Non-canon / Fanfic / Fanart / Crossover',
    keywords: ['non-canon', 'noncanon', 'non canon', 'fanon', 'fanfiction', 'fan fiction', 'fan-fiction', 'fanfic', 'fanart', 'fan art', 'fan-art', 'doujin', 'doujinshi', 'parody', 'what if', 'what-if', 'crossover event', 'april fools'] },
  { key: 'wikimeta', label: 'Meta Wiki (Disambig, Category, Template, List, Community...)',
    keywords: ['meta', 'disambiguation', 'disambig', 'maintenance', 'stub', 'candidates for deletion', 'sandbox', 'policy', 'guideline', 'manual of style', 'community', 'wiki rules', 'navigation', 'sitemap', 'glossary', 'list of', 'index of', 'recent changes', 'message wall', 'subpages', 'category:', 'template:', 'user blog:', 'mediawiki:', 'module:', 'portal:', 'forum:', 'special:', 'help:', 'project:', 'file:'] },
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tiêu đề có khớp BẤT KỲ loại meta nào đang bật (excludeKeys) không. */
export function titleMatchesMeta(title: string, excludeKeys: string[]): boolean {
  if (!excludeKeys || excludeKeys.length === 0) return false;
  const t = title.toLowerCase();
  for (const cat of META_FILTERS) {
    if (!excludeKeys.includes(cat.key)) continue;
    for (const kw of cat.keywords) {
      const re = new RegExp(`\\b${escapeRegex(kw.toLowerCase())}\\b`, 'i');
      if (re.test(t)) return true;
    }
  }
  return false;
}

/** Chia danh sách tiêu đề thành { kept, removed } theo các loại meta bị loại. */
export function filterOutMeta(titles: string[], excludeKeys: string[]): { kept: string[]; removed: string[] } {
  if (!excludeKeys || excludeKeys.length === 0) return { kept: titles, removed: [] };
  const kept: string[] = [];
  const removed: string[] = [];
  for (const t of titles) {
    if (titleMatchesMeta(t, excludeKeys)) removed.push(t);
    else kept.push(t);
  }
  return { kept, removed };
}

/**
 * Helper to check if two domains belong to the same Fandom/Wikia project
 * despite potential differences in subdomains (lang, mirrors, etc.).
 */
export function isSameFandomProject(hostA: string, hostB: string): boolean {
  const cleanA = hostA.toLowerCase().trim();
  const cleanB = hostB.toLowerCase().trim();
  if (cleanA === cleanB) return true;

  if (cleanA.includes('fandom.com') && cleanB.includes('fandom.com')) {
    const getFandomSlug = (host: string): string => {
      const parts = host.split('.');
      const filtered = parts.filter(p => p !== 'com' && p !== 'fandom' && p !== 'www');
      if (filtered.length > 1) {
        const langCodes = ['vi', 'en', 'es', 'fr', 'ja', 'it', 'de', 'pl', 'pt', 'ru', 'zh', 'ar', 'nl', 'tr', 'ko', 'sv', 'no', 'fi', 'da', 'id'];
        if (langCodes.includes(filtered[0])) {
          return filtered[1] || filtered[0];
        }
      }
      return filtered[0] || '';
    };

    const slugA = getFandomSlug(cleanA);
    const slugB = getFandomSlug(cleanB);
    return slugA === slugB && slugA !== '';
  }
  return false;
}

/**
 * Validates if a title or URL is strictly related to the requested lore,
 * and filters out author forums, admin panels, fanart, fanfiction, ads, or cross-wiki leaking directories.
 * Highly sophisticated and word-boundary aware to prevent false positives blocking crucial lore (e.g. staff, shop, blade, lady).
 */
export function isWikiItemLoreValid(title: string, url: string | undefined, originalDomain: string): boolean {
  const cleanTitle = title.toLowerCase().trim();
  const cleanUrl = url ? url.toLowerCase().trim() : '';

  if (
    cleanTitle.startsWith('#') ||
    cleanTitle.includes('#|') ||
    cleanTitle === 'more' ||
    cleanTitle === 'other characters' ||
    cleanUrl.includes('/wiki/%23') ||
    cleanUrl.includes('/wiki/#')
  ) {
    return false;
  }

  // 1. ISOLATE DOMAIN (Cross-wiki leak blocker):
  if (cleanUrl.startsWith('http')) {
    try {
      const parsedUrl = new URL(url!);
      if (parsedUrl.hostname !== originalDomain && !isSameFandomProject(parsedUrl.hostname, originalDomain)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  // 2. DETAILED NAMESPACE CHECKS (MediaWiki Admin Spaces)
  const namespaces = [
    'special:', 'category:', 'template:', 'file:', 'media:', 'help:', 'project:', 'portal:',
    'talk:', 'user talk:', 'user:', 'user_talk:', 'user_blog:', 'message_wall:', 'board:', 'thread:', 'forum:',
    'thành viên:', 'thảo luận:', 'trang thảo luận:', 'bình luận:', 'quy chế:', 'hướng dẫn:', 'sửa đổi:', 'tải lên:', 'quy định:'
  ];
  for (const ns of namespaces) {
    if (cleanTitle.includes(ns) || cleanUrl.includes(ns)) {
      return false;
    }
  }

  // 3. TARGETED LIQUID ADV/SYSTEM KEYWORDS (Exact phrases or safe boundaries)
  const blacklistPhrases = [
    'fandom support', 'fandom community', 'wikia community', 'fandom university', 'fandom shop', 'fandom app',
    'recent changes', 'random page', 'explore', 'sign in', 'register', 'log out', 'contact us', 'careers',
    'terms of use', 'privacy policy', 'terms of service', 'all rights reserved', 'fandom network',
    'community dashboard', 'wiki rules', 'wiki moderator', 'moderator notice', 'admin notice', 'site rules',
    'policy guidelines', 'copyright notice', 'copyrights', 'about fandom', 'about wikia', 'store rules',
    'wiki-administration',
    'other characters',
    'báo cáo vi phạm'
  ];
  // Lưu ý: các cụm meta nội dung (hậu trường/real-world/author/fanart...) đã được
  // chuyển sang BỘ LỌC META có thể bật/tắt (META_FILTERS) thay vì chặn cứng tại đây.

  for (const phrase of blacklistPhrases) {
    if (cleanTitle.includes(phrase) || cleanUrl.includes(phrase)) {
      return false;
    }
  }

  // 4. WORD-BOUNDARY OR ADVANCED FILTERING FOR SENSITIVE SUBSTRINGS
  const sensitiveWords = [
    'admin', 'moderator', 'moderation', 'policy', 'licensing',
    'community', 'forum', 'blog', 'staff', 'contributor', 'discord', 'social', 'shop', 'store',
    'merchandise', 'advertisement', 'promotional', 'gameplay', 'system requirements', 'walkthrough',
    'guide', 'recent-changes'
  ];

  const words = cleanTitle.split(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/);
  
  for (const sw of sensitiveWords) {
    if (words.includes(sw)) {
      if (sw === 'user' || sw === 'staff' || sw === 'shop' || sw === 'store' || sw === 'guide' || sw === 'community') {
        const isLoreExcepted = !cleanTitle.includes('wiki staff') && 
                               !cleanTitle.includes('fandom staff') &&
                               !cleanTitle.includes('staff notice') &&
                               !cleanTitle.includes('fandom shop') &&
                               !cleanTitle.includes('merchandise store') &&
                               !cleanTitle.includes('fandom store') &&
                               !cleanTitle.includes('gameplay guide') &&
                               !cleanTitle.includes('wiki guide') &&
                               !cleanTitle.includes('beginner guide') &&
                               !cleanTitle.includes('leveling guide') &&
                               !cleanTitle.includes('user page') &&
                               !cleanTitle.includes('user profile') &&
                               !cleanTitle.includes('user blog');
        if (!isLoreExcepted) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  // 5. URL PATH AND QUERY BLACKLIST
  let urlPathAndQuery = cleanUrl;
  if (cleanUrl.startsWith('http')) {
    try {
      const parsedUrl = new URL(url!);
      urlPathAndQuery = (parsedUrl.pathname + parsedUrl.search + parsedUrl.hash).toLowerCase();
    } catch { /* ignore */ }
  }

  const pathBlacklist = [
    'special:', 'category:', 'template:', 'file:', 'media:', 'help:', 'project:', 'portal:', 'talk:',
    '/action=', 'oldid=', 'diff=', 'fandom_support', 'fandom_community', 'wiki_rules', 'site_rules',
    'recent_changes', 'recentchanges', 'random_page', 'randompage', 'terms_of_use', 'privacypolicy',
    'user_blog', 'user_talk', 'message_wall', 'facebook.com', 'twitter.com', 'instagram.com', 'discord.gg',
    'youtube.com', 'affiliate_commission'
  ];
  for (const pattern of pathBlacklist) {
    if (urlPathAndQuery.includes(pattern)) {
      return false;
    }
  }

  // Ensure title has actual words and is not just numbers/symbols
  if (cleanTitle.length <= 1) {
    return false;
  }

  return true;
}

export function parseWikiUrl(urlStr: string): WikiParseResult {
  try {
    const url = new URL(urlStr.trim());
    const domain = url.hostname;
    
    // Extract title from /wiki/Title or similar
    const pathParts = url.pathname.split('/');
    const wikiIndex = pathParts.indexOf('wiki');
    let title = '';
    
    if (wikiIndex !== -1 && wikiIndex < pathParts.length - 1) {
      title = decodeURIComponent(pathParts.slice(wikiIndex + 1).join('/'));
    } else {
      title = decodeURIComponent(pathParts[pathParts.length - 1]);
    }
    
    // Clean up title (remove anchor hash etc.)
    title = title.split('#')[0].replace(/_/g, ' ');

    let isMediaWiki = false;
    let apiUrl = '';

    // Check if Fandom or Wikipedia or standard MediaWiki
    if (domain.includes('fandom.com')) {
      isMediaWiki = true;
      apiUrl = `https://${domain}/api.php`;
    } else if (domain.includes('wikipedia.org')) {
      isMediaWiki = true;
      apiUrl = `https://${domain}/w/api.php`;
    } else {
      isMediaWiki = true;
      apiUrl = `https://${domain}/api.php`;
    }

    return {
      domain,
      title,
      isMediaWiki,
      apiUrl
    };
  } catch (error) {
    console.error("Error parsing URL:", error);
    return {
      domain: '',
      title: '',
      isMediaWiki: false,
      apiUrl: ''
    };
  }
}

/**
 * Parses nested list elements (ul/ol) into a hierarchical folder structure.
 * Filters out sub-items following the constraints.
 */
export function parseHtmlToMenuTree(rawHtml: string, domain: string): WikiMenuItem[] {
  if (typeof window === 'undefined' || !window.DOMParser) {
    return [];
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const menuTree: WikiMenuItem[] = [];

    // Clean out known advertising and global widgets first from DOM to prevent leak
    const noiseSelectors = [
      '.navbox', '.global-navigation', '.fandom-community-header__top-contributors',
      '#recirculation-rail', '.marketing-notifications', '.wds-global-navigation',
      '.rail-module', '.custom-wiki-adv', '.fandom-video-rail'
    ];
    noiseSelectors.forEach(sel => {
      doc.querySelectorAll(sel).forEach(el => el.remove());
    });

    // Helper to recursively traverse list tags or custom dropdown wrappers
    const parseListElement = (node: Element): WikiMenuItem[] => {
      const items: WikiMenuItem[] = [];
      const children = Array.from(node.children);

      for (const child of children) {
        const tagName = child.tagName.toLowerCase();

        // Skip dropdown toggles themselves that are mere duplicates of category labels
        if (child.classList.contains('wds-dropdown__toggle') || tagName === 'button') {
          continue;
        }

        const item: WikiMenuItem = { title: '' };

        // Clone child to isolate its own text and links from nested menu content
        const strippedChild = child.cloneNode(true) as Element;
        const nestedSelectors = [
          'ul', 'ol', '.wds-dropdown__content', '.dropdown-menu',
          '.navigation-nested', '.wds-list', '.wds-dropdown'
        ];
        nestedSelectors.forEach(sel => {
          strippedChild.querySelectorAll(sel).forEach(sub => sub.remove());
        });

        // Search for a link element inside the stripped child ONLY! This prevents grabbing nested grandchild links
        let linkEl: HTMLAnchorElement | null;
        if (tagName === 'a') {
          linkEl = child as HTMLAnchorElement;
        } else {
          linkEl = strippedChild.querySelector('a') as HTMLAnchorElement | null;
        }

        if (linkEl) {
          const href = linkEl.getAttribute('href') || '';
          let text = linkEl.textContent?.trim() || '';
          text = text.replace(/[\n\t\s]+/g, ' ').trim();
          item.title = text;

          if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.includes('redlink=1') && !href.includes('action=edit')) {
            let absoluteUrl: string;
            if (href.startsWith('/')) {
              absoluteUrl = `https://${domain}${href}`;
            } else if (href.startsWith('http://') || href.startsWith('https://')) {
              absoluteUrl = href;
            } else {
              absoluteUrl = `https://${domain}/wiki/${href}`;
            }

            item.url = absoluteUrl;
            item.isLink = true;
          } else {
            item.isLink = false;
          }
        } else {
          // Text-only parent category or folder header (e.g. terminology or custom folder labels)
          let text = '';
          const toggleElement = strippedChild.querySelector('.wds-dropdown__toggle, .dropdown-toggle, .category-label, .wds-tabs__tab-label');
          if (toggleElement) {
            text = toggleElement.textContent?.trim() || '';
          }
          if (!text) {
            text = strippedChild.textContent?.trim() || '';
          }
          
          item.title = text.replace(/[\n\t\s]+/g, ' ').trim() || 'Chuyên mục';
          item.isLink = false;
        }

        // Clean up common decoration arrows or flyout caret indicators (e.g., ▼, ▲, ›, », >) from titles
        item.title = item.title.replace(/[▼▲›»>▸▾▸]+/g, ' ').trim();

        // Filter out completely invalid or spam links
        if (!isWikiItemLoreValid(item.title, item.url, domain)) {
          continue;
        }

        // Force a default title if completely empty
        if (!item.title) {
          item.title = 'Mục bối cảnh';
        }

        // Now find any sub-list in the ORIGINAL child to crawl children recursively
        const subListSelectors = [
          '.wds-dropdown__content', '.dropdown-menu', '.navigation-nested',
          '.wds-list', 'ul', 'ol'
        ];
        
        let subList: Element | null = null;
        for (const selector of subListSelectors) {
          subList = child.querySelector(selector);
          if (subList) break;
        }

        if (subList && subList !== child) {
          const nestedItems = parseListElement(subList);
          if (nestedItems.length > 0) {
            item.children = nestedItems;
          }
        }

        // Add if valid and fits structure criteria
        const hasChildren = item.children && item.children.length > 0;
        if (item.title && (item.isLink || hasChildren)) {
          if (!items.some(exist => exist.title === item.title && exist.url === item.url)) {
            items.push(item);
          }
        }
      }
      return items;
    };

    // Grab elements strictly associated with community navigation, sidebars, or portal bars
    const navSelectors = [
      '.fandom-community-header__local-navigation',
      '.fandom-local-navigation',
      '.navigation-nested',
      '.custom-navigation',
      '#fandom-local-navigation',
      '#mw-panel',
      '.vector-menu',
      '.vector-menu-content-list',
      '#p-navigation',
      '.portal',
      '#column-one',
      '.mw-parser-output ul:not(li ul)',
      '.mw-parser-output ol:not(li ol)'
    ];

    for (const selector of navSelectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(container => {
          let rootLists: Element[];
          if (container.tagName.toLowerCase() === 'ul' || container.tagName.toLowerCase() === 'ol') {
            rootLists = [container];
          } else {
            rootLists = Array.from(container.querySelectorAll(':scope > ul, :scope > ol, :scope > .wds-list'));
            if (rootLists.length === 0) {
              rootLists = Array.from(container.querySelectorAll('ul, ol, .wds-list'));
            }
          }

          rootLists.forEach(l => {
            const items = parseListElement(l);
            items.forEach(itm => {
              // Avoid duplicates at top-level
              if (!menuTree.some(existing => existing.title === itm.title)) {
                menuTree.push(itm);
              }
            });
          });
        });
      }
    }

    // Clean empty folders (folders without any leaf links)
    const cleanEmptyFolders = (nodes: WikiMenuItem[]): WikiMenuItem[] => {
      return nodes
        .map(node => {
          if (node.children) {
            node.children = cleanEmptyFolders(node.children);
          }
          return node;
        })
        .filter(node => node.isLink || (node.children && node.children.length > 0));
    };

    return cleanEmptyFolders(menuTree);
  } catch (err) {
    console.error("Error parsing html menu tree:", err);
    return [];
  }
}

/**
 * Trích xuất cấu trúc Navigation JSON của Fandom từ mã nguồn HTML nếu có (MediaWiki/Fandom config)
 */
export function extractNavigationFromJsonInHtml(html: string, domain: string): WikiMenuItem[] {
  try {
    // Regex quét wgFandomLocalNavigation biến cấu trúc nhúng
    const patterns = [
      /"wgFandomLocalNavigation"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/,
      /wgFandomLocalNavigation\s*=\s*(\[[\s\S]*?\])\s*;/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          const rawJson = match[1];
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed)) {
            return mapFandomNavJson(parsed, domain);
          }
        } catch (je) {
          // try fallback regex extraction
        }
      }
    }

    // Quét thủ công nếu cấu trúc JSON hơi khác
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      const jsText = scriptMatch[1];
      if (jsText.includes('wgFandomLocalNavigation') || jsText.includes('localNavigation')) {
        const arrayMatch = jsText.match(/(\[[\s\S]+?\])/);
        if (arrayMatch && arrayMatch[1]) {
          try {
            const cleaned = arrayMatch[1].replace(/'/g, '"');
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed) && parsed.some(item => item.text || item.href || item.title)) {
              return mapFandomNavJson(parsed, domain);
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn("Lỗi trích xuất Navigation JSON từ HTML:", e);
  }
  return [];
}

export function mapFandomNavJson(rawList: any[], domain: string): WikiMenuItem[] {
  const mapNode = (item: any): WikiMenuItem | null => {
    if (!item || typeof item !== 'object') return null;
    
    const title = (item.text || item.title || item.name || '').trim();
    const href = (item.href || item.url || item.link || '').trim();
    
    const subItems = item.children || item.items || item.links || [];
    const children: WikiMenuItem[] = [];
    if (Array.isArray(subItems)) {
      for (const child of subItems) {
        const mappedChild = mapNode(child);
        if (mappedChild) {
          children.push(mappedChild);
        }
      }
    }

    let absoluteUrl: string | undefined = undefined;
    let isLink = false;

    if (href && href !== '#' && !href.startsWith('javascript:') && !href.includes('redlink=1') && !href.includes('action=edit')) {
      if (href.startsWith('/')) {
        absoluteUrl = `https://${domain}${href}`;
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        absoluteUrl = href;
      } else {
        absoluteUrl = `https://${domain}/wiki/${href}`;
      }
      isLink = true;
    }

    if (!isWikiItemLoreValid(title, absoluteUrl, domain)) {
      return null;
    }

    return {
      title: title || 'Mục bối cảnh',
      url: absoluteUrl,
      isLink,
      children: children.length > 0 ? children : undefined
    };
  };

  const result: WikiMenuItem[] = [];
  for (const rawItem of rawList) {
    const mapped = mapNode(rawItem);
    if (mapped) {
      result.push(mapped);
    }
  }
  return result;
}

export async function fetchFandomLocalNavigation(domain: string): Promise<WikiMenuItem[]> {
  const targetUrl = `https://${domain}/api/v1/Navigation/Local`;
  
  let rootList: any[] = [];
  try {
    const data = await fetchWithProxyRotation(targetUrl);
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        rootList = data;
      } else if (data.navigation) {
        if (Array.isArray(data.navigation)) {
          rootList = data.navigation;
        } else if (data.navigation.wiki && Array.isArray(data.navigation.wiki)) {
          rootList = data.navigation.wiki;
        } else if (typeof data.navigation === 'object') {
          for (const key of Object.keys(data.navigation)) {
            if (Array.isArray(data.navigation[key])) {
              rootList = data.navigation[key];
              break;
            }
          }
        }
      } else {
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) {
            rootList = data[key];
            break;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to fetch Fandom Native API navigation, falling back to deep shell crawling...", err);
  }

  // Nếu tìm thấy danh sách gốc bằng API thành công
  if (rootList.length > 0) {
    const mapNode = (item: any): WikiMenuItem | null => {
      if (!item || typeof item !== 'object') return null;
      
      const title = (item.text || item.title || item.name || '').trim();
      const href = (item.href || item.url || item.link || '').trim();
      
      const subItems = item.children || item.items || item.links || [];
      const children: WikiMenuItem[] = [];
      if (Array.isArray(subItems)) {
        for (const child of subItems) {
          const mappedChild = mapNode(child);
          if (mappedChild) {
            children.push(mappedChild);
          }
        }
      }

      let absoluteUrl: string | undefined = undefined;
      let isLink = false;

      if (href && href !== '#' && !href.startsWith('javascript:') && !href.includes('redlink=1') && !href.includes('action=edit')) {
        if (href.startsWith('/')) {
          absoluteUrl = `https://${domain}${href}`;
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          absoluteUrl = href;
        } else {
          absoluteUrl = `https://${domain}/wiki/${href}`;
        }
        isLink = true;
      }

      // Filter check
      if (!isWikiItemLoreValid(title, absoluteUrl, domain)) {
        return null;
      }

      return {
        title: title || 'Mục bối cảnh',
        url: absoluteUrl,
        isLink,
        children: children.length > 0 ? children : undefined
      };
    };

    const result: WikiMenuItem[] = [];
    for (const rawItem of rootList) {
      const mapped = mapNode(rawItem);
      if (mapped) {
        result.push(mapped);
      }
    }
    if (result.length > 0) {
      return result;
    }
  }

  // Triple-Redundant deep fallback: Cào trực tiếp mã nguồn Trang chủ qua rotated proxy
  try {
    const homeUrl = `https://${domain}/`;
    const homeHtml = await fetchHtmlWithProxyRotation(homeUrl);
    if (homeHtml) {
      // 1. Quét biến wgFandomLocalNavigation từ scripts
      const jsonTree = extractNavigationFromJsonInHtml(homeHtml, domain);
      if (jsonTree && jsonTree.length > 0) {
        return jsonTree;
      }

      // 2. Phân tích DOM từ thanh Local Navigation thật của trang chủ
      const htmlTree = parseHtmlToMenuTree(homeHtml, domain);
      if (htmlTree && htmlTree.length > 0) {
        return htmlTree;
      }
    }
  } catch (e) {
    console.warn("Failed to crawl homepage shell navigation:", e);
  }

  return [];
}

export async function fetchWikiNavigation(apiUrl: string, domain: string): Promise<WikiMenuItem[]> {
  const pagesToTry = ['MediaWiki:Wiki-navigation', 'MediaWiki:Sidebar'];
  for (const pageName of pagesToTry) {
    try {
      const endpoint = `${apiUrl}?action=parse&page=${encodeURIComponent(pageName)}&format=json&prop=text&origin=*`;
      const data = await fetchWithProxyRotation(endpoint);
      if (data.error) continue;
      const rawHtml = data.parse.text?.['*'] || '';
      if (rawHtml) {
        const tree = parseHtmlToMenuTree(rawHtml, domain);
        if (tree && tree.length > 0) {
          return tree;
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch navigation from ${pageName}:`, e);
    }
  }
  return [];
}

/**
 * Parses article section headers (h2, h3, h4) and groups valid inline/list links under them
 * to form a clean hierarchical branch menu (nested tree) native to the page's structure.
 * Respects isWikiItemLoreValid to prevent non-lore leakage.
 */
export function parseHtmlToSectionTree(rawHtml: string, domain: string): WikiMenuItem[] {
  if (typeof window === 'undefined' || !window.DOMParser) {
    return [];
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    
    // Clean noise elements beforehand
    const noiseSelectors = [
      '.navbox', '.global-navigation', '.fandom-community-header__top-contributors',
      '#recirculation-rail', '.marketing-notifications', '.wds-global-navigation',
      '.rail-module', '.custom-wiki-adv', '.fandom-video-rail', '.toc', '.mw-jump-link',
      '#catlinks', '.printfooter', '.wds-global-footer'
    ];
    noiseSelectors.forEach(sel => {
      doc.querySelectorAll(sel).forEach(el => el.remove());
    });
    
    const contentBody = doc.querySelector('.mw-parser-output') || doc.body;
    if (!contentBody) return [];
    
    const menuTree: WikiMenuItem[] = [];
    let currentHeaderFolder: WikiMenuItem | null = null;
    
    // Iterate over children of contentBody
    const children = Array.from(contentBody.children);
    
    for (const child of children) {
      const tagName = child.tagName.toLowerCase();
      
      // Check if this child is a header
      if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
        const headingText = child.textContent?.replace('[edit]', '').replace('edit', '').replace(/[\n\t\r]+/g, ' ').trim() || '';
        // Skip common auxiliary or administrative headings
        const lowerText = headingText.toLowerCase();
        const skipHeaders = [
          'contents', 'navigation', 'gallery', 'references', 'external links', 'see also', 
          'danh mục', 'mục lục', 'tài liệu tham khảo', 'liên kết ngoài', 'bài liên quan', 
          'sách tham khảo', 'chú thích', 'ảnh', 'video', 'hoạt họa', 'fanart', 'fan fiction'
        ];
        
        if (headingText && !skipHeaders.some(sh => lowerText.includes(sh))) {
          currentHeaderFolder = {
            title: headingText,
            isLink: false,
            children: []
          };
          menuTree.push(currentHeaderFolder);
        } else {
          currentHeaderFolder = null;
        }
      } 
      // If we're inside a folder section, extract all valid lore links
      else if (currentHeaderFolder) {
        const anchors = child.querySelectorAll('a');
        anchors.forEach(a => {
          const href = a.getAttribute('href') || '';
          let text = a.textContent?.trim() || '';
          text = text.replace(/[\n\t\s]+/g, ' ').trim();
          
          if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.includes('redlink=1') && !href.includes('action=edit') && text) {
            let absoluteUrl = '';
            if (href.startsWith('/')) {
              absoluteUrl = `https://${domain}${href}`;
            } else if (href.startsWith('http://') || href.startsWith('https://')) {
              absoluteUrl = href;
            } else {
              absoluteUrl = `https://${domain}/wiki/${href}`;
            }
            
            if (isWikiItemLoreValid(text, absoluteUrl, domain)) {
              if (!currentHeaderFolder!.children) {
                currentHeaderFolder!.children = [];
              }
              if (!currentHeaderFolder!.children.some(node => node.title === text || node.url === absoluteUrl)) {
                currentHeaderFolder!.children.push({
                  title: text,
                  url: absoluteUrl,
                  isLink: true
                });
              }
            }
          }
        });
      } 
      // Gather any links inside introductory paragraphs before the first heading
      else {
        const anchors = child.querySelectorAll('a');
        anchors.forEach(a => {
          const href = a.getAttribute('href') || '';
          let text = a.textContent?.trim() || '';
          text = text.replace(/[\n\t\s]+/g, ' ').trim();
          
          if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.includes('redlink=1') && !href.includes('action=edit') && text) {
            let absoluteUrl = '';
            if (href.startsWith('/')) {
              absoluteUrl = `https://${domain}${href}`;
            } else if (href.startsWith('http://') || href.startsWith('https://')) {
              absoluteUrl = href;
            } else {
              absoluteUrl = `https://${domain}/wiki/${href}`;
            }
            
            if (isWikiItemLoreValid(text, absoluteUrl, domain)) {
              let introFolder = menuTree.find(node => node.title === 'Thông tin cốt lõi (Mở đầu)');
              if (!introFolder) {
                introFolder = {
                  title: 'Thông tin cốt lõi (Mở đầu)',
                  isLink: false,
                  children: []
                };
                menuTree.unshift(introFolder); // Prepend to beginning
              }
              if (!introFolder.children!.some(node => node.title === text || node.url === absoluteUrl)) {
                introFolder.children!.push({
                  title: text,
                  url: absoluteUrl,
                  isLink: true
                });
              }
            }
          }
        });
      }
    }
    
    // Return only non-empty folders
    return menuTree.filter(node => node.children && node.children.length > 0);
  } catch (err) {
    console.warn("Failed to parse html section tree:", err);
    return [];
  }
}

/**
 * Tự động phân loại toàn bộ danh sách các liên kết bối cảnh hợp lệ trong bài viết
 * thành một Cấu trúc phân nhánh logic đa cấp chi tiết, dạt dào thông tin nhất.
 * Đảm bảo 100% các trang bối cảnh học thuật của tác phẩm đều được hệ thống hóa,
 * thâu tóm toàn bộ bối cảnh và bài viết của wiki.
 */
export function generateAutoCategorizedTree(links: string[], domain: string): WikiMenuItem[] {
  const categories: { [key: string]: { title: string; keywords: string[]; items: WikiMenuItem[] } } = {
    timeline: {
      title: 'DÒNG THỜI GIAN',
      keywords: [
        'timeline', 'chronology', 'event', 'history', 'year', 'century', 'era', 'milestone', 'date', 'war', 
        'battle', 'incident', 'dòng thời gian', 'niên biểu', 'sử biên niên', 'biến cố', 'kỷ nguyên', 'thời đại', 
        'lịch sử', 'mốc thời gian', 'sự kiện', 'chiến dịch', 'trận chiến', 'thao phạt', 'lịch kí', 'khởi đầu', 'kết thúc'
      ],
      items: []
    },
    locations: {
      title: 'KHU VỰC',
      keywords: [
        'location', 'kingdom', 'empire', 'tomb', 'nazarick', 'city', 'town', 'forest', 'province', 'island', 
        'mountain', 'lake', 'river', 'cave', 'dungeon', 'world', 'map', 'địa danh', 'vương quốc', 'đế quốc', 
        'thành phố', 'vùng đất', 'lăng mộ', 'hang động', 'bản đồ', 'quốc gia', 'thủ đô', 'thôn', 'làng', 'rừng',
        'lãnh địa', 'quận', 'khu vực', 'đại lục', 'erantel', 'e-rantel', 'azerlisia', 'karne', 'carne', 're-estize', 
        'baharuth', 'slane'
      ],
      items: []
    },
    characters: {
      title: 'NHÂN VẬT',
      keywords: [
        'character', 'individual', 'people', 'person', 'ainz', 'albedo', 'shalltear', 'cocytus', 'demiurge', 
        'aura', 'mare', 'sebas', 'actor', 'narberal', 'lupusregina', 'solution', 'entoma', 'yuri', 'shizu', 
        'pandora', 'king', 'lord', 'champion', 'warrior', 'mage', 'hero', 'devil', 'god', 'entity', 'nhân vật', 
        'tướng', 'hiệp sĩ', 'pháp sư', 'quỷ', 'thần', 'linh hồn', 'hoàng đế', 'vua', 'thành viên', 'chúa tể', 
        'giáo sĩ', 'thiên sứ', 'momon', 'pleiades', 'guardian', 'maid', 'gazef', 'brain', 'climb', 'enri', 
        'nfirea', 'hamusuke', 'neia', 'baraja', 'jircniv', 'fluder', 'evileye', 'lakyus', 'gagaran', 'tia', 
        'tina', 'renner', 'zanac', 'cá nhân', 'anh hùng'
      ],
      items: []
    },
    systems: {
      title: 'HỆ THỐNG (Sức mạnh, Kinh tế...), CƠ CHẾ, QUY TẮC',
      keywords: [
        'magic', 'spell', 'ability', 'skill', 'tier', 'talent', 'class', 'job', 'level', 'mana', 'power', 
        'system', 'rule', 'mechanics', 'coin', 'gold', 'economy', 'cash', 'law', 'doctrine', 'yggdrasil', 
        'game', 'hp', 'mp', 'stats', 'ma thuật', 'kỹ năng', 'phép thuật', 'tiêu chuẩn', 'nghề nghiệp', 'sức mạnh', 
        'thuật', 'chiêu thức', 'võ kỹ', 'hệ thống sức mạnh', 'siêu cấp', 'triệu hồi', 'kháng ma', 'tier spell', 
        'vòng phép', 'cơ chế', 'quy tắc', 'luật lệ', 'kinh tế', 'tiền tệ', 'giáo điều', 'phân hạng', 'cấp độ'
      ],
      items: []
    },
    worldview: {
      title: 'THẾ GIỚI QUAN',
      keywords: [
        'lore', 'term', 'terminology', 'story', 'myth', 'factions', 'guild', 'organization', 'alliance', 'clan', 
        'item', 'weapon', 'relic', 'artefact', 'species', 'race', 'undead', 'human', 'monster', 'dragon', 'beast', 
        'historical', 'culture', 'vật phẩm', 'trang bị', 'bảo vật', 'chủng tộc', 'sinh vật', 'phe phái', 'tổ chức', 
        'gia tộc', 'bang hội', 'thực thể', 'quái vật', 'thần khí', 'nhân loại', 'bất tử', 'dị hình', 'thế giới quan', 
        'vương bảo', 'thuật ngữ'
      ],
      items: []
    }
  };

  const normalize = (val: string) => val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  links.forEach(linkText => {
    const url = `https://${domain}/wiki/${encodeURIComponent(linkText.replace(/ /g, '_'))}`;
    const normText = normalize(linkText);
    const heuristic = heuristicBucket(linkText);

    if (heuristic !== 'worldview') {
      categories[heuristic].items.push({
        title: linkText,
        url,
        isLink: true
      });
      return;
    }
    
    let matched = false;
    const orderedKeys = ['timeline', 'locations', 'characters', 'systems'];
    for (const key of orderedKeys) {
      const cat = categories[key];
      if (cat.keywords.some(kw => {
        const normKw = normalize(kw);
        // Kiểm tra khớp từ khóa chính xác trọn vẹn: tiêu đề chứa từ khóa
        if (normText === normKw) return true;
        
        // Chỉ khớp chứa nếu độ dài từ khóa đủ an toàn tránh khớp dính ký tự vụn vặt
        if (normKw.length >= 3 && normText.includes(normKw)) {
          return true;
        }
        return false;
      })) {
        cat.items.push({
          title: linkText,
          url,
          isLink: true
        });
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Không khớp keyword → ĐOÁN bằng heuristic (tên người / sub-page nhân vật →
      // characters) thay vì đổ hết về worldview (vốn làm nhân vật bị lọt).
      categories[heuristic].items.push({
        title: linkText,
        url,
        isLink: true
      });
    }
  });

  const resultTree: WikiMenuItem[] = [];

  // Order output as requested: THẾ GIỚI QUAN, HỆ THỐNG, NHÂN VẬT, KHU VỰC, DÒNG THỜI GIAN
  const printOrder = ['worldview', 'systems', 'characters', 'locations', 'timeline'];
  for (const key of printOrder) {
    const cat = categories[key];
    // Always create the folder even if empty so that the menu is fully consistent
    resultTree.push({
      title: cat.title,
      isLink: false,
      children: cat.items
    });
  }

  return resultTree;
}

async function fetchWithProxyRotation(originalUrl: string): Promise<any> {
  // THỨ TỰ TỐI ƯU CHO JSON API (MediaWiki action=parse/query có &origin=*):
  // fetch THẲNG luôn thành công vì Fandom trả Access-Control-Allow-Origin: *.
  // Nên ưu tiên #0 = direct (nhanh, không phụ thuộc proxy công cộng vốn hay chết).
  // /cors-proxy chỉ chạy khi `npm run dev`; trên Netlify nó trả index.html → tự bỏ qua.
  const proxyFactories = [
    // 0. Direct fetch (TỐT NHẤT cho endpoint có origin=* → có CORS header)
    (url: string) => url,
    // 1. Local CORS proxy (chỉ có ở Vite dev server)
    (url: string) => `/cors-proxy?url=${encodeURIComponent(url)}`,
    // 2. codetabs
    (url: string) => `https://api.codetabs.com/v1/proxy?value=${encodeURIComponent(url)}`,
    // 3. allorigins.win raw
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // 4. corsproxy.io
    (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    // 5. cors.lol
    (url: string) => `https://cors.lol/?url=${encodeURIComponent(url)}`
  ];

  let lastError: any = null;

  for (let i = 0; i < proxyFactories.length; i++) {
    const fetchUrl = proxyFactories[i](originalUrl);
    try {
      // timeout 20s/lượt: 1 proxy treo sẽ bị hủy & nhảy proxy kế, không kẹt cả crawl.
      const response = await fetchWithTimeout(fetchUrl, {}, 20000);
      if (response.ok) {
        const text = await response.text();
        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(text);
        } catch {
          // Try AllOrigins wrapped JSON parsing
          try {
            const container = JSON.parse(text);
            if (container.contents) {
              parsedJson = JSON.parse(container.contents);
            }
          } catch {}
        }

        if (parsedJson) {
          if (parsedJson.error) {
            console.warn(`Proxy ${i} returned API error:`, parsedJson.error);
            const errInfo = parsedJson.error.info || "API Error";
            const apiError = new Error(errInfo);
            (apiError as any).code = parsedJson.error.code;
            lastError = apiError;
            const errCode = parsedJson.error.code;
            if (errCode === 'missingtitle' || errCode === 'notfound' || errCode === 'invalidtitle') {
              throw apiError; // Dead link, do not waste requests on rotating
            }
          } else {
            return parsedJson;
          }
        }
      } else {
        lastError = new Error(`HTTP Status ${response.status}`);
      }
    } catch (err: any) {
      console.warn(`Proxy ${i} fail for page: ${originalUrl}`, err);
      if (err.code === 'missingtitle' || err.code === 'notfound' || err.code === 'invalidtitle' ||
          (err.message && (err.message.includes("missingtitle") || err.message.includes("notfound") || err.message.includes("invalidtitle")))) {
        throw err;
      }
      lastError = err;
    }

    if (i < proxyFactories.length - 1) {
      // Short delay before hopping to the next proxy
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw lastError || new Error("Failed to fetch via all proxy rotators.");
}

export async function fetchHtmlWithProxyRotation(originalUrl: string): Promise<string> {
  const proxyFactories = [
    // 0. Local CORS proxy (Vite dev server)
    (url: string) => `/cors-proxy?url=${encodeURIComponent(url)}`,
    // 1. Direct fetch (best if it bypasses CORS)
    (url: string) => url,
    // 2. codetabs proxy (Highly reliable public proxy fallback)
    (url: string) => `https://api.codetabs.com/v1/proxy?value=${encodeURIComponent(url)}`,
    // 3. corsproxy.io
    (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    // 4. allorigins.win raw
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // 5. cors.lol
    (url: string) => `https://cors.lol/?url=${encodeURIComponent(url)}`
  ];

  let lastError: any = null;

  for (let i = 0; i < proxyFactories.length; i++) {
    const fetchUrl = proxyFactories[i](originalUrl);
    try {
      // timeout 20s/lượt (xem fetchWithProxyRotation) — chống treo khi proxy đứng.
      const response = await fetchWithTimeout(fetchUrl, {}, 20000);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 100) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.contents) return parsed.contents;
          } catch {}
          return text;
        }
      }
    } catch (err) {
      lastError = err;
    }

    if (i < proxyFactories.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw lastError || new Error("Failed to fetch HTML via all proxy rotators.");
}

/**
 * Kiểm tra NHANH trang nào còn tồn tại bằng MediaWiki API (action=query&prop=info),
 * gộp tới 50 tiêu đề/1 request → tiết kiệm hàng chục lần crawl trang chết.
 * Trả về Set các tiêu đề (đầu vào) THỰC SỰ tồn tại. Nếu API lỗi cả cụm,
 * coi như tồn tại (không chặn nhầm) để tránh bỏ sót trang sống.
 */
export async function validateTitlesExist(titles: string[], domain: string): Promise<Set<string>> {
  const existing = new Set<string>();
  if (!titles.length || !domain) return existing;
  const apiUrl = `https://${domain}/api.php`;

  const ci = (s: string) => s.toLowerCase().replace(/_/g, ' ').trim();

  const BATCH = 50;
  for (let i = 0; i < titles.length; i += BATCH) {
    const slice = titles.slice(i, i + BATCH);
    const joined = slice.map(t => t.replace(/ /g, '_')).join('|');
    const endpoint = `${apiUrl}?action=query&prop=info&redirects=1&titles=${encodeURIComponent(joined)}&format=json&origin=*`;
    try {
      const data = await fetchWithProxyRotation(endpoint);
      const q = data?.query;
      if (!q) {
        // Không phân tích được → giữ an toàn: coi cả cụm là tồn tại
        slice.forEach(t => existing.add(t));
        continue;
      }
      // Map chuẩn hoá: input -> normalized -> redirect target
      const normMap = new Map<string, string>(); // from(ci) -> to(ci)
      (q.normalized || []).forEach((n: any) => normMap.set(ci(n.from), ci(n.to)));
      const redirMap = new Map<string, string>();
      (q.redirects || []).forEach((r: any) => redirMap.set(ci(r.from), ci(r.to)));

      // Tập tiêu đề tồn tại (trang không có thuộc tính "missing")
      const livePageTitles = new Set<string>();
      const pages = q.pages || {};
      for (const key of Object.keys(pages)) {
        const p = pages[key];
        if (!('missing' in p) && !('invalid' in p) && p.title) {
          livePageTitles.add(ci(p.title));
        }
      }

      const resolve = (t: string): string => {
        let cur = ci(t);
        if (normMap.has(cur)) cur = normMap.get(cur)!;
        if (redirMap.has(cur)) cur = redirMap.get(cur)!;
        return cur;
      };

      slice.forEach(t => {
        if (livePageTitles.has(resolve(t))) existing.add(t);
      });
    } catch (e) {
      // Lỗi mạng cả cụm → giữ an toàn, coi là tồn tại để không chặn nhầm
      slice.forEach(t => existing.add(t));
    }
  }
  return existing;
}

function bucketFromCategories(categoryTitles: string[]): WikiBucketKey | null {
  const joined = categoryTitles
    .map(c => c.replace(/^Category:/i, ''))
    .join(' ')
    .toLowerCase();

  if (!joined.trim()) return null;

  if (/\b(characters?|heroes?|enemies?|npc|female|male|alive|deceased)\b/i.test(joined)) {
    return 'characters';
  }
  if (/\b(locations?|places?|kingdoms?|cities|regions?|floors?|lobbies|towers?|infrastructure)\b/i.test(joined)) {
    return 'locations';
  }
  if (/\b(systems?|abilities|skills?|magic|spells?|summons?|mechanics?|classes?|ranks?)\b/i.test(joined)) {
    return 'systems';
  }
  if (/\b(timeline|chronology|histories|history|events?|wars?|battles?)\b/i.test(joined)) {
    return 'timeline';
  }

  return null;
}

export async function fetchWikiTitleCategoryBuckets(
  titles: string[],
  domain: string
): Promise<Record<string, WikiBucketKey>> {
  const mapping: Record<string, WikiBucketKey> = {};
  if (!titles.length || !domain) return mapping;

  const apiUrl = `https://${domain}/api.php`;
  const ci = (s: string) => s.toLowerCase().replace(/_/g, ' ').trim();
  const inputByCi = new Map<string, string>();
  titles.forEach(t => inputByCi.set(ci(t), t));

  const BATCH = 50;
  for (let i = 0; i < titles.length; i += BATCH) {
    const slice = titles.slice(i, i + BATCH);
    const joined = slice.map(t => t.replace(/ /g, '_')).join('|');
    const endpoint = `${apiUrl}?action=query&prop=categories&cllimit=max&redirects=1&titles=${encodeURIComponent(joined)}&format=json&origin=*`;

    try {
      const data = await fetchWithProxyRotation(endpoint);
      const q = data?.query;
      if (!q) continue;

      const normMap = new Map<string, string>();
      (q.normalized || []).forEach((n: any) => normMap.set(ci(n.to), ci(n.from)));
      const redirMap = new Map<string, string>();
      (q.redirects || []).forEach((r: any) => redirMap.set(ci(r.to), ci(r.from)));

      const pages = q.pages || {};
      for (const key of Object.keys(pages)) {
        const page = pages[key];
        if (!page?.title || !Array.isArray(page.categories)) continue;

        const pageCi = ci(page.title);
        const originalCi = redirMap.get(pageCi) || normMap.get(pageCi) || pageCi;
        const originalTitle = inputByCi.get(originalCi) || inputByCi.get(pageCi) || page.title;
        const bucket = bucketFromCategories(page.categories.map((c: any) => c.title || ''));
        if (bucket) mapping[originalTitle] = bucket;
      }
    } catch (e) {
      // Category hints are optional. Network/API failures fall back to AI/heuristic.
    }
  }

  return mapping;
}

/**
 * Liệt kê TOÀN BỘ bài viết của wiki (namespace 0, bỏ redirect) qua MediaWiki API
 * `list=allpages` — đây mới là cách lấy đủ "133 pages", thay vì chỉ lấy link
 * xuất hiện trên 1 trang. Tự phân trang bằng apcontinue. Có cap an toàn.
 */
export async function fetchAllWikiPages(domain: string, maxPages: number = 5000): Promise<string[]> {
  if (!domain) return [];
  const apiUrl = `https://${domain}/api.php`;
  const titles: string[] = [];
  let apcontinue: string | undefined = undefined;
  let guard = 0;

  while (guard < 40 && titles.length < maxPages) {
    guard++;
    let endpoint = `${apiUrl}?action=query&list=allpages&apnamespace=0&apfilterredir=nonredirects&aplimit=500&format=json&origin=*`;
    if (apcontinue) endpoint += `&apcontinue=${encodeURIComponent(apcontinue)}`;
    let data: any;
    try {
      data = await fetchWithProxyRotation(endpoint);
    } catch (e) {
      break; // lỗi mạng → trả về những gì đã lấy được
    }
    const pages = data?.query?.allpages || [];
    for (const p of pages) {
      if (p?.title) titles.push(p.title);
    }
    apcontinue = data?.continue?.apcontinue;
    if (!apcontinue) break;
  }

  // Lọc các trang quản trị/rác còn sót (đa số bài ns=0 sẽ qua được).
  return Array.from(new Set(titles)).filter(t => {
    const fakeUrl = `https://${domain}/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
    return isWikiItemLoreValid(t, fakeUrl, domain);
  });
}

export async function fetchWikiPage(urlStr: string, options?: { skipMenu?: boolean }): Promise<WikiPageData> {
  const parsed = parseWikiUrl(urlStr);
  if (!parsed.title || !parsed.apiUrl) {
    throw new Error("Không thể phân tách tiêu đề bối cảnh hoặc API Wiki từ URL này.");
  }

  const endpoint = `${parsed.apiUrl}?action=parse&page=${encodeURIComponent(parsed.title)}&format=json&prop=text|links&redirects=1&origin=*`;
  
  let data: any = null;
  let responseError: any = null;

  // Utilize the robust rotated proxy mechanism for MediaWiki JSON API parser
  try {
    data = await fetchWithProxyRotation(endpoint);
  } catch (err: any) {
    responseError = err;
  }

  if (responseError) {
    const errCode = responseError.code || responseError.message;
    if (errCode === 'missingtitle' || errCode === 'notfound' || errCode === 'invalidtitle' ||
        (typeof errCode === 'string' && (errCode.includes('missingtitle') || errCode.includes('notfound') || errCode.includes('invalidtitle')))) {
      throw new Error(`Trang bối cảnh không tồn tại (code: ${responseError.code || 'missingtitle'}).`);
    }
  }

  // If we successfully retrieved data from the MediaWiki API (either direct or proxy)
  if (data && !data.error) {
    try {
      const title = data.parse.title || parsed.title;
      const rawHtml = data.parse.text?.['*'] || '';
      
      // Clean and convert raw HTML to readable context text
      const content = cleanHtmlText(rawHtml);

      if (options?.skipMenu) {
        return {
          title,
          url: urlStr,
          content,
          links: [],
          menuTree: []
        };
      }

      // Filter flat links
      const rawLinks: any[] = data.parse.links || [];
      const mainLinks = rawLinks
        .filter(link => link.ns === 0 && (link.exists !== undefined))
        .map(link => link['*'])
        .filter(t => {
          // Construct mock URL to test validity
          const fakeUrl = `https://${parsed.domain}/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
          return isWikiItemLoreValid(t, fakeUrl, parsed.domain);
        });

      // Quét bổ sung siêu liên kết sâu trực tiếp từ mã nguồn HTML body của data.parse.text
      const linkRegex = /href="\/wiki\/([^"\s>#]+)"/g;
      const foundHtmlLinks: string[] = [];
      let regexMatch;
      while ((regexMatch = linkRegex.exec(rawHtml)) !== null) {
        try {
          const rawLink = regexMatch[1];
          if (rawLink.includes('redlink=1') || rawLink.includes('action=edit')) {
            continue; // Bỏ qua trang không tồn tại
          }
          const decoded = decodeURIComponent(rawLink).split(/[?#]/)[0].replace(/_/g, ' ').trim();
          const fakeUrl = `https://${parsed.domain}/wiki/${rawLink}`;
          if (decoded && isWikiItemLoreValid(decoded, fakeUrl, parsed.domain) && !foundHtmlLinks.includes(decoded)) {
            foundHtmlLinks.push(decoded);
          }
        } catch (e) {}
      }

      const uniqueLinks = Array.from(new Set([
        ...mainLinks,
        ...foundHtmlLinks
      ]));

      // Fetch site-wide custom navigation structure to populate multi-level dropdown tree
      let siteNavTree = await fetchFandomLocalNavigation(parsed.domain);
      if (!siteNavTree || siteNavTree.length === 0) {
        siteNavTree = await fetchWikiNavigation(parsed.apiUrl, parsed.domain);
      }

      // Parse on-page list tree from the article body itself
      const onPageTree = parseHtmlToMenuTree(rawHtml, parsed.domain);

      // Helpers to extract leaf names for total data integration
      const extractAllLinksFromMenuTree = (tree: WikiMenuItem[]): string[] => {
        if (!tree) return [];
        const titles: string[] = [];
        const traverse = (items: WikiMenuItem[]) => {
          for (const item of items) {
            if (item.title) {
              titles.push(item.title);
            }
            if (item.children) {
              traverse(item.children);
            }
          }
        };
        traverse(tree);
        return titles;
      };

      const extraOnPageLinks = extractAllLinksFromMenuTree(onPageTree);
      const extraSiteNavLinks = extractAllLinksFromMenuTree(siteNavTree);

      // Consolidated comprehensive list of all valid lore entries we could harvest
      const consolidatedLinks = Array.from(new Set([
        ...uniqueLinks,
        ...extraOnPageLinks,
        ...extraSiteNavLinks
      ])).filter(t => {
        const fakeUrl = `https://${parsed.domain}/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
        return isWikiItemLoreValid(t, fakeUrl, parsed.domain);
      });

      // Auto-categorized 100% hierarchical tree consisting of exactly the 5 requested folders
      const menuTree = generateAutoCategorizedTree(consolidatedLinks, parsed.domain);

      return {
        title,
        url: urlStr,
        content,
        links: consolidatedLinks,
        menuTree
      };
    } catch (parseErr) {
      console.error(`Failed to parse MediaWiki API structure for: ${parsed.title}`, parseErr);
    }
  }

  // Double-Redundant robust direct crawl fallback using rotating proxies
  console.warn(`MediaWiki API completely failed for ${parsed.title}. Initiating direct HTML crawl with robust proxy rotation...`);
  try {
    const html = await fetchHtmlWithProxyRotation(urlStr);
    const content = cleanHtmlText(html);
    
    if (options?.skipMenu) {
      return {
        title: parsed.title,
        url: urlStr,
        content: content.substring(0, 100000),
        links: [],
        menuTree: []
      };
    }

    let siteNavTree = await fetchFandomLocalNavigation(parsed.domain);
    if (!siteNavTree || siteNavTree.length === 0) {
      siteNavTree = await fetchWikiNavigation(parsed.apiUrl, parsed.domain);
    }
    
    let onPageTree = parseHtmlToMenuTree(html, parsed.domain);
    
    const linkRegex = /href="\/wiki\/([^"\s>#]+)"/g;
    const foundLinks: string[] = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      try {
        const rawLink = match[1];
        if (rawLink.includes('redlink=1') || rawLink.includes('action=edit')) {
          continue; // Bỏ qua trang không tồn tại
        }
        const decoded = decodeURIComponent(rawLink).split(/[?#]/)[0].replace(/_/g, ' ').trim();
        const fakeUrl = `https://${parsed.domain}/wiki/${rawLink}`;
        if (decoded && isWikiItemLoreValid(decoded, fakeUrl, parsed.domain) && !foundLinks.includes(decoded)) {
          foundLinks.push(decoded);
        }
      } catch (e) {}
    }

    // Helpers to extract leaf names for page fallback
    const extractAllLinksFromMenuTree = (tree: WikiMenuItem[]): string[] => {
      if (!tree) return [];
      const titles: string[] = [];
      const traverse = (items: WikiMenuItem[]) => {
        for (const item of items) {
          if (item.title) {
            titles.push(item.title);
          }
          if (item.children) {
            traverse(item.children);
          }
        }
      };
      traverse(tree);
      return titles;
    };

    const extraOnPageLinks = extractAllLinksFromMenuTree(onPageTree);
    const extraSiteNavLinks = extractAllLinksFromMenuTree(siteNavTree);

    const consolidatedLinks = Array.from(new Set([
      ...foundLinks,
      ...extraOnPageLinks,
      ...extraSiteNavLinks
    ])).filter(t => {
      const fakeUrl = `https://${parsed.domain}/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
      return isWikiItemLoreValid(t, fakeUrl, parsed.domain);
    });

    const menuTree = generateAutoCategorizedTree(consolidatedLinks, parsed.domain);

    return {
      title: parsed.title,
      url: urlStr,
      content: content.substring(0, 100000),
      links: consolidatedLinks,
      menuTree
    };
  } catch (fallbackError: any) {
    throw new Error(`Crawl failed for both MediaWiki API and direct HTML: ${fallbackError.message || fallbackError}`, { cause: fallbackError });
  }
}

function cleanHtmlText(html: string): string {
  if (!html) return '';

  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Remove noise elements completely to filter out spam/ads/administrative menus
      const noise = [
        'script', 'style', 'noscript', 'iframe', '.global-navigation',
        '#recirculation-rail', '.marketing-notifications', '.wds-global-navigation',
        '.rail-module', '.custom-wiki-adv', '.fandom-video-rail', '.toc', '.mw-jump-link',
        '#catlinks', '.printfooter', '.wds-global-footer', '.community-header-wrapper',
        '.fandom-community-header', '.reference', '.mw-editsection', '.portal', '.navbar',
        '#wpTextbox1', '.editsection',
        '.navbox', '.vertical-navbox', '.navigation-box', '.catlinks', '.reflist', '.references',
        '.wikia-bar', '#WikiaBar', '.wikia-bar-wrapper', '#mixed-content-footer', '.fandom-sticky-header',
        '.ad-slot', '.ad-wrapper', '.fandom-video-side-rail', '.fandom-video-thumbnail', '.featured-video__wrapper',
        '.fandom-video-player', '[class*="ad-"]', '[class*="adbox"]', '[id*="ad-"]', '[id*="adbox"]',
        '#mw-panel', '#mw-head', '#mw-navigation', '#footer', '.license-description',
        '.mw-editsection-bracket', '.wds-banner-notification', '.wds-dialog', '.wds-alert',
        '.notifications-placeholder'
      ];
      noise.forEach(sel => {
        doc.querySelectorAll(sel).forEach(el => el.remove());
      });

      // Special handling: Portable Infobox (convert to structured core attributes)
      doc.querySelectorAll('.portable-infobox, .infobox, aside').forEach(info => {
        let infoboxText = '\n\n### THÔNG TIN CỐT LÕI (DANH MỤC CHI TIẾT)\n';
        
        info.querySelectorAll('.pi-item, tr').forEach(item => {
          const labelEl = item.querySelector('.pi-data-label, .infobox-label, th');
          const valueEl = item.querySelector('.pi-data-value, .infobox-data, td');
          if (labelEl && valueEl) {
            const lbl = labelEl.textContent?.trim().replace(/\s+/g, ' ');
            const val = valueEl.textContent?.trim().replace(/\s+/g, ' ');
            if (lbl && val) {
              infoboxText += `- **${lbl}**: ${val}\n`;
            }
          } else {
            const header = item.querySelector('.pi-header, .infobox-header');
            if (header) {
              const text = header.textContent?.trim().replace(/\s+/g, ' ');
              if (text) infoboxText += `\n**[ ${text} ]**\n`;
            }
          }
        });
        
        // Plain text fallback if empty structure
        if (infoboxText.length < 60) {
          const contentsClean = info.textContent?.trim().split('\n').map(l => l.trim()).filter(Boolean).join(' • ') || '';
          if (contentsClean) {
            infoboxText = `\n\n### THÔNG TIN CỐT LÕI (DANH MỤC CHI TIẾT)\n- ${contentsClean}\n`;
          }
        }
        
        const replacement = doc.createElement('div');
        replacement.textContent = infoboxText + '\n';
        info.parentNode?.replaceChild(replacement, info);
      });

      // Convert data <table> elements into beautiful readable Markdown tables
      doc.querySelectorAll('table').forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) return;

        let tableText = '\n\n';
        let isFirstRow = true;
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          const cellTexts = cells.map(c => c.textContent?.trim().replace(/\s+/g, ' ') || '');
          if (cellTexts.some(txt => txt !== '')) {
            // Render as a clean markdown table row
            tableText += `| ${cellTexts.join(' | ')} |\n`;
            if (isFirstRow) {
              tableText += `| ${cellTexts.map(() => '---').join(' | ')} |\n`;
              isFirstRow = false;
            }
          }
        });
        tableText += '\n';

        const replacement = doc.createElement('pre');
        replacement.textContent = tableText;
        table.parentNode?.replaceChild(replacement, table);
      });

      // Extract details node-by-node under .mw-parser-output or total body
      const contentBody = doc.querySelector('.mw-parser-output') || doc.body;
      let finalLines: string[] = [];
      
      const traverseNodes = (parent: Element) => {
        const children = Array.from(parent.children);
        children.forEach(el => {
          const tag = el.tagName.toLowerCase();
          
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            const headingText = el.textContent?.trim().replace(/\s+/g, ' ') || '';
            const skipHeaders = ['recirculation-rail', 'references', 'see also', 'tài liệu tham khảo', 'liên kết ngoài'];
            if (headingText && !skipHeaders.some(sh => headingText.toLowerCase().includes(sh))) {
              finalLines.push(`\n\n### ${headingText}\n`);
            }
          } 
          else if (tag === 'p') {
            const pText = el.textContent?.trim().replace(/\s+/g, ' ') || '';
            if (pText) {
              finalLines.push(pText);
            }
          } 
          else if (['ul', 'ol'].includes(tag)) {
            el.querySelectorAll('li').forEach(li => {
              const liText = li.textContent?.trim().replace(/\s+/g, ' ') || '';
              if (liText) {
                finalLines.push(`- ${liText}`);
              }
            });
          }
          else if (tag === 'pre') {
            // Preformatted text / parsed tables
            finalLines.push(el.textContent || '');
          }
          else if (['div', 'section'].includes(tag)) {
            // Drill down unless it contains our custom pre elements
            if (el.querySelector('pre') || el.textContent?.includes('| --- |')) {
              finalLines.push(el.textContent || '');
            } else {
              traverseNodes(el);
            }
          }
        });
      };

      traverseNodes(contentBody);

      const textResult = finalLines
        .filter(line => {
          const cleanLine = line.toLowerCase();
          if (cleanLine.includes('fandom may earn an affiliate commission') ||
              cleanLine.includes('terms of service') ||
              cleanLine.includes('community content is available under') ||
              cleanLine.includes('copyright') ||
              cleanLine.includes('retrieved from') ||
              cleanLine.includes('the wiki may contain spoilers')) {
            return false;
          }
          return line.trim().length > 0;
        })
        .join('\n');

      if (textResult.trim().length > 100) {
        return textResult;
      }
    } catch (e) {
      console.warn("DOMParser cleaning failed, falling back to regex...", e);
    }
  }

  // Fallback regex version if DOMParser fails
  let text = html;
  
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, ''); 
  text = text.replace(/<div class="toc"[\s\S]*?<\/div>/gi, ' '); 
  text = text.replace(/<div class="global-navigation"[\s\S]*?<\/div>/gi, ' '); 
  text = text.replace(/<div[^>]*class="[^"]*(?:marketing|rail|advertisement|community-header)[^"]*"[\s\S]*?<\/div>/gi, ' ');
  text = text.replace(/<div[^>]*class="[^"]*(?:navbox|vertical-navbox|catlinks|reflist|references|wikia-bar|ad-slot|ad-wrapper|global-footer|sticky-header)[^"]*"[\s\S]*?<\/div>/gi, ' ');
  text = text.replace(/<table[^>]*class="[^"]*(?:navbox|vertical-navbox)[^"]*"[\s\S]*?<\/table>/gi, ' ');

  // Parse tables to simple lines instead of deleting
  text = text.replace(/<tr[\s\S]*?>/gi, '\n');
  text = text.replace(/<(th|td)[\s\S]*?>(.*?)<\/\1>/gi, ' | $2');
  text = text.replace(/<\/tr>/gi, ' |');
  
  text = text
    .replace(/<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/gi, '\n\n### $1\n') 
    .replace(/<p\b[^>]*>(.*?)<\/p>/gi, '\n$1\n') 
    .replace(/<li\b[^>]*>(.*?)<\/li>/gi, '\n- $1') 
    .replace(/<strong\b[^>]*>(.*?)<\/strong>/gi, '**$1**') 
    .replace(/<b\b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em\b[^>]*>(.*?)<\/em>/gi, '*$1*') 
    .replace(/<i\b[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<br\s*\/?>/gi, '\n');

  text = text.replace(/<[^>]+>/g, ' ');

  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  const lines = text.split('\n');
  const filteredLines = lines.filter(line => {
    const cleanLine = line.toLowerCase();
    
    if (cleanLine.includes('fandom may earn an affiliate commission') ||
        cleanLine.includes('terms of service') ||
        cleanLine.includes('privacy policy') ||
        cleanLine.includes('copyright') ||
        cleanLine.includes('community content is available under') ||
        cleanLine.includes('all rights reserved') ||
        cleanLine.includes('view shell') ||
        cleanLine.includes('edit history') ||
        cleanLine.includes('categories:') ||
        cleanLine.includes('the wiki may contain spoilers') ||
        cleanLine.includes('retrieved from')) {
      return false;
    }
    
    return line.trim().length > 0;
  });

  return filteredLines.join('\n');
}
