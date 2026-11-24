import { ROUND_BY_ID, roundsOf } from '../data/scrim';
import type { Round } from '../data/types';
import { useApp, type RoundFilter } from '../store';

export function matchesFilter(r: Round, f: RoundFilter) {
  if (f === 'all') return true;
  if (f === 'def') return r.side === 'def';
  if (f === 'att') return r.side === 'att';
  return r.side === 'def' && !r.won && !r.extra;
}

/** Skip to previous/next round in the active filter (defaults to lost defense rounds). */
export function navLostDef(dir: 1 | -1) {
  const s = useApp.getState();
  const cur = ROUND_BY_ID[s.roundId];
  const f = s.filter === 'all' ? 'all' : s.filter;
  const list = roundsOf(cur.map).filter((r) => matchesFilter(r, f));
  const target = dir > 0 ? list.find((r) => r.n > cur.n) : [...list].reverse().find((r) => r.n < cur.n);
  if (target) {
    // land a few seconds before the plant: that's where the retake starts
    const t = target.plantT ? Math.max(0, target.plantT - 6) : 0;
    s.openRound(target.id, t);
  }
}

export function neighbor(dir: 1 | -1) {
  const s = useApp.getState();
  const cur = ROUND_BY_ID[s.roundId];
  const list = roundsOf(cur.map).filter((r) => matchesFilter(r, s.filter));
  return dir > 0 ? list.find((r) => r.n > cur.n) : [...list].reverse().find((r) => r.n < cur.n);
}
