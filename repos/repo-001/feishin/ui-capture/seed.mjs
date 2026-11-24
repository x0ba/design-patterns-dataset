// Generates .ui-capture/data/library.json - the music library + per-user state served by
// the local OpenSubsonic stub (server.mjs). Deterministic (seeded PRNG) so re-runs are stable.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BIOS, CATALOG } from './catalog.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const NOW = new Date('2026-11-17T09:12:00Z').getTime();
const DAY = 86400000;

let seed = 20240611;
const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};
const ri = (a, b) => Math.floor(a + rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const hid = (s, n = 22) => createHash('md5').update(s).digest('base64url').slice(0, n);
const iso = (t) => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
const slug = (s) => s.replace(/[\\/:*?"<>|]/g, '_');

const FORMATS = {
    flac: { bitRate: () => ri(780, 1150), contentType: 'audio/flac', suffix: 'flac', bitDepth: 16, samplingRate: 44100 },
    mp3: { bitRate: () => 320, contentType: 'audio/mpeg', suffix: 'mp3', samplingRate: 44100 },
    m4a: { bitRate: () => 256, contentType: 'audio/mp4', suffix: 'm4a', samplingRate: 44100 },
};

// Featured performers on specific tracks (track artists that differ from the album artist).
const FEATURES = {
    'These Walls': ['Bilal', 'Anna Wise', 'Thundercat'],
    'Wesley\'s Theory': ['George Clinton', 'Thundercat'],
    Angel: ['Horace Andy'],
    Teardrop: ['Elizabeth Fraser'],
    'Man Next Door': ['Horace Andy'],
    'Pink + White': ['Beyoncé'],
    'Solo (Reprise)': ['André 3000'],
    'Nothing Even Matters': ["D'Angelo"],
    'Get Innocuous!': [],
};

const artists = new Map();
const getArtist = (name, isAlbumArtist) => {
    if (!artists.has(name)) {
        artists.set(name, {
            id: hid('artist:' + name),
            name,
            albumIds: [],
            isAlbumArtist: false,
            bio: BIOS[name],
        });
    }
    const a = artists.get(name);
    if (isAlbumArtist) a.isAlbumArtist = true;
    return a;
};

// Library import history: an initial bulk import, then albums trickle in over ~3.5 years.
const albums = [];
const songs = [];
const rows = CATALOG.trim().split('\n');
const initialImport = new Date('2023-02-11T21:40:00Z').getTime();

rows.forEach((row, idx) => {
    const [artistName, title, year, genreStr, label, fmt, trackStr] = row.split('|');
    const artist = getArtist(artistName, true);
    const genres = genreStr.split(',');
    const id = hid('album:' + artistName + title);
    let created;
    if (idx % 3 !== 2 && idx < 30) created = initialImport + ri(0, 90) * 60000;
    else created = initialImport + ri(30, Math.floor((NOW - initialImport) / DAY) - 2) * DAY + ri(0, 86000) * 1000;
    const f = FORMATS[fmt];
    const album = {
        id,
        name: title,
        artist: artistName,
        artistId: artist.id,
        year: Number(year),
        genres,
        label,
        created,
        songIds: [],
        affinity: rand() ** 1.6, // how much this user likes the album
    };
    artist.albumIds.push(id);
    trackStr.split(';').forEach((raw, i) => {
        let t = raw;
        let dur;
        if (t.startsWith('~')) {
            t = t.slice(1);
            dur = ri(480, 1260);
        } else if (t.startsWith('^')) {
            t = t.slice(1);
            dur = ri(48, 118);
        } else dur = ri(155, 345);
        const feat = FEATURES[t] || [];
        const songArtists = [artist, ...feat.map((n) => getArtist(n, false))];
        const bitRate = f.bitRate();
        const sid = hid('song:' + id + ':' + i);
        const song = {
            id: sid,
            albumId: id,
            title: t,
            track: i + 1,
            discNumber: 1,
            duration: dur,
            bitRate,
            size: Math.round((dur * bitRate * 1000) / 8 + ri(20000, 900000)),
            suffix: f.suffix,
            contentType: f.contentType,
            bitDepth: f.bitDepth,
            samplingRate: f.samplingRate,
            path: `${slug(artistName)}/${slug(title)} (${year})/${String(i + 1).padStart(2, '0')} - ${slug(t)}.${f.suffix}`,
            artistIds: songArtists.map((a) => a.id),
            genre: genres[0],
            bpm: rand() < 0.35 ? ri(68, 172) : undefined,
            created: created + i * 1000,
            replayGain: { trackGain: -Number((rand() * 9 + 1).toFixed(2)), albumGain: -Number((rand() * 6 + 3).toFixed(2)), trackPeak: Number((0.8 + rand() * 0.2).toFixed(6)) },
        };
        songs.push(song);
        album.songIds.push(sid);
    });
    albums.push(album);
});

// Messy real-world leftovers: an untagged rip and a voice-memo style file.
{
    const artist = getArtist('[Unknown Artist]', true);
    const id = hid('album:unknown');
    const album = { id, name: '[Unknown Album]', artist: artist.name, artistId: artist.id, year: 0, genres: [], label: '', created: new Date('2025-06-03T23:18:00Z').getTime(), songIds: [], affinity: 0.05 };
    artist.albumIds.push(id);
    ['track03_final_master', 'Rec 2025-05-30 22_14', 'untitled (1)', 'jam w_ dave - garage'].forEach((t, i) => {
        const sid = hid('song:unknown:' + i);
        songs.push({ id: sid, albumId: id, title: t, track: undefined, discNumber: 1, duration: ri(70, 410), bitRate: 192, size: ri(2000000, 9000000), suffix: 'mp3', contentType: 'audio/mpeg', samplingRate: 48000, path: `_unsorted/${t}.mp3`, artistIds: [artist.id], genre: undefined, created: album.created + i * 1000 });
        album.songIds.push(sid);
    });
    albums.push(album);
}

const songById = new Map(songs.map((s) => [s.id, s]));
const albumById = new Map(albums.map((a) => [a.id, a]));

// ---- Listening history -------------------------------------------------------------
for (const album of albums) {
    const age = (NOW - album.created) / DAY; // days in library
    const neverPlayed = rand() < 0.12 || age < 2;
    album.songIds.forEach((sid, i) => {
        const s = songById.get(sid);
        if (neverPlayed) return;
        // singles / openers get more plays; weighting by affinity and time in library
        const hit = i < 3 || rand() < 0.2 ? 1.6 : 1;
        const base = album.affinity * hit * Math.min(age, 900) * 0.11 * (0.4 + rand());
        const pc = Math.max(0, Math.round(base + (rand() < 0.5 ? ri(0, 3) : 0)));
        if (pc > 0) {
            s.playCount = pc;
            // heavily played albums were played recently
            const recency = album.affinity > 0.5 ? rand() * 20 : rand() * Math.min(age, 400);
            s.played = Math.min(NOW - 3600000, NOW - recency * DAY - ri(0, 80000) * 1000);
            if (s.played < album.created) s.played = album.created + ri(1, 20) * 3600000;
        }
    });
}
// Something played in the last couple of hours (this morning's listening).
const morning = albums.find((a) => a.name === 'Teen Dream');
morning.songIds.slice(0, 6).forEach((sid, i) => {
    const s = songById.get(sid);
    s.playCount = (s.playCount || 0) + 1;
    s.played = NOW - (6 - i) * 230000;
});
for (const album of albums) {
    const played = album.songIds.map((id) => songById.get(id)).filter((s) => s.played);
    album.playCount = played.reduce((n, s) => n + s.playCount, 0);
    album.played = played.length ? Math.max(...played.map((s) => s.played)) : undefined;
}

// ---- Favourites & ratings ----------------------------------------------------------
for (const s of songs) {
    const a = albumById.get(s.albumId);
    if ((s.playCount || 0) > 25 && rand() < 0.55) s.starred = s.played - ri(1, 200) * DAY;
    else if (rand() < 0.04 && s.playCount) s.starred = (s.played || a.created) - ri(0, 30) * DAY;
    if (s.starred && s.starred < a.created) s.starred = a.created + ri(1, 10) * DAY;
    if (s.playCount && rand() < 0.28) s.userRating = Math.max(1, Math.min(5, Math.round(a.affinity * 4 + rand() * 2)));
}
for (const a of albums) {
    if (a.affinity > 0.45 && rand() < 0.7) a.starred = a.created + ri(3, 60) * DAY;
    if (a.starred > NOW) a.starred = NOW - DAY;
    if (rand() < 0.35 && a.playCount) a.userRating = Math.max(2, Math.min(5, Math.round(a.affinity * 5 + 0.5)));
}
for (const name of ['Radiohead', 'Boards of Canada', 'Phoebe Bridgers', 'Miles Davis', 'Massive Attack', 'Tame Impala', 'Björk']) {
    getArtist(name).starred = NOW - ri(30, 900) * DAY;
}

// ---- Playlists ---------------------------------------------------------------------
const byTitle = (title, artist) => {
    const s = songs.find((x) => x.title === title && (!artist || albumById.get(x.albumId).artist === artist));
    if (!s) throw new Error('missing track ' + title);
    return s.id;
};
const fromGenres = (genres, n) => {
    const pool = songs.filter((s) => albumById.get(s.albumId).genres.some((g) => genres.includes(g)));
    const out = new Set();
    while (out.size < Math.min(n, pool.length)) out.add(pick(pool).id);
    return [...out];
};
const topPlayed = (n) => [...songs].filter((s) => s.playCount).sort((a, b) => b.playCount - a.playCount).slice(0, n).map((s) => s.id);

const playlists = [
    { name: 'Late Night Drive', comment: 'windows down, 1am, empty highway', public: true, created: '2023-03-04T02:11:00Z', songs: ['Teardrop', 'Angel', 'Nights', 'Archangel', 'Weird Fishes/Arpeggi', 'Digital Love', 'Glory Box', 'Norway', 'Something About Us', 'The Less I Know the Better', 'Near Dark', 'White Ferrari', 'Inertia Creeps', 'Sour Times', 'Let It Happen', 'Myth'].filter((t) => t !== 'Myth').map((t) => byTitle(t)) },
    { name: 'Sunday Morning Coffee', comment: 'slow start. no skipping allowed', public: true, created: '2023-04-16T08:30:00Z', songs: ['The Girl from Ipanema', 'Corcovado (Quiet Nights of Quiet Stars)', 'Blue in Green', 'Waltz for Debby', 'Pink Moon', 'River', 'A Case of You', 'Flume', 'Here Comes the Sun', 'Your Love Is King', 'Golden Lady', 'Garden Song', 'Fourth of July', 'Sun It Rises', 'Something'].map((t) => byTitle(t)) },
    { name: 'Deep Work', comment: 'No vocals. For writing, coding, and pretending to read papers.', public: false, created: '2023-05-02T13:05:00Z', songs: fromGenres(['Ambient', 'IDM', 'Classical'], 46) },
    { name: 'Gym Rotation', comment: '', public: false, created: '2023-09-18T17:45:00Z', songs: ['Battery', 'Master of Puppets', 'Smells Like Teen Spirit', 'Harder, Better, Faster, Stronger', 'King Kunta', 'Alright', 'Damage, Inc.', 'Breed', 'Territorial Pissings', 'A-Punk', 'Get Innocuous!', 'Scenario', 'Buggin\' Out', 'Elephant', 'Crosseyed and Painless', 'Higher Ground', 'Aerodynamic', 'Doo Wop (That Thing)', 'Lithium', 'Disposable Heroes'].map((t) => byTitle(t)) },
    { name: 'Rainy Day', comment: 'grey skies, tea, big sweater', public: true, created: '2023-11-07T15:20:00Z', songs: fromGenres(['Indie Folk', 'Folk', 'Trip Hop', 'Dream Pop'], 34) },
    { name: 'Road Trip 2025 - PCH', comment: 'SF -> San Diego, July 2025. Mostly Maya\'s picks, a few of Sam\'s (sorry)', public: true, created: '2025-06-28T19:02:00Z', songs: [...fromGenres(['Rock', 'Indie Rock', 'Psychedelic Pop', 'Psychedelic Rock', 'Indie Pop', 'Soul'], 58)] },
    { name: 'Dinner Party', comment: 'Background music that still sounds like we have taste', public: false, created: '2024-02-10T18:00:00Z', songs: [...fromGenres(['Bossa Nova', 'Jazz', 'Smooth Jazz', 'Soul', 'Neo Soul'], 40)] },
    { name: 'Sleep', comment: '', public: false, created: '2024-01-03T23:40:00Z', songs: ['1/1', '2/1', '1/2', '2/2', 'Xtal', 'Treefingers', 'Aria', 'Aria da capo', 'Blue in Green', 'Heliosphan', 'Avril 14th'].filter((t) => t !== 'Avril 14th').map((t) => byTitle(t)) },
    { name: 'Most Played 2025', comment: 'auto-ish: my top tracks of 2025, curated a bit by hand', public: true, created: '2025-12-29T12:00:00Z', songs: topPlayed(50) },
    { name: 'Sad Girl Autumn', comment: 'mitski / phoebe / fiona / sufjan. you know the vibe', public: true, created: '2024-10-02T21:13:00Z', songs: songs.filter((s) => ['Mitski', 'Phoebe Bridgers', 'Fiona Apple', 'Sufjan Stevens', 'Japanese Breakfast'].includes(albumById.get(s.albumId).artist) && (s.playCount || 0) > 3).map((s) => s.id).slice(0, 38) },
    { name: 'Jazz Essentials', comment: 'Start here if you think you don\'t like jazz.', public: true, created: '2023-02-20T10:00:00Z', songs: fromGenres(['Jazz', 'Bossa Nova'], 23) },
    { name: 'Hip-Hop Classics', comment: '', public: false, created: '2024-05-22T16:40:00Z', songs: fromGenres(['Hip-Hop', 'Jazz Rap'], 30) },
    { name: 'Running - 165bpm-ish', comment: 'tempo not exact, whatever', public: false, created: '2024-04-01T06:10:00Z', songs: songs.filter((s) => s.bpm && s.bpm > 120).map((s) => s.id).slice(0, 27) },
    { name: 'Songs for Mom', comment: 'For her birthday mix - Fleetwood Mac, Joni, Sade, Stevie', public: false, created: '2024-08-09T20:30:00Z', songs: songs.filter((s) => ['Fleetwood Mac', 'Joni Mitchell', 'Sade', 'Stevie Wonder', 'Marvin Gaye'].includes(albumById.get(s.albumId).artist) && rand() < 0.45).map((s) => s.id) },
    { name: 'new stuff to check out', comment: 'inbox. listen then sort', public: false, created: '2026-09-21T22:05:00Z', songs: albums.filter((a) => NOW - a.created < 200 * DAY).flatMap((a) => a.songIds.slice(0, 3)) },
    { name: 'wedding - first dance shortlist', comment: 'Decided on "Something" in the end.', public: false, created: '2025-02-14T20:00:00Z', songs: ['Something', 'All I Want', 'A Case of You', 'Lover of Mine', 'Moon Song', 'Golden Lady', 'Two Slow Dancers', 'Real Love'].map((t) => byTitle(t)) },
    { name: 'Focus (old)', comment: 'superseded by Deep Work', public: false, created: '2023-02-12T09:00:00Z', songs: fromGenres(['Ambient'], 9) },
];
playlists.forEach((p, i) => {
    p.id = hid('playlist:' + p.name);
    p.owner = 'maya';
    p.created = new Date(p.created).getTime();
    p.changed = Math.min(NOW - ri(1, 30) * 3600000, p.created + ri(0, Math.floor((NOW - p.created) / DAY)) * DAY);
    if (i < 3) p.changed = NOW - ri(1, 6) * DAY;
});

// ---- Internet radio ------------------------------------------------------------------
const radio = [
    { name: 'SomaFM Groove Salad', streamUrl: 'https://ice1.somafm.com/groovesalad-256-mp3', homePageUrl: 'https://somafm.com/groovesalad/' },
    { name: 'KEXP 90.3 Seattle', streamUrl: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3', homePageUrl: 'https://www.kexp.org' },
    { name: 'NTS Radio 1', streamUrl: 'https://stream-relay-geo.ntslive.net/stream', homePageUrl: 'https://www.nts.live' },
    { name: 'Radio Paradise - Main Mix', streamUrl: 'https://stream.radioparadise.com/flac', homePageUrl: 'https://radioparadise.com' },
    { name: 'WFMU 91.1', streamUrl: 'https://stream0.wfmu.org/freeform-128k', homePageUrl: 'https://wfmu.org' },
    { name: 'FIP (Radio France)', streamUrl: 'https://icecast.radiofrance.fr/fip-hifi.aac', homePageUrl: 'https://www.radiofrance.fr/fip' },
    { name: 'SomaFM Drone Zone', streamUrl: 'https://ice1.somafm.com/dronezone-256-mp3', homePageUrl: 'https://somafm.com/dronezone/' },
].map((r) => ({ ...r, id: hid('radio:' + r.name, 12) }));

// ---- Saved play queue (resumed on login) --------------------------------------------
const queueIds = [...morning.songIds, ...albumById.get(hid('album:' + 'Japanese Breakfast' + 'Jubilee')).songIds.slice(0, 5)];
const playQueue = { ids: queueIds, currentIndex: 6, position: 71000, changed: NOW - 640000, changedBy: 'Feishin' };

const library = {
    generatedAt: iso(NOW),
    user: { username: 'maya', password: 'listen2music', email: 'maya.okafor@fastmail.com' },
    folder: { id: 1, name: 'Music' },
    artists: [...artists.values()],
    albums,
    songs,
    playlists,
    radio,
    playQueue,
};
const out = join(HERE, 'data', 'library.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(library));
console.log(`seeded ${albums.length} albums, ${songs.length} songs, ${library.artists.length} artists, ${playlists.length} playlists -> ${out}`);
