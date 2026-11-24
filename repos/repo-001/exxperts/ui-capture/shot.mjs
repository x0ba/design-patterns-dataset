// Dev helper: screenshot pages of the running app. Usage: node shot.mjs name:/path ...
import { chromium } from "playwright";
const exe = `${process.env.REAL_HOME || "/home/bryanmin"}/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(`${process.env.APP_URL}/auth/session?token=${process.env.AUTH_TOKEN}`);
await page.waitForTimeout(2500);
for (const arg of process.argv.slice(2)) {
	const [name, p] = arg.split(":");
	if (p && p !== "-") { await page.goto(process.env.APP_URL + p); await page.waitForTimeout(2500); }
	await page.screenshot({ path: `tmp/${name}.png` });
	console.log("shot", name, page.url());
}
await browser.close();
