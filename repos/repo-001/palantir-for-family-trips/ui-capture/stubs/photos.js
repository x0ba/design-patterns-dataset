// Stand-in for images.unsplash.com: the reference photos the app links to are
// replaced at build time with locally generated SVG scenes served from /__stub/photos.
const SCENES = {
  'photo-1506744038136-46273834b3fb': 'lake', // basecamp exterior
  'photo-1505693416388-ac5ce068fe85': 'interior', // basecamp interior
  'photo-1517248135467-4c7edcad34c4': 'dining', // grill
  'photo-1513104890138-7c749659a591': 'pizza',
  'photo-1552566626-52f8b828add9': 'dining-warm', // mountain room
  'photo-1555992336-03a23c7b20ee': 'roadside',
  'photo-1565299624946-b28f40a0ae38': 'brewery',
  'photo-1472396961693-142e6e269027': 'valley', // yosemite
}

export function rewriteUnsplash(code) {
  return code.replace(/https:\/\/images\.unsplash\.com\/(photo-[0-9a-f-]+)\?[^'"`]*/g, (_m, id) => `/__stub/photos/${id}.svg`)
}

function mountains(c1, c2, sky1, sky2, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>
<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d6f8f"/><stop offset="1" stop-color="#16303f"/></linearGradient></defs>
<rect width="900" height="600" fill="url(#s)"/>
<circle cx="690" cy="140" r="46" fill="#fff4d6" opacity=".85"/>
<path d="M0 360 L120 230 L210 300 L330 170 L450 290 L560 200 L690 310 L800 220 L900 280 L900 600 L0 600Z" fill="${c1}"/>
<path d="M0 420 L90 340 L200 400 L310 320 L430 410 L540 350 L650 420 L780 340 L900 400 L900 600 L0 600Z" fill="${c2}"/>
${extra}</svg>`
}

function pines(y, color, n = 18, seed = 3) {
  let out = ''
  for (let i = 0; i < n; i += 1) {
    const x = ((i * 53 + seed * 31) % 900)
    const h = 60 + ((i * 37 + seed) % 50)
    out += `<path d="M${x} ${y - h} L${x - 16} ${y} L${x + 16} ${y}Z" fill="${color}"/>`
  }
  return out
}

function room(wall, floor, accent, items) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice">
<rect width="900" height="600" fill="${wall}"/><rect y="400" width="900" height="200" fill="${floor}"/>
<rect x="80" y="90" width="230" height="170" fill="#9ec3d6" stroke="#5b3d23" stroke-width="12"/>
<path d="M80 200 L150 150 L220 190 L310 130 L310 260 L80 260Z" fill="#4f6b4a"/>
${items}
<rect x="0" y="392" width="900" height="10" fill="${accent}" opacity=".5"/></svg>`
}

const BUILDERS = {
  lake: () => mountains('#4b6074', '#2f4a3a', '#9cc4e4', '#e8d9c0',
    `<rect y="440" width="900" height="160" fill="url(#w)"/>${pines(450, '#1f3526', 22, 5)}<rect x="560" y="380" width="120" height="70" fill="#6b4a2f"/><path d="M548 384 L620 340 L692 384Z" fill="#3b2a1d"/><rect x="600" y="410" width="22" height="40" fill="#f3d18b"/>`),
  valley: () => mountains('#7d8790', '#3d5a45', '#7fb1db', '#dbe8f0',
    `<path d="M560 420 L600 120 L700 110 L740 420Z" fill="#a9b1b8"/><path d="M600 120 L700 110 L705 160 L605 170Z" fill="#c7cdd2"/>${pines(520, '#22402c', 26, 9)}<rect y="520" width="900" height="80" fill="#2b4a33"/>`),
  roadside: () => mountains('#8a7a5e', '#6f6a45', '#a8cbe6', '#f1e3c4',
    `<rect y="470" width="900" height="130" fill="#3a3a3a"/><rect y="530" width="900" height="6" fill="#e7c65a"/><rect x="120" y="330" width="260" height="140" fill="#b5503c"/><path d="M105 335 L250 270 L395 335Z" fill="#5e2b20"/><rect x="170" y="380" width="60" height="90" fill="#3b2a1d"/><rect x="260" y="370" width="80" height="50" fill="#f3d18b"/>${pines(470, '#3e5a34', 8, 2)}`),
  interior: () => room('#d8c7ad', '#7a5434', '#5b3d23',
    `<rect x="420" y="300" width="360" height="110" rx="18" fill="#56677a"/><rect x="430" y="260" width="340" height="60" rx="16" fill="#6d8297"/><rect x="470" y="310" width="80" height="40" rx="10" fill="#e8d9c0"/><rect x="650" y="310" width="80" height="40" rx="10" fill="#c96f4a"/><rect x="200" y="470" width="500" height="70" rx="8" fill="#a6764c"/><circle cx="820" cy="180" r="34" fill="#f6e2a8"/>`),
  dining: () => room('#3b2f2a', '#5a3b26', '#c38b52',
    `<circle cx="450" cy="70" r="26" fill="#ffd98a"/><circle cx="700" cy="70" r="26" fill="#ffd98a"/><rect x="360" y="330" width="200" height="14" fill="#8d5b34"/><rect x="620" y="330" width="200" height="14" fill="#8d5b34"/><rect x="380" y="344" width="10" height="70" fill="#5b3d23"/><rect x="530" y="344" width="10" height="70" fill="#5b3d23"/><rect x="640" y="344" width="10" height="70" fill="#5b3d23"/><rect x="790" y="344" width="10" height="70" fill="#5b3d23"/><circle cx="420" cy="322" r="12" fill="#f4efe6"/><circle cx="500" cy="322" r="12" fill="#f4efe6"/><circle cx="700" cy="322" r="12" fill="#f4efe6"/>`),
  'dining-warm': () => room('#4a2f22', '#2f1d14', '#e0a35a',
    `<rect x="380" y="120" width="440" height="200" fill="#1b2a3a"/><path d="M380 320 L480 180 L560 260 L660 150 L820 320Z" fill="#6d7a86"/><circle cx="600" cy="420" r="80" fill="#f1e6d6"/><circle cx="600" cy="420" r="52" fill="#9b3d2a"/><rect x="520" y="500" width="160" height="12" fill="#c9a36a"/>`),
  pizza: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice"><rect width="900" height="600" fill="#5a3a24"/><circle cx="450" cy="300" r="250" fill="#c98a43"/><circle cx="450" cy="300" r="220" fill="#d8452f"/><circle cx="450" cy="300" r="210" fill="#f2cf73" opacity=".85"/>${[[380, 220], [520, 240], [460, 340], [350, 360], [560, 380], [450, 180], [610, 300], [300, 280]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="#a3281e"/>`).join('')}<path d="M450 300 L450 50" stroke="#5a3a24" stroke-width="6"/><path d="M450 300 L666 425" stroke="#5a3a24" stroke-width="6"/></svg>`,
  brewery: () => room('#2c2622', '#4b3322', '#d9a441',
    `<rect x="380" y="120" width="420" height="40" fill="#1a1512"/><text x="590" y="149" font-family="Arial" font-size="24" fill="#d9a441" text-anchor="middle">TAPS</text>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${410 + i * 62}" y="170" width="16" height="60" fill="#b8b8b8"/>`).join('')}<rect x="360" y="320" width="460" height="24" fill="#6b4426"/>${[0, 1, 2].map((i) => `<rect x="${430 + i * 120}" y="250" width="44" height="70" rx="6" fill="#e3a83a"/><rect x="${430 + i * 120}" y="244" width="44" height="14" rx="6" fill="#f6f0e0"/>`).join('')}`),
}

export function buildPhotoFiles() {
  const files = {}
  for (const [id, scene] of Object.entries(SCENES)) files[`${id}.svg`] = BUILDERS[scene]()
  return files
}
