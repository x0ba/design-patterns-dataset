// Seeds DumbBudget through its own HTTP API (PIN login + POST /api/transactions).
// Usage: node .ui-capture/seed.mjs http://localhost:5418 2468
const BASE = process.argv[2] || 'http://localhost:5418';
const PIN = process.argv[3] || '2468';
const TODAY = '2026-11-17';
const START = '2025-08-01';

// deterministic RNG
let s = 20251117;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = a => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100;
const chance = p => rnd() < p;

const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = str => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d); };

const tx = [];
const add = (type, date, amount, description, category, notes, recurring) =>
  tx.push({ type, date, amount, description, category, notes: notes || '', ...(recurring ? { recurring } : {}) });

// ---- Recurring (stored once, expanded by the server) ----
add('expense', '2025-08-01', 1875, 'Rent - Alder St apartment', 'Bills', 'Autopay via Bilt. Lease renews Aug 2026.', { pattern: 'every 1st of the month', until: '2026-07-31' });
add('expense', '2026-08-01', 1940, 'Rent - Alder St apartment', 'Bills', 'New lease, +$65 a month. Ugh.', { pattern: 'every 1st of the month', until: null });
add('expense', '2025-08-09', 15.49, 'Netflix', 'Subscriptions', '', { pattern: 'every 1 month', until: null });
add('expense', '2025-08-14', 11.99, 'Spotify Premium', 'Subscriptions', '', { pattern: 'every 1 month', until: null });
add('expense', '2025-08-20', 2.99, 'iCloud+ 200GB', 'Subscriptions', '', { pattern: 'every 1 month', until: null });
add('expense', '2025-08-05', 49, 'Crunch Fitness membership', 'Health', 'Cancelled in March — switched to running club', { pattern: 'every 1 month', until: '2026-03-05' });
add('expense', '2025-08-22', 65, 'Visible Wireless phone plan', 'Bills', '', { pattern: 'every 1 month', until: null });
add('expense', '2025-08-12', 70, 'Xfinity internet', 'Bills', 'Promo rate ends Feb — call to renegotiate', { pattern: 'every 1 month', until: null });
add('expense', '2025-09-03', 612.40, 'Progressive auto insurance (6 mo)', 'Transport', 'Policy #PRG-88214-03', { pattern: 'every 6 months', until: null });
add('expense', '2025-08-25', 250, 'Transfer to HYSA (Ally)', 'Savings', 'Emergency fund goal: $10k', { pattern: 'every 1 month', until: null });
add('expense', '2025-08-28', 287.16, 'Student loan - Nelnet', 'Bills', '', { pattern: 'every 1 month', until: null });
add('expense', '2026-01-10', 14.99, 'NYT Games + Cooking', 'Subscriptions', 'Annual would be cheaper...', { pattern: 'every 1 month', until: null });
add('expense', '2025-10-02', 139, 'Amazon Prime (annual)', 'Subscriptions', '', { pattern: 'every 1 year', until: null });

// ---- Monthly one-offs ----
const groceries = ['Trader Joes', 'trader joes', 'Safeway', 'New Seasons Market', 'Costco', 'Fred Meyer', 'WinCo', 'Grocery Outlet', 'H Mart'];
const dining = ['Chipotle', 'Pok Pok Wing', 'Lardo', 'Por Qué No? Taqueria', 'Sizzle Pie', 'Blue Star Donuts', 'Thai Peacock', 'Nongs Khao Man Gai', 'Pine State Biscuits', 'DoorDash - Lelas Bistro', 'Uber Eats - Sushi Ichiban', 'Stumptown Coffee', 'Coava Coffee', 'Kens Artisan Pizza', 'brunch with Maya @ Screen Door', 'Burgerville', 'Hat Yai', 'happy hour - Bible Club'];
const transport = ['Shell gas', 'Chevron', 'Costco Gas', 'TriMet HOP card reload', 'Lyft', 'Uber to PDX', 'Parking - SmartPark', 'BIKETOWN ride', 'Car wash'];
const shopping = ['Amazon', 'Target', 'REI', 'Powells Books', 'Uniqlo', 'IKEA', 'Home Depot', 'Fred Meyer - household', 'Etsy', 'Goodwill Bins', 'Muji'];
const entertainment = ['Movie tickets - Hollywood Theatre', 'Steam', 'Concert - Crystal Ballroom', 'Bowling @ Grand Central', 'Timbers tickets', 'Book club wine', 'Trivia night'];
const health = ['Walgreens pharmacy', 'CVS', 'Copay - Dr. Nguyen', 'ZoomCare visit', 'Contacts - 1-800 Contacts', 'Dental cleaning copay', 'Vitamins'];
const pets = ['Chewy - cat food', 'Petco litter', 'Banfield vet visit', 'Cat toys'];

