'use strict';
// Seeds QMReader through its own modules (fetcher normalisation + store API).
// Run from the repo root with .ui-capture/env.sh sourced:  node .ui-capture/seed/seed.cjs
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..', '..');
const DATA_DIR = process.env.QMREADER_DATA_DIR || path.join(REPO, '.ui-capture', 'data');
fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// Fake clock so created_at / read_at / comment times spread realistically.
const REAL_NOW = Date.now();
const realDateNow = Date.now.bind(Date);
let clock = null;
Date.now = () => (clock == null ? realDateNow() : clock);
const at = (ts, fn) => { const prev = clock; clock = Math.min(Math.round(ts), REAL_NOW); try { return fn(); } finally { clock = prev; } };
const H = 3600 * 1000;
const D = 24 * H;

// Deterministic PRNG.
let seed = 20261116;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = arr => arr[Math.floor(rand() * arr.length)];
const chance = p => rand() < p;

const store = require(path.join(REPO, 'lib', 'store.js'));
const fetcher = require(path.join(REPO, 'lib', 'fetcher.js'));
const deepseek = require(path.join(REPO, 'lib', 'deepseek.js'));
const { SOURCES } = require(path.join(REPO, 'lib', 'sources.js'));
const FEEDS = require('./data-entries.cjs');
const FEATURED = require('./data-featured.cjs');
const { COMMENTS, CHATS, ANNOTATIONS, SUBMISSIONS, PENDING_SUBMISSIONS, USERS } = require('./data-social.cjs');

const XNEWS_ZH = [
  '一位 SaaS 创始人分享：团队始终只有四个人，靠的是提高定价、拒绝企业定制需求，以及把客服文档写到极致。他说最难的决定是对第一个百万美元大单说不。',
  '一位工程负责人复盘了 AI 生成代码上线一年后的真实成本：代码评审疲劳、难以察觉的边界 bug，以及他们最后定下的三条规则——AI 写的代码必须附测试、必须由人解释、必须小步提交。',
  '作者离开大厂两年，用 AI 工具一个人做产品、做内容、做客服。文中公开了收入曲线、踩过的坑，以及他每天实际在用的工具清单。',
];
const sourceById =Object.fromEntries(SOURCES.map(s => [s.id, s]));
const lookup = { titles: {}, paragraphs: {} };

// ---------- users ----------
const admin = at(REAL_NOW - 210 * D, () => {
  store.ensureAdminUser({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, displayName: process.env.ADMIN_NAME || '向阳乔木' });
  return store.authenticateUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
});
const users = { admin };
for (const u of USERS) {
  users[u.key] = at(REAL_NOW - u.joinedDaysAgo * D, () => store.createUser({ email: u.email, password: 'reader-pass-2026', displayName: u.name }));
  if (u.bio) at(REAL_NOW - u.joinedDaysAgo * D + H, () => store.updateUserProfile(users[u.key].id, { displayName: u.name, bio: u.bio, links: u.links || [] }));
}
at(REAL_NOW - 200 * D, () => store.updateUserProfile(admin.id, {
  displayName: '向阳乔木',
  bio: '产品经理出身，写代码、做工具、读很多英文科技文章。QMReader 作者。',
  links: [{ title: '官网', url: 'https://qiaomu.ai' }, { title: 'X', url: 'https://x.com/vista8' }, { title: '博客', url: 'https://blog.qiaomu.ai' }],
}));
const others = Object.keys(users).filter(k => k !== 'admin');

// ---------- feed entries ----------
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
function linkFor(source, title, i) {
  const base = (source.siteUrl || 'https://example.com').replace(/\/$/, '');
  if (source.id === 'huggingface') return `https://huggingface.co/papers/2511.${String(10234 + i * 917).padStart(5, '0')}`;
  if (source.id === 'github_trending') return `https://github.com/${title}`;
  if (source.id === 'producthunt') return `https://www.producthunt.com/products/${slug(title)}`;
  if (/[一-龥]/.test(title)) return `${base}/p/${crypto.createHash('md5').update(title).digest('hex').slice(0, 10)}`;
  return `${base}/${slug(title)}`;
}
function htmlParas(paras) { return paras.map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('\n'); }

