// Seeds the local Upstash stub with the global transfer counter a public Floe
// instance would have reached by 2026-11-16, five months after v1.0.0 shipped
// (2026-06-14). It replays a generated history of receiver stats reports (the
// same POST /api/stats/report payloads the web app, CLI and desktop send) and
// stores what the server's stats.js reads: the key `floe:bytes_total`.
// The per-day rollup is kept alongside for reference; the server ignores it.
// Deterministic (seeded PRNG), so re-running gives the same numbers.
const fs = require('fs');
const path = require('path');

const FILE = process.env.UPSTASH_STUB_FILE || path.join(__dirname, 'data', 'upstash.json');
let s = 0x5eed1e;
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());

// What people send: a mix of small docs, photo batches, videos, builds, backups.
const kinds = [
  { w: 0.38, mu: Math.log(2.4e6), sd: 1.1 },   // PDFs, docs, screenshots
  { w: 0.22, mu: Math.log(85e6), sd: 0.9 },    // phone photo batches (zipped folders)
  { w: 0.18, mu: Math.log(1.2e9), sd: 0.8 },   // screen recordings, raw video clips
  { w: 0.14, mu: Math.log(350e6), sd: 1.0 },   // app builds, datasets, design files
  { w: 0.07, mu: Math.log(5.5e9), sd: 0.7 },     // project archives, VM images, backups
  { w: 0.01, mu: Math.log(32e9), sd: 0.6 },    // big footage drops over the CLI
];
const MAX_REPORT = 5 * 1024 ** 4;
function sample() {
  let r = rand(), k = kinds[0];
  for (const x of kinds) { if ((r -= x.w) <= 0) { k = x; break; } k = x; }
  return Math.max(1, Math.min(MAX_REPORT, Math.round(Math.exp(k.mu + k.sd * gauss()))));
}

const start = Date.UTC(2026, 5, 14);
const end = Date.UTC(2026, 10, 16);
const daily = [];
let total = 0n, reports = 0;
for (let t = start, d = 0; t <= end; t += 864e5, d++) {
  const date = new Date(t);
  // Launch spike (Show HN / Reddit week), then steady growth with weekday rhythm.
  const launch = d < 10 ? 900 * Math.exp(-d / 3) : 0;
  const trend = 140 + d * 2.6;
  const weekday = [0.7, 1.1, 1.15, 1.1, 1.05, 0.95, 0.75][date.getUTCDay()];
  const n = Math.max(20, Math.round((trend * weekday + launch) * (0.85 + 0.3 * rand())));
  let bytes = 0;
  for (let i = 0; i < n; i++) bytes += sample();
  total += BigInt(bytes); reports += n;
  daily.push(JSON.stringify({ date: date.toISOString().slice(0, 10), reports: n, bytes }));
}

let db = {};
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
db['floe:bytes_total'] = total.toString();
db['floe:seed:daily'] = daily;
db['floe:seed:meta'] = JSON.stringify({ reports, from: '2026-06-14', to: '2026-11-16' });
fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(db));
const tb = Number(total) / 1024 ** 4;
console.log(`seeded ${reports} reports over ${daily.length} days: ${total} bytes (${tb.toFixed(2)} TB)`);
