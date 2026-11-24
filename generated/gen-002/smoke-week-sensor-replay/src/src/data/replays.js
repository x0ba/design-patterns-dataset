import { generate, smokeWeekScenario, fireworksScenario, harlowScenario, f } from './generate.js'

export const SPEECH_WPS = 2.5 // words per second for the narrator

const SMOKE_CUES = [
  // --- 1 · The smoke arrives
  [6, "Good morning, Eastbank. It's just after midnight on Friday, September eleventh, and this is what clean air looks like: forty-six backyard sensors and the regional monitor, all reading under nine."],
  [78, 'Friday afternoon. Nothing yet. The smoke has been forecast for days, but the map is still green.'],
  [112, "Around seven the whole map turns yellow, nearly at once. That tells us it's a front moving through, not one backyard fire."],
  [132, 'By ten p.m. readings are climbing toward thirty. Remember these numbers; by Tuesday they will look small.'],
  [150, 'Saturday, one a.m. The typical sensor reads thirty-five. Linden is right in the pack.'],
  [180, "Saturday dawn. Most sensors are in the low forties, orange on the map. That's the level for sensitive groups: children, older neighbors, anyone with asthma."],
  [205, 'It did not arrive with a bang. It crept in over about a day.'],
  // --- 2 · Three days of haze
  [219, "Saturday afternoon to Monday evening is what I call the long haze. Nothing dramatic here. The regional monitor and our backyard sensors agree, mostly in the forties."],
  [258, 'Notice that evenings run higher than afternoons. Smoke settles as the air cools, and low spots like Millrace and Linden collect it first.'],
  [326, "Sunday, 6:20 a.m. The sensor on the 100 block of 12th Street in Millrace stops reporting, and never comes back. A hollow circle means offline. We don't know what the air is doing there; it does not mean clean."],
  [419, 'Sunday night a second sensor, in Alder Terrace, goes dark. It will be back Monday morning.'],
  [519, "Monday, 2:30 p.m. Sycamore Hill's sensor on the 1400 block of Ridge Road drops out too. Now we are listening with forty-four ears, not forty-six."],
  // --- 3 · Night of the 14th at Linden Elementary
  [552, "It's eight o'clock Monday night, September fourteenth. Look at the five sensors around Linden Elementary. They read in the high thirties, same as everywhere else in Eastbank."],
  [557, 'The school sits at the bottom of a shallow bowl. On calm, cool nights, smoke drains downhill and pools there, like water in a basin.'],
  [570, "Eleven p.m. Watch the sensor on the 1200 block of Linden Avenue, across the street from the school. It's at forty-six, and climbing."],
  [576, 'Midnight. That same sensor reads 107. The school area averages 88. The regional monitor, the official one, says 36.'],
  [582, 'One a.m. The school area is at 147. The regional monitor: 39. Nobody relying on the official number would know anything was wrong.'],
  [592, "Two-forty a.m. Two hundred and eighty-seven micrograms per cubic meter, hazardous, across the street from the school. The regional monitor reads 43. This is the highest reading anywhere in Eastbank all week."],
  [596, 'By twenty past three it is easing, but the sensor on Mill Street, a few doors away, goes offline at that moment. It will not report again until two in the afternoon.'],
  // --- 4 · When the regional alert came
  [600, 'Four a.m. The pool over the school is thinning, but the school area still averages 131. The regional monitor reads 50.'],
  [606, "Five o'clock. The regional monitor crosses 55 for the first time, officially unhealthy. The school area crossed that line five and a half hours earlier, at 11:30 the night before."],
  [616, 'Six-forty. The regional monitor passes 100.'],
  [619, 'Seven-ten a.m. The regional alert goes out. By now the school area has been above 100 for nearly seven hours.'],
  [628, 'Twenty to nine. Now the whole town has caught up with the school: 132 here, 138 at the regional monitor. The disagreement is over, but the hours when a warning mattered most are gone.'],
  [641, 'That gap, about seven hours, is what this chapter is about.'],
  // --- 5 · A day indoors
  [652, "Tuesday afternoon is the worst stretch of the week for everyone, not just Linden. The typical sensor reads about 150, which the scale calls very unhealthy, and the regional monitor agrees."],
  [690, "By evening the school area is within about ten points of the regional monitor. When smoke covers the whole region, the official number is a fair stand-in for our block. The trouble is the night before, when it wasn't."],
  [726, 'Midnight into Wednesday. Readings ease off slowly, still above 100 almost everywhere.'],
  [771, "Wednesday, 8:30 a.m. The Cooper's Ferry sensor on 18th Street, quiet since Tuesday afternoon, reports again."],
  // --- 6 · The wind turns
  [796, 'Wednesday afternoon the wind finally turns, and you can watch it work. First the school area, then the rest of the map, slips below 100.'],
  [832, "Six-forty p.m. The typical sensor is at 90 and falling. Good news, with a caveat: falling is not safe. Anything above 55 is still unhealthy."],
  [866, 'Midnight into Thursday. Sixty-five, and heading back toward where we started the week.'],
  [900, 'Thursday morning. Low forties again, orange on the map, the same level as that first hazy Saturday.'],
  [950, 'Thursday, twenty past two in the afternoon. The typical sensor reads about 19. Yellow. Moderate.'],
  [982, "And that's the week. Forty-four of our forty-six sensors are still reporting. The two that went quiet, in Millrace and Sycamore Hill, are on my list for a visit. Thank you for watching."],
]

