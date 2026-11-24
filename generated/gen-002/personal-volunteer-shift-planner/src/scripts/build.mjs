// Builds the static site into ./out (entry point: ./out/index.html).
// No dependencies: copies the source files, parses every script, and checks
// that each local file referenced by index.html ends up in out/.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'out');
const files = ['index.html', 'styles.css', 'data.js', 'app.js'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of files) cpSync(join(src, f), join(out, f));

// Parse scripts without running them, so syntax errors fail the build.
for (const f of files.filter(f => f.endsWith('.js'))) {
  try {
    new vm.Script(readFileSync(join(out, f), 'utf8'), { filename: f });
  } catch (err) {
    console.error(`Syntax error in ${f}: ${err.message}`);
    process.exit(1);
  }
}

// Every local href/src in index.html must resolve inside out/.
const html = readFileSync(join(out, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:href|src)="(?!https?:|#|data:)([^"]+)"/g)].map(m => m[1]);
const missing = refs.filter(r => !existsSync(join(out, r)));
if (missing.length) {
  console.error('Missing files referenced from index.html:', missing.join(', '));
  process.exit(1);
}

console.log(`Built ${files.length} files into ${out}`);
