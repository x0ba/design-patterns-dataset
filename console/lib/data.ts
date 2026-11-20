// Read-only views over dataset/, dist/ and generated/, shaped for the pages.
// Ported from the original console/server.ts.

import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../src/paths.ts';
import { readJson, readSiteList, type SiteSpec, type SiteStatus, type SiteState, type RaterState } from '../../src/pipeline/sites.ts';
import type { BBox, Label } from '../../src/pipeline/label.ts';
import type { PatternEntry } from '../../src/codebook/types.ts';

export type { BBox, Label, PatternEntry, SiteState, RaterState };

export const listDirs = (d: string) =>
  fs.existsSync(d)
    ? fs.readdirSync(d).filter((x) => !x.startsWith('_') && !x.startsWith('.') && fs.statSync(path.join(d, x)).isDirectory()).sort()
    : [];

// ------------------------------------------------------------------ apps

export interface AppRef { id: string; name: string; url?: string; commit?: string }
export interface ViewRef { slug: string; name: string; description?: string }
export interface AppInfo { app: AppRef; view: ViewRef }

/**
 * Which app each site is a view of, from the batch's site list and the repo
 * records (repos/<batch>/<slug>/setup.json, explore.json).
 */
function appInfo(info: any): Map<string, AppInfo> {
  const out = new Map<string, AppInfo>();
  if (!info?.sitesFile) return out;
  let sites: SiteSpec[];
  try { sites = readSiteList(path.resolve(P.root, info.sitesFile)).sites; } catch { return out; }
  const records = new Map<string, { setup: any; views: any[] }>();
  for (const s of sites) {
    if (!s.app || !s.slug) continue;
    const ref = path.resolve(P.root, s.app);
    let r = records.get(ref);
    if (!r) {
      r = { setup: readJson<any>(ref), views: readJson<any>(path.join(path.dirname(ref), 'explore.json'))?.views ?? [] };
      records.set(ref, r);
    }
    const id = r.setup?.slug ?? path.basename(path.dirname(ref));
    const v = r.views.find((x: any) => x.slug === s.view);
    out.set(s.slug, {
      app: { id, name: r.setup?.repo?.name ?? id, ...(r.setup?.repo?.url ? { url: r.setup.repo.url } : {}), ...(r.setup?.repo?.commit ? { commit: r.setup.repo.commit } : {}) },
      view: { slug: s.view ?? s.slug, name: v?.name ?? s.view ?? s.slug, ...(v?.description ? { description: v.description } : {}) },
    });
  }
  return out;
}

// --------------------------------------------------------------- batches

export const SITE_STATES: SiteState[] = ['queued', 'capturing', 'labeling', 'labeled', 'flagged', 'failed'];

export interface SiteRow {
  slug: string;
  url?: string;
  title?: string;
  domain?: string;
  source: string;
  state: SiteState;
  raters: Record<string, { state: RaterState; error?: string }>;
  flags: string[];
  error?: string;
  updatedAt?: string;
  agreement: { score: number; patternStatusAlpha: number | null; disagreements: number; fields: string[] } | null;
  hasCapture: boolean;
  app?: AppRef;
  view?: ViewRef;
}

export interface IrrField { field?: string; label: string; location: string; metric: string; alpha: number | null; pairwiseAgreement: number | null; units: number; note?: string }
export interface Irr { sitesWithTwoPlusLabels: number; fields: IrrField[]; patternStatusByPattern?: { id: string; alpha: number | null; units: number }[] }

export interface BatchSummary {
  batch: string;
  info: any;
  raters: string[];
  counts: Record<SiteState, number>;
  sites: SiteRow[];
  irr: Irr | null;
}

export function batchNames() {
  return listDirs(P.dataset);
}

export interface BatchRef { name: string; sites: number; createdAt?: string }

/** Every batch with its size, newest first (by batch.json createdAt, then name). */
export function batchList(): BatchRef[] {
  return batchNames()
    .map((name) => ({
      name,
      sites: listDirs(path.join(P.dataset, name, 'sites')).length,
      createdAt: readJson<any>(path.join(P.dataset, name, 'batch.json'))?.createdAt as string | undefined,
    }))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.name.localeCompare(a.name));
}

