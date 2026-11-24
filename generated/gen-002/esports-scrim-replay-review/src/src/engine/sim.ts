import { GH, GW, MAPS, tileAt, type MapDef } from '../data/maps';
import type { AnyPlayer, GameEvent, Kf, Round, Team } from '../data/types';

const DT = 0.1;
const DEG = Math.PI / 180;

export interface PlayerSim {
  player: AnyPlayer;
  team: Team;
  deathT?: number;
  killer?: AnyPlayer;
  xs: Float32Array;
  ys: Float32Array;
  as: Float32Array;
}

export interface RoundSim {
  round: Round;
  map: MapDef;
  players: PlayerSim[];
  byName: Record<string, PlayerSim>;
}

// ---------- grid path finding ----------
function walk(m: MapDef, x: number, y: number) {
  return tileAt(m, x, y) === 0;
}

export function los(m: MapDef, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  const steps = Math.ceil(d / 0.12);
  for (let i = 1; i < steps; i++) {
    const u = i / steps;
    if (!walk(m, x0 + dx * u, y0 + dy * u)) return false;
  }
  return true;
}

function clearPath(m: MapDef, x0: number, y0: number, x1: number, y1: number) {
  // LOS with a little body clearance so string pulling doesn't scrape corners
  const nx = -(y1 - y0), ny = x1 - x0;
  const l = Math.hypot(nx, ny) || 1;
  const ox = (nx / l) * 0.28, oy = (ny / l) * 0.28;
  return los(m, x0, y0, x1, y1) && los(m, x0 + ox, y0 + oy, x1 + ox, y1 + oy) && los(m, x0 - ox, y0 - oy, x1 - ox, y1 - oy);
}

function bfs(m: MapDef, ax: number, ay: number, bx: number, by: number): [number, number][] {
  const sx = Math.floor(ax), sy = Math.floor(ay), tx = Math.floor(bx), ty = Math.floor(by);
  if (sx === tx && sy === ty) return [];
  const prev = new Int32Array(GW * GH).fill(-1);
  const start = sy * GW + sx, goal = ty * GW + tx;
  prev[start] = start;
  const q = [start];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (q.length) {
    const c = q.shift()!;
    if (c === goal) break;
    const cx = c % GW, cy = (c / GW) | 0;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      if (m.grid[ny * GW + nx] !== 0) continue;
      if (dx && dy && (m.grid[cy * GW + nx] !== 0 || m.grid[ny * GW + cx] !== 0)) continue;
      const ni = ny * GW + nx;
      if (prev[ni] !== -1) continue;
      prev[ni] = c;
      q.push(ni);
    }
  }
  if (prev[goal] === -1) return [];
  const path: [number, number][] = [];
  let c = goal;
  while (c !== start) {
    path.push([(c % GW) + 0.5, ((c / GW) | 0) + 0.5]);
    c = prev[c];
  }
  path.reverse();
  path.pop(); // replace last tile center with the exact target
  return path;
}

function route(m: MapDef, a: Kf, b: Kf): [number, number][] {
  const raw: [number, number][] = [[a.x, a.y], ...bfs(m, a.x, a.y, b.x, b.y), [b.x, b.y]];
  // string pulling
  const out: [number, number][] = [raw[0]];
  let i = 0;
  while (i < raw.length - 1) {
    let j = raw.length - 1;
    while (j > i + 1 && !clearPath(m, raw[i][0], raw[i][1], raw[j][0], raw[j][1])) j--;
    out.push(raw[j]);
    i = j;
  }
  return out;
}

function angDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function buildPlayer(m: MapDef, round: Round, tr: Round['tracks'][number]): PlayerSim {
  const n = Math.ceil(round.duration / DT) + 2;
  const xs = new Float32Array(n), ys = new Float32Array(n), as = new Float32Array(n);
  const kfs = tr.kfs;
  // build segments as polylines with timing
  type Seg = { t0: number; t1: number; pts: [number, number][]; cum: number[]; len: number; look?: number };
  const segs: Seg[] = [];
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    const pts = route(m, a, b);
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const len = cum[cum.length - 1];
    const span = Math.max(0.05, b.t - a.t);
    const v = Math.max(len / span, 4.4);
    segs.push({ t0: a.t, t1: a.t + len / v, pts, cum, len, look: b.look });
  }
  const last = kfs[kfs.length - 1];
  const killsBy = round.events.filter((e) => e.type === 'kill' && e.actor === tr.player);
  const abil = round.events.filter((e) => (e.type === 'ability' || e.type === 'plant') && e.actor === tr.player && e.target);

  let si = 0;
  let a0 = kfs[0].look !== undefined ? kfs[0].look * DEG : Math.atan2(16 - kfs[0].y, 23 - kfs[0].x);
  let prevX = kfs[0].x, prevY = kfs[0].y, heading = a0;
  const dead = tr.deathT ?? Infinity;
  for (let i = 0; i < n; i++) {
    const t = Math.min(i * DT, dead);
    while (si < segs.length - 1 && t >= kfs[si + 1].t) si++;
    let x: number, y: number, look: number | undefined;
    if (!segs.length) { x = kfs[0].x; y = kfs[0].y; look = kfs[0].look; }
    else {
      const s = segs[si];
      if (t <= s.t0) { x = s.pts[0][0]; y = s.pts[0][1]; look = kfs[si].look; }
      else if (t >= s.t1) {
        const p = s.pts[s.pts.length - 1]; x = p[0]; y = p[1]; look = s.look;
        if (si === segs.length - 1 && t > kfs[kfs.length - 1].t) { x = last.x; y = last.y; look = last.look ?? look; }
      } else {
        const d = ((t - s.t0) / (s.t1 - s.t0)) * s.len;
        let k = 1;
        while (k < s.cum.length - 1 && s.cum[k] < d) k++;
        const u = (d - s.cum[k - 1]) / Math.max(1e-6, s.cum[k] - s.cum[k - 1]);
        x = s.pts[k - 1][0] + (s.pts[k][0] - s.pts[k - 1][0]) * u;
        y = s.pts[k - 1][1] + (s.pts[k][1] - s.pts[k - 1][1]) * u;
      }
    }
    // heading target
    const mvx = x - prevX, mvy = y - prevY;
    let target = heading;
    if (Math.hypot(mvx, mvy) > 0.04) target = Math.atan2(mvy, mvx);
    else if (look !== undefined) target = look * DEG;
    for (const e of abil) if (t >= e.t - 0.6 && t <= e.t + 0.3) target = Math.atan2(e.target![1] - y, e.target![0] - x);
    for (const k of killsBy) {
      if (t >= k.t - 0.9 && t <= k.t + 0.35) {
        const v = round.tracks.find((q) => q.player === k.victim)!;
        const vp = kfPos(v.kfs, k.t);
        target = Math.atan2(vp[1] - y, vp[0] - x);
      }
    }
    if (i > 0 && t < dead) {
      const d = angDiff(heading, target);
      const maxTurn = 560 * DEG * DT;
      heading += Math.max(-maxTurn, Math.min(maxTurn, d));
    } else if (i === 0) heading = target;
    xs[i] = x; ys[i] = y; as[i] = heading;
    prevX = x; prevY = y;
  }
  return { player: tr.player, team: tr.team, deathT: tr.deathT, killer: tr.killer, xs, ys, as };
}

function kfPos(kfs: Kf[], t: number): [number, number] {
  if (t <= kfs[0].t) return [kfs[0].x, kfs[0].y];
  for (let i = 0; i < kfs.length - 1; i++) if (t <= kfs[i + 1].t) {
    const a = kfs[i], b = kfs[i + 1];
    const u = (t - a.t) / Math.max(0.001, b.t - a.t);
    return [a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u];
  }
  const l = kfs[kfs.length - 1];
  return [l.x, l.y];
}

const cache = new Map<string, RoundSim>();
export function getSim(round: Round): RoundSim {
  let s = cache.get(round.id);
  if (s) return s;
  const m = MAPS[round.map];
  const players = round.tracks.map((tr) => buildPlayer(m, round, tr));
  // victims: snap kill positions so killer facing uses true path position
  s = { round, map: m, players, byName: Object.fromEntries(players.map((p) => [p.player, p])) };
  cache.set(round.id, s);
  return s;
}

