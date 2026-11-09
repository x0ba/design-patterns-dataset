import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const P = {
  root: ROOT,
  codebook: path.join(ROOT, 'codebook'),
  patterns: path.join(ROOT, 'codebook', 'patterns'),
  previews: path.join(ROOT, 'codebook', 'previews'),
  atlasMeta: path.join(ROOT, 'codebook', 'atlas'),
  site: path.join(ROOT, 'codebook', 'site'),
  patternSchema: path.join(ROOT, 'codebook', 'schema', 'pattern.schema.json'),
  version: path.join(ROOT, 'codebook', 'VERSION'),
  changelog: path.join(ROOT, 'codebook', 'CHANGELOG.md'),
  dist: path.join(ROOT, 'dist'),
  distCodebook: path.join(ROOT, 'dist', 'codebook.json'),
  distAtlas: path.join(ROOT, 'dist', 'atlas.html'),
  distPreviews: path.join(ROOT, 'dist', 'previews'),
  labelSchema: path.join(ROOT, 'schema', 'label.schema.json'),
  proposals: path.join(ROOT, 'proposals'),
  sites: path.join(ROOT, 'sites'),
  dataset: path.join(ROOT, 'dataset'),
  originalAtlas: path.join(ROOT, 'codebook.html'),
};
