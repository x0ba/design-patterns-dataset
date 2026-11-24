// Deterministic mock-data generator for Flipledger.
// Produces src/data/items.json: 612 items, Oct 2023 -> Nov 2026, tuned to the
// totals in the brief (revenue 41,380 / COGS 12,950 / fees+shipping 6,210 /
// 1,140 hours / 488 sold / 97 listed / 27 kept-or-written-off).
//
// Sales are simulated day by day: each listing has a daily sale hazard that
// falls as the asking price rises above the item's fair value, so Gus's
// price cuts after 30 days genuinely change the odds -- by how much is for
// the app to measure, not for this script to assert.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data/items.json');

// ---------- targets ----------
const TARGET = { items: 612, sold: 488, listed: 97, retired: 27, revenue: 41380, cogs: 12950, feesShip: 6210, hours: 1140 };
const CAT_COUNTS = { slr: 214, pns: 171, mf: 58, lens: 139, acc: 30 };

// ---------- date helpers (days since 1970-01-01, UTC) ----------
const dayOf = (iso) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 86400000);
const isoOf = (d) => new Date(d * 86400000).toISOString().slice(0, 10);
const dow = (d) => (d + 4) % 7; // 0 = Sunday
const monthOf = (d) => new Date(d * 86400000).getUTCMonth();
const TODAY = dayOf('2026-11-17');
const START = dayOf('2023-10-07');
const LAST_ACQ = dayOf('2026-11-15');

// ---------- seeded RNG ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(4172026);
const U = (a, b) => a + (b - a) * rnd();
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const logn = (s) => Math.exp(s * gauss() - (s * s) / 2);
const chance = (p) => rnd() < p;
const wpick = (arr, wf = (x) => x[2]) => {
  const tot = arr.reduce((s, x) => s + wf(x), 0);
  let r = rnd() * tot;
  for (const x of arr) { r -= wf(x); if (r <= 0) return x; }
  return arr[arr.length - 1];
};
const wchoose = (obj) => {
  const e = Object.entries(obj);
  return wpick(e, (x) => x[1])[0];
};
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const r2 = (x) => Math.round(x * 100) / 100;

