import { useEffect, useState } from 'react';
import { useApp, readiness } from '../store';
import { Sidebar } from './Sidebar';
import { CardsView } from './CardsView';
import { ChangesView } from './ChangesView';
import { CommentsView } from './CommentsView';
import { RulebookView } from './RulebookView';
import { PlaytestsView } from './PlaytestsView';
import { PrintPreview } from './PrintPreview';
import { Avatar, Icon } from './ui';
import { clock, dayLabel, nowV } from '../lib/time';

function Topbar() {
  const { state, dispatch } = useApp();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 20000); return () => clearInterval(t); }, []);
  const r = readiness(state);
  const n = nowV();
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>Saltwind Exchange</h1>
        <span className="pill">v0.7 draft</span>
      </div>
      <span className="spacer" />
      <button className={`readiness ${r.blockers ? 'blocked' : 'ready'}`} onClick={() => dispatch({ type: 'view', view: 'rulebook' })} title="Open the rulebook's print checklist">
        <Icon name="print" size={15} />
        {r.blockers ? <>Rulebook: <strong>{r.blockers} to settle</strong> before print</> : <>Rulebook is <strong>ready to print</strong></>}
      </button>
      <span className="clock">{dayLabel(n)} &middot; {clock(n)}</span>
      <Avatar id="hollis" size={30} />
    </header>
  );
}

export function App() {
  const { state, dispatch } = useApp();
  useEffect(() => {
    if (!state.toast) return;
    const id = state.toast.id;
    const t = setTimeout(() => dispatch({ type: 'dismissToast' }), 6500);
    return () => clearTimeout(t);
  }, [state.toast?.id, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="app">
        <Sidebar />
        <main className="main">
          <Topbar />
          {state.view === 'cards' && <CardsView />}
          {state.view === 'rulebook' && <RulebookView />}
          {state.view === 'changes' && <ChangesView />}
          {state.view === 'comments' && <CommentsView />}
          {state.view === 'playtests' && <PlaytestsView />}
        </main>
        <div className="toasts" aria-live="polite">
          {state.toast && (
            <div className="toast" key={state.toast.id} role="status">
              <span>{state.toast.msg}</span>
              {state.toast.undo && <button className="toast-btn" onClick={() => dispatch({ type: 'undo' })}>Undo</button>}
              <button className="toast-x" aria-label="Dismiss" onClick={() => dispatch({ type: 'dismissToast' })}><Icon name="x" size={14} /></button>
            </div>
          )}
        </div>
      </div>
      {state.printOpen && <PrintPreview />}
    </>
  );
}
