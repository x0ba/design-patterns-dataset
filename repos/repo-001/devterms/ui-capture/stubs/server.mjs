// Local stand-ins for every external service DevTerms talks to.
//   :4488  Turso / libSQL  -> Hrana-over-HTTP (v2 JSON pipeline) backed by a SQLite file (node:sqlite)
//   :4487  Meilisearch     -> in-memory index persisted to JSON, Meilisearch REST API subset
//   :4486  misc            -> Upstash Redis REST, GitHub OAuth + REST API, avatar images, Plausible no-op
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.STUB_DATA_DIR ?? join(HERE, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const DB_PORT = Number(process.env.STUB_DB_PORT ?? 4488);
const MEILI_PORT = Number(process.env.STUB_MEILI_PORT ?? 4487);
const MISC_PORT = Number(process.env.STUB_MISC_PORT ?? 4486);
const APP_BASE = process.env.APP_BASE_URL ?? 'http://localhost:4475';
const MISC_BASE = `http://localhost:${MISC_PORT}`;

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const sendJson = (res, status, body, extraHeaders = {}) => {
  const json = JSON.stringify(body, (_k, v) =>
    typeof v === 'bigint' ? v.toString() : v
  );
  res.writeHead(status, {
    'content-type': 'application/json',
    ...extraHeaders
  });
  res.end(json);
};

/* ------------------------------------------------------------------ */
/* Turso / libSQL Hrana HTTP stub                                      */
/* ------------------------------------------------------------------ */

const db = new DatabaseSync(join(DATA_DIR, 'devterms.db'));
db.exec('PRAGMA journal_mode = WAL;');

const fromHrana = (v) => {
  switch (v?.type) {
    case 'null':
    case undefined:
      return null;
    case 'integer':
      return BigInt(v.value);
    case 'float':
      return Number(v.value);
    case 'text':
      return String(v.value);
    case 'blob':
      return Buffer.from(v.base64 ?? '', 'base64');
    default:
      throw new Error(`unknown value type ${v.type}`);
  }
};

const toHrana = (v) => {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'bigint') return { type: 'integer', value: v.toString() };
  if (typeof v === 'number')
    return Number.isInteger(v)
      ? { type: 'integer', value: String(v) }
      : { type: 'float', value: v };
  if (typeof v === 'string') return { type: 'text', value: v };
  if (v instanceof Uint8Array)
    return { type: 'blob', base64: Buffer.from(v).toString('base64') };
  return { type: 'text', value: String(v) };
};

const sqlCache = new Map(); // store_sql ids

function executeStmt(stmt) {
  const sql = stmt.sql ?? sqlCache.get(stmt.sql_id);
  const st = db.prepare(sql);
  const positional = (stmt.args ?? []).map(fromHrana);
  const named = {};
  for (const { name, value } of stmt.named_args ?? []) {
    named[name.replace(/^[:@$]/, '')] = fromHrana(value);
  }
  const params = Object.keys(named).length
    ? [named, ...positional]
    : positional;
  const cols = st.columns();
  if (cols.length > 0) {
    st.setReadBigInts(true);
    st.setReturnArrays(true);
    const rows = st.all(...params);
    const changes = /^\s*(insert|update|delete|replace)/i.test(sql)
      ? rows.length
      : 0;
    return {
      cols: cols.map((c) => ({ name: c.name, decltype: c.type ?? null })),
      rows: rows.map((r) => r.map(toHrana)),
      affected_row_count: changes,
      last_insert_rowid: null,
      rows_read: rows.length,
      rows_written: changes
    };
  }
  const info = st.run(...params);
  return {
    cols: [],
    rows: [],
    affected_row_count: Number(info.changes),
    last_insert_rowid:
      info.lastInsertRowid != null ? String(info.lastInsertRowid) : null,
    rows_read: 0,
    rows_written: Number(info.changes)
  };
}

const hranaError = (err) => ({
  message: String(err?.message ?? err),
  code: err?.code ?? 'SQLITE_ERROR'
});

