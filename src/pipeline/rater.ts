// One rater, one site: run the agent over the shared capture and write
// labels/<rater>.json plus a JSONL transcript for audit.

import fs from 'node:fs';
import path from 'node:path';
import type { Browser } from 'playwright';
import type { CodebookBundle } from '../codebook/bundle.ts';
import type { CaptureMeta, IndexedElement } from './capture.ts';
import { firstMessage, modelLabelSchema, NUDGE, systemPrompt } from './prompt.ts';
import { providerFor, type RaterConfig } from './provider.ts';
import { RaterTools, toolSpecs } from './tools.ts';
import { writeJson, type SiteSpec } from './sites.ts';
import { P } from '../paths.ts';
import type { Label } from './label.ts';
import { usageGate, UsageLimitError } from './usage-limit.ts';

export interface RaterJob {
  batch: string;
  site: SiteSpec & { slug: string };
  captureDir: string;
  labelsDir: string;
  rater: RaterConfig;
  codebook: CodebookBundle;
  browser: Browser;
}

export async function runRater(job: RaterJob): Promise<Label> {
  // Usage limits are account-wide. Wait out a pause before opening a browser
  // page or a claude process, then run this rater again once usage is back.
  for (;;) {
    await usageGate.wait();
    try {
      return await runRaterOnce(job);
    } catch (e) {
      if (!(e instanceof UsageLimitError)) throw e;
    }
  }
}

async function runRaterOnce(job: RaterJob): Promise<Label> {
  const { rater, codebook } = job;
  const meta: CaptureMeta = JSON.parse(fs.readFileSync(path.join(job.captureDir, 'meta.json'), 'utf8'));
  const styles = JSON.parse(fs.readFileSync(path.join(job.captureDir, 'styles.json'), 'utf8'));
  const elements: IndexedElement[] = JSON.parse(fs.readFileSync(path.join(job.captureDir, 'elements.json'), 'utf8'));
  const a11yLines = fs.readFileSync(path.join(job.captureDir, 'a11y.yaml'), 'utf8').split('\n').length;

  fs.mkdirSync(job.labelsDir, { recursive: true });
  const transcriptFile = path.join(job.labelsDir, `${rater.id}.transcript.jsonl`);
  fs.writeFileSync(transcriptFile, '');
  const log = (e: object) => fs.appendFileSync(transcriptFile, JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');

  let submitted: Label | undefined;
  const tools = new RaterTools({
    provenance: provenanceOf(job.site),
    batch: job.batch,
    slug: job.site.slug,
    siteUrl: job.site.url,
    rater: { id: rater.id, provider: rater.provider, model: rater.model, effort: rater.effort },
    captureDir: job.captureDir,
    meta,
    codebook,
    browser: job.browser,
    onSubmit: (l) => { submitted = l; },
  });

  try {
    // With unrolled panels the top of screenshot.png is not what a person sees first; viewport.png is.
    const first = meta.panels
      ? { image: { mediaType: 'image/png' as const, data: fs.readFileSync(path.join(job.captureDir, 'viewport.png')).toString('base64') } }
      : await tools.crop({ y: 0, height: meta.viewport.height });
    const provider = await providerFor(rater);
    const outcome = await provider.run(rater, {
      system: systemPrompt(codebook),
      tools: toolSpecs(modelLabelSchema()),
      first: {
        text: firstMessage({ url: job.site.url, meta, styles, elements, a11yLines, siteNote: job.site.note }),
        images: [first.image],
      },
      execute: (name, input) => tools.execute(name, input),
      maxTurns: rater.maxTurns ?? 60,
      nudge: NUDGE,
      log,
    });
    log({ type: 'outcome', ...outcome, proposals: tools.proposals });
    if (!submitted) throw new Error(`rater ${rater.id} did not submit a valid label (${outcome.reason} after ${outcome.turns} turns)`);
    const label: Label = submitted;
    label.model.servedBy = outcome.servedBy;
    label.model.turns = outcome.turns;
    label.model.usage = outcome.usage;
    writeJson(path.join(job.labelsDir, `${rater.id}.json`), label);
    return label;
  } finally {
    await tools.close();
  }
}

/** Harness-owned provenance for the label: where this UI came from. */
export function provenanceOf(site: SiteSpec): Label['site']['provenance'] {
  if (site.source !== 'generated') return { source: 'captured' };
  const ref = site.generation;
  let g: any;
  try { g = ref ? JSON.parse(fs.readFileSync(path.resolve(P.root, ref), 'utf8')) : undefined; } catch { /* missing record */ }
  return {
    source: 'generated',
    ...(ref ? { generation: ref } : {}),
    ...(g ? {
      generator: { id: g.generator?.id, model: g.generator?.model, ...(g.generator?.effort ? { effort: g.generator.effort } : {}) },
      brief: { domain: g.brief?.domain, archetype: g.brief?.archetype, product: g.brief?.product },
    } : {}),
  };
}
