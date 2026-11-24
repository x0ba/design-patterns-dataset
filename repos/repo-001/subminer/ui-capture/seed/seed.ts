// Seeds the SubMiner immersion database by replaying ~9 months of simulated mpv playback
// through ImmersionTrackerService's own recording API (the same calls the mpv/overlay
// runtime makes), with the tracker's test clock hook (__subminerTestNowMs) advanced manually.
// AniList metadata is attached with tracker.reassignAnimeAnilist (the dashboard's
// "Change AniList Entry" path); cover downloads are answered by a local poster generator.
import fs from 'node:fs';
import path from 'node:path';
import { ImmersionTrackerService } from '../../src/core/services/immersion-tracker-service';
import { SHARED, SHOWS } from './lines';
import { tokenizeLine, LEX } from './tokenize';
import { makePoster } from './poster';

const DATA = path.resolve(import.meta.dir, '..', 'data');
const DB = path.join(DATA, 'immersion.seed.sqlite');
fs.mkdirSync(DATA, { recursive: true });
for (const s of ['', '-wal', '-shm']) fs.rmSync(DB + s, { force: true });

// ---------- deterministic RNG ----------
let seed = 20260211;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)]!;
const chance = (p: number) => rand() < p;

// ---------- library ----------
interface Show {
  key: string;
  dir: string;
  file: (ep: number) => string;
  episodes: number;
  watchUntil: number; // last episode the user gets to
  start: string; // ISO date the user starts it
  durationSec: number;
  airEvery?: number; // days between episode availability (seasonal shows the user follows as they air)
  anilist?: {
    id: number;
    romaji: string;
    english: string | null;
    native: string;
    total: number;
    description: string;
    palette: [string, string, string];
  };
}

const LIB = '/home/mika/Videos/Anime';
const sonarr = (title: string, tag: string) => (ep: number) =>
  `${title} - S01E${String(ep).padStart(2, '0')} - ${tag}.mkv`;

