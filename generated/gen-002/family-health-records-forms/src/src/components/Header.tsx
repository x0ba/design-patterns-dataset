import { useStore, type View } from '../lib/store';

const NAV: { id: View; label: string }[] = [
  { id: 'forms', label: 'Forms' },
  { id: 'records', label: 'Health records' },
  { id: 'household', label: 'Household' },
];

export function Header() {
  const { state, dispatch } = useStore();
  const active = state.view === 'records' || state.view === 'household' ? state.view : 'forms';

  return (
    <header className="topbar">
      <div className="brand">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#a9472a" />
          <path d="M9 22V10l7 5 7-5v12" fill="none" stroke="#fff7ec" strokeWidth="2.6" strokeLinejoin="round" />
        </svg>
        <span className="brand-name">Hearthchart</span>
      </div>

      <nav className="topnav" aria-label="Main">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`topnav-item${active === n.id ? ' is-active' : ''}`}
            aria-current={active === n.id ? 'page' : undefined}
            onClick={() => dispatch({ type: 'navigate', view: n.id })}
          >
            {n.label}
          </button>
        ))}
      </nav>

      <div className="who">
        <span className="who-household">Brooks household · 5</span>
        <span className="avatar" aria-hidden="true">
          DB
        </span>
        <span className="who-name">Darnell Brooks</span>
      </div>
    </header>
  );
}
