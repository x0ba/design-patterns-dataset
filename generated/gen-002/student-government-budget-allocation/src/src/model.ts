import {
  APPEAL_DAYS,
  AUDIT_SEED,
  AdvisorComment,
  COMMENTS,
  ESPORTS_ID,
  FOOD_CAP,
  JAN_MEETING,
  POOL,
  REQUESTS,
  Req,
  TODAY,
} from './data'

// ---- Formatting ------------------------------------------------------------
export const usd = (n: number) =>
  (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US')

export const usdSigned = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function parseDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
export const shortDate = (iso: string) => {
  const d = parseDate(iso)
  return `${MONTHS[d.getUTCMonth()]}\u00a0${d.getUTCDate()}`
}
export const longDate = (iso: string) => {
  const d = parseDate(iso)
  return `${DOW[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}
export function addDays(iso: string, n: number) {
  const d = parseDate(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export const daysBetween = (a: string, b: string) =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)

export const timeLabel = (iso: string) => {
  const d = iso.slice(0, 10)
  const t = iso.slice(11, 16)
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = ((h + 11) % 12) + 1
  return `${shortDate(d)}, ${hh}:${String(m).padStart(2, '0')} ${ap}`
}

// ---- Types -----------------------------------------------------------------
export interface Adj {
  lines: Record<string, number>
  deferred: boolean
  note: string
}

export interface Rescission {
  id: string
  reqId: string
  club: string
  president: string
  from: number
  to: number
  reason: string
  issuedOn: string
  windowEnds: string
}

export interface AuditEntry {
  at: string
  who: string
  text: string
  tone?: 'warn' | 'ok'
}

export interface Toast {
  id: number
  text: string
  undo?: Record<string, Adj>
}

export interface CommitReceipt {
  on: string
  awards: number
  total: number
  deferred: number
  trimmed: number
  trimmedBy: number
}

export interface State {
  adj: Record<string, Adj>
  comments: (AdvisorComment & { addressed: boolean })[]
  committed: Record<string, number> // reqId -> committed amount
  rescissions: Rescission[]
  receipt: CommitReceipt | null
  audit: AuditEntry[]
  toast: Toast | null
}

export const initialState = (): State => ({
  adj: {},
  comments: COMMENTS.map((c) => ({ ...c, addressed: false })),
  committed: { [ESPORTS_ID]: 2400 },
  rescissions: [],
  receipt: null,
  audit: AUDIT_SEED.map((a) => ({ ...a })),
  toast: null,
})

// ---- Derivations -----------------------------------------------------------
export const byId: Record<string, Req> = Object.fromEntries(REQUESTS.map((r) => [r.id, r]))

export const sumLines = (r: Req, adj: Adj | undefined) =>
  r.lines.reduce((s, l) => s + (adj?.lines[l.id] ?? l.approved), 0)

export const lineFinal = (adj: Adj | undefined, id: string, approved: number) => adj?.lines[id] ?? approved

export function finalAmount(r: Req, adj: Adj | undefined) {
  if (adj?.deferred) return 0
  return sumLines(r, adj)
}

export const isTrimmed = (r: Req, adj: Adj | undefined) =>
  !!adj && !adj.deferred && r.lines.some((l) => (adj.lines[l.id] ?? l.approved) !== l.approved)

export const isAdjusted = (r: Req, adj: Adj | undefined) => !!adj?.deferred || isTrimmed(r, adj)

export function foodOf(r: Req, adj: Adj | undefined) {
  return r.lines.filter((l) => l.cat === 'food').reduce((s, l) => s + (adj?.lines[l.id] ?? l.approved), 0)
}

/** Largest food spend that keeps food at or under 25% of the award (rounded down to $5). */
export function foodCapAmount(r: Req, adj: Adj | undefined) {
  const total = sumLines(r, adj)
  const food = foodOf(r, adj)
  const non = total - food
  return Math.floor(non * (FOOD_CAP / (1 - FOOD_CAP)) / 5) * 5
}

export interface Flag {
  key: string
  short: string
  long: string
  tone: 'amber' | 'red' | 'blue'
}

export function flagsFor(r: Req): Flag[] {
  const out: Flag[] = []
  if (r.status !== 'approved') return out
  const food = r.lines.filter((l) => l.cat === 'food').reduce((s, l) => s + l.approved, 0)
  const share = r.approved ? food / r.approved : 0
  if (share > FOOD_CAP)
    out.push({ key: 'food', short: `Food ${Math.round(share * 100)}%`, long: `food >25% of request (${Math.round(share * 100)}%)`, tone: 'amber' })
  if (r.offCampus && r.lines.some((l) => l.cat === 'travel' && l.approved > 0))
    out.push({ key: 'risk', short: 'Risk form', long: 'off-campus travel requires risk form', tone: 'amber' })
  for (const e of r.extraFlags) out.push({ key: 'x-' + e, short: e.startsWith('no sponsor') ? 'No sponsor match' : 'Prior balance', long: e, tone: 'blue' })
  return out
}

export const isNarrow = (r: Req) => (r.amendmentVote ?? r.vote)[0] <= 4
export const needsFundsBeforeJan = (r: Req) => r.firstSpend < JAN_MEETING
export const canWait = (r: Req) => r.firstSpend > JAN_MEETING

export const pendingReqs = REQUESTS.filter((r) => r.status === 'approved' && r.id !== ESPORTS_ID)

export interface Totals {
  approvedAll: number // committee-approved, all 58
  planned: number // what would be committed (Esports at its approved amount)
  adjustments: number // net change from chair trims and deferrals (<= 0)
  trimmedAwards: number
  deferredAwards: number
  committingAwards: number
  toCommit: number // total of the batch (excludes Esports)
  gap: number // planned - POOL
}

export function totals(s: State): Totals {
  let adjustments = 0
  let trimmed = 0
  let deferred = 0
  let toCommit = 0
  let committing = 0
  for (const r of pendingReqs) {
    const a = s.adj[r.id]
    const f = finalAmount(r, a)
    adjustments += f - r.approved
    toCommit += f
    if (a?.deferred) deferred++
    else {
      committing++
      if (isTrimmed(r, a)) trimmed++
    }
  }
  const esports = byId[ESPORTS_ID].approved
  const approvedAll = REQUESTS.filter((r) => r.status === 'approved').reduce((x, r) => x + r.approved, 0)
  const planned = toCommit + esports
  return { approvedAll, planned, adjustments, trimmedAwards: trimmed, deferredAwards: deferred, committingAwards: committing, toCommit, gap: planned - POOL }
}

export const esportsFiled = (s: State) => s.rescissions.some((x) => x.reqId === ESPORTS_ID)
export const isCommitted = (s: State) => !!s.receipt
export const committedTotal = (s: State) => Object.values(s.committed).reduce((a, b) => a + b, 0)

export const unaddressed = (s: State) => s.comments.filter((c) => !c.addressed)

export type Blocker = { key: string; text: string }
export function blockers(s: State): Blocker[] {
  const t = totals(s)
  const b: Blocker[] = []
  if (t.gap > 0) b.push({ key: 'pool', text: `Planned commitments are ${usd(t.gap)} over the pool.` })
  if (!esportsFiled(s)) b.push({ key: 'esports', text: 'Esports Club is still committed at $2,400. File the correction first.' })
  return b
}

// ---- Actions ---------------------------------------------------------------
export type Action =
  | { type: 'setLine'; reqId: string; lineId: string; value: number }
  | { type: 'resetAward'; reqId: string }
  | { type: 'setDeferred'; reqId: string; value: boolean }
  | { type: 'setNote'; reqId: string; note: string }
  | { type: 'capFoodAll' }
  | { type: 'capFood'; reqId: string }
  | { type: 'holdAmendment' }
  | { type: 'undo' }
  | { type: 'dismissToast' }
  | { type: 'addressComment'; id: string; value: boolean }
  | { type: 'rescind'; reqId: string; to: number; reason: string }
  | { type: 'commit' }

let toastSeq = 1
const blank = (): Adj => ({ lines: {}, deferred: false, note: '' })
const cleanup = (adj: Record<string, Adj>) => {
  const out: Record<string, Adj> = {}
  for (const [id, a] of Object.entries(adj)) {
    const r = byId[id]
    const changed = a.deferred || a.note.trim() !== '' || r.lines.some((l) => a.lines[l.id] !== undefined && a.lines[l.id] !== l.approved)
    if (changed) out[id] = a
  }
  return out
}

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'setLine': {
      if (isCommitted(s)) return s
      const r = byId[a.reqId]
      const line = r.lines.find((l) => l.id === a.lineId)!
      const v = Math.max(0, Math.min(line.approved, Math.round(a.value) || 0))
      const cur = s.adj[a.reqId] ?? blank()
      const lines = { ...cur.lines, [a.lineId]: v }
      return { ...s, adj: cleanup({ ...s.adj, [a.reqId]: { ...cur, lines } }) }
    }
    case 'resetAward': {
      const cur = s.adj[a.reqId]
      if (!cur) return s
      return { ...s, adj: cleanup({ ...s.adj, [a.reqId]: { ...cur, lines: {}, deferred: false } }) }
    }
    case 'setDeferred': {
      if (isCommitted(s)) return s
      const cur = s.adj[a.reqId] ?? blank()
      const r = byId[a.reqId]
      return {
        ...s,
        adj: cleanup({ ...s.adj, [a.reqId]: { ...cur, deferred: a.value } }),
        toast: a.value
          ? { id: toastSeq++, text: `${r.club} moved to the January docket (${usdSigned(-sumLines(r, cur))} this round).`, undo: s.adj }
          : null,
      }
    }
    case 'setNote': {
      const cur = s.adj[a.reqId] ?? blank()
      return { ...s, adj: cleanup({ ...s.adj, [a.reqId]: { ...cur, note: a.note } }) }
    }
    case 'capFood': {
      const r = byId[a.reqId]
      const cur = s.adj[a.reqId] ?? blank()
      const food = r.lines.find((l) => l.cat === 'food')
      if (!food) return s
      const cap = foodCapAmount(r, cur)
      const v = Math.min(cap, cur.lines[food.id] ?? food.approved)
      return { ...s, adj: cleanup({ ...s.adj, [a.reqId]: { ...cur, lines: { ...cur.lines, [food.id]: v } } }) }
    }
    case 'capFoodAll': {
      if (isCommitted(s)) return s
      const next = { ...s.adj }
      let saved = 0
      let n = 0
      for (const r of pendingReqs) {
        const cur = next[r.id] ?? blank()
        if (cur.deferred) continue
        const food = r.lines.find((l) => l.cat === 'food')
        if (!food) continue
        const curFood = cur.lines[food.id] ?? food.approved
        const cap = foodCapAmount(r, cur)
        if (curFood > cap) {
          saved += curFood - cap
          n++
          next[r.id] = { ...cur, lines: { ...cur.lines, [food.id]: cap } }
        }
      }
      if (!n) return s
      return {
        ...s,
        adj: cleanup(next),
        toast: { id: toastSeq++, text: `Food capped at 25% on ${n} awards (${usdSigned(-saved)}).`, undo: s.adj },
      }
    }
    case 'holdAmendment': {
      if (isCommitted(s)) return s
      const cur = s.adj['robotics-club'] ?? blank()
      return {
        ...s,
        adj: cleanup({
          ...s.adj,
          'robotics-club': {
            ...cur,
            lines: { ...cur.lines, 'robotics-club-dayton': 0 },
            note: cur.note || 'Dayton amendment held for the Jan 14 docket. Airfare and lodging are not needed until Feb 2.',
          },
        }),
        toast: { id: toastSeq++, text: 'Robotics Dayton amendment held (−$6,200).', undo: s.adj },
      }
    }
    case 'undo':
      if (!s.toast?.undo) return s
      return { ...s, adj: s.toast.undo, toast: null }
    case 'dismissToast':
      return { ...s, toast: null }
    case 'addressComment': {
      return { ...s, comments: s.comments.map((c) => (c.id === a.id ? { ...c, addressed: a.value } : c)) }
    }
    case 'rescind': {
      const r = byId[a.reqId]
      const from = s.committed[a.reqId]
      const rec: Rescission = {
        id: 'rx-' + (s.rescissions.length + 1),
        reqId: a.reqId,
        club: r.club,
        president: r.president,
        from,
        to: a.to,
        reason: a.reason.trim(),
        issuedOn: TODAY,
        windowEnds: addDays(TODAY, APPEAL_DAYS),
      }
      return {
        ...s,
        committed: { ...s.committed, [a.reqId]: a.to },
        rescissions: [rec, ...s.rescissions],
        audit: [
          {
            at: TODAY + 'T09:00',
            who: 'Jordan Mbeki',
            text: `Rescinded ${usd(from - a.to)} from ${r.club} (${usd(from)} → ${usd(a.to)}). Notice sent to ${r.president}; appeal window closes ${shortDate(rec.windowEnds)}.`,
            tone: 'ok',
          },
          ...s.audit,
        ],
        toast: { id: toastSeq++, text: `Rescission notice sent to ${r.club}. Appeals close ${shortDate(rec.windowEnds)}.` },
      }
    }
    case 'commit': {
      const t = totals(s)
      if (blockers(s).length) return s
      const committed = { ...s.committed }
      let trimmedBy = 0
      for (const r of pendingReqs) {
        const adj = s.adj[r.id]
        if (adj?.deferred) continue
        const f = finalAmount(r, adj)
        committed[r.id] = f
        if (isTrimmed(r, adj)) trimmedBy += r.approved - f
      }
      const audit: AuditEntry[] = []
      audit.push({
        at: TODAY + 'T09:05',
        who: 'Jordan Mbeki',
        text: `Committed ${t.committingAwards} awards totaling ${usd(t.toCommit)}. Clubs notified; spending opens Dec 1.`,
        tone: 'ok',
      })
      for (const r of pendingReqs) {
        const adj = s.adj[r.id]
        if (adj?.deferred)
          audit.push({ at: TODAY + 'T09:05', who: 'Jordan Mbeki', text: `Deferred ${r.club} (${usd(r.approved)}) to the Jan 14 docket.${adj.note ? ' ' + adj.note : ''}` })
        else if (isTrimmed(r, adj))
          audit.push({ at: TODAY + 'T09:05', who: 'Jordan Mbeki', text: `Trimmed ${r.club} from ${usd(r.approved)} to ${usd(finalAmount(r, adj))} before commit.${adj?.note ? ' ' + adj.note : ''}` })
      }
      return {
        ...s,
        committed,
        receipt: {
          on: TODAY,
          awards: t.committingAwards,
          total: t.toCommit,
          deferred: t.deferredAwards,
          trimmed: t.trimmedAwards,
          trimmedBy,
        },
        audit: [...audit.reverse(), ...s.audit],
        toast: null,
      }
    }
  }
}

export const POOL_AMOUNT = POOL
