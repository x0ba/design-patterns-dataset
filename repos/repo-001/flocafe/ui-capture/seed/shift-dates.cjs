'use strict';
// Moves every stored date in the runtime DB forward by whole days so the most recent
// seeded business day becomes "today" (America/Los_Angeles). No-op on the seed day.
// usage: node shift-dates.cjs path/to/flo.db
const path = require('path');
const Database = require(path.resolve(__dirname, '../../node_modules/better-sqlite3'));
const db = new Database(process.argv[2]);
const TZ = 'America/Los_Angeles';
const localDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const last = db.prepare('SELECT max(created_at) m FROM orders').get().m;
if (!last) process.exit(0);
const seedDay = localDay(new Date(last.replace(' ', 'T') + 'Z'));
const today = process.env.SHIFT_TODAY || localDay(new Date());
const n = Math.round((Date.parse(today) - Date.parse(seedDay)) / 86400000);
if (n <= 0) {
  console.log(`[shift-dates] data already current (${seedDay})`);
  process.exit(0);
}
console.log(`[shift-dates] shifting data ${n} day(s): ${seedDay} -> ${today}`);

const SKIP = new Set(['settings', 'sqlite_sequence', '_flo_meta', 'sequences']);
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table'").all()
  .filter((t) => !SKIP.has(t.name) && !/VIRTUAL/i.test(t.sql || '') && !/_fts_/.test(t.name));
const D = "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]";
let failed = 0;
db.exec('PRAGMA foreign_keys = OFF');
const tx = db.transaction(() => {
  for (const { name } of tables) {
    for (const col of db.prepare(`PRAGMA table_info("${name}")`).all()) {
      const c = `"${col.name}"`;
      const stmts = [
        `UPDATE "${name}" SET ${c} = strftime('%Y-%m-%d %H:%M:%S', ${c}, '+${n} days') WHERE typeof(${c}) = 'text' AND ${c} GLOB '${D} [0-9][0-9]:[0-9][0-9]:[0-9][0-9]'`,
        `UPDATE "${name}" SET ${c} = strftime('%Y-%m-%dT%H:%M:%S', substr(${c}, 1, 19), '+${n} days') || substr(${c}, 20) WHERE typeof(${c}) = 'text' AND ${c} GLOB '${D}T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'`,
        `UPDATE "${name}" SET ${c} = date(${c}, '+${n} days') WHERE typeof(${c}) = 'text' AND ${c} GLOB '${D}' AND length(${c}) = 10`,
      ];
      for (const sql of stmts) {
        try {
          db.prepare(sql).run();
        } catch {
          failed++;
        }
      }
    }
  }
  const bump = (num) => num.replace(/-(\d{8})-/, (_, d) => {
    const t = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8)) + n * 86400000);
    return `-${t.toISOString().slice(0, 10).replace(/-/g, '')}-`;
  });
  for (const [t, col] of [['orders', 'order_number'], ['bills', 'bill_number']]) {
    const rows = db.prepare(`SELECT id, ${col} v FROM ${t} ORDER BY id DESC`).all();
    const up = db.prepare(`UPDATE ${t} SET ${col} = ? WHERE id = ?`);
    for (const r of rows) up.run('tmp-' + r.id, r.id);
    for (const r of rows) up.run(bump(r.v), r.id);
  }
  for (const r of db.prepare('SELECT rowid, date FROM sequences ORDER BY date DESC').all()) {
    db.prepare('UPDATE sequences SET date = ? WHERE rowid = ?').run(bump(`-${r.date}-`).slice(1, 9), r.rowid);
  }
});
tx();
db.exec('PRAGMA foreign_keys = ON');
db.close();
if (failed) console.log(`[shift-dates] ${failed} column update(s) skipped`);
