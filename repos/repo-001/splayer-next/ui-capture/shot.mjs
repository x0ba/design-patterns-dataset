// 本地验证：起静态服务器（未知路径回退 index.html），用无头 Chromium 打开并截图
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("./tools/node_modules/playwright-core");
const out = resolve(import.meta.dirname, "out");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".ttf": "font/ttf", ".webp": "image/webp", ".jpg": "image/jpeg" };
const server = http.createServer((req, res) => {
  let p = join(out, decodeURIComponent(req.url.split("?")[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(out, "index.html");
  res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
}).listen(5430);
const exe = process.env.CHROME;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) console.log("[console]", m.type(), m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
const routes = (process.argv[2] ?? "").split(",").filter(Boolean);
await page.goto("http://localhost:5430/");
await page.waitForTimeout(3500);
await page.screenshot({ path: `${import.meta.dirname}/cache/shot-home.png` });
for (const r of routes) {
  await page.evaluate((h) => (location.hash = h), r);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${import.meta.dirname}/cache/shot-${r.replace(/[^a-z0-9]/gi, "_")}.png` });
}
await browser.close();
server.close();
