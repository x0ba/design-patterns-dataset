// Client-side search over the article index.
//
// Words are matched exactly first. Longer words also match within a small
// edit distance, so a scanned "Tannerv" still finds "Tannery". Matches in
// titles and street tags count for more than matches in the body text.

import { SEASONS } from './format';

const STOP = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export function tokenize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Edit distance, stopping early once it passes `max`.
export function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// Fuzzy matching allowance by word length. Five-letter words only match
// with a single substituted letter, so "flood" does not match "food".
const allowedEdits = (word) => (word.length >= 9 ? 2 : word.length >= 5 ? 1 : 0);

// True when a word from the text is close enough to a typed token.
// Five-letter tokens only match a single substituted letter, so "flood" does
// not match "food".
function fuzzyHit(word, token) {
  const max = allowedEdits(token);
  if (!max || Math.abs(word.length - token.length) > max) return false;
  if (token.length === 5 && word.length !== 5) return false;
  return editDistance(word, token, max) <= max;
}

const FIELDS = [
  ['t', 6], // headline
  ['g', 5], // street and neighborhood tags
  ['b', 4], // byline
  ['d', 3], // deck
  ['x', 2], // full text (hand-written stories only)
];

function docFor(a) {
  if (a._doc) return a._doc;
  a._doc = {
    t: new Set(tokenize(a.title)),
    g: new Set([...a.streets, ...a.hoods].flatMap((s) => tokenize(s.replace(/-/g, ' ')))),
    b: new Set(a.by.flatMap((n) => tokenize(n))),
    d: new Set(tokenize(a.deck)),
    x: new Set(tokenize(a.text || '')),
  };
  return a._doc;
}

function matchToken(doc, token) {
  for (const [f, w] of FIELDS) {
    if (doc[f].has(token)) return { score: w, fuzzy: null };
  }
  const max = allowedEdits(token);
  if (!max) return null;
  let best = null;
  for (const [f, w] of FIELDS) {
    for (const word of doc[f]) {
      if (!fuzzyHit(word, token)) continue;
      const score = w * 0.6;
      if (!best || score > best.score) best = { score, fuzzy: word };
    }
  }
  return best;
}

export function runSearch(articles, { q = '', from, to, seasons = [], section = '', sort = 'relevance' }) {
  const tokens = tokenize(q);
  const useTokens = tokens.filter((t) => !STOP.has(t));
  const queryTokens = useTokens.length ? useTokens : tokens;
  const months = seasons.length
    ? new Set(SEASONS.filter((s) => seasons.includes(s.key)).flatMap((s) => s.list))
    : null;
  const out = [];

  for (const a of articles) {
    const year = Number(a.issue.slice(0, 4));
    if (from && year < from) continue;
    if (to && year > to) continue;
    if (months && !months.has(Number(a.issue.slice(5, 7)))) continue;
    if (section && a.section !== section) continue;

    let score = 0;
    const fuzzy = [];
    if (queryTokens.length) {
      const doc = docFor(a);
      let ok = true;
      for (const tk of queryTokens) {
        const m = matchToken(doc, tk);
        if (!m) {
          ok = false;
          break;
        }
        score += m.score;
        if (m.fuzzy) fuzzy.push({ typed: tk, found: m.fuzzy });
      }
      if (!ok) continue;
    }
    out.push({ article: a, score, fuzzy, queryTokens });
  }

  const byDateDesc = (x, y) => (x.article.date < y.article.date ? 1 : x.article.date > y.article.date ? -1 : 0);
  if (sort === 'oldest') out.sort((x, y) => -byDateDesc(x, y));
  else if (sort === 'newest') out.sort(byDateDesc);
  else out.sort((x, y) => y.score - x.score || byDateDesc(x, y));
  return out;
}

// Returns the text around the first word that matches a query token, so the
// result card can show the matching sentence with the word highlighted.
export function snippetFor(text, queryTokens, radius = 120) {
  if (!text || !queryTokens.length) return null;
  const re = /[A-Za-z0-9]+/g;
  let m;
  while ((m = re.exec(text))) {
    const word = m[0].toLowerCase();
    const hit = queryTokens.some((tk) => word === tk || fuzzyHit(word, tk));
    if (hit) {
      const start = Math.max(0, m.index - radius);
      const end = Math.min(text.length, m.index + m[0].length + radius);
      return {
        before: (start > 0 ? '…' : '') + text.slice(start, m.index),
        word: m[0],
        after: text.slice(m.index + m[0].length, end) + (end < text.length ? '…' : ''),
      };
    }
  }
  return null;
}

// Street and neighborhood names that look like what was typed.
export function suggestPlaces(q, places) {
  const typed = tokenize(q).join(' ');
  if (typed.length < 4) return [];
  const scored = [];
  for (const p of places) {
    const name = p.name.toLowerCase();
    const max = Math.max(2, Math.floor(name.length / 4));
    const d = editDistance(name, typed, max);
    if (d <= max) scored.push({ place: p, d });
  }
  return scored.sort((a, b) => a.d - b.d).slice(0, 3).map((s) => s.place);
}
