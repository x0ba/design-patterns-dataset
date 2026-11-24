import { mulberry32, gaussFactory, pickWeighted, clamp } from './rng';
import { convexHull, Polygon } from './geometry';

export const ENVS = ['Car', 'Street', 'Call center', 'Quiet room'] as const;
export const ENV_SHORT = ['car', 'street', 'call center', 'quiet room'];
export const VENDORS = ['Lexicore', 'Northbay Transcription', 'Kestrel Annotation', 'In-house'];
export const TRAIN_WEIGHT = 10; // each rendered training point stands for 10 clips

export interface Accent {
  code: string;
  label: string;
  language: string;
  family: string;
  center: [number, number];
  spread: number;
  nClusters: number;
  trainW: number;
  evalW: number;
  baseWer: number;
  env: number[];
  vendor: number[];
  metric: 'WER' | 'CER';
}

const A = (
  code: string,
  label: string,
  language: string,
  family: string,
  center: [number, number],
  spread: number,
  nClusters: number,
  trainW: number,
  evalW: number,
  baseWer: number,
  env: number[],
  vendor: number[],
  metric: 'WER' | 'CER' = 'WER',
): Accent => ({ code, label, language, family, center, spread, nClusters, trainW, evalW, baseWer, env, vendor, metric });

export const ACCENTS: Accent[] = [
  A('en-US', 'US English', 'English', 'en-core', [-30, -8], 21, 40, 1.0, 0.85, 0.068, [0.22, 0.15, 0.38, 0.25], [0.45, 0.3, 0.1, 0.15]),
  A('en-GB', 'British English', 'English', 'en-core', [-2, -40], 13, 16, 0.9, 0.85, 0.078, [0.2, 0.15, 0.35, 0.3], [0.35, 0.4, 0.1, 0.15]),
  A('en-AU', 'Australian English', 'English', 'en-core', [24, -62], 9, 8, 0.8, 0.8, 0.085, [0.25, 0.2, 0.3, 0.25], [0.3, 0.45, 0.1, 0.15]),
  A('en-SC', 'Scottish English', 'English', 'en-core', [-24, -62], 7, 4, 0.6, 0.7, 0.12, [0.3, 0.2, 0.3, 0.2], [0.3, 0.4, 0.15, 0.15]),
  A('en-IN', 'Indian English', 'English', 'en-asia', [-50, 28], 14, 18, 0.9, 1.0, 0.105, [0.15, 0.25, 0.4, 0.2], [0.3, 0.25, 0.3, 0.15]),
  A('en-PH', 'Philippine English', 'English', 'en-asia', [-72, 4], 9, 6, 0.7, 0.8, 0.1, [0.1, 0.15, 0.55, 0.2], [0.35, 0.3, 0.2, 0.15]),
  A('en-NG', 'Nigerian English', 'English', 'en-africa', [24, 38], 10, 7, 0.35, 1.0, 0.12, [0.2, 0.3, 0.25, 0.25], [0.15, 0.2, 0.55, 0.1]),
  A('en-GH', 'Ghanaian English', 'English', 'en-africa', [47, 42], 8, 4, 0.35, 1.0, 0.13, [0.2, 0.3, 0.25, 0.25], [0.15, 0.2, 0.55, 0.1]),
  A('en-KE', 'Kenyan English', 'English', 'en-africa', [64, 12], 9, 6, 0.9, 0.9, 0.115, [0.15, 0.35, 0.25, 0.25], [0.35, 0.3, 0.2, 0.15]),
  A('en-ZA', 'South African English', 'English', 'en-africa', [22, 4], 9, 6, 0.8, 0.8, 0.095, [0.2, 0.25, 0.3, 0.25], [0.35, 0.35, 0.15, 0.15]),
  A('es-MX', 'Mexican Spanish', 'Spanish', 'es', [-62, -54], 11, 12, 0.9, 0.8, 0.088, [0.25, 0.2, 0.35, 0.2], [0.4, 0.35, 0.1, 0.15]),
  A('es-US', 'US Spanish', 'Spanish', 'es', [-42, -36], 9, 10, 0.8, 0.8, 0.095, [0.3, 0.2, 0.3, 0.2], [0.4, 0.35, 0.1, 0.15]),
  A('es-ES', 'Castilian Spanish', 'Spanish', 'es', [-82, -30], 9, 8, 0.8, 0.7, 0.082, [0.2, 0.2, 0.35, 0.25], [0.4, 0.35, 0.1, 0.15]),
  A('es-CO', 'Colombian Spanish', 'Spanish', 'es', [-82, -66], 7, 4, 0.6, 0.6, 0.1, [0.2, 0.25, 0.35, 0.2], [0.4, 0.35, 0.1, 0.15]),
  A('pt-BR', 'Brazilian Portuguese', 'Portuguese', 'pt', [-46, -82], 11, 10, 0.9, 0.8, 0.095, [0.2, 0.25, 0.35, 0.2], [0.35, 0.35, 0.15, 0.15]),
  A('fr-FR', 'French', 'French', 'fr', [60, -40], 10, 9, 0.9, 0.8, 0.092, [0.2, 0.2, 0.35, 0.25], [0.45, 0.3, 0.1, 0.15]),
  A('fr-CA', 'Canadian French', 'French', 'fr', [46, -66], 8, 5, 0.7, 0.7, 0.105, [0.3, 0.2, 0.3, 0.2], [0.45, 0.3, 0.1, 0.15]),
  A('de-DE', 'German', 'German', 'de', [82, -14], 10, 10, 0.9, 0.8, 0.085, [0.3, 0.15, 0.3, 0.25], [0.45, 0.3, 0.1, 0.15]),
  A('hi-IN', 'Hindi', 'Hindi', 'hi', [-80, 50], 10, 9, 0.8, 0.9, 0.14, [0.15, 0.25, 0.4, 0.2], [0.3, 0.25, 0.3, 0.15]),
  A('ar-EG', 'Egyptian Arabic', 'Arabic', 'ar', [80, 52], 9, 4, 0.5, 0.6, 0.17, [0.2, 0.3, 0.3, 0.2], [0.3, 0.3, 0.25, 0.15]),
  A('ja-JP', 'Japanese', 'Japanese', 'ja', [64, 82], 10, 8, 0.8, 0.7, 0.11, [0.25, 0.15, 0.35, 0.25], [0.4, 0.3, 0.15, 0.15], 'CER'),
  A('zh-CN', 'Mandarin', 'Mandarin', 'zh', [28, 82], 10, 8, 0.8, 0.7, 0.1, [0.2, 0.2, 0.35, 0.25], [0.4, 0.3, 0.15, 0.15], 'CER'),
];

