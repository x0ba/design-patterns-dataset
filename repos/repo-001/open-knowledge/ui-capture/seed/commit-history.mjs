import { readFileSync, utimesSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const [root, manifestPath] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')).sort((a, b) => a.date.localeCompare(b.date));
const emails = { 'Maya Okafor': 'maya', 'Daniel Reyes': 'daniel', 'Priya Raman': 'priya', 'Tomasz Wójcik': 'tomasz', 'Aiko Tanaka': 'aiko', 'Sam Whitfield': 'sam', 'Lena Fischer': 'lena', 'Jordan Blake': 'jordan', 'Ravi Iyer': 'ravi', 'Chloe Martin': 'chloe' };
const groups = new Map();
for (const m of manifest) {
  const key = `${m.date.slice(0, 10)}|${m.author}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(m);
}
const git = (args, env = {}) => execFileSync('git', args, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
for (const [key, files] of groups) {
  const [, author] = key.split('|');
  const date = files[0].date;
  git(['add', '--', ...files.map((f) => f.path)]);
  const first = files[0].path;
  const verb = first.startsWith('meetings/') ? 'Add notes' : first.startsWith('postmortems/') ? 'Write up' : first.startsWith('decisions/') ? 'Record' : 'Add';
  const msg = files.length === 1 ? `${verb} ${first.replace(/\.md$/, '')}` : `${verb} ${files.length} docs (${[...new Set(files.map((f) => f.path.split('/')[0]))].join(', ')})`;
  git(['commit', '-q', '-m', msg], {
    GIT_AUTHOR_NAME: author, GIT_AUTHOR_EMAIL: `${emails[author] ?? 'eng'}@tidewater.io`, GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_NAME: author, GIT_COMMITTER_EMAIL: `${emails[author] ?? 'eng'}@tidewater.io`, GIT_COMMITTER_DATE: date,
  });
}
for (const m of manifest) { const t = new Date(m.date); utimesSync(join(root, m.path), t, t); }
