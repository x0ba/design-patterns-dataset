/**
 * Phoenix does not observe DST, so America/Phoenix is always UTC-7.
 * The demo clock starts at the moment Rafa is looking at the app (Tue 9:42 PM)
 * and advances with real time from there.
 */
export const TZ = 'America/Phoenix';

const PAGE_LOAD_MS = Date.now();
const MOCK_START_MS = Date.parse('2026-11-17T21:42:00-07:00');

export function nowMs(): number {
  return MOCK_START_MS + (Date.now() - PAGE_LOAD_MS);
}

export function fmtTime(when: string | number): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(when));
}

export function fmtDay(when: string | number): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(when));
}

export function fmtDayLong(when: string | number): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(when));
}

export function fmtDateTime(when: string | number): string {
  return `${fmtDay(when)} · ${fmtTime(when)}`;
}

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}
