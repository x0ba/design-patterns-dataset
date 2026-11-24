import { GRAPHICS, PROJECT, OTHER_PROJECTS } from '../data.js';

export default function Sidebar({ selection, onGraphic, onInbox, riddingUnread, inboxCounts }) {
  const otherTotal = Object.values(inboxCounts).reduce((a, b) => a + b, 0);
  return (
    <aside className="sidebar">
      <div className="brand">
        <svg width="24" height="24" viewBox="0 0 22 22" aria-hidden="true">
          <rect width="22" height="22" rx="5" fill="#1F5F5B" />
          <path d="M5 15 L9 10 L12.5 13 L17 6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="brand-name">Proofloop</div>
          <div className="brand-sub">Fieldnote Studio</div>
        </div>
      </div>

      <div className="section-label">
        Riding Back
        {riddingUnread > 0 && <span className="count">{riddingUnread}</span>}
      </div>
      <div className="project-meta-block">
        <div className="project-name">{PROJECT.title}</div>
        <div className="muted small">
          {PROJECT.client}
        </div>
        <div className="muted small">
          Due {PROJECT.dueLabel} · {PROJECT.daysLeft} days
        </div>
      </div>

      <ul className="graphic-list">
        {GRAPHICS.map((g) => {
          const on = selection.kind === 'graphic' && selection.id === g.id;
          return (
            <li key={g.id}>
              <button className={`graphic-item ${on ? 'on' : ''}`} onClick={() => onGraphic(g.id)}>
                <span className="gnum">G{g.n}</span>
                <span className="gbody">
                  <span className="gtitle">{g.title}</span>
                  <span className={`gstatus ${g.tone}`}>{g.status}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="section-label">
        Other projects
        <span className="muted small">{otherTotal} unread</span>
      </div>
      <ul className="other-list">
        {OTHER_PROJECTS.map((p) => {
          const on = selection.kind === 'inbox' && selection.id === p.id;
          const n = inboxCounts[p.id];
          return (
            <li key={p.id}>
              <button className={`other-item ${on ? 'on' : ''}`} onClick={() => onInbox(p.id)}>
                <span className="other-name">{p.title}</span>
                <span className="muted small">{p.client}</span>
                {n > 0 && <span className="count">{n}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="me">
        <div className="avatar studio">IV</div>
        <div>
          <div className="strong">Ines Varga</div>
          <div className="muted small">Creative lead, co-owner</div>
        </div>
      </div>
    </aside>
  );
}
