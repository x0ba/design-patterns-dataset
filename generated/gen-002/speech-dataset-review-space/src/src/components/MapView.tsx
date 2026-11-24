import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { ACCENTS, DATA, ENVS, ENV_SHORT, evalClipId } from '../data/model';
import { bbox, polygonArea, Polygon, Pt, simplify } from '../data/geometry';
import { ColorBy, coloringFor, COLOR_MODES, A_COLOR, B_COLOR } from '../data/colors';
import { fmtDelta, pct } from '../format';

export interface MapRegion {
  key: string;
  name: string;
  polygon: Polygon;
  kind: 'flag' | 'saved' | 'cluster' | 'draft';
  color: string;
  dashed?: boolean;
  faint?: boolean;
  badges?: ('A' | 'B')[];
}

export interface MapHandle {
  flyToPolygon(p: Polygon, pad?: number): void;
  flyTo(x: number, y: number, scale?: number): void;
  zoomBy(f: number): void;
  resetView(): void;
}

export interface View {
  cx: number;
  cy: number;
  scale: number;
  yaw: number;
  pitch: number;
}

interface Props {
  colorBy: ColorBy;
  envFilter: boolean[];
  regressedOnly: boolean;
  showTrain: boolean;
  showGrid: boolean;
  mode: '2d' | '3d';
  tool: 'pan' | 'draw';
  regions: MapRegion[];
  draft: Polygon | null;
  onDraftChange: (p: Polygon, final: boolean) => void;
  onDrawDone: () => void;
  selectedClip: number | null;
  playing: boolean;
  memberMask: Uint8Array | null;
  onSelectClip: (i: number) => void;
  onRegionClick: (key: string) => void;
  initialView: { cx: number; cy: number; scale: number };
}

const BG = '#0d1215';
const EXTENT = 105;
const D3 = 170; // perspective distance in data units
const CZ = 5;

const GROUP_CENTERS = ACCENTS.map((a, ai) => {
  const cs = DATA.clusters.filter((c) => c.accent === ai);
  let x = 0;
  let y = 0;
  let w = 0;
  for (const c of cs) {
    const k = c.evalCount + c.trainCount / 20;
    x += c.cx * k;
    y += c.cy * k;
    w += k;
  }
  return { x: x / w, y: y / w, label: a.label };
});

const CLUSTERS_BY_SIZE = DATA.clusters
  .slice()
  .sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.evalCount + b.trainCount / 25 - (a.evalCount + a.trainCount / 25));

