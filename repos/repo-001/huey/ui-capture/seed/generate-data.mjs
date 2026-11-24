// Generates the data files an established Huey user (an analyst at "Northwind Outdoor Co.",
// a mid-sized outdoor gear retailer) would keep exploring: order lines, support tickets,
// marketing spend and an inventory snapshot. Deterministic (seeded PRNG).
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
fs.mkdirSync(outDir, { recursive: true });

let seed = 20251117;
function rnd() { // mulberry32
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = a => a[Math.floor(rnd() * a.length)];
function wpick(pairs) { const tot = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * tot; for (const [v, w] of pairs) { if ((r -= w) < 0) return v; } return pairs[pairs.length - 1][0]; }
const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pad = n => String(n).padStart(2, '0');
const fmtDate = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fmtTs = d => `${fmtDate(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
const DAY = 86400000;
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeCsv(name, header, rows) {
  const lines = [header.join(',')].concat(rows.map(r => header.map(h => csvCell(r[h])).join(',')));
  fs.writeFileSync(path.join(outDir, name), lines.join('\n') + '\n');
  console.log(`${name}: ${rows.length} rows`);
}

// ---------- reference data ----------
const geo = [
  ['North America', 'United States', ['Denver', 'Seattle', 'Portland', 'Boulder', 'Salt Lake City', 'Austin', 'Minneapolis', 'Boston', 'Asheville', 'Bend'], 30],
  ['North America', 'Canada', ['Vancouver', 'Calgary', 'Toronto', 'Montréal', 'Whistler'], 9],
  ['Europe', 'Germany', ['München', 'Berlin', 'Hamburg', 'Freiburg'], 9],
  ['Europe', 'Netherlands', ['Amsterdam', 'Utrecht', 'Rotterdam', 'Eindhoven'], 6],
  ['Europe', 'France', ['Chamonix', 'Lyon', 'Paris', 'Grenoble'], 6],
  ['Europe', 'United Kingdom', ['London', 'Manchester', 'Edinburgh', 'Bristol'], 8],
  ['Europe', 'Norway', ['Oslo', 'Bergen', 'Tromsø'], 3],
  ['Europe', 'Switzerland', ['Zürich', 'Bern', 'Interlaken'], 3],
  ['Asia Pacific', 'Australia', ['Sydney', 'Melbourne', 'Hobart'], 5],
  ['Asia Pacific', 'New Zealand', ['Queenstown', 'Auckland', 'Wellington'], 3],
  ['Asia Pacific', 'Japan', ['Tokyo', 'Sapporo', 'Nagano'], 4],
];
const catalog = [
  // category, subcategory, product, base price, cost ratio
  ['Camping', 'Tents', ['Ridgeline 2P Backpacking Tent', 'Basecamp 4P Dome Tent', 'Ultralight Trekking-Pole Shelter', 'Family Cabin Tent 6P'], [329, 449, 289, 599]],
  ['Camping', 'Sleeping Bags', ['Alpine Down Bag -9°C', 'Summer Synthetic Bag +10°C', 'Kids Explorer Sleeping Bag'], [379, 129, 79]],
  ['Camping', 'Cooking', ['Titanium Pot Set', 'Compact Canister Stove', 'Insulated Camp Mug 350ml', 'Folding Spork (3-pack)'], [89, 64, 24, 12]],
  ['Hiking', 'Backpacks', ['Summit 45L Pack', 'Daytripper 22L Pack', 'Expedition 70L Pack', 'Trail Running Vest 8L'], [219, 99, 329, 139]],
  ['Hiking', 'Footwear', ['Granite Mid GTX Boot', 'Scree Trail Runner', 'Approach Shoe Low', 'Merino Hiking Socks (2-pack)'], [229, 149, 169, 29]],
  ['Hiking', 'Navigation', ['Handheld GPS Navigator', 'Baseplate Compass', 'Waterproof Map Case'], [349, 39, 19]],
  ['Apparel', 'Jackets', ['Stormshell 3L Rain Jacket', 'Featherlite Down Hoodie', 'Softshell Climbing Jacket', 'Windbreaker Packable'], [289, 249, 199, 89]],
  ['Apparel', 'Base Layers', ['Merino 200 Long Sleeve', 'Merino 150 Tee', 'Synthetic Thermal Leggings'], [99, 69, 59]],
  ['Apparel', 'Accessories', ['Fleece Beanie', 'Sun Hoodie UPF50', 'Touchscreen Liner Gloves', 'Buff Neck Gaiter'], [29, 59, 34, 22]],
  ['Climbing', 'Hardware', ['Locking Carabiner HMS', 'Quickdraw Set (6)', 'Belay Device Assisted', 'Cam #2'], [18, 129, 109, 89]],
  ['Climbing', 'Ropes', ['Dynamic Rope 9.5mm 60m', 'Dynamic Rope 9.8mm 70m', 'Static Rope 10.5mm 40m'], [219, 259, 179]],
  ['Climbing', 'Harnesses', ['All-Round Harness', 'Alpine Lightweight Harness'], [79, 119]],
  ['Water Sports', 'Paddling', ['Inflatable SUP 10\'6"', 'Touring Kayak Paddle', 'PFD Touring Vest', 'Dry Bag 20L'], [649, 159, 129, 34]],
  ['Winter', 'Snow', ['Avalanche Beacon', 'Snowshoes 25"', 'Probe 240cm', 'Collapsible Shovel'], [349, 199, 69, 79]],
];
const products = [];
let skuN = 1001;
for (const [cat, sub, names, prices] of catalog) {
  names.forEach((n, i) => products.push({ category: cat, subcategory: sub, name: n, price: prices[i], sku: `NW-${cat.slice(0, 3).toUpperCase()}-${skuN++}` }));
}
const channels = [['Web Shop', 48], ['Marketplace', 18], ['Retail Store', 24], ['B2B / Wholesale', 6], ['Mobile App', 10]];
const segments = [['Consumer', 70], ['Outdoor Club', 10], ['Corporate', 8], ['Guide / Outfitter', 7], ['Education', 5]];
const payments = [['Credit Card', 52], ['PayPal', 18], ['Apple Pay', 11], ['Invoice', 9], ['Klarna', 6], ['Gift Card', 4]];

function seasonalWeight(cat, month) {
  const m = month; // 0..11
  switch (cat) {
    case 'Winter': return [1.8, 1.4, 0.8, 0.3, 0.1, 0.1, 0.1, 0.2, 0.4, 0.9, 1.6, 2.2][m];
    case 'Water Sports': return [0.2, 0.2, 0.4, 0.8, 1.4, 1.9, 2.0, 1.6, 0.8, 0.3, 0.2, 0.3][m];
    case 'Camping': return [0.4, 0.5, 0.8, 1.1, 1.5, 1.8, 1.8, 1.5, 1.0, 0.6, 0.6, 1.0][m];
    case 'Apparel': return [1.1, 0.9, 1.0, 1.0, 0.9, 0.8, 0.8, 0.9, 1.1, 1.3, 1.6, 2.0][m];
    default: return [0.7, 0.7, 0.9, 1.1, 1.3, 1.3, 1.3, 1.2, 1.1, 0.9, 1.0, 1.4][m];
  }
}

// ---------- orders ----------
const today = Date.UTC(2025, 10, 14); // data exported 2025-11-14
const start = Date.UTC(2023, 0, 1);
const orderRows = [];
let orderNo = 230001;
for (let t = start; t <= today; t += DAY) {
  const d = new Date(t);
  const month = d.getUTCMonth();
  const yearGrowth = 1 + (d.getUTCFullYear() - 2023) * 0.18;
  const dow = d.getUTCDay();
  const blackFriday = month === 10 && d.getUTCDate() >= 24 && d.getUTCDate() <= 30 ? 2.5 : 1;
  const nOrders = Math.round((3 + rnd() * 4) * yearGrowth * (dow === 0 || dow === 6 ? 1.25 : 1) * blackFriday * (month === 11 ? 1.4 : 1));
  for (let o = 0; o < nOrders; o++) {
    const orderTs = new Date(t + randint(6 * 3600, 23 * 3600 + 3000) * 1000);
    const [region, country, cities] = wpick(geo.map(g => [g, g[3]]));
    const channel = wpick(channels);
    const segment = channel === 'B2B / Wholesale' ? wpick([['Corporate', 4], ['Guide / Outfitter', 4], ['Education', 2]]) : wpick(segments);
    const ageDays = (today - t) / DAY;
    let status;
    if (ageDays < 2) status = wpick([['Processing', 7], ['Shipped', 2], ['Cancelled', 1]]);
    else if (ageDays < 7) status = wpick([['Shipped', 6], ['Delivered', 3], ['Processing', 1], ['Cancelled', 0.4]]);
    else status = wpick([['Delivered', 88], ['Returned', 5], ['Cancelled', 4], ['Refunded', 2], ['Lost in Transit', 0.4]]);
    const payment = channel === 'B2B / Wholesale' ? 'Invoice' : wpick(payments);
    const nLines = wpick([[1, 55], [2, 25], [3, 12], [4, 6], [5, 2]]);
    const orderId = `SO-${orderNo++}`;
    let city = pick(cities);
    if (rnd() < 0.015) city = null; // missing city
    else if (rnd() < 0.01) city = city.toUpperCase(); // messy casing from marketplace feed
    const shipDays = channel === 'Retail Store' ? 0 : randint(1, 4);
    const shipDate = status === 'Processing' || status === 'Cancelled' ? null : fmtDate(new Date(orderTs.getTime() + shipDays * DAY));
    const promo = month === 10 && blackFriday > 1 ? 'BLACKFRIDAY25' : (rnd() < 0.12 ? pick(['SPRING15', 'WELCOME10', 'CLUB20', 'SUMMIT5', 'NEWSLETTER10']) : null);
    for (let l = 1; l <= nLines; l++) {
      const prod = wpick(products.map(p => [p, seasonalWeight(p.category, month) * (p.price > 400 ? 0.4 : 1)]));
      const qty = channel === 'B2B / Wholesale' ? randint(4, 40) : wpick([[1, 80], [2, 14], [3, 4], [4, 2]]);
      const priceAdj = d.getUTCFullYear() === 2025 ? 1.05 : 1;
      const unitPrice = Math.round(prod.price * priceAdj * 100) / 100;
      let discount = promo ? { BLACKFRIDAY25: 25, SPRING15: 15, WELCOME10: 10, CLUB20: 20, SUMMIT5: 5, NEWSLETTER10: 10 }[promo] : 0;
      if (channel === 'B2B / Wholesale') discount = pick([10, 15, 20, 25]);
      const gross = unitPrice * qty;
      const net = Math.round(gross * (1 - discount / 100) * 100) / 100;
      orderRows.push({
        order_id: orderId, line_no: l, order_timestamp: fmtTs(orderTs), ship_date: shipDate,
        status, channel, customer_segment: segment, region, country, city,
        category: prod.category, subcategory: prod.subcategory, product_name: prod.name, sku: prod.sku,
        quantity: qty, unit_price: unitPrice.toFixed(2), discount_pct: discount, promo_code: promo,
        net_amount: net.toFixed(2), cost_amount: (gross * 0.52).toFixed(2), payment_method: payment,
      });
    }
  }
}
writeCsv('northwind_order_lines_2023-2025.csv',
  ['order_id', 'line_no', 'order_timestamp', 'ship_date', 'status', 'channel', 'customer_segment', 'region', 'country', 'city',
    'category', 'subcategory', 'product_name', 'sku', 'quantity', 'unit_price', 'discount_pct', 'promo_code', 'net_amount', 'cost_amount', 'payment_method'],
  orderRows);

// ---------- support tickets ----------
const agents = ['Priya Raman', 'Jonas Becker', 'Maya Okafor', 'Liam Chen', 'Sofia Marquez', 'Tomasz Nowak', 'Aiko Tanaka', 'Ruth Abernathy'];
const ticketTopics = [
  ['Shipping & Delivery', ['Where is my order?', 'Package marked delivered but not received', 'Tracking number not updating for 5 days', 'Delivery to Packstation possible?', 'Expedited shipping before trip next week']],
  ['Returns & Refunds', ['Return label request', 'Refund not received after 14 days', 'Wrong size boots, want exchange', 'Returned tent, refund amount incorrect (missing shipping)']],
  ['Product Question', ['Is the Stormshell jacket fully seam-taped?', 'Will the 70L pack fit carry-on?', 'Rope compatibility with assisted belay device', 'Down bag comfort vs limit rating', 'SUP max load for two adults + dog?']],
  ['Warranty Claim', ['Tent pole snapped on second trip', 'Zipper failed on Featherlite hoodie', 'Delamination on Granite Mid sole after 4 months', 'Stove igniter stopped working']],
  ['Account & Payment', ['Klarna payment declined', 'Cannot reset password', 'Double charged on credit card', 'Invoice address needs VAT number']],
  ['B2B / Wholesale', ['Bulk quote for 30 harnesses (climbing gym)', 'Net-30 terms for outfitter account', 'Request for updated wholesale price list 2025']],
];
const ticketRows = [];
let tn = 41000;
for (let t = Date.UTC(2024, 0, 2); t <= today; t += DAY) {
  const d = new Date(t);
  const n = randint(2, 9) + (d.getUTCMonth() === 11 || d.getUTCMonth() === 0 ? 4 : 0);
  for (let i = 0; i < n; i++) {
    const created = new Date(t + randint(7 * 3600, 21 * 3600) * 1000);
    const [category, subjects] = wpick(ticketTopics.map(tt => [tt, tt[0] === 'Shipping & Delivery' ? 34 : tt[0] === 'B2B / Wholesale' ? 4 : 14]));
    const priority = wpick([['Low', 25], ['Normal', 52], ['High', 18], ['Urgent', 5]]);
    const age = (today - t) / DAY;
    let status;
    if (age < 3) status = wpick([['Open', 5], ['In Progress', 4], ['Waiting on Customer', 2], ['Resolved', 2]]);
    else if (age < 21) status = wpick([['Resolved', 6], ['Closed', 3], ['In Progress', 2], ['Waiting on Customer', 2], ['Escalated', 1]]);
    else status = wpick([['Closed', 80], ['Resolved', 12], ['Escalated', 1], ['Waiting on Customer', 1]]);
    const resolved = ['Resolved', 'Closed'].includes(status);
    const resHours = priority === 'Urgent' ? randint(1, 20) : randint(2, 140);
    const channel = wpick([['Email', 50], ['Chat', 30], ['Phone', 14], ['Instagram DM', 6]]);
    const firstResponse = channel === 'Chat' ? randint(1, 14) : channel === 'Phone' ? randint(0, 6) : randint(20, 1100);
    let csat = resolved && rnd() < 0.45 ? wpick([[5, 50], [4, 26], [3, 11], [2, 7], [1, 6]]) : null;
    ticketRows.push({
      ticket_id: `TCK-${tn++}`, created_at: fmtTs(created), resolved_at: resolved ? fmtTs(new Date(created.getTime() + resHours * 3600000)) : null,
      status, priority, category, channel, assigned_agent: status === 'Open' && rnd() < 0.6 ? null : pick(agents),
      subject: pick(subjects), customer_country: wpick(geo.map(g => [g[1], g[3]])),
      first_response_minutes: firstResponse, reopened_count: rnd() < 0.07 ? randint(1, 3) : 0, csat_score: csat,
    });
  }
}
writeCsv('support_tickets_2024-2025.csv',
  ['ticket_id', 'created_at', 'resolved_at', 'status', 'priority', 'category', 'channel', 'assigned_agent', 'subject', 'customer_country', 'first_response_minutes', 'reopened_count', 'csat_score'],
  ticketRows);

// ---------- marketing spend ----------
const mktRows = [];
const campaignsByMonth = [
  ['Google Ads', ['Search – Brand', 'Search – Generic Tents', 'Shopping – All Products', 'Performance Max']],
  ['Meta', ['Prospecting – Lookalike 2%', 'Retargeting – Cart Abandoners', 'Reels – Summit 45L Launch']],
  ['Newsletter', ['Monthly Trail Notes', 'Club Member Exclusive']],
  ['Affiliate', ['Outdoor Blogger Network', 'Gear Review Sites']],
  ['YouTube', ['How-To: Pitching the Ridgeline 2P', 'Avalanche Safety Basics']],
  ['TikTok', ['Spark Ads – #vanlife']],
];
for (let y = 2023; y <= 2025; y++) {
  for (let m = 0; m < 12; m++) {
    if (Date.UTC(y, m, 1) > today) break;
    for (const [src, camps] of campaignsByMonth) {
      if (src === 'TikTok' && y < 2025) continue;
      for (const c of camps) {
        if (c.startsWith('Reels') && !(y === 2025 && m >= 3 && m <= 7)) continue;
        if (c.startsWith('Avalanche') && ![0, 1, 10, 11].includes(m)) continue;
        for (const country of ['United States', 'Canada', 'Germany', 'United Kingdom', 'Netherlands', 'France']) {
          if (src === 'Newsletter' && rnd() < 0.2) continue;
          const base = src === 'Google Ads' ? 2600 : src === 'Meta' ? 1500 : src === 'Newsletter' ? 120 : src === 'YouTube' ? 900 : src === 'TikTok' ? 700 : 400;
          const cmult = country === 'United States' ? 3 : country === 'Canada' ? 0.8 : 1;
          const spend = Math.round(base * cmult * (0.6 + rnd() * 0.8) * 100) / 100;
          const impressions = Math.round(spend * (src === 'Newsletter' ? 300 : randint(80, 220)));
          const clicks = Math.round(impressions * (0.004 + rnd() * 0.03));
          const conversions = Math.round(clicks * (0.01 + rnd() * 0.05));
          mktRows.push({
            month: `${y}-${pad(m + 1)}-01`, source: src, campaign: c, country, spend_eur: spend.toFixed(2),
            impressions, clicks, conversions, attributed_revenue_eur: (conversions * (90 + rnd() * 160)).toFixed(2),
          });
        }
      }
    }
  }
}
writeCsv('marketing_spend_by_campaign.csv',
  ['month', 'source', 'campaign', 'country', 'spend_eur', 'impressions', 'clicks', 'conversions', 'attributed_revenue_eur'], mktRows);

// ---------- inventory snapshot ----------
const warehouses = [['DEN-1', 'Denver, CO'], ['RTM-2', 'Rotterdam, NL'], ['SYD-1', 'Sydney, AU'], ['YVR-1', 'Vancouver, BC']];
const invRows = [];
for (const p of products) {
  for (const [wh, whName] of warehouses) {
    const onHand = rnd() < 0.06 ? 0 : randint(0, 420);
    const reorder = randint(20, 80);
    invRows.push({
      snapshot_date: '2025-11-14', warehouse_code: wh, warehouse: whName, sku: p.sku, product_name: p.name,
      category: p.category, subcategory: p.subcategory, on_hand: onHand, reserved: Math.min(onHand, randint(0, 40)),
      reorder_point: reorder, inbound_po_qty: onHand < reorder ? randint(50, 300) : 0,
      unit_cost: (p.price * 0.52).toFixed(2), stock_status: onHand === 0 ? 'Out of Stock' : onHand < reorder ? 'Below Reorder Point' : onHand > 350 ? 'Overstock' : 'Healthy',
    });
  }
}
writeCsv('inventory_snapshot_2025-11-14.csv',
  ['snapshot_date', 'warehouse_code', 'warehouse', 'sku', 'product_name', 'category', 'subcategory', 'on_hand', 'reserved', 'reorder_point', 'inbound_po_qty', 'unit_cost', 'stock_status'], invRows);

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({
  files: [
    'northwind_order_lines_2023-2025.csv',
    'support_tickets_2024-2025.csv',
    'marketing_spend_by_campaign.csv',
    'inventory_snapshot_2025-11-14.csv',
  ],
}, null, 2));
