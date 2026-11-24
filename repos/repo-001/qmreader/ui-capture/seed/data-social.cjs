'use strict';
// Other readers and their public contributions. `on` = "sourceId:index" from data-entries.cjs.
const USERS = [
  { key: 'lin', name: '林一舟', email: 'lin.yizhou@example.cn', joinedDaysAgo: 180, bio: '后端工程师，关注 AI 编程和数据库。', links: [{ title: 'GitHub', url: 'https://github.com/linyizhou' }] },
  { key: 'chen', name: 'Chen Yu', email: 'chenyu.pm@example.com', joinedDaysAgo: 150, bio: 'B 端产品经理，每天读一篇英文长文。' },
  { key: 'momo', name: '默默读书', email: 'momo.reads@example.cn', joinedDaysAgo: 120 },
  { key: 'zhou', name: '周三', email: 'zhou.san@example.cn', joinedDaysAgo: 95, bio: '独立开发者，做过两个小工具，月入刚够房租。' },
  { key: 'kevin', name: 'Kevin W.', email: 'kevin.w@example.com', joinedDaysAgo: 70 },
  { key: 'ada', name: 'Ada 的笔记', email: 'ada.notes@example.cn', joinedDaysAgo: 45, bio: '在读博士，方向是 NLP。' },
  { key: 'xiaoyu', name: '小雨', email: 'xiaoyu2026@example.cn', joinedDaysAgo: 6 },
];

const COMMENTS = [
  { on: 'simonwillison:0', by: 'admin', afterHours: 2, body: '完全同意。我自己的项目把测试从 3 分钟压到 12 秒之后，Claude Code 一次成功率明显上来了。AGENTS.md 这个习惯值得推广。', helpful: ['lin', 'zhou', 'kevin', 'ada'] },
  { on: 'simonwillison:0', by: 'lin', afterHours: 4, body: '补充一点：报错信息里带上文件路径和行号，Agent 定位快很多。我们组把自定义异常都改成了这样。', helpful: ['admin', 'kevin'] },
  { on: 'simonwillison:0', by: 'kevin', afterHours: 9, body: 'make test 只跑相关测试这个太重要了，全量跑一遍 Agent 就超时了', helpful: [] },
  { on: 'paulgraham:0', by: 'chen', afterHours: 6, body: '“上一次因为和用户聊天而改变判断是什么时候”——这个问题我打印出来贴在显示器上了。', helpful: ['admin', 'momo', 'zhou'] },
  { on: 'paulgraham:0', by: 'zhou', afterHours: 30, body: '作为独立开发者深有体会。最忙的那几个月恰恰是收入最差的时候，因为一直在做“看起来很有成效”的事。', helpful: ['chen'] },
  { on: 'paulgraham:1', by: 'admin', afterHours: 12, body: 'PG 这篇有点悲观，但方向是对的：写作就是思考，外包写作等于外包思考。', helpful: ['momo', 'ada'] },
  { on: 'oneusefulthing:0', by: 'admin', afterHours: 3, body: '“把模型当同事而不是售货机”，这句话可以当团队 AI 培训的第一页。', helpful: ['chen', 'kevin', 'xiaoyu'] },
  { on: 'oneusefulthing:0', by: 'ada', afterHours: 20, body: '想看原始实验设计，样本量和评审标准文章里没写清楚，结论先打个问号。', helpful: ['lin'] },
  { on: 'interconnects:0', by: 'ada', afterHours: 8, body: '评估确实是现在最大的坑。我们实验室跑 RL，十次有六次是在 reward hacking 某个 benchmark。', helpful: ['admin', 'lin'] },
  { on: 'antirez:0', by: 'lin', afterHours: 5, body: '“AI 是好的假设生成器，但排查路径要人来定”，和我的体验一模一样。', helpful: ['admin'] },
  { on: 'antirez:0', by: 'admin', afterHours: 14, body: '让 AI 写 fuzzer 这一步太妙了，以后排查边界问题先试这个。', helpful: ['lin', 'kevin'] },
  { on: 'experimental-history:0', by: 'momo', afterHours: 10, body: '读完决定把 RSS 订阅从 200 个砍到 60 个。', helpful: ['admin', 'chen'] },
  { on: 'experimental-history:0', by: 'admin', afterHours: 16, body: '说得对，所以 QMReader 默认只放我自己真正会读的源。', helpful: ['momo'] },
  { on: 'qiaomu-blog:0', by: 'chen', afterHours: 3, body: '“少订阅、多沉淀”，已经按这个方法用了两周，确实每周能留下点东西。', helpful: ['admin'] },
  { on: 'qiaomu-blog:0', by: 'xiaoyu', afterHours: 70, body: '新用户报到～请问怎么把自己的公众号也加进来？', helpful: [] },
  { on: 'qiaomu-blog:1', by: 'zhou', afterHours: 8, body: '双开这个思路很实用，我现在也是 Codex 写、Claude 审。', helpful: ['admin', 'lin'] },
  { on: 'kexuefm:0', by: 'ada', afterHours: 22, body: '推导很漂亮，但遗忘门方差有界这个假设在实际训练里不一定成立，期待苏神后续实验。', helpful: [] },
  { on: 'huggingface:0', by: 'lin', afterHours: 6, body: '并行采样 + 验证器在仓库级任务上的扩展曲线很有参考价值，值得收藏。', helpful: ['ada'] },
  { on: 'github_trending:0', by: 'kevin', afterHours: 4, body: '试了一下，在 monorepo 上比想象中稳。', helpful: [] },
  { on: 'producthunt:0', by: 'chen', afterHours: 5, body: '会议多的人必备，团队文件夹终于来了。', helpful: ['momo'] },
  { on: 'tldrai:0', by: 'admin', afterHours: 1, body: 'DeepSeek 这篇论文的稀疏注意力细节值得单独精读。', helpful: [] },
  { on: 'bestblogs:0', by: 'zhou', afterHours: 7, body: 'MCP 权限边界那一节写得清楚，推荐给刚入门的朋友。', helpful: ['admin'] },
  { on: 'importai:0', by: 'momo', afterHours: 30, body: '三家公司控制一半以上前沿算力……这个数字有点吓人。', helpful: [] },
  { on: 'zhangxiaojun-zh:0', by: 'chen', afterHours: 12, body: '这期信息量很大，建议配合文字稿看。', helpful: ['admin'] },
];

