// Validates the stub's responses against Feishin's own OpenSubsonic zod schemas + normalizers.
// Bundled with esbuild from the build copy (see validate.sh).
import { ssType } from '/@/shared/api/subsonic/subsonic-types';
import { ssNormalize } from '/@/shared/api/subsonic/subsonic-normalize';

const base = process.argv[2];
const A = 'u=maya&p=listen2music&f=json&v=1.13.0&c=Feishin';
const server: any = { id: 'home-server', name: 'Home Server', type: 'subsonic', url: base, credential: 'u=maya&p=listen2music', username: 'maya' };
const get = async (path: string, q = '') => (await (await fetch(`${base}/rest/${path}.view?${A}&${q}`)).json())['subsonic-response'];
let fails = 0;
const check = (name: string, schema: any, body: any) => {
    const r = schema.safeParse(body);
    if (!r.success) {
        fails++;
        console.log('FAIL', name, JSON.stringify(r.error.issues.slice(0, 4)));
    } else console.log('ok  ', name);
};
const R: any = (ssType as any)._response;
const list = await get('getAlbumList2', 'type=newest&size=500');
check('getAlbumList2', R.getAlbumList2, list);
list.albumList2.album.forEach((a: any) => ssNormalize.album(a, server));
const albumId = list.albumList2.album[3].id;
const album = await get('getAlbum', 'id=' + albumId);
check('getAlbum', R.getAlbum, album);
const norm = ssNormalize.album(album.album, server);
console.log('  album:', norm.name, norm.albumArtistName ?? '', norm.songCount, norm.imageUrl?.slice(0, 60));
album.album.song.forEach((s: any) => ssNormalize.song(s, server));
const artists = await get('getArtists');
check('getArtists', R.getArtists, artists);
const arId = artists.artists.index[0].artist[0].id;
const ar = await get('getArtist', 'id=' + arId);
check('getArtist', R.getArtist, ar);
ssNormalize.albumArtist(ar.artist, server);
check('getArtistInfo2', R.artistInfo2, await get('getArtistInfo2', 'id=' + arId));
check('search3', R.search3, await get('search3', 'query=radio&songCount=20&albumCount=5&artistCount=5'));
check('search3-all', R.search3, await get('search3', 'query=&songCount=100&songOffset=0'));
check('getStarred', R.getStarred, await get('getStarred'));
check('getGenres', R.getGenres, await get('getGenres'));
const pls = await get('getPlaylists');
check('getPlaylists', R.getPlaylists, pls);
pls.playlists.playlist.forEach((p: any) => ssNormalize.playlist(p, server));
const pl = await get('getPlaylist', 'id=' + pls.playlists.playlist[0].id);
check('getPlaylist', R.getPlaylist, pl);
check('getRandomSongs', R.randomSongList, await get('getRandomSongs', 'size=20'));
check('getSongsByGenre', R.getSongsByGenre, await get('getSongsByGenre', 'genre=Jazz&count=20'));
check('getTopSongs', R.topSongsList, await get('getTopSongs', 'id=' + arId));
check('getSimilarSongs2', R.similarSongs2, await get('getSimilarSongs2', 'id=' + arId));
check('getPlayQueue', R.playQueue, await get('getPlayQueue'));
check('getInternetRadioStations', R.getInternetRadioStations, await get('getInternetRadioStations'));
check('getMusicFolders', R.musicFolderList, await get('getMusicFolders'));
check('getUser', R.user, await get('getUser', 'username=maya'));
check('getScanStatus', R.getScanStatus, await get('getScanStatus'));
check('getIndexes', R.getIndexes, await get('getIndexes'));
check('getMusicDirectory', R.getMusicDirectory, await get('getMusicDirectory', 'id=' + albumId));
check('getLyricsBySongId', R.structuredLyrics, await get('getLyricsBySongId', 'id=' + album.album.song[0].id));
check('ping', R.ping, await get('ping'));
check('serverInfo', R.serverInfo, await get('getOpenSubsonicExtensions'));
console.log(fails ? `${fails} FAILURES` : 'ALL OK');
