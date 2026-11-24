import { people, services } from './data-core.mjs';
import { guides, incidents } from './data-ops.mjs';

const who = (k) => people[k] ?? k;
export const extraDocs = [];
const doc = (path, date, author, front, body) => extraDocs.push({ path, date, author, front, body });

doc('README.md', '2026-11-14', 'maya', { title: 'Tidewater Engineering', description: 'Home page for the Tidewater engineering knowledge base.', tags: ['index'] },
`# Tidewater Engineering

Welcome to the engineering knowledge base for **Tidewater** — freight dispatch, tracking and settlement for mid-size shippers and the carriers who move their loads.

> New here? Start with [[onboarding-backend-engineers]], then skim the [[service-catalog]] and the latest weekly sync ([[2026-11-11-eng-sync]]).

## Where things live

| Folder | What's in it |
| --- | --- |
| \`decisions/\` | ADRs — frozen once accepted. Start with [[0001-record-architecture-decisions]]. |
| \`proposals/\` | RFCs in flight. Status flows draft → fcp → accepted/rejected. |
| \`specs/\` | Implementation specs (spec + plan + tasks) for accepted proposals. |
| \`postmortems/\` | Blameless incident reviews. |
| \`guides/\` | How-tos, onboarding and oncall runbooks. |
| \`meetings/\` | Weekly eng sync and architecture review notes. |
| \`team/\` | Who owns what, oncall rotation, glossary. |

## Currently in flight (Q4 2026)

- **Self-serve carrier onboarding** — [[self-serve-carrier-onboarding/spec]] · target 2026.12
- **Load board search on OpenSearch** — [[load-board-search/spec]] · slipping, see [[2026-11-15-load-board-search-stale]]
- **Multi-stop pricing** — [[0004-multi-stop-pricing]] in FCP until Nov 21
- **Detention auto-billing** — [[0008-detention-auto-billing]]

## Recent incidents

- [[2026-11-15-load-board-search-stale]] (draft)
- [[2026-11-06-cert-expiry-internal-grpc]] (draft)
- [[2026-10-16-webhook-retries-amplified]] (in review)
`);

