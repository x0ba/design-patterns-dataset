// Local stand-in for a Mastodon server ("Rosebud Social") + static host for the
// Phanpy production build. Everything runs on one origin: http://localhost:$PORT
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { avatarSVG, sceneSVG } from './art.mjs';
import { INSTANCE_TITLE } from './content.mjs';
import { buildDB } from './seed.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4440);
const DIST = process.env.DIST || path.resolve(__dirname, '../out');
const DOMAIN = `localhost:${PORT}`;
const db = buildDB(DOMAIN);
const { ORIGIN, me } = db;

// ---------------- serializers ----------------
function acc(a) {
  if (!a) return null;
  const { _key, _color, _extra, source, role, ...rest } = a;
  return rest;
}
function filteredFor(s, context = 'home') {
  const text = (s._text || '').toLowerCase();
  const out = [];
  for (const f of db.filters) {
    const matches = f.keywords.filter((k) =>
      k.whole_word ? new RegExp(`\\b${k.keyword.toLowerCase()}\\b`).test(text) : text.includes(k.keyword.toLowerCase()),
    );
    if (matches.length && f.context.includes(context))
      out.push({ filter: f, keyword_matches: matches.map((m) => m.keyword), status_matches: [] });
  }
  return out;
}
function st(s, context) {
  if (!s) return null;
  const { _text, ...rest } = s;
  const out = {
    ...rest,
    account: acc(db.accounts[s.account]),
    reblog: s.reblog ? st(db.statuses[s.reblog], context) : null,
    favourited: db.favourited.has(s.id),
    reblogged: db.reblogged.has(s.id),
    bookmarked: db.bookmarked.has(s.id),
    muted: false,
    pinned: s.account === me.id ? db.pinned.has(s.id) : undefined,
    filtered: s.reblog ? [] : filteredFor(s, context),
  };
  if (out.pinned === undefined) delete out.pinned;
  if (out.reblog) {
    out.favourited = out.reblog.favourited;
    out.reblogged = out.reblog.reblogged;
    out.bookmarked = out.reblog.bookmarked;
  }
  return out;
}
function notif(n) {
  const out = {
    id: n.id, type: n.type, created_at: new Date(n.at).toISOString(), group_key: `ungrouped-${n.id}`,
    account: acc(db.accounts[n.account]),
  };
  if (n.status) out.status = st(db.statuses[n.status], 'notifications');
  return out;
}
function relationship(id) {
  return {
    id,
    following: db.following.has(id),
    showing_reblogs: true,
    notifying: id === db.byKey.pdxbikes.id,
    languages: null,
    followed_by: db.followers.has(id),
    blocking: false, blocked_by: false, muting: false, muting_notifications: false,
    requested: false, requested_by: db.followRequests.includes(id), domain_blocking: false,
    endorsed: [db.byKey.jun.id, db.byKey.marcus.id, db.byKey.sofia.id].includes(id),
    note: id === db.byKey.sam.id ? 'Barista at Third Wave — makes my oat cortado' : '',
  };
}
function tagHistory(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = Math.floor((db.NOW - i * 86400_000) / 86400_000) * 86400;
    const uses = ((h >> i) % 90) + 8 + (6 - i) * 3;
    days.push({ day: String(day), uses: String(uses), accounts: String(Math.round(uses * 0.7)) });
  }
  return days;
}
function tagEntity(name) {
  return {
    name, url: `${ORIGIN}/tags/${name.toLowerCase()}`, history: tagHistory(name.toLowerCase()),
    following: db.followedTags.has(name.toLowerCase()), featuring: false,
    id: String(7000 + name.length),
  };
}

// ---------------- pagination ----------------
function paginate(req, res, items, getId = (x) => x.id, defLimit = 20) {
  const q = req.query;
  const limit = Math.min(Number(q.limit) || defLimit, 80);
  const big = (x) => BigInt(x);
  let list = items;
  if (q.max_id) list = list.filter((x) => big(getId(x)) < big(q.max_id));
  if (q.since_id) list = list.filter((x) => big(getId(x)) > big(q.since_id));
  let page;
  if (q.min_id) {
    list = list.filter((x) => big(getId(x)) > big(q.min_id));
    page = list.slice(Math.max(0, list.length - limit));
  } else page = list.slice(0, limit);
  const base = `${ORIGIN}${req.pathname}`;
  const keep = new URLSearchParams(req.search);
  ['max_id', 'since_id', 'min_id'].forEach((k) => keep.delete(k));
  const links = [];
  if (page.length) {
    const p1 = new URLSearchParams(keep);
    p1.set('max_id', getId(page[page.length - 1]));
    if (page.length >= limit || list.length > page.length) links.push(`<${base}?${p1}>; rel="next"`);
    const p2 = new URLSearchParams(keep);
    p2.set('min_id', getId(page[0]));
    links.push(`<${base}?${p2}>; rel="prev"`);
  }
  if (links.length) res.setHeader('Link', links.join(', '));
  return page;
}
// For collections without numeric-id-ordered pagination (bookmarks etc), use index cursors
function paginateIndex(req, res, items, defLimit = 20) {
  const q = req.query;
  const limit = Math.min(Number(q.limit) || defLimit, 80);
  const start = q.max_id ? Number(q.max_id) : 0;
  const page = items.slice(start, start + limit);
  if (start + limit < items.length) {
    const p = new URLSearchParams(req.search);
    p.set('max_id', String(start + limit));
    res.setHeader('Link', `<${ORIGIN}${req.pathname}?${p}>; rel="next"`);
  }
  return page;
}

