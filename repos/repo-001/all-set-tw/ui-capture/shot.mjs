import { chromium } from "@playwright/test";
const base = process.argv[2]; const paths = process.argv.slice(3);
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, args: ["--single-process", "--no-sandbox", "--no-zygote"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text().slice(0, 200)));
page.on("requestfailed", (r) => console.log("failed:", r.url()));
for (const p of paths) {
  await page.goto(base + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const name = (p.replace(/[^a-z0-9]+/gi, "_") || "root") + ".png";
  await page.screenshot({ path: `${process.env.TMPDIR}/${name}` });
  console.log("shot", p, name);
}
await browser.close();
