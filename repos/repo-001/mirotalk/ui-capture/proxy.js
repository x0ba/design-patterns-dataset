// Front proxy for offline UI capture.
// - Listens on PORT, forwards everything (HTTP + WebSocket upgrades for socket.io) to the MiroTalk server.
// - Rewrites absolute CDN URLs (jsdelivr, cdnjs, unpkg, Google Fonts, ...) inside text responses to /__ext/<host>/...
// - Serves /__ext/<host>/<path> from the local mirror built by vendor.mjs (no network needed at runtime).
'use strict';
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = parseInt(process.env.PORT || '4438', 10);
const UPSTREAM_PORT = parseInt(process.env.UPSTREAM_PORT || '4439', 10);
const vendorDir = path.join(__dirname, 'vendor');
const manifest = JSON.parse(fs.readFileSync(path.join(vendorDir, 'manifest.json'), 'utf8'));

const HOSTS = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'npmcdn.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'buttons.github.io',
    'webrtc.github.io',
];
const hostRe = new RegExp('https://(' + HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|') + ')/', 'g');
const rewrite = (s) => s.replace(hostRe, '/__ext/$1/');
const isText = (type) => /text\/|javascript|json|svg/.test(type || '');

function serveVendor(req, res) {
    const rest = req.url.slice('/__ext/'.length);
    const orig = 'https://' + rest;
    const entry = manifest[orig] || manifest[orig.split('?')[0]];
    if (!entry) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        return res.end('not mirrored: ' + orig);
    }
    let body = fs.readFileSync(path.join(vendorDir, entry.file));
    if (isText(entry.type)) body = Buffer.from(rewrite(body.toString('utf8')));
    res.writeHead(200, {
        'content-type': entry.type + (isText(entry.type) ? '; charset=utf-8' : ''),
        'content-length': body.length,
        'cache-control': 'public, max-age=86400',
        'access-control-allow-origin': '*',
    });
    res.end(body);
}

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/__ext/')) return serveVendor(req, res);
    const headers = { ...req.headers, 'accept-encoding': 'identity' };
    const up = http.request(
        { host: '127.0.0.1', port: UPSTREAM_PORT, method: req.method, path: req.url, headers },
        (ur) => {
            const type = ur.headers['content-type'] || '';
            if (!isText(type)) {
                res.writeHead(ur.statusCode, ur.headers);
                return ur.pipe(res);
            }
            const chunks = [];
            ur.on('data', (c) => chunks.push(c));
            ur.on('end', () => {
                let buf = Buffer.concat(chunks);
                const enc = ur.headers['content-encoding'];
                try {
                    if (enc === 'gzip') buf = zlib.gunzipSync(buf);
                    else if (enc === 'br') buf = zlib.brotliDecompressSync(buf);
                    else if (enc === 'deflate') buf = zlib.inflateSync(buf);
                } catch (_) {}
                const out = Buffer.from(rewrite(buf.toString('utf8')));
                const h = { ...ur.headers };
                delete h['content-encoding'];
                delete h['etag'];
                delete h['transfer-encoding'];
                h['content-length'] = out.length;
                res.writeHead(ur.statusCode, h);
                res.end(out);
            });
        },
    );
    up.on('error', (e) => {
        res.writeHead(502, { 'content-type': 'text/plain' });
        res.end('upstream error: ' + e.message);
    });
    req.pipe(up);
});

// WebSocket / upgrade passthrough (socket.io)
server.on('upgrade', (req, socket, head) => {
    const up = net.connect(UPSTREAM_PORT, '127.0.0.1', () => {
        let raw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
        for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
        up.write(raw + '\r\n');
        if (head && head.length) up.write(head);
        up.pipe(socket);
        socket.pipe(up);
    });
    up.on('error', () => socket.destroy());
    socket.on('error', () => up.destroy());
});

server.listen(PORT, () => console.log(`[proxy] http://localhost:${PORT} -> 127.0.0.1:${UPSTREAM_PORT}`));
