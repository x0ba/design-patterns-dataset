// Dev helper: screenshots pages of a running server and logs external requests.
// Usage: node shot.mjs <baseUrl> <outDir> path1 path2 ...
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(path.resolve(import.meta.dirname, "../../dashboard/package.json"));
const { chromium } = require("playwright");
const [base, outDir, ...paths] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const pwDir = path.join(process.env.REAL_HOME || "/Users/bryanmin", "Library/Caches/ms-playwright");
const cands = fs.readdirSync(pwDir).filter((d) => d.startsWith("chromium_headless_shell-")).sort();
const exe = path.join(pwDir, cands.at(-1), "chrome-headless-shell-mac-arm64/chrome-headless-shell");
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const external = new Set();
page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) external.add(`${r.method()} ${u.origin}${u.pathname}`); });
page.on("console", (m) => { if (m.type() === "error") console.log("console.error:", m.text().slice(0, 200)); });
page.on("response", (r) => { if (r.status() >= 400) console.log("HTTP", r.status(), r.url().slice(0, 160)); });
for (const p of paths) {
  await page.goto(base + p, { waitUntil: "load" }).catch((e) => console.log("goto", p, e.message));
  await page.waitForTimeout(Number(process.env.WAIT || 4000));
  const name = (p.replace(/[^a-z0-9]+/gi, "_") || "root") + ".png";
  await page.screenshot({ path: path.join(outDir, name), fullPage: process.env.FULL === "1" });
  console.log("shot", p);
}
console.log("EXTERNAL:\n" + [...external].join("\n"));
await browser.close();
