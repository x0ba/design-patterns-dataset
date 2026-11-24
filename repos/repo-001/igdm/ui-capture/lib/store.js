// In-memory data store behind the Instagram API stub. Loaded from the seed
// file written by .ui-capture/seed/generate.js.
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.IG_SEED_FILE || path.join(__dirname, '..', 'data', 'instagram.json');
let db = null;

function load () {
  if (!db) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return db;
}

function micros () {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

let itemCounter = 0;
function newItemId () {
  itemCounter += 1;
  return '3' + String(Date.now()).padStart(14, '0') + String(itemCounter).padStart(6, '0') + '0000000000000000';
}

function viewerPk () { return String(load().viewer.pk); }

function userSummary (pk) {
  const u = load().users[String(pk)];
  if (!u) return null;
  return {
    pk: Number(u.pk),
    username: u.username,
    full_name: u.full_name,
    is_private: u.is_private,
    profile_pic_url: u.profile_pic_url,
    profile_pic_id: u.pk + '_' + u.pk,
    is_verified: u.is_verified,
    has_anonymous_profile_picture: false,
    latest_reel_media: 0,
  };
}

function userInfo (pk) {
  const u = load().users[String(pk)];
  if (!u) return null;
  return Object.assign({}, userSummary(pk), {
    media_count: u.media_count,
    follower_count: u.follower_count,
    following_count: u.following_count,
    biography: u.biography,
    external_url: u.external_url || '',
    hd_profile_pic_url_info: { url: u.profile_pic_url, width: 320, height: 320 },
    is_business: !!u.is_business,
    category: u.category || null,
  });
}

module.exports = {
  viewerPk,
  userSummary,
  userInfo,
  login (username, password) {
    const v = load().viewer;
    if (username.replace(/^@/, '').toLowerCase() === v.username && password === v.password) return v;
    return null;
  },
  inboxThreads () {
    return load().threads
      .filter((t) => !t.hidden && t.items.length)
      .sort((a, b) => Number(b.items[0].timestamp.slice(0, 13)) - Number(a.items[0].timestamp.slice(0, 13)));
  },
  thread (id) { return load().threads.find((t) => t.thread_id === String(id)); },
  findOrCreateThread (userIds) {
    const ids = userIds.map(String).sort();
    const d = load();
    let t = d.threads.find((th) => th.user_pks.slice().sort().join(',') === ids.join(','));
    if (t) { t.hidden = false; return t; }
    t = {
      thread_id: '3402823668417103' + String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 1e15)).padStart(15, '0'),
      thread_v2_id: String(17840000000000000 + Math.floor(Math.random() * 1e12)),
      thread_type: 'private',
      thread_title: ids.map((pk) => d.users[pk].username).join(', '),
      user_pks: ids,
      is_group: ids.length > 1,
      muted: false,
      pending: false,
      named: false,
      viewer_id: Number(d.viewer.pk),
      inviter: userSummary(d.viewer.pk),
      items: [],
      last_seen_at: {},
    };
    d.threads.push(t);
    return t;
  },
  appendItem (t, item) {
    const it = Object.assign({ item_id: newItemId(), user_id: Number(viewerPk()), timestamp: micros(), client_context: newItemId() }, item);
    t.items.unshift(it);
    t.last_seen_at[viewerPk()] = { item_id: it.item_id, timestamp: it.timestamp };
    // the other side reads it a little later, like a real conversation
    setTimeout(() => {
      if (t.items[0] !== it) return;
      t.user_pks.forEach((pk) => {
        const p = load().presence[pk];
        if (p && p.is_active) t.last_seen_at[pk] = { item_id: it.item_id, timestamp: micros() };
      });
    }, 9000);
    return it;
  },
  searchUsers (q) {
    const needle = String(q).trim().toLowerCase().replace(/^@/, '');
    const users = Object.values(load().users).filter((u) => String(u.pk) !== viewerPk());
    const scored = users
      .map((u) => {
        const un = u.username.toLowerCase();
        const fn = (u.full_name || '').toLowerCase();
        let s = -1;
        if (un.startsWith(needle)) s = 3;
        else if (fn.split(' ').some((w) => w.startsWith(needle))) s = 2;
        else if (un.includes(needle) || fn.includes(needle)) s = 1;
        return { u, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || (b.u.follower_count || 0) - (a.u.follower_count || 0));
    return scored.slice(0, 30).map((x) => userSummary(x.u.pk));
  },
  followers () { return load().followers.slice(); },
  following () { return load().following.slice(); },
  unfollow (pk) { const d = load(); d.following = d.following.filter((p) => String(p) !== String(pk)); },
  presence () { return JSON.parse(JSON.stringify(load().presence)); },
  photoMedia (seed, scene) {
    return {
      id: seed,
      media_type: 1,
      image_versions2: { candidates: [
        { width: 1080, height: 1350, url: `/cdn/photo/${scene}/${seed}.svg?w=1080&h=1350` },
        { width: 480, height: 600, url: `/cdn/photo/${scene}/${seed}.svg?w=480&h=600` },
      ] },
      original_width: 1080,
      original_height: 1350,
    };
  },
};
