// Local server for Ribbon: serves the production build (dist/) and stubs the external services
// the browser would otherwise call:
//   - api.genomeribbon.com /v0/store  (permalink KV store) -> /v0/store/ backed by .ui-capture/store/*.json
//   - fonts.googleapis.com Lato       -> /_fonts/css (files from @fontsource/lato)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.resolve(HERE, "../dist");
const STORE = path.join(HERE, "store");
const FONTS = path.join(HERE, "fontstub/node_modules/@fontsource/lato/files");
const PORT = parseInt(process.env.PORT || "4482", 10);

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".wasm": "application/wasm",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject",
  ".csv": "text/csv", ".bed": "text/plain", ".data": "application/octet-stream", ".ico": "image/x-icon" };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "HEAD, GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Range" };

const json = (res, status, payload) => { res.writeHead(status, { "content-type": "application/json", ...CORS }); res.end(JSON.stringify(payload)); };
const ok = (res, data) => json(res, 200, { success: true, message: "OK", error_code: 200, data });
const bad = (res, message) => json(res, 400, { success: false, message, error_code: 400, data: {} });
const keyFile = (k) => path.join(STORE, encodeURIComponent(k) + ".json");

function handleStore(req, res, id) {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  if (req.method === "GET") {
    if (!id) return bad(res, "Please specify an ID to retrieve.");
    const f = keyFile(id);
    if (!fs.existsSync(f)) return ok(res, null); // real KV returns null for unknown keys
    const v = JSON.parse(fs.readFileSync(f, "utf8"));
    delete v._created;
    return ok(res, v);
  }
  if (req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let value;
      try { value = JSON.parse(body); } catch { return bad(res, "Must specify valid JSON"); }
      const key = `ribbon/${crypto.randomUUID()}`;
      value._created = new Date().toISOString();
      fs.writeFileSync(keyFile(key), JSON.stringify(value));
      ok(res, key);
    });
    return;
  }
  return bad(res, "Invalid endpoint");
}

const FONT_CSS = [300, 900].map((w) => `@font-face{font-family:'Lato';font-style:normal;font-weight:${w};font-display:swap;src:url(/_fonts/files/lato-latin-${w}-normal.woff2) format('woff2'),url(/_fonts/files/lato-latin-${w}-normal.woff) format('woff');}`).join("\n");

function sendFile(res, f) {
  const ext = path.extname(f).toLowerCase();
  res.writeHead(200, { "content-type": TYPES[ext] || "application/octet-stream", "content-length": fs.statSync(f).size, "Access-Control-Allow-Origin": "*" });
  fs.createReadStream(f).pipe(res);
}

http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  let p = decodeURIComponent(u.pathname);
  if (p.startsWith("/v0/store")) return handleStore(req, res, p.replace("/v0/store", "").trim().replace(/\/$/, "").replace(/^\//, ""));
  if (p === "/_fonts/css") { res.writeHead(200, { "content-type": "text/css" }); return res.end(FONT_CSS); }
  if (p.startsWith("/_fonts/files/")) {
    const f = path.join(FONTS, path.basename(p));
    if (fs.existsSync(f)) return sendFile(res, f);
  }
  const f = path.join(DIST, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
  if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) return sendFile(res, f);
  if (path.extname(p) && p !== "/") { res.writeHead(404); return res.end("Not found"); }
  return sendFile(res, path.join(DIST, "index.html"));
}).listen(PORT, () => console.log(`Ribbon on http://localhost:${PORT}/`));
