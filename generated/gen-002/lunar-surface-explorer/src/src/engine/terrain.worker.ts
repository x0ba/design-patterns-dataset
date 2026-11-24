/**
 * Builds two half-float RGBA maps from the crater catalogue:
 *  - global equirectangular map  (R = height km, G = brightness boost / rays, B = mare mask)
 *  - south-polar orthographic map (R = height km, G = brightness boost, B = permanent-shadow mask)
 */
import type { GenCrater, GenMare, GenRequest } from './terrain.types';

const R_KM = 1737.4;
const D2R = Math.PI / 180;
const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
function f2h(v: number) {
  f32[0] = v;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  const e = ((x >>> 23) & 0xff) - 127 + 15;
  const m = (x >>> 13) & 0x3ff;
  if (e <= 0) return sign;
  if (e >= 31) return sign | 0x7bff;
  return sign | (e << 10) | m;
}
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Crater height profile. x = r / R_rim. Returns km. */
function profile(x: number, D: number, depth: number, peak: boolean): number {
  const rim = depth * 0.16;
  if (x < 1) {
    const floorR = D > 30 ? 0.55 : 0.0;
    let h: number;
    if (x <= floorR) h = -depth;
    else {
      const t = (x - floorR) / (1 - floorR);
      const w = t * t * (3 - 2 * t);
      h = -depth + (depth + rim) * Math.pow(w, 1.15);
    }
    if (peak && x < 0.22) h += depth * 0.32 * Math.exp(-(x * x) / (2 * 0.08 * 0.08));
    return h;
  }
  return rim * Math.exp(-(x - 1) * 3.4) * (1 / (x * x));
}
const reach = (x: number) => (x < 1 ? 1 : 3.2); // how far (in radii) the profile matters

function genericCraters(
  seed: number, count: number, dMin: number, dMax: number, centre: [number, number, number] | null,
  capRad: number, ageBias: (lat: number, lon: number) => number,
): GenCrater[] {
  const r = rng(seed);
  const list: GenCrater[] = [];
  let guard = 0;
  while (list.length < count && guard++ < count * 6) {
    // power-law N(>D) ~ D^-2
    const u = r();
    const d = dMin / Math.sqrt(1 - u * (1 - (dMin * dMin) / (dMax * dMax)));
    let lat: number, lon: number;
    if (centre) {
      // uniform over the polar cap
      const th = Math.acos(1 - r() * (1 - Math.cos(capRad)));
      const ph = r() * Math.PI * 2;
      const y = -Math.cos(th), x = Math.sin(th) * Math.sin(ph);
      lat = Math.asin(y) / D2R;
      lon = Math.atan2(x, Math.sin(th) * Math.cos(ph)) / D2R;
    } else {
      lat = Math.asin(r() * 2 - 1) / D2R;
      lon = r() * 360 - 180;
    }
    if (r() > ageBias(lat, lon)) continue;
    const fresh = r();
    const dep = d * (0.045 + fresh * fresh * 0.13);
    list.push({ lat, lon, d, depth: dep });
  }
  return list;
}

/* mare mask via ellipses (rx east-west, ry north-south, km) */
function mareMask(mares: GenMare[], lat: number, lon: number): number {
  let m = 0;
  const la = lat * D2R;
  const cl = Math.max(0.1, Math.cos(la));
  for (const ma of mares) {
    const dl = Math.abs(((lon - ma.lon + 540) % 360) - 180);
    if (dl > 70) continue;
    const dy = ((lat - ma.lat) * D2R * R_KM) / ma.ry;
    const dx = (dl * D2R * R_KM * cl) / ma.rx;
    const rr = Math.sqrt(dx * dx + dy * dy);
    m = Math.max(m, 1 - sstep(0.6, 1.08, rr));
  }
  return m;
}

