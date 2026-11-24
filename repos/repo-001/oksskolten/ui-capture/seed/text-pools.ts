// Paragraph pools used to assemble full-text article bodies, plus hand-written
// clipped pages and chat conversations.
import type { SeedConversation } from './dataset.js'

interface Pool { intro: string[]; headings: string[]; paragraphs: string[]; outro: string[]; code?: string[]; lists?: string[] }

const ai: Pool = {
  intro: [
    'This has been on my list for a while, and the last few weeks finally gave me a reason to dig in properly. What follows is a mix of notes, measurements and a few opinions I am not fully confident about yet.',
    'The short version: it works better than I expected, but the failure modes are different from what most people assume. The long version is below.',
  ],
  headings: ['Setting up', 'What the benchmarks miss', 'Where it breaks', 'Cost and latency', 'Evaluation', 'Prompting details', 'Security considerations', 'What I would do next'],
  paragraphs: [
    'Most of the published numbers measure single-turn accuracy on clean inputs. Real usage looks nothing like that: inputs are messy, context windows fill up with tool output, and the model has to decide when it has enough information to stop.',
    'I ran each configuration against the same set of 200 tasks, three times each, and recorded both the final answer and the number of tool calls. Variance between runs was larger than the difference between some of the models, which is worth keeping in mind whenever someone posts a leaderboard screenshot.',
    'Quantization to 4 bits cost roughly two points on my evaluation set but cut memory use by more than half. For interactive use that tradeoff is easy; for batch jobs where accuracy matters I would still run the full-precision weights.',
    'The most common failure was not hallucination in the classic sense. It was the model confidently calling the right tool with slightly wrong arguments — an off-by-one date range, a filter on the wrong field — and then summarizing the empty result as if it were meaningful.',
    'Latency is dominated by time-to-first-token on long prompts. Caching the static part of the system prompt brought median response time from 2.8 seconds down to 1.1 seconds, which changes how the tool feels far more than any model upgrade did.',
    'Treat every piece of retrieved content as untrusted input. If an agent can read your email and also make HTTP requests, a single malicious message can instruct it to send your data somewhere else. Separating those capabilities is still the most reliable mitigation.',
    'Structured output modes have improved a lot. I no longer write retry loops for malformed JSON; the remaining errors are semantic rather than syntactic, which is a much better class of problem to have.',
    'Small models are now genuinely useful for classification, extraction and routing. I use a 3B model to decide whether a request needs a tool at all, and only call the large model when it does.',
    'Evaluation is the part everyone skips and everyone regrets skipping. A spreadsheet with fifty hand-checked examples will tell you more than any public benchmark about whether a change helped your use case.',
  ],
  outro: ['I will keep updating this post as I learn more. Corrections welcome.', 'If you try this yourself, I would love to hear what numbers you get.', 'The code for all of this is on GitHub, rough edges included.'],
  code: [
    '```bash\nllm install llm-ollama\nllm -m qwen3:30b-a3b "Summarize this file" < notes.md\n```',
    '```python\nimport sqlite_utils\n\ndb = sqlite_utils.Database("memory.db")\ndb["notes"].enable_fts(["text"], create_triggers=True)\nhits = db["notes"].search("postgres vacuum", limit=5)\n```',
  ],
  lists: ['- Accuracy on clean inputs: 91%\n- Accuracy on messy inputs: 74%\n- Median tool calls per task: 3\n- Tasks abandoned early: 6%'],
}

