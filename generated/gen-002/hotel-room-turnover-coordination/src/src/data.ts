import type { Attendant, FeedEvent, Guest, Role, Room, RoomType, State, Status, Tier } from './types'
import { NOW0 } from './format'

export const HOTEL = 'Calloway Downtown'
export const GROUP = 'Veralis Pharma Summit'

export function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const t = (h: number, m: number) => h * 60 + m
const mon = (h: number, m: number) => h * 60 + m - 1440

/* ------------------------------------------------------------------ people */

export const MARISOL = 'Marisol D.'
export const KENJI = 'Kenji T.'
export const DANA = 'Dana H.'
export const DMITRI = 'Dmitri S.'

const ATT_DEFS: Omit<Attendant, 'where'>[] = [
  { id: 'lucia', name: 'Lucía R.', full: 'Lucía Ramírez', presence: 'break', lastSeen: t(10, 33), backAt: t(10, 50) },
  { id: 'hadiza', name: 'Hadiza O.', full: 'Hadiza Okafor', presence: 'away', lastSeen: t(10, 22) },
  { id: 'rosa', name: 'Rosa M.', full: 'Rosa Mendoza', presence: 'active', lastSeen: t(10, 40) },
  { id: 'tuan', name: 'Tuan N.', full: 'Tuan Nguyen', presence: 'active', lastSeen: t(10, 40) },
  { id: 'ana', name: 'Ana P.', full: 'Ana Pereira', presence: 'active', lastSeen: t(10, 40) },
  { id: 'imani', name: 'Imani W.', full: 'Imani Walker', presence: 'active', lastSeen: t(10, 39) },
  { id: 'beatriz', name: 'Beatriz C.', full: 'Beatriz Costa', presence: 'active', lastSeen: t(10, 40) },
  { id: 'mei', name: 'Mei L.', full: 'Mei Lin', presence: 'active', lastSeen: t(10, 38) },
  { id: 'yusuf', name: 'Yusuf K.', full: 'Yusuf Karaca', presence: 'away', lastSeen: t(10, 31) },
]
const ZONE_TARGET = [16, 12, 14, 15, 13, 14, 14, 15, 13]

export function roleOf(name: string): Role {
  if (name === MARISOL || ATT_DEFS.some((a) => a.name === name)) return 'housekeeping'
  if (name === KENJI || name === DANA) return 'frontdesk'
  if (name === DMITRI || name.includes('Mechanical') || name.includes('Flooring')) return 'maintenance'
  return 'system'
}

/* ------------------------------------------------------------------ guests */

