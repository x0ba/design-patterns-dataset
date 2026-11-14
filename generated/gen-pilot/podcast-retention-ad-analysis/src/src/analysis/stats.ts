import type { Episode } from '../data/generate';
import { mulberry32 } from '../data/generate';

/** Starts-weighted mean of a per-episode value. Returns null when there are no starts. */
export function wmean(eps: Episode[], f: (e: Episode) => number = (e) => e.completion): number | null {
  let sw = 0;
  let s = 0;
  for (const e of eps) {
    sw += e.starts;
    s += e.starts * f(e);
  }
  return sw > 0 ? s / sw : null;
}

export function splitByDate(eps: Episode[], split: string): { pre: Episode[]; post: Episode[] } {
  const pre: Episode[] = [];
  const post: Episode[] = [];
  for (const e of eps) (e.date < split ? pre : post).push(e);
  return { pre, post };
}

export interface ChangeEstimate {
  /** 'did' = treatment change minus comparison change; 'raw' = treatment change alone (no comparison group). */
  mode: 'did' | 'raw';
  /** Pooled episode counts for the treatment group. */
  nPre: number;
  nPost: number;
  /** Number of shows (units) that contribute to the treatment average. */
  nUnits: number;
  /** Pooled (episode-weighted) completion before and after, for the treatment group. */
  preRate: number;
  postRate: number;
  /** Pooled change: postRate minus preRate. Mixes show sizes, so shown for reference only. */
  rawChange: number;
  /** Average of each treatment show's own change (each show counts once). */
  treatChange: number;
  /** Average of each comparison show's own change, or null when there is no comparison. */
  ctrlChange: number | null;
  nCtrlPre: number;
  nCtrlPost: number;
  ctrlPre: number | null;
  ctrlPost: number | null;
  /** Point estimate: adjusted change (did) or treatChange (raw). */
  est: number;
  lo: number;
  hi: number;
  se: number;
  /** True when the 95% interval excludes zero. */
  clear: boolean;
}

/** One show, or one show within a segment: its episodes before and after the split. */
export interface Unit {
  key: string;
  pre: Episode[];
  post: Episode[];
}

const MIN_CELL = 3;

export function unitsByShow(eps: Episode[], split: string): Unit[] {
  const map = new Map<string, Unit>();
  for (const e of eps) {
    let u = map.get(e.showId);
    if (!u) {
      u = { key: e.showId, pre: [], post: [] };
      map.set(e.showId, u);
    }
    (e.date < split ? u.pre : u.post).push(e);
  }
  return [...map.values()];
}

/** Units with enough episodes on both sides to compare with themselves. */
function validUnits(units: Unit[]): Unit[] {
  return units.filter((u) => u.pre.length >= MIN_CELL && u.post.length >= MIN_CELL);
}

function resampleWmean(eps: Episode[], rnd: () => number): number {
  let sw = 0;
  let s = 0;
  const n = eps.length;
  for (let i = 0; i < n; i++) {
    const e = eps[Math.floor(rnd() * n)];
    sw += e.starts;
    s += e.starts * e.completion;
  }
  return sw > 0 ? s / sw : 0;
}

/**
 * Change in completion, compared show by show:
 *  1. Each show's own change is its starts-weighted completion after minus before.
 *  2. The treatment estimate averages those changes (each show counts once).
 *  3. The comparison estimate does the same for non-narrative shows, which kept their ad positions.
 *  4. The adjusted change is (2) minus (3). This removes show-mix effects from both sides.
 * Uncertainty: bootstrap that resamples episodes within each show and period.
 */
export function estimateChange(treat: Unit[], control: Unit[] | null = null, B = 800, seed = 11): ChangeEstimate | null {
  const T = validUnits(treat);
  if (!T.length) return null;
  const C = control ? validUnits(control) : [];
  const useDid = C.length > 0;

  const tPre = T.flatMap((u) => u.pre);
  const tPost = T.flatMap((u) => u.post);
  const preRate = wmean(tPre) as number;
  const postRate = wmean(tPost) as number;

  const unitDelta = (u: Unit) => (wmean(u.post) as number) - (wmean(u.pre) as number);
  const treatChange = T.reduce((a, u) => a + unitDelta(u), 0) / T.length;
  const cPre = C.flatMap((u) => u.pre);
  const cPost = C.flatMap((u) => u.post);
  const ctrlChange = useDid ? C.reduce((a, u) => a + unitDelta(u), 0) / C.length : null;
  const est = treatChange - (ctrlChange ?? 0);

  const rnd = mulberry32(seed);
  const draws = new Float64Array(B);
  for (let b = 0; b < B; b++) {
    let t = 0;
    for (const u of T) t += resampleWmean(u.post, rnd) - resampleWmean(u.pre, rnd);
    t /= T.length;
    let c = 0;
    if (useDid) {
      for (const u of C) c += resampleWmean(u.post, rnd) - resampleWmean(u.pre, rnd);
      c /= C.length;
    }
    draws[b] = t - c;
  }
  draws.sort();
  let mu = 0;
  for (const d of draws) mu += d;
  mu /= B;
  let v = 0;
  for (const d of draws) v += (d - mu) * (d - mu);
  const se = Math.sqrt(v / (B - 1));
  const lo = draws[Math.floor(0.025 * B)];
  const hi = draws[Math.min(B - 1, Math.floor(0.975 * B))];

  return {
    mode: useDid ? 'did' : 'raw',
    nPre: tPre.length,
    nPost: tPost.length,
    nUnits: T.length,
    preRate,
    postRate,
    rawChange: postRate - preRate,
    treatChange,
    ctrlChange,
    nCtrlPre: cPre.length,
    nCtrlPost: cPost.length,
    ctrlPre: useDid ? wmean(cPre) : null,
    ctrlPost: useDid ? wmean(cPost) : null,
    est,
    lo,
    hi,
    se,
    clear: lo > 0 || hi < 0,
  };
}

/** Starts-weighted retention at each minute m (0..maxM). Only episodes long enough to reach minute m count. */
export function retentionCurve(eps: Episode[], maxM: number, minN = 5): (number | null)[] {
  const out: (number | null)[] = [];
  for (let m = 0; m <= maxM; m++) {
    let sw = 0;
    let s = 0;
    let n = 0;
    for (const e of eps) {
      if (e.lengthMin >= m) {
        sw += e.starts;
        s += e.starts * e.retention[m];
        n++;
      }
    }
    out.push(n >= minN && sw > 0 ? s / sw : null);
  }
  return out;
}

/** Share of listeners lost at the mid-roll minute of one episode. */
export function cliffOf(e: Episode): number | null {
  if (e.midroll === null || e.midroll < 1) return null;
  return 1 - e.retention[e.midroll] / e.retention[e.midroll - 1];
}

export function meanCliff(eps: Episode[]): number | null {
  const withMid = eps.filter((e) => e.midroll !== null);
  return wmean(withMid, (e) => cliffOf(e) as number);
}

export function medianMidroll(eps: Episode[]): number | null {
  const xs = eps.map((e) => e.midroll).filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (!xs.length) return null;
  return xs[Math.floor(xs.length / 2)];
}

/** Starts-weighted completion for each calendar month (YYYY-MM). */
export function monthlyCompletion(eps: Episode[], months: string[]): { month: string; value: number | null; n: number }[] {
  return months.map((month) => {
    const sub = eps.filter((e) => e.date.startsWith(month));
    return { month, value: wmean(sub), n: sub.length };
  });
}

export function monthRange(fromYm: string, toYm: string): string[] {
  const [fy, fm] = fromYm.split('-').map(Number);
  const [ty, tm] = toYm.split('-').map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}
