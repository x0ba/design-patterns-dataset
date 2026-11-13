// The site label format (schema/label.schema.json) and its validator: JSON Schema
// plus the checks a schema cannot express (codebook ids, dimension values,
// bounding boxes inside the screenshot, region <-> pattern consistency).

import fs from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { P } from '../paths.ts';
import type { BundleEntry, CodebookBundle } from '../codebook/bundle.ts';

export type Status = 'present' | 'uncertain' | 'absent';
export interface BBox { x: number; y: number; width: number; height: number }

export interface LabelPattern {
  id: string;
  status: Status;
  confidence: number;
  evidence: { bbox?: BBox; region?: string; quote?: string; note?: string }[];
  rationale?: string;
  dims: Record<string, string | string[]>;
  novel?: { subdimension: string; description: string; proposedValueId?: string }[];
}

export interface LabelRegion { id: string; role: string; label: string; bbox: BBox; patterns: string[] }

export interface Label {
  schemaVersion: '1.0.0';
  codebookVersion: string;
  batch: string;
  site: {
    slug: string; url: string; finalUrl: string; status: number | null; title: string; capturedAt: string;
    viewport: { width: number; height: number };
    screenshot: { ref: string; width: number; height: number; truncated?: boolean };
    userAgent: string; domain: string; domainNote?: string;
    provenance?: {
      source: 'captured' | 'generated';
      generation?: string;
      generator?: { id: string; model: string; effort?: string };
      brief?: { domain: string; archetype: string; product: string };
    };
  };
  regions: LabelRegion[];
  patterns: LabelPattern[];
  structure: { layout: string; regions: string[]; density: 'sparse' | 'medium' | 'dense' };
  aesthetics: {
    palette: string[]; colorRoles: Record<string, string>; typography: string; typeScale: string;
    shape: 'soft' | 'sharp' | 'mixed'; elevation: 'flat' | 'subtle-shadows' | 'elevated'; borders: 'none' | 'thin' | 'heavy';
    imagery: string[]; iconStyle: 'line' | 'filled' | 'duotone' | 'mixed' | 'none';
    whitespace: 'tight' | 'moderate' | 'generous'; backgroundTreatment: 'solid' | 'gradient' | 'texture' | 'image'; mood: string[];
  };
  model: {
    rater: string; provider: string; name: string; version?: string; effort?: string;
    servedBy?: string[]; generatedAt: string; turns?: number; usage?: Record<string, number>;
  };
  notes: string;
}

/** The part of a label the model writes; the harness fills the rest. */
export type ModelLabel = Omit<Label, 'schemaVersion' | 'codebookVersion' | 'batch' | 'model' | 'site' | 'structure'> & {
  site: Pick<Label['site'], 'domain' | 'domainNote'>;
  structure: Omit<Label['structure'], 'regions'>;
};

let schemaCache: any;
export function labelSchema(): any {
  return (schemaCache ??= JSON.parse(fs.readFileSync(P.labelSchema, 'utf8')));
}

let validatorCache: ReturnType<Ajv2020['compile']> | undefined;
function schemaValidator() {
  if (!validatorCache) {
    const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
    validatorCache = ajv.compile(labelSchema());
  }
  return validatorCache;
}

export interface Issues { errors: string[]; warnings: string[] }

export const LOW_CONFIDENCE = 0.6;
const BBOX_TOLERANCE = 4; // px

