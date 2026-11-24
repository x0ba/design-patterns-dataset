// Pure aggregation over the dataset for any [m0, m1) minute range. Percentiles are read from
// merged latency histograms, the same way a metrics backend would answer them.

import { BUCKET_EDGES_MS, CONNECTORS, NUM_BUCKETS, TIMEOUT_BUCKET } from './scenario.ts';
import type { Dataset } from './generate.ts';

export const NB = NUM_BUCKETS;

/** Percentile (ms) from histogram counts, linear within the bucket. */
export function histPercentile(counts: ArrayLike<number>, q: number): number {
  let total = 0;
  for (let b = 0; b < NB; b++) total += counts[b];
  if (total === 0) return 0;
  const target = q * total;
  let cum = 0;
  for (let b = 0; b < NB; b++) {
    const c = counts[b];
    if (c === 0) continue;
    if (cum + c >= target) {
      const lo = BUCKET_EDGES_MS[b];
      const hi = BUCKET_EDGES_MS[b + 1];
      const frac = (target - cum) / c;
      return lo + (hi - lo) * frac;
    }
    cum += c;
  }
  return BUCKET_EDGES_MS[NB];
}

export function histMean(counts: ArrayLike<number>): number {
  let total = 0;
  let sum = 0;
  for (let b = 0; b < NB; b++) {
    const mid = (BUCKET_EDGES_MS[b] + BUCKET_EDGES_MS[b + 1]) / 2;
    total += counts[b];
    sum += counts[b] * mid;
  }
  return total ? sum / total : 0;
}

export interface EndpointRange {
  total: number;
  failed: number;
  mfCalls: number;
  hist: Float64Array;
  p50: number;
  p95: number;
  p99: number;
  failRate: number;
}

/** Aggregate one endpoint (index e) or all endpoints (e = -1) across minutes [m0, m1). */
export function rangeEndpoint(ds: Dataset, e: number, m0: number, m1: number): EndpointRange {
  const E = ds.endpoints.length;
  const hist = new Float64Array(NB);
  let total = 0;
  let failed = 0;
  let mfCalls = 0;
  const eFrom = e < 0 ? 0 : e;
  const eTo = e < 0 ? E : e + 1;
  for (let m = m0; m < m1; m++) {
    for (let ei = eFrom; ei < eTo; ei++) {
      const i = m * E + ei;
      total += ds.totalMe[i];
      failed += ds.failMe[i];
      mfCalls += ds.mfCallsMe[i] * ds.totalMe[i];
      const base = i * NB;
      for (let b = 0; b < NB; b++) hist[b] += ds.histMe[base + b];
    }
  }
  return {
    total,
    failed,
    mfCalls,
    hist,
    p50: histPercentile(hist, 0.5),
    p95: histPercentile(hist, 0.95),
    p99: histPercentile(hist, 0.99),
    failRate: total ? failed / total : 0,
  };
}

/** Per-minute p95 for an endpoint, computed from that minute's histogram. */
export function minuteP95(ds: Dataset, e: number, m: number): number {
  const E = ds.endpoints.length;
  const hist = new Float64Array(NB);
  const eFrom = e < 0 ? 0 : e;
  const eTo = e < 0 ? E : e + 1;
  for (let ei = eFrom; ei < eTo; ei++) {
    const base = (m * E + ei) * NB;
    for (let b = 0; b < NB; b++) hist[b] += ds.histMe[base + b];
  }
  return histPercentile(hist, 0.95);
}

export interface ConnectorRange {
  id: string;
  requests: number;
  failed: number;
  calls: number;
  meanHold: number;
  meanConc: number;
  peakConc: number;
  peakUtil: number;
  meanUtil: number;
  queueMax: number;
}

export function rangeConnector(ds: Dataset, c: number, m0: number, m1: number): ConnectorRange {
  const C = CONNECTORS.length;
  let requests = 0;
  let failed = 0;
  let calls = 0;
  let holdSum = 0;
  let concSum = 0;
  let peakConc = 0;
  let peakUtil = 0;
  let utilSum = 0;
  let queueMax = 0;
  let n = 0;
  for (let m = m0; m < m1; m++) {
    const i = m * C + c;
    requests += ds.reqC[i];
    failed += ds.failC[i];
    calls += ds.callsC[i];
    holdSum += ds.holdC[i] * ds.callsC[i];
    concSum += ds.concC[i];
    peakConc = Math.max(peakConc, ds.concC[i]);
    const u = ds.concC[i] / ds.pool[m];
    peakUtil = Math.max(peakUtil, u);
    utilSum += u;
    queueMax = Math.max(queueMax, ds.queueC[i]);
    n++;
  }
  return {
    id: CONNECTORS[c],
    requests,
    failed,
    calls,
    meanHold: calls ? holdSum / calls : 0,
    meanConc: n ? concSum / n : 0,
    peakConc,
    peakUtil,
    meanUtil: n ? utilSum / n : 0,
    queueMax,
  };
}

/** Failed request count across minutes [m0, m1) by connector instance. */
export function failuresByConnector(ds: Dataset, m0: number, m1: number): number[] {
  const C = CONNECTORS.length;
  const out = new Array<number>(C).fill(0);
  for (let m = m0; m < m1; m++) {
    for (let c = 0; c < C; c++) out[c] += ds.failC[m * C + c];
  }
  return out;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtPct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function fmtSec(ms: number, digits = 1): string {
  return `${(ms / 1000).toFixed(digits)} s`;
}

export { TIMEOUT_BUCKET };
