// Local stand-in for Instagram's CDN (scontent.cdninstagram.com). Produces
// deterministic SVG profile pictures / photos, animated "GIF" stickers and WAV
// voice notes so no image or audio ever has to come from the network.
'use strict';

function hash (s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng (seed) {
  let x = hash(seed) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const BG = [['#f6d365', '#fda085'], ['#a1c4fd', '#c2e9fb'], ['#d4fc79', '#96e6a1'], ['#fbc2eb', '#a6c1ee'], ['#ffecd2', '#fcb69f'], ['#84fab0', '#8fd3f4'], ['#e0c3fc', '#8ec5fc'], ['#fddb92', '#d1fdff'], ['#c79081', '#dfa579'], ['#89f7fe', '#66a6ff'], ['#f093fb', '#f5576c'], ['#5ee7df', '#b490ca'], ['#30cfd0', '#330867'], ['#cfd9df', '#e2ebf0']];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d29c6b', '#a86b3c', '#5c3a21'];
const HAIR = ['#2c1b10', '#090806', '#71635a', '#b7a69e', '#d6c4c2', '#a56b46', '#3b3024', '#e6cea8', '#8d4a43', '#1c1c1c'];
const SHIRT = ['#2d3a4a', '#c0392b', '#16a085', '#f39c12', '#8e44ad', '#ecf0f1', '#34495e', '#d35400', '#27ae60', '#7f8c8d', '#e84393', '#0984e3'];

function avatar (key, kind, label) {
  const r = rng(key);
  const [c1, c2] = pick(r, BG);
  if (kind === 'brand') {
    const initials = (label || key).replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    const fg = pick(r, ['#1d1d1f', '#ffffff', '#2d3436']);
    const solid = pick(r, ['#1d1d1f', '#f5f0e8', '#2f5d50', '#b23a48', '#264653', '#e9c46a', '#f4a261', '#3d405b']);
    const text = solid === '#f5f0e8' || solid === '#e9c46a' ? '#1d1d1f' : (fg === '#1d1d1f' ? '#ffffff' : fg);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="150" height="150" fill="${solid}"/><circle cx="75" cy="75" r="52" fill="none" stroke="${text}" stroke-opacity=".35" stroke-width="3"/><text x="75" y="88" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="700" text-anchor="middle" fill="${text}">${initials}</text></svg>`;
  }
  const skin = pick(r, SKIN); const hair = pick(r, HAIR); const shirt = pick(r, SHIRT);
  const longHair = r() > 0.5; const glasses = r() > 0.78; const bald = !longHair && r() > 0.85;
  const tilt = (r() * 10 - 5).toFixed(1);
  const hairBack = longHair ? `<path d="M40 70 Q38 30 75 28 Q112 30 110 70 L114 118 Q75 128 36 118 Z" fill="${hair}"/>` : '';
  const hairTop = bald ? '' : `<path d="M47 66 Q46 36 75 34 Q104 36 103 66 Q96 50 75 50 Q58 50 47 66 Z" fill="${hair}"/>`;
  const gl = glasses ? `<g fill="none" stroke="#222" stroke-width="2.5"><circle cx="64" cy="72" r="8"/><circle cx="86" cy="72" r="8"/><path d="M72 72 h6"/></g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="150" height="150" fill="url(#g)"/><g transform="rotate(${tilt} 75 75)">${hairBack}<path d="M28 150 Q30 108 75 104 Q120 108 122 150 Z" fill="${shirt}"/><rect x="66" y="88" width="18" height="20" rx="6" fill="${skin}"/><ellipse cx="75" cy="70" rx="27" ry="31" fill="${skin}"/>${hairTop}<circle cx="65" cy="73" r="2.6" fill="#2b2b2b"/><circle cx="85" cy="73" r="2.6" fill="#2b2b2b"/><path d="M67 86 Q75 92 83 86" stroke="#7a4b3a" stroke-width="2.4" fill="none" stroke-linecap="round"/>${gl}</g></svg>`;
}

function scenePottery (r, w, h) {
  const glaze = pick(r, ['#5b7f95', '#c8b6a6', '#3e5641', '#d9a066', '#8a9a5b', '#efe7da', '#2f4858', '#b56576', '#6d597a']);
  const glaze2 = pick(r, ['#e8dccb', '#a3b18a', '#c9ada7', '#87a8a4', '#f2cc8f', '#9a8c98']);
  const table = pick(r, ['#c9a77c', '#a9846a', '#e6dccd', '#7d5a44']);
  const wall = pick(r, ['#f4efe6', '#e9e4dc', '#dfe7e2', '#efe1d1']);
  const cx = w * (0.38 + r() * 0.1); const base = h * 0.78;
  return `<rect width="${w}" height="${h}" fill="${wall}"/><rect y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="${table}"/>` +
    `<path d="M${cx - w * 0.16} ${base} Q${cx - w * 0.24} ${h * 0.5} ${cx - w * 0.09} ${h * 0.36} L${cx + w * 0.09} ${h * 0.36} Q${cx + w * 0.24} ${h * 0.5} ${cx + w * 0.16} ${base} Z" fill="${glaze}"/>` +
    `<ellipse cx="${cx}" cy="${h * 0.36}" rx="${w * 0.09}" ry="${h * 0.015}" fill="#00000033"/>` +
    `<path d="M${cx - w * 0.17} ${h * 0.6} Q${cx} ${h * 0.64} ${cx + w * 0.17} ${h * 0.6}" stroke="${glaze2}" stroke-width="${w * 0.02}" fill="none"/>` +
    `<path d="M${w * 0.62} ${base} Q${w * 0.6} ${h * 0.64} ${w * 0.66} ${h * 0.62} L${w * 0.84} ${h * 0.62} Q${w * 0.9} ${h * 0.64} ${w * 0.86} ${base} Z" fill="${glaze2}"/>` +
    `<ellipse cx="${w * 0.75}" cy="${h * 0.62}" rx="${w * 0.1}" ry="${h * 0.02}" fill="#00000022"/>` +
    `<ellipse cx="${w * 0.5}" cy="${base + 6}" rx="${w * 0.42}" ry="${h * 0.02}" fill="#00000022"/>` +
    `<rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.25}" height="${h * 0.32}" fill="#ffffff55"/>`;
}
function sceneLandscape (r, w, h) {
  const sky = pick(r, [['#ff9a8b', '#ffd3a5'], ['#4facfe', '#c2e9fb'], ['#fa709a', '#fee140'], ['#30cfd0', '#a8edea'], ['#5f72bd', '#e2b0ff'], ['#f6d365', '#fda085']]);
  const hill = pick(r, ['#2d6a4f', '#40916c', '#5a3e36', '#3a5a40', '#6b705c', '#1b4332']);
  const sunY = h * (0.25 + r() * 0.2);
  return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${w * (0.3 + r() * 0.4)}" cy="${sunY}" r="${w * 0.09}" fill="#fff6d5" opacity=".9"/>` +
    `<path d="M0 ${h * 0.68} Q${w * 0.25} ${h * 0.52} ${w * 0.5} ${h * 0.64} T${w} ${h * 0.6} V${h} H0 Z" fill="${hill}" opacity=".75"/>` +
    `<path d="M0 ${h * 0.8} Q${w * 0.3} ${h * 0.7} ${w * 0.6} ${h * 0.8} T${w} ${h * 0.76} V${h} H0 Z" fill="${hill}"/>`;
}
function sceneSea (r, w, h) {
  return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3f4"/><stop offset="1" stop-color="#e0f7fa"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#s)"/>` +
    `<rect y="${h * 0.5}" width="${w}" height="${h * 0.22}" fill="#2a9d8f"/><path d="M0 ${h * 0.55} Q${w * 0.25} ${h * 0.53} ${w * 0.5} ${h * 0.56} T${w} ${h * 0.55}" stroke="#ffffff88" stroke-width="4" fill="none"/>` +
    `<rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#f1dcae"/><circle cx="${w * (0.2 + r() * 0.6)}" cy="${h * 0.84}" r="${w * 0.05}" fill="${pick(r, ['#e76f51', '#f4a261', '#264653'])}"/>`;
}
function sceneFood (r, w, h) {
  const table = pick(r, ['#3d2c29', '#d8c3a5', '#6b4f3a', '#e8e1d5']);
  const food = pick(r, ['#e76f51', '#e9c46a', '#a7c957', '#bc4749', '#f4a261', '#ddb892']);
  return `<rect width="${w}" height="${h}" fill="${table}"/><circle cx="${w / 2}" cy="${h / 2}" r="${w * 0.34}" fill="#fbfbf8"/><circle cx="${w / 2}" cy="${h / 2}" r="${w * 0.26}" fill="#f0eee8"/>` +
    `<circle cx="${w * 0.46}" cy="${h * 0.48}" r="${w * 0.12}" fill="${food}"/><circle cx="${w * 0.58}" cy="${h * 0.54}" r="${w * 0.08}" fill="${pick(r, ['#6a994e', '#f2e8cf', '#386641'])}"/>` +
    `<circle cx="${w * 0.82}" cy="${h * 0.2}" r="${w * 0.09}" fill="#f6efe6" stroke="#c9b79c" stroke-width="6"/><rect x="${w * 0.08}" y="${h * 0.62}" width="${w * 0.04}" height="${h * 0.3}" rx="8" fill="#b7b7b7"/>`;
}
function sceneCity (r, w, h) {
  let b = '';
  for (let x = 0; x < w; x += w / 9) {
    const bh = h * (0.25 + r() * 0.45);
    b += `<rect x="${x}" y="${h - bh}" width="${w / 9 - 6}" height="${bh}" fill="${pick(r, ['#2b2d42', '#3d405b', '#22223b', '#4a4e69'])}"/>`;
    for (let y = h - bh + 14; y < h - 14; y += 26) if (r() > 0.45) b += `<rect x="${x + 10}" y="${y}" width="10" height="12" fill="#ffd166"/>`;
  }
  return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14213d"/><stop offset="1" stop-color="#e76f51"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#s)"/>${b}`;
}
function scenePlant (r, w, h) {
  const pot = pick(r, ['#c8553d', '#f2d0a4', '#588b8b', '#ffffff', '#2f3e46']);
  let leaves = '';
  for (let i = 0; i < 9; i++) {
    const a = -150 + i * 15 + r() * 10;
    leaves += `<ellipse cx="${w / 2}" cy="${h * 0.38}" rx="${w * 0.05}" ry="${h * 0.17}" fill="${pick(r, ['#2d6a4f', '#40916c', '#52b788', '#1b4332'])}" transform="rotate(${a + 90} ${w / 2} ${h * 0.55})"/>`;
  }
  return `<rect width="${w}" height="${h}" fill="${pick(r, ['#f1faee', '#fefae0', '#edf2f4', '#f8edeb'])}"/>${leaves}<path d="M${w * 0.34} ${h * 0.58} L${w * 0.66} ${h * 0.58} L${w * 0.62} ${h * 0.86} L${w * 0.38} ${h * 0.86} Z" fill="${pot}"/>`;
}
function sceneStudio (r, w, h) {
  // a pottery wheel / workspace from above
  return `<rect width="${w}" height="${h}" fill="#8d99ae"/><circle cx="${w / 2}" cy="${h / 2}" r="${w * 0.38}" fill="#adb5bd"/><circle cx="${w / 2}" cy="${h / 2}" r="${w * 0.3}" fill="#6c757d"/>` +
    `<circle cx="${w / 2}" cy="${h / 2}" r="${w * 0.14}" fill="${pick(r, ['#b08968', '#9c6644', '#c9a227', '#ddb892'])}"/><circle cx="${w / 2}" cy="${h / 2}" r="${w * 0.08}" fill="#7f5539"/>` +
    `<rect x="${w * 0.05}" y="${h * 0.05}" width="${w * 0.18}" height="${h * 0.1}" rx="10" fill="#e9ecef"/><path d="M${w * 0.75} ${h * 0.82} l${w * 0.15} ${h * 0.05}" stroke="#343a40" stroke-width="10" stroke-linecap="round"/>`;
}
function scenePet (r, w, h) {
  const fur = pick(r, ['#d4a373', '#3a3a3a', '#f8f9fa', '#b5838d', '#e9c46a', '#6c584c']);
  return `<rect width="${w}" height="${h}" fill="${pick(r, ['#e9edc9', '#ccd5ae', '#fefae0', '#dde5b6'])}"/><ellipse cx="${w / 2}" cy="${h * 0.7}" rx="${w * 0.3}" ry="${h * 0.2}" fill="${fur}"/>` +
    `<circle cx="${w / 2}" cy="${h * 0.42}" r="${w * 0.2}" fill="${fur}"/><path d="M${w * 0.33} ${h * 0.32} L${w * 0.36} ${h * 0.16} L${w * 0.45} ${h * 0.27} Z M${w * 0.67} ${h * 0.32} L${w * 0.64} ${h * 0.16} L${w * 0.55} ${h * 0.27} Z" fill="${fur}"/>` +
    `<circle cx="${w * 0.43}" cy="${h * 0.41}" r="${w * 0.025}" fill="#222"/><circle cx="${w * 0.57}" cy="${h * 0.41}" r="${w * 0.025}" fill="#222"/><ellipse cx="${w / 2}" cy="${h * 0.48}" rx="${w * 0.03}" ry="${w * 0.02}" fill="#5a3825"/>`;
}
function sceneMarket (r, w, h) {
  let stalls = '';
  for (let i = 0; i < 3; i++) {
    const x = w * (0.05 + i * 0.32); const c = pick(r, ['#e63946', '#2a9d8f', '#f4a261', '#457b9d', '#ffb703']);
    stalls += `<rect x="${x}" y="${h * 0.38}" width="${w * 0.28}" height="${h * 0.06}" fill="${c}"/><rect x="${x}" y="${h * 0.44}" width="${w * 0.28}" height="${h * 0.3}" fill="#f1faee"/><rect x="${x + 6}" y="${h * 0.6}" width="${w * 0.28 - 12}" height="${h * 0.04}" fill="#a8763e"/>`;
  }
  return `<rect width="${w}" height="${h}" fill="#bde0fe"/><rect y="${h * 0.74}" width="${w}" height="${h * 0.26}" fill="#adb5bd"/>${stalls}`;
}
const SCENES = { pottery: scenePottery, landscape: sceneLandscape, sea: sceneSea, food: sceneFood, city: sceneCity, plant: scenePlant, studio: sceneStudio, pet: scenePet, market: sceneMarket };

function photo (scene, key, w, h) {
  w = Math.min(Number(w) || 1080, 2000); h = Math.min(Number(h) || 1350, 2000);
  const r = rng(scene + ':' + key);
  const fn = SCENES[scene] || pick(r, Object.values(SCENES));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${fn(r, w, h)}</svg>`;
}

function gif (key) {
  const r = rng(key);
  const emoji = { party: '🎉', laugh: '😂', heart: '💖', clap: '👏', wow: '😮', dance: '💃', thumbs: '👍', cat: '🐱', fire: '🔥', cry: '😭' }[key.split('-')[0]] || pick(r, ['🎉', '😂', '💖', '👏', '🔥']);
  const [c1, c2] = pick(r, BG);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="200" viewBox="0 0 240 200"><defs><linearGradient id="g"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="240" height="200" fill="url(#g)"/>` +
    `<text x="120" y="125" font-size="80" text-anchor="middle">${emoji}<animateTransform attributeName="transform" type="translate" values="0 0;0 -18;0 0" dur="0.8s" repeatCount="indefinite"/></text>` +
    `<circle cx="40" cy="40" r="6" fill="#fff"><animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite"/></circle><circle cx="200" cy="160" r="5" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite"/></circle></svg>`;
}

function voice (key, seconds) {
  const sr = 8000; const n = Math.floor(sr * Math.max(1, Math.min(60, seconds || 6)));
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  const r = rng(key); let f = 180 + r() * 80;
  for (let i = 0; i < n; i++) {
    if (i % 1600 === 0) f = 150 + r() * 120; // syllable-ish pitch changes
    const env = Math.abs(Math.sin((i / sr) * Math.PI * 2.2)) * 0.6;
    const s = Math.sin((2 * Math.PI * f * i) / sr) * env + (r() - 0.5) * 0.05;
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(s * 9000))), 44 + i * 2);
  }
  return buf;
}

module.exports = { avatar, photo, gif, voice };
