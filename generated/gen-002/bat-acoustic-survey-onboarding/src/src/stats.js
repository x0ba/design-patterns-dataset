import { FILES, DETECTORS, reasonOf, REASON_ORDER, LABEL_ORDER } from './data.js';

export const REASON_COLORS = {
  calls: '#c9801f', sub: '#e6b95c', lowfreq: '#b3a98f', insect: '#5c8d6c', other: '#8a9390',
};

// Summarise the whole project for a set of filter settings.
export function summarize(settings, base) {
  const out = {
    n: FILES.length, noise: 0, labels: {}, det: {}, reasons: {}, bySr: {},
    recovered: 0, newlyRejected: 0, lostByLabel: {},
  };
  LABEL_ORDER.forEach((k) => (out.labels[k] = 0));
  REASON_ORDER.forEach((k) => (out.reasons[k] = 0));
  DETECTORS.forEach((d) => {
    out.det[d.id] = { n: 0, noise: 0, reasons: Object.fromEntries(REASON_ORDER.map((k) => [k, 0])) };
  });
  for (const f of FILES) {
    const r = reasonOf(f, settings);
    const label = r ? 'noise' : f.latent;
    out.labels[label]++;
    const d = out.det[f.det];
    d.n++;
    out.bySr[f.sr] ??= { n: 0, noise: 0, dets: new Set() };
    out.bySr[f.sr].n++;
    out.bySr[f.sr].dets.add(f.det);
    if (r) {
      out.noise++; d.noise++; d.reasons[r]++; out.reasons[r]++; out.bySr[f.sr].noise++;
    }
    if (base) {
      const rb = reasonOf(f, base);
      if (rb && !r) out.recovered++;
      if (!rb && r) {
        out.newlyRejected++;
        out.lostByLabel[f.latent] = (out.lostByLabel[f.latent] || 0) + 1;
      }
    }
  }
  return out;
}

export function sameSettings(a, b) {
  return a.thr === b.thr && a.minCalls === b.minCalls && a.minFreq === b.minFreq;
}
