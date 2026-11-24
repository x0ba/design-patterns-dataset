// All times are wall-clock minutes relative to Mon Nov 16 2026, 00:00 (negative = earlier).
// Deliberately timezone-free so the demo reads the same on any machine.

const BASE = Date.UTC(2026, 10, 16)
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const DAY = 1440
export const STEP = 15

export const dateOf = (m: number) => new Date(BASE + m * 60000)
export const dowOf = (m: number) => dateOf(m).getUTCDay()
export const dayStart = (m: number) => Math.floor(m / DAY) * DAY
export const minOfDay = (m: number) => ((m % DAY) + DAY) % DAY

/** minutes for a calendar date in the Oct 28 – Nov 27 2026 window */
export const at = (month: number, day: number, h = 0, mi = 0) =>
  Math.round((Date.UTC(2026, month - 1, day, h, mi) - BASE) / 60000)

export function fmtTime(m: number, opts: { suffix?: boolean } = {}) {
  const mod = minOfDay(m)
  let h = Math.floor(mod / 60)
  const mi = mod % 60
  const ap = h >= 12 ? 'pm' : 'am'
  h = h % 12 === 0 ? 12 : h % 12
  const t = `${h}:${String(mi).padStart(2, '0')}`
  return opts.suffix === false ? t : `${t} ${ap}`
}

export const fmtHour = (h: number) => {
  const hh = ((h % 24) + 24) % 24
  const ap = hh >= 12 ? 'pm' : 'am'
  return `${hh % 12 === 0 ? 12 : hh % 12} ${ap}`
}

export const fmtDow = (m: number) => DOW[dowOf(m)]
export const fmtDate = (m: number) => {
  const d = dateOf(m)
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`
}
export const fmtDayDate = (m: number) => `${fmtDow(m)} ${fmtDate(m)}`
export const fmtStamp = (m: number) => `${fmtDate(m)}, ${fmtTime(m)}`
export const fmtDayTime = (m: number) => `${fmtDow(m)} ${fmtTime(m)}`

export const fmtDur = (min: number) => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

export const isWeekday = (m: number) => {
  const d = dowOf(m)
  return d >= 1 && d <= 5
}

/** TOU-B on-peak: 4–9 pm, weekdays */
export const isOnPeak = (m: number) => {
  const mod = minOfDay(m)
  return isWeekday(m) && mod >= 16 * 60 && mod < 21 * 60
}

// Scenario anchors
export const NOW = at(11, 16, 15, 40)
export const CYCLE_START = at(10, 28, 12, 0)
export const CYCLE_END = at(11, 27, 12, 0)
export const EVENT_START = at(11, 17, 17, 0)
export const EVENT_END = at(11, 17, 20, 0)
