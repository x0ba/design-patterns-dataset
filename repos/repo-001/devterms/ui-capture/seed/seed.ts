// Seeds the DevTerms database through the app's own Drizzle schema.
// Run: pnpm exec tsx .ui-capture/seed/seed.ts   (TURSO_DATABASE_URL must point at the stub)
import { createClient } from '@libsql/client/web';
import { drizzle } from 'drizzle-orm/libsql';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as schema from '@/server/db/schema';
import { ALT, BASE, PENDING, REJECTED } from './terms.mjs';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN
});
const db = drizzle(client, { schema, casing: 'snake_case' });

// ---------- deterministic randomness ----------
let seed = 20261117;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(a: readonly T[]) => a[Math.floor(rand() * a.length)]!;
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const rid = (prefix: string) =>
  `${prefix}_${Array.from({ length: 16 }, () => pick(ID_CHARS.split(''))).join('')}`;

const NOW = new Date('2026-11-17T15:00:00Z').getTime();
const DAY = 86_400_000;
const ts = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const between = (fromIso: string, toMs = NOW) => {
  const from = new Date(fromIso).getTime();
  return from + rand() * (toMs - from);
};

const AVATAR_BASE = process.env.STUB_AVATAR_BASE ?? 'http://localhost:4486/avatars/u';

// ---------- users ----------
const githubUser = JSON.parse(
  readFileSync(join(__dirname, '..', 'stubs', 'github-user.json'), 'utf8')
);

type U = typeof schema.users.$inferInsert;
const users: U[] = [];
const mkUser = (name: string, role: U['role'], createdMs: number, githubId?: number, email?: string): U => {
  const gid = githubId ?? int(1_200_000, 168_000_000);
  const u: U = {
    id: name === 'devterms' ? 'user_SvltYFQtlIZvYJKo' : rid('user'),
    name,
    role,
    email: email ?? `${name.replace(/[^a-z0-9]/gi, '').toLowerCase()}@${pick(['gmail.com', 'gmail.com', 'gmail.com', 'outlook.com', 'proton.me', 'fastmail.com', 'icloud.com', 'hey.com', 'users.noreply.github.com'])}`,
    avatar: `${AVATAR_BASE}/${gid}?v=4`,
    githubId: gid,
    createdAt: ts(createdMs) as unknown as number
  };
  users.push(u);
  return u;
};

const bot = mkUser('devterms', 'bot', new Date('2024-08-02T19:14:03Z').getTime(), 177245001, 'bot@devterms.io');
const me = mkUser(githubUser.login, 'moderator', new Date('2024-08-21T16:42:10Z').getTime(), githubUser.id, githubUser.email);
const mod2 = mkUser('ravi-codes', 'moderator', new Date('2024-08-09T03:11:52Z').getTime());

const CONTRIBUTORS = [
  'sarahdrasner-fan', 'tmcclure', 'nikolai-v', 'jessicalim', 'b-okonkwo', 'quietbyte', 'lucaspereira',
  'hannahwhitfield', 'mfrancois', 'devhanna', 'zeynep-k', 'oscarlindqvist', 'aishanair', 'tomasz-w',
  'cassidyreyes', 'emre', 'fernandagomes', 'jkowalczyk', 'leo-zhang', 'nightowl-dev', 'pdubois',
  'rustacean42', 'samuel-adeyemi', 'tiagomarques', 'wen-li', 'yusuf-dev', 'chloe-bennett', 'dan-abrams',
  'idris', 'matt-g', 'nora-sk', 'refactor-rachel', 'sudo-sam', 'vikram-iyer', 'gabriellefox',
  'xander_codes', 'kofi-mensah', 'lena-schmidt', 'hiro-t', 'malloc_mel'
];
const contributors = CONTRIBUTORS.map((n) => mkUser(n, 'user', between('2024-08-06T00:00:00Z', NOW - 30 * DAY)));

// Users who signed in but never contributed (they count as "Contributors" on the home page stats).
const FIRST = ['alex', 'jordan', 'sam', 'taylor', 'casey', 'morgan', 'riley', 'jamie', 'avery', 'quinn', 'drew', 'kai', 'noah', 'mia', 'eli', 'zoe', 'omar', 'ines', 'yara', 'ben', 'ivy', 'luis', 'ana', 'theo', 'max', 'nina', 'ola', 'raj', 'sven', 'tara'];
const LAST = ['dev', 'codes', 'builds', 'hq', 'io', 'js', 'py', 'rs', 'ops', 'm', 'k', 'w', 'b', 'x', '99', '07', '2001', 'lab', 'hacks', 'web'];
const SEP = ['', '-', '_', ''];
const lurkerNames = new Set<string>();
while (lurkerNames.size < 128) lurkerNames.add(`${pick(FIRST)}${pick(SEP)}${pick(LAST)}`);
for (const n of lurkerNames) {
  if (users.some((u) => u.name === n)) continue;
  mkUser(n, 'user', between('2024-08-06T00:00:00Z'));
}

