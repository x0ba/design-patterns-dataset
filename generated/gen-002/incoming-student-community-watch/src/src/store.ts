import { create } from 'zustand';
import { SCENARIO_START, LEADERS, leaderById } from './data/community';
import { CURRENT_RULES, type Rules } from './data/alerts';
import { HELD_POSTS, QUESTIONS, UNVERIFIED, SEED_LOG, type LogEntry } from './data/cases';

export type View = 'catchup' | 'reports' | 'held' | 'questions' | 'accounts' | 'leaders' | 'groups' | 'rules' | 'log';
export type CaseId = 'wellbeing' | 'scam' | 'pii' | 'accounts' | 'questions' | 'held';

const LOADED_AT = Date.now();
export const nowMs = () => SCENARIO_START + (Date.now() - LOADED_AT);

export interface Escalation { contactId: string; method: 'called' | 'sent'; at: number; note: string }

export interface Data {
  wb: { escalations: Escalation[]; checkInAt: number | null; ownedByMe: boolean; resolvedAt: number | null; outcome: string; leaderFollowUp: string | null };
  scam: {
    removed: string[]; suspended: string[]; mbekiAt: number | null; warningAt: number | null; warningGroups: number;
    autoHold: boolean; recipientsNotifiedAt: number | null; resolvedAt: number | null;
  };
  pii: { hidden: string[]; leader: string | null; leaderNote: string; resolvedAt: number | null };
  held: Record<string, 'pending' | 'approved' | 'removed'>;
  heldLeader: string | null;
  questions: Record<string, string | null>; // leader id
  accounts: Record<string, 'pending' | 'verify_sent' | 'redirected' | 'suspended' | 'verified'>;
  handoffs: Record<string, number>;
  log: LogEntry[];
  rules: Rules;
  rulesSavedAt: number | null;
}

interface Toast { id: number; text: string; undo?: Data }

interface Store extends Data {
  view: View;
  selected: CaseId;
  toast: Toast | null;
  go: (v: View, sel?: CaseId) => void;
  select: (c: CaseId) => void;
  act: (text: string, mutate: (d: Data) => Partial<Data>, opts?: { undoable?: boolean; log?: string }) => void;
  undo: () => void;
  dismissToast: () => void;
}

const initialData = (): Data => ({
  wb: { escalations: [], checkInAt: null, ownedByMe: false, resolvedAt: null, outcome: '', leaderFollowUp: null },
  scam: { removed: [], suspended: [], mbekiAt: null, warningAt: null, warningGroups: 0, autoHold: false, recipientsNotifiedAt: null, resolvedAt: null },
  pii: { hidden: [], leader: null, leaderNote: '', resolvedAt: null },
  held: Object.fromEntries(HELD_POSTS.map((h) => [h.id, 'pending'])),
  heldLeader: null,
  questions: Object.fromEntries(QUESTIONS.map((q) => [q.id, null])),
  accounts: Object.fromEntries(UNVERIFIED.map((a) => [a.id, 'pending'])),
  handoffs: { l2: 1, l3: 0, l5: 2, l7: 1, l9: 0, l12: 1, l16: 3, l1: 0, l4: 0, l8: 0, l11: 0, l14: 0, l17: 0, l6: 0, l10: 0, l13: 0, l15: 0, l18: 0 },
  log: [...SEED_LOG].sort((a, b) => b.at - a.at),
  rules: CURRENT_RULES,
  rulesSavedAt: null,
});

const pickData = (s: Store): Data => ({
  wb: s.wb, scam: s.scam, pii: s.pii, held: s.held, heldLeader: s.heldLeader, questions: s.questions,
  accounts: s.accounts, handoffs: s.handoffs, log: s.log, rules: s.rules, rulesSavedAt: s.rulesSavedAt,
});

let toastSeq = 1;

const viewFromHash = (): View => {
  const h = window.location.hash.replace('#/', '').replace('#', '');
  const views: View[] = ['catchup', 'reports', 'held', 'questions', 'accounts', 'leaders', 'groups', 'rules', 'log'];
  return (views as string[]).includes(h) ? (h as View) : 'catchup';
};

export const useStore = create<Store>((set, get) => ({
  ...initialData(),
  view: viewFromHash(),
  selected: 'wellbeing',
  toast: null,
  go: (v, sel) => {
    if (window.location.hash !== `#/${v}`) history.replaceState(null, '', `#/${v}`);
    set(sel ? { view: v, selected: sel } : { view: v });
    document.querySelector('.main-scroll')?.scrollTo({ top: 0 });
  },
  select: (c) => set({ selected: c }),
  act: (text, mutate, opts) => {
    const before = pickData(get());
    const patch = mutate(before);
    const entry: LogEntry = { id: `a${Date.now()}${Math.random()}`, at: nowMs(), who: 'You', text: opts?.log ?? text, kind: 'me' };
    set({
      ...patch,
      log: [entry, ...(patch.log ?? before.log)],
      toast: { id: toastSeq++, text, undo: opts?.undoable ? before : undefined },
    });
  },
  undo: () => {
    const tst = get().toast;
    if (!tst?.undo) return;
    set({ ...tst.undo, toast: { id: toastSeq++, text: 'Undone' } });
  },
  dismissToast: () => set({ toast: null }),
}));

export const addHandoff = (d: Data, leaderId: string, n = 1) => ({ ...d.handoffs, [leaderId]: (d.handoffs[leaderId] ?? 0) + n });

export const leaderName = (id: string | null) => (id ? leaderById(id).name : '');
export { LEADERS };
