// Kinloop data model, mock data and scheduling rules. Everything is client-side.

export type PersonId = 'elena' | 'tom' | 'marisol' | 'david' | 'gloria'

export interface Person {
  id: PersonId
  first: string
  full: string
  role: string
  distance: string
  oneWayHrs: number
  availability: string
  color: string
  tint: string
  ink: string
}

export const PEOPLE: Record<PersonId, Person> = {
  elena: {
    id: 'elena', first: 'Elena', full: 'Elena Brandt', role: 'You · 20 min away', distance: '20 min away',
    oneWayHrs: 1 / 3, availability: 'Weeknights after 6pm, not Tuesdays',
    color: '#B5532F', tint: '#F8E4DA', ink: '#7A3216',
  },
  tom: {
    id: 'tom', first: 'Tom', full: 'Tom Brandt', role: 'Brother · 3 hr drive', distance: '3 hr drive',
    oneWayHrs: 3, availability: 'Weekends only',
    color: '#2F66A8', tint: '#E0EBF8', ink: '#1D4578',
  },
  marisol: {
    id: 'marisol', first: 'Marisol', full: 'Marisol Brandt', role: 'Sister · 1 hr away', distance: '1 hr away',
    oneWayHrs: 1, availability: 'Fully available except Dec 4–8',
    color: '#23805F', tint: '#DAF0E6', ink: '#14573F',
  },
  david: {
    id: 'david', first: 'David', full: 'David Brandt', role: 'Brother · 5 hr away', distance: '5 hr away',
    oneWayHrs: 5, availability: 'Remote worker · one 6-night stretch',
    color: '#6A56A8', tint: '#E8E3F6', ink: '#463681',
  },
  gloria: {
    id: 'gloria', first: 'Gloria', full: 'Gloria Whitaker', role: 'Neighbor', distance: 'Next door',
    oneWayHrs: 0, availability: 'Two daytime check-ins a week',
    color: '#A33F78', tint: '#F6E0ED', ink: '#7A2757',
  },
}

export const SIBLINGS: PersonId[] = ['elena', 'marisol', 'tom', 'david']
export const FAMILY_ORDER: PersonId[] = ['elena', 'marisol', 'tom', 'david', 'gloria']

// ---------------------------------------------------------------- calendar
// Care period: Sat Nov 21 – Sat Dec 19, 2026. Index 0 = Sat Nov 21 (first night), 27 = Fri Dec 18.
export const NIGHTS = 28
export const dateOf = (i: number) => new Date(2026, 10, 21 + i)
export const dow = (i: number) => (6 + i) % 7 // 0 Sun … 6 Sat
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const dayShort = (i: number) => DOW_SHORT[dow(i)]
export const dayLong = (i: number) => DOW_LONG[dow(i)]
export const dayNum = (i: number) => dateOf(i).getDate()
export const monShort = (i: number) => MON[dateOf(i).getMonth()]
export const fmt = (i: number) => `${monShort(i)} ${dayNum(i)}`
export const fmtWithDay = (i: number) => `${dayShort(i)} ${fmt(i)}`
export const fmtLong = (i: number) => `${dayLong(i)}, ${MONTH_LONG[dateOf(i).getMonth()]} ${dayNum(i)}`
export const fmtRange = (a: number, b: number) =>
  monShort(a) === monShort(b) ? `${fmt(a)}–${dayNum(b)}` : `${fmt(a)} – ${fmt(b)}`

/** "Nov 21 · Nov 27–28 · Dec 11–12" */
export function fmtRuns(idxs: number[]): string {
  const s = [...idxs].sort((a, b) => a - b)
  const out: string[] = []
  let k = 0
  while (k < s.length) {
    let e = k
    while (e + 1 < s.length && s[e + 1] === s[e] + 1) e++
    out.push(e === k ? fmt(s[k]) : fmtRange(s[k], s[e]))
    k = e + 1
  }
  return out.join(' · ')
}

export const RIDE_DAYS: number[] = Array.from({ length: NIGHTS }, (_, i) => i).filter((i) => [1, 3, 5].includes(dow(i)))
export const isRideDay = (i: number) => RIDE_DAYS.includes(i)
export const APPT_DAY = 11 // Wed Dec 2, surgeon follow-up 2:15pm
export const AWAY_FROM = 13 // Fri Dec 4
export const AWAY_TO = 17 // Tue Dec 8
export const inAway = (i: number) => i >= AWAY_FROM && i <= AWAY_TO
export const THANKSGIVING = 5 // Thu Nov 26
export const SUNDAYS: number[] = Array.from({ length: NIGHTS }, (_, i) => i).filter((i) => dow(i) === 0)
export const weekOf = (i: number) => Math.floor(i / 7)
export const MARISOL_AWAY_LABEL = 'Dec 4–8'

