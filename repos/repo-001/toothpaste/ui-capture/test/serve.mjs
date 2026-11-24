// Minimal static server with SPA fallback (for local testing only).
import http from "node:http"; import { readFile, stat } from "node:fs/promises"; import { join, extname } from "node:path";
const root = process.argv[2], port = +process.argv[3];
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon", ".glb": "model/gltf-binary", ".gif": "image/gif", ".webmanifest": "application/manifest+json" };
http.createServer(async (req, res) => {
  let p = join(root, decodeURIComponent(req.url.split("?")[0]));
  try { if ((await stat(p)).isDirectory()) p = join(p, "index.html"); } catch { p = join(root, "index.html"); }
  try { const b = await readFile(p); res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(port, () => console.log("listening", port));