// ---------- definitions ----------
type D = typeof schema.definitions.$inferInsert;
const defs: D[] = [];

const ME_APPROVED = new Set(['Bikeshedding', 'Nerd sniping', 'N+1 query problem', 'Idempotent', 'Yak shaving', 'Observability', 'Eventual consistency', 'Heisenbug', 'Thundering herd', 'Backpressure', 'Rubber duck debugging']);
const ME_ALT = new Set(['DNS', 'Cache invalidation']);
const ME_PENDING = new Set(['Thundering herd', 'Backpressure', 'Postmortem']);
const BOT_TERMS = new Set(['API', 'Algorithm', 'Backend', 'Frontend', 'Cache', 'CI/CD', 'Closure', 'Container', 'CORS', 'CRUD', 'DNS', 'Docker', 'DRY', 'Git', 'GraphQL', 'JSON', 'JWT', 'Kubernetes', 'Latency', 'Linter', 'ORM', 'Pagination', 'REST', 'SDK', 'SQL injection', 'SSR', 'TypeScript', 'Unit test', 'WebSocket', 'Webhook', 'XSS', 'YAML', 'Async/await', 'Event loop', 'Garbage collection', 'Hash function', 'Regex', 'Semantic versioning', 'Middleware', 'Load balancer']);

const votesFor = (createdMs: number, boost = 1) => {
  const ageDays = (NOW - createdMs) / DAY;
  const pop = rand() < 0.12 ? 3.5 : rand() < 0.4 ? 1.6 : 0.7;
  const up = Math.max(0, Math.round(Math.pow(ageDays, 0.62) * pop * boost * (0.4 + rand())));
  const controversial = rand() < 0.08;
  const down = Math.round(up * (controversial ? 0.5 + rand() * 0.6 : rand() * 0.18));
  return { upvotes: up, downvotes: down };
};

for (const [term, definition, example] of BASE) {
  let user = pick(contributors);
  let createdMs = between('2024-08-20T00:00:00Z', NOW - 3 * DAY);
  if (BOT_TERMS.has(term)) {
    user = bot;
    createdMs = new Date('2024-08-04T21:00:00Z').getTime() + int(0, 240) * 1000;
  } else if (ME_APPROVED.has(term)) {
    user = me;
    createdMs = between('2024-09-01T00:00:00Z', NOW - 5 * DAY);
  }
  defs.push({ id: rid('def'), userId: user.id, status: 'approved', term, definition, example, ...votesFor(createdMs), createdAt: ts(createdMs) as unknown as number });
}

for (const [term, definition, example] of ALT) {
  const user = ME_ALT.has(term) ? me : pick(contributors);
  const createdMs = between('2024-10-01T00:00:00Z', NOW - 2 * DAY);
  defs.push({ id: rid('def'), userId: user.id, status: 'approved', term, definition, example, ...votesFor(createdMs, 1.3), createdAt: ts(createdMs) as unknown as number });
}

PENDING.forEach(([term, definition, example], i) => {
  const user = ME_PENDING.has(term) ? me : i % 3 === 0 ? pick(contributors) : pick(users.slice(43));
  const createdMs = NOW - int(2, 21 * 24) * 3_600_000;
  defs.push({ id: rid('def'), userId: user.id, status: 'pending', term, definition, example, upvotes: 0, downvotes: 0, createdAt: ts(createdMs) as unknown as number });
});

REJECTED.forEach(([term, definition, example]) => {
  const user = pick(users.slice(43));
  const createdMs = between('2024-09-15T00:00:00Z', NOW - 7 * DAY);
  defs.push({ id: rid('def'), userId: user.id, status: 'rejected', term, definition, example, upvotes: 0, downvotes: 0, createdAt: ts(createdMs) as unknown as number });
});
// One of the signed-in user's own submissions that was turned down as a near-duplicate.
defs.push({
  id: rid('def'), userId: me.id, status: 'rejected', term: 'Idempotency',
  definition: 'Same as idempotent — doing it twice is the same as doing it once.',
  example: 'Retrying the payment request is safe because of idempotency.',
  upvotes: 0, downvotes: 0, createdAt: ts(new Date('2025-02-11T09:27:44Z').getTime()) as unknown as number
});