// ---------------------------------------------------------------- plan
export interface Plan {
  nights: (PersonId | null)[]
  rides: Record<number, PersonId | null>
  appt: PersonId | null
  checkins: number[] // Gloria's midday check-ins (day index)
  asks: number[] // Sundays where Tom has been asked to come to dinner
  dismissed: string[]
}

export function initialPlan(): Plan {
  const nights: (PersonId | null)[] = [
    'tom', 'elena', 'elena', null, 'marisol', 'marisol', 'tom', // Nov 21–27
    'tom', 'elena', 'elena', null, 'elena', null, null, // Nov 28 – Dec 4
    null, null, null, null, 'elena', 'marisol', 'tom', // Dec 5–11
    'tom', 'marisol', 'elena', null, 'elena', 'elena', 'tom', // Dec 12–18
  ]
  const rides: Record<number, PersonId | null> = {}
  RIDE_DAYS.forEach((d) => (rides[d] = null))
  ;[2, 4, 6, 9, 18, 20, 23].forEach((d) => (rides[d] = 'marisol'))
  rides[11] = 'elena'
  return {
    nights,
    rides,
    appt: 'elena',
    checkins: [3, 4, 10, 12, 17, 19, 24, 26],
    asks: [],
    dismissed: [],
  }
}

export const openNights = (plan: Plan) => plan.nights.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0)
export const openRides = (plan: Plan) => RIDE_DAYS.filter((d) => !plan.rides[d])

export function davidStretch(plan: Plan): { start: number; end: number } | null {
  const idx = plan.nights.map((p, i) => (p === 'david' ? i : -1)).filter((i) => i >= 0)
  if (!idx.length) return null
  return { start: Math.min(...idx), end: Math.max(...idx) }
}

const stays = (plan: Plan, p: PersonId, i: number) => i >= 0 && i < NIGHTS && plan.nights[i] === p

// ---------------------------------------------------------------- eligibility
export interface Elig {
  level: 'ok' | 'warn' | 'no'
  text: string
}
const ok = (text: string): Elig => ({ level: 'ok', text })
const warn = (text: string): Elig => ({ level: 'warn', text })
const no = (text: string): Elig => ({ level: 'no', text })

export function nightElig(p: PersonId, i: number, plan: Plan): Elig {
  const w = dow(i)
  switch (p) {
    case 'elena':
      if (w === 2) return no("Doesn't do Tuesdays")
      if (w === 5 || w === 6) return no('Weeknights only (Sun–Thu)')
      return ok('Free after 6pm')
    case 'tom':
      if (w === 5 || w === 6) return ok('Weekend · 3 hr drive')
      return no('Weekends only (Fri & Sat nights)')
    case 'marisol':
      if (inAway(i)) return no(`Away ${MARISOL_AWAY_LABEL}`)
      return ok('Free')
    case 'david': {
      const s = davidStretch(plan)
      if (!s) return ok('Free for one 6-night stretch')
      if (i >= s.start && i <= s.end) return ok(`In his ${fmtRange(s.start, s.end)} stretch`)
      return no(`Stretch already set (${fmtRange(s.start, s.end)})`)
    }
    default:
      return no('Daytime check-ins only')
  }
}

/** Weekday daytime: PT ride (10:30am) or the surgeon appointment (2:15pm). */
export function dayElig(p: PersonId, d: number, plan: Plan, kind: 'ride' | 'appt'): Elig {
  const there = stays(plan, p, d - 1)
  switch (p) {
    case 'elena':
      if (kind === 'appt') return warn('Works weekdays · takes the afternoon off')
      return warn(there ? 'Staying the night before · takes the morning off' : 'Works weekdays · takes ~2 hrs off')
    case 'tom':
      return no('Weekends only')
    case 'marisol':
      if (inAway(d)) return no(`Away ${MARISOL_AWAY_LABEL}`)
      return ok(there ? 'Already there that morning' : '1 hr drive each way')
    case 'david': {
      const s = davidStretch(plan)
      if (!s) return no('Needs his 6-night stretch first')
      const present = kind === 'ride' ? d - 1 >= s.start && d - 1 <= s.end : (d - 1 >= s.start && d - 1 <= s.end) || (d >= s.start && d <= s.end)
      return present ? ok('Staying with Ruth that day') : no(`Only while he's here (${fmtRange(s.start, s.end)})`)
    }
    default:
      return no('Offered check-ins only')
  }
}

export function candidates(i: number, plan: Plan): PersonId[] {
  return (['elena', 'tom', 'marisol'] as PersonId[]).filter((p) => nightElig(p, i, plan).level !== 'no')
}

// ---------------------------------------------------------------- loads
export interface Load {
  nights: number
  rides: number
  roadHrs: number
}

