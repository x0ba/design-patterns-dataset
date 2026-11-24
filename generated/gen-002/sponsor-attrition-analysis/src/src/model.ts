import {
  ACTIVE_TOTAL, BASELINE_MONTHS, DIMS, DIM_KEYS, DimKey, GROUPS, Group, MONTHS, M_OCT26, M_SEP26, POP, R, REASONS, REC,
  WAVE_SEND, dayNum,
} from './data';

export type Filters = Record<DimKey, number[]> & { reason: number | null };
export type Attribution = 'stated' | 'payment';
export type BaselineMode = 'pre' | 'yoy';

export const EMPTY_FILTERS: Filters = { t: [], c: [], p: [], a: [], g: [], k: [], w: [], reason: null };

export interface Settings { filters: Filters; attribution: Attribution; baseline: BaselineMode }

export const GI: Record<Group, number> = { deliberate: 0, payment: 1, program: 2 };
const REASON_G = REASONS.map((r) => GI[r.group]);

type Arrs = Record<DimKey, Uint8Array>;
function makePass(f: Filters, except?: DimKey) {
  const checks: { arrKey: DimKey; ok: Uint8Array }[] = [];
  for (const d of DIMS) {
    if (d.key === except) continue;
    const sel = f[d.key];
    if (!sel.length) continue;
    const ok = new Uint8Array(d.values.length);
    sel.forEach((v) => (ok[v] = 1));
    checks.push({ arrKey: d.key, ok });
  }
  return (arrs: Arrs, i: number) => {
    for (let j = 0; j < checks.length; j++) if (!checks[j].ok[arrs[checks[j].arrKey][i]]) return false;
    return true;
  };
}

export function recGroup(i: number, attribution: Attribution) {
  const g = REASON_G[REC.r[i]];
  if (attribution === 'payment' && g === 0 && REC.f[i]) return 1;
  return g;
}

export function expectedOf(series: number[], m: number, mode: BaselineMode) {
  if (mode === 'yoy') return series[m - 12] ?? 0;
  let s = 0;
  for (const b of BASELINE_MONTHS) s += series[b];
  return s / BASELINE_MONTHS.length;
}
export const baselineLabel = (mode: BaselineMode) =>
  mode === 'pre' ? 'monthly average, Jan 2025–Jul 2026' : 'same months last year (Sep–Oct 2025)';
export const baselineShort = (mode: BaselineMode) => (mode === 'pre' ? 'pre-change avg' : 'Sep–Oct 2025');

export function activeBase(f: Filters, except?: DimKey) {
  const pass = makePass(f, except);
  let n = 0;
  for (let i = 0; i < POP.n; i++) if (pass(POP as unknown as Arrs, i)) n++;
  return n;
}

// ---------- overview ----------
export interface Overview {
  active: number;
  mg: number[][]; // [month][group]
  mr: number[][]; // [reason][month]
  reassigned: number[]; // per month: deliberate→payment moves (attribution = payment)
  overlap: number[]; // per month: failed-charge sponsors who gave a deliberate reason
  overlapByReason: number[];
  total: number[];
  expMonthly: number[]; // expected total per month (for chart line)
  expG: (g: number, m: number) => number;
  expR: (r: number, m: number) => number;
  excessG: number[]; // Sep+Oct excess per group
  excessR: number[];
  excessTotal: number;
}

export function overview(s: Settings): Overview {
  const { filters: f, attribution, baseline } = s;
  const pass = makePass(f);
  const nM = MONTHS.length;
  const mg = Array.from({ length: nM }, () => [0, 0, 0]);
  const mr = REASONS.map(() => new Array(nM).fill(0));
  const reassigned = new Array(nM).fill(0);
  const overlap = new Array(nM).fill(0);
  const overlapByReason = new Array(REASONS.length).fill(0);
  for (let i = 0; i < REC.n; i++) {
    if (f.reason !== null && REC.r[i] !== f.reason) continue;
    if (!pass(REC as unknown as Arrs, i)) continue;
    const m = REC.m[i];
    const g = recGroup(i, attribution);
    mg[m][g]++;
    mr[REC.r[i]][m]++;
    if (REASON_G[REC.r[i]] === 0 && REC.f[i]) { overlap[m]++; overlapByReason[REC.r[i]]++; if (g === 1) reassigned[m]++; }
  }
  const total = mg.map((x) => x[0] + x[1] + x[2]);
  const gSeries = [0, 1, 2].map((g) => mg.map((x) => x[g]));
  const expG = (g: number, m: number) => expectedOf(gSeries[g], m, baseline);
  const expR = (r: number, m: number) => expectedOf(mr[r], m, baseline);
  const expMonthly = MONTHS.map((_, m) => (baseline === 'pre' ? expectedOf(total, m, 'pre') : m >= 12 ? total[m - 12] : NaN));
  const ex = (series: number[], e: (m: number) => number) => series[M_SEP26] - e(M_SEP26) + series[M_OCT26] - e(M_OCT26);
  const excessG = [0, 1, 2].map((g) => ex(gSeries[g], (m) => expG(g, m)));
  const excessR = REASONS.map((_, r) => ex(mr[r], (m) => expR(r, m)));
  return {
    active: activeBase(f), mg, mr, reassigned, overlap, overlapByReason, total, expMonthly, expG, expR, excessG, excessR,
    excessTotal: excessG[0] + excessG[1] + excessG[2],
  };
}

