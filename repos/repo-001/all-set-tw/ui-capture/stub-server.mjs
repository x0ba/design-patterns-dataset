// Local stand-in for https://open.er-api.com/v6/latest/TWD (exchange-rate provider).
// Returns the same JSON shape as the real API with plausible Nov-2026 TWD-based rates.
import { createServer } from "node:http";
const port = Number(process.argv[2] ?? 4421);
const ratesPerTwd = { TWD: 1, USD: 0.03136, JPY: 4.8245, EUR: 0.02712, GBP: 0.02371, HKD: 0.2441, CNY: 0.2236, KRW: 43.72, SGD: 0.04078, AUD: 0.04812, CAD: 0.04391, CHF: 0.02498, THB: 1.0185, MYR: 0.1402, VND: 801.4, USDT: 0.03136 };
createServer((req, res) => {
  if (req.url?.startsWith("/v6/latest/TWD")) {
    const now = Math.floor(Date.now() / 1000);
    const jitter = (v) => +(v * (1 + (Math.random() - 0.5) * 0.002)).toPrecision(6);
    const rates = Object.fromEntries(Object.entries(ratesPerTwd).map(([k, v]) => [k, k === "TWD" ? 1 : jitter(v)]));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ result: "success", provider: "https://www.exchangerate-api.com", documentation: "https://www.exchangerate-api.com/docs/free", terms_of_use: "https://www.exchangerate-api.com/terms", time_last_update_unix: now - (now % 86400) + 60, time_last_update_utc: new Date((now - (now % 86400) + 60) * 1000).toUTCString(), time_next_update_unix: now - (now % 86400) + 86460, base_code: "TWD", rates }));
    return;
  }
  res.writeHead(404).end();
}).listen(port, "127.0.0.1", () => console.log(`exchange-rate stub on 127.0.0.1:${port}`));