export interface PState {
  player: AnyPlayer;
  team: Team;
  x: number;
  y: number;
  a: number;
  alive: boolean;
  deathT?: number;
  killer?: AnyPlayer;
}

export function playerAt(p: PlayerSim, t: number): PState {
  const tt = Math.max(0, Math.min(t, p.deathT ?? Infinity));
  const f = tt / DT;
  const i = Math.min(p.xs.length - 2, Math.floor(f));
  const u = Math.min(1, f - i);
  const a = p.as[i] + angDiff(p.as[i], p.as[i + 1]) * u;
  return {
    player: p.player, team: p.team,
    x: p.xs[i] + (p.xs[i + 1] - p.xs[i]) * u,
    y: p.ys[i] + (p.ys[i + 1] - p.ys[i]) * u,
    a, alive: p.deathT === undefined || t < p.deathT, deathT: p.deathT, killer: p.killer,
  };
}

export interface Smoke { x: number; y: number; r: number; alpha: number; team: Team }
export interface Flash { x: number; y: number; age: number; team: Team }
export interface Tracer { x0: number; y0: number; x1: number; y1: number; age: number; team: Team }

export interface WorldState {
  t: number;
  players: PState[];
  smokes: Smoke[];
  flashes: Flash[];
  tracers: Tracer[];
  charge?: { x: number; y: number; planted: number; defused: boolean };
  ended: boolean;
}

export function worldAt(sim: RoundSim, t: number): WorldState {
  const players = sim.players.map((p) => playerAt(p, t));
  const smokes: Smoke[] = [];
  const flashes: Flash[] = [];
  const tracers: Tracer[] = [];
  let charge: WorldState['charge'];
  for (const e of sim.round.events) {
    if (e.type === 'ability' && e.abilityKind === 'smoke' && e.target) {
      const pop = e.popT ?? e.t + 1;
      const age = t - pop;
      if (age >= 0 && age < 18) {
        const alpha = Math.min(1, age / 0.6) * Math.min(1, (18 - age) / 1.5);
        smokes.push({ x: e.target[0], y: e.target[1], r: 1.7 * Math.min(1, 0.4 + age / 0.8), alpha, team: e.team });
      }
    }
    if (e.type === 'ability' && e.abilityKind === 'flash' && e.target) {
      const age = t - (e.popT ?? e.t + 1);
      if (age >= 0 && age < 2.6) flashes.push({ x: e.target[0], y: e.target[1], age, team: e.team });
    }
    if (e.type === 'kill') {
      const age = t - e.t;
      if (age >= -0.05 && age < 0.3) {
        const k = sim.byName[e.actor], v = sim.byName[e.victim!];
        const kp = playerAt(k, e.t), vp = playerAt(v, e.t);
        tracers.push({ x0: kp.x, y0: kp.y, x1: vp.x, y1: vp.y, age, team: e.team });
      }
    }
    if (e.type === 'plant' && t >= e.t && e.target) charge = { x: e.target[0], y: e.target[1], planted: e.t, defused: false };
    if (e.type === 'defuse' && t >= e.t && charge) charge.defused = true;
  }
  return { t, players, smokes, flashes, tracers, charge, ended: t >= sim.round.endT };
}

/** Is target within the viewer's FOV and line of sight (ignoring smoke)? */
export function canSee(m: MapDef, v: PState, x: number, y: number, fovDeg = 100) {
  const ang = Math.atan2(y - v.y, x - v.x);
  if (Math.abs(angDiff(v.a, ang)) > (fovDeg / 2) * DEG) return false;
  return los(m, v.x, v.y, x, y);
}

export function smokeBlocks(smokes: Smoke[], x0: number, y0: number, x1: number, y1: number) {
  for (const s of smokes) {
    if (s.alpha < 0.5) continue;
    const dx = x1 - x0, dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((s.x - x0) * dx + (s.y - y0) * dy) / l2));
    const px = x0 + dx * u, py = y0 + dy * u;
    if (Math.hypot(px - s.x, py - s.y) < s.r * 0.8) return true;
  }
  return false;
}

export function eventsBefore(evs: GameEvent[], t: number) {
  return evs.filter((e) => e.t <= t);
}
