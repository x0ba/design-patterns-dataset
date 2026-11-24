// Core types + pure helpers for the Ondita editor.

export type ClipKind = 'narration' | 'interview' | 'ambience' | 'music' | 'pickup';
export type Tense = 'p' | 'i';

export interface Word {
  text: string;
  t0: number;
  t1: number;
  spk: string;
  u: number; // utterance index
  tense?: Tense;
  low?: boolean; // low transcription confidence
}

export interface Utt {
  spk: string;
  start: number;
  end: number;
  text: string;
}

export interface SoundEvent {
  t: number;
  label: string;
}

export interface Clip {
  id: string;
  name: string;
  short: string;
  kind: ClipKind;
  duration: number;
  color: string;
  speakers: Record<string, string>;
  utts: Utt[];
  words: Word[];
  events: SoundEvent[];
  peaks: number[];
  recorded: string;
  note?: string;
  library?: string;
  takeGroup?: string;
  takeNo?: number;
  audioUrl?: string;
  fromScript?: boolean;
  ownVoice: boolean;
}

export type Track = 'voice' | 'bed';

export interface Segment {
  id: string;
  clipId: string;
  track: Track;
  in: number;
  out: number;
  start: number; // only meaningful for bed segments
  gain: number; // dB
}

export interface Placed extends Segment {
  pos: number;
  len: number;
}

export interface Doc {
  clips: Clip[];
  segs: Segment[];
}

export const PEAK_RATE = 20;
export const TARGET_MIN = 180;
export const TARGET_MAX = 240;
const EPS = 0.02;

let uidN = 0;
export const uid = (p = 's') => `${p}${Date.now().toString(36)}${(uidN++).toString(36)}`;

export function fmt(s: number): string {
  const neg = s < 0;
  s = Math.abs(s);
  const r = Math.round(s);
  const m = Math.floor(r / 60);
  const ss = r % 60;
  return `${neg ? '−' : ''}${m}:${ss.toString().padStart(2, '0')}`;
}

export function fmtPrecise(s: number): string {
  s = Math.max(0, s);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  const whole = Math.floor(rest);
  const tenth = Math.floor((rest - whole) * 10);
  return `${m}:${whole.toString().padStart(2, '0')}.${tenth}`;
}

export function segLen(s: Segment) {
  return Math.max(0, s.out - s.in);
}

export function layout(segs: Segment[]) {
  const voice: Placed[] = [];
  const bed: Placed[] = [];
  let t = 0;
  for (const s of segs) {
    if (s.track !== 'voice') continue;
    const len = segLen(s);
    voice.push({ ...s, pos: t, len });
    t += len;
  }
  let total = t;
  for (const s of segs) {
    if (s.track !== 'bed') continue;
    const len = segLen(s);
    bed.push({ ...s, pos: s.start, len });
    total = Math.max(total, s.start + len);
  }
  return { voice, bed, voiceEnd: t, total };
}
export type Layout = ReturnType<typeof layout>;

/** Union of source ranges of a clip that appear anywhere in the story. */
export function usedRanges(segs: Segment[], clipId: string): [number, number][] {
  const r = segs
    .filter((s) => s.clipId === clipId)
    .map((s) => [s.in, s.out] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const x of r) {
    const last = out[out.length - 1];
    if (last && x[0] <= last[1] + EPS) last[1] = Math.max(last[1], x[1]);
    else out.push([x[0], x[1]]);
  }
  return out;
}

export function inRanges(t: number, ranges: [number, number][]) {
  return ranges.some(([a, b]) => t >= a - EPS && t <= b + EPS);
}

export function rangesLength(r: [number, number][]) {
  return r.reduce((acc, [a, b]) => acc + (b - a), 0);
}

