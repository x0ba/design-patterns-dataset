import { subscribe } from '@/lib/live';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (s: string) => {
        try { controller.enqueue(enc.encode(s)); } catch { cleanup(); }
      };
      send('retry: 2000\n\n');
      send(`event: hello\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
      const unsubscribe = subscribe((changes) => send(`event: change\ndata: ${JSON.stringify({ changes })}\n\n`));
      // Keeps idle connections open through proxies and lets the page notice a dead server.
      const ping = setInterval(() => send(': ping\n\n'), 20_000);
      cleanup = () => {
        clearInterval(ping);
        unsubscribe();
      };
      req.signal.addEventListener('abort', () => {
        cleanup();
        try { controller.close(); } catch {}
      });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store, no-transform', connection: 'keep-alive' },
  });
}
