// Lets the real Sophosia front end index the freshly seeded workspace into its
// SQLite db (the app's own indexer: notes, PDF text, annotations, links), so the
// shipped snapshot opens straight into the main UI like an established install.
// Requires the bridge server running on $PORT and a local Chromium.
import { chromium } from "playwright-core";
const port = process.env.PORT || 5484;
const exe = process.env.CHROME || `${process.env.REAL_HOME || process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector(".main-layout-root", { timeout: 180000 });
await page.waitForTimeout(4000); // let debounced state writes and async inserts settle
await browser.close();
console.log("indexing done");
