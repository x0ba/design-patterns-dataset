import { AUTHORED, RESERVE } from './authored';
import {
  FIRST_DAY,
  TODAY,
  type Card,
  type Dataset,
  type Deck,
  type DeckId,
  type Rating,
  type Review,
  type Topic,
} from './types';

/* ------------------------------------------------------------------ */
/* Seeded randomness so every load shows the same history.            */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: number) {
  const rand = mulberry32(seed);
  const range = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const int = (lo: number, hi: number) => Math.floor(range(lo, hi + 1));
  const normal = () => {
    const u = Math.max(rand(), 1e-9);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { rand, range, int, normal };
}

/* ------------------------------------------------------------------ */
/* Scenario parameters.                                               */
/* ------------------------------------------------------------------ */

/** Days (offset) when the Unit 3 cards were added in batches. */
const UNIT3_ADD_COUNTS: Record<number, number> = {
  [-20]: 3, [-19]: 30, [-18]: 3, [-17]: 3, [-16]: 3, [-15]: 3, [-14]: 26,
  [-13]: 3, [-12]: 3, [-11]: 3, [-10]: 3, [-9]: 38, [-8]: 3, [-7]: 3,
  [-6]: 3, [-5]: 32, [-4]: 3, [-3]: 3, [-2]: 12, [-1]: 3, [0]: 3,
};

const DECK_TOTALS: Record<DeckId, number> = {
  bio3: 1350,
  bio12: 1200,
  spvocab: 3800,
  spverb: 2450,
  pt: 1000,
};

const DECKS: Deck[] = [
  { id: 'bio3', name: 'AP Bio Unit 3', cardCount: 412, group: 'bio' },
  { id: 'bio12', name: 'AP Bio Units 1–2', cardCount: 530, group: 'bio' },
  { id: 'spvocab', name: 'Spanish Vocab', cardCount: 860, group: 'other' },
  { id: 'spverb', name: 'Spanish Verb Conjugations', cardCount: 240, group: 'other' },
  { id: 'pt', name: 'Periodic Table', cardCount: 98, group: 'other' },
];

/** Probability that a given day includes a session after 10:30pm. */
function hasLateSession(day: number, roll: number): boolean {
  // Before the last three weeks she studied late only on a few nights.
  if (day < -20) return (day + 41) % 4 === 0 && day <= -24;
  return roll < 0.97;
}

/* ------------------------------------------------------------------ */
/* Card bank.                                                         */
/* ------------------------------------------------------------------ */

function buildCards(rng: ReturnType<typeof makeRng>): Card[] {
  const cards: Card[] = [];

  // Unit 3 add-day slots, minus the authored cards that take a slot.
  const slots: number[] = [];
  for (const [day, n] of Object.entries(UNIT3_ADD_COUNTS)) {
    for (let i = 0; i < n; i++) slots.push(Number(day));
  }
  const authoredBio3New = AUTHORED.filter((a) => a.deck === 'bio3' && a.addDay >= -20);
  for (const a of authoredBio3New) {
    const idx = slots.indexOf(a.addDay);
    if (idx === -1) throw new Error(`No add slot left for ${a.id} on day ${a.addDay}`);
    slots.splice(idx, 1);
  }
  // Remaining new slots are generic Unit 3 cards.
  const genericNewDays = slots;

  // Authored cards first.
  for (const a of AUTHORED) {
    const batch = a.deck === 'bio3' && a.addDay >= -20 ? (UNIT3_ADD_COUNTS[a.addDay] ?? 0) : 0;
    cards.push({
      id: a.id,
      deck: a.deck,
      topic: a.topic,
      addDay: a.addDay,
      batch,
      front: a.front,
      back: a.back,
      weight: a.deck === 'bio3' ? a.weight * 2 : a.weight,
      difficulty: a.difficulty,
    });
  }

  // Generic Unit 3 cards: new ones take the leftover slots.
  const pickTopic = (pKE: number, pGlyc: number): Topic => {
    const r = rng.rand();
    if (r < pKE) return rng.rand() < 0.5 ? 'krebs' : 'etc';
    if (r < pKE + pGlyc) return 'glyc';
    return 'bio-other';
  };
  for (const day of genericNewDays) {
    const batch = UNIT3_ADD_COUNTS[day];
    const pKE = batch >= 25 ? 0.7 : batch >= 10 ? 0.6 : 0.6;
    cards.push(makeGeneric('bio3', pickTopic(pKE, 0.15), day, batch, rng));
  }
  const genericOld = 412 - 34 - genericNewDays.length;
  for (let i = 0; i < genericOld; i++) {
    const day = rng.int(-130, -45);
    cards.push(makeGeneric('bio3', pickTopic(0.35, 0.2), day, 0, rng));
  }

  // Remaining decks: generic cards only.
  const generic: { deck: DeckId; count: number; from: number; to: number }[] = [
    { deck: 'bio12', count: 530 - 8, from: -260, to: -60 },
    { deck: 'spvocab', count: 860, from: -300, to: 0 },
    { deck: 'spverb', count: 240, from: -200, to: 0 },
    { deck: 'pt', count: 98, from: -150, to: 0 },
  ];
  for (const g of generic) {
    for (let i = 0; i < g.count; i++) {
      const day = rng.int(g.from, g.to);
      const topic: Topic = g.deck === 'bio12' ? 'bio-other' : 'none';
      cards.push(makeGeneric(g.deck, topic, day, 0, rng));
    }
  }

  return cards;
}

let genericCounter = 0;

function makeGeneric(
  deck: DeckId,
  topic: Topic,
  addDay: number,
  batch: number,
  rng: ReturnType<typeof makeRng>,
): Card {
  genericCounter++;
  return {
    id: `${deck}-${String(genericCounter).padStart(4, '0')}`,
    deck,
    topic,
    addDay,
    batch,
    weight: deck === 'bio3' ? 0.5 : 1,
    difficulty: rng.normal() * 0.03,
  };
}

/* ------------------------------------------------------------------ */
/* Outcome model.                                                     */
/* ------------------------------------------------------------------ */

const TOPIC_BASE: Record<Topic, number> = {
  krebs: -0.16,
  etc: -0.2,
  glyc: -0.03,
  'bio-other': 0,
  none: 0,
};

function ageBase(age: number): number {
  if (age < 7) return 0.68;
  if (age < 21) return 0.84;
  if (age < 56) return 0.88;
  return 0.9;
}

function ageTopicMult(age: number): number {
  if (age < 7) return 1;
  if (age < 21) return 0.6;
  if (age < 56) return 0.2;
  return 0.15;
}

function pCorrect(card: Card, age: number, late: boolean): number {
  let p = ageBase(age);
  p += TOPIC_BASE[card.topic] * ageTopicMult(age);
  if (card.deck === 'bio3' && age < 21) {
    if (card.batch >= 25) p -= 0.14;
    else if (card.batch >= 10) p -= 0.04;
  }
  if (late) p -= 0.03;
  if (card.deck === 'spverb') p -= 0.03;
  if (card.deck === 'pt') p += 0.02;
  p += card.difficulty;
  return Math.min(0.97, Math.max(0.08, p));
}

function nextInterval(prev: number, rating: Rating): number {
  switch (rating) {
    case 1:
      return 1;
    case 2:
      return prev > 0 ? Math.max(1, Math.round(prev * 1.2)) : 1;
    case 3:
      return prev > 0 ? Math.round(prev * 2.2) : 1;
    case 4:
      return prev > 0 ? Math.round(prev * 3.2) : 4;
  }
}

/* ------------------------------------------------------------------ */
/* Simulation.                                                        */
/* ------------------------------------------------------------------ */

function ageWeight(age: number): number {
  if (age < 7) return 2.5;
  if (age < 21) return 1.4;
  return 1;
}

function sampleDeck(
  cards: Card[],
  day: number,
  n: number,
  rng: ReturnType<typeof makeRng>,
): Card[] {
  const candidates = cards.filter((c) => c.addDay <= day);
  const cumulative: number[] = [];
  let total = 0;
  for (const c of candidates) {
    total += c.weight * ageWeight(day - c.addDay);
    cumulative.push(total);
  }
  const picked = new Set<Card>();
  const out: Card[] = [];
  let guard = 0;
  while (out.length < n && guard < n * 50) {
    guard++;
    const u = rng.rand() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    const card = candidates[lo];
    if (!picked.has(card)) {
      picked.add(card);
      out.push(card);
    }
  }
  return out;
}

function dayTimestamp(day: number, minute: number): number {
  const d = new Date(2026, 10, 16 + day, 0, 0, 0, 0);
  return d.getTime() + minute * 60000;
}

export function generateDataset(seed = 68): Dataset {
  const rng = makeRng(seed);
  const cards = buildCards(rng);
  const cardsByDeck: Record<DeckId, Card[]> = {
    bio3: [],
    bio12: [],
    spvocab: [],
    spverb: [],
    pt: [],
  };
  for (const c of cards) cardsByDeck[c.deck].push(c);

  // Interval state per card, seeded for cards that existed before the window.
  const interval = new Map<string, number>();
  const lapses = new Map<string, number>();
  for (const c of cards) {
    interval.set(c.id, c.addDay < -21 ? rng.int(4, 30) : 0);
    lapses.set(c.id, 0);
  }

  const reviews: Review[] = [];
  let sessionCounter = 0;

  for (let day = FIRST_DAY; day <= TODAY; day++) {
    // Daily review pool, per deck.
    const pending: { card: Card; deck: DeckId }[] = [];
    for (const deck of DECKS) {
      const target = dailyTarget(deck.id, day);
      for (const card of sampleDeck(cardsByDeck[deck.id], day, target, rng)) {
        pending.push({ card, deck: deck.id });
      }
    }

    // Split into sessions. A late session exists on some days.
    const hasLate = hasLateSession(day, rng.rand());
    const dayCount = rng.rand() < 0.5 ? 1 : 2;
    const sessions: { late: boolean; items: { card: Card; deck: DeckId }[] }[] = [];
    const late = { late: true, items: [] as { card: Card; deck: DeckId }[] };
    const daySessions = Array.from({ length: dayCount }, () => ({
      late: false,
      items: [] as { card: Card; deck: DeckId }[],
    }));
    for (const p of pending) {
      const age = day - p.card.addDay;
      if (hasLate && rng.rand() < (age < 21 ? 0.6 : 0.2)) {
        late.items.push(p);
      } else {
        daySessions[Math.floor(rng.rand() * dayCount)].items.push(p);
      }
    }
    if (late.items.length) sessions.push(late);
    for (const s of daySessions) if (s.items.length) sessions.push(s);

    // Place each session on the clock, then answer its cards in order.
    for (const s of sessions) {
      const id = ++sessionCounter;
      let minute: number;
      if (s.late) {
        minute = rng.range(22 * 60 + 35, 23 * 60 + 15);
      } else {
        minute = rng.range(7 * 60, 20 * 60);
      }
      // Fisher–Yates shuffle: a comparator-based sort would consume the random
      // stream differently in each JavaScript engine.
      const order = s.items.slice();
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng.rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      for (const item of order) {
        const card = item.card;
        const age = day - card.addDay;
        const p = pCorrect(card, age, s.late);
        const success = rng.rand() < p;
        let rating: Rating;
        if (!success) {
          rating = 1;
        } else {
          const pHard = age < 21 ? 0.28 : 0.14;
          const pEasy = age < 21 ? 0.1 : 0.22;
          const u = rng.rand();
          rating = u < pHard ? 2 : u < pHard + pEasy ? 4 : 3;
        }
        const medianRt = (age < 21 ? 6.5 : 4.5) * (success ? 1 : 2.3) * (s.late ? 1.1 : 1);
        const responseSec = Math.min(60, Math.max(1.5, medianRt * Math.exp(0.35 * rng.normal())));

        const prev = interval.get(card.id) ?? 0;
        const next = Math.min(365, nextInterval(prev, rating));
        interval.set(card.id, next);
        if (rating === 1) lapses.set(card.id, (lapses.get(card.id) ?? 0) + 1);

        const ts = dayTimestamp(day, Math.min(minute, 23 * 60 + 58));
        reviews.push({
          cardId: card.id,
          deck: card.deck,
          topic: card.topic,
          day,
          ts,
          minute: Math.min(minute, 1439),
          rating,
          success,
          responseSec: Math.round(responseSec * 10) / 10,
          age,
          intervalDays: next,
          sessionId: id,
          lateSession: s.late,
          batch: card.batch,
        });

        minute += responseSec / 60 + rng.range(0.1, 0.4);
      }
    }
  }

  reviews.sort((a, b) => a.ts - b.ts);
  assignReserveText(cards, reviews);
  const cardById = new Map(cards.map((c) => [c.id, c]));
  return {
    decks: Object.fromEntries(DECKS.map((d) => [d.id, d])) as Record<DeckId, Deck>,
    cards,
    cardById,
    reviews,
    sessionCount: sessionCounter,
  };
}

/**
 * Give written-out text to any generated Biology card that lands in the
 * top 25 most-missed list, so the app never shows a card without content.
 */
function assignReserveText(cards: Card[], reviews: Review[]) {
  const misses = new Map<string, number>();
  for (const r of reviews) {
    if (r.deck !== 'bio3' && r.deck !== 'bio12') continue;
    if (r.rating === 1) misses.set(r.cardId, (misses.get(r.cardId) ?? 0) + 1);
  }
  const top = [...misses.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 25)
    .map(([id]) => id);
  const pool = RESERVE.map((r) => ({ ...r, used: false }));
  for (const id of top) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.front) continue;
    const match = pool.find((p) => !p.used && p.topic === card.topic);
    if (!match) throw new Error(`No reserve text left for topic ${card.topic}`);
    match.used = true;
    card.front = match.front;
    card.back = match.back;
  }
}

function dailyTarget(deck: DeckId, day: number): number {
  const total = DECK_TOTALS[deck];
  if (deck === 'bio3') {
    if (day <= -21) return 14;
    return day <= -15 ? 51 : 50;
  }
  const days = TODAY - FIRST_DAY + 1; // 42
  const base = Math.floor(total / days);
  const extra = total - base * days;
  const index = day - FIRST_DAY;
  return base + (index < extra ? 1 : 0);
}
