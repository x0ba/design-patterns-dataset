<!-- exxeta:l1b schema_version=1 -->

## Chronos

- Current scaffold timestamp: 2026-11-18T02:47:51.001Z
- Persistent agent id: data-platform-practice
- Agent display name: Data Platform Practice
- Lifecycle state: ready
- Last checkpoint: none
- Last checkpoint at: 2026-11-12T16:30:00.000Z
- Last consolidation: none
- Last consolidation at: 2026-11-06T16:30:00.000Z

## Deep Memory

### Collaboration & Working Style

- Mara reviews merge requests in batches twice a day — roughly 09:15 and 16:40 CET — so anything tagged for her after 17:00 sits until the next morning. Queueing a GitLab CI review for her at 16:20 is the reliable slot. (saved 2026-06-13)
- Jonas wants Mara's review comments answered inline in GitLab rather than in the #lakehouse channel; the thread history is what the Lakehouse migration cutover audit will be reconstructed from. (saved 2026-06-30)
- Ingrid answers Slack DMs within minutes but ignores channel mentions for days. For anything Data-quality-program-critical, DM her and cross-post the outcome yourself. (saved 2026-07-05)
- Jonas and Priya disagree structurally, not personally: Jonas optimises for shipping Self-serve analytics features, Priya for reversibility. Jonas's role in their threads is to name the tradeoff explicitly, which ends the loop in one message. (saved 2026-07-18)
- The 21 Jul Customer 360 schema review deadlocked for 90 minutes on surrogate keys. Broken by user asking each side to state the other's position first — Jonas could not, and conceded within five minutes. (saved 2026-08-07)
- Sam prefers to be told the constraint rather than the solution and reacts poorly to prescriptive tickets; the ArgoCD rollout redesign he produced in early July was better than the one user had specified. (saved 2026-08-20)
- The delegation nearly failed: Mara was never added to CODEOWNERS until user caught it on 4 Aug, one day after Priya left, blocking two Observability rollout MRs. Delegations must change the file, not the calendar. (saved 2026-09-03)
- Dario negotiates vendors well but forecasts timelines optimistically by roughly a factor of two; user now doubles every date he gives before putting it in a plan. (saved 2026-09-14)
- Vendor consolidation milestones are tracked with Dario's date and user's adjusted date side by side in the plan, visible to Dario. He objected once on 22 Jul, then stopped, and his last two estimates came in tighter. (saved 2026-09-23)
- Escalation thresholds for async threads now sit at the bottom of ways-of-working under 'When to break glass', added 15 Aug after the warehouse-sizing thread. (saved 2026-10-06)
- Ingrid and Keiko formed an unplanned mentoring pair over the dbt test-coverage work in August; user has stayed out of it deliberately and only asks Ingrid for status once a fortnight. (saved 2026-10-20)
- Ingrid was named sole owner of the reconciliation/regulatory overlap on **10 Jul 2026**, with Tomás explicitly consulted-not-accountable. The first shared control shipped nine days later. (saved 2026-11-08)

### Project Notes

- Lakehouse migration phase 1 (raw landing zone on Snowflake) closed **12 Jun 2026**, three days late, because the Kafka connector for the `orders` topic dropped 1.4M records during the 8 Jun replay and had to be re-run from offset 0. (saved 2026-06-21)
- Vendor consolidation's target is retiring **6 of 11 data vendors by 31 Oct 2026**. As of 29 Aug, three are done (contract terminated), one is in notice period, and two are blocked on Dario not having legal review time. (saved 2026-07-19)
- Postmortem for the July Regulatory reporting miss was written **6 Aug**, within the 48-hour window, and its single action item was moving the close-critical reads off the lagging replica to the primary — done 12 Aug by Lennart. (saved 2026-08-12)
- Lennart owns the Postgres fleet and is the only person who has ever run a major-version upgrade here. The 15→16 upgrade is pencilled for **early Oct**, deliberately after the Identity cutover. (saved 2026-09-10)
- Lakehouse migration phase 2 — moving the 210 legacy Postgres-backed models to Snowflake — is **61% complete by model count but only 34% by query volume**, because the heaviest models were deliberately left for last. (saved 2026-10-04)
- Support's account-flag need was real, so it went to Lennart as a small Postgres-backed internal tool with an audit table — shipped **21 Aug**, roughly 3 days of work, and it removed the writeback argument for good. (saved 2026-10-25)

