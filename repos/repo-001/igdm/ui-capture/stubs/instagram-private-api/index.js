// Local stand-in for the `instagram-private-api` package.
// Implements only the surface main/instagram.js uses, backed by an in-memory
// store loaded from the seed file (.ui-capture/data/instagram.json).
// Responses mimic the shapes Instagram's private API returns.
'use strict';

const store = require('../../lib/store');

const INBOX_PAGE = 20; // DirectInboxFeed: limit 20
const THREAD_ITEMS_INBOX = 10; // thread_message_limit 10
const THREAD_PAGE = 10; // DirectThreadFeed: limit 10

const delay = (v, ms) => new Promise((r) => setTimeout(() => r(v), ms === undefined ? 60 + Math.random() * 120 : ms));

class IgCheckpointError extends Error {}
class IgLoginTwoFactorRequiredError extends Error {}

function threadView (t, limit, beforeCursor) {
  // items newest first
  let items = t.items;
  let start = 0;
  if (beforeCursor) {
    const idx = items.findIndex((i) => i.item_id === beforeCursor);
    start = idx === -1 ? items.length : idx + 1;
  }
  const page = items.slice(start, start + limit);
  const hasOlder = start + limit < items.length;
  const out = Object.assign({}, t, {
    items: page,
    has_older: hasOlder,
    has_newer: start > 0,
    oldest_cursor: page.length ? page[page.length - 1].item_id : beforeCursor,
    newest_cursor: page.length ? page[0].item_id : undefined,
    last_activity_at: items[0] ? Number(items[0].timestamp) : 0,
    users: t.user_pks.map((pk) => store.userSummary(pk)),
    last_seen_at: JSON.parse(JSON.stringify(t.last_seen_at)),
  });
  delete out.user_pks;
  return JSON.parse(JSON.stringify(out));
}

class DirectInboxFeed {
  constructor () { this.cursor = undefined; this.moreAvailable = undefined; }
  isMoreAvailable () { return !!this.moreAvailable; }
  items () {
    const threads = store.inboxThreads();
    let start = 0;
    if (this.cursor) {
      start = threads.findIndex((t) => t.thread_id === this.cursor) + 1;
    }
    const page = threads.slice(start, start + INBOX_PAGE);
    const views = page.map((t) => threadView(t, THREAD_ITEMS_INBOX));
    return delay(views).then((v) => {
      this.moreAvailable = start + INBOX_PAGE < threads.length;
      this.cursor = page.length ? page[page.length - 1].thread_id : this.cursor;
      return v;
    });
  }
}

class DirectThreadFeed {
  constructor () { this.id = undefined; this.cursor = undefined; this.moreAvailable = undefined; }
  isMoreAvailable () { return !!this.moreAvailable; }
  request () {
    const t = store.thread(this.id);
    if (!t) return Promise.reject(new Error('Thread not found'));
    const thread = threadView(t, THREAD_PAGE, this.cursor);
    return delay({ thread, status: 'ok' }).then((body) => {
      this.cursor = body.thread.oldest_cursor;
      this.moreAvailable = body.thread.has_older;
      return body;
    });
  }
  items () { return this.request().then((b) => b.thread.items); }
}

class UserListFeed {
  constructor (list) { this.list = list; this.offset = 0; this.moreAvailable = undefined; }
  isMoreAvailable () { return !!this.moreAvailable; }
  items () {
    const page = this.list.slice(this.offset, this.offset + 100);
    const next = this.offset + page.length;
    // like the real feed, state is updated only once the response arrives
    return delay(page.map((pk) => store.userSummary(pk)), 250).then((users) => {
      this.offset = next;
      this.moreAvailable = next < this.list.length;
      return users;
    });
  }
}

