import {
  INITIAL_EDITS, INITIAL_THREADS, INITIAL_VALUES, type Edit, type EntityId, type Grid, type Message, type Thread,
} from './data';

export type Selection =
  | { kind: 'cell'; lineId: string; week: number }
  | { kind: 'line'; lineId: string }
  | { kind: 'balance'; week: number }
  | null;

export type Tab = 'inspector' | 'changes' | 'threads' | 'versions';

export interface Presence {
  lineId: string;
  week: number;
  status: string;
}

export interface State {
  values: Grid;
  edits: Edit[];
  threads: Thread[];
  selection: Selection;
  tab: Tab;
  openThreadId: string | null;
  viewMode: 'values' | 'delta';
  entity: 'all' | EntityId;
  presence: Record<string, Presence | null>;
  payrollLock: { holder: string | null; since: Date; lastActivity: Date; hold: boolean; releasedAt?: Date };
  typing: { threadId: string; by: string } | null;
  flash: Record<string, number>;
  floorNote: string;
  signoff: { status: 'draft' | 'submitted'; at?: Date; memo?: string };
  toast: { id: number; text: string } | null;
  editing: { lineId: string; week: number } | null;
  drafts: Record<string, string>;
  focusMitigation: number;
}

export const initialState: State = {
  values: JSON.parse(JSON.stringify(INITIAL_VALUES)),
  edits: INITIAL_EDITS.map((e) => ({ ...e })),
  threads: INITIAL_THREADS.map((t) => ({ ...t, messages: [...t.messages] })),
  selection: { kind: 'balance', week: 4 },
  tab: 'inspector',
  openThreadId: null,
  viewMode: 'values',
  entity: 'all',
  presence: {
    raj: { lineId: 'D1', week: 8, status: 'Editing payroll — RN contract retro' },
    tomas: { lineId: 'D6', week: 4, status: 'Revising vendor disbursements' },
  },
  payrollLock: {
    holder: 'raj',
    since: new Date(2026, 10, 18, 12, 41),
    lastActivity: new Date(2026, 10, 18, 13, 12),
    hold: false,
  },
  typing: null,
  flash: {},
  floorNote: '',
  signoff: { status: 'draft' },
  toast: null,
  editing: null,
  drafts: {},
  focusMitigation: 0,
};

export type Action =
  | { type: 'select'; sel: Selection; tab?: Tab }
  | { type: 'tab'; tab: Tab }
  | { type: 'openThread'; id: string | null }
  | { type: 'viewMode'; mode: State['viewMode'] }
  | { type: 'entity'; entity: State['entity'] }
  | { type: 'edit'; by: string; lineId: string; week: number; value: number; note?: string; at: Date; live?: boolean }
  | { type: 'addNote'; editIds: string[]; note: string; by: string; at: Date }
  | { type: 'message'; threadId: string; msg: Message }
  | { type: 'createThread'; thread: Thread }
  | { type: 'setQuickReplies'; threadId: string; quickReplies?: Thread['quickReplies'] }
  | { type: 'resolve'; threadId: string; resolved: boolean }
  | { type: 'typing'; value: State['typing'] }
  | { type: 'presence'; who: string; p: Presence | null }
  | { type: 'releaseLock'; at: Date }
  | { type: 'toggleHold' }
  | { type: 'floorNote'; text: string }
  | { type: 'submit'; at: Date; memo: string }
  | { type: 'recall' }
  | { type: 'toast'; text: string | null }
  | { type: 'startEdit'; cell: State['editing'] }
  | { type: 'draft'; threadId: string; text: string }
  | { type: 'focusMitigation' };

let toastId = 0;
let editSeq = 1000;

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'select':
      return { ...s, selection: a.sel, tab: a.tab ?? s.tab, editing: null };
    case 'tab':
      return { ...s, tab: a.tab };
    case 'openThread':
      return { ...s, openThreadId: a.id, tab: 'threads' };
    case 'viewMode':
      return { ...s, viewMode: a.mode };
    case 'entity': {
      const sel = s.selection && s.selection.kind === 'balance' && a.entity !== 'all' ? null : s.selection;
      return { ...s, entity: a.entity, selection: sel };
    }
    case 'edit': {
      const old = s.values[a.lineId][a.week];
      if (old === a.value) return { ...s, editing: null };
      const row = [...s.values[a.lineId]];
      row[a.week] = a.value;
      const e: Edit = {
        id: 'e' + ++editSeq, lineId: a.lineId, week: a.week, old, new: a.value, by: a.by, at: a.at,
        note: a.note?.trim() || undefined, live: a.live,
      };
      const key = a.lineId + ':' + a.week;
      const lock = a.by === s.payrollLock.holder ? { ...s.payrollLock, lastActivity: a.at } : s.payrollLock;
      return {
        ...s,
        values: { ...s.values, [a.lineId]: row },
        edits: [...s.edits, e],
        flash: { ...s.flash, [key]: Date.now() },
        payrollLock: lock,
        editing: a.by === 'helen' ? null : s.editing,
      };
    }
    case 'addNote':
      return {
        ...s,
        edits: s.edits.map((e) => (a.editIds.includes(e.id) ? { ...e, note: a.note, noteBy: a.by, noteAt: a.at } : e)),
      };
    case 'message':
      return {
        ...s,
        threads: s.threads.map((t) => (t.id === a.threadId ? { ...t, messages: [...t.messages, a.msg] } : t)),
        typing: s.typing && s.typing.threadId === a.threadId && s.typing.by === a.msg.by ? null : s.typing,
      };
    case 'createThread':
      return { ...s, threads: [a.thread, ...s.threads], openThreadId: a.thread.id, tab: 'threads' };
    case 'setQuickReplies':
      return { ...s, threads: s.threads.map((t) => (t.id === a.threadId ? { ...t, quickReplies: a.quickReplies } : t)) };
    case 'resolve':
      return {
        ...s,
        threads: s.threads.map((t) =>
          t.id === a.threadId ? { ...t, status: a.resolved ? 'resolved' : 'open', quickReplies: a.resolved ? undefined : t.quickReplies } : t,
        ),
      };
    case 'typing':
      return { ...s, typing: a.value };
    case 'presence':
      return { ...s, presence: { ...s.presence, [a.who]: a.p } };
    case 'releaseLock':
      return { ...s, payrollLock: { ...s.payrollLock, holder: null, releasedAt: a.at } };
    case 'toggleHold':
      return { ...s, payrollLock: { ...s.payrollLock, hold: !s.payrollLock.hold } };
    case 'floorNote':
      return { ...s, floorNote: a.text };
    case 'submit':
      return { ...s, signoff: { status: 'submitted', at: a.at, memo: a.memo } };
    case 'recall':
      return { ...s, signoff: { status: 'draft' } };
    case 'toast':
      return { ...s, toast: a.text ? { id: ++toastId, text: a.text } : null };
    case 'startEdit':
      return { ...s, editing: a.cell };
    case 'draft':
      return { ...s, drafts: { ...s.drafts, [a.threadId]: a.text } };
    case 'focusMitigation':
      return { ...s, focusMitigation: s.focusMitigation + 1, selection: { kind: 'balance', week: 4 }, tab: 'inspector', entity: 'all' };
  }
}