const frontend: Pool = {
  intro: [
    'For years this was the kind of thing you needed a library, a resize observer and a little bit of prayer for. Today the platform handles it natively, and the result is less code and better performance.',
    'This article walks through the feature with practical examples, covers browser support and fallbacks, and ends with a few patterns we have been using in production.',
  ],
  headings: ['The problem', 'How it works', 'A practical example', 'Browser support', 'Progressive enhancement', 'Accessibility', 'Performance notes', 'Common pitfalls'],
  paragraphs: [
    'The key idea is that the component describes its own layout rules, and the browser resolves them at layout time. There is no JavaScript measuring elements after the fact, which means no layout thrashing and no flash of incorrect content.',
    'Support landed in all three major engines over the past eighteen months. If you need to support older browsers, the feature degrades gracefully: wrap the enhanced styles in an @supports block and keep a simple single-column layout as the default.',
    'Screen readers do not care about visual order, so make sure the DOM order still makes sense when the visual layout changes. Test with VoiceOver and NVDA, not just with the accessibility tree in DevTools.',
    'In our field data, replacing the JavaScript implementation removed about 18KB of script from the critical path and improved Interaction to Next Paint at the 75th percentile by 40 milliseconds on mid-range Android devices.',
    'The most common mistake is forgetting that the containing element needs an explicit containment context. Without it, the queries silently never match and you spend an afternoon wondering why nothing happens.',
    'Design tokens make this much easier to maintain. Instead of hard-coding breakpoints in every component, define a small set of named sizes and reference them consistently.',
    'Animations should respect prefers-reduced-motion. A simple media query that shortens durations to near zero is enough for most cases and costs nothing.',
    'We rolled this out behind a feature flag to 5% of traffic first, compared Core Web Vitals between the cohorts for two weeks, and only then removed the old implementation.',
  ],
  outro: ['Have you tried this in production yet? Let us know how it went.', 'Thanks to the reviewers who caught several mistakes in an earlier draft.'],
  code: [
    '```css\n.card-list {\n  container-type: inline-size;\n}\n\n@container (min-width: 36rem) {\n  .card {\n    display: grid;\n    grid-template-columns: 12rem 1fr;\n  }\n}\n```',
    '```css\n@view-transition {\n  navigation: auto;\n}\n\n::view-transition-old(root),\n::view-transition-new(root) {\n  animation-duration: 180ms;\n}\n```',
    '```html\n<button popovertarget="menu">Options</button>\n<div id="menu" popover>\n  <a href="/settings">Settings</a>\n</div>\n```',
  ],
  lists: ['- Chrome: supported\n- Safari: supported since 18.0\n- Firefox: supported since 133\n- Fallback: single-column layout'],
}

const lang: Pool = {
  intro: [
    'This release is the result of several months of work by contributors around the world. Below are the highlights; the full changelog has every detail.',
    'We are excited to share this update with the community. As always, thank you to everyone who tested pre-releases and filed issues.',
  ],
  headings: ['Highlights', 'Performance improvements', 'Breaking changes', 'Deprecations', 'Tooling updates', 'How to upgrade', 'Acknowledgements'],
  paragraphs: [
    'The headline change is performance. On our benchmark suite, compile times improved by 12% on average, with the largest gains on projects that make heavy use of generics.',
    'A small number of APIs that were deprecated two releases ago have now been removed. Most projects will not be affected, but if you see new errors after upgrading, the migration guide lists replacements for each removed function.',
    'The standard library gains several new helpers that cover patterns people were writing by hand. They are small additions, but they remove a surprising amount of boilerplate from real codebases.',
    'Installers are available for all supported platforms. If you use a version manager, the new version should be available within a day of this announcement.',
    'Error messages have been reworded throughout to point directly at the likely cause and, where possible, suggest a fix. This was one of the most requested improvements in last year\'s developer survey.',
    'Security fixes in this release address issues reported through our coordinated disclosure process. We recommend all users upgrade, especially those running network-facing services.',
    'The language server now supports incremental re-checking of individual files, which makes editor feedback noticeably faster in large monorepos.',
  ],
  outro: ['Please report any regressions on the issue tracker.', 'Happy hacking!', 'Thanks to all contributors who made this release possible.'],
  code: [
    '```bash\n$ node --version\nv24.11.0\n$ node app.ts   # type stripping, no flags needed\n```',
    '```ts\nfunction first<const T extends readonly unknown[]>(xs: T): T[0] {\n  return xs[0]\n}\nconst x = first([1, "a"] as const) // x: 1\n```',
  ],
  lists: ['- Faster startup\n- New standard library helpers\n- Improved error messages\n- Removed deprecated APIs'],
}

