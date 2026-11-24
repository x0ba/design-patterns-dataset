// December 2026 calendar helpers. The app is pinned to the moment Marisol opens it:
// Monday, November 16, 2026, 8:47 AM. The rotation publishes to vendors Friday, November 20.

export const YEAR = 2026;
export const MONTH = 11; // December (0-based)
export const DAYS_IN_MONTH = 31;
export const DAYS = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

export const NOW_LABEL = 'Mon, Nov 16 · 8:47 AM';
export const PUBLISH_DEADLINE = 'Fri, Nov 20';
export const DAYS_TO_PUBLISH = 4;

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dow(day: number): number {
  return new Date(YEAR, MONTH, day).getDay();
}
export function dowShort(day: number): string {
  return DOW_SHORT[dow(day)];
}
export function dowLong(day: number): string {
  return DOW_LONG[dow(day)];
}
export function dayLabel(day: number): string {
  return `${dowShort(day)} Dec ${day}`;
}
export function dayLabelLong(day: number): string {
  return `${dowLong(day)}, December ${day}`;
}

export interface Holiday {
  day: number;
  kind: 'closed' | 'partial';
  label: string;
  closesAt?: string;
}

export const HOLIDAYS: Holiday[] = [
  { day: 24, kind: 'partial', label: 'Christmas Eve — city closes 13:00', closesAt: '13:00' },
  { day: 25, kind: 'closed', label: 'Christmas Day — city holiday, no vending' },
];

export function holidayFor(day: number): Holiday | undefined {
  return HOLIDAYS.find((h) => h.day === day);
}

/** Weeks run Monday–Sunday, clipped to December. */
export interface Week {
  index: number;
  days: (number | null)[]; // 7 entries Mon..Sun; null if outside December
  label: string;
}

function buildWeeks(): Week[] {
  const weeks: Week[] = [];
  // Find Monday on or before Dec 1
  const firstDow = dow(1); // 2 = Tue
  const offset = (firstDow + 6) % 7; // days since Monday
  let start = 1 - offset;
  let index = 0;
  while (start <= DAYS_IN_MONTH) {
    const days: (number | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const d = start + i;
      days.push(d >= 1 && d <= DAYS_IN_MONTH ? d : null);
    }
    const real = days.filter((d): d is number => d !== null);
    const label =
      start < 1
        ? `Nov ${30 + start} – Dec ${real[real.length - 1]}`
        : start + 6 > DAYS_IN_MONTH
          ? `Dec ${real[0]} – Jan ${start + 6 - DAYS_IN_MONTH}`
          : `Dec ${real[0]} – ${real[real.length - 1]}`;
    weeks.push({ index, days, label });
    start += 7;
    index++;
  }
  return weeks;
}

export const WEEKS = buildWeeks();

export function weekOfDay(day: number): number {
  return WEEKS.findIndex((w) => w.days.includes(day));
}
