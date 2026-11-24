#!/usr/bin/env node
// User-level agent config an established user has: global CLAUDE.md, MCP
// servers, installed Claude/Codex skills, and the repo they launch from.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const home = path.resolve(process.argv[2]);
const w = (rel, content) => {
  const p = path.join(home, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

w(".claude/CLAUDE.md", `# Global preferences

- I write Go on the backend and TypeScript/React on the frontend. Prefer the standard library.
- Run the narrowest test first (\`go test ./internal/ledger/... -run TestX\`), then the package.
- Never commit or push unless I ask. Conventional commit messages.
- Keep diffs small; don't reformat files you didn't otherwise touch.
- For SQL migrations: always write the down migration, and never drop columns in the same release.
- When unsure about product behavior, ask instead of guessing.
`);

const claudeJsonPath = path.join(home, ".claude.json");
let claudeJson = {};
try { claudeJson = JSON.parse(fs.readFileSync(claudeJsonPath, "utf8")); } catch {}
Object.assign(claudeJson, {
  numStartups: 812,
  installMethod: "native",
  autoUpdates: true,
  hasCompletedOnboarding: true,
  oauthAccount: { accountUuid: "5f0c2b8e-91d4-4c3a-b7e2-0a6f4d1c9e33", emailAddress: "dmin@harborline.dev", organizationName: "Harborline Labs" },
  mcpServers: {
    linear: { type: "http", url: "https://mcp.linear.app/mcp" },
    postgres: { type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/ledger_dev"] },
    playwright: { type: "stdio", command: "npx", args: ["@playwright/mcp@latest"] },
  },
});
fs.writeFileSync(claudeJsonPath, JSON.stringify(claudeJson, null, 2));

const skills = {
  ".claude/skills/pr-review": ["pr-review", "Review the current branch diff like a senior reviewer: correctness, tests, migrations, and API compatibility. Use before opening a PR.", "1. `git diff main...HEAD`\n2. Check for missing tests, unsafe migrations, and breaking API changes.\n3. Output findings grouped by severity."],
  ".claude/skills/sql-migration": ["sql-migration", "Write paired up/down Postgres migrations for the ledger services following the expand/contract pattern.", "- Name files `YYYYMMDDHHMM_<slug>.up.sql` / `.down.sql`\n- Never drop a column in the same release that stops writing it\n- Add indexes CONCURRENTLY"],
  ".claude/skills/release-notes": ["release-notes", "Draft customer-facing release notes from merged PRs since the last tag.", "Group by Added / Changed / Fixed. Skip internal refactors. One line each, plain language."],
  ".claude/skills/thesis-figures": ["thesis-figures", "Generate matplotlib figures that match the thesis LaTeX style (serif fonts, 3.4in column width, colorblind-safe palette).", "Use `plt.style.use('thesis.mplstyle')`. Save as PDF with `bbox_inches='tight'`."],
  ".claude/skills/flaky-test-hunter": ["flaky-test-hunter", "Reproduce and diagnose intermittently failing Go tests by running them under -race with -count=50 and bisecting shared state.", "Run `go test -race -count=50 -run <Test> ./pkg/...` and report the first failing seed and the shared state involved."],
  ".codex/skills/go-bench": ["go-bench", "Run Go benchmarks before and after a change and summarize with benchstat.", "`go test -bench=. -benchmem -count=10 > new.txt` then `benchstat old.txt new.txt`."],
  ".codex/skills/tf-plan-explain": ["tf-plan-explain", "Explain a terraform plan in plain English and flag anything destructive (replace/destroy).", "Run `terraform plan -no-color` and summarize resources by action."],
};
for (const [dir, [name, description, body]] of Object.entries(skills)) {
  w(`${dir}/SKILL.md`, `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${body}\n`);
}

// The directory `tokentracker serve` is launched from (start.sh cd's here).
w("code/ledger-api/CLAUDE.md", `# ledger-api

Go 1.25 service. Postgres 17, Redis 7. \`make test\` runs unit tests, \`make itest\` needs docker compose.

## Conventions
- Handlers live in internal/http, business logic in internal/ledger. No SQL in handlers.
- Money is always int64 minor units + ISO currency. Use the Money type, never float64.
- Every write endpoint must accept an Idempotency-Key header.
- Feature flags via internal/flags; default off.

## Gotchas
- settlement_test.go uses a shared test DB schema per package — don't run it with -p > 1.
- FX rates come from the fx_rates table, backfilled nightly; missing dates fall back to previous business day.
`);
w("code/ledger-api/.claude/skills/ledger-debug/SKILL.md", `---\nname: ledger-debug\ndescription: Trace a ledger entry through posting, reconciliation and settlement using the admin SQL views.\n---\n\nQuery \`v_entry_trace\` by entry id and walk parent links.\n`);
console.log("user config written");
