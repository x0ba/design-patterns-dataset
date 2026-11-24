// Seeds a fresh Oksskolten SQLite database (DATA_DIR) for an established user.
// Uses the app's own migrations + db helpers; rows are inserted against the
// app schema the same way server/seed.ts does. Dates are relative to "now",
// so start.sh re-runs this on every start.
//
//   DATA_DIR=.ui-capture/data npx tsx .ui-capture/seed/seed.ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { runMigrations, ensureClipFeed, upsertSetting, recalculateScores, getOrCreateJwtSecret } from '../../server/db.js'
import { getDb } from '../../server/db/connection.js'
import { buildDataset, type SeedFeed, type SeedArticle, type SeedConversation } from './dataset.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')

export const USER = { email: 'maya.lindqvist@fastmail.com', password: 'fjellstue-2026' }

const now = Date.now()
const iso = (msAgo: number | null | undefined) => (msAgo == null ? null : new Date(now - msAgo).toISOString())

runMigrations()
ensureClipFeed()
getOrCreateJwtSecret()
const db = getDb()

// ---------------------------------------------------------------- account
db.prepare('INSERT INTO users (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)')
  .run(USER.email, bcrypt.hashSync(USER.password, 10), iso(212 * 86400e3), iso(40 * 86400e3))

// ---------------------------------------------------------------- settings
const settings: Record<string, string> = {
  'general.language': 'en',
  'api_key.anthropic': 'sk-ant-api03-local-stub-key-not-real-0000000000000000000000000000',
  'chat.provider': 'anthropic',
  'chat.model': 'claude-sonnet-4-6',
  'summary.provider': 'anthropic',
  'summary.model': 'claude-haiku-4-5-20251001',
  'translate.provider': 'anthropic',
  'translate.model': 'claude-sonnet-4-6',
  'translate.target_lang': 'en',
  'reading.show_thumbnails': 'on',
  'reading.date_mode': 'relative',
  'reading.auto_mark_read': 'on',
  'reading.unread_indicator': 'on',
  'reading.show_feed_activity': 'on',
  'reading.keyboard_navigation': 'on',
  'retention.enabled': 'on',
  'retention.read_days': '180',
  'retention.unread_days': '365',
}
for (const [k, v] of Object.entries(settings)) upsertSetting(k, v)

// ---------------------------------------------------------------- dataset
const demoFeeds = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/demo/seed/feeds.json'), 'utf-8'))
const demoArticles = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/demo/seed/articles.json'), 'utf-8'))
const demoConvs = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/demo/seed/en/conversations.json'), 'utf-8'))
const { categories, feeds, articles, conversations } = buildDataset({ demoFeeds, demoArticles, demoConvs, now })

const catIds = new Map<string, number>()
categories.forEach((c, i) => {
  const r = db.prepare('INSERT INTO categories (name, sort_order, collapsed, created_at) VALUES (?, ?, ?, ?)')
    .run(c.name, i, c.collapsed ? 1 : 0, iso(c.createdAgo))
  catIds.set(c.name, Number(r.lastInsertRowid))
})

const feedIds = new Map<string, number>()
const insFeed = db.prepare(`INSERT INTO feeds (name, url, rss_url, rss_bridge_url, type, category_id, disabled, requires_js_challenge,
  last_error, error_count, etag, last_modified, next_check_at, check_interval, created_at)
  VALUES (?, ?, ?, ?, 'rss', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
for (const f of feeds as SeedFeed[]) {
  const r = insFeed.run(f.name, f.url, f.rss_url, f.rss_bridge_url ?? null, f.category ? catIds.get(f.category) ?? null : null,
    f.disabled ? 1 : 0, f.requires_js_challenge ? 1 : 0, f.last_error ?? null, f.error_count ?? 0,
    f.etag ?? null, f.last_modified ?? null, new Date(now + 6 * 3600e3).toISOString(), f.check_interval ?? 3600, iso(f.createdAgo))
  feedIds.set(f.key, Number(r.lastInsertRowid))
}
const clipFeedId = (db.prepare("SELECT id FROM feeds WHERE type = 'clip'").get() as { id: number }).id

const insArticle = db.prepare(`INSERT OR IGNORE INTO articles (feed_id, category_id, title, url, lang, full_text, full_text_translated, translated_lang,
  summary, excerpt, og_image, last_error, seen_at, read_at, bookmarked_at, liked_at, published_at, fetched_at, created_at)
  VALUES (?, (SELECT category_id FROM feeds WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
const articleIds = new Map<string, number>()
db.transaction(() => {
  for (const a of articles as SeedArticle[]) {
    const fid = a.feed === '__clip' ? clipFeedId : feedIds.get(a.feed)
    if (!fid) throw new Error(`unknown feed ${a.feed}`)
    const r = insArticle.run(fid, fid, a.title, a.url, a.lang ?? 'en', a.full_text, a.full_text_translated ?? null, a.translated_lang ?? null,
      a.summary ?? null, a.excerpt ?? null, a.og_image ?? null, a.last_error ?? null,
      iso(a.seenAgo), iso(a.readAgo), iso(a.bookmarkedAgo), iso(a.likedAgo),
      iso(a.publishedAgo), iso(a.publishedAgo - 40 * 60e3 > 0 ? a.publishedAgo - 40 * 60e3 : 0), iso(Math.max(0, a.publishedAgo - 40 * 60e3)))
    if (r.changes) articleIds.set(a.url, Number(r.lastInsertRowid))
  }
})()

// conversations
const insConv = db.prepare('INSERT INTO conversations (id, title, article_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
const insMsg = db.prepare('INSERT INTO chat_messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)')
db.transaction(() => {
  for (const c of conversations as SeedConversation[]) {
    const aid = c.articleUrl ? articleIds.get(c.articleUrl) ?? null : null
    const end = c.createdAgo - c.messages.length * 45e3
    insConv.run(c.id, c.title, aid, iso(c.createdAgo), iso(end))
    c.messages.forEach((m, i) => insMsg.run(c.id, m.role, JSON.stringify([{ type: 'text', text: m.text }]), iso(c.createdAgo - i * 45e3)))
  }
})()

// similar-article links (same feed, overlapping title words) so "related" panels have content
const all = db.prepare('SELECT id, title, feed_id FROM articles').all() as { id: number; title: string; feed_id: number }[]
const words = (t: string) => new Set(t.toLowerCase().match(/[a-z][a-z0-9]{3,}/g) || [])
const insSim = db.prepare('INSERT OR IGNORE INTO article_similarities (article_id, similar_to_id, score) VALUES (?, ?, ?)')
db.transaction(() => {
  for (const a of all) {
    const wa = words(a.title)
    for (const b of all) {
      if (b.id <= a.id || b.feed_id === a.feed_id) continue
      const wb = words(b.title)
      const shared = [...wa].filter(w => wb.has(w)).length
      if (shared >= 2) insSim.run(a.id, b.id, Math.min(0.95, 0.55 + shared * 0.1))
    }
  }
})()

const { updated } = recalculateScores()
const counts = db.prepare(`SELECT (SELECT COUNT(*) FROM feeds) f, (SELECT COUNT(*) FROM articles) a,
  (SELECT COUNT(*) FROM articles WHERE seen_at IS NULL) unread, (SELECT COUNT(*) FROM conversations) c`).get()
console.log('[seed] done', counts, `scores=${updated}`)
db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
db.close()
