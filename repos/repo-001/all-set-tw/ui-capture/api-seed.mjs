// Seeds data that should go through the app's own HTTP API (encrypted connector credentials,
// cash-account transactions, user classification rules, deposit-history rebuild).
// Usage: node api-seed.mjs http://127.0.0.1:5433
const base = process.argv[2] ?? "http://127.0.0.1:5433";
async function call(method, path, body) {
  const res = await fetch(`${base}/api${path}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// 1. Connector credentials (fake, encrypted by the app with its CONFIG_ENCRYPTION_KEY)
const connectors = {
  einvoice: { mobile: "0912345678", password: "Einv-local-0000" },
  tdcc: { userId: "A123456789", password: "tdcc-local-0000" },
  esun: { userId: "A123456789", account: "chen0815", password: "esun-local-0000" },
  cathaybk: { userId: "A123456789", account: "chenyt88", password: "cathay-local-0000" },
  taishin: { userId: "A123456789", account: "ytchen", password: "taishin-local-0000" },
};
for (const [id, config] of Object.entries(connectors)) await call("PUT", `/connectors/${id}/settings`, { config });

// 2. Cash wallet (manual transactions) – spread over the same months as bank data
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a) => a[Math.floor(rnd() * a.length)];
const addDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const tx = [];
const cashSpots = [
  ["早餐 美而美 蛋餅+大冰奶", 75, 95, "food"], ["巷口自助餐", 95, 140, "food"], ["阿宗麵線", 75, 75, "food"], ["饒河夜市 胡椒餅+珍奶", 120, 220, "food"],
  ["傳統市場 水果", 150, 380, "food"], ["50 嵐 四季春珍波椰 微糖少冰", 55, 65, "food"], ["理髮 百元快剪", 150, 150, "shopping"],
  ["停車費 路邊格", 40, 120, "transport"], ["公園旁 雞蛋糕", 50, 50, "food"], ["廟口 牛肉麵", 160, 200, "food"], ["市場 豬肉攤", 220, 420, "food"],
];
let n = 0;
for (let d = "2026-03-02"; d <= "2026-11-16"; d = addDays(d, 1)) {
  if (d.endsWith("-25")) tx.push({ externalId: `atm-${d}`, date: d, type: "transfer_in", amount: 3000, description: "ATM 提款（玉山）" });
  const k = rnd() < 0.55 ? ri(1, 2) : 0;
  for (let i = 0; i < k; i++) { const [desc, lo, hi, cat] = pick(cashSpots); tx.push({ externalId: `cash-${d}-${i}`, date: d, type: "expense", amount: Math.round(ri(lo, hi) / 5) * 5, description: desc, categoryId: cat }); n++; }
  if (d === "2026-04-12") tx.push({ externalId: `cash-${d}-gift`, date: d, type: "income", amount: 2000, description: "同學還錢（清明花東行代墊）", note: "另外兩位用 LINE Pay 還" });
  if (d === "2026-05-03") tx.push({ externalId: `cash-${d}-wed`, date: d, type: "expense", amount: 3600, description: "大學同學婚禮 禮金", categoryId: "other" });
  if (d === "2026-09-28") tx.push({ externalId: `cash-${d}-moon`, date: d, type: "expense", amount: 860, description: "中秋烤肉 食材分攤", categoryId: "food" });
  if (d === "2026-10-01") tx.push({ externalId: `cash-${d}-jpy`, date: d, type: "expense", amount: 1300, description: "換日圓現鈔手續費 & 機場巴士", note: "JPY 85,000 另記在手動資產" });
}
let cashOnHand = 4800;
const first = { externalId: "opening", date: "2026-03-01", type: "income", amount: 4800, description: "錢包現金 期初", note: "開始記帳時錢包＋抽屜的現金" };
const all = [first, ...tx];
for (let i = 0; i < all.length; i += 50) await call("POST", "/manual-transactions", { transactions: all.slice(i, i + 50) });
await call("POST", "/manual-transactions", { balance: 2460 });

// 3. User classification rules (in addition to system defaults)
const rules = [
  { categoryId: "housing", field: "any_text", operator: "contains", pattern: "房租", description: "房東林小姐的房租", priority: 200 },
  { categoryId: "health", field: "description", operator: "contains", pattern: "健身工廠", description: "健身房月費算健康", priority: 190 },
  { categoryId: "transfer", field: "description", operator: "contains", pattern: "孝親費", description: "給爸媽的錢不算消費", priority: 190, excludedFromCalculation: true },
  { categoryId: "investment", field: "description", operator: "regex", pattern: "基金申購|交割款", description: "投資扣款", priority: 180 },
  { categoryId: "food", field: "description", operator: "regex", pattern: "鼎泰豐|瓦城|屋馬|饗食天堂|築間", description: "常去的餐廳", priority: 150 },
];
for (const r of rules) await call("POST", "/classification/rules", { targetType: "bank_transaction", ...r });

// 4. Rebuild deposit history (cash wallet included) over the whole period
console.log(await call("POST", "/history/net-worth/rebuild-bank", { from: "2026-03-01", to: "2026-11-17" }));
console.log("api seed done:", all.length, "cash records");
