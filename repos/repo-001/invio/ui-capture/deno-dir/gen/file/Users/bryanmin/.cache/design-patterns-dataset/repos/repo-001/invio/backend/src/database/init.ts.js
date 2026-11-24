import { DB } from "sqlite";
import { getAdminCredentials, getEnv, isDemoMode } from "../utils/env.ts";
import { hashPassword } from "../utils/password.ts";
import { generateUUID } from "../utils/uuid.ts";
import { RESOURCE_ACTIONS } from "../types/index.ts";
let db;
//
//  Path helpers
//
function resolvePath(p) {
  return p.startsWith("/") ? p : p;
}
function simpleDirname(p) {
  const i = p.lastIndexOf("/");
  return i <= 0 ? "/" : p.slice(0, i);
}
function ensureDir(dir) {
  if (dir && dir !== "." && dir !== "/") {
    try {
      Deno.mkdirSync(dir, {
        recursive: true
      });
    } catch  {
    /* ok */ }
  }
}
//
//  Version & backup helpers
//
function readAppVersion() {
  try {
    return Deno.readTextFileSync("./VERSION").trim();
  } catch  {
    return "unknown";
  }
}
function getStoredSchemaVersion(database) {
  try {
    const rows = database.query("SELECT value FROM settings WHERE key = '_schema_version' LIMIT 1");
    return rows.length > 0 ? String(rows[0][0]) : null;
  } catch  {
    return null; // settings table doesn't exist yet
  }
}
function storeSchemaVersion(database) {
  try {
    database.query("INSERT OR REPLACE INTO settings (key, value) VALUES ('_schema_version', ?)", [
      readAppVersion()
    ]);
  } catch  {
  /* ignore */ }
}
function createDatabaseBackup(dbPath, fromVersion) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const suffix = fromVersion ? `_v${fromVersion}` : "";
  const backupPath = dbPath.replace(/\.db$/, "") + `_backup${suffix}_${ts}.db`;
  try {
    Deno.copyFileSync(dbPath, backupPath);
    console.log(` Database backup created: ${backupPath}`);
  } catch (e) {
    console.warn("Failed to create database backup:", e);
  }
}
/** Back up the database if the stored schema version differs from the app version. */ function backupIfVersionChanged(database, dbPath) {
  try {
    const stored = getStoredSchemaVersion(database);
    if (stored !== readAppVersion()) {
      createDatabaseBackup(dbPath, stored);
    }
  } catch  {
    try {
      createDatabaseBackup(dbPath);
    } catch  {
    /* ignore */ }
  }
}
//
//  Migration helpers
//
/** Parse a .sql file into executable statements (strip comments, split on `;`). */ function parseSqlStatements(sql) {
  return sql.split("\n").map((line)=>{
    if (line.trimStart().startsWith("--")) return "";
    const idx = line.indexOf("--");
    return idx >= 0 ? line.slice(0, idx) : line;
  }).join("\n").split(";").map((s)=>s.trim()).filter((s)=>s.length > 0);
}
/** Run each statement, silently ignoring "already exists" / "duplicate column" errors. */ function executeMigrations(database, statements) {
  for (const stmt of statements){
    try {
      database.execute(stmt);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!/already exists|duplicate column name/i.test(msg)) {
        console.error("Migration error:", msg);
        console.error("Statement:", stmt);
      }
    }
  }
}
/** Safely add a column if it doesn't already exist. */ function addColumnIfMissing(database, table, column, definition) {
  const cols = database.query(`PRAGMA table_info(${table})`).map((r)=>String(r[1]));
  if (cols.includes(column)) return;
  try {
    database.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(` Added ${table}.${column} column`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/duplicate column|already exists/i.test(msg)) {
      console.warn(`Could not add ${table}.${column}:`, msg);
    }
  }
}
//
//  Schema upgrades
//
function ensureCustomerColumns(database) {
  addColumnIfMissing(database, "customers", "contact_name", "TEXT");
  addColumnIfMissing(database, "customers", "country_code", "TEXT");
  addColumnIfMissing(database, "customers", "city", "TEXT");
  addColumnIfMissing(database, "customers", "postal_code", "TEXT");
  addColumnIfMissing(database, "customers", "customer_number", "INTEGER");
  addColumnIfMissing(database, "customers", "region", "TEXT");
}
/** Assign a permanent sequential customer_number (by creation order) to any customer missing one. */ function backfillCustomerNumbers(database) {
  const rows = database.query("SELECT id FROM customers WHERE customer_number IS NULL ORDER BY created_at ASC, id ASC");
  if (rows.length === 0) return;
  const maxRow = database.query("SELECT COALESCE(MAX(customer_number), 0) FROM customers");
  let next = Number(maxRow[0][0]) + 1;
  for (const row of rows){
    database.query("UPDATE customers SET customer_number = ? WHERE id = ?", [
      next,
      String(row[0])
    ]);
    next++;
  }
  console.log(`  Backfilled customer_number for ${rows.length} existing customer(s).`);
}
function ensureInvoiceColumns(database) {
  addColumnIfMissing(database, "invoices", "prices_include_tax", "BOOLEAN DEFAULT 0");
  addColumnIfMissing(database, "invoices", "rounding_mode", "TEXT DEFAULT 'line'");
  addColumnIfMissing(database, "invoices", "locale", "TEXT");
}
function ensureInvoiceItemColumns(database) {
  addColumnIfMissing(database, "invoice_items", "unit", "TEXT");
  addColumnIfMissing(database, "invoice_items", "product_id", "TEXT REFERENCES products(id)");
  // Snapshot of the product's shipping/customs fields at the time the item was saved
  addColumnIfMissing(database, "invoice_items", "hs_code", "TEXT");
  addColumnIfMissing(database, "invoice_items", "country_of_origin", "TEXT");
  addColumnIfMissing(database, "invoice_items", "length_mm", "NUMERIC");
  addColumnIfMissing(database, "invoice_items", "width_mm", "NUMERIC");
  addColumnIfMissing(database, "invoice_items", "height_mm", "NUMERIC");
  addColumnIfMissing(database, "invoice_items", "weight_g", "NUMERIC");
}
function ensureUserColumns(database) {
  addColumnIfMissing(database, "users", "two_factor_secret", "TEXT");
  addColumnIfMissing(database, "users", "two_factor_enabled", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(database, "users", "two_factor_recovery_codes", "TEXT");
  addColumnIfMissing(database, "users", "oidc_subject", "TEXT");
}
function ensureStatusHistoryTable(database) {
  database.execute(`
    CREATE TABLE IF NOT EXISTS invoice_status_history (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      payment_method TEXT,
      note TEXT
    )
  `);
  database.execute(`CREATE INDEX IF NOT EXISTS idx_invoice_status_history_invoice_id
     ON invoice_status_history(invoice_id, changed_at)`);
  backfillStatusHistory(database);
}
function backfillStatusHistory(database) {
  // Insert one history entry per invoice that has no history yet.
  // Uses the invoice's current status and updated_at as the best available timestamp.
  const rows = database.query(`SELECT id, status, updated_at FROM invoices
     WHERE id NOT IN (SELECT DISTINCT invoice_id FROM invoice_status_history)`);
  if (rows.length === 0) return;
  for (const row of rows){
    const invoiceId = String(row[0]);
    const status = String(row[1]);
    const changedAt = row[2] ? String(row[2]) : new Date().toISOString();
    database.query(`INSERT INTO invoice_status_history (id, invoice_id, status, changed_at, payment_method, note)
       VALUES (?, ?, ?, ?, NULL, NULL)`, [
      crypto.randomUUID(),
      invoiceId,
      status,
      changedAt
    ]);
  }
  console.log(`  Backfilled status history for ${rows.length} existing invoice(s).`);
}
function ensureTaxTables(database) {
  database.execute(`
    CREATE TABLE IF NOT EXISTS tax_definitions (
      id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT,
      percent NUMERIC NOT NULL, category_code TEXT, country_code TEXT,
      vendor_specific_id TEXT, default_included BOOLEAN DEFAULT 0, metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.execute(`
    CREATE TABLE IF NOT EXISTS invoice_item_taxes (
      id TEXT PRIMARY KEY,
      invoice_item_id TEXT NOT NULL REFERENCES invoice_items(id) ON DELETE CASCADE,
      tax_definition_id TEXT REFERENCES tax_definitions(id),
      percent NUMERIC NOT NULL, taxable_amount NUMERIC NOT NULL,
      amount NUMERIC NOT NULL, included BOOLEAN NOT NULL DEFAULT 0,
      sequence INTEGER DEFAULT 0, note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.execute(`
    CREATE TABLE IF NOT EXISTS invoice_taxes (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      tax_definition_id TEXT REFERENCES tax_definitions(id),
      percent NUMERIC NOT NULL, taxable_amount NUMERIC NOT NULL,
      tax_amount NUMERIC NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
function ensureProductTables(database) {
  database.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      unit_price NUMERIC NOT NULL DEFAULT 0, sku TEXT,
      unit TEXT DEFAULT 'piece', category TEXT,
      tax_definition_id TEXT REFERENCES tax_definitions(id),
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      hs_code TEXT, country_of_origin TEXT,
      length_mm NUMERIC, width_mm NUMERIC, height_mm NUMERIC, weight_g NUMERIC
    )
  `);
  database.execute(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0, is_builtin BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.execute(`
    CREATE TABLE IF NOT EXISTS product_units (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0, is_builtin BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
/** Optional shipping/customs columns; nullable so existing products are unaffected. */ function ensureProductColumns(database) {
  addColumnIfMissing(database, "products", "hs_code", "TEXT");
  addColumnIfMissing(database, "products", "country_of_origin", "TEXT");
  addColumnIfMissing(database, "products", "length_mm", "NUMERIC");
  addColumnIfMissing(database, "products", "width_mm", "NUMERIC");
  addColumnIfMissing(database, "products", "height_mm", "NUMERIC");
  addColumnIfMissing(database, "products", "weight_g", "NUMERIC");
}
function seedProductDefaults(database) {
  const categories = [
    {
      code: "service",
      name: "Service",
      sort: 1
    },
    {
      code: "goods",
      name: "Goods",
      sort: 2
    },
    {
      code: "subscription",
      name: "Subscription",
      sort: 3
    },
    {
      code: "other",
      name: "Other",
      sort: 4
    }
  ];
  for (const c of categories){
    try {
      database.query("INSERT OR IGNORE INTO product_categories (id, code, name, sort_order, is_builtin) VALUES (?, ?, ?, ?, 1)", [
        c.code,
        c.code,
        c.name,
        c.sort
      ]);
    } catch  {
    /* ignore */ }
  }
  const units = [
    {
      code: "piece",
      name: "Piece",
      sort: 1
    },
    {
      code: "hour",
      name: "Hour",
      sort: 2
    },
    {
      code: "day",
      name: "Day",
      sort: 3
    },
    {
      code: "kg",
      name: "Kilogram",
      sort: 4
    },
    {
      code: "m",
      name: "Meter",
      sort: 5
    },
    {
      code: "lump_sum",
      name: "Lump Sum",
      sort: 6
    }
  ];
  for (const u of units){
    try {
      database.query("INSERT OR IGNORE INTO product_units (id, code, name, sort_order, is_builtin) VALUES (?, ?, ?, ?, 1)", [
        u.code,
        u.code,
        u.name,
        u.sort
      ]);
    } catch  {
    /* ignore */ }
  }
}
/**
 * Recreate the invoices table to add missing invoice statuses to the CHECK constraint.
 *
 * IMPORTANT: Foreign keys must be OFF during `DROP TABLE`  otherwise SQLite
 * performs an implicit `DELETE FROM invoices` which cascades to invoice_items.
 * See: https://www.sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes
 */ function migrateInvoicesForVoided(database) {
  const checkSql = database.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='invoices'");
  const createSql = checkSql.length > 0 ? String(checkSql[0][0]) : "";
  if (!createSql || createSql.includes("voided") && createSql.includes("complete")) {
    return;
  }
  console.log("Migrating invoices table to support 'voided' and 'complete' statuses");
  const itemCountBefore = Number(database.query("SELECT COUNT(*) FROM invoice_items")[0][0]);
  // Disable FK enforcement so DROP TABLE doesn't cascade-delete child rows
  database.execute("PRAGMA foreign_keys = OFF");
  database.execute("BEGIN TRANSACTION");
  try {
    database.execute(`
      CREATE TABLE invoices_new (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        customer_id TEXT REFERENCES customers(id),
        issue_date DATE NOT NULL,
        due_date DATE,
        currency TEXT DEFAULT 'USD',
        status TEXT CHECK(status IN ('draft','sent','complete','paid','overdue','voided')) DEFAULT 'draft',
        subtotal NUMERIC NOT NULL DEFAULT 0,
        discount_amount NUMERIC DEFAULT 0,
        discount_percentage NUMERIC DEFAULT 0,
        tax_rate NUMERIC DEFAULT 0,
        tax_amount NUMERIC DEFAULT 0,
        total NUMERIC NOT NULL,
        payment_terms TEXT,
        notes TEXT,
        share_token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        prices_include_tax BOOLEAN DEFAULT 0,
        rounding_mode TEXT DEFAULT 'line',
        locale TEXT
      )
    `);
    const existingCols = database.query("PRAGMA table_info(invoices)").map((r)=>String(r[1]));
    const newCols = database.query("PRAGMA table_info(invoices_new)").map((r)=>String(r[1]));
    const colList = existingCols.filter((c)=>newCols.includes(c)).join(", ");
    database.execute(`INSERT INTO invoices_new (${colList}) SELECT ${colList} FROM invoices`);
    database.execute("DROP TABLE invoices");
    database.execute("ALTER TABLE invoices_new RENAME TO invoices");
    database.execute("CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)");
    database.execute("CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)");
    database.execute("CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)");
    database.execute("CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON invoices(share_token)");
    database.execute("COMMIT");
    console.log(" Migrated invoices table to support 'voided' and 'complete' statuses");
  } catch (migErr) {
    database.execute("ROLLBACK");
    throw migErr;
  } finally{
    database.execute("PRAGMA foreign_keys = ON");
  }
  // Verify child rows survived
  const itemCountAfter = Number(database.query("SELECT COUNT(*) FROM invoice_items")[0][0]);
  if (itemCountAfter !== itemCountBefore) {
    console.error(`  WARNING: invoice_items row count changed during migration! ` + `Before: ${itemCountBefore}, After: ${itemCountAfter}. ` + `Check your database backup for recovery.`);
  } else if (itemCountBefore > 0) {
    console.log(`   Verified: ${itemCountBefore} invoice items preserved`);
  }
}
function ensureSchemaUpgrades(database) {
  try {
    ensureCustomerColumns(database);
    backfillCustomerNumbers(database);
    ensureInvoiceColumns(database);
    ensureTaxTables(database);
    ensureProductTables(database);
    ensureProductColumns(database);
    seedProductDefaults(database);
    migrateInvoicesForVoided(database);
    ensureInvoiceItemColumns(database);
    ensureUserColumns(database);
    ensureStatusHistoryTable(database);
  } catch (e) {
    console.warn("Schema upgrade check failed:", e);
  }
}
//
//  Built-in templates
//
const BUILTIN_TEMPLATES = [
  {
    id: "professional-modern",
    name: "Professional Modern",
    isDefault: false
  },
  {
    id: "minimalist-clean",
    name: "Minimalist Clean",
    isDefault: true
  },
  {
    id: "nova",
    name: "Nova",
    isDefault: false
  },
  {
    id: "slate",
    name: "Slate",
    isDefault: false
  }
];
function loadTemplateHtml(id) {
  const url = new URL(`../../static/templates/${id}.html`, import.meta.url);
  try {
    return Deno.readTextFileSync(url);
  } catch (e) {
    console.error(`Failed to read template ${url} (cwd=${Deno.cwd()}):`, e);
    return "<html><body><p>Template unavailable.</p></body></html>";
  }
}
function insertBuiltinTemplates(database) {
  for (const t of BUILTIN_TEMPLATES){
    const html = loadTemplateHtml(t.id);
    try {
      const existing = database.query("SELECT html FROM templates WHERE id = ?", [
        t.id
      ]);
      if (existing.length === 0) {
        database.query("INSERT INTO templates (id, name, html, is_default, created_at) VALUES (?, ?, ?, ?, ?)", [
          t.id,
          t.name,
          html,
          t.isDefault,
          new Date().toISOString()
        ]);
        console.log(` Installed template: ${t.name}`);
      } else {
        const current = String(existing[0][0] ?? "");
        if (current.trim() !== html.trim()) {
          database.query("UPDATE templates SET name = ?, html = ?, is_default = ? WHERE id = ?", [
            t.name,
            html,
            t.isDefault,
            t.id
          ]);
          console.log(`  Updated template from file: ${t.name}`);
        }
      }
    } catch (error) {
      console.error(`Failed to upsert template ${t.name}:`, error);
    }
  }
}
function ensureTemplateDefaults(database) {
  try {
    database.query("DELETE FROM templates WHERE id = ?", [
      "default-template"
    ]);
    const rows = database.query("SELECT id FROM templates");
    const ids = rows.map((r)=>String(r[0]));
    database.query("UPDATE templates SET is_default = 0");
    const preferred = ids.includes("minimalist-clean") ? "minimalist-clean" : ids[0];
    if (preferred) {
      database.query("UPDATE templates SET is_default = 1 WHERE id = ?", [
        preferred
      ]);
    }
  } catch (e) {
    console.error("Failed to ensure template defaults:", e);
  }
}
//
//  Admin seeding
//
async function seedAdminUser(database) {
  try {
    const rows = database.query("SELECT COUNT(*) FROM users");
    if (Number(rows[0][0]) > 0) return;
    const { username, password } = getAdminCredentials();
    const id = generateUUID();
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password);
    database.query(`INSERT INTO users (id, username, email, display_name, password_hash, is_admin, is_active, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, 1, 1, ?, ?)`, [
      id,
      username,
      username,
      passwordHash,
      now,
      now
    ]);
    for (const [resource, actions] of Object.entries(RESOURCE_ACTIONS)){
      for (const action of actions){
        database.query("INSERT INTO user_permissions (id, user_id, resource, action) VALUES (?, ?, ?, ?)", [
          generateUUID(),
          id,
          resource,
          action
        ]);
      }
    }
    console.log(` Seeded admin user: ${username}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("Could not seed admin user:", msg);
  }
}
//
//  Public API: init / reset / accessors
//
export async function initDatabase() {
  const dbPath = resolvePath(getEnv("DATABASE_PATH", "./invio.db"));
  ensureDir(simpleDirname(dbPath));
  // Detect existing database (upgrade vs fresh install)
  let dbFileExisted = false;
  try {
    Deno.statSync(dbPath);
    dbFileExisted = true;
  } catch  {
  /* new install */ }
  db = new DB(dbPath);
  // Backup before migrations if upgrading to a new version
  if (dbFileExisted) backupIfVersionChanged(db, dbPath);
  // Run idempotent migrations from .sql file
  const sql = Deno.readTextFileSync("./src/database/migrations.sql");
  executeMigrations(db, parseSqlStatements(sql));
  // Post-migration setup
  insertBuiltinTemplates(db);
  ensureTemplateDefaults(db);
  ensureSchemaUpgrades(db);
  await seedAdminUser(db);
  storeSchemaVersion(db);
  console.log("Database initialized successfully");
}
export async function resetDatabaseFromDemo() {
  if (!isDemoMode()) return;
  const demoDb = getEnv("DEMO_DB_PATH");
  const activePath = resolvePath(getEnv("DATABASE_PATH", "./invio.db"));
  if (!demoDb) {
    throw new Error("DEMO_MODE is true but DEMO_DB_PATH is not set.");
  }
  const demoPath = resolvePath(demoDb);
  const tempPath = `${activePath}.demo-reset-${Date.now()}-${crypto.randomUUID()}.tmp`;
  try {
    closeDatabase();
  } catch (error) {
    throw new Error(`Failed to close current database before demo reset: ${error instanceof Error ? error.message : String(error)}`);
  }
  let resetError = undefined;
  try {
    Deno.statSync(demoPath);
    ensureDir(simpleDirname(activePath));
    Deno.copyFileSync(demoPath, tempPath);
    try {
      Deno.renameSync(tempPath, activePath);
    } catch  {
      try {
        Deno.removeSync(activePath);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        }
      }
      Deno.renameSync(tempPath, activePath);
    }
    console.log("  Demo database reset from DEMO_DB_PATH.");
  } catch (e) {
    resetError = e;
  } finally{
    try {
      Deno.removeSync(tempPath);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        console.warn("Could not remove temporary demo reset file:", error);
      }
    }
    await initDatabase();
  }
  if (resetError) {
    throw new Error(`Failed to reset demo database: ${resetError instanceof Error ? resetError.message : String(resetError)}`);
  }
}
export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
export function closeDatabase() {
  if (!db) return;
  db.close();
  db = undefined;
}
//
//  Invoice numbering
//
function cryptoRandom(len) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b)=>alphabet[b % alphabet.length]).join("");
}
export function generateDraftInvoiceNumber() {
  return `DRAFT-${cryptoRandom(6)}`;
}
/** Read invoice-numbering settings from the database. */ function getNumberingSettings() {
  const cfg = {
    prefix: "INV",
    includeYear: true,
    pad: 3,
    pattern: undefined,
    enabled: true
  };
  try {
    const rows = getDatabase().query("SELECT key, value FROM settings WHERE key IN ('invoicePrefix','invoiceIncludeYear','invoiceNumberPadding','invoiceNumberPattern')");
    const m = new Map();
    for (const r of rows){
      const [k, v] = r;
      m.set(k, v);
    }
    cfg.prefix = (m.get("invoicePrefix") || cfg.prefix).trim() || cfg.prefix;
    cfg.includeYear = (m.get("invoiceIncludeYear") || "true").toLowerCase() !== "false";
    const p = parseInt(m.get("invoiceNumberPadding") || String(cfg.pad), 10);
    if (!Number.isNaN(p) && p >= 2 && p <= 8) cfg.pad = p;
    cfg.pattern = (m.get("invoiceNumberPattern") || "").trim() || undefined;
    try {
      const raw = getDatabase().query("SELECT value FROM settings WHERE key = 'invoiceNumberingEnabled' LIMIT 1");
      if (raw.length > 0) {
        cfg.enabled = String(raw[0][0]).toLowerCase() !== "false";
      }
    } catch  {
    /* ignore */ }
  } catch  {
  /* use defaults */ }
  return cfg;
}
/** Find the highest existing sequential suffix matching `likePrefix%`, optionally scoped to a single customer. */ function findMaxSequence(likePrefix, customerId) {
  const rows = customerId ? getDatabase().query("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? AND customer_id = ?", [
    likePrefix + "%",
    customerId
  ]) : getDatabase().query("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ?", [
    likePrefix + "%"
  ]);
  const escaped = likePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}(\\d+).*?$`);
  let max = 0;
  for (const row of rows){
    const m = String(row[0] ?? "").match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return max;
}
/** Look up a customer's permanent sequential customer_number, if any. */ function getCustomerNumber(customerId) {
  if (!customerId) return null;
  try {
    const rows = getDatabase().query("SELECT customer_number FROM customers WHERE id = ?", [
      customerId
    ]);
    if (rows.length === 0) return null;
    const v = rows[0][0];
    return v == null ? null : Number(v);
  } catch  {
    return null;
  }
}
/** Expand date/random tokens in an invoice-number pattern. */ function expandPatternTokens(pattern) {
  const now = new Date();
  const YYYY = String(now.getFullYear());
  const YY = YYYY.slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  return pattern.replace(/\{YYYY\}/g, YYYY).replace(/\{YY\}/g, YY).replace(/\{MM\}/g, MM).replace(/\{DD\}/g, DD).replace(/\{DATE\}/g, `${YYYY}${MM}${DD}`).replace(/\{RAND4\}/g, ()=>cryptoRandom(4));
}
export function getNextInvoiceNumber(customerId) {
  const cfg = getNumberingSettings();
  // Advanced pattern mode (when enabled and configured)
  if (cfg.pattern && cfg.enabled) {
    const expanded = expandPatternTokens(cfg.pattern);
    const hasSeq = /\{SEQ\}/.test(cfg.pattern);
    const hasClientSeq = /\{CSEQ\}/.test(cfg.pattern);
    const hasCustomerNum = /\{CNUM\}/.test(cfg.pattern);
    if (!hasSeq && !hasClientSeq && !hasCustomerNum) return expanded;
    let result = expanded;
    // {CNUM} must resolve first: {SEQ}/{CSEQ} scan existing invoice_number
    // values using everything before them as a LIKE prefix, so that prefix
    // has to be fully literal (no leftover {CNUM} placeholder) or it will
    // never match a real stored invoice number and the counter always
    // reads as empty (stuck at 1).
    if (hasCustomerNum) {
      // {CNUM}: the customer's own permanent sequential number
      const custNum = getCustomerNumber(customerId);
      result = result.replace(/\{CNUM\}/g, custNum != null ? String(custNum).padStart(3, "0") : "");
    }
    if (hasSeq) {
      // {SEQ}: global counter, shared across all customers
      const prefix = result.split("{SEQ}")[0];
      const next = findMaxSequence(prefix) + 1;
      result = result.replace(/\{SEQ\}/g, String(next).padStart(3, "0"));
    }
    if (hasClientSeq) {
      // {CSEQ}: counter scoped to this customer's own invoices
      const prefix = result.split("{CSEQ}")[0];
      const next = findMaxSequence(prefix, customerId) + 1;
      result = result.replace(/\{CSEQ\}/g, String(next).padStart(3, "0"));
    }
    return result;
  }
  // Legacy mode: PREFIX-YYYY-NNN (global, no per-client variant)
  const base = cfg.includeYear ? `${cfg.prefix}-${new Date().getFullYear()}-` : `${cfg.prefix}-`;
  const next = findMaxSequence(base) + 1;
  return `${base}${String(next).padStart(cfg.pad, "0")}`;
}
const r2 = (n)=>Math.round(n * 100) / 100;
export function calculateInvoiceTotals(items, discountPercentage = 0, discountAmount = 0, taxRate = 0, pricesIncludeTax = false, roundingMode = "line") {
  const rate = Math.max(0, Number(taxRate) || 0) / 100;
  const lineGrosses = items.map((it)=>(Number(it.quantity) || 0) * (Number(it.unitPrice) || 0));
  const subtotal = lineGrosses.reduce((a, b)=>a + b, 0);
  let finalDiscount = Number(discountAmount) || 0;
  if (discountPercentage > 0) {
    finalDiscount = subtotal * (discountPercentage / 100);
  }
  finalDiscount = Math.min(Math.max(finalDiscount, 0), subtotal);
  let taxAmount = 0;
  let total = 0;
  if (roundingMode === "line" && subtotal > 0) {
    // Proportional per-line discount, rounded per line
    let distributed = 0;
    const lineDiscounts = lineGrosses.map((g, idx)=>{
      if (idx === lineGrosses.length - 1) {
        return r2(finalDiscount - distributed);
      }
      const d = r2(finalDiscount * (g / subtotal));
      distributed += d;
      return d;
    });
    let sumTax = 0, sumTotal = 0;
    for(let i = 0; i < lineGrosses.length; i++){
      const afterDiscount = Math.max(0, lineGrosses[i] - (lineDiscounts[i] || 0));
      if (pricesIncludeTax) {
        const net = rate > 0 ? afterDiscount / (1 + rate) : afterDiscount;
        sumTax += r2(afterDiscount - net);
        sumTotal += r2(afterDiscount);
      } else {
        const tax = r2(afterDiscount * rate);
        sumTax += tax;
        sumTotal += r2(afterDiscount + tax);
      }
    }
    taxAmount = r2(sumTax);
    total = r2(sumTotal);
  } else {
    // Total rounding mode
    const afterDiscount = subtotal - finalDiscount;
    if (pricesIncludeTax) {
      const net = rate > 0 ? afterDiscount / (1 + rate) : afterDiscount;
      taxAmount = r2(afterDiscount - net);
      total = r2(afterDiscount);
    } else {
      taxAmount = r2(afterDiscount * rate);
      total = r2(afterDiscount + taxAmount);
    }
  }
  return {
    subtotal: r2(subtotal),
    discountAmount: r2(finalDiscount),
    taxAmount,
    total
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL2RhdGFiYXNlL2luaXQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgREIgfSBmcm9tIFwic3FsaXRlXCI7XG5pbXBvcnQgeyBnZXRBZG1pbkNyZWRlbnRpYWxzLCBnZXRFbnYsIGlzRGVtb01vZGUgfSBmcm9tIFwiLi4vdXRpbHMvZW52LnRzXCI7XG5pbXBvcnQgeyBoYXNoUGFzc3dvcmQgfSBmcm9tIFwiLi4vdXRpbHMvcGFzc3dvcmQudHNcIjtcbmltcG9ydCB7IGdlbmVyYXRlVVVJRCB9IGZyb20gXCIuLi91dGlscy91dWlkLnRzXCI7XG5pbXBvcnQgeyBSRVNPVVJDRV9BQ1RJT05TIH0gZnJvbSBcIi4uL3R5cGVzL2luZGV4LnRzXCI7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbiwgUmVzb3VyY2UgfSBmcm9tIFwiLi4vdHlwZXMvaW5kZXgudHNcIjtcblxubGV0IGRiOiBEQiB8IHVuZGVmaW5lZDtcblxuLy9cbi8vICBQYXRoIGhlbHBlcnNcbi8vXG5cbmZ1bmN0aW9uIHJlc29sdmVQYXRoKHA6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwLnN0YXJ0c1dpdGgoXCIvXCIpID8gcCA6IHA7XG59XG5cbmZ1bmN0aW9uIHNpbXBsZURpcm5hbWUocDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgaSA9IHAubGFzdEluZGV4T2YoXCIvXCIpO1xuICByZXR1cm4gaSA8PSAwID8gXCIvXCIgOiBwLnNsaWNlKDAsIGkpO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVEaXIoZGlyOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKGRpciAmJiBkaXIgIT09IFwiLlwiICYmIGRpciAhPT0gXCIvXCIpIHtcbiAgICB0cnkge1xuICAgICAgRGVuby5ta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIG9rICovXG4gICAgfVxuICB9XG59XG5cbi8vXG4vLyAgVmVyc2lvbiAmIGJhY2t1cCBoZWxwZXJzXG4vL1xuXG5mdW5jdGlvbiByZWFkQXBwVmVyc2lvbigpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIHJldHVybiBEZW5vLnJlYWRUZXh0RmlsZVN5bmMoXCIuL1ZFUlNJT05cIikudHJpbSgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gXCJ1bmtub3duXCI7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U3RvcmVkU2NoZW1hVmVyc2lvbihkYXRhYmFzZTogREIpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByb3dzID0gZGF0YWJhc2UucXVlcnkoXG4gICAgICBcIlNFTEVDVCB2YWx1ZSBGUk9NIHNldHRpbmdzIFdIRVJFIGtleSA9ICdfc2NoZW1hX3ZlcnNpb24nIExJTUlUIDFcIixcbiAgICApO1xuICAgIHJldHVybiByb3dzLmxlbmd0aCA+IDAgPyBTdHJpbmcoKHJvd3NbMF0gYXMgdW5rbm93bltdKVswXSkgOiBudWxsO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDsgLy8gc2V0dGluZ3MgdGFibGUgZG9lc24ndCBleGlzdCB5ZXRcbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9yZVNjaGVtYVZlcnNpb24oZGF0YWJhc2U6IERCKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgZGF0YWJhc2UucXVlcnkoXG4gICAgICBcIklOU0VSVCBPUiBSRVBMQUNFIElOVE8gc2V0dGluZ3MgKGtleSwgdmFsdWUpIFZBTFVFUyAoJ19zY2hlbWFfdmVyc2lvbicsID8pXCIsXG4gICAgICBbcmVhZEFwcFZlcnNpb24oKV0sXG4gICAgKTtcbiAgfSBjYXRjaCB7XG4gICAgLyogaWdub3JlICovXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlRGF0YWJhc2VCYWNrdXAoXG4gIGRiUGF0aDogc3RyaW5nLFxuICBmcm9tVmVyc2lvbj86IHN0cmluZyB8IG51bGwsXG4pOiB2b2lkIHtcbiAgY29uc3QgdHMgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkucmVwbGFjZSgvWzouXS9nLCBcIi1cIikuc2xpY2UoMCwgMTkpO1xuICBjb25zdCBzdWZmaXggPSBmcm9tVmVyc2lvbiA/IGBfdiR7ZnJvbVZlcnNpb259YCA6IFwiXCI7XG4gIGNvbnN0IGJhY2t1cFBhdGggPSBkYlBhdGgucmVwbGFjZSgvXFwuZGIkLywgXCJcIikgKyBgX2JhY2t1cCR7c3VmZml4fV8ke3RzfS5kYmA7XG4gIHRyeSB7XG4gICAgRGVuby5jb3B5RmlsZVN5bmMoZGJQYXRoLCBiYWNrdXBQYXRoKTtcbiAgICBjb25zb2xlLmxvZyhgIERhdGFiYXNlIGJhY2t1cCBjcmVhdGVkOiAke2JhY2t1cFBhdGh9YCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gY3JlYXRlIGRhdGFiYXNlIGJhY2t1cDpcIiwgZSk7XG4gIH1cbn1cblxuLyoqIEJhY2sgdXAgdGhlIGRhdGFiYXNlIGlmIHRoZSBzdG9yZWQgc2NoZW1hIHZlcnNpb24gZGlmZmVycyBmcm9tIHRoZSBhcHAgdmVyc2lvbi4gKi9cbmZ1bmN0aW9uIGJhY2t1cElmVmVyc2lvbkNoYW5nZWQoZGF0YWJhc2U6IERCLCBkYlBhdGg6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIGNvbnN0IHN0b3JlZCA9IGdldFN0b3JlZFNjaGVtYVZlcnNpb24oZGF0YWJhc2UpO1xuICAgIGlmIChzdG9yZWQgIT09IHJlYWRBcHBWZXJzaW9uKCkpIHtcbiAgICAgIGNyZWF0ZURhdGFiYXNlQmFja3VwKGRiUGF0aCwgc3RvcmVkKTtcbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIHRyeSB7XG4gICAgICBjcmVhdGVEYXRhYmFzZUJhY2t1cChkYlBhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICB9XG59XG5cbi8vXG4vLyAgTWlncmF0aW9uIGhlbHBlcnNcbi8vXG5cbi8qKiBQYXJzZSBhIC5zcWwgZmlsZSBpbnRvIGV4ZWN1dGFibGUgc3RhdGVtZW50cyAoc3RyaXAgY29tbWVudHMsIHNwbGl0IG9uIGA7YCkuICovXG5mdW5jdGlvbiBwYXJzZVNxbFN0YXRlbWVudHMoc3FsOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHJldHVybiBzcWxcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAubWFwKChsaW5lKSA9PiB7XG4gICAgICBpZiAobGluZS50cmltU3RhcnQoKS5zdGFydHNXaXRoKFwiLS1cIikpIHJldHVybiBcIlwiO1xuICAgICAgY29uc3QgaWR4ID0gbGluZS5pbmRleE9mKFwiLS1cIik7XG4gICAgICByZXR1cm4gaWR4ID49IDAgPyBsaW5lLnNsaWNlKDAsIGlkeCkgOiBsaW5lO1xuICAgIH0pXG4gICAgLmpvaW4oXCJcXG5cIilcbiAgICAuc3BsaXQoXCI7XCIpXG4gICAgLm1hcCgocykgPT4gcy50cmltKCkpXG4gICAgLmZpbHRlcigocykgPT4gcy5sZW5ndGggPiAwKTtcbn1cblxuLyoqIFJ1biBlYWNoIHN0YXRlbWVudCwgc2lsZW50bHkgaWdub3JpbmcgXCJhbHJlYWR5IGV4aXN0c1wiIC8gXCJkdXBsaWNhdGUgY29sdW1uXCIgZXJyb3JzLiAqL1xuZnVuY3Rpb24gZXhlY3V0ZU1pZ3JhdGlvbnMoZGF0YWJhc2U6IERCLCBzdGF0ZW1lbnRzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHN0bXQgb2Ygc3RhdGVtZW50cykge1xuICAgIHRyeSB7XG4gICAgICBkYXRhYmFzZS5leGVjdXRlKHN0bXQpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBpZiAoIS9hbHJlYWR5IGV4aXN0c3xkdXBsaWNhdGUgY29sdW1uIG5hbWUvaS50ZXN0KG1zZykpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIk1pZ3JhdGlvbiBlcnJvcjpcIiwgbXNnKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlN0YXRlbWVudDpcIiwgc3RtdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKiBTYWZlbHkgYWRkIGEgY29sdW1uIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdC4gKi9cbmZ1bmN0aW9uIGFkZENvbHVtbklmTWlzc2luZyhcbiAgZGF0YWJhc2U6IERCLFxuICB0YWJsZTogc3RyaW5nLFxuICBjb2x1bW46IHN0cmluZyxcbiAgZGVmaW5pdGlvbjogc3RyaW5nLFxuKTogdm9pZCB7XG4gIGNvbnN0IGNvbHMgPSAoXG4gICAgZGF0YWJhc2UucXVlcnkoYFBSQUdNQSB0YWJsZV9pbmZvKCR7dGFibGV9KWApIGFzIHVua25vd25bXVtdXG4gICkubWFwKChyKSA9PiBTdHJpbmcoclsxXSkpO1xuICBpZiAoY29scy5pbmNsdWRlcyhjb2x1bW4pKSByZXR1cm47XG4gIHRyeSB7XG4gICAgZGF0YWJhc2UuZXhlY3V0ZShgQUxURVIgVEFCTEUgJHt0YWJsZX0gQUREIENPTFVNTiAke2NvbHVtbn0gJHtkZWZpbml0aW9ufWApO1xuICAgIGNvbnNvbGUubG9nKGAgQWRkZWQgJHt0YWJsZX0uJHtjb2x1bW59IGNvbHVtbmApO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc3QgbXNnID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpO1xuICAgIGlmICghL2R1cGxpY2F0ZSBjb2x1bW58YWxyZWFkeSBleGlzdHMvaS50ZXN0KG1zZykpIHtcbiAgICAgIGNvbnNvbGUud2FybihgQ291bGQgbm90IGFkZCAke3RhYmxlfS4ke2NvbHVtbn06YCwgbXNnKTtcbiAgICB9XG4gIH1cbn1cblxuLy9cbi8vICBTY2hlbWEgdXBncmFkZXNcbi8vXG5cbmZ1bmN0aW9uIGVuc3VyZUN1c3RvbWVyQ29sdW1ucyhkYXRhYmFzZTogREIpOiB2b2lkIHtcbiAgYWRkQ29sdW1uSWZNaXNzaW5nKGRhdGFiYXNlLCBcImN1c3RvbWVyc1wiLCBcImNvbnRhY3RfbmFtZVwiLCBcIlRFWFRcIik7XG4gIGFkZENvbHVtbklmTWlzc2luZyhkYXRhYmFzZSwgXCJjdXN0b21lcnNcIiwgXCJjb3VudHJ5X2NvZGVcIiwgXCJURVhUXCIpO1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoZGF0YWJhc2UsIFwiY3VzdG9tZXJzXCIsIFwiY2l0eVwiLCBcIlRFWFRcIik7XG4gIGFkZENvbHVtbklmTWlzc2luZyhkYXRhYmFzZSwgXCJjdXN0b21lcnNcIiwgXCJwb3N0YWxfY29kZVwiLCBcIlRFWFRcIik7XG4gIGFkZENvbHVtbklmTWlzc2luZyhkYXRhYmFzZSwgXCJjdXN0b21lcnNcIiwgXCJjdXN0b21lcl9udW1iZXJcIiwgXCJJTlRFR0VSXCIpO1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoZGF0YWJhc2UsIFwiY3VzdG9tZXJzXCIsIFwicmVnaW9uXCIsIFwiVEVYVFwiKTtcbn1cblxuLyoqIEFzc2lnbiBhIHBlcm1hbmVudCBzZXF1ZW50aWFsIGN1c3RvbWVyX251bWJlciAoYnkgY3JlYXRpb24gb3JkZXIpIHRvIGFueSBjdXN0b21lciBtaXNzaW5nIG9uZS4gKi9cbmZ1bmN0aW9uIGJhY2tmaWxsQ3VzdG9tZXJOdW1iZXJzKGRhdGFiYXNlOiBEQik6IHZvaWQge1xuICBjb25zdCByb3dzID0gZGF0YWJhc2UucXVlcnkoXG4gICAgXCJTRUxFQ1QgaWQgRlJPTSBjdXN0b21lcnMgV0hFUkUgY3VzdG9tZXJfbnVtYmVyIElTIE5VTEwgT1JERVIgQlkgY3JlYXRlZF9hdCBBU0MsIGlkIEFTQ1wiLFxuICApIGFzIHVua25vd25bXVtdO1xuICBpZiAocm93cy5sZW5ndGggPT09IDApIHJldHVybjtcblxuICBjb25zdCBtYXhSb3cgPSBkYXRhYmFzZS5xdWVyeShcbiAgICBcIlNFTEVDVCBDT0FMRVNDRShNQVgoY3VzdG9tZXJfbnVtYmVyKSwgMCkgRlJPTSBjdXN0b21lcnNcIixcbiAgKSBhcyB1bmtub3duW11bXTtcbiAgbGV0IG5leHQgPSBOdW1iZXIoKG1heFJvd1swXSBhcyB1bmtub3duW10pWzBdKSArIDE7XG5cbiAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xuICAgIGRhdGFiYXNlLnF1ZXJ5KFwiVVBEQVRFIGN1c3RvbWVycyBTRVQgY3VzdG9tZXJfbnVtYmVyID0gPyBXSEVSRSBpZCA9ID9cIiwgW1xuICAgICAgbmV4dCxcbiAgICAgIFN0cmluZyhyb3dbMF0pLFxuICAgIF0pO1xuICAgIG5leHQrKztcbiAgfVxuXG4gIGNvbnNvbGUubG9nKFxuICAgIGAgIEJhY2tmaWxsZWQgY3VzdG9tZXJfbnVtYmVyIGZvciAke3Jvd3MubGVuZ3RofSBleGlzdGluZyBjdXN0b21lcihzKS5gLFxuICApO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVJbnZvaWNlQ29sdW1ucyhkYXRhYmFzZTogREIpOiB2b2lkIHtcbiAgYWRkQ29sdW1uSWZNaXNzaW5nKFxuICAgIGRhdGFiYXNlLFxuICAgIFwiaW52b2ljZXNcIixcbiAgICBcInByaWNlc19pbmNsdWRlX3RheFwiLFxuICAgIFwiQk9PTEVBTiBERUZBVUxUIDBcIixcbiAgKTtcbiAgYWRkQ29sdW1uSWZNaXNzaW5nKFxuICAgIGRhdGFiYXNlLFxuICAgIFwiaW52b2ljZXNcIixcbiAgICBcInJvdW5kaW5nX21vZGVcIixcbiAgICBcIlRFWFQgREVGQVVMVCAnbGluZSdcIixcbiAgKTtcbiAgYWRkQ29sdW1uSWZNaXNzaW5nKGRhdGFiYXNlLCBcImludm9pY2VzXCIsIFwibG9jYWxlXCIsIFwiVEVYVFwiKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlSW52b2ljZUl0ZW1Db2x1bW5zKGRhdGFiYXNlOiBEQik6IHZvaWQge1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoZGF0YWJhc2UsIFwiaW52b2ljZV9pdGVtc1wiLCBcInVuaXRcIiwgXCJURVhUXCIpO1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoXG4gICAgZGF0YWJhc2UsXG4gICAgXCJpbnZvaWNlX2l0ZW1zXCIsXG4gICAgXCJwcm9kdWN0X2lkXCIsXG4gICAgXCJURVhUIFJFRkVSRU5DRVMgcHJvZHVjdHMoaWQpXCIsXG4gICk7XG4gIC8vIFNuYXBzaG90IG9mIHRoZSBwcm9kdWN0J3Mgc2hpcHBpbmcvY3VzdG9tcyBmaWVsZHMgYXQgdGhlIHRpbWUgdGhlIGl0ZW0gd2FzIHNhdmVkXG4gIGFkZENvbHVtbklmTWlzc2luZyhkYXRhYmFzZSwgXCJpbnZvaWNlX2l0ZW1zXCIsIFwiaHNfY29kZVwiLCBcIlRFWFRcIik7XG4gIGFkZENvbHVtbklmTWlzc2luZyhkYXRhYmFzZSwgXCJpbnZvaWNlX2l0ZW1zXCIsIFwiY291bnRyeV9vZl9vcmlnaW5cIiwgXCJURVhUXCIpO1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoZGF0YWJhc2UsIFwiaW52b2ljZV9pdGVtc1wiLCBcImxlbmd0aF9tbVwiLCBcIk5VTUVSSUNcIik7XG4gIGFkZENvbHVtbklmTWlzc2luZyhkYXRhYmFzZSwgXCJpbnZvaWNlX2l0ZW1zXCIsIFwid2lkdGhfbW1cIiwgXCJOVU1FUklDXCIpO1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoZGF0YWJhc2UsIFwiaW52b2ljZV9pdGVtc1wiLCBcImhlaWdodF9tbVwiLCBcIk5VTUVSSUNcIik7XG4gIGFkZENvbHVtbklmTWlzc2luZyhkYXRhYmFzZSwgXCJpbnZvaWNlX2l0ZW1zXCIsIFwid2VpZ2h0X2dcIiwgXCJOVU1FUklDXCIpO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVVc2VyQ29sdW1ucyhkYXRhYmFzZTogREIpOiB2b2lkIHtcbiAgYWRkQ29sdW1uSWZNaXNzaW5nKGRhdGFiYXNlLCBcInVzZXJzXCIsIFwidHdvX2ZhY3Rvcl9zZWNyZXRcIiwgXCJURVhUXCIpO1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoXG4gICAgZGF0YWJhc2UsXG4gICAgXCJ1c2Vyc1wiLFxuICAgIFwidHdvX2ZhY3Rvcl9lbmFibGVkXCIsXG4gICAgXCJJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMFwiLFxuICApO1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoZGF0YWJhc2UsIFwidXNlcnNcIiwgXCJ0d29fZmFjdG9yX3JlY292ZXJ5X2NvZGVzXCIsIFwiVEVYVFwiKTtcbiAgYWRkQ29sdW1uSWZNaXNzaW5nKGRhdGFiYXNlLCBcInVzZXJzXCIsIFwib2lkY19zdWJqZWN0XCIsIFwiVEVYVFwiKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlU3RhdHVzSGlzdG9yeVRhYmxlKGRhdGFiYXNlOiBEQik6IHZvaWQge1xuICBkYXRhYmFzZS5leGVjdXRlKGBcbiAgICBDUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBpbnZvaWNlX3N0YXR1c19oaXN0b3J5IChcbiAgICAgIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gICAgICBpbnZvaWNlX2lkIFRFWFQgTk9UIE5VTEwgUkVGRVJFTkNFUyBpbnZvaWNlcyhpZCkgT04gREVMRVRFIENBU0NBREUsXG4gICAgICBzdGF0dXMgVEVYVCBOT1QgTlVMTCxcbiAgICAgIGNoYW5nZWRfYXQgVEVYVCBOT1QgTlVMTCxcbiAgICAgIHBheW1lbnRfbWV0aG9kIFRFWFQsXG4gICAgICBub3RlIFRFWFRcbiAgICApXG4gIGApO1xuICBkYXRhYmFzZS5leGVjdXRlKFxuICAgIGBDUkVBVEUgSU5ERVggSUYgTk9UIEVYSVNUUyBpZHhfaW52b2ljZV9zdGF0dXNfaGlzdG9yeV9pbnZvaWNlX2lkXG4gICAgIE9OIGludm9pY2Vfc3RhdHVzX2hpc3RvcnkoaW52b2ljZV9pZCwgY2hhbmdlZF9hdClgLFxuICApO1xuICBiYWNrZmlsbFN0YXR1c0hpc3RvcnkoZGF0YWJhc2UpO1xufVxuXG5mdW5jdGlvbiBiYWNrZmlsbFN0YXR1c0hpc3RvcnkoZGF0YWJhc2U6IERCKTogdm9pZCB7XG4gIC8vIEluc2VydCBvbmUgaGlzdG9yeSBlbnRyeSBwZXIgaW52b2ljZSB0aGF0IGhhcyBubyBoaXN0b3J5IHlldC5cbiAgLy8gVXNlcyB0aGUgaW52b2ljZSdzIGN1cnJlbnQgc3RhdHVzIGFuZCB1cGRhdGVkX2F0IGFzIHRoZSBiZXN0IGF2YWlsYWJsZSB0aW1lc3RhbXAuXG4gIGNvbnN0IHJvd3MgPSBkYXRhYmFzZS5xdWVyeShcbiAgICBgU0VMRUNUIGlkLCBzdGF0dXMsIHVwZGF0ZWRfYXQgRlJPTSBpbnZvaWNlc1xuICAgICBXSEVSRSBpZCBOT1QgSU4gKFNFTEVDVCBESVNUSU5DVCBpbnZvaWNlX2lkIEZST00gaW52b2ljZV9zdGF0dXNfaGlzdG9yeSlgLFxuICApIGFzIHVua25vd25bXVtdO1xuXG4gIGlmIChyb3dzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICBjb25zdCBpbnZvaWNlSWQgPSBTdHJpbmcocm93WzBdKTtcbiAgICBjb25zdCBzdGF0dXMgPSBTdHJpbmcocm93WzFdKTtcbiAgICBjb25zdCBjaGFuZ2VkQXQgPSByb3dbMl0gPyBTdHJpbmcocm93WzJdKSA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBkYXRhYmFzZS5xdWVyeShcbiAgICAgIGBJTlNFUlQgSU5UTyBpbnZvaWNlX3N0YXR1c19oaXN0b3J5IChpZCwgaW52b2ljZV9pZCwgc3RhdHVzLCBjaGFuZ2VkX2F0LCBwYXltZW50X21ldGhvZCwgbm90ZSlcbiAgICAgICBWQUxVRVMgKD8sID8sID8sID8sIE5VTEwsIE5VTEwpYCxcbiAgICAgIFtjcnlwdG8ucmFuZG9tVVVJRCgpLCBpbnZvaWNlSWQsIHN0YXR1cywgY2hhbmdlZEF0XSxcbiAgICApO1xuICB9XG5cbiAgY29uc29sZS5sb2coXG4gICAgYCAgQmFja2ZpbGxlZCBzdGF0dXMgaGlzdG9yeSBmb3IgJHtyb3dzLmxlbmd0aH0gZXhpc3RpbmcgaW52b2ljZShzKS5gLFxuICApO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVUYXhUYWJsZXMoZGF0YWJhc2U6IERCKTogdm9pZCB7XG4gIGRhdGFiYXNlLmV4ZWN1dGUoYFxuICAgIENSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIHRheF9kZWZpbml0aW9ucyAoXG4gICAgICBpZCBURVhUIFBSSU1BUlkgS0VZLCBjb2RlIFRFWFQgVU5JUVVFLCBuYW1lIFRFWFQsXG4gICAgICBwZXJjZW50IE5VTUVSSUMgTk9UIE5VTEwsIGNhdGVnb3J5X2NvZGUgVEVYVCwgY291bnRyeV9jb2RlIFRFWFQsXG4gICAgICB2ZW5kb3Jfc3BlY2lmaWNfaWQgVEVYVCwgZGVmYXVsdF9pbmNsdWRlZCBCT09MRUFOIERFRkFVTFQgMCwgbWV0YWRhdGEgVEVYVCxcbiAgICAgIGNyZWF0ZWRfYXQgVElNRVNUQU1QIERFRkFVTFQgQ1VSUkVOVF9USU1FU1RBTVAsXG4gICAgICB1cGRhdGVkX2F0IFRJTUVTVEFNUCBERUZBVUxUIENVUlJFTlRfVElNRVNUQU1QXG4gICAgKVxuICBgKTtcbiAgZGF0YWJhc2UuZXhlY3V0ZShgXG4gICAgQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgaW52b2ljZV9pdGVtX3RheGVzIChcbiAgICAgIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gICAgICBpbnZvaWNlX2l0ZW1faWQgVEVYVCBOT1QgTlVMTCBSRUZFUkVOQ0VTIGludm9pY2VfaXRlbXMoaWQpIE9OIERFTEVURSBDQVNDQURFLFxuICAgICAgdGF4X2RlZmluaXRpb25faWQgVEVYVCBSRUZFUkVOQ0VTIHRheF9kZWZpbml0aW9ucyhpZCksXG4gICAgICBwZXJjZW50IE5VTUVSSUMgTk9UIE5VTEwsIHRheGFibGVfYW1vdW50IE5VTUVSSUMgTk9UIE5VTEwsXG4gICAgICBhbW91bnQgTlVNRVJJQyBOT1QgTlVMTCwgaW5jbHVkZWQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIDAsXG4gICAgICBzZXF1ZW5jZSBJTlRFR0VSIERFRkFVTFQgMCwgbm90ZSBURVhULFxuICAgICAgY3JlYXRlZF9hdCBUSU1FU1RBTVAgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUFxuICAgIClcbiAgYCk7XG4gIGRhdGFiYXNlLmV4ZWN1dGUoYFxuICAgIENSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGludm9pY2VfdGF4ZXMgKFxuICAgICAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgICAgIGludm9pY2VfaWQgVEVYVCBOT1QgTlVMTCBSRUZFUkVOQ0VTIGludm9pY2VzKGlkKSBPTiBERUxFVEUgQ0FTQ0FERSxcbiAgICAgIHRheF9kZWZpbml0aW9uX2lkIFRFWFQgUkVGRVJFTkNFUyB0YXhfZGVmaW5pdGlvbnMoaWQpLFxuICAgICAgcGVyY2VudCBOVU1FUklDIE5PVCBOVUxMLCB0YXhhYmxlX2Ftb3VudCBOVU1FUklDIE5PVCBOVUxMLFxuICAgICAgdGF4X2Ftb3VudCBOVU1FUklDIE5PVCBOVUxMLFxuICAgICAgY3JlYXRlZF9hdCBUSU1FU1RBTVAgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUFxuICAgIClcbiAgYCk7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZVByb2R1Y3RUYWJsZXMoZGF0YWJhc2U6IERCKTogdm9pZCB7XG4gIGRhdGFiYXNlLmV4ZWN1dGUoYFxuICAgIENSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIHByb2R1Y3RzIChcbiAgICAgIGlkIFRFWFQgUFJJTUFSWSBLRVksIG5hbWUgVEVYVCBOT1QgTlVMTCwgZGVzY3JpcHRpb24gVEVYVCxcbiAgICAgIHVuaXRfcHJpY2UgTlVNRVJJQyBOT1QgTlVMTCBERUZBVUxUIDAsIHNrdSBURVhULFxuICAgICAgdW5pdCBURVhUIERFRkFVTFQgJ3BpZWNlJywgY2F0ZWdvcnkgVEVYVCxcbiAgICAgIHRheF9kZWZpbml0aW9uX2lkIFRFWFQgUkVGRVJFTkNFUyB0YXhfZGVmaW5pdGlvbnMoaWQpLFxuICAgICAgaXNfYWN0aXZlIEJPT0xFQU4gREVGQVVMVCAxLFxuICAgICAgY3JlYXRlZF9hdCBUSU1FU1RBTVAgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUCxcbiAgICAgIHVwZGF0ZWRfYXQgVElNRVNUQU1QIERFRkFVTFQgQ1VSUkVOVF9USU1FU1RBTVAsXG4gICAgICBoc19jb2RlIFRFWFQsIGNvdW50cnlfb2Zfb3JpZ2luIFRFWFQsXG4gICAgICBsZW5ndGhfbW0gTlVNRVJJQywgd2lkdGhfbW0gTlVNRVJJQywgaGVpZ2h0X21tIE5VTUVSSUMsIHdlaWdodF9nIE5VTUVSSUNcbiAgICApXG4gIGApO1xuICBkYXRhYmFzZS5leGVjdXRlKGBcbiAgICBDUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBwcm9kdWN0X2NhdGVnb3JpZXMgKFxuICAgICAgaWQgVEVYVCBQUklNQVJZIEtFWSwgY29kZSBURVhUIFVOSVFVRSBOT1QgTlVMTCwgbmFtZSBURVhUIE5PVCBOVUxMLFxuICAgICAgc29ydF9vcmRlciBJTlRFR0VSIERFRkFVTFQgMCwgaXNfYnVpbHRpbiBCT09MRUFOIERFRkFVTFQgMCxcbiAgICAgIGNyZWF0ZWRfYXQgVElNRVNUQU1QIERFRkFVTFQgQ1VSUkVOVF9USU1FU1RBTVBcbiAgICApXG4gIGApO1xuICBkYXRhYmFzZS5leGVjdXRlKGBcbiAgICBDUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBwcm9kdWN0X3VuaXRzIChcbiAgICAgIGlkIFRFWFQgUFJJTUFSWSBLRVksIGNvZGUgVEVYVCBVTklRVUUgTk9UIE5VTEwsIG5hbWUgVEVYVCBOT1QgTlVMTCxcbiAgICAgIHNvcnRfb3JkZXIgSU5URUdFUiBERUZBVUxUIDAsIGlzX2J1aWx0aW4gQk9PTEVBTiBERUZBVUxUIDAsXG4gICAgICBjcmVhdGVkX2F0IFRJTUVTVEFNUCBERUZBVUxUIENVUlJFTlRfVElNRVNUQU1QXG4gICAgKVxuICBgKTtcbn1cblxuLyoqIE9wdGlvbmFsIHNoaXBwaW5nL2N1c3RvbXMgY29sdW1uczsgbnVsbGFibGUgc28gZXhpc3RpbmcgcHJvZHVjdHMgYXJlIHVuYWZmZWN0ZWQuICovXG5mdW5jdGlvbiBlbnN1cmVQcm9kdWN0Q29sdW1ucyhkYXRhYmFzZTogREIpOiB2b2lkIHtcbiAgYWRkQ29sdW1uSWZNaXNzaW5nKGRhdGFiYXNlLCBcInByb2R1Y3RzXCIsIFwiaHNfY29kZVwiLCBcIlRFWFRcIik7XG4gIGFkZENvbHVtbklmTWlzc2luZyhkYXRhYmFzZSwgXCJwcm9kdWN0c1wiLCBcImNvdW50cnlfb2Zfb3JpZ2luXCIsIFwiVEVYVFwiKTtcbiAgYWRkQ29sdW1uSWZNaXNzaW5nKGRhdGFiYXNlLCBcInByb2R1Y3RzXCIsIFwibGVuZ3RoX21tXCIsIFwiTlVNRVJJQ1wiKTtcbiAgYWRkQ29sdW1uSWZNaXNzaW5nKGRhdGFiYXNlLCBcInByb2R1Y3RzXCIsIFwid2lkdGhfbW1cIiwgXCJOVU1FUklDXCIpO1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoZGF0YWJhc2UsIFwicHJvZHVjdHNcIiwgXCJoZWlnaHRfbW1cIiwgXCJOVU1FUklDXCIpO1xuICBhZGRDb2x1bW5JZk1pc3NpbmcoZGF0YWJhc2UsIFwicHJvZHVjdHNcIiwgXCJ3ZWlnaHRfZ1wiLCBcIk5VTUVSSUNcIik7XG59XG5cbmZ1bmN0aW9uIHNlZWRQcm9kdWN0RGVmYXVsdHMoZGF0YWJhc2U6IERCKTogdm9pZCB7XG4gIGNvbnN0IGNhdGVnb3JpZXMgPSBbXG4gICAgeyBjb2RlOiBcInNlcnZpY2VcIiwgbmFtZTogXCJTZXJ2aWNlXCIsIHNvcnQ6IDEgfSxcbiAgICB7IGNvZGU6IFwiZ29vZHNcIiwgbmFtZTogXCJHb29kc1wiLCBzb3J0OiAyIH0sXG4gICAgeyBjb2RlOiBcInN1YnNjcmlwdGlvblwiLCBuYW1lOiBcIlN1YnNjcmlwdGlvblwiLCBzb3J0OiAzIH0sXG4gICAgeyBjb2RlOiBcIm90aGVyXCIsIG5hbWU6IFwiT3RoZXJcIiwgc29ydDogNCB9LFxuICBdO1xuICBmb3IgKGNvbnN0IGMgb2YgY2F0ZWdvcmllcykge1xuICAgIHRyeSB7XG4gICAgICBkYXRhYmFzZS5xdWVyeShcbiAgICAgICAgXCJJTlNFUlQgT1IgSUdOT1JFIElOVE8gcHJvZHVjdF9jYXRlZ29yaWVzIChpZCwgY29kZSwgbmFtZSwgc29ydF9vcmRlciwgaXNfYnVpbHRpbikgVkFMVUVTICg/LCA/LCA/LCA/LCAxKVwiLFxuICAgICAgICBbYy5jb2RlLCBjLmNvZGUsIGMubmFtZSwgYy5zb3J0XSxcbiAgICAgICk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBpZ25vcmUgKi9cbiAgICB9XG4gIH1cblxuICBjb25zdCB1bml0cyA9IFtcbiAgICB7IGNvZGU6IFwicGllY2VcIiwgbmFtZTogXCJQaWVjZVwiLCBzb3J0OiAxIH0sXG4gICAgeyBjb2RlOiBcImhvdXJcIiwgbmFtZTogXCJIb3VyXCIsIHNvcnQ6IDIgfSxcbiAgICB7IGNvZGU6IFwiZGF5XCIsIG5hbWU6IFwiRGF5XCIsIHNvcnQ6IDMgfSxcbiAgICB7IGNvZGU6IFwia2dcIiwgbmFtZTogXCJLaWxvZ3JhbVwiLCBzb3J0OiA0IH0sXG4gICAgeyBjb2RlOiBcIm1cIiwgbmFtZTogXCJNZXRlclwiLCBzb3J0OiA1IH0sXG4gICAgeyBjb2RlOiBcImx1bXBfc3VtXCIsIG5hbWU6IFwiTHVtcCBTdW1cIiwgc29ydDogNiB9LFxuICBdO1xuICBmb3IgKGNvbnN0IHUgb2YgdW5pdHMpIHtcbiAgICB0cnkge1xuICAgICAgZGF0YWJhc2UucXVlcnkoXG4gICAgICAgIFwiSU5TRVJUIE9SIElHTk9SRSBJTlRPIHByb2R1Y3RfdW5pdHMgKGlkLCBjb2RlLCBuYW1lLCBzb3J0X29yZGVyLCBpc19idWlsdGluKSBWQUxVRVMgKD8sID8sID8sID8sIDEpXCIsXG4gICAgICAgIFt1LmNvZGUsIHUuY29kZSwgdS5uYW1lLCB1LnNvcnRdLFxuICAgICAgKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGlnbm9yZSAqL1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlY3JlYXRlIHRoZSBpbnZvaWNlcyB0YWJsZSB0byBhZGQgbWlzc2luZyBpbnZvaWNlIHN0YXR1c2VzIHRvIHRoZSBDSEVDSyBjb25zdHJhaW50LlxuICpcbiAqIElNUE9SVEFOVDogRm9yZWlnbiBrZXlzIG11c3QgYmUgT0ZGIGR1cmluZyBgRFJPUCBUQUJMRWAgIG90aGVyd2lzZSBTUUxpdGVcbiAqIHBlcmZvcm1zIGFuIGltcGxpY2l0IGBERUxFVEUgRlJPTSBpbnZvaWNlc2Agd2hpY2ggY2FzY2FkZXMgdG8gaW52b2ljZV9pdGVtcy5cbiAqIFNlZTogaHR0cHM6Ly93d3cuc3FsaXRlLm9yZy9sYW5nX2FsdGVydGFibGUuaHRtbCNtYWtpbmdfb3RoZXJfa2luZHNfb2ZfdGFibGVfc2NoZW1hX2NoYW5nZXNcbiAqL1xuZnVuY3Rpb24gbWlncmF0ZUludm9pY2VzRm9yVm9pZGVkKGRhdGFiYXNlOiBEQik6IHZvaWQge1xuICBjb25zdCBjaGVja1NxbCA9IGRhdGFiYXNlLnF1ZXJ5KFxuICAgIFwiU0VMRUNUIHNxbCBGUk9NIHNxbGl0ZV9tYXN0ZXIgV0hFUkUgdHlwZT0ndGFibGUnIEFORCBuYW1lPSdpbnZvaWNlcydcIixcbiAgKTtcbiAgY29uc3QgY3JlYXRlU3FsID0gY2hlY2tTcWwubGVuZ3RoID4gMCA/IFN0cmluZyhjaGVja1NxbFswXVswXSkgOiBcIlwiO1xuICBpZiAoXG4gICAgIWNyZWF0ZVNxbCB8fFxuICAgIChjcmVhdGVTcWwuaW5jbHVkZXMoXCJ2b2lkZWRcIikgJiYgY3JlYXRlU3FsLmluY2x1ZGVzKFwiY29tcGxldGVcIikpXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnNvbGUubG9nKFxuICAgIFwiTWlncmF0aW5nIGludm9pY2VzIHRhYmxlIHRvIHN1cHBvcnQgJ3ZvaWRlZCcgYW5kICdjb21wbGV0ZScgc3RhdHVzZXNcIixcbiAgKTtcblxuICBjb25zdCBpdGVtQ291bnRCZWZvcmUgPSBOdW1iZXIoXG4gICAgKGRhdGFiYXNlLnF1ZXJ5KFwiU0VMRUNUIENPVU5UKCopIEZST00gaW52b2ljZV9pdGVtc1wiKSBhcyB1bmtub3duW11bXSlbMF1bMF0sXG4gICk7XG5cbiAgLy8gRGlzYWJsZSBGSyBlbmZvcmNlbWVudCBzbyBEUk9QIFRBQkxFIGRvZXNuJ3QgY2FzY2FkZS1kZWxldGUgY2hpbGQgcm93c1xuICBkYXRhYmFzZS5leGVjdXRlKFwiUFJBR01BIGZvcmVpZ25fa2V5cyA9IE9GRlwiKTtcbiAgZGF0YWJhc2UuZXhlY3V0ZShcIkJFR0lOIFRSQU5TQUNUSU9OXCIpO1xuICB0cnkge1xuICAgIGRhdGFiYXNlLmV4ZWN1dGUoYFxuICAgICAgQ1JFQVRFIFRBQkxFIGludm9pY2VzX25ldyAoXG4gICAgICAgIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gICAgICAgIGludm9pY2VfbnVtYmVyIFRFWFQgVU5JUVVFIE5PVCBOVUxMLFxuICAgICAgICBjdXN0b21lcl9pZCBURVhUIFJFRkVSRU5DRVMgY3VzdG9tZXJzKGlkKSxcbiAgICAgICAgaXNzdWVfZGF0ZSBEQVRFIE5PVCBOVUxMLFxuICAgICAgICBkdWVfZGF0ZSBEQVRFLFxuICAgICAgICBjdXJyZW5jeSBURVhUIERFRkFVTFQgJ1VTRCcsXG4gICAgICAgIHN0YXR1cyBURVhUIENIRUNLKHN0YXR1cyBJTiAoJ2RyYWZ0Jywnc2VudCcsJ2NvbXBsZXRlJywncGFpZCcsJ292ZXJkdWUnLCd2b2lkZWQnKSkgREVGQVVMVCAnZHJhZnQnLFxuICAgICAgICBzdWJ0b3RhbCBOVU1FUklDIE5PVCBOVUxMIERFRkFVTFQgMCxcbiAgICAgICAgZGlzY291bnRfYW1vdW50IE5VTUVSSUMgREVGQVVMVCAwLFxuICAgICAgICBkaXNjb3VudF9wZXJjZW50YWdlIE5VTUVSSUMgREVGQVVMVCAwLFxuICAgICAgICB0YXhfcmF0ZSBOVU1FUklDIERFRkFVTFQgMCxcbiAgICAgICAgdGF4X2Ftb3VudCBOVU1FUklDIERFRkFVTFQgMCxcbiAgICAgICAgdG90YWwgTlVNRVJJQyBOT1QgTlVMTCxcbiAgICAgICAgcGF5bWVudF90ZXJtcyBURVhULFxuICAgICAgICBub3RlcyBURVhULFxuICAgICAgICBzaGFyZV90b2tlbiBURVhUIFVOSVFVRSBOT1QgTlVMTCxcbiAgICAgICAgY3JlYXRlZF9hdCBUSU1FU1RBTVAgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUCxcbiAgICAgICAgdXBkYXRlZF9hdCBUSU1FU1RBTVAgREVGQVVMVCBDVVJSRU5UX1RJTUVTVEFNUCxcbiAgICAgICAgcHJpY2VzX2luY2x1ZGVfdGF4IEJPT0xFQU4gREVGQVVMVCAwLFxuICAgICAgICByb3VuZGluZ19tb2RlIFRFWFQgREVGQVVMVCAnbGluZScsXG4gICAgICAgIGxvY2FsZSBURVhUXG4gICAgICApXG4gICAgYCk7XG5cbiAgICBjb25zdCBleGlzdGluZ0NvbHMgPSAoXG4gICAgICBkYXRhYmFzZS5xdWVyeShcIlBSQUdNQSB0YWJsZV9pbmZvKGludm9pY2VzKVwiKSBhcyB1bmtub3duW11bXVxuICAgICkubWFwKChyKSA9PiBTdHJpbmcoclsxXSkpO1xuICAgIGNvbnN0IG5ld0NvbHMgPSAoXG4gICAgICBkYXRhYmFzZS5xdWVyeShcIlBSQUdNQSB0YWJsZV9pbmZvKGludm9pY2VzX25ldylcIikgYXMgdW5rbm93bltdW11cbiAgICApLm1hcCgocikgPT4gU3RyaW5nKHJbMV0pKTtcbiAgICBjb25zdCBjb2xMaXN0ID0gZXhpc3RpbmdDb2xzLmZpbHRlcigoYykgPT4gbmV3Q29scy5pbmNsdWRlcyhjKSkuam9pbihcIiwgXCIpO1xuXG4gICAgZGF0YWJhc2UuZXhlY3V0ZShcbiAgICAgIGBJTlNFUlQgSU5UTyBpbnZvaWNlc19uZXcgKCR7Y29sTGlzdH0pIFNFTEVDVCAke2NvbExpc3R9IEZST00gaW52b2ljZXNgLFxuICAgICk7XG4gICAgZGF0YWJhc2UuZXhlY3V0ZShcIkRST1AgVEFCTEUgaW52b2ljZXNcIik7XG4gICAgZGF0YWJhc2UuZXhlY3V0ZShcIkFMVEVSIFRBQkxFIGludm9pY2VzX25ldyBSRU5BTUUgVE8gaW52b2ljZXNcIik7XG5cbiAgICBkYXRhYmFzZS5leGVjdXRlKFxuICAgICAgXCJDUkVBVEUgSU5ERVggSUYgTk9UIEVYSVNUUyBpZHhfaW52b2ljZXNfbnVtYmVyIE9OIGludm9pY2VzKGludm9pY2VfbnVtYmVyKVwiLFxuICAgICk7XG4gICAgZGF0YWJhc2UuZXhlY3V0ZShcbiAgICAgIFwiQ1JFQVRFIElOREVYIElGIE5PVCBFWElTVFMgaWR4X2ludm9pY2VzX2N1c3RvbWVyIE9OIGludm9pY2VzKGN1c3RvbWVyX2lkKVwiLFxuICAgICk7XG4gICAgZGF0YWJhc2UuZXhlY3V0ZShcbiAgICAgIFwiQ1JFQVRFIElOREVYIElGIE5PVCBFWElTVFMgaWR4X2ludm9pY2VzX3N0YXR1cyBPTiBpbnZvaWNlcyhzdGF0dXMpXCIsXG4gICAgKTtcbiAgICBkYXRhYmFzZS5leGVjdXRlKFxuICAgICAgXCJDUkVBVEUgSU5ERVggSUYgTk9UIEVYSVNUUyBpZHhfaW52b2ljZXNfc2hhcmVfdG9rZW4gT04gaW52b2ljZXMoc2hhcmVfdG9rZW4pXCIsXG4gICAgKTtcblxuICAgIGRhdGFiYXNlLmV4ZWN1dGUoXCJDT01NSVRcIik7XG4gICAgY29uc29sZS5sb2coXG4gICAgICBcIiBNaWdyYXRlZCBpbnZvaWNlcyB0YWJsZSB0byBzdXBwb3J0ICd2b2lkZWQnIGFuZCAnY29tcGxldGUnIHN0YXR1c2VzXCIsXG4gICAgKTtcbiAgfSBjYXRjaCAobWlnRXJyKSB7XG4gICAgZGF0YWJhc2UuZXhlY3V0ZShcIlJPTExCQUNLXCIpO1xuICAgIHRocm93IG1pZ0VycjtcbiAgfSBmaW5hbGx5IHtcbiAgICBkYXRhYmFzZS5leGVjdXRlKFwiUFJBR01BIGZvcmVpZ25fa2V5cyA9IE9OXCIpO1xuICB9XG5cbiAgLy8gVmVyaWZ5IGNoaWxkIHJvd3Mgc3Vydml2ZWRcbiAgY29uc3QgaXRlbUNvdW50QWZ0ZXIgPSBOdW1iZXIoXG4gICAgKGRhdGFiYXNlLnF1ZXJ5KFwiU0VMRUNUIENPVU5UKCopIEZST00gaW52b2ljZV9pdGVtc1wiKSBhcyB1bmtub3duW11bXSlbMF1bMF0sXG4gICk7XG4gIGlmIChpdGVtQ291bnRBZnRlciAhPT0gaXRlbUNvdW50QmVmb3JlKSB7XG4gICAgY29uc29sZS5lcnJvcihcbiAgICAgIGAgIFdBUk5JTkc6IGludm9pY2VfaXRlbXMgcm93IGNvdW50IGNoYW5nZWQgZHVyaW5nIG1pZ3JhdGlvbiEgYCArXG4gICAgICAgIGBCZWZvcmU6ICR7aXRlbUNvdW50QmVmb3JlfSwgQWZ0ZXI6ICR7aXRlbUNvdW50QWZ0ZXJ9LiBgICtcbiAgICAgICAgYENoZWNrIHlvdXIgZGF0YWJhc2UgYmFja3VwIGZvciByZWNvdmVyeS5gLFxuICAgICk7XG4gIH0gZWxzZSBpZiAoaXRlbUNvdW50QmVmb3JlID4gMCkge1xuICAgIGNvbnNvbGUubG9nKGAgICBWZXJpZmllZDogJHtpdGVtQ291bnRCZWZvcmV9IGludm9pY2UgaXRlbXMgcHJlc2VydmVkYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5zdXJlU2NoZW1hVXBncmFkZXMoZGF0YWJhc2U6IERCKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgZW5zdXJlQ3VzdG9tZXJDb2x1bW5zKGRhdGFiYXNlKTtcbiAgICBiYWNrZmlsbEN1c3RvbWVyTnVtYmVycyhkYXRhYmFzZSk7XG4gICAgZW5zdXJlSW52b2ljZUNvbHVtbnMoZGF0YWJhc2UpO1xuICAgIGVuc3VyZVRheFRhYmxlcyhkYXRhYmFzZSk7XG4gICAgZW5zdXJlUHJvZHVjdFRhYmxlcyhkYXRhYmFzZSk7XG4gICAgZW5zdXJlUHJvZHVjdENvbHVtbnMoZGF0YWJhc2UpO1xuICAgIHNlZWRQcm9kdWN0RGVmYXVsdHMoZGF0YWJhc2UpO1xuICAgIG1pZ3JhdGVJbnZvaWNlc0ZvclZvaWRlZChkYXRhYmFzZSk7XG4gICAgZW5zdXJlSW52b2ljZUl0ZW1Db2x1bW5zKGRhdGFiYXNlKTtcbiAgICBlbnN1cmVVc2VyQ29sdW1ucyhkYXRhYmFzZSk7XG4gICAgZW5zdXJlU3RhdHVzSGlzdG9yeVRhYmxlKGRhdGFiYXNlKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUud2FybihcIlNjaGVtYSB1cGdyYWRlIGNoZWNrIGZhaWxlZDpcIiwgZSk7XG4gIH1cbn1cblxuLy9cbi8vICBCdWlsdC1pbiB0ZW1wbGF0ZXNcbi8vXG5cbmNvbnN0IEJVSUxUSU5fVEVNUExBVEVTID0gW1xuICB7IGlkOiBcInByb2Zlc3Npb25hbC1tb2Rlcm5cIiwgbmFtZTogXCJQcm9mZXNzaW9uYWwgTW9kZXJuXCIsIGlzRGVmYXVsdDogZmFsc2UgfSxcbiAgeyBpZDogXCJtaW5pbWFsaXN0LWNsZWFuXCIsIG5hbWU6IFwiTWluaW1hbGlzdCBDbGVhblwiLCBpc0RlZmF1bHQ6IHRydWUgfSxcbiAgeyBpZDogXCJub3ZhXCIsIG5hbWU6IFwiTm92YVwiLCBpc0RlZmF1bHQ6IGZhbHNlIH0sXG4gIHsgaWQ6IFwic2xhdGVcIiwgbmFtZTogXCJTbGF0ZVwiLCBpc0RlZmF1bHQ6IGZhbHNlIH0sXG5dIGFzIGNvbnN0O1xuXG5mdW5jdGlvbiBsb2FkVGVtcGxhdGVIdG1sKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKGAuLi8uLi9zdGF0aWMvdGVtcGxhdGVzLyR7aWR9Lmh0bWxgLCBpbXBvcnQubWV0YS51cmwpO1xuICB0cnkge1xuICAgIHJldHVybiBEZW5vLnJlYWRUZXh0RmlsZVN5bmModXJsKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byByZWFkIHRlbXBsYXRlICR7dXJsfSAoY3dkPSR7RGVuby5jd2QoKX0pOmAsIGUpO1xuICAgIHJldHVybiBcIjxodG1sPjxib2R5PjxwPlRlbXBsYXRlIHVuYXZhaWxhYmxlLjwvcD48L2JvZHk+PC9odG1sPlwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluc2VydEJ1aWx0aW5UZW1wbGF0ZXMoZGF0YWJhc2U6IERCKTogdm9pZCB7XG4gIGZvciAoY29uc3QgdCBvZiBCVUlMVElOX1RFTVBMQVRFUykge1xuICAgIGNvbnN0IGh0bWwgPSBsb2FkVGVtcGxhdGVIdG1sKHQuaWQpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IGRhdGFiYXNlLnF1ZXJ5KFxuICAgICAgICBcIlNFTEVDVCBodG1sIEZST00gdGVtcGxhdGVzIFdIRVJFIGlkID0gP1wiLFxuICAgICAgICBbdC5pZF0sXG4gICAgICApO1xuICAgICAgaWYgKGV4aXN0aW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkYXRhYmFzZS5xdWVyeShcbiAgICAgICAgICBcIklOU0VSVCBJTlRPIHRlbXBsYXRlcyAoaWQsIG5hbWUsIGh0bWwsIGlzX2RlZmF1bHQsIGNyZWF0ZWRfYXQpIFZBTFVFUyAoPywgPywgPywgPywgPylcIixcbiAgICAgICAgICBbdC5pZCwgdC5uYW1lLCBodG1sLCB0LmlzRGVmYXVsdCwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpXSxcbiAgICAgICAgKTtcbiAgICAgICAgY29uc29sZS5sb2coYCBJbnN0YWxsZWQgdGVtcGxhdGU6ICR7dC5uYW1lfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IFN0cmluZygoZXhpc3RpbmdbMF0gYXMgdW5rbm93bltdKVswXSA/PyBcIlwiKTtcbiAgICAgICAgaWYgKGN1cnJlbnQudHJpbSgpICE9PSBodG1sLnRyaW0oKSkge1xuICAgICAgICAgIGRhdGFiYXNlLnF1ZXJ5KFxuICAgICAgICAgICAgXCJVUERBVEUgdGVtcGxhdGVzIFNFVCBuYW1lID0gPywgaHRtbCA9ID8sIGlzX2RlZmF1bHQgPSA/IFdIRVJFIGlkID0gP1wiLFxuICAgICAgICAgICAgW3QubmFtZSwgaHRtbCwgdC5pc0RlZmF1bHQsIHQuaWRdLFxuICAgICAgICAgICk7XG4gICAgICAgICAgY29uc29sZS5sb2coYCAgVXBkYXRlZCB0ZW1wbGF0ZSBmcm9tIGZpbGU6ICR7dC5uYW1lfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byB1cHNlcnQgdGVtcGxhdGUgJHt0Lm5hbWV9OmAsIGVycm9yKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5zdXJlVGVtcGxhdGVEZWZhdWx0cyhkYXRhYmFzZTogREIpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBkYXRhYmFzZS5xdWVyeShcIkRFTEVURSBGUk9NIHRlbXBsYXRlcyBXSEVSRSBpZCA9ID9cIiwgW1wiZGVmYXVsdC10ZW1wbGF0ZVwiXSk7XG5cbiAgICBjb25zdCByb3dzID0gZGF0YWJhc2UucXVlcnkoXCJTRUxFQ1QgaWQgRlJPTSB0ZW1wbGF0ZXNcIik7XG4gICAgY29uc3QgaWRzID0gcm93cy5tYXAoKHIpID0+IFN0cmluZygociBhcyB1bmtub3duW10pWzBdKSk7XG5cbiAgICBkYXRhYmFzZS5xdWVyeShcIlVQREFURSB0ZW1wbGF0ZXMgU0VUIGlzX2RlZmF1bHQgPSAwXCIpO1xuXG4gICAgY29uc3QgcHJlZmVycmVkID0gaWRzLmluY2x1ZGVzKFwibWluaW1hbGlzdC1jbGVhblwiKVxuICAgICAgPyBcIm1pbmltYWxpc3QtY2xlYW5cIlxuICAgICAgOiBpZHNbMF07XG4gICAgaWYgKHByZWZlcnJlZCkge1xuICAgICAgZGF0YWJhc2UucXVlcnkoXCJVUERBVEUgdGVtcGxhdGVzIFNFVCBpc19kZWZhdWx0ID0gMSBXSEVSRSBpZCA9ID9cIiwgW1xuICAgICAgICBwcmVmZXJyZWQsXG4gICAgICBdKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGVuc3VyZSB0ZW1wbGF0ZSBkZWZhdWx0czpcIiwgZSk7XG4gIH1cbn1cblxuLy9cbi8vICBBZG1pbiBzZWVkaW5nXG4vL1xuXG5hc3luYyBmdW5jdGlvbiBzZWVkQWRtaW5Vc2VyKGRhdGFiYXNlOiBEQik6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHJvd3MgPSBkYXRhYmFzZS5xdWVyeShcIlNFTEVDVCBDT1VOVCgqKSBGUk9NIHVzZXJzXCIpO1xuICAgIGlmIChOdW1iZXIoKHJvd3NbMF0gYXMgdW5rbm93bltdKVswXSkgPiAwKSByZXR1cm47XG5cbiAgICBjb25zdCB7IHVzZXJuYW1lLCBwYXNzd29yZCB9ID0gZ2V0QWRtaW5DcmVkZW50aWFscygpO1xuICAgIGNvbnN0IGlkID0gZ2VuZXJhdGVVVUlEKCk7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIGNvbnN0IHBhc3N3b3JkSGFzaCA9IGF3YWl0IGhhc2hQYXNzd29yZChwYXNzd29yZCk7XG5cbiAgICBkYXRhYmFzZS5xdWVyeShcbiAgICAgIGBJTlNFUlQgSU5UTyB1c2VycyAoaWQsIHVzZXJuYW1lLCBlbWFpbCwgZGlzcGxheV9uYW1lLCBwYXNzd29yZF9oYXNoLCBpc19hZG1pbiwgaXNfYWN0aXZlLCBjcmVhdGVkX2F0LCB1cGRhdGVkX2F0KVxuICAgICAgIFZBTFVFUyAoPywgPywgTlVMTCwgPywgPywgMSwgMSwgPywgPylgLFxuICAgICAgW2lkLCB1c2VybmFtZSwgdXNlcm5hbWUsIHBhc3N3b3JkSGFzaCwgbm93LCBub3ddLFxuICAgICk7XG5cbiAgICBmb3IgKFxuICAgICAgY29uc3QgW3Jlc291cmNlLCBhY3Rpb25zXSBvZiBPYmplY3QuZW50cmllcyhSRVNPVVJDRV9BQ1RJT05TKSBhcyBbXG4gICAgICAgIFJlc291cmNlLFxuICAgICAgICByZWFkb25seSBBY3Rpb25bXSxcbiAgICAgIF1bXVxuICAgICkge1xuICAgICAgZm9yIChjb25zdCBhY3Rpb24gb2YgYWN0aW9ucykge1xuICAgICAgICBkYXRhYmFzZS5xdWVyeShcbiAgICAgICAgICBcIklOU0VSVCBJTlRPIHVzZXJfcGVybWlzc2lvbnMgKGlkLCB1c2VyX2lkLCByZXNvdXJjZSwgYWN0aW9uKSBWQUxVRVMgKD8sID8sID8sID8pXCIsXG4gICAgICAgICAgW2dlbmVyYXRlVVVJRCgpLCBpZCwgcmVzb3VyY2UsIGFjdGlvbl0sXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYCBTZWVkZWQgYWRtaW4gdXNlcjogJHt1c2VybmFtZX1gKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtc2cgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgY29uc29sZS53YXJuKFwiQ291bGQgbm90IHNlZWQgYWRtaW4gdXNlcjpcIiwgbXNnKTtcbiAgfVxufVxuXG4vL1xuLy8gIFB1YmxpYyBBUEk6IGluaXQgLyByZXNldCAvIGFjY2Vzc29yc1xuLy9cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXREYXRhYmFzZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgZGJQYXRoID0gcmVzb2x2ZVBhdGgoZ2V0RW52KFwiREFUQUJBU0VfUEFUSFwiLCBcIi4vaW52aW8uZGJcIikhKTtcbiAgZW5zdXJlRGlyKHNpbXBsZURpcm5hbWUoZGJQYXRoKSk7XG5cbiAgLy8gRGV0ZWN0IGV4aXN0aW5nIGRhdGFiYXNlICh1cGdyYWRlIHZzIGZyZXNoIGluc3RhbGwpXG4gIGxldCBkYkZpbGVFeGlzdGVkID0gZmFsc2U7XG4gIHRyeSB7XG4gICAgRGVuby5zdGF0U3luYyhkYlBhdGgpO1xuICAgIGRiRmlsZUV4aXN0ZWQgPSB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICAvKiBuZXcgaW5zdGFsbCAqL1xuICB9XG5cbiAgZGIgPSBuZXcgREIoZGJQYXRoKTtcblxuICAvLyBCYWNrdXAgYmVmb3JlIG1pZ3JhdGlvbnMgaWYgdXBncmFkaW5nIHRvIGEgbmV3IHZlcnNpb25cbiAgaWYgKGRiRmlsZUV4aXN0ZWQpIGJhY2t1cElmVmVyc2lvbkNoYW5nZWQoZGIsIGRiUGF0aCk7XG5cbiAgLy8gUnVuIGlkZW1wb3RlbnQgbWlncmF0aW9ucyBmcm9tIC5zcWwgZmlsZVxuICBjb25zdCBzcWwgPSBEZW5vLnJlYWRUZXh0RmlsZVN5bmMoXCIuL3NyYy9kYXRhYmFzZS9taWdyYXRpb25zLnNxbFwiKTtcbiAgZXhlY3V0ZU1pZ3JhdGlvbnMoZGIsIHBhcnNlU3FsU3RhdGVtZW50cyhzcWwpKTtcblxuICAvLyBQb3N0LW1pZ3JhdGlvbiBzZXR1cFxuICBpbnNlcnRCdWlsdGluVGVtcGxhdGVzKGRiKTtcbiAgZW5zdXJlVGVtcGxhdGVEZWZhdWx0cyhkYik7XG4gIGVuc3VyZVNjaGVtYVVwZ3JhZGVzKGRiKTtcbiAgYXdhaXQgc2VlZEFkbWluVXNlcihkYik7XG4gIHN0b3JlU2NoZW1hVmVyc2lvbihkYik7XG5cbiAgY29uc29sZS5sb2coXCJEYXRhYmFzZSBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHlcIik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldERhdGFiYXNlRnJvbURlbW8oKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghaXNEZW1vTW9kZSgpKSByZXR1cm47XG4gIGNvbnN0IGRlbW9EYiA9IGdldEVudihcIkRFTU9fREJfUEFUSFwiKTtcbiAgY29uc3QgYWN0aXZlUGF0aCA9IHJlc29sdmVQYXRoKGdldEVudihcIkRBVEFCQVNFX1BBVEhcIiwgXCIuL2ludmlvLmRiXCIpISk7XG4gIGlmICghZGVtb0RiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiREVNT19NT0RFIGlzIHRydWUgYnV0IERFTU9fREJfUEFUSCBpcyBub3Qgc2V0LlwiKTtcbiAgfVxuICBjb25zdCBkZW1vUGF0aCA9IHJlc29sdmVQYXRoKGRlbW9EYik7XG4gIGNvbnN0IHRlbXBQYXRoID1cbiAgICBgJHthY3RpdmVQYXRofS5kZW1vLXJlc2V0LSR7RGF0ZS5ub3coKX0tJHtjcnlwdG8ucmFuZG9tVVVJRCgpfS50bXBgO1xuXG4gIHRyeSB7XG4gICAgY2xvc2VEYXRhYmFzZSgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBGYWlsZWQgdG8gY2xvc2UgY3VycmVudCBkYXRhYmFzZSBiZWZvcmUgZGVtbyByZXNldDogJHtcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICB9YCxcbiAgICApO1xuICB9XG5cbiAgbGV0IHJlc2V0RXJyb3I6IHVua25vd24gPSB1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgRGVuby5zdGF0U3luYyhkZW1vUGF0aCk7XG4gICAgZW5zdXJlRGlyKHNpbXBsZURpcm5hbWUoYWN0aXZlUGF0aCkpO1xuXG4gICAgRGVuby5jb3B5RmlsZVN5bmMoZGVtb1BhdGgsIHRlbXBQYXRoKTtcbiAgICB0cnkge1xuICAgICAgRGVuby5yZW5hbWVTeW5jKHRlbXBQYXRoLCBhY3RpdmVQYXRoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIERlbm8ucmVtb3ZlU3luYyhhY3RpdmVQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGlmICghKGVycm9yIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuTm90Rm91bmQpKSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIERlbm8ucmVuYW1lU3luYyh0ZW1wUGF0aCwgYWN0aXZlUGF0aCk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKFwiICBEZW1vIGRhdGFiYXNlIHJlc2V0IGZyb20gREVNT19EQl9QQVRILlwiKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJlc2V0RXJyb3IgPSBlO1xuICB9IGZpbmFsbHkge1xuICAgIHRyeSB7XG4gICAgICBEZW5vLnJlbW92ZVN5bmModGVtcFBhdGgpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSkge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZCBub3QgcmVtb3ZlIHRlbXBvcmFyeSBkZW1vIHJlc2V0IGZpbGU6XCIsIGVycm9yKTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXdhaXQgaW5pdERhdGFiYXNlKCk7XG4gIH1cblxuICBpZiAocmVzZXRFcnJvcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBGYWlsZWQgdG8gcmVzZXQgZGVtbyBkYXRhYmFzZTogJHtcbiAgICAgICAgcmVzZXRFcnJvciBpbnN0YW5jZW9mIEVycm9yID8gcmVzZXRFcnJvci5tZXNzYWdlIDogU3RyaW5nKHJlc2V0RXJyb3IpXG4gICAgICB9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRhYmFzZSgpOiBEQiB7XG4gIGlmICghZGIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJEYXRhYmFzZSBub3QgaW5pdGlhbGl6ZWQuIENhbGwgaW5pdERhdGFiYXNlKCkgZmlyc3QuXCIpO1xuICB9XG4gIHJldHVybiBkYjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsb3NlRGF0YWJhc2UoKTogdm9pZCB7XG4gIGlmICghZGIpIHJldHVybjtcbiAgZGIuY2xvc2UoKTtcbiAgZGIgPSB1bmRlZmluZWQ7XG59XG5cbi8vXG4vLyAgSW52b2ljZSBudW1iZXJpbmdcbi8vXG5cbmZ1bmN0aW9uIGNyeXB0b1JhbmRvbShsZW46IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IGFscGhhYmV0ID0gXCJBQkNERUZHSEpLTE1OUFFSU1RVVldYWVoyMzQ1Njc4OVwiO1xuICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGxlbik7XG4gIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYnl0ZXMpO1xuICByZXR1cm4gQXJyYXkuZnJvbShieXRlcywgKGIpID0+IGFscGhhYmV0W2IgJSBhbHBoYWJldC5sZW5ndGhdKS5qb2luKFwiXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVEcmFmdEludm9pY2VOdW1iZXIoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBEUkFGVC0ke2NyeXB0b1JhbmRvbSg2KX1gO1xufVxuXG4vKiogUmVhZCBpbnZvaWNlLW51bWJlcmluZyBzZXR0aW5ncyBmcm9tIHRoZSBkYXRhYmFzZS4gKi9cbmZ1bmN0aW9uIGdldE51bWJlcmluZ1NldHRpbmdzKCk6IHtcbiAgcHJlZml4OiBzdHJpbmc7XG4gIGluY2x1ZGVZZWFyOiBib29sZWFuO1xuICBwYWQ6IG51bWJlcjtcbiAgcGF0dGVybj86IHN0cmluZztcbiAgZW5hYmxlZDogYm9vbGVhbjtcbn0ge1xuICBjb25zdCBjZmcgPSB7XG4gICAgcHJlZml4OiBcIklOVlwiLFxuICAgIGluY2x1ZGVZZWFyOiB0cnVlLFxuICAgIHBhZDogMyxcbiAgICBwYXR0ZXJuOiB1bmRlZmluZWQgYXMgc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIGVuYWJsZWQ6IHRydWUsXG4gIH07XG4gIHRyeSB7XG4gICAgY29uc3Qgcm93cyA9IGdldERhdGFiYXNlKCkucXVlcnkoXG4gICAgICBcIlNFTEVDVCBrZXksIHZhbHVlIEZST00gc2V0dGluZ3MgV0hFUkUga2V5IElOICgnaW52b2ljZVByZWZpeCcsJ2ludm9pY2VJbmNsdWRlWWVhcicsJ2ludm9pY2VOdW1iZXJQYWRkaW5nJywnaW52b2ljZU51bWJlclBhdHRlcm4nKVwiLFxuICAgICk7XG4gICAgY29uc3QgbSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCByIG9mIHJvd3MpIHtcbiAgICAgIGNvbnN0IFtrLCB2XSA9IHIgYXMgW3N0cmluZywgc3RyaW5nXTtcbiAgICAgIG0uc2V0KGssIHYpO1xuICAgIH1cblxuICAgIGNmZy5wcmVmaXggPSAobS5nZXQoXCJpbnZvaWNlUHJlZml4XCIpIHx8IGNmZy5wcmVmaXgpLnRyaW0oKSB8fCBjZmcucHJlZml4O1xuICAgIGNmZy5pbmNsdWRlWWVhciA9XG4gICAgICAobS5nZXQoXCJpbnZvaWNlSW5jbHVkZVllYXJcIikgfHwgXCJ0cnVlXCIpLnRvTG93ZXJDYXNlKCkgIT09IFwiZmFsc2VcIjtcbiAgICBjb25zdCBwID0gcGFyc2VJbnQobS5nZXQoXCJpbnZvaWNlTnVtYmVyUGFkZGluZ1wiKSB8fCBTdHJpbmcoY2ZnLnBhZCksIDEwKTtcbiAgICBpZiAoIU51bWJlci5pc05hTihwKSAmJiBwID49IDIgJiYgcCA8PSA4KSBjZmcucGFkID0gcDtcbiAgICBjZmcucGF0dGVybiA9IChtLmdldChcImludm9pY2VOdW1iZXJQYXR0ZXJuXCIpIHx8IFwiXCIpLnRyaW0oKSB8fCB1bmRlZmluZWQ7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmF3ID0gZ2V0RGF0YWJhc2UoKS5xdWVyeShcbiAgICAgICAgXCJTRUxFQ1QgdmFsdWUgRlJPTSBzZXR0aW5ncyBXSEVSRSBrZXkgPSAnaW52b2ljZU51bWJlcmluZ0VuYWJsZWQnIExJTUlUIDFcIixcbiAgICAgICk7XG4gICAgICBpZiAocmF3Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgY2ZnLmVuYWJsZWQgPSBTdHJpbmcocmF3WzBdWzBdKS50b0xvd2VyQ2FzZSgpICE9PSBcImZhbHNlXCI7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBpZ25vcmUgKi9cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8qIHVzZSBkZWZhdWx0cyAqL1xuICB9XG4gIHJldHVybiBjZmc7XG59XG5cbi8qKiBGaW5kIHRoZSBoaWdoZXN0IGV4aXN0aW5nIHNlcXVlbnRpYWwgc3VmZml4IG1hdGNoaW5nIGBsaWtlUHJlZml4JWAsIG9wdGlvbmFsbHkgc2NvcGVkIHRvIGEgc2luZ2xlIGN1c3RvbWVyLiAqL1xuZnVuY3Rpb24gZmluZE1heFNlcXVlbmNlKGxpa2VQcmVmaXg6IHN0cmluZywgY3VzdG9tZXJJZD86IHN0cmluZyk6IG51bWJlciB7XG4gIGNvbnN0IHJvd3MgPSBjdXN0b21lcklkXG4gICAgPyBnZXREYXRhYmFzZSgpLnF1ZXJ5KFxuICAgICAgXCJTRUxFQ1QgaW52b2ljZV9udW1iZXIgRlJPTSBpbnZvaWNlcyBXSEVSRSBpbnZvaWNlX251bWJlciBMSUtFID8gQU5EIGN1c3RvbWVyX2lkID0gP1wiLFxuICAgICAgW2xpa2VQcmVmaXggKyBcIiVcIiwgY3VzdG9tZXJJZF0sXG4gICAgKVxuICAgIDogZ2V0RGF0YWJhc2UoKS5xdWVyeShcbiAgICAgIFwiU0VMRUNUIGludm9pY2VfbnVtYmVyIEZST00gaW52b2ljZXMgV0hFUkUgaW52b2ljZV9udW1iZXIgTElLRSA/XCIsXG4gICAgICBbbGlrZVByZWZpeCArIFwiJVwiXSxcbiAgICApO1xuICBjb25zdCBlc2NhcGVkID0gbGlrZVByZWZpeC5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChgXiR7ZXNjYXBlZH0oXFxcXGQrKS4qPyRgKTtcbiAgbGV0IG1heCA9IDA7XG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICBjb25zdCBtID0gU3RyaW5nKChyb3cgYXMgdW5rbm93bltdKVswXSA/PyBcIlwiKS5tYXRjaChyZSk7XG4gICAgaWYgKG0pIG1heCA9IE1hdGgubWF4KG1heCwgcGFyc2VJbnQobVsxXSwgMTApIHx8IDApO1xuICB9XG4gIHJldHVybiBtYXg7XG59XG5cbi8qKiBMb29rIHVwIGEgY3VzdG9tZXIncyBwZXJtYW5lbnQgc2VxdWVudGlhbCBjdXN0b21lcl9udW1iZXIsIGlmIGFueS4gKi9cbmZ1bmN0aW9uIGdldEN1c3RvbWVyTnVtYmVyKGN1c3RvbWVySWQ/OiBzdHJpbmcpOiBudW1iZXIgfCBudWxsIHtcbiAgaWYgKCFjdXN0b21lcklkKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCByb3dzID0gZ2V0RGF0YWJhc2UoKS5xdWVyeShcbiAgICAgIFwiU0VMRUNUIGN1c3RvbWVyX251bWJlciBGUk9NIGN1c3RvbWVycyBXSEVSRSBpZCA9ID9cIixcbiAgICAgIFtjdXN0b21lcklkXSxcbiAgICApIGFzIHVua25vd25bXVtdO1xuICAgIGlmIChyb3dzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgdiA9IHJvd3NbMF1bMF07XG4gICAgcmV0dXJuIHYgPT0gbnVsbCA/IG51bGwgOiBOdW1iZXIodik7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKiBFeHBhbmQgZGF0ZS9yYW5kb20gdG9rZW5zIGluIGFuIGludm9pY2UtbnVtYmVyIHBhdHRlcm4uICovXG5mdW5jdGlvbiBleHBhbmRQYXR0ZXJuVG9rZW5zKHBhdHRlcm46IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IFlZWVkgPSBTdHJpbmcobm93LmdldEZ1bGxZZWFyKCkpO1xuICBjb25zdCBZWSA9IFlZWVkuc2xpY2UoLTIpO1xuICBjb25zdCBNTSA9IFN0cmluZyhub3cuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcbiAgY29uc3QgREQgPSBTdHJpbmcobm93LmdldERhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpO1xuICByZXR1cm4gcGF0dGVyblxuICAgIC5yZXBsYWNlKC9cXHtZWVlZXFx9L2csIFlZWVkpXG4gICAgLnJlcGxhY2UoL1xce1lZXFx9L2csIFlZKVxuICAgIC5yZXBsYWNlKC9cXHtNTVxcfS9nLCBNTSlcbiAgICAucmVwbGFjZSgvXFx7RERcXH0vZywgREQpXG4gICAgLnJlcGxhY2UoL1xce0RBVEVcXH0vZywgYCR7WVlZWX0ke01NfSR7RER9YClcbiAgICAucmVwbGFjZSgvXFx7UkFORDRcXH0vZywgKCkgPT4gY3J5cHRvUmFuZG9tKDQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE5leHRJbnZvaWNlTnVtYmVyKGN1c3RvbWVySWQ/OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjZmcgPSBnZXROdW1iZXJpbmdTZXR0aW5ncygpO1xuXG4gIC8vIEFkdmFuY2VkIHBhdHRlcm4gbW9kZSAod2hlbiBlbmFibGVkIGFuZCBjb25maWd1cmVkKVxuICBpZiAoY2ZnLnBhdHRlcm4gJiYgY2ZnLmVuYWJsZWQpIHtcbiAgICBjb25zdCBleHBhbmRlZCA9IGV4cGFuZFBhdHRlcm5Ub2tlbnMoY2ZnLnBhdHRlcm4pO1xuICAgIGNvbnN0IGhhc1NlcSA9IC9cXHtTRVFcXH0vLnRlc3QoY2ZnLnBhdHRlcm4pO1xuICAgIGNvbnN0IGhhc0NsaWVudFNlcSA9IC9cXHtDU0VRXFx9Ly50ZXN0KGNmZy5wYXR0ZXJuKTtcbiAgICBjb25zdCBoYXNDdXN0b21lck51bSA9IC9cXHtDTlVNXFx9Ly50ZXN0KGNmZy5wYXR0ZXJuKTtcbiAgICBpZiAoIWhhc1NlcSAmJiAhaGFzQ2xpZW50U2VxICYmICFoYXNDdXN0b21lck51bSkgcmV0dXJuIGV4cGFuZGVkO1xuXG4gICAgbGV0IHJlc3VsdCA9IGV4cGFuZGVkO1xuICAgIC8vIHtDTlVNfSBtdXN0IHJlc29sdmUgZmlyc3Q6IHtTRVF9L3tDU0VRfSBzY2FuIGV4aXN0aW5nIGludm9pY2VfbnVtYmVyXG4gICAgLy8gdmFsdWVzIHVzaW5nIGV2ZXJ5dGhpbmcgYmVmb3JlIHRoZW0gYXMgYSBMSUtFIHByZWZpeCwgc28gdGhhdCBwcmVmaXhcbiAgICAvLyBoYXMgdG8gYmUgZnVsbHkgbGl0ZXJhbCAobm8gbGVmdG92ZXIge0NOVU19IHBsYWNlaG9sZGVyKSBvciBpdCB3aWxsXG4gICAgLy8gbmV2ZXIgbWF0Y2ggYSByZWFsIHN0b3JlZCBpbnZvaWNlIG51bWJlciBhbmQgdGhlIGNvdW50ZXIgYWx3YXlzXG4gICAgLy8gcmVhZHMgYXMgZW1wdHkgKHN0dWNrIGF0IDEpLlxuICAgIGlmIChoYXNDdXN0b21lck51bSkge1xuICAgICAgLy8ge0NOVU19OiB0aGUgY3VzdG9tZXIncyBvd24gcGVybWFuZW50IHNlcXVlbnRpYWwgbnVtYmVyXG4gICAgICBjb25zdCBjdXN0TnVtID0gZ2V0Q3VzdG9tZXJOdW1iZXIoY3VzdG9tZXJJZCk7XG4gICAgICByZXN1bHQgPSByZXN1bHQucmVwbGFjZShcbiAgICAgICAgL1xce0NOVU1cXH0vZyxcbiAgICAgICAgY3VzdE51bSAhPSBudWxsID8gU3RyaW5nKGN1c3ROdW0pLnBhZFN0YXJ0KDMsIFwiMFwiKSA6IFwiXCIsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoaGFzU2VxKSB7XG4gICAgICAvLyB7U0VRfTogZ2xvYmFsIGNvdW50ZXIsIHNoYXJlZCBhY3Jvc3MgYWxsIGN1c3RvbWVyc1xuICAgICAgY29uc3QgcHJlZml4ID0gcmVzdWx0LnNwbGl0KFwie1NFUX1cIilbMF07XG4gICAgICBjb25zdCBuZXh0ID0gZmluZE1heFNlcXVlbmNlKHByZWZpeCkgKyAxO1xuICAgICAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UoL1xce1NFUVxcfS9nLCBTdHJpbmcobmV4dCkucGFkU3RhcnQoMywgXCIwXCIpKTtcbiAgICB9XG4gICAgaWYgKGhhc0NsaWVudFNlcSkge1xuICAgICAgLy8ge0NTRVF9OiBjb3VudGVyIHNjb3BlZCB0byB0aGlzIGN1c3RvbWVyJ3Mgb3duIGludm9pY2VzXG4gICAgICBjb25zdCBwcmVmaXggPSByZXN1bHQuc3BsaXQoXCJ7Q1NFUX1cIilbMF07XG4gICAgICBjb25zdCBuZXh0ID0gZmluZE1heFNlcXVlbmNlKHByZWZpeCwgY3VzdG9tZXJJZCkgKyAxO1xuICAgICAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UoL1xce0NTRVFcXH0vZywgU3RyaW5nKG5leHQpLnBhZFN0YXJ0KDMsIFwiMFwiKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBMZWdhY3kgbW9kZTogUFJFRklYLVlZWVktTk5OIChnbG9iYWwsIG5vIHBlci1jbGllbnQgdmFyaWFudClcbiAgY29uc3QgYmFzZSA9IGNmZy5pbmNsdWRlWWVhclxuICAgID8gYCR7Y2ZnLnByZWZpeH0tJHtuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCl9LWBcbiAgICA6IGAke2NmZy5wcmVmaXh9LWA7XG4gIGNvbnN0IG5leHQgPSBmaW5kTWF4U2VxdWVuY2UoYmFzZSkgKyAxO1xuICByZXR1cm4gYCR7YmFzZX0ke1N0cmluZyhuZXh0KS5wYWRTdGFydChjZmcucGFkLCBcIjBcIil9YDtcbn1cblxuLy9cbi8vICBJbnZvaWNlIHRvdGFsIGNhbGN1bGF0aW9uc1xuLy9cblxuZXhwb3J0IGludGVyZmFjZSBDYWxjdWxhdGVkVG90YWxzIHtcbiAgc3VidG90YWw6IG51bWJlcjtcbiAgZGlzY291bnRBbW91bnQ6IG51bWJlcjtcbiAgdGF4QW1vdW50OiBudW1iZXI7XG4gIHRvdGFsOiBudW1iZXI7XG59XG5cbmNvbnN0IHIyID0gKG46IG51bWJlcikgPT4gTWF0aC5yb3VuZChuICogMTAwKSAvIDEwMDtcblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZUludm9pY2VUb3RhbHMoXG4gIGl0ZW1zOiBBcnJheTx7IHF1YW50aXR5OiBudW1iZXI7IHVuaXRQcmljZTogbnVtYmVyIH0+LFxuICBkaXNjb3VudFBlcmNlbnRhZ2UgPSAwLFxuICBkaXNjb3VudEFtb3VudCA9IDAsXG4gIHRheFJhdGUgPSAwLFxuICBwcmljZXNJbmNsdWRlVGF4ID0gZmFsc2UsXG4gIHJvdW5kaW5nTW9kZTogXCJsaW5lXCIgfCBcInRvdGFsXCIgPSBcImxpbmVcIixcbik6IENhbGN1bGF0ZWRUb3RhbHMge1xuICBjb25zdCByYXRlID0gTWF0aC5tYXgoMCwgTnVtYmVyKHRheFJhdGUpIHx8IDApIC8gMTAwO1xuXG4gIGNvbnN0IGxpbmVHcm9zc2VzID0gaXRlbXMubWFwKFxuICAgIChpdCkgPT4gKE51bWJlcihpdC5xdWFudGl0eSkgfHwgMCkgKiAoTnVtYmVyKGl0LnVuaXRQcmljZSkgfHwgMCksXG4gICk7XG4gIGNvbnN0IHN1YnRvdGFsID0gbGluZUdyb3NzZXMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XG5cbiAgbGV0IGZpbmFsRGlzY291bnQgPSBOdW1iZXIoZGlzY291bnRBbW91bnQpIHx8IDA7XG4gIGlmIChkaXNjb3VudFBlcmNlbnRhZ2UgPiAwKSB7XG4gICAgZmluYWxEaXNjb3VudCA9IHN1YnRvdGFsICogKGRpc2NvdW50UGVyY2VudGFnZSAvIDEwMCk7XG4gIH1cbiAgZmluYWxEaXNjb3VudCA9IE1hdGgubWluKE1hdGgubWF4KGZpbmFsRGlzY291bnQsIDApLCBzdWJ0b3RhbCk7XG5cbiAgbGV0IHRheEFtb3VudCA9IDA7XG4gIGxldCB0b3RhbCA9IDA7XG5cbiAgaWYgKHJvdW5kaW5nTW9kZSA9PT0gXCJsaW5lXCIgJiYgc3VidG90YWwgPiAwKSB7XG4gICAgLy8gUHJvcG9ydGlvbmFsIHBlci1saW5lIGRpc2NvdW50LCByb3VuZGVkIHBlciBsaW5lXG4gICAgbGV0IGRpc3RyaWJ1dGVkID0gMDtcbiAgICBjb25zdCBsaW5lRGlzY291bnRzID0gbGluZUdyb3NzZXMubWFwKChnLCBpZHgpID0+IHtcbiAgICAgIGlmIChpZHggPT09IGxpbmVHcm9zc2VzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgcmV0dXJuIHIyKGZpbmFsRGlzY291bnQgLSBkaXN0cmlidXRlZCk7XG4gICAgICB9XG4gICAgICBjb25zdCBkID0gcjIoZmluYWxEaXNjb3VudCAqIChnIC8gc3VidG90YWwpKTtcbiAgICAgIGRpc3RyaWJ1dGVkICs9IGQ7XG4gICAgICByZXR1cm4gZDtcbiAgICB9KTtcblxuICAgIGxldCBzdW1UYXggPSAwLFxuICAgICAgc3VtVG90YWwgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZUdyb3NzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGFmdGVyRGlzY291bnQgPSBNYXRoLm1heChcbiAgICAgICAgMCxcbiAgICAgICAgbGluZUdyb3NzZXNbaV0gLSAobGluZURpc2NvdW50c1tpXSB8fCAwKSxcbiAgICAgICk7XG4gICAgICBpZiAocHJpY2VzSW5jbHVkZVRheCkge1xuICAgICAgICBjb25zdCBuZXQgPSByYXRlID4gMCA/IGFmdGVyRGlzY291bnQgLyAoMSArIHJhdGUpIDogYWZ0ZXJEaXNjb3VudDtcbiAgICAgICAgc3VtVGF4ICs9IHIyKGFmdGVyRGlzY291bnQgLSBuZXQpO1xuICAgICAgICBzdW1Ub3RhbCArPSByMihhZnRlckRpc2NvdW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHRheCA9IHIyKGFmdGVyRGlzY291bnQgKiByYXRlKTtcbiAgICAgICAgc3VtVGF4ICs9IHRheDtcbiAgICAgICAgc3VtVG90YWwgKz0gcjIoYWZ0ZXJEaXNjb3VudCArIHRheCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRheEFtb3VudCA9IHIyKHN1bVRheCk7XG4gICAgdG90YWwgPSByMihzdW1Ub3RhbCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gVG90YWwgcm91bmRpbmcgbW9kZVxuICAgIGNvbnN0IGFmdGVyRGlzY291bnQgPSBzdWJ0b3RhbCAtIGZpbmFsRGlzY291bnQ7XG4gICAgaWYgKHByaWNlc0luY2x1ZGVUYXgpIHtcbiAgICAgIGNvbnN0IG5ldCA9IHJhdGUgPiAwID8gYWZ0ZXJEaXNjb3VudCAvICgxICsgcmF0ZSkgOiBhZnRlckRpc2NvdW50O1xuICAgICAgdGF4QW1vdW50ID0gcjIoYWZ0ZXJEaXNjb3VudCAtIG5ldCk7XG4gICAgICB0b3RhbCA9IHIyKGFmdGVyRGlzY291bnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXhBbW91bnQgPSByMihhZnRlckRpc2NvdW50ICogcmF0ZSk7XG4gICAgICB0b3RhbCA9IHIyKGFmdGVyRGlzY291bnQgKyB0YXhBbW91bnQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3VidG90YWw6IHIyKHN1YnRvdGFsKSxcbiAgICBkaXNjb3VudEFtb3VudDogcjIoZmluYWxEaXNjb3VudCksXG4gICAgdGF4QW1vdW50LFxuICAgIHRvdGFsLFxuICB9O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsRUFBRSxRQUFRLFNBQVM7QUFDNUIsU0FBUyxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsVUFBVSxRQUFRLGtCQUFrQjtBQUMxRSxTQUFTLFlBQVksUUFBUSx1QkFBdUI7QUFDcEQsU0FBUyxZQUFZLFFBQVEsbUJBQW1CO0FBQ2hELFNBQVMsZ0JBQWdCLFFBQVEsb0JBQW9CO0FBR3JELElBQUk7QUFFSixFQUFFO0FBQ0YsZ0JBQWdCO0FBQ2hCLEVBQUU7QUFFRixTQUFTLFlBQVksQ0FBUztFQUM1QixPQUFPLEVBQUUsVUFBVSxDQUFDLE9BQU8sSUFBSTtBQUNqQztBQUVBLFNBQVMsY0FBYyxDQUFTO0VBQzlCLE1BQU0sSUFBSSxFQUFFLFdBQVcsQ0FBQztFQUN4QixPQUFPLEtBQUssSUFBSSxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUc7QUFDbkM7QUFFQSxTQUFTLFVBQVUsR0FBVztFQUM1QixJQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsS0FBSztJQUNyQyxJQUFJO01BQ0YsS0FBSyxTQUFTLENBQUMsS0FBSztRQUFFLFdBQVc7TUFBSztJQUN4QyxFQUFF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
// denoCacheMetadata=10035131990408022769,3730254557279205487