import type { Doc, El, Edge, Indicator, Lane, Stage, Note, Comment } from './types'
import { ago, DAY, HOUR, MIN } from './time'

let n = 0
const ind = (name: string, target: string, source: string): Indicator => ({ id: `ind-seed-${++n}`, name, target, source })

const el = (
  id: string,
  stage: Stage,
  lane: Lane,
  order: number,
  text: string,
  extra: Partial<El> = {},
): El => ({ id, stage, lane, order, text, indicators: [], evidenceIds: [], ...extra })

const elements: El[] = [
  // Inputs (5)
  el('i1', 'input', 'shared', 0, '42 trained volunteer tutors'),
  el('i2', 'input', 'tutoring', 0, 'APS partnership MOU'),
  el('i3', 'input', 'tutoring', 1, 'Reading specialist, 1.0 FTE'),
  el('i4', 'input', 'bridges', 0, 'Book Bridges summer budget, $62,000 requested'),
  el('i5', 'input', 'shared', 1, 'Bilingual family liaison, 0.5 FTE'),

  // Activities (8)
  el('a1', 'activity', 'tutoring', 0, 'Twice-weekly 1:1 tutoring, grades 2–4'),
  el('a2', 'activity', 'tutoring', 1, 'Volunteer tutor recruitment and training'),
  el('a3', 'activity', 'tutoring', 2, 'Fall, winter and spring ISIP screening with teacher review'),
  el('a4', 'activity', 'shared', 0, 'Monthly family reading nights', { splitFrom: 'Family engagement' }),
  el('a5', 'activity', 'shared', 1, 'Bilingual family coaching texts', { splitFrom: 'Family engagement' }),
  el('a6', 'activity', 'shared', 2, 'Spring-to-summer student handoff'),
  el('a7', 'activity', 'bridges', 0, 'Summer book-bag home visits'),
  el('a8', 'activity', 'bridges', 1, 'Summer reading mornings, 4 weeks at 3 sites'),

  // Outputs (7)
  el('o1', 'output', 'tutoring', 0, '180 students tutored per year'),
  el('o2', 'output', 'tutoring', 1, '3 ISIP progress reports shared with each school per year'),
  el('o3', 'output', 'shared', 0, '240 family members attend reading nights'),
  el('o4', 'output', 'shared', 1, '3,600 bilingual coaching texts sent'),
  el('o5', 'output', 'shared', 2, '90 student reading plans handed off to summer staff'),
  el('o6', 'output', 'bridges', 0, '2,400 books distributed'),
  el('o7', 'output', 'bridges', 1, '120 students attend 12+ summer reading mornings'),

  // Short / mid-term outcomes (7)
  el('n1', 'outcome', 'tutoring', 0, 'Tutored students gain 15 percentile points on ISIP fluency by spring', {
    term: 'short',
    indicators: [ind('iStation ISIP oral reading fluency, fall vs. spring', '+15 percentile points', 'ISIP, fall and spring windows')],
    evidenceIds: ['ev-ritter', 'ev-internal'],
  }),
  el('n2', 'outcome', 'tutoring', 1, '75% of tutored students meet their ISIP growth goal by spring', {
    term: 'mid',
    indicators: [ind('Share of tutored students meeting individual ISIP growth goal', '75%', 'ISIP, spring window')],
    evidenceIds: ['ev-ritter', 'ev-internal'],
  }),
  el('n3', 'outcome', 'tutoring', 2, 'Teachers at all 6 partner schools review progress data each term', {
    term: 'short',
    indicators: [ind('Term-end data review logged by school literacy lead', '6 of 6 schools, all 3 terms', 'Review log kept by reading specialist')],
  }),
  el('n4', 'outcome', 'shared', 0, 'Families feel more confident supporting reading at home', {
    term: 'short',
    indicators: [ind('Spring family survey: “I feel confident helping my child read” (agree or strongly agree)', '70% of respondents', 'Family survey, English and Spanish')],
  }),
  el('n5', 'outcome', 'shared', 1, 'Teachers of 85% of summer students get a reading plan by Sept. 15', {
    term: 'mid',
    indicators: [ind('Reading plans confirmed received by 4th-grade teachers', '85% by Sept. 15', 'APS teacher confirmation form')],
  }),
  el('n6', 'outcome', 'bridges', 0, 'Students keep up their reading over the summer', {
    term: 'short',
    indicators: [ind('ISIP percentile change, spring to fall', 'No more than 2 points lost', 'ISIP, spring and fall windows')],
    evidenceIds: ['ev-kimquinn'],
  }),
  el('n7', 'outcome', 'bridges', 1, '100 Book Bridges students read 10+ books at home over the summer', {
    term: 'mid',
    indicators: [ind('Books logged on the Book Bridges reading log', '10+ books per student', 'Paper and text-message reading logs')],
    evidenceIds: ['ev-kimquinn'],
  }),

  // Long-term outcomes (4)
  el('l1', 'longterm', 'tutoring', 0, 'Increase share of participants reading at grade level by end of 3rd grade', {
    indicators: [ind('Participants at benchmark on spring 3rd-grade ISIP', '70% (2025 baseline: 58%)', 'ISIP, cohort file')],
    evidenceIds: ['ev-internal'],
  }),
  el('l2', 'longterm', 'bridges', 0, 'Close the summer reading gap for participating students', {
    evidenceIds: ['ev-kimquinn'],
  }),
  el('l3', 'longterm', 'shared', 0, 'Families sustain reading together at home 12 months after leaving the program', {
    indicators: [ind('Follow-up survey: days per week reading together', '4+ days for 60% of families', 'Follow-up survey, 12 months after exit')],
  }),
  el('l4', 'longterm', 'tutoring', 1, 'Participants stay on a grade-level reading path through 5th grade', {
    indicators: [ind('Former participants at benchmark on spring 5th-grade ISIP', '65%', 'APS data match, annual')],
  }),
]

