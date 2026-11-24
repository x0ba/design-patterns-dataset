export type Status = 'occupied' | 'dueout' | 'dirty' | 'cleaning' | 'clean' | 'inspected' | 'ooo'
export type RoomType = 'king' | 'dq' | 'suite'
export type Role = 'housekeeping' | 'frontdesk' | 'maintenance' | 'system'
export type Actor = 'marisol' | 'kenji'
export type Tier = 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Member'

/** Minutes since Tuesday 00:00. Negative values are Monday. */
export type Minutes = number

export interface Change {
  verb: string
  by: string
  at: Minutes
}

export interface OooInfo {
  reason: string
  who: string
  since: Minutes
  estLabel: string
  estAt: Minutes | null
  note?: string
  noteAt?: Minutes
}

export interface Room {
  id: number
  floor: number
  type: RoomType
  accessible: boolean
  status: Status
  attendant: string
  /** On today's housekeeping list (turnover or stayover service) */
  onList: boolean
  /** Occupied rooms: stayover service done today */
  serviced: boolean
  guestId: string | null
  rush: Minutes | null
  startedAt: Minutes | null
  last: Change
  ooo?: OooInfo
}

export type Presence = 'active' | 'break' | 'away'

export interface Attendant {
  id: string
  name: string
  full: string
  presence: Presence
  where: number | null
  lastSeen: Minutes
  backAt?: Minutes
}

export interface Guest {
  id: string
  name: string
  org: string
  tier: Tier
  nights: number
  early: boolean
  rank: number | null
  needBy: Minutes | null
  type: RoomType
  accessible: boolean
  need?: string
  roomId: number | null
}

export interface FeedEvent {
  id: string
  at: Minutes
  room: number | null
  verb: string
  by: string
  role: Role
}

export interface Toast {
  id: number
  tone: 'ok' | 'warn' | 'info'
  text: string
  switchTo?: Actor
}

export interface State {
  now: Minutes
  rooms: Room[]
  attendants: Attendant[]
  guests: Guest[]
  feed: FeedEvent[]
  actor: Actor
  selRoom: number | null
  selGuest: string | null
  statusFilter: Status | null
  attFilter: string | null
  tab: 'early' | 'standard'
  hideAssigned: boolean
  feedFilter: Role | 'all'
  live: boolean
  toast: Toast | null
  rng: number
  nextEventAt: number
  scriptIdx: number
  elapsed: number
  dmitriAt: number | null
  evCounter: number
}
