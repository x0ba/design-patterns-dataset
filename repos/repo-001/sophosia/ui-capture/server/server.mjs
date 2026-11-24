// Local host for the Sophosia web UI.
// - serves the Quasar production build (dist/spa)
// - injects bridge.js, which emulates the Tauri v1 IPC in the browser
// - implements the Tauri commands the app uses (fs, path, os, app, http,
//   plugin:sql via better-sqlite3 with FTS5, plugin:fs-extra) against a real
//   folder on disk, exposed to the app under the virtual home /home/dana
// - stubs the few outside services the browser calls directly
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { stubResponse } from "./stubs.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPTURE = path.resolve(HERE, "..");
const REPO = path.resolve(CAPTURE, "..");
const DIST = process.env.DIST_DIR || path.join(REPO, "dist", "spa");
const DATA = process.env.DATA_DIR || path.join(CAPTURE, "data");
const PORT = Number(process.env.PORT || 4484);

export const VHOME = "/home/dana";
const ROOTS = [
  [VHOME, path.join(DATA, "home")],
  ["/tmp", path.join(DATA, "tmp")],
  ["/usr/lib/sophosia", path.join(DATA, "resource")],
];
for (const [, real] of ROOTS) fs.mkdirSync(real, { recursive: true });

const P = path.posix;
const BASE = {
  1: `${VHOME}/Music`,
  2: `${VHOME}/.cache`,
  3: `${VHOME}/.config`,
  4: `${VHOME}/.local/share`,
  5: `${VHOME}/.local/share`,
  6: `${VHOME}/Desktop`,
  7: `${VHOME}/Documents`,
  8: `${VHOME}/Downloads`,
  9: `${VHOME}/.local/bin`,
  10: `${VHOME}/.local/share/fonts`,
  11: VHOME,
  12: `${VHOME}/Pictures`,
  13: `${VHOME}/Public`,
  14: `/tmp/runtime-dana`,
  15: `${VHOME}/Templates`,
  16: `${VHOME}/Videos`,
  17: `/usr/lib/sophosia`,
  18: `${VHOME}/.config/sophosia`,
  19: `${VHOME}/.config/sophosia/logs`,
  20: `/tmp`,
  21: `${VHOME}/.config/sophosia`,
  22: `${VHOME}/.local/share/sophosia`,
  23: `${VHOME}/.local/share/sophosia`,
  24: `${VHOME}/.cache/sophosia`,
  25: `${VHOME}/.local/share/sophosia/logs`,
};

function withDir(p, dir) {
  if (dir === undefined || dir === null) return p;
  const base = BASE[dir];
  if (!base) throw `unsupported base directory ${dir}`;
  return p ? P.join(base, p) : base;
}

function toReal(vpath) {
  const v = P.resolve("/", String(vpath));
  for (const [vroot, real] of ROOTS) {
    if (v === vroot) return real;
    if (v.startsWith(vroot + "/")) return path.join(real, v.slice(vroot.length + 1));
  }
  throw `path not allowed on the current scope: ${vpath}`;
}

function toVirtual(realPath) {
  for (const [vroot, real] of ROOTS) {
    if (realPath === real) return vroot;
    if (realPath.startsWith(real + path.sep))
      return P.join(vroot, realPath.slice(real.length + 1).split(path.sep).join("/"));
  }
  return realPath;
}

function osError(e) {
  if (e && e.code === "ENOENT") return "No such file or directory (os error 2)";
  if (e && e.code === "EEXIST") return "File exists (os error 17)";
  if (e && e.code === "ENOTEMPTY") return "Directory not empty (os error 39)";
  if (typeof e === "string") return e;
  return String((e && e.message) || e);
}

