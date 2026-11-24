// Offline stand-in for the `node-llama-cpp` package (the local LLM runtime).
// Implements only the runtime surface catai's NodeLlamaCppV2 bind uses:
//   getLlama() -> llama.loadModel() -> model.createContext() -> context.getSequence()
//   new LlamaChatSession({contextSequence}) -> prompt / completePrompt / setChatHistory / dispose
// Responses stream like a Qwen3 "thinking" model: a thought segment first, then the answer.

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const REPLIES = [
    {
        match: /\b(hi|hello|hey|yo)\b/i,
        thought: 'The user is greeting me. Keep it short and friendly, and offer help.',
        answer: 'Hey! 👋 I\'m running locally on your machine, so nothing you type here leaves your computer.\n\nWhat would you like to work on — code, writing, or something else?'
    },
    {
        match: /debounce|throttle/i,
        thought: 'They want a debounce helper. Give a typed TypeScript version, explain the timer reset, mention cancel.',
        answer: 'Here\'s a small, typed `debounce` helper:\n\n```ts\nexport function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {\n  let timer: ReturnType<typeof setTimeout> | undefined;\n\n  const debounced = (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), wait);\n  };\n\n  debounced.cancel = () => clearTimeout(timer);\n  return debounced;\n}\n```\n\nEvery call resets the timer, so `fn` only runs once the calls stop for `wait` ms. Call `.cancel()` in your cleanup (e.g. a React `useEffect` return) to avoid firing after unmount.'
    },
    {
        match: /sql|postgres|query|index/i,
        thought: 'Database question. Suggest checking the query plan first, then a composite index matching the filter + sort.',
        answer: 'Start by looking at the plan:\n\n```sql\nEXPLAIN ANALYZE\nSELECT id, total, created_at\nFROM orders\nWHERE customer_id = 4821\nORDER BY created_at DESC\nLIMIT 20;\n```\n\nIf you see a `Seq Scan` on `orders`, add a composite index that matches both the filter and the sort:\n\n```sql\nCREATE INDEX CONCURRENTLY idx_orders_customer_created\n  ON orders (customer_id, created_at DESC);\n```\n\nWith that in place Postgres can walk the index in order and stop after 20 rows instead of sorting the whole customer history.'
    },
    {
        match: /email|letter|write|draft/i,
        thought: 'Writing task. Keep it professional, concise, with a clear ask.',
        answer: 'Here\'s a draft you can adapt:\n\n---\n\n**Subject:** Quick update on the Q3 rollout\n\nHi Dana,\n\nThe migration finished on Tuesday and all 14 regional sites are now on the new build. We saw two minor issues (both fixed same day) and no customer-facing downtime.\n\nCould we grab 20 minutes Thursday to agree on the timeline for phase two?\n\nThanks,\nMaya\n\n---\n\nWant me to make it more formal or shorter?'
    },
    {
        match: /python|pandas|dataframe/i,
        thought: 'Pandas question. Show groupby + agg, keep it readable.',
        answer: 'You can do it in one `groupby`:\n\n```python\nimport pandas as pd\n\ndf = pd.read_csv("sales.csv", parse_dates=["date"])\nmonthly = (\n    df.groupby([df["date"].dt.to_period("M"), "region"])\n      .agg(revenue=("amount", "sum"), orders=("order_id", "nunique"))\n      .reset_index()\n)\nprint(monthly.head())\n```\n\n`to_period("M")` buckets the dates by month, and the named aggregations give you clean column names without a rename step.'
    },
    {
        match: /explain|what is|how does|why/i,
        thought: 'Conceptual question. Give a plain-language explanation, then one concrete example.',
        answer: 'Short version: it comes down to **trade-offs between speed and memory**.\n\n1. **What it does** – it keeps a smaller representation of the data so lookups don\'t touch the full set.\n2. **Why it helps** – fewer bytes to read means fewer cache misses, which is usually the real bottleneck.\n3. **The catch** – you pay for it on writes, since the representation has to be kept in sync.\n\nIf you tell me the specific setup you\'re working with, I can walk through a concrete example.'
    },
];

const FALLBACK = {
    thought: 'Let me work out what the user is asking and give a direct, practical answer.',
    answer: (prompt) => `Good question. Here's how I'd approach **"${prompt.trim().slice(0, 80)}"**:\n\n- **Clarify the goal** – what does "done" look like?\n- **Start small** – get one minimal version working end to end.\n- **Iterate** – measure, then improve the part that actually hurts.\n\nIf you share a bit more detail (code, error message, or constraints), I can give you something more specific.`
};

function pickReply(prompt) {
    const r = REPLIES.find(x => x.match.test(prompt));
    if (r) return {thought: r.thought, answer: r.answer};
    return {thought: FALLBACK.thought, answer: FALLBACK.answer(prompt)};
}

function tokenize(text) {
    return text.match(/\s*\S+|\s+/g) ?? [];
}

class LlamaContextSequence {
    dispose() {}
}

class LlamaContext {
    getSequence() {
        return new LlamaContextSequence();
    }
    dispose() {}
}

class LlamaModel {
    constructor(options) {
        this.options = options;
    }
    async createContext() {
        return new LlamaContext();
    }
    dispose() {}
}

class Llama {
    async loadModel(options) {
        await sleep(300);
        return new LlamaModel(options);
    }
}

export async function getLlama() {
    return new Llama();
}

export class LlamaChatSession {
    constructor(options = {}) {
        this.options = options;
        this._history = [];
        if (options.systemPrompt) this._history.push({type: 'system', text: options.systemPrompt});
    }

    getChatHistory() {
        return this._history;
    }

    setChatHistory(history) {
        this._history = Array.isArray(history) ? history : [];
    }

    async prompt(prompt, {onResponseChunk, onTextChunk, signal} = {}) {
        const {thought, answer} = pickReply(prompt);
        this._history.push({type: 'user', text: prompt});

        const emit = async (text, segmentType) => {
            for (const tok of tokenize(text)) {
                if (signal?.aborted) throw new Error('Aborted');
                await sleep(18);
                if (segmentType) onResponseChunk?.({type: 'segment', segmentType, text: tok, tokens: []});
                else {
                    onResponseChunk?.({type: undefined, text: tok, tokens: []});
                    onTextChunk?.(tok);
                }
            }
        };

        await emit(thought, 'thought');
        await emit(answer, null);

        this._history.push({
            type: 'model',
            response: [{type: 'segment', segmentType: 'thought', text: thought, ended: true}, answer]
        });
        return answer;
    }

    async completePrompt(text, {onTextChunk} = {}) {
        const words = ['and', 'then', 'explain', 'it', 'step', 'by', 'step'];
        const n = 3;
        let out = '';
        for (const w of words.slice(0, n)) {
            await sleep(20);
            const t = ' ' + w;
            out += t;
            onTextChunk?.(t);
        }
        return out;
    }

    dispose() {}
}

export default {getLlama, LlamaChatSession};
