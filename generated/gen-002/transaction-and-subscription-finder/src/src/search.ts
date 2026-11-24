import { GROUPS, type Group } from './analysis'
import { type AccountId, type Txn } from './data'
import {
  MONTHS, MONTHS_SHORT, TODAY, fmtDate, fmtMoney, fromDay, iso, parts, toDay, weekday,
} from './dates'

/* ------------------------------------------------------------------ */
/* Understanding a plain-words question                                 */
/* ------------------------------------------------------------------ */

export interface DateFilter { from: number; to: number; label: string }
export interface AmountFilter { min: number; max: number; label: string }

export interface Parsed {
  terms: string[]
  date: DateFilter | null
  amount: AmountFilter | null
  account: AccountId | null
  accountLabel: string | null
  /** 'recurring' = only things that repeat, 'once' = only one-time */
  intent: 'subscription' | 'recurring' | 'once' | null
  /** "on the 15th": only charges on that day of the month */
  day: number | null
}

const STOP = new Set((
  'a an the that this those these my mine me i we you your for from in on at of to or and with was were is it its some any ' +
  'one last charge charges charged payment payments paid transaction transactions bill bills billed ' +
  'around about roughly approximately over under than more less ago week weeks month months day days year years ' +
  'few couple several find show look looking looked where what when which who how much did do does thing stuff ' +
  'something sort kind type think maybe like signed sign up spent spend bought buy got get was had have has ' +
  'cost costs costing am are be been there their service services company companies' ).split(' '))

const WEAK = new Set(['app', 'apps', 'plan', 'online', 'card'])

const SYNONYMS: Record<string, string[]> = {
  gym: ['fitness', 'workout', 'yoga'],
  workout: ['fitness', 'gym', 'yoga'],
  exercise: ['fitness', 'gym', 'yoga'],
  pilates: ['yoga', 'fitness'],
  meditation: ['yoga', 'fitness'],
  tv: ['streaming', 'video'],
  movie: ['streaming', 'cinema', 'video'],
  film: ['streaming', 'cinema', 'video'],
  show: ['streaming', 'video'],
  netflix: ['streaming', 'video'],
  hulu: ['streaming', 'video'],
  eat: ['restaurant', 'food'],
  dinner: ['restaurant', 'food'],
  lunch: ['restaurant', 'food'],
  takeout: ['restaurant', 'food'],
  cafe: ['coffee'],
  starbucks: ['coffee'],
  uber: ['ride'],
  lyft: ['ride'],
  taxi: ['ride'],
  gas: ['fuel'],
  doctor: ['health', 'pharmacy'],
  medicine: ['pharmacy', 'health'],
  magazine: ['news', 'newspaper'],
  icloud: ['photo', 'storage', 'cloud'],
  dropbox: ['storage', 'cloud'],
  google: ['storage', 'cloud'],
  hellofresh: ['meal', 'kit'],
  blueapron: ['meal', 'kit'],
}

const MONTH_ALIASES: Record<string, number> = {}
MONTHS.forEach((m, i) => {
  MONTH_ALIASES[m.toLowerCase()] = i + 1
  MONTH_ALIASES[m.slice(0, 3).toLowerCase()] = i + 1
})
MONTH_ALIASES['sept'] = 9

const today = () => parts(TODAY)

function monthRange(y: number, m: number): DateFilter {
  const from = toDay(iso(y, m, 1))
  const to = toDay(iso(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1)) - 1
  return { from, to, label: `${MONTHS[m - 1]} ${y}` }
}

/** The most recent occurrence of month `m` that is not in the future */
function recentYearFor(m: number): number {
  const t = today()
  return m <= t.m ? t.y : t.y - 1
}

