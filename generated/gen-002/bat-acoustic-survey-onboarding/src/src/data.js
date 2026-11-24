// Mock survey data for Hollins Ridge Wind. Generated deterministically so every load is identical.

export const PROJECT = {
  name: 'Hollins Ridge Wind — Pre-construction, Autumn 2026',
  client: 'Ridgeline Renewables',
  pack: 'Eastern US v4.2',
  dueLabel: 'Wed 25 Nov',
  today: 'Mon 16 Nov',
  nights: ['Nov 9', 'Nov 10', 'Nov 11'],
};

export const DEFAULT_SETTINGS = { thr: 18, minCalls: 3, minFreq: 15 };
export const SETTING_DEFAULTS_NOTE = { thr: 15, minCalls: 3, minFreq: 15 };

export const LABELS = {
  myotis: { key: 'myotis', code: 'MYSP', name: 'Myotis spp.', color: '#2f6f8f' },
  redbat: { key: 'redbat', code: 'LABO', name: 'Eastern red bat', color: '#c2502f' },
  hoary: { key: 'hoary', code: 'LACI', name: 'Hoary bat', color: '#7d6a9a' },
  bbsh: { key: 'bbsh', code: 'EPFU/LANO', name: 'Big brown / silver-haired', color: '#b5862a' },
  unclass: { key: 'unclass', code: 'NOID', name: 'Unclassified', color: '#7f8a86' },
  noise: { key: 'noise', code: 'NOISE', name: 'Noise', color: '#a9b0ab' },
};
export const SPECIES_KEYS = ['myotis', 'redbat', 'hoary', 'bbsh'];
export const LABEL_ORDER = ['myotis', 'redbat', 'hoary', 'bbsh', 'unclass', 'noise'];

export const DETECTORS = [
  {
    id: 'HR-01', short: 'HR01', name: 'Meteorological tower', place: 'Met tower, microphone at 50 m',
    sr: 384, total: 960,
    noise: { sub: 71, calls: 62, lowfreq: 33, insect: 0, other: 8 },
    species: { myotis: 220, redbat: 220, hoary: 170, bbsh: 120, unclass: 56 },
  },
  {
    id: 'HR-02', short: 'HR02', name: 'Forest edge', place: 'Forest edge, microphone at 3 m',
    sr: 256, total: 906,
    noise: { sub: 104, calls: 131, lowfreq: 30, insect: 66, other: 22 },
    species: { myotis: 375, redbat: 112, hoary: 38, bbsh: 14, unclass: 14 },
  },
  {
    id: 'HR-03', short: 'HR03', name: 'Pond', place: 'Pond margin, microphone at 2 m',
    sr: 384, total: 948,
    noise: { sub: 88, calls: 96, lowfreq: 11, insect: 402, other: 30 },
    species: { myotis: 217, redbat: 71, hoary: 19, bbsh: 7, unclass: 7 },
  },
];

export const REASON_ORDER = ['calls', 'sub', 'lowfreq', 'insect', 'other'];
export const REASONS = {
  calls: {
    key: 'calls', short: 'Too few calls', setting: 'minCalls', adjustable: true,
    title: (s) => `Fewer than ${s.minCalls} calls in the sequence`,
    desc: (s) => `The file has bat-like pulses, but fewer than your minimum of ${s.minCalls} calls per sequence. Distant or passing bats often leave one or two pulses.`,
  },
  sub: {
    key: 'sub', short: 'Below threshold', setting: 'thr', adjustable: true,
    title: (s) => `Signal below the ${s.thr} dB threshold`,
    desc: (s) => `Pulses are present but peak less than ${s.thr} dB above the background floor. Typical for bats at the edge of microphone range.`,
  },
  lowfreq: {
    key: 'lowfreq', short: 'Under freq. floor', setting: 'minFreq', adjustable: true,
    title: (s) => `Energy below the ${s.minFreq} kHz floor`,
    desc: (s) => `Dominant energy sits under ${s.minFreq} kHz with no pulse structure. On this site it is almost all wind and microphone self-noise.`,
  },
  insect: {
    key: 'insect', short: 'Insects', setting: null, adjustable: false,
    title: () => 'Insect or broadband noise',
    desc: () => 'Dense, repeating broadband or tonal energy (katydids, crickets, frogs) with no bat-like pulse shape. Not controlled by the three sensitivity settings.',
  },
  other: {
    key: 'other', short: 'Clipped / truncated', setting: null, adjustable: false,
    title: () => 'Clipped or truncated recording',
    desc: () => 'The file is overloaded or cut short, so pulse shape cannot be measured. Not controlled by the sensitivity settings.',
  },
};

