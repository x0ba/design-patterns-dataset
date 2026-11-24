// Local stand-in for Fluent Reader's Electron main process:
//  - serves the webpack renderer build from dist/
//  - /__api/db/*   : the db:execute / db:batch IPC handlers (SQLite via node:sqlite)
//  - /__api/store  : electron-store (JSON file)
//  - /__stub/*     : offline stand-ins for the outside web (RSS feeds, article
//                    pages, favicons and images), driven by the seeded database
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { fileURLToPath } from "node:url"
import { imageSVG, iconSVG } from "./images.mjs"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, "..")
const DIST = path.join(ROOT, "dist")
const DATA = path.join(HERE, "data")
const DB_PATH = path.join(DATA, "fluent-reader.db")
const STORE_PATH = path.join(DATA, "config.json")
const PORT = Number(process.env.PORT || 4432)

const sqlite = new DatabaseSync(DB_PATH)
for (const [name, flags] of [
    ["regexp", ""],
    ["regexpi", "i"],
]) {
    sqlite.function(name, { deterministic: true }, (pattern, value) => {
        try {
            return Number(new RegExp(pattern, flags).test(value ?? ""))
        } catch {
            return 0
        }
    })
}

const normParam = v =>
    typeof v === "boolean" ? Number(v) : v === undefined ? null : v

function executeQuery({ sql, params = [], method }) {
    const stmt = sqlite.prepare(sql)
    const args = params.map(normParam)
    if (method === "run") {
        const r = stmt.run(...args)
        return [Number(r.changes), Number(r.lastInsertRowid)]
    }
    stmt.setReturnArrays(true)
    if (method === "get") return stmt.get(...args)
    return stmt.all(...args)
}
function executeBatch(queries) {
    sqlite.exec("BEGIN")
    try {
        const out = queries.map(executeQuery)
        sqlite.exec("COMMIT")
        return out
    } catch (e) {
        sqlite.exec("ROLLBACK")
        throw e
    }
}

const DEAD_FEEDS = new Set(["https://www.anandtech.com/rss/"])

let store = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
const saveStore = () =>
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2))

// ---------- stubs for the outside web ----------
const esc = s =>
    String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")

function sourceByURL(url) {
    return sqlite.prepare("SELECT * FROM sources WHERE url = ?").get(url)
}
function sourceByHost(host) {
    for (const s of sqlite.prepare("SELECT * FROM sources").all()) {
        try {
            if (new URL(s.url).hostname === host) return s
        } catch {}
    }
    return null
}
function rssFor(source) {
    const items = sqlite
        .prepare(
            "SELECT * FROM items WHERE source = ? ORDER BY date DESC LIMIT 20"
        )
        .all(source.sid)
    const home = new URL(source.url).origin
    const entries = items
        .map(
            i => `<item>
<title>${esc(i.title)}</title>
<link>${esc(i.link)}</link>
${i.guid ? `<guid isPermaLink="false">${esc(i.guid)}</guid>` : ""}
<pubDate>${new Date(i.date).toUTCString()}</pubDate>
${i.creator ? `<dc:creator>${esc(i.creator)}</dc:creator>` : ""}
<description>${esc(i.snippet)}</description>
<content:encoded><![CDATA[${i.content}]]></content:encoded>
${i.thumb ? `<media:thumbnail url="${esc(i.thumb)}" />` : ""}
</item>`
        )
        .join("\n")
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel><title>${esc(source.name)}</title><link>${esc(home)}</link>
<description>${esc(source.name)}</description>
${entries}
</channel></rss>`
}
function articlePage(item, source) {
    return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(item.title)} - ${esc(source?.name)}</title>
<link rel="icon" href="${esc(source?.iconurl || "")}">
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;color:#222}
header{border-bottom:1px solid #ddd;margin-bottom:24px;font:600 14px system-ui;color:#666}img{max-width:100%}</style>
</head><body><header>${esc(source?.name)}</header>
<article><h1>${esc(item.title)}</h1>
<p><small>${esc(item.creator || "")} · ${new Date(
        item.date
    ).toDateString()}</small></p>
${item.content}</article></body></html>`
}
function homePage(source) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(
        source.name
    )}</title><link rel="icon" href="${esc(
        source.iconurl || "/favicon.ico"
    )}"></head><body><h1>${esc(source.name)}</h1></body></html>`
}

