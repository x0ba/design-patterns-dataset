import {
  CLOSURES, Exceptions, INTERP_EXTERNAL, INTERP_LEAD_HOURS, LEAVE, LIN, Meeting, OST, PWN_DAYS,
  SOMALI_POOL, STAFF, TODAY, WINDOW, school,
} from './data'

// ---------------------------------------------------------------------------
// Date helpers (ISO strings, UTC noon to dodge DST)
// ---------------------------------------------------------------------------
const toDate = (iso: string) => new Date(iso + 'T12:00:00Z')
export const iso = (d: Date) => d.toISOString().slice(0, 10)
export const addDays = (s: string, n: number) => iso(new Date(toDate(s).getTime() + n * 86400000))
export const dow = (s: string) => toDate(s).getUTCDay()
export const diffDays = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000)
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const dowName = (s: string) => DOW[dow(s)]
export const fmtDay = (s: string) => `${DOW[dow(s)]}, ${MON[toDate(s).getUTCMonth()]} ${toDate(s).getUTCDate()}`
export const fmtShort = (s: string) => `${MON[toDate(s).getUTCMonth()]} ${toDate(s).getUTCDate()}`
export const dayNum = (s: string) => toDate(s).getUTCDate()
export const fmtTime = (m: number, suffix = true) => {
  const h = Math.floor(m / 60)
  const mm = m % 60
  const h12 = ((h + 11) % 12) + 1
  const s = `${h12}:${String(mm).padStart(2, '0')}`
  return suffix ? `${s} ${h >= 12 ? 'PM' : 'AM'}` : s
}
export const fmtRange = (start: number, dur: number) => {
  const end = start + dur
  const sameHalf = start >= 720 === end >= 720
  return sameHalf ? `${fmtTime(start, false)}–${fmtTime(end)}` : `${fmtTime(start)}–${fmtTime(end)}`
}

export const isClosed = (s: string): string | null => {
  const d = dow(s)
  if (d === 0 || d === 6) return 'Weekend'
  for (const c of CLOSURES) if (s >= c.from && s <= c.to) return c.label
  return null
}

/** Weekdays in the scheduling window, in order. */
export const WINDOW_DAYS: string[] = (() => {
  const out: string[] = []
  for (let d = WINDOW.from; d <= WINDOW.to; d = addDays(d, 1)) if (!isClosed(d)) out.push(d)
  return out
})()
export const WEEKS: string[][] = [WINDOW_DAYS.slice(0, 5), WINDOW_DAYS.slice(5, 10), WINDOW_DAYS.slice(10, 15)]

/** Last open weekday on/before the due date: a Dec 23 due date is really Fri Dec 18. */
export const effectiveDeadline = (due: string | null): string | null => {
  if (!due) return null
  let d = due
  while (isClosed(d)) d = addDays(d, -1)
  return d
}

export const daysLeft = (due: string) => diffDays(TODAY, due)
export const earliestWithNotice = () => addDays(TODAY, PWN_DAYS)
export const pwnSendBy = (date: string) => addDays(date, -PWN_DAYS)

// ---------------------------------------------------------------------------
// Slot evaluation
// ---------------------------------------------------------------------------
export type CheckKey =
  | 'closed' | 'deadline' | 'pwn' | 'family' | 'psych' | 'slp' | 'ot'
  | 'interp' | 'lea' | 'cm' | 'gened' | 'room'

export interface Check {
  key: CheckKey
  ok: boolean
  label: string
  detail: string
  short: string
  excepted?: boolean
}
export interface Evaluation {
  ok: boolean
  checks: Check[]
  psych?: string
  interp?: string
}

export const GRID_STARTS: number[] = (() => {
  const out: number[] = []
  for (let t = 8 * 60; t <= 17 * 60 + 30; t += 30) out.push(t)
  return out
})()
const BUILDING_CLOSE = 18 * 60
const TRAVEL = 45

const overlap = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

