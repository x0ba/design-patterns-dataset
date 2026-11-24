// Mock data for KRVT 92.7 — state as of Monday, Nov 16, 2026, 9:38 pm.

export type Role = 'host' | 'board op' | 'engineer' | 'board member' | 'trainee';

export interface Volunteer {
  id: string;
  name: string;
  roles: Role[];
  title?: string;
  phone: string;
  joined: string; // "Mar 2019"
  note?: string;
  willingEarly?: boolean;
  earlyNote?: string;
}

export interface Show {
  id: string;
  name: string;
  genre: string;
  day: number; // 0 = Mon … 6 = Sun
  start: number; // hour, 24h
  end: number;
  hostIds: string[];
  boardOpId?: string;
  blurb: string;
}

export interface Message {
  id: string;
  from: string; // volunteer id, or "ext:<key>"
  at: string; // ISO
  body: string;
  log?: string;
  asksMe?: boolean;
  email?: { subject: string; to: string; forwardedBy?: string; forwardNote?: string };
}

export interface Thread {
  id: string;
  kind: 'dm' | 'group' | 'email';
  title?: string;
  members: string[];
  messages: Message[];
  lastReadAt: string;
  done?: boolean;
  issueId?: string;
  draft: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  threadId?: string;
  autoOnReply?: boolean;
}

export interface Issue {
  id: string;
  kind: 'incident' | 'cover';
  title: string;
  subtitle: string;
  threadIds: string[];
  checklist: ChecklistItem[];
  resolved?: boolean;
}

export interface SavedReply {
  id: string;
  title: string;
  body: string;
  uses: number;
}

export interface External {
  name: string;
  email: string;
  note: string;
}

export const ME = 'dev';
export const BASE_NOW = new Date(2026, 10, 16, 21, 38, 0);

const t = (month: number, day: number, h: number, m: number) =>
  new Date(2026, month - 1, day, h, m, 0).toISOString();

// ───────────────────────────── Volunteers (45) ─────────────────────────────

