'use strict';
// Static content for the Juniper & Rye Coffee House seed.

const STORE = {
  name: 'Juniper & Rye Coffee House',
  address: '2217 SE Division St, Portland, OR 97202',
  phone: '+1 503-236-4417',
  instagram: 'juniperandrye.pdx',
};

const OWNER = {
  name: 'Priya Natarajan',
  email: 'priya@juniperrye.cafe',
  password: 'Juniper#Rye2026',
  pin: '4826',
};

// id, name, email, role, pin, active
const STAFF = [
  ['user-manager-dana', 'Dana Whitfield', 'dana@juniperrye.cafe', 'manager', '2604', 1],
  ['user-cashier-marco', 'Marco Delgado', 'marco@juniperrye.cafe', 'cashier', '1357', 1],
  ['user-cashier-hana', 'Hana Okafor', 'hana@juniperrye.cafe', 'cashier', '8642', 1],
  ['user-server-theo', 'Theo Lindqvist', 'theo@juniperrye.cafe', 'server', '5150', 1],
  ['user-server-june', 'June Park', 'june.park@juniperrye.cafe', 'server', '7788', 1],
  ['user-chef-sam', 'Samuel "Sam" Abernathy', 'sam@juniperrye.cafe', 'chef', '9021', 1],
  ['user-chef-lucia', 'Lucía Ferreira', 'lucia@juniperrye.cafe', 'chef', '3141', 1],
  ['user-cashier-kai', 'Kai Morrison', 'kai.m@juniperrye.cafe', 'cashier', '2468', 0],
];

const CATEGORIES = [
  ['cat-espresso', 'Espresso Bar', '#78350F', '☕'],
  ['cat-brew', 'Brew Bar & Tea', '#065F46', '🫖'],
  ['cat-cold', 'Cold Drinks', '#0E7490', '🧊'],
  ['cat-pastry', 'Pastries & Bakes', '#D97706', '🥐'],
  ['cat-breakfast', 'Breakfast', '#EA580C', '🍳'],
  ['cat-lunch', 'Sandwiches & Bowls', '#4D7C0F', '🥪'],
  ['cat-retail', 'Retail & Beans', '#6B21A8', '🛍️'],
];

// id, name, description, required, min, max, [addons]
const ADDON_GROUPS = [
  ['ag-milk', 'Milk', 'Choose a milk', 1, 1, 1, [
    ['add-milk-whole', 'Whole milk', 0],
    ['add-milk-oat', 'Oat (Oatly Barista)', 0.75],
    ['add-milk-almond', 'Almond', 0.75],
    ['add-milk-soy', 'Soy', 0.5],
    ['add-milk-2pct', '2% milk', 0],
    ['add-milk-breve', 'Breve (half & half)', 0.5],
  ]],
  ['ag-shots', 'Extra Shots', 'Add espresso', 0, 0, 3, [
    ['add-shot-extra', 'Extra shot', 1.0],
    ['add-shot-decaf', 'Make it decaf', 0],
    ['add-shot-ristretto', 'Ristretto shots', 0],
  ]],
  ['ag-syrup', 'Syrups', 'House-made syrups', 0, 0, 2, [
    ['add-syr-vanilla', 'Vanilla bean', 0.6],
    ['add-syr-lavender', 'Lavender honey', 0.75],
    ['add-syr-cardamom', 'Cardamom', 0.75],
    ['add-syr-caramel', 'Burnt caramel', 0.6],
    ['add-syr-sf-vanilla', 'Sugar-free vanilla', 0.6],
  ]],
  ['ag-size', 'Size Upgrade', null, 0, 0, 1, [
    ['add-size-16', 'Large (16 oz)', 0.85],
  ]],
  ['ag-breakfast', 'Breakfast Add-ons', null, 0, 0, 4, [
    ['add-bf-bacon', 'Applewood bacon', 2.5],
    ['add-bf-avocado', 'Half avocado', 2.0],
    ['add-bf-egg', 'Extra egg', 1.5],
    ['add-bf-gf', 'Gluten-free bread', 1.5],
    ['add-bf-chorizo', 'Soy chorizo', 2.25],
  ]],
];

