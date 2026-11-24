'use strict';
// Music catalog used by the seed script and by the local API stub.
// Format: artist | album | year | type | "Title~m:ss; Title~m:ss; ..."
const crypto = require('crypto');

const RAW = `
Radiohead|In Rainbows|2007|Album|15 Step~3:58; Bodysnatchers~4:02; Nude~4:15; Weird Fishes/Arpeggi~5:18; All I Need~3:48; Reckoner~4:50; House of Cards~5:28; Jigsaw Falling into Place~4:09; Videotape~4:39
Radiohead|OK Computer|1997|Album|Airbag~4:44; Paranoid Android~6:23; Subterranean Homesick Alien~4:27; Exit Music (For a Film)~4:24; Let Down~4:59; Karma Police~4:21; No Surprises~3:48; Lucky~4:19
Bon Iver|For Emma, Forever Ago|2007|Album|Flume~3:39; Lump Sum~3:21; Skinny Love~3:58; The Wolves (Act I and II)~5:22; Blindsided~5:29; Re: Stacks~6:41
Bon Iver|22, A Million|2016|Album|22 (OVER S∞∞N)~2:48; 715 - CR∑∑KS~2:13; 33 "GOD"~3:33; 8 (circle)~5:09; 00000 Million~3:53
Phoebe Bridgers|Punisher|2020|Album|Garden Song~3:39; Kyoto~3:04; Punisher~3:05; Chinese Satellite~3:36; Moon Song~4:37; I Know the End~5:44
Fred again..|Actual Life 3 (January 1 - September 9 2022)|2022|Album|Kammy (like i do)~3:46; Clara (the night is dark)~3:55; Delilah (pull me out of this)~4:52; Danielle (smile on my face)~3:57; Berwyn (all that i got is you)~3:21
Fred again..|Ten Days|2024|Album|ten~4:05; adore u~3:11; places to be~3:58; ten days~3:04; Peace U Need~3:41
Four Tet|Three|2024|Album|Loved~3:31; Gliding Through Everything~6:20; Three Drums~6:35; Daydream Repeat~5:17; Skater~4:01
Burial|Untrue|2007|Album|Archangel~3:58; Near Dark~3:54; Ghost Hardware~4:53; Etched Headplate~5:59; Untrue~6:16; Shell of Light~4:40
Bicep|Isles|2021|Album|Atlas~4:56; Saku~4:39; Apricots~5:14; Cazenove~4:18; Rever~4:17; Hawk~3:23
Tame Impala|Currents|2015|Album|Let It Happen~7:47; Nangs~1:47; The Moment~4:15; Yes I'm Changing~4:30; Eventually~5:19; The Less I Know the Better~3:36; New Person, Same Old Mistakes~6:03
Mitski|Be the Cowboy|2018|Album|Geyser~2:23; Why Didn't You Stop Me?~2:21; Nobody~3:13; Washing Machine Heart~2:08; Two Slow Dancers~3:58
Mitski|The Land Is Inhospitable and So Are We|2023|Album|Bug Like an Angel~4:12; Buffalo Replaced~2:50; Heaven~3:09; I Don't Like My Mind~2:50; My Love Mine All Mine~2:17; I Love Me After You~2:58
Kendrick Lamar|GNX|2024|Album|wacced out murals~5:17; squabble up~2:37; luther~2:57; tv off~3:40; peekaboo~2:35; gloria~4:44
Kendrick Lamar|To Pimp a Butterfly|2015|Album|Wesley's Theory~4:47; King Kunta~3:54; Alright~3:39; The Blacker the Berry~5:28; These Walls~5:00
Frank Ocean|Blonde|2016|Album|Nikes~5:14; Ivy~4:09; Pink + White~3:04; Solo~4:17; Self Control~4:09; Nights~5:07; White Ferrari~4:08; Godspeed~2:57
SZA|SOS|2022|Album|Kill Bill~2:33; Snooze~3:21; Good Days~4:39; Saturn~3:06; Nobody Gets Me~3:00; Low~3:01
Charli xcx|BRAT|2024|Album|360~2:13; Club classics~2:32; Sympathy is a knife~2:34; Von dutch~2:41; Apple~2:31; 365~3:23
Billie Eilish|HIT ME HARD AND SOFT|2024|Album|SKINNY~3:39; LUNCH~3:00; CHIHIRO~5:03; BIRDS OF A FEATHER~3:30; WILDFLOWER~4:21; THE GREATEST~4:54; L'AMOUR DE MA VIE~5:34; BLUE~5:43
Massive Attack|Mezzanine|1998|Album|Angel~6:19; Risingson~4:58; Teardrop~5:29; Inertia Creeps~5:57; Dissolved Girl~6:07
Portishead|Dummy|1994|Album|Mysterons~5:02; Sour Times~4:11; Strangers~3:58; Roads~5:05; Glory Box~5:06
Aphex Twin|Selected Ambient Works 85-92|1992|Album|Xtal~4:51; Tha~9:01; Pulsewidth~3:47; Ageispolis~5:21; Heliosphan~4:51; Green Calx~6:05
Nils Frahm|All Melody|2018|Album|The Whole Universe Wants to Be Touched~3:05; Sunson~9:12; Momentum~6:15; My Friend the Forest~4:44; Kaleidoscope~5:52
Ólafur Arnalds|some kind of peace|2020|Album|Saudade (When We Are Born)~3:17; Woven Song~3:40; Spiral~3:45; We Contain Multitudes~3:58; Loom~4:32
Daft Punk|Random Access Memories|2013|Album|Give Life Back to Music~4:34; Instant Crush~5:37; Lose Yourself to Dance~5:53; Giorgio by Moroder~9:04; Get Lucky~6:09; Touch~8:18
The Weeknd|After Hours|2020|Album|Alone Again~4:10; Hardest to Love~3:31; Heartless~3:18; In Your Eyes~3:57; Blinding Lights~3:20; Save Your Tears~3:35
Arctic Monkeys|AM|2013|Album|Do I Wanna Know?~4:32; R U Mine?~3:21; One for the Road~3:26; Arabella~3:27; Fireside~3:01; Why'd You Only Call Me When You're High?~2:41; 505~4:13
Beach House|Depression Cherry|2015|Album|Levitation~5:46; Sparks~5:21; Space Song~5:20; Beyond Love~4:48; PPP~6:08
Japanese Breakfast|Jubilee|2021|Album|Paprika~3:15; Be Sweet~3:37; Kokomo, IN~3:17; Savage Good Boy~3:30; Posing in Bondage~4:15
Big Thief|Dragon New Mountain I Believe in You|2022|Album|Change~2:54; Time Escaping~3:39; Spud Infinity~4:23; Simulation Swarm~4:29; Certainty~3:35; Promise Is a Pendulum~2:42
Little Simz|Sometimes I Might Be Introvert|2021|Album|Introvert~5:34; Woman~4:12; I Love You, I Hate You~4:30; Point and Kill~4:02; Venom~3:17
Floating Points|Promises|2021|Album|Movement 1~6:00; Movement 4~4:56; Movement 6~10:11
Jamie xx|In Waves|2024|Album|Wanna~3:25; Treat Each Other Right~4:12; Baddy On the Floor~4:55; Life~4:07; Dafodil~4:17; Falling Together~4:01
Skryabin|Танець пінгвіна|2001|Album|Танець пінгвіна~3:48; Мовчати~4:09; Старі фотографії~4:21; Шмата~3:21
Okean Elzy|Без меж|2016|Album|Не твоя війна~4:33; Обійми~3:57; Без бою~4:23; Мить~3:51
ONUKA|Vidlik|2016|Album|Vidlik~3:45; Zenit~4:06; Strum~3:27; Svitanok~3:55; 19 86~4:11
DakhaBrakha|Alambari|2020|Album|Vesna~4:23; Monakh~4:56; Chumakuyu~4:12; Divka~3:44
Kino|Звезда по имени Солнце|1989|Album|Звезда по имени Солнце~3:45; Пачка сигарет~4:26; Невеселая песня~4:28; Сказка~4:32
Молчат Дома|Этажи|2018|Album|Судно (Борис Рыжий)~2:21; Клетка~3:33; Тоска~3:39; Танцевать~3:39; Discoteque~3:40
Kali Uchis|Orquídeas|2024|Album|Igual Que Un Ángel~4:20; Pensamientos Intrusivos~3:29; Te Mata~3:18; Labios Mordidos~3:13
Rosalía|MOTOMAMI|2022|Album|SAOKO~2:17; CANDY~3:13; LA FAMA~3:08; BIZCOCHITO~1:52; HENTAI~2:42; DESPECHÁ~2:37
Fleetwood Mac|Rumours|1977|Album|Second Hand News~2:43; Dreams~4:14; Never Going Back Again~2:02; Go Your Own Way~3:38; The Chain~4:30; Songbird~3:20
Nujabes|Modal Soul|2005|Album|Feather~2:55; Reflection Eternal~4:55; Luv(sic) Pt. 3~5:39; Modal Soul~4:40; Aruarian Dance~4:02
`;

