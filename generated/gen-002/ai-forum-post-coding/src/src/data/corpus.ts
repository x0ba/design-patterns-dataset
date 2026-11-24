import type { CodeId } from './codes'
import { HAND_POSTS, type ForumId } from './disagreements'

export type { ForumId }

export const FORUMS: { id: ForumId; name: string; total: number }[] = [
  { id: 'MAP', name: 'MutualAidPDX', total: 1420 },
  { id: 'RRN', name: 'RentReliefNet', total: 980 },
  { id: 'NHN', name: 'NeighborsHelpingNeighbors', total: 870 },
  { id: 'GWC', name: 'GigWorkerCommons', total: 530 },
]
export const FORUM_NAME: Record<ForumId, string> = Object.fromEntries(
  FORUMS.map((f) => [f.id, f.name]),
) as Record<ForumId, string>

export const CORPUS_TOTAL = 3800
export const CODED_TOTAL = 1240
export const GOLD_TOTAL = 300

// ── mock clock ───────────────────────────────────────────────────────────
export const RUN_START = new Date(2026, 10, 15, 14, 12, 0).getTime()
export const NOW_START = new Date(2026, 10, 16, 15, 34, 0).getTime()
/** ms between labels so that 1,240 labels land between RUN_START and NOW_START */
const MS_PER_LABEL = (NOW_START - RUN_START - 40_000) / CODED_TOTAL

export const MODEL_ID = 'claude-research-2026-09'
export const COST_SO_FAR = 18.4
export const COST_PER_POST = COST_SO_FAR / CODED_TOTAL
export const CONFIG_HASH = 'cfg·9c41e7a2'

// ── seeded rng ───────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export type Rng = () => number
const rng: Rng = mulberry32(4117)
const pick = <T,>(arr: readonly T[], r: Rng = rng): T => arr[Math.floor(r() * arr.length)]
const shuffle = <T,>(arr: T[], r: Rng = rng): T[] => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── text generation ──────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIMES = ['8', '9:30', '10', 'noon', '2', '4:30', '6']
const ITEMS = [
  'a space heater', 'a crib', 'size 5 diapers', 'a bus pass', 'a set of snow tires',
  'a bag of rice and beans', 'a box fan', 'a winter coat', 'a used laptop',
  'a pair of work boots', 'a car seat', 'a microwave', 'a twin mattress',
]
const BILLS = ['electric bill', 'rent', 'water bill', 'phone bill', 'car insurance', 'registration fee', 'prescription copay']
const NUMS = ['two', 'three', 'four', 'five']
const AMTS = ['85', '120', '140', '175', '210', '240', '310', '365', '480', '650']

const FCTX: Record<ForumId, { hoods: string[]; streets: string[]; orgs: string[] }> = {
  MAP: {
    hoods: ['Lents', 'St. Johns', 'Montavilla', 'Cully', 'Woodlawn', 'Foster-Powell', 'Kenton', 'Sellwood', 'Parkrose', 'Brentwood-Darlington', 'Hollywood', 'Gresham'],
    streets: ['82nd', 'Powell', 'Foster', 'Killingsworth', 'Sandy', 'Division', 'Lombard'],
    orgs: ['the county', 'TriMet', 'the clinic on Powell', 'the housing office', 'the pantry'],
  },
  RRN: {
    hoods: ['Tacoma', 'Columbus', 'Fresno', 'Louisville', 'Tucson', 'Spokane', 'Albany'],
    streets: ['Pine', 'Harbor', 'Fifth', 'Linden'],
    orgs: ['the housing authority', 'my property manager', 'the ERAP office', 'the court clerk', 'the tenants’ union', 'the leasing office'],
  },
  NHN: {
    hoods: ['the corner', 'the north end', 'the block', 'the park', 'the library'],
    streets: ['Alder', 'Mason', 'Fulton', 'Maple Court', 'Delmar', 'Ninth Ave', 'Birch'],
    orgs: ['the church pantry', 'the city', 'the senior center', 'the school office', 'the community fridge'],
  },
  GWC: {
    hoods: ['the airport lot', 'downtown', 'the stadium zone', 'the east side', 'the mall'],
    streets: ['Sandy', 'Airport Way', 'Broadway', 'Marine Dr'],
    orgs: ['support', 'the platform', 'the deactivation team', 'the payments team', 'the tax preparer'],
  },
}

