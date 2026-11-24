// Renders a studio-style product shot for each catalog item (SVG -> JPEG via the
// repo's own sharp dependency) into .ui-capture/images/<slug>.jpg.
//   node .ui-capture/gen-images.mjs
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const dir = new URL('./images/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });

const C = { kraft: '#c69c6d', kraftD: '#a77d50', cream: '#efe6d6', fog: '#e9e6df', moss: '#6f8a5b', iron: '#9c4a32', night: '#2d3550', ink: '#2b2f3a', walnut: '#5b3a24', maple: '#d9b98c', steel: '#9aa3ab', black: '#2a2a2a', amber: '#9a5a1a', rust: '#b5643c', char: '#3f4246', oat: '#d8ccb4', forest: '#3e5a3f', brass: '#c9a54a', white: '#f7f5f0', glass: 'rgba(220,235,240,0.55)' };
const bgs = { coffee: ['#efe4d4', '#d9c6ad'], tea: ['#e7ecdf', '#c9d4bd'], kitchen: ['#eceae6', '#d2cdc4'], home: ['#ece3da', '#d4c3b2'], apparel: ['#e3e6e9', '#c5cbd1'], stationery: ['#efe9dd', '#d9cfbd'], outdoors: ['#e0e7e2', '#bfcdc4'], gift: ['#efe2d6', '#d8bfa6'] };

const label = (x, y, w, h, text, sub = '', fill = '#f6f1e7', color = '#3b3027') => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}"/>
  <text x="${x + w / 2}" y="${y + h / 2 - (sub ? 6 : -8)}" font-family="Georgia, serif" font-size="${Math.min(30, w / 7)}" fill="${color}" text-anchor="middle">${text}</text>
  ${sub ? `<text x="${x + w / 2}" y="${y + h / 2 + 26}" font-family="Helvetica, Arial" font-size="15" letter-spacing="3" fill="${color}" opacity="0.7" text-anchor="middle">${sub}</text>` : ''}`;
const fern = (x, y, s = 1, c = '#3e5a3f') => `<g transform="translate(${x},${y}) scale(${s})" fill="${c}"><path d="M0 60 Q2 0 0 -60" stroke="${c}" stroke-width="3" fill="none"/>${[-45, -30, -15, 0, 15, 30, 45].map((t, i) => `<ellipse cx="${-10 + i * 0}" cy="${t}" rx="${14 - Math.abs(t) / 6}" ry="4" transform="rotate(-25 0 ${t}) translate(-8 0)"/><ellipse cx="10" cy="${t}" rx="${14 - Math.abs(t) / 6}" ry="4" transform="rotate(25 0 ${t}) translate(8 0)"/>`).join('')}</g>`;

const S = {
  bag: (o) => `<path d="M330 330 L670 330 L690 800 L310 800 Z" fill="${o.c || C.kraft}"/><path d="M330 330 L670 330 L660 270 L340 270 Z" fill="${C.kraftD}"/><rect x="340" y="282" width="320" height="10" fill="#8a6a45"/>${label(370, 440, 260, 200, o.t || 'Fernwood', o.s || '12 OZ · WHOLE BEAN')}${fern(500, 710, 0.6, '#5a4430')}`,
  sampler: () => [0, 1, 2].map((i) => `<g transform="translate(${-200 + i * 200},${i === 1 ? -30 : 40}) scale(0.62) translate(310 330)">${S.bag({ c: [C.kraft, '#b98e60', '#d3ad7f'][i], t: ['Forest', 'Cascadia', 'Single O.'][i], s: '6 OZ' })}</g>`).join(''),
  tin: (o) => `<rect x="380" y="400" width="240" height="370" rx="14" fill="${o.c}"/><rect x="370" y="370" width="260" height="60" rx="10" fill="${o.lid || C.steel}"/>${label(395, 500, 210, 170, o.t, o.s)}`,
  mug: (o) => `<path d="M610 470 q110 0 110 110 q0 110 -110 110" fill="none" stroke="${o.c}" stroke-width="34"/><rect x="330" y="420" width="300" height="360" rx="30" fill="${o.c}"/><ellipse cx="480" cy="425" rx="150" ry="22" fill="${o.rim || '#00000022'}"/>${o.speck ? Array.from({ length: 70 }, (_, i) => `<circle cx="${345 + ((i * 97) % 270)}" cy="${450 + ((i * 53) % 310)}" r="2.5" fill="#00000040"/>`).join('') : ''}<rect x="330" y="740" width="300" height="40" rx="18" fill="#00000018"/>`,
  dripper: (o) => `<path d="M330 400 L670 400 L560 690 L440 690 Z" fill="${o.c}"/><ellipse cx="500" cy="400" rx="170" ry="26" fill="#00000022"/><rect x="400" y="690" width="200" height="30" rx="8" fill="${o.c}"/><path d="M380 430 L560 670" stroke="#ffffff30" stroke-width="10"/><rect x="430" y="720" width="140" height="70" rx="10" fill="${C.glass}" stroke="#9fb2b8"/>`,
  pitcher: () => `<rect x="380" y="300" width="240" height="480" rx="24" fill="${C.glass}" stroke="#a9bcc2" stroke-width="4"/><rect x="390" y="430" width="220" height="340" rx="18" fill="#5b3a1f" opacity="0.85"/><rect x="455" y="280" width="90" height="420" rx="12" fill="#c8ced3" opacity="0.7"/><rect x="370" y="270" width="260" height="40" rx="10" fill="${C.black}"/>`,
  board: () => `<rect x="250" y="420" width="470" height="300" rx="40" fill="${C.walnut}"/><rect x="720" y="520" width="90" height="100" rx="30" fill="${C.walnut}"/><circle cx="775" cy="570" r="16" fill="#00000030"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M270 ${450 + i * 45} q200 ${i % 2 ? 20 : -20} 430 0" stroke="#00000025" stroke-width="3" fill="none"/>`).join('')}`,
  spurtle: () => `<g transform="rotate(-20 500 520)"><rect x="440" y="230" width="38" height="560" rx="18" fill="${C.maple}"/><ellipse cx="459" cy="250" rx="30" ry="14" fill="#c9a676"/><rect x="530" y="330" width="34" height="440" rx="16" fill="#e1c59d"/></g>`,
  towel: (o) => `<rect x="300" y="380" width="400" height="360" rx="10" fill="${o.c}"/><rect x="330" y="350" width="400" height="360" rx="10" fill="${o.c2 || o.c}" stroke="#00000015"/>${o.stripe ? [0, 1, 2].map((i) => `<rect x="330" y="${590 + i * 22}" width="400" height="8" fill="${o.stripe}"/>`).join('') : ''}<path d="M520 350 q10 -40 20 0" stroke="#00000055" stroke-width="5" fill="none"/>`,
  skillet: () => `<circle cx="450" cy="560" r="230" fill="${C.black}"/><circle cx="450" cy="560" r="195" fill="#3a3a3a"/><rect x="660" y="530" width="230" height="56" rx="26" fill="${C.black}"/><circle cx="855" cy="558" r="12" fill="#5c5040"/>`,
  bowls: () => [0, 1, 2, 3].map((i) => `<path d="M260 ${520 + i * 50} Q500 ${700 + i * 50} 740 ${520 + i * 50} Z" fill="${C.oat}" stroke="#b9ab90" stroke-width="3"/>`).join('') + Array.from({ length: 50 }, (_, i) => `<circle cx="${320 + ((i * 89) % 360)}" cy="${560 + ((i * 41) % 160)}" r="2.5" fill="#6b5a40"/>`).join(''),
  butter: () => `<rect x="300" y="580" width="400" height="60" rx="18" fill="${C.white}" stroke="#2f4fa0" stroke-width="10"/><path d="M340 590 L340 450 Q340 410 380 410 L620 410 Q660 410 660 450 L660 590 Z" fill="${C.white}"/><circle cx="500" cy="395" r="22" fill="#2f4fa0"/>`,
  wraps: () => [['#e8b13e', 0], ['#7c9a64', 1], ['#d06b4a', 2]].map(([c, i]) => `<rect x="${310 + i * 40}" y="${380 + i * 70}" width="320" height="260" rx="12" fill="${c}" transform="rotate(${-8 + i * 7} 500 520)"/>`).join('') + Array.from({ length: 30 }, (_, i) => `<path d="M${380 + ((i * 61) % 260)} ${560 + ((i * 37) % 120)} l12 7 l0 14 l-12 7 l-12 -7 l0 -14 z" fill="none" stroke="#ffffff70" stroke-width="2"/>`).join(''),
  candle: (o) => `<rect x="370" y="380" width="260" height="390" rx="30" fill="${C.amber}" opacity="0.92"/><rect x="380" y="400" width="240" height="130" rx="10" fill="#f3ead8" opacity="0.6"/><rect x="360" y="340" width="280" height="60" rx="12" fill="${C.char}"/>${label(395, 560, 210, 140, o.t, '8 OZ · SOY')}`,
  matches: () => `<rect x="420" y="260" width="160" height="520" rx="20" fill="#2f4a3a"/><rect x="420" y="740" width="160" height="40" fill="#5a4030"/>${label(435, 420, 130, 140, 'Fire', 'MATCHES')}${[0, 1, 2].map((i) => `<rect x="${600 + i * 28}" y="${520 + i * 6}" width="10" height="250" fill="${C.maple}" transform="rotate(${8 + i * 4} 600 760)"/><ellipse cx="${605 + i * 28}" cy="${518 + i * 6}" rx="9" ry="13" fill="#a8322a" transform="rotate(${8 + i * 4} 600 760)"/>`).join('')}`,
  blanket: (o) => [0, 1, 2].map((i) => `<rect x="${260 + i * 8}" y="${640 - i * 120}" width="480" height="120" rx="20" fill="${o.c}" stroke="#00000020" stroke-width="3"/>` + Array.from({ length: 24 }, (_, k) => `<path d="M${280 + i * 8 + k * 19} ${650 - i * 120} l10 50 l-10 50" stroke="#ffffff30" stroke-width="3" fill="none"/>`).join('')).join('') + Array.from({ length: 22 }, (_, k) => `<rect x="${280 + k * 20}" y="760" width="4" height="40" fill="${o.c}"/>`).join(''),
  vase: (o) => `<path d="M450 330 L550 330 L545 400 Q650 470 620 620 Q600 760 500 770 Q400 760 380 620 Q350 470 455 400 Z" fill="${o.c}"/><path d="M500 330 Q470 200 430 150 M505 330 Q540 230 600 180 M498 330 Q500 240 510 170" stroke="#5b7a3c" stroke-width="5" fill="none"/><circle cx="430" cy="150" r="14" fill="#e8c34a"/><circle cx="600" cy="180" r="12" fill="#f2f0ea"/><circle cx="510" cy="170" r="12" fill="#d77a5b"/>`,
  tee: (o) => `<path d="M380 300 L620 300 L760 390 L700 480 L650 450 L650 790 L350 790 L350 450 L300 480 L240 390 Z" fill="${o.c}"/><path d="M450 300 Q500 350 550 300" fill="none" stroke="#00000030" stroke-width="8"/>${o.fern ? fern(560, 430, 0.5, '#f1ece2') : ''}`,
  crew: (o) => `<path d="M370 300 L630 300 L760 380 L800 720 L730 730 L680 470 L680 790 L320 790 L320 470 L270 730 L200 720 L240 380 Z" fill="${o.c}"/><rect x="320" y="760" width="360" height="30" fill="#00000020"/><path d="M440 300 Q500 345 560 300" fill="none" stroke="#00000035" stroke-width="12"/>${fern(500, 470, 0.7, '#e9e1cf')}`,
  apron: () => `<path d="M400 300 L600 300 L610 430 Q700 440 720 470 L700 800 L300 800 L280 470 Q300 440 390 430 Z" fill="#6b5a3e"/><path d="M400 300 Q500 160 600 300" fill="none" stroke="#3a2a1a" stroke-width="12"/><rect x="420" y="560" width="160" height="120" rx="8" fill="#5d4d34" stroke="#3a2a1a" stroke-dasharray="8 6" stroke-width="3"/>`,
  cap: (o) => `<path d="M310 640 Q300 330 500 320 Q700 330 690 640 Z" fill="${o.c}"/><rect x="300" y="600" width="400" height="120" rx="16" fill="${o.c}" stroke="#00000025" stroke-width="3"/>${Array.from({ length: 20 }, (_, k) => `<line x1="${315 + k * 19}" y1="610" x2="${315 + k * 19}" y2="715" stroke="#00000025" stroke-width="5"/>`).join('')}`,
  tote: () => `<path d="M420 460 Q420 230 500 230 Q580 230 580 460" fill="none" stroke="#d8cbb0" stroke-width="22"/><rect x="310" y="440" width="380" height="380" rx="8" fill="#ece2cc"/>${fern(500, 620, 0.9, '#3e5a3f')}`,
  journal: (o) => `<rect x="340" y="300" width="330" height="460" rx="12" fill="${o.c}"/><rect x="330" y="300" width="20" height="460" rx="6" fill="#00000030"/><rect x="590" y="300" width="18" height="460" fill="#00000020"/><path d="M640 760 l0 60 l-14 -14 l-14 14 l0 -60" fill="#b5643c"/>${label(400, 380, 180, 90, 'Field Notes', '')}`,
  postcards: () => ['#d9a441', '#6f8a5b', '#4b6a8a', '#c66a4a'].map((c, i) => `<g transform="rotate(${-18 + i * 12} 500 600)"><rect x="300" y="330" width="400" height="270" rx="6" fill="#f6f1e6" stroke="#00000020"/><rect x="315" y="345" width="370" height="240" fill="${c}" opacity="0.85"/><path d="M315 585 L420 470 L500 540 L570 440 L685 585 Z" fill="#ffffff40"/></g>`).join(''),
  pen: () => `<g transform="rotate(-35 500 520)"><rect x="200" y="495" width="560" height="50" rx="24" fill="${C.brass}"/><path d="M760 495 L840 520 L760 545 Z" fill="#b08f3a"/><rect x="300" y="485" width="160" height="12" rx="6" fill="#a8873a"/><rect x="200" y="505" width="560" height="10" fill="#ffffff40"/></g>`,
  cards: () => `<rect x="280" y="420" width="420" height="300" rx="4" fill="#c8a77e" transform="rotate(-6 500 560)"/><rect x="330" y="300" width="340" height="440" rx="4" fill="#f8f4ea" stroke="#00000018"/><text x="500" y="500" font-family="Georgia, serif" font-style="italic" font-size="46" fill="#9c4a32" text-anchor="middle">thank</text><text x="500" y="560" font-family="Georgia, serif" font-style="italic" font-size="46" fill="#9c4a32" text-anchor="middle">you</text>${fern(500, 650, 0.5, '#6f8a5b')}`,
  calendar: () => `<rect x="320" y="220" width="360" height="560" rx="6" fill="#f7f2e8" stroke="#00000020"/><rect x="340" y="250" width="320" height="250" fill="#d9a441" opacity="0.4"/><g transform="translate(500,380)"><circle r="40" fill="#c66a4a"/>${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse rx="22" ry="48" transform="rotate(${a}) translate(0 -50)" fill="#e9a07a"/>`).join('')}<circle r="22" fill="#e8c34a"/></g>${Array.from({ length: 35 }, (_, i) => `<rect x="${350 + (i % 7) * 44}" y="${540 + Math.floor(i / 7) * 42}" width="30" height="26" fill="#00000012"/>`).join('')}<text x="500" y="530" font-family="Georgia" font-size="22" fill="#3b3027" text-anchor="middle">JANUARY 2027</text>`,
  bottle: () => `<rect x="410" y="320" width="180" height="470" rx="60" fill="#3e5a3f"/><rect x="440" y="260" width="120" height="80" rx="14" fill="#2f2f2f"/><rect x="420" y="330" width="160" height="12" fill="#00000030"/>${fern(500, 560, 0.7, '#e9e1cf')}`,
  hammock: () => `<path d="M180 380 Q500 760 820 380" fill="none" stroke="#6e4f33" stroke-width="10"/><path d="M220 400 Q500 820 780 400 Q500 650 220 400 Z" fill="#d06b4a"/><path d="M250 420 Q500 770 750 420" fill="none" stroke="#e8b13e" stroke-width="10"/><rect x="160" y="250" width="40" height="560" fill="#7a5a3a"/><rect x="800" y="250" width="40" height="560" fill="#7a5a3a"/>`,
  stool: () => `<line x1="380" y1="800" x2="610" y2="420" stroke="#c49a6c" stroke-width="26"/><line x1="620" y1="800" x2="390" y2="420" stroke="#c49a6c" stroke-width="26"/><line x1="500" y1="810" x2="500" y2="430" stroke="#b78c5e" stroke-width="26"/><path d="M340 400 Q500 470 660 400 L640 440 Q500 500 360 440 Z" fill="#6b5a3e"/>`,
  crate: (o) => `${o.inner || ''}<rect x="250" y="560" width="500" height="230" fill="#c9a274"/>${[0, 1, 2].map((i) => `<rect x="250" y="${570 + i * 75}" width="500" height="10" fill="#a8804f"/>`).join('')}<rect x="250" y="560" width="500" height="230" fill="none" stroke="#8e6a3e" stroke-width="6"/>`,
  infuser: () => `<circle cx="500" cy="580" r="150" fill="${C.steel}"/>${Array.from({ length: 120 }, (_, i) => `<circle cx="${380 + (i % 12) * 22}" cy="${470 + Math.floor(i / 12) * 22}" r="4" fill="#6a737b"/>`).join('')}<circle cx="500" cy="580" r="150" fill="none" stroke="#7e878f" stroke-width="10"/><path d="M500 430 Q520 330 600 280" stroke="#7e878f" stroke-width="8" fill="none"/>`,
  grinder: () => `<rect x="400" y="380" width="200" height="400" rx="20" fill="#c2c7cc"/><rect x="400" y="560" width="200" height="40" fill="#8f979e"/><rect x="430" y="330" width="140" height="60" rx="10" fill="#7a8289"/><path d="M500 330 L500 280 L680 260" stroke="#3a3a3a" stroke-width="16" fill="none"/><circle cx="690" cy="258" r="30" fill="${C.walnut}"/>`,
  kettle: () => `<path d="M360 470 Q350 400 420 390 L580 390 Q650 400 640 470 L660 780 L340 780 Z" fill="${C.black}"/><path d="M380 720 Q240 560 220 420 L245 410" stroke="${C.black}" stroke-width="22" fill="none"/><path d="M620 460 Q760 470 760 600 Q760 700 650 710" fill="none" stroke="${C.walnut}" stroke-width="26"/><rect x="460" y="350" width="80" height="44" rx="10" fill="#444"/><circle cx="500" cy="340" r="20" fill="#cfcfcf"/>`,
};

// slug -> [bg, shape, opts]
const M = {
  'forest-floor-house-blend': ['coffee', 'bag', { t: 'Forest Floor', s: 'HOUSE BLEND · 12 OZ' }],
  'cascadia-dark-roast': ['coffee', 'bag', { c: '#3a2c22', t: 'Cascadia', s: 'DARK ROAST · 12 OZ' }],
  'ethiopia-guji': ['coffee', 'bag', { c: '#d7b98e', t: 'Guji', s: 'ETHIOPIA · 10 OZ' }],
  'decaf-swiss-water': ['coffee', 'bag', { c: '#8fa3a8', t: 'Decaf', s: 'SWISS WATER · 12 OZ' }],
  'coffee-sampler': ['coffee', 'sampler', {}],
  'old-growth-earl-grey': ['tea', 'tin', { c: '#2d3550', t: 'Earl Grey', s: 'OLD GROWTH' }],
  'mountain-mint-tea': ['tea', 'tin', { c: '#6f8a5b', t: 'Mountain', s: 'MINT' }],
  'sencha-green-tea': ['tea', 'tin', { c: '#a9b86a', t: 'Sencha', s: 'MORNING' }],
  'ceramic-pour-over-dripper': ['kitchen', 'dripper', { c: C.fog }],
  'stoneware-mug': ['kitchen', 'mug', { c: C.moss }],
  'cold-brew-pitcher': ['kitchen', 'pitcher', {}],
  'walnut-serving-board': ['kitchen', 'board', {}],
  'maple-spurtle-set': ['kitchen', 'spurtle', {}],
  'linen-tea-towels': ['kitchen', 'towel', { c: '#d8cdb8', c2: '#e3d9c5', stripe: '#3f4246' }],
  'cast-iron-skillet': ['kitchen', 'skillet', {}],
  'speckled-pasta-bowls': ['kitchen', 'bowls', {}],
  'enamel-butter-dish': ['kitchen', 'butter', {}],
  'beeswax-wraps': ['kitchen', 'wraps', {}],
  'douglas-fir-candle': ['home', 'candle', { t: 'Douglas Fir' }],
  'rainy-day-candle': ['home', 'candle', { t: 'Rainy Day' }],
  'coastal-fog-candle': ['home', 'candle', { t: 'Coastal Fog' }],
  'campfire-matches': ['home', 'matches', {}],
  'wool-throw-blanket': ['home', 'blanket', { c: '#8b8f93' }],
  'bud-vase': ['home', 'vase', { c: '#7c9a8c' }],
  'cedar-sachets': ['home', 'towel', { c: '#efe6d6', c2: '#e6dac4' }],
  'fernwood-logo-tee': ['apparel', 'tee', { c: '#4a5a46', fern: true }],
  'waxed-canvas-apron': ['apparel', 'apron', {}],
  'merino-watch-cap': ['apparel', 'cap', { c: C.rust }],
  'fern-crewneck': ['apparel', 'crew', { c: '#5d6b7a' }],
  'canvas-market-tote': ['apparel', 'tote', {}],
  'field-notes-journal': ['stationery', 'journal', { c: C.moss }],
  'pnw-postcards': ['stationery', 'postcards', {}],
  'brass-pen': ['stationery', 'pen', {}],
  'letterpress-cards': ['stationery', 'cards', {}],
  'wall-calendar-2027': ['stationery', 'calendar', {}],
  'insulated-camp-bottle': ['outdoors', 'bottle', {}],
  'enamel-camp-mug': ['outdoors', 'mug', { c: '#2f4a6a', speck: true, rim: '#e8e8e8' }],
  'trail-mix-tin': ['outdoors', 'tin', { c: '#b5643c', t: 'Trail Mix', s: '8 OZ' }],
  'packable-hammock': ['outdoors', 'hammock', {}],
  'folding-camp-stool': ['outdoors', 'stool', {}],
  'morning-ritual-gift-set': ['gift', 'crate', { inner: `<g transform="translate(-120,-40) scale(0.7) translate(200 120)">${S.bag({ t: 'Forest Floor', s: '12 OZ' })}</g><g transform="translate(170,40) scale(0.55) translate(330 180)">${S.mug({ c: C.fog })}</g>` }],
  'cabin-weekend-gift-set': ['gift', 'crate', { inner: `<g transform="translate(-150,10) scale(0.6) translate(330 220)">${S.candle({ t: 'Douglas Fir' })}</g><g transform="translate(120,20) scale(0.6) translate(330 150)">${S.cap({ c: C.char })}</g>` }],
  'tea-lovers-gift-set': ['gift', 'crate', { inner: [['#2d3550', 'Earl Grey'], ['#6f8a5b', 'Mint'], ['#a9b86a', 'Sencha']].map(([c, t], i) => `<g transform="translate(${-170 + i * 170},20) scale(0.6) translate(330 230)">${S.tin({ c, t, s: '' })}</g>`).join('') }],
  'stainless-tea-infuser': ['tea', 'infuser', {}],
  'hand-grinder': ['coffee', 'grinder', {}],
  'gooseneck-kettle': ['coffee', 'kettle', {}],
};

for (const [slug, [bg, shape, opts]] of Object.entries(M)) {
  const [a, b] = bgs[bg];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.68" stop-color="${a}"/><stop offset="0.68" stop-color="${b}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="s"><stop offset="0" stop-color="#000" stop-opacity="0.28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="v" cx="0.5" cy="0.4" r="0.75"><stop offset="0.6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></radialGradient></defs>
    <rect width="1000" height="1000" fill="url(#g)"/>
    <ellipse cx="500" cy="800" rx="300" ry="42" fill="url(#s)"/>
    ${S[shape](opts)}
    <rect width="1000" height="1000" fill="url(#v)"/>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(`${dir}${slug}.jpg`);
}
console.error(`rendered ${Object.keys(M).length} images`);
