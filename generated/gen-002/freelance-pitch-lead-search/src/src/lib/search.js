import { TODAY, FRIDAY, WINDOWS, SIX_MONTHS_START, daysSince, addDays } from './dates.js';
import { OUTLET_BY_ID } from '../data/outlets.js';

export const TOPICS = [
  'Colony disease',
  'Urban beekeeping',
  'Pollinator decline',
  'Pesticides',
  'Policy',
  'Research & surveys',
];

export const WORD_BANDS = [
  { key: 'any', label: 'Any length' },
  { key: 'short', label: 'Under 800 words', test: (w) => w < 800 },
  { key: 'mid', label: '800 to 1,999 words', test: (w) => w >= 800 && w < 2000 },
  { key: 'long', label: '2,000+ words', test: (w) => w >= 2000 },
];

// How a story's topic tags map onto the topics editors use in their calls.
export const TAG_TO_CALL_TOPICS = {
  'Colony disease': ['Pollinators', 'Science', 'Agriculture'],
  'Urban beekeeping': ['Urban planning', 'Agriculture', 'Pollinators'],
  'Pollinator decline': ['Pollinators', 'Environment', 'Wildlife'],
  Pesticides: ['Environment', 'Agriculture', 'Water'],
  Policy: ['Urban planning', 'Environment'],
  'Research & surveys': ['Science', 'Wildlife', 'Environment'],
};

// Call topics that count as a direct hit on a beekeeping story (worth more in scoring).
const CORE_CALL_TOPICS = new Set(['Pollinators', 'Urban planning']);

export function tokenize(q) {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9&'-]/g, ''))
    .filter(Boolean);
}

const regexCache = new Map();
function wordStart(tok) {
  if (!regexCache.has(tok)) {
    const esc = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regexCache.set(tok, new RegExp(`(^|[^a-z0-9])${esc}`));
  }
  return regexCache.get(tok);
}

// Adds derived search fields once, at load time.
export function indexArticle(a) {
  const outlet = OUTLET_BY_ID[a.outletId];
  a.outletName = outlet ? outlet.name : a.outletId;
  a.headlineLower = a.headline.toLowerCase();
  a.summaryLower = a.summary.toLowerCase();
  a.searchText = [a.headline, a.summary, a.outletName, a.author, a.section, a.angle, ...a.tags]
    .join(' ')
    .toLowerCase();
  return a;
}

export function matchesQuery(a, toks) {
  return toks.every((t) => wordStart(t).test(a.searchText));
}

export function relevanceScore(a, toks) {
  let s = 0;
  for (const t of toks) {
    if (wordStart(t).test(a.headlineLower)) s += 3;
    if (wordStart(t).test(a.summaryLower)) s += 1;
  }
  return s;
}

export function runQuery(articles, q) {
  const toks = tokenize(q);
  if (!toks.length) return articles;
  return articles.filter((a) => matchesQuery(a, toks));
}

export function sortArticles(list, sort, toks) {
  const out = list.slice();
  switch (sort) {
    case 'newest':
      return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    case 'oldest':
      return out.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    case 'words':
      return out.sort((a, b) => b.words - a.words);
    default: {
      const rel = new Map(out.map((a) => [a.id, relevanceScore(a, toks)]));
      return out.sort((a, b) => rel.get(b.id) - rel.get(a.id) || (a.date < b.date ? 1 : -1));
    }
  }
}

export function windowStart(key) {
  return WINDOWS.find((w) => w.key === key)?.start ?? null;
}

// f = { window, topics:Set, angle:string|null, author:'any'|'freelance'|'staff', words:'any'|'short'|'mid'|'long' }
// skip lets facet counts ignore their own group.
export function applyFilters(list, f, skip = {}) {
  const start = windowStart(f.window);
  const band = WORD_BANDS.find((b) => b.key === f.words);
  return list.filter((a) => {
    if (!skip.window && start && a.date < start) return false;
    if (!skip.topics && f.topics.size) {
      for (const t of f.topics) if (!a.tags.includes(t)) return false;
    }
    if (!skip.angle && f.angle && a.angle !== f.angle) return false;
    if (f.author !== 'any' && a.authorType !== f.author) return false;
    if (!skip.words && band?.test && !band.test(a.words)) return false;
    return true;
  });
}

