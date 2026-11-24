export const TODAY = '2026-11-17'
export const WINDOW = { start: '2027-03-09', end: '2027-04-24' }
export const CREW = 25
const D = 86400000
export const toTime = (iso) => Date.parse(iso + 'T12:00:00Z')
export const toIso = (t) => new Date(t).toISOString().slice(0, 10)
export const addDays = (iso, n) => toIso(toTime(iso) + n * D)
export const diffDays = (a, b) => Math.round((toTime(b) - toTime(a)) / D)
export const WINDOW_DAYS = diffDays(WINDOW.start, WINDOW.end) + 1
export const DAYS_TO_START = diffDays(TODAY, WINDOW.start)
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export function fmt(iso, withYear = false) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${MON[m - 1]} ${d}${withYear ? `, ${y}` : ''}`
}
export function fmtRange(a, b) {
  const ya = a.slice(0, 4), yb = b.slice(0, 4)
  if (ya !== yb) return `${fmt(a, true)} – ${fmt(b, true)}`
  return `${fmt(a)} – ${fmt(b)}${yb !== '2027' ? ', ' + yb : ''}`
}
// availability of a location against the shoot window
export function availability(blackouts) {
  const blocked = new Set()
  const hits = []
  for (const b of blackouts) {
    const s = Math.max(toTime(b.from), toTime(WINDOW.start))
    const e = Math.min(toTime(b.to), toTime(WINDOW.end))
    if (s <= e) {
      hits.push(b)
      for (let t = s; t <= e; t += D) blocked.add(toIso(t))
    }
  }
  const n = blocked.size
  const state = n === 0 ? 'clear' : n >= WINDOW_DAYS * 0.8 ? 'blocked' : 'partial'
  return { state, blockedDays: n, hits }
}
