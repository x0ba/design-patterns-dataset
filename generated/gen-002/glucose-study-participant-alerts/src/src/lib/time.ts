// All study times are Pacific Standard Time (UTC-8). DST ended 1 Nov 2026, so the
// whole cohort window uses a fixed offset and plain millisecond arithmetic is exact.
// Wall-clock fields are read by shifting the timestamp and using UTC getters, which
// keeps the display identical no matter what time zone the viewing browser uses.

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
export const SAMPLE = 5 * MIN; // CGM cadence

const PT_SHIFT = 8 * HOUR;

/** Timestamp for a Pacific wall-clock date ("2026-11-17") and time ("06:40"). */
export function pt(date: string, hhmm: string): number {
  return Date.parse(`${date}T${hhmm}:00-08:00`);
}

/** The snapshot the on-call coordinator opens at: Tue 17 Nov 2026, 06:40 PT. */
export const NOW = pt('2026-11-17', '06:40');
/** Study day 1 for cohort 3 (enrollment visit Nov 7, first study day Nov 9). */
export const DAY1 = pt('2026-11-09', '00:00');
/** Start of the stored glucose grid (run-in begins at enrollment). */
export const GRID_START = pt('2026-11-07', '00:00');
/** Rolling 24-hour window ending at NOW. */
export const WINDOW_START = NOW - DAY;

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function wall(ms: number): Date {
  return new Date(ms - PT_SHIFT);
}

function p2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Hour of day in Pacific time, fractional. */
export function hourOf(ms: number): number {
  const d = wall(ms);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

/** "06:40" */
export function hhmm(ms: number): string {
  const d = wall(ms);
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}

/** "Tue 17 Nov" */
export function dayLabel(ms: number): string {
  const d = wall(ms);
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`;
}

/** "Tue 17 Nov, 06:40" */
export function stamp(ms: number): string {
  return `${dayLabel(ms)}, ${hhmm(ms)}`;
}

/** "Tue 17 Nov 2026" */
export function longDate(ms: number): string {
  const d = wall(ms);
  return `${dayLabel(ms)} ${d.getUTCFullYear()}`;
}

/** Calendar date key in Pacific time, "2026-11-17". */
export function dateKey(ms: number): string {
  const d = wall(ms);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

/** "11 h 02 min" or "42 min" */
export function durationLabel(ms: number): string {
  const total = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${p2(m)} min` : `${m} min`;
}

/** Quiet hours are 22:00 to 06:00 Pacific. */
export function isQuiet(ms: number): boolean {
  const h = hourOf(ms);
  return h >= 22 || h < 6;
}

/** Start of the Pacific calendar day containing ms. */
export function wallDayStart(ms: number): number {
  return Math.floor((ms - PT_SHIFT) / DAY) * DAY + PT_SHIFT;
}

/** Sensor day counting from insertion (insertion day = day 1). */
export function sensorDay(insertedMs: number, atMs: number): number {
  return Math.round((wallDayStart(atMs) - wallDayStart(insertedMs)) / DAY) + 1;
}

/** Study day (day 1 = 9 Nov). */
export function studyDay(ms: number): number {
  return Math.floor((ms - DAY1) / DAY) + 1;
}

export function minutesBetween(a: number, b: number): number {
  return Math.round((b - a) / MIN);
}