export function loadOf(p: PersonId, plan: Plan): Load {
  const nights = plan.nights.map((x, i) => (x === p ? i : -1)).filter((i) => i >= 0)
  const rides = RIDE_DAYS.filter((d) => plan.rides[d] === p)
  if (p === 'gloria') return { nights: 0, rides: 0, roadHrs: 0 }
  const one = PEOPLE[p].oneWayHrs
  let trips = 0
  if (p === 'elena') trips = nights.length // heads home each morning
  else {
    let prev = -2
    for (const i of nights) {
      if (i !== prev + 1) trips++
      prev = i
    }
  }
  const extra = rides.filter((d) => plan.nights[d - 1] !== p).length
  return { nights: nights.length, rides: rides.length, roadHrs: (trips + extra) * 2 * one + rides.length * (50 / 60) }
}

export type Tick = 'mine' | 'free' | 'na'
export function stripOf(p: PersonId, plan: Plan): Tick[] {
  return Array.from({ length: NIGHTS }, (_, i) => {
    if (plan.nights[i] === p) return 'mine'
    return nightElig(p, i, plan).level === 'no' ? 'na' : 'free'
  })
}

export function dinnerAttendees(plan: Plan, i: number): PersonId[] {
  const out: PersonId[] = ['elena']
  if (!inAway(i)) out.push('marisol')
  if (plan.nights[i - 1] === 'tom' || plan.nights[i] === 'tom' || plan.asks.includes(i)) out.push('tom')
  if (plan.nights[i - 1] === 'david' || plan.nights[i] === 'david') out.push('david')
  return out
}

export const gloriaWeekCount = (plan: Plan, i: number) => plan.checkins.filter((c) => weekOf(c) === weekOf(i)).length

// ---------------------------------------------------------------- David's stretch
export function clearDavid(plan: Plan): Plan {
  const rides = { ...plan.rides }
  RIDE_DAYS.forEach((d) => {
    if (rides[d] === 'david') rides[d] = null
  })
  return { ...plan, nights: plan.nights.map((p) => (p === 'david' ? null : p)), rides }
}

export interface StretchStats {
  start: number
  end: number
  fills: number[]
  replaces: { i: number; who: PersonId }[]
  rides: number[]
  solo: number[] // nights in the window nobody else could take
  score: number
}

export function windowStats(plan: Plan, start: number): StretchStats {
  const base = clearDavid(plan)
  const end = start + 5
  const fills: number[] = []
  const replaces: { i: number; who: PersonId }[] = []
  const solo: number[] = []
  for (let i = start; i <= end; i++) {
    const cur = base.nights[i]
    if (!cur) {
      fills.push(i)
      if (candidates(i, base).length === 0) solo.push(i)
    } else replaces.push({ i, who: cur })
  }
  const rides = RIDE_DAYS.filter((d) => d - 1 >= start && d - 1 <= end && !base.rides[d])
  return { start, end, fills, replaces, rides, solo, score: fills.length * 10 + rides.length * 3 + solo.length * 4 - replaces.length * 8 }
}

export function bestWindows(plan: Plan): StretchStats[] {
  const all = Array.from({ length: NIGHTS - 5 }, (_, s) => windowStats(plan, s))
  return all.sort((a, b) => b.score - a.score || a.start - b.start)
}

export function applyStretch(plan: Plan, start: number): Plan {
  const base = clearDavid(plan)
  const nights = [...base.nights]
  for (let i = start; i < start + 6; i++) nights[i] = 'david'
  const rides = { ...base.rides }
  RIDE_DAYS.forEach((d) => {
    if (d - 1 >= start && d - 1 <= start + 5 && !rides[d]) rides[d] = 'david'
  })
  return { ...base, nights, rides }
}

// ---------------------------------------------------------------- assignment helpers
export const setNight = (plan: Plan, i: number, p: PersonId | null): Plan => {
  const nights = [...plan.nights]
  nights[i] = p
  return { ...plan, nights }
}
export const setRide = (plan: Plan, d: number, p: PersonId | null): Plan => ({ ...plan, rides: { ...plan.rides, [d]: p } })

export function assignNights(plan: Plan, idxs: number[], p: PersonId): Plan {
  let next = plan
  idxs.forEach((i) => (next = setNight(next, i, p)))
  return next
}

/** Give each open night to whoever is free and currently has the fewest nights (ties: nearest). */
export function fairFill(plan: Plan, idxs: number[]): Plan {
  let next = plan
  for (const i of idxs) {
    const c = candidates(i, next)
    if (!c.length) continue
    c.sort((a, b) => loadOf(a, next).nights - loadOf(b, next).nights || PEOPLE[a].oneWayHrs - PEOPLE[b].oneWayHrs)
    next = setNight(next, i, c[0])
  }
  return next
}