const SHOWLIST: Show[] = [
  {
    key: 'yurucamp', dir: `${LIB}/Yuru Camp`, file: sonarr('Yuru Camp', 'Bluray-1080p'),
    episodes: 12, watchUntil: 12, start: '2026-02-11', durationSec: 1422,
    anilist: { id: 98444, romaji: 'Yuru Camp△', english: 'Laid-Back Camp', native: 'ゆるキャン△', total: 12,
      description: 'Rin enjoys camping alone by the lakes around Mt. Fuji in winter. After a chance meeting with the energetic Nadeshiko, the Outdoor Activities Club slowly grows, one cup of noodles and one campsite at a time.',
      palette: ['#f6b26b', '#6fa8dc', '#274e13'] },
  },
  {
    key: 'nonnon', dir: `${LIB}/Non Non Biyori`, file: sonarr('Non Non Biyori', 'Bluray-1080p'),
    episodes: 12, watchUntil: 12, start: '2026-02-21', durationSec: 1418,
    anilist: { id: 17549, romaji: 'Non Non Biyori', english: 'Non Non Biyori', native: 'のんのんびより', total: 12,
      description: 'Hotaru moves from Tokyo to a tiny farming village whose school has five students across every grade. Days pass with candy-shop trips, rice paddies, and Renge greeting everyone with "nyanpasu".',
      palette: ['#93c47d', '#ffe599', '#3d85c6'] },
  },
  {
    key: 'kaguya', dir: `${LIB}/Kaguya-sama - Love is War`, file: sonarr('Kaguya-sama wa Kokurasetai', 'WEBDL-1080p'),
    episodes: 12, watchUntil: 12, start: '2026-03-08', durationSec: 1440,
    anilist: { id: 101921, romaji: 'Kaguya-sama wa Kokurasetai: Tensai-tachi no Renai Zunousen', english: 'Kaguya-sama: Love is War', native: 'かぐや様は告らせたい～天才たちの恋愛頭脳戦～', total: 12,
      description: 'The student council president and vice president of Shuchiin Academy are clearly in love, but whoever confesses first loses. Each episode is a new scheme to make the other one crack.',
      palette: ['#cc0000', '#f4cccc', '#20124d'] },
  },
  {
    key: 'hyouka', dir: `${LIB}/Hyouka`, file: sonarr('Hyouka', 'Bluray-1080p'),
    episodes: 22, watchUntil: 9, start: '2026-03-30', durationSec: 1450,
    anilist: { id: 12189, romaji: 'Hyouka', english: 'Hyouka', native: '氷菓', total: 22,
      description: 'Energy-conserving Houtarou joins the Classics Club to keep it alive, only to be dragged into everyday mysteries by the endlessly curious Eru Chitanda — starting with the secret behind the club anthology.',
      palette: ['#e69138', '#fff2cc', '#783f04'] },
  },
  {
    key: 'mushishi', dir: `${LIB}/Mushishi`, file: sonarr('Mushishi', 'Bluray-1080p'),
    episodes: 26, watchUntil: 5, start: '2026-04-22', durationSec: 1480,
    anilist: { id: 457, romaji: 'Mushishi', english: 'Mushi-Shi', native: '蟲師', total: 26,
      description: 'Ginko travels between remote villages studying mushi, primitive life forms that most people cannot see but whose presence causes strange illnesses and phenomena.',
      palette: ['#38761d', '#d9ead3', '#0c343d'] },
  },
  {
    key: 'bocchi', dir: `${LIB}/Bocchi the Rock!`, file: sonarr('Bocchi the Rock!', 'WEBDL-1080p'),
    episodes: 12, watchUntil: 12, start: '2026-05-06', durationSec: 1420,
    anilist: { id: 130003, romaji: 'Bocchi the Rock!', english: 'BOCCHI THE ROCK!', native: 'ぼっち・ざ・ろっく！', total: 12,
      description: 'Hitori Gotou practices guitar six hours a day in her closet but is far too shy to play in front of anyone — until a drummer named Nijika drags her into Kessoku Band.',
      palette: ['#f9a8d4', '#fde68a', '#1f2937'] },
  },
  {
    key: 'spyfamily', dir: `${LIB}/SPY x FAMILY`, file: sonarr('SPY x FAMILY', 'WEBDL-1080p'),
    episodes: 12, watchUntil: 7, start: '2026-05-27', durationSec: 1440,
    anilist: { id: 140960, romaji: 'SPY×FAMILY', english: 'SPY x FAMILY', native: 'SPY×FAMILY', total: 12,
      description: 'Master spy Twilight must build a fake family to complete his mission, adopting a telepathic girl and marrying an assassin — none of whom know the others’ secrets.',
      palette: ['#6aa84f', '#f4cccc', '#000000'] },
  },
  {
    key: 'frieren', dir: `${LIB}/Sousou no Frieren`, file: sonarr('Sousou no Frieren', 'WEBDL-1080p'),
    episodes: 28, watchUntil: 28, start: '2026-06-10', durationSec: 1440,
    anilist: { id: 154587, romaji: 'Sousou no Frieren', english: "Frieren: Beyond Journey's End", native: '葬送のフリーレン', total: 28,
      description: 'Decades after the hero party defeated the Demon King, the elf mage Frieren sets out on a new journey to understand the humans whose lives passed by so quickly.',
      palette: ['#cfe2f3', '#b4a7d6', '#134f5c'] },
  },
  {
    key: 'kusuriya', dir: `${LIB}/Kusuriya no Hitorigoto`, file: sonarr('Kusuriya no Hitorigoto', 'WEBDL-1080p'),
    episodes: 24, watchUntil: 24, start: '2026-07-18', durationSec: 1435,
    anilist: { id: 161645, romaji: 'Kusuriya no Hitorigoto', english: 'The Apothecary Diaries', native: '薬屋のひとりごと', total: 24,
      description: 'Maomao, an apothecary kidnapped into service at the imperial inner palace, keeps her head down until she notices why the emperor’s infants are falling ill.',
      palette: ['#a64d79', '#ead1dc', '#4c1130'] },
  },
  {
    key: 'hibike', dir: `${LIB}/Hibike! Euphonium`, file: sonarr('Hibike! Euphonium', 'Bluray-1080p'),
    episodes: 13, watchUntil: 13, start: '2026-08-12', durationSec: 1440,
    anilist: { id: 20912, romaji: 'Hibike! Euphonium', english: 'Sound! Euphonium', native: '響け！ユーフォニアム', total: 13,
      description: 'Kumiko joins the concert band at Kitauji High hoping for a fresh start, but the club is split between students who want to have fun and those determined to reach the national competition.',
      palette: ['#f1c232', '#fff2cc', '#0b5394'] },
  },
  {
    key: 'dungeon', dir: `${LIB}/Dungeon Meshi`, file: sonarr('Dungeon Meshi', 'WEBDL-1080p'),
    episodes: 24, watchUntil: 17, start: '2026-09-04', durationSec: 1430, airEvery: 4.1,
    anilist: { id: 153518, romaji: 'Dungeon Meshi', english: 'Delicious in Dungeon', native: 'ダンジョン飯', total: 24,
      description: 'After a red dragon swallows his sister, Laios dives back into the dungeon with no money for supplies — so the party will have to cook and eat the monsters along the way.',
      palette: ['#b45f06', '#fce5cd', '#274e13'] },
  },
  {
    key: 'dandadan', dir: `${LIB}/Dandadan`, file: sonarr('Dandadan', 'WEBDL-1080p'),
    episodes: 12, watchUntil: 6, start: '2026-10-19', durationSec: 1420, airEvery: 5.5,
    anilist: { id: 171018, romaji: 'Dandadan', english: 'DAN DA DAN', native: 'ダンダダン', total: 12,
      description: 'A girl who believes in ghosts and a boy who believes in aliens make a bet, and both turn out to be right in the worst possible way.',
      palette: ['#ff00ff', '#00ffcc', '#111111'] },
  },
  {
    // Live-action, no AniList / TMDB match in this offline setup — shows up without a poster.
    key: 'terrace', dir: '/home/mika/Videos/TV/Terrace House Opening New Doors',
    file: (ep) => `Terrace House Opening New Doors - E${String(ep).padStart(2, '0')}.mp4`,
    episodes: 48, watchUntil: 14, start: '2026-04-20', durationSec: 2760, airEvery: 14,
  },
];

