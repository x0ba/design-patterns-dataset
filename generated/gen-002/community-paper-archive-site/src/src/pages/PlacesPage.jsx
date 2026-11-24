import { useMemo, useState } from 'react';
import { getArticleIndex, useLoad } from '../lib/data';
import { shortDate } from '../lib/format';
import { TrailBar, useTrailLabel } from '../components/Chrome';
import { Badge, Status } from '../components/Pieces';

export function PlacesPage({ route, site }) {
  useTrailLabel(route.hash, 'Places');
  const [filter, setFilter] = useState('');
  const streets = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return site.streets.filter((s) => !f || s.name.toLowerCase().includes(f));
  }, [site, filter]);
  const byLetter = useMemo(() => {
    const map = new Map();
    for (const s of streets) {
      const k = s.name[0].toUpperCase();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    }
    return [...map];
  }, [streets]);

  return (
    <div className="container page">
      <TrailBar route={route} crumbs={[{ label: 'Places' }]} />
      <header className="page-head">
        <p className="eyebrow">Places</p>
        <h1>Neighborhoods and streets</h1>
        <p>Every story is tagged with the streets and neighborhoods it covers. Choose a place to see every story about it, from 1988 to today.</p>
      </header>

      <h2 className="section-h">Neighborhoods</h2>
      <div className="hood-grid">
        {site.neighborhoods.map((h) => (
          <a key={h.slug} className="card hood-card" href={`#/neighborhood/${h.slug}`}>
            <h3>{h.name}</h3>
            <p>{h.blurb}</p>
            <p className="small">{h.count.toLocaleString('en-US')} stories</p>
          </a>
        ))}
      </div>

      <section className="streets" aria-labelledby="streets-h">
        <div className="streets-head">
          <h2 id="streets-h" className="section-h">Streets ({site.streets.length})</h2>
          <label className="street-filter">
            Find a street
            <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Type part of a street name" />
          </label>
        </div>
        {byLetter.length === 0 && <p className="note">No street matches “{filter}”.</p>}
        {byLetter.map(([letter, list]) => (
          <div key={letter} className="letter-group">
            <h3>{letter}</h3>
            <ul className="street-list">
              {list.map((s) => (
                <li key={s.slug}>
                  <a href={`#/street/${s.slug}`}>{s.name}</a>
                  <span className="small"> · {s.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

export function PlacePage({ route, site, kind }) {
  const slug = route.segs[1];
  const { data: articles, error, loading } = useLoad(getArticleIndex, []);
  const place = kind === 'street'
    ? site.streets.find((s) => s.slug === slug)
    : site.neighborhoods.find((h) => h.slug === slug);
  const year = route.query.get('year') ?? '';
  useTrailLabel(route.hash, place ? place.name : null);

  const issueById = useMemo(() => new Map(site.issues.map((i) => [i.id, i])), [site]);
  const matches = useMemo(() => {
    if (!articles) return [];
    return articles
      .filter((a) => (kind === 'street' ? a.streets : a.hoods).includes(slug))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [articles, kind, slug]);

  const years = useMemo(() => [...new Set(matches.map((a) => a.issue.slice(0, 4)))].sort().reverse(), [matches]);
  const shown = year ? matches.filter((a) => a.issue.startsWith(year)) : matches;
  const hoodStreets = useMemo(() => (kind === 'neighborhood' ? site.streets.filter((s) => s.hood.slug === slug) : []), [site, kind, slug]);

  if (!place) return <div className="container page"><Status error={new Error('No street or neighborhood by that name.')} /></div>;

  return (
    <div className="container page">
      <TrailBar route={route} crumbs={[{ label: 'Places', href: '#/places' }, { label: place.name }]} />
      <header className="page-head">
        <p className="eyebrow">{kind === 'street' ? 'Street' : 'Neighborhood'}</p>
        <h1>{place.name}</h1>
        {kind === 'street' ? (
          <p>In the <a href={`#/neighborhood/${place.hood.slug}`}>{place.hood.name}</a> neighborhood. {place.count.toLocaleString('en-US')} stories are tagged with this street.</p>
        ) : (
          <p>{place.blurb} {place.count.toLocaleString('en-US')} stories are tagged with this neighborhood.</p>
        )}
        <p>
          <a className="btn btn-ghost" href={`#/search?q=${encodeURIComponent(place.name)}`}>Search every story that mentions {place.name}</a>
        </p>
      </header>

      {kind === 'neighborhood' && hoodStreets.length > 0 && (
        <section className="card-plain">
          <h2>Streets in {place.name}</h2>
          <ul className="chips">
            {hoodStreets.map((s) => (
              <li key={s.slug}><a className="chip chip-street" href={`#/street/${s.slug}`}>{s.name} · {s.count}</a></li>
            ))}
          </ul>
        </section>
      )}

      <Status loading={loading} error={error} label="Loading stories" />

      {articles && (
        <section aria-labelledby="stories-h">
          <div className="streets-head">
            <h2 id="stories-h" className="section-h">
              Stories {year ? `from ${year}` : 'from every year'} <span className="count">{shown.length}</span>
            </h2>
            <label className="street-filter">
              Show only the year
              <select value={year} onChange={(e) => {
                const q = new URLSearchParams(route.query);
                if (e.target.value) q.set('year', e.target.value); else q.delete('year');
                const qs = q.toString();
                window.location.hash = `#/${kind}/${slug}${qs ? `?${qs}` : ''}`;
              }}>
                <option value="">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
          {shown.length === 0 && <p className="note">No stories from that year.</p>}
          <ol className="result-list">
            {shown.map((a) => {
              const issue = issueById.get(a.issue);
              return (
                <li key={a.id} className="result">
                  <div className="result-top">
                    <Badge article={a} issue={issue} />
                    <span className="small">{shortDate(a.date)} · p. {a.page} · {a.section}</span>
                  </div>
                  <h3><a href={`#/article/${a.id}`}>{a.title}</a></h3>
                  <p className="deck">{a.deck}</p>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
