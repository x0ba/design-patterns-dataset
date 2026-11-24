import { useEffect, useReducer, useRef, useState } from 'react'
import { EXEMPTIONS, ExemptionCode, INITIAL_LETTER_EDITS, LETTER_PARAS, REDACTIONS, Tab, USER } from './data'

/* ---------- Mock clock: Mon Nov 16 2026, 2:47 PM, advancing in real time ---------- */
const BASE = new Date(2026, 10, 16, 14, 47, 0).getTime()
const FIRST_KEY = 'clerkwise.firstLoad.v1'
function firstLoad(): number {
  const v = Number(localStorage.getItem(FIRST_KEY))
  if (v) return v
  const n = Date.now()
  localStorage.setItem(FIRST_KEY, String(n))
  return n
}
export function now(): number {
  return BASE + (Date.now() - firstLoad())
}
export const at = (h: number, m: number, d = 16) => new Date(2026, 10, d, h, m, 0).getTime()

export function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
export function fmtTimeSec(t: number) {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}
export function fmtDay(t: number) {
  return new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/* ---------- State ---------- */
export type Status = 'pending' | 'approved' | 'declined'
export interface Decision {
  status: Status
  exemption: ExemptionCode
  note: string
  by?: string
  at?: number
}
export interface AuditEvent {
  id: number
  t: number
  actor: 'assistant' | 'user' | 'system' | 'supervisor'
  who: string
  text: string
  detail?: string
}
export interface State {
  decisions: Record<string, Decision>
  letter: Record<string, string>
  letterReviewed: boolean
  attested: boolean
  walkDone: string[]
  audit: AuditEvent[]
  lastSaved: number
  sent: null | { mode: 'requester' | 'supervisor'; t: number }
  selected: string
  tab: Tab
  previewRequester: boolean
  booking: null | { slot: string; attach: boolean; topic: string }
}

function initial(): State {
  const decisions: Record<string, Decision> = {}
  for (const r of REDACTIONS) decisions[r.id] = { status: 'pending', exemption: r.exemption, note: '' }
  decisions.R1 = { ...decisions.R1, status: 'approved', by: USER.name, at: at(14, 31) }
  decisions.R2 = { ...decisions.R2, status: 'approved', by: USER.name, at: at(14, 33) }
  const letter: Record<string, string> = {}
  for (const p of LETTER_PARAS) letter[p.id] = INITIAL_LETTER_EDITS[p.id] ?? p.text
  let id = 1
  const ev = (t: number, actor: AuditEvent['actor'], who: string, text: string, detail?: string): AuditEvent => ({ id: id++, t, actor, who, text, detail })
  return {
    decisions,
    letter,
    letterReviewed: false,
    attested: false,
    walkDone: ['w1', 'w2'],
    audit: [
      ev(at(9, 12, 3), 'system', 'Records portal', 'Request received from Owen Pak (The Marren Valley Courier)', 'Response due Wed, Nov 18, 2026 under PRA § 4(a), 10 business days. Nov 11 (Veterans Day) excluded.'),
      ev(at(9, 40, 3), 'supervisor', 'Gail Moreno', 'Assigned to Renata Bálint'),
      ev(at(10, 5, 12), 'user', USER.name, 'Ran email search across 6 Public Works mailboxes', '61 results'),
      ev(at(15, 22, 13), 'user', USER.name, 'Marked 38 documents responsive (212 pages), 23 not responsive'),
      ev(at(14, 18), 'user', USER.name, 'Asked Clerkwise Assist for a draft response and redaction suggestions'),
      ev(at(14, 19), 'assistant', 'Clerkwise Assist', 'Generated draft letter (v1) and 14 redaction suggestions', '9 × PRA-6(b), 3 × PRA-9(a), 2 × PRA-11 · 11 high confidence, 3 medium'),
      ev(at(14, 31), 'user', USER.name, 'Approved redaction R1 · PRA-6(b)', 'DOC-03 p. 2'),
      ev(at(14, 33), 'user', USER.name, 'Approved redaction R2 · PRA-6(b)', 'DOC-05 p. 1'),
      ev(at(14, 40), 'user', USER.name, 'Edited letter paragraph “Opening”'),
    ],
    lastSaved: at(14, 40),
    sent: null,
    selected: 'R3',
    tab: 'redactions',
    previewRequester: false,
    booking: null,
  }
}

export type Action =
  | { type: 'decide'; id: string; status: Status }
  | { type: 'undo'; id: string }
  | { type: 'setExemption'; id: string; code: ExemptionCode }
  | { type: 'note'; id: string; note: string }
  | { type: 'noteCommit'; id: string }
  | { type: 'select'; id: string }
  | { type: 'tab'; tab: Tab }
  | { type: 'preview'; on: boolean }
  | { type: 'letter'; pid: string; text: string }
  | { type: 'letterCommit'; pid: string; label: string; restored?: boolean }
  | { type: 'letterReviewed'; on: boolean }
  | { type: 'attest'; on: boolean }
  | { type: 'walkDone'; id: string; done: boolean }
  | { type: 'send'; mode: 'requester' | 'supervisor' }
  | { type: 'recall' }
  | { type: 'book'; slot: string; attach: boolean; topic: string }
  | { type: 'unbook' }
  | { type: 'reset' }

function log(s: State, text: string, detail?: string, actor: AuditEvent['actor'] = 'user', who = USER.name): AuditEvent[] {
  const nextId = (s.audit[s.audit.length - 1]?.id ?? 0) + 1
  return [...s.audit, { id: nextId, t: now(), actor, who, text, detail }]
}

const SAVED_KEYS: (keyof State)[] = ['decisions', 'letter', 'letterReviewed', 'attested', 'walkDone', 'audit', 'sent', 'booking']

function reducer(s: State, a: Action): State {
  const r = (id: string) => REDACTIONS.find((x) => x.id === id)!
  switch (a.type) {
    case 'decide': {
      const d = s.decisions[a.id]
      const red = r(a.id)
      const verb = a.status === 'approved' ? 'Approved' : 'Declined (will be released)'
      const changed = d.exemption !== red.exemption ? ` (changed from ${red.exemption})` : ''
      return {
        ...s,
        decisions: { ...s.decisions, [a.id]: { ...d, status: a.status, by: USER.name, at: now() } },
        audit: log(s, `${verb} redaction ${a.id} · ${d.exemption}${changed}`, [`${red.docId} p. ${red.page}`, d.note && `Reason: “${d.note}”`].filter(Boolean).join(' · ')),
        lastSaved: now(),
      }
    }
    case 'undo': {
      const d = s.decisions[a.id]
      return {
        ...s,
        decisions: { ...s.decisions, [a.id]: { ...d, status: 'pending', by: undefined, at: undefined } },
        audit: log(s, `Undid decision on redaction ${a.id}`, `Was: ${d.status}`),
        lastSaved: now(),
      }
    }
    case 'setExemption': {
      const d = s.decisions[a.id]
      if (d.exemption === a.code) return s
      return {
        ...s,
        decisions: { ...s.decisions, [a.id]: { ...d, exemption: a.code, status: 'pending', by: undefined, at: undefined } },
        audit: log(s, `Changed exemption on ${a.id}: ${d.exemption} → ${a.code}`),
        lastSaved: now(),
      }
    }
    case 'note':
      return { ...s, decisions: { ...s.decisions, [a.id]: { ...s.decisions[a.id], note: a.note } }, lastSaved: now() }
    case 'noteCommit': {
      const d = s.decisions[a.id]
      if (!d.note.trim()) return s
      return { ...s, audit: log(s, `Recorded reason for ${a.id}`, `“${d.note.trim()}”`) }
    }
    case 'select':
      return { ...s, selected: a.id }
    case 'tab':
      return { ...s, tab: a.tab }
    case 'preview':
      return { ...s, previewRequester: a.on }
    case 'letter':
      return { ...s, letter: { ...s.letter, [a.pid]: a.text }, lastSaved: now(), letterReviewed: false }
    case 'letterCommit':
      return { ...s, audit: log(s, a.restored ? `Restored the assistant’s wording for “${a.label}”` : `Edited letter paragraph “${a.label}”`) }
    case 'letterReviewed':
      return { ...s, letterReviewed: a.on, lastSaved: now(), audit: a.on ? log(s, 'Confirmed full letter was read (AP-07 § 5)') : s.audit }
    case 'attest':
      return { ...s, attested: a.on, lastSaved: now() }
    case 'walkDone':
      return { ...s, walkDone: a.done ? Array.from(new Set([...s.walkDone, a.id])) : s.walkDone.filter((x) => x !== a.id) }
    case 'send':
      return {
        ...s,
        sent: { mode: a.mode, t: now() },
        lastSaved: now(),
        audit: log(
          s,
          a.mode === 'requester' ? 'Signed and sent response to Owen Pak' : 'Sent to Gail Moreno for review before release',
          a.mode === 'requester' ? 'Letter + 38 records (212 pages) via secure records portal · 14 redactions individually reviewed' : 'Nothing has been released to the requester',
        ),
      }
    case 'recall':
      return { ...s, sent: null, lastSaved: now(), audit: log(s, 'Recalled from supervisor review') }
    case 'book':
      return { ...s, booking: { slot: a.slot, attach: a.attach, topic: a.topic } }
    case 'unbook':
      return { ...s, booking: null }
    case 'reset':
      localStorage.removeItem(STORE_KEY)
      localStorage.removeItem(FIRST_KEY)
      return initial()
  }
}

const STORE_KEY = 'clerkwise.PRR-2026-1184.v1'

function load(): State {
  const base = initial()
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw)
    return { ...base, ...saved }
  } catch {
    return base
  }
}

