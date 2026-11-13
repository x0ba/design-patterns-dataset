#!/usr/bin/env node
// Dataset console: progress, agreement, codebook usage, proposal review, and a
// screenshot viewer with pattern boxes. Pages update live: /api/events streams
// file changes under dataset/, proposals/ and dist/ as Server-Sent Events.
//
//   node console/server.ts [--port 4317]
//
// Read-only over dataset/ and dist/, except proposal accept/reject, which
// edits codebook/ through the same code path as scripts/proposals.ts.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { P } from '../src/paths.ts';
import { readJson } from '../src/pipeline/sites.ts';
import { acceptProposal, listProposals, rejectProposal } from '../src/pipeline/proposals.ts';
import type { SiteStatus } from '../src/pipeline/sites.ts';
import type { Label } from '../src/pipeline/label.ts';

const { values: args } = parseArgs({ options: { port: { type: 'string', default: process.env.PORT ?? '4317' }, host: { type: 'string', default: '127.0.0.1' } } });
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.yaml': 'text/yaml; charset=utf-8', '.jsonl': 'text/plain; charset=utf-8',
};

// ------------------------------------------------------------------ data

const listDirs = (d: string) => (fs.existsSync(d) ? fs.readdirSync(d).filter((x) => !x.startsWith('_') && !x.startsWith('.') && fs.statSync(path.join(d, x)).isDirectory()).sort() : []);

function batchSummary(batch: string) {
  const dir = path.join(P.dataset, batch);
  const info = readJson<any>(path.join(dir, 'batch.json'));
  const raterIds: string[] = info?.raters?.map((r: any) => r.id) ?? [];
  const sites = listDirs(path.join(dir, 'sites')).map((slug) => {
    const sdir = path.join(dir, 'sites', slug);
    const status = readJson<SiteStatus>(path.join(sdir, 'status.json'));
    const agreement = readJson<any>(path.join(sdir, 'agreement.json'));
    const meta = readJson<any>(path.join(sdir, 'capture', 'meta.json'));
    const disagreeFields = agreement ? [...new Set<string>(agreement.disagreements.map((d: any) => d.field))] : [];
    return {
      slug,
      url: status?.url ?? meta?.url,
      title: meta?.title,
      domain: status?.domain,
      source: status?.source ?? 'captured',
      state: status?.state ?? 'queued',
      raters: status?.raters ?? {},
      flags: status?.flags ?? [],
      error: status?.error,
      updatedAt: status?.updatedAt,
      agreement: agreement ? { score: agreement.score, patternStatusAlpha: agreement.patternStatusAlpha, disagreements: agreement.disagreements.length, fields: disagreeFields } : null,
      hasCapture: !!meta,
    };
  });
  const counts: Record<string, number> = { queued: 0, capturing: 0, labeling: 0, labeled: 0, flagged: 0, failed: 0 };
  for (const s of sites) counts[s.state] = (counts[s.state] ?? 0) + 1;
  return { batch, info, raters: raterIds, counts, sites, irr: readJson(path.join(dir, 'irr.json')) ?? null };
}

function siteDetail(batch: string, slug: string) {
  const dir = path.join(P.dataset, batch, 'sites', slug);
  if (!fs.existsSync(dir)) return null;
  const info = readJson<any>(path.join(P.dataset, batch, 'batch.json'));
  const labels: Record<string, Label> = {};
  const ldir = path.join(dir, 'labels');
  if (fs.existsSync(ldir)) {
    for (const f of fs.readdirSync(ldir).filter((f) => f.endsWith('.json')).sort()) {
      const l = readJson<Label>(path.join(ldir, f));
      if (l) labels[f.replace(/\.json$/, '')] = l;
    }
  }
  return {
    batch, slug,
    raters: info?.raters?.map((r: any) => r.id) ?? [],
    status: readJson(path.join(dir, 'status.json')),
    meta: readJson(path.join(dir, 'capture', 'meta.json')),
    labels,
    agreement: readJson(path.join(dir, 'agreement.json')),
    consensus: readJson(path.join(dir, 'consensus.json')),
    screenshot: screenshotUrl(batch, slug),
  };
}

/** Screenshot URL with its mtime, so a recapture busts the browser cache. */
function screenshotUrl(batch: string, slug: string) {
  const file = path.join(P.dataset, batch, 'sites', slug, 'capture', 'screenshot.png');
  if (!fs.existsSync(file)) return null;
  return `/files/dataset/${encodeURIComponent(batch)}/sites/${encodeURIComponent(slug)}/capture/screenshot.png?v=${Math.round(fs.statSync(file).mtimeMs)}`;
}

/** How often each pattern and value appears, from consensus labels (or single labels). */
function codebookUsage() {
  const patterns: Record<string, { sites: number; uncertain: number; values: Record<string, Record<string, number>>; where: { batch: string; slug: string }[] }> = {};
  let sites = 0;
  for (const batch of listDirs(P.dataset)) {
    for (const slug of listDirs(path.join(P.dataset, batch, 'sites'))) {
      const c = readJson<any>(path.join(P.dataset, batch, 'sites', slug, 'consensus.json'));
      if (!c) continue;
      sites++;
      for (const p of c.patterns) {
        if (p.status === 'absent') continue;
        const u = (patterns[p.id] ??= { sites: 0, uncertain: 0, values: {}, where: [] });
        if (p.status === 'uncertain') { u.uncertain++; continue; }
        u.sites++;
        if (u.where.length < 50) u.where.push({ batch, slug });
        for (const [k, v] of Object.entries<any>(p.dims ?? {})) {
          for (const x of Array.isArray(v) ? v : [v]) ((u.values[k] ??= {})[x] = (u.values[k][x] ?? 0) + 1);
        }
      }
    }
  }
  return { sites, patterns };
}

