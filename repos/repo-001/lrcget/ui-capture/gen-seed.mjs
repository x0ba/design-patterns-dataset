// Generates seed-data.js: the in-memory "SQLite" contents the backend stub serves.
// Fictional artists/albums with original lyrics (no copyrighted lyrics).
// Usage: node gen-seed.mjs > seed-data.js
let s = 20241117
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648), s / 2147483648)
const pick = a => a[Math.floor(rnd() * a.length)]
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1))

const HOME = '/home/linh/Music'
const NAS = '/mnt/nas/music/flac'

// [albumArtist, album, year, lang, kind, ext, root, titles]  kind: v=vocal i=instrumental
// A title may be "Title@@Track Artist" when the track artist differs from the album artist.
const ALBUMS = [
  ['The Lantern Years', 'Northbound Static', 2019, 'en', 'v', 'flac', NAS,
    'Northbound Static|Overpass Lights|Kerosene Summer|Holding Pattern|Rearview, Rearview|Telegraph Hill|All the Clocks in Ohio|Fault Lines|Small Hours|Leaving Is a Lullaby'],
  ['The Lantern Years', 'Paper Harbors', 2022, 'en', 'v', 'flac', NAS,
    'Paper Harbors|Saltwater Arithmetic|The Ferryman’s Daughter|Weathervane|Static on the Line (feat. Odile Marchand)@@The Lantern Years feat. Odile Marchand|Low Ceilings|Everything Is a Coastline|Driftwood Hymn|Harbor Lights (Reprise)'],
  ['Marisol Vega', 'Casa de Sal', 2021, 'es', 'v', 'flac', NAS,
    'Casa de Sal|Luna de Agosto|Las Calles de Mi Madre|Cartas Sin Remitente|Mar Adentro|Domingo Lento|Fuego Pequeño|Volver a Empezar|Canción para Inés|Sal y Limón|Hasta Mañana'],
  ['Odile & the Night Ferry', 'Low Tide Radio', 2018, 'en', 'v', 'mp3', HOME,
    'Low Tide Radio|Glasshouse|Velvet Undertow|Sleepwalk Through Brighton|Antenna Heart|Moth Season|Underwater Choir|Quiet Engines|Pier at 3 A.M.|Lighthouse Keeper'],
  ['Kestrel Park', 'Neon Orchard', 2020, 'en', 'v', 'flac', NAS,
    'Neon Orchard|Signal to Noise|Heartbeat Protocol|Polaroid Rain|Cherry Arcade|Satellite Girls|Overclocked|Midnight Transit|Afterglow District|Loading Screen Love|Fade to Daylight|Neon Orchard (Extended Mix)'],
  ['Kestrel Park', 'Afterimage EP', 2023, 'en', 'v', 'flac', NAS,
    'Afterimage|Ghost in the Playlist|Ribbon|Afterimage (Lumen Drift Remix)@@Kestrel Park & Lumen Drift'],
  ['Hollis Grey', 'Cedar & Smoke', 2016, 'en', 'v', 'mp3', HOME,
    'Cedar & Smoke|Wintering|The Well at Allerton|Mother’s Hands|Wildfire Season|Grain Elevator|A Song for Ruthie|Porchlight|Snowmelt|Old Roads Home'],
  ['Hollis Grey', 'The Long Driveway', 2024, 'en', 'v', 'flac', NAS,
    'The Long Driveway|Coyote Moon|Kitchen Table|Thirty-Nine|Salt the Steps|Where the Creek Bends|Borrowed Coat|Last Light on Route 9|Quiet Now'],
  ['天野ゆき', '夜明けのプリズム', 2022, 'ja', 'v', 'flac', NAS,
    '夜明けのプリズム|星降る交差点|サイダーの夏|ガラスの約束|ひとりぼっちの惑星|放課後メロディ|雨上がりのワルツ|さよならトレイン|ミッドナイト・ブルー|君の名前を呼ぶ'],
  ['Trần Minh Châu', 'Mùa Hạ Cuối', 2020, 'vi', 'v', 'mp3', HOME,
    'Mùa Hạ Cuối|Phố Cũ|Chiều Sài Gòn|Hà Nội Mưa Phùn|Gửi Em Một Ngày|Ngày Mai Trời Lại Sáng|Biển Nhớ|Ga Cuối|Đêm Không Ngủ'],
  ['Bellwether Choir', 'Hymns for the Commute', 2017, 'en', 'v', 'mp3', HOME,
    'Morning Bus|Hymn for the Northern Line|Umbrella Saints|Thermos|Platform 4|Exit Through the Garden|Rain on the Skylight|Hymn for the Commute|Home by Seven'],
  ['Quiet Arcade', 'Signal Fires', 2019, 'en', 'i', 'flac', NAS,
    'First Signal|Beacons Over Kettle Ridge|The Long Exposure|Shoreline Weather|Fires on the Hillside|Quiet Arcade|Ember Theory|Last Transmission'],
  ['Dr. Velvet & The Cassettes', 'Mirrorball Economics', 2015, 'en', 'v', 'mp3', HOME,
    'Mirrorball Economics|Get Down at the Credit Union|Velvet Rope|Cassette Love|Saturday Overtime|Disco Accountant|Funky Inventory|Slow Jam for the Night Shift|Groove Recession|Bring It Back Home'],
  ['Sorrel', 'Soft Machinery', 2023, 'en', 'v', 'flac', NAS,
    'Soft Machinery|Silk Static|Honey, Don’t Call|Overthinker|Fluorescent|Window Seat|Bloom Slowly|Afterparty Blues|Gold Teeth|Lullaby for Insomniacs|Soft Machinery (Interlude)'],
  ['Iron Meridian', 'Cathedral of Rust', 2014, 'en', 'v', 'mp3', HOME,
    'Cathedral of Rust|Hammerfall Requiem|Black Iron Sky|Forge of the Nameless|Through the Ash Gate|Wolves of the Meridian|Burning Canticle|Pale Horizon|Ruin Eternal'],
  ['The Nilsson Brothers Trio', 'Late Set at the Blue Door', 2012, 'en', 'i', 'flac', NAS,
    'Blue Door Blues|Autumn in Malmö|Walking Bass for Sofia|Smoke Rings|After Hours Waltz|Third Cup of Coffee|Ballad for Nils|Closing Time Stomp'],
  ['Clara Weiss', 'Chopin: Nocturnes', 2018, 'en', 'i', 'flac', NAS,
    'Nocturne in B-flat Minor, Op. 9 No. 1|Nocturne in E-flat Major, Op. 9 No. 2|Nocturne in B Major, Op. 9 No. 3|Nocturne in F Major, Op. 15 No. 1|Nocturne in F-sharp Major, Op. 15 No. 2|Nocturne in G Minor, Op. 15 No. 3|Nocturne in C-sharp Minor, Op. 27 No. 1|Nocturne in D-flat Major, Op. 27 No. 2|Nocturne in C Minor, Op. 48 No. 1|Nocturne in E Minor, Op. posth. 72 No. 1'],
  ['Static Bloom', 'Fathom', 2021, 'en', 'v', 'flac', NAS,
    'Fathom|Sugar Fuzz|Wavelength Girl|Drown in Reverb|Paper Moon Motel|Swim Out|Hazy Shade|Kaleidoscope Ache|Fathom II'],
  ['Juniper Coast', 'Gravel Roads & Gold Lines', 2019, 'en', 'v', 'mp3', HOME,
    'Gravel Roads|Tailgate Prayer|Gold Lines on the Highway|Mama’s Pickup|Dust on the Dashboard|Two-Step in the Kitchen|Honky-Tonk Heartbreak|County Fair|Sunday Best|Ain’t Leaving Tennessee'],
  ['MC Tidewater', 'Port City Almanac', 2022, 'en', 'v', 'flac', NAS,
    'Intro (Foghorn)|Port City Almanac|Shipping Containers|Low Tide Hustle (feat. Sorrel)@@MC Tidewater feat. Sorrel|Corner Store Philosophy|Ferry Fare|Night Market|Lighthouse Freestyle|Skit: Grandma’s Voicemail|Harbor Kids|Outro (Home Port)'],
  ['Lumen Drift', 'Field Recordings Vol. 2', 2020, 'en', 'i', 'flac', NAS,
    'Morning Fog Over Lake Inari|Cicadas, Kyoto|Train Yard at Dusk|Tidepools|Snowfall Study|Night Bus Hum|Moss|Field Recording #14'],
  ['Petra Lind', 'Glass Hours', 2019, 'en', 'v', 'flac', NAS,
    'Glass Hours|Electric Sleep|Mirror, Mirror (Don’t Lie)|Northern Lights Hotel|Cold Coffee|Dancing Alone in Stockholm|Fragile|Prism Heart|Stay Till Sunrise'],
  ['The Wednesday Club', 'Small Town Satellites (2019 Remaster)', 2009, 'en', 'v', 'mp3', HOME,
    'Small Town Satellites - 2019 Remaster|Bus Shelter Romance - 2019 Remaster|The Chip Shop Song - 2019 Remaster|Rainy Day Parade - 2019 Remaster|Pint of Bitter, Heart of Gold - 2019 Remaster|Saturday Kids - 2019 Remaster|Council Estate Stars - 2019 Remaster|Goodbye, Grey Skies - 2019 Remaster|Small Town Satellites - Demo'],
  ['Hollow Pines', 'Everything We Left in the Van', 2016, 'en', 'v', 'mp3', HOME,
    'Everything We Left in the Van|I Still Have Your Hoodie|Basement Shows|Pizza at 4 A.M.|Your Mom Liked Me Better|Graduation Was a Lie|The Ceiling Fan Song|We Were Never Cool|Drive Safe'],
  ['Golden Hour Social', 'Sunday Service Sessions (Live)', 2021, 'en', 'v', 'flac', NAS,
    'Intro (Live)|Lift Me Higher (Live)|Sweet Release (Live)|Honey Bee (Live)|Hallelujah Saturday (Live)|Band Introductions (Live)|Carry On, Carry Me (Live)|Golden Hour (Live)'],
  ['Various Artists', 'Late Night Drive: Indie Selections', 2023, 'en', 'v', 'mp3', HOME,
    'Overpass Lights@@The Lantern Years|Moth Season@@Odile & the Night Ferry|Midnight Transit@@Kestrel Park|Window Seat@@Sorrel|Swim Out@@Static Bloom|Electric Sleep@@Petra Lind|Night Bus@@Fen & Harlow|Headlights in the Rain@@Fen & Harlow|Paper Cranes@@Mio Sato|Glow Sticks@@The Parkas'],
  ['Fen & Harlow', 'Kitchen Sessions', 2024, 'en', 'v', 'flac', NAS,
    'Kettle On|Night Bus|Postcards|Headlights in the Rain|Laundry Day|Two Spoons|The Landlord Song|Windowsill Basil'],
  ['Ezra Kohl', 'bedroom tapes', 2021, 'en', 'v', 'mp3', HOME,
    'cereal at midnight|blue hoodie|demo_final_v3|im fine (really)|sunday scaries|voicemail from 2017|lamp|outro?'],
  ['Unknown Artist', 'Unknown Album', null, 'en', 'v', 'mp3', HOME,
    'Track 01|Track 02|Track 03|Track 07|AUD-20190612-WA0003'],
]