### Infrastructure Decisions

- The rejection rationale for Databricks lives in the same file shape Vendor consolidation uses: `lakehouse-migration/decisions/2026-06-18-warehouse-engine.md`, one file per decision with a mandatory 'What we are not doing' section. (saved 2026-06-17)
- Airflow runs on the Kubernetes executor, not Celery — switched in May 2026 after Celery workers held idle memory for hours. The tradeoff accepted openly: **pod startup adds ~40s to every task**, which is why short Regulatory reporting tasks were batched into fewer operators. (saved 2026-07-14)
- Terraform state moved from the S3+DynamoDB lock backend to Terraform Cloud on **9 Jul**, chosen mainly so Priya's prod approval delegation to Mara could be enforced by policy rather than by convention. (saved 2026-07-29)
- ArgoCD owns all Kubernetes deployment; GitLab CI is forbidden from calling `kubectl apply` directly. The boundary was drawn on **24 Jun** after two teams disagreed about which system was the source of truth for the Airflow scheduler image. (saved 2026-08-22)
- The authoritative infrastructure decision index is `platform/decisions/README.md`, a table of ADR id, date, owner, and status. Mara maintains it and is the person who notices when a decision was made verbally and never written down. (saved 2026-09-13)
- That move set Airflow log retention at 45 days in S3 with the DB rows pruned at 90 — deliberately asymmetric so task history stays queryable for a quarter while logs don't accumulate. (saved 2026-10-09)
- On 26 Aug a flag row was updated without a comment column entry and nobody could reconstruct why a Customer 360 backfill had been disabled for six days. A NOT NULL `reason` column was added the same day. (saved 2026-10-31)

### Stakeholder Context

- On **17 Jul** Ulrike copied her director on a thread about Observability rollout scope. The trigger was not the scope cut itself but that she learned about the 340→47 DAG reduction from a Grafana dashboard title, not from user. (saved 2026-06-19)
- Tomás disputes in the room and complies afterwards; Priya's mistake in June was reading his pushback on the reconciliation schema as refusal and re-litigating it in writing, which cost four days. (saved 2026-06-28)
- Dario will absorb a cost overrun quietly but never a surprise contract-renewal date. The one thing he asked user for on 3 Jun was a 60-day heads-up on any tool user intends to drop. (saved 2026-07-16)
- Observability rollout success is reported to Ulrike as 'the 47 revenue-path DAGs have alerting', never as a percentage of 340, because the percentage invites the question of when the other 293 arrive. (saved 2026-07-28)
- The single source that resolved e44 is `finance/savings-ledger.md`, owned by Keiko, where every claimed saving carries the project that booked it. Dario now reads from it rather than maintaining his own. (saved 2026-08-18)
- Tomás's stakeholder weakness is written comms, not judgement; his Airflow migration notes were read as dismissive by Priya twice. Jonas reviews anything Tomás sends outside engineering. (saved 2026-09-01)
- Jonas will correct the Q3 promise in writing to Ulrike before **Fri 28 Aug** rather than letting it reach her director second-hand, accepting one bad week now over an escalation later. (saved 2026-09-16)
- Mara has now run two stakeholder conversations solo — the legacy Postgres notice and the 14 Aug warehouse thread wrap-up — and both landed cleanly. This is the practical case for the deputy title. (saved 2026-10-03)
- Ingrid's three-strikes rule was tested on **19 Aug** when a single dbt test failure blocked a filing-adjacent model. Jonas backed her publicly and privately negotiated a one-off manual bridge, which is the pattern she asked for in e14. (saved 2026-10-22)
- No one has asked Tomás whether he wants the Airflow ownership he was given on **s2-e34**; he accepted without comment, and his 15:30 hard stop makes the on-call implication genuinely unresolved. (saved 2026-11-05)

