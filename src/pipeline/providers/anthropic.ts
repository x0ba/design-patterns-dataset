// Claude rater: a streaming manual tool loop over the Messages API.
//
// - Adaptive thinking (always on for Claude Opus 5.5); depth via output_config.effort.
// - Prompt caching: the system prompt + tool list are stable (cached), and
//   top-level cache_control caches the growing conversation each turn.
// - Optional server-side refusal fallback; the serving model of every turn is
//   recorded so a label never silently mixes raters.
// - Tool inputs stream eagerly (submit_label is large); every input is
//   re-validated by the tool itself before use.

import Anthropic from '@anthropic-ai/sdk';
import { addUsage, type AgentOutcome, type AgentRun, type Provider, type RaterConfig, type ToolResult } from '../provider.ts';

type Beta = Anthropic.Beta.Messages.BetaMessageParam;
type Effort = NonNullable<Anthropic.Beta.Messages.BetaOutputConfig['effort']>;

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic({ maxRetries: 6, timeout: 15 * 60_000 }));

export const anthropicProvider: Provider = {
  async run(cfg: RaterConfig, run: AgentRun): Promise<AgentOutcome> {
    const anthropic = getClient();
    const tools: Anthropic.Beta.Messages.BetaTool[] = run.tools.map((t) => ({ ...t, eager_input_streaming: true }));
    const messages: Beta[] = [{ role: 'user', content: userContent(run.first.text, run.first.images) }];
    const usage: Record<string, number> = {};
    const servedBy = new Set<string>();
    let nudges = 0;
    let jsonRetries = 0;

    for (let turn = 1; turn <= run.maxTurns; turn++) {
      run.log({ type: 'request', turn });
      const stream = anthropic.beta.messages.stream({
        model: cfg.model,
        max_tokens: 64000,
        system: [{ type: 'text', text: run.system, cache_control: { type: 'ephemeral' } }],
        tools,
        messages,
        cache_control: { type: 'ephemeral' },
        thinking: { type: 'adaptive' },
        ...(cfg.effort ? { output_config: { effort: cfg.effort as Effort } } : {}),
        ...(cfg.fallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      });

      let msg: Anthropic.Beta.Messages.BetaMessage;
      try {
        msg = await stream.finalMessage();
        jsonRetries = 0;
      } catch (err) {
        // Only an unparseable streamed tool input is retried here; API errors
        // (already retried by the SDK) propagate.
        if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err;
        run.log({ type: 'error', turn, data: `tool input not parseable, re-issuing turn: ${(err as Error).message}` });
        turn--;
        continue;
      }
      servedBy.add(msg.model);
      addUsage(usage, msg.usage as unknown as Record<string, unknown>);
      run.log({ type: 'response', turn, data: { stop_reason: msg.stop_reason, model: msg.model, text: textOf(msg), usage: msg.usage } });

      if (msg.stop_reason === 'refusal') {
        return { finished: false, reason: 'refusal', turns: turn, servedBy: [...servedBy], usage };
      }
      if (msg.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: msg.content });
        continue;
      }
      const calls = msg.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === 'tool_use');
      if (msg.stop_reason === 'max_tokens' && calls.length) {
        // A truncated tool input can parse as a valid partial object: never run it.
        messages.push({ role: 'assistant', content: msg.content });
        messages.push({
          role: 'user',
          content: calls.map((c) => ({ type: 'tool_result' as const, tool_use_id: c.id, is_error: true, content: 'Your output hit max_tokens and this call was truncated; it was not run. Retry with a more compact input.' })),
        });
        continue;
      }
      messages.push({ role: 'assistant', content: msg.content });

      if (!calls.length) {
        if (nudges++ >= 2) return { finished: false, reason: 'gave_up', turns: turn, servedBy: [...servedBy], usage };
        run.log({ type: 'nudge', turn });
        messages.push({ role: 'user', content: run.nudge });
        continue;
      }

      // Run every call, return all results in one user message.
      const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
      let stop = false;
      for (const call of calls) {
        run.log({ type: 'tool_call', turn, data: { name: call.name, input: call.input } });
        let r: ToolResult;
        try {
          r = await run.execute(call.name, call.input);
        } catch (e) {
          r = { text: `Tool error: ${(e as Error).message}`, isError: true };
        }
        run.log({ type: 'tool_result', turn, data: { name: call.name, isError: !!r.isError, text: r.text.slice(0, 4000), images: r.images?.length ?? 0 } });
        stop ||= !!r.stop;
        results.push({
          type: 'tool_result',
          tool_use_id: call.id,
          ...(r.isError ? { is_error: true } : {}),
          content: [
            { type: 'text', text: r.text },
            ...(r.images ?? []).map((img) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: img.mediaType, data: img.data } })),
          ],
        });
      }
      if (stop) return { finished: true, reason: 'stopped', turns: turn, servedBy: [...servedBy], usage };
      messages.push({ role: 'user', content: results });
    }
    return { finished: false, reason: 'max_turns', turns: run.maxTurns, servedBy: [...servedBy], usage };
  },
};

function userContent(text: string, images?: { mediaType: 'image/png' | 'image/jpeg'; data: string }[]): Anthropic.Beta.Messages.BetaContentBlockParam[] {
  return [
    ...(images ?? []).map((img) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: img.mediaType, data: img.data } })),
    { type: 'text' as const, text },
  ];
}

function textOf(msg: Anthropic.Beta.Messages.BetaMessage): string {
  return msg.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.Beta.Messages.BetaTextBlock).text).join('\n').slice(0, 2000);
}
