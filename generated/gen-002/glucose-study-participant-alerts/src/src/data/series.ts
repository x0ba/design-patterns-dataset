import { DAY, GRID_START, MIN, NOW, SAMPLE, hourOf, pt } from '../lib/time';
import { gauss, hashString, mulberry32 } from '../lib/rng';
import { ROSTER, type Participant } from './roster';

// Mock CGM, activity and meal streams on a 5-minute grid starting at enrollment.
// Each participant's stream is generated from a fixed seed, so the cohort is the
// same on every load. Specific moments that the scenario depends on are pinned
// with explicit overrides below.

export type MealKind = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';

export interface Meal {
  id: string;
  pid: string;
  at: number;
  kind: MealKind;
  text: string;
  photo: boolean;
  amp: number; // mock glycemic excursion, mg/dL above baseline at peak
  hue: number; // colour seed for the photo thumbnail
}

export interface Night {
  start: number; // self-recorded sleep window
  end: number;
}

export interface Series {
  pid: string;
  glucose: (number | null)[]; // index i covers GRID_START + i * SAMPLE; null = no data
  steps: number[]; // steps per 5-minute bucket, same grid
  meals: Meal[];
  nights: Night[];
}

export const GRID_N = Math.floor((NOW - GRID_START) / SAMPLE) + 1;

export function tAt(i: number): number {
  return GRID_START + i * SAMPLE;
}

/** Grid index whose bucket starts at or before t. */
function idxFloor(t: number): number {
  return Math.floor((t - GRID_START) / SAMPLE);
}

const DATES = [
  '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11',
  '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16',
];
const DATES_PLUS = [...DATES, '2026-11-17'];

const MENU: Record<MealKind, string[]> = {
  Breakfast: [
    'Oats with berries and walnuts',
    'Greek yogurt, granola, banana',
    'Egg scramble and whole-grain toast',
    'Overnight oats with chia',
    'Toast with peanut butter, coffee',
  ],
  Lunch: [
    'Chicken, quinoa, roasted vegetables',
    'Turkey wrap, apple, carrot sticks',
    'Lentil soup and side salad',
    'Salmon bowl, brown rice, broccoli',
    'Rice bowl with tofu and kimchi',
    'Black bean burrito bowl',
  ],
  Snack: ['Almonds and a clementine', 'Hummus and cucumber', 'Cheese and whole-grain crackers'],
  Dinner: [
    'Pasta with tomato sauce and side salad',
    'Beef and pepper stir-fry',
    'Baked cod, potatoes, green beans',
    'Two slices of pizza and green salad',
    'Ramen with a soft-boiled egg',
    'Chili with cornbread',
    'Lentil soup and whole-grain bread',
  ],
};

/** Dinner entries pinned on the evening before the snapshot (Mon 16 Nov). */
const LAST_DINNER: Record<string, { hhmm: string; photo: boolean; text: string }> = {
  'P-322': { hhmm: '18:47', photo: true, text: 'Lentil soup and whole-grain bread' },
  'P-317': { hhmm: '18:20', photo: true, text: 'Chicken, quinoa, roasted vegetables' },
  'P-320': { hhmm: '21:20', photo: false, text: 'Beef and pepper stir-fry' },
};

/** Pinned sleep windows for the last night (Mon 16 → Tue 17 Nov). */
const LAST_NIGHT: Record<string, [string, string]> = {
  'P-322': ['23:10', '06:30'],
  'P-317': ['22:50', '06:20'],
};

/** Pinned glucose readings that carry the scenario. */
const OVERRIDES: Record<string, [string, string, number][]> = {
  // Overnight single-reading dip, 03:09–03:29 Tue
  'P-322': [
    ['2026-11-17', '03:09', 71],
    ['2026-11-17', '03:14', 52],
    ['2026-11-17', '03:19', 68],
    ['2026-11-17', '03:24', 74],
    ['2026-11-17', '03:29', 78],
  ],
  // Earlier afternoon single-reading dip that was closed as an artifact
  'P-313': [
    ['2026-11-16', '16:59', 88],
    ['2026-11-16', '17:04', 53],
    ['2026-11-16', '17:09', 66],
    ['2026-11-16', '17:14', 75],
  ],
};

