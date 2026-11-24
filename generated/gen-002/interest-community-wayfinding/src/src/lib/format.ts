const DAY = 86400000;

// The story's "now": Tuesday, Nov 17, 2026, 12:20 p.m. (Lorna's lunch break). Seeded times are
// written against this clock, so they read the same whatever the machine's date is. The clock
// moves forward at real speed from page load, so new views get sensible timestamps.
const STORY_NOW = new Date(2026, 10, 17, 12, 20).getTime();
const LOADED_AT = Date.now();

export function nowMs(): number {
  return STORY_NOW + (Date.now() - LOADED_AT);
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today, 12:41 p.m." / "Yesterday, 12:41 p.m." / "Monday, 2:05 p.m." / "Nov 14, 9:12 a.m." */
export function formatWhen(ts: number, now: number = nowMs()): string {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  const time = formatTime(ts);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  if (days > 1 && days < 7) {
    return `${new Date(ts).toLocaleDateString('en-US', { weekday: 'long' })}, ${time}`;
  }
  return `${new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

/** Day group used by the Recently viewed list. */
export function dayGroup(ts: number, now: number = nowMs()): 'Today' | 'Yesterday' | 'Earlier' {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return 'Earlier';
}

/** "Saturday, November 21 at 10:00 a.m." */
export function formatMeetup(ts: number): string {
  const day = new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return `${day} at ${formatTime(ts)}`;
}

/** "Nov 3" */
export function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/** Compact member count for tight spaces: 1240000 -> "1.24M", 612400 -> "612K". */
export function formatMembers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return formatCount(n);
}

export function plural(n: number, word: string): string {
  return `${formatCount(n)} ${word}${n === 1 ? '' : 's'}`;
}
