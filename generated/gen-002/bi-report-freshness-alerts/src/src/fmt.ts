/** Signed percentage with a true minus sign, e.g. −41.0% / +1.8% */
export const pct = (n: number, digits = 1, plus = false) => {
  const s = Math.abs(n).toFixed(digits)
  return `${n < 0 ? '−' : plus && n > 0 ? '+' : ''}${s}%`
}
