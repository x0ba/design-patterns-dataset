import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from 'react'
import type { Actor, Role, Room, State, Status } from './types'
import { buildInitial, DANA, DMITRI, KENJI, MARISOL, roleOf } from './data'
import { derive, isDone, MAX_LIST, roomIdx, assignBlocker, type Derived } from './logic'
import { NOW0, fmtTime } from './format'

export type Action =
  | { type: 'tick'; elapsed: number }
  | { type: 'selectRoom'; id: number | null }
  | { type: 'selectGuest'; id: string | null }
  | { type: 'setActor'; actor: Actor }
  | { type: 'setLive'; live: boolean }
  | { type: 'setFilter'; status: Status | null }
  | { type: 'setAtt'; id: string | null }
  | { type: 'setTab'; tab: 'early' | 'standard' }
  | { type: 'hideAssigned'; v: boolean }
  | { type: 'feedFilter'; v: Role | 'all' }
  | { type: 'inspect'; room: number }
  | { type: 'sendBack'; room: number }
  | { type: 'assign'; room: number; guest: string }
  | { type: 'unassign'; guest: string }
  | { type: 'rush'; room: number }
  | { type: 'reassign'; room: number; to: string }
  | { type: 'dismissToast' }

/* ------------------------------------------------------------ helpers */

function clone(s: State): State {
  return { ...s, rooms: s.rooms.slice(), attendants: s.attendants.slice(), guests: s.guests.slice(), feed: s.feed.slice() }
}
function patchRoom(s: State, id: number, patch: Partial<Room>): Room {
  const i = roomIdx(id)
  s.rooms[i] = { ...s.rooms[i], ...patch }
  return s.rooms[i]
}
function patchAtt(s: State, attId: string, patch: Partial<State['attendants'][number]>) {
  const i = s.attendants.findIndex((a) => a.id === attId)
  s.attendants[i] = { ...s.attendants[i], ...patch }
}
function log(s: State, roomId: number | null, verb: string, by: string) {
  s.feed.unshift({ id: `ev${s.evCounter++}`, at: s.now, room: roomId, verb, by, role: roleOf(by) })
  if (s.feed.length > 300) s.feed.length = 300
  if (roomId != null) patchRoom(s, roomId, { last: { verb, by, at: s.now } })
}
function toast(s: State, tone: 'ok' | 'warn' | 'info', text: string, switchTo?: Actor) {
  s.toast = { id: s.evCounter++, tone, text, switchTo }
}
function attName(s: State, id: string) {
  return s.attendants.find((a) => a.id === id)!.name
}
const actorName = (a: Actor) => (a === 'marisol' ? MARISOL : KENJI)

function makeRng(seed: number) {
  let a = seed | 0
  const r = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { r, get: () => a }
}

/* ------------------------------------------------------------ simulated phones */

function returnToService(s: State, id: number) {
  const r = s.rooms[roomIdx(id)]
  if (r.status !== 'ooo') return
  patchRoom(s, id, { status: 'dirty', ooo: undefined, onList: true, serviced: false })
  log(s, id, 'back in service — AC compressor replaced, test cycle passed', DMITRI)
  s.dmitriAt = 1105
  toast(s, 'info', `${id} is back in service. Dmitri closed the AC ticket. It is vacant dirty and needs a clean.`)
}

const SCRIPT: Array<{ at: number; run: (s: State) => void }> = [
  { at: 38, run: (s) => returnToService(s, 908) },
  {
    at: 270,
    run: (s) => {
      patchAtt(s, 'lucia', { presence: 'active', lastSeen: s.now, backAt: undefined })
      log(s, null, 'Lucía R. is back from break and on her phone', 'Lucía R.')
    },
  },
]

