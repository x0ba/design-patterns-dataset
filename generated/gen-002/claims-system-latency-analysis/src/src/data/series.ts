// Time-bucketed series for charts, and record lookups over the failed-request list.

import type { Dataset, Req } from './generate.ts';
import { CONNECTORS, ENDPOINT_INDEX, MIN_MS } from './scenario.ts';
import { histPercentile, NB } from './stats.ts';

export interface Series {
  /** bucket count */
  n: number;
  /** minutes per bucket */
  step: number;
  /** minute index at the start of each bucket */
  m: Float64Array;
  /** requests per minute, all endpoints */
  rpm: Float64Array;
  /** requests per minute by group */
  rpmCert: Float64Array;
  rpmClaims: Float64Array;
  rpmOther: Float64Array;
  /** failed requests in bucket (count) */
  failed: Float64Array;
  /** cert-submit requests and failures in bucket */
  certTotal: Float64Array;
  certFailed: Float64Array;
  /** cert-submit p95 (ms) in bucket */
  certP95: Float64Array;
  /** mean implied concurrency per connector (sessions) */
  conc: Float64Array; // n × 3
  /** pool limit in force (mean over bucket) */
  pool: Float64Array;
}

export function buildSeries(ds: Dataset, m0: number, m1: number, step: number): Series {
  const E = ds.endpoints.length;
  const C = CONNECTORS.length;
  const span = Math.max(1, m1 - m0);
  const n = Math.max(1, Math.ceil(span / step));
  const out: Series = {
    n,
    step,
    m: new Float64Array(n),
    rpm: new Float64Array(n),
    rpmCert: new Float64Array(n),
    rpmClaims: new Float64Array(n),
    rpmOther: new Float64Array(n),
    failed: new Float64Array(n),
    certTotal: new Float64Array(n),
    certFailed: new Float64Array(n),
    certP95: new Float64Array(n),
    conc: new Float64Array(n * C),
    pool: new Float64Array(n),
  };
  const certIdx = ENDPOINT_INDEX.cert;
  const claimsIdx = ENDPOINT_INDEX.claims;
  const certHist = new Float64Array(n * NB);
  for (let b = 0; b < n; b++) {
    const bm0 = m0 + b * step;
    const bm1 = Math.min(m1, bm0 + step);
    out.m[b] = bm0;
    const mins = Math.max(1, bm1 - bm0);
    let cnt = 0;
    for (let m = bm0; m < bm1; m++) {
      for (let e = 0; e < E; e++) {
        const v = ds.totalMe[m * E + e];
        cnt += v;
        if (e === certIdx) out.rpmCert[b] += v;
        else if (e === claimsIdx) out.rpmClaims[b] += v;
        else out.rpmOther[b] += v;
        out.failed[b] += ds.failMe[m * E + e];
        if (e === certIdx) {
          out.certTotal[b] += v;
          out.certFailed[b] += ds.failMe[m * E + e];
          const base = (m * E + e) * NB;
          for (let k = 0; k < NB; k++) certHist[b * NB + k] += ds.histMe[base + k];
        }
      }
      for (let c = 0; c < C; c++) {
        out.conc[b * C + c] += ds.concC[m * C + c];
      }
      out.pool[b] += ds.pool[m];
    }
    out.rpm[b] = cnt / mins;
    out.rpmCert[b] /= mins;
    out.rpmClaims[b] /= mins;
    out.rpmOther[b] /= mins;
    for (let c = 0; c < C; c++) out.conc[b * C + c] /= mins;
    out.pool[b] /= mins;
    out.certP95[b] = histPercentile(certHist.subarray(b * NB, b * NB + NB), 0.95);
  }
  return out;
}

/** Sorted by t already. Returns [lo, hi) indices of records with minute in [m0, m1). */
export function recordRange(failures: Req[], m0: number, m1: number): [number, number] {
  const lo = lowerBound(failures, m0 * MIN_MS);
  const hi = lowerBound(failures, m1 * MIN_MS);
  return [lo, hi];
}

function lowerBound(arr: Req[], t: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export interface FailureSummary {
  count: number;
  retried: number;
  byStatus: Record<number, number>;
  byConnector: number[];
}

export function summarizeFailures(failures: Req[], lo: number, hi: number): FailureSummary {
  const byConnector = [0, 0, 0];
  const byStatus: Record<number, number> = {};
  let retried = 0;
  for (let i = lo; i < hi; i++) {
    const f = failures[i];
    if (f.retried) retried++;
    byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
    if (f.route < 3) byConnector[f.route]++;
  }
  return { count: hi - lo, retried, byStatus, byConnector };
}
