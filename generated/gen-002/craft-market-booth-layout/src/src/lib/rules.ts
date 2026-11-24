import {
  EXITS,
  FEE,
  FIXED,
  GYM,
  HALL,
  KEEP_AWAY_M,
  OUTLET_REACH_M,
  OUTLETS,
  STAGE,
  TABLES_FIXED,
  TABLES_TOTAL,
} from '../data/venue';
import type { Issue, Outlet, Placement, Placements, Rect, Vendor } from './types';

const EPS = 1e-6;

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;
}

/** Shortest edge-to-edge distance between two rectangles (0 when touching or overlapping). */
export function rectGap(a: Rect, b: Rect): number {
  const dx = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

export function pointRectDistance(px: number, py: number, r: Rect): number {
  const dx = Math.max(0, r.x - px, px - (r.x + r.w));
  const dy = Math.max(0, r.y - py, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export type VenueId = 'gym' | 'hall';

export function venueOf(v: Vendor): VenueId {
  return v.size === 'hall' ? 'hall' : 'gym';
}

export function requestedDims(v: Vendor): { w: number; h: number } {
  if (v.size === 'hall') return { w: HALL.boothDepth, h: HALL.boothDepth };
  return { w: 3, h: v.size === '3x2' ? 2 : 3 };
}

export function outletById(id: string): Outlet | undefined {
  return OUTLETS.find((o) => o.id === id);
}

/** Map of outlet id -> vendor ids that have it assigned in this layout. */
export function outletUsers(placements: Placements): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [vid, p] of Object.entries(placements)) {
    if (!p.outlet) continue;
    m.set(p.outlet, [...(m.get(p.outlet) ?? []), vid]);
  }
  return m;
}

export function dimsLabel(p: { w: number; h: number }): string {
  return `${p.w} × ${p.h} m`;
}

/**
 * A hard conflict stops a booth from being placed there at all: out of bounds,
 * on the stage, on a fixed item, or overlapping another booth.
 * Returns a message, or null if the spot is allowed.
 */
export function hardConflict(
  vendor: Vendor,
  rect: Rect,
  placements: Placements,
  vendorsById: Map<string, Vendor>,
): string | null {
  const venue = venueOf(vendor);
  if (venue === 'hall') {
    if (rect.y > EPS || rect.y < -EPS) return 'Hallway booths sit against the booth wall (top edge)';
    if (rect.x < -EPS || rect.x + rect.w > HALL.w + EPS) return 'Outside the front hallway';
  } else {
    if (rect.x < -EPS || rect.y < -EPS || rect.x + rect.w > GYM.w + EPS || rect.y + rect.h > GYM.h + EPS) {
      return 'Outside the gym';
    }
    if (overlaps(rect, STAGE)) return 'The stage is off limits';
    for (const f of FIXED) {
      if (overlaps(rect, f.rect)) return `Overlaps ${f.label.toLowerCase()}`;
    }
  }
  for (const [id, p] of Object.entries(placements)) {
    if (id === vendor.id) continue;
    const other = vendorsById.get(id);
    if (!other || venueOf(other) !== venue) continue;
    if (overlaps(rect, p)) return `Overlaps ${other.name}`;
  }
  return null;
}

/** Soft rules, reported in the issues list. Hard conflicts are handled by hardConflict. */
export function evaluate(placements: Placements, vendors: Vendor[]): Issue[] {
  const byId = new Map(vendors.map((v) => [v.id, v]));
  const placed = vendors.filter((v) => placements[v.id]);
  const errors: Issue[] = [];
  const cautions: Issue[] = [];
  const todos: Issue[] = [];

  // 1. Exits and the north corridor stay clear.
  for (const v of placed) {
    const p = placements[v.id];
    if (venueOf(v) !== 'gym') continue;
    for (const ex of EXITS) {
      if (overlaps(p, ex.clear) || overlaps(p, ex.door)) {
        const text =
          ex.id === 'N'
            ? `${v.name} blocks the 1.8 m clear corridor to the north exit`
            : `${v.name} blocks the clear space in front of the ${ex.label.toLowerCase()}`;
        errors.push({ key: `exit-${ex.id}-${v.id}`, level: 'error', vendorIds: [v.id], text });
      }
    }
  }

  // 2. Keep-away pairs.
  const seenPairs = new Set<string>();
  for (const v of placed) {
    if (venueOf(v) !== 'gym') continue;
    for (const u of placed) {
      if (u.id === v.id || venueOf(u) !== 'gym') continue;
      const linked = v.keepAway.includes(u.id) || u.keepAway.includes(v.id);
      if (!linked) continue;
      const key = [v.id, u.id].sort().join('|');
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      const gap = rectGap(placements[v.id], placements[u.id]);
      if (gap < KEEP_AWAY_M) {
        errors.push({
          key: `keepaway-${key}`,
          level: 'error',
          vendorIds: [v.id, u.id],
          text:
            gap < 0.05
              ? `${v.name} is touching ${u.name}. Keep ${KEEP_AWAY_M} m apart.`
              : `${v.name} is ${gap.toFixed(1)} m from ${u.name}. Keep ${KEEP_AWAY_M} m apart.`,
        });
      }
    }
  }

  // 3. Power.
  const users = outletUsers(placements);
  for (const v of placed) {
    if (!v.power) continue;
    const p = placements[v.id];
    if (venueOf(v) === 'hall') {
      errors.push({ key: `power-hall-${v.id}`, level: 'error', vendorIds: [v.id], text: `${v.name} needs power, and the front hallway has no outlets` });
      continue;
    }
    if (!p.outlet) {
      errors.push({ key: `power-none-${v.id}`, level: 'error', vendorIds: [v.id], text: `${v.name} needs an outlet and has none assigned` });
      continue;
    }
    const o = outletById(p.outlet);
    if (!o) continue;
    const d = pointRectDistance(o.x, o.y, p);
    if (d > OUTLET_REACH_M + EPS) {
      errors.push({
        key: `power-reach-${v.id}`,
        level: 'error',
        vendorIds: [v.id],
        text: `${v.name} is ${d.toFixed(1)} m from outlet ${o.n} (max ${OUTLET_REACH_M} m)`,
      });
    }
  }
  for (const [oid, vids] of users) {
    if (vids.length < 2) continue;
    const o = outletById(oid);
    const names = vids.map((id) => byId.get(id)?.name ?? id);
    errors.push({
      key: `outlet-dup-${oid}`,
      level: 'error',
      vendorIds: vids,
      text: `Outlet ${o?.n ?? oid} is assigned to ${names.join(' and ')}`,
    });
  }
  // Shared-circuit caution: two food vendors on outlets wired to the same circuit.
  const byCircuit = new Map<string, Vendor[]>();
  for (const v of placed) {
    const oid = placements[v.id].outlet;
    const o = oid ? outletById(oid) : undefined;
    if (!o || v.category !== 'Food') continue;
    byCircuit.set(o.circuit, [...(byCircuit.get(o.circuit) ?? []), v]);
  }
  for (const [circuit, list] of byCircuit) {
    if (list.length < 2) continue;
    cautions.push({
      key: `circuit-${circuit}`,
      level: 'caution',
      vendorIds: list.map((x) => x.id),
      text: `${list.map((x) => x.name).join(' and ')} share circuit ${circuit}. Check the load before both run heaters.`,
    });
  }

  // 4. Hallway booths sit on the booth wall.
  for (const v of placed) {
    if (venueOf(v) !== 'hall') continue;
    if (placements[v.id].y !== 0) {
      errors.push({ key: `hall-side-${v.id}`, level: 'error', vendorIds: [v.id], text: `${v.name} is off the hallway booth wall` });
    }
  }

  // 5. Table stock.
  const tablesCommitted = vendors.reduce((sum, v) => sum + v.tables, 0) + TABLES_FIXED;
  if (tablesCommitted > TABLES_TOTAL) {
    errors.push({
      key: 'tables-over',
      level: 'error',
      vendorIds: [],
      text: `Tables: ${tablesCommitted} committed, but only ${TABLES_TOTAL} are in stock`,
    });
  }

  // 6. Accepted vendors not yet on the floor.
  for (const v of vendors) {
    if (placements[v.id]) continue;
    const power = v.power ? ' It needs an outlet.' : '';
    const free = OUTLETS.filter((o) => !users.has(o.id)).map((o) => o.n);
    const extra = v.power && free.length ? ` Free outlets: ${free.join(', ')}.` : '';
    todos.push({
      key: `unplaced-${v.id}`,
      level: 'todo',
      vendorIds: [v.id],
      text: `${v.name} is not on the floor yet.${power}${extra}`,
    });
  }

  return [...errors, ...cautions, ...todos];
}

/** Worst issue level per vendor, for colouring booths. */
export function worstLevelByVendor(issues: Issue[]): Map<string, 'error' | 'caution'> {
  const m = new Map<string, 'error' | 'caution'>();
  for (const i of issues) {
    if (i.level === 'todo') continue;
    for (const id of i.vendorIds) {
      if (i.level === 'error' || !m.has(id)) m.set(id, i.level);
    }
  }
  return m;
}

export function issuesFor(vendorId: string, issues: Issue[]): Issue[] {
  return issues.filter((i) => i.vendorIds.includes(vendorId));
}

export function feeFor(v: Vendor): number {
  return v.size === 'hall' ? FEE.hallway : FEE.full;
}

export interface SpotResult {
  x: number;
  y: number;
  w: number;
  h: number;
  outlet: string | null;
  /** Number of soft issues this spot creates for the vendor (0 is best). */
  softIssues: number;
}

/**
 * Looks for a spot for an unplaced vendor. Hard conflicts are never allowed.
 * Among legal spots it prefers ones that create no soft issues, then the
 * top-most, left-most one. Powered booths only use an outlet that is free and
 * within reach.
 */
export function findSpot(vendorId: string, placements: Placements, vendors: Vendor[]): { spot: SpotResult | null; reason: string } {
  const vendor = vendors.find((v) => v.id === vendorId);
  if (!vendor) return { spot: null, reason: 'Unknown vendor' };
  const byId = new Map(vendors.map((v) => [v.id, v]));
  const dims = requestedDims(vendor);
  const isHall = venueOf(vendor) === 'hall';
  const used = outletUsers(placements);
  const freeOutlets = OUTLETS.filter((o) => !used.has(o.id));
  const step = isHall ? 0.1 : 0.3;
  const venueW = isHall ? HALL.w : GYM.w;
  const venueH = isHall ? HALL.h : GYM.h;

  let best: SpotResult | null = null;
  let bestScore = Infinity;
  let sawLegalSpot = false;

  for (let y = 0; y <= venueH - dims.h + 1e-6; y += step) {
    if (isHall && y > 0) break;
    for (let x = 0; x <= venueW - dims.w + 1e-6; x += step) {
      const rect: Rect = { x: round1(x), y: round1(y), w: dims.w, h: dims.h };
      if (hardConflict(vendor, rect, placements, byId)) continue;
      sawLegalSpot = true;

      let outlet: string | null = null;
      if (vendor.power) {
        if (isHall) continue;
        let bestOutlet: { o: Outlet; d: number } | null = null;
        for (const o of freeOutlets) {
          const d = pointRectDistance(o.x, o.y, rect);
          if (d <= OUTLET_REACH_M + EPS && (!bestOutlet || d < bestOutlet.d)) bestOutlet = { o, d };
        }
        if (!bestOutlet) continue;
        outlet = bestOutlet.o.id;
      }

      const candidate: Placement = { ...rect, outlet };
      const trial: Placements = { ...placements, [vendorId]: candidate };
      const soft = evaluate(trial, vendors).filter((i) => i.level === 'error' && i.vendorIds.includes(vendorId)).length;
      const score = soft * 1000 + rect.y * 10 + rect.x * 0.1;
      if (score < bestScore) {
        bestScore = score;
        best = { ...rect, outlet, softIssues: soft };
      }
    }
  }

  if (best) return { spot: best, reason: '' };
  if (vendor.power && sawLegalSpot) {
    const free = freeOutlets.map((o) => o.n).join(', ') || 'none';
    return {
      spot: null,
      reason: `No free space within ${OUTLET_REACH_M} m of a free outlet (free: ${free}). Move a booth to make room.`,
    };
  }
  return { spot: null, reason: `No free ${dims.w}×${dims.h} m space without overlapping another booth` };
}

