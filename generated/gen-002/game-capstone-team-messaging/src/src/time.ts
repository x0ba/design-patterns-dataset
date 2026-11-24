import { MOCK_NOW } from './data'

const TZ = 'America/Los_Angeles'
const LOAD = Date.now()

/** "Now" inside the mock world: starts Sunday 7:42 PM and ticks with real time. */
export const appNow = () => new Date(MOCK_NOW.getTime() + (Date.now() - LOAD))

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...o })
const fTime = fmt({ hour: 'numeric', minute: '2-digit' })
const fDay = fmt({ year: 'numeric', month: 'numeric', day: 'numeric' })
const fLong = fmt({ weekday: 'long', month: 'long', day: 'numeric' })
const fShort = fmt({ weekday: 'short', month: 'short', day: 'numeric' })
const fWd = fmt({ weekday: 'short' })
const fMD = fmt({ month: 'short', day: 'numeric' })

export const timeOf = (d: Date) => fTime.format(d)
const dayKey = (d: Date) => fDay.format(d)

export function dayDiff(d: Date, now = appNow()) {
  const a = new Date(dayKey(d)).getTime()
  const b = new Date(dayKey(now)).getTime()
  return Math.round((b - a) / 86400000)
}

export function dayLabel(iso: string) {
  const d = new Date(iso)
  const diff = dayDiff(d)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return fLong.format(d)
}

/** Sidebar timestamp: time today, weekday this week, otherwise date. */
export function listStamp(iso: string) {
  const d = new Date(iso)
  const diff = dayDiff(d)
  if (diff === 0) return timeOf(d)
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return fWd.format(d)
  return fMD.format(d)
}

export function fullStamp(iso: string) {
  const d = new Date(iso)
  return `${fShort.format(d)} at ${timeOf(d)}`
}

export function shortDate(iso: string) {
  return fMD.format(new Date(iso))
}

export const sameDay = (a: string, b: string) => dayKey(new Date(a)) === dayKey(new Date(b))

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday']
const WEEK_ABBR = ['Mon', 'Tue', 'Wed', 'Thu']

export function clock(mins: number, withSuffix = true, alwaysMinutes = false) {
  const h24 = Math.floor(mins / 60)
  const m = mins % 60
  const h12 = ((h24 + 11) % 12) + 1
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  return `${h12}${m || alwaysMinutes ? ':' + String(m).padStart(2, '0') : ''}${withSuffix ? ' ' + suffix : ''}`
}

export function slotLabel(day: number, start: number, end: number, long = false) {
  const date = 16 + day
  const dn = long ? WEEK_DAYS[day] : WEEK_ABBR[day]
  const endsPm = end >= 12 * 60
  const startsPm = start >= 12 * 60
  const range = startsPm === endsPm ? `${clock(start, false, true)}–${clock(end, true, true)}` : `${clock(start, true, true)}–${clock(end, true, true)}`
  return `${dn}, Nov ${date} · ${range} PT`
}

export function daysUntil(to: Date) {
  return -dayDiff(to)
}
