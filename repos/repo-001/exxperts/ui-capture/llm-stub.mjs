// Local stand-in for a company LiteLLM gateway (OpenAI-compatible). exxperts
// talks to it through its own "Add gateway" path, so no app code is changed.
// Endpoints: GET /v1/models, GET /v1/model/info, POST /v1/chat/completions
// (streaming SSE and plain JSON). Replies are canned but on-topic.
import http from "node:http";

const PORT = Number(process.env.STUB_PORT || 4416);

const MODELS = [
	{ id: "claude-sonnet-5-5", ctx: 400000, out: 64000, reasoning: true, vision: true, inCost: 3e-6, outCost: 15e-6 },
	{ id: "claude-haiku-5-5", ctx: 200000, out: 32000, reasoning: true, vision: true, inCost: 1e-6, outCost: 5e-6 },
	{ id: "gpt-6.1", ctx: 400000, out: 128000, reasoning: true, vision: true, inCost: 2.5e-6, outCost: 10e-6 },
	{ id: "mistral-large-3", ctx: 128000, out: 32000, reasoning: false, vision: false, inCost: 2e-6, outCost: 6e-6 },
];

function textOf(content) {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) return content.map((p) => (typeof p === "string" ? p : p?.text ?? "")).join("\n");
	return "";
}

const TOPICS = [
	{
		match: /steering|committee|status report|weekly/i,
		reply: `Here's a draft you can paste into the steering committee update:

**Status: Amber** (schedule), Green (budget), Green (scope)

**What moved this week**
- Data migration dry-run #3 completed: 98.7% of customer records loaded cleanly; the remaining 1.3% are address formats from the legacy Swiss branch system.
- SAP interface spec signed off by the integration team on Tuesday.

**Risks**
1. *Go-live on 9 March depends on the cut-over weekend being confirmed by IT Ops.* Mitigation: we've asked for a decision by Friday and prepared a fallback weekend (16 March).
2. Key-user availability in Finance drops in February (year-end close). We propose moving UAT for the invoicing module one week earlier.

**Decisions needed**
- Approve the fallback cut-over date.
- Confirm that the address clean-up can be done post go-live.

Want me to shorten it to three bullets for the email version?`,
	},
	{
		match: /email|mail|reply to|draft/i,
		reply: `Here's a draft:

---

Hi Marta,

Thanks for sending the revised scope so quickly. I've gone through it with the team and we're aligned on points 1–4. On point 5 (the reporting dashboard), we'd suggest moving it into a second phase: the data it needs only becomes available after the migration, and building it now would mean re-doing most of the work in April.

Could we take 20 minutes on Thursday to agree on that? I'm free 10:00–12:00 or after 15:30.

Best regards,
Jonas

---

I kept it short and put the one open question at the end so it's easy to answer. Should I make it more formal?`,
	},
	{
		match: /summar|tl;?dr|key points/i,
		reply: `**Summary in five points**

1. The pilot met its main goal: average handling time dropped from 11.4 to 8.9 minutes (−22%).
2. Adoption was uneven. Team Basel used the assistant in 81% of tickets, team Zurich in only 34%, mostly because of the missing German-language templates.
3. Two incidents involved wrong contract dates being quoted; both traced back to outdated source documents, not the model.
4. Cost came in at CHF 4,120 for the quarter, under the CHF 6,000 budget.
5. Recommendation: roll out to the remaining three teams in Q1, after the templates are translated and the document library is cleaned up.

The one thing I'd flag for the meeting is point 3: people will ask about it, so it's worth having the root-cause note ready.`,
	},
	{
		match: /sql|query|python|code|script|regex|excel|formula/i,
		reply: `Here's a version that should do it:

\`\`\`sql
SELECT c.customer_id,
       c.name,
       COUNT(o.order_id)          AS orders_last_90d,
       SUM(o.net_amount)          AS revenue_last_90d
FROM   customers c
JOIN   orders o ON o.customer_id = c.customer_id
WHERE  o.order_date >= CURRENT_DATE - INTERVAL '90 days'
  AND  o.status <> 'CANCELLED'
GROUP  BY c.customer_id, c.name
HAVING COUNT(o.order_id) >= 3
ORDER  BY revenue_last_90d DESC;
\`\`\`

A few notes:
- I excluded cancelled orders; if returns are stored as negative \`net_amount\` they're already netted out.
- The \`HAVING\` clause keeps only repeat customers (3+ orders). Drop it if you want everyone.
- On a large \`orders\` table, an index on \`(order_date, customer_id)\` will make a big difference.`,
	},
	{
		match: /workshop|agenda|meeting|plan/i,
		reply: `Here's a proposed agenda for the half-day workshop (09:00–13:00):

| Time | Block | Goal |
| --- | --- | --- |
| 09:00 | Welcome & goals | Agree what "done" looks like for today |
| 09:20 | Current-state walkthrough | Process owner shows today's flow end to end |
| 10:10 | Pain points (silent brainstorm, then clustering) | Top 5 issues, ranked |
| 10:50 | *Break* | |
| 11:05 | Target picture | Sketch the future flow for the top 3 issues |
| 12:15 | Quick wins vs. projects | Sort ideas by effort / impact |
| 12:45 | Next steps & owners | Every action has a name and a date |

Materials: a printed process map (A0), sticky notes in three colours, and the ticket statistics from Q3 so the discussion stays grounded in numbers.`,
	},
];

