// Wall-clock helpers. Replay timestamps are neighbourhood-local, so we do all
// calendar math in UTC and never touch the viewer's timezone.
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const STEP_MIN = 10

export function parts(startMs, frame) {
  const d = new Date(startMs + Math.round(frame) * STEP_MIN * 60000)
  return {
    dow: d.getUTCDay(),
    mon: d.getUTCMonth(),
    day: d.getUTCDate(),
    h: d.getUTCHours(),
    m: d.getUTCMinutes(),
  }
}
export function clock(startMs, frame) {
  const { h, m } = parts(startMs, frame)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`
}
export function dayLabel(startMs, frame) {
  const p = parts(startMs, frame)
  return `${DOW[p.dow]}, ${MON[p.mon]} ${p.day}`
}
export function stamp(startMs, frame) {
  return `${dayLabel(startMs, frame)} · ${clock(startMs, frame)}`
}
export function stampLong(startMs, frame) {
  const p = parts(startMs, frame)
  return `${DOW_LONG[p.dow]}, ${MON[p.mon]} ${p.day}, ${clock(startMs, frame)}`
}
export function shortStamp(startMs, frame) {
  const p = parts(startMs, frame)
  return `${DOW[p.dow]} ${clock(startMs, frame)}`
}
export function dowOf(startMs, frame) {
  return DOW[parts(startMs, frame).dow]
}
export function mmss(sec) {
  sec = Math.max(0, Math.round(sec))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
export function frameAt(startMs, y, mo, d, h, mi = 0) {
  return Math.round((Date.UTC(y, mo - 1, d, h, mi) - startMs) / (STEP_MIN * 60000))
}
