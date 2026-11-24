import { useMemo, useState } from 'react';
import { GROUPS, GROUP_LABEL, WAVES, WAVE_SEND, WAVE_SHORT, fmtDay } from '../data';
import { COLORS, GROUP_COLORS, fmt, rate } from '../format';
import { Overview, Settings, WaveMetric, WEEK0, daily, waveWeekly } from '../model';
import { DailyChart, Dot, WaveChart } from '../components/charts';
import { PinButton, Segmented } from '../components/controls';
import { Finding, waveFinding } from '../findings';

export default function Timing({ s, ov, addNote }: { s: Settings; ov: Overview; addNote: (f: Finding) => void }) {
  const [metric, setMetric] = useState<WaveMetric>('price');
  const d = useMemo(() => daily(s, ov), [s, ov]);
  const w = useMemo(() => waveWeekly(s, metric), [s, metric]);

  const payPeak = d.days.reduce((best, x, j) => (x[1] > d.days[best][1] ? j : best), 0);
  const augPay = d.days.slice(0, 31).map((x) => x[1]).filter((v) => v > 0);
  const augMean = augPay.reduce((a, b) => a + b, 0) / Math.max(augPay.length, 1);
  const firstPayDay = d.days.findIndex((x, j) => j > 30 && x[1] > 2.5 * Math.max(augMean, 1) && (d.days[j + 1]?.[1] ?? 0) + (d.days[j + 3]?.[1] ?? 0) > 2.5 * Math.max(augMean, 1));
  const wk = Math.floor((WAVE_SEND[2] - WEEK0) / 7) - 1;
  const summer = [0, 1, 2].map((wv) => w.rates[wv].slice(0, 4).reduce((a, b) => a + b, 0) / 4);
  const unit = metric === 'price' ? 'PRICE-INCREASE cancellations per 10,000 sponsors in wave' : metric === 'deliberate' ? 'Deliberate cancellations per 10,000 sponsors in wave' : 'PAYMENT-FAILED-NO-RESPONSE lapses per 10,000 sponsors in wave';

  return (
    <div className="view">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Daily cancellations, Aug 1 – Oct 31, 2026</h2>
            <p className="sub">Stacked by cause · dashed line is the typical count for that weekday · hover a day for detail</p>
          </div>
          <div className="legend">
            {GROUPS.map((g, gi) => <span key={g}><Dot c={GROUP_COLORS[gi]} />{GROUP_LABEL[g]}</span>)}
            <span><span className="dash" />Typical day</span>
          </div>
        </div>
        <DailyChart days={d.days} expected={d.expected} start={d.start} height={270} />
        <div className="callouts">
          <div className="callout" style={{ borderColor: COLORS.deliberate }}>
            <b>Deliberate cancellations</b> rise in steps after each letter wave, with a second bump around five weeks later when the first $45 gift is charged.
          </div>
          <div className="callout" style={{ borderColor: COLORS.payment }}>
            <b>Payment lapses</b> {firstPayDay > 0 ? <>start climbing around {fmtDay(d.start + firstPayDay)}, about 30 days after the migration, when the grace period ran out.</> : <>follow the migration by about 30 days.</>}{' '}
            The busiest day was {fmtDay(d.start + payPeak)} with {fmt(d.days[payPeak][1])} lapses.
          </div>
          <div className="callout" style={{ borderColor: COLORS.program }}>
            <b>Sep 9–10:</b> one-off DUPLICATE-ADMIN batch that closed duplicate mandates the migration created. These are not real supporter losses.
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>The staggered letters as a natural experiment</h2>
            <p className="sub">Letters went out in three waves, so each wave is a comparison group for the others · weekly, Jul 6 – Oct 31</p>
          </div>
          <div className="row-gap">
            <Segmented size="sm" value={metric} onChange={setMetric} options={[
              { value: 'price', label: 'PRICE-INCREASE code' },
              { value: 'deliberate', label: 'All deliberate' },
              { value: 'payment', label: 'Payment lapses' },
            ]} />
            <PinButton onClick={() => addNote(waveFinding(s))} />
          </div>
        </div>
        <div className="wave-layout">
          <WaveChart rates={w.rates} counts={w.counts} sends={w.sends} unit={unit} height={270} />
          <aside className="wave-side">
            {WAVES.map((label, i) => (
              <div className="wave-key" key={i}>
                <span className="wave-swatch" style={{ background: COLORS.waves[i] }} />
                <div>
                  <b>{label}</b>
                  <div className="muted small">{fmt(w.act[i])} active sponsorships{i === 0 ? ' · random pilot' : i === 1 ? ' · billed 1st–15th' : ' · billed 16th–31st'}</div>
                </div>
              </div>
            ))}
            <div className="wave-read">
              {metric === 'payment' ? (
                <>All three waves rise <b>together</b> from mid-September, whatever their letter date. Payment lapses follow the migration, not the price letters.</>
              ) : (
                <>
                  In the week of {fmtDay(WEEK0 + wk * 7)}, {WAVE_SHORT[1]} (letter Aug 25) was at <b style={{ color: COLORS.waves[1] }}>{rate(w.rates[1][wk])}</b> per 10,000.{' '}
                  {WAVE_SHORT[2]}, not yet told, was at <b style={{ color: COLORS.waves[2] }}>{rate(w.rates[2][wk])}</b>, close to its summer level of {rate(summer[2])}.
                  Each wave rose only after <i>its own</i> letter, which points to the price increase itself as the cause.
                </>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
