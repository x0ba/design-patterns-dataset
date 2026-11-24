import { MONTH_NAMES } from '../lib/format';
import { TrailBar, useTrailLabel } from '../components/Chrome';

const FIRST_YEAR = 1988;

export default function ArchivePage({ route, site }) {
  const latestYear = Number(site.currentIssue.slice(0, 4));
  const year = Number(route.segs[1]) || latestYear;
  const valid = year >= FIRST_YEAR && year <= latestYear;
  useTrailLabel(route.hash, valid ? `the archive, ${year}` : 'the archive');

  const byId = new Map(site.issues.map((i) => [i.id, i]));
  const skipped = new Set(site.skippedMonths);
  const yearIssues = site.issues.filter((i) => i.year === year);
  const yearArticles = yearIssues.reduce((s, i) => s + i.count, 0);

  return (
    <div className="container page">
      <TrailBar route={route} crumbs={[{ label: 'Archive', href: `#/archive/${latestYear}` }, { label: String(year) }]} />

      <header className="page-head">
        <p className="eyebrow">Archive</p>
        <h1>Back issues, {FIRST_YEAR} to {latestYear}</h1>
        <p>
          The archive holds {site.totals.issues} issues and {site.totals.articles.toLocaleString('en-US')} stories. Pick a year, then a month.
          Stories from 1988 to 2009 were scanned from print, so some words in their text may be garbled.
        </p>
      </header>

      <nav className="year-strip" aria-label="Choose a year">
        {Array.from({ length: latestYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i).map((y) => (
          <a
            key={y}
            href={`#/archive/${y}`}
            className={y === year ? 'on' : ''}
            aria-current={y === year ? 'page' : undefined}
          >
            {y}
          </a>
        ))}
      </nav>

      <section className="year-head" aria-labelledby="year-title">
        <h2 id="year-title">{valid ? year : 'Not in the archive'}</h2>
        {valid && (
          <p className="small">
            {yearIssues.length} issues · {yearArticles.toLocaleString('en-US')} stories
            {year === latestYear && ' · the current issue is marked'}
          </p>
        )}
      </section>

      {valid && (
        <div className="month-grid">
          {MONTH_NAMES.map((name, i) => {
            const m = i + 1;
            const id = `${year}-${String(m).padStart(2, '0')}`;
            const issue = byId.get(id);
            if (!issue) {
              const before = year === FIRST_YEAR && m < 3;
              const after = year === latestYear && m > 11;
              return (
                <div key={id} className="month-tile month-empty" aria-disabled="true">
                  <h3>{name}</h3>
                  <p className="small">
                    {before ? 'Before the first issue' : skipped.has(id) ? 'No issue published' : after ? '' : 'No issue published'}
                  </p>
                </div>
              );
            }
            return (
              <a key={id} className={`month-tile ${issue.current ? 'is-current' : ''}`} href={`#/issue/${id}`}>
                <div className="cover" aria-hidden="true">
                  <span className="cover-name">The Millrace Gazette</span>
                  <span className="cover-month">{name}</span>
                  <span className="cover-year">{year}</span>
                </div>
                <h3>{name}</h3>
                <p className="small">
                  No. {issue.no} · {issue.pages} pages · {issue.count} stories
                </p>
                {issue.current && <span className="badge badge-current">Current issue</span>}
              </a>
            );
          })}
        </div>
      )}

      {valid && year === latestYear && (
        <p className="note">
          The next issue is due <strong>{site.nextIssueDate}</strong>. Until then, the November issue is the current one.
        </p>
      )}
    </div>
  );
}
