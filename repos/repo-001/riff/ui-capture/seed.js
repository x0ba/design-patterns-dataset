'use strict';
// Generates .ui-capture/seed/storage.json: the localStorage map Riff persists to storage.json
// (keys devsize_favorites, devsize_history, devsize_playlists, riff_saved_albums, ...),
// describing a listener who has used Riff for ~10 months.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { albums, tracks, artists, findTrack } = require('./catalog');

const NOW = Date.now();
const DAY = 86400000;
let seedN = 7;
function rand() { seedN = (seedN * 1103515245 + 12345) % 2147483648; return seedN / 2147483648; }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const T = (artist, title) => { const t = findTrack(artist, title); if (!t) throw new Error('missing ' + artist + ' - ' + title); return t; };
const clean = (t) => { const { albumId, year, ...rest } = t; return { ...rest }; };
const byArtist = (...names) => tracks.filter(t => names.includes(t.artist));

// ---------- favorites (liked songs) ----------
const heavy = ['Radiohead', 'Fred again..', 'Mitski', 'Bon Iver', 'Phoebe Bridgers', 'Frank Ocean', 'Four Tet', 'Bicep', 'Burial', 'Beach House', 'Japanese Breakfast', 'Tame Impala', 'Nujabes', 'Billie Eilish', 'Kendrick Lamar', 'Jamie xx', 'Молчат Дома', 'Okean Elzy', 'ONUKA', 'Massive Attack', 'Big Thief', 'Nils Frahm'];
let favPool = tracks.filter(t => heavy.includes(t.artist) || t.platform === 'soundcloud' || rand() < 0.35);
favPool = shuffle(favPool).slice(0, 138);
// added over ~300 days, newer first, in bursts (people like several songs in one sitting)
let ts = NOW - 2 * 3600000;
const favorites = favPool.map((t) => {
  ts -= (rand() < 0.6 ? rand() * 40 * 60000 : rand() * 5 * DAY);
  return { ...clean(t), addedAt: Math.round(ts) };
});

// ---------- history (max 100, newest first) ----------
let hts = NOW - 25 * 60000;
const histPool = shuffle(tracks).slice(0, 100);
// last session: an evening of Fred again.. / Four Tet
const lastSession = [T('Fred again..', 'adore u'), T('Four Tet', 'Loved'), T('Fred again..', 'Delilah (pull me out of this)'), T('Jamie xx', 'Baddy On the Floor'), T('Bicep', 'Atlas'), T('Fred again..', 'places to be')];
const histOrder = lastSession.concat(histPool.filter(t => !lastSession.includes(t))).slice(0, 100);
const history = histOrder.map((t, i) => {
  hts -= i < 6 ? t.duration * 1000 + 4000 : (rand() < 0.7 ? t.duration * 1000 + rand() * 120000 : rand() * 2.5 * DAY);
  return { ...clean(t), playedAt: Math.round(hts) };
});

