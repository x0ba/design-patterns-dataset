export type Method = 'Venmo' | 'Cash App' | 'Zelle' | 'Cash pickup';
export type Category = 'Rent gap' | 'Utility shutoff' | 'Groceries' | 'Medication' | 'Transport to work';

export interface PriorGrant {
  date: string;
  amount: number;
  method: Method;
  handle: string;
}

export interface FundRequest {
  id: string;
  name: string;
  alias?: boolean;
  household: string;
  category: Category;
  requested: number;
  story: string;
  received: string;
  urgency: { label: string; level: 'critical' | 'soon' | 'normal'; detail?: string };
  method: Method;
  handle: string;
  handleNote?: { tone: 'warn' | 'ok' | 'info'; short: string; text: string };
  confirm?: { label: string; value: string };
  pickup?: string;
  prior: PriorGrant[];
  abeAgreed?: { upTo: number; at: string; note: string };
}

export type PayoutStatus = 'committed' | 'sent' | 'voided';

export interface Payout {
  id: string;
  requestId: string;
  name: string;
  category: Category;
  amount: number;
  method: Method;
  handle: string;
  status: PayoutStatus;
  committedBy: string;
  committedAt: Date;
  cosignedBy?: string;
  sentBy?: string;
  sentAt?: Date;
  voidedBy?: string;
  voidedAt?: Date;
  voidReason?: string;
  mine?: boolean;
}

export type ActivityKind = 'commit' | 'void' | 'send' | 'ask' | 'cosign' | 'withdraw' | 'decline' | 'reopen';

export interface Activity {
  id: string;
  at: Date;
  who: string;
  kind: ActivityKind;
  text: string;
  amount?: number;
  payoutId?: string;
}

export const POT = 4500;
export const QUARTER_CAP = 300;
export const COSIGN_OVER = 200;
export const ME = 'Dani';
export const PARTNER = 'Abe';
export const TREASURER = 'Lorraine';

// Wednesday, Nov 18 2026, 7:52 pm
export const BASE_NOW = new Date(2026, 10, 18, 19, 52);
export const NEXT_SEND = new Date(2026, 10, 19, 12, 0);
export const FOLLOWING_SEND = new Date(2026, 10, 23, 12, 0);

const d = (day: number, h: number, m: number) => new Date(2026, 10, day, h, m);

export const ABE_QUEUE = { count: 9, asked: 1615, committed: 0, lastActive: 'Abe was last active at 7:31 pm' };

