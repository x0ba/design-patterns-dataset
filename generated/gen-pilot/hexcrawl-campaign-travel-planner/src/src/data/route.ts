import { distance, neighbors } from './hexmath'
import { HEXES, LAIR_REACH, LOC_BY_HEX, SESSIONS } from './world'
import { LOCATIONS, PLAYERS, RAIN_DAYS, RATIONS, SATURDAY_PARTY } from './content'
import type { Know, Loc, Terrain } from './types'

export const BASE_COST: Record<Terrain, number> = {
  plains: 1, road: 1, forest: 2, hills: 2, marsh: 3,
  // Not in the ruleset yet — assumed.
  river: 2, mountains: 3,
}
export const ASSUMED: Terrain[] = ['river', 'mountains']

export const START = '1004'
export const TOWER = '1409'

export interface Leg {
  hex: string
  terrain: Terrain
  baseCost: number
  rainExtra: number
  cost: number
  startDay: number
  endDay: number
  know: Know
  on: Loc[] // keyed locations in this hex
  near: Loc[] // keyed locations in adjacent hexes
  lairs: { loc: Loc; threat: number }[] // lairs whose territory reaches this hex
  seenBy: string[] // Saturday party members who have entered this hex
}

export const PLAYER_HEXES: Record<string, Set<string>> = {}
for (const p of PLAYERS) PLAYER_HEXES[p.id] = new Set()
for (const s of SESSIONS) for (const pid of s.players) for (const h of s.path) PLAYER_HEXES[pid].add(h)

export function rainHit(terrain: Terrain, startDay: number, rain = true): boolean {
  if (!rain || terrain !== 'marsh') return false
  const base = BASE_COST[terrain]
  for (let d = startDay; d < startDay + base; d++) if (RAIN_DAYS.includes(d)) return true
  return false
}

export function legCost(terrain: Terrain, startDay: number, rain = true) {
  const base = BASE_COST[terrain]
  const extra = rainHit(terrain, startDay, rain) ? 1 : 0
  return { base, extra, cost: base + extra }
}

const locById = new Map(LOCATIONS.map((l) => [l.id, l]))

export function featuresAt(hex: string) {
  const on = LOC_BY_HEX.get(hex) ?? []
  const near: Loc[] = []
  for (const n of neighbors(hex)) for (const l of LOC_BY_HEX.get(n) ?? []) near.push(l)
  const lairs = (LAIR_REACH.get(hex) ?? []).map((r) => ({ loc: locById.get(r.locId)!, threat: r.threat }))
  return { on, near, lairs }
}

export function simulate(route: string[], startDay = 1, rain = true): { legs: Leg[]; days: number } {
  const legs: Leg[] = []
  let day = startDay
  for (let i = 1; i < route.length; i++) {
    const hex = route[i]
    const h = HEXES.get(hex)!
    const { base, extra, cost } = legCost(h.terrain, day, rain)
    const f = featuresAt(hex)
    legs.push({
      hex, terrain: h.terrain, baseCost: base, rainExtra: extra, cost,
      startDay: day, endDay: day + cost - 1, know: h.know,
      ...f,
      seenBy: SATURDAY_PARTY.filter((p) => PLAYER_HEXES[p].has(hex)),
    })
    day += cost
  }
  return { legs, days: day - startDay }
}

export interface RouteStats {
  legs: Leg[]
  hexes: number
  days: number
  dryDays: number
  rainExtraDays: number
  supply: number
  surplus: number // supply − days (negative = shortfall)
  runsOutDay: number | null
  runsOutHex: string | null
  returnDays: number
  exploredCount: number
  rumoredCount: number
  unknownCount: number
  lairHexes: number
  peakThreat: number
  hostileReachHexes: number
  keyedOn: Loc[]
  keyedNear: Loc[]
}

export function routeStats(route: string[], forage: number): RouteStats {
  const { legs, days } = simulate(route)
  const dry = simulate(route, 1, false).days
  const supply = RATIONS + forage
  let runsOutDay: number | null = null
  let runsOutHex: string | null = null
  if (days > supply) {
    runsOutDay = supply + 1
    runsOutHex = legs.find((l) => l.startDay <= runsOutDay! && runsOutDay! <= l.endDay)?.hex ?? null
  }
  const back = route.slice(0, -1).reverse()
  const ret = back.length ? simulate([route[route.length - 1], ...back], days + 1).days : 0
  const keyedOn: Loc[] = []
  const keyedNear: Loc[] = []
  for (const l of legs) {
    for (const k of l.on) if (!keyedOn.includes(k)) keyedOn.push(k)
  }
  for (const l of legs) for (const k of l.near) if (!keyedOn.includes(k) && !keyedNear.includes(k)) keyedNear.push(k)
  const wick = LOCATIONS.find((l) => l.id === 'wickhouse')!
  return {
    legs, hexes: legs.length, days, dryDays: dry, rainExtraDays: days - dry,
    supply, surplus: supply - days, runsOutDay, runsOutHex, returnDays: ret,
    exploredCount: legs.filter((l) => l.know === 'explored').length,
    rumoredCount: legs.filter((l) => l.know === 'rumored').length,
    unknownCount: legs.filter((l) => l.know === 'unknown').length,
    lairHexes: legs.filter((l) => l.lairs.length > 0).length,
    peakThreat: Math.max(0, ...legs.flatMap((l) => l.lairs.map((x) => x.threat))),
    hostileReachHexes: legs.filter((l) => distance(l.hex, wick.hex) <= 1).length,
    keyedOn, keyedNear,
  }
}

