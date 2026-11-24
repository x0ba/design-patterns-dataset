// Search and triage rules for Dupehound. Pure functions, no DOM.
//
// Search: text is normalised into canonical terms (synonyms collapsed, so
// "storm", "rainstorm" and "weather" all count as the rain concept). Terms are
// scored TF-IDF style with title hits weighted above body hits. A dump
// signature match adds a large fixed bonus. Results below 25% of the best score
// are cut, so a single common word (e.g. "crash") does not flood the list.
//
// Triage: each candidate gets a rule-based suggestion (reopen / add repro /
// compare / follow duplicate / related / not a match). These are heuristics to
// support the tester's decision, not a verdict.

export const TRIGGERS = ['MAP', 'WX', 'FT', 'COOP'];

export const TRIGGER_LABEL = { MAP: 'map', WX: 'rain', FT: 'fast travel', COOP: 'co-op' };

export const CONCEPT_LABEL = {
  MAP: 'map',
  WX: 'rain / storm',
  FT: 'fast travel',
  COOP: 'co-op',
  CRASH: 'crash',
  ps5: 'PS5',
  xbox: 'Xbox Series',
  pc: 'PC',
};

export const STATUS_LABEL = {
  open: 'Open',
  fixed: 'Fixed',
  'cant-repro': "Closed: can't repro",
  duplicate: 'Duplicate',
};

const SIG_BONUS = 25;
const CUTOFF_RATIO = 0.25;

const STOP = new Set(
  'a an and are as at be by for from in into is it its of on or the this that to was when while with after during before no not we i my our us'.split(' '),
);

// Phrases are collapsed to a single token before splitting.
const PHRASES = [
  [/\bfast[\s-]+travel(?:l?ing|led|ed|s)?\b/gi, ' fasttravel '],
  [/\bco[\s-]op\b/gi, ' coop '],
  [/\bworld\s+map\b/gi, ' map '],
];

// Word -> canonical term. Anything not listed is stemmed and kept as-is.
const WORD_CANON = {
  rain: 'WX', rainy: 'WX', rains: 'WX', raining: 'WX', rained: 'WX',
  rainstorm: 'WX', rainstorms: 'WX', storm: 'WX', storms: 'WX', stormy: 'WX',
  weather: 'WX', weathers: 'WX',
  map: 'MAP', maps: 'MAP',
  fasttravel: 'FT', teleport: 'FT', teleports: 'FT',
  coop: 'COOP', teammate: 'COOP', teammates: 'COOP', host: 'COOP', guest: 'COOP', partner: 'COOP',
  crash: 'CRASH', crashes: 'CRASH', crashed: 'CRASH', crashing: 'CRASH', ctd: 'CRASH',
  ps5: 'ps5', xbox: 'xbox', pc: 'pc',
};

