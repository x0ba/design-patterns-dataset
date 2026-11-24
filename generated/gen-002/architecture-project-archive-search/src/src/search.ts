import { PROJECTS } from './data/generate'
import type { Project } from './data/types'
import { SPEC_TITLES } from './data/vocab'

export interface Filters {
  types: string[]
  sectors: string[]
  materials: string[]
  specs: string[]
  leads: string[]
  yearMin: number
  yearMax: number
  awardsOnly: boolean
}

export const YEAR_MIN = 1994
export const YEAR_MAX = 2026

export const EMPTY_FILTERS: Filters = {
  types: [],
  sectors: [],
  materials: [],
  specs: [],
  leads: [],
  yearMin: YEAR_MIN,
  yearMax: YEAR_MAX,
  awardsOnly: false,
}

export type FacetKey = 'types' | 'sectors' | 'materials' | 'specs' | 'leads' | 'year' | 'awards'

const STOP = new Set([
  'a', 'an', 'the', 'of', 'for', 'and', 'or', 'with', 'in', 'on', 'at', 'to', 'by', 'around', 'maybe', 'about', 'circa', 'like',
  'similar', 'project', 'projects', 'that', 'we', 'did', 'some', 'kind', 'sort', 'one', 'approx', 'ish', 'facade',
])

const SYN: Record<string, string[]> = {
  garage: ['garage', 'parking', 'parkade'],
  garages: ['garage', 'parking'],
  parkade: ['garage', 'parking'],
  carpark: ['garage', 'parking'],
  hospital: ['hospital', 'medical', 'healthcare', 'health'],
  medical: ['medical', 'hospital', 'healthcare', 'health'],
  healthcare: ['healthcare', 'medical', 'hospital', 'health'],
  clinic: ['clinic', 'medical', 'healthcare'],
  perf: ['perforated'],
  perforated: ['perforated'],
  perforation: ['perforated', 'perforation'],
  screen: ['screen', 'sunscreen', 'scrim'],
  screening: ['screen', 'sunscreen'],
  aluminium: ['aluminum'],
  alu: ['aluminum'],
  clt: ['clt', 'timber'],
  school: ['school', 'academy', 'education'],
  uni: ['university', 'college'],
  university: ['university', 'college'],
  station: ['station', 'transit'],
}

export interface Interp {
  facet: 'types' | 'sectors' | 'materials'
  value: string
  from: string
}

const FACET_HINTS: [RegExp, Interp['facet'], string][] = [
  [/^(garage|garages|parking|parkade|carpark)$/, 'types', 'Parking'],
  [/^(hospital|medical|healthcare|clinic)$/, 'sectors', 'Healthcare'],
  [/^(perf|perforated|perforation)$/, 'materials', 'Perforated metal'],
  [/^(mesh|expanded)$/, 'materials', 'Expanded metal mesh'],
  [/^(aluminum|aluminium|anodized|alu)$/, 'materials', 'Anodized aluminum'],
  [/^(clt|timber)$/, 'materials', 'Mass timber (CLT)'],
  [/^precast$/, 'materials', 'Precast concrete'],
  [/^library$/, 'types', 'Library'],
  [/^(transit|station)$/, 'types', 'Transit'],
  [/^(school|elementary)$/, 'types', 'K–12 Education'],
  [/^(housing|apartments|multifamily)$/, 'types', 'Multifamily Housing'],
  [/^(lab|laboratory)$/, 'types', 'Laboratory'],
]

