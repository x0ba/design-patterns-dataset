import { makeRand, hashStr } from './rng.js'

// Reference "photos" are rendered as stylised SVG scenes so the app ships with no image assets.
const W = 480, H = 320
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`
const shade = (h, s, l, d) => hsl(h, s, Math.max(4, Math.min(96, l + d)))

export const SHOTS = {
  Courthouse: [
    ['Main courtroom, from the gallery rail', 'Gallery', 'gallery'], ['Main courtroom, from the back doors', 'Courtroom', 'court'], ['Bench and witness stand', 'Courtroom', 'bench'],
    ['Exterior, front elevation', 'Exterior', 'ext'], ['Second-floor corridor', 'Corridors', 'hall'], ['Lobby and stair', 'Lobby', 'lobby'], ['Gallery, north side', 'Gallery', 'gallery'],
    ['Jury box and well', 'Courtroom', 'court'], ['Exterior, rear lot', 'Exterior', 'ext'], ['Records room', 'Support', 'hall'],
  ],
  'Main street segment': [
    ['Looking north, midday', 'Street', 'street'], ['Looking south, dusk', 'Street', 'dusk'], ['Storefront row, west side', 'Storefronts', 'row'], ['Night, signage lit', 'Night', 'night'],
    ['Intersection with side street', 'Street', 'street'], ['Alley access and loading', 'Support', 'row'], ['Sidewalk detail', 'Storefronts', 'row'],
  ],
  'Rail yard': [
    ['Main lead, looking toward the yard', 'Track', 'tracks'], ['Siding with freight cars', 'Rolling stock', 'cars'], ['Water tower and shed', 'Structures', 'tower'], ['Roundhouse bays', 'Structures', 'bays'],
    ['Switch stand detail', 'Track', 'tracks'], ['Dusk, east end', 'Track', 'cars'], ['Gate and access road', 'Access', 'tower'],
  ],
}
const GENERIC = [
  ['Exterior, front', 'Exterior', 'bldg'], ['Interior, main space', 'Interior', 'room'], ['Site and approach', 'Site', 'site'], ['Exterior, side elevation', 'Exterior', 'bldg'],
  ['Interior, secondary space', 'Interior', 'room'], ['Parking and staging', 'Site', 'site'], ['Detail', 'Interior', 'room'],
]
export function shotList(loc) {
  const base = SHOTS[loc.type] || GENERIC
  const out = []
  for (let i = 0; i < loc.photos; i++) {
    const s = base[i % base.length]
    out.push({ i, caption: s[0] + (i >= base.length ? ` (${Math.floor(i / base.length) + 1})` : ''), cat: s[1], kind: s[2] })
  }
  return out
}

const cache = new Map()
export function photoUrl(loc, i, kind) {
  const key = loc.id + ':' + i
  if (cache.has(key)) return cache.get(key)
  const svg = render(loc, i, kind)
  const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
  cache.set(key, url)
  return url
}
export function thumbKind(loc, i = 0) { return shotList({ ...loc, photos: Math.max(1, i + 1) })[i].kind }

function render(loc, i, kind) {
  const seed = hashStr(loc.id) + i * 97
  const R = makeRand(seed)
  const body = (SCENES[kind] || SCENES.bldg)(R, loc, makeRand(hashStr(loc.id)))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`
}

