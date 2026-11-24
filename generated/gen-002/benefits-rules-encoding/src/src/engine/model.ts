import { ExprError, evaluate, identifiers, parse, typeOf, type Expr, type Value, type VType } from './expr';

export type SectionId =
  | 'nonfin'
  | 'resources'
  | 'income'
  | 'deductions'
  | 'benefit'
  | 'verification'
  | 'study'
  | 'outcomes';

export type Kind = 'condition' | 'calculation' | 'outcome';

export interface RuleNode {
  id: string;
  label: string;
  kind: Kind;
  section: SectionId;
  /** Source expression. Connections are derived from the names it reads. */
  expr: string;
  /** Citation ids from the registry. */
  cites: string[];
  /** Tags such as 'income-standard' (steps the 2025 amendment reaches). */
  tags: string[];
}

export interface Citation {
  id: string;
  cite: string;
  title: string;
  status: 'in-force' | 'amended-2025' | 'internal';
  /** Demo summary. Not verbatim statutory text. */
  summary: string;
}

export interface FactDef {
  name: string;
  label: string;
  type: 'number' | 'boolean';
  unit?: string;
}

export interface ParamDef {
  name: string;
  label: string;
  unit: string;
  /** Tabled by household size (1..8, with an increment per person above 8) or a single value. */
  table?: { values: number[]; addl: number };
  value?: number;
}

export interface SectionDef {
  id: SectionId;
  label: string;
  blurb: string;
}

export interface ModelSpec {
  facts: FactDef[];
  params: ParamDef[];
  citations: Citation[];
}

export interface Analysis {
  /** Node-level problems, keyed by node id. */
  issues: Record<string, string[]>;
  /** Model-level problems (duplicate ids, cycles). */
  global: string[];
  /** Non-blocking warnings, keyed by node id. */
  warnings: Record<string, string[]>;
  types: Record<string, VType>;
  /** Derived connections: which steps each step reads. */
  deps: Record<string, string[]>;
  asts: Record<string, Expr | undefined>;
  /** Topological order (dependencies first). Nodes in cycles are appended last. */
  order: string[];
  edgeCount: number;
  ok: boolean;
}

export const RESERVED = new Set(['true', 'false']);
export const ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export function paramValue(def: ParamDef, hhSize: number): number {
  if (def.table) {
    const n = Math.max(1, Math.floor(hhSize));
    if (n <= 8) return def.table.values[n - 1];
    return def.table.values[7] + (n - 8) * def.table.addl;
  }
  return def.value ?? 0;
}

export function analyze(nodes: RuleNode[], spec: ModelSpec): Analysis {
  const issues: Record<string, string[]> = {};
  const global: string[] = [];
  const push = (id: string, msg: string) => {
    (issues[id] ??= []).push(msg);
  };

  const ids = new Set<string>();
  for (const n of nodes) {
    if (ids.has(n.id)) global.push(`Duplicate step id "${n.id}"`);
    ids.add(n.id);
  }
  const factMap = new Map(spec.facts.map((f) => [f.name, f]));
  const paramMap = new Map(spec.params.map((p) => [p.name, p]));
  const citeIds = new Set(spec.citations.map((c) => c.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const asts: Record<string, Expr | undefined> = {};
  const rawIds: Record<string, Set<string>> = {};
  for (const n of nodes) {
    try {
      const ast = parse(n.expr);
      asts[n.id] = ast;
      rawIds[n.id] = identifiers(ast);
    } catch (e) {
      asts[n.id] = undefined;
      rawIds[n.id] = new Set();
      push(n.id, e instanceof ExprError ? e.message : 'Expression does not parse');
    }
    for (const name of rawIds[n.id]) {
      if (!ids.has(name) && !factMap.has(name) && !paramMap.has(name)) {
        push(n.id, `Unknown name "${name}"`);
      }
    }
    if (n.cites.length === 0) push(n.id, 'Attach at least one citation');
    for (const c of n.cites) {
      if (!citeIds.has(c)) push(n.id, `Citation "${c}" is not in the registry`);
    }
  }

  const deps: Record<string, string[]> = {};
  for (const n of nodes) {
    deps[n.id] = [...(rawIds[n.id] ?? [])].filter((name) => ids.has(name) && name !== n.id);
    if (rawIds[n.id]?.has(n.id)) push(n.id, 'Step reads its own result');
  }

  // Cycle detection and topological order (Kahn, stable by array order).
  const indeg: Record<string, number> = {};
  const outs: Record<string, string[]> = {};
  for (const n of nodes) {
    indeg[n.id] = deps[n.id].length;
    for (const d of deps[n.id]) (outs[d] ??= []).push(n.id);
  }
  const queue = nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const o of outs[id] ?? []) {
      indeg[o]--;
      if (indeg[o] === 0) queue.push(o);
    }
  }
  if (order.length < nodes.length) {
    const inCycle = nodes.filter((n) => !order.includes(n.id)).map((n) => n.id);
    global.push(`Circular dependency among: ${inCycle.join(', ')}`);
    for (const id of inCycle) {
      push(id, 'Part of a circular dependency');
      order.push(id);
    }
  }

  // Type inference, memoised; a node's type is the type of its expression.
  const types: Record<string, VType> = {};
  const visiting = new Set<string>();
  const typeOfName = (name: string): VType => {
    const f = factMap.get(name);
    if (f) return f.type;
    if (paramMap.has(name)) return 'number';
    const node = byId.get(name);
    if (!node) throw new ExprError(`Unknown name "${name}"`);
    return inferNode(node.id);
  };
  const inferNode = (id: string): VType => {
    if (types[id]) return types[id];
    const ast = asts[id];
    if (!ast) throw new ExprError('unparsed');
    if (visiting.has(id)) throw new ExprError('circular');
    visiting.add(id);
    const t = typeOf(ast, typeOfName);
    visiting.delete(id);
    types[id] = t;
    return t;
  };

  for (const n of nodes) {
    if (!asts[n.id]) continue;
    if (issues[n.id]?.some((m) => m.startsWith('Unknown name') || m.includes('circular'))) continue;
    try {
      const t = inferNode(n.id);
      if (n.kind === 'condition' && t !== 'boolean') push(n.id, `A condition must be true or false, but this reads as a ${t}`);
      if (n.kind === 'calculation' && t !== 'number') push(n.id, `A calculation must give a number, but this gives a ${t}`);
    } catch (e) {
      push(n.id, e instanceof ExprError ? e.message : 'Type check failed');
    }
  }

  // Warnings do not block saving: a step that nothing reads does nothing until it is wired in.
  const readers: Record<string, number> = {};
  for (const n of nodes) for (const d of deps[n.id]) readers[d] = (readers[d] ?? 0) + 1;
  const warnings: Record<string, string[]> = {};
  for (const n of nodes) {
    if (n.kind !== 'outcome' && !readers[n.id]) {
      warnings[n.id] = ['No step reads this one yet, so it has no effect on any outcome.'];
    }
  }

  const edgeCount = Object.values(deps).reduce((s, d) => s + d.length, 0);
  const ok = global.length === 0 && Object.values(issues).every((x) => x.length === 0);
  return { issues, global, warnings, types, deps, asts, order, edgeCount, ok };
}

