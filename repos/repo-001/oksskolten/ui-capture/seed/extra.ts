// Generated extension of the demo dataset: ~30 more subscriptions, ~250 articles
// spread over ~7 months with a realistic read/unread/bookmark/like mix, a few
// broken feeds and failed extractions, clipped pages, and more chat history.
import type { SeedCategory, SeedFeed, SeedArticle, SeedConversation } from './dataset.js'
import { ogPath } from './dataset.js'
import { FEED_SPECS } from './feeds-extra.js'
import { POOLS, CLIPS, CONVERSATIONS } from './text-pools.js'

const H = 3600e3
const D = 24 * H

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261116)
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
const pickN = <T,>(arr: T[], n: number) => [...arr].sort(() => rand() - 0.5).slice(0, n)
const slug = (s: string) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

function buildBody(pool: string, title: string, hook: string, lang: string) {
  const P = POOLS[pool]
  const parts: string[] = []
  parts.push(hook)
  parts.push(pick(P.intro))
  const nSections = pool === 'comic' ? 0 : pool === 'news' ? 1 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 3)
  const heads = pickN(P.headings, nSections)
  const paras = pickN(P.paragraphs, Math.min(P.paragraphs.length, nSections * 2 + 1))
  heads.forEach((h, i) => {
    parts.push(`## ${h}`)
    parts.push(paras[i * 2] ?? pick(P.paragraphs))
    if (paras[i * 2 + 1]) parts.push(paras[i * 2 + 1])
    if (i === 0 && P.code && rand() < 0.6) parts.push(pick(P.code))
    if (i === 1 && P.lists && rand() < 0.5) parts.push(pick(P.lists))
  })
  if (P.outro.length) parts.push(pick(P.outro))
  return { body: parts.join('\n\n'), heads }
}

function buildSummary(hook: string, heads: string[], body: string, lang: string) {
  const sentences = body.split(/\n\n/).filter(p => !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('-') && !p.startsWith('|'))
  const pts = heads.slice(0, 4).map((h, i) => {
    const s = (sentences[i + 2] || sentences[1] || '').split(lang === 'ja' ? /(?<=。)/ : /(?<=\.)\s/)[0]
    return `- **${h}** — ${s}`
  })
  return `${hook}\n\n${pts.join('\n')}`
}

