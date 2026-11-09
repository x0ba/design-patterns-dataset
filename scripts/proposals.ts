#!/usr/bin/env node
// Review agent proposals between batches (README "Rules" §5–6).
//
//   node scripts/proposals.ts list [batch] [--all]
//   node scripts/proposals.ts show <batch> <id>
//   node scripts/proposals.ts accept <batch> <id> [--note "..."] [--by name]
//   node scripts/proposals.ts reject <batch> <id> --note "why" [--by name]
//   node scripts/proposals.ts deprecate <id> --replaced-by <id> [--note "..."]
//
// accept/deprecate edit codebook/, bump codebook/VERSION (minor for additions,
// major for deprecations) and append to codebook/CHANGELOG.md — then rebuild
// dist/ with scripts/build-codebook.ts before the next batch.

import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { acceptProposal, deprecateEntry, listProposals, proposalFile, rejectProposal } from '../src/pipeline/proposals.ts';

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { note: { type: 'string' }, by: { type: 'string' }, 'replaced-by': { type: 'string' }, all: { type: 'boolean', default: false } },
});
const [cmd, a, b] = positionals;

try {
  switch (cmd) {
    case 'list':
    case undefined: {
      const rows = listProposals(a).filter((r) => opts.all || r.proposal.status === 'open');
      if (!rows.length) { console.log(opts.all ? 'No proposals.' : 'No open proposals. (--all to include reviewed ones)'); break; }
      for (const { batch, proposal: p } of rows) {
        const vals = p.dimensions.flatMap((d) => d.subdimensions.flatMap((s) => s.values.map((v) => `${s.id}=${v.id}`)));
        console.log(`${p.status.padEnd(8)} ${batch}/${p.id.padEnd(28)} ${p.kind.padEnd(10)} ${p.rationale.length} filing(s) · ${p.sources.length} site(s)${vals.length ? ` · ${vals.slice(0, 4).join(', ')}${vals.length > 4 ? ', …' : ''}` : ''}`);
      }
      break;
    }
    case 'show':
      need(a && b, 'show <batch> <id>');
      console.log(fs.readFileSync(proposalFile(a, b), 'utf8'));
      break;
    case 'accept': {
      need(a && b, 'accept <batch> <id>');
      const r = acceptProposal(a, b, { by: opts.by, note: opts.note });
      console.log(`Accepted ${a}/${b} -> ${r.file}\nCodebook is now ${r.version}. Rebuild before the next batch: node scripts/build-codebook.ts`);
      break;
    }
    case 'reject':
      need(a && b && opts.note, 'reject <batch> <id> --note "reason"');
      rejectProposal(a, b, { by: opts.by, note: opts.note });
      console.log(`Rejected ${a}/${b}.`);
      break;
    case 'deprecate': {
      need(a && opts['replaced-by'], 'deprecate <id> --replaced-by <id>');
      const r = deprecateEntry(a, opts['replaced-by']!, opts.note);
      console.log(`Deprecated ${a} (replaced by ${opts['replaced-by']}). Codebook is now ${r.version}. Rebuild: node scripts/build-codebook.ts`);
      break;
    }
    default:
      need(false, 'list | show | accept | reject | deprecate');
  }
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}

function need(ok: unknown, usage: string): asserts ok {
  if (!ok) { console.error(`usage: node scripts/proposals.ts ${usage}`); process.exit(2); }
}
