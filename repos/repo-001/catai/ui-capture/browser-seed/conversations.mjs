// Chat sessions for the seeded user (Maya, a full-stack developer using catai daily for ~5 months).
// turns: [userText, thoughtText|null, answerMarkdown]; daysAgo/hour (UTC) place each chat in time.
// Thought segments are only kept for chats after the thinking model was installed (see generate.mjs).
const T = (u, th, a) => [u, th, a];

export const CONVERSATIONS = [
    {daysAgo: 0, hour: 7, turns: [
        T('why does my useEffect run twice in dev?',
            'React 18 StrictMode double-invokes effects in development to surface missing cleanups. Explain and show an abortable fetch.',
            'That\'s **React 18 StrictMode**. In development it mounts → unmounts → re-mounts every component once, so effects run twice. It doesn\'t happen in production builds.\n\nIt\'s there to catch effects that don\'t clean up after themselves. Make sure yours returns a cleanup:\n\n```tsx\nuseEffect(() => {\n  const ctrl = new AbortController();\n  fetch(`/api/orders/${id}`, {signal: ctrl.signal})\n    .then(r => r.json())\n    .then(setOrder)\n    .catch(err => { if (err.name !== \'AbortError\') setError(err); });\n\n  return () => ctrl.abort();\n}, [id]);\n```\n\nWith the abort in place, the first request is cancelled and you only get one state update.'),
        T('ok and if I use react-query instead?',
            'TanStack Query dedupes requests by key, so StrictMode double mount does not cause double fetch effectively.',
            'Then you mostly stop caring. TanStack Query dedupes by query key, so the second mount just subscribes to the in-flight request:\n\n```tsx\nconst {data: order, error} = useQuery({\n  queryKey: [\'order\', id],\n  queryFn: ({signal}) => fetch(`/api/orders/${id}`, {signal}).then(r => r.json()),\n});\n```\n\nPassing `signal` through means it\'s also cancelled if the component unmounts for real.'),
    ]},
    {daysAgo: 0, hour: 6, turns: [
        T('standup notes from yesterday, make them bullet points:\nfinished the invoice pdf export, still waiting on design for the empty states, paired with jon on the flaky cypress test (it was a race on the toast), today: start on csv import validation',
            'Reformat into Yesterday / Today / Blockers bullets.',
            '**Yesterday**\n- Finished invoice PDF export\n- Paired with Jon on the flaky Cypress test — root cause was a race condition on the toast\n\n**Today**\n- Start CSV import validation\n\n**Blockers**\n- Waiting on design for the empty states'),
    ]},
    {daysAgo: 1, hour: 16, turns: [
        T('Write a regex that matches UK postcodes',
            'UK postcode format: outward code (1-2 letters, digit, optional letter/digit) + space + inward code (digit + 2 letters). Provide pragmatic regex plus caveat.',
            'A pragmatic one that covers real-world formats (`SW1A 1AA`, `M1 1AE`, `EC1V 9HX`, optional space, case-insensitive):\n\n```js\nconst UK_POSTCODE = /^([A-Z]{1,2}\\d[A-Z\\d]?)\\s?(\\d[A-Z]{2})$/i;\n\nUK_POSTCODE.test(\'SW1A 1AA\'); // true\nUK_POSTCODE.test(\'m11ae\');    // true\nUK_POSTCODE.test(\'12345\');    // false\n```\n\nIt validates the *shape* only — it won\'t tell you whether the postcode actually exists. For that you\'d need a lookup (e.g. against the ONS Postcode Directory).'),
    ]},
    {daysAgo: 1, hour: 11, turns: [
        T('my docker build takes 6 minutes every time even if I only change one ts file. Dockerfile:\n\nFROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nRUN npm run build\nCMD ["node","dist/index.js"]',
            '`COPY . .` before `npm ci` invalidates the dependency layer on any change. Reorder, use multi-stage, add .dockerignore.',
            'The problem is `COPY . .` **before** `npm ci` — any file change invalidates the layer, so dependencies reinstall every time. Copy the lockfile first so that layer is cached:\n\n```dockerfile\nFROM node:22-alpine AS build\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:22-alpine\nWORKDIR /app\nENV NODE_ENV=production\nCOPY package.json package-lock.json ./\nRUN npm ci --omit=dev\nCOPY --from=build /app/dist ./dist\nCMD ["node", "dist/index.js"]\n```\n\nAnd add a `.dockerignore`:\n\n```\nnode_modules\ndist\n.git\n*.log\n```\n\nAfter the first build, a one-file change should only rerun `COPY . .` and `npm run build` — typically well under a minute.'),
        T('nice, went from 6m12s to 48s', null, 'Great result 🎉 If you\'re building in CI too, enable BuildKit layer caching (`--cache-from`/`--cache-to type=gha` on GitHub Actions) so you get the same benefit there.'),
    ]},
    {daysAgo: 2, hour: 19, turns: [
        T('dinner idea with chickpeas, spinach, half a lemon and some feta. 20 mins max',
            'Quick one-pan recipe, 20 minutes, using those ingredients.',
            '**Lemony chickpea & spinach skillet** (2 servings, ~15 min)\n\n1. Warm 2 tbsp olive oil, add 2 sliced garlic cloves and a pinch of chilli flakes for 1 min.\n2. Add 1 drained can of chickpeas, 1 tsp cumin, salt. Fry 5–6 min until they start to crisp.\n3. Stir in 2 big handfuls of spinach until wilted.\n4. Off the heat: juice of the half lemon, crumble over the feta, black pepper.\n\nServe with toast or flatbread. A fried egg on top makes it more filling.'),
    ]},
    {daysAgo: 3, hour: 14, turns: [
        T('Review this function, anything wrong?\n\nexport async function getUserOrders(userId) {\n  const user = await db.users.findOne({ id: userId })\n  const orders = []\n  for (const id of user.orderIds) {\n    orders.push(await db.orders.findOne({ id }))\n  }\n  return orders\n}',
            'Issues: no null check on user, N+1 sequential queries, no types. Suggest single query with $in or WHERE IN.',
            'A few things:\n\n1. **No null check** — if the user doesn\'t exist, `user.orderIds` throws `TypeError: Cannot read properties of null`.\n2. **N+1 queries, sequentially** — a user with 200 orders makes 201 round trips, one after another.\n3. **No types** on `userId` or the return value.\n\nSuggested version:\n\n```ts\nexport async function getUserOrders(userId: string): Promise<Order[]> {\n  const user = await db.users.findOne({id: userId});\n  if (!user) throw new NotFoundError(`User ${userId} not found`);\n  if (user.orderIds.length === 0) return [];\n\n  return db.orders.find({id: {$in: user.orderIds}});\n}\n```\n\nOne query for the orders instead of N. If you need them in the original order, sort by `user.orderIds.indexOf(o.id)` afterwards.'),
    ]},
    {daysAgo: 4, hour: 10, turns: [
        T('explain the difference between WHERE and HAVING like im tired',
            'Simple: WHERE filters rows before grouping, HAVING filters groups after aggregation. Example.',
            '- **WHERE** filters *rows* before grouping.\n- **HAVING** filters *groups* after `GROUP BY` and aggregates.\n\n```sql\nSELECT customer_id, COUNT(*) AS orders\nFROM orders\nWHERE status = \'paid\'          -- drop unpaid rows first\nGROUP BY customer_id\nHAVING COUNT(*) >= 5;          -- then keep customers with 5+ paid orders\n```\n\nRule of thumb: if it uses `COUNT/SUM/AVG…`, it goes in `HAVING`.'),
    ]},
    {daysAgo: 5, hour: 15, turns: [
        T('Help me write a slack message to the team: the staging DB will be down thursday 6-8pm for the postgres 16 upgrade. people should not deploy to staging in that window',
            'Short, clear Slack announcement with time, impact, ask.',
            ':wrench: **Staging maintenance — Thursday 18:00–20:00**\n\nWe\'re upgrading the staging database to Postgres 16. During that window:\n• Staging will be unavailable\n• **Please don\'t deploy to staging** — deploys will fail and may need a manual cleanup\n\nI\'ll post here when it\'s back up. Questions → thread 🧵'),
        T('make it less formal, we\'re a small team', null, 'heads up :wrench: staging DB is going down **Thu 6–8pm** while I upgrade it to Postgres 16 — please hold off on staging deploys till I give the all-clear here 🙏'),
    ]},
    {daysAgo: 6, hour: 9, turns: [
        T('git: I committed to main by accident, haven\'t pushed. how do I move the commit to a new branch',
            'Create branch at current HEAD, reset main back one commit. Safe since not pushed.',
            'Since it isn\'t pushed, this is easy:\n\n```bash\ngit branch feature/csv-import     # new branch pointing at your commit\ngit reset --hard HEAD~1           # move main back one commit\ngit switch feature/csv-import\n```\n\nIf you made more than one commit, use `HEAD~N`. Double-check with `git log --oneline -5` before the reset — `--hard` discards uncommitted changes too, so stash those first if you have any.'),
    ]},
    {daysAgo: 7, hour: 13, turns: [
        T('what\'s a good way to structure feature flags in a node app without paying for launchdarkly',
            'Options: env vars, DB table + cache, open-source Unleash/Flagsmith/GrowthBook. Show simple typed approach.',
            'For a small team, a DB-backed table plus an in-memory cache gets you 90% of the way:\n\n```ts\ntype Flag = \'csv_import\' | \'new_billing_page\' | \'ai_summaries\';\n\nconst cache = new Map<Flag, {enabled: boolean; rollout: number}>();\n\nexport async function refreshFlags() {\n  const rows = await db.query(\'SELECT key, enabled, rollout FROM feature_flags\');\n  for (const r of rows) cache.set(r.key, {enabled: r.enabled, rollout: r.rollout});\n}\nsetInterval(refreshFlags, 30_000);\n\nexport function isEnabled(flag: Flag, userId: string) {\n  const f = cache.get(flag);\n  if (!f?.enabled) return false;\n  return hash(userId + flag) % 100 < f.rollout; // stable % rollout\n}\n```\n\nIf you outgrow that, **Unleash**, **Flagsmith** and **GrowthBook** are open source and self-hostable.'),
    ]},
    {daysAgo: 8, hour: 20, turns: [
        T('gift ideas for my dad, 64, likes gardening, jazz and history podcasts. budget ~£60',
            'Personalised, within budget.',
            'A few ideas around £60:\n\n- **Japanese hori-hori garden knife** + leather sheath (~£35) — every serious gardener ends up loving one\n- **Vinyl reissue** of a classic: *Kind of Blue* (Miles Davis) or *Time Out* (Dave Brubeck) (~£25 each)\n- **Kew Gardens or RHS membership gift** (~£60–70) if he\'s near one\n- **Good wireless earbuds for podcasts in the garden** — e.g. something sweat-resistant with long battery (~£50–60)\n- **A history book from a podcast he likes** — *The Rest is History* hosts have books out\n\nCombining a record with a handwritten note about why you picked it usually lands well.'),
    ]},
    {daysAgo: 9, hour: 16, turns: [
        T('TypeError: Cannot read properties of undefined (reading \'map\')\n    at InvoiceTable (InvoiceTable.tsx:42:23)\n    at renderWithHooks (react-dom.development.js:16305:18)\n    at mountIndeterminateComponent (react-dom.development.js:20074:13)\n\nline 42 is {invoices.map(inv => <Row key={inv.id} {...inv} />)}',
            '`invoices` undefined on first render before data loads. Default value or guard.',
            '`invoices` is `undefined` on the first render — almost certainly because the data hasn\'t loaded yet.\n\nEither default it:\n\n```tsx\nfunction InvoiceTable({invoices = []}: {invoices?: Invoice[]}) {\n```\n\nor handle loading explicitly where you fetch it:\n\n```tsx\nif (isLoading) return <TableSkeleton rows={8} />;\nif (!data) return <EmptyState title="No invoices yet" />;\nreturn <InvoiceTable invoices={data.invoices} />;\n```\n\nThe second one is nicer UX since the user sees a skeleton instead of an empty table flashing.'),
    ]},
    {daysAgo: 10, hour: 12, turns: [
        T('is it worth moving from jest to vitest for a vite react project with ~400 tests',
            'Trade-offs: speed, ESM, config sharing, compat API. Migration effort usually low.',
            'Usually yes, for a Vite project:\n\n**Pros**\n- Reuses your `vite.config.ts` (aliases, plugins) — no separate Babel/ts-jest setup\n- Native ESM, so no `transformIgnorePatterns` pain\n- Typically 2–5× faster in watch mode\n\n**Cons**\n- Some Jest-only libs/mocks need tweaks (`jest.mock` → `vi.mock`, timers API is similar but not identical)\n- Snapshot files get regenerated\n\nWith 400 tests, plan ~a day. Enable `globals: true` and most files work unchanged; then run a codemod for `jest.` → `vi.`.'),
    ]},
    {daysAgo: 11, hour: 8, turns: [
        T('summarise this in 3 bullets for a non technical manager:\n\nWe\'re seeing p95 latency on /api/reports go from 400ms to 3.2s since tuesday. Root cause is the new "include archived" filter which disables the partial index on reports(created_at) WHERE archived = false, so postgres falls back to a seq scan over 18M rows. Fix is a second index or making the filter opt-in with pagination.',
            'Non-technical, 3 bullets: what happened, why, what next.',
            '- **What\'s happening:** Since Tuesday, the Reports page has been about 8× slower (≈3 seconds instead of under half a second).\n- **Why:** A new "include archived" option makes the database scan all 18 million reports instead of using its shortcut.\n- **Next step:** We\'ll add a second shortcut (index) and limit how many results load at once — expected to restore normal speed within a day.'),
    ]},
    {daysAgo: 12, hour: 17, turns: [
        T('k8s pod keeps getting OOMKilled but my node process only uses like 300mb',
            'Likely V8 heap default vs container limit, or memory limit too low including buffers; check limits, --max-old-space-size, actual RSS.',
            'A few usual suspects:\n\n1. **What\'s the limit?** `kubectl describe pod <name>` → check `resources.limits.memory`. If it\'s e.g. `256Mi`, 300 MB RSS *is* over.\n2. **RSS ≠ heap.** `process.memoryUsage().heapUsed` can be 300 MB while RSS (what the kernel counts) is much higher due to buffers, native modules, and fragmentation.\n3. **V8 doesn\'t know the container limit** on older Node versions — set it explicitly, ~75% of the limit:\n\n```yaml\nresources:\n  requests: {memory: "512Mi"}\n  limits:   {memory: "768Mi"}\nenv:\n  - name: NODE_OPTIONS\n    value: "--max-old-space-size=576"\n```\n\nThen watch `kubectl top pod` during a load spike to see real usage.'),
    ]},
    {daysAgo: 13, hour: 10, turns: [
        T('what is the capital of australia', null, '**Canberra.** (Not Sydney — a common mix-up. Canberra was purpose-built as a compromise between Sydney and Melbourne and became the capital in 1913.)'),
    ]},
    {daysAgo: 14, hour: 15, turns: [
        T('Write a SQL query: monthly active users for the last 6 months from events(user_id, event_name, created_at)',
            'Count distinct users per month, last 6 months, date_trunc.',
            '```sql\nSELECT\n  date_trunc(\'month\', created_at)::date AS month,\n  COUNT(DISTINCT user_id)               AS mau\nFROM events\nWHERE created_at >= date_trunc(\'month\', now()) - interval \'5 months\'\nGROUP BY 1\nORDER BY 1;\n```\n\nThis includes the current (partial) month. If `events` is large, an index on `(created_at, user_id)` makes this an index-only scan.'),
        T('can you make it exclude internal users, they have emails ending in @northwind.io',
            'Join users table, filter emails.',
            '```sql\nSELECT\n  date_trunc(\'month\', e.created_at)::date AS month,\n  COUNT(DISTINCT e.user_id)               AS mau\nFROM events e\nJOIN users u ON u.id = e.user_id\nWHERE e.created_at >= date_trunc(\'month\', now()) - interval \'5 months\'\n  AND u.email NOT ILIKE \'%@northwind.io\'\nGROUP BY 1\nORDER BY 1;\n```'),
    ]},
    {daysAgo: 15, hour: 21, turns: [
        T('3 days in lisbon in december, what should I not miss? I like food and walking, not big on museums',
            'Itinerary by day, food-focused, walking.',
            '**Day 1 – Alfama & Baixa**\nWalk up through Alfama to the Miradouro de Santa Luzia, then down to Baixa. Lunch: grilled sardines or bifana at a tasca. Evening: fado in Alfama (book ahead).\n\n**Day 2 – Belém & LX Factory**\nPastéis de Belém (go early), walk along the river to the MAAT. Afternoon at LX Factory for food stalls and bookshops.\n\n**Day 3 – Príncipe Real & Bairro Alto**\nMorning in Príncipe Real\'s garden and shops, Time Out Market for lunch, sunset at Miradouro de São Pedro de Alcântara, then petiscos in Bairro Alto.\n\nDecember tip: it\'s mild (~15°C) but the cobbles get slippery in rain — wear shoes with grip.'),
    ]},
    {daysAgo: 16, hour: 11, turns: [
        T('zod schema for this:\n{ email: string, age?: number (18+), role: "admin" | "member", tags: string[] max 5 }',
            'Direct zod schema with refinements.',
            '```ts\nimport {z} from \'zod\';\n\nexport const UserInput = z.object({\n  email: z.string().email(),\n  age: z.number().int().min(18).optional(),\n  role: z.enum([\'admin\', \'member\']),\n  tags: z.array(z.string().min(1)).max(5),\n});\n\nexport type UserInput = z.infer<typeof UserInput>;\n```\n\nUse `UserInput.safeParse(body)` in your handler to get a typed result without throwing.'),
    ]},
    {daysAgo: 17, hour: 9, turns: [
        T('how do i undo git add', null, '```bash\ngit restore --staged <file>   # unstage one file\ngit restore --staged .        # unstage everything\n```\n\nYour changes stay in the working tree — it only removes them from the index.'),
    ]},
    {daysAgo: 18, hour: 14, turns: [
        T('I need to explain to a junior dev why we don\'t store passwords with sha256. keep it short',
            'Fast hashes are brute-forceable; use slow salted KDF like argon2/bcrypt.',
            'SHA-256 is designed to be **fast** — a GPU can try billions of guesses per second, so leaked hashes of common passwords get cracked quickly. Password hashes need to be **slow and salted**.\n\nUse a password-hashing function instead:\n\n```ts\nimport argon2 from \'argon2\';\nconst hash = await argon2.hash(password);          // salt is built in\nconst ok = await argon2.verify(hash, attempt);\n```\n\n`bcrypt` or `scrypt` are also fine. Never roll your own.'),
    ]},
    {daysAgo: 19, hour: 16, turns: [
        T('cover letter opening paragraph for a senior frontend role at a climate tech company. I have 7 yrs exp, led a design system migration, care about performance',
            'Strong opening, specific, connect to mission.',
            'I\'ve spent the last seven years building frontends that people rely on every day — most recently leading our migration to a shared design system across four product teams, which cut UI bugs by a third and shaved over a second off our median page load. I\'m applying to [Company] because I want that craft to go toward something that matters: helping people and businesses actually reduce their emissions, not just measure them.'),
        T('less "I", more about them', null, 'Helping businesses act on their emissions data — not just report it — needs software that feels fast, clear and trustworthy. That\'s the kind of frontend I\'ve spent seven years building: most recently leading a design system migration across four product teams that cut UI bugs by a third and took more than a second off median page load. [Company]\'s focus on turning climate data into decisions is exactly where I\'d like to put that experience to work.'),
    ]},
    {daysAgo: 20, hour: 13, turns: [
        T('difference between interface and type in typescript, which one should i use',
            'Mostly interchangeable; interface supports declaration merging and extends; type supports unions etc. Give rule of thumb.',
            'They overlap a lot. Practical differences:\n\n| | `interface` | `type` |\n|---|---|---|\n| Object shapes | ✅ | ✅ |\n| Unions / tuples / mapped types | ❌ | ✅ |\n| Declaration merging | ✅ | ❌ |\n| `extends` / `&` | `extends` | `&` |\n\n**Rule of thumb:** use `interface` for public object shapes (props, API models) and `type` for unions, utility compositions and everything else. Most important is to be consistent within the codebase.'),
    ]},
    {daysAgo: 21, hour: 10, turns: [
        T('nginx config to proxy /api to localhost:3000 and serve a SPA from /var/www/app with history fallback',
            'location / try_files fallback, location /api proxy_pass with headers, websocket upgrade.',
            '```nginx\nserver {\n    listen 80;\n    server_name app.example.com;\n    root /var/www/app;\n    index index.html;\n\n    location /api/ {\n        proxy_pass http://127.0.0.1:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n    }\n\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n\n    location ~* \\.(js|css|png|svg|woff2)$ {\n        expires 30d;\n        add_header Cache-Control "public, immutable";\n    }\n}\n```\n\nNote there\'s no trailing slash on `proxy_pass`, so `/api/users` is forwarded as `/api/users`.'),
    ]},
    {daysAgo: 22, hour: 18, turns: [
        T('thinking of trying a 5k run in 8 weeks, i currently can run maybe 10 min without stopping. plan?',
            'Couch-to-5k style progression, 3 runs/week.',
            '3 runs a week, rest days in between:\n\n| Week | Each session |\n|---|---|\n| 1 | 5 × (3 min run / 1 min walk) |\n| 2 | 4 × (5 min run / 1 min walk) |\n| 3 | 3 × (8 min run / 1 min walk) |\n| 4 | 2 × (12 min run / 2 min walk) |\n| 5 | 20 min continuous |\n| 6 | 25 min continuous |\n| 7 | 30 min continuous |\n| 8 | Easy 15 min midweek, **race day 🎉** |\n\nKeep it conversational pace — if you can\'t talk, slow down. Speed comes later.'),
    ]},
    {daysAgo: 23, hour: 15, turns: [
        T('first chat with the new qwen thinking model, can you see your own reasoning?',
            'User asks if I can see reasoning. Explain thinking segment shown separately in UI and can be toggled.',
            'Sort of! This model writes out a short **reasoning segment** before answering — catai shows it separately from the answer, and you can expand or collapse it on each message.\n\nIt\'s most useful for multi-step problems (debugging, math, planning). For quick questions it adds a bit of latency, so feel free to switch back to a non-thinking model for chit-chat.'),
    ]},
    {daysAgo: 25, hour: 11, turns: [
        T('convert this to async/await:\n\nfunction load() {\n  return fetch(\'/api/me\').then(r => r.json()).then(me => fetch(`/api/teams/${me.teamId}`)).then(r => r.json()).catch(e => { console.error(e); return null })\n}', null,
            '```ts\nasync function load() {\n  try {\n    const me = await fetch(\'/api/me\').then(r => r.json());\n    const team = await fetch(`/api/teams/${me.teamId}`).then(r => r.json());\n    return team;\n  } catch (e) {\n    console.error(e);\n    return null;\n  }\n}\n```\n\nSide note: neither version checks `r.ok`, so a 404/500 is parsed as JSON instead of thrown. Worth adding `if (!r.ok) throw new Error(r.statusText)`.'),
    ]},
    {daysAgo: 27, hour: 14, turns: [
        T('best way to handle money in javascript? floats are giving me 0.30000000000000004', null,
            'Never use floats for money. Two good options:\n\n1. **Integer minor units** — store pence/cents as integers: `£12.34` → `1234`. Do all math on integers, format only for display:\n\n```ts\nconst fmt = new Intl.NumberFormat(\'en-GB\', {style: \'currency\', currency: \'GBP\'});\nfmt.format(1234 / 100); // "£12.34"\n```\n\n2. **A decimal library** (`decimal.js`, `big.js`, `dinero.js`) if you need division, tax rates, or multiple currencies.\n\nIn Postgres, use `numeric(12,2)` or `bigint` for cents — never `real`/`double precision`.'),
    ]},
    {daysAgo: 29, hour: 9, turns: [
        T('tailwind: how to make a div fill remaining height in a flex column', null,
            '```html\n<div class="flex h-screen flex-col">\n  <header class="h-14 shrink-0">…</header>\n  <main class="min-h-0 flex-1 overflow-y-auto">…</main>\n</div>\n```\n\n`flex-1` makes it grow; `min-h-0` is the bit people miss — without it, a flex child won\'t shrink below its content height, so `overflow-y-auto` never kicks in.'),
    ]},
    {daysAgo: 31, hour: 16, turns: [
        T('my landlord wants to increase rent by 9%. help me write a polite email asking if they\'d consider 4%, I\'ve been there 3 years, always paid on time', null,
            '**Subject:** Rent renewal – flat 3, 22 Albion Road\n\nHi Mr Patel,\n\nThank you for letting me know about the renewal terms. I\'ve really enjoyed living here for the past three years and would very much like to stay.\n\nA 9% increase is more than I\'d budgeted for, and I wondered whether you\'d consider 4%. I\'ve always paid on time, looked after the flat carefully, and a continued tenancy saves the costs and void period of finding someone new.\n\nI\'m happy to sign for another 12 months on that basis. Let me know what you think.\n\nBest regards,\nMaya'),
    ]},
    {daysAgo: 33, hour: 12, turns: [
        T('explain CORS like i\'m 5', null,
            'Your browser is a careful parent. 🧒\n\nWhen a web page from **shop.com** tries to grab data from **bank.com**, the browser first asks bank.com: *"Is shop.com allowed to read your stuff?"*\n\nIf bank.com replies with `Access-Control-Allow-Origin: https://shop.com`, the browser hands the data over. If not, the browser blocks it — even though the request may have reached the server.\n\nSo CORS errors are fixed **on the server** you\'re calling, not in your frontend code.'),
    ]},
    {daysAgo: 35, hour: 15, turns: [
        T('Write unit tests for this:\n\nexport function slugify(s: string) {\n  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, \'-\').replace(/^-|-$/g, \'\')\n}', null,
            '```ts\nimport {describe, expect, it} from \'vitest\';\nimport {slugify} from \'./slugify\';\n\ndescribe(\'slugify\', () => {\n  it(\'lowercases and joins words with dashes\', () => {\n    expect(slugify(\'Hello World\')).toBe(\'hello-world\');\n  });\n  it(\'collapses punctuation and whitespace\', () => {\n    expect(slugify(\'  Q3 Report: Final!! \')).toBe(\'q3-report-final\');\n  });\n  it(\'strips leading/trailing dashes\', () => {\n    expect(slugify(\'--draft--\')).toBe(\'draft\');\n  });\n  it(\'returns empty string for symbols only\', () => {\n    expect(slugify(\'!!!\')).toBe(\'\');\n  });\n  it(\'drops non-ASCII letters (current behaviour)\', () => {\n    expect(slugify(\'Café Crème\')).toBe(\'caf-cr-me\');\n  });\n});\n```\n\nThat last test documents a probable bug — you might want to `normalize(\'NFKD\')` and strip diacritics first so it becomes `cafe-creme`.'),
    ]},
    {daysAgo: 38, hour: 10, turns: [
        T('what does "idempotent" mean in REST', null,
            'An operation is **idempotent** if doing it once or many times leaves the server in the same state.\n\n- `GET`, `PUT`, `DELETE` → idempotent (deleting the same item twice still ends with it deleted)\n- `POST` → not idempotent (two POSTs can create two orders)\n\nThat\'s why payment APIs (e.g. Stripe) accept an `Idempotency-Key` header on POST — retries with the same key won\'t charge twice.'),
    ]},
    {daysAgo: 41, hour: 19, turns: [
        T('meal prep for 5 lunches, vegetarian, high protein, i hate tofu lol', null,
            'No tofu, promise 😄 — **~30 g protein per box**:\n\n**Base:** 250 g dry quinoa or bulgur, cooked\n**Protein:** 2 cans lentils + 4 hard-boiled eggs + 200 g halloumi (fried, cubed)\n**Veg:** 2 trays roasted peppers, courgette, red onion (olive oil, smoked paprika)\n**Sauce (keep separate):** Greek yoghurt + tahini + lemon + garlic\n\nSplit into 5 boxes; add the eggs on the day. Keeps 4–5 days in the fridge.'),
    ]},
    {daysAgo: 44, hour: 14, turns: [
        T('postgres: how do I find which queries are slowest', null,
            'Enable `pg_stat_statements` (add it to `shared_preload_libraries`, restart, then `CREATE EXTENSION pg_stat_statements;`). Then:\n\n```sql\nSELECT\n  round(total_exec_time::numeric, 0)  AS total_ms,\n  calls,\n  round(mean_exec_time::numeric, 1)   AS mean_ms,\n  left(query, 120)                    AS query\nFROM pg_stat_statements\nORDER BY total_exec_time DESC\nLIMIT 15;\n```\n\nSort by `total_exec_time` to find what costs the most overall, or by `mean_exec_time` for the individually slowest ones. Reset with `SELECT pg_stat_statements_reset();` after you deploy a fix.'),
        T('top one is SELECT * FROM audit_log WHERE entity_id = $1 ORDER BY created_at DESC, 2.1M calls, mean 84ms', null,
            'Classic missing composite index:\n\n```sql\nCREATE INDEX CONCURRENTLY idx_audit_log_entity_created\n  ON audit_log (entity_id, created_at DESC);\n```\n\nAlso consider selecting only the columns you need and adding a `LIMIT` — `SELECT *` on an audit table often drags along big JSON payloads. Expect the mean to drop to low single-digit ms.'),
    ]},
    {daysAgo: 47, hour: 11, turns: [
        T('hw to center a div', null, '```css\n.parent {\n  display: grid;\n  place-items: center;\n}\n```\n\nOr with flexbox: `display: flex; justify-content: center; align-items: center;`'),
    ]},
    {daysAgo: 50, hour: 16, turns: [
        T('Can you give me feedback on this PR description?\n\n"fixed stuff with the invoices + some refactoring"', null,
            'It doesn\'t tell reviewers what changed, why, or how to check it. Try:\n\n```md\n## What\n- Fix rounding in invoice totals (VAT was rounded per line instead of per invoice)\n- Extract `calculateTotals()` from `InvoiceService` into its own module\n\n## Why\nCustomers with many line items saw totals off by 1–2p (#482).\n\n## How to test\n1. Create an invoice with 12 × £0.99 items at 20% VAT\n2. Total should be £14.26 (was £14.28)\n\n## Notes\nRefactor is behaviour-preserving; covered by existing tests + 3 new ones.\n```'),
    ]},
    {daysAgo: 53, hour: 9, turns: [
        T('what is the time complexity of Array.prototype.includes vs Set.has', null,
            '- `Array.prototype.includes` → **O(n)**, it scans the array.\n- `Set.prototype.has` → **O(1)** average, it\'s a hash lookup.\n\nIf you check membership repeatedly (e.g. inside a loop), build a `Set` once:\n\n```ts\nconst blocked = new Set(blockedIds);\nconst visible = users.filter(u => !blocked.has(u.id));\n```\n\nThat turns an O(n·m) filter into O(n + m).'),
    ]},
    {daysAgo: 57, hour: 20, turns: [
        T('book recommendations, I liked Project Hail Mary and The Martian', null,
            'If you liked Andy Weir\'s problem-solving-in-space vibe:\n\n- **Children of Time** — Adrian Tchaikovsky (evolution, spiders, surprisingly moving)\n- **The Long Way to a Small, Angry Planet** — Becky Chambers (cosy crew dynamics)\n- **Seveneves** — Neal Stephenson (hard engineering survival, long)\n- **Delta-v** — Daniel Suarez (asteroid mining, techno-thriller)\n- **Artemis** — Andy Weir (lighter, heist on the Moon)\n\nIf you only pick one: *Children of Time*.'),
    ]},
    {daysAgo: 60, hour: 13, turns: [
        T('github actions: run tests on PR only when files in /api change', null,
            '```yaml\nname: api-tests\non:\n  pull_request:\n    paths:\n      - \'api/**\'\n      - \'.github/workflows/api-tests.yml\'\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    defaults:\n      run:\n        working-directory: api\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n          cache-dependency-path: api/package-lock.json\n      - run: npm ci\n      - run: npm test\n```\n\nCareful: if this job is a *required* status check, skipped runs can block merging. In that case use `dorny/paths-filter` inside an always-running job instead.'),
    ]},
    {daysAgo: 64, hour: 15, turns: [
        T('rewrite this to sound more confident: "I think maybe we could possibly consider moving the launch by a week if that\'s ok with everyone"', null,
            '"I recommend we move the launch back one week. It gives us time to close out the remaining QA issues and ship with confidence. Let me know by Friday if there are any concerns."'),
    ]},
    {daysAgo: 68, hour: 10, turns: [
        T('websocket vs server sent events for a notifications feed?', null,
            'For a **one-way** notifications feed, **SSE** is usually the simpler choice:\n\n| | SSE | WebSocket |\n|---|---|---|\n| Direction | server → client | both ways |\n| Protocol | plain HTTP | upgrade to ws:// |\n| Auto-reconnect | built in (`EventSource`) | DIY |\n| Proxies/CDNs | just works | sometimes needs config |\n\nPick WebSockets if the client also needs to push frequent messages (chat, collaborative editing, games).'),
    ]},
    {daysAgo: 72, hour: 17, turns: [
        T('why is my jest test timing out\n\nthrown: "Exceeded timeout of 5000 ms for a test.\nAdd a timeout value to this test to increase the timeout, if this is a long-running test."', null,
            'Most common causes, in order:\n\n1. **A promise never resolves** — e.g. you `await` something that waits on a mocked function you forgot to resolve.\n2. **Missing `await`/`return`** combined with `done` callback that\'s never called.\n3. **Fake timers** are on (`jest.useFakeTimers()`) and the code waits on `setTimeout` — call `jest.advanceTimersByTime(...)` or `await jest.runAllTimersAsync()`.\n4. **Real network/DB calls** in a unit test.\n\nRun just that test with `--detectOpenHandles` — it often points straight at the culprit.'),
    ]},
    {daysAgo: 76, hour: 12, turns: [
        T('quick: how many tablespoons in a cup', null, '**16 tablespoons** in a US cup (≈ 15 ml per tbsp, 240 ml per cup).'),
    ]},
    {daysAgo: 80, hour: 14, turns: [
        T('design a simple rate limiter for an express api, per api key, 100 req/min', null,
            'A fixed-window limiter in Redis is simple and works across multiple instances:\n\n```ts\nimport {Redis} from \'ioredis\';\nconst redis = new Redis(process.env.REDIS_URL!);\n\nexport function rateLimit(limit = 100, windowSec = 60) {\n  return async (req, res, next) => {\n    const key = req.header(\'x-api-key\');\n    if (!key) return res.status(401).end();\n\n    const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;\n    const count = await redis.incr(bucket);\n    if (count === 1) await redis.expire(bucket, windowSec);\n\n    res.setHeader(\'X-RateLimit-Limit\', limit);\n    res.setHeader(\'X-RateLimit-Remaining\', Math.max(0, limit - count));\n    if (count > limit) return res.status(429).json({error: \'Too many requests\'});\n    next();\n  };\n}\n```\n\nFixed windows allow bursts at the boundary (up to 200 in 2 seconds). If that matters, switch to a sliding-window log or token bucket.'),
    ]},
    {daysAgo: 85, hour: 9, turns: [
        T('translate to spanish: "Thanks for your patience, the replacement part will arrive on Tuesday."', null, '"Gracias por su paciencia; la pieza de repuesto llegará el martes."\n\n(Informal: "Gracias por tu paciencia, la pieza de repuesto llegará el martes.")'),
    ]},
    {daysAgo: 90, hour: 16, turns: [
        T('how to read a large csv (2GB) in node without running out of memory', null,
            'Stream it instead of reading it all at once:\n\n```ts\nimport fs from \'node:fs\';\nimport {parse} from \'csv-parse\';\n\nconst parser = fs.createReadStream(\'transactions.csv\').pipe(parse({columns: true}));\n\nlet total = 0;\nfor await (const row of parser) {\n  total += Number(row.amount);\n}\nconsole.log(total);\n```\n\nMemory stays flat because only a chunk is in memory at a time. If you\'re inserting into a DB, batch rows (e.g. 1,000 at a time) to keep it fast.'),
    ]},
    {daysAgo: 96, hour: 11, turns: [
        T('hello', null, 'Hi! How can I help you today?'),
    ]},
    {daysAgo: 97, hour: 13, turns: [
        T('what\'s the difference between == and === in js', null,
            '`===` compares value **and** type; `==` converts types first.\n\n```js\n0 == \'0\'          // true\n0 === \'0\'         // false\nnull == undefined // true\nnull === undefined// false\n```\n\nUse `===` everywhere; the one common exception is `x == null` to check for both `null` and `undefined`.'),
    ]},
    {daysAgo: 104, hour: 15, turns: [
        T('I\'m interviewing a candidate for a mid-level backend role tomorrow. give me 5 good questions that aren\'t leetcode', null,
            '1. **"Walk me through a production incident you were involved in."** — what broke, how they found it, what changed afterwards.\n2. **"Design the data model for a simple booking system (rooms, bookings, cancellations)."** — look for constraints, overlaps, indexes.\n3. **"An endpoint got 10× slower after a deploy. How do you investigate?"**\n4. **"When would you *not* add a cache?"** — tests judgement over buzzwords.\n5. **"Tell me about a code review comment you disagreed with."** — collaboration and communication.\n\nLeave 10 minutes for their questions — what they ask is often as telling as their answers.'),
    ]},
    {daysAgo: 112, hour: 10, turns: [
        T('mongo vs postgres for a new saas app', null,
            'For a typical SaaS app (users, teams, billing, permissions), **Postgres** is the safer default:\n\n- Relational data with constraints and transactions\n- `jsonb` columns when you *do* need flexible documents\n- Mature tooling, migrations, hosting everywhere\n\nMongoDB shines when the data really is document-shaped and rarely joined (event payloads, content blobs), or when you need its horizontal scaling story early.\n\nIf unsure: Postgres + `jsonb` gets you most of both.'),
    ]},
    {daysAgo: 120, hour: 14, turns: [
        T('trying out catai, are you running on my laptop?', null,
            'Yes 🙂 I\'m running fully locally on your machine through catai — your prompts aren\'t sent to any external server. Response speed depends on your CPU/GPU and the model size you installed.'),
        T('which model is this', null, 'You\'re currently talking to **Meta Llama 3 8B (Q4_K_M)**. You can install others with `catai install <model>` and switch with `catai use <model>`.'),
    ]},
    {daysAgo: 133, hour: 18, turns: [
        T('summarize the plot of Dune in 3 sentences no spoilers past the first act', null,
            'Young Paul Atreides moves with his noble family to Arrakis, a desert planet that is the only source of the universe\'s most valuable substance, the spice. The emperor has handed House Atreides control of the planet, but the gift is a political trap set by their rivals, House Harkonnen. As danger closes in, Paul must survive the deadly desert and its native Fremen people while discovering that he may be more than he seems.'),
    ]},
    {daysAgo: 141, hour: 12, turns: [
        T('cron expression for every weekday at 7:30am', null, '```\n30 7 * * 1-5\n```\n\nminute `30`, hour `7`, any day-of-month, any month, Monday–Friday. Remember cron uses the server\'s timezone unless your scheduler lets you set one (e.g. `CRON_TZ=Europe/London`).'),
    ]},
    {daysAgo: 150, hour: 15, turns: [
        T('explain big O notation with examples from real code', null,
            'Big O describes how work grows as input grows.\n\n- **O(1)** – `map.get(id)`: same cost for 10 or 10M items\n- **O(log n)** – binary search, B-tree index lookups in a DB\n- **O(n)** – `users.filter(u => u.active)`\n- **O(n log n)** – `array.sort()`\n- **O(n²)** – nested loop comparing every item with every other (`for a of list) for (b of list)`)\n\nIn practice, the jump from O(n) to O(n²) is the one that bites — fine at 100 items, painful at 100,000.'),
    ]},
];