function stubResponse(target) {
    let u
    try {
        u = new URL(target)
    } catch {
        return { status: 400, type: "text/plain", body: "bad url" }
    }
    const src = sourceByURL(target)
    // feeds whose sites have shut down: the real app logs a fetch error for them
    if (src && DEAD_FEEDS.has(src.url))
        return { status: 404, type: "text/html", body: "<h1>404 Not Found</h1>" }
    if (src)
        return {
            status: 200,
            type: "application/rss+xml; charset=utf-8",
            body: rssFor(src),
        }
    const item = sqlite
        .prepare("SELECT * FROM items WHERE link = ? LIMIT 1")
        .get(target)
    if (item) {
        const s = sqlite
            .prepare("SELECT * FROM sources WHERE sid = ?")
            .get(item.source)
        return {
            status: 200,
            type: "text/html; charset=utf-8",
            body: articlePage(item, s),
        }
    }
    const p = u.pathname.toLowerCase()
    if (/favicon|apple-touch-icon|\/icons?\//.test(p) || p.endsWith(".ico")) {
        const s = sourceByHost(u.hostname)
        return {
            status: 200,
            type: "image/svg+xml",
            body: iconSVG(u.hostname, s?.name),
        }
    }
    if (/\.(jpe?g|png|webp|gif|avif)$/.test(p) || /\/(images?|media|uploads|photos?)\//.test(p))
        return { status: 200, type: "image/svg+xml", body: imageSVG(target) }
    const home = sourceByHost(u.hostname)
    if (home && (p === "/" || p === ""))
        return { status: 200, type: "text/html; charset=utf-8", body: homePage(home) }
    return { status: 404, type: "text/plain", body: "Not found (offline stub)" }
}

// ---------- static files ----------
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".map": "application/json",
}
function indexHTML() {
    return fs
        .readFileSync(path.join(DIST, "index.html"), "utf-8")
        .replace(
            "default-src 'none';",
            "default-src 'none'; worker-src 'self';"
        )
        .replace('<script defer="defer" src="index.js"></script>', "")
        .replace("</head>", '<script src="/__shim/bridge.js"></script></head>')
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = []
        req.on("data", c => chunks.push(c))
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
        req.on("error", reject)
    })
}
function send(res, status, type, body, extra = {}) {
    res.writeHead(status, {
        "Content-Type": type,
        "Cache-Control": "no-store",
        ...extra,
    })
    res.end(body)
}
const json = (res, status, data) =>
    send(res, status, "application/json", JSON.stringify(data ?? null))

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const p = url.pathname
    try {
        if (p === "/__api/store" && req.method === "GET") return json(res, 200, store)
        if (p === "/__api/store" && req.method === "POST") {
            const { key, value } = JSON.parse(await readBody(req))
            if (value === undefined) delete store[key]
            else store[key] = value
            saveStore()
            return json(res, 200, true)
        }
        if (p === "/__api/db/execute" && req.method === "POST") {
            const q = JSON.parse(await readBody(req))
            try {
                return json(res, 200, executeQuery(q))
            } catch (e) {
                console.error("db:execute error:", e.message, q.sql)
                return json(res, 500, { error: String(e.message) })
            }
        }
        if (p === "/__api/db/batch" && req.method === "POST") {
            const { queries } = JSON.parse(await readBody(req))
            try {
                return json(res, 200, executeBatch(queries))
            } catch (e) {
                console.error("db:batch error:", e.message)
                return json(res, 500, { error: String(e.message) })
            }
        }
        if (p === "/__api/db/export") {
            const out = {
                ...store,
                sqlite: {
                    sources: sqlite.prepare("SELECT * FROM sources").all(),
                    items: sqlite.prepare("SELECT * FROM items").all(),
                },
            }
            return send(res, 200, "application/octet-stream", JSON.stringify(out), {
                "Content-Disposition":
                    'attachment; filename="Fluent_Reader_Backup.frdata"',
            })
        }
        if (p === "/__stub/proxy" || p === "/__stub/page") {
            const r = stubResponse(url.searchParams.get("url") || "")
            return send(res, r.status, r.type, r.body, {
                "Access-Control-Allow-Origin": "*",
            })
        }
        if (p === "/__shim/bridge.js" || p === "/sw.js") {
            const f = path.join(HERE, "shim", path.basename(p))
            return send(res, 200, MIME[".js"], fs.readFileSync(f), {
                "Service-Worker-Allowed": "/",
            })
        }
        if (p === "/" || p === "/index.html")
            return send(res, 200, MIME[".html"], indexHTML())

        const file = path.normalize(path.join(DIST, decodeURIComponent(p)))
        if (file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile())
            return send(
                res,
                200,
                MIME[path.extname(file)] || "application/octet-stream",
                fs.readFileSync(file)
            )
        if (!path.extname(p)) return send(res, 200, MIME[".html"], indexHTML())
        return send(res, 404, "text/plain", "Not found")
    } catch (e) {
        console.error(e)
        return send(res, 500, "text/plain", String(e))
    }
})
server.listen(PORT, () =>
    console.log(`Fluent Reader (browser shim) at http://localhost:${PORT}/`)
)
