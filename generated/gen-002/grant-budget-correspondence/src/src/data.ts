// Mock data for Ledgerline — Larkin Cove Marine Station, Monday Nov 16, 2026, 9:38 AM PT.
// Dates are naive local strings ("YYYY-MM-DDTHH:mm") so rendering never shifts with browser timezone.

export const NOW = '2026-11-16T09:38';
export const DUE = '2026-11-20T17:00';

export type PersonId =
  | 'teodora'
  | 'greg'
  | 'amaral'
  | 'dana'
  | 'wes'
  | 'mateo'
  | 'rosa'
  | 'lindqvist'
  | 'okafor'
  | 'priscilla';

export interface Person {
  id: PersonId;
  name: string;
  short: string;
  role: string;
  org: string;
  email: string;
  tone: string; // avatar color
}

export const people: Record<PersonId, Person> = {
  teodora: {
    id: 'teodora',
    name: 'Teodora Ilic',
    short: 'Teodora',
    role: 'Lab & Finance Manager',
    org: 'Larkin Cove Marine Station',
    email: 't.ilic@larkincove.pcu.edu',
    tone: '#1F5C57',
  },
  greg: {
    id: 'greg',
    name: 'Greg Tanaka',
    short: 'Greg',
    role: 'Senior Grants Accountant',
    org: 'Sponsored Projects Accounting',
    email: 'gtanaka@spa.pcu.edu',
    tone: '#5B4B8A',
  },
  amaral: {
    id: 'amaral',
    name: 'Dr. Beatriz Amaral',
    short: 'Dr. Amaral',
    role: 'PI, OCE-2291',
    org: 'Larkin Cove Marine Station',
    email: 'b.amaral@sealark.sat.pcu.edu',
    tone: '#2F6E8E',
  },
  dana: {
    id: 'dana',
    name: 'Dana Whitcomb',
    short: 'Dana',
    role: 'Accounts Receivable',
    org: 'Pacific Marine Fuel',
    email: 'ar@pacmarinefuel-sb.com',
    tone: '#8A5A2B',
  },
  wes: {
    id: 'wes',
    name: 'Wes Haldane',
    short: 'Wes',
    role: 'Boat Operations Coordinator',
    org: 'Larkin Cove Marine Station',
    email: 'w.haldane@larkincove.pcu.edu',
    tone: '#4F6B3A',
  },
  mateo: {
    id: 'mateo',
    name: 'Mateo Fuentes',
    short: 'Mateo',
    role: 'PhD student, Amaral lab',
    org: 'Larkin Cove Marine Station',
    email: 'mfuentes@pcu.edu',
    tone: '#9A4C6A',
  },
  rosa: {
    id: 'rosa',
    name: 'Rosa Delgado',
    short: 'Rosa',
    role: 'Customer Service',
    org: 'Tidewater Scientific',
    email: 'returns@tidewatersci.com',
    tone: '#6E6A2A',
  },
  lindqvist: {
    id: 'lindqvist',
    name: 'Dr. Henrik Lindqvist',
    short: 'Dr. Lindqvist',
    role: 'PI, OCE-2307',
    org: 'Larkin Cove Marine Station',
    email: 'h.lindqvist@larkincove.pcu.edu',
    tone: '#3E5C7A',
  },
  okafor: {
    id: 'okafor',
    name: 'Dr. Chidi Okafor',
    short: 'Dr. Okafor',
    role: 'PI, Sea Grant R/OA-31',
    org: 'Larkin Cove Marine Station',
    email: 'c.okafor@larkincove.pcu.edu',
    tone: '#7A3E3E',
  },
  priscilla: {
    id: 'priscilla',
    name: 'Priscilla Moreno',
    short: 'Priscilla',
    role: 'Grants Officer',
    org: 'Sea Grant Program Office',
    email: 'pmoreno@seagrant-pco.org',
    tone: '#5A6470',
  },
};

export interface BudgetLine {
  name: string;
  code: string;
  budget: number;
  spent: number;
}

export interface Grant {
  id: string;
  sponsor: string;
  number: string;
  title: string;
  pi: PersonId;
  total: number;
  remaining: number;
  period: string;
  yearLabel: string;
  yearFraction: number; // elapsed share of project period
  lines?: BudgetLine[];
}

