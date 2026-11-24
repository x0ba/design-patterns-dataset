// Seed VidBee's API database (vidbee.db) with ~8 months of realistic use:
// download history (completed / failed / cancelled), active queue items,
// RSS subscriptions and their feed items. Writes rows using the app's own
// SQLite schema (schema.sql is dumped from the API's DDL).
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_ITEMS, CHANNELS, makeRng } from './catalog.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const require = createRequire(path.join(root, 'apps/api/package.json'))
const Database = require('better-sqlite3')

const dataDir = process.env.VIDBEE_DATA_DIR ?? path.join(here, 'data/vidbee')
const downloadDir = process.env.VIDBEE_DOWNLOAD_DIR ?? path.join(here, 'data/downloads')
const dbPath = path.join(dataDir, 'vidbee.db')

fs.mkdirSync(dataDir, { recursive: true })
fs.rmSync(downloadDir, { recursive: true, force: true })
fs.mkdirSync(downloadDir, { recursive: true })
for (const f of ['vidbee.db', 'vidbee.db-wal', 'vidbee.db-shm']) fs.rmSync(path.join(dataDir, f), { force: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.exec(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'))

const rng = makeRng(77)
const NOW = Date.now()
const DAY = 86_400_000
const HOUR = 3_600_000

const runtimeSettings = {
  downloadPath: downloadDir,
  browserForCookies: 'none',
  cookiesPath: '',
  proxy: '',
  configPath: '',
  downloadSubtitles: false,
  subtitleLanguages: ['en'],
  interfaceLanguage: 'en',
  embedSubs: true,
  writeAutoSubs: false,
  embedThumbnail: true,
  embedMetadata: true,
  embedChapters: true,
  filenameStyle: 'title',
  filenameViaVidBee: false,
  shareWatermark: false,
  downloadWithoutChannelSubfolders: false
}

const safe = (s) => s.replace(/[\\/:*?"<>|]/g, '_').trim()

const insertTask = db.prepare(`INSERT INTO tasks (id, kind, parent_id, status, prev_status, status_reason, entered_status_at,
  priority, group_key, attempt, max_attempts, next_retry_at, pid, pid_started_at, created_at, updated_at,
  input_json, progress_json, output_json, last_error_json)
  VALUES (@id, @kind, NULL, @status, @prev_status, @status_reason, @entered_status_at, @priority, @group_key, @attempt,
  @max_attempts, @next_retry_at, NULL, NULL, @created_at, @updated_at, @input_json, @progress_json, @output_json, @last_error_json)`)
const insertAttempt = db.prepare(`INSERT INTO attempts (id, task_id, attempt_number, started_at, ended_at, exit_code,
  error_category, stdout_tail, stderr_tail, raw_args_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

const ERRORS = {
  'http-429': { msg: 'ERROR: [youtube] {id}: HTTP Error 429: Too Many Requests', key: 'task.error.http429', hints: ['retry-later'], retryable: true },
  'auth-required': { msg: 'ERROR: [youtube] {id}: Join this channel to get access to members-only content like this video, and other exclusive perks.', key: 'task.error.authRequired', hints: ['import-cookies'], retryable: false },
  'geo-blocked': { msg: 'ERROR: [BiliBili] {id}: This video is not available in your country due to copyright restrictions (geo-restricted)', key: 'task.error.geoBlocked', hints: ['set-proxy'], retryable: false },
  'not-found': { msg: 'ERROR: [youtube] {id}: Video unavailable. This video has been removed by the uploader', key: 'task.error.notFound', hints: ['remove-task'], retryable: false },
  'network-transient': { msg: 'ERROR: unable to download video data: <urlopen error [Errno 54] Connection reset by peer>', key: 'task.error.networkTransient', hints: ['retry'], retryable: true },
  ffmpeg: { msg: 'ERROR: Postprocessing: Conversion failed! [aac @ 0x7f8a1c80] Too many bits 8832 > 6144 per frame requested', key: 'task.error.ffmpeg', hints: ['retry'], retryable: false },
  'disk-full': { msg: 'ERROR: unable to write data: [Errno 28] No space left on device', key: 'task.error.diskFull', hints: ['free-space'], retryable: false }
}

const classify = (category, item) => {
  const e = ERRORS[category]
  return {
    category,
    exitCode: 1,
    rawMessage: e.msg.replace('{id}', item.id),
    uiMessageKey: e.key,
    uiActionHints: e.hints,
    retryable: e.retryable,
    suggestedRetryAfterMs: category === 'http-429' ? 60_000 : null
  }
}

const usedUrls = new Set()
const taskIdByUrl = new Map()

/** Insert one download task for a catalog item. */
const addTask = (item, { status, createdAt, audio = false, subscription = null, playlist = null, error = null, progress = null, nextRetryAt = null, statusReason = null, prevStatus = null, attempt = null }) => {
  usedUrls.add(item.url)
  const ch = item.channel
  const id = randomUUID()
  const kind = subscription ? 'subscription-item' : audio ? 'audio' : 'video'
  const ext = audio ? (rng.next() < 0.6 ? 'mp3' : 'm4a') : rng.next() < 0.85 ? 'mp4' : 'mkv'
  const folder = path.join(downloadDir, safe(ch.name))
  const fileName = `${safe(item.title)}.${ext}`
  const filePath = path.join(playlist ? path.join(downloadDir, safe(playlist.title)) : folder, playlist ? `${String(playlist.index + 1).padStart(2, '0')} - ${fileName}` : fileName)
  const quality = rng.pick(['1080p', '1080p', '1080p', '720p', '2160p', '1440p'])
  const bitrate = audio ? 16_500 : { '720p': 220_000, '1080p': 430_000, '1440p': 980_000, '2160p': 1_900_000 }[quality]
  const size = Math.round(item.duration * bitrate * (0.85 + rng.next() * 0.3))
  const startedAt = createdAt + rng.int(1, 40) * 1000
  const elapsed = Math.round(Math.min(Math.max(size / (rng.int(3, 18) * 1048576), 8), 1800) * 1000)
  const completedAt = startedAt + elapsed
  const terminal = ['completed', 'failed', 'cancelled'].includes(status)
  const enteredAt = status === 'completed' ? completedAt : status === 'failed' || status === 'cancelled' ? startedAt + Math.round(elapsed * 0.3) : createdAt

  const options = {
    type: audio ? 'audio' : 'video',
    format: audio ? 'bestaudio[ext=m4a]/bestaudio' : quality === '2160p' ? 'bestvideo[height<=2160]+bestaudio/best' : `bestvideo[height<=${parseInt(quality)}]+bestaudio/best`,
    ...(audio ? { audioFormat: ext } : { containerFormat: ext }),
    customDownloadPath: path.dirname(filePath),
    settings: runtimeSettings,
    title: item.title,
    thumbnail: item.thumbnail,
    description: item.description,
    channel: ch.name,
    uploader: ch.name,
    viewCount: item.viewCount,
    tags: ch.tags,
    duration: item.duration,
    startedAt: status === 'queued' ? undefined : startedAt,
    ...(playlist ? { playlistTitle: playlist.title, playlistSize: playlist.size } : {}),
    ...(subscription ? { origin: 'subscription', subscriptionId: subscription.id, itemId: item.id } : {})
  }
  const input = {
    url: item.url,
    kind,
    title: item.title,
    thumbnail: item.thumbnail,
    ...(subscription ? { subscriptionId: subscription.id } : {}),
    ...(playlist ? { playlistId: playlist.id, playlistIndex: playlist.index + 1 } : {}),
    options
  }

  let output = null
  if (status === 'completed') {
    output = {
      filePath,
      size,
      durationMs: item.duration * 1000,
      sha256: null,
      formatId: audio ? '140' : { '720p': '136+140', '1080p': '137+140', '1440p': '271+251', '2160p': '313+251' }[quality],
      cookieSources: []
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    const fd = fs.openSync(filePath, 'w')
    fs.ftruncateSync(fd, size) // sparse placeholder with the real size
    fs.closeSync(fd)
  }

  const lastError = error ? classify(error, item) : null
  insertTask.run({
    id,
    kind,
    status,
    prev_status: prevStatus ?? (status === 'completed' ? 'processing' : status === 'failed' || status === 'cancelled' ? 'running' : null),
    status_reason: statusReason ?? (status === 'failed' ? error : status === 'cancelled' ? 'cancelled-by-user' : null),
    entered_status_at: enteredAt,
    priority: subscription ? 10 : 0,
    group_key: subscription ? `sub:${subscription.id}` : new URL(item.url).host,
    attempt: attempt ?? (status === 'queued' ? 0 : status === 'failed' && lastError?.retryable ? 3 : 1),
    max_attempts: 5,
    next_retry_at: nextRetryAt,
    created_at: createdAt,
    updated_at: terminal ? enteredAt : NOW - rng.int(5, 60) * 1000,
    input_json: JSON.stringify(input),
    progress_json: JSON.stringify(progress ?? (status === 'completed'
      ? { percent: 1, bytesDownloaded: size, bytesTotal: size, speedBps: null, etaMs: null, ticks: rng.int(80, 900) }
      : { percent: null, bytesDownloaded: null, bytesTotal: null, speedBps: null, etaMs: null, ticks: 0 })),
    output_json: output ? JSON.stringify(output) : null,
    last_error_json: lastError ? JSON.stringify(lastError) : null
  })
  if (status !== 'queued') {
    insertAttempt.run(randomUUID(), id, 1, startedAt, terminal ? enteredAt : null, status === 'completed' ? 0 : status === 'failed' ? 1 : null,
      error, status === 'completed' ? `[download] 100% of ${(size / 1048576).toFixed(2)}MiB in ${Math.round(elapsed / 1000)}s` : null,
      lastError ? lastError.rawMessage : null, rng.id(16, '0123456789abcdef'))
  }
  taskIdByUrl.set(item.url, id)
  return id
}

// ---- Subscriptions --------------------------------------------------------
const insertSub = db.prepare(`INSERT INTO subscriptions (id, title, source_url, feed_url, platform, keywords, tags, only_latest, enabled,
  cover_url, latest_video_title, latest_video_published_at, last_checked_at, last_success_at, status, last_error, created_at, updated_at,
  download_directory, naming_template, auto_download, download_type, download_quality, download_container)
  VALUES (@id, @title, @source_url, @feed_url, @platform, @keywords, @tags, @only_latest, @enabled, @cover_url, @latest_video_title,
  @latest_video_published_at, @last_checked_at, @last_success_at, @status, @last_error, @created_at, @updated_at, @download_directory,
  @naming_template, @auto_download, @download_type, @download_quality, @download_container)`)
const insertItem = db.prepare(`INSERT INTO subscription_items (subscription_id, item_id, title, url, published_at, thumbnail, added, task_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

const pubAt = (ch, index) => {
  const gap = { youtube: 9, bilibili: 12 }[ch.platform] ?? 14
  return NOW - (ch.items.length - 1 - index) * gap * DAY - (ch.key.length * 3 + 2) * HOUR
}

const subs = []
for (const ch of CHANNELS.filter((c) => c.subscribed)) {
  const id = randomUUID()
  const createdAt = NOW - rng.int(150, 240) * DAY
  const latest = ch.items[ch.items.length - 1]
  const sub = { id, ch, createdAt }
  subs.push(sub)
  const disabled = ch.key === 'woodshop'
  const checkedAt = NOW - rng.int(20, 170) * 60_000
  insertSub.run({
    id,
    title: ch.name,
    source_url: ch.sourceUrl,
    feed_url: ch.feedUrl,
    platform: ch.platform === 'bilibili' ? 'bilibili' : 'youtube',
    keywords: JSON.stringify(ch.key === 'longclimb' ? ['Ep.'] : ch.key === 'chenwei' ? ['评测', '指南'] : []),
    tags: JSON.stringify(ch.tags),
    only_latest: ch.key === 'tokyowalks' ? 1 : 0,
    enabled: disabled ? 0 : 1,
    cover_url: ch.coverUrl,
    latest_video_title: latest.title,
    latest_video_published_at: pubAt(ch, latest.index),
    last_checked_at: checkedAt,
    last_success_at: ch.failing ? checkedAt - 9 * DAY : checkedAt,
    status: ch.failing ? 'failed' : disabled ? 'idle' : 'up-to-date',
    last_error: ch.failing ? 'Status code 404' : null,
    created_at: createdAt,
    updated_at: checkedAt,
    download_directory: ch.key === 'longclimb' ? path.join(downloadDir, 'Podcasts') : null,
    naming_template: null,
    auto_download: ch.key === 'orbital' || ch.key === 'tokyowalks' ? 0 : 1,
    download_type: ch.audio ? 'audio' : null,
    download_quality: ch.key === 'tokyowalks' ? 'best' : null,
    download_container: null
  })
}

// ---- History --------------------------------------------------------------
// Subscription channels: most feed items were auto-downloaded on publish.
for (const sub of subs) {
  const { ch } = sub
  for (const item of ch.items) {
    const published = pubAt(ch, item.index)
    if (published < sub.createdAt) {
      // Back catalogue grabbed manually before subscribing (some of it).
      if (rng.next() < 0.45) {
        addTask(item, { status: 'completed', createdAt: published + rng.int(1, 30) * DAY + rng.int(0, 23) * HOUR, audio: Boolean(ch.audio) })
      }
      continue
    }
    if (ch.key === 'orbital' || ch.key === 'tokyowalks' || ch.key === 'woodshop') {
      // Manual-only subscriptions: user picks some.
      if (rng.next() < 0.6) addTask(item, { status: 'completed', createdAt: published + rng.int(2, 40) * HOUR, audio: false })
      continue
    }
    const roll = rng.next()
    const status = roll < 0.86 ? "completed" : roll < 0.93 ? "failed" : "cancelled"
    const error = status === 'failed' ? rng.pick(['http-429', 'auth-required', 'network-transient', 'not-found']) : null
    addTask(item, { status, createdAt: published + rng.int(10, 90) * 60_000, audio: Boolean(ch.audio), subscription: sub, error })
  }
}

// Non-subscription channels: one-off manual downloads spread across months.
const oneOffs = ALL_ITEMS.filter((it) => !it.channel.subscribed && !usedUrls.has(it.url))
// Playlist download: Lofi Harbor mixes as a playlist.
const lofi = CHANNELS.find((c) => c.key === 'lofiharbor')
const plCreated = NOW - 96 * DAY
lofi.items.forEach((item, index) => {
  addTask(item, {
    status: index === 3 ? 'failed' : 'completed',
    error: index === 3 ? 'ffmpeg' : null,
    createdAt: plCreated + index * 4000,
    audio: true,
    playlist: { id: 'PLx8kQ2lofiHarborStudyMixes', title: 'Study Mixes 2026', index, size: lofi.items.length }
  })
})
for (const item of oneOffs) {
  if (usedUrls.has(item.url)) continue
  const ch = item.channel
  const createdAt = NOW - rng.int(2, 235) * DAY - rng.int(0, 23) * HOUR - rng.int(0, 59) * 60_000
  const roll = rng.next()
  let status = 'completed'
  let error = null
  if (roll > 0.9) {
    status = 'failed'
    error = ch.platform === 'twitch' ? 'auth-required' : ch.platform === 'x' ? 'http-429' : rng.pick(['network-transient', 'disk-full'])
  } else if (roll > 0.85) status = 'cancelled'
  addTask(item, { status, error, createdAt, audio: Boolean(ch.audio) })
}

// ---- Active queue ---------------------------------------------------------
const pending = [
  // Recovered as running on boot (the yt-dlp stub resumes them slowly).
  { url: 'speedrun_sage', status: 'running', pct: 0.41 },
  { url: 'Tokyo Street Walks 4K', status: 'running', pct: 0.67 },
  { url: 'Deep Dive FM', status: 'running', pct: 0.18 },
  // Waiting for a slot.
  { url: 'Kitchen Lab with Mara Okafor', status: 'queued' },
  { url: 'MKR Design Talks', status: 'queued' },
  // Paused by the user.
  { url: 'Practical Woodshop', status: 'paused', pct: 0.23 },
  { url: 'Orbital Mechanics Explained', status: 'paused', pct: 0.52 },
  // Waiting to retry after a rate limit.
  { url: 'Urbanism Now', status: 'retry-scheduled', pct: 0.08 }
]
// Pick not-yet-used items from those channels (fall back to re-downloads).
for (const p of pending) {
  const ch = CHANNELS.find((c) => c.name === p.url)
  const item = ch.items.find((it) => !usedUrls.has(it.url)) ?? ch.items[ch.items.length - 1]
  const createdAt = NOW - rng.int(4, 50) * 60_000
  const bytesTotal = Math.round(item.duration * (ch.audio ? 16_500 : 430_000))
  const progress = p.pct
    ? { percent: p.pct, bytesDownloaded: Math.round(bytesTotal * p.pct), bytesTotal, speedBps: p.status === 'running' ? rng.int(1, 6) * 1048576 : null, etaMs: null, ticks: rng.int(20, 300) }
    : null
  addTask(item, {
    status: p.status,
    createdAt,
    audio: Boolean(ch.audio),
    progress,
    statusReason: p.status === 'paused' ? 'paused-by-user' : p.status === 'retry-scheduled' ? 'http-429' : null,
    prevStatus: p.status === 'queued' ? null : 'running',
    nextRetryAt: p.status === 'retry-scheduled' ? NOW + 6 * HOUR : null,
    error: p.status === 'retry-scheduled' ? 'http-429' : null,
    attempt: p.status === 'retry-scheduled' ? 2 : p.status === 'queued' ? 0 : 1
  })
}

// ---- Feed items for each subscription ---------------------------------------
for (const sub of subs) {
  const { ch } = sub
  for (const item of ch.items) {
    const published = pubAt(ch, item.index)
    const taskId = taskIdByUrl.get(item.url) ?? null
    insertItem.run(sub.id, ch.platform === 'bilibili' ? item.url : item.id, item.title, item.url, published, item.thumbnail, taskId ? 1 : 0, taskId,
      Math.max(published, sub.createdAt), Math.max(published, sub.createdAt))
  }
}

const counts = db.prepare('SELECT status, COUNT(*) n FROM tasks GROUP BY status').all()
const subCount = db.prepare('SELECT COUNT(*) n FROM subscriptions').get().n
db.close()

console.log('[seed] tasks:', counts.map((c) => `${c.status}=${c.n}`).join(' '), `| subscriptions=${subCount}`)
