export type WikiBucketKey = 'worldview' | 'systems' | 'characters' | 'locations' | 'timeline';

const norm = (s: string) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const KW: Record<'timeline' | 'locations' | 'systems', string[]> = {
  timeline: [
    'timeline', 'chronology', 'history', 'era', 'epoch', 'war', 'battle', 'incident', 'event',
    'dong thoi gian', 'nien bieu', 'lich su', 'ky nguyen', 'thoi dai', 'su kien', 'tran chien', 'chien tranh'
  ],
  locations: [
    'kingdom', 'empire', 'city', 'town', 'village', 'forest', 'province', 'island', 'mountain',
    'lake', 'river', 'cave', 'dungeon', 'tower', 'floor', 'region', 'continent', 'realm', 'land', 'capital',
    'airship', 'world map', 'dia danh', 'vuong quoc', 'de quoc', 'thanh pho', 'thi tran', 'vung dat', 'tang',
    'thap', 'khu vuc', 'dai luc', 'lanh dia', 'thu do', 'niflheim'
  ],
  systems: [
    'magic', 'spell', 'ability', 'skill', 'tier', 'class', 'job', 'level', 'mana', 'power', 'system',
    'rule', 'mechanic', 'economy', 'currency', 'gacha', 'rank', 'star system', 'stat', 'summon', 'synthesis',
    'ma thuat', 'ky nang', 'phep thuat', 'he thong', 'cap bac', 'suc manh', 'co che', 'quy tac', 'kinh te',
    'tien te', 'xep hang', 'trieu hoi', 'tong hop', 'cap do'
  ],
};

// Strong tabs are very likely character profile pages. Chronology/history are soft:
// they become character tabs only when the parent title itself looks character-like.
const STRONG_CHAR_SUBPAGE = /\/(relationships?|gallery|image[_ ]?gallery|abilities|ability|artifacts?|equipment|quotes?|trivia|synopsis|profile|stats?|biography|appearance|personality|skills?)\b/i;
const SOFT_CHAR_SUBPAGE = /\/(chronology|history)\b/i;

const NON_PERSON = /\b(wiki|page|category|template|user|file|help|index|list|main|portal|navigation|sandbox|module)\b/i;
const NON_NAME_WORDS = /\b(me|up|the|and|or|of|in|on|at|for|to|from|with)\b/i;
// Trang chương/tập truyện (manga/anime) → dòng thời gian, KHÔNG để trôi vào worldview.
const CHAPTERLIKE = /^(chapter|chapitre|episode|ep|vol|volume|arc|ch|tập|chương|hồi)\b\.?\s*\d+/i;

export function parentTitle(title: string): string {
  const i = title.indexOf('/');
  return i > 0 ? title.slice(0, i) : title;
}

const stripTitleNoise = (title: string) =>
  parentTitle(title)
    .replace(/\(.*?\)/g, ' ')
    .replace(/["'“”]/g, ' ')
    .trim();

const hasKnownNonCharacterKeyword = (title: string): boolean => {
  const n = norm(title);
  return Object.values(KW).some(arr => arr.some(kw => n.includes(norm(kw))));
};

const isPotentialCharacterParent = (title: string): boolean => {
  const base = stripTitleNoise(title);
  if (!base) return false;
  if (base.includes('!')) return false;
  if (/\(disambiguation\)/i.test(title)) return false;
  if (NON_PERSON.test(base)) return false;
  if (NON_NAME_WORDS.test(base)) return false;
  if (hasKnownNonCharacterKeyword(base)) return false;
  return true;
};

const startsWithUpper = (word: string): boolean => /^[A-ZÀ-Ỵ]/.test(word);

const looksLikeSingleProperName = (title: string): boolean => {
  const base = stripTitleNoise(title);
  if (!isPotentialCharacterParent(base)) return false;
  const words = base.split(/\s+/).filter(Boolean);
  return words.length === 1 && startsWithUpper(words[0]);
};

export function looksLikePersonName(title: string): boolean {
  const base = stripTitleNoise(title);
  if (!isPotentialCharacterParent(base)) return false;
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  return words.every(startsWithUpper);
}

export function isCharacterSubpageTitle(title: string): boolean {
  const t = String(title || '').trim();
  if (!t.includes('/')) return false;
  const parent = parentTitle(t);
  if (!isPotentialCharacterParent(parent)) return false;
  if (STRONG_CHAR_SUBPAGE.test(t)) return true;
  if (SOFT_CHAR_SUBPAGE.test(t)) {
    return looksLikePersonName(parent) || looksLikeSingleProperName(parent);
  }
  return false;
}

export function heuristicBucket(title: string): WikiBucketKey {
  const t = String(title || '').trim();
  if (!t) return 'worldview';
  if (/\(disambiguation\)/i.test(t)) return 'worldview';
  if (CHAPTERLIKE.test(t)) return 'timeline';           // "Chapter 371", "Episode 12"...
  if (isCharacterSubpageTitle(t)) return 'characters';

  const n = norm(t);
  if (KW.timeline.some(kw => n.includes(norm(kw)))) return 'timeline';
  if (KW.locations.some(kw => n.includes(norm(kw)))) return 'locations';
  if (KW.systems.some(kw => n.includes(norm(kw)))) return 'systems';
  if (looksLikePersonName(t)) return 'characters';
  return 'worldview';
}

export function reconcileSubpages(map: Record<string, WikiBucketKey>): Record<string, WikiBucketKey> {
  const out: Record<string, WikiBucketKey> = { ...map };

  for (const title of Object.keys(out)) {
    if (isCharacterSubpageTitle(title)) {
      out[title] = 'characters';
      const parent = parentTitle(title);
      if (parent in out) out[parent] = 'characters';
    }
  }

  for (const title of Object.keys(out)) {
    if (!title.includes('/') || isCharacterSubpageTitle(title)) continue;
    const parent = parentTitle(title);
    if (out[parent] && out[title] === 'worldview') out[title] = out[parent];
  }

  return out;
}
