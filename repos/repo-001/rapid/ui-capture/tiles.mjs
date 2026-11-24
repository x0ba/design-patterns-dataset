// Tiny software rasterizer that renders aerial-imagery-looking raster tiles from the seeded
// OSM data, so the "imagery" background works fully offline. Used by stub-server.mjs.
import zlib from 'node:zlib';

const TILE = 256;

// ---------- noise ----------
function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) { return 0.55 * vnoise(x, y, s) + 0.3 * vnoise(x * 2.7, y * 2.7, s + 7) + 0.15 * vnoise(x * 7.1, y * 7.1, s + 13); }

// ---------- projection ----------
function lonToX(lon, z) { return (lon + 180) / 360 * TILE * 2 ** z; }
function latToY(lat, z) { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * TILE * 2 ** z; }
function xToLon(x, z) { return x / (TILE * 2 ** z) * 360 - 180; }
function yToLat(y, z) { const n = Math.PI - 2 * Math.PI * y / (TILE * 2 ** z); return 180 / Math.PI * Math.atan(Math.sinh(n)); }

// ---------- style ----------
const ROAD_W = { motorway: 14, trunk: 12, primary: 11, secondary: 10, tertiary: 9, unclassified: 7, residential: 7, living_street: 6, service: 4.5, track: 3, footway: 1.8, path: 1.4, cycleway: 2, steps: 2, pedestrian: 5 };
function classify(tags, closed) {
  if (!tags) return null;
  const t = tags;
  if (t.building) return closed ? { kind: 'building' } : null;
  if (t.highway && ROAD_W[t.highway] && !(closed && t.area === 'yes')) {
    const paved = !['footway', 'path', 'track', 'steps', 'cycleway'].includes(t.highway);
    return { kind: 'line', z: paved ? 5 : 4, w: ROAD_W[t.highway], mat: paved ? 'asphalt' : (t.highway === 'path' || t.highway === 'track' ? 'dirt' : 'concrete') };
  }
  if (t.railway === 'rail') return { kind: 'line', z: 3, w: 3.2, mat: 'rail' };
  if (t.waterway === 'river') return { kind: 'line', z: 2, w: 22, mat: 'water' };
  if (t.waterway === 'stream' || t.waterway === 'ditch' || t.waterway === 'drain') return { kind: 'line', z: 2, w: 3, mat: 'water' };
  if (!closed) return null;
  if (t.natural === 'water' || t.waterway === 'riverbank' || t.leisure === 'swimming_pool') return { kind: 'area', z: t.leisure ? 4 : 2, mat: t.leisure ? 'pool' : 'water' };
  if (t.natural === 'wood' || t.landuse === 'forest') return { kind: 'area', z: 1, mat: 'wood' };
  if (t.natural === 'scrub' || t.natural === 'wetland') return { kind: 'area', z: 1, mat: 'scrub' };
  if (t.landuse === 'farmland' || t.landuse === 'meadow') return { kind: 'area', z: 0, mat: 'farm' };
  if (t.landuse === 'industrial' || t.landuse === 'commercial' || t.landuse === 'retail') return { kind: 'area', z: 0, mat: 'industrial' };
  if (t.leisure === 'park' || t.landuse === 'grass' || t.landuse === 'recreation_ground' || t.leisure === 'pitch' || t.leisure === 'playground') return { kind: 'area', z: t.leisure === 'pitch' ? 3 : 1, mat: t.leisure === 'pitch' ? 'pitch' : 'grass' };
  if (t.amenity === 'parking') return { kind: 'area', z: 3, mat: 'parking' };
  return null;
}

// mask classes: 0 ground, 1 water, 2 paved, 3 wood, 4 building
function matColor(mat, mx, my, n) {
  switch (mat) {
    case 'asphalt': return [70 + n * 22, 70 + n * 22, 70 + n * 20, 2];
    case 'concrete': return [168 + n * 20, 165 + n * 20, 158 + n * 18, 2];
    case 'dirt': return [140 + n * 25, 124 + n * 22, 95 + n * 15, 0];
    case 'rail': return [92 + n * 20, 82 + n * 18, 72 + n * 15, 2];
    case 'water': return [34 + n * 8, 58 + n * 10, 60 + n * 8, 1];
    case 'pool': return [80 + n * 15, 170 + n * 15, 195 + n * 10, 1];
    case 'wood': return [38 + n * 25, 60 + n * 28, 30 + n * 15, 3];
    case 'scrub': return [86 + n * 25, 98 + n * 25, 58 + n * 18, 0];
    case 'farm': {
      const stripe = Math.sin((mx * 0.8 + my * 0.25)) > 0.6 ? 10 : 0;
      return [150 + n * 25 - stripe, 142 + n * 20 - stripe, 92 + n * 18 - stripe, 0];
    }
    case 'industrial': return [128 + n * 20, 126 + n * 20, 118 + n * 18, 2];
    case 'grass': return [92 + n * 26, 126 + n * 26, 58 + n * 18, 0];
    case 'pitch': return [104 + n * 16, 140 + n * 16, 70 + n * 12, 0];
    case 'parking': return [98 + n * 20, 98 + n * 20, 96 + n * 18, 2];
  }
  return [128, 128, 128, 0];
}