// ---------- clock ----------
const g = globalThis as { __subminerTestNowMs?: number };
let clock = 0;
const setClock = (ms: number) => {
  clock = Math.trunc(ms);
  g.__subminerTestNowMs = clock;
};
const tick = (ms: number) => setClock(clock + ms);

const endAnchor = Date.now() - 2 * 3600_000; // last sessions end a couple of hours ago
setClock(new Date('2026-02-11T19:00:00').getTime());

const tracker = new ImmersionTrackerService({
  dbPath: DB,
  policy: {
    batchSize: 5000,
    flushIntervalMs: 60_000,
    queueCap: 100_000,
    maintenanceIntervalMs: 7 * 24 * 3600_000,
    retention: { eventsDays: 0, telemetryDays: 0, sessionsDays: 0, dailyRollupsDays: 0, monthlyRollupsDays: 0, vacuumIntervalDays: 0 },
  },
});
const t = tracker as unknown as {
  pendingAnimeMetadataUpdates: Map<number, Promise<void>>;
  runMaintenance(): void;
  drainQueue(): void;
  db: { prepare(sql: string): { get(...a: unknown[]): unknown; all(...a: unknown[]): unknown[]; run(...a: unknown[]): unknown } };
};

// ---------- anki notes produced while mining ----------
interface Note { noteId: number; modelName: string; tags: string[]; fields: Record<string, { value: string; order: number }>; cards: number[] }
const notes: Note[] = [];
const minedHeadwords = new Set<string>();