// ---------- playlists ----------
function pl(id, name, list, opts = {}) {
  const created = opts.createdAt || NOW - opts.ageDays * DAY;
  let a = created;
  const ptracks = list.map((t) => { a += rand() * (Math.max(DAY, (NOW - created) / list.length)); return { ...clean(t), addedAt: Math.round(Math.min(a, NOW - 3600000)) }; });
  const out = { id, name, tracks: ptracks, createdAt: Math.round(created) };
  if (opts.description) out.description = opts.description;
  if (opts.lastPlayedDays != null) out.lastPlayedAt = Math.round(NOW - opts.lastPlayedDays * DAY);
  if (opts.imported) Object.assign(out, opts.imported);
  if (opts.cover) out.cover = opts.cover;
  return out;
}
const mk = (s) => 'pl_' + crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
const playlists = [
  pl(mk('late'), 'late night drive', [
    T('Frank Ocean', 'White Ferrari'), T('The Weeknd', 'Blinding Lights'), T('Tame Impala', 'Let It Happen'), T('Massive Attack', 'Teardrop'),
    T('Beach House', 'Space Song'), T('Frank Ocean', 'Nights'), T('Arctic Monkeys', '505'), T('Burial', 'Archangel'), T('Bicep', 'Apricots'),
    T('Daft Punk', 'Instant Crush'), T('Portishead', 'Roads'), T('Kali Uchis', 'Te Mata'), T('SZA', 'Snooze'), T('Jamie xx', 'Life'),
    T('Молчат Дома', 'Судно (Борис Рыжий)'), T('The Weeknd', 'In Your Eyes'), T('Frank Ocean', 'Self Control'), T('Tame Impala', 'Eventually')
  ], { ageDays: 290, lastPlayedDays: 0.1, description: 'windows down, city lights' }),
  pl(mk('focus'), 'deep focus 🎧', [
    T('Nils Frahm', 'Sunson'), T('Ólafur Arnalds', 'Saudade (When We Are Born)'), T('Aphex Twin', 'Xtal'), T('Four Tet', 'Daydream Repeat'),
    T('Floating Points', 'Movement 6'), T('Nils Frahm', 'My Friend the Forest'), T('Aphex Twin', 'Ageispolis'), T('Ólafur Arnalds', 'Loom'),
    T('Four Tet', 'Three Drums'), T('Nujabes', 'Aruarian Dance'), T('Nils Frahm', 'Kaleidoscope'), T('Aphex Twin', 'Heliosphan'),
    T('Floating Points', 'Movement 1'), T('Ólafur Arnalds', 'Spiral'), T('Burial', 'Near Dark'), T('Nujabes', 'Reflection Eternal')
  ], { ageDays: 260, lastPlayedDays: 1.2, description: 'no lyrics. for writing + code reviews' }),
  pl(mk('lofi'), 'lofi / study', byArtist('mt. fujitive', 'Jinsang', 'idealism', 'Saib.', 'Tomppabeats', 'sweatson klank', 'Elijah Who', 'yung kartz').concat([T('Nujabes', 'Feather'), T('Nujabes', 'Luv(sic) Pt. 3'), T('Nujabes', 'Modal Soul')]),
    { ageDays: 305, lastPlayedDays: 3 }),
  pl(mk('sad'), 'sad girl autumn', [
    T('Phoebe Bridgers', 'Moon Song'), T('Mitski', 'Nobody'), T('Bon Iver', 'Skinny Love'), T('Phoebe Bridgers', 'I Know the End'),
    T('Mitski', 'Two Slow Dancers'), T('Big Thief', 'Change'), T('Bon Iver', 'Re: Stacks'), T('Japanese Breakfast', 'Posing in Bondage'),
    T('Phoebe Bridgers', 'Punisher'), T('Mitski', 'I Love Me After You'), T('Billie Eilish', 'WILDFLOWER'), T('Big Thief', 'Certainty'),
    T('Mitski', 'Heaven'), T('Bon Iver', 'Flume'), T('Phoebe Bridgers', 'Garden Song'), T('Radiohead', 'Nude'), T('Billie Eilish', 'THE GREATEST')
  ], { ageDays: 54, lastPlayedDays: 2.4, description: 'it’s fine. everything is fine.' }),
  pl(mk('gym'), 'GYM', [
    T('Kendrick Lamar', 'squabble up'), T('Kendrick Lamar', 'King Kunta'), T('Charli xcx', '360'), T('Little Simz', 'Point and Kill'),
    T('Kendrick Lamar', 'tv off'), T('Rosalía', 'SAOKO'), T('Charli xcx', 'Von dutch'), T('Little Simz', 'Venom'), T('Kendrick Lamar', 'wacced out murals'),
    T('Charli xcx', '365'), T('Fred again..', 'ten'), T('Bicep', 'Saku'), T('Kendrick Lamar', 'Alright')
  ], { ageDays: 180, lastPlayedDays: 4 }),
  pl(mk('kitchen'), 'sunday kitchen', [
    T('Fleetwood Mac', 'Dreams'), T('Fleetwood Mac', 'Never Going Back Again'), T('Daft Punk', 'Get Lucky'), T('Japanese Breakfast', 'Be Sweet'),
    T('Kali Uchis', 'Igual Que Un Ángel'), T('Tame Impala', 'The Less I Know the Better'), T('Fleetwood Mac', 'Go Your Own Way'), T('DakhaBrakha', 'Vesna'),
    T('Daft Punk', 'Lose Yourself to Dance'), T('Japanese Breakfast', 'Kokomo, IN'), T('Fleetwood Mac', 'Songbird')
  ], { ageDays: 120, lastPlayedDays: 9 }),
  pl(mk('ua'), 'українське 💙💛', [
    T('Okean Elzy', 'Обійми'), T('ONUKA', 'Vidlik'), T('Skryabin', 'Старі фотографії'), T('DakhaBrakha', 'Monakh'), T('Okean Elzy', 'Без бою'),
    T('ONUKA', 'Svitanok'), T('Skryabin', 'Танець пінгвіна'), T('DakhaBrakha', 'Chumakuyu'), T('Okean Elzy', 'Не твоя війна'), T('ONUKA', '19 86'),
    T('Skryabin', 'Мовчати'), T('DakhaBrakha', 'Divka')
  ], { ageDays: 210, lastPlayedDays: 6 }),
  pl(mk('postpunk'), 'пост-панк', [
    T('Молчат Дома', 'Судно (Борис Рыжий)'), T('Молчат Дома', 'Клетка'), T('Kino', 'Звезда по имени Солнце'), T('Молчат Дома', 'Тоска'),
    T('Kino', 'Пачка сигарет'), T('Молчат Дома', 'Танцевать'), T('Kino', 'Сказка'), T('Молчат Дома', 'Discoteque')
  ], { ageDays: 160, lastPlayedDays: 22 }),
  pl(mk('fred'), 'fred again.. live set ideas', byArtist('Fred again..').concat([T('Four Tet', 'Loved'), T('Jamie xx', 'Treat Each Other Right'), T('Bicep', 'Hawk'), T('Burial', 'Untrue')]),
    { ageDays: 33, lastPlayedDays: 0.2 }),
  pl(mk('wed'), 'Anya & Mark wedding — first dance shortlist', [
    T('Frank Ocean', 'Pink + White'), T('Beach House', 'Levitation'), T('Billie Eilish', 'BIRDS OF A FEATHER'), T('Mitski', 'My Love Mine All Mine'),
    T('Radiohead', 'House of Cards'), T('Bon Iver', '00000 Million')
  ], { ageDays: 75, lastPlayedDays: 41, description: 'need to send to the DJ by the 20th!!' }),
  pl(mk('discover'), 'Discover Weekly (imported)', shuffle(tracks.filter(t => !heavy.includes(t.artist))).slice(0, 30),
    { ageDays: 140, lastPlayedDays: 13, imported: { importedPlatform: 'spotify', syncPlatform: 'spotify', importedAt: NOW - 140 * DAY, url: 'https://open.spotify.com/playlist/37i9dQZEVXcQ9COmYvdajy', sourceUrl: 'https://open.spotify.com/playlist/37i9dQZEVXcQ9COmYvdajy' } }),
  pl(mk('ytm'), 'Liked from YT Music', shuffle(tracks).slice(0, 47),
    { ageDays: 300, lastPlayedDays: 60, imported: { importedPlatform: 'ytmusic', importedAt: NOW - 300 * DAY, url: 'https://music.youtube.com/playlist?list=LM' } }),
  pl(mk('new'), 'new playlist', [], { ageDays: 8 }),
  pl(mk('radiohead'), 'radiohead ranked (WIP)', [
    T('Radiohead', 'Weird Fishes/Arpeggi'), T('Radiohead', 'Paranoid Android'), T('Radiohead', 'Reckoner'), T('Radiohead', 'Let Down'),
    T('Radiohead', 'Exit Music (For a Film)'), T('Radiohead', 'Nude'), T('Radiohead', 'Videotape'), T('Radiohead', 'No Surprises'),
    T('Radiohead', 'Jigsaw Falling into Place'), T('Radiohead', 'Lucky'), T('Radiohead', 'All I Need'), T('Radiohead', 'Karma Police')
  ], { ageDays: 95, lastPlayedDays: 17 })
];

