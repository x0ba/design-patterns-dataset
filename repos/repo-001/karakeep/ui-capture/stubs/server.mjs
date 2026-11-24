// Local stand-ins for the external services Karakeep talks to:
//   * an OpenAI-compatible API (chat completions + embeddings) on OPENAI_STUB_PORT
//   * a Meilisearch-compatible API (full-text + vector index) on MEILI_STUB_PORT
//
// Neither needs network access. The Meilisearch stub answers queries straight
// from Karakeep's own SQLite database (read-only), so every bookmark is
// searchable without the workers having to index it first. Embeddings are
// deterministic hashed bag-of-words vectors, and the vector index computes the
// same vectors for bookmarks, so semantic search returns sensible matches.
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const DATA_DIR = process.env.DATA_DIR;
const OPENAI_PORT = Number(process.env.OPENAI_STUB_PORT ?? 4411);
const MEILI_PORT = Number(process.env.MEILI_STUB_PORT ?? 4412);
const DIMS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

// ---------------------------------------------------------------- text utils
const STOP = new Set(
  `a an and are as at be but by for from has have he her his i if in into is it its me my no not of on or our she so that the their them then there these they this to too us was we were what when where which who why will with you your can just about more also than how all any been do does did had one out up very would could should only over such some other most may like get got use using used new make made our via vs per each`.split(
    /\s+/,
  ),
);

