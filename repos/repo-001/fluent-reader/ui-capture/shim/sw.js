// Routes every request to a host other than this server to the local stub
// (/__stub/proxy), so feeds, favicons and article images resolve offline.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", event => {
    const url = new URL(event.request.url)
    if (url.origin === self.location.origin) return
    if (url.protocol !== "http:" && url.protocol !== "https:") return
    event.respondWith(
        fetch("/__stub/proxy?url=" + encodeURIComponent(url.href), {
            credentials: "omit",
        })
    )
})
