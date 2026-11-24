// Procedural SVG artwork for avatars, headers, media attachments and link cards.
// Served by the local stub instance so nothing is fetched from the internet.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function rng(seed) {
  let s = typeof seed === 'number' ? seed : hash(String(seed));
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt,
    g = ((n >> 8) & 255) + amt,
    b = (n & 255) + amt;
  const c = (v) => Math.max(0, Math.min(255, v));
  return '#' + ((c(r) << 16) | (c(g) << 8) | c(b)).toString(16).padStart(6, '0');
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function avatarSVG(name, color) {
  const initials = name
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
  const r = rng(name);
  const angle = Math.floor(r() * 360);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${shade(color, 50)}"/><stop offset="1" stop-color="${shade(color, -40)}"/></linearGradient></defs>
<rect width="400" height="400" fill="url(#g)"/>
<circle cx="${80 + r() * 240}" cy="${80 + r() * 240}" r="${120 + r() * 80}" fill="#fff" opacity=".08"/>
<text x="200" y="200" dy=".35em" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-weight="600" font-size="160" fill="#fff" opacity=".95">${esc(initials)}</text>
</svg>`;
}

const PALETTES = {
  street: ['#9ca3af', '#4b5563', '#22c55e', '#e5e7eb'],
  latte: ['#d6b48c', '#7c4a24', '#f5e6d3', '#ffffff'],
  night: ['#0f172a', '#1e1b4b', '#f97316', '#ec4899'],
  night2: ['#111827', '#3f2a14', '#fb923c', '#fde68a'],
  city: ['#334155', '#64748b', '#facc15', '#f1f5f9'],
  bus: ['#1e3a8a', '#3b82f6', '#fbbf24', '#e0f2fe'],
  books: ['#7c2d12', '#fde68a', '#16a34a', '#f472b6'],
  croissant: ['#f5deb3', '#b45309', '#fef3c7', '#78350f'],
  pixel: ['#14532d', '#22c55e', '#86efac', '#fef9c3'],
  pixel2: ['#1c1917', '#44403c', '#a16207', '#fde047'],
  dirt: ['#78350f', '#a16207', '#d6d3d1', '#422006'],
  type: ['#fafaf9', '#1c1917', '#a8a29e', '#e7e5e4'],
  map: ['#0b1120', '#22c55e', '#f59e0b', '#ef4444'],
  pottery: ['#a8a29e', '#c2410c', '#e7e5e4', '#57534e'],
  sketch: ['#fefce8', '#fbbf24', '#60a5fa', '#f87171'],
  park: ['#f59e0b', '#b45309', '#65a30d', '#fde68a'],
  guitar: ['#451a03', '#b45309', '#fbbf24', '#d6d3d1'],
  knit: ['#0f766e', '#5eead4', '#f5f5f4', '#78716c'],
  paella: ['#fbbf24', '#b45309', '#16a34a', '#fef3c7'],
  mountain: ['#fbcfe8', '#f9a8d4', '#e0e7ff', '#475569'],
  portrait: ['#e5e5e5', '#404040', '#a3a3a3', '#171717'],
  portrait2: ['#d4d4d4', '#262626', '#737373', '#fafafa'],
  bread: ['#78350f', '#d97706', '#fde68a', '#f5f5f4'],
  plant: ['#14532d', '#16a34a', '#bbf7d0', '#fef3c7'],
  slides: ['#831843', '#db2777', '#fce7f3', '#ffffff'],
  notes: ['#7c2d12', '#ea580c', '#ffedd5', '#ffffff'],
  header: ['#334155', '#64748b', '#cbd5e1', '#f8fafc'],
};
const LANDSCAPE = new Set(['street', 'park', 'mountain', 'city', 'bus', 'dirt', 'header']);
const NIGHT = new Set(['night', 'night2', 'map', 'pixel2']);
const FOOD = new Set(['latte', 'croissant', 'paella', 'bread', 'pottery', 'knit']);

export function sceneSVG(scene, seed = '', w = 1200, h = 900, baseColor) {
  const r = rng(scene + seed);
  let [a, b, c, d] = PALETTES[scene] || PALETTES.header;
  if (baseColor) {
    a = shade(baseColor, 60);
    b = shade(baseColor, -30);
  }
  let body = '';
  if (LANDSCAPE.has(scene) || baseColor) {
    body += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${d}"/><stop offset="1" stop-color="${a}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`;
    body += `<circle cx="${w * (0.2 + r() * 0.6)}" cy="${h * (0.15 + r() * 0.2)}" r="${h * 0.08}" fill="#fff" opacity=".7"/>`;
    for (let layer = 0; layer < 4; layer++) {
      const base = h * (0.45 + layer * 0.14);
      let p = `M0 ${h} L0 ${base}`;
      const steps = 8;
      for (let i = 0; i <= steps; i++) p += ` L${(w / steps) * i} ${base - r() * h * 0.18}`;
      p += ` L${w} ${h} Z`;
      body += `<path d="${p}" fill="${shade(layer % 2 ? b : c, -layer * 18)}" opacity="${0.75 + layer * 0.08}"/>`;
    }
  } else if (NIGHT.has(scene)) {
    body += `<rect width="${w}" height="${h}" fill="${a}"/><rect y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="${b}"/>`;
    for (let i = 0; i < 40; i++) {
      body += `<circle cx="${r() * w}" cy="${r() * h}" r="${4 + r() * (scene === 'map' ? 6 : 60)}" fill="${r() > 0.5 ? c : d}" opacity="${0.15 + r() * 0.5}"/>`;
    }
    if (scene === 'map') for (let i = 0; i < 1400; i++) body += `<circle cx="${w * 0.1 + r() * w * 0.8}" cy="${h * 0.1 + r() * h * 0.8}" r="2" fill="${[b, c, d][i % 3]}" opacity=".8"/>`;
  } else if (FOOD.has(scene)) {
    body += `<rect width="${w}" height="${h}" fill="${shade(d, -20)}"/>`;
    for (let i = 0; i < 12; i++) body += `<rect x="0" y="${(h / 12) * i}" width="${w}" height="${h / 24}" fill="${shade(d, -35)}" opacity=".3"/>`;
    body += `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${h * 0.38}" ry="${h * 0.36}" fill="${c}"/>`;
    body += `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${h * 0.28}" ry="${h * 0.26}" fill="${a}"/>`;
    for (let i = 0; i < 14; i++) {
      const ang = r() * Math.PI * 2, rad = r() * h * 0.22;
      body += `<ellipse cx="${w / 2 + Math.cos(ang) * rad}" cy="${h / 2 + Math.sin(ang) * rad}" rx="${10 + r() * 40}" ry="${8 + r() * 25}" fill="${b}" opacity="${0.3 + r() * 0.5}" transform="rotate(${r() * 180} ${w / 2} ${h / 2})"/>`;
    }
  } else {
    body += `<rect width="${w}" height="${h}" fill="${a}"/>`;
    for (let i = 0; i < 18; i++) {
      const x = r() * w, y = r() * h, s = 40 + r() * 260;
      body += r() > 0.5
        ? `<rect x="${x}" y="${y}" width="${s}" height="${s * (0.4 + r())}" rx="${r() * 20}" fill="${[b, c, d][i % 3]}" opacity="${0.35 + r() * 0.5}" transform="rotate(${r() * 30 - 15} ${x} ${y})"/>`
        : `<circle cx="${x}" cy="${y}" r="${s / 2}" fill="${[b, c, d][i % 3]}" opacity="${0.3 + r() * 0.5}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}
