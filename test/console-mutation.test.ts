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
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`console did not start\n${out}`)), 8000);
    const onData = (chunk: Buffer) => {
      out += chunk.toString();
      if (out.includes('Dataset console:')) { clearTimeout(timer); resolve(); }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.once('exit', (code) => { clearTimeout(timer); reject(new Error(`console exited ${code}\n${out}`)); });
  });
  return proc;
}

test('a page on another origin cannot reject a proposal, and the console itself can', async () => {
  const ids = ['csrf-cross', 'csrf-rebind', 'csrf-same', 'csrf-script'] as const;
  for (const id of ids) writeOpen(id);
  const version = fs.readFileSync('codebook/VERSION', 'utf8');
  const port = await freePort();
  const proc = await startConsole(port);
  const reject = (id: string) => `/api/proposals/dry-run/${id}/reject`;
  try {
    const plain = JSON.stringify({ note: 'cross-site probe', by: 'attacker' });
    assert.equal(await post(port, reject('csrf-cross'), { 'content-type': 'text/plain;charset=UTF-8', origin: 'http://127.0.0.1:1', 'sec-fetch-site': 'cross-site' }, plain), 403);
    assert.equal(statusOf('csrf-cross'), 'open');

    const rebound = JSON.stringify({ note: 'rebind' });
    assert.equal(await post(port, reject('csrf-rebind'), { 'content-type': 'application/json', host: `evil.example:${port}`, origin: `http://evil.example:${port}`, 'sec-fetch-site': 'same-origin' }, rebound), 403);
    assert.equal(statusOf('csrf-rebind'), 'open');

    const note = JSON.stringify({ note: 'reviewer' });
    assert.equal(await post(port, reject('csrf-same'), { 'content-type': 'application/json', origin: `http://127.0.0.1:${port}`, 'sec-fetch-site': 'same-origin', host: `127.0.0.1:${port}` }, note), 200);
    assert.equal(statusOf('csrf-same'), 'rejected');

    assert.equal(await post(port, reject('csrf-script'), { 'content-type': 'application/json', host: `127.0.0.1:${port}` }, JSON.stringify({ note: 'script' })), 200);
    assert.equal(statusOf('csrf-script'), 'rejected');
    assert.equal(fs.readFileSync('codebook/VERSION', 'utf8'), version);
  } finally {
    proc.kill('SIGTERM');
    for (const id of ids) fs.rmSync(fileFor(id), { force: true });
  }
});
