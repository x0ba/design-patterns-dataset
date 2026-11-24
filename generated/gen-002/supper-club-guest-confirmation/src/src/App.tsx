import { useState } from 'react';
import { CAPACITY, DINNER, REQUESTS_CLOSE, REQUESTS } from './data';
import { fmtDateTime, fmtDuration, seatsFor } from './logic';
import { useAppStore, type Action, type AppState } from './store';
import { OverviewPage } from './pages/Overview';
import { RequestsPage } from './pages/Requests';
import { ReviewPage } from './pages/Review';
import { ChargesPage } from './pages/Charges';

export type Page = 'overview' | 'requests' | 'review' | 'charges';

export interface PageProps {
  state: AppState;
  dispatch: (a: Action) => void;
  now: number;
  go: (p: Page) => void;
}

const NAV: { id: Page; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'requests', label: 'Requests & seats' },
  { id: 'review', label: 'Review & confirm' },
  { id: 'charges', label: 'Charges & waitlist' },
];

export default function App() {
  const { state, dispatch, now, reset } = useAppStore();
  const [page, setPage] = useState<Page>('overview');
  const confirmed = state.confirmedAt !== null;
  const selectedSeats = seatsFor(state.selected);
  const closeIn = REQUESTS_CLOSE - now;

  const badge = (id: Page): string | number | null => {
    if (id === 'requests') return REQUESTS.length;
    if (id === 'review') return confirmed ? 'Done' : state.selected.length ? `${selectedSeats}/${CAPACITY}` : null;
    if (id === 'charges') return confirmed ? Object.values(state.charges).filter((c) => c.status === 'charged').length : null;
    return null;
  };

  const props: PageProps = { state, dispatch, now, go: setPage };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name">Longtable</div>
            <div className="brand-sub">Supper club admin</div>
          </div>
        </div>

        <div className="dinner-card">
          <div className="dinner-kicker">Next dinner</div>
          <div className="dinner-title">{DINNER.title}</div>
          <div className="dinner-meta">
            {DINNER.courses} courses · Sun, Nov 29
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => {
            const b = badge(n.id);
            return (
              <button
                key={n.id}
                className={`nav-item ${page === n.id ? 'active' : ''}`}
                onClick={() => setPage(n.id)}
              >
                <span>{n.label}</span>
                {b !== null && <span className="nav-badge">{b}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="demo-note">
            Prototype with mock data. No cards are charged and no payments leave this browser.
          </div>
          <button className="linkish" onClick={reset}>Reset demo to start of day</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{NAV.find((n) => n.id === page)?.label}</div>
          {confirmed ? (
            <div className="status-pill ok">
              Guest list confirmed {fmtDateTime(state.confirmedAt!)}
            </div>
          ) : closeIn > 0 ? (
            <div className={`status-pill ${closeIn < 3 * 3600000 ? 'warn' : ''}`}>
              Requests close tonight at 11:59 PM · {fmtDuration(closeIn)} left
            </div>
          ) : (
            <div className="status-pill">Requests closed</div>
          )}
        </header>

        <main className="content">
          {page === 'overview' && <OverviewPage {...props} />}
          {page === 'requests' && <RequestsPage {...props} />}
          {page === 'review' && <ReviewPage {...props} />}
          {page === 'charges' && <ChargesPage {...props} />}
        </main>
      </div>
    </div>
  );
}