export const volunteers: Volunteer[] = [
  { id: 'dev', name: 'Dev Raman', roles: ['board op', 'board member'], title: 'Volunteer coordinator', phone: '(608) 555-0143', joined: 'Jun 2021' },

  // Hosts
  { id: 'lourdes', name: 'Lourdes Ibarra', roles: ['host'], phone: '(608) 555-0177', joined: 'Feb 2022', note: 'Self-ops. Brings guest musicians a few times a year.' },
  { id: 'joy', name: 'Joy Carter', roles: ['host'], phone: '(608) 555-0109', joined: 'Sep 2016', note: 'Longest-running host. Price sheet template lives in the Farm Report folder.' },
  { id: 'marguerite', name: 'Marguerite Olsen', roles: ['host', 'board member'], title: 'Board secretary', phone: '(608) 555-0121', joined: 'Apr 2015' },
  { id: 'ray', name: 'Ray Fontaine', roles: ['host'], phone: '(608) 555-0188', joined: 'Jan 2020' },
  { id: 'hal', name: 'Hal Brecken', roles: ['host'], phone: '(608) 555-0134', joined: 'May 2018' },
  { id: 'kenji', name: 'Kenji Watanabe', roles: ['host'], phone: '(608) 555-0156', joined: 'Aug 2023' },
  { id: 'bev', name: 'Bev Lindgren', roles: ['host'], phone: '(608) 555-0112', joined: 'Mar 2017' },
  { id: 'jaylen', name: 'Jaylen Brooks', roles: ['host'], phone: '(608) 555-0193', joined: 'Sep 2024', note: 'High school senior. Mentoring Sophie.' },
  { id: 'curtis', name: 'Curtis Albright', roles: ['host', 'board op'], phone: '(608) 555-0165', joined: 'Jul 2019', willingEarly: true, earlyNote: 'Covered Farm Report Aug 22. Lives 20 min out on Hwy 14.' },
  { id: 'annmarie', name: 'Ann-Marie Duchesne', roles: ['host'], phone: '(608) 555-0128', joined: 'Oct 2021' },
  { id: 'otis', name: 'Otis Freeman', roles: ['host'], phone: '(608) 555-0181', joined: 'Feb 2014' },
  { id: 'paula', name: 'Paula Kowalczyk', roles: ['host'], phone: '(608) 555-0147', joined: 'Jun 2022' },
  { id: 'rafael', name: 'Rafael Ortega', roles: ['host'], phone: '(608) 555-0170', joined: 'Nov 2020' },
  { id: 'greta', name: 'Greta Sundberg', roles: ['host'], phone: '(608) 555-0116', joined: 'Jan 2023' },
  { id: 'stan', name: 'Stan Wojcik', roles: ['host'], phone: '(608) 555-0139', joined: 'Mar 2012' },
  { id: 'mira', name: 'Mira Castellanos', roles: ['host'], phone: '(608) 555-0152', joined: 'Apr 2024' },
  { id: 'ellen', name: 'Ellen Marsh', roles: ['host'], phone: '(608) 555-0104', joined: 'May 2017', willingEarly: true, earlyNote: 'Already in at 8 for Swap Shop — would make a 4-hour shift.' },
  { id: 'wendell', name: 'Wendell Price', roles: ['host'], phone: '(608) 555-0186', joined: 'Sep 2019' },
  { id: 'dana', name: 'Dana Whitaker', roles: ['host'], phone: '(608) 555-0125', joined: 'Aug 2021', note: 'Coaches JV girls basketball.' },
  { id: 'andre', name: 'Andre Toussaint', roles: ['host'], phone: '(608) 555-0161', joined: 'Dec 2018' },
  { id: 'clarence', name: 'Clarence Mabry', roles: ['host'], phone: '(608) 555-0118', joined: 'Jun 2013' },
  { id: 'tamsin', name: 'Tamsin Reyes', roles: ['host'], phone: '(608) 555-0174', joined: 'Mar 2023', willingEarly: true, earlyNote: "Hasn't run Farm Report before — would need Joy's price sheet walkthrough." },
  { id: 'lionel', name: 'Lionel Hatch', roles: ['host'], phone: '(608) 555-0131', joined: 'Oct 2016' },

  // Engineers
  { id: 'walt', name: 'Walt Shumaker', roles: ['engineer'], title: 'Volunteer chief engineer', phone: '(608) 555-0102', joined: 'Mar 2011', note: 'Usually at the studio Wednesdays after 6.' },
  { id: 'nadia', name: 'Nadia Brandt', roles: ['engineer', 'board op'], phone: '(608) 555-0159', joined: 'Jan 2021', note: 'Handles EAS logs and weekly tests.' },
  { id: 'leon', name: 'Leon Achebe', roles: ['engineer'], phone: '(608) 555-0145', joined: 'Jul 2024', note: 'Learning the transmitter site from Walt.' },

  // Board
  { id: 'carol', name: 'Carol Whitfield', roles: ['board member'], title: 'Board chair', phone: '(608) 555-0110', joined: 'Feb 2010' },
  { id: 'frank', name: 'Frank Ostrowski', roles: ['board member'], title: 'Treasurer', phone: '(608) 555-0127', joined: 'May 2014' },
  { id: 'denise', name: 'Denise Yazzie', roles: ['board member'], phone: '(608) 555-0163', joined: 'Sep 2020' },
  { id: 'ben', name: 'Ben Larkin', roles: ['board member', 'board op'], phone: '(608) 555-0190', joined: 'Jan 2022' },

  // Board ops
  { id: 'tess', name: 'Tess Moreau', roles: ['board op'], phone: '(608) 555-0136', joined: 'Apr 2022' },
  { id: 'gil', name: 'Gil Pacheco', roles: ['board op'], phone: '(608) 555-0179', joined: 'Oct 2019' },
  { id: 'rhonda', name: 'Rhonda Ames', roles: ['board op'], phone: '(608) 555-0114', joined: 'Jun 2018' },
  { id: 'victor', name: 'Victor Huang', roles: ['board op'], phone: '(608) 555-0142', joined: 'Feb 2023' },
  { id: 'shay', name: "Shay O'Connell", roles: ['board op'], phone: '(608) 555-0167', joined: 'Aug 2022' },
  { id: 'iris', name: 'Iris Bergstrom', roles: ['board op'], phone: '(608) 555-0105', joined: 'Mar 2021' },
  { id: 'malik', name: 'Malik Jefferson', roles: ['board op'], phone: '(608) 555-0183', joined: 'Nov 2023' },
  { id: 'corinne', name: 'Corinne Abbott', roles: ['board op'], phone: '(608) 555-0150', joined: 'May 2020' },
  { id: 'pete', name: 'Pete Sorensen', roles: ['board op'], phone: '(608) 555-0122', joined: 'Jul 2017' },
  { id: 'lena', name: 'Lena Fischer', roles: ['board op'], phone: '(608) 555-0198', joined: 'Jan 2025' },

  // Trainees
  { id: 'abel', name: 'Abel Nguyen', roles: ['trainee'], phone: '(608) 555-0171', joined: 'Oct 2026', note: 'Signed up at the October open house. Free most evenings and Saturdays.' },
  { id: 'sophie', name: 'Sophie Lindqvist', roles: ['trainee'], phone: '(608) 555-0133', joined: 'Sep 2026', note: '2 of 3 shadow shifts done.' },
  { id: 'marcus', name: 'Marcus Bell', roles: ['trainee'], phone: '(608) 555-0148', joined: 'Aug 2026', note: 'Board-op class done Oct 24; shadowing Wednesdays.' },
  { id: 'hannah', name: 'Hannah Cho', roles: ['trainee'], phone: '(608) 555-0119', joined: 'Oct 2026', note: 'Interested in news/public affairs.' },
];