// ---------- segments ----------
export interface SegmentRow {
  idx: number; label: string; active: number; selected: boolean;
  monthly: number[][]; // [month][group]
  baseRate: number; nowRate: number; // per 1,000 active per month (all groups)
  excess: number[]; excessRate: number[]; // per group, Sep+Oct total / per 1,000 per month
  excessTotal: number;
  noise: number[]; // approx. 1 s.d. of excessRate per group (Poisson)
}
export function segments(s: Settings, dim: DimKey): { rows: SegmentRow[]; totalExcess: number; totalActive: number } {
  const { filters: f, attribution, baseline } = s;
  const d = DIMS.find((x) => x.key === dim)!;
  const pass = makePass(f, dim);
  const nV = d.values.length;
  const nM = MONTHS.length;
  const cube = Array.from({ length: nV }, () => Array.from({ length: nM }, () => [0, 0, 0]));
  const arr = REC[dim];
  for (let i = 0; i < REC.n; i++) {
    if (f.reason !== null && REC.r[i] !== f.reason) continue;
    if (!pass(REC as unknown as Arrs, i)) continue;
    cube[arr[i]][REC.m[i]][recGroup(i, attribution)]++;
  }
  const act = new Array(nV).fill(0);
  const parr = POP[dim];
  for (let i = 0; i < POP.n; i++) if (pass(POP as unknown as Arrs, i)) act[parr[i]]++;
  const rows: SegmentRow[] = d.values.map((label, v) => {
    const monthly = cube[v];
    const tot = monthly.map((x) => x[0] + x[1] + x[2]);
    const a = Math.max(act[v], 1);
    const excess = [0, 1, 2].map((g) => {
      const series = monthly.map((x) => x[g]);
      return series[M_SEP26] - expectedOf(series, M_SEP26, baseline) + series[M_OCT26] - expectedOf(series, M_OCT26, baseline);
    });
    const expTot = expectedOf(tot, M_SEP26, baseline) + expectedOf(tot, M_OCT26, baseline);
    const noise = [0, 1, 2].map((g) => {
      const series = monthly.map((x) => x[g]);
      const obs = series[M_SEP26] + series[M_OCT26];
      const exp = expectedOf(series, M_SEP26, baseline) + expectedOf(series, M_OCT26, baseline);
      const expVar = baseline === 'pre' ? (4 * exp) / 2 / BASELINE_MONTHS.length : exp;
      return (Math.sqrt(obs + expVar) / 2 / a) * 1000;
    });
    return {
      idx: v, label, active: act[v], selected: f[dim].includes(v), monthly,
      baseRate: (expTot / 2 / a) * 1000,
      nowRate: ((tot[M_SEP26] + tot[M_OCT26]) / 2 / a) * 1000,
      excess, excessRate: excess.map((e) => (e / 2 / a) * 1000),
      excessTotal: excess[0] + excess[1] + excess[2],
      noise,
    };
  });
  return { rows, totalExcess: rows.reduce((a, r) => a + r.excessTotal, 0), totalActive: act.reduce((a, b) => a + b, 0) };
}

