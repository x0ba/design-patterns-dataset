// Local server for SpeechGPT UI capture.
// - Serves the production build in ./out (SPA fallback to index.html)
// - Stubs the OpenAI Chat Completions API at /v1/chat/completions
// - Stubs Vercel Web Analytics endpoints (/_vercel/insights/*)
import { join, normalize } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { replyFor } from './openai-stub';

const PORT = Number(process.env.PORT || 4443);
const OUT = join(import.meta.dir, 'out');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (path === '/v1/chat/completions' && req.method === 'POST') {
      let body: any = {};
      try {
        body = await req.json();
      } catch {}
      const messages: { role: string; content: string }[] = body.messages || [];
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      const content = replyFor(lastUser?.content || '', messages);
      const promptTokens = Math.ceil(JSON.stringify(messages).length / 4);
      const completionTokens = Math.ceil(content.length / 4);
      await Bun.sleep(700 + Math.random() * 600);
      return Response.json(
        {
          id: 'chatcmpl-' + crypto.randomUUID().replace(/-/g, '').slice(0, 29),
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: body.model || 'gpt-3.5-turbo',
          choices: [
            { index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }
          ],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens
          }
        },
        { headers: cors }
      );
    }

    if (path.startsWith('/_vercel/insights')) {
      if (path.endsWith('.js'))
        return new Response('/* analytics stub */', {
          headers: { 'Content-Type': 'application/javascript' }
        });
      return new Response(null, { status: 204 });
    }

    const rel = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
    let file = join(OUT, rel);
    if (!file.startsWith(OUT) || !existsSync(file) || statSync(file).isDirectory()) {
      file = join(OUT, 'index.html');
    }
    // Read into memory rather than Response(Bun.file()) — sendfile() is denied in the sandbox.
    const bytes = readFileSync(file);
    return new Response(bytes, {
      headers: {
        'Content-Type': Bun.file(file).type || 'application/octet-stream',
        'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'
      }
    });
  }
});

console.log(`SpeechGPT running at http://localhost:${PORT}/`);
