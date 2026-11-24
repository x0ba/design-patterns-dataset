import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { CUTOFF_AT, CVE_ID, CVE_INFO, CVE_PUBLISHED_AT, isBookwormWarning, matchesCve } from '../data/cve';
import { currentBaseDigest } from '../data/seed';
import type { Tag } from '../data/types';
import { CritHigh, EnvBadge, TierChip } from '../components/Badges';
import { copyText, downloadText } from '../lib/clipboard';
import { fmtDate, fmtDateTime, fmtShort, relTime, NOW_ISO } from '../lib/time';
import { pulledMs, tierOf, type Tier } from '../lib/risk';
import { setQueryParam } from '../lib/router';

type Filter = 'all' | 'live' | 'prod' | 'staging' | 'cold';
type SortKey = 'tier' | 'image' | 'env' | 'pulled' | 'pushed' | 'critical';
interface Sort {
  key: SortKey;
  dir: 1 | -1;
}
interface Row {
  tag: Tag;
  tier: Tier;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'prod', label: 'Prod' },
  { key: 'staging', label: 'Staging' },
  { key: 'cold', label: 'Cold' },
];

const ENV_RANK = { prod: 0, staging: 1, none: 2 } as const;

function passes(r: Row, f: Filter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'live':
      return r.tier.level <= 2;
    case 'prod':
      return r.tag.env === 'prod';
    case 'staging':
      return r.tag.env === 'staging';
    case 'cold':
      return r.tier.level === 3;
  }
}

function compare(a: Row, b: Row, s: Sort): number {
  let c = 0;
  switch (s.key) {
    case 'tier':
      c = a.tier.level - b.tier.level || pulledMs(b.tag) - pulledMs(a.tag);
      break;
    case 'image':
      c = a.tag.id.localeCompare(b.tag.id);
      break;
    case 'env':
      c = ENV_RANK[a.tag.env] - ENV_RANK[b.tag.env];
      break;
    case 'pulled':
      c = pulledMs(a.tag) - pulledMs(b.tag);
      break;
    case 'pushed':
      c = Date.parse(a.tag.pushedAt) - Date.parse(b.tag.pushedAt);
      break;
    case 'critical':
      c = a.tag.scan.critical - b.tag.scan.critical || a.tag.scan.high - b.tag.scan.high;
      break;
  }
  return c * s.dir;
}

function rebuildText(rows: Row[], label: string): string {
  const head = `${CVE_ID} (libssl3, debian:12 builds pushed before Nov 14, 2026): ${rows.length} images, ${label}. Generated ${fmtDateTime(NOW_ISO)}.`;
  const lines = rows.map(
    (r, i) =>
      `${i + 1}. [${r.tier.label}] ${r.tag.id}: ${r.tag.env === 'none' ? 'no deploy label' : `labelled ${r.tag.env}`}; last pulled ${relTime(r.tag.lastPulledAt)}; pushed ${fmtDate(r.tag.pushedAt)} by ${r.tag.pushedBy} on ${r.tag.base}; ${r.tag.scan.critical} critical`,
  );
  return [head, ...lines].join('\n');
}

function toCsv(rows: Row[]): string {
  const header = ['repo', 'tag', 'digest', 'env', 'tier', 'base', 'pushed_at', 'pushed_by', 'last_pulled_at', 'pulls_30d', 'critical', 'high'];
  const esc = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) =>
    [
      r.tag.repo,
      r.tag.name,
      r.tag.digest,
      r.tag.env,
      r.tier.label,
      r.tag.base,
      r.tag.pushedAt,
      r.tag.pushedBy,
      r.tag.lastPulledAt,
      r.tag.pulls30d,
      r.tag.scan.critical,
      r.tag.scan.high,
    ]
      .map(esc)
      .join(','),
  );
  return [header.join(','), ...body].join('\n');
}

