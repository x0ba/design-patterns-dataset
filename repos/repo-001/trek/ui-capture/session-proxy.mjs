// Front door on $PUBLIC_PORT for the TREK server on 127.0.0.1:$APP_PORT.
//
// A real, established user opens TREK with a remembered session; a fresh browser has
// none, so the client's 401 interceptor hard-navigates to /login and cancels its other
// boot requests. This proxy signs the main seeded user in (TREK's own /api/auth/login,
// remember_me) and hands that session to any request that arrives without one: it adds
// the cookie upstream and sets it in the browser. Everything else, including WebSocket
// upgrades (/ws), is passed through unchanged.
//
// Requests that arrive while TREK is still booting are held until it answers, however
// long that takes, instead of failing with a 502.
import http from 'node:http';
import net from 'node:net';

const PUBLIC_PORT = Number(process.env.PUBLIC_PORT);
const APP_PORT = Number(process.env.APP_PORT);
const APP_HOST = '127.0.0.1';
const EMAIL = process.env.SESSION_EMAIL || 'maya@trek.local';
const PASSWORD = process.env.SESSION_PASSWORD || 'Wanderlust2026!';
const COOKIE = 'trek_session';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let token = null;

const hasSession = (cookieHeader) => (cookieHeader || '').split(';').some((c) => c.trim().startsWith(COOKIE + '=') && c.trim().length > COOKIE.length + 1);
const withSession = (cookieHeader) => (cookieHeader ? `${cookieHeader}; ` : '') + `${COOKIE}=${token}`;
const setCookie = () => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;

async function waitForApp() {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(`http://${APP_HOST}:${APP_PORT}/api/health/ready`);
      if (res.ok) return;
    } catch { /* not listening yet */ }
    if (i % 40 === 39) console.log(`[session-proxy] still waiting for TREK on ${APP_HOST}:${APP_PORT} ...`);
    await sleep(250);
  }
}

async function signIn() {
  await waitForApp();
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`http://${APP_HOST}:${APP_PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: `http://localhost:${PUBLIC_PORT}` },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD, remember_me: true }),
      });
      const m = (res.headers.getSetCookie?.() || []).join(';').match(new RegExp(`${COOKIE}=([^;]+)`));
      if (res.ok && m) { token = m[1]; break; }
      console.error(`[session-proxy] sign-in attempt ${attempt} failed: HTTP ${res.status}`);
    } catch (e) {
      console.error(`[session-proxy] sign-in attempt ${attempt} failed: ${e.message}`);
    }
    if (attempt >= 10) { console.error('[session-proxy] giving up on sign-in; serving without a session'); return; }
    await sleep(1000);
  }
  console.log(`[session-proxy] signed in as ${EMAIL}; serving http://localhost:${PUBLIC_PORT}/`);
}

function proxyHeaders(req) {
  const headers = { ...req.headers };
  if (token && !hasSession(headers.cookie)) headers.cookie = withSession(headers.cookie);
  return headers;
}

// Buffer the (small) request body so a refused connection can be retried.
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  const body = await readBody(req);
  const inject = token && !hasSession(req.headers.cookie);
  for (let attempt = 0; ; attempt++) {
    const outcome = await new Promise((resolve) => {
      const upstream = http.request({ host: APP_HOST, port: APP_PORT, method: req.method, path: req.url, headers: proxyHeaders(req) }, (up) => {
        const headers = { ...up.headers };
        // Leave a response that sets its own session (login/logout) alone.
        if (inject && !headers['set-cookie']) headers['set-cookie'] = [setCookie()];
        res.writeHead(up.statusCode, up.statusMessage, headers);
        up.pipe(res);
        up.on('end', () => resolve('done'));
        up.on('error', () => resolve('done'));
      });
      upstream.on('error', (e) => resolve(e));
      upstream.end(body);
    });
    if (outcome === 'done') return;
    // Connection refused/reset before any response: TREK is restarting or not up yet.
    if (attempt < 120 && !res.headersSent) { await sleep(500); continue; }
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`upstream error: ${outcome.message}`);
    return;
  }
}

function upgrade(req, socket, head) {
  const up = net.connect(APP_PORT, APP_HOST, () => {
    const headers = proxyHeaders(req);
    let raw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (const [k, v] of Object.entries(headers)) for (const vv of [].concat(v)) raw += `${k}: ${vv}\r\n`;
    up.write(raw + '\r\n');
    if (head?.length) up.write(head);
    up.pipe(socket); socket.pipe(up);
  });
  const close = () => { up.destroy(); socket.destroy(); };
  up.on('error', close); socket.on('error', close);
}

const ready = signIn();
const server = http.createServer((req, res) => {
  ready.then(() => handle(req, res)).catch((e) => { if (!res.headersSent) res.writeHead(502); res.end(String(e?.message || e)); });
});
server.on('upgrade', (req, socket, head) => { ready.then(() => upgrade(req, socket, head)); });
server.on('error', (e) => { console.error(`[session-proxy] cannot listen on ${PUBLIC_PORT}: ${e.message}`); process.exit(1); });
server.listen(PUBLIC_PORT, () => console.log(`[session-proxy] listening on ${PUBLIC_PORT} -> TREK ${APP_HOST}:${APP_PORT}`));
