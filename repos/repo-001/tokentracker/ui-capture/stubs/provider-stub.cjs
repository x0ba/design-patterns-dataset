// Preloaded into the TokenTracker server (`node --require`), i.e. the stub sits
// at the integration boundary between the CLI and the outside world:
//
//  * macOS Keychain: `/usr/bin/security find-generic-password -s "Claude Code-credentials"`
//    returns a placeholder Claude Code OAuth payload (Max plan) instead of
//    touching the real Keychain. Every other Keychain lookup reports "not found".
//  * fetch(): the provider usage endpoints the Limits panel polls are answered
//    locally with realistic bodies (Claude /api/oauth/usage, ChatGPT
//    /backend-api/wham/usage). Any other non-localhost request fails fast like
//    an offline network, so nothing leaves the machine.
"use strict";
const cp = require("node:child_process");

const HOUR = 3600e3;
const iso = (ms) => new Date(ms).toISOString();
// Stable within a 5h/7d cycle so repeated polls look consistent.
function cycle(lengthMs, anchorMs) {
  const now = Date.now();
  const start = anchorMs + Math.floor((now - anchorMs) / lengthMs) * lengthMs;
  return { start, end: start + lengthMs, frac: (now - start) / lengthMs };
}

const realSpawnSync = cp.spawnSync;
cp.spawnSync = function stubbedSpawnSync(cmd, args, opts) {
  if (cmd === "/usr/bin/security") {
    const svcIdx = Array.isArray(args) ? args.indexOf("-s") : -1;
    const service = svcIdx >= 0 ? args[svcIdx + 1] : "";
    if (service === "Claude Code-credentials") {
      const payload = JSON.stringify({
        claudeAiOauth: {
          accessToken: "sk-ant-oat01-local-placeholder-token",
          refreshToken: "sk-ant-ort01-local-placeholder-refresh",
          expiresAt: Date.now() + 6 * HOUR,
          scopes: ["user:inference", "user:profile", "user:sessions:claude_code"],
          subscriptionType: "max",
          rateLimitTier: "default_claude_max_20x",
        },
      });
      return { pid: 0, status: 0, signal: null, stdout: payload + "\n", stderr: "", output: [null, payload, ""] };
    }
    return { pid: 0, status: 44, signal: null, stdout: "", stderr: "", output: [null, "", ""] };
  }
  return realSpawnSync.apply(this, arguments);
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function claudeUsage() {
  const five = cycle(5 * HOUR, Date.parse("2026-05-11T15:00:00Z"));
  const week = cycle(7 * 24 * HOUR, Date.parse("2026-05-14T17:00:00Z"));
  const fiveUtil = Math.round(12 + five.frac * 46);
  const weekUtil = Math.round(18 + week.frac * 49);
  return {
    five_hour: { utilization: fiveUtil, resets_at: iso(five.end) },
    seven_day: { utilization: weekUtil, resets_at: iso(week.end) },
    seven_day_oauth_apps: null,
    seven_day_opus: null,
    limits: [
      { kind: "weekly_scoped", scope: { model: { id: "sonnet", display_name: "Sonnet" } }, percent: Math.round(weekUtil * 0.31), resets_at: iso(week.end) },
    ],
    extra_usage: { is_enabled: false, monthly_limit: null, used_credits: null, utilization: null },
  };
}

function codexUsage() {
  const five = cycle(5 * HOUR, Date.parse("2026-05-11T16:20:00Z"));
  const week = cycle(7 * 24 * HOUR, Date.parse("2026-05-12T03:10:00Z"));
  const now = Date.now();
  return {
    plan_type: "pro",
    rate_limit: {
      allowed: true,
      limit_reached: false,
      primary_window: { used_percent: Math.round(6 + five.frac * 30), limit_window_seconds: 18000, reset_after_seconds: Math.round((five.end - now) / 1000), reset_at: Math.round(five.end / 1000) },
      secondary_window: { used_percent: Math.round(11 + week.frac * 38), limit_window_seconds: 604800, reset_after_seconds: Math.round((week.end - now) / 1000), reset_at: Math.round(week.end / 1000) },
    },
    credits: { has_credits: false, unlimited: false, balance: "0" },
  };
}

// InsForge (the optional cloud-account backend). The local server proxies the
// browser's /api/auth/* calls to it. On every page load the SDK tries to restore
// a session via POST /api/auth/refresh; this user has never signed in to the
// optional cloud, so answer "no session" (no access token, no user) — the SDK's
// signed-out path — instead of a network failure that the proxy turns into 502.
const INSFORGE_HOSTS = new Set(["srctyff5.us-east.insforge.app"]);
function insforgeAuth(url) {
  if (url.pathname === "/api/auth/refresh") return jsonResponse({ accessToken: null, user: null, csrfToken: null });
  if (url.pathname.startsWith("/api/auth/")) return jsonResponse({ error: "AUTH_UNAUTHORIZED", message: "No active session", statusCode: 401 }, 401);
  return null;
}

const realFetch = globalThis.fetch;
globalThis.fetch = async function stubbedFetch(input, init) {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") return realFetch(input, init);
  if (INSFORGE_HOSTS.has(url.hostname)) {
    const res = insforgeAuth(url);
    if (res) return res;
  }
  if (url.hostname === "api.anthropic.com" && url.pathname === "/api/oauth/usage") return jsonResponse(claudeUsage());
  if (url.hostname === "chatgpt.com" && url.pathname === "/backend-api/wham/usage") return jsonResponse(codexUsage());
  if (url.hostname === "chatgpt.com" && url.pathname === "/backend-api/wham/rate-limit-reset-credits") return jsonResponse({ detail: "Not Found" }, 404);
  const err = new TypeError("fetch failed");
  err.cause = Object.assign(new Error(`getaddrinfo ENOTFOUND ${url.hostname}`), { code: "ENOTFOUND" });
  throw err;
};

// Vercel Web Analytics / Speed Insights. The dashboard's <Analytics/> and
// <SpeedInsights/> components inject /_vercel/insights/script.js and
// /_vercel/speed-insights/script.js, which only exist on Vercel's edge. Serve
// small local stand-ins (they drain the va/si command queues and send nothing
// off-machine) plus no-op beacon endpoints, from the tracker's own HTTP server.
const http = require("node:http");
const VERCEL_STUB_SCRIPTS = {
  "/_vercel/insights/script.js":
    "/* local stand-in for Vercel Web Analytics */(function(){var w=window;w.va=w.va||function(){(w.vaq=w.vaq||[]).push(arguments)};var q=w.vaq||[];w.vaq=[];q.length=0;w.va=function(){};})();\n",
  "/_vercel/speed-insights/script.js":
    "/* local stand-in for Vercel Speed Insights */(function(){var w=window;w.si=w.si||function(){(w.siq=w.siq||[]).push(arguments)};var q=w.siq||[];w.siq=[];q.length=0;w.si=function(){};})();\n",
};
function vercelStub(req, res) {
  const pathname = String(req.url || "/").split("?")[0];
  if (!pathname.startsWith("/_vercel/")) return false;
  const script = VERCEL_STUB_SCRIPTS[pathname];
  if (script) {
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600" });
    res.end(req.method === "HEAD" ? undefined : script);
    return true;
  }
  // Beacon endpoints (/_vercel/insights/view|event|session, /_vercel/speed-insights/vitals)
  req.resume();
  res.writeHead(204);
  res.end();
  return true;
}
const realCreateServer = http.createServer;
http.createServer = function stubbedCreateServer(...args) {
  const i = args.findIndex((a) => typeof a === "function");
  if (i >= 0) {
    const listener = args[i];
    args[i] = function vercelAwareListener(req, res) {
      if (vercelStub(req, res)) return undefined;
      return listener.call(this, req, res);
    };
  }
  return realCreateServer.apply(this, args);
};