const peerBusy = (all: Meeting[], m: Meeting, who: string, date: string, s: number, e: number, role?: string) => {
  for (const o of all) {
    if (o.id === m.id || o.date !== date) continue
    if (!o.participants.some((p) => p.name === who && (!role || p.role === role))) continue
    if (overlap(s, e, o.start, o.start + o.dur)) return o
  }
  return null
}

const rangeText = (s: number, d: number) => fmtRange(s, d)

export interface EvalOpts {
  exceptions?: Exceptions
  /** same date/time as today → notice already out, no PWN re-check */
  sameSlot?: boolean
  /** force these psychologist candidates */
  psychCandidates?: string[]
}

export function psychCandidatesFor(m: Meeting): string[] {
  const cur = m.participants.find((p) => p.role === 'psych')
  if (!cur) return []
  if (m.coverage === 'lin') return [LIN, OST]
  return [cur.name]
}

export function evaluate(m: Meeting, all: Meeting[], date: string, start: number, opts: EvalOpts = {}): Evaluation {
  const ex = opts.exceptions ?? {}
  const end = start + m.dur
  const checks: Check[] = []
  const add = (c: Check) => checks.push(c)
  const sch = school(m.school)
  const w = dow(date)

  // Calendar
  const closed = isClosed(date)
  add({
    key: 'closed', ok: !closed && date >= WINDOW.from && date <= WINDOW.to && end <= BUILDING_CLOSE,
    label: 'School day', short: closed ? 'Closed' : 'Out of range',
    detail: closed ? `${fmtDay(date)}: ${closed}` : end > BUILDING_CLOSE ? 'Would run past 6:00 PM building close' : 'Open school day',
  })

  // Deadline
  const eff = effectiveDeadline(m.due)
  add({
    key: 'deadline', ok: !eff || date <= eff,
    label: 'Compliance deadline', short: 'Past due',
    detail: !m.due
      ? 'No statutory clock on this meeting'
      : date <= eff!
        ? eff === date ? `Lands on the last day (${fmtDay(eff!)})` : `Before ${fmtDay(eff!)} deadline`
        : `After the ${fmtDay(eff!)} deadline`,
  })

  // PWN
  const sendBy = pwnSendBy(date)
  const pwnOk = !!opts.sameSlot || sendBy >= TODAY
  add({
    key: 'pwn', ok: pwnOk, label: 'Prior written notice', short: 'Under 10 days',
    detail: opts.sameSlot
      ? 'Date unchanged — notice already issued'
      : pwnOk
        ? `Notice must go out by ${fmtDay(sendBy)}`
        : `Notice would be due ${fmtShort(sendBy)} — before today. Earliest date is ${fmtShort(earliestWithNotice())}`,
  })

  // Family
  const fam: string[] = []
  const par = m.parent
  if (par.after != null && start < par.after) fam.push(`${par.name} is only free after ${fmtTime(par.after)}`)
  if (par.before != null && end > par.before) fam.push(`${par.name} needs to finish by ${fmtTime(par.before)}`)
  if (par.noDays?.includes(w)) fam.push(`${par.name} can't meet on ${dowName(date)}s`)
  add({
    key: 'family', ok: fam.length === 0, label: 'Family availability', short: 'Family',
    detail: fam.length ? fam[0] : par.after != null ? `After ${fmtTime(par.after)} — OK` : `${par.name} — no stated limits`,
  })

  // Psychologist
  const psychP = m.participants.find((p) => p.role === 'psych')
  let chosenPsych: string | undefined
  if (psychP) {
    const cands = opts.psychCandidates ?? psychCandidatesFor(m)
    const msgs: string[] = []
    let excepted = false
    for (const name of cands) {
      const st = STAFF[name]
      let bad: string | null = null
      let usedException = false
      if (st.leave && date >= st.leave.from && date <= st.leave.to) bad = `${name} is on leave through ${fmtShort(LEAVE.to)}`
      if (!bad && st.days && !st.days.includes(w)) {
        if (name === OST && ex.ostOffSchedule) usedException = true
        else bad = `${name} only works ${st.days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join('/')}`
      }
      if (!bad && name === OST && !OST_SCHOOL(m)) {
        if (ex.ostOffSchedule) usedException = true
        else bad = `${name} doesn't cover ${sch.short}`
      }
      if (!bad) {
        const clash = peerBusy(all, m, name, date, start, end, 'psych')
        if (clash) bad = `${name} is in ${clash.student}'s meeting at ${rangeText(clash.start, clash.dur)}`
        else if (name === OST) {
          const trav = all.find((o) => o.id !== m.id && o.date === date && o.school !== m.school
            && o.participants.some((p) => p.name === name)
            && overlap(start - TRAVEL, end + TRAVEL, o.start, o.start + o.dur))
          if (trav) bad = `${name} needs travel time from ${school(trav.school).short}`
        }
      }
      if (bad) msgs.push(bad)
      else { chosenPsych = name; excepted = usedException; break }
    }
    add({
      key: 'psych', ok: !!chosenPsych, label: 'School psychologist', short: 'No psychologist',
      excepted,
      detail: chosenPsych
        ? excepted ? `${chosenPsych} off his usual schedule — needs his OK` : `${chosenPsych} available`
        : msgs.join(' · '),
    })
  }

  // SLP / OT with their own rules
  for (const role of ['slp', 'ot'] as const) {
    const p = m.participants.find((x) => x.role === role)
    if (!p) continue
    const st = STAFF[p.name]
    let bad: string | null = null
    if (st?.days && !st.days.includes(w)) bad = `${p.name} works ${st.days.map((d) => DOW[d]).join('/')} only`
    if (!bad) {
      const clash = peerBusy(all, m, p.name, date, start, end)
      if (clash) bad = `${p.name} is in ${clash.student}'s meeting at ${rangeText(clash.start, clash.dur)}`
    }
    const excused = !!ex[role]
    add({
      key: role, ok: !bad || excused, label: role === 'slp' ? 'Speech-language pathologist' : 'Occupational therapist',
      short: role === 'slp' ? 'No SLP' : 'OT busy', excepted: !!bad && excused,
      detail: bad ? (excused ? `${p.name} excused — not available then` : bad) : `${p.name} available`,
    })
  }

  // Interpreter
  const ip = m.participants.find((p) => p.role === 'interp')
  let chosenInterp: string | undefined
  if (ip && m.interp) {
    const pool = m.interp.language === 'Somali' ? SOMALI_POOL : [ip.name]
    const hoursAhead = (new Date(date + 'T00:00:00Z').getTime() + start * 60000 - new Date(TODAY + 'T00:00:00Z').getTime()) / 3600000
    const leadOk = hoursAhead >= INTERP_LEAD_HOURS
    const free = pool.filter((who) => !peerBusy(all, m, who, date, start, end)
      && !INTERP_EXTERNAL.some((x) => x.who === who && x.date === date && overlap(start, end, x.start, x.end)))
    chosenInterp = free.includes(ip.name) ? ip.name : free[0]
    add({
      key: 'interp', ok: !!chosenInterp && leadOk, label: `${m.interp.language} interpreter`, short: 'No interpreter',
      detail: !leadOk
        ? 'Needs 48 hours’ notice to Language Services'
        : chosenInterp
          ? `${chosenInterp} free — request by ${fmtShort(addDays(date, -2))}`
          : `Both ${m.interp.language} interpreters are booked then`,
    })
  }

  // LEA, case manager, gen-ed
  for (const role of ['lea', 'cm', 'gened'] as const) {
    const p = m.participants.find((x) => x.role === role)
    if (!p) continue
    const clash = peerBusy(all, m, p.name, date, start, end)
    add({
      key: role, ok: !clash, label: role === 'lea' ? 'LEA representative' : role === 'cm' ? 'Case manager' : 'Gen-ed teacher',
      short: 'Staff booked',
      detail: clash ? `${p.name} is in ${clash.student}'s meeting at ${rangeText(clash.start, clash.dur)}` : `${p.name} free`,
    })
  }

  // Room
  const roomClash = all.find((o) => o.id !== m.id && o.school === m.school && o.room === m.room && o.date === date && overlap(start, end, o.start, o.start + o.dur))
  add({
    key: 'room', ok: !roomClash, label: 'Room', short: 'Room taken',
    detail: roomClash ? `${m.room} is held for ${roomClash.student}` : `${m.room} open`,
  })

  return { ok: checks.every((c) => c.ok), checks, psych: chosenPsych, interp: chosenInterp }
}