// ---------- catalog: [brand, model, weight, fair resale $, extra hours] ----------
const CATALOG = {
  slr: [
    ['Pentax', 'K1000', 10, 135, 0.0], ['Pentax', 'ME Super', 6, 85, 0.3], ['Pentax', 'Spotmatic F', 4, 110, 0.6],
    ['Canon', 'AE-1', 12, 120, 0.8], ['Canon', 'AE-1 Program', 10, 140, 0.8], ['Canon', 'A-1', 7, 150, 0.6],
    ['Canon', 'FTb', 4, 85, 0.5], ['Canon', 'T70', 5, 55, 0.2],
    ['Nikon', 'FM', 5, 230, 0.2], ['Nikon', 'FE', 5, 210, 0.3], ['Nikon', 'FG', 4, 110, 0.2], ['Nikon', 'EM', 4, 90, 0.1],
    ['Nikon', 'Nikkormat FT2', 4, 100, 0.4],
    ['Minolta', 'X-700', 9, 100, 0.5], ['Minolta', 'SRT 101', 6, 85, 0.6], ['Minolta', 'XG-M', 4, 55, 0.3],
    ['Olympus', 'OM-1', 6, 130, 0.7], ['Olympus', 'OM-10', 6, 70, 0.3], ['Olympus', 'OM-2n', 3, 165, 0.6],
    ['Yashica', 'FX-3 Super 2000', 5, 70, 0.1], ['Yashica', 'TL Electro X', 3, 60, 0.2],
    ['Ricoh', 'KR-5 Super II', 4, 55, 0.0], ['Praktica', 'MTL5B', 5, 65, 0.3], ['Zenit', 'E', 6, 40, 0.1],
    ['Fujica', 'ST705', 3, 75, 0.3], ['Konica', 'Autoreflex T3', 3, 90, 0.4], ['Chinon', 'CE-4', 3, 45, 0.1],
    ['Mamiya', 'Sekor 500 DTL', 2, 70, 0.5], ['Contax', '139 Quartz', 2, 190, 0.3], ['Miranda', 'Sensorex', 2, 60, 0.3],
  ],
  pns: [
    ['Olympus', 'Stylus Epic', 5, 190, -0.5], ['Olympus', 'Stylus (mju-I)', 4, 90, -0.4], ['Olympus', 'Trip 35', 6, 85, -0.2],
    ['Yashica', 'T4', 2, 330, -0.5], ['Canon', 'Sure Shot Supreme', 4, 70, -0.3], ['Canon', 'Sure Shot Max', 6, 40, 0.0],
    ['Canon', 'Sure Shot Owl', 3, 140, -0.3], ['Minolta', 'Freedom Zoom 90', 6, 30, 0.2],
    ['Pentax', 'Espio 140', 5, 55, 0.0], ['Pentax', 'IQZoom 928', 5, 25, 0.3],
    ['Nikon', 'L35AF', 4, 85, -0.2], ['Nikon', 'One Touch', 6, 30, 0.1],
    ['Konica', 'Big Mini', 2, 180, -0.4], ['Konica', 'Pop', 6, 25, 0.3],
    ['Fujifilm', 'DL-200', 5, 30, 0.2], ['Fujifilm', 'Discovery 90', 6, 20, 0.3],
    ['Kodak', 'KB10', 7, 15, 0.4], ['Kodak', 'Star 235', 8, 12, 0.4], ['Kodak', 'Advantix C750', 6, 10, 0.3],
    ['Vivitar', 'PN2011', 5, 14, 0.3], ['Samsung', 'Maxima Zoom 105', 4, 22, 0.2], ['Ricoh', 'YF-20', 4, 25, 0.1],
    ['Polaroid', 'OneStep 600', 6, 38, 0.2], ['Minox', '35 GT', 1, 140, -0.2],
  ],
  mf: [
    ['Mamiya', 'C220', 4, 280, 0.0], ['Mamiya', 'C330', 3, 380, 0.2], ['Mamiya', 'RB67 Pro S', 5, 420, 0.4],
    ['Mamiya', 'M645 1000S', 5, 330, 0.3], ['Mamiya', '645 Super', 2, 520, 0.2],
    ['Yashica', 'Yashica-D', 3, 230, 0.2], ['Yashica', 'Mat 124G', 4, 350, 0.3], ['Rollei', 'Rolleicord Vb', 3, 320, 0.4],
    ['Rollei', 'Rolleiflex 2.8 Automat', 1, 520, 0.6],
    ['Bronica', 'S2A', 2, 400, 0.7], ['Bronica', 'ETRS', 3, 330, 0.3], ['Bronica', 'SQ-A', 2, 480, 0.2],
    ['Pentacon', 'Six TL', 4, 260, 0.6], ['Kiev', '60', 3, 190, 0.7], ['Kiev', '88', 2, 210, 0.7],
    ['Holga', '120N', 3, 45, -2.2], ['Kodak', 'Brownie Hawkeye', 3, 35, -1.8], ['Kodak', 'Duaflex II', 2, 28, -1.6],
    ['Agfa', 'Isolette', 3, 110, -0.6], ['Zeiss Ikon', 'Nettar 515/2', 3, 130, -0.4], ['Voigtländer', 'Bessa I', 2, 165, -0.2],
    ['Kodak', 'Monitor Six-20', 2, 60, -1.0],
  ],
  lens: [
    ['Soviet', 'Helios 44-2 58mm f/2', 10, 55, -0.2], ['Soviet', 'Jupiter-9 85mm f/2', 3, 160, 0.3], ['Soviet', 'Jupiter-37A 135mm f/3.5', 3, 70, 0.1],
    ['Soviet', 'Industar-61 L/Z 50mm f/2.8', 3, 60, -0.1], ['Soviet', 'Mir-1B 37mm f/2.8', 2, 120, 0.1], ['Soviet', 'Zenitar 16mm f/2.8 fisheye', 2, 150, 0.0],
    ['Pentax', 'SMC Takumar 55mm f/1.8', 5, 75, 0.0], ['Pentax', 'Super-Takumar 50mm f/1.4', 3, 130, 0.4], ['Pentax', 'SMC Pentax-M 50mm f/1.7', 6, 70, -0.1],
    ['Pentax', 'SMC Pentax-A 28mm f/2.8', 2, 140, 0.0],
    ['Minolta', 'MD Rokkor-X 50mm f/1.7', 7, 55, -0.1], ['Minolta', 'MD 35-70mm f/3.5', 4, 45, 0.3], ['Minolta', 'MC Rokkor-PF 58mm f/1.4', 2, 120, 0.2],
    ['Canon', 'FD 50mm f/1.8', 8, 60, -0.1], ['Canon', 'FD 28mm f/2.8', 4, 70, 0.0], ['Canon', 'FD 135mm f/3.5', 5, 50, 0.1],
    ['Canon', 'FD 50mm f/1.4', 3, 140, 0.0], ['Canon', 'New FD 35-105mm f/3.5', 2, 80, 0.4],
    ['Nikon', 'Nikkor 50mm f/1.8 Series E', 6, 70, -0.2], ['Nikon', 'Nikkor-H 50mm f/2', 3, 60, 0.1], ['Nikon', 'Nikkor 28mm f/3.5 AI', 3, 110, 0.1],
    ['Nikon', 'Nikkor 105mm f/2.5 AI', 1, 300, 0.2],
    ['Olympus', 'Zuiko 50mm f/1.8', 5, 70, -0.1], ['Olympus', 'Zuiko 28mm f/3.5', 3, 90, 0.0], ['Olympus', 'Zuiko 135mm f/3.5', 3, 70, 0.1],
    ['Vivitar', 'Series 1 70-210mm f/3.5', 4, 90, 0.5], ['Vivitar', '28mm f/2.5', 4, 30, 0.0], ['Vivitar', '55mm f/2.8 Macro', 3, 70, 0.2],
    ['Tamron', 'Adaptall-2 SP 90mm f/2.5', 2, 190, 0.2], ['Tamron', 'Adaptall 80-210mm f/3.8', 4, 40, 0.4],
    ['Sigma', 'Mini-Wide 28mm f/2.8', 4, 30, 0.0], ['Tokina', 'RMC 80-200mm f/4', 3, 60, 0.4],
    ['Mamiya', 'Sekor C 80mm f/2.8', 3, 150, 0.1], ['Mamiya', 'Sekor 90mm f/3.5 (645)', 2, 120, 0.1],
  ],
  acc: [
    ['Vivitar', '283 flash', 4, 35, 0.0], ['Metz', '45 CT-1 flash', 2, 55, 0.2], ['Pentax', 'AF200S flash', 2, 40, 0.0],
    ['Gossen', 'Luna-Pro light meter', 3, 45, 0.2], ['Sekonic', 'L-398 light meter', 2, 65, 0.1], ['Pentax', 'Digital Spotmeter', 1, 90, 0.2],
    ['Paterson', 'Super System 4 tank', 3, 28, -0.2], ['Lowepro', 'Nova camera bag', 3, 25, 0.0], ['Domke', 'F-2 bag', 1, 70, 0.0],
    ['Gitzo', 'Series 2 tripod', 1, 120, 0.1], ['Canon', 'Winder A2', 2, 30, 0.1], ['Nikon', 'MD-12 motor drive', 2, 70, 0.3],
    ['Kenko', '2x teleconverter', 3, 25, 0.0], ['Pentax', 'Auto Bellows', 1, 80, 0.4], ['Pentax', 'Ever-ready case set', 4, 18, 0.0],
  ],
};
const CAT_HOURS = { slr: 1.9, pns: 1.75, mf: 3.5, lens: 1.3, acc: 0.45 };
const CAT_VALUE = { slr: 0.95, pns: 0.8, mf: 1.3, lens: 1.0, acc: 1.0 };

