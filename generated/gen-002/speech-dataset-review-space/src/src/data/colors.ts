import { ACCENTS, DATA, ENVS, VENDORS } from './model';
import { computeCoverage } from './stats';
import { mulberry32 } from './rng';

export type ColorBy = 'delta' | 'wer42' | 'coverage' | 'snr' | 'env' | 'accent' | 'vendor' | 'conf';

export const COLOR_MODES: { key: ColorBy; label: string; target: 'eval' | 'train'; hint: string }[] = [
  { key: 'delta', label: 'WER change v41 → v42', target: 'eval', hint: 'Eval clips by per-clip WER change' },
  { key: 'wer42', label: 'WER v42', target: 'eval', hint: 'Eval clips by v42 word error rate' },
  { key: 'coverage', label: 'Training coverage', target: 'eval', hint: 'Training clips per eval clip nearby' },
  { key: 'snr', label: 'Signal-to-noise', target: 'eval', hint: 'Eval clips by SNR' },
  { key: 'env', label: 'Recording environment', target: 'eval', hint: 'Eval clips by environment' },
  { key: 'accent', label: 'Language & accent', target: 'eval', hint: 'Eval clips by accent label' },
  { key: 'vendor', label: 'Labeling vendor', target: 'train', hint: 'Training clips by labeling vendor' },
  { key: 'conf', label: 'Label confidence', target: 'train', hint: 'Training clips by label confidence' },
];

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export function ramp(stops: [number, string][], v: number): RGB {
  if (v <= stops[0][0]) return hex(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1];
      const [b, cb] = stops[i];
      const t = (v - a) / (b - a);
      const x = hex(ca);
      const y = hex(cb);
      return [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
    }
  }
  return hex(stops[stops.length - 1][1]);
}

export const DELTA_STOPS: [number, string][] = [
  [-12, '#2fb5a6'],
  [-3, '#5f8f8c'],
  [0, '#6f7a80'],
  [4, '#a88a5c'],
  [10, '#f08a3c'],
  [22, '#ff4f6a'],
];
export const WER_STOPS: [number, string][] = [
  [0, '#355a6b'],
  [8, '#4f8b87'],
  [16, '#d9b04f'],
  [28, '#f0703c'],
  [45, '#ff3f6c'],
];
export const SNR_STOPS: [number, string][] = [
  [0, '#ff4f6a'],
  [8, '#f0a03c'],
  [16, '#c7c27a'],
  [26, '#5aa9c8'],
  [36, '#4a6fb0'],
];
export const COVERAGE_STOPS: [number, string][] = [
  [0, '#ff4f6a'],
  [0.6, '#f08a3c'],
  [1.1, '#d9c27a'],
  [1.5, '#6fb6a6'],
  [2, '#4f86b0'],
];
export const CONF_STOPS: [number, string][] = [
  [0.55, '#ff4f6a'],
  [0.72, '#f0a03c'],
  [0.85, '#a7b38a'],
  [0.95, '#5aa9c8'],
];

export const ENV_COLORS = ['#e2a84f', '#ef6f6c', '#7aa6f0', '#79c99e'];
export const VENDOR_COLORS = ['#7aa6f0', '#c79cf0', '#f0883e', '#79c99e'];
export const A_COLOR = '#ffb547';
export const B_COLOR = '#6cc5f0';

const ACCENT_HEX: Record<string, string> = {
  'en-US': '#6f9bd8',
  'en-GB': '#8fb3e8',
  'en-AU': '#5c7fc0',
  'en-SC': '#a9c4f0',
  'en-IN': '#c49cf0',
  'en-PH': '#a17fd8',
  'en-NG': '#ff7a59',
  'en-GH': '#f2c14e',
  'en-KE': '#4fc1a6',
  'en-ZA': '#e07fb0',
  'es-MX': '#8bcf6a',
  'es-US': '#b7dc7a',
  'es-ES': '#6fb35a',
  'es-CO': '#a2c95a',
  'pt-BR': '#57b88f',
  'fr-FR': '#e8a0c8',
  'fr-CA': '#d488b0',
  'de-DE': '#d9d27a',
  'hi-IN': '#b48cf2',
  'ar-EG': '#e8b98a',
  'ja-JP': '#f08a8a',
  'zh-CN': '#e86f6f',
};
export const ACCENT_COLORS = ACCENTS.map((a) => ACCENT_HEX[a.code] || '#999999');

