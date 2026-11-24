import { Fragment } from 'react';
import { FUNNEL, GROUPS, GROUP_HINT, GROUP_LABEL, M_AUG26, M_OCT26, M_SEP26, REASONS } from '../data';
import { COLORS, GROUP_COLORS, fmt, fmtSigned, pct, pctSigned } from '../format';
import { Attribution, Overview, Settings, baselineLabel, baselineShort } from '../model';
import { Dot, MonthlyChart, Sparkline, SplitBar } from '../components/charts';
import { InfoTip, PinButton } from '../components/controls';
import { Finding, driversFinding, overlapFinding, seasonFinding, splitShares, topReasons } from '../findings';

interface Props {
  s: Settings; ov: Overview;
  setReason: (r: number | null) => void;
  setAttribution: (a: Attribution) => void;
  addNote: (f: Finding) => void;
  goSegments: () => void;
}

export default function Drivers({ s, ov, setReason, setAttribution, addNote, goSegments }: Props) {
  const exp = (m: number) => ov.expG(0, m) + ov.expG(1, m) + ov.expG(2, m);
  const shares = splitShares(ov);
  const overlapN = ov.overlap[M_SEP26] + ov.overlap[M_OCT26];
  const hasExcess = ov.excessTotal > 0.5;

  const kpis = [
    { label: 'September 2026', value: fmt(ov.total[M_SEP26]), delta: (ov.total[M_SEP26] - exp(M_SEP26)) / exp(M_SEP26), sub: `vs ${fmt(exp(M_SEP26))} baseline` },
    { label: 'October 2026', value: fmt(ov.total[M_OCT26]), delta: (ov.total[M_OCT26] - exp(M_OCT26)) / exp(M_OCT26), sub: `vs ${fmt(exp(M_OCT26))} baseline` },
    { label: 'Excess, Sep + Oct', value: fmtSigned(ov.excessTotal), sub: `above ${baselineShort(s.baseline)}` },
    { label: 'Oct cancellation rate', value: `${((ov.total[M_OCT26] / Math.max(ov.active, 1)) * 100).toFixed(2)}%`, sub: `of ${fmt(ov.active)} active · baseline ${((exp(M_OCT26) / Math.max(ov.active, 1)) * 100).toFixed(2)}%` },
    { label: 'Still at risk', value: fmt(FUNNEL.open), sub: 'sponsorships with an unpaid failed charge', fixed: true },
  ];

  const groupRows = GROUPS.map((g, gi) => ({ g, gi, reasons: REASONS.map((r, i) => ({ r, i })).filter((x) => x.r.group === g) }));
  const maxShare = Math.max(...ov.excessR.map((e) => Math.max(0, e)), 1);

  return (
    <div className="view">
      <div className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">{k.label}{k.fixed && <InfoTip text="From the failed-charge feed, Nov 15. Not affected by segment filters." />}</div>
            <div className="kpi-value">
              {k.value}
              {k.delta !== undefined && <span className={`delta ${k.delta > 0 ? 'up' : 'down'}`}>{pctSigned(k.delta)}</span>}
            </div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <section className="card answer">
          <div className="card-head">
            <div>
              <h2>Where the extra cancellations came from</h2>
              <p className="sub">Sep + Oct 2026 minus the {baselineLabel(s.baseline)}</p>
            </div>
            <PinButton onClick={() => addNote(driversFinding(s, ov))} />
          </div>
          {hasExcess ? (
            <>
              <div className="big-number">{fmt(ov.excessTotal)} <span>more cancellations than usual</span></div>
              <SplitBar values={ov.excessG} height={30} showLabels />
              <div className="answer-rows">
                {GROUPS.map((g, gi) => {
                  const top = topReasons(ov, g, 3);
                  return (
                    <div className="answer-row" key={g}>
                      <div className="ar-head" title={GROUP_HINT[g]}>
                        <Dot c={GROUP_COLORS[gi]} />
                        <b>{GROUP_LABEL[g]}</b>
                        <span className="ar-num">{fmtSigned(ov.excessG[gi])}</span>
                        <span className="ar-pct">{pct(shares[gi])}</span>
                      </div>
                      <div className="ar-reasons">
                        {top.length ? top.map((x) => (
                          <button key={x.r.code} className="reason-pill" onClick={() => setReason(x.i)} title={`Filter to ${x.r.code}`}>
                            <span className="mono">{x.r.code}</span> {fmtSigned(x.e)}
                          </button>
                        )) : <span className="muted small">No reason codes above baseline</span>}
                        {gi === 1 && s.attribution === 'payment' && ov.reassigned[M_SEP26] + ov.reassigned[M_OCT26] > 0 && (
                          <span className="reason-pill ghost">+{fmt(ov.reassigned[M_SEP26] + ov.reassigned[M_OCT26])} reassigned overlap</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty">This selection is not above its baseline in Sep–Oct ({fmtSigned(ov.excessTotal)}).</div>
          )}
          {overlapN > 0 && (
            <div className="overlap">
              <div>
                <b>{fmt(overlapN)} sponsors are in both buckets.</b> Their card failed after Aug 18, then they cancelled giving a deliberate reason.
                They are currently counted as <b>{s.attribution === 'stated' ? 'their stated reason' : 'payment lapses'}</b>.
              </div>
              <div className="overlap-actions">
                <button className="btn-sm" onClick={() => setAttribution(s.attribution === 'stated' ? 'payment' : 'stated')}>
                  Count as {s.attribution === 'stated' ? 'payment lapse' : 'stated reason'}
                </button>
                <button className="link small" onClick={() => addNote(overlapFinding(ov, s))}>Add as open question</button>
              </div>
            </div>
          )}
        </section>

        <section className="card flex-col">
          <div className="card-head">
            <div>
              <h2>Monthly cancellations by cause</h2>
              <p className="sub">Jan 2025 – Oct 2026 · hover a month for detail</p>
            </div>
            <div className="legend">
              {GROUPS.map((g, gi) => <span key={g}><Dot c={GROUP_COLORS[gi]} />{GROUP_LABEL[g]}</span>)}
              <span><span className="dash" />Baseline</span>
            </div>
          </div>
          <MonthlyChart ov={ov} baselineMode={s.baseline} />
          <div className="chart-foot">
            <span>Sep–Oct 2025: <b>{fmt(ov.total[8])}</b> and <b>{fmt(ov.total[9])}</b>. No seasonal jump last year.</span>
            <button className="link small" onClick={() => addNote(seasonFinding(ov, s))}>Add to brief</button>
            <span className="spacer" />
            <button className="link small" onClick={goSegments}>Compare tenure bands →</button>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Reason codes</h2>
            <p className="sub">Click a code to filter every view to it · baseline = {baselineLabel(s.baseline)}</p>
          </div>
          {s.filters.reason !== null && <button className="btn-sm" onClick={() => setReason(null)}>Show all reasons</button>}
        </div>
        <table className="table reasons">
          <thead>
            <tr>
              <th style={{ width: 300 }}>Reason</th>
              <th>Jan 2025 – Oct 2026</th>
              <th className="num">Baseline /mo</th>
              <th className="num">Aug 26</th>
              <th className="num">Sep 26</th>
              <th className="num">Oct 26</th>
              <th className="num">Excess Sep–Oct</th>
              <th className="num">vs baseline</th>
              <th style={{ width: 170 }}>Share of excess</th>
            </tr>
          </thead>
          <tbody>
            {groupRows.map(({ g, gi, reasons }) => {
              const sum = (m: number) => reasons.reduce((a, x) => a + ov.mr[x.i][m], 0);
              const base = reasons.reduce((a, x) => a + ov.expR(x.i, M_SEP26) + ov.expR(x.i, M_OCT26), 0) / 2;
              const ex = reasons.reduce((a, x) => a + ov.excessR[x.i], 0);
              const re = ov.reassigned[M_SEP26] + ov.reassigned[M_OCT26];
              return (
                <Fragment key={g}>
                  <tr className="group-row">
                    <td><Dot c={GROUP_COLORS[gi]} /><b>{GROUP_LABEL[g]}</b></td>
                    <td />
                    <td className="num">{fmt(base)}</td>
                    <td className="num">{fmt(sum(M_AUG26))}</td>
                    <td className="num">{fmt(sum(M_SEP26))}</td>
                    <td className="num">{fmt(sum(M_OCT26))}</td>
                    <td className="num"><b>{fmtSigned(ex)}</b></td>
                    <td className="num">{base > 0 ? pctSigned(ex / (base * 2)) : '–'}</td>
                    <td />
                  </tr>
                  {reasons.map(({ r, i }) => {
                    const b = (ov.expR(i, M_SEP26) + ov.expR(i, M_OCT26)) / 2;
                    const e = ov.excessR[i];
                    const sel = s.filters.reason === i;
                    const dim = s.filters.reason !== null && !sel;
                    return (
                      <tr key={r.code} className={`click ${sel ? 'sel' : ''} ${dim ? 'dim' : ''}`} onClick={() => setReason(sel ? null : i)}>
                        <td>
                          <div className="reason-cell">
                            <span className="mono code">{r.code}</span>
                            <span className="muted small">{r.label}</span>
                          </div>
                        </td>
                        <td><Sparkline series={ov.mr[i]} color={GROUP_COLORS[gi]} /></td>
                        <td className="num muted">{fmt(b)}</td>
                        <td className="num">{fmt(ov.mr[i][M_AUG26])}</td>
                        <td className="num">{fmt(ov.mr[i][M_SEP26])}</td>
                        <td className="num">{fmt(ov.mr[i][M_OCT26])}</td>
                        <td className={`num ${Math.abs(e) >= 40 ? 'strong' : ''}`}>{fmtSigned(e)}</td>
                        <td className={`num ${e / Math.max(b * 2, 1) > 0.25 ? 'hot' : ''}`}>{b > 0 ? pctSigned(e / (b * 2)) : '–'}</td>
                        <td>
                          {e > 0 && ov.excessTotal > 0 && (
                            <div className="share">
                              <div className="share-bar"><div style={{ width: `${(e / maxShare) * 100}%`, background: GROUP_COLORS[gi] }} /></div>
                              <span>{pct(e / ov.excessTotal)}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {s.attribution === 'payment' && re > 0 && gi < 2 && (
                    <tr className="adjust-row">
                      <td colSpan={6}>
                        <span className="muted">{gi === 0 ? 'Moved to payment lapse: failed card, then gave a deliberate reason' : 'Moved in from deliberate: failed card, then gave a deliberate reason'}</span>
                      </td>
                      <td className="num" style={{ color: gi === 0 ? COLORS.deliberate : COLORS.payment }}>{gi === 0 ? `−${fmt(re)}` : `+${fmt(re)}`}</td>
                      <td colSpan={2} />
                    </tr>
                  )}
                </Fragment>
              );
            })}
            <tr className="total-row">
              <td><b>All reasons</b></td>
              <td />
              <td className="num">{fmt((exp(M_SEP26) + exp(M_OCT26)) / 2)}</td>
              <td className="num">{fmt(ov.total[M_AUG26])}</td>
              <td className="num">{fmt(ov.total[M_SEP26])}</td>
              <td className="num">{fmt(ov.total[M_OCT26])}</td>
              <td className="num"><b>{fmtSigned(ov.excessTotal)}</b></td>
              <td className="num">{pctSigned(ov.excessTotal / Math.max(exp(M_SEP26) + exp(M_OCT26), 1))}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
