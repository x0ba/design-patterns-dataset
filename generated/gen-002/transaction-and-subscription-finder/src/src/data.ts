import { HISTORY_START, TODAY, addDays, fromDay, iso, toDay, weekday } from './dates'

export type AccountId = 'checking' | 'visa'
export type PayVia = 'square' | 'apple' | 'paypal' | 'direct'
export type MerchantKind = 'sub' | 'bill' | 'shop' | 'transfer' | 'income'

export interface Account {
  id: AccountId
  name: string
  short: string
  mask: string
  /** positive cents; for the card this is the amount owed */
  balanceCents: number
  balanceLabel: string
}

export interface Merchant {
  id: string
  /** cleaned-up name shown everywhere */
  name: string
  category: string
  kind: MerchantKind
  payVia: PayVia
  /** extra words people use to describe this merchant in plain language */
  aka: string[]
  /** a plain-language remark that is specific to this merchant */
  note?: string
}

export interface Txn {
  id: string
  date: string
  /** cents. Spending is positive; deposits and card payments received are negative. */
  cents: number
  accountId: AccountId
  merchantId: string
  /** the messy text exactly as the bank prints it */
  raw: string
}

export const ACCOUNTS: Account[] = [
  {
    id: 'checking',
    name: 'Harbor Federal Checking',
    short: 'Harbor checking',
    mask: '4471',
    balanceCents: 231846,
    balanceLabel: 'Available',
  },
  {
    id: 'visa',
    name: 'Cobalt Rewards Visa',
    short: 'Cobalt Visa',
    mask: '0938',
    balanceCents: 41277,
    balanceLabel: 'Balance owed',
  },
]

export const accountById = (id: AccountId) => ACCOUNTS.find((a) => a.id === id)!

/* ------------------------------------------------------------------ */
/* Merchants                                                            */
/* ------------------------------------------------------------------ */

