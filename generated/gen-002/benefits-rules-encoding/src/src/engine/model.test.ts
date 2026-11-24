import { describe, expect, it } from 'vitest';
import { analyze, runCase, type RuleNode } from './model';
import { SPEC } from '../data/spec';
import { INITIAL_NODES } from '../data/nodes';
import { TEST_CASES } from '../data/households';

function runAll(nodes: RuleNode[]) {
  const analysis = analyze(nodes, SPEC);
  const results = TEST_CASES.map((c) => {
    const run = runCase(nodes, analysis, SPEC, c.facts, c.hhSize);
    const eligible = run.values['eligible'] === true;
    const benefit = Number(run.values['benefit_final'] ?? 0);
    const pass = eligible === c.expected.eligible && Math.abs(benefit - c.expected.benefit) < 0.5;
    return { id: c.id, eligible, benefit, pass, reason: String(run.values['reason_code']), errors: run.errors };
  });
  return { analysis, results };
}

// Test-only patch implementing the 2025 amendment. The app does not ship this;
// the user builds the same change in the editor.
function applyAmendmentPatch(nodes: RuleNode[]): RuleNode[] {
  const out = nodes.map((n) => ({ ...n, cites: [...n.cites], tags: [...n.tags] }));
  const gross = out.find((n) => n.id === 'gross_test')!;
  gross.expr = 'gross_exempt_eld || gross_income <= gross_limit_row';
  gross.cites.push('sr-461-160-0015-2025');
  const net = out.find((n) => n.id === 'net_test')!;
  net.expr = 'net_income <= net_limit_row';
  net.cites.push('sr-461-160-0015-2025');
  const inc = out.find((n) => n.id === 'income_test')!;
  inc.cites.push('sr-461-160-0015-2025');
  const idx = out.findIndex((n) => n.id === 'gross_test');
  out.splice(idx, 0, {
    id: 'gross_exempt_eld',
    label: 'Household has elderly or disabled member',
    kind: 'condition',
    section: 'income',
    expr: 'eld_dis_members >= 1',
    cites: ['c-271-2', 'sr-461-160-0015-2025'],
    tags: ['income-standard'],
  });
  return out;
}

describe('initial rule model (revision r27)', () => {
  it('has 63 steps and 81 connections with no validation issues', () => {
    const a = analyze(INITIAL_NODES, SPEC);
    expect(INITIAL_NODES.length).toBe(63);
    expect(a.edgeCount).toBe(81);
    expect(a.global).toEqual([]);
    expect(Object.values(a.issues).flat()).toEqual([]);
  });

  it('has 12 test households: 9 pass and T-04, T-07, T-11 fail', () => {
    const { results } = runAll(INITIAL_NODES);
    const failing = results.filter((r) => !r.pass).map((r) => r.id);
    expect(failing).toEqual(['T-04', 'T-07', 'T-11']);
    expect(results.filter((r) => r.pass).length).toBe(9);
    for (const r of results) expect(r.errors).toEqual({});
  });

  it('fails the three elderly or disabled cases at the gross test', () => {
    const { results } = runAll(INITIAL_NODES);
    for (const id of ['T-04', 'T-07', 'T-11']) {
      expect(results.find((r) => r.id === id)!.reason).toBe('GROSS_INCOME');
    }
  });
});

describe('after the amendment is wired in', () => {
  it('passes all 12 with 64 steps and still 81 connections', () => {
    const patched = applyAmendmentPatch(INITIAL_NODES);
    const a = analyze(patched, SPEC);
    expect(patched.length).toBe(64);
    expect(a.ok).toBe(true);
    expect(a.edgeCount).toBe(81);
    const { results } = runAll(patched);
    expect(results.filter((r) => !r.pass)).toEqual([]);
  });

  it('gives the expected benefits for the three repaired cases', () => {
    const { results } = runAll(applyAmendmentPatch(INITIAL_NODES));
    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    expect(byId['T-04']).toMatchObject({ eligible: true, benefit: 37 });
    expect(byId['T-07']).toMatchObject({ eligible: true, benefit: 27 });
    expect(byId['T-11']).toMatchObject({ eligible: true, benefit: 44 });
  });
});