export const externals: Record<string, External> = {
  'ext:margit': { name: 'Margit Halvorsen', email: 'm.halvorsen@riverbend-mail.com', note: 'Listener · $10/mo sustainer since 2023' },
};

// ───────────────────────────── Shows (23) ─────────────────────────────
// day: 0 Mon … 6 Sun

export const shows: Show[] = [
  { id: 'coffee', name: 'Coffee & Current Events', genre: 'Local news & talk', day: 0, start: 7, end: 9, hostIds: ['marguerite'], boardOpId: 'gil', blurb: 'Headlines from the county paper, school closings, a guest at 8.' },
  { id: 'lunch', name: 'Lunch Counter', genre: 'Interviews', day: 0, start: 12, end: 13, hostIds: ['ray'], blurb: 'One local guest, one hour.' },
  { id: 'lowwater', name: 'Low Water Blues', genre: 'Blues', day: 0, start: 18, end: 20, hostIds: ['hal'], blurb: 'Delta to Chicago, mostly vinyl.' },
  { id: 'garage', name: 'Garage Sale', genre: 'Garage rock & punk', day: 0, start: 20, end: 22, hostIds: ['kenji'], blurb: 'Loud, local, and from the 7" bin.' },

  { id: 'almanac', name: 'Tuesday Almanac', genre: 'Community calendar', day: 1, start: 7, end: 9, hostIds: ['bev'], blurb: 'Birthdays, church suppers, river levels.' },
  { id: 'afterschool', name: 'After School Special', genre: 'Youth-hosted', day: 1, start: 16, end: 18, hostIds: ['jaylen'], blurb: 'Hosted by high schoolers. Sophie shadowing.' },
  { id: 'bluegrass', name: 'Bluegrass Bottomland', genre: 'Bluegrass & old-time', day: 1, start: 19, end: 21, hostIds: ['curtis'], blurb: 'Picking, fiddle tunes, the occasional live set.' },

  { id: 'townhall', name: 'Town Hall Recap', genre: 'Public affairs', day: 2, start: 18, end: 19, hostIds: ['annmarie'], boardOpId: 'rhonda', blurb: 'City council and school board, in plain English.' },
  { id: 'deepcuts', name: 'Deep Cuts Jazz', genre: 'Jazz', day: 2, start: 20, end: 22, hostIds: ['otis'], blurb: 'Hard bop and beyond.' },

  { id: 'harvest', name: 'Harvest Kitchen', genre: 'Food & cooking', day: 3, start: 7, end: 9, hostIds: ['paula'], blurb: 'Seasonal recipes and call-in questions.' },
  { id: 'lahora', name: 'La Hora Ribereña', genre: 'Spanish-language', day: 3, start: 18, end: 20, hostIds: ['rafael'], boardOpId: 'victor', blurb: 'News, música, y comunidad.' },
  { id: 'nightmarket', name: 'Night Market', genre: 'World music', day: 3, start: 20, end: 22, hostIds: ['lourdes'], blurb: 'Cumbia, highlife, qawwali, and whatever Lourdes found this week.' },

  { id: 'library', name: 'Library Reads', genre: 'Books', day: 4, start: 12, end: 14, hostIds: ['greta'], blurb: 'Staff picks and a serialized reading.' },
  { id: 'polka', name: 'Polka Party Line', genre: 'Polka', day: 4, start: 19, end: 21, hostIds: ['stan'], blurb: 'Requests and dedications since 2012.' },
  { id: 'static', name: 'Static & Signal', genre: 'Electronic', day: 4, start: 21, end: 23, hostIds: ['mira'], blurb: 'Ambient to techno.' },

  { id: 'farm', name: 'Farm Report', genre: 'Agriculture', day: 5, start: 6, end: 8, hostIds: ['joy'], blurb: 'Co-op prices, NWS forecast, river stage, and a little old country.' },
  { id: 'swap', name: 'Saturday Swap Shop', genre: 'Call-in buy & sell', day: 5, start: 8, end: 10, hostIds: ['ellen'], boardOpId: 'pete', blurb: 'Listeners call in to buy, sell, and trade.' },
  { id: 'kids', name: "Kids' Corner", genre: 'Family', day: 5, start: 10, end: 12, hostIds: ['wendell'], boardOpId: 'tess', blurb: 'Stories and songs; kid co-hosts most weeks.' },
  { id: 'gameday', name: 'Game Day Huddle', genre: 'High school sports', day: 5, start: 14, end: 16, hostIds: ['dana'], boardOpId: 'malik', blurb: 'Scores, coach call-ins, the week ahead.' },
  { id: 'soul', name: 'Saturday Night Soul', genre: 'Soul & R&B', day: 5, start: 20, end: 23, hostIds: ['andre'], blurb: 'Stax, Motown, Philly, and Andre’s record collection.' },

  { id: 'gospel', name: 'Sunday Gospel Hour', genre: 'Gospel', day: 6, start: 7, end: 9, hostIds: ['clarence'], blurb: 'Quartets, choirs, and church announcements.' },
  { id: 'folk', name: 'Folk on the Levee', genre: 'Folk', day: 6, start: 9, end: 11, hostIds: ['tamsin'], blurb: 'Songwriters old and new.' },
  { id: 'otr', name: 'Old Time Radio Theater', genre: 'Radio drama', day: 6, start: 16, end: 18, hostIds: ['lionel'], boardOpId: 'shay', blurb: 'Public-domain dramas with Lionel’s introductions.' },
];

