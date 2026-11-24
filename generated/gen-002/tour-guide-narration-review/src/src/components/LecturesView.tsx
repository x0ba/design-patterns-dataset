import { useState } from 'react';
import { useApp } from '../App';
import { AUTHOR } from '../data/lectures';
import { positionOf } from '../store';
import { fmt, fmtDate } from '../util';
import * as I from './Icons';

export default function LecturesView() {
  const { state, dispatch } = useApp();
  const [q, setQ] = useState('');
  const all = state.order.lectures.map((id) => state.items[id]);
  const list = all.filter((l) => !q || `${l.title} ${l.chapters.map((c) => c.title).join(' ')}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="lib">
      <header className="lib-head">
        <div>
          <h1>Reference lectures</h1>
          <p className="lib-sub">{all.length} purchased lectures by {AUTHOR}</p>
        </div>
        <div className="lib-filters">
          <div className="field">
            <I.Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lectures and chapters" aria-label="Search lectures" />
          </div>
        </div>
      </header>
      <div className="lec-grid">
        {list.map((l) => {
          const p = positionOf(state, l.id);
          const done = l.played >= l.duration - 1 && p === 0;
          const pct = done ? 100 : Math.round((p / l.duration) * 100);
          const isCur = l.id === state.currentId;
          const queued = state.queue.includes(l.id);
          return (
            <article key={l.id} className={`lec-card ${isCur ? 'current' : ''}`}>
              <div className="lec-top">
                <span className="lec-len">{fmt(l.duration)}</span>
                <span className="lec-date">Bought {fmtDate(l.date)}</span>
              </div>
              <h3>{l.title}</h3>
              <ol className="lec-chapters">
                {l.chapters.slice(0, 4).map((c) => (
                  <li key={c.start}>{c.title}</li>
                ))}
                {l.chapters.length > 4 && <li className="more">+{l.chapters.length - 4} more</li>}
              </ol>
              <div className="lec-progress">
                <div className="progress"><span style={{ width: `${pct}%` }} /></div>
                <span>{isCur ? 'Playing now' : done ? 'Finished' : p > 0 ? `${pct}% · left off at ${fmt(p)}` : 'Not started'}</span>
              </div>
              <div className="lec-actions">
                {isCur ? (
                  <button className="btn btn-sm btn-primary" onClick={() => dispatch({ type: 'view', view: 'now' })}>Open</button>
                ) : (
                  <button className="btn btn-sm btn-primary" onClick={() => dispatch({ type: 'load', id: l.id })}>
                    <I.Play size={12} /> {p > 0 ? `Resume from ${fmt(p)}` : done ? 'Play again' : 'Play'}
                  </button>
                )}
                {!isCur && (
                  <button
                    className="btn btn-sm btn-ghost"
                    disabled={queued}
                    onClick={() => {
                      dispatch({ type: 'queueAdd', id: l.id, next: true });
                      dispatch({ type: 'toast', text: `“${l.title}” will play next` });
                    }}
                  >
                    {queued ? 'In Up next' : 'Play next'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