function randomEvent(s: State, rnd: () => number) {
  const now = s.now
  const active = s.attendants.filter((a) => a.presence === 'active')
  const finish: Room[] = []
  const start: Room[] = []
  const serviced: Room[] = []
  const checkout = s.rooms.filter((r) => r.status === 'dueout')
  for (const a of active) {
    const mine = s.rooms.filter((r) => r.attendant === a.id)
    const cur = mine.find((r) => r.status === 'cleaning')
    if (cur) {
      if (now - (cur.startedAt ?? 0) >= 0.8) finish.push(cur)
    } else {
      const q = mine
        .filter((r) => r.status === 'dirty')
        .sort((x, y) => (x.rush != null && y.rush != null ? x.rush - y.rush : x.rush != null ? -1 : y.rush != null ? 1 : x.id - y.id))
      if (q[0]) start.push(q[0])
    }
    const su = mine.filter((r) => r.status === 'occupied' && r.onList && !r.serviced)
    if (su.length) serviced.push(su[Math.floor(rnd() * su.length)])
  }
  const kinds: Array<[number, Room[], string]> = [
    [3.2, finish, 'finish'],
    [3.0, start, 'start'],
    [1.6, serviced, 'serviced'],
    [1.0, checkout, 'checkout'],
  ]
  const avail = kinds.filter((k) => k[1].length)
  if (!avail.length) return
  let total = avail.reduce((n, k) => n + k[0], 0)
  let pick = rnd() * total
  let chosen = avail[0]
  for (const k of avail) {
    pick -= k[0]
    if (pick <= 0) {
      chosen = k
      break
    }
  }
  const list = chosen[1]
  const room = chosen[2] === 'checkout' || chosen[2] === 'serviced' ? list[Math.floor(rnd() * list.length)] : chosen[2] === 'finish' ? list[Math.floor(rnd() * list.length)] : list[Math.floor(rnd() * list.length)]
  const a = s.attendants.find((x) => x.id === room.attendant)!
  switch (chosen[2]) {
    case 'finish':
      patchRoom(s, room.id, { status: 'clean', startedAt: null })
      log(s, room.id, 'marked clean', a.name)
      patchAtt(s, a.id, { where: room.id, lastSeen: now })
      break
    case 'start':
      patchRoom(s, room.id, { status: 'cleaning', startedAt: now })
      log(s, room.id, 'cleaning started', a.name)
      patchAtt(s, a.id, { where: room.id, lastSeen: now })
      break
    case 'serviced':
      patchRoom(s, room.id, { serviced: true })
      log(s, room.id, 'stayover serviced', a.name)
      patchAtt(s, a.id, { where: room.id, lastSeen: now })
      break
    case 'checkout':
      patchRoom(s, room.id, { status: 'dirty' })
      log(s, room.id, 'checked out', rnd() < 0.5 ? KENJI : DANA)
      break
  }
}

