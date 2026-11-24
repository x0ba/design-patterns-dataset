import { useEffect } from 'react';
import { shortDate } from '../lib/format';

export function Badge({ article, issue }) {
  const current = issue?.current ?? false;
  if (current) return <span className="badge badge-current">Current issue</span>;
  return <span className="badge badge-archive">Archive · {issue?.label ?? article.issue}</span>;
}

export function Chips({ streets = [], hoods = [] }) {
  if (!streets.length && !hoods.length) return null;
  return (
    <ul className="chips" aria-label="Places in this story">
      {hoods.map((h) => (
        <li key={`h-${h.slug ?? h}`}>
          <a className="chip chip-hood" href={`#/neighborhood/${h.slug ?? h}`}>{h.name ?? h}</a>
        </li>
      ))}
      {streets.map((s) => (
        <li key={`s-${s.slug ?? s}`}>
          <a className="chip chip-street" href={`#/street/${s.slug ?? s}`}>{s.name ?? s}</a>
        </li>
      ))}
    </ul>
  );
}

export function PhotoFigure({ photo, onEnlarge, size = 'wide' }) {
  return (
    <figure className={`photo photo-${size}`}>
      <button type="button" className="photo-button" onClick={() => onEnlarge(photo)} aria-label={`Enlarge photo: ${photo.caption}`}>
        <img src={photo.src} alt={photo.caption} loading="lazy" />
        <span className="photo-zoom">Enlarge</span>
      </button>
      <figcaption>
        <span>{photo.caption}</span> <span className="credit">{photo.credit}</span>
      </figcaption>
    </figure>
  );
}

export function Lightbox({ photo, onClose }) {
  useEffect(() => {
    const key = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  if (!photo) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Enlarged photo" onClick={onClose}>
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <img src={photo.src} alt={photo.caption} />
        <p>{photo.caption} <span className="credit">{photo.credit}</span></p>
        <button type="button" className="btn" onClick={onClose}>Close photo</button>
      </div>
    </div>
  );
}

export function ArticleLink({ article, children, query }) {
  const q = query ? `?from=${encodeURIComponent(query)}` : '';
  return <a href={`#/article/${article.id}${q}`}>{children ?? article.title}</a>;
}

export function Status({ loading, error, label = 'Loading' }) {
  if (error) {
    return (
      <div className="status status-error" role="alert">
        <p><strong>This page could not be loaded.</strong> Check your connection and try again, or go back to the <a href="#/">current issue</a>.</p>
        <p className="small">{String(error.message || error)}</p>
      </div>
    );
  }
  if (loading) return <div className="status" role="status">{label}…</div>;
  return null;
}

export function SectionTag({ section }) {
  return <span className="section-tag">{section}</span>;
}

export function ArticleLine({ article }) {
  return (
    <li className="story-line">
      <span className="story-page">p. {article.page}</span>
      <div>
        <a className="story-title" href={`#/article/${article.id}`}>{article.title}</a>
        {article.deck && <p className="story-deck">{article.deck}</p>}
        {article.by?.length > 0 && <p className="byline small">By {article.by.join(' and ')}</p>}
      </div>
    </li>
  );
}

