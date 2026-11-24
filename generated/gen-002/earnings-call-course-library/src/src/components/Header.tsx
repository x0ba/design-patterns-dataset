export type View = 'listen' | 'library';

interface HeaderProps {
  view: View;
  onView: (view: View) => void;
  queueCount: number;
  clipCount: number;
}

// Memo deadline: Thursday, November 19, 2026, 23:59 local time.
const MEMO_DUE = new Date(2026, 10, 19, 23, 59);

function memoCountdown(now: Date): string {
  const msLeft = MEMO_DUE.getTime() - now.getTime();
  if (msLeft <= 0) return 'Memo deadline passed';
  const hours = Math.floor(msLeft / 3_600_000);
  if (hours < 24) return `${hours} h left`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export function Header({ view, onView, queueCount, clipCount }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M2 11 Q5 4 9 9 T16 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="7" r="1.6" fill="currentColor" />
          </svg>
        </span>
        <span className="brand-name">Callroom</span>
        <span className="brand-course">FIN 341 · Equity Valuation</span>
      </div>

      <nav className="topnav" aria-label="Primary">
        <button
          className={view === 'listen' ? 'active' : ''}
          onClick={() => onView('listen')}
          aria-current={view === 'listen' ? 'page' : undefined}
        >
          Listen
        </button>
        <button
          className={view === 'library' ? 'active' : ''}
          onClick={() => onView('library')}
          aria-current={view === 'library' ? 'page' : undefined}
        >
          Library
          <span className="count">48</span>
        </button>
        <span className="nav-meta" title="Saved clips">
          Clips <strong>{clipCount}</strong>
        </span>
        <span className="nav-meta" title="Calls queued to play next">
          Queue <strong>{queueCount}</strong>
        </span>
      </nav>

      <div className="topbar-right">
        <div className="memo-chip" title="Valuation memo for Harrowgate Outdoor">
          <span className="memo-label">Memo due</span>
          <span className="memo-date">Thu, Nov 19 · 23:59</span>
          <span className="memo-countdown">{memoCountdown(new Date())}</span>
        </div>
        <div className="user-chip" aria-label="Signed in as Daniel Osei">
          <span className="avatar" aria-hidden="true">DO</span>
          <span>Daniel Osei</span>
        </div>
      </div>
    </header>
  );
}