const infra: Pool = {
  intro: [
    'This is a story about a system that worked fine until it did not, and the months of incremental work it took to replace it without anyone noticing.',
    'We get asked about this a lot, so here is the long answer, including the parts that did not go to plan.',
  ],
  headings: ['Background', 'The old architecture', 'What went wrong', 'The migration', 'Results', 'Operational lessons', 'What is next'],
  paragraphs: [
    'At peak, the old system handled about 40,000 requests per second across six regions. The problem was not throughput but coordination: every configuration change had to propagate through a single leader, and failovers took minutes.',
    'We migrated region by region, starting with the one carrying the least traffic. Each step ran in shadow mode for a week, with both systems processing requests and a diff job comparing the results.',
    'The first attempt failed because we underestimated how many internal tools read directly from the old database. We ended up building a compatibility view and slowly moving consumers off it over the following quarter.',
    'Tail latency improved the most. The p99 dropped from 340ms to 95ms, and more importantly the p99.9 stopped having periodic spikes during deploys.',
    'Run game days. Every one of our serious incidents in the last two years involved a failure mode we had never actually exercised, even though we had a runbook for it.',
    'Costs went down by about a third, mostly from removing over-provisioned capacity we had kept around as a safety margin for the old failover process.',
    'Observability had to come first. Before touching the data path we added tracing to every hop, which turned several weeks of guesswork into a few hours of reading flame graphs.',
    'Not everything improved. Cold starts in smaller regions got slightly worse, and we are still working on a fix that does not involve keeping idle machines warm.',
  ],
  outro: ['If problems like this interest you, we are hiring.', 'Thanks to everyone on the team who carried pagers during the migration.'],
  code: [
    '```yaml\napiVersion: apps/v1\nkind: Deployment\nspec:\n  strategy:\n    rollingUpdate:\n      maxUnavailable: 0\n      maxSurge: 25%\n```',
    '```bash\n$ fly machine run . --region arn --vm-memory 512\n$ fly scale count 3 --region arn,ams,fra\n```',
  ],
  lists: ['- p50 latency: 21ms → 14ms\n- p99 latency: 340ms → 95ms\n- Failover time: ~4 min → 9 s\n- Monthly cost: −34%'],
}

const db: Pool = {
  intro: [
    'Databases reward people who read the documentation carefully and punish everyone else at three in the morning. This post tries to save you one of those nights.',
    'We see this question in support tickets every week, so it seemed worth writing up the full explanation with real numbers.',
  ],
  headings: ['The setup', 'Measuring the baseline', 'What changed', 'Benchmarks', 'Tuning parameters', 'Caveats', 'Recommendations'],
  paragraphs: [
    'All benchmarks ran on a 16 vCPU machine with local NVMe storage, using a dataset of 200 million rows. We ran each test five times after a warm-up run and report the median.',
    'With the default settings, the sequential scan took 41 seconds. Enabling asynchronous I/O brought that down to 17 seconds, with no other changes to the query or schema.',
    'Index locality matters more than most people think. Random UUIDs scatter inserts across the entire B-tree, which means more page splits and more of the index needs to stay in memory.',
    'Autovacuum is not the enemy. In nearly every case where someone disabled it to "improve performance", the table eventually bloated to several times its real size and performance collapsed.',
    'For read-heavy workloads with a single writer, SQLite in WAL mode is hard to beat. Readers never block the writer and the writer never blocks readers, and there is no network hop at all.',
    'Connection pooling is about protecting the database from too many concurrent connections, not about making individual queries faster. Size the pool to the number of cores, not the number of application instances.',
    'Measure before tuning. EXPLAIN (ANALYZE, BUFFERS) shows you where time is actually spent, and the answer is often a missing index rather than a configuration parameter.',
  ],
  outro: ['As always, test these settings against your own workload before rolling them out.', 'Questions? Find us on the community Discord.'],
  code: [
    '```sql\nEXPLAIN (ANALYZE, BUFFERS)\nSELECT feed_id, count(*)\nFROM articles\nWHERE published_at > now() - interval \'7 days\'\nGROUP BY feed_id;\n```',
    '```sql\nPRAGMA journal_mode = WAL;\nPRAGMA synchronous = NORMAL;\nPRAGMA busy_timeout = 5000;\n```',
    '```sql\nCREATE INDEX CONCURRENTLY idx_events_created\n  ON events (created_at)\n  WHERE archived = false;\n```',
  ],
  lists: ['- `shared_buffers`: 25% of RAM\n- `effective_io_concurrency`: 200\n- `maintenance_work_mem`: 2GB for index builds\n- `autovacuum_vacuum_cost_limit`: 2000'],
}