async function readDirRec(real, recursive) {
  const entries = await fsp.readdir(real, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const out = [];
  for (const ent of entries) {
    const full = path.join(real, ent.name);
    const item = { path: toVirtual(full), name: ent.name };
    if (ent.isDirectory()) item.children = recursive ? await readDirRec(full, true) : undefined;
    if (ent.isDirectory() && !recursive) item.children = [];
    out.push(item);
  }
  return out;
}

async function fsCommand(m) {
  const opts = m.options || {};
  switch (m.cmd) {
    case "readTextFile":
      return await fsp.readFile(toReal(withDir(m.path, opts.dir)), "utf8");
    case "readFile":
      return Array.from(await fsp.readFile(toReal(withDir(m.path, opts.dir))));
    case "writeFile": {
      const real = toReal(withDir(m.path, opts.dir));
      const buf = Buffer.from(Array.isArray(m.contents) ? m.contents : Object.values(m.contents || {}));
      if (opts.append) await fsp.appendFile(real, buf);
      else await fsp.writeFile(real, buf);
      return null;
    }
    case "readDir":
      return await readDirRec(toReal(withDir(m.path, opts.dir)), !!opts.recursive);
    case "createDir":
      await fsp.mkdir(toReal(withDir(m.path, opts.dir)), { recursive: !!opts.recursive });
      return null;
    case "removeDir":
      await fsp.rm(toReal(withDir(m.path, opts.dir)), { recursive: !!opts.recursive });
      return null;
    case "removeFile":
      await fsp.unlink(toReal(withDir(m.path, opts.dir)));
      return null;
    case "copyFile":
      await fsp.copyFile(toReal(withDir(m.source, opts.dir)), toReal(withDir(m.destination, opts.dir)));
      return null;
    case "renameFile":
      await fsp.rename(toReal(withDir(m.oldPath, opts.dir)), toReal(withDir(m.newPath, opts.dir)));
      return null;
    case "exists":
      try {
        await fsp.access(toReal(withDir(m.path, opts.dir)));
        return true;
      } catch {
        return false;
      }
  }
  throw `unsupported Fs command ${m.cmd}`;
}

function pathCommand(m) {
  switch (m.cmd) {
    case "resolvePath":
      return withDir(m.path || "", m.directory);
    case "resolve":
      return P.resolve("/", ...(m.paths || []));
    case "normalize":
      return P.normalize(m.path);
    case "join":
      return P.join(...(m.paths || []));
    case "dirname":
      return P.dirname(m.path);
    case "extname": {
      const ext = P.extname(m.path);
      if (!ext || ext === ".") throw "Couldn't get the extension of the file";
      return ext.slice(1);
    }
    case "basename": {
      let b = P.basename(m.path);
      if (m.ext && b.endsWith(m.ext)) b = b.slice(0, -m.ext.length);
      return b;
    }
    case "isAbsolute":
      return P.isAbsolute(m.path);
  }
  throw `unsupported Path command ${m.cmd}`;
}

function osCommand(m) {
  switch (m.cmd) {
    case "platform":
      return "linux";
    case "osType":
      return "Linux";
    case "version":
      return "6.8.0-48-generic";
    case "arch":
      return "x86_64";
    case "tempdir":
      return "/tmp";
    case "locale":
      return "en-US";
  }
  return null;
}

function appCommand(m) {
  switch (m.cmd) {
    case "getAppVersion":
      return "0.18.2";
    case "getAppName":
      return "Sophosia";
    case "getTauriVersion":
      return "1.6.0";
  }
  return null;
}

async function httpCommand(m) {
  if (m.cmd === "createClient") return 1;
  if (m.cmd === "dropClient") return null;
  if (m.cmd === "httpRequest") {
    const url = m.options && m.options.url;
    const r = await stubResponse(url);
    let data = r.body;
    const rt = m.options.responseType; // 1 JSON, 2 Text, 3 Binary
    if (rt === 3) data = Array.from(Buffer.from(String(r.body || "")));
    else if (rt === 1) {
      try {
        data = JSON.parse(r.body);
      } catch {
        data = r.body;
      }
    }
    return {
      url,
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      headers: { "content-type": r.type },
      rawHeaders: { "content-type": [r.type] },
      data,
    };
  }
  return null;
}

// ---------- sqlite (tauri-plugin-sql semantics) ----------
const dbs = new Map();
function openDb(name) {
  const file = String(name).replace(/^sqlite:/, "");
  if (!dbs.has(file)) {
    const dir = toReal(BASE[21]);
    fs.mkdirSync(dir, { recursive: true });
    dbs.set(file, new Database(path.join(dir, file)));
  }
  return dbs.get(file);
}
function bindParams(query, values) {
  const params = {};
  (values || []).forEach((v, i) => {
    let val = v;
    if (val === undefined) val = null;
    else if (typeof val === "boolean") val = val ? 1 : 0;
    else if (val !== null && typeof val === "object") val = JSON.stringify(val);
    params["p" + (i + 1)] = val;
  });
  // rewrite $1-style placeholders to named ones, leaving string literals alone
  const sql = query
    .split(/('(?:[^']|'')*')/)
    .map((part) => (part.startsWith("'") ? part : part.replace(/\$(\d+)/g, (_, n) => "@p" + n)))
    .join("");
  // only pass the params the statement actually references
  const used = {};
  for (const mm of sql.matchAll(/@p(\d+)/g)) used["p" + mm[1]] = params["p" + mm[1]] ?? null;
  return { sql, params: used };
}
function sqlCommand(cmd, args) {
  switch (cmd) {
    case "plugin:sql|load":
      openDb(args.db);
      return args.db;
    case "plugin:sql|execute": {
      const db = openDb(args.db);
      const { sql, params } = bindParams(args.query, args.values);
      const stmt = db.prepare(sql);
      if (stmt.reader) {
        stmt.all(params);
        return [0, 0];
      }
      const info = stmt.run(params);
      return [info.changes, Number(info.lastInsertRowid || 0)];
    }
    case "plugin:sql|select": {
      const db = openDb(args.db);
      const { sql, params } = bindParams(args.query, args.values);
      const stmt = db.prepare(sql);
      if (!stmt.reader) {
        stmt.run(params);
        return [];
      }
      return stmt.all(params);
    }
    case "plugin:sql|close":
      return true;
  }
}

async function fsExtra(cmd, args) {
  if (cmd === "plugin:fs-extra|exists") {
    try {
      await fsp.access(toReal(args.path));
      return true;
    } catch {
      return false;
    }
  }
  const st = await fsp.stat(toReal(args.path));
  const created = Math.min(st.birthtimeMs || st.mtimeMs, st.mtimeMs);
  return {
    accessedAtMs: st.atimeMs,
    createdAtMs: created,
    modifiedAtMs: st.mtimeMs,
    isDir: st.isDirectory(),
    isFile: st.isFile(),
    isSymlink: st.isSymbolicLink(),
    size: st.size,
    permissions: { readonly: false, mode: st.mode },
    dev: st.dev,
    ino: st.ino,
    mode: st.mode,
    nlink: st.nlink,
    uid: st.uid,
    gid: st.gid,
    rdev: st.rdev,
    blksize: st.blksize,
    blocks: st.blocks,
  };
}

async function ipc(cmd, args) {
  if (cmd === "tauri") {
    const m = args.message || {};
    switch (args.__tauriModule) {
      case "Fs":
        return await fsCommand(m);
      case "Path":
        return pathCommand(m);
      case "Os":
        return osCommand(m);
      case "App":
        return appCommand(m);
      case "Http":
        return await httpCommand(m);
    }
    return null;
  }
  if (cmd.startsWith("plugin:sql|")) return sqlCommand(cmd, args);
  if (cmd.startsWith("plugin:fs-extra|")) return await fsExtra(cmd, args);
  return null;
}

// ---------- static serving ----------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".pdf": "application/pdf",
  ".map": "application/json",
  ".bcmap": "application/octet-stream",
  ".ftl": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".excalidraw": "application/json",
};

