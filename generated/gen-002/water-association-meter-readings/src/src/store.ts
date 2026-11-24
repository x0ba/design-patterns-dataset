import { BY_METER, Entry, TODAY, seedEntries } from './data';
import { evaluate } from './logic';

export interface State {
  entries: Record<string, Entry>;
  locked: boolean;
  lockedOn: string | null;
}

export type Action =
  | { type: 'setReading'; meter: string; value: number | null }
  | { type: 'correct'; meter: string; value: number; note: string }
  | { type: 'keep'; meter: string; note: string }
  | { type: 'swap'; meter: string; oldFinal: number; note: string }
  | { type: 'reopenReview'; meter: string }
  | { type: 'lock' }
  | { type: 'unlock' }
  | { type: 'reset' };

const KEY = 'wellshare.cycle-2026-10.v1';

export const initialState = (): State => ({ entries: seedEntries(), locked: false, lockedOn: null });

export function loadState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s && s.entries && Object.keys(s.entries).length === Object.keys(seedEntries()).length) return s;
    }
  } catch {
    /* ignore */
  }
  return initialState();
}

export function saveState(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function reducer(state: State, a: Action): State {
  if (a.type === 'reset') return initialState();
  if (a.type === 'lock') return { ...state, locked: true, lockedOn: TODAY };
  if (a.type === 'unlock') return { ...state, locked: false, lockedOn: null };
  if (state.locked) return state;

  const cur = state.entries[a.meter];
  const c = BY_METER[a.meter];
  let next: Entry = cur;

  switch (a.type) {
    case 'setReading': {
      if (cur.reading === a.value) return state;
      next = {
        ...cur,
        reading: a.value,
        // a note about a kept reading belongs to that reading only
        resolution: cur.resolution?.type === 'kept' ? null : cur.resolution,
        confirmedKey: null,
      };
      break;
    }
    case 'correct': {
      next = {
        ...cur,
        reading: a.value,
        confirmedKey: null,
        resolution: { type: 'corrected', from: cur.reading ?? undefined, note: a.note, on: TODAY },
      };
      break;
    }
    case 'keep': {
      const ev = evaluate(c, cur);
      next = { ...cur, confirmedKey: ev.key, resolution: { type: 'kept', note: a.note, on: TODAY } };
      break;
    }
    case 'swap': {
      next = {
        ...cur,
        swapped: true,
        oldFinal: a.oldFinal,
        confirmedKey: null,
        resolution: { type: 'replaced', note: a.note, on: TODAY },
      };
      break;
    }
    case 'reopenReview': {
      next = { ...cur, confirmedKey: null, resolution: null };
      break;
    }
  }
  return { ...state, entries: { ...state.entries, [a.meter]: next } };
}