export const ACCENT_INDEX: Record<string, number> = Object.fromEntries(ACCENTS.map((a, i) => [a.code, i]));

const ENV_ANGLE = [2.6, -0.9, 1.6, -2.4];
const ENV_SNR = [12, 7, 17, 28];
const ENV_WER_MULT = [1.15, 1.35, 1.1, 0.72];
const VENDOR_CONF = [0.9, 0.88, 0.8, 0.94];

export interface Cluster {
  id: number;
  name: string;
  accent: number;
  env: number;
  long: boolean;
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  rot: number;
  lobe: [number, number];
  trainOffset: [number, number];
  trainN: number;
  evalN: number;
  werTarget: number;
  delta: number;
  snrShift: number;
  vendor: number[];
  confShift: number;
  flagged: boolean;
  special: boolean;
  // computed after generation
  evalCount: number;
  trainCount: number;
  wer41: number;
  wer42: number;
  medianSnr: number;
  label: string;
}

export interface EvalSet {
  n: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  cluster: Uint16Array;
  accent: Uint8Array;
  env: Uint8Array;
  vendor: Uint8Array;
  conf: Float32Array;
  snr: Float32Array;
  dur: Float32Array;
  wer41: Float32Array;
  wer42: Float32Array;
  female: Uint8Array;
}

export interface TrainSet {
  n: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  cluster: Uint16Array;
  accent: Uint8Array;
  env: Uint8Array;
  vendor: Uint8Array;
  conf: Float32Array;
  dur: Float32Array;
}