/** Remove source range [a,b] of clip from every segment that contains it. */
export function cutRange(segs: Segment[], clipId: string, a: number, b: number): Segment[] {
  const out: Segment[] = [];
  for (const s of segs) {
    if (s.clipId !== clipId || b <= s.in + EPS || a >= s.out - EPS) {
      out.push(s);
      continue;
    }
    if (a > s.in + 0.15) out.push({ ...s, out: a });
    if (b < s.out - 0.15) {
      const startShift = s.track === 'bed' ? s.start + (b - s.in) : 0;
      out.push({ ...s, id: uid(), in: b, start: startShift });
    }
  }
  return out;
}

/** Put back source range [a,b] of clip into the voice track, next to its neighbours. */
export function restoreRange(segs: Segment[], clip: Clip, a: number, b: number): Segment[] {
  let result = segs.map((s) => ({ ...s }));
  const used = usedRanges(result.filter((s) => s.track === 'voice'), clip.id);
  // gaps inside [a,b] not yet used
  const gaps: [number, number][] = [];
  let cur = a;
  for (const [ua, ub] of used) {
    if (ub <= cur) continue;
    if (ua >= b) break;
    if (ua > cur + EPS) gaps.push([cur, Math.min(ua, b)]);
    cur = Math.max(cur, ub);
  }
  if (cur < b - EPS) gaps.push([cur, b]);

  for (const [ga, gb] of gaps) {
    const voice = result.filter((s) => s.track === 'voice' && s.clipId === clip.id);
    const before = voice.find((s) => Math.abs(s.out - ga) < 0.05);
    const after = voice.find((s) => Math.abs(s.in - gb) < 0.05);
    if (before && after && before !== after) {
      before.out = after.out;
      result = result.filter((s) => s !== after);
    } else if (before) {
      before.out = gb;
    } else if (after) {
      after.in = ga;
    } else {
      const seg: Segment = { id: uid(), clipId: clip.id, track: 'voice', in: ga, out: gb, start: 0, gain: 0 };
      // insert after the last voice segment of this clip that ends before ga
      const prior = voice.filter((s) => s.out <= ga + EPS).sort((x, y) => y.out - x.out)[0];
      const next = voice.filter((s) => s.in >= gb - EPS).sort((x, y) => x.in - y.in)[0];
      if (prior) result.splice(result.indexOf(prior) + 1, 0, seg);
      else if (next) result.splice(result.indexOf(next), 0, seg);
      else result.push(seg);
    }
  }
  return result;
}

export function replaceRangeWith(segs: Segment[], clipId: string, a: number, b: number, newSeg: Segment): Segment[] {
  const out: Segment[] = [];
  let inserted = false;
  for (const s of segs) {
    if (s.track !== 'voice' || s.clipId !== clipId || b <= s.in + EPS || a >= s.out - EPS) {
      out.push(s);
      continue;
    }
    if (a > s.in + 0.15) out.push({ ...s, out: a });
    if (!inserted) {
      out.push(newSeg);
      inserted = true;
    }
    if (b < s.out - 0.15) out.push({ ...s, id: uid(), in: b });
  }
  if (!inserted) out.push(newSeg);
  return out;
}

export function splitSeg(segs: Segment[], segId: string, t: number): Segment[] {
  const out: Segment[] = [];
  for (const s of segs) {
    if (s.id === segId && t > s.in + 0.2 && t < s.out - 0.2) {
      out.push({ ...s, out: t });
      out.push({ ...s, id: uid(), in: t, start: s.track === 'bed' ? s.start + (t - s.in) : 0 });
    } else out.push(s);
  }
  return out;
}

/** Where a voice-track position lands in source terms. */
export function locate(lay: Layout, t: number) {
  const segs = lay.voice;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (t >= s.pos && t < s.pos + s.len) return { seg: s, index: i, src: s.in + (t - s.pos) };
  }
  return null;
}

/** Story position of a clip source time (first voice occurrence). */
export function storyPosOf(lay: Layout, clipId: string, t: number): number | null {
  for (const s of lay.voice) {
    if (s.clipId === clipId && t >= s.in - EPS && t <= s.out + EPS) return s.pos + (t - s.in);
  }
  for (const s of lay.bed) {
    if (s.clipId === clipId && t >= s.in - EPS && t <= s.out + EPS) return s.pos + (t - s.in);
  }
  return null;
}

