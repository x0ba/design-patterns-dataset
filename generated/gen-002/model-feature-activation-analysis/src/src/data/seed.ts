import { db, N, NF, LAYERS, layerOf, C_VAGUE, C_TOK, C_POS, H_INTERP, H_NOT, labelOf } from './db'

export type HypId = 'H1' | 'H2' | 'H3'
export type Stance = 'supports' | 'contradicts' | 'neutral'
export type Status = 'Open' | 'Testing' | 'Supported' | 'Partly supported' | 'Refuted'

export interface Bookmark { note: string; hyp: HypId | null; stance: Stance; added: string }
export interface Hypothesis { id: HypId; title: string; statement: string; status: Status; notes: string }
export interface Workspace { bookmarks: Record<number, Bookmark>; hyps: Hypothesis[] }

export const STATUSES: Status[] = ['Open', 'Testing', 'Supported', 'Partly supported', 'Refuted']

const DATES = ['Nov 10', 'Nov 11', 'Nov 12', 'Nov 13', 'Nov 14', 'Nov 15', 'Nov 16', 'Nov 17']

function alive() {
  const out: number[] = []
  for (let g = 0; g < N; g++) if (db.alive[g]) out.push(g)
  return out
}

export function seedWorkspace(): Workspace {
  const all = alive()
  const dense = all.filter((g) => db.freq[g] >= 0.1)
  const used = new Set<number>()
  const bm: [number, Omit<Bookmark, 'added'>][] = []
  const add = (g: number, hyp: HypId, stance: Stance, note: string) => {
    if (used.has(g)) return false
    used.add(g)
    bm.push([g, { hyp, stance, note }])
    return true
  }
  const byFreq = (a: number, b: number) => db.freq[b] - db.freq[a]

  // H3: L12 code cluster (all 5 dense members + 9 others)
  const cluster = all.filter((g) => db.cluster[g]).sort(byFreq)
  const clusterDense = cluster.filter((g) => db.freq[g] >= 0.1)
  const clusterRest = cluster.filter((g) => db.freq[g] < 0.1)
  clusterDense.forEach((g) => {
    add(g, 'H3', 'supports', db.human[g] === H_INTERP
      ? 'Dense, but clean: top-20 are all code and the human label agrees. Breaks the pattern.'
      : 'Dense (≥ 0.1) yet every top example is code. Needs a human label.')
  })
  const restNotes = [
    'Language-specific; narrow trigger, high score, tight CI.',
    'Fires on one syntactic construct across top-20. Not dense, included to show the cluster is coherent.',
    'Check whether the L10 / L14 neighbours are also code features.',
    'High score, narrow CI. Same family as the dense indentation feature?',
  ]
  for (let k = 0, n = 0; k < clusterRest.length && n < 9; k += 3, n++) {
    add(clusterRest[k], 'H3', n % restNotes.length === 2 ? 'neutral' : 'supports', restNotes[n % restNotes.length])
  }

  // H1: dense late-layer junk (supports)
  const junkNotes = [
    'Hedged auto-label; top-20 scatter across function words and punctuation. No rule I can state.',
    'Typical dense junk: the examples have nothing in common beyond being frequent tokens.',
    'Label is a hedge ("mixed" / "unclear"). Score and my own read agree.',
    'Top-20 look arbitrary. Supports the claim at this layer.',
  ]
  let jn = 0
  for (const li of [4, 5, 6, 7]) {
    const c = dense.filter((g) => layerOf(g) === li && db.cls[g] === C_VAGUE && db.human[g] !== 0).sort(byFreq)
    const c2 = dense.filter((g) => layerOf(g) === li && db.cls[g] === C_VAGUE).sort(byFreq)
    const src = [...c, ...c2]
    let n = 0
    for (const g of src) { if (n >= 2) break; if (add(g, 'H1', 'supports', junkNotes[jn % junkNotes.length])) { n++; jn++ } }
  }
  // H1: early-layer dense token features (contradicts)
  const tokNotes = [
    'Dense but trivially interpretable: a single token type. Counterexample for early layers.',
    'Clean token-identity feature. "Dense = junk" does not describe this layer.',
    'High score and a tight CI despite frequency ≥ 0.1.',
  ]
  let tn = 0
  for (const li of [0, 1, 2]) {
    const c = dense.filter((g) => layerOf(g) === li && db.cls[g] === C_TOK).sort((a, b) => db.score[b] - db.score[a])
    let n = 0
    for (const g of c) { if (n >= 2) break; if (add(g, 'H1', 'contradicts', tokNotes[tn % tokNotes.length])) { n++; tn++ } }
  }
  // H1: late non-cluster exceptions
  const lateEx = dense.filter((g) => layerOf(g) >= 3 && !db.cluster[g] && db.score[g] >= 0.5).sort((a, b) => db.score[b] - db.score[a])
  let en = 0
  for (const g of lateEx) {
    if (en >= 4) break
    if (add(g, 'H1', 'contradicts', 'Late-layer dense feature that still scores ≥ 0.5. Is the label just a token?')) en++
  }

  // H2: reliability vs. real interpretability
  const posHum = dense.filter((g) => db.cls[g] === C_POS && db.human[g] === H_INTERP).sort(byFreq)
  let pn = 0
  for (const g of posHum) { if (pn >= 4) break; if (add(g, 'H2', 'contradicts', 'Positional feature. Auto score is low but the human label says interpretable, so the score under-reads it.')) pn++ }
  const notHum = dense.filter((g) => db.human[g] === H_NOT && db.score[g] < 0.3).sort(byFreq)
  let nn = 0
  for (const g of notHum) { if (nn >= 2) break; if (add(g, 'H2', 'supports', 'Low score and the human label agrees: genuinely uninterpretable, not a scoring artefact.')) nn++ }
  const wide = dense.filter((g) => db.score[g] > 0.3 && db.score[g] < 0.6).sort((a, b) => (db.hi[b] - db.lo[b]) - (db.hi[a] - db.lo[a]))
  let wn = 0
  for (const g of wide) { if (wn >= 3) break; if (add(g, 'H2', 'neutral', 'The 95% CI spans most of the plausible range, so the score alone cannot rank this feature.')) wn++ }

  const bookmarks: Record<number, Bookmark> = {}
  bm.forEach(([g, b], i) => { bookmarks[g] = { ...b, added: DATES[i % DATES.length] } })
  // keep the order roughly chronological: assign dates by insertion order
  const keys = Object.keys(bookmarks).map(Number)
  keys.forEach((g, i) => { bookmarks[g].added = DATES[Math.min(DATES.length - 1, Math.floor((i / keys.length) * DATES.length))] })

  return {
    bookmarks,
    hyps: [
      {
        id: 'H1',
        title: 'Dense features are mostly junk',
        statement: 'Features with very high activation frequency (≥ 0.1) are mostly uninterpretable “dense” junk.',
        status: 'Testing',
        notes: 'Advisor asked whether this holds across layers or only in later ones. My first pass pooled all 8 layers, which hides a layer trend.\n\nPlan: per-layer breakdown, then check sensitivity to the 0.1 cut-off (try 0.05 and 0.2) and to the 0.5 interpretability cut-off before rewriting §4.2.',
      },
      {
        id: 'H2',
        title: 'Lower score vs. less reliable score',
        statement: 'Dense features score lower on automated interpretability because they are less interpretable, not merely because the score is noisier for them.',
        status: 'Testing',
        notes: 'CIs for dense features look wider. Two readings: (a) really less interpretable, (b) the simulator is worse at describing broad features, e.g. positional ones.\n\nUse the 600 human labels as ground truth: compare human labels to auto score within the dense group.',
      },
      {
        id: 'H3',
        title: 'The L12 code cluster is an exception',
        statement: 'The cluster of layer-12 features that all fire on code tokens is an exception: high frequency, high score, and consistent with human labels.',
        status: 'Open',
        notes: 'Found while browsing L12 top examples. Several are above 0.1 and look clean. Questions: is this one coherent family or 34 separate features? Do L10 / L14 have decoder-cosine neighbours, or does it only exist at L12?',
      },
    ],
  }
}

export const KEY = 'featurescope.workspace.v1'

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const w = JSON.parse(raw) as Workspace
      if (w && w.bookmarks && w.hyps && w.hyps.length === 3) return w
    }
  } catch { /* ignore */ }
  return seedWorkspace()
}

export function saveWorkspace(w: Workspace) {
  try { localStorage.setItem(KEY, JSON.stringify(w)) } catch { /* ignore */ }
}

export { NF, LAYERS, labelOf, H_NOT }
