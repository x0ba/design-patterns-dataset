'use strict';
// Minimal OpenAI-compatible stand-in for api.deepseek.com (chat/completions + models).
// Answers the app's four prompt shapes: title translation, block translation,
// Qiaomu-style rewrite and article chat. Uses the seed's lookup table when it
// knows the article, otherwise produces a generic but coherent Chinese reply.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.QM_AI_STUB_PORT || 4437);
const LOOKUP_FILE = path.join(__dirname, '..', 'seed', 'ai-lookup.json');
let lookup = { titles: {}, paragraphs: {} };
try { lookup = JSON.parse(fs.readFileSync(LOOKUP_FILE, 'utf8')); } catch { /* optional */ }

const MODEL = 'deepseek-v4-flash';

function strip(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

function zhTitle(title) {
  if (lookup.titles[title]) return lookup.titles[title];
  return `${title}（中文导读）`;
}

function zhParagraph(text) {
  const key = strip(text);
  if (lookup.paragraphs[key]) return lookup.paragraphs[key];
  // Keep proper nouns and numbers; describe the paragraph in Chinese.
  const terms = (key.match(/\b[A-Z][\w.-]+\b|\d[\d.,%]*/g) || []).slice(0, 4).join('、');
  return `这一段讲的是${terms ? `与 ${terms} 相关的` : ''}具体细节：${key.length > 140 ? '作者先交代背景，再给出自己的判断和例子，最后落到对读者的实际建议上。' : '作者用一句话点明了核心观点。'}（原文：${key.slice(0, 160)}）`;
}

function titleTranslation(user) {
  const data = JSON.parse(user);
  return JSON.stringify({
    translations: (data.items || []).map(item => ({ id: item.id, titleZh: zhTitle(item.title) })),
  });
}

function blockTranslation(user) {
  const data = JSON.parse(user);
  return JSON.stringify({
    titleZh: zhTitle(data.title || ''),
    summaryZh: data.summary ? zhParagraph(data.summary) : '',
    blocks: (data.blocks || []).map(block => {
      const target = zhParagraph(block.text);
      const tag = /^(p|h[1-6]|li|blockquote)$/.test(block.tag) ? block.tag : 'p';
      return { i: block.i, target, targetHtml: `<${tag}>${target}</${tag}>` };
    }),
  });
}

function rewrite(user) {
  const title = (user.match(/原始标题：(.*)/) || [])[1] || '这篇文章';
  const material = user.split('待处理材料：')[1] || '';
  const paras = material.split(/\n+/).map(strip).filter(p => p.length > 30).slice(0, 8);
  const known = paras.map(p => lookup.paragraphs[p]).filter(Boolean);
  const zh = known.length ? known : paras.slice(0, 4).map((p, i) => [
    '作者开门见山，先抛出了这篇文章要回答的问题，并交代了自己为什么关心它。',
    '接着给出了几个具体例子和数字，说明这个现象不是个例，而是正在变成常态。',
    '然后作者讨论了常见的误解：很多人把注意力放在工具本身，却忽略了流程和反馈。',
    '最后落到可执行的建议：先从一个小场景试起，记录结果，再决定要不要推广。',
  ][i]);
  return [
    `# ${zhTitle(title.trim())}`,
    '',
    '先说结论：这篇值得花十分钟读完，核心观点不复杂，但作者给的例子很扎实。',
    '',
    '## 作者在说什么',
    '',
    ...(zh.length ? zh.slice(0, 4) : ['原文篇幅较短，主要是一个观点加一个例子。']).flatMap(p => [p, '']),
    '## 我的看法',
    '',
    '对做产品和写代码的人来说，最有用的是把这个判断变成自己的检查清单：下次遇到类似问题时，先问一句“这一步真的必要吗”。',
    '',
    '如果你只有一分钟，记住一句话就够了：先把最小可用的版本跑起来，再谈优化。',
  ].join('\n');
}

function knownPoints(context) {
  const hits = [];
  for (const [en, zh] of Object.entries(lookup.paragraphs)) {
    if (context.includes(en.slice(0, 80))) hits.push(zh);
  }
  if (hits.length) return hits.slice(0, 4).map(p => `- ${p}`);
  const zhLines = context.split(/\n+/).map(strip).filter(p => /[㐀-鿿]{12,}/.test(p) && !/当前文章上下文/.test(p));
  return zhLines.slice(0, 3).map(p => `- ${p.replace(/^(摘要|正文片段|正文)[:：]\s*/, '').slice(0, 120)}`);
}

function chat(messages) {
  const context = (messages.find(m => /当前文章上下文如下/.test(m.content || '')) || {}).content || '';
  const rawTitle = ((context.match(/标题[:：]\s*(.*)/) || [])[1] || '这篇文章').trim();
  const title = lookup.titles[rawTitle] || rawTitle;
  const question = String((messages.filter(m => m.role === 'user').pop() || {}).content || '');
  const points = knownPoints(context);
  if (!points.length) points.push('- 文章篇幅较短，核心是一个观点加一个例子：先把最小可用的东西做出来，再根据真实反馈迭代。');
  if (/验证|事实|靠谱|可信/.test(question)) {
    return [`围绕《${title.trim()}》，可以重点核实这几处：`, '', ...(points.length ? points : ['- 文中引用的数据没有给出原始出处，建议回到原始报告确认。']), '', '文章本身没有给出对照组或样本量，这部分只能当作作者的经验判断。'].join('\n');
  }
  return [`基于《${title.trim()}》的内容，简要回答你的问题：`, '', ...(points.length ? points : ['- 文章的核心观点是先做出可用的东西，再迭代。']), '', '**我的判断**：文章的论证主要来自作者的一线经验，结论方向可信，但具体数字需要结合你自己的场景再验证。'].join('\n');
}

function answer(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = String((messages[0] || {}).content || '');
  const user = String((messages.find(m => m.role === 'user') || {}).content || '');
  try {
    if (/科技标题中文化助手/.test(system)) return titleTranslation(user);
    if (/英文到中文文章翻译助手/.test(system)) return blockTranslation(user);
    if (/文章上下文 Agent/.test(system)) return chat(messages);
    if (/待处理材料：/.test(user)) return rewrite(user);
  } catch (error) {
    console.error('[ai-stub]', error.message);
  }
  if (/连接测试|ping|test/i.test(user)) return 'OK';
  return '已收到。这是本地 AI 服务的回复：请求已经处理完成。';
}

function usage(text) {
  const n = Math.ceil(String(text).length / 2);
  return { prompt_tokens: 1200, completion_tokens: n, total_tokens: 1200 + n, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 1200 };
}

http.createServer((req, res) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    if (req.method === 'GET' && /\/models$/.test(req.url)) {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ object: 'list', data: [{ id: MODEL, object: 'model', owned_by: 'deepseek' }] }));
    }
    if (req.method !== 'POST' || !/chat\/completions$/.test(req.url.split('?')[0])) {
      res.writeHead(404, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'not found' } }));
    }
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch { /* empty */ }
    const text = answer(body);
    const id = `chatcmpl-${Date.now().toString(36)}`;
    const created = Math.floor(Date.now() / 1000);
    if (body.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      const pieces = text.match(/[\s\S]{1,12}/g) || [''];
      let i = 0;
      const tick = () => {
        if (i < pieces.length) {
          res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: MODEL, choices: [{ index: 0, delta: i === 0 ? { role: 'assistant', content: pieces[i] } : { content: pieces[i] }, finish_reason: null }] })}\n\n`);
          i += 1;
          return setTimeout(tick, 15);
        }
        res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: MODEL, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: usage(text) })}\n\n`);
        res.end('data: [DONE]\n\n');
      };
      return tick();
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      id, object: 'chat.completion', created, model: MODEL,
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      usage: usage(text),
    }));
  });
}).listen(PORT, '127.0.0.1', () => console.log(`[ai-stub] listening on http://127.0.0.1:${PORT}`));
