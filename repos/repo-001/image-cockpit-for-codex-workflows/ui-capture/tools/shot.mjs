// Usage: node shot.mjs <url> <out.png> [clickText...]
import { chromium } from "playwright-core";
const [url, out, ...clicks] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: "/Users/bryanmin/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  headless: true,
  args: ["--no-sandbox", "--single-process", "--no-zygote", "--disable-gpu"]
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "en-US" });
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("response", (r) => { if (r.status() >= 400) logs.push(`HTTP ${r.status()} ${r.url()}`); });
page.on("requestfailed", (r) => logs.push(`FAILED ${r.url()} ${r.failure()?.errorText}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
for (const c of clicks) {
  if (c.startsWith("wait:")) { await page.waitForTimeout(Number(c.slice(5))); continue; }
  if (c.startsWith("reload")) { await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(2000); continue; }
  await page.getByText(c, { exact: false }).first().click({ timeout: 5000 }).catch((e) => logs.push(`click fail ${c}: ${e.message.split("\n")[0]}`));
  await page.waitForTimeout(1200);
}
await page.screenshot({ path: out });
console.log(logs.slice(-15).join("\n"));
await browser.close();
