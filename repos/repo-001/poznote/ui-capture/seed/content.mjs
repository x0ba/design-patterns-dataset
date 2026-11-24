// Content for the seeded account: Maya Lindqvist, a product engineer at a
// mid-sized logistics SaaS company, who has used Poznote for about a year for
// work and personal notes. Each note: { title, type, tags, days (days ago it
// was created), upd (days ago last updated), body, flags }.

const pick = (arr, i) => arr[i % arr.length];

// ---------------------------------------------------------------- Work ----
export const work = {};

work['Projects/Route Optimizer v3'] = [
  { title: 'Route Optimizer v3 — project brief', type: 'markdown', tags: 'routing,planning', days: 210, upd: 12, fav: true, pin: true, icon: 'lucide-map', body:
`# Route Optimizer v3

**Owner:** Maya L. · **Eng lead:** Tomasz K. · **PM:** Aisha R.
**Target:** GA by end of Q1 2027

## Problem
Dispatchers at mid-size carriers still re-sequence ~30% of stops by hand. The v2 solver ignores
time windows tighter than 30 minutes and has no notion of driver breaks (EU 561/2006).

## Goals
- Respect hard time windows down to 10 min
- Model mandatory breaks (45 min after 4h30 driving)
- Re-optimise mid-route when a stop is added or cancelled (< 3 s p95)
- Keep total km within 2% of v2 on the benchmark set

## Non-goals
- Multi-depot (pushed to v3.1)
- Electric-vehicle charging stops

## Milestones
| Milestone | Date | Status |
|---|---|---|
| Solver spike (OR-Tools vs. in-house) | 2026-06-15 | ✅ done |
| Time-window constraints | 2026-08-30 | ✅ done |
| Driver breaks | 2026-10-31 | 🟡 in review |
| Live re-optimisation | 2026-12-20 | ⏳ in progress |
| Beta with Halvorsen Freight | 2027-01-15 | ⏳ |

## Open questions
1. Do we expose the "soft window" penalty weight in the UI, or keep it per-tenant config?
2. Who owns the benchmark dataset refresh — data team or us?

See also [[Solver benchmark results]] and [[Halvorsen Freight — beta onboarding]].
` },
  { title: 'Solver benchmark results', type: 'markdown', tags: 'routing,benchmarks', days: 160, upd: 41, body:
`# Solver benchmark — June/July runs

Dataset: 412 real routes from 9 tenants (anonymised), 18–140 stops each.

| Solver | Avg km vs v2 | p95 solve time | Window violations |
|---|---|---|---|
| v2 (baseline) | 0.0% | 1.8 s | 7.4% |
| OR-Tools GLS 5s | -3.1% | 5.0 s | 0.6% |
| OR-Tools GLS 2s | -2.4% | 2.0 s | 0.9% |
| In-house LNS | -1.7% | 1.1 s | 2.2% |

**Decision (Jul 9):** go with OR-Tools, 2 s time limit for interactive, 5 s for overnight batch.

Notes:
- 140-stop routes blow past 2 s on the small worker pool → need the c6i.2xlarge pool
- Window violations in the in-house solver are mostly at the *end* of the day; probably the
  lateness penalty is linear when it should be quadratic
- Re-run after break constraints land (expect +1–2% km)
` },
  { title: 'Driver breaks — design notes', type: 'markdown', tags: 'routing,compliance', days: 95, upd: 18, body:
`# Driver breaks (EU 561/2006)

Rules we model:
- 45 min break after **4h30** cumulative driving (may be split 15 + 30, in that order)
- Daily driving max 9h (10h twice a week — *not modelled yet*)

Approach: breaks as optional "virtual stops" with a dimension for cumulative driving time.
Solver inserts them; UI shows them as grey pills between stops.

~~Alternative: post-process the route and push stops later~~ — rejected, it breaks time windows.

### Edge cases found in review
- Driver starts shift with carried-over driving time from a previous route (night shifts)
- Ferry crossings count as rest if > 1h — Halvorsen asked for this explicitly
- Break inside a customer's yard: allowed if the stop's service time > 45 min

TODO: ask legal whether we need to *enforce* or just *warn*.
` },
  { title: 'Live re-optimisation — API sketch', type: 'markdown', tags: 'routing,api', days: 40, upd: 3, body:
`# Live re-optimisation

\`\`\`http
POST /v3/routes/{routeId}/reoptimise
{
  "event": "stop_added",
  "stop": { "id": "S-88123", "lat": 59.913, "lng": 10.752, "window": ["13:00", "14:30"], "service_min": 12 },
  "freeze_next": 2
}
\`\`\`

- \`freeze_next\`: number of upcoming stops the driver has already been told about; never reorder those
- Response returns a diff, not the full route, so the driver app can animate changes
- Idempotency key = event id from the dispatcher console

Concern: if two dispatchers edit the same route within the solve window we get a lost update.
Option A: optimistic lock on route version. Option B: queue per route. Leaning A.
` },
  { title: 'Halvorsen Freight — beta onboarding', type: 'note', tags: 'customers,routing', days: 22, upd: 2, color: 'yellow', body:
`<h2>Halvorsen Freight — beta onboarding</h2>
<p><strong>Contacts:</strong> Ingrid Halvorsen (COO), Petter Moe (dispatch lead)</p>
<ul>
<li>34 trucks, 2 depots (Drammen, Moss) — only Drammen in beta</li>
<li>They import stops from their ERP as CSV every morning at 05:30</li>
<li>Ferry Moss–Horten is part of 6 daily routes → needs the ferry-as-rest rule</li>
</ul>
<h3>Checklist</h3>
<ul>
<li>Tenant flag <code>routing_v3_beta</code> enabled on staging ✔</li>
<li>CSV import mapping reviewed with Petter ✔</li>
<li>Training session for 4 dispatchers — booked Dec 3</li>
<li>Shadow mode for one week (v3 computes, v2 is used) — starting Dec 8</li>
</ul>
<p>Petter's main worry: drivers seeing their route change while driving. Make sure <em>freeze_next</em> defaults to 3 for them.</p>` },
];