function slotter(forum: ForumId, r: Rng) {
  const f = FCTX[forum]
  const d1 = pick(DAYS, r)
  let d2 = pick(DAYS, r)
  while (d2 === d1) d2 = pick(DAYS, r)
  const t1 = pick(TIMES, r)
  let t2 = pick(TIMES, r)
  while (t2 === t1) t2 = pick(TIMES, r)
  const m: Record<string, string> = {
    hood: pick(f.hoods, r),
    street: pick(f.streets, r),
    org: pick(f.orgs, r),
    day: d1,
    day2: d2,
    time: t1,
    time2: t2,
    item: pick(ITEMS, r),
    bill: pick(BILLS, r),
    n: pick(NUMS, r),
    amt: pick(AMTS, r),
  }
  return (tpl: string) => tpl.replace(/\{(\w+)\}/g, (_, k) => m[k] ?? '')
}

const LEADS = [
  'Long week, so apologies if this rambles.',
  'Posting from my phone, so forgive the typos.',
  'Not sure where else to put this.',
  'Quick note from my end.',
  'Been reading this forum for a while and finally posting.',
  'I almost didn’t write this.',
]

const BODY: Record<ForumId, string[]> = {
  MAP: [
    'I’ve lived in {hood} for about {n} years.',
    'I work early shifts so mornings are hard for me.',
    'I’ve been taking the bus most places since the car died.',
    'My kids are home with me on {day}s.',
    'I’m on a fixed income so I have to plan every week down to the dollar.',
    'It’s been a hard winter in our building.',
    'The last few months have been a lot, between work and the kids.',
    'I take the 72 most days, which adds almost an hour each way.',
    'My landlord has been fine but the building is old and everything breaks at once.',
    'Our street floods whenever it rains hard.',
  ],
  RRN: [
    'The lease runs through August.',
    'Property management stopped answering my emails in the spring.',
    'I’m on the second notice already.',
    'I work part time and my hours keep changing.',
    'We have {n} people in a two-bedroom.',
    'I’ve kept every email and every receipt just in case.',
    'The portal logs me out every few minutes, so uploads fail half the time.',
    'I’ve been in this unit three years and never missed a payment before this spring.',
    'My landlord says he’s sympathetic but the owner won’t budge.',
    'I’m trying to keep this away from my kids, who are old enough to notice.',
  ],
  NHN: [
    'I live on {street}, a few doors down from the corner.',
    'We’ve been on this block for eleven years.',
    'My knees aren’t what they used to be, so stairs are slow.',
    'I’m home most afternoons.',
    'Our building has an elevator but it’s been out since spring.',
    'Most of us on {street} know each other by now.',
    'My neighbor across the hall checks in on me, which helps.',
    'I don’t drive anymore, so everything has to be within a few blocks.',
    'The block has gotten quieter since the pandemic, in a bad way.',
    'We’ve got a few families here with little ones and a few folks living alone.',
  ],
  GWC: [
    'I mostly drive evenings and weekends.',
    'I do about {n} deliveries a night when it’s busy.',
    'Gas is eating most of what I make.',
    'I’ve been on the platform {n} years now.',
    'I’ve got a second job at a warehouse on the weekends.',
    'My car is paid off but it’s getting to the point where every repair is a decision.',
    'Some nights I clear more in tips than in base pay, and some nights it’s the opposite.',
    'The dashboard shows my earnings before gas, which is a joke.',
    'I take the airport queue when I can, but the wait is two hours some days.',
    'A lot of us are one bad week from missing a payment on something.',
  ],
}

