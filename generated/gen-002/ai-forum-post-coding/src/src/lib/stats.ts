import { CODE_IDS, type CodeId } from '../data/codes'
import { GOLD_POSTS, type CodedPost } from '../data/corpus'

export interface Pair {
  id: string
  a: CodeId // reference (gold / coder A)
  b: CodeId // rater (model / coder B)
}

export interface CodeStat {
  code: CodeId
  n: number // reference count
  predicted: number
  tp: number
  fn: number
  fp: number
  kappa: number
  ci: [number, number]
}

/** one-vs-rest Cohen's kappa for a single code */
export function kappaFor(pairs: Pair[], code: CodeId): number {
  const N = pairs.length
  if (!N) return NaN
  let g = 0
  let m = 0
  let agree = 0
  for (const p of pairs) {
    const ga = p.a === code
    const mb = p.b === code
    if (ga) g++
    if (mb) m++
    if (ga === mb) agree++
  }
  const po = agree / N
  const pe = (g * m + (N - g) * (N - m)) / (N * N)
  if (pe === 1) return 1
  return (po - pe) / (1 - pe)
}

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** percentile bootstrap, seeded so the interval does not wobble between renders */
export function bootstrapCI(pairs: Pair[], code: CodeId, iters = 400): [number, number] {
  const r = mulberry(9000 + CODE_IDS.indexOf(code))
  const N = pairs.length
  const ks: number[] = []
  for (let i = 0; i < iters; i++) {
    const s: Pair[] = new Array(N)
    for (let j = 0; j < N; j++) s[j] = pairs[Math.floor(r() * N)]
    const k = kappaFor(s, code)
    if (!Number.isNaN(k)) ks.push(k)
  }
  ks.sort((x, y) => x - y)
  return [ks[Math.floor(ks.length * 0.025)], ks[Math.floor(ks.length * 0.975)]]
}

export function statsFor(pairs: Pair[], withCI = true): Record<CodeId, CodeStat> {
  const out = {} as Record<CodeId, CodeStat>
  for (const code of CODE_IDS) {
    let n = 0, predicted = 0, tp = 0
    for (const p of pairs) {
      if (p.a === code) n++
      if (p.b === code) predicted++
      if (p.a === code && p.b === code) tp++
    }
    out[code] = {
      code, n, predicted, tp,
      fn: n - tp,
      fp: predicted - tp,
      kappa: kappaFor(pairs, code),
      ci: withCI ? bootstrapCI(pairs, code) : [NaN, NaN],
    }
  }
  return out
}

export const THRESHOLD = 0.75

export function failing(stats: Record<CodeId, CodeStat>): CodeStat[] {
  return CODE_IDS.map((c) => stats[c]).filter((s) => s.kappa < THRESHOLD)
}

// ── v3 baseline (what the model actually did on the gold sample) ─────────
export const V3_PAIRS: Pair[] = GOLD_POSTS.map((p) => ({ id: p.id, a: p.gold!, b: p.model.code }))
export const HUMAN_PAIRS: Pair[] = GOLD_POSTS.map((p) => ({ id: p.id, a: p.priya!, b: p.marcus! }))
export const V3_STATS = statsFor(V3_PAIRS)
export const HUMAN_STATS = statsFor(HUMAN_PAIRS, false)

export function confusionCounts(pairs: Pair[]) {
  const map = new Map<string, number>()
  for (const p of pairs) {
    if (p.a === p.b) continue
    const k = `${p.a}>${p.b}`
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([k, n]) => {
      const [gold, model] = k.split('>') as [CodeId, CodeId]
      return { gold, model, n }
    })
    .sort((x, y) => y.n - x.n)
}

// ── v4 what-if ───────────────────────────────────────────────────────────
/**
 * What the v4 definition would do on the gold sample. `strength` is the number
 * of new boundary examples for 'request for help' (max 2) plus one if its
 * definition or rules changed. Posts used as codebook examples are held out of
 * the comparison, because the model has now seen them.
 */
export function simulateV4(strength: number, heldOut: Set<string>): { pairs: Pair[]; changes: V4Change[] } {
  const pairs: Pair[] = []
  const changes: V4Change[] = []
  for (const p of GOLD_POSTS) {
    if (heldOut.has(p.id)) continue
    let b = p.model.code
    if (b !== p.gold && p.fixAt && strength >= p.fixAt) {
      b = p.gold!
      changes.push({ postId: p.id, from: p.model.code, to: b, gold: p.gold!, kind: 'fixed' })
    } else if (b === p.gold && p.breakAt && strength >= p.breakAt) {
      b = 'venting'
      changes.push({ postId: p.id, from: p.model.code, to: b, gold: p.gold!, kind: 'broken' })
    }
    pairs.push({ id: p.id, a: p.gold!, b })
  }
  return { pairs, changes }
}

export interface V4Change {
  postId: string
  from: CodeId
  to: CodeId
  gold: CodeId
  kind: 'fixed' | 'broken'
}

// ── re-run scoping for the first 1,240 labels ────────────────────────────
export function affectedByRequestChange(p: CodedPost): boolean {
  return p.model.code === 'request' || p.endsQ
}

export const fmtK = (k: number) => (Number.isNaN(k) ? '—' : k.toFixed(2))