function packLevel(c0: Float32Array, c1: Float32Array, c2: Float32Array, n: number) {
  const out = new Uint16Array(n * 4);
  const one = f2h(1);
  for (let k = 0; k < n; k++) {
    out[k * 4] = f2h(c0[k]);
    out[k * 4 + 1] = f2h(c1[k]);
    out[k * 4 + 2] = f2h(c2[k]);
    out[k * 4 + 3] = one;
  }
  return out;
}
function down(src: Float32Array, w: number, h: number) {
  const nw = w >> 1, nh = h >> 1;
  const dst = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const r0 = 2 * y * w, r1 = r0 + w;
    for (let x = 0; x < nw; x++) {
      dst[y * nw + x] = (src[r0 + 2 * x] + src[r0 + 2 * x + 1] + src[r1 + 2 * x] + src[r1 + 2 * x + 1]) * 0.25;
    }
  }
  return dst;
}
function buildMips(c0: Float32Array, c1: Float32Array, c2: Float32Array, w: number, h: number) {
  const levels: { data: Uint16Array; width: number; height: number }[] = [];
  let a = c0, b = c1, c = c2, cw = w, ch = h;
  for (;;) {
    levels.push({ data: packLevel(a, b, c, cw * ch), width: cw, height: ch });
    if (cw <= 8 || ch <= 8) break;
    a = down(a, cw, ch); b = down(b, cw, ch); c = down(c, cw, ch);
    cw >>= 1; ch >>= 1;
  }
  return levels;
}