export function useStore() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const [saving, setSaving] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    const toSave: Partial<State> = {}
    for (const k of SAVED_KEYS) (toSave as Record<string, unknown>)[k] = state[k]
    Object.assign(toSave, { lastSaved: state.lastSaved, selected: state.selected, tab: state.tab, previewRequester: state.previewRequester })
    localStorage.setItem(STORE_KEY, JSON.stringify(toSave))
  }, [state])
  // "Saving…" flash whenever saved content changes
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSaving(true)
    const t = setTimeout(() => setSaving(false), 650)
    return () => clearTimeout(t)
  }, [state.lastSaved])
  return { state, dispatch, saving }
}

/* ---------- Derived ---------- */
export function summarize(s: State) {
  const ds = REDACTIONS.map((r) => ({ r, d: s.decisions[r.id] }))
  const decided = ds.filter((x) => x.d.status !== 'pending').length
  const approved = ds.filter((x) => x.d.status === 'approved')
  const mediumMissingNote = ds.filter((x) => x.r.confidence === 'medium' && x.d.status !== 'pending' && !x.d.note.trim())
  const mediumPending = ds.filter((x) => x.r.confidence === 'medium' && x.d.status === 'pending')
  const mediumOk = ds.filter((x) => x.r.confidence === 'medium').every((x) => x.d.status !== 'pending' && x.d.note.trim())
  const byCode: Record<string, number> = {}
  const docsWith = new Set<string>()
  for (const x of approved) {
    byCode[x.d.exemption] = (byCode[x.d.exemption] ?? 0) + 1
    docsWith.add(x.r.docId)
  }
  return { decided, total: REDACTIONS.length, approved: approved.length, byCode, docsWith: docsWith.size, mediumMissingNote, mediumPending, mediumOk }
}

export function exemptionParagraph(s: State): string {
  const { byCode, docsWith, approved, decided, total } = summarize(s)
  const codes = (Object.keys(EXEMPTIONS) as ExemptionCode[]).filter((c) => byCode[c])
  if (!approved) {
    return decided === total
      ? 'The records are being released in full. No portions have been redacted.'
      : '[This paragraph is written from your redaction decisions. Approve at least one redaction to see it here.]'
  }
  const items = codes.map((c) => `${EXEMPTIONS[c].letterText} (${byCode[c]} ${byCode[c] === 1 ? 'redaction' : 'redactions'})`)
  const list = items.length === 1 ? items[0] : items.length === 2 ? `${items[0]}; and ${items[1]}` : `${items.slice(0, -1).join('; ')}; and ${items[items.length - 1]}`
  return `Portions of ${docsWith} of the 38 records have been redacted. Each redaction is marked in the record with the exemption that applies. The redacted information consists of ${list}.`
}
