import { useMemo, useState } from 'react';
import type { Episode } from '../data/generate';
import { SHOW_BY_ID, type Platform } from '../data/shows';
import type { Derived, Filters } from '../analysis/model';
import { cliffOf, retentionCurve } from '../analysis/stats';
import { COLORS, LineChart, type LineSeries, type VMarker } from '../components/charts';
import { downloadCsv } from '../lib/csv';
import { dateLong, dateShort, num, pct } from '../lib/format';

interface Props {
  all: Episode[];
  d: Derived;
  f: Filters;
  onOpenEpisode: (id: string) => void;
  openEpisode: Episode | null;
  onCloseEpisode: () => void;
}

type SortKey = 'date' | 'show' | 'length' | 'starts' | 'completion' | 'listenThrough' | 'cliff' | 'z';
const PAGE = 40;

interface Baseline {
  mean: number;
  sd: number;
}

export function Episodes({ all, d, f, onOpenEpisode, openEpisode, onCloseEpisode }: Props) {
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<'all' | 'before' | 'after'>('all');
  const [unusualOnly, setUnusualOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [desc, setDesc] = useState(true);
  const [page, setPage] = useState(0);

  // Each show's own before-move baseline, using every episode (flags included) so the reference doesn't move with the filters.
  const baselines = useMemo(() => {
    const out: Record<string, Baseline> = {};
    for (const id of Object.keys(SHOW_BY_ID)) {
      const pre = all.filter((e) => e.showId === id && e.date < f.split).map((e) => e.completion);
      if (pre.length < 3) continue;
      const mean = pre.reduce((a, b) => a + b, 0) / pre.length;
      const sd = Math.sqrt(pre.reduce((a, b) => a + (b - mean) ** 2, 0) / (pre.length - 1)) || 0.01;
      out[id] = { mean, sd };
    }
    return out;
  }, [all, f.split]);

  const zOf = (e: Episode): number | null => {
    const b = baselines[e.showId];
    return b ? (e.completion - b.mean) / b.sd : null;
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return d.selected
      .filter((e) => {
        const isPost = e.date >= f.split;
        if (period === 'before' && isPost) return false;
        if (period === 'after' && !isPost) return false;
        if (q && !(e.title.toLowerCase().includes(q) || SHOW_BY_ID[e.showId].name.toLowerCase().includes(q))) return false;
        if (unusualOnly) {
          const z = zOf(e);
          if (z === null || Math.abs(z) < 2) return false;
        }
        return true;
      })
      .map((e) => ({ e, z: zOf(e), cliff: cliffOf(e) }));
  }, [d.selected, query, period, unusualOnly, f.split, baselines]);

  const sorted = useMemo(() => {
    const val = (r: (typeof rows)[number], k: SortKey): number | string => {
      switch (k) {
        case 'date':
          return r.e.date;
        case 'show':
          return SHOW_BY_ID[r.e.showId].name;
        case 'length':
          return r.e.lengthMin;
        case 'starts':
          return r.e.starts;
        case 'completion':
          return r.e.completion;
        case 'listenThrough':
          return r.e.listenThrough;
        case 'cliff':
          return r.cliff ?? -1;
        case 'z':
          return r.z ?? 0;
      }
    };
    return rows.slice().sort((a, b) => {
      const x = val(a, sortKey);
      const y = val(b, sortKey);
      const c = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number);
      return desc ? -c : c;
    });
  }, [rows, sortKey, desc]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const current = Math.min(page, pages - 1);
  const pageRows = sorted.slice(current * PAGE, current * PAGE + PAGE);

  const sortBy = (k: SortKey) => {
    if (k === sortKey) setDesc((v) => !v);
    else {
      setSortKey(k);
      setDesc(k !== 'show');
    }
    setPage(0);
  };

  const th = (k: SortKey, label: string, left = false) => (
    <th key={k} className={left ? 'left' : undefined}>
      <button type="button" className={sortKey === k ? 'is-sorted' : ''} onClick={() => sortBy(k)}>
        {label}
        {sortKey === k ? (desc ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  );

  const exportCsv = () =>
    downloadCsv(
      'earshot-episodes.csv',
      ['date', 'show', 'title', 'period', 'length_min', 'downloads', 'starts', 'completion_pct', 'listen_through_pct', 'midroll_min', 'ad_breaks', 'majority_platform', 'lost_at_midroll_pct', 'z_vs_show_before', 'production_note'],
      sorted.map(({ e, z, cliff }) => [
        e.date,
        SHOW_BY_ID[e.showId].name,
        e.title,
        e.date >= f.split ? 'After' : 'Before',
        e.lengthMin,
        e.downloads,
        e.starts,
        (e.completion * 100).toFixed(2),
        (e.listenThrough * 100).toFixed(2),
        e.midroll ?? '',
        e.adBreaks,
        e.majorityPlatform,
        cliff !== null ? (cliff * 100).toFixed(1) : '',
        z !== null ? z.toFixed(2) : '',
        e.note ?? '',
      ]),
    );

  const flagCount = rows.filter((r) => r.e.note).length;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Episodes</h1>
          <p>
            {num(sorted.length)} episodes match. Sort any column. Click a row to see its retention curve against the show's average.
            “vs show” is how many standard deviations the episode's completion sits from its show's before-move average.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={exportCsv} disabled={!sorted.length}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search title or show"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          aria-label="Search episodes"
        />
        <div className="seg" role="group" aria-label="Period" style={{ width: 260 }}>
          {(['all', 'before', 'after'] as const).map((p) => (
            <button key={p} type="button" className={period === p ? 'is-active' : ''} onClick={() => { setPeriod(p); setPage(0); }}>
              {p === 'all' ? 'All' : p === 'before' ? 'Before' : 'After'}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={unusualOnly} onChange={(e) => { setUnusualOnly(e.target.checked); setPage(0); }} />
          <span>Unusual only (2+ SD from show's before average)</span>
        </label>
        <span className="side-help" style={{ marginLeft: 'auto' }}>
          {flagCount ? `${flagCount} with production notes` : ''}
        </span>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {th('date', 'Date', true)}
              {th('show', 'Show', true)}
              <th className="left">Episode</th>
              <th className="left">Period</th>
              {th('length', 'Length')}
              <th>Mid-roll</th>
              {th('starts', 'Starts')}
              {th('completion', 'Completion')}
              {th('listenThrough', 'Avg. listened')}
              <th className="left">Platform</th>
              {th('cliff', 'Lost at mid-roll')}
              {th('z', 'vs show')}
              <th className="left">Note</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ e, z, cliff }) => {
              const after = e.date >= f.split;
              return (
                <tr key={e.id} className={`clickable${openEpisode?.id === e.id ? ' is-selected' : ''}`} onClick={() => onOpenEpisode(e.id)}>
                  <td className="left">{dateShort(e.date)}</td>
                  <td className="left">
                    <span className="swatch" style={{ background: SHOW_BY_ID[e.showId].color, marginRight: 6 }} />
                    {SHOW_BY_ID[e.showId].name}
                  </td>
                  <td className="left" style={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.title}>
                    {e.title}
                  </td>
                  <td className="left">
                    <span className={`tag ${after ? '' : ''}`} style={after ? { background: 'var(--accent-soft)', color: '#134e48' } : undefined}>
                      {after ? 'After' : 'Before'}
                    </span>
                  </td>
                  <td>{e.lengthMin} min</td>
                  <td>{e.midroll !== null ? `min ${e.midroll}` : '—'}</td>
                  <td>{num(e.starts)}</td>
                  <td>{pct(e.completion)}</td>
                  <td>{pct(e.listenThrough, 0)}</td>
                  <td className="left">{e.majorityPlatform}</td>
                  <td>{cliff !== null ? pct(cliff, 0) : '—'}</td>
                  <td className={z !== null && Math.abs(z) >= 2 ? (z < 0 ? 'tone-down' : 'tone-up') : ''}>
                    {z !== null ? `${z >= 0 ? '+' : '−'}${Math.abs(z).toFixed(1)}` : '—'}
                    {z !== null && Math.abs(z) >= 2 && <span className="tag amber" style={{ marginLeft: 6 }}>unusual</span>}
                  </td>
                  <td className="left">{e.note ? <span className="tag note">note</span> : ''}</td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={13} className="left muted" style={{ padding: 22 }}>
                  No episodes match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <span>
          Page {current + 1} of {pages}
        </span>
        <button type="button" className="btn small" disabled={current === 0} onClick={() => setPage(current - 1)}>
          Previous
        </button>
        <button type="button" className="btn small" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
          Next
        </button>
      </div>

      {openEpisode && (
        <EpisodeDrawer
          episode={openEpisode}
          all={all}
          split={f.split}
          z={zOf(openEpisode)}
          onClose={onCloseEpisode}
        />
      )}
    </div>
  );
}

function EpisodeDrawer({ episode: e, all, split, z, onClose }: { episode: Episode; all: Episode[]; split: string; z: number | null; onClose: () => void }) {
  const show = SHOW_BY_ID[e.showId];
  const after = e.date >= split;
  const peers = all.filter((x) => x.showId === e.showId && x.id !== e.id && (x.date >= split) === after);
  const peerCurve = retentionCurve(peers, Math.max(e.lengthMin + 5, 30), 3);
  const epCurve = Array.from(e.retention, (v) => v as number);
  const xMax = Math.max(e.lengthMin, 30);
  const series: LineSeries[] = [
    { key: 'ep', label: 'This episode', color: after ? COLORS.after : COLORS.before, values: epCurve },
    { key: 'peer', label: `${show.name}, other ${after ? 'after' : 'before'} episodes`, color: COLORS.flat, values: peerCurve, dashed: true },
  ];
  const markers: VMarker[] = [];
  if (e.midroll !== null) markers.push({ x: e.midroll, label: `mid-roll min ${e.midroll}`, color: COLORS.marker });
  const cliff = cliffOf(e);
  const peerCliffs = peers.map((p) => cliffOf(p)).filter((x): x is number => x !== null);
  const peerCliff = peerCliffs.length ? peerCliffs.reduce((a, b) => a + b, 0) / peerCliffs.length : null;
  const peerComp = peers.length ? peers.reduce((a, b) => a + b.completion, 0) / peers.length : null;
  const platforms = (Object.entries(e.shares) as [Platform, number][]).sort((a, b) => b[1] - a[1]);
  const platColor: Record<string, string> = { Apple: '#0f766e', Spotify: '#1db954', 'Network app': '#7c3aed', Other: '#94a3b8' };

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-label={`Episode: ${e.title}`}>
        <button type="button" className="close" onClick={onClose}>
          Close
        </button>
        <div className="side-title" style={{ marginBottom: 2 }}>
          {show.name} · {after ? 'after the move' : 'before the move'}
        </div>
        <h2>{e.title}</h2>
        <p className="side-help" style={{ marginTop: 4 }}>
          {dateLong(e.date)} · episode {e.seq} · {show.format}
        </p>

        {e.note && (
          <div className="note warn" style={{ marginTop: 10 }}>
            <strong>Production note:</strong> {e.note}
          </div>
        )}

        <div className="facts">
          <div className="fact">
            <span>Completion</span>
            <strong>{pct(e.completion)}</strong>
          </div>
          <div className="fact">
            <span>Avg. listened</span>
            <strong>{pct(e.listenThrough, 0)}</strong>
          </div>
          <div className="fact">
            <span>Starts</span>
            <strong>{num(e.starts)}</strong>
          </div>
        </div>

        <div className="card-head" style={{ marginBottom: 4 }}>
          <h2 style={{ fontSize: 13 }}>Share still listening, by minute</h2>
          <span className="sub">vs. other {show.name} episodes from the same period</span>
        </div>
        <LineChart
          series={series}
          xMax={xMax}
          markers={markers}
          height={230}
          xTicks={Array.from({ length: Math.floor(xMax / 10) + 1 }, (_, k) => k * 10)}
          xLabel={(x) => `${x}m`}
          ariaLabel={`Retention by minute for ${e.title}`}
        />
        <div className="legend" style={{ marginTop: 2 }}>
          <span><i style={{ borderColor: after ? COLORS.after : COLORS.before }} />This episode</span>
          <span><i className="dashed" style={{ borderColor: COLORS.flat }} />Show, same period</span>
        </div>

        <dl className="kv" style={{ marginTop: 14 }}>
          <dt>Length</dt>
          <dd>{e.lengthMin} min</dd>
          <dt>Mid-roll</dt>
          <dd>{e.midroll !== null ? `minute ${e.midroll}, ${e.adBreaks} ad break${e.adBreaks === 1 ? '' : 's'}` : `no mid-roll, ${e.adBreaks} ad break${e.adBreaks === 1 ? '' : 's'}`}</dd>
          <dt>Lost at mid-roll</dt>
          <dd>
            {cliff !== null ? pct(cliff, 0) : '—'}
            {peerCliff !== null && <span className="muted"> · show average {pct(peerCliff, 0)}</span>}
          </dd>
          <dt>Completion vs show</dt>
          <dd>
            {peerComp !== null ? pts2(e.completion - peerComp) : '—'}
            <span className="muted"> · average of {peers.length} other episodes</span>
          </dd>
          <dt>Unusual vs show before</dt>
          <dd>{z !== null ? `${z >= 0 ? '+' : '−'}${Math.abs(z).toFixed(1)} SD ${Math.abs(z) >= 2 ? '(flagged)' : '(within range)'}` : 'Not enough history'}</dd>
          <dt>Downloads</dt>
          <dd>{num(e.downloads)}</dd>
        </dl>

        <div className="card-head" style={{ marginTop: 16, marginBottom: 6 }}>
          <h2 style={{ fontSize: 13 }}>Listening platforms</h2>
          <span className="sub">Share of starts. Largest: {e.majorityPlatform}.</span>
        </div>
        <div className="platform-bar" aria-hidden="true">
          {platforms.map(([p, v]) => (
            <i key={p} style={{ width: `${v * 100}%`, background: platColor[p] }} title={`${p} ${Math.round(v * 100)}%`} />
          ))}
        </div>
        <div className="legend">
          {platforms.map(([p, v]) => (
            <span key={p}>
              <span className="swatch" style={{ background: platColor[p] }} />
              {p} {Math.round(v * 100)}%
            </span>
          ))}
        </div>
      </aside>
    </>
  );
}

function pts2(x: number): string {
  const v = (x * 100).toFixed(1);
  if (Number(v) === 0) return '0.0 pts';
  return `${v.startsWith('-') ? '−' + v.slice(1) : '+' + v} pts`;
}

