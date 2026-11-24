// Loads the generated scene through the app's own import path
// (loadFromBlob -> restore) to make sure every element survives.
import fs from "node:fs";
import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";

it("seed scene restores cleanly", async () => {
  const raw = fs.readFileSync(process.env.SCENE_FILE!, "utf8");
  const json = JSON.parse(raw);
  const blob = new Blob([raw], { type: "application/json" });
  const data = await loadFromBlob(blob, null, null);
  const live = data.elements.filter((e) => !e.isDeleted);
  console.log("restored", live.length, "of", json.elements.length, "zoom", data.appState.zoom, data.appState.scrollX, data.appState.scrollY, data.appState.name);
  const types: Record<string, number> = {};
  live.forEach((e) => (types[e.type] = (types[e.type] || 0) + 1));
  console.log(types);
  const arrows = live.filter((e: any) => e.type === "arrow");
  console.log("arrows bound:", arrows.filter((a: any) => a.startBinding || a.endBinding).length, "/", arrows.length);
  const bad = live.filter((e: any) => e.type === "text" && e.containerId && !live.find((c) => c.id === e.containerId));
  expect(bad.length).toBe(0);
  expect(live.length).toBe(json.elements.length);
});
