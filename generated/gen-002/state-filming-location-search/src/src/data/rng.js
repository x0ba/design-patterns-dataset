export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function makeRand(seed) {
  const r = mulberry32(seed)
  const api = {
    f: r,
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
    weighted(pairs) {
      const total = pairs.reduce((s, p) => s + p[1], 0)
      let x = r() * total
      for (const [v, w] of pairs) { if ((x -= w) <= 0) return v }
      return pairs[pairs.length - 1][0]
    },
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
      return a
    },
  }
  return api
}
export function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
