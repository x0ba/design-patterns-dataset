/** Qualifying closes Friday at noon (local time). */
export const DEADLINE = new Date(2026, 10, 20, 12, 0, 0);
export const CURE_BY_LABEL = "Fri, Nov 20 · 12:00 PM";

export function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** "2026-11-17T10:19:00" -> "10:19 AM" */
export function fmtTime(localIso: string): string {
  return new Date(localIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "2026-11-17T10:19:00" -> "Nov 17, 2026" */
export function fmtDay(localIso: string): string {
  return new Date(localIso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "2019-08-03" -> "Aug 3, 2019" (no timezone shift) */
export function fmtDateOnly(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function fmtClock(d: Date): string {
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function fmtTimeOfDay(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function timeRemaining(now: Date): { closed: boolean; days: number; hours: number; minutes: number } {
  const diff = DEADLINE.getTime() - now.getTime();
  if (diff <= 0) return { closed: true, days: 0, hours: 0, minutes: 0 };
  const minutesTotal = Math.floor(diff / 60000);
  return {
    closed: false,
    days: Math.floor(minutesTotal / (60 * 24)),
    hours: Math.floor((minutesTotal % (60 * 24)) / 60),
    minutes: minutesTotal % 60,
  };
}
