// Renders stand-in campaign/news/blog pictures (stub for the API's S3 file storage).
// Layered landscape illustrations with a category motif, rendered SVG -> JPEG with sharp.
const fs = require('fs')
const path = require('path')
const sharp = require(path.join(__dirname, '../../node_modules/sharp'))

const CACHE = path.join(__dirname, 'img-cache')
fs.mkdirSync(CACHE, { recursive: true })

const palettes = {
  medical: [['#cfe9ff', '#f7fbff'], ['#7cc3f5', '#4a9fd8', '#2f6fa8'], '#ff6b6b'],
  charity: [['#ffe2b8', '#fff6e8'], ['#f3b562', '#e0884a', '#a85c35'], '#e2533d'],
  disasters: [['#9fb3c8', '#d9e2ec'], ['#6b7f95', '#4c5d70', '#334155'], '#f59e0b'],
  education: [['#d8ccff', '#f4f0ff'], ['#9b87f5', '#7562d8', '#4c3fa3'], '#facc15'],
  events: [['#ffc2d6', '#fff0f5'], ['#f07aa3', '#c94f7c', '#8e3358'], '#fde047'],
  environment: [['#c9f2d6', '#f2fff5'], ['#6fcf97', '#3fa86b', '#256d45'], '#fbbf24'],
  sport: [['#bfe8ff', '#effaff'], ['#62c370', '#3a9c4b', '#256b31'], '#f97316'],
  art: [['#ffd9c2', '#fff5ee'], ['#d98f6b', '#b56a4b', '#7e4632'], '#6366f1'],
  animals: [['#ffe9a8', '#fffbea'], ['#c8a96b', '#a5824a', '#6f5530'], '#ef4444'],
  nature: [['#b9e4f0', '#f0fbff'], ['#5fb3a1', '#3e8a7a', '#285e53'], '#fcd34d'],
  others: [['#cde4ff', '#f5faff'], ['#32a9fe', '#2584c7', '#294e85'], '#ffcb57'],
}
const motifs = {
  medical: (c) => `<path d="M0 -40 C -40 -90 -110 -40 -60 15 L0 70 L60 15 C110 -40 40 -90 0 -40Z" fill="${c}" opacity="0.92"/><rect x="-10" y="-20" width="20" height="56" fill="#fff"/><rect x="-28" y="-2" width="56" height="20" fill="#fff"/>`,
  charity: (c) => `<circle cx="-30" cy="-10" r="34" fill="${c}"/><circle cx="35" cy="0" r="26" fill="#fff" opacity="0.9"/><path d="M-90 70 Q0 10 90 70Z" fill="${c}" opacity="0.8"/>`,
  disasters: (c) => `<path d="M-80 60 L-40 -10 L0 40 L40 -40 L80 60Z" fill="#fff" opacity="0.85"/><path d="M-20 -60 L10 -60 L-5 -20 L20 -20 L-25 40 L-10 0 L-30 0Z" fill="${c}"/>`,
  education: (c) => `<path d="M-90 0 L0 -45 L90 0 L0 45Z" fill="${c}"/><rect x="-55" y="15" width="110" height="45" rx="8" fill="#fff" opacity="0.9"/><line x1="70" y1="5" x2="70" y2="60" stroke="${c}" stroke-width="6"/>`,
  events: (c) => `<circle cx="0" cy="0" r="58" fill="${c}"/><circle cx="-60" cy="-45" r="14" fill="#fff"/><circle cx="70" cy="-30" r="10" fill="#fff"/><circle cx="50" cy="55" r="12" fill="#fff"/>`,
  environment: (c) => `<rect x="-8" y="10" width="16" height="60" fill="#7c4a2d"/><circle cx="0" cy="-20" r="50" fill="#2f855a"/><circle cx="-35" cy="5" r="30" fill="#38a169"/><circle cx="38" cy="2" r="32" fill="#48bb78"/><circle cx="70" cy="-60" r="20" fill="${c}"/>`,
  sport: (c) => `<circle cx="0" cy="0" r="60" fill="#fff"/><circle cx="0" cy="0" r="60" fill="none" stroke="${c}" stroke-width="8"/><path d="M-60 0 Q0 -40 60 0 M-60 0 Q0 40 60 0" stroke="${c}" stroke-width="6" fill="none"/>`,
  art: (c) => `<ellipse cx="0" cy="0" rx="85" ry="60" fill="#fff" opacity="0.92"/><circle cx="-40" cy="-15" r="12" fill="${c}"/><circle cx="-5" cy="-30" r="12" fill="#ef4444"/><circle cx="32" cy="-18" r="12" fill="#10b981"/><circle cx="40" cy="18" r="12" fill="#f59e0b"/>`,
  animals: (c) => `<ellipse cx="0" cy="25" rx="40" ry="34" fill="${c}"/><ellipse cx="-45" cy="-25" rx="16" ry="21" fill="${c}"/><ellipse cx="-15" cy="-50" rx="16" ry="21" fill="${c}"/><ellipse cx="18" cy="-50" rx="16" ry="21" fill="${c}"/><ellipse cx="47" cy="-25" rx="16" ry="21" fill="${c}"/>`,
  nature: (c) => `<path d="M-90 60 L-30 -50 L10 10 L40 -30 L95 60Z" fill="#fff" opacity="0.9"/><circle cx="60" cy="-60" r="22" fill="${c}"/>`,
  others: (c) => `<path d="M0 -40 C -40 -90 -110 -40 -60 15 L0 70 L60 15 C110 -40 40 -90 0 -40Z" fill="${c}"/>`,
}

