// Prints the headline numbers from the generated dataset so they can be compared with the brief.
// Run with: node src/data/check.ts

import { generate } from './generate.ts';
import { rangeEndpoint, rangeConnector, failuresByConnector, fmtPct, minuteP95 } from './stats.ts';
import {
  ENDPOINT_INDEX,
  M_IDV_DEPLOY,
  M_POOL_CHANGE,
  M_WINDOW_END,
  M_WINDOW_START,
  M_HOTFIX,
  M_BATCH_START,
  M_BATCH_END,
  MINUTES,
  CONNECTORS,
  MIN_OF,
} from './scenario.ts';

const t0 = Date.now();
const ds = generate();
const ms = Date.now() - t0;
const cert = ENDPOINT_INDEX.cert;
const fmt = (ms2: number) => `${(ms2 / 1000).toFixed(2)} s`;

console.log(`generated in ${ms} ms`);
console.log(`requests: ${ds.totalRequests.toLocaleString()}  failures: ${ds.totalFailures.toLocaleString()}  records: ${ds.failures.length}  samples: ${ds.samples.length}`);

const all = rangeEndpoint(ds, -1, 0, MINUTES);
console.log(`overall fail rate ${fmtPct(all.failRate, 2)}`);

const fbc = failuresByConnector(ds, 0, MINUTES);
console.log(`failures by connector: ${CONNECTORS.map((c, i) => `${c} ${fbc[i]} (${fbc[i] / ds.totalFailures * 100 | 0}%)`).join(', ')}`);
const recB = ds.failures.filter((f) => f.route === 1).length;
console.log(`record check, failures on mf-conn-b: ${recB} = ${fmtPct(recB / ds.failures.length)}`);

const win = rangeEndpoint(ds, cert, M_WINDOW_START, M_WINDOW_END);
console.log(`\nincident window cert: total ${win.total}, failed ${win.failed}, rate ${fmtPct(win.failRate, 2)}, p50 ${fmt(win.p50)}, p95 ${fmt(win.p95)}`);
const winAll = rangeEndpoint(ds, -1, M_WINDOW_START, M_WINDOW_END);
console.log(`incident window all: total ${winAll.total}, failed ${winAll.failed}`);
const winFail = failuresByConnector(ds, M_WINDOW_START, M_WINDOW_END);
console.log(`window failures by connector: ${winFail.join(' / ')}  b share ${fmtPct(winFail[1] / winAll.failed)}`);

const base = rangeEndpoint(ds, cert, 0, M_IDV_DEPLOY);
console.log(`cert baseline Sat 00:00 – Sun 23:04 (pre-deploy): p50 ${fmt(base.p50)} p95 ${fmt(base.p95)} fail ${fmtPct(base.failRate, 3)}`);
const quietPost = rangeEndpoint(ds, cert, MIN_OF(1, 23, 30), MIN_OF(2, 6, 0));
console.log(`cert quiet post-deploy Sun 23:30 – Mon 06:00: p50 ${fmt(quietPost.p50)} p95 ${fmt(quietPost.p95)} fail ${fmtPct(quietPost.failRate, 3)}`);
const preSurge = rangeEndpoint(ds, cert, MIN_OF(2, 0, 0), MIN_OF(2, 7, 0));
console.log(`cert Mon 00:00–07:00: p95 ${fmt(preSurge.p95)} fail ${fmtPct(preSurge.failRate, 3)} vol ${preSurge.total}`);

let peak = 0;
let peakM = -1;
for (let m = M_WINDOW_START; m < M_WINDOW_END; m++) {
  const p = minuteP95(ds, cert, m);
  if (p > peak) { peak = p; peakM = m; }
}
console.log(`peak minute cert p95 in window: ${fmt(peak)} at minute ${peakM}`);

const idvPre = rangeEndpoint(ds, ENDPOINT_INDEX.idv, 0, M_IDV_DEPLOY);
const idvPost = rangeEndpoint(ds, ENDPOINT_INDEX.idv, MIN_OF(1, 23, 30), MIN_OF(2, 6, 0));
console.log(`identity-verify p95 pre ${fmt(idvPre.p95)} / post quiet ${fmt(idvPost.p95)}`);

let onset = -1;
for (let m = MIN_OF(2, 7, 30); m < M_WINDOW_END; m++) {
  const r = rangeEndpoint(ds, cert, m, m + 1);
  if (r.failed >= 5 && r.failRate >= 0.02) { onset = m; break; }
}
console.log(`first minute with >=5 cert failures and >=2%: ${onset >= 0 ? `Mon ${String(Math.floor((onset - 2880) / 60)).padStart(2, '0')}:${String((onset - 2880) % 60).padStart(2, '0')}` : 'none'}`);

const hourly: string[] = [];
for (let h = 0; h < 24; h++) {
  const a = rangeEndpoint(ds, ENDPOINT_INDEX.claims, 2880 + h * 60, 2880 + h * 60 + 60).total;
  const y = ds.yearAgoClaims[h];
  hourly.push(`${String(h).padStart(2, '0')}:00 ${a}/${y} (${(a / y).toFixed(1)}x)`);
}
console.log('\nclaims hourly Mon 2026 vs 2025:\n  ' + hourly.join('\n  '));

for (let c = 0; c < CONNECTORS.length; c++) {
  const r = rangeConnector(ds, c, M_WINDOW_START, M_WINDOW_END);
  console.log(`${r.id}: reqs ${r.requests} fails ${r.failed} meanHold ${r.meanHold.toFixed(0)} ms peakConc ${r.peakConc.toFixed(1)} peakUtil ${r.peakUtil.toFixed(2)} queueMax ${(r.queueMax / 1000).toFixed(1)} s`);
}
for (const [label, a, b] of [
  ['Sat-Sun', 0, M_IDV_DEPLOY],
  ['Mon 00-06', 2880, M_BATCH_START],
  ['batch 06-08:30', M_BATCH_START, M_BATCH_END],
  ['Mon 08:30-09:20', M_BATCH_END, M_HOTFIX],
  ['Mon 09:20-10:38', M_HOTFIX, M_POOL_CHANGE],
  ['Mon 10:38-10:45', M_POOL_CHANGE, M_WINDOW_END],
  ['Mon 10:45-12:00', M_WINDOW_END, MIN_OF(2, 12, 0)],
] as [string, number, number][]) {
  const r = rangeConnector(ds, 1, a, b);
  const fr = rangeEndpoint(ds, cert, a, b);
  console.log(`${label.padEnd(18)} b: util mean ${r.meanUtil.toFixed(2)} peak ${r.peakUtil.toFixed(2)} | cert fail ${fmtPct(fr.failRate, 2)} p95 ${fmt(fr.p95)} vol ${fr.total}`);
}
