// Builds a local replacement for the Google Fonts stylesheets the app imports,
// from @fontsource packages (installed in ./fonts-pkg). Output: <outDir>/ui-capture-fonts/
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(process.argv[2], "ui-capture-fonts");
mkdirSync(join(outDir, "files"), { recursive: true });
const nm = join(here, "fonts-pkg", "node_modules");
const pkgs = [
  ["@fontsource-variable/ubuntu-sans-mono", ["index.css", "wght-italic.css"], "Ubuntu Sans Mono"],
  ["@fontsource-variable/roboto-mono", ["index.css", "wght-italic.css"], "Roboto Mono"],
  ["@fontsource-variable/open-sans", ["index.css", "wght-italic.css"], "Open Sans"],
  ["@fontsource-variable/inter", ["index.css"], "Inter"],
  ["@fontsource/libre-barcode-39-extended", ["index.css"], "Libre Barcode 39 Extended"],
  ["@fontsource/ubuntu-mono", ["400.css", "700.css", "400-italic.css", "700-italic.css"], "Ubuntu Mono"],
];
let css = "";
for (const [pkg, files, family] of pkgs) {
  const dir = join(nm, pkg);
  for (const f of files) {
    const p = join(dir, f);
    if (!existsSync(p)) { console.warn("missing", p); continue; }
    let c = readFileSync(p, "utf8");
    c = c.replace(/font-family:\s*'[^']+'/g, `font-family: '${family}'`);
    c = c.replace(/url\(\.\/files\/([^)]+)\)/g, (_, n) => {
      if (n.endsWith(".woff2") || n.endsWith(".woff")) {
        const src = join(dir, "files", n);
        if (existsSync(src)) copyFileSync(src, join(outDir, "files", n));
      }
      return `url(./files/${n})`;
    });
    css += c + "\n";
  }
}
writeFileSync(join(outDir, "fonts.css"), css);
console.log("[fonts] wrote", join(outDir, "fonts.css"), readdirSync(join(outDir, "files")).length, "files");