work['Projects/Billing migration'] = [
  { title: 'Stripe → Adyen migration plan', type: 'markdown', tags: 'billing,migration', days: 300, upd: 150, body:
`# Billing provider migration

Status: **done** (cut-over completed 2026-05-04). Keeping this for reference.

## Phases
1. Dual-write invoices to both providers (2 weeks)
2. Migrate stored payment methods via network tokens — 96.8% migrated automatically
3. Manual outreach for the remaining 3.2% (412 customers)
4. Cut-over, Stripe in read-only for 90 days

## Lessons
- Network tokens worked better than expected for Visa, worse for Amex
- We underestimated the number of customers paying by SEPA direct debit (18%!)
- Finance needed a reconciliation report *before* cut-over, not after
` },
  { title: 'Invoice rounding bug — postmortem', type: 'markdown', tags: 'billing,postmortem,incident', days: 180, upd: 176, body:
`# Postmortem: invoice line rounding (INC-2291)

**Impact:** 1,184 invoices in April were off by 0.01–0.04 EUR. No customer complaints, found by finance.

**Root cause:** VAT computed per line then summed, vs. Adyen computing on the total. Banker's rounding
on our side, half-up on theirs.

**Fix:** compute VAT on the invoice total, distribute remainder to the largest line. Credit notes issued
automatically for affected invoices.

**Action items**
- [x] Property-based tests for invoice totals
- [x] Reconciliation job alerts if diff > 0
- [ ] Document rounding rules in the billing README
` },
];

work['Projects/Dispatcher console redesign'] = [
  { title: 'Console redesign — user interviews', type: 'markdown', tags: 'research,ux', days: 130, upd: 120, body:
`# Dispatcher interviews (6 sessions, Jul)

Recurring themes:
- **Map vs. list**: 5/6 keep the list view open all day, map only when something goes wrong
- Colour coding of late stops is "too subtle" — they want red, not orange
- Keyboard shortcuts! Two dispatchers use AutoHotkey macros to drag stops between routes
- Nobody uses the "notes" field on stops because drivers never see it

Quotes:
> "I don't need the optimiser to be perfect. I need to know *why* it did what it did." — Lena, Tromsø
> "If I move one stop, don't move the other twelve." — Karim, Gdańsk
` },
  { title: 'Keyboard shortcuts proposal', type: 'markdown', tags: 'ux,console', days: 115, upd: 60, body:
`# Keyboard shortcuts

| Key | Action |
|---|---|
| \`J\` / \`K\` | next / previous stop |
| \`Shift+↑/↓\` | move stop within route |
| \`M\` | move stop to another route (opens picker) |
| \`L\` | lock stop position |
| \`/\` | search stops |
| \`?\` | show this help |

Conflicts: \`M\` is currently "toggle map" for 3 power users. Make it configurable? Probably overkill.
` },
];

work['Meetings/One-on-ones'] = [];
work['Meetings/Team'] = [];
work['Meetings/Retros'] = [];

