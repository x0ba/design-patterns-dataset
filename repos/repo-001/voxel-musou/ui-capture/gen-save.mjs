// Generates an established player's save by replaying a few months of wins through the game's own
// record() (src/core/progress.js) against an in-memory localStorage, then writes ./.ui-capture/out/seed-save.js
// which installs that save into the browser's localStorage (only when the browser has no save yet).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const { record, records } = await import(resolve(here, '../src/core/progress.js'));

// deterministic RNG
let seed = 20260611;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const between = (a, b) => a + (b - a) * rnd();

// Rank formula mirrored from src/story/index.js rank(); thresholds from each chapter / trial's CH.rank.
const RANK = {
  hulao: { kos: [500, 1000, 1700], time: [540, 720, 900] },
  changban: { kos: [500, 1000, 1700], time: [540, 720, 900] },
  chibi: { kos: [600, 1200, 2000], time: [600, 780, 960] },
  dingjun: { kos: [600, 1200, 2000], time: [540, 720, 900] },
  slay: { kos: [1000, 1000, 1000], time: [90, 115, 150], s: { time: 99, dmg: 0.35 } },
  hold: { kos: [1200, 1700, 2400], time: [999, 999, 999], s: { kos: 2217, dmg: 0.35 } },
  gauntlet: { kos: [0, 0, 0], time: [200, 270, 360], s: { time: 200, dmg: 0.7 } },
};
const DIFF = { easy: { bonus: 0, max: 'A' }, normal: { bonus: 0, max: 'S' }, hard: { bonus: 1, max: 'S' }, chaos: { bonus: 2, max: 'S' } };
function rank(stage, diff, { kos, time, dmg }) {
  const R = RANK[stage], d = DIFF[diff];
  const p = R.kos.filter((v) => kos >= v).length + R.time.filter((v) => time <= v).length + (dmg <= 0.35 ? 3 : dmg <= 0.7 ? 2 : dmg <= 1.1 ? 1 : 0);
  const q = p + d.bonus, r = q >= 8 ? 'S' : q >= 6 ? 'A' : q >= 4 ? 'B' : 'C';
  const s = R.s;
  return r === 'S' && (d.max === 'A' || (s && (time > (s.time ?? Infinity) || kos < (s.kos ?? 0) || dmg > s.dmg))) ? 'A' : r;
}

// One run's raw stats. skill 0..1 (improves over the months), harder tiers slow you down and hurt more.
const HARD = { easy: 0.75, normal: 1, hard: 1.2, chaos: 1.45 };
function run(stage, diff, skill) {
  const h = HARD[diff], j = () => between(-1, 1);
  let time, kos, dmg;
  switch (stage) {
    case 'slay':  time = Math.round((96 + (1 - skill) * 70) * (0.85 + 0.15 * h) + j() * 9); kos = 1000 + Math.floor(rnd() * 42); break;
    case 'hold':  time = 240; kos = Math.round((1250 + skill * 1150) / (0.8 + 0.2 * h) + j() * 160); break;
    case 'gauntlet': time = Math.round((205 + (1 - skill) * 190) * (0.8 + 0.2 * h) + j() * 20); kos = Math.round(40 + rnd() * 75); break;
    default: {
      const base = { hulao: 560, changban: 600, chibi: 680, dingjun: 590 }[stage];
      time = Math.round((base + (1 - skill) * 380) * (0.85 + 0.15 * h) + j() * 55);
      kos = Math.round((900 + skill * 1500) * (stage === 'chibi' || stage === 'dingjun' ? 1.12 : 1) + j() * 220);
    }
  }
  dmg = Math.max(0.05, (1 - skill) * 0.9 * h + j() * 0.25 + 0.12);
  return { time: Math.max(stage === 'slay' ? 82 : 60, time), kos: Math.max(0, kos), dmg };
}