function stem(w: string): string {
  let s = w.toLowerCase().replace(/[’']s$/, '')
  if (s.length > 4 && s.endsWith('ies')) s = s.slice(0, -3) + 'y'
  else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1)
  return s
}

export function parseQuery(input: string): Parsed {
  let q = ' ' + input.toLowerCase().replace(/[“”"]/g, '').replace(/[’]/g, "'") + ' '
  const out: Parsed = { terms: [], date: null, amount: null, account: null, accountLabel: null, intent: null, day: null }
  const t = today()
  const todayDay = toDay(TODAY)
  const eat = (re: RegExp) => { q = q.replace(re, ' ') }

  /* ---- amounts ---- */
  const bound = '(?:\\$\\s?(\\d[\\d,]*(?:\\.\\d{1,2})?)|(\\d[\\d,]*(?:\\.\\d{1,2})?)\\s*(?:dollars?|bucks))'
  const amtRe = new RegExp(`(around|about|roughly|approximately|under|below|less than|over|above|more than|at least|at most)?\\s*${bound}`)
  const am = q.match(amtRe)
  let amtMatched = false
  if (am) {
    const mod = am[1] ?? ''
    const v = parseFloat((am[2] ?? am[3]).replace(/,/g, ''))
    const c = Math.round(v * 100)
    const hasCents = /\./.test(am[2] ?? am[3])
    if (/under|below|less than|at most/.test(mod)) out.amount = { min: 0, max: c, label: `Under ${fmtMoney(c, { noCents: true })}` }
    else if (/over|above|more than|at least/.test(mod)) out.amount = { min: c, max: Infinity, label: `Over ${fmtMoney(c, { noCents: true })}` }
    else if (/around|about|roughly|approx/.test(mod)) {
      out.amount = { min: Math.round(c * 0.88), max: Math.round(c * 1.12), label: `About ${fmtMoney(c, { noCents: true })}` }
    } else if (hasCents) out.amount = { min: c - 1, max: c + 1, label: fmtMoney(c) }
    else out.amount = { min: c - 100, max: c + 100, label: `About ${fmtMoney(c, { noCents: true })}` }
    amtMatched = true
    eat(amtRe)
  }
  if (!amtMatched) {
    const bare = q.match(/(?:^|\s)(\d+\.\d\d)(?=\s|$)/)
    if (bare) {
      const c = Math.round(parseFloat(bare[1]) * 100)
      out.amount = { min: c - 1, max: c + 1, label: fmtMoney(c) }
      eat(/(?:^|\s)\d+\.\d\d(?=\s|$)/)
    }
  }

  /* ---- accounts ---- */
  if (/\b(visa|cobalt|credit card|my card|the card|rewards)\b/.test(q)) {
    out.account = 'visa'; out.accountLabel = 'Cobalt Visa'
    eat(/\b(visa|cobalt|credit card|my card|the card|rewards)\b/g)
  } else if (/\b(checking|harbor|debit|bank account)\b/.test(q)) {
    out.account = 'checking'; out.accountLabel = 'Harbor checking'
    eat(/\b(checking|harbor|debit|bank account|federal)\b/g)
  }

  /* ---- intent ---- */
  if (/\b(subscriptions?|recurring|monthly|memberships?|every month|auto-?renew\w*|free trial|trial)\b/.test(q)) {
    out.intent = /\b(subscriptions?|memberships?|free trial|trial)\b/.test(q) ? 'subscription' : 'recurring'
    eat(/\b(subscriptions?|recurring|monthly|auto-?renew\w*|free trial|trial)\b/g)
    eat(/\b(every month)\b/g)
  } else if (/\b(one[- ]time|just once|only once|single)\b/.test(q)) {
    out.intent = 'once'
    eat(/\b(one[- ]time|just once|only once|single)\b/g)
  }

  /* ---- dates ---- */
  const setDate = (from: number, to: number, label: string) => { out.date = { from, to, label } }

  const yearM = q.match(/\b(20\d\d)\b/)
  const explicitYear = yearM ? Number(yearM[1]) : null

  // "march 11", "mar 11th"
  const mdRe = new RegExp(`\\b(${Object.keys(MONTH_ALIASES).join('|')})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!\\s*(?:dollars|bucks))`)
  const md = q.match(mdRe)
  const monthRe = new RegExp(`\\b(${Object.keys(MONTH_ALIASES).join('|')})\\b`)
  const prepMonthRe = new RegExp(`\\b(?:in|from|during|around|of|since|last|this|early|late|mid|end of|back in)\\s+(${Object.keys(MONTH_ALIASES).join('|')})\\b`)

  if (md && Number(md[2]) >= 1 && Number(md[2]) <= 31) {
    const m = MONTH_ALIASES[md[1]]
    const y = explicitYear ?? recentYearFor(m)
    const day = toDay(iso(y, m, Number(md[2])))
    setDate(day - 2, day + 2, `Around ${MONTHS_SHORT[m - 1]} ${Number(md[2])}, ${y}`)
    eat(mdRe)
    if (explicitYear) eat(/\b20\d\d\b/)
  } else if (/\byesterday\b/.test(q)) {
    setDate(todayDay - 1, todayDay - 1, 'Yesterday'); eat(/\byesterday\b/)
  } else if (/\btoday\b/.test(q)) {
    setDate(todayDay, todayDay, 'Today'); eat(/\btoday\b/)
  } else if (/\blast week\b/.test(q)) {
    const monday = todayDay - weekday(TODAY)
    setDate(monday - 7, monday - 1, `Last week (${fmtDate(fromDay(monday - 7))} – ${fmtDate(fromDay(monday - 1))})`)
    eat(/\blast week\b/)
  } else if (/\bthis week\b/.test(q)) {
    setDate(todayDay - weekday(TODAY), todayDay, 'This week'); eat(/\bthis week\b/)
  } else if (/\blast month\b/.test(q)) {
    const m = t.m === 1 ? 12 : t.m - 1
    const y = t.m === 1 ? t.y - 1 : t.y
    const r = monthRange(y, m); setDate(r.from, r.to, r.label); eat(/\blast month\b/)
  } else if (/\bthis month\b/.test(q)) {
    const r = monthRange(t.y, t.m); setDate(r.from, todayDay, r.label); eat(/\bthis month\b/)
  } else if (/\b(\d+|a|one|two|three|four|five|six)\s+(weeks?|months?)\s+ago\b/.test(q)) {
    const mm = q.match(/\b(\d+|a|one|two|three|four|five|six)\s+(weeks?|months?)\s+ago\b/)!
    const nMap: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }
    const n = nMap[mm[1]] ?? Number(mm[1])
    const center = mm[2].startsWith('week') ? todayDay - n * 7 : toDay(addMonths(TODAY, -n))
    const slack = mm[2].startsWith('week') ? 5 : 15
    setDate(center - slack, center + slack, `About ${n} ${mm[2].replace(/s$/, '')}${n === 1 ? '' : 's'} ago`)
    eat(/\b(\d+|a|one|two|three|four|five|six)\s+(weeks?|months?)\s+ago\b/)
  } else if (/\b(a few|couple of|couple|few)\s+weeks\s+ago\b/.test(q)) {
    setDate(todayDay - 35, todayDay - 10, 'A few weeks ago'); eat(/\b(a few|couple of|couple|few)\s+weeks\s+ago\b/)
  } else if (/\blast year\b/.test(q)) {
    setDate(toDay(iso(t.y - 1, 1, 1)), toDay(iso(t.y - 1, 12, 31)), `${t.y - 1}`); eat(/\blast year\b/)
  } else if (/\b(spring|summer|fall|autumn|winter)\b/.test(q)) {
    const season = q.match(/\b(spring|summer|fall|autumn|winter)\b/)![1]
    const y = explicitYear ?? t.y
    let from: number, to: number, label: string
    if (season === 'spring') { from = toDay(iso(y, 3, 1)); to = toDay(iso(y, 5, 31)); label = `Spring ${y}` }
    else if (season === 'summer') { from = toDay(iso(y, 6, 1)); to = toDay(iso(y, 8, 31)); label = `Summer ${y}` }
    else if (season === 'winter') {
      const wy = explicitYear ?? t.y - 1
      from = toDay(iso(wy, 12, 1)); to = toDay(iso(wy + 1, 2, 28)); label = `Winter ${wy}–${String(wy + 1).slice(2)}`
    } else { from = toDay(iso(y, 9, 1)); to = toDay(iso(y, 11, 30)); label = `Fall ${y}` }
    setDate(from, Math.min(to, todayDay), label)
    eat(/\b(spring|summer|fall|autumn|winter)\b/)
    if (explicitYear) eat(/\b20\d\d\b/)
  } else {
    const mm = q.match(prepMonthRe) ?? (monthRe.test(q) && !/\bmay\b/.test(q) ? q.match(monthRe) : null)
    if (mm) {
      const m = MONTH_ALIASES[mm[1]]
      const y = explicitYear ?? recentYearFor(m)
      const r = monthRange(y, m)
      setDate(r.from, Math.min(r.to, todayDay), r.label)
      q = q.replace(new RegExp(`\\b(?:(?:in|from|during|around|of|since|early|late|mid|end of|back in)\\s+)?${mm[1]}\\b`), ' ')
      if (explicitYear) eat(/\b20\d\d\b/)
    } else if (explicitYear) {
      setDate(toDay(iso(explicitYear, 1, 1)), Math.min(toDay(iso(explicitYear, 12, 31)), todayDay), `${explicitYear}`)
      eat(/\b20\d\d\b/)
    }
  }

  /* ---- "on the 15th" ---- */
  const dm = q.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/)
  if (dm && Number(dm[1]) >= 1 && Number(dm[1]) <= 31) {
    out.day = Number(dm[1])
    eat(/\b(?:on\s+)?(?:the\s+)?\d{1,2}(?:st|nd|rd|th)\b/)
  }

  /* ---- what's left are the words describing the thing ---- */
  const words = q.replace(/[^a-z0-9&\s-]/g, ' ').split(/\s+/).filter(Boolean)
  const seen = new Set<string>()
  for (const w of words) {
    if (STOP.has(w) || /^\d+$/.test(w) || w.length < 2) continue
    const s = stem(w)
    if (STOP.has(s) || seen.has(s)) continue
    seen.add(s)
    out.terms.push(s)
  }
  return out
}

function addMonths(isoDate: string, n: number): string {
  const { y, m, d } = parts(isoDate)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return iso(ny, nm, Math.min(d, new Date(Date.UTC(ny, nm, 0)).getUTCDate()))
}

/* ------------------------------------------------------------------ */
/* Finding it                                                           */
/* ------------------------------------------------------------------ */

export interface Result {
  group: Group
  score: number
  /** charges that fit every filter in the question */
  matching: Txn[]
  /** why this showed up, in plain words */
  reasons: string[]
  /** how it relates to the date she gave */
  dateNote: string | null
}

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9&\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1).map(stem)
}