interface G {
  name: string
  org: string
  tier: Tier
  nights: number
  type: RoomType
  acc?: string
  by: number
}
const EARLY: G[] = [
  { name: 'Dr. Helena Voss', org: 'Veralis · Chief Medical Officer', tier: 'Diamond', nights: 212, type: 'suite', by: t(11, 0) },
  { name: 'Marcus Oyelaran', org: 'Veralis · SVP Commercial', tier: 'Diamond', nights: 187, type: 'king', by: t(11, 0) },
  { name: 'Dr. Priya Raghunathan', org: 'Veralis · Head of Clinical Dev', tier: 'Platinum', nights: 143, type: 'dq', by: t(11, 30) },
  { name: 'Tomás Echeverría', org: 'Veralis · Regulatory Affairs', tier: 'Platinum', nights: 131, type: 'king', acc: 'Wheelchair user · roll-in shower', by: t(11, 30) },
  { name: 'Ingrid Solheim', org: 'Halden Biologics', tier: 'Platinum', nights: 118, type: 'king', by: t(11, 30) },
  { name: 'Dr. Wei Zhang', org: 'Medrion Labs', tier: 'Platinum', nights: 102, type: 'dq', by: t(12, 0) },
  { name: 'Naomi Feldstein', org: 'Veralis · Medical Affairs', tier: 'Gold', nights: 96, type: 'king', by: t(12, 0) },
  { name: 'Dr. Samuel Achterberg', org: 'Corvane Pharma', tier: 'Gold', nights: 91, type: 'suite', by: t(12, 0) },
  { name: 'Leila Haddad', org: 'Brightwell CRO', tier: 'Gold', nights: 84, type: 'dq', acc: 'Step-free bath · grab bars', by: t(12, 0) },
  { name: 'Oliver Brandt', org: 'Veralis · Finance', tier: 'Gold', nights: 77, type: 'king', by: t(12, 0) },
  { name: 'Dr. Keiko Matsuda', org: 'Northgate Therapeutics', tier: 'Gold', nights: 70, type: 'king', acc: 'Wheelchair user · lowered rod', by: t(12, 15) },
  { name: 'Rafael Ortega', org: 'Atlas Clinical', tier: 'Gold', nights: 64, type: 'dq', by: t(12, 15) },
  { name: 'Fiona McAllister', org: 'Veralis · Quality', tier: 'Silver', nights: 52, type: 'king', by: t(12, 15) },
  { name: 'Dr. Anand Krishnamurthy', org: 'Halden Biologics', tier: 'Silver', nights: 47, type: 'king', acc: 'Visual alarm kit · hearing', by: t(12, 30) },
  { name: 'Chloe Dubois', org: 'Ostrava Genomics', tier: 'Silver', nights: 41, type: 'dq', by: t(12, 30) },
  { name: 'Jerome Whitfield', org: 'Veralis · Supply Chain', tier: 'Silver', nights: 38, type: 'king', by: t(12, 30) },
  { name: 'Sofia Lindqvist', org: 'Medrion Labs', tier: 'Silver', nights: 33, type: 'suite', acc: 'Wheelchair user · roll-in shower', by: t(12, 30) },
  { name: 'Dr. Mohammed Al-Rashid', org: 'Corvane Pharma', tier: 'Silver', nights: 29, type: 'dq', by: t(12, 30) },
  { name: 'Grace Okonkwo', org: 'Veralis · Pharmacovigilance', tier: 'Member', nights: 24, type: 'king', acc: 'Wheelchair user · roll-in shower', by: t(12, 45) },
  { name: 'Daniel Kowalczyk', org: 'Brightwell CRO', tier: 'Member', nights: 17, type: 'king', by: t(12, 45) },
  { name: 'Hana Yoshida', org: 'Northgate Therapeutics', tier: 'Member', nights: 12, type: 'dq', acc: 'Transfer-height bed', by: t(12, 45) },
  { name: 'Lucas Meyer', org: 'Atlas Clinical', tier: 'Member', nights: 8, type: 'king', by: t(12, 45) },
  { name: 'Aisha Rahman', org: 'Veralis · Biostatistics', tier: 'Member', nights: 5, type: 'dq', by: t(12, 45) },
]