### Data & Reporting

- The 28-day vs 30-day definition split explains the persistent **1.7% gap** between the Customer 360 active-count tile and the Billing reconciliation summary. Tomás chased this for three weeks before the definitions were compared side by side. (saved 2026-06-16)
- Revenue is reported in three places with three grains: Metabase `Exec Revenue` (daily, net of refunds), the Snowflake view `vw_revenue_gross` (hourly, gross), and Ingrid's regulatory extract (monthly, net of refunds and chargebacks). All three are correct; none are labelled. (saved 2026-06-29)
- Naming convention adopted **25 Jun**: every revenue-bearing model carries a suffix `_gross` or `_net`, and unqualified names are banned in new models. Existing unqualified names get aliases rather than renames, because Metabase questions hard-code them. (saved 2026-07-19)
- Dashboards on that hygiene list for two consecutive months get archived, not deleted, with a 30-day restore window. Agreed with Keiko **6 Jul**; archived items keep their URL so nobody hits a 404 in a slide deck. (saved 2026-08-02)
- The two manual Excel steps in `reg_monthly` have no documented formulas and no second person who can run them. Ingrid has agreed in principle to write them up but no date is set — flagged as the single largest key-person risk in the reporting stack. (saved 2026-08-15)
- The July Regulatory reporting miss traced to a Kafka consumer lag of 3.5 hours that nobody was alerted on, because the lag dashboard existed but had no alert rule attached. The postmortem action was an alert, not a dashboard. (saved 2026-09-03)
- The definitive list of certified datasets — the ones Self-serve users are told to trust — is the Snowflake tag `CERTIFIED=true` applied via Terraform in `terraform/snowflake/tags.tf`. Metabase reads it into a collection badge nightly. (saved 2026-09-20)
- The 3 Jun standup overran because Tomás and Ingrid were reconciling two different variance numbers — his from the pre-tolerance raw diff, hers from the post-tolerance report. The two reports had the same title. (saved 2026-09-29)
- Restatements after T+3 require Ingrid's sign-off and a row in the restatement log, because the regulatory extract has already consumed the numbers by then. Nobody has invoked it yet. (saved 2026-10-20)
- Sam wants a single written weekly data-health summary rather than a standing meeting, matching how he engages elsewhere. Jonas agreed to produce it Fridays after Ingrid's triage so the two sources agree. (saved 2026-10-29)

### Vendor & Procurement

- The authoritative vendor list is `procurement/vendor_register.yaml` in GitLab — 41 active vendors as of **12 Jun**, each with renewal date, owner, annual value and a `consolidation_candidate` boolean. Dario's $180k target is computed off this file, not off finance's GL export, and the two disagree by roughly $60k. (saved 2026-06-24)
- Nobody has established whether the dbt Labs contract's seat definition counts service accounts. We run 9 human developers and 4 CI identities; if the CI identities are billable seats we are under-licensed by 4 and have been since **March**. (saved 2026-07-09)
- Dario's $180k consolidation target breaks down as: CDP retirement $74k, three overlapping BI licences $41k, a duplicate secrets manager $22k, and $43k of 'to be identified'. The last bucket has been $43k since **June** and has not moved. (saved 2026-07-31)
- The Metabase renewal nearly auto-renewed unnoticed on **20 Jun** at a 22% uplift; Mara caught it while reconciling the register against invoices. She had no procurement role and no reason to be looking — this is characteristic of her. (saved 2026-08-12)
- No BI re-tender before **Q2 2027**. Rationale given publicly: Self-serve analytics adoption needs a stable surface for two more quarters. Rationale not given publicly: a tender would consume Keiko's documentation quarter entirely. (saved 2026-09-03)
- Our Snowflake account team changed on **6 Jul** — third rep in fourteen months. Each change has cost roughly three weeks re-explaining the migration, and the new rep re-opened questions the previous one had closed in writing. (saved 2026-09-26)
- Identity re-platforming's IdP vendor committed in writing on **30 Jun** to SCIM group-sync GA by 15 Aug. It slipped to 30 Sep, announced on 11 Aug — four days before the promised date and after our 12-week dual-write plan was already built around it. (saved 2026-10-14)
- Dario committed the $180k reduction to Ulrike **before user joined the programme**, in a forum user was not in, and it appears in Ulrike's board pack as a firm number. Whatever the accounting question about the $29k, the political question is whether Ulrike's pack can be amended at all. (saved 2026-10-24)

