import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { CommentAnchor, Decision, PersonId, Role, SectionId, TaskSection } from '../types';
import { buildSeed, nowMs } from '../data/seed';
import { reduce, type Action, type Body } from './reducer';

export interface UiState {
  tab: SectionId;
  rightTab: 'comments' | 'activity';
  threadView: 'open' | 'resolved';
  anchorFilter: CommentAnchor | null;
  composer: CommentAnchor;
  historyPerson: PersonId | 'all';
  historyKind: 'all' | 'assign' | 'deleted' | 'done' | 'furniture' | 'sharing';
  historyItem: string | null;
  historyLimit: number;
  cleaningFilter: 'all' | 'open' | 'done' | 'mine' | 'unassigned';
  shareOpen: boolean;
  preview: PersonId | null; // when set, the note is rendered as this collaborator sees it
  toast: { id: number; msg: string } | null;
}

export const INITIAL_UI: UiState = {
  tab: 'cleaning',
  rightTab: 'comments',
  threadView: 'open',
  anchorFilter: null,
  composer: { section: 'cleaning' },
  historyPerson: 'all',
  historyKind: 'all',
  historyItem: null,
  historyLimit: 50,
  cleaningFilter: 'all',
  shareOpen: false,
  preview: null,
  toast: null,
};

export interface Actions {
  toggleTask(section: TaskSection, id: string): void;
  setAssignee(section: TaskSection, id: string, assignee: PersonId | null): void;
  setDue(section: TaskSection, id: string, due: string): void;
  addTask(section: TaskSection, title: string, assignee: PersonId | null, due: string): void;
  deleteTask(section: TaskSection, id: string): void;
  restoreTask(id: string): void;
  setDecision(id: string, decision: Decision): void;
  setClaim(id: string, person: PersonId | null): void;
  resolveConflict(id: string, option: number): void;
  toggleDeposit(id: string): void;
  addThread(anchor: CommentAnchor, text: string): void;
  replyThread(threadId: string, text: string): void;
  toggleResolved(threadId: string): void;
  setMoney(text: string): void;
  setRole(personId: PersonId, role: Role): void;
  setSections(personId: PersonId, sections: SectionId[] | 'all'): void;
  invite(name: string, role: Role): void;
  cancelInvite(personId: PersonId): void;
}

export interface AppCtx {
  s: ReturnType<typeof buildSeed>;
  now: number;
  act: Actions;
  ui: UiState;
  setUi: (patch: Partial<UiState>) => void;
}

const Ctx = createContext<AppCtx | null>(null);

let idSeq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idSeq++).toString(36)}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reduce, undefined, buildSeed);
  const [ui, setUiState] = useState<UiState>(INITIAL_UI);
  const [, tick] = useReducer((n: number) => n + 1, 0);

  // Re-render every 30 s so relative timestamps stay current.
  useEffect(() => {
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!ui.toast) return;
    const id = window.setTimeout(() => setUiState((u) => ({ ...u, toast: null })), 3500);
    return () => window.clearTimeout(id);
  }, [ui.toast]);

  const act = useMemo<Actions>(() => {
    const d = (b: Body, msg?: string) => {
      dispatch({ ...b, at: nowMs() } as Action);
      if (msg) setUiState((u) => ({ ...u, toast: { id: Date.now(), msg } }));
    };
    return {
      toggleTask: (section, id) => d({ type: 'toggleTask', section, id }),
      setAssignee: (section, id, assignee) => d({ type: 'setAssignee', section, id, assignee }),
      setDue: (section, id, due) => d({ type: 'setDue', section, id, due }),
      addTask: (section, title, assignee, due) =>
        d({ type: 'addTask', section, id: newId(section === 'cleaning' ? 'cl' : 'u'), title, assignee, due }, 'Task added'),
      deleteTask: (section, id) => d({ type: 'deleteTask', section, id }, 'Task deleted. Restore it from Recently deleted or Activity.'),
      restoreTask: (id) => d({ type: 'restoreTask', id }, 'Task restored'),
      setDecision: (id, decision) => d({ type: 'setDecision', id, decision }),
      setClaim: (id, person) => d({ type: 'setClaim', id, person }),
      resolveConflict: (id, option) => d({ type: 'resolveConflict', id, option }, 'Conflict resolved'),
      toggleDeposit: (id) => d({ type: 'toggleDeposit', id }),
      addThread: (anchor, text) => d({ type: 'addThread', threadId: newId('th'), anchor, text }, 'Comment posted'),
      replyThread: (threadId, text) => d({ type: 'replyThread', threadId, replyId: newId('r'), text }),
      toggleResolved: (threadId) => d({ type: 'toggleResolved', threadId }),
      setMoney: (text) => d({ type: 'setMoney', text }, 'Money Notes saved'),
      setRole: (personId, role) => d({ type: 'setRole', personId, role }),
      setSections: (personId, sections) => d({ type: 'setSections', personId, sections }),
      invite: (name, role) => d({ type: 'invite', personId: newId('guest'), name, role }, `Invite prepared for ${name}`),
      cancelInvite: (personId) => d({ type: 'cancelInvite', personId }, 'Invite cancelled'),
    };
  }, []);

  const value: AppCtx = {
    s,
    now: nowMs(),
    act,
    ui,
    setUi: (patch) => setUiState((u) => ({ ...u, ...patch })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