function mineNote(lineText: string, tokens: ReturnType<typeof tokenizeLine>['tokens'], showKey: string, ep: number): number | null {
  const candidates = tokens.filter((tk) => ['名詞', '動詞', '形容詞', '副詞'].includes(tk.pos1 ?? '') && tk.pos2 !== '固有名詞' && tk.pos2 !== '代名詞');
  const fresh = candidates.filter((c) => !minedHeadwords.has(c.headword));
  const tk = fresh.length ? pick(fresh) : null;
  if (!tk) return null;
  minedHeadwords.add(tk.headword);
  const gloss = LEX.get(tk.surface)?.gloss || LEX.get(tk.headword)?.gloss || '';
  const noteId = clock + ri(0, 999);
  const show = SHOWLIST.find((s) => s.key === showKey)!;
  const fieldList: Array<[string, string]> = [
    ['Expression', tk.headword],
    ['ExpressionFurigana', `${tk.headword}[${tk.reading}]`],
    ['ExpressionReading', tk.reading],
    ['ExpressionAudio', `[sound:subminer_${noteId}_word.mp3]`],
    ['SelectionText', gloss],
    ['MainDefinition', gloss ? `<ol><li>${gloss}</li></ol>` : ''],
    ['Sentence', lineText.replace(tk.surface, `<b>${tk.surface}</b>`)],
    ['SentenceFurigana', ''],
    ['SentenceAudio', `[sound:subminer_${noteId}_sentence.mp3]`],
    ['Picture', `<img src="subminer_${noteId}.webp">`],
    ['MiscInfo', `${show.anilist?.romaji ?? 'Terrace House'} E${ep}`],
    ['FreqSort', String(tk.frequencyRank ?? '')],
  ];
  notes.push({
    noteId,
    modelName: 'Lapis',
    tags: ['subminer', showKey],
    fields: Object.fromEntries(fieldList.map(([k, v], i) => [k, { value: v, order: i }])),
    cards: [noteId + 1],
  });
  return noteId;
}

// ---------- one simulated mpv session ----------
const showPools: Record<string, string[]> = {};
const sharedPool = SHARED.split('\n').filter((l) => l.trim());
for (const [k, v] of Object.entries(SHOWS)) showPools[k] = v.split('\n').filter((l) => l.trim());

async function playSession(show: Show, ep: number, fromSec: number, toSec: number, monthIndex: number) {
  const file = show.file(ep);
  tracker.handleMediaChange(path.join(show.dir, file), file);
  await Promise.all([...t.pendingAnimeMetadataUpdates.values()]);
  tracker.recordMediaDuration(show.durationSec);
  tracker.recordPauseState(false);
  // lines for this episode: show-specific + shared, each at most once
  const own = showPools[show.key] ?? [];
  const pool = [...own.filter(() => chance(0.75)), ...sharedPool.filter(() => chance(0.55))];
  pool.sort(() => rand() - 0.5);
  const lineTimes: number[] = [];
  const span = toSec - fromSec;
  const nLines = Math.min(pool.length, Math.round((span / show.durationSec) * pool.length));
  for (let i = 0; i < nLines; i++) lineTimes.push(fromSec + 30 + Math.floor(((span - 40) * (i + rand() * 0.8)) / Math.max(1, nLines)));
  lineTimes.sort((a, b) => a - b);
  let li = 0;
  const beginner = Math.max(0.25, 1 - monthIndex * 0.09); // lookups drop as the learner improves
  const mineRate = 0.03 + Math.min(0.06, monthIndex * 0.008);
  tracker.recordPlaybackPosition(fromSec);
  for (let pos = fromSec; pos <= toSec; pos += 5) {
    tick(5000 + ri(0, 400));
    tracker.recordPlaybackPosition(pos);
    while (li < lineTimes.length && lineTimes[li]! <= pos) {
      const { text, tokens } = tokenizeLine(pool[li]!);
      const st = lineTimes[li]!;
      tracker.recordSubtitleLine(text, st, st + 2 + rand() * 3, tokens);
      if (chance(0.35 * beginner)) {
        tracker.recordYomitanLookup();
        tracker.recordLookup(chance(0.88));
        if (chance(0.3)) tracker.recordYomitanLookup();
      }
      if (chance(mineRate)) {
        const id = mineNote(text, tokens, show.key, ep);
        if (id) tracker.recordCardsMined(1, [id]);
      }
      if (chance(0.025)) {
        // rewind to re-listen to a line
        tick(1500);
        tracker.recordPlaybackPosition(Math.max(fromSec, pos - 8));
        tick(8000);
        tracker.recordPlaybackPosition(pos);
      }
      li++;
    }
    if (chance(0.006)) {
      tracker.recordPauseState(true);
      tick(ri(8, 55) * 1000);
      tracker.recordPauseState(false);
    }
    if (chance(0.0015)) tracker.recordMediaBufferEvent();
  }
  tick(ri(2, 6) * 1000);
  tracker.handleMediaChange(null, null);
}

