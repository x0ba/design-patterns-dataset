// Verification helper: drives a local headless Chromium over CDP, logs in through the app's API,
// opens a URL and saves a 1440x900 screenshot. usage: node screenshot.js <chromeBin> <baseUrl> <path?query> <out.png>
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require(path.resolve(__dirname, "../frontend/node_modules/ws"));
const [chrome, base, target, out] = process.argv.slice(2);
const wait = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let s = ""; r.on("data", c => (s += c)); r.on("end", () => res(JSON.parse(s))); }).on("error", rej));

(async () => {
  const prof = path.join(process.env.TMPDIR || "/tmp", "cdp-prof-" + Date.now());
  const ch = spawn(chrome, ["--remote-debugging-port=9333", "--user-data-dir=" + prof, "--window-size=1440,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
  let tabs; for (let i = 0; i < 40; i++) { try { tabs = await getJSON("http://127.0.0.1:9333/json"); break; } catch (e) { await wait(250); } }
  const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise(r => ws.on("open", r));
  let id = 0; const pending = {}; const logs = [];
  ws.on("message", m => { const j = JSON.parse(m); if (j.id && pending[j.id]) { pending[j.id](j); delete pending[j.id]; } if (j.method === "Runtime.consoleAPICalled") logs.push(j.params.args.map(a => a.value).join(" ")); if (j.method === "Runtime.exceptionThrown") logs.push("EXC " + JSON.stringify(j.params.exceptionDetails.exception && j.params.exceptionDetails.exception.description)); });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: base + "/" }); await wait(2500);
  const login = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `fetch('/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'maya.hartono@kodekopi.id',password:'Designer#2024'})}).then(r=>r.json()).then(j=>{localStorage.setItem('token',j.payload.token);return j.success})` });
  console.log("login:", JSON.stringify(login.result.result.value));
  await send("Page.navigate", { url: base + target }); await wait(4000);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log(logs.filter(l => /EXC|error/i.test(l)).slice(0, 10).join("\n"));
  ws.close(); ch.kill(); fs.rmSync(prof, { recursive: true, force: true });
})();
