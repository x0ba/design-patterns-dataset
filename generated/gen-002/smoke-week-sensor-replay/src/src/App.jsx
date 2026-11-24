import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { REPLAYS, loadReplay, frameToNar, narToFrame } from './data/replays.js'
import { stampLong, stamp, mmss } from './data/time.js'
import { cat, fmt } from './aqi.js'
import Header from './components/Header.jsx'
import Left from './components/Left.jsx'
import MapView, { StatStrip, Legend, CaptionBand } from './components/MapView.jsx'
import Right from './components/Right.jsx'
import Dock from './components/Dock.jsx'

const DEFAULT_ID = 'smoke-2026'
// The state Teodoro is in: paused at 1:20 a.m. on the night of the 14th, half speed,
// with a clip started at his first bookmark but not yet finished.
const OPENING = { t: 584, speed: 0.5, clip: { in: 570, out: null }, selected: 'L-s1' }
const LS = { bm: 'hazereel.bookmarks.v1', clip: 'hazereel.clip.v1' }

const readLS = (k) => {
  try { return JSON.parse(localStorage.getItem(k)) || {} } catch { return {} }
}
const writeLS = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ }
}
let uid = 0
const newId = () => `b${Date.now().toString(36)}${uid++}`

function parseHash() {
  const p = new URLSearchParams(location.hash.replace(/^#/, ''))
  const num = (k) => (p.has(k) && p.get(k) !== '' && Number.isFinite(+p.get(k)) ? +p.get(k) : null)
  return { r: p.get('r'), t: num('t'), s: num('s'), ci: num('ci'), co: num('co') }
}

export default function App() {
  const hash = useMemo(parseHash, [])
  const startId = REPLAYS.some((r) => r.id === hash.r) ? hash.r : DEFAULT_ID
  const [replayId, setReplayId] = useState(startId)
  const R = useMemo(() => loadReplay(replayId), [replayId])
  const last = R.meta.frames - 1
  const isOpening = replayId === DEFAULT_ID

  const [t, setT] = useState(() => {
    if (hash.t != null && startId === hash.r) return Math.min(Math.max(hash.t, 0), last)
    return startId === DEFAULT_ID ? OPENING.t : 0
  })
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(hash.s && [0.5, 1, 2, 4].includes(hash.s) ? hash.s : OPENING.speed)
  const [metric, setMetric] = useState('corrected')
  const [selected, setSelected] = useState(OPENING.selected)
  const [cc, setCC] = useState(true)
  const [toast, setToast] = useState('')
  const [showKeys, setShowKeys] = useState(false)
  const [focusId, setFocusId] = useState(null)
  const [clipRun, setClipRun] = useState(false)

  // saved bookmarks / clip, per replay -------------------------------------
  const [bmAll, setBmAll] = useState(() => readLS(LS.bm))
  const [clipAll, setClipAll] = useState(() => readLS(LS.clip))
  const bookmarks = useMemo(() => {
    const saved = bmAll[replayId]
    if (saved) return saved
    return R.meta.bookmarks.map((b, i) => ({ id: `seed${i}`, ...b }))
  }, [bmAll, replayId, R])
  const clip = useMemo(() => {
    if (hash.ci != null && replayId === startId && !clipAll[replayId]) return { in: hash.ci, out: hash.co }
    return clipAll[replayId] || (isOpening ? OPENING.clip : { in: null, out: null })
  }, [clipAll, replayId, isOpening, hash, startId])
  const setBookmarks = (fn) => setBmAll((all) => {
    const cur = all[replayId] || R.meta.bookmarks.map((b, i) => ({ id: `seed${i}`, ...b }))
    const next = { ...all, [replayId]: fn(cur).slice().sort((a, b) => a.f - b.f) }
    writeLS(LS.bm, next)
    return next
  })
  const setClip = (c) => setClipAll((all) => {
    const next = { ...all, [replayId]: c }
    writeLS(LS.clip, next)
    return next
  })

  // playback ----------------------------------------------------------------
  const tRef = useRef(t)
  tRef.current = t
  const seek = useCallback((f, keepClip = false) => {
    const nf = Math.min(Math.max(f, 0), last)
    tRef.current = nf
    setT(nf)
    if (!keepClip) setClipRun(false)
  }, [last])

  useEffect(() => {
    if (!playing) return
    let raf
    let prev = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.25, (now - prev) / 1000)
      prev = now
      const n = frameToNar(R.map, tRef.current) + dt * speed
      let nt = narToFrame(R.map, n)
      let stop = false
      if (clipRun && clip.out != null && nt >= clip.out) { nt = clip.out; stop = true }
      if (n >= R.map.total || nt >= last) { nt = last; stop = true }
      tRef.current = nt
      setT(nt)
      if (stop) { setPlaying(false); setClipRun(false); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, R, clipRun, clip.out, last])

  const frame = Math.round(t)
  const nar = frameToNar(R.map, t)
  const stepFrames = (d) => { setPlaying(false); seek(Math.round(tRef.current) + d) }
  const togglePlay = () => {
    if (playing) { setPlaying(false); setClipRun(false); return }
    if (tRef.current >= last - 0.01) seek(0)
    setPlaying(true)
  }

  // chapters / key moments ------------------------------------------------
  const chapterIdx = useMemo(() => {
    let idx = -1
    R.chapters.forEach((c, i) => { if (frame >= c.f0) idx = i })
    return idx
  }, [R, frame])
  const stops = useMemo(() => (R.chapters.length ? R.chapters.map((c) => c.f0) : R.keyMoments.map((k) => k.frame).sort((a, b) => a - b)), [R])
  const jumpStop = (dir) => {
    const cur = Math.round(tRef.current)
    let target
    if (dir > 0) target = stops.find((s) => s > cur)
    else if (R.chapters.length) {
      // first press goes to the start of the current chapter; pressing again (or being
      // within a few seconds of the start) goes to the chapter before
      const n = frameToNar(R.map, tRef.current)
      const idx = R.chapters.reduce((a, c, i) => (cur >= c.f0 ? i : a), 0)
      const c = R.chapters[idx]
      target = n - c.n0 > 3 ? c.f0 : (R.chapters[idx - 1]?.f0 ?? 0)
    } else {
      target = [...stops].reverse().find((s) => s < cur) ?? 0
    }
    seek(target ?? last)
  }
  const playChapter = (i) => {
    seek(R.chapters[i].f0)
    setPlaying(true)
  }

  const cueIdx = useMemo(() => R.cues.findIndex((c) => nar >= c.n0 && (nar < c.n1 || c.n1 >= R.map.total)), [R, nar])
  // most recent line already spoken: the transcript follows this one even during silences
  const lastCue = useMemo(() => R.cues.reduce((a, c) => (nar >= c.n0 ? c.i : a), -1), [R, nar])

  // bookmarks ---------------------------------------------------------------
  const addBookmark = () => {
    const f = Math.round(tRef.current)
    const existing = bookmarks.find((b) => b.f === f)
    if (existing) { setFocusId(existing.id); flash('Already bookmarked: edit the note'); return }
    const b = { id: newId(), f, note: '' }
    setBookmarks((l) => [...l, b])
    setFocusId(b.id)
  }
  const removeBookmark = (id) => setBookmarks((l) => l.filter((b) => b.id !== id))
  const editBookmark = (id, note) => setBookmarks((l) => l.map((b) => (b.id === id ? { ...b, note } : b)))

  // clip ----------------------------------------------------------------------
  const setIn = () => {
    const f = Math.round(tRef.current)
    setClip({ in: f, out: clip.out != null && clip.out > f ? clip.out : null })
  }
  const setOut = () => {
    const f = Math.round(tRef.current)
    if (clip.in == null || f <= clip.in) { flash('Put the playhead after the In point first'); return }
    setClip({ in: clip.in, out: f })
  }
  const clipSeconds = clip.in == null ? null : clip.out != null ? frameToNar(R.map, clip.out) - frameToNar(R.map, clip.in) : Math.max(0, nar - frameToNar(R.map, clip.in))
  const playClip = () => {
    if (clip.in == null || clip.out == null) return
    seek(clip.in, true)
    setClipRun(true)
    setPlaying(true)
  }

  // sharing -------------------------------------------------------------------
  const hashFor = (f = frame) => {
    const p = new URLSearchParams({ r: replayId, t: String(f), s: String(speed) })
    if (clip.in != null) p.set('ci', clip.in)
    if (clip.out != null) p.set('co', clip.out)
    return `#${p.toString()}`
  }
  useEffect(() => {
    if (playing) return
    const id = setTimeout(() => history.replaceState(null, '', hashFor()), 250)
    return () => clearTimeout(id)
  })
  const flash = (msg) => {
    setToast(msg)
    clearTimeout(flash.id)
    flash.id = setTimeout(() => setToast(''), 2600)
  }
  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      ta.remove()
    }
    flash(msg)
  }
  const link = () => `${location.origin}${location.pathname}${hashFor()}`
  const copyLink = () => copy(link(), 'Link to this moment copied')
  const copyNotes = () => {
    const m = R.meta
    const lines = [`Hazereel · ${m.title} (${m.dates})`, '']
    if (clip.in != null) {
      lines.push(
        `Clip for council: ${stamp(m.startMs, clip.in)} → ${clip.out != null ? stamp(m.startMs, clip.out) : '(end not set)'}` +
          (clip.out != null ? ` (running time ${mmss(clipSeconds)} at 1× speed)` : ''),
        '',
      )
    }
    if (bookmarks.length) {
      lines.push('Bookmarks:')
      for (const b of bookmarks) lines.push(`• ${stamp(m.startMs, b.f)}${b.note ? ' · ' + b.note : ''}`)
      lines.push('')
    }
    lines.push(`Watch at this moment: ${link()}`)
    copy(lines.join('\n'), 'Notes copied to your clipboard')
  }

  // switching replays -----------------------------------------------------------
  const switchReplay = (id) => {
    if (id === replayId) return
    setPlaying(false)
    setClipRun(false)
    setReplayId(id)
    const next = loadReplay(id)
    const f0 = id === DEFAULT_ID ? OPENING.t : 0
    tRef.current = f0
    setT(f0)
    setSelected(next.data.peak.sensor)
    setSpeed(1)
  }

  // keyboard ----------------------------------------------------------------------
  const kb = useRef()
  kb.current = { togglePlay, stepFrames, jumpStop, addBookmark, setIn, setOut, setCC, seek, last, setSpeed, copyLink, setShowKeys }
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = kb.current
      const onButton = tag === 'BUTTON' || tag === 'A'
      switch (e.key) {
        case ' ':
          if (onButton) return
          e.preventDefault(); k.togglePlay(); break
        case 'ArrowLeft': e.preventDefault(); k.stepFrames(e.shiftKey ? -6 : -1); break
        case 'ArrowRight': e.preventDefault(); k.stepFrames(e.shiftKey ? 6 : 1); break
        case 'PageUp': e.preventDefault(); k.stepFrames(-144); break
        case 'PageDown': e.preventDefault(); k.stepFrames(144); break
        case 'Home': e.preventDefault(); k.seek(0); break
        case 'End': e.preventDefault(); k.seek(k.last); break
        case '[': k.jumpStop(-1); break
        case ']': k.jumpStop(1); break
        case 'b': case 'B': e.preventDefault(); k.addBookmark(); break
        case 'i': case 'I': k.setIn(); break
        case 'o': case 'O': k.setOut(); break
        case 'c': case 'C': k.setCC((v) => !v); break
        case '1': k.setSpeed(0.5); break
        case '2': k.setSpeed(1); break
        case '3': k.setSpeed(2); break
        case '4': k.setSpeed(4); break
        case '?': k.setShowKeys((v) => !v); break
        case 'Escape': k.setShowKeys(false); break
        default:
      }
    }
    // After a mouse click on a button, let go of focus so Space still means play / pause.
    const onClick = (e) => {
      const b = e.target.closest?.('button')
      if (b && e.detail > 0) setTimeout(() => b.blur(), 0)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClick)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('click', onClick) }
  }, [])

  const selectedInfo = selected
  const stamps = { long: stampLong(R.meta.startMs, frame), short: stamp(R.meta.startMs, frame) }

  return (
    <div className="app">
      <Header
        R={R}
        replays={REPLAYS}
        onSwitch={switchReplay}
        onCopyLink={copyLink}
        onCopyNotes={copyNotes}
        showKeys={showKeys}
        setShowKeys={setShowKeys}
      />
      <Left
        R={R}
        frame={frame}
        nar={nar}
        chapterIdx={chapterIdx}
        onPlayChapter={playChapter}
        bookmarks={bookmarks}
        focusId={focusId}
        clearFocus={() => setFocusId(null)}
        onSeek={seek}
        onAdd={addBookmark}
        onRemove={removeBookmark}
        onEdit={editBookmark}
        onCopyNotes={copyNotes}
        clip={clip}
        clipSeconds={clipSeconds}
        onSetIn={setIn}
        onSetOut={setOut}
        onClearClip={() => setClip({ in: null, out: null })}
        onPlayClip={playClip}
        clipRun={clipRun}
      />
      <section className="center" aria-label="Map of readings">
        <StatStrip R={R} frame={frame} metric={metric} />
        <MapView
          R={R}
          frame={frame}
          stamp={stamps.short}
          metric={metric}
          setMetric={setMetric}
          selected={selectedInfo}
          onSelect={setSelected}
        />
        <Legend />
        <CaptionBand R={R} cue={R.cues[cueIdx]} chapter={R.chapters[chapterIdx]} cc={cc} setCC={setCC} />
      </section>
      <Right
        R={R}
        frame={frame}
        metric={metric}
        selected={selectedInfo}
        cueIdx={cueIdx}
        lastCue={lastCue}
        playing={playing}
        onSeek={seek}
      />
      <Dock
        R={R}
        t={t}
        frame={frame}
        nar={nar}
        stampLong={stamps.long}
        chapter={R.chapters[chapterIdx]}
        playing={playing}
        speed={speed}
        setSpeed={setSpeed}
        metric={metric}
        togglePlay={togglePlay}
        onStep={stepFrames}
        onJump={jumpStop}
        onSeek={seek}
        setPlaying={setPlaying}
        bookmarks={bookmarks}
        clip={clip}
        chapterIdx={chapterIdx}
        onAddBookmark={addBookmark}
      />
      <div className="toast" role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
