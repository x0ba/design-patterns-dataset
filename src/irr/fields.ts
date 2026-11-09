// Which label fields IRR covers (README table) and how each becomes units.

import type { Label } from '../pipeline/label.ts';
import type { Metric, Value } from './krippendorff.ts';

export interface FieldSpec {
  key: string;
  label: string;
  location: 'Patterns' | 'Structure' | 'Aesthetics';
  metric: Metric;
  order?: readonly string[];
  /** One site's units: unit id -> one value per rater (same order as `labels`). */
  units: (labels: (Label | undefined)[]) => Map<string, Value[]>;
}

const scalar = (get: (l: Label) => Value) => (labels: (Label | undefined)[]) =>
  new Map([['site', labels.map((l) => (l ? get(l) ?? null : null))]]);

/** Union of pattern ids any rater listed; unlisted by a rater who submitted = absent. */
export function patternUnion(labels: (Label | undefined)[]): string[] {
  return [...new Set(labels.flatMap((l) => l?.patterns.map((p) => p.id) ?? []))].sort();
}

export const FIELDS: FieldSpec[] = [
  {
    key: 'pattern.status', label: 'Pattern status', location: 'Patterns', metric: 'nominal',
    units: (labels) => new Map(patternUnion(labels).map((id) => [id, labels.map((l) => (l ? l.patterns.find((p) => p.id === id)?.status ?? 'absent' : null))])),
  },
  {
    key: 'pattern.confidence', label: 'Pattern confidence', location: 'Patterns', metric: 'interval',
    // Only where the rater listed the pattern; an unlisted pattern has no stated confidence.
    units: (labels) => new Map(patternUnion(labels).map((id) => [id, labels.map((l) => l?.patterns.find((p) => p.id === id)?.confidence ?? null)])),
  },
  { key: 'structure.density', label: 'density', location: 'Structure', metric: 'ordinal', order: ['sparse', 'medium', 'dense'], units: scalar((l) => l.structure.density) },
  { key: 'aesthetics.elevation', label: 'elevation', location: 'Aesthetics', metric: 'nominal', units: scalar((l) => l.aesthetics.elevation) },
  { key: 'aesthetics.shape', label: 'shape', location: 'Aesthetics', metric: 'nominal', units: scalar((l) => l.aesthetics.shape) },
  { key: 'aesthetics.whitespace', label: 'whitespace', location: 'Aesthetics', metric: 'ordinal', order: ['tight', 'moderate', 'generous'], units: scalar((l) => l.aesthetics.whitespace) },
  { key: 'aesthetics.iconStyle', label: 'iconStyle', location: 'Aesthetics', metric: 'nominal', units: scalar((l) => l.aesthetics.iconStyle) },
  { key: 'aesthetics.borders', label: 'borders', location: 'Aesthetics', metric: 'nominal', units: scalar((l) => l.aesthetics.borders) },
  { key: 'aesthetics.backgroundTreatment', label: 'backgroundTreatment', location: 'Aesthetics', metric: 'nominal', units: scalar((l) => l.aesthetics.backgroundTreatment) },
  {
    // Not in the README table; reported separately as a codebook-quality signal.
    // Unit = (pattern, sub-dimension) where at least two raters coded the pattern present.
    key: 'pattern.dims', label: 'Pattern dims (extra)', location: 'Patterns', metric: 'nominal',
    units: (labels) => {
      const out = new Map<string, Value[]>();
      for (const id of patternUnion(labels)) {
        const ps = labels.map((l) => l?.patterns.find((p) => p.id === id && p.status === 'present'));
        if (ps.filter(Boolean).length < 2) continue;
        const subs = new Set(ps.flatMap((p) => Object.keys(p?.dims ?? {})));
        for (const s of subs) {
          out.set(`${id}.${s}`, ps.map((p) => {
            const v = p?.dims?.[s];
            return v === undefined ? null : Array.isArray(v) ? [...v].sort().join('+') : v;
          }));
        }
      }
      return out;
    },
  },
];

export const README_FIELDS = FIELDS.filter((f) => f.key !== 'pattern.dims');