export const REQUESTS: FundRequest[] = [
  {
    id: 'K-1131',
    name: 'Marisol',
    household: '4 people',
    category: 'Utility shutoff',
    requested: 285,
    story:
      'Electric shutoff notice for Sat Nov 21. Owes $412; utility will hold service if $285 is paid before then. Paying the rest from her next check.',
    received: 'Sun Nov 15',
    urgency: { label: 'Shutoff Sat Nov 21', level: 'critical', detail: 'Thursday’s send is the last one before the shutoff. Monday is too late.' },
    method: 'Zelle',
    handle: '(347) 555-0186',
    handleNote: { tone: 'info', short: 'From intake form', text: 'Phone number from her intake form, Nov 15. No earlier payouts to compare.' },
    confirm: { label: 'last 4 digits of the phone number', value: '0186' },
    prior: [],
    abeAgreed: { upTo: 285, at: 'Tue Nov 17, 9:40 pm', note: 'Agree on the full $285 if you fund it, shutoff is real, I saw the notice.' },
  },
  {
    id: 'K-1134',
    name: 'Henry O.',
    alias: true,
    household: '1 person',
    category: 'Medication',
    requested: 95,
    story:
      'Copay for blood pressure meds and a rescue inhaler. Pharmacy is holding the fill until Friday. No smartphone, prefers cash.',
    received: 'Mon Nov 16',
    urgency: { label: 'Fill held until Fri Nov 20', level: 'soon' },
    method: 'Cash pickup',
    handle: 'St. Brendan’s parish hall',
    pickup: 'Thu Nov 19 after 12:30 pm, or Sat Nov 21 10 am–noon. Henry will give his request number, K-1134.',
    prior: [],
  },
  {
    id: 'K-1135',
    name: 'Fatima',
    household: '3 people',
    category: 'Groceries',
    requested: 150,
    story: 'Newborn at home, partner’s hours cut. Formula and a week of groceries; formula runs out this weekend.',
    received: 'Mon Nov 16',
    urgency: { label: 'Formula out by Sat', level: 'soon' },
    method: 'Cash App',
    handle: '$FatimaNour',
    handleNote: { tone: 'info', short: 'From intake form', text: 'Cash App tag from her intake form, Nov 16. No earlier payouts to compare.' },
    confirm: { label: 'last 4 characters of the tag', value: 'nour' },
    prior: [],
  },
  {
    id: 'K-1138',
    name: 'Ms. Ada',
    alias: true,
    household: '1 person',
    category: 'Medication',
    requested: 180,
    story:
      'Diabetic test strips and lancets. New insurance doesn’t start until Jan 1. Strips run out around Nov 24.',
    received: 'Tue Nov 17',
    urgency: { label: 'Strips run out ~Nov 24', level: 'soon' },
    method: 'Cash pickup',
    handle: 'St. Brendan’s parish hall',
    pickup: 'Sat Nov 21 10 am–noon. Her neighbor Joyce may pick up for her; Joyce will give request number K-1138.',
    prior: [],
  },
  {
    id: 'K-1137',
    name: 'Luz',
    household: '2 people',
    category: 'Transport to work',
    requested: 60,
    story: 'Starts a warehouse job Mon Nov 23. Gas for the first two weeks; first paycheck lands Nov 27.',
    received: 'Tue Nov 17',
    urgency: { label: 'Starts job Mon Nov 23', level: 'soon' },
    method: 'Venmo',
    handle: '@luz-m-arroyo',
    handleNote: { tone: 'info', short: 'From intake form', text: 'Venmo username from her intake form, Nov 17. No earlier payouts to compare.' },
    confirm: { label: 'last 4 characters of the username', value: 'royo' },
    prior: [],
  },
  {
    id: 'K-1126',
    name: 'Thu Tran',
    household: '5 people',
    category: 'Groceries',
    requested: 120,
    story: 'SNAP reload delayed to Dec 3 after a recertification mix-up. Two weeks of groceries for five.',
    received: 'Fri Nov 13',
    urgency: { label: 'SNAP delayed to Dec 3', level: 'normal' },
    method: 'Venmo',
    handle: '@thu-tran-bk',
    handleNote: { tone: 'info', short: 'From intake form', text: 'Venmo username from intake form, Nov 13. No earlier payouts to compare.' },
    confirm: { label: 'last 4 characters of the username', value: 'n-bk' },
    prior: [],
  },
  {
    id: 'K-1128',
    name: 'Keisha',
    household: '3 people',
    category: 'Rent gap',
    requested: 400,
    story:
      'Short $640 on December rent after her hours were cut. Her sister is covering $240. Late fee starts Dec 5.',
    received: 'Sat Nov 14',
    urgency: { label: 'Rent due Dec 1', level: 'normal' },
    method: 'Cash App',
    handle: '$KeishaWilliams88',
    handleNote: {
      tone: 'warn',
      short: 'Handle changed Nov 16',
      text:
        'Not the handle on her intake form ($KeishaW) or her October payout. Keisha texted the fund line Nov 16 that her old account was locked. Abe called her back Nov 17 and confirmed $KeishaWilliams88.',
    },
    confirm: { label: 'last 4 characters of the tag', value: 'ms88' },
    prior: [{ date: 'Oct 8', amount: 150, method: 'Cash App', handle: '$KeishaW' }],
  },
  {
    id: 'K-1122',
    name: 'J.B.',
    alias: true,
    household: '2 people',
    category: 'Rent gap',
    requested: 350,
    story: 'Between jobs, unemployment claim still pending. Short on December rent.',
    received: 'Thu Nov 12',
    urgency: { label: 'Rent due Dec 1', level: 'normal' },
    method: 'Zelle',
    handle: 'jb.lindqvist@fastmail.com',
    handleNote: { tone: 'ok', short: 'Same as October', text: 'Matches the Zelle email used for the October 22 payout, which arrived.' },
    confirm: { label: 'last 4 characters before the @', value: 'vist' },
    prior: [{ date: 'Oct 22', amount: 200, method: 'Zelle', handle: 'jb.lindqvist@fastmail.com' }],
  },
  {
    id: 'K-1129',
    name: 'Dwayne',
    household: '2 people',
    category: 'Utility shutoff',
    requested: 210,
    story: 'Final notice on the gas bill, $210 past due. No shutoff date given yet. Bill due Dec 2.',
    received: 'Sat Nov 14',
    urgency: { label: 'Final notice · due Dec 2', level: 'normal' },
    method: 'Venmo',
    handle: '@Dwayne-Pratt-7',
    handleNote: { tone: 'info', short: 'From intake form', text: 'Venmo username from intake form, Nov 14. No earlier payouts to compare.' },
    confirm: { label: 'last 4 characters of the username', value: 'tt-7' },
    prior: [],
  },
];