export interface CaseRun {
  values: Record<string, Value>;
  /** Step-level runtime problems (e.g. division by zero). */
  errors: Record<string, string>;
}

/** Evaluate every step for one household's facts, in dependency order. */
export function runCase(
  nodes: RuleNode[],
  analysis: Analysis,
  spec: ModelSpec,
  facts: Record<string, Value>,
  hhSize: number,
): CaseRun {
  const values: Record<string, Value> = {};
  const errors: Record<string, string> = {};
  const paramMap = new Map(spec.params.map((p) => [p.name, p]));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const env = (name: string): Value => {
    if (name in values) return values[name];
    if (name in facts) return facts[name];
    const p = paramMap.get(name);
    if (p) return paramValue(p, hhSize);
    throw new ExprError(`No value for "${name}"`);
  };
  for (const id of analysis.order) {
    const n = byId.get(id)!;
    const ast = analysis.asts[id];
    if (!ast || analysis.issues[id]?.length) continue;
    try {
      values[id] = evaluate(ast, env);
    } catch (e) {
      errors[id] = e instanceof Error ? e.message : String(e);
      values[n.id] = Number.NaN;
    }
  }
  return { values, errors };
}

/** Longest dependency path ending at each step (0 = reads only facts or parameters). */
export function depthOf(analysis: Analysis): Record<string, number> {
  const depth: Record<string, number> = {};
  for (const id of analysis.order) {
    const ds = analysis.deps[id] ?? [];
    depth[id] = ds.length ? 1 + Math.max(...ds.map((d) => depth[d] ?? 0)) : 0;
  }
  return depth;
}

export interface FieldChange {
  field: 'label' | 'kind' | 'section' | 'expr' | 'cites' | 'tags';
  before: string;
  after: string;
}

export interface NodeChange {
  id: string;
  change: 'added' | 'removed' | 'changed';
  fields: FieldChange[];
}

const FIELD_NAMES: FieldChange['field'][] = ['label', 'kind', 'section', 'expr', 'cites', 'tags'];

function fieldValue(n: RuleNode, f: FieldChange['field']): string {
  if (f === 'cites') return n.cites.join(', ');
  if (f === 'tags') return n.tags.join(', ');
  return String(n[f]);
}

export function diffNodes(base: RuleNode[], next: RuleNode[]): NodeChange[] {
  const out: NodeChange[] = [];
  const bMap = new Map(base.map((n) => [n.id, n]));
  const nMap = new Map(next.map((n) => [n.id, n]));
  for (const n of next) {
    const b = bMap.get(n.id);
    if (!b) {
      out.push({ id: n.id, change: 'added', fields: [] });
      continue;
    }
    const fields = FIELD_NAMES.filter((f) => fieldValue(b, f) !== fieldValue(n, f)).map((f) => ({
      field: f,
      before: fieldValue(b, f),
      after: fieldValue(n, f),
    }));
    if (fields.length) out.push({ id: n.id, change: 'changed', fields });
  }
  for (const b of base) if (!nMap.has(b.id)) out.push({ id: b.id, change: 'removed', fields: [] });
  return out;
}

export function hashNodes(nodes: RuleNode[]): string {
  return JSON.stringify(nodes);
}
