// Runs seed-loader.js's IndexedDB write against fake-indexeddb, then opens it with Dexie 3 using the app's schema.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { readFileSync } from 'node:fs';
const seed = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)) };
globalThis.location = { origin: 'http://localhost:4443' };
globalThis.fetch = async () => ({ json: async () => seed });
let booted;
const done = new Promise(r => (booted = r));
globalThis.window = { __APP_ENTRY__: '/x.js' };
globalThis.document = { createElement: () => ({}), body: { appendChild: () => booted() } };
eval(readFileSync(new URL('../seed-loader.js', import.meta.url), 'utf8'));
await done;
class ChatDB extends Dexie { constructor() { super('chatDB'); this.version(2).stores({ chat: '++id' }); this.version(3).stores({ chat: '++id,sessionId' }); } }
const db = new ChatDB();
const all = await db.chat.toArray();
const s0 = seed.sessionState.sessions[0].id;
console.log('dexie rows', all.length, 'session0 rows', await db.chat.where('sessionId').equals(s0).count());
const id = await db.chat.add({ role: 'user', content: 'x', sessionId: s0 });
console.log('new id', id, 'host', JSON.parse(store.globalState).key.openaiHost, 'flag', store['speechgpt-ui-capture-seed']);
