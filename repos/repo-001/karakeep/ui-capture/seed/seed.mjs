// Seeds a Karakeep instance (running at SEED_BASE_URL, with the stubs up)
// through its own API, then fills in what a real crawler would have stored
// (titles, descriptions, banner images, reader-view HTML) directly in the
// app's SQLite schema, since there is no internet to crawl from here.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import { ARTICLES, FAILED_LINKS, FEEDS, HIGHLIGHTS, IMAGES, LISTS, NOTES, SMART_LISTS, USER } from "./data.mjs";

const require = createRequire(import.meta.url);
const { createTRPCClient, httpBatchLink } = require("@trpc/client");
const superjson = require("superjson").default ?? require("superjson");
const Database = require("better-sqlite3");
const sharp = require("sharp");

const BASE = process.env.SEED_BASE_URL ?? "http://localhost:5401";
const DATA_DIR = process.env.DATA_DIR;
const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR; // extracted seed-data-v0.34.1 (real crawls)
const NOW = new Date("2026-11-16T17:30:00Z").getTime();
const DAY = 86400000;

// ----------------------------------------------------------------- helpers
let seed = 20261116;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const log = (...a) => console.log("[seed]", ...a);

function client(apiKey) {
  return createTRPCClient({
    links: [
      httpBatchLink({
        transformer: superjson,
        url: `${BASE}/api/trpc`,
        headers: () => ({ authorization: apiKey ? `Bearer ${apiKey}` : undefined }),
      }),
    ],
  });
}

async function signUp() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify(USER),
  });
  if (!res.ok) throw new Error(`sign up failed: ${res.status} ${await res.text()}`);
  const { key } = await client().apiKeys.exchange.mutate({
    email: USER.email,
    password: USER.password,
    keyName: "Seed script",
  });
  return key;
}

async function uploadAsset(apiKey, bytes, fileName, contentType) {
  const form = new FormData();
  form.append("file", new File([bytes], fileName, { type: contentType }));
  const res = await fetch(`${BASE}/api/assets`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`upload failed ${res.status} ${await res.text()}`);
  return (await res.json()).assetId;
}

// Recency-biased timestamp within [fromDaysAgo, toDaysAgo].
function dateBetween(fromDaysAgo, toDaysAgo) {
  const r = Math.pow(rand(), 1.6);
  const days = toDaysAgo + r * (fromDaysAgo - toDaysAgo);
  const t = NOW - days * DAY;
  const d = new Date(t);
  // people save things at human hours
  d.setUTCHours(13 + Math.floor(rand() * 13) % 24, Math.floor(rand() * 60), Math.floor(rand() * 60));
  return new Date(Math.min(d.getTime(), NOW - 3600000));
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrap(text, max) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      lines.push(cur.trim());
      cur = w;
    } else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

const PALETTES = [
  ["#0f172a", "#1e3a8a", "#93c5fd"], ["#3f1d38", "#a2185c", "#fbcfe8"], ["#052e16", "#15803d", "#bbf7d0"],
  ["#431407", "#c2410c", "#fed7aa"], ["#1e1b4b", "#6d28d9", "#ddd6fe"], ["#111827", "#374151", "#f9fafb"],
  ["#083344", "#0e7490", "#a5f3fc"], ["#422006", "#a16207", "#fef08a"], ["#fafaf9", "#e7e5e4", "#1c1917"],
];