const STORY_V = [
  'Rent is due Friday and my paycheck was short again because of cut hours.',
  'I’ve been on hold with {org} for forty minutes.',
  'The letter came back marked “incomplete” and nobody will tell me what’s missing.',
  'I haven’t had a day off since the {day} before last.',
  'I keep telling myself it’s temporary, but I’ve been telling myself that since spring.',
  'Everyone keeps saying “just apply for assistance” like I haven’t.',
  'My phone bill alone is eating a tenth of what I make.',
]
const STORY_R = [
  'My hours got cut in half this month and the {bill} is still due.',
  'I called {org} twice and got nowhere.',
  'I’m a single parent and I can’t get out of work for the daytime offices.',
  'I’ve already spent what I had set aside for this.',
  'I’d rather not ask, but I’m out of options.',
]
const STORY_O = [
  'I got a bonus at work and want to put some of it to use.',
  'I’ve been on the receiving end of this forum before, so it’s my turn.',
  'My kids outgrew a lot this year and I hate to see it sit in a closet.',
  'I’m not in a position to give money, but I have time and a car.',
]
const STORY_L = [
  'I’ll bring gloves and a cart in case it’s heavy.',
  'Parking is easiest on the side street, the front lot fills up.',
  'If the gate is locked, ring the bell and someone will come out.',
]
const STORY_RES = [
  'I went through this last year and it took longer than I expected.',
  'The staff were helpful once I got through to a person.',
  'You’ll want to start the paperwork early because it asks for more than you’d think.',
  'Nobody told me about this until a friend did, so I’m passing it along.',
]
const STORY_G = [
  'It really did make a difference this week.',
  'I didn’t think anyone would answer.',
  'I’m trying to pay it forward when I can.',
  'I was ready to give up on the whole thing before this.',
  'My kids noticed, and they don’t notice much.',
  'I know it’s a small thing to some people, but it wasn’t to me.',
]

interface CoreTpl { t: string; q?: boolean }

