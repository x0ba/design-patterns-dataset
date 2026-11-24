import { describe, expect, it } from 'vitest';
import { evaluate, identifiers, parse, typeOf, ExprError, type VType } from './expr';

const vars: Record<string, number | boolean | string> = { a: 2, b: 3, t: true, f: false };
const env = (n: string) => {
  if (!(n in vars)) throw new ExprError(`no ${n}`);
  return vars[n];
};
const types: Record<string, VType> = { a: 'number', b: 'number', t: 'boolean', f: 'boolean' };
const tlook = (n: string): VType => {
  if (!(n in types)) throw new ExprError(`Unknown name "${n}"`);
  return types[n];
};

describe('expression language', () => {
  it('respects precedence', () => {
    expect(evaluate(parse('1 + 2 * 3'), env)).toBe(7);
    expect(evaluate(parse('a + b * 2 >= 8'), env)).toBe(true);
    expect(evaluate(parse('f || t && f'), env)).toBe(false);
  });

  it('evaluates ternaries and functions', () => {
    expect(evaluate(parse('t ? max(a, b) : 0'), env)).toBe(3);
    expect(evaluate(parse('ceil(0.3 * 10)'), env)).toBe(3);
    expect(evaluate(parse('max(0, a - b)'), env)).toBe(0);
  });

  it('collects identifiers without function names', () => {
    expect([...identifiers(parse('max(a, b) > min_thing && !f'))].sort()).toEqual(['a', 'b', 'f', 'min_thing']);
  });

  it('type-checks conditions and calculations', () => {
    expect(typeOf(parse('a <= b'), tlook)).toBe('boolean');
    expect(typeOf(parse('a * 0.2'), tlook)).toBe('number');
    expect(() => typeOf(parse('a && t'), tlook)).toThrow(/needs a boolean/);
    expect(() => typeOf(parse('t ? a : f'), tlook)).toThrow(/branches/);
  });

  it('reports parse errors in plain words', () => {
    expect(() => parse('a <=')).toThrow(/incomplete|Unexpected/);
    expect(() => parse('a b')).toThrow(/Unexpected "b"/);
    expect(() => parse('max(a)')).toThrow(/takes 2/);
    expect(() => parse('foo(a, b)')).toThrow(/Unknown function/);
    expect(() => parse('a = b')).toThrow(/Unexpected character/);
  });
});
