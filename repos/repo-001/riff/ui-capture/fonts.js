'use strict';
// Local replacement for fonts.googleapis.com (Google Sans, Inter, Material Symbols) using npm font packages.
const fs = require('fs');
const path = require('path');
const NM = path.join(__dirname, 'tools', 'node_modules');

function fontsourceCss(pkg, family, weights, alias) {
  let out = '';
  for (const w of weights) {
    const f = path.join(NM, '@fontsource', pkg, `${w}.css`);
    if (!fs.existsSync(f)) continue;
    let css = fs.readFileSync(f, 'utf8').replace(/url\(\.\/files\//g, `url(/__fonts/fs/${pkg}/files/`);
    out += css;
    if (alias) out += css.replace(new RegExp(`font-family: '${family}'`, 'g'), `font-family: '${alias}'`);
  }
  return out;
}

let cached = null;
function buildCss() {
  if (cached) return cached;
  let css = '';
  css += fontsourceCss('google-sans', 'Google Sans', [400, 500, 600, 700], 'Google Sans Text');
  css += fontsourceCss('inter', 'Inter', [400, 500, 600, 700, 800]);
  for (const v of ['outlined', 'rounded', 'sharp']) {
    css += fs.readFileSync(path.join(NM, 'material-symbols', `${v}.css`), 'utf8')
      .replace(/url\("\.\/(material-symbols-[a-z]+\.woff2)"\)/g, 'url("/__fonts/ms/$1")');
  }
  cached = css;
  return css;
}

function handle(req, res, u, CORS) {
  const p = u.pathname;
  if (p === '/__fonts/css2') {
    res.writeHead(200, { ...CORS, 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'max-age=3600' });
    return res.end(buildCss());
  }
  let file = null;
  if (p.startsWith('/__fonts/fs/')) file = path.join(NM, '@fontsource', p.slice('/__fonts/fs/'.length));
  else if (p.startsWith('/__fonts/ms/')) file = path.join(NM, 'material-symbols', path.basename(p));
  if (file && file.startsWith(NM) && fs.existsSync(file)) {
    res.writeHead(200, { ...CORS, 'Content-Type': file.endsWith('.woff2') ? 'font/woff2' : 'font/woff', 'Cache-Control': 'max-age=86400' });
    return fs.createReadStream(file).pipe(res);
  }
  res.writeHead(404, CORS);
  res.end();
}

module.exports = { handle };