/** Periods with no CGM data (signal drops). Ends are exclusive. */
const GAPS: Record<string, [number, number][]> = {
  'P-306': [
    [pt('2026-11-16', '21:10'), pt('2026-11-16', '21:22')],
    [pt('2026-11-16', '21:45'), pt('2026-11-16', '21:55')],
    [pt('2026-11-16', '22:20'), pt('2026-11-16', '22:34')],
  ],
  'P-317': [
    [pt('2026-11-12', '14:05'), pt('2026-11-12', '14:25')],
    [pt('2026-11-14', '10:10'), pt('2026-11-14', '10:30')],
  ],
};

function hm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function buildMeals(p: Participant, rand: () => number): Meal[] {
  const out: Meal[] = [];
  const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const push = (kind: MealKind, date: string, time: string, text: string, photo: boolean, amp: number) => {
    out.push({
      id: `${p.id}-M${String(out.length + 1).padStart(3, '0')}`,
      pid: p.id,
      at: pt(date, time),
      kind,
      text,
      photo,
      amp,
      hue: Math.floor(rand() * 360),
    });
  };
  const pick = (xs: string[]) => xs[Math.floor(rand() * xs.length)];

  for (const date of DATES) {
    const breakfast = hm(between(420, 540));
    const lunch = hm(between(720, 800));
    push('Breakfast', date, breakfast, pick(MENU.Breakfast), rand() > 0.1, 25 + rand() * 30);
    if (rand() < 0.4) {
      push('Snack', date, hm(between(900, 960)), pick(MENU.Snack), rand() > 0.2, 8 + rand() * 6);
    }
    push('Lunch', date, lunch, pick(MENU.Lunch), rand() > 0.1, 35 + rand() * 45);

    const pinned = date === '2026-11-16' ? LAST_DINNER[p.id] : undefined;
    if (pinned) {
      push('Dinner', date, pinned.hhmm, pinned.text, pinned.photo, 30 + rand() * 30);
    } else {
      push('Dinner', date, hm(between(1080, 1180)), pick(MENU.Dinner), rand() > 0.1, 35 + rand() * 50);
    }
  }
  return out;
}

function buildNights(p: Participant, rand: () => number): Night[] {
  const out: Night[] = [];
  for (let k = 0; k < DATES.length; k++) {
    const start = pt(DATES[k], '22:30') + Math.floor(rand() * 60) * MIN;
    const end = pt(DATES_PLUS[k + 1], '06:00') + Math.floor(rand() * 60) * MIN;
    out.push({ start, end });
  }
  const last = LAST_NIGHT[p.id];
  if (last) {
    out[out.length - 1] = { start: pt('2026-11-16', last[0]), end: pt('2026-11-17', last[1]) };
  }
  return out;
}

function buildSeries(p: Participant): Series {
  const rand = mulberry32(hashString(p.id));
  const meals = buildMeals(p, rand);
  const nights = buildNights(p, rand);
  const glucose: (number | null)[] = new Array(GRID_N).fill(null);
  const steps: number[] = new Array(GRID_N).fill(0);
  const gaps = GAPS[p.id] ?? [];
  const injuredAt = p.injuredOn ? pt(p.injuredOn, '00:00') : Infinity;
  let noise = 0;

  for (let i = 0; i < GRID_N; i++) {
    const t = tAt(i);
    const asleep = nights.some((n) => t >= n.start && t < n.end);
    if (!asleep) {
      const injury = t >= injuredAt ? 0.35 : 1;
      steps[i] = Math.round(p.activity * injury * rand() * 88);
    }
    if (t < p.insertedMs || t > p.lastReadingMs) continue;
    if (gaps.some(([a, b]) => t >= a && t < b)) {
      noise = 0;
      continue;
    }
    noise = 0.6 * noise + gauss(rand) * 1.1;
    const h = hourOf(t);
    const circadian = -3 * Math.cos((2 * Math.PI * (h - 3)) / 24);
    let excursion = 0;
    for (const m of meals) {
      const dt = (t - m.at) / MIN;
      if (dt >= 0 && dt < 240) {
        const x = dt / 45;
        excursion += m.amp * x * Math.exp(1 - x);
      }
    }
    glucose[i] = Math.max(62, Math.round(p.baseline + circadian + excursion + noise));
  }

  for (const [date, time, value] of OVERRIDES[p.id] ?? []) {
    glucose[idxFloor(pt(date, time))] = value;
  }

  return { pid: p.id, glucose, steps, meals, nights };
}

