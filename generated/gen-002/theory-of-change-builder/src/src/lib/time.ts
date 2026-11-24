// The app opens on Tuesday, Nov 17, 2026 at 10:40 am. Time keeps moving from there.
export const OPEN_AT = new Date(2026, 10, 17, 10, 40, 0).getTime()
const loadedAt = typeof performance !== 'undefined' ? performance.now() : 0

export const now = () => OPEN_AT + (performance.now() - loadedAt)

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
export const ago = (ms: number) => OPEN_AT - ms
export { MIN, HOUR, DAY }

export const DUE = new Date(2026, 10, 20, 17, 0, 0).getTime() // Friday

const fmtDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

export function relTime(ts: number): string {
  const d = now() - ts
  if (d < 45_000) return 'just now'
  if (d < HOUR) return `${Math.max(1, Math.round(d / MIN))} min ago`
  if (d < 22 * HOUR) {
    const h = Math.round(d / HOUR)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  const dt = new Date(ts)
  const today = new Date(now())
  const yest = new Date(now() - DAY)
  if (dt.toDateString() === yest.toDateString()) return `Yesterday, ${fmtTime.format(dt)}`
  if (dt.toDateString() === today.toDateString()) return fmtTime.format(dt)
  return fmtDate.format(dt)
}

export const dateLabel = (ts: number) => fmtDate.format(new Date(ts))
export const longDate = (ts: number) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ts))
