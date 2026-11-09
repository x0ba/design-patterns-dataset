// Quantifying site variety (README "Questions": how do we quantify site variety?).
//
// Two kinds of measure, because they answer different questions:
//
//  Before labeling (the sampling frame, from sites/<batch>.yaml):
//    - domain coverage: how many of the label-schema domains are sampled
//    - domain evenness: normalized Shannon entropy H/ln(k) (1 = perfectly even)
//    - effective number of domains: exp(H) (Hill number of order 1)
//    - Gini–Simpson: probability two random sites differ in domain
//
//  After labeling (what the dataset actually contains, from consensus.json):
//    - pattern coverage: share of codebook entries observed present at least once
//    - mean pairwise Jaccard distance between sites' present-pattern sets
//      (high = sites are built from different parts of the codebook)
//    - per aesthetic field: normalized entropy of the consensus values
//    - redundancy: site pairs whose pattern sets are near-identical (Jaccard ≥ 0.8)

export function entropy(counts: number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (!n) return 0;
  return -counts.filter((c) => c > 0).reduce((h, c) => h + (c / n) * Math.log(c / n), 0);
}

export function diversity(values: string[], k?: number) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const cs = [...counts.values()];
  const n = values.length;
  const H = entropy(cs);
  const kk = k ?? counts.size;
  return {
    n,
    categories: counts.size,
    counts: Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1])),
    entropy: H,
    evenness: kk > 1 ? H / Math.log(kk) : 0,
    effectiveCategories: Math.exp(H),
    giniSimpson: n ? 1 - cs.reduce((a, c) => a + (c / n) ** 2, 0) : 0,
  };
}

export function jaccardDistance(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union ? 1 - inter / union : 0;
}

export function patternSetVariety(sets: Map<string, Set<string>>, codebookSize: number) {
  const ids = [...sets.keys()];
  const all = new Set([...sets.values()].flatMap((s) => [...s]));
  let sum = 0, pairs = 0;
  const redundant: [string, string, number][] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const d = jaccardDistance(sets.get(ids[i])!, sets.get(ids[j])!);
      sum += d;
      pairs++;
      if (1 - d >= 0.8) redundant.push([ids[i], ids[j], Math.round((1 - d) * 100) / 100]);
    }
  }
  return {
    sites: ids.length,
    patternsObserved: all.size,
    codebookCoverage: codebookSize ? all.size / codebookSize : 0,
    meanPairwiseJaccardDistance: pairs ? sum / pairs : null,
    nearDuplicatePairs: redundant,
  };
}
