#!/usr/bin/env node
// Generates ~6 months of realistic TokenTracker queue data for one developer
// (Pacific time, heavy Claude Code user, regular Codex, some Cursor / Gemini /
// OpenCode). Writes the same append-only JSONL shapes the CLI's parsers write:
//   <home>/.tokentracker/tracker/queue.jsonl          (source, model, half-hour bucket)
//   <home>/.tokentracker/tracker/project.queue.jsonl  (per-repo attribution)
// Usage: node gen-queue.cjs <home> [endIso]
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const home = path.resolve(process.argv[2] || path.join(__dirname, "..", "home"));
// Data is authored against a fixed timeline ending 2026-11-17 and shifted by
// whole days so it always ends "today" whenever the seed runs.
const BASE_END = new Date("2026-11-17T06:30:00Z");
const REAL_NOW = new Date(process.argv[3] || Date.now());
const SHIFT_MS = Math.max(0, Math.round((REAL_NOW - BASE_END) / 86400000)) * 86400000;
const END = BASE_END;
const START = new Date("2026-05-11T00:00:00Z");

let seed = 20260511;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function weighted(entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of entries) { if ((r -= w) <= 0) return v; }
  return entries[entries.length - 1][0];
}
const logn = (mu, sigma) => Math.exp(mu + sigma * (Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd())));
const dayStr = (d) => d.toISOString().slice(0, 10);

// Pacific offset (PDT until Nov 1 2026, PST after)
const ptOffsetHours = (d) => (d < new Date("2026-11-01T09:00:00Z") ? 7 : 8);

// Days away from the keyboard: July 4 trip, a conference, Thanksgiving-ish sick days
const OFF_DAYS = new Set([
  "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08",
  "2026-08-22", "2026-08-23",
  "2026-09-15", "2026-09-16", "2026-09-17",
  "2026-10-10", "2026-10-11",
]);

function claudeModels(d) {
  const t = dayStr(d);
  if (t < "2026-07-20") return [["claude-opus-4-6", 0.55], ["claude-sonnet-4-6", 0.35], ["claude-haiku-4-5", 0.1]];
  if (t < "2026-09-08") return [["claude-opus-4-8", 0.6], ["claude-sonnet-4-6", 0.28], ["claude-haiku-4-5", 0.12]];
  if (t < "2026-10-14") return [["claude-opus-5", 0.62], ["claude-sonnet-5", 0.26], ["claude-haiku-4-5", 0.12]];
  if (t < "2026-11-09") return [["claude-opus-5-5", 0.6], ["claude-sonnet-5-5", 0.28], ["claude-haiku-5-5", 0.12]];
  return [["claude-fable-5-2", 0.5], ["claude-opus-5-5", 0.25], ["claude-sonnet-5-5", 0.15], ["claude-haiku-5-5", 0.1]];
}
function codexModels(d) {
  const t = dayStr(d);
  if (t < "2026-07-01") return [["gpt-5.4", 0.8], ["gpt-5.4-mini", 0.2]];
  if (t < "2026-09-20") return [["gpt-5.5", 0.75], ["gpt-5.3-codex-spark", 0.25]];
  return [["gpt-5.6-terra", 0.7], ["gpt-5.6-sol", 0.15], ["gpt-5.3-codex-spark", 0.15]];
}
function cursorModels(d) {
  const t = dayStr(d);
  if (t < "2026-08-15") return [["composer-2", 0.7], ["claude-sonnet-4-6", 0.3]];
  return [["composer-2.5", 0.6], ["composer-2.5-fast", 0.2], ["cursor-grok-4.6", 0.2]];
}
function geminiModels(d) {
  return dayStr(d) < "2026-10-20" ? [["gemini-3.5-flash", 0.7], ["gemini-3-flash-preview", 0.3]] : [["gemini-4-carbon", 0.6], ["gemini-3.8-flash", 0.4]];
}
function opencodeModels(d) {
  return dayStr(d) < "2026-09-01" ? [["kimi-k2.6", 0.5], ["glm-5.1", 0.3], ["deepseek-v4-pro", 0.2]] : [["kimi-k3", 0.45], ["glm-5.3", 0.3], ["deepseek-v4-pro", 0.25]];
}

