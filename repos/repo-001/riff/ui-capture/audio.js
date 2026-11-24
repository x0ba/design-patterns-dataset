'use strict';
// Generated audio stream (stand-in for YouTube/SoundCloud media streams resolved by yt-dlp).
// A soft, slowly evolving chord pad, deterministic per track id; supports HTTP Range for seeking.
const crypto = require('crypto');
const RATE = 16000;
const cache = new Map();
function build(id, seconds) {
  const key = id + ':' + seconds;
  if (cache.has(key)) return cache.get(key);
  const h = crypto.createHash('md5').update(id).digest();
  const root = 110 * Math.pow(2, (h[0] % 12) / 12);
  const chords = [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]].map(c => c.map(n => root * Math.pow(2, n / 12)));
  const n = Math.max(1, Math.min(seconds, 900)) * RATE;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  const barLen = RATE * 4;
  for (let i = 0; i < n; i++) {
    const bar = Math.floor(i / barLen) % 4, pos = (i % barLen) / barLen;
    const env = Math.min(1, pos * 8) * (1 - Math.max(0, pos - 0.85) * 4);
    const t = i / RATE;
    let s = 0;
    for (const f of chords[bar]) s += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    const beat = (i % (RATE / 2)) / (RATE / 2);
    s = s * 0.09 * env + Math.sin(2 * Math.PI * 55 * t) * Math.exp(-beat * 9) * 0.25;
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(s * 32767 * 0.8))), 44 + i * 2);
  }
  if (cache.size > 6) cache.delete(cache.keys().next().value);
  cache.set(key, buf);
  return buf;
}
function handle(req, res, u, CORS) {
  const id = decodeURIComponent(u.pathname.split('/').pop().replace(/\.wav$/, ''));
  const secs = Math.round(Number(u.searchParams.get('d')) || 200);
  const buf = build(id, secs);
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? Math.min(parseInt(m[2], 10), buf.length - 1) : buf.length - 1;
    res.writeHead(206, { ...CORS, 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${buf.length}`, 'Content-Length': end - start + 1 });
    return res.end(buf.subarray(start, end + 1));
  }
  res.writeHead(200, { ...CORS, 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': buf.length });
  res.end(buf);
}
module.exports = { handle };