// ---------- original lyric line banks ----------
const EN = [
  'I left the porch light on for you', 'The radio is humming something old', 'We were young and running out of road',
  'Every window in this town is gold tonight', 'You said the river never keeps a secret', 'I folded up the map and let it go',
  'Count the headlights till the morning comes', 'There is static where your voice should be', 'Hold on, hold on, the tide is turning',
  'All the streetlights hum the same old song', 'I keep your letters in a coffee tin', 'We could drive until the gas runs out',
  'Somewhere a train is calling out my name', 'Paint the ceiling with the stars we stole', 'I was a stranger in my own hometown',
  'Lay your head down on the passenger side', 'The kettle sings, the city sleeps', 'Nobody told us it would feel like this',
  'Summer burned a hole into the sky', 'I am learning how to let the silence stay', 'Meet me where the highway meets the sea',
  'Your laugh is the loudest thing I know', 'Every heartbeat is a borrowed sound', 'We built a castle out of cardboard boxes',
  'And oh, the night is wide open', 'Turn it up, turn it up, let it shake the walls', 'I would cross the water just to see you wave',
  'There is dust on every photograph', 'Slow down, slow down, we have time', 'Still I hear the echo of the door',
  'Neon bleeding through the windowpane', 'I found your sweater in the back seat', 'We were satellites without a home',
  'Under the bridge where the pigeons sleep', 'The morning came and took its time', 'Tell me that you meant it when you said it',
  'Gold light falling on the kitchen floor', 'Maybe we are only passing through', 'Hearts like engines in the cold',
  'I keep dreaming of a quiet place', 'Run, run, run till the sun comes up', 'Every road leads back to you',
  'The ceiling fan keeps turning round and round', 'You and me against the weather', 'I wrote your name on a foggy mirror',
  'Light a fire, keep it burning', 'Let the rain come down', 'We are only shadows on the shore',
]
const ES = [
  'La luna se quedó dormida en tu ventana', 'Camino descalza por la orilla del mar', 'Mi madre canta mientras cae la tarde',
  'No hay carta que no sepa a despedida', 'Volveré cuando el verano se despida', 'Tengo sal en los labios y en el alma',
  'Bailamos lento en la cocina', 'El fuego pequeño no se apaga nunca', 'Las calles guardan todos tus pasos',
  'Ay, corazón, no me dejes sola', 'Mar adentro se me pierde la voz', 'Domingo lento, café y canciones',
  'Te escribo aunque no sepa dónde estás', 'Y vuelve, vuelve, vuelve a empezar', 'La casa huele a limón y a recuerdo',
  'Cierra los ojos, ya llega la marea', 'Somos dos barcos en la misma noche', 'Hasta mañana, mi amor, hasta mañana',
]
const JA = [
  '夜明けの空に光が溶けてく', '君の声がまだ聞こえる', '星降る街を歩いていこう', 'サイダーの泡みたいな夏',
  'ガラスの約束 壊さないで', 'ひとりぼっちでも大丈夫', '放課後のチャイムが鳴る', '雨上がりの道で踊ろう',
  'さよならは言わないよ', '君の名前を呼んでみた', 'ミッドナイト 青く染まる', '手を伸ばせば届きそうで',
  '忘れないで この瞬間を', '風が運ぶ小さな歌', 'もう一度だけ笑って',
]
const VI = [
  'Mùa hạ cuối cùng ta có nhau', 'Phố cũ vẫn còn đây em ơi', 'Chiều Sài Gòn nắng nhạt bên hiên',
  'Hà Nội mưa phùn bay trên tóc em', 'Gửi em một ngày bình yên', 'Ngày mai trời lại sáng thôi',
  'Biển nhớ ai mà sóng vỗ hoài', 'Ga cuối chuyến tàu đã đi xa', 'Đêm không ngủ ngồi đếm sao trời',
  'Anh vẫn chờ em nơi góc phố quen', 'Thời gian trôi như dòng sông', 'Ta hát cho nhau nghe một lần',
]
const BANKS = { en: EN, es: ES, ja: JA, vi: VI }

