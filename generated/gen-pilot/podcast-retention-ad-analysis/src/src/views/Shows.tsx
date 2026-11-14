import { useMemo } from 'react';
import type { Derived, Filters } from '../analysis/model';
import { showRows, type ShowRow } from '../analysis/groups';
import { retentionCurve, meanCliff, medianMidroll, wmean } from '../analysis/stats';
import { DeltaChart, LineChart, COLORS, type DeltaRow, type LineSeries, type VMarker } from '../components/charts';
import { downloadCsv } from '../lib/csv';
import { ci, dateShort, num, pct, pts } from '../lib/format';

interface Props {
  d: Derived;
  f: Filters;
  focusShowId: string | null;
  setFocusShowId: (id: string | null) => void;
}

function statusOf(r: ShowRow): { label: string; cls: string } {
  if (!r.narrative) return { label: 'No ad change', cls: '' };
  if (!r.est) return { label: 'Too few episodes', cls: '' };
  if (r.outlier) return { label: 'Outlier: large drop', cls: 'amber' };
  if (r.est.clear && r.est.est < 0) return { label: 'Clear drop', cls: 'down' };
  if (r.est.clear && r.est.est > 0) return { label: 'Clear rise', cls: 'up' };
  return { label: 'No clear change', cls: '' };
}

