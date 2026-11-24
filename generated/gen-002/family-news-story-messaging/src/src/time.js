// All scenario times are authored as Eastern wall-clock times and stored as absolute instants.
export const TZ = {
  N: 'America/New_York',
  S: 'America/Detroit',
  K: 'America/Phoenix',
};

export function et(s) {
  const [d, t] = s.split(' ');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  // US daylight time ended Sun Nov 1 2026 at 2:00 AM; every earlier date in the data is EDT (UTC-4).
  const off = Date.UTC(y, mo - 1, da, h, mi) >= Date.UTC(2026, 10, 1, 2, 0) ? 5 : 4;
  return Date.UTC(y, mo - 1, da, h + off, mi);
}

// "Now" is Monday, Nov 16 2026, 7:40 PM Eastern. It keeps ticking from there.
const BASE = et('2026-11-16 19:40');
const LOADED = Date.now();
export const now = () => BASE + (Date.now() - LOADED);

const cache = {};
function f(tz, opts) {
  const k = tz + JSON.stringify(opts);
  return (cache[k] ??= new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }));
}
const clean = (s) => s.replace(/[  ]/g, ' ');

export const fmtTime = (ms, tz) => clean(f(tz, { hour: 'numeric', minute: '2-digit' }).format(ms));
export const fmtShortDate = (ms, tz) => f(tz, { month: 'short', day: 'numeric' }).format(ms);
export const fmtWeekday = (ms, tz) => f(tz, { weekday: 'short' }).format(ms);
export const fmtLongDay = (ms, tz) => f(tz, { weekday: 'long', month: 'short', day: 'numeric' }).format(ms);
export const tzName = (ms, tz) =>
  f(tz, { timeZoneName: 'short' }).formatToParts(ms).find((p) => p.type === 'timeZoneName')?.value ?? '';

export function dayKey(ms, tz) {
  const p = f(tz, { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ms);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
export const dayDiff = (a, b, tz) =>
  Math.round((Date.parse(dayKey(a, tz) + 'T00:00:00Z') - Date.parse(dayKey(b, tz) + 'T00:00:00Z')) / 864e5);

export function dayDividerLabel(ms, tz) {
  const d = dayDiff(now(), ms, tz);
  const base = fmtLongDay(ms, tz);
  if (d === 0) return `Today · ${base}`;
  if (d === 1) return `Yesterday · ${base}`;
  return base;
}

// "Sat 9:16 AM" within the last week, otherwise "Oct 9, 8:55 AM"
export function stamp(ms, tz) {
  const d = dayDiff(now(), ms, tz);
  if (d === 0) return `Today ${fmtTime(ms, tz)}`;
  if (d === 1) return `Yesterday ${fmtTime(ms, tz)}`;
  if (d < 7) return `${fmtWeekday(ms, tz)} ${fmtTime(ms, tz)}`;
  return `${fmtShortDate(ms, tz)}, ${fmtTime(ms, tz)}`;
}

export function agoShort(ms, tz) {
  const d = dayDiff(now(), ms, tz);
  if (d === 0) return fmtTime(ms, tz);
  if (d === 1) return 'Yesterday';
  if (d < 7) return fmtWeekday(ms, tz);
  return fmtShortDate(ms, tz);
}

export function monthLabel(ms, tz) {
  return f(tz, { month: 'long' }).format(ms);
}

export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
