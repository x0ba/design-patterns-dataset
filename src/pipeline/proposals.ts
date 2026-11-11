// Codebook proposals (README "Rules" §5–6).
//
// During a batch, agents never edit codebook/. They file proposals to
// proposals/<batch>/<id>.yaml; repeated filings of the same id (other raters,
// other sites) are merged into the same file. Between batches a person accepts
// or rejects each one; acceptance edits codebook/, bumps VERSION and appends a
// CHANGELOG line.

import fs from 'node:fs';
import path from 'node:path';
import { P } from '../paths.ts';
import { PATTERN_HEADER, readVersion, readYaml, writeYaml } from '../codebook/io.ts';
import { validateCodebook } from '../codebook/validate.ts';
import type { PatternDimension, PatternEntry, PatternValue } from '../codebook/types.ts';
import type { BBox } from './label.ts';

export type ProposalKind = 'new-entry' | 'new-values';
export type ProposalStatus = 'open' | 'accepted' | 'rejected';

export interface ProposedDimension {
  name?: string;
  family?: string;
  question?: string;
  subdimensions: { id: string; name?: string; select?: 'one' | 'many'; values: PatternValue[] }[];
}

export interface Proposal {
  id: string;
  kind: ProposalKind;
  status: ProposalStatus;
  batch: string;
  codebookVersion: string;
  name?: string;
  level?: PatternEntry['level'];
  parent?: string;
  definition?: string;
  aliases?: string[];
  relations?: Partial<PatternEntry['relations']>;
  dimensions: ProposedDimension[];
  rationale: { rater: string; site: string; text: string }[];
  sources: { batch: string; site: string; url: string; note?: string }[];
  evidence: { site: string; rater: string; bbox?: BBox; quote?: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
  review?: { at: string; by?: string; note?: string; mergedInto?: string };
}

/** What a rater submits through the propose_codebook_change tool. */
export interface ProposalInput {
  id: string;
  kind: ProposalKind;
  rationale: string;
  name?: string;
  level?: PatternEntry['level'];
  parent?: string;
  definition?: string;
  aliases?: string[];
  relations?: Partial<PatternEntry['relations']>;
  dimensions?: ProposedDimension[];
  evidence?: { bbox?: BBox; quote?: string; note?: string }[];
}

export const proposalFile = (batch: string, id: string) => path.join(P.proposals, batch, `${id}.yaml`);

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Check a proposal against the frozen codebook. Returns error strings. */
export function checkProposal(input: ProposalInput, entries: Map<string, Pick<PatternEntry, 'id' | 'level' | 'dimensions'>>, familyIds: string[]): string[] {
  const errs: string[] = [];
  if (!KEBAB.test(input.id ?? '')) errs.push(`id "${input.id}" must be kebab-case`);
  if (!input.rationale?.trim()) errs.push('rationale is required');
  const existing = entries.get(input.id);
  if (input.kind === 'new-entry') {
    if (existing) errs.push(`"${input.id}" already exists — use kind "new-values" to add variations to it`);
    if (!input.name) errs.push('new-entry needs name');
    if (!input.definition) errs.push('new-entry needs definition');
    if (!input.level) errs.push('new-entry needs level (archetype | pattern | component)');
    if (input.level && input.level !== 'archetype') {
      if (!input.parent) errs.push('new-entry needs parent (an archetype id)');
      else if (entries.get(input.parent)?.level !== 'archetype') errs.push(`parent "${input.parent}" is not an archetype id`);
    }
    if (!input.dimensions?.length) errs.push('new-entry needs at least one dimension with sub-dimensions and values');
  } else if (input.kind === 'new-values') {
    if (!existing) errs.push(`"${input.id}" is not a codebook id — use kind "new-entry"`);
    if (!input.dimensions?.length) errs.push('new-values needs dimensions[].subdimensions[].values');
  } else {
    errs.push(`kind must be "new-entry" or "new-values"`);
  }
  const existingSubs = new Map((existing?.dimensions ?? []).flatMap((d) => d.subdimensions.map((s) => [s.id, s] as const)));
  for (const d of input.dimensions ?? []) {
    if (d.family && !familyIds.includes(d.family)) errs.push(`unknown family "${d.family}" (families: ${familyIds.join(', ')})`);
    for (const s of d.subdimensions ?? []) {
      const prior = existingSubs.get(s.id);
      if (!prior && (!d.name || !d.family || !d.question || !s.name || !s.select)) {
        errs.push(`sub-dimension "${s.id}" is new: give its dimension name, family, question, and the sub-dimension name and select`);
      }
      for (const v of s.values ?? []) {
        if (!KEBAB.test(v.id ?? '')) errs.push(`value id "${v.id}" must be kebab-case`);
        if (!v.name) errs.push(`value "${v.id}" needs a name`);
        if (prior?.values.some((x) => x.id === v.id)) errs.push(`${input.id}.${s.id} already has value "${v.id}"`);
      }
      if (!s.values?.length) errs.push(`sub-dimension "${s.id}" lists no values`);
    }
  }
  return errs;
}

/** File (or merge into) proposals/<batch>/<id>.yaml. */
export function fileProposal(
  input: ProposalInput,
  ctx: { batch: string; codebookVersion: string; rater: string; site: string; url: string },
): { file: string; merged: boolean } {
  const file = proposalFile(ctx.batch, input.id);
  const now = new Date().toISOString();
  const prior = fs.existsSync(file) ? readYaml<Proposal>(file) : undefined;
  const p: Proposal = prior ?? {
    id: input.id,
    kind: input.kind,
    status: 'open',
    batch: ctx.batch,
    codebookVersion: ctx.codebookVersion,
    ...(input.name ? { name: input.name } : {}),
    ...(input.level ? { level: input.level } : {}),
    ...(input.parent ? { parent: input.parent } : {}),
    ...(input.definition ? { definition: input.definition } : {}),
    ...(input.aliases?.length ? { aliases: input.aliases } : {}),
    ...(input.relations ? { relations: input.relations } : {}),
    dimensions: [],
    rationale: [],
    sources: [],
    evidence: [],
    createdAt: now,
    updatedAt: now,
  };
  p.dimensions = mergeDims(p.dimensions, input.dimensions ?? []);
  p.rationale.push({ rater: ctx.rater, site: ctx.site, text: input.rationale.trim() });
  if (!p.sources.some((s) => s.site === ctx.site)) p.sources.push({ batch: ctx.batch, site: ctx.site, url: ctx.url, note: `proposed by ${ctx.rater}` });
  else p.sources.find((s) => s.site === ctx.site)!.note += `, ${ctx.rater}`;
  for (const ev of input.evidence ?? []) p.evidence.push({ site: ctx.site, rater: ctx.rater, ...ev });
  p.updatedAt = now;
  writeYaml(file, p, `# Codebook proposal (${p.kind}) — review with: node scripts/proposals.ts show ${ctx.batch} ${p.id}`);
  return { file, merged: !!prior };
}

function mergeDims(into: ProposedDimension[], add: ProposedDimension[]): ProposedDimension[] {
  const out = structuredClone(into);
  for (const d of add) {
    for (const s of d.subdimensions ?? []) {
      let host = out.find((x) => x.subdimensions.some((y) => y.id === s.id)) ?? out.find((x) => d.name && x.name === d.name);
      if (!host) {
        host = { ...(d.name ? { name: d.name } : {}), ...(d.family ? { family: d.family } : {}), ...(d.question ? { question: d.question } : {}), subdimensions: [] };
        out.push(host);
      }
      let sub = host.subdimensions.find((y) => y.id === s.id);
      if (!sub) {
        sub = { id: s.id, ...(s.name ? { name: s.name } : {}), ...(s.select ? { select: s.select } : {}), values: [] };
        host.subdimensions.push(sub);
      }
      for (const v of s.values ?? []) if (!sub.values.some((x) => x.id === v.id)) sub.values.push(v);
    }
  }
  return out;
}

// ------------------------------------------------------------------ review

export interface ProposalRecord { batch: string; file: string; proposal: Proposal }

export function listProposals(batch?: string): ProposalRecord[] {
  if (!fs.existsSync(P.proposals)) return [];
  const batches = batch ? [batch] : fs.readdirSync(P.proposals).filter((b) => fs.statSync(path.join(P.proposals, b)).isDirectory());
  return batches.flatMap((b) => {
    const dir = path.join(P.proposals, b);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort()
      .map((f) => ({ batch: b, file: path.join(dir, f), proposal: readYaml<Proposal>(path.join(dir, f)) }));
  });
}

export function bumpVersion(v: string, kind: 'major' | 'minor' | 'patch'): string {
  const [a, b, c] = v.split('.').map(Number);
  return kind === 'major' ? `${a + 1}.0.0` : kind === 'minor' ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
}

function appendChangelog(version: string, line: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const text = fs.existsSync(P.changelog) ? fs.readFileSync(P.changelog, 'utf8') : '# Codebook changelog\n';
  const heading = `## ${version} — ${date}`;
  const out = text.includes(`## ${version} `)
    ? text.replace(new RegExp(`(## ${version.replace(/\./g, '\\.')} [^\\n]*\\n(?:\\n?- [^\\n]*\\n)*)`), `$1- ${line}\n`)
    : text.trimEnd() + `\n\n${heading}\n\n- ${line}\n`;
  fs.writeFileSync(P.changelog, out);
}

/** Apply codebook edits transactionally: validate after, roll back on failure. */
function transact(files: string[], edit: () => void, msg: () => string, bump: 'major' | 'minor'): { version: string } {
  const snapshot = new Map<string, string | null>();
  for (const f of [...files, P.version, P.changelog]) snapshot.set(f, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
  const rollback = () => {
    for (const [f, content] of snapshot) {
      if (content === null) fs.rmSync(f, { force: true });
      else fs.writeFileSync(f, content);
    }
  };
  try {
    edit();
    const version = bumpVersion(readVersion(), bump);
    fs.writeFileSync(P.version, version + '\n');
    appendChangelog(version, msg());
    const problems = validateCodebook();
    if (problems.length) {
      throw new Error(`codebook would be invalid; nothing changed:\n${problems.map((p) => `  ${p.file}: ${p.message}`).join('\n')}`);
    }
    return { version };
  } catch (e) {
    rollback();
    throw e;
  }
}

export function acceptProposal(batch: string, id: string, opts: { by?: string; note?: string } = {}): { version: string; file: string } {
  const file = proposalFile(batch, id);
  const p = readYaml<Proposal>(file);
  if (p.status !== 'open') throw new Error(`${batch}/${id} is already ${p.status}`);
  const entryFile = path.join(P.patterns, `${id}.yaml`);
  const nextVersion = bumpVersion(readVersion(), 'minor');
  let summary = '';

  const { version } = transact([entryFile], () => {
    const sources = p.sources.map((s) => ({ batch: s.batch, site: s.site, url: s.url, note: `proposal ${batch}/${id}` }));
    if (p.kind === 'new-entry') {
      const entry: PatternEntry = {
        id: p.id,
        name: p.name ?? p.id,
        level: p.level ?? 'pattern',
        ...(p.level === 'archetype' ? {} : { parent: p.parent }),
        aliases: p.aliases ?? [],
        definition: p.definition ?? '',
        data: '',
        platforms: ['web'],
        domains: [],
        anatomy: [],
        roles: [],
        dimensions: p.dimensions.map(completeDim),
        wild: { score: 0, note: '', examples: [] },
        techniques: [],
        signature: '',
        sample: '',
        unit: '',
        relations: { uses: p.relations?.uses ?? [], specializes: p.relations?.specializes ?? [], neighbors: p.relations?.neighbors ?? [] },
        scores: { ubiquity: 0, potential: 0, spec: 0 },
        evidence: 'proposed',
        usage: [],
        questions: [],
        previews: [],
        sources,
        addedIn: nextVersion,
      };
      writeYaml(entryFile, entry, PATTERN_HEADER(id));
      const n = entry.dimensions.reduce((a, d) => a + d.subdimensions.length, 0);
      summary = `Added ${entry.level} \`${id}\` (${n} sub-dimension${n === 1 ? '' : 's'}) from proposal ${batch}/${id}, found on ${p.sources.map((s) => s.site).join(', ')}.`;
    } else {
      const entry = readYaml<PatternEntry>(entryFile);
      const added: string[] = [];
      for (const d of p.dimensions) {
        for (const s of d.subdimensions) {
          const host = entry.dimensions.find((x) => x.subdimensions.some((y) => y.id === s.id));
          const sub = host?.subdimensions.find((y) => y.id === s.id);
          if (sub) {
            for (const v of s.values) if (!sub.values.some((x) => x.id === v.id)) { sub.values.push(v); added.push(`${s.id}=${v.id}`); }
          } else {
            const dim = entry.dimensions.find((x) => x.name === d.name);
            const newSub = { id: s.id, name: s.name ?? s.id, select: s.select ?? 'one' as const, values: s.values };
            if (dim) dim.subdimensions.push(newSub);
            else entry.dimensions.push(completeDim({ ...d, subdimensions: [newSub] }));
            added.push(`${s.id} (${s.values.map((v) => v.id).join(', ')})`);
          }
        }
      }
      entry.sources.push(...sources);
      writeYaml(entryFile, entry, PATTERN_HEADER(id));
      summary = `\`${id}\`: added ${added.join('; ')} from proposal ${batch}/${id}, found on ${p.sources.map((s) => s.site).join(', ')}.`;
    }
  }, () => summary, 'minor');

  p.status = 'accepted';
  p.review = { at: new Date().toISOString(), ...(opts.by ? { by: opts.by } : {}), ...(opts.note ? { note: opts.note } : {}), mergedInto: version };
  writeYaml(file, p);
  return { version, file: entryFile };
}

export function rejectProposal(batch: string, id: string, opts: { by?: string; note?: string } = {}): void {
  const file = proposalFile(batch, id);
  const p = readYaml<Proposal>(file);
  if (p.status !== 'open') throw new Error(`${batch}/${id} is already ${p.status}`);
  p.status = 'rejected';
  p.review = { at: new Date().toISOString(), ...(opts.by ? { by: opts.by } : {}), ...(opts.note ? { note: opts.note } : {}) };
  writeYaml(file, p);
}

/** Rule 6: renames/removals keep the file, marked deprecated, and bump major. */
export function deprecateEntry(id: string, replacedBy: string, note?: string): { version: string } {
  const entryFile = path.join(P.patterns, `${id}.yaml`);
  if (!fs.existsSync(entryFile)) throw new Error(`no entry "${id}"`);
  return transact([entryFile], () => {
    const entry = readYaml<PatternEntry>(entryFile);
    entry.deprecated = true;
    entry.replacedBy = replacedBy;
    writeYaml(entryFile, entry, PATTERN_HEADER(id));
  }, () => `Deprecated \`${id}\`; replaced by \`${replacedBy}\`.${note ? ' ' + note : ''}`, 'major');
}

function completeDim(d: ProposedDimension): PatternDimension {
  return {
    name: d.name ?? 'Untitled',
    family: d.family ?? 'content',
    question: d.question ?? '',
    subdimensions: d.subdimensions.map((s) => ({ id: s.id, name: s.name ?? s.id, select: s.select ?? 'one', values: s.values })),
  };
}
