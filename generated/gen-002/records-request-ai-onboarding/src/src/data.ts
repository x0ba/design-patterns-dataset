export type Confidence = 'high' | 'medium'
export type ExemptionCode = 'PRA-6(b)' | 'PRA-9(a)' | 'PRA-11'

export interface Exemption {
  code: ExemptionCode
  short: string
  label: string
  citation: string
  letterText: string
  articleId: string
}

export const EXEMPTIONS: Record<ExemptionCode, Exemption> = {
  'PRA-6(b)': {
    code: 'PRA-6(b)',
    short: 'Personal phone',
    label: 'Personal contact information',
    citation: 'State Public Records Act § 6(b)',
    letterText:
      'personal telephone numbers of county employees and private individuals, which are exempt from disclosure under State Public Records Act § 6(b)',
    articleId: 'a8',
  },
  'PRA-9(a)': {
    code: 'PRA-9(a)',
    short: 'Attorney-client',
    label: 'Attorney-client privilege',
    citation: 'State Public Records Act § 9(a)',
    letterText:
      'confidential communications between County staff and County Counsel made for the purpose of obtaining legal advice, which are privileged under State Public Records Act § 9(a)',
    articleId: 'a9',
  },
  'PRA-11': {
    code: 'PRA-11',
    short: 'Deliberative',
    label: 'Pre-decisional deliberation',
    citation: 'State Public Records Act § 11',
    letterText:
      'pre-decisional opinions and recommendations prepared before a final County decision, which are exempt under State Public Records Act § 11',
    articleId: 'a10',
  },
}

export const REQUEST = {
  id: 'PRR-2026-1184',
  title: 'Fairground Road culvert project — Public Works emails',
  requester: 'Owen Pak',
  requesterOrg: 'The Marren Valley Courier',
  requesterEmail: 'opak@mvcourier.com',
  requesterAddress: ['The Marren Valley Courier', '418 Commerce Street', 'Linden Falls, OR 97391'],
  received: 'Tue, Nov 3, 2026',
  receivedLong: 'November 3, 2026',
  due: 'Wed, Nov 18, 2026 · 5:00 PM',
  businessDaysLeft: 2,
  wording:
    '“All emails sent or received by Marren County Public Works staff concerning the Fairground Road culvert replacement project, from January 1 through June 30, 2026, including correspondence with contractors and consultants.”',
  assignedBy: 'Gail Moreno',
  docs: 38,
  pages: 212,
}

export const USER = {
  name: 'Renata Bálint',
  initials: 'RB',
  title: 'Records Specialist',
}

export const SUPERVISOR = { name: 'Gail Moreno', title: 'Records Manager' }

export const TRAINER = {
  name: 'Luis Ortega',
  role: 'IT Training & Support',
  ext: 'ext. 4417',
  email: 'luis.ortega@marrencounty.gov',
  hours: 'Tue & Thu, 1:00–3:00 PM',
  where: 'Admin Building, Room 214 — or by Teams call',
  next: 'Tomorrow, Tue Nov 17, 1:00–3:00 PM',
  slots: ['1:00', '1:15', '1:30', '1:45', '2:00', '2:15', '2:30', '2:45'],
  taken: ['1:00', '1:30', '2:15'],
}

export interface Doc {
  id: string
  date: string
  from: string
  to: string
  cc?: string
  subject: string
  pages: number
}

