import { useMemo, useState } from 'react';
import { useApp } from '../App';
import { fmt, fmtDate, fmtDelta, relDate } from '../util';
import * as I from './Icons';

export default function ToursView() {
  const { state, dispatch } = useApp();
  const [q, setQ] = useState('');
  const [route, setRoute] = useState('all');
  const all = state.order.tours.map((id) => state.items[id]);
  const routes = useMemo(() => [...new Set(all.map((t) => t.route!))].sort(), [all]);
  const list = all.filter(
    (t) =>
      (route === 'all' || t.route === route) &&
      (!q || `${t.title} ${t.subtitle} ${t.chapters.map((c) => c.title).join(' ')}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="lib">
      <header className="lib-head">
        <div>
          <h1>My tours</h1>
          <p className="lib-sub">{all.length} recordings of your own walks · {routes.length} routes · newest first</p>
        </div>
        <div className="lib-filters">
          <div className="field">
            <I.Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles and stops" aria-label="Search tours" />
          </div>
          <select value={route} onChange={(e) => setRoute(e.target.value)} aria-label="Filter by route">
            <option value="all">All routes</option>
            {routes.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      </header>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '38%' }}>Recording</th>
              <th>Recorded</th>
              <th className="num">Length</th>
              <th className="num">vs plan</th>
              <th className="num">Stops</th>
              <th className="num">Bookmarks</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((t) => {
              const d = t.duration - (t.planned ?? t.duration);
              const n = state.bookmarks.filter((b) => b.itemId === t.id).length;
              const isCur = t.id === state.currentId;
              const queued = state.queue.includes(t.id);
              return (
                <tr key={t.id} className={isCur ? 'current' : ''} onDoubleClick={() => dispatch({ type: 'load', id: t.id })}>
                  <td>
                    <div className="cell-title">
                      {isCur && <span className="eq dark"><i /><i /><i /></span>}
                      {t.title}
                    </div>
                    <div className="cell-sub">{t.subtitle}{t.guests ? ` · ${t.guests} guests` : ''}</div>
                  </td>
                  <td>
                    <span title={fmtDate(t.date, true)}>{relDate(t.date)}</span>
                  </td>
                  <td className="num">{fmt(t.duration, true)}</td>
                  <td className={`num ${d > 300 ? 'over' : d < -60 ? 'under' : ''}`}>{fmtDelta(d)}</td>
                  <td className="num">{t.chapters.length}</td>
                  <td className="num">{n || '—'}</td>
                  <td className="row-actions">
                    {isCur ? (
                      <button className="btn btn-sm btn-ghost" onClick={() => dispatch({ type: 'view', view: 'now' })}>Open</button>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-ghost" onClick={() => dispatch({ type: 'load', id: t.id })}>
                          <I.Play size={12} /> {t.position > 0 ? `Resume ${fmt(t.position, true)}` : 'Play'}
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          disabled={queued}
                          onClick={() => {
                            dispatch({ type: 'queueAdd', id: t.id });
                            dispatch({ type: 'toast', text: `Added to Up next (${state.queue.length + 1})` });
                          }}
                        >
                          {queued ? 'Queued' : 'Add to queue'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="empty pad">No recordings match “{q}”.</p>}
      </div>
    </div>
  );
}
