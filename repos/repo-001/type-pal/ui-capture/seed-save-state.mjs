// Gives projects/pal the workspace save record that the editor's own author-save journal leaves
// after a completed save (phase "committed"). A long-used project has this file. Without it, the
// editor's startup probe for .type-pal/save-state.json gets a 404 (handled by the app, but it
// shows up as a failed load in the browser). The file is gitignored by the repo
// (/projects/*/.type-pal/save-state.json). The shape matches
// packages/reforge/src/project-save-state.ts. Idempotent: an existing valid record is kept.
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'projects/pal/.type-pal/save-state.json')

const valid = (v) =>
  v &&
  Object.keys(v).sort().join(',') === 'kind,operationId,phase,planHash,version' &&
  v.kind === 'type-pal-author-save' &&
  v.version === 1 &&
  v.phase === 'committed' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v.operationId) &&
  /^[0-9a-f]{64}$/.test(v.planHash)

if (existsSync(file)) {
  try {
    if (valid(JSON.parse(readFileSync(file, 'utf8')))) process.exit(0)
  } catch {}
}

// Plan hash over the files the last save touched (scene index + map index), like a real save plan.
const plan = createHash('sha256')
for (const rel of ['content/scenes/index.json', 'content/maps/index.json'])
  plan.update(rel).update(readFileSync(resolve(root, 'projects/pal', rel)))

const record = {
  kind: 'type-pal-author-save',
  version: 1,
  operationId: randomUUID(),
  phase: 'committed',
  planHash: plan.digest('hex'),
}
writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`)
console.log('wrote', file)
