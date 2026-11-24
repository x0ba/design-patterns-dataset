import type { Board, EventState, Game, PairingPreview, Player, Result } from './types';

/* ------------------------------------------------------------------ *
 * Basic queries
 * ------------------------------------------------------------------ */

export function playerById(state: EventState, id: string): Player {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown player ${id}`);
  return p;
}

/** Eligible to be paired in `round`. */
export function isActiveInRound(p: Player, round: number): boolean {
  if (p.status !== 'playing') return false;
  if (p.joinedRound === null || p.joinedRound > round) return false;
  if (p.withdrawnFromRound !== null && round >= p.withdrawnFromRound) return false;
  return true;
}

/** Points from games and credits in rounds 1..throughRound. */
export function pointsThrough(state: EventState, playerId: string, throughRound: number): number {
  let total = 0;
  for (const g of state.games) {
    if (g.round > throughRound || g.result === null) continue;
    if (g.white === playerId) total += whitePoints(g.result);
    else if (g.black === playerId) total += 1 - whitePoints(g.result);
  }
  for (const c of state.credits) {
    if (c.playerId === playerId && c.round <= throughRound) total += c.points;
  }
  return total;
}

export function whitePoints(r: Result): number {
  return r === '1-0' ? 1 : r === '0-1' ? 0 : 0.5;
}

export function resultLabel(r: Result | null): string {
  if (r === null) return '—';
  return r === '1-0' ? '1–0' : r === '0-1' ? '0–1' : '½–½';
}

/** Games in which `playerId` took part through `throughRound` (played games only). */
function playedGames(state: EventState, playerId: string, throughRound: number): Game[] {
  return state.games.filter(
    (g) => g.round <= throughRound && g.result !== null && (g.white === playerId || g.black === playerId),
  );
}

/* ------------------------------------------------------------------ *
 * Standings and tiebreaks
 * ------------------------------------------------------------------ */

export interface StandingRow {
  playerId: string;
  rank: number;
  /** True when another player is level on points and both tiebreaks. */
  tied: boolean;
  points: number;
  buchholzCut1: number;
  sonnebornBerger: number;
  gamesPlayed: number;
  byes: number;
}

export function computeStandings(state: EventState, throughRound: number): StandingRow[] {
  const pts = new Map<string, number>();
  for (const p of state.players) pts.set(p.id, pointsThrough(state, p.id, throughRound));

  const rows: StandingRow[] = state.players
    .filter((p) => p.joinedRound !== null && p.status !== 'declined')
    .map((p) => {
      const games = playedGames(state, p.id, throughRound);
      const oppScores: number[] = [];
      let sb = 0;
      for (const g of games) {
        const isWhite = g.white === p.id;
        const oppId = isWhite ? g.black : g.white;
        const oppScore = pts.get(oppId) ?? 0;
        oppScores.push(oppScore);
        const myPts = isWhite ? whitePoints(g.result!) : 1 - whitePoints(g.result!);
        if (myPts === 1) sb += oppScore;
        else if (myPts === 0.5) sb += oppScore / 2;
      }
      // Buchholz Cut-1: sum of opponents' scores minus the lowest one.
      const buchholz =
        oppScores.length === 0 ? 0 : oppScores.reduce((a, b) => a + b, 0) - Math.min(...oppScores);
      const byes = state.credits.filter(
        (c) => c.playerId === p.id && c.kind === 'bye' && c.round <= throughRound,
      ).length;
      return {
        playerId: p.id,
        rank: 0,
        tied: false,
        points: pts.get(p.id) ?? 0,
        buchholzCut1: buchholz,
        sonnebornBerger: sb,
        gamesPlayed: games.length,
        byes,
      };
    });

  // Order for display only: the name sort does not decide places, it just keeps the list steady.
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholzCut1 !== a.buchholzCut1) return b.buchholzCut1 - a.buchholzCut1;
    if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
    const pa = playerById(state, a.playerId);
    const pb = playerById(state, b.playerId);
    return pa.name.localeCompare(pb.name);
  });

  // Players level on every tiebreak share a place (for example "=1"); the club has no further tiebreak.
  const level = (a: StandingRow, b: StandingRow) =>
    a.points === b.points && a.buchholzCut1 === b.buchholzCut1 && a.sonnebornBerger === b.sonnebornBerger;
  rows.forEach((r, i) => {
    r.rank = i > 0 && level(r, rows[i - 1]) ? rows[i - 1].rank : i + 1;
  });
  rows.forEach((r, i) => {
    r.tied = (i > 0 && level(r, rows[i - 1])) || (i < rows.length - 1 && level(r, rows[i + 1]));
  });
  return rows;
}

/** "3" for a sole place, "=3" when the place is shared. */
export function placeLabel(r: { rank: number; tied: boolean }): string {
  return r.tied ? `=${r.rank}` : String(r.rank);
}

/* ------------------------------------------------------------------ *
 * Colour history
 * ------------------------------------------------------------------ */

interface ColourHistory {
  whites: number;
  blacks: number;
  /** Most recent last. */
  colours: ('W' | 'B')[];
}

function colourHistory(state: EventState, playerId: string, beforeRound: number): ColourHistory {
  const hist: ColourHistory = { whites: 0, blacks: 0, colours: [] };
  const games = state.games
    .filter((g) => g.round < beforeRound && (g.white === playerId || g.black === playerId))
    .sort((a, b) => a.round - b.round);
  for (const g of games) {
    if (g.white === playerId) {
      hist.whites++;
      hist.colours.push('W');
    } else {
      hist.blacks++;
      hist.colours.push('B');
    }
  }
  return hist;
}

/**
 * Positive = wants white, negative = wants black.
 * ±3 is absolute (same colour twice in a row), ±2 is strong (two more of one colour),
 * ±1 is mild (one more of one colour), ±0.5 is a small preference to alternate.
 */
function colourPreference(h: ColourHistory): number {
  const last2 = h.colours.slice(-2);
  if (last2.length === 2 && last2[0] === last2[1]) return last2[0] === 'B' ? 3 : -3;
  const diff = h.whites - h.blacks;
  if (diff <= -2) return 2;
  if (diff >= 2) return -2;
  if (diff === -1) return 1;
  if (diff === 1) return -1;
  if (h.colours.length > 0) return h.colours[h.colours.length - 1] === 'W' ? -0.5 : 0.5;
  return 0;
}

/* ------------------------------------------------------------------ *
 * Pairing
 * ------------------------------------------------------------------ */

const SEARCH_BUDGET = 60000;

interface Ctx {
  played: (a: string, b: string) => boolean;
  /** True when both players are owed the same colour absolutely (they cannot both get it). */
  clash: (a: string, b: string) => boolean;
  allowRepeat: boolean;
  allowClash: boolean;
  budget: number;
}

/**
 * Depth-first pairing of one score group. The first player in the list is paired with the
 * candidate closest to the middle of the list (top half against bottom half), which is the
 * standard Dutch-style choice. If nobody is left to pair with, that player floats down.
 */
function matchGroup(
  list: Player[],
  floatsAllowed: number,
  ctx: Ctx,
): { pairs: [Player, Player][]; floats: Player[] } | null {
  if (list.length === 0) return { pairs: [], floats: [] };
  if (--ctx.budget < 0) return null;

  const p = list[0];
  const m = list.length;
  const mid = Math.floor(m / 2);
  const order = Array.from({ length: m - 1 }, (_, i) => i + 1).sort(
    (x, y) => Math.abs(x - mid) - Math.abs(y - mid) || x - y,
  );

  for (const j of order) {
    const q = list[j];
    if (!ctx.allowRepeat && ctx.played(p.id, q.id)) continue;
    if (!ctx.allowClash && ctx.clash(p.id, q.id)) continue;
    const rest = list.filter((_, k) => k !== 0 && k !== j);
    const sub = matchGroup(rest, floatsAllowed, ctx);
    if (sub) return { pairs: [[p, q], ...sub.pairs], floats: sub.floats };
    if (ctx.budget < 0) return null;
  }
  if (floatsAllowed > 0) {
    const sub = matchGroup(list.slice(1), floatsAllowed - 1, ctx);
    if (sub) return { pairs: sub.pairs, floats: [p, ...sub.floats] };
  }
  return null;
}

function solveGroup(
  list: Player[],
  ctx: Ctx,
): { pairs: [Player, Player][]; floats: Player[] } | null {
  // Fewest possible floats first. An odd group must float at least one player.
  for (let f = list.length % 2; f <= list.length; f += 2) {
    ctx.budget = SEARCH_BUDGET;
    const r = matchGroup(list, f, ctx);
    if (r) return r;
  }
  return null;
}

function chooseBye(
  players: Player[],
  pts: Map<string, number>,
  state: EventState,
): { player: Player; reason: string; fallback: boolean } {
  const groups = [...new Set(players.map((p) => pts.get(p.id)!))].sort((a, b) => a - b);
  for (const score of groups) {
    const eligible = players
      .filter((p) => pts.get(p.id) === score)
      .filter((p) => !state.credits.some((c) => c.playerId === p.id && c.kind === 'bye'))
      .sort((a, b) => a.rating - b.rating || a.name.localeCompare(b.name));
    if (eligible.length > 0) {
      const lowestGroup = score === groups[0];
      return {
        player: eligible[0],
        fallback: !lowestGroup,
        reason: lowestGroup
          ? `Lowest-rated player in the lowest score group (${fmtScore(score)} pts) who has not had a bye yet.`
          : `Every player in the lower score groups has already had a bye, so the bye goes to the lowest-rated player in the next group up.`,
      };
    }
  }
  // Everyone has had a bye already: fall back to the lowest-rated player in the lowest group.
  const fallback = [...players].sort((a, b) => pts.get(a.id)! - pts.get(b.id)! || a.rating - b.rating)[0];
  return { player: fallback, reason: 'Every player has already had a bye; this is the lowest-rated player in the lowest group.', fallback: true };
}

/** Scores as a director would say them: 0, ½, 1, 1½, 2 … */
export function fmtScore(s: number): string {
  const whole = Math.floor(s);
  const half = s - whole > 0;
  if (whole === 0) return half ? '½' : '0';
  return `${whole}${half ? '½' : ''}`;
}

/**
 * Build the pairings for `round` from the current state. Pure: it never changes `state`.
 * Players must be active in the round (see isActiveInRound).
 */
export function generatePairings(state: EventState, round: number): PairingPreview {
  const active = state.players.filter((p) => isActiveInRound(p, round));
  const pts = new Map<string, number>();
  for (const p of active) pts.set(p.id, pointsThrough(state, p.id, round - 1));

  const playedSet = new Set<string>();
  for (const g of state.games) {
    if (g.round >= round) continue;
    const [a, b] = [g.white, g.black].sort();
    playedSet.add(`${a}|${b}`);
  }
  const played = (a: string, b: string) => playedSet.has([a, b].sort().join('|'));

  const problems: string[] = [];
  let bye: PairingPreview['bye'] = null;
  let rest = active;
  if (active.length % 2 === 1) {
    const choice = chooseBye(active, pts, state);
    bye = { playerId: choice.player.id, reason: choice.reason };
    rest = active.filter((p) => p.id !== choice.player.id);
  }

  const prefOf = new Map<string, number>();
  for (const p of rest) prefOf.set(p.id, colourPreference(colourHistory(state, p.id, round)));
  const clash = (a: string, b: string) => {
    const pa = prefOf.get(a) ?? 0;
    const pb = prefOf.get(b) ?? 0;
    return (pa >= 3 && pb >= 3) || (pa <= -3 && pb <= -3);
  };

  // Strictest first: no repeats and no colour clash. Then accept a clash. Then accept a repeat (flagged).
  const attempt = (allowRepeat: boolean, allowClash: boolean) => {
    const ordered = [...rest].sort(
      (a, b) => pts.get(b.id)! - pts.get(a.id)! || b.rating - a.rating || a.name.localeCompare(b.name),
    );
    const scoreGroups = [...new Set(ordered.map((p) => pts.get(p.id)!))].sort((a, b) => b - a);
    const ctx: Ctx = { played, clash, allowRepeat, allowClash, budget: SEARCH_BUDGET };
    const pairs: { a: Player; b: Player; score: number }[] = [];
    const floats: PairingPreview['floats'] = [];
    let carried: Player[] = [];
    for (let gi = 0; gi < scoreGroups.length; gi++) {
      const s = scoreGroups[gi];
      const own = ordered.filter((p) => pts.get(p.id) === s);
      const list = [...carried, ...own];
      const solved = solveGroup(list, ctx);
      if (!solved) return null;
      for (const [a, b] of solved.pairs) pairs.push({ a, b, score: s });
      const isLast = gi === scoreGroups.length - 1;
      if (isLast && solved.floats.length > 0) return null;
      const nextScore = scoreGroups[gi + 1];
      for (const f of solved.floats) floats.push({ playerId: f.id, from: s, to: nextScore });
      carried = solved.floats;
    }
    return { pairs, floats };
  };

  let result = attempt(false, false);
  let repeatForced = false;
  if (!result) result = attempt(false, true);
  if (!result) {
    result = attempt(true, true);
    repeatForced = true;
    problems.push('No pairing without a repeat opponent could be found, so a repeat pairing was used. Check this board with the directors.');
  }

  const boards: Board[] = [];
  if (result) {
    const floatedIds = new Set(result.floats.map((f) => f.playerId));
    result.pairs.forEach(({ a, b, score }, i) => {
      // Colour allocation: higher colour preference gets white; ties go to the higher-rated player.
      const prefA = colourPreference(colourHistory(state, a.id, round));
      const prefB = colourPreference(colourHistory(state, b.id, round));
      const [white, black, prefWhite, prefBlack] =
        prefB > prefA ? [b, a, prefB, prefA] : [a, b, prefA, prefB];
      const reasons: string[] = [];
      if (floatedIds.has(a.id) || floatedIds.has(b.id)) {
        reasons.push('Includes a player who floated down from a higher group.');
      }
      if ((prefWhite >= 3 && prefBlack >= 3) || (prefWhite <= -3 && prefBlack <= -3)) {
        problems.push(
          `Board ${i + 1}: ${white.name} and ${black.name} both need the same colour. Check this board with the directors.`,
        );
      }
      const colourNote = describeColour(white, black, prefWhite, prefBlack);
      if (colourNote) reasons.push(colourNote);
      if (reasons.length === 0) reasons.push(`Both players are on ${fmtScore(score)} pts; paired top half against bottom half by rating.`);
      boards.push({
        board: i + 1,
        white: white.id,
        black: black.id,
        scoreGroup: score,
        reasons,
      });
    });
  }

  const floats = result ? result.floats : [];
  return {
    round,
    boards,
    bye,
    floats,
    activeCount: active.length,
    repeatForced,
    problems,
  };
}

function describeColour(white: Player, black: Player, prefWhite: number, prefBlack: number): string | null {
  if (prefWhite >= 3) return `${white.name} has had black in each of the last two games, so gets white.`;
  if (prefBlack >= 3) return `${black.name} has had white in each of the last two games, so gets black.`;
  if (prefWhite >= 2) return `${white.name} has had black more often than white (colour balance), so gets white.`;
  if (prefBlack >= 2) return `${black.name} has had white more often than black (colour balance), so gets black.`;
  if (prefWhite === 0 && prefBlack === 0) {
    return 'Colour history is level for both players; the higher-rated player takes white.';
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Checks before posting
 * ------------------------------------------------------------------ */

export interface CheckItem {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export function roundIsComplete(state: EventState, round: number): boolean {
  const games = state.games.filter((g) => g.round === round);
  return games.length > 0 && games.every((g) => g.result !== null);
}

export function completedRounds(state: EventState): number {
  let r = 0;
  while (r < state.totalRounds && roundIsComplete(state, r + 1)) r++;
  return r;
}

/** Boards where players reported something different and the director has not yet resolved it. */
export function openDisputes(state: EventState): Game[] {
  return state.games.filter((g) => g.dispute && !g.dispute.resolved);
}

export function gamesInRound(state: EventState, round: number): Game[] {
  return state.games.filter((g) => g.round === round).sort((a, b) => a.board - b.board);
}