function evalCond(cond, results, errors) {
  if (!cond) return true;
  switch (cond.type) {
    case 'ok':
      return results[cond.step] != null;
    case 'error':
      return errors[cond.step] != null;
    case 'not':
      return !evalCond(cond.cond, results, errors);
    case 'and':
      return cond.conds.every((c) => evalCond(c, results, errors));
    case 'or':
      return cond.conds.some((c) => evalCond(c, results, errors));
    case 'is_autocommit':
      return !db.isTransaction;
    default:
      return false;
  }
}

function handleStreamRequest(r) {
  switch (r.type) {
    case 'close':
      return { type: 'close' };
    case 'execute':
      return { type: 'execute', result: executeStmt(r.stmt) };
    case 'batch': {
      const steps = r.batch.steps;
      const results = new Array(steps.length).fill(null);
      const errors = new Array(steps.length).fill(null);
      steps.forEach((step, i) => {
        if (!evalCond(step.condition, results, errors)) return;
        try {
          results[i] = executeStmt(step.stmt);
        } catch (err) {
          errors[i] = hranaError(err);
        }
      });
      return {
        type: 'batch',
        result: { step_results: results, step_errors: errors }
      };
    }
    case 'sequence':
      db.exec(r.sql ?? sqlCache.get(r.sql_id));
      return { type: 'sequence' };
    case 'store_sql':
      sqlCache.set(r.sql_id, r.sql);
      return { type: 'store_sql' };
    case 'close_sql':
      sqlCache.delete(r.sql_id);
      return { type: 'close_sql' };
    case 'get_autocommit':
      return { type: 'get_autocommit', is_autocommit: !db.isTransaction };
    case 'describe': {
      const st = db.prepare(r.sql);
      return {
        type: 'describe',
        result: {
          params: [],
          cols: st.columns().map((c) => ({ name: c.name, decltype: c.type })),
          is_explain: /^\s*explain/i.test(r.sql),
          is_readonly: /^\s*(select|with)/i.test(r.sql)
        }
      };
    }
    default:
      throw new Error(`unsupported request ${r.type}`);
  }
}

let batonSeq = 0;
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (req.method === 'GET' && (url.pathname === '/v2' || url.pathname === '/health')) {
        res.writeHead(200);
        return res.end();
      }
      if (req.method === 'POST' && url.pathname === '/v2/pipeline') {
        const body = JSON.parse(await readBody(req));
        const results = body.requests.map((r) => {
          try {
            return { type: 'ok', response: handleStreamRequest(r) };
          } catch (err) {
            return { type: 'error', error: hranaError(err) };
          }
        });
        const closed = body.requests.some((r) => r.type === 'close');
        return sendJson(res, 200, {
          baton: closed ? null : `b${++batonSeq}`,
          base_url: null,
          results
        });
      }
      res.writeHead(404);
      res.end();
    } catch (err) {
      console.error('[db-stub]', err);
      sendJson(res, 500, { message: String(err) });
    }
  })
  .listen(DB_PORT, '127.0.0.1', () =>
    console.log(`[stub] libSQL/Hrana on http://127.0.0.1:${DB_PORT}`)
  );

/* ------------------------------------------------------------------ */
/* Meilisearch stub                                                    */
/* ------------------------------------------------------------------ */

const MEILI_FILE = join(DATA_DIR, 'search-index.json');
const indexes = existsSync(MEILI_FILE)
  ? JSON.parse(readFileSync(MEILI_FILE, 'utf8'))
  : {};
