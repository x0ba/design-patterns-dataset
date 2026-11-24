import { useSyncExternalStore } from 'react'
import { INITIAL_HEARD, INITIAL_POS, SAVED_RATE, recById } from '../data/recordings'
import { PATH, addRange, chapterAt, inDecision, resumePoint, segDone, type Ranges, type Seg } from './derived'

export const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5]

export interface PState {
  rec: string
  t: number
  playing: boolean
  rate: number
  queue: Seg[] | null
  qi: number
  mode: 'free' | 'path' | 'clip'
  autoSlow: boolean
  smartSkip: boolean
  slowed: boolean
  heard: Record<string, Ranges>
  pos: Record<string, number>
  clipEnded: Seg | null
  toast: { id: number; msg: string } | null
}

let state: PState = {
  rec: 'oct15',
  t: INITIAL_POS.oct15,
  playing: false,
  rate: SAVED_RATE,
  queue: null,
  qi: 0,
  mode: 'free',
  autoSlow: false,
  smartSkip: false,
  slowed: false,
  heard: JSON.parse(JSON.stringify(INITIAL_HEARD)),
  pos: { ...INITIAL_POS },
  clipEnded: null,
  toast: null,
}

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const set = (p: Partial<PState>) => {
  state = { ...state, ...p }
  emit()
}
export const getState = () => state
export const usePlayer = (): PState =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )

let toastId = 0
const toast = (msg: string) => set({ toast: { id: ++toastId, msg } })
export const clearToast = () => set({ toast: null })

// ---- engine -----------------------------------------------------------------------
let last = performance.now()

const tick = () => {
  const now = performance.now()
  const dt = Math.min(2, (now - last) / 1000)
  last = now
  const s = state
  if (!s.playing) return
  const r = recById(s.rec)
  const dec = s.autoSlow ? inDecision(s.rec, s.t) : undefined
  const eff = dec ? Math.min(s.rate, 1) : s.rate
  const slowed = !!dec && s.rate > 1
  let t = s.t + dt * eff
  let heard = s.heard
  const rec = s.rec
  let patch: Partial<PState> = {}

  const markHeard = (a: number, b: number) => {
    heard = { ...heard, [rec]: addRange(heard[rec] ?? [], a, b) }
  }

  if (s.queue) {
    const seg = s.queue[s.qi]
    if (seg.rec === rec && t >= seg.end) {
      markHeard(s.t, seg.end)
      if (s.mode === 'clip') {
        set({ t: seg.end, playing: false, clipEnded: seg, heard, queue: null, mode: 'free', slowed: false, pos: { ...s.pos, [rec]: seg.end } })
        return
      }
      // path: advance to next item that isn't already heard
      const h = heard
      let j = s.qi + 1
      while (j < s.queue.length && segDone(h, s.queue[j])) j++
      if (j >= s.queue.length) {
        set({ t: seg.end, playing: false, queue: null, mode: 'free', heard, slowed: false, pos: { ...s.pos, [rec]: seg.end } })
        toast('You’ve finished your listening path.')
        return
      }
      const nx = s.queue[j]
      const nt = resumePoint(h[nx.rec], nx)
      set({ rec: nx.rec, t: nt, qi: j, heard, slowed: false, pos: { ...s.pos, [rec]: seg.end, [nx.rec]: nt } })
      toast(`Next: ${nx.label}`)
      return
    }
  } else if (s.smartSkip) {
    const ch = chapterAt(r, t)
    if (ch.verdict === 'skip' && ch.end < r.duration) {
      markHeard(s.t, s.t) // nothing heard
      patch = { t: ch.end, heard, slowed, pos: { ...s.pos, [rec]: ch.end } }
      set(patch)
      toast(`Skipped “${ch.title}”`)
      return
    }
  }

  if (t >= r.duration) {
    markHeard(s.t, r.duration)
    set({ t: r.duration, playing: false, heard, slowed: false, pos: { ...s.pos, [rec]: r.duration } })
    return
  }
  markHeard(s.t, t)
  set({ t, heard, slowed, pos: { ...s.pos, [rec]: t } })
}
setInterval(tick, 250)

// ---- actions ----------------------------------------------------------------------
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export const play = () => {
  last = performance.now()
  const s = state
  const r = recById(s.rec)
  const t = s.t >= r.duration - 0.5 ? 0 : s.t
  set({ playing: true, t, clipEnded: null })
}
export const pause = () => set({ playing: false, slowed: false })
export const toggle = () => (state.playing ? pause() : play())

/** Move the playhead. Leaving the current queue segment drops out of path/clip mode. */
export const seek = (rec: string, t: number, opts: { play?: boolean } = {}) => {
  const r = recById(rec)
  t = clamp(t, 0, r.duration - 0.5)
  let { queue, qi, mode } = state
  if (queue) {
    const inCur = queue[qi].rec === rec && t >= queue[qi].start && t < queue[qi].end
    if (!inCur) {
      const j = mode === 'path' ? queue.findIndex((q) => q.rec === rec && t >= q.start && t < q.end) : -1
      if (j >= 0) qi = j
      else {
        queue = null
        mode = 'free'
      }
    }
  }
  last = performance.now()
  set({ rec, t, queue, qi, mode, clipEnded: null, slowed: false, pos: { ...state.pos, [rec]: t }, ...(opts.play ? { playing: true } : {}) })
}

export const skipBy = (d: number) => seek(state.rec, state.t + d)

export const setRate = (rate: number) => set({ rate })
export const stepRate = (dir: 1 | -1) => {
  const i = RATES.indexOf(state.rate)
  const n = clamp((i < 0 ? RATES.indexOf(1.5) : i) + dir, 0, RATES.length - 1)
  set({ rate: RATES[n] })
}
export const toggleAutoSlow = () => set({ autoSlow: !state.autoSlow })
export const toggleSmartSkip = () => set({ smartSkip: !state.smartSkip })

export const startPath = (index = 0, items: Seg[] = PATH, from?: number) => {
  const seg = items[index]
  const t = from ?? resumePoint(state.heard[seg.rec], seg)
  last = performance.now()
  set({ queue: items, qi: index, mode: 'path', rec: seg.rec, t, playing: true, clipEnded: null, slowed: false, pos: { ...state.pos, [seg.rec]: t } })
}

export const playClip = (seg: Seg) => {
  last = performance.now()
  set({ queue: [seg], qi: 0, mode: 'clip', rec: seg.rec, t: seg.start, playing: true, clipEnded: null, slowed: false, pos: { ...state.pos, [seg.rec]: seg.start } })
}

export const jumpChapter = (dir: 1 | -1) => {
  const r = recById(state.rec)
  const cur = chapterAt(r, state.t)
  if (dir === 1) {
    const nx = r.chapters.find((c) => c.start >= cur.end - 0.1)
    if (nx) seek(r.id, nx.start)
  } else {
    if (state.t - cur.start > 4) seek(r.id, cur.start)
    else {
      const i = r.chapters.indexOf(cur)
      seek(r.id, r.chapters[Math.max(0, i - 1)].start)
    }
  }
}

/** Resume a recording where Dr. Okonkwo last was, then play. */
export const resumeRec = (rec: string) => {
  const p = state.pos[rec] ?? 0
  seek(rec, p >= recById(rec).duration - 1 ? 0 : p, { play: true })
}
