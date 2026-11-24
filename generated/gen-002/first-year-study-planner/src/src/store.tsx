import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Block, CourseId, Item, Series, SyllabusState, SyllabusStep } from './data';
import { INITIAL_BLOCKS, INITIAL_ITEMS, INITIAL_SYLLABI } from './data';
import { INITIAL_DRAFTS, type Draft } from './logic';

export type View = { name: 'checklist' } | { name: 'course'; courseId: CourseId } | { name: 'week'; week: number };

export interface State {
  view: View;
  items: Item[];
  series: Series[];
  syllabi: Record<CourseId, SyllabusState>;
  blocks: Block[];
  drafts: Record<CourseId, Draft>;
  examAutoRemind: boolean;
  plannedWeeks: number[];
  shared: null | { includeWork: boolean; at: string };
  rail: 'checklist' | 'help';
  railOpen: boolean;
  helpArticle: string | null;
  helpQuery: string;
  tourStep: number | null; // 1-based step being shown
  tourResumeAt: number; // 3 = skipped at step 3; 7 = finished
  savedAt: number;
  modal: null | 'share' | 'coaching';
}

export const INITIAL: State = {
  view: { name: 'course', courseId: 'psy101' },
  items: INITIAL_ITEMS,
  series: [],
  syllabi: INITIAL_SYLLABI,
  blocks: INITIAL_BLOCKS,
  drafts: INITIAL_DRAFTS(),
  examAutoRemind: false,
  plannedWeeks: [],
  shared: null,
  rail: 'checklist',
  railOpen: true,
  helpArticle: null,
  helpQuery: '',
  tourStep: null,
  tourResumeAt: 3,
  savedAt: 0,
  modal: null,
};

type Snapshot = Pick<State, 'items' | 'series' | 'blocks' | 'syllabi' | 'examAutoRemind' | 'plannedWeeks' | 'shared'>;

export type Action =
  | { type: 'nav'; view: View }
  | { type: 'draft'; courseId: CourseId; patch: Partial<Draft> }
  | { type: 'resetDraft'; courseId: CourseId; draft: Draft }
  | { type: 'addItems'; items: Item[]; series?: Series }
  | { type: 'removeItem'; id: string }
  | { type: 'removeSeries'; id: string }
  | { type: 'toggleRemind'; id: string }
  | { type: 'remindAllExams' }
  | { type: 'syllabus'; courseId: CourseId; patch: Partial<SyllabusState> }
  | { type: 'syllabusStep'; courseId: CourseId; step: SyllabusStep }
  | { type: 'addBlock'; block: Block }
  | { type: 'removeBlock'; id: string }
  | { type: 'planWeek'; week: number; planned: boolean }
  | { type: 'share'; includeWork: boolean }
  | { type: 'unshare' }
  | { type: 'rail'; tab: State['rail']; open?: boolean }
  | { type: 'railOpen'; open: boolean }
  | { type: 'help'; article: string | null; query?: string }
  | { type: 'helpQuery'; query: string }
  | { type: 'tour'; step: number | null; resumeAt?: number }
  | { type: 'restore'; snap: Snapshot }
  | { type: 'modal'; modal: State['modal'] }
  | { type: 'reset' };

const PERSIST_KEYS: (keyof State)[] = ['items', 'series', 'syllabi', 'blocks', 'drafts', 'examAutoRemind', 'plannedWeeks', 'shared', 'tourResumeAt', 'view'];

