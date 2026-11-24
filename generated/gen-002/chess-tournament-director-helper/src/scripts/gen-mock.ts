// Generates src/data/mock.ts by running the real pairing engine on a plausible history
// for the November Junior Swiss. Run with:
//   npx esbuild scripts/gen-mock.ts --bundle --platform=node --format=esm --outfile=.tmp/gen-mock.mjs
//   node .tmp/gen-mock.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePairings, computeStandings, pointsThrough, isActiveInRound } from '../src/lib/swiss';
import type { EventState, Game, Player, Result } from '../src/lib/types';

const here = dirname(fileURLToPath(import.meta.url));

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

// 34 rated players who were on the registration list (410–1620).
const RATINGS = [
  410, 455, 480, 512, 530, 560, 590, 615, 640, 668, 700, 725, 752, 818, 845, 870, 902, 930, 961, 995,
  1030, 1058, 1090, 1120, 1155, 1188, 1222, 1260, 1305, 1350, 1410, 1480, 1550, 1620,
];

// Names for everyone except the three players the director is dealing with.
const OTHER_NAMES = [
  'Ana Reyes', 'Caleb Mwangi', 'Dmitri Volkov', 'Eli Hartmann', 'Fatima Rahman', 'Gabriel Costa',
  'Hana Kobayashi', 'Jasmine Ortiz', 'Kofi Asante', 'Lucas Brennan', 'Maya Iyer', 'Nathan Cho',
  'Olivia Pruitt', 'Rafael Duarte', 'Sienna Walsh', 'Tomás Herrera', 'Ulla Nyström', 'Victor Adeyemi',
  'Wren Callahan', 'Xavier Dubois', 'Yusuf Demir', 'Zoe Petrakis', 'Arjun Sethi', 'Beatriz Monteiro',
  'Cyrus Taheri', 'Grace Park', 'Hugo Lefèvre', 'Imani Forde', 'Jonah Kessler', 'Keiko Sato',
  'Leo Vasquez',
];
const SPECIAL = { okafor: 'Emeka Okafor', lindqvist: 'Anders Lindqvist', priya: 'Priya Nand' };

function ages(r: () => number, n: number): number[] {
  return Array.from({ length: n }, () => 7 + Math.floor(r() * 8)); // 7..14
}

function makeState(players: Player[], games: Game[]): EventState {
  return {
    name: 'November Junior Swiss',
    totalRounds: 5,
    players,
    games,
    credits: [],
    postedRounds: [1, 2],
    log: [],
  };
}

function basePlayers(): Player[] {
  return RATINGS.map((rating, i) => ({
    id: `p${String(i + 1).padStart(2, '0')}`,
    name: `P${i + 1}`,
    age: 0,
    rating,
    status: 'playing' as const,
    joinedRound: 1,
    withdrawnFromRound: null,
  }));
}

/** Plays out `round` using the engine pairings and random results weighted by rating. */
function playRound(
  state: EventState,
  round: number,
  r: () => number,
  forced?: (boardNo: number, white: Player, black: Player) => Result | undefined,
): Game[] | null {
  const preview = generatePairings(state, round);
  if (preview.bye || preview.problems.length || preview.repeatForced) return null;
  return preview.boards.map((b) => {
    const white = state.players.find((p) => p.id === b.white)!;
    const black = state.players.find((p) => p.id === b.black)!;
    let result: Result | undefined = forced?.(b.board, white, black);
    if (!result) {
      const diff = white.rating - black.rating;
      const pw = 1 / (1 + Math.pow(10, -diff / 400));
      const roll = r();
      if (roll < 0.2) result = '1/2';
      else result = r() < pw * 0.8 + 0.1 ? '1-0' : '0-1';
    }
    return {
      id: `g-r${round}-b${String(b.board).padStart(2, '0')}`,
      round,
      board: b.board,
      white: white.id,
      black: black.id,
      result,
    };
  });
}

function countsOk(state: EventState): boolean {
  const pts = state.players.map((p) => pointsThrough(state, p.id, 2));
  const twos = pts.filter((x) => x === 2).length;
  const mid = pts.filter((x) => x === 1 || x === 1.5).length;
  const low = pts.filter((x) => x === 0 || x === 0.5).length;
  return twos === 8 && mid === 16 && low === 10;
}

