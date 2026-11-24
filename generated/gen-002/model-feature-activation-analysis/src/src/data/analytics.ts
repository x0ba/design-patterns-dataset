import { db, N, NF, LAYERS, layerOf, H_INTERP, H_PARTIAL, H_NOT } from './db'

export const median = (a: ArrayLike<number>) => {
  const n = a.length
  if (!n) return NaN
  const s = Float64Array.from(a as any).sort()
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (!n) return [0, 1]
  const p = k / n
  const d = 1 + (z * z) / n
  const c = p + (z * z) / (2 * n)
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return [(c - h) / d, (c + h) / d]
}

export interface LayerStat {
  li: number
  alive: number
  nDense: number
  nInterp: number
  junk: number
  junkLo: number
  junkHi: number
  medDense: number
  medSparse: number
  ciDense: number
  ciSparse: number
  l0Share: number
  l0: number
  nCluster: number
  verdict: 'holds' | 'fails' | 'unclear'
}

export function layerStats(denseT: number, interpT: number): LayerStat[] {
  return LAYERS.map((_, li) => {
    const dS: number[] = [], sS: number[] = [], dC: number[] = [], sC: number[] = []
    let alive = 0, nInterp = 0, dsum = 0, tsum = 0, nCluster = 0
    for (let i = 0; i < NF; i++) {
      const g = li * NF + i
      if (!db.alive[g]) continue
      alive++
      const f = db.freq[g]
      tsum += f
      if (db.cluster[g]) nCluster++
      if (f >= denseT) {
        dsum += f
        dS.push(db.score[g]); dC.push(db.hi[g] - db.lo[g])
        if (db.score[g] >= interpT) nInterp++
      } else { sS.push(db.score[g]); sC.push(db.hi[g] - db.lo[g]) }
    }
    const nDense = dS.length
    const junkK = nDense - nInterp
    const [jl, jh] = wilson(junkK, nDense)
    return {
      li, alive, nDense, nInterp,
      junk: nDense ? junkK / nDense : NaN, junkLo: jl, junkHi: jh,
      medDense: median(dS), medSparse: median(sS), ciDense: median(dC), ciSparse: median(sC),
      l0Share: tsum ? dsum / tsum : 0, l0: tsum, nCluster,
      verdict: !nDense ? 'unclear' : jl > 0.5 ? 'holds' : jh < 0.5 ? 'fails' : 'unclear',
    }
  })
}

export interface Filter { layers: boolean[]; labelMask: Uint8Array | null; humanOnly: boolean; includeDead: boolean }

export function labelMask(q: string): Uint8Array | null {
  const s = q.trim().toLowerCase()
  if (!s) return null
  const m = new Uint8Array(db.labels.length)
  for (let i = 1; i < db.labels.length; i++) if (db.labels[i].toLowerCase().includes(s)) m[i] = 1
  return m
}

export function filterIds(f: Filter): Uint32Array {
  const out = new Uint32Array(N)
  let n = 0
  for (let li = 0; li < LAYERS.length; li++) {
    if (!f.layers[li]) continue
    for (let i = 0; i < NF; i++) {
      const g = li * NF + i
      if (!f.includeDead && !db.alive[g]) continue
      if (f.humanOnly && !db.human[g]) continue
      if (f.labelMask && !f.labelMask[db.labelId[g]]) continue
      out[n++] = g
    }
  }
  return out.slice(0, n)
}

export interface Bins { edges: number[]; med: number[]; n: number[] }

// log10-frequency bins from 1e-6.5 to 1e-0.4
export function freqBins(li: number, metric: 'score' | 'ci', nb = 14): Bins {
  const lo = -6.5, hi = -0.4, w = (hi - lo) / nb
  const buckets: number[][] = Array.from({ length: nb }, () => [])
  for (let i = 0; i < NF; i++) {
    const g = li * NF + i
    if (!db.alive[g]) continue
    const l = Math.log10(db.freq[g])
    const b = Math.min(nb - 1, Math.max(0, Math.floor((l - lo) / w)))
    buckets[b].push(metric === 'score' ? db.score[g] : db.hi[g] - db.lo[g])
  }
  return {
    edges: Array.from({ length: nb + 1 }, (_, k) => lo + k * w),
    med: buckets.map((b) => (b.length >= 8 ? median(b) : NaN)),
    n: buckets.map((b) => b.length),
  }
}

export const SCORE_BINS: [number, number, string][] = [[0, 0.25, '< 0.25'], [0.25, 0.5, '0.25–0.5'], [0.5, 0.75, '0.5–0.75'], [0.75, 1.01, '≥ 0.75']]

export interface Calib { n: number; interp: number; partial: number; not: number }

export function calibration(layers: boolean[], denseT: number) {
  const out = { dense: SCORE_BINS.map(() => ({ n: 0, interp: 0, partial: 0, not: 0 }) as Calib), sparse: SCORE_BINS.map(() => ({ n: 0, interp: 0, partial: 0, not: 0 }) as Calib) }
  for (let g = 0; g < N; g++) {
    if (!db.human[g] || !layers[layerOf(g)]) continue
    const s = db.score[g]
    const b = SCORE_BINS.findIndex(([a, z]) => s >= a && s < z)
    const t = (db.freq[g] >= denseT ? out.dense : out.sparse)[b]
    t.n++
    if (db.human[g] === H_INTERP) t.interp++
    else if (db.human[g] === H_PARTIAL) t.partial++
    else if (db.human[g] === H_NOT) t.not++
  }
  return out
}

export function fmtInt(n: number) { return n.toLocaleString('en-US') }
export const pct = (x: number, d = 0) => (isNaN(x) ? '—' : `${(x * 100).toFixed(d)}%`)
