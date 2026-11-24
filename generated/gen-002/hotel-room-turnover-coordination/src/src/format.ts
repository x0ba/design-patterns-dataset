import type { Minutes, RoomType, Status, Role } from './types'

export const NOW0: Minutes = 10 * 60 + 40

export function fmtTime(at: Minutes, withSuffix = false): string {
  let day = ''
  let m = at
  if (m < 0) {
    day = 'Mon '
    m += 1440
  }
  m = Math.floor(m)
  const h = Math.floor(m / 60)
  const mm = m % 60
  const h12 = h % 12 === 0 ? 12 : h % 12
  const suffix = h >= 12 ? ' pm' : ' am'
  const show = day !== '' || withSuffix || h >= 12
  return `${day}${h12}:${String(mm).padStart(2, '0')}${show ? suffix : ''}`
}

export function fmtClock(at: Minutes): { hm: string; ss: string } {
  const total = Math.floor(at * 60)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const h12 = h % 12 === 0 ? 12 : h % 12
  return { hm: `${h12}:${String(m).padStart(2, '0')}`, ss: String(s).padStart(2, '0') }
}

export function ago(now: Minutes, at: Minutes): string {
  const d = Math.max(0, now - at)
  if (d < 1) return 'just now'
  if (d < 60) return `${Math.floor(d)} min ago`
  if (at < 0) return fmtTime(at)
  const h = Math.floor(d / 60)
  return `${h} h ${Math.floor(d % 60)} min ago`
}

export const TYPE_LABEL: Record<RoomType, string> = {
  king: 'King',
  dq: 'Double queen',
  suite: 'Suite',
}
export const TYPE_SHORT: Record<RoomType, string> = { king: 'K', dq: 'DQ', suite: 'S' }

export const STATUS_LABEL: Record<Status, string> = {
  occupied: 'Occupied',
  dueout: 'Due out',
  dirty: 'Vacant dirty',
  cleaning: 'Cleaning in progress',
  clean: 'Clean',
  inspected: 'Inspected',
  ooo: 'Out of order',
}
export const STATUS_SHORT: Record<Status, string> = {
  occupied: 'Occupied',
  dueout: 'Due out',
  dirty: 'Vacant dirty',
  cleaning: 'Cleaning',
  clean: 'Clean',
  inspected: 'Inspected',
  ooo: 'Out of order',
}
export const STATUS_ORDER: Status[] = ['occupied', 'dueout', 'dirty', 'cleaning', 'clean', 'inspected', 'ooo']

export const ROLE_LABEL: Record<Role, string> = {
  housekeeping: 'Housekeeping',
  frontdesk: 'Front desk',
  maintenance: 'Maintenance',
  system: 'System',
}