export interface Dataset {
  clusters: Cluster[];
  clusterById: Map<number, Cluster>;
  ev: EvalSet;
  tr: TrainSet;
  trainTotal: number;
  evalTotal: number;
}

interface SpecialSpec {
  id: number;
  accent: string;
  env: number;
  long: boolean;
  center: [number, number];
  z: number;
  sigma: number;
  train: number;
  eval: number;
  wer: number;
  delta: number;
  snrShift: number;
  vendor?: number[];
  confShift?: number;
  flagged?: boolean;
  trainOffset?: [number, number];
}

export const FLAGGED_CLUSTERS = [141, 142, 147];
export const HEALTHY_NEIGHBOR = 88;

const SPECIALS: SpecialSpec[] = [
  { id: 141, accent: 'en-NG', env: 1, long: false, center: [33, 25], z: 4, sigma: 2.5, train: 4900, eval: 1510, wer: 0.132, delta: 0.094, snrShift: -1.6, vendor: [0.1, 0.16, 0.66, 0.08], confShift: -0.1, flagged: true, trainOffset: [-2.6, 1.6] },
  { id: 142, accent: 'en-NG', env: 1, long: true, center: [36.6, 30.2], z: 6, sigma: 2.1, train: 3100, eval: 930, wer: 0.15, delta: 0.088, snrShift: -1.2, vendor: [0.1, 0.16, 0.66, 0.08], confShift: -0.1, flagged: true, trainOffset: [-2.2, 1.8] },
  { id: 147, accent: 'en-GH', env: 1, long: false, center: [40.6, 23.4], z: 3, sigma: 2.3, train: 3300, eval: 1080, wer: 0.143, delta: 0.09, snrShift: -1.4, vendor: [0.12, 0.18, 0.6, 0.1], confShift: -0.09, flagged: true, trainOffset: [1.8, 2.6] },
  { id: 88, accent: 'en-KE', env: 1, long: false, center: [52.5, 13], z: 8, sigma: 3.6, train: 41000, eval: 2080, wer: 0.152, delta: -0.006, snrShift: -0.4, vendor: [0.38, 0.32, 0.14, 0.16], confShift: 0.0 },
  { id: 163, accent: 'en-ZA', env: 2, long: true, center: [46, 33], z: 44, sigma: 2.2, train: 9200, eval: 240, wer: 0.09, delta: -0.004, snrShift: 0 },
  { id: 59, accent: 'en-NG', env: 3, long: false, center: [26, 33], z: 2, sigma: 2.6, train: 6800, eval: 760, wer: 0.085, delta: -0.003, snrShift: 0 },
];

const FAMILY_MEMBERS: Record<string, number[]> = {};
ACCENTS.forEach((a, i) => {
  (FAMILY_MEMBERS[a.family] ||= []).push(i);
});

