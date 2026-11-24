import { createContext, ReactNode, useContext, useMemo, useReducer } from 'react'
import { Exceptions, INITIAL_MEETINGS, LIN_IDS, Meeting, OST, Participant, TODAY } from './data'
import { evaluate, fmtDay, fmtTime, triage, Triage } from './engine'

export type View = 'coverage' | 'calendar' | 'meetings' | 'outbox' | 'people'

interface Toast { id: number; text: string; undo?: Meeting[] }
interface State {
  meetings: Meeting[]
  view: View
  selected: string
  drawer: string | null
  toast: Toast | null
}

type Action =
  | { t: 'view'; view: View }
  | { t: 'select'; id: string }
  | { t: 'drawer'; id: string | null }
  | { t: 'swap'; id: string }
  | { t: 'move'; id: string; date: string; start: number; ex: Exceptions }
  | { t: 'sendPwn'; id: string }
  | { t: 'submitInterp'; id: string }
  | { t: 'confirm'; id: string; idx: number }
  | { t: 'remind'; id: string; idx: number }
  | { t: 'undo' }
  | { t: 'dismiss' }

let toastId = 0

const setP = (m: Meeting, idx: number, patch: Partial<Participant>): Meeting => ({
  ...m,
  participants: m.participants.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
})
const log = (m: Meeting, text: string): Meeting => ({ ...m, log: [...m.log, { at: TODAY, text }] })
const replace = (list: Meeting[], next: Meeting) => list.map((m) => (m.id === next.id ? next : m))

function reducer(s: State, a: Action): State {
  switch (a.t) {
    case 'view': return { ...s, view: a.view, drawer: null }
    case 'select': return { ...s, selected: a.id }
    case 'drawer': return { ...s, drawer: a.id }
    case 'dismiss': return { ...s, toast: null }
    case 'undo': return s.toast?.undo ? { ...s, meetings: s.toast.undo, toast: null } : s
    case 'swap': {
      const m = s.meetings.find((x) => x.id === a.id)!
      const i = m.participants.findIndex((p) => p.role === 'psych')
      let next = setP(m, i, { name: OST, status: 'pending', note: 'Substitute for Dr. Lin' })
      next = { ...next, resolution: { kind: 'swap', text: `Swapped to Dr. Ostrowski · ${fmtDay(m.date)}, ${fmtTime(m.start)}` } }
      next = log(next, 'Psychologist changed from Dr. Mei Lin to Dr. Paul Ostrowski; date and notice unchanged')
      return {
        ...s, meetings: replace(s.meetings, next),
        toast: { id: ++toastId, text: `${m.student} — Dr. Ostrowski assigned. Confirmation request queued.`, undo: s.meetings },
      }
    }
    case 'move': {
      const m = s.meetings.find((x) => x.id === a.id)!
      const ev = evaluate(m, s.meetings, a.date, a.start, { exceptions: a.ex })
      const origin = m.origin ?? { date: m.date, start: m.start }
      const slpExc = ev.checks.find((c) => c.key === 'slp')?.excepted
      const otExc = ev.checks.find((c) => c.key === 'ot')?.excepted
      const ostExc = ev.checks.find((c) => c.key === 'psych')?.excepted
      const participants = m.participants.map((p): Participant => {
        if (p.role === 'psych' && ev.psych) {
          return { ...p, name: ev.psych, status: ostExc ? 'exception' : 'pending', note: ostExc ? 'Off-schedule day — awaiting his OK' : ev.psych === OST ? 'Substitute for Dr. Lin' : undefined }
        }
        if (p.role === 'slp' && slpExc) return { ...p, status: 'excusal', note: 'Excusal — consent & written input needed' }
        if (p.role === 'ot' && otExc) return { ...p, status: 'excusal', note: 'Excusal — consent & written input needed' }
        if (p.role === 'interp' && ev.interp) return { ...p, name: ev.interp, status: 'pending', note: `${m.interp?.language} — request needed` }
        return { ...p, status: 'pending', note: undefined }
      })
      const exceptional = !!(slpExc || otExc || ostExc)
      const who = ev.psych ? ` · ${ev.psych}` : ''
      let next: Meeting = {
        ...m, date: a.date, start: a.start, origin, participants, exceptions: a.ex,
        pwn: { status: 'reissue' },
        interp: m.interp ? { ...m.interp, status: 'request-needed' } : undefined,
        resolution: m.coverage === 'lin' || m.resolution
          ? { kind: exceptional ? 'exception' : 'moved', text: `Moved to ${fmtDay(a.date)}, ${fmtTime(a.start)}${who}${exceptional ? ' · needs sign-off' : ''}` }
          : undefined,
      }
      next = log(next, `Rescheduled from ${fmtDay(origin.date)} ${fmtTime(origin.start)} to ${fmtDay(a.date)} ${fmtTime(a.start)}; new notice required`)
      return {
        ...s, meetings: replace(s.meetings, next),
        toast: { id: ++toastId, text: `${m.student} moved to ${fmtDay(a.date)}, ${fmtTime(a.start)}. New notice drafted.`, undo: s.meetings },
      }
    }
    case 'sendPwn': {
      const m = s.meetings.find((x) => x.id === a.id)!
      const next = log({ ...m, pwn: { status: 'sent', sentOn: TODAY } }, 'Prior written notice sent to parent')
      return { ...s, meetings: replace(s.meetings, next), toast: { id: ++toastId, text: `Notice sent for ${m.student}.`, undo: s.meetings } }
    }
    case 'submitInterp': {
      const m = s.meetings.find((x) => x.id === a.id)!
      let next: Meeting = { ...m, interp: m.interp ? { ...m.interp, status: 'requested' } : undefined }
      const i = m.participants.findIndex((p) => p.role === 'interp')
      if (i >= 0) next = setP(next, i, { status: 'requested', note: `${m.interp?.language} — request submitted` })
      next = log(next, `${m.interp?.language} interpreter requested from District Language Services`)
      return { ...s, meetings: replace(s.meetings, next), toast: { id: ++toastId, text: `Interpreter request sent for ${m.student}.`, undo: s.meetings } }
    }
    case 'confirm': {
      const m = s.meetings.find((x) => x.id === a.id)!
      const p = m.participants[a.idx]
      const note = p.status === 'excusal' ? 'Excused — consent on file' : p.status === 'exception' ? 'Approved' : undefined
      let next = setP(m, a.idx, { status: 'confirmed', note })
      next = log(next, `${p.name} (${p.role === 'parent' ? 'parent' : p.role}) confirmed`)
      return { ...s, meetings: replace(s.meetings, next), toast: { id: ++toastId, text: `${p.name} marked confirmed for ${m.student}.`, undo: s.meetings } }
    }
    case 'remind': {
      const m = s.meetings.find((x) => x.id === a.id)!
      const p = m.participants[a.idx]
      const next = setP(m, a.idx, { note: 'Reminder sent today' })
      return { ...s, meetings: replace(s.meetings, next), toast: { id: ++toastId, text: `Reminder sent to ${p.name}.` } }
    }
  }
}