// ---------------- helpers ----------------
const statusList = () => db.statusOrder.map((id) => db.statuses[id]);
const visibleInHome = (s) =>
  s.visibility !== 'direct' && (s.account === me.id || db.following.has(s.account)) &&
  (!s.in_reply_to_id || db.following.has(db.statuses[s.in_reply_to_id]?.account) || db.statuses[s.in_reply_to_id]?.account === me.id);
const hasTag = (s, tag) => {
  const t = s.reblog ? db.statuses[s.reblog] : s;
  return t.tags.some((x) => x.name === tag.toLowerCase());
};
function context(id) {
  const s = db.statuses[id];
  const ancestors = [];
  let p = s.in_reply_to_id;
  while (p && db.statuses[p]) {
    ancestors.unshift(db.statuses[p]);
    p = db.statuses[p].in_reply_to_id;
  }
  const descendants = [];
  const walk = (pid) => {
    statusList()
      .filter((x) => x.in_reply_to_id === pid && !x.reblog)
      .reverse()
      .forEach((x) => {
        descendants.push(x);
        walk(x.id);
      });
  };
  walk(id);
  return { ancestors: ancestors.map((x) => st(x, 'thread')), descendants: descendants.map((x) => st(x, 'thread')) };
}
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const type = req.headers['content-type'] || '';
      try {
        if (type.includes('application/json')) return resolve(JSON.parse(raw.toString() || '{}'));
        if (type.includes('urlencoded')) return resolve(Object.fromEntries(new URLSearchParams(raw.toString())));
        if (type.includes('multipart/form-data')) {
          const out = {};
          const str = raw.toString('latin1');
          for (const m of str.matchAll(/name="([^"]+)"(?:; filename="[^"]*")?\r\n(?:[^\r\n]+\r\n)*\r\n([\s\S]*?)\r\n--/g)) {
            out[m[1]] = m[1] === 'file' ? '[binary]' : Buffer.from(m[2], 'latin1').toString('utf8');
          }
          return resolve(out);
        }
      } catch (e) {}
      resolve({});
    });
  });
}
const param = (body, name) => body[name] ?? body[`${name}[]`];

const INSTANCE_V2 = () => ({
  domain: DOMAIN,
  title: INSTANCE_TITLE,
  version: '4.4.3',
  source_url: 'https://github.com/mastodon/mastodon',
  description: 'A small, friendly Mastodon server for folks in the Pacific Northwest who like bikes, books, design and making things. Moderated by volunteers.',
  usage: { users: { active_month: 1873 } },
  thumbnail: { url: `${ORIGIN}/_stub/header/rosebud.svg`, blurhash: null, versions: {} },
  icon: [],
  languages: ['en'],
  configuration: {
    urls: { status: `${ORIGIN}/status`, about: `${ORIGIN}/about`, privacy_policy: `${ORIGIN}/privacy-policy`, terms_of_service: null },
    vapid: { public_key: 'BCkMmVdKDnKYwzVCDC99Iuc9GvId-x7-kKtuHnLgfF98ENiZp_aj-UNthbCdI70DqN1zUVis-x0Wrot2sBagkMc=' },
    accounts: { max_featured_tags: 10, max_pinned_statuses: 5 },
    statuses: { max_characters: 500, max_media_attachments: 4, characters_reserved_per_url: 23 },
    media_attachments: {
      supported_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif', 'image/webp', 'image/avif', 'video/webm', 'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/ogg', 'audio/wav'],
      description_limit: 1500, image_size_limit: 16777216, image_matrix_limit: 33177600, video_size_limit: 103809024, video_frame_rate_limit: 120, video_matrix_limit: 8294400,
    },
    polls: { max_options: 4, max_characters_per_option: 50, min_expiration: 300, max_expiration: 2629746 },
    translation: { enabled: false },
  },
  registrations: { enabled: true, approval_required: true, message: null, url: null },
  api_versions: { mastodon: 1 },
  contact: { email: 'mods@rosebud.example', account: acc(db.byKey.marcus) },
  rules: [
    { id: '1', text: 'No racism, sexism, homophobia, transphobia, ableism or other bigotry.', hint: '' },
    { id: '2', text: 'Use content warnings for spoilers, politics, and potentially upsetting content.', hint: '' },
    { id: '3', text: 'Add image descriptions (alt text) to your media.', hint: 'Not strictly enforced, but strongly encouraged.' },
    { id: '4', text: 'No unmarked commercial or automated posting.', hint: '' },
  ],
});
const INSTANCE_V1 = () => {
  const v2 = INSTANCE_V2();
  return {
    uri: DOMAIN, title: v2.title, short_description: v2.description, description: v2.description,
    email: v2.contact.email, version: v2.version, urls: {}, stats: { user_count: 4120, status_count: 812345, domain_count: 9876 },
    thumbnail: v2.thumbnail.url, languages: ['en'], registrations: true, approval_required: true, invites_enabled: true,
    configuration: v2.configuration, contact_account: v2.contact.account, rules: v2.rules,
  };
};

// ---------------- routes ----------------
const routes = [];
const route = (method, pattern, fn) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ method, re, keys, fn });
};
const statusById = (id) => db.statuses[id];

