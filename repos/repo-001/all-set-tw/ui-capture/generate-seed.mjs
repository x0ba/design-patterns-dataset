// Generates .ui-capture/seed.sql: ~8.5 months of realistic personal-finance data for one
// Taipei-based user (salary account, daily-spending account, USD account, 3 credit cards,
// a personal loan, time deposits, TDCC stock/ETF/fund holdings, e-invoices, manual assets).
// Usage: node generate-seed.mjs > seed.sql
const START = "2026-03-01";
const TODAY = "2026-11-17";
const NOW = "2026-11-17T06:12:00.000Z";

let seed = 20261117;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

function addDays(d, n) { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function dates(from, to) { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; }
const dow = (d) => new Date(`${d}T00:00:00Z`).getUTCDay();
const iso = (d, h = 10, m = 0) => `${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`;
// Taiwan local time HH:MM on day d → UTC ISO
const tw = (d, h, m) => { const x = new Date(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+08:00`); return x.toISOString(); };

const out = [];
const rows = {}; // table -> {cols, values[]}
function add(table, obj) {
  if (!rows[table]) rows[table] = { cols: Object.keys(obj), values: [] };
  rows[table].values.push(rows[table].cols.map((c) => q(obj[c])));
}

// ---------------------------------------------------------------- accounts
const RATES = { USD: 31.86, JPY: 0.2071, EUR: 36.94 };
const acct = {
  payroll: { id: "taishin:TSB-812-28880019", connector: "taishin", source: "TSB-812-28880019", inst: "台新銀行", name: "Richart 數位帳戶", type: "savings", cur: "TWD", code: "812", last4: "0019", bal: 684360 },
  daily: { id: "esun:ESUN-808-0961234", connector: "esun", source: "ESUN-808-0961234", inst: "玉山銀行", name: "數位綜合存款", type: "savings", cur: "TWD", code: "808", last4: "1234", bal: 58210 },
  usd: { id: "cathaybk:CUB-013-0256688", connector: "cathaybk", source: "CUB-013-0256688", inst: "國泰世華銀行", name: "外幣活期存款", type: "savings", cur: "USD", code: "013", last4: "6688", bal: 9850 },
  settle: { id: "tdcc:TDCC-920-004455", connector: "tdcc", source: "TDCC-920-004455", inst: "元大證券", name: "證券交割款項帳戶", type: "settlement_cash", cur: "TWD", code: "920", last4: "4455", bal: 128420 },
  cube: { id: "cathaybk:CUB-CARD-4521", connector: "cathaybk", source: "CUB-CARD-4521", inst: "國泰世華銀行", name: "CUBE 卡", type: "credit", cur: "TWD", code: "013", last4: "4521", bal: 0, limit: 280000, close: 18, autopay: "payroll" },
  pi: { id: "esun:ESUN-CARD-7766", connector: "esun", source: "ESUN-CARD-7766", inst: "玉山銀行", name: "玉山 Pi 拍錢包信用卡", type: "credit", cur: "TWD", code: "808", last4: "7766", bal: 0, limit: 180000, close: 3, autopay: "daily" },
  gogo: { id: "taishin:TSB-CARD-3307", connector: "taishin", source: "TSB-CARD-3307", inst: "台新銀行", name: "@GoGo 卡", type: "credit", cur: "TWD", code: "812", last4: "3307", bal: 0, limit: 150000, close: 25, autopay: "payroll" },
  loan: { id: "cathaybk:CUB-LOAN-7130", connector: "cathaybk", source: "CUB-LOAN-7130", inst: "國泰世華銀行", name: "信用貸款 7130", type: "loan", cur: "TWD", code: "013", last4: "7130", bal: -553840 },
  td1: { id: "taishin:TSB-TD-0081", connector: "taishin", source: "TSB-TD-0081", inst: "台新銀行", name: "一年期定期存款", type: "time_deposit", cur: "TWD", code: "812", last4: "0081", bal: 0, opened: "2026-05-20", maturity: "2027-05-20" },
  td0: { id: "taishin:TSB-TD-0052", connector: "taishin", source: "TSB-TD-0052", inst: "台新銀行", name: "一年期定期存款", type: "time_deposit", cur: "TWD", code: "812", last4: "0052", bal: 200000, opened: "2025-09-15", maturity: "2026-09-15" },
  usdtd: { id: "cathaybk:CUB-TD-USD-2209", connector: "cathaybk", source: "CUB-TD-USD-2209", inst: "國泰世華銀行", name: "美元六個月定存", type: "time_deposit", cur: "USD", code: "013", last4: "2209", bal: 0, opened: "2026-08-12", maturity: "2027-02-12" },
};
for (const a of Object.values(acct)) a.init = a.bal;
for (const a of Object.values(acct)) {
  add("bank_accounts", {
    id: a.id, connector_id: a.connector, source_id: a.source, institution_name: a.inst, account_name: a.name,
    account_type: a.type, currency: a.cur, raw_payload: "{}", created_at: iso(START, 1, 5), updated_at: NOW,
    bank_code: a.code, account_last4: a.last4, canonical_account_id: null, credit_limit: a.limit ?? null,
    opened_date: a.type === "loan" ? "2023-09-28" : a.opened ?? null, maturity_date: a.type === "loan" ? "2030-09-28" : a.maturity ?? null,
    inactive_at: a === acct.td0 ? "2026-09-15T22:00:00.000Z" : null,
    loan_interest_rate: a.type === "loan" ? 2.88 : null, loan_category: a.type === "loan" ? "personal" : null,
    autopay_status: a.type === "credit" ? "enabled" : a.type === "loan" ? "enabled" : null,
    autopay_bank_code: a.autopay ? acct[a.autopay].code : a.type === "loan" ? "812" : null,
    autopay_account_last4: a.autopay ? acct[a.autopay].last4 : a.type === "loan" ? "0019" : null,
    autopay_account_source_id: a.autopay ? acct[a.autopay].source : a.type === "loan" ? acct.payroll.source : null,
  });
}

// ---------------------------------------------------------------- transactions
const txs = [];
const depositHistory = [];
const snapList = [];
let txn = 0;
function tx(a, date, amount, description, counterparty, opts = {}) {
  txn += 1;
  const sourceId = opts.sourceId ?? `${a.source.split("-")[0]}${date.replace(/-/g, "")}${String(txn).padStart(5, "0")}`;
  const t = {
    id: `${a.connector}:${a.id}:${sourceId}`, connector_id: a.connector, account_id: a.id, source_id: sourceId,
    posted_date: opts.pending ? null : (opts.posted ?? date), authorized_at: opts.at ?? null,
    amount: Math.round(amount), currency: opts.currency ?? a.cur, description, counterparty: counterparty ?? null,
    raw_payload: "{}", created_at: opts.at ?? iso(opts.posted ?? date, 2, ri(0, 59)), updated_at: opts.at ?? iso(opts.posted ?? date, 2, 30),
    status: opts.pending ? "pending" : "posted", transfer_peer_id: null, matched_transaction_id: null,
    card_last4: opts.card ?? null, card_name: opts.cardName ?? null, _date: date,
  };
  txs.push(t);
  if (a.type !== "credit") a.bal += t.amount; else a.bal += t.amount; // credit: bal is negative liability
  return t;
}
function transfer(from, to, date, amount, outDesc, inDesc) {
  const o = tx(from, date, -amount, outDesc, to.inst);
  const i = tx(to, date, amount, inDesc, from.inst);
  o.transfer_peer_id = i.id; i.transfer_peer_id = o.id;
  return [o, i];
}

const invoices = [];
let invSeq = 0;
function invoice(date, seller, items, opts = {}) {
  invSeq += 1;
  const total = items.reduce((s, [, qty, price]) => s + qty * price, 0);
  const letters = pick(["AB", "CD", "EF", "GH", "JK", "LM", "NP", "QR", "ST", "UV", "WX", "YZ", "KQ", "MT", "PZ"]);
  const num = `${letters}${String(ri(10000000, 99999999))}`;
  invoices.push({ date, seller, items, total, num, at: opts.at, excluded: opts.excluded ? 1 : 0 });
  return total;
}

// Merchant catalog: [counterparty/description, seller legal name or null, item generator]
const conv = [
  ["7-ELEVEN 統一超商", "統一超商股份有限公司", () => sample([["御飯糰 鮪魚", 1, 39], ["統一陽光無糖豆漿 450ml", 1, 25], ["茶葉蛋", 2, 13], ["CITY CAFE 大杯拿鐵", 1, 65], ["關東煮", 3, 18], ["義美小泡芙", 1, 35], ["光泉鮮乳 936ml", 1, 92], ["御便當 雞腿", 1, 89]], 1, 3)],
  ["全家便利商店", "全家便利商店股份有限公司", () => sample([["Let's Café 美式 大", 1, 50], ["大口雞肉飯糰", 1, 45], ["舒跑 590ml", 1, 25], ["地瓜", 1, 45], ["FamiCollection 衛生紙", 1, 129], ["咖哩豬排飯", 1, 89], ["霜淇淋", 1, 49]], 1, 3)],
  ["全聯福利中心", "全聯實業股份有限公司", () => sample([["澳洲牛小排 200g", 1, 239], ["高麗菜", 1, 59], ["雞蛋 10入", 1, 89], ["舒潔衛生紙 12包", 1, 299], ["義美鮮奶 1857ml", 1, 165], ["蒜頭", 1, 45], ["黑松沙士 2L", 1, 49], ["台灣鯛魚片", 2, 119], ["洗衣精補充包", 1, 189], ["香蕉", 1, 65], ["板豆腐", 2, 25]], 3, 7)],
  ["統一星巴克", "統一星巴克股份有限公司", () => sample([["那堤 大杯", 1, 140], ["冷萃咖啡 中杯", 1, 135], ["焦糖瑪奇朵 大杯", 1, 160], ["火腿起司可頌", 1, 85], ["燕麥奶那堤 大杯", 1, 155]], 1, 2)],
  ["路易莎咖啡", "路易莎職人咖啡股份有限公司", () => sample([["經典拿鐵 L", 1, 75], ["美式咖啡 L", 1, 55], ["燻雞起司三明治", 1, 85], ["巴斯克乳酪蛋糕", 1, 90]], 1, 2)],
];
function sample(list, min, max) { const n = ri(min, max); const used = new Set(); const items = []; while (items.length < n) { const i = ri(0, list.length - 1); if (used.has(i)) continue; used.add(i); items.push(list[i]); } return items; }

const restaurants = [["鼎泰豐 信義店", 1280, 2860], ["老四川 巴蜀麻辣燙", 980, 1880], ["王品牛排", 2680, 3960], ["瓦城泰國料理", 860, 1620], ["八方雲集", 95, 190], ["麥當勞 南京建國店", 139, 318], ["摩斯漢堡", 125, 290], ["豚骨一燈", 290, 620], ["春水堂", 320, 760], ["築間幸福鍋物", 560, 1340], ["饗食天堂", 1990, 3980], ["屋馬燒肉", 2100, 4200], ["初瓦韓式料理", 760, 1580]];
const online = [["momo購物網", "富邦媒體科技股份有限公司", [["Dyson 濾網替換組", 1, 1890], ["象印保溫瓶 480ml", 1, 990], ["衛生紙箱購 60包", 1, 899], ["Philips 電動牙刷刷頭", 1, 760], ["桂格燕麥片 1.1kg", 2, 219], ["Logitech MX Anywhere 3S", 1, 2490]]],
  ["PChome 24h購物", "網路家庭國際資訊股份有限公司", [["SanDisk 1TB SSD", 1, 2399], ["Anker 65W 充電器", 1, 1290], ["Kingston 32GB USB", 1, 299], ["HDMI 2.1 線材 2m", 1, 459]]],
  ["蝦皮購物", "新加坡商蝦皮娛樂電商有限公司台灣分公司", [["手機殼", 1, 199], ["收納箱 3入", 1, 459], ["瑜珈墊", 1, 590], ["寵物零食", 2, 149]]]];
const transport = [["台灣高鐵", "台灣高速鐵路股份有限公司", [["台北-台中 標準車廂", 1, 700], ["台北-左營 標準車廂", 1, 1490], ["台北-新竹 自由座", 1, 280]]], ["台灣中油", "台灣中油股份有限公司", [["95無鉛汽油", 1, 0]]]];
const pharmacies = [["屈臣氏", "台灣屈臣氏個人用品商店股份有限公司", [["理膚寶水 B5 修復霜", 1, 520], ["舒酸定牙膏", 2, 169], ["曼秀雷敦護唇膏", 1, 129], ["面紙 10包", 1, 99]]], ["康是美", "統一生活事業股份有限公司", [["隱形眼鏡藥水", 1, 299], ["維他命C 發泡錠", 1, 259], ["OK繃", 1, 59]]]];

const days = dates(START, TODAY);
const lastDays = new Set(dates(addDays(TODAY, -3), TODAY));
const cardList = [acct.cube, acct.pi, acct.gogo];
const pendingOf = (d) => lastDays.has(d) && d >= addDays(TODAY, -2);
function cardSpend(card, date, amount, desc, counterparty, h, m) {
  const pending = pendingOf(date);
  const posted = pending ? null : addDays(date, ri(1, 2) > 1 && dow(date) === 5 ? 3 : 1);
  return tx(card, date, -amount, desc, counterparty, { at: tw(date, h, m), posted: posted && posted > TODAY ? TODAY : posted, pending, card: card.last4, cardName: card.name });
}

const salary = (d) => (d >= "2026-07-01" ? 134500 : 128000);
const monthName = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
const statements = { cube: [], pi: [], gogo: [] };
let loanPaid = 34;

for (const d of days) {
  const [y, mo, dd] = d.split("-").map(Number);
  const wd = dow(d);
  // ---- monthly fixed items
  if (dd === 5) { const t = tx(acct.payroll, d, salary(d), `${monthName[mo - 1]}月薪資`, "群星科技股份有限公司", { sourceId: `PAYROLL-${d.slice(0, 7)}` }); }
  if (d === "2026-06-15") tx(acct.payroll, d, 64000, "端午節獎金", "群星科技股份有限公司");
  if (d === "2026-08-14") tx(acct.payroll, d, 96500, "上半年績效獎金", "群星科技股份有限公司");
  if (d === "2026-09-25") tx(acct.payroll, d, 6000, "中秋節禮金", "群星科技股份有限公司");
  if (dd === 6) tx(acct.payroll, d, -26000, "房租轉帳", "林淑芬", { sourceId: `RENT-${d.slice(0, 7)}` });
  if (dd === 7) transfer(acct.payroll, acct.daily, d, 16000, "跨行轉出 生活費", "跨行轉入 生活費");
  if (dd === 8) transfer(acct.payroll, acct.settle, d, d >= "2026-07-01" ? 30000 : 20000, "證券交割款轉出", "交割款轉入");
  if (dd === 15) tx(acct.payroll, d, -3280, "保險費扣款", "國泰人壽");
  if (dd === 20) {
    const interest = Math.round(-acct.loan.bal * 0.0288 / 12);
    tx(acct.payroll, d, -10120, "信用貸款本息自動扣繳", "國泰世華銀行");
    tx(acct.loan, d, 10120 - interest, "本息攤還 本金", "國泰世華銀行");
    loanPaid += 1;
  }
  if (dd === 28 && mo % 2 === 1) tx(acct.daily, d, -ri(1180, 2460), "台灣電力公司 電費代扣", "台灣電力公司");
  if (dd === 22 && mo % 2 === 0) tx(acct.daily, d, -ri(380, 620), "台北自來水事業處 水費代扣", "臺北自來水事業處");
  if (dd === 21 && (mo === 6 || mo === 9)) tx(acct.payroll, d, ri(160, 240), "存款息", "台新銀行");
  if (dd === 21 && mo % 3 === 0) tx(acct.daily, d, ri(18, 41), "利息存入", "玉山銀行");
  if (dd === 20) tx(acct.usd, d, Math.round(acct.usd.bal * 0.012 / 12 * 100) / 100 >= 1 ? Math.round(acct.usd.bal * 0.012 / 12) : 1, "外幣存款利息", "國泰世華銀行");
  if (d === "2026-04-17") { tx(acct.payroll, d, -158000, "跨行轉出 換匯", "國泰世華銀行"); tx(acct.usd, d, 4950, "台幣轉美元 匯率31.92", "國泰世華銀行"); }
  if (["2026-03-10", "2026-06-09"].includes(d)) transfer(acct.payroll, acct.settle, d, d < "2026-04-01" ? 100000 : 80000, "證券交割款轉出", "交割款轉入");
  if (d === "2026-05-20") tx(acct.payroll, d, -300000, "轉存定期存款", "台新銀行");
  if (d === "2026-05-20") acct.td1.bal = 300000;
  if (d === "2026-08-12") { tx(acct.usd, d, -5000, "轉存美元定存 6個月 4.05%", "國泰世華銀行"); acct.usdtd.bal = 5000; }
  if (d === "2026-09-15") { tx(acct.payroll, d, 203200, "定存到期 本息轉入", "台新銀行"); acct.td0.bal = 0; }
  if (d === "2026-03-31") tx(acct.payroll, d, -18600, "綜合所得稅 補繳", "財政部臺北國稅局");
  if (d === "2026-05-31") tx(acct.payroll, d, 21430, "綜合所得稅 退稅", "財政部臺北國稅局");
  if (d === "2026-10-30") tx(acct.payroll, d, -3200, "政治獻金 / 捐款 家扶基金會", "台灣兒童暨家庭扶助基金會");
  if (dd === 10) tx(acct.daily, d, -500, "台灣世界展望會 定期捐款", "台灣世界展望會");
  if (dd === 1) cardSpend(acct.cube, d, 1099, "中華電信 電信費", "中華電信", 3, 12);
  if (dd === 3) cardSpend(acct.gogo, d, 390, "NETFLIX.COM", "Netflix", 9, 30);
  if (dd === 12) cardSpend(acct.gogo, d, 149, "SPOTIFY P2D8C1", "Spotify", 4, 2);
  if (dd === 18) cardSpend(acct.cube, d, Math.round(20 * (RATES.USD + (rnd() - 0.5) * 0.4)) + 9, "OPENAI *CHATGPT SUBSCR 國外交易", "OpenAI", 1, 44);
  if (dd === 23) cardSpend(acct.cube, d, 90, "APPLE.COM/BILL iCloud+", "Apple", 8, 10);
  if (dd === 2) cardSpend(acct.pi, d, 1688, "健身工廠 月費", "健身工廠", 12, 0);
  // ---- daily spending
  const weekend = wd === 0 || wd === 6;
  if (chance(weekend ? 0.45 : 0.75)) { // convenience store / coffee
    const [name, seller, gen] = pick(conv);
    const items = gen(); const h = ri(7, 22);
    const amt = invoice(d, seller, items, { at: tw(d, h, 5) });
    const how = rnd();
    if (how < 0.4) cardSpend(pick([acct.cube, acct.pi]), d, amt, name, name, h, ri(0, 59));
    else if (how < 0.6) tx(acct.daily, d, -amt, `LINE Pay ${name}`, name, { at: tw(d, h, ri(0, 59)) });
    // else cash (manual cash account via API) — invoice only
  }
  if (chance(weekend ? 0.55 : 0.35)) { // eat out
    const [name, lo, hi] = pick(restaurants); const amt = Math.round(ri(lo, hi) / 10) * 10; const h = pick([12, 13, 18, 19, 20]);
    cardSpend(pick(cardList), d, amt, name, name, h, ri(0, 59));
    if (chance(0.6)) invoice(d, `${name.split(" ")[0]}`, [["餐點", 1, amt]], { at: tw(d, h, 30) });
  }
  if (chance(0.22)) { const amt = ri(180, 520); const h = ri(18, 21); cardSpend(acct.cube, d, amt, pick(["UBER *EATS", "foodpanda 外送"]), "外送平台", h, ri(0, 59)); invoice(d, chance(0.5) ? "優食台灣股份有限公司" : "富胖達股份有限公司", [["外送餐點", 1, amt - 39], ["外送費", 1, 39]], { at: tw(d, h, 50) }); }
  if (wd === 6 && chance(0.85)) { const [, , gen] = conv[2]; const items = gen(); const amt = invoice(d, "全聯實業股份有限公司", items, { at: tw(d, 16, 20) }); cardSpend(acct.pi, d, amt, "全聯福利中心", "全聯福利中心", 16, 22); }
  if (chance(0.06)) { const [name, seller, list] = pick(online); const items = sample(list, 1, 2); const amt = invoice(d, seller, items, { at: tw(d, 22, 10) }); cardSpend(acct.gogo, d, amt, name, name, 22, ri(0, 59)); }
  if (chance(0.07)) { const [name, seller, list] = pick(pharmacies); const items = sample(list, 1, 3); const amt = invoice(d, seller, items, { at: tw(d, 19, 40) }); cardSpend(acct.pi, d, amt, name, name, 19, 41); }
  if (chance(0.09)) { const amt = ri(85, 420); cardSpend(acct.cube, d, amt, pick(["UBER TRIP", "台灣大車隊 55688"]), "叫車", ri(8, 23), ri(0, 59)); }
  if (dd % 9 === 0) tx(acct.daily, d, -500, "悠遊卡自動加值", "悠遊卡股份有限公司", { at: tw(d, 8, 31) });
  if (chance(0.05)) { const [name, seller, list] = transport[0]; const item = pick(list); const amt = invoice(d, seller, [item]); cardSpend(acct.cube, d, amt, name, name, 9, 12); }
  if (wd === 0 && chance(0.4)) { const amt = ri(980, 1650); invoice(d, "台灣中油股份有限公司", [["95無鉛汽油", 1, amt]]); cardSpend(acct.gogo, d, amt, "台灣中油 直營站", "台灣中油", 11, 5); }
  if (dd === 27 && chance(0.5)) { const amt = ri(2400, 6800); invoice(d, "好市多股份有限公司", [["Kirkland 綜合堅果 1.13kg", 1, 489], ["牛肋條 2kg", 1, amt - 1189], ["Kirkland 衛生紙 30捲", 1, 700]]); cardSpend(acct.gogo, d, amt, "COSTCO 好市多 內湖店", "好市多", 15, 0); }
  if (chance(0.03)) { const amt = ri(420, 980); cardSpend(acct.gogo, d, amt, "威秀影城 信義", "威秀影城", 20, 10); }
  if (dd === 25 && chance(0.5)) { tx(acct.daily, d, -3000, "ATM 提款", "玉山銀行 ATM", { at: tw(d, 18, 12) }); }
  // ---- one-off larger events
  if (d === "2026-03-14") cardSpend(acct.cube, d, 42900, "Apple Store 信義A13 iPhone 17", "Apple Store", 15, 20);
  if (d === "2026-04-03") cardSpend(acct.gogo, d, 18600, "雄獅旅遊 清明連假花東三日", "雄獅旅遊", 10, 0);
  if (d === "2026-05-09") { cardSpend(acct.cube, d, 3200, "台大醫院 自費門診", "國立臺灣大學醫學院附設醫院", 10, 20); }
  if (d === "2026-05-22") cardSpend(acct.pi, d, 12800, "敦南牙醫診所 植牙前置療程", "敦南牙醫診所", 15, 0);
  if (d === "2026-07-11") cardSpend(acct.gogo, d, 8960, "台南晶英酒店", "台南晶英酒店", 21, 30);
  if (d === "2026-08-02") cardSpend(acct.cube, d, 24680, "IKEA 宜家家居 新店店", "IKEA", 14, 0);
  if (d === "2026-09-05") cardSpend(acct.cube, d, 38420, "長榮航空 TPE-NRT 來回", "長榮航空", 23, 5);
  if (d >= "2026-10-02" && d <= "2026-10-07") { for (let k = 0; k < ri(2, 4); k++) cardSpend(acct.cube, d, Math.round(ri(800, 16000) * RATES.JPY * 1.015), pick(["LAWSON TOKYO 國外交易", "UNIQLO GINZA 國外交易", "ICHIRAN SHIBUYA 國外交易", "BIC CAMERA 國外交易", "SUICA MOBILE 國外交易", "DON QUIJOTE 國外交易", "TOKYU HANDS 國外交易"]), "日本 國外交易", ri(10, 21), ri(0, 59)); }
  if (d === "2026-10-08") cardSpend(acct.cube, d, 1480, "國外交易服務費", "國泰世華銀行", 0, 5);
  if (d === "2026-11-08") cardSpend(acct.pi, d, 15900, "Dyson 台灣官網 V12", "Dyson", 21, 3);
  if (d === "2026-06-02") tx(acct.payroll, d, -28800, "汽機車燃料使用費 / 牌照稅", "臺北市稅捐稽徵處");
  if (d === "2026-09-22") tx(acct.payroll, d, -12000, "跨行轉帳 爸媽孝親費", "陳美華");
  if (dd === 16 && mo % 2 === 0) tx(acct.payroll, d, -6000, "跨行轉帳 孝親費", "陳美華");
  // ---- refunds and rewards
  if (d === "2026-08-09") cardSpend(acct.cube, d, -2490, "IKEA 宜家家居 退貨", "IKEA", 13, 10);
  if (dd === 19) tx(acct.cube, d, Math.round(ri(220, 680)), "CUBE 小樹點回饋 消費折抵", "國泰世華銀行", { card: "4521", cardName: "CUBE 卡" });
  if (dd === 4) tx(acct.pi, d, Math.round(ri(60, 210)), "P幣 消費回饋", "玉山銀行", { card: "7766", cardName: "玉山 Pi 拍錢包信用卡" });
  // ---- credit card statement / autopay
  for (const key of ["cube", "pi", "gogo"]) {
    const card = acct[key];
    if (dd === card.close) {
      const owed = -card.bal;
      const due = addDays(d, 15);
      statements[key].push({ period: d.slice(0, 7), closing: d, due, amount: Math.max(0, Math.round(owed)), paid: false });
    }
    for (const st of statements[key]) {
      if (!st.paid && st.due === d && st.amount > 0) {
        const payer = acct[card.autopay];
        const o = tx(payer, d, -st.amount, `信用卡款自動扣繳 ${card.inst}`, card.inst);
        const i = tx(card, d, st.amount, "自扣已入帳 謝謝", card.inst, { card: card.last4, cardName: card.name });
        o.transfer_peer_id = i.id; i.transfer_peer_id = o.id;
        st.paid = true;
      }
    }
  }
  // ---- daily snapshot of all balances (synced every morning)
  snapshot(d);
}


function snapshot(d) { snapList.push({ d, td: { td1: acct.td1.bal, td0: acct.td0.bal, usdtd: acct.usdtd.bal } }); }
function writeSnapshot(d, tdv, balOf) {
  for (const [key, a] of Object.entries(acct)) {
    if (a === acct.td1 && d < "2026-05-20") continue;
    if (a === acct.usdtd && d < "2026-08-12") continue;
    if (a === acct.td0 && d > "2026-09-15") continue;
    const s = { id: `${a.id}:${d}`, connector_id: a.connector, account_id: a.id, source_id: `${a.source}:${d}T06:00:00`, balance: Math.round(balOf(key)), available_balance: a.type === "credit" ? Math.round(a.limit + balOf(key)) : a.type === "loan" ? null : Math.round(balOf(key)), currency: a.cur, as_of_at: `${addDays(d, 0)}T22:05:00.000Z`, raw_payload: "{}", created_at: iso(d, 22, 5), updated_at: iso(d, 22, 5), statement_balance: null, payment_due_date: null, no_payment_needed: null, statement_closing_date: null, loan_payment_amount: null, loan_payment_status: null, loan_installments_paid: null, loan_installments_total: null };
    // as_of_at: morning sync Taipei = previous-day 22:05Z; keep date stable by using d
    s.as_of_at = `${d}T22:05:00.000Z`;
    if (a.type === "credit") {
      const last = statements[key].at(-1);
      if (last) { s.statement_balance = last.amount; s.payment_due_date = last.due; s.statement_closing_date = last.closing; s.no_payment_needed = last.amount === 0 ? 1 : 0; }
    }
    if (a.type === "loan") { s.loan_payment_amount = 10120; s.loan_payment_status = "scheduled"; s.loan_installments_paid = loanPaid; s.loan_installments_total = 84; const [yy, mm] = d.split("-").map(Number); s.payment_due_date = Number(d.slice(8)) < 20 ? `${d.slice(0, 7)}-20` : `${mm === 12 ? yy + 1 : yy}-${String(mm === 12 ? 1 : mm + 1).padStart(2, "0")}-20`; }
    add("bank_balance_snapshots", s);
  }
  depositHistory.push({ date: d, value: Object.values(acct).filter((a) => !["credit", "loan"].includes(a.type) && !(a === acct.td1 && d < "2026-05-20") && !(a === acct.usdtd && d < "2026-08-12") && !(a === acct.td0 && d > "2026-09-15")).reduce((s, a) => { const k = Object.keys(acct).find((x) => acct[x] === a); return s + (a.cur === "TWD" ? balOf(k) : balOf(k) * RATES[a.cur]); }, 0) });
}

// ---------------------------------------------------------------- investments (TDCC)
const sec = [
  { sym: "2330", name: "台積電", type: "stock", p0: 968, p1: 1235, vol: 0.016, qty: 400 },
  { sym: "2454", name: "聯發科", type: "stock", p0: 1385, p1: 1460, vol: 0.02, qty: 0 },
  { sym: "2412", name: "中華電", type: "stock", p0: 129.5, p1: 133, vol: 0.004, qty: 3000 },
  { sym: "2881", name: "富邦金", type: "stock", p0: 84.6, p1: 92.3, vol: 0.012, qty: 4000 },
  { sym: "0050", name: "元大台灣50", type: "etf", p0: 55.8, p1: 67.45, vol: 0.011, qty: 6000 },
  { sym: "006208", name: "富邦台50", type: "etf", p0: 112.4, p1: 135.6, vol: 0.011, qty: 1500 },
  { sym: "00878", name: "國泰永續高股息", type: "etf", p0: 21.62, p1: 22.48, vol: 0.006, qty: 12000 },
  { sym: "00679B", name: "元大美債20年", type: "etf", p0: 28.9, p1: 27.75, vol: 0.006, qty: 3000 },
];
const funds = [
  { sym: "FUND-ALZ-TWTECH", name: "安聯台灣科技基金", p0: 312.5, p1: 361.8, vol: 0.012, qty: 1342.88 },
  { sym: "FUND-JPM-USTECH", name: "摩根美國科技基金 (新台幣)", p0: 48.2, p1: 55.6, vol: 0.013, qty: 3105.4 },
  { sym: "FUND-AB-GHY", name: "聯博全球高收益債券基金 AT 月配", p0: 13.82, p1: 13.95, vol: 0.002, qty: 9800.5 },
];
const N = days.length;
for (const s of [...sec, ...funds]) {
  s.prices = []; let noise = 0;
  for (let i = 0; i < N; i++) { noise = noise * 0.92 + (rnd() - 0.5) * s.vol * 2; const base = s.p0 + (s.p1 - s.p0) * (i / (N - 1)) + Math.sin(i / 17) * s.p0 * 0.03 * (i < N - 5 ? 1 : 0); s.prices.push(Math.max(0.01, +(base * (1 + noise * (i < N - 1 ? 1 : 0))).toFixed(s.p0 > 100 ? 1 : 2))); }
  s.prices[N - 1] = s.p1; s.qtyByDay = [];
}
const bySym = Object.fromEntries([...sec, ...funds].map((s) => [s.sym, s]));
const dayIdx = Object.fromEntries(days.map((d, i) => [d, i]));
const trades = [];
const broker = { account_id: "tdcc:broker:9200-004455", broker_no: "9200", broker_account: "004455", broker_name: "元大證券" };
function trade(date, sym, code, nameTx, qty, extra = {}) {
  const s = bySym[sym]; const price = extra.price ?? s.prices[dayIdx[date]];
  let amount = extra.amount ?? Math.round(qty * price);
  const fee = Math.max(20, Math.round(amount * 0.001425 * 0.6));
  if (code === "B" || code === "SUB") amount = -(amount + fee);
  if (code === "S" || code === "RED") amount = amount - fee - Math.round(amount * (s.type === "etf" ? 0.001 : code === "RED" ? 0 : 0.003));
  if (code === "B" || code === "SUB") s.qty += qty; if (code === "S" || code === "RED") s.qty -= qty;
  const posted = code === "D" ? date : addDays(date, 2);
  trades.push({ id: `tdcc:${broker.account_id}:${sym}-${date}-${code}-${trades.length}`, connector_id: "tdcc", ...broker, source_id: `${sym}-${date}-${code}-${trades.length}`, symbol: sym.startsWith("FUND") ? null : sym, name: s.name, asset_type: s.type ?? "fund", trade_date: date, posted_date: posted > TODAY ? TODAY : posted, transaction_code: code, transaction_name: nameTx, quantity: qty ?? null, price: code === "D" ? null : price, amount, currency: "TWD", raw_payload: "{}", created_at: iso(posted > TODAY ? TODAY : posted, 22, 30), updated_at: iso(posted > TODAY ? TODAY : posted, 22, 30), realized_pnl: extra.pnl ?? null });
  return amount;
}
// replay with holdings snapshot per day
const plan = {};
const at = (d, fn) => (plan[d] ??= []).push(fn);
for (const d of days) if (d.endsWith("-06")) { at(d, () => trade(d, "0050", "B", "定期定額買進", Math.floor(10000 / bySym["0050"].prices[dayIdx[d]]))); at(d, () => trade(d, "006208", "B", "定期定額買進", Math.floor(5000 / bySym["006208"].prices[dayIdx[d]]))); }
for (const d of days) if (d.endsWith("-16")) at(d, () => trade(d, "FUND-JPM-USTECH", "SUB", "定期定額申購", +(5000 / bySym["FUND-JPM-USTECH"].prices[dayIdx[d]]).toFixed(2)));
at("2026-03-12", () => trade("2026-03-12", "2330", "B", "現股買進", 100));
at("2026-04-09", () => trade("2026-04-09", "2454", "B", "現股買進", 50));
at("2026-04-22", () => trade("2026-04-22", "00878", "B", "零股買進", 3000));
at("2026-05-14", () => trade("2026-05-14", "2881", "S", "現股賣出", 1000, { pnl: 7820 }));
at("2026-06-11", () => trade("2026-06-11", "2330", "B", "現股買進", 100));
at("2026-07-02", () => trade("2026-07-02", "00679B", "B", "現股買進", 2000));
at("2026-07-23", () => trade("2026-07-23", "2454", "S", "現股賣出", 50, { pnl: -3150 }));
at("2026-08-19", () => trade("2026-08-19", "FUND-ALZ-TWTECH", "RED", "部分買回", 200, { pnl: 9640 }));
at("2026-09-03", () => trade("2026-09-03", "2412", "B", "現股買進", 1000));
at("2026-10-15", () => trade("2026-10-15", "2330", "S", "零股賣出", 50, { pnl: 11380 }));
at("2026-11-11", () => trade("2026-11-11", "00878", "B", "零股買進", 2000));
const divs = [["2026-04-10", "2330", 4.5], ["2026-07-09", "2330", 5.0], ["2026-10-08", "2330", 5.0], ["2026-05-19", "00878", 0.47], ["2026-08-18", "00878", 0.4], ["2026-11-17", "00878", 0.4], ["2026-07-21", "2412", 4.94], ["2026-07-17", "0050", 0.98], ["2026-08-08", "2881", 4.25], ["2026-04-20", "00679B", 0.34], ["2026-07-20", "00679B", 0.34], ["2026-10-20", "00679B", 0.34]];
for (const [d, sym, per] of divs) at(d, () => { const s = bySym[sym]; const amt = Math.round(s.qty * per); trade(d, sym, "D", sym === "00878" || sym === "00679B" || sym === "0050" ? "收益分配" : "現金股利", null, { amount: amt }); tx(acct.settle, d, amt, `${s.name} ${sym.length === 4 && !sym.startsWith("00") ? "現金股利" : "收益分配"}`, s.name); });
for (const d of days) if (d.endsWith("-10")) at(d, () => trade(d, "FUND-AB-GHY", "D", "配息", null, { amount: Math.round(bySym["FUND-AB-GHY"].qty * 0.0715) }));

// re-run positions per day (trades mutate qty); bank settle cash already handled loosely
const stockHist = [], fundHist = [], posRows = [];
for (const s of [...sec, ...funds]) s.qty = s.qty; // initial
for (const d of days) {
  for (const fn of plan[d] ?? []) fn();
  const i = dayIdx[d];
  let stock = 0, fund = 0;
  for (const s of sec) stock += s.qty * s.prices[i];
  for (const f of funds) fund += f.qty * f.prices[i];
  stockHist.push({ date: d, value: Math.round(stock) }); fundHist.push({ date: d, value: Math.round(fund) });
  const isSnap = d === TODAY || d.endsWith("-28") || d >= addDays(TODAY, -6);
  if (isSnap) for (const s of [...sec, ...funds]) { if (s.qty <= 0) continue; add("investment_positions", { id: `tdcc:${s.sym}:${d}`, connector_id: "tdcc", source_id: s.sym, asset_type: s.type ?? "fund", symbol: s.sym.startsWith("FUND") ? null : s.sym, name: s.name, broker_no: s.type ? "9200" : null, broker_account: s.type ? "004455" : null, market: s.type ? "TWSE" : null, quantity: +s.qty.toFixed(2), market_value: Math.round(s.qty * s.prices[i]), cash_balance: null, cost_basis: null, unrealized_pnl: null, currency: "TWD", as_of_date: d, raw_payload: "{}", created_at: iso(d, 22, 20), updated_at: iso(d, 22, 20) }); }
}
// broker settlement debits for buys (bank side)
for (const t of trades) if (t.amount < 0 && t.transaction_code === "B") tx(acct.settle, t.posted_date, t.amount, `${t.name} 交割款扣款`, "元大證券");
for (const t of trades) if (t.amount > 0 && t.transaction_code === "S") tx(acct.settle, t.posted_date, t.amount, `${t.name} 交割款入帳`, "元大證券");
for (const t of trades) if (t.transaction_code === "SUB") tx(acct.payroll, t.trade_date, t.amount, `基金申購扣款 ${t.name}`, "元大證券投信");
for (const t of trades) add("investment_transactions", t);

{
  const delta = {};
  for (const t of txs) { const k = Object.keys(acct).find((x) => acct[x].id === t.account_id); ((delta[k] ??= {})[t._date] ??= 0); delta[k][t._date] += t.amount; }
  const run = Object.fromEntries(Object.keys(acct).map((k) => [k, acct[k].init]));
  const mins = {};
  for (const { d, td } of snapList) {
    for (const k of Object.keys(acct)) { run[k] += delta[k]?.[d] ?? 0; if (!(k in mins) || run[k] < mins[k]) mins[k] = run[k]; }
    writeSnapshot(d, td, (k) => (k in td ? td[k] : run[k]));
  }
  process.stderr.write("min balances " + JSON.stringify(mins) + "\nfinal " + JSON.stringify(run) + "\n");
}
// ---------------------------------------------------------------- write SQL
const sql = [];
sql.push("PRAGMA defer_foreign_keys = true;");
for (const t of ["classification_overrides", "bank_transaction_preferences", "invoice_transaction_preferences", "ai_classifications", "invoice_line_items", "invoices", "investment_transactions", "investment_positions", "credit_card_bills", "bank_transactions", "bank_balance_snapshots", "bank_account_payment_accounts", "bank_accounts", "net_worth_history", "manual_assets", "exchange_rates", "connector_settings", "scheduled_sync_batch_results", "scheduled_sync_batches", "sync_activity_changes", "sync_activity_details", "sync_activity_runs", "manual_sync_runs"]) sql.push(`DELETE FROM ${t};`);

// transactions (strip helper fields)
txs.sort((a, b) => a._date.localeCompare(b._date));
for (const t of txs) { const { _date, ...rest } = t; add("bank_transactions", rest); }

// credit card bills
for (const key of ["cube", "pi", "gogo"]) for (const st of statements[key]) {
  const card = acct[key];
  add("credit_card_bills", { id: `${card.connector}:${card.id}:bill:${st.period}`, connector_id: card.connector, account_id: card.id, source_id: `${card.source}:bill:${st.period}`, billing_period: st.period, statement_amount: st.amount, minimum_payment: Math.max(0, Math.min(st.amount, Math.round(st.amount * 0.1 / 10) * 10 || 0)), paid_amount: st.paid ? st.amount : 0, is_paid: st.paid ? 1 : 0, payment_due_date: st.due, statement_closing_date: st.closing, currency: "TWD", raw_payload: "{}", created_at: iso(st.closing, 22, 5), updated_at: NOW });
}

// invoices
invoices.forEach((v, n) => {
  const sourceId = `${v.num}-${v.date.replace(/-/g, "")}`;
  const id = `einvoice:${sourceId}`;
  add("invoices", { id, connector_id: "einvoice", source_id: sourceId, invoice_number: v.num, invoice_date: v.date, seller_name: v.seller, amount: v.total, raw_payload: JSON.stringify({ invoiceTime: v.at ? new Date(new Date(v.at).getTime() + 8 * 3600e3).toISOString().slice(11, 19) : null, cardType: "3J0002", cardNo: "/K7Q2MPL" }), created_at: iso(addDays(v.date, 2), 21, 0), updated_at: iso(addDays(v.date, 2), 21, 0), excluded_from_calculation: v.excluded });
  v.items.forEach(([desc, qty, price], k) => add("invoice_line_items", { id: `${id}:${k + 1}`, invoice_id: id, connector_id: "einvoice", invoice_source_id: sourceId, source_id: String(k + 1), line_number: k + 1, description: desc, quantity: qty, unit_price: price, amount: qty * price, raw_payload: "{}", created_at: iso(addDays(v.date, 2), 21, 0), updated_at: iso(addDays(v.date, 2), 21, 0) }));
});

// exchange rates
for (const [c, r] of Object.entries(RATES)) add("exchange_rates", { currency: c, rate_to_twd: r, updated_at: "2026-11-17T00:02:31.000Z" });

// manual assets + monthly valuation history
const manual = [
  { id: "manual-home-xinyi", name: "新莊預售屋 已繳工程款", category: "real_estate", note: "2025/08 簽約，總價 1,688 萬；這裡只記已繳的訂金、簽約金與工程期款，交屋後再改成市價估值。", currency: "TWD", series: (i) => 1180000 + Math.floor(i / 30) * 42000 },
  { id: "manual-policy-usd", name: "富邦美元利率變動型終身壽險 保單價值", category: "insurance", note: "每年 3/15 繳 USD 2,400，宣告利率 4.1%。每季看 App 更新一次", currency: "USD", series: (i) => (i < 15 ? 11820 : 14360) + Math.floor(i / 90) * 140 },
  { id: "manual-scooter", name: "Gogoro SuperSport", category: "vehicle", note: "2024 年購入，以二手行情估值", currency: "TWD", series: (i) => 52000 - Math.floor(i / 30) * 900 },
  { id: "manual-labor-pension", name: "勞退個人專戶（自提 6%）", category: "other", note: "", currency: "TWD", series: (i) => 486200 + Math.floor(i / 30) * 16420 },
  { id: "manual-jpy-cash", name: "日圓現鈔", category: "other", note: "上次去東京剩下的，放在抽屜", currency: "JPY", series: (i) => (i < dayIdx["2026-10-08"] ? 85000 : 23000) },
];
const nw = [];
for (const m of manual) {
  add("manual_assets", { id: m.id, name: m.name, category: m.category, note: m.note || null, created_at: iso(START, 3, 0), currency: m.currency });
  days.forEach((d, i) => { if (i % 7 === 0 || d === TODAY || (m.id === "manual-jpy-cash" && d === "2026-10-08")) nw.push({ id: `manual:manual:${m.id}:${d}`, date: d, net_worth: m.series(i), asset_type: m.id, source: "manual", snapshotted_at: iso(d, 12, 0) }); });
}
for (const h of depositHistory) nw.push({ id: `bank:deposit:${h.date}`, date: h.date, net_worth: Math.round(h.value), asset_type: "deposit", source: "bank", snapshotted_at: iso(h.date, 22, 10) });
for (const h of stockHist) nw.push({ id: `tdcc:stock:${h.date}`, date: h.date, net_worth: h.value, asset_type: "stock", source: "tdcc", snapshotted_at: iso(h.date, 22, 25) });
for (const h of fundHist) nw.push({ id: `tdcc:fund:${h.date}`, date: h.date, net_worth: h.value, asset_type: "fund", source: "tdcc", snapshotted_at: iso(h.date, 22, 25) });
for (const r of nw) add("net_worth_history", r);

// user overrides, notes & exclusions on a handful of transactions
const find = (re) => txs.filter((t) => re.test(t.description ?? ""));
const notes = [
  [/Apple Store 信義A13/, "舊手機拿去 Apple Trade In 折了 9,800，折抵會另外退回"],
  [/長榮航空/, "十月東京自由行 2 人，含行李。公司旅遊補助 15,000 之後會跟薪水一起入帳"],
  [/IKEA 宜家家居 新店店/, "書桌 + 層架 + 收納盒"],
  [/敦南牙醫診所/, "植牙前置，之後還有兩期，總共約 6 萬"],
  [/爸媽孝親費/, "爸生日多給"],
  [/雄獅旅遊/, "花東三日 跟大學同學分攤，已收回 3 人份 13,950（LINE Pay）"],
];
for (const [re, note] of notes) for (const t of find(re).slice(0, 1)) add("bank_transaction_preferences", { transaction_id: t.id, excluded_from_calculation: null, created_at: iso(t._date, 23, 0), updated_at: iso(t._date, 23, 0), note });
for (const t of find(/證券交割款轉出/).slice(-3)) add("bank_transaction_preferences", { transaction_id: t.id, excluded_from_calculation: 1, created_at: iso(t._date, 23, 0), updated_at: iso(t._date, 23, 0), note: null });
const ov = [[/台南晶英酒店/, "entertainment"], [/雄獅旅遊/, "entertainment"], [/Dyson 台灣官網/, "shopping"], [/台大醫院/, "health"], [/健身工廠/, "health"], [/汽機車燃料使用費/, "tax"], [/孝親費/, "transfer"]];
for (const [re, cat] of ov) for (const t of find(re)) add("classification_overrides", { id: `override:bank_transaction:${t.id}`, target_type: "bank_transaction", target_id: t.id, category_id: cat, created_at: iso(t._date, 23, 5), updated_at: iso(t._date, 23, 5) });

// sync job state: configured connectors ran this morning; e-invoice needs captcha; one failure
const jobUpd = [
  ["taishin", "success", null, null], ["esun", "success", null, null], ["cathaybk", "needs_user_action", "CATHAY_SMS_OTP_REQUIRED", "國泰世華要求簡訊 OTP 驗證，請到資料來源輸入驗證碼後重新同步。"], ["tdcc", "success", null, null], ["einvoice", "success", null, null],
];
const post = [];
for (const [c, status, code, err] of jobUpd) post.push(`UPDATE sync_jobs SET enabled = 1, last_run_at = '2026-11-16T22:0${jobUpd.findIndex((j) => j[0] === c)}:12.000Z', last_success_at = ${status === "success" ? `'2026-11-16T22:0${jobUpd.findIndex((j) => j[0] === c)}:48.000Z'` : "'2026-11-14T22:03:40.000Z'"}, last_status = '${status}', last_error_code = ${q(code)}, last_error = ${q(err)}, next_run_at = '2026-11-17T22:00:00.000Z', updated_at = '${NOW}' WHERE connector_id = '${c}';`);
post.push(`UPDATE sync_jobs SET enabled = 0, next_run_at = '2026-11-17T22:00:00.000Z' WHERE connector_id NOT IN (${jobUpd.map(([c]) => q(c)).join(",")});`);

for (const [table, { cols, values }] of Object.entries(rows)) {
  for (let i = 0; i < values.length; i += 50) sql.push(`INSERT INTO ${table} (${cols.join(", ")}) VALUES\n${values.slice(i, i + 50).map((v) => `(${v.join(", ")})`).join(",\n")};`);
}

(await import("node:fs")).writeFileSync(new URL("./post.sql", import.meta.url), post.join("\n") + "\n");
process.stdout.write(sql.join("\n") + "\n");
process.stderr.write(Object.entries(rows).map(([t, r]) => `${t}: ${r.values.length}`).join("\n") + "\n");
