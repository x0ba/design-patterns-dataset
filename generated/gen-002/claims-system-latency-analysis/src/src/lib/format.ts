// Formatting for minute indices (0 = Sat 14 Nov 00:00, local wall-clock).

export const DAY_NAMES = ['Sat', 'Sun', 'Mon'] as const;
const DAY_DATES = ['14 Nov', '15 Nov', '16 Nov'] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

export function dayOf(m: number): number {
  return Math.floor(m / 1440);
}

export function dayName(m: number): string {
  return DAY_NAMES[dayOf(m)] ?? '';
}

/** "08:10" for a minute index. Midnight at the end of the window reads as 24:00. */
export function hhmm(m: number, endBoundary = false): string {
  if (endBoundary && m > 0 && m % 1440 === 0) return '24:00';
  const mod = ((m % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(mod / 60))}:${pad2(mod % 60)}`;
}

/** "Mon 08:10" */
export function clock(m: number): string {
  return `${dayName(m)} ${hhmm(m)}`;
}

/** "Mon 16 Nov, 08:10–10:45" or "Mon 16 Nov 08:10 – Tue…" style across days. */
export function rangeLabel(m0: number, m1: number): string {
  const d0 = dayOf(m0);
  const d1 = dayOf(Math.max(m0, m1 - 1));
  if (d0 === d1) {
    return `${DAY_NAMES[d0]} ${DAY_DATES[d0]}, ${hhmm(m0)}–${hhmm(m1, true)}`;
  }
  return `${DAY_NAMES[d0]} ${DAY_DATES[d0]} ${hhmm(m0)} – ${DAY_NAMES[d1]} ${DAY_DATES[d1]} ${hhmm(m1, true)}`;
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const mm = Math.round(minutes % 60);
  return mm ? `${h} h ${mm} min` : `${h} h`;
}

/** ms since T0 → "Mon 16 Nov 08:10:42" */
export function clockMs(t: number): string {
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  return `${clock(m)}:${pad2(s)}`;
}

export function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`;
}

export function fmtSecShort(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtPct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function fmtX(x: number): string {
  return `${x.toFixed(1)}×`;
}

export function shortId(id: string): string {
  return id.slice(0, 13);
}
