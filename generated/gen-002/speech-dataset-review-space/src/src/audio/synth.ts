// Client-side "speech in noise" synthesis so clips can actually be played aloud in the review.
// A formant voice reads the transcript's syllable rhythm; a noise bed matching the recording
// environment is mixed in at the clip's labelled SNR.
import { mulberry32, gaussFactory, hashStr } from '../data/rng';

export const SR = 16000;

const VOWELS: [number, number, number][] = [
  [730, 1090, 2440],
  [270, 2290, 3010],
  [300, 870, 2240],
  [530, 1840, 2480],
  [570, 840, 2410],
  [440, 1020, 2240],
  [660, 1720, 2410],
  [490, 1350, 1690],
];

function syllables(word: string): number {
  if (/[぀-ヿ一-鿿]/.test(word)) return 1;
  if (/[ऀ-ॿ؀-ۿ]/.test(word)) return Math.max(1, Math.round(word.length / 2.2));
  const m = word.toLowerCase().match(/[aeiouyáéíóúâêôãõàèùäöü]+/g);
  return Math.max(1, Math.min(6, m ? m.length : 1));
}

class Resonator {
  y1 = 0;
  y2 = 0;
  a0 = 0;
  b1 = 0;
  b2 = 0;
  set(f: number, bw: number) {
    const r = Math.exp((-Math.PI * bw) / SR);
    this.b1 = 2 * r * Math.cos((2 * Math.PI * f) / SR);
    this.b2 = -r * r;
    this.a0 = 1 - r;
  }
  run(x: number) {
    const y = this.a0 * x + this.b1 * this.y1 + this.b2 * this.y2;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

interface Syl {
  start: number;
  end: number;
  onset: 0 | 1 | 2 | 3; // none, plosive, fricative, nasal
  vowel: number;
  stress: number;
}

function voice(out: Float32Array, syls: Syl[], f0Base: number, rng: () => number, gain = 1) {
  const gauss = gaussFactory(rng);
  const r1 = new Resonator();
  const r2 = new Resonator();
  const r3 = new Resonator();
  const fr = new Resonator();
  fr.set(4800, 2200);
  let phase = 0;
  let prevSrc = 0;
  let F = VOWELS[0].slice() as number[];
  let si = 0;
  const vibPhase = rng() * 6;
  const total = out.length;
  for (let n = 0; n < total; n++) {
    while (si < syls.length - 1 && n >= syls[si].end) si++;
    const s = syls[si];
    if (!s || n < s.start - 400 || n > s.end + 400) {
      // silence between phrases — keep filters decaying
      out[n] += 0;
      continue;
    }
    const t = n / SR;
    const local = (n - s.start) / Math.max(1, s.end - s.start);
    const target = VOWELS[s.vowel];
    if ((n & 15) === 0) {
      for (let k = 0; k < 3; k++) F[k] += (target[k] - F[k]) * 0.18;
      r1.set(F[0], 80);
      r2.set(F[1], 110);
      r3.set(F[2], 160);
    }
    // amplitude envelope of the syllable
    let env = 0;
    if (n >= s.start && n < s.end) {
      const a = Math.min(1, local / 0.18);
      const r = Math.min(1, (1 - local) / 0.25);
      env = Math.max(0, Math.min(a, r)) * s.stress;
    }
    const onsetLen = 0.28;
    const voicedEnv = s.onset === 2 && local < onsetLen ? env * 0.15 : env;
    // pitch
    const f0 = f0Base * (1 + 0.09 * Math.sin(t * 2.1 + vibPhase) + 0.05 * (s.stress - 0.8) + gauss() * 0.004);
    phase += f0 / SR;
    if (phase >= 1) phase -= 1;
    const glottal = phase < 0.55 ? Math.sin((Math.PI * phase) / 0.55) ** 2 : 0;
    const src = (glottal - prevSrc) * 6 + gauss() * 0.02;
    prevSrc = glottal;
    let v = (r1.run(src) * 1.0 + r2.run(src) * 0.6 + r3.run(src) * 0.3) * voicedEnv;
    if (s.onset === 3 && local < 0.25) v *= 0.5;
    // consonant noise
    let c = 0;
    if (s.onset === 2 && local < onsetLen) c = fr.run(gauss()) * 1.6 * Math.sin((Math.PI * local) / onsetLen);
    else if (s.onset === 1 && local < 0.06) c = gauss() * 0.35 * (1 - local / 0.06);
    out[n] += (v * 1.8 + c * 0.6) * gain;
  }
}

function makeSchedule(
  words: string[],
  dur: number,
  rng: () => number,
): { syls: Syl[]; wordTimes: [number, number][] } {
  const gauss = gaussFactory(rng);
  const lead = 0.25 + rng() * 0.3;
  const tail = 0.3;
  const sylDur = 0.17;
  const counts = words.map(syllables);
  const totalSyl = counts.reduce((a, b) => a + b, 0);
  const pauses = words.length * 0.05 + Math.floor(words.length / 6) * 0.22;
  const natural = totalSyl * sylDur + pauses;
  const avail = Math.max(0.6, dur - lead - tail);
  let k = avail / natural;
  k = Math.min(1.35, Math.max(0.55, k));
  const syls: Syl[] = [];
  const wordTimes: [number, number][] = [];
  let t = lead;
  words.forEach((w, wi) => {
    const ws = t;
    for (let s = 0; s < counts[wi]; s++) {
      const d = sylDur * k * (0.8 + rng() * 0.45);
      syls.push({
        start: Math.floor(t * SR),
        end: Math.floor((t + d) * SR),
        onset: Math.floor(rng() * 4) as 0 | 1 | 2 | 3,
        vowel: Math.floor(rng() * VOWELS.length),
        stress: s === 0 ? 1 : 0.7 + Math.abs(gauss()) * 0.15,
      });
      t += d;
    }
    wordTimes.push([ws, t]);
    t += 0.05 * k;
    if ((wi + 1) % 6 === 0) t += 0.22 * k;
  });
  return { syls, wordTimes };
}

function randomSchedule(dur: number, rng: () => number): Syl[] {
  const syls: Syl[] = [];
  let t = rng() * 0.8;
  while (t < dur) {
    const phrase = 3 + Math.floor(rng() * 8);
    for (let s = 0; s < phrase && t < dur; s++) {
      const d = 0.15 + rng() * 0.12;
      syls.push({
        start: Math.floor(t * SR),
        end: Math.floor(Math.min(dur, t + d) * SR),
        onset: Math.floor(rng() * 4) as 0 | 1 | 2 | 3,
        vowel: Math.floor(rng() * VOWELS.length),
        stress: 0.6 + rng() * 0.4,
      });
      t += d + 0.03;
    }
    t += 0.2 + rng() * 0.9;
  }
  return syls;
}

function noiseBed(n: number, env: number, rng: () => number): Float32Array {
  const gauss = gaussFactory(rng);
  const out = new Float32Array(n);
  // pink (Kellet) + brown
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  let brown = 0;
  const lfoA = rng() * 6;
  const lfoB = rng() * 6;
  for (let i = 0; i < n; i++) {
    const w = gauss() * 0.3;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.2;
    b6 = w * 0.115926;
    brown = (brown + w * 0.06) * 0.996;
    const t = i / SR;
    if (env === 1) {
      // street: traffic swells + rumble + hiss
      const swell = 0.55 + 0.45 * Math.sin(t * 0.7 + lfoA) * Math.sin(t * 0.23 + lfoB);
      out[i] = pink * 0.9 * swell + brown * 2.2 * (0.6 + swell * 0.6) + w * 0.05;
    } else if (env === 0) {
      // car cabin: engine harmonics + low road roar
      const rpm = 34 + 4 * Math.sin(t * 0.4 + lfoA);
      const engine = Math.sin(2 * Math.PI * rpm * t) * 0.35 + Math.sin(4 * Math.PI * rpm * t) * 0.18;
      out[i] = brown * 3.2 + engine * 0.25 + pink * 0.25;
    } else if (env === 2) {
      out[i] = pink * 0.35 + w * 0.03;
    } else {
      // quiet room: faint hiss + mains hum
      out[i] = w * 0.06 + Math.sin(2 * Math.PI * 50 * t) * 0.01 + brown * 0.2;
    }
  }
  if (env === 1) {
    // horns and passing motorbikes
    const events = Math.max(1, Math.round((n / SR) / 5));
    for (let e = 0; e < events; e++) {
      const at = Math.floor(rng() * n);
      const len = Math.floor((0.25 + rng() * 0.5) * SR);
      const f = 360 + rng() * 140;
      const moto = rng() < 0.5;
      for (let i = 0; i < len && at + i < n; i++) {
        const tt = i / SR;
        const envl = Math.sin((Math.PI * i) / len);
        const s = moto
          ? Math.sign(Math.sin(2 * Math.PI * (90 + 40 * (i / len)) * tt)) * 0.12
          : (Math.sign(Math.sin(2 * Math.PI * f * tt)) + Math.sign(Math.sin(2 * Math.PI * f * 1.26 * tt))) * 0.09;
        out[at + i] += s * envl;
      }
    }
  }
  if (env === 1 || env === 2) {
    // background talkers
    const talkers = env === 2 ? 3 : 2;
    for (let k = 0; k < talkers; k++) {
      const syls = randomSchedule(n / SR, rng);
      voice(out, syls, 100 + rng() * 120, rng, env === 2 ? 0.22 : 0.16);
    }
  }
  return out;
}

function rms(a: Float32Array) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== 0) {
      s += a[i] * a[i];
      c++;
    }
  }
  return Math.sqrt(s / Math.max(1, c));
}

