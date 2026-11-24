// Offline replacement for Google Fonts CSS, used through Next's own
// NEXT_FONT_GOOGLE_MOCKED_RESPONSES hook. Font files come from @fontsource-variable (npm).
const path = require("path");
const files = path.join(__dirname, "node_modules", "@fontsource-variable");
const face = (family, weights, file) => `/* latin */
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weights};
  font-display: swap;
  src: url(${file}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`;
const inter = face("Inter", "100 900", path.join(files, "inter/files/inter-latin-wght-normal.woff2"));
const fira = face("Fira Code", "300 700", path.join(files, "fira-code/files/fira-code-latin-wght-normal.woff2"));
module.exports = {
  "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap": inter,
  "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap": fira,
};
