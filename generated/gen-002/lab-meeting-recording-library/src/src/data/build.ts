import type { Chapter, Recording, Turn, Verdict, Topic } from './types'

export const mmss = (s: string): number => {
  const p = s.split(':').map(Number)
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]
}

type ChSpec = [at: string, title: string, verdict: Verdict, topic: Topic | '', note: string]
// 'D' marks a turn where the PI (or chair) states a decision.
type TurnSpec = [at: string, who: string, text: string, flag?: 'D']

export function recording(
  base: Omit<Recording, 'chapters' | 'turns' | 'duration' | 'attendees'> & { length: string },
  chapters: ChSpec[],
  turns: TurnSpec[],
): Recording {
  const duration = mmss(base.length)
  const chs: Chapter[] = chapters.map((c, i) => ({
    id: `${base.id}-c${i + 1}`,
    start: mmss(c[0]),
    end: i + 1 < chapters.length ? mmss(chapters[i + 1][0]) : duration,
    title: c[1],
    verdict: c[2],
    topic: c[3] || undefined,
    note: c[4],
  }))
  const ts: Turn[] = turns.map((t) => ({ t: mmss(t[0]), who: t[1], text: t[2], decision: t[3] === 'D' || undefined }))
  const attendees = Array.from(new Set(ts.map((t) => t.who)))
  const { length: _l, ...rest } = base
  return { ...rest, duration, chapters: chs, turns: ts, attendees }
}
