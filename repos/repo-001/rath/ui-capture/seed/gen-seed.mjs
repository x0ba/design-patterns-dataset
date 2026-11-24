// Generates rath-seed.json: the dataset history of an analyst at "Northwind Outdoor
// Co." (DTC outdoor gear retailer) after ~11 months of using Rath. Each dataset is
// stored the way Rath stores an imported file: fields as IMuteFieldBase with
// col_<i>_<n> fids, rows keyed by fid. Deterministic (seeded RNG).
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.dirname(new URL(import.meta.url).pathname);
let s = 20261117;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const wpick = (a, w) => { let t = w.reduce((x, y) => x + y, 0) * rnd(); for (let i = 0; i < a.length; i++) { if ((t -= w[i]) <= 0) return a[i]; } return a.at(-1); };
const int = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const norm = (m, sd) => m + sd * Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const r2 = (x) => Math.round(x * 100) / 100;
const pad = (n) => String(n).padStart(2, '0');
const day = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return day(d); };
const between = (a, b) => addDays(a, int(0, (new Date(b) - new Date(a)) / 864e5));

/** spec: [name, analyticType?, semanticType?, geoRole?]; '?' lets Rath infer like a fresh upload */
function table(cols, rows, { typed = false } = {}) {
    // mirrors transFileData(): c_<i> fids, '?' types for inference, plus the Rath Row ID index column
    const fields = cols.map((c, i) => ({
        fid: `c_${i}`,
        name: c[0],
        analyticType: c[3] ? c[1] : '?',
        semanticType: c[3] ? c[2] : '?',
        disable: '?',
        geoRole: c[3] && c[3] !== 'none' ? c[3] : '?',
    }));
    fields.push({ fid: '__rath_index_col_key__', name: 'Rath Row ID', analyticType: 'dimension', semanticType: 'ordinal', disable: false, geoRole: 'none' });
    const data = rows.map((r, ri) => ({ ...Object.fromEntries(fields.slice(0, -1).map((f, i) => [f.fid, r[i]])), __rath_index_col_key__: ri }));
    return { fields, rows: data };
}

const REGIONS = { West: ['CA', 'WA', 'OR', 'CO', 'UT', 'AZ'], Northeast: ['NY', 'MA', 'PA', 'NJ', 'VT'], South: ['TX', 'FL', 'GA', 'NC', 'TN'], Midwest: ['IL', 'MN', 'MI', 'OH', 'WI'] };
const CATS = { Tents: [189, 649], 'Sleeping Bags': [79, 329], Backpacks: [59, 289], Footwear: [89, 219], Apparel: [25, 180], 'Camp Kitchen': [15, 140], Climbing: [12, 420], Accessories: [8, 60] };
const SKUS = Object.fromEntries(Object.keys(CATS).map((c) => [c, Array.from({ length: 8 }, (_, i) => `${c.slice(0, 3).toUpperCase()}-${1000 + int(0, 8999)}${'ABCDEFGH'[i]}`)]));

function orders(n) {
    const rows = [];
    for (let i = 0; i < n; i++) {
        const date = between('2025-09-01', '2026-11-15');
        const m = +date.slice(5, 7);
        const region = wpick(Object.keys(REGIONS), [38, 24, 22, 16]);
        const cat = wpick(Object.keys(CATS), m >= 5 && m <= 8 ? [18, 8, 16, 14, 20, 10, 8, 6] : [8, 16, 12, 16, 28, 6, 6, 8]);
        const [lo, hi] = CATS[cat];
        const price = r2(lo + rnd() * (hi - lo));
        const units = wpick([1, 2, 3, 4, 6], [62, 22, 9, 5, 2]);
        const disc = wpick([0, 0.1, 0.15, 0.2, 0.3], [55, 18, 12, 10, 5]);
        const channel = wpick(['Web', 'Mobile App', 'Retail POS', 'Marketplace'], [46, 24, 18, 12]);
        const ship = channel === 'Retail POS' ? 0 : Math.max(1, Math.round(norm(region === 'West' ? 2.5 : 4, 1.4)));
        rows.push([
            `NW-${(260000 + i * 7 + int(0, 6)).toString()}`, date, region, rnd() < 0.02 ? pick(REGIONS[region]).toLowerCase() : pick(REGIONS[region]), channel, cat, pick(SKUS[cat]), units, price, disc,
            r2(units * price * (1 - disc)), ship, rnd() < (cat === 'Footwear' ? 0.14 : 0.05) + ship * 0.006 ? 'Yes' : 'No',
            wpick(['New', 'Returning', 'Loyalty Member'], [34, 41, 25]), rnd() < 0.015 ? null : wpick(['Credit Card', 'PayPal', 'Apple Pay', 'Gift Card', 'Affirm'], [52, 20, 16, 4, 8]),
        ]);
    }
    rows.sort((a, b) => a[1].localeCompare(b[1]));
    return table([['order_id'], ['order_date'], ['region'], ['state'], ['channel'], ['product_category'], ['sku'], ['units'], ['unit_price'], ['discount_pct'], ['revenue'], ['shipping_days'], ['returned'], ['customer_segment'], ['payment_method']], rows);
}

