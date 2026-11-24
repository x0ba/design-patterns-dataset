export type CodeId =
  | 'request'
  | 'offer'
  | 'venting'
  | 'logistics'
  | 'gratitude'
  | 'rules'
  | 'resource'
  | 'offtopic'
  | 'unclear'

export interface CodeMeta {
  id: CodeId
  name: string
  /** text colour on tint */
  fg: string
  /** tint background */
  bg: string
  /** solid dot colour */
  dot: string
}

export const CODES: CodeMeta[] = [
  { id: 'request', name: 'Request for help', fg: '#8c2f19', bg: '#fbe6df', dot: '#c9553a' },
  { id: 'offer', name: 'Offer of help', fg: '#25613f', bg: '#e1f0e6', dot: '#3b8a5c' },
  { id: 'venting', name: 'Venting', fg: '#5b3a8c', bg: '#ede6f8', dot: '#8a62c4' },
  { id: 'logistics', name: 'Logistics', fg: '#244f82', bg: '#e0ebf8', dot: '#3f78b8' },
  { id: 'gratitude', name: 'Gratitude', fg: '#745000', bg: '#f8ecc8', dot: '#c99a22' },
  { id: 'rules', name: 'Rule enforcement', fg: '#454b54', bg: '#e6e8eb', dot: '#6d7580' },
  { id: 'resource', name: 'Resource sharing', fg: '#1b5f61', bg: '#dcf0ef', dot: '#2c9396' },
  { id: 'offtopic', name: 'Off-topic', fg: '#5f5545', bg: '#eee9df', dot: '#a39679' },
  { id: 'unclear', name: 'Unclear', fg: '#873258', bg: '#f9e3ee', dot: '#c04e83' },
]

export const CODE_BY_ID: Record<CodeId, CodeMeta> = Object.fromEntries(
  CODES.map((c) => [c.id, c]),
) as Record<CodeId, CodeMeta>

export const CODE_IDS: CodeId[] = CODES.map((c) => c.id)

export interface Example {
  id: string
  text: string
  /** the code the example demonstrates */
  code: CodeId
  kind: 'core' | 'boundary'
  /** why this example is in the codebook */
  note?: string
  /** corpus post it was taken from, if any */
  postId?: string
  /** added in the current draft */
  isNew?: boolean
}

export interface CodeDef {
  definition: string
  includes: string[]
  excludes: string[]
  examples: Example[]
}

export type Codebook = Record<CodeId, CodeDef>

