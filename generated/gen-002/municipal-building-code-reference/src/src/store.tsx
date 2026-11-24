import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react'
import { AudienceId, AudienceSettings, Decision, DRAFT_START, PUBLISHED, Settings } from './data'

export type Tab = 'audiences' | 'memos' | 'review'
export type Status = 'draft' | 'pending' | 'changes' | 'approved' | 'scheduled'
export type Who = 'priya' | 'marcus'
export interface LogEntry { when: string; who: string; text: string; tone?: 'ok' | 'warn' }

export interface State {
  tab: Tab
  audience: AudienceId
  published: Settings
  draft: Settings
  pubDecisions: Record<string, Decision>
  decisions: Record<string, Decision>
  pubHistoricalPublic: boolean
  historicalPublic: boolean
  user: Who
  status: Status
  timing: 'now' | 'effective'
  note: string
  comment: string
  log: LogEntry[]
  clock: number
  toast: string
}

export const NAMES: Record<Who, { name: string; role: string }> = {
  priya: { name: 'Priya Natarajan', role: 'Technical Publications Coordinator' },
  marcus: { name: 'Marcus Bell', role: 'Deputy Building Official' },
}

const init: State = {
  tab: 'audiences',
  audience: 'reviewers',
  published: PUBLISHED,
  draft: DRAFT_START,
  pubDecisions: {},
  decisions: {},
  pubHistoricalPublic: true,
  historicalPublic: true,
  user: 'priya',
  status: 'draft',
  timing: 'now',
  note: '',
  comment: '',
  log: [
    { when: 'Today, 8:52 AM', who: 'Priya Natarajan', text: 'Started a draft of the 2024 transition settings.' },
    { when: 'Nov 3, 6:10 AM', who: 'Codeshelf', text: 'Offline bundle rebuilt (1.8 GB, 2021 edition) and synced to 24 tablets.' },
    { when: 'Oct 21, 7:30 PM', who: 'Codeshelf', text: 'City Council adopted the 2024 Building Code with 31 local amendments. 2024 edition loaded.' },
  ],
  clock: 0,
  toast: '',
}

export type Action =
  | { type: 'tab'; tab: Tab }
  | { type: 'audience'; id: AudienceId }
  | { type: 'patch'; id: AudienceId; patch: Partial<AudienceSettings> }
  | { type: 'resetAudience'; id: AudienceId }
  | { type: 'decide'; ids: string[]; value: Decision | null }
  | { type: 'historicalPublic'; value: boolean }
  | { type: 'user'; user: Who }
  | { type: 'note'; value: string }
  | { type: 'timing'; value: 'now' | 'effective' }
  | { type: 'comment'; value: string }
  | { type: 'submit' }
  | { type: 'withdraw' }
  | { type: 'approve' }
  | { type: 'requestChanges' }
  | { type: 'publish' }
  | { type: 'cancelSchedule' }
  | { type: 'toast'; value: string }

const stamp = (n: number) => {
  const m = 41 + n
  return `Today, 9:${String(m % 60).padStart(2, '0')} AM`
}

export function reducer(s: State, a: Action): State {
  const log = (who: string, text: string, tone?: 'ok' | 'warn'): Pick<State, 'log' | 'clock'> => ({
    log: [{ when: stamp(s.clock), who, text, tone }, ...s.log],
    clock: s.clock + 3,
  })
  switch (a.type) {
    case 'tab': return { ...s, tab: a.tab }
    case 'audience': return { ...s, audience: a.id, tab: 'audiences' }
    case 'patch': return { ...s, draft: { ...s.draft, [a.id]: { ...s.draft[a.id], ...a.patch } } }
    case 'resetAudience': return { ...s, draft: { ...s.draft, [a.id]: s.published[a.id] } }
    case 'decide': {
      const d = { ...s.decisions }
      a.ids.forEach((id) => (a.value ? (d[id] = a.value) : delete d[id]))
      return { ...s, decisions: d }
    }
    case 'historicalPublic': return { ...s, historicalPublic: a.value }
    case 'user': return { ...s, user: a.user }
    case 'note': return { ...s, note: a.value }
    case 'timing': return { ...s, timing: a.value }
    case 'comment': return { ...s, comment: a.value }
    case 'submit':
      return { ...s, status: 'pending', comment: '', ...log('Priya Natarajan', 'Submitted the draft to Marcus Bell for approval.') }
    case 'withdraw':
      return { ...s, status: 'draft', ...log('Priya Natarajan', 'Withdrew the submission to keep editing.') }
    case 'approve':
      return { ...s, status: 'approved', ...log('Marcus Bell', s.comment ? `Approved: “${s.comment}”` : 'Approved the changes.', 'ok') }
    case 'requestChanges':
      return { ...s, status: 'changes', ...log('Marcus Bell', s.comment ? `Asked for changes: “${s.comment}”` : 'Asked for changes.', 'warn') }
    case 'publish': {
      if (s.timing === 'effective' && s.status === 'approved') {
        return { ...s, status: 'scheduled', ...log('Priya Natarajan', 'Scheduled the approved changes to go live Jan 1, 2027 at 12:00 AM.') }
      }
      return {
        ...s,
        published: s.draft,
        pubDecisions: s.decisions,
        pubHistoricalPublic: s.historicalPublic,
        status: 'draft',
        note: '',
        comment: '',
        toast: 'Published. Readers, tablets and the public site now use these settings.',
        ...log('Priya Natarajan', 'Published the approved settings. Tablets will pick up the new bundle at their next sync.', 'ok'),
      }
    }
    case 'cancelSchedule':
      return { ...s, status: 'approved', ...log('Priya Natarajan', 'Cancelled the scheduled publish.') }
    case 'toast': return { ...s, toast: a.value }
  }
}

const Ctx = createContext<{ s: State; d: Dispatch<Action> } | null>(null)
export function Provider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, init)
  return <Ctx.Provider value={{ s, d }}>{children}</Ctx.Provider>
}
export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('no store')
  return c
}
export const isLocked = (s: State) => s.user === 'marcus' || s.status === 'pending' || s.status === 'approved' || s.status === 'scheduled'