/* ------------------------------------------------------------ reducer */

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'tick': {
      const s = clone(state)
      s.elapsed = action.elapsed
      s.now = NOW0 + action.elapsed / 60
      if (!s.live) return s
      while (s.scriptIdx < SCRIPT.length && SCRIPT[s.scriptIdx].at <= action.elapsed) {
        SCRIPT[s.scriptIdx].run(s)
        s.scriptIdx++
      }
      if (action.elapsed >= s.nextEventAt) {
        const g = makeRng(s.rng + s.evCounter * 7919)
        randomEvent(s, g.r)
        s.rng = g.get()
        s.nextEventAt = action.elapsed + 13 + Math.floor(g.r() * 14)
      }
      return s
    }
    case 'selectRoom':
      return { ...state, selRoom: state.selRoom === action.id ? null : action.id }
    case 'selectGuest':
      return { ...state, selGuest: state.selGuest === action.id ? null : action.id, selRoom: null }
    case 'setActor':
      return { ...state, actor: action.actor, toast: null }
    case 'setLive':
      return { ...state, live: action.live }
    case 'setFilter':
      return { ...state, statusFilter: state.statusFilter === action.status ? null : action.status }
    case 'setAtt':
      return { ...state, attFilter: state.attFilter === action.id ? null : action.id }
    case 'setTab':
      return { ...state, tab: action.tab }
    case 'hideAssigned':
      return { ...state, hideAssigned: action.v }
    case 'feedFilter':
      return { ...state, feedFilter: action.v }
    case 'dismissToast':
      return { ...state, toast: null }

    case 'inspect': {
      const s = clone(state)
      const r = s.rooms[roomIdx(action.room)]
      if (s.actor !== 'marisol') {
        toast(s, 'warn', 'Only Marisol, the housekeeping supervisor, can mark a room inspected.', 'marisol')
        return s
      }
      if (r.status !== 'clean') {
        toast(s, 'warn', `${r.id} is no longer waiting for inspection (${r.status}).`)
        return s
      }
      patchRoom(s, r.id, { status: 'inspected', rush: null })
      log(s, r.id, 'marked inspected', MARISOL)
      toast(s, 'ok', `${r.id} inspected${r.guestId ? ' and ready for its guest' : ''}.`)
      return s
    }
    case 'sendBack': {
      const s = clone(state)
      const r = s.rooms[roomIdx(action.room)]
      if (s.actor !== 'marisol') {
        toast(s, 'warn', 'Only Marisol can send a room back after inspection.', 'marisol')
        return s
      }
      if (r.status !== 'clean') return s
      patchRoom(s, r.id, { status: 'dirty', rush: s.now })
      log(s, r.id, 'failed inspection — back to ' + attName(s, r.attendant) + ' to re-clean', MARISOL)
      toast(s, 'info', `${r.id} sent back to ${attName(s, r.attendant)}, first in line`)
      return s
    }
    case 'assign': {
      const s = clone(state)
      const r = s.rooms[roomIdx(action.room)]
      const g = s.guests.find((x) => x.id === action.guest)!
      if (s.actor !== 'kenji') {
        toast(s, 'warn', 'Only the front desk can assign a guest to a room.', 'kenji')
        return s
      }
      if (r.guestId) {
        const other = s.guests.find((x) => x.id === r.guestId)!
        toast(s, 'warn', `${r.id} was just assigned to ${other.name}. Pick another room.`)
        return s
      }
      if (g.roomId != null) {
        toast(s, 'warn', `${g.name} already has room ${g.roomId}.`)
        return s
      }
      const block = assignBlocker(r, g)
      if (block) {
        toast(s, 'warn', `${r.id} can't take ${g.name}: ${block.toLowerCase()}.`)
        return s
      }
      patchRoom(s, r.id, { guestId: g.id })
      s.guests[s.guests.findIndex((x) => x.id === g.id)] = { ...g, roomId: r.id }
      log(s, r.id, `assigned to ${g.name}`, KENJI)
      toast(s, 'ok', `${g.name} is in ${r.id}. No one else can be assigned to it.`)
      // move on to the next unassigned guest in the same list
      const pool = s.guests.filter((x) => x.early === g.early && x.roomId == null)
      s.selGuest = pool.length ? pool[0].id : null
      s.selRoom = null
      return s
    }
    case 'unassign': {
      const s = clone(state)
      if (s.actor !== 'kenji') {
        toast(s, 'warn', 'Only the front desk can change a guest assignment.', 'kenji')
        return s
      }
      const g = s.guests.find((x) => x.id === action.guest)!
      if (g.roomId == null) return s
      const rid = g.roomId
      patchRoom(s, rid, { guestId: null })
      s.guests[s.guests.findIndex((x) => x.id === g.id)] = { ...g, roomId: null }
      log(s, rid, `released from ${g.name}`, KENJI)
      toast(s, 'info', `${rid} released. ${g.name} needs a room again.`)
      return s
    }
    case 'rush': {
      const s = clone(state)
      const r = s.rooms[roomIdx(action.room)]
      if (r.status !== 'dirty' && r.status !== 'clean') return s
      const on = r.rush == null
      patchRoom(s, r.id, { rush: on ? s.now : null })
      const who = actorName(s.actor)
      const what = r.status === 'clean' ? 'inspect' : 'clean'
      log(s, r.id, on ? `moved to front of ${what} line` : `taken off the ${what}-first line`, who)
      return s
    }
    case 'reassign': {
      const s = clone(state)
      const r = s.rooms[roomIdx(action.room)]
      if (s.actor !== 'marisol') {
        toast(s, 'warn', 'Only Marisol can move rooms between attendants.', 'marisol')
        return s
      }
      if (r.status === 'cleaning' || isDone(r) || !r.onList) {
        toast(s, 'warn', `${r.id} can't be reassigned right now.`)
        return s
      }
      const load = s.rooms.filter((x) => x.attendant === action.to && x.onList).length
      if (load >= MAX_LIST) {
        toast(s, 'warn', `${attName(s, action.to)} already has ${load} rooms. The limit is ${MAX_LIST}.`)
        return s
      }
      const from = attName(s, r.attendant)
      patchRoom(s, r.id, { attendant: action.to })
      log(s, r.id, `reassigned ${from} → ${attName(s, action.to)}`, MARISOL)
      toast(s, 'ok', `Moved ${r.id} to ${attName(s, action.to)}`)
      return s
    }
  }
}

/* ------------------------------------------------------------ provider */

interface Ctx {
  s: State
  d: Derived
  dispatch: Dispatch<Action>
}
const C = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, buildInitial)
  const d = useMemo(() => derive(s), [s])
  const t0 = useRef(performance.now())
  useEffect(() => {
    const h = setInterval(() => dispatch({ type: 'tick', elapsed: (performance.now() - t0.current) / 1000 }), 1000)
    return () => clearInterval(h)
  }, [])
  useEffect(() => {
    if (!s.toast) return
    const id = s.toast.id
    const h = setTimeout(() => dispatch({ type: 'dismissToast' }), s.toast.tone === 'warn' ? 7000 : 5000)
    return () => clearTimeout(h)
  }, [s.toast?.id])
  const value = useMemo(() => ({ s, d, dispatch }), [s, d])
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useStore() {
  const v = useContext(C)
  if (!v) throw new Error('no store')
  return v
}
export { fmtTime }