route('GET', '/api/v2/instance', () => INSTANCE_V2());
route('GET', '/api/v1/instance', () => INSTANCE_V1());
route('GET', '/api/v1/instance/rules', () => INSTANCE_V2().rules);
route('GET', '/api/v1/instance/extended_description', () => ({ updated_at: new Date(db.NOW - 86400_000 * 40).toISOString(), content: `<p>${INSTANCE_V2().description}</p>` }));
route('GET', '/.well-known/nodeinfo', () => ({ links: [{ rel: 'http://nodeinfo.diaspora.software/ns/schema/2.0', href: `${ORIGIN}/nodeinfo/2.0` }] }));
route('GET', '/nodeinfo/2.0', () => ({
  version: '2.0', software: { name: 'mastodon', version: '4.4.3' }, protocols: ['activitypub'], services: { outbound: [], inbound: [] },
  usage: { users: { total: 4120, activeMonth: 1873, activeHalfyear: 2650 }, localPosts: 812345 }, openRegistrations: true, metadata: { nodeName: INSTANCE_TITLE },
}));
route('GET', '/.well-known/oauth-authorization-server', () => ({
  issuer: `${ORIGIN}/`, service_documentation: 'https://docs.joinmastodon.org/',
  authorization_endpoint: `${ORIGIN}/oauth/authorize`, token_endpoint: `${ORIGIN}/oauth/token`, revocation_endpoint: `${ORIGIN}/oauth/revoke`,
  scopes_supported: ['read', 'write', 'follow', 'push'], response_types_supported: ['code'], response_modes_supported: ['query', 'fragment', 'form_post'],
  code_challenge_methods_supported: ['S256'], grant_types_supported: ['authorization_code', 'client_credentials'],
  token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
}));

// OAuth: the fake server treats the browser as already signed in as @priya and
// approves the authorization request immediately.
route('POST', '/api/v1/apps', async (req) => {
  const body = await readBody(req);
  return {
    id: '1', name: body.client_name || 'Phanpy', website: body.website || null, scopes: ['read', 'write', 'follow', 'push'],
    redirect_uri: body.redirect_uris, redirect_uris: [body.redirect_uris],
    client_id: 'rosebud-local-client-id', client_secret: 'rosebud-local-client-secret',
    vapid_key: INSTANCE_V2().configuration.vapid.public_key,
  };
});
route('GET', '/oauth/authorize', (req, res) => {
  const redirect = req.query.redirect_uri || '/';
  const u = new URL(redirect, ORIGIN);
  u.searchParams.set('code', 'rosebud-local-auth-code');
  res.writeHead(302, { Location: u.toString() });
  res.end();
  return undefined;
});
route('POST', '/oauth/token', () => ({ access_token: 'rosebud-local-access-token-priya', token_type: 'Bearer', scope: 'read write follow push', created_at: Math.floor(db.NOW / 1000) }));
route('POST', '/oauth/revoke', () => ({}));

route('GET', '/api/v1/accounts/verify_credentials', () => ({ ...acc(me), source: me.source, role: me.role }));
route('PATCH', '/api/v1/accounts/update_credentials', async (req) => {
  const body = await readBody(req);
  if (body.display_name) me.display_name = body.display_name;
  if (body.note) { me.note = `<p>${body.note}</p>`; me.source.note = body.note; }
  return { ...acc(me), source: me.source };
});
route('GET', '/api/v1/preferences', () => ({
  'posting:default:visibility': 'public', 'posting:default:sensitive': false, 'posting:default:language': 'en',
  'posting:default:quote_policy': 'public', 'reading:expand:media': 'default', 'reading:expand:spoilers': false, 'reading:autoplay:gifs': false,
}));
route('GET', '/api/v1/custom_emojis', () => []);
route('GET', '/api/v1/announcements', () => [
  {
    id: '8', content: `<p>Server maintenance this Sunday 2–3am Pacific: we're upgrading to Mastodon 4.5. Expect a few minutes of downtime. Thanks for your patience, and thank you to our 212 monthly donors who keep Rosebud running! 🌹</p>`,
    starts_at: null, ends_at: null, all_day: false, published_at: new Date(db.NOW - 2 * 86400_000).toISOString(),
    updated_at: new Date(db.NOW - 2 * 86400_000).toISOString(), read: false, mentions: [], statuses: [], tags: [], emojis: [],
    reactions: [{ name: '👍', count: 48, me: false }, { name: '🌹', count: 21, me: true }, { name: '🎉', count: 9, me: false }],
  },
]);
route('POST', '/api/v1/announcements/:id/dismiss', () => ({}));
route('GET', '/api/v1/markers', () => ({
  home: { last_read_id: db.homeMarker, version: 2481, updated_at: new Date(db.NOW - 3 * 3600_000).toISOString() },
  notifications: { last_read_id: db.notifMarker, version: 977, updated_at: new Date(db.NOW - 3 * 3600_000).toISOString() },
}));
route('POST', '/api/v1/markers', async (req) => {
  const body = await readBody(req);
  const h = body['home[last_read_id]'] || body.home?.last_read_id;
  const n = body['notifications[last_read_id]'] || body.notifications?.last_read_id;
  if (h) db.homeMarker = h;
  if (n) db.notifMarker = n;
  return {};
});