const SOUNDCLOUD = `
mt. fujitive|bless this mess~2:48
Jinsang|affection~2:07
idealism|controlla~2:32
Saib.|West Lake~2:46
DJ Seinfeld|U~5:44
Mall Grab|Can't~4:26
Ross From Friends|Talk To Me You'll Understand~6:35
yung kartz|leave~2:12
Elijah Who|i'm fine, really~2:31
Tomppabeats|Monday Loop~1:45
sweatson klank|mood~2:20
Kerala Dust|Nevada~5:21
`;

function sha(s) { return crypto.createHash('sha1').update(s).digest(); }
const ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function ytId(seed) {
  const b = sha(seed);
  let out = '';
  for (let i = 0; i < 11; i++) out += ALPH[b[i] % 64];
  return out;
}
function slug(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || ('x' + sha(s).toString('hex').slice(0, 8));
}
function dur(s) { const [m, sec] = s.split(':').map(Number); return m * 60 + sec; }

const albums = [];
const tracks = [];
for (const line of RAW.trim().split('\n')) {
  const [artist, album, year, type, list] = line.split('|');
  const albumId = 'MPREb_' + ytId('album:' + artist + album).slice(0, 11);
  const cover = `/__art/album/${encodeURIComponent(slug(artist) + '--' + slug(album))}.svg`;
  const al = { id: albumId, title: album, artist, year, type, cover, tracks: [] };
  list.split(';').map(s => s.trim()).filter(Boolean).forEach((entry, i) => {
    const [title, d] = entry.split('~');
    const id = ytId('track:' + artist + title);
    const t = {
      id,
      title,
      artist,
      album,
      duration: dur(d),
      thumbnail: cover,
      url: `https://music.youtube.com/watch?v=${id}`,
      platform: 'ytmusic',
      albumId,
      year
    };
    al.tracks.push(t);
    tracks.push(t);
  });
  albums.push(al);
}
for (const line of SOUNDCLOUD.trim().split('\n')) {
  const [artist, rest] = line.split('|');
  const [title, d] = rest.split('~');
  const num = parseInt(sha('sc:' + artist + title).toString('hex').slice(0, 8), 16) % 900000000 + 100000000;
  tracks.push({
    id: 'sc_' + num,
    title,
    artist,
    duration: dur(d),
    thumbnail: `/__art/track/${encodeURIComponent(slug(artist) + '--' + slug(title))}.svg`,
    url: `https://soundcloud.com/${slug(artist)}/${slug(title)}`,
    platform: 'soundcloud'
  });
}

