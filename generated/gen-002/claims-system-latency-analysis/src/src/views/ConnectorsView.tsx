import { useMemo } from 'react';
import type { Dataset } from '../data/generate.ts';
import { CONNECTORS, MINUTES, M_POOL_CHANGE } from '../data/scenario.ts';
import { rangeConnector, rangeEndpoint } from '../data/stats.ts';
import { ConcurrencyChart } from '../components/ConcurrencyChart.tsx';
import { UtilScatter } from '../components/UtilScatter.tsx';
import { COLORS } from '../components/chartParts.tsx';
import { fmtInt, fmtMs, fmtPct, fmtX, hhmm, rangeLabel } from '../lib/format.ts';

export function ConnectorsView({ ds, sel }: { ds: Dataset; sel: [number, number] }) {
  const [m0, m1] = sel;
  const span = m1 - m0;
  const pad = Math.max(30, Math.round(span * 0.35));
  const d0 = Math.max(0, m0 - pad);
  const d1 = Math.min(MINUTES, m1 + pad);
  const cards = CONNECTORS.map((_, c) => rangeConnector(ds, c, m0, m1));
  const total = rangeEndpoint(ds, -1, m0, m1);
  const totalFailedConn = cards.reduce((a, c) => a + c.failed, 0);
  const highlight = useMemo<[number, number]>(() => [m0, m1], [m0, m1]);

  return (
    <div className="view connectors">
      <section className="card-row">
        {cards.map((c, i) => {
          const share = totalFailedConn ? c.failed / totalFailedConn : 0;
          const reqShare = total.total ? c.requests / (cards.reduce((a, x) => a + x.requests, 0) || 1) : 0;
          return (
            <article key={c.id} className={`card conn-card ${i === 1 ? 'conn-card-hot' : ''}`}>
              <div className="conn-head">
                <span className="conn-swatch" style={{ background: COLORS.conn[i] }} />
                <h3>{c.id}</h3>
                {share > 0.5 && <span className="badge badge-fail">{fmtPct(share, 0)} of failures</span>}
              </div>
              <dl className="metric-list">
                <div>
                  <dt>Mainframe-bound requests</dt>
                  <dd>{fmtInt(c.requests)} <span className="muted">({fmtPct(reqShare, 0)})</span></dd>
                </div>
                <div>
                  <dt>Failed</dt>
                  <dd className={c.failed ? 'bad' : ''}>
                    {fmtInt(c.failed)} <span className="muted">({fmtPct(c.requests ? c.failed / c.requests : 0, 1)})</span>
                  </dd>
                </div>
                <div>
                  <dt>Mean hold per transaction</dt>
                  <dd>{fmtMs(c.meanHold)}</dd>
                </div>
                <div>
                  <dt>Implied sessions, mean</dt>
                  <dd>{c.meanConc.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Implied sessions, peak</dt>
                  <dd className={c.peakUtil > 1 ? 'bad' : ''}>
                    {c.peakConc.toFixed(1)} <span className="muted">· {fmtX(c.peakUtil)} pool</span>
                  </dd>
                </div>
                <div>
                  <dt>Estimated queue wait, peak</dt>
                  <dd>{fmtMs(c.queueMax)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Implied concurrent sessions against the pool limit</h2>
            <p className="card-sub">
              Derived from traces, not read from the connector. Sessions = mainframe transactions per second × mean hold time.
              When the lines rise above the dashed pool limit, requests queue, and queued requests time out.
            </p>
          </div>
          <div className="range-pill">
            <span className="range-label">{rangeLabel(d0, d1)}</span>
          </div>
        </div>
        <ConcurrencyChart ds={ds} d0={d0} d1={d1} />
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Failure share against pool utilisation</h2>
              <p className="card-sub">
                Every connector-minute in the 72 hours. Bright points are inside the selected range. A failure-free point above 1.0 means the pool was full without timeouts.
              </p>
            </div>
          </div>
          <UtilScatter ds={ds} highlight={highlight} />
        </section>

        <section className="card notes-card">
          <h2>Reading the connector numbers</h2>
          <ul>
            <li>
              The connectors are not instrumented in these traces. Session counts are estimates from transaction rate and hold time,
              so treat them as shape, not exact pool occupancy.
            </li>
            <li>
              Pool limit was 40 per instance until {hhmm(M_POOL_CHANGE)} Monday, then 80 on all three instances. Demand after that point was about the same, so utilisation roughly halved.
            </li>
            <li>
              mf-conn-b runs hotter than a and c mainly because its hold time per transaction is longer ({fmtMs(cards[1].meanHold)} against {fmtMs(cards[0].meanHold)} and {fmtMs(cards[2].meanHold)}).
              Traffic is spread evenly across the three instances. The batch window is pinned to mf-conn-b (06:00–08:30), which adds to its load during that time.
            </li>
            <li>
              Queue wait is inferred from utilisation above 1.0. The traces show only the time spent at the mf-conn hop, which includes any wait for a pool slot.
            </li>
          </ul>
          <p className="card-sub">Selected range: {fmtInt(total.total)} requests across all endpoints.</p>
        </section>
      </div>
    </div>
  );
}