function generate(): Dataset {
  const rng = mulberry32(20261117);
  const gauss = gaussFactory(rng);

  const TOTAL_TRAIN_POINTS = 180000;
  const TOTAL_EVAL = 64000;

  // ---- cluster definitions ----
  const clusters: Cluster[] = [];
  const specialIds = new Set(SPECIALS.map((s) => s.id));
  const freeIds: number[] = [];
  for (let i = 1; i <= 212; i++) if (!specialIds.has(i)) freeIds.push(i);
  for (let i = freeIds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [freeIds[i], freeIds[j]] = [freeIds[j], freeIds[i]];
  }

  const groupZ = ACCENTS.map(() => (rng() - 0.5) * 50);
  groupZ[ACCENT_INDEX['en-NG']] = 4;
  groupZ[ACCENT_INDEX['en-GH']] = 4;
  groupZ[ACCENT_INDEX['en-KE']] = 8;
  groupZ[ACCENT_INDEX['en-ZA']] = 0;

  const mk = (partial: Partial<Cluster> & { id: number; accent: number; env: number; long: boolean }): Cluster => ({
    name: 'C-' + String(partial.id).padStart(3, '0'),
    cx: 0,
    cy: 0,
    cz: 0,
    sx: 2,
    sy: 2,
    rot: 0,
    lobe: [0, 0],
    trainOffset: [0, 0],
    trainN: 0,
    evalN: 0,
    werTarget: 0.1,
    delta: 0,
    snrShift: 0,
    vendor: ACCENTS[partial.accent].vendor,
    confShift: 0,
    flagged: false,
    special: false,
    evalCount: 0,
    trainCount: 0,
    wer41: 0,
    wer42: 0,
    medianSnr: 0,
    label: '',
    ...partial,
  });

  const placed: { x: number; y: number; s: number }[] = [];

  for (const s of SPECIALS) {
    const ai = ACCENT_INDEX[s.accent];
    const c = mk({
      id: s.id,
      accent: ai,
      env: s.env,
      long: s.long,
      special: true,
      flagged: !!s.flagged,
      cx: s.center[0],
      cy: s.center[1],
      cz: s.z,
      trainN: Math.round(s.train / TRAIN_WEIGHT),
      evalN: s.eval,
      werTarget: s.wer,
      delta: s.delta,
      snrShift: s.snrShift,
      vendor: s.vendor ?? ACCENTS[ai].vendor,
      confShift: s.confShift ?? 0,
      trainOffset: s.trainOffset ?? [0, 0],
    });
    c.sx = s.sigma * (1.1 + rng() * 0.2);
    c.sy = s.sigma * (0.75 + rng() * 0.15);
    c.rot = rng() * Math.PI;
    const la = rng() * Math.PI * 2;
    c.lobe = [Math.cos(la) * s.sigma * 1.1, Math.sin(la) * s.sigma * 1.1];
    clusters.push(c);
    placed.push({ x: c.cx, y: c.cy, s: s.sigma * 1.25 });
  }

  // regular clusters per accent
  const regular: Cluster[] = [];
  for (let ai = 0; ai < ACCENTS.length; ai++) {
    const acc = ACCENTS[ai];
    const nSpecial = SPECIALS.filter((s) => s.accent === acc.code).length;
    for (let k = 0; k < acc.nClusters - nSpecial; k++) {
      const env = pickWeighted(rng, acc.env);
      const c = mk({ id: freeIds.pop()!, accent: ai, env, long: rng() < 0.35 });
      regular.push(c);
    }
  }

  // sizes
  const specialTrain = clusters.reduce((a, c) => a + c.trainN, 0);
  const specialEval = clusters.reduce((a, c) => a + c.evalN, 0);
  const tw = regular.map((c) => ACCENTS[c.accent].trainW * Math.exp(gauss() * 0.55));
  const ew = regular.map((c) => ACCENTS[c.accent].evalW * Math.exp(gauss() * 0.5));
  const twSum = tw.reduce((a, b) => a + b, 0);
  const ewSum = ew.reduce((a, b) => a + b, 0);
  let trainLeft = TOTAL_TRAIN_POINTS - specialTrain;
  let evalLeft = TOTAL_EVAL - specialEval;
  const trainBudget = trainLeft;
  const evalBudget = evalLeft;
  regular.forEach((c, i) => {
    if (i === regular.length - 1) {
      c.trainN = trainLeft;
      c.evalN = evalLeft;
    } else {
      c.trainN = Math.max(60, Math.round((tw[i] / twSum) * trainBudget));
      c.evalN = Math.max(40, Math.round((ew[i] / ewSum) * evalBudget));
      trainLeft -= c.trainN;
      evalLeft -= c.evalN;
    }
  });

  // placement
  for (const c of regular) {
    const acc = ACCENTS[c.accent];
    const sig = clamp(1.15 + 0.42 * Math.sqrt((c.trainN + c.evalN) / 100), 1.5, 4.2);
    c.sx = sig * (1.0 + rng() * 0.35);
    c.sy = sig * (0.65 + rng() * 0.3);
    c.rot = rng() * Math.PI;
    const la = rng() * Math.PI * 2;
    c.lobe = [Math.cos(la) * sig * 1.2, Math.sin(la) * sig * 1.2];
    let best: [number, number] = acc.center;
    for (let attempt = 0; attempt < 120; attempt++) {
      const ang = ENV_ANGLE[c.env] + gauss() * 0.55;
      const r = acc.spread * (0.15 + 0.7 * rng()) * (1 + attempt * 0.025);
      const x = clamp(acc.center[0] + Math.cos(ang) * r, -96, 96);
      const y = clamp(acc.center[1] + Math.sin(ang) * r, -96, 96);
      let ok = true;
      for (const p of placed) {
        const minD = (p.s + sig) * 1.08;
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < minD * minD) {
          ok = false;
          break;
        }
      }
      best = [x, y];
      if (ok) break;
    }
    c.cx = best[0];
    c.cy = best[1];
    c.cz = groupZ[c.accent] + (c.env * 4 - 6) + gauss() * 3;
    placed.push({ x: c.cx, y: c.cy, s: sig });
    c.werTarget = acc.baseWer * ENV_WER_MULT[c.env] * Math.exp(gauss() * 0.16) * (c.long ? 0.93 : 1.04);
    c.delta = -0.004 + gauss() * 0.0045;
    c.snrShift = gauss() * 1.2;
    c.confShift = gauss() * 0.02;
    clusters.push(c);
  }

  // a few realistic, milder regressions elsewhere
  for (const c of regular) {
    const code = ACCENTS[c.accent].code;
    if (code === 'en-IN' && c.env === 1) c.delta = 0.017 + gauss() * 0.004;
    if (code === 'es-US' && c.env === 0) c.delta = 0.011 + gauss() * 0.003;
    if (code === 'en-NG' && c.env === 0) c.delta = 0.022 + gauss() * 0.004;
    if (code === 'en-GH' && c.env === 2) c.delta = 0.014 + gauss() * 0.004;
  }

  clusters.sort((a, b) => a.id - b.id);
  const clusterById = new Map(clusters.map((c) => [c.id, c]));

  // ---- points ----
  const tr: TrainSet = {
    n: TOTAL_TRAIN_POINTS,
    x: new Float32Array(TOTAL_TRAIN_POINTS),
    y: new Float32Array(TOTAL_TRAIN_POINTS),
    z: new Float32Array(TOTAL_TRAIN_POINTS),
    cluster: new Uint16Array(TOTAL_TRAIN_POINTS),
    accent: new Uint8Array(TOTAL_TRAIN_POINTS),
    env: new Uint8Array(TOTAL_TRAIN_POINTS),
    vendor: new Uint8Array(TOTAL_TRAIN_POINTS),
    conf: new Float32Array(TOTAL_TRAIN_POINTS),
    dur: new Float32Array(TOTAL_TRAIN_POINTS),
  };
  const ev: EvalSet = {
    n: TOTAL_EVAL,
    x: new Float32Array(TOTAL_EVAL),
    y: new Float32Array(TOTAL_EVAL),
    z: new Float32Array(TOTAL_EVAL),
    cluster: new Uint16Array(TOTAL_EVAL),
    accent: new Uint8Array(TOTAL_EVAL),
    env: new Uint8Array(TOTAL_EVAL),
    vendor: new Uint8Array(TOTAL_EVAL),
    conf: new Float32Array(TOTAL_EVAL),
    snr: new Float32Array(TOTAL_EVAL),
    dur: new Float32Array(TOTAL_EVAL),
    wer41: new Float32Array(TOTAL_EVAL),
    wer42: new Float32Array(TOTAL_EVAL),
    female: new Uint8Array(TOTAL_EVAL),
  };

  const place = (c: Cluster, isTrain: boolean): [number, number, number] => {
    let u = gauss();
    let v = gauss();
    let ox = 0;
    let oy = 0;
    const roll = rng();
    if (roll < 0.03) {
      // bridge towards the accent's centre — gives the space organic connective tissue
      const acc = ACCENTS[c.accent];
      const t = rng() * 0.7;
      return [
        c.cx + (acc.center[0] - c.cx) * t + gauss() * 1.6,
        c.cy + (acc.center[1] - c.cy) * t + gauss() * 1.6,
        c.cz + gauss() * 4,
      ];
    }
    if (roll < 0.2) {
      ox = c.lobe[0];
      oy = c.lobe[1];
      u *= 0.6;
      v *= 0.6;
    }
    const cs = Math.cos(c.rot);
    const sn = Math.sin(c.rot);
    const dx = u * c.sx;
    const dy = v * c.sy;
    let x = c.cx + ox + dx * cs - dy * sn;
    let y = c.cy + oy + dx * sn + dy * cs;
    if (isTrain) {
      x += c.trainOffset[0];
      y += c.trainOffset[1];
      if (c.flagged) {
        // training data for the flagged clusters is thin and smeared out
        x += (x - c.cx - c.trainOffset[0]) * 0.35;
        y += (y - c.cy - c.trainOffset[1]) * 0.35;
      }
    }
    return [x, y, c.cz + gauss() * Math.max(c.sx, c.sy) * 0.9];
  };

  const durFor = (c: Cluster) =>
    clamp(c.long ? Math.exp(Math.log(12.5) + gauss() * 0.38) : Math.exp(Math.log(3.8) + gauss() * 0.4), 1.4, 30);

  const leakAccent = (c: Cluster, p: number) => {
    if (rng() < p) {
      const fam = FAMILY_MEMBERS[ACCENTS[c.accent].family];
      return fam[Math.floor(rng() * fam.length)];
    }
    return c.accent;
  };

  let ti = 0;
  let ei = 0;
  for (const c of clusters) {
    for (let k = 0; k < c.trainN; k++, ti++) {
      const [x, y, z] = place(c, true);
      tr.x[ti] = x;
      tr.y[ti] = y;
      tr.z[ti] = z;
      tr.cluster[ti] = c.id;
      tr.accent[ti] = leakAccent(c, 0.03);
      tr.env[ti] = rng() < 0.88 ? c.env : Math.floor(rng() * 4);
      const vd = pickWeighted(rng, c.vendor);
      tr.vendor[ti] = vd;
      tr.conf[ti] = clamp(VENDOR_CONF[vd] + c.confShift + gauss() * 0.065, 0.25, 0.995);
      tr.dur[ti] = durFor(c);
    }
    const start = ei;
    let sum41 = 0;
    let sumW = 0;
    const wts: number[] = [];
    for (let k = 0; k < c.evalN; k++, ei++) {
      const [x, y, z] = place(c, false);
      ev.x[ei] = x;
      ev.y[ei] = y;
      ev.z[ei] = z;
      ev.cluster[ei] = c.id;
      ev.accent[ei] = leakAccent(c, 0.04);
      const env = rng() < 0.9 ? c.env : Math.floor(rng() * 4);
      ev.env[ei] = env;
      const vd = rng() < 0.78 ? 3 : pickWeighted(rng, c.vendor);
      ev.vendor[ei] = vd;
      ev.conf[ei] = clamp(VENDOR_CONF[vd] + 0.03 + gauss() * 0.04, 0.4, 0.995);
      const snr = clamp(ENV_SNR[env] + c.snrShift + gauss() * 4.2, -4, 40);
      ev.snr[ei] = snr;
      ev.dur[ei] = durFor(c);
      ev.female[ei] = rng() < 0.5 ? 1 : 0;
      const raw = Math.exp(gauss() * 0.55) * (1 + Math.max(0, 14 - snr) * 0.03);
      ev.wer41[ei] = raw;
      sum41 += raw;
      const w = c.flagged ? 1 / (1 + Math.exp((snr - 7.5) / 2.2)) : 1;
      wts.push(w);
      sumW += w;
    }
    const scale = c.werTarget / (sum41 / c.evalN);
    const meanW = sumW / c.evalN;
    for (let k = 0; k < c.evalN; k++) {
      const i = start + k;
      const w41 = clamp(ev.wer41[i] * scale, 0, 1);
      ev.wer41[i] = w41;
      const d = c.flagged ? (c.delta * wts[k]) / meanW + gauss() * 0.035 : c.delta + gauss() * 0.022;
      ev.wer42[i] = clamp(w41 + d, 0, 1);
    }
  }

  // ---- per-cluster stats from the points ----
  const snrs: Map<number, number[]> = new Map();
  for (const c of clusters) {
    c.evalCount = 0;
    c.trainCount = 0;
    c.wer41 = 0;
    c.wer42 = 0;
    snrs.set(c.id, []);
  }
  for (let i = 0; i < ev.n; i++) {
    const c = clusterById.get(ev.cluster[i])!;
    c.evalCount++;
    c.wer41 += ev.wer41[i];
    c.wer42 += ev.wer42[i];
    snrs.get(c.id)!.push(ev.snr[i]);
  }
  for (let i = 0; i < tr.n; i++) clusterById.get(tr.cluster[i])!.trainCount += TRAIN_WEIGHT;
  for (const c of clusters) {
    c.wer41 /= c.evalCount;
    c.wer42 /= c.evalCount;
    const s = snrs.get(c.id)!.sort((a, b) => a - b);
    c.medianSnr = s[Math.floor(s.length / 2)];
    c.label = `${ACCENTS[c.accent].code} · ${ENV_SHORT[c.env]} · ${c.long ? 'long-form' : 'short'}`;
  }

  return { clusters, clusterById, ev, tr, trainTotal: TOTAL_TRAIN_POINTS * TRAIN_WEIGHT, evalTotal: TOTAL_EVAL };
}