const STANDARD: Omit<G, 'by' | 'acc'>[] = [
  { name: 'Dr. Elena Petrova', org: 'Veralis · Research', tier: 'Gold', nights: 58, type: 'king' },
  { name: 'Thomas Bergström', org: 'Halden Biologics', tier: 'Gold', nights: 55, type: 'suite' },
  { name: 'Yuki Nakamura', org: 'Medrion Labs', tier: 'Gold', nights: 51, type: 'king' },
  { name: 'Carlos Mendes', org: 'Veralis · Market Access', tier: 'Silver', nights: 36, type: 'king' },
  { name: 'Dr. Amara Nwosu', org: 'Corvane Pharma', tier: 'Silver', nights: 31, type: 'dq' },
  { name: 'Ravi Subramanian', org: 'Atlas Clinical', tier: 'Silver', nights: 27, type: 'king' },
  { name: 'Jessica Tran', org: 'Brightwell CRO', tier: 'Silver', nights: 22, type: 'dq' },
  { name: 'Dr. Lars Halvorsen', org: 'Ostrava Genomics', tier: 'Silver', nights: 21, type: 'king' },
  { name: 'Camille Laurent', org: 'Veralis · Legal', tier: 'Member', nights: 15, type: 'king' },
  { name: 'Ahmed Farouk', org: 'Northgate Therapeutics', tier: 'Member', nights: 14, type: 'dq' },
  { name: 'Beatrice Lindgren', org: 'Veralis · HR', tier: 'Member', nights: 13, type: 'king' },
  { name: 'Dr. Hiroshi Tanabe', org: 'Medrion Labs', tier: 'Member', nights: 11, type: 'king' },
  { name: 'Nadia Petrenko', org: 'Halden Biologics', tier: 'Member', nights: 10, type: 'dq' },
  { name: 'Patrick Doyle', org: 'Veralis · IT', tier: 'Member', nights: 9, type: 'king' },
  { name: 'Maya Ben-David', org: 'Atlas Clinical', tier: 'Member', nights: 9, type: 'king' },
  { name: 'Dr. Sergio Bianchi', org: 'Corvane Pharma', tier: 'Member', nights: 7, type: 'suite' },
  { name: 'Olivia Hartmann', org: 'Brightwell CRO', tier: 'Member', nights: 6, type: 'king' },
  { name: 'Kwame Asante', org: 'Veralis · Operations', tier: 'Member', nights: 6, type: 'dq' },
  { name: 'Dr. Isabel Nakagawa', org: 'Ostrava Genomics', tier: 'Member', nights: 4, type: 'king' },
  { name: 'Felix Andersson', org: 'Northgate Therapeutics', tier: 'Member', nights: 3, type: 'dq' },
  { name: 'Rhea Kapoor', org: 'Veralis · Communications', tier: 'Member', nights: 3, type: 'king' },
  { name: 'Dr. Tobias Wagner', org: 'Medrion Labs', tier: 'Member', nights: 2, type: 'dq' },
  { name: 'Valentina Rossi', org: 'Halden Biologics', tier: 'Member', nights: 1, type: 'king' },
]

export function buildGuests(): Guest[] {
  const early = EARLY.map<Guest>((g, i) => ({
    id: `e${i + 1}`,
    name: g.name,
    org: g.org,
    tier: g.tier,
    nights: g.nights,
    early: true,
    rank: i + 1,
    needBy: g.by,
    type: g.type,
    accessible: !!g.acc,
    need: g.acc,
    roomId: null,
  }))
  const std = STANDARD.map<Guest>((g, i) => ({
    id: `s${i + 1}`,
    name: g.name,
    org: g.org,
    tier: g.tier,
    nights: g.nights,
    early: false,
    rank: null,
    needBy: null,
    type: g.type,
    accessible: false,
    roomId: null,
  }))
  return [...early, ...std]
}

/* ------------------------------------------------------------------ rooms */

type Cat = 'D' | 'V' | 'S' | 'O'
const SUITE_N = new Set([1, 10, 18])
const DQ_N = new Set([4, 5, 6, 7, 13, 14])
const ACC = new Set([302, 402, 502, 602, 304, 404, 504, 604, 301, 401, 501, 708, 808, 908])

const PINS: Record<number, [Cat, Status]> = {
  714: ['D', 'clean'],
  302: ['D', 'inspected'],
  402: ['D', 'clean'],
  304: ['D', 'clean'],
  404: ['D', 'cleaning'],
  808: ['D', 'dirty'],
  602: ['D', 'dueout'],
  604: ['D', 'dueout'],
  501: ['D', 'dueout'],
  301: ['V', 'inspected'],
  401: ['S', 'occupied'],
  502: ['S', 'occupied'],
  504: ['S', 'occupied'],
  708: ['S', 'occupied'],
  908: ['O', 'ooo'],
  1105: ['O', 'ooo'],
  512: ['O', 'ooo'],
  306: ['O', 'ooo'],
}