// ── Auto routing (time-dependent Dijkstra; rain-aware) ────────────────────────────
function riskPenalty(hex: string): number {
  let t = 0
  for (const r of LAIR_REACH.get(hex) ?? []) t = Math.max(t, r.threat)
  const wick = LOCATIONS.find((l) => l.id === 'wickhouse')!
  if (distance(hex, wick.hex) <= 1) t = Math.max(t, 3)
  return t * 0.9
}

export function suggestRoute(from: string, to: string, mode: 'fast' | 'safe'): string[] {
  const best = new Map<string, { score: number; day: number; prev: string | null }>()
  best.set(from, { score: 0, day: 0, prev: null })
  const open: string[] = [from]
  const done = new Set<string>()
  while (open.length) {
    open.sort((a, b) => best.get(a)!.score - best.get(b)!.score)
    const cur = open.shift()!
    if (done.has(cur)) continue
    done.add(cur)
    if (cur === to) break
    const cb = best.get(cur)!
    for (const n of neighbors(cur)) {
      if (done.has(n)) continue
      const start = cb.day + 1
      const { cost } = legCost(HEXES.get(n)!.terrain, start)
      const score = cb.score + cost + (mode === 'safe' ? riskPenalty(n) : 0)
      const ex = best.get(n)
      if (!ex || score < ex.score) {
        best.set(n, { score, day: cb.day + cost, prev: cur })
        open.push(n)
      }
    }
  }
  const out: string[] = []
  let c: string | null = to
  while (c) { out.push(c); c = best.get(c)?.prev ?? null }
  return out.reverse()
}

// ── Prep-time candidates ──────────────────────────────────────────────────────────
export interface PrepCandidate {
  hex: string
  score: number
  title: string
  reasons: string[]
  minutes: number
  loc?: Loc
}

export function prepCandidates(routeA: string[], routeB: string[], forage: number): PrepCandidate[] {
  const sa = simulate(routeA).legs
  const sb = simulate(routeB).legs
  const hexes = new Set<string>([...routeA.slice(1), ...routeB.slice(1)])
  // lairs and camps within 2 hexes of the paths
  for (const l of LOCATIONS) {
    if (l.kind !== 'lair' && l.kind !== 'camp') continue
    if ([...routeA, ...routeB].some((h) => distance(h, l.hex) <= 2)) hexes.add(l.hex)
  }
  const out: PrepCandidate[] = []
  for (const hex of hexes) {
    const legA = sa.find((l) => l.hex === hex)
    const legB = sb.find((l) => l.hex === hex)
    const onLocs = LOC_BY_HEX.get(hex) ?? []
    const loc = onLocs.slice().sort((x, y) => (y.threat ?? 0) - (x.threat ?? 0))[0]
    const reach = LAIR_REACH.get(hex) ?? []
    const threat = Math.max(0, ...reach.map((r) => r.threat))
    const h = HEXES.get(hex)!
    let score = 0
    const reasons: string[] = []
    if (legA && legB) { score += 3.5; reasons.push('On both routes') }
    else if (legA) { score += 2; reasons.push('On route A') }
    else if (legB) { score += 1.5; reasons.push('On route B') }
    else { score += 0.5; reasons.push('Beside the paths') }
    const gap = loc ? (loc.prep === 'bare' ? 3 : loc.prep === 'sketched' ? 2 : 0.3) : (legA || legB ? 2 : 0)
    score += gap
    if (loc?.prep === 'bare') reasons.push('Keyed but never prepped')
    else if (loc?.prep === 'sketched') reasons.push('Only sketched')
    else if (!loc && (legA || legB)) reasons.push('Nothing keyed here')
    if (threat) { score += threat * 0.8; reasons.push(`Lair reach · threat ${threat}`) }
    const days = Math.max(legA?.cost ?? 0, legB?.cost ?? 0)
    if (days >= 3) { score += days * 0.4; reasons.push(`${days} days in this hex`) }
    if (hex === TOWER) { score += 3; reasons.push('Destination') }
    if (loc?.kind === 'camp' && loc.faction === 'lantern') { score += 1; reasons.push('Hostile camp') }
    if (h.know === 'unknown' && (legA || legB)) { score += 0.6; reasons.push('Players have no map of it') }
    const strat = Math.min(sa.length ? 1 : 0, 1)
    void strat; void forage
    const minutes = (loc ? (loc.prep === 'bare' ? 60 : loc.prep === 'sketched' ? 40 : 15) : 30) + (loc?.kind === 'lair' || loc?.kind === 'camp' ? 15 : 0)
    out.push({ hex, score, title: loc?.name ?? `${h.terrain[0].toUpperCase() + h.terrain.slice(1)} hex`, reasons, minutes, loc })
  }
  return out.sort((a, b) => b.score - a.score)
}
