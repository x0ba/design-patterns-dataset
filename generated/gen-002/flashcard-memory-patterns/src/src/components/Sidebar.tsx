const NAV = [
  { label: 'Study', enabled: false },
  { label: 'Decks', enabled: false },
  { label: 'Insights', enabled: true },
  { label: 'Settings', enabled: false },
];

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
        </span>
        Recallery
      </div>
      <ul className="nav">
        {NAV.map((n) => (
          <li key={n.label}>
            <button
              className={`nav-item ${n.label === 'Insights' ? 'active' : ''}`}
              aria-current={n.label === 'Insights' ? 'page' : undefined}
              aria-disabled={!n.enabled}
              disabled={!n.enabled}
              title={n.enabled ? undefined : 'Not part of this prototype'}
            >
              {n.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-foot">
        <div className="streak">
          <span className="streak-num">61</span>
          <span>day streak</span>
        </div>
        <div className="profile">
          <span className="avatar" aria-hidden="true">MD</span>
          <span>
            <strong>Mariana Duque</strong>
            <span className="muted small">AP Biology · AP Spanish</span>
          </span>
        </div>
      </div>
    </nav>
  );
}
