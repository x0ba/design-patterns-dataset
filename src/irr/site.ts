// Per-site agreement (for flagging and the console) and a majority-vote
// consensus label (for downstream use of the dataset).

import fs from 'node:fs';
import path from 'node:path';
import type { Label, LabelPattern, Status } from '../pipeline/label.ts';
import { labelsDir, readJson, siteDir, writeJson } from '../pipeline/sites.ts';
import { FIELDS, patternUnion } from './fields.ts';
import { krippendorffAlpha } from './krippendorff.ts';

export interface Disagreement { field: string; unit: string; values: Record<string, unknown> }

export interface SiteAgreement {
  raters: string[]; // raters with a label
  missing: string[]; // raters without one
  /** Mean share of agreeing rater pairs over every compared item (fields + pattern statuses). */
  score: number;
  fields: Record<string, { agreement: number | null; items: number }>;
  patternStatusAlpha: number | null;
  disagreements: Disagreement[];
  servedByMismatch: string[];
  computedAt: string;
}

export function loadSiteLabels(batch: string, slug: string, raterIds: string[]): (Label | undefined)[] {
  return raterIds.map((id) => readJson<Label>(path.join(labelsDir(batch, slug), `${id}.json`)));
}

export function siteAgreement(labels: (Label | undefined)[], raterIds: string[]): SiteAgreement | undefined {
  const have = raterIds.filter((_, i) => labels[i]);
  if (have.length < 2) return undefined;
  const fields: SiteAgreement['fields'] = {};
  const disagreements: Disagreement[] = [];
  let agreeSum = 0, items = 0;

  for (const f of FIELDS) {
    if (f.key === 'pattern.confidence' || f.key === 'pattern.dims') continue; // reported below / batch-level only
    let fAgree = 0, fItems = 0;
    for (const [unit, vals] of f.units(labels)) {
      const present = vals.map((v, i) => [raterIds[i], v] as const).filter(([, v]) => v !== null && v !== undefined);
      if (present.length < 2) continue;
      let pairs = 0, agree = 0;
      for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) { pairs++; if (present[i][1] === present[j][1]) agree++; }
      fAgree += agree / pairs;
      fItems++;
      if (agree < pairs) disagreements.push({ field: f.key, unit, values: Object.fromEntries(present) });
    }
    fields[f.key] = { agreement: fItems ? fAgree / fItems : null, items: fItems };
    agreeSum += fAgree;
    items += fItems;
  }

  // Confidence: flag spreads > 0.3 on patterns every rater listed with the same status.
  for (const id of patternUnion(labels)) {
    const ps = labels.map((l) => l?.patterns.find((p) => p.id === id));
    const listed = ps.map((p, i) => [raterIds[i], p] as const).filter(([, p]) => p);
    if (listed.length < 2 || new Set(listed.map(([, p]) => p!.status)).size > 1) continue;
    const cs = listed.map(([, p]) => p!.confidence);
    if (Math.max(...cs) - Math.min(...cs) > 0.3) disagreements.push({ field: 'pattern.confidence', unit: id, values: Object.fromEntries(listed.map(([r, p]) => [r, p!.confidence])) });
  }

  const statusUnits = [...FIELDS[0].units(labels).values()];
  const servedByMismatch = labels.flatMap((l) => (l && (l.model.servedBy ?? []).some((m) => m !== l.model.name) ? [l.model.rater] : []));
  return {
    raters: have,
    missing: raterIds.filter((_, i) => !labels[i]),
    score: items ? agreeSum / items : 1,
    fields,
    patternStatusAlpha: krippendorffAlpha(statusUnits, 'nominal').alpha,
    disagreements,
    servedByMismatch,
    computedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- consensus

function majority<T>(vals: T[]): { value: T | null; support: number; tie: boolean } {
  const counts = new Map<string, { v: T; n: number }>();
  for (const v of vals) {
    const k = JSON.stringify(v);
    counts.set(k, { v, n: (counts.get(k)?.n ?? 0) + 1 });
  }
  const sorted = [...counts.values()].sort((a, b) => b.n - a.n);
  if (!sorted.length) return { value: null, support: 0, tie: false };
  const tie = sorted.length > 1 && sorted[0].n === sorted[1].n;
  return { value: tie ? null : sorted[0].v, support: sorted[0].n, tie };
}

export interface ConsensusPattern extends Omit<LabelPattern, 'evidence' | 'rationale'> {
  support: number; // raters agreeing with the consensus status
  raters: number;
  evidence: (LabelPattern['evidence'][number] & { rater: string })[];
  ties?: string[];
}

export function consensusLabel(labels: (Label | undefined)[], raterIds: string[]) {
  const present = labels.map((l, i) => [raterIds[i], l] as const).filter((x): x is readonly [string, Label] => !!x[1]);
  if (!present.length) return undefined;
  const ref = present[0][1];
  const patterns: ConsensusPattern[] = [];
  for (const id of patternUnion(labels)) {
    const per = present.map(([r, l]) => [r, l.patterns.find((p) => p.id === id)] as const);
    const st = majority(per.map(([, p]) => (p?.status ?? 'absent') as Status));
    const status: Status = st.value ?? 'uncertain';
    if (status === 'absent' && !per.some(([, p]) => p?.status === 'absent')) continue; // nobody listed it as checked-absent
    const agreeing = per.filter(([, p]) => (p?.status ?? 'absent') === status && p);
    const ties: string[] = st.tie ? ['status'] : [];
    const dims: LabelPattern['dims'] = {};
    if (status !== 'absent') {
      const subs = new Set(agreeing.flatMap(([, p]) => Object.keys(p!.dims ?? {})));
      for (const s of subs) {
        const m = majority(agreeing.map(([, p]) => p!.dims?.[s]).filter((v) => v !== undefined).map((v) => (Array.isArray(v) ? [...v].sort() : v)));
        if (m.value !== null && m.support >= Math.min(2, agreeing.length)) dims[s] = m.value as string | string[];
        else ties.push(`dims.${s}`);
      }
    }
    const cs = agreeing.map(([, p]) => p!.confidence);
    patterns.push({
      id, status,
      confidence: cs.length ? Math.round((cs.reduce((a, b) => a + b, 0) / cs.length) * 100) / 100 : 0.5,
      dims,
      support: st.support,
      raters: present.length,
      evidence: agreeing.flatMap(([r, p]) => p!.evidence.map((e) => ({ ...e, rater: r }))),
      ...(ties.length ? { ties } : {}),
    });
  }
  const pick = <T>(get: (l: Label) => T) => {
    const m = majority(present.map(([, l]) => get(l)));
    return { value: m.value, support: m.support, ...(m.tie ? { tie: true } : {}) };
  };
  return {
    site: ref.site,
    codebookVersion: ref.codebookVersion,
    batch: ref.batch,
    raters: present.map(([r]) => r),
    domain: pick((l) => l.site.domain),
    structure: { density: pick((l) => l.structure.density), layout: Object.fromEntries(present.map(([r, l]) => [r, l.structure.layout])) },
    aesthetics: {
      shape: pick((l) => l.aesthetics.shape),
      elevation: pick((l) => l.aesthetics.elevation),
      borders: pick((l) => l.aesthetics.borders),
      iconStyle: pick((l) => l.aesthetics.iconStyle),
      whitespace: pick((l) => l.aesthetics.whitespace),
      backgroundTreatment: pick((l) => l.aesthetics.backgroundTreatment),
    },
    patterns,
    note: 'Majority vote across raters. Free-text fields (layout, typography, palette, notes) stay per rater in labels/.',
    computedAt: new Date().toISOString(),
  };
}

/** Recompute and write agreement.json + consensus.json for one site. */
export function scoreSite(batch: string, slug: string, raterIds: string[]): SiteAgreement | undefined {
  const labels = loadSiteLabels(batch, slug, raterIds);
  const dir = siteDir(batch, slug);
  const agreement = siteAgreement(labels, raterIds);
  if (agreement) writeJson(path.join(dir, 'agreement.json'), agreement);
  else fs.rmSync(path.join(dir, 'agreement.json'), { force: true });
  const consensus = consensusLabel(labels, raterIds);
  if (consensus) writeJson(path.join(dir, 'consensus.json'), consensus);
  return agreement;
}