// ------------------------------------------------------------------ live

// Watches the directories the console reads and pushes what changed to every
// open page over SSE. Changes are coalesced for a short window, so a rater
// rewriting status.json several times in a row becomes one event. The pages
// decide whether a change touches what they show.

type Change = { scope: 'dataset'; batch: string; slug?: string; file: string } | { scope: 'proposals' | 'codebook'; file: string };

const clients = new Set<http.ServerResponse>();
let queued: Change[] = [];
let flushTimer: NodeJS.Timeout | undefined;

function emit(event: string, data: unknown) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) c.write(msg);
}

function queue(change: Change) {
  queued.push(change);
  flushTimer ??= setTimeout(() => {
    flushTimer = undefined;
    const seen = new Set<string>();
    const changes = queued.filter((c) => { const k = JSON.stringify(c); return !seen.has(k) && !!seen.add(k); });
    queued = [];
    emit('change', { changes });
  }, 250);
}

// Ignore temp files from atomic writes and rater transcripts (appended on
// every turn, never shown by the console).
const ignored = (rel: string) => /\.tmp$|\.transcript\.jsonl$|(^|\/)\.|~$/.test(rel);

function classify(root: 'dataset' | 'proposals' | 'codebook', rel: string): Change {
  if (root !== 'dataset') return { scope: root, file: rel };
  const [batch = '', sites, slug, ...rest] = rel.split('/');
  return sites === 'sites' && slug ? { scope: 'dataset', batch, slug, file: rest.join('/') } : { scope: 'dataset', batch, file: rel.split('/').slice(1).join('/') };
}

/** fs.watch a directory recursively; if it doesn't exist yet (or is removed), keep checking until it does. */
function watchDir(dir: string, root: 'dataset' | 'proposals' | 'codebook') {
  let watcher: fs.FSWatcher | undefined;
  const start = () => {
    if (watcher || !fs.existsSync(dir)) return;
    try {
      watcher = fs.watch(dir, { recursive: true }, (_event, name) => {
        const rel = name ? String(name).split(path.sep).join('/') : '';
        if (rel && ignored(rel)) return;
        queue(classify(root, rel));
        if (!fs.existsSync(dir)) restart();
      });
      watcher.on('error', restart);
    } catch {
      watcher = undefined;
    }
  };
  const restart = () => {
    watcher?.close();
    watcher = undefined;
    queue(classify(root, ''));
  };
  start();
  setInterval(start, 2000).unref();
}

watchDir(P.dataset, 'dataset');
watchDir(P.proposals, 'proposals');
watchDir(P.dist, 'codebook');

// Keeps idle connections open through proxies and lets the page notice a dead server.
setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 20_000).unref();

function events(req: http.IncomingMessage, res: http.ServerResponse) {
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  res.write(`event: hello\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

// ---------------------------------------------------------------- server

function send(res: http.ServerResponse, status: number, body: unknown, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function serveFile(res: http.ServerResponse, root: string, rel: string) {
  const file = path.resolve(root, '.' + path.posix.normalize('/' + decodeURIComponent(rel)));
  if (!file.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'not found' });
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

async function body(req: http.IncomingMessage): Promise<any> {
  let s = '';
  for await (const c of req) s += c;
  return s ? JSON.parse(s) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const p = url.pathname;
  try {
    if (req.method === 'GET' && p === '/api/events') return events(req, res);
    if (req.method === 'GET' && p === '/api/batches') {
      return send(res, 200, { batches: listDirs(P.dataset).map(batchSummary) });
    }
    let m = /^\/api\/site\/([^/]+)\/([^/]+)$/.exec(p);
    if (req.method === 'GET' && m) {
      const d = siteDetail(m[1], m[2]);
      return d ? send(res, 200, d) : send(res, 404, { error: 'no such site' });
    }
    if (req.method === 'GET' && p === '/api/codebook') {
      const bundle = readJson<any>(P.distCodebook);
      if (!bundle) return send(res, 404, { error: 'dist/codebook.json missing — run scripts/build-codebook.ts' });
      for (const e of bundle.entries) delete e.coding;
      const sourceVersion = fs.existsSync(P.version) ? fs.readFileSync(P.version, 'utf8').trim() : null;
      return send(res, 200, { ...bundle, sourceVersion, usage: codebookUsage() });
    }
    if (req.method === 'GET' && p === '/api/proposals') {
      return send(res, 200, { proposals: listProposals() });
    }
    m = /^\/api\/proposals\/([^/]+)\/([^/]+)\/(accept|reject)$/.exec(p);
    if (req.method === 'POST' && m) {
      const b = await body(req);
      if (m[3] === 'accept') {
        const r = acceptProposal(m[1], m[2], { by: b.by, note: b.note });
        return send(res, 200, { ok: true, version: r.version, message: `Accepted. Codebook source is now ${r.version}; rebuild dist/ (scripts/build-codebook.ts) before the next batch.` });
      }
      if (!b.note) return send(res, 400, { error: 'a rejection needs a note' });
      rejectProposal(m[1], m[2], { by: b.by, note: b.note });
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && p.startsWith('/files/dataset/')) return serveFile(res, P.dataset, p.slice('/files/dataset/'.length));
    if (req.method === 'GET' && p.startsWith('/files/dist/')) return serveFile(res, P.dist, p.slice('/files/dist/'.length));
    if (req.method === 'GET') return serveFile(res, PUBLIC, p === '/' ? 'index.html' : p.slice(1));
    send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    send(res, 500, { error: (e as Error).message });
  }
});

server.listen(Number(args.port), args.host, () => {
  console.log(`Dataset console: http://${args.host}:${args.port}`);
});
