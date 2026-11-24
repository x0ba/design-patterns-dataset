// Renders the real App in happy-dom, runs the capture seed loader, and checks both columns fill.
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register({ url: "http://localhost/" });
import fs from "node:fs";
const OUT = new URL("../out/", import.meta.url).pathname;
(globalThis as any).fetch = async (u: string) => new Response(fs.readFileSync(OUT + String(u).replace(/^\//, "")));
(window as any).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
document.body.innerHTML = '<div id="root"></div>';
await import("../../src/main.tsx");
new Function(fs.readFileSync(OUT + "seed/seed-loader.js", "utf8"))();
await new Promise((r) => setTimeout(r, 1500));
const tas = document.querySelectorAll("textarea");
console.log("textareas:", tas.length);
console.log("config lines:", (tas[0] as any).value.split("\n").length);
const links = (tas[1] as any).value.split("\n").filter(Boolean);
console.log("links:", links.length);
console.log(links.slice(0, 3).join("\n"));
console.log("heading:", [...document.querySelectorAll("h3,h1,h2")].map((h) => h.textContent).join(" | "));
process.exit(0);
