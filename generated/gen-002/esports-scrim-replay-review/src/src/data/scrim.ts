import { MAPS, areaAt, mx, mAngle, type MapDef } from './maps';
import { mulberry32, pick, irange, range, shuffle, type Rng } from './rng';
import type {
  AnyPlayer, CommsLine, EndType, EnemyName, GameEvent, Kf, MapId, PlayerName, Round, Side, Team, Track,
} from './types';

export const PLAYERS: PlayerName[] = ['Rook', 'Vesper', 'Juno', 'Kael', 'Mara'];
export const ENEMIES: EnemyName[] = ['Corvid', 'Lumen', 'Tess', 'Brask', 'Nyx'];

export const ROLES: Record<PlayerName, string> = {
  Rook: 'IGL · A anchor',
  Vesper: 'Flex · Gantry',
  Juno: 'Anchor · B',
  Kael: 'Support · Mid',
  Mara: 'Sentinel · B Lane',
};
export const PLAYER_COLOR: Record<PlayerName, string> = {
  Rook: '#6cb8ff',
  Vesper: '#e49bf5',
  Juno: '#5fe0c0',
  Kael: '#d6e46b',
  Mara: '#ffad6b',
};
export const TEAM_COLOR: Record<Team, string> = { LOW: '#4fd1c5', HF: '#f2726b' };
export const teamOf = (p: AnyPlayer): Team => ((PLAYERS as string[]).includes(p) ? 'LOW' : 'HF');

export const SCRIM = {
  id: 'scrim-hf-1116',
  opponent: 'Halcyon Five',
  opponentTag: 'HF',
  us: 'Lowtide Esports',
  usTag: 'LOW',
  date: 'Mon, Nov 16',
  start: '8:00 PM',
  format: 'Scrim block · 3 maps · play-out extras',
};

export interface MapResult {
  id: MapId;
  order: number;
  us: number;
  them: number;
  firstSide: Side;
  seq: string; // W/L per counted round
  extras: { side: Side; won: boolean }[];
}

export const MAP_RESULTS: MapResult[] = [
  {
    id: 'foundry', order: 1, us: 9, them: 13, firstSide: 'att',
    seq: 'WWLLWWLLWLWL' + 'LWLLLWLLWL',
    extras: [{ side: 'def', won: true }, { side: 'def', won: false }, { side: 'att', won: true }, { side: 'att', won: false }],
  },
  {
    id: 'saltworks', order: 2, us: 11, them: 13, firstSide: 'def',
    seq: 'LWLLWLWLLWWL' + 'WLWWLLWLWWLL',
    extras: [{ side: 'att', won: false }, { side: 'att', won: true }, { side: 'def', won: false }, { side: 'def', won: true }],
  },
  {
    id: 'canopy', order: 3, us: 13, them: 8, firstSide: 'att',
    seq: 'WWLWWWLWLWWL' + 'LWWLWLLWW',
    extras: [{ side: 'def', won: true }, { side: 'def', won: true }, { side: 'att', won: false }, { side: 'att', won: true }],
  },
];

// Hand-authored end types for Foundry (the map Dana is reviewing). Others are seeded.
const FOUNDRY_END: EndType[] = [
  'elim', 'obj', 'elim', 'elim', 'obj', 'elim', 'time', 'elim', 'obj', 'obj', 'elim', 'elim',
  'obj', 'elim', 'obj', 'elim', 'obj', 'obj', 'obj', 'elim', 'time', 'obj',
];

const WEAPONS = ['Halberd AR', 'Halberd AR', 'Halberd AR', 'Lancet SMG', 'Longshot', 'Warden'];
const ABIL: Record<AnyPlayer, { name: string; kind: GameEvent['abilityKind'] }> = {
  Rook: { name: 'Veil', kind: 'smoke' },
  Vesper: { name: 'Recon Pulse', kind: 'recon' },
  Juno: { name: 'Brace', kind: 'stim' },
  Kael: { name: 'Flare', kind: 'flash' },
  Mara: { name: 'Tripwire', kind: 'trip' },
  Lumen: { name: 'Veil', kind: 'smoke' },
  Brask: { name: 'Flare', kind: 'flash' },
  Tess: { name: 'Tripwire', kind: 'trip' },
  Nyx: { name: 'Recon Pulse', kind: 'recon' },
  Corvid: { name: 'Brace', kind: 'stim' },
};

