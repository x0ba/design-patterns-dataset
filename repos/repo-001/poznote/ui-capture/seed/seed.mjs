// Seeds an established-user Poznote data volume into .ui-capture/seed-data.
// Starts the local server on a side port against that directory, creates
// everything through the app's REST API (/api/v1, Basic Auth), then spreads
// created/updated timestamps over the past year directly in the user's SQLite
// database (the API always stamps "now"), and finally renames the default
// admin account and sets its password the way a real user would have.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { work, personal, side, archived, trashed } from './content.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CAPTURE = path.resolve(here, '..');
const SEED = path.join(CAPTURE, 'seed-data');
const PORT = 5611;
const B = `http://localhost:${PORT}`;
const USER = 'admin_change_me', PASS = 'admin';
const FINAL = { username: 'maya', email: 'maya.lindqvist@example.no', password: 'Fjordline-2026' };
const NOW = Date.UTC(2026, 10, 16, 15, 0, 0);

fs.rmSync(SEED, { recursive: true, force: true });
fs.mkdirSync(SEED, { recursive: true });
const srv = spawn(process.execPath, [path.join(CAPTURE, 'server', 'server.mjs')], {
  env: { ...process.env, PORT: String(PORT), POZNOTE_HOST_DATA: SEED }, stdio: ['ignore', 'inherit', 'inherit'],
});
const stop = () => { try { srv.kill('SIGTERM'); } catch {} };
process.on('exit', stop);

