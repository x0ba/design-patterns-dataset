// Mock data for Retention Lens.
// Everything is generated deterministically in the browser from a fixed seed, so
// the headline figures (monthly totals, reason-code counts, failure funnel) are exact
// and the sponsor-level attributes are internally consistent.

export type Group = 'deliberate' | 'payment' | 'program';
export const GROUPS: Group[] = ['deliberate', 'payment', 'program'];
export const GROUP_LABEL: Record<Group, string> = {
  deliberate: 'Deliberate',
  payment: 'Payment lapse',
  program: 'Program & admin',
};
export const GROUP_HINT: Record<Group, string> = {
  deliberate: 'Sponsor chose to cancel',
  payment: 'Gift stopped because a payment failed',
  program: 'Program change, bereavement or record clean-up',
};

export type Shock = 0 | 1 | 2 | 3; // none | price response | payment migration | admin clean-up

export interface Reason {
  code: string;
  label: string;
  group: Group;
  base: number; // pre-change monthly average (Jan 2025 – Jul 2026)
  shock: Shock;
}

export const REASONS: Reason[] = [
  { code: 'PRICE-INCREASE', label: 'Gift amount increase', group: 'deliberate', base: 85, shock: 1 },
  { code: 'FIN-HARDSHIP', label: 'Financial hardship', group: 'deliberate', base: 520, shock: 1 },
  { code: 'NO-REASON', label: 'Declined to give a reason', group: 'deliberate', base: 330, shock: 1 },
  { code: 'PREFER-OTHER-CHARITY', label: 'Giving to another cause', group: 'deliberate', base: 175, shock: 1 },
  { code: 'DISSATISFIED-COMMS', label: 'Unhappy with letters or contact', group: 'deliberate', base: 140, shock: 1 },
  { code: 'LIFE-CHANGE', label: 'Life change (move, retirement)', group: 'deliberate', base: 210, shock: 0 },
  { code: 'PAYMENT-FAILED-NO-RESPONSE', label: 'Payment failed, no response to outreach', group: 'payment', base: 255, shock: 2 },
  { code: 'BANK-ACCOUNT-CLOSED', label: 'Bank account closed', group: 'payment', base: 95, shock: 0 },
  { code: 'CHILD-LEFT-PROGRAM', label: 'Child left program, sponsor declined new child', group: 'program', base: 210, shock: 0 },
  { code: 'SPONSOR-DECEASED', label: 'Sponsor deceased', group: 'program', base: 85, shock: 0 },
  { code: 'DUPLICATE-ADMIN', label: 'Duplicate or administrative closure', group: 'program', base: 45, shock: 3 },
];
export const R = Object.fromEntries(REASONS.map((r, i) => [r.code, i])) as Record<string, number>;

