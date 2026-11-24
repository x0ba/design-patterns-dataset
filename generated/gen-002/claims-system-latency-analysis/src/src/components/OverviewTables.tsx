// KPI strip and per-endpoint table for the selected range, with the pre-deploy baseline alongside.

import { useMemo } from 'react';
import type { Dataset, Req } from '../data/generate.ts';
import { rangeConnector, rangeEndpoint, type EndpointRange } from '../data/stats.ts';
import { summarizeFailures, recordRange } from '../data/series.ts';
import { ENDPOINT_INDEX, M_IDV_DEPLOY } from '../data/scenario.ts';
import { fmtInt, fmtMs, fmtPct, fmtX } from '../lib/format.ts';

export interface RangeStats {
  all: EndpointRange;
  cert: EndpointRange;
  perEndpoint: EndpointRange[];
  baselineP95: number[];
  retriedShare: number;
  failures: number;
  byStatus: Record<number, number>;
  connB: ReturnType<typeof rangeConnector>;
  peakReqPerMin: number;
}

export function useRangeStats(ds: Dataset, failures: Req[], m0: number, m1: number): RangeStats {
  return useMemo(() => {
    const all = rangeEndpoint(ds, -1, m0, m1);
    const perEndpoint = ds.endpoints.map((_, e) => rangeEndpoint(ds, e, m0, m1));
    const baselineP95 = ds.endpoints.map((_, e) => rangeEndpoint(ds, e, 0, M_IDV_DEPLOY).p95);
    const [lo, hi] = recordRange(failures, m0, m1);
    const sum = summarizeFailures(failures, lo, hi);
    let peakReq = 0;
    for (let m = m0; m < m1; m++) {
      let v = 0;
      for (let e = 0; e < ds.endpoints.length; e++) v += ds.totalMe[m * ds.endpoints.length + e];
      peakReq = Math.max(peakReq, v);
    }
    return {
      all,
      cert: perEndpoint[ENDPOINT_INDEX.cert],
      perEndpoint,
      baselineP95,
      retriedShare: sum.count ? sum.retried / sum.count : 0,
      failures: sum.count,
      byStatus: sum.byStatus,
      connB: rangeConnector(ds, 1, m0, m1),
      peakReqPerMin: peakReq,
    };
  }, [ds, failures, m0, m1]);
}

export function KpiStrip({ s, m0, m1, baselineCertP95 }: { s: RangeStats; m0: number; m1: number; baselineCertP95: number }) {
  const minutes = Math.max(1, m1 - m0);
  const p95 = s.cert.p95;
  const b = s.connB;
  const share504 = s.failures ? (s.byStatus[504] ?? 0) / s.failures : 0;
  return (
    <div className="kpis">
      <Kpi label="Requests in range" value={fmtInt(s.all.total)} sub={`${fmtInt(s.all.total / minutes)} per minute on average · peak ${fmtInt(s.peakReqPerMin)}/min`} />
      <Kpi label="Failed requests" value={fmtInt(s.all.failed)} tone="fail" sub={`${fmtPct(s.all.failRate, 2)} of requests · ${fmtPct(share504, 0)} were 504 gateway timeouts`} />
      <Kpi label="Cert-submit failure rate" value={fmtPct(s.cert.failRate, 1)} tone="fail" sub={`${fmtInt(s.cert.failed)} of ${fmtInt(s.cert.total)} weekly certifications`} />
      <Kpi label="Cert-submit p95" value={fmtMs(p95)} tone={p95 > baselineCertP95 * 2 ? 'fail' : undefined} sub={`baseline ${fmtMs(baselineCertP95)} · ${fmtX(p95 / baselineCertP95)} baseline`} />
      <Kpi
        label="mf-conn-b, implied peak"
        value={`${Math.round(b.peakConc)} sessions`}
        tone={b.peakUtil > 1 ? 'fail' : undefined}
        sub={`${fmtX(b.peakUtil)} of the pool limit in force at that minute · ${fmtPct(b.failed / Math.max(1, s.all.failed), 0)} of failures`}
      />
      <Kpi label="Failed requests retried" value={fmtPct(s.retriedShare, 0)} sub="user pressed Try again or resubmitted" />
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'fail' }) {
  return (
    <div className={`kpi ${tone ? `kpi-${tone}` : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

export function EndpointTable({ ds, s }: { ds: Dataset; s: RangeStats }) {
  const rows = ds.endpoints.map((ep, e) => ({ ep, r: s.perEndpoint[e], base: s.baselineP95[e] }));
  return (
    <table className="data-table endpoint-table">
      <thead>
        <tr>
          <th>Endpoint</th>
          <th className="num">Requests</th>
          <th className="num">Failed</th>
          <th className="num">Fail rate</th>
          <th className="num">p50</th>
          <th className="num">p95</th>
          <th className="num">p99</th>
          <th className="num">Baseline p95</th>
          <th className="num">p95 vs baseline</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ ep, r, base }) => (
          <tr key={ep.id} className={ep.id === 'cert' ? 'row-focus' : undefined}>
            <td>
              <div className="ep-name">{ep.label}</div>
              <div className="ep-path">
                {ep.method} {ep.path}
              </div>
            </td>
            <td className="num">{fmtInt(r.total)}</td>
            <td className="num">{fmtInt(r.failed)}</td>
            <td className={`num ${r.failRate >= 0.02 ? 'bad' : ''}`}>{fmtPct(r.failRate, 2)}</td>
            <td className="num">{fmtMs(r.p50)}</td>
            <td className="num">{fmtMs(r.p95)}</td>
            <td className="num">{fmtMs(r.p99)}</td>
            <td className="num muted">{fmtMs(base)}</td>
            <td className={`num ${r.p95 / base >= 2 ? 'bad' : ''}`}>{fmtX(r.p95 / base)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>All endpoints</td>
          <td className="num">{fmtInt(s.all.total)}</td>
          <td className="num">{fmtInt(s.all.failed)}</td>
          <td className="num">{fmtPct(s.all.failRate, 2)}</td>
          <td className="num">{fmtMs(s.all.p50)}</td>
          <td className="num">{fmtMs(s.all.p95)}</td>
          <td className="num">{fmtMs(s.all.p99)}</td>
          <td className="num muted">–</td>
          <td className="num">–</td>
        </tr>
      </tfoot>
    </table>
  );
}
