// Seeds a migrated Fusion SQLite DB with an established user's reading history.
// Usage: node seed.mjs /path/to/fusion.db   (run after Fusion has applied its migrations)
// All timestamps are relative to "now" so the UI always looks freshly used.
import { DatabaseSync } from "node:sqlite";
import { groups, feeds } from "./feeds.mjs";
import { longArticles } from "./articles.mjs";

const dbPath = process.argv[2];
if (!dbPath) throw new Error("usage: node seed.mjs <db>");
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

// Deterministic PRNG so every start produces the same dataset shape.
let s = 0x2e2026;
const rnd = () => ((s = (s + 0x6d2b79f5) | 0), (((t) => ((t = Math.imul(t ^ (t >>> 15), t | 1)), (t ^= t + Math.imul(t ^ (t >>> 7), t | 61)), ((t ^ (t >>> 14)) >>> 0) / 4294967296))(s)));
const between = (a, b) => a + rnd() * (b - a);
const int = (a, b) => Math.floor(between(a, b + 1));

const now = Math.floor(Date.now() / 1000);
const MIN = 60, HOUR = 3600, DAY = 86400;

const slug = (t) =>
  t.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 70) || String(int(1000, 9999));
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- groups ----------
db.exec("DELETE FROM bookmarks; DELETE FROM items; DELETE FROM feed_fetch_state; DELETE FROM feeds; DELETE FROM groups WHERE id <> 1;");
db.prepare("UPDATE groups SET created_at = ?, updated_at = ? WHERE id = 1").run(now - 262 * DAY, now - 262 * DAY);
const groupId = { Default: 1 };
const insGroup = db.prepare("INSERT INTO groups (name, created_at, updated_at) VALUES (?, ?, ?)");
groups.forEach((g, i) => {
  const t = now - Math.floor((262 - i * 9 - (g === "中文" ? 120 : 0)) * DAY);
  groupId[g] = Number(insGroup.run(g, t, t).lastInsertRowid);
});