const M: Merchant[] = [
  // ---- the charges Renée is looking for -------------------------------
  {
    id: 'flowstate',
    name: 'FlowState Yoga',
    category: 'Fitness',
    kind: 'sub',
    payVia: 'square',
    aka: ['yoga', 'studio', 'fitness', 'gym', 'class', 'membership', 'workout', 'wellness', 'pilates', 'stretch'],
  },
  {
    id: 'apple',
    name: 'Apple App Store',
    category: 'Apps & software',
    kind: 'sub',
    payVia: 'apple',
    aka: ['app', 'apps', 'apple', 'itunes', 'subscription', 'software', 'iphone'],
    note:
      'Apple puts every app subscription under one name, so the statement doesn’t say which app this is. ' +
      'Your Apple receipt emails, or Settings › your name › Subscriptions on an iPhone, will name it.',
  },
  {
    id: 'orbit',
    name: 'Orbit Cycle Studio',
    category: 'Fitness',
    kind: 'shop',
    payVia: 'direct',
    aka: ['spin', 'cycling', 'bike', 'fitness', 'class', 'studio', 'gym', 'workout', 'exercise', 'trial'],
  },

  // ---- possible forgotten subscriptions -------------------------------
  {
    id: 'snapvault',
    name: 'SnapVault Photos',
    category: 'Apps & software',
    kind: 'sub',
    payVia: 'direct',
    aka: ['photo', 'photos', 'picture', 'cloud', 'storage', 'backup', 'plan'],
  },
  {
    id: 'basil',
    name: 'Basil & Thyme Meal Kit',
    category: 'Food delivery',
    kind: 'sub',
    payVia: 'direct',
    aka: ['meal', 'kit', 'dinner', 'food', 'cooking', 'delivery', 'box', 'recipe', 'groceries'],
    note:
      'Meal-kit plans usually keep running when you skip weeks. Skipping doesn’t cancel the plan, ' +
      'which may be why a box was charged after the break.',
  },
  {
    id: 'ledger',
    name: 'The Marlow Ledger (digital edition)',
    category: 'News & magazines',
    kind: 'sub',
    payVia: 'direct',
    aka: ['newspaper', 'news', 'paper', 'digital', 'magazine', 'reading', 'ledger'],
    note: 'Many news sites start with a $1 offer for a few months, then move to the regular price automatically.',
  },
  {
    id: 'northlight',
    name: 'Northlight TV',
    category: 'Streaming',
    kind: 'sub',
    payVia: 'paypal',
    aka: ['streaming', 'tv', 'television', 'video', 'shows', 'movies', 'watch', 'netflix'],
    note:
      'PayPal hides which company you paid, and prints only “STRMNGSVC” on the statement. ' +
      'We matched it to Northlight TV by the amount and the billing day.',
  },
  {
    id: 'reelhouse',
    name: 'Reelhouse Plus',
    category: 'Streaming',
    kind: 'sub',
    payVia: 'direct',
    aka: ['streaming', 'tv', 'television', 'video', 'shows', 'movies', 'watch'],
  },

  // ---- regular bills ---------------------------------------------------
  { id: 'rent', name: 'Cedarview Apartments', category: 'Rent', kind: 'bill', payVia: 'direct', aka: ['rent', 'apartment', 'housing', 'landlord'] },
  { id: 'power', name: 'Bayline Power & Light', category: 'Utilities', kind: 'bill', payVia: 'direct', aka: ['electric', 'electricity', 'power', 'utility', 'energy'] },
  { id: 'internet', name: 'Wavecrest Internet', category: 'Utilities', kind: 'bill', payVia: 'direct', aka: ['internet', 'wifi', 'utility', 'cable'] },
  { id: 'phone', name: 'Tessera Mobile', category: 'Phone', kind: 'bill', payVia: 'direct', aka: ['phone', 'cell', 'mobile', 'wireless', 'utility'] },
  { id: 'cobaltpay', name: 'Payment to Cobalt Rewards Visa', category: 'Card payment', kind: 'transfer', payVia: 'direct', aka: ['credit', 'card', 'payment', 'visa', 'cobalt'] },
  { id: 'payroll', name: 'Lakeshore Family Dental (paycheck)', category: 'Income', kind: 'income', payVia: 'direct', aka: ['paycheck', 'payroll', 'salary', 'deposit', 'income', 'work'] },

  // ---- everyday spending ----------------------------------------------
  { id: 'fieldmart', name: 'Fieldmart', category: 'Groceries', kind: 'shop', payVia: 'direct', aka: ['grocery', 'groceries', 'supermarket', 'food', 'store'] },
  { id: 'greenleaf', name: 'Greenleaf Market', category: 'Groceries', kind: 'shop', payVia: 'square', aka: ['grocery', 'groceries', 'produce', 'food', 'market', 'store'] },
  { id: 'daybreak', name: 'Daybreak Coffee', category: 'Coffee & cafés', kind: 'shop', payVia: 'square', aka: ['coffee', 'cafe', 'latte', 'espresso', 'drink'] },
  { id: 'mirabel', name: 'Mirabel Bakery', category: 'Coffee & cafés', kind: 'shop', payVia: 'square', aka: ['bakery', 'bread', 'pastry', 'cafe', 'coffee', 'food'] },
  { id: 'pinecrest', name: 'Pinecrest Fuel', category: 'Gas', kind: 'shop', payVia: 'direct', aka: ['gas', 'gasoline', 'fuel', 'car', 'station'] },
  { id: 'lupitas', name: 'Lupita’s Taqueria', category: 'Restaurants', kind: 'shop', payVia: 'square', aka: ['restaurant', 'dinner', 'lunch', 'tacos', 'mexican', 'food', 'eating'] },
  { id: 'amazon', name: 'Amazon', category: 'Shopping', kind: 'shop', payVia: 'direct', aka: ['amazon', 'online', 'order', 'package', 'marketplace'] },
  { id: 'parkway', name: 'Parkway Pharmacy', category: 'Health', kind: 'shop', payVia: 'direct', aka: ['pharmacy', 'drug', 'medicine', 'prescription', 'health', 'drugstore'] },
  { id: 'hollis', name: 'Hollis & Reed', category: 'Clothing', kind: 'shop', payVia: 'direct', aka: ['clothes', 'clothing', 'shirt', 'shoes', 'shopping', 'fashion'] },
  { id: 'rowan', name: 'Rowan Pet Supply', category: 'Pets', kind: 'shop', payVia: 'direct', aka: ['pet', 'dog', 'cat', 'food', 'vet'] },
  { id: 'ridehop', name: 'Ridehop', category: 'Rides', kind: 'shop', payVia: 'direct', aka: ['ride', 'rideshare', 'taxi', 'uber', 'lyft', 'car', 'trip'] },
  { id: 'kestrel', name: 'Kestrel Books', category: 'Shopping', kind: 'shop', payVia: 'direct', aka: ['book', 'books', 'bookstore', 'reading'] },
  { id: 'delmar', name: 'Delmar Cinemas', category: 'Entertainment', kind: 'shop', payVia: 'direct', aka: ['movie', 'movies', 'cinema', 'theater', 'film', 'tickets'] },
  { id: 'boxwood', name: 'Boxwood Hardware', category: 'Home', kind: 'shop', payVia: 'direct', aka: ['hardware', 'home', 'tools', 'garden', 'repair'] },
  { id: 'bagels', name: 'Sunrise Bagels', category: 'Restaurants', kind: 'shop', payVia: 'square', aka: ['bagel', 'breakfast', 'brunch', 'food', 'restaurant'] },
  { id: 'diner', name: 'Harborview Diner', category: 'Restaurants', kind: 'shop', payVia: 'direct', aka: ['diner', 'breakfast', 'dinner', 'food', 'restaurant'] },
  { id: 'sushi', name: 'Tidepool Sushi', category: 'Restaurants', kind: 'shop', payVia: 'square', aka: ['sushi', 'japanese', 'dinner', 'food', 'restaurant'] },
  { id: 'pizza', name: 'Corner Slice Pizza', category: 'Restaurants', kind: 'shop', payVia: 'square', aka: ['pizza', 'slice', 'dinner', 'food', 'restaurant'] },
  { id: 'burger', name: 'Quickbite Burgers', category: 'Restaurants', kind: 'shop', payVia: 'direct', aka: ['burger', 'fast', 'lunch', 'food', 'restaurant'] },
  { id: 'brew', name: 'Tallgrass Brewing', category: 'Restaurants', kind: 'shop', payVia: 'square', aka: ['beer', 'brewery', 'bar', 'drinks', 'dinner', 'restaurant'] },
  { id: 'produce', name: 'Marlow Street Produce', category: 'Groceries', kind: 'shop', payVia: 'square', aka: ['grocery', 'groceries', 'produce', 'vegetables', 'fruit', 'food'] },
  { id: 'valuemart', name: 'Valuemart', category: 'Shopping', kind: 'shop', payVia: 'direct', aka: ['store', 'shopping', 'household', 'supplies', 'target'] },
  { id: 'penny', name: 'Penny & Pine', category: 'Home', kind: 'shop', payVia: 'direct', aka: ['home', 'household', 'store', 'shopping', 'decor'] },
  { id: 'garage', name: 'ParkPay Garage', category: 'Parking', kind: 'shop', payVia: 'direct', aka: ['parking', 'garage', 'car', 'downtown'] },
  { id: 'salon', name: 'Maison Violet Salon', category: 'Personal care', kind: 'shop', payVia: 'square', aka: ['salon', 'hair', 'haircut', 'nails', 'beauty'] },
  { id: 'vet', name: 'Alder Veterinary Clinic', category: 'Pets', kind: 'shop', payVia: 'direct', aka: ['vet', 'veterinarian', 'pet', 'dog', 'cat', 'animal'] },
  { id: 'posy', name: 'Paper & Posy', category: 'Gifts', kind: 'shop', payVia: 'square', aka: ['gift', 'flowers', 'card', 'present', 'birthday'] },
]