export const DOCS: Doc[] = [
  { id: 'DOC-01', date: 'Jan 6, 2026', from: 'Teresa Okafor', to: 'Public Works – Engineering', subject: 'Fairground Rd culvert – FY26 project kickoff', pages: 3 },
  { id: 'DOC-02', date: 'Jan 9, 2026', from: 'Mark Hollis', to: 'Siri Halvorsen (Halvorsen Geotechnical)', subject: 'Geotech scope for Fairground Rd crossing', pages: 4 },
  { id: 'DOC-03', date: 'Jan 14, 2026', from: 'Walter Huang (resident)', to: 'Public Works front desk', subject: 'Water over the road again at Fairground', pages: 2 },
  { id: 'DOC-04', date: 'Jan 20, 2026', from: 'Mark Hollis', to: 'Teresa Okafor', subject: 'Culvert condition photos', pages: 9 },
  { id: 'DOC-05', date: 'Jan 23, 2026', from: 'Dale Kowalczyk', to: 'Mark Hollis', subject: 'Weekend road closure staffing', pages: 2 },
  { id: 'DOC-06', date: 'Feb 2, 2026', from: 'Siri Halvorsen (Halvorsen Geotechnical)', to: 'Mark Hollis', subject: 'Boring log results – FR-1 and FR-2', pages: 14 },
  { id: 'DOC-07', date: 'Feb 5, 2026', from: 'Ines Ferreira', to: 'Teresa Okafor', subject: 'Grant reimbursement timeline', pages: 3 },
  { id: 'DOC-08', date: 'Feb 11, 2026', from: 'Mark Hollis', to: 'Curtis Brandt (Brandt & Sons Excavating)', subject: 'Pre-bid questions – Fairground Rd', pages: 5 },
  { id: 'DOC-09', date: 'Feb 18, 2026', from: 'Teresa Okafor', to: 'Clerk of the Board', subject: 'Agenda item request – culvert bid award', pages: 2 },
  { id: 'DOC-10', date: 'Feb 24, 2026', from: 'Curtis Brandt (Brandt & Sons Excavating)', to: 'Mark Hollis', subject: 'Bid clarification #2', pages: 6 },
  { id: 'DOC-11', date: 'Mar 3, 2026', from: 'Lorraine Becker (resident)', to: 'Public Works front desk', subject: 'Detour route concerns', pages: 1 },
  { id: 'DOC-12', date: 'Mar 9, 2026', from: 'Priya Raman (County Counsel)', to: 'Teresa Okafor', subject: 'Brandt delay notice – advice', pages: 3 },
  { id: 'DOC-13', date: 'Mar 10, 2026', from: 'Teresa Okafor', to: 'Mark Hollis', subject: 'Re: Brandt schedule', pages: 2 },
  { id: 'DOC-14', date: 'Mar 16, 2026', from: 'Ines Ferreira', to: 'Mark Hollis', subject: 'Automatic reply: Out of office Mar 16–20', pages: 2 },
  { id: 'DOC-15', date: 'Mar 19, 2026', from: 'Mark Hollis', to: 'Siri Halvorsen (Halvorsen Geotechnical)', subject: 'Revised footing design', pages: 11 },
  { id: 'DOC-16', date: 'Mar 25, 2026', from: 'Curtis Brandt (Brandt & Sons Excavating)', to: 'Mark Hollis', subject: 'Change order request CO-01', pages: 8 },
  { id: 'DOC-17', date: 'Apr 1, 2026', from: 'Public Works front desk', to: 'Dale Kowalczyk', subject: 'Fwd: Voicemail – resident, Fairground Rd', pages: 1 },
  { id: 'DOC-18', date: 'Apr 3, 2026', from: 'Dale Kowalczyk', to: 'Mark Hollis', subject: 'Detour signage install', pages: 3 },
  { id: 'DOC-19', date: 'Apr 8, 2026', from: 'Teresa Okafor', to: 'Priya Raman (County Counsel)', subject: 'Temporary construction easement – Mendes parcel', pages: 4 },
  { id: 'DOC-20', date: 'Apr 13, 2026', from: 'Mark Hollis', to: 'Teresa Okafor', subject: 'CO-01 evaluation', pages: 9 },
  { id: 'DOC-21', date: 'Apr 17, 2026', from: 'Teresa Okafor', to: 'Mark Hollis', subject: 'Fwd: text from site', pages: 4 },
  { id: 'DOC-22', date: 'Apr 22, 2026', from: 'Siri Halvorsen (Halvorsen Geotechnical)', to: 'Mark Hollis', subject: 'Field observation report #3', pages: 18 },
  { id: 'DOC-23', date: 'Apr 27, 2026', from: 'Ines Ferreira', to: 'Teresa Okafor', subject: 'Budget amendment – draft numbers', pages: 5 },
  { id: 'DOC-24', date: 'May 1, 2026', from: 'Priya Raman (County Counsel)', to: 'Teresa Okafor', cc: 'Siri Halvorsen (Halvorsen Geotechnical)', subject: 'Re: Brandt claim – technical basis', pages: 3 },
  { id: 'DOC-25', date: 'May 4, 2026', from: 'Mark Hollis', to: 'Curtis Brandt (Brandt & Sons Excavating)', subject: 'Response to CO-01', pages: 4 },
  { id: 'DOC-26', date: 'May 6, 2026', from: 'Dale Kowalczyk', to: 'Road Maintenance – Crew B', subject: 'Night work schedule, week of May 11', pages: 1 },
  { id: 'DOC-27', date: 'May 7, 2026', from: 'Ines Ferreira', to: 'Teresa Okafor', subject: 'Staff report draft v2 – comments', pages: 8 },
  { id: 'DOC-28', date: 'May 8, 2026', from: 'Clerk of the Board', to: 'Teresa Okafor', subject: 'Agenda packet deadline – May 12 meeting', pages: 2 },
  { id: 'DOC-29', date: 'May 11, 2026', from: 'Mark Hollis', to: 'Teresa Okafor', subject: 'DRAFT – options for CO-01 cost', pages: 6 },
  { id: 'DOC-30', date: 'May 11, 2026', from: 'Curtis Brandt (Brandt & Sons Excavating)', to: 'Mark Hollis', subject: 'Revised schedule – substantial completion', pages: 9 },
  { id: 'DOC-31', date: 'May 12, 2026', from: 'Teresa Okafor', to: 'Clerk of the Board', subject: 'Final staff report – Item 7', pages: 12 },
  { id: 'DOC-32', date: 'May 20, 2026', from: 'Mark Hollis', to: 'Curtis Brandt (Brandt & Sons Excavating)', subject: 'Notice to proceed – Phase 2', pages: 3 },
  { id: 'DOC-33', date: 'May 26, 2026', from: 'Mark Hollis', to: 'Arturo Mendes (property owner)', subject: 'Access agreement – your driveway during Phase 2', pages: 3 },
  { id: 'DOC-34', date: 'Jun 2, 2026', from: 'Siri Halvorsen (Halvorsen Geotechnical)', to: 'Mark Hollis', subject: 'Field observation report #5', pages: 15 },
  { id: 'DOC-35', date: 'Jun 9, 2026', from: 'Dale Kowalczyk', to: 'Mark Hollis', subject: 'Road reopening checklist', pages: 2 },
  { id: 'DOC-36', date: 'Jun 15, 2026', from: 'Curtis Brandt (Brandt & Sons Excavating)', to: 'Mark Hollis', subject: 'Final pay application', pages: 10 },
  { id: 'DOC-37', date: 'Jun 22, 2026', from: 'Teresa Okafor', to: 'All Public Works', subject: 'Fairground Rd reopened – thank you', pages: 1 },
  { id: 'DOC-38', date: 'Jun 29, 2026', from: 'Ines Ferreira', to: 'Teresa Okafor', subject: 'Grant closeout documents', pages: 12 },
]