const oneOnOneTopics = [
  ['Promotion packet timeline', 'Tomasz wants to put me forward in the January cycle. Need 2 more peer reviews.'],
  ['On-call load', 'Last rotation had 11 pages, 8 were the flaky geocoder alert. Agreed to fix the alert threshold first.'],
  ['Hiring loop for senior backend role', 'I will run the system design interview. Rubric draft due Friday.'],
  ['Conference budget', 'Approved: one conference in 2027. Thinking about Strange Loop successor or NDC Oslo.'],
  ['Mentoring Jonas', 'Jonas is doing well on the CSV importer; next step: let him own the Halvorsen mapping.'],
  ['Q4 priorities', 'Live re-optimisation is #1, breaks review #2, tech debt in the geocoder #3.'],
  ['Feedback from Aisha', 'Specs are clear but I tend to over-scope. Try writing non-goals first.'],
  ['Working from Bergen in December', 'Fine, as long as I am online for the Tuesday planning.'],
];
for (let i = 0; i < 16; i++) {
  const d = 7 + i * 14;
  const [topic, note] = pick(oneOnOneTopics, i);
  const date = new Date(Date.UTC(2026, 10, 16) - d * 86400000).toISOString().slice(0, 10);
  work['Meetings/One-on-ones'].push({ title: `1:1 Tomasz — ${date}`, type: 'markdown', tags: '1on1', days: d, upd: d, body:
`# 1:1 with Tomasz — ${date}

## ${topic}
${note}

## Updates from me
- ${pick(['Breaks PR is up for review', 'Benchmark re-run scheduled', 'Finished the CSV importer refactor', 'Halvorsen call went well', 'Fixed the flaky geocoder test', 'Wrote the re-optimisation API sketch'], i)}
- ${pick(['Blocked on legal for the break rules', 'Need a second reviewer from the data team', 'Staging is slow again', 'Nothing blocking'], i + 1)}

## Action items
- [${i > 1 ? 'x' : ' '}] ${pick(['Send rubric draft', 'Book the training session', 'Ask legal about enforcement', 'Write up the alert threshold change', 'Review Jonas’ PR'], i)}
` });
}

const standupWeeks = 22;
for (let i = 0; i < standupWeeks; i++) {
  const d = 3 + i * 7;
  const date = new Date(Date.UTC(2026, 10, 16) - d * 86400000).toISOString().slice(0, 10);
  work['Meetings/Team'].push({ title: `Weekly planning — ${date}`, type: 'note', tags: 'planning,team', days: d, upd: d, body:
`<h2>Weekly planning — ${date}</h2>
<p><strong>Attendees:</strong> Tomasz, Aisha, Jonas, Priya, Maya${i % 4 === 0 ? ', Erik (data)' : ''}</p>
<h3>Last week</h3>
<ul><li>${pick(['Shipped time-window constraints to staging', 'Benchmarks re-run with new dataset', 'CSV importer handles semicolon-separated files', 'Fixed timezone bug in route summaries', 'Geocoder cache hit rate up to 91%'], i)}</li>
<li>${pick(['Two incidents, both geocoder timeouts', 'No incidents', 'One P3: map tiles slow in Safari', 'Customer escalation from Nordlys Bud, resolved'], i)}</li></ul>
<h3>This week</h3>
<ul><li>${pick(['Live re-optimisation: optimistic locking', 'Breaks: address review comments', 'Halvorsen CSV mapping', 'Dispatcher console: shortcut help overlay', 'Load test the solver pool'], i)}</li>
<li>${pick(['Priya on-call', 'Jonas on-call', 'Maya on-call', 'Tomasz on-call'], i)}</li></ul>
${i % 3 === 0 ? '<p><em>Reminder: demo on Friday, 15:00, room Fjord.</em></p>' : ''}` });
}

for (let i = 0; i < 7; i++) {
  const d = 10 + i * 28;
  const date = new Date(Date.UTC(2026, 10, 16) - d * 86400000).toISOString().slice(0, 10);
  work['Meetings/Retros'].push({ title: `Sprint ${48 - i} retro`, type: 'markdown', tags: 'retro,team', days: d, upd: d, body:
`# Sprint ${48 - i} retro (${date})

### 👍 Went well
- ${pick(['Pairing on the solver integration', 'Fast reviews', 'Clear spec for the importer', 'Demo went smoothly', 'Nobody worked late'], i)}
- ${pick(['Staging was stable', 'Good collaboration with data team', 'Customer feedback loop with Halvorsen'], i)}

### 👎 Didn’t go well
- ${pick(['Too many meetings on Wednesday', 'Flaky e2e tests (again)', 'Scope creep on breaks', 'Release got delayed by a migration lock', 'On-call noise'], i)}

### 🔁 Try next
- ${pick(['No-meeting Wednesday afternoons', 'Quarantine flaky tests automatically', 'Write non-goals in every spec', 'Run migrations in a separate deploy'], i)}
` });
}