const CORE: Record<CodeId, CoreTpl[]> = {
  request: [
    { t: 'Does anyone have {item} they could part with this week?', q: true },
    { t: 'Can anyone help cover {amt} dollars toward the {bill} before {day}?', q: true },
    { t: 'I’m looking for a ride to {hood} on {day} around {time}.' },
    { t: 'If anyone can spare a few hours on {day} to help me move, I’d be so grateful.' },
    { t: 'Does anyone know who I can call to get {org} to reopen my case?', q: true },
    { t: 'I need someone who can watch my kids on {day} evenings while I work.' },
    { t: 'Could anyone spare {item} before the end of the month?', q: true },
    { t: 'Would anyone be able to drive me to my appointment on {day}?', q: true },
    { t: 'Is there anyone who could cover the {amt} dollar deposit until my next check?', q: true },
    { t: 'I’m looking for someone who has been through a hearing before and can tell me what to expect.' },
  ],
  offer: [
    { t: 'I have {item} I’m not using and I’d like it to go to someone who needs it.' },
    { t: 'I can drive people to {hood} on {day} mornings if you message me the night before.' },
    { t: 'I’m covering {amt} dollars toward one person’s {bill} this month, so message me if you’re in a bind.' },
    { t: 'Free to a good home: {item}. Pickup on {street}, left on the porch, no questions.' },
    { t: 'I’ll be at {org} on {day} and can carry groceries for anyone who can’t make the walk.' },
    { t: 'I have a spare room until the end of the month if someone needs somewhere to land.' },
    { t: 'Happy to babysit on {day} evenings for anyone working a late shift.' },
    { t: 'I can sit with you and go through the forms if you’re stuck on {org}.' },
    { t: 'I’ve got a truck and a free {day}, so if you need anything hauled, I’m your person.' },
  ],
  venting: [
    { t: 'I’m so tired of being told to just be patient while {org} sits on my paperwork.' },
    { t: 'Another {day} of getting cut early and called it “slow.”' },
    { t: 'I don’t even have the energy to be angry anymore, I’m just flat.' },
    { t: 'Every time I get a little ahead, something breaks.' },
    { t: 'I’ve done everything they asked and it still isn’t enough.' },
    { t: 'It’s humiliating to count change at the register with people waiting behind you.' },
    { t: 'My manager said I should be grateful to have hours at all.' },
    { t: 'The {bill} went up again and nobody can tell me why.' },
    { t: 'I’m not asking for anything, I just need to say this to people who get it.' },
  ],
  logistics: [
    { t: 'Confirming {day} at {time}, I’ll be at {hood} with the cart.' },
    { t: 'Running about fifteen minutes late, sorry, parking is a mess.' },
    { t: 'The pantry is moving to {day}s starting next week, same hours.' },
    { t: 'I left the box on the porch like we talked about, blue bin by the door.' },
    { t: 'Can you do {time} instead of {time2}? Something came up at work.', q: true },
    { t: 'Venmo is fine, or I can bring cash when I pick it up.' },
    { t: 'We’re in the back lot behind the church, look for the white van.' },
    { t: 'Pickup is set for {day}, I’ll text when I’m ten minutes out.' },
  ],
  gratitude: [
    { t: 'I wanted to say thank you to everyone who chipped in last week.' },
    { t: 'Everything arrived on {day} and my daughter hasn’t stopped using it.' },
    { t: 'Update: {org} approved the application and I’m current on rent through next month.' },
    { t: 'Thank you to the person who drove me to {hood}, I don’t know how I would have gotten there.' },
    { t: 'Whoever left the groceries on my porch, you have no idea what that meant.' },
    { t: 'This community got me through the worst month of my year.' },
  ],
  rules: [
    { t: 'Removed per rule 3: requests for payment by gift card are not allowed.' },
    { t: 'Mod note: please use the verified-requests thread for anything over {amt} dollars.' },
    { t: 'This account has posted the same story in {n} other forums and looks like a scam, so please don’t send money.' },
    { t: 'Reminder that posts must use a neighborhood, not a full street address.' },
    { t: 'Is it okay to post a request on behalf of my neighbor if she doesn’t use the forum?', q: true },
    { t: 'We’re locking this thread because it turned into a fight, so please keep it civil.' },
    { t: 'Post removed: personal phone numbers in the body are not allowed, please use messages.' },
    { t: 'New members need seven days and three comments before they can post a request, which is rule 6.' },
    { t: 'A reminder that screenshots of other people’s messages are not allowed without their permission.' },
    { t: 'The mod team will be slower this week, so please use the report button and not messages.' },
    { t: 'Can someone explain the difference between the verified-requests thread and the main feed?', q: true },
    { t: 'Heads up, the account that messaged several of you offering to “double” your money is a scam.' },
  ],
  resource: [
    { t: '{org} has an application for utility assistance on its website, and the income limit is 60% of median.' },
    { t: 'There’s a free legal clinic for eviction cases every {day} at {time} at the courthouse annex.' },
    { t: 'The library near {hood} has a free printer and a notary on {day}s.' },
    { t: 'If you need a food box, the pantry on {street} is open {day} and {day2} from 10 to 1, and you should bring ID.' },
    { t: 'Here’s how the rent assistance application works: you upload the lease, your landlord gets a link, and it takes about three weeks.' },
    { t: '211 can connect you to a caseworker, so ask for the housing line.' },
  ],
  offtopic: [
    { t: 'Anyone watching the game tonight? I’m calling it now, they lose by ten.', q: true },
    { t: 'Check out my new shop for hand-poured candles, 15% off with the code NEIGHBOR.' },
    { t: 'Great weather for the farmers market this weekend.' },
    { t: 'Unpopular opinion: pineapple on pizza is fine.' },
    { t: 'Researchers at a university are looking for people to take a ten minute survey about commuting.' },
    { t: 'Does anyone have a podcast they like for long drives?', q: true },
    { t: 'Our band is playing at the {hood} park on {day}, come say hi.' },
    { t: 'Just finished a puzzle with 2,000 pieces and I need someone to be proud of me.' },
    { t: 'Is it just me or did the ice cream truck come by at 9 pm last night?', q: true },
    { t: 'Selling a barely used stand mixer, $60 firm, no trades.' },
    { t: 'Happy Friday, everyone, hope the weekend is kind to you.' },
    { t: 'The new season of that baking show is out and I have opinions.' },
    { t: 'Anyone else’s tomatoes doing absolutely nothing this year?', q: true },
    { t: 'Join my newsletter about houseplants, link in my profile.' },
    { t: 'Fun fact: the library on {street} has a seed swap in March.' },
    { t: 'Looking for a fourth for trivia night at the bar on {street}.' },
  ],
  unclear: [
    { t: 'lol same' },
    { t: 'yeah that’s what they told me too' },
    { t: 'idk tbh' },
    { t: 'see above' },
    { t: 'this. exactly this' },
    { t: 'they said {day} tho' },
    { t: '[deleted]' },
    { t: 'same lol' },
    { t: 'wait what' },
    { t: 'not sure that’s right' },
    { t: 'ok. {day} then' },
    { t: 'idk, ask her' },
    { t: 'yup' },
    { t: 'sorry wrong thread' },
    { t: 'it’s the other one' },
  ],
}

