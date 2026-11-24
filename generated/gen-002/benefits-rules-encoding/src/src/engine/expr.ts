// A small, safe expression language for rule steps.
// No eval: source is tokenized, parsed to an AST, type-checked, then interpreted.
//
// Grammar (lowest to highest precedence):
//   expr    := or ( '?' expr ':' expr )?
//   or      := and ( '||' and )*
//   and     := equality ( '&&' equality )*
//   equality:= relation ( ('=='|'!=') relation )*
//   relation:= sum ( ('<'|'<='|'>'|'>=') sum )*
//   sum     := product ( ('+'|'-') product )*
//   product := unary ( ('*'|'/') unary )*
//   unary   := ('!'|'-') unary | primary
//   primary := NUMBER | STRING | 'true' | 'false' | IDENT | IDENT '(' args ')' | '(' expr ')'
//
// Functions: min(a, b), max(a, b), ceil(x).

export type VType = 'number' | 'boolean' | 'string';
export type Value = number | boolean | string;

export type Expr =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'id'; name: string }
  | { t: 'call'; name: string; args: Expr[] }
  | { t: 'not'; e: Expr }
  | { t: 'neg'; e: Expr }
  | { t: 'bin'; op: string; l: Expr; r: Expr }
  | { t: 'cond'; c: Expr; a: Expr; b: Expr };

export class ExprError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExprError';
  }
}

type Tok =
  | { k: 'num'; v: number; at: number }
  | { k: 'str'; v: string; at: number }
  | { k: 'id'; v: string; at: number }
  | { k: 'op'; v: string; at: number };

const OPS = ['<=', '>=', '==', '!=', '&&', '||', '<', '>', '+', '-', '*', '/', '!', '(', ')', '?', ':', ','];

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const m = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i));
      if (!m) throw new ExprError(`Bad number at ${i + 1}`);
      out.push({ k: 'num', v: Number(m[0]), at: i });
      i += m[0].length;
      continue;
    }
    if (ch === '"') {
      const end = src.indexOf('"', i + 1);
      if (end < 0) throw new ExprError(`Unclosed string starting at column ${i + 1}`);
      out.push({ k: 'str', v: src.slice(i + 1, end), at: i });
      i = end + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      out.push({ k: 'id', v: m![0], at: i });
      i += m![0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new ExprError(`Unexpected character "${ch}" at column ${i + 1}`);
    out.push({ k: 'op', v: op, at: i });
    i += op.length;
  }
  return out;
}

const FUNCS: Record<string, number> = { min: 2, max: 2, ceil: 1 };

export function parse(src: string): Expr {
  const toks = tokenize(src);
  let p = 0;
  const peek = (): Tok | undefined => toks[p];
  const isOp = (v: string) => {
    const t = toks[p];
    return !!t && t.k === 'op' && t.v === v;
  };
  const expectOp = (v: string) => {
    if (!isOp(v)) {
      const t = toks[p];
      throw new ExprError(t ? `Expected "${v}" at column ${t.at + 1}` : `Expected "${v}" at end of expression`);
    }
    p++;
  };

  function expr(): Expr {
    const c = or();
    if (isOp('?')) {
      p++;
      const a = expr();
      expectOp(':');
      const b = expr();
      return { t: 'cond', c, a, b };
    }
    return c;
  }
  function binary(next: () => Expr, ops: string[]): Expr {
    let l = next();
    for (;;) {
      const t = peek();
      if (t && t.k === 'op' && ops.includes(t.v)) {
        p++;
        l = { t: 'bin', op: t.v, l, r: next() };
      } else break;
    }
    return l;
  }
  const or = () => binary(and, ['||']);
  const and = () => binary(equality, ['&&']);
  const equality = () => binary(relation, ['==', '!=']);
  const relation = () => binary(sum, ['<', '<=', '>', '>=']);
  const sum = () => binary(product, ['+', '-']);
  const product = () => binary(unary, ['*', '/']);
  function unary(): Expr {
    if (isOp('!')) {
      p++;
      return { t: 'not', e: unary() };
    }
    if (isOp('-')) {
      p++;
      return { t: 'neg', e: unary() };
    }
    return primary();
  }
  function primary(): Expr {
    const t = peek();
    if (!t) throw new ExprError('Expression is incomplete');
    if (t.k === 'num') {
      p++;
      return { t: 'num', v: t.v };
    }
    if (t.k === 'str') {
      p++;
      return { t: 'str', v: t.v };
    }
    if (t.k === 'id') {
      p++;
      if (t.v === 'true' || t.v === 'false') return { t: 'bool', v: t.v === 'true' };
      if (isOp('(')) {
        p++;
        const args: Expr[] = [];
        if (!isOp(')')) {
          args.push(expr());
          while (isOp(',')) {
            p++;
            args.push(expr());
          }
        }
        expectOp(')');
        if (!(t.v in FUNCS)) throw new ExprError(`Unknown function "${t.v}"`);
        if (FUNCS[t.v] !== args.length) throw new ExprError(`${t.v}() takes ${FUNCS[t.v]} argument(s)`);
        return { t: 'call', name: t.v, args };
      }
      return { t: 'id', name: t.v };
    }
    if (isOp('(')) {
      p++;
      const e = expr();
      expectOp(')');
      return e;
    }
    throw new ExprError(`Unexpected "${t.v}" at column ${t.at + 1}`);
  }

  if (toks.length === 0) throw new ExprError('Expression is empty');
  const ast = expr();
  if (p < toks.length) {
    const t = toks[p];
    throw new ExprError(`Unexpected "${t.k === 'str' ? `"${t.v}"` : t.v}" at column ${t.at + 1}`);
  }
  return ast;
}