const ensureNotes = {
  'Costco': ['bulk paper towels + coffee beans', 'stocked up for Thanksgiving', ''],
  'Amazon': ['new HDMI cable + desk lamp', 'birthday gift for Dad', 'returned the headphones, refund pending', ''],
  'IKEA': ['KALLAX shelf for office', ''],
  'Banfield vet visit': ['Miso annual checkup + vaccines', 'Miso ate a hair tie again 🙄', ''],
  'Target': ['', 'cleaning supplies + shampoo'],
};

let d = parse(START);
const end = parse(TODAY);
let payToggle = 0;
while (d <= end) {
  const ds = fmt(d);
  const dow = d.getDay();
  const dom = d.getDate();
  const lastDom = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

  // Paychecks: 15th and last day of month (semi-monthly), slight variation from withholding changes
  if (dom === 15 || dom === lastDom) {
    const amt = d >= parse('2026-04-01') ? between(2612.4, 2614.9) : between(2481.0, 2486.6);
    add('income', ds, amt, 'Paycheck - Hollis + Reed Design', null,
      d.getMonth() === 3 && dom === 15 && d.getFullYear() === 2026 ? 'First check after the raise (5%)' : '');
    payToggle++;
  }

  // Groceries roughly twice a week
  if ((dow === 0 || dow === 3) && chance(0.85)) {
    const store = pick(groceries);
    const amt = store === 'Costco' ? between(140, 260) : between(28, 118);
    add('expense', ds, amt, store, chance(0.7) ? 'Groceries' : 'Food', (ensureNotes[store] && pick(ensureNotes[store])) || '');
  }
  // Dining
  if (chance(dow >= 5 ? 0.55 : 0.28)) {
    const place = pick(dining);
    const amt = /Coffee|Donuts/.test(place) ? between(4.5, 13) : between(12, 68);
    add('expense', ds, amt, place, 'Food', chance(0.08) ? pick(['split with Jordan', 'team lunch, getting reimbursed', 'date night', 'tip was 22%']) : '');
  }
  // Transport
  if (chance(0.17)) {
    const t = pick(transport);
    const amt = /gas|Gas/.test(t) ? between(38, 62) : /Uber to PDX/.test(t) ? between(34, 48) : between(3, 25);
    add('expense', ds, amt, t, 'Transport', '');
  }
  // Shopping
  if (chance(0.11)) {
    const sh = pick(shopping);
    const amt = sh === 'IKEA' ? between(89, 260) : between(12, 140);
    add('expense', ds, amt, sh, 'Shopping', (ensureNotes[sh] && pick(ensureNotes[sh])) || '');
  }
  if (chance(0.06)) add('expense', ds, between(12, 85), pick(entertainment), 'Entertainment', '');
  if (chance(0.035)) add('expense', ds, between(8, 60), pick(health), 'Health', '');
  if (chance(0.035)) {
    const p = pick(pets);
    add('expense', ds, p.includes('vet') ? between(95, 240) : between(18, 64), p, 'Pets', (ensureNotes[p] && pick(ensureNotes[p])) || '');
  }
  // Utilities: PGE + water mid-month
  if (dom === 18) {
    const m = d.getMonth();
    const winter = [10, 11, 0, 1].includes(m);
    add('expense', ds, winter ? between(96, 148) : between(48, 79), 'PGE electric', 'Bills', winter && chance(0.4) ? 'Space heater month' : '');
  }
  if (dom === 21 && d.getMonth() % 3 === 0) add('expense', ds, between(118, 164), 'Portland Water Bureau (quarterly)', 'Bills', '');

  d.setDate(d.getDate() + 1);
}

