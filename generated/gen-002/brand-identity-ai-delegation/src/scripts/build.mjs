// Builds the static site into ./out. No bundler and no dependencies.
// Output is plain files with relative paths, so it works from the root of any static server.
import { cpSync, existsSync, readFileSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = join(root, 'src');
const out = join(root, 'out');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const name of readdirSync(src)) {
  cpSync(join(src, name), join(out, name));
}

// Every script and stylesheet reference in index.html must be a relative file that exists in out/.
const html = readFileSync(join(out, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
const problems = [];
for (const ref of refs) {
  if (ref.startsWith('data:')) {
    continue;
  }
  if (/^(https?:|\/\/|\/)/.test(ref)) {
    problems.push(`absolute reference not allowed: ${ref}`);
    continue;
  }
  if (!existsSync(join(out, ref))) {
    problems.push(`missing file: ${ref}`);
  }
}

// Syntax-check every script.
for (const name of readdirSync(out).filter((n) => n.endsWith('.js'))) {
  try {
    execFileSync(process.execPath, ['--check', join(out, name)], { stdio: 'pipe' });
  } catch (err) {
    problems.push(`syntax error in ${name}: ${String(err.stderr || err.message)}`);
  }
}

if (problems.length) {
  console.error('Build failed:\n' + problems.join('\n'));
  process.exit(1);
}

const files = readdirSync(out).sort();
console.log(`Built ${files.length} files into ${out}: ${files.join(', ')}`);
