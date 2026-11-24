// Stub "internet" for seeding: an HTTP forward proxy (selfoss's updater is pointed at it
// via HTTP_PROXY) that answers for the fictional feed sites in sources.mjs, serving
// RSS/Atom feeds, homepages, favicons and article images. Only used at seed time.
// Usage: node stub-web.mjs <port> <imagesDir>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { sources, longParagraphs } from './sources.mjs';

const port = Number(process.argv[2] || 8901);
const imagesDir = process.argv[3];
const NOW = Date.now();
const HOUR = 3600e3;

// Deterministic PRNG so every seed run produces the same dates.
function rng(seed) {
  let s = 0;
  for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slugify = (t) => t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export function buildItems(src) {
  const r = rng(src.slug);
  let t = NOW - (0.3 + r() * src.everyHours * 0.6) * HOUR;
  return src.items.map(([title, summary, extra = {}], i) => {
    if (i > 0) t -= src.everyHours * (0.35 + r() * 1.3) * HOUR;
    let html = `<p>${summary}</p>`;
    if (extra.long) {
      const n = 3 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) html += `<p>${longParagraphs[Math.floor(r() * longParagraphs.length)]}</p>`;
      if (r() < 0.5) html = html.replace('</p>', '</p><h2>Background</h2>');
      if (r() < 0.4) html += `<blockquote><p>${longParagraphs[Math.floor(r() * longParagraphs.length)]}</p></blockquote>`;
    }
    if (src.slug === 'frontpage') {
      const id = 45800000 - i * 7919;
      const hosts = ["github.com/", "blog.northwind.dev/", "www.brandur.org/", "jvdm.io/posts/", "notes.ericmoss.net/", "engineering.fieldwire.com/", "sqlite.org/", "lwn.net/Articles/", "www.cs.tufts.edu/~nr/", "rachelbythebay.com/w/"];
      const articleUrl = `https://${hosts[i % hosts.length]}${slugify(title)}`;
      html = `<p>Article URL: <a href="${articleUrl}">${articleUrl}</a></p><p>Comments URL: <a href="${src.home}item?id=${id}">${src.home}item?id=${id}</a></p><p>${summary}</p>`;
    }
    const link = extra.link || `${src.home}${new Date(t).toISOString().slice(0, 7).replace('-', '/')}/${slugify(title)}/`;
    const author = extra.author || src.authors[Math.floor(r() * src.authors.length)];
    const image = src.thumbnails ? `${src.home}wp-content/uploads/${src.slug}-${i % 6}.jpg` : null;
    return { title, html, link, author, date: new Date(t), image, guid: `${src.home}?p=${10000 + src.items.length - i}` };
  });
}

function rss(src) {
  const items = buildItems(src);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${esc(src.title)}</title>
<link>${src.home}</link>
<description>${esc(src.title)}</description>
<language>en</language>
<image><url>${src.home}favicon-128.png</url><title>${esc(src.title)}</title><link>${src.home}</link></image>
${items.map((it) => `<item>
<title>${esc(it.title)}</title>
<link>${it.link}</link>
<guid isPermaLink="false">${it.guid}</guid>
<pubDate>${it.date.toUTCString()}</pubDate>
<dc:creator>${esc(it.author)}</dc:creator>
<description><![CDATA[${it.html}]]></description>
${it.image ? `<media:content url="${it.image}" medium="image" type="image/jpeg"><media:thumbnail url="${it.image}"/></media:content>` : ''}
</item>`).join('\n')}
</channel>
</rss>`;
}

function atom(src) {
  const items = buildItems(src);
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${esc(src.title)}</title>
<link href="${src.home}" rel="alternate"/>
<link href="${src.feed}" rel="self"/>
<id>${src.home}</id>
<icon>${src.home}favicon-128.png</icon>
<updated>${(items[0]?.date ?? new Date(NOW)).toISOString()}</updated>
${items.map((it) => `<entry>
<title>${esc(it.title)}</title>
<link href="${it.link}" rel="alternate"/>
<id>${it.guid}</id>
<updated>${it.date.toISOString()}</updated>
<published>${it.date.toISOString()}</published>
<author><name>${esc(it.author)}</name></author>
<content type="html">${esc(it.html)}</content>
</entry>`).join('\n')}
</feed>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const href = url.href;
  const src = sources.find((s) => href.startsWith(s.home) || href.startsWith(new URL(s.feed).origin + '/'));
  const send = (code, type, body) => { res.writeHead(code, { 'Content-Type': type }); res.end(body); };
  console.log(req.method, href, src ? src.slug : '-');
  if (!src) return send(404, 'text/plain', 'not found');
  if (href === src.feed) {
    if (src.dead) return send(404, 'text/html', '<h1>404 Not Found</h1>');
    return src.atom ? send(200, 'application/atom+xml; charset=utf-8', atom(src)) : send(200, 'application/rss+xml; charset=utf-8', rss(src));
  }
  if (/favicon(-128)?\.(png|ico)$/.test(url.pathname)) {
    return send(200, 'image/png', fs.readFileSync(path.join(imagesDir, 'icons', src.slug + '.png')));
  }
  const m = url.pathname.match(/uploads\/(.+\.jpg)$/);
  if (m) return send(200, 'image/jpeg', fs.readFileSync(path.join(imagesDir, 'thumbs', m[1])));
  return send(200, 'text/html; charset=utf-8', `<!doctype html><html><head><title>${esc(src.title)}</title><link rel="icon" href="/favicon-128.png" sizes="128x128"><link rel="alternate" type="application/rss+xml" href="${src.feed}"></head><body><h1>${esc(src.title)}</h1></body></html>`);
});

if (process.argv[1].endsWith('stub-web.mjs')) server.listen(port, '127.0.0.1', () => console.log('stub web on', port));