// ---------- base-layout reference points ----------
type P = [number, number];
const DEF_SETUP: P[] = [[6.5, 11.5], [15.5, 11.5], [23.5, 12.5], [40.5, 11.5], [42.5, 12.5]];
const DEF_LOOK = [90, 0, 90, 90, 110];
const DEF_SPAWN: P[] = [[19, 2], [21, 2.5], [24, 2], [27, 2.5], [29, 2]];
const ATT_SPAWN: P[] = [[10, 28.5], [18, 29], [23.5, 28.5], [30, 29], [38, 28.5]];
const STAGE: Record<'A' | 'B', P[]> = {
  A: [[5, 19], [6.5, 20.5], [5.5, 22], [23.5, 17.5], [40.5, 22]],
  B: [[40, 19], [41.5, 20.5], [40.5, 22], [23.5, 17.5], [5.5, 22]],
};
const ENTRY: Record<'A' | 'B', P[]> = {
  A: [[6.5, 10.5], [11, 11.5], [12.5, 6.5], [15, 12], [4.5, 7]],
  B: [[40.5, 11], [39.5, 10.5], [35.5, 6.5], [31.5, 9.5], [43, 7]],
};
const PLANT: Record<'A' | 'B', P> = { A: [10.5, 10.5], B: [39.5, 10.5] };
const RETAKE_FROM: Record<'A' | 'B', P[]> = {
  A: [[9.5, 4.6], [14.5, 12], [9.5, 6]],
  B: [[36.2, 4.6], [31.5, 9.5], [36, 6]],
};
const SMOKE_SPOTS: Record<'A' | 'B', P[]> = { A: [[9.5, 5], [15.5, 11.5]], B: [[36.5, 5], [31.5, 9.5]] };

// ---------- helpers ----------
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export const fmtClock = fmt;

function kfPosAt(kfs: Kf[], t: number): P {
  if (t <= kfs[0].t) return [kfs[0].x, kfs[0].y];
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (t <= b.t) {
      const u = (t - a.t) / Math.max(0.001, b.t - a.t);
      return [a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u];
    }
  }
  const l = kfs[kfs.length - 1];
  return [l.x, l.y];
}

function transformKfs(m: MapDef, kfs: Kf[]): Kf[] {
  return kfs.map((k) => ({ t: k.t, x: mx(m, k.x), y: k.y, look: k.look === undefined ? undefined : mAngle(m, k.look) }));
}

function finishComms(lines: CommsLine[]): CommsLine[] {
  lines.sort((a, b) => a.t - b.t);
  const out: CommsLine[] = [];
  for (const l of lines) {
    const dur = Math.min(3.4, 0.7 + l.text.split(/\s+/).length * 0.26);
    let t = l.t;
    const prev = out[out.length - 1];
    if (prev && t < prev.t + prev.dur + 0.25) t = prev.t + prev.dur + 0.25;
    out.push({ ...l, t: Math.round(t * 10) / 10, dur });
  }
  return out;
}

