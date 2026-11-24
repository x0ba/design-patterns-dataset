import { generatePairings, openDisputes, isActiveInRound, roundIsComplete, type CheckItem } from '../lib/swiss';
import type { EventState, Game, PairingPreview, Player } from '../lib/types';
import { nextRoundToPair } from './reducer';

export interface Derived {
  currentRound: number;
  pairRound: number | null;
  preview: PairingPreview | null;
  checks: CheckItem[];
  canPost: boolean;
  disputes: Game[];
  waiting: Player[];
  /** Late entries added for the round being prepared. */
  added: Player[];
  /** Late entries marked not joining. */
  declined: Player[];
  leavingNow: Player[];
  activeForPairRound: number;
  /** When someone is still waiting, what the bye would be if they do not join. */
  byeIfWaitingDeclined: { name: string; reason: string } | null;
  /** The count if the waiting players do not join. */
  activeIfWaitingDeclined: number;
}

export function derive(state: EventState): Derived {
  const currentRound = Math.max(...state.postedRounds, 0);
  const pairRound = nextRoundToPair(state);
  const disputes = openDisputes(state);
  const waiting = state.players.filter((p) => p.status === 'waiting');
  const leavingNow = state.players.filter((p) => p.leftEarly && p.status === 'playing');
  const added = state.players.filter((p) => p.status === 'playing' && pairRound !== null && p.joinedRound === pairRound && pairRound > 1);
  const declined = state.players.filter((p) => p.status === 'declined');

  let preview: PairingPreview | null = null;
  let checks: CheckItem[] = [];
  let activeForPairRound = 0;
  let byeIfWaitingDeclined: Derived['byeIfWaitingDeclined'] = null;
  let activeIfWaitingDeclined = 0;

  if (pairRound !== null) {
    preview = generatePairings(state, pairRound);
    activeForPairRound = preview.activeCount;

    const roundPlayed = pairRound - 1;
    const boardsOk = preview.boards.length * 2 + (preview.bye ? 1 : 0) === preview.activeCount;
    checks = [
      {
        id: 'results',
        label: `Round ${roundPlayed} results are all entered`,
        ok: roundIsComplete(state, roundPlayed),
        detail: `${state.games.filter((g) => g.round === roundPlayed && g.result !== null).length} of ${
          state.games.filter((g) => g.round === roundPlayed).length
        } boards have a result.`,
      },
      {
        id: 'disputes',
        label: 'No disputed results are still open',
        ok: disputes.length === 0,
        detail:
          disputes.length === 0
            ? 'Every board that players questioned has been checked against the scoresheet.'
            : disputes
                .map((g) => `Round ${g.round} board ${g.board} is still open.`)
                .join(' '),
      },
      {
        id: 'late',
        label: 'Late entries are decided',
        ok: waiting.length === 0,
        detail:
          waiting.length === 0
            ? 'Nobody is waiting to join.'
            : `${waiting.map((p) => p.name).join(', ')} ${waiting.length === 1 ? 'is' : 'are'} still waiting to be added or marked not joining.`,
      },
      {
        id: 'leaving',
        label: 'Players who have gone home are withdrawn',
        ok: leavingNow.length === 0,
        detail:
          leavingNow.length === 0
            ? 'Nobody on the list still needs a withdrawal.'
            : `${leavingNow.map((p) => p.name).join(', ')} ${leavingNow.length === 1 ? 'is' : 'are'} still listed as playing.`,
      },
      {
        id: 'pairings',
        label: 'Pairings are valid',
        ok: boardsOk && !preview.repeatForced && preview.problems.length === 0,
        detail:
          preview.problems.length > 0
            ? preview.problems.join(' ')
            : boardsOk
              ? `${preview.boards.length} boards${preview.bye ? ' and one bye' : ', no bye'}. No repeat games and no colour conflicts.`
              : 'Some players are not paired and have no bye.',
      },
    ];

    if (waiting.length > 0) {
      const declined: EventState = {
        ...state,
        players: state.players.map((p) => (p.status === 'waiting' ? { ...p, status: 'declined' } : p)),
      };
      const alt = generatePairings(declined, pairRound);
      activeIfWaitingDeclined = alt.activeCount;
      if (alt.bye) {
        const byeName = state.players.find((p) => p.id === alt.bye!.playerId)?.name ?? '';
        byeIfWaitingDeclined = { name: byeName, reason: alt.bye.reason };
      }
    }
  }

  return {
    currentRound,
    pairRound,
    preview,
    checks,
    canPost: pairRound !== null && checks.every((c) => c.ok),
    disputes,
    waiting,
    added,
    declined,
    leavingNow,
    activeForPairRound,
    byeIfWaitingDeclined,
    activeIfWaitingDeclined,
  };
}

/** Players who would be eligible in `round` if nothing changed. Used for the bye count explanation. */
export function eligibleCount(state: EventState, round: number): number {
  return state.players.filter((p) => isActiveInRound(p, round)).length;
}
