import { COLS, ROWS, allHexIds, distance, hexLine, hid, neighbors, parseHex, withinRange } from './hexmath'
import { HAND_RUMORS, LOCATIONS } from './content'
import { SESSION_SEEDS } from './sessions'
import type { Hex, Know, Session, Terrain } from './types'

function hash(a: number, b: number, salt = 0): number {
  let h = Math.imul(a + 17, 374761393) ^ Math.imul(b + 31, 668265263) ^ Math.imul(salt + 7, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function terrainAt(col: number, row: number): Terrain {
  const id = hid(col, row)
  const n = hash(col, row)
  const dFen = distance(id, '1208')
  const dNE = Math.min(distance(id, '2205'), distance(id, '2302'))
  const dSE = distance(id, '2113')
  if (dNE <= 2) return 'mountains'
  if (dNE === 3) return n < 0.55 ? 'mountains' : 'hills'
  if (dSE <= 2) return 'mountains'
  if (dSE === 3) return n < 0.5 ? 'mountains' : 'hills'
  if (dFen <= 2) return n > 0.9 ? 'plains' : 'marsh'
  if (dFen === 3) return n < 0.55 ? 'marsh' : n < 0.8 ? 'forest' : 'plains'
  if (dFen === 4 && n < 0.2) return 'marsh'
  if (distance(id, '1510') <= 1 || distance(id, '1611') <= 1) return 'hills'
  if (col <= 4) return n < 0.72 ? 'forest' : n < 0.88 ? 'hills' : 'plains'
  if (col <= 7 && row <= 12) return n < 0.5 ? 'forest' : n < 0.62 ? 'hills' : 'plains'
  if (row >= 15 && col <= 14) return n < 0.35 ? 'hills' : n < 0.5 ? 'marsh' : 'plains'
  if (col >= 17 && row >= 8) return n < 0.4 ? 'hills' : n < 0.55 ? 'forest' : 'plains'
  return n < 0.12 ? 'forest' : n < 0.26 ? 'hills' : n < 0.34 ? 'forest' : 'plains'
}

function buildTerrain(): Map<string, Terrain> {
  const t = new Map<string, Terrain>()
  for (const id of allHexIds()) {
    const { col, row } = parseHex(id)
    t.set(id, terrainAt(col, row))
  }
  const set = (ids: string[], v: Terrain) => ids.forEach((i) => t.set(i, v))
  // Ash River: headwaters in the mountains, ends in the fen at the Ashen Ford.
  set(['2002', '1902', '1802', '1702', '1602', '1603', '1504', '1404', '1405'], 'river')
  // Roads
  set(hexLine('0106', '1004'), 'road')
  set(hexLine('1004', '0906'), 'road')
  set(hexLine('0906', '0809'), 'road')
  set(hexLine('0809', '0713'), 'road')
  set(['1104', '1204', '1304'], 'road')
  // The fen interior — a causeway, hummocks and reed-channels the route planning depends on
  set(['1105', '1305', '1407', '1408', '1307', '1504', '1303', '1203'].filter((i) => i !== '1504'), 'plains')
  set(['1205'], 'road')
  set(['1306', '1406', '1206', '1207', '1106', '1107', '1108', '1208', '1308', '1309', '1209', '1210', '1110', '1111', '1211'], 'marsh')
  set(['1409', '1510'], 'hills')
  set(['1410', '1509', '1511', '1610', '1611'], 'hills')
  return t
}

export const TERRAIN = buildTerrain()

export const SESSIONS: Session[] = SESSION_SEEDS.map((s) => {
  const path: string[] = ['1004']
  let cur = '1004'
  for (const w of s.waypoints) {
    const line = hexLine(cur, w)
    for (const h of line.slice(1)) if (!path.includes(h)) path.push(h)
    cur = w
  }
  return { n: s.n, date: s.date, title: s.title, players: s.players, summary: s.summary, path }
})

const explored = new Set<string>(['1004'])
for (const s of SESSIONS) s.path.forEach((h) => explored.add(h))

// Rumored hexes: 10 hand-written far rumors + ring-adjacent hexes seen from explored ground.
function buildRumored(): Set<string> {
  const rumored = new Set<string>()
  for (const id of Object.keys(HAND_RUMORS)) if (!explored.has(id)) rumored.add(id)
  const forced = ['1406', '1407']
  for (const f of forced) if (!explored.has(f)) rumored.add(f)
  const ring: string[] = []
  for (const e of explored) for (const n of neighbors(e)) if (!explored.has(n) && !rumored.has(n) && !ring.includes(n)) ring.push(n)
  ring.sort((a, b) => hash(...(Object.values(parseHex(a)) as [number, number]), 5) - hash(...(Object.values(parseHex(b)) as [number, number]), 5))
  for (const r of ring) {
    if (rumored.size >= 29) break
    if (r === '1408') continue
    rumored.add(r)
  }
  return rumored
}
const rumoredSet = buildRumored()

export const HEXES: Map<string, Hex> = new Map()
for (const id of allHexIds()) {
  const { col, row } = parseHex(id)
  const know: Know = explored.has(id) ? 'explored' : rumoredSet.has(id) ? 'rumored' : 'unknown'
  const h: Hex = { id, col, row, terrain: TERRAIN.get(id)!, know, sessions: [] }
  if (know === 'rumored') {
    if (HAND_RUMORS[id]) h.rumor = HAND_RUMORS[id]
    else {
      const from = neighbors(id).find((n) => explored.has(n))!
      const kind = h.terrain
      h.rumor = {
        text: `Seen across the ${kind === 'marsh' ? 'reeds' : kind === 'mountains' ? 'ridge' : 'country'} from ${from}; nobody has set foot here.`,
        source: `Sighted from ${from}`, truth: 'seen',
      }
    }
  }
  HEXES.set(id, h)
}
for (const s of SESSIONS) for (const hx of s.path) HEXES.get(hx)!.sessions.push(s.n)

export const LOC_BY_HEX: Map<string, typeof LOCATIONS> = new Map()
for (const l of LOCATIONS) {
  const arr = LOC_BY_HEX.get(l.hex) ?? []
  arr.push(l)
  LOC_BY_HEX.set(l.hex, arr)
}

// Keyed hexes' rumor text should match the location when it is rumored without hand text.
for (const l of LOCATIONS) {
  const h = HEXES.get(l.hex)!
  if (h.know === 'rumored' && h.rumor?.truth === 'seen') h.rumor.dmNote = `Keyed here: ${l.name}.`
}

// Lair territories: hex → lairs that reach it
export const LAIR_REACH: Map<string, { locId: string; threat: number }[]> = new Map()
for (const l of LOCATIONS.filter((x) => x.kind === 'lair')) {
  for (const h of withinRange(l.hex, l.radius ?? 1)) {
    const arr = LAIR_REACH.get(h) ?? []
    arr.push({ locId: l.id, threat: l.threat ?? 1 })
    LAIR_REACH.set(h, arr)
  }
}

export const COUNTS = (() => {
  let e = 0, r = 0, u = 0
  for (const h of HEXES.values()) h.know === 'explored' ? e++ : h.know === 'rumored' ? r++ : u++
  return { explored: e, rumored: r, unknown: u, total: COLS * ROWS }
})()
