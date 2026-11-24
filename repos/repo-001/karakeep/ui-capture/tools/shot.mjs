// Verification helper: logs in and screenshots a few pages at 1440x900.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const base = process.env.BASE ?? "http://localhost:5402";
const out = process.env.OUT ?? "shots";
const pages = (process.env.PAGES ?? "/dashboard/bookmarks").split(",");
const exe = process.env.CHROME;
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(base + "/signin");
await page.fill('input[type="email"], input[name="email"]', "alex.moreno@example.com");
await page.fill('input[type="password"]', "keepitall-2026");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 20000 });
for (const p of pages) {
  await page.goto(base + p);
  await page.waitForTimeout(Number(process.env.WAIT ?? 3500));
  const name = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log("shot", p);
}
await browser.close();
