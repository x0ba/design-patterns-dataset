// Generates feed fixtures (RSS 2.0 / Atom / JSON Feed) + the stub manifest + a Bubo feeds.json.
// Usage: node generate.mjs <fixturesDir> <feedsJsonOut>
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { groups, broken } from "./feeds-data.mjs";

const [, , FIX, FEEDS_OUT] = process.argv;
rmSync(FIX, { recursive: true, force: true });
mkdirSync(join(FIX, "feeds"), { recursive: true });

// deterministic RNG
let seed = 20261116;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const NOW = Date.now();
const DAY = 86400000;

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = s => String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 70);
const sha = s => createHash("sha1").update(s).digest("hex");
const pad = n => String(n).padStart(2, "0");

let xkcdNum = 3180;
function linkFor(feed, title, date, i) {
  const u = new URL(feed.url);
  const d = new Date(date);
  const ym = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}`;
  if (u.hostname === "github.com") {
    if (feed.url.endsWith("releases.atom")) return `${feed.link}/tag/${title.split(":")[0].replace(/^v?/, "v")}`;
    if (feed.url.includes("/commits/")) return `${feed.link.replace(/\/commits\/.*/, "")}/commit/${sha(feed.url + title + i)}`;
    const m = title.match(/ in ([\w.-]+\/[\w.-]+)| at ([\w.-]+\/[\w.-]+)|starred ([\w.-]+\/[\w.-]+)|forked ([\w.-]+\/[\w.-]+)|issue ([\w.-]+\/[\w.-]+)#?(\d+)?/);
    const repo = m ? m.slice(1).find(Boolean) : "georgemandis/bubo-rss";
    return `https://github.com/${repo}`;
  }
  if (u.hostname === "xkcd.com") return `https://xkcd.com/${xkcdNum--}/`;
  if (u.hostname === "dev.to") {
    const users = ["mkelly", "priya_codes", "the_jsdev", "lindseyb", "oscarr", "devmateo", "hannah_k"];
    return `https://dev.to/${users[i % users.length]}/${slug(title)}-${sha(title).slice(0, 4)}`;
  }
  if (u.hostname.includes("changelog.com")) return `https://changelog.com/${title.startsWith("Changelog News") ? "news" : title.includes("Friends") ? "friends" : "podcast"}/${600 + 70 - i}`;
  if (u.hostname.includes("web.dev") || u.hostname.includes("nngroup") || u.hostname.includes("piccalil")) return `${feed.link.replace(/\/$/, "")}/articles/${slug(title)}`;
  if (u.hostname.includes("simonwillison")) return `https://simonwillison.net/${d.getUTCFullYear()}/${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()]}/${d.getUTCDate()}/${slug(title)}/`;
  if (u.hostname.includes("daringfireball")) return `https://daringfireball.net/${ym}/${slug(title).replace(/-/g, "_")}`;
  return `${feed.link.replace(/\/$/, "")}/${ym}/${slug(title)}/`;
}

const blurb = (feed, title) =>
  `<p>${esc(title)}.</p><p>Continue reading on ${esc(new URL(feed.link).hostname)}.</p>`;

function datesFor(feed) {
  let t = NOW - feed.last * DAY - rnd() * 0.6 * DAY;
  return feed.items.map(() => {
    const d = t;
    t -= feed.cadence * DAY * (0.35 + rnd() * 1.3) + rnd() * 3600000;
    return Math.round(d);
  });
}

function rss(feed, items) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>${esc(feed.title)}</title>
  <atom:link href="${esc(feed.url)}" rel="self" type="application/rss+xml" />
  <link>${esc(feed.link)}</link>
  <description>${esc(feed.title)}</description>
  <lastBuildDate>${new Date(items[0]?.date ?? NOW).toUTCString()}</lastBuildDate>
  <language>en-US</language>
${items.map(it => `  <item>
    <title>${esc(it.title)}</title>
    <link>${esc(it.link)}</link>
    <dc:creator><![CDATA[${it.author}]]></dc:creator>
    <pubDate>${new Date(it.date).toUTCString()}</pubDate>
    <guid isPermaLink="false">${esc(it.link)}</guid>
    <description><![CDATA[${it.html}]]></description>
  </item>`).join("\n")}