export const grants: Record<string, Grant> = {
  oce2291: {
    id: 'oce2291',
    sponsor: 'NSF',
    number: 'OCE-2291',
    title: 'Kelp forest recovery after marine heatwaves',
    pi: 'amaral',
    total: 1_200_000,
    remaining: 318_400,
    period: 'Jan 1, 2025 – Dec 31, 2027',
    yearLabel: 'Year 2 of 3',
    yearFraction: 0.62,
    lines: [
      { name: 'Salaries & fringe', code: '51xxx', budget: 612_000, spent: 461_300 },
      { name: 'Vessel operations', code: '54620', budget: 186_000, spent: 141_950 },
      { name: 'Field supplies', code: '53110', budget: 64_000, spent: 47_710 },
      { name: 'Travel', code: '56010', budget: 38_000, spent: 24_180 },
      { name: 'Graduate student support', code: '58200', budget: 120_000, spent: 88_000 },
      { name: 'Indirect costs (F&A)', code: '59900', budget: 180_000, spent: 118_460 },
    ],
  },
  oce2307: {
    id: 'oce2307',
    sponsor: 'NSF',
    number: 'OCE-2307',
    title: 'Sediment carbon burial in eelgrass meadows',
    pi: 'lindqvist',
    total: 684_000,
    remaining: 402_115,
    period: 'Sep 1, 2025 – Aug 31, 2028',
    yearLabel: 'Year 2 of 3',
    yearFraction: 0.39,
  },
  seagrant: {
    id: 'seagrant',
    sponsor: 'NOAA Sea Grant',
    number: 'R/OA-31',
    title: 'Red abalone larval settlement under low pH',
    pi: 'okafor',
    total: 412_500,
    remaining: 146_870,
    period: 'Feb 1, 2025 – Jan 31, 2027',
    yearLabel: 'Year 2 of 2',
    yearFraction: 0.88,
  },
};

export interface Doc {
  id: string;
  name: string;
  kind: 'pdf';
  sizeKB: number;
  source: string;
  summary: string;
}

export const docs: Record<string, Doc> = {
  cruise: {
    id: 'cruise',
    name: 'SL-26-14_Cruise_Plan_Amaral.pdf',
    kind: 'pdf',
    sizeKB: 1840,
    source: 'Dr. Amaral · Sep 22',
    summary: 'Cruise plan, R/V Sea Lark, Oct 7–11',
  },
  vlog: {
    id: 'vlog',
    name: 'Sea_Lark_Vessel_Log_Oct7-11.pdf',
    kind: 'pdf',
    sizeKB: 342,
    source: 'Wes Haldane, Boat Ops · Oct 31',
    summary: 'Vessel log excerpt, Oct 7–11',
  },
  invoice: {
    id: 'invoice',
    name: 'PMF-88213_summary_invoice.pdf',
    kind: 'pdf',
    sizeKB: 61,
    source: 'Accounts Payable · Oct 14',
    summary: 'One-line summary invoice as filed',
  },
  receipt: {
    id: 'receipt',
    name: 'Breakwater_Dive_receipt_dated.pdf',
    kind: 'pdf',
    sizeKB: 96,
    source: 'Mateo Fuentes · Nov 12',
    summary: 'Dive-gear rental receipt, Oct 7–10',
  },
  ct: {
    id: 'ct',
    name: 'Cost_Transfer_CT-2291-0117.pdf',
    kind: 'pdf',
    sizeKB: 118,
    source: 'Prepared by you',
    summary: 'Reclass 53110 → 54620, $4,312.60',
  },
  rma: {
    id: 'rma',
    name: 'Tidewater_RMA-7731.pdf',
    kind: 'pdf',
    sizeKB: 204,
    source: 'Rosa Delgado · Oct 22',
    summary: 'Return authorization, PAR sensor',
  },
  q3: {
    id: 'q3',
    name: 'ROA-31_Q3_progress_budget.xlsx.pdf',
    kind: 'pdf',
    sizeKB: 410,
    source: 'You · Oct 29',
    summary: 'Q3 budget table',
  },
};

export interface Message {
  id: string;
  from: PersonId;
  to: PersonId[];
  cc?: PersonId[];
  date: string;
  body: string;
  attachments?: string[];
  via?: 'satellite';
  tag?: string;
}

export type ThreadStatus = 'needs-reply' | 'action' | 'waiting' | 'closed';

export interface Thread {
  id: string;
  subject: string;
  grantId: string;
  chargeId?: string;
  recordId?: string;
  participants: PersonId[];
  status: ThreadStatus;
  statusNote: string;
  unread?: boolean;
  messages: Message[];
}