const allEntries = [];
for (const feed of FEEDS) {
  const source = sourceById[feed.id];
  if (!source) { console.warn('unknown source', feed.id); continue; }
  const built = [];
  feed.items.forEach(([title, titleZh, summary, author], i) => {
    const jitter = (rand() - 0.5) * Math.min(feed.every * 0.5, 30) * H;
    const ts = Math.min(REAL_NOW - (feed.start + i * feed.every) * H + jitter, REAL_NOW - (40 + i * 25 + rand() * 60) * 60 * 1000);
    const featured = FEATURED[`${feed.id}:${i}`];
    let content;
    if (featured && featured.en) content = htmlParas(featured.en);
    else if (featured && featured.body) content = htmlParas(featured.body);
    else content = htmlParas([summary, ...(chance(0.5) ? [`${author || source.name} · ${source.name}`] : [])]);
    const item = {
      title,
      link: linkFor(source, title, i),
      guid: linkFor(source, title, i),
      isoDate: new Date(ts).toISOString(),
      creator: author || '',
      content,
    };
    if (source.id === 'xnews') {
      const md = `# ${titleZh}\n\n${XNEWS_ZH[i] || summary}\n\n原帖作者在评论区补充了很多细节，值得点开原文看讨论。`;
      item.qiaomuVersions = {
        version: 1,
        original: { title, html: content, lang: 'en', url: `https://x.com/${slug(author || 'founder')}/status/19${String(8812345670 + i * 7919)}` },
        rewrite: { title: titleZh, markdown: md, html: md.split('\n\n').map(p => p.startsWith('# ') ? `<h1>${p.slice(2)}</h1>` : `<p>${p}</p>`).join('\n') },
      };
    }
    const entry = fetcher.__test.normalizeItem(item, source, { feedUrl: String(source.feeds && source.feeds[0] || '') });
    if (!featured) entry.summary = summary;
    built.push({ entry, titleZh, featured, ts });
    if (titleZh) lookup.titles[title] = titleZh;
  });
  // Entries arrive over time (oldest first), the way repeated refreshes would store them.
  for (const b of [...built].reverse()) at(b.ts + (10 + rand() * 50) * 60 * 1000, () => store.upsertEntries([b.entry]));
  at(REAL_NOW - (1 + rand() * 40) * 60 * 1000, () => fetcher.__test.finalizeFetchedSource(source, built.map(b => b.entry), {
    feedUrl: String(source.feeds && source.feeds[0] || source.siteUrl || ''),
    feedTitle: source.name,
  }));
  // Title translations land shortly after each fetch.
  for (const b of built) {
    if (!b.titleZh) continue;
    at(b.ts + (20 + rand() * 90) * 60 * 1000, () => store.saveTitleTranslations([{ entryId: b.entry.id, titleZh: b.titleZh, titleHash: store.hashText(b.entry.title) }], { model: 'deepseek-v4-flash', provider: 'deepseek', author: 'system' }));
  }
  for (const b of built) allEntries.push({ ...b, sourceId: source.id, key: `${feed.id}:${built.indexOf(b)}` });
}
fetcher.flushDisk();
console.log(`entries: ${allEntries.length}`);

const byKey = Object.fromEntries(allEntries.map(e => [e.key, e]));

// ---------- translations & rewrites for featured articles ----------
for (const [key, f] of Object.entries(FEATURED)) {
  const e = byKey[key];
  if (!e) continue;
  const entry = store.getEntry(e.entry.id);
  if (f.en && f.zh) {
    f.en.forEach((p, i) => { lookup.paragraphs[p] = f.zh[i]; });
    const blocks = deepseek.__test.htmlToTranslationBlocks(entry.content, entry.summary);
    const pairs = blocks.map((block, i) => ({ ...block, target: f.zh[i] || f.zh[f.zh.length - 1], targetHtml: `<p>${f.zh[i] || ''}</p>` }));
    at(e.ts + (2 + rand() * 20) * H, () => store.saveTranslation(entry.id, {
      titleZh: e.titleZh || '',
      summaryZh: '',
      content: pairs,
      model: 'deepseek-v4-flash',
      provider: 'deepseek',
      createdBy: '向阳乔木',
      userId: admin.id,
      contentHash: deepseek.translationInputHash(entry, blocks),
      titleHash: store.hashText(entry.title || ''),
    }));
  }
  if (f.rewrite) {
    const byUser = chance(0.5);
    at(e.ts + (1 + rand() * 6) * H, () => store.saveRewrite(entry.id, {
      title: entry.title,
      body: f.rewrite,
      model: 'deepseek-v4-flash',
      provider: 'deepseek',
      createdBy: byUser ? '向阳乔木' : 'system',
      userId: byUser ? admin.id : null,
      contentHash: deepseek.rewriteContentHash(entry),
    }));
  }
}

