import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { NOW, type GlyphStatus, type PersonId, type Script, type StyleId } from './data/core';
import { initialStatuses, glyphByChar, skey, type StatusMap } from './data/glyphs';
import { REVISIONS, revisedByStyle, type Decision } from './data/revisions';
import { KERN_PAIRS, LIVE_QUEUE, type KernDecision, type KernPair } from './data/kerning';
import { THREADS, type Thread } from './data/comments';
import { INITIAL_ACCESS, type Access } from './data/access';

export type View = 'today' | 'review' | 'kerning' | 'glyphs' | 'comments' | 'people' | 'release';
export interface Route { view: View; id?: string }

export interface Toast { id: number; text: string; undo?: Action }

export interface State {
  now: number; // simulated clock, advances in real time
  route: Route;
  statuses: StatusMap;
  decisions: Record<string, { decision: Decision; comment?: string; at: number }>;
  kernPairs: KernPair[];
  kern: Record<string, KernDecision>;
  liveNew: number; // pairs Jonas changed since Ines opened the app
  jonasCursor: { left: string; right: string; value: number };
  threads: Thread[];
  access: Record<PersonId, Access>;
  locks: string[]; // `${style}:${script}`
  share: { marieke: { scope: 'all' | 'regular-latin'; resentAt?: number; message?: string } };
  toasts: Toast[];
}

export type Action =
  | { type: 'go'; route: Route }
  | { type: 'tick' }
  | { type: 'decide'; id: string; decision: Decision; comment?: string }
  | { type: 'setStatus'; style: StyleId; glyphId: string; status: GlyphStatus }
  | { type: 'kern'; ids: string[]; decision: KernDecision }
  | { type: 'liveKern' }
  | { type: 'reply'; threadId: string; text: string }
  | { type: 'resolve'; threadId: string; resolved: boolean }
  | { type: 'newThread'; thread: Thread }
  | { type: 'access'; person: PersonId; patch: Partial<Access> }
  | { type: 'lock'; key: string; on: boolean }
  | { type: 'share'; scope: 'all' | 'regular-latin'; message?: string; resend?: boolean }
  | { type: 'toast'; text: string; undo?: Action }
  | { type: 'dismiss'; id: number }
  | { type: 'restore'; state: Partial<State> };

let toastId = 0;
let threadSeq = 100;

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const [view, id] = h.split('/');
  const views: View[] = ['today', 'review', 'kerning', 'glyphs', 'comments', 'people', 'release'];
  if (views.includes(view as View)) return { view: view as View, id: id ? decodeURIComponent(id) : undefined };
  return { view: 'today' };
}

export function initialState(): State {
  return {
    now: NOW,
    route: parseHash(),
    statuses: initialStatuses(revisedByStyle()),
    decisions: Object.fromEntries(REVISIONS.map((r) => [r.id, { decision: 'pending' as Decision, at: r.at }])),
    kernPairs: KERN_PAIRS,
    kern: Object.fromEntries(KERN_PAIRS.map((p) => [p.id, 'pending' as KernDecision])),
    liveNew: 0,
    jonasCursor: { left: 'Y', right: 'o', value: -72 },
    threads: THREADS,
    access: INITIAL_ACCESS,
    locks: [],
    share: { marieke: { scope: 'all' } },
    toasts: [],
  };
}

