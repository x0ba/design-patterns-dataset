import { ALL, BANK, VAGUE_CATS, VAGUE_FORMS, type Concept } from './concepts'

export const LAYERS = [2, 4, 6, 8, 10, 12, 14, 16]
export const NF = 16384
export const N = NF * LAYERS.length
export const TOKENS_TRAINED = 2_000_000_000
export const CLUSTER_LAYER_IDX = 5

const DEAD_RATE = [0.04, 0.05, 0.06, 0.08, 0.1, 0.11, 0.12, 0.13]
export const L0_TARGET = [18, 22, 27, 34, 41, 49, 57, 64]
const N_DENSE = [20, 30, 45, 70, 100, 122, 150, 170]
const ACT_SCALE = [3.1, 4.2, 5.6, 7.5, 10, 13, 17, 22]
const P_TOK = [0.8, 0.72, 0.5, 0.3, 0.2, 0.15, 0.12, 0.1]
const P_POS = [0, 0, 0.02, 0.08, 0.12, 0.15, 0.18, 0.2]
const TOK_MEAN = [0.78, 0.72, 0.6, 0.5, 0.45, 0.43, 0.41, 0.39]
export const RECON_NMSE = [0.021, 0.034, 0.047, 0.062, 0.079, 0.094, 0.112, 0.131]
export const CE_RECOVERED = [0.992, 0.986, 0.979, 0.971, 0.962, 0.953, 0.944, 0.931]