</channel>
</rss>
`;
}

function atom(feed, items) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-US">
  <id>${esc(feed.url)}</id>
  <title>${esc(feed.title)}</title>
  <link rel="alternate" type="text/html" href="${esc(feed.link)}"/>
  <link rel="self" type="application/atom+xml" href="${esc(feed.url)}"/>
  <updated>${new Date(items[0]?.date ?? NOW).toISOString()}</updated>
${items.map(it => `  <entry>
    <id>${esc(it.link)}</id>
    <title type="html">${esc(it.title)}</title>
    <link rel="alternate" type="text/html" href="${esc(it.link)}"/>
    <published>${new Date(it.date).toISOString()}</published>
    <updated>${new Date(it.date + 3600000 * rnd()).toISOString()}</updated>
    <author><name>${esc(it.author)}</name></author>
    <content type="html">${esc(it.html)}</content>
  </entry>`).join("\n")}
</feed>
`;
}

function json(feed, items) {
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: feed.title,
    home_page_url: feed.link,
    feed_url: feed.url,
    items: items.map(it => ({
      id: it.link,
      url: it.link,
      ...(it.title ? { title: it.title } : {}),
      content_html: it.title ? it.html : `<p>${it.micro}</p>`,
      date_published: new Date(it.date).toISOString(),
      authors: [{ name: it.author }],
    })),
  }, null, 2);
}

const micro = [
  "Finally got the garden beds winterized. Garlic is in.",
  "Hot take: every internal tool should have a dark mode toggle and a CSV export. That’s it, that’s the post.",
  "Today’s small win: deleted 400 lines of YAML.",
  "If you’re in Austin next week for the conference, say hi!",
];

const authorOf = feed => ({
  "hacks.mozilla.org": "Mozilla Developer Relations", "css-tricks.com": "Geoff Graham", "dev.to": "DEV Community",
  "changelog.com": "Changelog Media", "webkit.org": "Jen Simmons", "george.mand.is": "George Mandis",
  "jvns.ca": "Julia Evans", "simonwillison.net": "Simon Willison", "daringfireball.net": "John Gruber",
  "marisol.dev": "Marisol Ortega", "www.smashingmagazine.com": "Smashing Editorial", "github.com": "georgemandis",
})[new URL(feed.url).hostname] ?? feed.title;

const manifest = {};
const feedList = {};
let n = 0, total = 0;
for (const [group, feeds] of Object.entries(groups)) {
  feedList[group] = [];
  for (const feed of feeds) {
    const dates = datesFor(feed);
    let m = 0;
    const items = feed.items.map((title, i) => {
      const t = title ?? null;
      const link = t ? linkFor(feed, t, dates[i], i) : `${feed.link}notes/${new Date(dates[i]).toISOString().slice(0, 10)}-${i}`;
      return { title: t, link, date: dates[i], author: authorOf(feed), html: t ? blurb(feed, t) : "", micro: t ? null : micro[m++ % micro.length] };
    });
    total += items.length;
    const ext = feed.fmt === "json" ? "json" : "xml";
    const file = `feeds/${String(++n).padStart(2, "0")}-${slug(new URL(feed.url).hostname)}.${ext}`;
    const body = feed.fmt === "rss" ? rss(feed, items) : feed.fmt === "atom" ? atom(feed, items) : json(feed, items);
    writeFileSync(join(FIX, file), body);
    manifest[feed.url] = { file, contentType: feed.ct, latency: Math.round(30 + rnd() * 400) };
    feedList[group].push(feed.url);
  }
}
for (const b of broken) {
  if (b.kind === "dns") manifest[b.url] = { error: "ENOTFOUND", latency: 600 };
  if (b.kind === "html") {
    const file = "feeds/kerrybaldwin-journal.html";
    writeFileSync(join(FIX, file), `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Journal — Kerry Baldwin Design</title>
<link rel="alternate" type="application/rss+xml" href="/journal/rss.xml"></head>
<body><header><nav><a href="/">Work</a> <a href="/journal/">Journal</a> <a href="/about/">About</a></nav></header>
<main><h1>Journal</h1><article><h2><a href="/journal/type-specimens/">Notes on making type specimens</a></h2></article></main>
</body></html>`);
    manifest[b.url] = { file, contentType: "text/html; charset=utf-8", latency: 220 };
  }
  feedList[b.group].push(b.url);
}
writeFileSync(join(FIX, "manifest.json"), JSON.stringify(manifest, null, 2));
writeFileSync(FEEDS_OUT, JSON.stringify(feedList, null, 2));
console.log(`fixtures: ${n} feeds, ${total} items, ${broken.length} broken feeds`);
