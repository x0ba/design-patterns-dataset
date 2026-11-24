import { useMemo, useState } from 'react';
import { DIMS, DimKey, GROUPS, GROUP_LABEL, M_OCT26, M_SEP26 } from '../data';
import { GROUP_COLORS, fmt, pct, rate, rateSigned, times } from '../format';
import { Settings, SegmentRow, baselineShort, segments } from '../model';
import { Dot, MiniRate, niceMax } from '../components/charts';
import { PinButton, Segmented } from '../components/controls';
import { Finding, segmentFinding, segmentInsight } from '../findings';

type SortKey = 'natural' | 'active' | 'baseRate' | 'nowRate' | 'change' | 'del' | 'pay' | 'share';

export default function Segments({ s, dim, setDim, addNote }: { s: Settings; dim: DimKey; setDim: (d: DimKey) => void; addNote: (f: Finding) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'natural', dir: 1 });
  const d = DIMS.find((x) => x.key === dim)!;
  const { rows, totalExcess, totalActive } = useMemo(() => segments(s, dim), [s, dim]);
  const ins = segmentInsight(rows, d.label);

  const val = (r: SegmentRow, k: SortKey) => {
    switch (k) {
      case 'active': return r.active;
      case 'baseRate': return r.baseRate;
      case 'nowRate': return r.nowRate;
      case 'change': return r.baseRate > 0 ? r.nowRate / r.baseRate : 0;
      case 'del': return r.excessRate[0];
      case 'pay': return r.excessRate[1];
      case 'share': return r.excessTotal;
      default: return -r.idx;
    }
  };
  const sorted = [...rows].sort((a, b) => (val(b, sort.key) - val(a, sort.key)) * sort.dir);
  const head = (k: SortKey, label: string, cls = 'num') => (
    <th className={`${cls} sortable ${sort.key === k ? 'sorted' : ''}`} onClick={() => setSort((p) => ({ key: k, dir: p.key === k ? ((-p.dir) as 1 | -1) : 1 }))}>
      {label}{sort.key === k && <span className="arrow">{sort.dir === 1 ? '↓' : '↑'}</span>}
    </th>
  );
  const maxEx = Math.max(...rows.map((r) => Math.max(0, r.excessRate[0]) + Math.max(0, r.excessRate[1]) + Math.max(0, r.excessRate[2])), 0.1);

  const multiples = dim === 'k' ? [...rows].sort((a, b) => b.excessTotal - a.excessTotal).slice(0, 8) : rows;
  const miniMax = niceMax(Math.max(...multiples.flatMap((r) => r.monthly.flatMap((m) => [m[0], m[1]].map((v) => (v / Math.max(r.active, 1)) * 1000)))), 2);

  return (
    <div className="view">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Which supporters reacted, and how</h2>
            <p className="sub">Extra cancellations per 1,000 active sponsorships per month, Sep–Oct 2026 vs {baselineShort(s.baseline)}</p>
          </div>
          <div className="row-gap">
            <span className="setting-label">Compare by</span>
            <Segmented value={dim} onChange={(v) => { setDim(v); setSort({ key: 'natural', dir: 1 }); }} options={DIMS.map((x) => ({ value: x.key, label: x.label }))} />
          </div>
        </div>

        {ins && (
          <div className="insights">
            <div className={`insight ${ins.dSig ? '' : 'weak'}`} style={{ borderColor: GROUP_COLORS[0] }}>
              <div className="insight-label"><Dot c={GROUP_COLORS[0]} />{ins.dSig ? 'Deliberate cancellations rose most among' : 'Highest deliberate rise, but within noise'}</div>
              <div className="insight-main">{ins.dHi.label} <span>{rateSigned(ins.dHi.excessRate[0])} per 1,000 / mo</span></div>
              <div className="insight-sub">
                {!ins.dSig ? <span className="nosig">Within normal variation: no {d.label.toLowerCase()} clearly stands out (range {rateSigned(ins.dLo.excessRate[0])} to {rateSigned(ins.dHi.excessRate[0])})</span>
                  : ins.dRatio ? <>{ins.dRatio} the rise among {ins.dLo.label} ({rateSigned(ins.dLo.excessRate[0])})</> : <>Lowest: {ins.dLo.label} ({rateSigned(ins.dLo.excessRate[0])})</>}
              </div>
            </div>
            <div className={`insight ${ins.pSig ? '' : 'weak'}`} style={{ borderColor: GROUP_COLORS[1] }}>
              <div className="insight-label"><Dot c={GROUP_COLORS[1]} />{ins.pSig ? 'Payment lapses rose most among' : 'Highest payment-lapse rise, but within noise'}</div>
              <div className="insight-main">{ins.pHi.label} <span>{rateSigned(ins.pHi.excessRate[1])} per 1,000 / mo</span></div>
              <div className="insight-sub">
                {!ins.pSig ? <span className="nosig">Within normal variation: no {d.label.toLowerCase()} clearly stands out (range {rateSigned(ins.pLo.excessRate[1])} to {rateSigned(ins.pHi.excessRate[1])})</span>
                  : ins.pRatio ? <>{ins.pRatio} the rise among {ins.pLo.label} ({rateSigned(ins.pLo.excessRate[1])})</> : <>Lowest: {ins.pLo.label} ({rateSigned(ins.pLo.excessRate[1])})</>}
              </div>
            </div>
            <div className="insight-action">
              <PinButton onClick={() => addNote(segmentFinding(s, dim))} />
              {s.filters[dim].length > 0 && <p className="muted small">Your {d.label.toLowerCase()} filter is shown as highlighted rows here rather than hiding the others.</p>}
            </div>
          </div>
        )}

        <table className="table segtable">
          <thead>
            <tr>
              {head('natural', d.label, '')}
              {head('active', 'Active')}
              {head('baseRate', 'Baseline rate')}
              {head('nowRate', 'Sep–Oct rate')}
              {head('change', 'Change')}
              <th style={{ width: 300 }}>Extra per 1,000 / mo by cause</th>
              {head('del', 'Deliberate')}
              {head('pay', 'Payment')}
              {head('share', 'Share of excess')}
              <th className="num">Share of base</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const shareEx = totalExcess > 0 ? r.excessTotal / totalExcess : 0;
              const shareBase = r.active / Math.max(totalActive, 1);
              const over = shareEx > shareBase * 1.25;
              return (
                <tr key={r.idx} className={r.selected ? 'sel' : ''}>
                  <td><b>{r.label}</b></td>
                  <td className="num">{fmt(r.active)}</td>
                  <td className="num muted">{rate(r.baseRate)}</td>
                  <td className="num">{rate(r.nowRate)}</td>
                  <td className="num">{r.baseRate > 0 ? times(r.nowRate / r.baseRate) : '–'}</td>
                  <td>
                    <div className="exbar">
                      {r.excessRate.map((v, g) => (v > 0 ? <div key={g} style={{ width: `${(v / maxEx) * 100}%`, background: GROUP_COLORS[g] }} /> : null))}
                    </div>
                  </td>
                  <td className="num" style={{ color: GROUP_COLORS[0] }} title={`±${rate(1.96 * r.noise[0])} (95% range from random variation)`}><b>{rateSigned(r.excessRate[0])}</b></td>
                  <td className="num" style={{ color: GROUP_COLORS[1] }} title={`±${rate(1.96 * r.noise[1])} (95% range from random variation)`}><b>{rateSigned(r.excessRate[1])}</b></td>
                  <td className={`num ${over ? 'hot' : ''}`}>{pct(Math.max(0, shareEx))}</td>
                  <td className="num muted">{pct(shareBase)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="foot-note">
          Rates use the Nov 1 active base for each segment. Hover a deliberate or payment figure for its ± range from random variation; small segments move a lot by chance. Baseline rate = expected cancellations per 1,000 a month. “Share of excess” is highlighted when a segment's share of the extra cancellations is well above its share of the sponsor base.
          Sep–Oct 2026 total for this view: {fmt(rows.reduce((a, r) => a + r.monthly[M_SEP26].reduce((x, y) => x + y, 0) + r.monthly[M_OCT26].reduce((x, y) => x + y, 0), 0))} cancellations.
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Monthly rate by {d.label.toLowerCase()}</h2>
            <p className="sub">
              Cancellations per 1,000 active, Jan 2025 – Oct 2026 · shared scale
              {dim === 'k' && ' · top 8 of 23 programs by excess'}
            </p>
          </div>
          <div className="legend">
            {GROUPS.slice(0, 2).map((g, gi) => <span key={g}><Dot c={GROUP_COLORS[gi]} />{GROUP_LABEL[g]}</span>)}
          </div>
        </div>
        <div className={`multiples n${Math.min(multiples.length, 4)}`}>
          {multiples.map((r) => (
            <MiniRate key={r.idx} title={r.label} sub={`${fmt(r.active)} active`} monthly={r.monthly} active={r.active} max={miniMax} />
          ))}
        </div>
      </section>
    </div>
  );
}