### Team & Hiring

- DP-114 was prioritised over DP-115 on **8 Jun** because Lakehouse migration's dbt surface grew faster than its Terraform surface. Practical effect: platform work stays on Priya and Mara through Q3 with no relief. (saved 2026-06-09)
- Priya's **PTO 3–21 Aug** removed the only reviewer for Tomás's Terraform work, so his alert-routing module sat unmerged for 12 days. The Terraform approval delegation to Mara covered prod applies but not module review. (saved 2026-06-29)
- Sam's resignation surfaced a real single-point-of-failure: **11 Airflow DAGs** in Billing reconciliation had him as sole code owner and sole on-call escalation. The bus-factor audit that found this was run on 15 Jul, two days after notice. (saved 2026-07-08)
- Billing reconciliation ownership splits rather than transfers: Mara takes the DAG orchestration, Lennart takes reconciliation logic. Decided **21 Jul** because giving one person all of Sam's surface just recreates the same failure. (saved 2026-07-16)
- DP-115 (platform SRE) was re-prioritised above DP-114 on **24 Jul** in direct response to Sam leaving. Reverses the June sequencing decision; the analytics engineer req stays open but the loop pauses. (saved 2026-08-01)
- Lennart joined **1 Jun 2026** as a mid-level data engineer, so he was nine weeks in when he inherited Billing reconciliation logic from Sam. That is earlier ownership than the standard 90-day plan assumes. (saved 2026-08-08)
- Any hiring or staffing question for Ingrid goes by DM, not the team channel. Channel mentions to her reliably sit unread for days, which has already delayed one interview scheduling round by four days. (saved 2026-08-23)
- Candidate 'K.R.' on DP-115 got a strong yes from Mara and Priya and a no from user, over a scope-negotiation answer. **Jonas's no held**, but the disagreement is documented in the scorecard file rather than smoothed over. (saved 2026-09-03)
- Nobody has asked Jonas's own manager whether his dbt review load is visible or credited on his side. If it is not, the arrangement collapses the moment his priorities shift. (saved 2026-09-14)
- On-call minimum is now two named people per service before it goes on the rotation at all. Services failing that test get their pages routed to user personally until a second owner exists. (saved 2026-09-25)
- The published SLA promised to Keiko has no owner once Tomás transitions to platform. Raised 11 Aug, still open at month end. (saved 2026-10-12)
- Interview scheduling is done by user personally, not by a coordinator, and it is the single largest recurring time sink in the hiring loop — roughly **four hours a week** during active pipelines. (saved 2026-10-24)
- Dario's growth conversation is the hardest one on the team: he is excellent commercially and consistently optimistic on delivery, and the fix attempted in July was structural — his dates now go through Mara before they reach Ulrike. (saved 2026-11-06)

### Process Agreements

- Severity is declared by the primary alone and is never downgraded during an incident — only in the review afterwards. Agreed to stop the mid-incident haggling that ate 20 minutes on **19 Jun**. (saved 2026-06-23)
- Freeze exceptions require user's written approval in the incident channel — not verbal, not DM. Two were granted in the period, both for expiring credentials. (saved 2026-07-17)
- Alert routing follows the on-call rotation except for Observability rollout alerts between 09:00 and 18:00, which Tomás and Lennart take first-response on to shield Priya's focus time. (saved 2026-08-07)
- The shielding rule had an unintended consequence: Identity re-platforming pages fell outside every named exception and routed to user personally for **nine days** in August before anyone noticed the gap. (saved 2026-09-03)
- Rejection emails at onsite stage are user's personal duty within **48 hours**, and this was explicitly written into the process handbook so it survives a busy week rather than depending on goodwill. (saved 2026-10-03)
- Secrets rotation is a documented on-call duty rather than a project task: the primary checks Vault lease expiries at the start of each shift, a five-minute item on the handover checklist. (saved 2026-10-22)

