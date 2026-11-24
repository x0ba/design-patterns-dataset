// All times are local and the app's "now" is fixed, so the mock data reads the same every time it opens.
export const NOW = new Date(2026, 10, 16, 18, 14); // Mon, Nov 16 2026, 6:14 p.m.

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
];

/** "2026-11-21" -> local Date at midnight. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-11-21T19:30" (or "2026-11-21") -> local Date. */
export function parseStamp(stamp: string): Date {
  const [day, time = "00:00"] = stamp.split("T");
  const [hh, mm] = time.split(":").map(Number);
  const d = parseDay(day);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function toDayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whole calendar days from a to b (b later => positive). */
export function calendarDaysBetween(a: Date, b: Date): number {
  const aa = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bb - aa) / DAY_MS);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday of the week containing the day, as YYYY-MM-DD. */
export function mondayOf(day: string): string {
  const d = parseDay(day);
  const offset = (d.getDay() + 6) % 7;
  return toDayKey(addDays(d, -offset));
}

/** "19:30" -> "7:30 p.m." */
export function fmtClockHHMM(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return fmtClock(h, m);
}

export function fmtClock(h: number, m: number): string {
  const suffix = h < 12 ? "a.m." : "p.m.";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function fmtDate(day: string): string {
  const d = parseDay(day);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtDateLong(day: string): string {
  const d = parseDay(day);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}

export function fmtWeekday(day: string): string {
  return WEEKDAYS[parseDay(day).getDay()];
}

export function fmtShortDay(day: string): string {
  const d = parseDay(day);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Alert timestamp relative to now: "Today, 6:09 p.m.", "Yesterday, 4:20 p.m.", or "Sun, Nov 15 · 4:20 p.m.". */
export function fmtWhen(at: Date, now: Date = NOW): string {
  const clock = fmtClock(at.getHours(), at.getMinutes());
  const diff = calendarDaysBetween(at, now);
  if (diff === 0) return `Today, ${clock}`;
  if (diff === 1) return `Yesterday, ${clock}`;
  return `${WEEKDAYS[at.getDay()]}, ${MONTHS[at.getMonth()]} ${at.getDate()} · ${clock}`;
}

/** Start time plus a runtime in minutes, formatted as a clock time. */
export function endTime(hhmm: string, runtimeMinutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + runtimeMinutes;
  return fmtClock(Math.floor(total / 60) % 24, total % 60);
}

export function fmtRuntime(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export function daysFromNow(day: string, now: Date = NOW): number {
  return calendarDaysBetween(now, parseDay(day));
}