const ANNOTATIONS = [
  { on: 'simonwillison:0', by: 'admin', afterHours: 2, quote: 'the agent is only as good as the feedback it gets from the environment', body: '全文核心。', helpful: ['lin', 'kevin'], replies: [{ by: 'lin', body: '同感，反馈 > 提示词。' }] },
  { on: 'simonwillison:0', by: 'zhou', afterHours: 11, quote: 'an AGENTS.md file that lists the three things that are easy to get wrong in this codebase', body: '今天就给自己的项目加上。', replies: [] },
  { on: 'paulgraham:0', by: 'admin', afterHours: 5, quote: 'they are trying to load the whole problem into their heads so that the answer can surface on its own', body: '这就是为什么散步有用。', helpful: ['chen'], replies: [{ by: 'chen', body: '洗澡时也一样 😂' }, { by: 'momo', body: 'PG 在 Holding a Program in One\'s Head 里也讲过类似的观点。' }] },
  { on: 'oneusefulthing:0', by: 'chen', afterHours: 7, quote: 'The lesson I keep coming back to is that the skill is not prompting. It is management', body: '产品经理的春天来了？', replies: [{ by: 'admin', body: '懂业务、会验收的人，用 AI 的效率最高。' }, { by: 'zhou', body: '同意楼上。' }] },
  { on: 'antirez:0', by: 'kevin', afterHours: 9, quote: 'It kept suggesting the most interesting explanation rather than the cheapest one to rule out.', body: '很准确的观察，模型好像天生偏爱“有趣”的答案。', helpful: ['admin', 'lin'], replies: [] },
  { on: 'interconnects:0', by: 'ada', afterHours: 10, quote: 'cannot tell whether their latest RL run made the model better or just better at the benchmark they were watching', body: '每天都在经历。', replies: [] },
  { on: 'qiaomu-blog:0', by: 'momo', afterHours: 20, quote: '订阅源控制在五十个以内，每天只精读三篇，读完一定写一句话。', body: '三条规则，简单可执行。', helpful: ['admin'], replies: [] },
];