export const DATA: Dataset = generate();

// ---------- clip identity helpers ----------
export function evalClipId(i: number) {
  return 'ev-' + String((i * 48271 + 104729) % 999983).padStart(6, '0');
}
export function speakerId(i: number) {
  return 'spk-' + (((i * 2654435761) >>> 0) % 46000 + 1200).toString(36).toUpperCase();
}

// ---------- regions ----------
export type RegionStatus = 'Queued' | 'In relabeling' | 'In collection' | 'Monitoring' | 'Closed';

export interface SavedRegion {
  id: string;
  name: string;
  owner: string;
  status: RegionStatus;
  created: string;
  updated: string;
  note: string;
  polygon: Polygon;
  ticket?: string;
  isNew?: boolean;
}

export const TEAM = [
  { name: 'Priyanka Oyelaran', role: 'Data quality lead', initials: 'PO' },
  { name: 'Ama Owusu', role: 'Annotator', initials: 'AO' },
  { name: 'Diego Salinas', role: 'Annotator', initials: 'DS' },
  { name: 'Mei Lin Zhao', role: 'Annotator', initials: 'MZ' },
  { name: 'Rahul Menon', role: 'Annotator', initials: 'RM' },
  { name: 'Sofia Lindqvist', role: 'Annotator', initials: 'SL' },
  { name: 'Jonah Weiss', role: 'ML engineer', initials: 'JW' },
];