function run(req: GenRequest) {
  const { kind, size, capDeg, craters, mares } = req;
  const capRad = capDeg * D2R;
  const W = size;
  const H = kind === 'polar' ? size : size / 2;
  const hgt = new Float32Array(W * H);
  const bright = new Float32Array(W * H);
  const aux = new Float32Array(W * H); // mare (global) or PSR (polar)
  const sinCap = Math.sin(capRad);

  const sLon = new Float32Array(kind === 'global' ? W : 0), cLon = new Float32Array(kind === 'global' ? W : 0);
  const sLat = new Float32Array(kind === 'global' ? H : 0), cLat = new Float32Array(kind === 'global' ? H : 0);
  if (kind === 'global') {
    for (let i = 0; i < W; i++) { const lo = (((i + 0.5) / W) * 360 - 180) * D2R; sLon[i] = Math.sin(lo); cLon[i] = Math.cos(lo); }
    for (let j = 0; j < H; j++) { const la = (((j + 0.5) / H) * 180 - 90) * D2R; sLat[j] = Math.sin(la); cLat[j] = Math.cos(la); }
  }
  // pixel → unit vector
  const pixVec = (i: number, j: number): [number, number, number] | null => {
    if (kind === 'polar') {
      const x = ((i + 0.5) / W) * 2 - 1;
      const z = ((j + 0.5) / H) * 2 - 1;
      const rr = x * x + z * z;
      const s2 = sinCap * sinCap;
      if (rr * s2 > s2) return null;
      return [x * sinCap, -Math.sqrt(Math.max(0, 1 - rr * s2)), z * sinCap];
    }
    return [cLat[j] * sLon[i], sLat[j], cLat[j] * cLon[i]];
  };
  const toIJ = (v: [number, number, number]): [number, number] => {
    if (kind === 'polar') {
      return [((v[0] / sinCap) * 0.5 + 0.5) * W - 0.5, ((v[2] / sinCap) * 0.5 + 0.5) * H - 0.5];
    }
    const lat = Math.asin(v[1]) / D2R;
    const lon = Math.atan2(v[0], v[2]) / D2R;
    return [((lon + 180) / 360) * W - 0.5, ((lat + 90) / 180) * H - 0.5];
  };

  /* ── 1. gentle base relief (value noise, 3 octaves) ── */
  const kmPerPx = kind === 'polar' ? (2 * R_KM * sinCap) / W : (2 * Math.PI * R_KM) / W;
  const baseR = rng(kind === 'polar' ? 77 : 99);
  const G = 64;
  const grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i++) grid[i] = baseR() * 2 - 1;
  const vnoise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = (a: number, b: number) => grid[(((b % G) + G) % G) * G + (((a % G) + G) % G)];
    return (
      (g(xi, yi) * (1 - sx) + g(xi + 1, yi) * sx) * (1 - sy) +
      (g(xi, yi + 1) * (1 - sx) + g(xi + 1, yi + 1) * sx) * sy
    );
  };
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const v = pixVec(i, j);
      if (!v) continue;
      const km = kmPerPx;
      let x = i * km, y = j * km;
      if (kind === 'global') {
        const cl = Math.max(0.15, Math.cos(((j + 0.5) / H) * Math.PI - Math.PI / 2));
        x *= cl;
        y = y * 1.0;
      }
      const n = vnoise(x / 60, y / 60) * 0.9 + vnoise(x / 22, y / 22) * 0.45 + vnoise(x / 8, y / 8) * 0.22;
      hgt[j * W + i] = n * (kind === 'polar' ? 0.55 : 0.4);
    }
  }

  /* ── 2. maria (global only) ── */
  if (kind === 'global') {
    // evaluate the ellipses on a coarse grid, then interpolate
    const cw = 1024, chh = 512;
    const coarse = new Float32Array(cw * chh);
    for (let j = 0; j < chh; j++) {
      const lat = ((j + 0.5) / chh) * 180 - 90;
      for (let i = 0; i < cw; i++) coarse[j * cw + i] = mareMask(mares, lat, ((i + 0.5) / cw) * 360 - 180);
    }
    for (let j = 0; j < H; j++) {
      const fy = Math.min(chh - 1.001, Math.max(0, ((j + 0.5) / H) * chh - 0.5));
      const y0 = Math.floor(fy), ty = fy - y0;
      for (let i = 0; i < W; i++) {
        const fx = ((i + 0.5) / W) * cw - 0.5;
        const x0 = Math.floor(fx), tx = fx - x0;
        const xa = (x0 + cw) % cw, xb = (x0 + 1 + cw) % cw;
        const m =
          (coarse[y0 * cw + xa] * (1 - tx) + coarse[y0 * cw + xb] * tx) * (1 - ty) +
          (coarse[(y0 + 1) * cw + xa] * (1 - tx) + coarse[(y0 + 1) * cw + xb] * tx) * ty;
        aux[j * W + i] = m;
        hgt[j * W + i] -= m * 1.4;
      }
    }
  }

  /* ── 3. craters, large to small ── */
  const generic =
    kind === 'polar'
      ? genericCraters(4242, 16000, 0.7, 26, [0, -1, 0], capRad, () => 1)
      : genericCraters(1717, 7000, 21, 160, null, capRad, (la, lo) => 1 - 0.8 * mareMask(mares, la, lo));
  const all = [...craters.map((c) => ({ ...c, named: true })), ...generic].sort((a, b) => b.d - a.d);
  const minPx = kind === 'polar' ? 1.5 : 1.2;
  for (const c of all) {
    const Rk = c.d / 2;
    const rPx = Rk / kmPerPx;
    if (rPx < minPx) continue;
    const cv: [number, number, number] = [
      Math.cos(c.lat * D2R) * Math.sin(c.lon * D2R), Math.sin(c.lat * D2R), Math.cos(c.lat * D2R) * Math.cos(c.lon * D2R),
    ];
    const ext = 3.2; // radii covered
    const [ci, cj] = toIJ(cv);
    let i0: number, i1: number, j0: number, j1: number;
    if (kind === 'polar') {
      const ex = ext * rPx + 2;
      i0 = Math.max(0, Math.floor(ci - ex)); i1 = Math.min(W - 1, Math.ceil(ci + ex));
      j0 = Math.max(0, Math.floor(cj - ex)); j1 = Math.min(H - 1, Math.ceil(cj + ex));
    } else {
      const ex = ext * rPx + 2;
      const cl = Math.max(0.08, Math.cos(c.lat * D2R));
      const exi = Math.min(W / 2, ex / cl);
      i0 = Math.floor(ci - exi); i1 = Math.ceil(ci + exi);
      j0 = Math.max(0, Math.floor(cj - ex)); j1 = Math.min(H - 1, Math.ceil(cj + ex));
      if (cl < 0.1) { i0 = 0; i1 = W - 1; }
    }
    const peak = c.d > 36 && !c.psr && c.d < 200 && !c.dark;
    const maxR = ext * Rk;
    const cosMax = Math.cos(Math.min(Math.PI, maxR / R_KM));
    for (let j = j0; j <= j1; j++) {
      for (let ii = i0; ii <= i1; ii++) {
        const i = kind === 'global' ? ((ii % W) + W) % W : ii;
        const v = pixVec(i, j);
        if (!v) continue;
        const dotp = v[0] * cv[0] + v[1] * cv[1] + v[2] * cv[2];
        if (dotp < cosMax) continue;
        const ang = Math.acos(Math.min(1, dotp));
        const rk = ang * R_KM;
        if (rk > maxR) continue;
        const x = rk / Rk;
        const p = profile(x, c.d, c.depth, peak);
        const idx = j * W + i;
        if (x < 1) {
          if (c.named) {
            hgt[idx] = p + hgt[idx] * 0.15; // replace the old terrain inside a named crater
          } else {
            hgt[idx] += p * (0.55 + 0.45 * sstep(0, 0.4, x)) ;
          }
          if (kind === 'global' && (c.dark)) aux[idx] = Math.max(aux[idx], 0.9 * (1 - sstep(0.6, 1, x)));
          else if (kind === 'global') aux[idx] *= 1 - 0.7 * (1 - sstep(0.7, 1, x));
        } else {
          hgt[idx] += p;
        }
        if (c.psr && kind === 'polar') {
          // floor share in permanent shadow: mask grows from the centre outward
          const edge = Math.sqrt(c.psr) * 0.78;
          aux[idx] = Math.max(aux[idx], 1 - sstep(edge - 0.1, edge + 0.04, x));
        }
        // fresh/bright ejecta
        const fresh = c.depth / c.d > 0.07 ? 1 : 0.4;
        if (x < 2.6) bright[idx] = Math.max(bright[idx], (c.named ? (c.rays ? 0.12 : 0.06) : 0.14) * fresh * (1 - sstep(0.5, 2.6, x)));
      }
    }
    // rays
    if (c.rays && kind === 'global') {
      const rr = rng(Math.floor((c.lat + 90) * 977 + (c.lon + 180) * 31));
      const nRays = 16;
      const rays = Array.from({ length: nRays }, () => ({ az: rr() * Math.PI * 2, w: 0.025 + rr() * 0.05, len: 8 + rr() * 22 }));
      const maxKm = 45 * Rk;
      const cosRay = Math.cos(Math.min(Math.PI, maxKm / R_KM));
      const ex = maxKm / kmPerPx;
      const cl = Math.max(0.08, Math.cos(c.lat * D2R));
      const exi = Math.min(W / 2, ex / cl);
      const i0r = Math.floor(ci - exi), i1r = Math.ceil(ci + exi);
      const j0r = Math.max(0, Math.floor(cj - ex)), j1r = Math.min(H - 1, Math.ceil(cj + ex));
      const sl = Math.sin(c.lat * D2R), cla = Math.cos(c.lat * D2R);
      for (let j = j0r; j <= j1r; j++) {
        for (let ii = i0r; ii <= i1r; ii++) {
          const i = ((ii % W) + W) % W;
          const v = pixVec(i, j)!;
          const dotp = v[0] * cv[0] + v[1] * cv[1] + v[2] * cv[2];
          if (dotp < cosRay) continue;
          const ang = Math.acos(Math.min(1, dotp));
          const rk = ang * R_KM;
          if (rk < 1.0 * Rk) continue;
          // azimuth of pixel from crater
          const lat2 = Math.asin(v[1]);
          const lon2 = Math.atan2(v[0], v[2]);
          const dl = lon2 - c.lon * D2R;
          const az = Math.atan2(Math.sin(dl) * Math.cos(lat2), cla * Math.sin(lat2) - sl * Math.cos(lat2) * Math.cos(dl));
          let b = 0;
          for (const ry of rays) {
            let da = Math.abs(az - ry.az);
            da = Math.min(da, Math.PI * 2 - da);
            const widthHere = ry.w * (1 + 4 / (rk / Rk));
            if (da < widthHere * 2) {
              const along = 1 - sstep(ry.len * 0.4, ry.len * 1.3, rk / Rk);
              b = Math.max(b, Math.exp(-(da * da) / (widthHere * widthHere)) * along);
            }
          }
          const idx = j * W + i;
          bright[idx] = Math.max(bright[idx], b * 0.22 * sstep(1.0, 2.2, rk / Rk));
        }
      }
    }
  }

  /* ── 4. buffers + mipmaps ── */
  return { levels: buildMips(hgt, bright, aux, W, H) };
}

const ctx = self as unknown as { onmessage: ((e: { data: GenRequest }) => void) | null; postMessage: (m: unknown, t?: ArrayBuffer[]) => void };
ctx.onmessage = (e) => {
  const req = e.data;
  const t0 = performance.now();
  const res = run(req);
  ctx.postMessage({ kind: req.kind, levels: res.levels, ms: performance.now() - t0 }, res.levels.map((l) => l.data.buffer as ArrayBuffer));
};

