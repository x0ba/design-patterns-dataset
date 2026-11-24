<!-- exxeta:l1b schema_version=1 -->

## Chronos

- Current scaffold timestamp: 2026-11-18T02:47:50.144Z
- Persistent agent id: helvetia-crm-migration
- Agent display name: Helvetia CRM Migration
- Lifecycle state: ready
- Last checkpoint: none
- Last checkpoint at: 2026-11-16T16:30:00.000Z
- Last consolidation: none
- Last consolidation at: 2026-11-06T16:30:00.000Z

## Deep Memory

### Project Basics

- Client is Helvetia Versicherungen (Basel). Sponsor is **Marta Brunner**, Head of Customer Operations; day-to-day contact is **Reto Imhof** (IT project lead). (saved 2026-07-14)
- Scope: migrate ~1.2 M customer records and 340k open policies from Siebel 8.1 to Salesforce Financial Services Cloud; decommission Siebel by end of Q2 2027. (saved 2026-08-12)
- Go-live is planned for **9 March 2027**, with a fallback cut-over weekend on 16 March. (saved 2026-08-29)
- Budget is CHF 1.85 M for EXXETA's part; we're at 61% burn as of end of October. (saved 2026-09-23)
- Team on our side: Jonas (engagement lead), Priya Raman (solution architect), Lukas Meier (data migration), Sophie Graf (change & training). (saved 2026-10-26)

### Decisions

- Address clean-up for the legacy Swiss branch records (about 1.3% of customers) will be done **after** go-live; agreed with Marta on 22 Oct. (saved 2026-07-21)
- Reporting dashboard moved to phase 2, since its data only exists after the migration. (saved 2026-08-22)
- Integration with SAP FI-CA goes through MuleSoft, not point-to-point. Reto insisted on this because of their API governance board. (saved 2026-09-18)
- Dry-runs happen on the second weekend of every month until go-live. (saved 2026-10-14)

### Stakeholders & Working Style

- Marta prefers short written updates with a clear Red/Amber/Green per area; she reads them on Friday mornings. (saved 2026-07-15)
- Reto gets nervous about anything touching the SAP interface. Loop him in early, never surprise him in steering. (saved 2026-08-16)
- The Finance key users are only available Tuesdays and Thursdays, and almost not at all in January (year-end close). (saved 2026-09-22)
- Steering committee meets every second Wednesday at 14:00 in Basel; slides due Monday evening. (saved 2026-10-15)

### Risks & Lessons

- Dry-run #2 failed on duplicate policy numbers created by a 2019 Siebel patch. Lukas wrote a dedupe rule; dry-run #3 loaded 98.7% cleanly. (saved 2026-07-26)
- IT Ops has not yet confirmed the cut-over weekend. Escalate via Marta if there's no answer by 20 Nov. (saved 2026-09-02)
- Training material must be in German **and** French: Lausanne office has 60 agents. (saved 2026-10-14)

## Active Items

- Get IT Ops confirmation for the 9 March cut-over weekend (deadline 20 Nov). (saved 2026-11-14)
- Prepare steering committee slides for 25 Nov: migration status, UAT plan, cut-over options. (saved 2026-11-07)
- Review Lukas' dedupe rule documentation before it goes to Helvetia's data office. (saved 2026-10-30)
- Ask Sophie for the French training plan draft. (saved 2026-11-02)
- Send Reto the updated MuleSoft interface spec (v1.4). (saved 2026-10-24)

## Recent Context

### RC-0001 | OPEN | 2026-11-15 | UAT plan for the invoicing module

**Session arc:** Jonas and the room reworked the UAT schedule around the Finance year-end close.

**Body:**
- Invoicing UAT moves from 12–23 Jan to 5–16 Jan; Finance key users confirmed for Tuesdays and Thursdays only.
- Sophie will prepare 14 test scripts in German; French versions only for the claims module.

**Parked:**
None

### RC-0002 | OPEN | 2026-11-16 | Dedupe rule review with Lukas

**Session arc:** Went through Lukas' duplicate-policy rule before it goes to Helvetia's data office.

**Body:**
- Rule keys on policy number + birth date + postcode; catches 4,212 duplicates from the 2019 patch.
- Edge case: joint policies for married couples must not be merged. Lukas adds an exception list.

**Parked:**
None
