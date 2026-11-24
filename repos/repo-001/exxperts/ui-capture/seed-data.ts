// Content for seed-rooms.ts: the rooms of Jonas Keller, a senior consultant who
// has used exxperts since early summer 2026.
export interface RoomSeed {
	name: string;
	description: string;
	ageDays: number;
	lastUsedDays: number;
	topics: { title: string; notes: string[] }[];
	active: string[];
	conversation: { role: "user" | "assistant"; text: string }[];
	waiting?: { title: string; arc: string; points: string[] }[];
}

export const ROOMS: RoomSeed[] = [
	{
		name: "Helvetia CRM Migration",
		description: "Client project: moving Helvetia Versicherungen from Siebel to Salesforce Financial Services Cloud.",
		ageDays: 152,
		lastUsedDays: 0,
		topics: [
			{ title: "Project Basics", notes: [
				"Client is Helvetia Versicherungen (Basel). Sponsor is **Marta Brunner**, Head of Customer Operations; day-to-day contact is **Reto Imhof** (IT project lead).",
				"Scope: migrate ~1.2 M customer records and 340k open policies from Siebel 8.1 to Salesforce Financial Services Cloud; decommission Siebel by end of Q2 2027.",
				"Go-live is planned for **9 March 2027**, with a fallback cut-over weekend on 16 March.",
				"Budget is CHF 1.85 M for EXXETA's part; we're at 61% burn as of end of October.",
				"Team on our side: Jonas (engagement lead), Priya Raman (solution architect), Lukas Meier (data migration), Sophie Graf (change & training).",
			] },
			{ title: "Decisions", notes: [
				"Address clean-up for the legacy Swiss branch records (about 1.3% of customers) will be done **after** go-live; agreed with Marta on 22 Oct.",
				"Reporting dashboard moved to phase 2, since its data only exists after the migration.",
				"Integration with SAP FI-CA goes through MuleSoft, not point-to-point. Reto insisted on this because of their API governance board.",
				"Dry-runs happen on the second weekend of every month until go-live.",
			] },
			{ title: "Stakeholders & Working Style", notes: [
				"Marta prefers short written updates with a clear Red/Amber/Green per area; she reads them on Friday mornings.",
				"Reto gets nervous about anything touching the SAP interface. Loop him in early, never surprise him in steering.",
				"The Finance key users are only available Tuesdays and Thursdays, and almost not at all in January (year-end close).",
				"Steering committee meets every second Wednesday at 14:00 in Basel; slides due Monday evening.",
			] },
			{ title: "Risks & Lessons", notes: [
				"Dry-run #2 failed on duplicate policy numbers created by a 2019 Siebel patch. Lukas wrote a dedupe rule; dry-run #3 loaded 98.7% cleanly.",
				"IT Ops has not yet confirmed the cut-over weekend. Escalate via Marta if there's no answer by 20 Nov.",
				"Training material must be in German **and** French: Lausanne office has 60 agents.",
			] },
		],
		active: [
			"Get IT Ops confirmation for the 9 March cut-over weekend (deadline 20 Nov).",
			"Prepare steering committee slides for 25 Nov: migration status, UAT plan, cut-over options.",
			"Review Lukas' dedupe rule documentation before it goes to Helvetia's data office.",
			"Ask Sophie for the French training plan draft.",
			"Send Reto the updated MuleSoft interface spec (v1.4).",
		],
		waiting: [
			{ title: "UAT plan for the invoicing module", arc: "Jonas and the room reworked the UAT schedule around the Finance year-end close.", points: ["Invoicing UAT moves from 12–23 Jan to 5–16 Jan; Finance key users confirmed for Tuesdays and Thursdays only.", "Sophie will prepare 14 test scripts in German; French versions only for the claims module."] },
			{ title: "Dedupe rule review with Lukas", arc: "Went through Lukas' duplicate-policy rule before it goes to Helvetia's data office.", points: ["Rule keys on policy number + birth date + postcode; catches 4,212 duplicates from the 2019 patch.", "Edge case: joint policies for married couples must not be merged. Lukas adds an exception list."] },
		],
		conversation: [
			{ role: "user", text: "Can you draft this week's steering committee status report? Dry-run 3 went well, SAP interface spec got signed off Tuesday, but we still don't have IT Ops' OK for the cut-over weekend." },
			{ role: "assistant", text: "Here's a draft you can paste into the steering committee update:\n\n**Status: Amber** (schedule), Green (budget), Green (scope)\n\n**What moved this week**\n- Data migration dry-run #3 completed: 98.7% of customer records loaded cleanly; the remaining 1.3% are address formats from the legacy Swiss branch system.\n- SAP interface spec signed off by the integration team on Tuesday.\n\n**Risks**\n1. *Go-live on 9 March depends on the cut-over weekend being confirmed by IT Ops.* Mitigation: we've asked for a decision by 20 November and prepared a fallback weekend (16 March).\n2. Key-user availability in Finance drops in January (year-end close). We propose moving UAT for the invoicing module one week earlier.\n\n**Decisions needed**\n- Approve the fallback cut-over date.\n- Confirm that the address clean-up can be done post go-live (agreed informally with Marta on 22 Oct).\n\nWant me to shorten it to three bullets for the email version?" },
			{ role: "user", text: "Yes, three bullets for Marta please. She reads these on her phone." },
			{ role: "assistant", text: "Here you go:\n\n- **Amber on schedule only**: dry-run 3 loaded 98.7% cleanly and the SAP interface is signed off, but IT Ops still hasn't confirmed the 9 March cut-over weekend.\n- **Ask**: please nudge IT Ops for a decision by 20 Nov; fallback is 16 March.\n- **Heads-up**: we'd like to pull Finance UAT one week earlier to avoid the year-end close.\n\nI left out the address clean-up since she already agreed to it." },
		],
	},
	{
		name: "Proposal Writing",
		description: "Offers, RFP answers and pitch decks for new business.",
		ageDays: 138,
		lastUsedDays: 2,
		topics: [
			{ title: "House Style", notes: [
				"EXXETA proposals use the 'Situation – Approach – Team – Commercials' structure; never more than 12 pages before annexes.",
				"Jonas wants day rates shown per role, not blended, unless the client explicitly asks for a fixed price.",
				"Avoid the words 'holistic' and 'synergies'. Jonas finds them meaningless.",
				"Reference cases need written client approval. Approved so far: Baloise (claims portal), SBB Cargo (data platform), Migros Bank (onboarding).",
			] },
			{ title: "Pipeline", notes: [
				"Zurich Kantonalbank RFP (core banking reporting) submitted 3 Sep; shortlisted, orals were on 2 Oct; **lost** on price to Accenture.",
				"Swiss Re innovation lab pitch: small (CHF 180k), won in August, starts January.",
				"Emmi supply-chain analytics: discovery workshop sold, proposal for implementation due 28 Nov.",
				"Debriefs show we lose on price when we propose more than 30% senior staff.",
			] },
			{ title: "Rates & Commercials", notes: [
				"2026 rate card: Partner 2,400, Senior Manager 1,950, Manager 1,650, Senior Consultant 1,350, Consultant 1,100 CHF/day.",
				"Max discount without partner approval is 8%.",
			] },
		],
		active: [
			"Emmi implementation proposal: first full draft by 24 Nov, final 28 Nov.",
			"Update the Migros Bank reference case with the 2026 numbers.",
			"Ask Anna Schmid in finance whether the 2027 rate card is out yet.",
		],
		waiting: [
			{ title: "ZKB debrief notes", arc: "Captured the debrief call after losing the Zurich Kantonalbank RFP.", points: ["ZKB scored us best on approach (8.5/10) but 22% above the winning bid.", "Their procurement weights price at 40%; next time propose a leaner phase 1."] },
		],
		conversation: [
			{ role: "user", text: "For the Emmi proposal, give me a team setup for a 5-month implementation that stays under 30% senior staff. Roughly 3.5 FTE." },
			{ role: "assistant", text: "Here's a setup that keeps senior share at about 27%:\n\n| Role | Allocation | Days (5 months) | Rate (CHF) | Cost (CHF) |\n| --- | --- | --- | --- | --- |\n| Senior Manager (engagement lead) | 40% | 42 | 1,950 | 81,900 |\n| Manager (solution lead) | 100% | 105 | 1,650 | 173,250 |\n| Senior Consultant (data engineering) | 100% | 105 | 1,350 | 141,750 |\n| Consultant (analytics) | 100% | 105 | 1,100 | 115,500 |\n| Partner (QA, steering) | 10% | 10 | 2,400 | 24,000 |\n| **Total** | **3.5 FTE** | **367** | | **536,400** |\n\nSenior share (Partner + Senior Manager) is 52 of 367 days, about 14% by days, or 20% by cost. If Emmi's procurement counts Managers as senior too, it's 43% by days, so I'd describe the Manager as 'solution lead' rather than 'senior'.\n\nShould I add an option with a 6% discount for a fixed-price variant?" },
		],
	},
	{
		name: "Weekly Planning",
		description: "Monday planning, Friday review, and keeping my calendar sane.",
		ageDays: 160,
		lastUsedDays: 0,
		topics: [
			{ title: "How I Work", notes: [
				"Jonas blocks Monday 08:00–08:45 for planning and Friday 16:00–16:30 for a weekly review.",
				"Deep work is best before 11:00; meetings preferably afternoons.",
				"No more than 2 client days in Basel per week: the commute from Zurich is 1h each way.",
				"Wants the weekly review to end with exactly three priorities for next week.",
			] },
			{ title: "Recurring Commitments", notes: [
				"Helvetia steering committee: every 2nd Wednesday 14:00, Basel.",
				"Practice lead sync with Daniela Vogt: Thursdays 09:30, 30 min.",
				"Mentoring call with Noah (junior consultant): every other Tuesday 17:00.",
				"Bouldering with Sam on Wednesday evenings; protect this.",
			] },
			{ title: "Past Reviews", notes: [
				"October review: too many internal meetings (11 h/week). Decided to decline optional practice calls.",
				"September: missed the Emmi workshop prep because of Helvetia firefighting. Lesson: block prep time the week before, not the day before.",
			] },
		],
		active: [
			"Decline the optional 'AI Community of Practice' call series.",
			"Book train to Lausanne for the 3 Dec training dry-run.",
			"Write self-assessment for year-end review (due 5 Dec).",
			"Plan Christmas break: off 22 Dec – 5 Jan, tell Marta and Daniela.",
		],
		conversation: [
			{ role: "user", text: "Monday planning. This week: Helvetia steering on Wednesday, Emmi proposal draft due Monday next week, self-assessment due 5 Dec, and I'm in Basel Tue+Wed. What should my top 3 be?" },
			{ role: "assistant", text: "Given what's fixed this week, I'd go with:\n\n1. **Helvetia steering (Wed)**: slides need to be with Marta by Monday evening, so finish them today. The IT Ops cut-over decision is the one item she needs to push on.\n2. **Emmi proposal draft**: block Thursday and Friday mornings (deep-work slots) for it. Tuesday and Wednesday in Basel won't give you focus time.\n3. **Self-assessment**: just an outline this week, 45 minutes on Friday after the weekly review. It's due 5 Dec, so next week is for writing.\n\nOne conflict: Thursday 09:30 is your sync with Daniela. If you move it to 13:00 you get an unbroken Emmi block until lunch." },
			{ role: "user", text: "Good. Move Daniela to 13:00 then." },
			{ role: "assistant", text: "I can't change your calendar from here. This room has no calendar connector. Here's a short note you can send her:\n\n> Hi Daniela, could we move Thursday's sync to 13:00? I'd like to keep the morning for the Emmi proposal. Thanks! Jonas\n\nI'll keep the Thursday-morning block for Emmi in this week's plan." },
		],
	},
	{
		name: "Hiring – Senior Data Engineer",
		description: "Interview notes and decisions for the open Senior Data Engineer role (Zurich).",
		ageDays: 74,
		lastUsedDays: 6,
		topics: [
			{ title: "Role", notes: [
				"Senior Data Engineer, Zurich, 80–100%. Must have: Spark or dbt, cloud data platforms (Azure preferred), German B2+.",
				"Salary band agreed with HR: CHF 125–145k, depending on experience.",
				"Interview loop: CV screen → 45 min fit call (Jonas) → technical case (Priya) → final with Daniela.",
			] },
			{ title: "Candidates", notes: [
				"**Elena Kovač**: strong dbt/Snowflake, 6 years; technical case excellent; asked for 150k. Offer sent 4 Nov at 145k + training budget; **accepted** 11 Nov, starts 1 Feb.",
				"**Marco Bianchi**: good Spark, weak on stakeholder communication; Priya said no after the case.",
				"**Hannah Weiss**: withdrew after fit call; took an internal offer at UBS.",
				"**Tobias Frei**: junior for the role (2 years). Suggested he apply for the Consultant opening instead.",
			] },
			{ title: "Process Notes", notes: [
				"The technical case (pipeline design for a retail chain) takes candidates ~3 h; we pay CHF 300 for it since September.",
				"Recruiting agency Hays charges 22%. Daniela wants direct hires first.",
			] },
		],
		active: [
			"Prepare Elena's onboarding plan with Priya (first 30 days on Helvetia data migration?).",
			"Close the role on LinkedIn and Jobs.ch.",
			"Send Tobias' CV to the Consultant hiring manager.",
		],
		conversation: [
			{ role: "user", text: "Elena accepted! Can you draft a 30-day onboarding plan? She'll probably join Helvetia's migration team." },
			{ role: "assistant", text: "Great news. Here's a first draft:\n\n**Week 1: Orientation**\n- EXXETA onboarding day (IT, HR, tools), laptop and Azure access.\n- Read the Helvetia project charter, data migration concept and the dry-run reports #1–#3.\n- Coffee with Lukas (data migration lead) and Priya.\n\n**Week 2: Shadowing**\n- Join Lukas for the dedupe rule work and the mapping sessions.\n- Attend one steering committee as an observer (25 Nov is too early; take 9 Dec).\n\n**Weeks 3–4: Own a slice**\n- Take ownership of the policy-object mapping for the dry-run on 13–14 Dec.\n- First 1:1 with you at the end of week 4: what's unclear, what she'd change.\n\nOne thing to check: she starts 1 Feb, which is only five weeks before go-live. Maybe a lighter first month and real ownership only after the cut-over?" },
		],
	},
	{
		name: "Workshop Design",
		description: "Designing client workshops: agendas, exercises, materials.",
		ageDays: 121,
		lastUsedDays: 13,
		topics: [
			{ title: "Formats That Worked", notes: [
				"Silent brainstorming on sticky notes before discussion: works much better with Swiss clients than open brainstorming.",
				"Half-day format (09:00–13:00) beats full day; energy drops after lunch.",
				"'Pain point bingo' warm-up got a good reaction at Emmi in September.",
				"Always bring the real numbers (ticket statistics, volumes) so the discussion stays grounded.",
			] },
			{ title: "Upcoming", notes: [
				"Emmi implementation kick-off workshop, probably mid-January in Lucerne, 12 participants.",
				"Helvetia train-the-trainer for Lausanne on 3 Dec, in French.",
			] },
		],
		active: [
			"Draft agenda for the Emmi kick-off workshop.",
			"Order A0 prints of the Helvetia process map for Lausanne.",
		],
		conversation: [
			{ role: "user", text: "Plan a half-day workshop to map the current order-to-cash process at Emmi and find the top pain points." },
			{ role: "assistant", text: "Here's a proposed agenda for the half-day workshop (09:00–13:00):\n\n| Time | Block | Goal |\n| --- | --- | --- |\n| 09:00 | Welcome & goals | Agree what \"done\" looks like for today |\n| 09:20 | Current-state walkthrough | Process owner shows today's flow end to end |\n| 10:10 | Pain points (silent brainstorm, then clustering) | Top 5 issues, ranked |\n| 10:50 | *Break* | |\n| 11:05 | Target picture | Sketch the future flow for the top 3 issues |\n| 12:15 | Quick wins vs. projects | Sort ideas by effort / impact |\n| 12:45 | Next steps & owners | Every action has a name and a date |\n\nMaterials: a printed process map (A0), sticky notes in three colours, and the order statistics from Q3 so the discussion stays grounded in numbers." },
		],
	},
	{
		name: "Personal Admin",
		description: "Expenses, travel, taxes and other life admin.",
		ageDays: 145,
		lastUsedDays: 9,
		topics: [
			{ title: "Travel & Expenses", notes: [
				"Jonas has a GA travelcard (1st class) paid by EXXETA; only hotels and meals go through expenses.",
				"Expense deadline is the 5th of the following month in Concur.",
				"Preferred hotel in Basel: Hotel Victoria at the station, corporate rate CHF 189.",
			] },
			{ title: "Taxes & Household", notes: [
				"Tax return 2025 filed on 28 Aug with extension; Pillar 3a contribution 7,258 CHF maxed.",
				"Apartment lease in Zurich Wiedikon renews 31 March; rent CHF 2,640.",
				"Car insurance switched to Smile in June, saves ~CHF 380/year.",
			] },
		],
		active: [
			"Submit October expenses in Concur (Basel hotel x4, client dinner 14 Oct).",
			"Pay Pillar 3a 2026 contribution before 20 Dec.",
			"Renew passport (expires Feb 2027).",
		],
		conversation: [
			{ role: "user", text: "What do I still need to do before year end, money-wise?" },
			{ role: "assistant", text: "From what this room knows:\n\n1. **Pillar 3a**: pay the 2026 contribution (max CHF 7,258) before 20 Dec so it counts for this tax year.\n2. **October expenses**: still open in Concur. 4 nights at Hotel Victoria and the client dinner on 14 Oct. The deadline was 5 Nov, so it's overdue; submit with a short note.\n3. **November expenses**: due 5 Dec.\n\nNot money, but time-sensitive: your passport expires in February 2027, and appointments in Zurich currently take ~4 weeks." },
		],
	},
	{
		name: "Reading & Research",
		description: "Articles, books and ideas worth keeping.",
		ageDays: 98,
		lastUsedDays: 21,
		topics: [
			{ title: "Notes", notes: [
				"'Team Topologies' (Skelton & Pais): stream-aligned teams + platform team model is a useful frame for the Helvetia target organisation.",
				"Jonas likes Ethan Mollick's newsletter; summarise new posts in 5 bullets max.",
				"McKinsey 'State of AI 2026' report: 72% of firms use gen AI in at least one function, but only 9% see EBIT impact >5%.",
				"Idea for a practice talk: 'Migration projects fail in the data, not in the code.'",
			] },
		],
		active: ["Read 'The Goal' (Goldratt) before the Emmi kick-off."],
		conversation: [],
	},
];