type Field = 'id' | 'name' | 'materials' | 'facade' | 'type' | 'client' | 'sector' | 'city' | 'lead' | 'specs' | 'awards' | 'summary'
const WEIGHTS: Record<Field, number> = {
  id: 12,
  name: 6,
  materials: 5,
  facade: 4,
  type: 3,
  client: 3,
  sector: 2,
  city: 2,
  lead: 2,
  specs: 2,
  awards: 2,
  summary: 1,
}
export const FIELD_LABEL: Record<Field, string> = {
  id: 'project number',
  name: 'name',
  materials: 'materials',
  facade: 'facade system',
  type: 'building type',
  client: 'client',
  sector: 'client sector',
  city: 'city',
  lead: 'project lead',
  specs: 'spec sections',
  awards: 'awards',
  summary: 'description',
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

const TAGS = new Map<string, string[][]>(PROJECTS.map((p) => [p.id, p.materials.map(words)]))

const INDEX = new Map<string, Record<Field, string[]>>(
  PROJECTS.map((p) => [
    p.id,
    {
      id: [p.id],
      name: words(p.name),
      materials: words(p.materials.join(' ')),
      facade: words(p.facade),
      type: words(p.type),
      client: words(p.client),
      sector: words(p.sector),
      city: words(p.city),
      lead: words(p.lead),
      specs: words(p.specs.map((s) => SPEC_TITLES[s] ?? '').join(' ')),
      awards: words(p.awards.join(' ')),
      summary: words(p.summary),
    },
  ]),
)

export interface ParsedQuery {
  terms: { raw: string; variants: string[] }[]
  years: number[]
  specCodes: string[]
  ids: string[]
  interps: Interp[]
  highlight: string[]
}

export function parseQuery(q: string): ParsedQuery {
  let rest = q.toLowerCase()
  const specCodes: string[] = []
  rest = rest.replace(/\b(\d{2})\s?(\d{2})\s?(\d{2})\b/g, (_m, a, b, c) => {
    specCodes.push(`${a} ${b} ${c}`)
    return ' '
  })
  const ids: string[] = []
  rest = rest.replace(/\b(\d{4})-(\d{1,3})\b/g, (_m, a, b) => {
    ids.push(`${a}-${String(b).padStart(3, '0')}`)
    return ' '
  })
  const years: number[] = []
  const terms: ParsedQuery['terms'] = []
  const interps: Interp[] = []
  for (const w of words(rest)) {
    if (/^(19|20)\d{2}$/.test(w)) {
      years.push(Number(w))
      continue
    }
    if (STOP.has(w) || w.length < 2) continue
    terms.push({ raw: w, variants: SYN[w] ?? [w] })
    for (const [re, facet, value] of FACET_HINTS) if (re.test(w) && !interps.some((i) => i.value === value)) interps.push({ facet, value, from: w })
  }
  const highlight = [...new Set(terms.flatMap((t) => t.variants))]
  return { terms, years, specCodes, ids, interps, highlight }
}

function near(list: string[], terms: string[][], win = 4) {
  const pos = terms.map((vs) => list.flatMap((w, i) => (vs.some((v) => (v.length < 3 ? w === v : w.startsWith(v))) ? [i] : [])))
  if (pos.some((p) => !p.length)) return false
  return pos[0].some((i) => pos.every((ps) => ps.some((j) => Math.abs(j - i) <= win)))
}

export interface Hit {
  project: Project
  score: number
  fields: Field[]
  matched: number
  total: number
}

function matchWord(list: string[], v: string) {
  if (v.length < 3) return list.includes(v)
  return list.some((w) => w.startsWith(v))
}

export function scoreAll(pq: ParsedQuery): Map<string, Hit> | null {
  const required = pq.terms.length
  if (!required && !pq.specCodes.length && !pq.ids.length && !pq.years.length) return null
  const need = required <= 2 ? required : required - 1
  const out = new Map<string, Hit>()
  for (const p of PROJECTS) {
    const idx = INDEX.get(p.id)!
    let score = 0
    let matched = 0
    const fields = new Set<Field>()
    const hitTerms: string[][] = []
    for (const t of pq.terms) {
      let any = false
      for (const f of Object.keys(WEIGHTS) as Field[]) {
        if (t.variants.some((v) => matchWord(idx[f], v))) {
          score += WEIGHTS[f]
          fields.add(f)
          any = true
        }
      }
      if (any) {
        matched++
        hitTerms.push(t.variants)
      }
    }
    if (matched < need) continue
    // partial matches must have the matched words close together in one field (e.g. "metal mesh screen")
    if (matched > 1 && matched < required && !(['facade', 'name', 'summary'] as Field[]).some((f) => near(idx[f], hitTerms)) && !TAGS.get(p.id)!.some((t) => near(t, hitTerms))) continue
    if (pq.ids.length) {
      if (!pq.ids.some((id) => p.id.startsWith(id))) continue
      score += 40
      fields.add('id')
    }
    if (pq.specCodes.length) {
      if (!pq.specCodes.every((c) => p.specs.includes(c))) continue
      score += 8
      fields.add('specs')
    }
    if (pq.years.length) {
      const d = Math.min(...pq.years.map((y) => Math.abs(y - p.year)))
      if (!required && !pq.ids.length && !pq.specCodes.length && d > 3) continue
      score += Math.max(0, 6 - d * 1.5)
    }
    score += Math.log2(1 + p.referenced) * 1.6
    score *= required ? 0.5 + (0.5 * matched) / required : 1
    out.set(p.id, { project: p, score, fields: [...fields], matched, total: required })
  }
  return out
}

export function passes(p: Project, f: Filters, skip?: FacetKey) {
  if (skip !== 'types' && f.types.length && !f.types.includes(p.type)) return false
  if (skip !== 'sectors' && f.sectors.length && !f.sectors.includes(p.sector)) return false
  if (skip !== 'materials' && f.materials.length && !f.materials.every((m) => p.materials.includes(m))) return false
  if (skip !== 'specs' && f.specs.length && !f.specs.every((s) => p.specs.includes(s))) return false
  if (skip !== 'leads' && f.leads.length && !f.leads.includes(p.lead)) return false
  if (skip !== 'year' && (p.year < f.yearMin || p.year > f.yearMax)) return false
  if (skip !== 'awards' && f.awardsOnly && !p.awards.length) return false
  return true
}

export type SortKey = 'relevance' | 'newest' | 'oldest' | 'details'

export function runSearch(pq: ParsedQuery, f: Filters, sort: SortKey) {
  const scored = scoreAll(pq)
  const base = scored ? PROJECTS.filter((p) => scored.has(p.id)) : PROJECTS
  const results = base.filter((p) => passes(p, f))
  const score = (p: Project) => scored?.get(p.id)?.score ?? 0
  const sorted = [...results].sort((a, b) => {
    if (sort === 'newest') return b.year - a.year || b.id.localeCompare(a.id)
    if (sort === 'oldest') return a.year - b.year || a.id.localeCompare(b.id)
    if (sort === 'details') return b.detailSheets.length - a.detailSheets.length || score(b) - score(a)
    return score(b) - score(a) || b.year - a.year
  })

  const count = (key: FacetKey | undefined, get: (p: Project) => string[]) => {
    const m = new Map<string, number>()
    for (const p of base) if (passes(p, f, key)) for (const v of get(p)) m.set(v, (m.get(v) ?? 0) + 1)
    return m
  }
  const years = new Map<number, number>()
  for (const p of base) if (passes(p, f, 'year')) years.set(p.year, (years.get(p.year) ?? 0) + 1)
  let awardCount = 0
  for (const p of base) if (passes(p, f, 'awards') && p.awards.length) awardCount++

  return {
    results: sorted,
    scored,
    baseCount: base.length,
    facets: {
      types: count('types', (p) => [p.type]),
      sectors: count('sectors', (p) => [p.sector]),
      materials: count(undefined, (p) => p.materials),
      specs: count(undefined, (p) => p.specs),
      leads: count('leads', (p) => [p.lead]),
      years,
      awards: awardCount,
    },
  }
}

export type SearchResult = ReturnType<typeof runSearch>
