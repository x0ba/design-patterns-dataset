// Codebook validation: JSON Schema + cross-reference checks (README "Rules" §2).

import fs from 'node:fs';
import path from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { P } from '../paths.ts';
import { readAtlasMeta, readPatternFiles, readVersion, type LoadedFile } from './io.ts';
import type { AtlasMeta, PatternEntry } from './types.ts';

export interface Problem { file: string; message: string }

export function patternValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(JSON.parse(fs.readFileSync(P.patternSchema, 'utf8')));
}

/**
 * Validate a set of entries. `known` lets proposals be checked against the
 * frozen codebook (their related/parent ids may point at existing entries).
 */
export function validateEntries(
  files: LoadedFile<PatternEntry>[],
  meta: AtlasMeta,
  opts: { previewsDir?: string; known?: Map<string, PatternEntry>; checkFilename?: boolean } = {},
): Problem[] {
  const problems: Problem[] = [];
  const add = (file: string, message: string) => problems.push({ file: path.relative(P.root, file), message });
  const validate = patternValidator();
  const previewsDir = opts.previewsDir ?? P.previews;
  const checkFilename = opts.checkFilename ?? true;

  const ids = new Map<string, string>();
  for (const f of files) {
    if (!f.data || typeof f.data !== 'object') { add(f.file, 'not a YAML mapping'); continue; }
    if (!validate(f.data)) {
      for (const e of validate.errors ?? []) add(f.file, `schema: ${e.instancePath || '/'} ${e.message}${e.params && 'additionalProperty' in e.params ? ` (${(e.params as any).additionalProperty})` : ''}`);
    }
    const id = f.data.id;
    if (ids.has(id)) add(f.file, `duplicate id "${id}" (also in ${path.relative(P.root, ids.get(id)!)})`);
    ids.set(id, f.file);
    if (checkFilename && path.basename(f.file).replace(/\.ya?ml$/, '') !== id) add(f.file, `filename does not match id "${id}"`);
  }

  const all = new Map<string, PatternEntry>(opts.known ?? []);
  for (const f of files) if (f.data?.id) all.set(f.data.id, f.data);
  const archetypes = new Set(meta.archetypes.map((a) => a.id));
  const families = new Set(meta.families.map((x) => x.id));

  for (const { file, data: e } of files) {
    if (!e?.id) continue;
    if (e.level !== 'archetype') {
      if (!e.parent) add(file, 'missing parent');
      else if (!all.has(e.parent)) add(file, `parent "${e.parent}" does not exist`);
      else if (all.get(e.parent)!.level !== 'archetype') add(file, `parent "${e.parent}" is not an archetype`);
    } else if (!archetypes.has(e.id)) {
      add(file, `archetype "${e.id}" is not listed in codebook/atlas/archetypes.yaml`);
    }
    for (const kind of ['uses', 'specializes', 'neighbors'] as const) {
      for (const r of e.relations?.[kind] ?? []) {
        if (!all.has(r)) add(file, `relations.${kind}: "${r}" does not exist`);
        else if (r === e.id) add(file, `relations.${kind}: entry relates to itself`);
      }
    }
    if (e.replacedBy && !all.has(e.replacedBy)) add(file, `replacedBy "${e.replacedBy}" does not exist`);

    const subs = new Map<string, Set<string>>();
    for (const d of e.dimensions ?? []) {
      if (!families.has(d.family)) add(file, `dimension "${d.name}": unknown family "${d.family}"`);
      for (const s of d.subdimensions ?? []) {
        if (subs.has(s.id)) add(file, `duplicate sub-dimension id "${s.id}"`);
        const vals = new Set<string>();
        for (const v of s.values ?? []) {
          if (vals.has(v.id)) add(file, `sub-dimension "${s.id}": duplicate value id "${v.id}"`);
          vals.add(v.id);
        }
        subs.set(s.id, vals);
      }
    }
    const dimNames = new Set((e.dimensions ?? []).map((d) => d.name));
    for (const t of e.techniques ?? []) {
      if (!dimNames.has(t.dimension)) add(file, `technique "${t.name}": dimension "${t.dimension}" is not a dimension of this entry`);
    }
    for (const pv of e.previews ?? []) {
      if (!fs.existsSync(path.join(previewsDir, pv.file))) add(file, `preview file missing: ${pv.file}`);
      for (const [k, v] of Object.entries(pv.dims ?? {})) {
        if (!subs.has(k)) add(file, `preview ${pv.file}: dims.${k} is not a declared sub-dimension`);
        else if (!subs.get(k)!.has(v)) add(file, `preview ${pv.file}: dims.${k}="${v}" is not a declared value of "${k}"`);
      }
    }
    for (const s of e.sources ?? []) {
      if (s.paper && !meta.papers.some((p) => p.key === s.paper)) add(file, `source paper "${s.paper}" is not in atlas/meta.yaml papers`);
    }
  }
  return problems;
}

export function validateCodebook(): Problem[] {
  const problems: Problem[] = [];
  let version = '';
  try {
    version = readVersion();
    if (!/^\d+\.\d+\.\d+$/.test(version)) problems.push({ file: 'codebook/VERSION', message: `not semver: "${version}"` });
  } catch {
    problems.push({ file: 'codebook/VERSION', message: 'missing' });
  }
  const meta = readAtlasMeta();
  const files = readPatternFiles();
  problems.push(...validateEntries(files, meta));

  const famIds = meta.families.map((f) => f.id);
  if (new Set(famIds).size !== famIds.length) problems.push({ file: 'codebook/atlas/families.yaml', message: 'duplicate family id' });
  const ids = new Set(files.map((f) => f.data.id));
  for (const a of meta.archetypes) {
    if (!ids.has(a.id)) problems.push({ file: 'codebook/atlas/archetypes.yaml', message: `archetype "${a.id}" has no entry file` });
  }
  meta.crosswalk.rows.forEach((r, i) => {
    if (!ids.has(r.mapsTo)) problems.push({ file: 'codebook/atlas/crosswalk.yaml', message: `rows[${i}].mapsTo "${r.mapsTo}" does not exist` });
  });
  // orphan previews are not errors, but worth knowing about
  const referenced = new Set(files.flatMap((f) => (f.data.previews ?? []).map((p) => p.file)));
  for (const svg of fs.readdirSync(P.previews)) {
    if (!referenced.has(svg)) console.warn(`warn: codebook/previews/${svg} is not referenced by any entry`);
  }
  for (const f of files) {
    if (f.data.addedIn && version && cmpSemver(f.data.addedIn, version) > 0) {
      problems.push({ file: path.relative(P.root, f.file), message: `addedIn ${f.data.addedIn} is newer than VERSION ${version}` });
    }
  }
  return problems;
}

export function cmpSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}
