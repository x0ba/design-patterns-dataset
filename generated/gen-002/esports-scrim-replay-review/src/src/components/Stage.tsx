import { useMemo } from 'react';
import { PLAYERS, PLAYER_COLOR, ROLES, ROUND_BY_ID } from '../data/scrim';
import type { PlayerName, PovId } from '../data/types';
import { isAliveAt } from '../engine/frame';
import { MAP_LABEL, fmt, fmtPrecise, useApp } from '../store';
import { neighbor, navLostDef } from './nav';
import { Timeline } from './Timeline';
import { View } from './View';

const MAIN_RES: [number, number] = [576, 324];
const THUMB_RES: [number, number] = [176, 99];

export function Stage() {
  return (
    <main className="stage">
      <RoundHeader />
      <Player />
      <PovStrip />
      <Transport />
      <Timeline />
    </main>
  );
}

function RoundHeader() {
  const roundId = useApp((s) => s.roundId);
  const filter = useApp((s) => s.filter);
  const r = ROUND_BY_ID[roundId];
  const prev = neighbor(-1), next = neighbor(1);
  void filter;
  const how = r.end === 'elim' ? 'Elimination' : r.end === 'time' ? 'Time expired' : r.objDetail === 'defused' ? 'Charge defused' : 'Charge detonated';
  return (
    <div className="round-head">
      <div className="rh-title">
        <h1>{MAP_LABEL[r.map]} <span className="muted">·</span> Round {r.n}</h1>
        <span className={`chip ${r.side}`}>{r.side === 'def' ? 'Defense' : 'Attack'}</span>
        <span className={`chip ${r.won ? 'win' : 'loss'}`}>{r.won ? 'Won' : 'Lost'} · {how} {fmt(r.endT)}</span>
        {r.retake && <span className="chip retake">Retake</span>}
        {r.plantT !== undefined && <span className="muted small">Plant {fmt(r.plantT)} {r.target}</span>}
        <span className="muted small mono">{r.extra ? 'Extra round' : `${r.scoreBefore[0]}–${r.scoreBefore[1]} → ${r.scoreAfter[0]}–${r.scoreAfter[1]}`}</span>
      </div>
      <div className="rh-nav">
        <button className="btn-ghost sm" disabled={!prev} onClick={() => navLostDef(-1)} title="Previous round in filter ([)">
          ‹ {prev ? `R${prev.n}` : '—'} <kbd>[</kbd>
        </button>
        <button className="btn-ghost sm" disabled={!next} onClick={() => navLostDef(1)} title="Next round in filter (])">
          <kbd>]</kbd> {next ? `R${next.n}` : '—'} ›
        </button>
      </div>
    </div>
  );
}

