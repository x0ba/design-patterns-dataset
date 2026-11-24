import type { Card, Dataset, DeckId, Review, Topic } from '../data/types';

/* ------------------------------------------------------------------ */
/* Dates and windows                                                  */
/* ------------------------------------------------------------------ */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dateOfDay(day: number): Date {
  return new Date(2026, 10, 16 + day);
}

export function shortDate(day: number): string {
  const d = dateOfDay(day);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function rangeLabel(from: number, to: number): string {
  const a = dateOfDay(from);
  const b = dateOfDay(to);
  if (a.getMonth() === b.getMonth()) return `${MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}`;
  return `${shortDate(from)}–${shortDate(to)}`;
}

/** The three-week window before the change started, and the three weeks since. */
export const BEFORE = { from: -41, to: -21 };
export const RECENT = { from: -20, to: 0 };
export const LAST_WEEK = { from: -6, to: 0 };

export const WEEKS = Array.from({ length: 6 }, (_, i) => ({
  from: -41 + i * 7,
  to: -35 + i * 7,
}));

const inRange = (r: Review, w: { from: number; to: number }) => r.day >= w.from && r.day <= w.to;

/* ------------------------------------------------------------------ */
/* Scope and card age                                                 */
/* ------------------------------------------------------------------ */

export type ScopeId = 'bio' | 'bio3' | 'bio12' | 'all';

export const SCOPES: { id: ScopeId; label: string; decks: DeckId[] }[] = [
  { id: 'bio', label: 'AP Biology (both units)', decks: ['bio3', 'bio12'] },
  { id: 'bio3', label: 'AP Bio Unit 3', decks: ['bio3'] },
  { id: 'bio12', label: 'AP Bio Units 1–2', decks: ['bio12'] },
  { id: 'all', label: 'All five decks', decks: ['bio3', 'bio12', 'spvocab', 'spverb', 'pt'] },
];

export function scopeDecks(scope: ScopeId): DeckId[] {
  return SCOPES.find((s) => s.id === scope)!.decks;
}

export const AGE_BUCKETS = [
  { key: 'u1w', label: 'Under 1 week', lo: 0, hi: 6 },
  { key: '1to3w', label: '1–3 weeks', lo: 7, hi: 20 },
  { key: '3to8w', label: '3–8 weeks', lo: 21, hi: 55 },
  { key: '8plus', label: 'Over 8 weeks', lo: 56, hi: 100000 },
] as const;

export function ageBucketIndex(age: number): number {
  return AGE_BUCKETS.findIndex((b) => age >= b.lo && age <= b.hi);
}

export const TIME_BUCKETS = [
  { key: 'morning', label: 'Before noon', test: (m: number) => m < 12 * 60 },
  { key: 'afternoon', label: 'Noon–4:59pm', test: (m: number) => m >= 12 * 60 && m < 17 * 60 },
  { key: 'evening', label: '5pm–10:29pm', test: (m: number) => m >= 17 * 60 && m < 22.5 * 60 },
  { key: 'late', label: 'After 10:30pm', test: (m: number) => m >= 22.5 * 60 },
] as const;

export const TOPIC_LABELS: Record<Topic, string> = {
  krebs: 'Krebs cycle',
  etc: 'Electron transport chain',
  glyc: 'Glycolysis & fermentation',
  'bio-other': 'Other biology',
  none: 'Not biology',
};

export const DECK_SHORT: Record<DeckId, string> = {
  bio3: 'AP Bio Unit 3',
  bio12: 'AP Bio Units 1–2',
  spvocab: 'Spanish Vocab',
  spverb: 'Spanish Verb Conjugations',
  pt: 'Periodic Table',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

export interface Rate {
  n: number;
  recall: number | null;
}

export function rate(rs: Review[]): Rate {
  if (rs.length === 0) return { n: 0, recall: null };
  const ok = rs.filter((r) => r.success).length;
  return { n: rs.length, recall: (100 * ok) / rs.length };
}

export function avg(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** How much to trust a number, in plain words. */
export function sampleNote(n: number): string {
  if (n < 30) return 'Too few reviews to say much';
  if (n < 100) return 'Few reviews, so treat as a hint';
  return 'Enough reviews to see a pattern';
}

/** Turn a gap in percentage points into a plain strength word. */
export function strengthOf(points: number | null): 'strong' | 'moderate' | 'small' | 'unknown' {
  if (points === null) return 'unknown';
  const p = Math.abs(points);
  if (p >= 10) return 'strong';
  if (p >= 4) return 'moderate';
  return 'small';
}

/* ------------------------------------------------------------------ */
/* Scope-filtered reviews                                             */
/* ------------------------------------------------------------------ */

export function scopedReviews(ds: Dataset, scope: ScopeId): Review[] {
  const decks = new Set(scopeDecks(scope));
  return ds.reviews.filter((r) => decks.has(r.deck));
}

/* ------------------------------------------------------------------ */
/* Weekly series                                                      */
/* ------------------------------------------------------------------ */

export interface WeekPoint {
  label: string;
  from: number;
  to: number;
  reviews: number;
  recall: number | null;
  ageCounts: number[];
  newShare: number | null;
  lateShare: number | null;
  sessions: number;
  newCardsAdded: number;
}

export function weeklySeries(ds: Dataset, scope: ScopeId): WeekPoint[] {
  const rs = scopedReviews(ds, scope);
  const decks = new Set(scopeDecks(scope));
  return WEEKS.map((w) => {
    const inWeek = rs.filter((r) => inRange(r, w));
    const sessions = new Map<number, boolean>();
    for (const r of inWeek) sessions.set(r.sessionId, r.lateSession);
    const lateSessions = [...sessions.values()].filter(Boolean).length;
    const ageCounts = AGE_BUCKETS.map((b) => inWeek.filter((r) => r.age >= b.lo && r.age <= b.hi).length);
    const newCount = inWeek.filter((r) => r.age < 21).length;
    const addedCards = ds.cards.filter((c) => decks.has(c.deck) && c.addDay >= w.from && c.addDay <= w.to);
    return {
      label: rangeLabel(w.from, w.to),
      from: w.from,
      to: w.to,
      reviews: inWeek.length,
      recall: rate(inWeek).recall,
      ageCounts,
      newShare: inWeek.length ? (100 * newCount) / inWeek.length : null,
      lateShare: sessions.size ? (100 * lateSessions) / sessions.size : null,
      sessions: sessions.size,
      newCardsAdded: addedCards.length,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Comparisons                                                        */
/* ------------------------------------------------------------------ */

export interface CompareRow {
  key: string;
  label: string;
  before: Rate;
  recent: Rate;
  change: number | null;
}

export function compareBy(
  rs: Review[],
  rows: { key: string; label: string; match: (r: Review) => boolean }[],
): CompareRow[] {
  return rows.map((row) => {
    const sel = rs.filter(row.match);
    const b = rate(sel.filter((r) => inRange(r, BEFORE)));
    const c = rate(sel.filter((r) => inRange(r, RECENT)));
    return {
      key: row.key,
      label: row.label,
      before: b,
      recent: c,
      change: b.recall !== null && c.recall !== null ? c.recall - b.recall : null,
    };
  });
}

export function deckRows(ds: Dataset): CompareRow[] {
  const all = ds.reviews;
  const order: DeckId[] = ['bio3', 'bio12', 'spvocab', 'spverb', 'pt'];
  return compareBy(
    all,
    order.map((d) => ({ key: d, label: DECK_SHORT[d], match: (r) => r.deck === d })),
  );
}

export function topicRows(rs: Review[]): CompareRow[] {
  const topics: Topic[] = ['krebs', 'etc', 'glyc', 'bio-other'];
  return compareBy(
    rs.filter((r) => r.topic !== 'none'),
    topics.map((t) => ({ key: t, label: TOPIC_LABELS[t], match: (r) => r.topic === t })),
  );
}

export function timeRows(rs: Review[]): CompareRow[] {
  return compareBy(
    rs,
    TIME_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      match: (r) => b.test(r.minute),
    })),
  );
}

export function ageRows(rs: Review[]): CompareRow[] {
  return compareBy(
    rs,
    AGE_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      match: (r) => r.age >= b.lo && r.age <= b.hi,
    })),
  );
}

/* ------------------------------------------------------------------ */
/* Headline: how much of the drop is the mix of cards vs the cards    */
/* ------------------------------------------------------------------ */

export interface Decomposition {
  before: number | null;
  recent: number | null;
  total: number | null;
  mixEffect: number | null;
  rateEffect: number | null;
  newShareBefore: number | null;
  newShareRecent: number | null;
  newRecallRecent: number | null;
  olderRecallBefore: number | null;
  olderRecallRecent: number | null;
}

export function decompose(rs: Review[]): Decomposition {
  const before = rs.filter((r) => inRange(r, BEFORE));
  const recent = rs.filter((r) => inRange(r, RECENT));
  const bRate = rate(before).recall;
  const cRate = rate(recent).recall;

  const shares = (xs: Review[]) => AGE_BUCKETS.map((b) => xs.filter((r) => r.age >= b.lo && r.age <= b.hi).length / Math.max(1, xs.length));
  const sB = shares(before);
  const rB = AGE_BUCKETS.map((b) => rate(before.filter((r) => r.age >= b.lo && r.age <= b.hi)));
  const rR = AGE_BUCKETS.map((b) => rate(recent.filter((r) => r.age >= b.lo && r.age <= b.hi)));

  // Counterfactual: the same card-age mix as before, but with recent recall rates.
  // The gap between recent recall and that counterfactual is the mix effect;
  // the gap between the counterfactual and the old recall is the rate effect.
  let mixEffect: number | null = null;
  let rateEffect: number | null = null;
  if (bRate !== null && cRate !== null) {
    const counterfactual = AGE_BUCKETS.reduce((acc, _, i) => {
      const rr = rR[i].recall ?? rB[i].recall;
      return acc + (rr === null ? 0 : sB[i] * rr);
    }, 0);
    mixEffect = cRate - counterfactual;
    rateEffect = counterfactual - bRate;
  }

  const newOf = (xs: Review[]) => xs.filter((r) => r.age < 21);
  const olderOf = (xs: Review[]) => xs.filter((r) => r.age >= 21);

  return {
    before: bRate,
    recent: cRate,
    total: bRate !== null && cRate !== null ? cRate - bRate : null,
    mixEffect,
    rateEffect,
    newShareBefore: before.length ? (100 * newOf(before).length) / before.length : null,
    newShareRecent: recent.length ? (100 * newOf(recent).length) / recent.length : null,
    newRecallRecent: rate(newOf(recent)).recall,
    olderRecallBefore: rate(olderOf(before)).recall,
    olderRecallRecent: rate(olderOf(recent)).recall,
  };
}

/* ------------------------------------------------------------------ */
/* Hypothesis 1: late-night studying                                  */
/* ------------------------------------------------------------------ */

export interface LateCheck {
  groups: { label: string; late: Rate; day: Rate; diff: number | null }[];
  avgDiff: number | null;
  lateNewShare: number | null;
  dayNewShare: number | null;
  lateSessionShare: number | null;
}

export function lateCheck(rs: Review[]): LateCheck {
  const recent = rs.filter((r) => inRange(r, RECENT));
  const groupDefs = [
    { label: 'Cards 3+ weeks old', match: (r: Review) => r.age >= 21 },
    { label: 'Cards under 3 weeks old', match: (r: Review) => r.age < 21 },
  ];
  const groups = groupDefs.map((g) => {
    const sel = recent.filter(g.match);
    const late = rate(sel.filter((r) => r.lateSession));
    const day = rate(sel.filter((r) => !r.lateSession));
    return {
      label: g.label,
      late,
      day,
      diff: late.recall !== null && day.recall !== null ? late.recall - day.recall : null,
    };
  });
  const diffs = groups.map((g) => g.diff).filter((d): d is number => d !== null);
  const lateRs = recent.filter((r) => r.lateSession);
  const dayRs = recent.filter((r) => !r.lateSession);
  const sessions = new Map<number, boolean>();
  for (const r of recent) sessions.set(r.sessionId, r.lateSession);
  const lateSessions = [...sessions.values()].filter(Boolean).length;
  return {
    groups,
    avgDiff: avg(diffs),
    lateNewShare: lateRs.length ? (100 * lateRs.filter((r) => r.age < 21).length) / lateRs.length : null,
    dayNewShare: dayRs.length ? (100 * dayRs.filter((r) => r.age < 21).length) / dayRs.length : null,
    lateSessionShare: sessions.size ? (100 * lateSessions) / sessions.size : null,
  };
}

export interface LateReading {
  /** True when older and newer cards point in opposite directions. */
  mixed: boolean;
  olderDiff: number | null;
  newerDiff: number | null;
}

/** Reads the late-night check per card age, so opposite results are not averaged away. */
export function lateReading(late: LateCheck): LateReading {
  const olderDiff = late.groups[0].diff;
  const newerDiff = late.groups[1].diff;
  const mixed =
    olderDiff !== null &&
    newerDiff !== null &&
    olderDiff * newerDiff < 0 &&
    Math.min(Math.abs(olderDiff), Math.abs(newerDiff)) >= 1;
  return { mixed, olderDiff, newerDiff };
}

/* ------------------------------------------------------------------ */
/* Hypothesis 2: too many new cards at once                           */
/* ------------------------------------------------------------------ */

export const BATCH_CLASSES = [
  { key: 'small', label: 'Under 10 new cards that day', lo: 0, hi: 9 },
  { key: 'medium', label: '10–24 new cards', lo: 10, hi: 24 },
  { key: 'big', label: '25 or more', lo: 25, hi: 1000 },
] as const;

export interface BatchCheck {
  classes: { key: string; label: string; rate: Rate }[];
  /** Same kind of card (Krebs or ETC), small batch vs big batch. */
  likeSmall: Rate;
  likeBig: Rate;
  likeDiff: number | null;
  daily: { day: number; added: number }[];
  bigDays: number;
}

export function batchCheck(ds: Dataset, rs: Review[]): BatchCheck {
  const recentNew = rs.filter((r) => inRange(r, RECENT) && r.deck === 'bio3' && r.age < 21);
  const classes = BATCH_CLASSES.map((c) => ({
    key: c.key,
    label: c.label,
    rate: rate(recentNew.filter((r) => r.batch >= c.lo && r.batch <= c.hi)),
  }));
  const isKE = (r: Review) => r.topic === 'krebs' || r.topic === 'etc';
  const likeSmall = rate(recentNew.filter((r) => isKE(r) && r.batch < 10));
  const likeBig = rate(recentNew.filter((r) => isKE(r) && r.batch >= 25));
  const likeDiff = likeSmall.recall !== null && likeBig.recall !== null ? likeSmall.recall - likeBig.recall : null;

  const addedPerDay = new Map<number, number>();
  for (const c of ds.cards) {
    if (c.deck !== 'bio3' || c.addDay < RECENT.from) continue;
    addedPerDay.set(c.addDay, (addedPerDay.get(c.addDay) ?? 0) + 1);
  }
  const daily = Array.from({ length: RECENT.to - RECENT.from + 1 }, (_, i) => {
    const day = RECENT.from + i;
    return { day, added: addedPerDay.get(day) ?? 0 };
  });
  return {
    classes,
    likeSmall,
    likeBig,
    likeDiff,
    daily,
    bigDays: daily.filter((d) => d.added >= 25).length,
  };
}

/* ------------------------------------------------------------------ */
/* Hypothesis 3: the new material is harder                           */
/* ------------------------------------------------------------------ */

export interface TopicCheck {
  newHard: Rate;
  newOther: Rate;
  newGap: number | null;
  olderHard: Rate;
  olderOther: Rate;
  olderGap: number | null;
  applicable: boolean;
}

export function topicCheck(rs: Review[]): TopicCheck {
  const bio = rs.filter((r) => r.deck === 'bio3' || r.deck === 'bio12');
  const hard = (r: Review) => r.topic === 'krebs' || r.topic === 'etc';
  const other = (r: Review) => r.topic === 'glyc' || r.topic === 'bio-other';
  const recent = bio.filter((r) => inRange(r, RECENT));
  const newR = recent.filter((r) => r.age < 21);
  const oldR = recent.filter((r) => r.age >= 21);
  const newHard = rate(newR.filter(hard));
  const newOther = rate(newR.filter(other));
  const olderHard = rate(oldR.filter(hard));
  const olderOther = rate(oldR.filter(other));
  const gap = (a: Rate, b: Rate) => (a.recall !== null && b.recall !== null ? b.recall - a.recall : null);
  return {
    newHard,
    newOther,
    newGap: gap(newHard, newOther),
    olderHard,
    olderOther,
    olderGap: gap(olderHard, olderOther),
    applicable: newHard.n > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Cards                                                              */
/* ------------------------------------------------------------------ */

export interface CardSummary {
  card: Card;
  total: number;
  misses: number;
  recentRate: Rate;
  avgSec: number | null;
  lastSeen: number;
}

/** Cards that have written text, ranked by misses. */
export function missedCards(ds: Dataset, reviewsByCard: Map<string, Review[]>, scope: ScopeId): CardSummary[] {
  const decks = new Set(scopeDecks(scope));
  const out: CardSummary[] = [];
  for (const card of ds.cards) {
    if (!card.front || !decks.has(card.deck)) continue;
    const rs = reviewsByCard.get(card.id) ?? [];
    if (rs.length === 0) continue;
    const misses = rs.filter((r) => r.rating === 1).length;
    out.push({
      card,
      total: rs.length,
      misses,
      recentRate: rate(rs.filter((r) => inRange(r, RECENT))),
      avgSec: avg(rs.map((r) => r.responseSec)),
      lastSeen: Math.max(...rs.map((r) => r.day)),
    });
  }
  return out
    .filter((c) => c.misses > 0)
    .sort((a, b) => b.misses - a.misses || (a.recentRate.recall ?? 0) - (b.recentRate.recall ?? 0) || (a.card.id < b.card.id ? -1 : a.card.id > b.card.id ? 1 : 0));
}

export interface CardDetail {
  reviews: Review[];
  misses: number;
  total: number;
  recentRate: Rate;
  beforeRate: Rate;
  rtHit: number | null;
  rtMiss: number | null;
  lastThree: Review[];
}

export function cardDetail(rs: Review[]): CardDetail {
  const sorted = rs.slice().sort((a, b) => a.ts - b.ts);
  const hits = sorted.filter((r) => r.success);
  const misses = sorted.filter((r) => !r.success);
  return {
    reviews: sorted,
    misses: misses.length,
    total: sorted.length,
    recentRate: rate(sorted.filter((r) => inRange(r, RECENT))),
    beforeRate: rate(sorted.filter((r) => inRange(r, BEFORE))),
    rtHit: avg(hits.map((r) => r.responseSec)),
    rtMiss: avg(misses.map((r) => r.responseSec)),
    lastThree: sorted.slice(-3),
  };
}

export function groupReviewsByCard(reviews: Review[]): Map<string, Review[]> {
  const m = new Map<string, Review[]>();
  for (const r of reviews) {
    const list = m.get(r.cardId);
    if (list) list.push(r);
    else m.set(r.cardId, [r]);
  }
  return m;
}

/* ------------------------------------------------------------------ */
/* Headline tiles                                                     */
/* ------------------------------------------------------------------ */

/** Recall on cards 3+ weeks old, per deck, before and recently (Biology decks). */
export function olderByDeck(rs: Review[]): { bio3: { before: number; recent: number } | null; bio12: { before: number; recent: number } | null } {
  const pick = (deck: DeckId) => {
    const sel = rs.filter((r) => r.deck === deck && r.age >= 21);
    const b = rate(sel.filter((r) => inRange(r, BEFORE))).recall;
    const c = rate(sel.filter((r) => inRange(r, RECENT))).recall;
    return b === null || c === null ? null : { before: b, recent: c };
  };
  return { bio3: pick('bio3'), bio12: pick('bio12') };
}

/** Share of study sessions in a window that started after 10:30pm. */
export function lateSessionShareIn(rs: Review[], w: { from: number; to: number }): number | null {
  const sessions = new Map<number, boolean>();
  for (const r of rs) if (inRange(r, w)) sessions.set(r.sessionId, r.lateSession);
  if (sessions.size === 0) return null;
  return (100 * [...sessions.values()].filter(Boolean).length) / sessions.size;
}

/** Number of cards in scope whose add day falls in the window. */
export function cardsAddedIn(ds: Dataset, scope: ScopeId, w: { from: number; to: number }): number {
  const decks = new Set(scopeDecks(scope));
  return ds.cards.filter((c) => decks.has(c.deck) && c.addDay >= w.from && c.addDay <= w.to).length;
}
