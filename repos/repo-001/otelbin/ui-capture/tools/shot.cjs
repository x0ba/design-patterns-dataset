// Usage: node tools/shot.js <url> <out.png> [dismissWelcome]
const { chromium } = require("playwright-core");
(async () => {
	const [url, out, dismiss] = process.argv.slice(2);
	const browser = await chromium.launch({
		executablePath: process.env.HOME + "/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell",
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && console.log("[console]", m.type(), m.text().slice(0, 300)));
	page.on("pageerror", (e) => console.log("[pageerror]", e.message));
	page.on("requestfailed", (r) => console.log("[reqfail]", r.url().slice(0, 120), r.failure()?.errorText));
	if (dismiss) {
		await page.addInitScript(() => localStorage.setItem("welcomeModal", "0"));
	}
	await page.goto(url, { waitUntil: "networkidle" });
	await page.waitForTimeout(4000);
	await page.screenshot({ path: out });
	console.log("final url:", page.url().slice(0, 120));
	await browser.close();
})();
