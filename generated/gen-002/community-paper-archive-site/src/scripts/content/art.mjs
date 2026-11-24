// Simple SVG illustrations that stand in for scanned photographs in the
// featured stories. Each scene is keyed by name and matches its caption.
// Replace these files with real scans when they are available.

const W = 800;
const H = 500;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img">${body}</svg>`;

const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const poly = (points, fill) => `<polygon points="${points}" fill="${fill}"/>`;
const circ = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
const line = (x1, y1, x2, y2, stroke, w = 3) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;

const person = (x, y, shirt, pants = '#3b3b48', scale = 1) => `
  <g transform="translate(${x} ${y}) scale(${scale})">
    ${circ(0, -62, 14, '#c9a27e')}
    ${rect(-16, -46, 32, 58, shirt, 'rx="6"')}
    ${rect(-14, 10, 12, 60, pants)}
    ${rect(2, 10, 12, 60, pants)}
  </g>`;

const house = (x, y, w, h, wall, roof, windows = true) => `
  ${rect(x, y, w, h, wall)}
  ${poly(`${x - 10},${y} ${x + w / 2},${y - h * 0.45} ${x + w + 10},${y}`, roof)}
  ${windows ? rect(x + w * 0.12, y + h * 0.22, w * 0.2, h * 0.22, '#dfe6ea') + rect(x + w * 0.6, y + h * 0.22, w * 0.2, h * 0.22, '#dfe6ea') : ''}`;

const sky = (top, bottom) => `
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
  ${rect(0, 0, W, H, 'url(#s)')}`;