// ---------- day-by-day schedule ----------
const isAvailable = (s: Show, iso: string) => {
  if (s.start > iso || progress.get(s.key)! > s.watchUntil) return false;
  if (!s.airEvery) return true;
  const days = (new Date(iso).getTime() - new Date(s.start).getTime()) / 86_400_000;
  return progress.get(s.key)! <= 1 + Math.floor(days / s.airEvery);
};
const progress = new Map<string, number>(); // next episode to watch
const resumeAt = new Map<string, number>(); // partially watched episode resume point (sec)
for (const s of SHOWLIST) progress.set(s.key, 1);

const startDay = new Date('2026-02-11T00:00:00');
const lastDay = new Date(endAnchor);
lastDay.setHours(0, 0, 0, 0);
let sessions = 0;
let monthIndex = 0;
for (let day = new Date(startDay); day <= lastDay; day.setDate(day.getDate() + 1)) {
  monthIndex = (day.getFullYear() - 2026) * 12 + day.getMonth() - 1;
  const dow = day.getDay();
  const weekend = dow === 0 || dow === 6;
  const isToday = day.getTime() === lastDay.getTime();
  // vacations / busy weeks: a few gaps
  const iso = day.toISOString().slice(0, 10);
  const busy = (iso >= '2026-04-27' && iso <= '2026-05-01') || (iso >= '2026-07-20' && iso <= '2026-07-26') || (iso >= '2026-10-05' && iso <= '2026-10-09');
  if (busy && !chance(0.1)) continue;
  if (!isToday && !chance(weekend ? 0.85 : 0.62)) continue;
  const active = SHOWLIST.filter((s) => isAvailable(s, iso));
  if (!active.length) continue;
  let count = weekend ? ri(1, 3) : chance(0.75) ? 1 : 2;
  if (isToday) count = 1;
  let hour = weekend ? ri(13, 16) : ri(19, 21);
  const start = new Date(day);
  start.setHours(hour, ri(0, 59), ri(0, 59));
  setClock(start.getTime());
  for (let i = 0; i < count; i++) {
    const avail = SHOWLIST.filter((s) => isAvailable(s, iso));
    if (!avail.length) break;
    const newest = [...avail].sort((a, b) => (a.start < b.start ? 1 : -1));
    const show = newest[0]!.key !== 'terrace' && chance(0.72) ? newest[0]! : chance(0.25) ? (avail.find((s) => s.key === 'terrace') ?? pick(avail)) : pick(avail);
    const ep = progress.get(show.key)!;
    const from = resumeAt.get(show.key) ?? 0;
    // sometimes stop partway through (bedtime, interruptions)
    const stopEarly = from === 0 && chance(0.14);
    const to = stopEarly ? Math.floor(show.durationSec * (0.3 + rand() * 0.4)) : show.durationSec - ri(0, 25);
    if (isToday && clock > endAnchor - show.durationSec * 1000) setClock(endAnchor - show.durationSec * 1000 - 600_000);
    await playSession(show, ep, from, to, Math.max(0, monthIndex));
    sessions++;
    if (stopEarly) resumeAt.set(show.key, to - 10);
    else {
      resumeAt.delete(show.key);
      progress.set(show.key, ep + 1);
      // occasional rewatch of a favourite episode is skipped; the ratio-based watched flag handles completion
    }
    tick(ri(1, 12) * 60_000);
    if (stopEarly) break;
  }
}
console.log(`simulated ${sessions} sessions`);

