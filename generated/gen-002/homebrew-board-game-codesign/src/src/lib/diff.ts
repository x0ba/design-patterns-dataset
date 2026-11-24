export type Op = { t: 'eq' | 'del' | 'ins'; s: string };

/** Word-level diff (LCS) that keeps whitespace tokens so text can be rendered pre-wrapped. */
export function diffWords(a: string, b: string): Op[] {
  const ta = a.split(/(\s+)/).filter((x) => x !== '');
  const tb = b.split(/(\s+)/).filter((x) => x !== '');
  const n = ta.length;
  const m = tb.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: Op[] = [];
  const push = (t: Op['t'], s: string) => {
    const last = ops[ops.length - 1];
    if (last && last.t === t) last.s += s;
    else ops.push({ t, s });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ta[i] === tb[j]) { push('eq', ta[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) push('del', ta[i++]);
    else push('ins', tb[j++]);
  }
  while (i < n) push('del', ta[i++]);
  while (j < m) push('ins', tb[j++]);
  return tidy(ops, Math.max(wordCount(a), wordCount(b)) > 50 ? 3 : 0);
}

/** On long passages, fold tiny shared fragments ("the", "to a") into the surrounding change so it reads as one edit. */
function tidy(ops: Op[], thr: number): Op[] {
  if (!thr) return ops;
  const out: Op[] = [];
  let del = '';
  let ins = '';
  const flush = () => {
    if (del) out.push({ t: 'del', s: del });
    if (ins) out.push({ t: 'ins', s: ins });
    del = ins = '';
  };
  ops.forEach((o, i) => {
    if (o.t === 'eq') {
      const sandwiched = i > 0 && i < ops.length - 1 && ops[i - 1].t !== 'eq' && ops[i + 1].t !== 'eq';
      if (sandwiched && wordCount(o.s) < thr) { del += o.s; ins += o.s; return; }
      flush();
      out.push(o);
    } else if (o.t === 'del') del += o.s;
    else ins += o.s;
  });
  flush();
  return out;
}

export const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
