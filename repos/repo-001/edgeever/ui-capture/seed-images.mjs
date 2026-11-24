// Renders a few images with sharp and returns notes that embed them (uploaded by seed.mjs
// through POST /api/v1/memos/with-image, the same path the web clipper uses).
import sharp from "sharp";

const chartSvg = () => {
  const rows = [["Find usage for atlas-prod", 6], ["Invite teammate as Viewer", 5], ["Download October invoice", 3], ["Set >80% quota alert", 4], ["Pin a project", 6]];
  const bars = rows.map(([label, v], i) => {
    const y = 90 + i * 64;
    const w = (v / 6) * 620;
    const color = v <= 3 ? "#DC2626" : v <= 4 ? "#D97706" : "#2563EB";
    return `<text x="40" y="${y + 26}" font-family="Helvetica, Arial" font-size="18" fill="#374151">${label}</text>
      <rect x="320" y="${y + 6}" width="620" height="30" rx="4" fill="#F3F4F6"/>
      <rect x="320" y="${y + 6}" width="${w}" height="30" rx="4" fill="${color}"/>
      <text x="${330 + w}" y="${y + 28}" font-family="Helvetica, Arial" font-size="16" font-weight="bold" fill="#111827">${v}/6</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="440"><rect width="1040" height="440" fill="#fff"/>
    <text x="40" y="52" font-family="Helvetica, Arial" font-size="24" font-weight="bold" fill="#111827">Task success — usability round 1 (n=6)</text>${bars}</svg>`;
};

const beachSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9ccc8"/><stop offset="1" stop-color="#e4e2da"/></linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa39f"/><stop offset="1" stop-color="#c8c1ae"/></linearGradient></defs>
  <rect width="1600" height="640" fill="url(#sky)"/><rect y="600" width="1600" height="467" fill="url(#sea)"/>
  <path d="M980 610 C1000 420 1080 360 1130 380 C1190 400 1230 520 1250 610 Z" fill="#59605c" opacity="0.85"/>
  <path d="M1290 612 C1300 560 1330 540 1350 560 C1365 575 1372 600 1376 612 Z" fill="#6b716d" opacity="0.7"/>
  <path d="M0 760 C300 730 600 790 900 750 C1200 715 1400 770 1600 745 L1600 1067 L0 1067 Z" fill="#d8cfb9"/>
  <rect y="600" width="1600" height="30" fill="#ffffff" opacity="0.25"/>
  <circle cx="420" cy="905" r="10" fill="#3a3a38"/><rect x="414" y="912" width="12" height="40" fill="#3a3a38"/></svg>`;

const tileSvg = () => {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><rect width="1200" height="1200" fill="#f4f1e8"/>`;
  for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) {
    const cx = x * 200 + 100, cy = y * 200 + 100;
    s += `<rect x="${x * 200 + 3}" y="${y * 200 + 3}" width="194" height="194" fill="#f7f4ec" stroke="#d9d3c4" stroke-width="3"/>
      <circle cx="${cx}" cy="${cy}" r="62" fill="none" stroke="#1f4e9c" stroke-width="14"/>
      <path d="M${cx} ${cy - 92} L${cx + 26} ${cy} L${cx} ${cy + 92} L${cx - 26} ${cy} Z" fill="#1f4e9c"/>
      <path d="M${cx - 92} ${cy} L${cx} ${cy + 26} L${cx + 92} ${cy} L${cx} ${cy - 26} Z" fill="#2c64b8" opacity="0.9"/>
      <circle cx="${cx}" cy="${cy}" r="14" fill="#e3b33c"/>
      <path d="M${x * 200} ${y * 200} q30 6 40 40 M${x * 200 + 200} ${y * 200} q-30 6 -40 40 M${x * 200} ${y * 200 + 200} q30 -6 40 -40 M${x * 200 + 200} ${y * 200 + 200} q-30 -6 -40 -40" stroke="#1f4e9c" stroke-width="8" fill="none"/>`;
  }
  return s + "</svg>";
};

const render = async (svg, format, blur = 0) => {
  let img = sharp(Buffer.from(svg));
  if (blur) img = img.blur(blur);
  return format === "jpeg" ? img.jpeg({ quality: 82 }).toBuffer() : img.png().toBuffer();
};

export const imageNotes = async (nb) => [
  { nb: nb.dash, title: "Usability round 1 — task success chart", tags: ["dashboard-v3", "research", "usability"], daysAgo: 58,
    file: new File([await render(chartSvg(), "png")], "task-success-round1.png", { type: "image/png" }),
    md: "Exported from the research sheet for the readout deck.\n\n![task-success-round1.png](/api/v1/resources/EDGEVERRESOURCEID/blob)\n\nInvoice download is the clear outlier — see findings note." },
  { nb: nb.photo, title: "Cannon Beach, roll 7 frame 18", tags: ["photography", "film", "coast"], daysAgo: 48,
    file: new File([await render(beachSvg(), "jpeg", 2.2)], "roll07_18_cannon-beach.jpg", { type: "image/jpeg" }),
    md: "Favorite from the coast trip. Haystack Rock in full fog, Portra 400 at box speed, 1/250 f/8. Scanned at Blue Moon.\n\n![roll07_18_cannon-beach.jpg](/api/v1/resources/EDGEVERRESOURCEID/blob)\n\nMaybe print 8×10 for Mom?" },
  { nb: nb.lisbon, title: "Azulejos in Alfama", tags: ["travel", "lisbon", "photography"], daysAgo: 196,
    file: new File([await render(tileSvg(), "jpeg", 0.8)], "IMG_4471.jpg", { type: "image/jpeg" }),
    md: "Wall of tiles on Rua de São Miguel. Want to find this exact pattern for the kitchen backsplash someday.\n\n![IMG_4471.jpg](/api/v1/resources/EDGEVERRESOURCEID/blob)" },
];