export function extraDataset(): { categories: SeedCategory[]; feeds: SeedFeed[]; articles: SeedArticle[]; conversations: SeedConversation[] } {
  const categories: SeedCategory[] = [
    { name: 'Languages', createdAgo: 214 * D },
    { name: 'Infrastructure', createdAgo: 214 * D },
    { name: 'Platform', createdAgo: 212 * D },
    { name: 'Databases', createdAgo: 200 * D },
    { name: 'Web & Frontend', createdAgo: 198 * D },
    { name: 'AI & ML', createdAgo: 190 * D },
    { name: 'Security', createdAgo: 185 * D },
    { name: 'Engineering Culture', createdAgo: 170 * D },
    { name: 'News', createdAgo: 120 * D, collapsed: true },
    { name: '日本語', createdAgo: 100 * D },
  ]

  const feeds: SeedFeed[] = []
  const articles: SeedArticle[] = []

  for (const f of FEED_SPECS) {
    feeds.push({
      key: f.key, name: f.name, url: f.url, rss_url: f.bridge ? null : f.rss, rss_bridge_url: f.bridge ?? null,
      category: f.cat, disabled: f.disabled, requires_js_challenge: f.js,
      last_error: f.error?.msg ?? null, error_count: f.error?.count ?? 0,
      etag: rand() < 0.6 ? `"${Math.floor(rand() * 1e10).toString(16)}"` : null,
      last_modified: rand() < 0.5 ? new Date(Date.now() - rand() * 3 * D).toUTCString() : null,
      check_interval: f.every < 1.5 ? 900 : f.every < 5 ? 3600 : f.every < 15 ? 7200 : 14400,
      createdAgo: f.ageDays * D,
    })

    // newest first; the disabled feed stopped publishing long ago, the 403 feed a few days ago
    let ago = (f.disabled ? 150 : f.error ? 5 : 0) * D + rand() * Math.min(f.every, 2) * D + 2 * H
    const isNews = f.pool === 'news'
    f.titles.forEach((line, idx) => {
      const [title, hook] = line.split(' | ')
      const lang = f.lang ?? 'en'
      const built = buildBody(f.pool, title, hook, lang)
      const heads = built.heads
      let body = built.body
      const days = ago / D
      const pSeen = days < 1.5 ? 0.1 : days < 7 ? 0.45 : days < 30 ? 0.78 : 0.93
      const seen = f.disabled || rand() < pSeen
      const read = seen && rand() < (isNews ? 0.3 : f.pool === 'comic' ? 0.9 : 0.65)
      const seenAgo = seen ? Math.max(ago - (0.1 + rand() * 1.5) * D, 10 * 60e3) : null
      const readAgo = read && seenAgo ? Math.max(seenAgo - rand() * 2 * H, 5 * 60e3) : null
      const bookmarked = read ? rand() < 0.13 : !seen && rand() < 0.04
      const liked = read && rand() < 0.11
      const hasOg = f.pool === 'comic' ? true : rand() < (isNews || f.pool === 'frontend' || f.pool === 'ai' ? 0.8 : 0.45)
      const failed = (isNews && idx % 5 === 3) || (f.key === 'pragmatic' && idx % 4 === 1)
      const datePath = f.key === 'krebs' || f.key === 'verge' || f.key === 'ars'
        ? `/${new Date(Date.now() - ago).getFullYear()}/${String(new Date(Date.now() - ago).getMonth() + 1).padStart(2, '0')}`
        : ''
      const url = f.key === 'hn'
        ? `https://news.ycombinator.com/item?id=${45800000 - Math.floor(ago / 60e3)}`
        : lang === 'ja'
          ? `${f.url}/articles/${f.key}-${((idx + 1) * 7919).toString(36)}`
          : `${f.url.replace(/\/$/, '')}${datePath}/${slug(title)}${f.key === 'xkcd' ? '' : '/'}`.replace('/changes.html/', `/releaselog/${slug(title).replace('sqlite-', '').replace(/-/g, '_')}.html`)

      if (f.pool === 'comic') body = `![${title}](${ogPath(f.name, url)})\n\n*${hook}*`
      articles.push({
        feed: f.key, title, url, lang,
        full_text: failed ? null : body,
        last_error: failed ? pick(['Readability could not extract article content (paywall or script-rendered page)', 'HTTP 451 Unavailable For Legal Reasons', 'Fetch timeout after 30000ms']) : null,
        excerpt: hook,
        summary: !failed && read && rand() < 0.55 ? buildSummary(hook, heads, body, lang) : null,
        full_text_translated: !failed && lang === 'ja' && read ? POOLS.ja_en_translation(title, hook, heads) : null,
        translated_lang: !failed && lang === 'ja' && read ? 'en' : null,
        og_image: hasOg ? ogPath(f.name, url) : null,
        publishedAgo: ago,
        seenAgo, readAgo,
        bookmarkedAgo: bookmarked ? (readAgo ?? ago) - 3 * 60e3 : null,
        likedAgo: liked && readAgo ? readAgo - 60e3 : null,
      })
      ago += f.every * 2.2 * (0.45 + rand() * 1.1) * D
      if (ago > f.ageDays * D) ago = f.ageDays * D - idx * H
    })
  }

  // clipped pages saved by hand
  for (const c of CLIPS) {
    articles.push({
      feed: '__clip', title: c.title, url: c.url, full_text: c.body, excerpt: c.body.split('\n\n')[0].slice(0, 200),
      og_image: c.og ? ogPath(c.site, c.url) : null,
      publishedAgo: c.ago * D, seenAgo: c.ago * D - 60e3, readAgo: c.read ? c.ago * D - 30 * 60e3 : null,
      bookmarkedAgo: c.bookmarked ? c.ago * D - 2 * 60e3 : null, likedAgo: c.liked ? c.ago * D - 40 * 60e3 : null,
      summary: c.summary ?? null,
    })
  }

  return { categories, feeds, articles, conversations: CONVERSATIONS }
}
