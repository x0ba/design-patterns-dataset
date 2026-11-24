// Usage: node .ui-capture/shot.mjs <url> <out.png> [waitMs]
import { chromium } from "playwright";
const [url, out, wait = "4000"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.HOME + "/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell", args: ["--single-process", "--no-zygote", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") console.log("console error:", m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("pageerror:", e.message.slice(0, 300)));
page.on("requestfailed", (r) => console.log("reqfailed:", r.url().slice(0, 150)));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
console.log("final url:", page.url());
await browser.close();