// Class codes
export const C_DEAD = 0, C_SPEC = 1, C_TOK = 2, C_POS = 3, C_VAGUE = 4, C_CLUSTER = 5
// Human labels
export const H_NONE = 0, H_INTERP = 1, H_PARTIAL = 2, H_NOT = 3
export const HUMAN_NAMES = ['', 'Interpretable', 'Partially interpretable', 'Not interpretable']

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
type Rng = () => number
function gauss(r: Rng) {
  const u = Math.max(r(), 1e-9), v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const smooth = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

export interface DB {
  freq: Float32Array
  meanAct: Float32Array
  maxAct: Float32Array
  score: Float32Array
  lo: Float32Array
  hi: Float32Array
  alive: Uint8Array
  cls: Uint8Array
  cid: Int16Array
  kid: Uint8Array
  labelId: Uint32Array
  human: Uint8Array
  cluster: Uint8Array
  labels: string[]
  vA: Uint8Array
  vB: Uint8Array
  byCid: Map<number, number[]>[]
  byCls: number[][][] // [li][cls] -> ids
  denseSum: number[]
  l0: number[]
}

function build(): DB {
  const freq = new Float32Array(N), meanAct = new Float32Array(N), maxAct = new Float32Array(N)
  const score = new Float32Array(N).fill(NaN), lo = new Float32Array(N).fill(NaN), hi = new Float32Array(N).fill(NaN)
  const alive = new Uint8Array(N), cls = new Uint8Array(N), kid = new Uint8Array(N)
  const cid = new Int16Array(N).fill(-2)
  const labelId = new Uint32Array(N), human = new Uint8Array(N), cluster = new Uint8Array(N)
  const vA = new Uint8Array(N), vB = new Uint8Array(N)
  const labels: string[] = ['—']
  const labelMap = new Map<string, number>([['—', 0]])
  const lab = (s: string) => {
    let id = labelMap.get(s)
    if (id === undefined) { id = labels.length; labels.push(s); labelMap.set(s, id) }
    return id
  }
  const byCid: Map<number, number[]>[] = LAYERS.map(() => new Map())
  const byCls: number[][][] = LAYERS.map(() => [[], [], [], [], [], []])
  const denseSum: number[] = []
  const l0: number[] = []

  const idxOf = (id: string) => ALL.findIndex((c) => c.id === id)
  const clusterConcepts = ALL.map((c, i) => [c, i] as const).filter(([c]) => c.cluster)

  // concept pools per layer & tier
  type Pool = { ids: number[]; cum: number[] }
  const mk = (arr: [number, number][]): Pool => {
    let s = 0
    return { ids: arr.map((a) => a[0]), cum: arr.map((a) => (s += a[1])) }
  }
  const pool = (li: number, tier: string, doms: string[], noCluster: boolean): Pool => {
    const arr: [number, number][] = []
    ALL.forEach((c, i) => {
      if (!doms.includes(c.dom)) return
      if (li < c.lay[0] || li > c.lay[1]) return
      if (!c.tiers.includes(tier)) return
      if (c.cluster && noCluster) return
      let w = c.w ?? 1
      if (c.cluster) w *= 0.3
      arr.push([i, w])
    })
    return mk(arr)
  }
  const draw = (p: Pool, r: Rng) => {
    if (!p.ids.length) return -1
    const x = r() * p.cum[p.cum.length - 1]
    let k = 0
    while (p.cum[k] < x) k++
    return p.ids[k]
  }

  for (let li = 0; li < LAYERS.length; li++) {
    const r = mulberry32(1000 + li * 7919)
    const base = li * NF
    // 1. kinds: 0 dead, 1 bulk, 2 dense, 3 cluster
    const kind = new Uint8Array(NF)
    for (let i = 0; i < NF; i++) kind[i] = r() < DEAD_RATE[li] ? 0 : 1
    const pick = (k: number, tag: number) => {
      let n = 0
      while (n < k) {
        const i = Math.floor(r() * NF)
        if (kind[i] === 1) { kind[i] = tag; n++ }
      }
    }
    if (li === CLUSTER_LAYER_IDX) pick(clusterConcepts.length, 3)
    pick(N_DENSE[li], 2)

    // 2. frequencies
    const lf = new Float64Array(NF)
    const z = new Float64Array(NF)
    let fixedSum = 0
    let clusterPtr = 0
    const clusterIdx: number[] = []
    for (let i = 0; i < NF; i++) {
      if (kind[i] === 2) {
        const f = 0.1 * Math.pow(4, Math.pow(r(), 1.5))
        lf[i] = Math.log10(f); fixedSum += f
      } else if (kind[i] === 3) {
        clusterIdx.push(i)
      } else if (kind[i] === 1) z[i] = gauss(r)
    }
    // shuffle cluster idx so concept order is not monotone in index
    for (let k = clusterIdx.length - 1; k > 0; k--) {
      const j = Math.floor(r() * (k + 1));[clusterIdx[k], clusterIdx[j]] = [clusterIdx[j], clusterIdx[k]]
    }
    const clusterConceptOf = new Map<number, number>()
    clusterIdx.forEach((i) => {
      const [c, ci] = clusterConcepts[clusterPtr++]
      const f = Math.exp(Math.log(c.f![0]) + r() * (Math.log(c.f![1]) - Math.log(c.f![0])))
      lf[i] = Math.log10(f); fixedSum += f
      clusterConceptOf.set(i, ci)
    })
    const SD = 1.05
    const target = Math.max(2, L0_TARGET[li] - fixedSum)
    const bulkSum = (mu: number) => {
      let s = 0
      for (let i = 0; i < NF; i++) if (kind[i] === 1) s += Math.pow(10, clamp(mu + SD * z[i], -7, -1.05))
      return s
    }
    let a = -9, b = -1
    for (let it = 0; it < 36; it++) {
      const m = (a + b) / 2
      if (bulkSum(m) > target) b = m; else a = m
    }
    const mu = (a + b) / 2
    for (let i = 0; i < NF; i++) if (kind[i] === 1) lf[i] = clamp(mu + SD * z[i], -7, -1.05)
    let dsum = 0, tsum = 0
    for (let i = 0; i < NF; i++) {
      if (kind[i] === 0) continue
      const f = Math.pow(10, lf[i])
      tsum += f
      if (f >= 0.1) dsum += f
    }
    denseSum.push(dsum); l0.push(tsum)

    // 3. per-feature attributes
    const specPools: Record<string, Pool> = {}
    const specPoolFor = (tier: string) =>
      (specPools[tier] ??= pool(li, tier, ['prose', 'code', 'token'], li === CLUSTER_LAYER_IDX))
    const tokPool = pool(li, 'd', ['token'], true)
    const posPool = pool(li, 'd', ['pos'], true)

    for (let i = 0; i < NF; i++) {
      const g = base + i
      if (kind[i] === 0) { cls[g] = C_DEAD; byCls[li][C_DEAD].push(g); continue }
      alive[g] = 1
      const f = Math.pow(10, lf[i])
      freq[g] = f
      const L = lf[i]
      const tier = f >= 0.1 ? 'd' : f >= 0.01 ? 'm' : 's'
      let c = C_SPEC, ci = -1
      let s: number
      let hwScale = 1

      if (kind[i] === 3) {
        c = C_CLUSTER; ci = clusterConceptOf.get(i)!
        cluster[g] = 1
        s = clamp(0.86 + 0.06 * gauss(r), 0.72, 0.97)
        hwScale = 0.55
      } else {
        const u = r()
        if (tier === 'd') {
          if (u < P_TOK[li] && tokPool.ids.length) { c = C_TOK; ci = draw(tokPool, r) }
          else if (u < P_TOK[li] + P_POS[li] && posPool.ids.length) { c = C_POS; ci = draw(posPool, r) }
          else c = C_VAGUE
        } else {
          const pv = tier === 'm' ? 0.25 + 0.03 * li : 0.14 + 0.02 * li
          if (u < pv) c = C_VAGUE
          else { ci = draw(specPoolFor(tier), r); if (ci < 0) c = C_VAGUE }
        }
        if (c === C_TOK) s = clamp(TOK_MEAN[li] + 0.14 * gauss(r), 0.04, 0.98)
        else if (c === C_POS) { s = clamp(0.17 + 0.08 * gauss(r), 0.03, 0.4); hwScale = 1.2 }
        else if (c === C_VAGUE) s = clamp(0.2 + 0.1 * gauss(r), 0.02, 0.55)
        else {
          const m = 0.75 - 0.018 * li - 0.1 * smooth(L, -4, -1)
          s = clamp(m + 0.15 * gauss(r), 0.04, 0.99)
        }
      }
      cls[g] = c
      cid[g] = ci
      byCls[li][c].push(g)
      if (ci >= 0) {
        const m = byCid[li]
        const arr = m.get(ci)
        if (arr) arr.push(g); else m.set(ci, [g])
      }

      // label
      if (c === C_VAGUE) {
        const ia = Math.floor(r() * VAGUE_CATS.length)
        let ib = Math.floor(r() * VAGUE_CATS.length)
        if (ib === ia) ib = (ib + 1) % VAGUE_CATS.length
        const fi = Math.floor(r() * VAGUE_FORMS.length)
        vA[g] = ia; vB[g] = ib; kid[g] = fi
        labelId[g] = lab(VAGUE_FORMS[fi](VAGUE_CATS[ia][0], VAGUE_CATS[ib][0]))
      } else {
        const con = ALL[ci]
        const k = Math.floor(r() * con.labels.length)
        kid[g] = k
        labelId[g] = lab(con.labels[k])
      }

      // score & CI
      score[g] = s
      const dens = smooth(L, -3, -1)
      const rare = smooth(-L, 5, 6.5)
      let hw = (0.062 + 0.125 * dens + 0.045 * rare) * (1 + 0.035 * li) * hwScale
      hw *= Math.exp(0.22 * gauss(r))
      hw = clamp(hw, 0.015, 0.45)
      lo[g] = Math.max(0, s - hw * (1 + 0.1 * (s - 0.5)))
      hi[g] = Math.min(1, s + hw * (1 - 0.1 * (s - 0.5)))

      // activations
      const mx = ACT_SCALE[li] * Math.exp(0.4 + 0.45 * gauss(r)) * (tier === 'd' ? 0.65 : 1)
      maxAct[g] = mx
      const ratio = tier === 'd' ? 0.35 + 0.2 * r() : tier === 'm' ? 0.22 + 0.18 * r() : 0.15 + 0.15 * r()
      meanAct[g] = mx * ratio
    }
  }

  // Human labels on 600 hand-reviewed features (75 per layer, dense features oversampled)
  const KD = [12, 14, 16, 18, 20, 22, 22, 22]
  for (let li = 0; li < LAYERS.length; li++) {
    const r = mulberry32(777 + li * 131)
    const base = li * NF
    const chosen = new Set<number>()
    const dense: number[] = [], rest: number[] = [], clus: number[] = []
    for (let i = 0; i < NF; i++) {
      const g = base + i
      if (!alive[g]) continue
      if (cluster[g]) clus.push(g)
      if (freq[g] >= 0.1) dense.push(g); else rest.push(g)
    }
    const take = (arr: number[], k: number) => {
      let n = 0, guard = 0
      while (n < k && guard++ < 100000) {
        const g = arr[Math.floor(r() * arr.length)]
        if (!chosen.has(g)) { chosen.add(g); n++ }
      }
    }
    if (clus.length) take(clus, 7)
    take(dense, Math.min(KD[li], dense.length) - chosen.size)
    take(rest, 75 - chosen.size)
    chosen.forEach((g) => {
      const c = cls[g], s = score[g], u = r()
      let h: number
      if (c === C_POS) h = u < 0.85 ? H_INTERP : H_PARTIAL
      else if (c === C_VAGUE) h = u < 0.7 ? H_NOT : u < 0.97 ? H_PARTIAL : H_INTERP
      else if (c === C_CLUSTER) h = u < 0.9 ? H_INTERP : H_PARTIAL
      else if (s >= 0.7) h = u < 0.88 ? H_INTERP : u < 0.98 ? H_PARTIAL : H_NOT
      else if (s >= 0.4) h = u < 0.5 ? H_INTERP : u < 0.85 ? H_PARTIAL : H_NOT
      else h = u < 0.25 ? H_INTERP : u < 0.55 ? H_PARTIAL : H_NOT
      human[g] = h
    })
  }

  return { freq, meanAct, maxAct, score, lo, hi, alive, cls, cid, kid, labelId, human, cluster, labels, vA, vB, byCid, byCls, denseSum, l0 }
}

export const db = build()
export const layerOf = (g: number) => (g / NF) | 0
export const idxOf = (g: number) => g % NF
export const gid = (li: number, i: number) => li * NF + i
export const featName = (g: number) => `L${LAYERS[layerOf(g)]} #${idxOf(g)}`
export const labelOf = (g: number) => db.labels[db.labelId[g]]
export const isDense = (g: number, t: number) => db.freq[g] >= t

export function fmtFreq(f: number) {
  if (!f) return '0'
  if (f >= 0.01) return f.toFixed(3)
  if (f >= 0.001) return f.toFixed(4)
  const e = Math.floor(Math.log10(f)), m = f / Math.pow(10, e)
  return `${m.toFixed(1)}e${e}`
}

// ---------------------------------------------------------------------------------------------
// Examples
export interface Tok { t: string; a: number }
export interface Example { src: string; doc: number; pos: number; peak: number; toks: Tok[]; cutL: boolean; cutR: boolean; lang?: string }

const TOKRE = /\n| ?[\p{L}\p{N}_]+| ?[^\s\p{L}\p{N}_]|[ \t]+/gu

function tokenize(text: string, ranges: [number, number][]): { t: string; hot: boolean }[] {
  const out: { t: string; hot: boolean }[] = []
  TOKRE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKRE.exec(text))) {
    const t = m[0]
    let off = 0
    while (off < t.length - 1 && t[off] === ' ') off++
    const p = m.index + off
    out.push({ t, hot: ranges.some(([s, e]) => p >= s && p < e) })
  }
  return out
}