doc('team/service-catalog.md', '2026-10-30', 'sam', { title: 'Service catalog', description: 'Every production service, what it does, and who owns it.', tags: ['reference', 'ownership'] },
`# Service catalog

| Service | Owner | Lang | Tier | Runbooks |
| --- | --- | --- | --- | --- |
| \`dispatch-api\` | Daniel Reyes | Go | 1 | [[dispatch-api-high-write-latency]], [[temporal-workflows-stuck]] |
| \`rate-engine\` | Ravi Iyer | Kotlin | 1 | [[rate-engine-quote-errors]] |
| \`tracking-ingest\` | Tomasz Wójcik | Go | 1 | [[tracking-ingest-consumer-lag]] |
| \`carrier-portal\` | Chloe Martin | TypeScript | 1 | — |
| \`billing-svc\` | Priya Raman | Go | 1 | [[billing-svc-stripe-webhooks-failing]] |
| \`notifier\` | Lena Fischer | TypeScript | 2 | [[notifier-sms-not-delivered]] |
| \`doc-scan\` | Lena Fischer | Python | 2 | [[doc-scan-ocr-backlog]] |

${Object.entries(services).map(([k, v]) => `### ${k}\n\n${v}\n`).join('\n')}
`);

doc('team/people.md', '2026-09-15', 'maya', { title: 'People', description: 'Who is on the team and what they work on.', tags: ['team'] },
`# People

| Name | Role | Based in | Focus |
| --- | --- | --- | --- |
| Maya Okafor | Staff engineer, eng lead | Chicago | Architecture, hiring |
| Daniel Reyes | Senior engineer | Chicago | dispatch-api, Postgres |
| Priya Raman | Senior engineer | Austin | billing-svc, security |
| Tomasz Wójcik | Senior engineer | Kraków | tracking-ingest, Temporal |
| Aiko Tanaka | ML engineer | Seattle | ETA model, scorecards |
| Sam Whitfield | Platform / SRE | Denver | Kubernetes, CI, oncall |
| Lena Fischer | Engineer | Berlin | notifier, doc-scan |
| Jordan Blake | Integrations engineer | Chicago | Shipper APIs, webhooks |
| Ravi Iyer | Engineer | Toronto | rate-engine, search, observability |
| Chloe Martin | Frontend lead | Montréal | carrier-portal, driver app |

Interns (summer 2026): Noah Kim, Fatima Haddad — both wrapped up in August. Their final demo notes are in [[2026-08-20-eng-sync]].
`);

doc('team/oncall-rotation.md', '2026-11-03', 'sam', { title: 'Oncall rotation', description: 'Current primary/secondary schedule and escalation.', tags: ['oncall'] },
`# Oncall rotation

Primary rotates weekly, Monday 10:00 CT. Secondary is the previous week's primary.

| Week of | Primary | Secondary |
| --- | --- | --- |
| 2026-10-26 | Ravi Iyer | Lena Fischer |
| 2026-11-02 | Sam Whitfield | Ravi Iyer |
| 2026-11-09 | Daniel Reyes | Sam Whitfield |
| 2026-11-16 | Jordan Blake | Daniel Reyes |
| 2026-11-23 | Chloe Martin | Jordan Blake |
| 2026-11-30 | Tomasz Wójcik | Chloe Martin |

Thanksgiving week (11/23) — Chloe swapped with Priya? **confirm before Friday**

See [[oncall-handoff]] for the handoff checklist and [[0017-oncall-follow-the-sun]] for the proposed EU/US split.
`);

doc('team/glossary.md', '2026-04-08', 'jordan', { title: 'Glossary', description: 'Freight and internal terms that confuse new hires.', tags: ['reference'] },
`# Glossary

**Accessorial** — any charge beyond linehaul: detention, lumper, stop-off, liftgate.

**BOL** — bill of lading. The shipping document that travels with the freight.

**Detention** — paying the carrier when the driver waits at a facility beyond free time (usually 2h).

**Drayage** — short moves, typically port ↔ warehouse.

**ELD** — electronic logging device; our main source of GPS pings.

**Lane** — origin → destination pair, usually at zip3 granularity for pricing.

**MC / DOT number** — carrier authority identifiers issued by FMCSA.

**POD** — proof of delivery. Signed BOL photo, uploaded by the driver.

**RPM** — rate per mile.

**Tender** — offering a load to a carrier. A **waterfall** is the ordered list of carriers we tender to.

**TONU** — truck ordered, not used. Fee when a shipper cancels after dispatch.
`);

const guideBodies = {
  'onboarding-backend-engineers': `# Onboarding: Backend engineers

Welcome! This is the checklist for your first two weeks. Your onboarding buddy will pair with you on most of it.

## Week 1

- [ ] Laptop, 1Password, Google Workspace, Slack (#eng, #eng-oncall, #inc-*)
- [ ] GitHub org + SSO; add your SSH key
- [ ] AWS SSO — request \`engineer\` permission set in #it-help
- [ ] Clone the monorepo and get the stack running: [[local-dev-environment]]
- [ ] Read the ADRs, at least [[0002-postgres-as-system-of-record]], [[0003-kafka-for-domain-events]], [[0009-tenant-isolation-row-level-security]] and [[0019-use-temporal-for-tender-workflows]]
- [ ] Ship a small PR (there is always a \`good-first-issue\` in the tracker)
- [ ] Shadow a dispatcher for an hour — ask Jordan to set it up. Seriously, do this.

## Week 2

- [ ] Read three recent postmortems
- [ ] Shadow oncall for a day with the current primary ([[oncall-rotation]])
- [ ] Walk through the tender flow end to end in staging with your buddy
- [ ] Write or update one doc in this wiki

## How we work

- Trunk-based development, small PRs, deploys many times a day ([[release-process]])
- Anything risky goes behind a flag ([[feature-flags-how-to]])
- Big changes start as a proposal in \`proposals/\`
- We use agents in this wiki a lot — see [[using-agents-in-this-wiki]]

## The domain in 5 minutes

A **shipper** (e.g. Hollis Foods) creates a **load**: pick up 22 pallets in Joliet, deliver to Indianapolis tomorrow by 14:00. Tidewater prices it (rate-engine), then **tenders** it down a waterfall of carriers until one accepts (dispatch-api + Temporal). The driver's ELD sends GPS pings (tracking-ingest) that power ETAs. On delivery the driver uploads a POD photo (doc-scan), and billing-svc invoices the shipper and settles the carrier.

\`\`\`mermaid
sequenceDiagram
  participant S as Shipper
  participant D as dispatch-api
  participant R as rate-engine
  participant C as Carrier
  S->>D: Create load
  D->>R: Quote lane
  R-->>D: $2,140 (2.31/mi)
  D->>C: Tender (waterfall)
  C-->>D: Accept
  D-->>S: Covered by Ridgeline Transport
\`\`\`

Questions → #eng or ping Maya.
`,
  'local-dev-environment': `# Local dev: running the stack with Tilt

\`\`\`bash
brew install tilt kind kubectl
make dev-cluster   # kind cluster with Postgres, Redpanda, Redis, Temporal
tilt up            # builds and live-reloads every service
\`\`\`

Open http://localhost:10350 for the Tilt UI. First boot takes ~6 minutes; after that, Go services hot-reload in ~4s.

## Seed data

\`make seed\` loads the *Hollis Foods* and *Brightline Home* fixture shippers, 40 carriers, and ~2,000 historic loads.

## Common problems

- **\`rate-engine\` OOMs on M1/M2 with 16GB** — set \`RATE_ENGINE_JVM_OPTS=-Xmx1g\` in \`.env.local\`.
- **Redpanda won't start after sleep** — \`kind delete cluster --name tw && make dev-cluster\`.
- Temporal UI at http://localhost:8233.
`,
  'oncall-handoff': `# Oncall: handoff checklist

Do this in the #eng-oncall thread every Monday at 10:00 CT.

1. Open incidents and their status
2. Alerts that fired more than twice — are they noise? File a ticket.
3. Anything deployed Friday that the next person should watch
4. Customer escalations in flight (check the CS board)
5. Known upcoming events: carrier onboarding waves, quarter-end volume, maintenance windows

Template:

\`\`\`
Handoff <date> <from> → <to>
Incidents: …
Noisy alerts: …
Watch: …
Escalations: …
Upcoming: …
\`\`\`
`,
};

for (const g of guides) {
  const body = guideBodies[g.slug] ?? `# ${g.title}\n\n${{
    'writing-a-good-adr': 'An ADR answers one question: *why did we choose this?* Keep it under a page.\n\n1. **Context** — what forced the decision. Include numbers.\n2. **Decision** — one paragraph, active voice. "We will…"\n3. **Consequences** — the costs you are accepting, not just the benefits.\n\nAnti-patterns we have seen: ADRs written after the fact to justify something, ADRs with no consequences section, ADRs that are really proposals (put those in `proposals/`).\n\nGood examples: [[0007-online-migrations-with-pgroll]], [[0015-rate-engine-cache-redis]].',
    'feature-flags-how-to': 'Flags live in `flags/*.json` and are served by flagd ([[0006-feature-flags-with-openfeature]]).\n\n```json\n{\n  "flags": {\n    "portal.onboarding.selfserve": {\n      "state": "ENABLED",\n      "variants": { "on": true, "off": false },\n      "defaultVariant": "off",\n      "targeting": { "in": [{ "var": "carrier_id" }, ["c_1042", "c_2210"]] }\n    }\n  }\n}\n```\n\n**Remove flags within 30 days of reaching 100%.** The flag-age report in #eng posts every Monday.',
    'release-process': 'Merges to `main` deploy automatically via Argo CD.\n\n1. CI: lint, unit, contract tests (~9 min)\n2. Image pushed, Argo syncs **staging**\n3. Smoke tests in staging (tender flow, quote, tracking)\n4. Auto-promote to **prod** at 10% canary for 15 min, then 100%\n\nFreeze windows: last two business days of each quarter, and Thanksgiving week (Nov 23–27, 2026).',
    'kafka-topic-conventions': 'Topic names: `<domain>.<entity>.<event>.v<N>`, e.g. `events.dispatch.assigned.v2`.\n\n| Prefix | Retention | Notes |\n| --- | --- | --- |\n| `telemetry.` | 3 days | High volume pings |\n| `events.` | 14 days | Domain events from outbox |\n| `cdc.` | 7 days | Debezium change streams |\n| `dlq.` | 30 days | Dead letters, alert on any message |\n\nPartition key is always `load_id` unless there is a very good reason.',
    'using-agents-in-this-wiki': 'This wiki is wired to Claude Code and Codex through OpenKnowledge\'s MCP server. Per [[0020-ai-agents-may-edit-docs-not-code]] agents can edit docs directly.\n\nThings that work well:\n\n- "Draft a postmortem from #inc-2026-11-06 using the template"\n- "Find every runbook whose `last_verified` is older than 90 days"\n- "Turn proposal 0004 into a spec skeleton"\n\nThings that do not work well: asking it to decide things. Agents are great at first drafts and terrible at knowing what we actually agreed in a meeting.\n\nAlways re-read agent-written runbooks before setting `last_verified`.',
    'customer-escalations': 'When CS escalates (usually in #cs-escalations):\n\n1. Acknowledge within 15 min during business hours.\n2. Reproduce with the customer\'s account in staging if possible — never impersonate in prod without a ticket.\n3. If it is an incident, follow the incident process instead.\n4. Update the CS ticket, not just Slack.\n\nTop escalation sources in 2026: tracking ETAs (31%), missing tenders (22%), invoice disputes (18%).',
  }[g.slug]}\n`;
  doc(`guides/${g.slug}.md`, g.verified, g.slug.includes('agent') ? 'chloe' : 'maya', {
    title: g.title, type: 'guide', description: g.title.split(': ').pop() + '.', category: g.category, last_verified: g.verified, tags: ['guide', g.category],
  }, body);
}

doc('meetings/architecture-review/2026-05-14-load-board-search.md', '2026-05-14', 'daniel', { title: 'Arch review: load board search', type: 'meeting', date: '2026-05-14', attendees: ['Daniel Reyes', 'Ravi Iyer', 'Maya Okafor', 'Tomasz Wójcik'], tags: ['meeting', 'architecture-review'] },
`# Arch review: load board search

**Question:** Postgres trigram vs OpenSearch for the load board.

- Ravi showed p95 of 610ms on trigram search at current volume (180k open loads), projected 1.4s by EOY
- Daniel: could we get there with partial indexes + materialized view? Ravi tried — 380ms, still too slow with geo filters
- Concern from Tomasz about another datastore to operate. Sam (async) OK as long as it's managed
- **Outcome:** go with OpenSearch, write proposal → [[0012-load-board-search-opensearch]]
`);
doc('meetings/architecture-review/2026-08-20-temporal-vs-step-functions.md', '2026-08-20', 'tomasz', { title: 'Arch review: Temporal vs Step Functions', type: 'meeting', date: '2026-08-20', attendees: ['Tomasz Wójcik', 'Daniel Reyes', 'Maya Okafor', 'Sam Whitfield'], tags: ['meeting', 'architecture-review'] },
`# Arch review: Temporal vs Step Functions

| | Temporal (self-hosted) | Step Functions |
| --- | --- | --- |
| Local dev | Excellent (dev server) | Poor (LocalStack-ish) |
| Cost at 30k loads/day | ~$900/mo infra | ~$2,600/mo state transitions |
| Ops burden | Ours | AWS |
| Code-first workflows | Yes (Go SDK) | JSON/ASL, CDK |

Sam worried about operating Cassandra — Tomasz: we'd use Postgres persistence, fine at our scale.

**Decision:** Temporal. Recorded in [[0019-use-temporal-for-tender-workflows]].
`);
doc('meetings/architecture-review/2026-11-12-clickhouse.md', '2026-11-12', 'aiko', { title: 'Arch review: ClickHouse for analytics', type: 'meeting', date: '2026-11-12', attendees: ['Aiko Tanaka', 'Ravi Iyer', 'Maya Okafor', 'Priya Raman'], tags: ['meeting', 'architecture-review'] },
`# Arch review: ClickHouse for analytics

Notes are rough — Aiko to clean up.

- vendor quote: ~$7.8k/mo for our volume (vs ~$21k snowflake, but finance stays on snowflake so real saving maybe $9-10k)
- priya: PII in telemetry? driver location is PII under some state laws. need retention policy before anything moves
- maya: not convinced two warehouses is worth it for $10k/mo. try snowflake cost controls first for 1 month?
- ravi to do the snowflake tuning experiment, report back 12/10

no decision yet. [[0007-warehouse-on-clickhouse]] stays in draft.
`);

doc('scratch/pricing-call-notes.md', '2026-10-09', 'ravi', { title: 'pricing call w/ sales - notes', tags: ['scratch'] },
`pricing call w/ Dana (sales) + Marco (finance)

- they want multi-stop pricing before the Brightline renewal (Jan)
- brightline does ~1,100 multi-stop loads/mo, avg 3.4 stops
- marco: "flat $75 is costing us ~$18k/mo on brightline alone" — verify this number!!
- dana wants a "simple" breakdown on the quote. define simple
- follow up: write proposal (→ became [[0004-multi-stop-pricing]])
`);
doc('scratch/interview-loop-backend-senior.md', '2026-07-08', 'maya', { title: 'Interview loop: senior backend', tags: ['hiring'] },
`# Interview loop: senior backend

1. Recruiter screen (30m)
2. Hiring manager — Maya (45m)
3. System design: "design the tender waterfall" — Daniel or Tomasz (60m)
4. Code pairing in their own editor, Go or Kotlin — Priya / Ravi (75m)
5. Values + domain curiosity — Jordan (45m)

Rubric lives in the hiring drive, not here (candidate data).

Open req closes when we have 2 offers out. Currently: 1 offer accepted (starts Jan 6), 1 in final round.
`);
doc('scratch/q1-2027-planning-brain-dump.md', '2026-11-17', 'maya', { title: 'Q1 2027 planning — brain dump', tags: ['planning', 'scratch'] },
`# Q1 2027 planning — brain dump

very unsorted, don't share yet

- v1 webhooks deprecation (Jordan) — [[0024-deprecate-v1-webhooks]]
- passkeys? security review first [[0023-passkeys-for-carrier-portal]]
- driver app offline mode — Chloe thinks 6 weeks, i think 10
- detention billing — finance REALLY wants it, ~$40k/mo of unbilled detention by their estimate
- staging parity project (prereq for chaos days)
- headcount: +1 senior backend (offer accepted), +1 frontend?? budget unclear
- clickhouse decision after Ravi's snowflake experiment

themes?
1. get paid for the work we do (detention, multi-stop)
2. carriers love us (onboarding, offline, passkeys)
3. boring reliability
`);
doc('scratch/untitled.md', '2026-10-23', 'lena', { title: 'Untitled', tags: [] },
`twilio 10DLC campaign re-registration due 2027-01-15

- brand id: in 1pass under "Twilio 10DLC"
- need updated sample messages (the "new load assigned" one changed)
`);

const syncTopics = [
  ['2026-06-03', 'jordan', ['Public tracking links: proposal accepted, Jordan starting spec', 'Twilio vs Telnyx test results — staying with Twilio', 'Datadog → Grafana migration 40% of dashboards done']],
  ['2026-06-10', 'maya', ['Summer interns start Monday (Noah, Fatima)', 'Load board search spec review Thursday', 'Q2 OKR check: ETA v2 shipped ✅, RLS rollout 80%']],
  ['2026-06-17', 'ravi', ['Redis quote cache shipped, p95 quote latency 2.8s → 340ms', 'Carrier payments same-day: Stripe Treasury contract signed', 'Reminder: quarter-end freeze 6/29–6/30']],
  ['2026-06-24', 'priya', ['DAT outage postmortem review → [[2026-06-22-rate-engine-dat-outage]]', 'Postmark vs SES: rejected', 'RLS on `invoices` table this week — expect some svc_maintenance role fallout']],
  ['2026-07-01', 'maya', ['Q3 planning outcomes posted', 'doc-scan moving off Mongo', 'Hiring: senior backend req open']],
  ['2026-07-08', 'sam', ['Prod kube wrapper `tw-prod` is mandatory as of today', 'Interview loop finalised', 'flagd upgraded to 0.11']],
  ['2026-07-15', 'chloe', ['Portal login loop postmortem → [[2026-07-14-portal-login-redirect-loop]]', 'WebKit Playwright tests added to CI', 'Self-serve onboarding: FMCSA API integration done']],
  ['2026-07-22', 'maya', ['Follow-the-sun oncall proposal (ADR 0017) — discuss comp with People team', 'Interns mid-point demos next week']],
  ['2026-07-29', 'tomasz', ['Tender waterfall rewrite proposal posted', 'Datadog contract extended to 8/31 (billing dashboards not ready)']],
  ['2026-08-05', 'daniel', ['API versioning via date headers accepted (ADR 0018)', 'Public tracking links GA in 2026.08 🎉', 'RDS minor upgrade Sunday 3am']],
  ['2026-08-12', 'sam', ['Chaos days proposal — withdrawn pending staging parity', 'RDS upgrade went fine, one failover (expected)']],
  ['2026-08-20', 'maya', ['Intern final demos: Noah — carrier scorecard prototype; Fatima — POD blur detection (87% precision!)', 'Temporal arch review → Temporal it is']],
  ['2026-08-26', 'tomasz', ['ADR 0019 accepted, Temporal in staging', 'Shadow mode starts next week']],
  ['2026-09-02', 'jordan', ['Kestrel Logistics integration go-live', 'Webhook volume up 3x since August']],
  ['2026-09-09', 'maya', ['Temporal history limit incident → [[2026-09-04-temporal-history-size-limit]]', 'ADR 0020 on agents editing docs — accepted', 'Everyone please try the OpenKnowledge agent panel this week and share feedback in #eng']],
  ['2026-09-16', 'ravi', ['OpenSearch CDC consumer in staging', 'Grafana Cloud migration: 100% dashboards, alerts 90%']],
  ['2026-09-23', 'sam', ['Datadog agents removed 9/30 (ADR 0021)', 'Quarter-end capacity: doc-scan GPU max is 4 — raise?']],
  ['2026-09-30', 'lena', ['OCR backlog postmortem → [[2026-09-29-doc-scan-ocr-backlog]] (yes, the GPU thing)', 'Quarter-end volume was 3.1x']],
  ['2026-10-07', 'maya', ['Q4 priorities: self-serve onboarding, load board search, multi-stop pricing', 'Carrier scorecards to nightly batch (ADR 0022)', 'GraphQL BFF being deprecated']],
  ['2026-10-14', 'ravi', ['Multi-stop pricing proposal posted, FCP opens 10/21', 'Sales wants it before Brightline renewal']],
  ['2026-10-21', 'jordan', ['Kestrel retry storm → [[2026-10-16-webhook-retries-amplified]] (in review)', 'Detention auto-billing proposal from Priya + Jordan']],
  ['2026-10-28', 'chloe', ['Passkeys ADR proposed — security review with Priya', 'Credential stuffing up 3x; Cloudflare bot rules tightened']],
  ['2026-11-04', 'sam', ['Oncall: Sam primary this week', 'Snowflake bill: $21.4k in October', 'ClickHouse proposal coming']],
  ['2026-11-11', 'maya', ['Cert expiry incident → [[2026-11-06-cert-expiry-internal-grpc]] — postmortem still draft, Sam', 'v1 webhook deprecation ADR proposed', 'Thanksgiving freeze 11/23–11/27']],
  ['2026-11-18', 'ravi', ['Load board stale results → [[2026-11-15-load-board-search-stale]]', 'Multi-stop FCP closes Friday', '_agenda still open — add items below_']],
];

export const meetings = syncTopics.map(([date, author, items], i) => {
  const attendees = Object.values(people).filter((_, j) => (i + j) % 5 !== 0);
  const actions = [
    `${who(author)} to post a summary in #eng`,
    ...(i % 3 === 0 ? [`${who(['daniel', 'priya', 'tomasz'][i % 3])} to update the related spec`] : []),
    ...(i % 4 === 1 ? ['Sam to check alert noise from last week'] : []),
  ];
  const isLast = i === syncTopics.length - 1;
  return {
    path: `meetings/eng-sync/${date}-eng-sync.md`,
    date,
    author,
    front: { title: `Eng sync — ${date}`, type: 'meeting', date, facilitator: who(author), attendees, tags: ['meeting', 'eng-sync'] },
    body: `# Eng sync — ${date}\n\nFacilitator: ${who(author)}${isLast ? '' : ` · Notes: ${who(Object.keys(people)[(i + 3) % 10])}`}\n\n## Updates\n\n${items.map((x) => `- ${x}`).join('\n')}\n\n## Discussion\n\n${isLast ? '' : i % 2 === 0 ? 'Mostly status this week. Short discussion on whether the weekly sync should move to Tuesdays for the EU folks — no change for now.' : 'Spent most of the time on the first item. Agreement that we need clearer owners before committing dates.'}\n\n## Action items\n\n${isLast ? '- [ ] ' : actions.map((a, k) => `- [${i < syncTopics.length - 3 || k > 0 ? 'x' : ' '}] ${a}`).join('\n')}\n`,
  };
});

void incidents;
