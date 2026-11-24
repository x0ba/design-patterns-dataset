// Small date helpers. Dates are 'YYYY-MM-DD' strings; math is done in whole UTC days.

export const TODAY = '2026-11-16'
export const HISTORY_START = '2025-09-16'

const MS = 86400000

export function toDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / MS)
}

export function fromDay(day: number): string {
  const dt = new Date(day * MS)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function parts(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return { y, m, d }
}

export function addDays(isoDate: string, n: number): string {
  return fromDay(toDay(isoDate) + n)
}

export function addMonths(isoDate: string, n: number): string {
  const { y, m, d } = parts(isoDate)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
  return iso(ny, nm, Math.min(d, last))
}

/** 0 = Monday … 6 = Sunday */
export function weekday(isoDate: string): number {
  return (toDay(isoDate) + 3) % 7
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

/** "Nov 2" for this year, "Oct 21, 2025" for other years. */
export function fmtDate(isoDate: string): string {
  const { y, m, d } = parts(isoDate)
  const base = `${MONTHS_SHORT[m - 1]} ${d}`
  return y === parts(TODAY).y ? base : `${base}, ${y}`
}

export function fmtDateLong(isoDate: string): string {
  const { y, m, d } = parts(isoDate)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

export function ordinal(n: number): string {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

export function fmtMoney(cents: number, opts: { noCents?: boolean } = {}): string {
  const abs = Math.abs(cents) / 100
  const whole = Number.isInteger(abs)
  const s = abs.toLocaleString('en-US', {
    minimumFractionDigits: opts.noCents && whole ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return `${cents < 0 ? '−' : ''}$${s}`
}
