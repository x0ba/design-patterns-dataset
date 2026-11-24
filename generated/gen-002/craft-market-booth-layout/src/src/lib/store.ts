import { findSpot, hardConflict, outletById, outletUsers, pointRectDistance, venueOf } from './rules';
import { OUTLETS } from '../data/venue';
import { VENDORS } from '../data/market';
import type { Draft, Placement, Placements, Rect, Vendor } from './types';

export interface Session {
  drafts: Draft[];
  currentId: string;
  working: Placements;
  tableOverrides: Record<string, number>;
}

export interface Flash {
  text: string;
  tone: 'info' | 'warn';
}

export interface AppState extends Session {
  past: Placements[];
  future: Placements[];
  selectedId: string | null;
  flash: Flash | null;
  scale: number;
}

export type Action =
  | { type: 'select'; id: string | null }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'setRect'; id: string; rect: Rect }
  | { type: 'rotate'; id: string }
  | { type: 'nudge'; id: string; dx: number; dy: number }
  | { type: 'remove'; id: string }
  | { type: 'place'; id: string }
  | { type: 'outlet'; id: string; outlet: string | null }
  | { type: 'tables'; id: string; n: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'save' }
  | { type: 'revert' }
  | { type: 'switch'; id: string }
  | { type: 'saveAs'; name: string }
  | { type: 'zoom'; scale: number }
  | { type: 'flash'; flash: Flash | null };

export const samePlacements = (a: Placements, b: Placements): boolean => {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => {
    const x = a[k];
    const y = b[k];
    return y && x.x === y.x && x.y === y.y && x.w === y.w && x.h === y.h && x.outlet === y.outlet;
  });
};

export function vendorsWith(overrides: Record<string, number>): Vendor[] {
  return VENDORS.map((v) => (overrides[v.id] === undefined ? v : { ...v, tables: overrides[v.id] }));
}