const MILK_GROUPS = ['ag-milk', 'ag-shots', 'ag-syrup', 'ag-size'];

// Weights express how often each item sells.
const PRODUCTS = [
  { id: 'p-latte', cat: 'cat-espresso', name: 'Latte', price: 5.25, cost: 1.1, w: 14, groups: MILK_GROUPS, img: 'prod-latte.webp', desc: 'Double shot of our Rye Blend with steamed milk.' },
  { id: 'p-flatwhite', cat: 'cat-espresso', name: 'Flat White', price: 4.95, cost: 1.0, w: 7, groups: ['ag-milk', 'ag-shots'], img: 'prod-flat-white.webp' },
  { id: 'p-cappuccino', cat: 'cat-espresso', name: 'Cappuccino', price: 4.75, cost: 0.95, w: 8, groups: ['ag-milk', 'ag-shots', 'ag-syrup'] },
  { id: 'p-cortado', cat: 'cat-espresso', name: 'Cortado', price: 4.25, cost: 0.8, w: 5, groups: ['ag-milk', 'ag-shots'] },
  { id: 'p-americano', cat: 'cat-espresso', name: 'Americano', price: 3.75, cost: 0.5, w: 8, groups: ['ag-shots', 'ag-size'] },
  { id: 'p-espresso', cat: 'cat-espresso', name: 'Espresso (double)', price: 3.25, cost: 0.45, w: 4, groups: ['ag-shots'] },
  { id: 'p-mocha', cat: 'cat-espresso', name: 'Dark Chocolate Mocha', price: 5.75, cost: 1.35, w: 5, groups: MILK_GROUPS, desc: 'Made with Woodblock 70% chocolate ganache.' },
  { id: 'p-lavender', cat: 'cat-espresso', name: 'Lavender Honey Latte', price: 6.0, cost: 1.3, w: 6, groups: ['ag-milk', 'ag-shots', 'ag-size'], tags: ['seasonal'] },
  { id: 'p-cardamom', cat: 'cat-espresso', name: 'Cardamom Rose Latte', price: 6.25, cost: 1.35, w: 3, groups: ['ag-milk', 'ag-shots'] },
  { id: 'p-pumpkin', cat: 'cat-espresso', name: 'Maple Pumpkin Latte (Fall)', price: 6.5, cost: 1.45, w: 5, groups: MILK_GROUPS, tags: ['seasonal'] },
  { id: 'p-chai', cat: 'cat-brew', name: 'Masala Chai Latte', price: 5.5, cost: 1.05, w: 7, groups: ['ag-milk', 'ag-size', 'ag-shots'], desc: "Priya's mom's chai recipe, brewed in-house daily." },
  { id: 'p-pourover', cat: 'cat-brew', name: 'Pour-Over (single origin)', price: 5.5, cost: 1.2, w: 4, desc: 'Ask about this week’s rotating origin.' },
  { id: 'p-drip', cat: 'cat-brew', name: 'Drip Coffee', price: 3.0, cost: 0.35, w: 9, groups: ['ag-size'] },
  { id: 'p-matcha', cat: 'cat-brew', name: 'Ceremonial Matcha Latte', price: 6.0, cost: 1.6, w: 5, groups: ['ag-milk', 'ag-syrup', 'ag-size'] },
  { id: 'p-londonfog', cat: 'cat-brew', name: 'London Fog', price: 5.0, cost: 0.9, w: 3, groups: ['ag-milk', 'ag-syrup'] },
  { id: 'p-tea', cat: 'cat-brew', name: 'Loose Leaf Tea (pot)', price: 4.0, cost: 0.6, w: 3, desc: 'Earl Grey, sencha, chamomile, or rooibos.' },
  { id: 'p-hotchoc', cat: 'cat-brew', name: 'Hot Chocolate', price: 4.5, cost: 0.95, w: 3, groups: ['ag-milk', 'ag-syrup'] },
  { id: 'p-coldbrew', cat: 'cat-cold', name: 'Nitro Cold Brew', price: 5.25, cost: 0.7, w: 7, img: 'prod-cold-brew.webp' },
  { id: 'p-icedlatte', cat: 'cat-cold', name: 'Iced Latte', price: 5.5, cost: 1.15, w: 8, groups: MILK_GROUPS },
  { id: 'p-icedmatcha', cat: 'cat-cold', name: 'Iced Strawberry Matcha', price: 6.5, cost: 1.8, w: 4, groups: ['ag-milk'] },
  { id: 'p-lemonade', cat: 'cat-cold', name: 'Marionberry Lemonade', price: 4.5, cost: 0.8, w: 3 },
  { id: 'p-kombucha', cat: 'cat-cold', name: 'Brew Dr. Kombucha (bottle)', price: 4.75, cost: 2.4, w: 2, stock: 22, sku: 'RTL-KMB-14' },
  { id: 'p-sparkling', cat: 'cat-cold', name: 'Topo Chico', price: 3.0, cost: 1.1, w: 2, stock: 31, sku: 'RTL-TOPO' },
  { id: 'p-croissant', cat: 'cat-pastry', name: 'Almond Croissant', price: 4.75, cost: 1.6, w: 8, img: 'prod-croissant.webp', stock: 9 },
  { id: 'p-butter-croissant', cat: 'cat-pastry', name: 'Butter Croissant', price: 3.95, cost: 1.2, w: 6, stock: 14 },
  { id: 'p-scone', cat: 'cat-pastry', name: 'Blueberry Lemon Scone', price: 3.95, cost: 0.9, w: 5, img: 'prod-scone.webp', stock: 7 },
  { id: 'p-cardamom-bun', cat: 'cat-pastry', name: 'Cardamom Knot', price: 4.5, cost: 1.0, w: 6, stock: 5 },
  { id: 'p-banana', cat: 'cat-pastry', name: 'Banana Walnut Bread', price: 3.75, cost: 0.8, w: 3 },
  { id: 'p-cookie', cat: 'cat-pastry', name: 'Brown Butter Choc Chip Cookie', price: 3.25, cost: 0.6, w: 5 },
  { id: 'p-gf-muffin', cat: 'cat-pastry', name: 'GF Morning Glory Muffin', price: 4.25, cost: 1.1, w: 2, tags: ['gluten_free', 'vegan'] },
  { id: 'p-toast', cat: 'cat-breakfast', name: 'Avocado Sourdough Toast', price: 11.5, cost: 3.2, w: 6, groups: ['ag-breakfast'], img: 'prod-toast.webp', tags: ['vegetarian'] },
  { id: 'p-burrito', cat: 'cat-breakfast', name: 'Breakfast Burrito', price: 12.0, cost: 3.4, w: 6, groups: ['ag-breakfast'], desc: 'Scrambled eggs, potatoes, cheddar, salsa verde.' },
  { id: 'p-bagel', cat: 'cat-breakfast', name: 'Everything Bagel & Schmear', price: 5.5, cost: 1.1, w: 4, groups: ['ag-breakfast'] },
  { id: 'p-oats', cat: 'cat-breakfast', name: 'Overnight Oats with Berries', price: 7.5, cost: 1.9, w: 3, tags: ['vegan'] },
  { id: 'p-eggsando', cat: 'cat-breakfast', name: 'Egg & Gruyère Sando', price: 10.5, cost: 2.8, w: 5, groups: ['ag-breakfast'] },
  { id: 'p-shakshuka', cat: 'cat-breakfast', name: 'Shakshuka (weekends)', price: 14.0, cost: 3.9, w: 2, groups: ['ag-breakfast'] },
  { id: 'p-turkey', cat: 'cat-lunch', name: 'Turkey Pesto Panini', price: 13.5, cost: 4.1, w: 5 },
  { id: 'p-caprese', cat: 'cat-lunch', name: 'Caprese Focaccia', price: 12.5, cost: 3.5, w: 4, tags: ['vegetarian'] },
  { id: 'p-grainbowl', cat: 'cat-lunch', name: 'Farro Harvest Bowl', price: 14.5, cost: 4.0, w: 3, tags: ['vegan'] },
  { id: 'p-soup', cat: 'cat-lunch', name: 'Soup of the Day + Bread', price: 8.5, cost: 2.0, w: 3 },
  { id: 'p-grilledcheese', cat: 'cat-lunch', name: 'Grilled Cheese & Tomato Soup', price: 11.0, cost: 2.9, w: 3 },
  { id: 'p-beans-rye', cat: 'cat-retail', name: 'Rye Blend Whole Beans 12oz', price: 18.0, cost: 8.5, w: 1, stock: 16, sku: 'BEAN-RYE-12' },
  { id: 'p-beans-eth', cat: 'cat-retail', name: 'Ethiopia Guji Whole Beans 12oz', price: 21.0, cost: 10.2, w: 1, stock: 4, sku: 'BEAN-ETH-12' },
  { id: 'p-mug', cat: 'cat-retail', name: 'Juniper & Rye Ceramic Mug', price: 24.0, cost: 9.0, w: 0.3, stock: 11, sku: 'MERCH-MUG' },
  { id: 'p-tote', cat: 'cat-retail', name: 'Canvas Tote', price: 16.0, cost: 5.5, w: 0.2, stock: 0, sku: 'MERCH-TOTE' },
  { id: 'p-giftcard', cat: 'cat-retail', name: 'Gift Card $25', price: 25.0, w: 0.3 },
  { id: 'p-pumpkin-bread', cat: 'cat-pastry', name: 'Pumpkin Spice Loaf (retired)', price: 3.95, w: 0, active: 0 },
];

