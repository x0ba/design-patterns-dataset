import { useMemo, useState } from 'react';
import type { Derived, Filters } from '../analysis/model';
import { DIM_LABEL, segmentRows, segmentsFor, type Dim } from '../analysis/groups';
import { splitByDate, wmean } from '../analysis/stats';
import { DeltaChart, type DeltaRow } from '../components/charts';
import { downloadCsv } from '../lib/csv';
import { ci, pct, pts } from '../lib/format';

interface Props {
  d: Derived;
  f: Filters;
}

const DIMS: Dim[] = ['length', 'platform', 'breaks', 'downloads'];

export function Segments({ d, f }: Props) {
  const [dim, setDim] = useState<Dim>('length');
  const rows = useMemo(() => segmentRows(d, f, dim), [d, f, dim]);
  const segs = useMemo(() => segmentsFor(dim), [dim]);

  const table = useMemo(
    () =>
      segs.map((seg) => {
        const t = splitByDate(d.treat.filter(seg.test), f.split);
        const c = splitByDate(d.control.filter(seg.test), f.split);
        return {
          key: seg.key,
          label: seg.label,
          tPre: t.pre.length,
          tPost: t.post.length,
          cPre: c.pre.length,
          cPost: c.post.length,
          preRate: wmean(t.pre),
          postRate: wmean(t.post),
        };
      }),
    [d, f.split, segs],
  );

  const deltaRows: DeltaRow[] = rows.map((r) => ({
    key: r.key,
    label: r.label,
    note: d.hasTreat
      ? `${r.nTreat} narrative · ${r.nCtrl} comparison${r.est?.mode === 'raw' ? ' · raw only' : ''}`
      : `${r.nTreat} episodes`,
    est: r.est ? r.est.est : null,
    lo: r.est ? r.est.lo : null,
    hi: r.est ? r.est.hi : null,
  }));

  // Difference between the highest and lowest segment, with an approximate interval.
  // Only adjusted estimates are comparable with each other; raw fallbacks are left out.
  const estimable = rows.filter((r) => r.est && (!d.hasTreat || r.est.mode === 'did'));
  let gapText: string | null = null;
  if (estimable.length >= 2) {
    const hiR = estimable.reduce((a, b) => (b.est!.est > a.est!.est ? b : a));
    const loR = estimable.reduce((a, b) => (b.est!.est < a.est!.est ? b : a));
    if (hiR !== loR) {
      const gap = hiR.est!.est - loR.est!.est;
      const se = Math.sqrt(hiR.est!.se ** 2 + loR.est!.se ** 2);
      const glo = gap - 1.96 * se;
      const ghi = gap + 1.96 * se;
      const clearGap = glo > 0 || ghi < 0;
      const interval = `${(glo * 100).toFixed(1)} to ${(ghi * 100).toFixed(1)}`.replace(/-/g, '−');
      gapText = `${loR.label} is ${(gap * 100).toFixed(1)} pts lower than ${hiR.label} (approx. 95% interval for the gap: ${interval} pts). ${
        clearGap ? 'The gap is larger than the uncertainty, so the two segments differ.' : 'The gap is within the uncertainty, so these two segments may not differ.'
      }`;
    }
  }

  const exportCsv = () =>
    downloadCsv(
      `earshot-segments-${dim}.csv`,
      ['segment', 'narrative_before', 'narrative_after', 'comparison_before', 'comparison_after', 'completion_before', 'completion_after', 'adjusted_change_pts', 'ci_low_pts', 'ci_high_pts'],
      table.map((t) => {
        const r = rows.find((x) => x.key === t.key);
        return [
          t.label,
          t.tPre,
          t.tPost,
          t.cPre,
          t.cPost,
          t.preRate !== null ? (t.preRate * 100).toFixed(2) : '',
          t.postRate !== null ? (t.postRate * 100).toFixed(2) : '',
          r?.est ? (r.est.est * 100).toFixed(2) : '',
          r?.est ? (r.est.lo * 100).toFixed(2) : '',
          r?.est ? (r.est.hi * 100).toFixed(2) : '',
        ];
      }),
    );

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Segments</h1>
          <p>
            {d.hasTreat
              ? 'Does the change differ by episode length, platform, ad load, or audience size? Each segment is compared with the comparison shows in the same segment.'
              : 'Raw before and after change by segment for the selected shows.'}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="seg" role="group" aria-label="Group by" style={{ maxWidth: 620 }}>
        {DIMS.map((k) => (
          <button key={k} type="button" className={dim === k ? 'is-active' : ''} onClick={() => setDim(k)}>
            {DIM_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="grid cols-6-6">
        <section className="card">
          <div className="card-head">
            <h2>{d.hasTreat ? 'Adjusted change by segment' : 'Change by segment'}</h2>
            <span className="sub">{DIM_LABEL[dim]} · 95% bootstrap intervals</span>
          </div>
          <DeltaChart rows={deltaRows} ariaNote={`Change in completion by ${DIM_LABEL[dim].toLowerCase()}`} />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>How to read this</h2>
          </div>
          <div className="findings" style={{ maxHeight: 'none' }}>
            <div className="finding">
              <h3>Adjusted, within segment</h3>
              <p>
                Each row takes the narrative change in that segment and subtracts the change in non-narrative shows in the same
                segment. Non-narrative shows never moved their ad slot, so this removes general drift.
              </p>
            </div>
            <div className="finding">
              <h3>Small segments</h3>
              <p>
                Narrative episodes after the move are few. A segment with only a handful of post-move episodes will have a wide
                interval, even when its point estimate looks large. A segment with fewer than three episodes on either side shows
                “Too few episodes”.
              </p>
            </div>
            {gapText && (
              <div className="finding">
                <h3>Do the segments differ from each other?</h3>
                <p>{gapText}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th className="left">Segment</th>
              <th>Narrative before / after</th>
              <th>Comparison before / after</th>
              <th>Completion before</th>
              <th>Completion after</th>
              <th>Raw change</th>
              <th>{d.hasTreat ? 'Adjusted change' : 'Change'} (95% CI)</th>
            </tr>
          </thead>
          <tbody>
            {table.map((t) => {
              const r = rows.find((x) => x.key === t.key);
              const raw = t.preRate !== null && t.postRate !== null ? t.postRate - t.preRate : null;
              return (
                <tr key={t.key}>
                  <td className="name left">{t.label}</td>
                  <td>
                    {t.tPre} / {t.tPost}
                  </td>
                  <td>
                    {t.cPre} / {t.cPost}
                  </td>
                  <td>{pct(t.preRate)}</td>
                  <td>{pct(t.postRate)}</td>
                  <td className={raw !== null && raw < 0 ? 'tone-down' : ''}>{raw === null ? '—' : pts(raw)}</td>
                  <td className={r?.est && r.est.clear && r.est.est < 0 ? 'tone-down' : ''}>
                    {r?.est ? (
                      <>
                        <strong>{pts(r.est.est)}</strong>{' '}
                        <span className="muted">({ci(r.est.lo, r.est.hi).replace('95% CI ', '').replace(' pts', '')})</span>
                        {d.hasTreat && r.est.mode === 'raw' && (
                          <span className="tag amber" style={{ marginLeft: 6 }}>
                            raw: few comparison episodes
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="muted">Too few episodes</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