export function batchSummary(batch: string): BatchSummary | null {
  const dir = path.join(P.dataset, batch);
  if (!fs.existsSync(dir)) return null;
  const info = readJson<any>(path.join(dir, 'batch.json'));
  const apps = appInfo(info);
  const sites: SiteRow[] = listDirs(path.join(dir, 'sites')).map((slug) => {
    const sdir = path.join(dir, 'sites', slug);
    const status = readJson<SiteStatus>(path.join(sdir, 'status.json'));
    const agreement = readJson<any>(path.join(sdir, 'agreement.json'));
    const meta = readJson<any>(path.join(sdir, 'capture', 'meta.json'));
    const a = apps.get(slug);
    return {
      slug,
      url: status?.url ?? meta?.url,
      title: meta?.title,
      domain: status?.domain,
      source: status?.source ?? 'captured',
      state: status?.state ?? 'queued',
      raters: (status?.raters ?? {}) as SiteRow['raters'],
      flags: status?.flags ?? [],
      error: status?.error,
      updatedAt: status?.updatedAt,
      agreement: agreement
        ? { score: agreement.score, patternStatusAlpha: agreement.patternStatusAlpha, disagreements: agreement.disagreements.length, fields: [...new Set<string>(agreement.disagreements.map((d: any) => d.field))] }
        : null,
      hasCapture: !!meta,
      ...(a ? { app: a.app, view: a.view } : {}),
    };
  });
  const counts = Object.fromEntries(SITE_STATES.map((s) => [s, 0])) as Record<SiteState, number>;
  for (const s of sites) counts[s.state] = (counts[s.state] ?? 0) + 1;
  return { batch, info, raters: info?.raters?.map((r: any) => r.id) ?? [], counts, sites, irr: readJson<Irr>(path.join(dir, 'irr.json')) ?? null };
}

// ------------------------------------------------------------------ site

/** Screenshot URL with its mtime, so a recapture busts the browser cache. */
export function screenshotUrl(batch: string, slug: string) {
  const file = path.join(P.dataset, batch, 'sites', slug, 'capture', 'screenshot.png');
  if (!fs.existsSync(file) || lfsPointer(file)) return null;
  return `/files/dataset/${encodeURIComponent(batch)}/sites/${encodeURIComponent(slug)}/capture/screenshot.png?v=${Math.round(fs.statSync(file).mtimeMs)}`;
}

/** A Git LFS pointer checked out in place of the real file (run `git lfs pull`). */
export function lfsPointer(file: string) {
  try {
    if (fs.statSync(file).size > 1024) return false;
    return fs.readFileSync(file, 'utf8').startsWith('version https://git-lfs');
  } catch { return false; }
}

export interface Consensus {
  raters?: string[];
  domain?: any;
  patterns: ConsensusPattern[];
  aesthetics: Record<string, { value: any }>;
  structure: { density: { value: string } };
}
export interface ConsensusPattern {
  id: string;
  status: 'present' | 'uncertain' | 'absent';
  confidence: number;
  support?: number;
  raters?: number;
  dims?: Record<string, string | string[]>;
  ties?: string[];
  rationale?: string;
  evidence?: Evidence[];
}
export interface Evidence { bbox?: BBox; region?: string; quote?: string; note?: string; rater?: string; regionLabel?: string }

export interface Agreement {
  score: number;
  patternStatusAlpha: number | null;
  raters: string[];
  disagreements: { field: string; unit: string; values: Record<string, string> }[];
  missing: string[];
}

export interface SiteDetail {
  batch: string;
  slug: string;
  app?: AppRef;
  view?: ViewRef;
  raters: string[];
  status: SiteStatus | null;
  meta: any;
  labels: Record<string, Label>;
  agreement: Agreement | null;
  consensus: Consensus | null;
  screenshot: string | null;
  lfs: boolean;
}

