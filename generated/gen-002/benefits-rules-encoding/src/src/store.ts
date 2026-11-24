import { useEffect, useReducer } from 'react';
import { analyze, hashNodes, runCase, type RuleNode } from './engine/model';
import type { Value } from './engine/expr';
import { SPEC } from './data/spec';
import { INITIAL_NODES } from './data/nodes';
import { TEST_CASES } from './data/households';
import { INITIAL_NOTES, KWAME, REVISIONS, type Note, type RevisionMeta } from './data/history';

export interface CaseResult {
  eligible: boolean;
  benefit: number;
  reason: string;
  pass: boolean;
  values: Record<string, Value>;
  errors: Record<string, string>;
}

export interface LastRun {
  at: string;
  hash: string;
  runs: Record<string, CaseResult>;
}

export interface RevisionRec extends RevisionMeta {
  /** Full rule-model snapshot. Kept for the latest saved revision (and the r27 base). */
  snapshot?: RuleNode[];
}

export interface AppData {
  nodes: RuleNode[];
  revisions: RevisionRec[];
  notes: Note[];
  lastRun: LastRun;
}

export type Action =
  | { type: 'node/update'; id: string; patch: Partial<Pick<RuleNode, 'label' | 'expr' | 'cites' | 'tags'>> }
  | { type: 'node/add'; node: RuleNode }
  | { type: 'node/remove'; id: string }
  | { type: 'tests/run'; at: string }
  | { type: 'revision/save'; message: string; at: string }
  | { type: 'draft/discard' }
  | { type: 'note/toggle'; id: string }
  | { type: 'note/reply'; id: string; text: string; at: string }
  | { type: 'demo/reset' };

export const STORAGE_KEY = 'statute-loom:v1';
/** Mock timestamp of the morning run that produced the starting results. */
export const STARTING_RUN_AT = '2026-11-16 08:52';

export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function runTests(nodes: RuleNode[]): Record<string, CaseResult> {
  const analysis = analyze(nodes, SPEC);
  const runs: Record<string, CaseResult> = {};
  for (const c of TEST_CASES) {
    const run = runCase(nodes, analysis, SPEC, c.facts, c.hhSize);
    const eligible = run.values['eligible'] === true;
    const benefit = Number(run.values['benefit_final'] ?? 0);
    const pass = eligible === c.expected.eligible && Math.abs(benefit - c.expected.benefit) < 0.5;
    runs[c.id] = {
      eligible,
      benefit,
      reason: String(run.values['reason_code'] ?? 'ERROR'),
      pass,
      values: run.values,
      errors: run.errors,
    };
  }
  return runs;
}

export function makeRun(nodes: RuleNode[], at: string): LastRun {
  return { at, hash: hashNodes(nodes), runs: runTests(nodes) };
}

export function initialData(): AppData {
  const nodes = clone(INITIAL_NODES);
  const revisions: RevisionRec[] = REVISIONS.map((r) => ({
    ...r,
    snapshot: r.n === 27 ? clone(INITIAL_NODES) : undefined,
  }));
  return {
    nodes,
    revisions,
    notes: clone(INITIAL_NOTES),
    lastRun: makeRun(nodes, STARTING_RUN_AT),
  };
}

export function latestSnapshot(revisions: RevisionRec[]): RuleNode[] {
  for (let i = revisions.length - 1; i >= 0; i--) {
    const s = revisions[i].snapshot;
    if (s) return s;
  }
  return INITIAL_NODES;
}

export function stamp(d = new Date()): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'node/update':
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === action.id ? { ...n, ...action.patch } : n)),
      };
    case 'node/add': {
      const idx = lastIndexInSection(state.nodes, action.node.section);
      const nodes = [...state.nodes];
      nodes.splice(idx + 1, 0, action.node);
      return { ...state, nodes };
    }
    case 'node/remove':
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== action.id),
        notes: state.notes.filter((x) => x.nodeId !== action.id),
      };
    case 'tests/run':
      return { ...state, lastRun: makeRun(state.nodes, action.at) };
    case 'revision/save': {
      const n = state.revisions.length + 1;
      const base = latestSnapshot(state.revisions);
      const changed = countChanged(base, state.nodes);
      const rev: RevisionRec = {
        n,
        savedAt: action.at,
        author: KWAME,
        message: action.message,
        stepsChanged: changed,
        snapshot: clone(state.nodes),
      };
      // Only the latest saved revision keeps a full snapshot (the compare base).
      const revisions = state.revisions.map((r) => (r.snapshot ? { ...r, snapshot: undefined } : r));
      return { ...state, revisions: [...revisions, rev] };
    }
    case 'draft/discard':
      return { ...state, nodes: clone(latestSnapshot(state.revisions)) };
    case 'note/toggle':
      return {
        ...state,
        notes: state.notes.map((x) =>
          x.id === action.id ? { ...x, status: x.status === 'open' ? 'resolved' : 'open' } : x,
        ),
      };
    case 'note/reply':
      return {
        ...state,
        notes: state.notes.map((x) =>
          x.id === action.id
            ? { ...x, thread: [...x.thread, { author: KWAME, at: action.at, text: action.text }] }
            : x,
        ),
      };
    case 'demo/reset':
      return initialData();
  }
}

function lastIndexInSection(nodes: RuleNode[], section: string): number {
  let idx = -1;
  nodes.forEach((n, i) => {
    if (n.section === section) idx = i;
  });
  return idx < 0 ? nodes.length - 1 : idx;
}

export function countChanged(base: RuleNode[], next: RuleNode[]): number {
  const b = new Map(base.map((n) => [n.id, JSON.stringify(n)]));
  const nIds = new Set(next.map((n) => n.id));
  let c = 0;
  for (const n of next) if (b.get(n.id) !== JSON.stringify(n)) c++;
  for (const id of b.keys()) if (!nIds.has(id)) c++;
  return c;
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.revisions) && parsed.lastRun) return parsed;
    }
  } catch {
    // Unreadable saved copy: fall back to the demo starting state.
  }
  return initialData();
}

export function useAppData() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the session still works, it just won't persist.
    }
  }, [state]);
  return [state, dispatch] as const;
}
