// Rule tests for the pairing engine, run against the same mock event the app starts from.
// Run with: npm test   (bundles with esbuild, then runs node's test runner)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialEvent } from '../src/data/mock';
import { computeStandings, fmtScore, generatePairings, placeLabel, pointsThrough } from '../src/lib/swiss';
import { reduce } from '../src/state/reducer';
import { derive } from '../src/state/derive';
import type { EventState } from '../src/lib/types';

const start = (): EventState => structuredClone(initialEvent);
const named = (s: EventState, name: string) => {
  const p = s.players.find((x) => x.name === name);
  assert.ok(p, `missing player ${name}`);
  return p;
};
const board6 = (s: EventState) => s.games.find((g) => g.round === 2 && g.board === 6)!;

function correctBoard6(s: EventState): EventState {
  return reduce(s, { type: 'correctResult', gameId: board6(s).id, to: '0-1', reason: 'Scoresheet shows a different result', note: '', at: '00:00' });
}
function withdrawPriya(s: EventState): EventState {
  return reduce(s, { type: 'withdraw', playerId: named(s, 'Priya Nand').id, fromRound: 3, at: '00:00' });
}
function theoJoins(s: EventState, halfByeRounds: number[] = []): EventState {
  return reduce(s, {
    type: 'addLateEntry',
    playerId: named(s, 'Theo Brandt').id,
    halfByeRounds,
    joinRound: 3,
    at: '00:00',
  });
}

test('after round 2 the recorded standings match the club figures', () => {
  const rows = computeStandings(start(), 2);
  const count = (f: (p: number) => boolean) => rows.filter((r) => f(r.points)).length;
  assert.equal(count((p) => p === 2), 8);
  assert.equal(count((p) => p === 1 || p === 1.5), 16);
  assert.equal(count((p) => p === 0 || p === 0.5), 10);
});

test('correcting board 6 to a black win moves Okafor down and Lindqvist up by half a point', () => {
  const before = start();
  const after = correctBoard6(before);
  const okafor = named(before, 'Emeka Okafor').id;
  const lindqvist = named(before, 'Anders Lindqvist').id;
  assert.equal(pointsThrough(before, okafor, 2), 1.5);
  assert.equal(pointsThrough(after, okafor, 2), 1);
  assert.equal(pointsThrough(before, lindqvist, 2), 1.5);
  assert.equal(pointsThrough(after, lindqvist, 2), 2);
  assert.equal(board6(after).dispute?.resolved, true);
});

test('withdrawing Priya alone leaves an odd count; Theo joining makes it even with no bye', () => {
  const s = start();
  assert.equal(derive(s).activeForPairRound, 34, 'before any decision Priya is still counted');
  const priyaOut = withdrawPriya(s);
  assert.equal(derive(priyaOut).activeForPairRound, 33);
  const both = theoJoins(priyaOut);
  const pv = generatePairings(both, 3);
  assert.equal(pv.activeCount, 34);
  assert.equal(pv.bye, null, 'an even count needs no bye');
  assert.equal(pv.boards.length, 17);
});

test('if Theo does not join, the bye goes to the lowest-rated player in the lowest score group with no earlier bye', () => {
  const s = withdrawPriya(correctBoard6(start()));
  const pv = generatePairings(s, 3);
  assert.equal(pv.activeCount, 33);
  assert.ok(pv.bye, 'an odd count needs a bye');
  const chosen = named(s, s.players.find((p) => p.id === pv.bye!.playerId)!.name);
  const zeroPlayers = s.players.filter(
    (p) => p.status === 'playing' && p.withdrawnFromRound === null && pointsThrough(s, p.id, 2) === 0,
  );
  assert.equal(pointsThrough(s, chosen.id, 2), 0, 'bye goes to the lowest score group');
  assert.equal(chosen.rating, Math.min(...zeroPlayers.map((p) => p.rating)), 'and to the lowest-rated of them');
});

test('a late-entry half-point credit is points only and never counts as a bye', () => {
  const s = theoJoins(start(), [1, 2]);
  const theo = named(s, 'Theo Brandt');
  const row = computeStandings(s, 2).find((r) => r.playerId === theo.id);
  assert.ok(row, 'Theo appears in the standings once added');
  assert.equal(row!.points, 1);
  assert.equal(row!.byes, 0);
});

test('a withdrawn player keeps their points in the standings', () => {
  const s = withdrawPriya(start());
  const priya = named(s, 'Priya Nand');
  const row = computeStandings(s, 2).find((r) => r.playerId === priya.id);
  assert.equal(row!.points, 1);
  assert.equal(computeStandings(s, 2).length, 34);
});

test('round 3 for the corrected event pairs everyone once, with no repeat games and no colour clashes', () => {
  const s = theoJoins(withdrawPriya(correctBoard6(start())));
  const pv = generatePairings(s, 3);
  assert.equal(pv.problems.length, 0);
  assert.equal(pv.repeatForced, false);
  const seen = new Set<string>();
  for (const b of pv.boards) {
    seen.add(b.white);
    seen.add(b.black);
  }
  const active = s.players.filter((p) => p.status === 'playing' && p.withdrawnFromRound === null && p.joinedRound !== null);
  assert.equal(seen.size, active.length, 'every active player has a board');
  const repeats = pv.boards.filter((b) =>
    s.games.some(
      (g) =>
        g.round < 3 &&
        ((g.white === b.white && g.black === b.black) || (g.white === b.black && g.black === b.white)),
    ),
  );
  assert.equal(repeats.length, 0, 'no pair has met before');
});

test('players level on points and both tiebreaks share a place', () => {
  const rows = computeStandings(start(), 2);
  const tied = rows.filter((r) => r.tied);
  assert.ok(tied.length > 0);
  const top = rows[0];
  assert.equal(top.rank, 1);
  assert.ok(placeLabel(top).startsWith('='), 'the top group shares first place');
});

test('score notation reads as a director would say it', () => {
  assert.equal(fmtScore(0), '0');
  assert.equal(fmtScore(0.5), '½');
  assert.equal(fmtScore(1), '1');
  assert.equal(fmtScore(1.5), '1½');
  assert.equal(fmtScore(2), '2');
});