function OST_SCHOOL(m: Meeting) {
  return (STAFF[OST].schools ?? []).includes(m.school)
}

// ---------------------------------------------------------------------------
// Day-level view of a meeting's options
// ---------------------------------------------------------------------------
const PRIORITY: CheckKey[] = ['closed', 'deadline', 'pwn', 'psych', 'slp', 'ot', 'interp', 'family', 'lea', 'cm', 'gened', 'room']

export interface DayInfo {
  date: string
  open: number[]
  /** short label when nothing is open */
  reason?: string
  reasonKey?: CheckKey
  detail?: string
  last?: boolean
}

export function scanDay(m: Meeting, all: Meeting[], date: string, opts: EvalOpts = {}): DayInfo {
  const open: number[] = []
  const failCount = new Map<CheckKey, number>()
  const sole = new Map<CheckKey, number>()
  const firstFail = new Map<CheckKey, string>()
  for (const s of GRID_STARTS) {
    const ev = evaluate(m, all, date, s, opts)
    if (ev.ok) open.push(s)
    else {
      const bad = ev.checks.filter((c) => !c.ok)
      if (bad.length === 1) sole.set(bad[0].key, (sole.get(bad[0].key) ?? 0) + 1)
      for (const c of bad) {
      failCount.set(c.key, (failCount.get(c.key) ?? 0) + 1)
      if (!firstFail.has(c.key)) firstFail.set(c.key, c.detail)
      }
    }
  }
  const eff = effectiveDeadline(m.due)
  const info: DayInfo = { date, open, last: !!eff && date === eff }
  if (!open.length) {
    const everywhere = PRIORITY.find((k) => failCount.get(k) === GRID_STARTS.length)
    if (everywhere) {
      info.reasonKey = everywhere
      info.reason = labelFor(everywhere, m, date, opts)
      info.detail = firstFail.get(everywhere)
    } else if ([...sole.values()].some((n) => n > 0)) {
      const pool = PRIORITY.filter((k) => sole.has(k))
      const key = (pool.some((k) => k !== 'family') ? pool.filter((k) => k !== 'family') : pool).sort((a, b) => (sole.get(b) ?? 0) - (sole.get(a) ?? 0))[0]
      info.reasonKey = key
      info.reason = labelFor(key, m, date, opts)
      info.detail = firstFail.get(key)
    } else {
      info.reason = 'No shared time'
      info.detail = 'Each person is free at some point, but never at the same time.'
    }
  }
  return info
}

