import { useMemo, useState } from 'react';
import { getIssue, useLoad } from '../lib/data';
import { longDate, shortDate, pluralize } from '../lib/format';
import { navigate } from '../lib/router';
import { TrailBar, useTrailLabel } from '../components/Chrome';
import { ArticleLine, Lightbox, PhotoFigure, Status } from '../components/Pieces';

// Shows one issue. With home=true it is the front page of the current issue.
export default function IssuePage({ route, site, home = false }) {
  const issueId = home ? site.currentIssue : route.segs[1];
  const meta = site.issues.find((i) => i.id === issueId);
  const { data, error } = useLoad(() => getIssue(issueId), [issueId]);
  const [photo, setPhoto] = useState(null);
  const label = home ? `${meta?.label ?? ''} issue (this month)` : `${meta?.label ?? issueId} issue`;
  useTrailLabel(route.hash, meta ? (home ? 'the current issue' : label) : null);

  if (!meta) return <div className="container page"><Status error={new Error('No issue with that date.')} /></div>;
  if (error) return <div className="container page"><Status error={error} /></div>;
  if (!data) return <div className="container page"><Status loading label="Loading the issue" /></div>;

  const articles = data.articles;
  const front = articles.filter((a) => a.section === 'Front Page');
  const lead = front[0];
  const secondary = front.slice(1);
  const sectionOrder = site.sections.filter((s) => s !== 'Front Page');
  const idx = site.issues.findIndex((i) => i.id === issueId);
  const prevIssue = idx > 0 ? site.issues[idx - 1] : null;
  const nextIssue = idx < site.issues.length - 1 ? site.issues[idx + 1] : null;
  const crumbs = home
    ? []
    : [
        { label: 'Archive', href: `#/archive/${meta.year}` },
        { label: meta.label },
      ];

  const body = (
    <>
      <header className="issue-head">
        <p className="eyebrow">{home ? 'This month’s issue' : meta.current ? 'Current issue' : 'Archive issue'}</p>
        <h1>{home ? 'The Millrace Gazette' : meta.label}</h1>
        <p className="issue-meta">
          {home ? '' : <>Issue No. {meta.no}, </>}
          published {longDate(meta.date)} · {meta.pages} pages · {pluralize(articles.length, 'story', 'stories')}
        </p>
        {!home && (
          <div className="issue-nav" aria-label="Move between issues">
            {prevIssue ? (
              <a className="btn btn-ghost" href={`#/issue/${prevIssue.id}`}>← {prevIssue.label}</a>
            ) : <span />}
            {nextIssue ? (
              <a className="btn btn-ghost" href={`#/issue/${nextIssue.id}`}>{nextIssue.label} →</a>
            ) : <span />}
          </div>
        )}
      </header>

      {lead && (
        <article className="lead">
          <p className="section-tag">{lead.section} · page {lead.page}</p>
          <h2><a href={`#/article/${lead.id}`}>{lead.title}</a></h2>
          <p className="deck">{lead.deck}</p>
          <p className="byline">By {lead.by.join(' and ')}</p>
          {lead.photos?.[0] && <PhotoFigure photo={lead.photos[0]} onEnlarge={setPhoto} size="wide" />}
          <p className="lead-body">{lead.body[0]}</p>
          <p><a className="btn" href={`#/article/${lead.id}`}>Read the full story</a></p>
        </article>
      )}

      {secondary.length > 0 && (
        <section className="secondary-front" aria-label="More front-page stories">
          {secondary.map((a) => (
            <article key={a.id} className="secondary-story">
              <p className="section-tag">{a.section} · page {a.page}</p>
              <h3><a href={`#/article/${a.id}`}>{a.title}</a></h3>
              <p className="deck">{a.deck}</p>
            </article>
          ))}
        </section>
      )}

      <section className="inside" aria-labelledby="inside-heading">
        <h2 id="inside-heading">{home ? 'Inside this issue' : 'Stories in this issue'}</h2>
        {sectionOrder.map((sec) => {
          const items = articles.filter((a) => a.section === sec).sort((a, b) => a.page - b.page);
          if (!items.length) return null;
          return (
            <div key={sec} className="section-block">
              <h3>
                {sec} <span className="count">{items.length}</span>
              </h3>
              <ol className="story-list">
                {items.map((a) => (
                  <ArticleLine key={a.id} article={a} />
                ))}
              </ol>
            </div>
          );
        })}
      </section>
    </>
  );

  if (!home) {
    return (
      <div className="container page">
        <TrailBar route={route} crumbs={[...crumbs]} />
        <div className="issue-page">{body}</div>
        <Lightbox photo={photo} onClose={() => setPhoto(null)} />
      </div>
    );
  }

  return (
    <div className="container page home">
      <TrailBar route={route} />
      <div className="home-grid">
        <div className="home-main">{body}</div>
        <aside className="home-side" aria-label="Find more">
          <SearchCard />
          <EventsCard site={site} />
          <div className="card">
            <h2>Looking for an old story?</h2>
            <p>Every issue since March 1988 is in the archive. The top bar tells you which issue you are reading.</p>
            <p><a className="btn btn-ghost" href="#/archive">Browse the archive by year</a></p>
            <p className="small">
              Shortcut: <a href="#/search?q=flood&from=1994&to=1994">the 1994 flood coverage</a>
              {' · '}<a href="#/street/tannery-street">every story tagged Tannery Street</a>
            </p>
          </div>
          <div className="card card-plain">
            <h2>New to this site?</h2>
            <p>
              A <span className="swatch swatch-current" /> green bar at the top means you are reading this month’s paper.
              A <span className="swatch swatch-archive" /> brown bar means you are reading an older issue.
              The “Back to” link always takes you to the page you came from.
            </p>
            <p><a href="#/help">Read more about using the site</a></p>
          </div>
        </aside>
      </div>
      <Lightbox photo={photo} onClose={() => setPhoto(null)} />
    </div>
  );
}

function SearchCard() {
  const [q, setQ] = useState('');
  return (
    <form
      className="card card-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`#/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <h2><label htmlFor="home-search">Search the whole archive</label></h2>
      <p className="small">Try a street, a person, or a few words from the story.</p>
      <div className="search-row">
        <input id="home-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Street, name, or words" />
        <button className="btn" type="submit">Search</button>
      </div>
    </form>
  );
}

function EventsCard({ site }) {
  const upcoming = useMemo(() => [...site.events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5), [site]);
  return (
    <div className="card">
      <h2>Holiday events this month</h2>
      <ul className="mini-events">
        {upcoming.map((e) => (
          <li key={`${e.date}-${e.title}`}>
            <span className="mini-date">{e.weekday.slice(0, 3)}, {shortDate(e.date).replace(/, \d{4}$/, '')}</span>
            <a href={`#/article/${e.articleId}`}>{e.title}</a>
          </li>
        ))}
      </ul>
      <p><a className="btn btn-ghost" href="#/events">All {site.events.length} holiday events</a></p>
    </div>
  );
}
