// Seeds an EdgeEver instance through its public HTTP API with ~9 months of
// realistic notes for one user. Usage: BASE=http://127.0.0.1:5402 bun seed.mjs
const BASE = process.env.BASE ?? "http://127.0.0.1:5402";
const USER = process.env.SEED_USER ?? "maya";
const PASS = process.env.SEED_PASS ?? "Fieldnotes-2026";

let cookie = "";
const api = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
};

// Deterministic PRNG so re-seeding yields identical data.
let seed = 20260216;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickN = (arr, n) => [...arr].sort(() => rnd() - 0.5).slice(0, n);

const NOW = new Date("2026-11-16T22:30:00Z");
const daysAgo = (d, hour = 9 + Math.floor(rnd() * 10), min = Math.floor(rnd() * 60)) => {
  const t = new Date(NOW.getTime() - d * 86400000);
  t.setUTCHours(0, 0, 0, 0);
  t.setTime(t.getTime() + ((hour + 8) * 60 + min) * 60000 + Math.floor(rnd() * 60000)); // Pacific time -> UTC
  return t > NOW ? new Date(NOW.getTime() - Math.floor(rnd() * 5 + 1) * 3600000) : t;
};
const iso = (d) => d.toISOString();
const fmtDate = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" });
const editedLater = (created, maxDays) => {
  const later = new Date(created.getTime() + rnd() * maxDays * 86400000);
  return later > NOW ? new Date(NOW.getTime() - (1 + rnd() * 35) * 3600000) : later;
};

// ---------- login ----------
await api("POST", "/api/v1/auth/login", { username: USER, password: PASS, locale: "en-US", deviceId: "seed-device-macbook-air-m3" });

// ---------- notebooks ----------
const { notebooks: existing } = await api("GET", "/api/v1/notebooks");
const byName = Object.fromEntries(existing.map((n) => [n.name, n.id]));

// Maya never used the Chinese copy of the feature demos; it went to trash.
if (byName["功能演示"]) {
  const { memos } = await api("GET", "/api/v1/memos?notebookId=" + byName["功能演示"] + "&limit=50");
  for (const m of memos ?? []) await api("DELETE", "/api/v1/memos/" + m.id);
  await api("DELETE", "/api/v1/notebooks/" + byName["功能演示"]);
}

const nb = {
  inbox: byName["Inbox"],
  work: byName["Work Projects"],
  learning: byName["Learning Resources"],
  creative: byName["Creative Ideas"],
  personal: byName["Personal Life"],
  demos: byName["Feature Demos"],
};
const makeNb = async (key, name, parent, style = {}) => {
  const { notebook } = await api("POST", "/api/v1/notebooks", { name, parentId: parent ?? null });
  if (Object.keys(style).length) await api("PATCH", "/api/v1/notebooks/" + notebook.id, style);
  nb[key] = notebook.id;
};
await api("PATCH", "/api/v1/notebooks/" + nb.work, { icon: "briefcase", color: "#2563eb" });
await api("PATCH", "/api/v1/notebooks/" + nb.learning, { icon: "graduation-cap", color: "#7c3aed" });
await api("PATCH", "/api/v1/notebooks/" + nb.creative, { icon: "lightbulb", color: "#d97706" });
await api("PATCH", "/api/v1/notebooks/" + nb.personal, { icon: "house", color: "#059669" });
await api("PATCH", "/api/v1/notebooks/" + nb.inbox, { icon: "inbox" });
await makeNb("dash", "Harbor Dashboard v3", nb.work, { icon: "target",  isBold: true });
await makeNb("interviews", "Customer Interviews", nb.work, { icon: "users" });
await makeNb("meetings", "Meetings & 1:1s", nb.work, { icon: "calendar" });
await makeNb("books", "Book Notes", nb.learning, { icon: "book-open" });
await makeNb("code", "TypeScript & Rust", nb.learning, { icon: "code" });
await makeNb("talks", "Courses & Talks", nb.learning, { icon: "presentation" });
await makeNb("newsletter", "Newsletter Drafts", nb.creative, { icon: "newspaper" });
await makeNb("photo", "Photography", nb.creative, { icon: "camera" });
await makeNb("journal", "Journal", nb.personal, { icon: "heart" });
await makeNb("lisbon", "Lisbon Trip 2026", nb.personal, { icon: "plane",  color: "#e11d48" });
await makeNb("recipes", "Recipes", nb.personal, { icon: "utensils" });
await makeNb("home", "Home & Finances", nb.personal, { icon: "wallet" });

// ---------- notes ----------
const notes = []; // {nb, title, md, tags, created, updated, pinned, trash}
const add = (o) => notes.push(o);

const { generateNotes } = await import("./seed-content.mjs");
generateNotes({ add, nb, pick, pickN, rnd, daysAgo, editedLater, fmtDate });

