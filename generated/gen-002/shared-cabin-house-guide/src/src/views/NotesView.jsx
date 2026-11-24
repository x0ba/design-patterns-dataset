import { useState } from 'react';
import { PINS } from '../data/pins.js';
import { PIN_BY_ID } from '../lib/lookup.js';
import { useAppState } from '../state.jsx';
import { useGo } from '../lib/router.js';
import { useNow, isoToDate } from '../lib/useNow.js';
import { fmtDateTime } from '../lib/clock.js';

const AUTHORS = ['Ellen', 'Pete', 'Kari'];

function localIso(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NotesView({ params }) {
  const go = useGo();
  const now = useNow();
  const { notes, addNote } = useAppState();
  const [author, setAuthor] = useState('Ellen');
  const [body, setBody] = useState('');
  const [pinId, setPinId] = useState('');
  const filter = params.get('by') || 'all';

  const shown = notes.filter((n) => filter === 'all' || n.by === filter);

  const submit = (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    addNote({
      id: `n-${Date.now()}`,
      by: author,
      at: localIso(now),
      body: text,
      pins: pinId ? [pinId] : [],
    });
    setBody('');
    setPinId('');
  };

  return (
    <div className="notes-view">
      <section className="card notes-main">
        <div className="notes-head">
          <div>
            <div className="eyebrow">Family notes</div>
            <h2>What each of us wrote, and when</h2>
          </div>
          <div className="type-filters" role="group" aria-label="Filter by author">
            {['all', ...AUTHORS].map((a) => (
              <button
                key={a}
                type="button"
                className={`type-pill${filter === a ? ' is-on' : ''}`}
                style={{ '--c': 'var(--pine)' }}
                aria-pressed={filter === a}
                onClick={() => go('notes', a === 'all' ? {} : { by: a })}
              >
                {a === 'all' ? 'Everyone' : a}
              </button>
            ))}
          </div>
        </div>

        <ol className="note-list">
          {shown.map((n) => (
            <li key={n.id} className="note">
              <div className="note-head">
                <span className="avatar" aria-hidden="true">{n.by[0]}</span>
                <span className="note-by">{n.by}</span>
                <span className="muted small">{fmtDateTime(isoToDate(n.at))}</span>
              </div>
              <p>{n.body}</p>
              {n.pins?.length > 0 && (
                <div className="note-pins">
                  {n.pins.map((id) => PIN_BY_ID[id] && (
                    <button key={id} type="button" className="chip-link" onClick={() => go('pins', { pin: id })}>
                      {id} · {PIN_BY_ID[id].title.split(/ [–—] | \(/)[0]}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
          {shown.length === 0 && <li className="muted">No notes from {filter}.</li>}
        </ol>
      </section>

      <aside className="card note-form-card">
        <h3 className="section-h">Leave a note</h3>
        <form onSubmit={submit} className="note-form">
          <label>
            Your name
            <select value={author} onChange={(e) => setAuthor(e.target.value)}>
              {AUTHORS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label>
            About a pin (optional)
            <select value={pinId} onChange={(e) => setPinId(e.target.value)}>
              <option value="">No pin</option>
              {PINS.map((p) => (
                <option key={p.id} value={p.id}>{p.id} · {p.title.split(/ [–—] | \(/)[0]}</option>
              ))}
            </select>
          </label>
          <label>
            Note
            <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What you found, what changed, what the next person should know." />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!body.trim()}>Post note</button>
          <p className="muted small">Notes are dated with the time you post them.</p>
        </form>
      </aside>
    </div>
  );
}
