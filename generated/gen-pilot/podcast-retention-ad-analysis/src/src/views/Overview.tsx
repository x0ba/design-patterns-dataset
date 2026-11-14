import { useMemo, type ReactNode } from 'react';
import type { Episode } from '../data/generate';
import { derive, NARRATIVE_IDS, type Derived, type Filters } from '../analysis/model';
import { showRows, segmentRows } from '../analysis/groups';
import {
  estimateChange,
  unitsByShow,
  meanCliff,
  medianMidroll,
  monthRange,
  monthlyCompletion,
  retentionCurve,
  splitByDate,
  type ChangeEstimate,
} from '../analysis/stats';
import { BarsChart, COLORS, LineChart, type LineSeries, type VMarker } from '../components/charts';
import { ci, dateLong, dateShort, monthLabel, pct, pts, weeksBetween } from '../lib/format';

interface Props {
  all: Episode[];
  d: Derived;
  f: Filters;
  onOpenShow: (id: string) => void;
}

interface Finding {
  tone: 'bad' | 'good' | 'warn' | '';
  title: string;
  body: string;
  foot?: string;
}

const LAST_DATA_DAY = '2026-11-13';
const NARR_SET: Record<string, true> = Object.fromEntries(NARRATIVE_IDS.map((id) => [id, true]));