interface Ctx {
  s: State
  go: (v: View) => void
  select: (id: string) => void
  openDrawer: (id: string | null) => void
  swap: (id: string) => void
  move: (id: string, date: string, start: number, ex: Exceptions) => void
  sendPwn: (id: string) => void
  submitInterp: (id: string) => void
  confirm: (id: string, idx: number) => void
  remind: (id: string, idx: number) => void
  undo: () => void
  dismiss: () => void
  triageOf: (m: Meeting) => Triage
  linMeetings: Meeting[]
}

const C = createContext<Ctx>(null as unknown as Ctx)
export const useStore = () => useContext(C)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, {
    meetings: INITIAL_MEETINGS, view: 'coverage' as View, selected: INITIAL_MEETINGS.find((m) => m.student === 'Nia T.')!.id, drawer: null, toast: null,
  })
  const value = useMemo<Ctx>(() => ({
    s,
    go: (view) => d({ t: 'view', view }),
    select: (id) => d({ t: 'select', id }),
    openDrawer: (id) => d({ t: 'drawer', id }),
    swap: (id) => d({ t: 'swap', id }),
    move: (id, date, start, ex) => d({ t: 'move', id, date, start, ex }),
    sendPwn: (id) => d({ t: 'sendPwn', id }),
    submitInterp: (id) => d({ t: 'submitInterp', id }),
    confirm: (id, idx) => d({ t: 'confirm', id, idx }),
    remind: (id, idx) => d({ t: 'remind', id, idx }),
    undo: () => d({ t: 'undo' }),
    dismiss: () => d({ t: 'dismiss' }),
    triageOf: (m) => triage(m, s.meetings),
    linMeetings: s.meetings.filter((m) => LIN_IDS.includes(m.id)),
  }), [s])
  return <C.Provider value={value}>{children}</C.Provider>
}
