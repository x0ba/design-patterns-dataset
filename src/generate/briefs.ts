// Generation briefs: the sampling frame for generated UIs (briefs/<batch>.yaml),
// the generated-UI counterpart of sites/<batch>.yaml.
//
// A brief is one cell of domain × software function, assigned a generator
// model, then written out by a model as a concrete product, user, moment and
// data. Briefs describe the work and never the interface: if a brief asked for
// a kanban board, the raters would find a kanban board and the labels would
// only echo the prompt. echoTerms() flags codebook pattern names that leak into
// a brief anyway, for review before generation.
//
// Axes:
//   domain    — the label schema's domain enum, minus marketing/portfolio/other
//               (landing pages are what the captured batches already have)
//   archetype — the codebook's archetypes (analyze, create, communicate, ...),
//               i.e. what the user is doing with the software

import fs from 'node:fs';
import YAML from 'yaml';
import type { BundleEntry, CodebookBundle } from '../codebook/bundle.ts';
import { labelSchema } from '../pipeline/label.ts';
import { claudeJson, type ModelChoice } from './claude.ts';

export interface Brief {
  slug: string;
  domain: string;
  /** Codebook archetype id: the software function this cell samples. Not shown to the generator. */
  archetype: string;
  /** Generator id (config/generators.yaml). */
  generator: string;
  product: string;
  summary: string;
  user: string;
  moment: string;
  data: string;
  /** Codebook pattern names found in the brief text: `<id>: "<term>"`. Review before generating. */
  echo?: string[];
}

export interface BriefFile {
  batch: string;
  description?: string;
  createdAt: string;
  codebookVersion: string;
  seed: number;
  writer: ModelChoice;
  briefs: Brief[];
}

export interface GeneratorConfig {
  id: string;
  model: string;
  effort?: string;
  command?: string;
}

export interface GenerationConfig {
  briefWriter: ModelChoice;
  generators: GeneratorConfig[];
  tools: string[];
  timeoutMinutes: number;
  repairRounds: number;
}

export const EXCLUDED_DOMAINS = new Set(['marketing-landing', 'portfolio-agency', 'other']);

export function frameDomains(): string[] {
  return (labelSchema().$defs.domain.enum as string[]).filter((d) => !EXCLUDED_DOMAINS.has(d));
}

export function frameArchetypes(codebook: CodebookBundle): BundleEntry[] {
  return codebook.entries.filter((e) => e.level === 'archetype' && !e.deprecated);
}

export interface Cell { domain: string; archetype: string; generator: string }

/**
 * n cells with even marginals. Domains and archetypes are seeded shuffles walked
 * in lockstep, so with D domains and A archetypes every (domain, archetype) pair
 * is distinct for n ≤ lcm(D, A) and each domain/archetype count differs by at
 * most one. Generators rotate per round of domains, so no domain is tied to one
 * model.
 */
export function planCells(n: number, domains: string[], archetypes: string[], generators: string[], seed: number): Cell[] {
  if (!domains.length || !archetypes.length || !generators.length) throw new Error('planCells: empty axis');
  const rand = mulberry32(seed);
  const D = shuffle(domains, rand);
  const A = shuffle(archetypes, rand);
  const cells: Cell[] = [];
  for (let i = 0; i < n; i++) {
    const d = i % D.length;
    cells.push({ domain: D[d], archetype: A[i % A.length], generator: generators[(d + Math.floor(i / D.length)) % generators.length] });
  }
  return cells;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------------------------------------------------- echo check

/** Codebook pattern/component names and aliases that appear in a brief's text. */
export function echoTerms(brief: Pick<Brief, 'product' | 'summary' | 'user' | 'moment' | 'data'>, codebook: CodebookBundle): string[] {
  const text = [brief.product, brief.summary, brief.user, brief.moment, brief.data].join('\n').toLowerCase();
  const hits: string[] = [];
  for (const e of codebook.entries) {
    if (e.level === 'archetype' || e.deprecated) continue;
    const terms = [...new Set([e.name, ...e.aliases].map((t) => t.toLowerCase().trim()).filter((t) => t.length >= 3))];
    const hit = terms.find((t) => new RegExp(`(^|[^a-z])${escapeRe(t)}(s|es)?([^a-z]|$)`).test(text));
    if (hit) hits.push(`${e.id}: "${hit}"`);
  }
  return hits;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');

// ----------------------------------------------------------------- writer

const WRITER_SYSTEM = `You write product briefs for a research dataset of web application interfaces. Each brief will be handed, alone, to a coding agent that builds the app's interface from it. The dataset studies which interface patterns agents choose on their own, so a brief must describe the work, never the interface.

A brief describes:
- product: an invented product name (not a real company or product).
- summary: one sentence on what the software is and who it is for.
- user: the specific person using it right now (role, context, expertise).
- moment: what they are in the middle of doing at this moment, concretely — the goal, what just happened, what they need to decide or produce next.
- data: the concrete things the software holds at this moment, with realistic specifics and scale (names, quantities, statuses, units, time ranges).

Rules:
- Never name or describe interface elements, layouts or visual style: no dashboards, sidebars, tables, boards, cards, tabs, charts, graphs, maps-as-UI, panels, widgets, modals, buttons, lists, feeds, timelines, calendars-as-UI, colors, themes or screens. Describe people, goals, objects and their attributes; the builder decides how to show them.
- Make each product specific and unlike the others: vary scale (solo hobbyist to large organization), setting (consumer, professional, internal tool, public sector, field work, lab, classroom), and how established the product would be. Avoid generic SaaS.
- The cell's software function is what the user is doing with the software right now; the moment must clearly involve it. If the domain/function pair is unusual, find the most plausible real situation where it happens.
- The interface must be buildable as a front end with mock data: no real hardware, accounts or external services required.`;

const BRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['briefs'],
  properties: {
    briefs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['cell', 'slug', 'product', 'summary', 'user', 'moment', 'data'],
        properties: {
          cell: { type: 'integer', description: 'The cell number this brief is for.' },
          slug: { type: 'string', description: 'kebab-case, 2-4 words, at most 40 characters, describing the product (not its name).' },
          product: { type: 'string' },
          summary: { type: 'string' },
          user: { type: 'string' },
          moment: { type: 'string' },
          data: { type: 'string' },
        },
      },
    },
  },
};

