// 无浏览器环境下的冒烟测试：用 happy-dom 加载构建产物，打印报错与渲染出的文本
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { Browser } from "../node_modules/happy-dom/lib/index.js";
const out = resolve(import.meta.dirname, "out");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = join(out, decodeURIComponent(req.url.split("?")[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(out, "index.html");
  res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
}).listen(5430);
const browser = new Browser({ settings: { disableCSSFileLoading: true, errorCapture: "processLevel", navigation: {}, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
const page = browser.newPage();
page.virtualConsolePrinter.addEventListener("print", () => {});
page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:5430/" + (process.argv[2] ?? ""));
await new Promise((r) => setTimeout(r, Number(process.argv[3] ?? 6000)));
const logs = page.virtualConsolePrinter.readAsString();
console.log(logs.split("\n").filter((l) => /error|warn|fail/i.test(l)).slice(0, 40).join("\n"));
const app = page.mainFrame.document.querySelector("#app");
console.log("---- #app text ----");
console.log((app?.textContent ?? "(none)").replace(/\s+/g, " ").slice(0, 2500));
await browser.close();
server.close();
process.exit(0);
