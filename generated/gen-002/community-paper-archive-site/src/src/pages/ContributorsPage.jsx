import { useMemo, useState } from 'react';
import { getArticleIndex, useLoad } from '../lib/data';
import { shortDate } from '../lib/format';
import { TrailBar, useTrailLabel } from '../components/Chrome';
import { Badge, Status } from '../components/Pieces';

export function ContributorsPage({ route, site }) {
  useTrailLabel(route.hash, 'Contributors');
  const [filter, setFilter] = useState('');
  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return site.contributors.filter((c) => !f || c.name.toLowerCase().includes(f));
  }, [site, filter]);

  return (
    <div className="container page">
      <TrailBar route={route} crumbs={[{ label: 'Contributors' }]} />
      <header className="page-head">
        <p className="eyebrow">Contributors</p>
        <h1>The people who write and photograph the paper</h1>
        <p>{site.contributors.length} volunteers have written or photographed for the Gazette since 1988. Their pages list every story they have a byline on.</p>
      </header>
      <label className="street-filter wide">
        Find a contributor
        <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Type a name" />
      </label>
      <ul className="contrib-grid">
        {list.map((c) => (
          <li key={c.slug} className="card contrib-card">
            <a href={`#/contributor/${c.slug}`}><h3>{c.name}</h3></a>
            <p className="small">{c.role} · {c.hood.name}</p>
            <p className="small">{c.since ? `Writing since ${c.since}` : 'No bylines yet'} · {c.count} stories</p>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="note">No contributor matches “{filter}”.</p>}
    </div>
  );
}

export function ContributorPage({ route, site }) {
  const slug = route.segs[1];
  const c = site.contributors.find((x) => x.slug === slug);
  useTrailLabel(route.hash, c ? c.name : null);
  const { data: articles, error, loading } = useLoad(getArticleIndex, []);
  const issueById = useMemo(() => new Map(site.issues.map((i) => [i.id, i])), [site]);
  const mine = useMemo(() => {
    if (!articles || !c) return [];
    return articles.filter((a) => a.by.includes(slug) || a.by.some((n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [articles, c, slug]);

  if (!c) return <div className="container page"><Status error={new Error('No contributor by that name.')} /></div>;

  return (
    <div className="container page">
      <TrailBar route={route} crumbs={[{ label: 'Contributors', href: '#/contributors' }, { label: c.name }]} />
      <header className="page-head">
        <p className="eyebrow">{c.role}</p>
        <h1>{c.name}</h1>
        <p>{c.bio}</p>
        <p className="small">Lives in <a href={`#/neighborhood/${c.hood.slug}`}>{c.hood.name}</a>{c.since ? ` · writing for the Gazette since ${c.since}` : ''} · {c.count} stories</p>
      </header>
      <Status loading={loading} error={error} label="Loading stories" />
      {articles && (
        <ol className="result-list">
          {mine.map((a) => (
            <li key={a.id} className="result">
              <div className="result-top">
                <Badge article={a} issue={issueById.get(a.issue)} />
                <span className="small">{shortDate(a.date)} · p. {a.page} · {a.section}</span>
              </div>
              <h3><a href={`#/article/${a.id}`}>{a.title}</a></h3>
              <p className="deck">{a.deck}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