work['Engineering/Runbooks'] = [
  { title: 'Runbook: geocoder timeouts', type: 'markdown', tags: 'oncall,runbook', days: 250, upd: 30, fav: true, icon: 'lucide-life-buoy', body:
`# Runbook — geocoder timeouts

**Alert:** \`geocoder_p95_latency > 2s for 5m\`

1. Check provider status page (Nominatim mirror + commercial fallback)
2. \`kubectl -n routing logs deploy/geocoder --since=10m | grep -c TIMEOUT\`
3. If > 50 timeouts/min → flip fallback: \`ff set geocoder.provider=fallback\`
4. Cache warm-up: \`./bin/warm-cache --tenant all --days 3\` (takes ~8 min)
5. Post in #routing-incidents with the graph screenshot

**Don't** restart the pods — the cache is in-memory and restart makes it worse.
` },
  { title: 'Runbook: solver pool saturation', type: 'markdown', tags: 'oncall,runbook', days: 140, upd: 70, body:
`# Runbook — solver pool saturated

Symptoms: queue depth > 200, interactive solves timing out at 2 s.

- Scale: \`kubectl -n routing scale deploy/solver --replicas=24\` (max 32, cost!)
- Check if a single tenant is flooding (usually a bulk import at 05:30)
- Rate-limit that tenant's batch endpoint: \`ff set solver.batch_rps.<tenant>=2\`
` },
  { title: 'Deploy checklist', type: 'tasklist', tags: 'release', days: 200, upd: 5, tasks: [
    ['Changelog updated', true], ['Migrations reviewed by a second person', true], ['Feature flags default OFF', true],
    ['Staging smoke test (routes, billing, login)', false], ['Notify #support 30 min before', false], ['Watch error rate for 20 min after deploy', false],
  ] },
];

work['Engineering/Architecture'] = [
  { title: 'ADR-014: Event sourcing for route changes', type: 'markdown', tags: 'adr,architecture', days: 85, upd: 80, body:
`# ADR-014: Event sourcing for route changes

**Status:** Accepted (2026-08-28)

## Context
Dispatchers need an audit trail ("who moved stop 14 to Erik's route?") and live re-optimisation needs a
consistent view of route versions.

## Decision
Store route changes as an append-only event log (\`route_events\`), project current state into \`routes\`.

## Consequences
- + Audit trail for free, undo becomes possible
- + Re-optimisation can replay events since version N
- − Projection lag (target < 200 ms)
- − Schema evolution of events needs care; we version event payloads
` },
  { title: 'Postgres connection pooling notes', type: 'markdown', tags: 'postgres,infra', days: 270, upd: 265, body:
`PgBouncer in transaction mode broke our advisory locks (session-level). Switched the migration runner to a
direct connection. Prepared statements: enabled \`max_prepared_statements=200\` after upgrading to 1.21.

Pool sizes (per service): api 40, solver 10, importer 5. Total < 120 to stay under RDS max_connections.
` },
  { title: 'Reading list — distributed systems', type: 'note', tags: 'learning', days: 330, upd: 100, body:
`<h3>To read</h3><ul><li>Designing Data-Intensive Applications — 2nd edition chapters on stream processing</li><li>"Time, Clocks, and the Ordering of Events" (re-read)</li><li>Jepsen report on the queue we use</li></ul><h3>Done</h3><ul><li><s>Database Internals, part I</s></li><li><s>The Raft paper</s></li></ul>` },
];

work['Inbox'] = [
  { title: 'Ideas for the offsite', type: 'note', tags: 'team', days: 6, upd: 1, body:
`<ul><li>Hack day: "route replay" visualisation for support</li><li>Talk from Ingrid (Halvorsen) about how dispatch actually works</li><li>Ski afternoon? Check if Priya is okay with that (knee)</li></ul>` },
  { title: 'Questions for the data team', type: 'markdown', tags: 'data', days: 4, upd: 4, body:
`- Can we get stop service times per customer (median, p90) for the last 6 months?
- Is the \`deliveries_actual\` table reliable for Gdańsk tenants? Timestamps look shifted by 1h
- Who owns the benchmark dataset refresh?` },
  { title: 'Untitled', type: 'note', tags: '', days: 1, upd: 1, body: `<p>call back Petter re: ferry times — Moss–Horten winter schedule changes Jan 6</p>` },
];

// ------------------------------------------------------------ Personal ----
export const personal = {};

