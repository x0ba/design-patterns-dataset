// Storm clock. Minutes are counted from 00:00 on the morning of 17 Nov 2026.
// Times at or after 12:00 belong to the previous evening, so 17:30 is -390
// and 02:40 is 160. The app opens at 02:40 and runs forward in real time.

export const CLOCK_AT_OPEN = 160;

/** 'HH:MM' (24h) to storm-clock minutes. */
export function t(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  const mins = h * 60 + m;
  return h >= 12 ? mins - 1440 : mins;
}

/** Storm-clock minutes to 'HH:MM' (24h). */
export function hm(mins: number): string {
  const v = ((Math.floor(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}

/** 'HH:MM' (24h) to '6:00 AM' style. */
export function h12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Elapsed time from `then` to `now` as '74 min' or '2 h 05 m'. */
export function elapsed(then: number, now: number): string {
  const diff = Math.max(0, Math.floor(now - then));
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)} h ${String(diff % 60).padStart(2, '0')} m`;
}

export function minutesSince(then: number, now: number): number {
  return Math.max(0, Math.floor(now - then));
}