/** Marisol takes every ride except one that Elena covers (the one right after a night she already stays). */
export function splitRides(plan: Plan, rides: number[]): { plan: Plan; elenaRide: number } {
  const elenaRide = rides.find((d) => plan.nights[d - 1] === 'elena') ?? rides[rides.length - 1]
  let next = plan
  rides.forEach((d) => (next = setRide(next, d, d === elenaRide ? 'elena' : 'marisol')))
  return { plan: next, elenaRide }
}

// ---------------------------------------------------------------- issues (the "to sort out" list)
export type Issue =
  | { id: 'stretch'; best: StretchStats }
  | { id: 'marisol-nights'; nights: number[] }
  | { id: 'rides'; rides: number[]; marisolRides: number }
  | { id: 'fill'; nights: number[] }
  | { id: 'stuck'; nights: number[]; rides: number[] }
  | { id: 'dinner'; sunday: number; count: number }

export function buildIssues(plan: Plan): Issue[] {
  const issues: Issue[] = []
  const openN = openNights(plan)
  const openR = openRides(plan)
  const claimedN = new Set<number>()
  const claimedR = new Set<number>()

  if (!davidStretch(plan)) {
    const best = bestWindows(plan)[0]
    if (best && (best.fills.length > 0 || best.rides.length > 0)) {
      issues.push({ id: 'stretch', best })
      best.fills.forEach((i) => claimedN.add(i))
      best.rides.forEach((d) => claimedR.add(d))
    }
  }

  const remN = openN.filter((i) => !claimedN.has(i))
  const marisolOnly = remN.filter((i) => {
    const c = candidates(i, plan)
    return c.length === 1 && c[0] === 'marisol'
  })
  if (marisolOnly.length) issues.push({ id: 'marisol-nights', nights: marisolOnly })

  const remR = openR.filter((d) => !claimedR.has(d))
  const mRides = remR.filter((d) => dayElig('marisol', d, plan, 'ride').level === 'ok')
  if (mRides.length) issues.push({ id: 'rides', rides: mRides, marisolRides: loadOf('marisol', plan).rides })

  const fill = remN.filter((i) => !marisolOnly.includes(i) && candidates(i, plan).length > 0)
  if (fill.length) issues.push({ id: 'fill', nights: fill })

  const stuckN = remN.filter((i) => candidates(i, plan).length === 0)
  const stuckR = remR.filter((d) => !mRides.includes(d))
  if (stuckN.length || stuckR.length) issues.unshift({ id: 'stuck', nights: stuckN, rides: stuckR })

  for (const s of SUNDAYS) {
    const att = dinnerAttendees(plan, s)
    if (att.length < 3 && !att.includes('tom') && !plan.dismissed.includes(`dinner-${s}`)) {
      issues.push({ id: 'dinner', sunday: s, count: att.length })
    }
  }
  return issues
}

export const recommendedRideSplit = (plan: Plan, rides: number[]) => loadOf('marisol', plan).rides + rides.length > 8

export function acceptAll(plan: Plan): { plan: Plan; summary: string[] } {
  let p = plan
  const summary: string[] = []
  for (let k = 0; k < 8; k++) {
    const issue = buildIssues(p).find((x) => x.id !== 'stuck')
    if (!issue) break
    if (issue.id === 'stretch') {
      p = applyStretch(p, issue.best.start)
      summary.push(`David ${fmtRange(issue.best.start, issue.best.end)}`)
    } else if (issue.id === 'marisol-nights') {
      p = assignNights(p, issue.nights, 'marisol')
      summary.push(`Marisol ${issue.nights.length} nights`)
    } else if (issue.id === 'rides') {
      if (recommendedRideSplit(p, issue.rides) && issue.rides.length > 1) p = splitRides(p, issue.rides).plan
      else issue.rides.forEach((d) => (p = setRide(p, d, 'marisol')))
      summary.push('open PT rides')
    } else if (issue.id === 'fill') {
      p = fairFill(p, issue.nights)
      summary.push(`${issue.nights.length} nights filled fairly`)
    } else if (issue.id === 'dinner') {
      p = { ...p, asks: [...p.asks, issue.sunday] }
      summary.push(`asked Tom about ${fmt(issue.sunday)} dinner`)
    }
  }
  return { plan: p, summary }
}

// ---------------------------------------------------------------- misc
export const personSig = (p: PersonId, plan: Plan) =>
  JSON.stringify([
    plan.nights.map((x, i) => (x === p ? i : -1)).filter((i) => i >= 0),
    RIDE_DAYS.filter((d) => plan.rides[d] === p),
    plan.appt === p,
    p === 'gloria' ? plan.checkins : [],
    p === 'tom' ? plan.asks : [],
  ])

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