// Week shown in the schedule: Mon Nov 16 – Sun Nov 22, 2026
export const WEEK_START = new Date(2026, 10, 16);

// ───────────────────────────── Threads ─────────────────────────────

const LOG = `silence/failover log · Thu 2026-11-12 · Studio A
21:40:12  PGM       level -18 dBFS
21:42:06  PGM       level below -50 dBFS
21:43:36  SILENCE   90s below threshold → failover
21:43:36  FAILOVER  START → playout-01
21:43:46  FAILOVER  retry 1 … no ack
21:43:56  FAILOVER  retry 2 … no ack
automation failover: no response 21:42–21:53
21:53:19  PGM       level -21 dBFS (live mic)`;

let mid = 0;
const m = (from: string, at: string, body: string, extra: Partial<Message> = {}): Message => ({
  id: `m${++mid}`,
  from,
  at,
  body,
  ...extra,
});

export const threads: Thread[] = [
  {
    id: 'th-joy',
    kind: 'dm',
    members: ['dev', 'joy'],
    issueId: 'cover-farm',
    lastReadAt: t(10, 17, 9, 0),
    draft: '',
    messages: [
      m('joy', t(10, 17, 8, 14), 'Can you remind whoever has Saturday 8am to leave the weather radio plugged in? Somebody unplugged it again and I missed the 6:15 forecast drop.'),
      m('dev', t(10, 17, 8, 52), "Will do — I'll post in Weekend hosts and tape a note on the outlet."),
      m('joy', t(11, 16, 19, 41), "flu, can't do Sat"),
      m('joy', t(11, 16, 19, 43), 'sorry. price sheet template is in the Farm Report folder, co-op posts numbers by 5:30am'),
    ],
  },
  {
    id: 'th-weekend',
    kind: 'group',
    title: 'Weekend hosts',
    members: ['dev', 'joy', 'ellen', 'wendell', 'dana', 'andre', 'clarence', 'tamsin', 'lionel', 'tess', 'shay', 'malik', 'curtis', 'pete'],
    lastReadAt: t(11, 13, 22, 0),
    draft: '',
    messages: [
      m('tess', t(11, 7, 12, 20), 'Studio B headphone amp is crackling on channel 2 again. Use channel 3 for now — I told Walt.'),
      m('andre', t(11, 7, 13, 2), 'Thanks Tess. Found that out the hard way last week.'),
      m('ellen', t(11, 9, 10, 31), 'Swap Shop had 31 calls Saturday, a record. Somebody sold a canoe on air in under four minutes.'),
      m('dev', t(11, 10, 21, 15), 'Reminder: holiday parade is Sat Nov 28, Main St closed 9 to 1. Park behind the library and use the back door — code hasn’t changed.'),
      m('clarence', t(11, 14, 8, 5), 'Coffee maker was left on overnight again Saturday. Whoever is last out on Saturday night, please check it. The carafe is cracked now.'),
      m('andre', t(11, 14, 23, 30), 'Guilty. Sorry all, I’ll replace the carafe.'),
      m('lionel', t(11, 15, 17, 10), 'Anybody know where the spare XLR cables went? The bin in the closet is empty.'),
      m('shay', t(11, 15, 18, 40), 'I took two to the fairgrounds remote, will bring them back Saturday.'),
      m('pete', t(11, 16, 20, 12), "Heard Joy's down with the flu. Is anyone covering Farm Report Saturday? I'm on board for Swap Shop at 8 and can come in early to help whoever it is, but I can't host."),
      m('ellen', t(11, 16, 20, 40), "I could do it if nobody else can, but four hours straight on a Saturday is a lot. Dev, let me know.", { asksMe: true }),
    ],
  },
  {
    id: 'th-lourdes',
    kind: 'dm',
    members: ['dev', 'lourdes'],
    issueId: 'deadair',
    lastReadAt: t(11, 13, 12, 30),
    draft: '',
    messages: [
      m('lourdes', t(9, 24, 18, 2), 'Dev, could I bring a guest on Oct 8? A friend of mine plays oud and would do two songs live.'),
      m('dev', t(9, 24, 21, 40), 'Love that. Studio A has the two good condenser mics — let Walt know if you need the piano channel opened up. Just put his name in the program log.'),
      m('lourdes', t(10, 8, 22, 12), 'Hamid was a hit! Three people called in during the show.'),
      m('dev', t(10, 9, 7, 30), 'I heard part of it on my drive home. Beautiful.'),
      m('lourdes', t(11, 13, 9, 12), 'Sorry about Thursday—can we talk?'),
    ],
  },
  {
    id: 'th-walt',
    kind: 'dm',
    members: ['dev', 'walt'],
    issueId: 'deadair',
    lastReadAt: t(11, 14, 21, 0),
    draft: '',
    messages: [
      m('walt', t(10, 30, 16, 5), 'Studio A console channel 4 fader replaced. $38 part, receipt is in the envelope for Frank.'),
      m('dev', t(10, 30, 19, 22), 'Thank you Walt.'),
      m('dev', t(11, 13, 8, 2), "Morning Walt. We got a listener email about dead air during Night Market last night, around 9:45. Lourdes says sorry but I haven't talked to her yet. Did the silence sensor or the automation do anything?"),
      m('walt', t(11, 14, 14, 47), 'Pulled the log off the automation PC. Here’s the relevant bit:', { log: LOG }),
      m('walt', t(11, 14, 14, 50), 'Silence alarm tripped like it should at 90 seconds. Failover never got an answer from the playout box, so nothing took over until Lourdes got audio back at 21:53. Either the playout service was hung or it rebooted itself for updates — I’ve seen that once before. Won’t know until I can sit at it. I’m at the studio Wednesday after 6.'),
    ],
  },
  {
    id: 'th-listener',
    kind: 'email',
    title: 'Dead air Thursday night??',
    members: ['dev', 'ext:margit'],
    issueId: 'deadair',
    lastReadAt: t(11, 13, 7, 40),
    draft: '',
    messages: [
      m('ext:margit', t(11, 13, 6, 58), "To whoever reads this,\n\nI had KRVT on in the shop Thursday evening for the world music program and around a quarter to ten it just went silent. Nothing for ten minutes or more. I thought my radio had died, then I checked another station and it was fine.\n\nI give $10 a month to this station because I like having something local on. I'd like to know somebody is minding the store. Is this going to keep happening?\n\nMargit Halvorsen\nHalvorsen Upholstery, 214 Front St.", {
        email: {
          subject: 'Dead air Thursday night??',
          to: 'info@krvt927.org',
          forwardedBy: 'carol',
          forwardNote: 'Fwd from the info@ box. Dev, can you handle this one? She’s a sustainer. —C',
        },
      }),
    ],
  },
  {
    id: 'th-board',
    kind: 'group',
    title: 'Spring pledge drive',
    members: ['dev', 'carol', 'frank', 'marguerite', 'denise', 'ben'],
    lastReadAt: t(11, 11, 21, 0),
    draft: '',
    messages: [
      m('carol', t(10, 6, 19, 12), "Starting a thread for the spring drive so it doesn't get buried in meeting notes. Proposed dates: April 12–18. Clear of Easter, and before planting gets busy for the farm folks."),
      m('frank', t(10, 6, 20, 30), 'Works for me. For reference: last spring we raised $5,840 from 212 pledges. Fall was $4,915, down a bit.'),
      m('denise', t(10, 7, 7, 45), 'Can we set the goal at $6,500? The transmitter UPS needs replacing and Walt priced it at $1,100.'),
      m('ben', t(10, 7, 12, 10), '$6,500 feels doable if we get a match. Riverside Hardware did $500 last year.'),
      m('marguerite', t(10, 8, 8, 3), 'I can ask Henrik at Riverside again. He liked the on-air thank-yous.'),
      m('carol', t(10, 8, 9, 15), 'Please do. Dev — can we get volunteers on the phones evenings that week? Last year we were thin on Tuesday and Wednesday.'),
      m('dev', t(10, 9, 22, 4), "I'll put out a sign-up in November once the winter schedule settles. 2 people × 4 shifts a day × 7 days = 56 slots. Realistically we fill about 40 and hosts pitch on their own shows."),
      m('frank', t(10, 13, 18, 0), 'Premiums: we still have 38 tote bags and 60 mugs from last year. Mugs cost us $6.20 each.'),
      m('denise', t(10, 13, 19, 30), 'Could we do something local instead of more mugs? The pottery co-op offered small bowls at cost.'),
      m('ben', t(10, 14, 8, 12), 'Bowls are lovely but shipping and breakage for out-of-town donors worries me.'),
      m('denise', t(10, 14, 9, 0), 'Pickup only. Most of our donors are within 20 miles anyway.'),
      m('carol', t(10, 15, 20, 45), "Let's table premiums until Frank has numbers from the co-op."),
      m('marguerite', t(10, 20, 10, 2), 'Henrik says yes to a match: $750 this year, as long as we mention the store during morning drive.'),
      m('carol', t(10, 20, 10, 30), 'Wonderful. That’s a 50% bump.'),
      m('frank', t(10, 21, 17, 15), 'I need it in writing for the books. Marguerite, can you get an email from him?'),
      m('marguerite', t(10, 22, 9, 40), 'Done, forwarded to you.'),
      m('ben', t(10, 27, 19, 5), 'Online giving: our current form charges 3.9% + 30¢. I’d like to switch to one with a nonprofit rate before April.'),
      m('frank', t(10, 27, 20, 20), 'If it exports to a spreadsheet I’m in. The last switch cost me a whole weekend.'),
      m('denise', t(10, 28, 12, 30), 'Co-op bowls are $14 each at cost, minimum order of 40.'),
      m('frank', t(10, 29, 8, 0), "That's $560 up front. We'd want the bowl at the $120 level to come out comfortably ahead."),
      m('carol', t(10, 29, 9, 10), 'Proposal: tote at $60, bowl at $120, mugs at $40 to clear inventory.'),
      m('ben', t(11, 2, 18, 45), 'Agree. I’d also like a sustainer option — $10/month, no premium. Those donors stick.'),
      m('marguerite', t(11, 3, 7, 50), 'Our sustainers are the most loyal listeners we have. They’re also the ones who write in when something goes wrong, which is its own kind of loyalty.'),
      m('dev', t(11, 3, 21, 30), 'Phone-shift sign-up draft is ready. I’ll bring it to the November meeting.'),
      m('carol', t(11, 5, 21, 0), 'From the Nov meeting: dates April 12–18 approved, goal $6,500, premiums as proposed. Ben to research the new giving platform. Dev to circulate the phone sign-up after Thanksgiving.'),
      m('frank', t(11, 9, 19, 40), 'Budget note: $6,500 plus the $750 match covers the UPS and the new studio mic arm, with about $1,900 left toward the license renewal fund.'),
      m('denise', t(11, 10, 12, 15), "Could we add a short on-air spot recorded by the kids from Kids' Corner? Wendell said they'd love to."),
      m('carol', t(11, 10, 13, 0), 'Yes! Dev, can you check with Wendell on timing?'),
      m('dev', t(11, 11, 20, 50), 'Will do.'),
      m('ben', t(11, 15, 16, 20), 'Heads up — Carol mentioned the dead air Thursday. If that comes up during the drive we should have an answer ready. Donors notice these things.'),
      m('carol', t(11, 15, 18, 2), "Dev's on it. Let's let him sort it out before we pile on. Next agenda item: who's writing the drive scripts this year?"),
    ],
  },
  {
    id: 'th-abel',
    kind: 'dm',
    members: ['dev', 'abel'],
    lastReadAt: t(11, 12, 21, 30),
    draft: '',
    messages: [
      m('abel', t(11, 12, 16, 6), "Hi Dev! I filled out the volunteer form at the open house in October and Carol said you're the person to ask about board-op training. I'm free most evenings and Saturdays. Is there a session coming up? Thanks, Abel"),
    ],
  },
  {
    id: 'th-ray',
    kind: 'dm',
    members: ['dev', 'ray'],
    lastReadAt: t(11, 10, 20, 0),
    done: true,
    draft: '',
    messages: [
      m('ray', t(11, 10, 13, 22), 'Can Greta take my Nov 23 Lunch Counter? I’ll do her Library Reads on Dec 4. We already talked.'),
      m('dev', t(11, 10, 19, 48), 'Fine by me — you’re both trained on the board. I’ll update the schedule and the program log.'),
      m('ray', t(11, 10, 19, 55), 'Thanks!'),
    ],
  },
  {
    id: 'th-nadia',
    kind: 'dm',
    members: ['dev', 'nadia'],
    lastReadAt: t(11, 9, 22, 0),
    draft: '',
    messages: [
      m('nadia', t(11, 9, 18, 30), 'Weekly EAS test logged, all good. Monthly test (RMT) came in Nov 4 and was relayed within the window.'),
      m('dev', t(11, 9, 21, 5), 'Thanks Nadia, appreciate you keeping that tidy.'),
    ],
  },
  {
    id: 'th-sophie',
    kind: 'dm',
    members: ['dev', 'sophie'],
    lastReadAt: t(11, 6, 20, 0),
    draft: '',
    messages: [
      m('sophie', t(11, 4, 18, 15), 'Second shadow shift done with Jaylen! I ran the board for the last half hour.'),
      m('dev', t(11, 4, 21, 0), 'That’s great. One more and you can go solo — want Tuesday Dec 1 again?'),
      m('sophie', t(11, 5, 7, 40), 'Yes please!'),
      m('dev', t(11, 6, 19, 30), 'You’re on the schedule.'),
    ],
  },
  {
    id: 'th-frank',
    kind: 'dm',
    members: ['dev', 'frank'],
    lastReadAt: t(11, 11, 12, 0),
    draft: '',
    messages: [
      m('frank', t(11, 11, 9, 5), "Walt's $38 fader reimbursement went out. Also, the program log binder for October is missing pages 12–14. Not urgent."),
      m('dev', t(11, 11, 11, 50), 'Found them in Studio B under the mic stand. Back in the binder.'),
    ],
  },
];

