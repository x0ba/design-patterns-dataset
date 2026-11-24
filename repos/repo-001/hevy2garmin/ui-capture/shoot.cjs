// Screenshot helper for checking the UI: node shoot.cjs <baseUrl> page1 page2 ...
const { chromium } = require("../web/node_modules/playwright-core");
(async () => {
  const [base, ...pages] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(base + "/login");
  await p.fill('input[type="password"]', "liftheavy2026");
  await p.keyboard.press("Enter");
  await p.waitForURL(/dashboard/);
  for (const pg of pages) {
    await p.goto(base + "/" + pg, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: __dirname + "/shots/" + pg.replace(/\W/g, "_") + ".png", fullPage: process.env.FULL === "1" });
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
