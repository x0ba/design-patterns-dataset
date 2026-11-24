// Production-mode equivalent of the repo's `npm run dev:all` (scripts/dev-supervisor.mjs):
//  - starts and supervises the app's local handoff API (server/index.ts, via the tsx loader;
//    the tsx CLI cannot open its IPC pipe in this sandbox),
//  - serves the Vite production build (dist/) on PORT and proxies /api to the API,
//  - answers the supervisor endpoints the UI polls (/api/dev/health, /api/dev/repair,
//    /api/dev/restart-*) with the same response shape as scripts/dev-supervisor.mjs,
//  - injects a first-visit bootstrap that seeds the app's IndexedDB local state.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { extname, join, resolve, sep } from "node:path";

const port = Number(process.env.PORT ?? 4473);
const apiPort = Number(process.env.IMAGE_COCKPIT_API_PORT ?? 4481);
const apiTarget = `http://127.0.0.1:${apiPort}`;
const distDir = resolve(process.env.UI_CAPTURE_DIST ?? "dist");
const seedDir = resolve(process.env.UI_CAPTURE_SEED_DIR ?? ".ui-capture/seed-web");
const handoffRoot = resolve(process.env.IMAGE_COCKPIT_HANDOFF_DIR ?? "codex-handoff");
const statusDir = join(handoffRoot, "status");
const apiScript = resolve("server", "index.ts");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// ---------------------------------------------------------------- API process supervision
const apiSlot = { name: "api", port: apiPort, child: null, pid: null, state: "starting", lastExitCode: null, lastSignal: null };
const uiSlot = { name: "vite", port, pid: process.pid, state: "running", lastExitCode: null, lastSignal: null };
let shuttingDown = false;

function startApi() {
  const child = spawn(process.execPath, ["--import", "tsx", apiScript], {
    cwd: process.cwd(),
    env: { ...process.env, IMAGE_COCKPIT_API_PORT: String(apiPort), IMAGE_COCKPIT_HANDOFF_DIR: handoffRoot },
    stdio: ["ignore", "inherit", "inherit"]
  });
  apiSlot.child = child;
  apiSlot.pid = child.pid ?? null;
  apiSlot.state = "running";
  child.on("exit", (code, signal) => {
    if (apiSlot.child !== child) return;
    apiSlot.state = shuttingDown ? "stopped" : "exited";
    apiSlot.lastExitCode = code;
    apiSlot.lastSignal = signal;
    apiSlot.pid = null;
  });
  child.on("error", () => {
    if (apiSlot.child === child) apiSlot.state = "failed";
  });
}

function isApiRunning() {
  return Boolean(apiSlot.child && apiSlot.pid && apiSlot.state === "running" && apiSlot.child.exitCode === null);
}