export const INITIAL_PAYOUTS: Payout[] = [
  { id: 'P-1101', requestId: 'K-1102', name: 'Gloria', category: 'Rent gap', amount: 250, method: 'Zelle', handle: '(917) 555-0122', status: 'sent', committedBy: 'Priya', cosignedBy: 'Tomás', committedAt: d(3, 20, 10), sentBy: TREASURER, sentAt: d(5, 12, 6) },
  { id: 'P-1102', requestId: 'K-1104', name: 'Sam', category: 'Groceries', amount: 110, method: 'Cash App', handle: '$SamOkoro', status: 'sent', committedBy: 'Tomás', committedAt: d(4, 19, 45), sentBy: TREASURER, sentAt: d(5, 12, 9) },
  { id: 'P-1103', requestId: 'K-1106', name: 'Javier', category: 'Utility shutoff', amount: 150, method: 'Venmo', handle: '@jvaldez', status: 'voided', committedBy: 'Grace', committedAt: d(10, 20, 20), voidedBy: 'Grace', voidedAt: d(11, 18, 45), voidReason: 'Wrong handle. @jvaldez is someone else; Javier’s is @j-valdez.' },
  { id: 'P-1104', requestId: 'K-1106', name: 'Javier', category: 'Utility shutoff', amount: 150, method: 'Venmo', handle: '@j-valdez', status: 'sent', committedBy: 'Grace', committedAt: d(11, 18, 52), sentBy: TREASURER, sentAt: d(12, 12, 4) },
  { id: 'P-1105', requestId: 'K-1109', name: 'Dolores', category: 'Medication', amount: 180, method: 'Cash pickup', handle: 'St. Brendan’s parish hall', status: 'sent', committedBy: 'Marcus', committedAt: d(11, 20, 2), sentBy: TREASURER, sentAt: d(12, 12, 41) },
  { id: 'P-1106', requestId: 'K-1111', name: 'Kwame', category: 'Rent gap', amount: 300, method: 'Zelle', handle: '(718) 555-0147', status: 'sent', committedBy: 'Marcus', cosignedBy: 'Grace', committedAt: d(14, 11, 30), sentBy: TREASURER, sentAt: d(16, 12, 3) },
  { id: 'P-1107', requestId: 'K-1113', name: 'Inés', category: 'Transport to work', amount: 200, method: 'Venmo', handle: '@ines-castro-nyc', status: 'sent', committedBy: 'Grace', committedAt: d(15, 16, 12), sentBy: TREASURER, sentAt: d(16, 12, 5) },
  { id: 'P-1108', requestId: 'K-1117', name: 'Renée', category: 'Rent gap', amount: 300, method: 'Zelle', handle: '(646) 555-0174', status: 'committed', committedBy: 'Abe', cosignedBy: 'Dani', committedAt: d(16, 20, 14) },
  { id: 'P-1109', requestId: 'K-1119', name: 'Omar', category: 'Groceries', amount: 150, method: 'Cash App', handle: '$OmarHadid', status: 'committed', committedBy: 'Dani', committedAt: d(16, 20, 31), mine: true },
  { id: 'P-1110', requestId: 'K-1120', name: 'Bettina', category: 'Utility shutoff', amount: 220, method: 'Venmo', handle: '@bettina-cole', status: 'committed', committedBy: 'Abe', cosignedBy: 'Dani', committedAt: d(16, 20, 40) },
  { id: 'P-1111', requestId: 'K-1121', name: 'Curtis', category: 'Transport to work', amount: 200, method: 'Venmo', handle: '@curtis-l-james', status: 'committed', committedBy: 'Dani', committedAt: d(16, 20, 52), mine: true },
  { id: 'P-1112', requestId: 'K-1123', name: 'Paulette', category: 'Medication', amount: 300, method: 'Cash pickup', handle: 'St. Brendan’s parish hall', status: 'committed', committedBy: 'Abe', cosignedBy: 'Dani', committedAt: d(17, 19, 5) },
];