function telephone(a: Float32Array) {
  // crude 300–3400 Hz band-limit
  let lp1 = 0;
  let lp2 = 0;
  let hpPrevX = 0;
  let hpPrevY = 0;
  const aL = Math.exp((-2 * Math.PI * 3400) / SR);
  const aH = Math.exp((-2 * Math.PI * 300) / SR);
  for (let i = 0; i < a.length; i++) {
    lp1 = (1 - aL) * a[i] + aL * lp1;
    lp2 = (1 - aL) * lp1 + aL * lp2;
    const y = aH * (hpPrevY + lp2 - hpPrevX);
    hpPrevX = lp2;
    hpPrevY = y;
    a[i] = y;
  }
}

export interface SynthClip {
  samples: Float32Array;
  duration: number;
  wordTimes: [number, number][];
  peaks: Float32Array; // 600 buckets, max abs
}

const cache = new Map<string, SynthClip>();

export function synthesize(opts: {
  key: string;
  duration: number;
  env: number;
  snr: number;
  female: boolean;
  words: string[];
}): SynthClip {
  const hit = cache.get(opts.key);
  if (hit) return hit;
  const rng = mulberry32(hashStr(opts.key));
  const n = Math.floor(opts.duration * SR);
  const speech = new Float32Array(n);
  const { syls, wordTimes } = makeSchedule(opts.words, opts.duration, rng);
  voice(speech, syls, opts.female ? 196 + rng() * 30 : 108 + rng() * 22, rng, 1);
  const noise = noiseBed(n, opts.env, rng);
  const sR = rms(speech);
  const nR = rms(noise);
  const g = sR / Math.max(1e-6, nR) / Math.pow(10, opts.snr / 20);
  const mix = new Float32Array(n);
  for (let i = 0; i < n; i++) mix[i] = speech[i] + noise[i] * g;
  if (opts.env === 2) telephone(mix);
  // loudness normalise + soft clip
  const m = rms(mix);
  const k = 0.11 / Math.max(1e-6, m);
  for (let i = 0; i < n; i++) mix[i] = Math.tanh(mix[i] * k * 1.2) * 0.85;
  const B = 600;
  const peaks = new Float32Array(B);
  const per = n / B;
  for (let b = 0; b < B; b++) {
    let mx = 0;
    const s0 = Math.floor(b * per);
    const s1 = Math.min(n, Math.floor((b + 1) * per));
    for (let i = s0; i < s1; i++) {
      const v = Math.abs(mix[i]);
      if (v > mx) mx = v;
    }
    peaks[b] = mx;
  }
  const out = { samples: mix, duration: opts.duration, wordTimes, peaks };
  cache.set(opts.key, out);
  return out;
}