// The play history: [stage, char, diff, wins, skill at first win, skill at last win]. Order roughly follows how a
// player would actually progress (chapters in order, trials sprinkled in, harder tiers later).
const PLAN = [
  ['hulao', 'guanyu', 'normal', 4, 0.15, 0.55],
  ['hulao', 'liubei', 'normal', 2, 0.25, 0.45],
  ['hulao', 'zhangfei', 'easy', 1, 0.2, 0.2],
  ['slay', 'zhaoyun', 'normal', 6, 0.2, 0.8],
  ['changban', 'zhaoyun', 'normal', 5, 0.3, 0.75],
  ['changban', 'zhangfei', 'normal', 2, 0.35, 0.5],
  ['slay', 'lubu', 'normal', 3, 0.4, 0.7],
  ['hold', 'zhangfei', 'normal', 4, 0.3, 0.75],
  ['chibi', 'zhugeliang', 'normal', 3, 0.35, 0.6],
  ['chibi', 'zhaoyun', 'normal', 1, 0.5, 0.5],
  ['hulao', 'guanyu', 'hard', 3, 0.45, 0.8],
  ['dingjun', 'huangzhong', 'normal', 4, 0.35, 0.7],
  ['slay', 'huangzhong', 'normal', 2, 0.5, 0.6],
  ['changban', 'zhaoyun', 'hard', 3, 0.55, 0.85],
  ['dingjun', 'zhaoyun', 'easy', 1, 0.5, 0.5],
  ['hold', 'lubu', 'hard', 2, 0.55, 0.75],
  ['hold', 'zhaoyun', 'normal', 1, 0.6, 0.6],
  ['gauntlet', 'zhaoyun', 'normal', 3, 0.4, 0.7],
  ['slay', 'guanyu', 'hard', 3, 0.55, 0.85],
  ['slay', 'zhangfei', 'normal', 1, 0.55, 0.55],
  ['slay', 'liubei', 'easy', 1, 0.4, 0.4],
  ['chibi', 'zhugeliang', 'hard', 2, 0.6, 0.75],
  ['gauntlet', 'lubu', 'hard', 2, 0.6, 0.8],
  ['hulao', 'zhangfei', 'normal', 1, 0.6, 0.6],
  ['dingjun', 'huangzhong', 'hard', 2, 0.6, 0.8],
  ['hulao', 'guanyu', 'chaos', 2, 0.7, 0.9],
  ['slay', 'zhaoyun', 'chaos', 2, 0.75, 0.85],
  ['gauntlet', 'guanyu', 'normal', 1, 0.65, 0.65],
  ['changban', 'zhaoyun', 'chaos', 1, 0.8, 0.8],
  ['slay', 'zhugeliang', 'normal', 1, 0.45, 0.45],
  ['hulao', 'liubei', 'hard', 1, 0.0, 0.0],        // scraped through once, barely
  ['slay', 'zhaoyun', 'normal', 3, 0.9, 1.0],        // later grinding for the S
  ['dingjun', 'zhaoyun', 'normal', 2, 0.6, 0.75],
  ['gauntlet', 'zhaoyun', 'hard', 1, 0.7, 0.7],
  ['hold', 'guanyu', 'easy', 1, 0.3, 0.3],
  ['chibi', 'zhaoyun', 'hard', 1, 0.35, 0.35],
  ['changban', 'zhangfei', 'hard', 1, 0.4, 0.4],
  ['slay', 'lubu', 'hard', 2, 0.7, 0.8],
];

let wins = 0;
for (const [stage, char, diff, n, s0, s1] of PLAN) {
  for (let i = 0; i < n; i++) {
    const skill = n === 1 ? s0 : s0 + (s1 - s0) * (i / (n - 1));
    const r = run(stage, diff, skill);
    record(stage, char, diff, { rank: rank(stage, diff, r), time: r.time, kos: r.kos });
    wins++;
  }
}

const save = store.get('voxel-musou.save');
const out = resolve(here, 'out/seed-save.js');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `// Seeded save for UI capture (generated by .ui-capture/gen-save.mjs via src/core/progress.js record()).
// Installs an established player's records only when this browser has no save yet.
(function () {
  try {
    if (!localStorage.getItem('voxel-musou.save')) {
      localStorage.setItem('voxel-musou.save', ${JSON.stringify(save)});
      localStorage.setItem('voxel-musou.diff', 'hard');
    }
  } catch (e) { /* no storage */ }
})();
`);
writeFileSync(resolve(here, 'seed-save.json'), JSON.stringify(JSON.parse(save), null, 2));
const R = records();
console.log(`${wins} wins replayed → ${Object.values(R).reduce((a, s) => a + Object.values(s).reduce((b, c) => b + Object.keys(c).length, 0), 0)} record cells`);
for (const s in R) for (const c in R[s]) for (const d in R[s][c]) console.log(s.padEnd(9), c.padEnd(11), d.padEnd(7), JSON.stringify(R[s][c][d]));