/** Identifiers referenced by an expression (function names excluded). */
export function identifiers(e: Expr, out: Set<string> = new Set()): Set<string> {
  switch (e.t) {
    case 'id':
      out.add(e.name);
      break;
    case 'call':
      e.args.forEach((a) => identifiers(a, out));
      break;
    case 'not':
    case 'neg':
      identifiers(e.e, out);
      break;
    case 'bin':
      identifiers(e.l, out);
      identifiers(e.r, out);
      break;
    case 'cond':
      identifiers(e.c, out);
      identifiers(e.a, out);
      identifiers(e.b, out);
      break;
    default:
      break;
  }
  return out;
}

/** Static type of an expression. Throws ExprError on a type clash. */
export function typeOf(e: Expr, lookup: (name: string) => VType): VType {
  const need = (t: VType, want: VType, what: string) => {
    if (t !== want) throw new ExprError(`${what} needs a ${want}, got a ${t}`);
  };
  switch (e.t) {
    case 'num':
      return 'number';
    case 'str':
      return 'string';
    case 'bool':
      return 'boolean';
    case 'id':
      return lookup(e.name);
    case 'call':
      e.args.forEach((a) => need(typeOf(a, lookup), 'number', `${e.name}()`));
      return 'number';
    case 'not':
      need(typeOf(e.e, lookup), 'boolean', '"!"');
      return 'boolean';
    case 'neg':
      need(typeOf(e.e, lookup), 'number', 'unary "-"');
      return 'number';
    case 'bin': {
      const lt = typeOf(e.l, lookup);
      const rt = typeOf(e.r, lookup);
      switch (e.op) {
        case '+':
        case '-':
        case '*':
        case '/':
          need(lt, 'number', `"${e.op}"`);
          need(rt, 'number', `"${e.op}"`);
          return 'number';
        case '<':
        case '<=':
        case '>':
        case '>=':
          need(lt, 'number', `"${e.op}"`);
          need(rt, 'number', `"${e.op}"`);
          return 'boolean';
        case '==':
        case '!=':
          if (lt !== rt) throw new ExprError(`"${e.op}" compares a ${lt} with a ${rt}`);
          return 'boolean';
        case '&&':
        case '||':
          need(lt, 'boolean', `"${e.op}"`);
          need(rt, 'boolean', `"${e.op}"`);
          return 'boolean';
      }
      throw new ExprError(`Unknown operator ${e.op}`);
    }
    case 'cond': {
      need(typeOf(e.c, lookup), 'boolean', 'the condition before "?"');
      const at = typeOf(e.a, lookup);
      const bt = typeOf(e.b, lookup);
      if (at !== bt) throw new ExprError(`The two branches of "?:" are a ${at} and a ${bt}`);
      return at;
    }
  }
}

export type Env = (name: string) => Value;

export function evaluate(e: Expr, env: Env): Value {
  switch (e.t) {
    case 'num':
    case 'str':
    case 'bool':
      return e.v;
    case 'id':
      return env(e.name);
    case 'call': {
      const [a, b] = e.args.map((x) => evaluate(x, env) as number);
      if (e.name === 'min') return Math.min(a, b);
      if (e.name === 'max') return Math.max(a, b);
      return Math.ceil(a);
    }
    case 'not':
      return !evaluate(e.e, env);
    case 'neg':
      return -(evaluate(e.e, env) as number);
    case 'bin': {
      if (e.op === '&&') return Boolean(evaluate(e.l, env)) && Boolean(evaluate(e.r, env));
      if (e.op === '||') return Boolean(evaluate(e.l, env)) || Boolean(evaluate(e.r, env));
      const l = evaluate(e.l, env);
      const r = evaluate(e.r, env);
      switch (e.op) {
        case '+':
          return (l as number) + (r as number);
        case '-':
          return (l as number) - (r as number);
        case '*':
          return (l as number) * (r as number);
        case '/':
          if (r === 0) throw new ExprError('Division by zero');
          return (l as number) / (r as number);
        case '<':
          return (l as number) < (r as number);
        case '<=':
          return (l as number) <= (r as number);
        case '>':
          return (l as number) > (r as number);
        case '>=':
          return (l as number) >= (r as number);
        case '==':
          return l === r;
        case '!=':
          return l !== r;
      }
      throw new ExprError(`Unknown operator ${e.op}`);
    }
    case 'cond':
      return evaluate(e.c, env) ? evaluate(e.a, env) : evaluate(e.b, env);
  }
}
