// Changes and checks. Each check compares two windows of traces that differ by one change, and
// reports what the numbers show. The windows are observational: volume and batch timing also moved.

import { useMemo } from 'react';
import type { Dataset, Req } from '../data/generate.ts';
import {
  CHANGE_LOG,
  ENDPOINT_INDEX,
  M_BATCH_END,
  M_HOTFIX,
  M_IDV_DEPLOY,
  M_POOL_CHANGE,
  M_WINDOW_END,
  M_WINDOW_START,
  MINUTES,
  POOL_AFTER,
} from '../data/scenario.ts';
import { rangeEndpoint, rangeConnector } from '../data/stats.ts';
import { recordRange, summarizeFailures } from '../data/series.ts';
import { clock, fmtInt, fmtMs, fmtPct, fmtX, hhmm } from '../lib/format.ts';
import { linScale } from '../lib/chart.ts';
import { COLORS } from '../components/chartParts.tsx';

const SAT_0600 = [0, 360] as const;
const MON_0600 = [2880, 3240] as const;

export function ChangesView({ ds, failures, samples }: { ds: Dataset; failures: Req[]; samples: Req[] }) {
  const cert = ENDPOINT_INDEX.cert;
  const idv = ENDPOINT_INDEX.idv;

  const facts = useMemo(() => {
    const satCert = rangeEndpoint(ds, cert, ...SAT_0600);
    const monCert = rangeEndpoint(ds, cert, ...MON_0600);
    const satIdv = rangeEndpoint(ds, idv, ...SAT_0600);
    const monIdv = rangeEndpoint(ds, idv, ...MON_0600);

    // mainframe hops per cert submission, from sampled traces
    const hopMean = (pred: (m: number) => boolean) => {
      let n = 0;
      let hops = 0;
      for (const s of samples) {
        if (s.endpoint !== cert || !pred(s.m)) continue;
        n++;
        hops += s.spans.filter((sp) => sp.kind === 'mf').length;
      }
      return { n, mean: n ? hops / n : 0 };
    };
    const hopsPre = hopMean((m) => m < M_IDV_DEPLOY);
    const hopsPost = hopMean((m) => m >= M_IDV_DEPLOY);

    // hourly mean hops per cert sample, 72 entries
    const hourly = new Array<number>(72).fill(0);
    const hourlyN = new Array<number>(72).fill(0);
    for (const s of samples) {
      if (s.endpoint !== cert) continue;
      const h = Math.floor(s.m / 60);
      hourly[h] += s.spans.filter((sp) => sp.kind === 'mf').length;
      hourlyN[h]++;
    }
    const hourlyMean = hourly.map((v, i) => (hourlyN[i] ? v / hourlyN[i] : 0));

    // Pool change: utilisation and cert failure with pool 40 in the surge vs pool 80 after.
    const pool40 = rangeEndpoint(ds, cert, M_WINDOW_START, M_POOL_CHANGE);
    const pool80 = rangeEndpoint(ds, cert, M_POOL_CHANGE, M_WINDOW_END);
    const bPool40 = rangeConnector(ds, 1, M_WINDOW_START, M_POOL_CHANGE);
    const bPool80 = rangeConnector(ds, 1, M_POOL_CHANGE, M_WINDOW_END);

    // Connector-minutes at or above full pool, by pool size.
    const C = 3;
    let fullAt40 = 0;
    let failsAt40 = 0;
    let reqsAt40 = 0;
    let fullAt80 = 0;
    for (let m = M_WINDOW_START; m < M_WINDOW_END; m++) {
      for (let c = 0; c < C; c++) {
        const i = m * C + c;
        const u = ds.concC[i] / ds.pool[m];
        if (u >= 1) {
          fullAt40 += ds.pool[m] === 40 ? 1 : 0;
          if (ds.pool[m] === 40) {
            failsAt40 += ds.failC[i];
            reqsAt40 += ds.reqC[i];
          }
        }
      }
    }
    for (let m = M_POOL_CHANGE; m < MINUTES; m++) {
      for (let c = 0; c < C; c++) {
        if (ds.concC[m * C + c] / ds.pool[m] >= 1 && ds.pool[m] === POOL_AFTER) fullAt80++;
      }
    }

    // Claims-web hotfix: retry behaviour and cert failure before and after 09:20.
    const [lo1, hi1] = recordRange(failures, M_BATCH_END, M_HOTFIX);
    const [lo2, hi2] = recordRange(failures, M_HOTFIX, M_POOL_CHANGE);
    const before = summarizeFailures(failures, lo1, hi1);
    const after = summarizeFailures(failures, lo2, hi2);
    const certBefore = rangeEndpoint(ds, cert, M_BATCH_END, M_HOTFIX);
    const certAfter = rangeEndpoint(ds, cert, M_HOTFIX, M_POOL_CHANGE);
    const volBefore = certBefore.total / (M_HOTFIX - M_BATCH_END);
    const volAfter = certAfter.total / (M_POOL_CHANGE - M_HOTFIX);

    // Rough counterfactual: utilisation at peak without the deploy's extra mainframe transactions,
    // holding hold time fixed. Extra transactions ≈ 2 per cert and per identity-verify request.
    let peakActual = 0;
    let peakNoDeploy = 0;
    for (let m = M_WINDOW_START; m < M_WINDOW_END; m++) {
      const E = ds.endpoints.length;
      let calls = 0;
      for (let c = 0; c < 3; c++) calls += ds.callsC[m * 3 + c];
      const extra = m >= M_IDV_DEPLOY ? 2 * (ds.totalMe[m * E + cert] + ds.totalMe[m * E + idv]) : 0;
      // per connector: the extra transactions are assumed to spread like the rest of the traffic
      for (let c = 0; c < 3; c++) {
        const u = ds.concC[m * 3 + c] / ds.pool[m];
        const uCf = calls ? u * (1 - extra / calls) : 0;
        if (c === 1) {
          peakActual = Math.max(peakActual, u);
          peakNoDeploy = Math.max(peakNoDeploy, uCf);
        }
      }
    }

    const utilBefore = rangeConnector(ds, 1, M_BATCH_END, M_HOTFIX).meanUtil;
    const utilAfter = rangeConnector(ds, 1, M_HOTFIX, M_POOL_CHANGE).meanUtil;

    return {
      utilBefore,
      utilAfter,
      satCert,
      monCert,
      satIdv,
      monIdv,
      hopsPre,
      hopsPost,
      hourlyMean,
      pool40,
      pool80,
      bPool40,
      bPool80,
      fullAt40,
      failsAt40,
      reqsAt40,
      fullAt80,
      before,
      after,
      certBefore,
      certAfter,
      volBefore,
      volAfter,
      peakActual,
      peakNoDeploy,
    };
  }, [ds, failures, samples, cert, idv]);

  const f = facts;
  const retriedBefore = f.before.count ? f.before.retried / f.before.count : 0;
  const retriedAfter = f.after.count ? f.after.retried / f.after.count : 0;

  return (
    <div className="view changes">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Change log, Sun 15 – Mon 16 Nov</h2>
            <p className="card-sub">Deploys, configuration and the external event that drove volume. Times are local.</p>
          </div>
        </div>
        <table className="data-table change-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Change</th>
              <th>What changed</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {[...CHANGE_LOG]
              .sort((a, b) => a.at - b.at)
              .map((e) => (
                <tr key={e.id}>
                  <td className="nowrap">
                    {clock(e.at)}
                    {e.end !== undefined && <span className="muted"> – {hhmm(e.end)}</span>}
                  </td>
                  <td>
                    <span className={`kind kind-${e.kind}`}>{e.kind}</span> <b>{e.title}</b>
                  </td>
                  <td className="wrap">{e.detail}</td>
                  <td className="nowrap muted">{e.owner}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Checks against the traces</h2>
            <p className="card-sub">
              Each check compares two windows that differ mainly by one change. Volume and the batch window also moved, so these show association, not proof.
            </p>
          </div>
        </div>
        <table className="data-table checks-table">
          <thead>
            <tr>
              <th>Check</th>
              <th>Before</th>
              <th>After</th>
              <th>Reading</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="check-title">1. Identity-verify v4.12, quiet hours</div>
                <div className="muted small">Sat 00:00–06:00 vs Mon 00:00–06:00. Similar volume, both before the surge.</div>
              </td>
              <td>
                cert p95 <b>{fmtMs(f.satCert.p95)}</b>, fail {fmtPct(f.satCert.failRate, 2)}
                <br />
                identity-verify p95 <b>{fmtMs(f.satIdv.p95)}</b>
              </td>
              <td>
                cert p95 <b>{fmtMs(f.monCert.p95)}</b>, fail {fmtPct(f.monCert.failRate, 2)}
                <br />
                identity-verify p95 <b>{fmtMs(f.monIdv.p95)}</b>
              </td>
              <td>
                The deploy roughly {fmtX(f.monCert.p95 / f.satCert.p95)} cert latency and {fmtX(f.monIdv.p95 / f.satIdv.p95)} identity-verify latency at normal volume.
                Timeouts barely moved. On its own, the deploy did not produce timeouts at this volume.
              </td>
            </tr>
            <tr>
              <td>
                <div className="check-title">2. Mainframe hops per cert submission</div>
                <div className="muted small">From sampled cert-submit traces. Each hop is one visit to an mf-conn instance.</div>
              </td>
              <td>
                <b>{f.hopsPre.mean.toFixed(2)}</b> hops
                <div className="muted small">n = {fmtInt(f.hopsPre.n)} sampled traces</div>
              </td>
              <td>
                <b>{f.hopsPost.mean.toFixed(2)}</b> hops
                <div className="muted small">n = {fmtInt(f.hopsPost.n)} sampled traces</div>
              </td>
              <td>
                The traces show the step at Sun 23:05. The identity match now calls wage-lookup, which adds a mainframe hop for every certification.
              </td>
            </tr>
            <tr>
              <td>
                <div className="check-title">3. Pool full, before the change</div>
                <div className="muted small">Mon 08:10–10:38, pool 40. Connector-minutes at or above pool limit.</div>
              </td>
              <td>
                <b>{fmtInt(f.fullAt40)}</b> connector-minutes at ≥ 100% of pool
                <br />
                cert fail <b>{fmtPct(f.pool40.failRate, 1)}</b> · mf-conn-b mean use {fmtX(f.bPool40.meanUtil)}
              </td>
              <td>
                Mon 10:38 onward, pool 80: <b>{fmtInt(f.fullAt80)}</b> connector-minutes at ≥ 100%
                <br />
                cert fail <b>{fmtPct(f.pool80.failRate, 2)}</b> · mf-conn-b mean use {fmtX(f.bPool80.meanUtil)}
              </td>
              <td>
                Connector-minutes at or above full pool went from {fmtInt(f.fullAt40)} to {fmtInt(f.fullAt80)}, and cert failures fell from {fmtPct(f.pool40.failRate, 1)} to {fmtPct(f.pool80.failRate, 2)}. Surge volume was still at its plateau when the pool changed, so the pool change is the most direct explanation in the traces.
              </td>
            </tr>
            <tr>
              <td>
                <div className="check-title">4. claims-web hotfix at 09:20</div>
                <div className="muted small">08:30–09:20 vs 09:20–10:38. Per-minute cert volume was similar.</div>
              </td>
              <td>
                retried <b>{fmtPct(retriedBefore, 0)}</b> of {fmtInt(f.before.count)} failed requests
                <br />
                cert fail <b>{fmtPct(f.certBefore.failRate, 1)}</b>, {fmtInt(f.volBefore)}/min
              </td>
              <td>
                retried <b>{fmtPct(retriedAfter, 0)}</b> of {fmtInt(f.after.count)} failed requests
                <br />
                cert fail <b>{fmtPct(f.certAfter.failRate, 1)}</b>, {fmtInt(f.volAfter)}/min
              </td>
              <td>
                Retries rose after the hotfix, which changed the error panel to offer Try again after 30 seconds. Failures rose over the same stretch as connector use edged up ({f.utilBefore.toFixed(2)} → {f.utilAfter.toFixed(2)}). The change is small next to the pool effect, but it is inside the window.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Mainframe hops per cert submission, hour by hour</h2>
              <p className="card-sub">Mean over sampled cert-submit traces in each hour, 72 hours.</p>
            </div>
          </div>
          <HopsChart values={f.hourlyMean} />
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Rough counterfactual for the deploy</h2>
              <p className="card-sub">First-order estimate for the peak of the window. Not a model fit.</p>
            </div>
          </div>
          <dl className="metric-list">
            <div>
              <dt>mf-conn-b peak utilisation, as recorded</dt>
              <dd className={f.peakActual > 1 ? 'bad' : ''}>{fmtX(f.peakActual)} of pool</dd>
            </div>
            <div>
              <dt>Same volume without the extra mainframe transactions</dt>
              <dd className={f.peakNoDeploy > 1 ? 'bad' : ''}>{fmtX(f.peakNoDeploy)} of pool</dd>
            </div>
          </dl>
          <p className="small">
            The estimate removes the two extra mainframe transactions per certification and per identity check, and holds hold time fixed. If the second number is still above 1.0 the deploy was not needed to exhaust the pool; if it is below 1.0, the deploy was needed to exhaust it at this volume.
          </p>
          <p className="small muted">
            Batch was active until 08:30 and mf-conn-b hold time was elevated during it. This counterfactual does not include that.
          </p>
        </section>
      </div>
    </div>
  );
}

function HopsChart({ values }: { values: number[] }) {
  const W = 620;
  const H = 180;
  const L = 36;
  const B = 26;
  const ys = linScale(0, 2.6, H - B, 10);
  const bw = (W - L - 6) / values.length;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mean mainframe hops per cert submission by hour">
      {[0, 1, 2].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - 6} y1={ys(v)} y2={ys(v)} stroke={COLORS.grid} />
          <text x={L - 6} y={ys(v) + 3.5} textAnchor="end" fontSize={10.5} fill={COLORS.muted}>
            {v}
          </text>
        </g>
      ))}
      {values.map((v, i) => (
        <rect
          key={i}
          x={L + i * bw + 0.5}
          y={ys(v)}
          width={Math.max(1, bw - 1)}
          height={Math.max(0, H - B - ys(v))}
          fill={i * 60 >= M_IDV_DEPLOY ? COLORS.amber : COLORS.other}
          opacity={0.9}
        />
      ))}
      {[0, 24, 48, 72].map((h) => (
        <text key={h} x={L + h * bw} y={H - 8} fontSize={10.5} fill={COLORS.muted} textAnchor={h === 0 ? 'start' : h === 72 ? 'end' : 'middle'}>
          {h === 0 ? 'Sat 00:00' : h === 24 ? 'Sun' : h === 48 ? 'Mon' : 'Mon 24:00'}
        </text>
      ))}
      <text x={L + ((M_IDV_DEPLOY / 60) * bw) + 4} y={16} fontSize={10.5} fill={COLORS.amber} fontWeight={600}>
        identity-verify v4.12, Sun 23:05
      </text>
    </svg>
  );
}

