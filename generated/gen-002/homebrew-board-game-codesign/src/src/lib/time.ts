/** The app opens at Sunday afternoon, the day after the Saturday playtest. */
export const at = (day: number, h = 0, m = 0, month = 10, year = 2026) => new Date(year, month, day, h, m);
export const NOW = at(15, 15, 12);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function clock(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
export function dayLabel(d: Date) {
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
export function dateShort(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function when(d: Date, now = NOW) {
  const diff = (now.getTime() - d.getTime()) / 60000;
  if (diff < 1) return 'just now';
  if (diff < 60) return `${Math.round(diff)} min ago`;
  if (sameDay(d, now)) return `${clock(d)} today`;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (sameDay(d, y)) return `${clock(d)} yesterday`;
  return `${dateShort(d)}, ${clock(d)}`;
}
export function dur(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

const LOADED = Date.now();
/** Scenario clock: starts at Sunday 3:12 pm and ticks forward in real time. */
export const nowV = () => new Date(NOW.getTime() + (Date.now() - LOADED));