function labelFor(key: CheckKey, m: Meeting, date: string, opts: EvalOpts): string {
  switch (key) {
    case 'closed': return isClosed(date) ?? 'Closed'
    case 'deadline': return 'Past due'
    case 'pwn': return 'Under 10 days'
    case 'psych': {
      if (m.coverage === 'lin' && date <= LEAVE.to && !opts.exceptions?.ostOffSchedule) {
        const ost = STAFF[OST]
        if (!ost.schools?.includes(m.school)) return 'Lin out · no sub here'
        if (!ost.days!.includes(dow(date))) return 'Lin out · sub off'
      }
      return 'No psychologist'
    }
    case 'slp': return 'No SLP'
    case 'ot': return 'OT booked'
    case 'interp': return 'No interpreter'
    case 'family': return 'Family'
    case 'room': return 'Room taken'
    default: return 'Staff booked'
  }
}

// ---------------------------------------------------------------------------
// Triage for Dr. Lin's meetings
// ---------------------------------------------------------------------------
export type TriageKind = 'swap' | 'reschedule' | 'blocked' | 'resolved'
export interface Triage {
  kind: TriageKind
  headline: string
  detail: string
  swap?: Evaluation
  openDays: number
  firstOpen?: string
  near?: { key: 'slp' | 'ot' | 'ost'; label: string; days: number }[]
}

