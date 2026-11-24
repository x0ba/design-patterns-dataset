// Read-only views over briefs/ and generated/: how far a generated batch has
// got before it ever reaches dataset/ (and so the Progress page).

import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../src/paths.ts';
import { readJson } from '../../src/pipeline/sites.ts';
import YAML from 'yaml';

// Local shapes for briefs/<batch>.yaml and generation.json (see
// src/generate/briefs.ts and app.ts). Importing those modules would pull the
// generator's process code into the console.
export interface Brief { slug: string; domain: string; archetype: string; generator: string; context?: string; product: string; echo?: string[] }
export interface BriefFile { batch: string; createdAt: string; codebookVersion: string; seed: number; writer: { model: string }; briefs: Brief[] }

function readBriefs(file: string): BriefFile {
  const f = YAML.parse(fs.readFileSync(file, 'utf8')) as BriefFile;
  if (!Array.isArray(f?.briefs)) throw new Error(`${file}: no briefs`);
  return f;
}

interface GenerationRecord {
  ok: boolean;
  error?: string;
  startedAt: string;
  finishedAt: string;
  verification?: { problems?: string[]; title?: string };
  repairs: number;
  session?: { costUsd: number; numTurns: number };
  stack: { packageJson: boolean; dependencies: string[] };
}

/**
 * queued: no output folder yet. building: a session is writing its transcript.
 * stalled: a folder with no record and no recent activity (the run stopped, or
 * is paused at a usage limit). built / failed: generation.json says which.
 */
export type GenState = 'queued' | 'building' | 'stalled' | 'built' | 'failed';
export const GEN_STATES: GenState[] = ['built', 'building', 'stalled', 'failed', 'queued'];
export const GEN_LABEL: Record<GenState, string> = { queued: 'Queued', building: 'Building', stalled: 'Stalled', built: 'Built', failed: 'Failed' };
/** The site-state glyph each generation state is drawn with. */
export const GEN_MARK: Record<GenState, string> = { queued: 'queued', building: 'labeling', stalled: 'flagged', built: 'labeled', failed: 'failed' };

export interface GenRow {
  brief: Brief;
  state: GenState;
  startedAt?: string;
  finishedAt?: string;
  lastActivity?: string;
  durationMs?: number;
  costUsd?: number;
  turns?: number;
  repairs?: number;
  error?: string;
  title?: string;
  stack?: string;
  preview?: string;
  /** Labeling has started on this app, so it has a site page. */
  labeled: boolean;
}

export interface GenSummary {
  batch: string;
  file: BriefFile;
  rows: GenRow[];
  counts: Record<GenState, number>;
  costUsd: number;
  stalledAfterMin: number;
  sitesFile: boolean;
}

export interface GenBatchRef { name: string; briefs: number; built: number; createdAt?: string }

const briefFile = (batch: string) => path.join(P.briefs, `${batch}.yaml`);

function tryBriefs(batch: string): BriefFile | null {
  try { return readBriefs(briefFile(batch)); } catch { return null; }
}

/** Sessions append to their transcript every turn; this long without a write means nothing is running. */
const STALLED_AFTER_MIN = 20;

const mtime = (f: string) => { try { return fs.statSync(f).mtimeMs; } catch { return undefined; } };

export function genBatchList(): GenBatchRef[] {
  if (!fs.existsSync(P.briefs)) return [];
  return fs.readdirSync(P.briefs)
    .filter((f) => f.endsWith('.yaml') && !f.startsWith('.'))
    .map((f) => f.slice(0, -5))
    .flatMap((name) => {
      const file = tryBriefs(name);
      if (!file) return [];
      const built = file.briefs.filter((b) => readJson<GenerationRecord>(path.join(P.generated, name, b.slug, 'generation.json'))?.ok).length;
      return [{ name, briefs: file.briefs.length, built, createdAt: file.createdAt }];
    })
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.name.localeCompare(a.name));
}

export function genSummary(batch: string): GenSummary | null {
  const file = tryBriefs(batch);
  if (!file) return null;
  const stallMin = STALLED_AFTER_MIN;
  const now = Date.now();
  const counts = Object.fromEntries(GEN_STATES.map((s) => [s, 0])) as Record<GenState, number>;
  let costUsd = 0;

  const rows = file.briefs.map((brief): GenRow => {
    const dir = path.join(P.generated, batch, brief.slug);
    const labeled = fs.existsSync(path.join(P.dataset, batch, 'sites', brief.slug));
    const previewFile = path.join(dir, 'preview.png');
    const previewAt = mtime(previewFile);
    const preview = previewAt ? `/files/generated/${encodeURIComponent(batch)}/${encodeURIComponent(brief.slug)}/preview.png?v=${Math.round(previewAt)}` : undefined;
    const transcriptAt = mtime(path.join(dir, 'transcript.jsonl')) ?? mtime(dir);
    const lastActivity = transcriptAt ? new Date(transcriptAt).toISOString() : undefined;

    let row: GenRow;
    const r = readJson<GenerationRecord>(path.join(dir, 'generation.json'));
    if (r) {
      const s = r.session;
      row = {
        brief, labeled, preview, lastActivity,
        state: r.ok ? 'built' : 'failed',
        startedAt: r.startedAt, finishedAt: r.finishedAt,
        durationMs: Date.parse(r.finishedAt) - Date.parse(r.startedAt),
        costUsd: s?.costUsd, turns: s?.numTurns, repairs: r.repairs,
        error: r.error ?? (r.ok ? undefined : r.verification?.problems?.[0]),
        title: r.verification?.title,
        stack: r.stack.dependencies.slice(0, 3).join(', ') || (r.stack.packageJson ? 'node' : 'static'),
      };
      costUsd += s?.costUsd ?? 0;
    } else if (transcriptAt) {
      row = { brief, labeled, preview, lastActivity, state: now - transcriptAt > stallMin * 60_000 ? 'stalled' : 'building' };
    } else {
      row = { brief, labeled, state: 'queued' };
    }
    counts[row.state]++;
    return row;
  });

  return { batch, file, rows, counts, costUsd, stalledAfterMin: stallMin, sitesFile: fs.existsSync(path.join(P.sites, `${batch}.yaml`)) };
}
