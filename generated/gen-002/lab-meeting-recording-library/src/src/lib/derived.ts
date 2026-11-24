import { ACTIONS, INITIAL_HEARD, INITIAL_POS, RECORDINGS, recById } from '../data/recordings'
import { DECISION_LABELS } from '../data/decisions'
import type { Chapter, Recording, Turn, Verdict } from '../data/types'
import { clock } from './format'

export const NAME_RE = /\b(Adaeze|Okonkwo)\b/

export interface Seg {
  id: string
  rec: string
  start: number
  end: number
  label: string
}

export interface Mention {
  id: string
  rec: string
  t: number
  who: string
  text: string
  clip: Seg
}

export interface Decision {
  id: string
  rec: string
  t: number
  end: number
  label: string
}

const chronological = [...RECORDINGS].sort((a, b) => a.date.localeCompare(b.date))
export const CHRONO = chronological

export const MENTIONS: Mention[] = chronological.flatMap((r) =>
  r.turns
    .filter((t) => NAME_RE.test(t.text))
    .map((t) => {
      const start = Math.max(0, t.t - 20)
      return {
        id: `${r.id}@${t.t}`,
        rec: r.id,
        t: t.t,
        who: t.who,
        text: t.text,
        clip: { id: `clip-${r.id}-${t.t}`, rec: r.id, start, end: Math.min(r.duration, start + 90), label: `Your name · ${r.short}` },
      }
    }),
)

export const decisionsOf = (r: Recording): Decision[] =>
  r.turns.flatMap((t, i) => {
    if (!t.decision) return []
    const next = r.turns[i + 1]?.t ?? r.duration
    return [{ id: `${r.id}@${t.t}`, rec: r.id, t: t.t, end: Math.min(next, t.t + 120), label: DECISION_LABELS[`${r.id}@${clock(t.t)}`] ?? 'Decision' }]
  })

export const DECISIONS: Record<string, Decision[]> = Object.fromEntries(RECORDINGS.map((r) => [r.id, decisionsOf(r)]))

export const chapterAt = (r: Recording, t: number): Chapter =>
  r.chapters.find((c) => t >= c.start && t < c.end) ?? r.chapters[r.chapters.length - 1]

export const turnIndexAt = (r: Recording, t: number): number => {
  let lo = 0
  let hi = r.turns.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (r.turns[mid].t <= t) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return ans
}

export const inDecision = (recId: string, t: number): Decision | undefined =>
  DECISIONS[recId].find((d) => t >= d.t && t < d.end)

// ---- heard ranges -----------------------------------------------------------------
export type Ranges = [number, number][]

export const addRange = (rs: Ranges, a: number, b: number): Ranges => {
  if (b <= a) return rs
  const out: Ranges = []
  let s = a
  let e = b
  let placed = false
  for (const r of rs) {
    if (r[1] < s - 0.6) out.push(r)
    else if (r[0] > e + 0.6) {
      if (!placed) {
        out.push([s, e])
        placed = true
      }
      out.push(r)
    } else {
      s = Math.min(s, r[0])
      e = Math.max(e, r[1])
    }
  }
  if (!placed) out.push([s, e])
  return out
}

export const overlap = (rs: Ranges | undefined, a: number, b: number): number =>
  (rs ?? []).reduce((sum, r) => sum + Math.max(0, Math.min(r[1], b) - Math.max(r[0], a)), 0)

export const resumePoint = (rs: Ranges | undefined, seg: { start: number; end: number }): number => {
  let pos = seg.start
  for (const r of rs ?? []) if (r[0] <= pos + 1 && r[1] > pos) pos = r[1]
  return Math.min(pos, Math.max(seg.start, seg.end - 1))
}

export const segDone = (heard: Record<string, Ranges>, seg: Seg): boolean =>
  overlap(heard[seg.rec], seg.start, seg.end) >= (seg.end - seg.start) * 0.9

// ---- the catch-up path --------------------------------------------------------------
export interface PathItem extends Seg {
  verdict: Verdict
  chapter: Chapter
  recording: Recording
}

const toItem = (r: Recording, c: Chapter): PathItem => ({
  id: c.id,
  rec: r.id,
  start: c.start,
  end: c.end,
  label: `${c.title} · ${r.short}`,
  verdict: c.verdict,
  chapter: c,
  recording: r,
})