export const CHARGE = {
  id: 'pmf88213',
  vendor: 'Pacific Marine Fuel',
  invoice: 'PMF-88213',
  amount: 4312.6,
  date: '2026-10-09T00:00',
  posted: '2026-10-14T00:00',
  codedName: 'Field supplies',
  codedCode: '53110',
  correctName: 'Vessel operations',
  correctCode: '54620',
  memo: 'Fuel delivery – Dock B · Qty 1',
};

export const threads: Thread[] = [
  {
    id: 'greg',
    subject: 'OCE-2291 — question on October charge PMF-88213',
    grantId: 'oce2291',
    chargeId: CHARGE.id,
    participants: ['greg', 'teodora'],
    status: 'needs-reply',
    statusNote: 'Response due Fri Nov 20',
    messages: [
      {
        id: 'g1',
        from: 'greg',
        to: ['teodora'],
        date: '2026-11-10T14:14',
        body: `Hi Teodora,

In the October ledger review for OCE-2291 I'm seeing a $4,312.60 charge from Pacific Marine Fuel (invoice PMF-88213, dated Oct 9) posted to Field supplies (53110). Fuel at that amount doesn't look like a field supply to me. Can you tell me what it was for?

Thanks,
Greg`,
      },
      {
        id: 'g2',
        from: 'teodora',
        to: ['greg'],
        date: '2026-11-10T16:52',
        body: `Hi Greg,

That's diesel for the R/V Sea Lark during Dr. Amaral's kelp survey cruise in early October. I think it was keyed to field supplies by mistake when AP entered the invoice. Let me pull the vessel log and the cruise plan and get back to you.

Teodora`,
      },
      {
        id: 'g3',
        from: 'greg',
        to: ['teodora'],
        date: '2026-11-12T10:05',
        body: `Thanks. Two things came up when I looked closer:

1. The station recharge center already billed OCE-2291 for Sea Lark day rates — five days at $2,850, posted Oct 31. If fuel is included in that rate, this would be a duplicate charge.

2. The invoice we have on file is a one-line summary ("Fuel delivery – Dock B"). It doesn't show gallons, unit price, or which vessel was fueled.

I'll need to take this to our post-award review on Friday.

Greg`,
      },
      {
        id: 'g4',
        from: 'greg',
        to: ['teodora'],
        date: '2026-11-13T15:30',
        tag: 'Flagged: possibly unallowable',
        body: `Teodora,

Our post-award review today flagged PMF-88213 ($4,312.60) as potentially unallowable on OCE-2291 as currently documented. To keep it on the award, please send the following by end of day Friday, Nov 20 (5 business days):

• A written justification of how the fuel benefited OCE-2291 and why it isn't already covered by the Sea Lark day rate
• An itemized invoice from Pacific Marine Fuel (gallons, unit price, fees, vessel fueled)
• The vessel log for the cruise
• PI confirmation of the cruise dates, and that the vessel time was for this award only
• A cost transfer moving the charge from Field supplies (53110) to Vessel operations (54620)

If we can't document it by the 20th, we'll have to move the charge to the station's unrestricted account and the department would absorb it. Happy to talk by phone if that's easier — x4-7716.

Greg Tanaka
Senior Grants Accountant, Sponsored Projects Accounting`,
      },
    ],
  },
  {
    id: 'amaral',
    subject: "Mateo's dive rental + effort cert",
    grantId: 'oce2291',
    chargeId: CHARGE.id,
    participants: ['amaral', 'teodora'],
    status: 'waiting',
    statusNote: 'At sea · in port Fri',
    messages: [
      {
        id: 'a1',
        from: 'teodora',
        to: ['amaral'],
        date: '2026-11-05T11:20',
        body: `Hi Beatriz,

Mateo turned in a $286 receipt from Breakwater Dive & Rental for the October Sea Lark cruise (two drysuits and two regulator sets). OK to charge it to OCE-2291?

Also a heads-up that Q1 effort certification opens Dec 1 — no action until you're back.

Teodora`,
      },
      {
        id: 'a2',
        from: 'amaral',
        to: ['teodora'],
        date: '2026-11-08T06:04',
        via: 'satellite',
        body: `T - yes approve Mateo 286 on OCE-2291. Effort cert when back.
Sat mail syncs ~0600 and ~1800 only. Plain text, short pls, NO attachments - anything over 50KB bounces.
In port Fri 20th.
-BA`,
      },
    ],
  },
  {
    id: 'mateo',
    subject: 'Reimbursement: dive-gear rental for SL-26-14 ($286.00)',
    grantId: 'oce2291',
    recordId: 'reimb',
    participants: ['mateo', 'teodora'],
    status: 'action',
    statusNote: 'Ready to submit to AP',
    messages: [
      {
        id: 'm1',
        from: 'mateo',
        to: ['teodora'],
        date: '2026-11-03T13:41',
        body: `Hi Teodora,

Here's my receipt from Breakwater Dive & Rental for the Sea Lark cruise — 2 drysuits and 2 regulator sets, $286.00 total. I paid on my personal card. Let me know if you need anything else!

Mateo`,
      },
      {
        id: 'm2',
        from: 'teodora',
        to: ['mateo'],
        date: '2026-11-09T09:15',
        body: `Thanks Mateo — Dr. Amaral approved it from the ship. One thing: the receipt shows the total but not the rental dates, and AP will bounce it without them. Could you ask Breakwater for a copy that shows the dates?

Teodora`,
      },
      {
        id: 'm3',
        from: 'mateo',
        to: ['teodora'],
        date: '2026-11-12T16:08',
        attachments: ['receipt'],
        body: `Got it — they reprinted it with the dates (Oct 7–10). Attached!

Mateo`,
      },
    ],
  },
  {
    id: 'tidewater',
    subject: 'RMA 7731 — return credit for PAR sensor',
    grantId: 'oce2307',
    recordId: 'credit',
    participants: ['rosa', 'teodora'],
    status: 'waiting',
    statusNote: 'Credit memo expected by Nov 18',
    messages: [
      {
        id: 't1',
        from: 'teodora',
        to: ['rosa'],
        date: '2026-10-28T10:02',
        attachments: ['rma'],
        body: `Hello Rosa,

We shipped the failed underwater PAR sensor (S/N TQ-55102) back under RMA 7731 on Oct 23; tracking shows it was delivered Oct 26. Can you confirm the $1,150.00 credit will go back against our original PO 4500918842 rather than as a check? The purchase was on a federal grant and the credit needs to post to the same account.

Thank you,
Teodora Ilic
Larkin Cove Marine Station`,
      },
      {
        id: 't2',
        from: 'rosa',
        to: ['teodora'],
        date: '2026-11-04T14:37',
        body: `Hi Teodora,

The sensor was received and inspected — confirmed failed seal, covered under warranty. Credit memo CM-40127 for $1,150.00 will be issued against PO 4500918842 within 7–10 business days. It will show on your account statement once it posts.

Best,
Rosa Delgado
Tidewater Scientific`,
      },
    ],
  },
  {
    id: 'wes',
    subject: 'Sea Lark recharge posted — SL-26-14',
    grantId: 'oce2291',
    chargeId: CHARGE.id,
    participants: ['wes', 'teodora'],
    status: 'closed',
    statusNote: 'Closed Oct 31',
    messages: [
      {
        id: 'w1',
        from: 'wes',
        to: ['teodora'],
        date: '2026-10-31T15:12',
        attachments: ['vlog'],
        body: `Teodora —

Posted the Sea Lark recharge for SL-26-14: 5 days × $2,850 = $14,250.00 to OCE-2291 / Vessel operations (54620).

Per the FY27 recharge schedule (§4.2) fuel isn't in the day rate; it gets billed at cost. The Oct 9 Pacific Marine Fuel delivery was the only fill-up during the cruise. Log excerpt attached for your files.

Wes`,
      },
    ],
  },
  {
    id: 'seagrant',
    subject: 'R/OA-31 Q3 progress report — budget table',
    grantId: 'seagrant',
    participants: ['priscilla', 'teodora', 'okafor'],
    status: 'closed',
    statusNote: 'Closed Oct 30',
    messages: [
      {
        id: 's1',
        from: 'teodora',
        to: ['priscilla'],
        cc: ['okafor'],
        date: '2026-10-29T11:48',
        attachments: ['q3'],
        body: `Hi Priscilla,

Attached is the Q3 budget table for R/OA-31. Expenditures through Sep 30 are $265,630; the remaining $146,870 is on track for the January 31 end date. Dr. Okafor has reviewed the narrative.

Teodora`,
      },
      {
        id: 's2',
        from: 'priscilla',
        to: ['teodora'],
        cc: ['okafor'],
        date: '2026-10-30T09:20',
        body: `Received, thank you — this completes the Q3 report. No questions on the budget.

Priscilla`,
      },
    ],
  },
];