export function nowLabel(d = new Date()): string {
  return d.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

const snap = (n: number) => Math.round(n * 10) / 10;

function commit(s: AppState, next: Placements, msg?: Flash | null): AppState {
  if (samePlacements(next, s.working)) return msg === undefined ? s : { ...s, flash: msg };
  return {
    ...s,
    past: [...s.past, s.working].slice(-200),
    future: [],
    working: next,
    flash: msg === undefined ? s.flash : msg,
  };
}

const warn = (s: AppState, text: string): AppState => ({ ...s, flash: { text, tone: 'warn' } });

function vendorOf(s: AppState, id: string): Vendor | undefined {
  return vendorsWith(s.tableOverrides).find((v) => v.id === id);
}

/** Moves or resizes a placed booth if the new rectangle is legal. */
function tryRect(s: AppState, id: string, rect: Rect, outlet?: string | null): AppState {
  const vendor = vendorOf(s, id);
  const p = s.working[id];
  if (!vendor || !p) return s;
  const byId = new Map(vendorsWith(s.tableOverrides).map((v) => [v.id, v]));
  const conflict = hardConflict(vendor, rect, s.working, byId);
  if (conflict) return warn(s, `Can't put ${vendor.name} there: ${conflict.charAt(0).toLowerCase()}${conflict.slice(1)}.`);
  const next: Placement = { ...p, ...rect, outlet: outlet === undefined ? p.outlet : outlet };
  return commit({ ...s, selectedId: id }, { ...s.working, [id]: next }, null);
}

export function reduce(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'select':
      return a.id === s.selectedId ? s : { ...s, selectedId: a.id };

    case 'move': {
      const p = s.working[a.id];
      if (!p) return s;
      return tryRect(s, a.id, { x: snap(a.x), y: snap(a.y), w: p.w, h: p.h });
    }

    case 'setRect':
      return tryRect(s, a.id, a.rect);

    case 'rotate': {
      const p = s.working[a.id];
      const v = vendorOf(s, a.id);
      if (!p || !v) return s;
      if (venueOf(v) === 'hall') return warn(s, 'Hallway spots are always 2 × 2 m and face the booth wall.');
      return tryRect(s, a.id, { x: p.x, y: p.y, w: p.h, h: p.w });
    }

    case 'nudge': {
      const p = s.working[a.id];
      if (!p) return s;
      const v = vendorOf(s, a.id);
      const dy = v && venueOf(v) === 'hall' ? 0 : a.dy;
      return tryRect(s, a.id, { x: snap(p.x + a.dx), y: snap(p.y + dy), w: p.w, h: p.h });
    }

    case 'remove': {
      const p = s.working[a.id];
      const v = vendorOf(s, a.id);
      if (!p || !v) return s;
      const next = { ...s.working };
      delete next[a.id];
      return commit({ ...s, selectedId: a.id }, next, { text: `${v.name} taken off the floor. Ctrl+Z to undo.`, tone: 'info' });
    }

    case 'place': {
      const v = vendorOf(s, a.id);
      if (!v || s.working[a.id]) return s;
      const { spot, reason } = findSpot(a.id, s.working, vendorsWith(s.tableOverrides));
      if (!spot) return warn(s, `Couldn't place ${v.name}. ${reason}`);
      const next: Placements = {
        ...s.working,
        [a.id]: { x: spot.x, y: spot.y, w: spot.w, h: spot.h, outlet: spot.outlet },
      };
      const note = spot.softIssues > 0 ? ` It still has ${spot.softIssues} issue(s) to fix.` : '';
      const outletNote = spot.outlet ? ` Outlet ${outletById(spot.outlet)?.n} assigned.` : '';
      return { ...commit({ ...s, selectedId: a.id }, next, { text: `Placed ${v.name} at ${spot.x.toFixed(1)}, ${spot.y.toFixed(1)} m.${outletNote}${note}`, tone: 'info' }) };
    }

    case 'outlet': {
      const p = s.working[a.id];
      const v = vendorOf(s, a.id);
      if (!p || !v) return warn(s, 'Place the booth on the floor before assigning an outlet.');
      if (!v.power) return warn(s, `${v.name} doesn't need power.`);
      if (a.outlet === p.outlet) return s;
      const next: Placements = { ...s.working };
      if (a.outlet === null) {
        next[a.id] = { ...p, outlet: null };
        return commit(s, next, { text: `${v.name} is no longer on an outlet.`, tone: 'info' });
      }
      const holder = Object.entries(next).find(([id, q]) => id !== a.id && q.outlet === a.outlet);
      next[a.id] = { ...p, outlet: a.outlet };
      const n = outletById(a.outlet)?.n;
      if (holder) {
        const other = vendorOf(s, holder[0]);
        next[holder[0]] = { ...holder[1], outlet: p.outlet };
        return commit(s, next, {
          text: `Swapped outlet ${n} to ${v.name}. ${other?.name ?? 'The other booth'} ${p.outlet ? `moved to outlet ${outletById(p.outlet)?.n}` : 'is now without an outlet'}.`,
          tone: 'info',
        });
      }
      return commit(s, next, { text: `${v.name} is on outlet ${n}.`, tone: 'info' });
    }

    case 'tables': {
      const n = Math.max(0, Math.min(2, Math.round(a.n)));
      return { ...s, tableOverrides: { ...s.tableOverrides, [a.id]: n } };
    }

    case 'undo': {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { ...s, past: s.past.slice(0, -1), future: [s.working, ...s.future], working: prev, flash: null };
    }

    case 'redo': {
      if (!s.future.length) return s;
      const [next, ...rest] = s.future;
      return { ...s, past: [...s.past, s.working], future: rest, working: next, flash: null };
    }

    case 'save': {
      const drafts = s.drafts.map((d) => (d.id === s.currentId ? { ...d, placements: s.working, savedAt: nowLabel() } : d));
      const cur = drafts.find((d) => d.id === s.currentId);
      return { ...s, drafts, flash: { text: `Saved ${cur?.name ?? 'draft'}.`, tone: 'info' } };
    }

    case 'revert': {
      const cur = s.drafts.find((d) => d.id === s.currentId);
      if (!cur) return s;
      return { ...s, working: cur.placements, past: [], future: [], selectedId: null, flash: { text: `Reverted to ${cur.name}.`, tone: 'info' } };
    }

    case 'switch': {
      const d = s.drafts.find((x) => x.id === a.id);
      if (!d) return s;
      return { ...s, currentId: d.id, working: d.placements, past: [], future: [], selectedId: null, flash: { text: `Opened ${d.name}.`, tone: 'info' } };
    }

    case 'saveAs': {
      const id = `draft-${Date.now().toString(36)}`;
      const draft: Draft = { id, name: a.name, savedAt: nowLabel(), placements: s.working };
      return { ...s, drafts: [...s.drafts, draft], currentId: id, past: [], future: [], flash: { text: `Saved as ${a.name}.`, tone: 'info' } };
    }

    case 'zoom':
      return { ...s, scale: a.scale };

    case 'flash':
      return { ...s, flash: a.flash };
  }
}

/** Derived view data used by several panels. */
export function outletStatus(working: Placements, outletId: string, vendors: Vendor[], vendorId: string) {
  const users = outletUsers(working).get(outletId) ?? [];
  const other = users.find((id) => id !== vendorId);
  const holder = other ? vendors.find((v) => v.id === other) : undefined;
  return { holder, free: users.length === 0 };
}

export function outletDistance(p: Placement, outletId: string): number | null {
  const o = OUTLETS.find((x) => x.id === outletId);
  if (!o) return null;
  return pointRectDistance(o.x, o.y, p);
}

