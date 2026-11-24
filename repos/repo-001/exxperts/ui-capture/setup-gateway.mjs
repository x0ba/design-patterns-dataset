// Connects the app to the local LLM stub through its own "Add gateway" API,
// approves its models, and sets the Default models.
const APP = process.env.APP_URL, TOKEN = process.env.AUTH_TOKEN;
const STUB = `http://127.0.0.1:${process.env.GATEWAY_STUB_PORT || 4416}/v1`;
async function api(method, path, body) {
	const res = await fetch(APP + path, { method, headers: { "x-exxperts-auth": TOKEN, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
	try { return JSON.parse(text); } catch { return text; }
}
const existing = await api("GET", "/api/persistent-agent-ai-profiles/gateways");
console.log("existing gateways:", JSON.stringify(existing).slice(0, 300));
const disc = await api("POST", "/api/persistent-agent-ai-profiles/gateways/discover", { baseUrl: STUB, key: "sk-litellm-local-placeholder" });
console.log("discovered:", disc.models);
const roomModels = disc.detected.filter((d) => d.id !== "mistral-large-3").map((d) => ({ modelId: d.id, detected: d }));
const saved = await api("POST", "/api/persistent-agent-ai-profiles/gateways", { label: "EXXETA AI Gateway", baseUrl: STUB, key: "sk-litellm-local-placeholder", roomModels, maintenanceModel: "claude-haiku-5-5" });
console.log("saved gateway:", JSON.stringify(saved.gateway).slice(0, 400));
console.log("defaults:", JSON.stringify(await api("GET", "/api/ai/defaults")).slice(0, 600));
const gw = saved.gateway.providerId;
const d = await api("PUT", "/api/ai/defaults", { conversation: { provider: gw, model: "claude-sonnet-5-5" }, memory: { provider: gw, model: "claude-haiku-5-5" } });
console.log("defaults set:", d.defaults.conversation.effective.label, "/", d.defaults.memory.effective.label);