function main() {
  const out = resolve(here, '..', 'src', 'data', 'mock.ts');
  for (let seed = 1; seed < 2_000_000; seed++) {
    const r = rng(seed);
    // Round 1: fresh pairing by rating, random results.
    const base = basePlayers();
    const s0 = makeState(base, []);
    const g1 = playRound(s0, 1, r);
    if (!g1) continue;
    const s1 = makeState(base, g1);

    // Round 2: board 6 is the disputed draw, so it is forced to ½–½ on the record.
    const g2 = playRound(s1, 2, r, (board) => (board === 6 ? '1/2' : undefined));
    if (!g2) continue;
    const s2 = makeState(base, [...g1, ...g2]);
    if (!countsOk(s2)) continue;

    const board6 = g2.find((g) => g.board === 6)!;
    const okaforId = board6.white;
    const lindqvistId = board6.black;

    // Priya: exactly one win and one loss across rounds 1–2, on 1 point.
    const candidates = base.filter((p) => {
      if (p.id === okaforId || p.id === lindqvistId) return false;
      if (pointsThrough(s2, p.id, 2) !== 1) return false;
      const mine = [...g1, ...g2].filter((g) => g.white === p.id || g.black === p.id);
      const outcomes = mine.map((g) => {
        const w = g.white === p.id;
        if (g.result === '1/2') return 'D';
        return (g.result === '1-0') === w ? 'W' : 'L';
      });
      return outcomes.filter((o) => o === 'W').length === 1 && outcomes.filter((o) => o === 'L').length === 1;
    });
    if (candidates.length === 0) continue;
    const priyaId = candidates[Math.floor(r() * candidates.length)].id;

    // Post-correction checks: board 6 becomes 0–1 (Lindqvist, black, won).
    const corrected = [...g1, ...g2].map((g) =>
      g.id === board6.id ? { ...g, result: '0-1' as Result } : g,
    );
    const sCorr = makeState(base, corrected);

    // Round 3 with Priya withdrawn and Theo joining (34 active players).
    const theoPlayer: Player = {
      id: 'p35',
      name: 'Theo Brandt',
      age: 9,
      rating: 780,
      status: 'waiting',
      joinedRound: null,
      withdrawnFromRound: null,
    };
    const roster3 = [...sCorr.players.map((p) => (p.id === priyaId ? { ...p, withdrawnFromRound: 3 } : p)), { ...theoPlayer, status: 'playing' as const, joinedRound: 3 }];
    const s3 = { ...sCorr, players: roster3, games: sCorr.games };
    const active3 = s3.players.filter((p) => isActiveInRound(p, 3));
    if (active3.length !== 34) continue;
    const pre3 = generatePairings(s3, 3);
    if (pre3.problems.length || pre3.repeatForced || pre3.bye || pre3.boards.length !== 17) continue;

    // Assign real names to the specific slots.
    const names = [...OTHER_NAMES];
    const ageList = ages(r, 34);
    const shuffled = names.map((n) => [r(), n] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    let k = 0;
    const named: Player[] = base.map((p, i) => {
      let name: string;
      if (p.id === okaforId) name = SPECIAL.okafor;
      else if (p.id === lindqvistId) name = SPECIAL.lindqvist;
      else if (p.id === priyaId) name = SPECIAL.priya;
      else name = shuffled[k++];
      return { ...p, name, age: ageList[i] };
    });
    if (k !== shuffled.length) throw new Error('name count mismatch');

    const nameOf = new Map(named.map((p) => [p.id, p.name]));
    const finalPlayers: Player[] = named.map((p) => {
      if (p.id === priyaId) return { ...p, note: 'Unwell; left the hall early after round 2.', leftEarly: true };
      return p;
    });
    // Theo is on the waiting list.
    finalPlayers.push({
      ...theoPlayer,
      status: 'waiting',
      joinedRound: null,
      arrivedAt: '11:20',
      note: 'Arrived 11:20 with a parent. Rating 780 from the club list.',
    });

    const allGames = [...g1, ...g2].map((g) => {
      const base2: Game = { ...g };
      if (g.id === board6.id) {
        base2.dispute = { reportedResult: '0-1', reportedBy: 'Both players', resolved: false };
      }
      return base2;
    });

    const priyaName = nameOf.get(priyaId);
    const state: EventState = {
      name: 'November Junior Swiss',
      totalRounds: 5,
      players: finalPlayers,
      games: allGames,
      credits: [],
      postedRounds: [1, 2],
      log: [
        { time: '10:00', text: 'Event opened: November Junior Swiss, 5 rounds, G/25+5, club-rated.' },
        { time: '10:14', text: 'Round 1 posted and played. 17 of 17 results entered.' },
        { time: '10:58', text: 'Round 2 posted and played. 17 of 17 results entered.' },
        { time: '11:20', text: 'Theo Brandt arrived and asked to join. Not yet added.' },
        { time: '11:31', text: `${priyaName} left unwell after round 2. Not yet withdrawn.` },
        { time: '11:34', text: 'Board 6 (round 2) recorded as ½–½. Players say black won. Not yet checked.' },
      ],
    };

    // Sanity: standings after round 2 with the recorded result.
    const rows = computeStandings(state, 2);
    const summary = {
      seed,
      twos: rows.filter((x) => x.points === 2).length,
      mid: rows.filter((x) => x.points === 1 || x.points === 1.5).length,
      low: rows.filter((x) => x.points === 0 || x.points === 0.5).length,
      okafor: nameOf.get(okaforId),
      lindqvist: nameOf.get(lindqvistId),
      priya: priyaName,
      round3Boards: pre3.boards.length,
    };
    console.log(JSON.stringify(summary));

    mkdirSync(dirname(out), { recursive: true });
    const body =
      `// GENERATED by scripts/gen-mock.ts from the pairing engine. Do not edit by hand.\n` +
      `// Seed ${seed}. Used only as the starting state of the demo event.\n` +
      `import type { EventState } from '../lib/types';\n\n` +
      `export const initialEvent: EventState = ${JSON.stringify(state, null, 2)};\n`;
    writeFileSync(out, body);
    console.log(`wrote ${out}`);
    return;
  }
  throw new Error('no seed matched');
}

main();
