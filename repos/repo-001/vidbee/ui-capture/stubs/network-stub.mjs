// Preloaded into the API process (NODE_OPTIONS=--import) so outbound calls to
// third-party services resolve locally:
//   - YouTube / RSSHub feeds         -> Atom/RSS generated from catalog.mjs
//   - Thumbnail / avatar CDNs        -> SVG title cards (served via /images/proxy)
//   - GitHub "latest yt-dlp" lookup  -> fixed release tag (engine shows up-to-date)
// Any other non-local host behaves like the machine is offline.
import { createRequire, syncBuiltinESMExports } from 'node:module'
import { ALL_ITEMS, CHANNELS, avatarSvg, findChannelByCover, findItemByThumb, thumbnailSvg } from '../catalog.mjs'

const require = createRequire(import.meta.url)
const dnsPromises = require('node:dns/promises')

export const STUB_YTDLP_VERSION = '2026.11.12'

const IMAGE_HOSTS = [
  'i.ytimg.com', 'yt3.googleusercontent.com', 'yt3.ggpht.com', 'i0.hdslb.com', 'i1.hdslb.com', 'i2.hdslb.com',
  'i1.sndcdn.com', 'i.vimeocdn.com', 'static-cdn.jtvnw.net', 'pbs.twimg.com', 'p16-sign-va.tiktokcdn.com'
]
const FAVICONS = {
  'youtube.com': ['#ff0033', 'play'], 'youtu.be': ['#ff0033', 'play'], 'bilibili.com': ['#00a1d6', 'b'],
  'vimeo.com': ['#1ab7ea', 'v'], 'soundcloud.com': ['#ff5500', 'wave'], 'twitch.tv': ['#9146ff', 't'],
  'x.com': ['#000000', 'X'], 'twitter.com': ['#000000', 'X'], 'tiktok.com': ['#010101', '♪']
}
const faviconSvg = (domain) => {
  const [color, glyph] = FAVICONS[domain] ?? ['#64748b', domain.slice(0, 1).toUpperCase()]
  const inner = glyph === 'play'
    ? '<path d="M13 10.5v11l9.5-5.5z" fill="#fff"/>'
    : glyph === 'wave'
      ? '<path d="M7 20v-4M10 21v-7M13 21v-9M16 21v-10M19 21h6a3.5 3.5 0 0 0 0-7 5 5 0 0 0-6-3z" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>'
      : `<text x="16" y="22" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-weight="800" font-size="17" fill="#fff">${glyph}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/>${inner}</svg>`
}
const baseDomain = (host) => host.replace(/^(www|m|space|i\d?)\./, '')
const STUB_HOSTS = new Set([...IMAGE_HOSTS, 'www.youtube.com', 'youtube.com', 'rsshub.app', 'api.github.com', 'github.com', 'favicon.im',
  ...Object.keys(FAVICONS), ...Object.keys(FAVICONS).map((d) => `www.${d}`)])

const realFetch = globalThis.fetch
const realLookup = dnsPromises.lookup

const isLocal = (host) => host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]'

const esc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c])

// Fixed "now" anchor so feed dates line up with the seeded data.
const NOW = Date.now()
const publishedAt = (ch, index) => {
  const gap = { youtube: 9, bilibili: 12 }[ch.platform] ?? 14
  return new Date(NOW - (ch.items.length - 1 - index) * gap * 86400000 - (ch.key.length * 3 + 2) * 3600000)
}

