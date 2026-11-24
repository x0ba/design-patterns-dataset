import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { generateIndex } from './data/generate.ts';
import type { Entry } from './data/types.ts';
import { analyse, type Analysis, type SplitPlan } from './lib/analysis.ts';
import { buildWorking, type Decision, type Levers, type Working } from './lib/apply.ts';
import { BOOK } from './data/book.ts';
import { formatRange } from './lib/locators.ts';

export type View = 'structure' | 'strings' | 'xrefs' | 'names' | 'budget' | 'entries' | 'reread';

export interface RereadItem {
  key: string;
  start: number;
  end: number;
  note: string;
}

export interface UIState {
  view: View;
  chapter: number;
  page: number | null;
  stringId: number | null;
  stringSort: 'count' | 'cost' | 'alpha';
  stringFilter: 'open' | 'all' | 'done';
  clusterId: string | null;
  xrefId: string | null;
  xrefFilter: 'problems' | 'all';
  entryId: number | null;
  entryQuery: string;
  entryType: 'all' | Entry['type'];
}

export interface Store {
  decisions: Decision[];
  levers: Levers;
  drafts: Record<number, SplitPlan>;
  reread: RereadItem[];
  ui: UIState;
  toast: { text: string; n: number } | null;
}

export type Action =
  | { type: 'ui'; patch: Partial<UIState> }
  | { type: 'decide'; decision: Decision; toast?: string }
  | { type: 'undo'; key: string }
  | { type: 'lever'; lever: keyof Levers; on: boolean }
  | { type: 'draft'; entryId: number; plan: SplitPlan | null }
  | { type: 'reread-add'; item: RereadItem }
  | { type: 'reread-remove'; key: string }
  | { type: 'reread-note'; key: string; note: string }
  | { type: 'go'; view: View; patch?: Partial<UIState> };

function reducer(s: Store, a: Action): Store {
  switch (a.type) {
    case 'ui':
      return { ...s, ui: { ...s.ui, ...a.patch } };
    case 'go':
      return { ...s, ui: { ...s.ui, ...a.patch, view: a.view } };
    case 'decide': {
      const rest = s.decisions.filter((d) => d.key !== a.decision.key);
      return { ...s, decisions: [...rest, a.decision], toast: a.toast ? { text: a.toast, n: (s.toast?.n ?? 0) + 1 } : s.toast };
    }
    case 'undo':
      return { ...s, decisions: s.decisions.filter((d) => d.key !== a.key) };
    case 'lever':
      return { ...s, levers: { ...s.levers, [a.lever]: a.on } };
    case 'draft': {
      const drafts = { ...s.drafts };
      if (a.plan) drafts[a.entryId] = a.plan;
      else delete drafts[a.entryId];
      return { ...s, drafts };
    }
    case 'reread-add':
      if (s.reread.some((r) => r.key === a.item.key)) return s;
      return { ...s, reread: [...s.reread, a.item].sort((x, y) => x.start - y.start), toast: { text: `Added ${a.item.end > a.item.start ? 'pp. ' + formatRange(a.item.start, a.item.end) : 'p. ' + a.item.start} to re-read list`, n: (s.toast?.n ?? 0) + 1 } };
    case 'reread-remove':
      return { ...s, reread: s.reread.filter((r) => r.key !== a.key) };
    case 'reread-note':
      return { ...s, reread: s.reread.map((r) => (r.key === a.key ? { ...r, note: a.note } : r)) };
  }
}

interface Ctx {
  base: Entry[];
  an: Analysis;
  s: Store;
  dispatch: (a: Action) => void;
  working: Working;
  projectedLines: number;
  baselineLines: number;
  limitLines: number;
  decided: (key: string) => Decision | undefined;
}

const C = createContext<Ctx | null>(null);

const BASE = generateIndex().entries;
const AN = analyse(BASE);

export function labelOf(d: Decision, base: Map<number, Entry>): { label: string; detail: string } {
  const h = (id: number) => base.get(id)?.heading ?? '?';
  switch (d.kind) {
    case 'split': {
      const n = d.plan.groups.filter((g) => g.locs.length).length;
      return { label: `Split “${h(d.entryId)}”`, detail: `${n} new subentr${n === 1 ? 'y' : 'ies'}, ${d.plan.general.length} locator${d.plan.general.length === 1 ? '' : 's'} left on the main heading` };
    }
    case 'keep':
      return { label: `Kept “${h(d.entryId)}” as is`, detail: 'Reviewed; run left undifferentiated' };
    case 'merge':
      return {
        label: `Merged ${d.mergeIds.map((m) => `“${h(m)}”`).join(', ')} into “${h(d.keepId)}”`,
        detail: d.leaveSee ? 'Old form kept as a See reference' : 'Old form removed; references repointed',
      };
    case 'dismissName':
      return { label: 'Name forms kept separate', detail: 'Marked as different people or places' };
    case 'xref': {
      const [fromId, kind, target] = d.refId.split('|');
      const src = `“${h(Number(fromId))}. ${kind === 'see' ? 'See' : 'See also'} ${target}”`;
      return d.action === 'remove' ? { label: `Removed ${src}`, detail: 'Reference deleted' } : { label: `Repointed ${src}`, detail: `Now points to “${d.target}”` };
    }
    case 'loop':
      return { label: 'Resolved See loop: sperm whaling', detail: `Locators under “${d.keepHeading}”; “${d.otherHeading}” now a See reference` };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, () => ({
    decisions: [],
    levers: { citeNotes: false, crewNames: false },
    drafts: {},
    reread: [],
    toast: null,
    ui: {
      view: 'structure',
      chapter: 9,
      page: null,
      stringId: AN.long[0].id,
      stringSort: 'count',
      stringFilter: 'open',
      clusterId: AN.clusters[0]?.id ?? null,
      xrefId: null,
      xrefFilter: 'problems',
      entryId: null,
      entryQuery: '',
      entryType: 'all',
    },
  }) as Store);

  const working = useMemo(() => buildWorking(BASE, s.decisions, s.levers, labelOf), [s.decisions, s.levers]);
  const baselineLines = Math.round(BOOK.baselinePages * BOOK.linesPerPage);
  const value: Ctx = {
    base: BASE,
    an: AN,
    s,
    dispatch,
    working,
    baselineLines,
    projectedLines: baselineLines + working.delta,
    limitLines: BOOK.limitPages * BOOK.linesPerPage,
    decided: (key) => s.decisions.find((d) => d.key === key),
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('no store');
  return c;
}

export const pages = (lines: number) => lines / BOOK.linesPerPage;
export const fmtPages = (lines: number) => (Math.round(pages(lines) * 10) / 10).toFixed(1);
export const fmtDelta = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');
