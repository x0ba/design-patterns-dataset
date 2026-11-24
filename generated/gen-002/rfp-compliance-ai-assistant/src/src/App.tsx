import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type Dispatch } from 'react';
import { BID, DUE } from './data';
import { reducer, initialState, type AppState, type Action, type Req, isOpenGap, now, toCSV, ADDENDA_KEYS } from './state';
import { Icon, Avatar } from './ui';
import { MatrixView } from './Matrix';
import { GapsView } from './Gaps';
import { AddendaView } from './Addenda';
import { RunView } from './Run';

interface Toast { id: number; text: string; undo?: Req }
interface Ctx { state: AppState; dispatch: Dispatch<Action>; act: (a: Action, text: string, undoable?: boolean) => void }
const AppCtx = createContext<Ctx>(null!);
export const useApp = () => useContext(AppCtx);

function useCountdown() {
  const [t, setT] = useState(now());
  useEffect(() => {
    const i = setInterval(() => setT(now()), 20000);
    return () => clearInterval(i);
  }, []);
  const ms = DUE.getTime() - t.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tid = useRef(0);
  const countdown = useCountdown();

  const act = useCallback((a: Action, text: string, undoable = true) => {
    const id = 'id' in a ? a.id : null;
    const prev = id ? state.reqs.find((r) => r.id === id) : undefined;
    dispatch(a);
    const t: Toast = { id: ++tid.current, text, undo: undoable ? prev : undefined };
    setToasts((ts) => [...ts.slice(-1), t]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 5200);
  }, [state.reqs]);

  const openGaps = state.reqs.filter(isOpenGap).length;
  const verified = Object.keys(state.verifiedAddenda).length;

  const exportCSV = () => {
    const blob = new Blob([toCSV(state.reqs)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'RFP-2026-114_compliance-matrix_draft-v6.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const tabs: { id: AppState['view']; label: string; count?: string }[] = [
    { id: 'matrix', label: 'Compliance matrix', count: String(state.reqs.filter((r) => r.review !== 'removed').length) },
    { id: 'gaps', label: 'Gaps & routing', count: String(openGaps) },
    { id: 'addenda', label: 'Addenda check', count: `${verified}/${ADDENDA_KEYS.length}` },
    { id: 'run', label: 'AI run' },
  ];

  return (
    <AppCtx.Provider value={{ state, dispatch, act }}>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="logo"><Icon name="check" size={14} /></span>
            <span className="brand-name">Bidwright</span>
          </div>
          <div className="bid">
            <div className="bid-title">Port Ellery 311 System Replacement</div>
            <div className="bid-sub" title={`${BID.title} · ${BID.draft}, updated ${BID.draftUpdated}`}>RFP No. {BID.rfpNo} · Draft v6 · {BID.draftUpdated}</div>
          </div>
          <nav className="tabs">
            {tabs.map((t) => (
              <button key={t.id} className={`tab ${state.view === t.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'view', view: t.id })}>
                {t.label}{t.count && <span className="tab-count">{t.count}</span>}
              </button>
            ))}
          </nav>
          <div className="top-right">
            <div className="due" title="Proposal due date">
              <Icon name="clock" />
              <div>
                <div className="due-when">Due Fri Nov 20, 2:00 PM</div>
                <div className="due-left">{countdown} left</div>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={exportCSV} title="Download the current matrix as CSV"><Icon name="download" /> Export</button>
            <Avatar id="leah" size={28} />
          </div>
        </header>
        <main className="main">
          {state.view === 'matrix' && <MatrixView />}
          {state.view === 'gaps' && <GapsView />}
          {state.view === 'addenda' && <AddendaView />}
          {state.view === 'run' && <RunView />}
        </main>
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <span>{t.text}</span>
              {t.undo && (
                <button className="toast-undo" onClick={() => { dispatch({ type: 'restore', req: t.undo! }); setToasts((ts) => ts.filter((x) => x.id !== t.id)); }}>
                  <Icon name="undo" size={12} /> Undo
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppCtx.Provider>
  );
}
