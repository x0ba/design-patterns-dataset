// Procedural spectrogram renderer: draws a plausible 0.6 s excerpt for a recording,
// driven by the file's measured attributes (species shape, SNR, call count, noise type).

const W = 1000, H = 400;
const ML = 50, MB = 28, MT = 8, MR = 10;
const PW = W - ML - MR, PH = H - MB - MT;
const FMAX = 100; // kHz
const TWIN = 0.4; // seconds

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STOPS = [
  [0, [8, 13, 28]], [0.22, [26, 38, 88]], [0.45, [104, 40, 120]],
  [0.68, [214, 84, 56]], [0.86, [248, 176, 78]], [1, [252, 238, 170]],
];
const LUT = (() => {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let k = 0;
    while (k < STOPS.length - 2 && v > STOPS[k + 1][0]) k++;
    const [v0, c0] = STOPS[k], [v1, c1] = STOPS[k + 1];
    const t = Math.min(1, Math.max(0, (v - v0) / (v1 - v0)));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * t;
  }
  return lut;
})();

const SHAPES = {
  myotis: { f0: [82, 96], f1: [34, 42], d: [0.0045, 0.0065], gap: [0.062, 0.1], curve: 2.2 },
  redbat: { f0: [56, 66], f1: [35, 40], d: [0.006, 0.009], gap: [0.1, 0.16], curve: 3.2 },
  hoary: { f0: [29, 34], f1: [17, 20], d: [0.011, 0.015], gap: [0.17, 0.26], curve: 1.6 },
  bbsh: { f0: [46, 56], f1: [24, 29], d: [0.007, 0.011], gap: [0.12, 0.2], curve: 2 },
  unclass: { f0: [50, 64], f1: [26, 34], d: [0.005, 0.009], gap: [0.1, 0.2], curve: 2 },
};

const xOf = (t) => (t / TWIN) * PW;
const yOf = (f) => PH - (f / FMAX) * PH;

function blob(buf, x, y, amp, rx, ry) {
  const x0 = Math.max(0, Math.floor(x - rx * 3)), x1 = Math.min(PW - 1, Math.ceil(x + rx * 3));
  const y0 = Math.max(0, Math.floor(y - ry * 3)), y1 = Math.min(PH - 1, Math.ceil(y + ry * 3));
  for (let j = y0; j <= y1; j++) {
    const dy = (j - y) / ry;
    for (let i = x0; i <= x1; i++) {
      const dx = (i - x) / rx;
      buf[j * PW + i] += amp * Math.exp(-(dx * dx + dy * dy) * 0.5);
    }
  }
}

function sweep(buf, rnd, shape, t0, amp, scale = 1) {
  const f0 = shape.f0[0] + rnd() * (shape.f0[1] - shape.f0[0]);
  const f1 = shape.f1[0] + rnd() * (shape.f1[1] - shape.f1[0]);
  const d = (shape.d[0] + rnd() * (shape.d[1] - shape.d[0])) * scale * 2.2; // stretched for legibility
  const steps = 44;
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const f = f1 + (f0 - f1) * Math.pow(1 - u, shape.curve);
    const taper = Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.9));
    const a = amp * (0.55 + 0.45 * taper);
    const x = xOf(t0 + u * d), y = yOf(f);
    blob(buf, x, y, a, 2.4, 3);
    blob(buf, x, yOf(f * 2), a * 0.28, 2.4, 3); // second harmonic
  }
}

