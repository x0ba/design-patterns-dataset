import { chromium } from "playwright-core";
const exe = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const url = process.argv[2] || "http://localhost:5408/";
const shot = process.argv[3] || "shot.png";
const actions = process.argv[4] || "";
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
page.on("requestfailed", (r) => logs.push("reqfail: " + r.url()));
page.on("request", (r) => { const u = r.url(); if (!u.startsWith("http://localhost") && !u.startsWith("data:") && !u.startsWith("blob:")) logs.push("EXTERNAL: " + u); });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
for (const step of actions.split(";;").filter(Boolean)) {
  const [kind, arg] = step.split("=>");
  if (kind === "click") await page.getByText(arg, { exact: false }).first().click();
  else if (kind === "css") await page.locator(arg).first().click();
  else if (kind === "key") await page.keyboard.press(arg);
  else if (kind === "wait") await page.waitForTimeout(Number(arg));
}
await page.waitForTimeout(800);
await page.screenshot({ path: shot });
console.log(logs.slice(0, 30).join("\n"));
await browser.close();
