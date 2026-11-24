import { createContext, useContext } from 'react'

// Freshwatch opens at Monday, Nov 16 2026, 6:40 AM and keeps time from there.
export const BASE = new Date(2026, 10, 16, 6, 40, 0)
export const at = (dayOffset: number, h: number, m = 0) => new Date(2026, 10, 16 + dayOffset, h, m)
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtClock(d: Date) {
  let h = d.getHours()
  const m = d.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}
export function minToClock(min: number) {
  return fmtClock(new Date(2026, 10, 16, Math.floor(min / 60), min % 60))
}
export function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}
export function fmtWhen(d: Date, now: Date) {
  if (sameDay(d, now)) return fmtClock(d)
  return `${DOW[d.getDay()]} ${fmtClock(d)}`
}
export function fmtDate(d: Date) {
  return `${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`
}
export function fmtDur(mins: number) {
  mins = Math.max(0, Math.round(mins))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h >= 72) {
    const dd = Math.floor(h / 24)
    return `${dd}d ${h % 24}h`
  }
  return m ? `${h}h ${m}m` : `${h}h`
}
export function ago(d: Date, now: Date) {
  return fmtDur((now.getTime() - d.getTime()) / 60000) + ' ago'
}
export function minutesSince(d: Date, now: Date) {
  return Math.round((now.getTime() - d.getTime()) / 60000)
}
export function nowMinutes(now: Date) {
  return now.getHours() * 60 + now.getMinutes()
}

export const NowContext = createContext<Date>(BASE)
export const useNow = () => useContext(NowContext)
