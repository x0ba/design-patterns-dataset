import { create } from 'zustand';
import { INITIAL_CLIPS, INITIAL_MARKERS } from './data/review';
import { ROUND_BY_ID, roundsOf } from './data/scrim';
import type { Clip, MapId, Marker, PovId } from './data/types';

export type RoundFilter = 'all' | 'lostdef' | 'def' | 'att';
export type SideTab = 'comms' | 'events' | 'scouting';

export interface ClipDraft {
  editingId?: string;
  roundId: string;
  tIn: number;
  tOut: number;
  pov: PovId;
  speed: number;
  title: string;
  note: string;
  insertAt: number; // index
}

interface Saved { roundId: string; t: number; pov: PovId; speed: number; mapId: MapId }

export interface AppState {
  mapId: MapId;
  roundId: string;
  t: number;
  playing: boolean;
  speed: number;
  pov: PovId;
  prevPov: PovId;
  pip: PovId | null;
  captions: boolean;
  voice: boolean;
  filter: RoundFilter;
  zoom: boolean;
  markers: Marker[];
  clips: Clip[];
  sideTab: SideTab;
  draft: ClipDraft | null;
  markerDraft: { roundId: string; t: number; text: string } | null;
  presenting: number | null;
  saved: Saved | null;
  stopAt: number | null;
  toast: { id: number; text: string; undo?: () => void } | null;
  help: boolean;

  seek: (t: number) => void;
  nudge: (dt: number) => void;
  setPlaying: (p: boolean) => void;
  togglePlay: () => void;
  setSpeed: (s: number) => void;
  setPov: (p: PovId) => void;
  swapPov: () => void;
  setPip: (p: PovId | null) => void;
  openRound: (roundId: string, t?: number) => void;
  openMap: (m: MapId) => void;
  setFilter: (f: RoundFilter) => void;
  set: (p: Partial<AppState>) => void;
  addMarker: (text: string) => void;
  updateMarker: (id: string, text: string) => void;
  removeMarker: (id: string) => void;
  beginClip: (preset?: Partial<ClipDraft>) => void;
  saveDraft: () => void;
  editClip: (id: string) => void;
  removeClip: (id: string) => void;
  moveClip: (from: number, to: number) => void;
  playClip: (id: string) => void;
  startPresent: (i?: number) => void;
  presentGo: (i: number) => void;
  stopPresent: () => void;
  showToast: (text: string, undo?: () => void) => void;
  resetDemo: () => void;
}

const LS = 'backsight.lowtide.review.v1';
function load(): { markers: Marker[]; clips: Clip[] } {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.markers) && Array.isArray(d.clips)) return d;
    }
  } catch { /* ignore */ }
  return { markers: INITIAL_MARKERS, clips: INITIAL_CLIPS };
}
const persisted = load();

let toastN = 0;
let mid = 100;