// ---------- Round 17 on Foundry, authored in detail ----------
function foundryR17(base: Omit<Round, 'tracks' | 'events' | 'comms'>): Round {
  const id = base.id;
  const k = (t: number, x: number, y: number, look?: number): Kf => ({ t, x, y, look });
  const tracks: Track[] = [
    { player: 'Rook', team: 'LOW', deathT: 64, killer: 'Lumen', kfs: [k(0, 9, 6.5), k(6, 6, 11.5, 90), k(41, 6, 11.5, 90), k(44, 9.5, 4.6), k(52, 22, 2), k(60, 33, 2, 30), k(62.6, 35.5, 4.8, 70)] },
    { player: 'Vesper', team: 'LOW', kfs: [k(0, 12, 6), k(7, 15, 12, 0), k(41, 15, 12, 0), k(46, 21, 12), k(52, 27, 10.5), k(58, 29.5, 9.6, 0), k(61, 30, 9.6, 5), k(64, 27, 9.2, 0), k(96, 27, 9.2, 0)] },
    { player: 'Juno', team: 'LOW', deathT: 52, killer: 'Tess', kfs: [k(0, 41.5, 6.5, 120), k(6, 40.5, 11.5, 90), k(28, 40.5, 11.5, 90), k(33, 36, 2, 90), k(50.9, 36, 2, 90), k(51.7, 36.2, 4.8, 28)] },
    { player: 'Kael', team: 'LOW', deathT: 58, killer: 'Corvid', kfs: [k(0, 24, 7), k(6, 23.5, 12.5, 90), k(41, 23.5, 12.5, 90), k(47, 29, 9.5, 0), k(50, 30.2, 9.5, -17), k(54.6, 31.5, 9.8, 0), k(55.3, 31.5, 9.8, 180), k(57, 31.5, 9.8, 0)] },
    { player: 'Mara', team: 'LOW', deathT: 27, killer: 'Brask', kfs: [k(0, 40, 7), k(8, 40.5, 15.5, 90), k(27, 40.5, 15.5, 90)] },
    { player: 'Brask', team: 'HF', kfs: [k(0, 40.5, 28.5), k(18, 40.5, 20, -90), k(25, 40.5, 17.6, -90), k(28, 40.5, 17.6, -90), k(32, 40.5, 12, -90), k(40, 34, 6.5, 180), k(96, 34, 6.5, 180)] },
    { player: 'Lumen', team: 'HF', kfs: [k(0, 41.5, 29), k(20, 41.5, 19, -100), k(24, 41.5, 19, -100), k(34, 41.5, 13), k(40, 43, 11, -140), k(96, 43, 11, -140)] },
    { player: 'Corvid', team: 'HF', deathT: 61, killer: 'Vesper', kfs: [k(0, 39.5, 28), k(20, 39.5, 19), k(36, 40, 13), k(40, 39.5, 10.5, 180), k(44, 39.5, 10.5, 180), k(48, 35, 10.5, 180), k(55, 33, 10, 180), k(58, 33, 9.6, 180)] },
    { player: 'Tess', team: 'HF', kfs: [k(0, 38.5, 28), k(20, 40, 20), k(36, 40, 13), k(44, 39.5, 6.5, -154), k(53, 39.5, 6.5, -154), k(70, 36, 9, 180), k(96, 36, 9, 180)] },
    { player: 'Nyx', team: 'HF', deathT: 56, killer: 'Kael', kfs: [k(0, 23.5, 28.5), k(18, 23.5, 22), k(40, 22, 15, -80), k(52, 27.5, 11, -10), k(55, 28.6, 10, 0)] },
  ];
  const m = MAPS.foundry;
  const ar = (x: number, y: number) => areaAt(m, x, y);
  let n = 0;
  const ev = (e: Omit<GameEvent, 'id' | 'roundId'>): GameEvent => ({ ...e, id: `${id}-e${n++}`, roundId: id });
  const events: GameEvent[] = [
    ev({ t: 11.4, type: 'ability', actor: 'Mara', team: 'LOW', ability: 'Tripwire', abilityKind: 'trip', target: [40.5, 18.5], area: 'B Lane' }),
    ev({ t: 22.1, type: 'ability', actor: 'Lumen', team: 'HF', ability: 'Veil', abilityKind: 'smoke', target: [36.5, 5.0], popT: 23.0, area: 'Kiln Door' }),
    ev({ t: 23.2, type: 'ability', actor: 'Lumen', team: 'HF', ability: 'Veil', abilityKind: 'smoke', target: [31.6, 9.5], popT: 24.2, area: 'Catwalk' }),
    ev({ t: 25.3, type: 'ability', actor: 'Brask', team: 'HF', ability: 'Flare', abilityKind: 'flash', target: [40.5, 16.6], popT: 26.0, area: 'B Lane' }),
    ev({ t: 27.0, type: 'kill', actor: 'Brask', team: 'HF', victim: 'Mara', weapon: 'Halberd AR', headshot: false, area: ar(40.5, 15.5) }),
    ev({ t: 44.0, type: 'plant', actor: 'Corvid', team: 'HF', target: [39.5, 10.5], area: 'B Site' }),
    ev({ t: 50.0, type: 'ability', actor: 'Kael', team: 'LOW', ability: 'Flare', abilityKind: 'flash', target: [38.4, 6.9], popT: 53.0, area: 'B Site' }),
    ev({ t: 52.0, type: 'kill', actor: 'Tess', team: 'HF', victim: 'Juno', weapon: 'Halberd AR', headshot: true, area: 'Kiln Door' }),
    ev({ t: 54.4, type: 'ability', actor: 'Vesper', team: 'LOW', ability: 'Recon Pulse', abilityKind: 'recon', target: [36, 9], area: 'B Site' }),
    ev({ t: 56.0, type: 'kill', actor: 'Kael', team: 'LOW', victim: 'Nyx', weapon: 'Lancet SMG', headshot: false, area: 'Catwalk' }),
    ev({ t: 58.0, type: 'kill', actor: 'Corvid', team: 'HF', victim: 'Kael', weapon: 'Halberd AR', headshot: true, area: 'B Site' }),
    ev({ t: 61.0, type: 'kill', actor: 'Vesper', team: 'LOW', victim: 'Corvid', weapon: 'Halberd AR', headshot: true, area: 'B Site' }),
    ev({ t: 64.0, type: 'kill', actor: 'Lumen', team: 'HF', victim: 'Rook', weapon: 'Halberd AR', headshot: false, area: 'Kiln Door' }),
  ];
  const c = (t: number, speaker: PlayerName, text: string): CommsLine => ({ t, speaker, text, dur: 0 });
  const comms = finishComms([
    c(2.6, 'Rook', 'Same setup. Mara Juno B, Kael mid, Vesper with me A.'),
    c(10.8, 'Mara', "Trip's down in Lane."),
    c(18.4, 'Kael', "Mid's quiet. Nobody Conveyor."),
    c(22.4, 'Juno', 'Smokes B — two. Kiln Door and Cat.'),
    c(25.2, 'Mara', "Flare Lane, they're coming—"),
    c(27.6, 'Mara', "Dead. Brask, he's low, like forty."),
    c(29.3, 'Juno', "Falling back Kiln. I see four. Four B."),
    c(33.2, 'Juno', "They're on site. I need people."),
    c(36.1, 'Kael', 'Rook, do we go?'),
    c(38.4, 'Vesper', "A's empty. Nothing here."),
    c(41.0, 'Rook', 'Okay rotate. Rotate B, everyone B.'),
    c(44.2, 'Juno', "They're planting default box. Planted."),
    c(47.0, 'Kael', "I've got flare for Kiln, wait for it."),
    c(50.0, 'Kael', 'Flaring now—'),
    c(52.4, 'Juno', 'Ah — Tess back site. Sorry.'),
    c(55.0, 'Kael', 'One from Cat—'),
    c(56.6, 'Kael', "Got Nyx — I'm hit, I'm—"),
    c(61.4, 'Vesper', 'Corvid dead. Two left.'),
    c(64.6, 'Rook', "I'm dead. Lumen, default box."),
    c(68.0, 'Vesper', 'Not enough time. Saving.'),
    c(72.5, 'Rook', 'Save, save. Good save.'),
    c(86.2, 'Rook', 'Reset. We talk retakes after.'),
  ]);
  return { ...base, tracks, events, comms, plantT: 44, endT: 84, duration: 96, target: 'B' };
}