// ---------- feeds / items ----------
const insFeed = db.prepare(`INSERT INTO feeds (group_id, name, link, site_url, suspended, proxy, refresh_interval_seconds, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insState = db.prepare(`INSERT INTO feed_fetch_state (feed_id, etag, last_modified, cache_control, expires_at, last_checked_at, next_check_at,
  last_http_status, retry_after_until, last_success_at, last_error_at, last_error, consecutive_failures, updated_at)
  VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, ?, ?, ?)`);
const insItem = db.prepare(`INSERT INTO items (feed_id, guid, title, link, content, pub_date, unread, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

const recentlyAdded = new Set(["Josh W. Comeau", "少数派", "Overreacted", "Pluralistic: Daily links from Cory Doctorow"]);
const extraRefresh = { "Dan Luu": 86400, "LWN.net": 3600, "Overreacted": 43200 };
const wordpressFooter = new Set(["CSS-Tricks", "Krebs on Security", "Smashing Magazine", "Serious Eats", "Hackaday"]);
const allItems = [];
let hnId = 46012345;

function content(feed, title, summary, link, idx) {
  if (feed.style === "hn") {
    const id = hnId - idx * int(900, 4000);
    const pts = int(40, 900), cmts = int(Math.floor(pts / 8), Math.floor(pts / 1.5));
    return `<p>Article URL: <a href="${link}">${link}</a></p>\n<p>Comments URL: <a href="https://news.ycombinator.com/item?id=${id}">https://news.ycombinator.com/item?id=${id}</a></p>\n<p>Points: ${pts}</p>\n<p># Comments: ${cmts}</p>`;
  }
  if (feed.style === "xkcd") return `<p><a href="${link}">${esc(title)}</a></p>`;
  if (longArticles[title]) return longArticles[title];
  if (feed.full) {
    return `<p>${esc(summary || title)}</p>\n${fullBody(feed, title)}`;
  }
  const more = wordpressFooter.has(feed.name)
    ? `<p>The post <a href="${link}">${esc(title)}</a> appeared first on <a href="${feed.site}">${esc(feed.name)}</a>.</p>`
    : `<p><a href="${link}">Continue reading…</a></p>`;
  return `<p>${esc(summary || title)}</p>\n${more}`;
}

// Body paragraphs for full-content personal/engineering blogs; picked per post so neighbours differ.
const bodyParts = [
  `<p>I've been meaning to write this up for a while, mostly because I kept explaining the same thing in chat and wanted something to link to. This isn't meant to be exhaustive — it's the set of things I wish someone had told me when I started poking at this.</p>`,
  `<h2>The short version</h2>\n<ul><li>Start with the simplest thing that could possibly work and measure it.</li><li>Most of the complexity comes from edge cases you won't hit until production.</li><li>Write down what you learned while it's still fresh, even if it feels obvious.</li></ul>`,
  `<p>Here's a small example that shows the behavior I'm talking about:</p>\n<pre><code>$ curl -sI https://example.com/feed.xml | grep -i -E 'etag|cache-control|last-modified'\ncache-control: max-age=1800\netag: "6720f1c2-1a4b"\nlast-modified: Tue, 10 Nov 2026 08:12:44 GMT</code></pre>`,
  `<p>What surprised me most was how much of this was already documented, just not anywhere I would have thought to look. The manual covers it in a single paragraph near the end of a very long page, which is a pattern I keep running into.</p>`,
  `<h2>Why this matters</h2>\n<p>None of this is new, exactly, but the defaults have shifted over the last few years and a lot of advice floating around online predates those changes. If you set things up five years ago and haven't revisited them, it's worth another look.</p>`,
  `<blockquote><p>The best way to understand a system is to try to change it and see what breaks.</p></blockquote>\n<p>That's been true for basically every project I've worked on, and this one was no exception.</p>`,
  `<p>I'm not completely sure I've got all of the details right here — if you know more about this than I do, I'd love to hear from you. I'll update the post with corrections.</p>`,
  `<h2>Some open questions</h2>\n<ol><li>How much of this is specific to my setup?</li><li>Is there a better tool for this that I'm missing?</li><li>What would it take for the default behavior to change?</li></ol>`,
];
function fullBody(feed, title) {
  let h = 0; for (const c of title) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  const n = 3 + (h % 3), out = [];
  for (let k = 0; k < n; k++) out.push(bodyParts[(h + k * 3) % bodyParts.length]);
  return out.join("\n");
}

function linkFor(feed, title, pub) {
  const d = new Date(pub * 1000);
  const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, "0"), dd = String(d.getUTCDate()).padStart(2, "0");
  const base = feed.site.replace(/\/$/, "");
  switch (feed.name) {
    case "Hacker News: Front Page": {
      const hosts = ["https://blog.example.dev", "https://www.sqlite.org", "https://github.com", "https://lwn.net/Articles", "https://arxiv.org/abs", "https://www.nytimes.com", "https://notes.eatonphil.com", "https://brr.fyi", "https://www.bbc.com/news"];
      return `${hosts[int(0, hosts.length - 1)]}/${slug(title).slice(0, 40)}`;
    }
    case "xkcd": return `https://xkcd.com/${3190 - feed.items.findIndex((r) => r.startsWith(title))}/`;
    case "Simon Willison's Weblog": return `${base}/${y}/${d.toLocaleString("en", { month: "short", timeZone: "UTC" })}/${Number(dd)}/${slug(title).slice(0, 40)}/`;
    case "Ars Technica": return `${base}/${["tech-policy", "science", "gadgets", "space", "security", "cars"][int(0, 5)]}/${y}/${m}/${slug(title)}/`;
    case "The Verge": return `${base}/news/${int(800000, 899999)}/${slug(title)}`;
    case "LWN.net": return `https://lwn.net/Articles/${int(1040000, 1049999)}/`;
    case "阮一峰的网络日志": return `${base}/${y}/${m}/${(title.match(/第 (\d+) 期/) || [])[1] ? `weekly-issue-${title.match(/第 (\d+) 期/)[1]}` : slug(title)}.html`;
    case "少数派": return `https://sspai.com/post/${int(98000, 99999)}`;
    case "Daring Fireball": return `https://daringfireball.net/${y}/${m}/${slug(title).replace(/^-/, "").slice(0, 40)}`;
    default: return `${base}/${feed.full || feed.name.includes("Blog") ? `${y}/${m}/` : ""}${slug(title)}/`;
  }
}

