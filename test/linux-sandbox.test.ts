import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/repos/apps.ts';
import { setupCommands } from '../src/repos/rebuild.ts';
import { bwrapArgs, runtimeSandboxKind } from '../src/repos/sandbox.ts';

test('bwrap args: read-only root, writable checkout, hidden credential dirs, own network', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
  fs.mkdirSync(path.join(home, '.ssh'));
  fs.writeFileSync(path.join(home, '.netrc'), 'x');
  const co = fs.mkdtempSync(path.join(os.tmpdir(), 'co-'));
  const args = bwrapArgs([co], co, home).join(' ');
  assert.match(args, /^--ro-bind \/ \//);
  assert.ok(args.includes(`--bind ${fs.realpathSync(co)} ${fs.realpathSync(co)}`));
  assert.ok(args.includes(`--tmpfs ${fs.realpathSync(home)}/.ssh`));
  assert.ok(args.includes(`--ro-bind /dev/null ${fs.realpathSync(home)}/.netrc`));
  assert.ok(!args.includes('.aws'), 'missing dirs are skipped');
  assert.ok(args.includes('--unshare-net'));
});

test('setupCommands keeps Bash commands in order and trims from the oldest', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tr-')), 't.jsonl');
  const ev = (command: string) => JSON.stringify({ type: 'tool_use', name: 'Bash', input: { command } });
  fs.writeFileSync(f, [ev('a'.repeat(50)), JSON.stringify({ type: 'tool_use', name: 'Read', input: {} }), ev('pnpm install'), ev('pnpm build')].join('\n'));
  assert.deepEqual(setupCommands(f), ['a'.repeat(50), 'pnpm install', 'pnpm build']);
  assert.deepEqual(setupCommands(f, 30), ['pnpm install', 'pnpm build']);
});

test('Linux runtime sandbox serves every listening port and blocks the outside', { skip: runtimeSandboxKind() !== 'bwrap' }, async () => {
  const co = fs.mkdtempSync(path.join(os.tmpdir(), 'sbapp-'));
  fs.mkdirSync(path.join(co, '.ui-capture'));
  fs.writeFileSync(path.join(co, '.ui-capture', 'start.sh'), `cd "$(dirname "$0")"
node -e "require('dns').lookup('example.com', e => require('fs').writeFileSync('dns.txt', e ? 'blocked' : 'open'))"
node -e "require('fs').writeFileSync(require('os').homedir() + '/.sbtest-' + process.pid, 'x')" 2>/dev/null && echo yes > homewrite.txt || echo no > homewrite.txt
node -e "require('http').createServer((q, s) => s.end('api')).listen(Number(process.env.PORT) + 1, '127.0.0.1')" &
exec node -e "require('http').createServer((q, s) => s.end('ui')).listen(Number(process.env.PORT))"
`);
  const port = 20000 + Math.floor(Math.random() * 20000);
  const s = await startServer({ slug: 'sbtest', mode: 'server', checkout: co, port }, { sandbox: true, startupSeconds: 30 });
  try {
    assert.equal(await (await fetch(`http://localhost:${port}/`)).text(), 'ui');
    for (let i = 0; i < 20 && !(await fetch(`http://127.0.0.1:${port + 1}/`).then(() => true, () => false)); i++) await new Promise((r) => setTimeout(r, 200));
    assert.equal(await (await fetch(`http://127.0.0.1:${port + 1}/`)).text(), 'api');
    assert.equal(fs.readFileSync(path.join(co, '.ui-capture', 'homewrite.txt'), 'utf8').trim(), 'no');
    assert.equal(fs.readFileSync(path.join(co, '.ui-capture', 'dns.txt'), 'utf8'), 'blocked');
  } finally {
    await s.stop();
  }
  await assert.rejects(fetch(`http://localhost:${port}/`));
});
