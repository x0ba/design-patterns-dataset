import { GW, GH, type MapDef } from '../data/maps';
import { hash2 } from '../data/rng';
import { teamOf } from '../data/scrim';
import type { AnyPlayer } from '../data/types';
import type { PState, WorldState } from './sim';

const WALL_H = 1.6;
const EYE = 0.78;

type RGB = [number, number, number];

const siteCache = new Map<MapDef, Uint8Array>();
function siteMask(m: MapDef) {
  let s = siteCache.get(m);
  if (s) return s;
  s = new Uint8Array(GW * GH);
  // painted plant zones around the two default boxes
  const zones = [[10.5, 10.5], [39.5, 10.5]];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    for (const [zx, zy] of zones) {
      const cx = m.mirror ? GW - zx : zx;
      if (Math.abs(x + 0.5 - cx) <= 3 && Math.abs(y + 0.5 - zy) <= 2.5) s[y * GW + x] = 1;
    }
  }
  siteCache.set(m, s);
  return s;
}

const pack = (r: number, g: number, b: number) => (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);

export interface PovOptions {
  desaturate?: boolean;
  label?: boolean;
}

export class PovRenderer {
  w: number;
  h: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  buf: Uint32Array;
  z: Float32Array;
  constructor(w: number, h: number) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d')!;
    this.img = this.ctx.createImageData(w, h);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.z = new Float32Array(w);
  }

  /** Renders the first-person view; returns screen-space info for HUD overlays. */
  render(m: MapDef, world: WorldState, cam: { x: number; y: number; a: number }, viewer: AnyPlayer, opts: PovOptions = {}) {
    const { w, h, buf, z } = this;
    const pal = m.palette;
    const grid = m.grid;
    const sites = siteMask(m);
    const scale = w / 2; // 90° horizontal FOV
    const half = h / 2;
    const dirX = Math.cos(cam.a), dirY = Math.sin(cam.a);
    const plX = -dirY, plY = dirX;
    const fogC = pal.fog;
    const fogD = pal.fogDist;

    // sky / far ceiling
    for (let y = 0; y < half; y++) {
      const u = y / half;
      const r = pal.skyTop[0] + (pal.sky[0] - pal.skyTop[0]) * u;
      const g = pal.skyTop[1] + (pal.sky[1] - pal.skyTop[1]) * u;
      const b = pal.skyTop[2] + (pal.sky[2] - pal.skyTop[2]) * u;
      const c = pack(r, g, b);
      buf.fill(c, y * w, (y + 1) * w);
    }
    // floor casting
    const rx0 = dirX - plX, ry0 = dirY - plY, rx1 = dirX + plX, ry1 = dirY + plY;
    for (let y = Math.floor(half) + 1; y < h; y++) {
      const rowDist = (EYE * scale) / (y - half);
      const stepX = (rowDist * (rx1 - rx0)) / w, stepY = (rowDist * (ry1 - ry0)) / w;
      let fx = cam.x + rowDist * rx0, fy = cam.y + rowDist * ry0;
      const fog = Math.min(0.92, Math.pow(rowDist / fogD, 1.15));
      for (let x = 0; x < w; x++) {
        const tx = Math.floor(fx), ty = Math.floor(fy);
        const ffx = fx - tx, ffy = fy - ty;
        let r = pal.floor[0], g = pal.floor[1], b = pal.floor[2];
        const hv = tx >= 0 && ty >= 0 && tx < GW && ty < GH ? hash2(tx, ty) : 0.5;
        const k = 0.9 + hv * 0.18;
        r *= k; g *= k; b *= k;
        if (ffx < 0.035 || ffy < 0.035) { r *= 0.7; g *= 0.7; b *= 0.7; }
        if (tx >= 0 && ty >= 0 && tx < GW && ty < GH && sites[ty * GW + tx]) {
          const stripe = ((fx + fy) * 2.2) % 1 < 0.5;
          r = r * 0.8 + (stripe ? 52 : 30); g = g * 0.8 + (stripe ? 40 : 22); b = b * 0.8 + 6;
        }
        r += (fogC[0] - r) * fog; g += (fogC[1] - g) * fog; b += (fogC[2] - b) * fog;
        buf[y * w + x] = pack(r, g, b);
        fx += stepX; fy += stepY;
      }
    }
    // walls
    for (let x = 0; x < w; x++) {
      const camX = (2 * x) / w - 1;
      const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
      let mapX = Math.floor(cam.x), mapY = Math.floor(cam.y);
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      let stepX: number, stepY: number, sdx: number, sdy: number;
      if (rdx < 0) { stepX = -1; sdx = (cam.x - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - cam.x) * ddx; }
      if (rdy < 0) { stepY = -1; sdy = (cam.y - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - cam.y) * ddy; }
      let side = 0, tile = 1, guard = 0;
      while (guard++ < 128) {
        if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; } else { sdy += ddy; mapY += stepY; side = 1; }
        if (mapX < 0 || mapY < 0 || mapX >= GW || mapY >= GH) { tile = 1; break; }
        tile = grid[mapY * GW + mapX];
        if (tile !== 0) break;
      }
      const perp = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
      z[x] = perp;
      let wallX = side === 0 ? cam.y + perp * rdy : cam.x + perp * rdx;
      wallX -= Math.floor(wallX);
      const lh = scale / perp;
      const top = half - (WALL_H - EYE) * lh;
      const bot = half + EYE * lh;
      const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(h - 1, Math.ceil(bot));
      const base: RGB = tile === 2 ? pal.crate : hash2(mapX, mapY * 3) > 0.7 ? pal.wall2 : pal.wall;
      const vary = 0.9 + hash2(mapX * 7, mapY) * 0.16;
      const shade = (side === 1 ? 0.78 : 1) * vary;
      const fog = Math.min(0.92, Math.pow(perp / fogD, 1.15));
      const seam = wallX < 0.03 || wallX > 0.97;
      const panel = Math.floor(wallX * 2) % 2 === 0;
      for (let y = y0; y <= y1; y++) {
        const v = (y - top) / (bot - top); // 0 at top
        let k = shade;
        if (tile === 2) {
          const zh = (1 - v) * WALL_H; // height above floor
          if (zh > 1.05) { continue; } // crates are short: let sky/back wall through
          const vv = zh / 1.05;
          if (wallX < 0.06 || wallX > 0.94 || vv < 0.05 || vv > 0.95) k *= 0.62;
          else if (Math.abs(wallX - vv) < 0.05 || Math.abs(wallX - (1 - vv)) < 0.05) k *= 0.75;
        } else {
          if (seam) k *= 0.55;
          if (v > 0.9) k *= 0.6;
          else if ((v > 0.34 && v < 0.36) || (v > 0.6 && v < 0.615)) k *= 0.7;
          else if (v < 0.08) k *= 0.82;
          if (!panel) k *= 0.95;
        }
        let r = base[0] * k, g = base[1] * k, b = base[2] * k;
        r += (fogC[0] - r) * fog; g += (fogC[1] - g) * fog; b += (fogC[2] - b) * fog;
        buf[y * w + x] = pack(r, g, b);
      }
    }
    // crates are shorter than walls: re-cast behind them is costly, so we draw the back wall
    // color into the gap above a crate using a second pass that skips crates.
    for (let x = 0; x < w; x++) {
      // only needed where the first hit was a crate; detect by sky color presence just above crate top
      const camX = (2 * x) / w - 1;
      const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
      let mapX = Math.floor(cam.x), mapY = Math.floor(cam.y);
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      let stepX: number, stepY: number, sdx: number, sdy: number;
      if (rdx < 0) { stepX = -1; sdx = (cam.x - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - cam.x) * ddx; }
      if (rdy < 0) { stepY = -1; sdy = (cam.y - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - cam.y) * ddy; }
      let side = 0, tile = 0, guard = 0, firstCrate = -1, crateDist = 0;
      while (guard++ < 128) {
        if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; } else { sdy += ddy; mapY += stepY; side = 1; }
        if (mapX < 0 || mapY < 0 || mapX >= GW || mapY >= GH) { tile = 1; break; }
        tile = grid[mapY * GW + mapX];
        if (tile === 2 && firstCrate < 0) { firstCrate = 1; crateDist = side === 0 ? sdx - ddx : sdy - ddy; continue; }
        if (tile === 2) continue;
        if (tile !== 0) break;
      }
      if (firstCrate < 0) continue;
      const perp = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
      let wallX = side === 0 ? cam.y + perp * rdy : cam.x + perp * rdx;
      wallX -= Math.floor(wallX);
      const lh = scale / perp;
      const top = half - (WALL_H - EYE) * lh;
      const bot = half + EYE * lh;
      const crateTop = half - (1.05 - EYE) * (scale / crateDist);
      const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(h - 1, Math.floor(crateTop));
      const base: RGB = hash2(mapX, mapY * 3) > 0.7 ? pal.wall2 : pal.wall;
      const shade = (side === 1 ? 0.78 : 1) * (0.9 + hash2(mapX * 7, mapY) * 0.16);
      const fog = Math.min(0.92, Math.pow(perp / fogD, 1.15));
      for (let y = y0; y <= y1; y++) {
        const v = (y - top) / (bot - top);
        let k = shade;
        if (wallX < 0.03 || wallX > 0.97) k *= 0.55;
        if (v < 0.08) k *= 0.82;
        let r = base[0] * k, g = base[1] * k, b = base[2] * k;
        r += (fogC[0] - r) * fog; g += (fogC[1] - g) * fog; b += (fogC[2] - b) * fog;
        buf[y * w + x] = pack(r, g, b);
      }
    }

    // ---- sprites ----
    const invDet = 1 / (plX * dirY - dirX * plY);
    const proj = (wx: number, wy: number) => {
      const sx = wx - cam.x, sy = wy - cam.y;
      const tX = invDet * (dirY * sx - dirX * sy);
      const tY = invDet * (-plY * sx + plX * sy);
      return { tX, tY, screenX: (w / 2) * (1 + tX / tY) };
    };
    type Spr = { d: number; draw: () => void };
    const sprites: Spr[] = [];
    const labels: { x: number; y: number; name: string; team: string; d: number }[] = [];
    const viewerTeam = teamOf(viewer);

    for (const p of world.players) {
      if (p.player === viewer) continue;
      const pr = proj(p.x, p.y);
      if (pr.tY < 0.2) continue;
      sprites.push({ d: pr.tY, draw: () => this.drawPlayer(p, pr, viewerTeam, fogC, fogD) });
      if (p.alive) {
        const sx = Math.round(pr.screenX);
        if (sx >= 0 && sx < w && pr.tY < z[sx] + 0.1 && p.team === viewerTeam) {
          labels.push({ x: pr.screenX / w, y: (half + (EYE - 1.12) * (scale / pr.tY)) / h, name: p.player, team: p.team, d: pr.tY });
        }
      }
    }
    if (world.charge) {
      const c = world.charge;
      const pr = proj(c.x, c.y);
      if (pr.tY > 0.2) sprites.push({ d: pr.tY, draw: () => this.drawCharge(pr, world.t - c.planted, c.defused, fogC, fogD) });
    }
    for (const s of world.smokes) {
      const pr = proj(s.x, s.y);
      if (pr.tY > -s.r) sprites.push({ d: pr.tY, draw: () => this.drawSmoke(s.x, s.y, s.r, s.alpha, pr, cam) });
    }
    for (const f of world.flashes) {
      if (f.age > 0.5) continue;
      const pr = proj(f.x, f.y);
      if (pr.tY > 0.2) sprites.push({ d: pr.tY, draw: () => this.drawFlash(pr, f.age) });
    }
    sprites.sort((a, b) => b.d - a.d);
    for (const s of sprites) s.draw();

    // smoke engulfing camera
    for (const s of world.smokes) {
      const d = Math.hypot(cam.x - s.x, cam.y - s.y);
      if (d < s.r) {
        const a = s.alpha * Math.min(0.92, (1 - d / s.r) * 1.6);
        for (let i = 0; i < buf.length; i++) {
          const c = buf[i];
          const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
          buf[i] = pack(r + (150 - r) * a, g + (156 - g) * a, b + (162 - b) * a);
        }
      }
    }

    if (opts.desaturate) {
      for (let i = 0; i < buf.length; i++) {
        const c = buf[i];
        const l = ((c & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + ((c >> 16) & 255) * 0.11) * 0.55;
        buf[i] = pack(l, l, l * 1.05);
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
    return { labels };
  }

  private drawPlayer(p: PState, pr: { tX: number; tY: number; screenX: number }, viewerTeam: string, fogC: RGB, fogD: number) {
    const { w, h, buf, z } = this;
    const scale = w / 2, half = h / 2;
    const ppu = scale / pr.tY; // pixels per world unit
    const ally = p.team === viewerTeam;
    const base: RGB = ally ? [70, 190, 180] : [226, 96, 84];
    const fog = Math.min(0.85, Math.pow(pr.tY / fogD, 1.15)) * 0.8;
    if (!p.alive) {
      // body on the floor
      const yF = half + EYE * ppu;
      const x0 = Math.max(0, Math.floor(pr.screenX - 0.42 * ppu)), x1 = Math.min(w - 1, Math.ceil(pr.screenX + 0.42 * ppu));
      const hgt = Math.max(1, 0.12 * ppu);
      for (let x = x0; x <= x1; x++) {
        if (pr.tY >= z[x]) continue;
        for (let y = Math.max(0, Math.floor(yF - hgt)); y <= Math.min(h - 1, Math.floor(yF)); y++) {
          const k = 0.35;
          let r = base[0] * k, g = base[1] * k, b = base[2] * k;
          r += (fogC[0] - r) * fog; g += (fogC[1] - g) * fog; b += (fogC[2] - b) * fog;
          buf[y * w + x] = pack(r, g, b);
        }
      }
      return;
    }
    const x0 = Math.max(0, Math.floor(pr.screenX - 0.34 * ppu)), x1 = Math.min(w - 1, Math.ceil(pr.screenX + 0.34 * ppu));
    const yTop = half + (EYE - 0.98) * ppu, yBot = half + EYE * ppu;
    const y0 = Math.max(0, Math.floor(yTop)), y1 = Math.min(h - 1, Math.ceil(yBot));
    // facing relative to camera: gun on one side
    const gunSide = Math.sin(p.a) * 0.3 >= 0 ? 1 : -1;
    for (let x = x0; x <= x1; x++) {
      if (pr.tY >= z[x]) continue;
      const u = (x - pr.screenX) / ppu;
      for (let y = y0; y <= y1; y++) {
        const zz = EYE - (y - half) / ppu; // world height
        let inside = false, k = 1;
        if (zz > 0.76 && zz < 0.96) inside = (u * u) / 0.011 + ((zz - 0.86) * (zz - 0.86)) / 0.011 < 1;
        else if (zz >= 0.46 && zz <= 0.76) { const wdt = 0.16 + (zz - 0.46) * 0.12; inside = Math.abs(u) < wdt; }
        else if (zz >= 0 && zz < 0.46) { inside = Math.abs(Math.abs(u) - 0.075) < 0.06; k = 0.72; }
        if (!inside && zz > 0.6 && zz < 0.67 && u * gunSide > 0 && Math.abs(u) < 0.32) { inside = true; k = 0.32; }
        if (!inside) continue;
        k *= 0.62 + 0.38 * Math.cos(Math.min(1.5, Math.abs(u) / 0.2));
        if (zz > 0.76) k *= 1.05;
        let r = base[0] * k, g = base[1] * k, b = base[2] * k;
        r += (fogC[0] - r) * fog; g += (fogC[1] - g) * fog; b += (fogC[2] - b) * fog;
        buf[y * w + x] = pack(r, g, b);
      }
    }
  }

  private drawCharge(pr: { tX: number; tY: number; screenX: number }, age: number, defused: boolean, fogC: RGB, fogD: number) {
    const { w, h, buf, z } = this;
    const scale = w / 2, half = h / 2;
    const ppu = scale / pr.tY;
    const blink = !defused && Math.floor(age * (age > 30 ? 6 : 2)) % 2 === 0;
    const x0 = Math.max(0, Math.floor(pr.screenX - 0.18 * ppu)), x1 = Math.min(w - 1, Math.ceil(pr.screenX + 0.18 * ppu));
    const y0 = Math.max(0, Math.floor(half + (EYE - 0.22) * ppu)), y1 = Math.min(h - 1, Math.ceil(half + EYE * ppu));
    const fog = Math.min(0.85, Math.pow(pr.tY / fogD, 1.15)) * 0.7;
    for (let x = x0; x <= x1; x++) {
      if (pr.tY >= z[x]) continue;
      for (let y = y0; y <= y1; y++) {
        const zz = EYE - (y - half) / ppu;
        const u = (x - pr.screenX) / ppu;
        let r = 60, g = 62, b = 66;
        if (zz > 0.16 && Math.abs(u) < 0.05) { r = blink ? 255 : 120; g = blink ? 70 : 40; b = blink ? 60 : 40; if (defused) { r = 80; g = 200; b = 160; } }
        r += (fogC[0] - r) * fog; g += (fogC[1] - g) * fog; b += (fogC[2] - b) * fog;
        buf[y * w + x] = pack(r, g, b);
      }
    }
  }

  private drawSmoke(sx: number, sy: number, R: number, alpha: number, pr: { tX: number; tY: number; screenX: number }, cam: { x: number; y: number }) {
    if (pr.tY < 0.3) return;
    const { w, h, buf, z } = this;
    const scale = w / 2, half = h / 2;
    const ppu = scale / pr.tY;
    const cy = half + (EYE - 0.7) * ppu;
    const rad = R * ppu;
    const x0 = Math.max(0, Math.floor(pr.screenX - rad)), x1 = Math.min(w - 1, Math.ceil(pr.screenX + rad));
    const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(h - 1, Math.ceil(half + EYE * ppu));
    void cam; void sx; void sy;
    for (let x = x0; x <= x1; x++) {
      if (pr.tY - R > z[x]) continue;
      const nx = (x - pr.screenX) / rad;
      for (let y = y0; y <= y1; y++) {
        const ny = (y - cy) / rad;
        const d2 = nx * nx + ny * ny * (ny > 0 ? 0.55 : 1);
        if (d2 >= 1) continue;
        const n = hash2(Math.floor(x / 3), Math.floor(y / 3)) * 0.18;
        const a = alpha * Math.min(0.94, (1 - d2) * 1.5 + 0.1 - n);
        if (a <= 0) continue;
        const i = y * w + x;
        const c = buf[i];
        const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
        const sh = 150 + (1 - ny) * 22;
        buf[i] = pack(r + (sh - r) * a, g + (sh + 4 - g) * a, b + (sh + 10 - b) * a);
      }
    }
  }

  private drawFlash(pr: { tX: number; tY: number; screenX: number }, age: number) {
    const { w, h, buf, z } = this;
    const scale = w / 2, half = h / 2;
    const ppu = scale / pr.tY;
    const cy = half + (EYE - 1.1) * ppu;
    const intensity = Math.max(0, 1 - age / 0.5);
    const rad = (0.5 + age * 2.5) * ppu;
    const x0 = Math.max(0, Math.floor(pr.screenX - rad)), x1 = Math.min(w - 1, Math.ceil(pr.screenX + rad));
    const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(h - 1, Math.ceil(cy + rad));
    for (let x = x0; x <= x1; x++) {
      if (pr.tY > z[x] + 0.5) continue;
      for (let y = y0; y <= y1; y++) {
        const dx = (x - pr.screenX) / rad, dy = (y - cy) / rad;
        const d2 = dx * dx + dy * dy;
        if (d2 >= 1) continue;
        const a = intensity * (1 - d2) * (1 - d2);
        const i = y * w + x;
        const c = buf[i];
        const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
        buf[i] = pack(r + (255 - r) * a, g + (252 - g) * a, b + (235 - b) * a);
      }
    }
  }
}
