// Exits 0 once Fusion has applied every migration in backend/internal/store/migrations to the DB.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, existsSync } from "node:fs";
const [db, dir] = process.argv.slice(2);
const want = readdirSync(dir).filter((f) => f.endsWith(".sql")).length;
try {
  if (!existsSync(db)) process.exit(1);
  const d = new DatabaseSync(db, { readOnly: true });
  const n = d.prepare("SELECT COUNT(*) n FROM schema_migrations").get().n;
  process.exit(n >= want ? 0 : 1);
} catch { process.exit(1); }
