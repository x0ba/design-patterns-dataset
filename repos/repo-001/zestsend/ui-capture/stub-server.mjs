// Front server on the public port ($PORT, 4442). It answers the local
// stand-ins for ZestSend's external services under /__stubs/ and forwards
// everything else (HTTP and WebSocket upgrades) to the app (`vite preview`
// on the internal $APP_PORT).
//
//  /__stubs/insightflare/...  InsightFlare analytics (insight.ravelloh.com): a
//      compatible script.js exposing window.insightflare.track/trackOnce;
//      events are recorded locally (GET /__stubs/insightflare/api/events).
//  /__stubs/turn/v1/turn/keys/:keyId/credentials/generate-ice-servers
//      Cloudflare Realtime TURN API (rtc.live.cloudflare.com). Called by the
//      Worker's /api/turn/credentials. Issues short-lived credentials for a real
//      local STUN/TURN server (node-turn) on UDP 127.0.0.1:$TURN_PORT.
import { randomBytes } from "node:crypto";
import { createServer, request as httpRequest, Agent } from "node:http";
import { createRequire } from "node:module";
import { connect } from "node:net";

const port = Number(process.env.PORT ?? 4442);
const appPort = Number(process.env.APP_PORT);
const turnPort = Number(process.env.TURN_PORT);
const turnKeyId = process.env.TURN_ID ?? "";
const turnToken = process.env.TURN_TOKEN ?? "";
if (!appPort || !turnPort) throw new Error("APP_PORT and TURN_PORT are required");
const events = [];

const Turn = createRequire(new URL("./peer/package.json", import.meta.url))("node-turn");
const turnServer = new Turn({
  authMech: "long-term",
  credentials: {},
  debugLevel: "OFF",
  listeningIps: ["127.0.0.1"],
  listeningPort: turnPort,
  realm: "turn.cloudflare.com",
  relayIps: ["127.0.0.1"],
});
turnServer.start();

function issueIceServers(ttl) {
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const username = `${expires}:${randomBytes(16).toString("hex")}`;
  const credential = randomBytes(20).toString("base64");
  turnServer.addUser(username, credential);
  setTimeout(() => turnServer.removeUser(username), ttl * 1000).unref();
  return {
    iceServers: [
      { urls: [`stun:127.0.0.1:${turnPort}`] },
      { urls: [`turn:127.0.0.1:${turnPort}?transport=udp`], username, credential },
    ],
  };
}

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => resolve(body));
  });
}

const analyticsScript = `(() => {
  const endpoint = "/__stubs/insightflare/api/event";
  const seen = new Set();
  const send = (name, data) => {
    try {
      fetch(endpoint, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, data: data ?? {}, path: location.pathname, at: Date.now() }) });
    } catch {}
  };
  window.insightflare = {
    track: (name, data) => send(name, data),
    trackOnce: (name, data) => { if (seen.has(name)) return; seen.add(name); send(name, data); },
  };
  send("pageview", { referrer: document.referrer });
})();`;

const json = { "Content-Type": "application/json" };

async function handleStub(request, response, pathname) {
  const turnRoute = pathname.match(/^\/__stubs\/turn\/v1\/turn\/keys\/([^/]+)\/credentials\/generate-ice-servers$/);
  if (turnRoute && request.method === "POST") {
    let body = null;
    try { body = JSON.parse((await readBody(request)) || "{}"); } catch { /* treated as defaults */ }
    if (decodeURIComponent(turnRoute[1]) !== turnKeyId || request.headers.authorization !== `Bearer ${turnToken}`) {
      response.writeHead(401, json).end(JSON.stringify({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }));
      return;
    }
    const ttl = Math.min(Math.max(Number(body?.ttl) || 86_400, 60), 172_800);
    response.writeHead(201, json).end(JSON.stringify(issueIceServers(ttl)));
    return;
  }
  if (pathname === "/__stubs/insightflare/script.js") {
    response.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache" }).end(analyticsScript);
    return;
  }
  if (pathname === "/__stubs/insightflare/api/event" && request.method === "POST") {
    try { events.push(JSON.parse(await readBody(request))); } catch { /* ignore malformed */ }
    if (events.length > 500) events.shift();
    response.writeHead(202, json).end('{"ok":true}');
    return;
  }
  if (pathname === "/__stubs/insightflare/api/events") {
    response.writeHead(200, json).end(JSON.stringify(events));
    return;
  }
  response.writeHead(404, json).end('{"error":"unknown stub route"}');
}

const agent = new Agent({ keepAlive: true });

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (pathname.startsWith("/__stubs/")) {
    void handleStub(request, response, pathname);
    return;
  }
  const upstream = httpRequest({ agent, headers: request.headers, host: "127.0.0.1", method: request.method, path: request.url, port: appPort }, (reply) => {
    response.writeHead(reply.statusCode ?? 502, reply.rawHeaders);
    reply.pipe(response);
  });
  upstream.on("error", () => { if (!response.headersSent) response.writeHead(502, json); response.end('{"error":"app not reachable"}'); });
  request.pipe(upstream);
});

server.on("upgrade", (request, socket, head) => {
  const upstream = connect(appPort, "127.0.0.1", () => {
    const lines = [`${request.method} ${request.url} HTTP/${request.httpVersion}`];
    for (let index = 0; index < request.rawHeaders.length; index += 2) lines.push(`${request.rawHeaders[index]}: ${request.rawHeaders[index + 1]}`);
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  const close = () => { upstream.destroy(); socket.destroy(); };
  upstream.on("error", close);
  socket.on("error", close);
});

server.on("error", (error) => { console.error(`[front] cannot listen on ${port}: ${error.message}`); process.exit(1); });
server.listen(port, () => console.log(`[front] http://localhost:${port} -> app :${appPort}; stubs under /__stubs/; STUN/TURN udp 127.0.0.1:${turnPort}`));
