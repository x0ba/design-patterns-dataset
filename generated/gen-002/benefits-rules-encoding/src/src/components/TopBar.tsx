interface Props {
  latestN: number;
  changes: number;
  stale: boolean;
  onRun: () => void;
  onSave: () => void;
}

export function TopBar({ latestN, changes, stale, onRun, onSave }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <LoomMark />
        <span className="brand-name">Statute Loom</span>
      </div>
      <div className="crumbs">
        <span>SNAP eligibility</span>
        <span className="sep">/</span>
        <span>State rule model</span>
        <span className="sep">/</span>
        <strong>Working draft</strong>
      </div>
      <div className="spacer" />
      <span className={`draft-pill ${changes ? 'dirty' : ''}`}>
        Draft on r{latestN} · {changes === 0 ? 'no changes' : `${changes} step${changes === 1 ? '' : 's'} changed`}
      </span>
      <span className={`run-pill ${stale ? 'stale' : ''}`}>{stale ? 'Results stale' : 'Results current'}</span>
      <button className="btn" onClick={onRun}>
        Run all tests
      </button>
      <button className="btn primary" onClick={onSave}>
        Save revision…
      </button>
      <div className="user" title="Signed in">
        <span className="avatar">KA</span>
        <span>Kwame Asante</span>
      </div>
    </header>
  );
}

function LoomMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1" y="1" width="20" height="20" rx="4" fill="#1d3557" />
      <path d="M6 4v14M11 4v14M16 4v14" stroke="#a8c5e6" strokeWidth="1.6" />
      <path d="M4 8h14M4 14h14" stroke="#f2b84b" strokeWidth="1.6" />
    </svg>
  );
}
