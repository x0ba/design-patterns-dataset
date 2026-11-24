// Local stand-ins for outside services EdgeEver may call. Listens on STUB_PORT (default 4499).
//  - /registry/*            community plugin registry (empty catalog)
//  - /v1/models             OpenAI-compatible model list
//  - /v1/chat/completions   OpenAI-compatible chat (SSE streaming or JSON). Replies are
//                           derived from the note text in the prompt so they read like a
//                           real assistant answer (summaries, key points, todos, tags, chat).
const port = Number(process.env.STUB_PORT ?? 4499);
const MODEL = "gpt-4.1-mini";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-max-age": "86400",
};

const textOf = (content) => (typeof content === "string" ? content : Array.isArray(content) ? content.map((p) => p?.text ?? "").join("\n") : "");

const noteLines = (text) =>
  text.split("\n").map((l) => l.trim()).filter((l) => l && !/^(```|\|[-\s|]+\||<\/?edgeever)/.test(l));

const clean = (l) => l.replace(/^#+\s*|^[-*]\s*(\[[ x]\]\s*)?|^\d+\.\s*|\*\*|__|`/g, "").replace(/~~.*?~~/g, "").trim();

const titleFrom = (text) => {
  const m = text.match(/(?:^|\n)(?:Title|标题)[:：]\s*(.+)/i) || text.match(/(?:^|\n)#\s+(.+)/);
  return m ? m[1].trim() : null;
};

const keyPoints = (text, n = 5) => {
  const lines = noteLines(text).map(clean).filter((l) => l.length > 18 && l.length < 220 && !/^(title|tags|current tags|existing tags|note|content)[:：]/i.test(l));
  const seen = new Set();
  return lines.filter((l) => (seen.has(l) ? false : seen.add(l))).slice(0, n);
};

const reply = (system, user) => {
  const s = system.toLowerCase();
  const all = `${system}\n${user}`;
  const title = titleFrom(user);
  const points = keyPoints(user);
  if (/edgeever-tags|suggest concise tags/.test(s) || /edgeever-tags/.test(user)) {
    const t = /interview|research/i.test(user) ? ["research", "customer-feedback"] : /recipe|tbsp|cup/i.test(user) ? ["recipe", "weeknight"] : /meeting|attendees|agenda/i.test(user) ? ["meeting", "action-items"] : /\$|budget|invoice/i.test(user) ? ["finance"] : ["notes", "reference"];
    return `<edgeever-tags>\n${t.join("\n")}\n</edgeever-tags>`;
  }
  if (/todo|action item|task/.test(s) && /extract/.test(s)) {
    const todos = noteLines(user).filter((l) => /^- \[ \]/.test(l)).map(clean);
    const list = (todos.length ? todos : points.slice(0, 4).map((p) => `Follow up: ${p}`)).slice(0, 8);
    return `Here are the open action items I found:\n\n${list.map((t) => `- [ ] ${t}`).join("\n")}`;
  }
  if (/key point/.test(s)) {
    return `**Key points${title ? ` — ${title}` : ""}**\n\n${(points.length ? points : ["The note is short; its main idea is captured in the title."]).map((p) => `- ${p}`).join("\n")}`;
  }
  if (/summar/.test(s)) {
    const body = points.slice(0, 3).join(" ");
    return `${title ? `**${title}** — ` : ""}${body ? `This note covers ${points.length} main threads. ${body.slice(0, 420)}${body.length > 420 ? "…" : ""}` : "This is a short note without much detail yet."}\n\n**Bottom line:** ${points[0] ?? "Nothing actionable yet."}`;
  }
  if (/translat/.test(s)) {
    return `*(Spanish)*\n\n${points.slice(0, 4).map((p) => `- ${p}`).join("\n")}\n\n> Nota: los términos técnicos se mantuvieron en inglés.`;
  }
  if (/shorter|concise/.test(s)) return points.slice(0, 2).join(" ") || user.slice(0, 200);
  if (/continue/.test(s)) return "Looking ahead, the next step is to validate these assumptions with a second round of sessions before the beta goes out, and to write down what would make us change course. I'll share a short readout with the team by Friday so we can decide together.";
  if (/proofread|spelling|grammar|improve|rewrite|tone|simplif|longer/.test(s)) {
    const src = user.split(/\n{2,}/).slice(-1)[0] ?? user;
    return src.replace(/\bi\b/g, "I").replace(/\s{2,}/g, " ").replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).trim();
  }
  if (/mermaid|diagram|flowchart|mind ?map/.test(all.toLowerCase())) {
    return "```mermaid\nflowchart TD\n  A[Capture idea] --> B[Clarify in Inbox]\n  B --> C{Actionable?}\n  C -- Yes --> D[Project notebook]\n  C -- No --> E[Reference / Learning]\n  D --> F[Weekly review]\n```";
  }
  // General chat / companion.
  const q = user.split("\n").filter(Boolean).slice(-1)[0] ?? "";
  return `Good question. Based on your notes, here's what stands out:\n\n${(points.length ? points.slice(0, 4) : ["Dashboard v3 beta is scheduled for Dec 2, with usability round 2 on Nov 20.", "Open QA items include the Billing entry still showing for the Viewer role (HAR-2291).", "Thanksgiving prep: order the turkey from Chop by Nov 20."]).map((p) => `- ${p}`).join("\n")}\n\n${q.length > 4 ? `If you want, I can turn this into a checklist or draft a follow-up note about “${q.slice(0, 80)}”.` : "Want me to turn this into a checklist?"}`;
};

const sse = (text, model) => {
  const enc = new TextEncoder();
  const id = "chatcmpl-" + Math.random().toString(36).slice(2, 12);
  const created = Math.floor(Date.now() / 1000);
  const chunks = text.match(/[\s\S]{1,24}/g) ?? [""];
  return new ReadableStream({
    async start(ctrl) {
      const send = (obj) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }] });
      for (const c of chunks) {
        send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { content: c }, finish_reason: null }] });
        await Bun.sleep(15);
      }
      send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 812, completion_tokens: Math.ceil(text.length / 4), total_tokens: 812 + Math.ceil(text.length / 4) } });
      ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
};

Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname.startsWith("/registry")) return Response.json({ schemaVersion: 1, plugins: [] }, { headers: cors });
    if (url.pathname.endsWith("/models") && req.method === "GET") {
      return Response.json({ object: "list", data: [MODEL, "gpt-4.1", "o4-mini"].map((id) => ({ id, object: "model", created: 1744675200, owned_by: "openai" })) }, { headers: cors });
    }
    if (url.pathname.endsWith("/chat/completions") && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const msgs = body.messages ?? [];
      const system = msgs.filter((m) => m.role === "system").map((m) => textOf(m.content)).join("\n");
      const user = msgs.filter((m) => m.role === "user").map((m) => textOf(m.content)).join("\n\n");
      const text = reply(system, user);
      const model = body.model ?? MODEL;
      if (body.stream) return new Response(sse(text, model), { headers: { ...cors, "content-type": "text/event-stream", "cache-control": "no-cache" } });
      return Response.json({
        id: "chatcmpl-" + Date.now(), object: "chat.completion", created: Math.floor(Date.now() / 1000), model,
        choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
        usage: { prompt_tokens: 812, completion_tokens: Math.ceil(text.length / 4), total_tokens: 812 + Math.ceil(text.length / 4) },
      }, { headers: cors });
    }
    return new Response("not found", { status: 404, headers: cors });
  },
});
console.log(`[stub] listening on http://127.0.0.1:${port}`);
