// Mock data for Sorrel Practice — Tom Brennan, 14-day low-FODMAP elimination plan.

export type Slot = 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner';
export const SLOTS: Slot[] = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];
export const SLOT_LABEL: Record<Slot, string> = {
  breakfast: 'Breakfast',
  snack1: 'Snack',
  lunch: 'Lunch',
  snack2: 'Snack',
  dinner: 'Dinner',
};
export const SLOT_HINT: Record<Slot, string> = {
  breakfast: 'First meal after waking',
  snack1: 'Mid-shift',
  lunch: 'Packable',
  snack2: 'Mid-shift',
  dinner: 'Batch → next-day lunch',
};

export type Fod = 'green' | 'amber' | 'red' | 'none';
export type Tag = 'treenut' | 'treenut-maybe' | 'fish' | 'lfy';

export interface Ing {
  n: string;
  amt: string;
  f: Fod;
  code?: string; // FODMAP serving reference entry
  note: string; // serving rule from the reference
  tags?: Tag[];
}

export interface ShopLine {
  id: string;
  cat: ShopCat;
  name: string;
  qty: string;
  price: number;
  pantry?: boolean;
}

export type ShopCat = 'Produce' | 'Meat, eggs & tofu' | 'Lactose-free dairy & cheese' | 'Grains & bread' | 'Pantry';

export interface Recipe {
  id: string;
  name: string;
  src:
    | { kind: 'bank'; code: string; rev: string; tags: string[] }
    | { kind: 'fsr'; code: string };
  active: number;
  total: number;
  skill: 'basic' | 'intermediate';
  cost: number;
  kcal: number;
  p: number;
  c: number;
  fib: number;
  fat: number;
  ing: Ing[];
  why: string;
  fix?: { to: string; label: string };
  noYog?: string;
  shop?: ShopLine[];
}

const i = (n: string, amt: string, f: Fod, code: string | undefined, note: string, tags?: Tag[]): Ing => ({
  n, amt, f, code, note, tags,
});

// Common ingredient references
const OATS = i('Rolled oats', '52 g (½ cup)', 'green', 'FSR 2.14', 'Green up to 52 g');
const LFMILK = (amt = '250 ml (1 cup)') => i('Lactose-free milk', amt, 'green', 'FSR 3.06', 'Green up to 250 ml');
const LFY = i('Lactose-free plain yogurt', '170 g (¾ cup)', 'green', 'FSR 3.11', 'Green up to 170 g', ['lfy']);
const PB = i('Peanut butter, no added sugar', '2 tbsp (32 g)', 'green', 'FSR 5.08', 'Green up to 2 tbsp', []);
const CHIA = (amt = '1 tbsp (12 g)') => i('Chia seeds', amt, 'green', 'FSR 5.03', 'Green up to 24 g');
const PUMPKIN = (amt = '1 tbsp (10 g)') => i('Pumpkin seeds', amt, 'green', 'FSR 5.11', 'Green up to 23 g');
const KIWI2 = i('Kiwifruit, green', '2 small (150 g)', 'green', 'FSR 1.17', 'Green up to 150 g');
const CHEDDAR = (amt = '30 g') => i('Cheddar, aged', amt, 'green', 'FSR 3.02', 'Green up to 40 g (lactose < 0.1 g)');
const EGGS = (amt: string) => i('Eggs', amt, 'none', 'FSR 4.04', 'No FODMAPs detected');
const GIO = i('Garlic-infused olive oil', '1 tbsp', 'green', 'FSR 8.02', 'Fructans not oil-soluble — green');
const SCALLION = i('Scallion, green tops only', '2 tbsp', 'green', 'FSR 6.31', 'Green tops only; white bulb is red');
const POTATO = (amt = '200 g') => i('Potato, skin on', amt, 'none', 'FSR 6.27', 'No FODMAPs detected');
const RICE = (amt = '1 cup cooked (190 g)', n = 'Jasmine rice') => i(n, amt, 'green', 'FSR 2.21', 'Green up to 1 cup cooked');
const CARROT = (amt = '75 g') => i('Carrot', amt, 'none', 'FSR 6.07', 'No FODMAPs detected');
const REDPEP = (amt = '½ pepper (60 g)') => i('Red bell pepper', amt, 'green', 'FSR 6.25', 'Green up to 75 g');
const GBEANS = i('Green beans', '75 g', 'green', 'FSR 6.15', 'Green up to 75 g; amber at 125 g');
const SPINACH = (amt = '1 cup (30 g)') => i('Baby spinach', amt, 'green', 'FSR 6.33', 'Green up to 75 g');
const SOURDOUGH = i('Spelt sourdough', '2 slices (70 g)', 'green', 'FSR 2.30', 'Green up to 2 slices; fermented spelt only');
const MAPLE = (amt = '1 tsp') => i('Pure maple syrup', amt, 'green', 'FSR 7.12', 'Green up to 2 tbsp');
const ORANGE = i('Navel orange', '1 medium (130 g)', 'green', 'FSR 1.24', 'Green up to 130 g');
const STRAW = i('Strawberries', '5 medium (65 g)', 'green', 'FSR 1.31', 'Green up to 65 g');
const CHICKEN = (amt = '130 g raw', n = 'Chicken breast') => i(n, amt, 'none', 'FSR 4.02', 'Plain meat — no FODMAPs');
const TOMATO = (amt = '100 g') => i('Canned diced tomatoes, no onion/garlic', amt, 'green', 'FSR 6.36', 'Green up to 100 g');
const BOKCHOY = i('Bok choy', '75 g', 'green', 'FSR 6.04', 'Green up to 75 g');
const SOY = i('Soy sauce', '1 tbsp', 'green', 'FSR 7.18', 'Green up to 2 tbsp');
const TOFU = (amt = '150 g') => i('Firm tofu, pressed', amt, 'green', 'FSR 4.12', 'Firm only: green up to 170 g; silken is red');
const BANANA = i('Banana, firm (just yellow)', '1 medium (100 g)', 'green', 'FSR 1.03', 'Firm: green to 1 medium; ripe: amber above 35 g');
const ZUCC = i('Zucchini', '65 g', 'green', 'FSR 6.40', 'Green up to 65 g; amber above');
const QUINOA = (amt = '¾ cup cooked (140 g)') => i('Quinoa', amt, 'green', 'FSR 2.19', 'Green up to 1 cup cooked');
const CORN_TORT = i('Corn tortillas', '2 (52 g)', 'green', 'FSR 2.08', 'Green up to 3 tortillas');
const PEANUTS = (amt = '28 g (about 30 nuts)') => i('Peanuts, dry-roasted', amt, 'green', 'FSR 5.09', 'Green up to 32 nuts (28 g)');
const RICECRACK = i('Plain rice crackers', '6 (18 g)', 'green', 'FSR 2.22', 'Green up to 15 crackers');
const DARKCHOC = (amt = '20 g') => i('Dark chocolate, 70%', amt, 'green', 'FSR 7.05', 'Green up to 30 g');