export function topicCounts(base, f) {
  const list = applyFilters(base, f, { topics: true });
  const counts = Object.fromEntries(TOPICS.map((t) => [t, 0]));
  for (const a of list) for (const t of a.tags) if (t in counts) counts[t] += 1;
  return counts;
}

export function angleCounts(base, f) {
  const list = applyFilters(base, f, { angle: true });
  const counts = {};
  for (const a of list) counts[a.angle] = (counts[a.angle] || 0) + 1;
  return Object.entries(counts).sort((x, y) => y[1] - x[1]);
}

export function inRecentWindow(a) {
  return a.date >= SIX_MONTHS_START;
}

// Per-outlet coverage inside a set of articles.
export function outletCoverage(list) {
  const map = new Map();
  for (const a of list) {
    let s = map.get(a.outletId);
    if (!s) {
      s = { total: 0, recent: 0, freelanceWritten: 0, latest: null, sample: null };
      map.set(a.outletId, s);
    }
    s.total += 1;
    if (inRecentWindow(a)) s.recent += 1;
    if (a.authorType === 'freelance') s.freelanceWritten += 1;
    if (!s.latest || a.date > s.latest) {
      s.latest = a.date;
      s.sample = a;
    }
  }
  return map;
}

// Which call topics count as relevant to the current story.
export function activeCallTopics(f, list) {
  let tags;
  if (f.topics.size) {
    tags = [...f.topics];
  } else {
    const counts = {};
    for (const a of list) for (const t of a.tags) counts[t] = (counts[t] || 0) + 1;
    tags = Object.entries(counts)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3)
      .map(([t]) => t);
  }
  const set = new Set();
  for (const t of tags) for (const ct of TAG_TO_CALL_TOPICS[t] || []) set.add(ct);
  return set;
}

export function callIsRelevant(call, active) {
  return call.topics.some((t) => active.has(t));
}

export function callDeadlineOk(call, mode) {
  if (mode === 'friday') return call.deadline <= FRIDAY;
  if (mode === 'fortnight') return call.deadline <= addDays(TODAY, 14);
  return true;
}

function payScore(pay) {
  if (!pay) return 0;
  if (pay.type === 'word') return Math.min(15, (pay.amount / 1.5) * 15);
  return Math.min(15, (pay.amount / 1500) * 15);
}

export function payLabel(pay) {
  if (!pay) return '';
  if (pay.type === 'word') return `$${pay.amount.toFixed(2)}/word`;
  return `$${pay.amount.toLocaleString('en-US')} flat`;
}

// Fit score for one outlet, 0 to 100. Every part is shown to the user.
export function scoreOutlet({ outlet, coverage, calls, active, pitchesOut }) {
  if (!outlet.freelance) return null;

  const relevant = calls.filter((c) => callIsRelevant(c, active));
  let best = null;
  for (const c of relevant) {
    const timing = c.deadline >= FRIDAY ? 20 : 12;
    const topic = c.topics.some((t) => CORE_CALL_TOPICS.has(t)) ? 10 : 5;
    const sum = timing + topic;
    if (!best || sum > best.sum || (sum === best.sum && c.deadline < best.call.deadline)) {
      best = { call: c, sum, timing, topic };
    }
  }

  const recent = coverage?.recent ?? 0;
  const coverageScore = Math.min(15, recent * 4);
  const callScore = best ? best.sum : 0;

  let pay = null;
  if (best) pay = best.call.pay;
  else if (outlet.history) {
    const m = outlet.history.payLabel.match(/\$([\d,.]+)(\/word| flat)?/);
    if (m) pay = { type: m[2] === '/word' ? 'word' : 'flat', amount: Number(m[1].replace(/,/g, '')) };
  }
  const payPts = payScore(pay);

  let historyPts = 0;
  if (outlet.history) {
    const h = outlet.history;
    historyPts = 8 + (h.responseDays <= 7 ? 7 : h.responseDays <= 14 ? 4 : 0) + (h.wrote >= 3 ? 5 : 0);
  }

  const pitchedRecently = pitchesOut.filter((p) => p.outletId === outlet.id && daysSince(p.sent) <= 30);
  const penalty = pitchedRecently.length ? 20 : 0;

  const raw = coverageScore + callScore + payPts + historyPts - penalty;
  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    parts: { coverage: Math.round(coverageScore), call: callScore, pay: Math.round(payPts), history: historyPts, penalty },
    bestCall: best ? best.call : null,
    pay,
    pitchedRecently: pitchedRecently[0] || null,
  };
}

