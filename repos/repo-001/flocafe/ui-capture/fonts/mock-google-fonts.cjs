// Offline replacement for Google Fonts CSS used by next/font at build time
// (NEXT_FONT_GOOGLE_MOCKED_RESPONSES). Font files come from the npm "geist"
// and "@fontsource-variable/inter" packages, stored next to this file.
const path = require('node:path');
const face = (family, file) => `/* latin */
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(${path.join(__dirname, file)}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`;
const base = 'https://fonts.googleapis.com/css2?family=';
module.exports = {
  [`${base}Geist:wght@100..900&display=swap`]: face('Geist', 'Geist-Variable.woff2'),
  [`${base}Geist+Mono:wght@100..900&display=swap`]: face('Geist Mono', 'GeistMono-Variable.woff2'),
  [`${base}Inter:wght@100..900&display=swap`]: face('Inter', 'inter-latin-standard-normal.woff2'),
};