// Repos the user works in (fictional small studio + side projects)
const PROJECTS = [
  { ref: "https://github.com/harborline-labs/ledger-api", w: 0.30, from: "2026-05-11" },
  { ref: "https://github.com/harborline-labs/ledger-web", w: 0.22, from: "2026-05-11" },
  { ref: "https://github.com/harborline-labs/infra-terraform", w: 0.08, from: "2026-05-20" },
  { ref: "https://github.com/harborline-labs/mobile-checkout", w: 0.14, from: "2026-08-03" },
  { ref: "https://github.com/dmin-dev/dotfiles", w: 0.04, from: "2026-05-11" },
  { ref: "https://github.com/dmin-dev/trailhead-rss", w: 0.08, from: "2026-06-10" },
  { ref: "https://github.com/dmin-dev/cs-thesis-sim", w: 0.10, from: "2026-09-25" },
  { ref: "https://gitlab.com/ucsd-cse/cse291/kv-raft", w: 0.04, from: "2026-10-01" },
];
const projectKey = (ref) => new URL(ref).pathname.split("/").filter(Boolean).join("/");

function split(total, mix) {
  // mix: {input, output, cacheRead, cacheWrite, reasoning}
  const r = (x) => Math.max(0, Math.round(total * x * (0.85 + rnd() * 0.3)));
  return {
    input_tokens: r(mix.input),
    output_tokens: r(mix.output),
    cached_input_tokens: r(mix.cacheRead),
    cache_creation_input_tokens: r(mix.cacheWrite),
    reasoning_output_tokens: r(mix.reasoning || 0),
  };
}
const MIX = {
  claude: { input: 0.004, output: 0.012, cacheRead: 0.91, cacheWrite: 0.074 },
  codex: { input: 0.11, output: 0.022, cacheRead: 0.86, cacheWrite: 0, reasoning: 0.012 },
  cursor: { input: 0.28, output: 0.04, cacheRead: 0.68, cacheWrite: 0 },
  gemini: { input: 0.52, output: 0.03, cacheRead: 0.45, cacheWrite: 0, reasoning: 0.01 },
  opencode: { input: 0.18, output: 0.03, cacheRead: 0.79, cacheWrite: 0 },
};

const rows = [];
const projectRows = [];

function emit(source, model, hourStart, total, conversations, mixKey) {
  const t = split(total, MIX[mixKey]);
  // Codex/opencode-style: reasoning is a subset of output (informational)
  const reasoningIncluded = source === "codex";
  const total_tokens = t.input_tokens + t.output_tokens + t.cached_input_tokens + t.cache_creation_input_tokens
    + (reasoningIncluded ? 0 : t.reasoning_output_tokens);
  const row = {
    source, model, hour_start: hourStart, ...t, total_tokens, billable_total_tokens: total_tokens,
    total_cost_usd: 0, conversation_count: conversations,
  };
  rows.push(row);
  return row;
}

