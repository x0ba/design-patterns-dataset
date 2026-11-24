import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore, contentOf } from './store.jsx';
import { Icon, Toast, Button, Chip } from './ui.jsx';
import { diffAgainstLastTerm } from './diff.js';
import { buildChecklist, checklistProgress } from './checklist.js';
import { TERM } from './data.js';
import { plural } from './lib.js';
import Overview from './pages/Overview.jsx';
import Rooms from './pages/Rooms.jsx';
import Rates from './pages/Rates.jsx';
import Scenarios from './pages/Scenarios.jsx';
import Roles from './pages/Roles.jsx';
import Taxes from './pages/Taxes.jsx';
import Review from './pages/Review.jsx';

const PAGES = {
  overview: { label: 'Setup overview', icon: 'home', C: Overview },
  rooms: { label: 'Rooms', icon: 'bed', C: Rooms },
  rates: { label: 'Rates & packages', icon: 'tag', C: Rates },
  scenarios: { label: 'Practice scenarios', icon: 'flask', C: Scenarios },
  roles: { label: 'Student roles', icon: 'users', C: Roles },
  taxes: { label: 'Taxes & fees', icon: 'percent', C: Taxes },
  review: { label: 'Compare & publish', icon: 'compare', C: Review },
};

const fromHash = () => {
  const h = window.location.hash.replace('#/', '');
  return PAGES[h] ? h : 'overview';
};

export default function App() {
  const { state, dispatch } = useStore();
  const [page, setPage] = useState(fromHash);
  const [intent, setIntent] = useState(null);

  useEffect(() => {
    const on = () => { setPage(fromHash()); setIntent(null); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback((p, i = null) => {
    setIntent(i ? { ...i, at: Date.now() } : null);
    setPage(p);
    window.history.replaceState(null, '', `#/${p}`);
    document.getElementById('main')?.scrollTo({ top: 0 });
  }, []);

  const changes = useMemo(() => diffAgainstLastTerm(contentOf(state)), [state]);
  const progress = useMemo(() => checklistProgress(buildChecklist(state)), [state]);
  const published = state.published && JSON.stringify(state.published.content) === JSON.stringify(contentOf(state));
  const Page = PAGES[page].C;

  const badges = {
    rooms: state.rooms.length,
    rates: state.rates.length,
    scenarios: state.scenarios.length,
    roles: state.roles.reduce((n, r) => n + r.students, 0),
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#e0a93b" />
            <path d="M16 6.5l6.5 8.5h-3.8l4.6 6.5H8.7l4.6-6.5H9.5z" fill="#213a2e" />
          </svg>
          <div>
            <div className="brand-name">Innlab</div>
            <div className="brand-sub">Tamarack House</div>
          </div>
        </div>

        <div className="term-switch">
          <span className="eyebrow">Configuring</span>
          <strong>{TERM.name}</strong>
          <span className="term-meta">Starts in {TERM.startsIn} · {TERM.students} students</span>
        </div>

        <nav aria-label="Setup sections">
          {Object.entries(PAGES).map(([id, p]) => (
            <div key={id}>
              {id === 'review' && <div className="nav-rule" />}
              <a
                href={`#/${id}`}
                className={`nav-item ${page === id ? 'is-active' : ''}`}
                aria-current={page === id ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); go(id); }}
              >
                <Icon name={p.icon} size={18} />
                <span>{p.label}</span>
                {badges[id] !== undefined && <span className="nav-badge">{badges[id]}</span>}
              </a>
            </div>
          ))}
        </nav>

        <div className="side-foot">
          <div className="who">
            <span className="avatar" aria-hidden="true">GA</span>
            <div>
              <strong>Gwen Abernathy</strong>
              <span>Front-office instructor</span>
            </div>
          </div>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              if (window.confirm('Discard every change and go back to the starting data?')) { dispatch({ type: 'reset' }); go('overview'); }
            }}
          >
            Reset demo data
          </button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-status">
            {published ? (
              <Chip tone="good" icon="check">Published for {TERM.name}</Chip>
            ) : (
              <Chip tone="draft">Draft · autosaved</Chip>
            )}
            <button type="button" className="topbar-link" onClick={() => go('review')}>
              {plural(changes.length, 'change')} since {TERM.lastName}
            </button>
            <span className="topbar-sep" aria-hidden="true" />
            <span className="topbar-prog">{progress.done} of {progress.total} checklist tasks done</span>
          </div>
          <Button variant="primary" icon="rocket" onClick={() => go('review')}>Review &amp; publish</Button>
        </header>

        <main id="main" className="main" tabIndex={-1}>
          <Page go={go} intent={intent} key={page} />
        </main>
      </div>
      <Toast />
    </div>
  );
}
