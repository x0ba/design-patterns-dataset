import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.yaml': 'text/yaml; charset=utf-8', '.jsonl': 'text/plain; charset=utf-8', '.webp': 'image/webp',
};

/** Streams `root/<segments>`, refusing anything that resolves outside `root`. */
export function serveFile(root: string, segments: string[]) {
  const base = path.resolve(root);
  const file = path.resolve(base, ...segments);
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }
  const body = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(body, {
    headers: { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' },
  });
}
