import opentype from 'opentype.js';
import yellowtailUrl from '@fontsource/yellowtail/files/yellowtail-latin-400-normal.woff?url';
import kaushanUrl from '@fontsource/kaushan-script/files/kaushan-script-latin-400-normal.woff?url';
import barlowUrl from '@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff?url';
import oswaldUrl from '@fontsource/oswald/files/oswald-latin-500-normal.woff?url';
import cinzelUrl from '@fontsource/cinzel/files/cinzel-latin-600-normal.woff?url';
import type { El, FontId, Box } from './types';

export const FONT_META: Record<FontId, { label: string; sub: string; url: string; css: string }> = {
  yellowtail: { label: 'Yellowtail', sub: 'Brush script', url: yellowtailUrl, css: 'Yellowtail' },
  kaushan: { label: 'Kaushan', sub: 'Dry-brush script', url: kaushanUrl, css: 'Kaushan Script' },
  barlow: { label: 'Barlow Condensed', sub: 'Condensed gothic', url: barlowUrl, css: 'Barlow Condensed' },
  oswald: { label: 'Oswald', sub: 'Tall gothic', url: oswaldUrl, css: 'Oswald' },
  cinzel: { label: 'Cinzel', sub: 'Roman caps', url: cinzelUrl, css: 'Cinzel' },
};

const fonts: Partial<Record<FontId, opentype.Font>> = {};

export async function loadFonts(): Promise<void> {
  await Promise.all(
    (Object.keys(FONT_META) as FontId[]).map(async (id) => {
      const buf = await fetch(FONT_META[id].url).then((r) => r.arrayBuffer());
      fonts[id] = opentype.parse(buf);
    }),
  );
}

export interface Geo {
  /** Path data in cap-height units, y up, anchor (0,0) = centre of bottom baseline. */
  d: string;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  /** Ink area in cap-height² units. */
  area: number;
  /** Contour length in cap-height units. */
  perim: number;
  missing: string[];
}

type Cmd = opentype.PathCommand;
type Pt = (x: number, y: number) => [number, number];

function mapCmds(cmds: Cmd[], f: Pt): Cmd[] {
  return cmds.map((c) => {
    switch (c.type) {
      case 'M':
      case 'L': {
        const [x, y] = f(c.x, c.y);
        return { type: c.type, x, y } as Cmd;
      }
      case 'Q': {
        const [x1, y1] = f(c.x1, c.y1);
        const [x, y] = f(c.x, c.y);
        return { type: 'Q', x1, y1, x, y } as Cmd;
      }
      case 'C': {
        const [x1, y1] = f(c.x1, c.y1);
        const [x2, y2] = f(c.x2, c.y2);
        const [x, y] = f(c.x, c.y);
        return { type: 'C', x1, y1, x2, y2, x, y } as Cmd;
      }
      default:
        return c;
    }
  });
}

function finish(cmds: Cmd[], missing: string[]): Geo {
  const p = new opentype.Path();
  p.commands = cmds;
  const bb = p.getBoundingBox();
  const d = p.toPathData(4);
  return {
    d,
    bbox: { x1: bb.x1, y1: bb.y1, x2: bb.x2, y2: bb.y2 },
    area: rasterArea(d, bb),
    perim: perimeter(cmds),
    missing,
  };
}

function rasterArea(d: string, bb: { x1: number; y1: number; x2: number; y2: number }): number {
  const S = 80;
  const w = Math.ceil((bb.x2 - bb.x1) * S) + 4;
  const h = Math.ceil((bb.y2 - bb.y1) * S) + 4;
  if (w <= 4 || h <= 4 || w > 4000 || h > 4000) return 0;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.setTransform(S, 0, 0, -S, -bb.x1 * S + 2, bb.y2 * S + 2);
  ctx.fillStyle = '#000';
  ctx.fill(new Path2D(d), 'nonzero');
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 3; i < data.length; i += 4) sum += data[i];
  return sum / 255 / (S * S);
}

function perimeter(cmds: Cmd[]): number {
  let len = 0;
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const N = 8;
  for (const c of cmds) {
    if (c.type === 'M') { cx = sx = c.x; cy = sy = c.y; }
    else if (c.type === 'L') { len += Math.hypot(c.x - cx, c.y - cy); cx = c.x; cy = c.y; }
    else if (c.type === 'Q') {
      let px = cx, py = cy;
      for (let i = 1; i <= N; i++) {
        const t = i / N, u = 1 - t;
        const x = u * u * cx + 2 * u * t * c.x1 + t * t * c.x;
        const y = u * u * cy + 2 * u * t * c.y1 + t * t * c.y;
        len += Math.hypot(x - px, y - py); px = x; py = y;
      }
      cx = c.x; cy = c.y;
    } else if (c.type === 'C') {
      let px = cx, py = cy;
      for (let i = 1; i <= N; i++) {
        const t = i / N, u = 1 - t;
        const x = u * u * u * cx + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x;
        const y = u * u * u * cy + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y;
        len += Math.hypot(x - px, y - py); px = x; py = y;
      }
      cx = c.x; cy = c.y;
    } else if (c.type === 'Z') { len += Math.hypot(sx - cx, sy - cy); cx = sx; cy = sy; }
  }
  return len;
}

