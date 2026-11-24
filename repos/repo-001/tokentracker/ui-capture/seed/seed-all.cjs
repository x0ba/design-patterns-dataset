#!/usr/bin/env node
// Seeds a fake HOME with everything the TokenTracker local dashboard reads.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const home = path.resolve(process.argv[2] || path.join(__dirname, "..", "home"));
const tracker = path.join(home, ".tokentracker", "tracker");
fs.mkdirSync(tracker, { recursive: true });

// cursors.json present => `serve` skips first-run `init` (which would try to
// install hooks and run a first sync). Content mirrors a long-installed client.
const cursorsPath = path.join(tracker, "cursors.json");
if (!fs.existsSync(cursorsPath)) {
  fs.writeFileSync(cursorsPath, JSON.stringify({ version: 1, files: {}, updatedAt: new Date().toISOString() }, null, 2));
}

const scripts = fs.readdirSync(__dirname).filter((f) => /^gen-.*\.cjs$/.test(f)).sort();
for (const s of scripts) {
  execFileSync(process.execPath, [path.join(__dirname, s), home], { stdio: "inherit" });
}