// ——— Snippets the composer can insert into the reply to Greg ———
export const gregSnippets: { id: string; label: string; source: string; text: string }[] = [
  {
    id: 'purpose',
    label: 'What the fuel was for',
    source: 'Cruise plan SL-26-14',
    text: `The charge is marine diesel for the R/V Sea Lark during cruise SL-26-14 (Oct 7–11, 2026), which was planned and run for the kelp forest recovery surveys under OCE-2291 — Dr. Amaral was chief scientist, and all five survey transects are in the award's approved field plan. The cruise plan is attached.`,
  },
  {
    id: 'vlog',
    label: 'Vessel log: fuel delivery',
    source: 'Vessel log, Oct 9',
    text: `The vessel log records a single dockside fuel delivery from Pacific Marine Fuel on Oct 9 at 06:10 — 889 gallons, tanks 31% → 98% — midway through the cruise. Engine hours for Oct 7–11 total 40.0, which is consistent with that volume. Log excerpt attached.`,
  },
  {
    id: 'rate',
    label: 'Why it isn’t in the day rate',
    source: 'FY27 recharge schedule §4.2',
    text: `It is not a duplicate of the day-rate charges. Under the station's FY27 recharge schedule (§4.2), the Sea Lark day rate of $2,850 covers crew, maintenance and insurance and excludes fuel, which is billed to the project at cost. The five day-rate charges posted Oct 31 ($14,250) contain no fuel.`,
  },
  {
    id: 'budget',
    label: 'Budget coverage',
    source: 'OCE-2291 budget',
    text: `The approved OCE-2291 budget includes $186,000 for vessel operations, with $44,050 remaining, so the cost fits within the existing budget category once it is coded correctly.`,
  },
  {
    id: 'reclass',
    label: 'Coding error + cost transfer',
    source: 'Cost transfer',
    text: `The charge was keyed to Field supplies (53110) in error when the invoice was entered; I've submitted a cost transfer moving it to Vessel operations (54620). The transfer is within 90 days of the original posting (Oct 14).`,
  },
  {
    id: 'pending',
    label: 'What’s still coming',
    source: 'Open requests',
    text: `Still to come: the itemized invoice from Pacific Marine Fuel (requested today) and Dr. Amaral's confirmation of the cruise dates. She is at sea on the Sea Lark with satellite email only until Friday, so I've asked her for a one-line reply. I'll forward both as soon as they arrive, and no later than Friday.`,
  },
];