interface WrittenBrief { cell: number; slug: string; product: string; summary: string; user: string; moment: string; data: string }

/** Write briefs for `cells`, `chunk` per model call; later chunks see earlier products to avoid repeats. */
export async function writeBriefs(
  cells: Cell[],
  codebook: CodebookBundle,
  writer: ModelChoice,
  opts: { chunk?: number; log?: (s: string) => void } = {},
): Promise<Brief[]> {
  const byId = new Map(codebook.entries.map((e) => [e.id, e]));
  const chunk = opts.chunk ?? 12;
  const out: Brief[] = [];
  const slugs = new Set<string>();
  for (let start = 0; start < cells.length; start += chunk) {
    const part = cells.slice(start, start + chunk);
    const lines = part.map((c, j) => {
      const a = byId.get(c.archetype);
      return `${start + j}. domain: ${c.domain} · software function: ${a?.name ?? c.archetype} — ${a?.definition ?? ''}`;
    });
    const prior = out.length ? `\n\nAlready written (do not repeat these products or situations):\n${out.map((b) => `- ${b.product}: ${b.summary}`).join('\n')}` : '';
    const prompt = `Write one brief per cell below.\n\n${lines.join('\n')}${prior}`;
    opts.log?.(`  writing briefs ${start}–${start + part.length - 1} (${writer.model})`);
    const res = await claudeJson<{ briefs: WrittenBrief[] }>(writer, { system: WRITER_SYSTEM, prompt, schema: BRIEF_SCHEMA });
    for (const [j, c] of part.entries()) {
      const w = res.briefs.find((b) => b.cell === start + j) ?? res.briefs[j];
      if (!w) throw new Error(`brief writer returned no brief for cell ${start + j}`);
      let slug = toSlug(w.slug || w.product);
      for (let k = 2; slugs.has(slug); k++) slug = `${toSlug(w.slug || w.product).slice(0, 36)}-${k}`;
      slugs.add(slug);
      const brief: Brief = { slug, domain: c.domain, archetype: c.archetype, generator: c.generator, product: w.product, summary: w.summary, user: w.user, moment: w.moment, data: w.data };
      const echo = echoTerms(brief, codebook);
      if (echo.length) brief.echo = echo;
      out.push(brief);
    }
  }
  return out;
}

export function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'app';
}

// --------------------------------------------------------------------- io

export function readBriefs(file: string): BriefFile {
  const f = YAML.parse(fs.readFileSync(file, 'utf8')) as BriefFile;
  const seen = new Set<string>();
  for (const b of f.briefs) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.slug) || b.slug.length > 40) throw new Error(`${file}: bad slug "${b.slug}" (kebab-case, ≤ 40 chars)`);
    if (seen.has(b.slug)) throw new Error(`${file}: duplicate slug "${b.slug}"`);
    seen.add(b.slug);
  }
  return f;
}

export function writeBriefFile(file: string, f: BriefFile): void {
  const header = `# Generation briefs for ${f.batch}. Review before running scripts/generate.ts:
# briefs describe the work, never the interface. \`echo\` lists codebook pattern
# names found in a brief's text; reword the brief (and delete \`echo\`) when the
# term describes the UI rather than the data. Edits are fine until generation.
`;
  fs.writeFileSync(file, header + YAML.stringify(f, { lineWidth: 0 }));
}

export function readGenerationConfig(file: string): GenerationConfig {
  const c = YAML.parse(fs.readFileSync(file, 'utf8')) as Partial<GenerationConfig>;
  if (!c.briefWriter?.model) throw new Error(`${file}: briefWriter.model is required`);
  if (!c.generators?.length) throw new Error(`${file}: no generators`);
  if (new Set(c.generators.map((g) => g.id)).size !== c.generators.length) throw new Error(`${file}: generator ids must be unique`);
  return {
    briefWriter: c.briefWriter,
    generators: c.generators,
    tools: c.tools ?? ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
    timeoutMinutes: c.timeoutMinutes ?? 45,
    repairRounds: c.repairRounds ?? 2,
  };
}
