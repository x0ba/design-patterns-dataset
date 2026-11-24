'use strict';
// Long-form articles with full body, paragraph-level Chinese translation and a
// Qiaomu-style rewrite. Keyed by "sourceId:index" into data-entries.cjs.
module.exports = {
  'simonwillison:0': {
    en: [
      'I have been running coding agents in a loop against my own projects for about three months now, and the single most useful thing I have learned is that the agent is only as good as the feedback it gets from the environment.',
      'When the test suite is fast and the error messages are specific, Claude Code or Codex will happily iterate twenty times and land on a working change. When the tests take four minutes or print a wall of stack trace, the agent starts guessing.',
      'So the real work has shifted. I spend less time writing code and more time making the project legible to a machine: a one-line command that runs the relevant tests, a README section that explains the architecture in plain words, and fixtures that cover the weird edge cases.',
      'None of this is new advice. It is exactly what you would do for a new human contributor. The difference is that the agent contributor shows up fifty times a day and never gets bored of reading your CONTRIBUTING.md.',
      'My current checklist: tests under ten seconds, a single make target for lint, typed boundaries at every module edge, and an AGENTS.md file that lists the three things that are easy to get wrong in this codebase.',
    ],
    zh: [
      '大约三个月来，我一直让编程 Agent 在自己的项目上循环运行。学到的最有用的一点是：Agent 的表现上限，取决于它从环境里拿到的反馈质量。',
      '如果测试套件够快、报错信息够具体，Claude Code 或 Codex 会愿意迭代二十次，最后交出一个能用的改动。如果测试要跑四分钟，或者打印出一整屏堆栈，Agent 就开始瞎猜。',
      '所以真正的工作发生了转移。我写代码的时间变少了，更多时间花在让项目对机器“可读”：一条命令就能跑相关测试，README 里用大白话讲清架构，再准备覆盖奇怪边界情况的测试夹具。',
      '这些建议都不新鲜，跟你给新来的人类贡献者做的准备一模一样。区别在于，Agent 贡献者一天来五十次，而且永远不会读腻你的 CONTRIBUTING.md。',
      '我现在的清单：测试十秒以内跑完；lint 只用一个 make 目标；每个模块边界都有类型约束；再写一个 AGENTS.md，列出这个代码库里最容易搞错的三件事。',
    ],
    rewrite: `# 让 Agent 写好代码的秘诀，是让项目“对机器可读”

Simon Willison 用编程 Agent 跑了三个月自己的项目，总结出一句话：**Agent 有多强，取决于环境给它的反馈有多好。**

## 反馈越快，Agent 越聪明

测试快、报错准，Claude Code 和 Codex 能连续迭代二十轮直到跑通；测试慢、报错是一整屏堆栈，它们就开始乱猜。

这其实和人一样，只是 Agent 对反馈质量更敏感。

## 工作重心变了

现在他写代码的时间少了，更多时间在做“项目可读性”：

- 一条命令跑相关测试
- README 用大白话讲架构
- 测试夹具覆盖边界情况

这些都是给新同事准备的老建议。区别是，Agent 一天来五十次，而且永远不嫌你的文档长。

## 一份能直接抄的清单

1. 测试十秒内跑完
2. lint 只有一个 make 目标
3. 模块边界都有类型
4. 写一个 AGENTS.md，列出最容易踩的三个坑

我的看法：这份清单比任何“提示词技巧”都值钱。项目本身越干净，换哪个模型都好用。`,
  },
  'paulgraham:0': {
    en: [
      'One of the most surprising things I have noticed about the best founders is how much time they spend on things that do not look like work. They talk to users at odd hours, they rewrite the same landing page six times, and they go for long walks.',
      'From the outside this looks like procrastination. From the inside it is the opposite: they are trying to load the whole problem into their heads so that the answer can surface on its own.',
      'The founders who struggle tend to do the reverse. They fill their days with tasks that feel productive, like hiring, fundraising decks and process documents, because those tasks have clear edges. The hard, ambiguous question of what users actually want gets pushed to later.',
      'If you are not sure which kind of founder you are, here is a simple test. Ask yourself when you last changed your mind about something important in the product because of a conversation with a user. If the answer is more than a month ago, you are probably working on the wrong things.',
    ],
    zh: [
      '我在最优秀的创始人身上发现的最意外的一点，是他们花大量时间做看起来不像工作的事情。他们会在奇怪的时间和用户聊天，把同一个落地页改写六遍，还会去长时间散步。',
      '从外面看，这像是拖延。从里面看恰恰相反：他们在努力把整个问题装进脑子里，好让答案自己浮现出来。',
      '陷入困境的创始人往往反过来。他们用感觉很有成效的任务填满日程，比如招聘、融资 PPT 和流程文档，因为这些任务边界清晰。而“用户到底想要什么”这个困难又模糊的问题，被一推再推。',
      '如果你不确定自己是哪一类创始人，有个简单的测试：问问自己，上一次因为和用户的一次对话而改变对产品某件重要事情的看法，是什么时候？如果答案是一个多月以前，你很可能在做错误的事。',
    ],
    rewrite: `# 最好的创始人，看起来都像在“摸鱼”

Paul Graham 发现一个反直觉的现象：顶尖创始人花很多时间做“不像工作”的事——半夜跟用户聊天、把落地页改六遍、出去散很久的步。

## 这不是拖延

外人看是摸鱼，其实是在把整个问题塞进脑子里，等答案自己冒出来。

## 挣扎的创始人在干什么

他们反而很“忙”：招人、做融资 PPT、写流程文档。这些事边界清楚、做完有成就感。

真正难的问题——**用户到底要什么**——被一直往后推。

## 一个自测题

> 上一次因为和用户聊天而改变产品上的重要判断，是什么时候？

超过一个月，大概率你在忙错的事。

我的看法：这个问题适合每周问自己一次，比看任何增长指标都诚实。`,
  },
  'oneusefulthing:0': {
    en: [
      'Every few months I run the same informal experiment with my MBA students. I give half the class access to the current frontier model and ask everyone to produce a market-entry memo in ninety minutes.',
      'This semester the gap between the two groups was the largest I have seen. The AI group did not just write faster; their memos considered more alternatives, cited more specific numbers, and were rated higher by an outside panel that did not know who had used AI.',
      'But the most interesting finding was inside the AI group. Students who treated the model as a coworker, arguing with it and asking it to critique their draft, outperformed students who used it as a vending machine for finished paragraphs.',
      'The lesson I keep coming back to is that the skill is not prompting. It is management: knowing what good looks like, delegating the parts that can be delegated, and checking the work.',
    ],
    zh: [
      '每隔几个月，我都会和 MBA 学生做同一个非正式实验：让班上一半的人使用当前最前沿的模型，然后要求所有人在九十分钟内写出一份市场进入备忘录。',
      '这学期两组之间的差距是我见过最大的。AI 组不只是写得更快；他们的备忘录考虑了更多备选方案，引用了更多具体数字，并且被一个不知道谁用了 AI 的外部评审团打出了更高的分数。',
      '但最有意思的发现在 AI 组内部。把模型当同事的学生——和它争论、让它批评自己的草稿——表现优于把它当作成品段落自动售货机的学生。',
      '我反复回到的结论是：关键技能不是写提示词，而是管理——知道什么是好结果，把能委托的部分委托出去，然后检查交付物。',
    ],
    rewrite: `# 用好 AI 的核心技能不是提示词，是“管理”

Ethan Mollick 每学期都在 MBA 课上做同一个实验：一半学生用最强模型，90 分钟写一份市场进入备忘录。

## 差距越来越大

这学期 AI 组明显胜出：方案更多、数字更具体、盲评得分更高。

## 真正的差别在 AI 组内部

- **把模型当同事**：跟它争论、让它挑毛病 → 表现最好
- **把模型当售货机**：直接要成品段落 → 表现一般

## 结论

会用 AI ≠ 会写提示词。真正的能力是管理：

1. 知道什么是好结果
2. 把能委托的部分交出去
3. 认真检查交付物

我的看法：这和带新人是一回事。你自己判断力不够，AI 再强也帮不上。`,
  },
  'interconnects:0': {
    en: [
      'The open-weight model ecosystem had its busiest quarter ever. Qwen, DeepSeek, Mistral and a handful of newer labs shipped models that match last year\'s closed frontier on most public benchmarks.',
      'What changed is not only raw capability. Post-training recipes are now widely shared, and the gap between a base model and a useful assistant can be closed by a small team with a few thousand high-quality preference pairs.',
      'The bottleneck has moved to evaluation. Most teams I talk to cannot tell whether their latest RL run made the model better or just better at the benchmark they were watching.',
      'My prediction for next year: the most valuable open releases will not be models but evaluation suites and environments that let others measure real progress on agentic tasks.',
    ],
    zh: [
      '开源权重模型生态迎来了有史以来最忙碌的一个季度。Qwen、DeepSeek、Mistral 以及几家新实验室发布的模型，在大多数公开基准上已经追平了去年的闭源前沿水平。',
      '变化的不只是原始能力。后训练配方如今被广泛分享，一个小团队只需几千条高质量偏好数据，就能把基础模型变成好用的助手。',
      '瓶颈已经转移到评估。我交流过的大多数团队都无法判断，最新一轮强化学习到底让模型变得更好了，还是只是在他们盯着的那个基准上变得更好了。',
      '我对明年的预测：最有价值的开源发布不会是模型，而是评估套件和环境，让其他人能衡量 Agent 任务上的真实进展。',
    ],
    rewrite: `# 开源模型追上来了，下一个瓶颈是“评估”

Nathan Lambert 认为，开源权重模型刚过完最忙的一个季度：Qwen、DeepSeek、Mistral 等发布的模型，在多数基准上已追平去年的闭源前沿。

## 后训练不再是秘密

配方被大量公开。小团队拿几千条高质量偏好数据，就能把基础模型调成好用的助手。

## 现在卡在哪

**评估。** 很多团队分不清：RL 跑完，模型是真变强了，还是只在盯着的那个榜单上变强了。

## 明年最值钱的开源

不是模型，而是**评估套件和 Agent 环境**——让大家能测出真实进步。

我的看法：做应用的团队也该早点建自己的评估集，别只看公开榜单。`,
  },
  'antirez:0': {
    en: [
      'Yesterday I spent four hours with an LLM trying to find a subtle bug in a Redis module, and I want to describe what worked and what did not, because the experience was not what the hype suggests.',
      'The model was excellent at reading unfamiliar code quickly and proposing hypotheses. Within ten minutes it had listed five plausible causes, and two of them were things I had not considered.',
      'It was terrible at the part that matters most: deciding which hypothesis to test first. It kept suggesting the most interesting explanation rather than the cheapest one to rule out.',
      'In the end the bug was a missing check on a length field, found because I wrote a tiny fuzzer, something the model helped me write in two minutes. The collaboration worked, but only because I stayed in charge of the search.',
    ],
    zh: [
      '昨天我花了四个小时和一个大模型一起排查 Redis 模块里的一个隐蔽 bug。我想说说哪些有效、哪些无效，因为这次体验和炒作宣传的并不一样。',
      '模型在快速阅读陌生代码、提出假设方面非常出色。十分钟内它就列出了五个合理原因，其中两个是我没想到的。',
      '但在最关键的环节它很糟糕：决定先验证哪个假设。它总是推荐最“有趣”的解释，而不是最容易排除的那个。',
      '最后 bug 是长度字段缺了一个检查，是我写了一个小型模糊测试器才发现的——而这个模糊测试器是模型两分钟帮我写出来的。合作是成功的，但前提是我始终掌控着排查方向。',
    ],
    rewrite: `# Redis 作者：和 AI 一起抓 bug 的四小时

antirez 用大模型排查 Redis 模块里的一个隐蔽 bug，结论和宣传的不太一样。

## AI 擅长的

- 快速读懂陌生代码
- 十分钟列出五个可能原因，其中两个他自己没想到

## AI 不擅长的

**决定先查哪个。** 它总爱推荐最“有意思”的解释，而不是最便宜、最容易排除的那个。

## 最后怎么找到的

一个长度字段漏了检查。是他写了个小 fuzzer 才抓到的——这个 fuzzer 是 AI 两分钟写好的。

我的看法：AI 是很好的“假设生成器”，但排查路径必须人来定。`,
  },
  'experimental-history:0': {
    en: [
      'There is a strange genre of advice that tells you to read more papers, more books, more newsletters. I want to argue for the opposite: most of us would think better if we read fewer things more slowly.',
      'When I look back at the ideas that actually changed how I work, almost none of them came from skimming. They came from a handful of texts I read three or four times, arguing with them in the margins.',
      'The internet has made it trivially easy to feel informed. It has not made it any easier to understand something well enough to disagree with it.',
    ],
    zh: [
      '有一类奇怪的建议总让你读更多论文、更多书、更多通讯。我想唱个反调：我们大多数人如果读得更少、更慢，反而会思考得更好。',
      '回头看那些真正改变我工作方式的想法，几乎没有一个来自快速浏览。它们来自少数几篇我读了三四遍、在页边和作者争论过的文本。',
      '互联网让“感觉自己很了解”变得轻而易举，却没有让“理解到足以反驳”变得更容易一点。',
    ],
    rewrite: `# 少读一点，读慢一点

Adam Mastroianni 唱反调：别再追求“读更多”了。

真正改变他做事方式的想法，几乎都来自少数几篇**反复读三四遍、在页边跟作者吵架**的文章，而不是刷出来的。

> 互联网让人轻松“感觉懂了”，但没让“懂到能反驳”变容易。

我的看法：RSS 阅读器也一样，订阅源越多越要克制。每周挑一篇精读，比扫一百个标题有用。`,
  },
  'importai:0': {
    en: [
      'This week: a new benchmark for long-horizon software tasks, a paper showing that small models trained on synthetic textbooks can beat much larger ones at grade-school math, and a sobering report on compute concentration.',
      'The long-horizon benchmark is the one to watch. Instead of single-file bug fixes, tasks require changes across a real repository over several hours of agent time. Current systems complete about a third of them.',
      'The compute report estimates that three companies now control more than half of the world\'s frontier training capacity. Whatever you think about AI policy, that number should shape the conversation.',
    ],
    zh: [
      '本周看点：一个面向长周期软件任务的新基准；一篇论文显示，用合成教材训练的小模型在小学数学上可以击败大得多的模型；以及一份关于算力集中度的令人警醒的报告。',
      '长周期基准最值得关注。任务不再是修复单个文件的 bug，而是需要 Agent 在真实代码库中花数小时跨文件修改。目前的系统大约能完成三分之一。',
      '算力报告估计，三家公司如今控制着全球一半以上的前沿训练算力。无论你怎么看 AI 政策，这个数字都应该成为讨论的起点。',
    ],
    rewrite: null,
  },
  'qiaomu-blog:0': {
    zhOnly: true,
    body: [
      '这半年我把每天的信息输入几乎全搬进了自己写的 RSS 阅读器。最大的变化不是读得更多，而是读完之后能留下东西。',
      '以前在推特和公众号里刷到好文章，收藏夹越堆越多，回头一看全忘了。现在每篇值得读的文章，要么有一份中文改写，要么有我写的一两句点评，过几周再搜还能找到当时的判断。',
      '另一个意外收获是“先快后慢”的刷新机制。RSS 先抓回来，AI 翻译和改写在后台慢慢补，早上打开时列表已经是中文标题了，挑着读就行。',
      '如果你也被信息流淹没，我的建议是：少订阅、多沉淀。订阅源控制在五十个以内，每天只精读三篇，读完一定写一句话。',
    ],
    rewrite: null,
  },
  'kexuefm:0': {
    zhOnly: true,
    body: [
      '本文继续讨论线性 Attention 的长度外推问题。上一篇我们证明了在某些衰减假设下，线性 Attention 的有效感受野是有界的，这一篇尝试给出一个更一般的刻画。',
      '核心思路是把状态矩阵的演化看成一个随机过程，然后考察其谱半径随序列长度的变化。结果表明，只要遗忘门的期望小于 1 且方差有界，外推误差就随长度对数增长。',
      '这个结论和实验观察是吻合的：在 4K 训练、32K 测试的设置下，带门控的变体困惑度只上升约 3%，而不带门控的版本则明显发散。',
    ],
    rewrite: null,
  },
};