const q = str => `'${String(str).replace(/'/g, "''")}'`
const tokenize = (text, lang) =>
  lang === 'ja' ? text.match(/.{1,3}/gu) || [text] : text.match(/\S+\s*/g) || [text]

function makeSong(lang, duration) {
  const bank = BANKS[lang]
  const pool = [...bank].sort(() => rnd() - 0.5)
  let cursor = 0
  const take = n => Array.from({ length: n }, () => pool[cursor++ % pool.length])
  const chorus = take(int(2, 4))
  const sections = [
    ['Verse 1', take(4)], ['Chorus', chorus], ['Verse 2', take(4)], ['Chorus', chorus],
  ]
  if (duration > 200 && rnd() < 0.6) sections.push(['Bridge', take(2)])
  sections.push(['Chorus', chorus])
  if (rnd() < 0.3) sections.push(['Outro', [chorus[0]]])
  return sections
}

function buildLyricsfile({ title, artist, album, durationS, lang, mode }) {
  const durMs = Math.round(durationS * 1000)
  const head = [
    "version: '1.0'",
    'metadata:',
    `  title: ${q(title)}`,
    `  artist: ${q(artist)}`,
    `  album: ${q(album)}`,
    `  duration_ms: ${durMs}`,
    '  offset_ms: 0',
    `  language: ${lang}`,
    `  instrumental: ${mode === 'instrumental'}`,
  ]
  if (mode === 'instrumental') {
    return { yaml: [...head, 'lines: []', "plain: ''"].join('\n'), synced: '', plain: '' }
  }
  const sections = makeSong(lang, durationS)
  const plainLines = []
  sections.forEach(([name, lines], i) => {
    if (i) plainLines.push('')
    if (rnd() < 0.35) plainLines.push(`[${name}]`)
    plainLines.push(...lines)
  })
  const plain = plainLines.join('\n')
  const out = [...head]
  let lrc = ''
  if (mode === 'plain') {
    out.push('lines: []')
  } else {
    const all = sections.flatMap(([, l]) => l)
    const start = int(8, 24) * 1000 + int(0, 99) * 10
    const end = durMs - int(6, 20) * 1000
    const step = (end - start) / all.length
    out.push('lines:')
    const lrcRows = []
    all.forEach((text, i) => {
      const st = Math.round(start + i * step + (rnd() - 0.5) * step * 0.3)
      const en = Math.round(start + (i + 1) * step - 200)
      out.push(`  - text: ${q(text)}`, `    start_ms: ${st}`, `    end_ms: ${en}`)
      if (mode === 'word') {
        const words = tokenize(text, lang)
        const wstep = (en - st) / words.length
        out.push('    words:')
        words.forEach((w, j) => {
          out.push(
            `      - text: ${q(w)}`,
            `        start_ms: ${Math.round(st + j * wstep)}`,
            `        end_ms: ${Math.round(st + (j + 1) * wstep)}`
          )
        })
      }
      const m = Math.floor(st / 60000), sec = Math.floor((st % 60000) / 1000), cs = Math.floor((st % 1000) / 10)
      lrcRows.push(`[${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}] ${text}`)
    })
    lrc = lrcRows.join('\n')
  }
  out.push('plain: |-', ...plain.split('\n').map(l => (l ? `  ${l}` : '')))
  return { yaml: out.join('\n'), synced: lrc, plain }
}

