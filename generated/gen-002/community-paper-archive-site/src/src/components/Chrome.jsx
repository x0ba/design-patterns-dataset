import { useEffect, useState } from 'react';
import { labelVisit, navigate, previousVisit } from '../lib/router';
import { longDate, shortDate, issueLabelFromId } from '../lib/format';

const NAV = [
  { href: '#/', label: 'This Month', match: [''] },
  { href: '#/archive', label: 'Archive', match: ['archive', 'issue'] },
  { href: '#/search', label: 'Search', match: ['search'] },
  { href: '#/events', label: 'Events', match: ['events'] },
  { href: '#/places', label: 'Places', match: ['places', 'street', 'neighborhood'] },
  { href: '#/contributors', label: 'Contributors', match: ['contributors', 'contributor'] },
  { href: '#/help', label: 'How to Use This Site', match: ['help'] },
];

// Which issue, if any, the current page belongs to.
export function issueForRoute(route, currentIssue) {
  const [first, second] = route.segs;
  if (!first) return currentIssue;
  if (first === 'issue') return second;
  if (first === 'article') return second?.slice(0, 7);
  return null;
}

export function useTrailLabel(hash, label) {
  useEffect(() => {
    if (label) labelVisit(hash, label);
  }, [hash, label]);
}

export function Masthead({ route }) {
  const [first] = route.segs;
  const [size, setSize] = useState(() => localStorage.getItem('gazette-text-size') || 'normal');
  useEffect(() => {
    document.documentElement.dataset.size = size;
    localStorage.setItem('gazette-text-size', size);
  }, [size]);

  return (
    <header className="masthead">
      <div className="container masthead-top">
        <a className="nameplate" href="#/" aria-label="The Millrace Gazette Online, go to this month’s issue">
          <span className="nameplate-title">The Millrace Gazette Online</span>
          <span className="nameplate-sub">A volunteer-run neighborhood monthly since March 1988</span>
        </a>
        <div className="text-size" role="group" aria-label="Text size">
          <span className="text-size-label">Text size</span>
          {[
            ['normal', 'A', 'Standard size'],
            ['large', 'A+', 'Larger text'],
            ['xlarge', 'A++', 'Largest text'],
          ].map(([key, text, title]) => (
            <button
              key={key}
              type="button"
              className={size === key ? 'on' : ''}
              title={title}
              aria-label={title}
              aria-pressed={size === key}
              onClick={() => setSize(key)}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
      <nav className="container mainnav" aria-label="Main">
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={item.match.includes(first ?? '') ? 'active' : ''}
            aria-current={item.match.includes(first ?? '') ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

// The colored bar that answers "am I in the current issue or the archive?"
export function ModeBar({ route, site }) {
  if (!site) return <div className="modebar modebar-loading" aria-hidden="true" />;
  const [first] = route.segs;

  // The holiday events list comes from the current issue, so it gets the
  // current-issue bar even though it is not a single issue page.
  if (first === 'events') {
    const current = site.issues.find((i) => i.id === site.currentIssue);
    return (
      <section className="modebar current" aria-label="Where you are">
        <div className="container modebar-inner">
          <div className="modebar-text">
            <span className="pill">Current issue</span>
            <p>
              These events are listed in <strong>{current?.label}</strong>, this month’s issue. The next issue is due {longDate(site.nextIssueDate)}.
            </p>
          </div>
          <a className="modebar-action" href="#/">Read the current issue</a>
        </div>
      </section>
    );
  }

  const issueId = issueForRoute(route, site.currentIssue);

  if (issueId) {
    const issue = site.issues.find((i) => i.id === issueId);
    if (!issue) return null;
    if (issue.id === site.currentIssue) {
      return (
        <section className="modebar current" aria-label="Where you are">
          <div className="container modebar-inner">
            <div className="modebar-text">
              <span className="pill">Current issue</span>
              <p>
                You are reading <strong>{issue.label}</strong>, the issue published {shortDate(issue.date)}.
                The next issue is due {longDate(site.nextIssueDate)}.
              </p>
            </div>
            <a className="modebar-action" href="#/archive">Browse the archive</a>
          </div>
        </section>
      );
    }
    return (
      <section className="modebar archive" aria-label="Where you are">
        <div className="container modebar-inner">
          <div className="modebar-text">
            <span className="pill">Archive · not the current issue</span>
            <p>
              You are reading <strong>{issue.label}</strong>, an older issue published {shortDate(issue.date)}.
            </p>
          </div>
          <a className="modebar-action" href="#/">Back to the current issue</a>
        </div>
      </section>
    );
  }

  const isArchive = first === 'archive';
  return (
    <section className={`modebar ${isArchive ? 'archive' : 'browsing'}`} aria-label="Where you are">
      <div className="container modebar-inner">
        <div className="modebar-text">
          <span className="pill">{isArchive ? 'Archive' : 'Whole archive'}</span>
          <p>
            {isArchive
              ? `You are browsing old issues, March 1988 to ${issueLabelFromId(site.currentIssue)}. Each month has its own page.`
              : `You are on a page covering every issue, March 1988 to ${issueLabelFromId(site.currentIssue)}. The current issue is ${issueLabelFromId(site.currentIssue)}.`}
          </p>
        </div>
        <a className="modebar-action" href="#/">Go to the current issue</a>
      </div>
    </section>
  );
}

// "← Back to …" plus the breadcrumb path. Back goes to the page the reader
// was on before, not just up one level.
export function TrailBar({ route, crumbs = [] }) {
  const prev = previousVisit(route.hash);
  const showBack = prev && prev.hash !== route.hash;
  return (
    <div className="container trailbar">
      {showBack ? (
        <a className="back-link" href={`#${prev.hash}`}>
          ← Back to {prev.label}
        </a>
      ) : (
        <span />
      )}
      {crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="crumbs">
          <ol>
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`}>
                {c.href && i < crumbs.length - 1 ? <a href={c.href}>{c.label}</a> : <span aria-current="page">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="sitefooter">
      <div className="container">
        <p>
          <strong>The Millrace Gazette Online</strong> is produced by volunteers and published on the second Thursday of each month.
          Stories from 1988 to 2009 were scanned from print, so some words in their text may be garbled.
        </p>
        <p>Volunteers are at the Millrace Library on Saturday mornings to help you find and print old stories.</p>
      </div>
    </footer>
  );
}