personal['Home/Apartment renovation'] = [
  { title: 'Kitchen renovation — budget', type: 'markdown', tags: 'home,budget', days: 120, upd: 9, pin: true, color: 'green', body:
`# Kitchen renovation budget

| Item | Quote | Paid | Notes |
|---|---|---|---|
| Cabinets (IKEA Metod + Sefa fronts) | 48 500 kr | 48 500 kr | delivered Oct 2 |
| Countertop (oak, 3.2 m) | 14 200 kr | 7 100 kr | 50% deposit |
| Electrician (Lys & Strøm AS) | 22 000 kr | — | starts Nov 25 |
| Plumber | 16 500 kr | — | waiting for 2nd quote |
| Tiles (backsplash) | 6 300 kr | 6 300 kr | |
| Contingency (15%) | 16 125 kr | | |
| **Total** | **123 625 kr** | **61 900 kr** | |

Budget ceiling: 130 000 kr. Remaining after quotes: ~6 400 kr. Tight.
` },
  { title: 'Renovation to-do', type: 'tasklist', tags: 'home', days: 118, upd: 2, tasks: [
    ['Measure window wall again (Ola said 3.18 m, not 3.2)', true], ['Order countertop', true], ['Pick tile grout colour', true],
    ['Get 2nd plumber quote', false, 'high'], ['Book electrician permit inspection', false], ['Sell old fridge on Finn.no', false], ['Paint ceiling before cabinets go up', true], ['Buy LED strips for under-cabinet lighting', false],
  ] },
  { title: 'Contractor contacts', type: 'note', tags: 'home,contacts', days: 110, upd: 50, body:
`<table><tr><th>Who</th><th>Phone</th><th>Notes</th></tr><tr><td>Lys &amp; Strøm AS (Henrik)</td><td>+47 912 34 567</td><td>Electrician, recommended by Kari</td></tr><tr><td>Rørlegger Bakke</td><td>+47 934 55 210</td><td>Quote 16 500 kr, slow to reply</td></tr><tr><td>Flis &amp; Fuge</td><td>+47 400 12 998</td><td>Tiler, available from January</td></tr></table>` },
];

personal['Home'] = [
  { title: 'Plant watering schedule', type: 'markdown', tags: 'home,plants', days: 280, upd: 33, body:
`- **Monstera** — every 7–10 days, when top 3 cm dry
- **Pilea** — weekly, rotate a quarter turn
- **Snake plant** — every 3 weeks, less in winter
- **Basil (kitchen)** — every 2 days 🙃 keeps dying anyway
- Fertilise Mar–Sep, once a month` },
  { title: 'Wi-Fi & devices', type: 'markdown', tags: 'home,tech', days: 340, upd: 200, body:
`Router: Eero Pro 6, admin via app. Guest network "lindqvist-guest".
NAS: Synology DS220+ — backups of photos to B2 every Sunday 03:00.
Printer: Brother HL-L2350DW, toner TN-2420 (last replaced Mar 2026).` },
];

const recipes = [
  ['Shakshuka', 'eggs,quick', '4 eggs, 1 can tomatoes, 1 red pepper, 1 onion, 2 garlic cloves, cumin, paprika, feta, coriander.', 'Soften onion and pepper (8 min), add garlic and spices, then tomatoes, simmer 10 min. Make wells, crack eggs, cover 6–8 min. Feta + coriander on top.'],
  ['Kanelbullar', 'baking,swedish', '500 g flour, 75 g sugar, 25 g yeast, 300 ml milk, 75 g butter, 1 tsp cardamom. Filling: 100 g butter, 75 g sugar, 2 tbsp cinnamon.', 'Knead 10 min, rise 45 min. Roll, spread filling, fold in thirds, cut strips, twist and knot. Rise 30 min, egg wash, pearl sugar, 225 °C for 8–10 min.'],
  ['Weeknight dal', 'vegetarian,quick', '200 g red lentils, 1 onion, ginger, garlic, 1 tsp turmeric, 1 can coconut milk, spinach, lime.', 'Rinse lentils, simmer with turmeric 15 min. Fry onion/ginger/garlic, add to lentils with coconut milk, 10 more min. Stir in spinach, finish with lime and tadka (cumin seeds + chilli in ghee).'],
  ['Fiskesuppe (Bergen style)', 'fish,norwegian', '400 g cod + salmon, 1 carrot, 1 leek, ½ celeriac, 1 l fish stock, 3 dl cream, 1 dl crème fraîche, chives.', 'Julienne the veg, simmer in stock 5 min. Add cream, bring to simmer, add fish in chunks, poach 4 min off heat. Season with a little sugar and vinegar(!). Chives.'],
  ['Miso-glazed aubergine', 'vegetarian', '2 aubergines, 2 tbsp white miso, 1 tbsp mirin, 1 tbsp sugar, sesame, spring onion.', 'Halve, score, roast cut-side down 25 min at 200 °C. Brush glaze, grill 3 min. Rice + quick pickled cucumber.'],
  ['Sourdough — current recipe', 'baking,sourdough', '450 g bread flour, 50 g whole wheat, 360 g water, 100 g starter, 10 g salt.', 'Autolyse 1h. Add starter + salt. 4 sets of folds every 30 min. Bulk until +60% (usually 5h at 23 °C). Shape, cold retard 14h. Bake 250 °C lid on 20 min, 230 °C lid off 22 min.\n\n> Note to self: last 3 loaves were under-proofed. Try warmer spot (on top of the fridge).'],
  ['Pasta alla Norma', 'pasta,vegetarian', '2 aubergines, 400 g tomatoes, garlic, basil, ricotta salata, rigatoni.', 'Fry aubergine cubes in batches until golden. Tomato sauce with garlic 15 min, fold in aubergine and basil. Grate ricotta salata generously.'],
  ['Overnight oats', 'breakfast,quick', '50 g oats, 150 ml oat milk, 1 tbsp chia, grated apple, cinnamon.', 'Mix, fridge overnight. Top with walnuts and a spoon of peanut butter.'],
  ['Lamb tagine for guests', 'dinner,guests', '1 kg lamb shoulder, 2 onions, ras el hanout, dried apricots, chickpeas, preserved lemon, almonds.', 'Brown lamb, soften onions, spices, add stock and apricots. 2h at 160 °C, add chickpeas for the last 30 min. Serve with couscous and herb yoghurt. Feeds 6.'],
  ['Pepperkaker', 'baking,christmas', '150 g butter, 150 g sugar, 1 dl golden syrup, 1 dl cream, spices (cinnamon, ginger, cloves, pepper), 1 tsp baking soda, ~500 g flour.', 'Melt butter, sugar, syrup. Cool, add cream, spices, soda, flour. Rest overnight. Roll thin, 175 °C for 6–8 min. Makes ~120.'],
];
personal['Recipes'] = recipes.map(([name, tags, ing, method], i) => ({
  title: name, type: 'markdown', tags: 'recipes,' + tags, days: 30 + i * 31, upd: 10 + i * 17, fav: i === 1 || i === 5,
  body: `# ${name}\n\n## Ingredients\n${ing.split(/, (?=[^)]*(?:\(|$))/).map((x) => '- ' + x).join('\n')}\n\n## Method\n${method}\n`,
}));

