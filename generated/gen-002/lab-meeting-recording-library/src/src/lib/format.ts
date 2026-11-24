export const clock = (s: number): string => {
  s = Math.max(0, Math.floor(s))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export const dur = (s: number): string => {
  const m = Math.max(0, Math.round(s / 60))
  if (m < 1) return s > 0 ? '<1 min' : '0 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${String(r).padStart(2, '0')} min` : `${h} h`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}
export const shortDate = (iso: string): string => {
  const { m, d } = parse(iso)
  return `${MONTHS[m - 1]} ${d}`
}
export const daysBetween = (a: string, b: string): number => {
  const pa = parse(a)
  const pb = parse(b)
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000)
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const weekday = (iso: string): string => {
  const { y, m, d } = parse(iso)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}
export const rate = (r: number): string => `${r}×`
