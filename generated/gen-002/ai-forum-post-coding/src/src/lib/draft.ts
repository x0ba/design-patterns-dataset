import { CODEBOOK_V3, CODE_IDS, type Codebook, type CodeId } from '../data/codes'
import { CODED_BY_ID } from '../data/corpus'

export const cloneCodebook = (c: Codebook): Codebook => JSON.parse(JSON.stringify(c))

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** examples added since v3 (flagged isNew) */
export const newExamples = (d: Codebook) =>
  CODE_IDS.flatMap((c) => d[c].examples.filter((e) => e.isNew).map((e) => ({ ...e, in: c })))

export function changedCodes(d: Codebook): CodeId[] {
  return CODE_IDS.filter((c) => !same(stripNew(d[c]), CODEBOOK_V3[c]))
}
const stripNew = (def: Codebook[CodeId]) => ({
  ...def,
  examples: def.examples.map((e) => ({ ...e, isNew: undefined })),
})

/** Did the rules/definition of 'request for help' change (not counting examples)? */
const clean = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean)
export function requestTextChanged(d: Codebook) {
  const a = d.request
  const b = CODEBOOK_V3.request
  return a.definition.trim() !== b.definition.trim() || !same(clean(a.includes), b.includes) || !same(clean(a.excludes), b.excludes)
}

/** 0–3: new boundary examples under 'request for help' (max 2) + 1 for a definition/rule edit */
export function strengthOf(d: Codebook | null): number {
  if (!d) return 0
  const ex = d.request.examples.filter((e) => e.isNew && e.kind === 'boundary').length
  return Math.min(2, ex) + (requestTextChanged(d) ? 1 : 0)
}

/** gold-sample posts that are now used as codebook examples */
export function heldOutOf(d: Codebook | null): Set<string> {
  const s = new Set<string>()
  if (!d) return s
  for (const e of newExamples(d)) if (e.postId && CODED_BY_ID[e.postId]?.isGold) s.add(e.postId)
  return s
}

export const draftSig = (d: Codebook | null) => (d ? JSON.stringify(d) : '')

export function diffSummary(d: Codebook) {
  const codes = changedCodes(d)
  const ex = newExamples(d).length
  let rules = 0
  let defs = 0
  for (const c of codes) {
    if (d[c].definition.trim() !== CODEBOOK_V3[c].definition.trim()) defs++
    rules +=
      Math.abs(d[c].includes.length - CODEBOOK_V3[c].includes.length) +
      Math.abs(d[c].excludes.length - CODEBOOK_V3[c].excludes.length) +
      d[c].includes.filter((x, i) => CODEBOOK_V3[c].includes[i] !== x).length * 0 // content edits counted via changedCodes
  }
  return { codes, ex, defs, rules }
}
