// Lossless conversion between the atlas JSON shape and the YAML entry shape,
// plus the derived values (metrics, stats, ordering) that the YAML deliberately
// does not store, so they can never go stale.

import type {
  AtlasDim, AtlasDoc, AtlasEntry, AtlasMeta, AtlasMetrics, AtlasVar, Codebook,
  PatternDimension, PatternEntry, PatternSource,
} from './types.ts';

export const SEED_SOURCE_NOTE = 'Seed entry from the original Pattern Atlas (codebook.html)';
const LEVEL_ORDER = { archetype: 0, pattern: 1, component: 2 } as const;

export function slugify(s: string): string {
  const slug = s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'value';
}

/** Assign kebab-case ids to names, de-duplicating with -2, -3… */
export function uniqueSlugs(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const base = slugify(n);
    const k = (seen.get(base) ?? 0) + 1;
    seen.set(base, k);
    return k === 1 ? base : `${base}-${k}`;
  });
}

// ----------------------------------------------------------- atlas -> YAML

export function atlasToPattern(e: AtlasEntry, version: string): PatternEntry {
  const sources: PatternSource[] = [
    ...(e.sources ?? []).map((paper) => ({ paper })),
    { note: SEED_SOURCE_NOTE },
  ];
  const out: PatternEntry = {
    id: e.id,
    name: e.name,
    level: e.level,
    ...(e.level === 'archetype' ? {} : { parent: e.archetype }),
    aliases: e.aliases,
    definition: e.def,
    data: e.data,
    platforms: e.platforms,
    domains: e.domains,
    anatomy: e.components.map(([name, role]) => ({ name, role })),
    roles: e.roles,
    dimensions: e.dims.map(dimToPattern),
    wild: { score: e.wild.score, note: e.wild.note, examples: e.wild.examples.map(([name, note]) => ({ name, note })) },
    techniques: e.techniques.map((t) => ({ name: t.name, dimension: t.dim, how: t.how, ai: t.ai })),
    signature: e.signature,
    sample: e.sample,
    unit: e.unit,
    relations: e.relations,
    scores: e.scores,
    evidence: e.evidence,
    usage: e.usage,
    questions: e.questions,
    ...(e.coding === undefined ? {} : { coding: e.coding }),
    previews: [{ file: `${e.id}.svg` }],
    sources,
    addedIn: version,
  };
  return out;
}

function dimToPattern(d: AtlasDim): PatternDimension {
  return {
    name: d.name,
    family: d.family,
    question: d.q,
    ...(d.origin === undefined ? {} : { origin: d.origin }),
    subdimensions: d.subs.map((s) => {
      const ids = uniqueSlugs(s.vars.map((v) => v[0]));
      return {
        id: s.key,
        name: s.name,
        select: s.sel,
        ...(s.note === undefined ? {} : { note: s.note }),
        values: s.vars.map((v, i) => ({
          id: ids[i],
          name: v[0],
          ...(v[1] ? { description: v[1] } : {}),
          ...(v[2] ? { example: v[2] } : {}),
          ...(v.length > 3 ? { group: v[3] } : {}),
        })),
      };
    }),
  };
}

// ----------------------------------------------------------- YAML -> atlas

export function patternToAtlas(p: PatternEntry, familyIds: string[]): AtlasEntry {
  const dims: AtlasDim[] = p.dimensions.map((d) => ({
    name: d.name,
    family: d.family,
    ...(d.origin === undefined ? {} : { origin: d.origin }),
    q: d.question,
    subs: d.subdimensions.map((s) => ({
      name: s.name,
      key: s.id,
      sel: s.select,
      ...(s.note === undefined ? {} : { note: s.note }),
      vars: s.values.map((v): AtlasVar => {
        const base: [string, string, string] = [v.name, v.description ?? '', v.example ?? ''];
        return v.group === undefined ? base : [...base, v.group];
      }),
    })),
  }));
  const papers = p.sources.filter((s) => s.paper).map((s) => s.paper!);
  const e: AtlasEntry = {
    id: p.id,
    name: p.name,
    level: p.level,
    archetype: p.level === 'archetype' ? p.id : p.parent!,
    aliases: p.aliases,
    def: p.definition,
    data: p.data,
    platforms: p.platforms,
    domains: p.domains,
    components: p.anatomy.map((c) => [c.name, c.role]),
    roles: p.roles,
    dims,
    wild: { score: p.wild.score, note: p.wild.note, examples: p.wild.examples.map((x) => [x.name, x.note]) },
    techniques: p.techniques.map((t) => ({ name: t.name, dim: t.dimension, how: t.how, ai: t.ai })),
    signature: p.signature,
    sample: p.sample,
    unit: p.unit,
    relations: p.relations,
    scores: p.scores,
    evidence: p.evidence,
    usage: p.usage,
    questions: p.questions,
    ...(p.coding === undefined ? {} : { coding: p.coding }),
    ...(papers.length ? { sources: papers } : {}),
    metrics: undefined as unknown as AtlasMetrics,
  };
  e.metrics = computeMetrics(e, familyIds);
  return e;
}