export const PATH_LISTEN: PathItem[] = chronological.flatMap((r) => r.chapters.filter((c) => c.verdict === 'listen').map((c) => toItem(r, c)))
export const PATH_SKIM: PathItem[] = chronological.flatMap((r) => r.chapters.filter((c) => c.verdict === 'skim').map((c) => toItem(r, c)))
export const PATH_SKIP: PathItem[] = chronological.flatMap((r) => r.chapters.filter((c) => c.verdict === 'skip').map((c) => toItem(r, c)))
export const PATH: PathItem[] = [...PATH_LISTEN, ...PATH_SKIM]

export const unheard = (heard: Record<string, Ranges>, items: Seg[]): number =>
  items.reduce((s, it) => s + (it.end - it.start - overlap(heard[it.rec], it.start, it.end)), 0)

export const TOTAL_SECONDS = RECORDINGS.reduce((s, r) => s + r.duration, 0)

// ---- Thursday prep: the two chapters that feed the cruise data plan talk --------------
export const PREP: PathItem[] = PATH.filter((p) => p.chapter.topic === 'dataplan' && p.verdict === 'listen')

// ---- Topic threads -------------------------------------------------------------------
export interface ThreadStep {
  rec: string
  chapterId: string
  label: string
}
export interface Thread {
  id: string
  title: string
  gist: string[]
  yours: string
  steps: ThreadStep[]
}

const step = (rec: string, idx: number, label: string): ThreadStep => ({ rec, chapterId: recById(rec).chapters[idx].id, label })

export const THREADS: Thread[] = [
  {
    id: 'cytometer',
    title: 'Sharing the flow cytometer',
    gist: [
      'Shared calendar since Oct 26, replacing the paper sheet. Blocks of 4 h, two a week, cancel 24 h ahead.',
      'Two priority blocks a week for time-sensitive samples. Prof. Halvorsen decides the criteria; field campaigns that can’t be repeated qualify.',
      'Ten days in: collisions down to one, unused booked hours down from 40% to 18%.',
    ],
    yours: 'Your cruise samples qualify for priority time. Jun is holding two blocks the week of Nov 23.',
    steps: [
      step('oct15', 4, 'Oct 15 · The backlog'),
      step('oct22', 1, 'Oct 22 · The rules'),
      step('oct29', 1, 'Oct 29 · First days'),
      step('nov5', 1, 'Nov 5 · Ten-day check'),
    ],
  },
  {
    id: 'authorship',
    title: 'Kelp manuscript authorship',
    gist: [
      'Oct 29: Diego and Maren disagreed over first-author order. Prof. Halvorsen stopped the argument and moved order to written contribution statements.',
      'Nov 5: Diego and Maren are co-first authors. Middle authors are decided by statements, with a week to object in writing.',
      'Prof. Halvorsen said your transect design underlies roughly 40% of the plots in Figure 3, and that you get the same process as everyone.',
    ],
    yours: 'Your CRediT statement is due Fri Nov 20. Diego’s revised draft was due Nov 13 and is still open on the action list.',
    steps: [
      step('oct15', 5, 'Oct 15 · Placeholder list'),
      step('oct29', 4, 'Oct 29 · The disagreement'),
      step('nov5', 3, 'Nov 5 · The decision'),
    ],
  },
  {
    id: 'dataplan',
    title: 'Your cruise data plan',
    gist: [
      'One page, 15 minutes, on Thu Nov 19: what was collected, where raw files live, naming, first-pass QC, sharing.',
      'The group asked for: CTD reprocessed from raw casts, a check of the operator’s embargo, and a second person checking station IDs against the paper log.',
      'Raw files go to the NAS read-only within 10 days of docking. The Nov 7 journal club adds checksums and a 48-hour scan of paper logs.',
    ],
    yours: 'You present Thursday. Priya has agreed to do the station-ID check.',
    steps: [
      step('oct29', 2, 'Oct 29 · Station-ID gap'),
      step('nov5', 4, 'Nov 5 · What the plan covers'),
      step('nov7', 2, 'Nov 7 · What to borrow'),
    ],
  },
]

export const MY_ACTIONS = ACTIONS.filter((a) => a.owner === 'me')
export { INITIAL_HEARD, INITIAL_POS }
export type { Turn }
