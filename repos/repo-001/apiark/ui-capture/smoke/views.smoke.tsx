import "../mock/tauri-backend";
import { render, act, fireEvent } from "@testing-library/react";
import App from "@/App";
import "@/lib/i18n";
import { useTabStore } from "@/stores/tab-store";
const wait = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
test("views render seeded data", async () => {
  (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  render(<App />);
  await wait(2000);
  const labels = ["Environments", "History", "Git", "Monitor", "Proxy", "Audit"];
  for (const l of labels) {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.getAttribute("aria-label") || b.getAttribute("title") || "").toLowerCase().startsWith(l.toLowerCase()));
    if (!btn) { console.log(`VIEW ${l}: button not found`); continue; }
    fireEvent.click(btn); await wait(800);
    const side = document.body.textContent!.replace(/To pick up a draggable[^.]*\.[^.]*\.[^.]*\.?/g, "").replace(/\s+/g, " ");
    console.log(`VIEW ${l}: ` + side.slice(0, 900));
  }
  await act(async () => { await useTabStore.getState().send(); });
  await wait(1200);
  console.log("AFTER SEND: " + document.body.textContent!.replace(/\s+/g, " ").slice(-1500));
});