function discOffsets(size: number, stride: number): Int32Array {
  const out: number[] = [];
  const r = size / 2;
  for (let dy = 0; dy < size; dy++)
    for (let dx = 0; dx < size; dx++) {
      const ddx = dx + 0.5 - r;
      const ddy = dy + 0.5 - r;
      if (size <= 3 || ddx * ddx + ddy * ddy <= r * r + 0.3) out.push(dy * stride + dx);
    }
  return Int32Array.from(out);
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const MapView = forwardRef<MapHandle, Props>(function MapView(props, ref) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600, dpr: 1 });
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const propsRef = useRef(props);
  propsRef.current = props;
  const view = useRef<View>({ ...props.initialView, yaw: 0, pitch: 0 });
  const anim = useRef<{ from: View; to: View; t0: number; dur: number } | null>(null);
  const dirty = useRef({ base: true, over: true });
  const raf = useRef(0);
  const evSX = useRef(new Float32Array(DATA.ev.n));
  const evSY = useRef(new Float32Array(DATA.ev.n));
  const pointsCanvas = useRef<HTMLCanvasElement | null>(null);
  const glowCanvas = useRef<HTMLCanvasElement | null>(null);
  const miniImage = useRef<HTMLCanvasElement | null>(null);
  const imgData = useRef<ImageData | null>(null);
  const labelHits = useRef<{ x0: number; y0: number; x1: number; y1: number; key: string }[]>([]);
  const lasso = useRef<Pt[] | null>(null);
  const drag = useRef<
    | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number; moved: boolean; yaw: number; pitch: number }
    | { kind: 'vertex'; index: number }
    | { kind: 'lasso' }
    | null
  >(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const hoverRef = useRef<number | null>(null);
  const [cursor, setCursor] = useState('grab');
  const [zoomLabel, setZoomLabel] = useState('');

  const schedule = () => {
    if (!raf.current) raf.current = requestAnimationFrame(frame);
  };
  const markDirty = (base = true, over = true) => {
    if (base) dirty.current.base = true;
    if (over) dirty.current.over = true;
    schedule();
  };

  // ---------- projection ----------
  function projector() {
    const v = view.current;
    const { w, h } = sizeRef.current;
    const is3d = propsRef.current.mode === '3d';
    const cyw = Math.cos(v.yaw);
    const syw = Math.sin(v.yaw);
    const cp = Math.cos(v.pitch);
    const sp = Math.sin(v.pitch);
    const out = { x: 0, y: 0, f: 1 };
    return {
      out,
      p(x: number, y: number, z: number): boolean {
        if (!is3d) {
          out.x = (x - v.cx) * v.scale + w / 2;
          out.y = (y - v.cy) * v.scale + h / 2;
          out.f = 1;
          return true;
        }
        const dx = x - v.cx;
        const dy = y - v.cy;
        const dz = z - CZ;
        const x1 = dx * cyw + dz * syw;
        const z1 = -dx * syw + dz * cyw;
        const y2 = dy * cp - z1 * sp;
        const z2 = dy * sp + z1 * cp;
        const den = D3 + z2;
        if (den < 8) return false;
        const f = D3 / den;
        out.x = w / 2 + x1 * v.scale * f;
        out.y = h / 2 + y2 * v.scale * f;
        out.f = f;
        return true;
      },
    };
  }

  const toData = (sx: number, sy: number): Pt => {
    const v = view.current;
    const { w, h } = sizeRef.current;
    return [(sx - w / 2) / v.scale + v.cx, (sy - h / 2) / v.scale + v.cy];
  };
  const toScreen = (x: number, y: number): Pt => {
    const v = view.current;
    const { w, h } = sizeRef.current;
    return [(x - v.cx) * v.scale + w / 2, (y - v.cy) * v.scale + h / 2];
  };

  // ---------- base layer ----------
  function drawBase() {
    const canvas = baseRef.current;
    if (!canvas) return;
    const { w, h, dpr } = sizeRef.current;
    const Wd = Math.round(w * dpr);
    const Hd = Math.round(h * dpr);
    const P = propsRef.current;
    const v = view.current;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, Wd, Hd);
    const { ev, tr } = DATA;
    const pr = projector();
    const o = pr.out;
    const mode = COLOR_MODES.find((m) => m.key === P.colorBy)!;
    const trainMode = mode.target === 'train';
    const col = coloringFor(P.colorBy);

    // training density glow
    if (P.showTrain && !trainMode) {
      const G = 3;
      const gw = Math.ceil(w / G);
      const gh = Math.ceil(h / G);
      if (!glowCanvas.current) glowCanvas.current = document.createElement('canvas');
      const gc = glowCanvas.current;
      if (gc.width !== gw || gc.height !== gh) {
        gc.width = gw;
        gc.height = gh;
      }
      const acc = new Float32Array(gw * gh);
      for (let i = 0; i < tr.n; i++) {
        if (!pr.p(tr.x[i], tr.y[i], tr.z[i])) continue;
        const gx = (o.x / G) | 0;
        const gy = (o.y / G) | 0;
        if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
        acc[gy * gw + gx] += 1;
      }
      // separable box blur, 2 passes
      const tmp = new Float32Array(gw * gh);
      const R = 2;
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < gh; y++) {
          let s = 0;
          for (let x = -R; x <= R; x++) s += x >= 0 && x < gw ? acc[y * gw + x] : 0;
          for (let x = 0; x < gw; x++) {
            tmp[y * gw + x] = s / (2 * R + 1);
            const add = x + R + 1;
            const rem = x - R;
            if (add < gw) s += acc[y * gw + add];
            if (rem >= 0) s -= acc[y * gw + rem];
          }
        }
        for (let x = 0; x < gw; x++) {
          let s = 0;
          for (let y = -R; y <= R; y++) s += y >= 0 && y < gh ? tmp[y * gw + x] : 0;
          for (let y = 0; y < gh; y++) {
            acc[y * gw + x] = s / (2 * R + 1);
            const add = y + R + 1;
            const rem = y - R;
            if (add < gh) s += tmp[add * gw + x];
            if (rem >= 0) s -= tmp[rem * gw + x];
          }
        }
      }
      const cellArea = (G / v.scale) * (G / v.scale);
      const gctx = gc.getContext('2d')!;
      const img = gctx.createImageData(gw, gh);
      const d32 = new Uint32Array(img.data.buffer);
      for (let k = 0; k < acc.length; k++) {
        const dens = acc[k] / cellArea;
        if (dens <= 0.02) continue;
        const t = 1 - Math.exp(-dens / 6);
        const a = Math.min(255, Math.round(t * 190));
        const r = Math.round(70 + t * 40);
        const g = Math.round(100 + t * 50);
        const b = Math.round(128 + t * 60);
        d32[k] = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
      }
      gctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(gc, 0, 0, gw, gh, 0, 0, gw * G * dpr, gh * G * dpr);
    }

    // points buffer
    if (!pointsCanvas.current) pointsCanvas.current = document.createElement('canvas');
    const pc = pointsCanvas.current;
    if (pc.width !== Wd || pc.height !== Hd) {
      pc.width = Wd;
      pc.height = Hd;
      imgData.current = null;
    }
    const pctx = pc.getContext('2d')!;
    if (!imgData.current) imgData.current = pctx.createImageData(Wd, Hd);
    const buf = new Uint32Array(imgData.current.data.buffer);
    buf.fill(0);

    const zoomK = Math.log2(Math.max(1, v.scale / 3.6));
    const put = (px: number, py: number, offs: Int32Array, s: number, color: number) => {
      const ix = Math.round(px - s / 2);
      const iy = Math.round(py - s / 2);
      if (ix < 0 || iy < 0 || ix > Wd - s || iy > Hd - s) return;
      const base = iy * Wd + ix;
      for (let k = 0; k < offs.length; k++) buf[base + offs[k]] = color;
    };

    // training points (individual) when coloring by a training attribute, or when zoomed in
    if (trainMode && col.trColor && col.trOrder) {
      const s = Math.max(1, Math.min(4, Math.round(dpr * (1 + zoomK * 0.45))));
      const offs = discOffsets(s, Wd);
      const order = col.trOrder;
      for (let k = 0; k < order.length; k++) {
        const i = order[k];
        if (!pr.p(tr.x[i], tr.y[i], tr.z[i])) continue;
        put(o.x * dpr, o.y * dpr, offs, s, col.trColor[i]);
      }
    } else if (P.showTrain && v.scale > 8) {
      const s = Math.max(1, Math.round(dpr * (v.scale > 30 ? 2 : 1)));
      const offs = discOffsets(s, Wd);
      const color = ((150 << 24) | (205 << 16) | (180 << 8) | 150) >>> 0;
      for (let i = 0; i < tr.n; i++) {
        if (!pr.p(tr.x[i], tr.y[i], tr.z[i])) continue;
        put(o.x * dpr, o.y * dpr, offs, s, color);
      }
    }

    // eval points
    const sx = evSX.current;
    const sy = evSY.current;
    const baseSize = trainMode ? 1.2 : 1.6 + zoomK * 0.85;
    const sizes = new Map<number, Int32Array>();
    const offsFor = (s: number) => {
      let a = sizes.get(s);
      if (!a) {
        a = discOffsets(s, Wd);
        sizes.set(s, a);
      }
      return a;
    };
    const envF = P.envFilter;
    const mask = P.mode === '3d' ? P.memberMask : null;
    const order = col.evOrder;
    const dimAlpha = trainMode ? 120 : 52;
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < order.length; k++) {
        const i = order[k];
        let dim =
          trainMode ||
          !envF[ev.env[i]] ||
          (P.regressedOnly && ev.wer42[i] - ev.wer41[i] < 0.05) ||
          (mask !== null && mask[i] === 0);
        if ((pass === 0) !== dim) continue;
        if (!pr.p(ev.x[i], ev.y[i], ev.z[i])) {
          sx[i] = NaN;
          continue;
        }
        sx[i] = o.x;
        sy[i] = o.y;
        let s = Math.round(baseSize * dpr * (P.mode === '3d' ? o.f : 1));
        if (dim) s = Math.max(1, Math.round(s * 0.75));
        s = Math.max(trainMode ? 1 : 2, Math.min(9, s));
        const c = col.evColor[i];
        const color = dim ? (((dimAlpha << 24) | (c & 0xffffff)) >>> 0) : c;
        put(o.x * dpr, o.y * dpr, offsFor(s), s, color);
      }
    }
    pctx.putImageData(imgData.current, 0, 0);
    ctx.drawImage(pc, 0, 0);
  }

  // ---------- overlay ----------
  function drawOverlay(now: number) {
    const canvas = overRef.current;
    if (!canvas) return;
    const { w, h, dpr } = sizeRef.current;
    const P = propsRef.current;
    const v = view.current;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const hits: typeof labelHits.current = [];
    const is3d = P.mode === '3d';
    const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const collides = (r: { x0: number; y0: number; x1: number; y1: number }) =>
      placed.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);

    if (!is3d) {
      // callout grid
      if (P.showGrid) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(160,190,210,0.07)';
        ctx.beginPath();
        for (let gx = -100; gx <= 100; gx += 20) {
          const [x] = toScreen(gx, 0);
          if (x > -1 && x < w + 1) {
            ctx.moveTo(Math.round(x) + 0.5, 0);
            ctx.lineTo(Math.round(x) + 0.5, h);
          }
        }
        for (let gy = -100; gy <= 100; gy += 20) {
          const [, y] = toScreen(0, gy);
          if (y > -1 && y < h + 1) {
            ctx.moveTo(0, Math.round(y) + 0.5);
            ctx.lineTo(w, Math.round(y) + 0.5);
          }
        }
        ctx.stroke();
        ctx.font = '600 12px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let c = 0; c < 10; c++) {
          const [x0] = toScreen(-100 + c * 20, 0);
          const [x1] = toScreen(-80 + c * 20, 0);
          const xm = Math.max(x0, 30) / 2 + Math.min(x1, w - 30) / 2;
          if (x1 < 24 || x0 > w - 24) continue;
          ctx.fillStyle = 'rgba(13,18,21,0.75)';
          ctx.fillRect(xm - 11, 56, 22, 20);
          ctx.fillStyle = 'rgba(190,210,222,0.72)';
          ctx.fillText(String.fromCharCode(65 + c), xm, 66.5);
          placed.push({ x0: xm - 11, y0: 56, x1: xm + 11, y1: 76 });
        }
        for (let r = 0; r < 10; r++) {
          const [, y0] = toScreen(0, -100 + r * 20);
          const [, y1] = toScreen(0, -80 + r * 20);
          if (y1 < 80 || y0 > h - 10) continue;
          const ym = Math.max(y0, 80) / 2 + Math.min(y1, h - 10) / 2;
          ctx.fillStyle = 'rgba(13,18,21,0.75)';
          ctx.fillRect(4, ym - 10, 24, 20);
          ctx.fillStyle = 'rgba(190,210,222,0.72)';
          ctx.fillText(String(r + 1), 16, ym + 0.5);
          placed.push({ x0: 4, y0: ym - 10, x1: 28, y1: ym + 10 });
        }
      }

      // regions
      const drawPoly = (poly: Polygon) => {
        ctx.beginPath();
        poly.forEach(([x, y], k) => {
          const [a, b] = toScreen(x, y);
          if (k === 0) ctx.moveTo(a, b);
          else ctx.lineTo(a, b);
        });
        ctx.closePath();
      };
      const regionsSorted = P.regions.slice().sort((a, b) => order(a) - order(b));
      function order(r: MapRegion) {
        return r.kind === 'saved' ? 0 : r.kind === 'cluster' ? 1 : r.kind === 'flag' ? 2 : 3;
      }
      const pills: { r: MapRegion; x: number; y: number }[] = [];
      for (const r of regionsSorted) {
        if (r.kind === 'draft') continue;
        drawPoly(r.polygon);
        ctx.save();
        ctx.globalAlpha = r.faint ? 0.5 : 1;
        if (r.kind === 'flag') {
          ctx.fillStyle = 'rgba(240,136,62,0.07)';
          ctx.fill();
        }
        ctx.setLineDash(r.dashed ? [7, 5] : []);
        ctx.lineWidth = r.kind === 'flag' ? 2.25 : r.badges?.length ? 2 : 1.5;
        ctx.strokeStyle = r.color;
        ctx.stroke();
        ctx.restore();
        const b = bbox(r.polygon);
        const [lx, ly] = toScreen((b.x0 + b.x1) / 2, b.y0);
        const [, by1] = toScreen(0, b.y1);
        if (lx > -40 && lx < w + 40 && by1 > 90 && ly < h - 20) pills.push({ r, x: lx, y: ly - 14 });
      }

      // draft
      if (P.draft) {
        drawPoly(P.draft);
        ctx.fillStyle = 'rgba(255,224,138,0.09)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffe08a';
        ctx.setLineDash([]);
        ctx.stroke();
        if (P.tool === 'pan') {
          for (const [x, y] of P.draft) {
            const [a, b] = toScreen(x, y);
            ctx.beginPath();
            ctx.arc(a, b, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#0d1215';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        const b = bbox(P.draft);
        const [lx, ly] = toScreen((b.x0 + b.x1) / 2, b.y0);
        const dr = P.regions.find((r) => r.kind === 'draft');
        pills.push({
          r: dr ?? { key: 'draft', name: 'Draft region', polygon: P.draft, kind: 'draft', color: '#ffe08a' },
          x: lx,
          y: ly - 16,
        });
      }

      // lasso in progress
      if (lasso.current && lasso.current.length > 1) {
        ctx.beginPath();
        lasso.current.forEach(([x, y], k) => {
          const [a, b] = toScreen(x, y);
          if (k === 0) ctx.moveTo(a, b);
          else ctx.lineTo(a, b);
        });
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffe08a';
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // region name pills (drawn before cluster labels so they win collisions)
      const prio = (r: MapRegion) => (r.kind === 'draft' ? 0 : r.badges?.length ? 1 : r.kind === 'flag' ? 2 : 3);
      pills.sort((a, b) => prio(a.r) - prio(b.r));
      for (const { r, x, y } of pills) {
        const isFlag = r.kind === 'flag';
        const isDraft = r.kind === 'draft';
        ctx.font = `${isFlag || isDraft || r.badges?.length ? 600 : 500} 13px "IBM Plex Sans", sans-serif`;
        const text = r.name;
        const tw = ctx.measureText(text).width;
        const badgeW = (r.badges?.length ?? 0) * 22;
        const pw = tw + 18 + badgeW;
        const x0 = Math.min(Math.max(x - pw / 2, 34), w - pw - 6);
        let y0 = Math.max(82, y - 12);
        let rect = { x0, y0, x1: x0 + pw, y1: y0 + 24 };
        if (collides(rect) && r.kind === 'saved' && !r.badges?.length) continue;
        for (let tries = 0; tries < 3 && collides(rect); tries++) {
          y0 = y0 - 28 >= 82 ? y0 - 28 : y0 + 28 * (tries + 1);
          rect = { x0, y0, x1: x0 + pw, y1: y0 + 24 };
        }
        placed.push(rect);
        ctx.globalAlpha = r.faint ? 0.6 : 1;
        ctx.fillStyle = 'rgba(13,18,21,0.88)';
        roundRect(ctx, x0, y0, pw, 24, 12);
        ctx.fill();
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.25;
        ctx.stroke();
        let cx = x0 + 9;
        for (const bd of r.badges ?? []) {
          ctx.beginPath();
          ctx.arc(cx + 8, y0 + 12, 8.5, 0, Math.PI * 2);
          ctx.fillStyle = bd === 'A' ? A_COLOR : B_COLOR;
          ctx.fill();
          ctx.fillStyle = '#0d1215';
          ctx.font = '700 11px "IBM Plex Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(bd, cx + 8, y0 + 12.5);
          cx += 22;
        }
        ctx.font = `${isFlag || isDraft || r.badges?.length ? 600 : 500} 13px "IBM Plex Sans", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = r.kind === 'saved' ? '#d4dde2' : r.color;
        ctx.fillText(text, cx, y0 + 12.5);
        ctx.globalAlpha = 1;
        hits.push({ ...rect, key: r.key });
      }

      // labels
      if (v.scale < 7.5) {
        ctx.font = '600 12.5px "IBM Plex Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const g of GROUP_CENTERS) {
          const [x, y] = toScreen(g.x, g.y);
          if (x < 0 || x > w || y < 0 || y > h) continue;
          const tw = ctx.measureText(g.label).width;
          const rect = { x0: x - tw / 2 - 4, y0: y - 9, x1: x + tw / 2 + 4, y1: y + 9 };
          if (collides(rect)) continue;
          placed.push(rect);
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(13,18,21,0.85)';
          ctx.strokeText(g.label, x, y);
          ctx.fillStyle = 'rgba(222,232,238,0.88)';
          ctx.fillText(g.label, x, y);
        }
      } else {
        let count = 0;
        for (const c of CLUSTERS_BY_SIZE) {
          if (count > 34) break;
          const [x, y] = toScreen(c.cx, c.cy - Math.max(c.sx, c.sy) * 1.5);
          if (x < 20 || x > w - 20 || y < 84 || y > h - 10) continue;
          ctx.font = '500 12px "IBM Plex Sans", sans-serif';
          const main = `${ACCENTS[c.accent].code} · ${ENV_SHORT[c.env]}`;
          const tw = ctx.measureText(main).width;
          ctx.font = '500 11px "IBM Plex Mono", monospace';
          const iw = ctx.measureText(c.name).width;
          const total = tw + iw + 6;
          const rect = { x0: x - total / 2 - 3, y0: y - 9, x1: x + total / 2 + 3, y1: y + 9 };
          if (rect.x0 < 30 || rect.x1 > w - 4 || collides(rect)) continue;
          placed.push(rect);
          count++;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(13,18,21,0.9)';
          ctx.font = '500 11px "IBM Plex Mono", monospace';
          ctx.strokeText(c.name, rect.x0 + 3, y);
          ctx.fillStyle = 'rgba(150,170,182,0.85)';
          ctx.fillText(c.name, rect.x0 + 3, y);
          ctx.font = '500 12px "IBM Plex Sans", sans-serif';
          ctx.strokeText(main, rect.x0 + 3 + iw + 6, y);
          ctx.fillStyle = 'rgba(226,234,239,0.92)';
          ctx.fillText(main, rect.x0 + 3 + iw + 6, y);
        }
      }
    } else {
      // 3D: label the clusters that matter for the discussion
      const pr = projector();
      ctx.font = '500 12px "IBM Plex Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let count = 0;
      for (const c of CLUSTERS_BY_SIZE) {
        if (count > 26) break;
        if (!pr.p(c.cx, c.cy, c.cz)) continue;
        const x = pr.out.x;
        const y = pr.out.y - 18 * pr.out.f;
        if (x < 20 || x > w - 20 || y < 84 || y > h - 10) continue;
        const label = `${c.name} ${ACCENTS[c.accent].code} · ${ENV_SHORT[c.env]}`;
        const tw = ctx.measureText(label).width;
        const rect = { x0: x - tw / 2 - 3, y0: y - 9, x1: x + tw / 2 + 3, y1: y + 9 };
        if (collides(rect)) continue;
        placed.push(rect);
        count++;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(13,18,21,0.9)';
        ctx.strokeText(label, x, y);
        ctx.fillStyle = c.flagged ? '#f0a066' : c.id === 163 ? '#e9b6d4' : 'rgba(226,234,239,0.9)';
        ctx.fillText(label, x, y);
      }
    }

    // clip markers
    const ring = (i: number, r: number, color: string, lw: number) => {
      const x = evSX.current[i];
      const y = evSY.current[i];
      if (Number.isNaN(x)) return;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.stroke();
    };
    if (P.selectedClip !== null) {
      ring(P.selectedClip, 8, '#ffffff', 2.25);
      if (P.playing) {
        const t = (now % 1400) / 1400;
        ctx.globalAlpha = 1 - t;
        ring(P.selectedClip, 8 + t * 22, '#ffffff', 2);
        const t2 = ((now + 700) % 1400) / 1400;
        ctx.globalAlpha = 1 - t2;
        ring(P.selectedClip, 8 + t2 * 22, '#ffffff', 2);
        ctx.globalAlpha = 1;
      }
    }
    if (hoverRef.current !== null && hoverRef.current !== P.selectedClip) ring(hoverRef.current, 7, '#e6f0f5', 1.75);

    labelHits.current = hits;

    // minimap viewport
    drawMini();
  }

  function drawMini() {
    const mc = miniRef.current;
    if (!mc) return;
    const { dpr } = sizeRef.current;
    const S = 132;
    if (mc.width !== S * dpr) {
      mc.width = S * dpr;
      mc.height = S * dpr;
    }
    const ctx = mc.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!miniImage.current) {
      const c = document.createElement('canvas');
      c.width = S * 2;
      c.height = S * 2;
      const x = c.getContext('2d')!;
      x.fillStyle = '#0b0f12';
      x.fillRect(0, 0, S * 2, S * 2);
      const k = (S * 2) / (EXTENT * 2);
      x.fillStyle = 'rgba(110,145,175,0.10)';
      const { tr, ev } = DATA;
      for (let i = 0; i < tr.n; i += 3) x.fillRect((tr.x[i] + EXTENT) * k, (tr.y[i] + EXTENT) * k, 1, 1);
      const col = coloringFor('delta');
      for (let k2 = 0; k2 < col.evOrder.length; k2 += 2) {
        const i = col.evOrder[k2];
        const d = ev.wer42[i] - ev.wer41[i];
        x.fillStyle = d > 0.06 ? 'rgba(240,120,70,0.9)' : 'rgba(150,165,175,0.35)';
        x.fillRect((ev.x[i] + EXTENT) * k, (ev.y[i] + EXTENT) * k, 1.2, 1.2);
      }
      miniImage.current = c;
    }
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(miniImage.current, 0, 0, S, S);
    if (propsRef.current.mode === '3d') return;
    const { w, h } = sizeRef.current;
    const [x0, y0] = toData(0, 0);
    const [x1, y1] = toData(w, h);
    const k = S / (EXTENT * 2);
    const rx = (x0 + EXTENT) * k;
    const ry = (y0 + EXTENT) * k;
    const rw = (x1 - x0) * k;
    const rh = (y1 - y0) * k;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(Math.max(1, rx), Math.max(1, ry), Math.min(S - 2, rw), Math.min(S - 2, rh));
  }

  function frame(now: number) {
    raf.current = 0;
    let keepGoing = false;
    if (anim.current) {
      const a = anim.current;
      const t = Math.min(1, (now - a.t0) / a.dur);
      const e = easeInOut(t);
      const ls = Math.log(a.from.scale) + (Math.log(a.to.scale) - Math.log(a.from.scale)) * e;
      view.current = {
        cx: a.from.cx + (a.to.cx - a.from.cx) * e,
        cy: a.from.cy + (a.to.cy - a.from.cy) * e,
        scale: Math.exp(ls),
        yaw: a.from.yaw + (a.to.yaw - a.from.yaw) * e,
        pitch: a.from.pitch + (a.to.pitch - a.from.pitch) * e,
      };
      dirty.current.base = true;
      dirty.current.over = true;
      if (t < 1) keepGoing = true;
      else anim.current = null;
    }
    if (dirty.current.base) {
      dirty.current.base = false;
      drawBase();
      dirty.current.over = true;
      setZoomLabel(`${(view.current.scale / 3.6).toFixed(1)}×`);
    }
    if (dirty.current.over || propsRef.current.playing) {
      dirty.current.over = false;
      drawOverlay(now);
    }
    if (propsRef.current.playing) keepGoing = true;
    if (keepGoing) schedule();
  }

  const animateTo = (to: Partial<View>, dur = 650) => {
    anim.current = { from: { ...view.current }, to: { ...view.current, ...to }, t0: performance.now(), dur };
    schedule();
  };

  useImperativeHandle(ref, () => ({
    flyToPolygon(p: Polygon, pad = 1.6) {
      const b = bbox(p);
      const { w, h } = sizeRef.current;
      const bw = Math.max(4, b.x1 - b.x0);
      const bh = Math.max(4, b.y1 - b.y0);
      const scale = Math.min(60, Math.min(w / (bw * pad), (h - 80) / (bh * pad)));
      animateTo({ cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 - 18 / scale, scale });
    },
    flyTo(x: number, y: number, scale?: number) {
      animateTo({ cx: x, cy: y, scale: scale ?? Math.max(view.current.scale, 14) });
    },
    zoomBy(f: number) {
      animateTo({ scale: Math.min(300, Math.max(2.4, view.current.scale * f)) }, 300);
    },
    resetView() {
      const { w, h } = sizeRef.current;
      animateTo({ cx: 0, cy: 0, scale: Math.min(w, h - 60) / (EXTENT * 2), yaw: propsRef.current.mode === '3d' ? 0.5 : 0, pitch: propsRef.current.mode === '3d' ? 0.3 : 0 });
    },
  }));

  // size
  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      setSize({ w: Math.max(100, Math.floor(r.width)), h: Math.max(100, Math.floor(r.height)), dpr });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    for (const c of [baseRef.current, overRef.current]) {
      if (!c) continue;
      c.width = Math.round(size.w * size.dpr);
      c.height = Math.round(size.h * size.dpr);
      c.style.width = size.w + 'px';
      c.style.height = size.h + 'px';
    }
    markDirty();
  }, [size]);

  useEffect(() => {
    markDirty(true, true);
  }, [props.colorBy, props.envFilter, props.regressedOnly, props.showTrain, props.memberMask]);

  useEffect(() => {
    markDirty(false, true);
  }, [props.regions, props.draft, props.selectedClip, props.playing, props.tool, props.showGrid]);

  useEffect(() => {
    if (props.mode === '3d') animateTo({ yaw: 0.62, pitch: 0.38, scale: view.current.scale * 0.9 }, 900);
    else animateTo({ yaw: 0, pitch: 0 }, 500);
    markDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode]);

  useEffect(() => {
    // fonts may arrive after the first paint
    document.fonts?.ready.then(() => markDirty(false, true));
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // ---------- interaction ----------
  const localPos = (e: { clientX: number; clientY: number }) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as Pt;
  };

  const nearestClip = (x: number, y: number, maxD = 8) => {
    const sx = evSX.current;
    const sy = evSY.current;
    let best = -1;
    let bd = maxD * maxD;
    for (let i = 0; i < sx.length; i++) {
      const dx = sx[i] - x;
      if (dx > maxD || dx < -maxD) continue;
      const dy = sy[i] - y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };

  const nearestVertex = (x: number, y: number) => {
    const d = propsRef.current.draft;
    if (!d || propsRef.current.tool !== 'pan' || propsRef.current.mode !== '2d') return -1;
    for (let k = 0; k < d.length; k++) {
      const [a, b] = toScreen(d[k][0], d[k][1]);
      if ((a - x) ** 2 + (b - y) ** 2 < 81) return k;
    }
    return -1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const [x, y] = localPos(e);
    (e.target as Element).setPointerCapture(e.pointerId);
    anim.current = null;
    // label pills
    if (props.mode === '2d') {
      const hit = labelHits.current.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
      if (hit && props.tool === 'pan') {
        props.onRegionClick(hit.key);
        drag.current = null;
        return;
      }
    }
    if (props.tool === 'draw' && props.mode === '2d') {
      lasso.current = [toData(x, y)];
      drag.current = { kind: 'lasso' };
      return;
    }
    const vi = nearestVertex(x, y);
    if (vi >= 0) {
      drag.current = { kind: 'vertex', index: vi };
      return;
    }
    const v = view.current;
    drag.current = { kind: 'pan', sx: x, sy: y, cx: v.cx, cy: v.cy, moved: false, yaw: v.yaw, pitch: v.pitch };
    setCursor(props.mode === '3d' ? 'move' : 'grabbing');
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const [x, y] = localPos(e);
    const d = drag.current;
    if (d?.kind === 'lasso') {
      const last = lasso.current![lasso.current!.length - 1];
      const [lx, ly] = toScreen(last[0], last[1]);
      if ((lx - x) ** 2 + (ly - y) ** 2 > 9) {
        lasso.current!.push(toData(x, y));
        markDirty(false, true);
      }
      return;
    }
    if (d?.kind === 'vertex') {
      const draft = propsRef.current.draft!;
      const next = draft.map((p, k) => (k === d.index ? toData(x, y) : p)) as Polygon;
      props.onDraftChange(next, false);
      return;
    }
    if (d?.kind === 'pan') {
      const dx = x - d.sx;
      const dy = y - d.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      if (props.mode === '3d') {
        view.current.yaw = d.yaw + dx * 0.008;
        view.current.pitch = Math.max(-1.45, Math.min(1.45, d.pitch + dy * 0.008));
      } else {
        view.current.cx = d.cx - dx / view.current.scale;
        view.current.cy = d.cy - dy / view.current.scale;
      }
      markDirty();
      if (hover) setHover(null);
      return;
    }
    // hover
    if (props.tool === 'draw') {
      setCursor('crosshair');
      return;
    }
    if (nearestVertex(x, y) >= 0) {
      setCursor('move');
      return;
    }
    const overPill = labelHits.current.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
    const i = nearestClip(x, y);
    if (i !== hoverRef.current) {
      hoverRef.current = i >= 0 ? i : null;
      markDirty(false, true);
    }
    setHover(i >= 0 ? { i, x, y } : null);
    setCursor(i >= 0 || overPill ? 'pointer' : props.mode === '3d' ? 'move' : 'grab');
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const [x, y] = localPos(e);
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'lasso') {
      const pts = lasso.current ?? [];
      lasso.current = null;
      const simp = simplify(pts, 3.5 / view.current.scale);
      if (simp.length >= 3 && polygonArea(simp) * view.current.scale ** 2 > 600) {
        props.onDraftChange(simp, true);
      }
      props.onDrawDone();
      markDirty(false, true);
      return;
    }
    if (d?.kind === 'vertex') {
      props.onDraftChange(propsRef.current.draft!, true);
      return;
    }
    if (d?.kind === 'pan') {
      setCursor(props.mode === '3d' ? 'move' : 'grab');
      if (!d.moved) {
        const i = nearestClip(x, y);
        if (i >= 0) props.onSelectClip(i);
      }
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const [x, y] = localPos(e);
    anim.current = null;
    const v = view.current;
    const f = Math.exp(-e.deltaY * 0.0016);
    const ns = Math.min(300, Math.max(2.4, v.scale * f));
    if (props.mode === '2d') {
      const [dx, dy] = toData(x, y);
      v.scale = ns;
      const [nx, ny] = toData(x, y);
      v.cx += dx - nx;
      v.cy += dy - ny;
    } else {
      v.scale = ns;
    }
    markDirty();
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (props.tool === 'draw') return;
    const [x, y] = localPos(e);
    if (props.mode === '2d') {
      const [dx, dy] = toData(x, y);
      animateTo({ cx: dx, cy: dy, scale: Math.min(300, view.current.scale * 2) }, 450);
    }
  };

  const onMiniClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = (EXTENT * 2) / r.width;
    animateTo({ cx: (e.clientX - r.left) * k - EXTENT, cy: (e.clientY - r.top) * k - EXTENT }, 500);
  };

  const hv = hover ? hover.i : null;
  const { ev } = DATA;

  return (
    <div className="map-wrap" ref={wrapRef}>
      <canvas ref={baseRef} className="map-canvas" />
      <canvas
        ref={overRef}
        className="map-canvas"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          if (!drag.current) {
            setHover(null);
            hoverRef.current = null;
            markDirty(false, true);
          }
        }}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
      />
      <div className="minimap">
        <canvas ref={miniRef} style={{ width: 132, height: 132 }} onClick={onMiniClick} />
        <div className="minimap-zoom">{props.mode === '3d' ? '3D orbit' : zoomLabel}</div>
      </div>
      {hv !== null && hover && (
        <div
          className="map-tip"
          style={{
            left: Math.min(hover.x + 16, size.w - 290),
            top: hover.y + 16 > size.h - 150 ? hover.y - 150 : hover.y + 16,
          }}
        >
          <div className="tip-head">
            <span className="mono">{evalClipId(hv)}</span>
            <span className="tip-cluster mono">{DATA.clusterById.get(ev.cluster[hv])!.name}</span>
          </div>
          <div className="tip-line">
            {ACCENTS[ev.accent[hv]].label} · {ENVS[ev.env[hv]]}
          </div>
          <div className="tip-line dim">
            SNR {ev.snr[hv].toFixed(1)} dB · {ev.dur[hv].toFixed(1)} s
          </div>
          <div className="tip-wer">
            <span>WER</span>
            <b>{pct(ev.wer41[hv])}</b>
            <span className="arrow">→</span>
            <b>{pct(ev.wer42[hv])}</b>
            <span className={ev.wer42[hv] - ev.wer41[hv] > 0.02 ? 'bad' : ev.wer42[hv] - ev.wer41[hv] < -0.02 ? 'good' : 'dim'}>
              {fmtDelta(ev.wer42[hv] - ev.wer41[hv])}
            </span>
          </div>
          <div className="tip-foot">Click to load into the player</div>
        </div>
      )}
    </div>
  );
});

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
