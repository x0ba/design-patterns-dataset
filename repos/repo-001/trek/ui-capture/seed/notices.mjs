// Dismisses the active system notices (release-notes modal etc.) for the main user,
// as an established user would have done long ago. Usage: node notices.mjs <base>
import { client } from './api.mjs';
const c = client(process.argv[2] || 'http://localhost:5460');
await c.login('maya@trek.local', 'Wanderlust2026!');
for (let round = 0; round < 3; round++) {
  const active = await c.get('/api/system-notices/active?supports=release&ui=5.1.4');
  if (!active.length) break;
  for (const n of active) { await c.post(`/api/system-notices/${encodeURIComponent(n.id)}/dismiss`, {}); console.log('[notices] dismissed', n.id); }
}
console.log('[notices] remaining', (await c.get('/api/system-notices/active?supports=release&ui=5.1.4')).length);