const MORNING_BOOST = new Set(['cat-espresso', 'cat-brew', 'cat-pastry', 'cat-breakfast']);
function weightedProduct(rnd, hour) {
  const ws = PRODUCTS.map((p) => {
    if (!p.w || p.active === 0) return 0;
    let w = p.w;
    if (hour < 11 && MORNING_BOOST.has(p.cat)) w *= 1.4;
    if (hour >= 11 && hour < 15 && p.cat === 'cat-lunch') w *= 3;
    if (hour < 11 && p.cat === 'cat-lunch') w *= 0.1;
    if (hour >= 13 && p.cat === 'cat-cold') w *= 1.6;
    return w;
  });
  const total = ws.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < PRODUCTS.length; i++) {
    if ((r -= ws[i]) < 0) return PRODUCTS[i];
  }
  return PRODUCTS[0];
}
function pickMilk(rnd) {
  const r = rnd();
  return r < 0.42 ? 'add-milk-oat' : r < 0.75 ? 'add-milk-whole' : r < 0.85 ? 'add-milk-almond' : r < 0.92 ? 'add-milk-2pct' : r < 0.97 ? 'add-milk-soy' : 'add-milk-breve';
}

// id, number, capacity, floor, section, x, y
const TABLES = [
  ['tbl-w1', 'W1', 2, 'Main Room', 'Window Bar', 14, 18],
  ['tbl-w2', 'W2', 2, 'Main Room', 'Window Bar', 30, 18],
  ['tbl-w3', 'W3', 2, 'Main Room', 'Window Bar', 46, 18],
  ['tbl-1', '1', 4, 'Main Room', 'Floor', 20, 52],
  ['tbl-2', '2', 4, 'Main Room', 'Floor', 42, 52],
  ['tbl-3', '3', 2, 'Main Room', 'Floor', 64, 52],
  ['tbl-4', '4', 6, 'Main Room', 'Big Table', 40, 82],
  ['tbl-c1', 'Couch', 4, 'Main Room', 'Lounge', 82, 30],
  ['tbl-p1', 'P1', 4, 'Patio', 'Patio', 25, 40],
  ['tbl-p2', 'P2', 4, 'Patio', 'Patio', 55, 40],
  ['tbl-p3', 'P3', 2, 'Patio', 'Patio', 80, 40],
];