const SOURCE_BY_CAT = {
  slr: { 'Estate sale': 0.38, 'Thrift store': 0.30, 'Flea market': 0.20, 'Online lot': 0.12 },
  pns: { 'Estate sale': 0.15, 'Thrift store': 0.55, 'Flea market': 0.22, 'Online lot': 0.08 },
  mf: { 'Estate sale': 0.46, 'Thrift store': 0.08, 'Flea market': 0.22, 'Online lot': 0.24 },
  lens: { 'Estate sale': 0.35, 'Thrift store': 0.12, 'Flea market': 0.25, 'Online lot': 0.28 },
  acc: { 'Estate sale': 0.40, 'Thrift store': 0.30, 'Flea market': 0.25, 'Online lot': 0.05 },
};
const RATIO = { 'Estate sale': [0.08, 0.28], 'Thrift store': [0.06, 0.26], 'Flea market': [0.18, 0.45], 'Online lot': [0.28, 0.6] };
const PLATFORM_BY_CAT = {
  slr: { eBay: 0.62, Etsy: 0.26, 'Photrio Forum': 0.12 },
  pns: { eBay: 0.58, Etsy: 0.36, 'Photrio Forum': 0.06 },
  mf: { eBay: 0.50, Etsy: 0.22, 'Photrio Forum': 0.28 },
  lens: { eBay: 0.60, Etsy: 0.08, 'Photrio Forum': 0.32 },
  acc: { eBay: 0.85, Etsy: 0.08, 'Photrio Forum': 0.07 },
};
const PLAT = {
  eBay: { price: 1.0, haz: 1.25, fee: [12.4, 13.0], shipP: 0.32 },
  Etsy: { price: 1.12, haz: 0.8, fee: [9.2, 10.8], shipP: 0.22 },
  'Photrio Forum': { price: 1.10, haz: 0.65, fee: [8.0, 8.9], shipP: 0.05 },
};
const CAT_HAZ = { slr: 1.0, pns: 0.9, mf: 0.6, lens: 1.1, acc: 0.8 };
const SHIP_COST = { slr: [9, 17], pns: [6, 11], mf: [15, 34], lens: [7, 15], acc: [6, 14] };
const SEASON_ACQ = [0.35, 0.4, 0.8, 1.1, 1.3, 1.3, 1.2, 1.2, 1.3, 1.1, 0.7, 0.45];
const SEASON_SALES = [0.8, 0.85, 1.0, 1.05, 1.05, 1.0, 0.95, 0.95, 1.0, 1.05, 1.2, 1.25];
const TILT = {
  mf: (t) => 0.35 + 1.05 * t,
  pns: (t) => 0.8 + 0.5 * t,
  slr: (t) => 1.3 - 0.45 * t,
  lens: () => 1,
  acc: () => 1,
};

// ---------- 1. build the item skeletons ----------
// time positions weighted by growth x seasonality
const days = [];
for (let d = START; d <= LAST_ACQ; d++) days.push(d);
const dayW = days.map((d) => (0.4 + 1.5 * Math.pow((d - START) / (TODAY - START), 1.3)) * SEASON_ACQ[monthOf(d)] * (d >= dayOf('2026-08-15') ? 1.3 : 1));
const dayCum = []; dayW.reduce((s, w, i) => (dayCum[i] = s + w), 0);
const sampleDay = () => {
  const r = rnd() * dayCum[dayCum.length - 1];
  let lo = 0, hi = dayCum.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (dayCum[mid] >= r) hi = mid; else lo = mid + 1; }
  return days[lo];
};
const snapWeekend = (d) => {
  const w = dow(d);
  if (w === 0 || w === 6) return d;
  // nearest Saturday or Sunday
  const toSat = (6 - w + 7) % 7, backSun = w; // forward to Sat, back to previous Sun
  const cand = backSun <= toSat ? d - backSun : d + toSat;
  return Math.min(LAST_ACQ, Math.max(START, cand));
};

