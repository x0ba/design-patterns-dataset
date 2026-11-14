import { PLATFORMS, SHOWS, type Format, type Platform, type ShowDef } from './shows';

/**
 * Synthetic listening data for the demo. Deterministic: the same seed always
 * produces the same 1,186 episodes, so every reload shows identical numbers.
 *
 * Each episode carries a per-minute retention curve (share of starting listeners
 * still listening at minute m). Completion is the value at the final minute.
 * Changes after the ad move are built into the curves as a larger cliff at the
 * new mid-roll minute, so per-minute charts and headline numbers agree.
 */

export const MOVE_ISO = '2026-08-04';
const DAY = 86_400_000;
const T_START = Date.UTC(2025, 0, 1);
const T_MOVE = Date.UTC(2026, 7, 4);
const T_END = Date.UTC(2026, 10, 13);

export interface ProductionNote {
  showId: string;
  date: string;
  text: string;
  /** Completion penalty applied to the episode (fraction). */
  penalty: number;
  /** Multiplier on starts, for episodes whose first day was disrupted. */
  startsFactor?: number;
}

export const PRODUCTION_NOTES: ProductionNote[] = [
  { showId: 'the-salt-road', date: '2026-03-18', text: 'Host illness; guest host read the mid-roll.', penalty: 0.06 },
  { showId: 'cold-harbor', date: '2025-11-04', text: 'Guest host for two segments.', penalty: 0.04 },
  { showId: 'lantern-street', date: '2026-09-03', text: 'Released during platform outage on 3 Sept; first-day listens delayed.', penalty: 0.04, startsFactor: 0.75 },
  { showId: 'the-salt-road', date: '2026-10-14', text: 'Host illness; guest host.', penalty: 0.08 },
  { showId: 'cold-harbor', date: '2026-10-28', text: 'Audio fault in act two; re-cut and re-published.', penalty: 0.03 },
  { showId: 'hollow-verdict', date: '2026-08-26', text: 'Feed delayed two days; promotion missed.', penalty: 0.02 },
  { showId: 'long-table', date: '2026-07-30', text: 'Host illness; guest host.', penalty: 0.05 },
  { showId: 'the-unhurried-hour', date: '2026-09-03', text: 'Released during platform outage on 3 Sept.', penalty: 0.04, startsFactor: 0.75 },
  { showId: 'common-ground', date: '2025-12-02', text: 'Guest host.', penalty: 0.05 },
];

const GUESTS = [
  'Tomasz Wren', 'Ayesha Bellamy', 'Marcus Ide', 'Lena Haverkamp', 'Priya Konda',
  'Diego Rosales', 'Hana Ostrowski', 'Owen Marr', 'Ngozi Adeyemi', 'Felix Tamm',
  'Sunita Rao', 'Ruth Calloway', 'Mateo Quintal', 'Irene Vashti', 'June Akerlund',
];

export interface Episode {
  id: string;
  showId: string;
  seq: number;
  /** ISO date (YYYY-MM-DD, UTC). */
  date: string;
  title: string;
  guest: string | null;
  lengthMin: number;
  downloads: number;
  starts: number;
  /** Share of starters still listening in the final minute (0–1). */
  completion: number;
  /** Mean share of starters listening across the episode (0–1). */
  listenThrough: number;
  /** Mid-roll minute, or null when the show has no mid-roll. */
  midroll: number | null;
  adBreaks: number;
  shares: Record<Platform, number>;
  majorityPlatform: Platform;
  note: string | null;
  /** retention[m] for m = 0..lengthMin, as fractions. */
  retention: Float32Array;
}

export interface Dataset {
  shows: ShowDef[];
  episodes: Episode[];
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

interface Slot {
  t: number;
  post: boolean;
  note: ProductionNote | null;
}

function sampleDays(rand: () => number, from: number, to: number, n: number, weekdaysOnly: boolean): number[] {
  const cands: number[] = [];
  for (let t = from; t <= to; t += DAY) {
    const dow = new Date(t).getUTCDay();
    if (weekdaysOnly && (dow === 0 || dow === 6)) continue;
    cands.push(t);
  }
  const k = Math.min(n, cands.length);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rand() * (cands.length - i));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  return cands.slice(0, k).sort((a, b) => a - b);
}

function buildCurve(
  L: number,
  early: number,
  beta: number,
  mid: number | null,
  cliff: number,
  postHaz: number,
  gauss: () => number,
): Float32Array {
  const r = new Float32Array(L + 1);
  r[0] = 1;
  for (let m = 1; m <= L; m++) {
    const h = clamp(m === 1 ? early : beta * Math.exp(0.06 * gauss()), 0, 0.5);
    let v = r[m - 1] * (1 - h);
    if (mid !== null) {
      if (m === mid) v *= 1 - cliff;
      else if (m > mid) v *= 1 - postHaz;
    }
    r[m] = Math.min(v, r[m - 1]);
  }
  return r;
}

