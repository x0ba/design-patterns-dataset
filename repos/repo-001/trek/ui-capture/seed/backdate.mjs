// Spreads server-stamped creation times (all "now" after an API seed) over plausible past
// dates: trips are created weeks/months before they start, chat messages run up to the trip.
// Usage (from server/): node ../.ui-capture/seed/backdate.mjs ../.ui-capture/data/travel.db
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const Database = require('better-sqlite3');
const db = new Database(process.argv[2]);
const NOW = new Date('2026-11-16T18:30:00Z');
const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const day = 864e5;
const trips = db.prepare('select id, start_date, end_date from trips').all();
const tx = db.transaction(() => {
  for (const t of trips) {
    const start = t.start_date ? new Date(t.start_date + 'T09:00:00Z') : new Date(+NOW - 20 * day);
    const created = new Date(Math.min(+start - (40 + (t.id * 37) % 140) * day, +NOW - 12 * day));
    db.prepare('update trips set created_at = ?, updated_at = ? where id = ?').run(fmt(created), fmt(new Date(Math.min(+NOW, +start + 2 * day))), t.id);
    const until = new Date(Math.min(+NOW - 3600e3, t.end_date ? +new Date(t.end_date + 'T20:00:00Z') : +NOW));
    for (const table of ['collab_messages', 'collab_notes', 'collab_polls', 'todo_items', 'budget_items', 'trip_files']) {
      const rows = db.prepare(`select id from ${table} where trip_id = ? order by id`).all(t.id);
      // Chat on an ongoing/finished trip clusters at the end; planning artefacts spread across the run-up.
      const from = table === 'collab_messages' && t.start_date && +new Date(t.start_date) < +NOW ? new Date(Math.max(+created, +start - 25 * day)) : created;
      rows.forEach((r, i) => {
        const frac = rows.length === 1 ? 0.5 : i / (rows.length - 1);
        const ts = new Date(+from + frac * (+until - +from) - ((r.id * 7919) % 300) * 60e3);
        db.prepare(`update ${table} set created_at = ? where id = ?`).run(fmt(ts), r.id);
      });
    }
  }
});
tx();
db.pragma('wal_checkpoint(TRUNCATE)');
console.log('[backdate] done for', trips.length, 'trips');
