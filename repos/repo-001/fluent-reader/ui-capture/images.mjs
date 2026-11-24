// Deterministic SVG stand-ins for remote images (article photos, favicons).
function hash(str) {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}
function rng(seed) {
    let s = seed || 1
    return () => {
        s ^= s << 13
        s ^= s >>> 17
        s ^= s << 5
        return ((s >>> 0) % 10000) / 10000
    }
}

const PALETTES = [
    ["#0f2027", "#203a43", "#2c5364", "#f4d35e"],
    ["#1d3557", "#457b9d", "#a8dadc", "#f1faee"],
    ["#2b2d42", "#8d99ae", "#edf2f4", "#ef233c"],
    ["#283618", "#606c38", "#dda15e", "#fefae0"],
    ["#3d405b", "#e07a5f", "#f2cc8f", "#81b29a"],
    ["#22223b", "#4a4e69", "#9a8c98", "#f2e9e4"],
    ["#003049", "#d62828", "#f77f00", "#fcbf49"],
    ["#14213d", "#fca311", "#e5e5e5", "#ffffff"],
    ["#264653", "#2a9d8f", "#e9c46a", "#f4a261"],
    ["#10002b", "#5a189a", "#9d4edd", "#e0aaff"],
    ["#0b090a", "#660708", "#ba181b", "#f5f3f4"],
    ["#335c67", "#fff3b0", "#e09f3e", "#9e2a2b"],
]

// Photo-like abstract scene: sky gradient, sun/glow, layered hills or blocks.
export function imageSVG(url) {
    const r = rng(hash(url))
    const pal = PALETTES[Math.floor(r() * PALETTES.length)]
    const W = 1200,
        H = 675
    const kind = Math.floor(r() * 3)
    let shapes = ""
    if (kind === 0) {
        // landscape
        const sunX = 200 + r() * 800,
            sunY = 120 + r() * 200
        shapes += `<circle cx="${sunX}" cy="${sunY}" r="${60 + r() * 60}" fill="${pal[3]}" opacity=".85" filter="url(#b)"/>`
        for (let layer = 0; layer < 4; layer++) {
            const base = 330 + layer * 85
            let d = `M0 ${H} L0 ${base}`
            for (let x = 0; x <= W; x += 100)
                d += ` Q${x + 50} ${base - 40 - r() * 110} ${x + 100} ${base - r() * 40}`
            d += ` L${W} ${H} Z`
            shapes += `<path d="${d}" fill="${pal[layer % 3]}" opacity="${0.55 + layer * 0.15}"/>`
        }
    } else if (kind === 1) {
        // city / product blocks
        for (let i = 0; i < 22; i++) {
            const w = 40 + r() * 110,
                h = 120 + r() * 380,
                x = r() * W
            shapes += `<rect x="${x}" y="${H - h}" width="${w}" height="${h}" fill="${pal[Math.floor(r() * 3)]}" opacity="${0.6 + r() * 0.4}"/>`
            for (let k = 0; k < 6; k++)
                shapes += `<rect x="${x + 8 + r() * (w - 20)}" y="${H - h + 10 + r() * (h - 30)}" width="6" height="9" fill="${pal[3]}" opacity=".7"/>`
        }
    } else {
        // macro / bokeh
        for (let i = 0; i < 26; i++)
            shapes += `<circle cx="${r() * W}" cy="${r() * H}" r="${20 + r() * 140}" fill="${pal[Math.floor(r() * 4)]}" opacity="${0.15 + r() * 0.5}" filter="url(#b)"/>`
        shapes += `<ellipse cx="${W / 2 + (r() - 0.5) * 300}" cy="${H / 2 + 60}" rx="${180 + r() * 120}" ry="${110 + r() * 60}" fill="${pal[0]}" opacity=".75"/>`
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="${r().toFixed(2)}" y2="1">
<stop offset="0" stop-color="${pal[0]}"/><stop offset=".6" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="${6 + Math.floor(r() * 10)}"/></filter>
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .08 0"/></filter></defs>
<rect width="100%" height="100%" fill="url(#g)"/>${shapes}<rect width="100%" height="100%" filter="url(#n)"/></svg>`
}

const ICON_COLORS = {
    "theverge.com": ["#5200FF", "#fff", "V"],
    "arstechnica.com": ["#FF4E00", "#fff", "ars"],
    "techcrunch.com": ["#0A9E01", "#fff", "TC"],
    "wired.com": ["#000", "#fff", "W"],
    "nytimes.com": ["#fff", "#000", "T"],
    "bbci.co.uk": ["#BB1919", "#fff", "BBC"],
    "theguardian.com": ["#052962", "#fff", "G"],
    "npr.org": ["#D62021", "#fff", "n"],
    "hnrss.org": ["#FF6600", "#fff", "Y"],
    "github.blog": ["#24292F", "#fff", "GH"],
    "nature.com": ["#C00", "#fff", "N"],
    "quantamagazine.org": ["#BE1E2D", "#fff", "Q"],
    "smashingmagazine.com": ["#E85C33", "#fff", "S"],
    "css-tricks.com": ["#FF7A18", "#fff", "*"],
    "kottke.org": ["#2E6F40", "#fff", "k"],
    "daringfireball.net": ["#4A525A", "#fff", "★"],
    "seriouseats.com": ["#C8102E", "#fff", "SE"],
    "nasa.gov": ["#0B3D91", "#fff", "N"],
    "economist.com": ["#E3120B", "#fff", "E"],
    "simonwillison.net": ["#0b4a6f", "#fff", "SW"],
    "jvns.ca": ["#ff7f50", "#fff", "J"],
    "anandtech.com": ["#004B87", "#fff", "AT"],
    "polygon.com": ["#FF0052", "#fff", "P"],
    "lwn.net": ["#FFCC00", "#000", "LWN"],
    "rust-lang.org": ["#000", "#fff", "R"],
    "nautil.us": ["#111", "#fff", "N"],
    "aeon.co": ["#202020", "#fff", "A"],
    "theatlantic.com": ["#000", "#fff", "A"],
    "japantimes.co.jp": ["#000", "#fff", "JT"],
    "sspai.com": ["#D71A1B", "#fff", "少"],
}
export function iconSVG(host, name) {
    const bare = host.replace(/^www\./, "")
    const key = Object.keys(ICON_COLORS).find(k => bare.endsWith(k))
    let [bg, fg, txt] = key
        ? ICON_COLORS[key]
        : [
              PALETTES[hash(host) % PALETTES.length][0],
              "#fff",
              (name || bare).trim()[0]?.toUpperCase() || "?",
          ]
    const size = txt.length > 2 ? 11 : txt.length === 2 ? 14 : 20
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
<rect width="32" height="32" rx="6" fill="${bg}" stroke="${bg === "#fff" ? "#ccc" : bg}"/>
<text x="16" y="${16 + size * 0.36}" text-anchor="middle" font-family="Georgia, 'Segoe UI', sans-serif" font-weight="700" font-size="${size}" fill="${fg}">${txt}</text></svg>`
}