let taskSeq = 1;
const saveIndexes = () => writeFileSync(MEILI_FILE, JSON.stringify(indexes));
const getIndex = (uid) =>
  (indexes[uid] ??= {
    uid,
    primaryKey: null,
    docs: [],
    sortable: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

const task = (indexUid, type) => ({
  taskUid: taskSeq++,
  indexUid,
  status: 'enqueued',
  type,
  enqueuedAt: new Date().toISOString()
});

const tokenize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9+#]+/)
    .filter(Boolean);

function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function wordScore(qt, words, isLast) {
  let best = 0;
  const typos = qt.length >= 9 ? 2 : qt.length >= 5 ? 1 : 0;
  for (const w of words) {
    if (w === qt) return 1;
    if (isLast && w.startsWith(qt)) best = Math.max(best, 0.8);
    else if (typos && lev(qt, w.slice(0, Math.max(qt.length, w.length)), typos) <= typos)
      best = Math.max(best, 0.5);
  }
  return best;
}

function searchIndex(idx, params) {
  const started = Date.now();
  const q = params.q ?? '';
  const attrs = params.attributesToSearchOn ?? ['term', 'definition', 'example'];
  let hits;
  const qTokens = tokenize(q);
  if (!qTokens.length) {
    hits = idx.docs.slice();
  } else {
    const weights = { term: 10, definition: 2, example: 1 };
    const scoreDoc = (doc, required) => {
      let total = 0;
      let matched = 0;
      qTokens.forEach((qt, i) => {
        let best = 0;
        for (const a of attrs) {
          const s = wordScore(qt, tokenize(doc[a]), i === qTokens.length - 1);
          best = Math.max(best, s * (weights[a] ?? 1));
        }
        if (best > 0) matched++;
        total += best;
      });
      if (matched < required) return 0;
      const term = String(doc.term ?? '').toLowerCase();
      if (term === q.trim().toLowerCase()) total += 50;
      else if (term.startsWith(q.trim().toLowerCase())) total += 20;
      return total;
    };
    let required = qTokens.length;
    do {
      hits = idx.docs
        .map((d) => [scoreDoc(d, required), d])
        .filter(([s]) => s > 0)
        .sort((a, b) => b[0] - a[0])
        .map(([, d]) => d);
      required--;
    } while (!hits.length && required > 0);
  }
  if (Array.isArray(params.sort) && params.sort.length) {
    const [field, dir] = params.sort[0].split(':');
    hits.sort((a, b) =>
      String(a[field]).localeCompare(String(b[field])) * (dir === 'desc' ? -1 : 1)
    );
  }
  const retrieve = params.attributesToRetrieve;
  const shape = (d) => {
    const out = {};
    for (const k of Object.keys(d))
      if (!retrieve || retrieve.includes('*') || retrieve.includes(k)) out[k] = d[k];
    if (params.attributesToHighlight?.length || params.attributesToCrop?.length)
      out._formatted = { ...out };
    return out;
  };
  const base = { query: q, processingTimeMs: Date.now() - started };
  if (params.page != null || params.hitsPerPage != null) {
    const hitsPerPage = params.hitsPerPage ?? 20;
    const page = params.page ?? 1;
    return {
      ...base,
      hits: hits.slice((page - 1) * hitsPerPage, page * hitsPerPage).map(shape),
      hitsPerPage,
      page,
      totalPages: Math.ceil(hits.length / hitsPerPage),
      totalHits: hits.length
    };
  }
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 20;
  return {
    ...base,
    hits: hits.slice(offset, offset + limit).map(shape),
    limit,
    offset,
    estimatedTotalHits: hits.length
  };
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-max-age': '86400'
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname.replace(/\/+$/, '');
    const cors = {
      ...CORS,
      'access-control-allow-headers':
        req.headers['access-control-request-headers'] ?? '*'
    };
    const reply = (status, body) => sendJson(res, status, body, cors);
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, cors);
        return res.end();
      }
      const raw = req.method === 'GET' ? '' : await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      if (p === '/health') return reply(200, { status: 'available' });
      if (p === '/version')
        return reply(200, { pkgVersion: '1.11.3', commitSha: 'stub', commitDate: '2024-11-25' });
      if (p === '/multi-search' && req.method === 'POST') {
        return reply(200, {
          results: (body.queries ?? []).map(({ indexUid, ...params }) => ({
            indexUid,
            ...searchIndex(getIndex(indexUid), params)
          }))
        });
      }
      let m;
      if ((m = p.match(/^\/indexes\/([^/]+)\/search$/))) {
        const params =
          req.method === 'GET'
            ? Object.fromEntries(url.searchParams)
            : body;
        return reply(200, searchIndex(getIndex(m[1]), params));
      }
      if ((m = p.match(/^\/indexes\/([^/]+)\/stats$/))) {
        const idx = getIndex(m[1]);
        const fieldDistribution = {};
        for (const d of idx.docs)
          for (const k of Object.keys(d)) fieldDistribution[k] = (fieldDistribution[k] ?? 0) + 1;
        return reply(200, {
          numberOfDocuments: idx.docs.length,
          isIndexing: false,
          fieldDistribution
        });
      }
      if ((m = p.match(/^\/indexes\/([^/]+)\/documents$/))) {
        const idx = getIndex(m[1]);
        if (req.method === 'GET') {
          const offset = Number(url.searchParams.get('offset') ?? 0);
          const limit = Number(url.searchParams.get('limit') ?? 20);
          return reply(200, {
            results: idx.docs.slice(offset, offset + limit),
            offset,
            limit,
            total: idx.docs.length
          });
        }
        if (req.method === 'DELETE') {
          idx.docs = [];
          saveIndexes();
          return reply(202, task(idx.uid, 'documentDeletion'));
        }
        const pk = url.searchParams.get('primaryKey') ?? idx.primaryKey ?? 'id';
        idx.primaryKey = pk;
        const byId = new Map(idx.docs.map((d) => [d[pk], d]));
        for (const doc of Array.isArray(body) ? body : [body]) {
          byId.set(doc[pk], req.method === 'PUT' ? { ...byId.get(doc[pk]), ...doc } : doc);
        }
        idx.docs = [...byId.values()];
        idx.updatedAt = new Date().toISOString();
        saveIndexes();
        return reply(202, task(idx.uid, 'documentAdditionOrUpdate'));
      }
      if ((m = p.match(/^\/indexes\/([^/]+)\/settings(\/sortable-attributes)?/))) {
        const idx = getIndex(m[1]);
        if (req.method === 'GET') return reply(200, m[2] ? idx.sortable : { sortableAttributes: idx.sortable });
        if (m[2]) idx.sortable = body;
        saveIndexes();
        return reply(202, task(idx.uid, 'settingsUpdate'));
      }
      if ((m = p.match(/^\/indexes\/([^/]+)$/))) {
        const idx = getIndex(m[1]);
        return reply(200, {
          uid: idx.uid,
          primaryKey: idx.primaryKey,
          createdAt: idx.createdAt,
          updatedAt: idx.updatedAt
        });
      }
      if ((m = p.match(/^\/tasks\/(\d+)$/))) {
        const now = new Date().toISOString();
        return reply(200, {
          uid: Number(m[1]),
          status: 'succeeded',
          enqueuedAt: now,
          startedAt: now,
          finishedAt: now
        });
      }
      reply(404, {
        message: `Route ${p} not found in stub`,
        code: 'not_found',
        type: 'invalid_request',
        link: 'https://docs.meilisearch.com/errors#not_found'
      });
    } catch (err) {
      console.error('[meili-stub]', err);
      reply(500, { message: String(err), code: 'internal', type: 'internal' });
    }
  })
  .listen(MEILI_PORT, '127.0.0.1', () =>
    console.log(`[stub] Meilisearch on http://127.0.0.1:${MEILI_PORT}`)
  );