function unreadFor(feed, ageDays) {
  if (feed.suspended) return ageDays < 75 && rnd() < 0.5 ? 1 : 0;
  if (feed.neglected) return ageDays < 120 ? (rnd() < 0.85 ? 1 : 0) : 0;
  if (feed.style === "hn") return ageDays < 2.5 ? (rnd() < 0.7 ? 1 : 0) : rnd() < 0.15 ? 1 : 0;
  if (ageDays < 2) return rnd() < 0.85 ? 1 : 0;
  if (ageDays < 7) return rnd() < 0.5 ? 1 : 0;
  if (ageDays < 21) return rnd() < 0.2 ? 1 : 0;
  return rnd() < 0.03 ? 1 : 0;
}

for (const feed of feeds) {
  const gap = (7 / feed.perWeek) * DAY;
  const ageOfFeed = recentlyAdded.has(feed.name) ? between(18, 45) : between(150, 255);
  const feedCreated = now - Math.floor(ageOfFeed * DAY);
  let offset = feed.failing ? feed.failing.days * DAY + between(0.5, 2) * DAY : feed.suspended ? between(55, 70) * DAY : between(0.02, Math.min(gap, 2 * DAY));
  const refresh = feed.refresh ?? extraRefresh[feed.name] ?? null;
  const suspendedAt = feed.suspended ? now - Math.floor(between(50, 54) * DAY) : feedCreated;
  const feedId = Number(insFeed.run(groupId[feed.group], feed.name, feed.link, feed.site, feed.suspended ? 1 : 0, "", refresh,
    feedCreated, feed.suspended ? suspendedAt : feedCreated + Math.floor(between(0, 10) * DAY)).lastInsertRowid);

  // fetch state
  const lastOk = feed.failing ? now - Math.floor(feed.failing.days * DAY) : feed.suspended ? suspendedAt : now - int(3 * MIN, 27 * MIN);
  if (feed.failing) {
    const errAt = now - int(10 * MIN, 50 * MIN);
    insState.run(feedId, "", "", "", errAt, now + int(6, 14) * HOUR, feed.failing.status, lastOk, errAt, feed.failing.error, feed.failing.failures, errAt);
  } else {
    const etag = rnd() < 0.6 ? `W/"${Math.floor(rnd() * 0xffffffff).toString(16)}-${int(1000, 99999).toString(16)}"` : "";
    const lm = rnd() < 0.7 ? new Date((lastOk - int(1, 40) * HOUR) * 1000).toUTCString() : "";
    // next_check_at is pushed out so the offline scheduler doesn't immediately record network failures.
    insState.run(feedId, etag, lm, rnd() < 0.4 ? "max-age=1800" : "", lastOk, now + int(5, 9) * HOUR, rnd() < 0.5 ? 304 : 200, lastOk, 0, "", 0, lastOk);
  }

  const seen = new Set();
  feed.items.forEach((raw, idx) => {
    const [title, summary] = raw.split(" | ");
    const pub = now - Math.floor(offset);
    offset += gap * between(0.45, 1.55);
    let link = linkFor(feed, title, pub);
    while (seen.has(link)) link = `${link.replace(/\/$/, "")}-${int(2, 9)}`;
    seen.add(link);
    const fetched = pub < feedCreated ? feedCreated + int(2, 30) : Math.min(now - 60, pub + int(2 * MIN, 35 * MIN));
    const ageDays = (now - pub) / DAY;
    const guid = feed.style === "hn" ? `https://news.ycombinator.com/item?id=${hnId - idx * 2311}` : link;
    const unread = unreadFor(feed, ageDays);
    const r = insItem.run(feedId, guid, title, link, content(feed, title, summary, link, idx), pub, unread, fetched);
    allItems.push({ id: Number(r.lastInsertRowid), feedId, feed, title, link, pub, fetched, unread });
  });
}

