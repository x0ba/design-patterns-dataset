// Small deterministic random helpers. The mock dataset must be identical on every load,
// so every random draw in the generator goes through a seeded generator.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rng: Rng): number {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Poisson draw. Knuth for small means, normal approximation for large ones. */
export function poisson(rng: Rng, mean: number): number {
  if (mean <= 0) return 0;
  if (mean < 40) {
    const limit = Math.exp(-mean);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > limit);
    return k - 1;
  }
  return Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss(rng)));
}

export function hex(rng: Rng, digits: number): string {
  let s = '';
  for (let i = 0; i < digits; i++) s += Math.floor(rng() * 16).toString(16);
  return s;
}
