import { useState } from 'react';
import { getIssue, useLoad } from '../lib/data';
import { longDate } from '../lib/format';
import { TrailBar, useTrailLabel } from '../components/Chrome';
import { Chips, Lightbox, PhotoFigure, Status } from '../components/Pieces';
import { EventList } from './EventsPage';

export default function ArticlePage({ route, site }) {
  const id = route.segs[1];
  const issueId = (id || '').slice(0, 7);
  const meta = site.issues.find((i) => i.id === issueId);
  const { data, error } = useLoad(() => getIssue(issueId), [issueId]);
  const [photo, setPhoto] = useState(null);

  const index = data ? data.articles.findIndex((a) => a.id === id) : -1;
  const article = index >= 0 ? data.articles[index] : null;
  const shortTitle = article ? (article.title.length > 48 ? `${article.title.slice(0, 46)}…` : article.title) : null;
  useTrailLabel(route.hash, shortTitle ? `“${shortTitle}”` : null);

  if (!meta) return <div className="container page"><Status error={new Error('That story is not in the archive.')} /></div>;
  if (error) return <div className="container page"><Status error={error} /></div>;
  if (!article) return <div className="container page"><Status loading label="Loading the story" /></div>;

  const current = meta.current;
  const prev = index > 0 ? data.articles[index - 1] : null;
  const next = index < data.articles.length - 1 ? data.articles[index + 1] : null;
  const crumbs = [
    current ? { label: 'This month', href: '#/' } : { label: 'Archive', href: `#/archive/${meta.year}` },
    { label: meta.label, href: `#/issue/${issueId}` },
    { label: article.section },
  ];
  const photos = article.photos ?? [];
  const bodyFirst = photos.length === 1 ? photos[0] : null;

  return (
    <div className="container page">
      <TrailBar route={route} crumbs={crumbs} />
      <div className="story-layout">
        <article className="story" aria-labelledby="story-title">
          <p className="section-tag">{article.section} · page {article.page} · {meta.label}</p>
          <h1 id="story-title">{article.title}</h1>
          {article.deck && <p className="deck">{article.deck}</p>}
          <p className="byline">
            By {article.by.join(' and ')} · published {longDate(article.date)}
          </p>

          {article.ocr && (
            <div className="ocr-note" role="note">
              <strong>Read from the printed page.</strong> This story was scanned in {meta.year} and the text was read by computer.
              Some words may be garbled, for example “Tannerv” for “Tannery.” The headline and summary were checked by the editors.
            </div>
          )}

          <Chips streets={article.streets} hoods={article.hoods} />

          {bodyFirst && <PhotoFigure photo={bodyFirst} onEnlarge={setPhoto} size="wide" />}

          <div className="body-text">
            {article.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {photos.length > 1 && (
            <section className="photo-grid" aria-label="Photographs with this story">
              <h2>Photographs</h2>
              <div className="photo-grid-inner">
                {photos.map((p) => (
                  <PhotoFigure key={p.src} photo={p} onEnlarge={setPhoto} size="grid" />
                ))}
              </div>
            </section>
          )}

          {article.events && <EventList events={article.events} title="Events in this roundup" />}

          <nav className="story-nav" aria-label="Other stories in this issue">
            {prev ? <a className="btn btn-ghost" href={`#/article/${prev.id}`}>← Previous: {short(prev.title)}</a> : <span />}
            {next ? <a className="btn btn-ghost" href={`#/article/${next.id}`}>Next: {short(next.title)} →</a> : <span />}
          </nav>

          <div className="story-actions">
            <a className="btn btn-ghost" href={`#/issue/${issueId}`}>See everything in the {meta.label} issue</a>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>Print this story</button>
          </div>
        </article>

        <aside className="story-side" aria-label="About this issue">
          <div className="card">
            <h2>About this issue</h2>
            <p>
              <a href={`#/issue/${issueId}`}>{meta.label}</a>
              {current ? ' is this month’s paper.' : ' is an older issue from the archive.'}
            </p>
            <p className="small">Issue No. {meta.no} · {meta.pages} pages · {meta.count} stories · published {longDate(meta.date)}</p>
            {!current && <p><a className="btn" href="#/">Back to the current issue</a></p>}
          </div>
        </aside>
      </div>
      <Lightbox photo={photo} onClose={() => setPhoto(null)} />
    </div>
  );
}

function short(t) {
  return t.length > 40 ? `${t.slice(0, 38)}…` : t;
}