function textGeo(fontId: FontId, lines: string[], tracking: number, leading: number, arc: number, xs: number): Geo {
  const font = fonts[fontId]!;
  const upm = font.unitsPerEm;
  const capUnits = font.charToGlyph('H').getBoundingBox().y2 || upm * 0.7;
  const k = 1 / capUnits;
  const kx = k * xs;
  const missing: string[] = [];
  const n = lines.length;
  const all: Cmd[] = [];
  let singleW = 0;
  lines.forEach((line, li) => {
    let x = 0;
    let prev: opentype.Glyph | null = null;
    const lineCmds: Cmd[] = [];
    for (const ch of Array.from(line)) {
      if (!font.hasChar(ch)) { if (!missing.includes(ch)) missing.push(ch); continue; }
      const g = font.charToGlyph(ch);
      if (prev) x += font.getKerningValue(prev, g);
      const gx = x;
      lineCmds.push(...mapCmds(g.path.commands, (px, py) => [(px + gx) * kx, py * k]));
      x += (g.advanceWidth ?? 0) + tracking * upm;
      prev = g;
    }
    const w = Math.max(0, (x - tracking * upm) * kx);
    if (n === 1) singleW = w;
    const yOff = (n - 1 - li) * leading;
    all.push(...mapCmds(lineCmds, (px, py) => [px - w / 2, py + yOff]));
  });

  if (n === 1 && Math.abs(arc) > 0.01 && singleW > 0) {
    const th = (Math.abs(arc) * Math.PI) / 180;
    const R = singleW / th;
    const up = arc > 0;
    const warped = mapCmds(all, (u, h) => {
      const phi = u / R;
      return up
        ? [(R + h) * Math.sin(phi), (R + h) * Math.cos(phi) - R]
        : [(R - h) * Math.sin(phi), R - (R - h) * Math.cos(phi)];
    });
    return finish(warped, missing);
  }
  return finish(all, missing);
}

/* ---------- Wheat sheaf ornament, drawn in unit-height coordinates ---------- */

function ellipse(cx: number, cy: number, rx: number, ry: number, rot: number): Cmd[] {
  const K = 0.5522847498;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const T = (x: number, y: number): [number, number] => [cx + x * cs - y * sn, cy + x * sn + y * cs];
  const pts: [number, number][] = [
    [rx, 0], [rx, ry * K], [rx * K, ry], [0, ry],
    [-rx * K, ry], [-rx, ry * K], [-rx, 0],
    [-rx, -ry * K], [-rx * K, -ry], [0, -ry],
    [rx * K, -ry], [rx, -ry * K], [rx, 0],
  ];
  const out: Cmd[] = [];
  const s = T(...pts[0]);
  out.push({ type: 'M', x: s[0], y: s[1] } as Cmd);
  for (let i = 1; i < pts.length; i += 3) {
    const a = T(...pts[i]), b = T(...pts[i + 1]), c = T(...pts[i + 2]);
    out.push({ type: 'C', x1: a[0], y1: a[1], x2: b[0], y2: b[1], x: c[0], y: c[1] } as Cmd);
  }
  out.push({ type: 'Z' } as Cmd);
  return out;
}

function polygon(pts: [number, number][]): Cmd[] {
  const out: Cmd[] = [{ type: 'M', x: pts[0][0], y: pts[0][1] } as Cmd];
  for (let i = 1; i < pts.length; i++) out.push({ type: 'L', x: pts[i][0], y: pts[i][1] } as Cmd);
  out.push({ type: 'Z' } as Cmd);
  return out;
}

