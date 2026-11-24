// Builds the Instagram stub's data file and the app's saved session.
// Timestamps are generated relative to "now" so the inbox looks current.
//   node .ui-capture/seed/generate.js
'use strict';

const fs = require('fs');
const path = require('path');
const { viewer, people } = require('./people');
const scripts = require('./threads');

const HERE = path.resolve(__dirname, '..');
const OUT = path.join(HERE, 'data', 'instagram.json');
const USERDATA = process.env.IGDM_USER_DATA || path.join(HERE, 'userdata');
const NOW = Date.now();

// deterministic PRNG
let seed = 20261116;
const rand = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
const between = (a, b) => a + rand() * (b - a);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const MIN = 60e3; const HOUR = 60 * MIN; const DAY = 24 * HOUR;
const dur = (s) => { const m = String(s).match(/^(\d+(?:\.\d+)?)([mhd])$/); return Number(m[1]) * { m: MIN, h: HOUR, d: DAY }[m[2]]; };

// ---- users -------------------------------------------------------------------
const users = {};
let pkBase = 1840000000;
function mkUser (p, i) {
  const pk = String(p.pk || pkBase + Math.floor(rand() * 9e8) + i * 7);
  const brand = p.kind === 'brand';
  const pic = `/cdn/avatar/${p.username}.svg` + (brand ? `?kind=brand&label=${encodeURIComponent(p.full_name)}` : '');
  users[pk] = {
    pk, username: p.username, full_name: p.full_name, is_private: !brand && rand() > 0.7, is_verified: !!p.verified,
    profile_pic_url: pic, follower_count: p.followers || Math.floor(between(80, 3000)), following_count: Math.floor(between(150, 1400)),
    media_count: Math.floor(between(12, 900)), biography: p.bio || '', is_business: !!p.business, external_url: p.external_url || '',
  };
  return pk;
}
const viewerPk = mkUser(Object.assign({ pk: '6021774391', followers: viewer.follower_count, bio: viewer.biography, external_url: viewer.external_url }, viewer), 0);
users[viewerPk].following_count = viewer.following_count; users[viewerPk].media_count = viewer.media_count;
const byKey = { me: viewerPk };
people.forEach((p, i) => { byKey[p.key] = mkUser(p, i + 1); });

// wider network: followers / following directory
const FIRST = ['Alex', 'Bianca', 'Carmen', 'Dani', 'Eli', 'Fatima', 'Grace', 'Hugo', 'Isla', 'Jonah', 'Keiko', 'Liam', 'Mara', 'Nico', 'Odette', 'Pablo', 'Quinn', 'Rosa', 'Sofia', 'Tariq', 'Uma', 'Vince', 'Willa', 'Xavier', 'Yara', 'Zane', 'Amara', 'Bodhi', 'Celeste', 'Dmitri', 'Esme', 'Felix', 'Gia', 'Hana', 'Ivan', 'June', 'Kofi', 'Lena', 'Milo', 'Nadia', 'Oscar', 'Paloma', 'Rhys', 'Saoirse', 'Theo', 'Valentina', 'Wren', 'Yusuf', 'Chidi', 'Anika', 'Mateo', 'Leilani', 'Soren', 'Ines', 'Rafael', 'Hazel', 'Callum', 'Noor', 'Emeka', 'Freya'];
const LAST = ['Abara', 'Bennett', 'Chen', 'Delgado', 'Ellison', 'Farouk', 'Garcia', 'Haddad', 'Ito', 'Jensen', 'Kowalski', 'Lopez', 'Mbeki', 'Novak', 'Osei', 'Park', 'Quintero', 'Rossi', 'Sato', 'Torres', 'Ueda', 'Varga', 'Walsh', 'Yilmaz', 'Zhou', 'Okoro', 'Brennan', 'Castellanos', 'Dubois', 'Eriksen', 'Fontaine', 'Goldberg', 'Hollis', 'Iqbal', 'Lindgren', 'Moreau', 'Nakamura', 'Petrov', 'Reyes', 'Silva'];
const STYLES = [(f, l) => `${f}.${l}`, (f, l) => `${f}${l}`, (f, l) => `${f}_${l[0]}`, (f, l) => `${f}.${l}.studio`, (f, l) => `${f}${Math.floor(rand() * 99)}`, (f, l) => `the.${f}.${l}`, (f, l) => `${f}makes`, (f, l) => `${f}.${l}.art`, (f, l) => `${l}.${f}`, (f, l) => `${f}throws`];
const BRANDS = ['Slow Clay Co', 'Mudroom Ceramics', 'Wild Fern Florals', 'Little Kiln Studio', 'Bramble & Oak', 'Clayground PDX', 'Northwest Glaze Lab', 'Hearth Bakery', 'Cascade Wool Co', 'Stoneware Social', 'The Glaze Room', 'Ember Candle Co', 'Riverbend Pottery', 'Field Notes Florist', 'Sunday Studio Goods', 'Portland Night Market', 'Copper Kettle Tea', 'Moss & Stone', 'Studio Atlas', 'Handmade Hour'];
const genPks = [];
const usedNames = new Set(Object.values(users).map((u) => u.username));
for (let i = 0; i < 300; i++) {
  const f = pick(FIRST); const l = pick(LAST);
  let un = pick(STYLES)(f.toLowerCase(), l.toLowerCase()).replace(/[^a-z0-9._]/g, '');
  while (usedNames.has(un)) un += Math.floor(rand() * 9);
  usedNames.add(un);
  genPks.push(mkUser({ username: un, full_name: rand() > 0.12 ? `${f} ${l}` : '' }, 100 + i));
}
const brandPks = BRANDS.map((b, i) => mkUser({ username: b.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ''), full_name: b, kind: 'brand', followers: Math.floor(between(2000, 90000)), business: true }, 500 + i));