const note = (id: string, kind: Note['kind'], text: string): Note => ({ id, kind, text })

const edge = (from: string, to: string, extra: Partial<Edge> = {}): Edge => ({
  id: `${from}>${to}`,
  from,
  to,
  notes: [],
  ...extra,
})

const edges: Edge[] = [
  // inputs → activities (11)
  edge('i1', 'a1'),
  edge('i1', 'a7'),
  edge('i2', 'a1', { notes: [note('nt-e2', 'external', 'APS keeps after-school room access at all six sites')] }),
  edge('i2', 'a6'),
  edge('i3', 'a2'),
  edge('i3', 'a3'),
  edge('i3', 'a6'),
  edge('i4', 'a7'),
  edge('i4', 'a8'),
  edge('i5', 'a4'),
  edge('i5', 'a5'),
  // activities → outputs (10)
  edge('a1', 'o1'),
  edge('a2', 'o1'),
  edge('a3', 'o2'),
  edge('a4', 'o3'),
  edge('a4', 'o4', { inherited: true }),
  edge('a5', 'o3', { inherited: true }),
  edge('a5', 'o4'),
  edge('a6', 'o5', { notes: [note('nt-a1', 'assumption', 'Tutors complete a reading plan for every student before school ends in May')] }),
  edge('a7', 'o6', { notes: [note('nt-e1', 'external', 'Families have stable addresses over summer')] }),
  edge('a8', 'o7'),
  // outputs → short/mid outcomes (9)
  edge('o1', 'n1', { notes: [note('nt-a2', 'assumption', 'Students attend at least 80% of scheduled sessions')] }),
  edge('o1', 'n2'),
  edge('o2', 'n3'),
  edge('o3', 'n4'),
  edge('o4', 'n4', {
    weak: { by: 'ken', note: 'The 2025 evaluation did not study text coaching and I could not find a study that does. Present it as a pilot.' },
  }),
  edge('o5', 'n5'),
  edge('o6', 'n6'),
  edge('o6', 'n7'),
  edge('o7', 'n6', {
    weak: { by: 'ken', note: 'Attendance at summer mornings has only been observed in the 2025 pilot (31 students).' },
  }),
  // short/mid → long-term outcomes (8)
  edge('n1', 'l1'),
  edge('n2', 'l1', { notes: [note('nt-a4', 'assumption', 'Gains made in grades 2–4 hold after tutoring ends')] }),
  edge('n2', 'l4'),
  edge('n3', 'l4'),
  edge('n4', 'l3', { notes: [note('nt-a3', 'assumption', 'Parents’ work schedules leave room for a regular reading time')] }),
  edge('n5', 'l4', { weak: { by: 'ken', note: 'Long jump from a teacher receiving a plan to 5th-grade reading. No data on this link yet.' } }),
  edge('n6', 'l2'),
  edge('n7', 'l2'),
]

const c = (
  id: string,
  author: Comment['author'],
  ts: number,
  text: string,
  anchor: Comment['anchor'],
  extra: Partial<Comment> = {},
): Comment => ({ id, author, ts, text, anchor, resolved: false, replies: [], ...extra })

