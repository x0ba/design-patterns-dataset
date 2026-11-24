import { useMemo, useState } from 'react';
import { useRoute, go } from './lib/router.js';
import { useAppState } from './state.jsx';
import { useNow } from './lib/useNow.js';
import { untilFreeze, fmtDate } from './lib/clock.js';
import { PINS } from './data/pins.js';
import { STEPS } from './data/steps.js';
import { MANUALS } from './data/manuals.js';
import { FLOOR_LABEL, pinLocation, shortTitle } from './lib/lookup.js';
import { FLOORS, PROPERTY } from './data/property.js';
import ClosingView from './views/ClosingView.jsx';
import MapView from './views/MapView.jsx';
import PlansView from './views/PlansView.jsx';
import PinsView from './views/PinsView.jsx';
import ManualsView from './views/ManualsView.jsx';
import NotesView from './views/NotesView.jsx';
import { TypeChip } from './components/ui.jsx';

const NAV = [
  { id: 'closing', label: 'Fall closing' },
  { id: 'map', label: 'Property map' },
  { id: 'plans', label: 'Floor plans' },
  { id: 'pins', label: 'Pins' },
  { id: 'manuals', label: 'Manuals' },
  { id: 'notes', label: 'Family notes' },
];

function Header() {
  const now = useNow();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return { pins: [], steps: [] };
    const words = needle.split(/\s+/);
    const match = (s) => words.every((w) => s.toLowerCase().includes(w));
    return {
      pins: PINS.filter((p) => match(`${p.id} ${p.title} ${p.notes} ${p.type}`)).slice(0, 6),
      steps: STEPS.filter((s) => match(`${s.n} ${s.title} ${s.how}`)).slice(0, 4),
    };
  }, [q]);

  const hasResults = results.pins.length + results.steps.length > 0;

  const choose = (path, params) => {
    setOpen(false);
    setQ('');
    go(path, params);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 12 12 4l8 8v8H4z" /><path d="M9.5 20v-5h5v5" /></svg>
        </span>
        <span className="brand-name">Cabinbook</span>
      </div>
      <div className="property-pick">
        <span className="property-name">{PROPERTY.name}</span>
        <span className="property-place">{PROPERTY.place}</span>
      </div>

      <div className="search-wrap">
        <input
          className="global-search"
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); setQ(''); }
            if (e.key === 'Enter' && results.pins[0]) choose('pins', { pin: results.pins[0].id, q: q.trim() });
          }}
          placeholder="Search pins and steps"
          aria-label="Search pins and closing steps"
          aria-expanded={open && hasResults}
        />
        {open && q.trim() && (
          <div className="search-pop" role="listbox">
            {!hasResults && <div className="muted small pad">Nothing matches “{q.trim()}”.</div>}
            {results.steps.map((s) => (
              <button key={`s${s.n}`} type="button" className="search-row" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(`closing/${s.n}`)}>
                <span className="step-badge">Step {s.n}</span> {s.title}
              </button>
            ))}
            {results.pins.map((p) => (
              <button key={p.id} type="button" className="search-row" onMouseDown={(e) => e.preventDefault()} onClick={() => choose('pins', { pin: p.id })}>
                <TypeChip type={p.type} small />
                <span className="search-title">{shortTitle(p.title)}</span>
                <span className="muted small">{pinLocation(p)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="freeze-chip" title="Forecast hard freeze, Tuesday night">
        <span aria-hidden="true">❄</span> Freeze Tue 10 pm · {untilFreeze(now)}
      </div>
      <div className="user-chip" aria-label="Signed in as Ellen Sørby">
        <span className="avatar" aria-hidden="true">E</span>
        Ellen Sørby
      </div>
    </header>
  );
}

function Sidebar({ current }) {
  const { stepsDone, location, notes, reset } = useAppState();
  const doneCount = Object.keys(stepsDone).length;
  const counts = {
    closing: `${doneCount}/22`,
    pins: PINS.length,
    manuals: MANUALS.length,
    notes: notes.length,
  };
  const here = location.floor === 'site'
    ? 'Outside, on the property'
    : `${FLOORS[location.floor].rooms.find((r) => r.id === location.room)?.name || FLOOR_LABEL[location.floor]} · ${FLOOR_LABEL[location.floor]}`;

  return (
    <nav className="sidebar" aria-label="Main">
      <ul className="nav">
        {NAV.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`nav-item${current === item.id ? ' is-on' : ''}`}
              aria-current={current === item.id ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              <span>{item.label}</span>
              {counts[item.id] !== undefined && <span className="nav-count">{counts[item.id]}</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="here-box">
        <div className="eyebrow">You are in</div>
        <div className="here-name">{here}</div>
        <button type="button" className="link" onClick={() => go('plans/' + (location.floor === 'site' ? 'ground' : location.floor))}>
          Open the plan
        </button>
      </div>

      <div className="sidebar-foot">
        <p className="muted small">Sample data for the Sørby cabin. Changes are saved in this browser.</p>
        <button type="button" className="link" onClick={() => { if (window.confirm('Reset every change in this browser to the Saturday starting point?')) reset(); }}>
          Reset demo
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  const route = useRoute();
  const current = NAV.some((n) => n.id === route.segments[0]) ? route.segments[0] : 'closing';

  let view;
  switch (current) {
    case 'map':
      view = <MapView params={route.params} />;
      break;
    case 'plans':
      view = <PlansView segments={route.segments} params={route.params} />;
      break;
    case 'pins':
      view = <PinsView params={route.params} />;
      break;
    case 'manuals':
      view = <ManualsView segments={route.segments} />;
      break;
    case 'notes':
      view = <NotesView params={route.params} />;
      break;
    default:
      view = <ClosingView segments={route.segments} />;
  }

  return (
    <div className="app">
      <Header />
      <div className="body">
        <Sidebar current={current} />
        <main className="main" id="main">
          {view}
        </main>
      </div>
    </div>
  );
}
