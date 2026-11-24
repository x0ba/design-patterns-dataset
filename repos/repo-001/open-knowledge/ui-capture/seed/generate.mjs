import { mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { people, services, decisions, proposals } from './data-core.mjs';
import { incidents, runbooks, guides, specs } from './data-ops.mjs';
import { meetings, extraDocs } from './data-notes.mjs';

const root = process.argv[2];
if (!root) throw new Error('usage: generate.mjs <workspace>');

const docs = [];
const pad = (n) => String(n).padStart(4, '0');
const who = (k) => people[k] ?? k;
const yamlList = (xs) => `[${xs.map((x) => JSON.stringify(x)).join(', ')}]`;

function fm(obj) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) lines.push(`${k}: ${yamlList(v)}`);
    else if (typeof v === 'string' && (/[:#\[\]{}'"]/.test(v) || v === '')) lines.push(`${k}: ${JSON.stringify(v)}`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

function add(path, date, author, front, body) {
  docs.push({ path, date, author, title: front.title, front, body });
}

for (const d of decisions) {
  const path = `decisions/${pad(d.n)}-${d.slug}.md`;
  const supersedes = (d.supersedes ?? []).map((n) => decisions.find((x) => x.n === n)).map((x) => `${pad(x.n)}-${x.slug}`);
  let body = `# ${pad(d.n)}. ${d.title}\n\n`;
  if (d.status === 'superseded') {
    const by = decisions.find((x) => x.n === d.supersededBy);
    body += `> **Superseded** by [[${pad(by.n)}-${by.slug}]] on ${by.date}.\n\n`;
  }
  body += `## Context\n\n${d.context}\n\n## Decision\n\n${d.decision}\n\n## Consequences\n\n${d.consequences}\n`;
  if (supersedes.length) body += `\nSupersedes: ${supersedes.map((s) => `[[${s}]]`).join(', ')}\n`;
  add(path, d.date, d.deciders[0], {
    title: d.title,
    type: 'decision',
    description: d.decision.split('. ')[0].replace(/\.$/, '') + '.',
    status: d.status,
    date: d.date,
    deciders: d.deciders.map(who),
    supersedes,
    tags: ['decision', ...(d.n % 3 === 0 ? ['data'] : d.n % 3 === 1 ? ['platform'] : ['product'])],
  }, body);
}

const proposalBodies = {
  'multi-stop-pricing': `## Motivation\n\nWe charge a flat **$75 stop-off** regardless of how far the extra stop is from the direct route. On the Hollis Foods Midwest lanes the median deviation is 38 miles, but the p90 is 140 miles — we are losing money on roughly one multi-stop load in five.\n\n## Design\n\nPrice each additional stop as:\n\n\`\`\`\nstop_charge = base_stop_fee + deviation_miles * lane_rpm * 0.85 + expected_dwell_hours * detention_rate\n\`\`\`\n\n| Component | Source | Notes |\n| --- | --- | --- |\n| base_stop_fee | contract, default $50 | Shipper-negotiable |\n| deviation_miles | OSRM route diff | Cached per stop pair |\n| lane_rpm | rate-engine | Same as linehaul quote |\n| expected_dwell_hours | facility history | Falls back to 1.5h |\n\n## Drawbacks\n\n- Quotes become harder to explain to shippers on the phone.\n- Requires OSRM calls at quote time (adds ~40ms).\n\n## Alternatives\n\n1. Tiered flat fees (0–25mi, 25–75mi, 75+).\n2. Leave as-is and renegotiate contracts.\n\n## Unresolved questions\n\n- Do we expose the breakdown on the shipper invoice? Sales says yes, finance says no.\n- What happens to existing contracts with a fixed stop-off clause?\n\n**FCP closes 2026-11-21.** Comment inline or in #eng-pricing.\n`,
  'warehouse-on-clickhouse': `## Motivation\n\nSnowflake spend is $21.4k/month and growing ~9% month over month, almost all of it from the \`events_*\` tables that back the ops dashboards.\n\n## Design\n\n- Stream \`telemetry.*\` and \`events.*\` topics into ClickHouse Cloud via the Kafka table engine.\n- Keep Snowflake for finance (billing, settlements) where dbt models are mature.\n- Grafana reads ClickHouse directly.\n\n## Drawbacks\n\nTwo warehouses. dbt-clickhouse is less mature.\n\n## Alternatives\n\n- Snowflake cost controls (clustering, smaller warehouses) — Ravi estimates 30% saving.\n- Iceberg on S3 + Trino.\n\n## Unresolved questions\n\n- ~~Does ClickHouse Cloud support PrivateLink in us-east-2?~~ Yes, confirmed 11/05.\n- Who is oncall for it?\n- need numbers for 12-month TCO, aiko pulling from the vendor call\n`,
  'driver-app-offline-mode': `## Motivation\n\nRoughly 14% of status updates from drivers on I-80 through Wyoming and Nebraska arrive more than 30 minutes late or never.\n\n## Design\n\n_Draft — sketching only._\n\n- Local SQLite queue in the React Native app\n- Replays on reconnect with client timestamps\n- POD photos compressed to 1600px before queuing\n\n## Drawbacks\n\n## Alternatives\n\n## Unresolved questions\n\n- How do we resolve conflicts if dispatch reassigned the load while the driver was offline?\n`,
};

for (const p of proposals) {
  const path = `proposals/${pad(p.n)}-${p.slug}.md`;
  let body = `# ${p.title}\n\n> ${p.summary}\n\n`;
  if (proposalBodies[p.slug]) body += proposalBodies[p.slug];
  else {
    body += `## Motivation\n\n${p.summary} This came up repeatedly in the ${p.created.slice(0, 7)} planning cycle and in customer calls with Hollis Foods and Kestrel Logistics.\n\n## Design\n\nSee the linked spec for the detailed design. In short: keep the change behind a flag, ship to a pilot cohort of shippers first, and measure against the current baseline for two weeks before widening.\n\n## Drawbacks\n\n- More moving parts to operate.\n- Short-term slowdown on adjacent roadmap work.\n\n## Alternatives\n\n- Do nothing and absorb the cost.\n- Buy instead of build (evaluated; see notes in the meeting log).\n\n## Unresolved questions\n\n- Exact rollout order.\n`;
    if (p.status === 'rejected' || p.status === 'withdrawn') body += `\n## Outcome\n\n**${p.status[0].toUpperCase() + p.status.slice(1)}.** ${p.slug === 'replace-postmark-with-ses' ? 'SES bounce handling and inbound parsing would have needed ~3 weeks of work to reach parity. Not worth $400/mo.' : 'Staging does not yet mirror prod closely enough for chaos results to mean anything. Revisit after the staging parity project.'}\n`;
    if (p.graduated) body += `\n## Outcome\n\nAccepted. Recorded as [[${pad(p.graduated)}-${decisions.find((d) => d.n === p.graduated).slug}]].\n`;
  }
  add(path, p.created, p.authors[0], {
    title: p.title, type: 'proposal', description: p.summary, status: p.status,
    authors: p.authors.map(who), created: p.created, tags: ['proposal'],
  }, body);
}

for (const s of specs) {
  const dir = `specs/${s.slug}`;
  const done = s.tasks.filter((t) => t[1]).length;
  add(`${dir}/spec.md`, s.created, s.owner, {
    title: s.title, type: 'spec', description: `Implementation spec for ${s.title.toLowerCase()}.`, status: s.status,
    owner: who(s.owner), target_release: s.release, created: s.created, parent_proposal: s.proposal, tags: ['spec'],
  }, `# ${s.title}\n\nParent proposal: [[${s.proposal}]]\n\n## Goals\n\n${s.goals.map((g) => `- ${g}`).join('\n')}\n\n## Non-goals\n\n${s.nongoals.map((g) => `- ${g}`).join('\n')}\n\n## Design\n\n\`\`\`mermaid\nflowchart LR\n  A[Trigger] --> B{Flag enabled?}\n  B -- no --> C[Legacy path]\n  B -- yes --> D[New ${s.title}]\n  D --> E[(Postgres)]\n  D --> F[[Kafka]]\n\`\`\`\n\nThe new path is gated by \`${s.slug.replace(/-/g, '.')}.enabled\` in flagd. Both paths emit the same events so downstream consumers do not need to change.\n\n## Migration\n\nShadow mode first, then 10% → 50% → 100% of shippers over two weeks.\n\n## Test plan\n\n- Unit and contract tests in CI\n- Shadow-compare dashboard in Grafana\n- Manual QA on staging with the Hollis Foods fixture account\n`);
  add(`${dir}/plan.md`, s.created, s.owner, {
    title: `Plan: ${s.title}`, type: 'spec-plan', description: `Rollout plan for ${s.title.toLowerCase()}.`, parent_spec: `${dir}/spec.md`, created: s.created, author: who(s.owner), tags: ['spec', 'plan'],
  }, `# Plan: ${s.title}\n\n| Phase | What | Owner | Status |\n| --- | --- | --- | --- |\n| 1 | Build behind flag | ${who(s.owner)} | ${done > 0 ? 'done' : 'not started'} |\n| 2 | Shadow / pilot | ${who(s.owner)} | ${done > 2 ? 'done' : done > 0 ? 'in progress' : 'not started'} |\n| 3 | General availability | ${who(s.owner)} | ${s.status === 'shipped' ? 'done' : 'not started'} |\n\nRisks: see the spec and the weekly sync notes.\n`);
  add(`${dir}/tasks.md`, s.created, s.owner, {
    title: `Tasks: ${s.title}`, type: 'spec-tasks', description: `${done}/${s.tasks.length} tasks done.`, parent_spec: `${dir}/spec.md`, created: s.created, author: who(s.owner), tags: ['spec', 'tasks'],
  }, `# Tasks: ${s.title}\n\n## Tasks\n\n${s.tasks.map(([t, d]) => `- [${d ? 'x' : ' '}] ${t}`).join('\n')}\n\n## Done when\n\n${s.goals[0]}\n\n## Out of scope\n\n${s.nongoals.map((g) => `- ${g}`).join('\n')}\n`);
}

for (const i of incidents) {
  const path = `postmortems/${i.date}-${i.slug}.md`;
  const body = `# ${i.title.replace("Incident: ", "")}\n\n| Field | Detail |\n| --- | --- |\n| **Severity** | ${i.severity} |\n| **Duration** | ${i.duration} |\n| **Services** | ${i.services.map((s) => `\`${s}\``).join(', ')} |\n| **Incident commander** | ${who(i.authors[0])} |\n\n## Summary\n\n${i.summary}\n\n## Timeline\n\nAll times ${i.date >= '2026-11-01' ? 'UTC' : 'US Central'}.\n\n${i.timeline.map(([t, e]) => `- **${t}** — ${e}`).join('\n')}\n\n## Root cause\n\n${i.rootCause}\n\n## What went well\n\n${i.wentWell || '_TBD_'}\n\n## Action items\n\n${i.actions.map(([a, o, d]) => `- [${d ? 'x' : ' '}] ${a} — ${who(o)}`).join('\n')}\n`;
  add(path, i.date, i.authors[0], {
    title: i.title, type: 'postmortem', description: i.summary.split('. ')[0] + '.', severity: i.severity, duration: i.duration,
    services: i.services, status: i.status, date: i.date, authors: i.authors.map(who), tags: ['postmortem', ...i.services],
  }, body);
}

for (const r of runbooks) {
  add(`guides/runbooks/${r.slug}.md`, r.verified, 'sam', {
    title: r.title, type: 'guide', description: `Oncall procedure for ${r.title.split(': ')[1]} in ${r.service}.`, category: 'runbook', service: r.service, severity: r.severity, last_verified: r.verified, tags: ['guide', 'runbook', 'oncall'],
  }, `# ${r.title}\n\n## Symptom\n\n${r.symptom}\n\n## Diagnosis\n\n${r.diagnosis.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n## Remediation\n\n${r.remediation.map((x) => `- ${x}`).join('\n')}\n\n## Escalation\n\n- Primary: oncall in PagerDuty schedule *Platform Primary*\n- Service owner: see [[service-catalog]]\n- If customer-facing for > 30 min, page the incident commander rotation and open \`#inc-<date>-<slug>\`.\n\n## Links\n\n- Grafana: *${r.service} / Overview*\n- [[oncall-handoff]]\n`);
}

for (const s of Object.entries(services)) void s;

for (const e of [...extraDocs, ...meetings]) add(e.path, e.date, e.author, e.front, e.body);

const byBase = new Map();
for (const d of docs) {
  const base = d.path.split('/').pop().replace(/\.md$/, '');
  if (!byBase.has(base)) byBase.set(base, d);
  const segs = d.path.replace(/\.md$/, '').split('/');
  for (let k = 0; k < segs.length - 1; k++) byBase.set(segs.slice(k).join('/'), d);
}
const resolveLinks = (text) => text.replace(/\[\[([^\]|]+)\]\]/g, (m, target) => {
  const t = byBase.get(target) ?? byBase.get(target.split('/').pop());
  if (!t) return m;
  return `[${t.title.replace(/^Incident: /, '')}](/${t.path})`;
});

const manifest = [];
for (const d of docs) {
  const file = join(root, d.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, fm(d.front) + resolveLinks(d.body));
  const t = new Date(`${d.date}T${String(9 + (d.path.length % 9)).padStart(2, '0')}:${String(d.path.length % 60).padStart(2, '0')}:00-06:00`);
  utimesSync(file, t, t);
  manifest.push({ path: d.path, date: t.toISOString(), author: who(d.author) });
}
writeFileSync(join(root, '..', 'seed-manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`wrote ${docs.length} docs`);