personal['Travel/Japan 2026'] = [
  { title: 'Japan itinerary (April)', type: 'markdown', tags: 'travel,japan', days: 250, upd: 215, icon: 'lucide-plane', body:
`# Japan — Apr 3 to Apr 19, 2026

| Dates | Place | Stay |
|---|---|---|
| Apr 3–7 | Tokyo (Yanaka) | Hanare hotel |
| Apr 7–9 | Hakone | Ryokan Fukuzumi-ro |
| Apr 9–13 | Kyoto | Machiya on Matsubara-dori |
| Apr 13–14 | Nara day trip | — |
| Apr 14–17 | Onomichi + Shimanami Kaido by bike | Onomichi U2 |
| Apr 17–19 | Osaka | near Namba |

- JR Pass no longer worth it after the price increase → individual Shinkansen tickets
- Book teamLab Planets 2 weeks ahead
- Cherry blossom forecast: Kyoto peak ~Apr 5, so we'll catch the tail end
` },
  { title: 'Japan — packing list', type: 'tasklist', tags: 'travel,japan', days: 240, upd: 225, tasks: [
    ['Passport + copies', true], ['Suica on phone', true], ['Pocket Wi-Fi reservation', true], ['Comfortable walking shoes', true], ['Cash (lots of places still cash-only)', true], ['Bike gloves for Shimanami', true],
  ] },
  { title: 'Japan — things we loved', type: 'note', tags: 'travel,japan', days: 210, upd: 205, body:
`<ul><li>Breakfast at the ryokan in Hakone — the grilled fish and the view of the river</li><li>Shimanami Kaido: 70 km, windy on the bridges, absolutely worth it</li><li>Tiny bar in Onomichi run by a retired ship engineer</li><li>Kyoto early morning at Fushimi Inari (6:00, nobody there)</li></ul><p>Next time: Hokkaido in winter? Kanazawa?</p>` },
];

personal['Travel'] = [
  { title: 'Bergen Christmas trip', type: 'markdown', tags: 'travel,family', days: 14, upd: 1, body:
`Train Oslo → Bergen Dec 20, 08:25 (seat 34, car 5). Back Dec 28.

- Gifts: Mamma (wool blanket from Oleana?), Pappa (that history book about the Hanseatic league), Ola + kids
- Bring the kanelbullar recipe for baking with the kids
- Working remotely Dec 21–23, need desk at Mamma's` },
  { title: 'Weekend ideas — within 3h of Oslo', type: 'markdown', tags: 'travel,ideas', days: 160, upd: 90, body:
`- [x] Fredrikstad old town
- [x] Hiking Gaustatoppen
- [ ] Lillehammer in winter (cross-country)
- [ ] Gothenburg — food + Liseberg at Christmas
- [ ] Hvaler islands by bike` },
];