function quad(p0: [number, number], p1: [number, number], p2: [number, number], t: number): [number, number] {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

function wheatCmds(): Cmd[] {
  const out: Cmd[] = [];
  const angles = [-23, -17.5, -12, -6, 0, 6, 12, 17.5, 23];
  angles.forEach((a, i) => {
    const r = (a * Math.PI) / 180;
    const len = 0.9 + 0.08 * Math.cos(r * 3) - Math.abs(a) * 0.0008;
    const p0: [number, number] = [a * 0.0016, 0];
    const tip: [number, number] = [Math.sin(r) * len * 0.98, Math.cos(r) * len];
    const ctl: [number, number] = [a * 0.0016 + Math.sin(r) * len * 0.15, len * 0.55];
    // stalk
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    const M = 14;
    for (let s = 0; s <= M; s++) {
      const t = s / M;
      const p = quad(p0, ctl, tip, t);
      const q1 = quad(p0, ctl, tip, Math.min(1, t + 0.01));
      const q0 = quad(p0, ctl, tip, Math.max(0, t - 0.01));
      const dx = q1[0] - q0[0], dy = q1[1] - q0[1];
      const l = Math.hypot(dx, dy) || 1;
      const w = 0.0105 * (1 - t * 0.45);
      left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
      right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
    }
    out.push(...polygon([...left, ...right.reverse()]));
    // ear: paired kernels along the top of the stalk
    const kernels = 7;
    for (let g = 0; g < kernels; g++) {
      const t = 0.66 + (g / kernels) * 0.31;
      const p = quad(p0, ctl, tip, t);
      const q1 = quad(p0, ctl, tip, Math.min(1, t + 0.01));
      const q0 = quad(p0, ctl, tip, Math.max(0, t - 0.01));
      const ang = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const off = 0.0125;
      out.push(...ellipse(p[0] + nx * off, p[1] + ny * off, 0.036, 0.0125, ang - 0.42));
      out.push(...ellipse(p[0] - nx * off, p[1] - ny * off, 0.036, 0.0125, ang + 0.42));
    }
    const ta = Math.atan2(tip[1] - quad(p0, ctl, tip, 0.96)[1], tip[0] - quad(p0, ctl, tip, 0.96)[0]);
    out.push(...ellipse(tip[0] + Math.cos(ta) * 0.022, tip[1] + Math.sin(ta) * 0.022, 0.034, 0.0105, ta));
    // awns on the outer pair
    if (i % 2 === 0) {
      const aw: [number, number][] = [];
      const base: [number, number] = [tip[0] + Math.cos(ta) * 0.05, tip[1] + Math.sin(ta) * 0.05];
      const end: [number, number] = [base[0] + Math.cos(ta) * 0.07, base[1] + Math.sin(ta) * 0.07];
      aw.push([base[0] - Math.sin(ta) * 0.003, base[1] + Math.cos(ta) * 0.003], end, [base[0] + Math.sin(ta) * 0.003, base[1] - Math.cos(ta) * 0.003]);
      out.push(...polygon(aw));
    }
  });
  // flared leaves
  for (const s of [-1, 1]) {
    const p0: [number, number] = [s * 0.012, 0.03];
    const tip: [number, number] = [s * 0.4, 0.5];
    const a: [number, number] = [s * 0.3, 0.2];
    const b: [number, number] = [s * 0.2, 0.33];
    const top: [number, number][] = [];
    const bot: [number, number][] = [];
    for (let t = 0; t <= 1.0001; t += 1 / 16) {
      top.push(quad(p0, b, tip, t));
      bot.push(quad(p0, a, tip, t));
    }
    out.push(...polygon([...top, ...bot.reverse()]));
  }
  // twine band and bow tails
  out.push(...polygon([[-0.07, 0.2], [0.07, 0.2], [0.075, 0.245], [-0.075, 0.245]]));
  out.push(...polygon([[0.0, 0.2], [0.07, 0.15], [0.09, 0.0], [0.045, 0.02], [0.02, 0.12]]));
  out.push(...polygon([[0.0, 0.2], [-0.07, 0.15], [-0.095, 0.01], [-0.05, 0.03], [-0.02, 0.12]]));
  // cut stems at the foot
  out.push(...polygon([[-0.03, 0], [0.03, 0], [0.034, 0.2], [-0.034, 0.2]]));
  return out;
}

const cache = new Map<string, Geo>();

export function geoFor(el: Pick<El, 'kind' | 'font' | 'lines' | 'tracking' | 'leading' | 'arc' | 'wd'>): Geo {
  const key =
    el.kind === 'ornament'
      ? 'wheat'
      : [el.font, el.lines.join('\n'), el.tracking, el.leading, el.wd, el.kind === 'text' && el.lines.length === 1 ? el.arc : 0].join('|');
  let g = cache.get(key);
  if (!g) {
    g = el.kind === 'ornament' ? finish(wheatCmds(), []) : textGeo(el.font, el.lines, el.tracking, el.leading, el.arc, el.wd);
    if (cache.size > 300) cache.clear();
    cache.set(key, g);
  }
  return g;
}

export function boxOf(el: El): Box {
  const g = geoFor(el);
  const c = el.cap;
  return { l: el.x + g.bbox.x1 * c, r: el.x + g.bbox.x2 * c, b: el.y + g.bbox.y1 * c, t: el.y + g.bbox.y2 * c };
}

/** Gilded area in square inches. */
export function inkArea(el: El): number {
  return geoFor(el).area * el.cap * el.cap;
}
export function lineLength(el: El): number {
  return geoFor(el).perim * el.cap;
}
