// Assembles the seed dataset: the repo's own demo feeds/articles/conversations
// (src/lib/demo/seed) plus the generated extension in ./extra.ts.
import { extraDataset } from './extra.js'

export interface SeedCategory { name: string; collapsed?: boolean; createdAgo: number }
export interface SeedFeed {
  key: string; name: string; url: string; rss_url: string | null; rss_bridge_url?: string | null
  category: string | null; disabled?: boolean; requires_js_challenge?: boolean
  last_error?: string | null; error_count?: number; etag?: string | null; last_modified?: string | null
  check_interval?: number; createdAgo: number
}
export interface SeedArticle {
  feed: string; title: string; url: string; lang?: string; full_text: string | null
  full_text_translated?: string | null; translated_lang?: string | null
  summary?: string | null; excerpt?: string | null; og_image?: string | null; last_error?: string | null
  publishedAgo: number; seenAgo?: number | null; readAgo?: number | null; bookmarkedAgo?: number | null; likedAgo?: number | null
}
export interface SeedConversation {
  id: string; title: string; articleUrl: string | null; createdAgo: number
  messages: { role: 'user' | 'assistant'; text: string }[]
}

const H = 3600e3
const D = 24 * H

/** "-3d" / "-2d23h" → ms ago (mirrors server/seed.ts resolveRelativeDate) */
export function relMs(v: string | null | undefined): number | null {
  if (!v) return null
  const m = v.match(/^-(\d+)d(?:(\d+)h)?$/)
  if (!m) return null
  return Number(m[1]) * D + (m[2] ? Number(m[2]) * H : 0)
}

export function ogPath(label: string, url: string): string {
  const slug = label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const tail = url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9]+/g, '-').slice(-40)
  return `/__stub/og/${encodeURIComponent(slug)}--${tail}.svg`
}

export function buildDataset({ demoFeeds, demoArticles, demoConvs, now }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  demoFeeds: any[]; demoArticles: any[]; demoConvs: any[]; now: number
}) {
  const extra = extraDataset()

  const categories: SeedCategory[] = [...extra.categories]
  const feeds: SeedFeed[] = []
  for (const f of demoFeeds) {
    feeds.push({
      key: `demo-${f.id}`, name: f.name, url: f.url, rss_url: f.rss_url, category: f.category_name,
      createdAgo: relMs(f.created_at) ?? 200 * D, etag: `W/"${(f.id * 7919).toString(16)}a3"`, check_interval: 3600,
    })
  }
  feeds.push(...extra.feeds)

  const articles: SeedArticle[] = []
  for (const a of demoArticles) {
    const feed = demoFeeds.find((f: { id: number }) => f.id === a.feed_id)
    articles.push({
      feed: `demo-${a.feed_id}`, title: a.title, url: a.url, lang: a.lang, full_text: a.full_text,
      // the demo build ships a Japanese "translation pending" placeholder; an English reader has no translation
      full_text_translated: null, translated_lang: null,
      summary: a.summary, excerpt: a.excerpt,
      og_image: a.og_image ? ogPath(feed?.name ?? 'Blog', a.url) : null,
      publishedAgo: relMs(a.published_at) ?? 5 * D,
      seenAgo: relMs(a.seen_at), readAgo: relMs(a.read_at), bookmarkedAgo: relMs(a.bookmarked_at), likedAgo: relMs(a.liked_at),
    })
  }
  articles.push(...extra.articles)

  const conversations: SeedConversation[] = []
  for (const c of demoConvs) {
    const created = Math.max(2 * D, now - Date.parse(c.created_at))
    conversations.push({
      id: c.id.replace('demo-', ''), title: c.title, articleUrl: c.article_url ?? null,
      createdAgo: Math.min(created, 60 * D),
      messages: c.messages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
        role: m.role,
        text: (JSON.parse(m.content) as { type: string; text?: string }[]).filter(b => b.type === 'text').map(b => b.text).join('\n'),
      })),
    })
  }
  conversations.push(...extra.conversations)

  return { categories, feeds, articles, conversations }
}
