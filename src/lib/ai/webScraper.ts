/**
 * SOTA Dual-Layer Web Search Scraper (DuckDuckGo, Wikipedia, Baidu)
 * This acts as the Layer 2 fallback when native Google Search Grounding is not used.
 */

export interface ScraperResult {
  source: string;
  url: string;
  content: string;
}

/**
 * Perform a cascade search using a public or custom CORS proxy
 */
export async function cascadeSearch(query: string, proxyUrl: string = 'https://corsproxy.io/?'): Promise<ScraperResult[]> {
  const results: ScraperResult[] = [];

  // 1. DuckDuckGo Instant Answer
  try {
    const ddgResult = await searchDuckDuckGo(query, proxyUrl);
    if (ddgResult) results.push(ddgResult);
  } catch (e) {
    console.warn('DuckDuckGo search failed:', e);
  }

  // 2. Wikipedia (Vietnamese & English)
  try {
    const wikiResult = await searchWikipedia(query, proxyUrl);
    if (wikiResult) results.push(wikiResult);
  } catch (e) {
    console.warn('Wikipedia search failed:', e);
  }

  // 3. Baidu Baike (optional, useful for CJK/Anime queries)
  try {
    const baiduResult = await searchBaidu(query, proxyUrl);
    if (baiduResult) results.push(baiduResult);
  } catch {
    console.warn('[Baidu Search] Failed or timed out');
  }

  return results;
}

async function searchDuckDuckGo(query: string, proxyUrl: string): Promise<ScraperResult | null> {
  const targetUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
  const url = proxyUrl ? `${proxyUrl}${encodeURIComponent(targetUrl)}` : targetUrl;
  
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  
  if (data.AbstractText) {
    return {
      source: 'DuckDuckGo',
      url: data.AbstractURL,
      content: data.AbstractText
    };
  }
  return null;
}

async function searchWikipedia(query: string, proxyUrl: string): Promise<ScraperResult | null> {
  const targetUrl = `https://vi.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&titles=${encodeURIComponent(query)}`;
  const url = proxyUrl ? `${proxyUrl}${encodeURIComponent(targetUrl)}` : targetUrl;
  
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  
  const pages = data.query?.pages;
  if (!pages) return null;
  const pageId = Object.keys(pages)[0];
  if (pageId === '-1') return null;
  
  const page = pages[pageId];
  if (page.extract) {
    return {
      source: 'Wikipedia',
      url: `https://vi.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      content: page.extract
    };
  }
  return null;
}

async function searchBaidu(query: string, proxyUrl: string): Promise<ScraperResult | null> {
  // Baidu Baike API is not officially public, so we might scrape HTML or use a known public endpoint.
  // For demonstration, we simulate a simple scrape if possible, or skip.
  const targetUrl = `https://baike.baidu.com/item/${encodeURIComponent(query)}`;
  const url = proxyUrl ? `${proxyUrl}${encodeURIComponent(targetUrl)}` : targetUrl;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    // Very rudimentary extraction
    const match = html.match(/<meta name="description" content="([^"]+)">/i);
    if (match && match[1]) {
      return {
        source: 'Baidu Baike',
        url: targetUrl,
        content: match[1]
      };
    }
  } catch {
    return null;
  }
  return null;
}
