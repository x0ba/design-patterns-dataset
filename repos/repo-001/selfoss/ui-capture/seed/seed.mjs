// Seeds a running selfoss instance through its own HTTP API + updater.
// Usage: node seed.mjs <selfossBaseUrl> <stubProxyUrl>
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { sources } from './sources.mjs';

const [base, proxy] = process.argv.slice(2);
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '../..');

async function api(method, p, body) {
  const res = await fetch(base + p, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p}: ${res.status} ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return text; }
}

// 1. Subscribe to every source (same request the "add source" form sends).
for (const s of sources) {
  const spout = s.thumbnails ? 'spouts_rss_images' : 'spouts_rss_feed';
  await api('POST', '/source', { title: s.title, spout, url: s.feed, tags: s.tags, filter: '' });
}
console.log('sources added:', sources.length);

// 2. Tag colors the user picked at some point.
const tagColors = {
  Tech: '#1f6feb', Linux: '#f5c211', Dev: '#8e44ad', Blogs: '#16a085', Science: '#6a1b9a', Space: '#0b3d91',
  News: '#c0392b', Climate: '#27ae60', Cooking: '#e67e22', Design: '#d81b60', Comics: '#7f8c8d',
  Releases: '#34495e', Local: '#00838f', Podcasts: '#795548',
};
for (const [tag, color] of Object.entries(tagColors)) await api('POST', '/tags/color', { tag, color });

// 3. Fetch all feeds with selfoss's own updater, routed through the stub web.
execFileSync('frankenphp', ['php-cli', 'cliupdate.php'], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, HTTP_PROXY: proxy, http_proxy: proxy, NO_PROXY: 'localhost,127.0.0.1' },
});

// 4. Reading history: old items mostly read, recent ones mostly unread, a few starred.
const all = [];
for (let offset = 0; ; offset += 100) {
  const page = await api('GET', `/items?type=newest&items=100&offset=${offset}`);
  const items = Array.isArray(page) ? page : Object.values(page.entries ?? page);
  all.push(...items);
  if (items.length < 100) break;
}
let h = 7;
const rand = () => ((h = (h * 1103515245 + 12345) >>> 0) / 2 ** 32);
const now = Date.now();
const read = [], starred = [];
const backlogFeeds = new Set(['Meridian News — World', 'Lobby: Front Page']);
const starFeeds = new Set(['Marisol Vasquez — notes', 'Tidepool Weblog', 'Harbor Kitchen', 'Salt & Smoke', 'Fieldline Science', 'Grid & Gutter', 'Low-Watt Magazine', 'Kernel Weekly', 'The Orbital']);
for (const it of all) {
  const age = (now - new Date(it.datetime).getTime()) / 864e5;
  const p = rand();
  let isRead;
  if (age < 1.2) isRead = p < 0.12;
  else if (age < 4) isRead = p < (backlogFeeds.has(it.sourcetitle) ? 0.35 : 0.6);
  else if (age < 14) isRead = p < (backlogFeeds.has(it.sourcetitle) ? 0.8 : 0.93);
  else isRead = p < 0.985;
  if (isRead) read.push(it.id);
  const long = (it.content || '').length > 900;
  if ((starFeeds.has(it.sourcetitle) && rand() < (long ? 0.45 : 0.1)) || rand() < 0.015) starred.push(it.id);
}
for (let i = 0; i < read.length; i += 100) await api('POST', '/mark/', read.slice(i, i + 100));
for (const id of starred) await api('POST', `/starr/${id}`);
console.log(`items: ${all.length}, read: ${read.length}, starred: ${starred.length}`);
console.log(JSON.stringify(await api('GET', '/stats')));
