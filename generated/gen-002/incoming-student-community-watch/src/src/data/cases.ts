import { t } from './community';

/* ---------------- Wellbeing concern ---------------- */

export const WELLBEING = {
  id: 'wb-1047',
  groupId: 'hartwell',
  author: {
    name: 'Taylor Okonkwo',
    handle: 'taylor.okonkwo',
    record: 'Matched · admit #A30-118427',
    housing: 'Hartwell Hall · room assignment Aug 18',
    orientation: 'Session F · Aug 21',
    groups: ['Hartwell Hall 2030', 'First-Gen 2030', 'Undeclared / Exploring'],
    joined: 'May 3',
    lastActive: t(11, 36),
  },
  postedAt: t(10, 47),
  reportedAt: t(11, 2),
  body:
    "honestly does anyone else feel like they're faking being excited? everyone in here is posting dorm hauls and i haven't really left my room in like a week. my parents keep fighting about whether we can even pay for this and it's my fault for picking here. i'm so tired. not sure there's a point in me showing up on the 25th",
  views: 212,
  replies: [
    { name: 'Maya Lindgren', at: t(10, 52), body: "you're not alone fr, i'm lowkey terrified too. we can get lunch move-in week if you want 🫶" },
    { name: 'Ben Ashworth', at: t(11, 5), body: "dm me if you want to talk, i'm first gen too and the money stuff is so stressful. financial aid office actually helped my sister a lot" },
    { name: 'Kezia Morales', at: t(11, 40), body: 'hey are you okay? that last line kinda worried me' },
  ],
  report: {
    by: 'Maya Lindgren',
    reason: 'Someone may be in distress',
    note: "the last sentence scared me. i don't know them irl but can someone from staff check in?",
  },
  history: [
    { at: 'Jul 28', group: 'Hartwell Hall 2030', body: 'anyone else on 3rd floor?? pls be my friend lol' },
    { at: 'Aug 9', group: 'Orientation Q&A', body: 'how late can you defer enrollment to spring? asking for a friend' },
  ],
  timeline: [
    { at: t(10, 47), text: 'Posted in Hartwell Hall 2030' },
    { at: t(10, 49), text: 'Auto-detection: distress language (medium confidence) — added to wellbeing queue' },
    { at: t(11, 2), text: 'Reported by a student · “Someone may be in distress”' },
    { at: t(11, 2), text: 'Push notification sent to you — unread (you were in Session C; 1 of 8 pings during the session)' },
    { at: t(11, 36), text: 'Author last active (viewed replies)' },
    { at: t(11, 40), text: 'Another student replied expressing concern' },
  ],
};

/* ---------------- Housing scam cluster ---------------- */

export interface ScamAccount {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  posts: number;
  dms: number;
  dmRecipients: number;
}

export const SCAM_ACCOUNTS: ScamAccount[] = [
  { id: 'sa1', name: 'Ashley Kim', email: 'a••••••41@gmail.com', createdAt: t(9, 12), posts: 3, dms: 9, dmRecipients: 8 },
  { id: 'sa2', name: 'Brandon Lewis', email: 'b••••••rm@outlook.com', createdAt: t(9, 16), posts: 2, dms: 7, dmRecipients: 6 },
  { id: 'sa3', name: 'Jessica Tran', email: 'j••••••07@gmail.com', createdAt: t(9, 21), posts: 3, dms: 8, dmRecipients: 7 },
  { id: 'sa4', name: 'Kevin Moore', email: 'k••••••22@gmail.com', createdAt: t(9, 27), posts: 2, dms: 5, dmRecipients: 4 },
  { id: 'sa5', name: 'Nicole Harris', email: 'n••••••4u@yahoo.com', createdAt: t(9, 33), posts: 2, dms: 6, dmRecipients: 4 },
  { id: 'sa6', name: 'Ryan Chen', email: 'r••••••90@gmail.com', createdAt: t(9, 38), posts: 1, dms: 3, dmRecipients: 2 },
];

export type ScamMsgState = 'held' | 'visible' | 'dm';
export interface ScamMessage {
  id: string;
  accountId: string;
  groupId: string | null; // null for DM
  at: number;
  state: ScamMsgState;
  reported: boolean;
  body: string;
}

