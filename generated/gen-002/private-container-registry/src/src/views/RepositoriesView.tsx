import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { CVE_ID, matchesCve } from '../data/cve';
import type { Tag } from '../data/types';
import { fmtDateTime, relTime } from '../lib/time';
import { pulledMs } from '../lib/risk';
import { fmtSize } from '../lib/format';
import { go } from '../lib/router';

type RepoSortKey = 'name' | 'tags' | 'pushed' | 'pulled' | 'affected';
interface RepoSort {
  key: RepoSortKey;
  dir: 1 | -1;
}

interface RepoRow {
  name: string;
  description: string;
  count: number;
  latest: Tag | null;
  lastPulled: number;
  prod: Tag[];
  affected: number;
}

export function RepositoriesView() {
  const { tags, repos } = useApp();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<RepoSort>({ key: 'affected', dir: -1 });

  const rows: RepoRow[] = useMemo(() => {
    const byRepo = new Map<string, Tag[]>();
    for (const t of tags) {
      const list = byRepo.get(t.repo);
      if (list) list.push(t);
      else byRepo.set(t.repo, [t]);
    }
    return repos.map((r) => {
      const ts = byRepo.get(r.name) ?? [];
      const latest = ts.reduce<Tag | null>((a, t) => (!a || Date.parse(t.pushedAt) > Date.parse(a.pushedAt) ? t : a), null);
      return {
        name: r.name,
        description: r.description,
        count: ts.length,
        latest,
        lastPulled: ts.reduce((m, t) => Math.max(m, pulledMs(t)), 0),
        prod: ts.filter((t) => t.env === 'prod'),
        affected: ts.filter((t) => matchesCve(t.base, t.pushedAt)).length,
      };
    });
  }, [tags, repos]);

  const totals = useMemo(
    () => ({
      repos: rows.length,
      tags: tags.length,
      affected: rows.reduce((s, r) => s + r.affected, 0),
      affectedRepos: rows.filter((r) => r.affected > 0).length,
    }),
    [rows, tags],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.name.includes(q) || r.description.toLowerCase().includes(q))
      .sort((a, b) => {
        let c = 0;
        switch (sort.key) {
          case 'name':
            c = a.name.localeCompare(b.name);
            break;
          case 'tags':
            c = a.count - b.count;
            break;
          case 'pushed':
            c = (a.latest ? Date.parse(a.latest.pushedAt) : 0) - (b.latest ? Date.parse(b.latest.pushedAt) : 0);
            break;
          case 'pulled':
            c = a.lastPulled - b.lastPulled;
            break;
          case 'affected':
            c = a.affected - b.affected;
            break;
        }
        // Stable tie-break on name so equal rows stay in a predictable order.
        return c * sort.dir || a.name.localeCompare(b.name);
      });
  }, [rows, query, sort]);

  const onSort = (key: RepoSortKey) =>
    setSort((s): RepoSort => {
      if (s.key === key) return { key, dir: s.dir === 1 ? -1 : 1 };
      return { key, dir: key === 'name' ? 1 : -1 };
    });

  const th = (key: RepoSortKey, label: string, cls = '') => {
    const active = sort.key === key;
    return (
      <th className={cls} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
        <button type="button" className={`th-btn${active ? ' th-active' : ''}`} onClick={() => onSort(key)}>
          {label}
          {active ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
        </button>
      </th>
    );
  };

  return (
    <div className="page">
      <section className="stats stats-4">
        <div className="stat">
          <div className="stat-num">{totals.repos}</div>
          <div className="stat-label">Repositories</div>
        </div>
        <div className="stat">
          <div className="stat-num">{totals.tags.toLocaleString()}</div>
          <div className="stat-label">Tags</div>
        </div>
        <div className="stat">
          <div className="stat-num">61 GB</div>
          <div className="stat-label">Stored after layer sharing</div>
          <div className="stat-sub">Per-tag sizes are logical, before sharing</div>
        </div>
        <div className="stat stat-prod">
          <div className="stat-num">{totals.affected}</div>
          <div className="stat-label">Tags affected by {CVE_ID}</div>
          <div className="stat-sub">in {totals.affectedRepos} repositories</div>
        </div>
      </section>

      <section className="card table-card">
        <div className="toolbar">
          <input
            type="search"
            className="input grow"
            placeholder="Filter by name or description"
            aria-label="Filter repositories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="sub">{visible.length} of {rows.length} repositories</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {th('name', 'Repository')}
                {th('tags', 'Tags', 'num')}
                {th('pushed', 'Latest push')}
                {th('pulled', 'Last pulled')}
                <th>Prod label</th>
                {th('affected', `${CVE_ID}`, 'num')}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.name} className="clickable" onClick={() => go(['repos', r.name])}>
                  <td>
                    <a
                      className="repo-link strong"
                      href={`#/repos/${encodeURIComponent(r.name)}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.name}
                    </a>
                    <div className="sub">{r.description}</div>
                  </td>
                  <td className="num">{r.count}</td>
                  <td>
                    {r.latest ? (
                      <>
                        <div>
                          <span className="mono">{r.latest.name}</span> · {relTime(r.latest.pushedAt)}
                        </div>
                        <div className="sub">
                          {fmtDateTime(r.latest.pushedAt)} · {r.latest.pushedBy}
                        </div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{r.lastPulled ? relTime(new Date(r.lastPulled).toISOString()) : 'never'}</td>
                  <td className="mono small">{r.prod.length ? r.prod.map((t) => t.name).join(', ') : '—'}</td>
                  <td className="num">
                    {r.affected > 0 ? <span className="chip chip-crit">{r.affected}</span> : <span className="sub">0</span>}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No repositories match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="fine">
        The 61 GB figure is unique blob storage. Individual tag sizes range from {fmtSize(Math.min(...tags.map((t) => t.sizeMB)))} to{' '}
        {fmtSize(Math.max(...tags.map((t) => t.sizeMB)))}, and they add up to far more than 61 GB because base layers are shared.
      </p>
    </div>
  );
}