// ---------- reader submissions (clipper path, no network) ----------
for (const s of SUBMISSIONS) {
  const user = users[s.by];
  at(REAL_NOW - s.daysAgo * D, () => fetcher.submitLink(s.url, { id: user.id, displayName: user.display_name || user.displayName, email: user.email }, { title: s.title, markdown: s.markdown, note: s.note || '' }));
}
for (const s of PENDING_SUBMISSIONS) {
  const user = users[s.by];
  at(REAL_NOW - s.hoursAgo * H, () => store.createSubmissionRequest({ url: s.url, userId: user.id, author: user.display_name || user.displayName, note: s.note, title: s.title }));
}
fetcher.flushDisk();

// ---------- personal reading state for the admin (main) account ----------
const sorted = [...allEntries].sort((a, b) => b.ts - a.ts);
let reads = 0; let stars = 0;
for (const e of sorted) {
  const age = REAL_NOW - e.ts;
  const readP = age < 18 * H ? 0.15 : age < 3 * D ? 0.55 : 0.82;
  if (chance(readP)) {
    const readAt = e.ts + (1 + rand() * Math.min(age / H - 1, 40)) * H;
    at(readAt, () => store.setUserEntryState(admin.id, e.entry.id, { read: true, viewed: chance(0.6) }));
    reads++;
    if (chance(e.featured ? 0.7 : 0.12)) { at(readAt + 5 * 60 * 1000, () => store.setUserEntryState(admin.id, e.entry.id, { starred: true })); stars++; }
    if (chance(0.25)) at(readAt + 2 * 60 * 1000, () => store.setEntryReaction(e.entry.id, admin.id, chance(0.9) ? 'like' : 'dislike'));
  }
}
console.log(`admin reads=${reads} stars=${stars}`);

// Other readers: reactions and views drive the "hot" ranking.
for (const e of sorted) {
  const popularity = e.featured ? 0.65 : 0.22;
  for (const k of others) {
    if (chance(popularity)) at(e.ts + (2 + rand() * 72) * H, () => store.setEntryReaction(e.entry.id, users[k].id, chance(0.88) ? 'like' : 'dislike'));
    if (chance(popularity * 0.6)) at(e.ts + (2 + rand() * 72) * H, () => store.setUserEntryState(users[k].id, e.entry.id, { read: true, viewed: true }));
  }
  const views = Math.round((e.featured ? 120 : 8) + rand() * (e.featured ? 400 : 90) * Math.min(1, (REAL_NOW - e.ts) / (5 * D) + 0.2));
  at(e.ts + 6 * H, () => { for (let v = 0; v < views; v++) store.recordEntryView(e.entry.id); store.flushEntryViews(); });
}

// ---------- comments ----------
for (const c of COMMENTS) {
  const e = byKey[c.on];
  if (!e) { console.warn('comment target missing', c.on); continue; }
  const user = users[c.by];
  const ts = Math.min(e.ts + c.afterHours * H, REAL_NOW - 30 * 60 * 1000);
  const comment = at(ts, () => store.addComment(e.entry.id, { userId: user.id, author: user.display_name || user.displayName, body: c.body }));
  for (const k of c.helpful || []) at(ts + (1 + rand() * 20) * H, () => store.setCommentHelpful(e.entry.id, comment.id, users[k].id, true));
}

