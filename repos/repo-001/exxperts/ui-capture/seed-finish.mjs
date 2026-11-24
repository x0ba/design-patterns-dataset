// Finishing touches through the running app's API: dismiss "What's new" (an
// established user has seen it), archive a finished room, and check the rooms list.
const APP = process.env.APP_URL, TOKEN = process.env.AUTH_TOKEN;
async function api(method, path, body) {
	const res = await fetch(APP + path, { method, headers: { "x-exxperts-auth": TOKEN, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
	const text = await res.text();
	if (!res.ok) console.log(`WARN ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
	try { return JSON.parse(text); } catch { return text; }
}
await api("POST", "/api/whats-new/seen");
const archive = process.env.ARCHIVE_ROOM;
if (archive) console.log("archive:", JSON.stringify(await api("POST", `/api/persistent-agents/${archive}/archive`, { confirmation: `DELETE ${archive}` })).slice(0, 200));
const rooms = await api("GET", "/api/persistent-agents");
const list = rooms.agents ?? rooms.rooms ?? rooms;
console.log("rooms:", Array.isArray(list) ? list.map((r) => r.displayName ?? r.agentId).join(" | ") : JSON.stringify(rooms).slice(0, 400));