export function normSig(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function stem(w) {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function canonTerms(text) {
  // Split camelCase (MapRenderer -> Map Renderer) before lowercasing.
  let s = String(text ?? '').replace(/([a-z])([A-Z])/g, '$1 $2');
  for (const [re, rep] of PHRASES) s = s.replace(re, rep);
  const out = new Set();
  for (const raw of s.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || STOP.has(raw)) continue;
    out.add(WORD_CANON[raw] ?? stem(raw));
  }
  return out;
}

const platformToken = (p) => p.toLowerCase().split(' ')[0];

// [text, weight] pairs. Title hits count most, then signature, description, platform.
function weightedFields(r) {
  return [
    [r.title, 3],
    [r.signature || '', 2],
    [r.description, 1],
    [r.platforms.map(platformToken).join(' '), 1],
  ];
}

// All canonical terms a report carries. Cached on the record for display use.
export function docTerms(r) {
  if (!r._terms) {
    const s = new Set();
    for (const [text] of weightedFields(r)) for (const t of canonTerms(text)) s.add(t);
    r._terms = s;
  }
  return r._terms;
}

export function buildIndex(records, builds) {
  const N = records.length;
  const postings = new Map(); // term -> { docs: number[], w: number[] }
  const sigIndex = new Map(); // normalised signature -> number[]

  records.forEach((r, i) => {
    r.firstIdx = builds.indexOf(r.firstBuild);
    r.lastIdx = builds.indexOf(r.lastBuild);
    r.fixedIdx = r.fixedIn ? builds.indexOf(r.fixedIn) : -1;

    const weights = new Map();
    for (const [text, w] of weightedFields(r)) {
      for (const t of canonTerms(text)) {
        if ((weights.get(t) ?? 0) < w) weights.set(t, w);
      }
    }
    for (const [t, w] of weights) {
      let p = postings.get(t);
      if (!p) {
        p = { docs: [], w: [] };
        postings.set(t, p);
      }
      p.docs.push(i);
      p.w.push(w);
    }

    if (r.signature) {
      const k = normSig(r.signature);
      let list = sigIndex.get(k);
      if (!list) {
        list = [];
        sigIndex.set(k, list);
      }
      list.push(i);
    }
  });

  return { records, N, postings, sigIndex, builds };
}

export function makeContext({ query, dumpSig, platform, currentBuild, builds }) {
  const terms = canonTerms(query);
  return {
    terms,
    dumpSig,
    platform,
    currentBuild,
    currentIdx: builds.indexOf(currentBuild),
    triggers: TRIGGERS.filter((t) => terms.has(t)),
  };
}

/**
 * options: { statuses:Set, platforms:Set, severities:Set, minBuildIdx:number (-1 = any),
 *            onlySig, onlyClips, includeSig, dumpSig, sortBy: 'relevance'|'recent'|'dupes' }
 * Returns { results: number[] (record indices, sorted), total, terms, statusCounts }.
 * statusCounts ignores the status filter so the UI can show counts per status.
 */
export function search(index, query, opts) {
  const { records, N, postings, sigIndex } = index;
  const terms = canonTerms(query ?? '');
  const hasQuery = terms.size > 0;
  const score = new Float64Array(N);

  for (const t of terms) {
    const p = postings.get(t);
    if (!p) continue;
    const idf = Math.log(1 + N / p.docs.length);
    for (let k = 0; k < p.docs.length; k++) score[p.docs[k]] += idf * p.w[k];
  }

  const sigKey = opts.includeSig && opts.dumpSig ? normSig(opts.dumpSig) : null;
  if (sigKey) {
    for (const i of sigIndex.get(sigKey) ?? []) score[i] += SIG_BONUS;
  }

  let maxScore = 0;
  if (hasQuery) for (let i = 0; i < N; i++) if (score[i] > maxScore) maxScore = score[i];
  const floor = hasQuery ? maxScore * CUTOFF_RATIO : 0;

  const statusCounts = { open: 0, fixed: 0, 'cant-repro': 0, duplicate: 0 };
  const hits = [];
  for (let i = 0; i < N; i++) {
    if (hasQuery && !(score[i] > 0 && score[i] >= floor)) continue;
    const r = records[i];
    if (opts.minBuildIdx >= 0 && r.lastIdx < opts.minBuildIdx) continue;
    if (opts.onlySig && !r.signature) continue;
    if (opts.onlyClips && !(r.clips > 0)) continue;
    if (!opts.severities.has(r.severity)) continue;
    if (!r.platforms.some((p) => opts.platforms.has(p))) continue;
    statusCounts[r.status]++;
    if (!opts.statuses.has(r.status)) continue;
    hits.push(i);
  }

  let cmp;
  if (opts.sortBy === 'recent') {
    cmp = (a, b) => records[b].lastIdx - records[a].lastIdx || score[b] - score[a] || a - b;
  } else if (opts.sortBy === 'dupes') {
    cmp = (a, b) => records[b].dupes - records[a].dupes || score[b] - score[a] || a - b;
  } else {
    cmp = (a, b) => score[b] - score[a] || records[b].lastIdx - records[a].lastIdx || a - b;
  }
  hits.sort(cmp);

  return { results: hits, total: hits.length, terms, statusCounts, score };
}

function describeGap(r, ctx) {
  if (!r.platforms.includes(ctx.platform)) return `it is on ${r.platforms.join(' and ')} only`;
  if (r.status === 'fixed') return `it is fixed (in ${r.fixedIn})`;
  if (r.status === 'cant-repro') return "it was closed as can't reproduce";
  if (r.status === 'duplicate') return 'it is a duplicate';
  return 'the symptom differs';
}

function sug(kind, target, label, reason) {
  return { kind, target, label, reason };
}

export function suggest(r, ctx, { sameSig, hits }) {
  const names = hits.map((t) => TRIGGER_LABEL[t]).join(', ');

  if (sameSig) {
    if (r.status === 'fixed') {
      if (r.fixedIdx >= 0 && r.fixedIdx < ctx.currentIdx) {
        return sug(
          'reopen', r.id, 'Reopen candidate',
          `Same crash signature as the fix in ${r.fixedIn}. It still reproduces on ${ctx.currentBuild}, so this looks like a regression. Reopen rather than file new.`,
        );
      }
      return sug(
        'reopen', r.id, 'Reopen candidate',
        `Fixed in ${r.fixedIn}, which is this build or later, and the crash still reproduces. The fix may be incomplete.`,
      );
    }
    if (r.status === 'open') {
      return sug('repro', r.id, 'Add repro', 'Same crash signature and still open. Your dump and clip are the repro to add.');
    }
    if (r.status === 'cant-repro') {
      return sug(
        'reopen', r.id, 'Reopen with repro',
        "Same signature was closed as can't reproduce. A new dump and clip are new evidence, so reopen with them.",
      );
    }
    if (r.status === 'duplicate') {
      return sug(
        'follow', r.duplicateOf, 'Duplicate: add to canonical',
        `Same signature, marked duplicate of ${r.duplicateOf}. Add your repro to that report.`,
      );
    }
  }

  if (r.status === 'duplicate') {
    return sug(
      'follow', r.duplicateOf, 'Duplicate: check canonical',
      `Marked duplicate of ${r.duplicateOf}. Check whether that report covers your symptom before adding anything.`,
    );
  }

  if (r.signature) {
    return sug(
      'related', r.id, 'Related: link, do not merge',
      `Different crash signature (${r.signature}). Shares ${names || 'few conditions'} with yours, so link it as related rather than a duplicate.`,
    );
  }

  // "Possible duplicate" needs the same conditions plus a crash-or-hang symptom.
  // A visual glitch that happens to mention co-op is only related.
  const open = r.status === 'open';
  const hangLike = ['CRASH', 'stall', 'freeze', 'hang'].some((t) => docTerms(r).has(t));
  if (hits.length >= 3 && open && hangLike && r.platforms.includes(ctx.platform)) {
    return sug(
      'compare', r.id, 'Possible duplicate',
      `Same conditions (${names}) on ${ctx.platform}, still open, but the symptom differs. Compare steps and dumps before adding a repro.`,
    );
  }

  if (hits.length >= 2) {
    return sug(
      'related', r.id, 'Related: link, do not merge',
      `Shares ${names} with your repro, but ${describeGap(r, ctx)}. Link as related.`,
    );
  }

  return sug('none', null, 'Not a match', 'Shares fewer than two of your trigger conditions. Not a duplicate.');
}

/** Everything the UI needs to describe one candidate against the current query. */
export function analyze(r, ctx) {
  const terms = docTerms(r);
  const sameSig = !!(r.signature && ctx.dumpSig && normSig(r.signature) === normSig(ctx.dumpSig));
  const hits = ctx.triggers.filter((t) => terms.has(t));
  const matched = [...ctx.terms].filter((t) => terms.has(t));
  const s = suggest(r, ctx, { sameSig, hits });
  return { terms, sameSig, hits, matched, sug: s };
}
