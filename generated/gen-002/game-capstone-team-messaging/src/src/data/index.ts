import type { FileMeta, Msg, Person, Slot, Thread } from './types'
import { DANA_CRITIQUE } from './danaMessage'

/** The app opens on Sunday evening, Nov 15 2026 (week 12 of 15), Pacific time. */
export const MOCK_NOW = new Date('2026-11-15T19:42:00-08:00')
export const BETA_DUE = new Date('2026-12-01T23:59:00-08:00')
export const ME = 'priya'

export const PEOPLE: Record<string, Person> = {
  priya: { id: 'priya', name: 'Priya Raman', first: 'Priya', role: 'student', title: 'Producer', hue: 18 },
  jonah: { id: 'jonah', name: 'Jonah Bellamy', first: 'Jonah', role: 'student', title: 'Artist', hue: 265 },
  tomas: { id: 'tomas', name: 'Tomás Herrera', first: 'Tomás', role: 'student', title: 'Gameplay programmer', hue: 205 },
  wen: { id: 'wen', name: 'Wen Li', first: 'Wen', role: 'student', title: 'Puzzle designer', hue: 145 },
  aisha: { id: 'aisha', name: 'Aisha Khalil', first: 'Aisha', role: 'student', title: 'Audio & tools', hue: 340 },
  dana: { id: 'dana', name: 'Dana Whitcombe', first: 'Dana', role: 'mentor', title: 'Level designer, Foxglove Interactive', hue: 178 },
  halvorsen: { id: 'halvorsen', name: 'Prof. Ingrid Halvorsen', first: 'Prof. Halvorsen', role: 'instructor', title: 'Instructor', hue: 305 },
  mateo: { id: 'mateo', name: 'Mateo Ruiz', first: 'Mateo', role: 'ta', title: 'Teaching assistant', hue: 232 },
}

export const ROLE_LABEL: Record<string, string> = {
  instructor: 'Instructor',
  ta: 'TA',
  mentor: 'Mentor',
}

export const THREADS: Thread[] = [
  {
    id: 'team',
    kind: 'team',
    title: 'Team Tether',
    subtitle: 'Priya, Jonah, Tomás, Wen, Aisha',
    members: ['priya', 'jonah', 'tomas', 'wen', 'aisha'],
    total: 312,
  },
  {
    id: 'dana',
    kind: 'mentor',
    title: 'Dana Whitcombe',
    subtitle: 'Industry mentor · Level designer, Foxglove Interactive',
    members: ['priya', 'dana'],
  },
  {
    id: 'staff',
    kind: 'staff',
    title: 'Course staff',
    subtitle: 'Prof. Ingrid Halvorsen (instructor) and Mateo Ruiz (TA)',
    members: ['priya', 'halvorsen', 'mateo'],
  },
  {
    id: 'jonah',
    kind: 'dm',
    title: 'Jonah Bellamy',
    subtitle: 'Private message · Artist on Team Tether',
    members: ['priya', 'jonah'],
  },
]

export const FILES: Record<string, FileMeta> = {
  notes: {
    id: 'notes',
    name: 'Tether build v0.7 notes',
    kind: 'PDF',
    size: '212 KB',
    from: 'priya',
    at: '2026-11-09T09:12:00-08:00',
    blurb: 'Changelog, known issues and what is still placeholder.',
  },
  playtest: {
    id: 'playtest',
    name: 'Playtest summary, Nov 8',
    kind: 'PDF',
    size: '1.4 MB',
    from: 'priya',
    at: '2026-11-09T09:12:00-08:00',
    blurb: '11 testers, 18 min average, 7 stuck on puzzle 2-3.',
  },
  rubric: {
    id: 'rubric',
    name: 'Beta milestone rubric',
    kind: 'PDF',
    size: '96 KB',
    from: 'halvorsen',
    at: '2026-11-14T09:05:00-08:00',
    blurb: 'How the Dec 1 beta is graded, 100 points.',
  },
}

export const THREAD_FILES: Record<string, string[]> = {
  team: ['notes', 'playtest'],
  dana: ['notes', 'playtest'],
  staff: ['rubric', 'playtest'],
  jonah: [],
}

