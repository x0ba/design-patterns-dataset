// Rewrites CDN references in out/index.html to locally vendored copies and adds the seed loader.
import fs from 'node:fs';

const file = process.argv[2];
let html = fs.readFileSync(file, 'utf8');

function replace(from, to) {
  if (!html.includes(from)) {
    throw new Error(`patch-index: pattern not found: ${from}`);
  }
  html = html.replace(from, to);
}

// Tabler icons webfont -> local copy
replace(
  "const tablerIconsFontUrl = `https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@${tablerIconsFontVersion}/dist/fonts/tabler-icons.woff2?v${tablerIconsFontVersion}`;",
  "const tablerIconsFontUrl = new URL(`vendor/tabler/tabler-icons.woff2?v${tablerIconsFontVersion}`, document.baseURI).href;"
);

// DuckDB-WASM ESM -> local esbuild bundle of the same npm version
replace(
  "const duckDbLibraryUrl = `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${duckdbLibraryVersion}/+esm`;",
  "const duckDbLibraryUrl = new URL('vendor/duckdb/duckdb-browser.mjs', document.baseURI).href;"
);

// Worker + wasm bundles -> local files instead of jsdelivr
replace(
  "const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();",
  `const JSDELIVR_BUNDLES = {
          base: {
            mainModule: new URL('vendor/duckdb/duckdb-base.wasm', document.baseURI).href,
            mainWorker: new URL('vendor/duckdb/duckdb-browser-base.worker.js', document.baseURI).href
          }
        };`
);

// DuckDB release icon (About dialog) -> local copy (taken from github.com/duckdb/duckdb-web)
replace(
  'src="https://duckdb.org/images/release-icons/1.3.0.svg"',
  'src="vendor/duckdb/release-icons/1.3.0.svg"'
);

// Seed loader (loads the demo user's data files through the app's own upload path)
replace(
  '<script onload="resourceLoaded(this)" src="App/App.js"></script>',
  '<script onload="resourceLoaded(this)" src="App/App.js"></script>\n    <script src="seed/huey-seed.js"></script>'
);

fs.writeFileSync(file, html);
console.log('patched', file);

// App.js builds the version-specific icon URL at runtime -> same local folder
const appJs = new URL('App/App.js', `file://${file}`).pathname;
let app = fs.readFileSync(appJs, 'utf8');
const from = 'duckdbAvatar.src = `https://duckdb.org/images/release-icons/';
if (!app.includes(from)) throw new Error('patch-index: release icon URL not found in App.js');
app = app.replace(from, 'duckdbAvatar.src = `vendor/duckdb/release-icons/');
fs.writeFileSync(appJs, app);
console.log('patched', appJs);

// The PWA service worker resolves its 'src/...' app-shell list against the repo root (one level
// above itself). In this build src/ *is* the web root, so resolve 'src/X' as 'X' next to the worker.
const swJs = new URL('huey-pwa-service-worker.js', `file://${file}`).pathname;
let sw = fs.readFileSync(swJs, 'utf8');
const swFrom = 'APP_SHELL.map(path => new URL(path, REPO_ROOT).href)';
if (!sw.includes(swFrom)) throw new Error('patch-index: APP_SHELL mapping not found in service worker');
sw = sw.replace(swFrom, "APP_SHELL.map(path => new URL(path.replace(/^src\\//, ''), self.location.href).href)");
fs.writeFileSync(swJs, sw);
console.log('patched', swJs);