const peoplePks = people.map((p) => byKey[p.key]);
// following: most people + some generated + brands
const following = peoplePks.filter((pk) => ![byKey.glow, byKey.mikaela, byKey.emma].includes(pk))
  .concat(genPks.slice(0, 150)).concat(brandPks);
// followers: people (not the big accounts) + many generated
const notFollowingBack = new Set([byKey.ceramicsmag, byKey.pod, byKey.kenji, byKey.market].concat(brandPks.slice(0, 9)).concat(genPks.slice(0, 13)));
const followers = peoplePks.filter((pk) => !notFollowingBack.has(pk) && pk !== byKey.glow)
  .concat(genPks.slice(13)).concat(brandPks.slice(9));
// shuffle-ish (recency order)
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
shuffle(following); shuffle(followers);

// ---- threads -------------------------------------------------------------------
let itemSeq = 0;
const ts = (ms) => String(Math.floor(ms)) + String(Math.floor(rand() * 1000)).padStart(3, '0');
const itemId = (ms) => { itemSeq += 1; return '2' + String(Math.floor(ms) * 1000 + itemSeq).padStart(17, '0') + String(Math.floor(rand() * 1e12)).padStart(12, '0'); };
let mediaSeq = 0;

function photoMedia (scene, key) {
  return {
    id: `${key}_${viewerPk}`, media_type: 1,
    image_versions2: { candidates: [
      { width: 1080, height: 1350, url: `/cdn/photo/${scene}/${key}.svg?w=1080&h=1350` },
      { width: 480, height: 600, url: `/cdn/photo/${scene}/${key}.svg?w=480&h=600` },
    ] },
    original_width: 1080, original_height: 1350,
  };
}