const TAIL_V_Q = [
  'Is anyone else just done with this?',
  'How is any of this supposed to work?',
  'Why does it feel like nobody can catch a break?',
  'Who decided this was acceptable?',
  'Is it just me or is it getting worse?',
  'What are we even supposed to do with that?',
  'Does anyone else feel like they’re being punished for asking for help?',
]
const TAIL_V = [
  'That’s all. I just needed to get it out.',
  'Anyway, that’s my week.',
  'Sorry for the rant.',
  'I’ll be fine, I just needed to say it.',
]
const TAIL_R = [
  'I’ll pay it forward as soon as I’m on my feet.',
  'Thank you for reading.',
  'Please message me if you can help.',
  'Happy to meet anywhere that’s easy for you.',
  'I’ll check back this evening.',
]
const TAIL_O = ['First message gets it.', 'No strings.', 'Message me and we’ll sort out the details.', 'Just pay it forward when you can.']
const TAIL_L = ['Thanks!', 'See you then.', 'Text me if anything changes.']
const TAIL_G = ['Thank you all, truly.', 'You’re wonderful.', 'Hug somebody today.']

const MODEL_RATIONALE: Record<CodeId, string[]> = {
  request: [
    'Author asks the community for something specific they need.',
    'Direct ask for goods, money, or help from other members.',
    'Question addressed to the community about the author’s own problem.',
  ],
  offer: [
    'Author offers goods, time, or money to other members.',
    'Standing offer to help anyone who messages them.',
  ],
  venting: [
    'Describes hardship and frustration without asking for anything.',
    'Expresses exhaustion and anger; no request or offer present.',
  ],
  logistics: [
    'Settles time, place, or payment for an exchange already underway.',
    'Coordination details for a pickup or meeting.',
  ],
  gratitude: [
    'Thanks the community or a helper for help received.',
    'Reports that help arrived and expresses thanks.',
  ],
  rules: [
    'Moderator notice or question about what the forum rules allow.',
    'Cites a forum rule or flags a suspected scam.',
  ],
  resource: [
    'Points readers to an existing program or service.',
    'Explains how to use an existing resource; offers nothing of their own.',
  ],
  offtopic: [
    'Unrelated to mutual aid or the author’s circumstances.',
    'Promotion or small talk with no connection to the forum’s purpose.',
  ],
  unclear: [
    'Too short or context-dependent to assign a code.',
    'Fragment; cannot be interpreted without the parent comment.',
  ],
}
const WRONG_RATIONALE: Partial<Record<CodeId, string[]>> = {
  request: [
    'Closing question is addressed to readers, which reads as a bid for a response.',
    'Direct question about the author’s own situation.',
  ],
  unclear: ['Too little content to assign a code.'],
}