export const SERIES: Record<string, Series> = Object.fromEntries(
  ROSTER.map((p) => [p.id, buildSeries(p)]),
);

/** Non-null glucose readings with start time in [from, to). */
export function glucoseSamples(pid: string, from: number, to: number): { t: number; v: number }[] {
  const s = SERIES[pid];
  const out: { t: number; v: number }[] = [];
  const lo = Math.max(0, idxFloor(from));
  const hi = Math.min(GRID_N - 1, idxFloor(to - 1));
  for (let i = lo; i <= hi; i++) {
    const v = s.glucose[i];
    const t = tAt(i);
    if (v !== null && t >= from && t < to) out.push({ t, v });
  }
  return out;
}

/** Steps in buckets starting within [from, to). */
export function stepsBetween(pid: string, from: number, to: number): number {
  const s = SERIES[pid];
  const lo = Math.max(0, idxFloor(from));
  const hi = Math.min(GRID_N - 1, idxFloor(to - 1));
  let sum = 0;
  for (let i = lo; i <= hi; i++) {
    if (tAt(i) >= from && tAt(i) < to) sum += s.steps[i];
  }
  return sum;
}

/** Lowest reading in [from, to), or null if there is none. */
export function minGlucose(pid: string, from: number, to: number): { t: number; v: number } | null {
  let best: { t: number; v: number } | null = null;
  for (const smp of glucoseSamples(pid, from, to)) {
    if (!best || smp.v < best.v) best = smp;
  }
  return best;
}

/** Longest run of consecutive readings below a threshold, in readings. */
export function longestRunBelow(pid: string, threshold: number, from: number, to: number): number {
  let best = 0;
  let run = 0;
  const s = SERIES[pid];
  const lo = Math.max(0, idxFloor(from));
  const hi = Math.min(GRID_N - 1, idxFloor(to - 1));
  for (let i = lo; i <= hi; i++) {
    const v = s.glucose[i];
    if (v !== null && v < threshold) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

/** Steps for each Pacific calendar day in the study so far (Nov 9 → Nov 16 plus today). */
export function dailySteps(pid: string, days: string[]): { day: string; steps: number }[] {
  return days.map((d) => {
    const from = pt(d, '00:00');
    return { day: d, steps: stepsBetween(pid, from, from + DAY) };
  });
}

export function meals(pid: string): Meal[] {
  return SERIES[pid].meals;
}

export function nightsOf(pid: string): Night[] {
  return SERIES[pid].nights;
}

/** Reading in the 5-minute bucket containing t, or null. */
export function valueAt(pid: string, t: number): number | null {
  const i = idxFloor(t);
  if (i < 0 || i >= GRID_N) return null;
  return SERIES[pid].glucose[i];
}

/**
 * Stretches of missing readings between from and to, at least minReadings long.
 * Ranges run from the first missing bucket to the next bucket that has data.
 */
export function gapRuns(pid: string, minReadings: number, from: number, to: number): [number, number][] {
  const s = SERIES[pid];
  const out: [number, number][] = [];
  const lo = Math.max(0, idxFloor(from));
  const hi = Math.min(GRID_N - 1, idxFloor(to - 1));
  let start = -1;
  for (let i = lo; i <= hi + 1; i++) {
    const missing = i <= hi && s.glucose[i] === null;
    if (missing && start < 0) start = i;
    if (!missing && start >= 0) {
      if (i - start >= minReadings) out.push([tAt(start), tAt(i)]);
      start = -1;
    }
  }
  return out;
}
