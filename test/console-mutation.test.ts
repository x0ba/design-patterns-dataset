import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import YAML from 'yaml';

const dir = path.join('proposals', 'dry-run');

function proposal(id: string) {
  return {
    id,
    kind: 'new-values',
    status: 'open',
    batch: 'dry-run',
    codebookVersion: '1.0.0',
    dimensions: [],
    rationale: [],
    sources: [],
    evidence: [],
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: '2026-11-11T00:00:00.000Z',
  };
}

function writeProposal(id: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.yaml`), YAML.stringify(proposal(id)));
}

function statusOf(id: string): string {
  return YAML.parse(fs.readFileSync(path.join(dir, `${id}.yaml`), 'utf8')).status;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') return reject(new Error('no port'));
      const port = addr.port;
      server.close(() => resolve(port));
    });
  });
}

function post(port: number, pathname: string, headers: Record<string, string>, body: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method: 'POST', headers }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text }));
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
      if (out.includes('Dataset console:')) {
        clearTimeout(timer);
        resolve();
      }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`console exited ${code}\n${out}`));
    });
  });
  return proc;
}

test('a page on another origin cannot reject a proposal, and the console itself can', async () => {
  const crossId = 'csrf-cross';
  const reboundId = 'csrf-rebind';
  const sameId = 'csrf-same';
  const scriptId = 'csrf-script';
  for (const id of [crossId, reboundId, sameId, scriptId]) writeProposal(id);
  const version = fs.readFileSync('codebook/VERSION', 'utf8');
  const port = await freePort();
  const proc = await startConsole(port);
  try {
    const plain = JSON.stringify({ note: 'cross-site probe', by: 'attacker' });
    const cross = await post(port, `/api/proposals/dry-run/${crossId}/reject`, {
      'content-type': 'text/plain;charset=UTF-8',
      origin: 'http://127.0.0.1:1',
      'sec-fetch-site': 'cross-site',
      'content-length': String(Buffer.byteLength(plain)),
    }, plain);
    assert.equal(cross.status, 403);
    assert.equal(statusOf(crossId), 'open');

    // A name that resolves to 127.0.0.1 still sends Host and Origin for that name.
    const reboundBody = JSON.stringify({ note: 'rebind' });
    const rebound = await post(port, `/api/proposals/dry-run/${reboundId}/reject`, {
      'content-type': 'application/json',
      host: `evil.example:${port}`,
      origin: `http://evil.example:${port}`,
      'sec-fetch-site': 'same-origin',
      'content-length': String(Buffer.byteLength(reboundBody)),
    }, reboundBody);
    assert.equal(rebound.status, 403);
    assert.equal(statusOf(reboundId), 'open');

    const json = JSON.stringify({ note: 'reviewer' });
    const same = await post(port, `/api/proposals/dry-run/${sameId}/reject`, {
      'content-type': 'application/json',
      origin: `http://127.0.0.1:${port}`,
      'sec-fetch-site': 'same-origin',
      host: `127.0.0.1:${port}`,
      'content-length': String(Buffer.byteLength(json)),
    }, json);
    assert.equal(same.status, 200);
    assert.equal(statusOf(sameId), 'rejected');

    const scriptBody = JSON.stringify({ note: 'script' });
    const script = await post(port, `/api/proposals/dry-run/${scriptId}/reject`, {
      'content-type': 'application/json',
      host: `127.0.0.1:${port}`,
      'content-length': String(Buffer.byteLength(scriptBody)),
    }, scriptBody);
    assert.equal(script.status, 200);
    assert.equal(statusOf(scriptId), 'rejected');
    assert.equal(fs.readFileSync('codebook/VERSION', 'utf8'), version);
  } finally {
    proc.kill('SIGTERM');
    for (const id of [crossId, reboundId, sameId, scriptId]) fs.rmSync(path.join(dir, `${id}.yaml`), { force: true });
  }
});
