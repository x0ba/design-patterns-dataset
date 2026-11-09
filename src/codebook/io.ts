import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { P } from '../paths.ts';
import type { AtlasMeta, Codebook, PatternEntry } from './types.ts';

export const ATLAS_META_FILES = ['meta', 'families', 'levels', 'archetypes', 'method', 'crosswalk'] as const;

export function readYaml<T>(file: string): T {
  return YAML.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function writeYaml(file: string, data: unknown, header?: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = YAML.stringify(data, { lineWidth: 100, minContentWidth: 40 });
  fs.writeFileSync(file, (header ? header.trimEnd() + '\n' : '') + body);
}

export function readVersion(): string {
  return fs.readFileSync(P.version, 'utf8').trim();
}

export function readAtlasMeta(dir = P.atlasMeta): AtlasMeta {
  const meta = readYaml<Pick<AtlasMeta, 'about' | 'thesis' | 'papers' | 'taxonomy'>>(path.join(dir, 'meta.yaml'));
  return {
    ...meta,
    families: readYaml(path.join(dir, 'families.yaml')),
    levels: readYaml(path.join(dir, 'levels.yaml')),
    archetypes: readYaml(path.join(dir, 'archetypes.yaml')),
    method: readYaml(path.join(dir, 'method.yaml')),
    crosswalk: readYaml(path.join(dir, 'crosswalk.yaml')),
  };
}

export function writeAtlasMeta(meta: AtlasMeta, dir = P.atlasMeta): void {
  writeYaml(path.join(dir, 'meta.yaml'), { about: meta.about, thesis: meta.thesis, papers: meta.papers, taxonomy: meta.taxonomy });
  writeYaml(path.join(dir, 'families.yaml'), meta.families, '# The twelve dimension families. Order here is the order used everywhere (profiles, matrix).');
  writeYaml(path.join(dir, 'levels.yaml'), meta.levels);
  writeYaml(path.join(dir, 'archetypes.yaml'), meta.archetypes, '# Archetype lanes. Order here is the lane order in the atlas.');
  writeYaml(path.join(dir, 'method.yaml'), meta.method);
  writeYaml(path.join(dir, 'crosswalk.yaml'), meta.crosswalk);
}

export interface LoadedFile<T> { file: string; data: T }

export function readPatternFiles(dir = P.patterns): LoadedFile<PatternEntry>[] {
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort()
    .map((f) => ({ file: path.join(dir, f), data: readYaml<PatternEntry>(path.join(dir, f)) }));
}

export function loadCodebook(): Codebook {
  return {
    version: readVersion(),
    meta: readAtlasMeta(),
    entries: readPatternFiles().map((f) => f.data),
  };
}

export const PATTERN_HEADER = (id: string) =>
  `# yaml-language-server: $schema=../schema/pattern.schema.json\n# Codebook entry "${id}". Edit between batches only — see README "Rules".`;
