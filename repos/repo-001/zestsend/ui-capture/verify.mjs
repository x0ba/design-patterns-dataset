// Verification helper: opens the room at 1440x900 and screenshots main tabs.
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:4442";
const exe = process.env.CHROME_PATH;
const browser = await chromium.launch({ executablePath: exe, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text().slice(0, 200)); });
const t0 = Date.now();
await page.goto(`${base}/en/room/2468`);
await page.waitForTimeout(Number(process.env.WAIT ?? 12000));
console.log("elapsed", Date.now() - t0);
await page.screenshot({ path: ".ui-capture/shots/room.png" });
for (const name of (process.env.TABS ?? "").split(",").filter(Boolean)) {
  await page.getByRole("button", { name }).first().click().catch((e) => console.log("no tab", name, e.message.slice(0, 80)));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `.ui-capture/shots/${name.toLowerCase().replace(/\W+/g, "-")}.png` });
}
await browser.close();