export const SCAM_MESSAGES: ScamMessage[] = [
  { id: 'sm1', accountId: 'sa1', groupId: 'offcampus', at: t(9, 41), state: 'held', reported: false, body: 'Hi everyone! Private furnished room 6 min walk to campus, $650/mo utilities included 🙂 Leaving for study abroad so it’s free from Aug 20. $300 Zelle deposit holds it, first come first serve!' },
  { id: 'sm2', accountId: 'sa1', groupId: 'roommates', at: t(9, 44), state: 'held', reported: false, body: 'Anyone still need housing?? Furnished room 6 min walk, $650 all utilities incl. Study abroad sublet. Zelle deposit to hold, DM me 🙂' },
  { id: 'sm3', accountId: 'sa2', groupId: 'hartwell', at: t(9, 52), state: 'visible', reported: true, body: 'If anyone didn’t get housing I have a room 5 min from campus for $600/mo, way cheaper than the dorms. DM me before it’s gone!' },
  { id: 'sm4', accountId: 'sa3', groupId: 'intl-eastasia', at: t(9, 58), state: 'held', reported: false, body: 'For international students arriving early: furnished room near campus, $620/mo, I can send video tour. Deposit $300 by Zelle or Wise to reserve.' },
  { id: 'sm5', accountId: 'sa2', groupId: 'commuters', at: t(10, 4), state: 'held', reported: false, body: 'Tired of commuting? Room 6 min walk from campus $600, utilities incl. I’m abroad this semester so can’t show in person. Zelle deposit holds it.' },
  { id: 'sm6', accountId: 'sa3', groupId: 'offcampus', at: t(10, 11), state: 'held', reported: false, body: 'Cheap room near campus!! $620/mo furnished, walking distance. Hold with $300 Zelle deposit, I’m studying abroad so I’ll mail the keys.' },
  { id: 'sm7', accountId: 'sa4', groupId: 'transfer', at: t(10, 18), state: 'held', reported: false, body: 'Room for rent 6 min walk to campus, $650 utilities incl, available Aug 20. Need $300 deposit via Zelle to hold, will send lease after.' },
  { id: 'sm8', accountId: 'sa1', groupId: 'buysell', at: t(10, 26), state: 'held', reported: false, body: 'Subletting my room near campus $650/mo furnished. Zelle deposit $300 to hold, keys mailed before move-in.' },
  { id: 'sm9', accountId: 'sa4', groupId: 'general', at: t(10, 33), state: 'visible', reported: true, body: 'Still looking for housing? I have one room left near campus, super cheap, furnished. Message me for pics + details 🙂' },
  { id: 'sm10', accountId: 'sa5', groupId: 'roommates', at: t(10, 37), state: 'held', reported: false, body: 'Female-only furnished room 6 min walk from campus, $600/mo. I’m abroad so deposit by Zelle ($300) and I’ll mail keys!' },
  { id: 'sm11', accountId: 'sa5', groupId: 'juniper', at: t(10, 52), state: 'held', reported: false, body: 'Juniper waitlist people — I have a room 6 min walk from campus $600. Zelle deposit holds it. DM!' },
  { id: 'sm12', accountId: 'sa3', groupId: 'firstgen', at: t(11, 8), state: 'held', reported: false, body: 'Affordable room near campus $620, utilities incl, perfect if dorms are too expensive. Small Zelle deposit to hold.' },
  { id: 'sm13', accountId: 'sa6', groupId: 'offcampus', at: t(11, 24), state: 'held', reported: false, body: 'Room available 6 min walk, $650/mo all incl, study abroad sublet. $300 Zelle deposit to reserve, lease sent after.' },
  { id: 'sm14', accountId: 'sa2', groupId: null, at: t(9, 58), state: 'dm', reported: true, body: 'hey! saw you’re in hartwell — if housing falls through i have a room 5 min away. $300 zelle to 555-0193 and it’s yours, can send the lease after' },
  { id: 'sm15', accountId: 'sa4', groupId: null, at: t(10, 21), state: 'dm', reported: true, body: 'Hi, still need a room? I can hold it for you today only with $300 by Zelle to 555-0193. I’m abroad so I’ll mail keys.' },
];

export const SCAM_SIGNALS = [
  { label: 'Accounts created 09:12–09:38', detail: '6 accounts, none with an admissions record, all signed up with personal email' },
  { label: 'Shared wording', detail: '“6 min walk”, “Zelle deposit”, “study abroad”, “mail the keys” in 13 of 15 messages' },
  { label: 'Same payment handle', detail: 'Two DMs ask for Zelle to 555-0193' },
  { label: 'Targeting', detail: 'Housing-related and lower-income-signal groups: Off-campus, Roommates, First-Gen, Commuters, Transfer-adjacent' },
];