const zoneOf = (floor: number, n: number) => Math.floor(((floor - 3) * 18 + (n - 1)) / 20)

function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const rint = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))

function removeOne<T>(arr: T[], v: T) {
  const i = arr.indexOf(v)
  if (i < 0) throw new Error('quota exceeded for ' + v)
  arr.splice(i, 1)
}

interface Draft {
  id: number
  floor: number
  n: number
  zone: number
  cat: Cat
  status: Status
}

function tryGenerate(seed: number): Draft[] | null {
  const r = mulberry32(seed)
  const all: Draft[] = []
  for (let f = 3; f <= 12; f++)
    for (let n = 1; n <= 18; n++) all.push({ id: f * 100 + n, floor: f, n, zone: zoneOf(f, n), cat: 'S', status: 'occupied' })

  const poolD: Status[] = [
    ...Array(23).fill('dueout'),
    ...Array(14).fill('dirty'),
    ...Array(6).fill('cleaning'),
    ...Array(11).fill('clean'),
    ...Array(7).fill('inspected'),
  ]
  const poolV: Status[] = [...Array(10).fill('inspected'), ...Array(8).fill('clean'), ...Array(4).fill('dirty'), ...Array(2).fill('cleaning')]
  const free: Draft[] = []
  for (const d of all) {
    const pin = PINS[d.id]
    if (pin) {
      d.cat = pin[0]
      d.status = pin[1]
      if (pin[0] === 'D') removeOne(poolD, pin[1])
      if (pin[0] === 'V') removeOne(poolV, pin[1])
    } else free.push(d)
  }
  const sh = shuffle(free, r)
  const dPool = shuffle(poolD, r)
  const vPool = shuffle(poolV, r)
  let k = 0
  for (const s of dPool) {
    sh[k].cat = 'D'
    sh[k++].status = s
  }
  for (const s of vPool) {
    sh[k].cat = 'V'
    sh[k++].status = s
  }
  for (; k < sh.length; k++) {
    sh[k].cat = 'S'
    sh[k].status = 'occupied'
  }
  // zone feasibility: today's list per attendant must land at the target size
  for (let z = 0; z < 9; z++) {
    const zr = all.filter((d) => d.zone === z)
    const dep = zr.filter((d) => d.cat === 'D' || (d.cat === 'V' && (d.status === 'dirty' || d.status === 'cleaning'))).length
    const stay = zr.filter((d) => d.cat === 'S').length
    if (dep > ZONE_TARGET[z] || dep + stay < ZONE_TARGET[z]) return null
  }
  // ready supply by type must keep the morning interesting but workable
  return all
}

const OOO_INFO: Record<number, Room['ooo']> = {
  908: {
    reason: 'AC compressor failed',
    who: DMITRI,
    since: t(8, 52),
    estLabel: '11:30',
    estAt: t(11, 30),
    note: 'New compressor fitted, running test cycle',
    noteAt: t(10, 34),
  },
  1105: {
    reason: 'Door lock board (RFID)',
    who: DMITRI,
    since: t(9, 15),
    estLabel: '12:15',
    estAt: t(12, 15),
    note: 'Part arrived 10:20 — fitting after 908',
    noteAt: t(10, 21),
  },
  512: {
    reason: 'Bathroom ceiling leak',
    who: 'Dalton Mechanical',
    since: mon(19, 40),
    estLabel: 'Wed 9:00 am',
    estAt: null,
  },
  306: {
    reason: 'Carpet re-lay after water damage',
    who: 'Corliss Flooring',
    since: mon(8, 0),
    estLabel: 'Thu',
    estAt: null,
  },
}

