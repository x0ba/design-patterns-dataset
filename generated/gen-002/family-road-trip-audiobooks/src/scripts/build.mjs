// Builds the static site into ./out. No dependencies; no rewrites needed.
// Output: out/index.html (entry), out/styles.css, out/data.js, out/engine.js, out/app.js
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const out = join(root, "out");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const files = readdirSync(src);
for (const f of files) {
  cpSync(join(src, f), join(out, f));
}

// Syntax-check every script before declaring success.
for (const f of files.filter((f) => f.endsWith(".js"))) {
  execFileSync(process.execPath, ["--check", join(out, f)], { stdio: "inherit" });
}

// Every local asset referenced by index.html must exist in the output.
const html = readFileSync(join(out, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"#?:]+)"/g)].map((m) => m[1]);
const missing = refs.filter((r) => !existsSync(join(out, r)));
if (missing.length) {
  console.error(`Missing referenced files in out/: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`Built ${files.length} files into ${out} (entry: out/index.html)`);