// ----------------------------------------------------------------- derived

/**
 * Metrics shown on atlas cards. All derivable — verified against all 119
 * entries of the original atlas:
 *   configSpace = Π (n for single-select, 2^n for multi-select)
 *   malleabilityGap = potential − wild − 1
 */
export function computeMetrics(e: Pick<AtlasEntry, 'dims' | 'scores' | 'wild'>, familyIds: string[]): AtlasMetrics {
  const subs = e.dims.flatMap((d) => d.subs);
  const configSpace = subs.reduce((acc, s) => acc * (s.sel === 'many' ? 2 ** s.vars.length : s.vars.length), 1);
  const families = [...new Set(e.dims.map((d) => d.family))];
  return {
    dimCount: e.dims.length,
    subCount: subs.length,
    varCount: subs.reduce((a, s) => a + s.vars.length, 0),
    families,
    familyProfile: familyIds.map((f) => (families.includes(f) ? '1' : '0')).join(''),
    malleabilityGap: e.scores.potential - e.wild.score - 1,
    configSpace,
    log10Config: Math.log10(configSpace),
  };
}

/** Canonical entry order: archetype id, then level, then id (matches the original). */
export function orderEntries<T extends { id: string; level: keyof typeof LEVEL_ORDER }>(
  entries: T[],
  archetypeOf: (e: T) => string,
): T[] {
  return [...entries].sort((a, b) =>
    archetypeOf(a).localeCompare(archetypeOf(b)) ||
    LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
    a.id.localeCompare(b.id));
}

export const archetypeOf = (p: PatternEntry) => (p.level === 'archetype' ? p.id : p.parent ?? '');

export function buildAtlasDoc(cb: Codebook, generatedAt: string): AtlasDoc {
  const m = cb.meta;
  const familyIds = m.families.map((f) => f.id);
  const live = cb.entries.filter((e) => !e.deprecated);
  const entries = orderEntries(live, archetypeOf).map((p) => patternToAtlas(p, familyIds));
  const byLevel: Record<string, number> = Object.fromEntries(m.levels.map((l) => [l.id, 0]));
  const byFamily: Record<string, number> = Object.fromEntries(familyIds.map((f) => [f, 0]));
  for (const e of entries) {
    byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;
    for (const d of e.dims) byFamily[d.family] = (byFamily[d.family] ?? 0) + 1;
  }
  return {
    about: m.about,
    generatedAt,
    papers: m.papers,
    thesis: m.thesis,
    stats: {
      entries: entries.length,
      byLevel,
      dims: entries.reduce((a, e) => a + e.metrics.dimCount, 0),
      subs: entries.reduce((a, e) => a + e.metrics.subCount, 0),
      vars: entries.reduce((a, e) => a + e.metrics.varCount, 0),
      byFamily,
    },
    taxonomy: {
      about: m.taxonomy.about,
      levelIds: m.levels.map((l) => l.id),
      archetypeIds: m.archetypes.map((a) => a.id),
      familyIds,
      evidence: m.taxonomy.evidence,
    },
    families: m.families,
    levels: m.levels,
    archetypes: m.archetypes,
    method: { stageIds: m.method.stages.map((s) => s.id), stages: m.method.stages },
    crosswalk: { about: m.crosswalk.about, libraries: m.crosswalk.libraries, rowCount: m.crosswalk.rows.length, rows: m.crosswalk.rows },
    entries,
  };
}

export function atlasDocToMeta(d: AtlasDoc): AtlasMeta {
  return {
    about: d.about,
    thesis: d.thesis,
    papers: d.papers,
    taxonomy: { about: d.taxonomy.about, evidence: d.taxonomy.evidence },
    families: d.families,
    levels: d.levels,
    archetypes: d.archetypes,
    method: { stages: d.method.stages },
    crosswalk: { about: d.crosswalk.about, libraries: d.crosswalk.libraries, rows: d.crosswalk.rows },
  };
}

/** Structural deep-equal; returns the first differing path, or null. */
export function firstDiff(a: unknown, b: unknown, path = '$'): string | null {
  if (a === b) return null;
  if (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
    return `${path}: ${JSON.stringify(a)?.slice(0, 120)} != ${JSON.stringify(b)?.slice(0, 120)}`;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array/object mismatch`;
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  for (const k of new Set([...ka, ...kb])) {
    const d = firstDiff((a as any)[k], (b as any)[k], Array.isArray(a) ? `${path}[${k}]` : `${path}.${k}`);
    if (d) return d;
  }
  return null;
}