// The one hand-written story item: the 11-month Soviet portrait lens.
const FIXED = {
  category: 'lens', brand: 'Soviet', model: 'Jupiter-9 85mm f/2', source: 'Estate sale', purchase: 15,
  acquired: '2025-11-29', hours: 1.5, parts: 0, platform: 'eBay', listed: '2025-12-06', listPrice: 180,
  cuts: [{ date: '2026-01-10', price: 150 }, { date: '2026-03-07', price: 120 }, { date: '2026-07-11', price: 95 }],
  status: 'sold', salePrice: 95, fee: 12.26, shipping: 0, sold: '2026-11-07', offer: false,
  feedback: { stars: 5, text: 'Glass is clean and the aperture blades are snappy. The rendering is exactly the dreamy portrait look I was after.' },
  fixed: true,
};

const remaining = { ...CAT_COUNTS, lens: CAT_COUNTS.lens - 1 }; // -1: the fixed lens
const skeletons = [];
const total = TARGET.items - 1;
for (let i = 0; i < total; i++) {
  const d0 = sampleDay();
  const t = (d0 - START) / (TODAY - START);
  const cat = wchoose(Object.fromEntries(Object.entries(remaining).filter(([, n]) => n > 0).map(([c, n]) => [c, n * TILT[c](t)])));
  remaining[cat]--;
  const source = wchoose(SOURCE_BY_CAT[cat]);
  const acquired = source === 'Online lot' && chance(0.7) ? d0 : snapWeekend(d0);
  const [brand, model, , fair0, hx] = wpick(CATALOG[cat]);
  const baseHours = Math.max(0, CAT_HOURS[cat] + hx + gauss() * 0.55);
  skeletons.push({ category: cat, brand, model, source, acquiredDay: acquired, t, fair0: fair0 * CAT_VALUE[cat] * Math.min(1.35, Math.max(0.68, logn(0.22))), baseHours });
}

// ---------- 2. status assignment: kept / written off ----------
const retireCandidates = skeletons.filter((s) => s.acquiredDay <= TODAY - 90);
const RETIRED_COUNT = TARGET.retired;
const keptN = 11;
function takeRetired(n, weightFn) {
  const pool = retireCandidates.filter((s) => !s.retired);
  for (let k = 0; k < n; k++) {
    const live = pool.filter((s) => !s.retired);
    const s = wpick(live, weightFn);
    s.retired = true;
    s._kind = k;
  }
}
// kept: nicer cameras Gus wanted to hold on to
takeRetired(keptN, (s) => (s.category === 'mf' ? 3 : s.category === 'slr' ? 2 : s.category === 'lens' ? 1.2 : s.category === 'pns' ? 0.8 : 0.1) * Math.sqrt(s.fair0));
skeletons.filter((s) => s.retired).forEach((s) => (s.retiredAs = 'kept'));
// written off: broken ones that never came back to life
takeRetired(RETIRED_COUNT - keptN, (s) => (s.category === 'pns' ? 3.2 : s.category === 'slr' ? 2 : s.category === 'lens' ? 1.4 : s.category === 'mf' ? 1.0 : 0.3));
skeletons.filter((s) => s.retired && !s.retiredAs).forEach((s) => (s.retiredAs = 'written-off'));

const KEPT_NOTES = [
  'Kept: nicer than the body I shoot, so it moved to the shelf.',
  'Kept for the winter portrait project.',
  'Kept: first one that came back with every speed accurate.',
  'Kept — sentimental, it came from the same estate as my first Pentax.',
  'Kept: better than my daily body, sold that one instead.',
];
const WO = {
  slr: ['Written off: shutter curtain tore during the CLA.', 'Written off: mirror box foam gone and prism fogged beyond fixing.', 'Written off: meter dead and shutter sticks at every speed.'],
  pns: ['Written off: lens motor seized, no film advance.', 'Written off: battery door corroded through the contacts.', 'Written off: flash capacitor dead, shutter locked.'],
  lens: ['Written off: fungus etched into the rear element.', 'Written off: separated balsam, cloudy in the centre.', 'Written off: helicoid seized and stripped a thread.'],
  mf: ['Written off: bellows pinholed and the shutter would not cock.', 'Written off: winding mechanism skipped frames after repair.'],
  acc: ['Written off: leaked battery acid wrecked the contacts.'],
};

