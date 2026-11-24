// Verification without a browser: serve ./out on 5469 (serve.mjs), fetch index.html, the seed script and walk the
// full static + dynamic ES-module import graph (importmap aware), failing on any 404 / fallback-to-HTML response.
import { spawn } from 'node:child_process';
const srv = spawn(process.execPath, [new URL('./serve.mjs', import.meta.url).pathname], { env: { ...process.env, PORT: '5469' } });
await new Promise((r) => setTimeout(r, 500));
const base = 'http://localhost:5469/';
const map = { three: '/vendor/three/three.module.js', 'three/addons/': '/vendor/three/addons/' };
const html = await (await fetch(base)).text();
const bad = [];
if (!html.includes('<script src="./seed-save.js"></script>')) bad.push('seed tag missing');
const seed = await (await fetch(base + 'seed-save.js')).text();
if (!seed.includes('voxel-musou.save')) bad.push('seed-save.js wrong');
const seen = new Set(), queue = ['/src/main.js'];
const extra = [...html.matchAll(/url\(\.\/(src\/[^)]+)\)/g)].map((m) => '/' + m[1]);
while (queue.length) {
  const u = queue.pop();
  if (seen.has(u)) continue;
  seen.add(u);
  const res = await fetch(base.slice(0, -1) + u), t = await res.text();
  if (!res.ok || t.startsWith('<!doctype')) { bad.push(u); continue; }
  for (const m of t.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g)) {
    const s = m[1] || m[2] || m[3];
    let p;
    if (s === 'three') p = map.three;
    else if (s.startsWith('three/addons/')) p = map['three/addons/'] + s.slice(13);
    else if (s.startsWith('.')) p = new URL(s, 'http://x' + u).pathname;
    else continue;
    queue.push(p);
  }
}
for (const u of extra) { const r = await fetch(base.slice(0, -1) + u); if (!r.ok || r.headers.get('content-type').includes('html')) bad.push(u); }
srv.kill();
console.log(`modules resolved: ${seen.size}, assets: ${extra.length}, problems: ${bad.length ? bad.join(', ') : 'none'}`);
process.exit(bad.length ? 1 : 0);
