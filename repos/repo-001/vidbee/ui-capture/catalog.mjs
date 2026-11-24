// Shared, deterministic catalog of channels and videos used by the seed script,
// the yt-dlp stub and the network stub. Everything is generated from a fixed
// PRNG seed so ids stay stable across runs.

const mulberry32 = (a) => () => {
  a |= 0
  a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const makeRng = (seed) => {
  const r = mulberry32(seed)
  return {
    next: r,
    int: (min, max) => Math.floor(r() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    id: (len, alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_') => {
      let s = ''
      for (let i = 0; i < len; i++) s += alphabet[Math.floor(r() * alphabet.length)]
      return s
    }
  }
}

// platform: youtube | bilibili | vimeo | soundcloud | x | tiktok | twitch | podcast
export const CHANNELS = [
  {
    key: 'bytesized', name: 'Byte Sized Systems', platform: 'youtube', handle: '@bytesizedsystems',
    colors: ['#0f172a', '#2563eb'], tags: ['programming', 'tech'], subscribed: true,
    videos: [
      ['Postgres Indexes Explained Like You\'re Debugging Production at 2am', 1384],
      ['I Rewrote Our Job Queue in Rust — Here\'s What Actually Got Faster', 1921],
      ['SQLite Is Not a Toy Database (WAL mode, deep dive)', 1102],
      ['Why Your Docker Images Are 2GB (and how to fix it)', 842],
      ['Event Sourcing in 15 Minutes', 903],
      ['The Hidden Cost of ORMs', 1266],
      ['Consistent Hashing, Visually', 734],
      ['Building a Rate Limiter From Scratch', 1530],
      ['TypeScript 6 Features I Use Every Day', 1015],
      ['Async Rust Without Tears', 2210],
      ['How CDNs Actually Cache Your Assets', 987],
      ['Distributed Locks Are Harder Than You Think', 1450],
      ['Kafka vs. Postgres LISTEN/NOTIFY for Small Teams', 1320],
      ['Reading a Flame Graph, Step by Step', 1180],
      ['The Linux Page Cache Is Lying to You', 1490],
      ["I Benchmarked 6 JSON Parsers So You Don't Have To", 870],
      ['Zero-Downtime Migrations in Practice', 1640],
      ['What Happens When You Type a URL (2026 edition)', 2050],
      ['Load Balancers: L4 vs L7 Explained', 1010],
      ['A Gentle Intro to eBPF', 1755],
      ['Git Internals: Objects, Trees and Packfiles', 1385]
    ]
  },
  {
    key: 'kitchenlab', name: 'Kitchen Lab with Mara Okafor', platform: 'youtube', handle: '@kitchenlabmara',
    colors: ['#7c2d12', '#f59e0b'], tags: ['cooking'], subscribed: true,
    videos: [
      ['Perfect Sourdough Without a Dutch Oven', 1145],
      ['Jollof Rice Three Ways: Party, Smoky, and Weeknight', 1322],
      ['The Only Knife Skills Video You Need', 958],
      ['Braised Short Ribs (make-ahead holiday version)', 1404],
      ['Fermented Hot Sauce: 6 Week Update', 641],
      ['Why Restaurant Fries Taste Better', 780],
      ['Meal Prep for a Week Under $40', 1260],
      ['Homemade Fresh Pasta — No Machine Needed', 1033],
      ['Testing Viral Kitchen Gadgets So You Don\'t Have To', 1512],
      ['Crispy Chili Oil Noodles in 10 Minutes', 612],
      ['Thanksgiving Turkey, Dry-Brined (Full Timeline)', 1840],
      ['Ghanaian Kelewele + Spicy Peanut Sauce', 745],
      ['Cast Iron Care Myths, Busted', 890],
      ['Croissants: A 3-Day Project', 2120],
      ['5 Sauces Every Home Cook Should Know', 1330]
    ]
  },
  {
    key: 'longclimb', name: 'The Long Climb Podcast', platform: 'youtube', handle: '@thelongclimbpod',
    colors: ['#14532d', '#84cc16'], tags: ['podcast', 'interviews'], subscribed: true, audio: true,
    videos: [
      ['Ep. 112 — Dr. Priya Raman on Altitude, Sleep and Recovery', 6420],
      ['Ep. 113 — Building a Bootstrapped Company to $10M ARR', 5810],
      ['Ep. 114 — Inside the Search and Rescue Team of the Dolomites', 7210],
      ['Ep. 115 — What Ultramarathons Teach About Pain', 5345],
      ['Ep. 116 — Jonah Whitfield: Leaving Big Tech to Build Cabins', 6980],
      ['Ep. 117 — The Science of Habit Formation (with Dr. Lena Kroll)', 6120],
      ['Ep. 118 — Live Q&A: Your Questions on Burnout', 4890],
      ['Ep. 119 — Climbing K2 in Winter: A First-Hand Account', 7740],
      ['Ep. 120 — Money, Meaning, and the Second Career', 6050],
      ['Ep. 121 — Rewilding Scotland with Fiona MacLeod', 6640],
      ['Ep. 122 — Night Shift: Life as an ER Nurse', 5980],
      ['Ep. 123 — The Psychology of Risk on Big Walls', 7020],
      ['Ep. 124 — Bonus: Listener Stories from the Camino', 3890]
    ]
  },
  {
    key: 'orbital', name: 'Orbital Mechanics Explained', platform: 'youtube', handle: '@orbitalexplained',
    colors: ['#020617', '#7c3aed'], tags: ['science', 'space'], subscribed: true,
    videos: [
      ['How Gravity Assists Really Work', 1260],
      ['Why Starship Needs Orbital Refueling', 1488],
      ['Lagrange Points in 12 Minutes', 732],
      ['The Rocket Equation Is a Tyrant', 1094],
      ['What Happens If You Fall Into Jupiter?', 1320],
      ['Mapping the Ocean Under Europa\'s Ice', 1655],
      ['The Most Precise Clock Ever Built', 980],
      ['Artemis III Landing Sites, Ranked', 1402],
      ["Why We Haven't Gone Back to Venus", 1510],
      ["The James Webb Telescope's Weirdest Discoveries So Far", 1780],
      ['Solar Sails Explained', 860]
    ]
  },
  {
    key: 'lofiharbor', name: 'Lofi Harbor', platform: 'youtube', handle: '@lofiharbor',
    colors: ['#1e1b4b', '#ec4899'], tags: ['music'], subscribed: false, audio: true,
    videos: [
      ['rainy harbor nights 🌧 lofi beats to study / relax', 3720],
      ['late train home — chillhop mix', 3540],
      ['autumn library 📚 jazzhop for reading', 4210],
      ['coffee shop at dawn — 1 hour lofi', 3600],
      ['snowfall in the city ❄ lofi mix', 3905]
    ]
  },
  {
    key: 'tokyowalks', name: 'Tokyo Street Walks 4K', platform: 'youtube', handle: '@tokyostreetwalks',
    colors: ['#831843', '#f43f5e'], tags: ['travel', 'ambient'], subscribed: true,
    videos: [
      ['Shimokitazawa Evening Walk — Rain Sounds 4K HDR', 3812],
      ['Shinjuku Golden Gai After Midnight', 2954],
      ['Kyoto Gion in the Early Morning (No Talking)', 3320],
      ['Nakameguro Cherry Blossoms at Night 2026', 2710],
      ['Akihabara Saturday Walk 4K 60fps', 3105],
      ['Yanaka Ginza Old Tokyo Neighborhood', 2480],
      ['Osaka Dotonbori Night Walk in the Rain', 3250],
      ['Kamakura Hydrangea Season Walk', 2840]
    ]
  },
  {
    key: 'woodshop', name: 'Practical Woodshop', platform: 'youtube', handle: '@practicalwoodshop',
    colors: ['#451a03', '#b45309'], tags: ['diy', 'woodworking'], subscribed: true,
    videos: [
      ['Building a Walnut Desk With Hand Tools Only', 2540],
      ['Sharpening Chisels: Every Method Tested', 1420],
      ['My Dust Collection Mistakes (and fixes)', 1110],
      ['Shop Tour 2026 — Small Garage Workshop', 1720],
      ['Dovetails for Beginners, Slowed Down', 1985],
      ['Restoring a 1950s Stanley No. 5 Plane', 1340],
      ['Japanese Pull Saw vs Western Saw', 980],
      ['Finishing With Hardwax Oil — 1 Year Later', 1205],
      ['Building a Workbench in a Weekend', 2610]
    ]
  },
  {
    key: 'chenwei', name: '陈伟的数码笔记', platform: 'bilibili', uid: '412893056',
    colors: ['#0c4a6e', '#38bdf8'], tags: ['数码', 'tech'], subscribed: true,
    videos: [
      ['【深度评测】M5 MacBook Pro 一个月使用体验', 1420],
      ['2026 年最值得买的五款降噪耳机', 980],
      ['NAS 从零搭建：群晖 vs 自组装', 1860],
      ['我为什么放弃了机械键盘', 720],
      ['折叠屏手机两年后还值得买吗？', 1105],
      ['家用软路由完全指南（OpenWrt）', 2240],
      ['拆解一台 300 元的投影仪', 860],
      ['iPhone 18 Pro 上手：这次升级值不值', 1240],
      ['我的桌面改造 2026（全部清单）', 930],
      ['国产显卡跑大模型实测', 1580],
      ['十年老笔记本还能干什么？', 1020]
    ]
  },
  {
    key: 'deepdivefm', name: 'Deep Dive FM', platform: 'soundcloud', slug: 'deepdivefm',
    colors: ['#18181b', '#f97316'], tags: ['podcast'], subscribed: false, audio: true,
    videos: [
      ['The Collapse of Silicon Valley Bank, Two Years Later', 3260],
      ['How Shipping Containers Changed the World', 2880],
      ['The Strange Economics of Concert Tickets', 3015],
      ['Inside the Global Coffee Supply Chain', 3440],
      ['Why Airline Seats Keep Shrinking', 2980],
      ['The Secret Life of Undersea Cables', 3360]
    ]
  },
  {
    key: 'mkrdesign', name: 'MKR Design Talks', platform: 'vimeo', slug: 'mkrdesign',
    colors: ['#164e63', '#22d3ee'], tags: ['design'], subscribed: false,
    videos: [
      ['Config 2026 Keynote Recap — Design Systems at Scale', 2710],
      ['Type Is Interface: A Talk on Editorial Typography', 1920],
      ['Motion Design Principles for Product Teams', 1560],
      ['Accessible Color Systems in Practice', 1840],
      ['Designing for Dark Mode Without Losing Your Mind', 1470],
      ['Prototyping With Real Data', 1690]
    ]
  },
  {
    key: 'speedrunsage', name: 'speedrun_sage', platform: 'twitch', slug: 'speedrun_sage',
    colors: ['#3b0764', '#a855f7'], tags: ['gaming'], subscribed: false,
    videos: [
      ['Any% World Record Attempts — Day 3 (VOD)', 14820],
      ['Charity Marathon Segment: Hollow Depths 100%', 9960],
      ['Route Planning Stream w/ chat', 11240],
      ['GDQ Practice — Glitchless Category', 8420]
    ]
  },
  {
    key: 'nasaclips', name: 'Mission Control Clips', platform: 'x', slug: 'missionctrlclips',
    colors: ['#0a0a0a', '#64748b'], tags: ['space'], subscribed: false,
    videos: [
      ['Booster catch from the tower cam — full angle', 94],
      ['Crew Dragon undocking timelapse', 61],
      ['Webb deep field zoom, narrated', 128],
      ['Starship flight 12 hot staging, slow motion', 77],
      ['ISS pass over the Alps from the cupola', 143]
    ]
  },
  {
    key: 'foodtok', name: 'Noodle Notes', platform: 'tiktok', slug: '@noodlenotes',
    colors: ['#000000', '#14b8a6'], tags: ['cooking'], subscribed: false,
    videos: [
      ['15 second chili oil that changed my life', 42],
      ['hand-pulled biang biang noodles at home', 58],
      ['the dumpling fold my grandma taught me', 37],
      ['smashed cucumber salad but make it crunchy', 44],
      ['why your fried rice is mushy', 52]
    ]
  },
  {
    key: 'archtalks', name: 'Urbanism Now', platform: 'youtube', handle: '@urbanismnow',
    colors: ['#1c1917', '#a3e635'], tags: ['cities', 'documentary'], subscribed: true, failing: true,
    videos: [
      ['Why Every New Apartment Looks the Same', 1540],
      ['The Rise and Fall of the American Mall', 2102],
      ['How Barcelona Took Back Its Streets', 1385],
      ['Stroads: The Worst Road Design', 1210],
      ["Tokyo's Train Network Is Absurdly Good", 1755],
      ['The Suburb That Banned Cul-de-sacs', 1302]
    ]
  }
]

const rng = makeRng(20260317)

const ytId = () => rng.id(11)
const ucId = () => `UC${rng.id(22)}`

for (const ch of CHANNELS) {
  if (ch.platform === 'youtube') {
    ch.channelId = ucId()
    ch.sourceUrl = `https://www.youtube.com/channel/${ch.channelId}`
    ch.feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`
    ch.coverUrl = `https://yt3.googleusercontent.com/${rng.id(40)}=s176-c-k-c0x00ffffff-no-rj`
  } else if (ch.platform === 'bilibili') {
    ch.sourceUrl = `https://space.bilibili.com/${ch.uid}`
    ch.feedUrl = `https://rsshub.app/bilibili/user/video/${ch.uid}`
    ch.coverUrl = `https://i0.hdslb.com/bfs/face/${rng.id(40, '0123456789abcdef')}.jpg`
  } else if (ch.platform === 'soundcloud') {
    ch.sourceUrl = `https://soundcloud.com/${ch.slug}`
  } else if (ch.platform === 'vimeo') {
    ch.sourceUrl = `https://vimeo.com/${ch.slug}`
  } else if (ch.platform === 'twitch') {
    ch.sourceUrl = `https://www.twitch.tv/${ch.slug}`
  } else if (ch.platform === 'x') {
    ch.sourceUrl = `https://x.com/${ch.slug}`
  } else if (ch.platform === 'tiktok') {
    ch.sourceUrl = `https://www.tiktok.com/${ch.slug}`
  }

  ch.items = ch.videos.map(([title, duration], index) => {
    let id
    let url
    let thumbnail
    switch (ch.platform) {
      case 'youtube':
        id = ytId()
        url = `https://www.youtube.com/watch?v=${id}`
        thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        break
      case 'bilibili':
        id = `BV1${rng.id(9, '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')}`
        url = `https://www.bilibili.com/video/${id}`
        thumbnail = `https://i0.hdslb.com/bfs/archive/${rng.id(40, '0123456789abcdef')}.jpg`
        break
      case 'soundcloud':
        id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        url = `https://soundcloud.com/${ch.slug}/${id}`
        thumbnail = `https://i1.sndcdn.com/artworks-${rng.id(16, '0123456789abcdefghijklmnopqrstuvwxyz')}-t500x500.jpg`
        break
      case 'vimeo':
        id = String(rng.int(880000000, 1090000000))
        url = `https://vimeo.com/${id}`
        thumbnail = `https://i.vimeocdn.com/video/${rng.int(1700000000, 1999999999)}-d_640x360`
        break
      case 'twitch':
        id = String(rng.int(2100000000, 2400000000))
        url = `https://www.twitch.tv/videos/${id}`
        thumbnail = `https://static-cdn.jtvnw.net/cf_vods/${rng.id(20, '0123456789abcdef')}/thumb/thumb0-640x360.jpg`
        break
      case 'x':
        id = String(rng.int(1800000000, 1990000000)) + String(rng.int(100000000, 999999999))
        url = `https://x.com/${ch.slug}/status/${id}`
        thumbnail = `https://pbs.twimg.com/ext_tw_video_thumb/${id}/pu/img/${rng.id(16)}.jpg`
        break
      case 'tiktok':
        id = String(rng.int(7300000000, 7499999999)) + String(rng.int(100000000, 999999999))
        url = `https://www.tiktok.com/${ch.slug}/video/${id}`
        thumbnail = `https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/${rng.id(32, '0123456789abcdef')}`
        break
      default:
        id = ytId()
        url = `https://example.invalid/${id}`
    }
    return {
      id,
      url,
      title,
      duration,
      thumbnail,
      channel: ch,
      index,
      viewCount: Math.round(rng.next() ** 2 * 2_400_000) + rng.int(800, 9000),
      description: `${title}\n\n${describe(ch)}`
    }
  })
}

function describe(ch) {
  const lines = {
    youtube: `New videos every week from ${ch.name}. Chapters and sources are in the pinned comment.`,
    bilibili: `欢迎一键三连！本期视频的参考链接都放在简介里。`,
    soundcloud: `${ch.name} — long-form audio about how things really work.`,
    vimeo: `Recorded live. ${ch.name} archive.`,
    twitch: `Past broadcast from ${ch.name}.`,
    x: `Clip posted by @${ch.slug}`,
    tiktok: `#cooking #recipe #fyp`
  }
  return lines[ch.platform] ?? ''
}

export const ALL_ITEMS = CHANNELS.flatMap((ch) => ch.items)

export const findItemByUrl = (url) => {
  const clean = String(url).trim()
  return ALL_ITEMS.find((item) => item.url === clean || clean.includes(item.id)) ?? null
}

/** Escape XML special chars. */
const esc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c])