class DirectThreadEntity {
  constructor (idOrUsers) {
    if (Array.isArray(idOrUsers)) this.userIds = idOrUsers.map(String);
    else this.threadId = idOrUsers;
  }
  _thread () {
    if (this.threadId) return store.thread(this.threadId);
    return store.findOrCreateThread(this.userIds);
  }
  _broadcast (item) {
    const t = this._thread();
    if (!t) return Promise.reject(new Error('Thread not found'));
    const it = store.appendItem(t, item);
    return delay({ thread_id: t.thread_id, item_id: it.item_id, timestamp: it.timestamp, status: 'ok' }, 300);
  }
  broadcastText (text) { return this._broadcast({ item_type: 'text', text }); }
  broadcastPhoto () {
    return this._broadcast({ item_type: 'media', media: store.photoMedia('upload-' + Date.now(), 'photo') });
  }
  broadcastVideo () { return Promise.reject(new Error('Video upload is not available offline')); }
  broadcastVoice () {
    return this._broadcast({ item_type: 'voice_media', voice_media: { media: { audio: { audio_src: '/cdn/voice/upload-' + Date.now() + '.wav', duration: 4000 } } } });
  }
  hide () {
    const t = this._thread();
    if (t) t.hidden = true;
    return delay({ status: 'ok' });
  }
  markItemSeen (itemId) {
    const t = this._thread();
    if (t) {
      const it = t.items.find((i) => i.item_id === itemId) || t.items[0];
      t.last_seen_at[store.viewerPk()] = { item_id: it.item_id, timestamp: it.timestamp };
    }
    return delay({ status: 'ok' });
  }
}

class State {
  constructor () { this.cookieUserId = undefined; this.deviceString = undefined; }
  generateDevice (seed) { this.deviceString = '26/8.0.0; 480dpi; 1080x1920; samsung; SM-G930F; herolte; samsungexynos8890'; this.deviceSeed = seed; }
  serialize () {
    return Promise.resolve({
      constants: { APP_VERSION: '121.0.0.29.119' },
      cookies: JSON.stringify({ version: 'tough-cookie@4.0.0', storeType: 'MemoryCookieStore', cookies: [{ key: 'ds_user_id', value: String(this.cookieUserId), domain: 'instagram.com' }, { key: 'sessionid', value: String(this.cookieUserId) + '%3AlocalStubSession%3A12', domain: 'instagram.com' }] }),
      deviceString: this.deviceString,
      deviceId: 'android-6f1c2a9b0d3e4f57',
      uuid: 'b2c4e5f6-7a8b-4c9d-8e0f-1a2b3c4d5e6f',
    });
  }
  deserialize (state) {
    const obj = typeof state === 'string' ? JSON.parse(state) : state;
    const cookies = JSON.parse(obj.cookies).cookies;
    const ds = cookies.find((c) => c.key === 'ds_user_id');
    this.cookieUserId = ds ? ds.value : undefined;
    this.deviceString = obj.deviceString;
    return Promise.resolve();
  }
}

class IgApiClient {
  constructor () {
    const self = this;
    this.state = new State();
    this.simulate = { preLoginFlow: () => delay(undefined, 200), postLoginFlow: () => delay() };
    this.account = {
      login (username, password) {
        const user = store.login(username, password);
        if (!user) {
          const err = new Error('The password you entered is incorrect. Please try again.');
          err.text = 'The password you entered is incorrect. Please try again.';
          return delay(undefined, 600).then(() => { throw err; });
        }
        self.state.cookieUserId = String(user.pk);
        return delay(store.userInfo(user.pk), 600);
      },
      twoFactorLogin () { return Promise.reject(new Error('Two factor login is not available offline')); },
      logout () { self.state.cookieUserId = undefined; return delay({ status: 'ok' }); },
    };
    this.challenge = { auto: () => delay(), sendSecurityCode: () => delay() };
    this.user = {
      info: (pk) => {
        const u = store.userInfo(pk);
        return u ? delay(u) : Promise.reject(new Error('User not found'));
      },
      search: (q) => delay({ num_results: 0, users: store.searchUsers(q), has_more: false, status: 'ok' }, 200),
    };
    this.feed = {
      directInbox: () => new DirectInboxFeed(),
      directThread: (options) => {
        const f = new DirectThreadFeed();
        f.id = options && options.thread_id;
        f.cursor = options && options.oldest_cursor;
        return f;
      },
      accountFollowers: () => new UserListFeed(store.followers()),
      accountFollowing: () => new UserListFeed(store.following()),
    };
    this.entity = { directThread: (id) => new DirectThreadEntity(id) };
    this.direct = { getPresence: () => delay({ user_presence: store.presence(), status: 'ok' }) };
    this.friendship = { destroy: (pk) => { store.unfollow(pk); return delay({ friendship_status: { following: false } }); } };
  }
}

module.exports = { IgApiClient, IgCheckpointError, IgLoginTwoFactorRequiredError };