export type Anchor = { clipId: string; t: number } | { end: true };

export function mapAnchor(lay: Layout, anchor: Anchor): { pos: number; status: 'ok' | 'cut' | 'gone' } {
  if ('end' in anchor) return { pos: lay.voiceEnd, status: 'ok' };
  const p = storyPosOf(lay, anchor.clipId, anchor.t);
  if (p !== null) return { pos: p, status: 'ok' };
  const mine = lay.voice.filter((s) => s.clipId === anchor.clipId);
  if (!mine.length) return { pos: -1, status: 'gone' };
  const before = mine.filter((s) => s.out <= anchor.t).sort((a, b) => b.out - a.out)[0];
  if (before) return { pos: before.pos + before.len, status: 'cut' };
  return { pos: mine[0].pos, status: 'cut' };
}

/** Range bounds for a word span, extending into the surrounding silence. */
export function wordSpanRange(clip: Clip, i0: number, i1: number): [number, number] {
  const w = clip.words;
  const lo = Math.min(i0, i1);
  const hi = Math.max(i0, i1);
  const a = lo > 0 ? (w[lo - 1].t1 + w[lo].t0) / 2 : 0;
  const b = hi < w.length - 1 ? (w[hi].t1 + w[hi + 1].t0) / 2 : clip.duration;
  return [round2(a), round2(b)];
}

export const round2 = (x: number) => Math.round(x * 100) / 100;

export function wordMid(w: Word) {
  return (w.t0 + w.t1) / 2;
}

// ---------- deterministic noise ----------
export function seeded(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- transcript parsing ----------
const TAG = /^(.*?)\[(p|i):([^\]]+)\](.*)$/;

export function buildWords(utts: Utt[]): Word[] {
  const words: Word[] = [];
  utts.forEach((u, ui) => {
    const toks = u.text.split(/\s+/).filter(Boolean);
    const parsed = toks.map((tok) => {
      let tense: Tense | undefined;
      let low = false;
      let text = tok;
      const m = tok.match(TAG);
      if (m) {
        text = m[1] + m[3] + m[4];
        tense = m[2] as Tense;
      }
      if (text.includes('?') && /\?[a-záéíóúñ]/i.test(text)) {
        low = true;
        text = text.replace(/\?(?=[a-záéíóúñ])/i, '');
      }
      const pauseW = /[.,;!?…]$/.test(text) ? 2.5 : 0;
      return { text, tense, low, w: text.replace(/[^\p{L}\d]/gu, '').length + 2.2 + pauseW, pauseW };
    });
    const W = parsed.reduce((a, p) => a + p.w, 0);
    const span = u.end - u.start;
    let t = u.start;
    for (const p of parsed) {
      const slot = (p.w / W) * span;
      const speech = slot * (p.pauseW ? (p.w - p.pauseW) / p.w : 0.92);
      words.push({ text: p.text, t0: round2(t), t1: round2(t + speech), spk: u.spk, u: ui, tense: p.tense, low: p.low || undefined });
      t += slot;
    }
  });
  return words;
}

export function plainText(text: string) {
  return text.replace(/\[(p|i):([^\]]+)\]/g, '$2').replace(/\?(?=[a-záéíóúñ])/gi, '');
}

export function speechPeaks(id: string, duration: number, words: Word[], loud: Record<string, number> = {}) {
  const rnd = seeded(id);
  const n = Math.ceil(duration * PEAK_RATE);
  const peaks = Array.from({ length: n }, () => 0.025 + rnd() * 0.03);
  for (const w of words) {
    const k0 = Math.floor(w.t0 * PEAK_RATE);
    const k1 = Math.max(k0 + 1, Math.ceil(w.t1 * PEAK_RATE));
    const L = loud[w.spk] ?? 1;
    for (let k = k0; k < k1 && k < n; k++) {
      const env = Math.sin((Math.PI * (k - k0 + 0.5)) / (k1 - k0));
      peaks[k] = Math.max(peaks[k], (0.3 + 0.62 * rnd()) * (0.45 + 0.55 * env) * L);
    }
  }
  return peaks;
}

