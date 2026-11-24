export type Status = 'complete' | 'complete-gaps' | 'review' | 'in-progress' | 'not-started';

export interface Resource {
  id: string;
  kind: 'textbook' | 'ocw' | 'video';
  title: string;
  byline: string;
  meta: string; // ISBN / course number / channel
  role: 'Primary' | 'Supplementary';
  progress: string;
  lectures?: { watched: number; total: number; minutesEach: number; hoursLogged: number };
}

export interface Chapter {
  n: number;
  title: string;
  done: boolean;
}

export interface ProblemSet {
  id: string;
  chapter: number;
  title: string;
  sections: string;
  attempted: number;
  correct: number;
  date: string; // ISO date worked
  loggedAt: string; // display string
  via: 'Desktop' | 'Phone';
  keptIntentionally?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  source: string;
  date: string;
  timeLimitMin: number;
  score: number; // percent
  pointsEarned?: number;
  pointsPossible?: number;
  conditions: string;
}

export interface HourEntry {
  id: string;
  date: string;
  hours: number;
  activity: 'Reading' | 'Problem sets' | 'Lectures' | 'Exams' | 'Review';
  note: string;
}

export interface Session {
  date: string;
  hours: number;
  label: string;
  examLike?: boolean;
}

export interface CatalogTopic {
  topic: string;
  chapters: number[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  prereqs: string[];
  status: Status;
  startedOn?: string;
  completedOn?: string;
  catalogNote?: string;
  catalogTopics: CatalogTopic[];
  resources: Resource[];
  chapters: Chapter[];
  problemSets: ProblemSet[];
  exams: Exam[];
  baseHours: { reading: number; sets: number; lectures: number; exams: number };
  weekly?: { week: string; hours: number }[];
  extraHours: HourEntry[];
  notableSessions?: Session[];
  decision?: { kind: 'complete' | 'complete-gaps'; on: string; gaps: string[]; note: string };
  legacyNote?: string;
}

export const PROGRAM = {
  name: 'Mathematics, B.S.',
  school: 'Cascade State University',
  catalog: '2024–25 Undergraduate Catalog',
  totalCredits: 120,
  started: 'Sep 2024',
};

export const RULES = {
  examMin: 70,
  examRuleSet: 'Jun 14, 2025',
  hoursPerCreditMin: 30,
  hoursPerCreditMax: 45,
};

export const TODAY = '2026-11-17';

const ps = (
  id: string,
  chapter: number,
  title: string,
  sections: string,
  attempted: number,
  correct: number,
  date: string,
  loggedAt: string,
  via: 'Desktop' | 'Phone' = 'Desktop',
): ProblemSet => ({ id, chapter, title, sections, attempted, correct, date, loggedAt, via });

const LA: Course = {
  id: 'MATH 220',
  code: 'MATH 220',
  title: 'Linear Algebra',
  credits: 4,
  prereqs: ['MATH 151'],
  status: 'review',
  startedOn: '2026-08-03',
  catalogNote:
    'Vector spaces, linear maps, eigenvalues and eigenvectors, inner product spaces, the spectral theorem, and determinants. Emphasis on proof.',
  catalogTopics: [
    { topic: 'Vector spaces, subspaces, bases, dimension', chapters: [1, 2] },
    { topic: 'Linear maps, null space, range, matrices', chapters: [3] },
    { topic: 'Eigenvalues, eigenvectors, invariant subspaces', chapters: [5] },
    { topic: 'Inner product spaces, orthonormal bases', chapters: [6] },
    { topic: 'Spectral theorem, self-adjoint and normal operators', chapters: [7] },
    { topic: 'Generalized eigenvectors, Jordan form', chapters: [8] },
    { topic: 'Trace and determinant', chapters: [10] },
  ],
  resources: [
    {
      id: 'r1',
      kind: 'textbook',
      title: 'Linear Algebra Done Right',
      byline: 'Sheldon Axler · Springer, 2015',
      meta: '3rd edition · ISBN 978-3-319-11079-0',
      role: 'Primary',
      progress: 'Chapters 1–8, 10',
    },
    {
      id: 'r2',
      kind: 'ocw',
      title: '18.06 Linear Algebra (Spring 2010)',
      byline: 'Gilbert Strang · MIT OpenCourseWare',
      meta: 'Course 18.06 · video lectures',
      role: 'Supplementary',
      progress: '14 of 34 lectures',
      lectures: { watched: 14, total: 34, minutesEach: 50, hoursLogged: 0 },
    },
    {
      id: 'r3',
      kind: 'video',
      title: 'Essence of Linear Algebra',
      byline: '3Blue1Brown · YouTube series',
      meta: '16 videos',
      role: 'Supplementary',
      progress: '16 of 16 videos',
      lectures: { watched: 16, total: 16, minutesEach: 12, hoursLogged: 0 },
    },
  ],
  chapters: [
    { n: 1, title: 'Vector Spaces', done: true },
    { n: 2, title: 'Finite-Dimensional Vector Spaces', done: true },
    { n: 3, title: 'Linear Maps', done: true },
    { n: 4, title: 'Polynomials', done: true },
    { n: 5, title: 'Eigenvalues, Eigenvectors, and Invariant Subspaces', done: true },
    { n: 6, title: 'Inner Product Spaces', done: true },
    { n: 7, title: 'Operators on Inner Product Spaces', done: true },
    { n: 8, title: 'Operators on Complex Vector Spaces', done: true },
    { n: 9, title: 'Operators on Real Vector Spaces', done: false },
    { n: 10, title: 'Trace and Determinant', done: true },
  ],
  problemSets: [
    ps('la1', 1, 'Vector Spaces', '1.A–1.C', 24, 22, '2026-08-15', 'Aug 15, 11:58 PM'),
    ps('la2', 2, 'Finite-Dimensional Vector Spaces', '2.A–2.C', 28, 24, '2026-08-29', 'Aug 29, 12:41 AM'),
    ps('la3', 3, 'Linear Maps, part 1', '3.A–3.C', 36, 29, '2026-09-12', 'Sep 12, 11:20 PM'),
    ps('la4', 3, 'Linear Maps, part 2', '3.D–3.F', 34, 26, '2026-09-24', 'Sep 24, 11:47 PM'),
    ps('la5', 4, 'Polynomials', '4 (all)', 32, 27, '2026-09-30', 'Sep 30, 12:15 AM'),
    ps('la6', 5, 'Eigenvalues, Eigenvectors', '5.A–5.C', 30, 24, '2026-10-10', 'Oct 10, 11:33 PM'),
    ps('la7', 6, 'Inner Product Spaces', '6.A–6.C', 38, 31, '2026-10-21', 'Oct 21, 10:47 PM'),
    ps('la8', 6, 'Inner Product Spaces', '6.A–6.C', 38, 31, '2026-10-21', 'Oct 21, 10:52 PM', 'Phone'),
    ps('la9', 7, 'Operators on Inner Product Spaces', '7.A–7.D', 33, 25, '2026-11-01', 'Nov 1, 1:05 AM'),
    ps('la10', 8, 'Operators on Complex Vector Spaces', '8.A–8.D', 29, 22, '2026-11-07', 'Nov 7, 11:52 PM'),
    ps('la11', 10, 'Trace and Determinant', '10.A–10.B', 22, 18, '2026-11-12', 'Nov 12, 12:30 AM'),
  ],
  exams: [
    {
      id: 'lae1',
      title: 'Midterm',
      source: 'Cascade State MATH 220 exam archive — Spring 2022 midterm',
      date: '2026-10-24',
      timeLimitMin: 80,
      score: 78,
      pointsEarned: 78,
      pointsPossible: 100,
      conditions: 'Timed, closed book, self-graded against posted solutions',
    },
    {
      id: 'lae2',
      title: 'Final',
      source: 'Cascade State MATH 220 exam archive — Fall 2023 final',
      date: '2026-11-14',
      timeLimitMin: 170,
      score: 84,
      pointsEarned: 126,
      pointsPossible: 150,
      conditions: 'Timed, closed book, self-graded against posted solutions',
    },
  ],
  baseHours: { reading: 39, sets: 52.5, lectures: 0, exams: 4.5 },
  weekly: [
    { week: '2026-08-03', hours: 5 },
    { week: '2026-08-10', hours: 7.5 },
    { week: '2026-08-17', hours: 6 },
    { week: '2026-08-24', hours: 8 },
    { week: '2026-08-31', hours: 4.5 },
    { week: '2026-09-07', hours: 7 },
    { week: '2026-09-14', hours: 6.5 },
    { week: '2026-09-21', hours: 3 },
    { week: '2026-09-28', hours: 7.5 },
    { week: '2026-10-05', hours: 8 },
    { week: '2026-10-12', hours: 5.5 },
    { week: '2026-10-19', hours: 6 },
    { week: '2026-10-26', hours: 7 },
    { week: '2026-11-02', hours: 5.5 },
    { week: '2026-11-09', hours: 9 },
  ],
  extraHours: [],
};

const CALC2: Course = {
  id: 'MATH 151',
  code: 'MATH 151',
  title: 'Calculus II',
  credits: 4,
  prereqs: ['MATH 150'],
  status: 'complete',
  startedOn: '2024-12-02',
  completedOn: '2025-03-09',
  legacyNote: 'Marked complete Mar 9, 2025 — before your exam rule existed (set Jun 14, 2025).',
  catalogNote:
    'Techniques and applications of integration, improper integrals, sequences and series, power and Taylor series, parametric and polar curves.',
  catalogTopics: [
    { topic: 'Techniques of integration', chapters: [7] },
    { topic: 'Applications of integration', chapters: [8] },
    { topic: 'Parametric and polar curves', chapters: [10] },
    { topic: 'Sequences, series, Taylor series', chapters: [11] },
  ],
  resources: [
    {
      id: 'c2r1',
      kind: 'textbook',
      title: 'Calculus: Early Transcendentals',
      byline: 'James Stewart · Cengage, 2015',
      meta: '8th edition · ISBN 978-1-285-74155-0',
      role: 'Primary',
      progress: 'Chapters 7, 8, 10, 11',
    },
    {
      id: 'c2r2',
      kind: 'ocw',
      title: '18.01SC Single Variable Calculus (Fall 2010)',
      byline: 'David Jerison · MIT OpenCourseWare',
      meta: 'Course 18.01SC · Units 4–5',
      role: 'Supplementary',
      progress: 'Units 4–5 lectures',
      lectures: { watched: 21, total: 21, minutesEach: 45, hoursLogged: 15.5 },
    },
  ],
  chapters: [
    { n: 7, title: 'Techniques of Integration', done: true },
    { n: 8, title: 'Further Applications of Integration', done: true },
    { n: 9, title: 'Differential Equations', done: false },
    { n: 10, title: 'Parametric Equations and Polar Coordinates', done: true },
    { n: 11, title: 'Infinite Sequences and Series', done: true },
  ],
  problemSets: [
    ps('c1', 7, 'Integration by parts, trig integrals', '7.1–7.3', 42, 36, '2024-12-14', 'Dec 14, 2024'),
    ps('c2', 7, 'Partial fractions, strategy', '7.4–7.5', 38, 31, '2024-12-28', 'Dec 28, 2024'),
    ps('c3', 7, 'Approximate and improper integrals', '7.7–7.8', 30, 25, '2025-01-06', 'Jan 6, 2025'),
    ps('c4', 8, 'Arc length, surface area', '8.1–8.2', 26, 22, '2025-01-15', 'Jan 15, 2025'),
    ps('c5', 10, 'Parametric curves', '10.1–10.2', 28, 25, '2025-01-27', 'Jan 27, 2025'),
    ps('c6', 10, 'Polar coordinates and area', '10.3–10.4', 30, 24, '2025-02-03', 'Feb 3, 2025'),
    ps('c7', 11, 'Sequences, series, integral test', '11.1–11.3', 36, 30, '2025-02-12', 'Feb 12, 2025'),
    ps('c8', 11, 'Comparison, alternating, ratio tests', '11.4–11.7', 40, 31, '2025-02-21', 'Feb 21, 2025'),
    ps('c9', 11, 'Power series, Taylor series', '11.8–11.11', 44, 34, '2025-03-02', 'Mar 2, 2025'),
  ],
  exams: [],
  baseHours: { reading: 46, sets: 77.5, lectures: 15.5, exams: 3 },
  notableSessions: [
    {
      date: '2025-03-07',
      hours: 3,
      label: 'Timed final — Stewart ch. 7, 8, 10, 11 (Cascade State Fall 2021 final)',
      examLike: true,
    },
  ],
  extraHours: [],
};

interface Lite {
  code: string;
  title: string;
  credits: number;
  prereqs: string[];
  status: Status;
  completedOn?: string;
  startedOn?: string;
  text?: [string, string, string]; // title, byline, meta
  ocw?: [string, string, string];
  hours?: number;
  sets?: [number, number, number]; // count, attempted, correct
  exams?: [string, string, string, number, number][]; // title, source, date, minutes, score
  note: string;
}

const lite: Lite[] = [
  {
    code: 'MATH 150', title: 'Calculus I', credits: 4, prereqs: [], status: 'complete',
    startedOn: '2024-09-02', completedOn: '2024-11-30',
    text: ['Calculus: Early Transcendentals', 'James Stewart · Cengage, 2015', '8th edition · ISBN 978-1-285-74155-0'],
    ocw: ['18.01SC Single Variable Calculus (Fall 2010)', 'David Jerison · MIT OpenCourseWare', 'Course 18.01SC · Units 1–3'],
    hours: 128, sets: [11, 388, 341],
    exams: [['Final', 'MIT 18.01SC — Unit 3 exam + practice final', '2024-11-29', 120, 88]],
    note: 'Limits, derivatives, applications of differentiation, the definite integral, Fundamental Theorem of Calculus.',
  },
  {
    code: 'MATH 152', title: 'Calculus III', credits: 4, prereqs: ['MATH 151'], status: 'complete',
    startedOn: '2025-03-17', completedOn: '2025-07-02',
    text: ['Calculus: Early Transcendentals', 'James Stewart · Cengage, 2015', '8th edition · ISBN 978-1-285-74155-0'],
    ocw: ['18.02SC Multivariable Calculus (Fall 2010)', 'Denis Auroux · MIT OpenCourseWare', 'Course 18.02SC'],
    hours: 151, sets: [12, 418, 337],
    exams: [
      ['Midterm', 'MIT 18.02SC — Exam 2', '2025-05-24', 90, 74],
      ['Final', 'Cascade State MATH 152 exam archive — Spring 2023 final', '2025-06-28', 170, 81],
    ],
    note: 'Vectors, partial derivatives, multiple integrals, line and surface integrals, Green’s, Stokes’, and divergence theorems.',
  },
  {
    code: 'MATH 200', title: 'Introduction to Mathematical Proof', credits: 3, prereqs: ['MATH 150'], status: 'complete',
    startedOn: '2025-07-07', completedOn: '2025-09-14',
    text: ['Book of Proof', 'Richard Hammack · self-published', '3rd edition · ISBN 978-0-9894721-2-8'],
    hours: 108, sets: [10, 286, 231],
    exams: [['Final', 'Cascade State MATH 200 exam archive — Fall 2022 final', '2025-09-13', 120, 76]],
    note: 'Logic, sets, direct proof, contrapositive, contradiction, induction, relations, functions, cardinality.',
  },
  {
    code: 'MATH 210', title: 'Discrete Mathematics', credits: 3, prereqs: ['MATH 200'], status: 'complete',
    startedOn: '2025-09-15', completedOn: '2025-11-23',
    text: ['Discrete Mathematics: An Open Introduction', 'Oscar Levin · open textbook', '3rd edition · ISBN 978-1-792-90169-0'],
    ocw: ['6.042J Mathematics for Computer Science (Spring 2015)', 'Albert Meyer · MIT OpenCourseWare', 'Course 6.042J'],
    hours: 97, sets: [8, 244, 203],
    exams: [['Final', 'MIT 6.042J — Final exam, Spring 2015', '2025-11-22', 180, 79]],
    note: 'Counting, recurrence relations, graph theory, generating functions, discrete probability.',
  },
  {
    code: 'CS 110', title: 'Introduction to Programming', credits: 3, prereqs: [], status: 'complete',
    startedOn: '2025-01-06', completedOn: '2025-04-20',
    ocw: ['6.0001 Introduction to Computer Science and Programming in Python (Fall 2016)', 'Ana Bell · MIT OpenCourseWare', 'Course 6.0001'],
    text: ['Think Python', 'Allen B. Downey · O’Reilly, 2015', '2nd edition · ISBN 978-1-491-93936-9'],
    hours: 102, sets: [6, 48, 44],
    exams: [['Final', 'MIT 6.0001 — Final exam, Fall 2016', '2025-04-19', 120, 82]],
    note: 'Python programming, control flow, functions, recursion, objects, basic algorithms and complexity.',
  },
  {
    code: 'MATH 240', title: 'Ordinary Differential Equations', credits: 3, prereqs: ['MATH 151'], status: 'complete',
    startedOn: '2025-12-01', completedOn: '2026-02-22',
    text: ['Elementary Differential Equations and Boundary Value Problems', 'Boyce, DiPrima & Meade · Wiley, 2017', '11th edition · ISBN 978-1-119-25600-7'],
    ocw: ['18.03SC Differential Equations (Fall 2011)', 'Arthur Mattuck · MIT OpenCourseWare', 'Course 18.03SC'],
    hours: 118, sets: [9, 301, 238],
    exams: [['Final', 'Cascade State MATH 240 exam archive — Spring 2021 final', '2026-02-21', 150, 73]],
    note: 'First-order equations, linear second-order equations, Laplace transforms, systems, series solutions.',
  },
  {
    code: 'MATH 260', title: 'Elementary Number Theory', credits: 3, prereqs: ['MATH 200'], status: 'complete',
    startedOn: '2026-02-23', completedOn: '2026-04-26',
    text: ['Elementary Number Theory', 'David M. Burton · McGraw-Hill, 2010', '7th edition · ISBN 978-0-07-338314-9'],
    hours: 96, sets: [8, 210, 172],
    exams: [['Final', 'Cascade State MATH 260 exam archive — Fall 2020 final', '2026-04-25', 120, 80]],
    note: 'Divisibility, primes, congruences, Fermat and Euler theorems, quadratic reciprocity.',
  },
  {
    code: 'MATH 310', title: 'Real Analysis I', credits: 4, prereqs: ['MATH 152', 'MATH 200'], status: 'complete',
    startedOn: '2026-04-27', completedOn: '2026-07-26',
    text: ['Understanding Analysis', 'Stephen Abbott · Springer, 2015', '2nd edition · ISBN 978-1-4939-2711-1'],
    ocw: ['18.100A Real Analysis (Fall 2020)', 'Casey Rodriguez · MIT OpenCourseWare', 'Course 18.100A'],
    hours: 164, sets: [10, 196, 142],
    exams: [
      ['Midterm', 'MIT 18.100A — Midterm, Fall 2020', '2026-06-13', 80, 71],
      ['Final', 'Cascade State MATH 310 exam archive — Fall 2022 final', '2026-07-25', 170, 75],
    ],
    note: 'Completeness of the reals, sequences, series, limits, continuity, differentiation, Riemann integration.',
  },
  {
    code: 'MATH 340', title: 'Probability', credits: 3, prereqs: ['MATH 152'], status: 'in-progress',
    startedOn: '2026-10-05',
    text: ['Introduction to Probability', 'Blitzstein & Hwang · CRC Press, 2019', '2nd edition · ISBN 978-1-138-36991-7'],
    ocw: ['Statistics 110: Probability', 'Joe Blitzstein · Harvard, YouTube series', '35 lectures'],
    hours: 31, sets: [3, 84, 66],
    exams: [],
    note: 'Sample spaces, conditional probability, random variables, expectation, joint distributions, limit theorems.',
  },
  {
    code: 'MATH 330', title: 'Abstract Algebra I', credits: 4, prereqs: ['MATH 200', 'MATH 220'], status: 'not-started',
    note: 'Groups, subgroups, homomorphisms, quotient groups, rings, ideals.',
  },
  {
    code: 'MATH 350', title: 'Complex Variables', credits: 3, prereqs: ['MATH 152', 'MATH 310'], status: 'not-started',
    note: 'Analytic functions, contour integration, Cauchy’s theorem, residues, conformal mapping.',
  },
  {
    code: 'MATH 411', title: 'Real Analysis II', credits: 4, prereqs: ['MATH 310', 'MATH 220'], status: 'not-started',
    note: 'Sequences of functions, metric spaces, differentiation in several variables, inverse and implicit function theorems.',
  },
];

function fromLite(l: Lite): Course {
  const resources: Resource[] = [];
  if (l.text)
    resources.push({ id: l.code + 't', kind: 'textbook', title: l.text[0], byline: l.text[1], meta: l.text[2], role: 'Primary', progress: l.status === 'complete' ? 'Assigned chapters complete' : 'In progress' });
  if (l.ocw)
    resources.push({ id: l.code + 'o', kind: l.ocw[1].includes('YouTube') ? 'video' : 'ocw', title: l.ocw[0], byline: l.ocw[1], meta: l.ocw[2], role: l.text ? 'Supplementary' : 'Primary', progress: l.status === 'complete' ? 'Lectures watched' : 'Partway' });
  const sets: ProblemSet[] = [];
  if (l.sets) {
    const [n, att, cor] = l.sets;
    for (let i = 0; i < n; i++) {
      const a = Math.round(att / n);
      const c = Math.round(cor / n);
      sets.push({ id: `${l.code}-s${i}`, chapter: i + 1, title: `Problem set ${i + 1}`, sections: '—', attempted: a, correct: c, date: l.startedOn ?? TODAY, loggedAt: '', via: 'Desktop' });
    }
  }
  const h = l.hours ?? 0;
  const examHrs = (l.exams ?? []).reduce((s, e) => s + e[3] / 60, 0);
  const rest = h - examHrs;
  return {
    id: l.code,
    code: l.code,
    title: l.title,
    credits: l.credits,
    prereqs: l.prereqs,
    status: l.status,
    startedOn: l.startedOn,
    completedOn: l.completedOn,
    catalogNote: l.note,
    catalogTopics: [],
    resources,
    chapters: [],
    problemSets: sets,
    exams: (l.exams ?? []).map((e, i) => ({ id: `${l.code}-e${i}`, title: e[0], source: e[1], date: e[2], timeLimitMin: e[3], score: e[4], conditions: 'Timed, closed book, self-graded against posted solutions' })),
    baseHours: { reading: Math.round(rest * 0.4 * 2) / 2, sets: Math.round(rest * 0.45 * 2) / 2, lectures: 0, exams: 0 },
    extraHours: [],
  };
}

function fixHours(c: Course, total: number) {
  const b = c.baseHours;
  const exams = Math.round(c.exams.reduce((s, e) => s + e.timeLimitMin / 60, 0) * 2) / 2;
  b.exams = exams;
  b.lectures = Math.round((total - b.reading - b.sets - exams) * 2) / 2;
  if (b.lectures < 0) {
    b.sets += b.lectures;
    b.lectures = 0;
  }
}

export const ORDER = [
  'MATH 150', 'MATH 151', 'CS 110', 'MATH 152', 'MATH 200', 'MATH 210', 'MATH 240',
  'MATH 260', 'MATH 310', 'MATH 220', 'MATH 340', 'MATH 330', 'MATH 350', 'MATH 411',
];

export function initialCourses(): Record<string, Course> {
  const out: Record<string, Course> = {};
  for (const l of lite) {
    const c = fromLite(l);
    fixHours(c, l.hours ?? 0);
    out[c.id] = c;
  }
  out[LA.id] = structuredClone(LA);
  out[CALC2.id] = structuredClone(CALC2);
  return out;
}