/* ------------------------------------------------------------------ */
/* Upstash Redis REST, GitHub OAuth/API, avatars, Plausible            */
/* ------------------------------------------------------------------ */

// The GitHub account that "signs in" through the stubbed OAuth flow.
const GITHUB_USER = JSON.parse(
  process.env.STUB_GITHUB_USER ??
    readFileSync(join(HERE, 'github-user.json'), 'utf8')
);

// Minimal in-memory Redis: the sliding-window rate limiter only needs the
// numeric result of its Lua script, so count calls per key per window.
const rlCounters = new Map();
function redisCommand(cmd) {
  const [name, ...args] = cmd;
  switch (String(name).toLowerCase()) {
    case 'evalsha':
    case 'eval': {
      const numKeys = Number(args[1]);
      const keys = args.slice(2, 2 + numKeys);
      const argv = args.slice(2 + numKeys);
      const limit = Number(argv[0] ?? 10);
      const key = keys[0] ?? 'k';
      const used = (rlCounters.get(key) ?? 0) + Number(argv[3] ?? 1);
      rlCounters.set(key, used);
      if (rlCounters.size > 5000) rlCounters.clear();
      return limit - used; // remaining tokens; >= 0 means allowed
    }
    case 'script':
      return createHash('sha1').update(String(args[1] ?? '')).digest('hex');
    case 'ping':
      return 'PONG';
    case 'get':
    case 'hget':
      return null;
    case 'del':
    case 'exists':
      return 0;
    default:
      return 'OK';
  }
}

