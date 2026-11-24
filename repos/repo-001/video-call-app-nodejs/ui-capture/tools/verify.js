// Acts like the browser client: fetches page + assets, joins the seeded room, counts chat received.
const { io } = require('../stubs/node_modules/socket.io-client');
const base = `http://127.0.0.1:${process.env.PORT || 5441}`;
(async () => {
  const html = await (await fetch(base + '/')).text();
  const refs = [...html.matchAll(/(?:href|src)=['"]([^'"]+)['"]/g)].map(m => m[1]);
  for (const r of refs) { const res = await fetch(new URL(r, base + '/')); console.log(res.status, r); }
  const fa = await fetch(base + '/assets/vendor/fontawesome/webfonts/fa-solid-900.woff2'); console.log(fa.status, 'fa font');
  const j = await (await fetch(base + '/join')).text(); console.log('join:', j.replace(/\n/g, ' '));
  const s = io(base + '/stream', { transports: ['websocket'] });
  let n = 0; const senders = new Set();
  s.on('connect', () => s.emit('subscribe', { room: 'Tidewater_Weekly Sync_2813309571', socketId: s.io.engine.id }));
  s.on('chat', d => { n++; senders.add(d.sender); if (n <= 2) console.log(d); });
  setTimeout(() => { console.log('chat msgs:', n, [...senders]); process.exit(0); }, 3500);
})();