// ---------- rollups / maintenance, at "now" ----------
setClock(Date.now());
t.drainQueue();
t.runMaintenance();

// ---------- AniList metadata + covers via the app's reassign path ----------
const realFetch = globalThis.fetch;
const posterByUrl = new Map<string, Buffer>();
for (const s of SHOWLIST) {
  if (!s.anilist) continue;
  const url = `https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx${s.anilist.id}.png`;
  posterByUrl.set(url, makePoster(s.anilist.palette, s.anilist.id));
}
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const poster = posterByUrl.get(url);
  if (poster) return new Response(poster, { headers: { 'Content-Type': 'image/png' } });
  return realFetch(input, init);
}) as typeof fetch;

const animeRows = t.db.prepare('SELECT anime_id AS id, canonical_title AS title FROM imm_anime').all() as Array<{ id: number; title: string }>;
for (const s of SHOWLIST) {
  if (!s.anilist) continue;
  const parsedTitle = s.file(1).split(' - S01')[0]!;
  const row = animeRows.find((r) => r.title === parsedTitle || r.title === `${parsedTitle} Season 1`);
  if (!row) {
    console.warn('no anime row for', parsedTitle, animeRows.map((r) => r.title));
    continue;
  }
  await tracker.reassignAnimeAnilist(row.id, {
    anilistId: s.anilist.id,
    titleRomaji: s.anilist.romaji,
    titleEnglish: s.anilist.english,
    titleNative: s.anilist.native,
    episodesTotal: s.anilist.total,
    description: s.anilist.description,
    coverUrl: `https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx${s.anilist.id}.png`,
  });
}
globalThis.fetch = realFetch;
t.runMaintenance();

// ---------- known-word cache (what the Anki known-word sync would have written) ----------
const words = t.db.prepare('SELECT headword, frequency FROM imm_words ORDER BY frequency DESC').all() as Array<{ headword: string; frequency: number }>;
const known = words.filter((w, i) => i < words.length * 0.55 || minedHeadwords.has(w.headword)).map((w) => w.headword);
fs.writeFileSync(
  path.join(DATA, 'known-words-cache.json'),
  JSON.stringify({ version: 1, refreshedAtMs: Date.now() - 3600_000, scope: 'deck:Mining::Anime|field:Expression', words: known }, null, 2),
);
fs.writeFileSync(path.join(DATA, 'anki-notes.json'), JSON.stringify(notes, null, 1));

(t.db as unknown as { exec(sql: string): void }).exec('PRAGMA wal_checkpoint(TRUNCATE)');
tracker.destroy();
const counts = (q: string) => {
  const { Database } = require('../../src/core/services/immersion-tracker/sqlite');
  const db = new Database(DB);
  const r = db.prepare(q).get();
  db.close();
  return r;
};
console.log(counts(`SELECT (SELECT COUNT(*) FROM imm_sessions) s, (SELECT COUNT(*) FROM imm_videos) v, (SELECT COUNT(*) FROM imm_anime) a, (SELECT COUNT(*) FROM imm_words) w, (SELECT COUNT(*) FROM imm_subtitle_lines) l, (SELECT SUM(cards_mined) FROM imm_sessions) c`));
console.log(`anki notes: ${notes.length}, known words: ${known.length}`);
process.exit(0);