// ---------- daily (Aug–Oct 2026) ----------
export const DAILY_START = dayNum(2026, 7, 1);
export const DAILY_END = dayNum(2026, 9, 31);
export function daily(s: Settings, ov: Overview) {
  const { filters: f, attribution } = s;
  const pass = makePass(f);
  const n = DAILY_END - DAILY_START + 1;
  const days = Array.from({ length: n }, () => [0, 0, 0]);
  for (let i = 0; i < REC.n; i++) {
    const dn = REC.day[i];
    if (dn < DAILY_START || dn > DAILY_END) continue;
    if (f.reason !== null && REC.r[i] !== f.reason) continue;
    if (!pass(REC as unknown as Arrs, i)) continue;
    days[dn - DAILY_START][recGroup(i, attribution)]++;
  }
  // expected per day: month baseline spread by weekday weights
  const WD = [0.1, 1, 1, 1, 1, 1, 0.25];
  const expected = days.map((_, j) => {
    const dn = DAILY_START + j;
    const m = MONTHS.findIndex((mo) => dn >= mo.start && dn < mo.start + mo.days);
    const mo = MONTHS[m];
    let wsum = 0;
    for (let d = 0; d < mo.days; d++) wsum += WD[new Date(Date.UTC(mo.year, mo.month, d + 1)).getUTCDay()];
    const exp = ov.expG(0, m) + ov.expG(1, m) + ov.expG(2, m);
    return (exp * WD[new Date(Date.UTC(2025, 0, 1 + dn)).getUTCDay()]) / wsum;
  });
  return { days, expected, start: DAILY_START };
}

// ---------- weekly by letter wave ----------
export type WaveMetric = 'price' | 'deliberate' | 'payment';
export const WEEK0 = dayNum(2026, 6, 6); // Mon Jul 6
export const N_WEEKS = 17; // through week of Oct 26
export function waveWeekly(s: Settings, metric: WaveMetric) {
  const { filters: f, attribution } = s;
  const pass = makePass(f, 'w');
  const counts = [0, 1, 2].map(() => new Array(N_WEEKS).fill(0));
  for (let i = 0; i < REC.n; i++) {
    const dn = REC.day[i];
    if (dn < WEEK0) continue;
    const wk = Math.floor((dn - WEEK0) / 7);
    if (wk >= N_WEEKS) continue;
    if (!pass(REC as unknown as Arrs, i)) continue;
    const g = recGroup(i, attribution);
    const ok = metric === 'price' ? REC.r[i] === R['PRICE-INCREASE'] : metric === 'deliberate' ? g === 0 : REC.r[i] === R['PAYMENT-FAILED-NO-RESPONSE'];
    if (ok) counts[REC.w[i]][wk]++;
  }
  const act = [0, 0, 0];
  for (let i = 0; i < POP.n; i++) if (pass(POP as unknown as Arrs, i)) act[POP.w[i]]++;
  const rates = counts.map((row, w) => row.map((c) => (c / Math.max(act[w], 1)) * 10000));
  return { counts, rates, act, sends: WAVE_SEND };
}

// ---------- payment-lapse heatmap (tenure × channel) ----------
export function lapseHeat(s: Settings) {
  const { filters: f, baseline } = s;
  const pass = makePass(f);
  const PAYR = R['PAYMENT-FAILED-NO-RESPONSE'];
  const cube = Array.from({ length: 4 }, () => Array.from({ length: 5 }, () => new Array(MONTHS.length).fill(0)));
  for (let i = 0; i < REC.n; i++) {
    if (REC.r[i] !== PAYR) continue;
    if (!pass(REC as unknown as Arrs, i)) continue;
    cube[REC.t[i]][REC.c[i]][REC.m[i]]++;
  }
  const act = Array.from({ length: 4 }, () => [0, 0, 0, 0, 0]);
  for (let i = 0; i < POP.n; i++) if (pass(POP as unknown as Arrs, i)) act[POP.t[i]][POP.c[i]]++;
  return cube.map((row, t) => row.map((series, c) => {
    const e = series[M_SEP26] - expectedOf(series, M_SEP26, baseline) + series[M_OCT26] - expectedOf(series, M_OCT26, baseline);
    return { excess: e, active: act[t][c], rate: act[t][c] ? (e / 2 / act[t][c]) * 1000 : 0 };
  }));
}

// ---------- labels ----------
export function filterSummary(s: Settings) {
  const parts: string[] = [];
  for (const d of DIMS) {
    const sel = s.filters[d.key];
    if (sel.length) parts.push(`${d.label}: ${sel.map((v) => d.values[v]).join(', ')}`);
  }
  if (s.filters.reason !== null) parts.push(`Reason: ${REASONS[s.filters.reason].code}`);
  return parts.length ? parts.join(' · ') : 'All sponsors';
}
export function contextLine(s: Settings) {
  return `${filterSummary(s)} · vs ${baselineShort(s.baseline)} · failed-charge overlap counted as ${s.attribution === 'stated' ? 'stated reason' : 'payment lapse'}`;
}
export function anyFilter(f: Filters) { return f.reason !== null || DIM_KEYS.some((k) => f[k].length > 0); }

export { ACTIVE_TOTAL, GROUPS };