let liveIdx = 0;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'go':
      return { ...s, route: a.route };
    case 'tick':
      return { ...s, now: s.now + 1 };
    case 'decide': {
      const rev = REVISIONS.find((r) => r.id === a.id)!;
      const g = glyphByChar(rev.ch)!;
      const status: GlyphStatus = a.decision === 'approved' ? 'approved' : a.decision === 'sent-back' ? 'draft' : 'review';
      let threads = s.threads;
      if (a.decision === 'sent-back' && a.comment) {
        threads = [
          {
            id: `th-${++threadSeq}`, ch: rev.ch, style: rev.style, subject: `Sent back: ${rev.ch} ${rev.style === 'bold' ? 'Bold' : rev.style === 'light' ? 'Light' : 'Regular'}`,
            to: rev.author, resolved: false, messages: [{ id: `m-${threadSeq}`, author: 'ines', at: s.now, text: a.comment }],
          },
          ...threads,
        ];
      }
      return {
        ...s,
        threads,
        decisions: { ...s.decisions, [a.id]: { decision: a.decision, comment: a.comment, at: s.now } },
        statuses: { ...s.statuses, [skey(rev.style, g.id)]: status },
      };
    }
    case 'setStatus':
      return { ...s, statuses: { ...s.statuses, [skey(a.style, a.glyphId)]: a.status } };
    case 'kern': {
      const kern = { ...s.kern };
      for (const id of a.ids) kern[id] = a.decision;
      return { ...s, kern };
    }
    case 'liveKern': {
      const [l, r, v] = LIVE_QUEUE[liveIdx % LIVE_QUEUE.length];
      liveIdx++;
      const id = l + r;
      const existing = s.kernPairs.find((p) => p.id === id);
      const kernPairs = existing
        ? s.kernPairs.map((p) => (p.id === id ? { ...p, after: v, at: s.now } : p))
        : [...s.kernPairs, { id, left: l, right: r, before: null, after: v, at: s.now, unsure: false, context: `${l}${r}` }];
      const [nl, nr, nv] = LIVE_QUEUE[liveIdx % LIVE_QUEUE.length];
      return {
        ...s, kernPairs, kern: { ...s.kern, [id]: 'pending' }, liveNew: s.liveNew + 1,
        jonasCursor: { left: nl, right: nr, value: nv },
      };
    }
    case 'reply':
      return {
        ...s,
        threads: s.threads.map((t) => (t.id === a.threadId
          ? { ...t, messages: [...t.messages, { id: `m-${++threadSeq}`, author: 'ines' as PersonId, at: s.now, text: a.text }] }
          : t)),
      };
    case 'resolve':
      return { ...s, threads: s.threads.map((t) => (t.id === a.threadId ? { ...t, resolved: a.resolved } : t)) };
    case 'newThread':
      return { ...s, threads: [a.thread, ...s.threads] };
    case 'access':
      return { ...s, access: { ...s.access, [a.person]: { ...s.access[a.person], ...a.patch } } };
    case 'lock':
      return { ...s, locks: a.on ? [...new Set([...s.locks, a.key])] : s.locks.filter((k) => k !== a.key) };
    case 'share':
      return {
        ...s,
        share: { marieke: { scope: a.scope, message: a.message ?? s.share.marieke.message, resentAt: a.resend ? s.now : s.share.marieke.resentAt } },
        access: a.scope === 'regular-latin'
          ? { ...s.access, marieke: { ...s.access.marieke, styles: ['regular'] } }
          : { ...s.access, marieke: { ...s.access.marieke, styles: 'all' } },
      };
    case 'toast':
      return { ...s, toasts: [...s.toasts.slice(-2), { id: ++toastId, text: a.text, undo: a.undo }] };
    case 'dismiss':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'restore':
      return { ...s, ...a.state };
  }
}

const Ctx = createContext<{ s: State; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, initialState);
  const routeRef = useRef(s.route);

  // hash <-> route
  useEffect(() => {
    routeRef.current = s.route;
    const h = `#/${s.route.view}${s.route.id ? '/' + encodeURIComponent(s.route.id) : ''}`;
    if (location.hash !== h) history.pushState(null, '', h);
  }, [s.route]);
  useEffect(() => {
    const on = () => dispatch({ type: 'go', route: parseHash() });
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);

  // simulated clock: one app-minute per real minute; Jonas lands an edit roughly every 50 s
  useEffect(() => {
    const clock = setInterval(() => dispatch({ type: 'tick' }), 60_000);
    const jonas = setInterval(() => dispatch({ type: 'liveKern' }), 50_000);
    return () => { clearInterval(clock); clearInterval(jonas); };
  }, []);

  return <Ctx.Provider value={{ s, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('no store');
  return c;
}

export const lockKey = (style: StyleId, script: Script) => `${style}:${script}`;

export function useGo() {
  const { dispatch } = useStore();
  return (view: View, id?: string) => {
    dispatch({ type: 'go', route: { view, id } });
    document.querySelector('.main')?.scrollTo({ top: 0 });
  };
}

export function useToast() {
  const { dispatch } = useStore();
  return (text: string, undo?: Action) => dispatch({ type: 'toast', text, undo });
}