function churn(n) {
    const rows = [];
    for (let i = 0; i < n; i++) {
        const plan = wpick(['Trail Club Basic', 'Trail Club Plus', 'Summit Pro'], [50, 35, 15]);
        const fee = { 'Trail Club Basic': 9.99, 'Trail Club Plus': 19.99, 'Summit Pro': 39 }[plan];
        const tenure = Math.max(1, Math.round(Math.abs(norm(14, 11))));
        const contract = wpick(['Monthly', 'Annual', 'Two-year'], [58, 32, 10]);
        const tickets = Math.max(0, Math.round(norm(1.2, 1.3)));
        const nps = Math.min(10, Math.max(0, Math.round(norm(7.4 - tickets * 0.6, 2))));
        const p = 0.08 + (contract === 'Monthly' ? 0.18 : 0) + tickets * 0.05 - tenure * 0.004 + (nps < 6 ? 0.15 : 0);
        rows.push([`C${String(100000 + i * 13).slice(0, 6)}`, between('2024-01-10', '2026-09-30'), plan, tenure, fee, r2(fee * tenure * (0.95 + rnd() * 0.1)), contract,
            wpick(['Credit Card', 'Bank Transfer', 'PayPal'], [60, 15, 25]), tickets, rnd() < 0.06 ? null : nps, wpick(['Organic', 'Paid Social', 'Referral', 'Email', 'Retail Signup'], [30, 25, 15, 18, 12]), rnd() < p ? 'Yes' : 'No']);
    }
    return table([['customer_id'], ['signup_date'], ['plan'], ['tenure_months'], ['monthly_fee'], ['total_charges'], ['contract_type'], ['payment_method'], ['support_tickets_90d'], ['nps_score'], ['acquisition_channel'], ['churned']], rows);
}

function sessions(n) {
    const pages = ['/', '/collections/tents', '/collections/footwear', '/sale', '/blog/best-ultralight-tents-2026', '/products/ridgeline-2p-tent', '/products/alpine-down-20f', '/stores', '/trail-club'];
    const rows = [];
    for (let i = 0; i < n; i++) {
        const device = wpick(['mobile', 'desktop', 'tablet'], [61, 33, 6]);
        const src = wpick(['google / organic', 'google / cpc', 'instagram / paid', 'email / newsletter', '(direct)', 'tiktok / paid', 'reddit / referral'], [30, 18, 14, 12, 16, 7, 3]);
        const pv = Math.max(1, Math.round(Math.abs(norm(device === 'desktop' ? 5 : 3.4, 3))));
        const conv = rnd() < (src.startsWith('email') ? 0.06 : 0.025) * (device === 'desktop' ? 1.4 : 1) + pv * 0.003;
        rows.push([between('2026-10-01', '2026-10-31'), device, device === 'desktop' ? wpick(['Chrome', 'Safari', 'Edge', 'Firefox'], [62, 20, 12, 6]) : wpick(['Safari', 'Chrome', 'Samsung Internet'], [58, 36, 6]),
            wpick(['United States', 'Canada', 'United Kingdom', 'Germany', 'Australia'], [82, 9, 4, 3, 2]), pick(pages), src, pv, pv === 1 ? int(3, 40) : int(30, 900), pv === 1 ? 1 : 0, conv ? 1 : 0, conv ? r2(40 + rnd() * 380) : 0]);
    }
    return table([['session_date'], ['device'], ['browser'], ['country'], ['landing_page'], ['source_medium'], ['pageviews'], ['session_duration_s'], ['bounced'], ['converted'], ['order_value']], rows);
}

