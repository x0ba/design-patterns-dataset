import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const fileFor = (id: string) => path.join('proposals', 'dry-run', `${id}.yaml`);

function writeOpen(id: string) {
  fs.mkdirSync(path.dirname(fileFor(id)), { recursive: true });
  fs.writeFileSync(fileFor(id), `id: ${id}\nkind: new-values\nstatus: open\nbatch: dry-run\ncodebookVersion: 1.0.0\ndimensions: []\nrationale: []\nsources: []\nevidence: []\ncreatedAt: 2026-11-11T00:00:00.000Z\nupdatedAt: 2026-11-11T00:00:00.000Z\n`);
}

const statusOf = (id: string) => fs.readFileSync(fileFor(id), 'utf8').match(/^status: (\S+)/m)?.[1];

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') return reject(new Error('no port'));
      server.close(() => resolve(addr.port));
    });
  });
}

function post(port: number, pathname: string, headers: Record<string, string>, body: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method: 'POST', headers: { ...headers, 'content-length': String(Buffer.byteLength(body)) } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode ?? 0));
    });
    req.on('error', reject);
    req.end(body);
  });
}

async function startConsole(port: number): Promise<ChildProcess> {
  const proc = spawn(process.execPath, ['console/server.ts', '--port', String(port), '--host', '127.0.0.1'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`console did not start\n${out}`)), 8000);
    const onData = (chunk: Buffer) => {
      out += chunk.toString();
      if (out.includes('Dataset console:')) { clearTimeout(timer); resolve(); }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.once('exit', (code) => { clearTimeout(timer); reject(new Error(`console exited ${code}\n${out}`)); });
  });
  try {
    await ready;
  } catch (err) {
    proc.kill('SIGTERM');
    throw err;
  }
  return proc;
}

test('a page on another origin cannot reject a proposal, and the console itself can', async () => {
  const ids = ['csrf-cross', 'csrf-site', 'csrf-origin', 'csrf-rebind', 'csrf-same', 'csrf-script'] as const;
  const version = fs.readFileSync('codebook/VERSION', 'utf8');
  let proc: ChildProcess | undefined;
  try {
    for (const id of ids) writeOpen(id);
    const port = await freePort();
    proc = await startConsole(port);
    const reject = (id: string) => `/api/proposals/dry-run/${id}/reject`;
    const listen = `127.0.0.1:${port}`;
    assert.equal(await post(port, reject('csrf-cross'), { 'content-type': 'text/plain;charset=UTF-8', host: listen }, JSON.stringify({ note: 'plain' })), 403);
    assert.equal(statusOf('csrf-cross'), 'open');

    assert.equal(await post(port, reject('csrf-site'), { 'content-type': 'application/json', host: listen, origin: `http://${listen}`, 'sec-fetch-site': 'cross-site' }, JSON.stringify({ note: 'site' })), 403);
    assert.equal(statusOf('csrf-site'), 'open');

    assert.equal(await post(port, reject('csrf-origin'), { 'content-type': 'application/json', host: listen, origin: 'http://evil.example', 'sec-fetch-site': 'same-origin' }, JSON.stringify({ note: 'origin' })), 403);
    assert.equal(statusOf('csrf-origin'), 'open');

    assert.equal(await post(port, reject('csrf-rebind'), { 'content-type': 'application/json', host: `evil.example:${port}`, origin: `http://evil.example:${port}`, 'sec-fetch-site': 'same-origin' }, JSON.stringify({ note: 'rebind' })), 403);
    assert.equal(statusOf('csrf-rebind'), 'open');

    const note = JSON.stringify({ note: 'reviewer' });
    assert.equal(await post(port, reject('csrf-same'), { 'content-type': 'application/json', origin: `http://127.0.0.1:${port}`, 'sec-fetch-site': 'same-origin', host: `127.0.0.1:${port}` }, note), 200);
    assert.equal(statusOf('csrf-same'), 'rejected');

    assert.equal(await post(port, reject('csrf-script'), { 'content-type': 'application/json', host: listen }, JSON.stringify({ note: 'script' })), 200);
    assert.equal(statusOf('csrf-script'), 'rejected');
    assert.equal(fs.readFileSync('codebook/VERSION', 'utf8'), version);
  } finally {
    proc?.kill('SIGTERM');
    for (const id of ids) fs.rmSync(fileFor(id), { force: true });
  }
});
