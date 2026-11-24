export interface DiffTok { t: 'same' | 'add' | 'del'; s: string }

/** word-level diff (LCS) used to show what changed between v3 and the v4 draft */
export function diffWords(a: string, b: string): DiffTok[] {
  const x = a.split(/(\s+)/).filter(Boolean)
  const y = b.split(/(\s+)/).filter(Boolean)
  const n = x.length, m = y.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: DiffTok[] = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ t: 'same', s: x[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: 'del', s: x[i] }); i++ }
    else { out.push({ t: 'add', s: y[j] }); j++ }
  }
  while (i < n) out.push({ t: 'del', s: x[i++] })
  while (j < m) out.push({ t: 'add', s: y[j++] })
  return out
}
