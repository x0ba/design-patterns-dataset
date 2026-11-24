// 生成模拟用户数据：本地曲库、本地歌单、播放统计、播放历史、队列、下载记录与封面图
// 用法：node .ui-capture/seed/generate.mjs  → .ui-capture/web/seed.json + .ui-capture/web/static/covers/*.svg
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALBUMS, FEATS, SINGLES } from "./library-data.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(here, "../web");
const coverDir = resolve(webDir, "static/covers");
mkdirSync(coverDir, { recursive: true });

// 固定"今天"，保证数据可复现
const NOW = Date.parse("2026-11-17T21:40:00+08:00");
const DAY = 86400000;
let seed = 20261117;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const hash = (s) => createHash("sha1").update(s).digest("hex");
const hue = (s) => parseInt(hash(s).slice(0, 4), 16) % 360;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;");

/** 生成抽象风格的专辑封面 SVG */
const writeCover = (key, title, sub) => {
  const id = hash(key).slice(0, 16);
  const h = hue(key);
  const h2 = (h + 40 + (parseInt(hash(key).slice(4, 6), 16) % 80)) % 360;
  const style = parseInt(hash(key).slice(6, 8), 16) % 4;
  const shapes = [
    `<circle cx='${120 + (h % 60)}' cy='130' r='${60 + (h % 30)}' fill='hsl(${h2},70%,62%)' opacity='.85'/>`,
    `<rect x='40' y='40' width='220' height='220' rx='8' fill='none' stroke='hsl(${h2},60%,75%)' stroke-width='10' transform='rotate(${h % 45} 150 150)'/>`,
    Array.from({ length: 7 }, (_, i) => `<rect x='0' y='${30 + i * 34}' width='300' height='14' fill='hsl(${(h2 + i * 9) % 360},65%,${45 + i * 5}%)' opacity='.7'/>`).join(""),
    `<path d='M0 220 Q 75 ${120 + (h % 60)} 150 200 T 300 180 V300 H0Z' fill='hsl(${h2},55%,35%)'/><circle cx='220' cy='80' r='34' fill='hsl(${(h + 180) % 360},80%,80%)'/>`,
  ][style];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${h},55%,42%)'/><stop offset='1' stop-color='hsl(${(h + 60) % 360},50%,18%)'/></linearGradient></defs><rect width='300' height='300' fill='url(#g)'/>${shapes}<text x='22' y='262' font-family='Helvetica,Arial,PingFang SC,sans-serif' font-size='22' font-weight='700' fill='rgba(255,255,255,.92)'>${esc(title.slice(0, 18))}</text><text x='22' y='284' font-family='Helvetica,Arial,PingFang SC,sans-serif' font-size='13' fill='rgba(255,255,255,.7)'>${esc(sub.slice(0, 28))}</text></svg>`;
  writeFileSync(resolve(coverDir, `${id}.svg`), svg);
  return `/covers/${id}.svg`;
};