// An Open Graph style share image, like the ones most sites publish.
async function bannerImage(article) {
  const h = parseInt(crypto.createHash("md5").update(article.p).digest("hex").slice(0, 8), 16);
  const [bg, accent, fg] = PALETTES[h % PALETTES.length];
  const style = h % 3;
  const lines = wrap(article.t, style === 2 ? 30 : 34).slice(0, 4);
  const domain = new URL(article.u).hostname.replace(/^www\./, "");
  const titleSvg = lines
    .map((l, i) => `<text x="80" y="${250 + i * 74 - (lines.length - 1) * 30}" font-size="60" font-weight="700" fill="${fg}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">${esc(l)}</text>`)
    .join("");
  const deco =
    style === 0
      ? `<circle cx="1080" cy="120" r="220" fill="${accent}" opacity="0.55"/><circle cx="1150" cy="560" r="160" fill="${accent}" opacity="0.35"/>`
      : style === 1
        ? `<rect x="0" y="560" width="1200" height="70" fill="${accent}"/><rect x="80" y="90" width="90" height="10" fill="${fg}"/>`
        : `<path d="M820 0 L1200 0 L1200 630 L620 630 Z" fill="${accent}" opacity="0.5"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${accent}" stop-opacity="0.85"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>${deco}
    <text x="80" y="${style === 1 ? 80 : 120}" font-size="30" font-weight="600" fill="${fg}" opacity="0.85" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">${esc(article.p)}</text>
    ${titleSvg}
    <text x="80" y="${style === 1 ? 605 : 570}" font-size="26" fill="${style === 1 ? bg : fg}" opacity="0.8" font-family="Menlo, monospace">${esc(domain)}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

async function uploadedImage(kind, title) {
  let body = "";
  if (kind === "diagram") {
    const boxes = [["Mobile app", 120, 140], ["Sync API", 520, 140], ["Postgres", 920, 140], ["Queue", 520, 420], ["Workers", 920, 420]];
    body = `<rect width="1400" height="900" fill="#f8f8f4"/>` +
      boxes.map(([t, x, y]) => `<rect x="${x}" y="${y}" width="300" height="140" rx="18" fill="none" stroke="#1d4ed8" stroke-width="6"/><text x="${x + 150}" y="${y + 85}" text-anchor="middle" font-size="40" fill="#1d4ed8" font-family="Marker Felt, Chalkboard, Comic Sans MS, sans-serif">${t}</text>`).join("") +
      `<path d="M420 210 L520 210 M820 210 L920 210 M670 280 L670 420 M820 490 L920 490" stroke="#b91c1c" stroke-width="6" fill="none"/>` +
      `<text x="140" y="700" font-size="34" fill="#15803d" font-family="Marker Felt, Chalkboard, sans-serif">TODO: conflict resolution → last-writer-wins per field?</text>` +
      `<text x="140" y="770" font-size="34" fill="#15803d" font-family="Marker Felt, Chalkboard, sans-serif">batch size 500, backoff 2^n (max 5 min)</text>`;
  } else if (kind === "seats") {
    body = `<rect width="1400" height="900" fill="#ffffff"/><text x="60" y="80" font-size="40" font-weight="700" font-family="Helvetica" fill="#111">Nozomi N700S — Car 8 (Reserved)</text>`;
    for (let r = 0; r < 17; r++) for (let c = 0; c < 5; c++) {
      const taken = (r * 7 + c * 3) % 5 === 0;
      const ours = r === 11 && (c === 3 || c === 4);
      body += `<rect x="${80 + r * 74}" y="${160 + c * 110 + (c > 2 ? 60 : 0)}" width="60" height="90" rx="10" fill="${ours ? "#f97316" : taken ? "#9ca3af" : "#bfdbfe"}"/>`;
    }
    body += `<text x="60" y="820" font-size="32" font-family="Helvetica" fill="#374151">Seats 12D / 12E — Mt. Fuji side (right, Tokyo → Kyoto)</text>`;
  } else if (kind === "rack") {
    const units = [["UDM Pro", "#111827"], ["Patch panel", "#374151"], ["USW-24-PoE", "#1f2937"], ["", "#e5e7eb"], ["pve-01 (M920q)", "#1e3a8a"], ["pve-02 (planned)", "#93c5fd"], ["DS920+", "#334155"], ["", "#e5e7eb"], ["UPS — CP1500", "#7c2d12"]];
    body = `<rect width="1400" height="900" fill="#f3f4f6"/><rect x="420" y="40" width="560" height="820" fill="#0b0b0b" rx="12"/>` +
      units.map(([t, col], i) => `<rect x="450" y="${70 + i * 86}" width="500" height="74" fill="${col}" rx="6"/><text x="700" y="${117 + i * 86}" text-anchor="middle" font-size="28" fill="#f9fafb" font-family="Helvetica">${t}</text>`).join("");
  } else {
    const cols = ["#b5452c", "#e2a55b", "#4f6d3a", "#2f3e46", "#d8cfc4", "#8c2f39"];
    body = `<rect width="1400" height="900" fill="#fbfaf7"/>` + cols.map((c, i) => `<rect x="${60 + i * 215}" y="120" width="195" height="560" fill="${c}"/><text x="${157 + i * 215}" y="740" text-anchor="middle" font-size="30" font-family="Menlo" fill="#333">${c}</text>`).join("") +
      `<text x="60" y="80" font-size="40" font-family="Helvetica" fill="#222">${esc(title)}</text>`;
  }
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900">${body}</svg>`)).png().toBuffer();
}

