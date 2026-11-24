// Generates the seeded "established user" data set consumed by the local
// Tauri IPC mock backend (.ui-capture/mock/tauri-backend.ts).
// Output: .ui-capture/mock/seed-data.json
// Data mirrors the on-disk ApiArk shapes (CollectionNode, RequestFile,
// EnvironmentData, HistoryEntry, MonitorStatus ...) the Rust backend returns.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTIONS } from "./collections.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const HOME = "/Users/dana.okafor";
const NOW = new Date("2026-11-16T15:42:00Z").getTime();

// deterministic PRNG
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rand() * a.length)];
const between = (a, b) => Math.floor(a + rand() * (b - a + 1));

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function buildCollection(def) {
  const root = def.path.replace("~", HOME);
  const files = {};
  const responses = {};
  const requests = []; // flat list for history/runner
  function walk(items, dir) {
    return items.map((it) => {
      if (it.folder) {
        const p = `${dir}/${slug(it.folder)}`;
        return { type: "folder", name: it.folder, path: p, children: walk(it.items, p) };
      }
      const p = `${dir}/${slug(it.name)}.yaml`;
      const file = { name: it.name, method: it.method, url: it.url, headers: it.headers || {} };
      for (const k of ["protocol", "description", "auth", "body", "params", "assert", "tests", "preRequestScript", "postResponseScript", "cookies"]) {
        if (it[k] !== undefined) file[k] = it[k];
      }
      if (file.body && typeof file.body.content !== "string") {
        file.body = { type: file.body.type, content: JSON.stringify(file.body.content, null, 2) };
      }
      files[p] = file;
      if (it.response) responses[p] = it.response;
      requests.push({ path: p, name: it.name, method: it.method, url: it.url, folder: dir, response: it.response });
      const node = { type: "request", name: it.name, method: it.method, path: p };
      if (it.protocol === "graphql") node.isGraphql = true;
      if (it.protocol) node.protocol = it.protocol;
      return node;
    });
  }
  const tree = { type: "collection", name: def.name, path: root, children: walk(def.items, root) };
  return {
    path: root,
    name: def.name,
    defaults: def.defaults || { sendCookies: true, storeCookies: true, persistCookies: false },
    tree,
    files,
    responses,
    requests,
    environments: def.environments,
    dotenv: def.dotenv || {},
    cookies: def.cookies || [],
    git: def.git || null,
  };
}

const collections = COLLECTIONS.map(buildCollection);
const byName = (n) => collections.findIndex((c) => c.name === n);
const GH = byName("GitHub REST"), FLEET = byName("Fleet Tracking Service");