export function ambiencePeaks(id: string, duration: number, events: SoundEvent[], base = 0.24) {
  const rnd = seeded(id);
  const n = Math.ceil(duration * PEAK_RATE);
  let walk = 0;
  const peaks: number[] = [];
  for (let k = 0; k < n; k++) {
    walk = walk * 0.92 + (rnd() - 0.5) * 0.08;
    peaks.push(Math.max(0.05, base + walk + rnd() * 0.12));
  }
  for (const e of events) {
    const k0 = Math.floor(e.t * PEAK_RATE);
    for (let k = k0; k < k0 + 34 && k < n; k++) {
      const env = Math.sin((Math.PI * (k - k0)) / 34);
      peaks[k] = Math.max(peaks[k], (0.45 + rnd() * 0.4) * env + base * 0.5);
    }
  }
  return peaks;
}

export function musicPeaks(id: string, duration: number) {
  const rnd = seeded(id);
  const n = Math.ceil(duration * PEAK_RATE);
  const peaks: number[] = [];
  for (let k = 0; k < n; k++) {
    const t = k / PEAK_RATE;
    const beat = Math.exp(-((t * 2) % 1) * 5);
    const fadeIn = Math.min(1, t / 0.6);
    const fadeOut = Math.min(1, (duration - t) / 2.5);
    peaks.push(Math.min(1, (0.38 + 0.4 * beat + rnd() * 0.12) * fadeIn * fadeOut));
  }
  return peaks;
}

export function maxPeak(peaks: number[], a: number, b: number) {
  const k0 = Math.max(0, Math.floor(a * PEAK_RATE));
  const k1 = Math.min(peaks.length, Math.max(k0 + 1, Math.ceil(b * PEAK_RATE)));
  let m = 0;
  for (let k = k0; k < k1; k++) if (peaks[k] > m) m = peaks[k];
  return m;
}

// Rough past-tense detector for words in freshly recorded lines (no ASR tags).
const NOT_PAST = new Set(['está', 'aquí', 'allí', 'así', 'día', 'mía', 'tía', 'todavía', 'policía', 'alegría', 'energía', 'después', 'café', 'también', 'qué', 'papá', 'mamá', 'sofía', 'tío', 'quién', 'según', 'aunque', 'cada', 'nada', 'toda', 'vida', 'calle', 'mi', 'ahí']);
const IRREG: Record<string, Tense> = {
  era: 'i', eras: 'i', éramos: 'i', eran: 'i', iba: 'i', ibas: 'i', íbamos: 'i', iban: 'i', veía: 'i', veían: 'i',
  fue: 'p', fui: 'p', fuiste: 'p', fuimos: 'p', fueron: 'p', tuve: 'p', tuvo: 'p', tuvimos: 'p', tuvieron: 'p',
  hice: 'p', hizo: 'p', hicimos: 'p', hicieron: 'p', dije: 'p', dijo: 'p', dijeron: 'p', vine: 'p', vino: 'p',
  pude: 'p', pudo: 'p', quise: 'p', quiso: 'p', supe: 'p', supo: 'p', estuve: 'p', estuvo: 'p', puso: 'p', vi: 'p', vio: 'p', di: 'p', dio: 'p',
};
export function guessTense(raw: string): Tense | undefined {
  const w = raw.toLowerCase().replace(/[^a-záéíóúñü]/g, '');
  if (IRREG[w]) return IRREG[w];
  if (w.length < 4 || NOT_PAST.has(w)) return undefined;
  if (/(aba|abas|ábamos|aban|ía|ías|íamos|ían)$/.test(w)) return 'i';
  if (/(é|ó|aste|amos|aron|ieron|í|iste|imos|ió)$/.test(w)) return 'p';
  return undefined;
}
