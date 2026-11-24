import { useMemo } from 'react';
import { CHANNELS, FUNNEL, M_OCT26, M_SEP26, REASONS, TENURES } from '../data';
import { COLORS, fmt, pct, rate } from '../format';
import { Overview, Settings, lapseHeat } from '../model';
import { Dot, FailChart } from '../components/charts';
import { InfoTip, PinButton } from '../components/controls';
import { Finding, paymentFinding } from '../findings';

export default function Payments({ s, ov, addNote }: { s: Settings; ov: Overview; addNote: (f: Finding) => void }) {
  const heat = useMemo(() => lapseHeat(s), [s]);
  const heatMax = Math.max(...heat.flat().map((c) => c.rate), 0.1);
  const overlapTotal = ov.overlap[M_SEP26] + ov.overlap[M_OCT26];
  const overlapRows = REASONS.map((r, i) => ({ r, v: ov.overlapByReason[i] })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const F = FUNNEL;
  const outcome = [
    { label: 'Lapsed: no response to outreach', v: F.lapsed, c: COLORS.payment, note: `${fmt(F.lapsedAboveNormal)} above the normal ${fmt(F.lapsed - F.lapsedAboveNormal)}` },
    { label: 'Cancelled, gave another reason', v: F.otherReason, c: COLORS.deliberate, note: 'the overlap sponsors' },
    { label: 'Still open, at risk', v: F.open, c: '#8EA0D4', note: 'not yet cancelled' },
  ];
  const pipeline = [
    { label: 'In automatic retry', sub: 'failed < 21 days ago', v: F.retry, p: 0.55 },
    { label: 'Outreach in progress', sub: '21–45 days, calls and emails', v: F.outreach, p: 0.7 },
    { label: 'Past 45 days', sub: 'lapse processing in November', v: F.pending, p: 0.9 },
  ];
  const expectedLapse = pipeline.reduce((a, x) => a + x.v * x.p, 0);

  return (
    <div className="view">
      <div className="kpis">
        <div className="kpi"><div className="kpi-label">Failed card charges</div><div className="kpi-value">{fmt(F.charges)}</div><div className="kpi-sub">since the Aug 18 migration · vs ~{F.preWeekly}/wk before</div></div>
        <div className="kpi"><div className="kpi-label">Recovered</div><div className="kpi-value">{fmt(F.recovered)} <span className="delta neutral">{pct(F.recovered / F.charges)}</span></div><div className="kpi-sub">retry succeeded or card updated</div></div>
        <div className="kpi"><div className="kpi-label">Still unpaid</div><div className="kpi-value">{fmt(F.unrecovered)}</div><div className="kpi-sub">charges, on {fmt(F.sponsorships)} sponsorships</div></div>
        <div className="kpi"><div className="kpi-label">Lapsed above normal</div><div className="kpi-value">{fmt(F.lapsedAboveNormal)}</div><div className="kpi-sub">PAYMENT-FAILED-NO-RESPONSE, Sep–Oct</div></div>
        <div className="kpi warn"><div className="kpi-label">Still open</div><div className="kpi-value">{fmt(F.open)}</div><div className="kpi-sub">sponsorships at risk of lapsing</div></div>
      </div>

      <div className="grid-2 even">
        <section className="card flex-col">
          <div className="card-head">
            <div>
              <h2>Failed card charges by week</h2>
              <p className="sub">Jul 6 – Nov 15 · darker = still unpaid, lighter = recovered</p>
            </div>
            <span className="tag">Failed-charge feed · not filtered</span>
          </div>
          <FailChart />
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>What happened to the {fmt(F.sponsorships)} sponsorships with an unpaid charge</h2>
              <p className="sub">Status on Nov 15</p>
            </div>
            <PinButton onClick={() => addNote(paymentFinding())} />
          </div>
          <div className="outcome-bar">
            {outcome.map((o) => <div key={o.label} style={{ width: `${(o.v / F.sponsorships) * 100}%`, background: o.c }} title={`${o.label}: ${fmt(o.v)}`} />)}
          </div>
          <div className="outcome-list">
            {outcome.map((o) => (
              <div className="outcome" key={o.label}>
                <Dot c={o.c} /><span>{o.label}</span><b>{fmt(o.v)}</b><span className="muted small">{o.note}</span>
              </div>
            ))}
          </div>
          <h3 className="mini-h">Open cases ({fmt(F.open)})</h3>
          <div className="pipeline">
            {pipeline.map((x) => (
              <div className="pipe" key={x.label}>
                <div className="pipe-v">{fmt(x.v)}</div>
                <div className="pipe-l">{x.label}</div>
                <div className="muted small">{x.sub}</div>
              </div>
            ))}
          </div>
          <div className="outlook">
            <div className="outlook-head">
              <b>Outlook for Nov–Dec</b>
              <InfoTip text="Rough estimate: assumes 55% of retry cases, 70% of outreach cases and 90% of past-45-day cases lapse, based on recovery rates for the Aug 17–Sep 7 failure weeks." />
            </div>
            <p>
              About <b>{fmt(Math.round(expectedLapse / 50) * 50)}</b> more payment lapses are likely (range 1,000–1,300) unless they are recovered.
              Each extra 10 points of recovery on open cases keeps about <b>{fmt(Math.round((F.open * 0.1) / 10) * 10)}</b> sponsorships.
            </p>
          </div>
        </section>
      </div>

      <div className="grid-2 even">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Where payment lapses landed</h2>
              <p className="sub">Extra PAYMENT-FAILED-NO-RESPONSE lapses per 1,000 active per month, Sep–Oct · tenure × channel · follows filters</p>
            </div>
          </div>
          <table className="heat">
            <thead>
              <tr><th />{CHANNELS.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {TENURES.map((t, ti) => (
                <tr key={t}>
                  <th>{t}</th>
                  {CHANNELS.map((c, ci) => {
                    const cell = heat[ti][ci];
                    const a = Math.max(0, cell.rate) / heatMax;
                    return (
                      <td key={c} style={{ background: `rgba(62, 91, 169, ${0.06 + a * 0.85})`, color: a > 0.5 ? '#fff' : COLORS.ink }} title={`${t} · ${c}: ${fmt(cell.excess)} extra lapses on ${fmt(cell.active)} active`}>
                        <b>{rate(cell.rate)}</b>
                        <span>{fmt(Math.max(0, cell.excess))}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="foot-note">Card payers only: bank debit and check gifts did not go through the migrated processor. Digital-acquired sponsors pay by card most often, so they took most of the hit.</p>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>The overlap: failed card, then a deliberate reason</h2>
              <p className="sub">{fmt(overlapTotal)} sponsors in Sep–Oct · counted as {s.attribution === 'stated' ? 'their stated reason' : 'payment lapses'} (change at the top right)</p>
            </div>
          </div>
          <div className="overlap-list">
            {overlapRows.map((x) => (
              <div className="ol-row" key={x.r.code}>
                <span className="mono">{x.r.code}</span>
                <div className="ol-bar"><div style={{ width: `${(x.v / Math.max(overlapRows[0]?.v ?? 1, 1)) * 100}%` }} /></div>
                <b>{fmt(x.v)}</b>
                <span className="muted small">{pct(x.v / Math.max(overlapTotal, 1))}</span>
              </div>
            ))}
            {!overlapRows.length && <div className="empty">No overlap sponsors in this selection.</div>}
          </div>
          <p className="foot-note">
            Outreach for the failed charge reached these sponsors, and they used the call to cancel. Most cited the price.
            Without the failed charge some might have stayed, and the price increase might have prompted them anyway. The real answer is somewhere in between, so the brief should say which rule it uses.
          </p>
        </section>
      </div>
    </div>
  );
}
