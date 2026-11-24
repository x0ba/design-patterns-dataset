// Prefetch every tarball referenced by yarn.lock into the yarn offline mirror
// (./.ui-capture/vendor). Tarballs that contain paths the capture sandbox refuses
// to write (.vscode/, .idea/, shell rc files) are repacked without those paths
// and their yarn.lock hash/integrity is updated accordingly.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const lockPath = path.join(root, 'yarn.lock');
const mirror = path.join(root, '.ui-capture/vendor');
fs.mkdirSync(mirror, { recursive: true });
const BLOCKED = /(^|\/)(\.vscode|\.idea)(\/|$)|(^|\/)\.(gitconfig|bashrc|zshrc|profile|bash_profile|zprofile|zshenv|gitmodules)$/;
const RE = /\/(?:(@[^/]+)(?:\/|%2f))?[^/]+\/(?:-|_attachments)\/(?:@[^/]+\/)?([^/]+)$/;

let lock = fs.readFileSync(lockPath, 'utf8');
const urls = [...new Set([...lock.matchAll(/resolved "([^"#]+)(?:#[0-9a-f]+)?"/g)].map((m) => m[1]))];
console.log('tarballs:', urls.length);

function mirrorName(u) {
    const p = new URL(u).pathname;
    const m = p.match(RE);
    return m ? (m[1] ? `${m[1]}-${m[2]}` : m[2]) : path.basename(p);
}

async function download(u, dest) {
    for (let i = 0; i < 6; i++) {
        try {
            const res = await fetch(u.replace('registry.yarnpkg.com', 'registry.npmjs.org'));
            if (!res.ok) throw new Error(res.status + ' ' + u);
            fs.writeFileSync(dest + '.part', Buffer.from(await res.arrayBuffer()));
            fs.renameSync(dest + '.part', dest);
            return;
        } catch (e) {
            if (i === 5) throw e;
            await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
    }
}

const repacked = [];
let done = 0;
async function handle(u) {
    const dest = path.join(mirror, mirrorName(u));
    if (!fs.existsSync(dest)) await download(u, dest);
    const entries = execFileSync('tar', ['tzf', dest], { maxBuffer: 1 << 28 }).toString().split('\n').filter(Boolean);
    const bad = entries.filter((e) => BLOCKED.test(e));
    if (bad.length) {
        const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'repack-'));
        const excludes = bad.flatMap((b) => ['--exclude', b.replace(/\/$/, '')]);
        execFileSync('tar', ['xzf', dest, '-C', tmp, ...excludes]);
        const tops = fs.readdirSync(tmp);
        execFileSync('tar', ['czf', dest, '-C', tmp, ...tops]);
        fs.rmSync(tmp, { recursive: true, force: true });
        repacked.push(u);
    }
    if (bad.length || /npm-serialize-javascript/.test(u)) {
        const buf = fs.readFileSync(dest);
        const sha1 = crypto.createHash('sha1').update(buf).digest('hex');
        const sri = 'sha512-' + crypto.createHash('sha512').update(buf).digest('base64');
        const esc = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        lock = lock.replace(new RegExp(`resolved "${esc}(#[0-9a-f]+)?"\\n(\\s+)integrity \\S+`, 'g'), (_m, _h, sp) => `resolved "${u}#${sha1}"\n${sp}integrity ${sri}`);
    }
    if (++done % 100 === 0) console.log('done', done);
}

const queue = [...urls];
await Promise.all(
    Array.from({ length: 16 }, async () => {
        while (queue.length) await handle(queue.shift());
    })
);
fs.writeFileSync(lockPath, lock);
console.log('repacked:', repacked);