export const ARCHIVED_ROOM: RoomSeed = {
	name: "Q2 Offsite Planning",
	description: "Planning the practice offsite in Flims (June 2026). Done.",
	ageDays: 168,
	lastUsedDays: 140,
	topics: [{ title: "Offsite", notes: [
		"Offsite in Flims, 18–19 June 2026, 34 participants, budget CHF 28k.",
		"Hotel: Waldhaus Flims; bus from Zurich HB at 07:30.",
		"Feedback score 4.4/5; people wanted less slides, more hiking.",
	] }],
	active: [],
	conversation: [],
};

export const CORPUS_ROOM: Omit<RoomSeed, "topics"> = {
	name: "Data Platform Practice",
	description: "Internal practice room: lakehouse, billing, observability and the other platform programmes.",
	ageDays: 170,
	lastUsedDays: 4,
	active: [
		"Review Mara's Lakehouse cut-over checklist before Thursday.",
		"Decide on Airflow vs. Dagster for the 2027 orchestration standard.",
		"Collect Q4 cost numbers for the cost governance review.",
		"Follow up with Ingrid on the regulatory reporting audit evidence.",
	],
	conversation: [
		{ role: "user", text: "Summarize where the Lakehouse migration stands for the practice review on Thursday." },
		{ role: "assistant", text: "**Summary in five points**\n\n1. The bulk load is done: 41 of 44 source systems are on the lakehouse; the remaining three are the billing feeds, scheduled for the December change window.\n2. Query latency on the main Metabase dashboards dropped from ~14 s to ~3 s after the dbt model refactor.\n3. Two incidents in October, both from late-arriving Kafka partitions; fixed by the watermark change Mara shipped on 21 Oct.\n4. Cost is running 12% under the forecast, mostly thanks to auto-suspend on the Snowflake warehouses.\n5. Open decision: Airflow vs. Dagster as the 2027 standard; Jonas wants a recommendation by end of November.\n\nThe one thing I'd flag for Thursday is point 5: people will ask about it, so it's worth having the comparison ready." },
	],
};
