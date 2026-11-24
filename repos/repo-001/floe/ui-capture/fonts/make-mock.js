// Writes google-fonts-mock.js: a plain object keyed by the exact css2 URLs that
// next/font/google requests for app/layout.tsx, pointing at local woff2 files.
// Turbopack evaluates the mock file itself, so it must be a literal with
// absolute paths (no require / __dirname). Re-run if this directory moves.
const fs = require('fs'), path = require('path');
const dir = __dirname;
const faces = { Geist: 'Geist-Variable.woff2', 'Geist Mono': 'GeistMono-Variable.woff2' };
const range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const out = {};
for (const [family, file] of Object.entries(faces)) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@100..900&display=swap`;
  out[url] = `/* latin */\n@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: 100 900;\n  font-display: swap;\n  src: url(http://127.0.0.1:${process.env.FONT_PORT || 4491}/${file}) format('woff2');\n  unicode-range: ${range};\n}\n`;
}
fs.writeFileSync(path.join(dir, 'google-fonts-mock.js'), 'module.exports = ' + JSON.stringify(out, null, 2) + ';\n');
