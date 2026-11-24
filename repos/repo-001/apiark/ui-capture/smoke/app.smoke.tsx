import "../mock/tauri-backend";
import { render, screen, act } from "@testing-library/react";
import App from "@/App";
import "@/lib/i18n";
test("app boots with seeded workspace", async () => {
  window.matchMedia = window.matchMedia || ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } as any));
  (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  const errs: string[] = [];
  const orig = console.error; console.error = (...a: any[]) => { errs.push(a.map(String).join(" ").slice(0, 300)); };
  render(<App />);
  await act(async () => { await new Promise((r) => setTimeout(r, 2500)); });
  const text = document.body.textContent || "";
  console.log("TEXT:", text.replace(/\s+/g, " ").slice(0, 3000));
  console.log("ERRORS:", errs.slice(0, 10).join("\n"));
  console.error = orig;
  expect(text).toContain("Ledgerly Payments API");
});
