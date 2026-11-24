#!/usr/bin/env node
// Installs node_modules exactly as described by an npm v1 package-lock.json,
// downloading each "resolved" tarball with curl (retrying) and verifying its
// integrity. Used because the sandbox's registry proxy aborts large packument
// responses, which makes `npm ci` / `yarn` fail. Versions are identical to the lockfile.
// usage: node install-from-lock.js <projectDir> [skipPkg,...]
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawn } = require("child_process");

const proj = path.resolve(process.argv[2]);
const skip = new Set((process.argv[3] || "fsevents").split(","));
const cacheDir = path.join(__dirname, "cache", "tarballs");
fs.mkdirSync(cacheDir, { recursive: true });
const lock = require(path.join(proj, "package-lock.json"));

const jobs = [];
(function walk(deps, base) {
  for (const [name, v] of Object.entries(deps || {})) {
    if (skip.has(name) || v.bundled || !v.resolved) continue;
    const dest = path.join(base, "node_modules", name);
    jobs.push({ name, dest, url: v.resolved, integrity: v.integrity });
    walk(v.dependencies, dest);
  }
})(lock.dependencies, proj);

function check(file, integrity) {
  if (!integrity) return true;
  const [alg, b64] = integrity.split(" ")[0].split(/-(.*)/s);
  return crypto.createHash(alg).update(fs.readFileSync(file)).digest("base64") === b64;
}

function download(job) {
  const file = path.join(cacheDir, crypto.createHash("md5").update(job.url).digest("hex") + ".tgz");
  job.file = file;
  if (fs.existsSync(file) && check(file, job.integrity)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let tries = 0;
    const go = () => {
      tries++;
      const p = spawn("curl", ["-sSfL", "--retry", "5", "--retry-all-errors", "-o", file, job.url]);
      p.on("exit", code => {
        if (code === 0 && check(file, job.integrity)) return resolve();
        if (tries < 8) return setTimeout(go, 500);
        reject(new Error("download failed " + job.url));
      });
    };
    go();
  });
}

(async () => {
  let i = 0, done = 0;
  const workers = Array.from({ length: 12 }, async () => {
    while (i < jobs.length) {
      const job = jobs[i++];
      await download(job);
      if (++done % 100 === 0) console.log(`downloaded ${done}/${jobs.length}`);
    }
  });
  await Promise.all(workers);
  for (const job of jobs) {
    fs.rmSync(job.dest, { recursive: true, force: true });
    fs.mkdirSync(job.dest, { recursive: true });
    // sandbox forbids writing some editor/git metadata files (.idea, .gitmodules); they're irrelevant at runtime
    try {
      execFileSync("tar", ["-xzf", job.file, "--exclude=.gitmodules", "--exclude=.git", "--exclude=.idea", "--exclude=.vscode", "-C", job.dest, "--strip-components=1"], { stdio: "pipe" });
    } catch (e) {
      if (!fs.existsSync(path.join(job.dest, "package.json"))) throw e;
      console.warn("partial extract (ignored):", job.name, String(e.stderr).trim().split("\n")[0]);
    }
  }
  // .bin links for top-level packages
  const binDir = path.join(proj, "node_modules", ".bin");
  fs.mkdirSync(binDir, { recursive: true });
  for (const job of jobs) {
    if (path.dirname(job.dest) !== path.join(proj, "node_modules") && path.dirname(path.dirname(job.dest)) !== path.join(proj, "node_modules")) continue;
    const pj = JSON.parse(fs.readFileSync(path.join(job.dest, "package.json"), "utf8"));
    let bin = pj.bin;
    if (typeof bin === "string") bin = { [pj.name.split("/").pop()]: bin };
    for (const [b, rel] of Object.entries(bin || {})) {
      const target = path.join(job.dest, rel);
      const link = path.join(binDir, b);
      try { fs.unlinkSync(link); } catch (e) {}
      fs.symlinkSync(path.relative(binDir, target), link);
      try { fs.chmodSync(target, 0o755); } catch (e) {}
    }
  }
  console.log(`installed ${jobs.length} packages into ${proj}/node_modules`);
})().catch(e => { console.error(e); process.exit(1); });
