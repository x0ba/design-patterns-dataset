// Stand-in for the llm-proxy worker (Nebius DeepSeek V4 Pro / Qwen3 fallback).
// Streams OpenAI-style SSE chunks, the same shape the worker relays.
const REPLIES = [
  "That is the right question to ask on an ordinary evening. When I wrote to myself at the Danube, I was not composing philosophy for anyone. I was reminding a tired man that the event and the judgment about the event are two different things. Try it tonight: name the thing that troubles you, then name the opinion you have added to it. Which of the two can you actually put down?",
  "You notice something I spent years learning. The mind wants the whole road at once. But you only ever walk the part under your feet. What is the one step in front of you that you have been avoiding because the road behind it looks so long?",
  "I would not tell you to feel less. I would ask you to look closer. Anger usually arrives with a story already attached, and the story arrives faster than the facts. Before you answer him tomorrow, write down what happened in plain words, as a clerk would. Then see how much of the heat is still there.",
];
function pick(body) {
  const msgs = Array.isArray(body?.messages) ? body.messages : [];
  return REPLIES[msgs.length % REPLIES.length];
}
function stream(res, text, headers) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-AI-Generated': 'true', 'X-Model-Used': 'deepseek-ai/DeepSeek-V4-Pro', ...headers });
  const words = text.split(/(?<= )/);
  let i = 0;
  const tick = () => {
    if (i >= words.length) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], model: 'deepseek-ai/DeepSeek-V4-Pro' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    const chunk = words.slice(i, i + 3).join(''); i += 3;
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }], model: 'deepseek-ai/DeepSeek-V4-Pro' })}\n\n`);
    setTimeout(tick, 35);
  };
  tick();
}
export function llmReply(req, res, body, quota) {
  stream(res, pick(body), { 'X-Quota-Daily-Used': String(quota.used), 'X-Quota-Daily-Limit': String(quota.limit), 'X-Quota-Resets-At': new Date(Date.now() + 6 * 3600_000).toISOString() });
}
export function councilReply(req, res, body) {
  stream(res, "**Moderator:** Tonight's question is whether a life can be both quiet and brave.\n\n**Marcus Aurelius:** Courage is mostly invisible. It is getting up at dawn and doing the work in front of you without applause.\n\n**Virginia Woolf:** And yet a quiet life needs a room, and money, and someone to leave you alone in it. Quiet is not free.\n\n**Mohandas Gandhi:** Quiet is where I found the strength to be loud when it mattered. Silence on Mondays kept me honest the rest of the week.", { 'X-Council-Daily-Used': '1', 'X-Council-Daily-Limit': '1' });
}
export function summaryReply(req, res, body) {
  stream(res, "**What you explored:** The gap between what happens and the story you tell about it.\n\n**What stayed with you:** The view from above, used before a hard conversation at work.\n\n**To carry forward:** Write down the bare event before reacting to it.", { 'X-Summary-Daily-Used': '2', 'X-Summary-Daily-Limit': '2' });
}
