/** Parse "m:ss" or "h:mm:ss" into seconds. */
export function parseTime(value: string): number {
  const parts = value.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) throw new Error(`Bad time: ${value}`);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** Format seconds as m:ss (h:mm:ss only past 100 minutes, which no call in the library reaches). */
export function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (s >= 6000) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${Math.floor(s / 60)}:${pad(sec)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-10-29" -> "Oct 29, 2026" without timezone shifts. */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** "2026-10-29" -> "October 29, 2026" */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${d}, ${y}`;
}

/** Weekday for a YYYY-MM-DD date, computed without timezone shifts. */
export function weekdayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return WEEKDAYS[dow];
}

/** Duration like "61 min" */
export function formatMinutes(sec: number): string {
  return `${Math.round(sec / 60)} min`;
}