// name, phone (E.164), email, notes, address
const CUSTOMERS = [
  ['Megan Holloway', '+15032847719', 'megan.holloway@gmail.com', 'Oat flat white, extra hot. Brings her own KeepCup.', '3415 SE Clinton St, Portland, OR 97202'],
  ['Raj Venkataraman', '+15038129043', 'raj.v@fastmail.com', null, '2040 SE 26th Ave, Portland, OR 97214'],
  ['Tomás Aguilar', '+19712035588', null, 'Regular — works at the bike shop next door.', null],
  ['Brianna Kowalski', '+15035550172', 'bri.kowalski@outlook.com', null, '1188 SE Ladd Ave, Portland, OR 97214'],
  ['Ethan Cho', '+15037714820', 'ethancho.pdx@gmail.com', 'Allergic to tree nuts — no almond milk, no almond croissant!!', '4122 SE Woodward St, Portland, OR 97202'],
  ['Sofia Marchetti', '+15039948211', 'sofia@marchettidesign.co', 'Orders catering for Friday studio meetings (~12 drinks).', '901 SE Hawthorne Blvd Ste 4, Portland, OR 97214'],
  ['Dev Patel', '+19718823307', null, null, null],
  ['Olivia Brandt', '+15032205694', 'olivia.brandt@pdx.edu', null, '2611 SE Division St Apt 3B, Portland, OR 97202'],
  ['Marcus Greene', '+15036671250', 'mgreene@hey.com', 'Decaf only after 2pm', null],
  ['Hannah Lee', '+15034438926', 'hannahlee89@gmail.com', null, '3720 SE Kelly St, Portland, OR 97202'],
  ['Kenji Watanabe', '+19714106632', 'kenji.w@protonmail.com', null, null],
  ['Ruth Abernathy', '+15032318845', null, 'Sam’s mom :) — always comp the cookie', '5506 SE Mitchell St, Portland, OR 97206'],
  ['Carlos Mendoza', '+15037028861', 'cmendoza@nwnatural.com', null, '2930 SE Tibbetts St, Portland, OR 97202'],
  ['Aisha Rahman', '+19715527143', 'aisha.rahman@gmail.com', 'Sends her cortado back if it’s over 140°F', null],
  ['Jake Sorensen', '+15039061177', null, null, null],
  ['Nora Fitzgerald', '+15036184402', 'nora.fitz@icloud.com', null, '1734 SE Lambert St, Portland, OR 97202'],
  ['Sam & Lily Chen', '+15038307765', 'chenfamilypdx@gmail.com', 'Two kids hot chocolates, not too hot', '4507 SE Lincoln St, Portland, OR 97215'],
  ['Wesley Turner', '+19713369024', 'wes.turner@nike.com', null, null],
  ['Gabriela Ortiz', '+15032976630', 'gaby.ortiz@yahoo.com', null, '3016 SE 30th Ave, Portland, OR 97202'],
  ['Liam O’Connell', '+15035129987', null, null, null],
  ['Priyanka Iyer', '+19712840051', 'priyanka.iyer@ohsu.edu', 'Night-shift nurse, comes in at 7:05 sharp', '2201 SE 39th Ave, Portland, OR 97214'],
  ['Hector Ramirez', '+15037750312', null, null, '1435 SE 37th Ave, Portland, OR 97214'],
  ['Emily Nakamura', '+15039213348', 'emily.nakamura@gmail.com', null, null],
  ['Zoe Whitaker', '+15034058127', 'zoe@whitakerceramics.com', 'Makes our mugs! Wholesale contact.', '2328 SE Ankeny St, Portland, OR 97214'],
  ['Andre Baptiste', '+19716639904', null, null, null],
  ['Claire Dubois', '+15036021186', 'claire.dubois@gmail.com', null, '3101 SE Taylor St, Portland, OR 97214'],
  ['Mohammed Al-Sayed', '+15032749950', 'm.alsayed@gmail.com', null, null],
  ['Taylor Brooks', '+15038843376', null, 'they/them', null],
  ['Isabella Romano', '+19715048813', 'bella.romano@gmail.com', null, '4005 SE Brooklyn St, Portland, OR 97202'],
  ['Grace Kim', '+15033317042', 'gracek@reed.edu', 'Reed student, uses student discount', '3203 SE Woodstock Blvd, Portland, OR 97202'],
  ['Noah Feldman', '+15037796614', null, null, null],
  ['Fatima Yusuf', '+19714429087', 'fatima.yusuf@gmail.com', null, '2808 SE Grant St, Portland, OR 97214'],
  ['Ben Hartley', '+15036558820', 'ben@hartleyhomes.com', null, null],
  ['Lucy Tran', '+15039827763', 'lucytran.art@gmail.com', null, '1922 SE Caruthers St, Portland, OR 97214'],
  ['Oscar Lindgren', '+19717730145', null, null, null],
  ['Maria Santos', '+15032106674', 'msantos@kp.org', null, '3640 SE Harrison St, Portland, OR 97214'],
  ['David Goldberg', '+15034461938', 'dgoldberg@stoel.com', 'Invoice monthly — law office coffee tab', '760 SW 9th Ave, Portland, OR 97205'],
  ['Chloe Martin', '+15038890251', null, null, null],
  ['Ian McAllister', '+19713378812', 'ian.mcallister@gmail.com', null, null],
  ['Yuki Tanaka', '+15036730493', 'yuki.t@gmail.com', null, '2145 SE Clinton St, Portland, OR 97202'],
  ['Rebecca Stone', '+15035014482', null, null, null],
  ['Jordan Ellis', '+15037246690', 'jordan.ellis@gmail.com', null, null],
  ['Ana Lucía Vargas', '+19719801126', 'analucia.v@gmail.com', null, null],
  ['Peter Novak', '+15032683301', null, 'Prefers paper receipts', null],
  ['Simone Clarke', '+15039170048', 'simone.clarke@gmail.com', null, null],
  ['walk-in (Venmo) Chris', '+15035550199', null, 'Duplicate of Chris R.? — merge later', null],
  ['Chris Rasmussen', '+15034447016', 'chrisras@gmail.com', null, null],
  ['Ellie Park', '+15038261154', null, null, null],
  ['Victor Huang', '+19712207785', 'victor.huang@intel.com', null, null],
  ['Amara Nwosu', '+15036607739', 'amara.nwosu@gmail.com', null, '3512 SE Brooklyn St, Portland, OR 97202'],
  ['Henry Walsh', '+15031195527', null, null, null],
  ['Mei Lin', '+15037438810', 'meilin.pdx@gmail.com', null, null],
  ['Diego Castillo', '+19718524406', null, null, null],
  ['Sarah O’Neill', '+15039956243', 'sarah.oneill@gmail.com', null, null],
  ['Ollie Bergstrom', '+15032552190', null, 'Dog: Biscuit (pup cup!)', null],
];