/** 生成歌手头像 SVG */
const writeAvatar = (name) => {
  const id = "a" + hash("artist:" + name).slice(0, 15);
  const h = hue("artist:" + name);
  const initial = [...name][0].toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><defs><radialGradient id='g' cx='.3' cy='.3' r='.9'><stop offset='0' stop-color='hsl(${h},50%,62%)'/><stop offset='1' stop-color='hsl(${(h + 50) % 360},45%,22%)'/></radialGradient></defs><rect width='300' height='300' fill='url(#g)'/><circle cx='150' cy='118' r='52' fill='rgba(255,255,255,.18)'/><path d='M60 300 C 70 210, 230 210, 240 300Z' fill='rgba(255,255,255,.18)'/><text x='150' y='140' text-anchor='middle' font-family='Helvetica,Arial,PingFang SC,sans-serif' font-size='64' font-weight='700' fill='rgba(255,255,255,.9)'>${esc(initial)}</text></svg>`;
  writeFileSync(resolve(coverDir, `${id}.svg`), svg);
  return `/covers/${id}.svg`;
};

const toMs = (mmss) => {
  const [m, s] = mmss.split(":").map(Number);
  return (m * 60 + s) * 1000 + Math.floor(rand() * 900);
};
const QUALITY = {
  flac: () => {
    const hi = rand() < 0.25;
    return { codec: "FLAC", sampleRate: hi ? 96000 : 44100, bitRate: hi ? 2600000 : 920000 + Math.floor(rand() * 260000), channels: 2, bitsPerSample: hi ? 24 : 16 };
  },
  mp3: () => ({ codec: "MP3", sampleRate: 44100, bitRate: rand() < 0.8 ? 320000 : 192000, channels: 2, bitsPerSample: 0 }),
};

const MUSIC = "/Users/lin/Music";
const tracks = [];
const avatars = {};
const albumCovers = {};

ALBUMS.forEach(([album, artist, year, fmt, list], ai) => {
  const cover = writeCover(`${artist}/${album}`, album, `${artist} · ${year}`);
  albumCovers[album] = cover;
  avatars[artist] ??= writeAvatar(artist);
  // 曲库按月陆续导入：越早的专辑越早加入
  const addedAt = NOW - (330 - ai * 9) * DAY - Math.floor(rand() * 5 * DAY);
  const items = list.split("|");
  items.forEach((raw, i) => {
    const m = raw.match(/^(.*) (\d+:\d\d)$/);
    const title = m[1];
    const duration = toMs(m[2]);
    const quality = QUALITY[fmt]();
    const ext = fmt === "flac" ? "flac" : "mp3";
    const path = `${MUSIC}/${artist}/${album}/${String(i + 1).padStart(2, "0")} ${title}.${ext}`;
    const artists = [{ name: artist }];
    if (FEATS[title]) artists.push({ name: FEATS[title] });
    tracks.push({
      id: hash(path).slice(0, 16),
      source: "local",
      path,
      title,
      track: i + 1,
      artists,
      album: { name: album, artist, year, trackCount: items.length, cover },
      duration,
      cover,
      fileSize: Math.round((quality.bitRate / 8) * (duration / 1000)),
      mtime: addedAt + i * 1000,
      ctime: addedAt + i * 1000,
      quality,
    });
  });
});

SINGLES.forEach(([title, artist, fmt, len, album], i) => {
  const quality = QUALITY[fmt]();
  const duration = toMs(len);
  const path = album
    ? `${MUSIC}/Singles/${artist} - ${title}.${fmt}`
    : `/Users/lin/Downloads/${artist} - ${title}.${fmt}`;
  const cover = album ? writeCover(`${artist}/${album}`, album, artist) : undefined;
  avatars[artist] ??= artist === "Unknown Artist" ? undefined : writeAvatar(artist);
  const addedAt = NOW - Math.floor(rand() * 200) * DAY;
  tracks.push({
    id: hash(path).slice(0, 16),
    source: "local",
    path,
    title,
    artists: [{ name: artist }],
    album: album ? { name: album, artist } : undefined,
    duration,
    cover,
    fileSize: Math.round((quality.bitRate / 8) * (duration / 1000)),
    mtime: addedAt,
    ctime: addedAt,
    quality,
  });
});

const byTitle = (t) => tracks.find((x) => x.title === t);
const byArtist = (a) => tracks.filter((x) => x.artists[0].name === a);

// 播放记录：偏好明显（常听的曲目反复出现），时间分布在近 8 个月，晚间与通勤时段更多
const favoritesPool = [
  "晴天", "浮夸", "夜に駆ける", "Karma Police", "Get Lucky", "cardigan", "贝加尔湖畔", "白日", "山海",
  "秦皇岛", "No Surprises", "The Scientist", "Don't Know Why", "Skinny Love", "花束を君に", "旅行的意义",
  "突然好想你", "那些花儿", "Instant Crush", "So What", "Blinding Lights", "Lemon", "披星戴月的想你",
].map(byTitle).filter(Boolean);
const HOURS = [0.2, 0.1, 0.05, 0.02, 0.02, 0.03, 0.2, 0.8, 1.6, 1.2, 0.9, 0.7, 0.9, 0.8, 0.7, 0.8, 0.9, 1.2, 1.7, 1.4, 1.6, 1.9, 1.8, 0.9];
const hourPick = () => {
  const total = HOURS.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let h = 0; h < 24; h++) if ((r -= HOURS[h]) < 0) return h;
  return 21;
};
const plays = [];
for (let d = 240; d >= 0; d--) {
  const dayStart = NOW - d * DAY - ((NOW + 8 * 3600000) % DAY);
  const weekday = new Date(dayStart).getUTCDay();
  const skip = rand() < (d < 30 ? 0.05 : 0.18);
  if (skip && d !== 0) continue;
  const count = Math.floor((weekday === 0 || weekday === 6 ? 14 : 8) * (0.4 + rand()));
  for (let k = 0; k < count; k++) {
    const t = rand() < 0.45 ? pick(favoritesPool) : pick(tracks);
    const startedAt = dayStart + hourPick() * 3600000 + Math.floor(rand() * 3600000);
    if (startedAt > NOW) continue;
    const full = rand() < 0.78;
    plays.push({ trackId: t.id, startedAt, listenedMs: full ? t.duration : Math.floor(t.duration * (0.2 + rand() * 0.5)) });
  }
}
plays.sort((a, b) => a.startedAt - b.startedAt);

// 本地红心（最近喜欢的在前）
const likedTitles = [
  "Lemon", "白日", "夜に駆ける", "晴天", "浮夸", "Karma Police", "cardigan", "exile", "贝加尔湖畔", "山海", "秦皇岛",
  "No Surprises", "The Scientist", "Don't Know Why", "Skinny Love", "花束を君に", "旅行的意义", "突然好想你",
  "那些花儿", "Instant Crush", "So What", "Blue in Green", "Here Comes the Sun", "Time", "Someone like You",
  "东风破", "最佳损友", "红玫瑰", "天黑黑", "如烟", "群青", "Brave Shine", "桜流し", "Clocks", "Get Lucky",
  "杀死那个石家庄人", "大风吹", "消愁", "Merry Christmas Mr. Lawrence", "夜曲", "易燃易爆炸", "宝贝",
];
const likedIds = likedTitles.map(byTitle).filter(Boolean).map((t) => t.id);

// 本地歌单
const ids = (titles) => titles.map(byTitle).filter(Boolean).map((t) => t.id);
const playlists = [
  { title: "深夜写代码", description: "专注用，没有人声或者人声很轻的那种。周五晚上加班专用 🌙", cover: null,
    tracks: [...ids(["So What", "Blue in Green", "Flamenco Sketches", "Giorgio by Moroder", "Within", "Touch", "Motherboard", "Contact", "Fitter Happier", "Airbag", "Merry Christmas Mr. Lawrence", "River Flows in You", "Speak to Me", "On the Run", "Any Colour You Like", "The Wolves (Act I and II)", "re: Stacks"])], created: 260, updated: 3 },
  { title: "通勤路上", description: "地铁 2 号线 → 10 号线，大概 40 分钟", tracks: ids(["夜に駆ける", "群青", "白日", "Pretender", "Lemon", "Blinding Lights", "Get Lucky", "Teenager Forever", "突然好想你", "带我去找夜生活", "简单爱", "江南", "Shape of You", "bad guy", "Rolling in the Deep", "In My Place", "Clocks", "Viva La Vida", "三原色", "怪物"]), created: 210, updated: 1 },
  { title: "华语老歌 · 2000s", description: "", tracks: [...byArtist("周杰伦"), ...byArtist("陈奕迅"), ...byArtist("孙燕姿"), ...byArtist("王菲"), ...byArtist("林俊杰")].map((t) => t.id), created: 190, updated: 12 },
  { title: "下雨天", description: "窗外下雨的时候听", tracks: ids(["雨天", "Don't Know Why", "Skinny Love", "Flume", "No Surprises", "Exit Music (For a Film)", "傘", "真夏の通り雨", "桜流し", "Blue in Green", "The Nearness of You", "后来", "鱼", "城市"]), created: 150, updated: 40 },
  { title: "Livehouse 预习 | 草东 & 万青", description: "12 月 6 日 MAO 上海，提前把歌词背熟", tracks: [...byArtist("草东没有派对"), ...byArtist("万能青年旅店")].map((t) => t.id), created: 20, updated: 2 },
  { title: "跑步 160bpm", description: "", tracks: ids(["Lose Yourself to Dance", "Get Lucky", "Blinding Lights", "Shape of You", "bad guy", "双截棍", "忍者", "Teenager Forever", "どろん", "夜に駆ける", "Come Together", "Politik", "Electioneering", "Life in the Fast Lane"]), created: 120, updated: 64 },
  { title: "给爸妈的歌", description: "回家开车的时候放", tracks: ids(["父亲写的散文诗", "贝加尔湖畔", "假如爱有天意", "松花江畔", "白桦林", "在希望的田野上", "后来", "稻香", "Hotel California", "Here Comes the Sun"]), created: 95, updated: 30 },
  { title: "日系", description: "", tracks: [...byArtist("YOASOBI"), ...byArtist("Aimer"), ...byArtist("宇多田ヒカル"), ...byArtist("King Gnu"), byTitle("Lemon"), byTitle("Pretender")].map((t) => t.id), created: 170, updated: 8 },
  { title: "待整理", description: "从下载文件夹拖进来的，还没分类", tracks: tracks.filter((t) => t.path.startsWith("/Users/lin/Downloads")).map((t) => t.id), created: 45, updated: 45 },
  { title: "空歌单", description: "", tracks: [], created: 5, updated: 5 },
].map((p, i) => ({
  id: `pl_${hash(p.title).slice(0, 10)}`,
  type: "local",
  title: p.title,
  description: p.description || undefined,
  cover: p.cover ?? undefined,
  trackIds: p.tracks,
  createTime: NOW - p.created * DAY + i * 3600000,
  updateTime: NOW - p.updated * DAY + i * 600000,
}));

// 播放历史（渲染层 history store）：按最近播放去重
const seen = new Set();
const history = [];
for (let i = plays.length - 1; i >= 0 && history.length < 180; i--) {
  if (seen.has(plays[i].trackId)) continue;
  seen.add(plays[i].trackId);
  history.push({ trackId: plays[i].trackId, playedAt: plays[i].startedAt });
}

// 当前播放队列：「深夜写代码」歌单，正在播第 4 首
const queue = { playlistId: playlists[0].id, trackIds: playlists[0].trackIds, index: 3, position: 132000 };

// 网易云访客首页推荐（离线替身数据）
const discoverPlaylists = [
  ["华语私藏 | 那些被低估的宝藏男声", 1820, 7_812_300], ["深夜 emo 时刻：一个人的时候听", 96, 23_405_118],
  ["City Pop | 霓虹灯下的八十年代东京", 120, 4_512_009], ["工作学习专注 · Lo-fi Beats", 200, 61_208_774],
  ["独立民谣：在路上的人", 88, 2_301_552], ["欧美经典摇滚 100 首", 100, 12_998_031],
  ["日系清新 | 夏天的风", 75, 3_877_265], ["治愈钢琴曲 · 睡前十分钟", 60, 18_043_210],
  ["2000 年代华语金曲合集", 150, 35_664_812], ["Livehouse 现场 | 乐队的夏天", 64, 1_920_344],
  ["Jazz Café · 慵懒午后", 52, 6_201_993], ["跑步健身 BPM 150+", 80, 9_455_120],
].map(([name, trackCount, playCount], i) => ({
  id: 7_400_000_000 + i * 131_071, name, trackCount, playCount,
  picUrl: writeCover(`np/${name}`, name.split(/[|·：:]/)[0].trim(), "网易云音乐"),
  copywriter: ["根据你常听的华语流行推荐", "编辑精选", "热门推荐", "猜你喜欢"][i % 4],
}));
const discoverArtists = ["周杰伦", "陈奕迅", "林俊杰", "Taylor Swift", "YOASOBI", "米津玄師", "五月天", "毛不易", "告五人", "Coldplay", "G.E.M.邓紫棋", "李健"].map((name, i) => ({
  id: 6_452 + i * 977, name, picUrl: avatars[name] ?? writeAvatar(name), img1v1Url: avatars[name] ?? writeAvatar(name), albumSize: 8 + ((i * 7) % 30),
}));
const discoverAlbums = [
  ["Midnight Cassette", "Lucid Harbor"], ["山野来信", "河流乐队"], ["Neon Afterglow", "Sora Kanata"],
  ["第七个夏天", "林晚星"], ["Paper Boats", "The Quiet Keys"], ["回声", "沈一鸣"],
  ["Low Tide", "Maren Holt"], ["城市漫游指南", "落日飞行"], ["光の粒", "ミナト"],
  ["Slow Burn", "Velvet Avenue"], ["旧唱片", "周游"], ["Northern Lights", "Aurora Field"],
].map(([name, artist], i) => ({
  id: 260_000_000 + i * 4099, name, artists: [{ name: artist }], artist: { name: artist },
  picUrl: writeCover(`na/${name}`, name, artist), size: 8 + (i % 6), publishTime: NOW - (3 + i * 4) * DAY,
}));

const seedData = {
  discover: { playlists: discoverPlaylists, artists: discoverArtists, albums: discoverAlbums },
  generatedAt: NOW,
  scanDirs: [`${MUSIC}`, "/Users/lin/Downloads", "/Volumes/NAS/Lossless"],
  tracks,
  avatars,
  likedIds,
  playlists,
  plays,
  history,
  queue,
};
writeFileSync(resolve(webDir, "seed.json"), JSON.stringify(seedData));
console.log(`tracks=${tracks.length} plays=${plays.length} playlists=${playlists.length} liked=${likedIds.length} history=${history.length}`);