// ---------- generic round generator ----------
interface GenOpts { forcePlant?: boolean }

function genRound(r: Rng, m: MapDef, base: Omit<Round, 'tracks' | 'events' | 'comms'>, opts: GenOpts): Round {
  const id = base.id;
  const lowAtt = base.side === 'att';
  const attTeam: Team = lowAtt ? 'LOW' : 'HF';
  const defTeam: Team = lowAtt ? 'HF' : 'LOW';
  const attNames: AnyPlayer[] = lowAtt ? shuffle(r, PLAYERS) : shuffle(r, ENEMIES);
  // defenders keep roles so Juno/Mara are always B, Rook/Vesper A-ish
  const defNames: AnyPlayer[] = lowAtt ? ['Corvid', 'Lumen', 'Nyx', 'Tess', 'Brask'] : ['Rook', 'Vesper', 'Kael', 'Juno', 'Mara'];
  const site: 'A' | 'B' = r() < 0.55 ? 'B' : 'A';
  const other: 'A' | 'B' = site === 'A' ? 'B' : 'A';
  const execT = irange(r, 46, 62);
  const attWon = (base.won && lowAtt) || (!base.won && !lowAtt);
  const winner: Team = base.won ? 'LOW' : 'HF';

  // ----- outcome planning -----
  let plantT: number | undefined;
  let defuseT: number | undefined;
  let endT = 100;
  let objDetail: Round['objDetail'];
  let attDeaths = 0, defDeaths = 0;
  if (base.end === 'elim') {
    if (attWon) { defDeaths = 5; attDeaths = irange(r, 0, 1) + (r() < 0.3 ? 1 : 0); if (opts.forcePlant || r() < 0.5) plantT = execT + irange(r, 6, 11); }
    else { attDeaths = 5; defDeaths = irange(r, 0, 1) + (r() < 0.3 ? 1 : 0); }
  } else if (base.end === 'obj') {
    plantT = execT + irange(r, 5, 10);
    if (attWon) { objDetail = 'detonated'; defDeaths = irange(r, 1, 2) + (r() < 0.3 ? 1 : 0); attDeaths = irange(r, 0, 1); endT = plantT + 40; }
    else { objDetail = 'defused'; attDeaths = irange(r, 2, 4); defDeaths = irange(r, 0, 1); defuseT = plantT + irange(r, 22, 32); endT = defuseT; }
  } else {
    attDeaths = irange(r, 0, 2); defDeaths = irange(r, 0, 1); endT = 100;
  }

  // kill timeline
  const total = attDeaths + defDeaths;
  const victims: { team: Team }[] = [];
  const pool = [...Array(attDeaths).fill(attTeam), ...Array(defDeaths).fill(defTeam)] as Team[];
  // opening duel goes to the winner more often
  const order = shuffle(r, pool);
  if (order.length > 1 && r() < 0.6) {
    const loserTeam: Team = winner === 'LOW' ? 'HF' : 'LOW';
    const idx = order.indexOf(loserTeam);
    if (idx > 0) [order[0], order[idx]] = [order[idx], order[0]];
  }
  for (const tm of order) victims.push({ team: tm });
  const killTimes: number[] = [];
  let t = execT - irange(r, 2, 9);
  for (let i = 0; i < total; i++) {
    killTimes.push(Math.round(t * 10) / 10);
    t += range(r, 2.2, plantT && t > plantT ? 9 : 7);
  }
  if (base.end === 'elim') endT = killTimes[killTimes.length - 1] ?? endT;
  if (plantT && base.end !== 'elim') {
    // keep kills inside the round
    const lim = (defuseT ?? endT) - 1;
    for (let i = 0; i < killTimes.length; i++) if (killTimes[i] > lim) killTimes[i] = Math.round((lim - (killTimes.length - i) * 1.3) * 10) / 10;
  }
  if (plantT && base.end === 'elim' && plantT > endT - 1) plantT = Math.max(execT + 3, endT - 4);

  // assign victims in role order: defenders on target site die first, attackers' entry first
  const defOrder: AnyPlayer[] = site === 'B' ? [defNames[3], defNames[4], defNames[2], defNames[1], defNames[0]] : [defNames[0], defNames[1], defNames[2], defNames[4], defNames[3]];
  const attOrder: AnyPlayer[] = [attNames[0], attNames[1], attNames[3], attNames[2], attNames[4]];
  const deadAt = new Map<AnyPlayer, number>();
  const killerOf = new Map<AnyPlayer, AnyPlayer>();
  const kills: { t: number; killer: AnyPlayer; victim: AnyPlayer }[] = [];
  let ai = 0, di = 0;
  for (let i = 0; i < victims.length; i++) {
    const tm = victims[i].team;
    const victim = tm === attTeam ? attOrder[ai++] : defOrder[di++];
    const kt = killTimes[i];
    const killersPool = (tm === attTeam ? defNames : attNames).filter((p) => !deadAt.has(p));
    if (!killersPool.length) continue;
    const killer = tm === attTeam ? (killersPool.find((p) => defOrder.indexOf(p) <= 2) ?? killersPool[0]) : pick(r, killersPool.slice(0, 3));
    deadAt.set(victim, kt);
    killerOf.set(victim, killer);
    kills.push({ t: kt, killer, victim });
  }

  // ----- tracks -----
  const kfsOf = new Map<AnyPlayer, Kf[]>();
  // defenders
  defNames.forEach((p, i) => {
    const [sx, sy] = DEF_SPAWN[i];
    const [hx, hy] = DEF_SETUP[i];
    const setupT = irange(r, 6, 10);
    const ks: Kf[] = [{ t: 0, x: sx, y: sy }, { t: setupT, x: hx, y: hy, look: DEF_LOOK[i] }];
    const onSite = site === 'B' ? i >= 3 : i <= 1;
    const rotT = execT + irange(r, 3, 11);
    if (!onSite) {
      ks.push({ t: rotT, x: hx, y: hy, look: DEF_LOOK[i] });
      const rf = RETAKE_FROM[site];
      const via = i === 2 ? rf[1] : rf[0];
      ks.push({ t: rotT + 12, x: via[0], y: via[1], look: site === 'B' ? 80 : 100 });
      if (plantT) {
        ks.push({ t: Math.max(rotT + 14, plantT + 6), x: via[0], y: via[1], look: 90 });
        ks.push({ t: Math.max(rotT + 18, plantT + 11), x: rf[2][0] + range(r, -1, 1), y: rf[2][1] + range(r, 0, 2), look: 90 });
      }
    } else {
      const back: P = site === 'B' ? [36 + range(r, -1, 2), 2] : [9 + range(r, -1, 2), 2];
      ks.push({ t: execT + 1, x: hx, y: hy, look: DEF_LOOK[i] });
      ks.push({ t: execT + 6, x: back[0], y: back[1], look: 90 });
      if (plantT) ks.push({ t: plantT + 9, x: back[0], y: back[1], look: 90 }, { t: plantT + 12, x: RETAKE_FROM[site][0][0], y: RETAKE_FROM[site][0][1] + 1.5, look: 80 });
    }
    kfsOf.set(p, ks);
  });
  // attackers
  attNames.forEach((p, i) => {
    const [sx, sy] = ATT_SPAWN[i];
    const [gx, gy] = STAGE[site][i];
    const stageT = irange(r, 17, 26);
    const ks: Kf[] = [{ t: 0, x: sx, y: sy }, { t: stageT, x: gx, y: gy, look: -90 }, { t: execT, x: gx, y: gy, look: -90 }];
    const [ex, ey] = ENTRY[site][i];
    if (i === 4) {
      ks.push({ t: execT + 14, x: gx, y: gy - 4, look: -90 });
    } else {
      ks.push({ t: execT + 6, x: ex, y: ey, look: site === 'B' ? -150 : -40 });
    }
    if (plantT && i === 1) {
      const [px, py] = PLANT[site];
      ks.push({ t: plantT - 4, x: px, y: py, look: 180 }, { t: plantT, x: px, y: py, look: 180 });
      ks.push({ t: plantT + 4, x: px + (site === 'B' ? 3 : -3), y: py + 1, look: -90 });
    }
    kfsOf.set(p, ks);
  });
  void other;

  const tracks: Track[] = [...PLAYERS, ...ENEMIES].map((p) => {
    const kfs = (kfsOf.get(p) ?? []).filter((k) => deadAt.get(p) === undefined || k.t <= deadAt.get(p)!);
    return { player: p, team: teamOf(p), kfs: transformKfs(m, kfs), deathT: deadAt.get(p), killer: killerOf.get(p) };
  });

  // ----- events -----
  let en = 0;
  const events: GameEvent[] = [];
  const posAt = (p: AnyPlayer, tt: number) => kfPosAt(tracks.find((x) => x.player === p)!.kfs, tt);
  const area = (p: AnyPlayer, tt: number) => { const [x, y] = posAt(p, tt); return areaAt(m, x, y); };
  for (const k of kills) {
    events.push({
      id: `${id}-e${en++}`, roundId: id, t: k.t, type: 'kill', actor: k.killer, team: teamOf(k.killer), victim: k.victim,
      weapon: pick(r, WEAPONS), headshot: r() < 0.36, area: area(k.victim, k.t),
    });
  }
  // abilities (sparse: the detector only reliably catches executes and retake util)
  const abil: { p: AnyPlayer; t: number; tgt: P }[] = [];
  if (r() < 0.3) {
    const smoker = attTeam === 'HF' ? 'Lumen' : 'Rook';
    if (!deadAt.has(smoker) || deadAt.get(smoker)! > execT) abil.push({ p: smoker, t: execT - 2.5, tgt: pick(r, SMOKE_SPOTS[site]) });
  }
  if (plantT && r() < 0.25) {
    const flasher: AnyPlayer = defTeam === 'LOW' ? 'Kael' : 'Brask';
    const ft = plantT + 10;
    if (!deadAt.has(flasher) || deadAt.get(flasher)! > ft) abil.push({ p: flasher, t: ft, tgt: [PLANT[site][0] - 1, PLANT[site][1] - 3] });
  }
  for (const a of abil) {
    const info = ABIL[a.p];
    const tg: P = [mx(m, a.tgt[0]), a.tgt[1]];
    events.push({
      id: `${id}-e${en++}`, roundId: id, t: a.t, type: 'ability', actor: a.p, team: teamOf(a.p), ability: info.name, abilityKind: info.kind,
      target: tg, popT: a.t + (info.kind === 'flash' ? 2.4 : 0.9), area: areaAt(m, tg[0], tg[1]),
    });
  }
  const planter = attNames[1];
  if (plantT && (!deadAt.has(planter) || deadAt.get(planter)! >= plantT)) {
    const [px, py] = PLANT[site];
    events.push({ id: `${id}-e${en++}`, roundId: id, t: plantT, type: 'plant', actor: planter, team: attTeam, target: [mx(m, px), py], area: `${site} Site` });
  } else if (plantT) {
    const alt = attNames.find((p) => !deadAt.has(p) || deadAt.get(p)! > plantT!) ?? planter;
    const [px, py] = PLANT[site];
    events.push({ id: `${id}-e${en++}`, roundId: id, t: plantT, type: 'plant', actor: alt, team: attTeam, target: [mx(m, px), py], area: `${site} Site` });
  }
  if (defuseT) {
    const defuser = defNames.find((p) => !deadAt.has(p)) ?? defNames[0];
    const [px, py] = PLANT[site];
    events.push({ id: `${id}-e${en++}`, roundId: id, t: defuseT, type: 'defuse', actor: defuser, team: defTeam, target: [mx(m, px), py], area: `${site} Site` });
  }
  events.sort((a, b) => a.t - b.t);

  // ----- comms -----
  const L: CommsLine[] = [];
  const say = (tt: number, s: PlayerName, text: string) => { if (tt < endT + 8 && (!deadAt.has(s) || tt < deadAt.get(s)! + 3)) L.push({ t: tt, speaker: s, text, dur: 0 }); };
  const siteWord = site;
  const laneName = site === 'B' ? m.names.bLane : m.names.aMain;
  const alive = (p: PlayerName, tt: number) => !deadAt.has(p) || deadAt.get(p)! > tt;
  if (!lowAtt) {
    say(irange(r, 2, 4), 'Rook', pick(r, [
      'Same setup. Mara Juno B, Kael mid, Vesper with me A.',
      "Default. Play for info, don't peek early.",
      'Default hold. Rotate on my call only.',
      'Kael play deeper mid this one. Rest default.',
    ]));
    const holder: PlayerName = site === 'B' ? 'Juno' : 'Rook';
    say(execT - 7, holder, `${pick(r, ['Three', 'Four', 'Heavy'])} ${laneName}, they're grouping.`);
    if (r() < 0.6) say(execT - 1.5, site === 'B' ? 'Mara' : 'Vesper', `Util ${laneName}, they're coming.`);
    const rotT = execT + irange(r, 3, 11);
    if (alive('Rook', rotT)) say(rotT, 'Rook', `Rotate ${siteWord}. Everyone ${siteWord}.`);
    else say(rotT, 'Kael', `Rotating ${siteWord}, go go.`);
  } else {
    say(irange(r, 2, 4), 'Rook', pick(r, [
      `Default, then hit ${siteWord} on my call.`,
      `Fast ${siteWord}. Kael flare me in.`,
      `Slow ${siteWord}. Mara lurk ${site === 'B' ? m.names.aMain : m.names.bLane}.`,
      `Take mid control, then ${siteWord}.`,
    ]));
    say(execT - 4, alive('Rook', execT - 4) ? 'Rook' : 'Vesper', `Go go, ${siteWord} now.`);
  }
  for (const k of kills) {
    if (teamOf(k.victim) === 'LOW') {
      say(k.t + 0.4, k.victim as PlayerName, pick(r, [`Dead. ${k.killer}, ${area(k.victim, k.t)}.`, `I'm down — ${k.killer} ${area(k.victim, k.t)}.`, `${k.killer} got me. ${area(k.victim, k.t)}.`]));
    } else if (teamOf(k.killer) === 'LOW') {
      say(k.t + 0.5, k.killer as PlayerName, pick(r, [`Got ${k.victim}.`, `${k.victim} down.`, `One down, ${k.victim}.`, `Traded. ${k.victim}.`]));
    }
  }
  if (plantT) {
    const sp = PLAYERS.find((p) => alive(p, plantT! + 1));
    if (sp) say(plantT + 1, sp, lowAtt ? 'Planted. Play crossfire, nobody chase.' : `Planted ${siteWord}, default spot.`);
  }
  if (defuseT && !lowAtt) {
    const d = PLAYERS.find((p) => alive(p, defuseT!));
    if (d) { say(defuseT - 7, d, "Tapping. Cover me."); say(defuseT + 0.4, d, 'Defused!'); }
  }
  if (base.end === 'time' && !lowAtt) say(endT - 6, 'Rook', 'Hold. Clock wins this, just hold.');
  say(endT + 1.5, 'Rook', base.won ? pick(r, ['Nice. Nice round, reset.', 'Good. Same again.', 'That works. Reset.']) : pick(r, ['Reset. Talk after.', 'Next. Shake it off.', 'Okay. Reset, buy full.']));

  return {
    ...base, target: site, plantT, endT: Math.round(endT * 10) / 10, objDetail: base.objDetail ?? objDetail,
    duration: Math.min(112, Math.max(84, Math.round(endT + irange(r, 8, 12)))), tracks, events, comms: finishComms(L),
  };
}