function touch(s: State): State {
  return { ...s, savedAt: Date.now() };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'nav':
      return { ...s, view: a.view };
    case 'draft':
      return touch({ ...s, drafts: { ...s.drafts, [a.courseId]: { ...s.drafts[a.courseId], ...a.patch } } });
    case 'resetDraft':
      return touch({ ...s, drafts: { ...s.drafts, [a.courseId]: a.draft } });
    case 'addItems': {
      const items = a.items.map((it) => (it.type === 'exam' && s.examAutoRemind ? { ...it, remind: true } : it));
      return touch({ ...s, items: [...s.items, ...items], series: a.series ? [...s.series, a.series] : s.series });
    }
    case 'removeItem':
      return touch({ ...s, items: s.items.filter((i) => i.id !== a.id), blocks: s.blocks.filter((b) => b.forItemId !== a.id) });
    case 'removeSeries': {
      const ids = new Set(s.items.filter((i) => i.seriesId === a.id).map((i) => i.id));
      return touch({
        ...s,
        items: s.items.filter((i) => i.seriesId !== a.id),
        series: s.series.filter((x) => x.id !== a.id),
        blocks: s.blocks.filter((b) => !b.forItemId || !ids.has(b.forItemId)),
      });
    }
    case 'toggleRemind': {
      const items = s.items.map((i) => (i.id === a.id ? { ...i, remind: !i.remind } : i));
      const exams = items.filter((i) => i.type === 'exam');
      return touch({ ...s, items, examAutoRemind: s.examAutoRemind && exams.every((e) => e.remind) });
    }
    case 'remindAllExams':
      return touch({ ...s, examAutoRemind: true, items: s.items.map((i) => (i.type === 'exam' ? { ...i, remind: true } : i)) });
    case 'syllabus':
      return touch({ ...s, syllabi: { ...s.syllabi, [a.courseId]: { ...s.syllabi[a.courseId], ...a.patch } } });
    case 'syllabusStep': {
      const cur = s.syllabi[a.courseId];
      return touch({
        ...s,
        syllabi: { ...s.syllabi, [a.courseId]: { ...cur, step: a.step, status: cur.status === 'not-started' ? 'in-progress' : cur.status } },
      });
    }
    case 'addBlock':
      return touch({ ...s, blocks: [...s.blocks, a.block] });
    case 'removeBlock':
      return touch({ ...s, blocks: s.blocks.filter((b) => b.id !== a.id) });
    case 'planWeek':
      return touch({
        ...s,
        plannedWeeks: a.planned ? [...new Set([...s.plannedWeeks, a.week])] : s.plannedWeeks.filter((w) => w !== a.week),
      });
    case 'share':
      return touch({ ...s, shared: { includeWork: a.includeWork, at: new Date().toISOString() } });
    case 'unshare':
      return touch({ ...s, shared: null });
    case 'rail':
      return { ...s, rail: a.tab, railOpen: a.open ?? true };
    case 'railOpen':
      return { ...s, railOpen: a.open };
    case 'help':
      return { ...s, rail: 'help', railOpen: true, helpArticle: a.article, helpQuery: a.query ?? s.helpQuery };
    case 'helpQuery':
      return { ...s, helpQuery: a.query, helpArticle: null };
    case 'tour':
      return { ...s, tourStep: a.step, tourResumeAt: a.resumeAt ?? s.tourResumeAt };
    case 'restore':
      return touch({ ...s, ...a.snap });
    case 'modal':
      return { ...s, modal: a.modal };
    case 'reset':
      return { ...INITIAL, drafts: INITIAL_DRAFTS() };
  }
}

const STORAGE_KEY = 'firstweek-planner-v3';

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const saved = JSON.parse(raw);
    return { ...INITIAL, ...saved };
  } catch {
    return INITIAL;
  }
}

// ── Toasts ────────────────────────────────────────────────────
export interface Toast {
  id: number;
  text: string;
  undo?: Snapshot;
  tone?: 'ok' | 'info';
}

interface Ctx {
  s: State;
  d: React.Dispatch<Action>;
  toast: (text: string, opts?: { undoable?: boolean; tone?: Toast['tone'] }) => void;
  snapshot: () => Snapshot;
  toasts: Toast[];
  dismiss: (id: number) => void;
  highlight: string | null;
  flash: (key: string) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, undefined, load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const hlTimer = useRef<number | undefined>(undefined);
  const stateRef = useRef(s);
  stateRef.current = s;

  useEffect(() => {
    const out: Record<string, unknown> = {};
    for (const k of PERSIST_KEYS) out[k] = s[k];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  }, [s]);

  const snapshot = (): Snapshot => {
    const c = stateRef.current;
    return { items: c.items, series: c.series, blocks: c.blocks, syllabi: c.syllabi, examAutoRemind: c.examAutoRemind, plannedWeeks: c.plannedWeeks, shared: c.shared };
  };

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const toast: Ctx['toast'] = (text, opts) => {
    const id = Date.now() + Math.random();
    const t: Toast = { id, text, tone: opts?.tone ?? 'ok', undo: opts?.undoable ? lastSnap.current : undefined };
    // Only the newest toast can undo; older snapshots would roll back later changes too.
    setToasts((all) => [...all.slice(-2).map((x) => (t.undo ? { ...x, undo: undefined } : x)), t]);
    window.setTimeout(() => dismiss(id), opts?.undoable ? 8000 : 4500);
  };

  // A snapshot taken just before the mutating action, used for undo.
  const lastSnap = useRef<Snapshot>(snapshot());
  const dispatch: React.Dispatch<Action> = (a) => {
    lastSnap.current = snapshot();
    d(a);
  };

  const flash = (key: string) => {
    setHighlight(key);
    window.clearTimeout(hlTimer.current);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-guide="${key}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    hlTimer.current = window.setTimeout(() => setHighlight(null), 3200);
  };

  return (
    <StoreCtx.Provider value={{ s, d: dispatch, toast, snapshot, toasts, dismiss, highlight, flash }}>{children}</StoreCtx.Provider>
  );
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('no store');
  return c;
}

export function useHL() {
  const { highlight } = useStore();
  return (key: string) => (highlight === key ? ' guide-hl' : '');
}

let idc = 0;
export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${(idc++).toString(36)}`;