export function siteDetail(batch: string, slug: string): SiteDetail | null {
  const dir = path.join(P.dataset, batch, 'sites', slug);
  if (!fs.existsSync(dir)) return null;
  const info = readJson<any>(path.join(P.dataset, batch, 'batch.json'));
  const labels: Record<string, Label> = {};
  const ldir = path.join(dir, 'labels');
  if (fs.existsSync(ldir)) {
    for (const f of fs.readdirSync(ldir).filter((f) => f.endsWith('.json')).sort()) {
      const l = readJson<Label>(path.join(ldir, f));
      if (l) labels[f.replace(/\.json$/, '')] = l;
    }
  }
  const a = appInfo(info).get(slug);
  return {
    batch, slug,
    ...(a ? { app: a.app, view: a.view } : {}),
    raters: info?.raters?.map((r: any) => r.id) ?? [],
    status: readJson<SiteStatus>(path.join(dir, 'status.json')) ?? null,
    meta: readJson(path.join(dir, 'capture', 'meta.json')) ?? null,
    labels,
    agreement: readJson<Agreement>(path.join(dir, 'agreement.json')) ?? null,
    consensus: readJson<Consensus>(path.join(dir, 'consensus.json')) ?? null,
    screenshot: screenshotUrl(batch, slug),
    lfs: lfsPointer(path.join(dir, 'capture', 'screenshot.png')),
  };
}

// -------------------------------------------------------------- codebook

export type CodebookEntry = Omit<PatternEntry, 'coding'> & { coding?: unknown };
export interface CodebookBundle { version: string; generatedAt?: string; entries: CodebookEntry[] }

let bundleCache: { mtime: number; bundle: CodebookBundle } | undefined;

/** dist/codebook.json, re-read only when the file changes. */
export function codebookBundle(): CodebookBundle | null {
  let mtime: number;
  try { mtime = fs.statSync(P.distCodebook).mtimeMs; } catch { return null; }
  if (bundleCache?.mtime !== mtime) {
    const bundle = readJson<CodebookBundle>(P.distCodebook);
    if (!bundle) return null;
    for (const e of bundle.entries) delete e.coding;
    bundleCache = { mtime, bundle };
  }
  return bundleCache.bundle;
}

export function codebookSourceVersion() {
  return fs.existsSync(P.version) ? fs.readFileSync(P.version, 'utf8').trim() : null;
}

export interface PatternUsage { sites: number; uncertain: number; values: Record<string, Record<string, number>>; where: { batch: string; slug: string }[] }

/** How often each pattern and value appears, from consensus labels. */
export function codebookUsage() {
  const patterns: Record<string, PatternUsage> = {};
  let sites = 0;
  for (const batch of listDirs(P.dataset)) {
    for (const slug of listDirs(path.join(P.dataset, batch, 'sites'))) {
      const c = readJson<Consensus>(path.join(P.dataset, batch, 'sites', slug, 'consensus.json'));
      if (!c) continue;
      sites++;
      for (const p of c.patterns) {
        if (p.status === 'absent') continue;
        const u = (patterns[p.id] ??= { sites: 0, uncertain: 0, values: {}, where: [] });
        if (p.status === 'uncertain') { u.uncertain++; continue; }
        u.sites++;
        if (u.where.length < 50) u.where.push({ batch, slug });
        for (const [k, v] of Object.entries(p.dims ?? {})) {
          for (const x of Array.isArray(v) ? v : [v]) ((u.values[k] ??= {})[x] = (u.values[k][x] ?? 0) + 1);
        }
      }
    }
  }
  return { sites, patterns };
}

/** Entry ids at or under `id` in the codebook hierarchy. */
function subtree(entries: { id: string; parent?: string }[], id: string): Set<string> {
  const ids = new Set([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const e of entries) if (e.parent && ids.has(e.parent) && !ids.has(e.id)) { ids.add(e.id); grew = true; }
  }
  return ids;
}

const iou = (a: BBox, b: BBox) => {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  const i = w * h;
  return i / (a.width * a.height + b.width * b.height - i);
};

export interface InstanceSite {
  batch: string;
  slug: string;
  title: string;
  url?: string;
  domain?: string;
  archetype?: string;
  screenshot: string | null;
  lfs: boolean;
  width?: number;
  height?: number;
}

export interface Instance {
  key: string;
  pattern: string;
  status: ConsensusPattern['status'];
  confidence: number;
  support?: number;
  raters?: number;
  dims: Record<string, string | string[]>;
  ties: string[];
  rationale?: string;
  bbox: BBox | null;
  evidence: Evidence[];
  site: InstanceSite;
}

