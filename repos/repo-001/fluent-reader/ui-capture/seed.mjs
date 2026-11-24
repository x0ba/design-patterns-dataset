// Builds .ui-capture/data/{fluent-reader.db,config.json}: applies the app's own
// drizzle migrations (dist/drizzle) and fills sources/items the way the app
// stores fetched feeds, plus the electron-store settings (groups, rules, view).
// Dates are relative to "now" so the reader looks freshly synced.
import fs from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { fileURLToPath } from "node:url"
import { GROUPS, SOURCES } from "./seed-sources.mjs"
import { PARAGRAPHS, CN_PARAGRAPHS } from "./seed-text.mjs"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, "..")
const DATA = path.join(HERE, "data")
fs.mkdirSync(DATA, { recursive: true })
const DB_PATH = path.join(DATA, "fluent-reader.db")
for (const f of [DB_PATH, DB_PATH + "-wal", DB_PATH + "-shm"])
    fs.rmSync(f, { force: true })

// deterministic randomness
let seed = 20261117
const rand = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 100000) / 100000
}
const pick = arr => arr[Math.floor(rand() * arr.length)]
const shuffle = arr => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}
const slug = s =>
    s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 70) || "post"

// ---------- schema via the app's migrations ----------
const db = new DatabaseSync(DB_PATH)
db.exec("PRAGMA journal_mode = WAL")
const migDir = path.join(ROOT, "dist", "drizzle")
const journal = JSON.parse(
    fs.readFileSync(path.join(migDir, "meta", "_journal.json"), "utf-8")
)
db.exec(`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
    id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`)
for (const entry of journal.entries) {
    const sql = fs.readFileSync(path.join(migDir, entry.tag + ".sql"), "utf-8")
    for (const stmt of sql.split("--> statement-breakpoint"))
        if (stmt.trim()) db.exec(stmt)
    db.prepare(
        `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)`
    ).run(entry.tag, entry.when)
}

// ---------- sources ----------
const NOW = Math.floor(Date.now() / 1000) * 1000
const MIN = 60_000,
    HOUR = 60 * MIN,
    DAY = 24 * HOUR
const keys = Object.keys(SOURCES)
const sidOf = {}
const insSource = db.prepare(`INSERT INTO sources
    (sid, url, iconurl, name, openTarget, lastFetched, serviceRef, fetchFrequency, textDir, hidden)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`)
const OPEN_TARGET = { hn: 1, lwn: 1, economist: 3, kottke: 0 } // 1 = webpage, 3 = full content
const FREQ = { rust: 1440, aeon: 720, nasa: 180, economist: 1440 }
keys.forEach((k, sid) => {
    const s = SOURCES[k]
    sidOf[k] = sid
    const host = new URL(s.url).hostname.replace(/^(feeds|api)\./, "www.")
    const icon = s.dead ? "" : `https://${host}/favicon.ico`
    insSource.run(
        sid,
        s.url,
        icon,
        s.name,
        OPEN_TARGET[k] || 0,
        NOW - Math.floor((8 + rand() * 30) * MIN),
        FREQ[k] || 0,
        s.hidden ? 1 : 0
    )
})

// ---------- items ----------
const SPAN_DAYS = {
    verge: 9, ars: 14, techcrunch: 12, wired: 20, hn: 4, bbc: 6, guardian: 8,
    npr: 9, economist: 40, simon: 45, github: 70, jvns: 160, lwn: 16, rust: 140,
    quanta: 75, nature: 30, nasa: 60, nautilus: 120, smashing: 70, csstricks: 90,
    df: 30, kottke: 25, aeon: 80, seriouseats: 45, polygon: 40, sspai: 10,
    japantimes: 7,
}
const READ_BIAS = { hn: -0.3, bbc: -0.15, guardian: -0.2, npr: -0.2, techcrunch: -0.25, sspai: -0.3, simon: 0.15, jvns: 0.2, df: 0.1 }
const STAR_BIAS = { quanta: 0.25, jvns: 0.3, simon: 0.2, nautilus: 0.25, aeon: 0.3, seriouseats: 0.3, smashing: 0.15, csstricks: 0.15 }

