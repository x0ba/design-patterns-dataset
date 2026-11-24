import { DEFAULT_FILTERS } from './lib/model';
import type { Filters, SortKey } from './types';

/**
 * What the kiosk is showing. `returnTo` remembers where 'Back' should go, so a
 * sheet opened from a comparison returns to that comparison.
 */
export type View =
  | { kind: 'welcome' }
  | { kind: 'results'; tab: 'sheets' | 'map' }
  | { kind: 'sheet'; id: string; returnTo: View }
  | { kind: 'compare'; leftId: string; rightId: string; returnTo: View }
  | { kind: 'exhibit'; returnTo: View };

export interface UndoEntry {
  filters: Filters;
  coalesce: boolean; // a text edit that should merge with the next text edits
}

export interface AppState {
  view: View;
  filters: Filters;
  sort: SortKey;
  undo: UndoEntry[];
}

export type Action =
  | { type: 'go'; view: View }
  | { type: 'setFilters'; patch: Partial<Filters>; coalesce?: boolean }
  | { type: 'clearFilters' }
  | { type: 'replaceFilters'; filters: Filters }
  | { type: 'undo' }
  | { type: 'sort'; sort: SortKey }
  | { type: 'reset' };

export const INITIAL_STATE: AppState = {
  view: { kind: 'welcome' },
  filters: DEFAULT_FILTERS,
  sort: 'date-asc',
  undo: [],
};

const UNDO_LIMIT = 40;

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'go':
      return { ...state, view: action.view };

    case 'setFilters': {
      const next: Filters = { ...state.filters, ...action.patch };
      const changed = (Object.keys(action.patch) as (keyof Filters)[]).some(
        (k) => !sameValue(state.filters[k], next[k])
      );
      if (!changed) return state;
      const last = state.undo[state.undo.length - 1];
      const merge = Boolean(action.coalesce) && Boolean(last?.coalesce);
      const undo = merge
        ? state.undo
        : [...state.undo, { filters: state.filters, coalesce: Boolean(action.coalesce) }].slice(-UNDO_LIMIT);
      return { ...state, filters: next, undo };
    }

    case 'replaceFilters': {
      if (sameValue(state.filters, action.filters)) return state;
      return {
        ...state,
        filters: action.filters,
        undo: [...state.undo, { filters: state.filters, coalesce: false }].slice(-UNDO_LIMIT),
      };
    }

    case 'clearFilters': {
      if (sameValue(state.filters, DEFAULT_FILTERS)) return state;
      return {
        ...state,
        filters: DEFAULT_FILTERS,
        undo: [...state.undo, { filters: state.filters, coalesce: false }].slice(-UNDO_LIMIT),
      };
    }

    case 'undo': {
      const last = state.undo[state.undo.length - 1];
      if (!last) return state;
      return { ...state, filters: last.filters, undo: state.undo.slice(0, -1) };
    }

    case 'sort':
      return { ...state, sort: action.sort };

    case 'reset':
      return INITIAL_STATE;
  }
}
