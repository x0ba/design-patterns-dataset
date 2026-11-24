import { useEffect, useState } from 'react';
import { MODULES, READINGS, WEEKS, shortAuthors } from '../data/course';
import { Route, fmtDayTime, useStore } from '../store';
import { Icon } from '../components/Icon';
import { LivesIn } from '../components/Shell';

const FILTERS = [
  { id: 'all', label: 'All 23' },
  { id: 'week5', label: 'Week 5 (missed)' },
  { id: 'ps4', label: 'Needed for PS4' },
  { id: 'unopened', label: 'Not opened, weeks 1–6' },
];

export function ReadingsPage({ route }: { route: Route }) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const f = route.query.get('f') || 'all';
  const list = READINGS.filter((r) => {
    if (f === 'week5' && r.week !== 5) return false;
    if (f === 'ps4' && r.usedIn !== 'PS4' && !(r.week === 5 && r.required)) return false;
    if (f === 'unopened' && (state.opened[r.id] || r.week > 6)) return false;
    if (q) {
      const hay = `${r.authors} ${r.title} ${r.source} ${r.year}`.toLowerCase();
      return q.toLowerCase().split(/\s+/).every((t) => hay.includes(t));
    }
    return true;
  });
  return (
    <div className="page-wide">
      <h1 className="page-title">Readings</h1>
      <p className="lede">All {READINGS.length} readings for the term, filed under the week they’re discussed. PDFs are on the course reserve; open them here to track what you’ve seen.</p>
      <div className="toolbar">
        <div className="seg">
          {FILTERS.map((x) => (
            <a key={x.id} href={`#/readings${x.id === 'all' ? '' : '?f=' + x.id}`} className={f === x.id ? 'on' : ''}>{x.label}</a>
          ))}
        </div>
        <label className="search-field"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by author, title, venue" /></label>
      </div>
      {MODULES.map((mod) => {
        const weeks = mod.weeks.filter((n) => list.some((r) => r.week === n));
        if (!weeks.length) return null;
        return (
          <div key={mod.id} className="reading-module">
            <div className="rm-head" style={{ color: mod.color }}><span className="dot" style={{ background: mod.color }} />{mod.name}</div>
            {weeks.map((n) => (
              <div key={n} className="card flush rm-week">
                <div className="rm-week-head">
                  <a href={`#/weeks/${n}`}><b>Week {n}</b> · {WEEKS[n - 1].title}</a>
                  {WEEKS[n - 1].missed && <span className="pill warn sm">you were out</span>}
                </div>
                <table className="list-table">
                  <tbody>
                    {list.filter((r) => r.week === n).map((r) => (
                      <tr key={r.id} onClick={() => (window.location.hash = `/readings/${r.id}`)}>
                        <td className="rt-auth">{shortAuthors(r.authors)} ({r.year})</td>
                        <td><b>{r.title}</b><div className="muted small">{r.source}, {r.pages}</div></td>
                        <td className="nowrap">{r.usedIn && <span className="pill warn sm">{r.usedIn}</span>} {r.required ? 'Required' : <span className="muted">Optional</span>}</td>
                        <td className="nowrap muted small">{r.minutes} min</td>
                        <td className="nowrap">{state.read[r.id] ? <span className="pill ok sm"><Icon name="check" /> Read</span> : state.opened[r.id] ? <span className="pill sm">Opened</span> : WEEKS[r.week - 1].status === 'future' ? <span className="muted small">Week {r.week}</span> : <span className="pill new sm">Not opened</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      })}
      {!list.length && <div className="card muted">No readings match.</div>}
    </div>
  );
}

export function ReadingPage({ id }: { id: string }) {
  const r = READINGS.find((x) => x.id === id);
  const { state, update, markOpened, toast } = useStore();
  useEffect(() => {
    if (r) markOpened(r.id);
  }, [r, markOpened]);
  if (!r) return <div className="empty-page">Reading not found.</div>;
  const read = !!state.read[r.id];
  const citation = `${r.authors} (${r.year}). ${r.title}. ${r.source}, ${r.pages}.`;
  const idx = READINGS.findIndex((x) => x.id === r.id);
  const sameWeek = READINGS.filter((x) => x.week === r.week && x.id !== r.id);
  return (
    <div className="page-grid">
      <div className="page-main">
        <div className="crumbs"><a href="#/readings">Readings</a><span>›</span><a href={`#/weeks/${r.week}`}>Week {r.week}</a><span>›</span><span>{shortAuthors(r.authors)} {r.year}</span></div>
        <h1 className="page-title reading-title">{r.title}</h1>
        <div className="meta-row">
          <span className="meta">{r.authors} ({r.year})</span>
          <span className="meta muted">{r.source}, {r.pages}</span>
        </div>
        <div className="meta-row">
          <LivesIn week={r.week} kind="Readings" />
          {r.usedIn && <span className="pill warn">Used in {r.usedIn}</span>}
          <span className="pill">{r.required ? 'Required' : 'Optional'} · ~{r.minutes} min</span>
        </div>

        <div className="paper">
          <div className="paper-page">
            <div className="paper-venue">{r.source} · {r.year}</div>
            <div className="paper-title">{r.title}</div>
            <div className="paper-authors">{r.authors.replace(/\s&\s/, ', ')}</div>
            <div className="paper-h">Abstract</div>
            <p className="paper-abs">{r.abstract}</p>
            {r.id === 'r13' && (
              <>
                <div className="paper-h">Table 2 · Summary of findings (excerpt)</div>
                <table className="paper-table">
                  <thead><tr><th>Technique</th><th>Space</th><th>Local tasks</th><th>Dispersed tasks</th></tr></thead>
                  <tbody>
                    <tr><td>Simple line graph</td><td>shared</td><td>fastest</td><td>degrades at 8 series</td></tr>
                    <tr><td>Braided graph</td><td>shared</td><td>fast</td><td>degrades at 8 series</td></tr>
                    <tr><td>Small multiples</td><td>split</td><td>slower</td><td>robust</td></tr>
                    <tr><td>Horizon graph</td><td>split</td><td>slower</td><td>robust, compact</td></tr>
                  </tbody>
                </table>
                <div className="paper-h">6 · Design implications</div>
                <p className="paper-abs">Use shared-space techniques when the task is to compare values at a single point in time and the number of series is small. When the task requires comparing values dispersed across the time axis, or more than a handful of series must be shown, split-space techniques with a common scale offer more consistent accuracy.</p>
              </>
            )}
            <div className="paper-fade">Pages {r.pages.replace('pp. ', '')} · course reserve PDF</div>
          </div>
        </div>
      </div>
      <aside className="rail">
        <div className="card rail-card">
          <button className={'btn block ' + (read ? '' : 'primary')} onClick={() => { update((s) => ({ ...s, read: { ...s.read, [r.id]: !read } })); toast(read ? 'Marked as unread' : 'Marked as read'); }}>
            <Icon name="check" /> {read ? 'Read · undo' : 'Mark as read'}
          </button>
          <button className="btn block" onClick={() => { navigator.clipboard?.writeText(citation); toast('Citation copied'); }}><Icon name="copy" /> Copy citation</button>
          <div className="muted small">First opened {fmtDayTime(state.opened[r.id] || Date.now())}</div>
        </div>
        {r.note && (
          <div className="card rail-card note-card">
            <div className="rail-head"><Icon name="info" /> Note from Prof. Teague</div>
            <p>{r.note}</p>
          </div>
        )}
        {r.question && (
          <div className="card rail-card">
            <div className="rail-head">Think about it</div>
            <p>{r.question}</p>
          </div>
        )}
        {r.usedIn === 'PS4' && (
          <a className="card rail-card linkcard" href="#/draft/ps4"><Icon name="bookmark" /> Insert this citation from your PS4 write-up <Icon name="arrow-right" /></a>
        )}
        <div className="card rail-card">
          <div className="rail-head">Also in week {r.week}</div>
          <ul className="mini-list">
            {sameWeek.map((x) => (
              <li key={x.id} className={state.opened[x.id] ? 'done' : ''}>
                <span className="tick-box">{state.opened[x.id] ? <Icon name="check" size={12} /> : null}</span>
                <a href={`#/readings/${x.id}`}>{shortAuthors(x.authors)} ({x.year})</a>
              </li>
            ))}
          </ul>
          <div className="pager">
            {idx > 0 && <a href={`#/readings/${READINGS[idx - 1].id}`}><Icon name="chev-left" /> Previous</a>}
            {idx < READINGS.length - 1 && <a href={`#/readings/${READINGS[idx + 1].id}`}>Next <Icon name="chev-right" /></a>}
          </div>
        </div>
      </aside>
    </div>
  );
}