export const LAST_AUGUST = 'Aug 10–16, 2025: 31 fake sublet posts from 9 accounts; 3 students sent deposits totaling $1,850 before removal.';

export const SCAM_HIGHLIGHT = /(zelle|deposit|\$\d{3}|6 min walk|study abroad|abroad|mail(?:ed)? (?:the )?keys|wise)/gi;

/* ---------------- Personal info exposure ---------------- */

export const PII = {
  id: 'pii-roommates',
  groupId: 'roommates',
  thread: 'Hartwell + Ostrander people — drop your major + vibe and find your roommate 👇',
  threadBy: 'Grace Whitfield',
  threadComments: 142,
  poster: { name: 'Tyler Brandt', record: 'Matched · Ostrander Hall', priorWarnings: 0 },
  comments: [
    {
      id: 'c1',
      at: t(10, 58),
      views: 233,
      intro: 'for anyone still looking, these people from the hartwell groupchat said they need roommates, just text them:',
      entries: [
        { name: 'Maya L.', phone: '(555) 014-0143' },
        { name: 'Andre P.', phone: '(555) 014-0178' },
        { name: 'Sam K.', phone: '(555) 014-0112' },
        { name: 'Riya D.', phone: '(555) 014-0191' },
      ],
    },
    {
      id: 'c2',
      at: t(11, 20),
      views: 148,
      intro: 'more from the gc 👇 they’re all chill',
      entries: [
        { name: 'Chris W.', phone: '(555) 014-0166' },
        { name: 'Elena V.', phone: '(555) 014-0127' },
        { name: 'Jordan T.', phone: '(555) 014-0150' },
      ],
    },
  ],
  reports: [
    { at: t(11, 7), by: 'Riya Desai', note: 'that is my number and i never said it could be posted here. please take it down' },
    { at: t(11, 31), by: 'Chris Wu', note: 'my number is in here, i’m already getting texts from people i don’t know' },
  ],
};

/* ---------------- Held posts (non-cluster) ---------------- */

export interface HeldPost {
  id: string;
  groupId: string;
  author: string;
  verified: boolean;
  at: number;
  reason: string;
  body: string;
  hint?: { tone: 'ok' | 'warn' | 'care'; text: string };
}

export const HELD_POSTS: HeldPost[] = [
  { id: 'h1', groupId: 'buysell', author: 'Marcus Feld', verified: true, at: t(9, 6), reason: 'Payment terms', body: 'Selling Stewart Calculus 9th ed, barely used, $45. Venmo or cash at move-in.', hint: { tone: 'ok', text: 'Verified student, normal textbook resale' } },
  { id: 'h2', groupId: 'intl-seasia', author: 'Bea Santos', verified: true, at: t(9, 14), reason: 'External link', body: 'Filipino Student Association interest list for incoming folks! forms.gle/fsa-2030-interest', hint: { tone: 'ok', text: 'Recognized student org form' } },
  { id: 'h3', groupId: 'marisol', author: 'Leo Brennan', verified: true, at: t(9, 25), reason: 'Payment terms', body: 'Doing a group order for mini fridges so we get the bulk price — $35 each, Venmo me by Sunday and I’ll have them delivered to Marisol.', hint: { tone: 'warn', text: 'Collecting money from strangers — leader should confirm the vendor or ask to use the Housing rental program' } },
  { id: 'h4', groupId: 'hartwell', author: 'Ava Lindholm', verified: true, at: t(9, 37), reason: 'External link', body: 'my whole dorm list w links bc people keep asking 😅 amzn.to/3xHartwellList', hint: { tone: 'ok', text: 'Shortened shopping link — fine per link policy' } },
  { id: 'h5', groupId: 'general', author: 'Devon Clarke', verified: true, at: t(9, 49), reason: 'Payment terms', body: 'Selling 2 tickets to the Welcome Week concert, $30 each, CashApp only.', hint: { tone: 'warn', text: 'Welcome Week concert is free with student ID — tickets aren’t sold' } },
  { id: 'h6', groupId: 'm-cs', author: 'Hugo Martins', verified: true, at: t(10, 2), reason: 'External link', body: 'Unofficial CS 2030 Discord: discord.gg/cs2030-arrivals — mods are all admitted students', hint: { tone: 'ok', text: 'Unofficial chat links allowed with disclaimer' } },
  { id: 'h7', groupId: 'parking', author: 'Nina Petrova', verified: true, at: t(10, 9), reason: 'Payment terms', body: 'Selling my fall parking permit (lot P7) for $200, I decided not to bring my car.', hint: { tone: 'warn', text: 'Parking permits are non-transferable — remove and point to Transportation refund' } },
  { id: 'h8', groupId: 'firstgen', author: 'Jada Freeman', verified: true, at: t(10, 31), reason: 'External link + payment terms', body: 'this is embarrassing but my family can’t cover the move-in costs and the housing deposit. i made a gofundme if anyone can share: gofund.me/jada-movein', hint: { tone: 'care', text: 'Possible financial hardship — consider a Basic Needs / Financial Aid referral before deciding' } },
  { id: 'h9', groupId: 'm-chem', author: 'Omar Haddadi', verified: true, at: t(10, 44), reason: 'Payment terms', body: 'Tutoring for the chem placement exam, $25/hr, Zelle or Venmo. I got a 5 on AP Chem.', hint: { tone: 'ok', text: 'Peer tutoring by a verified admit' } },
  { id: 'h10', groupId: 'kessler', author: 'Sophie Laurent', verified: true, at: t(11, 0), reason: 'External link', body: 'Kessler 2030 instagram is up!! instagram.com/kessler2030 follow so we can find each other', hint: { tone: 'ok', text: 'Student-run social account' } },
  { id: 'h11', groupId: 'rides', author: 'Mateo Ruiz', verified: true, at: t(11, 27), reason: 'Payment terms', body: 'Driving down from Sacramento Aug 23, 2 seats left, $40 gas money each via Venmo.', hint: { tone: 'ok', text: 'Normal rideshare split' } },
  { id: 'h12', groupId: 'orientation', author: 'Wen Zhao', verified: true, at: t(11, 52), reason: 'External link', body: 'made a shared google calendar with all the orientation session times so it’s easier to see: calendar.google.com/…/orientation2030', hint: { tone: 'warn', text: 'Unofficial schedule — check it matches the published times before approving' } },
];

