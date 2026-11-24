import { PROFILE } from '../data/profile.js';

export default function TopBar({ query, onQuery, onSubmit, todayLabel, fridayLabel, daysToFriday }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path d="M3 15 C 3 8, 8 4, 17 3 C 16 11, 12 16, 3 15 Z" fill="currentColor" />
          </svg>
        </span>
        <span className="brand-name">Leadloom</span>
      </div>

      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(query);
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search 2.1M articles from 4,800 publications"
          aria-label="Search coverage"
        />
        <button type="submit" className="btn primary">
          Search
        </button>
      </form>

      <div className="deadline-chip">
        <span className="kicker">Today {todayLabel}</span>
        <span>
          Pitch by <strong>{fridayLabel}</strong>
          <span className="muted"> · {daysToFriday} days</span>
        </span>
      </div>

      <div className="me">
        <span className="avatar" aria-hidden="true">
          PH
        </span>
        <div>
          <div className="me-name">{PROFILE.name}</div>
          <div className="muted small">{PROFILE.beat}</div>
        </div>
      </div>
    </header>
  );
}
