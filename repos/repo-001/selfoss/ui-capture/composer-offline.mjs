// Copies composer.json/lock into .ui-capture/, rewriting dist URLs from
// api.github.com (blocked in the sandbox) to codeload.github.com.
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const lock = JSON.parse(fs.readFileSync(root + 'composer.lock', 'utf8'));
for (const key of ['packages', 'packages-dev']) {
  for (const p of lock[key] || []) {
    if (p.dist && p.dist.url) {
      p.dist.url = p.dist.url.replace(
        /^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/zipball\/(.+)$/,
        'https://codeload.github.com/$1/$2/legacy.zip/$3');
    }
  }
}
fs.copyFileSync(root + 'composer.json', root + '.ui-capture/composer-offline.json');
fs.writeFileSync(root + '.ui-capture/composer-offline.lock', JSON.stringify(lock, null, 4));
