import { useMemo, useState } from 'react';
import { VERSIONS, person } from '../data';
import { useApp } from '../ctx';
import { delta, fmtDay, fmtMoneyK, fmtWhen, sum, unexplained } from '../model';
import { EditRow } from './EditRow';

export function ChangesList() {
  const { s, now } = useApp();
  const [filter, setFilter] = useState<'all' | 'nonote' | 'wk5'>('all');
  const [who, setWho] = useState('all');
  const [sort, setSort] = useState<'newest' | 'largest'>('newest');
  const unx = unexplained(s.edits);
  const editors = useMemo(() => [...new Set(s.edits.map((e) => e.by))], [s.edits]);

  let list = s.edits.slice();
  if (filter === 'nonote') list = list.filter((e) => unx.includes(e));
  if (filter === 'wk5') list = list.filter((e) => e.week <= 4);
  if (who !== 'all') list = list.filter((e) => e.by === who);
  list.sort((a, b) => (sort === 'newest' ? b.at.getTime() - a.at.getTime() : Math.abs(delta(b)) - Math.abs(delta(a))));

  const groups: [string, typeof list][] = [];
  if (sort === 'newest') {
    for (const e of list) {
      const k = e.at.toDateString() === now().toDateString() ? 'Today' : fmtDay(e.at);
      const g = groups.find((x) => x[0] === k);
      if (g) g[1].push(e);
      else groups.push([k, [e]]);
    }
  } else groups.push(['', list]);

  return (
    <div className="changes">
      <div className="list-head">
        <span>
          {s.edits.length} edits since v11 <span className="muted">· published {fmtWhen(VERSIONS[0].published, now())}</span>
        </span>
      </div>
      <div className="filters">
        <div className="seg seg-sm">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'nonote' ? 'on' : ''} onClick={() => setFilter('nonote')}>
            No note {unx.length > 0 && <span className="tab-n warn">{unx.length}</span>}
          </button>
          <button className={filter === 'wk5' ? 'on' : ''} onClick={() => setFilter('wk5')} title="Edits that land in wks 1–5">Wks 1–5</button>
        </div>
        <select value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="all">Everyone</option>
          {editors.map((id) => (
            <option key={id} value={id}>{id === 'helen' ? 'You' : person[id].name} ({s.edits.filter((e) => e.by === id).length})</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'largest')}>
          <option value="newest">Newest first</option>
          <option value="largest">Largest first</option>
        </select>
      </div>
      {list.length === 0 && <p className="muted pad">No edits match.</p>}
      {list.length > 0 && (
        <div className="muted small pad">
          {list.length} shown · net {fmtMoneyK(sum(list.map(delta)), true)}
        </div>
      )}
      {groups.map(([k, es]) => (
        <div key={k || 'all'}>
          {k && <div className="day-head">{k}</div>}
          {es.map((e) => <EditRow key={e.id} e={e} />)}
        </div>
      ))}
    </div>
  );
}
