// Builds northwind_dw.duckdb: the analyst's small local "warehouse" file that Huey opens as a
// database datasource (schemas, tables, views). Uses the CSVs written by generate-data.mjs.
// Usage: node generate-duckdb.mjs <dataDir>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../vendor/package.json', import.meta.url));
const { DuckDBInstance } = require('@duckdb/node-api');

const dataDir = path.resolve(process.argv[2]);
const dbFile = path.join(dataDir, 'northwind_dw.duckdb');
for (const f of [dbFile, dbFile + '.wal']) if (fs.existsSync(f)) fs.rmSync(f);

let seed = 77;
function rnd() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];
const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const q = s => s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;

const inst = await DuckDBInstance.create(dbFile);
const con = await inst.connect();
const run = sql => con.run(sql);
const csv = name => q(path.join(dataDir, name));

await run(`CREATE SCHEMA sales; CREATE SCHEMA ops; CREATE SCHEMA marketing;`);

// ---- sales ----
await run(`CREATE TABLE sales.order_lines AS SELECT * FROM read_csv(${csv('northwind_order_lines_2023-2025.csv')})`);
await run(`CREATE TABLE sales.dim_product AS
  SELECT sku, any_value(product_name) AS product_name, any_value(category) AS category, any_value(subcategory) AS subcategory,
         round(max(unit_price), 2) AS list_price_2025, min(CAST(order_timestamp AS DATE)) AS first_sold, max(CAST(order_timestamp AS DATE)) AS last_sold,
         CASE WHEN max(order_timestamp) < TIMESTAMP '2025-06-01' THEN 'Discontinued' ELSE 'Active' END AS lifecycle_status
  FROM sales.order_lines GROUP BY sku ORDER BY sku`);

const first = ['Emma', 'Noah', 'Olivia', 'Liam', 'Ava', 'Lucas', 'Mia', 'Elias', 'Sophie', 'Finn', 'Hannah', 'Mateo', 'Ingrid', 'Kenji', 'Aroha', 'Chloé', 'Jakob', 'Freya', 'Ravi', 'Zoe', 'Tobias', 'Nora', 'Malik', 'Yuki', 'Isla', 'Henrik', 'Camille', 'Diego', 'Grace', 'Oskar'];
const last = ['Andersen', 'Müller', 'Smith', 'van Dijk', 'Dubois', 'Nakamura', 'Thompson', 'Larsen', 'García', 'Walsh', 'Kowalski', 'Brown', 'Rossi', 'Johansson', 'Ngata', 'Lefebvre', 'Schmidt', 'Patel', "O'Connor", 'de Vries', 'Fischer', 'Martin', 'Hughes', 'Sato', 'Berg'];
const geo = [['United States', ['Denver', 'Seattle', 'Portland', 'Boulder', 'Austin', 'Boston']], ['Canada', ['Vancouver', 'Calgary', 'Toronto']], ['Germany', ['München', 'Berlin', 'Freiburg']], ['Netherlands', ['Amsterdam', 'Utrecht']], ['United Kingdom', ['London', 'Edinburgh', 'Bristol']], ['France', ['Chamonix', 'Lyon']], ['Australia', ['Sydney', 'Melbourne']], ['Norway', ['Oslo', 'Tromsø']], ['Japan', ['Tokyo', 'Sapporo']]];
const tiers = ['Basecamp', 'Basecamp', 'Basecamp', 'Ridge', 'Ridge', 'Summit'];
const orgs = ['Rocky Mountain Climbing Gym', 'Alpine Guides Chamonix', 'Cascade Outdoor School', 'Fjord Kayak Tours AS', 'Peak District Scouts', 'Utrecht Studenten Alpenclub', 'Blue Mountains Adventure Co.', 'Hokkaido Backcountry Lodge'];
const custRows = [];
for (let i = 1; i <= 640; i++) {
  const [country, cities] = pick(geo);
  const fn = pick(first), ln = pick(last);
  const signup = new Date(Date.UTC(2019, 0, 1) + Math.floor(rnd() * (Date.UTC(2025, 10, 10) - Date.UTC(2019, 0, 1))));
  const isOrg = i % 23 === 0;
  custRows.push(`(${[
    q(`C-${String(10000 + i)}`),
    q(isOrg ? pick(orgs) : `${fn} ${ln}`),
    q(isOrg ? `purchasing@${pick(orgs).toLowerCase().replace(/[^a-z]+/g, '')}.example` : (rnd() < 0.04 ? null : `${fn}.${ln}`.toLowerCase().normalize('NFD').replace(/[^a-z.]/g, '') + `${randint(1, 99)}@example.com`)),
    q(country), q(rnd() < 0.03 ? null : pick(cities)), q(isOrg ? 'Corporate' : pick(['Consumer', 'Consumer', 'Consumer', 'Outdoor Club', 'Guide / Outfitter'])),
    q(isOrg ? null : pick(tiers)), `DATE '${signup.toISOString().slice(0, 10)}'`, rnd() < 0.62 ? 'true' : 'false',
    rnd() < 0.08 ? q('churned') : rnd() < 0.15 ? q('dormant') : q('active'),
  ].join(', ')})`);
}
await run(`CREATE TABLE sales.dim_customer (customer_id VARCHAR, customer_name VARCHAR, email VARCHAR, country VARCHAR, city VARCHAR,
  segment VARCHAR, loyalty_tier VARCHAR, signup_date DATE, newsletter_opt_in BOOLEAN, lifecycle_status VARCHAR)`);