notes.sort((a, b) => a.created - b.created);
let n = 0;
const toTrash = [];
const idByTitle = {};
for (const note of notes) {
  const { memo } = await api("POST", "/api/v1/memos", {
    notebookId: note.nb,
    title: note.title,
    contentMarkdown: note.md,
    tags: note.tags ?? [],
    createdAt: iso(note.created),
    updatedAt: iso(note.updated ?? note.created),
  });
  if (note.pinned) await api("PATCH", "/api/v1/memos/" + memo.id, { isPinned: true, updatedAt: iso(note.updated ?? note.created) });
  idByTitle[note.title] = memo.id;
  if (note.trash) toTrash.push(memo.id);
  n++;
}
for (const id of toTrash) await api("DELETE", "/api/v1/memos/" + id);

// Backdate the bundled feature demos to when the workspace was created.
if (nb.demos) {
  const { memos } = await api("GET", "/api/v1/memos?notebookId=" + nb.demos + "&limit=50");
  let i = 0;
  for (const m of memos ?? []) {
    const d = new Date("2026-02-16T18:05:00Z");
    d.setUTCMinutes(5 + i++);
    try { await api("PATCH", "/api/v1/memos/" + m.id, { createdAt: iso(d), updatedAt: iso(d) }); } catch (e) { console.warn(String(e).slice(0, 200)); }
  }
}
const { memos: welcome } = await api("GET", "/api/v1/memos?notebookId=" + nb.inbox + "&limit=200");
for (const m of welcome ?? []) {
  if (m.title === "Welcome to EdgeEver") {
    await api("PATCH", "/api/v1/memos/" + m.id, { createdAt: "2026-02-16T18:04:00.000Z", updatedAt: "2026-02-16T18:04:00.000Z" });
  }
}
// Notes with images, uploaded through the same multipart endpoint the clipper uses.
const { imageNotes } = await import("./seed-images.mjs");
for (const note of await imageNotes(nb)) {
  const form = new FormData();
  form.set("file", note.file);
  form.set("notebookId", note.nb);
  form.set("title", note.title);
  form.set("contentMarkdown", note.md);
  form.set("tags", JSON.stringify(note.tags));
  const res = await fetch(BASE + "/api/v1/memos/with-image", { method: "POST", headers: { cookie }, body: form });
  if (!res.ok) { console.warn("image note failed", res.status, (await res.text()).slice(0, 200)); continue; }
  const { memo } = await res.json();
  const when = daysAgo(note.daysAgo);
  await api("PATCH", "/api/v1/memos/" + memo.id, { createdAt: iso(when), updatedAt: iso(when) });
  n++;
}

// Public share links Maya sent to friends / newsletter readers.
for (const t of ["Food — places we loved", "Issue #13 — Rainy season reading", "Shakshuka (weeknight version)"]) {
  if (idByTitle[t]) await api("POST", "/api/v1/memos/" + idByTitle[t] + "/share");
}

// Personal templates she made from notes she kept rewriting.
const templates = [
  { name: "Interview snapshot", description: "Teresa Torres-style one-pager for a customer interview", title: "Interview — {name}, {company}", tags: ["research", "interview"],
    contentMarkdown: "**Date:**  \n**Role:**  \n**Interviewer:** Maya · **Notes:**\n\n## Context\n\n## What they do today\n- \n\n## Pain points\n- \n\n## Notable quote\n> \n\n## Follow-ups\n- [ ] Send thank-you + gift card\n- [ ] Add to beta list?\n" },
  { name: "Product sync", description: "Weekly Tuesday product sync", title: "Product sync — ", tags: ["meeting", "product-sync"],
    contentMarkdown: "**Attendees:** \n\n## Agenda\n1. \n\n## Notes\n- \n\n## Action items\n- [ ] \n" },
  { name: "Weekly review", description: "Friday afternoon reset", title: "Weekly review", tags: ["review"],
    contentMarkdown: "## Wins\n- \n\n## What slipped\n- \n\n## Next week — top 3\n1. \n2. \n3. \n\n## Inbox zero?\n- [ ] Process Inbox notebook\n- [ ] Clear Downloads folder\n" },
];
for (const t of templates) {
  try { await api("POST", "/api/v1/templates", t); } catch (e) { console.warn(String(e).slice(0, 200)); }
}

// AI provider: OpenAI-compatible endpoint served by the local stub (stub-server.mjs).
try {
  await api("POST", "/api/v1/ai/providers", {
    provider: "openai-compatible",
    displayName: "OpenAI",
    baseUrl: process.env.AI_STUB_BASE_URL ?? "http://127.0.0.1:4499/v1",
    apiKey: "sk-proj-local-placeholder-key-not-real-0000000000",
    isEnabled: true,
    initialModelId: "gpt-4.1-mini",
  });
} catch (e) { console.warn("AI provider setup failed:", String(e).slice(0, 300)); }

console.log(`seeded ${n} notes (${toTrash.length} in trash)`);
