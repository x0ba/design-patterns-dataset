export type Block =
  | { p: string }
  | { steps: string[] }
  | { tip: string }
  | { compare: { type: string; what: string; example: string; planner: string }[] };

export interface Article {
  id: string;
  title: string;
  category: string;
  minutes: number;
  context: ('syllabus' | 'week' | 'checklist' | 'general')[];
  walkthrough?: boolean;
  body: Block[];
}

export const CATEGORIES = [
  'Getting started',
  'Courses & syllabi',
  'Deadlines & reminders',
  'Planning your week',
  'Sharing & check-ins',
  'Getting help',
];

export const ARTICLES: Article[] = [
  // ── Getting started ─────────────────────────────────────────
  {
    id: 'gs-what',
    title: 'What Firstweek does for you',
    category: 'Getting started',
    minutes: 1,
    context: ['general'],
    body: [
      { p: 'Firstweek puts every class, shift, reading, and deadline for the term in one place, so you can see a busy week coming before it shows up.' },
      { p: 'You set it up once at the start of the term: courses, work, a study block, and each syllabus. After that you mostly use This week.' },
      { tip: 'You don\'t have to finish setup in one sitting. Everything saves as you type.' },
    ],
  },
  {
    id: 'gs-checklist',
    title: 'Ms. Ortega\'s setup checklist, step by step',
    category: 'Getting started',
    minutes: 2,
    context: ['checklist', 'general'],
    body: [
      { p: 'COLL 100 asks everyone to finish 7 setup steps by the Week 2 check-in. Each one takes 5–20 minutes.' },
      { steps: [
        'Add your courses: code, days, and times.',
        'Add your work schedule so you don\'t plan study time during a shift.',
        'Set a weekly study block, a time you protect every week.',
        'Import every syllabus: readings, assignments, and exams with their dates.',
        'Set exam reminders so no exam surprises you.',
        'Plan a week: give each due item a time to work on it.',
        'Share with your instructor so Ms. Ortega can see your setup.',
      ] },
      { tip: 'Steps check themselves off when you finish them. You never have to tick a box by hand.' },
    ],
  },
  {
    id: 'gs-tour',
    title: 'Taking (or finishing) the intro tour',
    category: 'Getting started',
    minutes: 1,
    context: ['general'],
    body: [
      { p: 'The intro tour shows you the six main parts of Firstweek in about a minute. If you skipped it, use Resume tour at the top of the screen and it picks up where you stopped.' },
      { p: 'You can leave the tour at any step. Nothing you\'ve entered changes.' },
    ],
  },
  {
    id: 'gs-terms',
    title: 'College words you\'ll see a lot',
    category: 'Getting started',
    minutes: 3,
    context: ['general', 'syllabus'],
    body: [
      { p: 'Syllabus: the document each instructor gives you on day one. It lists what\'s due and when, and how you\'re graded.' },
      { p: 'Credit hours (or units): roughly how many hours a week the class meets. MATH 095 is 4 credits; COLL 100 is 1.' },
      { p: 'Office hours: set times when your instructor is available. You don\'t need an appointment or a problem to go.' },
      { p: 'Add/drop deadline: the last day to change classes without it showing on your record.' },
      { p: 'Cumulative final: an exam that covers the whole term, not just the last unit.' },
    ],
  },

  // ── Courses & syllabi ───────────────────────────────────────
  {
    id: 'reading-vs-assignment',
    title: 'Reading, assignment, exam, quiz: which type do I pick?',
    category: 'Courses & syllabi',
    minutes: 2,
    context: ['syllabus'],
    body: [
      { p: 'The quick test: do you turn something in? If yes, it\'s an assignment. If you only need to have read it before class, it\'s a reading.' },
      { compare: [
        { type: 'Reading', what: 'Pages or a chapter to read before class', example: 'PSY 101: "Ch. 2" before Tuesday', planner: 'Shows as prep before that class. No reminder by default.' },
        { type: 'Assignment', what: 'Something you turn in or submit', example: 'PSY 101 short papers, MATH 095 online homework', planner: 'Gets a due-date reminder. Counts toward your workload.' },
        { type: 'Exam', what: 'A midterm, unit test, or final', example: 'PSY 101 Exam 1, Thu Sep 17', planner: 'Gets reminders a week and a day before.' },
        { type: 'Quiz', what: 'A short test, in class or online', example: 'A 10-question chapter quiz', planner: 'Gets a reminder the day before.' },
      ] },
      { tip: 'Look for the words "submit", "turn in", or "due" in your syllabus. Those almost always mean assignment.' },
      { p: 'Picked the wrong one? Change the type any time. Nothing else about the item changes.' },
    ],
  },
  {
    id: 'repeating',
    title: 'Add repeating items (readings, weekly homework)',
    category: 'Courses & syllabi',
    minutes: 2,
    context: ['syllabus'],
    walkthrough: true,
    body: [
      { p: 'If something happens on a pattern, like a reading every Tuesday and Thursday or homework every Sunday, enter it once and Firstweek fills in the rest of the term.' },
      { steps: [
        'Fill in the first one: pick a type, give it a name, choose its date.',
        'Change "Repeats" from "Doesn\'t repeat" to "Every week".',
        'Pick the days and how the items are numbered (for example, Ch. 2 to Ch. 15, 2 sessions each).',
        'Check the preview and the count, then add them all at once.',
      ] },
      { tip: 'Campus closures like Thanksgiving are skipped automatically. If you add the wrong pattern, use Undo or delete the whole series in one click.' },
    ],
  },
  {
    id: 'syllabus-find',
    title: 'Where to find dates in a syllabus',
    category: 'Courses & syllabi',
    minutes: 2,
    context: ['syllabus'],
    body: [
      { p: 'Most syllabi have a section called "Schedule", "Course calendar", or "Weekly plan", usually near the end. That\'s where the dates are.' },
      { p: 'Grading sections list what counts ("3 short papers, 20%") but often not when it\'s due. Match each one to a date in the schedule.' },
      { tip: 'Can\'t find a date? Enter it with your best guess and add "(check)" to the name, then ask in class.' },
    ],
  },
  {
    id: 'syllabus-count',
    title: 'Why we ask you to count items first',
    category: 'Courses & syllabi',
    minutes: 1,
    context: ['syllabus'],
    body: [
      { p: 'Before you type anything, Firstweek asks how many readings, assignments, and exams the syllabus lists. That count becomes your progress bar.' },
      { p: 'It\'s how you know you\'re done: when PSY 101 shows 30 of 30 readings, 4 of 4 exams, and 3 of 3 papers, nothing is missing.' },
    ],
  },
  {
    id: 'syllabus-changes',
    title: 'When your instructor changes a date',
    category: 'Courses & syllabi',
    minutes: 1,
    context: ['syllabus'],
    body: [
      { p: 'Instructors move dates all the time. Open the course, click the item, and change the date. Reminders move with it.' },
      { p: 'For a repeating series, change just the one item. The rest of the series stays put.' },
    ],
  },
  {
    id: 'syllabus-online-hw',
    title: 'Online homework that\'s due every week',
    category: 'Courses & syllabi',
    minutes: 1,
    context: ['syllabus'],
    body: [
      { p: 'MATH 095 homework is due every Sunday at 11:59 pm. That\'s a repeating assignment: set the type to Assignment, the first due date, the time to 11:59 pm, and Repeats to every Sunday.' },
      { tip: 'You work Sundays 10 am–4 pm. Plan to finish weekend homework on Saturday night or Sunday evening, not right before midnight.' },
    ],
  },
  {
    id: 'edit-delete',
    title: 'Edit or delete an item (and undo)',
    category: 'Courses & syllabi',
    minutes: 1,
    context: ['syllabus'],
    body: [
      { p: 'Every item has a delete button on its row. Right after you delete or add something, an Undo button shows at the bottom of the screen for a few seconds.' },
      { p: 'A repeating series shows as one row. Open it to see every item, or delete the whole series at once.' },
    ],
  },
  {
    id: 'no-dates',
    title: 'Syllabus says "TBA" or has no dates',
    category: 'Courses & syllabi',
    minutes: 1,
    context: ['syllabus'],
    body: [
      { p: 'Some instructors post dates as the term goes. Enter what you know, then set the step to done anyway. You can add items later.' },
      { p: 'Ms. Ortega\'s check-in only asks that every course has its syllabus started and every known date entered.' },
    ],
  },

  // ── Deadlines & reminders ───────────────────────────────────
  {
    id: 'exam-reminders',
    title: 'Set exam reminders',
    category: 'Deadlines & reminders',
    minutes: 1,
    context: ['syllabus', 'checklist'],
    body: [
      { p: 'Exam reminders go off one week before (so you can start studying) and one day before (so you can review and sleep).' },
      { steps: [
        'Open the checklist step "Set exam reminders" and choose Turn on for all exams, or',
        'Tap the bell on any exam row in a course.',
      ] },
      { tip: 'Once you turn them on, exams you add later get reminders automatically.' },
    ],
  },
  {
    id: 'reminder-timing',
    title: 'How early should reminders go off?',
    category: 'Deadlines & reminders',
    minutes: 1,
    context: ['general'],
    body: [
      { p: 'A good rule of thumb: start a paper a week before it\'s due, and study for an exam over at least 4 short sessions, not one long night.' },
      { p: 'Firstweek\'s defaults follow that rule. You can change them later in Settings.' },
    ],
  },
  {
    id: 'due-times',
    title: '"Due before class" vs "due at 11:59 pm"',
    category: 'Deadlines & reminders',
    minutes: 1,
    context: ['syllabus'],
    body: [
      { p: 'Readings and in-class work are due when class starts. Firstweek uses your class start time (9:30 am for PSY 101).' },
      { p: 'Online work is usually due at 11:59 pm. That still counts as the same day, so homework "due Sunday" means Sunday night, not Monday morning.' },
    ],
  },
  {
    id: 'late-work',
    title: 'If you\'re going to miss a deadline',
    category: 'Deadlines & reminders',
    minutes: 2,
    context: ['general'],
    body: [
      { p: 'Email your instructor before the deadline, not after. Say what\'s due, what happened in one sentence, and when you can turn it in.' },
      { p: 'Check the syllabus for a late policy first. Many instructors accept work a day or two late for a small penalty.' },
    ],
  },

  // ── Planning your week ──────────────────────────────────────
  {
    id: 'plan-week',
    title: 'Plan a week in 3 moves',
    category: 'Planning your week',
    minutes: 2,
    context: ['week', 'checklist'],
    body: [
      { steps: [
        'Look at what\'s fixed: classes, work shifts, and your study block are already on the grid.',
        'Give every due item a time: click Schedule next to it and Firstweek finds a free spot before it\'s due.',
        'Look at the totals and mark the week planned.',
      ] },
      { tip: 'Do this every Sunday. It takes about 10 minutes once your syllabi are in.' },
    ],
  },
  {
    id: 'study-hours',
    title: 'How much study time is enough?',
    category: 'Planning your week',
    minutes: 2,
    context: ['week'],
    body: [
      { p: 'The common guideline is about 2 hours outside class for every hour in class. With a job, that\'s often not realistic every week, so start smaller and be consistent.' },
      { p: 'Busy weeks (exams, papers) need more. Light weeks can need less. The week view shows how many study hours you\'ve planned.' },
    ],
  },
  {
    id: 'work-and-school',
    title: 'Balancing a job and classes',
    category: 'Planning your week',
    minutes: 2,
    context: ['week'],
    body: [
      { p: 'Shifts are fixed, so plan around them first. Look at the week before an exam: if it has a long weekend shift, move your study time earlier in the week.' },
      { p: 'If your manager posts schedules weekly, update your shifts in Firstweek when they change.' },
    ],
  },
  {
    id: 'study-block',
    title: 'Make your study block count',
    category: 'Planning your week',
    minutes: 1,
    context: ['week'],
    body: [
      { p: 'Decide what you\'ll work on before the block starts. Firstweek lists what\'s due next inside each block.' },
      { p: 'Phone in your bag, one task at a time, short break every 50 minutes.' },
    ],
  },
  {
    id: 'prep-time',
    title: 'Schedule time for each due item',
    category: 'Planning your week',
    minutes: 1,
    context: ['week'],
    body: [
      { p: 'A due date tells you when something is due, not when you\'ll do it. Prep time puts a block on your week for actually doing it.' },
      { p: 'Readings get 45 minutes by default, assignments 90. Remove a prep block and schedule it again any time.' },
    ],
  },
  {
    id: 'busy-week',
    title: 'When a week is overloaded',
    category: 'Planning your week',
    minutes: 2,
    context: ['week'],
    body: [
      { p: 'Look ahead for weeks with an exam and a paper together. Start the paper the week before.' },
      { p: 'A peer coach can help you sort out an overloaded week in 20 minutes. Bring your Firstweek plan.' },
    ],
  },

  // ── Sharing & check-ins ─────────────────────────────────────
  {
    id: 'share',
    title: 'Share your plan with your instructor',
    category: 'Sharing & check-ins',
    minutes: 1,
    context: ['checklist'],
    body: [
      { p: 'Sharing gives Ms. Ortega a read-only view of your courses, due dates, and week plan. She can\'t change anything.' },
      { p: 'You choose whether she sees your work shifts. Most students share them so she can help balance the load.' },
      { tip: 'You can share before everything is finished. She\'ll see updates as you make them.' },
    ],
  },
  {
    id: 'checkin',
    title: 'What happens at the Week 2 check-in',
    category: 'Sharing & check-ins',
    minutes: 1,
    context: ['checklist'],
    body: [
      { p: 'Ms. Ortega looks at your shared plan by Tuesday, Sep 1 at 11:59 pm. It counts as a COLL 100 assignment.' },
      { p: 'She\'s checking that your term is set up, not that it\'s perfect. Unfinished steps are fine to talk about in Thursday\'s class.' },
    ],
  },

  // ── Getting help ────────────────────────────────────────────
  {
    id: 'coaching',
    title: 'Drop in with a peer coach',
    category: 'Getting help',
    minutes: 1,
    context: ['general', 'syllabus', 'week', 'checklist'],
    body: [
      { p: 'Peer coaches are students who\'ve taken COLL 100. They can sit with you and enter a syllabus together, or help plan a hard week.' },
      { p: 'Drop-in hours: Mon–Thu, 10 am–6 pm, Learning Commons Rm 120. No appointment needed.' },
    ],
  },
  {
    id: 'office-hours',
    title: 'Going to office hours (what to say)',
    category: 'Getting help',
    minutes: 2,
    context: ['general'],
    body: [
      { p: 'You can walk in and say: "Hi, I\'m in your 9:30 section. I wanted to check I understand the schedule for the readings."' },
      { p: 'Instructors notice students who come by early in the term. It helps later if you need flexibility.' },
    ],
  },
];

export const articleById = (id: string) => ARTICLES.find((a) => a.id === id);