// ---------- build tables ----------
const artists = []
const artistIds = new Map()
const artistId = name => {
  if (!artistIds.has(name)) {
    artistIds.set(name, artists.length + 1)
    artists.push({ id: artists.length + 1, name })
  }
  return artistIds.get(name)
}
const albums = []
const tracks = []
const lyricsfiles = []
const lrclib = []
let lrclibId = 4120000 + int(0, 9999)
const nextLrclibId = () => (lrclibId += int(3, 900))
const safe = x => x.replace(/[/:?]/g, '_')

ALBUMS.forEach(([albumArtist, albumName, year, lang, kind, ext, root, titleStr], ai) => {
  const albumId = ai + 1
  const isCompilation = albumArtist === 'Various Artists'
  albums.push({ id: albumId, name: albumName, album_artist_name: isCompilation || albumArtist !== 'Unknown Artist' ? albumArtist : null })
  titleStr.split('|').forEach((raw, ti) => {
    const [title, trackArtist] = raw.split('@@')
    const artist = trackArtist || albumArtist
    const isInterlude = /Intro|Outro|Skit|Interlude|Band Introductions/.test(title)
    const duration =
      kind === 'i' ? int(150, 420) + rnd() :
      isInterlude ? int(38, 95) + rnd() :
      /Extended|Remix/.test(title) ? int(300, 420) + rnd() : /Iron Meridian|Golden Hour/.test(albumArtist) ? int(240, 410) + rnd() : int(146, 285) + rnd()
    const trackNo = albumArtist === 'Unknown Artist' && ti > 2 ? null : ti + 1
    const dir = isCompilation ? `${root}/Compilations/${safe(albumName)}` : `${root}/${safe(albumArtist)}/${year ? `${year} - ` : ''}${safe(albumName)}`
    const fname = trackNo ? `${String(trackNo).padStart(2, '0')} - ${safe(title)}.${ext}` : `${safe(title)}.${ext}`
    const id = tracks.length + 1
    tracks.push({
      id,
      file_path: `${dir}/${fname}`,
      title,
      album_id: albumId,
      artist_id: artistId(artist),
      track_number: trackNo,
      duration: Math.round(duration * 1000) / 1000,
    })

    // Lyrics status for an established library: most synced, some word-synced, some plain,
    // instrumental albums marked, and a tail still missing lyrics.
    let mode
    const r = rnd()
    if (kind === 'i') mode = r < 0.8 ? 'instrumental' : null
    else if (albumArtist === 'Unknown Artist') mode = r < 0.2 ? 'plain' : null
    else if (/Skit|Band Introductions|Intro \(Live\)/.test(title)) mode = r < 0.5 ? 'instrumental' : null
    else if (r < 0.1) mode = 'word'
    else if (r < 0.66) mode = 'synced'
    else if (r < 0.8) mode = 'plain'
    else mode = null

    const lfMeta = { title, artist, album: albumName, durationS: duration, lang }
    // LRCLIB catalogue: the matching entry (for Download / Search) plus variant submissions
    const remoteMode =
      mode ?? (kind === 'i' ? 'instrumental' : rnd() < 0.6 ? (rnd() < 0.8 ? 'synced' : 'plain') : null)
    if (remoteMode) {
      const lf = buildLyricsfile({ ...lfMeta, mode: remoteMode })
      const remote = {
        id: nextLrclibId(), trackName: title, artistName: artist, albumName: albumName,
        duration: Math.round(duration), instrumental: remoteMode === 'instrumental',
        hasWordSync: remoteMode === 'word', plainLyrics: lf.plain || null, syncedLyrics: lf.synced || null,
        lyricsfile: lf.yaml, lang,
      }
      lrclib.push(remote)
      if (mode) {
        lyricsfiles.push({ id: lyricsfiles.length + 1, track_id: id, lrclib_id: rnd() < 0.3 ? remote.id : null, lyricsfile: lf.yaml })
      }
      // extra submissions: single version, live cut, or a plain-only duplicate
      const extras = int(0, 3)
      const variants = ['single', 'live', 'plain', 'radio'].sort(() => rnd() - 0.5)
      for (let k = 0; k < extras; k++) {
        const variant = variants[k]
        const d = variant === 'live' ? duration + int(15, 60) : variant === 'radio' ? duration - int(20, 45) : duration + int(-1, 1)
        const vm = variant === 'plain' ? 'plain' : remoteMode === 'instrumental' ? 'instrumental' : rnd() < 0.15 ? 'word' : 'synced'
        const vlf = buildLyricsfile({ ...lfMeta, durationS: d, mode: vm })
        lrclib.push({
          id: nextLrclibId(),
          trackName: variant === 'live' ? `${title} (Live)` : variant === 'radio' ? `${title} (Radio Edit)` : title,
          artistName: artist,
          albumName: variant === 'single' ? `${title} - Single` : variant === 'live' ? `Live at the Roundhouse` : albumName,
          duration: Math.round(d), instrumental: vm === 'instrumental', hasWordSync: vm === 'word',
          plainLyrics: vlf.plain || null, syncedLyrics: vlf.synced || null, lyricsfile: vlf.yaml, lang,
        })
      }
    }
  })
})

const seed = {
  appVersion: '2.2.2',
  init: true,
  directories: [HOME, NAS],
  config: {
    auto_export_enabled: false,
    export_lrc: true,
    export_txt: false,
    export_embedded: false,
    skip_tracks_with_synced_lyrics: true,
    skip_tracks_with_plain_lyrics: false,
    show_line_count: true,
    try_embed_lyrics: false,
    theme_mode: 'auto',
    lrclib_instance: 'https://lrclib.net',
    volume: 0.72,
  },
  artists,
  albums,
  tracks,
  lyricsfiles,
  lrclib,
}
process.stdout.write(`window.__LRCGET_SEED__ = ${JSON.stringify(seed)};\n`)
process.stderr.write(
  `artists=${artists.length} albums=${albums.length} tracks=${tracks.length} lyricsfiles=${lyricsfiles.length} lrclib=${lrclib.length}\n`
)
