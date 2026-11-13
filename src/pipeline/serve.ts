// Static server for generated apps. Each app is served at the root of its own
// origin, http://<slug>.localhost:<port>/ (Chromium resolves *.localhost to
// loopback), so builds that use absolute asset paths (/assets/...) work as-is
// and apps cannot share storage or service workers with each other.

import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

export const LOCAL_PORT = 4318;

export const localUrl = (slug: string, port = LOCAL_PORT) => `http://${slug}.localhost:${port}/`;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.csv': 'text/csv; charset=utf-8',
};

export interface LocalServer {
  port: number;
  /** Serve `dir` at http://<slug>.localhost:<port>/ (replaces an earlier mapping). */
  mount(slug: string, dir: string): string;
  unmount(slug: string): void;
  close(): Promise<void>;
}

/** Resolve a request path inside `root`, or undefined if it escapes it or does not exist. */
export function resolveStatic(root: string, urlPath: string): string | undefined {
  let rel: string;
  try { rel = decodeURIComponent(urlPath.split('?')[0].split('#')[0]); } catch { return undefined; }
  const file = path.resolve(root, '.' + path.posix.normalize('/' + rel));
  if (file !== root && !file.startsWith(root + path.sep)) return undefined;
  for (const candidate of [file, path.join(file, 'index.html'), file + '.html']) {
    try { if (fs.statSync(candidate).isFile()) return candidate; } catch { /* next */ }
  }
  return undefined;
}

export async function startLocalServer(port = LOCAL_PORT): Promise<LocalServer> {
  const mounts = new Map<string, string>();
  const server = http.createServer((req, res) => {
    const host = (req.headers.host ?? '').split(':')[0].toLowerCase();
    const slug = host.endsWith('.localhost') ? host.slice(0, -'.localhost'.length) : '';
    const root = mounts.get(slug);
    if (!root) { res.writeHead(404, { 'content-type': 'text/plain' }).end(`No app mounted for "${host}"`); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    const urlPath = req.url ?? '/';
    let file = resolveStatic(root, urlPath);
    // SPA fallback: extensionless routes get index.html; missing assets stay 404.
    if (!file && !path.posix.extname(urlPath.split('?')[0])) file = resolveStatic(root, '/index.html');
    if (!file) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const actual = (server.address() as AddressInfo).port;
  return {
    port: actual,
    mount(slug, dir) {
      mounts.set(slug.toLowerCase(), path.resolve(dir));
      return localUrl(slug, actual);
    },
    unmount(slug) { mounts.delete(slug.toLowerCase()); },
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }),
  };
}
