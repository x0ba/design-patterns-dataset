export default function Header({ changeCount, onExport, onReset }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">CP</div>
        <div>
          <div className="brand-name">Commonplace Placements</div>
          <div className="brand-sub">Service-Learning Office · Spring 2027</div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="due-pill">
          <span>Due to faculty</span>
          <strong>Fri, Nov 20</strong>
        </div>
        {changeCount > 0 && (
          <span className="changes-pill" title="Changes are saved in this browser only">
            {changeCount} {changeCount === 1 ? 'change' : 'changes'} saved in this browser
          </span>
        )}
        <button className="btn ghost" onClick={onReset} disabled={changeCount === 0}>
          Reset changes
        </button>
        <button className="btn primary" onClick={onExport}>
          Export CSV
        </button>
        <div className="user">
          <div className="avatar" aria-hidden="true">ID</div>
          <div>
            <div className="user-name">Ifeoma Daniels</div>
            <div className="user-role">Service-learning coordinator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
