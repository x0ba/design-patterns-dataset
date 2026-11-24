// Rewrites the built index.html / CSS: Google Fonts -> local copy, and runs the
// Web Bluetooth stub + seeder before loading the app entry module.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const out = process.argv[2];
const GF = /https:\/\/fonts\.googleapis\.com\/css2\?[^"')\s]+/g;
let html = readFileSync(join(out, "index.html"), "utf8");
html = html.replace(GF, "/ui-capture-fonts/fonts.css");
const m = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
if (!m) throw new Error("entry script not found in index.html");
html = html.replace(m[0],
  `<script src="/ui-capture/ble-stub.js"></script>\n    <script type="module">\n      import { seed } from "/ui-capture/seed.js";\n      try { await seed(); } catch (e) { console.error("[ui-capture] seed failed", e); }\n      await import("${m[1]}");\n    </script>`);
writeFileSync(join(out, "index.html"), html);
for (const f of readdirSync(join(out, "assets")).filter((f) => f.endsWith(".css"))) {
  const p = join(out, "assets", f);
  writeFileSync(p, readFileSync(p, "utf8").replace(GF, "/ui-capture-fonts/fonts.css"));
}
console.log("[postprocess] entry", m[1]);