// ── History: ~4 months of requests, denser on weekdays and recent weeks ──
const history = [];
let hid = 1;
const allReqs = collections.flatMap((c) =>
  c.requests.filter((r) => (!r.protocol || r.protocol === "http") && r.url && !r.name.startsWith("copy of")).map((r) => ({ ...r, c })),
);
const weights = allReqs.map((r) => (r.c.name.startsWith("Ledgerly") ? 5 : r.c.name.startsWith("GitHub") ? 2 : 1));
const totalW = weights.reduce((a, b) => a + b, 0);
function weightedReq() {
  let x = rand() * totalW;
  for (let i = 0; i < allReqs.length; i++) { x -= weights[i]; if (x <= 0) return allReqs[i]; }
  return allReqs[0];
}
function resolveUrl(url, c, envIdx) {
  const env = c.environments[Math.min(envIdx, c.environments.length - 1)];
  return url.replace(/\{\{(\w+)\}\}/g, (m, k) => env?.variables[k] ?? m);
}
const statusTextMap = { 200: "OK", 201: "Created", 202: "Accepted", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict", 422: "Unprocessable Entity", 429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable" };
for (let day = 125; day >= 0; day--) {
  const t0 = NOW - day * 86400000;
  const dow = new Date(t0).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  const n = weekend ? between(0, 2) : between(day < 30 ? 3 : 1, day < 30 ? 9 : 5);
  for (let i = 0; i < n; i++) {
    const r = weightedReq();
    const ts = t0 - between(0, 9 * 3600) * 1000 - (day === 0 ? 0 : 3600000 * 2);
    if (ts > NOW) continue;
    const baseStatus = r.response?.status ?? (r.method === "POST" ? 201 : 200);
    const roll = rand();
    let status = baseStatus;
    if (roll < 0.06) status = pick([401, 422, 404, 400]);
    else if (roll < 0.09) status = pick([500, 502, 503, 429]);
    const envIdx = rand() < 0.65 ? 0 : rand() < 0.8 ? 1 : 2;
    const url = resolveUrl(r.url, r.c, envIdx);
    const failedNet = rand() < 0.015;
    history.push({
      id: 0,
      method: r.method,
      url,
      status: failedNet ? undefined : status,
      statusText: failedNet ? undefined : statusTextMap[status],
      timeMs: failedNet ? undefined : between(38, status >= 500 ? 2400 : 680),
      sizeBytes: failedNet ? undefined : status === 204 ? 0 : between(180, 14800),
      timestamp: new Date(ts).toISOString(),
      collectionPath: r.c.path,
      requestName: r.name,
      requestJson: JSON.stringify({ method: r.method, url, headers: [], params: [], followRedirects: true, verifySsl: true }),
    });
  }
}
// a few ad-hoc (unsaved) requests
const adhoc = [
  ["GET", "https://httpbin.org/anything?probe=1"],
  ["GET", "http://localhost:8080/healthz"],
  ["POST", "https://hooks.slack.com/services/T024F/B07QK/xxxxxxxx"],
  ["GET", "https://api.exchangerate.host/latest?base=USD&symbols=EUR,GBP,NGN"],
  ["GET", "http://localhost:4000/graphql?query=%7B__typename%7D"],
  ["HEAD", "https://cdn.ledgerly.io/assets/receipt-template-v3.html"],
];
for (const [m, u] of adhoc) {
  history.push({ id: 0, method: m, url: u, status: 200, statusText: "OK", timeMs: between(60, 400), sizeBytes: between(90, 3000),
    timestamp: new Date(NOW - between(1, 60) * 86400000 - between(0, 30000) * 1000).toISOString(), requestJson: JSON.stringify({ method: m, url: u, headers: [], params: [], followRedirects: true, verifySsl: true }) });
}
history.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
history.forEach((h) => (h.id = hid++));
history.reverse().forEach((h, i) => (h.id = i + 1));
history.reverse();

// ── Monitors ──
const ledger = collections[0];
const monitors = [
  { id: "mon-7f3a1c", name: "Payments API smoke (prod)", collectionPath: ledger.path, cronExpression: "*/15 * * * *", enabled: true, failEvery: 37 },
  { id: "mon-2b91de", name: "Webhook delivery canary", collectionPath: ledger.path, cronExpression: "0 * * * *", enabled: true, failEvery: 9 },
  { id: "mon-c4e802", name: "Nightly refunds regression (staging)", collectionPath: ledger.path, cronExpression: "30 2 * * *", enabled: true, failEvery: 6 },
  { id: "mon-91aa0f", name: "Fleet telemetry uptime", collectionPath: collections[FLEET].path, cronExpression: "*/5 * * * *", enabled: false, failEvery: 14 },
  { id: "mon-5d0e77", name: "GitHub rate-limit watch", collectionPath: collections[GH].path, cronExpression: "0 9 * * 1-5", enabled: true, failEvery: 1000 },
];
const monitorResults = {};
let mrid = 1;
for (const m of monitors) {
  const results = [];
  const stepMin = m.cronExpression.startsWith("*/15") ? 15 : m.cronExpression.startsWith("*/5") ? 5 : m.cronExpression.startsWith("0 *") ? 60 : 1440;
  const endOffset = m.enabled ? 0 : 19 * 86400000;
  for (let i = 0; i < 40; i++) {
    const ts = NOW - endOffset - i * stepMin * 60000 - between(0, 40) * 1000;
    const total = m.id === "mon-c4e802" ? 18 : m.id === "mon-2b91de" ? 4 : 7;
    const fail = i % m.failEvery === 3 ? between(1, 2) : 0;
    results.push({ id: mrid++, monitorId: m.id, timestamp: new Date(ts).toISOString(), totalRequests: total, totalPassed: total - fail, totalFailed: fail,
      totalTimeMs: between(total * 90, total * 260), status: fail ? "failed" : "passed", error: fail ? pick(["POST /v1/refunds → expected 201, got 502", "Assertion failed: $.data.status eq \"succeeded\" (got \"pending\")", "Request timed out after 30000ms"]) : undefined });
  }
  monitorResults[m.id] = results;
  m.lastRun = results[0].timestamp;
  m.lastStatus = results[0].status;
  m.runCount = { "mon-7f3a1c": 8412, "mon-2b91de": 2093, "mon-c4e802": 88, "mon-91aa0f": 21540, "mon-5d0e77": 61 }[m.id];
  delete m.failEvery;
}

