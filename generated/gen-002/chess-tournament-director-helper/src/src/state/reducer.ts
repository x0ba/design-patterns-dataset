import { initialEvent } from '../data/mock';
import { fmtScore, generatePairings, pointsThrough, roundIsComplete } from '../lib/swiss';
import type { EventState, Game, Player, Result } from '../lib/types';

export type Action =
  | { type: 'correctResult'; gameId: string; to: Result; reason: string; note: string; at: string }
  | {
      type: 'addLateEntry';
      playerId: string | null;
      newPlayer?: { name: string; age: number; rating: number };
      halfByeRounds: number[];
      joinRound: number;
      at: string;
    }
  | { type: 'declineLateEntry'; playerId: string; at: string }
  | { type: 'withdraw'; playerId: string; fromRound: number; at: string }
  | { type: 'postRound'; round: number; at: string }
  | { type: 'enterResult'; gameId: string; result: Result; at: string }
  | { type: 'reset' };

export const RESULT_TEXT: Record<Result, string> = {
  '1-0': 'White won (1–0)',
  '0-1': 'Black won (0–1)',
  '1/2': 'Draw (½–½)',
};

export function reduce(state: EventState, action: Action): EventState {
  switch (action.type) {
    case 'reset':
      return structuredClone(initialEvent);

    case 'correctResult': {
      const g = state.games.find((x) => x.id === action.gameId);
      if (!g) return state;
      const from = g.result;
      const changed = from !== action.to;
      const updated: Game = {
        ...g,
        result: action.to,
        dispute: g.dispute ? { ...g.dispute, resolved: true } : undefined,
        history: changed
          ? [...(g.history ?? []), { at: action.at, from, to: action.to, reason: action.reason, note: action.note }]
          : g.history,
      };
      const white = playerName(state, g.white);
      const black = playerName(state, g.black);
      const logText = changed
        ? `Round ${g.round} board ${g.board} (${white} vs ${black}) changed from ${from ? RESULT_TEXT[from] : 'no result'} to ${RESULT_TEXT[action.to]}. Reason: ${action.reason}.`
        : `Round ${g.round} board ${g.board} (${white} vs ${black}) kept as ${RESULT_TEXT[action.to]}. Scoresheet checked; dispute closed.`;
      return {
        ...state,
        games: state.games.map((x) => (x.id === g.id ? updated : x)),
        log: [...state.log, { time: action.at, text: logText }],
      };
    }

    case 'addLateEntry': {
      let players = state.players;
      let name: string;
      let target: Player;
      if (action.playerId) {
        const existing = state.players.find((p) => p.id === action.playerId);
        if (!existing) return state;
        name = existing.name;
        target = { ...existing, status: 'playing', joinedRound: action.joinRound };
        players = state.players.map((p) => (p.id === existing.id ? target : p));
      } else {
        if (!action.newPlayer) return state;
        const nextNum = state.players.length + 1;
        name = action.newPlayer.name;
        target = {
          id: `p${String(nextNum).padStart(2, '0')}`,
          name: action.newPlayer.name,
          age: action.newPlayer.age,
          rating: action.newPlayer.rating,
          status: 'playing',
          joinedRound: action.joinRound,
          withdrawnFromRound: null,
          note: 'Late entry added at the hall.',
        };
        players = [...state.players, target];
      }
      const credits = [
        ...state.credits,
        ...action.halfByeRounds.map((r) => ({ round: r, playerId: target.id, kind: 'late' as const, points: 0.5 })),
      ];
      const creditText =
        action.halfByeRounds.length === 0
          ? 'No credit for missed rounds.'
          : `Credited ½ for round ${action.halfByeRounds.join(' and ')}.`;
      return {
        ...state,
        players,
        credits,
        log: [
          ...state.log,
          { time: action.at, text: `${name} added to the event from round ${action.joinRound}. ${creditText}` },
        ],
      };
    }

    case 'declineLateEntry': {
      const p = state.players.find((x) => x.id === action.playerId);
      if (!p) return state;
      return {
        ...state,
        players: state.players.map((x) => (x.id === p.id ? { ...x, status: 'declined', leftEarly: false } : x)),
        log: [...state.log, { time: action.at, text: `${p.name} is not joining today. Marked as declined.` }],
      };
    }

    case 'withdraw': {
      const p = state.players.find((x) => x.id === action.playerId);
      if (!p) return state;
      return {
        ...state,
        players: state.players.map((x) =>
          x.id === p.id ? { ...x, withdrawnFromRound: action.fromRound, leftEarly: false } : x,
        ),
        log: [
          ...state.log,
          {
            time: action.at,
            text: `${p.name} withdrawn from round ${action.fromRound} onward. Points so far (${pointsSoFar(state, p.id)}) stay in the standings.`,
          },
        ],
      };
    }

    case 'postRound': {
      const preview = generatePairings(state, action.round);
      const games: Game[] = preview.boards.map((b) => ({
        id: `g-r${action.round}-b${String(b.board).padStart(2, '0')}`,
        round: action.round,
        board: b.board,
        white: b.white,
        black: b.black,
        result: null,
      }));
      const credits = preview.bye
        ? [...state.credits, { round: action.round, playerId: preview.bye.playerId, kind: 'bye' as const, points: 1 }]
        : state.credits;
      const byeText = preview.bye ? ` Bye: ${playerName(state, preview.bye.playerId)} (1 point).` : ' No bye.';
      return {
        ...state,
        games: [...state.games, ...games],
        credits,
        postedRounds: [...state.postedRounds, action.round],
        log: [
          ...state.log,
          { time: action.at, text: `Round ${action.round} pairings posted: ${games.length} boards.${byeText}` },
        ],
      };
    }

    case 'enterResult': {
      const g = state.games.find((x) => x.id === action.gameId);
      if (!g) return state;
      return {
        ...state,
        games: state.games.map((x) => (x.id === g.id ? { ...x, result: action.result } : x)),
        log: [
          ...state.log,
          {
            time: action.at,
            text: `Round ${g.round} board ${g.board}: ${RESULT_TEXT[action.result]} entered.`,
          },
        ],
      };
    }
  }
}

export function playerName(state: EventState, id: string): string {
  return state.players.find((p) => p.id === id)?.name ?? 'Unknown player';
}

function pointsSoFar(state: EventState, id: string): string {
  const last = Math.max(...state.postedRounds, 0);
  return fmtScore(pointsThrough(state, id, last));
}

/** The round the director pairs next, or null while the current round is still being played. */
export function nextRoundToPair(state: EventState): number | null {
  const current = Math.max(...state.postedRounds, 0);
  if (current === 0) return 1;
  if (!roundIsComplete(state, current)) return null;
  return current < state.totalRounds ? current + 1 : null;
}
