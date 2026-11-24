// Core data model for one tournament. Everything here is plain data so the whole
// event can be cloned, previewed and saved without a backend.

export type Result = '1-0' | '0-1' | '1/2';

/**
 * playing   – in the event and eligible to be paired from joinedRound onward
 * waiting   – a late entry who has arrived but the director has not decided yet
 * declined  – a late entry who is not joining today (kept for the record)
 */
export type PlayerStatus = 'playing' | 'waiting' | 'declined';

export interface Player {
  id: string;
  name: string;
  age: number;
  rating: number;
  status: PlayerStatus;
  /** Round the player first gets paired in. null while waiting. */
  joinedRound: number | null;
  /** First round the player is NOT paired in (set by a withdrawal). */
  withdrawnFromRound: number | null;
  /** Free-text note from the director or the family. */
  note?: string;
  /** Has left the hall and still needs a withdrawal decision. */
  leftEarly?: boolean;
  /** Time a late arrival reached the hall, as shown on the sign-in sheet. */
  arrivedAt?: string;
}

export interface Game {
  id: string;
  round: number;
  board: number;
  white: string;
  black: string;
  /** null until the board is played and the result is entered. */
  result: Result | null;
  /** Set when players told the director something different from the recorded result. */
  dispute?: { reportedResult: Result; reportedBy: string; resolved: boolean };
  /** Audit trail for result changes. */
  history?: ResultChange[];
}

export interface ResultChange {
  at: string;
  from: Result | null;
  to: Result;
  reason: string;
  note: string;
}

/**
 * Points credited without a game:
 *  - 'bye'  : a pairing bye in a posted round (full point). Counts for the
 *             "has already had a bye" rule.
 *  - 'late' : a half-point credit for a round a late entry missed. Counts for
 *             points only, never as a bye.
 */
export interface Credit {
  round: number;
  playerId: string;
  kind: 'bye' | 'late';
  points: number;
}

export interface LogEntry {
  time: string;
  text: string;
}

export interface EventState {
  name: string;
  totalRounds: number;
  players: Player[];
  games: Game[];
  credits: Credit[];
  /** Rounds whose pairings have been posted to the hall. */
  postedRounds: number[];
  log: LogEntry[];
}

export interface Board {
  board: number;
  white: string;
  black: string;
  scoreGroup: number;
  reasons: string[];
}

export interface PairingPreview {
  round: number;
  boards: Board[];
  bye: { playerId: string; reason: string } | null;
  floats: { playerId: string; from: number; to: number }[];
  activeCount: number;
  /** True when the pairing had to repeat an earlier opponent (should never happen in a normal event). */
  repeatForced: boolean;
  problems: string[];
}