/** Wrap a title into lines of at most `max` chars. */
const wrap = (text, max) => {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max && line) {
      lines.push(line)
      line = w
    } else {
      line = (line + ' ' + w).trim()
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

/** Render a 16:9 title-card thumbnail as SVG. */
export const thumbnailSvg = (item) => {
  const [a, b] = item ? item.channel.colors : ['#334155', '#64748b']
  const title = item ? item.title : 'Video'
  const cjk = /[　-鿿]/.test(title)
  const lines = wrap(title, cjk ? 14 : 24)
  const size = lines.length > 2 ? 34 : 40
  const startY = 150 - ((lines.length - 1) * size * 1.1) / 2
  const text = lines
    .map((l, i) => `<text x="36" y="${(startY + i * size * 1.15).toFixed(0)}" font-family="Helvetica Neue, Arial, PingFang SC, sans-serif" font-weight="800" font-size="${size}" fill="#fff">${esc(l)}</text>`)
    .join('')
  const dur = item ? fmtDuration(item.duration) : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="480" height="270" fill="url(#g)"/><circle cx="420" cy="50" r="120" fill="#fff" opacity="0.07"/><circle cx="60" cy="260" r="90" fill="#000" opacity="0.12"/>${text}<text x="36" y="246" font-family="Helvetica Neue, Arial, sans-serif" font-size="16" font-weight="600" fill="#fff" opacity="0.8">${esc(item ? item.channel.name : '')}</text>${dur ? `<rect x="${430 - dur.length * 9}" y="226" rx="4" width="${dur.length * 9 + 16}" height="26" fill="#000" opacity="0.75"/><text x="${438 - dur.length * 9}" y="245" font-family="Menlo, monospace" font-size="15" fill="#fff">${dur}</text>` : ''}</svg>`
}

/** Render a round channel avatar as SVG. */
export const avatarSvg = (ch) => {
  const [a, b] = ch.colors
  const initials = /[　-鿿]/.test(ch.name)
    ? ch.name.slice(0, 1)
    : ch.name.replace(/^The\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="176" height="176" viewBox="0 0 176 176"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="176" height="176" fill="url(#g)"/><text x="88" y="108" text-anchor="middle" font-family="Helvetica Neue, Arial, PingFang SC, sans-serif" font-weight="800" font-size="64" fill="#fff">${esc(initials)}</text></svg>`
}

export const fmtDuration = (s) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

export const findChannelByCover = (url) => CHANNELS.find((ch) => ch.coverUrl && url.startsWith(ch.coverUrl.split('=')[0]))
export const findItemByThumb = (url) => ALL_ITEMS.find((it) => it.thumbnail && url.startsWith(it.thumbnail.split('?')[0]))