const SMOKE_CHAPTERS = [
  { title: 'The smoke arrives', f0: 0, dur: 130, summary: 'From clean air to the first haze' },
  { title: 'Three days of haze', f0: 216, dur: 140, summary: 'The long, steady stretch, and the first dropouts' },
  { title: 'Night of the 14th at Linden Elementary', f0: 552, dur: 190, summary: 'Smoke pools around the school' },
  { title: 'When the regional alert came', f0: 600, dur: 150, summary: 'Hours later, the official alert' },
  { title: 'A day indoors', f0: 648, dur: 100, summary: 'The worst of the week, region-wide' },
  { title: 'The wind turns', f0: 792, dur: 130, summary: 'Clearing, and the sensors that stayed quiet' },
]

const SMOKE_BOOKMARKS = [
  { f: 570, note: 'First jump at the school (EB-017 at 46). Regional still in the 30s. Clip starts here?' },
  { f: 592, note: 'THE PEAK. 287. Regional says 43 at this same minute. Say the number out loud.' },
  { f: 619, note: 'Alert goes out ~7 hrs after the school passed 100. This is the gap to ask council about.' },
]

export const REPLAYS = [
  {
    id: 'smoke-2026',
    title: 'September wildfire-smoke week',
    short: 'Smoke week',
    dates: 'Sep 11–17, 2026',
    startMs: Date.UTC(2026, 8, 11),
    frames: 1008,
    sensorCount: 46,
    scenario: smokeWeekScenario,
    alert: { frame: 619, label: 'Regional alert' },
    narration: { narrator: 'Ama Lindqvist', total: 840, chapters: SMOKE_CHAPTERS, cues: SMOKE_CUES },
    bookmarks: SMOKE_BOOKMARKS,
  },
  {
    id: 'fireworks-2026',
    title: 'July 4 fireworks',
    short: 'July 4',
    dates: 'Jul 3–6, 2026',
    startMs: Date.UTC(2026, 6, 3, 12),
    frames: 432,
    sensorCount: 44,
    scenario: fireworksScenario,
    alert: null,
    narration: null,
    bookmarks: [],
  },
  {
    id: 'harlow-2025',
    title: '2025 Harlow Fire',
    short: 'Harlow Fire',
    dates: 'Aug 22–26, 2025',
    startMs: Date.UTC(2025, 7, 22),
    frames: 720,
    sensorCount: 38,
    scenario: harlowScenario,
    alert: { frame: f(1, 23, 0), label: 'Regional alert' },
    narration: null,
    bookmarks: [],
  },
]

// --------------------------------------------------------------------------
// Time map: one playhead, two clocks. The playhead is a (fractional) frame
// index. Narrated replays pace each chapter to its recording, so the frame
// rate varies by chapter; un-narrated replays run a plain 6 frames / second.
// --------------------------------------------------------------------------
export function buildTimeMap(r) {
  const last = r.frames - 1
  if (!r.narration) {
    return { segs: [{ f0: 0, f1: last, n0: 0, n1: last / 6 }], total: last / 6 }
  }
  const ch = r.narration.chapters
  let n = 0
  const segs = ch.map((c, i) => {
    const f1 = i + 1 < ch.length ? ch[i + 1].f0 : last
    const seg = { f0: c.f0, f1, n0: n, n1: n + c.dur }
    n += c.dur
    return seg
  })
  return { segs, total: n }
}
export function frameToNar(map, t) {
  const { segs } = map
  for (const s of segs) if (t <= s.f1 || s === segs[segs.length - 1]) return s.n0 + ((Math.min(t, s.f1) - s.f0) / (s.f1 - s.f0)) * (s.n1 - s.n0)
  return 0
}
export function narToFrame(map, n) {
  const { segs } = map
  for (const s of segs) if (n <= s.n1 || s === segs[segs.length - 1]) return s.f0 + ((Math.min(Math.max(n, 0), s.n1) - s.n0) / (s.n1 - s.n0)) * (s.f1 - s.f0)
  return 0
}

const cache = new Map()
export function loadReplay(id) {
  if (cache.has(id)) return cache.get(id)
  const meta = REPLAYS.find((r) => r.id === id)
  const data = generate(meta.scenario())
  const map = buildTimeMap(meta)
  let chapters = []
  let cues = []
  if (meta.narration) {
    chapters = meta.narration.chapters.map((c, i) => ({
      ...c,
      index: i,
      f1: map.segs[i].f1,
      n0: map.segs[i].n0,
      n1: map.segs[i].n1,
    }))
    cues = meta.narration.cues.map(([fr, text], i) => {
      const n0 = frameToNar(map, fr)
      const words = text.split(/\s+/).length
      return { i, f: fr, n0, text, speech: words / SPEECH_WPS, chapter: chapters.findIndex((c) => fr >= c.f0 && fr < c.f1 + (c.index === chapters.length - 1 ? 1 : 0)) }
    })
    cues.forEach((c, i) => {
      const next = cues[i + 1]
      c.n1 = Math.min(next ? next.n0 : Infinity, c.n0 + c.speech + 2.5, map.total)
    })
  }
  const keyMoments = [{ kind: 'peak', frame: data.peak.frame, label: 'Peak', value: data.peak.value, sensor: data.peak.sensor }]
  if (meta.alert) keyMoments.push({ kind: 'alert', frame: meta.alert.frame, label: meta.alert.label })
  const out = { meta, data, map, chapters, cues, keyMoments }
  cache.set(id, out)
  return out
}