export function hullForClusters(ids: number[], k = 2): Polygon {
  const pts: [number, number][] = [];
  for (const id of ids) {
    const c = DATA.clusterById.get(id)!;
    const cs = Math.cos(c.rot);
    const sn = Math.sin(c.rot);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const ex = Math.cos(a) * (c.sx * k + 0.6);
      const ey = Math.sin(a) * (c.sy * k + 0.6);
      pts.push([c.cx + ex * cs - ey * sn, c.cy + ex * sn + ey * cs]);
    }
    // include the secondary lobe so the outline follows the cluster's real shape
    pts.push([c.cx + c.lobe[0] * 1.5, c.cy + c.lobe[1] * 1.5]);
  }
  return convexHull(pts);
}

function pickClusters(accentCodes: string[], env: number | null, n: number, near?: [number, number]): number[] {
  const cand = DATA.clusters.filter(
    (c) => !c.special && accentCodes.includes(ACCENTS[c.accent].code) && (env === null || c.env === env),
  );
  if (!cand.length) return [];
  const ref = near ?? [cand[0].cx, cand[0].cy];
  cand.sort((a, b) => Math.hypot(a.cx - ref[0], a.cy - ref[1]) - Math.hypot(b.cx - ref[0], b.cy - ref[1]));
  const seed = cand[0];
  return cand
    .filter((c) => Math.hypot(c.cx - seed.cx, c.cy - seed.cy) < 15)
    .slice(0, n)
    .map((c) => c.id);
}

