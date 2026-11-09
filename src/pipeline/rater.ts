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
import type { Label } from './label.ts';

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
    const first = await tools.crop({ y: 0, height: meta.viewport.height });
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
