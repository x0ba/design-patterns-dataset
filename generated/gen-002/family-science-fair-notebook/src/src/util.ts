import { NOW, Reading } from './data';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtTime = (d: Date) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
};

export const fmtDate = (d: Date) => `${WD[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`;
export const fmtDateShort = (d: Date) => `${MO[d.getMonth()]} ${d.getDate()}`;

const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export const daysAgo = (d: Date) => Math.round((startOf(NOW) - startOf(d)) / 86400000);

export const dayHeading = (d: Date) => {
  const n = daysAgo(d);
  const base = `${WD_LONG[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`;
  if (n === 0) return `Today · ${base}`;
  if (n === 1) return `Yesterday · ${base}`;
  return base;
};

export const fmtWhen = (d: Date) => {
  if (NOW.getTime() - d.getTime() < 60000) return 'just now';
  const n = daysAgo(d);
  if (n === 0) return `today ${fmtTime(d)}`;
  if (n === 1) return `yesterday ${fmtTime(d)}`;
  if (n < 7) return `${WD[d.getDay()]} ${fmtTime(d)}`;
  return `${fmtDateShort(d)}, ${fmtTime(d)}`;
};

export const g = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(2)} g`);
export const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(2)} g`;

// ---------- Word diff (LCS) ----------
export type Seg = { t: 'same' | 'add' | 'del'; s: string };

export function wordDiff(a: string, b: string): Seg[] {
  const A = a.split(/(\s+|[.,;:()])/).filter(Boolean);
  const B = b.split(/(\s+|[.,;:()])/).filter(Boolean);
  const n = A.length;
  const m = B.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: Seg[] = [];
  const push = (t: Seg['t'], s: string) => {
    const last = out[out.length - 1];
    if (last && last.t === t) last.s += s;
    else out.push({ t, s });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      push('same', A[i]);
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) push('del', A[i++]);
    else push('add', B[j++]);
  }
  while (i < n) push('del', A[i++]);
  while (j < m) push('add', B[j++]);
  // fold whitespace-only same segments sitting between changes into both sides for readability
  return out;
}

// ---------- Data checks ----------
export const SCALE_TOLERANCE = 0.03; // g; scale reads to 0.01 g, allow small wobble

export function previousReading(all: Reading[], r: Reading): Reading | undefined {
  return all
    .filter((x) => x.container === r.container && x.day < r.day && x.mass != null && !x.second)
    .sort((a, b) => b.day - a.day)[0];
}

export function startReading(all: Reading[], r: Reading): Reading | undefined {
  return all.find((x) => x.container === r.container && x.day === 0);
}

export interface Check {
  rise: number;
  prev: Reading;
  aboveStart: boolean;
}

export function checkReading(all: Reading[], r: Reading): Check | null {
  if (r.mass == null) return null;
  const prev = previousReading(all, r);
  if (!prev || prev.mass == null) return null;
  const rise = r2(r.mass - prev.mass);
  if (rise <= SCALE_TOLERANCE) return null;
  const start = startReading(all, r);
  return { rise, prev, aboveStart: !!start && start.mass != null && r.mass > start.mass };
}

export const r2 = (n: number) => Math.round(n * 100) / 100;
