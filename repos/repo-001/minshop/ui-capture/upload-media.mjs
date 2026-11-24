// Uploads every image in <dir> through minshop's admin media API (the same path
// as Admin -> Media) and prints {"<file name>": "<R2 image_key>"} as JSON.
//   node upload-media.mjs <origin> <cookie-jar> <dir>
import { readdirSync, readFileSync } from 'node:fs';
const [origin, jar, dir] = process.argv.slice(2);
const cookie = readFileSync(jar, 'utf8').split('\n').filter((l) => l.includes('admin_session'))
  .map((l) => { const p = l.split('\t'); return `${p[5]}=${p[6]}`; }).join('; ');
const map = {};
for (const name of readdirSync(dir).filter((f) => /\.(jpe?g|png)$/.test(f)).sort()) {
  const fd = new FormData();
  fd.append('files', new Blob([readFileSync(`${dir}/${name}`)], { type: name.endsWith('.png') ? 'image/png' : 'image/jpeg' }), name);
  const res = await fetch(`${origin}/api/admin/media`, { method: 'POST', body: fd, headers: { cookie, accept: 'application/json', origin } });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${await res.text()}`);
  const body = await res.json();
  const item = (body.uploaded || body.media || body.items || [body])[0];
  map[name] = item.imageKey;
}
console.log(JSON.stringify(map, null, 2));
console.error(`uploaded ${Object.keys(map).length} images`);
