// Site lists (sites/<batch>.yaml) and dataset layout.

import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { P } from '../paths.ts';

export type SiteSource = 'captured' | 'generated';

export interface SiteSpec {
  url: string;
  domain?: string; // curated sampling domain (see sites/README.md)
  note?: string;
  slug?: string;
  /** Where the UI came from. Default 'captured' (a live website). */
  source?: SiteSource;
  /** Generated apps: static build dir (repo-relative) served at `url` during labeling. */
  local?: string;
  /** Generated apps: repo-relative path to generated/<batch>/<slug>/generation.json. */
  generation?: string;
}

export interface SiteList { batch?: string; description?: string; sites: SiteSpec[] }

export function slugForUrl(url: string): string {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');
  const p = u.pathname.replace(/\/+$/, '');
  return (host + (p ? '-' + p : ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function readSiteList(file: string): SiteList {
  const raw = YAML.parse(fs.readFileSync(file, 'utf8'));
  const list: SiteList = Array.isArray(raw) ? { sites: raw } : raw;
  list.sites = list.sites.map((s) => (typeof s === 'string' ? { url: s } : s)).map((s) => ({ ...s, slug: s.slug ?? slugForUrl(s.url) }));
  const seen = new Set<string>();
  for (const s of list.sites) {
    if (seen.has(s.slug!)) throw new Error(`${file}: duplicate site slug "${s.slug}" (${s.url})`);
    seen.add(s.slug!);
  }
  return list;
}

export const batchDir = (batch: string) => path.join(P.dataset, batch);
export const siteDir = (batch: string, slug: string) => path.join(P.dataset, batch, 'sites', slug);
export const captureDir = (batch: string, slug: string) => path.join(siteDir(batch, slug), 'capture');
export const labelsDir = (batch: string, slug: string) => path.join(siteDir(batch, slug), 'labels');

export type SiteState = 'queued' | 'capturing' | 'labeling' | 'labeled' | 'flagged' | 'failed';
export type RaterState = 'pending' | 'running' | 'done' | 'failed';

export interface SiteStatus {
  slug: string;
  url: string;
  domain?: string;
  source?: SiteSource;
  state: SiteState;
  raters: Record<string, { state: RaterState; error?: string; updatedAt: string }>;
  flags: string[];
  error?: string;
  updatedAt: string;
}

export function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

export function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);
}