const sec: Pool = {
  intro: [
    'The details of this case only became public after court filings were unsealed last month, and they paint a picture of an operation that was both more organized and more careless than you might expect.',
    'This one is worth paying attention to even if you are not directly affected, because the technique is going to show up elsewhere.',
  ],
  headings: ['What happened', 'How the attack worked', 'Who is affected', 'The response', 'What you should do', 'Timeline'],
  paragraphs: [
    'The attackers did not exploit any novel vulnerability. They relied on credentials harvested by infostealer malware months earlier, combined with the fact that the targeted accounts had never enabled multi-factor authentication.',
    'Once inside, they moved slowly. Logs show weeks of low-volume reconnaissance before any data left the network, which is exactly the kind of activity that blends into normal traffic.',
    'Passkeys defeat this class of phishing entirely, because the credential is bound to the origin. The weak point is the account recovery flow, which in most services still falls back to SMS or email.',
    'The vendor released patches within four days of the report, but telemetry suggests fewer than half of exposed systems had been updated two weeks later.',
    'If you run any of the affected versions, update now and rotate any credentials that were stored on the system. Assume that anything readable by the service account has been read.',
    'Researchers were able to link the infrastructure to earlier campaigns through reused TLS certificates and a distinctive pattern in the command-and-control URLs.',
    'Microsoft rates two of the flaws as critical and says they are already being exploited in limited, targeted attacks. Enterprise admins should prioritize the Windows Server updates.',
  ],
  outro: ['Update: The company has responded to a request for comment; their statement is included above.', 'As always, backing up your data before applying updates is a good idea.'],
  lists: ['- Update to the latest version\n- Rotate API keys and service account credentials\n- Enable phishing-resistant MFA\n- Review audit logs from the last 90 days'],
}

const eng: Pool = {
  intro: [
    'I talked with engineers and managers at a dozen companies for this piece. Some asked to remain anonymous; their quotes are attributed by role only.',
    'This is a topic where opinions are loud and data is scarce, so I tried to collect some data.',
  ],
  headings: ['The context', 'What the data shows', 'How teams are adapting', 'The manager perspective', 'Counterpoints', 'Takeaways'],
  paragraphs: [
    'Across the companies I spoke with, the pattern was consistent: teams got smaller, scope per engineer grew, and the bar for what counts as "senior" quietly moved.',
    'One staff engineer described it this way: "We used to hire juniors to do the work that nobody else wanted. Now the tooling does some of that work, and we have to be much more intentional about how people learn."',
    'On-call load is the strongest predictor of attrition I have seen in any survey. Teams with more than two pages per week outside working hours lost engineers at nearly twice the rate of teams with fewer.',
    'The best platform teams I talked to treated internal developers as customers. They ran user interviews, tracked adoption, and deprecated tools that nobody used instead of maintaining them forever.',
    'Not everyone agrees. Several engineering leaders pushed back on the idea that anything fundamental has changed, arguing that good engineering has always been about judgment rather than typing speed.',
    'Writing things down remains underrated. Teams with a habit of short design documents had fewer surprise rewrites and faster onboarding, regardless of company size.',
    'Small, boring tools that do one thing well tend to outlast clever ones. The terminal utilities I learned fifteen years ago still work exactly the same way.',
  ],
  outro: ['Thanks to everyone who shared their experiences for this article.', 'If you have a different experience, reply to this email — I read every response.'],
  code: ['```ini\n[diff]\n    algorithm = histogram\n[merge]\n    conflictstyle = zdiff3\n[rerere]\n    enabled = true\n```'],
  lists: ['- Median team size: 6 → 4\n- Engineers per manager: 7 → 9\n- Share of companies hiring new grads: 61% → 38%'],
}