export interface Redaction {
  id: string
  n: number
  docId: string
  page: number
  exemption: ExemptionCode
  confidence: Confidence
  before: string
  span: string
  after: string
  rationale: string
  uncertainty?: string
  check?: string[]
}

export const REDACTIONS: Redaction[] = [
  {
    id: 'R1', n: 1, docId: 'DOC-03', page: 2, exemption: 'PRA-6(b)', confidence: 'high',
    before: 'This is the third time since Thanksgiving the water has come over the road by the fairground gate. My wife nearly lost the car in it last night. Somebody please call me back — ',
    span: 'my cell is (541) 555-0187',
    after: ' and I am home most afternoons.\n\nWalter Huang\n2290 Fairground Road',
    rationale: 'A private resident’s cell number, given in a complaint to the County. The resident is not a public employee and the number is not a business line.',
  },
  {
    id: 'R2', n: 2, docId: 'DOC-05', page: 1, exemption: 'PRA-6(b)', confidence: 'high',
    before: 'Mark — I can cover Saturday and Sunday for the closure with two from Crew B. If the barricades get moved again, ',
    span: 'call my personal cell, 541-555-0142',
    after: ', not the shop line, since nobody will be at the yard.\n\nDale',
    rationale: 'The writer calls this number a personal cell. Personal numbers of employees are exempt even when used for work contact.',
  },
  {
    id: 'R3', n: 3, docId: 'DOC-08', page: 3, exemption: 'PRA-6(b)', confidence: 'medium',
    before: 'Bidders should direct all questions to me in writing by February 20. For site-access questions on the day of the pre-bid walk only, you can reach me in the field.\n\nMark Hollis, P.E.\nProject Engineer, Marren County Public Works\nOffice: (541) 555-0100 ext. 2318\n',
    span: 'Mobile: (541) 555-0163',
    after: '\nmhollis@marrencounty.gov',
    rationale: 'A mobile number in an employee’s signature block, separate from the county office line listed above it.',
    uncertainty: 'The assistant couldn’t tell whether this is Mark Hollis’s personal phone or a county-issued work phone. County-issued phone numbers are not exempt and would have to be released. The number isn’t in the county phone directory, but county-issued phones aren’t always listed there.',
    check: [
      'Look up 555-0163 in the IT mobile device list (Public Works › Devices), or',
      'Ask Mark Hollis or Public Works admin whether it’s a county phone.',
      'If it’s county-issued: choose “Don’t redact.” If it’s personal: approve.',
    ],
  },
  {
    id: 'R4', n: 4, docId: 'DOC-11', page: 1, exemption: 'PRA-6(b)', confidence: 'high',
    before: 'The detour sends gravel trucks right past the school bus stop at Becker Lane. I would like someone from the County to call me before this goes ahead. ',
    span: 'Home phone: 541-555-0128',
    after: '.\n\nLorraine Becker',
    rationale: 'A private resident’s home phone number in a public comment.',
  },
  {
    id: 'R5', n: 5, docId: 'DOC-14', page: 2, exemption: 'PRA-6(b)', confidence: 'high',
    before: 'I am out of the office March 16–20 with limited access to email. For grant reimbursement questions, please contact Teresa Okafor. For anything urgent about the Fairground Road invoices, ',
    span: 'text me at 541-555-0171 (personal)',
    after: '.\n\nInes Ferreira\nAdministrative Analyst',
    rationale: 'The employee labels the number “personal” in the automatic reply.',
  },
  {
    id: 'R6', n: 6, docId: 'DOC-17', page: 1, exemption: 'PRA-6(b)', confidence: 'high',
    before: 'Voicemail transcription, received 3/31 at 4:52 PM: “Hi, this is about the culvert work on Fairground. The flaggers are letting people through without stopping them and somebody is going to get hurt. ',
    span: 'You can call me back at 541-555-0119',
    after: '. Thanks.”\n\nForwarding to you, Dale — caller did not leave a name.',
    rationale: 'A callback number left by a private caller in a voicemail transcription.',
  },
  {
    id: 'R7', n: 7, docId: 'DOC-21', page: 4, exemption: 'PRA-6(b)', confidence: 'high',
    before: 'Forwarding the text I got from the site this morning so it’s in the file.\n\n-----\n',
    span: 'From: Teresa (cell) 541-555-0155',
    after: '\nTo: Curtis Brandt\n“Water is up to the second form board on the east side. Hold the pour until Mark signs off.”',
    rationale: 'Header of a text message forwarded from the director’s personal cell phone.',
  },
  {
    id: 'R8', n: 8, docId: 'DOC-26', page: 1, exemption: 'PRA-6(b)', confidence: 'high',
    before: 'Night work Mon–Thu, 9 PM to 5 AM. Report to the Fairground staging area. If you’re going to be late or out, ',
    span: 'call or text me at 541-555-0142',
    after: ' — the shop line won’t be answered overnight.\n\nDale',
    rationale: 'Same personal cell number as in DOC-05 (Dale Kowalczyk), confirmed personal there.',
  },
  {
    id: 'R9', n: 9, docId: 'DOC-33', page: 2, exemption: 'PRA-6(b)', confidence: 'high',
    before: 'Thank you for meeting with me on Friday. As discussed, the contractor will keep one lane of your driveway open at all times. The contractor’s site lead will call you at ',
    span: '541-555-0136',
    after: ' at least 24 hours before any work that blocks access.',
    rationale: 'A private property owner’s phone number in correspondence about a property access agreement.',
  },
  {
    id: 'R10', n: 10, docId: 'DOC-12', page: 1, exemption: 'PRA-9(a)', confidence: 'high',
    before: 'Teresa,\n\nYou asked whether Brandt’s March 4 delay notice was timely under the contract. ',
    span: 'In my view the notice was late under § 8.3 of the general conditions, but I would not rely on that alone. If the County rejects the claim on timeliness and the high-water event is found to be an unforeseen site condition, we have real exposure on the extended overhead. I recommend we respond on the merits and reserve the timeliness argument.',
    after: '\n\nHappy to talk through it before your Thursday meeting.\n\nPriya Raman\nDeputy County Counsel',
    rationale: 'Deputy County Counsel giving legal advice to the Public Works Director, in response to the Director’s request. No third parties on the email.',
  },
  {
    id: 'R11', n: 11, docId: 'DOC-19', page: 3, exemption: 'PRA-9(a)', confidence: 'high',
    before: 'Priya,\n\nThe Mendes family has agreed in principle to a temporary construction easement for Phase 2. Before Mark sends anything, ',
    span: 'can you tell me whether we need a formal easement recorded, or whether a signed access agreement protects the County if their driveway is damaged? I’m also worried about what we said at the February meeting — Mark may have promised them we’d repave the whole driveway.',
    after: '\n\nThanks,\nTeresa',
    rationale: 'The director asking County Counsel for legal advice. Only the director and counsel are on the email.',
  },
  {
    id: 'R12', n: 12, docId: 'DOC-24', page: 2, exemption: 'PRA-9(a)', confidence: 'medium',
    before: 'Teresa — copying Siri to confirm the technical points.\n\n',
    span: 'Based on Siri’s boring logs, I think we can argue the groundwater conditions were disclosed in the bid documents, which would undercut Brandt’s “unforeseen conditions” claim. If Siri agrees, I’d like Siri to prepare a short declaration we can hold in reserve.',
    after: '\n\nPriya Raman\nDeputy County Counsel\ncc: Siri Halvorsen, Halvorsen Geotechnical',
    rationale: 'Legal strategy from County Counsel about a pending contractor claim.',
    uncertainty: 'An outside consultant (Siri Halvorsen) is copied. Sharing advice with a third party can waive the privilege — unless the consultant was hired by County Counsel to help give legal advice. The assistant found Halvorsen’s Public Works contract but no record of a separate engagement by County Counsel.',
    check: [
      'Ask County Counsel (Priya Raman) whether Halvorsen was working at counsel’s direction on the Brandt claim.',
      'If yes: approve, and note who confirmed it.',
      'If no: the privilege may be waived. Decline, or ask counsel whether another exemption applies.',
    ],
  },
  {
    id: 'R13', n: 13, docId: 'DOC-29', page: 1, exemption: 'PRA-11', confidence: 'high',
    before: 'Teresa — draft for your eyes only before the Board packet goes out.\n\n',
    span: 'My recommendation is Option B: negotiate CO-01 down to about $184,000 and give Brandt 21 more days to substantial completion. Option A (deny outright) probably ends in a formal claim we could lose. Option C (pay in full) sets a bad precedent for Phase 2.',
    after: '\n\nThe cost tables are attached. Those are just the numbers from Brandt’s submittal and our estimate.\n\nMark',
    rationale: 'An engineer’s recommendation to the director before the Board decided CO-01. The factual cost tables are not marked for redaction.',
  },
  {
    id: 'R14', n: 14, docId: 'DOC-27', page: 2, exemption: 'PRA-11', confidence: 'medium',
    before: 'Teresa — my comments on v2 are below. Main one is section 3.\n\nProposed section 3 text:\n',
    span: '“Staff recommends approval of Change Order 01 in the amount of $184,250, with a 21-day extension to substantial completion. The groundwater conditions encountered exceeded those shown in the geotechnical report, and a negotiated change order is expected to cost less than defending a formal claim.”',
    after: '\n\nI also think we should drop the contingency figure from the table — it invites questions.\n\nInes',
    rationale: 'Draft staff report language circulated for comment before the Board meeting.',
    uncertainty: 'The Board adopted the final staff report on May 12, 2026, and it’s a public record (DOC-31). This draft passage is almost word-for-word the same as section 3 of the final report. Once wording has been published in a final decision, keeping the draft version secret usually serves no purpose and the exemption may not apply.',
    check: [
      'Compare this passage with section 3 of the final staff report (DOC-31, p. 4).',
      'If it matches the published text: decline the redaction.',
      'Ines’s comment about the contingency figure (after the passage) is not part of this suggestion.',
    ],
  },
]