function ends(s: string, ch: string) {
  return s.trim().endsWith(ch)
}

interface BuiltText {
  text: string
  quote: string
  endsQ: boolean
  /** the question tail, if any, so a wrong label can quote it */
  tailQ?: string
}

function buildText(code: CodeId, forum: ForumId, r: Rng, opts: { questionTail?: boolean } = {}): BuiltText {
  const fill = slotter(forum, r)
  const core = pick(
    opts.questionTail && code === 'request' ? CORE.request.filter((c) => c.q) : CORE[code],
    r,
  )
  const quote = fill(core.t)
  const parts: string[] = []
  const bodyPool = BODY[forum]
  const nBody = { request: 3, offer: 2, venting: 3, logistics: 1, gratitude: 2, rules: 0, resource: 1, offtopic: 0, unclear: 0 }[code]
  const lead = r() < 0.4 && nBody > 0 ? fill(pick(LEADS, r)) : ''
  const story =
    ({ venting: STORY_V, request: STORY_R, gratitude: STORY_G, offer: STORY_O, logistics: STORY_L, resource: STORY_RES } as Partial<Record<CodeId, string[]>>)[code] ?? null
  const pre: string[] = []
  const post: string[] = []
  for (let i = 0; i < nBody; i++) pre.push(fill(pick(bodyPool, r)))
  if (story) {
    pre.push(fill(pick(story, r)))
    if (code === 'venting' || code === 'request') post.push(fill(pick(story, r)))
    if (code === 'venting' || code === 'gratitude') post.push(fill(pick(story, r)))
  }
  if (lead) parts.push(lead)
  parts.push(...Array.from(new Set(pre)))
  parts.push(quote)
  parts.push(...Array.from(new Set(post)).filter((s) => !parts.includes(s)))
  let tailQ: string | undefined
  if (code === 'venting') {
    if (opts.questionTail) {
      tailQ = pick(TAIL_V_Q, r)
      parts.push(tailQ)
    } else if (r() < 0.55) parts.push(pick(TAIL_V, r))
  } else if (code === 'request' && r() < 0.6) parts.push(pick(TAIL_R, r))
  else if (code === 'offer' && r() < 0.7) parts.push(pick(TAIL_O, r))
  else if (code === 'logistics' && r() < 0.6) parts.push(pick(TAIL_L, r))
  else if (code === 'gratitude' && r() < 0.7) parts.push(pick(TAIL_G, r))
  // de-duplicate sentences while keeping order
  const seen = new Set<string>()
  const final = parts.filter((p) => (seen.has(p) ? false : (seen.add(p), true)))
  const text = final.join(' ')
  return { text, quote, endsQ: ends(text, '?'), tailQ }
}

// ── model labels ─────────────────────────────────────────────────────────
/** gold counts (n = 300) */
export const GOLD_COUNTS: Record<CodeId, number> = {
  request: 30, offer: 40, venting: 68, logistics: 48, gratitude: 34,
  rules: 14, resource: 30, offtopic: 20, unclear: 16,
}
/** how the v3 model errs, by gold code, matching the 41 hand-written disagreements */
const ERR: Partial<Record<CodeId, Partial<Record<CodeId, number>>>> = {
  venting: { request: 12, unclear: 3 },
  request: { venting: 2, logistics: 3, unclear: 1, resource: 1, offer: 1 },
  logistics: { request: 2, offer: 1, rules: 1 },
  unclear: { request: 1, venting: 1 },
  offer: { resource: 3, logistics: 2 },
  resource: { offer: 2 },
  gratitude: { offtopic: 1, logistics: 1, offer: 1 },
  offtopic: { gratitude: 1 },
  rules: { logistics: 1 },
}