export const useApp = create<AppState>((set, get) => ({
  mapId: 'foundry',
  roundId: 'foundry-r17',
  t: 48,
  playing: false,
  speed: 0.25,
  pov: 'Juno',
  prevPov: 'Kael',
  pip: null,
  captions: true,
  voice: true,
  filter: 'lostdef',
  zoom: false,
  markers: persisted.markers,
  clips: persisted.clips,
  sideTab: 'comms',
  draft: null,
  markerDraft: null,
  presenting: null,
  saved: null,
  stopAt: null,
  toast: null,
  help: false,

  seek: (t) => {
    const r = ROUND_BY_ID[get().roundId];
    set({ t: Math.max(0, Math.min(r.duration, t)) });
  },
  nudge: (dt) => get().seek(get().t + dt),
  setPlaying: (p) => {
    const s = get();
    const r = ROUND_BY_ID[s.roundId];
    if (p && s.t >= r.duration - 0.05) set({ t: 0 });
    if (p && s.stopAt !== null && s.t >= s.stopAt - 0.05 && s.presenting === null) set({ stopAt: null });
    set({ playing: p });
  },
  togglePlay: () => get().setPlaying(!get().playing),
  setSpeed: (speed) => set({ speed }),
  setPov: (p) => {
    const cur = get().pov;
    if (p === cur) return;
    set({ pov: p, prevPov: cur, pip: get().pip === p ? cur : get().pip });
  },
  swapPov: () => get().setPov(get().prevPov),
  setPip: (pip) => set({ pip }),
  openRound: (roundId, t = 0) => {
    const r = ROUND_BY_ID[roundId];
    if (!r) return;
    set({ roundId, mapId: r.map, t: Math.max(0, Math.min(r.duration, t)), stopAt: null });
  },
  openMap: (m) => {
    const s = get();
    if (s.mapId === m) return;
    const rs = roundsOf(m);
    const cand = s.filter === 'lostdef' ? rs.find((r) => r.side === 'def' && !r.won && !r.extra) : rs[0];
    set({ mapId: m, roundId: (cand ?? rs[0]).id, t: 0, playing: false, stopAt: null });
  },
  setFilter: (filter) => set({ filter }),
  set: (p) => set(p),

  addMarker: (text) => {
    const s = get();
    const m: Marker = { id: `m${++mid}-${Date.now()}`, roundId: s.roundId, t: Math.round(s.t * 10) / 10, text, createdLabel: 'Just now' };
    set({ markers: [...s.markers, m], markerDraft: null });
    get().showToast(`Marker added at R${ROUND_BY_ID[s.roundId].n} ${fmt(s.t)}`, () => set({ markers: get().markers.filter((x) => x.id !== m.id) }));
  },
  updateMarker: (id, text) => set({ markers: get().markers.map((m) => (m.id === id ? { ...m, text } : m)) }),
  removeMarker: (id) => {
    const before = get().markers;
    set({ markers: before.filter((m) => m.id !== id) });
    get().showToast('Marker deleted', () => set({ markers: before }));
  },

  beginClip: (preset) => {
    const s = get();
    const r = ROUND_BY_ID[preset?.roundId ?? s.roundId];
    const t = s.t;
    // name it after a nearby marker if Dana already wrote one
    const near = s.markers
      .filter((m) => m.roundId === r.id && Math.abs(m.t - t) <= 8)
      .sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    const tIn = Math.max(0, Math.round((t - 4) * 2) / 2);
    const tOut = Math.min(r.duration, Math.round((Math.max(t, near?.t ?? t) + 6) * 2) / 2);
    set({
      draft: {
        roundId: r.id, tIn, tOut, pov: s.pov, speed: s.speed, title: near ? near.text : '', note: '', insertAt: s.clips.length,
        ...preset,
      },
      playing: false,
    });
  },
  saveDraft: () => {
    const s = get();
    const d = s.draft;
    if (!d) return;
    const r = ROUND_BY_ID[d.roundId];
    const title = d.title.trim() || `${r.map[0].toUpperCase()}${r.map.slice(1)} R${r.n} ${fmt(d.tIn)}`;
    if (d.editingId) {
      const clips = s.clips.filter((c) => c.id !== d.editingId);
      const c: Clip = { id: d.editingId, roundId: d.roundId, tIn: Math.min(d.tIn, d.tOut), tOut: Math.max(d.tIn, d.tOut), pov: d.pov, speed: d.speed, title, note: d.note.trim() };
      clips.splice(Math.min(d.insertAt, clips.length), 0, c);
      set({ clips, draft: null });
      get().showToast('Clip updated');
      return;
    }
    const c: Clip = { id: `c${Date.now()}`, roundId: d.roundId, tIn: Math.min(d.tIn, d.tOut), tOut: Math.max(d.tIn, d.tOut), pov: d.pov, speed: d.speed, title, note: d.note.trim() };
    const clips = s.clips.slice();
    clips.splice(Math.min(d.insertAt, clips.length), 0, c);
    set({ clips, draft: null });
    get().showToast(`Added as moment ${clips.indexOf(c) + 1} of ${clips.length}`, () => set({ clips: get().clips.filter((x) => x.id !== c.id) }));
  },
  editClip: (id) => {
    const s = get();
    const i = s.clips.findIndex((c) => c.id === id);
    if (i < 0) return;
    const c = s.clips[i];
    set({ draft: { editingId: id, roundId: c.roundId, tIn: c.tIn, tOut: c.tOut, pov: c.pov, speed: c.speed, title: c.title, note: c.note, insertAt: i } });
  },
  removeClip: (id) => {
    const before = get().clips;
    const c = before.find((x) => x.id === id);
    set({ clips: before.filter((x) => x.id !== id) });
    get().showToast(`Removed “${c?.title ?? 'clip'}”`, () => set({ clips: before }));
  },
  moveClip: (from, to) => {
    const clips = get().clips.slice();
    if (to < 0 || to >= clips.length || from === to) return;
    const [c] = clips.splice(from, 1);
    clips.splice(to, 0, c);
    set({ clips });
  },
  playClip: (id) => {
    const c = get().clips.find((x) => x.id === id);
    if (!c) return;
    const r = ROUND_BY_ID[c.roundId];
    const cur = get().pov;
    set({ roundId: c.roundId, mapId: r.map, t: c.tIn, pov: c.pov, prevPov: c.pov === cur ? get().prevPov : cur, speed: c.speed, stopAt: c.tOut, playing: true });
  },

  startPresent: (i = 0) => {
    const s = get();
    if (!s.clips.length) return;
    set({ saved: { roundId: s.roundId, t: s.t, pov: s.pov, speed: s.speed, mapId: s.mapId }, draft: null });
    get().presentGo(i);
  },
  presentGo: (i) => {
    const s = get();
    const c = s.clips[Math.max(0, Math.min(s.clips.length - 1, i))];
    if (!c) return;
    const r = ROUND_BY_ID[c.roundId];
    set({ presenting: s.clips.indexOf(c), roundId: c.roundId, mapId: r.map, t: c.tIn, pov: c.pov, speed: c.speed, stopAt: c.tOut, playing: true });
  },
  stopPresent: () => {
    const sv = get().saved;
    set({ presenting: null, playing: false, stopAt: null, ...(sv ?? {}), saved: null });
  },
  showToast: (text, undo) => {
    const id = ++toastN;
    set({ toast: { id, text, undo } });
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }); }, 5000);
  },
  resetDemo: () => {
    localStorage.removeItem(LS);
    set({ markers: INITIAL_MARKERS, clips: INITIAL_CLIPS, draft: null });
    get().showToast('Restored markers and lineup to this afternoon’s state');
  },
}));

useApp.subscribe((s, p) => {
  if (s.markers !== p.markers || s.clips !== p.clips) {
    try { localStorage.setItem(LS, JSON.stringify({ markers: s.markers, clips: s.clips })); } catch { /* ignore */ }
  }
});

export function fmt(t: number, tenths = false) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  if (tenths) return `${m}:${s.toFixed(1).padStart(4, '0')}`;
  return `${m}:${String(Math.floor(s)).padStart(2, '0')}`;
}

export function fmtPrecise(t: number) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

export const MAP_LABEL: Record<MapId, string> = { foundry: 'Foundry', saltworks: 'Saltworks', canopy: 'Canopy' };