export const RECIPES: Record<string, Recipe> = {
  // ─── Breakfasts ──────────────────────────────
  pbOats: {
    id: 'pbOats', name: 'Peanut butter banana oats',
    src: { kind: 'bank', code: 'RB-014', rev: 'rev. Aug 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 8, total: 8, skill: 'basic', cost: 1.35, kcal: 540, p: 21, c: 66, fib: 9, fat: 22,
    ing: [OATS, LFMILK(), BANANA, PB, CHIA()],
    why: 'Oats and chia anchor the day’s fiber. Banana kept firm — a ripe banana goes amber above 35 g.',
  },
  eggScramble: {
    id: 'eggScramble', name: 'Spinach & cheddar scramble on sourdough, kiwi',
    src: { kind: 'bank', code: 'RB-021', rev: 'rev. Jun 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 12, total: 12, skill: 'basic', cost: 1.6, kcal: 560, p: 31, c: 48, fib: 7, fat: 27,
    ing: [EGGS('3 large'), SPINACH(), CHEDDAR(), SOURDOUGH, i('Kiwifruit, green', '1 (75 g)', 'green', 'FSR 1.17', 'Green up to 150 g')],
    why: 'Higher-protein start for days after a night shift; one pan, under 15 minutes.',
  },
  yogOats: {
    id: 'yogOats', name: 'Overnight oats with lactose-free yogurt & blueberries',
    src: { kind: 'bank', code: 'RB-033', rev: 'rev. Sep 2026', tags: ['Low-FODMAP', 'Make-ahead', 'Basic'] },
    active: 5, total: 5, skill: 'basic', cost: 1.7, kcal: 500, p: 25, c: 68, fib: 9, fat: 14,
    ing: [OATS, LFY, i('Blueberries', '75 g', 'green', 'FSR 1.04', 'Green up to 125 g'), CHIA(), MAPLE()],
    why: 'Made the night before — eats cold at the start of an early shift.',
    noYog: 'milkOats',
  },
  milkOats: {
    id: 'milkOats', name: 'Overnight oats with lactose-free milk, blueberries & seeds',
    src: { kind: 'bank', code: 'RB-034', rev: 'rev. Sep 2026', tags: ['Low-FODMAP', 'Make-ahead', 'Basic'] },
    active: 5, total: 5, skill: 'basic', cost: 1.45, kcal: 510, p: 21, c: 64, fib: 10, fat: 18,
    ing: [OATS, LFMILK('200 ml'), i('Blueberries', '75 g', 'green', 'FSR 1.04', 'Green up to 125 g'), CHIA(), PUMPKIN('2 tbsp (20 g)'), MAPLE()],
    why: 'Yogurt-free version of RB-033; pumpkin seeds make up most of the lost protein.',
    shop: [{ id: 'blueberries', cat: 'Produce', name: 'Blueberries', qty: '6 oz', price: 2.99 }],
  },
  tofuHash: {
    id: 'tofuHash', name: 'Tofu, potato & pepper breakfast hash',
    src: { kind: 'bank', code: 'RB-047', rev: 'rev. Jul 2026', tags: ['Low-FODMAP', 'Weekend', 'Basic'] },
    active: 15, total: 25, skill: 'basic', cost: 1.6, kcal: 520, p: 27, c: 50, fib: 6, fat: 23,
    ing: [TOFU(), POTATO(), REDPEP(), SCALLION, GIO],
    why: 'Weekend breakfast; firm tofu (not silken) keeps it green.',
  },
  honeyGranola: {
    id: 'honeyGranola', name: 'Honey-oat granola with lactose-free milk & kiwi',
    src: { kind: 'bank', code: 'RB-058', rev: 'rev. Mar 2025', tags: ['Weekday', 'Basic'] },
    active: 5, total: 5, skill: 'basic', cost: 1.3, kcal: 530, p: 18, c: 78, fib: 8, fat: 16,
    ing: [
      i('Honey-oat granola (RB-058 batch)', '60 g', 'red', 'FSR 7.09', 'Honey is red at 1 tsp (excess fructose). This serving carries about 2 tsp.'),
      LFMILK(), KIWI2, PUMPKIN(),
    ],
    why: 'Picked for a quick no-cook breakfast. RB-058 isn’t tagged low-FODMAP in the bank — I should have caught the honey before drafting.',
    fix: { to: 'mapleGranola', label: 'Swap to the maple version (RB-063) — same method, maple syrup is green to 2 tbsp' },
  },
  mapleGranola: {
    id: 'mapleGranola', name: 'Maple-oat granola with lactose-free milk & kiwi',
    src: { kind: 'bank', code: 'RB-063', rev: 'rev. Aug 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 5, total: 5, skill: 'basic', cost: 1.3, kcal: 530, p: 19, c: 77, fib: 9, fat: 16,
    ing: [
      i('Maple-oat granola (RB-063 batch)', '60 g', 'green', 'FSR 2.14 / 7.12', 'Oats 40 g + maple 2 tsp per serving — both green'),
      LFMILK(), KIWI2, PUMPKIN(),
    ],
    why: 'Low-FODMAP version of the honey granola. Batch keeps 2 weeks in a jar.',
    shop: [{ id: 'maple', cat: 'Pantry', name: 'Pure maple syrup', qty: '8.5 oz', price: 5.49, pantry: true }],
  },
  eggTacos: {
    id: 'eggTacos', name: 'Egg & cheddar breakfast tacos',
    src: { kind: 'bank', code: 'RB-019', rev: 'rev. Jun 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 12, total: 15, skill: 'basic', cost: 1.45, kcal: 500, p: 27, c: 44, fib: 6, fat: 24,
    ing: [EGGS('2 large'), CORN_TORT, CHEDDAR(), SPINACH('½ cup (15 g)'), i('Tomato, fresh', '65 g', 'green', 'FSR 6.35', 'Green up to 65 g (common)')],
    why: 'Corn tortillas instead of wheat wraps — green at 2.',
  },
  quinoaPorridge: {
    id: 'quinoaPorridge', name: 'Quinoa porridge with strawberries & pumpkin seeds',
    src: { kind: 'bank', code: 'RB-027', rev: 'rev. Jul 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 10, total: 15, skill: 'basic', cost: 1.5, kcal: 510, p: 20, c: 66, fib: 8, fat: 18,
    ing: [i('Quinoa flakes', '40 g', 'green', 'FSR 2.20', 'Green up to 1 cup cooked'), LFMILK(), STRAW, PUMPKIN('2 tbsp (20 g)'), CHIA()],
    why: 'Swaps oats out a couple of times a week for variety without losing fiber.',
  },

  // ─── Snacks (from the serving reference) ─────
  yogStraw: {
    id: 'yogStraw', name: 'Lactose-free yogurt, strawberries & pumpkin seeds',
    src: { kind: 'fsr', code: 'FSR 3.11' },
    active: 2, total: 2, skill: 'basic', cost: 1.25, kcal: 230, p: 15, c: 20, fib: 3, fat: 10,
    ing: [LFY, STRAW, PUMPKIN()],
    why: 'Each component at or under its green serving; no stacking of the same FODMAP group.',
    noYog: 'cheeseOrange',
  },
  riceCakePB: {
    id: 'riceCakePB', name: 'Rice cakes with peanut butter',
    src: { kind: 'fsr', code: 'FSR 5.08' },
    active: 2, total: 2, skill: 'basic', cost: 0.6, kcal: 250, p: 9, c: 22, fib: 2, fat: 15,
    ing: [i('Plain rice cakes', '2', 'green', 'FSR 2.23', 'Green up to 2 cakes'), PB],
    why: 'Shelf-stable — keeps in a locker for a night shift.',
  },
  kiwiChia: {
    id: 'kiwiChia', name: 'Kiwi chia pudding',
    src: { kind: 'fsr', code: 'FSR 5.03' },
    active: 4, total: 4, skill: 'basic', cost: 1.1, kcal: 250, p: 9, c: 30, fib: 9, fat: 11,
    ing: [CHIA('2 tbsp (24 g)'), LFMILK('200 ml'), KIWI2],
    why: 'Made ahead in a jar; the highest-fiber snack that stays green.',
  },
  cheeseOrange: {
    id: 'cheeseOrange', name: 'Orange, cheddar & rice crackers',
    src: { kind: 'fsr', code: 'FSR 1.24' },
    active: 2, total: 2, skill: 'basic', cost: 1.05, kcal: 240, p: 10, c: 27, fib: 3, fat: 11,
    ing: [ORANGE, CHEDDAR(), RICECRACK],
    why: 'Portable, no prep. Aged cheddar is effectively lactose-free.',
  },
  popcornPeanuts: {
    id: 'popcornPeanuts', name: 'Popcorn & peanuts',
    src: { kind: 'fsr', code: 'FSR 2.18' },
    active: 3, total: 3, skill: 'basic', cost: 0.55, kcal: 250, p: 9, c: 22, fib: 5, fat: 15,
    ing: [i('Air-popped popcorn', '3 cups (24 g)', 'green', 'FSR 2.18', 'Green up to 7 cups'), PEANUTS()],
    why: 'Peanuts are legumes, not tree nuts — fine with his cashew/pistachio allergy.',
  },
  eggsBanana: {
    id: 'eggsBanana', name: 'Two hard-boiled eggs & a firm banana',
    src: { kind: 'fsr', code: 'FSR 4.04' },
    active: 2, total: 2, skill: 'basic', cost: 0.9, kcal: 245, p: 13, c: 27, fib: 3, fat: 10,
    ing: [EGGS('2 large, boiled ahead'), BANANA],
    why: 'Boil a batch of eggs on Sunday; lasts the week.',
  },
  yogKiwi: {
    id: 'yogKiwi', name: 'Lactose-free yogurt with kiwi & chia',
    src: { kind: 'fsr', code: 'FSR 3.11' },
    active: 2, total: 2, skill: 'basic', cost: 1.35, kcal: 240, p: 14, c: 25, fib: 5, fat: 9,
    ing: [LFY, i('Kiwifruit, green', '1 (75 g)', 'green', 'FSR 1.17', 'Green up to 150 g'), CHIA()],
    why: 'Second yogurt option so snacks don’t repeat.',
    noYog: 'kiwiChia',
  },
  seedMix: {
    id: 'seedMix', name: 'Seed & peanut mix with dark chocolate',
    src: { kind: 'fsr', code: 'FSR 5.11' },
    active: 1, total: 1, skill: 'basic', cost: 0.85, kcal: 260, p: 9, c: 16, fib: 3, fat: 19,
    ing: [PUMPKIN('1 tbsp (10 g)'), i('Sunflower seeds', '1 tbsp (10 g)', 'green', 'FSR 5.14', 'Green up to 2 tbsp'), PEANUTS('15 g'), DARKCHOC()],
    why: 'Nut-free “trail mix” — no almonds, cashews or pistachios.',
  },
  energyBites: {
    id: 'energyBites', name: 'Oat & peanut butter energy bites (2)',
    src: { kind: 'bank', code: 'RB-140', rev: 'rev. Aug 2026', tags: ['Low-FODMAP', 'Make-ahead', 'Basic'] },
    active: 15, total: 15, skill: 'basic', cost: 0.7, kcal: 240, p: 8, c: 26, fib: 4, fat: 12,
    ing: [i('Rolled oats', '30 g', 'green', 'FSR 2.14', 'Green up to 52 g'), i('Peanut butter', '1 tbsp', 'green', 'FSR 5.08', 'Green up to 2 tbsp'), MAPLE('1 tsp'), CHIA('1 tsp'), DARKCHOC('8 g')],
    why: 'Batch of 12 on the weekend; 2 per snack.',
  },

  // ─── Lunches ─────────────────────────────────
  turkeySandwich: {
    id: 'turkeySandwich', name: 'Turkey & cheddar sourdough sandwich, carrot sticks',
    src: { kind: 'bank', code: 'RB-109', rev: 'rev. May 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 8, total: 8, skill: 'basic', cost: 2.8, kcal: 480, p: 28, c: 52, fib: 6, fat: 18,
    ing: [SOURDOUGH, i('Sliced turkey breast, no onion/garlic in seasoning', '90 g', 'none', 'FSR 4.09', 'Check deli label for onion/garlic powder'), CHEDDAR('20 g'), i('Lettuce & tomato', '1 leaf, 65 g tomato', 'green', 'FSR 6.35', 'Green up to 65 g'), CARROT()],
    why: 'No-cook packed lunch for the first day back on shift.',
  },
  chickenRiceBowl: {
    id: 'chickenRiceBowl', name: 'Chicken, brown rice & roast veg bowl',
    src: { kind: 'bank', code: 'RB-104', rev: 'rev. Jul 2026', tags: ['Low-FODMAP', 'Batch', 'Basic'] },
    active: 15, total: 30, skill: 'basic', cost: 3.1, kcal: 520, p: 32, c: 62, fib: 6, fat: 17,
    ing: [CHICKEN(), RICE('1 cup cooked (195 g)', 'Brown rice'), CARROT(), ZUCC, GIO],
    why: 'Even carb portion to match breakfast and dinner.',
  },
  pestoSalad: {
    id: 'pestoSalad', name: 'Pesto chicken & potato salad',
    src: { kind: 'bank', code: 'RB-118', rev: 'rev. Apr 2026', tags: ['Low-FODMAP', 'Basic'] },
    active: 15, total: 25, skill: 'basic', cost: 3.4, kcal: 540, p: 30, c: 46, fib: 6, fat: 28,
    ing: [
      CHICKEN('120 g raw'), POTATO(), GBEANS,
      i('Jarred basil pesto, garlic-free', '2 tbsp (30 g)', 'green', 'FSR 7.15', 'Garlic-free pesto: green up to 2 tbsp', ['treenut-maybe']),
    ],
    why: 'Recipe calls for “any garlic-free jarred pesto.” Several common garlic-free brands use cashew in place of pine nuts, and the recipe bank doesn’t name a brand.',
    fix: { to: 'pumpkinPestoSalad', label: 'Swap to RB-131 — same salad with a 5-minute basil–pumpkin seed pesto, no nuts' },
  },
  pumpkinPestoSalad: {
    id: 'pumpkinPestoSalad', name: 'Basil–pumpkin seed pesto chicken & potato salad',
    src: { kind: 'bank', code: 'RB-131', rev: 'rev. Sep 2026', tags: ['Low-FODMAP', 'Nut-free', 'Basic'] },
    active: 20, total: 25, skill: 'basic', cost: 3.2, kcal: 540, p: 31, c: 46, fib: 7, fat: 27,
    ing: [CHICKEN('120 g raw'), POTATO(), GBEANS, i('Basil–pumpkin seed pesto (RB-131)', '2 tbsp', 'green', 'FSR 5.11 / 8.02', 'Pumpkin seeds + garlic-infused oil — both green'), ],
    why: 'Practice recipe; you control every ingredient, so no label check is needed.',
    shop: [
      { id: 'basil', cat: 'Produce', name: 'Fresh basil', qty: '1 bunch', price: 2.49 },
      { id: 'pumpkinseeds', cat: 'Pantry', name: 'Pumpkin seeds (pepitas)', qty: '8 oz', price: 4.29 },
    ],
  },
  quinoaTofuSalad: {
    id: 'quinoaTofuSalad', name: 'Quinoa, tofu & roasted pepper salad',
    src: { kind: 'bank', code: 'RB-122', rev: 'rev. Aug 2026', tags: ['Low-FODMAP', 'Batch', 'Basic'] },
    active: 15, total: 25, skill: 'basic', cost: 2.4, kcal: 500, p: 22, c: 58, fib: 8, fat: 22,
    ing: [QUINOA('1 cup cooked (185 g)'), TOFU('120 g'), REDPEP('1 pepper (75 g)'), SPINACH(), GIO],
    why: 'Eats cold — good for a shift with no microwave.',
  },
  chickenFriedRice: {
    id: 'chickenFriedRice', name: 'Chicken & egg fried rice with bok choy',
    src: { kind: 'bank', code: 'RB-126', rev: 'rev. Jul 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 15, total: 20, skill: 'basic', cost: 2.6, kcal: 530, p: 29, c: 68, fib: 4, fat: 18,
    ing: [RICE('1 cup cooked, day-old'), CHICKEN('90 g raw'), EGGS('1 large'), BOKCHOY, CARROT('50 g'), SOY, SCALLION],
    why: 'Uses leftover rice; one pan.',
  },

  // ─── Dinners ─────────────────────────────────
  sheetPanChicken: {
    id: 'sheetPanChicken', name: 'Sheet-pan chicken thighs, potatoes & green beans',
    src: { kind: 'bank', code: 'RB-201', rev: 'rev. Aug 2026', tags: ['Low-FODMAP', 'Weekday', 'Batch', 'Basic'] },
    active: 10, total: 30, skill: 'basic', cost: 3.3, kcal: 570, p: 34, c: 50, fib: 7, fat: 27,
    ing: [CHICKEN('150 g raw, boneless', 'Chicken thighs'), POTATO('220 g'), GBEANS, GIO, i('Rosemary, salt, pepper', 'to taste', 'none', 'FSR 7.20', 'Herbs: no FODMAPs')],
    why: 'One tray, 30 minutes total. Makes 2 portions so Day 2 lunch is covered.',
  },
  beefStirFry: {
    id: 'beefStirFry', name: 'Beef & vegetable stir-fry with rice',
    src: { kind: 'bank', code: 'RB-188', rev: 'rev. Jul 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 20, total: 20, skill: 'basic', cost: 3.6, kcal: 570, p: 30, c: 68, fib: 5, fat: 20,
    ing: [i('Lean beef strips', '120 g raw', 'none', 'FSR 4.01', 'Plain meat — no FODMAPs'), RICE(), BOKCHOY, CARROT('50 g'), REDPEP('¼ pepper (30 g)'), SOY, SCALLION],
    why: 'Sauce is soy, ginger and maple — no garlic or onion. Doubles for next-day lunch.',
  },
  turkeyMeatballs: {
    id: 'turkeyMeatballs', name: 'Turkey meatballs in garlic-free marinara, polenta',
    src: { kind: 'bank', code: 'RB-176', rev: 'rev. Jun 2026', tags: ['Low-FODMAP', 'Weekday', 'Batch', 'Basic'] },
    active: 15, total: 30, skill: 'basic', cost: 3.2, kcal: 560, p: 32, c: 56, fib: 6, fat: 24,
    ing: [i('Ground turkey, 93% lean', '130 g raw', 'none', 'FSR 4.09', 'Plain meat — no FODMAPs'), TOMATO(), i('Instant polenta', '50 g dry', 'green', 'FSR 2.17', 'Green up to 1 cup cooked'), SPINACH('1 cup (30 g)'), i('Parmesan', '10 g', 'green', 'FSR 3.09', 'Green up to 40 g'), GIO],
    why: 'Meatballs bind with egg and oats instead of breadcrumbs.',
  },
  fajitaBowl: {
    id: 'fajitaBowl', name: 'Chicken fajita bowls with corn tortillas',
    src: { kind: 'bank', code: 'RB-180', rev: 'rev. Aug 2026', tags: ['Low-FODMAP', 'Weekday', 'Batch', 'Basic'] },
    active: 20, total: 25, skill: 'basic', cost: 3.2, kcal: 570, p: 32, c: 62, fib: 7, fat: 22,
    ing: [CHICKEN(), CORN_TORT, RICE('½ cup cooked'), REDPEP('½ pepper (60 g)'), i('Fajita spice, no onion/garlic', '2 tsp', 'green', 'FSR 7.20', 'Plain spices green; check blends for onion/garlic'), CHEDDAR('20 g')],
    why: 'Spice blend made from scratch (cumin, paprika, oregano) — store blends usually contain onion.',
  },
  lemonChickenTray: {
    id: 'lemonChickenTray', name: 'Lemon chicken, quinoa & roasted zucchini traybake',
    src: { kind: 'bank', code: 'RB-093', rev: 'rev. May 2026', tags: ['Low-FODMAP', 'Basic'] },
    active: 15, total: 35, skill: 'basic', cost: 3.0, kcal: 550, p: 34, c: 54, fib: 7, fat: 22,
    ing: [CHICKEN(), QUINOA(), ZUCC, i('Lemon', '½ (juice & zest)', 'green', 'FSR 1.19', 'Juice green up to ½ cup'), GIO],
    why: 'Only 15 minutes hands-on; the rest is oven time.',
    fix: { to: 'lemonChickenSkillet', label: 'Swap to RB-095 — stovetop version of the same dish, 25 min total' },
  },
  lemonChickenSkillet: {
    id: 'lemonChickenSkillet', name: 'Lemon chicken & quinoa skillet with zucchini',
    src: { kind: 'bank', code: 'RB-095', rev: 'rev. Aug 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 20, total: 25, skill: 'basic', cost: 3.0, kcal: 550, p: 34, c: 54, fib: 7, fat: 22,
    ing: [CHICKEN(), QUINOA(), ZUCC, i('Lemon', '½ (juice & zest)', 'green', 'FSR 1.19', 'Juice green up to ½ cup'), GIO],
    why: 'Same ingredients as RB-093, cooked on the stovetop in 25 minutes.',
  },
  porkNoodles: {
    id: 'porkNoodles', name: 'Pork & bok choy rice noodles',
    src: { kind: 'bank', code: 'RB-150', rev: 'rev. Jul 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 20, total: 20, skill: 'basic', cost: 2.9, kcal: 560, p: 30, c: 70, fib: 3, fat: 18,
    ing: [i('Pork tenderloin, sliced', '130 g raw', 'none', 'FSR 4.06', 'Plain meat — no FODMAPs'), i('Rice noodles', '1 cup cooked (190 g)', 'green', 'FSR 2.24', 'Green up to 1 cup cooked'), BOKCHOY, SOY, i('Fresh ginger', '1 tsp', 'green', 'FSR 7.08', 'Green'), SCALLION],
    why: 'Fast weeknight dinner; doubles for next-day lunch.',
  },
  tofuSatay: {
    id: 'tofuSatay', name: 'Tofu & peanut satay stir-fry with rice',
    src: { kind: 'bank', code: 'RB-162', rev: 'rev. Aug 2026', tags: ['Low-FODMAP', 'Weekday', 'Basic'] },
    active: 20, total: 25, skill: 'basic', cost: 2.4, kcal: 580, p: 25, c: 66, fib: 6, fat: 27,
    ing: [TOFU('170 g'), RICE(), i('Peanut satay sauce (PB, soy, lime, maple)', '2 tbsp', 'green', 'FSR 5.08', 'Green up to 2 tbsp PB'), BOKCHOY, CARROT('50 g')],
    why: 'Plant protein night; satay made with peanut butter, not cashew.',
  },
  beefChili: {
    id: 'beefChili', name: 'Beef & lentil chili with rice (batch)',
    src: { kind: 'bank', code: 'RB-170', rev: 'rev. Sep 2026', tags: ['Low-FODMAP', 'Weekend', 'Batch', 'Basic'] },
    active: 20, total: 50, skill: 'basic', cost: 2.7, kcal: 550, p: 32, c: 52, fib: 9, fat: 22,
    ing: [i('Lean ground beef', '110 g raw', 'none', 'FSR 4.01', 'Plain meat — no FODMAPs'), i('Canned lentils, rinsed', '½ cup (46 g)', 'green', 'FSR 4.15', 'Canned & rinsed only: green up to 46 g'), TOMATO(), REDPEP('¼ pepper (30 g)'), RICE('½ cup cooked'), i('Cumin, paprika, oregano', '1 tbsp', 'none', 'FSR 7.20', 'Herbs & spices: no FODMAPs')],
    why: 'Saturday batch cook — 4 portions; one goes to Day 7 lunch, two can be frozen.',
  },
  chickenSoup: {
    id: 'chickenSoup', name: 'Chicken, rice & vegetable soup with sourdough (batch)',
    src: { kind: 'bank', code: 'RB-112', rev: 'rev. Aug 2026', tags: ['Low-FODMAP', 'Weekend', 'Batch', 'Basic'] },
    active: 15, total: 40, skill: 'basic', cost: 2.5, kcal: 490, p: 29, c: 56, fib: 5, fat: 16,
    ing: [CHICKEN('120 g raw'), i('Low-FODMAP chicken stock', '400 ml', 'green', 'FSR 7.04', 'Certified low-FODMAP stock only — regular stock has onion'), RICE('½ cup cooked'), CARROT(), i('Spelt sourdough', '1 slice (35 g)', 'green', 'FSR 2.30', 'Green up to 2 slices'), SCALLION],
    why: 'Sunday batch — gentle option for a flare day. Reheats for Day 8 lunch.',
  },
  shepherdsPie: {
    id: 'shepherdsPie', name: 'Shepherd’s pie with lentils & potato top (batch)',
    src: { kind: 'bank', code: 'RB-195', rev: 'rev. Sep 2026', tags: ['Low-FODMAP', 'Weekend', 'Batch', 'Basic'] },
    active: 25, total: 55, skill: 'basic', cost: 2.6, kcal: 550, p: 29, c: 58, fib: 8, fat: 22,
    ing: [i('Lean ground beef', '100 g raw', 'none', 'FSR 4.01', 'Plain meat — no FODMAPs'), i('Canned lentils, rinsed', '½ cup (46 g)', 'green', 'FSR 4.15', 'Canned & rinsed only: green up to 46 g'), POTATO('180 g, mashed with LF milk'), CARROT('50 g'), TOMATO('50 g')],
    why: 'Weekend batch that freezes well for week 3.',
  },
  steakPotato: {
    id: 'steakPotato', name: 'Steak, baked potato & green beans',
    src: { kind: 'bank', code: 'RB-208', rev: 'rev. Jul 2026', tags: ['Low-FODMAP', 'Weekend', 'Basic'] },
    active: 15, total: 30, skill: 'basic', cost: 4.4, kcal: 590, p: 35, c: 50, fib: 7, fat: 27,
    ing: [i('Sirloin steak', '140 g raw', 'none', 'FSR 4.01', 'Plain meat — no FODMAPs'), POTATO('220 g'), GBEANS, i('Butter', '1 tsp', 'green', 'FSR 3.01', 'Green up to 1 tbsp'), CHEDDAR('15 g')],
    why: 'End-of-fortnight dinner; still under the weekly budget.',
  },
};

// ─── Plan ─────────────────────────────────────
export interface DayDef {
  n: number;
  date: string; // display
  dow: string;
  weekday: boolean;
  note?: string;
  slots: Record<Slot, string>;
}

const D = (
  n: number, dow: string, date: string, b: string, s1: string, l: string, s2: string, d: string, note?: string,
): DayDef => ({
  n, dow, date, weekday: !['Sat', 'Sun'].includes(dow), note,
  slots: { breakfast: b, snack1: s1, lunch: l, snack2: s2, dinner: d },
});

export const DRAFTED_DAYS: DayDef[] = [
  D(1, 'Mon', 'Nov 23', 'pbOats', 'cheeseOrange', 'turkeySandwich', 'popcornPeanuts', 'sheetPanChicken', 'Elimination phase begins'),
  D(2, 'Tue', 'Nov 24', 'eggScramble', 'yogStraw', 'sheetPanChicken', 'energyBites', 'beefStirFry'),
  D(3, 'Wed', 'Nov 25', 'pbOats', 'eggsBanana', 'beefStirFry', 'seedMix', 'turkeyMeatballs'),
  D(4, 'Thu', 'Nov 26', 'honeyGranola', 'cheeseOrange', 'turkeyMeatballs', 'popcornPeanuts', 'fajitaBowl', 'Thanksgiving'),
  D(5, 'Fri', 'Nov 27', 'yogOats', 'eggsBanana', 'fajitaBowl', 'riceCakePB', 'lemonChickenTray'),
  D(6, 'Sat', 'Nov 28', 'tofuHash', 'eggsBanana', 'pestoSalad', 'cheeseOrange', 'beefChili'),
  D(7, 'Sun', 'Nov 29', 'eggTacos', 'popcornPeanuts', 'beefChili', 'yogKiwi', 'chickenSoup'),
  D(8, 'Mon', 'Nov 30', 'eggTacos', 'cheeseOrange', 'chickenSoup', 'riceCakePB', 'porkNoodles'),
  D(9, 'Tue', 'Dec 1', 'quinoaPorridge', 'eggsBanana', 'porkNoodles', 'popcornPeanuts', 'tofuSatay'),
];

export const PENDING_DAYS: DayDef[] = [
  D(10, 'Wed', 'Dec 2', 'yogOats', 'cheeseOrange', 'tofuSatay', 'popcornPeanuts', 'turkeyMeatballs'),
  D(11, 'Thu', 'Dec 3', 'eggScramble', 'kiwiChia', 'turkeyMeatballs', 'seedMix', 'beefStirFry'),
  D(12, 'Fri', 'Dec 4', 'pbOats', 'yogStraw', 'beefStirFry', 'energyBites', 'fajitaBowl'),
  D(13, 'Sat', 'Dec 5', 'tofuHash', 'eggsBanana', 'fajitaBowl', 'popcornPeanuts', 'shepherdsPie'),
  D(14, 'Sun', 'Dec 6', 'quinoaPorridge', 'cheeseOrange', 'shepherdsPie', 'seedMix', 'steakPotato'),
];

// Alternates the assistant may use when redrafting a rejected day
export const POOL: Record<Slot, string[]> = {
  breakfast: ['eggTacos', 'quinoaPorridge', 'eggScramble', 'pbOats', 'tofuHash', 'mapleGranola'],
  snack1: ['eggsBanana', 'kiwiChia', 'popcornPeanuts', 'cheeseOrange', 'seedMix'],
  lunch: ['quinoaTofuSalad', 'chickenRiceBowl', 'chickenFriedRice', 'turkeySandwich'],
  snack2: ['seedMix', 'energyBites', 'kiwiChia', 'popcornPeanuts', 'eggsBanana'],
  dinner: ['tofuSatay', 'porkNoodles', 'sheetPanChicken', 'beefStirFry', 'fajitaBowl'],
};

// ─── Client ───────────────────────────────────
export const CLIENT = {
  name: 'Tom Brennan',
  age: 52,
  pronoun: 'he',
  dx: 'IBS-D',
  dxDate: 'Oct 2026',
  start: 'Mon, Nov 23',
  sendBy: 'Fri, Nov 20',
  targets: { kcal: 2100, protein: 95, fibMin: 25, fibMax: 30 },
  budget: 120,
};

export const NOW_LABEL = 'Tue, Nov 17 · 8:42 pm';

// ─── Shopping ─────────────────────────────────
export interface ShopItem extends ShopLine {
  for: string[];
}

export const SHOP_W1: ShopItem[] = [
  { id: 'bananas', cat: 'Produce', name: 'Bananas, buy green-tipped', qty: '6', price: 1.09, for: ['pbOats', 'eggsBanana'] },
  { id: 'kiwi', cat: 'Produce', name: 'Kiwifruit', qty: '8', price: 2.59, for: ['honeyGranola', 'mapleGranola', 'kiwiChia', 'yogKiwi', 'eggScramble'] },
  { id: 'strawberries', cat: 'Produce', name: 'Strawberries', qty: '1 lb', price: 2.29, for: ['yogStraw', 'quinoaPorridge'] },
  { id: 'blueberries', cat: 'Produce', name: 'Blueberries', qty: '6 oz', price: 1.99, for: ['yogOats', 'milkOats'] },
  { id: 'oranges', cat: 'Produce', name: 'Navel oranges', qty: '4', price: 2.09, for: ['cheeseOrange'] },
  { id: 'spinach', cat: 'Produce', name: 'Baby spinach', qty: '5 oz', price: 1.99, for: ['eggScramble', 'turkeyMeatballs', 'eggTacos'] },
  { id: 'carrots', cat: 'Produce', name: 'Carrots', qty: '2 lb bag', price: 1.19, for: ['turkeySandwich', 'beefStirFry', 'chickenSoup'] },
  { id: 'potatoes', cat: 'Produce', name: 'Russet potatoes', qty: '5 lb bag', price: 2.59, for: ['sheetPanChicken', 'tofuHash', 'pestoSalad', 'pumpkinPestoSalad'] },
  { id: 'greenbeans', cat: 'Produce', name: 'Green beans', qty: '12 oz', price: 1.49, for: ['sheetPanChicken', 'pestoSalad', 'pumpkinPestoSalad'] },
  { id: 'peppers', cat: 'Produce', name: 'Red bell peppers', qty: '3', price: 1.99, for: ['beefStirFry', 'fajitaBowl', 'tofuHash', 'beefChili'] },
  { id: 'zucchini', cat: 'Produce', name: 'Zucchini', qty: '1', price: 0.59, for: ['lemonChickenTray', 'lemonChickenSkillet'] },
  { id: 'bokchoy', cat: 'Produce', name: 'Baby bok choy', qty: '1 lb', price: 1.59, for: ['beefStirFry'] },
  { id: 'scallions', cat: 'Produce', name: 'Scallions (use green tops only)', qty: '1 bunch', price: 0.69, for: ['tofuHash', 'beefStirFry', 'chickenSoup'] },
  { id: 'tomatoes', cat: 'Produce', name: 'Roma tomatoes', qty: '3', price: 0.99, for: ['turkeySandwich', 'eggTacos'] },
  { id: 'lemon', cat: 'Produce', name: 'Lemon', qty: '1', price: 0.49, for: ['lemonChickenTray', 'lemonChickenSkillet'] },

  { id: 'chickenbreast', cat: 'Meat, eggs & tofu', name: 'Chicken breast, boneless', qty: '2.5 lb', price: 6.59, for: ['fajitaBowl', 'pestoSalad', 'pumpkinPestoSalad', 'lemonChickenTray', 'lemonChickenSkillet', 'chickenSoup'] },
  { id: 'chickenthighs', cat: 'Meat, eggs & tofu', name: 'Chicken thighs, boneless', qty: '0.75 lb', price: 2.19, for: ['sheetPanChicken'] },
  { id: 'beefstrips', cat: 'Meat, eggs & tofu', name: 'Lean beef stir-fry strips', qty: '0.5 lb', price: 3.29, for: ['beefStirFry'] },
  { id: 'groundturkey', cat: 'Meat, eggs & tofu', name: 'Ground turkey, 93% lean', qty: '1 lb', price: 3.19, for: ['turkeyMeatballs'] },
  { id: 'groundbeef', cat: 'Meat, eggs & tofu', name: 'Lean ground beef, 90%', qty: '1 lb', price: 3.59, for: ['beefChili'] },
  { id: 'delituurkey', cat: 'Meat, eggs & tofu', name: 'Sliced turkey breast — label: no onion/garlic', qty: '6 oz', price: 2.29, for: ['turkeySandwich'] },
  { id: 'eggs', cat: 'Meat, eggs & tofu', name: 'Eggs, large', qty: '18', price: 2.79, for: ['eggScramble', 'eggsBanana', 'eggTacos', 'turkeyMeatballs'] },
  { id: 'tofu', cat: 'Meat, eggs & tofu', name: 'Firm tofu (not silken)', qty: '14 oz', price: 1.29, for: ['tofuHash'] },

  { id: 'lfmilk', cat: 'Lactose-free dairy & cheese', name: 'Lactose-free 2% milk', qty: '½ gallon', price: 2.59, for: ['pbOats', 'honeyGranola', 'mapleGranola', 'kiwiChia', 'quinoaPorridge', 'milkOats'] },
  { id: 'lfyogurt', cat: 'Lactose-free dairy & cheese', name: 'Lactose-free plain yogurt', qty: '32 oz tub', price: 2.99, for: ['yogStraw', 'yogOats', 'yogKiwi'] },
  { id: 'cheddar', cat: 'Lactose-free dairy & cheese', name: 'Aged cheddar, block', qty: '8 oz', price: 1.99, for: ['cheeseOrange', 'eggScramble', 'eggTacos', 'turkeySandwich', 'fajitaBowl'] },
  { id: 'parmesan', cat: 'Lactose-free dairy & cheese', name: 'Parmesan, grated', qty: '3 oz', price: 1.79, for: ['turkeyMeatballs'] },

  { id: 'sourdough', cat: 'Grains & bread', name: 'Spelt sourdough loaf', qty: '1', price: 3.29, for: ['eggScramble', 'turkeySandwich', 'chickenSoup'] },
  { id: 'corntortillas', cat: 'Grains & bread', name: 'Corn tortillas', qty: '12 ct', price: 1.19, for: ['fajitaBowl', 'eggTacos'] },
  { id: 'rice', cat: 'Grains & bread', name: 'Jasmine rice', qty: '2 lb', price: 1.59, for: ['beefStirFry', 'fajitaBowl', 'beefChili', 'chickenSoup'] },
  { id: 'polenta', cat: 'Grains & bread', name: 'Instant polenta', qty: '1 lb', price: 1.29, for: ['turkeyMeatballs'] },
  { id: 'quinoa', cat: 'Grains & bread', name: 'Quinoa', qty: '12 oz', price: 1.89, for: ['lemonChickenTray', 'lemonChickenSkillet'] },
  { id: 'ricecakes', cat: 'Grains & bread', name: 'Plain rice cakes', qty: '1 pack', price: 0.99, for: ['riceCakePB'] },
  { id: 'ricecrackers', cat: 'Grains & bread', name: 'Plain rice crackers', qty: '1 box', price: 1.29, for: ['cheeseOrange'] },
  { id: 'popcorn', cat: 'Grains & bread', name: 'Popcorn kernels', qty: '1 lb', price: 0.89, for: ['popcornPeanuts'] },

  { id: 'pesto', cat: 'Pantry', name: 'Garlic-free basil pesto, jarred', qty: '6 oz', price: 2.59, for: ['pestoSalad'] },
  { id: 'honey', cat: 'Pantry', name: 'Honey (for RB-058 granola)', qty: '12 oz', price: 2.29, for: ['honeyGranola'] },
  { id: 'lentils', cat: 'Pantry', name: 'Canned lentils', qty: '1 can', price: 0.89, for: ['beefChili'] },
  { id: 'tomatoescan', cat: 'Pantry', name: 'Diced tomatoes, no onion/garlic', qty: '2 cans', price: 1.59, for: ['turkeyMeatballs', 'beefChili'] },
  { id: 'stock', cat: 'Pantry', name: 'Low-FODMAP chicken stock', qty: '32 oz', price: 2.59, for: ['chickenSoup'] },
  { id: 'peanuts', cat: 'Pantry', name: 'Dry-roasted peanuts', qty: '16 oz', price: 1.79, for: ['popcornPeanuts', 'seedMix'] },
  { id: 'oats', cat: 'Pantry', name: 'Rolled oats', qty: '42 oz', price: 2.99, pantry: true, for: ['pbOats', 'yogOats', 'milkOats', 'honeyGranola', 'mapleGranola', 'energyBites'] },
  { id: 'pb', cat: 'Pantry', name: 'Peanut butter, no sugar added', qty: '16 oz', price: 1.99, pantry: true, for: ['pbOats', 'riceCakePB', 'energyBites'] },
  { id: 'chia', cat: 'Pantry', name: 'Chia seeds', qty: '12 oz', price: 3.19, pantry: true, for: ['pbOats', 'yogOats', 'milkOats', 'kiwiChia', 'yogKiwi', 'energyBites'] },
  { id: 'pumpkinseeds', cat: 'Pantry', name: 'Pumpkin seeds (pepitas)', qty: '8 oz', price: 2.79, pantry: true, for: ['yogStraw', 'honeyGranola', 'mapleGranola', 'seedMix', 'milkOats', 'pumpkinPestoSalad'] },
  { id: 'gio', cat: 'Pantry', name: 'Garlic-infused olive oil', qty: '8.5 oz', price: 4.29, pantry: true, for: ['tofuHash', 'sheetPanChicken', 'turkeyMeatballs', 'lemonChickenTray', 'lemonChickenSkillet', 'pumpkinPestoSalad'] },
  { id: 'soy', cat: 'Pantry', name: 'Soy sauce', qty: '10 oz', price: 1.29, pantry: true, for: ['beefStirFry'] },
  { id: 'maple', cat: 'Pantry', name: 'Pure maple syrup', qty: '8.5 oz', price: 3.59, pantry: true, for: ['yogOats', 'milkOats', 'energyBites', 'mapleGranola'] },
  { id: 'darkchoc', cat: 'Pantry', name: 'Dark chocolate 70%', qty: '3.5 oz bar', price: 1.59, for: ['seedMix', 'energyBites'] },
];

export const SHOP_W2: ShopItem[] = [
  { id: 'w2bananas', cat: 'Produce', name: 'Bananas, buy green-tipped', qty: '4', price: 0.89, for: [] },
  { id: 'w2kiwi', cat: 'Produce', name: 'Kiwifruit', qty: '6', price: 2.19, for: [] },
  { id: 'w2straw', cat: 'Produce', name: 'Strawberries', qty: '1 lb', price: 2.69, for: [] },
  { id: 'w2oranges', cat: 'Produce', name: 'Navel oranges', qty: '3', price: 1.79, for: [] },
  { id: 'w2spinach', cat: 'Produce', name: 'Baby spinach', qty: '5 oz', price: 2.29, for: [] },
  { id: 'w2bokchoy', cat: 'Produce', name: 'Baby bok choy', qty: '1 lb', price: 1.89, for: [] },
  { id: 'w2peppers', cat: 'Produce', name: 'Red bell peppers', qty: '3', price: 2.29, for: [] },
  { id: 'w2greenbeans', cat: 'Produce', name: 'Green beans', qty: '8 oz', price: 1.19, for: [] },
  { id: 'w2scallion', cat: 'Produce', name: 'Scallions (green tops only)', qty: '1 bunch', price: 0.79, for: [] },
  { id: 'w2chicken', cat: 'Meat, eggs & tofu', name: 'Chicken breast, boneless', qty: '1.5 lb', price: 4.59, for: [] },
  { id: 'w2pork', cat: 'Meat, eggs & tofu', name: 'Pork tenderloin', qty: '1 lb', price: 3.39, for: [] },
  { id: 'w2beef', cat: 'Meat, eggs & tofu', name: 'Lean beef stir-fry strips', qty: '0.5 lb', price: 3.79, for: [] },
  { id: 'w2turkey', cat: 'Meat, eggs & tofu', name: 'Ground turkey, 93% lean', qty: '1 lb', price: 3.59, for: [] },
  { id: 'w2groundbeef', cat: 'Meat, eggs & tofu', name: 'Lean ground beef, 90%', qty: '1 lb', price: 4.19, for: [] },
  { id: 'w2steak', cat: 'Meat, eggs & tofu', name: 'Sirloin steak', qty: '6 oz', price: 3.59, for: [] },
  { id: 'w2tofu', cat: 'Meat, eggs & tofu', name: 'Firm tofu (not silken)', qty: '2 × 14 oz', price: 2.99, for: [] },
  { id: 'w2eggs', cat: 'Meat, eggs & tofu', name: 'Eggs, large', qty: '12', price: 2.29, for: [] },
  { id: 'w2milk', cat: 'Lactose-free dairy & cheese', name: 'Lactose-free 2% milk', qty: '½ gallon', price: 2.99, for: [] },
  { id: 'w2yogurt', cat: 'Lactose-free dairy & cheese', name: 'Lactose-free plain yogurt', qty: '32 oz tub', price: 3.39, for: ['yog'] },
  { id: 'w2cheddar', cat: 'Lactose-free dairy & cheese', name: 'Aged cheddar, block', qty: '8 oz', price: 2.29, for: [] },
  { id: 'w2noodles', cat: 'Grains & bread', name: 'Rice noodles', qty: '14 oz', price: 1.89, for: [] },
  { id: 'w2quinoaflakes', cat: 'Grains & bread', name: 'Quinoa flakes', qty: '12 oz', price: 3.79, for: [] },
  { id: 'w2tortillas', cat: 'Grains & bread', name: 'Corn tortillas', qty: '12 ct', price: 1.39, for: [] },
  { id: 'w2ricecrackers', cat: 'Grains & bread', name: 'Plain rice crackers', qty: '1 box', price: 1.49, for: [] },
  { id: 'w2lentils', cat: 'Pantry', name: 'Canned lentils', qty: '1 can', price: 0.99, for: [] },
  { id: 'w2tomatoes', cat: 'Pantry', name: 'Diced tomatoes, no onion/garlic', qty: '2 cans', price: 1.79, for: [] },
  { id: 'w2sunflower', cat: 'Pantry', name: 'Sunflower seeds', qty: '8 oz', price: 1.89, for: [] },
];

export const SHOP_CATS: ShopCat[] = ['Produce', 'Meat, eggs & tofu', 'Lactose-free dairy & cheese', 'Grains & bread', 'Pantry'];