function stem(w) {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function tokens(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'+#.-]*/gu) ?? [])
    .map((t) => t.replace(/[.'-]+$/, ""))
    .flatMap((t) => (t.includes("-") ? [t, ...t.split("-")] : [t]))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function stripHtml(html) {
  return (html ?? "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function embed(text) {
  const v = new Float64Array(DIMS);
  for (const t of tokens(text)) {
    const s = stem(t);
    const h = hash32(s);
    v[h % DIMS] += (h & 0x80000000 ? -1 : 1) * 1;
    // a second bucket keeps collisions from dominating
    const h2 = hash32(s + "#");
    v[h2 % DIMS] += (h2 & 1 ? -0.5 : 0.5);
  }
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Array.from(v, (x) => x / n);
}

function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// Hashed bag-of-words cosines sit far lower than real embedding models'
// (Karakeep keeps semantic hits scoring >= 0.6); map them onto a similar range.
function similarity(a, b) {
  const c = cosine(a, b);
  return c <= 0.05 ? 0 : Math.min(1, 0.55 + 0.45 * Math.sqrt(c));
}

// ----------------------------------------------------------- bookmark corpus
let db = null;
function getDb() {
  if (!db) {
    db = new Database(path.join(DATA_DIR, "db.db"), {
      readonly: true,
      fileMustExist: true,
    });
  }
  return db;
}

let corpusCache = { at: 0, docs: [] };
function corpus() {
  if (Date.now() - corpusCache.at < 3000) return corpusCache.docs;
  const rows = getDb()
    .prepare(
      `SELECT b.id, b.userId, b.lastSavedAt AS createdAt, b.title, b.note, b.summary,
              l.url, l.title AS linkTitle, l.description, l.author, l.publisher, l.htmlContent,
              t.text AS textContent, a.fileName, a.content AS assetContent,
              (SELECT group_concat(bt.name, ' ') FROM tagsOnBookmarks tob
                 JOIN bookmarkTags bt ON bt.id = tob.tagId WHERE tob.bookmarkId = b.id) AS tags
         FROM bookmarks b
         LEFT JOIN bookmarkLinks l ON l.id = b.id
         LEFT JOIN bookmarkTexts t ON t.id = b.id
         LEFT JOIN bookmarkAssets a ON a.id = b.id`,
    )
    .all();
  const docs = rows.map((r) => {
    const head = [r.title, r.linkTitle, r.tags, r.publisher, r.author]
      .filter(Boolean)
      .join(" ");
    const body = [
      r.description,
      r.note,
      r.summary,
      r.url,
      r.fileName,
      r.assetContent,
      r.textContent,
      stripHtml(r.htmlContent).slice(0, 20000),
    ]
      .filter(Boolean)
      .join(" ");
    const headToks = new Set(tokens(head).map(stem));
    const bodyToks = new Set(tokens(body).map(stem));
    return {
      id: r.id,
      userId: r.userId,
      createdAt: r.createdAt,
      headToks,
      bodyToks,
      vector: embed(`${head} ${head} ${body.slice(0, 8000)}`),
    };
  });
  corpusCache = { at: Date.now(), docs };
  return docs;
}

function applyFilters(docs, filters) {
  let out = docs;
  for (const f of [filters ?? []].flat()) {
    if (typeof f !== "string") continue;
    let m = f.match(/^\s*(\w+)\s*=\s*"([^"]*)"\s*$/);
    if (m) {
      const [, field, value] = m;
      out = out.filter((d) => String(d[field]) === value);
      continue;
    }
    m = f.match(/^\s*(\w+)\s+IN\s+\[(.*)\]\s*$/);
    if (m) {
      const field = m[1];
      const values = new Set(
        m[2]
          .split(",")
          .map((s) => s.trim().replace(/^"|"$/g, ""))
          .filter(Boolean),
      );
      out = out.filter((d) => values.has(String(d[field])));
    }
  }
  return out;
}

function sortDocs(docs, sort) {
  const s = (sort ?? [])[0];
  if (!s) return docs;
  const [field, order] = s.split(":");
  const dir = order === "asc" ? 1 : -1;
  return [...docs].sort((a, b) => ((a[field] ?? 0) - (b[field] ?? 0)) * dir);
}

function fullText(docs, q) {
  const terms = tokens(q ?? "").map(stem);
  if (terms.length === 0) return docs.map((d) => ({ d, score: 1 }));
  const res = [];
  for (const d of docs) {
    let score = 0;
    let ok = true;
    terms.forEach((t, i) => {
      const isLast = i === terms.length - 1;
      const match = (set) =>
        set.has(t) ||
        (isLast && t.length >= 2 && [...set].some((w) => w.startsWith(t)));
      if (match(d.headToks)) score += 3;
      else if (match(d.bodyToks)) score += 1;
      else ok = false;
    });
    if (ok) res.push({ d, score: score / (terms.length * 3) });
  }
  return res;
}

let taskUid = 1;
const tasks = new Map();
function enqueue(indexUid, type) {
  const uid = taskUid++;
  const now = new Date().toISOString();
  const task = {
    uid,
    taskUid: uid,
    batchUid: uid,
    indexUid,
    status: "succeeded",
    type,
    canceledBy: null,
    details: {},
    error: null,
    duration: "PT0.001S",
    enqueuedAt: now,
    startedAt: now,
    finishedAt: now,
  };
  tasks.set(uid, task);
  return { ...task, status: "enqueued" };
}

const indexes = new Map([
  ["bookmarks", { uid: "bookmarks", primaryKey: "id" }],
  ["bookmarks_vectors", { uid: "bookmarks_vectors", primaryKey: "id" }],
]);
const settingsFor = (uid) => ({
  displayedAttributes: ["*"],
  searchableAttributes: ["*"],
  filterableAttributes: ["id", "userId"],
  sortableAttributes: uid === "bookmarks" ? ["createdAt"] : [],
  rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
  stopWords: [],
  synonyms: {},
  distinctAttribute: null,
  embedders:
    uid === "bookmarks_vectors"
      ? { default: { source: "userProvided", dimensions: DIMS } }
      : {},
});

function meiliSearch(uid, body) {
  const start = Date.now();
  const limit = body.limit ?? 20;
  const offset = body.offset ?? 0;
  let docs = applyFilters(corpus(), body.filter);
  let scored;
  if (Array.isArray(body.vector)) {
    scored = docs
      .map((d) => ({ d, score: similarity(d.vector, body.vector) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (body.rankingScoreThreshold != null) {
      scored = scored.filter((x) => x.score >= body.rankingScoreThreshold);
    }
  } else {
    scored = fullText(docs, body.q);
    if (body.sort?.length) {
      const order = sortDocs(
        scored.map((x) => x.d),
        body.sort,
      );
      const byId = new Map(scored.map((x) => [x.d.id, x]));
      scored = order.map((d) => byId.get(d.id));
    } else {
      scored.sort((a, b) => b.score - a.score);
    }
  }
  const page = scored.slice(offset, offset + limit);
  return {
    hits: page.map(({ d, score }) => ({ id: d.id, _rankingScore: score })),
    query: body.q ?? "",
    processingTimeMs: Date.now() - start,
    limit,
    offset,
    estimatedTotalHits: scored.length,
  };
}

function meiliSimilar(body) {
  const all = corpus();
  const target = all.find((d) => d.id === body.id);
  if (!target) return { hits: [], id: body.id, processingTimeMs: 0, limit: body.limit ?? 10, offset: 0, estimatedTotalHits: 0 };
  const docs = applyFilters(all, body.filter).filter((d) => d.id !== body.id);
  const scored = docs
    .map((d) => ({ d, score: similarity(d.vector, target.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, body.limit ?? 10);
  return {
    hits: scored.map(({ d, score }) => ({ id: d.id, _rankingScore: score })),
    id: body.id,
    processingTimeMs: 1,
    limit: body.limit ?? 10,
    offset: 0,
    estimatedTotalHits: scored.length,
  };
}

function handleMeili(method, url, body) {
  const p = url.pathname.replace(/\/+$/, "");
  if (p === "/health") return [200, { status: "available" }];
  if (p === "/version")
    return [200, { commitSha: "local-stub", commitDate: "2026-10-01T00:00:00Z", pkgVersion: "1.55.0" }];
  if (p === "/indexes" && method === "GET") {
    const results = [...indexes.values()].map((i) => ({
      ...i,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    }));
    return [200, { results, offset: 0, limit: 20, total: results.length }];
  }
  if (p === "/indexes" && method === "POST") {
    indexes.set(body.uid, { uid: body.uid, primaryKey: body.primaryKey ?? "id" });
    return [202, enqueue(body.uid, "indexCreation")];
  }
  let m = p.match(/^\/tasks\/(\d+)$/);
  if (m) {
    const t = tasks.get(Number(m[1]));
    return t ? [200, t] : [404, { message: "Task not found", code: "task_not_found" }];
  }
  if (p === "/tasks") return [200, { results: [...tasks.values()].slice(-20), total: tasks.size }];
  m = p.match(/^\/indexes\/([^/]+)(\/.*)?$/);
  if (m) {
    const uid = decodeURIComponent(m[1]);
    const rest = m[2] ?? "";
    if (!rest) {
      if (method === "GET") {
        const i = indexes.get(uid);
        return i
          ? [200, { ...i, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }]
          : [404, { message: `Index \`${uid}\` not found.`, code: "index_not_found", type: "invalid_request" }];
      }
      return [202, enqueue(uid, method === "DELETE" ? "indexDeletion" : "indexUpdate")];
    }
    if (rest === "/search") return [200, meiliSearch(uid, method === "GET" ? { q: url.searchParams.get("q") } : body)];
    if (rest === "/similar") return [200, meiliSimilar(body)];
    if (rest === "/settings" && method === "GET") return [200, settingsFor(uid)];
    if (rest.startsWith("/settings/") && method === "GET") {
      const key = rest.slice(10).replace(/-(\w)/g, (_, c) => c.toUpperCase());
      return [200, settingsFor(uid)[key] ?? null];
    }
    if (rest === "/stats") {
      const n = corpus().length;
      return [200, { numberOfDocuments: n, isIndexing: false, fieldDistribution: {} }];
    }
    if (rest.startsWith("/documents")) {
      // Documents are served from the Karakeep database itself; writes are acknowledged.
      return [202, enqueue(uid, method === "DELETE" || rest.includes("delete") ? "documentDeletion" : "documentAdditionOrUpdate")];
    }
    return [202, enqueue(uid, "settingsUpdate")];
  }
  return [404, { message: "Not found", code: "not_found" }];
}

// ---------------------------------------------------------- OpenAI behaviour
const TAG_RULES = [
  [/\b(rust|cargo|borrow checker)\b/i, "rust"],
  [/\b(typescript|javascript|node\.?js|deno|bun)\b/i, "javascript"],
  [/\b(react|next\.js|svelte|vue)\b/i, "frontend"],
  [/\b(css|tailwind|flexbox|grid layout)\b/i, "css"],
  [/\b(postgres|postgresql|sqlite|database|sql)\b/i, "databases"],
  [/\b(kubernetes|docker|container|self-host|homelab)\b/i, "self-hosting"],
  [/\b(llm|gpt|language model|machine learning|neural|ai)\b/i, "ai"],
  [/\b(recipe|bake|dough|oven|sourdough|braise|cook)\b/i, "cooking"],
  [/\b(hike|trail|camp|backpack|travel|itinerary|flight)\b/i, "travel"],
  [/\b(design|typography|figma|ux|ui)\b/i, "design"],
  [/\b(productivity|habit|focus|note-taking|zettelkasten)\b/i, "productivity"],
  [/\b(security|vulnerability|encryption|password|auth)\b/i, "security"],
  [/\b(finance|invest|budget|tax|mortgage|index fund)\b/i, "personal-finance"],
  [/\b(climate|energy|solar|battery|carbon)\b/i, "climate"],
  [/\b(space|nasa|rocket|telescope|orbit)\b/i, "space"],
  [/\b(running|marathon|strength|workout|fitness)\b/i, "fitness"],
  [/\b(book|novel|reading list|author)\b/i, "books"],
  [/\b(career|interview|management|engineering manager|hiring)\b/i, "career"],
];

function section(prompt, name) {
  const m = prompt.match(new RegExp(`${name}:\\s*([\\s\\S]*?)(?:\\n(?:Title|Description|Content|Publisher|Author|URL):|$)`));
  return m ? m[1].trim() : "";
}

function sentences(text) {
  return (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 400);
}

function summarize(prompt) {
  const body = prompt.split(/You MUST follow the following rules:[\s\S]*?\n(?=\s*\n|\s+Title:|\s+Content:)/)[1] ?? prompt;
  const title = section(body, "Title");
  const description = section(body, "Description");
  const publisher = section(body, "Publisher");
  const content = section(body, "Content") || body;
  const sents = sentences(content);
  const freq = new Map();
  for (const t of tokens(content).map(stem)) freq.set(t, (freq.get(t) ?? 0) + 1);
  const ranked = sents
    .map((s, i) => {
      const toks = tokens(s).map(stem);
      const score = toks.reduce((a, t) => a + Math.log(1 + (freq.get(t) ?? 0)), 0) / Math.sqrt(toks.length || 1);
      return { s, i, score: score - i * 0.02 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s);
  const out = [];
  const lead = description.replace(/\s+/g, " ").trim();
  if (lead.length > 30) out.push(/[.!?]$/.test(lead) ? lead : `${lead}.`);
  else if (title) out.push(`${publisher ? `${publisher}'s` : "This"} piece "${title}" is summarized below.`);
  for (const s of ranked) if (out.length < 4 && !out.some((o) => o.includes(s) || s.includes(o))) out.push(s);
  if (out.length === 0) out.push("The content is short and does not contain enough detail to summarize beyond its title.");
  return out.join(" ");
}

function tagsFor(prompt) {
  const m = prompt.match(/<TEXT_CONTENT>([\s\S]*?)<\/TEXT_CONTENT>/);
  const content = m ? m[1] : prompt;
  const tags = [];
  for (const [re, tag] of TAG_RULES) if (re.test(content) && !tags.includes(tag)) tags.push(tag);
  if (tags.length < 3) {
    const freq = new Map();
    for (const t of tokens(content)) if (t.length > 4 && !/\d/.test(t)) freq.set(t, (freq.get(t) ?? 0) + 1);
    for (const [t] of [...freq].sort((a, b) => b[1] - a[1])) {
      if (tags.length >= 4) break;
      if (!tags.includes(t)) tags.push(t);
    }
  }
  return tags.slice(0, 5);
}

function chatCompletion(body) {
  const msgs = body.messages ?? [];
  const last = msgs[msgs.length - 1];
  const prompt = typeof last?.content === "string"
    ? last.content
    : (last?.content ?? []).map((c) => c.text ?? "").join("\n");
  const wantsJson = !!body.response_format || /respond in JSON/i.test(prompt);
  let content;
  if (/automatic tagging|"tags"/i.test(prompt)) {
    content = JSON.stringify({ tags: tagsFor(prompt) });
  } else if (/^\s*Summarize the following content/i.test(prompt)) {
    content = summarize(prompt);
  } else if (wantsJson) {
    content = JSON.stringify({ tags: tagsFor(prompt) });
  } else {
    content = summarize(prompt);
  }
  const promptTokens = Math.ceil(prompt.length / 4);
  const completionTokens = Math.ceil(content.length / 4);
  return {
    id: `chatcmpl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: body.model ?? "gpt-4.1-mini",
    choices: [{ index: 0, message: { role: "assistant", content, refusal: null }, logprobs: null, finish_reason: "stop" }],
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
    system_fingerprint: "fp_local_stub",
  };
}

function handleOpenAI(method, url, body) {
  const p = url.pathname.replace(/\/+$/, "").replace(/^\/v1/, "");
  if (p === "/models")
    return [200, { object: "list", data: ["gpt-4.1-mini", "gpt-4o-mini", "text-embedding-3-small"].map((id) => ({ id, object: "model", created: 1735689600, owned_by: "openai" })) }];
  if (p === "/chat/completions" && method === "POST") return [200, chatCompletion(body)];
  if (p === "/embeddings" && method === "POST") {
    const inputs = [body.input].flat();
    const dims = body.dimensions ?? DIMS;
    return [200, {
      object: "list",
      data: inputs.map((t, index) => ({ object: "embedding", index, embedding: embed(String(t)).slice(0, dims) })),
      model: body.model ?? "text-embedding-3-small",
      usage: { prompt_tokens: inputs.join(" ").length / 4 | 0, total_tokens: inputs.join(" ").length / 4 | 0 },
    }];
  }
  return [404, { error: { message: `Unknown request URL: ${method} ${url.pathname}`, type: "invalid_request_error" } }];
}

function serve(port, name, handler) {
  http
    .createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        let status = 500;
        let payload;
        try {
          const body = raw ? JSON.parse(raw) : {};
          [status, payload] = handler(req.method, new URL(req.url, "http://x"), body);
        } catch (e) {
          payload = { message: String(e), code: "internal" };
        }
        if (process.env.STUB_DEBUG) console.log(`[${name}] ${req.method} ${req.url} -> ${status}`);
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(payload));
      });
    })
    .listen(port, "127.0.0.1", () => console.log(`[stub] ${name} listening on 127.0.0.1:${port}`));
}

serve(OPENAI_PORT, "openai", handleOpenAI);
serve(MEILI_PORT, "meilisearch", handleMeili);
