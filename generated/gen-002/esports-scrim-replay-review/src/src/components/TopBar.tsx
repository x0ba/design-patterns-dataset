import { useState } from 'react';
import { COACH, MEETING } from '../data/review';
import { ROUND_BY_ID, SCRIM } from '../data/scrim';
import { MAP_LABEL, useApp } from '../store';
import { useClock } from './hooks';

function timeStr(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function TopBar() {
  const now = useClock();
  const roundId = useApp((s) => s.roundId);
  const clips = useApp((s) => s.clips);
  const set = useApp((s) => s.set);
  const resetDemo = useApp((s) => s.resetDemo);
  const startPresent = useApp((s) => s.startPresent);
  const [menu, setMenu] = useState(false);
  const r = ROUND_BY_ID[roundId];
  const mins = Math.max(0, Math.round((MEETING.getTime() - now.getTime()) / 60000));
  const left = mins >= 60 ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m` : `${mins}m`;
  return (
    <header className="topbar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
          <rect width="32" height="32" rx="7" fill="#1b1f25" />
          <path d="M8 23 L16 9 L24 23" stroke="#4fd1c5" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <circle cx="16" cy="19" r="2.4" fill="#f5c451" />
        </svg>
        <span className="brand-name">Backsight</span>
        <span className="org"><span className="org-dot" />{COACH.org}</span>
      </div>
      <nav className="crumbs" aria-label="Breadcrumb">
        <span className="muted">Scrims</span>
        <span className="sep">/</span>
        <span className="muted">vs {SCRIM.opponent} · {SCRIM.date}</span>
        <span className="sep">/</span>
        <span>{MAP_LABEL[r.map]}</span>
        <span className="sep">/</span>
        <span>Round {r.n}</span>
      </nav>
      <div className="top-right">
        <button className="meeting" onClick={() => startPresent(0)} disabled={!clips.length} title="Open presenter mode with tonight's lineup">
          <span className="live-dot" />
          <span>Team review <b>6:00 PM</b></span>
          <span className="muted">· in {left}</span>
          <span className="meet-count">{clips.length}/6 moments</span>
        </button>
        <span className="clock mono" title="Local time">{timeStr(now)}</span>
        <button className="icon-btn round" onClick={() => set({ help: true })} title="Keyboard shortcuts (?)">?</button>
        <div className="avatar-wrap">
          <button className="avatar" onClick={() => setMenu(!menu)} title={`${COACH.name} · ${COACH.role}`}>{COACH.initials}</button>
          {menu && (
            <div className="menu" onMouseLeave={() => setMenu(false)}>
              <div className="menu-head">
                <b>{COACH.name}</b>
                <span className="muted small">{COACH.role} · {COACH.org}</span>
                <span className="muted tiny">{COACH.plan}</span>
              </div>
              <button onClick={() => { set({ help: true }); setMenu(false); }}>Keyboard shortcuts</button>
              <button onClick={() => { resetDemo(); setMenu(false); }}>Reset markers &amp; lineup</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
