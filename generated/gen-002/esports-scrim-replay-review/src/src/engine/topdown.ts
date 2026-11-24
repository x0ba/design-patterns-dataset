import { GH, GW, LABEL_AREAS, areaCenter, type MapDef } from '../data/maps';
import { TEAM_COLOR, teamOf } from '../data/scrim';
import type { AnyPlayer } from '../data/types';
import { canSee, smokeBlocks, type WorldState } from './sim';

const baseCache = new Map<string, HTMLCanvasElement>();
const PX = 16;

function baseLayer(m: MapDef) {
  let c = baseCache.get(m.id);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = GW * PX; c.height = GH * PX;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = m.palette.topWall;
  ctx.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const v = m.grid[y * GW + x];
    if (v === 0) { ctx.fillStyle = m.palette.topFloor; ctx.fillRect(x * PX, y * PX, PX, PX); }
    if (v === 2) { ctx.fillStyle = m.palette.topFloor; ctx.fillRect(x * PX, y * PX, PX, PX); ctx.fillStyle = '#4a4438'; ctx.fillRect(x * PX + 2, y * PX + 2, PX - 4, PX - 4); }
  }
  // wall edges
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (m.grid[y * GW + x] !== 0) continue;
    const n = (xx: number, yy: number) => xx < 0 || yy < 0 || xx >= GW || yy >= GH || m.grid[yy * GW + xx] === 1;
    ctx.beginPath();
    if (n(x, y - 1)) { ctx.moveTo(x * PX, y * PX + 0.5); ctx.lineTo((x + 1) * PX, y * PX + 0.5); }
    if (n(x, y + 1)) { ctx.moveTo(x * PX, (y + 1) * PX - 0.5); ctx.lineTo((x + 1) * PX, (y + 1) * PX - 0.5); }
    if (n(x - 1, y)) { ctx.moveTo(x * PX + 0.5, y * PX); ctx.lineTo(x * PX + 0.5, (y + 1) * PX); }
    if (n(x + 1, y)) { ctx.moveTo((x + 1) * PX - 0.5, y * PX); ctx.lineTo((x + 1) * PX - 0.5, (y + 1) * PX); }
    ctx.stroke();
  }
  // plant zones
  for (const zx of [10.5, 39.5]) {
    const cx = m.mirror ? GW - zx : zx;
    ctx.fillStyle = 'rgba(245,196,81,0.07)';
    ctx.fillRect((cx - 3) * PX, 8 * PX, 6 * PX, 5 * PX);
    ctx.strokeStyle = 'rgba(245,196,81,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect((cx - 3) * PX + 0.5, 8 * PX + 0.5, 6 * PX, 5 * PX);
    ctx.setLineDash([]);
  }
  baseCache.set(m.id, c);
  return c;
}

export interface TopdownOpts {
  viewer?: AnyPlayer; // radar mode: only allies + spotted enemies
  labels?: boolean;
  names?: boolean;
  cones?: boolean;
  highlight?: AnyPlayer | null;
  dpr?: number;
}

