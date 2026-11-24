import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context';
import { matchesCve } from '../data/cve';
import type { Env, Tag } from '../data/types';
import { TagTable, compareTags, type TagSort, type TagSortKey } from '../components/TagTable';
import { setQueryParam } from '../lib/router';
import { relTime } from '../lib/time';
import { pulledMs } from '../lib/risk';

const PAGE_SIZE = 50;

interface Props {
  /** When set, the view is scoped to one repository. */
  repo?: string;
  initialQuery?: string;
}

export function TagsView({ repo, initialQuery = '' }: Props) {
  const { tags, repos } = useApp();
  const repoMeta = repo ? repos.find((r) => r.name === repo) : undefined;

  const [query, setQuery] = useState(initialQuery);
  const [repoFilter, setRepoFilter] = useState('all');
  const [env, setEnvFilter] = useState<'all' | Env>('all');
  const [base, setBase] = useState('all');
  const [cveOnly, setCveOnly] = useState(false);
  const [sort, setSort] = useState<TagSort>({ key: 'pushed', dir: -1 });
  const [page, setPage] = useState(0);

  const scoped = useMemo(() => (repo ? tags.filter((t) => t.repo === repo) : tags), [tags, repo]);
  const bases = useMemo(() => [...new Set(scoped.map((t) => t.base))].sort(), [scoped]);
  const repoNames = useMemo(() => repos.map((r) => r.name).sort(), [repos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped
      .filter((t) => !q || t.id.toLowerCase().includes(q))
      .filter((t) => repo || repoFilter === 'all' || t.repo === repoFilter)
      .filter((t) => env === 'all' || t.env === env)
      .filter((t) => base === 'all' || t.base === base)
      .filter((t) => !cveOnly || matchesCve(t.base, t.pushedAt))
      .sort((a, b) => compareTags(a, b, sort));
  }, [scoped, query, repo, repoFilter, env, base, cveOnly, sort]);

  // Any filter change returns to the first page.
  useEffect(() => {
    setPage(0);
  }, [query, repoFilter, env, base, cveOnly]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const filtersActive = query !== '' || repoFilter !== 'all' || env !== 'all' || base !== 'all' || cveOnly;

  const onSort = (key: TagSortKey) =>
    setSort((s): TagSort => {
      if (s.key === key) return { key, dir: s.dir === 1 ? -1 : 1 };
      return { key, dir: key === 'image' ? 1 : -1 };
    });

  if (repo && !repoMeta) {
    return (
      <div className="page">
        <div className="card empty-card">
          <h3>Repository not found</h3>
          <p className="sub">
            No repository named <span className="mono">{repo}</span> exists in this registry.
          </p>
          <a href="#/repos" className="btn">
            Back to repositories
          </a>
        </div>
      </div>
    );
  }

  const latest = scoped.reduce<Tag | null>(
    (a, t) => (!a || Date.parse(t.pushedAt) > Date.parse(a.pushedAt) ? t : a),
    null,
  );
  const lastPulled = scoped.reduce((m, t) => Math.max(m, pulledMs(t)), 0);
  const prodTags = scoped.filter((t) => t.env === 'prod').map((t) => t.name);
  const affectedCount = scoped.filter((t) => matchesCve(t.base, t.pushedAt)).length;

  return (
    <div className="page">
      {repoMeta ? (
        <section className="repo-head card">
          <div>
            <a href="#/repos" className="back-link">
              ← All repositories
            </a>
            <h1 className="mono">{repoMeta.name}</h1>
            <p className="lede">{repoMeta.description}</p>
          </div>
          <dl className="repo-stats">
            <div>
              <dt>Tags</dt>
              <dd>{scoped.length.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Latest push</dt>
              <dd>{latest ? `${latest.name} · ${relTime(latest.pushedAt)}` : '—'}</dd>
            </div>
            <div>
              <dt>Last pulled</dt>
              <dd>{lastPulled ? relTime(new Date(lastPulled).toISOString()) : 'never'}</dd>
            </div>
            <div>
              <dt>Prod label</dt>
              <dd className="mono">{prodTags.length ? prodTags.join(', ') : '—'}</dd>
            </div>
            <div>
              <dt>Affected by CVE</dt>
              <dd className={affectedCount ? 'txt-bad' : ''}>{affectedCount}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <div className="page-intro">
          <p className="sub">
            {tags.length.toLocaleString()} tags across {repos.length} repositories. Click a row for build details, digest, and scan results.
          </p>
        </div>
      )}

      <section className="card table-card">
        <div className="toolbar">
          <input
            type="search"
            className="input grow"
            placeholder={repo ? `Filter tags in ${repo}` : 'Filter by repo or tag'}
            aria-label="Filter tags"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!repo && (
            <select className="select" aria-label="Repository" value={repoFilter} onChange={(e) => setRepoFilter(e.target.value)}>
              <option value="all">All repositories</option>
              {repoNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
          <select className="select" aria-label="Environment" value={env} onChange={(e) => setEnvFilter(e.target.value as 'all' | Env)}>
            <option value="all">Any environment</option>
            <option value="prod">prod</option>
            <option value="staging">staging</option>
            <option value="none">none</option>
          </select>
          <select className="select" aria-label="Base image" value={base} onChange={(e) => setBase(e.target.value)}>
            <option value="all">Any base image</option>
            {bases.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={cveOnly} onChange={(e) => setCveOnly(e.target.checked)} />
            Affected by CVE-2026-41187
          </label>
          {filtersActive && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setQuery('');
                setRepoFilter('all');
                setEnvFilter('all');
                setBase('all');
                setCveOnly(false);
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {rows.length > 0 ? (
          <TagTable
            rows={rows}
            showRepo={!repo}
            sort={sort}
            onSort={onSort}
            onOpen={(id) => setQueryParam('tag', id)}
          />
        ) : (
          <div className="empty">No tags match these filters.</div>
        )}

        <div className="pager">
          <span className="sub">
            {filtered.length === 0
              ? 'Showing 0 tags'
              : `Showing ${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length.toLocaleString()} tags`}
          </span>
          <div className="pager-controls">
            <button type="button" className="btn-ghost" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Previous
            </button>
            <span className="sub">
              Page {current + 1} of {pageCount}
            </span>
            <button type="button" className="btn-ghost" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
              Next
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
