// All times are minutes after midnight on the studio day (Mon 16 Nov 2026).

export const DAY_START = 8 * 60; // 8:00 AM opening
export const DAY_END = 22 * 60; // 10:00 PM close
export const TURNAROUND = 30; // minutes of clean-down between bookings in one bay
export const MIN_EXTENSION = 60; // minimum length of any extension, in minutes
export const RATE_PER_HOUR = 85; // USD
export const NOW = 13 * 60 + 10; // scenario clock: 1:10 PM
export const KOFI_UNTIL = 18 * 60; // Kofi Mensah on shift until 6:00 PM
export const JAS_FROM = 18 * 60; // Jas takes over at 6:00 PM and works to close

export function fmtTime(m: number): string {
  const h24 = Math.floor(m / 60) % 24;
  const mins = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return `${h12}:${String(mins).padStart(2, '0')} ${ampm}`;
}

// Compact form for tight labels: "3:00", "10:30", "12:00" (no AM/PM)
export function fmtShort(m: number): string {
  const h24 = Math.floor(m / 60) % 24;
  const mins = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return mins === 0 ? `${h12}` : `${h12}:${String(mins).padStart(2, '0')}`;
}

export function fmtRange(start: number, end: number): string {
  const sAp = Math.floor(start / 60) < 12 ? 'AM' : 'PM';
  const eAp = Math.floor(end / 60) < 12 ? 'AM' : 'PM';
  const left = fmtShort(start);
  const right = fmtShort(end);
  return sAp === eAp ? `${left}–${right} ${eAp}` : `${left} ${sAp}–${right} ${eAp}`;
}

export function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Cost of a block of time at the standard rate, in cents.
export function chargeCents(mins: number): number {
  return Math.round((mins / 60) * RATE_PER_HOUR * 100);
}

export function pct(m: number): number {
  return ((m - DAY_START) / (DAY_END - DAY_START)) * 100;
}
