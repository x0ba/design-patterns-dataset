// Generates .ui-capture/seed-data.sql: an established shop's catalog, orders,
// refunds, pages, menus and settings, written against minshop's D1 schema.
// Deterministic (seeded PRNG) so re-runs produce the same store.
//   node .ui-capture/gen-seed.mjs > .ui-capture/seed-data.sql
import { readFileSync, existsSync } from 'node:fs';

let seed = 20260117;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const chance = (p) => rnd() < p;
const ALPH = '0123456789abcdefghjkmnpqrstvwxyz';
const pid = (prefix) => prefix + '_' + Array.from({ length: 10 }, () => ALPH[Math.floor(rnd() * 32)]).join('');
const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('');
const b62 = (n) => Array.from({ length: n }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rnd() * 62)]).join('');
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const out = [];
const ins = (table, row) => out.push(`INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).map(q).join(', ')});`);
const ts = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

// Media uploaded through the admin API by seed.sh (original_name -> image_key).
const mediaMap = existsSync(new URL('./media-map.json', import.meta.url))
  ? JSON.parse(readFileSync(new URL('./media-map.json', import.meta.url), 'utf8'))
  : {};

// ── Categories ──────────────────────────────────────────────────────────────
const cats = [
  ['Coffee & Tea', 'coffee-tea', null, '2026-01-04 18:02:11'],
  ['Coffee', 'coffee', 'coffee-tea', '2026-01-04 18:02:40'],
  ['Tea', 'tea', 'coffee-tea', '2026-01-04 18:03:02'],
  ['Kitchen & Table', 'kitchen-table', null, '2026-01-04 18:04:19'],
  ['Home', 'home', null, '2026-01-04 18:05:47'],
  ['Candles', 'candles', 'home', '2026-02-11 21:14:05'],
  ['Apparel', 'apparel', null, '2026-01-04 18:06:30'],
  ['Stationery', 'stationery', null, '2026-01-09 16:40:12'],
  ['Outdoors', 'outdoors', null, '2026-03-02 19:22:51'],
  ['Gift Sets', 'gift-sets', null, '2026-10-28 17:10:03'],
];
const catId = {};
cats.forEach(([name, slug, parent, created], i) => {
  catId[slug] = i + 1;
  out.push(`INSERT INTO categories (id, name, slug, parent_id, created_at, public_id) VALUES (${i + 1}, ${q(name)}, ${q(slug)}, ${parent ? catId[parent] : 'NULL'}, ${q(created)}, ${q(pid('cat'))});`);
});

