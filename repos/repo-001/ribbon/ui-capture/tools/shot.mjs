// Usage: node tools/shot.mjs <url> <out.png> [waitMs] [clickSelector]
import { chromium } from "playwright-core";
import os from "node:os";
const [url, out, wait = "8000", click] = process.argv.slice(2);
const exe = `${os.homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) console.log("console", m.type(), m.text().slice(0, 200)); });
page.on("pageerror", (e) => console.log("pageerror", e.message.slice(0, 300)));
page.on("requestfailed", (r) => console.log("reqfailed", r.url().slice(0, 150), r.failure()?.errorText));
await page.goto(url);
await page.waitForTimeout(parseInt(wait));
if (click) { await page.click(click); await page.waitForTimeout(3000); }
await page.screenshot({ path: out });
await browser.close();
