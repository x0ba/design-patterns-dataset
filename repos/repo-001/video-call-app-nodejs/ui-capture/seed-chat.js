// Seed data for the "Tidewater_Weekly Sync" room: the people who sit in the
// call and the chat history they post. Delivered through the app's own
// socket.io 'chat' event by participants.js (the app has no database).
//
// Small product team building "Tidewater", a slip-reservation app for marinas.

const people = {
  priya:  { name: 'Priya Raman',      id: '__2903318841__1175502963__' },
  marcus: { name: 'Marcus Oyelaran',  id: '__3640092177__408815230__' },
  hannah: { name: 'Hannah Kowalczyk', id: '__1987456320__3329018744__' },
  diego:  { name: 'Diego Fuentes',    id: '__712250981__2564173309__' },
};

// [who, message]  — replayed in order whenever someone joins the room.
const history = [
  ['priya',  'Morning all! Giving it 2 min for people to trickle in'],
  ['diego',  'here, just grabbing coffee ☕'],
  ['hannah', 'hi hi'],
  ['marcus', 'Joining from the train so my video might cut out, sorry in advance'],
  ['priya',  'Agenda for today: 1) Sprint 42 recap 2) Harbour Point pilot feedback 3) Waitlist flow designs 4) On-call handoff'],
  ['priya',  'Board is here if you want to follow along https://tidewater.atlassian.net/jira/software/projects/TW/boards/3'],
  ['marcus', 'Quick heads up before we start: the nightly availability sync failed again at 02:14 UTC. Same Postgres lock timeout as last Tuesday. I restarted the worker and it caught up by 03:40, no double bookings as far as I can tell, but we need a proper fix this sprint'],
  ['diego',  'ugh again?'],
  ['marcus', 'yeah. I think it is the slip_holds cleanup job overlapping with the sync. Writing it up in TW-1184'],
  ['priya',  'Thanks Marcus. Let\'s make TW-1184 a P1 then'],
  ['hannah', '+1'],
  ['diego',  'Sprint recap from mobile side: iOS 3.8.0 is in TestFlight, 31 testers so far. Crash-free sessions at 99.4%. The one remaining crash is the map view on iPad when you rotate mid-pan'],
  ['diego',  'Android build is blocked on the Stripe SDK bump, should be unblocked tmrw'],
  ['priya',  'Nice. Are we still on track to submit 3.8 to the App Store on the 21st?'],
  ['diego',  'If the iPad thing is fixed by Wed yes. otherwise I\'d rather slip it a few days than ship a crash'],
  ['priya',  'Agreed, quality over date'],
  ['hannah', 'Pilot feedback summary from Harbour Point Marina is in the doc: https://docs.google.com/document/d/1qH7v0-HarbourPoint-pilot-notes/edit'],
  ['hannah', 'TL;DR — the dockmasters love the tide-aware arrival windows, but they hate that cancelling a reservation takes 4 taps and a confirmation modal. Two of them said they just call the boater instead 😅'],
  ['marcus', 'lol that tracks'],
  ['hannah', 'Also they asked for a printable daily arrivals sheet. Apparently the fuel dock has no wifi and they literally tape a paper list to the wall'],
  ['priya',  'Printable sheet seems cheap to do. Marcus, could the existing arrivals endpoint just render a PDF?'],
  ['marcus', 'Probably. We already have the HTML template for the confirmation emails, could reuse that and run it through the pdf service. Half a day maybe'],
  ['priya',  'Let\'s add it to next sprint then'],
  ['diego',  'wait is the pdf service the one that kept OOMing in March'],
  ['marcus', 'that was the old one, we moved to the queue-based worker in April. it\'s been fine'],
  ['diego',  'ok cool 👍'],
  ['hannah', 'Moving on to waitlist designs, Figma link: https://www.figma.com/file/Tw8x2Qp/Tidewater-Waitlist-v3?node-id=214%3A1902'],
  ['hannah', 'Three options on the first page. A is the minimal one (just a "notify me" toggle on full dates), B adds a ranked list of alternative slips nearby, C lets the boater set a max price and auto-book if something opens up'],
  ['priya',  'C is really interesting but auto-booking with someone\'s card on file feels like a legal question. Can we ship B first and keep C as a follow-up?'],
  ['marcus', 'B is also much less work on the backend. C needs a hold + capture flow we don\'t have yet'],
  ['diego',  'B for sure. also on mobile the C settings screen gets really long'],
  ['hannah', 'Okay B it is. I\'ll clean up the edge cases (what if a slip opens for only part of the stay?) and share by Thursday'],
  ['priya',  'perfect'],
  ['marcus', 'Sam can you take a look at the PR for the availability cache when you get a sec? https://github.com/tidewater-app/api/pull/1312 — it\'s the one that cuts the search endpoint p95 from ~900ms to ~180ms'],
  ['marcus', 'there\'s one thing I\'m not sure about: I\'m invalidating the whole marina key when any slip changes. it\'s simple but it means busy marinas basically never hit the cache on Saturday mornings'],
  ['diego',  'could we key it per dock instead of per marina?'],
  ['marcus', 'yeah that\'s plan B, it just makes the invalidation fan-out uglier'],
  ['priya',  'Let\'s not block on perfect. Ship per-marina, add a metric for hit rate, revisit if Saturdays look bad'],
  ['hannah', 'sorry my connection dropped for a sec, did I miss anything about the waitlist?'],
  ['priya',  'Nope, we went with B 🙂'],
  ['hannah', 'yay'],
  ['priya',  'Last thing: on-call handoff. Diego is on this week, Marcus from Monday the 23rd'],
  ['marcus', 'Diego the runbook for the sync job is here https://tidewater.notion.site/Runbook-availability-sync-4c1f0e. if it fails again just restart the worker and ping me, don\'t try to replay the batch manually'],
  ['diego',  'noted. will not touch the batch 🙏'],
  ['priya',  'Also reminder that Thursday is the Harbour Point follow-up call at 10:30 PT, same link as this one'],
  ['hannah', 'Can someone forward me the invite? I only have the old one from October'],
  ['priya',  'Sent!'],
  ['diego',  'btw the office wifi on the 3rd floor is down again so if anyone is coming in tomorrow, grab a desk on 2'],
  ['marcus', 'classic'],
  ['priya',  'Okay I think that\'s everything. Thanks everyone, great sprint. Notes will be in #tidewater-team in 10 min'],
];

// Occasional live messages while the call is running.
const live = [
  ['diego',  'can you all hear me ok? my airpods keep switching to the laptop'],
  ['hannah', 'I\'ll share my screen in a sec for the waitlist states'],
  ['marcus', 'brb 2 min, train is going into a tunnel'],
  ['priya',  'Sam, you\'re on mute I think'],
  ['marcus', 'back'],
  ['diego',  'TestFlight build 3.8.0 (412) just went out with the iPad rotation fix'],
  ['hannah', 'the Figma file is updated, page 2 has the partial-stay edge case'],
  ['priya',  'Running 5 min over, feel free to drop if you have a hard stop'],
];

module.exports = { people, history, live };