// ── Products ────────────────────────────────────────────────────────────────
// [name, slug, cats, price, stock, weight g, created, description, opts]
const P = [
  ['Forest Floor House Blend', 'forest-floor-house-blend', ['coffee'], 1800, 64, 380, '2026-01-05',
    'Our everyday coffee. A medium roast blend of washed Colombian and natural Ethiopian beans, roasted in small batches every Tuesday by our friends at Slabtown Roasting.\n\nTasting notes: milk chocolate, dried cherry, toasted hazelnut. 12 oz bag.',
    { variantLabel: 'Grind', variants: [['Whole bean', 1800, 40, 'FFH-WB'], ['Drip / pour-over', 1800, 18, 'FFH-DR'], ['Espresso', 1800, 6, 'FFH-ES'], ['French press', 1800, 0, 'FFH-FP']] }],
  ['Cascadia Dark Roast', 'cascadia-dark-roast', ['coffee'], 1900, 41, 380, '2026-01-05',
    'A bold, smoky dark roast from Sumatra and Brazil. Heavy body, low acidity, and a long cocoa finish that stands up to milk. 12 oz bag.',
    { variantLabel: 'Grind', variants: [['Whole bean', 1900, 30, 'CDR-WB'], ['Drip / pour-over', 1900, 11, 'CDR-DR']] }],
  ['Ethiopia Guji Single Origin', 'ethiopia-guji', ['coffee'], 2400, 4, 340, '2026-04-18',
    'Natural-process heirloom varietals from smallholder farms in Guji. Bright and juicy — blueberry, jasmine, lemon candy. Limited lot; roasted light. 10 oz bag.', {}],
  ['Decaf Swiss Water Colombia', 'decaf-swiss-water', ['coffee'], 1850, 22, 380, '2026-02-02',
    'Chemical-free Swiss Water decaf that actually tastes like coffee. Brown sugar, red apple, cocoa. 12 oz bag.', {}],
  ['Coffee Subscription Sampler', 'coffee-sampler', ['coffee', 'gift-sets'], 4200, 15, 900, '2026-09-30',
    'Three 6 oz bags: Forest Floor, Cascadia Dark, and whatever single origin we are most excited about this month. A great way to find your favorite.', {}],
  ['Old Growth Earl Grey', 'old-growth-earl-grey', ['tea'], 1400, 37, 120, '2026-01-07',
    'Ceylon black tea with cold-pressed Calabrian bergamot and a few cornflower petals. Loose leaf, 3.5 oz tin — about 40 cups.', {}],
  ['Mt. Hood Mountain Mint', 'mountain-mint-tea', ['tea'], 1200, 52, 90, '2026-01-07',
    'Caffeine-free peppermint and spearmint grown in the Willamette Valley. Clean, cooling, and very good iced. 2 oz tin.', {}],
  ['Sencha Morning Green Tea', 'sencha-green-tea', ['tea'], 1600, 0, 100, '2026-03-14',
    'First-flush sencha from Shizuoka. Grassy and sweet with a little marine umami. Brew at 170°F for 60 seconds. Back in stock in December.', {}],
  ['Ceramic Pour-Over Dripper', 'ceramic-pour-over-dripper', ['coffee', 'kitchen-table'], 3400, 19, 420, '2026-01-12',
    'Wheel-thrown stoneware dripper made in Portland by Eastside Clay Co. Fits standard #2 cone filters. Each one is a little different — glaze pooling and small speckles are part of the charm.',
    { variantLabel: 'Glaze', variants: [['Fog white', 3400, 9, 'DRP-FOG'], ['Moss green', 3400, 7, 'DRP-MOS'], ['Iron red', 3600, 3, 'DRP-IRN']] }],
  ['Stoneware Mug, 12 oz', 'stoneware-mug', ['kitchen-table'], 3200, 58, 450, '2026-01-12',
    'Our best seller. A generous 12 oz mug with a thumb-rest handle, thrown by hand and glazed in small batches. Dishwasher and microwave safe.',
    { variantLabel: 'Glaze', variants: [['Fog white', 3200, 22, 'MUG-FOG'], ['Moss green', 3200, 17, 'MUG-MOS'], ['Iron red', 3200, 14, 'MUG-IRN'], ['Night sky', 3400, 5, 'MUG-NGT']], extras: [['Gift wrap', 500], ['Handwritten note', 0]] }],
  ['Glass Cold Brew Pitcher', 'cold-brew-pitcher', ['coffee', 'kitchen-table'], 3800, 26, 1100, '2026-05-06',
    'Borosilicate glass pitcher with a fine stainless mesh filter. Makes 1 liter of cold brew concentrate overnight. Lid seals tight for the fridge door.', {}],
  ['Walnut Serving Board', 'walnut-serving-board', ['kitchen-table'], 6800, 9, 1400, '2026-01-20',
    'A single slab of Oregon black walnut, finished with food-safe oil and beeswax. 18" × 9". Handles and grain vary — no two are alike.', { extras: [['Gift wrap', 500], ['Engraved initials', 1500]] }],
  ['Maple Spurtle Set', 'maple-spurtle-set', ['kitchen-table'], 2600, 33, 180, '2026-02-20',
    'Two hard maple spurtles (a Scottish stirring stick that is better than a spoon at almost everything). 12" and 9".', {}],
  ['Linen Tea Towels, Set of 2', 'linen-tea-towels', ['kitchen-table', 'home'], 2800, 44, 220, '2026-01-20',
    'Stonewashed European flax linen. Absorbent, quick-drying, and they get softer every wash. 20" × 28" with a hanging loop.',
    { variantLabel: 'Color', variants: [['Natural', 2800, 18, 'TT-NAT'], ['Charcoal stripe', 2800, 15, 'TT-CHR'], ['Rust', 2800, 11, 'TT-RST']] }],
  ['Cast Iron Skillet, 10"', 'cast-iron-skillet', ['kitchen-table'], 5400, 12, 2300, '2026-03-08',
    'Pre-seasoned with flaxseed oil and machined smooth inside. Heavy enough to hold heat, light enough to flip a pancake one-handed.', {}],
  ['Speckled Pasta Bowls, Set of 4', 'speckled-pasta-bowls', ['kitchen-table'], 9600, 3, 2600, '2026-06-15',
    'Wide, shallow stoneware bowls for pasta, salads, and everything in between. 9" across. Speckled oat glaze.', {}],
  ['Enamel Butter Dish', 'enamel-butter-dish', ['kitchen-table'], 2400, 0, 380, '2026-04-03',
    'White enamel over steel with a cobalt rim. Holds a standard stick of butter. Sold out — the next batch arrives in late November.', {}],
  ['Honeycomb Beeswax Wraps', 'beeswax-wraps', ['kitchen-table'], 1800, 71, 90, '2026-02-27',
    'Set of three (small, medium, large) organic cotton wraps coated in beeswax, jojoba, and tree resin. Replaces plastic wrap for about a year.', {}],
  ['Douglas Fir Candle', 'douglas-fir-candle', ['candles', 'home'], 3600, 47, 520, '2026-02-11',
    'Hand-poured coconut-soy wax with fir needle, cedarwood, and a little smoke. 8 oz amber jar, cotton wick, roughly 50 hours of burn time.', { extras: [['Gift wrap', 500]] }],
  ['Rainy Day Candle', 'rainy-day-candle', ['candles', 'home'], 3600, 38, 520, '2026-02-11',
    'Petrichor, wet moss, and vetiver. Smells like opening the window during the first fall rain. 8 oz amber jar.', { extras: [['Gift wrap', 500]] }],
  ['Coastal Fog Candle', 'coastal-fog-candle', ['candles', 'home'], 3600, 5, 520, '2026-05-21',
    'Sea salt, driftwood, and a hint of eucalyptus. Our summer candle — only a few left until next season.', {}],
  ['Campfire Matches', 'campfire-matches', ['candles', 'home'], 900, 120, 60, '2026-02-11',
    'Extra-long safety matches in a screen-printed cardboard tube with a striker on the base. About 50 matches.', {}],
  ['Wool Throw Blanket', 'wool-throw-blanket', ['home'], 14800, 8, 1600, '2026-09-12',
    'Woven at a family mill in Pendleton country from 100% virgin wool. Herringbone pattern, fringed edges. 50" × 70".',
    { variantLabel: 'Color', variants: [['Heather grey', 14800, 4, 'WTB-GRY'], ['Forest', 14800, 3, 'WTB-FOR'], ['Oatmeal', 14800, 1, 'WTB-OAT']] }],
  ['Hand-Thrown Bud Vase', 'bud-vase', ['home'], 2200, 27, 260, '2026-03-30',
    'A small, sturdy vase for a few stems from the yard. About 5" tall. Glazes vary by batch.', {}],
  ['Cedar Sachets, Set of 6', 'cedar-sachets', ['home'], 1600, 0, 150, '2026-01-28',
    'Western red cedar shavings in muslin bags. Tuck into drawers and closets to keep wool happy and moths away.', { active: 0 }],
  ['Fernwood Logo Tee', 'fernwood-logo-tee', ['apparel'], 3000, 66, 200, '2026-01-15',
    'Heavyweight 6.5 oz organic cotton tee with our fern logo screen printed on the chest. Garment-dyed for a lived-in feel. Unisex fit — size down for a closer cut.',
    { variantLabel: 'Size', variants: [['S', 3000, 12, 'TEE-S'], ['M', 3000, 21, 'TEE-M'], ['L', 3000, 19, 'TEE-L'], ['XL', 3000, 10, 'TEE-XL'], ['XXL', 3200, 4, 'TEE-XXL']] }],
  ['Waxed Canvas Apron', 'waxed-canvas-apron', ['apparel', 'kitchen-table'], 5800, 18, 700, '2026-02-06',
    'The apron our roasters wear. Waxed 10 oz canvas, leather neck strap, cross-back webbing, and a pocket that actually fits a phone. Patinas beautifully.', {}],
  ['Merino Watch Cap', 'merino-watch-cap', ['apparel', 'outdoors'], 3400, 24, 90, '2026-10-02',
    'Fine-gauge merino rib knit beanie. Warm, breathable, not itchy. One size.',
    { variantLabel: 'Color', variants: [['Charcoal', 3400, 9, 'CAP-CHR'], ['Rust', 3400, 6, 'CAP-RST'], ['Moss', 3400, 9, 'CAP-MOS']] }],
  ['Fern Crewneck Sweatshirt', 'fern-crewneck', ['apparel'], 6400, 21, 650, '2026-10-02',
    'Midweight loopback cotton fleece with an embroidered fern on the chest. Made in Los Angeles.',
    { variantLabel: 'Size', variants: [['S', 6400, 3, 'CRW-S'], ['M', 6400, 7, 'CRW-M'], ['L', 6400, 8, 'CRW-L'], ['XL', 6400, 3, 'CRW-XL']] }],
  ['Canvas Market Tote', 'canvas-market-tote', ['apparel'], 2400, 89, 300, '2026-01-15',
    '12 oz natural cotton canvas with long shoulder straps and a gusseted bottom. Holds a week of groceries.', {}],
  ['Field Notes Journal', 'field-notes-journal', ['stationery'], 1800, 54, 210, '2026-01-09',
    'A5 lay-flat journal with 160 pages of dot-grid paper, a linen cover, and a ribbon marker. Fountain-pen friendly.',
    { variantLabel: 'Cover', variants: [['Moss', 1800, 20, 'JRN-MOS'], ['Clay', 1800, 18, 'JRN-CLY'], ['Ink', 1800, 16, 'JRN-INK']] }],
  ['Pacific Northwest Postcards', 'pnw-postcards', ['stationery'], 1200, 140, 80, '2026-01-09',
    'A set of 8 risograph postcards by Portland illustrator June Okafor: ferns, ferries, Mt. Hood, and one very determined banana slug.', {}],
  ['Brass Pen', 'brass-pen', ['stationery'], 4400, 14, 60, '2026-05-14',
    'Solid machined brass rollerball that develops a warm patina over time. Takes standard Schmidt refills.', {}],
  ['Letterpress Greeting Cards', 'letterpress-cards', ['stationery'], 700, 230, 30, '2026-02-02',
    'Printed on a 1930s Chandler & Price press on thick cotton paper. Blank inside, with a kraft envelope.',
    { variantLabel: 'Design', variants: [['Thank you', 700, 80, 'CRD-TY'], ['Happy birthday', 700, 64, 'CRD-HB'], ['Thinking of you', 700, 51, 'CRD-TOY'], ['Season\'s greetings', 700, 35, 'CRD-SG']] }],
  ['2027 Wall Calendar', 'wall-calendar-2027', ['stationery'], 2800, 46, 400, '2026-10-20',
    'Twelve months of original linocut prints of Oregon wildflowers. 11" × 17", printed on recycled stock. Ships flat in a rigid mailer.', {}],
  ['Insulated Camp Bottle', 'insulated-camp-bottle', ['outdoors'], 3800, 31, 420, '2026-03-02',
    'Double-wall vacuum insulated steel, 20 oz. Keeps coffee hot for 12 hours and water cold for 24. Powder-coated with our fern logo.', {}],
  ['Enamel Camp Mug', 'enamel-camp-mug', ['outdoors', 'coffee'], 1600, 0, 180, '2026-03-02',
    'Classic speckled enamelware, 12 oz. Goes from campfire to tent to desk.', {}],
  ['Trail Mix Tin', 'trail-mix-tin', ['outdoors'], 1400, 0, 250, '2026-06-01',
    'Our seasonal trail mix: smoked almonds, dried Rainier cherries, dark chocolate chunks, and pepitas. 8 oz reusable tin.', { active: 0 }],
  ['Packable Hammock', 'packable-hammock', ['outdoors'], 7200, 11, 600, '2026-04-25',
    'Ripstop nylon hammock with tree-friendly straps. Packs down to the size of a grapefruit. Rated to 400 lb.', {}],
  ['Folding Camp Stool', 'folding-camp-stool', ['outdoors'], 5200, 2, 1300, '2026-04-25',
    'Beech wood and waxed canvas tripod stool. Folds flat, carries with a leather strap. Surprisingly comfortable.', {}],
  ['The Morning Ritual Gift Set', 'morning-ritual-gift-set', ['gift-sets', 'coffee'], 8900, 17, 1500, '2026-10-28',
    'Everything for a slow morning: a bag of Forest Floor House Blend, our 12 oz stoneware mug, and the ceramic pour-over dripper. Packed in a reusable wooden crate with a handwritten card.', { extras: [['Gift wrap', 500], ['Handwritten note', 0]] }],
  ['Cabin Weekend Gift Set', 'cabin-weekend-gift-set', ['gift-sets', 'home'], 9800, 9, 2100, '2026-10-28',
    'A Douglas Fir candle, campfire matches, a merino watch cap, and a tin of Old Growth Earl Grey. Ready to give — just add a cabin.', { extras: [['Gift wrap', 500], ['Handwritten note', 0]] }],
  ['Tea Lover\'s Gift Set', 'tea-lovers-gift-set', ['gift-sets', 'tea'], 5600, 0, 900, '2026-11-03',
    'Earl Grey, Mountain Mint, and Sencha Morning in matching tins, plus a stainless infuser. Sold out for now — more coming the first week of December.', {}],
  ['Stainless Tea Infuser', 'stainless-tea-infuser', ['tea'], 1200, 63, 70, '2026-01-07',
    'Fine-mesh basket infuser that sits in any mug or teapot, with a lid that doubles as a drip tray.', {}],
  ['Hand Grinder', 'hand-grinder', ['coffee'], 11800, 7, 650, '2026-07-08',
    'Precision steel burrs, 40+ click settings, aluminum body. Grinds 20 g for a pour-over in under a minute. Comes with a canvas pouch.', {}],
  ['Gooseneck Kettle', 'gooseneck-kettle', ['coffee', 'kitchen-table'], 6400, 13, 900, '2026-07-08',
    'Stovetop gooseneck kettle in matte black with a built-in thermometer. 1 liter. Precise pour for pour-over.', {}],
];