export function Overview({ all, d, f, onOpenShow }: Props) {
  const split = f.split;
  const group = d.hasTreat ? d.treat : d.selected;
  const g = useMemo(() => splitByDate(group, split), [group, split]);

  const est: ChangeEstimate | null = useMemo(
    () =>
      estimateChange(
        unitsByShow(group, split),
        d.hasTreat ? unitsByShow(d.control, split) : null,
        1000,
        7,
      ),
    [group, d.control, d.hasTreat, split],
  );

  // The other setting of the production-note exclusion, so the sidebar choice can be checked against it.
  const other = useMemo(() => {
    const alt = derive(all, { ...f, excludeFlagged: !f.excludeFlagged });
    const altGroup = alt.hasTreat ? alt.treat : alt.selected;
    return estimateChange(
      unitsByShow(altGroup, split),
      alt.hasTreat ? unitsByShow(alt.control, split) : null,
      600,
      7,
    );
  }, [all, f, split]);

  const preCurve = useMemo(() => retentionCurve(g.pre, 90), [g.pre]);
  const postCurve = useMemo(() => retentionCurve(g.post, 90), [g.post]);
  const lastIdx = useMemo(() => {
    let last = 30;
    for (let m = 0; m < preCurve.length; m++) if (preCurve[m] !== null || postCurve[m] !== null) last = m;
    return Math.max(30, last);
  }, [preCurve, postCurve]);

  const midPre = medianMidroll(g.pre);
  const midPost = medianMidroll(g.post);
  const cliffPre = meanCliff(g.pre);
  const cliffPost = meanCliff(g.post);

  const lineSeries: LineSeries[] = [
    { key: 'pre', label: 'Before', color: COLORS.before, values: preCurve },
    { key: 'post', label: 'After', color: COLORS.after, values: postCurve },
  ];
  const markers: VMarker[] = [];
  if (midPre !== null) markers.push({ x: midPre, label: `before: min ${midPre}`, color: COLORS.before });
  if (midPost !== null && midPost !== midPre) markers.push({ x: midPost, label: `after: min ${midPost}`, color: COLORS.after });

  const diff: (number | null)[] = preCurve.map((v, m) => (v !== null && postCurve[m] !== null ? (postCurve[m] as number) - v : null));

  // Monthly trend: narrative (or selected) vs non-narrative comparison.
  const months = useMemo(() => monthRange('2025-01', '2026-11'), []);
  const trendTreat = useMemo(() => monthlyCompletion(group, months), [group, months]);
  const trendCtrl = useMemo(() => monthlyCompletion(d.control, months), [d.control, months]);
  const splitIdx = months.indexOf(split.slice(0, 7));
  const splitX = splitIdx >= 0 ? splitIdx + (Number(split.slice(8, 10)) - 1) / 31 : null;
  const trendMarkers: VMarker[] = splitX !== null ? [{ x: splitX, label: `split ${dateShort(split)}`, color: COLORS.marker }] : [];

  // Findings: built from the numbers, not typed in.
  const rows = useMemo(() => showRows(d, f), [d, f]);
  const lengthRows = useMemo(() => segmentRows(d, f, 'length'), [d, f]);
  const platformRows = useMemo(() => segmentRows(d, f, 'platform'), [d, f]);

  if (!est) {
    return (
      <div className="stack">
        <PageHead d={d} f={f} />
        <div className="card empty">
          Not enough episodes on both sides of {dateLong(split)} to estimate a change. Each side needs at least three episodes in the current filter.
        </div>
      </div>
    );
  }

  const isAdjusted = est.mode === 'did';
  const headlineChange = est.est;
  const toneDown = headlineChange < 0 ? 'tone-down' : headlineChange > 0 ? 'tone-up' : 'tone-flat';

  const findings: Finding[] = [];

  // 1. Headline
  if (!d.hasTreat) {
    findings.push({
      tone: '',
      title: 'No narrative shows selected',
      body: `Each show's own completion changed by ${pts(est.est)} on average, from ${pct(est.preRate)} pooled before to ${pct(est.postRate)} after. These shows had no ad-slot change, so this is background drift.`,
    });
  } else {
    const tone: Finding['tone'] = est.clear ? (est.est < 0 ? 'bad' : 'good') : 'warn';
    const verb = est.est < 0 ? 'fell' : 'rose';
    findings.push({
      tone,
      title: est.clear
        ? `Completion ${verb} after the move`
        : 'No clear change in completion after the move',
      body: est.clear
        ? `Each narrative show's own completion changed by ${pts(est.treatChange)} on average. Adjusted for the comparison shows, the change is ${pts(est.est)}, ${ci(est.lo, est.hi)}.`
        : `Each narrative show's own completion changed by ${pts(est.treatChange)} on average. Adjusted for the comparison shows, the change is ${pts(est.est)}, and the 95% interval includes zero. These numbers cannot rule out no change.`,
      foot: `Pooled across episodes, completion went from ${pct(est.preRate)} to ${pct(est.postRate)} (${pts(est.rawChange)}), but larger shows weigh more in that figure. The headline gives each show equal weight. ${est.nPre + est.nPost} narrative episodes; interval from a bootstrap over episodes.`,
    });

    const cc = est.ctrlChange ?? 0;
    findings.push({
      tone: '',
      title: 'Comparison shows did not move much',
      body: `Non-narrative shows, which kept their ad positions, moved ${pts(cc)} over the same window (${est.nCtrlPre} episodes before, ${est.nCtrlPost} after).${Math.abs(cc) < 0.01 ? ' Background drift is small, so the raw and adjusted figures are close.' : ' That drift is subtracted in the adjusted figure.'}`,
    });
  }

  // 2. Which shows
  const narr = rows.filter((r) => r.narrative && r.est);
  if (narr.length && d.hasTreat) {
    const drops = narr.filter((r) => r.est!.clear && r.est!.est < 0).sort((a, b) => a.est!.est - b.est!.est);
    const rises = narr.filter((r) => r.est!.clear && r.est!.est > 0);
    const flat = narr.filter((r) => !r.est!.clear);
    const outliers = narr.filter((r) => r.outlier);
    const minPost = Math.min(...narr.map((r) => r.post.length));
    const maxPost = Math.max(...narr.map((r) => r.post.length));
    const parts: string[] = [];
    if (drops.length) parts.push(`Clear drops: ${drops.map((r) => `${r.show.name} (${pts(r.est!.est)})`).join(', ')}.`);
    if (rises.length) parts.push(`Clear rises: ${rises.map((r) => `${r.show.name} (${pts(r.est!.est)})`).join(', ')}.`);
    if (flat.length) parts.push(`No clear change: ${flat.map((r) => r.show.name).join(', ')}.`);
    findings.push({
      tone: outliers.length ? 'warn' : '',
      title: outliers.length
        ? `Outlier${outliers.length > 1 ? 's' : ''}: ${outliers.map((r) => r.show.name).join(' and ')}`
        : narr.length >= 3
          ? 'No show stands out as a large drop'
          : 'Changes by show',
      body: parts.join(' '),
      foot: `Outlier = at least 3 pts below the median narrative show and 2 standard errors below it. Only ${minPost} to ${maxPost} episodes per show sit after the move, so per-show intervals are wide.`,
    });
  }

  // 3. Timing claim
  const at = (curve: (number | null)[], m: number) => curve[m] ?? null;
  const p18pre = at(preCurve, 18);
  const p18post = at(postCurve, 18);
  const p24pre = at(preCurve, 24);
  const p24post = at(postCurve, 24);
  if (p18pre !== null && p18post !== null && p24pre !== null && p24post !== null) {
    const lowerBefore = p24post < p24pre - 0.005;
    findings.push({
      tone: lowerBefore ? 'warn' : 'good',
      title: lowerBefore ? 'Some listeners leave before the new slot' : 'Listeners are not leaving earlier',
      body: `At minute 18, the old slot, retention is ${pct(p18pre)} before the move and ${pct(p18post)} after. At minute 24, just before the new slot, it is ${pct(p24pre)} before and ${pct(p24post)} after. ${lowerBefore ? 'Retention before the new slot is lower after the move.' : 'Retention before the new slot is not lower after the move, so the data do not show an earlier exit.'}`,
      foot: `The main change is at the new slot: ${pct(cliffPost)} of listeners drop at minute ${midPost ?? '—'}, against ${pct(cliffPre)} at minute ${midPre ?? '—'} before.`,
    });
  }

  // 4. Segments
  if (d.hasTreat) {
    const segText = (rows: typeof lengthRows) =>
      rows
        .map((r) =>
          r.est
            ? `${r.label} ${pts(r.est.est)}${d.hasTreat && r.est.mode === 'raw' ? ' (raw, few comparison episodes)' : ''}`
            : `${r.label} too few episodes`,
        )
        .join(', ');
    findings.push({
      tone: '',
      title: 'Length and platform',
      body: `By length: ${segText(lengthRows)}. By majority platform: ${segText(platformRows)}.`,
      foot: 'Each segment compares narrative and comparison episodes within that segment. Sample sizes are on the Segments tab.',
    });
  }

  // 5. Sensitivity to production notes
  const flaggedInGroup = all.filter(
    (e) => e.note !== null && f.showIds.includes(e.showId) && (!d.hasTreat || e.showId in NARR_SET),
  );
  const flaggedSplit = splitByDate(flaggedInGroup, split);
  const flaggedPre = flaggedSplit.pre.length;
  const flaggedPost = flaggedSplit.post.length;
  if (d.hasTreat && other) {
    const oth = other;
    findings.push({
      tone: '',
      title: f.excludeFlagged ? 'Production-note episodes are excluded' : 'Production-note episodes are included',
      body: f.excludeFlagged
        ? `${flaggedPre} before and ${flaggedPost} after the move carry production notes (see Method & data) and are left out of the figures above. Including them, the adjusted change is ${pts(oth.est)} (${ci(oth.lo, oth.hi)}).`
        : `The figures above include ${flaggedPre + flaggedPost} episodes with production notes. Excluding them, the adjusted change is ${pts(oth.est)} (${ci(oth.lo, oth.hi)}).`,
    });
  }

  const weeks = weeksBetween(split, LAST_DATA_DAY);
  findings.push({
    tone: 'warn',
    title: 'Read with the sample size in mind',
    body: `${est.nPost} narrative episodes fall after the move, over about ${Math.round(weeks)} weeks, against ${est.nPre} before. The comparison is observational: the move is the only ad change we see, but it is not a randomised test.`,
  });

  const flagHint = f.excludeFlagged ? '' : ' (production-note episodes included)';

  return (
    <div className="stack">
      <PageHead d={d} f={f} />

      <div className="grid kpis">
        <Kpi
          label="Completion before"
          value={pct(est.preRate)}
          sub={`${est.nPre} episodes before ${dateShort(split)}`}
        />
        <Kpi
          label="Completion after"
          value={pct(est.postRate)}
          sub={
            <>
              <span className={est.rawChange < 0 ? 'tone-down' : est.rawChange > 0 ? 'tone-up' : ''}>{pts(est.rawChange)}</span>
              {` raw · ${est.nPost} episodes after`}
            </>
          }
        />
        <Kpi
          label={isAdjusted ? 'Change, adjusted for comparison shows' : 'Change, before to after'}
          value={<span className={toneDown}>{pts(headlineChange)}</span>}
          sub={`${ci(est.lo, est.hi)}${isAdjusted ? ` · comparison ${pts(est.ctrlChange)}` : ''}${flagHint}`}
        />
        <Kpi
          label="Listeners lost at the mid-roll"
          value={
            <>
              {pct(cliffPre, 0)}
              <span className="kpi-arrow">→</span>
              <span className={cliffPost !== null && cliffPre !== null && cliffPost > cliffPre ? 'tone-down' : ''}>{pct(cliffPost, 0)}</span>
            </>
          }
          sub={`minute ${midPre ?? '—'} before · minute ${midPost ?? '—'} after`}
        />
      </div>

      <div className="grid cols-7-5">
        <section className="card">
          <div className="card-head">
            <h2>Share still listening, by minute</h2>
            <span className="sub">Starts-weighted. Each line stops where fewer than five episodes reach the minute.</span>
          </div>
          <LineChart
            series={lineSeries}
            xMax={lastIdx}
            markers={markers}
            height={262}
            xTicks={Array.from({ length: Math.floor(lastIdx / 10) + 1 }, (_, k) => k * 10)}
            xLabel={(x) => `${x}m`}
            ariaLabel="Retention by minute, before and after the move"
          />
          <div className="legend" style={{ marginTop: 4 }}>
            <span><i style={{ borderColor: COLORS.before }} />Before</span>
            <span><i style={{ borderColor: COLORS.after }} />After</span>
            <span>Dashed lines mark the median mid-roll minute for each side.</span>
          </div>
          <div className="card-head" style={{ marginTop: 14, marginBottom: 4 }}>
            <h2 style={{ fontSize: 13 }}>Change at each minute (after minus before)</h2>
            <span className="sub">Negative bars mean fewer listeners remain.</span>
          </div>
          <BarsChart
            values={diff}
            xMax={lastIdx}
            height={104}
            xTicks={Array.from({ length: Math.floor(lastIdx / 10) + 1 }, (_, k) => k * 10)}
            xLabel={(x) => `${x}m`}
            markers={markers}
            ariaLabel="Change in retention at each minute"
          />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>What the data says</h2>
            <span className="sub">Generated from the current filters</span>
          </div>
          <div className="findings">
            {findings.map((fi) => (
              <div key={fi.title} className={`finding ${fi.tone}`}>
                <h3>{fi.title}</h3>
                <p>{fi.body}</p>
                {fi.foot && <div className="foot">{fi.foot}</div>}
              </div>
            ))}
          </div>
          {narr.length > 0 && d.hasTreat && (
            <div style={{ marginTop: 12 }}>
              <div className="side-title" style={{ marginBottom: 6 }}>Shows</div>
              <div className="legend" style={{ gap: 8 }}>
                {narr.map((r) => (
                  <button key={r.show.id} type="button" className="tag" style={{ cursor: 'pointer' }} onClick={() => onOpenShow(r.show.id)}>
                    {r.show.name} {pts(r.est!.est)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Completion by month</h2>
          <span className="sub">Pooled across episodes, so the mix of shows in a month moves the line. The last month is partial. Dashed line: split date.</span>
        </div>
        <LineChart
          series={[
            { key: 'treat', label: d.hasTreat ? 'Narrative (selected)' : 'Selected shows', color: COLORS.after, values: trendTreat.map((m) => m.value) },
            ...(d.hasTreat
              ? [{ key: 'ctrl', label: 'Non-narrative (no ad change)', color: COLORS.before, values: trendCtrl.map((m) => m.value), dashed: true } as LineSeries]
              : []),
          ]}
          xMax={months.length - 1}
          xTicks={months.map((_, i) => i).filter((i) => i % 2 === 0)}
          xLabel={(x) => monthLabel(months[x])}
          markers={trendMarkers}
          height={230}
          ariaLabel="Monthly completion for narrative and comparison shows"
        />
        <div className="legend" style={{ marginTop: 4 }}>
          <span><i style={{ borderColor: COLORS.after }} />{d.hasTreat ? 'Narrative (selected shows)' : 'Selected shows'}</span>
          {d.hasTreat && <span><i className="dashed" style={{ borderColor: COLORS.before }} />Non-narrative shows, no ad change</span>}
          <span>
            Episodes per month, narrative:{' '}
            {trendTreat.filter((m) => m.n > 0).length ? `${Math.min(...trendTreat.filter((m) => m.n > 0).map((m) => m.n))} to ${Math.max(...trendTreat.map((m) => m.n))}` : '—'}
          </span>
        </div>
      </section>
    </div>
  );
}

function PageHead({ d, f }: { d: Derived; f: Filters }) {
  return (
    <div className="page-head">
      <div>
        <h1>Did completion change after the ad move?</h1>
        <p>
          {d.hasTreat
            ? `Narrative episodes before and after ${dateLong(f.split)}. The mid-roll moved from about minute 18 to about minute 25 on this date. Non-narrative shows, which kept their ad positions, are the comparison.`
            : `The selected shows have no ad-slot change, so this view shows background drift over the same period.`}
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