function parseTemplate(raw: string): { text: string; ranges: [number, number][] } {
  let text = ''
  const ranges: [number, number][] = []
  let start = -1
  for (const ch of raw) {
    if (ch === '«') start = text.length
    else if (ch === '»') { ranges.push([start, text.length]); start = -1 }
    else text += ch
  }
  return { text, ranges }
}

const SYN: Record<string, string[]> = {
  items: ['rows', 'records', 'entries'], users: ['accounts', 'members'], total: ['count', 'acc', 'running'],
  path: ['filename', 'src_path'], data: ['payload', 'blob'], name: ['title', 'label'], n: ['k', 'size'],
  x: ['v', 'val'], i: ['j', 'idx'], user: ['member', 'acct'], count: ['num', 'tally'], limit: ['cap', 'max_n'],
  config: ['settings', 'opts'], rows: ['lines', 'chunks'], url: ['endpoint', 'target'],
}
const COMMENT_LEAD: Record<string, string> = {
  python: '# ', shell: '# ', yaml: '# ', c: '// ', cpp: '// ', javascript: '// ', typescript: '// ', rust: '// ', go: '// ', java: '// ', css: '/* ', sql: '-- ',
}
const COMMENT_TEXT = [
  'TODO: handle the empty case', 'see issue #214', 'keep in sync with config', 'legacy path', 'fast path',
  'validated upstream', 'no-op for empty input', 'cached per request', 'hot loop', 'must stay idempotent',
  'workaround for upstream bug', 'only runs in CI', 'deprecated, remove in 2.0', 'ordering matters here',
  'checked by caller', 'see RFC 7231', 'benchmarked on A100', 'not thread-safe',
]

