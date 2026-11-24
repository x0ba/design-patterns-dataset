// Turns raw-dump.json (jsdom localStorage after the seed run) into out/seed.json:
//  - rewrites vitest asset URLs (/src/assets/...) to the hashed files of the production build
//  - drops RAM/session keys (the real app wipes those on reboot anyway)
import fs from 'node:fs'; import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(here, '../out');
const raw = JSON.parse(fs.readFileSync(path.join(here, 'raw-dump.json'), 'utf8'));
const built = fs.readdirSync(path.join(out, 'assets'));
const mapAsset = (name, ext) => {
  const hit = built.find(f => f.startsWith(name + '-') && f.endsWith('.' + ext) && f.length === name.length + 1 + 8 + 1 + ext.length);
  if (!hit) throw new Error('no built asset for ' + name + '.' + ext);
  return '/assets/' + hit;
};
const seed = {};
let rewrites = 0;
for (const [k, v] of Object.entries(raw)) {
  if (k.startsWith('session_') && !k.startsWith('session_windows_')) continue; // keep saved window layout
  seed[k] = v.replace(/(?:https?:\/\/localhost(?::\d+)?)?\/src\/assets\/(?:images|sounds)\/([^"\\]+?)\.(avif|opus|mp3|png|jpg)/g, (_, n, e) => { rewrites++; return mapAsset(decodeURIComponent(n), e); });
}
fs.writeFileSync(path.join(out, 'seed.json'), JSON.stringify(seed));
console.log(`seed.json: ${Object.keys(seed).length} keys, ${rewrites} asset URLs rewritten, ${(JSON.stringify(seed).length / 1024).toFixed(0)} KB`);
