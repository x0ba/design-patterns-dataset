import { MESSAGES, ME } from './data'
import type { Msg, Quote } from './data/types'
import { appNow } from './time'

export interface Pending {
  quote?: Quote
  files: string[]
  slot?: string
}

export type TaskId = 'dana' | 'staff' | 'jonah'

interface UndoInfo {
  threadId: string
  msgId: string
  draft: string
  pending: Pending
  unreadIds: string[]
  taskWas: boolean | null
}

export interface Toast {
  id: number
  text: string
  undo?: UndoInfo
}

export interface State {
  active: string
  msgs: Record<string, Msg[]>
  divider: Record<string, string | undefined>
  drafts: Record<string, string>
  pending: Record<string, Pending>
  tasks: Record<TaskId, boolean>
  preview: string | null
  query: string
  focus: { id: string; n: number } | null
  toast: Toast | null
  seq: number
}

export type Action =
  | { type: 'open'; id: string }
  | { type: 'draft'; id: string; text: string }
  | { type: 'quote'; id: string; quote?: Quote }
  | { type: 'toggleFile'; id: string; file: string }
  | { type: 'slot'; id: string; slot?: string }
  | { type: 'send'; id: string }
  | { type: 'undo' }
  | { type: 'toast'; text: string }
  | { type: 'dismissToast' }
  | { type: 'task'; id: TaskId }
  | { type: 'preview'; file: string | null }
  | { type: 'query'; q: string }
  | { type: 'focus'; id: string }

const emptyPending = (): Pending => ({ files: [] })

export function initState(): State {
  const msgs: Record<string, Msg[]> = {}
  const divider: Record<string, string | undefined> = {}
  for (const [id, list] of Object.entries(MESSAGES)) {
    msgs[id] = list.map((m) => ({ ...m }))
    divider[id] = list.find((m) => m.unread)?.id
  }
  return {
    active: 'dana',
    msgs,
    divider,
    drafts: {},
    pending: {},
    tasks: { dana: false, staff: false, jonah: false },
    preview: null,
    query: '',
    focus: null,
    toast: null,
    seq: 1,
  }
}

const markRead = (list: Msg[]) => list.map((m) => (m.unread ? { ...m, unread: false } : m))

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'open': {
      if (a.id === s.active) return s
      const prev = s.active
      return {
        ...s,
        active: a.id,
        msgs: { ...s.msgs, [prev]: markRead(s.msgs[prev]) },
        divider: { ...s.divider, [prev]: undefined },
        toast: null,
      }
    }
    case 'draft':
      return { ...s, drafts: { ...s.drafts, [a.id]: a.text } }
    case 'quote':
      return { ...s, pending: { ...s.pending, [a.id]: { ...(s.pending[a.id] ?? emptyPending()), quote: a.quote } } }
    case 'toggleFile': {
      const p = s.pending[a.id] ?? emptyPending()
      const files = p.files.includes(a.file) ? p.files.filter((f) => f !== a.file) : [...p.files, a.file]
      return { ...s, pending: { ...s.pending, [a.id]: { ...p, files } } }
    }
    case 'slot': {
      const p = s.pending[a.id] ?? emptyPending()
      return { ...s, pending: { ...s.pending, [a.id]: { ...p, slot: p.slot === a.slot ? undefined : a.slot } } }
    }
    case 'send': {
      const text = (s.drafts[a.id] ?? '').trim()
      const p = s.pending[a.id] ?? emptyPending()
      if (!text && !p.slot && !p.files.length) return s
      const msg: Msg = {
        id: `new-${s.seq}`,
        from: ME,
        at: appNow().toISOString(),
        text,
        files: p.files.length ? p.files : undefined,
        quote: p.quote,
        call: p.slot,
      }
      const unreadIds = s.msgs[a.id].filter((m) => m.unread).map((m) => m.id)
      const taskKey = (['dana', 'staff', 'jonah'] as const).find((k) => k === a.id)
      const toastId = s.seq
      const who = a.id === 'team' ? 'the team' : a.id === 'dana' ? 'Dana' : a.id === 'staff' ? 'Prof. Halvorsen and Mateo' : 'Jonah'
      return {
        ...s,
        seq: s.seq + 1,
        msgs: { ...s.msgs, [a.id]: [...markRead(s.msgs[a.id]), msg] },
        drafts: { ...s.drafts, [a.id]: '' },
        pending: { ...s.pending, [a.id]: emptyPending() },
        tasks: taskKey ? { ...s.tasks, [taskKey]: true } : s.tasks,
        toast: {
          id: toastId,
          text: `Sent to ${who}`,
          undo: {
            threadId: a.id,
            msgId: msg.id,
            draft: s.drafts[a.id] ?? '',
            pending: p,
            unreadIds,
            taskWas: taskKey ? s.tasks[taskKey] : null,
          },
        },
      }
    }
    case 'undo': {
      const u = s.toast?.undo
      if (!u) return s
      const list = s.msgs[u.threadId]
        .filter((m) => m.id !== u.msgId)
        .map((m) => (u.unreadIds.includes(m.id) ? { ...m, unread: true } : m))
      const taskKey = (['dana', 'staff', 'jonah'] as const).find((k) => k === u.threadId)
      return {
        ...s,
        msgs: { ...s.msgs, [u.threadId]: list },
        drafts: { ...s.drafts, [u.threadId]: u.draft },
        pending: { ...s.pending, [u.threadId]: u.pending },
        tasks: taskKey && u.taskWas !== null ? { ...s.tasks, [taskKey]: u.taskWas } : s.tasks,
        toast: { id: s.seq, text: 'Message unsent. Your draft is back.' },
        seq: s.seq + 1,
      }
    }
    case 'toast':
      return { ...s, toast: { id: s.seq, text: a.text }, seq: s.seq + 1 }
    case 'dismissToast':
      return { ...s, toast: null }
    case 'task':
      return { ...s, tasks: { ...s.tasks, [a.id]: !s.tasks[a.id] } }
    case 'preview':
      return { ...s, preview: a.file }
    case 'query':
      return { ...s, query: a.q }
    case 'focus':
      return { ...s, focus: { id: a.id, n: s.seq }, seq: s.seq + 1 }
  }
}