export function drawTopdown(ctx: CanvasRenderingContext2D, m: MapDef, world: WorldState, box: { x: number; y: number; w: number; h: number }, opts: TopdownOpts = {}) {
  const s = Math.min(box.w / GW, box.h / GH);
  const ox = box.x + (box.w - GW * s) / 2, oy = box.y + (box.h - GH * s) / 2;
  const X = (x: number) => ox + x * s, Y = (y: number) => oy + y * s;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(baseLayer(m), ox, oy, GW * s, GH * s);
  if (opts.labels) {
    ctx.font = `600 ${Math.max(9, s * 0.62)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(230,233,238,0.32)';
    for (const k of LABEL_AREAS) {
      const [cx, cy] = areaCenter(m, k);
      ctx.fillText(m.names[k].replace(/ \(.*\)/, '').toUpperCase(), X(cx), Y(cy));
    }
    // site letters
    ctx.font = `800 ${s * 2.2}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(245,196,81,0.18)';
    ctx.fillText('A', X(m.mirror ? GW - 10.5 : 10.5), Y(6.6));
    ctx.fillText('B', X(m.mirror ? GW - 39.5 : 39.5), Y(6.6));
  }
  const viewer = opts.viewer ? world.players.find((p) => p.player === opts.viewer) : undefined;
  const vTeam = opts.viewer ? teamOf(opts.viewer) : undefined;

  // smokes
  for (const sm of world.smokes) {
    ctx.fillStyle = `rgba(170,178,188,${0.55 * sm.alpha})`;
    ctx.beginPath(); ctx.arc(X(sm.x), Y(sm.y), sm.r * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(220,226,232,${0.5 * sm.alpha})`;
    ctx.lineWidth = 1; ctx.stroke();
  }
  // flashes
  for (const f of world.flashes) {
    if (f.age > 0.6) continue;
    const a = 1 - f.age / 0.6;
    const g = ctx.createRadialGradient(X(f.x), Y(f.y), 0, X(f.x), Y(f.y), s * (1 + f.age * 6));
    g.addColorStop(0, `rgba(255,252,230,${a})`); g.addColorStop(1, 'rgba(255,252,230,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), s * (1 + f.age * 6), 0, Math.PI * 2); ctx.fill();
  }
  // charge
  if (world.charge) {
    const c = world.charge;
    const age = world.t - c.planted;
    const on = c.defused || Math.floor(age * 2) % 2 === 0;
    ctx.save();
    ctx.translate(X(c.x), Y(c.y)); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = c.defused ? '#4fd1c5' : on ? '#ff5a4e' : '#7a2a26';
    const r = s * 0.42;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  // tracers
  for (const tr of world.tracers) {
    ctx.strokeStyle = tr.team === 'LOW' ? `rgba(79,209,197,${1 - tr.age / 0.3})` : `rgba(242,114,107,${1 - tr.age / 0.3})`;
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.beginPath(); ctx.moveTo(X(tr.x0), Y(tr.y0)); ctx.lineTo(X(tr.x1), Y(tr.y1)); ctx.stroke();
  }
  // players
  const drawOrder = [...world.players].sort((a, b) => Number(a.alive) - Number(b.alive));
  for (const p of drawOrder) {
    if (viewer && p.team !== vTeam) {
      if (!p.alive || !viewer.alive) continue;
      if (!canSee(m, viewer, p.x, p.y, 100) || smokeBlocks(world.smokes, viewer.x, viewer.y, p.x, p.y)) continue;
    }
    const col = TEAM_COLOR[p.team];
    const px = X(p.x), py = Y(p.y);
    const rr = Math.max(3, s * 0.48);
    if (!p.alive) {
      ctx.strokeStyle = p.team === 'LOW' ? 'rgba(79,209,197,0.65)' : 'rgba(242,114,107,0.65)';
      ctx.lineWidth = Math.max(1.5, s * 0.14);
      const k = rr * 0.7;
      ctx.beginPath(); ctx.moveTo(px - k, py - k); ctx.lineTo(px + k, py + k); ctx.moveTo(px + k, py - k); ctx.lineTo(px - k, py + k); ctx.stroke();
      continue;
    }
    if (opts.cones) {
      const g = ctx.createRadialGradient(px, py, rr, px, py, s * 5);
      g.addColorStop(0, p.team === 'LOW' ? 'rgba(79,209,197,0.22)' : 'rgba(242,114,107,0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, s * 5, p.a - 0.6, p.a + 0.6); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, s * 0.12);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(p.a) * rr * 2, py + Math.sin(p.a) * rr * 2); ctx.stroke();
    }
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
    if (opts.highlight === p.player || (viewer && viewer.player === p.player)) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, s * 0.12);
      ctx.beginPath(); ctx.arc(px, py, rr + Math.max(2, s * 0.2), 0, Math.PI * 2); ctx.stroke();
    }
    if (rr >= 5) {
      ctx.fillStyle = '#0d0f12';
      ctx.font = `700 ${rr * 1.15}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.player[0], px, py + 0.5);
    }
    if (opts.names) {
      ctx.font = `600 ${Math.max(10, s * 0.6)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(p.player, px + 1, py - rr - 2);
      ctx.fillStyle = '#e6e9ee';
      ctx.fillText(p.player, px, py - rr - 3);
    }
  }
  ctx.restore();
  return { X, Y, s };
}
