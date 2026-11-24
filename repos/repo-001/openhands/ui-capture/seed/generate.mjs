#!/usr/bin/env node
// Generates src/mocks/seed/ui-capture-seed.json — the dataset the app's own
// MSW mock layer serves when built with VITE_UI_CAPTURE_SEED=true.
// All timestamps are absolute relative to ANCHOR; the mock layer shifts them
// forward so "now" in the data always matches the viewer's clock.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CONVERSATIONS as RAW } from "./conversations.mjs";
import { RICH } from "./rich-conversations.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../../src/mocks/seed/ui-capture-seed.json");

const ANCHOR = Date.parse("2026-11-16T17:30:00Z");
const MIN = 60_000;
const HOME = "/Users/jonas/src";

// Deterministic PRNG so the dataset is stable between runs.
let s = 1337;
const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rand() * a.length)];

const WORKSPACES = [
  { id: "ws-harbor-api", name: "harbor-api", repo: "tidewater/harbor-api", lang: "py" },
  { id: "ws-harbor-web", name: "harbor-web", repo: "tidewater/harbor-web", lang: "ts" },
  { id: "ws-route-optimizer", name: "route-optimizer", repo: "tidewater/route-optimizer", lang: "go" },
  { id: "ws-infra", name: "infra", repo: "tidewater/infra", lang: "tf" },
  { id: "ws-pg-migrate-lint", name: "pg-migrate-lint", repo: "jlindqvist/pg-migrate-lint", lang: "py" },
  { id: "ws-dotfiles", name: "dotfiles", repo: "jlindqvist/dotfiles", lang: "sh" },
].map((w) => ({ ...w, path: `${HOME}/${w.name}`, parentPath: HOME }));
const WS = Object.fromEntries(WORKSPACES.map((w) => [w.name, w]));

const MODELS = {
  sonnet: "anthropic/claude-sonnet-4-5-20250929",
  opus: "anthropic/claude-opus-4-5-20251101",
  haiku: "anthropic/claude-haiku-4-5-20251001",
  gpt: "openai/gpt-5.5",
};

// ---------- event builders ----------
let evSeq = 0;
function makeBuilder(convId, startMs) {
  let t = startMs;
  const events = [];
  const id = (p) => `${convId}-${p}-${(evSeq++).toString(36)}`;
  const ts = (dt = 6) => {
    t += Math.round(dt * 1000 * (0.6 + rand() * 0.8));
    return new Date(t).toISOString();
  };
  const message = (role, text, dt) =>
    events.push({
      id: id(role === "user" ? "u" : "a"),
      timestamp: ts(dt ?? (role === "user" ? 2 : 14)),
      source: role === "user" ? "user" : "agent",
      llm_message: { role, content: [{ type: "text", text }] },
      activated_skills: [],
      extended_content: [],
    });
  const action = (toolName, act, args, obs, { thought, summary, dt = 8, odt = 4 } = {}) => {
    const callId = id("call");
    const a = {
      id: id("act"),
      timestamp: ts(dt),
      source: "agent",
      thought: thought ? [{ type: "text", text: thought }] : [],
      thinking_blocks: [],
      action: act,
      tool_name: toolName,
      tool_call_id: callId,
      tool_call: { id: callId, type: "function", function: { name: toolName, arguments: JSON.stringify(args) } },
      llm_response_id: id("resp"),
      security_risk: "LOW",
      summary: summary ?? null,
    };
    events.push(a);
    if (obs) {
      events.push({
        id: id("obs"),
        timestamp: ts(odt),
        source: "environment",
        tool_name: toolName,
        tool_call_id: callId,
        action_id: a.id,
        observation: obs,
      });
    }
  };
  const api = {
    events,
    get t() {
      return t;
    },
    user: (text, dt) => message("user", text, dt),
    agent: (text, dt) => message("assistant", text, dt),
    run(command, output, { exit = 0, cwd, thought, summary, dt, odt } = {}) {
      action(
        "terminal",
        { kind: "TerminalAction", command, is_input: false, timeout: null, reset: false },
        { command },
        {
          kind: "TerminalObservation",
          content: [{ type: "text", text: output }],
          command,
          exit_code: exit,
          is_error: exit !== 0,
          timeout: false,
          metadata: {
            exit_code: exit, pid: 40000 + Math.floor(rand() * 9000), username: "jonas",
            hostname: "jonas-mbp", working_dir: cwd ?? null, py_interpreter_path: null,
            prefix: "", suffix: "",
          },
        },
        { thought, summary, dt, odt },
      );
    },
    view(path, content, { thought, summary } = {}) {
      action(
        "file_editor",
        { kind: "FileEditorAction", command: "view", path, file_text: null, old_str: null, new_str: null, insert_line: null, view_range: null },
        { command: "view", path },
        { kind: "FileEditorObservation", command: "view", output: content, path, prev_exist: true, old_content: null, new_content: null, error: null },
        { thought, summary, dt: 5, odt: 1 },
      );
    },
    edit(path, oldStr, newStr, { thought, summary } = {}) {
      action(
        "file_editor",
        { kind: "FileEditorAction", command: "str_replace", path, file_text: null, old_str: oldStr, new_str: newStr, insert_line: null, view_range: null },
        { command: "str_replace", path },
        {
          kind: "FileEditorObservation", command: "str_replace",
          output: `The file ${path} has been edited. Review the changes and make sure they are as expected.`,
          path, prev_exist: true, old_content: oldStr, new_content: newStr, error: null,
        },
        { thought, summary, dt: 18, odt: 1 },
      );
    },
    create(path, text, { thought, summary } = {}) {
      action(
        "file_editor",
        { kind: "FileEditorAction", command: "create", path, file_text: text, old_str: null, new_str: null, insert_line: null, view_range: null },
        { command: "create", path },
        { kind: "FileEditorObservation", command: "create", output: `File created successfully at: ${path}`, path, prev_exist: false, old_content: null, new_content: text, error: null },
        { thought, summary, dt: 25, odt: 1 },
      );
    },
    pending(command, { thought, summary } = {}) {
      // An action awaiting user confirmation: no observation yet.
      action("terminal", { kind: "TerminalAction", command, is_input: false, timeout: null, reset: false }, { command }, null, { thought, summary });
      events[events.length - 1].security_risk = "MEDIUM";
    },
  };
  return api;
}

