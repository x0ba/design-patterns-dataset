'use strict';
// Per-source feed items, newest first: [title, titleZh|null, summary, author?]
// `start` = hours before "now" of the newest item, `every` = average hours between items.
module.exports = [
  { id: 'simonwillison', start: 5, every: 30, items: [
    ['Making your codebase legible to coding agents', '让代码库对编程 Agent 可读', 'Three months of running coding agents against my own projects taught me that feedback quality beats prompt quality.', 'Simon Willison'],
    ['llm 0.31: plugins can now register tool collections', 'llm 0.31：插件现在可以注册工具集合', 'The new release of my LLM command-line tool lets plugins bundle related tools together, plus better async support.', 'Simon Willison'],
    ['Prompt injection is still unsolved, and that matters for agents', '提示注入仍未解决，这对 Agent 很关键', 'Every new browser agent launch reminds me that we still have no reliable defence against instructions hidden in web content.', 'Simon Willison'],
    ['Datasette Lite now runs Python plugins in the browser', 'Datasette Lite 现在可以在浏览器里运行 Python 插件', 'Thanks to Pyodide improvements, a surprising number of Datasette plugins now work entirely client-side.', 'Simon Willison'],
    ['Notes on the new Gemini long-context pricing', '关于 Gemini 新长上下文定价的笔记', 'Cached input tokens are now cheap enough that stuffing an entire codebase into context is a reasonable default.', 'Simon Willison'],
    ['Quoting Andrej Karpathy on vibe coding', '引用 Andrej Karpathy 谈氛围编程', 'A short quote that captures why throwaway prototypes are where LLM coding shines.', 'Simon Willison'],
    ['I built a tool to diff two SQLite databases', '我做了一个比较两个 SQLite 数据库差异的工具', 'sqlite-diff shows row-level changes between two database files, built mostly through a conversation with Claude.', 'Simon Willison'],
  ] },
  { id: 'paulgraham', start: 50, every: 24 * 35, items: [
    ['The Work That Doesn\'t Look Like Work', '看起来不像工作的工作', 'The best founders spend a surprising amount of time on things that look like procrastination from the outside.', 'Paul Graham'],
    ['Writes and Write-Nots', '会写的人与不会写的人', 'AI will make it unnecessary to learn to write, and that will split the world into people who can think and people who cannot.', 'Paul Graham'],
    ['When To Do What You Love', '什么时候该做你热爱的事', 'The question is not whether to do what you love, but how to find out what that is early enough to matter.', 'Paul Graham'],
    ['Founder Mode', '创始人模式', 'The conventional wisdom about delegating to good managers turns out to be wrong for founders of fast-growing companies.', 'Paul Graham'],
    ['The Reddits', 'Reddit 的故事', 'Steve and Alexis were the first founders we funded, and their story says a lot about what we did not know yet.', 'Paul Graham'],
  ] },
  { id: 'oneusefulthing', start: 20, every: 24 * 6, items: [
    ['Management is the new prompting', '管理才是新的提示词', 'In my latest classroom experiment, students who argued with the AI did far better than those who used it as a vending machine.', 'Ethan Mollick'],
    ['What just happened with reasoning models', '推理模型到底发生了什么', 'A plain-language guide to why the latest models suddenly got much better at maths, code and planning.', 'Ethan Mollick'],
    ['The Lazy Tyranny of the Wait Calculation', '等待计算的懒惰暴政', 'Should you start an AI project now or wait for better models? The math is less clear than it looks.', 'Ethan Mollick'],
    ['Four singularities for research', '科研的四个奇点', 'AI is changing how papers are written, reviewed, replicated and read, all at once.', 'Ethan Mollick'],
  ] },
  { id: 'interconnects', start: 30, every: 24 * 5, items: [
    ['Open models caught up. Evaluation is the new bottleneck', '开源模型追上来了，评估成了新瓶颈', 'Open-weight models had their busiest quarter ever; the hard part is now knowing whether RL actually helped.', 'Nathan Lambert'],
    ['A recipe for post-training in 2026', '2026 年的后训练配方', 'An updated overview of SFT, preference tuning and RL with verifiable rewards, with practical numbers.', 'Nathan Lambert'],
    ['Why reasoning traces are getting shorter', '为什么推理链越来越短', 'Labs are learning to reward concise thinking, and it changes the economics of inference.', 'Nathan Lambert'],
  ] },
  { id: 'antirez', start: 70, every: 24 * 12, items: [
    ['Four hours debugging Redis with an LLM', '用大模型调试 Redis 的四个小时', 'What worked and what did not when I paired with a model to find a subtle bug in a module.', 'antirez'],
    ['Vector sets are now part of Redis', '向量集合正式进入 Redis', 'A new data type for similarity search, designed to feel like the rest of Redis rather than a bolted-on index.', 'antirez'],
    ['We are destroying software', '我们正在毁掉软件', 'A short rant about complexity, dependencies and the forgotten joy of small programs.', 'antirez'],
  ] },
  { id: 'experimental-history', start: 90, every: 24 * 14, items: [
    ['Read less, read slower', '少读一点，读慢一点', 'Most of us would think better if we read fewer things more carefully.', 'Adam Mastroianni'],
    ['The decline of deviance', '离经叛道的衰落', 'Why do so many things, from movies to cities, seem to be converging on the same safe choices?', 'Adam Mastroianni'],
    ['Science is a strong-link problem', '科学是一个强链接问题', 'We should care much more about the best papers than about filtering out the worst ones.', 'Adam Mastroianni'],
  ] },
  { id: 'importai', start: 40, every: 24 * 7, items: [
    ['Import AI 434: long-horizon coding benchmarks; synthetic textbooks; compute concentration', 'Import AI 434：长周期编程基准、合成教材与算力集中', 'This week: agents that work for hours, small models that punch above their weight, and who owns the GPUs.', 'Jack Clark'],
    ['Import AI 433: robot foundation models get real; AI for weather; eval contamination', 'Import AI 433：机器人基础模型落地、AI 气象预报与评测污染', 'Robotics labs are finally sharing results you can reproduce at home.', 'Jack Clark'],
    ['Import AI 432: the economics of inference; Chinese open models; AI and biosecurity', 'Import AI 432：推理经济学、中国开源模型与生物安全', 'Inference prices fell another 5x this year. What does that do to the industry?', 'Jack Clark'],
    ['Import AI 431: AI scientists; distributed training over the internet', 'Import AI 431：AI 科学家与跨互联网分布式训练', 'A team trained a 10B model across volunteers\' GPUs on three continents.', 'Jack Clark'],
  ] },
  { id: 'qiaomu-blog', start: 26, every: 24 * 9, items: [
    ['半年用自己写的 RSS 阅读器，我留下了什么', null, '最大的变化不是读得更多，而是读完之后能留下东西。', '向阳乔木'],
    ['我的 AI 编程工作流：Claude Code + Codex 双开', null, '一个负责写，一个负责审，十分钟一个小功能。', '向阳乔木'],
    ['给非程序员的 Prompt 写作指南（2026 版）', null, '三个原则：说清楚目标、给出例子、要求它先问问题。', '向阳乔木'],
    ['为什么我不再追新模型了', null, '每个新模型发布都很热闹，但对我的日常工作影响越来越小。', '向阳乔木'],
    ['用 Cloudflare Workers 搭一个零成本的个人 API', null, '免费额度足够个人项目用，部署只要一条命令。', '向阳乔木'],
    ['读书笔记：《纳瓦尔宝典》里我最认同的五句话', null, '财富、杠杆、判断力，以及为什么要做长期的游戏。', '向阳乔木'],
  ] },
  { id: 'kexuefm', start: 60, every: 24 * 8, items: [
    ['线性Attention的长度外推：一个更一般的刻画', null, '把状态矩阵的演化看成随机过程，考察谱半径随序列长度的变化。', '苏剑林'],
    ['MoE环游记：从负载均衡到无辅助损失', null, '回顾 MoE 负载均衡的几种做法，以及为什么无辅助损失的方案效果更好。', '苏剑林'],
    ['再谈RoPE的远程衰减性质', null, '重新推导了 RoPE 的远程衰减上界，并讨论了 base 选择的影响。', '苏剑林'],
    ['Muon优化器的一些理论分析', null, '从谱范数的角度理解 Muon 为什么比 Adam 更适合大矩阵参数。', '苏剑林'],
  ] },
  { id: 'yuanchaofa', start: 110, every: 24 * 10, items: [
    ['从零实现一个 GRPO 训练循环', null, '用不到三百行 PyTorch 代码复现 GRPO 的核心逻辑，附完整注释。', 'chaofa'],
    ['大模型推理加速：投机解码原理与实践', null, '草稿模型 + 验证模型，如何在不损失质量的情况下提速 2-3 倍。', 'chaofa'],
    ['LLM 面试题整理：Attention 篇', null, 'MHA、MQA、GQA、MLA 的区别，以及面试中最常被追问的细节。', 'chaofa'],
  ] },
  { id: 'james-clear', start: 75, every: 24 * 7, items: [
    ['3-2-1: On the power of small wins, choosing your hard, and the cost of comfort', '3-2-1：小胜利的力量、选择你的困难，以及舒适的代价', 'Three ideas from me, two quotes from others, and one question for you.', 'James Clear'],
    ['3-2-1: How to stay focused, the value of patience, and starting before you are ready', '3-2-1：如何保持专注、耐心的价值，以及在准备好之前开始', 'Focus is not about saying yes to the important thing, it is about saying no to the good ones.', 'James Clear'],
    ['3-2-1: On rest, reputation, and doing the work', '3-2-1：关于休息、声誉与踏实做事', 'Rest is not the reward for finishing; it is part of the process.', 'James Clear'],
  ] },
  { id: 'bensbites', start: 8, every: 26, items: [
    ['OpenAI ships an agent mode for Sheets, and everyone is building browser agents', 'OpenAI 为表格推出 Agent 模式，大家都在做浏览器 Agent', 'Plus: a new open model from Mistral, and the best AI tools we tried this week.', 'Ben Tossell'],
    ['Claude can now control your desktop apps', 'Claude 现在可以控制你的桌面应用了', 'Computer use leaves beta, with much better reliability on everyday tasks.', 'Ben Tossell'],
    ['The vibe coding tools are getting serious', '氛围编程工具开始认真了', 'Lovable, Bolt and Replit all shipped backend features in the same week.', 'Ben Tossell'],
    ['Google\'s new image model is wild', '谷歌新的图像模型太夸张了', 'Text rendering, consistent characters, and editing by just asking.', 'Ben Tossell'],
    ['Cursor raises again, and what it means for dev tools', 'Cursor 再次融资，这对开发工具意味着什么', 'The AI IDE wars are entering the consolidation phase.', 'Ben Tossell'],
  ] },
  { id: 'tldrai', start: 3, every: 24, items: [
    ['DeepSeek V4 paper 📄, Apple\'s on-device model update 📱, AI chip export rules 🔒', 'DeepSeek V4 论文、苹果端侧模型更新、AI 芯片出口规则', 'The DeepSeek team published details of their sparse attention approach and training costs.', 'TLDR'],
    ['Gemini 3 Flash 🚀, Anthropic\'s interpretability update 🔬, Perplexity browser 🌐', 'Gemini 3 Flash、Anthropic 可解释性进展、Perplexity 浏览器', 'Google\'s fastest model now tops several coding leaderboards.', 'TLDR'],
    ['Meta\'s new Llama license 📜, Nvidia earnings 💰, open-source agents 🤖', 'Meta 新版 Llama 许可证、英伟达财报、开源 Agent', 'Nvidia data-center revenue beat expectations again.', 'TLDR'],
    ['xAI Grok 5 benchmarks 📊, Hugging Face SmolVLM 2 👀, AI in classrooms 🏫', 'xAI Grok 5 基准、Hugging Face SmolVLM 2、课堂里的 AI', 'A new small vision-language model runs comfortably on a laptop.', 'TLDR'],
    ['Microsoft MAI models 🧠, Runway Gen-5 🎬, synthetic data debates 🧪', '微软 MAI 模型、Runway Gen-5、合成数据之争', 'Microsoft is training its own frontier models for the first time.', 'TLDR'],
    ['OpenAI DevDay recap 🛠️, Qwen3.5 release 🐉, robot dogs at work 🐕', 'OpenAI 开发者大会回顾、Qwen3.5 发布、上班的机器狗', 'Everything announced at DevDay in five minutes.', 'TLDR'],
  ] },
  { id: 'levelingup', start: 55, every: 24 * 7, items: [
    ['The engineering manager\'s guide to AI-assisted code review', '工程经理的 AI 辅助代码评审指南', 'How teams are changing review norms now that half the diff was written by a model.', 'Luca Rossi'],
    ['How to run a great quarterly planning session', '如何开好一次季度规划会', 'A lightweight process that fits on one page and still gets buy-in.', 'Luca Rossi'],
    ['Measuring developer productivity without destroying morale', '在不打击士气的前提下衡量研发效率', 'DORA, SPACE and why the best metric is the one your team agrees on.', 'Luca Rossi'],
  ] },
  { id: 'nlp-elvis', start: 100, every: 24 * 7, items: [
    ['Top AI papers of the week: agent memory, RL scaling, small reasoning models', '本周 AI 论文精选：Agent 记忆、RL 扩展与小型推理模型', 'Ten papers worth reading, with one-paragraph summaries.', 'Elvis Saravia'],
    ['Context engineering is the new prompt engineering', '上下文工程是新的提示工程', 'Why the way you assemble context matters more than the words in your prompt.', 'Elvis Saravia'],
  ] },
  { id: 'waitbutwhy', start: 24 * 40, every: 24 * 90, items: [
    ['The Story of Us: Chapter 12', '我们的故事：第 12 章', 'On tribes, echo chambers and how societies can think together again.', 'Tim Urban'],
    ['The Cook and the Chef: Musk\'s Secret Sauce', '厨子与大厨：马斯克的秘方', 'Reasoning from first principles versus reasoning by analogy.', 'Tim Urban'],
  ] },
  { id: 'brainfood', start: 36, every: 24 * 7, items: [
    ['Brain Food: The Map Is Not the Territory', 'Brain Food：地图不是疆域', 'Models are useful precisely because they leave things out. The danger is forgetting what.', 'Shane Parrish'],
    ['Brain Food: Second-Order Thinking', 'Brain Food：二阶思维', 'Ask "and then what?" until the answer stops changing.', 'Shane Parrish'],
    ['Brain Food: The Pace of Learning', 'Brain Food：学习的节奏', 'Why the people who learn fastest rarely look like they are in a hurry.', 'Shane Parrish'],
  ] },
  { id: 'austinkleon', start: 44, every: 24 * 4, items: [
    ['Keep a logbook, not a diary', '写工作日志，而不是日记', 'A few lines a day about what you did is easier to keep up and more useful later.', 'Austin Kleon'],
    ['The art of the walk', '散步的艺术', 'Notes on walking as a creative practice, from Nietzsche to my neighbourhood loop.', 'Austin Kleon'],
    ['Steal from the old masters', '向老派大师偷师', 'Some of the freshest ideas are in very old books.', 'Austin Kleon'],
  ] },
  { id: 'scotthyoung', start: 130, every: 24 * 7, items: [
    ['How to learn a hard subject when you are busy', '忙碌时如何学习困难的学科', 'Thirty minutes a day, a clear syllabus, and lots of practice problems.', 'Scott H. Young'],
    ['Is it worth memorizing things in the age of AI?', 'AI 时代还值得记东西吗？', 'Memory is not storage; it is the raw material for thinking.', 'Scott H. Young'],
  ] },
  { id: 'dankoe', start: 80, every: 24 * 7, items: [
    ['How to become the person who can achieve your goals', '如何成为能实现目标的那个人', 'Identity first, habits second, outcomes last.', 'Dan Koe'],
    ['The one-person business model in the AI era', 'AI 时代的一人公司模式', 'Leverage used to need employees. Now it needs taste and distribution.', 'Dan Koe'],
  ] },
  { id: 'dwarkesh', start: 150, every: 24 * 12, items: [
    ['Why AGI timelines keep moving — a conversation with an AI researcher', '为什么 AGI 时间表总在变：对话一位 AI 研究员', 'Three hours on scaling, data walls and what continual learning would change.', 'Dwarkesh Patel'],
    ['The economics of a world with digital workers', '数字员工世界的经济学', 'What happens to wages, firms and growth when labour becomes software.', 'Dwarkesh Patel'],
  ] },
  { id: 'gwern', start: 24 * 20, every: 24 * 30, items: [
    ['Notes on scaling laws for retrieval', '关于检索扩展定律的笔记', 'Retrieval helps less than expected once models are large enough.', 'Gwern'],
    ['Why I write long essays', '我为什么写长文', 'Long essays are a way to think in public and get corrected.', 'Gwern'],
  ] },
  { id: 'geoffreylitt', start: 24 * 9, every: 24 * 25, items: [
    ['Malleable software in the age of LLMs', '大模型时代的可塑软件', 'When anyone can ask for a small tool, what should software look like?', 'Geoffrey Litt'],
    ['Code like a surgeon', '像外科医生一样写代码', 'Let AI handle the prep work so you can focus on the critical cuts.', 'Geoffrey Litt'],
  ] },
  { id: 'construction-physics', start: 24 * 4, every: 24 * 10, items: [
    ['Why are data centers so hard to build?', '为什么数据中心这么难建？', 'Power, transformers and permitting are now the binding constraints on AI.', 'Brian Potter'],
    ['The learning curve of solar panels, revisited', '重新审视太阳能电池板的学习曲线', 'Costs keep falling faster than almost anyone predicted.', 'Brian Potter'],
  ] },
  { id: 'chinai', start: 24 * 6, every: 24 * 7, items: [
    ['ChinAI #312: How Chinese labs talk about AGI internally', 'ChinAI #312：中国实验室内部如何谈论 AGI', 'Translating a long interview with a Chinese lab founder about compute and talent.', 'Jeffrey Ding'],
    ['ChinAI #311: Local governments and the AI compute boom', 'ChinAI #311：地方政府与 AI 算力热潮', 'Dozens of cities announced compute centres. How many are actually used?', 'Jeffrey Ding'],
  ] },
  { id: 'readwise-wise', start: 60, every: 24 * 7, items: [
    ['Wisereads Vol. 98: on attention, craft and long games', 'Wisereads 第 98 期：注意力、手艺与长期游戏', 'Six links our team could not stop talking about this week.', 'Readwise'],
    ['Wisereads Vol. 97: the best things we read in October', 'Wisereads 第 97 期：十月我们读到的最好内容', 'Essays, a book excerpt, and one very good podcast.', 'Readwise'],
  ] },
  { id: 'superhuman_ai', start: 12, every: 30, items: [
    ['Superhuman AI: 5 AI tools that save me 10 hours a week', 'Superhuman AI：每周帮我省 10 小时的 5 个 AI 工具', 'Meeting notes, inbox triage, and a surprisingly good research agent.', 'Zain Kahn'],
    ['Superhuman AI: How to build a custom GPT for your team', 'Superhuman AI：如何为团队搭建定制 GPT', 'A step-by-step guide with templates.', 'Zain Kahn'],
  ] },
  { id: 'aibreakfast', start: 18, every: 30, items: [
    ['AI Breakfast: Gemini gets agent mode, and the robots are coming', 'AI Breakfast：Gemini 推出 Agent 模式，机器人来了', 'The morning\'s AI news in five minutes.', 'AI Breakfast'],
    ['AI Breakfast: Apple quietly ships a new foundation model', 'AI Breakfast：苹果悄悄发布新基础模型', 'And a startup that turns PDFs into podcasts.', 'AI Breakfast'],
  ] },
  { id: 'whytryai', start: 24 * 5, every: 24 * 9, items: [
    ['I tested 7 AI image models on the same 10 prompts', '我用同样 10 个提示词测试了 7 个 AI 图像模型', 'Side-by-side results, and which one I would actually pay for.', 'Daniel Nest'],
  ] },
  { id: 'tylerfolkman', start: 24 * 8, every: 24 * 9, items: [
    ['What I learned shipping an LLM feature to a million users', '向百万用户上线大模型功能的经验', 'Latency budgets, fallbacks, and the eval set that saved us.', 'Tyler Folkman'],
  ] },
  { id: 'igerman', start: 24 * 3, every: 24 * 6, items: [
    ['Cómo uso la IA para escribir mejor (sin que escriba por mí)', '我如何用 AI 写得更好（而不是让它替我写）', 'Un flujo sencillo: borrador propio, crítica de la IA, reescritura propia.', 'Germán'],
    ['Las herramientas que uso cada día en 2026', '2026 年我每天都在用的工具', 'Notas, tareas, lectura y automatizaciones.', 'Germán'],
  ] },
  { id: 'ds-ai-section', start: 24 * 2, every: 24 * 5, items: [
    ['A practical guide to evaluating RAG pipelines', 'RAG 流水线评估实用指南', 'Retrieval recall, answer faithfulness and how to build a small golden set.', 'DS AI Section'],
  ] },
  { id: 'theresanaiforthat', start: 15, every: 40, items: [
    ['This week in AI tools: 312 new launches', '本周 AI 工具：312 个新产品上线', 'Our picks for note-taking, video editing and code review.', 'TAAFT'],
  ] },
  { id: 'xnews', start: 9, every: 20, items: [
    ['How we got to $10M ARR with four people', '四个人如何做到 1000 万美元年经常性收入', 'A founder thread on staying small, charging more, and saying no to enterprise custom work.', 'X News'],
    ['The hidden cost of AI-generated code in production', '生产环境中 AI 生成代码的隐性成本', 'An engineering lead on review fatigue, subtle bugs and what they changed.', 'X News'],
    ['Why I left Big Tech to build a one-person AI studio', '我为什么离开大厂做一人 AI 工作室', 'Two years in: revenue, mistakes and the tools that make it possible.', 'X News'],
  ] },
  { id: 'huggingface', start: 6, every: 6, items: [
    ['Scaling Test-Time Compute for Agentic Coding', '为 Agent 编程扩展测试时计算', 'We study how parallel sampling and verification scale on repository-level tasks.', 'Hugging Face Papers'],
    ['SmolLM3: A Small, Multilingual, Long-Context Reasoner', 'SmolLM3：小型多语言长上下文推理模型', 'A 3B model with 128K context trained on 11T tokens.', 'Hugging Face Papers'],
    ['Memory Layers at Scale', '大规模记忆层', 'Trainable key-value memory layers improve factual recall at modest cost.', 'Hugging Face Papers'],
    ['Visual Agents Can Learn from Their Own Mistakes', '视觉 Agent 可以从自己的错误中学习', 'Self-reflection on failed trajectories improves GUI agent success rates by 18%.', 'Hugging Face Papers'],
    ['Diffusion Language Models Are Super Data Learners', '扩散语言模型是超强的数据学习者', 'Under data constraints, diffusion LMs keep improving where autoregressive models saturate.', 'Hugging Face Papers'],
    ['Reinforcement Learning with Rubric Rewards', '基于评分细则奖励的强化学习', 'Using LLM-graded rubrics as rewards for open-ended tasks.', 'Hugging Face Papers'],
    ['A Survey on Context Engineering for Large Language Models', '大语言模型上下文工程综述', 'A taxonomy of retrieval, memory, tool use and context compression techniques.', 'Hugging Face Papers'],
    ['Long-Horizon Video Understanding with Streaming Memory', '基于流式记忆的长视频理解', 'Processing hour-long videos with a fixed memory budget.', 'Hugging Face Papers'],
  ] },
  { id: 'producthunt', start: 7, every: 5, items: [
    ['Granola 2.0', 'Granola 2.0：会议笔记 AI 助手', 'The AI notepad for people in back-to-back meetings, now with team folders.', 'Product Hunt'],
    ['Raycast AI Extensions', 'Raycast AI 扩展：在启动器里调用 AI 工具', 'Build AI-powered commands in minutes with natural language.', 'Product Hunt'],
    ['Lovable Cloud', 'Lovable Cloud：一句话生成全栈应用', 'Database, auth and hosting for apps you build by chatting.', 'Product Hunt'],
    ['Notion Mail', 'Notion Mail：自动整理的 AI 邮箱', 'An inbox that organizes itself, thinks like you, and works the way you do.', 'Product Hunt'],
    ['Dia Browser', 'Dia 浏览器：内置 AI 助手的浏览器', 'The AI browser from The Browser Company.', 'Product Hunt'],
    ['Superwhisper 3', 'Superwhisper 3：本地语音转文字', 'Voice to text that runs entirely on your Mac.', 'Product Hunt'],
  ] },
  { id: 'github_trending', start: 10, every: 6, items: [
    ['openai/codex', 'openai/codex：终端里的轻量编程 Agent', 'Lightweight coding agent that runs in your terminal. ★ 2,140 today', 'GitHub Trending'],
    ['browser-use/browser-use', 'browser-use：让 AI Agent 操作网站', 'Make websites accessible for AI agents. ★ 980 today', 'GitHub Trending'],
    ['microsoft/markitdown', 'microsoft/markitdown：把文件转换为 Markdown', 'Python tool for converting files and office documents to Markdown. ★ 760 today', 'GitHub Trending'],
    ['astral-sh/uv', 'astral-sh/uv：极快的 Python 包管理器', 'An extremely fast Python package and project manager, written in Rust. ★ 410 today', 'GitHub Trending'],
    ['unslothai/unsloth', 'unsloth：更快更省显存的大模型微调', 'Fine-tune LLMs 2x faster with 70% less memory. ★ 390 today', 'GitHub Trending'],
    ['ggml-org/llama.cpp', 'llama.cpp：C/C++ 大模型推理', 'LLM inference in C/C++. ★ 350 today', 'GitHub Trending'],
    ['anthropics/claude-code', 'claude-code：Anthropic 的命令行编程 Agent', 'Agentic coding tool that lives in your terminal. ★ 1,320 today', 'GitHub Trending'],
  ] },
  { id: 'bestblogs', start: 4, every: 14, items: [
    ['一文看懂 MCP：大模型如何安全地调用外部工具', null, '从协议设计、权限边界到常见实现，系统梳理 Model Context Protocol。', 'BestBlogs'],
    ['字节跳动的 AI 编程实践：从代码补全到 Agent', null, '内部数据显示，AI 生成代码占比已超过三成。', 'BestBlogs'],
    ['阿里云：大模型推理成本优化的十个技巧', null, 'KV Cache 复用、批处理、量化与路由策略。', 'BestBlogs'],
    ['Context Engineering: The Missing Manual', '上下文工程：缺失的那本手册', 'A practitioner\'s guide to deciding what goes into the context window.', 'BestBlogs'],
    ['产品经理如何用 AI 做用户研究', null, '访谈整理、需求聚类与竞品分析的实操流程。', 'BestBlogs'],
  ] },
  { id: 'latentspace', start: 24 * 3, every: 24 * 6, items: [
    ['The Agent Engineering Stack, with the founders of a coding agent startup', 'Agent 工程技术栈：对话一家编程 Agent 创业公司创始人', 'Sandboxes, evals and why most agent failures are context failures.', 'Latent Space'],
    ['AI Engineer World\'s Fair recap: what we learned', 'AI 工程师世界博览会回顾：我们学到了什么', 'The biggest themes from three days and two hundred talks.', 'Latent Space'],
  ] },
  { id: 'lex-zh', start: 24 * 2, every: 24 * 8, items: [
    ['Lex Fridman 对话 DeepSeek 研究员：开源、算力与中国 AI', null, '三个半小时，从 MoE 架构聊到训练成本，再到开源的商业逻辑。', 'Lex Fridman · 中文精读'],
    ['Lex Fridman 对话 Cursor 团队：AI 编程的未来', null, '为什么 IDE 是 AI 编程最好的载体？', 'Lex Fridman · 中文精读'],
  ] },
  { id: 'zhangxiaojun-zh', start: 24 * 4, every: 24 * 9, items: [
    ['对话月之暗面杨植麟：长文本、Agent 与模型公司的终局', null, '一次很坦诚的访谈，聊到了融资、竞争和技术路线的选择。', '张小珺商业访谈录 · 精读'],
    ['对话一位具身智能创业者：机器人离进家还有多远', null, '硬件成本、数据飞轮与第一个真正有用的场景。', '张小珺商业访谈录 · 精读'],
  ] },
  { id: 'nexttoken', start: 24 * 5, every: 24 * 10, items: [
    ['EP42 推理模型之后，下一个突破在哪里', null, '两位一线研究员聊强化学习、合成数据和评估。', 'Next Token'],
    ['EP41 一人公司能走多远：三位独立开发者的真实收入', null, '从 0 到月入十万，他们做对了什么。', 'Next Token'],
  ] },
  { id: 'bannatie', start: 24 * 6, every: 24 * 7, items: [
    ['No.168 柯达：发明了数码相机，却被数码相机打败', null, '一个关于创新者窘境的经典商业故事。', '半拿铁'],
    ['No.167 任天堂：一家扑克牌公司的百年转型', null, '从花札到 Switch，任天堂一直在做“别人不做的游戏”。', '半拿铁'],
  ] },
];
