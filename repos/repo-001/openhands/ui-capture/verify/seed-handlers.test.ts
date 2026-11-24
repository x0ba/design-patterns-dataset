// Temporary verification of seeded mock handlers (copied from .ui-capture/verify).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "#/mocks/handlers";
import { UI_CAPTURE_SEED } from "#/mocks/ui-capture-seed";

const server = setupServer(...handlers.filter((h) => h.kind !== "websocket"));
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
const base = "http://localhost:4411";
const get = async (p: string) => (await fetch(base + p)).json();

describe("seed", () => {
  it("loads", async () => {
    expect(UI_CAPTURE_SEED).not.toBeNull();
    const page1 = await get("/api/conversations/search?limit=20");
    const page2 = await get(`/api/conversations/search?limit=20&page_id=${page1.next_page_id}`);
    console.log("page1", page1.items.length, page1.items.slice(0, 6).map((c: any) => `${c.title} | ${c.execution_status} | ${c.updated_at}`));
    console.log("page2", page2.items.length, page2.next_page_id);
    const id = page1.items[1].id;
    const evs = await get(`/api/conversations/${id}/events/search?limit=100&sort_order=TIMESTAMP_DESC`);
    console.log("events", id, evs.items.length);
    console.log("profiles", JSON.stringify(await get("/api/profiles")));
    const s = await get("/api/settings");
    console.log("settings llm", s.llm_api_key_is_set, s.agent_settings.llm.model, s.misc_settings.app_preferences.git_user_name);
    console.log("secrets", JSON.stringify(await get("/api/settings/secrets")).slice(0, 200));
    console.log("workspaces", JSON.stringify(await get("/api/workspaces")).slice(0, 200));
    console.log("user", JSON.stringify(await get("/api/user/info")));
    console.log("repos", JSON.stringify(await get("/api/user/repositories?selected_provider=github&page=1&per_page=5")).slice(0, 300));
  });
});
