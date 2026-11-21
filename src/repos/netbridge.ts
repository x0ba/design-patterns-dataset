// Port bridge for apps served in a Linux network namespace (bubblewrap
// --unshare-net, src/repos/sandbox.ts). Inside, the app has only its own
// loopback, so nothing it runs can reach the network; the browser on the host
// still has to reach it on localhost:<port>.
//
// Inside the sandbox, INNER_SCRIPT (run with this node binary) watches
// /proc/net/tcp{,6} for listening sockets and exposes each port P as a Unix
// socket <dir>/<P>.sock that forwards to localhost:P. On the host, PortBridge
// watches <dir> and opens 127.0.0.1:P (and [::1]:P) for each socket, piping
// connections into it. All ports are bridged, not only $PORT, because some
// front ends call a backend on another port straight from the browser.
//
// The sandboxed app can write to <dir> too. The host connects only to entries
// that are sockets (lstat, so a symlink to a host socket such as an agent or
// docker socket is ignored) and only binds loopback ports that are free.

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

export const INNER_SCRIPT = String.raw`
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
const dir = process.argv[2];
const seen = new Map();
function listening() {
  const ports = new Map();
  for (const [file, v6] of [['/proc/net/tcp', false], ['/proc/net/tcp6', true]]) {
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const line of text.split('\n').slice(1)) {
      const f = line.trim().split(/\s+/);
      if (f.length < 4 || f[3] !== '0A') continue;
      const [addr, portHex] = f[1].split(':');
      const port = parseInt(portHex, 16);
      const loop = v6 ? addr === '00000000000000000000000001000000' : addr === '0100007F';
      const any = /^0+$/.test(addr);
      if (!loop && !any) continue;
      if (!ports.has(port) || !v6) ports.set(port, v6 && loop ? '::1' : '127.0.0.1');
    }
  }
  return ports;
}
function tick() {
  for (const [port, host] of listening()) {
    if (seen.has(port)) continue;
    const sock = path.join(dir, port + '.sock');
    try { fs.rmSync(sock, { force: true }); } catch {}
    const srv = net.createServer((c) => {
      const u = net.connect(port, host);
      c.pipe(u); u.pipe(c);
      c.on('error', () => u.destroy()); u.on('error', () => c.destroy());
    });
    srv.on('error', () => {});
    srv.listen(sock);
    seen.set(port, srv);
  }
}
setInterval(tick, 300);
tick();
`;

/** Host side: mirrors each <port>.sock in `dir` as a loopback TCP listener. */
export class PortBridge {
  private servers = new Map<number, net.Server[]>();
  private conns = new Set<net.Socket>();
  private timer: NodeJS.Timeout;
  readonly skipped = new Set<number>();

  private dir: string;
  private log?: (s: string) => void;

  constructor(dir: string, log?: (s: string) => void) {
    this.dir = dir;
    this.log = log;
    this.timer = setInterval(() => this.scan(), 300);
    this.timer.unref();
  }

  private scan(): void {
    let names: string[];
    try { names = fs.readdirSync(this.dir); } catch { return; }
    for (const n of names) {
      const m = /^(\d{1,5})\.sock$/.exec(n);
      if (!m) continue;
      const port = Number(m[1]);
      if (this.servers.has(port) || this.skipped.has(port) || port < 1024 || port > 65535) continue;
      const sock = path.join(this.dir, n);
      try { if (!fs.lstatSync(sock).isSocket()) continue; } catch { continue; }
      this.servers.set(port, []);
      for (const host of ['127.0.0.1', '::1']) {
        const srv = net.createServer((c) => {
          const u = net.connect({ path: sock });
          this.conns.add(c); this.conns.add(u);
          c.on('close', () => this.conns.delete(c)); u.on('close', () => this.conns.delete(u));
          c.pipe(u); u.pipe(c);
          c.on('error', () => u.destroy()); u.on('error', () => c.destroy());
        });
        srv.on('error', (e: NodeJS.ErrnoException) => {
          if (host === '127.0.0.1') {
            this.skipped.add(port);
            this.log?.(`  port bridge: cannot expose ${port} on the host (${e.code ?? e.message})`);
          }
        });
        srv.listen(port, host);
        this.servers.get(port)!.push(srv);
      }
    }
  }

  async close(): Promise<void> {
    clearInterval(this.timer);
    const closed = [...this.servers.values()].flat().map((s) => new Promise<void>((r) => s.close(() => r())));
    for (const c of this.conns) c.destroy();
    await Promise.all(closed);
    this.servers.clear();
  }
}
