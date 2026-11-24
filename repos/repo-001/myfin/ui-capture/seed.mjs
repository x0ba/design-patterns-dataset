// Seeds MyFin through its own API: creates the user (if needed), logs in, and restores seed-backup.json
// via PUT /user/restore (the app's backup-import path). Usage: node seed.mjs [apiBaseUrl]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://127.0.0.1:4420';
const USER = { username: 'marta', password: 'myfin-demo-2026', email: 'marta.oliveira@example.pt' };
const j = (r) => r.text().then((t) => { try { return JSON.parse(t); } catch { return t; } });
const post = (p, body, headers = {}) => fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(j);
console.log('signup:', await post('/users/', USER));
const session = await post('/auth/', { username: USER.username, password: USER.password });
if (!session.sessionkey) throw new Error('login failed: ' + JSON.stringify(session));
const auth = { sessionkey: session.sessionkey, authusername: USER.username };
const backup = fs.readFileSync(path.join(HERE, 'seed-backup.json'), 'utf8');
const t0 = Date.now();
const r = await fetch(BASE + '/user/restore', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...auth }, body: backup });
console.log('restore:', r.status, await j(r), `${Date.now() - t0}ms`);
const accts = await fetch(BASE + '/accounts/', { headers: auth }).then(j);
for (const a of accts) console.log(`  ${a.name.padEnd(32)} ${a.status.padEnd(8)} ${a.balance}`);

// Tag a realistic subset of transactions via the regular update endpoint (restore does not carry tag links)
const cats = Object.fromEntries((await fetch(BASE + '/cats', { headers: auth }).then(j)).map((c) => [c.category_id, c.name]));
const all = [];
for (let page = 0; ; page++) {
  const r = await fetch(`${BASE}/trxs/filteredByPage/${page}?page_size=300`, { headers: auth }).then(j);
  all.push(...r.results);
  if (r.results.length < 300) break;
}
const tagFor = (t) => {
  const c = cats[t.categories_category_id] ?? '';
  const out = [];
  if (c === 'Travel') out.push('vacation');
  if (c === 'Health & Pharmacy' || c === 'Books & Courses') out.push('tax-deductible');
  if (c === 'Reimbursable' || c === 'Freelance') out.push('work');
  if (/Ana|Concerto|amigos|Airbnb|jantar surpresa/i.test(t.description)) out.push('shared-with-ana');
  if (/MacBook|sofá|máquina lavar|Pneus|pintura|obras/i.test(t.description)) out.push('one-off');
  if (/MacBook/i.test(t.description)) out.push('work');
  return [...new Set(out)];
};
let tagged = 0;
for (const t of all) {
  const tags = tagFor(t);
  if (!tags.length) continue;
  const body = {
    new_amount: Number(t.amount), new_type: t.type, new_description: t.description,
    new_entity_id: t.entity_id ?? '', new_account_from_id: t.accounts_account_from_id ?? '', new_account_to_id: t.accounts_account_to_id ?? '',
    new_category_id: t.categories_category_id ?? '', new_date_timestamp: t.date_timestamp, new_is_essential: !!t.is_essential,
    transaction_id: t.transaction_id, tags: JSON.stringify(tags),
  };
  const r = await fetch(BASE + '/trxs', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(body) });
  if (r.status !== 200) console.log('tag fail', t.transaction_id, r.status, await j(r)); else tagged++;
}
console.log(`tagged ${tagged} of ${all.length} transactions`);