// id, name, unit, stock, low threshold, unit cost
const SUPPLIES = [
  ['sup-rye-beans', 'Rye Blend Espresso Beans', 'kg', 6.4, 3, 19.5],
  ['sup-decaf', 'Swiss Water Decaf Beans', 'kg', 1.1, 1, 22.0],
  ['sup-whole-milk', 'Whole Milk (Organic Valley)', 'l', 18, 8, 1.45],
  ['sup-oat-milk', 'Oatly Barista', 'l', 4.5, 6, 3.9],
  ['sup-almond', 'Almond Milk', 'l', 3.0, 2, 3.4],
  ['sup-chai', 'House Chai Concentrate', 'l', 2.2, 1.5, 6.0],
  ['sup-matcha', 'Ceremonial Matcha', 'g', 140, 100, 0.32],
  ['sup-cups-12', '12oz Hot Cups', 'each', 420, 200, 0.11],
  ['sup-cups-16', '16oz Cold Cups', 'each', 160, 200, 0.13],
  ['sup-lids', 'Sip Lids', 'each', 610, 300, 0.04],
  ['sup-sourdough', 'Sourdough Loaves (Little T)', 'each', 3, 2, 6.5],
  ['sup-avocado', 'Avocados', 'each', 11, 6, 1.25],
  ['sup-eggs', 'Pasture Eggs', 'each', 54, 24, 0.42],
];
const SUPPLY_MOVES = [
  ['sup-rye-beans', 10, 'receive', 'kg', 10, 'Roaster delivery — Heart Coffee invoice #4471', '2026-11-10 15:20:00'],
  ['sup-rye-beans', -0.4, 'waste', 'kg', 6.4, 'Dialing in new grinder burrs', '2026-11-14 15:02:00'],
  ['sup-whole-milk', 24, 'receive', 'l', 24, 'Organic Valley standing order', '2026-11-15 14:10:00'],
  ['sup-oat-milk', 12, 'receive', 'l', 12, 'Case of Oatly x12', '2026-11-08 16:40:00'],
  ['sup-oat-milk', -1, 'waste', 'l', 4.5, 'Carton left out overnight', '2026-11-16 14:55:00'],
  ['sup-cups-16', -40, 'adjustment', 'each', 160, 'Count correction after inventory', '2026-11-12 23:30:00'],
  ['sup-eggs', 60, 'receive', 'each', 60, 'Deck Family Farm', '2026-11-13 15:00:00'],
];
const RECIPES = [
  ['p-latte', [['sup-rye-beans', 0.018, 'kg'], ['sup-whole-milk', 0.24, 'l'], ['sup-cups-12', 1, 'each'], ['sup-lids', 1, 'each']]],
  ['p-flatwhite', [['sup-rye-beans', 0.018, 'kg'], ['sup-whole-milk', 0.15, 'l']]],
  ['p-cappuccino', [['sup-rye-beans', 0.018, 'kg'], ['sup-whole-milk', 0.16, 'l'], ['sup-cups-12', 1, 'each']]],
  ['p-chai', [['sup-chai', 0.12, 'l'], ['sup-whole-milk', 0.18, 'l'], ['sup-cups-12', 1, 'each']]],
  ['p-matcha', [['sup-matcha', 4, 'g'], ['sup-whole-milk', 0.24, 'l']]],
  ['p-toast', [['sup-sourdough', 0.12, 'each'], ['sup-avocado', 1, 'each']]],
  ['p-icedlatte', [['sup-rye-beans', 0.018, 'kg'], ['sup-whole-milk', 0.2, 'l'], ['sup-cups-16', 1, 'each']]],
];

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Coffee & Dairy', 'Bakery Wholesale', 'Supplies & Packaging', 'Repairs & Maintenance', 'Marketing', 'Payroll'];
// category, description, payee, amount, days ago, notes
const EXPENSES = [];
(function buildExpenses() {
  for (let m = 0; m < 5; m++) {
    const d0 = 150 - m * 30;
    EXPENSES.push(['Rent', `Rent — ${['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][m + 1]} 2026`, 'Division Street Properties LLC', 4850, d0 - 2, null]);
    EXPENSES.push(['Utilities', 'PGE electric', 'Portland General Electric', 380 + m * 17.4, d0 - 9, null]);
    EXPENSES.push(['Utilities', 'Water/sewer', 'Portland Water Bureau', 142.6 + m * 3, d0 - 12, null]);
    EXPENSES.push(['Utilities', 'Internet', 'CenturyLink Business', 89.99, d0 - 5, null]);
    EXPENSES.push(['Marketing', 'Instagram promo boost', 'Meta Platforms', 60 + (m % 2) * 40, d0 - 18, m === 2 ? 'Fall menu launch' : null]);
    for (let w = 0; w < 4; w++) {
      const d = d0 - w * 7 - 1;
      EXPENSES.push(['Coffee & Dairy', 'Roasted coffee — weekly', 'Heart Coffee Roasters', 412 + ((m * 7 + w * 13) % 60), d, null]);
      EXPENSES.push(['Coffee & Dairy', 'Milk & oat milk standing order', 'Organic Valley / UNFI', 268.4 + ((m + w) % 5) * 11, d - 2, null]);
      EXPENSES.push(['Bakery Wholesale', 'Croissants, knots & loaves', 'Little T American Baker', 335 + ((m * 3 + w) % 7) * 9.5, d - 3, null]);
    }
    EXPENSES.push(['Payroll', 'Payroll — 1st half', 'Gusto', 9620 + m * 210, d0 - 14, null]);
    EXPENSES.push(['Payroll', 'Payroll — 2nd half', 'Gusto', 9880 + m * 190, d0 - 29, null]);
    EXPENSES.push(['Supplies & Packaging', 'Cups, lids, sleeves', 'WebstaurantStore', 286.15 + m * 12, d0 - 16, null]);
  }
  EXPENSES.push(['Repairs & Maintenance', 'La Marzocco group head gaskets + service call', 'Espresso Parts NW', 465.0, 63, 'Group 2 was leaking since Tuesday. Tech replaced gaskets and shower screens on all groups; recommended descaling every 6 weeks.']);
  EXPENSES.push(['Repairs & Maintenance', 'Plumber — dish sink drain', 'Rose City Plumbing', 238.5, 41, null]);
  EXPENSES.push(['Repairs & Maintenance', 'Mahlkönig burrs replacement', 'Espresso Parts NW', 189.0, 4, null]);
  EXPENSES.push(['Marketing', 'Hawthorne Street Fair booth', 'Hawthorne Blvd Business Assn', 150.0, 95, null]);
  EXPENSES.push(['Supplies & Packaging', 'Printed loyalty cards (2,000)', 'Moo Print', 74.5, 120, null]);
  EXPENSES.push(['Supplies & Packaging', 'Receipt paper rolls (50)', 'Amazon Business', 46.99, 22, null]);
})();

const ITEM_NOTES = ['extra hot', 'half sweet', 'light ice', 'no foam', 'for here mug', 'cut in half please', 'kid temp', 'warm it up', 'dry cappuccino', 'no tomato', 'sauce on the side'];
const ORDER_NOTES = ['Name on cup: Bea', 'Pickup at 8:15', 'Birthday — add a candle 🎂', 'Customer is waiting on patio', 'Paid with gift card partially last visit', 'Leave at front desk, suite 4'];
const CANCEL_REASONS = ['Customer left before order was made', 'Duplicate ticket', 'Rang up wrong item', 'DoorDash driver cancelled'];

module.exports = {
  STORE, OWNER, STAFF, CATEGORIES, ADDON_GROUPS, PRODUCTS, weightedProduct, pickMilk, TABLES, CUSTOMERS,
  SUPPLIES, SUPPLY_MOVES, RECIPES, EXPENSE_CATEGORIES, EXPENSES, ITEM_NOTES, ORDER_NOTES, CANCEL_REASONS,
};