// ---------- generic event scripts for the long tail ----------
const TEST_CMD = {
  py: ["uv run pytest -q", (n) => `........................................................ [ 78%]\n................                                         [100%]\n${n} passed in 7.${Math.floor(rand() * 90 + 10)}s`],
  ts: ["pnpm vitest run --reporter=dot", (n) => `\n ✓ ${Math.ceil(n / 9)} test files\n\n Test Files  ${Math.ceil(n / 9)} passed (${Math.ceil(n / 9)})\n      Tests  ${n} passed (${n})\n   Duration  4.${Math.floor(rand() * 90 + 10)}s`],
  go: ["go test ./...", () => `ok  \tgithub.com/tidewater/route-optimizer/internal/solver\t1.${Math.floor(rand() * 900 + 100)}s\nok  \tgithub.com/tidewater/route-optimizer/internal/geo\t0.214s\nok  \tgithub.com/tidewater/route-optimizer/internal/api\t0.488s\n?   \tgithub.com/tidewater/route-optimizer/cmd/optimizer\t[no test files]`],
  tf: ["terraform plan -no-color | tail -n 6", () => `\nPlan: 1 to add, 2 to change, 0 to destroy.\n\n─────────────────────────────────────────────────────────────────────────────\n\nNote: You didn't use the -out option to save this plan, so Terraform can't\nguarantee to take exactly these actions if you run "terraform apply" now.`],
  sh: ["shellcheck install.sh zsh/*.zsh && echo OK", () => "OK"],
};

function genericEvents(c, startMs) {
  const b = makeBuilder(c.id, startMs);
  const ws = WS[c.ws];
  b.user(c.prompt);
  b.run(
    `git status -sb && git log --oneline -5`,
    `## ${c.branch ?? "main"}...origin/${c.branch ?? "main"}\n${c.log ?? "a41c9e2 Merge pull request #812 from tidewater/jl/ledger-backfill\n7d03b1f Bump pydantic to 2.9.2\n19ce4aa Add carrier SLA fields to shipment schema\nc2f0e8d Fix flaky test_quote_expiry on CI\n5b7a113 Route optimizer: respect depot opening hours"}`,
    { cwd: ws.path, thought: "Let me get oriented in the repository first.", summary: "Inspect repository state" },
  );
  if (c.grep) b.run(c.grep[0], c.grep[1], { cwd: ws.path, summary: "Search the codebase" });
  if (c.file && c.edit) {
    b.edit(`${ws.path}/${c.file}`, c.edit[0], c.edit[1], { summary: `Edit ${c.file.split("/").pop()}` });
  }
  if (c.status === "running") return b.events;
  if (c.status === "waiting_for_confirmation") {
    b.agent(c.confirmNote ?? "The change is ready. I need to run a command with side effects next — please confirm.");
    b.pending(c.confirmCmd ?? "git push --force-with-lease origin HEAD", { summary: "Push branch", thought: "Pushing requires confirmation under the current policy." });
    return b.events;
  }
  if (c.status === "error") {
    b.run(c.failCmd ?? TEST_CMD[ws.lang][0], c.failOut ?? "Error: connection refused (postgres://localhost:5432/harbor_test)\nmake: *** [test] Error 1", { exit: 1, cwd: ws.path, summary: "Run tests" });
    return b.events;
  }
  const [cmd, out] = TEST_CMD[ws.lang];
  b.run(cmd, out(40 + Math.floor(rand() * 400)), { cwd: ws.path, summary: "Run test suite" });
  b.agent(c.summary);
  if (c.followup) {
    b.user(c.followup[0], 240);
    b.agent(c.followup[1]);
  }
  return b.events;
}