// ── Audit log ──
const auditActions = [
  ["request.save", (r) => r.path, () => ""],
  ["request.send", (r) => `${r.method} ${r.name}`, () => ""],
  ["environment.update", () => "Staging", () => "Updated variable apiVersion"],
  ["collection.open", (r) => r.c.path, () => ""],
  ["collection.run", (r) => r.c.name, () => `${between(6, 24)} requests, ${between(0, 2)} failed`],
  ["git.commit", (r) => r.c.path, () => pick(["Add refund partial capture cases", "Fix idempotency header on payouts", "Tidy webhook folder", "Bump apiVersion to 2026-09-01"])],
  ["export", (r) => r.c.name, () => pick(["postman", "openapi"])],
];
const audit = [];
for (let i = 0; i < 140; i++) {
  const r = weightedReq();
  const [action, tgt, det] = pick(auditActions);
  audit.push({ id: 0, action, target: tgt(r), detail: det(r), timestamp: new Date(NOW - i * between(1, 14) * 3600000 - between(0, 3000) * 1000).toISOString() });
}
audit.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).forEach((a, i) => (a.id = 140 - i));

// ── Trash ──
const trash = [
  { name: "refund-legacy-v1.yaml", collectionName: "Ledgerly Payments API", trashPath: `${HOME}/.apiark/trash/1730220011-refund-legacy-v1.yaml`, deletedAt: "2026-10-29T16:20:11Z", isFolder: false },
  { name: "sandbox-experiments", collectionName: "Ledgerly Payments API", trashPath: `${HOME}/.apiark/trash/1729001100-sandbox-experiments`, deletedAt: "2026-10-15T09:25:00Z", isFolder: true },
  { name: "copy-of-list-repos.yaml", collectionName: "GitHub REST", trashPath: `${HOME}/.apiark/trash/1731400000-copy-of-list-repos.yaml`, deletedAt: "2026-11-12T08:13:20Z", isFolder: false },
  { name: "untitled-request.yaml", collectionName: "Fleet Tracking Service", trashPath: `${HOME}/.apiark/trash/1731500000-untitled-request.yaml`, deletedAt: "2026-11-13T12:00:00Z", isFolder: false },
];

// ── Plugins ──
const plugins = [
  { manifest: { name: "hmac-signer", version: "1.3.0", description: "Signs outgoing requests with an HMAC-SHA256 X-Signature header using a key from the active environment.", author: "Dana Okafor", runtime: "js", entry: "index.js", hooks: ["beforeRequest"] }, path: `${HOME}/.apiark/plugins/hmac-signer`, enabled: true },
  { manifest: { name: "jwt-inspector", version: "0.9.2", description: "Decodes JWTs found in response bodies and adds expiry info to the console.", author: "apiark-community", runtime: "js", entry: "main.js", hooks: ["afterResponse"] }, path: `${HOME}/.apiark/plugins/jwt-inspector`, enabled: true },
  { manifest: { name: "faker-vars", version: "2.0.1", description: "Adds {{$faker.*}} dynamic variables (names, IBANs, addresses) for test data.", author: "Kenji Watanabe", runtime: "wasm", entry: "faker_vars.wasm", hooks: ["resolveVariable"] }, path: `${HOME}/.apiark/plugins/faker-vars`, enabled: false },
];

