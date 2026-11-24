// Note content for seed.mjs. Mix of hand-written notes and generated recurring
// ones (weekly syncs, 1:1s, journal) so volume and dates look like real use.
export const generateNotes = ({ add, nb, pick, pickN, rnd, daysAgo, editedLater, fmtDate }) => {
  const team = ["Priya", "Daniel", "Sofia", "Marcus", "Hana", "Leo", "Jordan"];

  // ---------------- Harbor Dashboard v3 (project docs) ----------------
  const d1 = daysAgo(118);
  add({ nb: nb.dash, title: "Dashboard v3 — Project Brief", tags: ["harbor", "dashboard-v3", "brief"], pinned: true, created: d1, updated: daysAgo(6),
    md: `## Why we're doing this

Harbor's dashboard hasn't changed meaningfully since 2023. Support tickets tagged \`dashboard-confusion\` went from 41/month to 112/month after we added the Billing and Usage tabs. Customers with more than ~8 projects can't find anything.

## Goals

1. Cut time-to-first-insight for new admins from **~6 min to under 2 min** (measured in onboarding sessions)
2. Reduce \`dashboard-confusion\` tickets by 50% within one quarter of launch
3. Support workspaces with 200+ projects without pagination hell

## Non-goals

- No redesign of the Reports builder (separate Q1 effort)
- No mobile app changes — responsive web only

## Team

| Role | Person |
| --- | --- |
| PM | Daniel Reyes |
| Design | Maya Okafor (me), Hana Sato |
| Eng lead | Priya Raman |
| Frontend | Marcus Bell, Leo Fischer |
| Data | Sofia Marquez |

## Milestones

- [x] Discovery interviews (12 customers) — done Aug 8
- [x] Information architecture + card sort
- [x] Hi-fi prototype v1
- [x] Usability round 1 (6 participants)
- [ ] Usability round 2 — scheduled Nov 20
- [ ] Beta to 15 design-partner workspaces — Dec 2
- [ ] GA — target Jan 14, 2027
` });

  add({ nb: nb.dash, title: "IA: navigation model options", tags: ["dashboard-v3", "ia"], created: daysAgo(104), updated: daysAgo(97),
    md: `Three directions we explored after the card sort (n=31, OptimalSort).

### A. Left rail, project-first
Projects as the primary axis; Billing/Usage/Team live under a workspace switcher.
- 👍 Matches how 70% of participants grouped cards
- 👎 Admins who only care about billing get an extra click

### B. Top tabs, function-first
What we have today, cleaned up.
- 👍 Lowest eng cost
- 👎 Doesn't solve the 200-project problem at all

### C. Command palette + pinned views
Power users loved it in the prototype. New admins never found it.

**Decision (Aug 27):** go with A, ship ⌘K as an accelerator, not the main nav. Daniel signed off.

\`\`\`mermaid
flowchart LR
  W[Workspace switcher] --> P[Projects list]
  P --> O[Project overview]
  O --> U[Usage]
  O --> A[Alerts]
  W --> B[Billing]
  W --> T[Team & roles]
\`\`\`
` });

  add({ nb: nb.dash, title: "Usability round 1 — findings", tags: ["dashboard-v3", "research", "usability"], created: daysAgo(62), updated: daysAgo(58),
    md: `6 participants, 45 min each, remote via Zoom. Prototype v1.3.

## Task success

| Task | Success | Avg time | Notes |
| --- | --- | --- | --- |
| Find last month's usage for project "atlas-prod" | 6/6 | 0:48 | Search did the heavy lifting |
| Invite a teammate as Viewer | 5/6 | 1:12 | P4 looked under Settings first |
| Download the October invoice | 3/6 | 2:35 | ⚠️ Billing hidden behind switcher |
| Set an alert for >80% quota | 4/6 | 1:50 | "Alerts" label unclear, "Notifications"? |
| Pin a project to the sidebar | 6/6 | 0:21 | Everyone loved drag-to-pin |

## Top issues

1. **Billing discoverability** — 3/6 failed. Need a persistent "Billing" entry for owners.
2. Alerts vs. Notifications naming. 4 of 6 said "notifications" unprompted.
3. The empty state for a brand-new project reads like an error.

## Quotes

> "Oh, it's *in* the workspace menu. I would never have looked there." — P2, finance admin

> "This is way faster than the old one, honestly." — P5

Next: v1.4 with Billing in the rail for Owner/Billing roles.` });

  add({ nb: nb.dash, title: "Empty states copy", tags: ["dashboard-v3", "copy"], created: daysAgo(55), updated: daysAgo(40),
    md: `Working doc w/ Jordan (content design).

**New project, no data yet**
~~No data available~~
→ "Your first events will show up here, usually within 5 minutes of connecting a source."
→ Button: *Connect a source*

**No alerts**
→ "Nothing's on fire. Set an alert to get pinged when usage crosses a threshold."

**Search with no results**
→ "No projects match “{query}”. Try a shorter name or check archived projects."

TODO: check tone with Jordan re: "Nothing's on fire" — might be too cute for enterprise?` });

  add({ nb: nb.dash, title: "Design QA checklist — beta build", tags: ["dashboard-v3", "qa", "checklist"], created: daysAgo(9), updated: daysAgo(1),
    md: `Build \`dash-v3-beta.7\` on staging.

- [x] Sidebar collapses at < 1200px
- [x] Pinned projects persist across sessions
- [x] Focus ring visible on all rail items (keyboard)
- [ ] Billing entry hidden for Viewer role ← still showing, filed HAR-2291
- [x] Dark mode: chart gridlines too bright → fixed in .7
- [ ] Usage chart tooltip clips at right edge on 1440 wide
- [ ] ⌘K palette: arrow keys skip "Recent" group
- [x] Empty state illustrations exported @2x
- [ ] Copy pass with Jordan
- [ ] RTL smoke test (Hebrew workspace from Ayalon)
` });

  add({ nb: nb.dash, title: "Chart color tokens", tags: ["dashboard-v3", "design-system"], created: daysAgo(77), updated: daysAgo(30),
    md: `Final palette after the contrast audit. All pass 3:1 against both \`surface\` and \`surface-raised\`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| \`chart.series.1\` | #2563EB | #60A5FA | Primary metric |
| \`chart.series.2\` | #D97706 | #FBBF24 | Comparison period |
| \`chart.series.3\` | #059669 | #34D399 | Secondary |
| \`chart.threshold\` | #DC2626 | #F87171 | Quota line |
| \`chart.grid\` | #E5E7EB | #374151 | Gridlines |

Avoid red/green as the only distinction — use dashed line for comparison period.` });

  add({ nb: nb.dash, title: "Beta partner list", tags: ["dashboard-v3", "beta"], created: daysAgo(21), updated: daysAgo(4),
    md: `| Workspace | Contact | Projects | Status |
| --- | --- | --- | --- |
| Northwind Logistics | Ellen Park | 214 | ✅ confirmed |
| Ayalon Health | Yoni Ben-David | 38 | ✅ confirmed |
| Brightline Media | Sam Okoro | 67 | ✅ confirmed |
| Kestrel Robotics | Ana Lima | 12 | ⏳ legal review |
| Fernhill School District | Tom Walsh | 9 | ✅ confirmed |
| Quarry & Co | Rita Gomes | 143 | ❌ declined (timing) |
| Lumen Energy | Kai Nakamura | 51 | ⏳ waiting on admin |

Need 15 total. Daniel is asking sales for 8 more.` });

  add({ nb: nb.dash, title: "Open questions", tags: ["dashboard-v3"], created: daysAgo(35), updated: daysAgo(2),
    md: `- Do we keep the old dashboard behind a toggle for 30 days? (Priya: yes, Daniel: 14 days max)
- What happens to custom bookmarks people made to \`/usage?tab=…\` URLs → need redirects
- Archived projects: show in search or not?
- Should pins be per-user or per-workspace? **per-user** (decided Oct 30)` });

  // ---------------- Customer interviews ----------------
  const interviews = [
    ["Northwind Logistics", "Ellen Park", "Head of Platform", "214 projects, 9 admins. Uses Harbor mainly for cost allocation across regional teams. Exports CSV every Monday and pivots in Excel — the dashboard is 'basically just the export button' for her."],
    ["Ayalon Health", "Yoni Ben-David", "IT Director", "Compliance-heavy. Wants an audit trail of who changed alert thresholds. Hebrew UI; noticed our date pickers break in RTL."],
    ["Brightline Media", "Sam Okoro", "Engineering Manager", "Video pipeline, spiky usage around launches. Lives in alerts. Got paged at 3am because quota alert fired on a test project."],
    ["Kestrel Robotics", "Ana Lima", "CTO", "Tiny team, 12 projects. Doesn't need much — mostly wants the invoice to show per-project breakdown for their grant reporting."],
    ["Fernhill School District", "Tom Walsh", "Systems Admin", "Non-technical-ish. Very confused by 'workspace' vs 'project' vs 'environment'. Asked if he could just have one big number."],
    ["Quarry & Co", "Rita Gomes", "Finance Ops", "Only logs in for billing. Took her 4 minutes to find last invoice during the call. 'I bookmark the page and pray it doesn't move.'"],
    ["Lumen Energy", "Kai Nakamura", "Staff Engineer", "Power user, uses API more than UI. Would love keyboard shortcuts and a CLI. Built his own Grafana dashboard on top of our API."],
    ["Pinecrest Credit Union", "Denise Hall", "VP Technology", "Wants SSO-enforced roles and a read-only 'exec view'. Concerned about data residency (EU customers)."],
    ["Odd Hours Coffee", "Mateo Ruiz", "Founder", "3 projects. Signed up via the free tier. Thought the dashboard was 'a lot' for what he needs."],
    ["Tessellate Studio", "Grace Liu", "Producer", "Agency, creates a project per client and archives after delivery. 90+ archived projects clutter everything."],
    ["Harborview Hospital", "Dr. Amir Haddad", "Clinical Informatics", "Not related to us despite the name, lol. Needs exportable PDFs for quarterly reviews."],
    ["Copperline Freight", "Jess Moreau", "DevOps Lead", "Migrating from a competitor. Missed 'saved views' from their old tool."],
  ];
  interviews.forEach(([org, name, role, summary], i) => {
    const created = daysAgo(132 - i * 4);
    const themes = pickN(["billing discoverability", "alert fatigue", "too many projects", "naming confusion", "exports", "permissions", "RTL / i18n", "archived clutter", "keyboard shortcuts", "saved views"], 3);
    add({ nb: nb.interviews, title: `Interview — ${name}, ${org}`, tags: ["research", "interview", "dashboard-v3"], created, updated: editedLater(created, 3),
      md: `**Date:** ${fmtDate(created)}  \n**Role:** ${role}  \n**Interviewer:** Maya · **Notes:** ${pick(["Hana", "Daniel", "Sofia"])}

## Context
${summary}

## What they do today
- ${pick(["Logs in 2–3x/week", "Logs in daily, first thing", "Only logs in when something breaks", "Logs in once a month for invoices"])}
- ${pick(["Shares screenshots in Slack with leadership", "Exports to CSV/Excel", "Uses the API for anything serious", "Relies on email alerts"])}

## Pain points
${themes.map((t) => `- ${t}`).join("\n")}

## Notable quote
> "${pick(["I just want to know if we're going to blow the budget this month.", "Why is Billing under my avatar?", "Honestly the old version was fine until you added all the tabs.", "Can I pin the three projects I actually care about?", "I don't know what an 'environment' is and at this point I'm afraid to ask."])}"

## Follow-ups
- [${rnd() > 0.3 ? "x" : " "}] Send thank-you + $100 gift card
- [${rnd() > 0.5 ? "x" : " "}] Add to beta list?
` });
  });
  add({ nb: nb.interviews, title: "Synthesis — discovery interviews (Aug)", tags: ["research", "synthesis", "dashboard-v3"], pinned: true, created: daysAgo(98), updated: daysAgo(96),
    md: `Affinity mapping in FigJam with Hana + Sofia, 2 hrs. 12 interviews, ~240 stickies.

## Themes (ranked by frequency)

1. **"I can't find billing"** — 9/12. Finance-adjacent users feel second-class.
2. **Too many projects, no way to focus** — 7/12. Pinning / favorites requested by name 5 times.
3. **Alert fatigue** — 6/12. Thresholds are workspace-wide; people want per-project.
4. **Vocabulary** — workspace / project / environment confuses 5/12.
5. **Exports are the real product** for 4/12.

## Opportunities
- Role-aware navigation (billing users see billing first)
- Pins + recent projects in the rail
- Per-project alert thresholds (needs eng spike, Priya)
- Glossary tooltips? Cheap win.

Shared with #proj-dashboard-v3 on Aug 14.` });

  // ---------------- Meetings & 1:1s (generated weekly) ----------------
  const syncTopics = [
    "beta scope", "chart library swap (Recharts → visx?)", "Billing in rail for Owner role", "perf budget for 200+ projects", "redirects for old URLs",
    "analytics events for nav clicks", "dark mode regressions", "accessibility audit results", "design partner recruiting", "⌘K palette scope",
    "empty states", "alert threshold per project spike", "timeline risk — Leo out 2 wks in Dec", "Figma library cleanup", "staging data is stale",
  ];
  for (let w = 0; w < 30; w++) {
    const created = daysAgo(3 + w * 7, 10, 30);
    if (w === 6 || w === 19) continue; // skipped weeks (holiday / offsite)
    const attendees = pickN(team, 4 + Math.floor(rnd() * 3));
    const topics = pickN(syncTopics, 3);
    const actions = topics.map((t) => `- [${w > 1 || rnd() > 0.6 ? "x" : " "}] ${pick(attendees)} — follow up on ${t}`);
    add({ nb: nb.meetings, title: `Product sync — ${fmtDate(created).replace(/^\w+, /, "")}`, tags: ["meeting", "product-sync"], created, updated: editedLater(created, 0.2),
      md: `**Attendees:** ${attendees.join(", ")}, Maya

## Agenda
${topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

## Notes
- ${pick(["Mostly status. Nothing blocking.", "Long debate on " + topics[0] + ", parked for async.", "Priya flagged the API rate limits on staging again.", "Daniel shared updated GA date with leadership — no pushback.", "Short one, half the team at the offsite planning thing."])}
- ${pick(["Marcus demoed the new rail with real data — looks good, scroll jank on Safari.", "Sofia has first numbers on nav click events, will share Thu.", "Hana finished the icon set.", "We agreed to cut saved views from v3.", "Leo found a cheaper way to do pinning (localStorage first, sync later)."])}

## Action items
${actions.join("\n")}
` });
  }
  const oneOnOnes = [
    "Talked about growth path toward Staff designer. Daniel suggested I own the design-system roadmap for H1.",
    "Feeling stretched across v3 + onboarding. Agreed to hand onboarding copy to Jordan.",
    "Feedback: my research readouts are great but too long. Lead with the decision needed.",
    "Comp review is in Jan. Need to write self-review by Dec 12.",
    "Discussed hiring a second product designer — I'll be on the loop.",
    "Vented about the beta timeline. Daniel agreed to push GA if round 2 goes badly.",
    "Mostly personal catch-up. His kid started kindergarten.",
    "Planning for the design crit format change — weekly → biweekly with async Loom.",
    "Talked about speaking at the Portland UX meetup in Feb. He's supportive.",
  ];
  oneOnOnes.forEach((txt, i) => {
    const created = daysAgo(5 + i * 14, 14, 0);
    add({ nb: nb.meetings, title: `1:1 Daniel — ${fmtDate(created).replace(/^\w+, /, "")}`, tags: ["1on1"], created,
      md: `${txt}\n\n**Next time:**\n- ${pick(["Check in on self-review draft", "Hiring plan", "Design system budget", "How round 2 went"])}\n` });
  });
  add({ nb: nb.meetings, title: "Design crit — rail iconography", tags: ["meeting", "design-crit"], created: daysAgo(70), md: `Hana presented 3 icon sets. Consensus on set B (2px stroke, rounded joins). Leo asked for 16px variants, not just 20. Jordan: labels always visible, icons alone aren't enough.` });
  add({ nb: nb.meetings, title: "Q4 planning offsite — notes", tags: ["meeting", "planning", "q4"], created: daysAgo(91), updated: daysAgo(88),
    md: `Sept 18–19, McMenamins Edgefield.

### Company priorities (from Rachel, CEO)
1. Net revenue retention > 115%
2. Dashboard v3 GA
3. SOC 2 Type II renewal

### Our team commitments
| Item | Owner | Confidence |
| --- | --- | --- |
| Dashboard v3 beta | Daniel | High |
| Per-project alerts spike | Priya | Medium |
| Design system v2 tokens | Maya | High |
| Onboarding checklist A/B | Jordan | Low |

Dinner was great. Marcus did karaoke. We do not speak of it.` });

  // ---------------- Inbox (quick captures) ----------------
  const inbox = [
    ["", "call dentist re: crown — they close at 4 on fridays"],
    ["Gift ideas for Mom", "- that ceramic planter from Mudshark Studios\n- Powell's gift card (always works)\n- framed print of the Lisbon tram photo?"],
    ["", "https://www.nngroup.com/articles/progressive-disclosure/ — reread before crit"],
    ["Podcast rec from Leo", "Design Details ep. on navigation patterns. also \"Dithering\"?"],
    ["Wifi at the Alberta St office", "network: harbor-guest / pw on the fridge, ask Marcus"],
    ["Idea: weekly 'what shipped' email", "Short auto-generated email from Linear + Figma changes. Could pitch at next sync."],
    ["Return Patagonia jacket", "receipt in email, deadline Nov 30"],
    ["", "remember: Sofia's birthday nov 22 — card is in my desk drawer"],
    ["Book: The Making of a Manager", "Hana recommended. Library hold placed."],
    ["Car registration", "renew online, DEQ test first. ugh."],
    ["Quote", "\"Make it work, make it right, make it fast.\" — Kent Beck"],
    ["Interview Q to add", "Ask: \"When was the last time you felt lost in the dashboard? Walk me through it.\""],
    ["groceries", "- oat milk\n- lemons x4\n- feta\n- coffee (Coava, Kebel blend)\n- dish soap"],
  ];
  inbox.forEach(([title, md], i) => {
    add({ nb: nb.inbox, title, md, tags: i % 4 === 0 ? ["todo"] : [], created: daysAgo(1 + i * 3 + Math.floor(rnd() * 3)) });
  });

  // ---------------- Book notes ----------------
  const books = [
    ["Thinking in Systems", "Donella Meadows", 5, "Stocks, flows, feedback loops. The 'leverage points' chapter is the one I keep coming back to — changing the goal of a system beats tweaking parameters every time.", ["systems-thinking"]],
    ["The Design of Everyday Things", "Don Norman", 5, "Reread for the third time. Signifiers vs. affordances finally clicked. Norman doors are everywhere at the new office.", ["design"]],
    ["Continuous Discovery Habits", "Teresa Torres", 4, "Opportunity solution trees are useful but the weekly-interview cadence is hard to sustain on a small team. Stole her interview snapshot template.", ["research", "product"]],
    ["Shape Up", "Ryan Singer", 4, "Appetite > estimates. Fixed time, variable scope. Pitched 'betting table' to Daniel — he was lukewarm.", ["product"]],
    ["Braiding Sweetgrass", "Robin Wall Kimmerer", 5, "Not a work book. The chapter on the Three Sisters garden made me want to redo the backyard beds.", ["nature", "essays"]],
    ["Atlas of the Heart", "Brené Brown", 3, "Some good distinctions (envy vs. jealousy) but felt padded.", ["psychology"]],
    ["Refactoring UI", "Adam Wathan & Steve Schoger", 4, "Practical. 'Start with too much white space' and 'don't use grey text on colored backgrounds' are now in our design principles doc.", ["design"]],
    ["Klara and the Sun", "Kazuo Ishiguro", 4, "Quiet and devastating. Book club pick for October.", ["fiction", "book-club"]],
    ["Four Thousand Weeks", "Oliver Burkeman", 5, "Stop trying to get on top of everything. Pick your battles; embrace finitude.", ["productivity"]],
    ["Sapiens", "Yuval Noah Harari", 3, "Abandoned at 60%. Interesting but a lot of sweeping claims.", ["history", "dnf"]],
    ["Tomorrow, and Tomorrow, and Tomorrow", "Gabrielle Zevin", 5, "Loved it. The Pioneers section. Book club pick for August.", ["fiction", "book-club"]],
    ["Inclusive Design Patterns", "Heydon Pickering", 4, "Very concrete. The section on accessible tab interfaces directly helped with the v3 rail.", ["accessibility", "design"]],
  ];
  books.forEach(([title, author, stars, body, tags], i) => {
    const created = daysAgo(260 - i * 20);
    add({ nb: nb.books, title: `${title} — ${author}`, tags: ["books", ...tags], created, updated: editedLater(created, 10),
      md: `**Rating:** ${"★".repeat(stars)}${"☆".repeat(5 - stars)}  \n**Finished:** ${fmtDate(created)}

${body}

## Highlights
- ${pick(["Page 47 — the bit about delays in feedback loops", "Ch. 3 opening paragraph", "\"The purpose of a system is what it does.\"", "The appendix is better than the book", "Whole chapter 6"])}
- ${pick(["Lend to Hana", "Buy a physical copy", "Recommend to Jordan", "Discuss at book club"])}
` });
  });
  add({ nb: nb.books, title: "Reading list 2026", tags: ["books"], pinned: true, created: daysAgo(272), updated: daysAgo(12),
    md: `Goal: 24 books. Currently at **15**.

### Up next
- [ ] *Middlemarch* — George Eliot (the brick)
- [ ] *Designing Data-Intensive Applications* (2nd ed.)
- [ ] *The Overstory* — Richard Powers
- [ ] *How Big Things Get Done* — Flyvbjerg & Gardner

### Done
${books.filter((b) => !b[4].includes("dnf")).map((b) => `- [x] ${b[0]}`).join("\n")}
` });

  // ---------------- TypeScript & Rust ----------------
  const code = [
    ["Discriminated unions for API states", ["typescript"], "```ts\ntype Remote<T> =\n  | { status: \"idle\" }\n  | { status: \"loading\" }\n  | { status: \"error\"; error: Error }\n  | { status: \"ok\"; data: T };\n\nfunction render(r: Remote<User[]>) {\n  switch (r.status) {\n    case \"ok\": return r.data.length;\n    case \"error\": return r.error.message;\n    default: return null;\n  }\n}\n```\nExhaustiveness check: add `const _x: never = r;` in default."],
    ["Rustlings progress", ["rust", "learning"], "- [x] variables\n- [x] functions\n- [x] if\n- [x] primitive_types\n- [x] vecs\n- [x] move_semantics (pain)\n- [x] structs\n- [x] enums\n- [ ] strings\n- [ ] modules\n- [ ] hashmaps\n- [ ] options\n- [ ] error_handling\n\nAt 38/94. Borrow checker finally makes sense-ish."],
    ["satisfies vs. as", ["typescript"], "`satisfies` checks the type without widening:\n\n```ts\nconst palette = {\n  primary: \"#2563eb\",\n  danger: \"#dc2626\",\n} satisfies Record<string, `#${string}`>;\n\npalette.primary // still literal type\n```\n\n`as` just lies to the compiler. Prefer satisfies for config objects."],
    ["Ownership cheat sheet", ["rust"], "| Situation | Use |\n| --- | --- |\n| Read only | `&T` |\n| Mutate in place | `&mut T` |\n| Take ownership | `T` |\n| Shared, single-thread | `Rc<T>` |\n| Shared, multi-thread | `Arc<T>` |\n| Interior mutability | `RefCell<T>` / `Mutex<T>` |"],
    ["Figma plugin: token exporter idea", ["typescript", "side-project", "design-system"], "Small Figma plugin that reads variables and writes a `tokens.json` in the W3C format.\n\n```ts\nconst collections = await figma.variables.getLocalVariableCollectionsAsync();\nfor (const c of collections) {\n  for (const id of c.variableIds) {\n    const v = await figma.variables.getVariableByIdAsync(id);\n    console.log(v?.name, v?.valuesByMode);\n  }\n}\n```\nStatus: works for colors, breaks on aliases."],
    ["Result<T, E> and the ? operator", ["rust"], "```rust\nfn read_config(path: &str) -> Result<Config, Box<dyn Error>> {\n    let raw = fs::read_to_string(path)?;\n    let cfg: Config = toml::from_str(&raw)?;\n    Ok(cfg)\n}\n```\n`?` early-returns the error, converting via `From`."],
    ["CSS container queries notes", ["css"], "```css\n.card-grid { container-type: inline-size; }\n@container (min-width: 480px) {\n  .card { display: grid; grid-template-columns: 120px 1fr; }\n}\n```\nFinally can make the dashboard cards responsive to the rail width, not the viewport."],
    ["tsconfig I keep copying", ["typescript"], "```json\n{\n  \"compilerOptions\": {\n    \"target\": \"ES2022\",\n    \"module\": \"ESNext\",\n    \"moduleResolution\": \"Bundler\",\n    \"strict\": true,\n    \"noUncheckedIndexedAccess\": true,\n    \"exactOptionalPropertyTypes\": true,\n    \"skipLibCheck\": true\n  }\n}\n```"],
  ];
  code.forEach(([title, tags, md], i) => {
    const created = daysAgo(230 - i * 26);
    add({ nb: nb.code, title, tags: ["dev", ...tags], md, created, updated: editedLater(created, 20) });
  });

  // ---------------- Courses & talks ----------------
  const talks = [
    ["Config 2026 — notes", "Favorite talks:\n1. *Designing for AI uncertainty* — show confidence, let users correct\n2. Variables deep dive — modes for density, not just themes\n3. The keynote was mostly Dev Mode stuff\n\nSF was cold. Ate at Zuni Café, worth it.", ["conference", "figma"]],
    ["Interaction Design Foundation — Accessibility course", "Module 4/8. Takeaways so far:\n- Don't rely on color alone\n- Target size ≥ 24×24 CSS px (WCAG 2.2)\n- `aria-current=\"page\"` for nav", ["accessibility", "course"]],
    ["Portland UX meetup — 'Research ops on a shoestring'", "Speaker: Lena Ortiz (Vacasa). Use a simple Airtable for participant panel. Pay people fairly, always. Recruit from support tickets.", ["meetup", "research"]],
    ["Josh Comeau — CSS for JS devs", "Finished the layout modules. Flow layout vs flexbox mental model was the big unlock. Still need to do the animation module.", ["css", "course"]],
    ["Talk idea for Feb meetup", "Working title: **\"The dashboard nobody could navigate\"** — case study of v3. 20 min.\n\nOutline:\n1. The ticket spike\n2. Card sort surprises\n3. Role-aware nav\n4. What we got wrong (Billing!)\n5. Results (TBD after beta)", ["meetup", "speaking"]],
  ];
  talks.forEach(([title, md, tags], i) => {
    const created = daysAgo(200 - i * 35);
    add({ nb: nb.talks, title, md, tags, created, updated: editedLater(created, 14) });
  });

  // ---------------- Newsletter drafts ----------------
  const letters = [
    ["Issue #14 — On pinning things", "Every tool I love lets me pin something. Browser tabs, Slack channels, notes. Pinning is a tiny act of saying *this matters right now*.\n\nAt work we're adding pins to a dashboard used by thousands of admins, and it's been the most-requested feature in every interview…\n\n(draft — need an ending)", "draft"],
    ["Issue #13 — Rainy season reading", "Five books for the first real rain of autumn:\n\n1. *Braiding Sweetgrass*\n2. *Klara and the Sun*\n3. *Four Thousand Weeks*\n4. *The Peregrine*\n5. *A Psalm for the Wild-Built*\n\nSent Oct 12 to 318 subscribers. 61% open rate.", "sent"],
    ["Issue #12 — What I learned from 12 customer interviews", "You learn more in the first 5 minutes of small talk than in the scripted questions. Ellen at Northwind said the thing that reframed the whole project before I'd even hit record…", "sent"],
    ["Issue #11 — Lisbon, slowly", "Two weeks, one city, zero itinerary on the second week. Notes on walking everywhere, pastel de nata rankings, and why I'm now obsessed with azulejos.", "sent"],
    ["Ideas backlog", "- the ethics of dark patterns in cancellation flows\n- my Obsidian → EdgeEver migration (meta!)\n- interview: Hana on illustration in product\n- film photography for people who are bad at it (me)\n- what a 'second brain' actually looks like after 9 months", "backlog"],
    ["Issue #15 — Four thousand weeks at work", "Burkeman's idea that you'll never clear the backlog applies uncomfortably well to Jira…", "draft"],
  ];
  letters.forEach(([title, md, status], i) => {
    const created = daysAgo(status === "draft" ? 4 + i * 6 : 30 + i * 25);
    add({ nb: nb.newsletter, title, md, tags: ["newsletter", status], created, updated: editedLater(created, 5), pinned: title === "Ideas backlog" });
  });

  // ---------------- Photography ----------------
  [
    ["Film log — Portra 400, roll 7", "Camera: Olympus OM-2n, 50mm f/1.8\n\n| Frame | Where | Notes |\n| --- | --- | --- |\n| 1–6 | Forest Park, Wildwood trail | overcast, metered for shadows |\n| 7–12 | Alberta St last Thursday | night, pushed 1 stop |\n| 13–24 | Coast trip, Cannon Beach | fog! |\n| 25–36 | Backyard dahlias | |\n\nDropped at Blue Moon Camera, ready Nov 21."],
    ["Shot list — Lisbon", "- Tram 28 at golden hour on Rua das Escolas Gerais\n- Azulejo details in Alfama\n- Miradouro de Santa Luzia at dawn\n- LX Factory murals\n- Fishermen at Cais do Sodré"],
    ["Lightroom preset tweaks", "Base: \"Soft Film\". Then:\n- Temp +6\n- Highlights −35\n- Shadows +20\n- Grain 18 / size 25\n- HSL: orange sat −10"],
    ["Gear wishlist", "- [ ] Peak Design strap (mine is fraying)\n- [ ] 35mm f/2.8 Zuiko\n- [x] Lens pen\n- [ ] Second battery for the X100V"],
  ].forEach(([title, md], i) => add({ nb: nb.photo, title, md, tags: ["photography"], created: daysAgo(150 - i * 33) }));

  // ---------------- Lisbon trip ----------------
  const lisbonBase = 190;
  add({ nb: nb.lisbon, title: "Itinerary", tags: ["travel", "lisbon"], pinned: false, created: daysAgo(lisbonBase + 40), updated: daysAgo(lisbonBase - 2),
    md: `**May 2 – May 16, 2026** · Flights: PDX → LIS via AMS (KLM)

| Date | Plan | Stay |
| --- | --- | --- |
| May 2–3 | Arrive, recover, Alfama wander | Airbnb, Alfama |
| May 4 | Belém: tower, monastery, Pastéis de Belém | |
| May 5 | Sintra day trip (Pena Palace — book 9:30 slot!) | |
| May 6–8 | Free days, LX Factory, Time Out Market | |
| May 9–10 | Porto by train | Hotel in Ribeira |
| May 11–15 | Back to Lisbon, nothing planned | Airbnb, Príncipe Real |
| May 16 | Fly home | |
` });
  add({ nb: nb.lisbon, title: "Packing list", tags: ["travel", "lisbon", "checklist"], created: daysAgo(lisbonBase + 10), updated: daysAgo(lisbonBase - 1),
    md: `- [x] Passport (expires 2029, fine)\n- [x] EU plug adapters ×2\n- [x] Walking shoes — the broken-in ones\n- [x] Light rain jacket\n- [x] Film: 4× Portra 400, 2× HP5\n- [x] Kindle + charger\n- [ ] ~~Hairdryer~~ Airbnb has one\n- [x] Euros for the first day (~€100)\n- [x] Travel insurance PDF downloaded` });
  add({ nb: nb.lisbon, title: "Trip budget", tags: ["travel", "lisbon", "finance"], created: daysAgo(lisbonBase + 35), updated: daysAgo(lisbonBase - 20),
    md: `| Category | Planned | Actual |
| --- | --- | --- |
| Flights | $1,180 | $1,142 |
| Lodging | $1,600 | $1,734 |
| Food | $700 | $812 |
| Transport (train, metro, Uber) | $180 | $146 |
| Sintra + museums | $120 | $98 |
| Souvenirs (tiles!!) | $100 | $231 |
| **Total** | **$3,880** | **$4,163** |

Over by ~7%, mostly tiles and the Porto hotel upgrade. Worth it.` });
  add({ nb: nb.lisbon, title: "Food — places we loved", tags: ["travel", "lisbon", "food"], created: daysAgo(lisbonBase - 5), updated: daysAgo(lisbonBase - 14),
    md: `- **Taberna da Rua das Flores** — no reservations, go at 6:30. Best meal of the trip.\n- **Manteigaria** — pastel de nata ranking #1 (sorry Belém)\n- **O Trevo** — bifana, standing at the counter\n- **Cervejaria Ramiro** — garlic prawns, then the steak sandwich for dessert (yes)\n- **A Cevicheria** — line was long, fine but overhyped\n- Porto: **Cantinho do Avillez**, francesinha at **Café Santiago**` });
  add({ nb: nb.lisbon, title: "Useful Portuguese phrases", tags: ["travel", "lisbon", "language"], created: daysAgo(lisbonBase + 20),
    md: `| EN | PT |\n| --- | --- |\n| Good morning | Bom dia |\n| Thank you | Obrigada (I'm female) |\n| The bill, please | A conta, por favor |\n| Do you speak English? | Fala inglês? |\n| A coffee (espresso) | Um café / uma bica |\n| Excuse me | Com licença |` });

  // ---------------- Recipes ----------------
  const recipes = [
    ["Shakshuka (weeknight version)", "Serves 2 · 25 min\n\n**Ingredients**\n- 1 onion, 1 red pepper, 3 cloves garlic\n- 1 tsp cumin, 1 tsp smoked paprika, pinch chili flakes\n- 1 can (28 oz) crushed tomatoes\n- 4 eggs\n- feta, cilantro, crusty bread\n\n**Steps**\n1. Soften onion + pepper, 8 min.\n2. Garlic + spices, 1 min.\n3. Tomatoes, simmer 10 min. Season *a lot*.\n4. Make wells, crack eggs, lid on, 6–7 min.\n5. Feta + herbs.", ["vegetarian", "quick"]],
    ["Mom's jollof rice", "From the phone call on Sunday. She does NOT measure.\n\n- Blend: 4 roma tomatoes, 2 red bell peppers, 1 scotch bonnet, 1 onion\n- Fry the paste in oil until it darkens and \"stops tasting sour\" (~20 min!!)\n- 2 tbsp tomato paste, curry powder, thyme, 2 bay leaves, stock cube\n- 3 cups parboiled long grain rice, stock to just cover\n- Foil under the lid, lowest heat, 30 min. Don't stir.\n\nThe bottom bit (party rice) is the best part.", ["family", "nigerian"]],
    ["Sourdough — current schedule", "Starter: \"Doughlores\", 100% hydration, fed 1:5:5\n\n| Time | Step |\n| --- | --- |\n| 9:00 | Feed starter |\n| 14:00 | Autolyse 450g bread flour + 50g whole wheat + 350g water |\n| 15:00 | Add 100g starter + 10g salt |\n| 15:30–17:30 | 4 sets of coil folds |\n| 17:30–21:00 | Bulk (until +50%) |\n| 21:00 | Shape, banneton, fridge overnight |\n| 8:00 | Bake 250°C, 20 min lid on, 22 min lid off |", ["baking"]],
    ["Miso-glazed salmon", "- 2 tbsp white miso, 1 tbsp mirin, 1 tbsp maple, 1 tsp soy\n- Brush on salmon, broil 8–10 min\n- Serve with rice + quick cucumber pickle", ["quick", "fish"]],
    ["Pastéis de nata attempt #1", "Failed. Custard split, pastry soggy. Oven doesn't get hot enough (need ~290°C). Try the cast iron trick next time?", ["baking", "lisbon"]],
    ["Pastéis de nata attempt #2", "Better! Preheated a steel for 45 min at max. Custard set, some blistering. Pastry still not shatter-y enough — roll thinner and chill longer.", ["baking", "lisbon"]],
    ["Lentil soup for sick days", "1 onion, 2 carrots, 2 celery, 1 cup red lentils, 6 cups stock, cumin, lemon at the end. Blend half. That's it.", ["vegetarian", "soup"]],
    ["Chili crisp noodles", "Lao Gan Ma + sesame paste + black vinegar + soy + a little sugar. Toss with hot noodles, scallions on top. 10 min dinner.", ["quick"]],
    ["Thanksgiving 2026 menu (draft)", "Hosting 8 this year!\n\n- [ ] Spatchcocked turkey (order from Chop by Nov 20)\n- [ ] Mom's jollof (she insists)\n- [ ] Brussels sprouts w/ hot honey\n- [x] Ask Jamal to bring pies\n- [ ] Cornbread stuffing\n- [ ] Cranberry sauce — the real kind\n- [ ] Borrow folding chairs from Lisa next door", ["holiday", "planning"]],
  ];
  recipes.forEach(([title, md, tags], i) => {
    const created = i === 8 ? daysAgo(3) : daysAgo(240 - i * 25);
    add({ nb: nb.recipes, title, md, tags: ["recipe", ...tags], created, updated: editedLater(created, 6), pinned: i === 8 });
  });

  // ---------------- Home & finances ----------------
  add({ nb: nb.home, title: "Monthly budget", tags: ["finance", "budget"], pinned: true, created: daysAgo(270), updated: daysAgo(15),
    md: `| Category | Budget | Oct actual |
| --- | --- | --- |
| Rent | $2,150 | $2,150 |
| Utilities (PGE, water, internet) | $210 | $236 |
| Groceries | $550 | $612 |
| Eating out | $250 | $305 |
| Transport (TriMet + car) | $180 | $142 |
| Subscriptions | $65 | $71 |
| Savings (Roth IRA) | $583 | $583 |
| Savings (house fund) | $800 | $800 |
| Fun / misc | $300 | $264 |

Note to self: cancel the second streaming service. Again.` });
  add({ nb: nb.home, title: "Subscriptions audit", tags: ["finance"], created: daysAgo(80), updated: daysAgo(79),
    md: `- Spotify Duo — $16.99 (shared w/ Jamal) — keep\n- Netflix — $15.49 — ~~cancel~~ keep until Stranger Things ends\n- NYT — $4 promo → $25 in Jan!! set reminder\n- iCloud 200GB — $2.99 — keep\n- Figma personal — $0 (education)\n- ~~Peloton app — $12.99~~ cancelled Aug 12\n- Patreon (2 creators) — $10` });
  add({ nb: nb.home, title: "Car maintenance log — 2018 Subaru Impreza", tags: ["car", "home"], created: daysAgo(250), updated: daysAgo(45),
    md: `| Date | Mileage | Service | Cost | Where |
| --- | --- | --- | --- | --- |
| 2026-03-14 | 61,240 | Oil change, tire rotation | $89 | Wilson's |
| 2026-06-02 | 64,980 | New wiper blades | $34 | DIY |
| 2026-07-19 | 66,105 | Brake pads (front) | $312 | Wilson's |
| 2026-10-02 | 68,870 | Oil change, cabin filter | $112 | Wilson's |

Next: 70k service — timing? (Subaru FB20 is chain, so no.) Coolant at 75k.` });
  add({ nb: nb.home, title: "Apartment — things to fix before lease renewal", tags: ["home", "todo"], created: daysAgo(60), updated: daysAgo(8),
    md: `- [x] Bathroom fan (landlord fixed Oct 3)\n- [ ] Bedroom window doesn't latch\n- [ ] Kitchen faucet drip\n- [x] Smoke detector battery\n- [ ] Ask about the $75/mo increase — comps on Zillow are lower` });
  add({ nb: nb.home, title: "House fund", tags: ["finance", "goals"], created: daysAgo(265), updated: daysAgo(15),
    md: `Target: **$60,000** down payment by end of 2028.\n\nCurrent: $31,450 (HYSA @ 4.1%)\n\n- 2025 contributions: $9,600\n- 2026 YTD: $8,800\n\nNeighborhoods: Sellwood, St. Johns, Woodlawn. Want a yard for the garden.` });
  add({ nb: nb.home, title: "Taxes 2025 — docs checklist", tags: ["finance", "taxes"], created: daysAgo(255), updated: daysAgo(214),
    md: `- [x] W-2 Harbor\n- [x] 1099-INT (Ally)\n- [x] 1099-B (Fidelity)\n- [x] Roth contribution confirmation\n- [x] Student loan interest 1098-E\n- [x] Filed via FreeTaxUSA — Apr 3\n\nRefund: $1,214 federal, owed $86 state.` });
  add({ nb: nb.home, title: "Backyard garden plan", tags: ["garden", "home"], created: daysAgo(240), updated: daysAgo(170),
    md: `Inspired by *Braiding Sweetgrass*. Three Sisters bed in the sunny corner.\n\n- Corn: Painted Mountain\n- Beans: Kentucky Wonder pole\n- Squash: Delicata\n\nAlso: dahlias along the fence (Café au Lait, Bishop of Llandaff), tomatoes in pots (Sungold!!).\n\nUpdate Aug: squash took over everything. Corn was sad. Beans great.` });

  // ---------------- Journal (generated, irregular) ----------------
  const moods = ["😌", "🙂", "😐", "😩", "😄", "🥱"];
  const journalBits = [
    "Long day. Usability sessions back to back — my brain is soup. P5 was delightful though.",
    "Ran the Springwater corridor before work. 5.2 miles, felt slow but whatever.",
    "Dinner at Jamal's. His new place has a ridiculous amount of light.",
    "Rain all day. Stayed in, baked bread, finished Klara and the Sun. Cried a little.",
    "Felt anxious about the beta timeline. Wrote it down, it's less scary on paper.",
    "Mom called. She's planning her visit for Thanksgiving. Need to clear the guest room.",
    "Good crit today. Hana's illustrations are going to make this thing feel so much warmer.",
    "Tried a new climbing gym (The Circuit, SE). V3 felt hard. Forearms dead.",
    "Saturday market haul: pears, hazelnuts, a very ugly squash.",
    "Didn't do much. That's allowed.",
    "Shipped v1.4 of the prototype. Daniel's reaction: 'oh, now I get it'. Small win.",
    "First real frost on the windshield. Fall is here for real.",
    "Read in the bath for an hour. Should do this more.",
    "Stressful 1:1 but productive. Writing down three things I want from next year.",
    "Book club at Lisa's — we spent 20 min on the book and 2 hours on everything else.",
    "Walked to Mt Tabor at sunset. Dog-watching is underrated.",
    "Slept badly. Too much coffee at 3pm again. Rule: no coffee after 1.",
    "Garden: pulled the last of the tomatoes. Green ones → fried green tomatoes tomorrow.",
  ];
  let d = 268;
  while (d > 0) {
    d -= 4 + Math.floor(rnd() * 9);
    if (d < 0) break;
    const created = daysAgo(d, 21, Math.floor(rnd() * 50));
    add({ nb: nb.journal, title: fmtDate(created), tags: ["journal"], created,
      md: `${pick(moods)} ${pick(journalBits)}\n\n${rnd() > 0.5 ? pick(journalBits) : ""}${rnd() > 0.7 ? "\n\n**Grateful for:** " + pick(["sunny lunch break", "Jamal", "a good book", "the rain, actually", "my team", "warm socks"]) : ""}`.trim() });
  }

  // ---------------- Creative ideas ----------------
  [
    ["Zine idea: \"Small Joys of Portland\"", "8-page fold zine. Risograph at Pioneer Printing? Spreads: food carts, Powell's, rain, bridges, the guy with the bagpipes on a unicycle.", ["zine", "side-project"]],
    ["App idea: plant watering via photo", "Snap a photo of your plant → it estimates soil dryness?? Probably impossible. But a dumb reminder app with photos of each plant would be cute.", ["app-idea"]],
    ["Illustration practice — 30 days", "- [x] Day 1–10: coffee cups\n- [x] Day 11–20: hands (ugh)\n- [ ] Day 21–30: buildings on my street\n\nStopped at day 22. Pick back up in December?", ["drawing"]],
    ["Halloween costume brainstorm", "~~Figma cursor~~ (did that 2024)\n- A loading spinner\n- Clippy\n- \"Accept all cookies\" banner — WINNER", ["fun"]],
  ].forEach(([title, md, tags], i) => add({ nb: nb.creative, title, md, tags: ["ideas", ...tags], created: daysAgo(180 - i * 40) }));

  // ---------------- Trash (messy, deleted later) ----------------
  add({ nb: nb.inbox, title: "Untitled", md: "asdf", created: daysAgo(40), trash: true });
  add({ nb: nb.dash, title: "Dashboard v3 brief (old copy)", md: "Superseded by the main brief.", tags: ["dashboard-v3"], created: daysAgo(120), trash: true });
  add({ nb: nb.recipes, title: "Banana bread", md: "Mom's version is better. Deleting this one.", created: daysAgo(150), trash: true });
};
