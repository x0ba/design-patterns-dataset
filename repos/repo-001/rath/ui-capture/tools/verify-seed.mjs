// Runs out/__seed/boot.js against fake-indexeddb + a fetch backed by ./out, then reads back
// through Rath's own localforage the way getDataStorageList()/getDataStorageById() do.
import 'fake-indexeddb/auto';
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const out = path.resolve('../out');
const require = createRequire(path.resolve('../../packages/rath-client/package.json'));
const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)) };
const base = 'http://localhost:4460/';
globalThis.window = globalThis;
globalThis.fetch = async (u) => { const p = new URL(u, base).pathname; const f = path.join(out, p); return fs.existsSync(f) ? new Response(fs.readFileSync(f)) : new Response('nf', { status: 404 }); };
globalThis.document = { baseURI: base, querySelector: () => ({ dataset: { app: './__seed/noop.mjs' } }) };
fs.writeFileSync(path.join(out, '__seed/noop.mjs'), 'export {}');
let src = fs.readFileSync(path.join(out, '__seed/boot.js'), 'utf8').replace('import.meta.url', `'${base}__seed/boot.js'`).replace(/await import\([^;]+;/, '');
fs.writeFileSync('./_boot.mjs', src);
await import('./_boot.mjs');
fs.unlinkSync(path.join(out, '__seed/noop.mjs'));
console.log('demo redirect:', (await (await window.fetch('https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-cars-service.json')).json()).dataSource.length, 'rows');
const localforage = require('localforage');
const metas = localforage.createInstance({ name: 'rath_storage_instance', storeName: 'meta' });
const keys = await metas.keys();
for (const k of keys) { const m = await metas.getItem(k); console.log(m.type, m.tag, m.userTagGroup, m.rows, m.size + 'kb', new Date(m.editTime).toISOString().slice(0, 16), m.name); }
const ds = localforage.createInstance({ name: 'rath_storage_instance', storeName: 'datasource' });
console.log('orders rows read back:', (await ds.getItem('orders_2025-09_to_2026-11.csv')).length, 'marker:', store['rath:ui-capture-seed']);
