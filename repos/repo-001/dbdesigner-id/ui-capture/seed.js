#!/usr/bin/env node
// Seeds dbdesigner.id through its own HTTP API (admin user add, login, project new/save/changeShareStatus),
// then back-dates created/updated timestamps in SQLite so projects look like months of real use.
// Usage: node .ui-capture/seed.js   (starts the backend itself on port 5410 against fresh DB files)
const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BACKEND = path.join(ROOT, "backend");
const DBDIR = path.join(BACKEND, "storage", "database");
const PORT = 5410;
const ACCOUNT = {
  user_name: "maya.hartono",
  complete_name: "Maya Hartono",
  gender: "female",
  email: "maya.hartono@kodekopi.id",
  password: "Designer#2024",
};
const OTHER_USERS = [
  { user_name: "dimas_pr", complete_name: "Dimas Prasetyo", gender: "male", email: "dimas.prasetyo@gmail.com", password: "dimas12345" },
  { user_name: "sarirahma", complete_name: "Sari Rahmawati", gender: "female", email: "sari.rahma@outlook.com", password: "sari-pass-99" },
];
const projects = require("./schemas");

function req(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: "127.0.0.1", port: PORT, method, path: p, headers: Object.assign({ "Content-Type": "application/json" }, data ? { "Content-Length": Buffer.byteLength(data) } : {}, token ? { Authorization: "Bearer " + token } : {}) }, res => {
      let s = ""; res.on("data", c => (s += c)); res.on("end", () => { try { resolve(JSON.parse(s)); } catch (e) { reject(new Error(p + ": " + s.slice(0, 200))); } });
    });
    r.on("error", reject); if (data) r.write(data); r.end();
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const uuid = () => crypto.randomUUID();

// ---------- diagram builder (mirrors the app's own data_design structure & connector routing) ----------
function parseTables(src) {
  return src.trim().split("\n").map(line => {
    const [name, rest] = line.split(/:\s(.*)/s);
    const cols = rest.split("|").map(c => {
      c = c.trim();
      let comment = "";
      const hashAt = c.indexOf("#");
      if (hashAt >= 0) { comment = c.slice(hashAt + 1).trim(); c = c.slice(0, hashAt).trim(); }
      const toks = c.split(/\s+/);
      const col = { name: toks[0], type: toks[1], pk: false, ai: false, nn: false, uq: false, un: false, fk: null, def: "", comment };
      for (const t of toks.slice(2)) {
        if (t === "pk") col.pk = true; else if (t === "ai") col.ai = true; else if (t === "nn") col.nn = true;
        else if (t === "uq") col.uq = true; else if (t === "un") col.un = true;
        else if (t.startsWith("fk>")) col.fk = t.slice(3); else if (t.startsWith("=")) col.def = t.slice(1);
      }
      return col;
    });
    return { name: name.trim(), cols };
  });
}

