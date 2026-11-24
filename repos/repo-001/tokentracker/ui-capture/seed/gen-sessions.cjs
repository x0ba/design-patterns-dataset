#!/usr/bin/env node
// Writes Claude Code session transcripts (~/.claude/projects/<slug>/<uuid>.jsonl)
// in the format Claude Code itself writes, so TokenTracker's own session
// analytics (Sessions page, session insights, context breakdown) scan them.
// Usage: node gen-sessions.cjs <home>
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const home = path.resolve(process.argv[2]);
const BASE_END = Date.parse("2026-11-17T06:30:00Z");
const REAL_NOW = Date.now();
const SHIFT = Math.max(0, Math.round((REAL_NOW - BASE_END) / 86400000)) * 86400000;

let seed = 4407;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const uuid = () => {
  const b = Array.from({ length: 16 }, () => Math.floor(rnd() * 256));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const rid = (p, n) => p + Array.from({ length: n }, () => "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789"[Math.floor(rnd() * 57)]).join("");

const CODE = "/Users/dmin/code";
const REPOS = {
  "ledger-api": {
    w: 0.28, titles: [
      "Fix double-posting in ledger reconciliation job", "Add idempotency keys to /v2/transfers", "Migrate invoices table to partitioned schema",
      "Investigate flaky settlement integration test", "Add OpenTelemetry spans to payout worker", "Rate limit webhook retries per merchant",
      "Refactor currency rounding into Money value object", "Backfill missing FX rates for September", "Write migration for ledger_entries.account_id index",
      "Debug 502s from payments gateway under load", "Add audit log for manual balance adjustments", "Upgrade to Postgres 17 driver and fix type casts",
    ], prompts: [
      "the reconciliation job is posting some entries twice when the cron overlaps — can you find why and add a lock?",
      "add idempotency key support to POST /v2/transfers, store keys for 24h in redis",
      "tests in settlement_test.go fail maybe 1 in 10 runs on CI. figure out what's racing",
      "lets move rounding logic out of the handlers into a Money type, keep behavior identical",
      "run the test suite and fix whatever broke after the driver upgrade",
    ],
  },
  "ledger-web": {
    w: 0.22, titles: [
      "Build transactions table with virtualized rows", "Fix date picker timezone off-by-one", "Add dark mode to settings pages",
      "Replace Redux slice with React Query for balances", "Polish empty states on the dashboard", "CSV export for filtered transactions",
      "Accessibility pass on the invoice form", "Storybook stories for Badge and Pill", "Fix hydration warning on account switcher",
    ], prompts: [
      "the transactions table gets really slow over ~2k rows, can we virtualize it without breaking sticky headers",
      "date filter shows the previous day for users in Asia/Tokyo. fix it properly, not with a +1",
      "convert the balances redux slice to react query and delete the old saga",
      "make the empty states match the figma (link in the PR description), use the existing Illustration component",
    ],
  },
  "infra-terraform": {
    w: 0.07, titles: ["Split staging VPC module", "Add RDS read replica for reporting", "Rotate CI deploy role to OIDC", "Tighten S3 bucket policies"],
    prompts: ["plan shows it wants to recreate the NAT gateway, why? i only changed tags", "switch the github actions deploy role to OIDC and remove the long-lived keys"],
  },
  "mobile-checkout": {
    w: 0.13, from: "2026-08-03", titles: [
      "Apple Pay sheet crashes on iOS 19 beta", "Add saved cards carousel", "Wire up 3DS challenge flow", "Fix keyboard covering CVC field on Android",
      "Analytics events for checkout funnel", "Localize checkout strings for es-MX and pt-BR",
    ], prompts: ["apple pay sheet crashes right after authorization on the ios 19 beta, stack trace attached", "add the 3DS challenge webview and handle the redirect back"],
  },
  "trailhead-rss": {
    w: 0.08, from: "2026-06-10", titles: ["Parse Atom feeds with xml:base", "Add OPML import", "Deduplicate items by GUID and link", "Keyboard shortcuts for reader view"],
    prompts: ["some atom feeds have relative links, handle xml:base", "add OPML import, i want to bring my feedly export over"],
  },
  "cs-thesis-sim": {
    w: 0.12, from: "2026-09-25", titles: [
      "Vectorize particle collision step with numpy", "Plot convergence curves for chapter 3", "Profile simulation memory usage",
      "Write LaTeX table generator from results CSV", "Port integrator to JAX",
    ], prompts: ["the collision step is the bottleneck, vectorize it with numpy and check results match within 1e-9", "generate the convergence plots for chapter 3 with matplotlib, match the thesis style file"],
  },
  "kv-raft": {
    w: 0.05, from: "2026-10-01", titles: ["Implement Raft log compaction", "Fix split vote livelock in leader election", "Add linearizability checker to tests"],
    prompts: ["implement snapshotting / log compaction per section 7 of the raft paper", "elections sometimes never converge with 5 nodes, look at the randomized timeout"],
  },
  "dotfiles": {
    w: 0.05, titles: ["Clean up zsh startup time", "Neovim LSP config for Go and TS", "Brewfile refresh"],
    prompts: ["zsh takes 1.4s to start, profile it and fix", "set up gopls and vtsls in my neovim config"],
  },
};
const FOLLOWUPS = [
  "looks good, now add tests for that", "can you run the tests again", "hmm that broke the build, check the type errors",
  "ok commit that with a sensible message", "also update the README section", "why did you change that file?", "revert the last change, try a different approach",
  "nice. one more thing — handle the empty case", "run lint and fix", "yes go ahead", "explain what the root cause was in 2-3 sentences",
];
const SUBAGENTS = ["Explore", "general-purpose", "code-reviewer", "test-runner"];
const TOOLS = ["Read", "Read", "Grep", "Glob", "Bash", "Edit", "Edit", "Write", "Bash", "TodoWrite"];

function modelFor(day) {
  if (day < "2026-07-20") return pick(["claude-opus-4-6", "claude-opus-4-6", "claude-sonnet-4-6"]);
  if (day < "2026-09-08") return pick(["claude-opus-4-8", "claude-opus-4-8", "claude-sonnet-4-6"]);
  if (day < "2026-10-14") return pick(["claude-opus-5", "claude-opus-5", "claude-sonnet-5"]);
  if (day < "2026-11-09") return pick(["claude-opus-5-5", "claude-opus-5-5", "claude-sonnet-5-5"]);
  return pick(["claude-fable-5-2", "claude-fable-5-2", "claude-opus-5-5"]);
}

const projectsDir = path.join(home, ".claude", "projects");
fs.rmSync(projectsDir, { recursive: true, force: true });
// Session analytics sidecar cache is rebuilt from the transcripts.
fs.rmSync(path.join(home, ".tokentracker", "tracker", "session.queue.jsonl"), { force: true });

const repoEntries = Object.entries(REPOS);
let count = 0;
const START = Date.parse("2026-05-12T16:00:00Z");
// Session start times: denser in recent months
const starts = [];
for (let t = START; t < BASE_END - 3600e3; ) {
  const month = (t - START) / (30 * 86400e3);
  t += (3.8 - month * 0.38) * 3600e3 * (0.3 + rnd() * 3.2);
  const local = new Date(t - 7 * 3600e3);
  const h = local.getUTCHours();
  const dow = local.getUTCDay();
  if (h < 8 || h > 23) continue;
  if ((dow === 0 || dow === 6) && rnd() < 0.6) continue;
  starts.push(t);
}

for (const startMs of starts) {
  const day = new Date(startMs - 7 * 3600e3).toISOString().slice(0, 10);
  const avail = repoEntries.filter(([, r]) => !r.from || r.from <= day);
  let x = rnd() * avail.reduce((s, [, r]) => s + r.w, 0);
  let repoName = avail[0][0];
  for (const [n, r] of avail) { if ((x -= r.w) <= 0) { repoName = n; break; } }
  const repo = REPOS[repoName];
  const worktree = rnd() < 0.03;
  const cwd = worktree ? `${CODE}/${repoName}/.claude/worktrees/${pick(["agent-a1f3", "agent-7c02", "agent-e9d4"])}` : `${CODE}/${repoName}`;
  const slug = cwd.replace(/[^a-zA-Z0-9]/g, "-");
  const sessionId = uuid();
  const model = modelFor(day);
  const lines = [];
  let ts = startMs + int(0, 59) * 60e3;
  const iso = () => new Date(ts + SHIFT).toISOString();
  let parent = null;
  let context = int(14000, 26000);
  const gitBranch = pick(["main", "main", `fix/${repoName.split("-")[0]}-${int(100, 999)}`, `feat/${pick(["export", "retry", "auth", "perf"])}`]);
  const base = () => ({ parentUuid: parent, isSidechain: false, userType: "external", cwd, sessionId, version: pick(["2.4.11", "2.5.3", "2.6.0"]), gitBranch });
  const turns = rnd() < 0.15 ? 1 : int(2, rnd() < 0.2 ? 28 : 12);
  for (let turn = 0; turn < turns; turn++) {
    const u = uuid();
    const prompt = turn === 0 ? pick(repo.prompts) : pick(FOLLOWUPS);
    lines.push({ ...base(), type: "user", message: { role: "user", content: prompt }, uuid: u, timestamp: iso() });
    parent = u;
    // retry: the same prompt again sometimes
    if (turn > 0 && rnd() < 0.04) {
      ts += int(20, 90) * 1000;
      const u2 = uuid();
      lines.push({ ...base(), type: "user", message: { role: "user", content: prompt }, uuid: u2, timestamp: iso() });
      parent = u2;
    }
    const steps = int(1, 9);
    for (let s = 0; s < steps; s++) {
      const last = s === steps - 1;
      const a = uuid();
      const output = int(120, last ? 1800 : 900);
      ts += Math.round((output / (35 + rnd() * 50)) * 1000) + int(800, 4000);
      const created = int(600, 6500);
      const usage = {
        input_tokens: int(2, 40), cache_creation_input_tokens: created, cache_read_input_tokens: context,
        output_tokens: output, service_tier: "standard",
        cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: created },
      };
      context += created;
      const content = [];
      let toolName = null;
      if (!last) {
        toolName = rnd() < 0.06 ? "Task" : pick(TOOLS);
        const input = toolName === "Task" ? { description: "Explore codebase", subagent_type: pick(SUBAGENTS), prompt: "Find where this is implemented" } : { file_path: `${cwd}/src/${pick(["index", "handlers", "service", "utils", "types"])}.${pick(["ts", "go", "py"])}` };
        content.push({ type: "tool_use", id: rid("toolu_01", 22), name: toolName, input });
      } else {
        content.push({ type: "text", text: pick(["Done — the change is in place and tests pass.", "I've made the fix; summary below.", "Here's what I found and changed."]) });
      }
      const msgId = rid("msg_01", 22);
      lines.push({
        ...base(), type: "assistant", uuid: a, timestamp: iso(), requestId: rid("req_011", 21),
        message: { id: msgId, type: "message", role: "assistant", model, content, stop_reason: last ? "end_turn" : "tool_use", stop_sequence: null, usage },
      });
      parent = a;
      if (!last) {
        ts += int(300, toolName === "Bash" ? 25000 : 2500);
        const tr = uuid();
        lines.push({ ...base(), type: "user", uuid: tr, timestamp: iso(), message: { role: "user", content: [{ type: "tool_result", tool_use_id: content[0].id, content: "ok" }] } });
        parent = tr;
      }
    }
    // Think time before the next prompt
    ts += int(40, 600) * 1000;
    if (context > 160000 && rnd() < 0.5) context = int(30000, 45000); // compaction
  }
  if (rnd() < 0.9) lines.splice(1, 0, { type: "ai-title", aiTitle: pick(repo.titles), sessionId });
  if (ts + SHIFT > REAL_NOW) continue;
  const dir = path.join(projectsDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${sessionId}.jsonl`);
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  const mt = new Date(ts + SHIFT);
  fs.utimesSync(file, mt, mt);
  count++;
}
console.log(`claude sessions=${count}`);