export function buildInitial(): State {
  let drafts: Draft[] | null = null
  for (let seed = 11; seed < 4000 && !drafts; seed++) drafts = tryGenerate(seed)
  if (!drafts) throw new Error('could not generate hotel')
  const r = mulberry32(90210)

  const attendants: Attendant[] = ATT_DEFS.map((a) => ({ ...a, where: null }))
  const attOf = (z: number) => attendants[z]
  const frontDesk = [KENJI, DANA]

  const rooms: Room[] = drafts.map((d) => {
    const type: RoomType = SUITE_N.has(d.n) ? 'suite' : DQ_N.has(d.n) ? 'dq' : 'king'
    const att = attOf(d.zone)
    const live = att.presence === 'active'
    const clampT = (x: number) => (live ? x : Math.min(x, att.lastSeen - rint(r, 1, 6)))
    const room: Room = {
      id: d.id,
      floor: d.floor,
      type,
      accessible: ACC.has(d.id),
      status: d.status,
      attendant: att.id,
      onList: false,
      serviced: false,
      guestId: null,
      rush: null,
      startedAt: null,
      last: { verb: 'checked in', by: DANA, at: mon(15, 10) },
    }
    const dep = d.cat === 'D'
    const vdc = d.cat === 'V' && (d.status === 'dirty' || d.status === 'cleaning')
    room.onList = dep || vdc
    switch (d.status) {
      case 'dueout':
        room.last = { verb: 'flagged due out', by: 'PMS', at: t(6, 0) }
        break
      case 'dirty':
        room.last =
          d.cat === 'D'
            ? { verb: 'checked out', by: frontDesk[rint(r, 0, 1)], at: rint(r, t(7, 52), t(10, 31)) }
            : { verb: 'checked out (late audit)', by: 'PMS', at: rint(r, t(6, 40), t(7, 30)) }
        break
      case 'cleaning': {
        const at = d.id === 404 ? t(10, 12) : clampT(rint(r, t(10, 8), t(10, 36)))
        room.last = { verb: 'cleaning started', by: att.name, at }
        room.startedAt = at
        break
      }
      case 'clean':
        room.last =
          d.cat === 'D'
            ? { verb: 'marked clean', by: att.name, at: d.id === 714 ? t(10, 36) : clampT(rint(r, t(9, 10), t(10, 35))) }
            : { verb: 'marked clean', by: att.name, at: clampT(rint(r, t(8, 10), t(9, 0))) }
        break
      case 'inspected':
        room.last =
          d.cat === 'D'
            ? { verb: 'marked inspected', by: MARISOL, at: rint(r, t(9, 25), t(10, 35)) }
            : { verb: 'marked inspected', by: MARISOL, at: rint(r, t(8, 20), t(9, 30)) }
        break
      case 'ooo':
        room.ooo = OOO_INFO[d.id]
        room.last = { verb: 'out of order · ' + OOO_INFO[d.id]!.reason, by: OOO_INFO[d.id]!.who, at: OOO_INFO[d.id]!.since }
        break
      case 'occupied':
        room.last = { verb: 'checked in', by: frontDesk[rint(r, 0, 1)], at: mon(rint(r, 13, 23), rint(r, 0, 59)) }
        break
    }
    return room
  })

  // stayover service: bring each attendant's list to the target size
  for (let z = 0; z < 9; z++) {
    const zoneRooms = rooms.filter((x) => x.attendant === attendants[z].id)
    const have = zoneRooms.filter((x) => x.onList).length
    const stay = shuffle(
      zoneRooms.filter((x) => x.status === 'occupied'),
      r,
    ).slice(0, ZONE_TARGET[z] - have)
    const att = attendants[z]
    for (const s of stay) {
      s.onList = true
      s.serviced = r() < (att.presence === 'active' ? 0.5 : 0.35)
      if (s.serviced) {
        const at = att.presence === 'active' ? rint(r, t(8, 40), t(10, 30)) : rint(r, t(8, 40), att.lastSeen - 2)
        s.last = { verb: 'stayover serviced', by: att.name, at }
      }
    }
  }

  // Make the last few minutes of activity visible and plausible
  const roomById = new Map(rooms.map((x) => [x.id, x]))
  const activeIds = new Set(attendants.filter((a) => a.presence === 'active').map((a) => a.id))
  const pick = (pred: (x: Room) => boolean) => shuffle(rooms.filter(pred), r)
  const forced: Array<[Room | undefined, number, string?, string?]> = [
    [pick((x) => x.status === 'dirty' && x.last.by !== 'PMS' && x.id !== 808)[0], t(10, 39), 'checked out', KENJI],
    [pick((x) => x.status === 'cleaning' && activeIds.has(x.attendant) && x.id !== 404)[0], t(10, 38)],
    [pick((x) => x.status === 'inspected' && x.last.at > t(9, 0))[0], t(10, 37)],
    [pick((x) => x.status === 'clean' && x.id !== 714 && x.id !== 402 && x.id !== 304 && activeIds.has(x.attendant) && x.onList)[0], t(10, 34)],
    [pick((x) => x.status === 'dirty' && x.last.by !== 'PMS' && x.id !== 808)[1], t(10, 31), 'checked out', DANA],
  ]
  for (const [room, at, verb, by] of forced) {
    if (!room) continue
    room.last = { ...room.last, at, ...(verb ? { verb } : {}), ...(by ? { by } : {}) }
    if (room.status === 'cleaning') room.startedAt = at
  }

  // Guests and the assignments Kenji has already made this morning
  const guests = buildGuests()
  const events: FeedEvent[] = []
  let ev = 0
  const assigns: Array<[string, number, string[]]> = [
    ['e1', t(10, 14), ['inspected', 'clean']],
    ['e2', t(10, 18), ['inspected', 'clean']],
    ['e3', t(10, 22), ['clean', 'inspected']],
    ['e5', t(10, 27), ['clean', 'inspected']],
  ]
  const protectedRooms = new Set([...Object.keys(PINS).map(Number)])
  for (const [gid, at, pref] of assigns) {
    const g = guests.find((x) => x.id === gid)!
    let found: Room | undefined
    for (const st of pref) {
      found = pick((x) => x.type === g.type && !x.accessible && x.status === st && !x.guestId && !protectedRooms.has(x.id))[0]
      if (found) break
    }
    if (!found) continue
    found.guestId = g.id
    g.roomId = found.id
    found.last = { verb: `assigned to ${g.name}`, by: KENJI, at }
  }

  // Dmitri's notes on the broken rooms
  for (const id of [908, 1105]) {
    const x = roomById.get(id)!
    x.last = { verb: `note: ${x.ooo!.note}`, by: DMITRI, at: x.ooo!.noteAt! }
  }

  for (const x of rooms) {
    if (x.last.at >= t(10, 5)) {
      events.push({ id: `s${ev++}`, at: x.last.at, room: x.id, verb: x.last.verb, by: x.last.by, role: roleOf(x.last.by) })
    }
  }
  events.sort((a, b) => b.at - a.at)

  // where each attendant is right now
  for (const a of attendants) {
    const mine = rooms.filter((x) => x.attendant === a.id)
    const cur = mine.find((x) => x.status === 'cleaning' && x.id !== 404) ?? mine.filter((x) => x.last.by === a.name).sort((p, q) => q.last.at - p.last.at)[0]
    a.where = cur ? cur.id : null
  }
  const dmitriAt = 908

  return {
    now: NOW0,
    rooms,
    attendants,
    guests,
    feed: events,
    actor: 'marisol',
    selRoom: null,
    selGuest: 'e4',
    statusFilter: null,
    attFilter: null,
    tab: 'early',
    hideAssigned: false,
    feedFilter: 'all',
    live: true,
    toast: null,
    rng: 4242,
    nextEventAt: 14,
    scriptIdx: 0,
    elapsed: 0,
    dmitriAt,
    evCounter: ev,
  }
}