// ── Proxy captures ──
const proxyCaptures = [];
const capHosts = ["api.ledgerly.dev", "staging-api.ledgerly.io", "telemetry.fleetline.internal", "api.github.com"];
const capPaths = ["/v1/customers?limit=20", "/v1/invoices/inv_8KX2", "/v1/payments", "/v2/vehicles/positions", "/repos/ledgerly/payments-core/pulls", "/v1/webhook_endpoints", "/v1/balance"];
for (let i = 0; i < 24; i++) {
  const p = pick(capPaths);
  const m = p === "/v1/payments" ? "POST" : "GET";
  const st = rand() < 0.1 ? 401 : m === "POST" ? 201 : 200;
  proxyCaptures.push({ id: `cap-${1000 + i}`, method: m, url: `https://${pick(capHosts)}${p}`, requestHeaders: { "user-agent": "Ledgerly-iOS/5.12.0 (iPhone; iOS 19.1)", accept: "application/json" },
    requestBody: m === "POST" ? JSON.stringify({ amount: between(500, 90000), currency: "usd", customer: "cus_Q8f2LmA0" }) : null, status: st,
    responseHeaders: { "content-type": "application/json", "x-request-id": `req_${Math.floor(rand() * 1e12).toString(36)}` },
    responseBody: st === 401 ? '{"error":{"type":"auth_error","message":"Token expired"}}' : '{"object":"list","data":[...],"has_more":true}',
    timeMs: between(40, 900), timestamp: new Date(NOW - (24 - i) * 47000).toISOString() });
}

const settings = {
  theme: "dark", accentColor: "indigo", proxyUrl: null, proxyUsername: null, proxyPassword: null, verifySsl: true, followRedirects: true,
  timeoutMs: 30000, sidebarWidth: 300, onboardingComplete: true, crashReportsEnabled: false, caCertPath: null, clientCertPath: null,
  clientKeyPath: null, clientCertPassphrase: null, updateChannel: "stable", aiEndpoint: "https://api.openai.com/v1/chat/completions",
  aiApiKey: "sk-placeholder-local-stub", aiModel: "gpt-4o-mini", panelRatio: 0.5, layout: "horizontal",
};

// Open tabs the user had last session
const f = (c, needle) => Object.keys(collections[c].files).find((p) => p.includes(needle));
const openTabs = [
  [0, "payments/create-payment-intent"],
  [0, "refunds/create-partial-refund"],
  [0, "customers/list-customers"],
  [GH, "pulls/list-open-pull-requests"],
  [FLEET, "graphql/vehicle-with-last-trips"],
].map(([c, n]) => ({ filePath: f(c, n), collectionPath: collections[c].path })).filter((t) => t.filePath);
const persistedState = { tabs: openTabs, activeTabIndex: 0, collections: collections.map((c) => c.path) };

const out = { home: HOME, now: new Date(NOW).toISOString(), collections, history, monitors, monitorResults, audit, trash, plugins, proxyCaptures, settings, persistedState,
  mockServers: [{ id: "mock-ledgerly-4010", collectionName: "Ledgerly Payments API", port: 4010, running: true,
    endpoints: Object.entries(collections[0].files).filter(([p]) => collections[0].responses[p]).slice(0, 22).map(([p, f]) => ({ method: f.method,
      path: f.url.replace("{{baseUrl}}", "").replace(/\{\{(\w+)\}\}/g, ":$1").split("?")[0] || "/", status: collections[0].responses[p].status,
      body: typeof collections[0].responses[p].body === "string" ? collections[0].responses[p].body : JSON.stringify(collections[0].responses[p].body, null, 2),
      contentType: collections[0].responses[p].headers["content-type"] })) }] };
const outPath = join(here, "..", "mock", "seed-data.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`wrote ${outPath}: ${collections.map((c) => `${c.name}=${c.requests.length}`).join(", ")}; history=${history.length}; audit=${audit.length}`);