const TIER = { 'Billie Eilish': 62, 'The Weeknd': 98, 'Kendrick Lamar': 71, 'SZA': 58, 'Arctic Monkeys': 44, 'Tame Impala': 31, 'Daft Punk': 27,
  'Fleetwood Mac': 38, 'Radiohead': 24, 'Frank Ocean': 29, 'Charli xcx': 26, 'Rosalía': 33, 'Kali Uchis': 30, 'Fred again..': 17, 'Mitski': 19,
  'Bon Iver': 11, 'Phoebe Bridgers': 9.4, 'Beach House': 9.8, 'Massive Attack': 8.1, 'Portishead': 3.9, 'Jamie xx': 5.2, 'Bicep': 3.6,
  'Four Tet': 3.1, 'Burial': 2.2, 'Aphex Twin': 3.4, 'Nils Frahm': 2.6, 'Ólafur Arnalds': 3.3, 'Japanese Breakfast': 3.7, 'Big Thief': 2.4,
  'Little Simz': 3.0, 'Floating Points': 1.4, 'Nujabes': 4.1, 'Okean Elzy': 2.1, 'ONUKA': 0.62, 'DakhaBrakha': 0.48, 'Skryabin': 0.71,
  'Kino': 3.2, 'Молчат Дома': 4.4 };
const artistNames = [...new Set(tracks.map(t => t.artist))];
const artists = artistNames.map(name => {
  const n = parseInt(sha('fans:' + name).toString('hex').slice(0, 8), 16);
  const isSc = !albums.some(a => a.artist === name);
  return {
    name,
    avatar: `/__art/artist/${encodeURIComponent(slug(name))}.svg`,
    fans: isSc ? 8000 + (n % 220000) : Math.round((TIER[name] || 1.5) * 1e6 * (0.85 + (n % 300) / 1000)),
    channelId: 'UC' + ytId('chan:' + name) + ytId('chan2:' + name).slice(0, 11)
  };
});

function findTrack(artist, title) {
  return tracks.find(t => t.artist === artist && t.title === title);
}

module.exports = { albums, tracks, artists, findTrack, slug, ytId };
