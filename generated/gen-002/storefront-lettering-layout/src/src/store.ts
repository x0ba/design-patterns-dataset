import type { Doc, El, Finishes } from './types';

export interface State {
  doc: Doc;
  selected: string | null;
  past: Doc[];
  future: Doc[];
  gesture: Doc | null;
  lastKey: string;
  lastTime: number;
}

export type Action =
  | { t: 'select'; id: string | null }
  | { t: 'begin' }
  | { t: 'live'; id: string; patch: Partial<El> }
  | { t: 'end' }
  | { t: 'edit'; id: string; patch: Partial<El>; key: string }
  | { t: 'finishes'; patch: Partial<Finishes>; key: string }
  | { t: 'add'; el: El }
  | { t: 'remove'; id: string }
  | { t: 'duplicate'; id: string; newId: string }
  | { t: 'undo' }
  | { t: 'redo' }
  | { t: 'restore'; doc: Doc };

const LIMIT = 100;

function push(s: State, next: Doc, key = '', now = Date.now()): State {
  const coalesce = key !== '' && key === s.lastKey && now - s.lastTime < 900;
  return {
    ...s,
    doc: next,
    past: coalesce ? s.past : [...s.past.slice(-LIMIT), s.doc],
    future: [],
    lastKey: key,
    lastTime: now,
  };
}

const mapEl = (doc: Doc, id: string, patch: Partial<El>): Doc => ({
  ...doc,
  elements: doc.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
});

export function reducer(s: State, a: Action): State {
  switch (a.t) {
    case 'select':
      return { ...s, selected: a.id };
    case 'begin':
      return { ...s, gesture: s.doc };
    case 'live':
      return { ...s, doc: mapEl(s.doc, a.id, a.patch) };
    case 'end': {
      if (!s.gesture) return s;
      if (s.gesture === s.doc) return { ...s, gesture: null };
      return { ...s, gesture: null, past: [...s.past.slice(-LIMIT), s.gesture], future: [], lastKey: '' };
    }
    case 'edit':
      return push(s, mapEl(s.doc, a.id, a.patch), a.key);
    case 'finishes':
      return push(s, { ...s.doc, finishes: { ...s.doc.finishes, ...a.patch } }, a.key);
    case 'add':
      return { ...push(s, { ...s.doc, elements: [...s.doc.elements, a.el] }), selected: a.el.id };
    case 'remove': {
      const els = s.doc.elements.filter((e) => e.id !== a.id);
      return { ...push(s, { ...s.doc, elements: els }), selected: s.selected === a.id ? null : s.selected };
    }
    case 'duplicate': {
      const src = s.doc.elements.find((e) => e.id === a.id);
      if (!src) return s;
      const copy: El = { ...src, id: a.newId, name: `${src.name} copy`, x: src.x + 2, y: src.y - 2, locked: false };
      return { ...push(s, { ...s.doc, elements: [...s.doc.elements, copy] }), selected: a.newId };
    }
    case 'undo': {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { ...s, doc: prev, past: s.past.slice(0, -1), future: [s.doc, ...s.future], lastKey: '' };
    }
    case 'redo': {
      if (!s.future.length) return s;
      const [next, ...rest] = s.future;
      return { ...s, doc: next, past: [...s.past, s.doc], future: rest, lastKey: '' };
    }
    case 'restore':
      return { ...push(s, a.doc), selected: null };
  }
}
