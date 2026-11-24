import type { ReactNode } from 'react';

interface Props {
  section: string;
  counts: { advisories: number; repos: number; tags: number };
}

export function Sidebar({ section, counts }: Props) {
  const item = (key: string, href: string, label: string, count: ReactNode, alert = false) => (
    <a href={href} className={`nav-item${section === key ? ' active' : ''}`} aria-current={section === key ? 'page' : undefined}>
      <span>{label}</span>
      <span className={`count${alert ? ' count-alert' : ''}`}>{count}</span>
    </a>
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <rect width="24" height="24" rx="5" fill="#3654d6" />
          <path d="M5 8.5 12 5l7 3.5v7L12 19l-7-3.5z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M5 8.5 12 12l7-3.5M12 12v7" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        <span className="brand-name">Cratehold</span>
      </div>

      <nav className="nav">
        <div className="nav-label">Security</div>
        {item('advisory', '#/advisory', 'Advisories', counts.advisories, true)}
        <div className="nav-label">Registry</div>
        {item('repos', '#/repos', 'Repositories', counts.repos.toLocaleString())}
        {item('tags', '#/tags', 'Tags', counts.tags.toLocaleString())}
      </nav>

      <div className="sidebar-foot">
        <div className="org-line">
          <span className="org-name">pawsched</span>
          <span className="org-sub">Private registry</span>
        </div>
        <div className="me">
          <span className="avatar">NH</span>
          <span>
            <span className="me-name">Noor Haddad</span>
            <span className="me-sub">Admin</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
