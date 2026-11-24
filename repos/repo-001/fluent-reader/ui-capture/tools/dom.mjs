// Boot smoke test without a real browser: node dom.mjs <base-url>
import { JSDOM, VirtualConsole } from "jsdom"
const base = process.argv[2] || "http://localhost:5432/"
const vc = new VirtualConsole()
vc.on("error", (...a) => console.log("console.error:", String(a[0]).slice(0, 300)))
vc.on("jsdomError", e => console.log("jsdomError:", e.message.slice(0, 300)))
const dom = await JSDOM.fromURL(base, {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
        w.fetch = (u, o) => { const s = String(u); console.log("fetch", s.slice(0, 120), o && o.body ? String(o.body).slice(0, 100) : ""); const full = new URL(s, base); return fetch(full.origin === new URL(base).origin ? full : new URL("/__stub/proxy?url=" + encodeURIComponent(full.href), base), o) }
        w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
        w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
        const P = w.HTMLElement.prototype; P.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, width: 400, height: 300, right: 400, bottom: 300 }); for (const k of ["offsetHeight","clientHeight","scrollHeight"]) Object.defineProperty(P, k, { get: () => 300 }); for (const k of ["offsetWidth","clientWidth","scrollWidth"]) Object.defineProperty(P, k, { get: () => 400 }); w.Element.prototype.scrollIntoViewIfNeeded = function () {}; w.innerWidth = 1440; w.innerHeight = 900; w.TextDecoder = TextDecoder; w.TextEncoder = TextEncoder; w.MessageChannel = MessageChannel; w.structuredClone = structuredClone; w.CSS = { supports: () => false, escape: s => s }
    },
})
await new Promise(r => setTimeout(r, 15000))
const d = dom.window.document
console.log("body classes:", d.body.className)
console.log("text sample:", d.body.textContent.replace(/\s+/g, " ").slice(0, 1500))
const card = d.querySelectorAll("[data-iid]")[Number(process.env.CARD || 0)]; card && card.click(); await new Promise(r => setTimeout(r, 3000)); const wv = d.querySelector("webview"); console.log("webview:", !!wv, wv && wv.querySelector("iframe") && wv.querySelector("iframe").getAttribute("src").slice(0, 160)); console.log("log menu:", d.querySelectorAll(".ms-Callout").length); console.log("cards:", d.querySelectorAll("[data-iid]").length)
process.exit(0)