function prng(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
function svgFor({ kind, seedIdx, role }, w, h) {
  const [sky, hills, accent] = palettes[kind] || palettes.others
  const r = prng(seedIdx * 31 + (role || '').length * 7 + 1)
  const ridge = (base, amp, color, n) => {
    let d = `M0 ${h} L0 ${base}`
    for (let i = 0; i <= n; i++) d += ` Q ${(i - 0.5) * (w / n)} ${base - amp * (0.4 + r())} ${i * (w / n)} ${base - amp * r() * 0.6}`
    return `<path d="${d} L${w} ${h}Z" fill="${color}"/>`
  }
  const sunX = w * (0.15 + r() * 0.7), sunY = h * (0.15 + r() * 0.2)
  const clouds = Array.from({ length: 3 }, () => { const x = r() * w, y = h * (0.1 + r() * 0.3), s = 0.6 + r(); return `<g opacity="0.75" fill="#fff"><ellipse cx="${x}" cy="${y}" rx="${60 * s}" ry="${18 * s}"/><ellipse cx="${x + 30 * s}" cy="${y - 12 * s}" rx="${36 * s}" ry="${20 * s}"/></g>` }).join('')
  const mx = w * (0.3 + r() * 0.4), my = h * 0.48, ms = Math.min(w, h) / 360
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
<radialGradient id="v" cx="0.5" cy="0.45" r="0.8"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></radialGradient></defs>
<rect width="${w}" height="${h}" fill="url(#s)"/>
<circle cx="${sunX}" cy="${sunY}" r="${Math.min(w, h) * 0.09}" fill="#fff6c9" opacity="0.9"/>
${clouds}
${ridge(h * 0.62, h * 0.25, hills[0], 4)}
${ridge(h * 0.74, h * 0.18, hills[1], 6)}
${ridge(h * 0.86, h * 0.12, hills[2], 8)}
<g transform="translate(${mx} ${my}) scale(${ms})">${(motifs[kind] || motifs.others)(accent)}</g>
<rect width="${w}" height="${h}" fill="url(#v)"/>
</svg>`
}
async function renderImage(spec) {
  const [w, h] = spec.role === 'background' ? [1600, 600] : spec.role === 'coordinator' ? [400, 400] : [1200, 800]
  const key = `${spec.kind}-${spec.seedIdx}-${spec.role}.jpg`
  const file = path.join(CACHE, key)
  if (fs.existsSync(file)) return fs.readFileSync(file)
  const buf = await sharp(Buffer.from(svgFor(spec, w, h))).blur(0.6).jpeg({ quality: 82 }).toBuffer()
  fs.writeFileSync(file, buf)
  return buf
}
module.exports = { renderImage }