// ---------- bookmarks ----------
const insBm = db.prepare(`INSERT INTO bookmarks (item_id, link, title, content, pub_date, feed_name, feed_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const getContent = db.prepare("SELECT content FROM items WHERE id = ?");
const wanted = [
  "How SQLite is tested", "Lessons from 1,000 postmortems", "The lethal trifecta for AI agents", "Things I learned about SQLite's JSON functions this week",
  "Some notes on using Git worktrees", "A few things I've learned about HTTP caching", "What's a terminal emulator actually doing?",
  "Your RSS reader is fetching too often", "A tale of two timeouts", "Why is it so hard to buy things that work well?",
  "Patterns of Distributed Systems: Lease", "Testing time (and other asynchronicities)", "Range over function types, one year later",
  "The surprising power of CSS anchor positioning", "Springs and bounces in native CSS", "Designing accessible data tables that actually work",
  "Form design patterns: error messages that help", "How we built a globally consistent rate limiter without a central database",
  "How GitHub handles 1 billion git pushes a month", "The best way to roast a turkey (it involves a spatchcock)",
  "The food lab's guide to pie crust", "Chicken adobo, the Filipino way", "Mathematicians prove a 50-year-old conjecture about sphere packing",
  "The Agentic Web and the end of the click", "On the security of passkeys", "用 RSS 重建我的信息流", "SQLite 的十个冷知识",
  "A map of every tree in New York City", "Making PCBs at home with a fiber laser", "Inside a SIM-swapping crew's Telegram channel",
];
for (const t of wanted) {
  const it = allItems.find((x) => x.title === t);
  if (!it) continue;
  const saved = Math.min(now - 120, it.fetched + int(5 * MIN, 3 * DAY));
  insBm.run(it.id, it.link, it.title, getContent.get(it.id).content, it.pub, it.feed.name, it.feedId, saved);
}
// Orphans from a feed that was unsubscribed long ago (item/feed links cleared, snapshot kept).
const orphans = [
  ["Increment", "https://increment.com/software-architecture/the-epistemology-of-software-quality/", "The epistemology of software quality", "<p>What do we actually know about what makes software good? A look at the research, and the gaps in it.</p>", 230],
  ["Increment", "https://increment.com/teams/the-anatomy-of-a-great-onboarding/", "The anatomy of a great onboarding", "<p>The first ninety days shape how engineers see a team for years. Here's what the best companies do differently.</p>", 228],
  ["Cal Newport", "https://calnewport.com/on-slow-productivity/", "On Slow Productivity", "<p>Do fewer things. Work at a natural pace. Obsess over quality.</p>", 190],
];
for (const [fname, link, title, html, age] of orphans) {
  const pub = now - age * DAY;
  insBm.run(null, link, title, html, pub - 40 * DAY, fname, null, pub);
}

// ---------- settings ----------
db.prepare(`INSERT INTO settings (id, locale, article_page_size, theme, auto_mark_read, updated_at) VALUES (1, 'en', NULL, 'system', '5', ?)
  ON CONFLICT(id) DO UPDATE SET locale = excluded.locale, theme = excluded.theme, auto_mark_read = excluded.auto_mark_read, updated_at = excluded.updated_at`).run(now - 33 * DAY);

const c = db.prepare("SELECT (SELECT COUNT(*) FROM feeds) f, (SELECT COUNT(*) FROM items) i, (SELECT SUM(unread) FROM items) u, (SELECT COUNT(*) FROM bookmarks) b").get();
console.log(`seeded ${c.f} feeds, ${c.i} items (${c.u} unread), ${c.b} bookmarks`);
db.close();