export const DOC_BY_ID: Record<string, Doc> = Object.fromEntries(DOCS.map((d) => [d.id, d]))

export interface LetterPara {
  id: string
  label: string
  text: string
  generated?: boolean
}

export const LETTER_PARAS: LetterPara[] = [
  { id: 'salutation', label: 'Salutation', text: 'Dear Mr. Pak,' },
  {
    id: 'opening', label: 'Opening',
    text: 'This letter responds to your public records request received by the Office of the Marren County Clerk-Recorder on November 3, 2026, seeking all emails sent or received by Public Works staff concerning the Fairground Road culvert replacement project from January 1 through June 30, 2026, including correspondence with contractors and consultants.',
  },
  {
    id: 'search', label: 'Search and records',
    text: 'We searched the email accounts of the five Public Works staff members assigned to the project, along with the shared Public Works front desk mailbox, using the project name, the project number (PW-26-031), and the names of the contractor and consultant. We identified 38 responsive records totaling 212 pages. They are available to you through the County’s secure records portal at the link below.',
  },
  { id: 'exemptions', label: 'Redactions (generated from your decisions)', text: '', generated: true },
  {
    id: 'withheld', label: 'Records withheld',
    text: 'No responsive records have been withheld in their entirety.',
  },
  {
    id: 'review', label: 'Right to review',
    text: 'If you believe any portion of these records was withheld in error, you may ask for review by the County Clerk-Recorder in writing within 30 days of the date of this letter. You may also seek review as provided in State Public Records Act § 15.',
  },
  {
    id: 'closing', label: 'Closing',
    text: 'Thank you for your patience while we gathered these records. If you have questions about this response, please contact me directly at (541) 555-0100 ext. 2207 or records@marrencounty.gov.',
  },
]