// timelines
route('GET', '/api/v1/timelines/home', (req, res) => paginate(req, res, statusList().filter(visibleInHome)).map((s) => st(s, 'home')));
route('GET', '/api/v1/timelines/public', (req, res) => {
  let list = statusList().filter((s) => s.visibility === 'public' && !s.reblog);
  if (req.query.local === 'true') list = list.filter((s) => !db.accounts[s.account].acct.includes('@'));
  if (req.query.remote === 'true') list = list.filter((s) => db.accounts[s.account].acct.includes('@'));
  if (req.query.only_media === 'true') list = list.filter((s) => s.media_attachments.length);
  return paginate(req, res, list).map((s) => st(s, 'public'));
});
route('GET', '/api/v1/timelines/tag/:tag', (req, res) => {
  const tags = [req.params.tag, ...[].concat(req.query['any[]'] || req.query.any || [])];
  let list = statusList().filter((s) => s.visibility === 'public' && !s.reblog && tags.some((t) => hasTag(s, decodeURIComponent(t))));
  if (req.query.only_media === 'true') list = list.filter((s) => s.media_attachments.length);
  return paginate(req, res, list).map((s) => st(s, 'public'));
});
route('GET', '/api/v1/timelines/list/:id', (req, res) => {
  const members = new Set(db.listMembers[req.params.id] || []);
  return paginate(req, res, statusList().filter((s) => members.has(s.account) && s.visibility !== 'direct')).map((s) => st(s, 'home'));
});
route('GET', '/api/v1/timelines/link', (req, res) => {
  const url = req.query.url;
  return paginate(req, res, statusList().filter((s) => s.card && s.card.url === url)).map((s) => st(s, 'public'));
});