### Incident Learnings

- Every Terraform module now names an owner in a `OWNERS` file at module root, and GitLab CI fails the plan if the file is missing. Direct follow-up to e5, merged **12 Aug**; 34 of 41 modules were backfilled, the remaining 7 are all legacy VPN modules nobody claims. (saved 2026-06-09)
- The e7 drift went unnoticed for 4 hours because Grafana alerted on query failure, not query latency. We had no latency SLO on Snowflake at all until 14 Aug. (saved 2026-06-25)
- After e15, `full_refresh` in committed dbt config is a CI hard failure; backfills must pass `--full-refresh` on the command line instead. Jonas wrote the check on 25 Jun, it has blocked 6 MRs since, and Keiko hit it twice in her first fortnight. (saved 2026-07-08)
- CI queue times hit 40 minutes on **Tue 21 Jul** after the switch to self-hosted spot runners; two spot reclaims mid-job left dbt state files corrupt, and the 16:40 review batch slipped entirely. (saved 2026-07-19)
- Regulatory reporting missed its **5th working day** deadline in July by 9 hours — the first miss in 14 months — because an upstream vendor SFTP drop arrived at 03:00 instead of 21:00 and nothing alerted on absence, only on failure. (saved 2026-07-26)
- Uniqueness assumptions must now be encoded as dbt tests before any migration script relies on them — the rule came out of e27 and Priya wrote it into the migration runbook. 9 such tests added; 2 of them fail on real production data, which was itself the finding. (saved 2026-08-12)
- Jonas wants incident impact expressed in business units first — pounds, records, missed deadlines — and technical detail second. A postmortem that opens with a stack trace gets sent back; this has happened to Sam three times. (saved 2026-08-25)
- A Grafana dashboard silently showed stale data for **six days** in June because the Prometheus remote-write endpoint was returning 200 while dropping samples over cardinality limits. Nobody noticed until Jonas questioned a suspiciously flat line. (saved 2026-09-04)
- Deploy freeze now starts 2 hours before handover, not at end of day, agreed after e47. Effective window is therefore Tue–Thu until 16:00, which Lennart has pointed out squeezes his review-then-deploy loop uncomfortably. (saved 2026-09-18)
- `prevent_destroy` lifecycle blocks added to all Kafka topic and Snowflake database resources after e49, plus a CI check that any plan showing a destroy on those types requires a second approver. Two false alarms since, no repeats. (saved 2026-10-03)
- Snowflake task failures went unnoticed for **9 days** in early July because task history was only queryable for 7 days and nobody had a monitor. The gap was discovered while investigating something else entirely. (saved 2026-10-10)
- Cost governance dashboards themselves cost **$620 in July** — 8% of the savings they were tracking — because each of the 14 panels ran an independent unaggregated query every 60 seconds. Noticed by Dario, who found it funnier than anyone else did. (saved 2026-10-21)
- The e63 reconciliation job's alert had been misconfigured to a Slack channel that was archived in June. This is now the standard example for why alert destinations must be validated at deploy time. (saved 2026-10-31)

## Active Items

- Review Mara's Lakehouse cut-over checklist before Thursday. (saved 2026-11-10)
- Decide on Airflow vs. Dagster for the 2027 orchestration standard. (saved 2026-11-06)
- Collect Q4 cost numbers for the cost governance review. (saved 2026-11-03)
- Follow up with Ingrid on the regulatory reporting audit evidence. (saved 2026-10-29)

## Recent Context

No checkpointed sessions yet.
