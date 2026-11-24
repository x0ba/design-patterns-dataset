// Visit main pages in one browser context and report any response >= 400 or failed request.
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:5411";
const pages = ["/", "/conversations/c7a91e04d2f84b6b9e1f3a0c55d2e801", "/conversations/91d3a6b2c4e54f7a8b9c0d1e2f3a4b5c", "/automations", "/automations/events", "/automations/templates", "/customize", "/skills", "/plugins", "/apps", "/mcp", "/settings", "/settings/llm", "/settings/agents", "/settings/secrets", "/settings/app", "/settings/runtime", "/settings/condenser", "/settings/verification", "/settings/agent-context", "/settings/meta-llm", "/conversations", "/conversations/4be0d17c9a3e4f21b8d6e2a7c1f09b33", "/automations/a1000000-0000-0000-0000-000000000001", "/automations/git-sync", "/automations/setup", "/launch"];
const browser = await chromium.launch({ executablePath: process.env.HOME + "/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell", args: ["--single-process", "--no-zygote", "--disable-gpu"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const bad = new Set();
page.on("response", (r) => {
  if (r.status() >= 400) bad.add(`${r.status()} ${r.request().method()} ${r.url()}`);
  const u = new URL(r.url());
  if (u.origin === new URL(base).origin && /^\/(api|sockets|server_info)/.test(u.pathname) && (r.headers()["content-type"] || "").includes("text/html"))
    bad.add(`HTML-FALLBACK ${r.request().method()} ${r.url()}`);
});
page.on("requestfailed", (r) => { if (!r.url().includes("fonts.googleapis.com")) bad.add(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText}`); });
page.on("pageerror", (e) => bad.add(`pageerror ${e.message.slice(0, 200)}`));
for (const p of pages) {
  await page.goto(base + p, { waitUntil: "load" });
  await page.waitForTimeout(p === "/" ? 6000 : 3500);
  if (process.env.SHOTS) await page.screenshot({ path: `.ui-capture/shots/crawl${p.replace(/\//g, "_") || "_root"}.png` });
}
console.log(bad.size ? [...bad].join("\n") : "NO FAILED LOADS");
await browser.close();
