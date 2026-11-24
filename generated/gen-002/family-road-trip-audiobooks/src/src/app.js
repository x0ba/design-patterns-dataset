/*
 * Carrytale front end. Renders the parent's view of the drive and wires controls
 * to CarrytaleEngine. Panels re-render every second from engine state, except the
 * quiet-stretch panel, which only updates text so its inputs keep focus.
 */
(function () {
  const E = window.CarrytaleEngine;
  const S = E.state;
  const T = E.T;
  const LH = T.titles.lighthouse;
  const STARTS = T.lighthouseStarts;
  const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
  const SLEEPS = [null, 15, 30, 60];
  const COLORS = { mateo: "#3d6ea8", lucy: "#4f8a4b", ines: "#6b5b95", family: "#2f6f6a" };

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (f) => `${Math.max(0, Math.min(100, f * 100)).toFixed(1)}%`;
  const fmt = E.fmtClock;
  const span = E.fmtSpan;

  // Generic segmented button group.
  function seg(items, isActive, attrs) {
    return items
      .map((it) => `<button class="seg-btn${isActive(it.value) ? " on" : ""}" data-action="${attrs.action}" data-id="${attrs.id || ""}" data-value="${it.value ?? ""}">${esc(it.label)}</button>`)
      .join("");
  }

  const speedGroup = (id) =>
    `<div class="seg" role="group" aria-label="Playback speed">${seg(
      SPEEDS.map((v) => ({ value: v, label: `${v}×` })),
      (v) => S.listeners[id].speed === v,
      { action: "set-speed", id }
    )}</div>`;

  const sleepGroup = (id) => {
    const L = S.listeners[id];
    const left = S.sleepRemaining[id] > 0 ? ` <span class="sleep-left">${fmt(S.sleepRemaining[id])} left</span>` : "";
    return `<div class="seg" role="group" aria-label="Sleep timer">${seg(
      SLEEPS.map((v) => ({ value: v ?? 0, label: v ? `${v} min` : "Off" })),
      (v) => (L.sleepMin || 0) === v,
      { action: "set-sleep", id }
    )}</div>${left}`;
  };

  // Header
  function renderHeader() {
    const trip = $("#trip-left");
    if (trip) trip.textContent = fmt(S.tripRemaining);
    const gas = $("#gas-in");
    if (gas) gas.textContent = S.quiet.scheduled ? fmt(S.quiet.startIn) : S.quiet.active ? "Now" : "Not set";
  }

  // Left column: who is listening and where they are
  function listenerCard(id) {
    const L = S.listeners[id];
    const color = COLORS[id];
    let place = "";
    let badge = "";
    let progress = 0;
    let detail = "";
    let status = "";
    let action = "";

    if (id === "mateo") {
      const a = E.chapterAt(L.bookPos);
      const gap = S.family.bookPos - L.bookPos;
      const fam = E.chapterAt(S.family.bookPos);
      place = `Shared book · Ch ${a.number} · ${fmt(a.offset)}`;
      badge = gap > 0 ? `<span class="badge behind">${span(gap)} behind</span>` : `<span class="badge ok">Caught up</span>`;
      progress = L.bookPos / LH.totalSec;
      detail = `Family is at Ch ${fam.number} · ${fmt(fam.offset)}`;
      const playing = S.car.playing && S.car.queue[0]?.listener === id;
      status = playing ? "Playing in the car" : "Paused";
    } else if (id === "lucy") {
      const ep = E.episodeFor(L.episodeNumber);
      place = `Dino Dig Kids · Ep ${L.episodeNumber} · ${fmt(L.episodePosSec)} of ${fmt(ep.seconds)}`;
      badge = `<span class="badge">${L.episodesPlayed} of ${L.episodesTotal} played</span>`;
      progress = (L.episodesPlayed + L.episodePosSec / ep.seconds) / L.episodesTotal;
      detail = `Next: Ep ${L.episodeNumber + 1}, then ${L.episodesTotal - L.episodeNumber} more`;
      const playing = S.car.playing && S.car.queue[0]?.listener === id;
      status = playing ? "Playing in the car" : "Paused";
      action = `<button class="btn small" data-action="play-lucy">Play for Lucy</button>`;
    } else {
      const w = T.titles.wings;
      const remaining = ((100 - 61) / 100) * w.totalSec / L.speed;
      place = `Wings of Ash · Ch ${L.chapterNumber} · The Ashen Gate`;
      badge = `<span class="badge">61% through</span>`;
      progress = L.progressPct / 100;
      detail = `${span(remaining)} left at ${L.speed}×`;
      status = L.playing ? "Playing on headphones" : "Paused";
      action = `<button class="btn small" data-action="toggle-ines">${L.playing ? "Pause" : "Play"}</button>`;
    }

    return `
      <article class="listener" style="--c:${color}">
        <header>
          <span class="avatar">${esc(L.name[0])}</span>
          <div class="who">
            <h3>${esc(L.name)} <span class="age">${L.age}</span></h3>
            <p class="muted">${esc(L.device)} · ${esc(L.contentSetting)}</p>
          </div>
          ${badge}
        </header>
        <p class="place">${esc(place)}</p>
        <div class="bar"><span style="width:${pct(progress)}"></span></div>
        <p class="detail">${esc(detail)}</p>
        <p class="status"><span class="dot${status.startsWith("Playing") ? " live" : ""}"></span>${esc(status)} ${action}</p>
        <div class="controls-row">${speedGroup(id)}</div>
        <div class="controls-row">${sleepGroup(id)}</div>
      </article>`;
  }

  function renderListeners() {
    $("#listeners").innerHTML = `
      <h2 class="col-title">Who's listening</h2>
      ${["mateo", "lucy", "ines"].map(listenerCard).join("")}
      <p class="fineprint">Speed and sleep timer are per listener. Car speakers use the setting of whoever's title is playing.</p>`;
  }

  // Center: car speakers now playing
  function renderCar() {
    const item = E.current();
    const q = S.quiet;
    let title = "Nothing queued";
    let sub = "Add an episode from the right-hand column";
    let progress = 0;
    let times = "";
    let listenerName = "";
    let artLabel = "";
    const isBook = item && item.kind === "book";

    if (item) {
      const L = S.listeners[item.listener];
      listenerName = L ? L.name : "";
      title = item.label;
      sub = item.sub;
      if (isBook) {
        const a = E.chapterAt(S.car.cursor);
        progress = S.car.cursor / LH.totalSec;
        times = `Ch ${a.number} · ${fmt(a.offset)} of ${fmt(LH.chapters[a.number - 1].seconds)} · book ${fmt(S.car.cursor)} of ${fmt(LH.totalSec)}`;
        artLabel = "Lighthouse";
      } else {
        const ep = E.episodeFor(item.epNo);
        progress = S.car.cursor / ep.seconds;
        times = `${fmt(S.car.cursor)} of ${fmt(ep.seconds)}`;
        artLabel = "Dino";
      }
    }

    const playing = S.car.playing && !q.active;
    const banner = q.active
      ? `<div class="banner quiet-banner">Quiet stretch: car speakers are silent, back in <b data-bind="quiet-left">${fmt(q.remaining)}</b></div>`
      : "";

    $("#car").innerHTML = `
      <section class="panel car-panel">
        <div class="panel-head">
          <h2>Car speakers</h2>
          <span class="pill ${playing ? "live" : ""}">${playing ? "Playing" : "Paused"}${listenerName ? ` · for ${esc(listenerName)}` : ""}</span>
        </div>
        ${banner}
        <div class="now">
          <div class="art ${isBook ? "art-book" : "art-pod"}"><span>${esc(artLabel || "Nothing")}</span></div>
          <div class="now-text">
            <h1>${esc(title)}</h1>
            <p class="sub">${esc(sub)}</p>
            <p class="muted">${esc(times)}</p>
          </div>
        </div>
        <div class="scrub"><span style="width:${pct(progress)}"></span></div>
        <div class="transport">
          <button class="tbtn" data-action="chapter-step" data-dir="-1" ${isBook ? "" : "disabled"} title="Previous chapter">⏮ Chapter</button>
          <button class="tbtn" data-action="skip" data-sec="-30" ${item ? "" : "disabled"}>↺ 30s</button>
          <button class="tbtn play" data-action="toggle-play" ${item && !q.active ? "" : "disabled"}>${playing ? "Pause" : "Play"}</button>
          <button class="tbtn" data-action="skip" data-sec="30" ${item ? "" : "disabled"}>30s ↻</button>
          <button class="tbtn" data-action="chapter-step" data-dir="1" ${isBook ? "" : "disabled"} title="Next chapter">Chapter ⏭</button>
        </div>
      </section>`;
  }

  // Center: catch Mateo up
  function renderCatchup() {
    const gap = S.family.bookPos - S.listeners.mateo.bookPos;
    const a = E.chapterAt(S.listeners.mateo.bookPos);
    const f = E.chapterAt(S.family.bookPos);
    const msg =
      gap > 0
        ? `Mateo is ${span(gap)} behind. He is in Chapter ${a.number} at ${fmt(a.offset)}, and the family is in Chapter ${f.number} at ${fmt(f.offset)}. Chapter ${a.number} from ${fmt(a.offset)}, all of Chapter ${a.number + 1}, and the start of Chapter ${f.number} are the part he missed.`
        : "Mateo is caught up with the family.";
    const replay = !S.skipMateo;
    $("#catchup").innerHTML = `
      <section class="panel">
        <div class="panel-head"><h2>Catch Mateo up</h2></div>
        <p>${esc(msg)}</p>
        <div class="choice-row">
          <button class="choice${replay ? " on" : ""}" data-action="catchup" data-skip="0">
            <b>Replay the missed part</b>
            <span>Car plays from his place to the family's. Everyone hears it again, about ${span(Math.max(0, gap))}. The mystery stays intact.</span>
          </button>
          <button class="choice${!replay ? " on" : ""}" data-action="catchup" data-skip="1">
            <b>Skip to the family's place</b>
            <span>Saves ${span(Math.max(0, gap))}, but Mateo misses the clues in those chapters.</span>
          </button>
        </div>
        <div class="row-end">
          <button class="btn" data-action="rewind-ch" data-ch="6">Rewind everyone to the start of Chapter 6</button>
        </div>
      </section>`;
  }

  // Center: chapter list with each child's place marked
  function renderChapters() {
    const mateoPos = S.listeners.mateo.bookPos;
    const famPos = S.family.bookPos;
    const cur = E.current();
    const playingBook = cur && cur.kind === "book" ? E.chapterAt(S.car.cursor).number : null;
    let start = 0;
    const rows = LH.chapters.map((c, i) => {
      const s = start;
      const e = start + c.seconds;
      start = e;
      let status = "Heard by everyone";
      let cls = "heard";
      if (e <= mateoPos) {
        status = "Mateo heard";
      } else if (s >= mateoPos) {
        status = "Mateo missed";
        cls = "missed";
      } else {
        status = "Mateo partly heard";
        cls = "partly";
      }
      if (s >= famPos) {
        status = "Not yet";
        cls = "ahead";
      }
      if (playingBook === c.number) cls += " playing";
      const famMark = famPos >= s && famPos < e ? `<span class="marker">Family at ${fmt(famPos - s)}</span>` : "";
      return `<li class="${cls}"><button data-action="play-chapter" data-ch="${c.number}">
          <span class="num">${c.number}</span>
          <span class="ctitle">${esc(c.title)}${famMark}</span>
          <span class="cstat">${esc(status)}</span>
          <span class="cdur">${fmt(c.seconds)}</span>
        </button></li>`;
    });
    $("#chapters").innerHTML = `
      <section class="panel chapters-panel">
        <div class="panel-head"><h2>${esc(LH.title || "The Mystery of the Midnight Lighthouse")}</h2><span class="muted">14 chapters · 6h 12m</span></div>
        <ol class="chapters">${rows.join("")}</ol>
      </section>`;
  }

  // Right column: up next + coverage
  function renderQueue() {
    const cov = E.coverage();
    const trip = cov.tripSec;
    const planned = cov.plannedSec;
    const tripShare = Math.min(1, trip / Math.max(planned, 1));
    const summary = cov.covered
      ? `Covered. Runs ${span(cov.spareSec)} past arrival, so the rest plays at home.`
      : `${span(-cov.spareSec)} short. Add episodes to cover the drive.`;

    const segs = E.timeline().segs;
    const seen = new Set();
    const rows = segs.map((s, idx) => {
      if (s.type === "quiet") {
        return `<li class="quiet-row">
          <span class="when">+${fmt(s.start)}</span>
          <span class="qbody"><b>Quiet stretch</b><span class="muted">Gas stop · ${Math.round((s.end - s.start) / 60)} min, car silent</span></span>
        </li>`;
      }
      const item = s.item;
      const first = !seen.has(item.id);
      seen.add(item.id);
      const isNow = item === E.current() && idx === 0 && s.start === 0;
      const isQueued = item !== E.current();
      const who = S.listeners[item.listener]?.name || "Family";
      const controls =
        first && isQueued
          ? `<span class="row-actions">
              <button data-action="queue-up" data-id="${esc(item.id)}" title="Move up">↑</button>
              <button data-action="queue-down" data-id="${esc(item.id)}" title="Move down">↓</button>
              <button data-action="queue-remove" data-id="${esc(item.id)}" title="Remove">✕</button>
            </span>`
          : "";
      return `<li class="${isNow ? "now-row" : ""}">
          <span class="when">${isNow ? "Now" : "+" + fmt(s.start)}</span>
          <span class="qbody"><b>${esc(item.label)}</b> <span class="who">${esc(who)}</span><span class="muted">${esc(item.sub)}${first ? "" : " (continues)"} · ${span(s.end - s.start)}</span></span>
          ${controls}
        </li>`;
    });

    $("#queue").innerHTML = `
      <section class="panel">
        <div class="panel-head"><h2>Up next on car speakers</h2></div>
        <div class="coverage ${cov.covered ? "ok" : "short"}">
          <div class="cov-bar"><span style="width:${(tripShare * 100).toFixed(1)}%"></span></div>
          <div class="cov-meta">
            <span>Trip left <b>${span(trip)}</b></span>
            <span>Queued <b>${span(planned)}</b></span>
          </div>
          <p class="muted">${esc(summary)}</p>
        </div>
        <ol class="queue">${rows.join("")}</ol>
        <div class="row-end">
          <button class="btn" data-action="add-episode">Add next Dino Dig Kids episode</button>
          <button class="btn primary" data-action="autofill">Fill to arrival</button>
        </div>
      </section>`;
  }

  // Offline downloads
  function renderOffline() {
    const queuedTitles = new Set(S.car.queue.map((i) => i.titleId));
    const offlineIds = new Set(T.offline.map((o) => o.titleId).filter(Boolean));
    const allOffline = [...queuedTitles].every((t) => offlineIds.has(t));
    const totalMB = T.offline.reduce((sum, o) => sum + o.sizeMB, 0);
    const list = T.offline
      .map((o) => `<li><span>${esc(o.label)}</span><span class="muted">${esc(o.detail)} · ${o.sizeMB} MB</span></li>`)
      .join("");
    $("#offline").innerHTML = `
      <section class="panel">
        <div class="panel-head"><h2>Offline</h2><span class="pill ${allOffline ? "live" : ""}">${allOffline ? "Queue downloaded" : "Needs signal"}</span></div>
        <p class="muted">${T.offline.length} titles · ${(totalMB / 1000).toFixed(1)} GB. Signal drops in the mountain stretch, so everything in the queue plays from the phone.</p>
        <ul class="offline-list">${list}</ul>
      </section>`;
  }

  // Quiet-stretch panel: rendered once, updated in place
  function renderQuietShell() {
    $("#quiet").innerHTML = `
      <section class="panel">
        <div class="panel-head"><h2>Quiet stretch at the gas stop</h2></div>
        <p id="quiet-status" class="status-line"></p>
        <div class="row">
          <label class="field">Gas stop in <input id="q-in" type="number" min="0" max="180" value="${Math.round(S.quiet.startIn / 60) || 15}"> min</label>
          <label class="field">Quiet for <input id="q-len" type="number" min="1" max="60" value="${Math.round(S.quiet.len / 60)}"> min</label>
        </div>
        <div class="row-end">
          <button class="btn" data-action="quiet-set">Schedule quiet stretch</button>
          <button class="btn primary" id="q-toggle" data-action="quiet-start">Start now</button>
        </div>
      </section>`;
  }

  function updateQuiet() {
    const q = S.quiet;
    const status = $("#quiet-status");
    const toggle = $("#q-toggle");
    if (!status || !toggle) return;
    if (q.active) {
      status.textContent = `On now. Car silent, back on in ${fmt(q.remaining)}.`;
      toggle.textContent = "End quiet now";
      toggle.dataset.action = "quiet-end";
    } else if (q.scheduled) {
      status.textContent = `Starts in ${fmt(q.startIn)} at the gas stop, for ${Math.round(q.len / 60)} min.`;
      toggle.textContent = "Start now";
      toggle.dataset.action = "quiet-start";
    } else {
      status.textContent = "No quiet stretch planned.";
      toggle.textContent = "Start now";
      toggle.dataset.action = "quiet-start";
    }
    renderHeader();
  }

  function renderNotice() {
    const el = $("#toast");
    const n = S.notice;
    if (!n || Date.now() - n.at > 6000) {
      el.classList.remove("show");
      return;
    }
    el.textContent = n.text;
    el.classList.add("show");
  }

  function renderAll() {
    renderHeader();
    renderListeners();
    renderCar();
    renderCatchup();
    renderChapters();
    renderQueue();
    renderOffline();
    renderNotice();
  }

  // Actions
  const actions = {
    "toggle-play": () => E.togglePlay(),
    skip: (el) => E.skipSeconds(Number(el.dataset.sec)),
    "chapter-step": (el) => E.chapterStep(Number(el.dataset.dir)),
    "play-lucy": () => E.playLucy(),
    "toggle-ines": () => E.toggleInes(),
    "set-speed": (el) => E.setSpeed(el.dataset.id, Number(el.dataset.value)),
    "set-sleep": (el) => E.setSleep(el.dataset.id, Number(el.dataset.value) || null),
    catchup: (el) => E.setMateoSkip(el.dataset.skip === "1"),
    "rewind-ch": (el) => E.rewindAllToChapter(Number(el.dataset.ch)),
    "play-chapter": (el) => E.rewindAllToChapter(Number(el.dataset.ch)),
    "queue-up": (el) => E.moveItem(el.dataset.id, -1),
    "queue-down": (el) => E.moveItem(el.dataset.id, 1),
    "queue-remove": (el) => E.removeItem(el.dataset.id),
    "add-episode": () => {
      if (!E.addNextEpisode()) E.setNotice("No unplayed Dino Dig Kids episodes left to add.");
    },
    autofill: () => E.autofill(),
    "quiet-set": () => {
      const inMin = Number($("#q-in").value);
      const lenMin = Number($("#q-len").value);
      if (!Number.isFinite(inMin) || !Number.isFinite(lenMin) || lenMin < 1) return E.setNotice("Enter a length of at least 1 minute.");
      E.setQuiet(inMin, lenMin);
    },
    "quiet-start": () => E.startQuietNow(),
    "quiet-end": () => E.endQuietNow(),
  };

  function onClick(ev) {
    const el = ev.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (fn) {
      fn(el);
      renderAll();
      updateQuiet();
    }
  }

  function boot() {
    const app = $("#app");
    app.innerHTML = `
      <header class="topbar">
        <div class="brand"><span class="logo">C</span><div><b>Carrytale</b><span class="muted">Torres family · Thanksgiving drive</span></div></div>
        <div class="stats">
          <div class="stat"><span>Arriving in</span><b id="trip-left">--</b></div>
          <div class="stat"><span>Gas stop in</span><b id="gas-in">--</b></div>
          <div class="stat"><span>Signal</span><b>Mountain stretch ahead</b></div>
        </div>
        <div class="who-parent"><span class="avatar parent">H</span>${esc(T.trip.parent)}</div>
      </header>
      <main class="grid">
        <aside id="listeners" class="col left"></aside>
        <section class="col center">
          <div id="car"></div>
          <div id="catchup"></div>
          <div id="chapters"></div>
        </section>
        <aside class="col right">
          <div id="queue"></div>
          <div id="quiet"></div>
          <div id="offline"></div>
        </aside>
      </main>
      <div id="toast" role="status" aria-live="polite"></div>`;

    renderQuietShell();
    app.addEventListener("click", onClick);
    renderAll();
    updateQuiet();

    setInterval(() => {
      E.tick();
      renderAll();
      updateQuiet();
    }, 1000);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