// ---------- deterministic PRNG ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = mulberry32(20261116);
const rr = (a, b) => a + (b - a) * R();
const ri = (a, b) => Math.floor(rr(a, b + 1));
function weighted(obj) {
  const entries = Object.entries(obj);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = R() * total;
  for (const [k, w] of entries) { x -= w; if (x <= 0) return k; }
  return entries[entries.length - 1][0];
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SP = {
  myotis: { fpk: [38, 50], calls: [4, 46] },
  redbat: { fpk: [36, 44], calls: [3, 30] },
  hoary: { fpk: [18.5, 26], calls: [3, 18] },
  bbsh: { fpk: [24, 32], calls: [3, 24] },
  unclass: { fpk: [22, 48], calls: [3, 14] },
};
const spCalls = (k) => { const [a, b] = SP[k].calls; return a + Math.floor(Math.pow(R(), 1.6) * (b - a + 1)); };
const spFpk = (k) => +rr(SP[k].fpk[0], SP[k].fpk[1]).toFixed(1);

const pad = (n, w = 2) => String(n).padStart(w, '0');
const fmtDate = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
const fmtTime = (d) => `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;

function buildFiles() {
  const files = [];
  for (const det of DETECTORS) {
    const slots = [];
    // species weights used when a rejected file would have been classified
    const latentW = { ...det.species };
    latentW.unclass = Math.max(4, Math.round(det.species.unclass * 0.6));
    const latent = () => weighted(latentW);

    for (const [k, n] of Object.entries(det.species)) {
      for (let i = 0; i < n; i++) {
        const conf = k === 'unclass' ? rr(0.28, 0.55) : 0.58 + 0.41 * Math.pow(R(), 0.55);
        slots.push({
          reason: null, flag: null, latent: k,
          calls: spCalls(k), snr: +(18.5 + 22 * Math.pow(R(), 1.8)).toFixed(1),
          fpk: spFpk(k), conf: +conf.toFixed(2),
        });
      }
    }
    for (const [reason, n] of Object.entries(det.noise)) {
      for (let i = 0; i < n; i++) {
        let s;
        if (reason === 'sub') {
          const l = latent();
          s = { flag: null, latent: l, calls: Math.max(3, spCalls(l === 'unclass' ? 'myotis' : l)), snr: +rr(8.5, 17.9).toFixed(1), fpk: spFpk(l), conf: +rr(0.45, 0.9).toFixed(2) };
        } else if (reason === 'calls') {
          const l = latent();
          s = { flag: null, latent: l, calls: R() < 0.55 ? 1 : 2, snr: +rr(11, 32).toFixed(1), fpk: spFpk(l), conf: +rr(0.4, 0.88).toFixed(2) };
        } else if (reason === 'lowfreq') {
          s = { flag: null, latent: 'unclass', calls: ri(3, 9), snr: +rr(18.5, 30).toFixed(1), fpk: +rr(4.5, 14.6).toFixed(1), conf: +rr(0.25, 0.5).toFixed(2) };
        } else if (reason === 'insect') {
          s = { flag: 'insect', latent: 'noise', calls: ri(2, 28), snr: +rr(14, 38).toFixed(1), fpk: +rr(17, 62).toFixed(1), conf: null };
        } else {
          s = { flag: 'other', latent: 'noise', calls: ri(0, 5), snr: +rr(6, 40).toFixed(1), fpk: +rr(8, 70).toFixed(1), conf: null };
        }
        slots.push({ ...s, reason });
      }
    }
    shuffle(slots);
    for (const s of slots) {
      const night = weighted({ 0: 0.36, 1: 0.38, 2: 0.26 });
      let minutes;
      if (s.flag === 'insect' || R() < 0.7) minutes = 14 + Math.min(300, -Math.log(1 - R() * 0.97) * 75);
      else minutes = rr(200, 840);
      const ts = Date.UTC(2026, 10, 9 + +night, 16, 50) + Math.floor(minutes * 60000) + ri(0, 59) * 1000;
      const dur = s.flag === 'other' ? +rr(3, 3.6).toFixed(1) : +rr(3, 15).toFixed(1);
      files.push({ det: det.id, short: det.short, sr: det.sr, night: +night, ts, dur, seed: ri(1, 2147483646), ...s });
    }
  }
  files.sort((a, b) => a.ts - b.ts || a.det.localeCompare(b.det));
  const seen = new Set();
  files.forEach((f, i) => {
    let ts = f.ts;
    let name;
    do {
      const d = new Date(ts);
      name = `${f.short}_${fmtDate(d)}_${fmtTime(d)}.wav`;
      ts += 1000;
    } while (seen.has(name));
    seen.add(name);
    f.id = name; f.i = i; f.name = name;
  });
  return files;
}

export const FILES = buildFiles();
export const FILE_BY_ID = Object.fromEntries(FILES.map((f) => [f.id, f]));

// Fixed QA sets (drawn once against the initial settings)
function pickQA() {
  const out = [];
  for (const det of DETECTORS) {
    const pool = FILES.filter((f) => f.det === det.id && !reasonOf(f, DEFAULT_SETTINGS));
    shuffle(pool);
    out.push(...pool.slice(0, 20));
  }
  return out.sort((a, b) => a.ts - b.ts).map((f) => f.id);
}
function pickSpot() {
  const pool = FILES.filter((f) => reasonOf(f, DEFAULT_SETTINGS));
  shuffle(pool);
  return pool.slice(0, 40).sort((a, b) => a.ts - b.ts).map((f) => f.id);
}

// ---------- rules ----------
export function reasonOf(f, s) {
  if (f.flag) return f.flag;
  if (f.fpk < s.minFreq) return 'lowfreq';
  if (f.calls < s.minCalls) return 'calls';
  if (f.snr < s.thr) return 'sub';
  return null;
}
export const autoLabelOf = (f, s) => (reasonOf(f, s) ? 'noise' : f.latent);

export const QA_IDS = pickQA();
export const SPOT_IDS = pickSpot();

export function fmtClock(ts) {
  const d = new Date(ts);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
export function fmtDay(ts) {
  const d = new Date(ts);
  return `Nov ${d.getUTCDate()}`;
}
export const nightName = (n) => PROJECT.nights[n];
export const nf = (n) => n.toLocaleString('en-US');
export const pct = (a, b, d = 0) => (b ? `${((a / b) * 100).toFixed(d)}%` : '—');
