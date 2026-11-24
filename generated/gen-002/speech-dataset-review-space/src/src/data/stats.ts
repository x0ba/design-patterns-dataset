import { DATA, TRAIN_WEIGHT } from './model';
import { bbox, pointInPolygon, Polygon } from './geometry';

export const SNR_BANDS = [
  { label: '< 5 dB', lo: -99, hi: 5 },
  { label: '5–10 dB', lo: 5, hi: 10 },
  { label: '10–20 dB', lo: 10, hi: 20 },
  { label: '≥ 20 dB', lo: 20, hi: 99 },
];

export interface RegionStats {
  evalIdx: Int32Array;
  evalCount: number;
  trainCount: number;
  trainPerEval: number;
  wer41: number;
  wer42: number;
  delta: number;
  regressedShare: number;
  medianSnr: number;
  trainConf: number;
  lowConfTrain: number;
  vendorMix: number[];
  envMix: number[];
  accentMix: { accent: number; share: number }[];
  snrBands: { label: string; n: number; wer41: number; wer42: number }[];
  trainHours: number;
  evalMeanDur: number;
  clusters: { id: number; n: number }[];
}

const cache = new WeakMap<Polygon, RegionStats>();

export function regionStats(poly: Polygon): RegionStats {
  const hit = cache.get(poly);
  if (hit) return hit;
  const { ev, tr } = DATA;
  const b = bbox(poly);
  const idx: number[] = [];
  let s41 = 0;
  let s42 = 0;
  let reg = 0;
  let durSum = 0;
  const envC = [0, 0, 0, 0];
  const accC = new Map<number, number>();
  const cl = new Map<number, number>();
  const bands = SNR_BANDS.map((bd) => ({ label: bd.label, n: 0, wer41: 0, wer42: 0 }));
  const snrs: number[] = [];
  for (let i = 0; i < ev.n; i++) {
    const x = ev.x[i];
    const y = ev.y[i];
    if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
    if (!pointInPolygon(x, y, poly)) continue;
    idx.push(i);
    s41 += ev.wer41[i];
    s42 += ev.wer42[i];
    if (ev.wer42[i] - ev.wer41[i] >= 0.1) reg++;
    durSum += ev.dur[i];
    envC[ev.env[i]]++;
    accC.set(ev.accent[i], (accC.get(ev.accent[i]) || 0) + 1);
    cl.set(ev.cluster[i], (cl.get(ev.cluster[i]) || 0) + 1);
    const snr = ev.snr[i];
    snrs.push(snr);
    for (let k = 0; k < SNR_BANDS.length; k++) {
      if (snr >= SNR_BANDS[k].lo && snr < SNR_BANDS[k].hi) {
        bands[k].n++;
        bands[k].wer41 += ev.wer41[i];
        bands[k].wer42 += ev.wer42[i];
        break;
      }
    }
  }
  let tN = 0;
  let confSum = 0;
  let lowConf = 0;
  let tDur = 0;
  const vend = [0, 0, 0, 0];
  for (let i = 0; i < tr.n; i++) {
    const x = tr.x[i];
    const y = tr.y[i];
    if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
    if (!pointInPolygon(x, y, poly)) continue;
    tN++;
    confSum += tr.conf[i];
    if (tr.conf[i] < 0.8) lowConf++;
    vend[tr.vendor[i]]++;
    tDur += tr.dur[i];
  }
  const n = idx.length;
  snrs.sort((a, c) => a - c);
  for (const bd of bands) {
    if (bd.n) {
      bd.wer41 /= bd.n;
      bd.wer42 /= bd.n;
    }
  }
  const accentMix = [...accC.entries()]
    .map(([accent, c]) => ({ accent, share: c / Math.max(1, n) }))
    .sort((a, c) => c.share - a.share);
  const stats: RegionStats = {
    evalIdx: Int32Array.from(idx),
    evalCount: n,
    trainCount: tN * TRAIN_WEIGHT,
    trainPerEval: n ? (tN * TRAIN_WEIGHT) / n : 0,
    wer41: n ? s41 / n : 0,
    wer42: n ? s42 / n : 0,
    delta: n ? (s42 - s41) / n : 0,
    regressedShare: n ? reg / n : 0,
    medianSnr: n ? snrs[Math.floor(n / 2)] : 0,
    trainConf: tN ? confSum / tN : 0,
    lowConfTrain: lowConf * TRAIN_WEIGHT,
    vendorMix: vend.map((v) => (tN ? v / tN : 0)),
    envMix: envC.map((v) => (n ? v / n : 0)),
    accentMix,
    snrBands: bands,
    trainHours: (tDur * TRAIN_WEIGHT) / 3600,
    evalMeanDur: n ? durSum / n : 0,
    clusters: [...cl.entries()].map(([id, c]) => ({ id, n: c })).sort((a, c) => c.n - a.n),
  };
  cache.set(poly, stats);
  return stats;
}

/** Overall train-per-eval ratio — the coverage the dataset has on average. */
export const DATASET_TRAIN_PER_EVAL = DATA.trainTotal / DATA.evalTotal;

/** Local coverage: training clips per eval clip in a neighbourhood around each eval point. */
export function computeCoverage(): Float32Array {
  const { ev, tr } = DATA;
  const G = 120;
  const lo = -105;
  const size = 210 / G;
  const tc = new Float32Array(G * G);
  const ec = new Float32Array(G * G);
  const cell = (x: number, y: number) => {
    const gx = Math.min(G - 1, Math.max(0, Math.floor((x - lo) / size)));
    const gy = Math.min(G - 1, Math.max(0, Math.floor((y - lo) / size)));
    return gy * G + gx;
  };
  for (let i = 0; i < tr.n; i++) tc[cell(tr.x[i], tr.y[i])] += TRAIN_WEIGHT;
  for (let i = 0; i < ev.n; i++) ec[cell(ev.x[i], ev.y[i])] += 1;
  // 3x3 smoothing
  const blur = (a: Float32Array) => {
    const o = new Float32Array(a.length);
    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < G && yy < G) s += a[yy * G + xx];
          }
        o[y * G + x] = s;
      }
    return o;
  };
  const tb = blur(tc);
  const eb = blur(ec);
  const out = new Float32Array(ev.n);
  for (let i = 0; i < ev.n; i++) {
    const c = cell(ev.x[i], ev.y[i]);
    out[i] = tb[c] / Math.max(1, eb[c]);
  }
  return out;
}