// ---------- 3. attach listing parameters / pre-drawn randomness ----------
const sf0 = 1; // fair-value scale, tuned below
const items = skeletons.map((s) => {
  const it = { ...s };
  it.purchaseBase = (() => { const [a, b] = RATIO[it.source]; let r = U(a, b); if (it.category === 'pns' && (it.source === 'Thrift store' || it.source === 'Flea market')) r *= 1 + 0.9 * it.t; return it.fair0 * r; })();
  it.parts = chance(0.42) ? 0 : Math.round(
    it.category === 'mf' ? U(8, 34) : it.category === 'slr' ? U(4, 20) : it.category === 'lens' ? U(3, 14) : it.category === 'pns' ? U(2, 8) : U(2, 6));
  if (it.retired) { it.status = it.retiredAs; return it; }
  it.platform = wchoose(PLATFORM_BY_CAT[it.category]);
  it.status = 'pending';
  it.prepDays = Math.round(2 + U(0, 9) + it.baseHours * 1.6);
  it.markup = U(1.0, 1.32);
  it.frailty = chance(0.05) ? 0.2 * logn(0.5) : logn(0.55);
  it.E = -Math.log(1 - rnd());
  it.cutFrac = Array.from({ length: 5 }, () => [0.05, 0.08, 0.1, 0.1, 0.1, 0.12, 0.15, 0.15, 0.2, 0.25][Math.floor(rnd() * 10)]);
  it.cutGap = Array.from({ length: 5 }, () => Math.round(U(21, 35)));
  it.offerHit = chance(0.28);
  it.offerFactor = U(0.86, 0.95);
  it.shipDraw = rnd();
  it.shipCost = U(...SHIP_COST[it.category]);
  it.feePct = Math.round(U(...PLAT[it.platform].fee) * 10) / 10;
  return it;
});

const nice = (p) => (p < 15 ? Math.max(5, Math.round(p)) : p < 40 ? Math.round(p) : Math.round(p / 5) * 5);

// ---------- 4. listing simulation ----------
const BETA = 3.6;
function simulate(sf, m) {
  let sold = 0, revenue = 0;
  for (const it of items) {
    if (it.retired) continue;
    const F = it.fair0 * sf * PLAT[it.platform].price;
    it.F = F;
    const listDay = Math.min(TODAY - 1, it.acquiredDay + it.prepDays);
    it.listDay = listDay;
    const L0 = nice(F * it.markup);
    it.listPrice = L0;
    // cut schedule: first review on/after day 30 (weekends), then every 3-5 weeks
    const cuts = [];
    let price = L0, off = 30;
    while ((listDay + off) % 7 !== 6 && (listDay + off) % 7 !== 0) off++;
    if (L0 >= 12) {
      for (let k = 0; k < 5; k++) {
        const np0 = nice(price * (1 - it.cutFrac[k]));
        const np = np0 >= price ? price - (price < 40 ? 1 : 5) : np0;
        if (np < 5) break;
        cuts.push({ off, price: np });
        price = np;
        off += it.cutGap[k];
        while ((listDay + off) % 7 !== 6 && (listDay + off) % 7 !== 0) off++;
      }
    }
    it.cutPlan = cuts;
    // walk the days
    let cum = 0, p = L0, ci = 0, soldAt = -1;
    const horizon = TODAY - listDay;
    for (let t = 1; t <= Math.min(horizon, 328); t++) {
      while (ci < cuts.length && cuts[ci].off <= t) { p = cuts[ci].price; ci++; }
      const ratio = Math.min(2, Math.max(0.5, p / F));
      const h = 0.03 * m * it.frailty * PLAT[it.platform].haz * CAT_HAZ[it.category] * Math.exp(-BETA * (ratio - 1)) * SEASON_SALES[monthOf(listDay + t)] * Math.pow(F / 100, -0.15) * (t > 100 ? 1 + (t - 100) / 12 : 1);
      cum += h;
      if (cum >= it.E) { soldAt = t; break; }
    }
    if (soldAt > 0) {
      it.status = 'sold'; it.soldOff = soldAt;
      const lastP = (() => { let q = L0; for (const c of cuts) if (c.off <= soldAt) q = c.price; return q; })();
      it.lastP = lastP;
      it.offer = it.offerHit && lastP >= 20;
      it.salePrice = it.offer ? Math.round(lastP * it.offerFactor) : lastP;
      sold++; revenue += it.salePrice;
    } else { it.status = 'listed'; it.soldOff = 0; }
  }
  return { sold, revenue };
}

const fixedSold = 1;
const targetSoldSim = TARGET.sold - fixedSold;
function tuneHazard(sf) {
  let lo = Math.log(0.05), hi = Math.log(20);
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    const { sold } = simulate(sf, Math.exp(mid));
    if (sold < targetSoldSim) lo = mid; else hi = mid;
  }
  let best = null;
  for (const mm of [hi, lo, (hi + lo) / 2]) { const r = simulate(sf, Math.exp(mm)); if (r.sold === targetSoldSim) { best = { m: Math.exp(mm), ...r }; break; } }
  if (!best) { const r = simulate(sf, Math.exp(hi)); best = { m: Math.exp(hi), ...r }; }
  return best;
}

let sf = sf0, res;
const targetRevSim = TARGET.revenue - FIXED.salePrice;
for (let iter = 0; iter < 14; iter++) {
  res = tuneHazard(sf);
  const ratio = targetRevSim / res.revenue;
  if (Math.abs(res.revenue - targetRevSim) < 40) break;
  sf *= Math.pow(ratio, 0.9);
}
res = tuneHazard(sf);
if (res.sold !== targetSoldSim) throw new Error(`could not hit sold count: ${res.sold} vs ${targetSoldSim}`);
console.log(`sf=${sf.toFixed(4)} m=${res.m.toFixed(4)} sold(sim)=${res.sold} revenue(sim)=${res.revenue}`);

