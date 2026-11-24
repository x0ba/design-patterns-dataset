// Generates the image + audio side of the media mirror (.ui-capture/media):
// a painted-style portrait plate per figure (main + thumbnail), the UI
// images and the starry background listed in image-manifest.json, and one
// silent narration-length WAV every recorded audio path maps onto.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(new URL('./tools/package.json', import.meta.url));
const sharp = require('sharp');

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, '.ui-capture/media');
const manifest = JSON.parse(readFileSync(join(ROOT, 'client/src/data/image-manifest.json')));

function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const hash = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 2147483646 + 1;

// warm painted palettes: [bg-top, bg-bottom, robe, skin, hair]
const PALETTES = [
  ['#3b2a1f', '#120d0b', '#7a2e1f', '#c89a78', '#3a2a22'], ['#1f2b3b', '#0a0e16', '#2c4a6e', '#d1a988', '#1b1612'],
  ['#2e3324', '#0d0f0a', '#5d6b3a', '#c49b7a', '#6b5a48'], ['#3a2433', '#120a10', '#6b2d4f', '#b98a6a', '#1a1210'],
  ['#2a2f3a', '#0b0c10', '#8a7a5a', '#d6b08e', '#e8e2d6'], ['#33261a', '#0f0b07', '#a3742c', '#a87a5a', '#20170f'],
];

function portraitSvg(id, w, h) {
  const r = rng(hash(id));
  const [top, bot, robe, skin, hair] = PALETTES[hash(id) % PALETTES.length];
  const cx = w * (0.48 + r() * 0.04), headR = w * (0.17 + r() * 0.02), headY = h * 0.38;
  const strokes = Array.from({ length: 70 }, () => {
    const x = r() * w, y = r() * h, rx = 20 + r() * w * 0.12, ry = 6 + r() * 30;
    return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="${r() > 0.5 ? top : bot}" opacity="${(0.15 + r() * 0.25).toFixed(2)}" transform="rotate(${(r() * 50 - 25).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></radialGradient>
    <radialGradient id="light" cx="38%" cy="30%" r="55%"><stop offset="0" stop-color="#ffe2b0" stop-opacity="0.35"/><stop offset="1" stop-color="#ffe2b0" stop-opacity="0"/></radialGradient>
    <radialGradient id="face" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${skin}"/><stop offset="1" stop-color="${bot}" stop-opacity="0.9"/></radialGradient>
    <linearGradient id="robe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${robe}"/><stop offset="1" stop-color="${bot}"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="${(w / 160).toFixed(1)}"/></filter>
    <filter id="paint"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="${hash(id) % 97}"/><feDisplacementMap in="SourceGraphic" scale="${(w / 40).toFixed(0)}"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g filter="url(#soft)">${strokes}</g>
  <g filter="url(#paint)">
    <path d="M ${cx - w * 0.42} ${h} C ${cx - w * 0.38} ${h * 0.66}, ${cx - w * 0.2} ${h * 0.58}, ${cx} ${h * 0.57} C ${cx + w * 0.2} ${h * 0.58}, ${cx + w * 0.38} ${h * 0.66}, ${cx + w * 0.42} ${h} Z" fill="url(#robe)"/>
    <rect x="${cx - headR * 0.42}" y="${headY + headR * 0.7}" width="${headR * 0.84}" height="${headR * 0.9}" fill="${skin}" opacity="0.85"/>
    <ellipse cx="${cx}" cy="${headY - headR * 0.25}" rx="${headR * 1.08}" ry="${headR * 1.02}" fill="${hair}"/>
    <ellipse cx="${cx}" cy="${headY}" rx="${headR * 0.86}" ry="${headR * 1.08}" fill="url(#face)"/>
  </g>
  <rect width="${w}" height="${h}" fill="url(#light)"/>
  <rect width="${w}" height="${h}" fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="${w * 0.12}" filter="url(#soft)"/>
</svg>`;
}

function starsSvg(w, h, seed) {
  const r = rng(seed);
  const stars = Array.from({ length: 900 }, () => `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(r() * r() * 2.4 + 0.3).toFixed(2)}" fill="#fff" opacity="${(0.25 + r() * 0.75).toFixed(2)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g" cx="60%" cy="40%" r="90%"><stop offset="0" stop-color="#1b2150"/><stop offset="0.6" stop-color="#0b0f2b"/><stop offset="1" stop-color="#050716"/></radialGradient>
  <radialGradient id="n" cx="30%" cy="70%" r="40%"><stop offset="0" stop-color="#5b3a7a" stop-opacity="0.35"/><stop offset="1" stop-color="#5b3a7a" stop-opacity="0"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#n)"/>${stars}</svg>`;
}

async function save(svg, path, width) {
  mkdirSync(join(path, '..'), { recursive: true });
  await sharp(Buffer.from(svg)).resize({ width }).webp({ quality: 78 }).toFile(path);
}

for (const [id, dims] of Object.entries(manifest.figures)) {
  const [mw, mh] = dims.main || [2400, 2904];
  await save(portraitSvg(id, 600, Math.round(600 * mh / mw)), join(OUT, 'images/figures', id, 'main.webp'), 1200);
  await save(portraitSvg(id, 640, 640), join(OUT, 'images/figures', id, 'thumbnail.webp'), 640);
}
for (const [name, [w, h]] of Object.entries(manifest.ui)) {
  await save(portraitSvg(name, 480, Math.round(480 * h / w)), join(OUT, 'images/ui', `${name}.webp`), 960);
}
for (const [name, [w, h]] of Object.entries(manifest.backgrounds)) {
  await save(starsSvg(1920, Math.round(1920 * h / w), 42), join(OUT, 'images/backgrounds', `${name}.webp`), 1920);
}
for (const name of Object.keys(manifest.icons)) {
  const svg = readFileSync(join(ROOT, 'client/src/assets/icons', `${name}.svg`), 'utf8');
  await save(svg, join(OUT, 'images/icons', `${name}.webp`), 256);
}

// 13 minutes of near-silence (8 kHz, 8-bit mono WAV), a chapter's length
const secs = 13 * 60 + 12, rate = 8000, n = secs * rate;
const buf = Buffer.alloc(44 + n);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
buf.writeUInt32LE(rate, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34); buf.write('data', 36); buf.writeUInt32LE(n, 40);
buf.fill(128, 44);
mkdirSync(join(OUT, 'audio'), { recursive: true });
writeFileSync(join(OUT, 'audio/narration.wav'), buf);
console.log('media generated');