export const MERCHANTS = new Map(M.map((m) => [m.id, m]))

/* ------------------------------------------------------------------ */
/* Deterministic transaction generator                                  */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20261116)
const rint = (lo: number, hi: number) => Math.floor(lo + rng() * (hi - lo + 1))
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]
const cents = (lo: number, hi: number) => Math.round((lo + rng() * (hi - lo)) * 100)
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const alnum = (n: number) => Array.from({ length: n }, () => ALNUM[rint(0, ALNUM.length - 1)]).join('')

type Draft = Omit<Txn, 'id'>
const fixed: Draft[] = []

function add(merchantId: string, date: string, c: number, accountId: AccountId, raw: string) {
  fixed.push({ merchantId, date, cents: c, accountId, raw })
}

/** every month on `day`, between `start` and `end` (inclusive), never after today */
function monthly(start: string, end: string, day: number): string[] {
  const out: string[] = []
  const y0 = Number(start.slice(0, 4))
  const m0 = Number(start.slice(5, 7))
  for (let k = 0; k < 40; k++) {
    const total = y0 * 12 + (m0 - 1) + k
    const y = Math.floor(total / 12)
    const m = (total % 12) + 1
    const d = iso(y, m, day)
    if (toDay(d) > toDay(end) || toDay(d) > toDay(TODAY)) break
    if (toDay(d) >= toDay(start)) out.push(d)
  }
  return out
}

// FlowState Yoga: $14.99 on the 2nd, Apr 2 – Nov 2 (8 charges, $119.92)
for (const d of monthly('2026-04-02', TODAY, 2)) add('flowstate', d, 1499, 'checking', 'SQ *FLOWSTATE YOGA 8774')
// Apple: $12.99 on the very same days
for (const d of monthly('2026-04-02', TODAY, 2)) add('apple', d, 1299, 'visa', 'APPLE.COM/BILL 866-712')
// The one-time class pack in March
add('orbit', '2026-03-11', 2900, 'visa', 'ORBITCYCLE*CLASSPACK 10')

