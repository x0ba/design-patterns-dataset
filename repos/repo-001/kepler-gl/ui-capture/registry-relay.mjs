// Install-time helper only (not used at runtime): a localhost relay to the yarn
// registry. Yarn 4's built-in proxy tunnel was extremely slow/unreliable through
// the sandbox's HTTPS proxy, while Node's fetch (NODE_USE_ENV_PROXY=1) is fast.
// Usage: NODE_USE_ENV_PROXY=1 node registry-relay.mjs 5873
import http from 'node:http';
import {Readable} from 'node:stream';

const port = Number(process.argv[2] || 5873);
const upstream = 'https://registry.yarnpkg.com';

http
  .createServer(async (req, res) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const r = await fetch(upstream + req.url, {
          headers: {accept: req.headers.accept || '*/*'}
        });
        const headers = {};
        for (const k of ['content-type', 'etag', 'last-modified']) {
          const v = r.headers.get(k);
          if (v) headers[k] = v;
        }
        const body = Buffer.from(await r.arrayBuffer());
        headers['content-length'] = body.length;
        res.writeHead(r.status, headers);
        res.end(body);
        return;
      } catch (e) {
        if (attempt === 4) {
          res.writeHead(502);
          res.end(String(e));
        }
      }
    }
  })
  .listen(port, '127.0.0.1', () => console.log(`relay on ${port}`));
