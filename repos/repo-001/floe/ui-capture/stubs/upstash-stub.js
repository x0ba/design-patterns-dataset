// Minimal local stand-in for the Upstash Redis REST API, the one the signaling
// server's stats.js talks to (POST <url> with a JSON command array, Bearer token,
// answer {"result": ...}). Supports GET, SET, INCRBY, LRANGE, LLEN, DEL and PING;
// state is a JSON file so the counter survives restarts like the real thing.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.UPSTASH_STUB_PORT || 4481);
const TOKEN = process.env.UPSTASH_STUB_TOKEN || 'local-upstash-token';
const FILE = process.env.UPSTASH_STUB_FILE || path.join(__dirname, '..', 'data', 'upstash.json');

let db = {};
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { db = {}; }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, FILE);
  }, 200);
}

function run([cmd, ...args]) {
  switch (String(cmd).toUpperCase()) {
    case 'PING': return 'PONG';
    case 'GET': { const v = db[args[0]]; return v === undefined || Array.isArray(v) ? null : String(v); }
    case 'SET': db[args[0]] = String(args[1]); save(); return 'OK';
    case 'INCRBY': {
      const next = BigInt(db[args[0]] ?? '0') + BigInt(args[1]);
      db[args[0]] = next.toString(); save();
      return Number(next);
    }
    case 'DEL': { const had = args.filter((k) => k in db).length; args.forEach((k) => delete db[k]); save(); return had; }
    case 'LLEN': return Array.isArray(db[args[0]]) ? db[args[0]].length : 0;
    case 'LRANGE': {
      const list = Array.isArray(db[args[0]]) ? db[args[0]] : [];
      const start = Number(args[1]); let stop = Number(args[2]);
      if (stop < 0) stop = list.length + stop;
      return list.slice(start < 0 ? list.length + start : start, stop + 1);
    }
    default: throw new Error(`ERR unknown command '${cmd}'`);
  }
}

http.createServer((req, res) => {
  const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { error: 'Unauthorized' });
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    try {
      const command = JSON.parse(raw);
      if (!Array.isArray(command)) return send(400, { error: 'ERR expected a command array' });
      send(200, { result: run(command) });
    } catch (e) {
      send(400, { error: String(e.message || e) });
    }
  });
}).listen(PORT, '127.0.0.1', () => console.log(`upstash stub on http://127.0.0.1:${PORT} (${FILE})`));