function photoURL(host, title, i) {
    const paths = {
        tech: `/wp-content/uploads/2026/${slug(title).slice(0, 30)}-hero.jpg`,
        science: `/images/${slug(title).slice(0, 30)}-${i}.jpg`,
    }
    return `https://${host}${paths[pick(["tech", "science"])]}`
}

function articleHTML(s, k, title, lede, img, creator) {
    if (s.topic === "hn") {
        const n = (lede.match(/[\d,]+ comments/) || ["0 comments"])[0]
        return `<p>Article URL: <a href="https://example-${slug(title).slice(0, 12)}.dev/">https://example-${slug(title).slice(0, 12)}.dev/</a></p>
<p>Comments URL: <a href="https://news.ycombinator.com/item?id=${41000000 + Math.floor(rand() * 900000)}">https://news.ycombinator.com/item?id=…</a></p>
<p>Points: ${(lede.match(/([\d,]+) points/) || [0, "1"])[1]}</p><p># Comments: ${n.split(" ")[0]}</p>`
    }
    const pool = s.topic === "cn" ? CN_PARAGRAPHS : PARAGRAPHS[s.topic] || PARAGRAPHS.tech
    // Some feeds only publish summaries; others publish the full article
    const short = ["bbc", "npr", "economist", "lwn", "techcrunch"].includes(k) || rand() < 0.15
    const n = short ? 1 : 3 + Math.floor(rand() * 4)
    const paras = shuffle(pool).slice(0, n)
    let html = ""
    if (img) html += `<figure><img src="${img}" alt="${title.replace(/"/g, "&quot;")}"><figcaption>${pick(["Photo", "Image", "Illustration"])}: ${creator || s.name}</figcaption></figure>\n`
    html += `<p><strong>${lede}</strong></p>\n`
    paras.forEach((p, i) => {
        html += `<p>${p}</p>\n`
        if (i === 1 && rand() < 0.35 && s.topic !== "cn")
            html += `<blockquote><p>${pick(PARAGRAPHS.quotes)}</p></blockquote>\n`
        if (i === 2 && rand() < 0.25 && s.topic !== "cn")
            html += `<ul>${shuffle(PARAGRAPHS.bullets).slice(0, 3 + Math.floor(rand() * 2)).map(b => `<li>${b}</li>`).join("")}</ul>\n`
    })
    if (short) html += `<p><a href="#">Continue reading…</a></p>`
    if (k === "df" && !title.startsWith("Sponsor"))
        html += `<p><a href="https://daringfireball.net/">★</a></p>`
    return html
}
const toText = html =>
    html
        .replace(/<figcaption>.*?<\/figcaption>/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()

const insItem = db.prepare(`INSERT INTO items
    (source, guid, title, link, date, fetchedDate, thumb, content, snippet, creator, hasRead, starred, hidden, notify, serviceRef)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`)

const all = []
for (const k of keys) {
    const s = SOURCES[k]
    const host = new URL(s.url).hostname.replace(/^(feeds|api)\./, "www.")
    const n = s.headlines.length
    s.headlines.forEach(([title, lede], i) => {
        let age
        if (s.ageDays) age = (s.ageDays[0] + (i / n) * (s.ageDays[1] - s.ageDays[0])) * DAY
        else {
            const span = (SPAN_DAYS[k] || 30) * DAY
            age = ((i + rand() * 0.8) / n) * span
        }
        age += i === 0 ? rand() * 40 * MIN : rand() * 3 * HOUR
        // keep the 'just arrived' items realistic: nothing in the future
        const date = Math.floor((NOW - age - 20 * MIN) / 1000) * 1000
        const fetched = Math.min(NOW - 5 * MIN, date + Math.floor((5 + rand() * 50) * MIN))
        all.push({ k, s, host, title, lede, date, fetched, i })
    })
}
// insert oldest first, like a reader that accumulated items over time
all.sort((a, b) => a.fetched - b.fetched)
db.exec("BEGIN")
let count = 0
for (const it of all) {
    const { k, s, host, title, lede, date, fetched, i } = it
    const creator = s.authors.length ? pick(s.authors) : null
    const img = rand() < s.img ? photoURL(host, title, i) : null
    const content = articleHTML(s, k, title, lede, img, creator)
    const snippet = toText(content)
    const d = new Date(date)
    const MON = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"][d.getUTCMonth()]
    const LINKS = {
        bbc: () => `https://www.bbc.com/news/articles/c${(date % 1e10).toString(36)}o`,
        guardian: () => `https://www.theguardian.com/world/${d.getUTCFullYear()}/${MON}/${String(d.getUTCDate()).padStart(2, "0")}/${slug(title)}`,
        npr: () => `https://www.npr.org/${d.toISOString().slice(0, 10).replace(/-/g, "/")}/nx-s1-${(date % 1e7)}/${slug(title)}`,
        nature: () => `https://www.nature.com/articles/d41586-026-0${(date % 10000).toString().padStart(4, "0")}-${i}`,
        rust: () => `https://blog.rust-lang.org/${d.toISOString().slice(0, 10).replace(/-/g, "/")}/${slug(title)}/`,
        quanta: () => `https://www.quantamagazine.org/${slug(title)}-${d.toISOString().slice(0, 10).replace(/-/g, "")}/`,
    }
    const link = LINKS[k] ? LINKS[k]()
        : k === "hn"
            ? `https://news.ycombinator.com/item?id=${41500000 + i * 7919}`
            : `https://${host}/${new Date(date).getUTCFullYear()}/${String(new Date(date).getUTCMonth() + 1).padStart(2, "0")}/${slug(title)}`
    const ageDays = (NOW - date) / DAY
    let pRead = ageDays < 1 ? 0.15 : ageDays < 3 ? 0.4 : ageDays < 10 ? 0.7 : 0.9
    pRead = Math.min(0.97, Math.max(0.05, pRead + (READ_BIAS[k] || 0)))
    let hasRead = rand() < pRead
    const starred = hasRead && rand() < 0.04 + (STAR_BIAS[k] || 0)
    // Items caught by the user's rules (see config below)
    let hidden = false
    if ((k === "techcrunch" && /Sponsored|Webinar/i.test(title)) || (k === "df" && /^Sponsor:/.test(title))) {
        hidden = true
        hasRead = true
    }
    if (k === "lwn" && /^Security updates/.test(title)) hasRead = true
    if (s.dead) hasRead = true
    insItem.run(
        sidOf[k],
        k === "hn" ? link : `${link}#${(date / 1000).toString(36)}`,
        title,
        link,
        date,
        fetched,
        img,
        content,
        snippet,
        creator,
        hasRead ? 1 : 0,
        starred ? 1 : 0,
        hidden ? 1 : 0
    )
    count++
}
db.exec("COMMIT")
db.exec("PRAGMA optimize")
db.close()

// ---------- electron-store settings ----------
let gid = 0
const sourceGroups = GROUPS.map(g => {
    const sids = g.keys.map(k => sidOf[k])
    return g.name
        ? { gid: gid++, isMultiple: true, sids, name: g.name, expanded: g.expanded }
        : { gid: gid++, isMultiple: false, sids }
})
const config = {
    version: "1.3.2",
    dbVersion: "sqlite",
    theme: "system",
    locale: "default",
    view: 0, // Cards
    menuOn: true,
    fontSize: 16,
    fontFamily: "",
    fetchInterval: 30,
    searchEngine: 3, // DuckDuckGo
    serviceConfigs: { type: 0 },
    filterType: 3, // FilterType.Default (show read + not starred)
    listViewConfigs: 3, // ShowCover | ShowSnippet
    listViewWidth: 420,
    articleOverlayWidth: 960,
    menuUnreadSourcesOnly: false,
    pacOn: false,
    sourceGroups,
    nextGroupId: gid,
    sourceRules: {
        [`source:${sidOf.techcrunch}`]: [
            { filter: 16, search: "sponsored|webinar", match: true, actions: ["h-true", "r-true"] },
        ],
        [`source:${sidOf.df}`]: [
            { filter: 0, search: "^Sponsor:", match: true, actions: ["r-true", "h-true"] },
        ],
        [`source:${sidOf.lwn}`]: [
            { filter: 0, search: "^Security updates for", match: true, actions: ["r-true"] },
        ],
        [`group:${sourceGroups.find(g => g.name === "Science").gid}`]: [
            { filter: 16, search: "quantum", match: true, actions: ["s-true"] },
        ],
    },
}
fs.writeFileSync(path.join(DATA, "config.json"), JSON.stringify(config, null, 2))
console.log(`Seeded ${keys.length} sources, ${count} items, ${sourceGroups.length} groups.`)