// ---------- 5. exact-total fixups ----------
// revenue: nudge accepted-offer sale prices by whole dollars
{
  let diff = targetRevSim - items.filter((i) => i.status === 'sold').reduce((s, i) => s + i.salePrice, 0);
  const pool = items.filter((i) => i.status === 'sold' && i.offer && i.salePrice > 25);
  let guard = 0;
  while (diff !== 0 && guard++ < 5000) {
    const it = pool[Math.floor(rnd() * pool.length)];
    const step = diff > 0 ? 1 : -1;
    if (it.salePrice + step > it.lastP - 1 && step > 0) continue; // keep an offer below list
    it.salePrice += step; diff -= step;
  }
  if (diff !== 0) throw new Error('revenue fixup failed ' + diff);
}

// hours: scale then settle in 0.25 steps
{
  const all = items;
  const fixedHours = FIXED.hours;
  const targetH = TARGET.hours - fixedHours;
  all.forEach((i) => { i.hours = Math.round(i.baseHours * (i.retiredAs === 'written-off' ? 1.5 : 1) * 4) / 4; });
  const sum = () => all.reduce((s, i) => s + i.hours, 0);
  const k = targetH / sum();
  all.forEach((i) => { i.hours = Math.min(6.5, Math.max(0, Math.round(i.hours * k * 4) / 4)); });
  let diff = Math.round((targetH - sum()) * 4);
  let guard = 0;
  while (diff !== 0 && guard++ < 20000) {
    const i = all[Math.floor(rnd() * all.length)];
    const step = diff > 0 ? 1 : -1;
    const nh = i.hours + step * 0.25;
    if (nh < 0 || nh > 6.5) continue;
    if (nh === 0 && i.category !== 'acc') continue;
    i.hours = nh; diff -= step;
  }
  if (diff !== 0) throw new Error('hours fixup failed');
}

// cost of goods: scale purchase prices, then settle in whole dollars
{
  const targetCogs = TARGET.cogs - (FIXED.purchase + FIXED.parts);
  const partsSum = items.reduce((s, i) => s + i.parts, 0);
  const wantPurchase = targetCogs - partsSum;
  const baseSum = items.reduce((s, i) => s + i.purchaseBase, 0);
  const k = wantPurchase / baseSum;
  items.forEach((i) => { i.purchase = Math.min(220, Math.max(1, Math.round(i.purchaseBase * k))); });
  let diff = wantPurchase - items.reduce((s, i) => s + i.purchase, 0);
  let guard = 0;
  while (diff !== 0 && guard++ < 20000) {
    const i = items[Math.floor(rnd() * items.length)];
    const step = diff > 0 ? 1 : -1;
    const np = i.purchase + step;
    if (np < 1 || np > 220) continue;
    if (step > 0 && i.purchase < 6 && chance(0.6)) continue;
    i.purchase = np; diff -= step;
  }
  if (diff !== 0) throw new Error('cogs fixup failed');
}

// fees + shipping
{
  const sold = items.filter((i) => i.status === 'sold');
  sold.forEach((i) => { i.fee = r2((i.salePrice * i.feePct) / 100); });
  const feeSum = sold.reduce((s, i) => s + i.fee, 0) + FIXED.fee + FIXED.shipping;
  const targetShip = TARGET.feesShip - feeSum;
  // choose seller-paid shipping by platform probability, scaled until close
  let lo = 0.2, hi = 6;
  const shipFor = (mult) => {
    let s = 0;
    for (const i of sold) { i.shipping = i.shipDraw < PLAT[i.platform].shipP * mult ? Math.round(i.shipCost) : 0; s += i.shipping; }
    return s;
  };
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (shipFor(mid) < targetShip) lo = mid; else hi = mid; }
  shipFor(hi);
  let diff = Math.round((targetShip - sold.reduce((s, i) => s + i.shipping, 0)) * 100); // cents
  const paid = sold.filter((i) => i.shipping > 0);
  let guard = 0;
  while (Math.abs(diff) >= 100 && guard++ < 5000) {
    const i = paid[Math.floor(rnd() * paid.length)];
    const step = diff > 0 ? 1 : -1;
    if (i.shipping + step < 4) continue;
    i.shipping += step; diff -= step * 100;
  }
  // last <$1 residue goes onto one shipping label as cents
  if (diff !== 0) { const i = paid[0]; i.shipping = r2(i.shipping + diff / 100); }
}

