#!/usr/bin/env node
// CI gate for codebook/: schema violations, duplicate ids, filename/id mismatch,
// dangling parent/related ids, missing preview files, undeclared preview dims.
//
//   node scripts/validate-codebook.ts

import { validateCodebook } from '../src/codebook/validate.ts';

const problems = validateCodebook();
if (problems.length) {
  for (const p of problems) console.error(`${p.file}: ${p.message}`);
  console.error(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}
console.log('codebook OK');
