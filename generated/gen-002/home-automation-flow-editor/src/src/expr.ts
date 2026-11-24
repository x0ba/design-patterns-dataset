// Housewire expression language: a tiny, typed, side-effect-free language
// for conditions and time windows. Tokenizer → Pratt parser → evaluator.

import { HOLIDAYS, SWIM } from './data';
import type { PersonId } from './types';
import { DAY_SHORT, fmtDate, fmtDur, fmtTime, weekdayOf, addDays } from './time';

// ---------------------------------------------------------------- tokens
export type TokType = 'num' | 'time' | 'dur' | 'ident' | 'kw' | 'str' | 'op' | 'punc' | 'ws' | 'comment' | 'err';
export interface Token { type: TokType; text: string; start: number; end: number }

const KEYWORDS = new Set(['and', 'or', 'not', 'in', 'true', 'false']);

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const push = (type: TokType, start: number, end: number) => out.push({ type, text: src.slice(start, end), start, end });
  while (i < src.length) {
    const c = src[i];
    const s = i;
    if (/\s/.test(c)) {
      while (i < src.length && /\s/.test(src[i])) i++;
      push('ws', s, i);
    } else if (c === '#') {
      while (i < src.length && src[i] !== '\n') i++;
      push('comment', s, i);
    } else if (/[0-9]/.test(c)) {
      while (i < src.length && /[0-9]/.test(src[i])) i++;
      if (src[i] === ':' && /[0-9]/.test(src[i + 1] ?? '')) {
        i++;
        while (i < src.length && /[0-9]/.test(src[i])) i++;
        push('time', s, i);
      } else if (/[dhm]/.test(src[i] ?? '') && !/[a-z_0-9]/i.test(src[i + 1] ?? '')) {
        i++;
        push('dur', s, i);
      } else if (/[dhm]/.test(src[i] ?? '') && /[0-9]/.test(src[i + 1] ?? '')) {
        // compound duration like 1h30m
        while (i < src.length && /[0-9dhm]/.test(src[i])) i++;
        push('dur', s, i);
      } else {
        if (src[i] === '.' && /[0-9]/.test(src[i + 1] ?? '')) {
          i++;
          while (i < src.length && /[0-9]/.test(src[i])) i++;
        }
        push('num', s, i);
      }
    } else if (/[A-Za-z_]/.test(c)) {
      while (i < src.length && /[A-Za-z_0-9]/.test(src[i])) i++;
      const word = src.slice(s, i);
      push(KEYWORDS.has(word) ? 'kw' : 'ident', s, i);
    } else if (c === '"' || c === "'") {
      i++;
      while (i < src.length && src[i] !== c) i++;
      if (i < src.length) i++;
      push('str', s, i);
    } else {
      const two = src.slice(i, i + 2);
      if (['==', '!=', '<=', '>=', '..', '&&', '||'].includes(two)) {
        i += 2;
        push('op', s, i);
      } else if ('<>+-!='.includes(c)) {
        i++;
        push('op', s, i);
      } else if ('()[],.'.includes(c)) {
        i++;
        push('punc', s, i);
      } else {
        i++;
        push('err', s, i);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- AST
export type Node =
  | { k: 'lit'; tok: Token; start: number; end: number }
  | { k: 'id'; name: string; start: number; end: number }
  | { k: 'list'; items: Node[]; start: number; end: number }
  | { k: 'un'; op: 'not' | '-'; e: Node; start: number; end: number }
  | { k: 'bin'; op: string; l: Node; r: Node; start: number; end: number }
  | { k: 'member'; obj: Node; name: string; nameStart: number; start: number; end: number }
  | { k: 'call'; fn: Node; args: Node[]; start: number; end: number };

export class ExprError extends Error {
  start: number;
  end: number;
  constructor(message: string, start: number, end: number) {
    super(message);
    this.start = start;
    this.end = end;
  }
}

const INFIX_BP: Record<string, number> = {
  or: 1, '||': 1,
  and: 2, '&&': 2,
  '==': 4, '!=': 4, '<': 4, '<=': 4, '>': 4, '>=': 4, in: 4, 'not in': 4,
  '..': 5,
  '+': 6, '-': 6,
};

export function parse(src: string): Node {
  const toks = tokenize(src).filter((t) => t.type !== 'ws' && t.type !== 'comment');
  let p = 0;
  const end = src.length;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const describe = (t: Token | undefined) => (t ? `'${t.text}'` : 'end of expression');

  const bad = toks.find((t) => t.type === 'err');
  if (bad) throw new ExprError(`Unexpected character '${bad.text}'`, bad.start, bad.end);
  const unterminated = toks.find((t) => t.type === 'str' && (t.text.length < 2 || t.text[0] !== t.text[t.text.length - 1]));
  if (unterminated) throw new ExprError('Unterminated string', unterminated.start, unterminated.end);
  if (toks.length === 0) throw new ExprError('Expression is empty', 0, Math.max(1, end));

  function expect(text: string, open?: Token): Token {
    const t = peek();
    if (!t || t.text !== text) {
      const at = t ?? { start: end, end: end + 1 };
      throw new ExprError(open ? `Expected '${text}' to close '${open.text}' (col ${open.start + 1})` : `Expected '${text}' but found ${describe(t)}`, at.start, at.end);
    }
    return next();
  }

  function prefix(): Node {
    const t = next();
    if (!t) throw new ExprError('Expression is incomplete — expected a value here', end, end + 1);
    if (t.type === 'kw' && t.text === 'not') {
      const e = expr(3);
      return { k: 'un', op: 'not', e, start: t.start, end: e.end };
    }
    if (t.type === 'op' && t.text === '!') {
      const e = expr(3);
      return { k: 'un', op: 'not', e, start: t.start, end: e.end };
    }
    if (t.type === 'op' && t.text === '-') {
      const e = expr(7);
      return { k: 'un', op: '-', e, start: t.start, end: e.end };
    }
    if (t.text === '(') {
      const e = expr(0);
      const close = expect(')', t);
      return { ...e, start: t.start, end: close.end } as Node;
    }
    if (t.text === '[') {
      const items: Node[] = [];
      if (peek()?.text !== ']') {
        for (;;) {
          items.push(expr(0));
          if (peek()?.text === ',') { next(); continue; }
          break;
        }
      }
      const close = expect(']', t);
      return { k: 'list', items, start: t.start, end: close.end };
    }
    if (t.type === 'num' || t.type === 'time' || t.type === 'dur' || t.type === 'str' || (t.type === 'kw' && (t.text === 'true' || t.text === 'false'))) {
      return { k: 'lit', tok: t, start: t.start, end: t.end };
    }
    if (t.type === 'ident') return { k: 'id', name: t.text, start: t.start, end: t.end };
    throw new ExprError(`Unexpected ${describe(t)} — expected a value`, t.start, t.end);
  }

  function expr(minBp: number): Node {
    let left = prefix();
    for (;;) {
      const t = peek();
      if (!t) break;
      // postfix: call & member
      if (t.text === '(') {
        next();
        const args: Node[] = [];
        if (peek()?.text !== ')') {
          for (;;) {
            args.push(expr(0));
            if (peek()?.text === ',') { next(); continue; }
            break;
          }
        }
        const close = expect(')', t);
        left = { k: 'call', fn: left, args, start: left.start, end: close.end };
        continue;
      }
      if (t.text === '.') {
        next();
        const name = next();
        if (!name || name.type !== 'ident') throw new ExprError(`Expected a field name after '.'`, name?.start ?? end, name?.end ?? end + 1);
        left = { k: 'member', obj: left, name: name.text, nameStart: name.start, start: left.start, end: name.end };
        continue;
      }
      let op = t.text;
      let width = 1;
      if (t.type === 'kw' && op === 'not' && toks[p + 1]?.text === 'in') { op = 'not in'; width = 2; }
      const bp = INFIX_BP[op];
      if (bp === undefined && t.type === 'punc') break; // ')', ']' or ',' end this sub-expression
      if (bp === undefined || t.type === 'ident') {
        throw new ExprError(`Unexpected ${describe(t)} — expected an operator like 'and', 'or', '<' or 'in'`, t.start, t.end);
      }
      if (bp <= minBp) break;
      p += width;
      const right = expr(bp);
      const norm = op === '&&' ? 'and' : op === '||' ? 'or' : op;
      left = { k: 'bin', op: norm, l: left, r: right, start: left.start, end: right.end };
    }
    return left;
  }

  const root = expr(0);
  if (p < toks.length) {
    const t = toks[p];
    throw new ExprError(`Unexpected ${describe(t)} after a complete expression`, t.start, t.end);
  }
  return root;
}

// ---------------------------------------------------------------- values
export type Val =
  | { t: 'bool'; v: boolean }
  | { t: 'num'; v: number }
  | { t: 'time'; v: number }
  | { t: 'dur'; v: number }
  | { t: 'day'; v: number }
  | { t: 'date'; v: string }
  | { t: 'str'; v: string }
  | { t: 'list'; v: Val[] }
  | { t: 'range'; lo: Val; hi: Val }
  | { t: 'obj'; name: string; fields: Record<string, () => Val> }
  | { t: 'fn'; name: string; min: number; max: number; call: (args: Val[], node: Node) => Val };

const TYPE_NAME: Record<Val['t'], string> = {
  bool: 'true/false', num: 'number', time: 'time of day', dur: 'duration', day: 'weekday', date: 'date', str: 'text', list: 'list', range: 'range', obj: 'object', fn: 'function',
};

export function show(v: Val): string {
  switch (v.t) {
    case 'bool': return String(v.v);
    case 'num': return String(v.v);
    case 'time': return fmtTime(v.v);
    case 'dur': return fmtDur(v.v);
    case 'day': return DAY_SHORT[v.v];
    case 'date': return fmtDate(v.v);
    case 'str': return JSON.stringify(v.v);
    case 'list': return `[${v.v.map(show).join(', ')}]`;
    case 'range': return `${show(v.lo)}..${show(v.hi)}`;
    case 'obj': return v.name;
    case 'fn': return `${v.name}()`;
  }
}

export interface EvalCtx {
  date: string;
  now: number;
  presence: Record<PersonId, boolean>;
}

const B = (v: boolean): Val => ({ t: 'bool', v });

function person(id: PersonId, label: string, ctx: EvalCtx): Val {
  const fields: Record<string, () => Val> = {
    home: () => B(ctx.presence[id]),
    away: () => B(!ctx.presence[id]),
    name: () => ({ t: 'str', v: label }),
  };
  if (id === SWIM.person) {
    fields.swim_days = () => ({ t: 'list', v: SWIM.days.map((d) => ({ t: 'day', v: d }) as Val) });
    fields.swim_starts = () => ({ t: 'time', v: SWIM.start });
    fields.swim_ends = () => ({ t: 'time', v: SWIM.end });
    fields.swim_today = () => B(SWIM.days.includes(weekdayOf(ctx.date)));
  }
  return { t: 'obj', name: id, fields };
}

export function environment(ctx: EvalCtx): Record<string, Val> {
  const env: Record<string, Val> = {
    weekday: { t: 'day', v: weekdayOf(ctx.date) },
    today: { t: 'date', v: ctx.date },
    now: { t: 'fn', name: 'now', min: 0, max: 0, call: () => ({ t: 'time', v: ctx.now }) },
    holiday: {
      t: 'fn', name: 'holiday', min: 0, max: 1,
      call: (args, node) => {
        const d = args[0] ?? { t: 'date', v: ctx.date };
        if (d.t !== 'date') throw new ExprError(`holiday() expects a date like 'today', got ${TYPE_NAME[d.t]}`, node.start, node.end);
        return B(HOLIDAYS.some((h) => h.date === d.v));
      },
    },
    home: {
      t: 'fn', name: 'home', min: 1, max: 1,
      call: (args, node) => {
        const o = args[0];
        if (o.t !== 'obj' || !o.fields.home) throw new ExprError(`home() expects a person like 'ada'`, node.start, node.end);
        return o.fields.home();
      },
    },
    ada: person('ada', 'Ada', ctx),
    tobi: person('tobi', 'Tobi', ctx),
    emeka: person('emeka', 'Emeka', ctx),
    ruth: person('ruth', 'Ruth', ctx),
  };
  DAY_SHORT.forEach((d, i) => (env[d] = { t: 'day', v: i }));
  return env;
}

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
function suggest(name: string, options: string[]): string {
  let best = '';
  let score = 3;
  for (const o of options) {
    const d = lev(name.toLowerCase(), o.toLowerCase());
    if (d < score) { score = d; best = o; }
  }
  return best ? ` Did you mean '${best}'?` : '';
}

function parseDur(text: string): number {
  let total = 0;
  const re = /(\d+)([dhm])/g;
  let m;
  while ((m = re.exec(text))) total += Number(m[1]) * (m[2] === 'd' ? 1440 : m[2] === 'h' ? 60 : 1);
  return total;
}

function sameType(a: Val, b: Val, node: Node, op: string) {
  if (a.t !== b.t) throw new ExprError(`Can't use '${op}' between a ${TYPE_NAME[a.t]} (${show(a)}) and a ${TYPE_NAME[b.t]} (${show(b)})`, node.start, node.end);
}

function eq(a: Val, b: Val): boolean {
  if (a.t !== b.t) return false;
  if (a.t === 'list' || a.t === 'range' || a.t === 'obj' || a.t === 'fn') return a === b;
  return (a as { v: unknown }).v === (b as { v: unknown }).v;
}

function expandList(items: Val[]): Val[] {
  const out: Val[] = [];
  for (const it of items) {
    if (it.t === 'range' && it.lo.t === 'day' && it.hi.t === 'day') {
      let d = it.lo.v;
      for (let guard = 0; guard < 7; guard++) {
        out.push({ t: 'day', v: d });
        if (d === it.hi.v) break;
        d = (d + 1) % 7;
      }
    } else out.push(it);
  }
  return out;
}

function within(x: Val, r: Val & { t: 'range' }, node: Node): boolean {
  sameType(x, r.lo, node, 'in');
  const lo = (r.lo as { v: number }).v;
  const hi = (r.hi as { v: number }).v;
  const v = (x as { v: number }).v;
  if (x.t === 'day') {
    return expandList([r]).some((d) => eq(d, x));
  }
  if (x.t === 'time' && lo > hi) return v >= lo || v <= hi; // window over midnight
  return v >= lo && v <= hi;
}

export function evaluate(node: Node, env: Record<string, Val>): Val {
  const ev = (n: Node) => evaluate(n, env);
  switch (node.k) {
    case 'lit': {
      const t = node.tok;
      if (t.type === 'num') return { t: 'num', v: Number(t.text) };
      if (t.type === 'time') {
        const [h, m] = t.text.split(':').map(Number);
        if (h > 23 || m > 59) throw new ExprError(`${t.text} isn't a valid time of day (use 00:00–23:59)`, t.start, t.end);
        return { t: 'time', v: h * 60 + m };
      }
      if (t.type === 'dur') return { t: 'dur', v: parseDur(t.text) };
      if (t.type === 'str') return { t: 'str', v: t.text.slice(1, -1) };
      return B(t.text === 'true');
    }
    case 'id': {
      const v = env[node.name];
      if (!v) throw new ExprError(`Unknown name '${node.name}'.${suggest(node.name, Object.keys(env))}`, node.start, node.end);
      return v;
    }
    case 'list': return { t: 'list', v: expandList(node.items.map(ev)) };
    case 'member': {
      const o = ev(node.obj);
      if (o.t !== 'obj') throw new ExprError(`A ${TYPE_NAME[o.t]} has no fields`, node.start, node.end);
      const f = o.fields[node.name];
      if (!f) throw new ExprError(`'${o.name}' has no field '${node.name}'.${suggest(node.name, Object.keys(o.fields))}`, node.nameStart, node.end);
      return f();
    }
    case 'call': {
      const f = ev(node.fn);
      if (f.t !== 'fn') throw new ExprError(`${show(f)} is a ${TYPE_NAME[f.t]}, not a function`, node.fn.start, node.fn.end);
      if (node.args.length < f.min || node.args.length > f.max) {
        const want = f.min === f.max ? `${f.min}` : `${f.min}–${f.max}`;
        throw new ExprError(`${f.name}() takes ${want} argument${f.max === 1 ? '' : 's'}, got ${node.args.length}`, node.start, node.end);
      }
      return f.call(node.args.map(ev), node);
    }
    case 'un': {
      const v = ev(node.e);
      if (node.op === 'not') {
        if (v.t !== 'bool') throw new ExprError(`'not' needs true/false, got a ${TYPE_NAME[v.t]}`, node.start, node.end);
        return B(!v.v);
      }
      if (v.t === 'num' || v.t === 'dur') return { ...v, v: -v.v };
      throw new ExprError(`Can't negate a ${TYPE_NAME[v.t]}`, node.start, node.end);
    }
    case 'bin': {
      const op = node.op;
      if (op === 'and' || op === 'or') {
        const l = ev(node.l);
        if (l.t !== 'bool') throw new ExprError(`'${op}' needs true/false on the left, got a ${TYPE_NAME[l.t]} (${show(l)})`, node.l.start, node.l.end);
        if (op === 'and' && !l.v) return B(false);
        if (op === 'or' && l.v) return B(true);
        const r = ev(node.r);
        if (r.t !== 'bool') throw new ExprError(`'${op}' needs true/false on the right, got a ${TYPE_NAME[r.t]} (${show(r)})`, node.r.start, node.r.end);
        return r;
      }
      let l = ev(node.l);
      let r = ev(node.r);
      if (l.t === 'fn' && l.min === 0) throw new ExprError(`'${l.name}' is a function — write ${l.name}()`, node.l.start, node.l.end);
      if (r.t === 'fn' && r.min === 0) throw new ExprError(`'${r.name}' is a function — write ${r.name}()`, node.r.start, node.r.end);
      if (op === '..') {
        sameType(l, r, node, '..');
        if (!['day', 'time', 'num'].includes(l.t)) throw new ExprError(`Ranges work with weekdays, times or numbers`, node.start, node.end);
        return { t: 'range', lo: l, hi: r };
      }
      if (op === 'in' || op === 'not in') {
        let res: boolean;
        if (r.t === 'list') res = r.v.some((x) => eq(x, l));
        else if (r.t === 'range') res = within(l, r, node);
        else throw new ExprError(`Right side of '${op}' must be a list or range, got a ${TYPE_NAME[r.t]}`, node.r.start, node.r.end);
        if (r.t === 'list' && r.v.length && !r.v.some((x) => x.t === l.t))
          throw new ExprError(`Looking for a ${TYPE_NAME[l.t]} in a list of ${TYPE_NAME[r.v[0].t]}s`, node.start, node.end);
        return B(op === 'in' ? res : !res);
      }
      if (op === '+' || op === '-') {
        if (l.t === 'time' && r.t === 'dur') return { t: 'time', v: (((l.v + (op === '+' ? r.v : -r.v)) % 1440) + 1440) % 1440 };
        if (l.t === 'dur' && r.t === 'time' && op === '+') return { t: 'time', v: (l.v + r.v) % 1440 };
        if (l.t === 'dur' && r.t === 'dur') return { t: 'dur', v: op === '+' ? l.v + r.v : l.v - r.v };
        if (l.t === 'time' && r.t === 'time' && op === '-') return { t: 'dur', v: l.v - r.v };
        if (l.t === 'num' && r.t === 'num') return { t: 'num', v: op === '+' ? l.v + r.v : l.v - r.v };
        if (l.t === 'date' && r.t === 'dur') return { t: 'date', v: addDays(l.v, Math.trunc((op === '+' ? r.v : -r.v) / 1440)) };
        throw new ExprError(`Can't ${op === '+' ? 'add' : 'subtract'} a ${TYPE_NAME[r.t]} ${op === '+' ? 'to' : 'from'} a ${TYPE_NAME[l.t]}`, node.start, node.end);
      }
      if (op === '==' || op === '!=') {
        if (l.t === 'obj' && r.t === 'obj') return B(op === '==' ? l === r : l !== r);
        sameType(l, r, node, op);
        return B(op === '==' ? eq(l, r) : !eq(l, r));
      }
      // ordering
      sameType(l, r, node, op);
      if (!['num', 'time', 'dur', 'day', 'date'].includes(l.t)) throw new ExprError(`Can't order ${TYPE_NAME[l.t]} values with '${op}'`, node.start, node.end);
      const a = (l as { v: number | string }).v;
      const b = (r as { v: number | string }).v;
      return B(op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b);
    }
  }
}

export interface CheckResult {
  ok: boolean;
  value?: Val;
  error?: ExprError;
  terms?: { text: string; value?: Val; error?: string; joiner?: string }[];
}

/** Parse + evaluate, with a per-term breakdown of top-level and/or chains. */
export function check(src: string, ctx: EvalCtx, expectBool = true): CheckResult {
  let ast: Node;
  try {
    ast = parse(src);
  } catch (e) {
    return { ok: false, error: e as ExprError };
  }
  const env = environment(ctx);
  const terms: CheckResult['terms'] = [];
  const flatten = (n: Node, joiner?: string) => {
    if (n.k === 'bin' && (n.op === 'and' || n.op === 'or')) {
      flatten(n.l, joiner);
      flatten(n.r, n.op);
      return;
    }
    const text = src.slice(n.start, n.end);
    try {
      terms.push({ text, value: evaluate(n, env), joiner });
    } catch (e) {
      terms.push({ text, error: (e as Error).message, joiner });
    }
  };
  flatten(ast);
  try {
    const value = evaluate(ast, env);
    if (expectBool && value.t !== 'bool')
      return { ok: false, error: new ExprError(`A condition must be true or false — this is a ${TYPE_NAME[value.t]} (${show(value)})`, 0, src.length), terms };
    return { ok: true, value, terms };
  } catch (e) {
    return { ok: false, error: e as ExprError, terms };
  }
}

export function parseOnly(src: string): ExprError | null {
  try {
    parse(src);
    return null;
  } catch (e) {
    return e as ExprError;
  }
}

export interface Completion { name: string; detail: string; insert: string; group: string }

export const COMPLETIONS: Completion[] = [
  { group: 'Time', name: 'now()', insert: 'now()', detail: 'Time the step runs, e.g. 8:45 PM' },
  { group: 'Time', name: 'weekday', insert: 'weekday', detail: 'Day of week: Sun … Sat' },
  { group: 'Time', name: 'today', insert: 'today', detail: 'Today’s date' },
  { group: 'Time', name: 'holiday()', insert: 'holiday(today)', detail: 'True on School Holidays calendar dates' },
  { group: 'Time', name: '20:15..21:00', insert: 'now() in 20:15..21:00', detail: 'Time window (can cross midnight)' },
  { group: 'Time', name: '[Sun..Thu]', insert: '[Sun..Thu]', detail: 'Weekday range' },
  { group: 'People', name: 'ada.home', insert: 'ada.home', detail: 'Ada’s phone is home' },
  { group: 'People', name: 'tobi.home', insert: 'tobi.home', detail: 'Tobi’s phone is home' },
  { group: 'People', name: 'emeka.home', insert: 'emeka.home', detail: 'Emeka’s phone is home' },
  { group: 'People', name: 'ruth.home', insert: 'ruth.home', detail: 'Ruth’s phone is home' },
  { group: 'Swim', name: 'ada.swim_days', insert: 'ada.swim_days', detail: '[Tue, Thu] from Ada · Swim calendar' },
  { group: 'Swim', name: 'ada.swim_ends', insert: 'ada.swim_ends', detail: '8:30 PM' },
  { group: 'Swim', name: 'ada.swim_today', insert: 'ada.swim_today', detail: 'True on practice days' },
];