await run(`INSERT INTO sales.dim_customer VALUES ${custRows.join(',\n')}`);

await run(`CREATE VIEW sales.v_monthly_revenue AS
  SELECT date_trunc('month', order_timestamp)::DATE AS month, region, channel, category,
         count(DISTINCT order_id) AS orders, sum(quantity) AS units, round(sum(net_amount), 2) AS net_revenue,
         round(sum(net_amount) - sum(cost_amount), 2) AS gross_margin
  FROM sales.order_lines WHERE status NOT IN ('Cancelled', 'Refunded') GROUP BY ALL`);
await run(`CREATE VIEW sales.v_returns AS
  SELECT order_id, order_timestamp, channel, country, category, product_name, quantity, net_amount
  FROM sales.order_lines WHERE status IN ('Returned', 'Refunded')`);

// ---- product reviews (short and long text) ----
const openers = ['Used this on a 5-day hut-to-hut trek in the Alps.', 'Bought it for our first family camping trip.', 'Third season with this now.', 'Took it up Mt. Rainier (Camp Muir) in June.', 'Honestly bought it on a whim during the Black Friday sale.', 'Replaced my 10-year-old one with this.', 'Daily commuter use in rainy Bergen.', 'Our guiding company ordered a batch of these for clients.', ''];
const pros = ['Packs down really small', 'Fit was true to size', 'Surprisingly warm for the weight', 'Quality stitching, no loose threads', 'Fast delivery to Vancouver', 'Easy to set up solo even in wind', 'Zippers run smoothly with gloves on', 'Great value compared to the big brands'];
const cons = ['the stuff sack is too tight', 'the color is more grey than the photos', 'the hip belt pockets are tiny', 'it took 9 days to arrive', 'the sizing runs a bit narrow', 'instructions were only in English', 'the hood does not adjust well over a helmet', 'customer service took a week to answer my warranty email'];
const reviewTitles = { 5: ['Perfect', 'Exceeded expectations', 'Best purchase this year', 'Bombproof'], 4: ['Very good, minor gripes', 'Solid gear', 'Would buy again'], 3: ['OK for the price', 'Mixed feelings', 'Does the job'], 2: ['Disappointed', 'Not as described'], 1: ['Broke after two uses', 'Returned it', 'Avoid'] };
const skus = (await (await con.runAndReadAll(`SELECT sku, product_name FROM sales.dim_product`)).getRows());
const revRows = [];
for (let i = 1; i <= 420; i++) {
  const [sku] = pick(skus);
  const rating = [5, 5, 5, 4, 4, 4, 3, 2, 1][Math.floor(rnd() * 9)];
  const long = rnd() < 0.35;
  let body = rating >= 4 ? `${pick(pros)}.` : `Not great: ${pick(cons)}.`;
  if (long) body = `${pick(openers)} ${pick(pros)}, and ${pick(pros).toLowerCase()}. Only downside is that ${pick(cons)}. ${rating >= 4 ? 'Overall I would recommend it to anyone doing multi-day trips.' : 'For this price I expected better, will probably try another brand next time.'}`.trim();
  if (rnd() < 0.1) body = rating >= 4 ? 'great' : 'meh';
  const d = new Date(Date.UTC(2023, 1, 1) + Math.floor(rnd() * (Date.UTC(2025, 10, 13) - Date.UTC(2023, 1, 1))));
  revRows.push(`(${[q(`R-${50000 + i}`), q(sku), q(`C-${10000 + randint(1, 640)}`), `TIMESTAMP '${d.toISOString().slice(0, 19).replace('T', ' ')}'`, rating,
    q(pick(reviewTitles[rating])), q(body), rnd() < 0.8 ? 'true' : 'false', randint(0, rating >= 4 ? 40 : 12),
    q(rnd() < 0.7 ? 'published' : pick(['pending moderation', 'rejected - spam', 'published'])), ].join(', ')})`);
}
await run(`CREATE TABLE sales.product_reviews (review_id VARCHAR, sku VARCHAR, customer_id VARCHAR, submitted_at TIMESTAMP, rating TINYINT,
  title VARCHAR, review_text VARCHAR, verified_purchase BOOLEAN, helpful_votes INTEGER, moderation_status VARCHAR)`);
