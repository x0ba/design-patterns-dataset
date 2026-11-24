import { DIMS, DimKey, FUNNEL, GROUP_LABEL, GROUPS, M_OCT26, M_SEP26, REASONS, WAVE_SHORT, WAVE_SEND, fmtDay } from './data';
import { fmt, fmtSigned, pct, rate, times } from './format';
import { Overview, Settings, SegmentRow, contextLine, segments, waveWeekly, WEEK0, baselineShort } from './model';

export interface Finding { kind: 'finding' | 'question'; title: string; body: string; source: string; context: string; key?: string }

export function topReasons(ov: Overview, group: string, n = 3) {
  return REASONS.map((r, i) => ({ r, i, e: ov.excessR[i] }))
    .filter((x) => x.r.group === group && x.e > 0.5)
    .sort((a, b) => b.e - a.e)
    .slice(0, n);
}

export function splitShares(ov: Overview) {
  const pos = ov.excessG.map((v) => Math.max(0, v));
  const t = pos.reduce((a, b) => a + b, 0);
  return pos.map((v) => (t > 0 ? v / t : 0));
}

export function driversFinding(s: Settings, ov: Overview): Finding {
  const sh = splitShares(ov);
  const lead = topReasons(ov, 'deliberate', 2).map((x) => `${x.r.code} ${fmtSigned(x.e)}`).join(', ');
  const body =
    ov.excessTotal > 0
      ? `Sep–Oct had ${fmt(ov.total[M_SEP26] + ov.total[M_OCT26])} cancellations, ${fmt(ov.excessTotal)} above the ${baselineShort(s.baseline)} baseline. ` +
        `${fmt(ov.excessG[0])} (${pct(sh[0])}) were deliberate${lead ? ` (${lead})` : ''}; ` +
        `${fmt(ov.excessG[1])} (${pct(sh[1])}) were payment lapses; ${fmt(ov.excessG[2])} (${pct(sh[2])}) were program or admin closures.`
      : `Sep–Oct cancellations for this selection are not above the ${baselineShort(s.baseline)} baseline.`;
  return { kind: 'finding', key: 'drivers', title: 'Where the extra cancellations came from', body, source: 'Drivers', context: contextLine(s) };
}

export function seasonFinding(ov: Overview, s: Settings): Finding {
  return {
    kind: 'finding',
    key: 'season',
    title: 'Not a seasonal pattern',
    body: `Sep and Oct 2025 had ${fmt(ov.total[8])} and ${fmt(ov.total[9])} cancellations. Sep and Oct 2026 had ${fmt(ov.total[M_SEP26])} and ${fmt(ov.total[M_OCT26])}.`,
    source: 'Drivers',
    context: contextLine(s),
  };
}

export function overlapFinding(ov: Overview, s: Settings): Finding {
  const n = ov.overlap[M_SEP26] + ov.overlap[M_OCT26];
  const top = REASONS.map((r, i) => ({ r, v: ov.overlapByReason[i] })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3);
  return {
    kind: 'question',
    key: 'overlap',
    title: `${fmt(n)} sponsors sit in both buckets`,
    body: `Their card failed after the Aug 18 migration and they then cancelled giving a deliberate reason (${top.map((x) => `${x.r.code} ${fmt(x.v)}`).join(', ')}). Currently counted as ${s.attribution === 'stated' ? 'their stated reason' : 'payment lapses'}.`,
    source: 'Drivers',
    context: contextLine(s),
  };
}

