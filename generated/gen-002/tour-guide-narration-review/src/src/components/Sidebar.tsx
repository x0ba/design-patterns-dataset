import type { ReactNode } from 'react';
import { useApp } from '../App';
import { positionOf, type View } from '../store';
import { fmt } from '../util';
import * as I from './Icons';

export default function Sidebar() {
  const { state, dispatch } = useApp();

  const nav: { view: View; label: string; icon: ReactNode; count?: number }[] = [
    { view: 'now', label: 'Now playing', icon: <I.Now /> },
    { view: 'tours', label: 'My tours', icon: <I.Mic />, count: state.order.tours.length },
    { view: 'lectures', label: 'Reference lectures', icon: <I.Lecture />, count: state.order.lectures.length },
    { view: 'bookmarks', label: 'Bookmarks', icon: <I.Bookmark />, count: state.bookmarks.length },
  ];

  // "Continue listening": the most recently left item that's part-way through.
  const resumeIds = state.recent
    .filter((id) => {
      const it = state.items[id];
      const p = positionOf(state, id);
      return p > 0 && p < it.duration - 1 && id !== state.currentId;
    })
    .slice(0, 1);

  return (
    <aside className="sidebar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
          <rect width="32" height="32" rx="7" fill="var(--blue)" />
          <path d="M16 6l10 10-10 10L6 16z" fill="none" stroke="#fff" strokeWidth="2.4" />
          <circle cx="16" cy="16" r="3" fill="#fff" />
        </svg>
        <span>Stopwise</span>
      </div>

      <nav className="nav">
        {nav.map((n) => (
          <button
            key={n.view}
            className={`nav-item ${state.view === n.view ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'view', view: n.view })}
          >
            {n.icon}
            <span className="nav-label">{n.label}</span>
            {n.count !== undefined && <span className="nav-count">{n.count}</span>}
            {n.view === 'now' && state.playing && <span className="eq" aria-label="playing"><i /><i /><i /></span>}
          </button>
        ))}
      </nav>

      {resumeIds.length > 0 && (
        <div className="side-section">
          <div className="side-heading">Continue listening</div>
          {resumeIds.map((id) => {
            const it = state.items[id];
            const p = positionOf(state, id);
            const pct = Math.round((p / it.duration) * 100);
            return (
              <div className="resume-card" key={id}>
                <div className={`resume-kicker ${it.kind}`}>{it.kind === 'tour' ? `Tour · ${it.subtitle}` : 'Lecture'} · {fmt(it.duration)}</div>
                <div className="resume-title">{it.title}</div>
                <div className="progress"><span style={{ width: `${pct}%` }} /></div>
                <div className="resume-meta">
                  {pct}% played · left off at {fmt(p, it.duration >= 3600)}
                </div>
                <div className="resume-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'load', id, play: true })}>
                    <I.Play size={14} /> Resume from {fmt(p, it.duration >= 3600)}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Play after the current recording"
                    onClick={() => {
                      dispatch({ type: 'queueAdd', id, next: true });
                      dispatch({ type: 'toast', text: `“${it.title}” will play next` });
                    }}
                  >
                    Play next
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="side-foot">
        <div className="shortcuts">
          <div className="side-heading"><I.Keyboard size={14} /> Shortcuts</div>
          <dl>
            <dt><kbd>Space</kbd></dt><dd>Play / pause</dd>
            <dt><kbd>←</kbd><kbd>→</kbd></dt><dd>−15s / +30s</dd>
            <dt><kbd>⇧</kbd><kbd>←</kbd><kbd>→</kbd></dt><dd>Prev / next stop</dd>
            <dt><kbd>B</kbd></dt><dd>Bookmark now</dd>
            <dt><kbd>[</kbd><kbd>]</kbd></dt><dd>Cut starts / ends</dd>
          </dl>
        </div>
        <div className="account">
          <span className="avatar">IC</span>
          <span>
            <span className="acct-name">Inês Carvalho</span>
            <span className="acct-sub">Licensed guide · Porto</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