function marketing() {
    const ch = { 'Google Ads': ['Brand Search', 'Non-brand Tents', 'PMax Fall'], Meta: ['Fall Layering Carousel', 'Retargeting 30d', 'Lookalike Trail Club'], TikTok: ['Creator Gear Haul', 'Spark Ads - Hiking'], Email: ['Weekly Newsletter', 'Abandoned Cart'], Pinterest: ['Camp Kitchen Pins'] };
    const rows = [];
    for (let w = 0; w < 52; w++) {
        const week = addDays('2025-11-17', w * 7);
        for (const [c, camps] of Object.entries(ch)) for (const camp of camps) {
            if (rnd() < 0.12) continue;
            const spend = c === 'Email' ? r2(150 + rnd() * 120) : r2(Math.abs(norm(c === 'Google Ads' ? 5200 : 2400, 900)));
            const imp = Math.round(spend * (c === 'Email' ? 210 : int(90, 260)));
            const clicks = Math.round(imp * (c === 'Email' ? 0.031 : 0.009 + rnd() * 0.012));
            const conv = Math.round(clicks * (camp.includes('Brand') || camp.includes('Cart') ? 0.07 : 0.021) * (0.7 + rnd() * 0.6));
            rows.push([week, c, camp, spend, imp, clicks, conv, conv ? r2(spend / conv) : null, r2(conv * (95 + rnd() * 60))]);
        }
    }
    return table([['week_start'], ['channel'], ['campaign'], ['spend_usd'], ['impressions'], ['clicks'], ['conversions'], ['cpa'], ['attributed_revenue']], rows);
}

function tickets(n) {
    const agents = ['Priya Raman', 'Marcus Bell', 'Sofia Alvarez', 'Jonah Whitaker', 'Mei Tanaka', 'Unassigned'];
    const subj = {
        'Order Status': ['Where is my order?', 'Tracking hasn\'t updated in 5 days', 'Order shows delivered but nothing on porch'],
        Returns: ['Return label not working', 'Boots too small, need exchange for 10.5', 'Refund still not showing after 2 weeks'],
        'Product Defect': ['Tent pole snapped on first trip', 'Zipper on sleeping bag separated', 'Sole delaminating after 3 months of use'],
        Billing: ['Charged twice for Trail Club', 'Promo code FALL20 not applied', 'Affirm payment question'],
        Account: ['Can\'t reset password', 'Merge two accounts please', 'Unsubscribe from texts'],
    };
    const rows = [];
    for (let i = 0; i < n; i++) {
        const opened = between('2026-01-02', '2026-11-16');
        const cat = wpick(Object.keys(subj), [34, 24, 16, 14, 12]);
        const pri = wpick(['Low', 'Normal', 'High', 'Urgent'], [22, 52, 20, 6]);
        const age = (new Date('2026-11-17') - new Date(opened)) / 864e5;
        const status = age < 3 ? wpick(['Open', 'Pending', 'Solved'], [50, 30, 20]) : age < 14 ? wpick(['Open', 'Pending', 'Solved', 'Closed'], [10, 15, 40, 35]) : wpick(['Solved', 'Closed', 'Pending'], [20, 78, 2]);
        const frt = r2(Math.abs(norm(pri === 'Urgent' ? 1.2 : 6, 4)));
        const resolved = status === 'Solved' || status === 'Closed';
        rows.push([`TCK-${41200 + i}`, opened, pick(subj[cat]), cat, pri, status === 'Open' && rnd() < 0.4 ? 'Unassigned' : pick(agents.slice(0, 5)), status,
            wpick(['Email', 'Chat', 'Phone', 'Instagram DM'], [45, 35, 15, 5]), frt, resolved ? r2(frt + Math.abs(norm(30, 28))) : null, resolved && rnd() < 0.55 ? wpick([1, 2, 3, 4, 5], [6, 6, 12, 30, 46]) : null]);
    }
    return table([['ticket_id'], ['opened_at'], ['subject'], ['category'], ['priority'], ['assignee'], ['status'], ['channel'], ['first_response_hrs'], ['resolution_hrs'], ['csat']], rows);
}

