// Browser-side Tauri v1 IPC bridge.
// The Sophosia front end talks to its Rust host through window.__TAURI_IPC__.
// In a plain browser there is no host, so this script provides that global and
// forwards filesystem / path / os / sqlite / fs-extra calls to the local Node
// server (server.mjs) which performs the real work on disk. Window, event,
// dialog, shell and updater calls are answered locally.
(function () {
  const VIRTUAL_HOME = "/home/dana";

  window.__TAURI_METADATA__ = {
    __windows: [{ label: "main" }],
    __currentWindow: { label: "main" },
  };
  window.__TAURI__ = window.__TAURI__ || {};
  window.__TAURI__.convertFileSrc = function (filePath, protocol) {
    return location.origin + "/__asset?path=" + encodeURIComponent(filePath);
  };

  // ---------- events (local, single window) ----------
  let nextEventId = 1;
  const listeners = new Map(); // event -> [{id, handler}]
  function dispatch(event, payload, windowLabel) {
    const list = listeners.get(event) || [];
    for (const l of list.slice()) {
      const fn = window["_" + l.handler];
      if (typeof fn === "function")
        fn({ event, windowLabel: windowLabel || "main", payload, id: l.id });
    }
  }
  window.__sophosiaBridgeDispatch = dispatch;

  function handleEvent(m) {
    switch (m.cmd) {
      case "listen": {
        const id = nextEventId++;
        if (!listeners.has(m.event)) listeners.set(m.event, []);
        listeners.get(m.event).push({ id, handler: m.handler });
        return id;
      }
      case "unlisten": {
        const list = listeners.get(m.event) || [];
        listeners.set(
          m.event,
          list.filter((l) => l.id !== m.eventId)
        );
        return null;
      }
      case "emit": {
        if (m.event === "tauri://update") {
          setTimeout(
            () => dispatch("tauri://update-status", { status: "UPTODATE" }),
            300
          );
          return null;
        }
        setTimeout(() => dispatch(m.event, m.payload, m.windowLabel), 0);
        return null;
      }
    }
    return null;
  }

  function handleWindow(m) {
    if (m.cmd === "createWebview") {
      const opts = (m.data && m.data.options) || {};
      if (opts.url) window.open("/#" + opts.url.replace(/^[#/]*/, "/"), "_blank");
      return null;
    }
    if (m.cmd !== "manage") return null;
    const type = m.data && m.data.cmd && m.data.cmd.type;
    switch (type) {
      case "isFullscreen":
        return !!document.fullscreenElement;
      case "isMaximized":
        return true;
      case "isMinimized":
      case "isDecorated":
      case "isResizable":
      case "isVisible":
      case "isFocused":
        return type !== "isMinimized";
      case "scaleFactor":
        return window.devicePixelRatio || 1;
      case "innerSize":
      case "outerSize":
        return { width: window.innerWidth, height: window.innerHeight };
      case "innerPosition":
      case "outerPosition":
        return { x: 0, y: 0 };
      case "theme":
        return "dark";
      case "title":
        return document.title;
      case "close":
        return null;
      default:
        return null;
    }
  }

  function handleDialog(m) {
    switch (m.cmd) {
      case "openDialog":
      case "saveDialog":
        return null; // user cancelled the native picker
      case "askDialog":
      case "confirmDialog":
        return window.confirm(m.message);
      case "messageDialog":
        return null;
    }
    return null;
  }

  async function remote(cmd, args) {
    const res = await fetch("/__ipc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cmd, args }),
    });
    const body = await res.json();
    if (!res.ok || body.error !== undefined) throw body.error;
    return body.result;
  }

  // Tauri delivers IPC messages over one ordered channel; parallel HTTP
  // requests would not. Keep SQL plugin calls in issue order (the app fires
  // several INSERTs without awaiting them and relies on that ordering).
  let sqlChain = Promise.resolve();
  function remoteOrdered(cmd, args) {
    const run = sqlChain.then(() => remote(cmd, args));
    sqlChain = run.catch(() => {});
    return run;
  }

  async function handle(cmd, args) {
    if (cmd.startsWith("plugin:sql|")) return remoteOrdered(cmd, args);
    if (cmd === "tauri") {
      const mod = args.__tauriModule;
      const m = args.message || {};
      switch (mod) {
        case "Event":
          return handleEvent(m);
        case "Window":
          return handleWindow(m);
        case "Dialog":
          return handleDialog(m);
        case "Shell":
          if (m.cmd === "open") return null;
          return null;
        case "Process":
          return null;
        case "Clipboard":
          if (m.cmd === "writeText" && navigator.clipboard)
            await navigator.clipboard.writeText(m.data).catch(() => {});
          if (m.cmd === "readText" && navigator.clipboard)
            return await navigator.clipboard.readText().catch(() => "");
          return null;
        case "Notification":
          return true;
        case "GlobalShortcut":
          return null;
      }
      return remote(cmd, args);
    }
    if (cmd === "show_in_folder") return null;
    return remote(cmd, args);
  }

  window.__TAURI_IPC__ = function (message) {
    const { cmd, callback, error, ...args } = message;
    handle(cmd, args).then(
      (result) => {
        const fn = window["_" + callback];
        if (fn) fn(result);
      },
      (err) => {
        const fn = window["_" + error];
        if (fn) fn(typeof err === "string" ? err : String((err && err.message) || err));
      }
    );
  };

  // ---------- outbound HTTP from the browser ----------
  // The app fetches the community plugin list and GitHub repo stats directly,
  // and citation-js looks up DOIs / ISBNs. Route those to local stubs.
  const realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    if (url && /^https?:\/\//.test(url) && !url.startsWith(location.origin)) {
      return realFetch("/__stub/proxy?url=" + encodeURIComponent(url), {
        method: (init && init.method) || "GET",
        headers: (init && init.headers) || {},
      });
    }
    return realFetch(input, init);
  };
  const RealXHR = window.XMLHttpRequest;
  const origOpen = RealXHR.prototype.open;
  RealXHR.prototype.open = function (method, url, ...rest) {
    if (typeof url === "string" && /^https?:\/\//.test(url) && !url.startsWith(location.origin)) {
      url = "/__stub/proxy?url=" + encodeURIComponent(url);
    }
    return origOpen.call(this, method, url, ...rest);
  };

  window.__SOPHOSIA_VIRTUAL_HOME__ = VIRTUAL_HOME;
})();