// Cloud photo plan: $2.99 on the 21st, every month of the history
for (const d of monthly('2025-09-21', TODAY, 21)) add('snapvault', d, 299, 'visa', 'SNAPVAULT.IO PLAN 50GB')

// Meal kit: weekly Mondays, some skipped weeks, then nothing for 5 weeks, then $71.94 on Nov 9
const mealKit: [string, number][] = [
  ['2026-07-06', 4796], ['2026-07-13', 4796], ['2026-07-20', 5994], ['2026-07-27', 5994],
  ['2026-08-03', 5994], ['2026-08-10', 7194], ['2026-08-17', 7194], ['2026-08-31', 7194],
  ['2026-09-07', 7194], ['2026-09-14', 7194], ['2026-09-28', 7194], ['2026-11-09', 7194],
]
for (const [d, c] of mealKit) add('basil', d, c, 'checking', 'BASIL&THYME*WKLYBOX 8003')

// Newspaper: $1 for six months, then $17 from September
for (const d of monthly('2026-03-14', TODAY, 14)) {
  add('ledger', d, toDay(d) < toDay('2026-09-01') ? 100 : 1700, 'visa', 'MARLOWLEDGER.COM DIGI')
}

// Streaming, both on the 15th
for (const d of monthly('2025-10-15', TODAY, 15)) {
  add('northlight', d, toDay(d) < toDay('2026-08-01') ? 1099 : 1199, 'checking', 'PAYPAL *STRMNGSVC')
}
for (const d of monthly('2026-02-15', TODAY, 15)) add('reelhouse', d, 999, 'visa', 'REELHOUSE PLUS 888-410')

// Regular bills
for (const d of monthly('2025-10-01', TODAY, 1)) {
  add('rent', d, toDay(d) < toDay('2026-01-01') ? 142500 : 147500, 'checking', 'CEDARVIEW APTS 4B RENT')
}
for (const d of monthly(HISTORY_START, TODAY, 10)) add('power', d, cents(46, 118), 'checking', 'BAYLINE P&L AUTOPAY')
for (const d of monthly('2025-09-16', TODAY, 6)) add('internet', d, 6499, 'checking', 'WAVECREST INTERNET AUTOPAY')
for (const d of monthly('2025-09-24', TODAY, 24)) add('phone', d, 5200, 'visa', 'TESSERA MOBILE 800-261')
for (const d of monthly('2025-10-25', '2026-10-25', 25)) {
  const c = cents(380, 910)
  add('cobaltpay', d, c, 'checking', 'COBALT REWARDS PMT ONLINE')
  add('cobaltpay', d, -c, 'visa', 'PAYMENT THANK YOU')
}
// Biweekly paychecks (Fridays)
for (let d = '2025-09-19'; toDay(d) <= toDay(TODAY); d = addDays(d, 14)) {
  add('payroll', d, -cents(1790, 1905), 'checking', 'LAKESHORE FAMILY DENT PAYROLL')
}