// ---- playback ----
class Player {
  ctx: AudioContext | null = null;
  src: AudioBufferSourceNode | null = null;
  gain: GainNode | null = null;
  startedAt = 0;
  offset = 0;
  clipKey: string | null = null;
  playing = false;
  onEnded: (() => void) | null = null;

  ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.9;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  play(key: string, clip: SynthClip, from = 0) {
    const ctx = this.ensure();
    this.stopSource();
    const buf = ctx.createBuffer(1, clip.samples.length, SR);
    buf.copyToChannel(clip.samples as Float32Array<ArrayBuffer>, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain!);
    const off = Math.max(0, Math.min(clip.duration - 0.05, from));
    src.start(0, off);
    this.startedAt = ctx.currentTime - off;
    this.src = src;
    this.clipKey = key;
    this.playing = true;
    src.onended = () => {
      if (this.src === src) {
        this.playing = false;
        this.offset = 0;
        this.src = null;
        this.onEnded?.();
      }
    };
  }

  pause() {
    if (!this.ctx || !this.playing) return;
    this.offset = this.ctx.currentTime - this.startedAt;
    this.stopSource();
    this.playing = false;
  }

  stopSource() {
    if (this.src) {
      const s = this.src;
      this.src = null;
      try {
        s.onended = null;
        s.stop();
      } catch {
        /* already stopped */
      }
    }
  }

  position() {
    if (!this.ctx) return this.offset;
    return this.playing ? this.ctx.currentTime - this.startedAt : this.offset;
  }
}

export const player = new Player();
