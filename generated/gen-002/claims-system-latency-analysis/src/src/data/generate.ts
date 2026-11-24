// Builds the mock trace set. Per-minute aggregates cover every request (about 1.2 M). Full
// records exist for every failed request (14,600) and for a 1-in-400 sample of successes.
// The model is a fluid approximation: connector demand = mainframe transactions/sec × hold time
// (Little's law), and requests fail when demand exceeds the pool limit.

import { mulberry32, gauss, poisson, hex, type Rng } from './prng.ts';
import {
  BUCKET_EDGES_MS,
  CONNECTORS,
  ENDPOINTS,
  M_HOTFIX,
  M_IDV_DEPLOY,
  M_POOL_CHANGE,
  M_ANNOUNCE,
  M_WINDOW_END,
  MINUTES,
  MIN_OF,
  NUM_BUCKETS,
  POOL_AFTER,
  POOL_BEFORE,
  ROUTE_NONE,
  ROUTE_SHARE,
  TIMEOUT_BUCKET,
  TUNE,
  type EndpointDef,
} from './scenario.ts';

export interface Span {
  svc: string;
  kind: 'edge' | 'gateway' | 'app' | 'mf';
  depth: number;
  startMs: number;
  durMs: number;
  outcome: 'ok' | 'timeout' | 'reset';
}

export interface Req {
  id: string;
  /** ms since T0 */
  t: number;
  /** minute index */
  m: number;
  endpoint: number;
  /** 0..2 connector, 3 = no mainframe hop */
  route: number;
  status: number;
  durMs: number;
  retried: boolean;
  claimant: string;
  mfCalls: number;
  spans: Span[];
  sampled: boolean;
}

export interface Dataset {
  minutes: number;
  endpoints: EndpointDef[];
  totalRequests: number;
  totalFailures: number;
  /** per minute × endpoint (index m*E + e) */
  totalMe: Uint32Array;
  failMe: Uint32Array;
  mfCallsMe: Float32Array;
  /** latency histograms per minute × endpoint (index (m*E + e)*NB + b) */
  histMe: Uint32Array;
  /** per minute × connector (index m*3 + c) */
  reqC: Uint32Array;
  failC: Uint32Array;
  callsC: Float32Array;
  holdC: Float32Array;
  concC: Float32Array;
  queueC: Float32Array;
  /** per minute, pool limit in force (same on all instances) */
  pool: Uint8Array;
  /** Little's-law estimate per minute: mean hold × arrival rate, relative to pool */
  failures: Req[];
  samples: Req[];
  /** Monday 17 Nov 2025 hourly claim filings, 24 entries */
  yearAgoClaims: Float64Array;
}

const E = ENDPOINTS.length;
const C = CONNECTORS.length;
const R = C + 1; // route slots: 3 connectors + no-mainframe

// ---------- calendar and envelopes ----------

const DIURNAL_HOURLY = [
  0.1, 0.08, 0.07, 0.07, 0.07, 0.09, 0.3, 0.55, 0.85, 1.0, 1.0, 0.95, 0.85, 0.9, 0.85, 0.8, 0.7, 0.6,
  0.5, 0.4, 0.35, 0.3, 0.22, 0.15, 0.1,
];

function diurnal(minuteOfDay: number): number {
  const h = minuteOfDay / 60;
  const i = Math.floor(h);
  const f = h - i;
  return DIURNAL_HOURLY[i] * (1 - f) + DIURNAL_HOURLY[Math.min(i + 1, 24)] * f;
}

/** Surge envelope for the Monday claim spike: 0 before the announcement, 1 at peak. */
export function surgeAt(m: number): number {
  const rampEnd = M_ANNOUNCE + 50;
  const decayEnd = MIN_OF(2, 14, 0);
  if (m < M_ANNOUNCE) return 0;
  if (m < rampEnd) return (m - M_ANNOUNCE) / 50;
  if (m < M_WINDOW_END) return 1;
  if (m < decayEnd) return 1 - (0.8 * (m - M_WINDOW_END)) / (decayEnd - M_WINDOW_END);
  return 0.2 * Math.exp(-(m - decayEnd) / 480);
}