const products = [];
let vId = 0, xId = 0, imgId = 0;
P.forEach(([name, slug, pcats, price, stock, weight, created, desc, opt], i) => {
  const id = i + 1;
  const created_at = `${created} ${String(int(15, 23)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`;
  const variants = (opt.variants || []).map(([label, vp, vs, sku], pos) => ({ id: ++vId, label, price: vp, stock: vs, sku, pos }));
  const totalStock = variants.length ? variants.reduce((s, v) => s + v.stock, 0) : stock;
  const img = mediaMap[`${slug}.jpg`] ?? null;
  products.push({ id, name, slug, price, weight, variants, created_at, extras: opt.extras || [], active: opt.active ?? 1, cats: pcats });
  ins('products', { id, name, slug, description: desc, price_cents: variants.length ? Math.min(...variants.map((v) => v.price)) : price, stock: totalStock, active: opt.active ?? 1, created_at, variant_label: opt.variantLabel ?? null, weight_grams: weight, requires_shipping: 1, image_key: img, public_id: pid('prod') });
  for (const c of pcats) out.push(`INSERT INTO product_categories (product_id, category_id) VALUES (${id}, ${catId[c]});`);
  for (const v of variants) ins('product_variants', { id: v.id, product_id: id, label: v.label, price_cents: v.price, stock: v.stock, sku: v.sku, position: v.pos, active: 1, public_id: pid('var') });
  (opt.extras || []).forEach(([label, delta], pos) => ins('product_extras', { id: ++xId, product_id: id, label, price_delta_cents: delta, position: pos, active: 1, public_id: pid('xtra') }));
  if (img) {
    ins('product_images', { id: ++imgId, product_id: id, image_key: img, position: 0, alt: name, public_id: pid('pimg') });
    // Uploaded when the product was listed, not on seed day.
    out.push(`UPDATE media SET created_at = ${q(created_at)} WHERE image_key = ${q(img)};`);
  }
});
// "You may also like" picks for a few hero products.
const related = { 'stoneware-mug': ['ceramic-pour-over-dripper', 'forest-floor-house-blend', 'morning-ritual-gift-set'], 'forest-floor-house-blend': ['cascadia-dark-roast', 'ceramic-pour-over-dripper', 'hand-grinder', 'stoneware-mug'], 'douglas-fir-candle': ['rainy-day-candle', 'campfire-matches', 'cabin-weekend-gift-set'] };
for (const [slug, rel] of Object.entries(related)) {
  const ids = rel.map((s) => products.find((p) => p.slug === s).id);
  out.push(`UPDATE products SET related_ids = ${q(JSON.stringify(ids))} WHERE slug = ${q(slug)};`);
}