async function stopApi() {
  const child = apiSlot.child;
  if (!child || child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolveStop();
    }, 4000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveStop();
    });
    child.kill("SIGTERM");
  });
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function hasRunningCodexJobs() {
  try {
    for (const entry of await readdir(statusDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      try {
        const parsed = JSON.parse((await readFile(join(statusDir, entry.name), "utf8")).replace(/^﻿/, ""));
        if (parsed?.state === "running") return true;
      } catch {
        continue;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function processHealth(slot) {
  return { port: slot.port, pid: slot.pid, state: slot.state, lastExitCode: slot.lastExitCode, lastSignal: slot.lastSignal };
}

function buildHealth() {
  const mismatches = [];
  if (!isApiRunning()) mismatches.push(`API server is ${apiSlot.state}.`);
  if (!existsSync(join(distDir, "index.html"))) mismatches.push("Production build (dist/index.html) is missing.");
  return {
    app: "image-cockpit",
    role: "supervisor",
    devOnly: false,
    checkedAt: new Date().toISOString(),
    supervisor: { port, pid: process.pid, state: "running" },
    vite: processHealth(uiSlot),
    api: processHealth(apiSlot),
    apiTarget,
    handoffRoot,
    mismatches
  };
}

async function restartApi() {
  if (await hasRunningCodexJobs()) {
    return { ok: false, skipped: true, action: "restart-api", reason: "Running Codex job status was found; API restart was skipped.", health: buildHealth() };
  }
  await stopApi();
  startApi();
  const ok = await waitForHttp(`${apiTarget}/api/health`, 8000);
  return { ok, action: "restart-api", health: buildHealth() };
}

function restartUi() {
  // The UI is a static production build served by this process; there is nothing to rebuild.
  return { ok: true, action: "restart-vite", reason: "Static production build; UI server is already running.", health: buildHealth() };
}

async function repairCockpit() {
  const before = buildHealth();
  const actions = [];
  if (!isApiRunning()) {
    startApi();
    actions.push("started-api");
  }
  actions.push(restartUi().action);
  await waitForHttp(`${apiTarget}/api/health`, 8000);
  return { ok: true, action: "repair", actions, before, after: buildHealth() };
}

async function handleSupervisor(req, res, pathname) {
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };
  try {
    if (req.method === "GET" && pathname === "/api/dev/health") return send(200, buildHealth());
    if (req.method === "POST" && pathname === "/api/dev/repair") return send(200, await repairCockpit());
    if (req.method === "POST" && pathname === "/api/dev/restart-vite") return send(200, restartUi());
    if (req.method === "POST" && pathname === "/api/dev/restart-api") {
      const result = await restartApi();
      return send(result.skipped ? 409 : 200, result);
    }
    if (req.method === "POST" && pathname === "/api/dev/restart-all") {
      const api = await restartApi();
      const vite = restartUi();
      return send(api.skipped ? 409 : 200, { ok: !api.skipped && api.ok && vite.ok, action: "restart-all", api, vite, health: buildHealth() });
    }
    return send(404, { ok: false, error: "Not found" });
  } catch (error) {
    return send(500, { ok: false, error: error instanceof Error ? error.message : "Supervisor error" });
  }
}

// ---------------------------------------------------------------- static UI + API proxy
async function sendFile(res, file, extraHeaders = {}) {
  try {
    const info = await stat(file);
    if (!info.isFile()) return false;
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream", ...extraHeaders });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

function safeJoin(root, rel) {
  const full = resolve(join(root, rel));
  return full === root || full.startsWith(root + sep) ? full : null;
}

async function sendIndex(res) {
  let html = await readFile(join(distDir, "index.html"), "utf8");
  // Defer the app's module entry until the seed bootstrap has written local state.
  html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, (_m, src) =>
    `<script>window.__UI_CAPTURE_APP_ENTRY__=${JSON.stringify(src)};</script>` +
    `<script src="/__ui-capture/seed-bootstrap.js"></script>`
  );
  res.writeHead(200, { "Content-Type": mime[".html"], "Cache-Control": "no-store" });
  res.end(html);
}

function proxyApi(req, res) {
  const upstream = httpRequest(
    { host: "127.0.0.1", port: apiPort, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${apiPort}` } },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    }
  );
  upstream.on("error", (error) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `API unavailable: ${error.message}` }));
  });
  req.pipe(upstream);
}

startApi();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = decodeURIComponent(url.pathname);
  if (path.startsWith("/api/dev/")) return handleSupervisor(req, res, path);
  if (path.startsWith("/api/")) return proxyApi(req, res);
  if (path.startsWith("/__ui-capture/")) {
    const file = safeJoin(seedDir, path.slice("/__ui-capture/".length));
    if (file && (await sendFile(res, file, { "Cache-Control": "no-store" }))) return;
    res.writeHead(404);
    return res.end("not found");
  }
  if (path === "/" || path === "/index.html") return sendIndex(res);
  const file = safeJoin(distDir, path.slice(1));
  if (file && (await sendFile(res, file))) return;
  if (extname(path) && extname(path) !== ".html") {
    res.writeHead(404);
    return res.end("not found");
  }
  return sendIndex(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Image Cockpit UI on http://localhost:${port}/ (supervising API on ${apiTarget})`);
});

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close();
  void stopApi().finally(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