/**
 * Every labeled UI element for an entry and, for an archetype, its patterns and
 * components: one instance per on-page element, from consensus labels. Raters'
 * evidence boxes for the same element (IoU ≥ 0.5) merge into one instance.
 */
export function codebookInstances(id: string): Instance[] | null {
  const bundle = codebookBundle();
  if (!bundle || !bundle.entries.some((e) => e.id === id)) return null;
  const ids = subtree(bundle.entries, id);
  const out: Instance[] = [];
  for (const batch of listDirs(P.dataset)) {
    const apps = appInfo(readJson<any>(path.join(P.dataset, batch, 'batch.json')));
    for (const slug of listDirs(path.join(P.dataset, batch, 'sites'))) {
      const sdir = path.join(P.dataset, batch, 'sites', slug);
      const c = readJson<Consensus>(path.join(sdir, 'consensus.json'));
      if (!c) continue;
      const patterns = c.patterns.filter((p) => ids.has(p.id) && p.status !== 'absent');
      if (!patterns.length) continue;
      const meta = readJson<any>(path.join(sdir, 'capture', 'meta.json'));
      const app = apps.get(slug);
      const brief = readJson<any>(path.join(P.generated, batch, slug, 'generation.json'))?.brief;
      const regions: Record<string, Record<string, string>> = {};
      for (const r of c.raters ?? []) {
        const l = readJson<Label>(path.join(sdir, 'labels', `${r}.json`));
        if (l) regions[r] = Object.fromEntries(l.regions.map((x) => [x.id, x.label ?? x.role ?? '']));
      }
      const lfs = lfsPointer(path.join(sdir, 'capture', 'screenshot.png'));
      const site: InstanceSite = {
        batch, slug,
        title: app ? `${app.app.name}: ${app.view.name}` : meta?.title ?? slug,
        url: meta?.finalUrl ?? meta?.url,
        domain: c.domain?.value ?? c.domain,
        archetype: brief?.archetype,
        screenshot: lfs ? null : screenshotUrl(batch, slug),
        lfs,
        width: meta?.screenshot?.width,
        height: meta?.screenshot?.height,
      };
      for (const p of patterns) {
        const groups: { bbox: BBox | null; evidence: Evidence[] }[] = [];
        for (const ev of p.evidence ?? []) {
          const e = { ...ev, ...(ev.region && ev.rater ? { regionLabel: regions[ev.rater]?.[ev.region] } : {}) };
          const g = ev.bbox && groups.find((g) => g.bbox && iou(g.bbox, ev.bbox!) >= 0.5);
          if (g) g.evidence.push(e); else groups.push({ bbox: ev.bbox ?? null, evidence: [e] });
        }
        // Text-only evidence attaches to the first box rather than becoming its own element.
        const boxed = groups.filter((g) => g.bbox);
        const loose = groups.filter((g) => !g.bbox).flatMap((g) => g.evidence);
        const els = boxed.length ? boxed : [{ bbox: null, evidence: [] as Evidence[] }];
        els[0].evidence.push(...loose);
        els.forEach((g, i) => out.push({
          key: `${batch}/${slug}/${p.id}/${i}`,
          pattern: p.id, status: p.status, confidence: p.confidence, support: p.support, raters: p.raters,
          dims: p.dims ?? {}, ties: p.ties ?? [], rationale: p.rationale,
          bbox: g.bbox, evidence: g.evidence, site,
        }));
      }
    }
  }
  return out;
}

/** A site's screenshot and size, for crops of its evidence. */
export function siteShot(batch: string, slug: string): InstanceSite {
  const sdir = path.join(P.dataset, batch, 'sites', slug);
  const meta = readJson<any>(path.join(sdir, 'capture', 'meta.json'));
  const lfs = lfsPointer(path.join(sdir, 'capture', 'screenshot.png'));
  return {
    batch, slug,
    title: meta?.title ?? slug,
    url: meta?.finalUrl ?? meta?.url,
    screenshot: lfs ? null : screenshotUrl(batch, slug),
    lfs,
    width: meta?.screenshot?.width,
    height: meta?.screenshot?.height,
  };
}