function expandChoices(s: string, r: Rng) {
  return s.replace(/‹([^›]*)›/g, (_, g: string) => {
    const o = g.split('|')
    return o[Math.floor(r() * o.length)]
  })
}
function substitute(s: string, r: Rng) {
  const used = new Map<string, string>()
  return s.replace(/\b[a-z_]+\b/g, (w) => {
    const o = SYN[w]
    if (!o) return w
    if (!used.has(w)) used.set(w, r() < 0.55 ? o[Math.floor(r() * o.length)] : w)
    return used.get(w)!
  })
}

const exCache = new Map<number, Example[]>()
const sentenceHasMatch = new Map<string, number[]>()

export function examples(g: number): Example[] {
  const hit = exCache.get(g)
  if (hit) return hit
  const out = buildExamples(g)
  exCache.set(g, out)
  return out
}

function buildExamples(g: number): Example[] {
  if (!db.alive[g]) return []
  const r = mulberry32((g * 2654435761) >>> 0 ^ 0x9e3779b9)
  const c = db.cls[g]
  const mx = db.maxAct[g]
  const exs: Example[] = []
  const seen = new Set<string>()
  const con: Concept | null = db.cid[g] >= 0 ? ALL[db.cid[g]] : null
  const k = db.kid[g]
  const peaks = Array.from({ length: 20 }, (_, n) => (n === 0 ? mx : mx * (1 - 0.3 * Math.pow(n / 19, 1.1)) * (0.97 + 0.03 * r())))
  const pickSent = () => BANK[Math.floor(r() * BANK.length)]

  const finish = (toks: { t: string; hot: boolean; a?: number }[], n: number, meta: Partial<Example> & { src: string }) => {
    const peak = peaks[n]
    // window to <= 56 tokens around first hot token
    let first = toks.findIndex((t) => t.hot || (t.a ?? 0) > 0)
    if (first < 0) first = 0
    let s = 0, e = toks.length
    if (toks.length > 56) {
      s = clamp(first - 22 - Math.floor(r() * 6), 0, toks.length - 56)
      e = s + 56
    }
    let firstHotSeen = false
    const w = toks.slice(s, e).map((t, j, arr) => {
      let a = t.a ?? 0
      if (t.hot && t.a === undefined) {
        a = !firstHotSeen ? peak : peak * (0.4 + 0.6 * r())
        firstHotSeen = true
      } else if (!t.hot && t.a === undefined && j > 0 && arr[j - 1].hot && r() < 0.45) a = peak * (0.04 + 0.08 * r())
      return { t: t.t, a }
    })
    // normalise so the maximum activation in the example equals the peak
    const m = Math.max(...w.map((t) => t.a))
    if (m > 0) w.forEach((t) => (t.a = (t.a / m) * peak))
    exs.push({ src: meta.src, doc: meta.doc ?? Math.floor(r() * 900000), pos: meta.pos ?? Math.floor(r() * 1000), peak, toks: w, cutL: s > 0, cutR: e < toks.length, lang: meta.lang })
  }

  if (con && (con.dom === 'prose' || con.dom === 'code')) {
    const rot = k % con.tpl.length
    const tpls = [...con.tpl.slice(rot), ...con.tpl.slice(0, rot)]
    for (let n = 0, tries = 0; n < 20 && tries < 200; tries++) {
      let raw = expandChoices(tpls[(tries + (r() < 0.25 ? 1 : 0)) % tpls.length], r)
      if (con.dom === 'code') {
        raw = substitute(raw, r)
        const lead = COMMENT_LEAD[con.lang ?? '']
        if (lead && con.id !== 'comment' && r() < 0.6) {
          const t = COMMENT_TEXT[Math.floor(r() * COMMENT_TEXT.length)]
          raw = `${lead}${t}${lead === '/* ' ? ' */' : ''}\n${raw}`
        }
      } else {
        const foreign = /\((fr|es|de|it)\)/.test(con.src)
        const pre = !foreign && r() < 0.55 ? pickSent() + ' ' : ''
        const post = !foreign && r() < 0.4 ? ' ' + pickSent() : ''
        raw = pre + raw + post
      }
      if (seen.has(raw) && tries < 150) continue
      seen.add(raw)
      const { text, ranges } = parseTemplate(raw)
      finish(tokenize(text, ranges), n, { src: con.src, lang: con.lang })
      n++
    }
  } else if (con && con.dom === 'token') {
    const re = new RegExp(con.match!)
    const test = (t: string) => re.test(t.trim() === '' ? t : t)
    const key = con.id
    let ok = sentenceHasMatch.get(key)
    if (!ok) {
      ok = []
      BANK.forEach((s, i) => { if (tokenize(s, []).some((t) => test(t.t))) ok!.push(i) })
      if (con.id === 't-nl') ok = BANK.map((_, i) => i)
      sentenceHasMatch.set(key, ok)
    }
    for (let n = 0; n < 20; n++) {
      const cnt = 2 + Math.floor(r() * 2)
      const parts: string[] = []
      for (let q = 0; q < cnt; q++) parts.push(BANK[ok[Math.floor(r() * ok.length)]])
      const text = parts.join(con.id === 't-nl' ? '\n' : ' ')
      const toks = tokenize(text, []).map((t) => ({ t: t.t, hot: false, a: test(t.t) && r() < 0.88 ? 1 : 0 }))
      toks.forEach((t) => { if (t.a) t.a = 0.4 + 0.6 * r() })
      if (!toks.some((t) => t.a > 0)) toks[Math.floor(r() * toks.length)].a = 1
      finish(toks, n, { src: con.src, pos: Math.floor(r() * 2000) })
    }
  } else if (con && con.dom === 'pos') {
    const early = con.id === 'p-early'
    for (let n = 0; n < 20; n++) {
      const text = Array.from({ length: 4 }, pickSent).join(' ')
      const all = tokenize(text, [])
      if (early) {
        const arr = all.slice(0, 44).map((t, j) => ({ t: t.t, hot: false, a: j > 17 ? 0 : Math.exp(-j / 7) * (0.8 + 0.2 * r()) }))
        finish(arr, n, { src: con.src, pos: 0 })
      } else {
        const arr = all.slice(-46).map((t, j, a) => ({ t: t.t, hot: false, a: (0.18 + 0.82 * (j / a.length)) * (0.75 + 0.25 * r()) }))
        finish(arr, n, { src: con.src, pos: 1024 + Math.floor(r() * 3000) })
      }
    }
  } else {
    // vague
    const ra = new RegExp(VAGUE_CATS[db.vA[g]][1]), rb = new RegExp(VAGUE_CATS[db.vB[g]][1])
    for (let n = 0; n < 20; n++) {
      const text = pickSent() + ' ' + pickSent()
      const toks = tokenize(text, []).map((t) => {
        const hitA = ra.test(t.t), hitB = rb.test(t.t)
        const p = hitA || hitB ? 0.55 : 0.04
        return { t: t.t, hot: false, a: r() < p ? 0.15 + 0.85 * r() : 0 }
      })
      if (!toks.some((t) => t.a > 0)) toks[Math.floor(r() * toks.length)].a = 1
      finish(toks, n, { src: 'FineWeb-Edu' })
    }
  }
  return exs
}