for (let d = new Date(START); d <= END; d = new Date(d.getTime() + 86400000)) {
  const local = dayStr(d);
  if (OFF_DAYS.has(local)) continue;
  const dow = new Date(local + "T12:00:00Z").getUTCDay();
  const weekend = dow === 0 || dow === 6;
  if (weekend && rnd() < 0.45) continue;
  // intensity ramps up over months (more agentic work), with day-to-day noise
  const monthIdx = (d - START) / (30 * 86400000);
  const intensity = (0.55 + monthIdx * 0.12) * (weekend ? 0.35 : 1) * logn(0, 0.45);
  const off = ptOffsetHours(new Date(local + "T12:00:00Z"));

  // Working sessions in local half-hour slots
  const slots = new Set();
  const startSlot = 17 + Math.floor(rnd() * 4); // 8:30–10:00
  const endSlot = 34 + Math.floor(rnd() * 6);    // 17:00–19:30
  for (let s = startSlot; s <= endSlot; s++) {
    if (s >= 24 && s <= 25 && rnd() < 0.7) continue; // lunch
    if (rnd() < 0.72) slots.add(s);
  }
  if (rnd() < 0.3) for (let s = 42; s < 42 + 2 + Math.floor(rnd() * 5); s++) slots.add(s); // late night 21:00+
  if (weekend) for (const s of [...slots]) if (rnd() < 0.5) slots.delete(s);

  const useCodex = rnd() < (dayStr(d) > "2026-08-01" ? 0.7 : 0.5);
  const useCursor = !weekend && rnd() < (dayStr(d) < "2026-09-01" ? 0.55 : 0.3);
  const useGemini = rnd() < (dayStr(d) > "2026-10-20" ? 0.35 : 0.12);
  const useOpencode = (dayStr(d) >= "2026-08-10" && dayStr(d) <= "2026-08-28") ? rnd() < 0.8 : rnd() < 0.08;

  for (const s of [...slots].sort((a, b) => a - b)) {
    const utc = new Date(Date.parse(local + "T00:00:00Z") + (s * 30 + off * 60) * 60000);
    const hs = utc.toISOString().replace(".000Z", "Z");
    if (utc > END) continue;
    // Claude Code — primary tool
    if (rnd() < 0.88) {
      const cm = claudeModels(d);
      const main = weighted(cm.filter(([m]) => !/haiku/.test(m)).map(([m, w]) => [m, w]));
      const total = Math.round(1.6e6 * intensity * logn(0, 0.6));
      const r = emit("claude", main, hs, total, 1 + Math.floor(rnd() * 3), "claude");
      if (rnd() < 0.55) {
        const haiku = cm.find(([m]) => /haiku/.test(m))[0];
        emit("claude", haiku, hs, Math.round(total * 0.06 * logn(0, 0.4)), 1, "claude");
      }
      if (rnd() < 0.82) {
        const p = weighted(PROJECTS.filter((x) => x.from <= local).map((x) => [x, x.w]));
        projectRows.push({ ...r, project_ref: p.ref, project_key: projectKey(p.ref) });
      }
    }
    if (useCodex && rnd() < 0.45) {
      const total = Math.round(0.9e6 * intensity * logn(0, 0.7));
      const r = emit("codex", weighted(codexModels(d)), hs, total, 1 + Math.floor(rnd() * 2), "codex");
      if (rnd() < 0.7) {
        const p = weighted(PROJECTS.filter((x) => x.from <= local).map((x) => [x, x.w]));
        projectRows.push({ ...r, project_ref: p.ref, project_key: projectKey(p.ref) });
      }
    }
    if (useCursor && rnd() < 0.4) emit("cursor", weighted(cursorModels(d)), hs, Math.round(0.35e6 * intensity * logn(0, 0.6)), 1, "cursor");
    if (useGemini && rnd() < 0.3) emit("gemini", weighted(geminiModels(d)), hs, Math.round(0.5e6 * intensity * logn(0, 0.7)), 1, "gemini");
    if (useOpencode && rnd() < 0.5) emit("opencode", weighted(opencodeModels(d)), hs, Math.round(0.6e6 * intensity * logn(0, 0.6)), 1, "opencode");
  }
}

// Real queues are append-only: some buckets were re-written later with grown totals.
const rewrites = [];
for (let i = 0; i < 60; i++) {
  const r = rows[Math.floor(rnd() * rows.length)];
  const grow = 1.05 + rnd() * 0.3;
  const g = { ...r };
  for (const k of ["input_tokens", "output_tokens", "cached_input_tokens", "cache_creation_input_tokens", "reasoning_output_tokens"]) g[k] = Math.round(r[k] * grow);
  g.total_tokens = g.input_tokens + g.output_tokens + g.cached_input_tokens + g.cache_creation_input_tokens + (r.source === "codex" ? 0 : g.reasoning_output_tokens);
  g.billable_total_tokens = g.total_tokens;
  g.conversation_count = r.conversation_count + 1;
  rewrites.push(g);
}

const shiftIso = (iso) => new Date(Date.parse(iso) + SHIFT_MS).toISOString().replace(".000Z", "Z");
for (const list of [rows, rewrites, projectRows]) {
  for (const r of list) r.hour_start = shiftIso(r.hour_start);
  for (let i = list.length - 1; i >= 0; i--) if (Date.parse(list[i].hour_start) > REAL_NOW.getTime()) list.splice(i, 1);
}
const dir = path.join(home, ".tokentracker", "tracker");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "queue.jsonl"), [...rows, ...rewrites].map((r) => JSON.stringify(r)).join("\n") + "\n");
fs.writeFileSync(path.join(dir, "project.queue.jsonl"), projectRows.map((r) => {
  const { model, ...rest } = r; // project rows carry no model
  return JSON.stringify({ project_ref: rest.project_ref, project_key: rest.project_key, source: rest.source, hour_start: rest.hour_start,
    input_tokens: rest.input_tokens, cached_input_tokens: rest.cached_input_tokens, cache_creation_input_tokens: rest.cache_creation_input_tokens,
    output_tokens: rest.output_tokens, reasoning_output_tokens: rest.reasoning_output_tokens, total_tokens: rest.total_tokens,
    billable_total_tokens: rest.billable_total_tokens, total_cost_usd: 0, conversation_count: rest.conversation_count });
}).join("\n") + "\n");
const sum = rows.reduce((s, r) => s + r.total_tokens, 0);
console.log(`queue rows=${rows.length + rewrites.length} project rows=${projectRows.length} total_tokens=${(sum / 1e9).toFixed(2)}B`);
