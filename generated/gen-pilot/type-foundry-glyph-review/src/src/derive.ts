import type { Script, StyleId } from './data/core';
import { countStatuses, glyphByChar, LATIN } from './data/glyphs';
import { REVISIONS } from './data/revisions';
import type { KernPair } from './data/kerning';
import { lockKey, type State } from './store';

export function revisionStats(s: State, author?: 'eleni' | 'tomas') {
  const list = REVISIONS.filter((r) => !author || r.author === author);
  const d = list.map((r) => s.decisions[r.id].decision);
  return {
    total: list.length,
    approved: d.filter((x) => x === 'approved').length,
    sentBack: d.filter((x) => x === 'sent-back').length,
    pending: d.filter((x) => x === 'pending').length,
  };
}

export function kernStats(s: State) {
  const pairs = s.kernPairs;
  const by = (f: (p: KernPair) => boolean) => pairs.filter(f).length;
  return {
    total: pairs.length,
    unsure: by((p) => p.unsure),
    unsurePending: by((p) => p.unsure && s.kern[p.id] === 'pending'),
    pending: by((p) => s.kern[p.id] === 'pending'),
    accepted: by((p) => s.kern[p.id] === 'accepted'),
    reverted: by((p) => s.kern[p.id] === 'reverted'),
    added: by((p) => p.before === null),
  };
}

export const openThreads = (s: State) => s.threads.filter((t) => !t.resolved);
export const threadsForMe = (s: State) => openThreads(s).filter((t) => t.to === 'ines');

export function threadsOn(s: State, style: StyleId, script: Script) {
  return openThreads(s).filter((t) => {
    if (t.style !== style || !t.ch) return false;
    const g = glyphByChar(t.ch);
    return g?.script === script;
  });
}

export function lockReadiness(s: State, style: StyleId, script: Script) {
  const counts = countStatuses(s.statuses, style, script);
  const threads = threadsOn(s, style, script);
  const total = counts.approved + counts.review + counts.draft;
  const inReview = (script === 'latin' ? LATIN : []).filter((g) => s.statuses[`${style}:${g.id}`] !== 'approved');
  const activeHere = style === 'bold' ? ['jonas'] : [];
  return {
    counts, total, threads, inReview, activeHere,
    locked: s.locks.includes(lockKey(style, script)),
    ready: counts.approved === total && threads.length === 0,
  };
}
