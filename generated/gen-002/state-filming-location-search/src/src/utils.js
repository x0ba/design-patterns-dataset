import { TODAY, diffDays, fmt, fmtRange, WINDOW_DAYS, DAYS_TO_START, CREW } from './data/dates.js'
export const nf = (n) => n.toLocaleString('en-US')
export const STATUS = {
  active: { label: 'Owner active', short: 'Active', cls: 'ok' },
  unresponsive: { label: 'Owner unresponsive', short: 'Unresponsive', cls: 'warn' },
  declined: { label: 'Declined filming', short: 'Declined', cls: 'bad' },
}
export function availInfo(loc) {
  const a = loc.avail
  if (a.state === 'clear') return { cls: 'ok', label: `Open all ${WINDOW_DAYS} days`, detail: 'No blackout dates in the shoot window.' }
  const first = a.hits[0]
  const range = fmtRange(first.from < '2027-03-09' ? '2027-03-09' : first.from, first.to > '2027-04-24' ? '2027-04-24' : first.to)
  if (a.state === 'blocked') return { cls: 'bad', label: `Blocked ${a.blockedDays} of ${WINDOW_DAYS} days`, detail: `${first.reason} (${range}).` }
  return { cls: 'warn', label: `${a.blockedDays} day${a.blockedDays > 1 ? 's' : ''} blocked`, detail: `${first.reason} (${range}).` }
}
export function leadInfo(loc) {
  const slack = DAYS_TO_START - loc.permitLead
  return { cls: slack < 28 ? 'warn' : 'ok', label: `${loc.permitLead} days`, slack }
}
export function parkingInfo(loc) {
  return { cls: loc.parking < CREW ? 'bad' : 'ok', label: `${nf(loc.parking)} spaces` }
}
export function ago(iso) {
  const d = diffDays(iso, TODAY)
  if (d < 1) return 'today'
  if (d < 14) return `${d} days ago`
  if (d < 60) return `${Math.round(d / 7)} weeks ago`
  return `${Math.round(d / 30)} months ago`
}
export const prodText = (p) => `${p.title}${p.season ? ' ' + p.season : ''} (${p.year})`
export const metaLine = (l) => `${l.town}, ${l.county} Co.`
export function closureText(c) {
  if (c.maxNights === 0) return 'No overnight closures'
  return `Up to ${c.maxNights} night${c.maxNights > 1 ? 's' : ''}`
}
export { fmt, fmtRange }