export const GREG_DRAFT_START = `Hi Greg,

Thanks for laying out exactly what you need. Short version: this is fuel for the R/V Sea Lark during Dr. Amaral's OCE-2291 cruise, and it was posted to the wrong object code.

`;

export const PI_DRAFT = `Beatriz - grants office flagged the Oct 9 fuel charge ($4,312.60, Pacific Marine Fuel) on OCE-2291. They need your confirmation by Fri. Two quick ones:

1. SL-26-14 ran Oct 7-11 and all 5 days were OCE-2291 work? Y/N
2. Vessel log shows J. Park (Lindqvist lab) aboard Oct 10 taking 2 sediment cores, ~1.5 h. Was any of that ship time for OCE-2307? If yes, rough hours - we may need to split the fuel.

One-line reply is fine. -T`;

export const VENDOR_DRAFT = `Hello Dana,

Could you send us an itemized copy of invoice PMF-88213 (Oct 9, 2026 — delivery to Larkin Cove Marine Station, Dock B)?

The copy on file is a one-line summary, and our university grants office needs it to show:
  • gallons delivered and price per gallon
  • any delivery, environmental or tax line items
  • the vessel fueled (R/V Sea Lark)

If you can send it by Wednesday, Nov 18, that would let us close this out on time. A PDF reply to this email is perfect.

Thank you,
Teodora Ilic
Lab & Finance Manager, Larkin Cove Marine Station
(805) 555-0142`;

export const CT_REASON = `Fuel for R/V Sea Lark cruise SL-26-14 (Oct 7–11, 2026) under OCE-2291 was keyed to Field supplies (53110) in error at invoice entry. Vessel operations (54620) is the correct object code per the approved budget; fuel is billed at cost and excluded from the Sea Lark day rate (FY27 recharge schedule §4.2). Supporting documents: vessel log Oct 7–11, cruise plan SL-26-14.`;
