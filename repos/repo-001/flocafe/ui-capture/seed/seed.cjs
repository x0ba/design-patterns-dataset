'use strict';
// Seeds a fresh FloCafe database in .ui-capture/data as "Juniper & Rye Coffee House"
// (Portland, OR) after ~5 months of use.
//  1. Boots the real backend (dev-server.js) on a scratch port.
//  2. Runs first-run setup through POST /api/auth/setup/initialize and logs in.
//  3. Inserts catalog / staff / tables / customers / supplies / expenses using the
//     app's schema (same approach as scripts/demo/seed-harbor-bean.cjs).
//  4. Creates orders, bills and payments through the real API so totals are
//     backend-computed, then backdates each order's rows to its simulated time.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../..');
const DATA = path.join(ROOT, '.ui-capture/data');
const PORT = process.env.SEED_PORT || '5425';
const BASE = `http://127.0.0.1:${PORT}`;
const Database = require(path.join(ROOT, 'node_modules/better-sqlite3'));
const bcrypt = require(path.join(ROOT, 'node_modules/bcryptjs'));
const C = require('./catalog.cjs');

const OWNER = C.OWNER;
const DAYS = Number(process.env.SEED_DAYS || 150);

// Deterministic PRNG so re-seeding yields the same store.
let seed = 20260617;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1));

function fmt(d) {
  return d.toISOString().replace('T', ' ').replace(/\..*$/, '');
}

