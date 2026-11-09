// dist/codebook.json — the only codebook file labeling agents and the console read.

import { archetypeOf, computeMetrics, orderEntries, patternToAtlas } from './convert.ts';
import type { Codebook, PatternEntry } from './types.ts';

export interface BundleEntry extends Omit<PatternEntry, 'previews'> {
  previews: { path: string; dims?: Record<string, string> }[];
  metrics: ReturnType<typeof computeMetrics>;
}

export interface CodebookBundle {
  version: string;
  generatedAt: string;
  about: string;
  families: Codebook['meta']['families'];
  levels: Codebook['meta']['levels'];
  archetypes: Codebook['meta']['archetypes'];
  papers: Codebook['meta']['papers'];
  entries: BundleEntry[];
}

export function buildBundle(cb: Codebook, generatedAt: string): CodebookBundle {
  const familyIds = cb.meta.families.map((f) => f.id);
  return {
    version: cb.version,
    generatedAt,
    about: cb.meta.about,
    families: cb.meta.families,
    levels: cb.meta.levels,
    archetypes: cb.meta.archetypes,
    papers: cb.meta.papers,
    // Deprecated entries stay in the bundle so older labels still resolve.
    entries: orderEntries(cb.entries, archetypeOf).map((e) => ({
      ...e,
      previews: e.previews.map((p) => ({ path: `previews/${p.file}`, ...(p.dims ? { dims: p.dims } : {}) })),
      metrics: patternToAtlas(e, familyIds).metrics,
    })),
  };
}
