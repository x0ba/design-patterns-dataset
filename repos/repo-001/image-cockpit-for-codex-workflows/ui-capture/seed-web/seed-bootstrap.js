// First-visit seeding for Image Cockpit's browser-side local state.
// Image Cockpit keeps its result history, frames and actions in IndexedDB
// ("image-cockpit-local-state" / "state"). On the first visit from a fresh
// browser profile this writes an established user's state (built from
// /__ui-capture/seed-state.json) using the app's own storage schema, then boots
// the app. Later visits boot the app directly, so the user's own changes persist.
(function () {
  var SEED_VERSION = "ui-capture-seed-v1";
  var FLAG = "ui-capture.seeded";
  var DB_NAME = "image-cockpit-local-state";
  var STORE = "state";

  function bootApp() {
    var start = function () {
      var s = document.createElement("script");
      s.type = "module";
      s.crossOrigin = "";
      s.src = window.__UI_CAPTURE_APP_ENTRY__;
      document.head.appendChild(s);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function putAll(db, entries) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      var store = tx.objectStore(STORE);
      entries.forEach(function (e) { store.put(e[1], e[0]); });
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error); };
    });
  }

  function toDataUrl(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("seed fetch failed " + url);
      return r.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = function () { reject(fr.error); };
        fr.readAsDataURL(blob);
      });
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("seed image failed")); };
      img.src = src;
    });
  }

  // Split a 5-direction x N-frame sheet (rows = directions) into SpriteFrames.
  async function splitSheet(dataUrl, spec) {
    var img = await loadImage(dataUrl);
    var cw = spec.cell.width, ch = spec.cell.height;
    var cols = Math.floor(img.naturalWidth / cw), rows = Math.floor(img.naturalHeight / ch);
    var canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext("2d");
    var frames = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, c * cw, r * ch, cw, ch, 0, 0, cw, ch);
        var index = r * cols + c;
        var n = String(index + 1).padStart(2, "0");
        frames.push({
          id: spec.idPrefix + "-frame-" + n,
          name: spec.namePrefix + "-frame-" + n + ".png",
          dataUrl: canvas.toDataURL("image/png"),
          width: cw,
          height: ch,
          sourceId: spec.sourceId,
          index: index
        });
      }
    }
    return frames;
  }

  async function seed() {
    var res = await fetch("/__ui-capture/seed-state.json", { cache: "no-store" });
    if (!res.ok) return;
    var state = await res.json();
    var cache = {};
    var history = [];
    for (var i = 0; i < state.history.length; i++) {
      var item = Object.assign({}, state.history[i]);
      var src = item.imageUrl;
      delete item.imageUrl;
      cache[src] = cache[src] || (await toDataUrl(src));
      item.dataUrl = cache[src];
      history.push(item);
    }
    var frames = [];
    for (var j = 0; j < (state.frameSheets || []).length; j++) {
      var spec = state.frameSheets[j];
      cache[spec.imageUrl] = cache[spec.imageUrl] || (await toDataUrl(spec.imageUrl));
      frames = frames.concat(await splitSheet(cache[spec.imageUrl], spec));
    }
    var actions = (state.actions || []).map(function (a) {
      var copy = Object.assign({}, a);
      if (copy.frameSourceId) {
        copy.frameIds = frames.filter(function (f) { return f.sourceId === copy.frameSourceId; }).map(function (f) { return f.id; });
        delete copy.frameSourceId;
      }
      return copy;
    });
    var db = await openDb();
    await putAll(db, [
      ["image-cockpit.v3.history", history],
      ["image-cockpit.v3.frames", frames],
      ["image-cockpit.v3.actions", actions],
      ["image-cockpit.v3.animation-library", state.animationLibrary || []]
    ]);
    db.close();
    Object.keys(state.localStorage || {}).forEach(function (k) {
      localStorage.setItem(k, state.localStorage[k]);
    });
  }

  var seeded = false;
  try { seeded = localStorage.getItem(FLAG) === SEED_VERSION; } catch (e) { seeded = true; }
  if (seeded || /[?&](safe|reset|skipStorage)\b/.test(location.search)) return bootApp();
  seed()
    .then(function () { localStorage.setItem(FLAG, SEED_VERSION); })
    .catch(function (e) { console.warn("ui-capture seed failed", e); })
    .then(bootApp);
})();
