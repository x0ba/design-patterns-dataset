import { useSyncExternalStore } from 'react';
import type { Settings } from '../types';
import { seedSettings } from '../data/seed';
import { nowMs } from './time';

/**
 * Two copies of the settings: `live` is what new calls use, `draft` is what Rafa
 * is editing. Testing on a call uses the draft, so changes can be checked before
 * they go live. Everything persists to localStorage so a reload doesn't lose work.
 */
export interface AppState {
  live: Settings;
  draft: Settings;
  liveSavedAt: number;
  /** Flagged call ids Rafa has reviewed and cleared. */
  cleared: string[];
  notice: string | null;
}

const KEY = 'holdfast-reception:v1';
/** When the live settings were last saved before this session (Sat Nov 14, 2:30 PM). */
const SEED_SAVED_AT = Date.parse('2026-11-14T14:30:00-07:00');

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function initial(): AppState {
  return {
    live: clone(seedSettings),
    draft: clone(seedSettings),
    liveSavedAt: SEED_SAVED_AT,
    cleared: [],
    notice: null,
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (parsed.live && parsed.draft && Array.isArray(parsed.cleared)) {
        return {
          live: parsed.live,
          draft: parsed.draft,
          liveSavedAt: parsed.liveSavedAt ?? SEED_SAVED_AT,
          cleared: parsed.cleared,
          notice: null,
        };
      }
    }
  } catch {
    /* fall through to seed data */
  }
  return initial();
}

let state: AppState = load();
const listeners = new Set<() => void>();

function commit(next: AppState, persist = true) {
  state = next;
  if (persist) {
    try {
      const { notice: _notice, ...rest } = next;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      /* storage full or disabled: keep working in memory */
    }
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export function updateDraft(change: (d: Settings) => Settings) {
  commit({ ...state, draft: change(clone(state.draft)) });
}

export function saveDraft() {
  commit({
    ...state,
    live: clone(state.draft),
    liveSavedAt: nowMs(),
    notice: 'Saved. New calls use these settings.',
  });
  clearNoticeLater();
}

export function discardDraft() {
  commit({ ...state, draft: clone(state.live), notice: 'Unsaved changes discarded.' });
  clearNoticeLater();
}

export function clearFlag(callId: string) {
  if (state.cleared.includes(callId)) return;
  commit({ ...state, cleared: [...state.cleared, callId], notice: 'Marked as reviewed.' });
  clearNoticeLater();
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  commit(initial(), false);
}

let noticeTimer: number | undefined;
function clearNoticeLater() {
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    if (state.notice) commit({ ...state, notice: null }, false);
  }, 3500);
}

const AREAS: Array<[string, (s: Settings) => unknown]> = [
  ['Opening line and disclosure', (s) => [s.greeting, s.disclosureOn, s.disclosureLine]],
  ['Tone and voice', (s) => [s.formality, s.voice, s.spanishOn]],
  ['Text alerts', (s) => [s.alertIntent, s.alertPhrases]],
  ['Rules', (s) => s.rules],
  ['Prices and services', (s) => s.services],
  ['Hours and booking window', (s) => [s.hours, s.bookingWindowHours]],
  ['Service area', (s) => s.cities],
  ['Business profile', (s) => s.profile],
];

/** Names the parts of the draft that differ from live settings. */
export function changedAreas(live: Settings, draft: Settings): string[] {
  return AREAS.filter(([, pick]) => JSON.stringify(pick(live)) !== JSON.stringify(pick(draft))).map(([name]) => name);
}
