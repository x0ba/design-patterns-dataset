import type { Bookmark, BookmarkKind, Item } from './types';
import { tours } from './data/tours';
import { AZULEJO_ID, lectures } from './data/lectures';
import { RIBEIRA_ID, ribeiraBookmarks } from './data/ribeira';

export type View = 'now' | 'tours' | 'lectures' | 'bookmarks';

export interface State {
  items: Record<string, Item>;
  order: { tours: string[]; lectures: string[] };
  currentId: string;
  position: number;
  playing: boolean;
  speed: number;
  bookmarks: Bookmark[];
  queue: string[];
  /** most recently left items, newest first */
  recent: string[];
  view: View;
  /** id of a bookmark whose note field should take focus */
  focusBookmark: string | null;
  /** request from elsewhere in the UI to search the transcript */
  searchRequest: { text: string; id: number } | null;
  toast: { id: number; text: string; undo?: Action } | null;
}

export type Action =
  | { type: 'tick'; dt: number }
  | { type: 'toggle' }
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'seek'; t: number; play?: boolean }
  | { type: 'skip'; by: number }
  | { type: 'speed'; speed: number }
  | { type: 'load'; id: string; play?: boolean; at?: number }
  | { type: 'addBookmark'; t?: number; kind?: BookmarkKind; note?: string }
  | { type: 'restoreBookmark'; bookmark: Bookmark }
  | { type: 'updateBookmark'; id: string; note?: string; kind?: BookmarkKind }
  | { type: 'deleteBookmark'; id: string }
  | { type: 'focused' }
  | { type: 'queueAdd'; id: string; next?: boolean }
  | { type: 'queueRemove'; index: number }
  | { type: 'queueMove'; index: number; dir: -1 | 1 }
  | { type: 'queuePlay'; index: number }
  | { type: 'view'; view: View }
  | { type: 'toast'; text: string; undo?: Action }
  | { type: 'clearToast' }
  | { type: 'search'; text: string };

const allItems = [...tours, ...lectures];

export const initialState: State = {
  items: Object.fromEntries(allItems.map((i) => [i.id, i])),
  order: { tours: tours.map((t) => t.id), lectures: lectures.map((l) => l.id) },
  currentId: RIBEIRA_ID,
  position: tours[0].position,
  playing: true,
  speed: 1.25,
  bookmarks: ribeiraBookmarks,
  queue: ['lec-baroque', 'tour-se-2026-04-11', 'lec-brasileiros'],
  recent: [AZULEJO_ID],
  view: 'now',
  focusBookmark: null,
  searchRequest: null,
  toast: null,
};

let bmCounter = 100;
let toastCounter = 1;

function saveCurrent(state: State): Record<string, Item> {
  const cur = state.items[state.currentId];
  const atEnd = state.position >= cur.duration - 1;
  return {
    ...state.items,
    [cur.id]: { ...cur, position: atEnd ? 0 : state.position, played: Math.max(cur.played, state.position) },
  };
}

function loadItem(state: State, id: string, play: boolean, at?: number): State {
  if (id === state.currentId) {
    return { ...state, position: at ?? state.position, playing: play, view: 'now' };
  }
  const items = saveCurrent(state);
  const next = items[id];
  return {
    ...state,
    items,
    currentId: id,
    position: at ?? next.position,
    playing: play,
    view: 'now',
    queue: state.queue.filter((q) => q !== id),
    recent: [state.currentId, ...state.recent.filter((r) => r !== id && r !== state.currentId)],
  };
}

export function reducer(state: State, a: Action): State {
  const cur = state.items[state.currentId];
  switch (a.type) {
    case 'tick': {
      if (!state.playing) return state;
      const pos = state.position + a.dt * state.speed;
      if (pos >= cur.duration) {
        if (state.queue.length) {
          const [nextId, ...rest] = state.queue;
          const s = loadItem({ ...state, position: cur.duration }, nextId, true);
          return { ...s, queue: rest };
        }
        return { ...state, position: cur.duration, playing: false };
      }
      return { ...state, position: pos };
    }
    case 'toggle':
      if (!state.playing && state.position >= cur.duration - 0.5) return { ...state, position: 0, playing: true };
      return { ...state, playing: !state.playing };
    case 'setPlaying':
      return { ...state, playing: a.playing };
    case 'seek':
      return { ...state, position: Math.max(0, Math.min(cur.duration, a.t)), playing: a.play ?? state.playing };
    case 'skip':
      return { ...state, position: Math.max(0, Math.min(cur.duration, state.position + a.by)) };
    case 'speed':
      return { ...state, speed: a.speed };
    case 'load':
      return loadItem(state, a.id, a.play ?? true, a.at);
    case 'addBookmark': {
      const t = Math.floor(a.t ?? state.position);
      const id = `bm${++bmCounter}`;
      const kind = a.kind ?? 'note';
      const bm: Bookmark = {
        id,
        itemId: state.currentId,
        t,
        note: a.note ?? '',
        kind,
        created: new Date().toISOString(),
      };
      return { ...state, bookmarks: [...state.bookmarks, bm], focusBookmark: kind === 'note' ? id : null };
    }
    case 'restoreBookmark':
      return { ...state, bookmarks: [...state.bookmarks, a.bookmark] };
    case 'updateBookmark':
      return {
        ...state,
        bookmarks: state.bookmarks.map((b) =>
          b.id === a.id ? { ...b, note: a.note ?? b.note, kind: a.kind ?? b.kind } : b,
        ),
      };
    case 'deleteBookmark':
      return { ...state, bookmarks: state.bookmarks.filter((b) => b.id !== a.id) };
    case 'focused':
      return { ...state, focusBookmark: null };
    case 'queueAdd': {
      const q = state.queue.filter((x) => x !== a.id);
      return { ...state, queue: a.next ? [a.id, ...q] : [...q, a.id] };
    }
    case 'queueRemove':
      return { ...state, queue: state.queue.filter((_, i) => i !== a.index) };
    case 'queueMove': {
      const q = [...state.queue];
      const j = a.index + a.dir;
      if (j < 0 || j >= q.length) return state;
      [q[a.index], q[j]] = [q[j], q[a.index]];
      return { ...state, queue: q };
    }
    case 'queuePlay': {
      const id = state.queue[a.index];
      if (!id) return state;
      return loadItem(state, id, true);
    }
    case 'view':
      return { ...state, view: a.view };
    case 'toast':
      return { ...state, toast: { id: ++toastCounter, text: a.text, undo: a.undo } };
    case 'clearToast':
      return { ...state, toast: null };
    case 'search':
      return { ...state, view: 'now', searchRequest: { text: a.text, id: ++toastCounter } };
  }
}

/** Effective saved position for an item (live position if current). */
export function positionOf(state: State, id: string): number {
  return id === state.currentId ? state.position : state.items[id].position;
}
