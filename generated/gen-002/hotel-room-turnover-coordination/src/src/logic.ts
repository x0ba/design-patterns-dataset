import type { Attendant, Guest, Minutes, Room, State, Status } from './types'

export const CLEAN_MIN = 26
export const INSPECT_MIN = 6
export const MAX_LIST = 16

export interface Eta {
  at: Minutes | null
  kind: 'ready' | 'soon' | 'unattended'
}

export const roomIdx = (id: number) => (Math.floor(id / 100) - 3) * 18 + ((id % 100) - 1)

const round5 = (m: number) => Math.ceil(m / 5) * 5

export interface AttStat {
  total: number
  done: number
  current: Room | null
  next: Room | null
  queue: Room[]
}

export interface Derived {
  byId: Map<number, Room>
  counts: Record<Status, number>
  eta: Map<number, Eta>
  att: Map<string, AttStat>
  guestById: Map<string, Guest>
  departuresOut: number
  departuresTotal: number
}

export const isDone = (r: Room) => r.onList && (r.status === 'clean' || r.status === 'inspected' || (r.status === 'occupied' && r.serviced))

const byRush = (a: Room, b: Room) => {
  if (a.rush != null && b.rush != null) return a.rush - b.rush
  if (a.rush != null) return -1
  if (b.rush != null) return 1
  return a.id - b.id
}

export function derive(s: State): Derived {
  const byId = new Map<number, Room>()
  const counts: Record<Status, number> = { occupied: 0, dueout: 0, dirty: 0, cleaning: 0, clean: 0, inspected: 0, ooo: 0 }
  for (const r of s.rooms) {
    byId.set(r.id, r)
    counts[r.status]++
  }
  const attById = new Map<string, Attendant>(s.attendants.map((a) => [a.id, a]))
  const att = new Map<string, AttStat>()
  const eta = new Map<number, Eta>()

  for (const a of s.attendants) {
    const mine = s.rooms.filter((r) => r.attendant === a.id)
    const onList = mine.filter((r) => r.onList)
    const queue = mine.filter((r) => r.status === 'dirty').sort(byRush)
    const current = mine.find((r) => r.status === 'cleaning') ?? null
    att.set(a.id, {
      total: onList.length,
      done: onList.filter(isDone).length,
      current,
      next: queue[0] ?? null,
      queue,
    })
  }

  const inspectQ = s.rooms.filter((r) => r.status === 'clean').sort(byRush)
  const now = s.now

  for (const r of s.rooms) {
    if (r.status === 'inspected') eta.set(r.id, { at: now, kind: 'ready' })
    else if (r.status === 'clean') {
      const pos = inspectQ.indexOf(r)
      eta.set(r.id, { at: round5(now + 3 + pos * 2.5), kind: 'soon' })
    } else if (r.status === 'cleaning' || r.status === 'dirty') {
      const a = attById.get(r.attendant)!
      const st = att.get(a.id)!
      let start: number | null = now
      if (a.presence === 'break' && a.backAt) start = Math.max(now, a.backAt)
      else if (a.presence === 'away') start = null
      if (start == null) {
        eta.set(r.id, { at: null, kind: 'unattended' })
        continue
      }
      if (r.status === 'cleaning') {
        const fin = Math.max((r.startedAt ?? now) + CLEAN_MIN, start + 3)
        eta.set(r.id, { at: round5(fin + INSPECT_MIN), kind: 'soon' })
      } else {
        const pos = st.queue.indexOf(r)
        const busy = st.current ? Math.max(3, (st.current.startedAt ?? now) + CLEAN_MIN - start) : 0
        eta.set(r.id, { at: round5(start + busy + (pos + 1) * CLEAN_MIN + INSPECT_MIN), kind: 'soon' })
      }
    }
  }

  return {
    byId,
    counts,
    eta,
    att,
    guestById: new Map(s.guests.map((g) => [g.id, g])),
    departuresOut: 61 - counts.dueout,
    departuresTotal: 61,
  }
}

export interface Candidate {
  room: Room
  eta: Eta
}

export function candidatesFor(s: State, d: Derived, g: Guest): Candidate[] {
  const out: Candidate[] = []
  for (const r of s.rooms) {
    if (r.guestId) continue
    if (r.status !== 'dirty' && r.status !== 'cleaning' && r.status !== 'clean' && r.status !== 'inspected') continue
    if (r.type !== g.type || r.accessible !== g.accessible) continue
    out.push({ room: r, eta: d.eta.get(r.id)! })
  }
  out.sort((a, b) => {
    const ea = a.eta.at ?? 9999
    const eb = b.eta.at ?? 9999
    if (ea !== eb) return ea - eb
    return a.room.id - b.room.id
  })
  return out
}

/** Why a given room cannot take a given guest right now, or null if it can. */
export function assignBlocker(r: Room, g: Guest): string | null {
  if (r.guestId) return `Already assigned`
  if (r.status === 'occupied' || r.status === 'dueout') return 'Guest still in house'
  if (r.status === 'ooo') return 'Out of order'
  if (r.type !== g.type) return 'Wrong room type'
  if (g.accessible && !r.accessible) return 'Not an accessible room'
  if (!g.accessible && r.accessible) return 'Held for accessible requests'
  return null
}

export function lateBy(g: Guest, eta: Eta | undefined): number | null {
  if (!g.needBy || !eta || eta.at == null) return null
  return eta.at > g.needBy ? Math.round(eta.at - g.needBy) : 0
}

export const TIER_RANK: Record<string, number> = { Diamond: 0, Platinum: 1, Gold: 2, Silver: 3, Member: 4 }