function identicon(seed) {
  const h = createHash('md5').update(seed).digest();
  const hue = Math.round((h[12] / 255) * 360);
  const color = `hsl(${hue}, ${45 + (h[13] % 25)}%, ${50 + (h[14] % 15)}%)`;
  let rects = '';
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++)
      if (h[y * 3 + x] % 2 === 0) {
        rects += `<rect x="${35 + x * 86}" y="${35 + y * 86}" width="86" height="86"/>`;
        if (x < 2) rects += `<rect x="${35 + (4 - x) * 86}" y="${35 + y * 86}" width="86" height="86"/>`;
      }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><rect width="500" height="500" fill="#f0f0f0"/><g fill="${color}">${rects}</g></svg>`;
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    try {
      // --- Upstash Redis REST ---
      if (p === '/upstash' || p === '/upstash/') {
        const cmd = JSON.parse(await readBody(req));
        return sendJson(res, 200, { result: redisCommand(cmd) });
      }
      if (p === '/upstash/pipeline' || p === '/upstash/multi-exec') {
        const cmds = JSON.parse(await readBody(req));
        return sendJson(res, 200, cmds.map((c) => ({ result: redisCommand(c) })));
      }

      // --- GitHub OAuth (browser-facing authorize page) ---
      if (p === '/github/login/oauth/authorize') {
        const state = url.searchParams.get('state') ?? '';
        const target = `${APP_BASE}/api/callback/github?code=stub_${GITHUB_USER.login}_${Date.now()}&state=${encodeURIComponent(state)}`;
        res.writeHead(302, { location: target });
        return res.end();
      }
      // --- GitHub OAuth token exchange (server-side) ---
      if (p === '/github/login/oauth/access_token') {
        await readBody(req);
        return sendJson(res, 200, {
          access_token: `gho_stub${createHash('sha1').update(String(Date.now())).digest('hex').slice(0, 32)}`,
          token_type: 'bearer',
          scope: 'user:email'
        });
      }
      // --- GitHub REST API ---
      if (p === '/github-api/user') {
        return sendJson(res, 200, {
          login: GITHUB_USER.login,
          id: GITHUB_USER.id,
          node_id: `MDQ6VXNlcj${GITHUB_USER.id}`,
          avatar_url: `${MISC_BASE}/avatars/u/${GITHUB_USER.id}?v=4`,
          html_url: `https://github.com/${GITHUB_USER.login}`,
          type: 'User',
          name: GITHUB_USER.displayName,
          email: GITHUB_USER.email,
          bio: GITHUB_USER.bio ?? null,
          public_repos: 42,
          followers: 118,
          following: 37,
          created_at: '2016-03-09T18:22:41Z'
        });
      }
      if (p === '/github-api/user/emails') {
        return sendJson(res, 200, [
          { email: GITHUB_USER.email, primary: true, verified: true, visibility: 'public' }
        ]);
      }

      // --- Avatars (GitHub-style identicons) ---
      if (p.startsWith('/avatars/')) {
        res.writeHead(200, {
          'content-type': 'image/svg+xml',
          'cache-control': 'public, max-age=86400',
          'access-control-allow-origin': '*'
        });
        return res.end(identicon(p));
      }

      // --- Plausible analytics ---
      if (p.startsWith('/plausible/js/')) {
        res.writeHead(200, { 'content-type': 'application/javascript' });
        return res.end(
          'window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)};'
        );
      }
      if (p === '/plausible/api/event' || p === '/api/event') {
        await readBody(req);
        res.writeHead(202, { 'access-control-allow-origin': '*' });
        return res.end('ok');
      }

      res.writeHead(404);
      res.end('not found');
    } catch (err) {
      console.error('[misc-stub]', err);
      sendJson(res, 500, { error: String(err) });
    }
  })
  .listen(MISC_PORT, '127.0.0.1', () =>
    console.log(`[stub] Upstash/GitHub/avatars/Plausible on http://127.0.0.1:${MISC_PORT}`)
  );