export function AdvisoryView() {
  const { tags, notify } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>({ key: 'tier', dir: 1 });

  const rows: Row[] = useMemo(
    () => tags.filter((t) => matchesCve(t.base, t.pushedAt)).map((tag) => ({ tag, tier: tierOf(tag) })),
    [tags],
  );
  const warnings = useMemo(() => tags.filter((t) => isBookwormWarning(t.base, t.pushedAt)), [tags]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      live: rows.filter((r) => r.tier.level <= 2).length,
      prod: rows.filter((r) => r.tag.env === 'prod').length,
      staging: rows.filter((r) => r.tag.env === 'staging').length,
      cold: rows.filter((r) => r.tier.level === 3).length,
      repos: new Set(rows.map((r) => r.tag.repo)).size,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => passes(r, filter))
      .filter((r) => !q || r.tag.id.toLowerCase().includes(q))
      .sort((a, b) => compare(a, b, sort));
  }, [rows, filter, query, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s): Sort => {
      if (s.key === key) return { key, dir: s.dir === 1 ? -1 : 1 };
      const ascByDefault = key === 'image' || key === 'env' || key === 'tier';
      return { key, dir: ascByDefault ? 1 : -1 };
    });

  const th = (key: SortKey, label: string, cls = '') => {
    const active = sort.key === key;
    return (
      <th className={cls} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
        <button type="button" className={`th-btn${active ? ' th-active' : ''}`} onClick={() => toggleSort(key)}>
          {label}
          {active ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
        </button>
      </th>
    );
  };

  const filterLabel = FILTERS.find((f) => f.key === filter)?.label ?? 'All';
  const copyList = async () => {
    const ok = await copyText(rebuildText(visible, `filter: ${filterLabel}`));
    notify(ok ? `Copied ${visible.length} images to the clipboard` : 'Copy failed. Export CSV instead.');
  };
  const exportCsv = () => {
    downloadText(`${CVE_ID}-affected-${filter}.csv`, toCsv(visible));
    notify(`Exported ${visible.length} rows`);
  };

  return (
    <div className="page">
      <section className="advisory card">
        <div className="chip-row">
          <span className="sev-pill">Critical · CVSS {CVE_INFO.cvss}</span>
          <h1 className="mono">{CVE_ID}</h1>
          <span className="meta">
            Published {fmtDateTime(CVE_PUBLISHED_AT)} · {relTime(CVE_PUBLISHED_AT)}
          </span>
        </div>
        <p className="lede">
          <strong>{CVE_INFO.pkg}</strong> in <span className="mono">debian:12</span> base images pushed before{' '}
          <span className="mono">{fmtDateTime(CUTOFF_AT)}</span>. Matched on base family and push date.
        </p>
        <p className="body">
          {CVE_INFO.summary} <span className="muted">{CVE_INFO.fixNote}</span>
        </p>
      </section>

      <section className="stats">
        <div className="stat">
          <div className="stat-num">{counts.all}</div>
          <div className="stat-label">Affected tags</div>
          <div className="stat-sub">across {counts.repos} repositories</div>
        </div>
        <div className="stat stat-prod">
          <div className="stat-num">{counts.prod}</div>
          <div className="stat-label">Labelled prod</div>
          <div className="stat-sub">Rebuild before anything else</div>
        </div>
        <div className="stat">
          <div className="stat-num">{counts.live}</div>
          <div className="stat-label">Deployed or pulled in 7 days</div>
          <div className="stat-sub">
            {counts.prod} prod, {counts.staging} staging, {counts.live - counts.prod - counts.staging} pulled in 7 days
          </div>
        </div>
        <div className="stat">
          <div className="stat-num">{counts.cold}</div>
          <div className="stat-label">Cold</div>
          <div className="stat-sub">No deploy label, no recent pulls</div>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="callout" role="note">
          <strong>
            {warnings.length} tags on <span className="mono">node:20-bookworm</span> were built before Nov 14 and are not counted above.
          </strong>{' '}
          Bookworm is Debian 12 underneath. Check their libssl3 version before you call the list complete.
          <div className="callout-links">
            {warnings.map((t) => (
              <button key={t.id} type="button" className="link mono" onClick={() => setQueryParam('tag', t.id)}>
                {t.id}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card table-card">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Filter affected images">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`seg-btn${filter === f.key ? ' seg-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} <span className="seg-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <input
            type="search"
            className="input grow"
            placeholder="Filter by repo or tag"
            aria-label="Filter affected images by repo or tag"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="toolbar-actions">
            <button type="button" className="btn" onClick={copyList} disabled={visible.length === 0}>
              Copy rebuild list
            </button>
            <button type="button" className="btn-ghost" onClick={exportCsv} disabled={visible.length === 0}>
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {th('tier', 'Priority')}
                {th('image', 'Image')}
                {th('env', 'Environment')}
                {th('pulled', 'Last pulled')}
                <th className="num">Pulls 30d</th>
                {th('pushed', 'Pushed')}
                <th>Base image</th>
                {th('critical', 'Crit / High', 'num')}
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const { tag, tier } = r;
                const current = currentBaseDigest(tag.base);
                const patched = current !== undefined && current !== tag.baseDigest;
                return (
                  <tr key={tag.id} className="clickable" onClick={() => setQueryParam('tag', tag.id)}>
                    <td>
                      <TierChip tier={tier} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="img-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQueryParam('tag', tag.id);
                        }}
                      >
                        <span className="img-name">
                          <span className="repo">{tag.repo}</span>
                          <span className="colon">:</span>
                          <span className="tagname">{tag.name}</span>
                        </span>
                      </button>
                    </td>
                    <td>
                      <EnvBadge env={tag.env} />
                    </td>
                    <td className="nowrap" title={tag.lastPulledAt ? fmtDateTime(tag.lastPulledAt) : 'No pulls recorded'}>
                      {relTime(tag.lastPulledAt)}
                    </td>
                    <td className="num">{tag.pulls30d}</td>
                    <td className="nowrap">
                      <div>{fmtShort(tag.pushedAt)}</div>
                      <div className="sub">{tag.pushedBy}</div>
                    </td>
                    <td className="nowrap">
                      <div className="mono small">{tag.base}</div>
                      {patched && (
                        <div className="patched" title="The base image has been rebuilt since this build">
                          ✓ patched base
                        </div>
                      )}
                    </td>
                    <td className="num">
                      <CritHigh scan={tag.scan} />
                    </td>
                    <td>
                      {tier.level <= 2 ? (
                        <span className="next next-now">Rebuild today</span>
                      ) : (
                        <span className="next">Rebuild or remove</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    No affected images match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span>
            Priority: Prod, then Live (staging or pulled in the last 7 days), then Cold. Within a tier the most recent pull comes first.
            Click a row for build details.
          </span>
        </div>
      </section>

      <p className="fine">
        Retention: untagged images are deleted after 30 days. A rebuild that moves a tag leaves the previous digest untagged, so it is
        removed 30 days after that. Nothing here is deleted automatically.
      </p>
    </div>
  );
}
