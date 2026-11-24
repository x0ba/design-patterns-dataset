import { describe, expect, it } from 'vitest';
import { DRAFTS, VENDORS } from '../data/market';
import { TABLES_FIXED } from '../data/venue';
import { evaluate, findSpot, hardConflict } from './rules';
import type { Placements, Vendor } from './types';

const byId = new Map(VENDORS.map((v) => [v.id, v]));
const draft = (id: string) => DRAFTS.find((d) => d.id === id)!.placements;

function hardErrors(p: Placements) {
  const out: string[] = [];
  for (const [id, pl] of Object.entries(p)) {
    const vd = byId.get(id)!;
    const others = { ...p };
    delete others[id];
    const msg = hardConflict(vd, pl, others, byId);
    if (msg) out.push(`${vd.name}: ${msg}`);
  }
  return out;
}

describe('mock roster', () => {
  it('has 44 accepted vendors, 34 gym and 10 hallway', () => {
    expect(VENDORS).toHaveLength(44);
    expect(VENDORS.filter((v) => v.size !== 'hall')).toHaveLength(34);
    expect(VENDORS.filter((v) => v.size === 'hall')).toHaveLength(10);
  });

  it('has unique booth numbers and ids', () => {
    expect(new Set(VENDORS.map((v) => v.boothNo)).size).toBe(44);
    expect(new Set(VENDORS.map((v) => v.id)).size).toBe(44);
  });

  it('keeps keep-away links symmetric and pointing at real vendors', () => {
    for (const v of VENDORS) {
      for (const k of v.keepAway) {
        expect(byId.has(k)).toBe(true);
        expect(byId.get(k)!.keepAway).toContain(v.id);
      }
    }
  });

  it('commits 39 vendor tables (42 with the fixed items) out of 44', () => {
    const vendorTables = VENDORS.reduce((s, v) => s + v.tables, 0);
    expect(vendorTables).toBe(39);
    expect(vendorTables + TABLES_FIXED).toBeLessThanOrEqual(44);
  });
});

describe('v3 current (what Bev opens)', () => {
  const p = draft('v3');
  const issues = evaluate(p, VENDORS);

  it('has 42 booths on the floor and no hard overlaps', () => {
    expect(Object.keys(p)).toHaveLength(42);
    expect(hardErrors(p)).toEqual([]);
  });

  it('flags the corridor and the jewelry/face-painting conflict only', () => {
    const errors = issues.filter((i) => i.level === 'error');
    expect(errors.map((i) => i.key).sort()).toEqual(
      ['exit-N-patchwork-pantry', 'keepaway-juniper-lane|silver-fern'].sort(),
    );
  });

  it('lists the two late vendors as not on the floor', () => {
    const todos = issues.filter((i) => i.level === 'todo').map((i) => i.vendorIds[0]).sort();
    expect(todos).toEqual(['bramble-cider', 'hollow-oak-candle']);
  });

  it('cannot place the cider stall: the only free outlet has no open booth spot within reach', () => {
    const r = findSpot('bramble-cider', p, VENDORS);
    expect(r.spot).toBeNull();
    expect(r.reason).toMatch(/free: 4/);
  });

  it('can place the candle maker with no issues', () => {
    const r = findSpot('hollow-oak-candle', p, VENDORS);
    expect(r.spot).not.toBeNull();
    expect(r.spot!.softIssues).toBe(0);
  });

  it('has a clean fix: swap silver fern and loom, move patchwork back, shift lamplight to make room for the cider stall', () => {
    const fixed: Placements = JSON.parse(JSON.stringify(p));
    fixed['patchwork-pantry'].x = 18;
    fixed['silver-fern'] = { ...fixed['silver-fern'], x: 9, y: 0 };
    fixed['loom-lantern'] = { ...fixed['loom-lantern'], x: 6, y: 4.8 };
    fixed['lamplight-candle'] = { ...fixed['lamplight-candle'], x: 3, y: 14.4 };
    fixed['bramble-cider'] = { x: 0, y: 14.4, w: 3, h: 3, outlet: 'O4' };
    expect(hardErrors(fixed)).toEqual([]);
    const soft = evaluate(fixed, VENDORS).filter((i) => i.level !== 'todo');
    expect(soft).toEqual([]);
  });
});

describe('v2 Nov 3', () => {
  it('has no rule errors, only the two late vendors not yet placed', () => {
    const p = draft('v2');
    expect(hardErrors(p)).toEqual([]);
    const issues = evaluate(p, VENDORS);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(issues.filter((i) => i.level === 'todo')).toHaveLength(2);
  });
});

describe('rules', () => {
  it('flags a powered booth with no outlet', () => {
    const p = draft('v3');
    const copy: Placements = { ...p, 'clayhouse-pottery': { ...p['clayhouse-pottery'], outlet: null } };
    const keys = evaluate(copy, VENDORS).map((i) => i.key);
    expect(keys).toContain('power-none-clayhouse-pottery');
  });

  it('rejects a booth on the stage and a booth overlapping a fixed item', () => {
    const p = draft('v3');
    const oriel = byId.get('oriel-metalworks') as Vendor;
    const onStage = hardConflict(oriel, { x: 27, y: 5, w: 3, h: 3 }, p, byId);
    expect(onStage).toMatch(/stage/);
    const onBake = hardConflict(oriel, { x: 26.0, y: 14.4, w: 3, h: 3 }, p, byId);
    expect(onBake).toMatch(/bake sale/);
  });
});