function Player() {
  const roundId = useApp((s) => s.roundId);
  const t = useApp((s) => s.t);
  const pov = useApp((s) => s.pov);
  const pip = useApp((s) => s.pip);
  const speed = useApp((s) => s.speed);
  const playing = useApp((s) => s.playing);
  const captions = useApp((s) => s.captions);
  const presenting = useApp((s) => s.presenting);
  const togglePlay = useApp((s) => s.togglePlay);
  const setPov = useApp((s) => s.setPov);
  const setPip = useApp((s) => s.setPip);
  const r = ROUND_BY_ID[roundId];
  const opts = useMemo(() => ({ hud: true, captions }), [captions]);
  const dead = pov !== 'Spectator' && !isAliveAt(r, pov, t);
  const aliveMates = PLAYERS.filter((p) => p !== pov && isAliveAt(r, p, t));
  if (presenting !== null) return <div className="player" />;
  return (
    <div className="player">
      <View roundId={roundId} t={t} pov={pov} res={MAIN_RES} opts={opts} className="player-canvas" />
      <div className="player-click" onClick={togglePlay} />
      <div className={`pov-pill ${pov === 'Spectator' ? 'spec' : ''}`}>
        <span className="pov-dot" style={{ background: pov === 'Spectator' ? '#e6e9ee' : PLAYER_COLOR[pov as PlayerName] }} />
        <b>{pov === 'Spectator' ? 'Free cam' : `${pov} POV`}</b>
        <span className="muted">{pov === 'Spectator' ? 'Spectator' : ROLES[pov as PlayerName]}</span>
        <span className={`speed-badge ${speed < 1 ? 'slow' : ''}`}>{speed === 0.25 ? '¼×' : speed === 0.5 ? '½×' : `${speed}×`}</span>
        {!playing && <span className="paused">Paused</span>}
      </div>
      {dead && (
        <div className="dead-switch">
          <span className="muted">{pov} is down. Watch</span>
          {aliveMates.map((p) => (
            <button key={p} className="btn-ghost xs" onClick={() => setPov(p)} style={{ color: PLAYER_COLOR[p] }}>{p}</button>
          ))}
          <button className="btn-ghost xs" onClick={() => setPov('Spectator')}>Free cam</button>
        </div>
      )}
      {pip && pip !== pov && (
        <div className="pip">
          <View roundId={roundId} t={t} pov={pip} res={[256, 144]} opts={{ compact: true }} className="pip-canvas" />
          <div className="pip-bar">
            <span style={{ color: pip === 'Spectator' ? '#e6e9ee' : PLAYER_COLOR[pip as PlayerName] }}>{pip === 'Spectator' ? 'Free cam' : pip}</span>
            <span className="muted">· same instant</span>
            <span className="spacer" />
            <button className="icon-btn" title="Swap main and picture-in-picture" onClick={() => setPov(pip)}>⇄</button>
            <button className="icon-btn" title="Close picture-in-picture (P)" onClick={() => setPip(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

const POVS: PovId[] = ['Rook', 'Vesper', 'Juno', 'Kael', 'Mara', 'Spectator'];

function PovStrip() {
  const roundId = useApp((s) => s.roundId);
  const t = useApp((s) => s.t);
  const pov = useApp((s) => s.pov);
  const prevPov = useApp((s) => s.prevPov);
  const pip = useApp((s) => s.pip);
  const setPov = useApp((s) => s.setPov);
  const setPip = useApp((s) => s.setPip);
  const r = ROUND_BY_ID[roundId];
  return (
    <div className="pov-strip">
      {POVS.map((p, i) => {
        const alive = p === 'Spectator' || isAliveAt(r, p, t);
        const tr = r.tracks.find((x) => x.player === p);
        const on = p === pov;
        return (
          <div
            key={p}
            className={`pov-tile ${on ? 'on' : ''} ${alive ? '' : 'dead'}`}
            onClick={(e) => (e.shiftKey ? setPip(pip === p ? null : p) : setPov(p))}
            title={p === 'Spectator' ? 'Free-camera spectator (6)' : `${p} — ${ROLES[p as PlayerName]} (${i + 1}). Shift-click for picture-in-picture.`}
            style={on && p !== 'Spectator' ? { borderColor: PLAYER_COLOR[p as PlayerName] } : undefined}
          >
            <View roundId={roundId} t={t} pov={p} res={THUMB_RES} opts={{ compact: true }} className="pov-thumb" throttle={0.12} />
            <div className="pov-label">
              <kbd>{i + 1}</kbd>
              <span className="pov-name" style={{ color: p === 'Spectator' ? undefined : PLAYER_COLOR[p as PlayerName] }}>{p === 'Spectator' ? 'Free cam' : p}</span>
              {!alive && tr?.deathT !== undefined && <span className="pov-dead">✕ {fmt(tr.deathT)}</span>}
              {p === prevPov && !on && <span className="pov-q" title="Q swaps back to this POV">Q</span>}
              {pip === p && <span className="pov-q pipq">PiP</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SPEEDS = [0.25, 0.5, 1, 2];

function Transport() {
  const roundId = useApp((s) => s.roundId);
  const t = useApp((s) => s.t);
  const playing = useApp((s) => s.playing);
  const speed = useApp((s) => s.speed);
  const pov = useApp((s) => s.pov);
  const prevPov = useApp((s) => s.prevPov);
  const pip = useApp((s) => s.pip);
  const captions = useApp((s) => s.captions);
  const voice = useApp((s) => s.voice);
  const st = useApp.getState();
  const r = ROUND_BY_ID[roundId];
  return (
    <div className="transport">
      <div className="tp-group">
        <button className="icon-btn" title="Back 5s (Shift+←)" onClick={() => st.nudge(-5)}>
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8a5 5 0 1 0 1.5-3.6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3 2.5v3h3" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        <button className="icon-btn" title="Previous frame (,)" onClick={() => { st.set({ playing: false }); st.nudge(-1 / 30); }}>
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 3v10" stroke="currentColor" strokeWidth="1.6" /><path d="M13 3 6 8l7 5z" fill="currentColor" /></svg>
        </button>
        <button className="play-btn" title="Play / pause (Space)" onClick={() => st.togglePlay()}>
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" /><rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor" /></svg>
          )}
        </button>
        <button className="icon-btn" title="Next frame (.)" onClick={() => { st.set({ playing: false }); st.nudge(1 / 30); }}>
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M12 3v10" stroke="currentColor" strokeWidth="1.6" /><path d="M3 3l7 5-7 5z" fill="currentColor" /></svg>
        </button>
        <button className="icon-btn" title="Forward 5s (Shift+→)" onClick={() => st.nudge(5)}>
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M13 8a5 5 0 1 1-1.5-3.6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M13 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>
      <div className="tp-time mono">
        <b>{fmtPrecise(t)}</b> <span className="muted">/ {fmt(r.duration)}</span>
      </div>
      <div className="seg speed-seg" title="Playback speed (− / +)">
        {SPEEDS.map((s) => (
          <button key={s} className={speed === s ? 'on' : ''} onClick={() => st.setSpeed(s)}>
            {s === 0.25 ? '¼×' : s === 0.5 ? '½×' : `${s}×`}
          </button>
        ))}
      </div>
      <button className="btn-ghost sm swap" onClick={() => st.swapPov()} disabled={prevPov === pov} title="Swap to previous POV at the same instant (Q)">
        ⇄ {prevPov === 'Spectator' ? 'Free cam' : prevPov} <kbd>Q</kbd>
      </button>
      <span className="spacer" />
      <button className={`toggle ${voice ? 'on' : ''}`} title="Team comms audio (synthesized voice from the comms transcript)" onClick={() => st.set({ voice: !voice })}>
        {voice ? (
          <svg width="15" height="15" viewBox="0 0 16 16"><path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" fill="currentColor" /><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 16 16"><path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" fill="currentColor" /><path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" strokeWidth="1.3" /></svg>
        )}
      </button>
      <button className={`toggle ${captions ? 'on' : ''}`} onClick={() => st.set({ captions: !captions })} title="Show comms captions on video">CC</button>
      <button className={`toggle ${pip ? 'on' : ''}`} onClick={() => st.setPip(pip ? null : prevPov !== pov ? prevPov : 'Spectator')} title="Picture-in-picture second POV (P)">PiP</button>
      <button className="btn-ghost sm" onClick={() => st.set({ markerDraft: { roundId, t, text: '' }, playing: false })} title="Add marker at playhead (M)">
        <svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 14V2h8l-2 3 2 3H4" fill="#f5c451" /></svg> Marker <kbd>M</kbd>
      </button>
      <button className="btn sm" onClick={() => st.beginClip()} title="Clip this moment into tonight's lineup (C)">
        + Clip <kbd>C</kbd>
      </button>
    </div>
  );
}
