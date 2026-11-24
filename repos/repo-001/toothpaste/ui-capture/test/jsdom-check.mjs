// Smoke test of the built static app in jsdom (headless Chromium can't launch in this sandbox).
import "fake-indexeddb/auto";
import { JSDOM } from "jsdom";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const out = resolve("../out");
const html = readFileSync(join(out, "index.html"), "utf8");
const dom = new JSDOM(html, { url: "http://localhost:5478/", pretendToBeVisual: true, runScripts: "outside-only" });
const w = dom.window;
w.indexedDB = globalThis.indexedDB; w.IDBKeyRange = globalThis.IDBKeyRange;
for (const k of ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Node", "Event", "EventTarget", "KeyboardEvent", "MouseEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "DOMException", "MutationObserver", "HTMLCanvasElement", "Navigator", "CustomEvent", "matchMedia"]) {
  try { Object.defineProperty(globalThis, k, { value: w[k] ?? globalThis[k], configurable: true, writable: true }); } catch {}
}
w.matchMedia = globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
globalThis.ResizeObserver = w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
w.crypto = globalThis.crypto; w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; w.Uint8Array = Uint8Array; w.ArrayBuffer = ArrayBuffer;
w.HTMLCanvasElement.prototype.getContext = () => null;
const realFetch = globalThis.fetch;
globalThis.fetch = w.fetch = async (u) => {
  const p = new URL(u, "http://localhost:5478/").pathname;
  return new Response(readFileSync(join(out, p)), { status: 200 });
};
const errors = [];
const origErr = console.error; console.error = (...a) => { errors.push(a.map(String).join(" ").slice(0, 200)); };
// 1) BLE stub (classic script) 2) seeder 3) app entry, exactly as index.html does
w.eval(readFileSync(join(out, "ui-capture/ble-stub.js"), "utf8"));
Object.defineProperty(globalThis.navigator, "bluetooth", { value: w.navigator.bluetooth, configurable: true });
const { seed } = await import(pathToFileURL(join(out, "ui-capture/seed.js")).href);
await seed();
console.log("localStorage:", Object.keys(w.localStorage).join(", "));
const entry = html.match(/await import\("([^"]+)"\)/)[1];
await import(pathToFileURL(join(out, entry)).href);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);
const text = () => w.document.body.textContent.replace(/\s+/g, " ");
console.log("[live] ", text().slice(0, 300));
// connect via stub
const btn = w.document.getElementById("connection-button");
btn.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true }));
btn.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true }));
await sleep(2500);
console.log("[after connect] button:", btn.textContent, "| class has border-primary:", btn.className.includes("border-primary"));
// go to paste view -> duckyscript tab
const click = (el) => { el.dispatchEvent(new w.MouseEvent("pointerdown", { bubbles: true })); el.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true })); el.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true })); el.click(); };
const pasteBtn = [...w.document.querySelectorAll("button")].find((b) => /Paste/.test(b.textContent) && !/Paste to/.test(b.textContent) && b.id !== "connection-button");
click(pasteBtn); await sleep(500);
const ducky = [...w.document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Duckyscript");
if (ducky) { click(ducky); await sleep(800); }
const t = text();
console.log("[paste/ducky] has scripts:", t.includes("LUKS unlock - nas01"), t.includes("Sunshine/Moonlight PIN pair"), "| errors badge:", (t.match(/Errors/g) || []).length, "| valid:", (t.match(/✓ Valid/g) || []).length);
console.log("console errors:", errors.slice(0, 8));
process.exit(0);