function swapWhy(m: Meeting, swap: Evaluation): string {
  const sch = school(m.school)
  const psych = swap.checks.find((c) => c.key === 'psych')
  if (psych && !psych.ok) {
    if (!(STAFF[OST].schools ?? []).includes(m.school)) {
      return `${sch.short} isn\u2019t one of Dr. Ostrowski\u2019s four schools, so this waits for Dr. Lin (back ${fmtShort(addDays(LEAVE.to, 2))}).`
    }
    if (!STAFF[OST].days!.includes(dow(m.date))) {
      return `Dr. Ostrowski isn\u2019t in on ${dowName(m.date)}s, and the date can\u2019t move earlier than ${fmtShort(earliestWithNotice())} without breaking the 10-day notice.`
    }
  }
  const why = swap.checks.find((c) => !c.ok)
  return why ? why.detail + '.' : ''
}

export function openDaysFor(m: Meeting, all: Meeting[], exceptions: Exceptions = {}): DayInfo[] {
  return WINDOW_DAYS.map((d) => scanDay(m, all, d, { exceptions })).filter((d) => d.open.length)
}

export function triage(m: Meeting, all: Meeting[]): Triage {
  if (m.resolution) return { kind: 'resolved', headline: m.resolution.text, detail: '', openDays: 0 }
  const swap = evaluate(m, all, m.date, m.start, { sameSlot: true, psychCandidates: [OST] })
  if (swap.ok) {
    return { kind: 'swap', headline: 'Dr. Ostrowski can take this one as scheduled', detail: `${fmtDay(m.date)} at ${school(m.school).short} is on his schedule; the date doesn’t change so the notice stands.`, swap, openDays: 0 }
  }
  const days = openDaysFor(m, all)
  if (days.length) {
    return {
      kind: 'reschedule',
      headline: `Needs a new date — ${days.length} workable day${days.length > 1 ? 's' : ''}`,
      detail: swapWhy(m, swap),
      swap, openDays: days.length, firstOpen: days[0].date,
    }
  }
  const near: Triage['near'] = []
  const hasSlp = m.participants.some((p) => p.role === 'slp')
  const hasOt = m.participants.some((p) => p.role === 'ot')
  const s1 = hasSlp ? openDaysFor(m, all, { slp: true }) : []
  if (s1.length) near.push({ key: 'slp', label: 'Excuse the SLP (parent consent + written input)', days: s1.length })
  const s3 = hasOt ? openDaysFor(m, all, { ot: true }) : []
  if (s3.length) near.push({ key: 'ot', label: 'Excuse the OT', days: s3.length })
  const s2 = m.coverage === 'lin' ? openDaysFor(m, all, { ostOffSchedule: true }) : []
  if (s2.length) near.push({ key: 'ost', label: 'Ask Dr. Ostrowski for an off-schedule day', days: s2.length })
  return {
    kind: 'blocked',
    headline: 'No compliant date exists as the roster stands',
    detail: 'Every day before the deadline is blocked for at least one required participant.',
    swap, openDays: 0, near,
  }
}

/** For the all-meetings table: quick flags */
export function pwnState(m: Meeting): { label: string; tone: 'ok' | 'warn' | 'bad' | 'muted'; sendBy: string } {
  const sendBy = pwnSendBy(m.date)
  if (m.pwn.status === 'sent') return { label: 'Sent', tone: 'ok', sendBy }
  const left = diffDays(TODAY, sendBy)
  if (left < 0) return { label: `Overdue ${-left}d`, tone: 'bad', sendBy }
  if (left <= 1) return { label: left === 0 ? 'Send today' : 'Send tomorrow', tone: 'warn', sendBy }
  return { label: `Send by ${fmtShort(sendBy)}`, tone: 'muted', sendBy }
}