// ---------- saved albums ----------
const savedAlbumTitles = ['In Rainbows', 'Actual Life 3 (January 1 - September 9 2022)', 'Blonde', 'Punisher', 'Untrue', 'Three', 'Currents', 'HIT ME HARD AND SOFT', 'GNX', 'Mezzanine', 'Depression Cherry', 'Modal Soul', 'Этажи', 'Rumours', 'Isles', 'For Emma, Forever Ago', 'MOTOMAMI'];
let ats = NOW - DAY * 1.5;
const riff_saved_albums = savedAlbumTitles.map(title => {
  const a = albums.find(x => x.title === title);
  ats -= rand() * 25 * DAY;
  return { id: a.id, title: a.title, artist: a.artist, cover: a.cover, type: a.type, year: a.year, trackCount: a.tracks.length, savedAt: Math.round(ats), addedAt: Math.round(ats) };
});

// ---------- followed artists ----------
const followed = ['Fred again..', 'Radiohead', 'Mitski', 'Phoebe Bridgers', 'Four Tet', 'Frank Ocean', 'Bon Iver', 'Burial', 'Okean Elzy', 'Japanese Breakfast', 'Kendrick Lamar', 'Billie Eilish', 'Beach House', 'Nujabes', 'Молчат Дома', 'ONUKA', 'Jamie xx', 'mt. fujitive', 'Nils Frahm', 'Bicep'];
const riff_favorite_artists = followed.map(n => { const a = artists.find(x => x.name === n); return { name: a.name, avatar: a.avatar, fans: a.fans }; });
const riff_artist_meta_cache = Object.fromEntries(artists.map(a => [a.name.toLowerCase(), { avatar: a.avatar, fans: a.fans }]));

