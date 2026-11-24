'use strict';
// Local stand-ins for the parts of Riff's API server that talk to YouTube Music, YouTube,
// SoundCloud, lrclib/Musixmatch, GitHub etc. Everything else is proxied to the real server.
const crypto = require('crypto');
const { albums, tracks, artists, slug } = require('./catalog');
const lyricsLib = require('./lyrics');
const audio = require('./audio');

function json(res, CORS, obj, status = 200) {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function hashNum(s) { return parseInt(crypto.createHash('md5').update(String(s)).digest('hex').slice(0, 8), 16); }
function shuffleSeeded(arr, seed) {
  return arr.map((t, i) => [hashNum(seed + ':' + (t.id || i)), t]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, ''); }
function pub(t) { const { albumId, year, ...rest } = t; return { ...rest, album: t.album || '', albumId, year }; }
function dayKey() { return new Date().toISOString().slice(0, 10); }

function search(q, platform) {
  const nq = norm(q).trim();
  if (!nq) return [];
  const words = nq.split(/\s+/);
  let pool = tracks;
  if (platform === 'soundcloud') pool = tracks.filter(t => t.platform === 'soundcloud').concat(tracks.filter(t => t.platform !== 'soundcloud'));
  const scored = pool.map(t => {
    const hay = norm(`${t.title} ${t.artist} ${t.album || ''}`);
    let s = 0;
    for (const w of words) if (hay.includes(w)) s += 2;
    if (norm(t.artist).startsWith(nq)) s += 4;
    if (norm(t.title).startsWith(nq)) s += 5;
    return [s, t];
  }).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  return scored.map(t => platform === 'youtube' ? { ...t, platform: 'youtube', url: `https://www.youtube.com/watch?v=${t.id}` } : t);
}

function vibe(payload) {
  const hist = (payload.history || []).concat(payload.favorites || []);
  const likedArtists = new Set(hist.map(t => t.artist));
  const known = new Set(hist.map(t => t.id));
  const seed = payload.refresh ? String(Date.now()) : dayKey();
  const sameArtists = shuffleSeeded(tracks.filter(t => likedArtists.has(t.artist) && !known.has(t.id)), seed + 'a');
  const fresh = shuffleSeeded(tracks.filter(t => !likedArtists.has(t.artist)), seed + 'b');
  const out = [];
  while (out.length < (payload.limit || 10) && (sameArtists.length || fresh.length)) {
    if (sameArtists.length) out.push(sameArtists.shift());
    if (fresh.length && out.length % 3 === 0) out.push(fresh.shift());
  }
  return out.map(pub);
}

const CHART_ORDER = [
  ['Billie Eilish', 'BIRDS OF A FEATHER'], ['Kendrick Lamar', 'luther'], ['SZA', 'Kill Bill'], ['The Weeknd', 'Blinding Lights'],
  ['Charli xcx', '360'], ['Kendrick Lamar', 'squabble up'], ['Okean Elzy', 'Обійми'], ['Fred again..', 'adore u'],
  ['Arctic Monkeys', 'Do I Wanna Know?'], ['Rosalía', 'DESPECHÁ'], ['Billie Eilish', 'WILDFLOWER'], ['Tame Impala', 'The Less I Know the Better'],
  ['ONUKA', 'Vidlik'], ['Kali Uchis', 'Igual Que Un Ángel'], ['The Weeknd', 'Save Your Tears'], ['Jamie xx', 'Baddy On the Floor'],
  ['Charli xcx', 'Apple'], ['Daft Punk', 'Get Lucky'], ['Mitski', 'My Love Mine All Mine'], ['Fleetwood Mac', 'Dreams']
];
function chart(country) {
  const list = CHART_ORDER.map(([a, t]) => tracks.find(x => x.artist === a && x.title === t)).filter(Boolean);
  return shuffleSeeded(list.slice(6), country).slice(0, 6).concat(list.slice(0, 6)).slice(0, 20).map(pub);
}

const BIOS = {
  'Fred again..': 'Fred again.. is a British record producer, singer, songwriter, multi-instrumentalist and DJ. His Actual Life series stitches voice notes, found footage and friends into club records about grief, joy and everything in between.',
  'Radiohead': 'Radiohead are an English rock band formed in Abingdon, Oxfordshire, in 1985. The band consists of Thom Yorke, brothers Jonny and Colin Greenwood, Ed O\'Brien and Philip Selway.',
  'Mitski': 'Mitski Miyawaki is a Japanese-American singer-songwriter. Her music moves between indie rock, synth-pop and country-tinged balladry.',
  'Four Tet': 'Four Tet is the project of London-based producer Kieran Hebden, blending folktronica, house and ambient textures since the late 1990s.',
  'Okean Elzy': 'Океан Ельзи — український рок-гурт, заснований у Львові 1994 року. Фронтмен — Святослав Вакарчук.',
  'Burial': 'Burial is the alias of South London producer William Bevan, whose crackling, rain-soaked take on UK garage defined a generation of night-bus listening.'
};

function artistPayload(name) {
  const a = artists.find(x => norm(x.name) === norm(name)) || { name, avatar: `/__art/artist/${encodeURIComponent(slug(name))}.svg`, fans: 120000 };
  const own = tracks.filter(t => norm(t.artist) === norm(a.name));
  const als = albums.filter(al => norm(al.artist) === norm(a.name)).map(al => ({
    id: al.id, title: al.title, artist: al.artist, cover: al.cover, year: al.year, type: al.type, trackCount: al.tracks.length
  }));
  const similar = shuffleSeeded(artists.filter(x => x.name !== a.name), a.name).slice(0, 8).map(x => ({ name: x.name, avatar: x.avatar, fans: x.fans }));
  const top = shuffleSeeded(own, 'top' + a.name).map((t, i) => ({ ...pub(t), plays: Math.round(a.fans * (3.2 - i * 0.3) * (0.6 + (hashNum(t.id) % 100) / 100)) }));
  return {
    success: true,
    name: a.name,
    artist: {
      name: a.name, avatar: a.avatar, banner: a.avatar, banners: [a.avatar], fans: a.fans, nb_fan: a.fans,
      monthlyListeners: Math.round(a.fans * 1.7), isVerified: a.fans > 500000, channelId: a.channelId,
      bio: BIOS[a.name] || '', tracks: top, albums: als, similar
    },
    avatar: a.avatar,
    banner: a.avatar,
    fans: a.fans,
    subscribers: a.fans,
    monthlyListeners: Math.round(a.fans * 1.7),
    description: '',
    topTracks: top,
    tracks: top,
    albums: als.filter(x => x.type === 'Album'),
    singles: als.filter(x => x.type !== 'Album'),
    releases: als,
    similar,
    similarArtists: similar,
    related: similar
  };
}

function albumPayload(q) {
  const al = albums.find(x => x.id === q.id || x.id === q.browseId) ||
    albums.find(x => norm(x.title) === norm(q.title || q.album || q.name) && (!q.artist || norm(x.artist) === norm(q.artist))) ||
    albums.find(x => norm(x.title) === norm(q.title || q.album || q.name));
  if (!al) return { success: false, tracks: [], error: 'Album not found' };
  return {
    success: true,
    id: al.id, title: al.title, artist: al.artist, cover: al.cover, year: al.year, type: al.type,
    album: { id: al.id, title: al.title, artist: al.artist, cover: al.cover, year: al.year, type: al.type, trackCount: al.tracks.length },
    trackCount: al.tracks.length,
    tracks: al.tracks.map(pub)
  };
}

async function handle(req, res, u, body, CORS) {
  const p = u.pathname;
  const q = Object.fromEntries(u.searchParams.entries());
  const payload = (() => { try { return body ? JSON.parse(body.toString('utf8')) : {}; } catch (_) { return {}; } })();

  switch (p) {
    case '/api/search': {
      const pool = search(q.q, q.platform || 'ytmusic');
      const limit = parseInt(q.limit || '12', 10), offset = parseInt(q.offset || '0', 10);
      return json(res, CORS, { success: true, tracks: pool.slice(offset, offset + limit), hasMore: offset + limit < pool.length }), true;
    }
    case '/api/vibe':
      return json(res, CORS, { success: true, tracks: vibe(payload) }), true;
    case '/api/hot':
      return json(res, CORS, { success: true, title: `Hot picks ${new Date().getFullYear()}`, tracks: chart('hot').slice(0, parseInt(q.limit || '12', 10)) }), true;
    case '/api/trending':
      return json(res, CORS, { success: true, region: q.region || 'global', tracks: shuffleSeeded(chart(q.region || 'global'), 'trend' + dayKey()).slice(0, 12) }), true;
    case '/api/top-chart':
      return json(res, CORS, { success: true, country: q.country || 'ua', tracks: chart(q.country || 'ua') }), true;
    case '/api/artist':
      return json(res, CORS, artistPayload(q.name || '')), true;
    case '/api/album': case '/api/album-tracks': case '/api/albums/tracks':
      return json(res, CORS, albumPayload({ ...q, ...payload })), true;
    case '/api/albums/search': {
      const nq = norm(q.q || q.query || '');
      const list = albums.filter(a => norm(a.title + ' ' + a.artist).includes(nq) || nq.split(' ').some(w => w && norm(a.artist).includes(w)))
        .map(a => ({ id: a.id, title: a.title, artist: a.artist, cover: a.cover, year: a.year, type: a.type, trackCount: a.tracks.length }));
      return json(res, CORS, { success: true, albums: list }), true;
    }
    case '/api/playlists/search':
      return json(res, CORS, { success: true, playlists: [] }), true;
    case '/api/tools/status': case '/api/tools-status':
      return json(res, CORS, { ytDlp: true, ytdlp: true, ffmpeg: true, percent: 100, step: '', error: '', progress: { status: 'done', tool: '', percent: 100, error: '', ffmpegError: '' }, ffmpegOptional: true, ffmpegError: '' }), true;
    case '/api/tools/install': case '/api/tools-install':
      return json(res, CORS, { success: true }), true;
    case '/api/net-check':
      return json(res, CORS, { online: true }), true;
    case '/api/youtube-account-info':
      return json(res, CORS, { success: false, loggedIn: false }), true;
    case '/api/spotify-status':
      return json(res, CORS, { success: true, connected: false, loggedIn: false }), true;
    case '/api/stream-info': {
      const t = tracks.find(x => x.id === q.id) || null;
      const d = Number(q.duration) || (t && t.duration) || 200;
      return json(res, CORS, { success: true, streamUrl: `/__audio/${encodeURIComponent(q.id || 'x')}.wav?d=${Math.round(d)}`, shareWebUrl: q.url || '' }), true;
    }
    case '/api/prefetch':
      return json(res, CORS, { success: true }), true;
    case '/api/lyrics': case '/api/lyrics-stream':
      return json(res, CORS, lyricsLib.lyricsFor(q.title, q.artist, Number(q.duration) || 0)), true;
    case '/api/lyrics-words':
      return json(res, CORS, { success: false }), true;
    case '/api/translate':
      return json(res, CORS, { success: false, error: 'offline' }), true;
    case '/api/track-cover': {
      const t = tracks.find(x => norm(x.artist) === norm(q.artist) && norm(x.title) === norm(q.title));
      return json(res, CORS, { success: !!t, cover: t ? t.thumbnail : '' }), true;
    }
    case '/api/track-credits':
      return json(res, CORS, { success: false }), true;
    case '/api/devsize-memes':
      return json(res, CORS, { success: true, tracks: [] }), true;
    case '/api/image-proxy': {
      res.writeHead(302, { ...CORS, Location: q.url && q.url.startsWith('/') ? q.url : '/__art/album/' + encodeURIComponent(q.url || 'x') + '.svg' });
      return res.end(), true;
    }
    case '/api/i18n-batch':
      return json(res, CORS, { success: true, translations: {} }), true;
    default:
      if (p.startsWith('/api/lastfm/')) return json(res, CORS, { success: false, error: 'Not connected' }), true;
      return false;
  }
}

module.exports = { handle, audio, chart, vibe };