export function generateDataset(): Dataset {
  const rand = mulberry32(20260804);
  const gauss = () => {
    let u = 0;
    while (u === 0) u = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];

  const episodes: Episode[] = [];

  for (const show of SHOWS) {
    const narr = show.format === 'Narrative';
    let nPre: number;
    let nPost: number;
    if (narr) {
      [nPre, nPost] = show.episodes;
    } else {
      nPost = Math.round(show.episodes[0] * 0.14);
      nPre = show.episodes[0] - nPost;
    }
    const weekdays = !narr;
    const slots: Slot[] = [
      ...sampleDays(rand, T_START, T_MOVE - DAY, nPre, weekdays).map((t) => ({ t, post: false, note: null })),
      ...sampleDays(rand, T_MOVE, T_END, nPost, weekdays).map((t) => ({ t, post: true, note: null })),
    ];

    // Attach production notes to the nearest episode in the same period, on the note's date.
    for (const note of PRODUCTION_NOTES.filter((n) => n.showId === show.id)) {
      const target = Date.parse(`${note.date}T00:00:00Z`);
      const isPost = target >= T_MOVE;
      let best = -1;
      slots.forEach((s, i) => {
        if (s.post !== isPost) return;
        if (best < 0 || Math.abs(s.t - target) < Math.abs(slots[best].t - target)) best = i;
      });
      if (best >= 0) {
        slots[best].t = target;
        slots[best].note = note;
      }
    }
    slots.sort((a, b) => a.t - b.t);

    const hasMid = show.midroll !== null;
    const E = show.earlyDrop;
    const A0 = hasMid ? show.cliff : 0;
    const L0 = show.lengthMean;
    // Show-level baseline hazard, solved so that an average-length episode lands near its pre-change completion.
    const beta = 1 - Math.pow(show.completion / ((1 - E) * (1 - A0)), 1 / (L0 - 1));

    slots.forEach((slot, idx) => {
      const post = slot.post;
      const L = Math.round(clamp(L0 + show.lengthSd * gauss(), show.lengthMin, 92));

      let mid: number | null = null;
      if (hasMid) {
        const base = post && show.midrollAfter !== null ? show.midrollAfter : (show.midroll as number);
        mid = clamp(base + Math.round(1.2 * gauss()), 8, L - 8);
      }

      const raw = show.mix.map((m) => Math.max(0.02, m + 0.03 * gauss()));
      const tot = raw.reduce((a, b) => a + b, 0);
      const sh = raw.map((x) => x / tot);
      const shares = {
        Apple: sh[0],
        Spotify: sh[1],
        'Network app': sh[2],
        Other: sh[3],
      } as Record<Platform, number>;
      const majorityPlatform = PLATFORMS[sh.indexOf(Math.max(...sh))];

      const pen = slot.note ? slot.note.penalty : 0;
      const modelNoCliff = (1 - E) * Math.pow(1 - beta, L - 1);
      let cliff = 0;
      let postHaz = 0;
      let betaUse = beta;
      let target: number;

      if (hasMid && mid !== null) {
        let shift = 0;
        if (post && narr) {
          // The move's effect, plus two modifiers: Spotify-heavy episodes and episodes over 55 minutes lose a bit more.
          shift = show.effect - 0.15 * (sh[1] - 0.3) - 0.0015 * Math.max(0, L - 55);
        }
        target = clamp(modelNoCliff * (1 - A0) + shift - pen + 0.018 * gauss(), 0.15, 0.95);
        // Split the excess loss between the cliff at the mid-roll (half) and extra attrition after it (half).
        const X = Math.log(target / modelNoCliff) - Math.log(1 - A0);
        cliff = clamp(1 - (1 - A0) * Math.exp(0.5 * X), 0, 0.6);
        postHaz = clamp(1 - Math.exp((0.5 * X) / Math.max(1, L - mid)), 0, 0.2);
      } else {
        target = clamp(modelNoCliff - pen + 0.018 * gauss(), 0.1, 0.95);
        betaUse = clamp(1 - Math.pow(target / (1 - E), 1 / (L - 1)), 0.0005, 0.08);
      }

      const retention = buildCurve(L, E, betaUse, mid, cliff, postHaz, gauss);
      const completion = retention[L];
      let sum = 0;
      for (let m = 0; m <= L; m++) sum += retention[m];

      const downloads = Math.round(clamp(show.downloads * Math.exp(show.downloadsSd * gauss()), 3200, 410000));
      const startsFactor = slot.note?.startsFactor ?? 1;
      const starts = Math.round(downloads * show.startRate * Math.exp(0.02 * gauss()) * startsFactor);

      const adBreaks = hasMid
        ? clamp(Math.round(L / 25 + 0.4 * gauss()), 1, 4)
        : rand() < 0.3 ? 2 : 1;

      const pool = show.titles;
      const title = narr
        ? `${pick(pool[0])} ${pick(pool[1])}`
        : pick(pool[0]);
      const guest = show.format === 'Interview' ? pick(GUESTS) : null;

      episodes.push({
        id: `${show.id}-${String(idx + 1).padStart(3, '0')}`,
        showId: show.id,
        seq: idx + 1,
        date: iso(slot.t),
        title: guest ? `${title} with ${guest}` : title,
        guest,
        lengthMin: L,
        downloads,
        starts,
        completion,
        listenThrough: sum / (L + 1),
        midroll: mid,
        adBreaks,
        shares,
        majorityPlatform,
        note: slot.note?.text ?? null,
        retention,
      });
    });
  }

  episodes.sort((a, b) => (a.date === b.date ? a.showId.localeCompare(b.showId) : a.date.localeCompare(b.date)));
  return { shows: SHOWS, episodes };
}

export const FORMAT_OF: Record<string, Format> = Object.fromEntries(SHOWS.map((s) => [s.id, s.format]));
