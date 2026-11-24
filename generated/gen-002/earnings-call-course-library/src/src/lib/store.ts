import type { SavedState } from '../types';
import { initialState } from '../data/catalog';

const KEY = 'callroom.state.v1';

/** Loads saved progress, falling back to the seeded state if nothing is stored or it is unreadable. */
export function loadState(): SavedState {
  const seed = initialState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    if (parsed.version !== 1) return seed;
    return {
      version: 1,
      positions: parsed.positions ?? seed.positions,
      completed: parsed.completed ?? seed.completed,
      clips: Array.isArray(parsed.clips) ? parsed.clips : seed.clips,
      queue: Array.isArray(parsed.queue) ? parsed.queue : seed.queue,
      rate: typeof parsed.rate === 'number' ? parsed.rate : seed.rate,
    };
  } catch {
    return seed;
  }
}

export function saveState(state: SavedState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode, quota). The app still works for this session.
  }
}