// ── Customers & orders ──────────────────────────────────────────────────────
const first = ['Maya', 'Ethan', 'Priya', 'Jonah', 'Hannah', 'Luis', 'Grace', 'Owen', 'Sofia', 'Daniel', 'Aisha', 'Caleb', 'Nora', 'Marcus', 'Ingrid', 'Theo', 'Rosa', 'Kenji', 'Leah', 'Samuel', 'Clara', 'Dev', 'Fiona', 'Isaac', 'June', 'Malik', 'Elena', 'Ruth', 'Wes', 'Tamsin', 'Hiro', 'Bea', 'Gabriel', 'Lucy', 'Omar', 'Quinn', 'Ada', 'Felix', 'Mei', 'Tobias', 'Harper', 'Arjun', 'Willa', 'Dominic', 'Esther', 'Rafael', 'Iris', 'Callum', 'Yara', 'Simone'];
const last = ['Okafor', 'Lindqvist', 'Raman', 'Whitaker', 'Nguyen', 'Delgado', 'Brennan', 'Holloway', 'Castellanos', 'Park', 'Haddad', 'Fischer', 'Abernathy', 'Kowalski', 'Sato', 'McAllister', 'Oyelaran', 'Bjornstad', 'Ferreira', 'Thorne', 'Vasquez', 'Achebe', 'Lund', 'Moreau', 'Chen', 'Gallagher', 'Ibarra', 'Nakamura', 'Pellegrini', 'Sorensen', 'Whitfield', 'Yilmaz', 'Hart', 'Ostrowski', 'Banerjee'];
const domains = ['gmail.com', 'gmail.com', 'gmail.com', 'icloud.com', 'yahoo.com', 'outlook.com', 'proton.me', 'hey.com', 'fastmail.com', 'comcast.net', 'me.com'];
const places = [
  ['Portland', 'OR', '972', 'US'], ['Portland', 'OR', '972', 'US'], ['Portland', 'OR', '972', 'US'], ['Beaverton', 'OR', '970', 'US'], ['Eugene', 'OR', '974', 'US'], ['Bend', 'OR', '977', 'US'],
  ['Seattle', 'WA', '981', 'US'], ['Seattle', 'WA', '981', 'US'], ['Tacoma', 'WA', '984', 'US'], ['Bellingham', 'WA', '982', 'US'], ['Vancouver', 'WA', '986', 'US'],
  ['Oakland', 'CA', '946', 'US'], ['San Francisco', 'CA', '941', 'US'], ['Los Angeles', 'CA', '900', 'US'], ['Sacramento', 'CA', '958', 'US'],
  ['Boise', 'ID', '837', 'US'], ['Denver', 'CO', '802', 'US'], ['Austin', 'TX', '787', 'US'], ['Chicago', 'IL', '606', 'US'], ['Minneapolis', 'MN', '554', 'US'],
  ['Brooklyn', 'NY', '112', 'US'], ['Asheville', 'NC', '288', 'US'], ['Burlington', 'VT', '054', 'US'], ['Madison', 'WI', '537', 'US'], ['Salt Lake City', 'UT', '841', 'US'],
  ['Vancouver', 'BC', 'V6K', 'CA'], ['Toronto', 'ON', 'M6G', 'CA'], ['Victoria', 'BC', 'V8V', 'CA'],
];
const streets = ['SE Division St', 'NE Alberta St', 'SE Hawthorne Blvd', 'N Mississippi Ave', 'NW 23rd Ave', 'Maple Ave', 'Oak St', 'Cedar Ln', 'Pine St', '4th Ave', 'Lakeview Dr', 'Elm St', 'Willow Way', 'Main St', 'Hillcrest Rd', 'Fremont Ave N', 'Commercial Dr', 'Ossington Ave'];
const customers = [];
const usedEmails = new Set();
for (let i = 0; i < 95; i++) {
  const f = pick(first), l = pick(last);
  let email = pick([`${f}.${l}`, `${f}${l}`, `${f[0]}${l}`, `${f}.${l}${int(1, 99)}`, `${f}_${l[0]}`]).toLowerCase() + '@' + pick(domains);
  if (usedEmails.has(email)) continue;
  usedEmails.add(email);
  const pl = pick(places);
  const postal = pl[3] === 'US' ? pl[2] + String(int(1, 99)).padStart(2, '0') : `${pl[2]} ${int(1, 9)}${pick('ABCEGHJ')}${int(1, 9)}`;
  customers.push({
    email, weight: chance(0.15) ? 5 : chance(0.3) ? 2 : 1,
    addr: { name: `${f} ${l}`, line1: `${int(100, 9800)} ${pick(streets)}`, line2: chance(0.25) ? pick(['Apt 3B', 'Unit 12', '#204', 'Suite 5', 'Apt 2']) : null, city: pl[0], state: pl[1], postal, country: pl[3] },
  });
}
// Some messiness: a shouty uppercase email and a corporate gift buyer.
customers.push({ email: 'GREG.HOLLOWAY@GMAIL.COM', weight: 1, addr: { name: 'greg holloway', line1: '2217 SE Clinton St', line2: null, city: 'Portland', state: 'OR', postal: '97202', country: 'US' } });
customers.push({ email: 'office@ridgelinearchitects.com', weight: 2, addr: { name: 'Ridgeline Architects (attn: Pam)', line1: '1120 NW Couch St', line2: 'Floor 4', city: 'Portland', state: 'OR', postal: '97209', country: 'US' } });
const weighted = customers.flatMap((c) => Array(c.weight).fill(c));