function editDistanceAtMost1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

interface Index { nameWords: string[]; nameCompact: string; aka: Set<string>; category: string[]; raw: string[] }
const INDEX = new Map<string, Index>()
for (const [id, g] of GROUPS) {
  const rawWords = new Set<string>()
  g.txns.slice(0, 40).forEach((t) => words(t.raw).forEach((w) => rawWords.add(w)))
  INDEX.set(id, {
    nameWords: words(g.merchant.name),
    nameCompact: g.merchant.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    aka: new Set(g.merchant.aka.map(stem)),
    category: words(g.merchant.category),
    raw: [...rawWords],
  })
}

function termScore(term: string, ix: Index, allowFuzzy = true): { score: number; how: string } {
  let best = 0
  let how = ''
  const bump = (s: number, h: string) => { if (s > best) { best = s; how = h } }
  if (term.length >= 3) {
    for (const w of ix.nameWords) if (w === term || w.startsWith(term)) bump(10, 'name')
  }
  if (ix.aka.has(term)) bump(7, 'aka')
  for (const w of ix.category) if (w === term || (term.length >= 4 && w.startsWith(term))) bump(6, 'category')
  for (const w of ix.raw) if (w === term || (term.length >= 4 && w.startsWith(term))) bump(5, 'raw')
  if (allowFuzzy && term.length >= 5) {
    for (const w of [...ix.nameWords, ...ix.aka]) if (w.length >= 5 && editDistanceAtMost1(term, w)) bump(6, 'fuzzy')
  }
  if (WEAK.has(term)) {
    // generic words like "app" are weak evidence unless the merchant is literally described by them
    const generic = how === 'category' || how === 'raw'
    best *= generic ? 0.45 : 0.8
    return { score: best, how: generic ? 'weak' : how }
  }
  return { score: best, how }
}