// ---------- calendar ----------
export interface Month { year: number; month: number; days: number; label: string; short: string; start: number }
const DAY_MS = 86400000;
const EPOCH = Date.UTC(2025, 0, 1);
export function dayNum(y: number, m: number, d: number) { return Math.round((Date.UTC(y, m, d) - EPOCH) / DAY_MS); }
export function dateOf(n: number) { return new Date(EPOCH + n * DAY_MS); }
export function weekday(n: number) { return dateOf(n).getUTCDay(); } // 0 Sun
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDay(n: number) { const d = dateOf(n); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; }
export function fmtDayLong(n: number) {
  const d = dateOf(n);
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export const MONTHS: Month[] = [];
for (let i = 0; i < 22; i++) {
  const year = 2025 + Math.floor(i / 12);
  const month = i % 12;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  MONTHS.push({ year, month, days, label: `${MON[month]} ${year}`, short: `${MON[month]} ${String(year).slice(2)}`, start: dayNum(year, month, 1) });
}
export const M_AUG26 = 19, M_SEP26 = 20, M_OCT26 = 21, M_SEP25 = 8, M_OCT25 = 9;
export const BASELINE_MONTHS = Array.from({ length: 19 }, (_, i) => i); // Jan 2025 – Jul 2026

export const EVENTS = [
  { day: dayNum(2026, 7, 4), label: 'Wave 1 letters', short: 'W1', kind: 'price' as const, detail: 'Pilot wave: 12,000 sponsors told the gift moves from $39 to $45' },
  { day: dayNum(2026, 7, 18), label: 'Processor migration', short: 'Migration', kind: 'payment' as const, detail: 'Card processing moved to the new processor; failed charges start' },
  { day: dayNum(2026, 7, 25), label: 'Wave 2 letters', short: 'W2', kind: 'price' as const, detail: 'Sponsors billed 1st–15th of the month' },
  { day: dayNum(2026, 8, 15), label: 'Wave 3 letters', short: 'W3', kind: 'price' as const, detail: 'Sponsors billed 16th–31st of the month' },
];
export const WAVE_SEND = [dayNum(2026, 7, 4), dayNum(2026, 7, 25), dayNum(2026, 8, 15)];

// ---------- dimensions ----------
export type DimKey = 't' | 'c' | 'p' | 'a' | 'g' | 'k' | 'w';
export const TENURES = ['<1 yr', '1–3 yrs', '3–10 yrs', '10+ yrs'];
export const CHANNELS = ['TV', 'Digital', 'Event', 'Church partner', 'Peer referral'];
export const PAYMENTS = ['Card', 'Bank debit', 'Check'];
export const AGES = ['18–34', '35–49', '50–64', '65–74', '75+'];
export const REGIONS = ['Northeast', 'Midwest', 'South', 'West'];
export const COUNTRIES = [
  'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Dominican Republic', 'Haiti', 'Colombia', 'Ecuador',
  'Peru', 'Bolivia', 'Mexico', 'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia', 'Burkina Faso', 'Ghana',
  'Togo', 'Bangladesh', 'India', 'Philippines', 'Indonesia',
];
export const WAVES = ['Wave 1 · Aug 4 (pilot)', 'Wave 2 · Aug 25', 'Wave 3 · Sep 15'];
export const WAVE_SHORT = ['Wave 1', 'Wave 2', 'Wave 3'];

export const DIMS: { key: DimKey; label: string; plural: string; values: string[] }[] = [
  { key: 't', label: 'Tenure', plural: 'tenure bands', values: TENURES },
  { key: 'c', label: 'Channel', plural: 'acquisition channels', values: CHANNELS },
  { key: 'p', label: 'Payment', plural: 'payment methods', values: PAYMENTS },
  { key: 'a', label: 'Age', plural: 'age bands', values: AGES },
  { key: 'g', label: 'Region', plural: 'regions', values: REGIONS },
  { key: 'k', label: 'Country program', plural: 'country programs', values: COUNTRIES },
  { key: 'w', label: 'Letter wave', plural: 'letter waves', values: WAVES },
];
export const DIM_KEYS: DimKey[] = ['t', 'c', 'p', 'a', 'g', 'k', 'w'];

// ---------- distributions ----------
const TENURE_ACTIVE = [28600, 52300, 81900, 49600]; // = 212,400
const CH_BY_TEN = [
  [0.20, 0.45, 0.12, 0.13, 0.10],
  [0.26, 0.36, 0.14, 0.14, 0.10],
  [0.33, 0.18, 0.17, 0.20, 0.12],
  [0.38, 0.03, 0.17, 0.30, 0.12],
];
const PAY_BY_CH = [
  [0.55, 0.35, 0.10],
  [0.82, 0.17, 0.01],
  [0.50, 0.38, 0.12],
  [0.30, 0.40, 0.30],
  [0.55, 0.35, 0.10],
];
const CARD_T = [1.1, 1.05, 1.0, 0.8];
const CHECK_T = [0.3, 0.7, 1.1, 2.0];
const AGE_BY_TEN = [
  [0.30, 0.31, 0.22, 0.11, 0.06],
  [0.22, 0.31, 0.26, 0.14, 0.07],
  [0.10, 0.26, 0.32, 0.20, 0.12],
  [0.02, 0.12, 0.32, 0.30, 0.24],
];
const REGION_W = [0.18, 0.22, 0.38, 0.22];
const COUNTRY_W = [
  0.072, 0.051, 0.043, 0.034, 0.047, 0.041, 0.052, 0.038, 0.040, 0.031, 0.036, 0.062, 0.058, 0.046, 0.033, 0.052,
  0.029, 0.035, 0.024, 0.046, 0.049, 0.066, 0.035,
];
const WAVE_W = [0.056, 0.470, 0.474];

const TEN_BY_REASON = [
  [0.22, 0.27, 0.30, 0.21],
  [0.30, 0.31, 0.27, 0.12],
  [0.36, 0.29, 0.24, 0.11],
  [0.30, 0.30, 0.28, 0.12],
  [0.24, 0.30, 0.31, 0.15],
  [0.18, 0.26, 0.33, 0.23],
  [0.42, 0.31, 0.20, 0.07],
  [0.25, 0.30, 0.30, 0.15],
  [0.08, 0.20, 0.42, 0.30],
  [0.02, 0.06, 0.27, 0.65],
  [0.20, 0.28, 0.32, 0.20],
];
const TEN_PRICE_SHOCK = [0.10, 0.19, 0.34, 0.37];
const TEN_PAY_SHOCK = [0.33, 0.37, 0.23, 0.07];
const TEN_POP = TENURE_ACTIVE.map((v) => v / 212400);
const AGE_TILT_PRICE = [0.75, 0.85, 1, 1.25, 1.4];
const AGE_TILT_DECEASED = [0.05, 0.2, 0.7, 1.5, 4];

// ---------- monthly totals & reason matrix ----------
export const MONTH_TOTALS = [
  2310, 2180, 2140, 2090, 2120, 2060, 2110, 2170, 2190, 2120, 2080, 1980,
  2390, 2200, 2180, 2110, 2150, 2090, 2180, 2240, 3480, 3910,
];
const EXPLICIT: Record<number, number[]> = {
  // order follows REASONS
  19: [140, 525, 345, 175, 140, 210, 262, 95, 213, 85, 50],
  20: [610, 590, 410, 195, 165, 215, 790, 100, 205, 85, 115],
  21: [705, 615, 455, 200, 160, 205, 1130, 105, 215, 80, 40],
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261116);
function pick(w: number[]): number {
  let s = 0;
  for (const x of w) s += x;
  let u = rand() * s;
  for (let i = 0; i < w.length; i++) { u -= w[i]; if (u <= 0) return i; }
  return w.length - 1;
}
function mul(a: number[], b: number[]) { return a.map((x, i) => x * b[i]); }

function buildMatrix(): number[][] {
  const nR = REASONS.length;
  const target = REASONS.map((r) => r.base * BASELINE_MONTHS.length);
  // noisy seasonal mix, then fit to row (month) and column (reason) totals
  let mat = BASELINE_MONTHS.map((m) => REASONS.map((r) => r.base * (MONTH_TOTALS[m] / 2150) * (0.9 + rand() * 0.2)));
  for (let it = 0; it < 30; it++) {
    mat = mat.map((row, i) => { const s = row.reduce((a, b) => a + b, 0); return row.map((v) => (v * MONTH_TOTALS[i]) / s); });
    for (let j = 0; j < nR; j++) {
      const s = mat.reduce((a, row) => a + row[j], 0);
      mat.forEach((row) => (row[j] = (row[j] * target[j]) / s));
    }
  }
  // integer rounding that keeps each month's total exact
  const out = mat.map((row, i) => {
    const fl = row.map(Math.floor);
    let rem = MONTH_TOTALS[i] - fl.reduce((a, b) => a + b, 0);
    const order = row.map((v, j) => [v - Math.floor(v), j]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; k < rem; k++) fl[order[k][1]]++;
    return fl;
  });
  // fix reason totals by moving single units within a month
  for (let guard = 0; guard < 2000; guard++) {
    const dev = REASONS.map((_, j) => out.reduce((a, row) => a + row[j], 0) - target[j]);
    const hi = dev.findIndex((d) => d > 0);
    const lo = dev.findIndex((d) => d < 0);
    if (hi < 0 || lo < 0) break;
    const i = guard % out.length;
    if (out[i][hi] > 0) { out[i][hi]--; out[i][lo]++; }
  }
  const all: number[][] = [...out];
  all.push(EXPLICIT[19], EXPLICIT[20], EXPLICIT[21]);
  return all;
}
export const MATRIX = buildMatrix(); // [month][reason]

// ---------- active population (Nov 1, 2026) ----------
function payW(c: number, t: number) {
  const b = PAY_BY_CH[c];
  return [b[0] * CARD_T[t], b[1], b[2] * CHECK_T[t]];
}
function regionW(c: number) { return c === 3 ? [0.18, 0.22, 0.38 * 1.6, 0.22] : REGION_W; }

export interface Population { n: number; t: Uint8Array; c: Uint8Array; p: Uint8Array; a: Uint8Array; g: Uint8Array; k: Uint8Array; w: Uint8Array }
function buildPopulation(): Population {
  const n = TENURE_ACTIVE.reduce((a, b) => a + b, 0);
  const P: Population = { n, t: new Uint8Array(n), c: new Uint8Array(n), p: new Uint8Array(n), a: new Uint8Array(n), g: new Uint8Array(n), k: new Uint8Array(n), w: new Uint8Array(n) };
  let i = 0;
  TENURE_ACTIVE.forEach((cnt, t) => {
    for (let j = 0; j < cnt; j++, i++) {
      const c = pick(CH_BY_TEN[t]);
      P.t[i] = t; P.c[i] = c; P.p[i] = pick(payW(c, t)); P.a[i] = pick(AGE_BY_TEN[t]);
      P.g[i] = pick(regionW(c)); P.k[i] = pick(COUNTRY_W); P.w[i] = pick(WAVE_W);
    }
  });
  return P;
}

// ---------- timing kernels ----------
function normalize(a: number[]) { const s = a.reduce((x, y) => x + y, 0); return a.map((v) => v / s); }
const LETTER = normalize(Array.from({ length: 160 }, (_, t) => (t < 3 ? 0 : Math.pow(t - 3, 1.3) * Math.exp(-(t - 3) / 6))));
const CHARGE = normalize(Array.from({ length: 160 }, (_, t) => Math.exp(-((t - 38) ** 2) / (2 * 36))));
const PRICE_K = LETTER.map((v, t) => 0.4 * v + 0.6 * CHARGE[t]);
function priceK(t: number) { return t < 0 || t >= PRICE_K.length ? 0 : PRICE_K[t]; }
const WD = [0.1, 1, 1, 1, 1, 1, 0.25]; // Sun..Sat — cancellations are processed on weekdays

// ---------- failed card charges (static operational feed) ----------
export interface FailWeek { start: number; label: string; failed: number; recovered: number; pre: boolean }
const failRaw: [number, number, number, boolean][] = [
  [dayNum(2026, 6, 6), 148, 66, true], [dayNum(2026, 6, 13), 156, 71, true], [dayNum(2026, 6, 20), 141, 63, true],
  [dayNum(2026, 6, 27), 152, 70, true], [dayNum(2026, 7, 3), 160, 72, true], [dayNum(2026, 7, 10), 149, 67, true],
  [dayNum(2026, 7, 17), 1180, 450, false], [dayNum(2026, 7, 24), 1020, 390, false], [dayNum(2026, 7, 31), 760, 290, false],
  [dayNum(2026, 8, 7), 590, 220, false], [dayNum(2026, 8, 14), 480, 170, false], [dayNum(2026, 8, 21), 410, 140, false],
  [dayNum(2026, 8, 28), 360, 110, false], [dayNum(2026, 9, 5), 320, 85, false], [dayNum(2026, 9, 12), 290, 60, false],
  [dayNum(2026, 9, 19), 250, 40, false], [dayNum(2026, 9, 26), 220, 30, false], [dayNum(2026, 10, 2), 190, 15, false],
  [dayNum(2026, 10, 9), 170, 10, false],
];
export const FAIL_WEEKS: FailWeek[] = failRaw.map(([start, failed, recovered, pre]) => ({ start, label: fmtDay(start), failed, recovered, pre }));
export const FUNNEL = {
  charges: 6240, recovered: 2010, unrecovered: 4230,
  sponsorships: 3930, lapsed: 1920, lapsedAboveNormal: 1410, otherReason: 385, open: 1625,
  retry: 380, outreach: 690, pending: 555,
  preWeekly: 151,
};

// daily unrecovered failures → lapse intensity (≈30-day grace + processing)
const MIG = dayNum(2026, 7, 18);
const unrecDaily = new Map<number, number>();
FAIL_WEEKS.filter((w) => !w.pre).forEach((w) => {
  const first = Math.max(w.start, MIG);
  const days = w.start + 7 - first;
  for (let d = first; d < w.start + 7; d++) unrecDaily.set(d, (w.failed - w.recovered) / days);
});
function lapseIntensity(day: number) {
  let s = 0;
  unrecDaily.forEach((u, f) => { const l = day - f; s += u * Math.exp(-((l - 33) ** 2) / (2 * 16)); });
  return s;
}

// ---------- cancellation records ----------
export interface Records {
  n: number; m: Uint8Array; day: Uint16Array; r: Uint8Array; s: Uint8Array; f: Uint8Array;
  t: Uint8Array; c: Uint8Array; p: Uint8Array; a: Uint8Array; g: Uint8Array; k: Uint8Array; w: Uint8Array;
}

function buildRecords(): Records {
  const total = MATRIX.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
  const Rc: Records = {
    n: total, m: new Uint8Array(total), day: new Uint16Array(total), r: new Uint8Array(total), s: new Uint8Array(total), f: new Uint8Array(total),
    t: new Uint8Array(total), c: new Uint8Array(total), p: new Uint8Array(total), a: new Uint8Array(total), g: new Uint8Array(total), k: new Uint8Array(total), w: new Uint8Array(total),
  };
  // per-month day weights
  const dayW = MONTHS.map((mo) => Array.from({ length: mo.days }, (_, d) => WD[weekday(mo.start + d)]));
  const priceJoint: Record<number, number[]> = {};
  for (const m of [M_AUG26, M_SEP26, M_OCT26]) {
    const mo = MONTHS[m];
    const arr: number[] = [];
    for (let w = 0; w < 3; w++) for (let d = 0; d < mo.days; d++) arr.push(WAVE_W[w] * priceK(mo.start + d - WAVE_SEND[w]) * dayW[m][d]);
    priceJoint[m] = arr;
  }
  const lapseW: Record<number, number[]> = {};
  for (const m of [M_SEP26, M_OCT26]) {
    const mo = MONTHS[m];
    lapseW[m] = Array.from({ length: mo.days }, (_, d) => lapseIntensity(mo.start + d) * dayW[m][d]);
  }

  let i = 0;
  MATRIX.forEach((row, m) => {
    const mo = MONTHS[m];
    row.forEach((n, r) => {
      const reason = REASONS[r];
      let shockN = 0;
      if (m >= M_AUG26 && reason.shock === 1) shockN = Math.max(0, n - reason.base);
      if (m >= M_SEP26 && reason.shock === 2) shockN = Math.max(0, n - reason.base);
      if (m === M_SEP26 && reason.shock === 3) shockN = Math.max(0, n - reason.base);
      for (let j = 0; j < n; j++, i++) {
        const s = (j < shockN ? reason.shock : 0) as Shock;
        // tenure
        const t = pick(s === 1 ? TEN_PRICE_SHOCK : s === 2 ? TEN_PAY_SHOCK : s === 3 ? TEN_POP : TEN_BY_REASON[r]);
        // channel + payment method (payment depends on reason)
        let payMask = [1, 1, 1];
        if (s === 2) payMask = [1, 0, 0];
        else if (r === R['PAYMENT-FAILED-NO-RESPONSE']) payMask = [1, 0.45, 0];
        else if (r === R['BANK-ACCOUNT-CLOSED']) payMask = [0, 1, 0];
        else if (s === 1) payMask = [1, 1, 1.35];
        const chW = CH_BY_TEN[t].map((v, c) => v * mul(payW(c, t), payMask).reduce((a, b) => a + b, 0));
        const c = pick(chW);
        const p = pick(mul(payW(c, t), payMask));
        let ageW = AGE_BY_TEN[t];
        if (s === 1) ageW = mul(ageW, AGE_TILT_PRICE);
        if (r === R['SPONSOR-DECEASED']) ageW = mul(ageW, AGE_TILT_DECEASED);
        const a = pick(ageW);
        const g = pick(regionW(c));
        let kW = COUNTRY_W;
        if (r === R['CHILD-LEFT-PROGRAM']) kW = COUNTRY_W.map((v, k) => (COUNTRIES[k] === 'Philippines' ? v * 1.8 : COUNTRIES[k] === 'Bolivia' ? v * 1.5 : v));
        const k = pick(kW);
        // wave + day
        let w: number, d: number;
        if (s === 1) {
          const idx = pick(priceJoint[m]);
          w = Math.floor(idx / mo.days); d = idx % mo.days;
        } else {
          w = pick(WAVE_W);
          if (s === 2) d = pick(lapseW[m]);
          else if (s === 3) d = rand() < 0.55 ? 8 : 9; // Sep 9–10 duplicate-mandate clean-up batch
          else d = pick(dayW[m]);
        }
        Rc.m[i] = m; Rc.day[i] = mo.start + d; Rc.r[i] = r; Rc.s[i] = s;
        Rc.t[i] = t; Rc.c[i] = c; Rc.p[i] = p; Rc.a[i] = a; Rc.g[i] = g; Rc.k[i] = k; Rc.w[i] = w;
        Rc.f[i] = s === 2 || (r === R['PAYMENT-FAILED-NO-RESPONSE'] && m >= M_SEP26) ? 1 : 0;
      }
    });
  });
  // 385 sponsors whose card failed after the migration, then cancelled giving a deliberate reason
  const cand: number[] = [];
  for (let j = 0; j < Rc.n; j++) if (Rc.s[j] === 1 && Rc.m[j] >= M_SEP26 && Rc.p[j] === 0) cand.push(j);
  for (let j = cand.length - 1; j > 0; j--) { const x = Math.floor(rand() * (j + 1)); [cand[j], cand[x]] = [cand[x], cand[j]]; }
  for (let j = 0; j < FUNNEL.otherReason && j < cand.length; j++) Rc.f[cand[j]] = 1;
  return Rc;
}

export const POP = buildPopulation();
export const REC = buildRecords();
export const ACTIVE_TOTAL = POP.n;
export const DATA_AS_OF = 'Cancellations through Oct 31 · failed charges through Nov 15';