const CHATS = [
  { on: 'simonwillison:0', by: 'admin', afterHours: 1, turns: [
    ['帮我总结三个要点', '这篇文章的三个要点：\n\n1. **反馈质量决定 Agent 表现**：测试快、报错具体时，Agent 能连续迭代直到成功；测试慢或报错模糊时，它会开始猜。\n2. **工作重心转移**：作者写代码的时间变少，更多时间花在让项目“对机器可读”——一条命令跑测试、README 讲清架构、补齐边界测试。\n3. **一份可执行清单**：测试 10 秒内、单一 lint 目标、模块边界有类型、写 AGENTS.md 列出三个易错点。'],
    ['这些建议适合小团队吗？', '适合，而且小团队收益更明显：\n\n- 小团队通常没有专职 QA，**快速测试**本身就是最划算的投资；\n- AGENTS.md 对新加入的人类同事同样有用，一份文档两种读者；\n- 文章没有讨论大型单体仓库的情况，那种场景下“只跑相关测试”需要额外的工具支持，这一点文中没有依据，需要你自己评估。'],
  ] },
  { on: 'paulgraham:0', by: 'chen', afterHours: 8, turns: [
    ['作者说的“不像工作的工作”具体包括哪些？', '文中举了三个例子：\n\n- 在奇怪的时间和用户聊天\n- 把同一个落地页改写六遍\n- 长时间散步\n\n共同点是：它们都在帮助创始人把整个问题装进脑子里，而不是推进某个边界清晰的任务。'],
  ] },
  { on: 'oneusefulthing:0', by: 'admin', afterHours: 4, turns: [
    ['这个实验的结论可信吗？有哪些待验证点？', '可以作为方向性参考，但有几点需要验证：\n\n- **样本量**：文章没有给出每组人数；\n- **评审方式**：提到外部评审团不知道谁用了 AI，但没说明评分标准；\n- **任务类型**：只测了“市场进入备忘录”这一类写作任务，能否推广到其他工作未知；\n- **组内差异**：“当同事 vs 当售货机”的划分是作者事后观察，不是预先设计的对照。\n\n结论方向与其他研究一致，但具体效应大小不要直接引用。'],
  ] },
  { on: 'antirez:0', by: 'lin', afterHours: 6, turns: [
    ['如果我要复现作者的排查方法，第一步做什么？', '按文章的思路，第一步是**让模型列出所有可能原因**，然后由你自己按“验证成本从低到高”排序，而不是按模型推荐的顺序。\n\n文中最终起作用的是一个小型 fuzzer，所以第二步可以直接让模型帮你针对可疑的输入字段（比如长度字段）写一个最小模糊测试。'],
  ] },
  { on: 'interconnects:0', by: 'ada', afterHours: 12, turns: [
    ['文章提到的后训练配方有具体数据量吗？', '文中只给了一个量级：**几千条高质量偏好数据**就能把基础模型调成好用的助手。没有给出具体模型、数据来源或评测结果，这部分需要去看作者引用的原始工作。'],
  ] },
  { on: 'kexuefm:0', by: 'ada', afterHours: 30, turns: [
    ['用通俗的话解释一下本文结论', '通俗地说：线性 Attention 每一步都会“忘掉”一部分旧信息。只要平均每步忘掉的比例稳定（遗忘门期望小于 1、波动不大），那么序列变长时误差只会**缓慢地（对数级）增加**，而不会失控。\n\n文中的实验也支持这一点：4K 训练、32K 测试，带门控的版本困惑度只上升约 3%。'],
  ] },
];