// ---------- search history ----------
const sh = [];
let sts = NOW - 50 * 60000;
const addQ = (q) => { sts -= rand() * 2 * DAY; sh.push({ ts: Math.round(sts), kind: 'query', key: 'q:' + q.toLowerCase(), title: q, subtitle: '', query: q, thumb: '' }); };
const addT = (t) => { sts -= rand() * 2 * DAY; sh.push({ ts: Math.round(sts), kind: 'track', key: 't:' + t.id, title: t.title, subtitle: t.artist, thumb: t.thumbnail, explicit: false, track: { id: t.id, title: t.title, artist: t.artist, album: t.album, duration: t.duration, thumbnail: t.thumbnail, url: t.url, platform: t.platform } }); };
addT(T('Fred again..', 'places to be')); addQ('four tet loved'); addQ('jamie xx in waves'); addT(T('Mitski', 'My Love Mine All Mine'));
addQ('okean elzy'); addQ('first dance songs indie'); addT(T('Frank Ocean', 'Pink + White')); addQ('burial archangel'); addQ('kerala dust');
addT(T('Kerala Dust', 'Nevada')); addQ('nujabes'); addQ('slowed reverb white ferrari'); addQ('молчат дома');

// ---------- playback state: paused mid-song ----------
const cur = T('Fred again..', 'adore u');
const queue = [cur, T('Four Tet', 'Loved'), T('Jamie xx', 'Treat Each Other Right'), T('Bicep', 'Hawk'), T('Fred again..', 'Kammy (like i do)'), T('Burial', 'Untrue'), T('Floating Points', 'Movement 4'), T('Four Tet', 'Skater')].map(clean);

const { chart } = require('./stubs');
const trendTracks = chart('us').slice(0, 12);

const storage = {
  riff_trending_cache: { ts: NOW - 3 * 3600000, tracks: trendTracks },
  devsize_favorites: favorites,
  devsize_history: history,
  devsize_playlists: playlists,
  riff_saved_albums,
  riff_favorite_artists,
  riff_artist_meta_cache,
  riff_search_history_v2: sh,
  riff_pinned_playlists: [playlists[0].id, playlists[8].id],
  riff_last_playback_state: { track: queue[0], currentTime: 74.3, queue, queueIndex: 0 },
  riff_volume: '0.72',
  riff_ui_lang: 'en',
  riff_chart_country: 'us',
  riff_trending_region: 'us',
  devsize_custom_presets: [
    { id: 'p_cu_' + 'night', name: 'night bus', settings: { speed: 1, speedPitch: 0.9, pitch: 0, reverb: 40, distortion: 0, volume: 1, echo: 10, eq: { low: 2, mid: 0, high: -2 }, eqBands: [3, 2, 1, 0, 0, 0, -1, -1, -2, -2] } },
    { id: 'p_cu_' + 'bass', name: 'headphones bass', settings: { speed: 1, speedPitch: 1, pitch: 0, reverb: 0, distortion: 0, volume: 1, echo: 0, eq: { low: 4, mid: 0, high: 1 }, eqBands: [5, 4, 2, 0, 0, 0, 0, 1, 1, 0] } }
  ]
};

const out = {};
for (const [k, v] of Object.entries(storage)) out[k] = typeof v === 'string' ? v : JSON.stringify(v);
fs.mkdirSync(path.join(__dirname, 'seed'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'seed', 'storage.json'), JSON.stringify(out, null, 2));
console.log(`seeded: ${favorites.length} favorites, ${history.length} history, ${playlists.length} playlists (${playlists.reduce((n, p) => n + p.tracks.length, 0)} entries), ${riff_saved_albums.length} albums, ${riff_favorite_artists.length} artists`);