function parseContent (content, senderKey) {
  let m;
  mediaSeq += 1;
  const key = `m${mediaSeq}`;
  if (content === '[like]') return { item_type: 'like', like: '❤️' };
  if ((m = content.match(/^\[photo:(\w+)\]\s*(.*)$/))) {
    const it = { item_type: 'media', media: photoMedia(m[1], key) };
    return m[2] ? [it, { item_type: 'text', text: m[2] }] : it;
  }
  if ((m = content.match(/^\[(post|carousel):(\w+):(\w+):(.*)\]$/))) {
    const author = users[byKey[m[2]]];
    const code = 'C' + Math.floor(rand() * 36 ** 9).toString(36).padStart(9, 'x');
    const share = {
      id: `${Math.floor(rand() * 1e18)}_${author.pk}`, code, media_type: m[1] === 'carousel' ? 8 : 1,
      user: { pk: Number(author.pk), username: author.username, full_name: author.full_name, profile_pic_url: author.profile_pic_url, is_verified: author.is_verified },
      caption: { text: m[4], user_id: Number(author.pk) },
      like_count: Math.floor(between(40, 2400)), comment_count: Math.floor(between(2, 80)),
      webLink: `https://www.instagram.com/p/${code}/`,
    };
    if (m[1] === 'carousel') share.carousel_media = [1, 2, 3, 4].map((n) => photoMedia(m[3], `${key}-${n}`));
    else Object.assign(share, photoMedia(m[3], key));
    return { item_type: 'media_share', media_share: share };
  }
  if ((m = content.match(/^\[story:(\w+)\|(.*)\]$/))) {
    return { item_type: 'reel_share', reel_share: { text: m[2], type: 'reply', reel_owner_id: Number(byKey[senderKey === 'me' ? 'them' : 'me'] || viewerPk), media: Object.assign(photoMedia(m[1], key), { expiring_at: Math.floor(NOW / 1000) + 3600 }) } };
  }
  if ((m = content.match(/^\[story-expired\|(.*)\]$/))) {
    return { item_type: 'reel_share', reel_share: { text: m[1], type: 'reply', media: { id: key, expiring_at: 0 } } };
  }
  if ((m = content.match(/^\[gif:([\w-]+)\]$/))) {
    const url = `/cdn/gif/${m[1]}-${key}.svg`;
    return { item_type: 'animated_media', animated_media: { id: key, images: { fixed_height: { url, width: '240', height: '200' } }, is_sticker: false, user: { username: 'giphy' } } };
  }
  if ((m = content.match(/^\[link:([^|]+)\|(.*)\]$/))) {
    const host = m[1].replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    return { item_type: 'link', link: { text: m[2], link_context: { link_url: m[1], link_title: host, link_summary: '', link_image_url: `/cdn/photo/${pick(['landscape', 'pottery', 'city', 'plant'])}/${key}.svg?w=600&h=315` } } };
  }
  if ((m = content.match(/^\[voice:(\d+)\]$/))) {
    return { item_type: 'voice_media', voice_media: { media: { id: key, media_type: 11, audio: { audio_src: `/cdn/voice/${key}.wav?s=${m[1]}`, duration: Number(m[1]) * 1000, waveform_data: [] } }, seen_count: 1 } };
  }
  if ((m = content.match(/^\[action:(.*)\]$/))) return { item_type: 'action_log', action_log: { description: m[1] }, hide_in_thread: 0 };
  if ((m = content.match(/^\[placeholder:(.*)\]$/))) return { item_type: 'placeholder', placeholder: { is_linked: false, title: 'Message Unavailable', message: m[1] } };
  if ((m = content.match(/^\[raven:(\w+)\]$/))) return { item_type: 'raven_media', visual_media: { media: photoMedia(m[1], key), seen_count: 1, view_mode: 'once' } };
  return { item_type: 'text', text: content };
}

const threads = [];
let threadSeq = 0;
for (const sc of scripts) {
  threadSeq += 1;
  const memberPks = sc.with.map((k) => byKey[k]);
  const isGroup = sc.with.length > 1;
  // parse lines into raw entries with gaps
  const entries = [];
  let gapNext = null;
  for (const line of sc.lines) {
    if (/^~\d/.test(line)) { gapNext = dur(line.slice(1)); continue; }
    let who = 'me'; let content = line;
    const mm = line.match(/^([a-z]+):\s(.*)$/);
    if (mm && (mm[1] === 'me' || mm[1] === 'them' || byKey[mm[1]])) { who = mm[1]; content = mm[2]; } else if (/^\[action:/.test(line)) { who = 'system'; }
    if (who === 'them') who = sc.with[0];
    let reaction = null;
    const rm = content.match(/\s*\{♥(me)?\}$/);
    if (rm) { reaction = rm[1] ? 'me' : 'them'; content = content.replace(rm[0], ''); }
    const parsed = [].concat(parseContent(content, who));
    parsed.forEach((p, idx) => entries.push({ who, item: p, gap: idx === 0 ? gapNext : 0.15 * MIN, reaction: idx === parsed.length - 1 ? reaction : null }));
    gapNext = null;
  }
  // timestamps backward from the anchor
  let t = NOW - dur(sc.lastAgo) - between(0, 0.4) * dur(sc.lastAgo) * 0.1;
  const items = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const sender = e.who === 'system' ? viewerPk : byKey[e.who];
    const it = Object.assign({ item_id: itemId(t), user_id: Number(sender), timestamp: ts(t), client_context: String(Math.floor(rand() * 1e18)) }, e.item);
    if (e.reaction) {
      const reactor = e.reaction === 'me' ? viewerPk : (isGroup ? pick(memberPks.filter((pk) => pk !== sender)) : memberPks[0]);
      it.reactions = { likes: [{ sender_id: Number(reactor), timestamp: Number(ts(t + between(1, 30) * MIN)), client_context: String(Math.floor(rand() * 1e18)) }], likes_count: 1 };
    }
    items.push(it);
    // gap before this entry (i.e. between entries[i-1] and entries[i])
    const prev = entries[i - 1];
    let g = e.gap;
    if (g == null) g = prev && prev.who === e.who ? between(0.1, 1.2) * MIN : between(0.4, 6) * MIN;
    g = g === e.gap && e.gap > MIN * 30 ? g * between(0.85, 1.15) : g;
    t -= g;
  }
  // items are newest-first already
  const last = items[0];
  const lastSeen = {};
  // viewer read state
  if (sc.unread) {
    const firstUnread = items.findIndex((it) => String(it.user_id) === viewerPk);
    const seenItem = firstUnread === -1 ? items[items.length - 1] : items[firstUnread];
    lastSeen[viewerPk] = { item_id: seenItem.item_id, timestamp: seenItem.timestamp };
    if (firstUnread === -1) lastSeen[viewerPk].timestamp = String(Number(seenItem.timestamp.slice(0, 13)) - 1000) + '000';
  } else {
    lastSeen[viewerPk] = { item_id: last.item_id, timestamp: last.timestamp };
  }
  // others' read state
  memberPks.forEach((pk) => {
    const mineIsLast = String(last.user_id) === viewerPk;
    let seenIt;
    if (mineIsLast && sc.seenByThem !== false && !(isGroup && rand() > 0.6)) seenIt = last;
    else seenIt = items.find((it) => String(it.user_id) === pk) || items[items.length - 1];
    lastSeen[pk] = { item_id: seenIt.item_id, timestamp: seenIt.timestamp };
  });
  const titleUser = users[memberPks[0]];
  threads.push({
    thread_id: '340282366841710300949128' + String(132112310000000 + threadSeq * 7919 + Math.floor(rand() * 999)).padStart(15, '0'),
    thread_v2_id: String(17842000000000000 + threadSeq * 104729),
    thread_type: 'private',
    thread_title: sc.title || titleUser.username,
    named: !!sc.title,
    is_group: isGroup,
    muted: !!sc.muted,
    pending: false,
    archived: false,
    canonical: true,
    is_spam: false,
    viewer_id: Number(viewerPk),
    inviter: { pk: Number(isGroup ? viewerPk : memberPks[0]), username: users[isGroup ? viewerPk : memberPks[0]].username },
    user_pks: memberPks,
    items,
    last_seen_at: lastSeen,
  });
}

