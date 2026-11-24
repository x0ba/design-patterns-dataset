// Applies historical timestamps (from backdate.json written by seed_api.mjs) to the SQLite DB,
// so created_at / status history reflect ~15 months of real use. Run with the backend stopped.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
const [dbPath, jsonPath] = process.argv.slice(2);
const b = JSON.parse(readFileSync(jsonPath, "utf8"));
const db = new DatabaseSync(dbPath);
const upd = (sql, ...a) => db.prepare(sql).run(...a);
db.exec("BEGIN");
for (const [id, at] of Object.entries(b.customers)) upd("UPDATE customers SET created_at=? WHERE id=?", at, id);
for (const [id, at] of Object.entries(b.products)) upd("UPDATE products SET created_at=?, updated_at=? WHERE id=?", at, at, id);
for (const [id, at] of Object.entries(b.users)) upd("UPDATE users SET created_at=?, updated_at=? WHERE id=?", at, at, id);
upd("UPDATE users SET created_at='2025-08-20T19:41:00.000Z', updated_at='2025-08-20T19:41:00.000Z' WHERE username='admin'");
upd("UPDATE tax_definitions SET created_at='2025-08-20T20:02:00.000Z', updated_at='2025-08-20T20:02:00.000Z'");
const hist = db.prepare("SELECT id, status FROM invoice_status_history WHERE invoice_id=? ORDER BY rowid");
for (const [id, info] of Object.entries(b.invoices)) {
  const rows = hist.all(id);
  const used = new Set();
  for (const r of rows) {
    const h = info.history.find((x, i) => x.status === r.status && !used.has(i));
    if (!h) continue;
    used.add(info.history.indexOf(h));
    upd("UPDATE invoice_status_history SET changed_at=? WHERE id=?", h.at, r.id);
  }
  const last = info.history[info.history.length - 1].at;
  upd("UPDATE invoices SET created_at=?, updated_at=? WHERE id=?", info.createdAt, last, id);
}
db.exec("COMMIT");
db.close();
console.log("backdated", Object.keys(b.invoices).length, "invoices");