const SUBMISSIONS = [
  { by: 'lin', daysAgo: 3, url: 'https://jvns.ca/blog/2026/11/10/some-notes-on-sqlite-wal-mode/', title: 'Some notes on SQLite WAL mode', note: '讲 WAL 最清楚的一篇', markdown: 'I have been using SQLite in production for a while and WAL mode keeps confusing me, so here are some notes.\n\n## What WAL changes\n\nIn WAL mode, writes go to a separate log file and readers can keep reading the old version of the database while a write is happening.\n\n## Checkpoints\n\nEvery so often the log is copied back into the main database file. If you have long-running readers, the log can grow without bound.\n\n## What I do now\n\nI set busy_timeout, run checkpoints from a background job, and keep transactions short.' },
  { by: 'chen', daysAgo: 8, url: 'https://www.lennysnewsletter.com/p/how-ai-is-changing-product-management', title: 'How AI is changing product management', note: '产品经理必读', markdown: 'We surveyed 1,200 product managers about how AI tools changed their work this year.\n\n## The headline\n\nSeventy percent use AI daily, mostly for writing specs and synthesising user research.\n\n## What changed most\n\nPrototyping. PMs now ship clickable prototypes before writing a single line of a spec.\n\n## What did not change\n\nDeciding what to build. That is still the job.' },
  { by: 'zhou', daysAgo: 15, url: 'https://indiehackers.example.com/post/from-0-to-5k-mrr-with-a-chrome-extension', title: 'From $0 to $5k MRR with a Chrome extension', note: '', markdown: 'Eighteen months ago I launched a small Chrome extension that cleans up LinkedIn. Today it makes $5,000 a month.\n\n## What worked\n\nA tiny free tier, a clear paid upgrade, and replying to every support email myself.\n\n## What did not\n\nPaid ads. I spent $2,000 and got eleven customers.' },
  { by: 'admin', daysAgo: 22, url: 'https://sspai.com/post/98231', title: '我的 2026 年效率工具清单', note: '少数派这篇不错', markdown: '今年我的工具清单变化很大，最明显的是 AI 工具替代了一半以前的应用。\n\n## 写作\n\n还是用 Obsidian，但草稿越来越多交给 AI 先过一遍结构。\n\n## 阅读\n\nRSS 回归。用自建的阅读器订阅了四十多个源，每天早上半小时。\n\n## 任务管理\n\n从复杂的 GTD 系统回到了一张纸。' },
  { by: 'ada', daysAgo: 30, url: 'https://lilianweng.github.io/posts/2026-10-reward-hacking/', title: 'Reward Hacking in Reinforcement Learning', note: 'RL 必读综述', markdown: 'Reward hacking occurs when an agent exploits flaws in the reward function to achieve high reward without learning the intended behaviour.\n\n## Why it matters for LLMs\n\nAs RL from verifiable rewards becomes the main post-training method, reward hacking shows up as models that pass unit tests by special-casing them.\n\n## Mitigations\n\nHeld-out tests, reward model ensembles, and inspecting samples by hand.' },
  { by: 'kevin', daysAgo: 41, url: 'https://blog.example.dev/why-we-moved-back-to-postgres', title: 'Why we moved back to Postgres from a vector database', note: '', markdown: 'Two years ago we added a dedicated vector database. Last month we removed it.\n\n## The reasons\n\npgvector got fast enough, and keeping two databases in sync was the source of most of our bugs.\n\n## The migration\n\nIt took two engineers three weeks.' },
];

const PENDING_SUBMISSIONS = [
  { by: 'xiaoyu', hoursAgo: 5, url: 'https://mp.weixin.qq.com/s/Xr8k2PqLmN0aBcDeFgHiJk', title: '一个产品经理的 AI 转型笔记', note: '朋友写的，觉得不错' },
  { by: 'momo', hoursAgo: 19, url: 'https://www.newyorker.com/culture/the-weekend-essay/the-case-for-slow-reading', title: 'The Case for Slow Reading', note: '和 Experimental History 那篇呼应' },
  { by: 'kevin', hoursAgo: 52, url: 'https://news.ycombinator.com/item?id=45812233', title: 'Ask HN: What are you using for local LLM inference?', note: '' },
];

module.exports = { USERS, COMMENTS, ANNOTATIONS, CHATS, SUBMISSIONS, PENDING_SUBMISSIONS };