// ---------------------------------------------------------------------------------------------
// Decoder-cosine neighbours in adjacent sampled layers
export interface Nb { g: number; cos: number }
const nbCache = new Map<number, Nb[]>()

export function neighbors(g: number, dir: -1 | 1): Nb[] {
  const key = g * 2 + (dir === 1 ? 1 : 0)
  const hit = nbCache.get(key)
  if (hit) return hit
  const li = layerOf(g), lj = li + dir
  let out: Nb[] = []
  if (lj >= 0 && lj < LAYERS.length && db.alive[g]) {
    const r = mulberry32((g * 40503 + (dir + 3) * 977) >>> 0)
    let cand: number[] = []
    const ci = db.cid[g]
    if (ci >= 0) cand = db.byCid[lj].get(ci) ?? []
    let strong = cand.length > 0
    if (cand.length < 4) {
      const c = db.cls[g]
      const kind = c === C_CLUSTER ? C_SPEC : c
      const extra = db.byCls[lj][kind] ?? []
      cand = cand.concat(c === C_CLUSTER ? db.byCls[lj][C_CLUSTER] : [])
      for (let q = 0; q < 8 && extra.length; q++) cand.push(extra[Math.floor(r() * extra.length)])
    }
    const ranked = cand.map((x) => ({ x, h: r() })).sort((a, b) => a.h - b.h)
    const picked: number[] = []
    for (const { x } of ranked) {
      if (!picked.includes(x)) picked.push(x)
      if (picked.length === 4) break
    }
    const top = strong ? 0.64 + 0.22 * r() : 0.38 + 0.12 * r()
    out = picked.map((x, j) => ({ g: x, cos: Math.max(0.2, top - 0.05 * j - 0.03 * r()) }))
    if (!strong) out = out.map((o, j) => ({ ...o, cos: Math.max(0.2, 0.46 - 0.04 * j - 0.03 * r()) }))
    out.sort((a, b) => b.cos - a.cos)
  }
  nbCache.set(key, out)
  return out
}