/* ---------------- Unanswered questions ---------------- */

export type Topic = 'Meal plans' | 'Parking' | 'Move-in' | 'Other';
export interface Question {
  id: string;
  groupId: string;
  author: string;
  at: number; // posted
  topic: Topic;
  body: string;
  views: number;
}

export const QUESTIONS: Question[] = [
  { id: 'q1', groupId: 'dining', author: 'Elise Moreau', at: t(4, 52), topic: 'Meal plans', body: 'Can I switch from the 14-swipe plan to the dining-dollars-only plan after move-in, or is it locked for fall?', views: 118 },
  { id: 'q2', groupId: 'marisol', author: 'Kai Yamamoto', at: t(5, 31), topic: 'Meal plans', body: 'Do unused meal swipes roll over week to week or do they reset Sunday?', views: 64 },
  { id: 'q3', groupId: 'access', author: 'Rosa Jimenez', at: t(3, 18), topic: 'Meal plans', body: 'I have celiac — who do I talk to about dining accommodations before I have to pick a plan on Aug 20?', views: 41 },
  { id: 'q4', groupId: 'linden', author: 'Theo Bianchi', at: t(2, 40), topic: 'Meal plans', body: 'Linden Court has kitchens — is a meal plan still required for us?', views: 57 },
  { id: 'q5', groupId: 'dining', author: 'Grace Adeyemi', at: t(1, 5), topic: 'Meal plans', body: 'Can my parents pay the meal plan from our 529 or does it have to go on the student account?', views: 39 },
  { id: 'q6', groupId: 'parking', author: 'Lucas Becker', at: t(5, 2), topic: 'Parking', body: 'Are first-years living on campus even allowed to buy a parking permit?', views: 203 },
  { id: 'q7', groupId: 'commuters', author: 'Aisha Rahman', at: t(4, 15), topic: 'Parking', body: 'When does the commuter permit sale open? The transportation page still says “summer”.', views: 88 },
  { id: 'q8', groupId: 'ostrander', author: 'Diego Navarro', at: t(3, 47), topic: 'Parking', body: 'Where do we park on move-in day if our slot is 8am? Is there unloading right by Ostrander?', views: 96 },
  { id: 'q9', groupId: 'outofstate', author: 'Megan O’Neill', at: t(0, 34), topic: 'Parking', body: 'Is there overnight parking for families who drive in for move-in weekend?', views: 72 },
  { id: 'q10', groupId: 'orientation', author: 'Samir Patel', at: t(5, 44), topic: 'Move-in', body: 'When does the email with our move-in time slot come out?', views: 311 },
  { id: 'q11', groupId: 'intl-europe', author: 'Lina Johansson', at: t(2, 2), topic: 'Move-in', body: 'Can I ship boxes to the hall before I land, and if so what address do I use?', views: 33 },
  { id: 'q12', groupId: 'juniper', author: 'Chloe Tan', at: t(4, 58), topic: 'Move-in', body: 'Are mini fridges allowed in Juniper or is there already one in the room?', views: 49 },
  { id: 'q13', groupId: 'general', author: 'Andrés Villalobos', at: t(3, 9), topic: 'Other', body: 'Where do we get our student ID photo taken — at orientation or before?', views: 144 },
  { id: 'q14', groupId: 'honors', author: 'Priyanka Iyer', at: t(5, 20), topic: 'Other', body: 'Does attending orientation count toward the Honors first-year seminar requirement?', views: 27 },
];

