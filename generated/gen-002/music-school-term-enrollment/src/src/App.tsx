import type { ViewId } from './types';
import { StoreProvider, useNow, useStore } from './store';
import { DashboardView } from './views/DashboardView';
import { EnrollView } from './views/EnrollView';
import { FamiliesView } from './views/FamiliesView';
import { ScheduleView } from './views/ScheduleView';
import { TransactionsView } from './views/TransactionsView';
import { fmtDateTime } from './lib/time';

const NAV: { id: ViewId; label: string }[] = [
  { id: 'dashboard', label: 'Today' },
  { id: 'enroll', label: 'New enrollment' },
  { id: 'families', label: 'Families' },
  { id: 'schedule', label: 'Schedule and seats' },
  { id: 'transactions', label: 'Transactions' },
];

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { state, dispatch } = useStore();
  const now = useNow();
  const view = (() => {
    switch (state.view) {
      case 'dashboard':
        return <DashboardView />;
      case 'enroll':
        return <EnrollView />;
      case 'families':
        return <FamiliesView />;
      case 'schedule':
        return <ScheduleView />;
      case 'transactions':
        return <TransactionsView />;
    }
  })();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            ♪
          </span>
          <span>Lessonbound</span>
        </div>
        <div className="school">Riverbend Music Studio</div>
        <nav aria-label="Main">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${state.view === item.id ? 'active' : ''}`}
              aria-current={state.view === item.id ? 'page' : undefined}
              onClick={() => dispatch({ type: 'setView', view: item.id })}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="user">
          <strong>Marisol Grant</strong>
          <span>Office manager, front office</span>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span className="muted small">Front office · Winter 2027 enrollment</span>
          <span className="clock">{fmtDateTime(now)}</span>
        </header>
        {view}
      </main>
    </div>
  );
}