const comments: Comment[] = [
  c(
    'c1',
    'ken',
    ago(2 * HOUR + 5 * MIN),
    'This long-term outcome has no indicator, and it is the only one of the four without one. A reviewer will ask how you will know the gap closed. Could we use fall-to-fall ISIP change for Book Bridges students against matched non-participants?',
    { type: 'element', id: 'l2' },
    {
      replies: [
        {
          id: 'r1',
          author: 'tomas',
          ts: ago(70 * MIN),
          text: 'We have fall 2025 ISIP for every 2nd–4th grader at our six sites, so a comparison group is possible. I am not sure APS will release it before Friday.',
        },
      ],
    },
  ),
  c(
    'c2',
    'ken',
    ago(2 * HOUR + 2 * MIN),
    '“More confident” cannot be scored as written. The spring family survey item already gives us a number. Can the outcome carry the threshold?',
    { type: 'element', id: 'n4' },
  ),
  c(
    'c3',
    'ken',
    ago(2 * HOUR),
    'I flagged this link as weak. The 2025 evaluation did not look at text coaching. Either soften the claim or describe it as a pilot.',
    { type: 'edge', id: 'o4>n4' },
  ),
  c(
    'c4',
    'tomas',
    ago(95 * MIN),
    'Now that Family engagement is two activities: the texts go to Book Bridges families too, not only after-school. Does this belong in the shared row?',
    { type: 'element', id: 'a5' },
  ),
  c(
    'c5',
    'tomas',
    ago(DAY + 5 * HOUR),
    'McCune’s call for proposals says “summer learning loss.” Can we use their wording so the reviewer sees the match?',
    { type: 'element', id: 'n6' },
  ),
  c(
    'c6',
    'marisol',
    ago(2 * HOUR + 20 * MIN),
    'The reviewer’s question is how Book Bridges connects to tutoring. This handoff is the answer. Make sure it reads as the bridge.',
    { type: 'element', id: 'a6' },
  ),
  c(
    'c7',
    'tomas',
    ago(6 * DAY),
    'Is $62,000 the whole summer budget?',
    { type: 'element', id: 'i4' },
    {
      resolved: true,
      resolvedBy: 'marisol',
      replies: [{ id: 'r2', author: 'marisol', ts: ago(6 * DAY - 2 * HOUR), text: 'Yes. It includes about $15,600 for the 2,400 books.' }],
    },
  ),
  c(
    'c8',
    'ken',
    ago(19 * DAY),
    'Please confirm 42 is currently active tutors, not everyone ever trained.',
    { type: 'element', id: 'i1' },
    {
      resolved: true,
      resolvedBy: 'marisol',
      replies: [{ id: 'r3', author: 'marisol', ts: ago(19 * DAY - 3 * HOUR), text: 'Confirmed with Tomás: 42 active as of Nov. 1.' }],
    },
  ),
]

export const makeInitialDoc = (): Doc => ({
  title: 'Page Forward ToC – v4 (McCune draft)',
  elements,
  edges,
  comments,
  evidence: [
    {
      id: 'ev-kimquinn',
      kind: 'research',
      title: 'Kim & Quinn (2013), summer reading meta-analysis',
      cite:
        'Kim, J. S., & Quinn, D. M. (2013). The effects of summer reading on low-income children’s literacy achievement from kindergarten to grade 8: A meta-analysis of classroom and home interventions. Review of Educational Research, 83(3), 386–431.',
      takeaway: 'Summer reading programs, including home-based ones, improved reading outcomes for low-income students.',
    },
    {
      id: 'ev-ritter',
      kind: 'research',
      title: 'Ritter et al. (2009), volunteer tutoring meta-analysis',
      cite:
        'Ritter, G. W., Barnett, J. H., Denny, G. S., & Albin, G. R. (2009). The effectiveness of volunteer tutoring programs for elementary and middle school students: A meta-analysis. Review of Educational Research, 79(1), 3–38.',
      takeaway: 'Volunteer tutoring produced positive effects on reading, with the clearest gains in structured programs.',
    },
    {
      id: 'ev-internal',
      kind: 'internal',
      title: 'Page Forward 2025 tutoring evaluation',
      cite: 'Page Forward Tutoring Program Evaluation, 2024–25 school year. Prepared by K. Ishida, September 2025. Internal report.',
      takeaway: '71% of tutored students met their ISIP growth goal, compared with 52% of matched peers (n = 164).',
    },
  ],
  versions: [
    { id: 'v4', n: 4, name: 'McCune draft', author: 'marisol', ts: ago(5 * DAY), summary: 'Added Book Bridges: summer home visits, reading mornings, and the spring-to-summer handoff.', elements: 31, edges: 38 },
    { id: 'v3', n: 3, name: 'Evaluator pass', author: 'ken', ts: ago(20 * DAY), summary: 'Added indicators and evidence to every outcome. Flagged links with thin evidence.', elements: 24, edges: 29 },
    { id: 'v2', n: 2, name: 'Family engagement added', author: 'tomas', ts: ago(56 * DAY), summary: 'Added Family engagement, its outputs, and the family confidence outcome.', elements: 21, edges: 23 },
    { id: 'v1', n: 1, name: 'First draft', author: 'marisol', ts: ago(98 * DAY), summary: 'Tutoring program only: inputs through 3rd-grade reading.', elements: 14, edges: 15 },
  ],
  log: [
    { id: 'lg3', author: 'ken', ts: ago(2 * HOUR), text: 'Flagged 3 links as weak evidence and left 3 comments' },
    { id: 'lg2', author: 'marisol', ts: ago(2 * HOUR + 25 * MIN), text: 'Split “Family engagement” into two activities' },
    { id: 'lg1', author: 'tomas', ts: ago(DAY + 4 * HOUR), text: 'Added “Bilingual family liaison, 0.5 FTE” as an input' },
  ],
})