// ---------- annotations ----------
for (const a of ANNOTATIONS) {
  const e = byKey[a.on];
  if (!e) continue;
  const user = users[a.by];
  const ts = Math.min(e.ts + a.afterHours * H, REAL_NOW - 20 * 60 * 1000);
  const ann = at(ts, () => store.addAnnotation(e.entry.id, { surface: a.surface || 'original', userId: user.id, author: user.display_name || user.displayName, quote: a.quote, body: a.body }));
  (a.replies || []).forEach((r, i) => at(ts + (i + 1) * (2 + rand() * 6) * H, () => store.addAnnotationReply(e.entry.id, ann.id, { userId: users[r.by].id, author: users[r.by].display_name || users[r.by].displayName, body: r.body })));
  for (const k of a.helpful || []) at(ts + 3 * H, () => store.setAnnotationHelpful(e.entry.id, ann.id, users[k].id, true));
}

// ---------- article chats ----------
for (const c of CHATS) {
  const e = byKey[c.on];
  if (!e) continue;
  const user = users[c.by];
  let ts = Math.min(e.ts + c.afterHours * H, REAL_NOW - 2 * H);
  for (const [q, a] of c.turns) {
    at(ts, () => store.addChatMessage(e.entry.id, { userId: user.id, role: 'user', author: user.display_name || user.displayName, content: q }));
    const reply = at(ts + 20 * 1000, () => store.addChatMessage(e.entry.id, { userId: user.id, role: 'assistant', author: 'DeepSeek', content: a, model: 'deepseek-v4-flash' }));
    if (chance(0.5)) at(ts + H, () => store.setChatMessageHelpful(e.entry.id, reply.id, users[pick(others)].id, true));
    ts += (3 + rand() * 10) * 60 * 1000;
  }
}

// Asset "helpful" votes on rewrites / translations.
for (const [key, f] of Object.entries(FEATURED)) {
  const e = byKey[key];
  if (!e) continue;
  for (const k of others) {
    if (f.rewrite && chance(0.5)) at(e.ts + (8 + rand() * 48) * H, () => store.setEntryAssetHelpful(e.entry.id, 'rewrite', users[k].id, true));
    if (f.zh && chance(0.35)) at(e.ts + (8 + rand() * 48) * H, () => store.setEntryAssetHelpful(e.entry.id, 'translation', users[k].id, true));
  }
}

// ---------- follows & notifications ----------
for (const k of ['lin', 'chen', 'momo', 'zhou', 'kevin', 'ada']) at(REAL_NOW - (5 + rand() * 120) * D, () => store.setUserFollow(users[k].id, admin.id, true));
at(REAL_NOW - 60 * D, () => store.setUserFollow(admin.id, users.lin.id, true));
at(REAL_NOW - 21 * D, () => store.setUserFollow(admin.id, users.zhou.id, true));
at(REAL_NOW - 9 * D, () => store.setUserFollow(users.chen.id, users.lin.id, true));
// Older notifications have been read; a few recent ones stay unread.
at(REAL_NOW - 2 * D, () => store.markNotificationsRead(admin.id));
const recentNotes = [
  ['comment_helpful', 'comment', 'simonwillison:0', 'lin', '有人觉得你的点评有用', 5],
  ['asset_helpful', 'rewrite', 'paulgraham:0', 'chen', '有人觉得你的中文改写有用', 14],
  ['annotation_reply', 'annotation', 'oneusefulthing:0', 'zhou', '有人回复了你的划线点评', 27],
  ['follow', 'user', null, 'xiaoyu', '小雨 关注了你', 40],
];
for (const [type, objectType, key, actor, message, hoursAgo] of recentNotes) {
  at(REAL_NOW - hoursAgo * H, () => store.createNotification({ userId: admin.id, actorId: users[actor].id, type, objectType, objectId: '', entryId: key && byKey[key] ? byKey[key].entry.id : '', message }));
}

// ---------- source health messiness ----------
const gwern = sourceById.gwern;
if (gwern) fetcher.recordSourceFailure(gwern, new Error('https://gwern.net/feed: 403 Forbidden (Cloudflare challenge)'));
fetcher.flushDisk();

fs.writeFileSync(path.join(__dirname, 'ai-lookup.json'), JSON.stringify(lookup, null, 1));
console.log('seed complete');
process.exit(0);