// ---------- 6. assemble output ----------
const FEEDBACK = {
  5: {
    slr: ['Shutter fires cleanly at every speed and the light seals are fresh. Exactly as described.', 'Meter is spot on, viewfinder is bright. Packed like a tank, thank you!', 'Came faster than expected and the camera is in better shape than the photos suggested.', 'Works perfectly. Test roll came back sharp and evenly exposed.', 'Clean prism, smooth film advance, great seller. Would buy from again.'],
    pns: ['Tiny, works great, the lens is spotless. My new pocket camera!', 'Autofocus is quick and the flash fires. Arrived with a fresh battery too.', 'Exactly as described and shipped the next day.', 'Wonderful little camera, the test roll looked great.'],
    mf: ['Bellows are light-tight and the shutter sounds right at every speed. Beautifully cleaned.', 'Gorgeous condition. The ground glass is bright and the focus is smooth.', 'Honest description and careful packing for such a heavy camera. Thank you!', 'A joy to shoot. Seller clearly knows these cameras.'],
    lens: ['Glass is clear, aperture blades snappy, focus ring smooth. Perfect on my adapter.', 'Sharper than I expected for the money. Great communication.', 'No haze, no fungus, just as promised. Fast shipping.', 'Lovely lens, rendering is gorgeous wide open.'],
    acc: ['Works as described, quick shipping.', 'Does exactly what it should. Thanks!', 'Good condition, nicely packed.'],
  },
  4: ['Good camera, slightly more wear on the body than the photos showed, but works well.', 'Works fine. Shipping was a little slow but the item is as described.', 'Lens is good with a bit of dust inside, optically fine for the price.', 'Happy overall; one shutter speed is a touch slow but usable.'],
  3: ['Works, but the light seals were already crumbling when it arrived.', 'Cosmetically rougher than described, though functional.', 'Meter reads a stop off. Camera otherwise OK.'],
  2: ['Focus ring is stiffer than the listing suggested. Kept it, but disappointed.'],
  1: ['Film advance jammed after the first roll. Returned for a partial refund.'],
};
function makeFeedback(it) {
  if (!chance(0.9)) return undefined;
  const r = rnd();
  const stars = r < 0.84 ? 5 : r < 0.93 ? 4 : r < 0.97 ? 3 : r < 0.99 ? 2 : 1;
  const bank = stars === 5 ? FEEDBACK[5][it.category] : FEEDBACK[stars];
  return { stars, text: bank[Math.floor(rnd() * bank.length)] };
}

const out = [];
for (const it of items) {
  const base = {
    category: it.category, brand: it.brand, model: it.model, source: it.source,
    purchase: it.purchase, acquired: isoOf(it.acquiredDay), hours: it.hours, parts: it.parts, status: it.status,
  };
  if (it.retired) {
    base.note = it.retiredAs === 'kept' ? KEPT_NOTES[Math.floor(rnd() * KEPT_NOTES.length)] : (WO[it.category] ?? WO.slr)[Math.floor(rnd() * (WO[it.category] ?? WO.slr).length)];
    out.push(base); continue;
  }
  base.platform = it.platform;
  base.listed = isoOf(it.listDay);
  base.listPrice = it.listPrice;
  const reached = it.status === 'sold' ? it.soldOff : TODAY - it.listDay;
  base.cuts = it.cutPlan.filter((c) => c.off <= reached).map((c) => ({ date: isoOf(it.listDay + c.off), price: c.price }));
  if (it.status === 'sold') {
    base.salePrice = it.salePrice; base.fee = it.fee; base.shipping = it.shipping;
    base.sold = isoOf(it.listDay + it.soldOff); base.offer = it.offer;
    const fb = makeFeedback(it); if (fb) base.feedback = fb;
  }
  out.push(base);
}
const { fixed: _f, ...fixedOut } = FIXED;
out.push(fixedOut);