const news: Pool = {
  intro: [
    'The announcement came Tuesday morning, and the reaction was swift.',
    'It has been a long time coming, but it is finally here.',
  ],
  headings: ['What is new', 'Why it matters', 'Availability and pricing', 'The bigger picture'],
  paragraphs: [
    'The company says the update will roll out gradually over the next few weeks, starting in the US and Europe.',
    'Pricing starts at $1,599 for the base model, the same as last year, though storage upgrades remain expensive.',
    'Critics argue the change does not go far enough, and regulators have signaled that they will be watching closely.',
    'In our testing, battery life was excellent: we got just over 19 hours in our standard video playback test.',
    'It is a notable shift for a company that has resisted this kind of feature for years, and it suggests competition is finally having an effect.',
    'The discussion thread quickly passed 600 comments, with many readers sharing their own experiences and alternatives.',
  ],
  outro: ['We will update this story as more details become available.', 'Disclosure: the company provided a review unit for this article.'],
}

const ja: Pool = {
  intro: [
    'この記事では、実際のプロジェクトで試した内容をもとに、具体的な手順と注意点をまとめます。',
    '最近チーム内で話題になったので、調べたことを整理しておきます。',
  ],
  headings: ['背景', '基本的な考え方', '実装例', 'ハマったポイント', 'パフォーマンス', 'まとめ'],
  paragraphs: [
    '最初は既存の仕組みをそのまま使っていましたが、規模が大きくなるにつれて保守が難しくなってきました。特に、似たようなコードが複数の場所に散らばっていたことが問題でした。',
    '導入にあたっては、まず小さな機能で試してから徐々に範囲を広げていきました。いきなり全体に適用すると、問題が起きたときに原因の切り分けが難しくなるためです。',
    '本番環境で運用してみると、ドキュメントには書かれていない挙動にいくつか遭遇しました。特にエラー処理まわりは、事前にしっかり検証しておくことをおすすめします。',
    'ベンチマークでは、従来の方法と比べて処理時間が約40％短縮されました。メモリ使用量もわずかに減少しています。',
    'チームメンバーからのフィードバックも概ね好評で、新しく参加したメンバーでもコードを理解しやすくなったという声がありました。',
    '一方で、すべてのケースに適しているわけではありません。小規模なプロジェクトでは、かえって複雑さが増してしまうこともあります。',
  ],
  outro: ['参考になれば幸いです。質問やコメントがあればお気軽にどうぞ。', '最後まで読んでいただきありがとうございました。'],
  code: ['```go\ntype Repository[T any] interface {\n    FindByID(ctx context.Context, id int64) (*T, error)\n    Save(ctx context.Context, v *T) error\n}\n```'],
}

const misc: Pool = {
  intro: [
    'Some things are worth sharing simply because they are delightful.',
    'We set off from the trailhead just after six, with headlamps on and frost on the grass.',
  ],
  headings: ['Getting there', 'The route', 'Conditions', 'Notes for next time'],
  paragraphs: [
    'The approach is longer than the maps suggest. Budget at least two extra hours if there is fresh snow, and carry more water than you think you need — the streams were frozen above 900 meters.',
    'The view from the top made every step worth it: glaciers in every direction, and on a clear day you can see all the way to the Swedish border.',
    'Weather in the north changes fast. We went from sunshine to horizontal sleet in under twenty minutes and were very glad to have packed proper shells.',
    'It is one of those projects that rewards patience. The photographer spent three winters waiting for the right conditions.',
    'The interactive version is even better than the screenshots. Zoom in on the coastline of Norway and watch the lights blink in their real sequences.',
  ],
  outro: ['Highly recommended, if you are prepared for it.', 'Via a reader, thanks!'],
}

