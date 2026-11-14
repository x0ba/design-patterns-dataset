const MINUS = '−';

/** Fraction to percent string, e.g. 0.6123 -> "61.2%". */
export function pct(x: number | null | undefined, digits = 1): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  return `${(x * 100).toFixed(digits)}%`;
}

/** Fraction difference to signed percentage points, e.g. -0.0523 -> "−5.2 pts". */
export function pts(x: number | null | undefined, digits = 1): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  const v = (x * 100).toFixed(digits);
  if (Number(v) === 0) return `${(0).toFixed(digits)} pts`;
  return `${v.startsWith('-') ? MINUS + v.slice(1) : '+' + v} pts`;
}

/** Signed number with proper minus sign, no unit. */
export function signed(x: number, digits = 1): string {
  const v = x.toFixed(digits);
  if (Number(v) === 0) return (0).toFixed(digits);
  return v.startsWith('-') ? MINUS + v.slice(1) : '+' + v;
}

export function ci(lo: number, hi: number): string {
  const f = (x: number) => {
    const v = (x * 100).toFixed(1);
    return v.startsWith('-') ? MINUS + v.slice(1) : v;
  };
  return `95% CI ${f(lo)} to ${f(hi)} pts`;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateFmtShort = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });

/** ISO date to "4 Aug 2026". */
export function dateLong(iso: string): string {
  return dateFmt.format(new Date(`${iso}T00:00:00Z`));
}

export function dateShort(iso: string): string {
  return dateFmtShort.format(new Date(`${iso}T00:00:00Z`));
}

/** "2026-08" to "Aug 26". */
export function monthLabel(ym: string): string {
  return monthFmt.format(new Date(`${ym}-01T00:00:00Z`));
}

export function num(n: number): string {
  return n.toLocaleString('en-GB');
}

/** Whole days from ISO date a to ISO date b (negative if b is earlier). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function weeksBetween(a: string, b: string): number {
  return daysBetween(a, b) / 7;
}