// ───────────────────────────── Issues ─────────────────────────────

export const issues: Issue[] = [
  {
    id: 'deadair',
    kind: 'incident',
    title: 'Dead air during Night Market',
    subtitle: 'Thu Nov 12 · 21:42–21:53 · 11 min',
    threadIds: ['th-lourdes', 'th-walt', 'th-listener'],
    checklist: [
      { id: 'c1', label: "Hear Lourdes' side", done: false, threadId: 'th-lourdes', autoOnReply: true },
      { id: 'c2', label: 'Confirm with Walt whether the failover failed', done: false, threadId: 'th-walt', autoOnReply: true },
      { id: 'c3', label: 'Reply to the listener', done: false, threadId: 'th-listener', autoOnReply: true },
      { id: 'c4', label: 'Note it in the station log', done: false },
    ],
  },
  {
    id: 'cover-farm',
    kind: 'cover',
    title: 'Farm Report needs cover',
    subtitle: 'Sat Nov 21 · 6–8 am · Joy out sick',
    threadIds: ['th-joy'],
    checklist: [
      { id: 'f1', label: 'Tell Joy not to worry', done: false, threadId: 'th-joy', autoOnReply: true },
      { id: 'f2', label: 'Find a fill-in host', done: false },
      { id: 'f3', label: 'Let Weekend hosts know', done: false, threadId: 'th-weekend', autoOnReply: true },
    ],
  },
];