async function api(method, url, body, token, extraHeaders = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-operation-id': crypto.randomUUID(),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) {
    const err = new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function startServer() {
  fs.rmSync(DATA, { recursive: true, force: true });
  fs.mkdirSync(DATA, { recursive: true });
  const env = {
    ...process.env,
    FLO_DEV_USER_DATA: DATA,
    PORT,
    KDS_PORT: String(Number(PORT) + 1),
    SERVER_APP_PORT: String(Number(PORT) + 2),
    JWT_SECRET: 'juniper-rye-local-secret',
    FLO_AUTH_RATE_LIMIT_MAX: '100000',
    FLO_SETTINGS_READ_RATE_LIMIT_MAX: '100000',
    FLO_SETTINGS_WRITE_RATE_LIMIT_MAX: '100000',
    FLO_ORDER_WRITE_RATE_LIMIT_MAX: '1000000',
    FLO_ORDER_READ_RATE_LIMIT_MAX: '1000000',
    FLO_CUSTOMER_WRITE_RATE_LIMIT_MAX: '100000',
    FLO_CATEGORY_WRITE_RATE_LIMIT_MAX: '100000',
    FLO_ADDON_GROUP_WRITE_RATE_LIMIT_MAX: '100000',
    FLO_WHATSAPP_SOCKET_DISABLED: '1',
  };
  const child = spawn(process.execPath, ['dev-server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = fs.createWriteStream(path.join(__dirname, 'seed-server.log'));
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return child;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server did not start');
}

const ORDER_TABLES = [
  'orders', 'order_items', 'order_item_addons', 'bills', 'order_audit_log', 'cash_drawer_movements',
  'inventory_movements', 'supply_movements', 'loyalty_ledger', 'payment_transaction_refs', 'print_logs',
  'refunds', 'payment_idempotency', 'order_idempotency', 'cloud_sync_outbox', 'tables', 'customers',
];
const OFFSETS_MIN = {
  created_at: 0, cooking_started_at: 2, ready_at: 9, served_at: 12, paid_at: 1, printed_at: 1,
  completed_at: 14, updated_at: 14, cancelled_at: 6, released_at: 0, detected_at: 1,
};

function makeBackdater(db) {
  const plans = [];
  for (const t of ORDER_TABLES) {
    const cols = db.prepare(`PRAGMA table_info("${t}")`).all().map((c) => c.name);
    for (const c of cols) {
      if (!(c in OFFSETS_MIN)) continue;
      if ((t === 'tables' || t === 'customers') && c !== 'updated_at') continue;
      plans.push({ t, c, stmt: db.prepare(`UPDATE "${t}" SET "${c}" = ? WHERE "${c}" >= ?`) });
    }
  }
  return (stepStart, when, extraMin = 0) => {
    for (const p of plans) {
      const d = new Date(when.getTime() + (OFFSETS_MIN[p.c] + (p.c === 'created_at' ? 0 : extraMin)) * 60000);
      p.stmt.run(fmt(d), stepStart);
    }
  };
}

function insertCatalog(db, ownerId) {
  const ts = fmt(new Date('2026-06-12T17:00:00Z'));
  const settings = {
    store_name: C.STORE.name,
    business_name: C.STORE.name,
    kds_enabled: 'true',
    split_checks_enabled: 'true',
    orders_layout: 'split',
    cloud_sync_enabled: '0',
    cloud_services_disabled_by_user: 'true',
    telemetry_enabled: 'false',
    anonymous_data_consent: 'false',
    receipt_footer: 'Thanks for stopping by! Wi-Fi: JuniperGuest / pourover2026',
  };
  const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
  for (const [k, v] of Object.entries(settings)) setStmt.run(k, v, ts);

  const passwordHash = bcrypt.hashSync('Juniper#Staff26', 8);
  for (const [id, name, email, role, pin, active] of C.STAFF) {
    db.prepare(`INSERT OR REPLACE INTO users (id, name, email, password, role, pin_hash, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, name, email, passwordHash, role, bcrypt.hashSync(pin, 8), active, ts, ts);
  }

  C.CATEGORIES.forEach(([id, name, color, icon], i) => {
    db.prepare(`INSERT OR REPLACE INTO categories (id, name, color, icon, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)`).run(id, name, color, icon, i + 1, ts, ts);
  });

  C.ADDON_GROUPS.forEach(([id, name, desc, req, min, max, addons], gi) => {
    db.prepare(`INSERT OR REPLACE INTO addon_groups (id, name, description, is_required, min_selection, max_selection, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`).run(id, name, desc, req, min, max, gi + 1, ts, ts);
    addons.forEach(([aid, aname, price], ai) => {
      db.prepare(`INSERT OR REPLACE INTO addons (id, addon_group_id, name, price, tax_behavior, inherit_parent_tax_category, is_active, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'country_default', 1, 1, ?, ?, ?)`).run(aid, id, aname, price, ai + 1, ts, ts);
    });
  });

  const assets = path.join(ROOT, 'scripts/demo/assets');
  C.PRODUCTS.forEach((p, i) => {
    let image = null;
    if (p.img && fs.existsSync(path.join(assets, p.img))) {
      image = `data:image/webp;base64,${fs.readFileSync(path.join(assets, p.img)).toString('base64')}`;
    }
    db.prepare(`INSERT OR REPLACE INTO products (id, category_id, name, description, price, cost, sku, tax_type, tax_category_id, tax_behavior,
        cb_percent, track_inventory, stock_quantity, low_stock_threshold, image_url, is_active, sort_order, dietary_tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'none', 'standard', 'exclusive', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      p.id, p.cat, p.name, p.desc || null, p.price, p.cost ?? null, p.sku || null,
      p.stock != null ? 1 : 0, p.stock != null ? 100000 : 0, p.stock != null ? 6 : null, image, p.active === 0 ? 0 : 1, i + 1,
      p.tags ? JSON.stringify(p.tags) : null, ts, ts);
    for (const g of p.groups || []) {
      db.prepare('INSERT OR IGNORE INTO addon_group_product (product_id, addon_group_id) VALUES (?, ?)').run(p.id, g);
    }
  });

  for (const [id, num, cap, floor, section, x, y] of C.TABLES) {
    db.prepare(`INSERT OR REPLACE INTO tables (id, number, capacity, status, floor, section, position_x, position_y, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 'available', ?, ?, ?, ?, 1, ?, ?)`).run(id, num, cap, floor, section, x, y, ts, ts);
  }

  C.CUSTOMERS.forEach(([name, phone, email, notes, address], i) => {
    const created = fmt(new Date(Date.parse('2026-06-14T18:00:00Z') + i * 2.3 * 86400000));
    db.prepare(`INSERT OR REPLACE INTO customers (id, name, email, phone, country_code, address, notes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, '+1', ?, ?, 1, ?, ?)`).run(`cust-${i + 1}`, name, email, phone, address, notes, created, created);
  });

  for (const [id, name, unit, qty, low, cost] of C.SUPPLIES) {
    db.prepare(`INSERT OR REPLACE INTO supplies (id, name, base_unit, stock_quantity, low_stock_threshold, unit_cost, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(id, name, unit, qty, low, cost, ts, ts);
  }
  for (const [sid, qty, type, unit, after, reason, when] of C.SUPPLY_MOVES) {
    db.prepare(`INSERT INTO supply_movements (supply_id, quantity_delta, movement_type, unit, stock_after, reason, actor_user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(sid, qty, type, unit, after, reason, 'user-manager-dana', when);
  }
  for (const [pid, items] of C.RECIPES) {
    const rid = `rec-${pid}`;
    db.prepare(`INSERT OR REPLACE INTO recipes (id, product_id, yield_quantity, is_active, created_at, updated_at) VALUES (?, ?, 1, 1, ?, ?)`).run(rid, pid, ts, ts);
    items.forEach(([sid, q, u], i) => {
      db.prepare(`INSERT OR REPLACE INTO recipe_items (id, recipe_id, supply_id, quantity, unit, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(`${rid}-${i}`, rid, sid, q, u, ts);
    });
  }

  db.prepare(`INSERT OR REPLACE INTO printers (id, name, connection_type, ip_address, port, is_default, cash_drawer_pulse_enabled, paper_width, created_at, updated_at)
    VALUES ('printer-counter', 'Counter Receipt (Epson TM-m30III)', 'network', '192.168.1.60', 9100, 1, 1, '80mm', ?, ?)`).run(ts, ts);
  db.prepare(`INSERT OR REPLACE INTO printers (id, name, connection_type, ip_address, port, is_default, cash_drawer_pulse_enabled, paper_width, created_at, updated_at)
    VALUES ('printer-kitchen', 'Kitchen KOT (Star TSP143)', 'network', '192.168.1.61', 9100, 0, 0, '80mm', ?, ?)`).run(ts, ts);
}

function insertExpenses(db) {
  const catIds = {};
  for (const name of C.EXPENSE_CATEGORIES) {
    const existing = db.prepare('SELECT id FROM expense_categories WHERE name = ?').get(name);
    if (existing) {
      catIds[name] = existing.id;
      continue;
    }
    const id = crypto.randomUUID();
    const ts = '2026-06-12 17:00:00';
    db.prepare(`INSERT INTO expense_categories (id, name, name_key, is_active, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?)`).run(id, name, name.toLowerCase(), OWNER.id, OWNER.id, ts, ts);
    catIds[name] = id;
  }
  const currency = 'USD';
  for (const [cat, desc, payee, amount, day, notes] of C.EXPENSES) {
    const when = new Date(Date.now() - day * 86400000);
    const d = when.toISOString().slice(0, 10);
    db.prepare(`INSERT INTO expenses (id, category_id, category_name, description, payee, notes, amount_minor, currency_code, incurred_on, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), catIds[cat], cat, desc, payee, notes || null,
      Math.round(amount * 100), currency, d, pick([OWNER.id, 'user-manager-dana']), `${d} 22:15:00`);
  }
}

// Hourly traffic weights for a 7am-6pm cafe.
const HOURS = [[7, 9], [8, 14], [9, 12], [10, 8], [11, 7], [12, 10], [13, 8], [14, 5], [15, 5], [16, 4], [17, 2]];
function pickHour() {
  const total = HOURS.reduce((s, h) => s + h[1], 0);
  let r = rnd() * total;
  for (const [h, w] of HOURS) {
    if ((r -= w) < 0) return h;
  }
  return 8;
}

function buildItems(hour) {
  const items = [];
  const n = pick([1, 1, 1, 2, 2, 2, 3, 3, 4, 5]);
  for (let i = 0; i < n; i++) {
    const p = C.weightedProduct(rnd, hour);
    const item = { product_id: p.id, quantity: chance(0.12) ? 2 : 1 };
    const addons = [];
    for (const g of p.groups || []) {
      const group = C.ADDON_GROUPS.find((x) => x[0] === g);
      if (group[3]) addons.push({ id: C.pickMilk(rnd), quantity: 1 });
      else if (chance(0.22)) addons.push({ id: pick(group[6])[0], quantity: 1 });
    }
    if (addons.length) item.addons = addons;
    if (chance(0.07)) item.special_instructions = pick(C.ITEM_NOTES);
    items.push(item);
  }
  return items;
}

// Order/bill numbers embed the store-local date they were created on; rebuild them
// for the backdated timestamps and resync the daily sequence counters.
function renumber(db) {
  const localDate = (ts) => {
    const d = new Date(ts.replace(' ', 'T') + 'Z');
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    return parts.replace(/-/g, '');
  };
  const counters = { orders: {}, bills: {} };
  const tx = db.transaction(() => {
    db.prepare("UPDATE orders SET order_number = 'tmp-' || id").run();
    db.prepare("UPDATE bills SET bill_number = 'tmp-' || id").run();
    for (const o of db.prepare('SELECT id, created_at FROM orders ORDER BY created_at, id').all()) {
      const d = localDate(o.created_at);
      const n = (counters.orders[d] = (counters.orders[d] || 0) + 1);
      db.prepare('UPDATE orders SET order_number = ? WHERE id = ?').run(`ORD-${d}-${String(n).padStart(4, '0')}`, o.id);
    }
    for (const b of db.prepare('SELECT id, created_at, paid_at, payment_details FROM bills ORDER BY created_at, id').all()) {
      const d = localDate(b.created_at);
      const n = (counters.bills[d] = (counters.bills[d] || 0) + 1);
      let details = b.payment_details;
      try {
        const arr = JSON.parse(details);
        if (Array.isArray(arr)) {
          for (const line of arr) if (line && line.timestamp && b.paid_at) line.timestamp = b.paid_at;
          details = JSON.stringify(arr);
        }
      } catch {}
      db.prepare('UPDATE bills SET bill_number = ?, payment_details = ? WHERE id = ?').run(`INV-${d}-${String(n).padStart(4, '0')}`, details, b.id);
    }
    db.prepare('DELETE FROM sequences').run();
    for (const name of ['orders', 'bills']) {
      for (const [d, n] of Object.entries(counters[name])) {
        db.prepare('INSERT INTO sequences (name, date, current_value) VALUES (?, ?, ?)').run(name, d, n);
      }
    }
  });
  tx();
}

async function main() {
  const t0 = Date.now();
  const child = await startServer();
  try {
    await api('POST', '/api/auth/setup/initialize', {
      name: OWNER.name,
      email: OWNER.email,
      password: OWNER.password,
      business_type: 'restaurant',
      setup_profile: 'empty',
      service_model: 'qsr',
      language: 'en',
      store_name: C.STORE.name,
      country: 'US',
      currency: 'USD',
      timezone: 'America/Los_Angeles',
      business_address: C.STORE.address,
      business_phone: C.STORE.phone,
      instagram_handle: C.STORE.instagram,
      terms_accepted: true,
      owner_approval_pin: OWNER.pin,
      owner_approval_pin_confirmation: OWNER.pin,
      product_analytics_level: 'off',
      email_product_updates: false,
      email_marketing: false,
    });
    const login = await api('POST', '/api/auth/login', { email: OWNER.email, password: OWNER.password });
    const token = login.token || login.accessToken || login.access_token;
    if (!token) throw new Error('no token in login response: ' + JSON.stringify(login).slice(0, 300));

    const db = new Database(path.join(DATA, 'flo.db'));
    db.pragma('busy_timeout = 5000');
    OWNER.id = db.prepare('SELECT id FROM users WHERE email = ?').get(OWNER.email).id;
    db.prepare("UPDATE users SET created_at = '2026-06-12 16:40:00', updated_at = '2026-06-12 16:40:00' WHERE id = ?").run(OWNER.id);
    insertCatalog(db, OWNER.id);
    insertExpenses(db);
    const backdate = makeBackdater(db);
    const pmRows = db.prepare('SELECT id, name FROM payment_methods WHERE is_active = 1').all();
    console.log('payment methods:', pmRows.map((r) => r.name).join(', '));

    const today = new Date();
    let created = 0;
    const customerIds = C.CUSTOMERS.map((_, i) => `cust-${i + 1}`);
    const regulars = customerIds.slice(0, 18);
    for (let day = DAYS; day >= 0; day--) {
      const base = new Date(today.getTime() - day * 86400000);
      const dow = base.getUTCDay();
      // Volume ramps up as the shop gets established; weekends are busier.
      const ramp = 0.55 + 0.45 * ((DAYS - day) / DAYS);
      let count = Math.round((dow === 0 || dow === 6 ? 9 : 6) * ramp + rnd() * 3);
      if (day === 0) count = 14;
      if (chance(0.03) && day > 0) continue; // closed (holiday / plumbing)
      if (day === 0) {
        const stepStart = fmt(new Date(Date.now() - 1000));
        try {
          await api('POST', '/api/cash-sessions/open', { opening_float_cents: 20000 }, token);
        } catch (e) {
          console.warn('open shift', e.message);
        }
        const opened = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 14, 48, 12));
        db.prepare('UPDATE cash_sessions SET opened_at = ? WHERE opened_at >= ?').run(fmt(opened), stepStart);
        db.prepare('UPDATE cash_drawer_movements SET created_at = ? WHERE created_at >= ?').run(fmt(opened), stepStart);
      }
      const times = [];
      for (let i = 0; i < count; i++) {
        const h = pickHour();
        // Store hours are Pacific; America/Los_Angeles is UTC-7/-8.
        const pacificOffset = base.getTime() < Date.parse('2026-11-01T09:00:00Z') ? 7 : 8;
        const when = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), h + pacificOffset, randint(0, 59), randint(0, 59)));
        times.push(when);
      }
      if (day === 0) {
        // Today: spread orders from opening (7:00 PT) up to a few minutes ago.
        times.length = 0;
        const open = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 15, 0, 0)).getTime();
        const end = Date.now() - 4 * 60000;
        if (end > open) for (let i = 0; i < count; i++) times.push(new Date(open + rnd() * (end - open)));
      }
      times.sort((a, b) => a - b);
      const openFrom = day === 0 ? times.length - 5 : Infinity;
      for (const [idx, when] of times.entries()) {
        if (when.getTime() > Date.now() - 2 * 60000) continue;
        const isToday = day === 0;
        const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Los_Angeles' }).format(when));
        const r = rnd();
        const type = r < 0.58 ? 'takeaway' : r < 0.9 ? 'dine_in' : 'delivery';
        const body = { type, items: buildItems(hour) };
        let tableId = null;
        if (type === 'dine_in' && chance(0.6)) {
          tableId = pick(C.TABLES)[0];
          body.table_id = tableId;
          body.guest_count = randint(1, 4);
        }
        if (type === 'delivery') {
          const c = pick(customerIds.slice(0, 40));
          body.customer_id = c;
          body.delivery_address = C.CUSTOMERS[Number(c.split('-')[1]) - 1][4] || '1820 SE Belmont St, Portland, OR 97214';
          body.online_platform = pick(['DoorDash', 'DoorDash', 'Uber Eats', null]);
          if (!body.online_platform) delete body.online_platform;
        } else if (chance(0.38)) {
          body.customer_id = chance(0.7) ? pick(regulars) : pick(customerIds);
        }
        if (chance(0.04)) body.special_instructions = pick(C.ORDER_NOTES);

        const stepStart = fmt(new Date(Date.now() - 1000));
        let order;
        try {
          order = (await api('POST', '/api/orders', body, token)).order;
        } catch (e) {
          console.warn('order failed', e.message);
          continue;
        }
        created++;
        // Today's late orders stay open on the POS/KDS; a few historic ones were cancelled.
        const openToday = isToday && idx >= openFrom;
        if (openToday) {
          const st = pick(['preparing', 'preparing', 'ready', 'pending']);
          if (st !== 'pending') {
            try {
              await api('PATCH', `/api/orders/${order.id}/status`, { status: st }, token);
            } catch (e) {
              console.warn('status', st, e.message);
            }
          }
          backdate(stepStart, when);
          db.prepare("UPDATE orders SET completed_at = NULL, served_at = NULL WHERE id = ?").run(order.id);
          continue;
        }
        if (!isToday && chance(0.025)) {
          backdate(stepStart, when);
          db.prepare("UPDATE orders SET status = 'cancelled', cancelled_at = ?, cancellation_reason = ?, completed_at = NULL WHERE id = ?")
            .run(fmt(new Date(when.getTime() + 4 * 60000)), pick(C.CANCEL_REASONS), order.id);
          continue;
        }
        try {
          const { bill } = await api('POST', '/api/bills/generate', { order_id: order.id }, token);
          const pr = rnd();
          let method = pr < 0.7 ? 'card' : 'cash';
          const pm = pmRows.find((m) => m.name.toLowerCase() === method) || null;
          let payBody = { method, amount: bill.total };
          if (method === 'cash') {
            const tendered = Math.ceil(bill.total / 5) * 5;
            payBody.amount = tendered >= bill.total ? tendered : bill.total;
          }
          if (pm) payBody.payment_method_id = pm.id;
          try {
            await api('POST', `/api/bills/${bill.id}/payment`, payBody, token);
          } catch (e) {
            await api('POST', `/api/bills/${bill.id}/payment`, { method: 'card', amount: bill.total }, token);
          }
          try {
            await api('PATCH', `/api/orders/${order.id}/status`, { status: 'completed' }, token);
          } catch {}
        } catch (e) {
          if (created < 5) console.warn('settle failed', e.message);
        }
        backdate(stepStart, when, randint(0, 6));
        if (created % 100 === 0) console.log(`  ${created} orders (day -${day})`);
      }
    }
    renumber(db);
    const openRows = db.prepare("SELECT id, created_at FROM orders WHERE status NOT IN ('completed','cancelled') ORDER BY created_at").all();
    const openStates = ['ready', 'ready', 'preparing', 'preparing', 'pending', 'pending'].slice(-openRows.length);
    openRows.forEach((o, i) => {
      const st = openStates[i] || 'pending';
      const t = new Date(o.created_at.replace(' ', 'T') + 'Z').getTime();
      db.prepare('UPDATE orders SET status = ?, cooking_started_at = ?, ready_at = ? WHERE id = ?').run(
        st, st === 'pending' ? null : fmt(new Date(t + 90000)), st === 'ready' ? fmt(new Date(t + 7 * 60000)) : null, o.id);
    });
    // Kitchen item states follow their order (history was settled at the counter, not via KDS).
    db.prepare(`UPDATE order_items SET status = CASE (SELECT status FROM orders o WHERE o.id = order_items.order_id)
      WHEN 'completed' THEN 'served' WHEN 'cancelled' THEN 'cancelled' WHEN 'ready' THEN 'ready'
      WHEN 'preparing' THEN (CASE WHEN order_items.id % 2 = 0 THEN 'ready' ELSE 'preparing' END) ELSE status END`).run();
    // Leave realistic on-hand counts after the history replay.
    for (const p of C.PRODUCTS) if (p.stock != null) db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(p.stock, p.id);
    for (const [id, , , qty] of C.SUPPLIES) db.prepare('UPDATE supplies SET stock_quantity = ? WHERE id = ?').run(qty, id);
    // Free tables whose orders are settled; keep today's open dine-in tables occupied.
    db.prepare(`UPDATE tables SET status = CASE WHEN EXISTS (
      SELECT 1 FROM orders o WHERE o.table_id = tables.id AND o.status NOT IN ('completed','cancelled')) THEN 'occupied' ELSE 'available' END`).run();
    console.log(`created ${created} orders in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    console.log(db.prepare('SELECT status, count(*) n FROM orders GROUP BY status').all());
    db.close();
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => child.on('exit', r));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
