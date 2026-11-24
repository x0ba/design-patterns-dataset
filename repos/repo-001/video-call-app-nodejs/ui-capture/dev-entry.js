// Preloaded with `node -r` in front of src/app.js (no change to the app code).
// Adds GET /join?room=..&name=.. : the app keeps the caller's display name in
// sessionStorage (set by its own Create Room / Enter Room forms). This route is
// the "dev sign-in" equivalent: it sets that same key and forwards to the room.
const http = require('http');
const origListen = http.Server.prototype.listen;
const DEFAULT_ROOM = process.env.SEED_ROOM || 'Tidewater_Weekly Sync_2813309571';
const DEFAULT_NAME = process.env.SEED_USER || 'Sam Okafor';

http.Server.prototype.listen = function (...args) {
  const handlers = this.listeners('request');
  this.removeAllListeners('request');
  this.on('request', (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && u.pathname === '/join') {
      const room = u.searchParams.get('room') || DEFAULT_ROOM;
      const name = u.searchParams.get('name') || DEFAULT_NAME;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(`<!DOCTYPE html><script>
sessionStorage.setItem('username', ${JSON.stringify(name)});
location.replace('/?room=' + ${JSON.stringify(encodeURIComponent(room))});
</script>`);
      return;
    }
    for (const h of handlers) h.call(this, req, res);
  });
  return origListen.apply(this, args);
};
