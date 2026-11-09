// Krippendorff's alpha for any number of raters, with missing values, via the
// coincidence-matrix formulation (Krippendorff 2011, "Computing Krippendorff's
// Alpha-Reliability").
//
//   alpha = 1 - (n - 1) * Σ_ck o_ck δ²_ck / Σ_ck n_c n_k δ²_ck
//
// Units with fewer than two values are not pairable and are ignored.

export type Metric = 'nominal' | 'ordinal' | 'interval';
export type Value = string | number | null | undefined;

export interface AlphaResult {
  alpha: number | null; // null when undefined (no pairable values, or no variation at all)
  units: number; // pairable units
  pairable: number; // n: total pairable values
  observedDisagreement: number;
  expectedDisagreement: number;
  /** Share of pairable rater pairs within units that agree exactly. */
  pairwiseAgreement: number | null;
  note?: string;
}

export function krippendorffAlpha(units: Value[][], metric: Metric, order?: readonly (string | number)[]): AlphaResult {
  const o = new Map<string, Map<string, number>>();
  const keyOf = (v: string | number) => (typeof v === 'number' ? `n:${v}` : `s:${v}`);
  const valOf = new Map<string, string | number>();
  let pairableUnits = 0, agreePairs = 0, totalPairs = 0;

  for (const unit of units) {
    const vals = unit.filter((v): v is string | number => v !== null && v !== undefined);
    const m = vals.length;
    if (m < 2) continue;
    pairableUnits++;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        if (i === j) continue;
        const a = keyOf(vals[i]), b = keyOf(vals[j]);
        valOf.set(a, vals[i]);
        valOf.set(b, vals[j]);
        if (!o.has(a)) o.set(a, new Map());
        o.get(a)!.set(b, (o.get(a)!.get(b) ?? 0) + 1 / (m - 1));
        if (i < j) { totalPairs++; if (a === b) agreePairs++; }
      }
    }
  }

  const cats = [...valOf.keys()];
  const nc = new Map(cats.map((c) => [c, [...(o.get(c)?.values() ?? [])].reduce((s, x) => s + x, 0)]));
  const n = [...nc.values()].reduce((s, x) => s + x, 0);
  const base = { units: pairableUnits, pairable: Math.round(n), pairwiseAgreement: totalPairs ? agreePairs / totalPairs : null };
  if (n <= 1) return { alpha: null, observedDisagreement: 0, expectedDisagreement: 0, ...base, note: 'no pairable values' };

  let delta2: (a: string, b: string) => number;
  if (metric === 'nominal') {
    delta2 = (a, b) => (a === b ? 0 : 1);
  } else if (metric === 'interval') {
    delta2 = (a, b) => ((valOf.get(a) as number) - (valOf.get(b) as number)) ** 2;
  } else {
    if (!order) throw new Error('ordinal metric needs an order');
    const rank = new Map(order.map((v, i) => [keyOf(v), i]));
    for (const c of cats) if (!rank.has(c)) throw new Error(`value ${valOf.get(c)} is not in the ordinal order`);
    const byRank = [...order.map(keyOf)];
    delta2 = (a, b) => {
      if (a === b) return 0;
      let [lo, hi] = [rank.get(a)!, rank.get(b)!];
      if (lo > hi) [lo, hi] = [hi, lo];
      let s = 0;
      for (let g = lo; g <= hi; g++) s += nc.get(byRank[g]) ?? 0;
      return (s - ((nc.get(a) ?? 0) + (nc.get(b) ?? 0)) / 2) ** 2;
    };
  }

  let Do = 0, De = 0;
  for (const c of cats) {
    for (const k of cats) {
      const d = delta2(c, k);
      if (!d) continue;
      Do += (o.get(c)?.get(k) ?? 0) * d;
      De += nc.get(c)! * nc.get(k)! * d;
    }
  }
  Do /= n;
  De /= n * (n - 1);
  if (De === 0) {
    return { alpha: null, observedDisagreement: Do, expectedDisagreement: 0, ...base, note: 'no variation: every rater used the same value everywhere' };
  }
  return { alpha: 1 - Do / De, observedDisagreement: Do, expectedDisagreement: De, ...base };
}
