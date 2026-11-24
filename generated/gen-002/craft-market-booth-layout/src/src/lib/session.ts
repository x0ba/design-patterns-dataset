import { DRAFTS, INITIAL_DRAFT_ID } from '../data/market';
import type { Session } from './store';

const KEY = 'stallplan.session.v1';

/** Opens Bev's current draft (v3) unless she already has edits saved in this browser. */
export function loadSession(): Session {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Session;
      if (s && Array.isArray(s.drafts) && s.drafts.length && s.currentId && s.working) return s;
    }
  } catch {
    // Storage unavailable or corrupt: fall through to the seeded state.
  }
  const first = DRAFTS.find((d) => d.id === INITIAL_DRAFT_ID) ?? DRAFTS[0];
  return {
    drafts: structuredClone(DRAFTS),
    currentId: first.id,
    working: structuredClone(first.placements),
    tableOverrides: {},
  };
}

export function saveSession(s: Session): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ drafts: s.drafts, currentId: s.currentId, working: s.working, tableOverrides: s.tableOverrides }),
    );
  } catch {
    // Quota or private mode: edits still work for this visit.
  }
}
