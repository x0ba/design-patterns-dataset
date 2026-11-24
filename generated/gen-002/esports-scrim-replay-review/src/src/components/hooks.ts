import { useEffect, useState } from 'react';
import { NOW_START } from '../data/review';
import { ROUND_BY_ID, PLAYERS } from '../data/scrim';
import type { PovId } from '../data/types';
import { useApp } from '../store';
import { navLostDef } from './nav';

export function usePlayback() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = useApp.getState();
      if (s.playing) {
        const r = ROUND_BY_ID[s.roundId];
        let t = s.t + dt * s.speed;
        let playing = true;
        if (s.stopAt !== null && t >= s.stopAt) { t = s.stopAt; playing = false; }
        if (t >= r.duration) { t = r.duration; playing = false; }
        useApp.setState({ t, playing });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/** Simulated wall clock: starts at 3:40 PM Tue Nov 17 and advances in real time. */
export function useClock() {
  const [now, setNow] = useState(() => NOW_START);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setNow(new Date(NOW_START.getTime() + (Date.now() - start))), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const POV_KEYS: Record<string, PovId> = { '1': 'Rook', '2': 'Vesper', '3': 'Juno', '4': 'Kael', '5': 'Mara', '6': 'Spectator', '0': 'Spectator' };

export function useKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) {
        if (e.key === 'Escape') (el as HTMLInputElement).blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useApp.getState();
      const k = e.key;
      if (s.presenting !== null) {
        if (k === 'Escape') s.stopPresent();
        else if (k === 'ArrowRight' || k === 'n') s.presentGo(s.presenting + 1);
        else if (k === 'ArrowLeft' || k === 'p') s.presentGo(s.presenting - 1);
        else if (k === ' ') { e.preventDefault(); if (!s.playing && s.stopAt !== null && s.t >= s.stopAt - 0.05) s.presentGo(s.presenting); else s.togglePlay(); }
        else if (k === 'r') s.presentGo(s.presenting);
        else if (POV_KEYS[k]) s.setPov(POV_KEYS[k]);
        return;
      }
      if (k === ' ' || k === 'k') { e.preventDefault(); s.togglePlay(); }
      else if (k === 'ArrowLeft') { e.preventDefault(); s.nudge(e.shiftKey ? -5 : -1); }
      else if (k === 'ArrowRight') { e.preventDefault(); s.nudge(e.shiftKey ? 5 : 1); }
      else if (k === ',') { s.set({ playing: false }); s.nudge(-1 / 30); }
      else if (k === '.') { s.set({ playing: false }); s.nudge(1 / 30); }
      else if (POV_KEYS[k]) s.setPov(POV_KEYS[k]);
      else if (k === 'q' || k === 'Tab') { e.preventDefault(); s.swapPov(); }
      else if (k === '-' || k === '_') { const sp = [0.25, 0.5, 1, 2]; const i = sp.indexOf(s.speed); s.setSpeed(sp[Math.max(0, i - 1)]); }
      else if (k === '=' || k === '+') { const sp = [0.25, 0.5, 1, 2]; const i = sp.indexOf(s.speed); s.setSpeed(sp[Math.min(sp.length - 1, i + 1)]); }
      else if (k === '[') navLostDef(-1);
      else if (k === ']') navLostDef(1);
      else if (k === 'm') { e.preventDefault(); s.set({ markerDraft: { roundId: s.roundId, t: s.t, text: '' }, playing: false }); }
      else if (k === 'c') { e.preventDefault(); s.beginClip(); }
      else if (k === 'z') s.set({ zoom: !s.zoom });
      else if (k === 'p') s.setPip(s.pip ? null : (s.prevPov !== s.pov ? s.prevPov : PLAYERS.find((x) => x !== s.pov)!));
      else if (k === '?') s.set({ help: !s.help });
      else if (k === 'Escape') s.set({ help: false, draft: null, markerDraft: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