/* ---------------- Unverified accounts (non-cluster) ---------------- */

export interface UnverifiedAccount {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  joinedGroups: string[];
  activity: string;
  assessment: { tone: 'ok' | 'warn' | 'bad'; text: string };
  suggested: 'verify' | 'redirect' | 'suspend';
}

export const UNVERIFIED: UnverifiedAccount[] = [
  { id: 'u1', name: 'Linda Okafor-Hayes', email: 'l••••••es@gmail.com', createdAt: t(8, 5), joinedGroups: ['Class of 2030 General'], activity: '1 post: “Hi! I’m a mom of an incoming Bayview student, is this the place to ask about move-in?”', assessment: { tone: 'ok', text: 'Parent — belongs in the Families community, not the student space' }, suggested: 'redirect' },
  { id: 'u2', name: 'Julian Morales', email: 'j••••••30@icloud.com', createdAt: t(8, 41), joinedGroups: ['Commuters 2030', 'Biology majors'], activity: '2 comments, no flags', assessment: { tone: 'ok', text: 'Name + birthdate match confirmed admit Julian Morales; signed up with personal email' }, suggested: 'verify' },
  { id: 'u3', name: 'Campus Housing Help', email: 'c••••••lp@gmail.com', createdAt: t(11, 50), joinedGroups: ['Off-campus Housing', 'Roommate Search 2030'], activity: 'No posts yet · profile says “Official housing support, DM for placements”', assessment: { tone: 'bad', text: 'Impersonates university housing staff; joined the same groups as the scam cluster 12 min ago' }, suggested: 'suspend' },
];

/* ---------------- Seed activity log ---------------- */

export interface LogEntry {
  id: string;
  at: number;
  who: string;
  text: string;
  kind?: 'me' | 'leader' | 'system';
}

export const SEED_LOG: LogEntry[] = [
  { id: 's1', at: t(9, 4), who: 'Camila Ortiz', text: 'Answered 6 questions in Orientation Q&A', kind: 'leader' },
  { id: 's2', at: t(9, 22), who: 'Aaliyah Brooks', text: 'Approved 9 held posts in Buy/Sell & Textbooks', kind: 'leader' },
  { id: 's3', at: t(9, 40), who: 'System', text: 'Burst detected: 6 new accounts without admissions match in 26 min', kind: 'system' },
  { id: 's4', at: t(10, 12), who: 'Mei-Ling Chou', text: 'Removed a duplicate roommate post in Marisol Towers 2030', kind: 'leader' },
  { id: 's5', at: t(10, 49), who: 'System', text: 'Distress language detected in Hartwell Hall 2030 — sent to staff wellbeing queue', kind: 'system' },
  { id: 's6', at: t(11, 0), who: 'System', text: 'Digest sent to you (2-hour digest, 41 items)', kind: 'system' },
  { id: 's7', at: t(11, 18), who: 'Marcus Oyelaran', text: 'Pinned move-in parking FAQ in Commuters 2030', kind: 'leader' },
  { id: 's8', at: t(11, 46), who: 'Sofia Delgado-Reyes', text: 'Answered visa-timing question thread in International · Latin America & Caribbean', kind: 'leader' },
  { id: 's9', at: t(12, 9), who: 'Aaliyah Brooks', text: 'Flagged “Campus Housing Help” profile to staff queue', kind: 'leader' },
];

export const SCAM_GROUP_IDS = [...new Set(SCAM_MESSAGES.filter((m) => m.groupId).map((m) => m.groupId as string))];
export const SCAM_DM_RECIPIENTS = SCAM_ACCOUNTS.reduce((a, x) => a + x.dmRecipients, 0);
export const QUESTION_VIEWS = QUESTIONS.reduce((a, q) => a + q.views, 0);