// ---------- build the scrim ----------
function buildRounds(): Round[] {
  const out: Round[] = [];
  for (const mr of MAP_RESULTS) {
    const m = MAPS[mr.id];
    const r = mulberry32(mr.order * 7919 + 17);
    let us = 0, them = 0;
    const counted = mr.seq.length;
    const ends: EndType[] = mr.id === 'foundry' ? FOUNDRY_END : [];
    for (let i = 0; i < counted + mr.extras.length; i++) {
      const extra = i >= counted;
      const n = i + 1;
      const side: Side = extra ? mr.extras[i - counted].side : (i < 12 ? mr.firstSide : mr.firstSide === 'att' ? 'def' : 'att');
      const won = extra ? mr.extras[i - counted].won : mr.seq[i] === 'W';
      const lowAtt = side === 'att';
      const attWon = won === lowAtt;
      let end: EndType;
      if (ends[i]) end = ends[i];
      else {
        const x = r();
        end = attWon ? (x < 0.55 ? 'obj' : 'elim') : x < 0.5 ? 'elim' : x < 0.8 ? 'obj' : 'time';
      }
      const before: [number, number] = [us, them];
      if (!extra) { if (won) us++; else them++; }
      const id = `${mr.id}-r${n}`;
      const base = {
        id, map: mr.id, n, side, won, end, extra, duration: 100, endT: 100, target: 'B' as const,
        scoreBefore: before, scoreAfter: [us, them] as [number, number], retake: false,
        objDetail: end === 'obj' ? (attWon ? 'detonated' : 'defused') as Round['objDetail'] : undefined,
      };
      const rr = mulberry32(mr.order * 1000 + n * 31 + 5);
      let round: Round;
      if (mr.id === 'foundry' && n === 17) round = foundryR17(base);
      else round = genRound(rr, m, base, { forcePlant: mr.id === 'foundry' && n === 16 });
      round.retake = side === 'def' && !won && round.plantT !== undefined;
      out.push(round);
    }
  }
  return out;
}

export const ROUNDS: Round[] = buildRounds();
export const ROUND_BY_ID: Record<string, Round> = Object.fromEntries(ROUNDS.map((r) => [r.id, r]));
export const roundsOf = (map: MapId) => ROUNDS.filter((r) => r.map === map);
export const ALL_EVENTS = ROUNDS.flatMap((r) => r.events);