export function validateLabel(label: unknown, codebook: CodebookBundle): Issues {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validate = schemaValidator();
  if (!validate(label)) {
    for (const e of (validate.errors ?? []).slice(0, 40)) {
      const extra = e.params && 'additionalProperty' in e.params ? ` "${(e.params as any).additionalProperty}"`
        : e.params && 'allowedValues' in e.params ? ` (allowed: ${(e.params as any).allowedValues.join(', ')})` : '';
      errors.push(`schema ${e.instancePath || '/'}: ${e.message}${extra}`);
    }
    // Keep going when the shape is close enough to give codebook feedback too.
    if (!label || typeof label !== 'object' || !Array.isArray((label as any).patterns)) return { errors, warnings };
  }
  const l = label as Label;
  if (l.codebookVersion !== codebook.version) {
    errors.push(`codebookVersion ${l.codebookVersion} does not match dist/codebook.json ${codebook.version}`);
  }
  const byId = new Map(codebook.entries.map((e) => [e.id, e]));
  const shot = l.site?.screenshot;
  const regionIds = new Set<string>();
  const checkBox = (b: BBox | undefined, where: string) => {
    if (!b || !shot) return;
    if (b.x + b.width > shot.width + BBOX_TOLERANCE || b.y + b.height > shot.height + BBOX_TOLERANCE) {
      errors.push(`${where}: bbox ${JSON.stringify(b)} extends past the ${shot.width}x${shot.height} screenshot`);
    }
  };

  for (const [i, r] of (l.regions ?? []).entries()) {
    if (regionIds.has(r.id)) errors.push(`regions[${i}]: duplicate region id "${r.id}"`);
    regionIds.add(r.id);
    checkBox(r.bbox, `regions[${i}] (${r.id})`);
  }

  const seen = new Map<string, LabelPattern>();
  for (const [i, p] of (l.patterns ?? []).entries()) {
    const where = `patterns[${i}] (${p.id})`;
    if (seen.has(p.id)) errors.push(`${where}: listed twice — merge instances into one entry with several evidence items`);
    seen.set(p.id, p);
    const entry = byId.get(p.id);
    if (!entry) {
      const near = nearestIds(p.id, codebook.entries);
      errors.push(`${where}: "${p.id}" is not a codebook id${near.length ? ` (did you mean ${near.join(', ')}?)` : ''}. Use propose_codebook_change for patterns the codebook lacks.`);
      continue;
    }
    if (entry.deprecated) warnings.push(`${where}: deprecated; use "${entry.replacedBy}" instead`);
    if (p.status !== 'absent') {
      if (!p.evidence?.some((e) => e.bbox)) errors.push(`${where}: status ${p.status} needs at least one evidence item with a bbox`);
    } else if (p.dims && Object.keys(p.dims).length) {
      warnings.push(`${where}: absent pattern has dims; they will be ignored`);
    }
    if (p.confidence < LOW_CONFIDENCE && !p.rationale?.trim()) {
      errors.push(`${where}: confidence ${p.confidence} < ${LOW_CONFIDENCE} requires a rationale explaining what could not be verified`);
    }
    for (const [j, ev] of (p.evidence ?? []).entries()) {
      checkBox(ev.bbox, `${where}.evidence[${j}]`);
      if (ev.region && !regionIds.has(ev.region)) errors.push(`${where}.evidence[${j}]: region "${ev.region}" is not a region id`);
    }
    const subs = new Map(entry.dimensions.flatMap((d) => d.subdimensions).map((s) => [s.id, s]));
    for (const [k, v] of Object.entries(p.dims ?? {})) {
      const sub = subs.get(k);
      if (!sub) {
        errors.push(`${where}: dims.${k} is not a sub-dimension of ${p.id} (has: ${[...subs.keys()].join(', ')})`);
        continue;
      }
      const values = new Set(sub.values.map((x) => x.id));
      if (sub.select === 'one' && typeof v !== 'string') errors.push(`${where}: dims.${k} is single-select; give one value id, not a list`);
      if (sub.select === 'many' && !Array.isArray(v)) errors.push(`${where}: dims.${k} is multi-select; give a list of value ids`);
      for (const x of Array.isArray(v) ? v : [v]) {
        if (!values.has(x)) errors.push(`${where}: dims.${k}="${x}" is not a value of ${p.id}.${k} (values: ${[...values].join(', ')}). Record unlisted variations under "novel".`);
      }
    }
    for (const n of p.novel ?? []) {
      if (!subs.has(n.subdimension)) warnings.push(`${where}: novel.subdimension "${n.subdimension}" is new — make sure it was proposed`);
    }
  }

  for (const [i, r] of (l.regions ?? []).entries()) {
    for (const id of r.patterns ?? []) {
      const p = seen.get(id);
      if (!p) errors.push(`regions[${i}] (${r.id}): pattern "${id}" is not in patterns[]`);
      else if (p.status === 'absent') errors.push(`regions[${i}] (${r.id}): pattern "${id}" is listed in the region but marked absent`);
    }
  }
  const inSomeRegion = new Set((l.regions ?? []).flatMap((r) => r.patterns ?? []));
  for (const p of seen.values()) {
    if (p.status === 'present' && !inSomeRegion.has(p.id)) warnings.push(`pattern "${p.id}" is present but not listed in any region's patterns`);
  }
  const present = [...seen.values()].filter((p) => p.status === 'present').length;
  if (present === 0) warnings.push('no pattern is marked present');

  for (const [role, hex] of Object.entries(l.aesthetics?.colorRoles ?? {})) {
    if (!l.aesthetics.palette?.some((p) => p.toLowerCase() === hex.toLowerCase())) {
      warnings.push(`aesthetics.colorRoles.${role} ${hex} is not in the palette`);
    }
  }
  return { errors, warnings };
}

function nearestIds(id: string, entries: BundleEntry[]): string[] {
  const scored = entries.map((e) => ({ id: e.id, d: levenshtein(id, e.id) }))
    .concat(entries.flatMap((e) => e.aliases.map((a) => ({ id: e.id, d: levenshtein(id, a.toLowerCase().replace(/\s+/g, '-')) }))));
  return [...new Set(scored.sort((a, b) => a.d - b.d).filter((s) => s.d <= Math.max(3, id.length / 3)).map((s) => s.id))].slice(0, 3);
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export function loadBundle(): CodebookBundle {
  return JSON.parse(fs.readFileSync(P.distCodebook, 'utf8'));
}