// ---------- assemble conversations ----------
const conversations = [];
const events = {};
const allEntries = [...RICH, ...RAW];
for (const c of allEntries) {
  const ws = WS[c.ws];
  const updatedMs = ANCHOR - c.ago * MIN;
  const durationMin = c.duration ?? 6 + Math.floor(rand() * 40);
  const createdMs = updatedMs - durationMin * MIN;
  const evs = c.script ? c.script(makeBuilder(c.id, createdMs), ws) : genericEvents(c, createdMs);
  events[c.id] = evs;
  const lastTs = evs.length ? Date.parse(evs[evs.length - 1].timestamp) : updatedMs;
  const model = MODELS[c.model ?? pick(["sonnet", "sonnet", "sonnet", "opus", "haiku", "gpt"])];
  const turns = evs.filter((e) => e.source === "agent").length;
  const prompt = 18000 + turns * (9000 + Math.floor(rand() * 14000));
  const tags = {};
  if (ws.repo) {
    tags.repository = ws.repo;
    tags.gitprovider = "github";
    tags.selectedbranch = c.branch ?? "main";
  }
  tags.workspace = ws.path;
  Object.assign(tags, c.tags ?? {});
  conversations.push({
    id: c.id,
    title: c.title,
    created_at: new Date(createdMs).toISOString(),
    updated_at: new Date(Math.max(lastTs, updatedMs)).toISOString(),
    execution_status: c.status ?? "finished",
    sandbox_status: c.sandbox ?? null,
    metrics: {
      accumulated_cost: Math.round(prompt * (model.includes("opus") ? 0.0000052 : model.includes("haiku") ? 0.0000006 : 0.0000021) * 100) / 100,
      max_budget_per_task: null,
      accumulated_token_usage: {
        prompt_tokens: prompt,
        completion_tokens: Math.round(prompt * 0.07),
        cache_read_tokens: Math.round(prompt * 0.62),
        cache_write_tokens: Math.round(prompt * 0.11),
        context_window: 200000,
        per_turn_token: 9000 + Math.floor(rand() * 30000),
      },
    },
    agent: { kind: "Agent", llm: { model } },
    workspace: { working_dir: ws.path },
    tags,
  });
}

// Mock repo list for the home page repository picker.
const repositories = [
  ...WORKSPACES.filter((w) => w.repo).map((w, i) => ({ full_name: w.repo, pushed_at: new Date(ANCHOR - i * 7 * 3600_000).toISOString(), is_public: w.repo.startsWith("jlindqvist/") && w.name !== "dotfiles" })),
  ...[
    "tidewater/carrier-adapters", "tidewater/harbor-mobile", "tidewater/design-tokens", "tidewater/data-pipelines",
    "tidewater/eta-model", "tidewater/ops-runbooks", "tidewater/billing-service", "tidewater/edi-gateway",
    "jlindqvist/advent-of-code-2025", "jlindqvist/notes",
  ].map((full_name, i) => ({ full_name, pushed_at: new Date(ANCHOR - (i + 3) * 86_400_000 * 4).toISOString(), is_public: full_name.startsWith("jlindqvist/") })),
];

const seed = {
  anchor: new Date(ANCHOR).toISOString(),
  user: { login: "jlindqvist", name: "Jonas Lindqvist", email: "jonas.lindqvist@tidewater.io", company: "Tidewater Labs" },
  workspaces: WORKSPACES.map(({ id, name, path, parentPath }) => ({ id, name, path, parentPath })),
  workspaceParents: [{ id: "wp-src", name: "src", path: HOME }],
  conversations,
  events,
  repositories,
  secrets: [
    { name: "GITHUB_TOKEN", value: "ghp_placeholder", description: "Fine-grained PAT for tidewater org (repo, pull_request)" },
    { name: "HARBOR_STAGING_DATABASE_URL", value: "postgres://placeholder", description: "Read-only replica for staging" },
    { name: "SENTRY_AUTH_TOKEN", value: "placeholder", description: "Used by release-notes automation" },
    { name: "LINEAR_API_KEY", value: "placeholder", description: "Linear (TIDE workspace)" },
    { name: "AWS_PROFILE", value: "tidewater-dev", description: "" },
    { name: "SLACK_WEBHOOK_ENG_ALERTS", value: "placeholder", description: "#eng-alerts incoming webhook" },
    { name: "MAPBOX_TOKEN", value: "placeholder", description: "route-optimizer integration tests" },
  ],
  llmProfiles: [
    { name: "sonnet-4.5", config: { model: MODELS.sonnet, base_url: null, api_key: "sk-ant-placeholder" }, api_key_set: true },
    { name: "opus-deep-work", config: { model: MODELS.opus, base_url: null, api_key: "sk-ant-placeholder" }, api_key_set: true },
    { name: "haiku-titles", config: { model: MODELS.haiku, base_url: null, api_key: "sk-ant-placeholder" }, api_key_set: true },
    { name: "gpt-5.5", config: { model: MODELS.gpt, base_url: null, api_key: "sk-proj-placeholder" }, api_key_set: true },
  ],
  activeLlmProfile: "sonnet-4.5",
  gitUser: { name: "Jonas Lindqvist", email: "jonas.lindqvist@tidewater.io" },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(seed));
const evCount = Object.values(events).reduce((n, e) => n + e.length, 0);
console.log(`seed: ${conversations.length} conversations, ${evCount} events -> ${OUT}`);
