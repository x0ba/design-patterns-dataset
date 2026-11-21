import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.yaml': 'text/yaml; charset=utf-8', '.jsonl': 'text/plain; charset=utf-8', '.webp': 'image/webp',
};

/**
 * Streams `root/<segments>`, refusing anything that resolves outside `root`.
 * Files carry an ETag from their size and mtime, so the browser revalidates
 * each view (the pipeline rewrites them) but gets a 304 instead of the whole
 * file when nothing changed. That matters over a slow port forward.
 */
export function serveFile(req: Request, root: string, segments: string[]) {
  const base = path.resolve(root);
  const file = path.resolve(base, ...segments);
  const stat = file.startsWith(base + path.sep) ? fs.statSync(file, { throwIfNoEntry: false }) : undefined;
  if (!stat?.isFile()) return Response.json({ error: 'not found' }, { status: 404 });
  const etag = `W/"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;
  const headers = { etag, 'last-modified': stat.mtime.toUTCString(), 'cache-control': 'no-cache' };
  const match = req.headers.get('if-none-match');
  if (match && match.split(',').some((t) => t.trim() === etag || t.trim() === '*')) {
    return new Response(null, { status: 304, headers });
  }
  const body = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(body, {
    headers: { ...headers, 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' },
  });
}