await run(`INSERT INTO sales.product_reviews VALUES ${revRows.join(',\n')}`);

// ---- ops ----
await run(`CREATE TABLE ops.support_tickets AS SELECT * FROM read_csv(${csv('support_tickets_2024-2025.csv')})`);
await run(`CREATE TABLE ops.inventory_snapshot AS SELECT * FROM read_csv(${csv('inventory_snapshot_2025-11-14.csv')})`);
const stores = [['ST-DEN', 'Denver Flagship', 'United States', 'Denver', '2016-04-01', 1450], ['ST-SEA', 'Seattle Pike St', 'United States', 'Seattle', '2019-09-14', 820], ['ST-BLD', 'Boulder Pearl St', 'United States', 'Boulder', '2021-05-01', 540], ['ST-AMS', 'Amsterdam De Pijp', 'Netherlands', 'Amsterdam', '2022-03-19', 610], ['ST-MUC', 'München Sendlinger Tor', 'Germany', 'München', '2023-10-07', 900], ['ST-VAN', 'Vancouver Kitsilano', 'Canada', 'Vancouver', '2024-06-01', 700]];
await run(`CREATE TABLE ops.dim_store (store_id VARCHAR, store_name VARCHAR, country VARCHAR, city VARCHAR, opened_on DATE, floor_area_m2 INTEGER)`);
await run(`INSERT INTO ops.dim_store VALUES ${stores.map(s => `(${q(s[0])}, ${q(s[1])}, ${q(s[2])}, ${q(s[3])}, DATE '${s[4]}', ${s[5]})`).join(',')}`);
const foot = [];
for (const s of stores) {
  const openT = Math.max(Date.parse(s[4]), Date.UTC(2024, 0, 1));
  for (let t = openT; t <= Date.UTC(2025, 10, 13); t += 86400000) {
    const d = new Date(t); const dow = d.getUTCDay();
    if (d.getUTCMonth() === 11 && d.getUTCDate() === 25) continue; // closed Christmas
    const base = s[5] / 4 * (dow === 6 ? 1.8 : dow === 0 ? 1.3 : 1) * (0.75 + rnd() * 0.5);
    const visitors = Math.round(base);
    const tx = Math.round(visitors * (0.18 + rnd() * 0.1));
    foot.push(`(${q(s[0])}, DATE '${d.toISOString().slice(0, 10)}', ${visitors}, ${tx}, ${(tx * (60 + rnd() * 70)).toFixed(2)}, ${rnd() < 0.04 ? q(pick(['Sensor outage', 'Snowstorm - closed early', 'Inventory count day', 'Community trail-cleanup event'])) : 'NULL'})`);
  }
}
await run(`CREATE TABLE ops.store_daily_traffic (store_id VARCHAR, day DATE, visitors INTEGER, transactions INTEGER, pos_revenue DOUBLE, note VARCHAR)`);
for (let i = 0; i < foot.length; i += 1000) await run(`INSERT INTO ops.store_daily_traffic VALUES ${foot.slice(i, i + 1000).join(',')}`);

// ---- marketing ----
await run(`CREATE TABLE marketing.campaign_spend AS SELECT * FROM read_csv(${csv('marketing_spend_by_campaign.csv')})`);
await run(`CREATE VIEW marketing.v_roas AS SELECT month, source, sum(spend_eur) AS spend_eur, sum(attributed_revenue_eur) AS revenue_eur,
  round(sum(attributed_revenue_eur) / nullif(sum(spend_eur), 0), 2) AS roas FROM marketing.campaign_spend GROUP BY ALL`);

await run('CHECKPOINT');
const counts = await (await con.runAndReadAll(`SELECT schema_name, table_name, estimated_size FROM duckdb_tables() ORDER BY 1,2`)).getRows();
console.log('northwind_dw.duckdb:', counts.map(r => `${r[0]}.${r[1]}=${r[2]}`).join(' '));
con.closeSync?.(); inst.closeSync?.();

// register the database file in the seed manifest (loaded by huey-seed.js like the CSVs)
const manifestFile = path.join(dataDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
if (!manifest.files.includes('northwind_dw.duckdb')) manifest.files.unshift('northwind_dw.duckdb');
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