const comic: Pool = { intro: ['[Alt text in the comic image.]'], headings: [], paragraphs: [''], outro: [] }

function ja_en_translation(title: string, hook: string, heads: string[]): string {
  return `${hook.replace(/。/g, '. ')}\n\nThis article summarizes what we tried in a real project, with concrete steps and caveats.\n\n## ${heads[0] ? 'Background' : 'Overview'}\n\nAt first we used the existing approach as-is, but as the codebase grew it became harder to maintain. In particular, similar code was scattered across several places.\n\n## Implementation\n\nWe started by trying it on a small feature and gradually expanded the scope. Applying it everywhere at once makes it hard to isolate the cause when problems occur.\n\n## Summary\n\nIn benchmarks, processing time dropped by about 40% compared to the previous approach, and memory usage decreased slightly. It is not suitable for every case, though — in small projects it can add complexity.`
}

export const POOLS: Record<string, Pool> & { ja_en_translation: typeof ja_en_translation } = Object.assign(
  { ai, frontend, lang, infra, db, sec, eng, news, ja, misc, comic } as Record<string, Pool>,
  { ja_en_translation },
)

export const CLIPS = [
  { title: 'How to pack for a winter hut trip in Northern Norway', site: 'DNT', url: 'https://www.dnt.no/artikler/turtips/vinterpakkeliste/', ago: 23, read: true, bookmarked: true, liked: true, og: true,
    body: 'A winter trip between staffed and self-service cabins is one of the best ways to experience the Norwegian mountains, but it demands careful packing.\n\n## Essentials\n\n- Windproof shell jacket and trousers\n- Two insulating layers (wool and down)\n- Spare mittens and a balaclava\n- Map, compass and a GPS with spare batteries\n- DNT key for self-service cabins\n\n## Food\n\nSelf-service cabins sell basic provisions, but bring your own lunch and snacks for long days. Chocolate freezes; nuts do not.\n\n## Safety\n\nAlways check varsom.no for avalanche forecasts and leave a trip plan with someone at home. Turn back early — the mountain will be there next year.',
    summary: 'A practical packing list for winter cabin-to-cabin trips in Norway, focused on layering, navigation and avalanche safety.\n\n- **Clothing** — Windproof shells plus two insulating layers, spare mittens and a balaclava.\n- **Navigation** — Carry a map and compass alongside GPS; batteries drain fast in the cold.\n- **Safety** — Check avalanche forecasts on varsom.no and leave a trip plan.' },
  { title: 'The Twelve-Factor App', site: '12factor', url: 'https://12factor.net/', ago: 88, read: true, bookmarked: true, liked: false, og: false,
    body: 'In the modern era, software is commonly delivered as a service: called web apps, or software-as-a-service. The twelve-factor app is a methodology for building software-as-a-service apps.\n\n## The twelve factors\n\n1. Codebase — one codebase tracked in revision control, many deploys\n2. Dependencies — explicitly declare and isolate dependencies\n3. Config — store config in the environment\n4. Backing services — treat backing services as attached resources\n5. Build, release, run — strictly separate build and run stages\n6. Processes — execute the app as one or more stateless processes\n7. Port binding — export services via port binding\n8. Concurrency — scale out via the process model\n9. Disposability — maximize robustness with fast startup and graceful shutdown\n10. Dev/prod parity — keep development, staging, and production as similar as possible\n11. Logs — treat logs as event streams\n12. Admin processes — run admin/management tasks as one-off processes' },
  { title: 'Grafana dashboard JSON for SQLite WAL monitoring (gist)', site: 'GitHub Gist', url: 'https://gist.github.com/mlindqvist/3f9a1c2b7e0d4a8f', ago: 41, read: false, bookmarked: false, liked: false, og: false,
    body: 'Quick dashboard I put together to watch WAL size and checkpoint frequency on a small SQLite-backed service.\n\n```json\n{\n  "title": "SQLite WAL",\n  "panels": [\n    { "type": "timeseries", "title": "WAL size (MB)", "targets": [{ "expr": "sqlite_wal_bytes / 1e6" }] },\n    { "type": "stat", "title": "Checkpoints / h", "targets": [{ "expr": "rate(sqlite_checkpoints_total[1h])" }] }\n  ]\n}\n```' },
  { title: 'Sourdough rye (rugbrød) — the recipe my grandmother used', site: 'Nordic Kitchen', url: 'https://nordickitchen.example.no/rugbrod-bestemor', ago: 12, read: true, bookmarked: true, liked: true, og: true,
    body: 'This dense, seeded rye bread keeps for a week and gets better on day two.\n\n## Ingredients\n\n- 300 g active rye starter\n- 500 g wholegrain rye flour\n- 200 g cracked rye kernels, soaked overnight\n- 100 g sunflower seeds\n- 50 g flax seeds\n- 15 g salt\n- 2 tbsp dark syrup\n- 600 ml water\n\n## Method\n\nMix everything into a wet, sticky dough. Pour into a greased tin, smooth the top and leave to rise for 3–5 hours until it cracks. Bake at 180°C for 1 hour 45 minutes. Wrap in a towel and wait a full day before slicing. Yes, really.' },
  { title: 'Okstindan — route description and conditions', site: 'UT.no', url: 'https://ut.no/turforslag/okstindan-oksskolten', ago: 58, read: true, bookmarked: true, liked: false, og: true,
    body: 'Oksskolten (1916 m) is the highest peak in Northern Norway. The normal route starts at Kjennsvasshytta and crosses Okstindbreen, so glacier equipment and experience are required.\n\n## Route\n\nFollow the marked path from the cabin to the glacier edge (2 h). Rope up and cross the glacier towards the col between Oksskolten and Okstind (2–3 h). The final ridge is steep but not technical in summer conditions.\n\n## Season\n\nBest from mid-July to early September. Crevasses are more exposed late in the season.' },
]