const youtubeFeed = (ch) => {
  const entries = [...ch.items].reverse().map((it) => `
  <entry>
    <id>yt:video:${it.id}</id>
    <yt:videoId>${it.id}</yt:videoId>
    <yt:channelId>${ch.channelId}</yt:channelId>
    <title>${esc(it.title)}</title>
    <link rel="alternate" href="${it.url}"/>
    <author><name>${esc(ch.name)}</name><uri>https://www.youtube.com/channel/${ch.channelId}</uri></author>
    <published>${publishedAt(ch, it.index).toISOString()}</published>
    <updated>${publishedAt(ch, it.index).toISOString()}</updated>
    <media:group>
      <media:title>${esc(it.title)}</media:title>
      <media:content url="https://www.youtube.com/v/${it.id}?version=3" type="application/x-shockwave-flash" width="640" height="390"/>
      <media:thumbnail url="${it.thumbnail}" width="480" height="360"/>
      <media:description>${esc(it.description)}</media:description>
    </media:group>
  </entry>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <link rel="self" href="${ch.feedUrl}"/>
  <id>yt:channel:${ch.channelId}</id>
  <yt:channelId>${ch.channelId}</yt:channelId>
  <title>${esc(ch.name)}</title>
  <link rel="alternate" href="https://www.youtube.com/channel/${ch.channelId}"/>
  <author><name>${esc(ch.name)}</name><uri>https://www.youtube.com/channel/${ch.channelId}</uri></author>
  <published>2019-04-02T10:00:00+00:00</published>${entries}
</feed>`
}

const rsshubFeed = (ch) => {
  const items = [...ch.items].reverse().map((it) => `
    <item>
      <title><![CDATA[${it.title}]]></title>
      <description><![CDATA[${it.description}<br><img src="${it.thumbnail}">]]></description>
      <pubDate>${publishedAt(ch, it.index).toUTCString()}</pubDate>
      <guid isPermaLink="false">${it.url}</guid>
      <link>${it.url}</link>
      <enclosure url="${it.thumbnail}" type="image/jpeg"/>
    </item>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
  <channel>
    <title><![CDATA[${ch.name} 的 bilibili 空间]]></title>
    <link>${ch.sourceUrl}</link>
    <description><![CDATA[${ch.name} 的 bilibili 空间 - Powered by RSSHub]]></description>
    <image><url>${ch.coverUrl}</url><title>${esc(ch.name)}</title><link>${ch.sourceUrl}</link></image>
    <lastBuildDate>${new Date(NOW).toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`
}

const respond = (body, status, type) =>
  new Response(body, { status, headers: { 'content-type': type, 'cache-control': 'public, max-age=86400' } })

const stubResponse = (url) => {
  const host = url.hostname
  if (host === 'favicon.im') return respond(faviconSvg(baseDomain(decodeURIComponent(url.pathname.slice(1)))), 200, 'image/svg+xml')
  if (url.pathname === '/favicon.ico' || url.pathname.endsWith('/favicon.ico')) return respond(faviconSvg(baseDomain(host)), 200, 'image/svg+xml')
  if (IMAGE_HOSTS.includes(host)) {
    const ch = findChannelByCover(url.href)
    if (ch) return respond(avatarSvg(ch), 200, 'image/svg+xml')
    const item = findItemByThumb(url.href) ?? ALL_ITEMS.find((it) => url.href.includes(it.id))
    return respond(thumbnailSvg(item ?? null), 200, 'image/svg+xml')
  }
  if ((host === 'www.youtube.com' || host === 'youtube.com') && url.pathname === '/feeds/videos.xml') {
    const ch = CHANNELS.find((c) => c.channelId && c.channelId === url.searchParams.get('channel_id'))
    if (!ch || ch.failing) return respond('<html><body>404 Not Found</body></html>', 404, 'text/html')
    return respond(youtubeFeed(ch), 200, 'application/atom+xml; charset=UTF-8')
  }
  if (host === 'rsshub.app') {
    const uid = url.pathname.split('/').pop()
    const ch = CHANNELS.find((c) => c.uid === uid)
    if (!ch) return respond('Not Found', 404, 'text/plain')
    return respond(rsshubFeed(ch), 200, 'application/rss+xml; charset=utf-8')
  }
  if (host === 'api.github.com' && url.pathname.includes('/yt-dlp/')) {
    return respond(JSON.stringify({ tag_name: STUB_YTDLP_VERSION, name: `yt-dlp ${STUB_YTDLP_VERSION}`, published_at: '2026-11-12T22:41:07Z' }), 200, 'application/json')
  }
  return null
}

globalThis.fetch = async (input, init) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url
  let url
  try {
    url = new URL(href)
  } catch {
    return realFetch(input, init)
  }
  if (isLocal(url.hostname)) return realFetch(input, init)
  const stubbed = stubResponse(url)
  if (stubbed) return stubbed
  // Behave like an offline machine for everything else.
  throw new TypeError('fetch failed', { cause: new Error(`getaddrinfo ENOTFOUND ${url.hostname}`) })
}

dnsPromises.lookup = async (hostname, options) => {
  if (STUB_HOSTS.has(String(hostname).toLowerCase())) {
    const record = { address: '203.0.113.10', family: 4 }
    return options && typeof options === 'object' && options.all ? [record] : record
  }
  return realLookup(hostname, options)
}
syncBuiltinESMExports()
