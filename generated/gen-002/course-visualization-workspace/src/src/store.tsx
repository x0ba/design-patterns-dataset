import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NOW_ISO } from './data/course';
import { CORE_IDS } from './data/bike';

// ---------------- Clock ----------------
const BOOT = Date.now();
const NOW0 = new Date(NOW_ISO).getTime();
export function nowMs() {
  return NOW0 + (Date.now() - BOOT);
}
export function useNow(intervalMs = 10000) {
  const [t, setT] = useState(nowMs());
  useEffect(() => {
    const id = setInterval(() => setT(nowMs()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}

// ---------------- Router ----------------
export interface Route { path: string; parts: string[]; query: URLSearchParams }
function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/ps/4';
  const [p, q] = raw.split('?');
  const path = p.startsWith('/') ? p : '/' + p;
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(q || '') };
}
export function navigate(to: string) {
  if (window.location.hash !== '#' + to) window.location.hash = to;
}
export function useRoute() {
  const [r, setR] = useState(parseHash);
  useEffect(() => {
    const on = () => {
      setR(parseHash());
      document.querySelector('.main-scroll')?.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

// ---------------- App state ----------------
export type Encoding = 'lines' | 'multiples' | 'heatmap' | 'indexed' | 'stacked';
export interface Attempt {
  id: string;
  title: string;
  encoding: Encoding;
  counters: string[];
  from: number;
  to: number;
  sharedY: boolean;
  markGap: boolean;
  notes: string;
  status: 'done' | 'in progress' | 'started';
}
export interface DraftState { version: number; attempts: Attempt[]; active: string; writeup: string; savedAt: string; leftOff: string; submittedAt?: number }
export interface Pin { n: number; x: number; y: number }
export interface CritiqueState { ratings: Record<string, number>; comments: Record<string, string>; pins: Pin[]; submittedAt?: number; lastEdited?: number }
export interface TrailEntry { path: string; label: string; at: number }
export interface AppState {
  opened: Record<string, number>;
  read: Record<string, boolean>;
  draft: DraftState;
  critiques: Record<string, CritiqueState>;
  lecturePos: number;
  lectureChapters: Record<string, number>; // seconds actually played per chapter (keyed by chapter start)
  slidePos: { a: number; b: number };
  trail: TrailEntry[];
  dismissed: Record<string, boolean>;
}

const twoDaysAgo = new Date('2026-11-15T14:14:00-08:00').getTime();
const longAgo = new Date('2026-11-01T10:00:00-07:00').getTime();

const initialOpened: Record<string, number> = {};
['r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08', 'r09', 'r10', 'r11', 'r12', 'r16'].forEach((id) => (initialOpened[id] = longAgo));
['coffee-exports', 'dining-waste', 'scripps-sst', 'colour-naming', 'cm-replication', 'life-gdp', 'trolley-ridership', 'co2-mlo', 'sd-bike-counts', 'sd-bike-counts@6', 'reservoirs'].forEach((id) => (initialOpened[id] = longAgo));
initialOpened['lecture-6'] = new Date('2026-11-17T12:40:00-08:00').getTime();

export const INITIAL_STATE: AppState = {
  opened: initialOpened,
  read: { r01: true, r02: true, r04: true, r05: true, r07: true, r08: true, r09: true, r10: true, r11: true },
  draft: {
    version: 6,
    active: 'att-2',
    savedAt: new Date(twoDaysAgo).toISOString(),
    leftOff: 'Attempt 2 · Small multiples — notes on y-scale',
    attempts: [
      { id: 'att-1', title: 'All four counters, one frame', encoding: 'lines', counters: CORE_IDS, from: 2019, to: 2025, sharedY: true, markGap: false, notes: 'Readable for PB vs. Harbor, but 30th St and University Ave tangle together below 8k. Summer peaks at PB squash everything else.', status: 'done' },
      { id: 'att-2', title: 'Small multiples, shared y-scale', encoding: 'multiples', counters: CORE_IDS, from: 2019, to: 2025, sharedY: true, markGap: false, notes: 'Shared y makes PB look huge and 30th St look flat. Independent y would show 30th St’s 2022 jump, but then panels aren’t comparable in magnitude. Need to decide which comparison I care about —', status: 'in progress' },
      { id: 'att-3', title: 'Month × counter heatmap', encoding: 'heatmap', counters: CORE_IDS, from: 2019, to: 2025, sharedY: true, markGap: false, notes: '', status: 'started' },
    ],
    writeup:
      'I compared monthly bike counts at four San Diego counters using three encodings. My first chart superimposes all four counters as lines in one frame. This makes it easy to see which counter is busiest in a given month, because all of the lines share one position scale, but the Pacific Beach Boardwalk dominates the y-axis and the two smaller commuter counters overlap.\n\nMy second chart uses small multiples with a shared y-scale. Each counter gets its own panel, so the lines no longer cross, and seasonal patterns are easier to follow within a counter. The trade-off is that comparing two counters at the same month now requires moving my eyes between panels.\n\nMy third chart is a heatmap with months as columns and counters as rows. I chose it because',
  },
  critiques: {
    'A-0817': { ratings: {}, comments: {}, pins: [] },
    'A-0952': { ratings: {}, comments: {}, pins: [] },
  },
  lecturePos: 0,
  lectureChapters: {},
  slidePos: { a: 0, b: 0 },
  trail: [
    { path: '/week', label: 'This week', at: new Date('2026-11-17T16:38:00-08:00').getTime() },
    { path: '/ps/4', label: 'PS4 brief', at: new Date('2026-11-17T16:41:00-08:00').getTime() },
  ],
  dismissed: {},
};

const KEY = 'plotyard:viz120:dana:v1';

function load(): AppState {
  try {
    if (new URLSearchParams(window.location.search).has('reset')) localStorage.removeItem(KEY);
    const s = localStorage.getItem(KEY);
    if (s) return { ...INITIAL_STATE, ...JSON.parse(s) };
  } catch {
    /* ignore */
  }
  return INITIAL_STATE;
}

interface Ctx {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  markOpened: (id: string) => void;
  toast: (msg: string) => void;
  toasts: { id: number; msg: string }[];
  reset: () => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const tid = useRef(0);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);
  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const markOpened = useCallback(
    (id: string) =>
      setState((s) => (s.opened[id] ? s : { ...s, opened: { ...s.opened, [id]: nowMs() } })),
    [],
  );
  const toast = useCallback((msg: string) => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setState(INITIAL_STATE);
    navigate('/ps/4');
  }, []);
  const value = useMemo(() => ({ state, update, markOpened, toast, toasts, reset }), [state, update, markOpened, toast, toasts, reset]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('no store');
  return c;
}

// ---------------- helpers ----------------
export function wordCount(s: string) {
  return (s.trim().match(/\S+/g) || []).length;
}

export function relTime(ms: number, now: number) {
  const d = now - ms;
  const min = Math.round(d / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export function fmtClock(ms: number) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
}
export function fmtDayTime(ms: number) {
  return new Date(ms).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
}

export function countdown(targetIso: string, now: number) {
  const d = new Date(targetIso).getTime() - now;
  if (d <= 0) return 'past due';
  const h = Math.floor(d / 3600000);
  const m = Math.floor((d % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)} days ${h % 24} h`;
  if (h >= 24) return `1 day ${h - 24} h`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

export const CRITIQUE_DUE = '2026-11-17T23:59:00-08:00';
export const PS4_DUE = '2026-11-19T23:59:00-08:00';
export const MIN_WORDS = 15;

export function critiqueProgress(c: CritiqueState) {
  const ids = ['fit', 'accuracy', 'readability', 'revision'];
  const done = ids.filter((id) => c.ratings[id] && wordCount(c.comments[id] || '') >= MIN_WORDS).length;
  return { done, total: 4 };
}
