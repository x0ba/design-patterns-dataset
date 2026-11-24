import { useMemo } from 'react';
import { SESSION } from '../data/review';
import { PLAYER_COLOR, ROUND_BY_ID } from '../data/scrim';
import type { PlayerName, PovId } from '../data/types';
import { MAP_LABEL, fmt, useApp } from '../store';
import { Snapshot, View } from './View';

const povName = (p: PovId) => (p === 'Spectator' ? 'Free cam' : p);
const POVS: PovId[] = ['Rook', 'Vesper', 'Juno', 'Kael', 'Mara', 'Spectator'];

export function Presenter() {
  const presenting = useApp((s) => s.presenting);
  const clips = useApp((s) => s.clips);
  const t = useApp((s) => s.t);
  const pov = useApp((s) => s.pov);
  const playing = useApp((s) => s.playing);
  const roundId = useApp((s) => s.roundId);
  const captions = useApp((s) => s.captions);
  const st = useApp.getState();
  const opts = useMemo(() => ({ hud: true, captions }), [captions]);
  if (presenting === null) return null;
  const c = clips[presenting];
  if (!c) return null;
  const r = ROUND_BY_ID[c.roundId];
  const prog = Math.max(0, Math.min(1, (t - c.tIn) / Math.max(0.1, c.tOut - c.tIn)));
  const done = !playing && t >= c.tOut - 0.05;
  return (
    <div className="presenter" role="dialog" aria-label="Presenter mode">
      <div className="pr-top">
        <div className="pr-title">
          <span className="eyebrow">{SESSION.title} · Moment {presenting + 1} of {clips.length}</span>
          <h2>{c.title}</h2>
        </div>
        <div className="pr-meta">
          <span>{MAP_LABEL[r.map]} · Round {r.n} · {r.side === 'def' ? 'Defense' : 'Attack'} · {r.won ? 'Won' : 'Lost'}</span>
          <span className="mono">{fmt(c.tIn)}–{fmt(c.tOut)} · {c.speed}×</span>
        </div>
        <button className="btn-ghost sm" onClick={() => st.stopPresent()}>Exit <kbd>Esc</kbd></button>
      </div>
      <div className="pr-stage">
        <div className="pr-video" onClick={() => (done ? st.presentGo(presenting) : st.togglePlay())}>
          <View roundId={roundId} t={t} pov={pov} res={[640, 360]} opts={opts} className="player-canvas" />
          {done && (
            <div className="pr-done">
              <button className="btn" onClick={(e) => { e.stopPropagation(); st.presentGo(presenting); }}>↻ Replay</button>
              {presenting < clips.length - 1 && (
                <button className="btn" onClick={(e) => { e.stopPropagation(); st.presentGo(presenting + 1); }}>Next: {clips[presenting + 1].title} →</button>
              )}
            </div>
          )}
        </div>
        <div className="pr-progress"><span style={{ width: `${prog * 100}%` }} /></div>
      </div>
      <div className="pr-bottom">
        <div className="pr-note">
          {c.note ? <><span className="eyebrow">Talking point</span><p>{c.note}</p></> : <span className="muted small">No talking point for this clip.</span>}
          <div className="pr-povs">
            <span className="muted tiny">Switch POV</span>
            {POVS.map((p, i) => (
              <button key={p} className={`chip-btn ${pov === p ? 'on' : ''}`} style={pov === p && p !== 'Spectator' ? { color: PLAYER_COLOR[p as PlayerName] } : undefined} onClick={() => st.setPov(p)}>
                <kbd>{i + 1}</kbd> {povName(p)}
              </button>
            ))}
          </div>
        </div>
        <div className="pr-ctrl">
          <button className="btn-ghost sm" disabled={presenting === 0} onClick={() => st.presentGo(presenting - 1)}>← Prev</button>
          <button className="play-btn big" onClick={() => (done ? st.presentGo(presenting) : st.togglePlay())}>{playing ? '❚❚' : done ? '↻' : '▶'}</button>
          <button className="btn-ghost sm" disabled={presenting >= clips.length - 1} onClick={() => st.presentGo(presenting + 1)}>Next →</button>
        </div>
        <div className="pr-strip">
          {clips.map((x, i) => (
            <button key={x.id} className={`pr-chip ${i === presenting ? 'on' : ''}`} onClick={() => st.presentGo(i)} title={x.title}>
              <Snapshot roundId={x.roundId} t={(x.tIn + x.tOut) / 2} pov={x.pov} className="pr-img" />
              <span className="pr-n">{i + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Toast() {
  const toast = useApp((s) => s.toast);
  const set = useApp((s) => s.set);
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id}>
      <span>{toast.text}</span>
      {toast.undo && <button className="btn-ghost xs" onClick={() => { toast.undo!(); set({ toast: null }); }}>Undo</button>}
    </div>
  );
}

const KEYS: [string, string][] = [
  ['Space / K', 'Play / pause'],
  [', / .', 'Step one frame back / forward'],
  ['← / →', 'Seek 1s (Shift: 5s)'],
  ['− / +', 'Slower / faster (0.25× – 2×)'],
  ['1 – 5', 'Rook · Vesper · Juno · Kael · Mara POV'],
  ['6', 'Free-cam spectator'],
  ['Q', 'Swap to previous POV at the same instant'],
  ['P', 'Picture-in-picture second POV'],
  ['[ / ]', 'Previous / next round in the filter'],
  ['Z', 'Zoom timeline to 24s around playhead'],
  ['M', 'Add marker at playhead'],
  ['C', 'Clip this moment into tonight’s lineup'],
  ['Esc', 'Close form / exit presenter'],
];

export function Help() {
  const help = useApp((s) => s.help);
  const set = useApp((s) => s.set);
  if (!help) return null;
  return (
    <div className="modal-bg" onClick={() => set({ help: false })}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Keyboard shortcuts</h2>
          <button className="icon-btn" onClick={() => set({ help: false })}>✕</button>
        </div>
        <div className="keys">
          {KEYS.map(([k, v]) => (
            <div key={k} className="key-row"><kbd>{k}</kbd><span>{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