/** Renata's edit to the opening, made before she paused. */
export const INITIAL_LETTER_EDITS: Record<string, string> = {
  opening:
    'This letter responds to your public records request, received by the Office of the Marren County Clerk-Recorder on November 3, 2026. You asked for all emails sent or received by Marren County Public Works staff concerning the Fairground Road culvert replacement project from January 1 through June 30, 2026, including correspondence with contractors and consultants.',
}

export interface WalkStep {
  id: string
  n: number
  title: string
  summary: string
  points: string[]
  showMe?: { target: Spot; label: string; tab?: Tab }[]
}

export type Tab = 'redactions' | 'letter' | 'signoff' | 'audit'
export type Spot = 'confidence' | 'decision' | 'preview' | 'save' | 'audit-tab' | 'signoff-tab' | 'letter-badge' | 'checklist'

export const WALK_STEPS: WalkStep[] = [
  {
    id: 'w1', n: 1, title: 'Starting a request',
    summary: 'Open a request from your queue and ask the assistant for a draft.',
    points: ['Requests assigned to you appear in My queue.', 'The assistant only drafts when you ask it to. It never sends anything.'],
  },
  {
    id: 'w2', n: 2, title: 'Reviewing sources',
    summary: 'Confirm which records are responsive before anything is drafted.',
    points: ['You decide which documents are responsive. The assistant only suggests.', 'The draft letter counts only the documents you marked responsive.'],
  },
  {
    id: 'w3', n: 3, title: 'Redactions',
    summary: 'Decide on each suggested redaction. Your name is logged on every decision.',
    points: [
      'Each suggestion shows an exemption code, the assistant’s reason, and a confidence level.',
      'Medium confidence means the assistant tells you exactly what it couldn’t confirm. Check that one fact before you decide.',
      'You can approve, decline, or change the exemption. You can undo any decision until you send.',
      'You’re on a real request. Decisions you make here count toward PRR-2026-1184.',
    ],
    showMe: [
      { target: 'confidence', label: 'The confidence level and what it means', tab: 'redactions' },
      { target: 'decision', label: 'Where you approve or decline', tab: 'redactions' },
      { target: 'preview', label: 'See the page as the requester will', tab: 'redactions' },
    ],
  },
  {
    id: 'w4', n: 4, title: 'Policy & sign-off',
    summary: 'How AP-07 applies, and what you confirm before sending.',
    points: [
      'AP-07 lets you send a letter the assistant drafted. Once you sign it, you’re its author.',
      'The Sign-off tab lists what AP-07 requires. Send stays locked until every item is done.',
      'You can always send it to your supervisor for a second review instead.',
    ],
    showMe: [
      { target: 'signoff-tab', label: 'The Sign-off tab', tab: 'signoff' },
      { target: 'checklist', label: 'The AP-07 checklist', tab: 'signoff' },
    ],
  },
  {
    id: 'w5', n: 5, title: 'Saving and audit trail',
    summary: 'Everything saves automatically and is logged with your name.',
    points: [
      'Every decision and letter edit saves to the request as you go. There’s no Save button to forget.',
      'Nothing reaches the requester until you press Send on the Sign-off tab.',
      'The audit trail records what the assistant suggested and what you decided. It’s kept with the request file.',
    ],
    showMe: [
      { target: 'save', label: 'The save status', tab: undefined },
      { target: 'audit-tab', label: 'The audit trail', tab: 'audit' },
    ],
  },
]