interface Filler {
  merchantId: string
  weight: number
  raw: string
  amount: () => number
  visaShare: number
}
const FILLERS: Filler[] = [
  { merchantId: 'daybreak', weight: 9, raw: 'SQ *DAYBREAK COFFEE 2217', amount: () => pick([475, 525, 650, 585, 780, 395]) + rint(0, 1) * 150, visaShare: 0.4 },
  { merchantId: 'fieldmart', weight: 10, raw: 'FIELDMART #0214', amount: () => cents(18, 142), visaShare: 0.6 },
  { merchantId: 'amazon', weight: 9, raw: 'AMZN Mktp US*{id6}', amount: () => cents(8, 118), visaShare: 0.85 },
  { merchantId: 'greenleaf', weight: 6, raw: 'SQ *GREENLEAF MKT 0057', amount: () => cents(9, 66), visaShare: 0.3 },
  { merchantId: 'pinecrest', weight: 6, raw: 'PINECREST FUEL #318', amount: () => cents(31, 58), visaShare: 0.7 },
  { merchantId: 'lupitas', weight: 5, raw: 'TST* LUPITAS TAQUERIA', amount: () => cents(11, 47), visaShare: 0.5 },
  { merchantId: 'mirabel', weight: 3, raw: 'SQ *MIRABEL BAKERY', amount: () => cents(5, 28), visaShare: 0.3 },
  { merchantId: 'parkway', weight: 3, raw: 'PARKWAY PHARMACY 4412', amount: () => cents(6, 49), visaShare: 0.4 },
  { merchantId: 'ridehop', weight: 3, raw: 'RIDEHOP *TRIP {id6}', amount: () => cents(8, 33), visaShare: 0.9 },
  { merchantId: 'hollis', weight: 2, raw: 'HOLLIS&REED ONLINE', amount: () => cents(28, 112), visaShare: 0.9 },
  { merchantId: 'rowan', weight: 2, raw: 'ROWAN PET SUPPLY #22', amount: () => cents(18, 66), visaShare: 0.5 },
  { merchantId: 'kestrel', weight: 1.5, raw: 'KESTREL BOOKS', amount: () => cents(12, 41), visaShare: 0.6 },
  { merchantId: 'delmar', weight: 1.5, raw: 'DELMAR CINEMAS 0091', amount: () => cents(12, 29), visaShare: 0.8 },
  { merchantId: 'boxwood', weight: 1.5, raw: 'BOXWOOD HARDWARE', amount: () => cents(7, 88), visaShare: 0.6 },
  { merchantId: 'bagels', weight: 5, raw: 'SQ *SUNRISE BAGELS', amount: () => cents(6, 22), visaShare: 0.4 },
  { merchantId: 'diner', weight: 4, raw: 'HARBORVIEW DINER 0412', amount: () => cents(14, 39), visaShare: 0.5 },
  { merchantId: 'sushi', weight: 4, raw: 'TST* TIDEPOOL SUSHI', amount: () => cents(24, 78), visaShare: 0.7 },
  { merchantId: 'pizza', weight: 5, raw: 'SQ *CORNER SLICE 0338', amount: () => cents(7, 31), visaShare: 0.5 },
  { merchantId: 'burger', weight: 3, raw: 'QUICKBITE #1187', amount: () => cents(8, 19), visaShare: 0.4 },
  { merchantId: 'brew', weight: 3, raw: 'TST* TALLGRASS BREWING', amount: () => cents(16, 58), visaShare: 0.7 },
  { merchantId: 'produce', weight: 5, raw: 'SQ *MARLOW ST PRODUCE', amount: () => cents(8, 44), visaShare: 0.3 },
  { merchantId: 'valuemart', weight: 7, raw: 'VALUEMART #5520', amount: () => cents(12, 96), visaShare: 0.8 },
  { merchantId: 'penny', weight: 3, raw: 'PENNY&PINE 0233', amount: () => cents(9, 61), visaShare: 0.8 },
  { merchantId: 'garage', weight: 3, raw: 'PARKPAY GARAGE 22', amount: () => cents(6, 24), visaShare: 0.6 },
  { merchantId: 'salon', weight: 1, raw: 'SQ *MAISON VIOLET', amount: () => cents(55, 140), visaShare: 0.9 },
  { merchantId: 'vet', weight: 1, raw: 'ALDER VETERINARY CLINIC', amount: () => cents(48, 260), visaShare: 0.9 },
  { merchantId: 'posy', weight: 1.5, raw: 'SQ *PAPER AND POSY', amount: () => cents(14, 70), visaShare: 0.7 },
]
const TOTAL_WEIGHT = FILLERS.reduce((s, f) => s + f.weight, 0)

export const TARGET_COUNT = 1920
const fillerCount = TARGET_COUNT - fixed.length
const firstDay = toDay(HISTORY_START)
const lastDay = toDay(TODAY)
const filler: Draft[] = []
for (let i = 0; i < fillerCount; i++) {
  let r = rng() * TOTAL_WEIGHT
  let f = FILLERS[0]
  for (const cand of FILLERS) {
    r -= cand.weight
    if (r <= 0) { f = cand; break }
  }
  // Slightly more spending on weekends and Fridays, as real life does
  let day = rint(firstDay, lastDay)
  if (weekday(fromDay(day)) < 3 && rng() < 0.3) day = Math.min(lastDay, day + rint(2, 4))
  filler.push({
    merchantId: f.merchantId,
    date: fromDay(day),
    cents: f.amount(),
    accountId: rng() < f.visaShare ? 'visa' : 'checking',
    raw: f.raw.replace('{id6}', alnum(6)).replace('{n4}', String(rint(1000, 9999))),
  })
}

export const TXNS: Txn[] = [...fixed, ...filler]
  .sort((a, b) => (a.date === b.date ? a.merchantId.localeCompare(b.merchantId) : a.date < b.date ? 1 : -1))
  .map((t, i) => ({ ...t, id: `t${String(i + 1).padStart(4, '0')}` }))