const carriers = { usps: () => '9400 1' + Array.from({ length: 21 }, () => int(0, 9)).join('').replace(/(\d{4})/g, '$1 ').trim(), ups: () => '1Z' + b62(16).toUpperCase().replace(/[^A-Z0-9]/g, '7'), fedex: () => String(int(1e11, 9.99e11)) };
const NOW = new Date('2026-11-17T16:00:00Z');
const START = new Date('2026-01-14T19:00:00Z');
// Ramp up over the year with a holiday surge.
const monthWeight = [0, 0.5, 0.7, 0.8, 0.9, 1, 1, 0.9, 0.95, 1.1, 1.4, 2.6, 0];
const orderDates = [];
for (let d = new Date(START); d < NOW; d = new Date(d.getTime() + 86400000)) {
  const lam = 0.7 * monthWeight[d.getUTCMonth() + 1] * (d.getUTCDay() === 0 || d.getUTCDay() === 6 ? 1.3 : 1);
  let n = 0; let L = Math.exp(-lam), p = 1;
  do { n++; p *= rnd(); } while (p > L);
  n -= 1;
  for (let k = 0; k < n; k++) {
    const t = new Date(d.getTime() + int(0, 86399) * 1000);
    if (t < NOW) orderDates.push(t);
  }
}
orderDates.sort((a, b) => a - b);