const FONT_DIR = path.join(HERE, "node_modules", "@fontsource-variable", "dm-sans");
const bridgeJs = fs.readFileSync(path.join(HERE, "bridge.js"));

async function serveFile(res, real, req) {
  const st = await fsp.stat(real);
  const type = MIME[path.extname(real).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : st.size - 1;
    res.writeHead(206, {
      "content-type": type,
      "content-length": end - start + 1,
      "content-range": `bytes ${start}-${end}/${st.size}`,
      "accept-ranges": "bytes",
    });
    fs.createReadStream(real, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { "content-type": type, "content-length": st.size, "accept-ranges": "bytes" });
  fs.createReadStream(real).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/__ipc" && req.method === "POST") {
      const { cmd, args } = JSON.parse(await readBody(req));
      try {
        const result = await ipc(cmd, args || {});
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ result: result === undefined ? null : result }));
      } catch (e) {
        if (process.env.BRIDGE_DEBUG) console.error("ipc error", cmd, JSON.stringify(args).slice(0, 300), e);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: osError(e) }));
      }
      return;
    }
    if (url.pathname === "/__tauri_bridge.js") {
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      res.end(bridgeJs);
      return;
    }
    if (url.pathname === "/__fonts/dm-sans.css") {
      const css = ["opsz.css", "opsz-italic.css"]
        .map((f) => fs.readFileSync(path.join(FONT_DIR, f), "utf8"))
        .join("\n")
        .replaceAll("'DM Sans Variable'", "'DM Sans'")
        .replaceAll("url(./files/", "url(/__fonts/files/");
      res.writeHead(200, { "content-type": "text/css; charset=utf-8" });
      res.end(css);
      return;
    }
    if (url.pathname.startsWith("/__fonts/files/")) {
      await serveFile(res, path.join(FONT_DIR, "files", path.basename(url.pathname)), req);
      return;
    }
    if (url.pathname === "/__asset") {
      await serveFile(res, toReal(url.searchParams.get("path")), req);
      return;
    }
    if (url.pathname === "/__stub/proxy") {
      const r = await stubResponse(url.searchParams.get("url"));
      res.writeHead(r.status, { "content-type": r.type, "access-control-allow-origin": "*" });
      res.end(r.body);
      return;
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";
    let real = path.join(DIST, path.normalize(rel));
    if (!real.startsWith(DIST) || !fs.existsSync(real) || fs.statSync(real).isDirectory()) {
      real = path.join(DIST, "index.html");
    }
    if (real.endsWith("index.html")) {
      const html = (await fsp.readFile(real, "utf8"))
        .replace("<head>", '<head><script src="/__tauri_bridge.js"></script>')
        // Google Fonts -> same font served locally (no network at runtime)
        .replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>/g, (tag) =>
          tag.includes("css2?") ? '<link rel="stylesheet" href="/__fonts/dm-sans.css">' : ""
        );
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(html);
      return;
    }
    await serveFile(res, real, req);
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(String(e));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Sophosia UI on http://localhost:${PORT}/  (data: ${DATA})`);
});