// ---- Irregular / life events ----
const events = [
  ['income', '2025-09-12', 850, 'Freelance - logo for Ridgeline Coffee', null, 'Invoice #0142, paid via Stripe'],
  ['income', '2025-11-03', 1200, 'Freelance - brand refresh, Fern and Fig', null, 'Half up front, rest on delivery'],
  ['income', '2025-12-19', 1200, 'Freelance - brand refresh, Fern and Fig (final)', null, ''],
  ['income', '2026-02-27', 425, 'Freelance - menu design, Hat Yai', null, ''],
  ['income', '2026-06-08', 975, 'Freelance - wedding invites for Priya', null, 'Friends discount'],
  ['income', '2026-09-22', 1600, 'Freelance - website mockups, Wildfang', null, 'Net 30, finally paid'],
  ['income', '2026-03-14', 1834.22, 'Federal tax refund', null, 'Put most of it into HYSA'],
  ['income', '2026-04-02', 212, 'Oregon state tax refund', null, ''],
  ['income', '2025-12-15', 1500, 'Year-end bonus', null, 'after tax'],
  ['income', '2025-10-06', 45, 'Venmo from Jake - concert tix', null, ''],
  ['income', '2026-05-18', 62.5, 'Venmo from Sam (cabin groceries)', null, ''],
  ['income', '2026-07-09', 120, 'Sold old bike on Craigslist', null, ''],
  ['income', '2026-01-08', 89.99, 'Amazon refund - headphones', null, 'finally came through'],
  ['income', '2026-10-30', 38.4, 'Cashback redemption - Chase', null, ''],
  ['income', '2026-11-14', 300, 'Freelance - holiday poster, Powells', null, 'Rush job'],
  ['expense', '2025-11-26', 486.2, 'Alaska Airlines - SFO for Thanksgiving', 'Travel', 'Flying home Wed, back Sun'],
  ['expense', '2025-11-27', 64.0, 'Wine for Thanksgiving dinner', 'Food', ''],
  ['expense', '2025-12-08', 312.45, 'Holiday gifts (Mom, Dad, Leah)', 'Gifts', 'Mom: Le Creuset, Dad: books, Leah: Switch game'],
  ['expense', '2025-12-14', 58, 'Secret Santa - work', 'Gifts', '$50 limit lol'],
  ['expense', '2026-01-22', 742.88, 'Mechanic - brakes + rotors', 'Transport', 'Subaru shop on SE Division. Should be good for 40k miles'],
  ['expense', '2026-02-14', 148.6, 'Valentines Day dinner - Le Pigeon', 'Food', ''],
  ['expense', '2026-03-20', 1299, 'New laptop (MacBook Air)', 'Shopping', 'Old one died. Partially reimbursed? ask HR about equipment stipend'],
  ['expense', '2026-04-11', 95, 'DMV - registration renewal', 'Transport', ''],
  ['expense', '2026-05-16', 380, 'Cabin weekend - Mt Hood (my share)', 'Travel', 'Airbnb split 4 ways'],
  ['expense', '2026-06-20', 210, 'Wedding gift - Priya and Dev', 'Gifts', ''],
  ['expense', '2026-07-03', 1124.5, 'Flights - Mexico City', 'Travel', 'Oct trip! booked early for the deal'],
  ['expense', '2026-07-31', 1950, 'Security deposit top-up, lease renewal fee', 'Bills', 'Non-refundable admin fee $75 included'],
  ['expense', '2026-08-15', 89, 'Oregon Zoo membership', 'Entertainment', ''],
  ['expense', '2026-09-02', 465, 'ER visit copay', 'Health', 'Sprained ankle at the climbing gym. Insurance EOB pending'],
  ['expense', '2026-10-10', 640.75, 'Hotel - Condesa, CDMX (5 nights)', 'Travel', ''],
  ['expense', '2026-10-12', 182.3, 'CDMX food + mezcal', 'Travel', 'tacos al pastor every single day'],
  ['expense', '2026-10-14', 74, 'Frida Kahlo museum + Uber', 'Travel', ''],
  ['expense', '2026-11-02', 118, 'Halloween party supplies (late reimb.)', 'Other', ''],
  ['expense', '2026-11-09', 26.5, 'misc', 'Other', ''],
  ['expense', '2026-11-11', 54.99, 'Winter tires deposit - Les Schwab', 'Transport', 'Install appt Nov 22'],
  ['expense', '2026-11-16', 41.2, 'Birthday card + flowers for Mom', 'Gifts', ''],
];
for (const e of events) add(...e);

tx.sort((a, b) => a.date.localeCompare(b.date));

// ---- Push through API ----
const login = await fetch(`${BASE}/verify-pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: PIN }) });
if (!login.ok) throw new Error('login failed: ' + login.status + ' ' + await login.text());
const cookies = (login.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');

let ok = 0;
for (const t of tx) {
  const body = { type: t.type, amount: t.amount, description: t.description, date: t.date, notes: t.notes };
  if (t.type === 'expense') body.category = t.category;
  if (t.recurring) body.recurring = t.recurring;
  const r = await fetch(`${BASE}/api/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookies }, body: JSON.stringify(body) });
  if (!r.ok) { console.error('failed', r.status, await r.text(), body); continue; }
  ok++;
}
console.log(`seeded ${ok}/${tx.length} transactions`);
