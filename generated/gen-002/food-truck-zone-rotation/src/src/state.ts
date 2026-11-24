import { Assignment, INITIAL_ASSIGNMENTS } from './data/seed';
import { RequestStatus, SWAP_REQUESTS } from './data/requests';

export interface Snapshot {
  assignments: Assignment[];
  requests: Record<string, RequestStatus>;
  acks: string[];
}

export interface LogEntry {
  label: string;
  time: string;
}

export interface AppState {
  doc: Snapshot;
  past: { doc: Snapshot; entry: LogEntry }[];
  future: { doc: Snapshot; entry: LogEntry }[];
  reminders: Record<string, string>;
  reviewedForms: string[];
  nextId: number;
  published: boolean;
}

export type Action =
  | { type: 'commit'; label: string; doc: Snapshot }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'remind'; truckIds: string[]; time: string }
  | { type: 'reviewForm'; truckId: string }
  | { type: 'revert' }
  | { type: 'publish' };

const STORAGE_KEY = 'curbrota.dec2026.v2';

export const initialDoc = (): Snapshot => ({
  assignments: INITIAL_ASSIGNMENTS,
  requests: Object.fromEntries(SWAP_REQUESTS.map((r) => [r.id, 'pending' as RequestStatus])),
  acks: [],
});

export function initState(): AppState {
  const base: AppState = {
    doc: initialDoc(),
    past: [],
    future: [],
    reminders: {},
    reviewedForms: [],
    nextId: 900,
    published: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...base, ...saved, future: [] };
    }
  } catch {
    /* ignore */
  }
  return base;
}

export function persist(s: AppState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        doc: s.doc,
        past: s.past.slice(-60),
        reminders: s.reminders,
        reviewedForms: s.reviewedForms,
        nextId: s.nextId,
        published: s.published,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function clockTime(): string {
  // The session starts at 8:47 AM Monday; advance with real elapsed minutes.
  const elapsed = Math.floor((Date.now() - SESSION_START) / 60000);
  const mins = 8 * 60 + 47 + elapsed;
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
const SESSION_START = Date.now();

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'commit':
      return {
        ...s,
        doc: a.doc,
        past: [...s.past, { doc: s.doc, entry: { label: a.label, time: clockTime() } }],
        future: [],
        nextId: s.nextId + 10,
        published: false,
      };
    case 'undo': {
      const last = s.past[s.past.length - 1];
      if (!last) return s;
      return { ...s, doc: last.doc, past: s.past.slice(0, -1), future: [{ doc: s.doc, entry: last.entry }, ...s.future] };
    }
    case 'redo': {
      const next = s.future[0];
      if (!next) return s;
      return { ...s, doc: next.doc, past: [...s.past, { doc: s.doc, entry: next.entry }], future: s.future.slice(1) };
    }
    case 'remind': {
      const r = { ...s.reminders };
      a.truckIds.forEach((id) => (r[id] = a.time));
      return { ...s, reminders: r };
    }
    case 'reviewForm':
      return s.reviewedForms.includes(a.truckId) ? s : { ...s, reviewedForms: [...s.reviewedForms, a.truckId] };
    case 'revert':
      return { doc: initialDoc(), past: [], future: [], reminders: {}, reviewedForms: [], nextId: s.nextId, published: false };
    case 'publish':
      return { ...s, published: true };
  }
}