out.sort((a, b) => a.acquired.localeCompare(b.acquired) || a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
out.forEach((o, i) => { o.id = 'FL-' + String(i + 1).padStart(4, '0'); });
const ordered = out.map(({ id, ...rest }) => ({ id, ...rest }));

// ---------- 7. verify ----------
const cnt = (f) => ordered.filter(f).length;
const sold = ordered.filter((i) => i.status === 'sold');
const revenue = sold.reduce((s, i) => s + i.salePrice, 0);
const cogs = ordered.reduce((s, i) => s + i.purchase + i.parts, 0);
const fs_ = sold.reduce((s, i) => s + i.fee + i.shipping, 0);
const hours = ordered.reduce((s, i) => s + i.hours, 0);
const checks = {
  items: [ordered.length, 612], sold: [sold.length, 488], listed: [cnt((i) => i.status === 'listed'), 97],
  retired: [cnt((i) => i.status === 'kept' || i.status === 'written-off'), 27],
  revenue: [revenue, 41380], cogs: [cogs, 12950], feesShip: [Math.round(fs_ * 100) / 100, 6210], hours: [hours, 1140],
  slr: [cnt((i) => i.category === 'slr'), 214], pns: [cnt((i) => i.category === 'pns'), 171], mf: [cnt((i) => i.category === 'mf'), 58],
  lens: [cnt((i) => i.category === 'lens'), 139], acc: [cnt((i) => i.category === 'acc'), 30],
  purchaseRange: [Math.min(...ordered.map((i) => i.purchase)) >= 1 && Math.max(...ordered.map((i) => i.purchase)) <= 220, true],
  hoursRange: [Math.min(...ordered.map((i) => i.hours)) >= 0 && Math.max(...ordered.map((i) => i.hours)) <= 6.5, true],
  feeRange: [sold.every((i) => i.fee / i.salePrice >= 0.075 && i.fee / i.salePrice <= 0.135), true],
};
let bad = false;
for (const [k, [a, b]] of Object.entries(checks)) { const ok = a === b; if (!ok) bad = true; console.log(`${ok ? 'ok ' : 'BAD'} ${k}: ${a} (target ${b})`); }
if (bad) { console.error('Totals do not match, not writing.'); process.exit(1); }

// ---------- 8. quick tuning report ----------
const daysTo = (i) => (Date.parse(i.sold) - Date.parse(i.listed)) / 86400000;
const net = (i) => (i.status === 'sold' ? i.salePrice - i.fee - i.shipping : 0) - i.purchase - i.parts;
console.log('\ncategory   n  sold   revenue    net   hrs   $/h   medDays  net/item');
for (const c of ['slr', 'pns', 'mf', 'lens', 'acc']) {
  const g = ordered.filter((i) => i.category === c); const s = g.filter((i) => i.status === 'sold');
  const n = g.reduce((a, i) => a + net(i), 0); const h = g.reduce((a, i) => a + i.hours, 0);
  console.log(c.padEnd(6), String(g.length).padStart(4), String(s.length).padStart(5), String(s.reduce((a, i) => a + i.salePrice, 0)).padStart(9), String(Math.round(n)).padStart(7), String(Math.round(h)).padStart(5), (n / h).toFixed(1).padStart(6), String(median(s.map(daysTo))).padStart(7), (n / g.length).toFixed(1).padStart(8));
}
for (const p of ['eBay', 'Etsy', 'Photrio Forum']) {
  const g = ordered.filter((i) => i.platform === p); const s = g.filter((i) => i.status === 'sold');
  const n = g.reduce((a, i) => a + net(i), 0); const h = g.reduce((a, i) => a + i.hours, 0);
  console.log(p.padEnd(14), String(g.length).padStart(4), String(s.length).padStart(5), String(Math.round(n)).padStart(7), (n / h).toFixed(1).padStart(6), String(median(s.map(daysTo))).padStart(7));
}
for (const p of ['Estate sale', 'Thrift store', 'Flea market', 'Online lot']) {
  const g = ordered.filter((i) => i.source === p);
  const n = g.reduce((a, i) => a + net(i), 0); const h = g.reduce((a, i) => a + i.hours, 0);
  console.log(p.padEnd(14), String(g.length).padStart(4), String(Math.round(n)).padStart(7), (n / h).toFixed(1).padStart(6));
}
const dts = sold.map(daysTo);
console.log('\nmedian days to sell', median(dts), ' max', Math.max(...dts), ' >180:', dts.filter((d) => d > 180).length, ' <=30:', dts.filter((d) => d <= 30).length);
console.log('listed >90d:', ordered.filter((i) => i.status === 'listed' && (TODAY - dayOf(i.listed)) > 90).length, ' listed cost:', ordered.filter((i) => i.status === 'listed').reduce((a, i) => a + i.purchase + i.parts, 0));
console.log('cuts: items cut', ordered.filter((i) => i.cuts && i.cuts.length).length, ' with 3+', ordered.filter((i) => i.cuts && i.cuts.length >= 3).length);
console.log('losers (sold net<0):', sold.filter((i) => net(i) < 0).length);
console.log('max days sold item:', sold.sort((a, b) => daysTo(b) - daysTo(a)).slice(0, 4).map((i) => `${i.brand} ${i.model} ${daysTo(i)}d`).join(' | '));

// 14-day windows: baseline (days 16-30, before first cut) vs after cuts, by size
{
  const listedAll = ordered.filter((i) => i.listed);
  const dd = (a, b) => (Date.parse(b) - Date.parse(a)) / 86400000;
  const base = { n: 0, k: 0 };
  for (const i of listedAll) {
    const L = i.listed; const soldOff = i.sold ? dd(L, i.sold) : Infinity;
    const obsEnd = dd(L, isoOf(TODAY));
    if (obsEnd < 30) continue;
    if (soldOff <= 16) continue; // not at risk at day 16
    base.n++; if (soldOff <= 30) base.k++;
  }
  console.log('baseline days16-30: ', base.k, '/', base.n, (100 * base.k / base.n).toFixed(1) + '%');
  const buckets = { '<10': { n: 0, k: 0 }, '10-14': { n: 0, k: 0 }, '15-19': { n: 0, k: 0 }, '20+': { n: 0, k: 0 } };
  for (const i of listedAll) {
    let prev = i.listPrice;
    for (const c of i.cuts) {
      const pct = (prev - c.price) / prev * 100; prev = c.price;
      if (dd(c.date, isoOf(TODAY)) < 14) continue;
      const soldAfter = i.sold ? dd(c.date, i.sold) : Infinity;
      const b = pct < 10 ? '<10' : pct < 15 ? '10-14' : pct < 20 ? '15-19' : '20+';
      buckets[b].n++; if (soldAfter <= 14) buckets[b].k++;
    }
  }
  for (const [k, v] of Object.entries(buckets)) console.log('after cut', k.padEnd(6), v.k, '/', v.n, (100 * v.k / v.n).toFixed(1) + '%');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(ordered));
console.log('\nwrote', OUT, ordered.length, 'items');