function inventory() {
    const rows = [];
    for (const wh of ['Reno, NV', 'Columbus, OH', 'Allentown, PA', 'Dallas, TX']) for (const [cat, skus] of Object.entries(SKUS)) for (const sku of skus) {
        if (rnd() < 0.15) continue;
        const rp = int(20, 160);
        const on = Math.max(0, Math.round(norm(rp * 1.6, rp)));
        rows.push([sku, wh, cat, on, rp, int(7, 63), r2(CATS[cat][0] * (0.35 + rnd() * 0.15)), between('2026-06-01', '2026-11-14'), on === 0 ? 'Out of stock' : on < rp ? 'Reorder' : 'OK']);
    }
    return table([['sku'], ['warehouse'], ['category'], ['on_hand'], ['reorder_point'], ['lead_time_days'], ['unit_cost'], ['last_restock'], ['stock_status']], rows);
}

function headcount() {
    const depts = { Engineering: ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager'], Merchandising: ['Buyer', 'Senior Buyer', 'Planner'], Marketing: ['Growth Marketer', 'Content Strategist', 'Marketing Manager'], 'Customer Experience': ['CX Specialist', 'CX Lead'], Operations: ['Warehouse Associate', 'Fulfillment Supervisor', 'Logistics Analyst'], Finance: ['Financial Analyst', 'Controller'], Retail: ['Store Associate', 'Store Manager'] };
    const first = ['Ava', 'Liam', 'Noah', 'Emma', 'Olivia', 'Mateo', 'Aisha', 'Kenji', 'Zoe', 'Ethan', 'Lucia', 'Omar', 'Hannah', 'Diego', 'Grace', 'Ravi', 'Chloe', 'Samuel', 'Nora', 'Wei'];
    const last = ['Nguyen', 'Patel', 'Garcia', 'Kim', 'Johnson', 'Okafor', 'Schmidt', 'Rossi', 'Haddad', 'Lopez', 'Murphy', 'Chen', 'Silva', 'Brooks', 'Ivanova'];
    const rows = [];
    for (let i = 0; i < 342; i++) {
        const d = wpick(Object.keys(depts), [16, 8, 9, 12, 28, 5, 22]);
        const t = pick(depts[d]);
        const lvl = /Senior|Lead|Supervisor|Manager/.test(t) ? int(3, 4) : /Staff|Controller/.test(t) ? 5 : int(1, 3);
        const base = { Engineering: 128000, Merchandising: 86000, Marketing: 82000, 'Customer Experience': 54000, Operations: 47000, Finance: 92000, Retail: 39000 }[d];
        rows.push([`E${2000 + i}`, `${pick(first)} ${pick(last)}`, d, t, lvl, d === 'Retail' ? pick(['Boulder, CO', 'Portland, OR', 'Bend, OR', 'Asheville, NC']) : d === 'Operations' ? pick(['Reno, NV', 'Columbus, OH', 'Allentown, PA', 'Dallas, TX']) : pick(['Denver, CO (HQ)', 'Remote - US', 'Remote - US', 'Seattle, WA']),
            between('2016-03-01', '2026-10-20'), Math.round(base * (1 + (lvl - 1) * 0.18) * (0.9 + rnd() * 0.2) / 500) * 500, rnd() < 0.08 ? null : wpick(['Exceeds', 'Meets', 'Below', 'Too New to Rate'], [22, 61, 7, 10]), d === 'Engineering' || d === 'Marketing' ? wpick(['Remote', 'Hybrid'], [55, 45]) : wpick(['Onsite', 'Hybrid'], [85, 15])]);
    }
    return table([['employee_id'], ['full_name'], ['department'], ['title'], ['level'], ['location'], ['hire_date'], ['base_salary'], ['performance_rating'], ['work_mode']], rows);
}

function sensors() {
    const rows = [];
    const start = new Date('2026-11-03T00:00:00Z');
    for (let h = 0; h < 14 * 24; h++) for (const line of ['Line A', 'Line B']) for (const m of ['SEW-01', 'SEW-02', 'PRESS-03'].filter(() => rnd() < 0.62)) {
        const t = new Date(start.getTime() + h * 36e5);
        const temp = norm(m.startsWith('PRESS') ? 61 : 38, 2.5) + (line === 'Line B' && h > 200 ? 4 : 0);
        const vib = Math.abs(norm(2.1, 0.5)) + (temp > 64 ? 1.5 : 0);
        rows.push([t.toISOString().slice(0, 16).replace('T', ' '), line, m, r2(temp), r2(vib), Math.round(norm(m.startsWith('PRESS') ? 410 : 180, 12)), Math.max(0, Math.round(norm(42, 6))), Math.max(0, Math.round(norm(vib > 3 ? 3 : 0.6, 1)))]);
    }
    return table([['reading_time'], ['line'], ['machine_id'], ['temperature_c'], ['vibration_mm_s'], ['pressure_kpa'], ['output_units'], ['defect_count']], rows);
}

function abTest() {
    const rows = [];
    for (let i = 0; i < 1800; i++) {
        const v = rnd() < 0.5 ? 'control' : 'one_page_checkout';
        const dev = wpick(['mobile', 'desktop'], [64, 36]);
        const conv = rnd() < (v === 'control' ? 0.31 : 0.355) * (dev === 'desktop' ? 1.15 : 1);
        rows.push([`u_${(98765 + i * 31).toString(36)}`, v, between('2026-08-04', '2026-08-31'), dev, wpick(['new', 'returning'], [55, 45]), int(1, 6), conv ? 1 : 0, conv ? r2(Math.abs(norm(142, 70))) : 0, conv ? int(48, 410) : null]);
    }
    return table([['user_id'], ['variant'], ['assigned_date'], ['device'], ['visitor_type'], ['cart_items'], ['purchased'], ['order_value'], ['checkout_seconds']], rows);
}

function pulse() {
    const comments = [
        'Love the team, but the new WMS rollout has been rough.',
        'More clarity on Q1 priorities please',
        '',
        'Honestly the 4-day pilot in the Reno warehouse was the best thing that happened this year. Productivity went up, people are happier, and turnover in our shift dropped. Please make it permanent and extend to Columbus.',
        'n/a',
        'Manager is great. Tools are slow.',
        'I feel like decisions get made in Slack DMs and the rest of us find out later. Would like more all-hands or written updates on the roadmap — especially around the marketplace expansion.',
        'Pay is below market for senior engineers, several of us are getting recruiter pings weekly.',
        'good',
        'The gear discount is a huge perk!!',
        'Not enough headcount on CX during peak, we were drowning in Black Friday tickets last year and it looks like the same plan this year.',
        'Would appreciate a clearer promotion path for store associates',
        '-',
        'Onboarding was smooth, my buddy (Mei) was super helpful.',
    ];
    const rows = [];
    for (let i = 0; i < 264; i++) {
        const d = wpick(['Engineering', 'Merchandising', 'Marketing', 'Customer Experience', 'Operations', 'Finance', 'Retail'], [16, 8, 9, 12, 28, 5, 22]);
        const e = Math.min(5, Math.max(1, Math.round(norm(d === 'Customer Experience' ? 3.2 : 3.9, 0.9))));
        rows.push([`R-${5000 + i}`, pick(['2026-Q1', '2026-Q2', '2026-Q3']), d, wpick(['<1 yr', '1-3 yrs', '3-5 yrs', '5+ yrs'], [24, 38, 22, 16]), e, Math.min(5, Math.max(1, Math.round(norm(e - 0.2, 0.8)))), Math.min(5, Math.max(1, Math.round(norm(3.4, 1)))), Math.min(10, Math.max(0, Math.round(norm(e * 1.7, 1.8)))), rnd() < 0.55 ? pick(comments) : null]);
    }
    return table([['response_id'], ['survey_wave'], ['department'], ['tenure_band'], ['engagement_1to5'], ['manager_support_1to5'], ['workload_1to5'], ['enps_0to10'], ['comment']], rows);
}

function stores() {
    const rows = [];
    const st = { 'Boulder, CO': [40.0176, -105.2797], 'Portland, OR': [45.5231, -122.6765], 'Bend, OR': [44.0582, -121.3153], 'Asheville, NC': [35.5951, -82.5515], 'Salt Lake City, UT': [40.7608, -111.891], 'Burlington, VT': [44.4759, -73.2121] };
    for (let m = 0; m < 24; m++) for (const [name, [lat, lng]] of Object.entries(st)) {
        if (name === 'Burlington, VT' && m < 9) continue;
        const month = `${2024 + Math.floor((m + 11) / 12)}-${pad(((m + 11) % 12) + 1)}`;
        const mm = ((m + 11) % 12) + 1;
        const seasonal = 1 + 0.35 * Math.sin(((mm - 3) / 12) * 2 * Math.PI) + (mm === 12 ? 0.4 : 0);
        const foot = Math.round(norm(9200, 1500) * seasonal);
        rows.push([month, name, lat, lng, foot, r2(foot * (0.18 + rnd() * 0.06)), r2(foot * (0.18 + rnd() * 0.06) * norm(118, 12)), int(9, 22)]);
    }
    return table([['month'], ['store'], ['latitude', 'dimension', 'quantitative', 'latitude'], ['longitude', 'dimension', 'quantitative', 'longitude'], ['foot_traffic'], ['transactions'], ['net_sales'], ['staff_on_roster']], rows);
}

function messyExport() {
    const rows = [];
    for (let i = 0; i < 118; i++) {
        const vendor = pick(['Big Agnes Supply', 'big agnes supply', 'Sierra Textile Co', 'SIERRA TEXTILE CO.', 'Cascade Packaging', 'Uline', 'Pinecrest Logistics']);
        rows.push([`PO-${7800 + i}`, rnd() < 0.5 ? between('2026-02-01', '2026-10-30') : between('2026-02-01', '2026-10-30').replace(/(\d+)-(\d+)-(\d+)/, '$2/$3/$1'), vendor, rnd() < 0.1 ? '' : r2(Math.abs(norm(4200, 3100))), pick(['USD', 'USD', 'USD', 'usd', 'CAD']), pick(['Approved', 'approved', 'Pending', 'Rejected', 'Received']), rnd() < 0.3 ? null : pick(['rush', 'split shipment', 'net 30', 'see email from Dana 3/14', 'dup?'])]);
    }
    return table([['PO Number'], ['Date'], ['Vendor'], ['Amount'], ['Currency'], ['Status '], ['Notes']], rows);
}

function sales2024() {
    const t = orders(1500);
    const dateFid = t.fields[1].fid;
    for (const r of t.rows) r[dateFid] = r[dateFid].replace(/^2026|^2025/, (y) => String(+y - 2));
    return t;
}

const datasets = [
    // [name, tag, generator, createdDaysAgo, editedMinutesAgo, userTagGroup]
    ['orders_2025-09_to_2026-11.csv', '@file', () => orders(2400), 61, 38, 0],
    ['support_tickets_2026 (Airtable)', '@air_table', () => tickets(940), 44, 190, 3],
    ['web_sessions_oct2026.json', '@restful', () => sessions(3000), 16, 60 * 26],
    ['trail_club_churn_q3.xlsx', '@file', () => churn(1250), 52, 60 * 24 * 2 + 45, 1],
    ['marketing_spend_weekly.csv', '@file', () => marketing(), 120, 60 * 24 * 4],
    ['inventory_snapshot (postgres: ops.inventory)', '@database', () => inventory(), 33, 60 * 24 * 6],
    ['Bike Sharing.rath-demo.json', '@demo', '../datasets/ds-bikesharing-service.json', 330, 60 * 24 * 9],
    ['plant_b_sensor_readings.csv', '@file', () => sensors(), 12, 60 * 24 * 11],
    ['checkout_ab_test_aug.csv', '@file', () => abTest(), 88, 60 * 24 * 23, 6],
    ['store_traffic_monthly.csv', '@file', () => stores(), 150, 60 * 24 * 37],
    ['employee_pulse_survey_2026.csv', '@file', () => pulse(), 140, 60 * 24 * 49],
    ['hr_headcount_2026-10.xlsx', '@file', () => headcount(), 70, 60 * 24 * 58],
    ['untitled_export (3).csv', '@file', () => messyExport(), 95, 60 * 24 * 94],
    ['Students\' Performance.rath-demo.json', '@demo', '../datasets/ds-students-service.json', 300, 60 * 24 * 121],
    ['sales_2024_archive.csv', '@file', () => sales2024(), 240, 60 * 24 * 160],
    ['Cars.rath-demo.json', '@demo', '../datasets/ds-cars-service.json', 334, 60 * 24 * 210],
    ['Car Sales.rath-demo.json', '@demo', '../datasets/ds-carsales-service.json', 280, 60 * 24 * 268],
];

const out = datasets.map(([name, tag, gen, createdDaysAgo, editedMinutesAgo, userTagGroup]) => {
    const base = { name, tag, createdDaysAgo, editedMinutesAgo, userTagGroup: userTagGroup ?? null };
    if (typeof gen === 'string') return { ...base, rowsFrom: gen };
    return { ...base, ...gen() };
});
fs.writeFileSync(path.join(outDir, 'rath-seed.json'), JSON.stringify({ datasets: out, localStorage: { lang: 'en-US' } }));
console.log(out.map((d) => `${d.name}: ${d.rows ? d.rows.length : d.rowsFrom}`).join('\n'));
