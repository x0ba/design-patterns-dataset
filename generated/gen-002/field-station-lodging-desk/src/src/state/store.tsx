import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { initialState } from '../data/seed';
import {
  arrivalCovers,
  bunkById,
  bunkLabel,
  checkPlacement,
  clockLabel,
  manifestKey,
  personById,
  personInBunk,
  restrictionFor,
} from '../logic';
import { COURSE, START_MINUTE } from '../config';
import type { AppState, Lodging, Person, Role } from '../types';

export type Action =
  | { type: 'confirm'; personId: string }
  | { type: 'releasePerson'; personId: string }
  | { type: 'releaseSlot'; bunkId: string }
  | { type: 'nameSlot'; bunkId: string; name: string; role: Role; lodging: Lodging; diet: string | null }
  | { type: 'move'; personId: string; toBunkId: string }
  | { type: 'waiver'; personId: string }
  | { type: 'setTrip'; personId: string; trip: 1 | 2 | null }
  | { type: 'sendKitchen' }
  | { type: 'setLunchPacked'; value: boolean }
  | { type: 'sendManifest' }
  | { type: 'reset' };

const STORAGE_KEY = 'cabinroll.demo.v1';

function commit(state: AppState, text: string, mutate: (s: AppState) => void): AppState {
  const next: AppState = structuredClone(state);
  mutate(next);
  next.clock = Math.min(state.clock + 3, 23 * 60);
  next.log = [...next.log, { id: next.nextLogId, time: `Tue 17 Nov ${clockLabel(state.clock)}`, text }];
  next.nextLogId += 1;
  return next;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'reset':
      return initialState();

    case 'confirm': {
      const p = personById(state, action.personId);
      if (!p || p.booking !== 'tentative') return state;
      return commit(state, `Confirmed ${p.name} in ${bunkLabel(p.bunkId ?? '')}.`, (s) => {
        const target = s.people.find((x) => x.id === p.id);
        if (target) target.booking = 'confirmed';
      });
    }

    case 'releasePerson': {
      const p = personById(state, action.personId);
      if (!p || p.booking !== 'tentative' || !p.bunkId) return state;
      const bunkName = bunkLabel(p.bunkId);
      return commit(state, `Released ${p.name} from ${bunkName}. The bunk went back to free stock.`, (s) => {
        const target = s.people.find((x) => x.id === p.id);
        const bunk = bunkById(s, p.bunkId ?? '');
        if (target) {
          target.booking = 'released';
          target.bunkId = null;
          target.trip = null;
        }
        if (bunk) bunk.held = false;
      });
    }

    case 'releaseSlot': {
      const bunk = bunkById(state, action.bunkId);
      if (!bunk || !bunk.held || personInBunk(state, bunk.id)) return state;
      return commit(state, `Released unnamed hold bunk ${bunkLabel(bunk.id)} back to free stock.`, (s) => {
        const target = bunkById(s, bunk.id);
        if (target) target.held = false;
      });
    }

    case 'nameSlot': {
      const bunk = bunkById(state, action.bunkId);
      if (!bunk || !bunk.held || personInBunk(state, bunk.id)) return state;
      const check = checkPlacement(state, { lodging: action.lodging, from: COURSE.from, to: COURSE.to }, bunk.id);
      if (!check.ok) return state;
      const id = `named-${state.nextLogId}-${bunk.id}`;
      const person: Person = {
        id,
        name: action.name.trim(),
        role: action.role,
        lodging: action.lodging,
        isResident: false,
        booking: 'tentative',
        // A newly named person has no signed waiver on file yet.
        waiver: 'incomplete',
        diet: action.diet,
        bunkId: bunk.id,
        trip: null,
        from: COURSE.from,
        to: COURSE.to,
      };
      return commit(state, `Named ${person.name} for ${bunkLabel(bunk.id)} as a tentative booking. Waiver is outstanding.`, (s) => {
        s.people.push(person);
      });
    }

    case 'move': {
      const p = personById(state, action.personId);
      if (!p || !p.bunkId || p.bunkId === action.toBunkId) return state;
      const check = checkPlacement(state, { id: p.id, lodging: p.lodging, from: p.from, to: p.to }, action.toBunkId);
      if (!check.ok) return state;
      const fromBunk = bunkById(state, p.bunkId);
      const toBunk = bunkById(state, action.toBunkId);
      if (!fromBunk || !toBunk) return state;
      const originRestricted = Boolean(restrictionFor(state, p));
      const toWasHeld = toBunk.held;
      const fromLabel = bunkLabel(fromBunk.id);
      const toLabel = bunkLabel(toBunk.id);
      const text = toWasHeld && originRestricted
        ? `Moved ${p.name} from ${fromLabel} to ${toLabel}. ${fromLabel} is restricted, so it left the hold and the hold is one bunk smaller.`
        : `Moved ${p.name} from ${fromLabel} to ${toLabel}.`;
      return commit(state, text, (s) => {
        const target = s.people.find((x) => x.id === p.id);
        const from = bunkById(s, fromBunk.id);
        const to = bunkById(s, toBunk.id);
        if (!target || !from || !to) return;
        to.held = true;
        if (!toWasHeld) from.held = false;
        else if (originRestricted) from.held = false;
        target.bunkId = to.id;
      });
    }

    case 'waiver': {
      const p = personById(state, action.personId);
      if (!p || p.waiver === 'complete') return state;
      return commit(state, `Marked waiver on file for ${p.name}.`, (s) => {
        const target = s.people.find((x) => x.id === p.id);
        if (target) target.waiver = 'complete';
      });
    }

    case 'setTrip': {
      const p = personById(state, action.personId);
      if (!p || p.booking === 'released') return state;
      const tripText = action.trip === null ? 'off the boat manifest' : `on trip ${action.trip}`;
      return commit(state, `Put ${p.name} ${tripText}.`, (s) => {
        const target = s.people.find((x) => x.id === p.id);
        if (target) target.trip = action.trip;
      });
    }

    case 'sendKitchen': {
      const c = arrivalCovers(state);
      const text = `Sent kitchen the count for Wed 18 Nov: breakfast ${c.B.confirmedTotal}, lunch ${c.L.confirmedTotal}, dinner ${c.D.confirmedTotal} (plus ${c.D.pendingTotal} pending).`;
      return commit(state, text, (s) => {
        s.kitchen = { B: c.B.confirmedTotal, L: c.L.confirmedTotal, D: c.D.confirmedTotal };
      });
    }

    case 'setLunchPacked': {
      if (action.value === state.lunchPackedForBoat) return state;
      const text = action.value
        ? 'Course lunch on Wed 18 Nov is packed for the boat, so lunch counts include the course.'
        : 'Course lunch on Wed 18 Nov is served on site, so lunch counts are residents only.';
      return commit(state, text, (s) => {
        s.lunchPackedForBoat = action.value;
      });
    }

    case 'sendManifest': {
      const trip1 = state.people.filter((p) => p.trip === 1 && p.booking !== 'released').length;
      const trip2 = state.people.filter((p) => p.trip === 2 && p.booking !== 'released').length;
      return commit(state, `Marked boat manifest as sent to the captain: trip 1 with ${trip1}, trip 2 with ${trip2}.`, (s) => {
        s.manifestSentKey = manifestKey(s);
      });
    }

    default:
      return state;
  }
}

/** Returns the state that would result from an action, without changing anything. */
export function previewAction(state: AppState, action: Action): AppState {
  return reducer(state, action);
}

// ---------- React wiring ----------

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && Array.isArray(parsed.people) && Array.isArray(parsed.bunks) && typeof parsed.clock === 'number') {
        return parsed;
      }
    }
  } catch {
    // Storage unavailable or corrupt: fall back to the seeded scenario.
  }
  return { ...initialState(), clock: START_MINUTE };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota or privacy-mode errors; the app still works in memory.
    }
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