const T = (role: 'user' | 'assistant', text: string) => ({ role, text })
const D = 24 * 3600e3
export const CONVERSATIONS: SeedConversation[] = [
  { id: 'c-weekly-digest-1', title: 'Weekly digest: databases', articleUrl: null, createdAgo: 1.2 * D, messages: [
    T('user', 'Give me a quick digest of the database posts from this week.'),
    T('assistant', 'Here\'s what landed in your **Databases** category this week:\n\n- [Postgres 18: asynchronous I/O in practice](/www.crunchydata.com/blog/postgres-18-asynchronous-i-o-in-practice/) — *Crunchy Data Blog*\n  Benchmarks of `io_method=worker` vs `io_uring`; sequential scans got roughly 2.4× faster on NVMe.\n- [Introducing concurrent writes in Turso](/turso.tech/blog/introducing-concurrent-writes-in-turso/) — *Turso Blog*\n  MVCC-based concurrent writes for the SQLite rewrite, now in beta.\n\nBoth are unread. Since you\'ve been reading a lot about SQLite WAL mode lately, the Turso post is probably the more relevant one.'),
    T('user', 'Does the Turso one say anything about how it compares to WAL2 or BEGIN CONCURRENT?'),
    T('assistant', 'It does briefly. The post positions MVCC as a replacement for the page-level locking that `BEGIN CONCURRENT` still relies on, so two writers touching different rows on the **same page** no longer conflict. It doesn\'t mention WAL2 at all.\n\nWant me to search your archive for anything else on `BEGIN CONCURRENT`?'),
  ]},
  { id: 'c-pgbouncer', title: 'Pool sizing for PgBouncer', articleUrl: 'https://www.crunchydata.com/blog/understanding-postgres-connection-pooling-in-2026/', createdAgo: 19 * D, messages: [
    T('user', 'We run 12 app pods with a pool of 20 each against a 16 vCPU Postgres. Based on this article, is that too much?'),
    T('assistant', 'According to the article, yes — probably. That setup can open **240 server connections**, while the article recommends sizing the *server-side* pool closer to the number of cores (with some headroom for I/O wait), so roughly **32–48** for 16 vCPUs.\n\nThe suggested pattern is:\n\n1. Put PgBouncer in **transaction mode** in front of Postgres\n2. Let each pod keep its client pool of 20 (cheap connections to PgBouncer)\n3. Set `default_pool_size` in PgBouncer to ~40\n\nThe caveat it calls out: transaction mode breaks session features like `SET`, advisory locks held across transactions and some prepared statement usage.'),
  ]},
  { id: 'c-recommend', title: 'What should I read tonight', articleUrl: null, createdAgo: 4 * D, messages: [
    T('user', 'I have about 30 minutes tonight. What should I read?'),
    T('assistant', 'Based on what you usually read (Go, SQLite/Postgres, and infrastructure write-ups), here are three picks that fit in 30 minutes:\n\n- [We moved our control plane off a single Postgres](/fly.io/blog/we-moved-our-control-plane-off-a-single-postgres/) — *Fly.io Blog* — a migration story, right in your wheelhouse (~12 min)\n- [The lethal trifecta, revisited](/simonwillison.net/the-lethal-trifecta-revisited/) — *Simon Willison\'s Weblog* — short and sharp on agent security (~6 min)\n- [Some things I learned about terminal colors](/jvns.ca/some-things-i-learned-about-terminal-colors/) — *Julia Evans* — light and fun to finish with (~8 min)\n\nAll three are unread.'),
  ]},
  { id: 'c-kube-res', title: 'Kubernetes requests vs limits', articleUrl: null, createdAgo: 33 * D, messages: [
    T('user', 'Find articles about setting CPU limits in Kubernetes'),
    T('assistant', 'I found two relevant articles in your feeds:\n\n- [Kubernetesのリソース設定、正しくできていますか？](/zenn.dev/articles/zenn-ujv) — *Zenn Trend* (Japanese) — explains requests vs limits and common misconfigurations; it argues against CPU limits for latency-sensitive services because of CFS throttling.\n- [Kubernetes v1.35 Sneak Peek](/kubernetes.io/blog/2025/11/26/kubernetes-v1-35-sneak-peek) — *Kubernetes Blog* — mentions in-place pod resize going GA, which makes adjusting requests less disruptive.\n\nShould I translate the Zenn article to English?'),
    T('user', 'Yes please, just the main points'),
    T('assistant', 'Main points of the Zenn article:\n\n- **Requests drive scheduling** — set them from observed p95 usage, not guesses.\n- **CPU limits cause throttling** — even when the node has idle CPU, a container hitting its CFS quota is paused until the next period.\n- **Memory limits are different** — always set them; exceeding memory gets the container OOM-killed rather than throttled.\n- **Recommendation** — requests for CPU, requests + limits for memory, and monitor `container_cpu_cfs_throttled_periods_total`.'),
  ]},
  { id: 'c-passkeys', title: 'Passkey downgrade attacks', articleUrl: null, createdAgo: 9 * D, messages: [
    T('user', 'Summarize the passkey downgrade attack thing from Krebs'),
    T('assistant', '**Phishing kit sellers pivot to passkey downgrade attacks** (*Krebs on Security*):\n\n- Phishing kits now detect when a victim has a passkey and show a fake "passkey unavailable, use SMS instead" screen.\n- Passkeys themselves aren\'t broken — the weak point is the **fallback/recovery flow** that services still offer.\n- Recommendation: where possible, disable SMS fallback for accounts that have passkeys, and treat unexpected fallback prompts as a red flag.\n\nYou bookmarked a related Troy Hunt post — want me to pull that up too?'),
  ]},
]
