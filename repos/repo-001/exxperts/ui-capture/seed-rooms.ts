// Seeds rooms for an established user through the app's own store code:
// the real scaffold creates each room, its memory file (L1b) gets dated notes
// that the app's migration turns into entries on first read, and an open
// conversation is written with the real thread writer. Run (offline) with:
//   HOME=.ui-capture/home node --import tsx .ui-capture/seed-rooms.ts
import fs from "node:fs";
import path from "node:path";
import { ROOMS, CORPUS_ROOM, ARCHIVED_ROOM, type RoomSeed } from "./seed-data.ts";

const { createPersistentAgentFromScaffoldInput, PERSISTENT_AGENTS_ROOT } = await import("../apps/web-server/src/persistent-agents.js");
const { writePersistentAgentThread } = await import("../apps/web-server/src/persistent-agent-threads.js");

const MODEL = { provider: "gateway-exxeta-ai-gateway", model: "claude-sonnet-5-5" };
const DAY = 86_400_000;
const NOW = Date.parse("2026-11-17T16:30:00Z");

function rand(seed: number) {
	return () => {
		seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function l1bFor(room: RoomSeed, agentId: string, scaffoldL1b: string): string {
	const chronos = scaffoldL1b.split("## Deep Memory")[0];
	const r = rand(room.name.length * 97);
	const span = room.ageDays;
	const deep = room.topics.map((t) => {
		const lines = t.notes.map((note, i) => {
			const age = Math.max(1, Math.round(span - ((i + 1) / (t.notes.length + 1)) * span + (r() - 0.5) * 10));
			return `- ${note} (saved ${iso(NOW - age * DAY)})`;
		});
		return `### ${t.title}\n\n${lines.join("\n")}`;
	}).join("\n\n");
	const active = room.active.map((a, i) => `- ${a} (saved ${iso(NOW - Math.max(1, Math.round((i + 1) * 3 + r() * 9)) * DAY)})`).join("\n");
	// Chronos stamps: the last Memorize (consolidation) and the last Remember.
	const consolidated = new Date(NOW - (room.lastUsedDays + 4 + Math.round(r() * 10)) * DAY).toISOString();
	const remembered = new Date(NOW - (room.lastUsedDays + 1) * DAY).toISOString();
	const stampedChronos = chronos
		.replace("- Last checkpoint: none", `- Last checkpoint: none\n- Last checkpoint at: ${remembered}`)
		.replace("- Last consolidation: none", `- Last consolidation: none\n- Last consolidation at: ${consolidated}`);
	// Conversations remembered but not yet memorized wait in Recent Context.
	const waiting = (room.waiting ?? []).map((w, i) => [
		`### RC-${String(i + 1).padStart(4, "0")} | OPEN | ${iso(NOW - (room.lastUsedDays + (room.waiting!.length - i)) * DAY)} | ${w.title}`,
		"", `**Session arc:** ${w.arc}`, "", "**Body:**", ...w.points.map((p) => `- ${p}`), "", "**Parked:**", "None", "",
	].join("\n"));
	const recent = waiting.length ? waiting.join("\n") : "No checkpointed sessions yet.\n";
	return `${stampedChronos}## Deep Memory\n\n${deep}\n\n## Active Items\n\n${active}\n\n## Recent Context\n\n${recent}`;
}

function seedRoom(room: RoomSeed) {
	const scaffold = createPersistentAgentFromScaffoldInput({ displayName: room.name, userName: "Jonas Keller", preferredUserAddress: "Jonas" });
	const agentId: string = scaffold.agent.agentId;
	const root: string = scaffold.agent.root;
	const createdAt = NOW - room.ageDays * DAY;
	const agentPath = path.join(root, "agent.json");
	const agent = JSON.parse(fs.readFileSync(agentPath, "utf8"));
	agent.description = room.description;
	agent.createdAt = createdAt;
	agent.updatedAt = NOW - room.lastUsedDays * DAY;
	fs.writeFileSync(agentPath, JSON.stringify(agent, null, 2) + "\n");
	const l1bPath = path.join(root, "L1b", "current.md");
	fs.writeFileSync(l1bPath, l1bFor(room, agentId, fs.readFileSync(l1bPath, "utf8")));
	if (room.conversation.length) {
		const start = NOW - room.lastUsedDays * DAY - room.conversation.length * 7 * 60_000;
		const items = room.conversation.map((m, i) => ({ kind: m.role, id: `${m.role}-${agentId}-${i}`, text: m.text, ts: start + i * 7 * 60_000 }));
		const threadId = `thread-${(NOW - room.lastUsedDays * DAY).toString(36)}-${agentId.slice(0, 6)}`;
		writePersistentAgentThread(agentId, threadId, { state: "active", model: MODEL, items, origin: "user" } as any);
		const threadFile = path.join(root, "runtime", "threads", `${threadId}.json`);
		if (fs.existsSync(threadFile)) {
			const t = JSON.parse(fs.readFileSync(threadFile, "utf8"));
			t.createdAt = start; t.updatedAt = items[items.length - 1].ts;
			fs.writeFileSync(threadFile, JSON.stringify(t, null, 2) + "\n");
		}
	}
	console.log(`room ${agentId}: ${room.topics.reduce((n, t) => n + t.notes.length, 0)} notes, ${room.active.length} items, ${room.conversation.length} messages`);
	return agentId;
}

const ids: string[] = [];
ids.push(seedRoom(ARCHIVED_ROOM));
for (const room of ROOMS) ids.push(seedRoom(room));

// One long-running room whose memory comes from the repo's frozen, model-written
// corpus (apps/web-server/scripts/fixtures/synthetic-room-corpus.json).
const corpus = JSON.parse(fs.readFileSync(new URL("../apps/web-server/scripts/fixtures/synthetic-room-corpus.json", import.meta.url), "utf8"));
const pick = rand(7);
const corpusRoom: RoomSeed = {
	...CORPUS_ROOM,
	topics: corpus.sections.slice(0, 9).map((s: any) => ({
		title: s.topic,
		notes: s.entries.filter(() => pick() < 0.16).map((e: any) => String(e.text).replace(/\bUser\b/g, "Jonas")),
	})),
};
ids.push(seedRoom(corpusRoom));
console.log("rooms root:", PERSISTENT_AGENTS_ROOT);
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "tmp", "room-ids.json"), JSON.stringify(ids));