export const FLAG_POLYGON: Polygon = hullForClusters(FLAGGED_CLUSTERS, 2.05);

export function initialSavedRegions(): SavedRegion[] {
  const esMx = ACCENTS[ACCENT_INDEX['es-MX']].center;
  const enUs = ACCENTS[ACCENT_INDEX['en-US']].center;
  const hi = ACCENTS[ACCENT_INDEX['hi-IN']].center;
  const enGb = ACCENTS[ACCENT_INDEX['en-GB']].center;
  const out: SavedRegion[] = [];
  const add = (r: Omit<SavedRegion, 'polygon'>, ids: number[], k = 1.9) => {
    if (ids.length) out.push({ ...r, polygon: hullForClusters(ids, k) });
  };
  add(
    {
      id: 'DR-0031',
      name: 'Car-kit Spanish',
      owner: 'Diego Salinas',
      status: 'Closed',
      created: '2 Jun 2026',
      updated: '25 Aug 2026',
      note: 'Bluetooth car-kit clips relabeled (14.2k) and 22k new clips collected. Closed after v39: −3.1 pts WER.',
      ticket: 'DQ-1022',
    },
    pickClusters(['es-MX', 'es-US'], 0, 3, [esMx[0] + 10, esMx[1] + 8]),
  );
  add(
    {
      id: 'DR-0044',
      name: 'Overlapping speakers',
      owner: 'Mei Lin Zhao',
      status: 'In relabeling',
      created: '6 Oct 2026',
      updated: '13 Nov 2026',
      note: 'Crosstalk in call-center audio labeled as single speaker. Vendor second pass is 61% done.',
      ticket: 'DQ-1139',
    },
    pickClusters(['en-US'], 2, 3, [enUs[0] + 6, enUs[1] + 12]),
  );
  add(
    {
      id: 'DR-0039',
      name: 'Hindi–English code-switching',
      owner: 'Rahul Menon',
      status: 'In collection',
      created: '15 Sep 2026',
      updated: '10 Nov 2026',
      note: 'Targeted collection: 38k of 60k clips received. Relabeling done with the new mixed-script guidelines.',
      ticket: 'DQ-1104',
    },
    pickClusters(['hi-IN', 'en-IN'], null, 3, [(hi[0] * 2 + -50) / 3 + 4, hi[1] - 6]),
  );
  add(
    {
      id: 'DR-0027',
      name: 'Hold-music bleed',
      owner: 'Ama Owusu',
      status: 'Closed',
      created: '12 May 2026',
      updated: '30 Jun 2026',
      note: 'Removed 6.1k training clips with music under speech. No regression since v37.',
      ticket: 'DQ-0987',
    },
    pickClusters(['en-GB'], 2, 2, [enGb[0] + 4, enGb[1] + 6]),
  );
  add(
    {
      id: 'DR-0036',
      name: 'Child speech, quiet room',
      owner: 'Sofia Lindqvist',
      status: 'Monitoring',
      created: '18 Aug 2026',
      updated: '14 Nov 2026',
      note: 'Being watched since the v40 fix. Flat in v41 and v42 (+0.2 pts, within noise).',
      ticket: 'DQ-1071',
    },
    pickClusters(['en-US'], 3, 2, [enUs[0] - 10, enUs[1] - 10]),
  );
  add(
    {
      id: 'DR-0029',
      name: 'Scottish English in cars',
      owner: 'Jonah Weiss',
      status: 'Closed',
      created: '28 May 2026',
      updated: '4 Aug 2026',
      note: 'Fixed in v38 by adding car-noise augmentation to existing Scottish clips. No new collection was needed.',
      ticket: 'DQ-1003',
    },
    pickClusters(['en-SC'], null, 2),
  );
  add(
    {
      id: 'DR-0042',
      name: 'Low-bitrate VoIP (8 kHz)',
      owner: 'Priyanka Oyelaran',
      status: 'In relabeling',
      created: '29 Sep 2026',
      updated: '12 Nov 2026',
      note: 'Narrowband call audio transcribed as if wideband. 9.4k of 15k clips relabeled.',
      ticket: 'DQ-1121',
    },
    pickClusters(['en-PH'], 2, 3),
  );
  return out;
}

export const STATUS_COLORS: Record<RegionStatus, string> = {
  Queued: '#f2c14e',
  'In relabeling': '#b48cf2',
  'In collection': '#5aa9f0',
  Monitoring: '#7fc8a9',
  Closed: '#7c8790',
};
