// Builds the in-memory Mastodon database for the local stub instance.
// Deterministic (seeded) content; timestamps are relative to server start so
// the timeline always looks "live".
import { rng } from './art.mjs';
import {
  ACCOUNTS, BOOKMARKED, BOOSTS, FAVOURITED, FIELDS, FOLLOWED_TAGS, LISTS, POSTS,
} from './content.mjs';
import { EXTRA_FOLLOWERS, EXTRA_POSTS } from './content-extra.mjs';

export function buildDB(DOMAIN) {
  const ORIGIN = `http://${DOMAIN}`;
  const NOW = Date.now();
  const R = rng(42);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const int = (a, b) => Math.floor(a + R() * (b - a + 1));
  let seq = 0;
  const idAt = (ms) => ((BigInt(Math.floor(ms)) << 16n) + BigInt(seq++ % 65536)).toString();
  const iso = (ms) => new Date(ms).toISOString();
  const hoursAgo = (h) => NOW - h * 3600_000;

  const db = {
    DOMAIN, ORIGIN, NOW,
    accounts: {}, // id -> account
    byKey: {},
    statuses: {}, // id -> status (raw, with account id refs)
    statusOrder: [], // ids desc
    notifications: [],
    relationships: {},
    lists: [],
    listMembers: {},
    followedTags: new Set(FOLLOWED_TAGS.map((t) => t.toLowerCase())),
    favourited: new Set(),
    bookmarked: new Set(),
    reblogged: new Set(),
    pinned: new Set(),
    following: new Set(),
    followers: new Set(),
    scheduled: [],
    filters: [],
    conversations: [],
    translations: {},
    edits: {},
  };

  // ---------- Accounts ----------
  const allAccountDefs = [
    ...ACCOUNTS,
    ...EXTRA_FOLLOWERS.map(([k, u, d, n, bio, c]) => [k, u, d, n, bio, c, true]),
  ];
  allAccountDefs.forEach(([key, username, domain, name, bio, color, extra], i) => {
    const created = hoursAgo(int(4000, 40000));
    const id = String(109000000000000000n + BigInt(i * 7919 + 13));
    const acct = domain ? `${username}@${domain}` : username;
    const url = domain ? `https://${domain}/@${username}` : `${ORIGIN}/@${username}`;
    const fields = (FIELDS[key] || []).map(([n, v]) => ({
      name: n,
      value: /^https?:/.test(v)
        ? `<a href="${v}" target="_blank" rel="nofollow noopener me" translate="no"><span class="invisible">https://</span><span class="">${v.replace(/^https?:\/\//, '')}</span><span class="invisible"></span></a>`
        : v,
      verified_at: /^https?:/.test(v) && R() > 0.4 ? iso(created + 86400_000) : null,
    }));
    const isBot = key === 'news' || key === 'phanpy';
    db.accounts[id] = {
      id, username, acct,
      display_name: name,
      locked: key === 'claire',
      bot: key === 'news',
      discoverable: true,
      indexable: true,
      group: key === 'pdxbikes',
      created_at: iso(created),
      note: `<p>${bio.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`,
      url, uri: domain ? `https://${domain}/users/${username}` : `${ORIGIN}/users/${username}`,
      avatar: `${ORIGIN}/_stub/avatar/${key}.svg`,
      avatar_static: `${ORIGIN}/_stub/avatar/${key}.svg`,
      header: `${ORIGIN}/_stub/header/${key}.svg`,
      header_static: `${ORIGIN}/_stub/header/${key}.svg`,
      followers_count: key === 'priya' ? 612 : isBot ? int(4000, 30000) : int(80, 4200),
      following_count: key === 'priya' ? 0 : int(60, 900),
      statuses_count: int(150, 6000),
      last_status_at: null,
      hide_collections: false,
      noindex: false,
      emojis: [],
      roles: [],
      fields,
      _key: key, _color: color, _extra: !!extra,
    };
    db.byKey[key] = db.accounts[id];
  });
  const me = db.byKey.priya;
  db.me = me;
  me.source = {
    privacy: 'public', sensitive: false, language: 'en', note: ACCOUNTS[0][4],
    fields: FIELDS.priya.map(([name, value]) => ({ name, value, verified_at: null })),
    follow_requests_count: 2, hide_collections: false, discoverable: true, indexable: true,
  };
  me.role = { id: '-99', name: '', permissions: '0', color: '', highlighted: false };

  // follow graph
  for (const a of Object.values(db.accounts)) {
    if (a === me) continue;
    if (!a._extra) db.following.add(a.id);
    if (a._extra || R() > 0.3) db.followers.add(a.id);
  }
  me.following_count = db.following.size + 214;
  me.followers_count = db.followers.size + 571;

  // ---------- Content helpers ----------
  const findAccount = (word) =>
    Object.values(db.accounts).find((a) => a.username.toLowerCase() === word.toLowerCase()) ||
    db.byKey[word];
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function linkify(line, mentions, tags) {
    // tokens: urls, hashtags, mentions, inline code
    return line.replace(
      /(`[^`]+`)|(https?:\/\/[^\s<]+[^\s<.,!?)])|(^|[^\w&])#(\w+)|(^|[^\w])@([\w.]+[\w])/g,
      (m, code, url, pre1, tag, pre2, user) => {
        if (code) return `<code>${code.slice(1, -1)}</code>`;
        if (url) {
          const noProto = url.replace(/^https?:\/\//, '');
          const vis = noProto.length > 30 ? noProto.slice(0, 30) : noProto;
          const rest = noProto.slice(vis.length);
          return `<a href="${url}" target="_blank" rel="nofollow noopener" translate="no"><span class="invisible">${url.match(/^https?:\/\//)[0]}</span><span class="${rest ? 'ellipsis' : ''}">${vis}</span><span class="invisible">${rest}</span></a>`;
        }
        if (tag) {
          tags.add(tag);
          return `${pre1}<a href="${ORIGIN}/tags/${tag.toLowerCase()}" class="mention hashtag" rel="tag">#<span>${tag}</span></a>`;
        }
        if (user) {
          const acc = findAccount(user);
          if (!acc) return m;
          if (!mentions.find((x) => x.id === acc.id))
            mentions.push({ id: acc.id, username: acc.username, url: acc.url, acct: acc.acct });
          return `${pre2}<span class="h-card" translate="no"><a href="${acc.url}" class="u-url mention">@<span>${acc.username}</span></a></span>`;
        }
        return m;
      },
    );
  }
  function toHTML(text, extraTags = []) {
    const mentions = [];
    const tags = new Set();
    let html = '';
    const blocks = text.split(/```\n?/);
    blocks.forEach((block, bi) => {
      if (bi % 2 === 1) {
        html += `<pre><code>${escape(block.replace(/\n$/, ''))}</code></pre>`;
        return;
      }
      block
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((p) => {
          html += `<p>${p
            .split('\n')
            .map((l) => linkify(escape(l), mentions, tags))
            .join('<br />')}</p>`;
        });
    });
    const missing = extraTags.filter((t) => ![...tags].some((x) => x.toLowerCase() === t.toLowerCase()));
    if (missing.length) {
      html += `<p>${missing.map((t) => linkify('#' + t, mentions, tags)).join(' ')}</p>`;
    }
    return {
      html,
      mentions,
      tags: [...tags].map((t) => ({ name: t.toLowerCase(), url: `${ORIGIN}/tags/${t.toLowerCase()}` })),
    };
  }

  const APPS = [
    { name: 'Phanpy', website: 'https://phanpy.social' },
    { name: 'Web', website: null },
    { name: 'Ivory for iOS', website: 'https://tapbots.com/ivory/' },
    { name: 'Tusky', website: 'https://tusky.app' },
    { name: 'Elk', website: 'https://elk.zone' },
  ];

  let mediaSeq = 1;
  function mkMedia(m, author) {
    const portrait = /portrait|knit|plant/.test(m.scene);
    const [w, h] = portrait ? [1080, 1350] : /pixel/.test(m.scene) ? [960, 540] : [1200, 900];
    const id = String(113000000000000000n + BigInt(mediaSeq++));
    const url = `${ORIGIN}/_stub/media/${m.scene}-${id}.svg?w=${w}&h=${h}`;
    return {
      id, type: 'image', url, preview_url: url, remote_url: author.acct.includes('@') ? url : null,
      preview_remote_url: null, text_url: null,
      meta: {
        original: { width: w, height: h, size: `${w}x${h}`, aspect: w / h },
        small: { width: Math.round(w / 2.5), height: Math.round(h / 2.5), size: `${Math.round(w / 2.5)}x${Math.round(h / 2.5)}`, aspect: w / h },
      },
      description: m.desc || null,
      blurhash: null,
    };
  }

  const keyToId = {};
  let pollSeq = 1;
  function addStatus(author, text, opts = {}) {
    const created = hoursAgo(opts.h ?? 1);
    const id = idAt(created);
    const { html, mentions, tags } = toHTML(text, opts.tags || []);
    const parent = opts.reply ? db.statuses[keyToId[opts.reply]] : null;
    const status = {
      id,
      created_at: iso(created),
      in_reply_to_id: parent ? parent.id : null,
      in_reply_to_account_id: parent ? parent.account : null,
      sensitive: !!(opts.sensitive || opts.cw),
      spoiler_text: opts.cw || '',
      visibility: opts.vis || 'public',
      language: opts.lang || 'en',
      uri: author.uri.replace('/users/', '/users/') + `/statuses/${id}`,
      url: `${author.url}/${id}`,
      replies_count: 0,
      reblogs_count: opts.vis === 'direct' ? 0 : Math.floor(Math.pow(R(), 2.2) * 60),
      favourites_count: opts.vis === 'direct' ? 0 : Math.floor(Math.pow(R(), 1.8) * 140) + 1,
      quotes_count: 0,
      edited_at: opts.edited ? iso(created + 600_000) : null,
      content: html,
      reblog: null,
      application: author._extra || author.acct.includes('@') ? null : pick(APPS),
      account: author.id,
      media_attachments: (opts.media || []).map((m) => mkMedia(m, author)),
      mentions,
      tags,
      emojis: [],
      card: null,
      poll: null,
      _text: text,
    };
    if (author === me) status.application = APPS[0];
    if (opts.card) {
      const url = (text.match(/https?:\/\/\S+/) || [])[0];
      status.card = {
        url, title: opts.card.title, description: opts.card.description, language: 'en', type: 'link',
        author_name: '', author_url: '', provider_name: opts.card.provider, provider_url: '',
        html: '', width: 1200, height: 630,
        image: `${ORIGIN}/_stub/card/${opts.card.scene}.svg`, image_description: '',
        embed_url: '', blurhash: null, published_at: iso(created - 3600_000), authors: [],
      };
    }
    if (opts.poll) {
      const votes = opts.poll.votes || opts.poll.options.map(() => int(3, 80));
      const exp = hoursAgo(opts.poll.expiresH ?? -24);
      status.poll = {
        id: String(pollSeq++),
        expires_at: iso(exp),
        expired: exp < NOW,
        multiple: !!opts.poll.multiple,
        votes_count: votes.reduce((a, b) => a + b, 0),
        voters_count: votes.reduce((a, b) => a + b, 0),
        voted: author === me ? true : R() > 0.5,
        own_votes: author === me ? [] : [],
        options: opts.poll.options.map((title, i) => ({ title, votes_count: votes[i] })),
        emojis: [],
      };
    }
    if (opts.translation) db.translations[id] = opts.translation;
    if (parent) parent.replies_count++;
    db.statuses[id] = status;
    if (opts.key) keyToId[opts.key] = id;
    if (opts.pinned && author === me) db.pinned.add(id);
    if (opts.mentionPriya || mentions.some((m) => m.id === me.id)) {
      if (author !== me) {
        db.notifications.push({ type: 'mention', at: created + 1000, account: author.id, status: id });
      }
    }
    if (parent && db.accounts[parent.account] === me && author !== me && !mentions.some((m) => m.id === me.id)) {
      db.notifications.push({ type: 'mention', at: created + 1000, account: author.id, status: id });
    }
    return status;
  }

  for (const [key, text, opts = {}] of [...POSTS, ...EXTRA_POSTS]) {
    const author = db.byKey[key];
    if (!author) throw new Error('Unknown author ' + key);
    // replies must be created after parents; POSTS lists parents first
    addStatus(author, text, opts);
  }
  // edit history for one post
  const editedId = keyToId['has'];
  if (editedId) {
    const s = db.statuses[editedId];
    s.edited_at = iso(Date.parse(s.created_at) + 420_000);
    db.edits[editedId] = [
      { content: s.content.replace(' five times a day', ' constantly'), created_at: s.created_at },
      { content: s.content, created_at: s.edited_at },
    ];
  }

  // boosts
  for (const [booster, key, h] of BOOSTS) {
    const target = db.statuses[keyToId[key]];
    const acc = db.byKey[booster];
    if (!target || !acc) continue;
    const created = hoursAgo(h);
    const id = idAt(created);
    db.statuses[id] = {
      ...target,
      id, created_at: iso(created), in_reply_to_id: null, in_reply_to_account_id: null,
      uri: `${acc.uri}/statuses/${id}/activity`, url: null, content: '', media_attachments: [],
      mentions: [], tags: [], card: null, poll: null, account: acc.id, reblog: target.id,
      application: null, replies_count: 0, reblogs_count: 0, favourites_count: 0, _text: '',
    };
    target.reblogs_count++;
    if (acc === me) db.reblogged.add(target.id);
  }

  for (const k of FAVOURITED) keyToId[k] && db.favourited.add(keyToId[k]);
  for (const k of BOOKMARKED) keyToId[k] && db.bookmarked.add(keyToId[k]);
  // bookmark/favourite some older posts too
  const older = Object.values(db.statuses).filter((s) => !s.reblog && s.account !== me.id);
  older.forEach((s) => {
    if (R() < 0.18) db.favourited.add(s.id);
    if (R() < 0.08) db.bookmarked.add(s.id);
  });

  // direct conversations
  const dm = (from, to, text, h, replyTo) => {
    const s = addStatus(db.byKey[from], `@${db.byKey[to].username} ${text}`, { h, vis: 'direct', reply: replyTo });
    return s;
  };
  const c1a = dm('ruth', 'priya', 'Hey! Any chance you could look over our Safe Routes survey before it goes out? It\'s 22 questions and I suspect that\'s about 12 too many 😅', 30);
  keyToId.c1a = c1a.id;
  const c1b = dm('priya', 'ruth', 'Of course! Send it over. Happy to do a quick plain-language pass too. Who\'s the audience — parents, or kids as well?', 29.5, 'c1a');
  keyToId.c1b = c1b.id;
  const c1c = dm('ruth', 'priya', 'Mostly parents, but we want a kid-friendly version for 4th–8th graders. Link: https://forms.example/safe-routes-draft — thank you!!', 29, 'c1b');
  const c2a = dm('mira', 'priya', 'Are you free Thursday to co-facilitate the caseworker interviews? Two sessions, 45 min each. I\'ll bring the good snacks.', 52);
  keyToId.c2a = c2a.id;
  const c2b = dm('priya', 'mira', 'Yes! Thursday works. Can we do a 15 min prep call Wednesday afternoon?', 51, 'c2a');
  const c3 = dm('sam', 'priya', 'Your usual oat cortado will be waiting tomorrow, I finally remembered 😄', 8);
  db.conversations = [
    { id: '301', unread: true, accounts: [db.byKey.sam.id], last_status: c3.id },
    { id: '302', unread: false, accounts: [db.byKey.ruth.id], last_status: c1c.id },
    { id: '303', unread: false, accounts: [db.byKey.mira.id], last_status: c2b.id },
  ];

  // last_status_at
  for (const s of Object.values(db.statuses)) {
    const a = db.accounts[s.account];
    const d = s.created_at.slice(0, 10);
    if (!a.last_status_at || a.last_status_at < d) a.last_status_at = d;
  }
  me.statuses_count = 1284;

  // ---------- Notifications ----------
  const myPosts = Object.values(db.statuses).filter((s) => s.account === me.id && !s.reblog && s.visibility !== 'direct');
  const socialAccs = Object.values(db.accounts).filter((a) => a !== me);
  for (const s of myPosts) {
    const created = Date.parse(s.created_at);
    const ageH = (NOW - created) / 3600_000;
    const nFav = Math.min(socialAccs.length, int(3, 14));
    const shuffled = [...socialAccs].sort(() => R() - 0.5);
    for (let i = 0; i < nFav; i++) {
      const at = created + Math.min(ageH * 0.9, Math.pow(R(), 3) * ageH) * 3600_000 + 60_000;
      db.notifications.push({ type: 'favourite', at, account: shuffled[i].id, status: s.id });
    }
    const nBoost = int(0, 4);
    for (let i = 0; i < nBoost; i++) {
      const at = created + Math.pow(R(), 3) * ageH * 0.8 * 3600_000 + 60_000;
      db.notifications.push({ type: 'reblog', at, account: shuffled[nFav - 1 - i]?.id || shuffled[0].id, status: s.id });
    }
    s.favourites_count = Math.max(s.favourites_count, nFav + int(0, 20));
  }
  // follows
  Object.values(db.accounts)
    .filter((a) => a._extra)
    .forEach((a, i) => {
      db.notifications.push({ type: 'follow', at: hoursAgo(1 + i * i * 9 + R() * 5), account: a.id });
    });
  db.notifications.push({ type: 'follow', at: hoursAgo(0.7), account: db.byKey.claire.id });
  // poll ended
  const pollPost = db.statuses[keyToId['p_poll']];
  if (pollPost) db.notifications.push({ type: 'poll', at: Date.parse(pollPost.poll.expires_at), account: me.id, status: pollPost.id });
  const lenaPoll = Object.values(db.statuses).find((s) => s.poll && s.account === db.byKey.lena.id);
  if (lenaPoll) db.notifications.push({ type: 'poll', at: Date.parse(lenaPoll.poll.expires_at), account: db.byKey.lena.id, status: lenaPoll.id });
  // "status" notifications (bell enabled for pdxbikes)
  Object.values(db.statuses)
    .filter((s) => s.account === db.byKey.pdxbikes.id && !s.reblog)
    .forEach((s) => db.notifications.push({ type: 'status', at: Date.parse(s.created_at) + 2000, account: s.account, status: s.id }));
  // a post you liked was edited
  if (keyToId.has) db.notifications.push({ type: 'update', at: Date.parse(db.statuses[keyToId.has].edited_at), account: db.statuses[keyToId.has].account, status: keyToId.has });
  // follow requests (locked-ish account) -> shown in notifications
  db.followRequests = [db.byKey.x_hugo?.id, db.byKey.x_lucia?.id].filter(Boolean);
  db.followRequests.forEach((id, i) => db.notifications.push({ type: 'follow_request', at: hoursAgo(3 + i * 20), account: id }));

  db.notifications = db.notifications
    .filter((n) => n.at <= NOW)
    .sort((a, b) => a.at - b.at)
    .map((n) => ({ ...n, id: String(400000 + seq++) }))
    .reverse();

  // ---------- Lists ----------
  LISTS.forEach((l, i) => {
    const id = String(51 + i);
    db.lists.push({ id, title: l.title, replies_policy: l.replies_policy, exclusive: !!l.exclusive });
    db.listMembers[id] = l.members.map((k) => db.byKey[k].id);
  });

  // ---------- Filters ----------
  db.filters = [
    {
      id: '11', title: 'Severance spoilers', context: ['home', 'public', 'thread'], expires_at: null, filter_action: 'warn',
      keywords: [{ id: '21', keyword: 'Severance', whole_word: true }, { id: '22', keyword: 'Lumon', whole_word: true }], statuses: [],
    },
    {
      id: '12', title: 'Crypto hype', context: ['home', 'public', 'notifications', 'thread', 'account'], expires_at: null, filter_action: 'hide',
      keywords: [{ id: '23', keyword: 'NFT', whole_word: true }, { id: '24', keyword: 'web3', whole_word: true }, { id: '25', keyword: 'memecoin', whole_word: false }], statuses: [],
    },
    {
      id: '13', title: 'Election results', context: ['home', 'public'], expires_at: iso(NOW + 9 * 86400_000), filter_action: 'warn',
      keywords: [{ id: '26', keyword: 'exit poll', whole_word: true }], statuses: [],
    },
  ];

  // ---------- Scheduled ----------
  db.scheduled = [
    {
      id: '901', scheduled_at: iso(NOW + 20 * 3600_000), media_attachments: [],
      params: { text: 'Reminder: Fall Leaf Ride with @pdxbikes is tomorrow at 10am, Laurelhurst Park! I\'ll be the one with the blue Surly and a bag of day-old croissants 🍂🚲', visibility: 'public', poll: null, media_ids: null, sensitive: null, spoiler_text: null, scheduled_at: null, in_reply_to_id: null, language: 'en', application_id: 1, idempotency: null, with_rate_limit: false },
    },
    {
      id: '902', scheduled_at: iso(NOW + 3 * 86400_000 + 5 * 3600_000), media_attachments: [],
      params: { text: 'New write-up: "Plain language is a design system." What we learned rewriting 40 eligibility questions across three benefits programs. Link in bio.', visibility: 'public', poll: null, media_ids: null, sensitive: null, spoiler_text: null, scheduled_at: null, in_reply_to_id: null, language: 'en', application_id: 1, idempotency: null, with_rate_limit: false },
    },
  ];

  db.statusOrder = Object.keys(db.statuses).sort((a, b) => (BigInt(b) > BigInt(a) ? 1 : -1));
  db.keyToId = keyToId;
  db.homeMarker = db.statusOrder[6];
  db.notifMarker = db.notifications[5]?.id;
  return db;
}