export function drawSpectrogram(canvas, f, settings, opts = {}) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(f.seed);
  const buf = new Float32Array(PW * PH);

  // background: speckle with 1/f tilt
  for (let j = 0; j < PH; j++) {
    const fr = ((PH - j) / PH) * FMAX;
    const tilt = 0.07 + 0.1 * Math.exp(-fr / 14);
    for (let i = 0; i < PW; i++) buf[j * PW + i] = tilt * (0.3 + rnd() * 0.9);
  }

  const gain = Math.min(1, Math.max(0.22, (f.snr - 4) / 30));
  const isInsect = f.flag === 'insect';
  const isOther = f.flag === 'other';
  const isLow = !f.flag && f.fpk < 15;

  if (isInsect) {
    // tonal katydid/cricket band, amplitude-modulated, plus broadband stripes
    const fc = Math.min(70, Math.max(16, f.fpk));
    const rate = 0.011 + rnd() * 0.01;
    for (let t = rnd() * rate; t < TWIN; t += rate) {
      const x = xOf(t);
      for (let h = 1; h <= 3; h++) blob(buf, x, yOf(fc * h * 0.5 + 6), 0.55 * gain, 3, 5 + h);
      const sp = 0.25 + rnd() * 0.3;
      for (let j = yOf(Math.min(95, fc + 24)); j < yOf(Math.max(10, fc - 14)); j += 3) blob(buf, x, j, sp * gain * 0.7, 1.5, 2);
    }
    for (let k = 0; k < 4; k++) blob(buf, rnd() * PW, yOf(fc + (rnd() - 0.5) * 20), 0.3, 80, 3);
  } else if (isOther) {
    for (let k = 0; k < 6; k++) {
      const x = k === 0 ? 6 : rnd() * PW;
      for (let j = 4; j < PH; j += 3) blob(buf, x, j, 0.5 + 0.4 * rnd(), 1.6, 2.5);
    }
    blob(buf, 20, PH * 0.6, 0.6, 30, PH * 0.4);
  } else if (isLow) {
    for (let t = 0; t < TWIN; t += 0.02) {
      const amp = 0.45 + 0.35 * Math.sin(t * 40 + rnd());
      blob(buf, xOf(t), yOf(f.fpk), amp, 12, 16);
      blob(buf, xOf(t), yOf(f.fpk * 0.5), amp * 0.7, 12, 12);
    }
  } else {
    const key = f.latent in SHAPES ? f.latent : 'unclass';
    const shape = SHAPES[key];
    const shown = Math.max(1, Math.min(f.calls, 12));
    let t = 0.02 + rnd() * 0.04;
    let n = 0;
    while (n < shown && t < TWIN - 0.03) {
      const a = gain * (0.85 + rnd() * 0.3);
      sweep(buf, rnd, shape, t, a, key === 'unclass' ? 0.8 + rnd() * 0.5 : 1);
      t += shape.gap[0] + rnd() * (shape.gap[1] - shape.gap[0]);
      n++;
    }
  }

  const img = ctx.createImageData(PW, PH);
  for (let p = 0; p < PW * PH; p++) {
    const v = Math.max(0, Math.min(255, Math.round(Math.tanh(buf[p] * 1.15) * 255)));
    img.data[p * 4] = LUT[v * 3];
    img.data[p * 4 + 1] = LUT[v * 3 + 1];
    img.data[p * 4 + 2] = LUT[v * 3 + 2];
    img.data[p * 4 + 3] = 255;
  }
  ctx.fillStyle = '#0a0f1c';
  ctx.fillRect(0, 0, W, H);
  ctx.putImageData(img, ML, MT);

  // grid + labels
  ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let k = 0; k <= FMAX; k += 20) {
    const y = MT + yOf(k);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ML, y + 0.5); ctx.lineTo(W - MR, y + 0.5); ctx.stroke();
    ctx.fillStyle = '#9aa7b8';
    ctx.fillText(String(k), ML - 8, Math.min(H - MB - 6, Math.max(MT + 7, y)));
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let t = 0; t <= TWIN + 0.0001; t += 0.1) {
    const x = ML + xOf(t);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.moveTo(x + 0.5, MT); ctx.lineTo(x + 0.5, MT + PH); ctx.stroke();
    ctx.fillStyle = '#9aa7b8';
    ctx.fillText(t.toFixed(1) + ' s', Math.min(W - MR - 14, Math.max(ML + 8, x)), H - MB + 8);
  }
  ctx.save();
  ctx.translate(13, MT + PH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7f8da1';
  ctx.fillText('kHz', 0, 0);
  ctx.restore();

  // frequency floor
  if (opts.floor !== false) {
    const y = MT + yOf(settings.minFreq);
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = 'rgba(242,190,92,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ML, y); ctx.lineTo(W - MR, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(242,190,92,0.95)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${settings.minFreq} kHz floor`, ML + 8, y - 3);
  }
}
