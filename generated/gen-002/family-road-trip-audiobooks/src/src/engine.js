/*
 * Carrytale playback engine. Pure client-side state; no network.
 * Owns: car speakers queue, per-listener bookmarks, speed, sleep timers,
 * the quiet stretch at the gas stop, and the trip clock.
 */
(function () {
  const T = window.CARRYTALE;
  const LH = T.titles.lighthouse;
  const STARTS = T.lighthouseStarts;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function fmtClock(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function fmtSpan(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h === 0) return `${m} min`;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }

  function chapterAt(abs) {
    const chapters = LH.chapters;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (abs >= STARTS[i]) {
        return { number: i + 1, title: chapters[i].title, offset: Math.min(abs - STARTS[i], chapters[i].seconds) };
      }
    }
    return { number: 1, title: chapters[0].title, offset: 0 };
  }

  function bookSpan(start, end) {
    const a = chapterAt(start);
    if (end >= LH.totalSec) {
      return `Ch ${a.number} ${fmtClock(a.offset)} to end`;
    }
    const b = chapterAt(end);
    return `Ch ${a.number} ${fmtClock(a.offset)} to Ch ${b.number} ${fmtClock(b.offset)}`;
  }

  function episodeFor(n) {
    return T.titles.dino.episodes.find((e) => e.number === n);
  }

  function makeEpisodeItem(n) {
    const ep = episodeFor(n);
    return {
      id: `dino-${n}`,
      kind: "episode",
      titleId: "dino",
      listener: "lucy",
      epNo: n,
      start: n === 32 ? T.listeners.lucy.episodePosSec : 0,
      end: ep.seconds,
      label: "Dino Dig Kids",
      sub: `Ep ${n} · ${ep.title}`,
      reason: "Lucy's podcast",
    };
  }

  function makeBookItem(id, listener, start, end, reason) {
    return {
      id,
      kind: "book",
      titleId: "lighthouse",
      listener,
      start,
      end,
      label: "The Mystery of the Midnight Lighthouse",
      get sub() {
        return bookSpan(this.start, this.end);
      },
      reason,
    };
  }

  const mateoStart = T.listeners.mateo.bookPosSec;
  const familyStart = T.familyBookPosSec;

  const state = {
    selected: "mateo",
    tripRemaining: T.trip.remainingSec,
    tripElapsed: 0,
    listeners: {
      mateo: { ...clone(T.listeners.mateo), bookPos: T.listeners.mateo.bookPosSec },
      lucy: clone(T.listeners.lucy),
      ines: clone(T.listeners.ines),
      family: { id: "family", name: "Family (car)", speed: 1.0, sleepMin: null, device: "Car speakers" },
    },
    family: { bookPos: familyStart },
    car: {
      playing: false,
      cursor: T.listeners.lucy.episodePosSec,
      queue: [
        makeEpisodeItem(32),
        makeBookItem("mateo-catchup", "mateo", mateoStart, familyStart, "Mateo's catch-up replay"),
        makeBookItem("book-rest", "family", familyStart, LH.totalSec, "Rest of the book"),
      ],
    },
    quiet: {
      scheduled: true,
      startIn: T.trip.gasStopInSec,
      len: T.trip.quietLengthSec,
      active: false,
      remaining: 0,
      resumeCar: false,
    },
    skipMateo: false,
    sleepRemaining: { mateo: 0, lucy: 0, ines: 0, family: 0 },
    notice: null,
  };

  // Current, queued, and ending helpers
  const current = () => state.car.queue[0] || null;

  function itemLength(item, from) {
    return Math.max(0, item.end - (from === undefined ? item.start : from));
  }

  /**
   * Timeline relative to now. Audio segments come from the queue; the quiet
   * stretch is inserted at its scheduled offset, pushing later audio back.
   */
  function timeline() {
    const segs = [];
    const q = state.quiet;
    let t = 0;
    let quietInserted = false;

    if (q.active) {
      segs.push({ type: "quiet", start: 0, end: q.remaining });
      t = q.remaining;
      quietInserted = true;
    }

    state.car.queue.forEach((item, i) => {
      const from = i === 0 ? state.car.cursor : item.start;
      const len = itemLength(item, from);
      const a0 = t;
      const a1 = t + len;
      if (!quietInserted && q.scheduled && q.startIn < a1) {
        const qs = Math.max(q.startIn, a0);
        if (qs > a0) segs.push({ type: "audio", item, start: a0, end: qs });
        segs.push({ type: "quiet", start: qs, end: qs + q.len });
        quietInserted = true;
        segs.push({ type: "audio", item, start: qs + q.len, end: a1 + q.len });
        t = a1 + q.len;
      } else {
        segs.push({ type: "audio", item, start: a0, end: a1 });
        t = a1;
      }
    });

    if (!quietInserted && q.scheduled) {
      segs.push({ type: "quiet", start: t, end: t + q.len });
      t += q.len;
    }

    return { segs, end: t };
  }

  function coverage() {
    const { end } = timeline();
    const spare = end - state.tripRemaining;
    return { plannedSec: end, tripSec: state.tripRemaining, spareSec: spare, covered: spare >= 0 };
  }

  // Whatever the car plays, everyone in the car hears it, so bookmarks follow the cursor.
  function bookmarkFromCar(item, cursor) {
    if (item.kind === "episode") {
      state.listeners.lucy.episodePosSec = cursor;
      return;
    }
    if (item.titleId !== "lighthouse") return;
    state.family.bookPos = Math.max(state.family.bookPos, cursor);
    if (cursor > state.listeners.mateo.bookPos) state.listeners.mateo.bookPos = cursor;
  }

  // One tick of real time advances the car stream by its listener's speed.
  function advanceCar(seconds) {
    const car = state.car;
    if (!car.playing || !car.queue.length) return;
    const item = car.queue[0];
    const speed = state.listeners[item.listener]?.speed ?? 1;
    car.cursor = Math.min(item.end, car.cursor + seconds * speed);
    bookmarkFromCar(item, car.cursor);
    if (car.cursor >= item.end) {
      car.queue.shift();
      car.cursor = car.queue.length ? car.queue[0].start : 0;
      if (!car.queue.length) car.playing = false;
    }
  }

  function setNotice(text) {
    state.notice = text ? { text, at: Date.now() } : null;
  }

  // Real-time tick, once per second.
  function tick() {
    state.tripElapsed += 1;
    if (state.tripRemaining > 0) state.tripRemaining -= 1;

    const q = state.quiet;
    if (q.scheduled && !q.active) {
      q.startIn -= 1;
      if (q.startIn <= 0) {
        q.scheduled = false;
        q.active = true;
        q.remaining = q.len;
        q.resumeCar = state.car.playing;
        state.car.playing = false;
        setNotice("Quiet stretch started. Car speakers are silent.");
      }
    } else if (q.active) {
      q.remaining -= 1;
      if (q.remaining <= 0) {
        q.active = false;
        if (q.resumeCar && state.car.queue.length) state.car.playing = true;
        setNotice("Quiet stretch over. Car speakers are back on.");
      }
    }

    // Playback advances in real time at each listener's speed.
    if (!q.active) advanceCar(1);

    // Sleep timers stop a stream when they run out.
    for (const id of ["mateo", "lucy", "ines", "family"]) {
      if (state.sleepRemaining[id] > 0) {
        const streamPlaying = streamPlayingFor(id);
        if (streamPlaying) {
          state.sleepRemaining[id] -= 1;
          if (state.sleepRemaining[id] <= 0) {
            stopStreamFor(id);
            setNotice(`${state.listeners[id].name}'s sleep timer ended playback.`);
          }
        }
      }
    }
  }

  function streamPlayingFor(id) {
    if (id === "ines") return state.listeners.ines.playing;
    if (!state.car.playing || !state.car.queue.length) return false;
    const owner = state.car.queue[0].listener;
    return owner === id;
  }

  function stopStreamFor(id) {
    if (id === "ines") state.listeners.ines.playing = false;
    else state.car.playing = false;
  }

  // Controls
  function togglePlay() {
    if (state.quiet.active) return setNotice("Quiet stretch is on. Car speakers resume when it ends.");
    if (!state.car.queue.length) return;
    state.car.playing = !state.car.playing;
  }

  function skipSeconds(sec) {
    const item = current();
    if (!item) return;
    state.car.cursor = Math.max(item.start, Math.min(item.end, state.car.cursor + sec));
    if (item.kind === "book") bookmarkFromCar(item, state.car.cursor);
  }

  function chapterStep(dir) {
    const item = current();
    if (!item || item.kind !== "book") return;
    const i = chapterAt(state.car.cursor).number - 1;
    const target = dir > 0 ? (i + 1 < STARTS.length ? STARTS[i + 1] : LH.totalSec) : STARTS[Math.max(0, i - (state.car.cursor - STARTS[i] < 5 ? 1 : 0))];
    state.car.cursor = Math.max(item.start, Math.min(item.end, target));
    bookmarkFromCar(item, state.car.cursor);
  }

  // Rewind the car to a chapter start for everyone. One book item replaces the
  // Lighthouse items, so Mateo's separate replay is not queued twice.
  function rewindAllToChapter(chapterNo) {
    const from = STARTS[chapterNo - 1];
    const rewind = makeBookItem("rewind", "family", from, LH.totalSec, "Rewind for everyone");
    state.car.queue = [rewind, ...state.car.queue.filter((i) => i.titleId !== "lighthouse")];
    state.car.cursor = from;
    state.car.playing = true;
    setNotice(`Rewound the car to Chapter ${chapterNo}. Everyone hears it from the start.`);
  }

  function playLucy() {
    const idx = state.car.queue.findIndex((i) => i.listener === "lucy");
    if (idx < 0) return;
    if (idx > 0) {
      const [item] = state.car.queue.splice(idx, 1);
      state.car.queue.unshift(item);
    }
    state.car.cursor = state.car.queue[0].start;
    state.car.playing = true;
    setNotice("Lucy's podcast is on the car speakers.");
  }

  function moveItem(id, dir) {
    const i = state.car.queue.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i <= 0 || j <= 0 || j >= state.car.queue.length) return;
    [state.car.queue[i], state.car.queue[j]] = [state.car.queue[j], state.car.queue[i]];
  }

  function removeItem(id) {
    const i = state.car.queue.findIndex((x) => x.id === id);
    if (i <= 0) return;
    state.car.queue.splice(i, 1);
  }

  function lastQueuedEpisode() {
    let max = 0;
    state.car.queue.forEach((i) => { if (i.kind === "episode") max = Math.max(max, i.epNo); });
    return max;
  }

  function addNextEpisode() {
    const n = lastQueuedEpisode() + 1;
    if (n > T.titles.dino.episodesTotal || !episodeFor(n)) return false;
    state.car.queue.push(makeEpisodeItem(n));
    return true;
  }

  function autofill() {
    let added = 0;
    while (coverage().spareSec < 0 && addNextEpisode()) added++;
    setNotice(added ? `Added ${added} Dino Dig Kids episode${added > 1 ? "s" : ""} to cover the drive.` : "Queue already covers the drive.");
  }

  function setMateoSkip(skip) {
    if (skip === state.skipMateo) return;
    state.skipMateo = skip;
    const idx = state.car.queue.findIndex((i) => i.id === "mateo-catchup");
    if (skip) {
      if (idx > 0) state.car.queue.splice(idx, 1);
      state.listeners.mateo.bookPos = familyStart;
      setNotice("Mateo skips to the family's place. He misses about 71 minutes of the story.");
    } else {
      state.listeners.mateo.bookPos = mateoStart;
      const item = makeBookItem("mateo-catchup", "mateo", mateoStart, familyStart, "Mateo's catch-up replay");
      const hasBook = state.car.queue.some((i) => i.titleId === "lighthouse");
      if (idx < 0 && !hasBook) state.car.queue.splice(Math.min(1, state.car.queue.length), 0, item);
      setNotice("Mateo replays the missed part from Chapter 5, 2:10.");
    }
  }

  function setQuiet(startInMin, lenMin) {
    const q = state.quiet;
    q.startIn = Math.max(0, Math.round(startInMin * 60));
    q.len = Math.max(60, Math.round(lenMin * 60));
    q.scheduled = !q.active;
    if (!q.active) setNotice(`Quiet stretch set for ${Math.round(q.startIn / 60)} min from now, lasting ${Math.round(q.len / 60)} min.`);
  }

  function startQuietNow() {
    const q = state.quiet;
    if (q.active) return;
    q.scheduled = false;
    q.active = true;
    q.remaining = q.len;
    q.resumeCar = state.car.playing;
    state.car.playing = false;
    setNotice("Quiet stretch started. Car speakers are silent.");
  }

  function endQuietNow() {
    const q = state.quiet;
    if (!q.active) return;
    q.active = false;
    if (q.resumeCar && state.car.queue.length) state.car.playing = true;
    setNotice("Quiet stretch ended. Car speakers are back on.");
  }

  function setSpeed(id, speed) {
    if (state.listeners[id]) state.listeners[id].speed = speed;
  }

  function setSleep(id, min) {
    state.listeners[id].sleepMin = min;
    state.sleepRemaining[id] = min ? min * 60 : 0;
  }

  function toggleInes() {
    state.listeners.ines.playing = !state.listeners.ines.playing;
  }

  window.CarrytaleEngine = {
    state,
    T,
    fmtClock,
    fmtSpan,
    chapterAt,
    bookSpan,
    episodeFor,
    current,
    timeline,
    coverage,
    tick,
    togglePlay,
    skipSeconds,
    chapterStep,
    rewindAllToChapter,
    playLucy,
    moveItem,
    removeItem,
    addNextEpisode,
    autofill,
    setMateoSkip,
    setQuiet,
    startQuietNow,
    endQuietNow,
    setSpeed,
    setSleep,
    toggleInes,
    setNotice,
  };
})();