const pack = (c: RGB, a = 255) => ((a << 24) | (Math.round(c[2]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[0])) >>> 0;

let coverage: Float32Array | null = null;
export function getCoverage() {
  if (!coverage) coverage = computeCoverage();
  return coverage;
}

const shuffleEval = (() => {
  const r = mulberry32(7);
  const a = Int32Array.from({ length: DATA.ev.n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
})();
const shuffleTrain = (() => {
  const r = mulberry32(11);
  const a = Int32Array.from({ length: DATA.tr.n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
})();

export interface Coloring {
  evColor: Uint32Array;
  evOrder: Int32Array;
  trColor: Uint32Array | null;
  trOrder: Int32Array | null;
}

const memo = new Map<ColorBy, Coloring>();

export function coloringFor(mode: ColorBy): Coloring {
  const hit = memo.get(mode);
  if (hit) return hit;
  const { ev, tr } = DATA;
  const evColor = new Uint32Array(ev.n);
  let key: Float32Array | null = null;
  const NEUTRAL = pack(hex('#55606a'));
  if (mode === 'delta') {
    key = new Float32Array(ev.n);
    for (let i = 0; i < ev.n; i++) {
      const d = (ev.wer42[i] - ev.wer41[i]) * 100;
      key[i] = d;
      evColor[i] = pack(ramp(DELTA_STOPS, d));
    }
  } else if (mode === 'wer42') {
    key = new Float32Array(ev.n);
    for (let i = 0; i < ev.n; i++) {
      key[i] = ev.wer42[i];
      evColor[i] = pack(ramp(WER_STOPS, ev.wer42[i] * 100));
    }
  } else if (mode === 'snr') {
    key = new Float32Array(ev.n);
    for (let i = 0; i < ev.n; i++) {
      key[i] = -ev.snr[i];
      evColor[i] = pack(ramp(SNR_STOPS, ev.snr[i]));
    }
  } else if (mode === 'coverage') {
    const cov = getCoverage();
    key = new Float32Array(ev.n);
    for (let i = 0; i < ev.n; i++) {
      const l = Math.log10(Math.max(0.5, cov[i]));
      key[i] = -l;
      evColor[i] = pack(ramp(COVERAGE_STOPS, l));
    }
  } else if (mode === 'env') {
    const cs = ENV_COLORS.map((h) => pack(hex(h)));
    for (let i = 0; i < ev.n; i++) evColor[i] = cs[ev.env[i]];
  } else if (mode === 'accent') {
    const cs = ACCENT_COLORS.map((h) => pack(hex(h)));
    for (let i = 0; i < ev.n; i++) evColor[i] = cs[ev.accent[i]];
  } else {
    for (let i = 0; i < ev.n; i++) evColor[i] = NEUTRAL;
  }
  let evOrder = shuffleEval;
  if (key) {
    const k = key;
    evOrder = Int32Array.from(shuffleEval).sort((a, b) => k[a] - k[b]);
  }

  let trColor: Uint32Array | null = null;
  let trOrder: Int32Array | null = null;
  if (mode === 'vendor') {
    const cs = VENDOR_COLORS.map((h) => pack(hex(h), 220));
    trColor = new Uint32Array(tr.n);
    for (let i = 0; i < tr.n; i++) trColor[i] = cs[tr.vendor[i]];
    trOrder = shuffleTrain;
  } else if (mode === 'conf') {
    trColor = new Uint32Array(tr.n);
    for (let i = 0; i < tr.n; i++) trColor[i] = pack(ramp(CONF_STOPS, tr.conf[i]), 230);
    const c = tr.conf;
    trOrder = Int32Array.from(shuffleTrain).sort((a, b) => c[b] - c[a]);
  }
  const out = { evColor, evOrder, trColor, trOrder };
  memo.set(mode, out);
  return out;
}

export function legendFor(mode: ColorBy):
  | { kind: 'ramp'; stops: [number, string][]; ticks: { v: number; label: string }[]; lo: string; hi: string }
  | { kind: 'cat'; items: { color: string; label: string }[] } {
  switch (mode) {
    case 'delta':
      return {
        kind: 'ramp',
        stops: DELTA_STOPS,
        ticks: [
          { v: -10, label: '−10' },
          { v: 0, label: '0' },
          { v: 10, label: '+10' },
          { v: 20, label: '+20 pts' },
        ],
        lo: 'improved',
        hi: 'regressed',
      };
    case 'wer42':
      return {
        kind: 'ramp',
        stops: WER_STOPS,
        ticks: [
          { v: 0, label: '0%' },
          { v: 15, label: '15%' },
          { v: 30, label: '30%' },
          { v: 45, label: '45%+' },
        ],
        lo: 'low error',
        hi: 'high error',
      };
    case 'snr':
      return {
        kind: 'ramp',
        stops: SNR_STOPS,
        ticks: [
          { v: 0, label: '0 dB' },
          { v: 10, label: '10' },
          { v: 20, label: '20' },
          { v: 35, label: '35 dB' },
        ],
        lo: 'noisy',
        hi: 'clean',
      };
    case 'coverage':
      return {
        kind: 'ramp',
        stops: COVERAGE_STOPS,
        ticks: [
          { v: 0, label: '1' },
          { v: 1, label: '10' },
          { v: 1.5, label: '30' },
          { v: 2, label: '100' },
        ],
        lo: 'train clips per eval clip: few',
        hi: 'many',
      };
    case 'conf':
      return {
        kind: 'ramp',
        stops: CONF_STOPS,
        ticks: [
          { v: 0.6, label: '0.60' },
          { v: 0.75, label: '0.75' },
          { v: 0.9, label: '0.90' },
        ],
        lo: 'training labels: low confidence',
        hi: 'high',
      };
    case 'env':
      return { kind: 'cat', items: ENVS.map((e, i) => ({ color: ENV_COLORS[i], label: e })) };
    case 'vendor':
      return { kind: 'cat', items: VENDORS.map((e, i) => ({ color: VENDOR_COLORS[i], label: e })) };
    case 'accent':
      return { kind: 'cat', items: ACCENTS.map((a, i) => ({ color: ACCENT_COLORS[i], label: a.code })) };
  }
}
