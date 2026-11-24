// Usage history for the Wallet: ~5 months of turns across the rooms, written
// with the app's own appendUsage (to ~/.exxperts/app/usage.jsonl).
const { appendUsage } = await import("../apps/web-server/src/usage-log.js");
const NOW = Date.parse("2026-11-17T16:30:00Z");
const DAY = 86_400_000;
let seed = 42;
const r = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const rooms: [string, number, number][] = [
	["helvetia-crm-migration", 152, 5], ["proposal-writing", 138, 2.5], ["weekly-planning", 160, 2],
	["hiring-senior-data-engineer", 74, 1.2], ["workshop-design", 121, 1], ["personal-admin", 145, 0.7],
	["reading-research", 98, 0.4], ["data-platform-practice", 170, 1.8], ["q2-offsite-planning", 168, 0.3],
];
const models = [
	{ model: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", in: 3e-6, out: 15e-6, w: 0.75 },
	{ model: "gpt-6.1", label: "GPT-6.1", in: 2.5e-6, out: 10e-6, w: 0.25 },
];
let rows = 0;
for (let d = 170; d >= 0; d--) {
	const day = NOW - d * DAY;
	const wd = new Date(day).getUTCDay();
	if (wd === 0 || wd === 6) { if (r() > 0.15) continue; }
	for (const [agent, age, perDay] of rooms) {
		if (d > age) continue;
		if (agent === "q2-offsite-planning" && d < 140) continue;
		const n = Math.floor(perDay * (0.3 + r() * 1.4));
		for (let i = 0; i < n; i++) {
			const m = r() < models[0].w ? models[0] : models[1];
			const input = Math.round(6000 + r() * 30000), output = Math.round(300 + r() * 2200), cacheRead = Math.round(input * (0.4 + r() * 0.5));
			const ts = day - (8 - Math.floor(r() * 9)) * 3_600_000 - Math.floor(r() * 3_600_000);
			appendUsage({ ts, agent, persona: "business", model: m.model, modelLabel: m.label, provider: "gateway-exxeta-ai-gateway", authType: "api_key", kind: "chat", input: input - cacheRead, output, cacheRead, cacheWrite: 0, cost: +((input - cacheRead) * m.in + cacheRead * m.in * 0.1 + output * m.out).toFixed(5) } as any);
			rows++;
		}
		if (r() < 0.04) {
			const input = Math.round(15000 + r() * 40000), output = Math.round(1500 + r() * 4000);
			appendUsage({ ts: day - 2 * 3_600_000, agent, persona: "business", model: "claude-haiku-5-5", modelLabel: "Claude Haiku 5.5", provider: "gateway-exxeta-ai-gateway", authType: "api_key", kind: "upkeep", input, output, cacheRead: 0, cacheWrite: 0, cost: +(input * 1e-6 + output * 5e-6).toFixed(5) } as any);
			rows++;
		}
	}
}
console.log(`usage rows: ${rows}`);