// ---------- word of the day history ----------
type W = typeof schema.wotds.$inferInsert;
const wotds: W[] = [];
const approved = defs.filter((d) => d.status === 'approved');
const recent: string[] = [];
const firstWotd = new Date('2025-03-01T14:00:00Z').getTime();
const days = Math.floor((NOW - firstWotd) / DAY);
for (let i = 0; i <= days; i++) {
  const dayMs = firstWotd + i * DAY + int(0, 40) * 1000;
  let d: D;
  if (i === days) d = approved.find((x) => x.term === 'Yak shaving')!;
  else if (i === days - 1) d = approved.find((x) => x.term === 'Footgun')!;
  else if (i === days - 2) d = approved.find((x) => x.term === 'Vibe coding' && x.userId !== me.id)!;
  else {
    do d = pick(approved);
    while (recent.includes(d.id!) || Number(new Date(String(d.createdAt).replace(' ', 'T') + 'Z')) > dayMs || ['Yak shaving', 'Footgun', 'Vibe coding'].includes(d.term));
  }
  recent.push(d.id!);
  if (recent.length > 80) recent.shift();
  wotds.push({ id: rid('wotd'), definitionId: d.id!, createdAt: ts(dayMs) as unknown as number });
  // Being word of the day brings a bump of votes
  d.upvotes = (d.upvotes ?? 0) + int(3, 25);
  d.downvotes = (d.downvotes ?? 0) + int(0, 3);
}

// ---------- reports ----------
type R = typeof schema.reports.$inferInsert;
// [reason, term the report is about (picks the jokier/alt definition when one exists)]
const REASONS: [string, string][] = [
  ['This is a joke definition, not an actual explanation of the term.', 'Kubernetes'],
  ['Duplicate of an existing definition for the same term.', 'Legacy code'],
  ['The example is wrong — the PUT example is fine but the text implies POST is idempotent too.', 'Idempotent'],
  ['Mentions a real coworker in the example? "He calls himself a 10x engineer" feels targeted.', '10x engineer'],
  ['Outdated. Callbacks haven\'t been the recommended way since ES2017, example should use async/await.', 'Event loop'],
  ['spam', 'MVP'],
  ['Definition is misleading: eventual consistency does not mean data can be lost.', 'Eventual consistency'],
  ['Typo in the example code, missing closing parenthesis.', 'Closure'],
  ['Not really a developer term?', 'Dark mode'],
  ['This reads like an ad for a specific product.', 'Docker'],
  ['The regex in the example doesn\'t match what the text says it matches.', 'Regex'],
  ['Low effort, doesn\'t explain anything.', 'Legacy code'],
  ['Factually incorrect: Kubernetes was originally designed at Google, not Docker.', 'Kubernetes'],
  ['Example mentions bcrypt but the definition itself suggests SHA-256 is fine for passwords.', 'Hash function'],
  ['Joke answer, should be removed or merged with the real one.', 'Serverless'],
  ['The "Norway problem" only applies to YAML 1.1, not 1.2. Misleading.', 'YAML'],
  ['Copied word for word from MDN.', 'CORS'],
  ['This one is just mean lol', 'Stack Overflow']
];
const reports: R[] = REASONS.map(([reason, term], i) => {
  const candidates = approved.filter((x) => x.term === term);
  const d = candidates[candidates.length - 1] ?? pick(approved);
  const createdMs = i % 3 === 0 ? NOW - int(1, 9 * 24) * 3_600_000 : between('2024-11-01T00:00:00Z', NOW - 10 * DAY);
  return {
    id: rid('rpt'),
    userId: pick(users).id,
    definitionId: d.id!,
    read: i % 3 !== 0,
    reason,
    createdAt: ts(createdMs) as unknown as number
  };
});

async function main() {
  await db.delete(schema.sessions);
  await db.delete(schema.reports);
  await db.delete(schema.wotds);
  await db.delete(schema.definitions);
  await db.delete(schema.users);

  const chunk = <T>(a: T[], n = 50) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
  for (const c of chunk(users)) await db.insert(schema.users).values(c);
  for (const c of chunk(defs)) await db.insert(schema.definitions).values(c);
  for (const c of chunk(wotds)) await db.insert(schema.wotds).values(c);
  for (const c of chunk(reports)) await db.insert(schema.reports).values(c);

  console.log(`Seeded ${users.length} users, ${defs.length} definitions (${approved.length} approved), ${wotds.length} words of the day, ${reports.length} reports`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