export class TileRenderer {
  constructor(world) {
    const nodes = new Map();
    for (const e of world.entities) if (e.type === 'node') nodes.set(e.id, [e.lon, e.lat]);
    const ways = new Map();
    for (const e of world.entities) if (e.type === 'way') ways.set(e.id, e);
    this.features = [];
    const add = (rings, tags, id) => {
      const closed = rings[0].length > 3 && rings[0][0] === rings[0].at(-1);
      const c = classify(tags, closed);
      if (!c) return;
      const pts = rings.flat();
      const lons = pts.map(p => p[0]), lats = pts.map(p => p[1]);
      this.features.push({ ...c, id, tags, rings, ext: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] });
    };
    for (const w of ways.values()) {
      const ring = w.nodes.map(n => nodes.get(n)).filter(Boolean);
      if (ring.length < 2) continue;
      if (w.nodes[0] === w.nodes.at(-1)) ring[ring.length - 1] = ring[0];
      add([ring], w.tags, w.id);
    }
    for (const r of world.entities) {
      if (r.type !== 'relation' || r.tags?.type !== 'multipolygon') continue;
      const rings = r.members.filter(m => m.type === 'way' && ways.has(m.ref)).map(m => {
        const w = ways.get(m.ref); const ring = w.nodes.map(n => nodes.get(n));
        ring[ring.length - 1] = ring[0]; return ring;
      });
      if (rings.length) add(rings, r.tags, r.id);
    }
    const order = { area: 0, line: 1, building: 2 };
    this.features.sort((a, b) => (order[a.kind] - order[b.kind]) || (a.z - b.z));
    this.cache = new Map();
  }

  render(z, x, y) {
    const key = `${z}/${x}/${y}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const ox = x * TILE, oy = y * TILE;
    const lat0 = yToLat(oy + 128, z);
    const mpp = 156543.03392 * Math.cos(lat0 * Math.PI / 180) / 2 ** z;   // meters per pixel
    const buf = new Float32Array(TILE * TILE * 3);
    const mask = new Uint8Array(TILE * TILE);
    const W = TILE;

    // ground
    for (let j = 0; j < W; j++) {
      for (let i = 0; i < W; i++) {
        const mx = (ox + i) * mpp, my = (oy + j) * mpp;   // approx meters (local, consistent across tiles)
        const big = fbm(mx / 260, my / 260, 1), mid = fbm(mx / 40, my / 40, 2), fine = hash2(Math.floor(mx / 0.7), Math.floor(my / 0.7), 3);
        const g = big * 0.7 + mid * 0.3;
        const k = (j * W + i) * 3;
        buf[k] = 82 + g * 62 + fine * 10;
        buf[k + 1] = 106 + g * 34 + fine * 10;
        buf[k + 2] = 54 + g * 38 + fine * 8;
      }
    }

    const lonA = xToLon(ox, z), lonB = xToLon(ox + W, z), latA = yToLat(oy + W, z), latB = yToLat(oy, z);
    const padDeg = 30 / 111000;
    const toPx = ([lon, lat]) => [lonToX(lon, z) - ox, latToY(lat, z) - oy];

    const fill = (polys, shade) => {   // even-odd scanline fill of a set of rings (pixel coords)
      let minY = Infinity, maxY = -Infinity;
      for (const r of polys) for (const p of r) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
      const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(W - 1, Math.ceil(maxY));
      for (let j = y0; j <= y1; j++) {
        const sy = j + 0.5, xs = [];
        for (const r of polys) {
          for (let a = 0; a < r.length - 1; a++) {
            const [x1, y1_] = r[a], [x2, y2] = r[a + 1];
            if ((y1_ <= sy && y2 > sy) || (y2 <= sy && y1_ > sy)) xs.push(x1 + (sy - y1_) / (y2 - y1_) * (x2 - x1));
          }
        }
        xs.sort((p, q) => p - q);
        for (let q = 0; q + 1 < xs.length; q += 2) {
          const i0 = Math.max(0, Math.ceil(xs[q] - 0.5)), i1 = Math.min(W - 1, Math.floor(xs[q + 1] - 0.5));
          for (let i = i0; i <= i1; i++) shade(i, j);
        }
      }
    };
    const put = (i, j, c, alpha = 1) => {
      const k = (j * W + i) * 3;
      buf[k] += (c[0] - buf[k]) * alpha; buf[k + 1] += (c[1] - buf[k + 1]) * alpha; buf[k + 2] += (c[2] - buf[k + 2]) * alpha;
    };
    const matShade = mat => (i, j) => {
      const mx = (ox + i) * mpp, my = (oy + j) * mpp;
      const n = hash2(Math.floor(mx / 0.6), Math.floor(my / 0.6), 9) * 0.6 + vnoise(mx / 9, my / 9, 4) * 0.4;
      const c = matColor(mat, mx, my, n);
      put(i, j, c); mask[j * W + i] = c[3];
    };
    const disk = (cx, cy, r, shade) => {
      for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(W - 1, Math.ceil(cy + r)); j++)
        for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(W - 1, Math.ceil(cx + r)); i++)
          if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) shade(i, j);
    };
    const stroke = (pts, wpx, shade) => {
      const hw = Math.max(wpx / 2, 0.5);
      for (let a = 0; a < pts.length - 1; a++) {
        const [x1, y1] = pts[a], [x2, y2] = pts[a + 1];
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len * hw, ny = dx / len * hw;
        fill([[[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny], [x1 + nx, y1 + ny]]], shade);
        if (hw > 1.5) disk(x2, y2, hw, shade);
      }
      if (hw > 1.5) disk(pts[0][0], pts[0][1], hw, shade);
    };

    const visible = this.features.filter(f => f.ext[2] >= lonA - padDeg && f.ext[0] <= lonB + padDeg && f.ext[3] >= latA - padDeg && f.ext[1] <= latB + padDeg);
    let treesDone = false;
    const drawTrees = () => {
      treesDone = true;
      if (mpp > 3) return;
      const cell = 11;   // meters
      const mx0 = ox * mpp, my0 = oy * mpp, mx1 = (ox + W) * mpp, my1 = (oy + W) * mpp;
      for (let gy = Math.floor(my0 / cell) - 1; gy <= Math.ceil(my1 / cell) + 1; gy++) {
        for (let gx = Math.floor(mx0 / cell) - 1; gx <= Math.ceil(mx1 / cell) + 1; gx++) {
          const tx = (gx + hash2(gx, gy, 21)) * cell, ty = (gy + hash2(gx, gy, 22)) * cell;
          const pi = Math.floor(tx / mpp - ox), pj = Math.floor(ty / mpp - oy);
          const m = (pi >= 0 && pj >= 0 && pi < W && pj < W) ? mask[pj * W + pi] : 0;
          if (m === 1 || m === 2) continue;
          const density = m === 3 ? 0.95 : Math.max(0, fbm(tx / 120, ty / 120, 30) - 0.38) * 1.1;
          if (hash2(gx, gy, 23) > density) continue;
          const r = (2.5 + hash2(gx, gy, 24) * 3.5) / mpp;
          const tone = hash2(gx, gy, 25);
          disk(tx / mpp - ox + r * 0.35, ty / mpp - oy + r * 0.35, r, (i, j) => put(i, j, [20, 28, 16], 0.45));   // shadow
          disk(tx / mpp - ox, ty / mpp - oy, r, (i, j) => {
            const dx = (i + 0.5) - (tx / mpp - ox), dy = (j + 0.5) - (ty / mpp - oy);
            const lit = Math.max(0, -(dx + dy) / (2 * r));
            const n = hash2(Math.floor((ox + i) * mpp / 0.5), Math.floor((oy + j) * mpp / 0.5), 26);
            put(i, j, [36 + tone * 30 + lit * 40 + n * 12, 58 + tone * 30 + lit * 40 + n * 14, 26 + tone * 14 + lit * 18 + n * 6]);
          });
        }
      }
    };

    for (const f of visible) {
      if (f.kind === 'building' && !treesDone) drawTrees();
      const rings = f.rings.map(r => r.map(toPx));
      if (f.kind === 'area') {
        fill(rings, matShade(f.mat));
      } else if (f.kind === 'line') {
        stroke(rings[0], f.w / mpp, matShade(f.mat));
        if (f.mat === 'asphalt' && f.w >= 7 && mpp < 0.5) {   // faint lane marking
          stroke(rings[0], Math.max(0.12 / mpp, 0.6), (i, j) => put(i, j, [190, 180, 120], 0.35));
        }
      } else if (f.kind === 'building') {
        const hroof = hash2(f.id, 7, 40);
        const roof = hroof < 0.35 ? [92, 88, 86] : hroof < 0.6 ? [128, 108, 92] : hroof < 0.8 ? [168, 166, 160] : hroof < 0.92 ? [70, 72, 78] : [196, 194, 188];
        const sh = 2.5 / mpp;
        fill(rings.map(r => r.map(([a, b]) => [a + sh, b + sh])), (i, j) => put(i, j, [18, 22, 16], 0.55));
        const cx = rings[0].reduce((s, p) => s + p[0], 0) / rings[0].length;
        fill(rings, (i, j) => {
          const n = hash2(Math.floor((ox + i) * mpp / 0.5), Math.floor((oy + j) * mpp / 0.5), 41);
          const half = (i + 0.5) < cx ? 1.08 : 0.92;
          put(i, j, [roof[0] * half + n * 14, roof[1] * half + n * 14, roof[2] * half + n * 14]);
          mask[j * W + i] = 4;
        });
      }
    }
    if (!treesDone) drawTrees();

    const png = encodePNG(buf, W, W);
    if (this.cache.size > 4000) this.cache.clear();
    this.cache.set(key, png);
    return png;
  }
}

export function encodePNG(buf, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let j = 0; j < h; j++) {
    raw[j * (w * 3 + 1)] = 0;
    for (let i = 0; i < w * 3; i++) raw[j * (w * 3 + 1) + 1 + i] = Math.max(0, Math.min(255, Math.round(buf[j * w * 3 + i])));
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