export const CODEBOOK_V3: Codebook = {
  request: {
    definition:
      'The author asks the community to provide something they need: money, goods, a ride, labor, a referral, or information about how to get help.',
    includes: [
      'Direct asks (“Can anyone cover…”, “Does anyone have…”)',
      'Questions addressed to the community about how to solve the author’s own problem',
      'Asks made on someone else’s behalf when the author is organizing it (a neighbor, a coworker)',
    ],
    excludes: [
      'Posts that only describe hardship with no ask (code as venting)',
      'Offers of help, including “DM me if you need…” (code as offer of help)',
      'Questions about forum rules or moderation (code as rule enforcement)',
    ],
    examples: [
      {
        id: 'ex-req-1',
        code: 'request',
        kind: 'core',
        text: 'My car got towed Friday and I can’t afford the $340 to get it out before Monday. Does anyone in Lents have a few hundred to spare, even as a loan? I can pay it back by the 15th.',
      },
      {
        id: 'ex-req-2',
        code: 'request',
        kind: 'core',
        text: 'Looking for someone with a truck who can help me move a couch from NE 82nd to St. Johns on Saturday. I’ll cover gas and lunch.',
      },
      {
        id: 'ex-req-3',
        code: 'request',
        kind: 'core',
        text: 'Does anyone know how to apply for the county rent assistance if my landlord won’t sign the form?',
      },
    ],
  },
  offer: {
    definition:
      'The author offers something to others: money, goods, time, skills, a ride, a spare room, or a place in a queue.',
    includes: [
      'Standing offers (“I have extra, DM me”)',
      'Offers made in reply to a request in the same thread',
      'Offers to cover someone’s bill or order',
    ],
    excludes: [
      'Sharing a link or a list without giving anything of their own (code as resource sharing)',
      'Thanking someone for help received (code as gratitude)',
      'Selling goods',
    ],
    examples: [
      {
        id: 'ex-off-1',
        code: 'offer',
        kind: 'core',
        text: 'I’ve got two boxes of size 5 diapers my son outgrew. Unopened. Happy to drop them off anywhere in Montavilla this week.',
      },
      {
        id: 'ex-off-2',
        code: 'offer',
        kind: 'core',
        text: 'Retired electrician here. If your landlord won’t fix an outlet and you’re in the Eastside, message me and I’ll come look at it for free.',
      },
      {
        id: 'ex-off-3',
        code: 'offer',
        kind: 'core',
        text: 'I’ll cover the first month of that bus pass for whoever needs it. First reply gets it.',
      },
    ],
  },
  venting: {
    definition:
      'The author expresses frustration, exhaustion, anger, grief, or worry about their circumstances or other people, without asking the community to do or provide anything.',
    includes: [
      'Hardship narratives told to be heard rather than to get something',
      'Criticism of landlords, platforms, agencies, or other members',
      'Expressions of burnout or isolation',
    ],
    excludes: [
      'Any explicit ask for money, goods, labor, or information (code as request for help)',
      'Complaints about a specific forum rule or removal (code as rule enforcement)',
      'Thanks for help received (code as gratitude)',
    ],
    examples: [
      {
        id: 'ex-ven-1',
        code: 'venting',
        kind: 'core',
        text: 'Fourth shift this month they cut early and called it “slow.” I don’t know how people are supposed to plan around that. I’m just so tired.',
      },
      {
        id: 'ex-ven-2',
        code: 'venting',
        kind: 'core',
        text: 'My landlord told me I was “lucky” to have a unit at all. Lucky. I’ve been without hot water since March.',
      },
    ],
  },
  logistics: {
    definition:
      'Coordination details about an exchange that is already agreed or being arranged: time, place, quantities, pickup or drop-off, payment method, confirmation.',
    includes: [
      'Replies to a request or offer that settle when, where, or how',
      'Updates such as “running 15 minutes late”',
      'Changes to a recurring schedule (pantry hours, ride shares)',
    ],
    excludes: [
      'The initial ask or offer itself (code as request or offer of help)',
      'Questions about forum rules (code as rule enforcement)',
    ],
    examples: [
      {
        id: 'ex-log-1',
        code: 'logistics',
        kind: 'core',
        text: 'Perfect, I’ll be at the north entrance at 9:15 with the cart. Text me if the gate is locked.',
      },
      {
        id: 'ex-log-2',
        code: 'logistics',
        kind: 'core',
        text: 'Pantry pickup is moving to Thursdays starting next week, same hours.',
      },
    ],
  },
  gratitude: {
    definition:
      'The author thanks a person or the community for help received, or reports that help arrived.',
    includes: [
      'Thank-you posts and outcome updates (“rent got paid, thank you”)',
      'Praise for a specific helper or organization',
    ],
    excludes: [
      'Thanks that also ask for more help (code the ask)',
      'Courtesy closers on a request (“thanks in advance”)',
    ],
    examples: [
      {
        id: 'ex-gra-1',
        code: 'gratitude',
        kind: 'core',
        text: 'The ride to dialysis worked out perfectly. Thank you to the three of you who offered. I cried in the car.',
      },
      {
        id: 'ex-gra-2',
        code: 'gratitude',
        kind: 'core',
        text: 'Update: the deposit cleared and I’m in the new apartment. Whoever you are, thank you.',
      },
      {
        id: 'ex-gra-3',
        code: 'gratitude',
        kind: 'core',
        text: 'Shout-out to Dee on Alder St for the soup and the extension cord. You’re the reason my fridge stayed cold.',
      },
    ],
  },
  rules: {
    definition:
      'Posts that enforce, cite, question, or explain forum rules: removals, warnings, verification requirements, scam alerts.',
    includes: [
      'Moderator announcements and removal notices',
      'Members reporting suspected scams or rule-breaking posts',
      'Questions about what is allowed',
    ],
    excludes: ['General complaints about the forum’s culture (code as venting)'],
    examples: [
      {
        id: 'ex-rul-1',
        code: 'rules',
        kind: 'core',
        text: 'Removed for asking for payment via gift card. Per rule 4, please use the verified-requests thread.',
      },
      {
        id: 'ex-rul-2',
        code: 'rules',
        kind: 'core',
        text: 'Heads up, this account has posted the same “stranded traveler” story in three subs. Looks like a scam.',
      },
    ],
  },
  resource: {
    definition:
      'The author points others to an existing resource without giving anything of their own: a link, a hotline, a program, a how-to, a list of pantry hours.',
    includes: [
      'Links to assistance programs and eligibility pages',
      'Summaries of how an application process works',
      'Lists of pantries, clinics, or free events',
    ],
    excludes: [
      'Offering their own goods or time (code as offer of help)',
      'Asking where to find a resource (code as request for help)',
    ],
    examples: [
      {
        id: 'ex-res-1',
        code: 'resource',
        kind: 'core',
        text: 'The county’s utility assistance form is on the second tab of the housing page. Income limit is 60% AMI and they take pay stubs from the last 30 days.',
      },
      {
        id: 'ex-res-2',
        code: 'resource',
        kind: 'core',
        text: 'Free legal aid for evictions: Monday and Wednesday mornings at the courthouse, room 112. No appointment.',
      },
    ],
  },
  offtopic: {
    definition:
      'Content unrelated to mutual aid, the forum’s community, or the members’ circumstances: advertising, memes, recruitment, unrelated news.',
    includes: [
      'Product promotion',
      'Surveys and research recruitment',
      'General chat about unrelated hobbies or news',
    ],
    excludes: ['Political posts tied to the author’s own hardship (code as venting)'],
    examples: [
      {
        id: 'ex-off-t1',
        code: 'offtopic',
        kind: 'core',
        text: 'Anyone watching the Blazers game tonight? Calling it now, they lose by ten.',
      },
      {
        id: 'ex-off-t2',
        code: 'offtopic',
        kind: 'core',
        text: 'Use code SAVE20 for 20% off candles at our new shop!',
      },
    ],
  },
  unclear: {
    definition:
      'The post cannot be assigned to another code after two readings: too short, fragmentary, deleted, or dependent on context that is not in the corpus.',
    includes: [
      'Single-word or fragmentary replies',
      'Deleted-content placeholders',
      'Posts that depend on a parent comment we do not have',
    ],
    excludes: [
      'Posts that are hard but readable: pick the best-fit code and lower the confidence',
    ],
    examples: [
      {
        id: 'ex-unc-1',
        code: 'unclear',
        kind: 'core',
        text: '[removed]',
      },
      {
        id: 'ex-unc-2',
        code: 'unclear',
        kind: 'core',
        text: 'same here lol. they said thursday tho',
      },
    ],
  },
}

export interface ChangelogEntry {
  version: string
  date: string
  author: string
  summary: string
  changed: string[]
}

export const CHANGELOG_PUBLISHED: ChangelogEntry[] = [
  {
    version: 'v3',
    date: 'Oct 21, 2026',
    author: 'Priya Ramaswamy',
    summary:
      'Added “unclear” as a code of last resort. Narrowed “logistics” so first asks and first offers stay with request and offer. Added two gratitude examples.',
    changed: ['Unclear (new)', 'Logistics', 'Gratitude'],
  },
  {
    version: 'v2',
    date: 'Sep 9, 2026',
    author: 'Priya Ramaswamy',
    summary:
      'Replaced the catch-all “other” with “resource sharing” and “rule enforcement” after the 60-post pilot with Marcus Bell showed 31% of “other” labels were one of those two.',
    changed: ['Resource sharing (new)', 'Rule enforcement (new)', 'Offer of help'],
  },
  {
    version: 'v1',
    date: 'Aug 12, 2026',
    author: 'Priya Ramaswamy',
    summary: 'First draft: seven codes taken from the spring pilot memo.',
    changed: ['All codes (new)'],
  },
]
