// The app is opened in the state Ellen sees on Saturday afternoon, 14 Nov 2026.
// The demo clock starts there and moves forward with real elapsed time.
const DEMO_START = new Date(2026, 10, 14, 15, 20, 0); // months are 0-based
const LOADED_AT = Date.now();

export function demoNow() {
  return new Date(DEMO_START.getTime() + (Date.now() - LOADED_AT));
}

// Forecast hard freeze: Tuesday 17 Nov 2026, from 10 pm.
export const FREEZE_AT = new Date(2026, 10, 17, 22, 0, 0);

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(d) {
  return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(d) {
  let h = d.getHours();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDate(d)}, ${h}:${m} ${ap}`;
}

export function fmtTime(d) {
  let h = d.getHours();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
}

// Parses ISO-ish strings written in the seed data ("2026-11-14T13:50") to Date.
export function parseSeed(s) {
  const [date, time = '00:00'] = s.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
}

// Countdown to the freeze, as "2 d 6 h" / "5 h 40 m" / "passed".
export function untilFreeze(now) {
  const ms = FREEZE_AT.getTime() - now.getTime();
  if (ms <= 0) return 'freeze window now';
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d} d ${h} h`;
  return `${h} h ${String(m).padStart(2, '0')} m`;
}
