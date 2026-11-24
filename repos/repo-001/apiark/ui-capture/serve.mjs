// Minimal static server with SPA fallback (for local verification only).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
const root = new URL("./out/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".ttf": "font/ttf", ".woff2": "font/woff2" };
createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^\/+/, "");
  let f = join(root, p);
  try { if (!(await stat(f)).isFile()) throw 0; } catch { f = join(root, "index.html"); }
  res.writeHead(200, { "content-type": types[extname(f)] || "application/octet-stream" });
  res.end(await readFile(f));
}).listen(Number(process.env.PORT || 5408), () => console.log("serving", root));
