import type { Doc } from './model';

export interface Hist {
  past: Doc[];
  present: Doc;
  future: Doc[];
}

export type Action =
  | { type: 'apply'; fn: (d: Doc) => Doc; live?: boolean }
  | { type: 'checkpoint' }
  | { type: 'endGesture' }
  | { type: 'undo' }
  | { type: 'redo' };

const LIMIT = 80;

export function histReducer(h: Hist, a: Action): Hist {
  switch (a.type) {
    case 'apply': {
      const next = a.fn(h.present);
      if (next === h.present) return h;
      if (a.live) return { ...h, present: next };
      return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [] };
    }
    case 'checkpoint':
      return { past: [...h.past, h.present].slice(-LIMIT), present: h.present, future: [] };
    case 'endGesture':
      if (h.past[h.past.length - 1] === h.present) return { ...h, past: h.past.slice(0, -1) };
      return h;
    case 'undo': {
      if (!h.past.length) return h;
      const prev = h.past[h.past.length - 1];
      return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
    }
    case 'redo': {
      if (!h.future.length) return h;
      const [next, ...rest] = h.future;
      return { past: [...h.past, h.present], present: next, future: rest };
    }
  }
}