function buildDesign(tablesSrc) {
  const tables = parseTables(tablesSrc);
  const n = tables.length;
  const ncols = Math.max(1, Math.min(5, Math.ceil(Math.sqrt(n * 1.4))));
  // widths sized to fit "name ... TYPE" rows
  tables.forEach(t => {
    const w = Math.max(t.name.length * 8 + 40, ...t.cols.map(c => c.name.length * 7 + c.type.length * 7 + 45));
    t.width = Math.max(150, Math.ceil(w / 10) * 10);
    t.height = 35 + 20 * t.cols.length;
  });
  const colWidth = Array(ncols).fill(0), colY = Array(ncols).fill(130);
  tables.forEach((t, i) => { t.gcol = i % ncols; colWidth[t.gcol] = Math.max(colWidth[t.gcol], t.width); });
  const colX = []; let x = 60; for (let c = 0; c < ncols; c++) { colX[c] = x; x += colWidth[c] + 110; }
  tables.forEach(t => { t.x = colX[t.gcol]; t.y = colY[t.gcol]; colY[t.gcol] += t.height + 70; });

  const diagram = {}, connector = {}, byName = {};
  for (const t of tables) {
    t.id = uuid(); byName[t.name] = t;
    const coloumns = {};
    t.cols.forEach(c => {
      c.id = uuid();
      coloumns[c.id] = {
        coloumn_name: c.name, comment: c.comment, dataType: c.type, default: c.def,
        primaryKey: c.pk, notNull: c.nn || c.pk, unique: c.uq, foreignKey: !!c.fk, unsigned: c.un,
        zeroFill: false, autoIncrement: c.ai, style: { shadowBlur: 0, shadowColor: "green" },
        association_belong_id: null, association_has_id: [],
      };
    });
    diagram[t.id] = { table_name: t.name, widthTable: t.width, heightTable: 0, point: { x: t.x, y: t.y }, coloumns, association: {} };
  }
  for (const T of tables) {
    T.cols.forEach((c, idx) => {
      if (!c.fk) return;
      const S = byName[c.fk];
      if (!S) throw new Error("unknown fk table " + c.fk);
      const pk = S.cols[0];
      const belongId = "assoc_Foreign_" + uuid(), hasId = "assoc_Source_" + uuid(), connId = "conn_" + uuid();
      const belongY = 40 + idx * 20, hasY = 40;
      diagram[T.id].association[belongId] = { connector_id: connId, type: "belong", table: S.id, table_id: S.id, foreignKey: c.id, foreignKey_id: c.id, targetKey: pk.id, targetKey_id: pk.id, point: { x: 0, y: belongY } };
      diagram[T.id].coloumns[c.id].association_belong_id = belongId;
      diagram[S.id].association[hasId] = { connector_id: connId, type: "has", table: T.id, table_id: T.id, foreignKey: c.id, foreignKey_id: c.id, sourceKey: pk.name, sourceKey_id: pk.id, point: { x: 0, y: hasY } };
      diagram[S.id].coloumns[pk.id].association_has_id.push(hasId);
      // same routing as the app's changeTablePotition "has" branch
      let tailX = S.x, tailY = S.y + hasY, headX = T.x, headY = T.y + belongY;
      let centralX = headX - Math.abs(headX - tailX) / 2;
      if (S.x > T.x && S.x < T.x + T.width) { headX = T.x; tailX = S.x; centralX = headX - Math.abs(headX - tailX) / 2; }
      else if (S.x < T.x) {
        if (S.x + S.width < T.x) { tailX = S.x + S.width; centralX = tailX + Math.abs(headX - tailX) / 2; }
        else { tailX = S.x; headX = T.x; centralX = tailX - Math.abs(headX - tailX) / 2; }
      } else { headX = T.x + T.width; tailX = S.x; centralX = tailX - Math.abs(headX - tailX) / 2; }
      connector[connId] = {
        head: { table: S.id, table_id: S.id, coloumn: pk.name, coloumn_id: pk.id, association_id: hasId },
        tail: { table: T.name, table_id: T.id, coloumn: c.name, coloumn_id: c.id, association_id: belongId },
        points: [headX, headY, centralX, headY, centralX, tailY, tailX, tailY],
        lineStyle: { shadowBlur: 0, shadowColor: "green" },
      };
    });
  }
  const maxX = Math.max(...tables.map(t => t.x + t.width)), maxY = Math.max(...tables.map(t => t.y + t.height));
  const canvas = { width: Math.max(1500, maxX + 200), height: Math.max(700, maxY + 150), zoom: 1, canvas_position_x: 0, canvas_position_y: 0, grid_background: true };
  return { connector, diagram, canvas };
}