/** Availability for the week of Nov 16. Dana: 30-minute call slots. Office hours: Mon/Wed 2-3pm. */
export const WEEK = [
  { label: 'Mon', date: 16 },
  { label: 'Tue', date: 17 },
  { label: 'Wed', date: 18 },
  { label: 'Thu', date: 19 },
]

const h = (hh: number, mm = 0) => hh * 60 + mm
function danaSlots(day: number, from: number, to: number): Slot[] {
  const out: Slot[] = []
  for (let t = from; t + 30 <= to; t += 30) out.push({ id: `dana-${day}-${t}`, day, start: t, end: t + 30, kind: 'mentor' })
  return out
}
export const SLOTS: Slot[] = [
  { id: 'oh-0', day: 0, start: h(14), end: h(15), kind: 'office' },
  { id: 'oh-2', day: 2, start: h(14), end: h(15), kind: 'office' },
  ...danaSlots(1, h(16), h(18)),
  ...danaSlots(2, h(12), h(13)),
  ...danaSlots(3, h(17), h(19)),
]
export const SLOT_BY_ID: Record<string, Slot> = Object.fromEntries(SLOTS.map((s) => [s.id, s]))

export const MESSAGES: Record<string, Msg[]> = {
  team: [
    { id: 't1', from: 'priya', at: '2026-11-09T09:15:00-08:00', files: ['notes'], text: "v0.7 is on the shared drive. World 2 is in: all four rooms, rough but playable. Build notes attached. Please don't push to main until Thursday's merge window so we don't break the playtest build." },
    { id: 't2', from: 'tomas', at: '2026-11-09T09:41:00-08:00', text: 'Pulled it. The damping change finally makes the tether feel like a rope instead of a rubber band.' },
    { id: 't3', from: 'wen', at: '2026-11-09T09:44:00-08:00', text: "ok that is a real improvement. 2-2 is still too easy to brute force though, I'll look at it tonight" },
    { id: 't4', from: 'aisha', at: '2026-11-10T12:20:00-08:00', text: "The hint chime for stuck states is in the build now. It's pretty quiet, I'll bump it after I check the mix." },
    { id: 't5', from: 'wen', at: '2026-11-10T15:05:00-08:00', text: "Re-reading the playtest summary: 7 of 11 stuck on 2-3. I really think it's the plate timing, not the layout." },
    { id: 't6', from: 'priya', at: '2026-11-10T15:12:00-08:00', text: "Agreed, it's the biggest red flag. I'd like to hear from Dana before we change anything big. She said she'd play it this week." },
    { id: 't7', from: 'jonah', at: '2026-11-11T13:48:00-08:00', text: "World 2 tileset is about 70% done. Pushing what I have tonight, the cave variant is the last piece." },
    { id: 't8', from: 'priya', at: '2026-11-11T14:02:00-08:00', text: 'Amazing, thank you Jonah. That unblocks the room dressing for Wen.' },
    { id: 't9', from: 'jonah', at: '2026-11-11T23:26:00-08:00', text: 'Pushed to /art/world2. Still missing the cave variant and the tether glow shader.' },
    { id: 't10', from: 'tomas', at: '2026-11-12T16:20:00-08:00', text: "@Jonah the cave tiles still aren't in /art/world2. Can you push today? Wen is waiting on them for 2-4." },
    { id: 't11', from: 'wen', at: '2026-11-12T16:31:00-08:00', text: "I can greybox 2-4 until they land, no stress." },
    { id: 't12', from: 'aisha', at: '2026-11-13T10:58:00-08:00', text: 'Standup notes: no art drop yet; code and audio are on track. Next merge window is Thursday.' },
    { id: 't13', from: 'priya', at: '2026-11-13T11:05:00-08:00', text: "Thanks Aisha. I'll check in on art, and I'll update everyone as soon as I've heard back from Dana." },
    { id: 't14', from: 'tomas', at: '2026-11-14T14:30:00-08:00', text: "Random thought: what if the tether shortened under tension? Half of that is already in the physics for the debug overlay." },
    { id: 't15', from: 'wen', at: '2026-11-14T14:44:00-08:00', text: "Hmm. Maybe. Let's wait for the mentor notes before we build anything." },
    { id: 't16', from: 'wen', at: '2026-11-15T16:05:00-08:00', unread: true, text: "Been thinking about 2-3 again. I'd rather rework it before beta than ship another round of people getting stuck. Has Dana replied?" },
    { id: 't17', from: 'tomas', at: '2026-11-15T16:31:00-08:00', unread: true, text: "+1. Also is beta scope locked? I don't want to start anything new on world 2 if it's about to change." },
    { id: 't18', from: 'aisha', at: '2026-11-15T18:48:00-08:00', unread: true, text: "Jonah hasn't answered anyone since Wednesday night. I can cover the cave tiles if needed, but I don't want to step on toes." },
  ],

  dana: [
    { id: 'd1', from: 'dana', at: '2026-09-08T11:02:00-07:00', text: "Hi Priya and team! I'm Dana. I design levels at Foxglove Interactive, mostly puzzle and exploration spaces. Prof. Halvorsen matched us for the semester. I can usually reply within a couple of days. Tell me about Tether?" },
    { id: 'd2', from: 'priya', at: '2026-09-09T08:30:00-07:00', text: "Thank you Dana, we're really excited. Tether is a two-player co-op puzzle game: two characters joined by a physical tether, each seeing a different part of the room. There are five of us and I'll be your main contact so you only get one thread to read." },
    { id: 'd3', from: 'priya', at: '2026-09-23T17:20:00-07:00', text: "Our first playable (v0.3) is on the shared drive. We'd love a gut reaction to how the tether feels before we build rooms around it." },
    { id: 'd4', from: 'dana', at: '2026-09-25T13:40:00-07:00', text: "Played it for twenty minutes. The tether feel is the strongest thing you have, and it's hard to get right, so protect it. The rooms are too forgiving for now but that's easy to fix later." },
    { id: 'd5', from: 'priya', at: '2026-10-14T16:05:00-07:00', text: "v0.5 is up. World 1 is complete: five rooms, with a teaching room (1-3) we rebuilt after your note." },
    { id: 'd6', from: 'dana', at: '2026-10-16T12:15:00-07:00', text: "World 1 is a delight. 1-3 is the best teaching room I've seen in a student build. One question to chew on while you build world 2: what will it ask of the player that world 1 doesn't?" },
    { id: 'd7', from: 'priya', at: '2026-11-09T09:12:00-08:00', files: ['notes', 'playtest'], text: "Hi Dana! v0.7 is on the shared drive. World 2 is in, though the cave art is still partly placeholder. I've attached the build notes and our playtest summary from Nov 8 (11 testers). We'd love your honest read, especially on world 2." },
    { id: 'd8', from: 'dana', at: '2026-11-11T10:20:00-08:00', text: "Got it, thanks! I'll play it this week and send proper notes by the weekend." },
    { id: 'd9', from: 'dana', at: '2026-11-13T16:12:00-08:00', unread: true, longRead: true, text: DANA_CRITIQUE },
  ],

  staff: [
    { id: 's1', from: 'halvorsen', at: '2026-10-27T09:30:00-07:00', text: "Alpha reviews are posted in Canvas. Tether's core loop is the most polished in the section. For beta I want your decisions to be visibly driven by playtest evidence rather than instinct. Mateo and I are both reachable here." },
    { id: 's2', from: 'priya', at: '2026-10-27T10:15:00-07:00', text: "Thank you, Prof. Halvorsen. Does mentor feedback count toward that evidence, or only playtests?" },
    { id: 's3', from: 'mateo', at: '2026-10-27T13:05:00-07:00', text: "Both count. The rubric has a Feedback integration line: cite the note, say what you changed, and say why." },
    { id: 's4', from: 'priya', at: '2026-11-06T17:40:00-08:00', text: "Here's our beta scope as of today:\n\n- Worlds 1 and 2 playable start to finish (9 puzzles)\n- Tutorial pass on rooms 1-1 to 1-3\n- Audio pass: SFX plus two music loops\n- 10+ playtests with a written summary\n- Stretch: bonus room for world 3\n\nLet us know if this lines up with the rubric." },
    { id: 's5', from: 'mateo', at: '2026-11-07T10:12:00-08:00', text: "Scope looks achievable. Two flags: the world 3 bonus room reads as a stretch, so label it that way, and the rubric wants a before/after log for playtest-driven changes. Start that now." },
    { id: 's6', from: 'priya', at: '2026-11-09T09:50:00-08:00', files: ['playtest'], text: "Playtest done: 11 testers, summary attached. The stuck point at 2-3 is clear. We're waiting on mentor feedback before deciding how big a change it needs." },
    { id: 's7', from: 'halvorsen', at: '2026-11-09T18:00:00-08:00', text: "Thanks, this is the kind of evidence I'm looking for. Keep the log going." },
    { id: 's8', from: 'halvorsen', at: '2026-11-14T09:05:00-08:00', unread: true, files: ['rubric'], text: "Reminder to all teams: the beta milestone is due Tuesday, Dec 1 at 11:59 pm (Canvas plus a build link).\n\nBefore then, please confirm your milestone plan in this thread so we're on the same page: what's in, what's cut, and who owns what. A short list is fine. I hold office hours Monday and Wednesday, 2 to 3 pm, if you'd like to talk it through. The rubric is attached again below." },
    { id: 's9', from: 'mateo', at: '2026-11-15T13:52:00-08:00', unread: true, text: "To add to Prof. Halvorsen's note: if your plan has changed since Nov 6, just say what changed and why. Changes driven by playtests earn credit. Happy to read a draft before Wednesday if that helps." },
  ],

  jonah: [
    { id: 'j1', from: 'priya', at: '2026-10-29T15:10:00-07:00', text: "hey! can you give me a rough ETA on the world 2 tileset when you get a chance? no rush, I'm just planning the beta schedule" },
    { id: 'j2', from: 'jonah', at: '2026-10-29T18:25:00-07:00', text: "Probably two weeks? Midterms are eating me this week but I'll sort it out after." },
    { id: 'j3', from: 'jonah', at: '2026-11-04T21:40:00-08:00', text: "Tileset's coming along! I posted a few WIP screenshots in the team chat." },
    { id: 'j4', from: 'priya', at: '2026-11-11T16:50:00-08:00', text: "Love the new tiles. Any chance the cave variant lands by Thursday? Wen's room dressing depends on it." },
    { id: 'j5', from: 'jonah', at: '2026-11-11T17:10:00-08:00', text: "I'll try! Thursday night is dicey because my Ling 140 paper is due Friday, but I'll do what I can." },
  ],
}