function modelLabelFor(latent: CodeId, r: Rng): { code: CodeId; wrong: boolean } {
  const errs = ERR[latent] ?? {}
  const total = Object.values(errs).reduce((a, b) => a + (b ?? 0), 0)
  if (r() < total / GOLD_COUNTS[latent]) {
    let x = r() * total
    for (const [c, n] of Object.entries(errs)) {
      x -= n ?? 0
      if (x <= 0) return { code: c as CodeId, wrong: true }
    }
  }
  return { code: latent, wrong: false }
}

const ALT: Partial<Record<CodeId, CodeId>> = {
  request: 'venting', venting: 'request', logistics: 'request', offer: 'resource',
  resource: 'offer', gratitude: 'offer', unclear: 'venting', offtopic: 'unclear', rules: 'logistics',
}

// ── dates / ids ──────────────────────────────────────────────────────────
function randDate(r: Rng) {
  const y = 2021 + Math.floor(r() * 4)
  const m = 1 + Math.floor(r() * 12)
  const d = 1 + Math.floor(r() * 28)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
const usedIds = new Set<string>(HAND_POSTS.map((p) => p.id))
function newId(r: Rng) {
  for (;;) {
    let s = 't3_'
    for (let i = 0; i < 6; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(r() * 36)]
    if (!usedIds.has(s)) {
      usedIds.add(s)
      return s
    }
  }
}
function newAuthor(r: Rng) {
  let s = 'a_'
  for (let i = 0; i < 6; i++) s += '0123456789abcdef'[Math.floor(r() * 16)]
  return s
}
function pickForum(r: Rng): ForumId {
  const x = r()
  return x < 0.374 ? 'MAP' : x < 0.632 ? 'RRN' : x < 0.861 ? 'NHN' : 'GWC'
}

// ── assembled coded posts ────────────────────────────────────────────────
export interface CodedPost {
  id: string
  forum: ForumId
  date: string
  author: string
  text: string
  queuePos: number // 1-based
  labeledAt: number
  isGold: boolean
  gold?: CodeId
  priya?: CodeId
  marcus?: CodeId
  model: { code: CodeId; conf: number; quote: string; rationale: string }
  endsQ: boolean
  /** simulation hooks for the v4 what-if */
  fixAt: 1 | 2 | 3 | null
  breakAt: 2 | null
}

function build(): CodedPost[] {
  const out: Omit<CodedPost, 'queuePos' | 'labeledAt'>[] = []

  // 1. hand-written disagreements
  for (const h of HAND_POSTS) {
    out.push({
      id: h.id, forum: h.forum, date: h.date, author: h.author, text: h.text,
      isGold: true, gold: h.gold, priya: h.priya, marcus: h.marcus,
      model: { code: h.model, conf: h.conf, quote: h.quote, rationale: h.rationale },
      endsQ: ends(h.text, '?'), fixAt: h.fixAt, breakAt: null,
    })
  }

  // 2. generated agreeing gold posts
  const handCount: Partial<Record<CodeId, number>> = {}
  for (const h of HAND_POSTS) handCount[h.gold] = (handCount[h.gold] ?? 0) + 1
  let firstReq = true
  for (const code of Object.keys(GOLD_COUNTS) as CodeId[]) {
    const need = GOLD_COUNTS[code] - (handCount[code] ?? 0)
    for (let i = 0; i < need; i++) {
      const forum = pickForum(rng)
      const forceQ = code === 'request' && firstReq
      const bt = buildText(code, forum, rng, { questionTail: forceQ })
      let breakAt: 2 | null = null
      if (forceQ) {
        firstReq = false
        breakAt = 2
      }
      const priya = code
      const marcus = rng() < 0.065 ? (ALT[code] as CodeId) : code
      out.push({
        id: newId(rng), forum, date: randDate(rng), author: newAuthor(rng), text: bt.text,
        isGold: true, gold: code, priya, marcus,
        model: {
          code,
          conf: 0.74 + rng() * 0.24,
          quote: bt.quote,
          rationale: pick(MODEL_RATIONALE[code], rng),
        },
        endsQ: bt.endsQ, fixAt: null, breakAt,
      })
    }
  }

  // 3. non-gold coded posts (940): latent code → model label with the same error profile
  const codeWeights = Object.entries(GOLD_COUNTS) as [CodeId, number][]
  const latentPick = () => {
    let x = rng() * GOLD_COUNTS_TOTAL
    for (const [c, n] of codeWeights) {
      x -= n
      if (x <= 0) return c
    }
    return 'venting' as CodeId
  }
  for (let i = 0; i < CODED_TOTAL - GOLD_TOTAL; i++) {
    const latent = latentPick()
    const forum = pickForum(rng)
    const qRate = latent === 'venting' ? 0.32 : latent === 'request' ? 0.5 : 0.06
    const qTail = rng() < qRate && (latent === 'venting' || latent === 'request')
    const bt = buildText(latent, forum, rng, { questionTail: qTail })
    let { code, wrong } = modelLabelFor(latent, rng)
    // venting posts that end in a question are where v3 goes wrong
    if (latent === 'venting' && bt.tailQ && rng() < 0.4) {
      code = 'request'
      wrong = true
    } else if (latent === 'venting' && code === 'request' && !bt.tailQ) {
      code = 'venting'
      wrong = false
    }
    let quote = bt.quote
    let rationale = pick(MODEL_RATIONALE[code], rng)
    if (wrong && code === 'request' && latent === 'venting') {
      quote = bt.tailQ ?? bt.quote
      rationale = pick(WRONG_RATIONALE.request!, rng)
    } else if (wrong && code === 'unclear') {
      rationale = pick(WRONG_RATIONALE.unclear!, rng)
    }
    const conf = wrong ? 0.5 + rng() * 0.3 : 0.72 + rng() * 0.26
    out.push({
      id: newId(rng), forum, date: randDate(rng), author: newAuthor(rng), text: bt.text,
      isGold: false,
      model: { code, conf, quote, rationale },
      endsQ: bt.endsQ, fixAt: null, breakAt: null,
    })
  }

  // 4. queue order: gold first (shuffled), then the rest (shuffled), seed 4117
  const gold = shuffle(out.filter((p) => p.isGold))
  const rest = shuffle(out.filter((p) => !p.isGold))
  const ordered = [...gold, ...rest]
  return ordered.map((p, i) => ({
    ...p,
    queuePos: i + 1,
    labeledAt: Math.round(RUN_START + (i + 1) * MS_PER_LABEL),
    model: { ...p.model, conf: Math.round(p.model.conf * 100) / 100 },
  }))
}
const GOLD_COUNTS_TOTAL = Object.values(GOLD_COUNTS).reduce((a, b) => a + b, 0)

export const CODED: CodedPost[] = build()
export const CODED_BY_ID: Record<string, CodedPost> = Object.fromEntries(CODED.map((p) => [p.id, p]))
export const GOLD_POSTS = CODED.filter((p) => p.isGold)
export const NON_GOLD = CODED.filter((p) => !p.isGold)
export const DISAGREEMENTS = GOLD_POSTS.filter((p) => p.gold !== p.model.code)

export const CODED_BY_FORUM: Record<ForumId, number> = { MAP: 0, RRN: 0, NHN: 0, GWC: 0 }
for (const p of CODED) CODED_BY_FORUM[p.forum]++
