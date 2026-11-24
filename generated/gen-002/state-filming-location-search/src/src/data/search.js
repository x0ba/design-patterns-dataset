import { LIBRARY } from './gen.js'
import { CREW, DAYS_TO_START } from './dates.js'

const NUM = { one: 1, two: 2, three: 3, four: 4, '1': 1, '2': 2, '3': 3, '4': 4 }
const has = (loc, f) => loc.features.some((x) => x.includes(f)) || loc.blob.includes(f)

const TYPE_WORDS = [
  [/\b(court\s?house|courtroom|court room)s?\b/, 'Courthouse', 'courthouse'],
  [/\b(main street|downtown|town square|business district|commercial street|high street)s?\b/, 'Main street segment', 'main street'],
  [/\b(rail\s?yards?|train\s?yards?|rail\s?road yards?|freight yards?|switching yards?|marshalling yards?)\b/, 'Rail yard', 'rail yard'],
  [/\b(barn|farm|farmstead|ranch)s?\b/, 'Farm or barn', 'farm or barn'],
  [/\b(church|chapel|sanctuary)(es)?\b/, 'Church', 'church'],
  [/\b(school|high school|classroom)s?\b/, 'School', 'school'],
  [/\b(hospital|clinic|sanitarium)s?\b/, 'Hospital or clinic', 'hospital'],
  [/\b(diner|restaurant|cafe|lunch counter)s?\b/, 'Diner or restaurant', 'diner'],
  [/\b(motel|hotel|inn)s?\b/, 'Hotel or motel', 'hotel or motel'],
  [/\b(theat(er|re)|auditorium|opera house)s?\b/, 'Theater or auditorium', 'theater'],
  [/\b(town hall|city hall|council chambers?|municipal building)s?\b/, 'Town hall', 'town hall'],
  [/\b(librar(y|ies))\b/, 'Library', 'library'],
  [/\b(armory|fire station|police station)s?\b/, 'Armory or station', 'armory or station'],
  [/\b(lake|lakeside|waterfront|marina|pier|shoreline)s?\b/, 'Waterfront', 'waterfront'],
  [/\b(quarry|quarries|mine)s?\b/, 'Quarry or mine', 'quarry or mine'],
  [/\b(bridge|overpass)s?\b/, 'Bridge or roadway', 'bridge'],
  [/\b(cemetery|graveyard)s?\b/, 'Cemetery', 'cemetery'],
  [/\b(gas station|garage|service station)s?\b/, 'Gas station or garage', 'gas station'],
  [/\b(depot|train station|railway station)s?\b/, 'Train depot', 'train depot'],
  [/\b(grain elevator|silo|mill)s?\b/, 'Grain elevator or mill', 'elevator or mill'],
  [/\b(warehouse|factory|industrial)s?\b/, 'Warehouse or industrial', 'warehouse'],
  [/\b(house|mansion|residence|farmhouse|home)s?\b/, 'Residence', 'residence'],
  [/\b(office building|office)s?\b/, 'Office building', 'office building'],
]
const FEATURES = [
  [/\b(balcon(y|ies)|galler(y|ies)|mezzanine)\b/, 'balcony gallery', 'balcony gallery', 3, ['mezzanine']],
  [/\b(wood[- ]?panel(l?ed|ing)?|panel(l?ed|ing)|walnut|oak[- ]panel(l?ed)?)\b/, 'wood paneling', 'wood paneling', 1.5],
  [/\bmarble\b/, 'marble', 'marble', 1],
  [/\brotunda\b/, 'rotunda', 'rotunda', 1.5],
  [/\bdome[sd]?\b/, 'dome', 'dome', 1.5],
  [/\bclock tower\b/, 'clock tower', 'clock tower', 1.5],
  [/\bjury box\b/, 'jury box', 'jury box', 1],
  [/\bterrazzo\b/, 'terrazzo', 'terrazzo', 1],
  [/\b(drop(ped)? ceilings?|fluorescent|troffers?)\b/, 'drop ceilings', 'drop ceilings', 1.2, ['fluorescent']],
  [/\bneon\b/, 'neon signage', 'neon signage', 1.5],
  [/\bdiagonal parking\b/, 'diagonal parking', 'diagonal parking', 1],
  [/\bbrick( storefronts?| facades?)?\b/, 'brick storefronts', 'brick storefronts', 1.2],
  [/\b(awnings?)\b/, 'awnings', 'awnings', 0.8],
  [/\bwater tower\b/, 'water tower', 'water tower', 1.5],
  [/\bround ?house\b/, 'roundhouse', 'roundhouse', 2],
  [/\bturntable\b/, 'turntable', 'turntable', 1.5],
  [/\b(sidings?|spur tracks?)\b/, 'sidings', 'sidings', 1.2],
  [/\b(freight cars?|box ?cars?|rolling stock)\b/, 'freight cars', 'freight cars', 1.5],
  [/\b(switch tower|signal tower|control tower)\b/, 'switch tower', 'switch tower', 1.2, ['control tower']],
  [/\bloading docks?\b/, 'loading dock', 'loading dock', 1],
  [/\bstained glass\b/, 'stained glass', 'stained glass', 1],
  [/\bfireplace\b/, 'fireplace', 'fireplace', 1],
  [/\b(grand )?staircase\b/, 'staircase', 'staircase', 1],
  [/\bwraparound porch\b|\bporch\b/, 'porch', 'porch', 0.8],
  [/\b(courthouse square)\b/, 'courthouse square', 'courthouse square', 1.5],
]
const DECADES = [
  [/\b(1970s|1970's|seventies|70s|'70s|mid[- ]seventies|1970s-style)\b/, '1970s', '1970s'],
  [/\b(1960s|sixties|60s|'60s)\b/, '1960s', '1960s'],
  [/\b(1950s|fifties|50s|'50s)\b/, '1950s', '1950s'],
  [/\b(1980s|eighties|80s|'80s)\b/, '1980s', '1980s'],
  [/\b(1940s|forties)\b/, '1940s', '1940s'],
  [/\b(1930s|thirties|depression[- ]era)\b/, '1930s', '1930s'],
  [/\b(1920s|twenties)\b/, '1920s', '1920s'],
]
const STYLES = [
  [/\bbrutalis[tm]\b/, 'Brutalist'], [/\bart deco\b/, 'Art Deco'], [/\bneo-?classical\b/, 'Neoclassical'], [/\bvictorian\b/, 'Victorian'],
  [/\bmid[- ]century( modern)?\b/, 'Mid-century'], [/\bmodernist\b/, 'Modernist'], [/\bcraftsman\b/, 'Craftsman'], [/\bbeaux[- ]arts\b/, 'Beaux-Arts'], [/\bcolonial( revival)?\b/, 'Colonial'],
]
const STOP = new Set('a an and are as at be by can for from has have in into is it its of on or our that the their them then there these they this to up us was we with within would like need needs want some style styles feel look looks kind type place spot location locations area shoot shooting scene scenes crew good nice big small-town small town towns ideally something near close closed closing closure night nights two three one four stage set sets bit very really any also both each than more most other such only own same will not but all city county state will let what that with when where which would could should about around between'.split(' '))

export function parseNeed(raw) {
  let t = ' ' + raw.toLowerCase().replace(/[“”"]/g, '').replace(/[’]/g, "'") + ' '
  const rm = (re) => { t = t.replace(new RegExp(re.source, 'g'), ' ') }
  const criteria = []
  const add = (c) => { if (!criteria.some((x) => x.id === c.id)) criteria.push(c) }
  // closure nights
  const nm = t.match(/(\d|one|two|three|four)\s*(?:consecutive\s*)?nights?/)
  if (/\bclos(e|ed|ing|ure)|shut ?down|block(ed)? off\b/.test(t) && nm) {
    const n = NUM[nm[1]]
    add({ id: 'closure:' + n, label: `Closure ≥ ${n} night${n > 1 ? 's' : ''}`, kind: 'closure', weight: 4, credit: (l) => (l.street ? (l.street.closure.maxNights >= n ? 1 : l.street.closure.maxNights === n - 1 ? 0.3 : 0) : 0) })
    t = t.replace(nm[0], ' ')
  } else if (/\bclos(e|ed|ing|ure)\b/.test(t) && /main street|downtown/.test(t)) {
    add({ id: 'closure:1', label: 'Street closure allowed', kind: 'closure', weight: 3, credit: (l) => (l.street ? (l.street.closure.maxNights >= 1 ? 1 : 0) : 0) })
  }
  t = t.replace(/\bclos(e|ed|ing|ure)s?\b|\bshut ?down\b/g, ' ')
  for (const [re, type, label] of TYPE_WORDS) {
    if (re.test(t)) {
      if (criteria.some((c) => c.kind === 'type')) { rm(re); continue }
      add({
        id: 'type:' + type, label, kind: 'type', type, weight: 5,
        credit: (l) => {
          if (l.type === type) return 1
          if (type === 'Courthouse' && (l.type === 'Town hall' || (l.type === 'Theater or auditorium' && has(l, 'balcony')) || (l.type === 'Campus building' && has(l, 'lecture hall')))) return 0.3
          if (type === 'Rail yard' && (l.type === 'Train depot' || has(l, 'rail spur'))) return 0.35
          return 0
        },
      })
      rm(re)
    }
  }
  for (const [re, feat, label, w, alts = []] of FEATURES) {
    if (re.test(t)) {
      add({ id: 'feat:' + feat, label, kind: 'feature', weight: w, credit: (l) => (l.features.includes(feat) || alts.some((a) => l.features.some((f) => f.includes(a))) ? 1 : l.blob.includes(feat) ? 0.7 : 0) })
      rm(re)
    }
  }
  for (const [re, dec, label] of DECADES) {
    if (re.test(t)) {
      const near = { '1970s': ['1960s', '1980s'], '1960s': ['1950s', '1970s'], '1950s': ['1940s', '1960s'], '1980s': ['1970s'], '1940s': ['1930s', '1950s'], '1930s': ['1920s', '1940s'], '1920s': ['1910s', '1930s'] }[dec] || []
      add({ id: 'era:' + dec, label: label + ' look', kind: 'era', weight: 3, credit: (l) => (l.lookEras.includes(dec) ? 1 : l.lookEras.some((e) => near.includes(e)) ? 0.3 : 0) })
      rm(re)
    }
  }
  for (const [re, style] of STYLES) {
    if (re.test(t)) {
      add({ id: 'style:' + style, label: style, kind: 'style', weight: 2, credit: (l) => (l.styles.some((s) => s.toLowerCase().includes(style.toLowerCase())) ? 1 : 0) })
      rm(re)
    }
  }
  if (/\b(disused|abandoned|derelict|decommissioned|idle|out of service|defunct|retired)\b/.test(t)) {
    add({ id: 'disused', label: 'Disused', kind: 'status', weight: 3, credit: (l) => (l.yard ? (l.yard.disused ? 1 : 0) : /disused|former|closed|abandoned|ruins/.test(l.blob) ? 0.5 : 0) })
    t = t.replace(/\b(disused|abandoned|derelict|decommissioned|idle|out of service|defunct|retired)\b/g, ' ')
  }
  if (/\b(active|working|operating|live)\b/.test(t) && criteria.some((c) => c.id === 'type:Rail yard')) {
    add({ id: 'active-yard', label: 'Active yard', kind: 'status', weight: 3, credit: (l) => (l.yard && !l.yard.disused ? 1 : 0) })
  }
  if (/\binteriors?\b/.test(t)) { add({ id: 'mode:interior', label: 'Interior', kind: 'mode', weight: 1, credit: (l) => (l.shootModes.includes('interior') ? 1 : 0) }); t = t.replace(/\binteriors?\b/g, ' ') }
  if (/\bexteriors?\b|\boutdoors?\b/.test(t)) { add({ id: 'mode:exterior', label: 'Exterior', kind: 'mode', weight: 1, credit: (l) => (l.shootModes.includes('exterior') ? 1 : 0) }); t = t.replace(/\bexteriors?\b|\boutdoors?\b/g, ' ') }
  // free keywords
  const words = t.split(/[^a-z0-9']+/).filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)).slice(0, 4)
  for (const w of words) {
    const stem = w.replace(/(ies|es|s)$/, '')
    add({ id: 'kw:' + w, label: `“${w}”`, kind: 'keyword', weight: 1.2, credit: (l) => (l.blob.includes(stem) ? 1 : 0) })
  }
  return criteria
}

export function runNeed(text, off) {
  const all = parseNeed(text)
  const active = all.filter((c) => !off.includes(c.id))
  const out = []
  const total = active.reduce((s, c) => s + c.weight, 0)
  const typeC = active.find((c) => c.kind === 'type')
  for (const loc of LIBRARY) {
    let s = 0
    let chips = null
    if (total === 0) continue
    const credits = active.map((c) => c.credit(loc))
    if (typeC && credits[active.indexOf(typeC)] === 0) continue
    for (let i = 0; i < active.length; i++) s += active[i].weight * credits[i]
    const fit = s / total
    if (fit < 0.6) continue
    chips = active.map((c, i) => ({ id: c.id, label: c.label, credit: credits[i] }))
    out.push({ loc, fit, chips })
  }
  return { criteria: all, results: out }
}

// ---------- similarity ----------
const jac = (a, b) => {
  if (!a.length && !b.length) return 0.5
  const A = new Set(a), B = new Set(b)
  let i = 0
  for (const x of A) if (B.has(x)) i++
  return i / (A.size + B.size - i)
}
export function similarTo(ref) {
  const out = []
  const refF = ref.features.concat(ref.court?.balcony ? ['balcony gallery'] : [])
  for (const loc of LIBRARY) {
    if (loc.id === ref.id) continue
    const sameType = loc.type === ref.type
    if (!sameType && !(ref.type === 'Courthouse' && (loc.type === 'Town hall' || loc.type === 'Theater or auditorium'))) continue
    const parts = []
    const push = (label, v, w) => parts.push({ label, v, w })
    push('Type', sameType ? 1 : 0.25, 3)
    push('Interior era', jac(loc.lookEras, ref.lookEras), 2.5)
    push('Architectural style', jac(loc.styles, ref.styles), 1.5)
    push('Features', jac(loc.features, refF), 2.5)
    const sq = ref.sqft && loc.sqft ? 1 - Math.min(1, Math.abs(Math.log(loc.sqft / ref.sqft)) / 1.0) : 0.5
    push('Size', sq, 1)
    const ce = ref.ceilingFt && loc.ceilingFt ? 1 - Math.min(1, Math.abs(loc.ceilingFt - ref.ceilingFt) / 14) : 0.5
    push('Ceiling height', ce, 1)
    const tot = parts.reduce((s, p) => s + p.w, 0)
    const sim = parts.reduce((s, p) => s + p.v * p.w, 0) / tot
    if (sim < 0.42) continue
    const chips = []
    const sharedEra = loc.lookEras.filter((e) => ref.lookEras.includes(e))
    if (sharedEra.length) chips.push({ id: 'e', label: sharedEra.join(', ') + ' look', credit: 1 })
    else chips.push({ id: 'e', label: `${loc.lookEras[loc.lookEras.length - 1]} look vs ${ref.lookEras[ref.lookEras.length - 1]}`, credit: 0 })
    const refBal = refF.includes('balcony gallery'), locBal = loc.features.includes('balcony gallery') || loc.court?.balcony
    if (refBal) chips.push({ id: 'b', label: 'Balcony gallery', credit: locBal ? 1 : 0 })
    const sharedFeat = loc.features.filter((f) => refF.includes(f) && f !== 'balcony gallery').slice(0, 2)
    for (const f of sharedFeat) chips.push({ id: 'f' + f, label: f, credit: 1 })
    const sharedStyle = loc.styles.filter((s) => ref.styles.includes(s))
    if (sharedStyle.length) chips.push({ id: 's', label: sharedStyle[0], credit: 1 })
    if (ref.sqft && loc.sqft) {
      const ratio = loc.sqft / ref.sqft
      chips.push({ id: 'sz', label: ratio > 1.25 ? 'Larger footprint' : ratio < 0.8 ? 'Smaller footprint' : 'Similar size', credit: ratio >= 0.8 && ratio <= 1.25 ? 1 : 0.3 })
    }
    out.push({ loc, fit: sim, chips })
  }
  return out
}

// ---------- filters ----------
export const DEFAULT_FILTERS = () => ({
  maxDrive: 90,
  status: { active: true, unresponsive: true, declined: false },
  ownerTypes: { State: true, Municipal: true, Private: true },
  avail: 'partial', // 'clear' | 'partial' | 'any'
  history: false,
  maxLead: DAYS_TO_START,
  crewParking: false,
})
export const FILTER_REASONS = {
  drive: 'beyond drive time',
  status: 'owner declined',
  availability: 'blocked in shoot window',
  ownerType: 'owner type',
  history: 'no production history',
  lead: 'permit lead too long',
  parking: 'parking under crew size',
}
export function failReason(loc, f) {
  if (loc.drive > f.maxDrive) return 'drive'
  if (!f.status[loc.contact.status]) return 'status'
  if (f.avail === 'clear' && loc.avail.state !== 'clear') return 'availability'
  if (f.avail === 'partial' && loc.avail.state === 'blocked') return 'availability'
  if (!f.ownerTypes[loc.ownerType]) return 'ownerType'
  if (f.history && loc.productions.length === 0) return 'history'
  if (loc.permitLead > f.maxLead) return 'lead'
  if (f.crewParking && loc.parking < CREW) return 'parking'
  return null
}
const AV = { clear: 0, partial: 1, blocked: 2 }
const ST = { active: 0, unresponsive: 1, declined: 2 }
export function applyFilters(results, f, sort) {
  const shown = [], hidden = {}
  for (const r of results) {
    const why = failReason(r.loc, f)
    if (why) { (hidden[why] ||= []).push(r) } else shown.push(r)
  }
  const cmp = {
    fit: (a, b) => Math.round((b.fit - a.fit) * 1000) || (+b.loc.name.startsWith('Main Street') - +a.loc.name.startsWith('Main Street')) || AV[a.loc.avail.state] - AV[b.loc.avail.state] || ST[a.loc.contact.status] - ST[b.loc.contact.status] || a.loc.drive - b.loc.drive,
    drive: (a, b) => a.loc.drive - b.loc.drive || b.fit - a.fit,
    lead: (a, b) => a.loc.permitLead - b.loc.permitLead || b.fit - a.fit,
    recent: (a, b) => (b.loc.lastProduction?.year || 0) - (a.loc.lastProduction?.year || 0) || b.fit - a.fit,
    history: (a, b) => b.loc.productions.length - a.loc.productions.length || b.fit - a.fit,
  }[sort] || ((a, b) => b.fit - a.fit)
  shown.sort(cmp)
  return { shown, hidden }
}
export const fitLabel = (f) => (f >= 0.97 ? 'Meets all' : f >= 0.8 ? 'Strong' : f >= 0.65 ? 'Good' : 'Partial')
