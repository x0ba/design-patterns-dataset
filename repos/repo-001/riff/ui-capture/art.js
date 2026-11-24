'use strict';
// Deterministic generated artwork (stand-in for i.ytimg.com / sndcdn.com cover images, which are unreachable offline).
const crypto = require('crypto');

function rng(seed) {
  let h = crypto.createHash('sha256').update(seed).digest();
  let i = 0;
  return () => {
    if (i >= h.length - 4) { h = crypto.createHash('sha256').update(h).digest(); i = 0; }
    const v = h.readUInt32BE(i) / 0xffffffff; i += 4; return v;
  };
}
const hsl = (h, s, l) => `hsl(${Math.round(h) % 360} ${Math.round(s)}% ${Math.round(l)}%)`;

function albumSvg(key) {
  const r = rng(key);
  const base = r() * 360;
  const pal = [hsl(base, 45 + r() * 40, 12 + r() * 25), hsl(base + 30 + r() * 60, 50 + r() * 40, 35 + r() * 30), hsl(base + 150 + r() * 80, 40 + r() * 50, 45 + r() * 30), hsl(base + 200, 30 + r() * 40, 70 + r() * 20)];
  const style = Math.floor(r() * 5);
  let body = '';
  const defs = `<filter id="b"><feGaussianBlur stdDeviation="${18 + r() * 30}"/></filter>
  <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.22 0"/></filter>
  <linearGradient id="g" x1="0" y1="0" x2="${r().toFixed(2)}" y2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset="1" stop-color="${pal[1]}"/></linearGradient>`;
  body += `<rect width="400" height="400" fill="url(#g)"/>`;
  if (style === 0) { // soft blobs
    for (let i = 0; i < 5; i++) body += `<circle cx="${r() * 400}" cy="${r() * 400}" r="${60 + r() * 140}" fill="${pal[1 + (i % 3)]}" opacity="${0.5 + r() * 0.5}" filter="url(#b)"/>`;
  } else if (style === 1) { // sun + horizon
    const cy = 150 + r() * 80;
    body += `<circle cx="200" cy="${cy}" r="${70 + r() * 50}" fill="${pal[3]}"/>`;
    body += `<rect y="${cy + 30}" width="400" height="${400 - cy}" fill="${pal[0]}" opacity="0.92"/>`;
    for (let i = 0; i < 6; i++) body += `<rect y="${cy + 40 + i * 14}" width="400" height="${2 + i}" fill="${pal[2]}" opacity="0.35"/>`;
  } else if (style === 2) { // concentric rings
    const cx = 120 + r() * 160, cy = 120 + r() * 160;
    for (let i = 12; i > 0; i--) body += `<circle cx="${cx}" cy="${cy}" r="${i * 24}" fill="none" stroke="${pal[1 + (i % 3)]}" stroke-width="${3 + r() * 9}" opacity="0.8"/>`;
  } else if (style === 3) { // diagonal bands
    for (let i = 0; i < 9; i++) body += `<rect x="${-200 + i * 70}" y="-100" width="${20 + r() * 40}" height="700" fill="${pal[1 + (i % 3)]}" opacity="${0.35 + r() * 0.5}" transform="rotate(${25 + r() * 10} 200 200)"/>`;
  } else { // photo-ish: blurred landscape with figure
    body += `<ellipse cx="${100 + r() * 200}" cy="${280 + r() * 60}" rx="300" ry="120" fill="${pal[0]}" filter="url(#b)"/>`;
    body += `<circle cx="${80 + r() * 240}" cy="${80 + r() * 100}" r="${40 + r() * 60}" fill="${pal[3]}" opacity="0.85" filter="url(#b)"/>`;
    body += `<path d="M0 ${300 + r() * 40} Q 120 ${240 + r() * 60} 220 ${290 + r() * 30} T 400 ${270 + r() * 50} V400 H0Z" fill="${pal[2]}" opacity="0.55"/>`;
  }
  body += `<rect width="400" height="400" filter="url(#n)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs>${defs}</defs>${body}</svg>`;
}

function artistSvg(key) {
  const r = rng('artist:' + key);
  const base = r() * 360;
  const bg1 = hsl(base, 30 + r() * 40, 18 + r() * 20), bg2 = hsl(base + 40, 40 + r() * 40, 40 + r() * 25);
  const skin = hsl(20 + r() * 20, 25 + r() * 30, 30 + r() * 45);
  const cloth = hsl(base + 180 + r() * 60, 20 + r() * 40, 15 + r() * 30);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs>
<radialGradient id="g" cx="${0.3 + r() * 0.4}" cy="0.3" r="0.9"><stop offset="0" stop-color="${bg2}"/><stop offset="1" stop-color="${bg1}"/></radialGradient>
<filter id="b"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.18 0"/></filter></defs>
<rect width="400" height="400" fill="url(#g)"/>
<g filter="url(#b)"><ellipse cx="${190 + r() * 20}" cy="${165 + r() * 20}" rx="${62 + r() * 12}" ry="${78 + r() * 10}" fill="${skin}"/>
<path d="M60 400 C 70 300, 130 265, 200 262 C 270 265, 330 300, 340 400 Z" fill="${cloth}"/>
<path d="M${128 + r() * 10} ${150 + r() * 10} C 130 ${70 + r() * 20}, 270 ${70 + r() * 20}, ${262 + r() * 10} ${150 + r() * 10} C 250 110, 150 110, 128 150Z" fill="${hsl(base, 20, 8 + r() * 20)}" opacity="${0.6 + r() * 0.4}"/></g>
<rect width="400" height="400" filter="url(#n)"/></svg>`;
}

function handle(req, res, u, CORS) {
  const parts = u.pathname.split('/'); // ['', '__art', kind, file]
  const kind = parts[2] || 'album';
  const key = decodeURIComponent((parts[3] || 'x').replace(/\.svg$/, ''));
  const svg = kind === 'artist' ? artistSvg(key) : albumSvg(kind + ':' + key);
  res.writeHead(200, { ...CORS, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=86400' });
  res.end(svg);
}

module.exports = { handle, albumSvg, artistSvg };