let actSeq = 0;
const act = (at: Date, who: string, kind: ActivityKind, text: string, amount?: number, payoutId?: string): Activity => ({
  id: `a${++actSeq}`,
  at,
  who,
  kind,
  text,
  amount,
  payoutId,
});

export const INITIAL_ACTIVITY: Activity[] = [
  act(d(3, 20, 10), 'Priya', 'commit', 'committed $250 to Gloria (Zelle), co-signed by Tomás', 250, 'P-1101'),
  act(d(4, 19, 45), 'Tomás', 'commit', 'committed $110 to Sam (Cash App)', 110, 'P-1102'),
  act(d(5, 12, 6), TREASURER, 'send', 'sent $250 to Gloria', 250, 'P-1101'),
  act(d(5, 12, 9), TREASURER, 'send', 'sent $110 to Sam', 110, 'P-1102'),
  act(d(10, 20, 20), 'Grace', 'commit', 'committed $150 to Javier (Venmo @jvaldez)', 150, 'P-1103'),
  act(d(11, 18, 45), 'Grace', 'void', 'voided $150 to Javier: wrong handle. @jvaldez is someone else. $150 returned to the pot.', 150, 'P-1103'),
  act(d(11, 18, 52), 'Grace', 'commit', 'committed $150 to Javier (Venmo @j-valdez)', 150, 'P-1104'),
  act(d(11, 20, 2), 'Marcus', 'commit', 'committed $180 to Dolores (cash pickup)', 180, 'P-1105'),
  act(d(12, 12, 4), TREASURER, 'send', 'sent $150 to Javier', 150, 'P-1104'),
  act(d(12, 12, 41), TREASURER, 'send', 'handed $180 cash to Dolores at St. Brendan’s', 180, 'P-1105'),
  act(d(14, 11, 30), 'Marcus', 'commit', 'committed $300 to Kwame (Zelle), co-signed by Grace', 300, 'P-1106'),
  act(d(15, 16, 12), 'Grace', 'commit', 'committed $200 to Inés (Venmo)', 200, 'P-1107'),
  act(d(16, 12, 3), TREASURER, 'send', 'sent $300 to Kwame', 300, 'P-1106'),
  act(d(16, 12, 5), TREASURER, 'send', 'sent $200 to Inés', 200, 'P-1107'),
  act(d(16, 20, 14), 'Abe', 'commit', 'committed $300 to Renée (Zelle), co-signed by Dani', 300, 'P-1108'),
  act(d(16, 20, 31), 'Dani', 'commit', 'committed $150 to Omar (Cash App)', 150, 'P-1109'),
  act(d(16, 20, 40), 'Abe', 'commit', 'committed $220 to Bettina (Venmo), co-signed by Dani', 220, 'P-1110'),
  act(d(16, 20, 52), 'Dani', 'commit', 'committed $200 to Curtis (Venmo)', 200, 'P-1111'),
  act(d(17, 19, 5), 'Abe', 'commit', 'committed $300 to Paulette (cash pickup), co-signed by Dani', 300, 'P-1112'),
  act(d(17, 21, 40), 'Abe', 'cosign', 'agreed to co-sign up to $285 for Marisol (K-1131)'),
];