export const timeline = [
  { at: 'Thu 21:42', text: 'Program audio drops below −50 dBFS in Studio A', src: 'Walt’s log' },
  { at: 'Thu 21:43', text: 'Silence alarm fires; failover sends START — no answer', src: 'Walt’s log' },
  { at: 'Thu 21:53', text: 'Live mic back on air', src: 'Walt’s log' },
  { at: 'Fri 06:58', text: 'Margit Halvorsen emails info@', src: 'Listener' },
  { at: 'Fri 09:12', text: 'Lourdes: “Sorry about Thursday—can we talk?”', src: 'Lourdes' },
  { at: 'Sat 14:50', text: 'Walt: playout box hung or rebooted; can check Wed after 6', src: 'Walt' },
];

// ───────────────────────────── Saved replies ─────────────────────────────

export const savedReplies: SavedReply[] = [
  {
    id: 'sr-training',
    title: 'Training sign-up',
    uses: 14,
    body: "Hi {first_name}, thanks for your patience, and welcome to KRVT!\n\nBoard-op training is two parts: one 90-minute session at the studio (console, levels, EAS, the program log), then two shadow shifts with an experienced op.\n\nUpcoming sessions, both with Walt:\n• Sat Nov 28, 10:00 am (parade day — park behind the library)\n• Wed Dec 2, 7:00 pm\n\nReply with the one that works and I'll put you down. The studio stairs are steep, so wear sensible shoes.\n\n— Dev",
  },
  {
    id: 'sr-swap',
    title: 'Swap etiquette',
    uses: 22,
    body: "Hi {first_name}, thanks for the heads-up. Quick reminder on swaps: post in your day's group at least 48 hours ahead, make sure whoever covers is trained on the board, and tell me once it's settled so the schedule and program log stay right. Under 48 hours, message me directly and I'll help find someone.\n\n— Dev",
  },
  {
    id: 'sr-checkin',
    title: 'Check-in after an on-air problem',
    uses: 3,
    body: "Hi {first_name}, of course we can talk, and thank you for reaching out. Nobody's upset. I just want to understand what happened so we can fix whatever needs fixing.\n\nWalt's log shows our automation backup should have taken over after 90 seconds and didn't, so at least part of this is on the equipment side, not you.\n\nCould you do a quick call tomorrow on my lunch break (12:15–12:45) or any time after 7 pm?",
  },
  {
    id: 'sr-getwell',
    title: 'Get well — I’ll find cover',
    uses: 9,
    body: "Feel better, {first_name}. I'll find someone for {show}. Don't give it another thought, just rest. Thanks for letting me know early.",
  },
  {
    id: 'sr-listener',
    title: 'Listener: thanks for flagging a problem',
    uses: 5,
    body: "Dear {first_name},\n\nThank you for writing, and for supporting KRVT every month. You're right to expect better. On Thursday, Nov 12 we were off the air from 9:42 to 9:53 pm. Our backup system is supposed to take over automatically within 90 seconds and it didn't. Our volunteer engineer is at the studio this week to find out why and test the fix.\n\nWe're a station run entirely by volunteers, and listeners like you who tell us when something goes wrong are a big part of how we keep it running.\n\nWith thanks,\nDev Raman\nVolunteer Coordinator, KRVT 92.7",
  },
  {
    id: 'sr-cover',
    title: 'Ask someone to fill in',
    uses: 17,
    body: "Hi {first_name}, are you able to cover {show} this {when}? The regular host is out sick. No pressure at all; a quick yes or no helps me plan. Thanks!",
  },
];

export const trainingSessions = [
  { when: 'Sat Nov 28 · 10:00 am', lead: 'Walt Shumaker', seats: '2 of 4 open' },
  { when: 'Wed Dec 2 · 7:00 pm', lead: 'Walt Shumaker', seats: '3 of 4 open' },
];