export function Shows({ d, f, focusShowId, setFocusShowId }: Props) {
  const rows = useMemo(() => showRows(d, f), [d, f]);

  const selectedRow = useMemo(() => {
    if (!rows.length) return null;
    const hit = rows.find((r) => r.show.id === focusShowId);
    if (hit) return hit;
    const narr = rows.filter((r) => r.narrative && r.est);
    if (narr.length) return narr.slice().sort((a, b) => Math.abs(b.est!.est) - Math.abs(a.est!.est))[0];
    return rows[0];
  }, [rows, focusShowId]);

  const deltaRows: DeltaRow[] = rows.map((r) => ({
    key: r.show.id,
    label: r.show.name,
    note: r.narrative ? `${r.pre.length} → ${r.post.length} episodes` : `No ad change · ${r.pre.length + r.post.length} episodes`,
    est: r.est ? r.est.est : null,
    lo: r.est ? r.est.lo : null,
    hi: r.est ? r.est.hi : null,
    selected: selectedRow?.show.id === r.show.id,
    onSelect: () => setFocusShowId(r.show.id),
  }));

  const exportCsv = () => {
    downloadCsv(
      'earshot-shows.csv',
      [
        'show', 'format', 'episodes_before', 'episodes_after', 'completion_before', 'completion_after',
        'raw_change_pts', 'adjusted_change_pts', 'ci_low_pts', 'ci_high_pts', 'midroll_before_min', 'midroll_after_min',
        'cliff_before', 'cliff_after', 'status',
      ],
      rows.map((r) => [
        r.show.name,
        r.show.format,
        r.pre.length,
        r.post.length,
        r.est ? (r.est.preRate * 100).toFixed(2) : '',
        r.est ? (r.est.postRate * 100).toFixed(2) : '',
        r.est ? (r.est.rawChange * 100).toFixed(2) : '',
        r.est ? (r.est.est * 100).toFixed(2) : '',
        r.est ? (r.est.lo * 100).toFixed(2) : '',
        r.est ? (r.est.hi * 100).toFixed(2) : '',
        r.midPre ?? '',
        r.midPost ?? '',
        r.cliffPre !== null ? (r.cliffPre * 100).toFixed(1) : '',
        r.cliffPost !== null ? (r.cliffPost * 100).toFixed(1) : '',
        statusOf(r).label,
      ]),
    );
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Shows</h1>
          <p>
            {d.hasTreat
              ? 'Adjusted change per show: its change after the move minus the non-narrative change over the same window. Click a show to see its retention curve.'
              : 'Raw before and after change per show. These shows have no ad-slot change.'}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card empty">No shows are selected. Pick at least one show in the sidebar.</div>
      ) : (
        <>
          <div className="grid cols-6-6">
            <section className="card">
              <div className="card-head">
                <h2>{d.hasTreat ? 'Adjusted change by show' : 'Change by show'}</h2>
                <span className="sub">Bars show 95% intervals. Colour appears only when the interval excludes zero.</span>
              </div>
              <DeltaChart rows={deltaRows} ariaNote="Change in completion by show" />
            </section>

            <section className="card">
              {selectedRow ? <ShowDetail row={selectedRow} f={f} /> : null}
            </section>
          </div>

          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th className="left">Show</th>
                  <th className="left">Format</th>
                  <th>Episodes before / after</th>
                  <th>Completion before</th>
                  <th>Completion after</th>
                  <th>Raw change</th>
                  <th>{d.hasTreat ? 'Adjusted change' : 'Change'} (95% CI)</th>
                  <th>Mid-roll, min</th>
                  <th>Lost at mid-roll</th>
                  <th className="left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = statusOf(r);
                  return (
                    <tr
                      key={r.show.id}
                      className={`clickable${selectedRow?.show.id === r.show.id ? ' is-selected' : ''}`}
                      onClick={() => setFocusShowId(r.show.id)}
                    >
                      <td className="name left">
                        <span className="swatch" style={{ background: r.show.color, marginRight: 8 }} />
                        {r.show.name}
                      </td>
                      <td className="left">{r.show.format}</td>
                      <td>
                        {r.pre.length} / {r.post.length}
                      </td>
                      <td>{pct(r.est?.preRate ?? wmean(r.pre))}</td>
                      <td>{pct(r.est?.postRate ?? wmean(r.post))}</td>
                      <td className={r.est && r.est.rawChange < 0 ? 'tone-down' : ''}>{r.est ? pts(r.est.rawChange) : '—'}</td>
                      <td className={r.est && r.est.clear && r.est.est < 0 ? 'tone-down' : ''}>
                        {r.est ? (
                          <>
                            <strong>{pts(r.est.est)}</strong>{' '}
                            <span className="muted">
                              ({r.est.lo < 0 ? '−' : ''}
                              {Math.abs(r.est.lo * 100).toFixed(1)} to {r.est.hi < 0 ? '−' : ''}
                              {Math.abs(r.est.hi * 100).toFixed(1)})
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{r.midPre ?? '—'}{r.midPost !== null && r.midPost !== r.midPre ? ` → ${r.midPost}` : ''}</td>
                      <td>
                        {r.cliffPre !== null ? pct(r.cliffPre, 0) : '—'}
                        {r.cliffPost !== null && r.cliffPost !== r.cliffPre ? ` → ${pct(r.cliffPost, 0)}` : ''}
                      </td>
                      <td className="left">
                        <span className={`tag ${s.cls}`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="side-help" style={{ marginTop: -4 }}>
            Outlier: a narrative show at least 3 pts below the median narrative show in this view, and 2 standard errors below it. Needs at least three narrative shows.
            Bootstrap intervals resample episodes within each group.
          </p>
        </>
      )}
    </div>
  );
}

function ShowDetail({ row, f }: { row: ShowRow; f: Filters }) {
  const preCurve = useMemo(() => retentionCurve(row.pre, 90), [row.pre]);
  const postCurve = useMemo(() => retentionCurve(row.post, 90), [row.post]);
  let lastIdx = 30;
  for (let m = 0; m < preCurve.length; m++) if (preCurve[m] !== null || postCurve[m] !== null) lastIdx = Math.max(lastIdx, m);

  const series: LineSeries[] = [
    { key: 'pre', label: 'Before', color: COLORS.before, values: preCurve },
    { key: 'post', label: 'After', color: COLORS.after, values: postCurve },
  ];
  const markers: VMarker[] = [];
  const mp = medianMidroll(row.pre);
  const mq = medianMidroll(row.post);
  if (mp !== null) markers.push({ x: mp, label: `before: min ${mp}`, color: COLORS.before });
  if (mq !== null && mq !== mp) markers.push({ x: mq, label: `after: min ${mq}`, color: COLORS.after });

  const after = row.post.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const names = ['Apple', 'Spotify', 'Network app', 'Other'];
  // Starts-weighted platform shares actually observed across this show's episodes.
  const everyEp = row.pre.concat(row.post);
  const totalStarts = everyEp.reduce((a, e) => a + e.starts, 0) || 1;
  const platformMix = names.map((n) =>
    everyEp.reduce((a, e) => a + e.starts * (e.shares as Record<string, number>)[n], 0) / totalStarts,
  );
  const palette = ['#0f766e', '#1db954', '#7c3aed', '#94a3b8'];

  return (
    <>
      <div className="card-head">
        <h2>
          <span className="swatch" style={{ background: row.show.color, marginRight: 8 }} />
          {row.show.name}
        </h2>
        <span className="sub">{row.show.format}</span>
      </div>
      <p className="side-help" style={{ marginTop: 0, marginBottom: 8, fontSize: 12.5 }}>{row.show.blurb}</p>
      <LineChart
        series={series}
        xMax={lastIdx}
        markers={markers}
        height={200}
        xTicks={Array.from({ length: Math.floor(lastIdx / 10) + 1 }, (_, k) => k * 10)}
        xLabel={(x) => `${x}m`}
        ariaLabel={`Retention by minute for ${row.show.name}`}
      />
      <div className="legend" style={{ marginTop: 2 }}>
        <span><i style={{ borderColor: COLORS.before }} />Before</span>
        <span><i style={{ borderColor: COLORS.after }} />After</span>
      </div>

      <div className="facts">
        <div className="fact">
          <span>{row.narrative ? 'Adjusted change' : 'Change'}</span>
          <strong className={row.est && row.est.est < 0 ? 'tone-down' : ''}>{row.est ? pts(row.est.est) : '—'}</strong>
          <div className="kpi-sub">{row.est ? ci(row.est.lo, row.est.hi) : ''}</div>
        </div>
        <div className="fact">
          <span>Mid-roll lost</span>
          <strong>{pct(meanCliff(row.pre), 0)} → {pct(meanCliff(row.post), 0)}</strong>
        </div>
        <div className="fact">
          <span>Median length</span>
          <strong>{Math.round(medianOf(row.pre.concat(row.post).map((e) => e.lengthMin)))} min</strong>
        </div>
      </div>

      <div className="card-head" style={{ marginBottom: 6 }}>
        <h2 style={{ fontSize: 13 }}>Platform share of starts</h2>
        <span className="sub">Starts-weighted, all episodes in this view.</span>
      </div>
      <div className="platform-bar" aria-hidden="true">
        {platformMix.map((v, i) => (
          <i key={names[i]} style={{ width: `${v * 100}%`, background: palette[i] }} title={`${names[i]} ${Math.round(v * 100)}%`} />
        ))}
      </div>
      <div className="legend" style={{ marginBottom: 10 }}>
        {names.map((n, i) => (
          <span key={n}>
            <span className="swatch" style={{ background: palette[i] }} />
            {n} {Math.round(platformMix[i] * 100)}%
          </span>
        ))}
      </div>

      <div className="card-head" style={{ marginBottom: 6 }}>
        <h2 style={{ fontSize: 13 }}>Latest episodes in this view</h2>
        <span className="sub">{f.excludeFlagged ? 'Production-note episodes hidden' : 'Includes production-note episodes'}</span>
      </div>
      <div className="table-wrap" style={{ maxHeight: 240 }}>
        <table className="data">
          <thead>
            <tr>
              <th className="left">Date</th>
              <th className="left">Title</th>
              <th>Completion</th>
              <th>Mid-roll</th>
            </tr>
          </thead>
          <tbody>
            {after.map((e) => (
              <tr key={e.id}>
                <td className="left">{dateShort(e.date)}</td>
                <td className="left" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.title}
                  {e.note && <span className="tag note" style={{ marginLeft: 6 }}>note</span>}
                </td>
                <td>{pct(e.completion)}</td>
                <td>{e.midroll !== null ? `min ${e.midroll}` : '—'}</td>
              </tr>
            ))}
            {after.length === 0 && (
              <tr>
                <td colSpan={4} className="left muted">No episodes after the split date.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="side-help">{num(row.pre.length + row.post.length)} episodes in this view.</p>
    </>
  );
}

function medianOf(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
