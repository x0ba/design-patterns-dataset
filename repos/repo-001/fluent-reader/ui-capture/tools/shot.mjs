// Verification helper: node shot.mjs <url> <out.png> [steps-json]
import { chromium } from "playwright-core"
import fs from "node:fs"
import os from "node:os"
const base = "/Users/bryanmin/Library/Caches/ms-playwright"

const exe = `${base}/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`
const [url, out, steps = "[]"] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") console.log("console:", m.type(), m.text().slice(0, 300)) })
page.on("pageerror", e => console.log("pageerror:", e.message))
await page.goto(url)
await page.waitForTimeout(4000)
for (const s of JSON.parse(steps)) {
    if (s.click) await page.click(s.click)
    if (s.wait) await page.waitForTimeout(s.wait)
    if (s.eval) console.log(await page.evaluate(s.eval))
}
await page.screenshot({ path: out })
await browser.close()
