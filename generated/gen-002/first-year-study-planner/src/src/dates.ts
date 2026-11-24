// Date helpers. All dates are ISO "YYYY-MM-DD" strings interpreted in local time.

export const NOW = new Date(2026, 7, 30, 19, 42); // Sun Aug 30 2026, 7:42 pm
export const TODAY = '2026-08-30';

export const TERM = {
  name: 'Fall 2026',
  start: '2026-08-24',
  end: '2026-12-11',
  weeks: 16,
  closures: [
    { date: '2026-09-07', label: 'Labor Day' },
    { date: '2026-11-11', label: 'Veterans Day' },
    { date: '2026-11-26', label: 'Thanksgiving' },
    { date: '2026-11-27', label: 'Thanksgiving break' },
  ],
};

export function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(isoDate: string, n: number): string {
  const d = parse(isoDate);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function dow(isoDate: string): number {
  return parse(isoDate).getDay();
}

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtShort(isoDate: string): string {
  const d = parse(isoDate);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function fmtDay(isoDate: string): string {
  const d = parse(isoDate);
  return `${DAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function fmtRange(a: string, b: string): string {
  const sa = fmtTime(a);
  const sb = fmtTime(b);
  // "4–10 pm" when both share a suffix
  if (sa.slice(-2) === sb.slice(-2)) return `${sa.slice(0, -3)}–${sb}`;
  return `${sa}–${sb}`;
}

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function weekOf(isoDate: string): number {
  const diff = Math.round((parse(isoDate).getTime() - parse(TERM.start).getTime()) / 86400000);
  return Math.floor(diff / 7) + 1;
}

/** Monday of a given term week (1-based) */
export function weekStart(week: number): string {
  return addDays(TERM.start, (week - 1) * 7);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}

export function closureOn(isoDate: string) {
  return TERM.closures.find((c) => c.date === isoDate);
}
