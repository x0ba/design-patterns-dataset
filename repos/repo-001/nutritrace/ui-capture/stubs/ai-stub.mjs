// Local stand-in for an OpenAI-compatible chat endpoint (what Ollama / LM
// Studio expose). NutriTrace's server proxies Trace chat here via
// AI_PROVIDER=oai-compat + AI_BASE_URL. The stub drives the app's own tool
// loop: on a fresh user turn it asks for get_diary_averages + get_goals, then
// writes an answer from the real numbers the client tools return.
import http from 'node:http';

const PORT = Number(process.env.AI_STUB_PORT || 4450);
const MODEL = process.env.AI_MODEL || 'llama3.1:8b-instruct';

function textOf(m) {
  if (!m) return '';
  if (typeof m.content === 'string') return m.content;
  if (Array.isArray(m.content)) return m.content.map(p => p.text || '').join(' ');
  return '';
}

function reply(content, toolCalls) {
  const message = { role: 'assistant', content: toolCalls ? null : content };
  if (toolCalls) message.tool_calls = toolCalls;
  return {
    id: 'chatcmpl-' + Math.random().toString(36).slice(2, 12),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: MODEL,
    choices: [{ index: 0, message, finish_reason: toolCalls ? 'tool_calls' : 'stop' }],
    usage: { prompt_tokens: 1450, completion_tokens: 210, total_tokens: 1660 },
  };
}

function parseJson(s) { try { return JSON.parse(s); } catch { return null; } }

function goalNum(g) { return g ? (g.max ?? g.min ?? null) : null; }

function compose(question, tools) {
  const avg = tools.get_diary_averages;
  const goalsRes = tools.get_goals;
  const goals = goalsRes?.goals || goalsRes || {};
  const q = question.toLowerCase();
  if (!avg || avg.error) {
    return "I couldn't find enough diary entries in the last week to give you a solid read. Log a few more days and I'll compare them against your goals.";
  }
  const a = avg.averages || {};
  const kcalGoal = goalNum(goals.calories);
  const protGoal = goalNum(goals.proteins);
  const lines = [];
  lines.push(`Here's your last ${avg.period_days} days (${avg.days_logged} logged, ${avg.consistency_pct}% consistency):`);
  lines.push('');
  lines.push(`- **Calories:** ${a.calories} kcal/day${kcalGoal ? ` vs. your ${kcalGoal} kcal goal (${a.calories > kcalGoal ? '+' : ''}${a.calories - kcalGoal})` : ''}`);
  lines.push(`- **Protein:** ${a.protein_g} g${protGoal ? ` vs. ${protGoal} g target` : ''}`);
  lines.push(`- **Carbs / Fat:** ${a.carbs_g} g / ${a.fat_g} g`);
  if (a.water_ml) lines.push(`- **Water:** ${(a.water_ml / 1000).toFixed(1)} L/day`);
  if (avg.weight_change) {
    const w = avg.weight_change;
    lines.push(`- **Weight:** ${w.direction} ${Math.abs(w.change_lbs)} lb since ${w.from_date}`);
  }
  lines.push('');
  if (q.includes('protein')) {
    lines.push(protGoal && a.protein_g < protGoal
      ? `You're about ${protGoal - a.protein_g} g short on protein most days. The easiest wins in your log are breakfast and the afternoon snack: swapping the granola for the Fage 0% + whey combo you already eat on weekdays adds ~25 g, and a cheese stick or the turkey roll-ups covers the rest.`
      : `Protein is in good shape. You're consistently at or above target, mostly thanks to the chicken and Greek yogurt that show up almost daily.`);
  } else if (kcalGoal && a.calories > kcalGoal * 1.08) {
    lines.push(`You're running a bit over goal on average. Looking at the days that pushed it up, it's mostly weekend dinners and the late-evening snacks. Keeping those to one serving would put you right on target without changing your weekday routine.`);
  } else if (kcalGoal && a.calories < kcalGoal * 0.9) {
    lines.push(`You're under your calorie goal by more than 10%. If the weight trend is dropping faster than ~1 lb/week, consider adding a snack on training days so recovery doesn't suffer.`);
  } else {
    lines.push(`Overall you're tracking close to plan. Weekdays are very consistent; weekends drift a little higher, which is normal. Keep the current routine and re-check in two weeks.`);
  }
  return lines.join('\n');
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/api/tags')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ object: 'list', data: [{ id: MODEL, object: 'model', owned_by: 'local' }] }));
  }
  if (req.method !== 'POST' || !req.url.startsWith('/v1/chat/completions')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { message: 'not found' } }));
  }
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    const data = parseJson(body) || {};
    const msgs = Array.isArray(data.messages) ? data.messages : [];
    let lastUser = -1;
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'user') { lastUser = i; break; }
    const question = textOf(msgs[lastUser]);
    const after = msgs.slice(lastUser + 1);
    const toolResults = new Map();
    const callNames = new Map();
    for (const m of after) {
      if (m.role === 'assistant' && Array.isArray(m.tool_calls)) {
        for (const tc of m.tool_calls) callNames.set(tc.id, tc.function?.name);
      }
      if (m.role === 'tool') toolResults.set(m.name || callNames.get(m.tool_call_id), parseJson(m.content));
    }
    const hasTools = Array.isArray(data.tools) && data.tools.length > 0;
    let out;
    if (hasTools && toolResults.size === 0 && question.trim()) {
      out = reply(null, [
        { id: 'call_' + Math.random().toString(36).slice(2, 10), type: 'function', function: { name: 'get_diary_averages', arguments: JSON.stringify({ days: 7 }) } },
        { id: 'call_' + Math.random().toString(36).slice(2, 10), type: 'function', function: { name: 'get_goals', arguments: '{}' } },
      ]);
    } else if (!hasTools) {
      out = reply('Sounds good! Tell me what you ate and roughly how much, and I\'ll estimate the nutrition for you.');
    } else {
      out = reply(compose(question, Object.fromEntries(toolResults) && toolResults.size ? Object.fromEntries(toolResults) : {}));
    }
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    }, 600);
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`[ai-stub] OpenAI-compatible stub on http://127.0.0.1:${PORT}`));