// statuses
route('GET', '/api/v1/statuses', (req) => [].concat(req.query['id[]'] || req.query.id || []).map((id) => st(statusById(id), 'thread')).filter(Boolean));
route('GET', '/api/v1/statuses/:id', (req) => st(statusById(req.params.id), 'thread') || [404, { error: 'Record not found' }]);
route('GET', '/api/v1/statuses/:id/context', (req) => (statusById(req.params.id) ? context(req.params.id) : [404, { error: 'Record not found' }]));
route('GET', '/api/v1/statuses/:id/history', (req) => {
  const s = statusById(req.params.id);
  const versions = db.edits[req.params.id] || [{ content: s.content, created_at: s.created_at }];
  return versions.map((v) => ({ content: v.content, spoiler_text: s.spoiler_text, sensitive: s.sensitive, created_at: v.created_at, account: acc(db.accounts[s.account]), poll: null, media_attachments: s.media_attachments, emojis: [] }));
});
route('GET', '/api/v1/statuses/:id/source', (req) => ({ id: req.params.id, text: statusById(req.params.id)._text, spoiler_text: statusById(req.params.id).spoiler_text }));
const byStatusAccounts = (req, res, type) => {
  const s = statusById(req.params.id);
  const accs = Object.values(db.accounts).filter((a) => a.id !== s.account);
  const n = Math.min(accs.length, type === 'fav' ? s.favourites_count : s.reblogs_count);
  const list = accs.sort((a, b) => (a.id + s.id).localeCompare(b.id + s.id)).slice(0, n);
  return paginateIndex(req, res, list, 40).map(acc);
};
route('GET', '/api/v1/statuses/:id/favourited_by', (req, res) => byStatusAccounts(req, res, 'fav'));
route('GET', '/api/v1/statuses/:id/reblogged_by', (req, res) => byStatusAccounts(req, res, 'boost'));
route('GET', '/api/v1/statuses/:id/quotes', () => []);
const toggle = (set, field, on) => (req) => {
  const s = statusById(req.params.id);
  if (!s) return [404, { error: 'Record not found' }];
  const target = s.reblog ? statusById(s.reblog) : s;
  const had = set.has(target.id);
  if (on && !had) { set.add(target.id); if (field) target[field]++; }
  if (!on && had) { set.delete(target.id); if (field) target[field]--; }
  return st(target);
};
route('POST', '/api/v1/statuses/:id/favourite', toggle(db.favourited, 'favourites_count', true));
route('POST', '/api/v1/statuses/:id/unfavourite', toggle(db.favourited, 'favourites_count', false));
route('POST', '/api/v1/statuses/:id/bookmark', toggle(db.bookmarked, null, true));
route('POST', '/api/v1/statuses/:id/unbookmark', toggle(db.bookmarked, null, false));
route('POST', '/api/v1/statuses/:id/unreblog', toggle(db.reblogged, 'reblogs_count', false));
route('POST', '/api/v1/statuses/:id/reblog', (req) => {
  const target = statusById(req.params.id);
  toggle(db.reblogged, 'reblogs_count', true)(req);
  const id = ((BigInt(Date.now()) << 16n) + 1n).toString();
  db.statuses[id] = { ...target, id, created_at: new Date().toISOString(), account: me.id, reblog: target.id, content: '', media_attachments: [], url: null, _text: '' };
  db.statusOrder.unshift(id);
  return st(db.statuses[id]);
});
route('POST', '/api/v1/statuses/:id/pin', (req) => (db.pinned.add(req.params.id), st(statusById(req.params.id))));
route('POST', '/api/v1/statuses/:id/unpin', (req) => (db.pinned.delete(req.params.id), st(statusById(req.params.id))));
route('POST', '/api/v1/statuses/:id/mute', (req) => st(statusById(req.params.id)));
route('POST', '/api/v1/statuses/:id/unmute', (req) => st(statusById(req.params.id)));
route('DELETE', '/api/v1/statuses/:id', (req) => {
  const s = statusById(req.params.id);
  delete db.statuses[req.params.id];
  db.statusOrder = db.statusOrder.filter((x) => x !== req.params.id);
  return { ...st(s), text: s?._text };
});
const escapeHTML = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
route('POST', '/api/v1/statuses', async (req) => {
  const body = await readBody(req);
  const text = body.status || '';
  if (body.scheduled_at) {
    const sch = { id: String(Date.now()), scheduled_at: body.scheduled_at, media_attachments: [], params: { text, visibility: body.visibility || 'public', language: body.language || 'en', poll: null, media_ids: null, sensitive: null, spoiler_text: body.spoiler_text || null, in_reply_to_id: body.in_reply_to_id || null, application_id: 1 } };
    db.scheduled.push(sch);
    return sch;
  }
  const id = ((BigInt(Date.now()) << 16n) + 2n).toString();
  const parent = body.in_reply_to_id ? statusById(body.in_reply_to_id) : null;
  const tags = [...text.matchAll(/#(\w+)/g)].map((m) => ({ name: m[1].toLowerCase(), url: `${ORIGIN}/tags/${m[1].toLowerCase()}` }));
  const html = text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHTML(p).replace(/\n/g, '<br />').replace(/#(\w+)/g, `<a href="${ORIGIN}/tags/$1" class="mention hashtag" rel="tag">#<span>$1</span></a>`)}</p>`)
    .join('');
  const pollOpts = param(body, 'poll[options]') || body.poll?.options;
  db.statuses[id] = {
    id, created_at: new Date().toISOString(), in_reply_to_id: parent?.id || null, in_reply_to_account_id: parent?.account || null,
    sensitive: !!body.spoiler_text || body.sensitive === 'true' || body.sensitive === true, spoiler_text: body.spoiler_text || '',
    visibility: body.visibility || 'public', language: body.language || 'en', uri: `${me.uri}/statuses/${id}`, url: `${me.url}/${id}`,
    replies_count: 0, reblogs_count: 0, favourites_count: 0, quotes_count: 0, edited_at: null, content: html, reblog: null,
    application: { name: 'Phanpy', website: 'https://phanpy.social' }, account: me.id, media_attachments: [], mentions: [], tags, emojis: [], card: null,
    poll: pollOpts ? { id: id, expires_at: new Date(Date.now() + 86400_000).toISOString(), expired: false, multiple: false, votes_count: 0, voters_count: 0, voted: true, own_votes: [], options: [].concat(pollOpts).map((t) => ({ title: t, votes_count: 0 })), emojis: [] } : null,
    _text: text,
  };
  if (parent) parent.replies_count++;
  db.statusOrder.unshift(id);
  me.statuses_count++;
  return st(db.statuses[id]);
});
route('PUT', '/api/v1/statuses/:id', async (req) => {
  const body = await readBody(req);
  const s = statusById(req.params.id);
  s._text = body.status;
  s.content = `<p>${escapeHTML(body.status || '')}</p>`;
  s.edited_at = new Date().toISOString();
  return st(s);
});
route('POST', '/api/v1/polls/:id/votes', async (req) => {
  const body = await readBody(req);
  const s = Object.values(db.statuses).find((x) => x.poll && x.poll.id === req.params.id);
  const choices = [].concat(param(body, 'choices') || []).map(Number);
  choices.forEach((c) => s.poll.options[c] && s.poll.options[c].votes_count++);
  s.poll.votes_count += choices.length;
  s.poll.voters_count++;
  s.poll.voted = true;
  s.poll.own_votes = choices;
  return s.poll;
});
route('GET', '/api/v1/polls/:id', (req) => Object.values(db.statuses).find((x) => x.poll && x.poll.id === req.params.id)?.poll);
route('POST', '/api/v2/media', async () => {
  const id = String(Date.now());
  const url = `${ORIGIN}/_stub/media/upload-${id}.svg?w=1200&h=900`;
  return { id, type: 'image', url, preview_url: url, remote_url: null, text_url: null, meta: { original: { width: 1200, height: 900, size: '1200x900', aspect: 1.333 } }, description: null, blurhash: null };
});
route('PUT', '/api/v1/media/:id', async (req) => {
  const body = await readBody(req);
  const url = `${ORIGIN}/_stub/media/upload-${req.params.id}.svg?w=1200&h=900`;
  return { id: req.params.id, type: 'image', url, preview_url: url, description: body.description || null, meta: {}, blurhash: null };
});

// accounts
const accountStatuses = (req, res) => {
  const id = req.params.id;
  const q = req.query;
  if (q.pinned === 'true') return [...db.pinned].map((pid) => st(statusById(pid), 'account')).filter(Boolean);
  let list = statusList().filter((s) => s.account === id && s.visibility !== 'direct');
  if (q.exclude_replies === 'true') list = list.filter((s) => !s.in_reply_to_id || db.statuses[s.in_reply_to_id]?.account === id);
  if (q.exclude_reblogs === 'true') list = list.filter((s) => !s.reblog);
  if (q.only_media === 'true') list = list.filter((s) => s.media_attachments.length);
  if (q.tagged) list = list.filter((s) => hasTag(s, q.tagged));
  return paginate(req, res, list).map((s) => st(s, 'account'));
};
route('GET', '/api/v1/accounts/relationships', (req) => [].concat(req.query['id[]'] || req.query.id || []).map(relationship));
route('GET', '/api/v1/accounts/familiar_followers', (req) =>
  [].concat(req.query['id[]'] || req.query.id || []).map((id) => ({
    id, accounts: Object.values(db.accounts).filter((a) => db.following.has(a.id) && a.id !== id && (parseInt(a.id.slice(-3)) + parseInt(id.slice(-3))) % 4 === 0).slice(0, 5).map(acc),
  })),
);
route('GET', '/api/v1/accounts/lookup', (req) => {
  const q = (req.query.acct || '').replace(/^@/, '').toLowerCase();
  const a = Object.values(db.accounts).find((x) => x.acct.toLowerCase() === q || x.acct.toLowerCase() === q.replace(`@${DOMAIN}`, '') || x.username.toLowerCase() === q);
  return a ? acc(a) : [404, { error: 'Record not found' }];
});
route('GET', '/api/v1/accounts/search', (req) => {
  const q = (req.query.q || '').replace(/^@/, '').toLowerCase();
  return Object.values(db.accounts).filter((a) => a.acct.toLowerCase().includes(q) || a.display_name.toLowerCase().includes(q)).slice(0, Number(req.query.limit) || 10).map(acc);
});
route('GET', '/api/v1/accounts/:id', (req) => acc(db.accounts[req.params.id]) || [404, { error: 'Record not found' }]);
route('GET', '/api/v1/accounts/:id/statuses', accountStatuses);
route('GET', '/api/v1/accounts/:id/followers', (req, res) => {
  const id = req.params.id;
  const list = id === me.id ? [...db.followers].map((x) => db.accounts[x]) : Object.values(db.accounts).filter((a) => a.id !== id && (a.id.charCodeAt(a.id.length - 1) + id.charCodeAt(id.length - 2)) % 3 !== 0);
  return paginateIndex(req, res, list, 40).map(acc);
});
route('GET', '/api/v1/accounts/:id/following', (req, res) => {
  const id = req.params.id;
  const list = id === me.id ? [...db.following].map((x) => db.accounts[x]) : Object.values(db.accounts).filter((a) => a.id !== id && (a.id.charCodeAt(a.id.length - 1) + id.charCodeAt(id.length - 2)) % 3 === 1);
  return paginateIndex(req, res, list, 40).map(acc);
});
route('GET', '/api/v1/accounts/:id/featured_tags', (req) =>
  req.params.id === me.id
    ? [['a11y', 41], ['BikePDX', 28], ['sourdough', 12], ['UXDesign', 37]].map(([name, n], i) => ({ id: String(600 + i), name, url: `${me.url}/tagged/${name}`, statuses_count: n, last_status_at: new Date(db.NOW - i * 5 * 86400_000).toISOString().slice(0, 10) }))
    : [],
);
route('GET', '/api/v1/accounts/:id/endorsements', (req) => (req.params.id === me.id ? [db.byKey.jun, db.byKey.marcus, db.byKey.sofia].map(acc) : []));
route('GET', '/api/v1/accounts/:id/lists', (req) => db.lists.filter((l) => db.listMembers[l.id].includes(req.params.id)));
route('GET', '/api/v1/accounts/:id/collections', () => []);
route('GET', '/api/v1/accounts/:id/in_collections', () => []);
for (const action of ['follow', 'unfollow', 'block', 'unblock', 'mute', 'unmute', 'note', 'pin', 'unpin', 'endorse', 'unendorse', 'remove_from_followers']) {
  route('POST', `/api/v1/accounts/:id/${action}`, (req) => {
    if (action === 'follow') db.following.add(req.params.id);
    if (action === 'unfollow') db.following.delete(req.params.id);
    return relationship(req.params.id);
  });
}

// notifications
route('GET', '/api/v1/notifications', (req, res) => {
  let list = db.notifications;
  const types = [].concat(req.query['types[]'] || req.query.types || []);
  const exclude = [].concat(req.query['exclude_types[]'] || req.query.exclude_types || []);
  if (types.length) list = list.filter((n) => types.includes(n.type));
  if (exclude.length) list = list.filter((n) => !exclude.includes(n.type));
  return paginate(req, res, list).map(notif);
});
route('GET', '/api/v1/notifications/unread_count', () => ({ count: db.notifications.filter((n) => BigInt(n.id) > BigInt(db.notifMarker || 0)).length }));
route('GET', '/api/v1/notifications/requests', () => []);
route('GET', '/api/v1/notifications/policy', () => ({ filter_not_following: false, filter_not_followers: false, filter_new_accounts: false, filter_private_mentions: true, summary: { pending_requests_count: 0, pending_notifications_count: 0 } }));
route('GET', '/api/v2/notifications/policy', () => ({ for_not_following: 'accept', for_not_followers: 'accept', for_new_accounts: 'accept', for_private_mentions: 'filter', for_limited_accounts: 'filter', summary: { pending_requests_count: 0, pending_notifications_count: 0 } }));
route('GET', '/api/v1/notifications/:id', (req) => notif(db.notifications.find((n) => n.id === req.params.id)));
route('POST', '/api/v1/notifications/clear', () => ({}));
route('GET', '/api/v1/follow_requests', () => db.followRequests.map((id) => acc(db.accounts[id])));
route('POST', '/api/v1/follow_requests/:id/authorize', (req) => { db.followRequests = db.followRequests.filter((x) => x !== req.params.id); db.followers.add(req.params.id); return relationship(req.params.id); });
route('POST', '/api/v1/follow_requests/:id/reject', (req) => { db.followRequests = db.followRequests.filter((x) => x !== req.params.id); return relationship(req.params.id); });
route('GET', '/api/v1/conversations', () =>
  db.conversations.map((c) => ({ id: c.id, unread: c.unread, accounts: c.accounts.map((id) => acc(db.accounts[id])), last_status: st(statusById(c.last_status)) })),
);

// bookmarks / favourites
route('GET', '/api/v1/bookmarks', (req, res) => paginateIndex(req, res, statusList().filter((s) => db.bookmarked.has(s.id)).map((s) => st(s))));
route('GET', '/api/v1/favourites', (req, res) => paginateIndex(req, res, statusList().filter((s) => db.favourited.has(s.id)).map((s) => st(s))));

// lists
route('GET', '/api/v1/lists', () => db.lists);
route('GET', '/api/v1/lists/:id', (req) => db.lists.find((l) => l.id === req.params.id) || [404, { error: 'Record not found' }]);
route('GET', '/api/v1/lists/:id/accounts', (req) => (db.listMembers[req.params.id] || []).map((id) => acc(db.accounts[id])));
route('POST', '/api/v1/lists', async (req) => {
  const body = await readBody(req);
  const l = { id: String(100 + db.lists.length), title: body.title, replies_policy: body.replies_policy || 'list', exclusive: body.exclusive === 'true' || body.exclusive === true };
  db.lists.push(l);
  db.listMembers[l.id] = [];
  return l;
});
route('PUT', '/api/v1/lists/:id', async (req) => {
  const body = await readBody(req);
  const l = db.lists.find((x) => x.id === req.params.id);
  Object.assign(l, { title: body.title ?? l.title, replies_policy: body.replies_policy ?? l.replies_policy });
  return l;
});
route('DELETE', '/api/v1/lists/:id', (req) => { db.lists = db.lists.filter((l) => l.id !== req.params.id); return {}; });
route('POST', '/api/v1/lists/:id/accounts', async (req) => { const b = await readBody(req); db.listMembers[req.params.id].push(...[].concat(param(b, 'account_ids') || [])); return {}; });
route('DELETE', '/api/v1/lists/:id/accounts', async (req) => { const b = await readBody(req); const rm = [].concat(param(b, 'account_ids') || req.query['account_ids[]'] || []); db.listMembers[req.params.id] = db.listMembers[req.params.id].filter((x) => !rm.includes(x)); return {}; });

// tags
route('GET', '/api/v1/followed_tags', () => [...db.followedTags].map((t) => tagEntity(t)));
route('GET', '/api/v1/featured_tags', () => []);
route('GET', '/api/v1/featured_tags/suggestions', () => []);
route('GET', '/api/v1/tags/:name', (req) => tagEntity(decodeURIComponent(req.params.name)));
route('POST', '/api/v1/tags/:name/follow', (req) => (db.followedTags.add(req.params.name.toLowerCase()), tagEntity(req.params.name)));
route('POST', '/api/v1/tags/:name/unfollow', (req) => (db.followedTags.delete(req.params.name.toLowerCase()), tagEntity(req.params.name)));

// filters
route('GET', '/api/v2/filters', () => db.filters);
route('GET', '/api/v2/filters/:id', (req) => db.filters.find((f) => f.id === req.params.id));
route('GET', '/api/v1/filters', () => []);

// trends
route('GET', '/api/v1/trends/tags', () =>
  ['BikePDX', 'FilmPhotography', 'a11y', 'LeaveTheLeaves', 'baking', 'gamedev', 'typography', 'PNWweather', 'homelab', 'BookToot'].map((t) => tagEntity(t)),
);
route('GET', '/api/v1/trends', () => ['BikePDX', 'FilmPhotography', 'a11y'].map((t) => tagEntity(t)));
route('GET', '/api/v1/trends/statuses', (req, res) =>
  paginateIndex(req, res, statusList().filter((s) => !s.reblog && s.visibility === 'public' && !s.in_reply_to_id).sort((a, b) => b.favourites_count + b.reblogs_count * 2 - (a.favourites_count + a.reblogs_count * 2)).slice(0, 40).map((s) => st(s, 'public'))),
);
route('GET', '/api/v1/trends/links', () => {
  const cards = statusList().filter((s) => s.card && !s.reblog);
  return cards.map((s, i) => ({ ...s.card, history: tagHistory(s.card.title), uses: undefined }));
});
route('GET', '/api/v1/directory', (req) => Object.values(db.accounts).filter((a) => a !== me).slice(0, Number(req.query.limit) || 40).map(acc));
route('GET', '/api/v2/suggestions', () => Object.values(db.accounts).filter((a) => a._extra).slice(0, 6).map((a) => ({ source: 'global', sources: ['friends_of_friends'], account: acc(a) })));

// search
route('GET', '/api/v2/search', (req) => {
  const q = (req.query.q || '').trim();
  const lq = q.toLowerCase().replace(/^[@#]/, '');
  const type = req.query.type;
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  const out = { accounts: [], statuses: [], hashtags: [] };
  if (!lq) return out;
  if (!type || type === 'accounts')
    out.accounts = Object.values(db.accounts).filter((a) => a.acct.toLowerCase().includes(lq) || a.display_name.toLowerCase().includes(lq) || a.note.toLowerCase().includes(lq)).slice(offset, offset + limit).map(acc);
  if (!type || type === 'statuses')
    out.statuses = statusList().filter((s) => !s.reblog && s.visibility !== 'direct' && (s._text || '').toLowerCase().includes(lq)).slice(offset, offset + limit).map((s) => st(s));
  if (!type || type === 'hashtags') {
    const all = new Set();
    statusList().forEach((s) => s.tags.forEach((t) => all.add(t.name)));
    ['bikepdx', 'bikes', 'bikeportland', 'design', 'designsystems', 'uxdesign', 'accessibility'].forEach((t) => all.add(t));
    out.hashtags = [...all].filter((t) => t.includes(lq)).slice(offset, offset + limit).map((t) => tagEntity(t));
  }
  return out;
});

// misc
route('GET', '/api/v1/scheduled_statuses', () => db.scheduled);
route('GET', '/api/v1/scheduled_statuses/:id', (req) => db.scheduled.find((s) => s.id === req.params.id));
route('PUT', '/api/v1/scheduled_statuses/:id', async (req) => { const b = await readBody(req); const s = db.scheduled.find((x) => x.id === req.params.id); if (b.scheduled_at) s.scheduled_at = b.scheduled_at; return s; });
route('DELETE', '/api/v1/scheduled_statuses/:id', (req) => { db.scheduled = db.scheduled.filter((s) => s.id !== req.params.id); return {}; });
route('GET', '/api/v1/mutes', () => []);
route('GET', '/api/v1/blocks', () => []);
route('GET', '/api/v1/domain_blocks', () => []);
route('GET', '/api/v1/endorsements', () => [db.byKey.jun, db.byKey.marcus, db.byKey.sofia].map(acc));
route('GET', '/api/v1/push/subscription', () => [404, { error: 'Record not found' }]);
route('GET', '/api/v1/profile', () => ({ ...acc(me), source: me.source }));
route('GET', '/api/v1/annual_reports/:year', () => [404, { error: 'Record not found' }]);
route('GET', '/api/v1/annual_reports', () => ({ annual_reports: [], accounts: [], statuses: [] }));
route('GET', '/api/v1/collections', () => []);

// Stub for the Translang translation API (PHANPY_TRANSLANG_INSTANCES=localhost:PORT)
route('GET', '/api/v1/translate', (req) => {
  const text = req.query.text || '';
  const sl = req.query.sl || 'auto';
  const hit = Object.entries(db.translations).find(([id]) => {
    const s = db.statuses[id];
    return s && text.replace(/\s+/g, ' ').trim().slice(0, 40) === (s._text || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  });
  const detected = sl === 'auto' ? (/[ñ¿¡]|\b(el|la|de|que|y)\b/i.test(text) ? 'es' : /\b(les|des|est|une|du)\b/i.test(text) ? 'fr' : 'en') : sl;
  return { translated_text: hit ? hit[1] : text, detected_language: detected, source_language: detected, target_language: req.query.tl || 'en' };
});
route('POST', '/api/v1/translate', async (req) => {
  const b = await readBody(req);
  return { translated_text: b.text, detected_language: b.sl || 'en' };
});

// generated artwork
const ACCENTS = Object.fromEntries(Object.values(db.accounts).map((a) => [a._key, a]));
function art(req, res) {
  const p = req.pathname;
  let svg = null;
  let m;
  if ((m = p.match(/^\/_stub\/avatar\/([\w-]+)\.svg$/))) {
    const a = ACCENTS[m[1]];
    svg = avatarSVG(a ? a.display_name : m[1], a ? a._color : '#64748b');
  } else if ((m = p.match(/^\/_stub\/header\/([\w-]+)\.svg$/))) {
    const a = ACCENTS[m[1]];
    svg = sceneSVG('header', m[1], 1500, 500, a ? a._color : '#be123c');
  } else if ((m = p.match(/^\/_stub\/media\/([a-z0-9]+)-([\w]+)\.svg$/))) {
    svg = sceneSVG(m[1], m[2], Number(req.query.w) || 1200, Number(req.query.h) || 900);
  } else if ((m = p.match(/^\/_stub\/card\/([a-z0-9]+)\.svg$/))) {
    svg = sceneSVG(m[1], 'card', 1200, 630);
  }
  if (!svg) return false;
  res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' });
  res.end(svg);
  return true;
}

// static files
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.woff2': 'font/woff2', '.map': 'application/json' };
function serveStatic(req, res) {
  let rel = decodeURIComponent(req.pathname);
  let file = path.join(DIST, rel);
  if (!file.startsWith(DIST)) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const idx = path.join(file, 'index.html');
    file = fs.existsSync(idx) ? idx : path.join(DIST, 'index.html');
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=3600' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, ORIGIN);
  req.pathname = u.pathname;
  req.search = u.search;
  req.query = {};
  for (const [k, v] of u.searchParams) {
    if (k in req.query) req.query[k] = [].concat(req.query[k], v);
    else req.query[k] = v;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Link');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  try {
    if (u.pathname.startsWith('/_stub/') && art(req, res)) return;
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = u.pathname.match(r.re);
      if (!m) continue;
      req.params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      let out = await r.fn(req, res);
      if (out === undefined) return; // handled
      let code = 200;
      if (Array.isArray(out) && typeof out[0] === 'number' && out.length === 2 && !Array.isArray(out[1])) [code, out] = out;
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(out ?? {}));
    }
    if (/^\/(api|oauth)\//.test(u.pathname)) {
      if (process.env.STUB_DEBUG) console.log('unhandled', req.method, u.pathname + u.search);
      res.writeHead(req.method === 'GET' ? 200 : 200, { 'Content-Type': 'application/json' });
      return res.end(req.method === 'GET' ? '[]' : '{}');
    }
    if (u.pathname === '/.well-known/host-meta') {
      res.writeHead(200, { 'Content-Type': 'application/xrd+xml' });
      return res.end(`<?xml version="1.0" encoding="UTF-8"?><XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0"><Link rel="lrdd" template="${ORIGIN}/.well-known/webfinger?resource={uri}"/></XRD>`);
    }
    if (u.pathname.startsWith('/.well-known/')) return res.writeHead(404).end();
    serveStatic(req, res);
  } catch (e) {
    console.error(req.method, req.url, e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e.message) }));
  }
});
server.listen(PORT, () => {
  console.log(`${INSTANCE_TITLE} (fake Mastodon) + Phanpy on ${ORIGIN}`);
  console.log(`statuses=${Object.keys(db.statuses).length} accounts=${Object.keys(db.accounts).length} notifications=${db.notifications.length}`);
});
