import { useEffect, useMemo, useState } from 'react';
import { getArticleIndex, useLoad } from '../lib/data';
import { navigate } from '../lib/router';
import { runSearch, snippetFor, suggestPlaces, tokenize } from '../lib/search';
import { SEASONS, shortDate, pluralize } from '../lib/format';
import { TrailBar, useTrailLabel } from '../components/Chrome';
import { Chips, Status } from '../components/Pieces';

const PAGE_SIZE = 40;
const STARTERS = ['Tannery Street', 'Holiday events', 'Canal Park', 'Council budget', 'obituary', 'Scout Troop 14'];

export default function SearchPage({ route, site }) {
  const params = route.query;
  const filters = useMemo(() => ({
    q: params.get('q') ?? '',
    from: Number(params.get('from')) || '',
    to: Number(params.get('to')) || '',
    seasons: (params.get('seasons') ?? '').split(',').filter(Boolean),
    section: params.get('section') ?? '',
    sort: params.get('sort') ?? (params.get('from') || params.get('to') ? 'oldest' : 'relevance'),
  }), [route.hash]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasQuery = filters.q.trim() !== '' || filters.from || filters.to || filters.seasons.length || filters.section;
  useTrailLabel(route.hash, hasQuery ? `search results${filters.q ? ` for “${filters.q}”` : ''}` : 'search');

  const { data: articles, error, loading } = useLoad(getArticleIndex, []);
  const issueById = useMemo(() => new Map(site.issues.map((i) => [i.id, i])), [site]);
  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => setShown(PAGE_SIZE), [route.hash]);

  const results = useMemo(() => {
    if (!articles || !hasQuery) return [];
    return runSearch(articles, filters);
  }, [articles, route.hash]); // eslint-disable-line react-hooks/exhaustive-deps

  const fuzzyPairs = useMemo(() => {
    const seen = new Map();
    for (const r of results.slice(0, shown)) for (const f of r.fuzzy) seen.set(`${f.typed}>${f.found}`, f);
    return [...seen.values()].slice(0, 3);
  }, [results, shown]);

  const suggestions = useMemo(() => (results.length === 0 && filters.q ? suggestPlaces(filters.q, [...site.streets, ...site.neighborhoods]) : []), [results, filters.q, site]);

  const applyFilters = (next) => {
    const p = new URLSearchParams();
    const merged = { ...filters, ...next };
    if (merged.q.trim()) p.set('q', merged.q.trim());
    if (merged.from) p.set('from', merged.from);
    if (merged.to) p.set('to', merged.to);
    if (merged.seasons.length) p.set('seasons', merged.seasons.join(','));
    if (merged.section) p.set('section', merged.section);
    if (merged.sort && merged.sort !== 'relevance') p.set('sort', merged.sort);
    navigate(`#/search?${p.toString()}`);
  };

  const years = Array.from({ length: site.totals ? Number(site.currentIssue.slice(0, 4)) - 1988 + 1 : 0 }, (_, i) => 1988 + i);

  return (
    <div className="container page">
      <TrailBar route={route} crumbs={[{ label: 'Search', href: '#/search' }]} />
      <header className="page-head">
        <p className="eyebrow">Search</p>
        <h1>Search the archive</h1>
        <p>Searches every issue from March 1988 to {site.currentIssue === '2026-11' ? 'November 2026' : site.currentIssue}. Matches are found even when the scanned text has small errors.</p>
      </header>

      <form
        className="search-form card"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          applyFilters({
            q: String(f.get('q') ?? ''),
            from: Number(f.get('from')) || '',
            to: Number(f.get('to')) || '',
            seasons: SEASONS.filter((s) => f.get(`season-${s.key}`)).map((s) => s.key),
            section: String(f.get('section') ?? ''),
            sort: String(f.get('sort') ?? 'relevance'),
          });
        }}
      >
        <div className="field-big">
          <label htmlFor="q">What are you looking for?</label>
          <input id="q" name="q" type="search" defaultValue={filters.q} key={`q-${route.hash}`} placeholder="A street, a name, or words from the story" />
          <button className="btn" type="submit">Search</button>
        </div>

        <div className="filter-grid">
          <fieldset className="filter-years">
            <legend>Years</legend>
            <label>From
              <select name="from" defaultValue={filters.from} key={`from-${route.hash}`}>
                <option value="">1988 (first issue)</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label>To
              <select name="to" defaultValue={filters.to} key={`to-${route.hash}`}>
                <option value="">{years[years.length - 1]} (latest)</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </fieldset>

          <fieldset className="filter-seasons">
            <legend>Season of the issue</legend>
            <div className="season-row">
              {SEASONS.map((s) => (
                <label key={s.key} className="check">
                  <input type="checkbox" name={`season-${s.key}`} defaultChecked={filters.seasons.includes(s.key)} key={`${s.key}-${route.hash}`} />
                  <span><strong>{s.label}</strong> <span className="small">{s.months}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="filter-other">
            <legend>Section and order</legend>
            <label>Section
              <select name="section" defaultValue={filters.section} key={`sec-${route.hash}`}>
                <option value="">All sections</option>
                {site.sections.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Sort by
              <select name="sort" defaultValue={filters.sort} key={`sort-${route.hash}`}>
                <option value="relevance">Best match</option>
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
              </select>
            </label>
          </fieldset>
        </div>
      </form>

      {!hasQuery && (
        <section className="starters card-plain">
          <h2>Not sure where to start?</h2>
          <p>Try one of these, or type a street name, a person’s name, or a few words you remember.</p>
          <ul className="starter-list">
            {STARTERS.map((s) => (
              <li key={s}><a className="btn btn-ghost" href={`#/search?q=${encodeURIComponent(s)}`}>{s}</a></li>
            ))}
          </ul>
          <p className="small">Tip: to find a story from a certain year, set the years above and leave the search box empty.</p>
        </section>
      )}

      {hasQuery && <Status loading={loading} error={error} label="Loading the archive index" />}

      {hasQuery && articles && (
        <section className="results" aria-live="polite">
          <header className="results-head">
            <h2>{results.length === 0 ? 'No stories found' : pluralize(results.length, 'story', 'stories') + ' found'}</h2>
            <p className="small">{describe(filters)}</p>
          </header>

          {fuzzyPairs.length > 0 && (
            <p className="note">
              Some stories matched words that are close to what you typed, because the scanned text has small errors. For example,{' '}
              {fuzzyPairs.map((f, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  <q>{f.found}</q> for <q>{f.typed}</q>
                </span>
              ))}
              .
            </p>
          )}

          {results.length === 0 && (
            <div className="note">
              <p>Try fewer words, check the spelling, or widen the years and seasons.</p>
              {suggestions.length > 0 && (
                <p>
                  Did you mean{' '}
                  {suggestions.map((s, i) => (
                    <span key={s.slug}>
                      {i > 0 && ' or '}
                      <a href={`#/${s.hood ? 'street' : 'neighborhood'}/${s.slug}`}>{s.name}</a>
                    </span>
                  ))}
                  ?
                </p>
              )}
            </div>
          )}

          <ol className="result-list">
            {results.slice(0, shown).map(({ article, queryTokens }) => {
              const issue = issueById.get(article.issue);
              const snip = article.text && filters.q ? snippetFor(article.text, tokenize(filters.q).filter((t) => !['a', 'an', 'the', 'of', 'in', 'on', 'and', 'to', 'for'].includes(t))) : null;
              return (
                <li key={article.id} className="result">
                  <div className="result-top">
                    <span className={`badge ${issue?.current ? 'badge-current' : 'badge-archive'}`}>
                      {issue?.current ? 'Current issue' : `Archive · ${issue?.label ?? article.issue}`}
                    </span>
                    <span className="small">{shortDate(article.date)} · p. {article.page} · {article.section}</span>
                  </div>
                  <h3><a href={`#/article/${article.id}`}>{article.title}</a></h3>
                  {snip ? (
                    <p className="snippet">
                      {snip.before}<mark>{snip.word}</mark>{snip.after}
                    </p>
                  ) : (
                    article.deck && <p className="deck">{article.deck}</p>
                  )}
                  <p className="small">
                    {article.by.length ? `By ${article.by.join(' and ')}` : ''}
                  </p>
                  <Chips streets={article.streets.map((s) => ({ slug: s, name: nameOf(site, 'street', s) }))} hoods={article.hoods.map((h) => ({ slug: h, name: nameOf(site, 'hood', h) }))} />
                </li>
              );
            })}
          </ol>
          {results.length > shown && (
            <p className="more">
              <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                Show {Math.min(PAGE_SIZE, results.length - shown)} more stories
              </button>
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function nameOf(site, kind, slug) {
  if (kind === 'street') return site.streets.find((s) => s.slug === slug)?.name ?? slug;
  return site.neighborhoods.find((h) => h.slug === slug)?.name ?? slug;
}

function describe(f) {
  const parts = [];
  if (f.from || f.to) parts.push(`${f.from || 1988} to ${f.to || 2026}`);
  if (f.seasons.length) parts.push(f.seasons.map((s) => SEASONS.find((x) => x.key === s).label.toLowerCase()).join(' and '));
  if (f.section) parts.push(f.section);
  return parts.length ? `Filtered to ${parts.join(', ')}.` : 'All years and all seasons.';
}
