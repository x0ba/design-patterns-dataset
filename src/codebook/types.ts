// Types for the codebook in its two shapes:
//
//  - `Pattern*` — the editable, one-file-per-entry YAML shape in codebook/patterns/.
//  - `Atlas*`   — the compact shape embedded in the original atlas.html (`atlas-json`),
//                 which the atlas page's own scripts read. Kept so the regenerated
//                 atlas behaves exactly like the original.
//
// src/codebook/convert.ts maps between them losslessly.

export type Level = 'archetype' | 'pattern' | 'component';
export type Select = 'one' | 'many';

// ---------------------------------------------------------------- YAML shape

export interface PatternValue {
  id: string; // kebab-case, unique within its sub-dimension
  name: string;
  description?: string;
  example?: string;
  group?: string;
}

export interface PatternSubdimension {
  id: string; // the atlas `key`; unique within the entry
  name: string;
  select: Select;
  note?: string;
  values: PatternValue[];
}

export interface PatternDimension {
  name: string;
  family: string;
  question: string;
  origin?: string;
  subdimensions: PatternSubdimension[];
}

export interface PatternPreview {
  file: string;
  dims?: Record<string, string>;
}

export interface PatternSource {
  url?: string;
  paper?: string; // key into codebook/atlas/meta.yaml papers
  batch?: string;
  site?: string;
  note?: string;
}

export interface PatternEntry {
  id: string;
  name: string;
  level: Level;
  parent?: string; // archetype id; absent on archetype-level entries
  aliases: string[];
  definition: string;
  data: string;
  platforms: string[];
  domains: string[];
  anatomy: { name: string; role: string }[];
  roles: string[];
  dimensions: PatternDimension[];
  wild: { score: number; note: string; examples: { name: string; note: string }[] };
  techniques: { name: string; dimension: string; how: string; ai: boolean }[];
  signature: string;
  sample: string;
  unit: string;
  relations: { uses: string[]; specializes: string[]; neighbors: string[] };
  scores: { ubiquity: number; potential: number; spec: number };
  evidence: string;
  usage: string[];
  questions: string[];
  coding?: Record<string, unknown>;
  previews: PatternPreview[];
  sources: PatternSource[];
  addedIn: string;
  deprecated?: boolean;
  replacedBy?: string;
}

// --------------------------------------------------------------- atlas shape

export type AtlasVar = [string, string, string] | [string, string, string, string];

export interface AtlasSub {
  name: string;
  key: string;
  sel: Select;
  note?: string;
  vars: AtlasVar[];
}

export interface AtlasDim {
  name: string;
  family: string;
  origin?: string;
  q: string;
  subs: AtlasSub[];
}

export interface AtlasMetrics {
  dimCount: number;
  subCount: number;
  varCount: number;
  families: string[];
  familyProfile: string;
  malleabilityGap: number;
  configSpace: number;
  log10Config: number;
}

export interface AtlasEntry {
  id: string;
  name: string;
  level: Level;
  archetype: string;
  aliases: string[];
  def: string;
  data: string;
  platforms: string[];
  domains: string[];
  components: [string, string][];
  roles: string[];
  dims: AtlasDim[];
  wild: { score: number; note: string; examples: [string, string][] };
  techniques: { name: string; dim: string; how: string; ai: boolean }[];
  signature: string;
  sample: string;
  unit: string;
  relations: { uses: string[]; specializes: string[]; neighbors: string[] };
  scores: { ubiquity: number; potential: number; spec: number };
  evidence: string;
  usage: string[];
  questions: string[];
  coding?: any;
  sources?: string[];
  metrics: AtlasMetrics;
}

export interface Family { id: string; name: string; def: string; q: string; origin: string }
export interface LevelDef { id: Level; name: string; glyph: string; def: string }
export interface Archetype { id: string; name: string; def: string; q: string }
export interface Paper { key: string; cite: string; doi: string }
export interface MethodStage { n: number; id: string; name: string; goal: string; needsPeople: boolean; [k: string]: unknown }
export interface CrosswalkRow { lib: string; entry: string; mapsTo: string; as: string; where?: string }

/** Atlas-wide data that is not a pattern entry (codebook/atlas/*.yaml). */
export interface AtlasMeta {
  about: string;
  thesis: string;
  papers: Paper[];
  taxonomy: { about: string; evidence: Record<string, string> };
  families: Family[];
  levels: LevelDef[];
  archetypes: Archetype[];
  method: { stages: MethodStage[] };
  crosswalk: { about: string; libraries: { id: string; name: string }[]; rows: CrosswalkRow[] };
}

export interface AtlasDoc {
  about: string;
  generatedAt: string;
  papers: Paper[];
  thesis: string;
  stats: {
    entries: number;
    byLevel: Record<string, number>;
    dims: number;
    subs: number;
    vars: number;
    byFamily: Record<string, number>;
  };
  taxonomy: { about: string; levelIds: string[]; archetypeIds: string[]; familyIds: string[]; evidence: Record<string, string> };
  families: Family[];
  levels: LevelDef[];
  archetypes: Archetype[];
  method: { stageIds: string[]; stages: MethodStage[] };
  crosswalk: { about: string; libraries: { id: string; name: string }[]; rowCount: number; rows: CrosswalkRow[] };
  entries: AtlasEntry[];
}

/** A fully loaded codebook: what build/validate/agents work from. */
export interface Codebook {
  version: string;
  meta: AtlasMeta;
  entries: PatternEntry[]; // in canonical order (see orderEntries)
}