const inDate = (t: Txn, d: DateFilter | null) => !d || (toDay(t.date) >= d.from && toDay(t.date) <= d.to)
const inAmount = (t: Txn, a: AmountFilter | null) => !a || (t.cents >= a.min && t.cents <= a.max)

export function runSearch(p: Parsed, accountFilter: AccountId | 'all'): Result[] {
  const account = p.account ?? (accountFilter === 'all' ? null : accountFilter)
  const hasTerms = p.terms.length > 0
  const hasAnyFilter = hasTerms || p.date || p.amount || p.intent || account || p.day
  if (!hasAnyFilter) return []

  const results: Result[] = []
  for (const g of GROUPS.values()) {
    const ix = INDEX.get(g.merchant.id)!
    if (p.intent === 'recurring' && !g.cadence.recurring) continue
    if (p.intent === 'subscription' && !(g.cadence.recurring && g.merchant.kind === 'sub')) continue
    if (p.intent === 'once' && g.cadence.kind !== 'once') continue

    // Words
    let score = 0
    const reasons: string[] = []
    let termHits = 0
    let strongHit = false
    if (hasTerms) {
      for (let i = 0; i < p.terms.length; i++) {
        const term = p.terms[i]
        const ts = termScore(term, ix)
        let s = ts.score
        let strong = ts.how !== 'weak'
        // "flow state" typed as two words
        if (i + 1 < p.terms.length) {
          const joined = term + p.terms[i + 1]
          if (joined.length >= 5 && ix.nameCompact.includes(joined)) s = Math.max(s, 10)
        }
        if (s === 0 && SYNONYMS[term]) {
          for (const syn of SYNONYMS[term]) s = Math.max(s, termScore(syn, ix, false).score * 0.6)
          if (s > 0) strong = true
        }
        if (s > 0) {
          termHits++
          score += s
          reasons.push(term)
          if (strong) strongHit = true
        }
      }
      if (termHits === 0) continue
      // "yoga or fitness app": a merchant that only fits the vague word "app" is not enough
      if (p.terms.some((t) => !WEAK.has(t)) && !strongHit) continue
    }

    // Account / amount / date on the individual charges
    let pool = g.txns
    if (account) pool = pool.filter((t) => t.accountId === account)
    if (p.amount) pool = pool.filter((t) => inAmount(t, p.amount))
    if (p.day) pool = pool.filter((t) => parts(t.date).d === p.day)
    if (pool.length === 0) continue

    let matching = pool
    let dateNote: string | null = null
    if (p.date) {
      const inside = pool.filter((t) => inDate(t, p.date))
      let dist = 0
      if (inside.length === 0) {
        dist = Math.min(...pool.map((t) => {
          const d = toDay(t.date)
          return d < p.date!.from ? p.date!.from - d : d - p.date!.to
        }))
      }
      if (hasTerms) {
        // She may be misremembering the date, so for described things it's only a nudge
        const factor = dist === 0 ? 1 : Math.max(0, 1 - dist / 75)
        score += 4 * factor
        matching = inside
        if (inside.length) {
          dateNote = inside.length === 1 ? `Charged ${fmtDate(inside[0].date)}` : `${inside.length} charges in that time`
        } else if (dist <= 75) {
          const nearest = [...pool].sort((a, b) => {
            const da = Math.abs(toDay(a.date) - (p.date!.from + p.date!.to) / 2)
            const db = Math.abs(toDay(b.date) - (p.date!.from + p.date!.to) / 2)
            return da - db
          })[0]
          const before = toDay(nearest.date) < p.date.from
          dateNote = `Nearest charge is ${fmtDate(nearest.date)}, ${dist} days ${before ? 'before' : 'after'} the dates you gave`
          if (nearest.date === g.firstDate) dateNote = `First charge was ${fmtDate(nearest.date)}, ${dist} days after the dates you gave`
        } else {
          dateNote = null
        }
      } else {
        if (inside.length === 0) continue
        matching = inside
        dateNote = `${inside.length} ${inside.length === 1 ? 'charge' : 'charges'} in that time`
        score += 1
      }
    }
    if (!hasTerms && !p.date) score += 1
    if (g.cadence.recurring) score += 0.5

    results.push({ group: g, score, matching, reasons, dateNote })
  }

  results.sort((a, b) => b.score - a.score || (a.group.lastDate < b.group.lastDate ? 1 : -1))
  return results.slice(0, 12)
}
