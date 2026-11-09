#!/usr/bin/env node
// Capture a single URL (debugging aid; scripts/label.ts captures batches itself).
//
//   node scripts/capture.ts <url> [outDir]

import path from 'node:path';
import { P } from '../src/paths.ts';
import { captureSite, launchBrowser } from '../src/pipeline/capture.ts';
import { slugForUrl } from '../src/pipeline/sites.ts';

const [url, out] = process.argv.slice(2);
if (!url) {
  console.error('usage: node scripts/capture.ts <url> [outDir]');
  process.exit(2);
}
const dir = out ?? path.join(P.dataset, '_scratch', slugForUrl(url), 'capture');
const browser = await launchBrowser();
try {
  const meta = await captureSite(browser, url, dir);
  console.log(JSON.stringify(meta, null, 2));
  console.log(`\n-> ${path.relative(P.root, dir)}`);
} finally {
  await browser.close();
}
