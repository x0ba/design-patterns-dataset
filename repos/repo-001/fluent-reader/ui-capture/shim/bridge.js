// Browser stand-in for src/preload.ts: provides window.settings / window.utils /
// window.db with the same signatures as src/bridges/*, backed by the local
// Node server (.ui-capture/server.mjs) instead of Electron IPC.
;(function () {
    "use strict"

    function syncJSON(method, url, body) {
        const xhr = new XMLHttpRequest()
        xhr.open(method, url, false)
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(body === undefined ? null : JSON.stringify(body))
        return xhr.responseText ? JSON.parse(xhr.responseText) : undefined
    }
    async function postJSON(url, body) {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data && data.error)
        return data
    }

    // ---- electron-store equivalent ----
    const store = syncJSON("GET", "/__api/store") || {}
    function get(key, def) {
        return key in store ? store[key] : def
    }
    function set(key, value) {
        store[key] = value
        postJSON("/__api/store", { key, value }).catch(console.error)
        return Promise.resolve()
    }

    function nextGroupId() {
        const ids = get("sourceGroups", []).map(g => g.gid)
        for (const key of Object.keys(get("sourceRules", {})))
            if (key.startsWith("group:")) ids.push(Number(key.slice(6)))
        return Math.max(
            get("nextGroupId", 0),
            ...ids
                .filter(id => Number.isSafeInteger(id) && id >= 0)
                .map(id => id + 1)
        )
    }
    function allocateGroupId() {
        const gid = nextGroupId()
        set("nextGroupId", gid + 1)
        return gid
    }

    const themeQuery = window.matchMedia("(prefers-color-scheme: dark)")
    function shouldUseDarkColors() {
        const theme = get("theme", "system")
        if (theme === "dark") return true
        if (theme === "light") return false
        return themeQuery.matches
    }
    const themeListeners = []
    themeQuery.addEventListener("change", () =>
        themeListeners.forEach(cb => cb(shouldUseDarkColors()))
    )

    function clampWidth(key, min) {
        const w = get(key, min)
        return Number.isFinite(w) ? Math.max(min, Math.round(w)) : min
    }

    window.settings = {
        allocateGroupId,
        saveGroups: groups => set("sourceGroups", groups),
        loadGroups: () => {
            const groups = get("sourceGroups", []).map(g => ({ ...g }))
            for (const g of groups) delete g.index
            return groups
        },
        getDefaultMenu: () => get("menuOn", false),
        setDefaultMenu: s => {
            set("menuOn", s)
        },
        getProxyStatus: () => get("pacOn", false),
        toggleProxyStatus: () => {
            set("pacOn", !get("pacOn", false))
        },
        getProxy: () => get("pac", ""),
        setProxy: (address = null) => {
            if (address !== null) set("pac", address)
        },
        getDefaultView: () => get("view", 0),
        setDefaultView: v => {
            set("view", v)
        },
        getThemeSettings: () => get("theme", "system"),
        setThemeSettings: t => {
            set("theme", t)
            themeListeners.forEach(cb => cb(shouldUseDarkColors()))
        },
        shouldUseDarkColors,
        addThemeUpdateListener: cb => {
            themeListeners.push(cb)
        },
        setLocaleSettings: o => {
            set("locale", o)
        },
        getLocaleSettings: () => get("locale", "default"),
        getCurrentLocale: () => {
            const s = get("locale", "default")
            return s === "default" ? navigator.language || "en-US" : s
        },
        getFontSize: () => get("fontSize", 16),
        setFontSize: s => {
            set("fontSize", s)
        },
        getFont: () => get("fontFamily", ""),
        setFont: f => {
            set("fontFamily", f)
        },
        getArticleOverlayWidth: () => clampWidth("articleOverlayWidth", 860),
        setArticleOverlayWidth: w =>
            Number.isFinite(w) && w >= 860
                ? set("articleOverlayWidth", Math.round(w))
                : Promise.resolve(),
        getListViewWidth: () => clampWidth("listViewWidth", 350),
        setListViewWidth: w =>
            Number.isFinite(w) && w >= 350
                ? set("listViewWidth", Math.round(w))
                : Promise.resolve(),
        getFetchInterval: () => get("fetchInterval", 0),
        setFetchInterval: i => {
            set("fetchInterval", i)
        },
        getSearchEngine: () => get("searchEngine", 0),
        setSearchEngine: e => {
            set("searchEngine", e)
        },
        getServiceConfigs: () => get("serviceConfigs", { type: 0 }),
        setServiceConfigs: c => {
            set("serviceConfigs", c)
        },
        getFilterType: () => get("filterType", null),
        setFilterType: f => {
            set("filterType", f)
        },
        getViewConfigs: view => (view === 1 ? get("listViewConfigs", 1) : undefined),
        setViewConfigs: (view, c) => {
            if (view === 1) set("listViewConfigs", c)
        },
        getAllRules: () => get("sourceRules", {}),
        setRulesForTarget: (target, rules) => {
            const key =
                target.type === "source"
                    ? `source:${target.sid}`
                    : target.type === "group"
                    ? `group:${target.gid}`
                    : "all"
            const all = { ...get("sourceRules", {}) }
            if (rules.length > 0) all[key] = rules
            else delete all[key]
            return set("sourceRules", all)
        },
        migrateLovefieldRules: () => Promise.resolve(),
        getDBVersion: () => get("dbVersion", null),
        setDBVersion: v => set("dbVersion", v),
        getUnreadSourcesOnly: () => get("menuUnreadSourcesOnly", false),
        setUnreadSourcesOnly: f => {
            set("menuUnreadSourcesOnly", f)
        },
    }

    // ---- utils bridge ----
    const noop = () => {}
    window.utils = {
        platform: "win32",
        getVersion: () => store.version || "1.3.2",
        openExternal: url => {
            window.open("/__stub/page?url=" + encodeURIComponent(url), "_blank")
        },
        showErrorBox: async (title, content) => {
            console.error(title, content)
        },
        showMessageBox: async (title, message) => window.confirm(title + "\n\n" + message),
        showSaveDialog: async () => null,
        showOpenDialog: async () => null,
        getCacheSize: async () => 38_912_410,
        clearCache: async () => {},
        addMainContextListener: noop,
        addWebviewContextListener: () => noop,
        imageCallback: noop,
        addWebviewKeydownListener: () => noop,
        addWebviewErrorListener: () => noop,
        writeClipboard: text => navigator.clipboard?.writeText(text).catch(noop),
        closeWindow: noop,
        minimizeWindow: noop,
        maximizeWindow: noop,
        isMaximized: () => true,
        isFullscreen: () => false,
        isFocused: () => document.hasFocus(),
        focus: () => window.focus(),
        requestAttention: noop,
        addWindowStateListener: cb => {
            window.addEventListener("focus", () => cb(1, true))
            window.addEventListener("blur", () => cb(1, false))
        },
        addTouchBarEventsListener: noop,
        initTouchBar: noop,
        destroyTouchBar: noop,
        initFontList: async () => [
            "Arial",
            "Georgia",
            "Helvetica Neue",
            "Segoe UI",
            "Times New Roman",
            "Verdana",
        ],
    }

    // ---- db bridge (drizzle sqlite-proxy) ----
    window.db = {
        execute: (sql, params, method) =>
            postJSON("/__api/db/execute", { sql, params, method }),
        batch: queries => postJSON("/__api/db/batch", { queries }),
        exportAll: async () => {
            window.location.href = "/__api/db/export"
        },
        importAll: async () => true,
    }

    // ---- <webview> stand-in: render the guest page in an iframe ----
    const style = document.createElement("style")
    style.textContent =
        ":where(webview){display:block}" +
        "webview>iframe{width:100%;height:100%;border:0;display:block;background:transparent}"
    document.head.appendChild(style)

    function guestURL(src) {
        if (/^https?:\/\//i.test(src) && new URL(src).origin !== location.origin)
            return "/__stub/page?url=" + encodeURIComponent(src)
        return src
    }
    function upgrade(wv) {
        if (wv.__iframe) return
        const iframe = document.createElement("iframe")
        iframe.setAttribute("allowtransparency", "true")
        wv.__iframe = iframe
        iframe.addEventListener("load", () =>
            wv.dispatchEvent(new Event("did-stop-loading"))
        )
        wv.reload = () => iframe.contentWindow && iframe.contentWindow.location.reload()
        wv.focus = () => iframe.focus()
        wv.getURL = () => wv.getAttribute("src")
        wv.appendChild(iframe)
        iframe.src = guestURL(wv.getAttribute("src") || "about:blank")
    }
    new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === "attributes" && m.target.tagName === "WEBVIEW") {
                if (m.target.__iframe)
                    m.target.__iframe.src = guestURL(m.target.getAttribute("src"))
                continue
            }
            for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue
                if (n.tagName === "WEBVIEW") upgrade(n)
                else n.querySelectorAll && n.querySelectorAll("webview").forEach(upgrade)
            }
        }
    }).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src"],
    })

    // ---- boot: make sure the stub service worker controls the page so that
    // requests to outside hosts (feeds, favicons, images) stay on localhost ----
    function boot() {
        const s = document.createElement("script")
        s.src = "index.js"
        document.head.appendChild(s)
    }
    if (!("serviceWorker" in navigator)) return boot()
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(() => {
        if (navigator.serviceWorker.controller) boot()
        else
            navigator.serviceWorker.addEventListener("controllerchange", boot, {
                once: true,
            })
    }, boot)
})()