const sellable = products.filter((p) => p.active);
let orderId = 0, itemId = 0, refundCount = 0;
const owner = 'hello@fernwoodsupply.co';
const ownerAddr = { name: 'Fernwood Supply Co.', line1: '2834 SE Belmont St', line2: null, city: 'Portland', state: 'OR', postal: '97214', country: 'US' };
for (const when of orderDates) {
  const id = ++orderId;
  const isOwnerTest = id <= 2; // the owner's own demo checkouts while setting up
  const cust = isOwnerTest ? { email: owner, addr: ownerAddr } : pick(weighted);
  const nItems = isOwnerTest ? 1 : chance(0.55) ? 1 : chance(0.6) ? 2 : int(3, 5);
  const lines = [];
  const seen = new Set();
  for (let k = 0; k < nItems; k++) {
    const p = pick(sellable.filter((x) => x.created_at <= ts(when)) .length ? sellable.filter((x) => x.created_at <= ts(when)) : sellable);
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    const v = p.variants.length ? pick(p.variants) : null;
    let price = v ? v.price : p.price;
    let name = v ? `${p.name} — ${v.label}` : p.name;
    const extra = p.extras.length && chance(0.3) ? pick(p.extras) : null;
    if (extra) { price += extra[1]; name += ` (+ ${extra[0]})`; }
    const qty = p.price < 1500 && chance(0.4) ? int(2, 4) : chance(0.1) ? 2 : 1;
    lines.push({ p, v, price, name, qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const weightG = lines.reduce((s, l) => s + l.p.weight * l.qty, 0) + 200;
  const local = cust.addr.city === 'Portland' && chance(0.3);
  let shipping = 0, shipLabel, delivery = 'shipping';
  if (local) { shipLabel = 'Pickup at the shop (SE Belmont)'; delivery = 'pickup'; }
  else if (cust.addr.country === 'CA') { shipLabel = 'International Standard'; shipping = 2400; }
  else if (subtotal >= 7500) { shipLabel = 'Standard Ground (3–6 business days)'; shipping = 0; }
  else if (chance(0.18)) { shipLabel = 'Priority (1–3 business days)'; shipping = 1495; }
  else { shipLabel = 'Standard Ground (3–6 business days)'; shipping = weightG > 2000 ? 1295 : weightG > 900 ? 995 : 695; }
  const method = isOwnerTest ? 'demo' : pick(['stripe', 'stripe', 'stripe', 'stripe', 'stripe', 'stripe', 'stripe', 'lightning', 'lightning', 'opennode']);
  const discount = method === 'stripe' && chance(0.12) ? Math.round(subtotal * pick([0.1, 0.15, 0.2])) : 0;
  const total = subtotal - discount + shipping;
  const ageDays = (NOW - when) / 86400000;
  const publicId = pid('ord');
  const sessionId = method === 'stripe' ? `cs_live_b1${b62(56)}` : method === 'lightning' ? `ln_${hex(64)}` : method === 'opennode' ? `on_${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}` : `demo_${hex(24)}`;
  // Fulfillment: shipped within a few days; the last few days are still open.
  let fulfilled = !isOwnerTest && (ageDays > 4 || (ageDays > 1.5 && chance(0.5)));
  if (ageDays > 4 && chance(0.03)) fulfilled = false; // a straggler that slipped through
  let carrier = null, tracking = null, fulfilledAt = null;
  if (fulfilled) {
    fulfilledAt = ts(new Date(when.getTime() + int(18, 80) * 3600000));
    if (delivery === 'shipping') {
      carrier = cust.addr.country === 'CA' ? 'usps' : shipping === 1495 ? 'ups' : pick(['usps', 'usps', 'usps', 'ups', 'fedex']);
      tracking = carriers[carrier]();
    }
  }
  // Refunds: a handful of full and partial refunds on older orders.
  let providerRefunded = 0, externalRefunded = 0, status = 'paid', refund = null;
  if (!isOwnerTest && ageDays > 6 && chance(0.06)) {
    const full = chance(0.45);
    const amount = full ? total : Math.min(total, lines[0].price);
    const reason = full
      ? pick(['Customer cancelled before shipping', 'Package lost in transit — USPS claim filed', 'Arrived broken (mug handle snapped)', 'Duplicate order'])
      : pick(['Mug arrived chipped — refunded one item', 'Wrong glaze sent, customer kept it', 'Late delivery goodwill credit', 'Out-of-stock variant after order placed']);
    if (method === 'stripe') providerRefunded = amount; else externalRefunded = amount;
    if (amount >= total) status = 'refunded';
    if (full && reason.startsWith('Customer cancelled')) { fulfilled = false; carrier = tracking = fulfilledAt = null; }
    refund = { amount, reason, kind: method === 'stripe' ? 'provider_api' : 'manual_external' };
  }
  const isStripe = method === 'stripe';
  ins('orders', {
    id, provider_session_id: sessionId, public_id: publicId, email: cust.email, amount_total_cents: total, currency: 'usd', status, created_at: ts(when),
    discount_cents: discount, tax_cents: 0, fulfillment_status: fulfilled ? 'fulfilled' : 'unfulfilled', tracking_carrier: carrier, tracking_number: tracking, fulfilled_at: fulfilledAt,
    shipping_cents: shipping, ship_address: JSON.stringify(cust.addr), payment_method: method, settlement_token: crypto.randomUUID(),
    provider_payment_id: isStripe ? `pi_3S${b62(22)}` : null, provider_refunded_cents: providerRefunded, external_refunded_cents: externalRefunded,
    shipping_label: shipLabel, shipping_weight_grams: weightG, delivery_method: delivery,
  });
  for (const l of lines) {
    const ipid = pid('itm');
    ins('order_items', { id: ++itemId, order_id: id, product_id: l.p.id, variant_id: l.v ? l.v.id : null, name: l.name, price_cents: l.price, quantity: l.qty, public_id: ipid });
  }
  ins('order_guest_access', { order_public_id: publicId, access_token: 'otk_' + b62(32), created_at: ts(when) });
  if (refund) {
    refundCount++;
    const rAt = ts(new Date(when.getTime() + int(2, 9) * 86400000));
    ins('refunds', { public_id: pid('rfnd'), order_id: id, kind: refund.kind, status: 'succeeded', amount_cents: refund.amount, provider: method, provider_refund_id: isStripe ? `re_3S${b62(22)}` : null, reason: refund.reason, note: chance(0.5) ? 'Emailed customer to confirm.' : null, created_by: 'admin', idempotency_key: `seed-refund-${id}`, created_at: rAt, updated_at: rAt });
  }
}

// ── Pages ───────────────────────────────────────────────────────────────────
const pages = [
  ['About Fernwood', 'about', 1, '2026-01-06 20:11:00', '2026-08-19 17:42:10', 'standard', `Fernwood Supply Co. is a small shop on SE Belmont in Portland, Oregon. We opened in a former bike repair garage in 2019 with a coffee bar, a few shelves of mugs, and a strong opinion that everyday objects should be made well.

Today we work with **more than twenty makers** — most of them within a couple hours' drive of the shop — and roast our coffee in small batches with our friends at Slabtown Roasting.

## What we look for

- Things that get better with use: waxed canvas, cast iron, black walnut, wool.
- Makers who pay their people fairly and are happy to tell us how something is made.
- Packaging you can reuse or compost. We ship in recycled boxes with paper tape and paper fill.

## Visit us

2834 SE Belmont St, Portland, OR 97214
Open Wednesday–Sunday, 9am–5pm. The coffee bar opens at 8.

> "The kind of shop you walk into for a bag of coffee and walk out of with a skillet." — *Portland Monthly*, 2025`],
  ['Shipping & Delivery', 'shipping', 1, '2026-01-06 20:30:00', '2026-10-30 22:05:41', 'standard', `We pack and ship orders **Monday through Friday** from the shop in Portland. Most orders leave within 1–2 business days.

## Rates

| Service | Time in transit | Price |
| --- | --- | --- |
| Standard Ground | 3–6 business days | $6.95–$12.95 by weight |
| Priority | 1–3 business days | $14.95 |
| International (Canada) | 7–14 business days | $24.00 |
| Local pickup | Ready in 1 day | Free |

**Free Standard Ground shipping on US orders over $75.**

## Holiday deadlines

- Standard Ground: order by **December 15**
- Priority: order by **December 19**
- Local pickup: through **December 23**

Ceramics are double-boxed. If anything arrives broken, send us a photo within 14 days and we'll make it right.`],
  ['Returns & Exchanges', 'returns', 1, '2026-01-06 20:41:00', '2026-04-02 18:00:00', 'standard', `If something isn't right, we want to hear about it.

- **Unused items** can be returned within **30 days** of delivery for a full refund to your original payment method.
- **Coffee and tea** can't be returned once opened, but if you don't love a roast, tell us — we'll send something else.
- **Damaged in transit?** Email a photo to hello@fernwoodsupply.co and we'll send a replacement or a refund, your choice. No need to send it back.

Holiday purchases made after November 1 can be returned until January 31.

Lightning and OpenNode payments are refunded in USD-equivalent bitcoin to an address you provide, or as store credit.`],
  ['Privacy Policy', 'privacy', 1, '2026-01-06 21:02:00', '2026-01-06 21:02:00', 'standard', `We collect only what we need to get your order to you: your email, your shipping address, and what you bought. Card payments are processed by Stripe; we never see or store your card number.

We don't sell or share your information, we don't run ad trackers, and we only email you about your orders unless you sign up for the newsletter at the shop.

To have your order history deleted, email hello@fernwoodsupply.co.`],
  ['FAQ', 'faq', 1, '2026-02-14 19:20:00', '2026-11-04 16:31:12', 'standard', `### When do you roast?
Every Tuesday. Coffee orders placed by Monday night ship the same week, usually within two days of roasting.

### Are your mugs dishwasher safe?
Yes — dishwasher and microwave safe. Handwashing will keep the glaze glossy longer.

### Do you offer wholesale?
We work with a handful of cafés and shops in the Northwest. Email us with a little about your business.

### Can I pay with bitcoin?
We took Lightning and on-chain payments from spring through October. Bitcoin checkout is **paused** while we move to a new Lightning node — card only for now. We'll post here when it's back.

### Do you ship outside the US?
To Canada, yes. Elsewhere, not yet — customs paperwork for ceramics is a bear.`],
  ['Wholesale', 'wholesale', 0, '2026-06-03 22:15:00', '2026-06-03 22:48:09', 'standard', `Draft — need to confirm minimums with Eastside Clay before publishing.

We offer wholesale pricing on coffee (5 lb bags), candles, and stationery for cafés and independent shops. Minimum opening order $300.`],
  ['Holiday Gift Guide 2026', 'holiday-gift-guide', 0, '2026-11-10 18:44:00', '2026-11-16 23:12:30', 'standard', `## For the coffee person
The Morning Ritual Gift Set, a Hand Grinder, or a bag of Ethiopia Guji while it lasts.

## For the cabin
Cabin Weekend Gift Set, Wool Throw Blanket, Douglas Fir Candle.

## Under $25
Letterpress cards, postcards, beeswax wraps, Maple Spurtle Set.

TODO: add photos from the shoot on the 20th`],
];
pages.forEach(([title, slug, pub, created, updated, layout, body], i) => ins('pages', { id: i + 1, title, slug, body_markdown: body, published: pub, created_at: created, updated_at: updated, layout, public_id: pid('page') }));

// ── Navigation ──────────────────────────────────────────────────────────────
const nav = [
  ['header', 'catalog', null, 'Shop all'], ['header', 'category', catId['coffee-tea'], null], ['header', 'category', catId['kitchen-table'], null],
  ['header', 'category', catId['home'], null], ['header', 'category', catId['gift-sets'], 'Gifts'], ['header', 'page', 1, 'About'],
  ['footer', 'page', 2, null], ['footer', 'page', 3, null], ['footer', 'page', 5, null], ['footer', 'page', 4, null],
];
nav.forEach(([location, type, target, label], i) => ins('menu_items', { location, target_type: type, target_id: target, label, position: i, created_at: '2026-01-06 21:30:00', public_id: pid('nav') }));

// ── Settings ────────────────────────────────────────────────────────────────
const shippingConfig = {
  schema: 3, revision: 7, enabled: true, packageWeightGrams: 200,
  zones: [
    { name: 'United States', countries: ['US'], freeOverCents: 7500, rates: [
      { label: 'Standard Ground (3–6 business days)', pricing: { type: 'weight', bands: [{ upToGrams: 900, amountCents: 695 }, { upToGrams: 2000, amountCents: 995 }, { upToGrams: null, amountCents: 1295 }] } },
      { label: 'Priority (1–3 business days)', pricing: { type: 'flat', amountCents: 1495 } },
      { label: 'Pickup at the shop (SE Belmont)', pricing: { type: 'pickup', amountCents: 0 } },
    ] },
    { name: 'Canada', countries: ['CA'], freeOverCents: null, rates: [{ label: 'International Standard', pricing: { type: 'flat', amountCents: 2400 } }] },
  ],
};
const settings = {
  announcement: 'Free US shipping over $75 · Order by Dec 15 for holiday delivery',
  announcement_href: '/pages/shipping',
  discounts_enabled: '1',
  shipping_config: JSON.stringify(shippingConfig),
  weight_unit: 'lb',
  ship_from: JSON.stringify({ name: 'Fernwood Supply Co.', street1: '2834 SE Belmont St', city: 'Portland', state: 'OR', zip: '97214', country: 'US', phone: '503-555-0148', email: 'hello@fernwoodsupply.co' }),
  email_from: 'orders@fernwoodsupply.co',
  email_from_name: 'Fernwood Supply Co.',
  email_notify_to: 'hello@fernwoodsupply.co',
};
for (const [k, v] of Object.entries(settings)) out.push(`INSERT INTO settings (key, value) VALUES (${q(k)}, ${q(v)}) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now');`);
if (mediaMap['fernwood-logo.png']) out.push(`INSERT INTO settings (key, value) VALUES ('logo_image_key', ${q(mediaMap['fernwood-logo.png'])}) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`);

console.log(out.join('\n'));
console.error(`products=${products.length} orders=${orderId} items=${itemId} refunds=${refundCount} customers=${customers.length}`);