// ---- presence -----------------------------------------------------------------
const presence = {};
const activeNow = ['jess', 'devon', 'priya', 'leo', 'ada'];
people.forEach((p) => {
  const pk = byKey[p.key];
  if (p.kind === 'brand') return;
  const active = activeNow.includes(p.key) && p.key !== 'leo';
  const ago = p.key === 'leo' ? 25 * MIN : between(10 * MIN, 4 * DAY);
  presence[pk] = { is_active: active, last_activity_at_ms: Math.floor(active ? NOW - between(0, 2) * MIN : NOW - ago) };
});

const viewerOut = Object.assign({}, users[viewerPk], { password: viewer.password });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generated_at: new Date(NOW).toISOString(), viewer: viewerOut, users, followers, following, threads, presence }));

// ---- the app's saved session (what main/utils.js storeCookies writes) ---------
const sessDir = path.join(USERDATA, 'session-cookie');
fs.mkdirSync(sessDir, { recursive: true });
fs.readdirSync(sessDir).forEach((f) => fs.unlinkSync(path.join(sessDir, f)));
fs.writeFileSync(path.join(sessDir, `${viewer.username}.json`), JSON.stringify({
  cookies: JSON.stringify({ version: 'tough-cookie@4.0.0', storeType: 'MemoryCookieStore', rejectPublicSuffixes: true, cookies: [
    { key: 'ds_user_id', value: viewerPk, domain: 'instagram.com', path: '/', secure: true },
    { key: 'sessionid', value: `${viewerPk}%3AlocalStubSession%3A12`, domain: 'instagram.com', path: '/', secure: true, httpOnly: true },
    { key: 'csrftoken', value: 'localstubcsrftoken000000000000000', domain: 'instagram.com', path: '/', secure: true },
  ] }),
  deviceString: '26/8.0.0; 480dpi; 1080x1920; samsung; SM-G930F; herolte; samsungexynos8890',
  deviceId: 'android-6f1c2a9b0d3e4f57',
  uuid: 'b2c4e5f6-7a8b-4c9d-8e0f-1a2b3c4d5e6f',
  phoneId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
  adid: 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70',
  build: 'NRD90M',
}));

const msgCount = threads.reduce((n, t) => n + t.items.length, 0);
console.log(`seeded ${threads.length} threads, ${msgCount} messages, ${Object.keys(users).length} users (${following.length} following, ${followers.length} followers) -> ${path.relative(process.cwd(), OUT)}`);