// per-location palette (stable between shots)
function pal(loc, P) {
  const eras = loc.lookEras || []
  const seventies = eras.includes('1970s')
  const old = (loc.yearBuilt || 1950) < 1935
  if (loc.type === 'Courthouse') {
    if (seventies) return { wall: hsl(26, 38, 28), panel: hsl(24, 45, 24), accent: P.pick([hsl(24, 70, 40), hsl(78, 30, 34), hsl(36, 78, 44)]), floor: P.pick([hsl(20, 62, 30), hsl(80, 24, 28), hsl(32, 66, 34)]), ceil: hsl(45, 12, 82), light: hsl(52, 80, 90), seat: hsl(22, 50, 22), stone: hsl(38, 8, 66) }
    if (old) return { wall: hsl(36, 22, 70), panel: hsl(26, 52, 28), accent: hsl(8, 44, 32), floor: hsl(36, 10, 72), ceil: hsl(40, 25, 78), light: hsl(48, 70, 86), seat: hsl(24, 55, 20), stone: hsl(38, 18, 74) }
    return { wall: hsl(40, 12, 66), panel: hsl(28, 30, 34), accent: hsl(200, 18, 34), floor: hsl(210, 10, 38), ceil: hsl(40, 10, 84), light: hsl(52, 40, 92), seat: hsl(210, 14, 26), stone: hsl(40, 6, 72) }
  }
  return { wall: hsl(30, 14, 60), panel: hsl(28, 20, 40), accent: hsl(18, 50, 42), floor: hsl(30, 10, 46), ceil: hsl(40, 8, 80), light: hsl(50, 60, 90), seat: hsl(25, 20, 30), stone: hsl(35, 6, 70) }
}
const skyDay = (P, id = 'sky') => {
  const h = P.pick([205, 210, 198, 214])
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h, 55, 62)}"/><stop offset="1" stop-color="${hsl(h - 8, 50, 84)}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`
}
const skyDusk = (id = 'dusk') => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(232, 38, 22)}"/><stop offset=".6" stop-color="${hsl(8, 52, 48)}"/><stop offset="1" stop-color="${hsl(34, 80, 66)}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`
const skyNight = (id = 'night') => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(228, 40, 8)}"/><stop offset="1" stop-color="${hsl(226, 30, 18)}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`
const vignette = `<defs><radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#vg)"/>`

