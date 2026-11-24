let seq = 0
const salt = Date.now().toString(36)
export const uid = (p: string) => `${p}${salt}${++seq}`

/** The huddle starts at 07:00; the screen is being used from about 07:24. */
const T0 = Date.now()
const START_MIN = 7 * 60 + 24
export const nowMinutes = () => START_MIN + Math.floor((Date.now() - T0) / 60000)
export const fmtTime = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const nowLabel = () => fmtTime(nowMinutes())

export const CHANGEOVER_MIN = 13 * 60 + 30
export function untilChangeover(): string {
  const left = CHANGEOVER_MIN - nowMinutes()
  if (left <= 0) return 'now'
  const h = Math.floor(left / 60)
  const m = left % 60
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min left` : `${m} min left`
}

export const fmtTorque = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n))