export const JONAH_STARTERS = [
  "Hey Jonah, just checking in. How are things on your end?",
  "No pressure on the cave tiles. What would be most useful from me?",
  "Anything I can take off your plate this week?",
]

export const PLAN_ITEMS = [
  { text: 'Worlds 1 and 2 playable start to finish (9 puzzles)', flag: 'World 2 rooms 2-2 to 2-4 may change (Dana, points 1 and 2)' },
  { text: 'Tutorial pass on rooms 1-1 to 1-3' },
  { text: 'Audio pass: SFX plus two music loops' },
  { text: '10+ playtests with a written summary', flag: 'Dana suggests a re-test with 8+ people' },
  { text: 'Stretch: bonus room for world 3', flag: 'Dana suggests dropping it (point 3)' },
]

export const ART_TASKS = [
  { name: 'World 2 tileset, main set', state: 'done', note: 'Pushed Wed Nov 11' },
  { name: 'World 2 tileset, cave variant', state: 'open', note: 'Hoped for Thu Nov 12 · not in /art/world2 yet' },
  { name: 'Tether glow shader', state: 'open', note: 'Needed for beta · listed as missing on Nov 11' },
  { name: 'Character walk and idle cycles', state: 'done', note: 'Delivered for alpha' },
]

export const POINTS = [
  { n: 1, title: "World 2 doesn't teach anything new", gist: 'Pick one twist and carry it through two rooms.', anchor: 'point-1' },
  { n: 2, title: '2-3 needs communication tools', gist: 'An audible plate timer and a reason when a room resets.', anchor: 'point-2' },
  { n: 3, title: 'For beta, cut before you add', gist: 'Fix 2-3, one twist, drop the bonus room, re-test.', anchor: 'point-3' },
]