export function segmentInsight(rows: SegmentRow[], dimLabel: string) {
  const eligible = rows.filter((r) => r.active >= 1000);
  const by = (g: number) => [...eligible].sort((a, b) => b.excessRate[g] - a.excessRate[g]);
  const d = by(0), p = by(1);
  if (!d.length) return null;
  const dHi = d[0], dLo = d[d.length - 1], pHi = p[0], pLo = p[p.length - 1];
  const ratio = (hi: number, lo: number) => (lo > 0.05 ? times(hi / lo) : null);
  // the extremes of many noisy segments differ by chance, so demand more as the number of segments grows
  const z = eligible.length > 6 ? 3.2 : eligible.length > 3 ? 2.4 : 1.96;
  const sig = (hi: SegmentRow, lo: SegmentRow, g: number) => hi.excessRate[g] - lo.excessRate[g] > z * Math.hypot(hi.noise[g], lo.noise[g]);
  return {
    dHi, dLo, pHi, pLo, dSig: sig(dHi, dLo, 0), pSig: sig(pHi, pLo, 1),
    dRatio: ratio(dHi.excessRate[0], dLo.excessRate[0]),
    pRatio: ratio(pHi.excessRate[1], pLo.excessRate[1]),
    dimLabel,
  };
}

export function segmentFinding(s: Settings, dim: DimKey): Finding {
  const d = DIMS.find((x) => x.key === dim)!;
  const { rows } = segments(s, dim);
  const ins = segmentInsight(rows, d.label)!;
  const plural = d.plural;
  const body = !ins.dSig && !ins.pSig
    ? `No ${d.label.toLowerCase()} stands out: differences between ${plural} are within normal month-to-month variation for both deliberate cancellations and payment lapses.`
    : `Deliberate: ${ins.dSig ? '' : '(within normal variation) '}${ins.dHi.label} ${rate(ins.dHi.excessRate[0])} extra per 1,000 a month vs ${ins.dLo.label} ${rate(ins.dLo.excessRate[0])}${ins.dRatio ? ` (${ins.dRatio})` : ''}. ` +
    `Payment lapses: ${ins.pSig ? '' : '(within normal variation) '}${ins.pHi.label} ${rate(ins.pHi.excessRate[1])} vs ${ins.pLo.label} ${rate(ins.pLo.excessRate[1])}${ins.pRatio ? ` (${ins.pRatio})` : ''}.`;
  const title = dim === 't' ? 'Long-tenured and new sponsors left for different reasons' : `How ${d.plural} reacted`;
  return { kind: 'finding', key: `seg-${dim}`, title, body, source: 'Segments', context: contextLine(s) };
}

export function waveFinding(s: Settings): Finding {
  const w = waveWeekly(s, 'price');
  const wk = Math.floor((WAVE_SEND[2] - WEEK0) / 7) - 1; // week before wave 3 letter
  const summer = w.rates[2].slice(0, 4).reduce((a, b) => a + b, 0) / 4;
  return {
    kind: 'finding',
    key: 'wave',
    title: 'Each wave cancelled only after its own letter',
    body:
      `Week of ${fmtDay(WEEK0 + wk * 7)}: ${WAVE_SHORT[1]} sponsors (letter Aug 25) cancelled for PRICE-INCREASE at ${rate(w.rates[1][wk])} per 10,000. ` +
      `${WAVE_SHORT[2]} sponsors, not yet told, were at ${rate(w.rates[2][wk])}, close to their summer level of ${rate(summer)}. They rose only after the Sep 15 letter. The letters caused the deliberate jump, not something else that happened at the same time.`,
    source: 'Timing',
    context: contextLine(s),
  };
}

export function paymentFinding(): Finding {
  return {
    kind: 'finding',
    key: 'payment',
    title: 'Payment lapses have not peaked',
    body: `${fmt(FUNNEL.charges)} card charges failed after the Aug 18 migration and ${fmt(FUNNEL.recovered)} were recovered. ${fmt(FUNNEL.open)} sponsorships still have an unpaid charge (${fmt(FUNNEL.pending)} are past 45 days). At current recovery rates, expect about 1,000–1,300 more payment lapses in Nov–Dec unless outreach recovers them.`,
    source: 'Payment failures',
    context: `All sponsors · failed charges through Nov 15`,
  };
}

export { GROUP_LABEL, GROUPS };
