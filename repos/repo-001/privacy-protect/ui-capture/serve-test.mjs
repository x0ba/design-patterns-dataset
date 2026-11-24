// Minimal static server for local checks: node serve-test.mjs <dir> <port>
// Mimics a plain static host: file, then dir/index.html, else index.html.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const [dir, port = "5480"] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };

async function tryFile(p) {
  try {
    const s = await stat(p);
    if (s.isFile()) return p;
    if (s.isDirectory()) {
      const i = join(p, "index.html");
      if ((await stat(i)).isFile()) return i;
    }
  } catch {}
  return null;
}

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  const file = (await tryFile(join(dir, path))) ?? join(dir, "index.html");
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  res.end(await readFile(file));
  console.log(req.method, req.url, "->", file.slice(dir.length));
}).listen(Number(port), () => console.log("listening", port));