function articleHtml(a) {
  const paras = a.body ?? [a.d];
  return `<div>${paras.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`;
}

// ------------------------------------------------------------------- main
async function main() {
  const apiKey = await signUp();
  const api = client(apiKey);
  const me = await api.users.whoami.query();
  const userId = me.id;
  log("user", USER.email, userId);

  await api.users.updateSettings.mutate({ timezone: "America/Los_Angeles", bookmarkClickAction: "open_original_link" }).catch((e) => log("settings", e.message));

  // Lists
  const listIds = {};
  for (const l of LISTS) {
    const created = await api.lists.create.mutate({ name: l.name, icon: l.icon, type: "manual", description: l.description, ...(l.parent ? { parentId: listIds[l.parent] } : {}) });
    listIds[l.key] = created.id;
  }
  for (const s of SMART_LISTS) {
    await api.lists.create.mutate({ name: s.name, icon: s.icon, type: "smart", query: s.query }).catch((e) => log("smart list", s.name, e.message));
  }

  const created = []; // {id, kind, entry, createdAt}

  async function addLink(entry, createdAt, extra = {}) {
    const b = await api.bookmarks.createBookmark.mutate({
      type: "link",
      url: entry.u,
      source: pick(["web", "web", "extension", "extension", "extension", "mobile"]),
      createdAt,
      favourited: !!entry.fav,
      archived: !!entry.archived,
      ...extra,
    });
    if (entry.note) await api.bookmarks.updateBookmark.mutate({ bookmarkId: b.id, note: entry.note });
    const tags = [...(entry.tags ?? []), ...(entry.ai ?? [])];
    if (tags.length) await api.bookmarks.updateTags.mutate({ bookmarkId: b.id, attach: tags.map((tagName) => ({ tagName })), detach: [] });
    for (const lk of entry.lists ?? []) await api.lists.addToList.mutate({ listId: listIds[lk], bookmarkId: b.id });
    return b;
  }

  // Articles
  for (const a of ARTICLES) {
    const isJapan = (a.lists ?? []).includes("japan");
    const createdAt = isJapan ? dateBetween(300, 225) : dateBetween(420, 0);
    if (a.archived === undefined && createdAt.getTime() < NOW - 200 * DAY && rand() < 0.35) a.archived = true;
    const b = await addLink(a, createdAt);
    created.push({ id: b.id, kind: "article", entry: a, createdAt });
  }
  log("articles", ARTICLES.length);

  // Real crawls from the repo's seed snapshot (homepages / docs the user saved)
  let snapDb = null;
  if (SNAPSHOT_DIR && fs.existsSync(path.join(SNAPSHOT_DIR, "db.db"))) {
    snapDb = new Database(path.join(SNAPSHOT_DIR, "db.db"), { readonly: true });
    const SNAP_TAGS = {
      "nasa.gov": ["space", "science"], "nationalgeographic.com": ["science", "photography"], "theverge.com": ["tech", "news"],
      "wired.com": ["tech", "news"], "apple.com": ["hardware"], "figma.com": ["design", "tools"], "linear.app": ["tools", "productivity"],
      "notion.com": ["tools", "productivity"], "stripe.com": ["api-design", "payments"], "shopify.com": ["ecommerce"],
      "developer.mozilla.org": ["frontend", "reference"], "web.dev": ["frontend", "reference"], "raspberrypi.com": ["raspberry-pi", "homelab"],
      "postgresql.org": ["postgres", "reference"], "docs.docker.com": ["docker", "self-hosting"], "github.com": ["ci", "tools"], "cloudflare.com": ["networking"],
    };
    const rows = snapDb.prepare("SELECT bl.* FROM bookmarkLinks bl JOIN bookmarks b ON b.id = bl.id WHERE bl.crawlStatus='success' GROUP BY bl.url").all();
    for (const r of rows) {
      const host = new URL(r.url).hostname.replace(/^www\./, "");
      const tags = SNAP_TAGS[host] ?? ["reference"];
      const entry = { u: r.url, tags, archived: rand() < 0.3, fav: rand() < 0.12, lists: host.includes("raspberrypi") || host.includes("docker") ? ["homelab"] : host.includes("figma") || host.includes("linear") ? ["design"] : [] };
      const createdAt = dateBetween(420, 5);
      const b = await addLink(entry, createdAt);
      created.push({ id: b.id, kind: "snapshot", entry, snap: r, createdAt });
    }
    log("snapshot links", rows.length);
  }

  for (const f of FAILED_LINKS) {
    const createdAt = dateBetween(380, 20);
    const b = await addLink(f, createdAt);
    created.push({ id: b.id, kind: "failed", entry: f, createdAt });
  }

  // Notes
  for (const n of NOTES) {
    const createdAt = (n.lists ?? []).includes("japan") ? dateBetween(280, 228) : dateBetween(400, 0);
    const b = await api.bookmarks.createBookmark.mutate({ type: "text", text: n.text, title: n.title, source: pick(["web", "mobile"]), createdAt, favourited: !!n.fav, archived: !!n.archived });
    if (n.tags?.length) await api.bookmarks.updateTags.mutate({ bookmarkId: b.id, attach: n.tags.map((tagName) => ({ tagName })), detach: [] });
    for (const lk of n.lists ?? []) await api.lists.addToList.mutate({ listId: listIds[lk], bookmarkId: b.id });
    created.push({ id: b.id, kind: "note", entry: n, createdAt });
  }
  log("notes", NOTES.length);

  // Uploaded images
  for (const im of IMAGES) {
    const bytes = await uploadedImage(im.kind, im.title);
    const assetId = await uploadAsset(apiKey, bytes, im.fileName, "image/png");
    const createdAt = (im.lists ?? []).includes("japan") ? dateBetween(260, 230) : dateBetween(300, 3);
    const b = await api.bookmarks.createBookmark.mutate({ type: "asset", assetType: "image", assetId, fileName: im.fileName, title: im.title, source: pick(["web", "mobile"]), createdAt });
    if (im.tags?.length) await api.bookmarks.updateTags.mutate({ bookmarkId: b.id, attach: im.tags.map((tagName) => ({ tagName })), detach: [] });
    for (const lk of im.lists ?? []) await api.lists.addToList.mutate({ listId: listIds[lk], bookmarkId: b.id });
    created.push({ id: b.id, kind: "image", entry: im, createdAt });
  }
  log("images", IMAGES.length);

  // ------------------------------------------- what the crawler would store
  const db = new Database(path.join(DATA_DIR, "db.db"));
  db.pragma("busy_timeout = 5000");
  const insAsset = db.prepare("INSERT INTO assets (id, assetType, size, contentType, fileName, bookmarkId, userId) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const saveAsset = (bookmarkId, type, bytes, contentType, fileName = null) => {
    const id = crypto.randomUUID();
    const dir = path.join(DATA_DIR, "assets", userId, id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "asset.bin"), bytes);
    fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify({ contentType, fileName }));
    insAsset.run(id, type, bytes.length, contentType, fileName, bookmarkId, userId);
    return id;
  };
  const updLink = db.prepare(`UPDATE bookmarkLinks SET title=@title, description=@description, author=@author, publisher=@publisher,
      datePublished=@datePublished, imageUrl=@imageUrl, favicon=NULL, htmlContent=@htmlContent, contentAssetId=@contentAssetId,
      crawledAt=@crawledAt, crawlStatus=@crawlStatus, crawlStatusCode=@crawlStatusCode, readerViewStatus=@readerViewStatus WHERE id=@id`);
  const sec = (d) => Math.floor(d.getTime() / 1000);

  for (const c of created) {
    const crawledAt = new Date(c.createdAt.getTime() + 20000 + rand() * 90000);
    if (c.kind === "article") {
      const a = c.entry;
      const published = new Date(c.createdAt.getTime() - rand() * 120 * DAY);
      updLink.run({
        id: c.id, title: a.t, description: a.d, author: a.a ?? null, publisher: a.p,
        datePublished: sec(published), imageUrl: null, htmlContent: articleHtml(a), contentAssetId: null,
        crawledAt: sec(crawledAt), crawlStatus: "success", crawlStatusCode: 200, readerViewStatus: a.body ? "readable" : "uncertain",
      });
      if (rand() > 0.1) saveAsset(c.id, "linkBannerImage", await bannerImage(a), "image/jpeg");
    } else if (c.kind === "snapshot") {
      const r = c.snap;
      let htmlContent = r.htmlContent;
      let contentAssetId = null;
      const snapAssets = snapDb.prepare("SELECT * FROM assets WHERE bookmarkId = ?").all(r.id);
      for (const sa of snapAssets) {
        const file = path.join(SNAPSHOT_DIR, "assets", sa.userId, sa.id, "asset.bin");
        if (!fs.existsSync(file)) continue;
        const id = saveAsset(c.id, sa.assetType, fs.readFileSync(file), sa.contentType, sa.fileName);
        if (sa.assetType === "linkHtmlContent") contentAssetId = id;
      }
      if (contentAssetId) htmlContent = null;
      updLink.run({
        id: c.id, title: r.title, description: r.description, author: r.author, publisher: r.publisher,
        datePublished: r.datePublished, imageUrl: null, htmlContent, contentAssetId,
        crawledAt: sec(crawledAt), crawlStatus: "success", crawlStatusCode: 200, readerViewStatus: r.readerViewStatus ?? "uncertain",
      });
    } else if (c.kind === "failed") {
      updLink.run({
        id: c.id, title: null, description: null, author: null, publisher: null, datePublished: null, imageUrl: null,
        htmlContent: null, contentAssetId: null, crawledAt: sec(crawledAt), crawlStatus: "failure", crawlStatusCode: c.entry.status, readerViewStatus: "unavailable",
      });
    }
  }

  // Tagging / embeddings ran; AI-attached tags are marked as such.
  db.prepare("UPDATE bookmarks SET taggingStatus='success', embeddingStatus='success', summarizationStatus=CASE WHEN summary IS NULL THEN NULL ELSE 'success' END, modifiedAt=lastSavedAt WHERE userId=?").run(userId);
  db.prepare("UPDATE bookmarks SET taggingStatus='failure' WHERE id IN (SELECT id FROM bookmarkLinks WHERE crawlStatus='failure')").run();
  const markAi = db.prepare("UPDATE tagsOnBookmarks SET attachedBy='ai' WHERE bookmarkId=? AND tagId=(SELECT id FROM bookmarkTags WHERE userId=? AND name=?)");
  for (const c of created) {
    for (const t of c.entry.ai ?? []) markAi.run(c.id, userId, t);
    // a share of the "human" tags were really suggested by the AI tagger
    for (const t of c.entry.tags ?? []) if (rand() < 0.45) markAi.run(c.id, userId, t);
  }
  // Tag rows should look like they were created when first used.
  db.prepare(`UPDATE tagsOnBookmarks SET attachedAt=(SELECT lastSavedAt FROM bookmarks b WHERE b.id=tagsOnBookmarks.bookmarkId)`).run();
  db.prepare(`UPDATE bookmarkTags SET createdAt=COALESCE((SELECT MIN(attachedAt) FROM tagsOnBookmarks t WHERE t.tagId=bookmarkTags.id), createdAt) WHERE userId=?`).run(userId);
  db.prepare(`UPDATE bookmarksInLists SET addedAt=(SELECT lastSavedAt FROM bookmarks b WHERE b.id=bookmarksInLists.bookmarkId)`).run();
  db.close();
  log("crawl data written");

  // AI summaries through the app's own summarize endpoint (served by the stub)
  const toSummarize = created.filter((c) => c.kind === "article" && (c.entry.body || rand() < 0.2));
  for (const c of toSummarize) {
    await api.bookmarks.summarizeBookmark.mutate({ bookmarkId: c.id }).catch((e) => log("summarize", c.entry.t, e.message));
  }
  log("summaries", toSummarize.length);

  // Highlights on articles with reader content
  for (const h of HIGHLIGHTS) {
    const c = created.find((x) => x.kind === "article" && x.entry.t.includes(h.title));
    if (!c) { log("no article for highlight", h.title); continue; }
    const text = (c.entry.body ?? []).join("") ;
    const full = text;
    const start = full.indexOf(h.text);
    if (start < 0) { log("highlight text missing", h.title); continue; }
    await api.highlights.create.mutate({
      bookmarkId: c.id, startOffset: start, endOffset: start + h.text.length, color: h.color, text: h.text,
      prefix: full.slice(Math.max(0, start - 32), start), suffix: full.slice(start + h.text.length, start + h.text.length + 32), note: h.note ?? null,
    });
  }
  log("highlights", HIGHLIGHTS.length);

  // Reading progress on a few long reads
  for (const [t, pct] of [["Patterns for Building LLM", 40], ["SQLite Internals", 65], ["Patterns of Distributed Systems", 20]]) {
    const c = created.find((x) => x.entry.t?.startsWith(t));
    if (!c) continue;
    const len = (c.entry.body ?? [c.entry.d]).join("").length;
    await api.bookmarks.updateReadingProgress.mutate({ bookmarkId: c.id, readingProgressOffset: Math.floor((len * pct) / 100), readingProgressPercent: pct }).catch((e) => log("progress", e.message));
  }

  // Feeds, rules, prompts, webhook
  const tags = await api.tags.list.query();
  const tagId = (n) => tags.tags.find((t) => t.name === n)?.id;
  for (const f of FEEDS) await api.feeds.create.mutate({ ...f, importTags: false }).catch((e) => log("feed", e.message));
  await api.rules.create.mutate({ name: "GitHub repos → Homelab", description: "Self-hosted projects I find on GitHub", enabled: true, event: { type: "bookmarkAdded" }, condition: { type: "urlContains", str: "github.com" }, actions: [{ type: "addToList", listId: listIds.homelab }] }).catch((e) => log("rule", e.message));
  if (tagId("recipes") || tagId("cooking")) await api.rules.create.mutate({ name: "Recipes list", description: null, enabled: true, event: { type: "tagAdded", tagId: tagId("cooking") }, condition: { type: "bookmarkTypeIs", bookmarkType: "link" }, actions: [{ type: "addToList", listId: listIds.recipes }] }).catch((e) => log("rule", e.message));
  await api.rules.create.mutate({ name: "Favourite postmortems", description: "Postmortems are always worth a re-read", enabled: false, event: { type: "addedToList", listIds: [listIds.postmortems] }, condition: { type: "alwaysTrue" }, actions: [{ type: "favouriteBookmark" }] }).catch((e) => log("rule", e.message));
  await api.prompts.create.mutate({ text: "Prefer lowercase, hyphenated tags (e.g. self-hosting, personal-finance).", appliesTo: "all_tagging" }).catch((e) => log("prompt", e.message));
  await api.prompts.create.mutate({ text: "Mention the author when known.", appliesTo: "summary" }).catch((e) => log("prompt", e.message));
  await api.webhooks.create.mutate({ url: "http://192.168.1.20:5678/webhook/karakeep", events: ["created", "crawled"], token: "n8n-homelab" }).catch((e) => log("webhook", e.message));

  const stats = await api.users.stats.query().catch(() => null);
  log("done", JSON.stringify(stats ? { bookmarks: stats.numBookmarks, tags: stats.numTags, lists: stats.numLists, highlights: stats.numHighlights } : {}));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