const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
async function api(method, p, body, quiet) {
  const r = await fetch(B + '/api/v1' + p, {
    method, headers: { Authorization: auth, 'X-User-ID': '1', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok && !quiet) console.warn(`  ! ${method} ${p} -> ${r.status} ${t.slice(0, 200)}`);
  return { ok: r.ok, status: r.status, j };
}

for (let i = 0; i < 60; i++) {
  try { if ((await fetch(B + '/api/health')).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
// First authenticated call creates the master + user databases.
console.log('workspaces', (await api('GET', '/workspaces')).j);

await api('PUT', '/settings/welcome_setup', { value: 'done' });
await api('PATCH', '/workspaces/Poznote', { new_name: 'Personal' });
await api('POST', '/workspaces', { name: 'Work' });
await api('POST', '/workspaces', { name: 'Side projects' });

const folderIds = {}; // `${ws}|${path}` -> id
async function ensureFolder(ws, fpath, opts = {}) {
  if (!fpath) return null;
  const key = `${ws}|${fpath}`;
  if (folderIds[key]) return folderIds[key];
  const parts = fpath.split('/');
  const parent = parts.length > 1 ? await ensureFolder(ws, parts.slice(0, -1).join('/')) : null;
  const body = { workspace: ws, folder_name: parts.at(-1) };
  if (parent) body.parent_folder_id = parent;
  if (opts.diary) body.is_diary = true;
  const r = await api('POST', '/folders', body);
  const id = r.j?.folder?.id ?? r.j?.id ?? r.j?.folder_id;
  folderIds[key] = id;
  return id;
}

const created = []; // { id, note }
async function createNote(ws, fpath, note) {
  const folder_id = await ensureFolder(ws, fpath, { diary: note.diary });
  let content = note.body ?? '';
  if (note.type === 'tasklist') {
    content = JSON.stringify(note.tasks.map(([text, completed, priority], i) => ({
      id: 1000 + i, text, completed: !!completed, ...(priority ? { priority } : {}),
    })));
  }
  const r = await api('POST', '/notes', { heading: note.title, content, type: note.type, tags: note.tags, workspace: ws, folder_id: folder_id ?? 0 });
  const id = r.j?.note?.id ?? r.j?.id;
  if (!id) return null;
  created.push({ id, note, ws });
  if (note.fav) await api('POST', `/notes/${id}/favorite`, {});
  if (note.pin) await api('PUT', `/notes/${id}/pinned`, { pinned: true });
  if (note.color) await api('PUT', `/notes/${id}/color`, { color: note.color });
  if (note.icon) await api('PUT', `/notes/${id}/icon`, { icon: note.icon });
  return id;
}

for (const [ws, tree] of [['Work', work], ['Personal', personal], ['Side projects', side]]) {
  // Diary root needs is_diary before entries are added.
  if (tree['Diary']) await ensureFolder(ws, 'Diary', { diary: true });
  for (const [fpath, notes] of Object.entries(tree)) {
    await ensureFolder(ws, fpath);
    for (const n of notes) await createNote(ws, fpath, n);
  }
  console.log(`${ws}: ${created.filter((c) => c.ws === ws).length} notes`);
}

for (const [ws, n] of archived) {
  const id = await createNote(ws, '', n);
  if (id) await api('POST', `/notes/${id}/archive`, {});
}
for (const [ws, n] of trashed) {
  const id = await createNote(ws, '', n);
  if (id) await api('DELETE', `/notes/${id}`);
}

// Folder cosmetics
const folderStyle = { 'Work|Projects': ['lucide-briefcase', 'blue'], 'Work|Engineering/Runbooks': ['lucide-life-buoy', 'red'], 'Personal|Recipes': ['lucide-chef-hat', 'orange'], 'Personal|Travel': ['lucide-plane', 'purple'], 'Personal|Health': ['lucide-heart', 'pink'] };
for (const [k, [icon, color]] of Object.entries(folderStyle)) {
  if (folderIds[k]) await api('PUT', `/folders/${folderIds[k]}/icon`, { icon, icon_color: color });
}

// Reminders on a few notes: upcoming, overdue
const byTitle = (t) => created.find((c) => c.note.title === t)?.id;
const iso = (deltaDays, h = 9) => new Date(NOW + deltaDays * 86400000).toISOString().slice(0, 10) + `T${String(h).padStart(2, '0')}:00`;
const reminders = [
  ['Renovation to-do', iso(2), 'Call the second plumber'],
  ['Halvorsen Freight — beta onboarding', iso(17, 10), 'Dispatcher training at Halvorsen'],
  ['Bergen Christmas trip', iso(28, 7), 'Train to Bergen 08:25'],
  ['Doctor appointments', iso(-3, 8), 'Book dentist for February'],
  ['Questions for the data team', iso(1, 14), 'Send questions to Erik'],
];
for (const [t, at, message] of reminders) if (byTitle(t)) await api('POST', `/notes/${byTitle(t)}/reminder`, { reminder_at: at, message });

// Public share of two notes
for (const t of ['Sourdough — current recipe', 'Japan itinerary (April)']) if (byTitle(t)) await api('POST', `/notes/${byTitle(t)}/share`, {});

// Mark "opened" on recent notes so recents look lived-in
for (const c of created.slice(-15)) await api('POST', `/notes/${c.id}/opened`, {}, true);

// ---- spread timestamps (UTC) over the past year -------------------------
stop();
await new Promise((r) => setTimeout(r, 800));
const db = new DatabaseSync(path.join(SEED, 'users', '1', 'database', 'poznote.db'));
const fmt = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const upd = db.prepare('UPDATE entries SET created = ?, updated = ? WHERE id = ?');
let k = 0;
for (const { id, note } of created) {
  const jitter = ((k++ * 7919) % 600) * 60000; // up to 10h, deterministic
  const c = NOW - note.days * 86400000 - 6 * 3600000 + jitter;
  const u = Math.max(c, NOW - (note.upd ?? note.days) * 86400000 - 4 * 3600000 + jitter / 2);
  upd.run(fmt(c), fmt(u), id);
}
db.prepare("UPDATE entries SET created = ?, updated = ? WHERE heading = 'Welcome to Poznote'").run(fmt(NOW - 365 * 86400000), fmt(NOW - 365 * 86400000));
db.prepare('UPDATE entries SET trashed_at = updated WHERE trash = 1').run();
db.prepare('UPDATE folders SET created = ?').run(fmt(NOW - 360 * 86400000));
db.prepare('UPDATE workspaces SET created = ?').run(fmt(NOW - 365 * 86400000));
// Workspace order + the one she last had open (the app opens that one first)
const wsOrder = db.prepare('UPDATE workspaces SET display_order = ? WHERE name = ?');
['Work', 'Personal', 'Side projects', 'Archives'].forEach((n, i) => wsOrder.run(i, n));
db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_opened_workspace', 'Work')").run();
console.log(db.prepare('SELECT workspace, trash, count(*) n FROM entries GROUP BY 1,2').all());
db.close();

// ---- rename the default admin like a real owner would ----------------------
const srv2 = spawn(process.execPath, [path.join(CAPTURE, 'server', 'server.mjs')], {
  env: { ...process.env, PORT: String(PORT), POZNOTE_HOST_DATA: SEED }, stdio: ['ignore', 'inherit', 'inherit'],
});
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(B + '/api/health')).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
await api('POST', '/users/me/password', { current_password: PASS, new_password: FINAL.password, confirm_password: FINAL.password });
const auth2 = 'Basic ' + Buffer.from(`${USER}:${FINAL.password}`).toString('base64');
const r = await fetch(B + '/api/v1/users/me', { method: 'PATCH', headers: { Authorization: auth2, 'X-User-ID': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: FINAL.username, email: FINAL.email }) });
console.log('rename', r.status, (await r.text()).slice(0, 200));
srv2.kill('SIGTERM');
fs.rmSync(path.join(SEED, 'sessions'), { recursive: true, force: true });
console.log('seed done');
process.exit(0);