export function poolAt(m: number): number {
  return m >= M_POOL_CHANGE ? POOL_AFTER : POOL_BEFORE;
}

function mfPerAt(e: EndpointDef, m: number): number {
  return m >= M_IDV_DEPLOY ? e.mfPost : e.mfPre;
}

// ---------- latency math ----------

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

function phi(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function lognormCdf(x: number, median: number, sigma: number): number {
  if (x <= 0) return 0;
  return phi((Math.log(x) - Math.log(median)) / sigma);
}

export function bucketOf(durMs: number): number {
  for (let b = 0; b < NUM_BUCKETS; b++) {
    if (durMs < BUCKET_EDGES_MS[b + 1]) return b;
  }
  return NUM_BUCKETS - 1;
}

/** Histogram mass for a lognormal success distribution truncated at the gateway timeout. */
function successBucketProbs(median: number, sigma: number, out: Float64Array): void {
  const norm = lognormCdf(BUCKET_EDGES_MS[TIMEOUT_BUCKET], median, sigma);
  out.fill(0);
  if (norm <= 0) return;
  for (let b = 0; b < TIMEOUT_BUCKET; b++) {
    const lo = lognormCdf(BUCKET_EDGES_MS[b], median, sigma);
    const hi = lognormCdf(BUCKET_EDGES_MS[b + 1], median, sigma);
    out[b] = (hi - lo) / norm;
  }
}

// ---------- trace shapes ----------

interface Stage {
  svc: string;
  kind: 'app' | 'mf';
  w: number;
  depth: number;
}

/** Downstream service chain per endpoint. mf stages are filled in at build time with the connector. */
const CHAINS: Record<string, Stage[]> = {
  claims: [
    { svc: 'claim-intake', kind: 'app', w: 0.45, depth: 1 },
    { svc: 'eligibility-rules', kind: 'app', w: 0.25, depth: 2 },
    { svc: 'mf', kind: 'mf', w: 1, depth: 2 },
  ],
  cert_pre: [
    { svc: 'cert-submit', kind: 'app', w: 0.55, depth: 1 },
    { svc: 'wage-lookup', kind: 'app', w: 0.2, depth: 2 },
    { svc: 'mf', kind: 'mf', w: 1, depth: 3 },
  ],
  cert_post: [
    { svc: 'cert-submit', kind: 'app', w: 0.25, depth: 1 },
    { svc: 'identity-verify', kind: 'app', w: 0.3, depth: 2 },
    { svc: 'wage-lookup', kind: 'app', w: 0.1, depth: 3 },
    { svc: 'mf', kind: 'mf', w: 1, depth: 4 },
    { svc: 'cert-submit', kind: 'app', w: 0.1, depth: 1 },
    { svc: 'wage-lookup', kind: 'app', w: 0.05, depth: 2 },
    { svc: 'mf', kind: 'mf', w: 1, depth: 3 },
  ],
  idv_pre: [{ svc: 'identity-verify', kind: 'app', w: 1, depth: 1 }],
  idv_post: [
    { svc: 'identity-verify', kind: 'app', w: 0.4, depth: 1 },
    { svc: 'wage-lookup', kind: 'app', w: 0.2, depth: 2 },
    { svc: 'mf', kind: 'mf', w: 1, depth: 3 },
    { svc: 'identity-verify', kind: 'app', w: 0.4, depth: 1 },
    { svc: 'mf', kind: 'mf', w: 1, depth: 2 },
  ],
  wages: [
    { svc: 'wage-lookup', kind: 'app', w: 0.4, depth: 1 },
    { svc: 'mf', kind: 'mf', w: 1, depth: 2 },
  ],
  payments: [
    { svc: 'payment-schedule', kind: 'app', w: 0.5, depth: 1 },
    { svc: 'mf', kind: 'mf', w: 1, depth: 2 },
  ],
  docs: [{ svc: 'document-store', kind: 'app', w: 1, depth: 1 }],
};

function chainFor(e: EndpointDef, post: boolean): Stage[] {
  return CHAINS[post ? e.chainPost : e.chainPre];
}

function connName(route: number): string {
  return route < C ? CONNECTORS[route] : 'none';
}

/** Successful request: sequential spans whose durations add up to `total`. */
function successSpans(
  e: EndpointDef,
  post: boolean,
  route: number,
  total: number,
  mfMs: number,
  rng: Rng,
): Span[] {
  const spans: Span[] = [{ svc: 'claims-web', kind: 'edge', depth: 0, startMs: 0, durMs: total, outcome: 'ok' }];
  const gw = 6 + rng() * 8;
  spans.push({ svc: 'auth-gateway', kind: 'gateway', depth: 1, startMs: 1, durMs: gw, outcome: 'ok' });
  let cursor = 1 + gw;
  const stages = chainFor(e, post);
  const mfStages = stages.filter((s) => s.kind === 'mf');
  const appStages = stages.filter((s) => s.kind === 'app');
  const hasMf = route !== ROUTE_NONE && mfStages.length > 0;
  const mfEach = hasMf ? mfMs / mfStages.length : 0;
  const appW = appStages.reduce((a, s) => a + s.w, 0);
  const appBudget = Math.max(5, total - cursor - (hasMf ? mfMs : 0));
  for (const st of stages) {
    if (st.kind === 'mf') {
      if (!hasMf) continue;
      spans.push({ svc: connName(route), kind: 'mf', depth: st.depth, startMs: cursor, durMs: mfEach, outcome: 'ok' });
      cursor += mfEach;
    } else {
      const d = (appBudget * st.w) / appW;
      spans.push({ svc: st.svc, kind: 'app', depth: st.depth, startMs: cursor, durMs: d, outcome: 'ok' });
      cursor += d;
    }
  }
  return spans;
}

/** Failed request: the first downstream stage stalls until the gateway gives up. */
function failureSpans(
  e: EndpointDef,
  post: boolean,
  route: number,
  status: number,
  durMs: number,
  mfCalls: number,
  rng: Rng,
): Span[] {
  const total = status === 504 ? durMs + 20 + rng() * 60 : durMs + 5;
  const spans: Span[] = [
    { svc: 'claims-web', kind: 'edge', depth: 0, startMs: 0, durMs: total, outcome: status === 504 ? 'timeout' : 'reset' },
  ];
  const gw = 6 + rng() * 8;
  spans.push({ svc: 'auth-gateway', kind: 'gateway', depth: 1, startMs: 1, durMs: gw, outcome: 'ok' });
  let cursor = 1 + gw;
  const stages = chainFor(e, post);
  const stallIdx = stages.findIndex((s) => s.kind === 'mf' && route !== ROUTE_NONE);
  const idx = stallIdx >= 0 ? stallIdx : 0;
  for (let i = 0; i <= idx; i++) {
    const st = stages[i];
    if (i < idx) {
      const d = 15 + rng() * 60 * Math.max(1, mfCalls);
      spans.push({ svc: st.svc, kind: 'app', depth: st.depth, startMs: cursor, durMs: d, outcome: 'ok' });
      cursor += d;
    } else {
      const isMf = st.kind === 'mf' && route !== ROUTE_NONE;
      const svc = isMf ? connName(route) : st.svc;
      const rest = Math.max(50, durMs - cursor);
      spans.push({
        svc,
        kind: isMf ? 'mf' : 'app',
        depth: st.depth,
        startMs: cursor,
        durMs: rest,
        outcome: status === 504 ? 'timeout' : 'reset',
      });
      cursor += rest;
    }
  }
  return spans;
}

// ---------- generator ----------

export function generate(): Dataset {
  const rng = mulberry32(TUNE.seed);
  const N = MINUTES;
  const cell = (m: number, e: number, r: number) => (m * E + e) * R + r;

  // 1. Traffic shape per minute: diurnal × weekend factor × minute noise.
  const shape = new Float64Array(N);
  for (let m = 0; m < N; m++) {
    const day = Math.floor(m / 1440);
    const d = diurnal(m % 1440);
    const base = day < 2 ? 0.42 * (0.45 + 0.55 * d) : d;
    shape[m] = base * Math.exp(0.035 * gauss(rng));
  }
  const surge = new Float64Array(N);
  for (let m = 0; m < N; m++) surge[m] = surgeAt(m);

  // Scale so that the total is about 1.2 M requests.
  let raw = 0;
  for (let m = 0; m < N; m++) {
    for (const ep of ENDPOINTS) raw += shape[m] * ep.share * (1 + ep.surge * surge[m]);
  }
  const K = TUNE.totalRequests / raw;

  // 2. Request counts per minute × endpoint × route.
  const n = new Uint32Array(N * E * R);
  for (let m = 0; m < N; m++) {
    for (let e = 0; e < E; e++) {
      const ep = ENDPOINTS[e];
      const x = K * shape[m] * ep.share * (1 + ep.surge * surge[m]) * Math.exp(0.03 * gauss(rng));
      const total = Math.max(0, Math.round(x));
      const hasMf = mfPerAt(ep, m) > 0;
      if (!hasMf) {
        n[cell(m, e, ROUTE_NONE)] = total;
        continue;
      }
      const a = Math.round(total * ROUTE_SHARE[0]);
      const b = Math.round(total * ROUTE_SHARE[1]);
      n[cell(m, e, 0)] = a;
      n[cell(m, e, 1)] = b;
      n[cell(m, e, 2)] = total - a - b;
    }
  }

  // 3. Connector load: transactions, arrival rate, hold time, implied concurrency, queueing.
  const callsC = new Float32Array(N * C);
  const reqC = new Uint32Array(N * C);
  const holdC = new Float32Array(N * C);
  const concC = new Float32Array(N * C);
  const queueC = new Float32Array(N * C);
  const pool = new Uint8Array(N);
  const pCallC = new Float64Array(N * C);
  const mfCallsMe = new Float32Array(N * E);
  for (let m = 0; m < N; m++) {
    pool[m] = poolAt(m);
    for (let e = 0; e < E; e++) {
      const per = mfPerAt(ENDPOINTS[e], m);
      mfCallsMe[m * E + e] = per;
      for (let c = 0; c < C; c++) {
        const nn = n[cell(m, e, c)];
        reqC[m * C + c] += nn;
        callsC[m * C + c] += nn * per;
      }
    }
    for (let c = 0; c < C; c++) {
      const idx = m * C + c;
      const ratePerSec = callsC[idx] / 60;
      const batch = m >= MIN_OF(2, 6, 0) && m < MIN_OF(2, 8, 30) ? TUNE.batchHoldFactor[c] : 1;
      const contention = 1 + TUNE.contentionC * Math.pow(ratePerSec / TUNE.contentionRefPerSec, TUNE.contentionP);
      const hold = TUNE.holdBaseMs * TUNE.connHoldFactor[c] * batch * contention;
      const demand = (ratePerSec * hold) / 1000; // Little's law: mean concurrent sessions
      holdC[idx] = hold;
      concC[idx] = demand;
      const u = demand / pool[m];
      const excess = Math.max(0, u - 1);
      queueC[idx] = Math.min(TUNE.queueCapMs, excess * TUNE.queueMsPerExcess);
      pCallC[idx] = Math.min(TUNE.failCap, (TUNE.failFloor + TUNE.failKappa * excess) * TUNE.failBias[c]);
    }
  }

  // 4. Failure counts per cell, then nudge to the exact target.
  const k = new Uint32Array(N * E * R);
  const routeMedian = new Float64Array(N * E * R);
  const routeSigma = new Float64Array(N * E * R);
  for (let m = 0; m < N; m++) {
    for (let e = 0; e < E; e++) {
      const ep = ENDPOINTS[e];
      const per = mfPerAt(ep, m);
      for (let r = 0; r < R; r++) {
        const idx = cell(m, e, r);
        const nn = n[idx];
        if (nn === 0) continue;
        if (r === ROUTE_NONE) {
          routeMedian[idx] = ep.baseMs;
          routeSigma[idx] = 0.25;
          k[idx] = poisson(rng, nn * TUNE.failNoMf);
        } else {
          const ci = m * C + r;
          routeMedian[idx] = ep.baseMs + per * holdC[ci] + queueC[ci];
          routeSigma[idx] = 0.16;
          const pReq = 1 - Math.pow(1 - pCallC[ci], per);
          k[idx] = Math.min(nn, poisson(rng, nn * pReq));
        }
      }
    }
  }
  // Nudge the total onto the target by adjusting only cells that already fail, so any correction
  // stays where the load model puts the failures (the saturated minutes) and not in quiet hours.
  let kTotal = 0;
  for (let i = 0; i < k.length; i++) kTotal += k[i];
  let diff = TUNE.totalFailures - kTotal;
  const saturatedCells: number[] = [];
  const allFailingCells: number[] = [];
  for (let m = 0; m < N; m++) {
    for (let e = 0; e < E; e++) {
      for (let r = 0; r < R; r++) {
        const idx = cell(m, e, r);
        if (k[idx] === 0) continue;
        allFailingCells.push(idx);
        if (r < C && concC[m * C + r] / pool[m] > 1) saturatedCells.push(idx);
      }
    }
  }
  for (const list of [saturatedCells, allFailingCells]) {
    let guard = 0;
    while (diff !== 0 && list.length > 0 && guard++ < 2_000_000) {
      const idx = list[Math.floor(rng() * list.length)];
      if (diff > 0 && k[idx] < n[idx]) {
        k[idx]++;
        diff--;
      } else if (diff < 0 && k[idx] > 0) {
        k[idx]--;
        diff++;
      }
    }
  }

  // Settle the mf-conn-b share of failures at the brief's figure by moving a few failures from
  // saturated a/c cells onto saturated b cells. The total stays exact.
  const aFailing: number[] = [];
  const bRoom: number[] = [];
  for (const idx of saturatedCells) {
    const r = idx % R;
    if (r !== 1 && k[idx] > 0) aFailing.push(idx);
    if (r === 1 && k[idx] < n[idx]) bRoom.push(idx);
  }
  let bFailures = 0;
  for (let m = 0; m < N; m++) for (let e = 0; e < E; e++) bFailures += k[cell(m, e, 1)];
  const bTarget = Math.ceil(TUNE.totalFailures * 0.71);
  while (bFailures < bTarget && aFailing.length > 0 && bRoom.length > 0) {
    const ia = aFailing[Math.floor(rng() * aFailing.length)];
    const ib = bRoom[Math.floor(rng() * bRoom.length)];
    if (k[ia] === 0 || k[ib] >= n[ib]) {
      if (k[ia] === 0) aFailing.splice(aFailing.indexOf(ia), 1);
      if (k[ib] >= n[ib]) bRoom.splice(bRoom.indexOf(ib), 1);
      continue;
    }
    k[ia]--;
    k[ib]++;
    bFailures++;
  }

  // 5. Aggregates from counts and failure records.
  const totalMe = new Uint32Array(N * E);
  const failMe = new Uint32Array(N * E);
  const histMe = new Uint32Array(N * E * NUM_BUCKETS);
  const failC = new Uint32Array(N * C);
  const failures: Req[] = [];
  const probs = new Float64Array(NUM_BUCKETS);
  const sampleEvery = TUNE.sampleEvery;
  const samples: Req[] = [];
  let totalRequests = 0;
  let totalFailures = 0;

  for (let m = 0; m < N; m++) {
    const retryP = m < M_HOTFIX ? TUNE.retryPre : TUNE.retryAfterHotfix;
    for (let e = 0; e < E; e++) {
      const ep = ENDPOINTS[e];
      const per = mfPerAt(ep, m);
      for (let r = 0; r < R; r++) {
        const idx = cell(m, e, r);
        const nn = n[idx];
        if (nn === 0) continue;
        const kk = k[idx];
        totalRequests += nn;
        totalFailures += kk;
        totalMe[m * E + e] += nn;
        failMe[m * E + e] += kk;
        if (r < C) failC[m * C + r] += kk;

        // Failed requests: one record each, with a 504 or 502 outcome.
        for (let i = 0; i < kk; i++) {
          const is504 = rng() < TUNE.share504;
          const status = is504 ? 504 : 502;
          const durMs = is504 ? 30000 + rng() * 1400 : 1500 + rng() * 7500;
          const t = m * 60000 + rng() * 60000;
          const mfCalls = per;
          const spans = failureSpans(ep, m >= M_IDV_DEPLOY, r, status, durMs, mfCalls, rng);
          failures.push({
            id: `${hex(rng, 8)}-${hex(rng, 4)}-${hex(rng, 4)}`,
            t,
            m,
            endpoint: e,
            route: r,
            status,
            durMs: spans[0].durMs,
            retried: rng() < retryP,
            claimant: `ck_${hex(rng, 8)}`,
            mfCalls,
            spans,
            sampled: false,
          });
          histMe[(m * E + e) * NUM_BUCKETS + bucketOf(durMs)] += 1;
        }

        // Successful requests: analytic histogram, plus a 1-in-N sample of full traces.
        const nSucc = nn - kk;
        if (nSucc <= 0) continue;
        const median = routeMedian[idx];
        const sigma = routeSigma[idx];
        successBucketProbs(median, sigma, probs);
        let placed = 0;
        let best = 0;
        for (let b = 0; b < TIMEOUT_BUCKET; b++) {
          const cnt = Math.floor(nSucc * probs[b]);
          histMe[(m * E + e) * NUM_BUCKETS + b] += cnt;
          placed += cnt;
          if (probs[b] > probs[best]) best = b;
        }
        histMe[(m * E + e) * NUM_BUCKETS + best] += nSucc - placed;

        const sampleCount = poisson(rng, nSucc / sampleEvery);
        for (let s = 0; s < sampleCount; s++) {
          let L = 0;
          do {
            L = median * Math.exp(sigma * gauss(rng));
          } while (L >= 30000);
          const mfMs = r === ROUTE_NONE ? 0 : Math.min(L * 0.9, per * holdC[m * C + r] * Math.exp(0.08 * gauss(rng)) + queueC[m * C + r]);
          samples.push({
            id: `${hex(rng, 8)}-${hex(rng, 4)}-${hex(rng, 4)}`,
            t: m * 60000 + rng() * 60000,
            m,
            endpoint: e,
            route: r,
            status: 200,
            durMs: L,
            retried: false,
            claimant: `ck_${hex(rng, 8)}`,
            mfCalls: per,
            spans: successSpans(ep, m >= M_IDV_DEPLOY, r, L, mfMs, rng),
            sampled: true,
          });
        }
      }
    }
  }

  // 6. Year-ago Monday hourly claim filings (no surge, slight growth-adjusted noise).
  const yearAgoClaims = new Float64Array(24);
  const yrng = mulberry32(TUNE.seed + 1);
  const claimsIdx = ENDPOINTS.findIndex((x) => x.id === 'claims');
  for (let h = 0; h < 24; h++) {
    let sum = 0;
    for (let mm = 0; mm < 60; mm++) {
      const m = 2 * 1440 + h * 60 + mm;
      sum += K * shape[m] * ENDPOINTS[claimsIdx].share;
    }
    yearAgoClaims[h] = Math.round(sum * 0.96 * Math.exp(0.04 * gauss(yrng)));
  }

  // 7. Ordering and ids.
  failures.sort((a, b) => a.t - b.t);
  samples.sort((a, b) => a.t - b.t);

  return {
    minutes: N,
    endpoints: ENDPOINTS,
    totalRequests,
    totalFailures,
    totalMe,
    failMe,
    mfCallsMe,
    histMe,
    reqC,
    failC,
    callsC,
    holdC,
    concC,
    queueC,
    pool,
    failures,
    samples,
    yearAgoClaims,
  };
}
