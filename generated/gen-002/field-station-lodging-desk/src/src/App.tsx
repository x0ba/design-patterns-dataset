import { useEffect, useRef, useState } from 'react';
import { BunksView } from './views/Bunks';
import { HelpView } from './views/Help';
import { MealsView } from './views/Meals';
import { PeopleView } from './views/People';
import { TodayView, buildTasks } from './views/Today';
import { TransfersView } from './views/Transfers';
import { COURSE, STATION, USER } from './config';
import { StoreProvider, useStore } from './state/store';
import { clockLabel, dayLabel, summary, untilLabel } from './logic';

function useRoute(): string[] {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
}

const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'bunks', label: 'Bunks' },
  { id: 'people', label: 'People' },
  { id: 'meals', label: 'Meals' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'help', label: 'Help' },
];

function Shell() {
  const parts = useRoute();
  const { state, dispatch } = useStore();
  const view = parts[0] && NAV.some((n) => n.id === parts[0]) ? parts[0] : 'today';
  const s = summary(state);
  const openTasks = buildTasks(state).filter((t) => !t.done).length;
  const minutesLeft = COURSE.releaseMinute - state.clock;

  const badges: Record<string, number> = {
    today: openTasks,
    bunks: s.conflicts.length,
    people: s.tentative + s.emptyCount,
  };

  const [toast, setToast] = useState<string | null>(null);
  const lastSeen = useRef(state.nextLogId);
  useEffect(() => {
    if (state.nextLogId === lastSeen.current) return;
    lastSeen.current = state.nextLogId;
    const last = state.log[state.log.length - 1];
    setToast(last ? last.text : null);
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [state.nextLogId, state.log]);

  let content;
  switch (view) {
    case 'bunks':
      content = <BunksView selectedBunkId={parts[1]} />;
      break;
    case 'people':
      content = <PeopleView />;
      break;
    case 'meals':
      content = <MealsView />;
      break;
    case 'transfers':
      content = <TransfersView />;
      break;
    case 'help':
      content = <HelpView articleId={parts[1]} />;
      break;
    default:
      content = <TodayView />;
  }

  const reset = () => {
    if (window.confirm('Reset Cabinroll to the Tue 17 Nov 09:15 starting state? Your changes in this browser will be lost.')) {
      dispatch({ type: 'reset' });
      window.location.hash = '#/today';
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          Cabinroll
          <small>{STATION}</small>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.id} href={`#/${n.id}`} className={view === n.id ? 'active' : ''} aria-current={view === n.id ? 'page' : undefined}>
              <span>{n.label}</span>
              {badges[n.id] !== undefined && badges[n.id] > 0 && <span className="badge">{badges[n.id]}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user">
            <strong>{USER.name}</strong>
            <span>{USER.title}</span>
          </div>
          <button className="link-btn light" onClick={reset}>
            Reset demo data
          </button>
          <div className="foot-note">Changes are saved in this browser only.</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <strong>{dayLabel('2026-11-17')}</strong>
            <span className="subtle">{clockLabel(state.clock)} station time</span>
          </div>
          <div className={`countdown ${minutesLeft <= 60 ? 'urgent' : ''}`}>
            {minutesLeft > 0
              ? `${COURSE.code} release at 17:00 · ${untilLabel(minutesLeft)}`
              : `${COURSE.code} release time has passed`}
          </div>
        </header>

        {content}

        {toast && (
          <div className="toast" role="status">
            <span className="toast-label">Saved</span>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