const books = [
  ['Tomorrow, and Tomorrow, and Tomorrow — Gabrielle Zevin', 5, 'About friendship and making games. The hospital chapters wrecked me.'],
  ['The Ministry for the Future — Kim Stanley Robinson', 4, 'Dense but important. The opening chapter is unforgettable. Skimmed some of the economics chapters.'],
  ['Klara and the Sun — Kazuo Ishiguro', 4, 'Quiet and sad. Klara’s perspective on the world is so well done.'],
  ['Shape Up — Ryan Singer', 3, 'Useful ideas (appetite, betting table). Hard to apply as-is in a company with quarterly roadmaps.'],
  ['Mitt kampe… no wait, Min kamp 1 — Karl Ove Knausgård', 3, 'Re-read in Norwegian for practice. Slow, then suddenly gripping.'],
  ['Project Hail Mary — Andy Weir', 5, 'Pure fun. Rocky!'],
  ['Thinking in Systems — Donella Meadows', 4, 'Leverage points chapter is gold. Should re-read before planning season.'],
  ['The Overstory — Richard Powers', 4, 'Long. Changed how I look at trees on my walks.'],
];
personal['Reading'] = books.map(([title, stars, thoughts], i) => ({
  title, type: 'markdown', tags: 'books', days: 20 + i * 40, upd: 15 + i * 38,
  body: `# ${title}\n\nRating: ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}\n\n${thoughts}\n${i % 2 === 0 ? '\n## Quotes\n> "We are all just stories in the end." (paraphrased, check page)\n' : ''}`,
}));
personal['Reading'].push({ title: 'Want to read', type: 'tasklist', tags: 'books', days: 300, upd: 8, tasks: [
  ['Piranesi — Susanna Clarke', false], ['The Dispossessed — Ursula K. Le Guin', false], ['Lessons in Chemistry', true], ['Stoner — John Williams', false], ['How Big Things Get Done — Flyvbjerg', false],
] });

personal['Health'] = [
  { title: 'Running log — autumn', type: 'markdown', tags: 'running,health', days: 75, upd: 2, body:
`Goal: Oslo half marathon in May, sub 1:55.

| Week | km | Long run | Notes |
|---|---|---|---|
| 37 | 22 | 10 km | easy, Sognsvann loop |
| 38 | 25 | 12 km | left calf tight |
| 39 | 18 | 8 km | sick, skipped Thursday |
| 40 | 27 | 13 km | first tempo run 5×1 km |
| 41 | 29 | 14 km | |
| 42 | 24 | 12 km | rain, rain, rain |
| 43 | 30 | 15 km | felt great |
| 44 | 26 | 14 km | |
| 45 | 31 | 16 km | new longest run this year |
| 46 | 20 | — | deload week |
` },
  { title: 'Physio exercises (calf)', type: 'tasklist', tags: 'health', days: 55, upd: 20, tasks: [
    ['Eccentric heel drops 3×15', true], ['Calf stretch against wall 3×30 s', true], ['Single-leg balance 3×45 s', false], ['Foam roll after runs', false],
  ] },
  { title: 'Doctor appointments', type: 'note', tags: 'health', days: 200, upd: 60, body:
`<ul><li>Dentist — Dr. Aas, every 12 months, next one in <strong>February</strong></li><li>GP: Legesenteret Torshov, book via Helsenorge</li><li>Blood test results (Sep): all normal, vitamin D a bit low → supplement Oct–Mar</li></ul>` },
];

personal['Finance'] = [
  { title: 'Monthly budget 2026', type: 'markdown', tags: 'finance,budget', days: 320, upd: 16, body:
`| Category | Budget | Oct actual |
|---|---|---|
| Rent share | 11 500 | 11 500 |
| Groceries | 4 500 | 5 120 |
| Transport (Ruter) | 850 | 850 |
| Eating out | 2 000 | 2 640 |
| Subscriptions | 600 | 589 |
| Savings (BSU + fund) | 6 000 | 6 000 |
| Renovation fund | 5 000 | 5 000 |

Over on eating out again — the Japan-themed dinners with Sofie count as "research" 😅` },
  { title: 'Tax return checklist', type: 'tasklist', tags: 'finance', days: 230, upd: 210, tasks: [
    ['Check pre-filled income', true], ['Add home office deduction', true], ['BSU deduction', true], ['Union fee deduction', true], ['Submit by April 30', true],
  ] },
];

personal['Gifts & ideas'] = [
  { title: 'Gift ideas', type: 'markdown', tags: 'gifts', days: 260, upd: 7, body:
`- **Sofie** (birthday Jan 12): ceramics class voucher, or the Japanese knife she looked at in Kyoto
- **Mamma**: Oleana blanket (Christmas)
- **Ola's kids**: Lego Technic for Even (9), drawing set for Live (6)
- **Kari** (housewarming): a nice olive oil + the sourdough starter 😄` },
];