const SCENES = {
  court(P, loc, L) {
    const c = pal(loc, L)
    const brut = (loc.styles || []).some((s) => /Brutal|Modern|Contemp/.test(s))
    let s = `<rect width="${W}" height="${H}" fill="${c.wall}"/>`
    s += `<rect y="0" width="${W}" height="70" fill="${c.ceil}"/>`
    // ceiling grid or coffers
    for (let x = 0; x <= W; x += 60) s += `<rect x="${x}" y="0" width="2" height="70" fill="${shade(40, 8, 60, 0)}" opacity=".5"/>`
    for (let x = 40; x < W; x += 110) s += `<rect x="${x}" y="18" width="70" height="14" fill="${c.light}" opacity=".95"/>`
    // paneled back wall
    s += `<rect x="40" y="70" width="400" height="150" fill="${c.panel}"/>`
    for (let x = 48; x < 436; x += 38) s += `<rect x="${x}" y="82" width="30" height="${brut ? 110 : 120}" fill="${shade(24, 40, 26, P.int(-3, 3))}" stroke="${shade(24, 40, 14, 0)}" stroke-width="1.5"/>`
    s += `<circle cx="240" cy="100" r="22" fill="${c.accent}" opacity=".9"/><circle cx="240" cy="100" r="15" fill="none" stroke="${c.light}" stroke-width="2" opacity=".7"/>`
    // flags
    s += `<rect x="92" y="96" width="4" height="120" fill="#3a2a18"/><rect x="96" y="98" width="34" height="22" fill="${hsl(220, 50, 30)}"/>`
    s += `<rect x="384" y="96" width="4" height="120" fill="#3a2a18"/><rect x="350" y="98" width="34" height="22" fill="${hsl(8, 60, 36)}"/>`
    // bench
    s += `<polygon points="170,168 310,168 322,226 158,226" fill="${shade(24, 45, 20, 0)}"/><rect x="164" y="160" width="152" height="12" fill="${shade(24, 40, 30, 0)}"/>`
    s += `<rect x="228" y="136" width="24" height="30" rx="8" fill="#2a1d14"/>`
    // floor
    s += `<rect y="222" width="${W}" height="${H - 222}" fill="${c.floor}"/>`
    for (let y = 232; y < H; y += 14) s += `<rect y="${y}" width="${W}" height="2" fill="#000" opacity=".12"/>`
    // jury box side
    s += `<polygon points="360,196 440,190 440,236 360,244" fill="${shade(24, 45, 22, 0)}"/>`
    for (let k = 0; k < 4; k++) s += `<rect x="${368 + k * 17}" y="${180 + k * 0}" width="11" height="14" rx="4" fill="#2a1d14"/>`
    // counsel tables
    s += `<rect x="130" y="250" width="100" height="18" fill="${shade(24, 40, 28, 0)}"/><rect x="250" y="250" width="100" height="18" fill="${shade(24, 40, 28, 0)}"/>`
    // gallery pews foreground
    for (let k = 0; k < 3; k++) s += `<rect x="0" y="${288 + k * 12}" width="${W}" height="8" fill="${c.seat}" opacity="${0.75 + k * 0.1}"/>`
    s += vignette
    return s
  },
  gallery(P, loc, L) {
    const c = pal(loc, L)
    const solid = (loc.styles || []).some((s) => /Brutal|Modern|Contemp|International/.test(s))
    let s = `<rect width="${W}" height="${H}" fill="${c.wall}"/><rect width="${W}" height="60" fill="${c.ceil}"/>`
    for (let x = 30; x < W; x += 120) s += `<rect x="${x}" y="14" width="70" height="12" fill="${c.light}"/>`
    // courtroom far below
    s += `<rect x="80" y="70" width="320" height="90" fill="${c.panel}"/>`
    for (let x = 86; x < 396; x += 30) s += `<rect x="${x}" y="78" width="24" height="70" fill="${shade(24, 40, 26, P.int(-3, 3))}"/>`
    s += `<polygon points="190,132 290,132 296,160 184,160" fill="${shade(24, 45, 20, 0)}"/>`
    s += `<rect y="160" width="${W}" height="${H - 160}" fill="${c.floor}"/>`
    // rows of pews descending toward the front
    for (let k = 0; k < 6; k++) {
      const y = 170 + k * 14, w = 280 + k * 36
      s += `<rect x="${(W - w) / 2}" y="${y}" width="${w}" height="9" fill="${c.seat}"/>`
    }
    // foreground balcony rail
    if (solid) s += `<rect x="0" y="262" width="${W}" height="${H - 262}" fill="${c.stone}"/><rect x="0" y="256" width="${W}" height="10" fill="${shade(38, 6, 58, 0)}"/>`
    else {
      s += `<rect x="0" y="250" width="${W}" height="10" fill="${c.panel}"/>`
      for (let x = 6; x < W; x += 22) s += `<rect x="${x}" y="260" width="8" height="${H - 260}" fill="${shade(24, 40, 22, 0)}"/>`
    }
    s += `<rect x="0" y="${H - 18}" width="${W}" height="18" fill="${c.seat}"/>`
    s += vignette
    return s
  },
  bench(P, loc, L) {
    const c = pal(loc, L)
    const pw = L.pick([48, 60, 80]), seal = L.pick([24, 30, 38]), bx = L.pick([0, 20, -20])
    let s = `<rect width="${W}" height="${H}" fill="${c.panel}"/>`
    for (let x = 0; x < W; x += pw) s += `<rect x="${x + 4}" y="20" width="${pw - 8}" height="170" fill="${shade(24, 40, 24, P.int(-4, 4))}" stroke="${shade(24, 40, 12, 0)}" stroke-width="2"/>`
    s += `<rect x="150" y="40" width="180" height="90" fill="${c.accent}" opacity=".35"/><circle cx="${240 + bx}" cy="85" r="${seal}" fill="${c.accent}" opacity=".85"/>`
    s += `<polygon points="90,170 390,170 420,320 60,320" fill="${shade(24, 42, 18, 0)}"/><rect x="80" y="160" width="320" height="16" fill="${shade(24, 40, 30, 0)}"/>`
    s += `<rect x="${212 + bx}" y="110" width="56" height="60" rx="22" fill="#241912"/>`
    s += vignette
    return s
  },
  hall(P, loc, L) {
    const c = pal(loc, L)
    let s = `<rect width="${W}" height="${H}" fill="${c.wall}"/>`
    s += `<polygon points="0,0 160,90 160,230 0,${H}" fill="${shade(30, 14, 50, -6)}"/><polygon points="${W},0 320,90 320,230 ${W},${H}" fill="${shade(30, 14, 50, -10)}"/>`
    s += `<rect x="160" y="90" width="160" height="140" fill="${shade(40, 10, 72, 4)}"/><polygon points="0,0 ${W},0 320,90 160,90" fill="${c.ceil}"/><polygon points="0,${H} ${W},${H} 320,230 160,230" fill="${c.floor}"/>`
    for (let k = 0; k < 3; k++) { const x = 190 + k * 8, y = 14 + k * 20; s += `<rect x="${x + 20}" y="${y}" width="${100 - k * 16}" height="${8 - k}" fill="${c.light}"/>` }
    s += `<rect x="30" y="70" width="60" height="180" fill="${c.panel}" opacity=".9"/><rect x="${W - 90}" y="80" width="56" height="170" fill="${c.panel}" opacity=".9"/>`
    s += `<rect x="215" y="140" width="50" height="90" fill="${c.panel}"/>`
    s += vignette
    return s
  },
  lobby(P, loc, L) {
    const c = pal(loc, L)
    let s = `<rect width="${W}" height="${H}" fill="${c.wall}"/><rect width="${W}" height="80" fill="${c.ceil}"/>`
    s += `<rect y="230" width="${W}" height="90" fill="${c.floor}"/>`
    for (let x = 0; x < W; x += 80) s += `<rect x="${x}" y="80" width="14" height="150" fill="${c.stone}"/>`
    s += `<polygon points="260,230 420,230 420,120 380,120" fill="${c.stone}"/>` + [0, 1, 2, 3, 4].map((k) => `<rect x="${290 + k * 28}" y="${215 - k * 22}" width="26" height="6" fill="${shade(38, 6, 50, 0)}"/>`).join('')
    s += `<rect x="60" y="130" width="110" height="80" fill="${c.panel}"/><rect x="70" y="140" width="90" height="60" fill="${c.light}" opacity=".8"/>`
    s += `<circle cx="240" cy="48" r="24" fill="${c.light}" opacity=".9"/>`
    s += vignette
    return s
  },
  ext(P, loc, L) {
    const brut = (loc.styles || []).some((s) => /Brutal|Modern|Contemp|International/.test(s))
    const stone = hsl(brut ? 36 : 38, brut ? 4 : 14, brut ? 62 : 74)
    let s = skyDay(P)
    s += `<rect y="262" width="${W}" height="58" fill="${hsl(95, 22, 38)}"/>`
    if (brut) {
      s += `<rect x="60" y="150" width="360" height="112" fill="${stone}"/><rect x="100" y="100" width="280" height="56" fill="${shade(36, 4, 56, 0)}"/><rect x="60" y="136" width="360" height="18" fill="${shade(36, 4, 50, 0)}"/>`
      for (let x = 76; x < 410; x += 34) s += `<rect x="${x}" y="168" width="12" height="70" fill="${hsl(210, 20, 22)}"/>`
      s += `<rect x="116" y="112" width="248" height="14" fill="${hsl(210, 20, 22)}"/>`
    } else {
      s += `<rect x="70" y="130" width="340" height="132" fill="${stone}"/><polygon points="130,130 240,70 350,130" fill="${shade(38, 12, 66, 0)}"/>`
      for (let k = 0; k < 6; k++) s += `<rect x="${140 + k * 38}" y="132" width="12" height="130" fill="${shade(38, 10, 84, 0)}"/>`
      s += `<rect x="226" y="86" width="28" height="28" fill="${shade(38, 10, 58, 0)}"/>`
      if (/clock/.test((loc.features || []).join(' '))) s += `<rect x="226" y="30" width="28" height="48" fill="${stone}"/><circle cx="240" cy="48" r="9" fill="#f4efe4"/>`
      for (let y = 0; y < 4; y++) s += `<rect x="${130 + y * 0}" y="${262 - y * 4}" width="${220 + y * 0}" height="4" fill="${shade(38, 8, 70, -y * 4)}"/>`
      for (let x = 86; x < 400; x += 46) if (x < 126 || x > 354) s += `<rect x="${x}" y="150" width="14" height="40" fill="${hsl(210, 20, 28)}"/>`
    }
    s += `<rect x="0" y="262" width="${W}" height="6" fill="${hsl(40, 8, 60)}"/><circle cx="26" cy="230" r="34" fill="${hsl(100, 30, 26)}"/><circle cx="460" cy="236" r="30" fill="${hsl(100, 30, 24)}"/><rect x="22" y="250" width="6" height="14" fill="#3a2a18"/>`
    return s + vignette
  },
  street(P) {
    let s = skyDay(P) + `<rect y="230" width="${W}" height="90" fill="${hsl(220, 6, 34)}"/><rect y="226" width="${W}" height="8" fill="${hsl(40, 6, 66)}"/>`
    const cols = [hsl(8, 50, 40), hsl(24, 54, 44), hsl(30, 30, 52), hsl(14, 44, 34), hsl(200, 14, 44)]
    let x = 0
    while (x < W) {
      const w = P.int(60, 96), h = P.int(110, 168), col = P.pick(cols)
      s += `<rect x="${x}" y="${226 - h}" width="${w - 2}" height="${h}" fill="${col}"/><rect x="${x}" y="${226 - h - 8}" width="${w - 2}" height="8" fill="${shade(20, 20, 30, 0)}"/>`
      for (let wx = x + 8; wx < x + w - 20; wx += 22) s += `<rect x="${wx}" y="${226 - h + 14}" width="14" height="26" fill="${hsl(205, 30, 30)}"/>`
      s += `<rect x="${x + 6}" y="190" width="${w - 14}" height="36" fill="${hsl(210, 20, 24)}"/><polygon points="${x + 2},190 ${x + w - 4},190 ${x + w - 8},178 ${x + 6},178" fill="${P.pick([hsl(2, 60, 42), hsl(150, 40, 30), hsl(40, 70, 50), hsl(210, 50, 36)])}"/>`
      x += w
    }
    for (let k = 0; k < 6; k++) s += `<rect x="${20 + k * 80}" y="258" width="46" height="18" rx="6" fill="${P.pick([hsl(0, 0, 80), hsl(210, 40, 36), hsl(10, 60, 40), hsl(40, 20, 26)])}" transform="skewX(-14)"/>`
    s += `<rect x="236" y="140" width="4" height="92" fill="#222"/><circle cx="238" cy="138" r="6" fill="#f4e7b0"/>`
    return s + vignette
  },
  dusk(P) {
    let s = skyDusk() + `<rect y="226" width="${W}" height="94" fill="${hsl(240, 12, 16)}"/>`
    for (const side of [0, 1]) {
      const pts = side ? `${W},40 330,110 330,226 ${W},262` : `0,40 150,110 150,226 0,262`
      s += `<polygon points="${pts}" fill="${hsl(8, 26, side ? 16 : 20)}"/>`
      for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) { const t = k / 4, x = side ? W - 40 - t * 110 - j * 0 : 30 + t * 110; s += `<rect x="${x}" y="${100 - t * 20 + j * 46 * (1 - t * 0.5)}" width="${18 - t * 8}" height="${24 - t * 10}" fill="${P.chance(0.6) ? hsl(42, 90, 62) : hsl(220, 20, 22)}"/>` }
    }
    s += `<polygon points="150,110 330,110 330,226 150,226" fill="${hsl(14, 40, 40)}" opacity=".75"/><polygon points="226,300 254,300 244,226 236,226" fill="#000" opacity=".25"/>`
    return s + vignette
  },
  night(P) {
    let s = skyNight() + `<rect y="230" width="${W}" height="90" fill="${hsl(230, 14, 12)}"/>`
    let x = 0
    while (x < W) {
      const w = P.int(70, 100), h = P.int(130, 190)
      s += `<rect x="${x}" y="${230 - h}" width="${w - 2}" height="${h}" fill="${hsl(10, 16, 14)}"/>`
      for (let wx = x + 10; wx < x + w - 22; wx += 24) s += `<rect x="${wx}" y="${230 - h + 16}" width="14" height="24" fill="${P.chance(0.5) ? hsl(44, 90, 62) : hsl(220, 20, 18)}"/>`
      const neon = P.pick([hsl(350, 90, 60), hsl(180, 90, 56), hsl(45, 95, 60)])
      s += `<rect x="${x + 10}" y="196" width="${w - 22}" height="16" rx="4" fill="${neon}"/><rect x="${x + 4}" y="188" width="${w - 10}" height="32" rx="8" fill="${neon}" opacity=".18"/>`
      x += w
    }
    s += `<ellipse cx="240" cy="262" rx="220" ry="14" fill="${hsl(40, 90, 60)}" opacity=".12"/>`
    return s + vignette
  },
  row(P) {
    let s = `<rect width="${W}" height="${H}" fill="${hsl(24, 30, 52)}"/>`
    for (let y = 0; y < 220; y += 12) for (let x = (y / 12) % 2 ? 0 : 20; x < W; x += 40) s += `<rect x="${x}" y="${y}" width="38" height="10" fill="${hsl(14, 40, 36 + P.int(-3, 3))}"/>`
    s += `<rect x="30" y="70" width="190" height="150" fill="${hsl(210, 24, 22)}"/><rect x="260" y="70" width="190" height="150" fill="${hsl(210, 24, 22)}"/>`
    s += `<polygon points="20,60 230,60 238,84 12,84" fill="${P.pick([hsl(2, 60, 42), hsl(150, 40, 30), hsl(36, 70, 46)])}"/><polygon points="250,60 460,60 468,84 242,84" fill="${P.pick([hsl(210, 50, 34), hsl(30, 70, 46)])}"/>`
    s += `<rect y="220" width="${W}" height="100" fill="${hsl(40, 8, 62)}"/>`
    for (let x = 0; x < W; x += 60) s += `<rect x="${x}" y="220" width="2" height="100" fill="#000" opacity=".15"/>`
    s += `<rect x="236" y="110" width="8" height="150" fill="#2a2a2a"/>`
    return s + vignette
  },
  tracks(P) {
    let s = skyDay(P) + `<rect y="150" width="${W}" height="170" fill="${hsl(32, 16, 42)}"/>`
    s += `<polygon points="0,150 ${W},150 ${W},158 0,170" fill="${hsl(100, 18, 32)}" opacity=".7"/>`
    for (const dx of [-1, 0, 1]) {
      const bx = 240 + dx * 190
      s += `<polygon points="${bx - 8},320 ${bx + 8},320 ${240 + dx * 4 + 1},150 ${240 + dx * 4 - 1},150" fill="${hsl(20, 30, 32)}"/>`
      s += `<polygon points="${bx + 32},320 ${bx + 48},320 ${240 + dx * 4 + 3},150 ${240 + dx * 4 + 1},150" fill="${hsl(20, 30, 32)}"/>`
      for (let k = 0; k < 9; k++) { const t = Math.pow(k / 9, 1.8), y = 320 - t * 168; const w = 70 * (1 - t); s += `<rect x="${bx + 20 - w / 2 + dx * 0}" y="${y}" width="${w}" height="${5 * (1 - t) + 1}" fill="${hsl(24, 30, 20)}"/>` }
    }
    s += `<rect y="136" width="${W}" height="16" fill="${hsl(110, 20, 30)}"/><circle cx="60" cy="130" r="30" fill="${hsl(110, 22, 28)}"/><circle cx="420" cy="132" r="26" fill="${hsl(100, 22, 26)}"/>`
    s += `<rect x="330" y="84" width="3" height="60" fill="#333"/><rect x="316" y="84" width="30" height="3" fill="#333"/>`
    return s + vignette
  },
  cars(P) {
    let s = skyDay(P) + `<rect y="190" width="${W}" height="130" fill="${hsl(30, 16, 40)}"/><rect y="176" width="${W}" height="16" fill="${hsl(100, 18, 30)}"/>`
    for (let k = 0; k < 4; k++) {
      const x = -20 + k * 130, col = P.pick([hsl(8, 52, 32), hsl(24, 40, 30), hsl(30, 20, 34), hsl(200, 20, 30), hsl(140, 20, 26)])
      s += `<rect x="${x}" y="132" width="124" height="62" fill="${col}"/><rect x="${x}" y="126" width="124" height="8" fill="${shade(0, 0, 20, 0)}"/>`
      for (let j = 1; j < 6; j++) s += `<rect x="${x + j * 20}" y="134" width="2" height="58" fill="#000" opacity=".25"/>`
      s += `<rect x="${x + 28}" y="194" width="14" height="10" fill="#111"/><rect x="${x + 84}" y="194" width="14" height="10" fill="#111"/>`
    }
    s += `<rect y="262" width="${W}" height="6" fill="${hsl(20, 30, 20)}"/><rect y="288" width="${W}" height="6" fill="${hsl(20, 30, 20)}"/>`
    return s + vignette
  },
  tower(P) {
    let s = skyDay(P) + `<rect y="230" width="${W}" height="90" fill="${hsl(30, 16, 38)}"/><rect y="222" width="${W}" height="12" fill="${hsl(100, 18, 30)}"/>`
    s += `<rect x="90" y="60" width="64" height="40" rx="6" fill="${hsl(20, 40, 28)}"/><polygon points="86,60 122,36 158,60" fill="${hsl(20, 30, 22)}"/>`
    for (const x of [96, 142]) s += `<rect x="${x}" y="100" width="5" height="126" fill="${hsl(20, 20, 20)}"/>`
    s += `<line x1="98" y1="110" x2="144" y2="200" stroke="#222" stroke-width="3"/><line x1="144" y1="110" x2="98" y2="200" stroke="#222" stroke-width="3"/>`
    s += `<rect x="250" y="150" width="190" height="82" fill="${hsl(14, 40, 34)}"/><polygon points="244,150 345,118 446,150" fill="${hsl(20, 12, 24)}"/><rect x="268" y="180" width="30" height="52" fill="#1a1512"/><rect x="330" y="172" width="26" height="22" fill="${hsl(205, 20, 40)}"/>`
    for (let k = 0; k < 3; k++) s += `<rect x="0" y="${262 + k * 16}" width="${W}" height="3" fill="${hsl(20, 30, 22)}"/>`
    return s + vignette
  },
  bays(P) {
    let s = skyDay(P) + `<rect y="250" width="${W}" height="70" fill="${hsl(30, 16, 38)}"/>`
    s += `<path d="M20 250 A220 210 0 0 1 460 250 Z" fill="${hsl(14, 36, 30)}"/>`
    for (let k = 0; k < 6; k++) { const a = Math.PI * (0.12 + k * 0.152), cx = 240 - Math.cos(a) * 190, y = 250; s += `<rect x="${cx - 18}" y="${y - 78}" width="36" height="78" rx="18" fill="#171210"/>` }
    for (let k = 0; k < 6; k++) { const bx = 40 + k * 76; s += `<line x1="${bx}" y1="320" x2="${240 + (bx - 240) * 0.55}" y2="250" stroke="${hsl(20, 30, 22)}" stroke-width="3"/>` }
    return s + vignette
  },
  bldg(P, loc, L) {
    const t = loc.type
    let s = skyDay(P) + `<rect y="250" width="${W}" height="70" fill="${hsl(96, 24, 36)}"/>`
    const hue = L.pick([18, 30, 200, 8, 44, 0])
    if (/Farm|Grain/.test(t)) {
      s += `<rect x="150" y="130" width="200" height="120" fill="${hsl(6, 54, 32)}"/><polygon points="132,134 250,72 368,134" fill="${hsl(20, 14, 26)}"/><rect x="214" y="170" width="72" height="80" fill="${hsl(40, 20, 80)}" opacity=".9"/><rect x="380" y="86" width="40" height="164" fill="${hsl(200, 6, 70)}"/><ellipse cx="400" cy="86" rx="20" ry="12" fill="${hsl(200, 6, 62)}"/>`
    } else if (t === 'Residence') {
      s += `<rect x="110" y="150" width="260" height="100" fill="${hsl(hue, 20, 68)}"/><polygon points="90,152 240,84 390,152" fill="${hsl(10, 16, 28)}"/><rect x="330" y="96" width="22" height="44" fill="${hsl(10, 34, 34)}"/><rect x="226" y="190" width="30" height="60" fill="${hsl(20, 40, 24)}"/>` + [140, 290].map((x) => `<rect x="${x}" y="172" width="34" height="36" fill="${hsl(205, 30, 30)}"/>`).join('') + `<rect x="90" y="232" width="300" height="10" fill="${hsl(40, 20, 80)}"/>`
    } else if (t === 'Church') {
      s += `<rect x="120" y="150" width="240" height="100" fill="${hsl(40, 14, 76)}"/><polygon points="110,152 240,100 370,152" fill="${hsl(20, 10, 36)}"/><rect x="214" y="62" width="52" height="92" fill="${hsl(40, 14, 70)}"/><polygon points="208,64 240,10 272,64" fill="${hsl(20, 10, 30)}"/><rect x="226" y="198" width="28" height="52" rx="14" fill="${hsl(10, 40, 26)}"/>`
    } else if (/Warehouse|Quarry|Armory|Hospital|School|Office|Campus|Library|Town|Theater|Hotel|Gas|Retail|Diner|depot/i.test(t)) {
      const tall = /Hospital|Office|Hotel|Campus/.test(t)
      const h = tall ? 150 : 100
      s += `<rect x="90" y="${250 - h}" width="300" height="${h}" fill="${hsl(hue, 22, 54)}"/><rect x="82" y="${250 - h - 8}" width="316" height="10" fill="${hsl(hue, 14, 34)}"/>`
      for (let r = 0; r < (tall ? 4 : 2); r++) for (let c = 0; c < 8; c++) s += `<rect x="${106 + c * 36}" y="${250 - h + 14 + r * 34}" width="20" height="22" fill="${hsl(205, 26, 30)}"/>`
      s += `<rect x="228" y="214" width="26" height="36" fill="${hsl(20, 30, 20)}"/>`
      if (/Warehouse/.test(t)) s += `<rect x="360" y="80" width="14" height="80" fill="${hsl(10, 8, 40)}"/>`
    } else {
      s += `<ellipse cx="240" cy="258" rx="260" ry="26" fill="${hsl(200, 30, 46)}"/><polygon points="0,250 120,190 240,236 360,176 480,240 480,260 0,260" fill="${hsl(110, 22, 28)}"/><circle cx="90" cy="214" r="28" fill="${hsl(110, 26, 24)}"/><circle cx="410" cy="206" r="32" fill="${hsl(110, 26, 22)}"/>`
    }
    s += `<rect x="0" y="250" width="${W}" height="8" fill="${hsl(40, 8, 58)}" opacity=".5"/>`
    return s + vignette
  },
  room(P, loc, L) {
    const c = pal(loc, L)
    let s = `<rect width="${W}" height="${H}" fill="${c.wall}"/><rect width="${W}" height="64" fill="${c.ceil}"/><rect y="236" width="${W}" height="84" fill="${c.floor}"/>`
    for (let x = 20; x < W; x += 150) s += `<rect x="${x}" y="84" width="74" height="104" fill="${hsl(205, 36, 70)}" stroke="${shade(30, 14, 30, 0)}" stroke-width="5"/><rect x="${x + 36}" y="84" width="3" height="104" fill="${shade(30, 14, 30, 0)}"/>`
    for (let x = 60; x < W; x += 140) s += `<rect x="${x}" y="0" width="14" height="64" fill="${c.panel}" opacity=".7"/>`
    s += `<rect x="150" y="212" width="170" height="40" rx="6" fill="${c.panel}"/>`
    return s + vignette
  },
  site(P) {
    let s = skyDay(P) + `<rect y="190" width="${W}" height="130" fill="${hsl(40, 6, 44)}"/>`
    for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) s += `<rect x="${24 + k * 64}" y="${208 + r * 30}" width="34" height="2" fill="#fff" opacity=".6"/>`
    s += `<rect x="60" y="120" width="360" height="72" fill="${hsl(24, 20, 52)}"/><circle cx="450" cy="170" r="24" fill="${hsl(100, 26, 26)}"/>`
    return s + vignette
  },
}

export function thumbUrl(loc) {
  const i = hashStr(loc.id) % Math.min(3, loc.photos)
  return photoUrl(loc, i, thumbKind(loc, i))
}
