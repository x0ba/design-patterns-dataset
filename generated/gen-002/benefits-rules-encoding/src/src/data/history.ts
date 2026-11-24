export interface NoteEntry {
  author: string;
  at: string;
  text: string;
}

export interface Note {
  id: string;
  nodeId: string;
  status: 'open' | 'resolved';
  thread: NoteEntry[];
}

export interface RevisionMeta {
  n: number;
  savedAt: string;
  author: string;
  message: string;
  stepsChanged: number;
}

export const KWAME = 'Kwame Asante';
export const HYEJIN = 'Hye-jin';

export const REVISIONS: RevisionMeta[] = [
  { n: 1, savedAt: '2026-07-14 10:21', author: KWAME, message: 'Start model: household unit and residency rules', stepsChanged: 6 },
  { n: 2, savedAt: '2026-07-16 15:04', author: KWAME, message: 'Citizenship, SSN and student rules', stepsChanged: 5 },
  { n: 3, savedAt: '2026-07-21 09:47', author: KWAME, message: 'Work requirement node, first pass', stepsChanged: 2 },
  { n: 4, savedAt: '2026-07-23 14:30', author: HYEJIN, message: 'Resource tests and vehicle exclusion', stepsChanged: 4 },
  { n: 5, savedAt: '2026-07-30 11:12', author: KWAME, message: 'Load parameter table (demo values)', stepsChanged: 0 },
  { n: 6, savedAt: '2026-08-04 16:55', author: KWAME, message: 'Gross income test (130%) and net income test (100%)', stepsChanged: 5 },
  { n: 7, savedAt: '2026-08-06 10:08', author: KWAME, message: 'Earned income deduction at 20%', stepsChanged: 1 },
  { n: 8, savedAt: '2026-08-11 13:39', author: HYEJIN, message: 'Standard deduction lookup by household size', stepsChanged: 2 },
  { n: 9, savedAt: '2026-08-13 09:20', author: KWAME, message: 'Dependent care cap per person', stepsChanged: 3 },
  { n: 10, savedAt: '2026-08-18 17:02', author: KWAME, message: 'Shelter excess: half of income after deductions', stepsChanged: 4 },
  { n: 11, savedAt: '2026-08-25 12:44', author: HYEJIN, message: 'Standard utility allowance when heat billed separately', stepsChanged: 3 },
  { n: 12, savedAt: '2026-09-01 10:31', author: KWAME, message: 'Shelter cap for households without elderly or disabled members', stepsChanged: 2 },
  { n: 13, savedAt: '2026-09-03 15:18', author: KWAME, message: 'Benefit formula: maximum allotment less 30% of net income', stepsChanged: 4 },
  { n: 14, savedAt: '2026-09-08 11:50', author: HYEJIN, message: 'Minimum benefit for one- and two-person households', stepsChanged: 2 },
  { n: 15, savedAt: '2026-09-10 16:27', author: KWAME, message: 'Reason codes for denial notices', stepsChanged: 3 },
  { n: 16, savedAt: '2026-09-15 09:58', author: KWAME, message: 'Verification nodes for earned and unearned income', stepsChanged: 5 },
  { n: 17, savedAt: '2026-09-22 14:06', author: KWAME, message: 'Certification period: 24 months when every member is elderly or disabled', stepsChanged: 2 },
  { n: 18, savedAt: '2026-09-29 10:15', author: HYEJIN, message: 'Borderline flag per lab protocol §2.3', stepsChanged: 4 },
  { n: 19, savedAt: '2026-10-01 08:30', author: KWAME, message: 'Parameters effective 2026-10-01 (demo values)', stepsChanged: 0 },
  { n: 20, savedAt: '2026-10-06 13:47', author: KWAME, message: 'Medical deduction for elderly or disabled members', stepsChanged: 2 },
  { n: 21, savedAt: '2026-10-13 11:03', author: HYEJIN, message: 'Test households T-01 to T-09', stepsChanged: 0 },
  { n: 22, savedAt: '2026-10-20 15:52', author: KWAME, message: 'Test households T-10 to T-12', stepsChanged: 0 },
  { n: 23, savedAt: '2026-10-27 10:40', author: KWAME, message: 'Test path output', stepsChanged: 2 },
  { n: 24, savedAt: '2026-10-30 16:19', author: KWAME, message: 'Outcome steps split out per test', stepsChanged: 4 },
  { n: 25, savedAt: '2026-11-03 09:34', author: HYEJIN, message: 'Expected outcomes sheet loaded from legal advisor', stepsChanged: 0 },
  { n: 26, savedAt: '2026-11-09 14:21', author: KWAME, message: 'Reconcile standard deduction table with parameter sheet', stepsChanged: 1 },
  { n: 27, savedAt: '2026-11-14 17:40', author: KWAME, message: 'Shelter deduction: no cap for elderly or disabled households', stepsChanged: 1 },
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-medical-threshold',
    nodeId: 'medical_ded',
    status: 'open',
    thread: [
      {
        author: HYEJIN,
        at: '2026-11-12 10:14',
        text:
          'medical_excess takes the $35 threshold off the household total. Should the threshold apply per member? In the pilot sample, caseworker files net it per household, so the model and the files disagree. Can we get the legal advisor\'s reading before the deductions section is frozen?',
      },
    ],
  },
  {
    id: 'note-shelter-any-all',
    nodeId: 'shelter_ded',
    status: 'open',
    thread: [
      {
        author: HYEJIN,
        at: '2026-11-15 16:02',
        text:
          'shelter_ded drops the cap whenever eld_dis_members > 0. Should that read "any" elderly or disabled member (as written) or "all"? The amended text may bear on this too. Please check before the next run.',
      },
    ],
  },
  {
    id: 'note-earned-ded',
    nodeId: 'earned_ded',
    status: 'resolved',
    thread: [
      { author: HYEJIN, at: '2026-08-12 09:05', text: 'Confirm the 20% applies to gross earned income, before the standard deduction.' },
      { author: KWAME, at: '2026-08-12 11:30', text: 'Confirmed. Earned income deduction is applied to gross earned income only.' },
    ],
  },
];