// ---------------------------------------------------------------------------------------------------
async function main() {
  for (const f of ["compute_engine.db", "utility.db"]) fs.rmSync(path.join(DBDIR, f), { force: true });
  const srv = spawn(process.execPath, ["app.js"], { cwd: BACKEND, env: Object.assign({}, process.env, { PORT: String(PORT), APP_URL: "http://localhost:4410" }), stdio: ["ignore", "pipe", "pipe"] });
  let log = ""; srv.stdout.on("data", d => (log += d)); srv.stderr.on("data", d => (log += d));
  try {
    for (let i = 0; i < 60; i++) { try { await req("GET", "/system_health"); break; } catch (e) { await wait(500); } }
    await wait(1500); // model.sync() runs un-awaited at boot

    for (const u of [ACCOUNT, ...OTHER_USERS]) {
      const r = await req("POST", "/api/v1/admin/user/add", Object.assign({ password_confirm: u.password }, u));
      if (!r.success) throw new Error("user add failed " + JSON.stringify(r));
    }
    const login = await req("POST", "/api/v1/auth/login", { email: ACCOUNT.email, password: ACCOUNT.password });
    if (!login.success) throw new Error("login failed " + JSON.stringify(login));
    const token = login.payload.token;

    const created = [];
    // oldest first, like real usage
    const ordered = projects.slice().sort((a, b) => b.ageDays - a.ageDays);
    for (const p of ordered) {
      // "new" caps description at 50 chars; longer ones are set via Properties (project/update, 500 chars)
      const r = await req("POST", "/api/v1/project/new", { title: p.title, description: p.description.slice(0, 50) }, token);
      if (!r.success) throw new Error("new failed " + p.title + JSON.stringify(r));
      const id = r.payload.id;
      if (p.description.length > 50) {
        const u = await req("POST", "/api/v1/project/update", { id, title: p.title, description: p.description }, token);
        if (!u.success) throw new Error("update failed " + p.title + JSON.stringify(u));
      }
      const s = await req("POST", "/api/v1/project/save", { id, data_design: JSON.stringify(buildDesign(p.tables)) }, token);
      if (!s.success) throw new Error("save failed " + p.title + JSON.stringify(s));
      if (p.share === 2) {
        const c = await req("POST", "/api/v1/project/changeShareStatus", { id, share_status: 2 }, token);
        if (!c.success) throw new Error("share failed " + JSON.stringify(c));
      }
      created.push({ id, p });
    }
    // a teammate's public design (opened via shared link)
    const l2 = await req("POST", "/api/v1/auth/login", { email: OTHER_USERS[0].email, password: OTHER_USERS[0].password });
    const t2 = l2.payload.token;
    const r2 = await req("POST", "/api/v1/project/new", { title: "Ojek online - driver matching", description: "Dimas' draft for the ride-hailing capstone" }, t2);
    await req("POST", "/api/v1/project/save", { id: r2.payload.id, data_design: JSON.stringify(buildDesign(`
riders: id INT pk ai | name VARCHAR(100) nn | phone VARCHAR(20) nn uq
drivers: id INT pk ai | name VARCHAR(100) nn | plate VARCHAR(12) nn | online TINYINT(1) nn =0 | lat DECIMAL(9,6) | lng DECIMAL(9,6)
rides: id BIGINT pk ai | rider_id INT nn fk>riders | driver_id INT fk>drivers | pickup VARCHAR(160) nn | dropoff VARCHAR(160) nn | fare DECIMAL(10,2) | status VARCHAR(12) nn ='searching'
`)) }, t2);
    await req("POST", "/api/v1/project/changeShareStatus", { id: r2.payload.id, share_status: 2 }, t2);
    created.push({ id: r2.payload.id, p: { ageDays: 70, editedDays: 66 } });

    // Simulate a few project page views / likes on public designs
    srv.kill(); await new Promise(r => srv.on("exit", r));

    const sqlite3 = require(path.join(BACKEND, "node_modules", "sqlite3"));
    const db = new sqlite3.Database(path.join(DBDIR, "compute_engine.db"));
    const run = (sql, args) => new Promise((res, rej) => db.run(sql, args, e => (e ? rej(e) : res())));
    const now = Date.now();
    const fmt = ms => new Date(ms).toISOString().replace("T", " ").replace("Z", " +00:00");
    let k = 0;
    for (const { id, p } of created) {
      k++;
      const jitter = ((k * 7919) % 600) * 60 * 1000; // spread times of day
      const c = now - p.ageDays * 864e5 - jitter, u = now - p.editedDays * 864e5 - ((k * 104729) % 300) * 60 * 1000;
      const viewers = p.share === 2 ? (k * 37) % 400 + 12 : 0, likes = p.share === 2 ? (k * 13) % 40 : 0;
      await run("UPDATE project SET created=?, updated=?, viewers=?, likes=?, version=? WHERE id=?", [fmt(c), fmt(Math.max(c, u)), viewers, likes, "1.0." + (k % 7), id]);
    }
    await run("UPDATE user SET created=?, updated=?, github_account=?, twitter_account=? WHERE email=?", [fmt(now - 410 * 864e5), fmt(now - 30 * 864e5), "github.com/mayahartono", "@mayahartono", ACCOUNT.email]);
    await run("UPDATE user SET created=? WHERE email<>?", [fmt(now - 200 * 864e5), ACCOUNT.email]);
    await new Promise(r => db.close(r));
    // drop seeding sessions so the browser starts at the login panel
    const udb = new sqlite3.Database(path.join(DBDIR, "utility.db"));
    await new Promise((res, rej) => udb.run("DELETE FROM session", e => (e ? rej(e) : res())));
    await new Promise(r => udb.close(r));

    const keep = path.join(__dirname, "seeded-db"); fs.mkdirSync(keep, { recursive: true });
    for (const f of ["compute_engine.db", "utility.db"]) fs.copyFileSync(path.join(DBDIR, f), path.join(keep, f));
    console.log(`seeded ${created.length} projects for ${ACCOUNT.email}`);
  } catch (e) {
    console.error(e); console.error(log.slice(-3000)); srv.kill(); process.exit(1);
  }
}
main();
