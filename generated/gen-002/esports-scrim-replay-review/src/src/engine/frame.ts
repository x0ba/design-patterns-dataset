import { MAPS } from '../data/maps';
import { TEAM_COLOR, PLAYER_COLOR, teamOf, PLAYERS } from '../data/scrim';
import type { AnyPlayer, PlayerName, PovId, Round } from '../data/types';
import { PovRenderer } from './raycast';
import { canSee, getSim, los, playerAt, worldAt, type WorldState } from './sim';
import { drawTopdown } from './topdown';

export const ABILITY_OF: Record<PlayerName, string> = {
  Rook: 'Veil', Vesper: 'Recon Pulse', Juno: 'Brace', Kael: 'Flare', Mara: 'Tripwire',
};

const FONT = 'Inter, system-ui, -apple-system, Segoe UI, sans-serif';

export interface FrameOpts {
  hud?: boolean;
  captions?: boolean;
  compact?: boolean; // thumbnails / pip
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const fmtClock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function drawFrame(
  ctx: CanvasRenderingContext2D, W: number, H: number, round: Round, t: number, pov: PovId, renderer: PovRenderer, opts: FrameOpts = {},
) {
  const sim = getSim(round);
  const m = MAPS[round.map];
  const world = worldAt(sim, t);
  const u = W / 800; // ui scale
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  if (pov === 'Spectator') {
    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(0, 0, W, H);
    const pad = opts.compact ? 4 * u : 34 * u;
    drawTopdown(ctx, m, world, { x: pad, y: pad + (opts.compact ? 0 : 8 * u), w: W - pad * 2, h: H - pad * 2 }, { labels: !opts.compact, names: !opts.compact, cones: true });
    if (opts.hud && !opts.compact) {
      drawScore(ctx, W, u, round, world);
      drawKillFeed(ctx, W, u, round, t);
    }
    if (opts.captions) drawCaption(ctx, W, H, u, round, t, 30 * u);
    drawRoundEnd(ctx, W, H, u, round, t, opts);
    ctx.restore();
    return;
  }

  const ps = playerAt(sim.byName[pov], t);
  let cam = { x: ps.x, y: ps.y, a: ps.a };
  const dead = !ps.alive;
  if (dead && ps.killer) {
    const kp = playerAt(sim.byName[ps.killer], ps.deathT!);
    cam = { x: ps.x, y: ps.y, a: Math.atan2(kp.y - ps.y, kp.x - ps.x) };
  }
  const { labels } = renderer.render(m, world, cam, pov, { desaturate: dead });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(renderer.canvas, 0, 0, W, H);

  // flash blindness
  if (!dead) {
    let blind = 0;
    for (const f of world.flashes) {
      if (f.team === ps.team) continue; // Flares are team-safe in Spirelock
      const d = Math.hypot(f.x - ps.x, f.y - ps.y);
      if (d > 16) continue;
      const pseudo = { ...ps };
      // seen at the moment it popped?
      const popState = playerAt(sim.byName[pov], t - f.age);
      if (!canSee(m, popState, f.x, f.y, 110) || !los(m, popState.x, popState.y, f.x, f.y)) continue;
      void pseudo;
      blind = Math.max(blind, Math.max(0, 1 - f.age / 2.4) * (d < 8 ? 1 : 0.6));
    }
    if (blind > 0) {
      ctx.fillStyle = `rgba(255,253,240,${Math.min(0.97, blind)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
  // took-damage vignette right at death
  if (ps.deathT !== undefined && t >= ps.deathT - 0.15 && t < ps.deathT + 0.8) {
    const a = 1 - Math.abs(t - ps.deathT) / 0.8;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.65);
    g.addColorStop(0, 'rgba(200,30,30,0)');
    g.addColorStop(1, `rgba(200,30,30,${0.65 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  if (!dead) {
    // ally name tags
    if (!opts.compact) {
      ctx.font = `600 ${10.5 * u}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (const l of labels) {
        const x = l.x * W, y = l.y * H;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(l.name, x + 1, y + 1);
        ctx.fillStyle = PLAYER_COLOR[l.name as PlayerName] ?? '#9fe';
        ctx.fillText(l.name, x, y);
      }
    }
    drawViewmodel(ctx, W, H, u, round, t, pov as PlayerName, ps);
    // crosshair
    const cx = W / 2, cy = H / 2;
    ctx.strokeStyle = 'rgba(160,255,240,0.95)';
    ctx.lineWidth = Math.max(1, 1.5 * u);
    const g = 3 * u, l = 6 * u;
    ctx.beginPath();
    ctx.moveTo(cx - g - l, cy); ctx.lineTo(cx - g, cy);
    ctx.moveTo(cx + g, cy); ctx.lineTo(cx + g + l, cy);
    ctx.moveTo(cx, cy - g - l); ctx.lineTo(cx, cy - g);
    ctx.moveTo(cx, cy + g); ctx.lineTo(cx, cy + g + l);
    ctx.stroke();
  }

  if (opts.hud && !opts.compact) {
    drawScore(ctx, W, u, round, world);
    drawKillFeed(ctx, W, u, round, t);
    drawRadar(ctx, u, round, world, pov as PlayerName);
    drawVitals(ctx, W, H, u, round, t, pov as PlayerName, ps.alive);
    if (dead) {
      const killEv = round.events.find((e) => e.type === 'kill' && e.victim === pov);
      const bw = 300 * u, bh = 54 * u;
      const bx = W / 2 - bw / 2, by = H * 0.2;
      ctx.fillStyle = 'rgba(10,11,14,0.78)';
      rr(ctx, bx, by, bw, bh, 8 * u); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f2726b';
      ctx.font = `800 ${13 * u}px ${FONT}`;
      ctx.fillText(`ELIMINATED AT ${fmtClock(ps.deathT!)}`, W / 2, by + 18 * u);
      ctx.fillStyle = 'rgba(230,233,238,0.8)';
      ctx.font = `500 ${11 * u}px ${FONT}`;
      ctx.fillText(`by ${ps.killer} · ${killEv?.weapon ?? ''}${killEv?.headshot ? ' · headshot' : ''} · ${killEv?.area ?? ''}`, W / 2, by + 37 * u);
    }
  }
  if (opts.captions) drawCaption(ctx, W, H, u, round, t, 92 * u);
  drawRoundEnd(ctx, W, H, u, round, t, opts);
  ctx.restore();
}

function drawRoundEnd(ctx: CanvasRenderingContext2D, W: number, H: number, u: number, round: Round, t: number, opts: FrameOpts) {
  if (opts.compact || t < round.endT || t > round.endT + 5) return;
  const label = round.won ? 'ROUND WON' : 'ROUND LOST';
  const how = round.end === 'elim' ? 'Elimination' : round.end === 'time' ? 'Time expired' : round.objDetail === 'defused' ? 'Charge defused' : 'Charge detonated';
  const bw = 260 * u, bh = 50 * u;
  ctx.fillStyle = 'rgba(10,11,14,0.8)';
  const y0 = 50 * u;
  rr(ctx, W / 2 - bw / 2, y0, bw, bh, 8 * u); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = round.won ? '#4fd1c5' : '#f2726b';
  ctx.font = `800 ${15 * u}px ${FONT}`;
  ctx.fillText(label, W / 2, y0 + 18 * u);
  ctx.fillStyle = 'rgba(230,233,238,0.75)';
  ctx.font = `500 ${11 * u}px ${FONT}`;
  ctx.fillText(how, W / 2, y0 + 36 * u);
}

function drawScore(ctx: CanvasRenderingContext2D, W: number, u: number, round: Round, world: WorldState) {
  const [us, them] = round.scoreBefore;
  const w = 210 * u, h = 34 * u, x = W / 2 - w / 2, y = 8 * u;
  ctx.fillStyle = 'rgba(10,11,14,0.72)';
  rr(ctx, x, y, w, h, 6 * u); ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${15 * u}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = TEAM_COLOR.LOW;
  ctx.fillText(String(us), x + 46 * u, y + 13 * u);
  ctx.font = `700 ${9 * u}px ${FONT}`;
  ctx.fillText('LOW', x + 12 * u, y + 13 * u);
  ctx.textAlign = 'right';
  ctx.fillStyle = TEAM_COLOR.HF;
  ctx.font = `800 ${15 * u}px ${FONT}`;
  ctx.fillText(String(them), x + w - 46 * u, y + 13 * u);
  ctx.font = `700 ${9 * u}px ${FONT}`;
  ctx.fillText('HF', x + w - 12 * u, y + 13 * u);
  ctx.textAlign = 'center';
  ctx.fillStyle = world.charge && !world.charge.defused && !world.ended ? '#ff6a5e' : '#e6e9ee';
  ctx.font = `700 ${14 * u}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const t = world.t;
  ctx.fillText(world.charge && !world.charge.defused && !world.ended ? `◆ ${Math.max(0, 40 - (t - world.charge.planted)).toFixed(0)}` : fmtClock(t), W / 2, y + 13 * u);
  // alive pips
  const lows = world.players.filter((p) => p.team === 'LOW');
  const hfs = world.players.filter((p) => p.team === 'HF');
  const pip = (arr: typeof lows, sx: number, dir: number, col: string) => {
    arr.forEach((p, i) => {
      ctx.fillStyle = p.alive ? col : 'rgba(255,255,255,0.15)';
      ctx.fillRect(sx + dir * i * 9 * u, y + 25 * u, 7 * u, 3 * u);
    });
  };
  pip(lows, x + 12 * u, 1, TEAM_COLOR.LOW);
  pip(hfs, x + w - 19 * u, -1, TEAM_COLOR.HF);
}

function drawKillFeed(ctx: CanvasRenderingContext2D, W: number, u: number, round: Round, t: number) {
  const kills = round.events.filter((e) => e.type === 'kill' && e.t <= t && t - e.t < 7).slice(-5);
  ctx.font = `600 ${11 * u}px ${FONT}`;
  ctx.textBaseline = 'middle';
  kills.forEach((k, i) => {
    const y = 10 * u + i * 24 * u;
    const a = k.actor, v = k.victim!;
    const mid = k.headshot ? ' ⌖ ' : ' ▸ ';
    const wa = ctx.measureText(a).width, wm = ctx.measureText(mid).width, wv = ctx.measureText(v).width;
    const bw = wa + wm + wv + 18 * u;
    const x = W - 10 * u - bw;
    const fresh = t - k.t < 0.6;
    ctx.fillStyle = fresh ? 'rgba(40,10,10,0.85)' : 'rgba(10,11,14,0.66)';
    rr(ctx, x, y, bw, 19 * u, 4 * u); ctx.fill();
    if (teamOf(v) === 'LOW') { ctx.strokeStyle = 'rgba(242,114,107,0.7)'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.textAlign = 'left';
    ctx.fillStyle = TEAM_COLOR[k.team];
    ctx.fillText(a, x + 9 * u, y + 10 * u);
    ctx.fillStyle = 'rgba(230,233,238,0.7)';
    ctx.fillText(mid, x + 9 * u + wa, y + 10 * u);
    ctx.fillStyle = TEAM_COLOR[teamOf(v)];
    ctx.fillText(v, x + 9 * u + wa + wm, y + 10 * u);
  });
}

function drawRadar(ctx: CanvasRenderingContext2D, u: number, round: Round, world: WorldState, pov: PlayerName) {
  const w = 150 * u, h = 106 * u, x = 10 * u, y = 10 * u;
  ctx.fillStyle = 'rgba(10,11,14,0.6)';
  rr(ctx, x - 4 * u, y - 4 * u, w + 8 * u, h + 8 * u, 6 * u); ctx.fill();
  ctx.globalAlpha = 0.92;
  drawTopdown(ctx, MAPS[round.map], world, { x, y, w, h }, { viewer: pov });
  ctx.globalAlpha = 1;
}

function drawVitals(ctx: CanvasRenderingContext2D, W: number, H: number, u: number, round: Round, t: number, pov: PlayerName, alive: boolean) {
  const hp = alive ? 100 : 0;
  // health
  const x = 14 * u, y = H - 44 * u;
  ctx.fillStyle = 'rgba(10,11,14,0.66)';
  rr(ctx, x, y, 150 * u, 32 * u, 6 * u); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `800 ${17 * u}px ${FONT}`;
  ctx.fillStyle = '#e6e9ee';
  ctx.fillText(String(hp), x + 10 * u, y + 16 * u);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x + 46 * u, y + 11 * u, 92 * u, 4 * u);
  ctx.fillRect(x + 46 * u, y + 19 * u, 92 * u, 3 * u);
  ctx.fillStyle = hp > 30 ? '#e6e9ee' : '#f2726b';
  ctx.fillRect(x + 46 * u, y + 11 * u, 92 * u * (hp / 100), 4 * u);
  ctx.fillStyle = '#7cc4ff';
  ctx.fillRect(x + 46 * u, y + 19 * u, alive ? 92 * u * 0.5 : 0, 3 * u);
  // name
  ctx.font = `700 ${10 * u}px ${FONT}`;
  ctx.fillStyle = PLAYER_COLOR[pov];
  ctx.fillText(`LOW ${pov.toUpperCase()}`, x + 2 * u, y - 9 * u);

  // abilities
  const used = round.events.some((e) => e.type === 'ability' && e.actor === pov && e.t <= t);
  const slots = [
    { k: 'Q', n: ABILITY_OF[pov], ready: !used },
    { k: 'E', n: 'Dash', ready: true },
    { k: 'X', n: 'Overdrive', ready: false, pct: Math.min(0.92, 0.35 + round.n * 0.02) },
  ];
  const sw = 64 * u, gap = 6 * u;
  const total = slots.length * sw + (slots.length - 1) * gap;
  slots.forEach((s, i) => {
    const sx = W / 2 - total / 2 + i * (sw + gap), sy = H - 40 * u;
    ctx.fillStyle = 'rgba(10,11,14,0.66)';
    rr(ctx, sx, sy, sw, 30 * u, 5 * u); ctx.fill();
    if (s.pct !== undefined) { ctx.fillStyle = 'rgba(79,209,197,0.25)'; ctx.fillRect(sx, sy + 27 * u, sw * s.pct, 3 * u); }
    ctx.textAlign = 'center';
    ctx.fillStyle = s.ready ? '#e6e9ee' : 'rgba(230,233,238,0.35)';
    ctx.font = `600 ${9.5 * u}px ${FONT}`;
    ctx.fillText(s.n, sx + sw / 2, sy + 19 * u);
    ctx.font = `800 ${8 * u}px ${FONT}`;
    ctx.fillStyle = 'rgba(230,233,238,0.5)';
    ctx.fillText(s.k, sx + sw / 2, sy + 8 * u);
  });
  // ammo
  const kills = round.events.filter((e) => e.type === 'kill' && e.actor === pov && e.t <= t).length;
  const mag = Math.max(3, 25 - kills * 5);
  const ax = W - 150 * u, ay = H - 44 * u;
  ctx.fillStyle = 'rgba(10,11,14,0.66)';
  rr(ctx, ax, ay, 136 * u, 32 * u, 6 * u); ctx.fill();
  ctx.textAlign = 'right';
  ctx.font = `800 ${17 * u}px ${FONT}`;
  ctx.fillStyle = '#e6e9ee';
  ctx.fillText(String(alive ? mag : 0), ax + 40 * u, ay + 16 * u);
  ctx.font = `600 ${11 * u}px ${FONT}`;
  ctx.fillStyle = 'rgba(230,233,238,0.55)';
  ctx.textAlign = 'left';
  ctx.fillText('/ 75', ax + 44 * u, ay + 17 * u);
  ctx.textAlign = 'right';
  ctx.font = `700 ${8.5 * u}px ${FONT}`;
  ctx.fillText(pov === 'Kael' ? 'LANCET SMG' : 'HALBERD AR', ax + 128 * u, ay + 17 * u);
}

function drawViewmodel(ctx: CanvasRenderingContext2D, W: number, H: number, u: number, round: Round, t: number, pov: PlayerName, ps: { x: number; y: number }) {
  const sim = getSim(round);
  const p2 = playerAt(sim.byName[pov], t - 0.1);
  const speed = Math.hypot(ps.x - p2.x, ps.y - p2.y) * 10;
  const bob = Math.sin(t * 9) * Math.min(1, speed / 4) * 5 * u;
  const fired = round.events.some((e) => e.type === 'kill' && e.actor === pov && t >= e.t - 0.02 && t - e.t < 0.12);
  const bx = W * 0.66, by = H + bob;
  ctx.save();
  ctx.translate(bx, by);
  ctx.fillStyle = '#1d2024';
  ctx.beginPath();
  ctx.moveTo(40 * u, 0); ctx.lineTo(70 * u, -88 * u); ctx.lineTo(96 * u, -100 * u); ctx.lineTo(150 * u, -40 * u); ctx.lineTo(170 * u, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2b3036';
  ctx.beginPath();
  ctx.moveTo(70 * u, -88 * u); ctx.lineTo(96 * u, -100 * u); ctx.lineTo(108 * u, -86 * u); ctx.lineTo(84 * u, -74 * u);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4fd1c5';
  ctx.fillRect(98 * u, -70 * u, 18 * u, 3 * u);
  ctx.restore();
  if (fired) {
    const fx = bx + 78 * u, fy = by - 104 * u;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 38 * u);
    g.addColorStop(0, 'rgba(255,240,190,0.95)'); g.addColorStop(0.4, 'rgba(255,190,90,0.6)'); g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx, fy, 38 * u, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCaption(ctx: CanvasRenderingContext2D, W: number, H: number, u: number, round: Round, t: number, bottom: number) {
  const line = [...round.comms].reverse().find((l) => t >= l.t && t <= l.t + l.dur + 0.8);
  if (!line) return;
  ctx.font = `600 ${12.5 * u}px ${FONT}`;
  const name = line.speaker.toUpperCase();
  ctx.font = `800 ${10 * u}px ${FONT}`;
  const wn = ctx.measureText(name).width;
  ctx.font = `500 ${13 * u}px ${FONT}`;
  const wt = ctx.measureText(line.text).width;
  const bw = wn + wt + 30 * u, bh = 26 * u;
  const x = W / 2 - bw / 2, y = H - bottom - bh;
  ctx.fillStyle = 'rgba(8,9,12,0.8)';
  rr(ctx, x, y, bw, bh, 5 * u); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `800 ${10 * u}px ${FONT}`;
  ctx.fillStyle = PLAYER_COLOR[line.speaker];
  ctx.fillText(name, x + 11 * u, y + bh / 2 + 0.5);
  ctx.font = `500 ${13 * u}px ${FONT}`;
  ctx.fillStyle = '#eef1f5';
  ctx.fillText(line.text, x + 19 * u + wn, y + bh / 2 + 0.5);
}

export function isAliveAt(round: Round, p: AnyPlayer, t: number) {
  const tr = round.tracks.find((x) => x.player === p);
  return !tr?.deathT || t < tr.deathT;
}

export { PLAYERS };