function replyFor(messages) {
	const sys = messages.filter((m) => m.role === "system").map((m) => textOf(m.content)).join("\n");
	// The app appends a runtime envelope (room tools, skills, attachments) as a
	// trailing user message and wraps earlier turns in a restored-context block;
	// the person's own words are the text after that block.
	const users = messages.filter((m) => m.role === "user").map((m) => textOf(m.content));
	const typed = [...users].reverse().find((t) => !/## (Enabled skills|Attachments in this room|Room tools)/.test(t)) ?? users[users.length - 1] ?? "";
	const marker = "[/RESTORED PERSISTENT ROOM LIVE THREAD CONTEXT]";
	const last = (typed.includes(marker) ? typed.slice(typed.lastIndexOf(marker) + marker.length) : typed).trim();
	if (/title|name this conversation|short label/i.test(sys) && last.length < 4000) {
		return last.split(/\s+/).slice(0, 5).join(" ").replace(/[^\p{L}\p{N} -]/gu, "") || "New conversation";
	}
	for (const t of TOPICS) if (t.match.test(last)) return t.reply;
	const gist = last.length > 140 ? `${last.slice(0, 140).trim()}…` : last;
	return `Good question. On "${gist}", here's how I'd approach it:

1. **Clarify the goal.** What decision does this need to support, and by when? That decides how deep we go.
2. **Check what we already know.** From the notes in this room, the constraints are the budget freeze until January and the fact that the Finance key users are only available on Tuesdays and Thursdays.
3. **Pick the smallest useful next step.** I'd suggest a one-page outline first. If that holds up with the team, we expand it.

If you share the document or the numbers you have, I can turn this into a concrete draft right away.`;
}

function sendJson(res, status, body) {
	res.writeHead(status, { "content-type": "application/json" });
	res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, `http://localhost:${PORT}`);
	const path = url.pathname.replace(/^\/v1/, "");
	if (req.method === "GET" && path === "/models") {
		return sendJson(res, 200, { object: "list", data: MODELS.map((m) => ({ id: m.id, object: "model", created: 1760000000, owned_by: "litellm" })) });
	}
	if (req.method === "GET" && path === "/model/info") {
		return sendJson(res, 200, {
			data: MODELS.map((m) => ({
				model_name: m.id,
				model_info: {
					mode: "chat",
					max_input_tokens: m.ctx,
					max_output_tokens: m.out,
					supports_vision: m.vision,
					supports_reasoning: m.reasoning,
					supports_web_search: false,
					supports_prompt_caching: m.id.startsWith("claude"),
					input_cost_per_token: m.inCost,
					output_cost_per_token: m.outCost,
				},
			})),
		});
	}
	if (req.method === "POST" && path === "/chat/completions") {
		let raw = "";
		for await (const chunk of req) raw += chunk;
		let body = {};
		try { body = JSON.parse(raw); } catch {}
		const messages = Array.isArray(body.messages) ? body.messages : [];
		if (process.env.STUB_DUMP) (await import("node:fs")).writeFileSync(process.env.STUB_DUMP, JSON.stringify(messages.map((m) => ({ role: m.role, text: textOf(m.content).slice(-600) })), null, 1));
		const text = replyFor(messages);
		const model = body.model || MODELS[0].id;
		const id = `chatcmpl-${Date.now().toString(36)}`;
		const promptTokens = Math.ceil(raw.length / 4);
		const completionTokens = Math.ceil(text.length / 4);
		const usage = { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens };
		if (!body.stream) {
			return sendJson(res, 200, { id, object: "chat.completion", created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }], usage });
		}
		res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
		const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
		const base = { id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model };
		send({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }] });
		const pieces = text.match(/[\s\S]{1,24}/g) || [""];
		for (const piece of pieces) {
			send({ ...base, choices: [{ index: 0, delta: { content: piece }, finish_reason: null }] });
			await new Promise((r) => setTimeout(r, 12));
		}
		send({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage });
		res.write("data: [DONE]\n\n");
		return res.end();
	}
	sendJson(res, 404, { error: { message: `Not found: ${req.method} ${url.pathname}` } });
});

server.listen(PORT, "127.0.0.1", () => console.log(`llm stub on http://127.0.0.1:${PORT}/v1`));
