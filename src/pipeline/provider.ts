// Model-provider abstraction for rater agents. Each provider owns its own tool
// loop; the rater (src/pipeline/rater.ts) supplies tools and executes them.

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
}

export interface ImagePart { mediaType: 'image/png' | 'image/jpeg'; data: string /* base64 */ }

export interface ToolResult {
  text: string;
  images?: ImagePart[];
  isError?: boolean;
  /** Set by submit_label on success: end the session after this call. */
  stop?: boolean;
}

export interface AgentEvent {
  type: 'request' | 'response' | 'tool_call' | 'tool_result' | 'nudge' | 'error';
  turn: number;
  data?: unknown;
}

export interface AgentRun {
  system: string;
  tools: ToolSpec[];
  first: { text: string; images?: ImagePart[] };
  execute: (name: string, input: unknown) => Promise<ToolResult>;
  maxTurns: number;
  /** Sent when the model stops without finishing (e.g. without submitting). */
  nudge: string;
  log: (e: AgentEvent) => void;
}

export interface AgentOutcome {
  finished: boolean; // a tool returned stop: true
  reason: 'stopped' | 'max_turns' | 'refusal' | 'gave_up' | 'max_tokens';
  turns: number;
  servedBy: string[];
  usage: Record<string, number>;
}

export interface RaterConfig {
  id: string;
  provider: 'claude-code' | 'openai-compatible' | 'dry-run';
  model: string;
  /** claude-code: low | medium | high | xhigh | max */
  effort?: string;
  /** claude-code: the Claude Code executable. Default: `claude` on PATH. */
  command?: string;
  /** openai-compatible: base URL and the env var holding the API key. */
  baseURL?: string;
  apiKeyEnv?: string;
  maxTurns?: number;
}

export interface Provider {
  run(cfg: RaterConfig, run: AgentRun): Promise<AgentOutcome>;
}

export async function providerFor(cfg: RaterConfig): Promise<Provider> {
  switch (cfg.provider) {
    case 'claude-code': return (await import('./providers/claude-code.ts')).claudeCodeProvider;
    case 'openai-compatible': return (await import('./providers/openai-compatible.ts')).openAICompatibleProvider;
    case 'dry-run': return (await import('./providers/dry-run.ts')).dryRunProvider;
    default: throw new Error(`unknown provider "${(cfg as RaterConfig).provider}"`);
  }
}

export function addUsage(into: Record<string, number>, u: Record<string, unknown> | undefined | null): void {
  if (!u) return;
  for (const [k, v] of Object.entries(u)) if (typeof v === 'number') into[k] = (into[k] ?? 0) + v;
}
