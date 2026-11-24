import { LANES, STAGES } from './types'
import type { Edge, El, Lane, Stage } from './types'

export const NODE_W = 172
export const COL_GAP = 46
export const GUTTER = 26
export const PAD_X = 10
export const HEADER_H = 46
export const LANE_GAP = 8
export const LANE_PAD = 8
export const NODE_GAP = 6
export const MIN_LANE_H = 76
export const NODE_H: Record<Stage, number> = { input: 60, activity: 66, output: 66, outcome: 82, longterm: 94 }

export interface Box {
  x: number
  y: number
  w: number
  h: number
}
export interface Band {
  lane: Lane
  top: number
  h: number
}
export interface Layout {
  nodes: Record<string, Box>
  bands: Band[]
  width: number
  height: number
}

export const stageIndex = (s: Stage) => STAGES.indexOf(s)
export const colX = (stage: Stage) => GUTTER + PAD_X + stageIndex(stage) * (NODE_W + COL_GAP)

export function groupOf(els: El[], stage: Stage, lane: Lane): El[] {
  return els.filter((e) => e.stage === stage && e.lane === lane).sort((a, b) => a.order - b.order)
}

export function computeLayout(els: El[]): Layout {
  const bandInner: Record<Lane, number> = { tutoring: 0, shared: 0, bridges: 0 }
  for (const lane of LANES) {
    let max = 0
    for (const stage of STAGES) {
      const k = groupOf(els, stage, lane).length
      if (k > 0) max = Math.max(max, k * NODE_H[stage] + (k - 1) * NODE_GAP)
    }
    bandInner[lane] = Math.max(max + 2 * LANE_PAD, MIN_LANE_H)
  }
  const bands: Band[] = []
  let top = HEADER_H + 4
  for (const lane of LANES) {
    bands.push({ lane, top, h: bandInner[lane] })
    top += bandInner[lane] + LANE_GAP
  }
  const nodes: Record<string, Box> = {}
  for (const band of bands) {
    for (const stage of STAGES) {
      const g = groupOf(els, stage, band.lane)
      const inner = band.h - 2 * LANE_PAD
      const slot = inner / Math.max(g.length, 1)
      g.forEach((e, i) => {
        const h = NODE_H[stage]
        nodes[e.id] = { x: colX(stage), y: band.top + LANE_PAD + slot * i + (slot - h) / 2, w: NODE_W, h }
      })
    }
  }
  const width = GUTTER + PAD_X * 2 + STAGES.length * NODE_W + (STAGES.length - 1) * COL_GAP
  return { nodes, bands, width, height: top + 4 }
}

export function edgePath(a: Box, b: Box): { d: string; mx: number; my: number } {
  const x1 = a.x + a.w
  const y1 = a.y + a.h / 2
  const x2 = b.x
  const y2 = b.y + b.h / 2
  const dx = (x2 - x1) * 0.55
  return {
    d: `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
    mx: (x1 + x2) / 2,
    my: (y1 + y2) / 2,
  }
}

/** Count pairs of connections that cross between adjacent columns. */
export function countCrossings(layout: Layout, edges: Edge[]): number {
  const ys = (id: string) => (layout.nodes[id] ? layout.nodes[id].y + layout.nodes[id].h / 2 : 0)
  let total = 0
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i]
      const b = edges[j]
      if (a.from === b.from || a.to === b.to) continue
      if (layout.nodes[a.from] && layout.nodes[b.from] && Math.abs(layout.nodes[a.from].x - layout.nodes[b.from].x) > 1) continue
      const d1 = ys(a.from) - ys(b.from)
      const d2 = ys(a.to) - ys(b.to)
      if (d1 * d2 < 0) total++
    }
  }
  return total
}

function edgeSpan(layout: Layout, edges: Edge[]): number {
  let s = 0
  for (const e of edges) {
    const a = layout.nodes[e.from]
    const b = layout.nodes[e.to]
    if (a && b) s += Math.abs(a.y + a.h / 2 - (b.y + b.h / 2))
  }
  return s
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  const out: T[][] = []
  arr.forEach((x, i) => {
    for (const rest of permutations([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...rest])
  })
  return out
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Reorder elements inside each (column, program) group to cut line crossings.
 * Programs and columns never change. Uses coordinate descent from the current
 * order plus a handful of seeded random restarts, so results are repeatable.
 * Returns new `order` values by element id.
 */
export function tidyOrders(els: El[], edges: Edge[]): Record<string, number> {
  const score = (list: El[]) => {
    const l = computeLayout(list)
    return countCrossings(l, edges) * 100000 + edgeSpan(l, edges)
  }
  const descend = (start: El[]) => {
    const work = start.map((e) => ({ ...e }))
    let best = score(work)
    for (let sweep = 0; sweep < 8; sweep++) {
      let improved = false
      for (const stage of STAGES) {
        for (const lane of LANES) {
          const ids = groupOf(work, stage, lane).map((e) => e.id)
          if (ids.length < 2 || ids.length > 6) continue
          let bestPerm: string[] | null = null
          for (const p of permutations(ids)) {
            p.forEach((id, i) => {
              work.find((e) => e.id === id)!.order = i
            })
            const s = score(work)
            if (s < best - 0.001) {
              best = s
              bestPerm = p
            }
          }
          ;(bestPerm ?? ids).forEach((id, i) => {
            work.find((e) => e.id === id)!.order = i
          })
          if (bestPerm) improved = true
        }
      }
      if (!improved) break
    }
    return { work, best }
  }

  let result = descend(els)
  const rand = mulberry32(17)
  for (let r = 0; r < 24; r++) {
    const shuffled = els.map((e) => ({ ...e }))
    for (const stage of STAGES) {
      for (const lane of LANES) {
        const g = groupOf(shuffled, stage, lane)
        const idx = g.map((_, i) => i)
        for (let i = idx.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1))
          ;[idx[i], idx[j]] = [idx[j], idx[i]]
        }
        g.forEach((e, i) => (shuffled.find((x) => x.id === e.id)!.order = idx[i]))
      }
    }
    const cand = descend(shuffled)
    if (cand.best < result.best - 0.001) result = cand
  }
  const out: Record<string, number> = {}
  result.work.forEach((e) => (out[e.id] = e.order))
  return out
}

export function applyOrders(els: El[], orders: Record<string, number>): El[] {
  return els.map((e) => (orders[e.id] === undefined ? e : { ...e, order: orders[e.id] }))
}

/** Move an element to a program and position, then renumber the groups it touched. */
export function placeElement(els: El[], id: string, lane: Lane, index: number): El[] {
  const moving = els.find((e) => e.id === id)
  if (!moving) return els
  const oldLane = moving.lane
  const target = groupOf(els, moving.stage, lane).filter((e) => e.id !== id)
  const i = Math.max(0, Math.min(index, target.length))
  target.splice(i, 0, { ...moving, lane })
  const newOrder: Record<string, number> = {}
  target.forEach((e, k) => (newOrder[e.id] = k))
  const oldGroup = groupOf(els, moving.stage, oldLane).filter((e) => e.id !== id)
  if (oldLane !== lane) oldGroup.forEach((e, k) => (newOrder[e.id] = k))
  return els.map((e) => {
    if (e.id === id) return { ...e, lane, order: newOrder[id] }
    return newOrder[e.id] === undefined ? e : { ...e, order: newOrder[e.id] }
  })
}