const scenes = {
  'flood-road': () => svg(`
    ${sky('#a9b4bb', '#d6dcdf')}
    ${rect(0, 60, W, 70, '#5f7069')}
    ${circ(120, 80, 46, '#4d6349')}${circ(650, 70, 58, '#4d6349')}
    ${poly('0,330 800,300 800,500 0,500', '#5e5c59')}
    ${rect(0, 300, W, 200, '#56788a')}
    ${[0, 1, 2, 3, 4, 5].map((i) => line(60 + i * 130, 340 + (i % 2) * 40, 110 + i * 130, 340 + (i % 2) * 40, '#7f9eac', 2)).join('')}
    ${rect(240, 240, 320, 14, '#8a8f93')}
    ${[260, 380, 500].map((x) => rect(x, 254, 10, 60, '#8a8f93')).join('')}
    ${line(240, 226, 560, 226, '#8a8f93', 4)}
    ${rect(580, 180, 10, 120, '#6d6253')}${rect(560, 190, 40, 24, '#c9a441')}`),

  'flood-street': () => svg(`
    ${sky('#b8c0c4', '#e2e4e2')}
    ${house(40, 120, 200, 180, '#c7b7a1', '#6f4f3e')}
    ${house(300, 150, 180, 150, '#9b8c7e', '#4d4a48')}
    ${house(540, 110, 220, 190, '#b9a993', '#6f4f3e')}
    ${rect(0, 300, W, 200, '#6f5a45')}
    ${rect(0, 290, W, 46, '#8d7459')}
    ${rect(0, 290, W, 6, '#5b4733')}
    ${[110, 330, 600].map((x, i) => `<ellipse cx="${x}" cy="${380 + i * 20}" rx="${90 - i * 10}" ry="18" fill="#4a3a2d" opacity=".7"/>`).join('')}
    ${rect(90, 330, 120, 120, '#7d6650')}
    ${rect(0, 440, W, 60, '#5e4e3f')}
    ${[200, 430, 690].map((x) => rect(x, 400, 50, 16, '#6d5b48')).join('')}`),

  'flood-garage': () => svg(`
    ${sky('#aeb7bc', '#dfe1de')}
    ${house(20, 140, 230, 170, '#c6b49f', '#6f4f3e')}
    ${rect(300, 200, 360, 170, '#b2a18c')}
    ${poly('290,200 480,110 670,200', '#5e4a3c')}
    ${rect(360, 250, 130, 120, '#2e2a27')}
    ${rect(500, 260, 120, 110, '#9c8d7d')}
    ${rect(0, 260, W, 160, '#6f5a45')}
    ${rect(300, 240, 360, 6, '#6e3b2c')}
    ${rect(300, 290, 360, 6, '#6e3b2c')}
    ${rect(296, 205, 368, 40, '#8a6d4f', 'opacity=".55"')}
    ${line(300, 235, 660, 235, '#7d5a2f', 5)}
    ${rect(480, 300, 60, 30, '#8d7459')}${rect(160, 380, 90, 22, '#4a3a2d')}
    ${[120, 200, 560, 620].map((x, i) => rect(x, 360 + (i % 2) * 20, 46, 14, '#7b6248')).join('')}`),

  'garage-now': () => svg(`
    ${sky('#9cc4e6', '#e9f2f7')}
    ${house(20, 140, 230, 170, '#e2d5c3', '#4f4a46')}
    ${rect(300, 200, 360, 170, '#dcd0bd')}
    ${poly('290,200 480,110 670,200', '#4d5257')}
    ${rect(360, 250, 130, 120, '#eef0f0')}
    ${[265, 280, 295, 310, 325, 340, 355, 370, 385, 400, 415, 430].map((y) => line(362, y, 488, y, '#c6cacc', 2)).join('')}
    ${rect(500, 260, 120, 110, '#bfb3a2')}
    ${rect(0, 330, W, 170, '#6b8f4e')}
    ${rect(0, 420, W, 80, '#5b7d43')}
    ${rect(480, 300, 60, 30, '#8d7459')}${circ(730, 110, 40, '#57784a')}`),

  'cleanup-crew': () => svg(`
    ${sky('#bcc5c9', '#e7e8e4')}
    ${rect(0, 380, W, 120, '#6f5a45')}
    ${poly('90,380 180,300 260,380', '#6b5846')}
    ${circ(160, 340, 40, '#6b5846')}
    ${rect(440, 260, 220, 120, '#a09482')}
    ${poly('430,260 550,190 670,260', '#5e4a3c')}
    ${person(120, 350, '#3f6f9a')}
    ${person(230, 345, '#c7812f')}
    ${person(360, 350, '#4d7a57')}
    ${person(640, 350, '#8c3b3b')}
    ${line(300, 300, 340, 410, '#7f5c3a', 5)}${rect(290, 290, 24, 14, '#7b7f82')}
    ${rect(430, 400, 140, 60, '#585c60', 'rx="6"')}${line(420, 400, 380, 440, '#585c60', 6)}${circ(470, 470, 16, '#2e2e2e')}${circ(550, 470, 16, '#2e2e2e')}`),

  'meeting-tent': () => svg(`
    ${sky('#b9c6cb', '#e4e7e5')}
    ${rect(0, 400, W, 100, '#6f7b56')}
    ${poly('150,250 400,110 650,250', '#eeeeea')}
    ${rect(150, 250, 500, 6, '#c9c9c3')}
    ${[200, 300, 400, 500, 600].map((x) => line(x, 250, x, 170 + Math.abs(x - 400) * 0.1, '#c9c9c3', 3)).join('')}
    ${rect(300, 330, 200, 16, '#8a6a46')}${rect(340, 346, 14, 60, '#6b4f33')}${rect(446, 346, 14, 60, '#6b4f33')}
    ${person(250, 300, '#3f6f9a', '#3b3b48', 0.7)}
    ${person(330, 290, '#c7812f', '#3b3b48', 0.7)}
    ${person(470, 290, '#4d7a57', '#3b3b48', 0.7)}
    ${person(550, 300, '#8c3b3b', '#3b3b48', 0.7)}`),

  'levee-2026': () => svg(`
    ${sky('#a7cbe6', '#eef4f7')}
    ${poly('0,250 260,170 540,190 800,240 800,500 0,500', '#8b7458')}
    ${poly('0,300 300,240 560,262 800,300 800,500 0,500', '#6e5a43')}
    ${rect(0, 390, W, 110, '#5f6f49')}
    ${rect(400, 280, 130, 60, '#e0b230', 'rx="6"')}
    ${rect(410, 250, 70, 40, '#e0b230', 'rx="4"')}${rect(420, 258, 30, 16, '#8fb8d6')}
    ${circ(430, 350, 22, '#2b2b2b')}${circ(520, 350, 22, '#2b2b2b')}
    ${line(530, 290, 640, 200, '#e0b230', 10)}${poly('630,190 660,210 640,220', '#e0b230')}
    ${[120, 170, 220, 270, 320, 370].map((x, i) => line(x, 300 + i * 4, x, 230 + i * 2, '#d9652b', 3) + poly(`${x},${230 + i * 2} ${x + 22},${236 + i * 2} ${x},${242 + i * 2}`, '#d9652b')).join('')}
    ${line(60, 270, 700, 262, '#f2f2f2', 2)}`),

  'bridge-1971': () => svg(`
    <rect width="${W}" height="${H}" fill="#d9c9a4"/>
    <rect y="330" width="${W}" height="170" fill="#8c7b5a"/>
    <path d="M0 340 Q 200 320 400 340 T 800 340" stroke="#6f6046" stroke-width="3" fill="none"/>
    <rect x="160" y="250" width="480" height="18" fill="#5b5145"/>
    ${[200, 280, 360, 440, 520, 600].map((x) => line(x, 250, x + 40, 160, '#5b5145', 6)).join('')}
    ${[240, 320, 400, 480, 560].map((x) => line(x, 160, x + 40, 250, '#5b5145', 4)).join('')}
    ${line(160, 240, 640, 240, '#5b5145', 4)}
    ${person(230, 225, '#3d3a36', '#2c2a28', 0.6)}
    ${person(330, 222, '#5e5a52', '#2c2a28', 0.6)}
    ${person(430, 226, '#3d3a36', '#2c2a28', 0.5)}`),

  'bridge-2026': () => svg(`
    ${sky('#8fbfe6', '#e8f1f6')}
    ${circ(120, 130, 60, '#5b8a4a')}${circ(700, 120, 70, '#5b8a4a')}
    <rect y="330" width="${W}" height="170" fill="#607d8f"/>
    <rect y="330" width="${W}" height="8" fill="#4e6676"/>
    <rect x="160" y="250" width="480" height="18" fill="#6c7a84"/>
    ${[200, 280, 360, 440, 520, 600].map((x) => line(x, 250, x + 40, 160, '#55626b', 6)).join('')}
    ${[240, 320, 400, 480, 560].map((x) => line(x, 160, x + 40, 250, '#55626b', 4)).join('')}
    ${line(160, 240, 640, 240, '#55626b', 4)}
    ${rect(160, 470, 480, 6, '#9aa6ad')}
    ${person(300, 224, '#3f6f9a', '#2c2a28', 0.5)}`),

  'lights-kettle': () => {
    const bulbs = [];
    const colors = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      const x = 200 + ((i * 37) % 400);
      const y = 150 + ((i * 53) % 200);
      bulbs.push(circ(x, y, 4, colors[i % colors.length]));
    }
    return svg(`
      <rect width="${W}" height="${H}" fill="#1b2442"/>
      ${circ(680, 90, 40, '#e8e4cf')}
      ${rect(0, 380, W, 120, '#2e3f2f')}
      ${house(180, 210, 360, 180, '#6e2e2e', '#2c2c33')}
      ${rect(330, 300, 60, 90, '#2d2320')}
      ${line(180, 210, 540, 210, '#ffd166', 3)}
      ${bulbs.join('')}
      ${poly('640,380 700,190 760,380', '#1f4a2c')}
      ${[0, 1, 2, 3, 4].map((i) => circ(670 + (i % 2) * 40 - 20, 260 + i * 24, 4, colors[i])).join('')}`);
  },
};

export function sceneSvg(name) {
  const fn = scenes[name];
  if (!fn) throw new Error(`Unknown photo scene: ${name}`);
  return fn();
}

export const sceneNames = Object.keys(scenes);

export const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#2f6b3c"/><text x="16" y="23" font-family="Georgia, serif" font-size="20" font-weight="700" text-anchor="middle" fill="#fdfaf2">M</text></svg>`;
