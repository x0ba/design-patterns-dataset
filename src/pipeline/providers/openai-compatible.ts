// Non-Claude rater for cross-lab IRR (README "Questions": GPT, Grok, …), via any
// OpenAI-compatible Chat Completions endpoint with function calling and image
// input (OpenAI: https://api.openai.com/v1, xAI: https://api.x.ai/v1).
//
// UNTESTED against live endpoints in this repo — verify on one site before a batch.
// Chat Completions cannot put images inside tool results, so images returned by
// a tool are sent in a follow-up user message right after the tool messages.

import { addUsage, type AgentOutcome, type AgentRun, type Provider, type RaterConfig } from '../provider.ts';

type Msg = Record<string, unknown>;

export const openAICompatibleProvider: Provider = {
  async run(cfg: RaterConfig, run: AgentRun): Promise<AgentOutcome> {
    const baseURL = (cfg.baseURL ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
    const key = process.env[cfg.apiKeyEnv ?? 'OPENAI_API_KEY'];
    if (!key) throw new Error(`rater ${cfg.id}: env ${cfg.apiKeyEnv ?? 'OPENAI_API_KEY'} is not set`);
    const tools = run.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
    const img = (i: { mediaType: string; data: string }) => ({ type: 'image_url', image_url: { url: `data:${i.mediaType};base64,${i.data}` } });
    const messages: Msg[] = [
      { role: 'system', content: run.system },
      { role: 'user', content: [{ type: 'text', text: run.first.text }, ...(run.first.images ?? []).map(img)] },
    ];
    const usage: Record<string, number> = {};
    const servedBy = new Set<string>();
    let nudges = 0;

    for (let turn = 1; turn <= run.maxTurns; turn++) {
      run.log({ type: 'request', turn });
      const res = await fetchWithRetry(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: cfg.model, messages, tools, tool_choice: 'auto', ...(cfg.effort ? { reasoning_effort: cfg.effort } : {}) }),
      });
      const body = await res.json() as any;
      const choice = body.choices?.[0];
      if (!choice) throw new Error(`rater ${cfg.id}: unexpected response ${JSON.stringify(body).slice(0, 500)}`);
      servedBy.add(body.model ?? cfg.model);
      addUsage(usage, body.usage);
      const m = choice.message;
      run.log({ type: 'response', turn, data: { finish_reason: choice.finish_reason, text: m.content?.slice?.(0, 2000) } });
      messages.push({ role: 'assistant', content: m.content ?? null, ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}) });
      if (choice.finish_reason === 'length') return { finished: false, reason: 'max_tokens', turns: turn, servedBy: [...servedBy], usage };
      const calls: any[] = m.tool_calls ?? [];
      if (!calls.length) {
        if (nudges++ >= 2) return { finished: false, reason: 'gave_up', turns: turn, servedBy: [...servedBy], usage };
        messages.push({ role: 'user', content: run.nudge });
        continue;
      }
      const pendingImages: { mediaType: string; data: string }[] = [];
      let stop = false;
      for (const c of calls) {
        let input: unknown;
        try {
          input = JSON.parse(c.function.arguments || '{}');
        } catch {
          messages.push({ role: 'tool', tool_call_id: c.id, content: 'Error: arguments were not valid JSON.' });
          continue;
        }
        run.log({ type: 'tool_call', turn, data: { name: c.function.name, input } });
        const r = await run.execute(c.function.name, input).catch((e) => ({ text: `Tool error: ${e.message}`, isError: true, images: undefined, stop: false }));
        run.log({ type: 'tool_result', turn, data: { name: c.function.name, isError: !!r.isError, text: r.text.slice(0, 4000) } });
        stop ||= !!r.stop;
        messages.push({ role: 'tool', tool_call_id: c.id, content: (r.isError ? 'Error: ' : '') + r.text + (r.images?.length ? `\n[${r.images.length} image(s) attached in the next message]` : '') });
        pendingImages.push(...(r.images ?? []));
      }
      if (stop) return { finished: true, reason: 'stopped', turns: turn, servedBy: [...servedBy], usage };
      if (pendingImages.length) messages.push({ role: 'user', content: [{ type: 'text', text: 'Images returned by the tool calls above:' }, ...pendingImages.map(img)] });
    }
    return { finished: false, reason: 'max_turns', turns: run.maxTurns, servedBy: [...servedBy], usage };
  },
};

async function fetchWithRetry(url: string, init: RequestInit, tries = 6): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    if (i < tries - 1 && (res.status === 429 || res.status >= 500)) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || Math.min(60_000, 1000 * 2 ** i);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new Error(`${url}: HTTP ${res.status} ${(await res.text()).slice(0, 500)}`);
  }
}
