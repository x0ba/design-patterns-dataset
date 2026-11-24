// adapter-node bundles devDependencies into build/, including jsdom (pulled in by
// @misiki/kitcommerce-core's HTML sanitizer). jsdom's bundled XHR module calls
// `require.resolve('./xhr-sync-worker.js')`, which throws in ESM scope and makes every page that
// sanitizes HTML (product pages) fail. Provide a CommonJS `require` anchored at jsdom's own XHR dir.
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
globalThis.require ??= createRequire(path.join(root, 'node_modules/jsdom/lib/jsdom/living/xhr/XMLHttpRequest-impl.js'))
