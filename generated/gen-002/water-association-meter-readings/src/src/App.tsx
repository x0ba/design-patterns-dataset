import { useEffect, useMemo, useReducer, useState } from 'react';
import { ASSOCIATION, CONNECTIONS } from './data';
import { evaluate } from './logic';
import { clearSaved, loadState, reducer, saveState } from './store';
import ReadingsView from './ReadingsView';
import BillsView from './BillsView';
import { Check, Drop } from './icons';

type View = 'readings' | 'bills';

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [view, setView] = useState<View>('readings');

  useEffect(() => saveState(state), [state]);

  const evs = useMemo(() => Object.fromEntries(CONNECTIONS.map((c) => [c.meter, evaluate(c, state.entries[c.meter])])), [state.entries]);
  const openCount = CONNECTIONS.filter((c) => evs[c.meter].open).length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Drop width={22} height={22} />
          </span>
          <span className="brand-name">Wellshare</span>
        </div>
        <div className="assoc">{ASSOCIATION}</div>
        <nav className="nav" aria-label="Main">
          <button className={`nav-btn ${view === 'readings' ? 'nav-btn--on' : ''}`} aria-current={view === 'readings' ? 'page' : undefined} onClick={() => setView('readings')}>
            Meter readings
            {openCount > 0 && !state.locked && <span className="nav-badge" aria-label={`${openCount} need review`}>{openCount}</span>}
          </button>
          <button className={`nav-btn ${view === 'bills' ? 'nav-btn--on' : ''}`} aria-current={view === 'bills' ? 'page' : undefined} onClick={() => setView('bills')}>
            Bills <span className={`nav-state ${state.locked ? 'nav-state--final' : ''}`}>{state.locked ? 'Final' : 'Draft'}</span>
          </button>
        </nav>
        <div className="who">
          <span className="saved">
            <Check width={16} height={16} /> Saved on this computer
          </span>
          <span className="who-name">
            Gordon Pruitt <small>Treasurer</small>
          </span>
        </div>
      </header>

      <main className="main">
        {view === 'readings' ? (
          <ReadingsView state={state} evs={evs} dispatch={dispatch} onLocked={() => setView('bills')} onOpenBills={() => setView('bills')} />
        ) : (
          <BillsView state={state} evs={evs} dispatch={dispatch} onBack={() => setView('readings')} />
        )}
      </main>

      <footer className="foot">
        <span>Wellshare · record-keeping for volunteer-run water associations</span>
        <button
          className="linkbtn"
          onClick={() => {
            if (window.confirm('Start over with the sample data? Everything typed so far will be cleared.')) {
              clearSaved();
              dispatch({ type: 'reset' });
              setView('readings');
              window.setTimeout(() => window.location.reload(), 0);
            }
          }}
        >
          Reset sample data
        </button>
      </footer>
    </div>
  );
}