personal['Diary'] = [];
const diaryLines = [
  'Long day. The breaks review dragged on but we finally agreed on the split-break rule. Ran 8 km in the dark with a headlamp — felt good to clear my head.',
  'Bakery on the corner had kanelbullar for 25 kr. Bought three. No regrets.',
  'Sofie came over, we cooked the dal and watched the last episode of the series. Rain all evening.',
  'Electrician came to look at the kitchen. He says the old wiring is "interesting". That’s never a good word.',
  'Quiet Sunday. Repotted the monstera, cleaned the bike, called Mamma about Christmas.',
  'Halvorsen call went better than expected. Petter is sceptical but curious. Need to show, not tell.',
  'Couldn’t sleep, wrote down the re-optimisation idea at 2 am. Looks less brilliant in the morning but still okay.',
  'First snow! Just a few flakes on Grünerløkka, gone by lunch.',
  'Tempo run: 5×1 km at 5:05. Calf held up. Stretching more seems to help.',
  'Team lunch at the Vietnamese place. Jonas told the story about the CSV with 40 000 empty lines.',
];
for (let i = 0; i < 26; i++) {
  const d = 1 + Math.floor(i * 3.4);
  const date = new Date(Date.UTC(2026, 10, 16) - d * 86400000).toISOString().slice(0, 10);
  personal['Diary'].push({ title: date, type: 'markdown', tags: '', days: d, upd: d, diary: true, body: pick(diaryLines, i) + (i % 5 === 0 ? '\n\n**Grateful for:** warm socks, good colleagues, the view from the balcony.' : '') });
}

personal[''] = [
  { title: 'Passwords? NO — see Bitwarden', type: 'note', tags: '', days: 360, upd: 360, body: '<p>Reminder to self: never put passwords in notes. Everything is in Bitwarden.</p>' },
  { title: 'Quick notes', type: 'note', tags: '', days: 2, upd: 0, fav: true, body:
`<ul><li>Pick up parcel at Coop before 18:00 (code 7731)</li><li>Return library books — due Nov 20</li><li>Book haircut</li><li>Sofie’s ceramics class — check if they have a January slot</li></ul>` },
];

// ------------------------------------------------------- Side projects ----
export const side = {};
side['Trail map app'] = [
  { title: 'Trail map app — idea dump', type: 'markdown', tags: 'side-project,ideas', days: 190, upd: 45, body:
`An offline-first map of hiking trails around Oslo with *current conditions* from other hikers ("icy above 400 m").

- Data: Kartverket trails + OSM
- Stack idea: SvelteKit + MapLibre + PocketBase
- MVP: map, trail list, condition reports with photo, expire after 48h

Not doing: route planning, social features.` },
  { title: 'Trail map — tasks', type: 'tasklist', tags: 'side-project', days: 185, upd: 45, tasks: [
    ['Download Kartverket trail dataset', true], ['MapLibre prototype with vector tiles', true], ['Condition report form', false], ['Image resize on upload', false], ['Deploy somewhere cheap (Fly?)', false],
  ] },
];
side['Woodworking'] = [
  { title: 'Bookshelf build', type: 'markdown', tags: 'woodworking', days: 100, upd: 80, body:
`Oak, 180 × 90 × 30 cm, 5 shelves, dado joints.

Cut list:
- 2× sides 1800 × 300 × 22
- 5× shelves 856 × 280 × 22
- 1× back panel (6 mm plywood)

Finish: hardwax oil (Osmo 3032), 2 coats.` },
];

// ----------------------------------------------------------- Archived ----
export const archived = [
  ['Work', { title: 'Q2 OKRs (old)', type: 'markdown', tags: 'okr', days: 230, upd: 140, body: '# Q2 OKRs\n\n- KR1: v3 solver spike — done\n- KR2: billing migration — done\n- KR3: reduce on-call pages by 30% — 18% 😕' }],
  ['Work', { title: 'Old onboarding notes', type: 'note', tags: 'onboarding', days: 365, upd: 330, body: '<p>VPN: use the Okta app. Staging DB read replica: ask in #infra. Coffee machine on 3rd floor is the good one.</p>' }],
  ['Personal', { title: 'Apartment hunting 2025', type: 'markdown', tags: 'home', days: 365, upd: 300, body: '- Torshov 3-rom, 68 m², nice light — **got it!**\n- Sagene 2-rom, too dark\n- Tøyen, great price but loud street' }],
];

export const trashed = [
  ['Work', { title: 'Draft — re-org rumours', type: 'note', tags: '', days: 50, upd: 49, body: '<p>(deleted, not relevant anymore)</p>' }],
  ['Personal', { title: 'Shopping list', type: 'note', tags: '', days: 12, upd: 12, body: '<ul><li>milk</li><li>eggs</li><li>coriander</li></ul>' }],
  ['Personal', { title: 'New note', type: 'note', tags: '', days: 9, upd: 9, body: '' }],
];