export function lineage(g: number): { g: number; cos?: number }[] {
  const chain: { g: number; cos?: number }[] = [{ g }]
  for (const dir of [-1, 1] as const) {
    let cur = g
    for (;;) {
      const nb = neighbors(cur, dir)[0]
      if (!nb) break
      cur = nb.g
      if (dir === -1) chain.unshift({ g: cur, cos: nb.cos }); else chain.push({ g: cur, cos: nb.cos })
    }
  }
  return chain
}

export function humanText(g: number): string {
  const h = db.human[g]
  if (!h) return ''
  const label = labelOf(g)
  const c = db.cls[g]
  const r = mulberry32(g + 5)
  if (c === C_POS) return h === H_INTERP ? (db.cid[g] >= 0 && ALL[db.cid[g]].id === 'p-early' ? 'Fires on the first few tokens of any document' : 'Position in context window (>1k tokens); content-independent') : 'Mostly position-related, some content effects'
  if (c === C_VAGUE) return h === H_NOT ? 'No consistent pattern across top examples' : 'Loosely ' + label.replace(/^Mixed: |^Unclear; fires on |^Weak association with |^Possibly /, '').replace(/ \(low specificity\)/, '')
  if (h === H_INTERP) return label.replace(/ \(.*\)$/, '')
  if (h === H_PARTIAL) return label.replace(/ \(.*\)$/, '') + (r() < 0.5 ? ' — plus unrelated tokens' : ' — only in some contexts')
  return 'Cannot infer a rule from the examples'
}
