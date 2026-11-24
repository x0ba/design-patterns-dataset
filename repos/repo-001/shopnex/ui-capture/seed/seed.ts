// Seeds an established shop ("Northfield Supply Co.") into the embedded database, through ShopNex's own services:
// owner + staff accounts, a catalog with real product photos uploaded into the file library, collections,
// checkout settings, discounts, taxes, pages, menus, ~6 months of customers and orders.
// Run by .ui-capture/seed.sh (needs the env from env.sh). Refuses to run twice: delete .ui-capture/data to reseed.
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { and, eq, sql } from 'drizzle-orm'
import { db, schema, prepareDatabase } from '../../modules/db/src/index.ts'
import { auth, SUPER_ADMIN_ROLE } from '../../modules/auth/src/index.ts'
import { withSignUpAllowed } from '../../modules/auth/src/sign-up-policy.ts'
import { DEFAULT_SHOP_ID, addMember, ensureDefaultShop, updateShop } from '../../modules/tenancy/src/index.ts'
import { collectionService, productService } from '../../modules/catalog/src/index.ts'
import { fileService } from '../../modules/files/src/index.ts'
import { checkoutSettings } from '../../modules/cart/src/index.ts'
import { discountService, taxService } from '../../modules/pricing/src/index.ts'
import { menuService, pageService } from '../../modules/content/src/index.ts'
import { channelService } from '../../modules/channels/src/index.ts'
import { CATALOG, COLLECTIONS, VENDORS, parseCsv, rebrand } from './catalog.ts'
import { seedOrders } from './orders.ts'
import { seedExtras } from './extras.ts'

const ASSETS = join(import.meta.dirname, '..', 'assets', 'vendure')
const SHOP = DEFAULT_SHOP_ID

export const OWNER = { name: 'Jordan Reyes', email: 'jordan@northfieldsupply.co', password: 'northfield-2026' }
const STAFF = [
  { name: 'Priya Raman', email: 'priya@northfieldsupply.co', password: 'northfield-staff-1' },
  { name: 'Sam Whitaker', email: 'sam@northfieldsupply.co', password: 'northfield-staff-2' },
]

await prepareDatabase()
const [existing] = await db.select({ id: schema.user.id }).from(schema.user).limit(1)
if (existing) {
  console.log('Database already seeded; delete .ui-capture/data to start over.')
  process.exit(0)
}

// ── shop + accounts ────────────────────────────────────────────────────────────
await ensureDefaultShop()
await updateShop(SHOP, {
  name: 'Northfield Supply Co.',
  currency: 'USD',
  storefrontUrl: null,
  seoTitle: 'Northfield Supply Co. — Gear for work, play and home',
  seoDescription:
    'Independent shop in Portland, Oregon selling desk gear, film cameras, outdoor equipment, houseplants and furniture we actually use.',
  legalName: 'Northfield Supply Company LLC',
  businessAddress: '2114 SE Division St, Portland, OR 97202, United States',
  taxId: 'EIN 93-4821077',
  unpaidOrderExpiryHours: 72,
  cookieBanner: true,
} as never)

async function createAccount(name: string, email: string, password: string, superAdmin: boolean) {
  const { user } = await withSignUpAllowed(() => auth.api.signUpEmail({ body: { name, email, password } }))
  if (superAdmin) await db.update(schema.user).set({ role: SUPER_ADMIN_ROLE }).where(eq(schema.user.id, user.id))
  await addMember(SHOP, user.id)
  return user
}
const owner = await createAccount(OWNER.name, OWNER.email, OWNER.password, true)
const staffUsers = []
for (const s of STAFF) staffUsers.push(await createAccount(s.name, s.email, s.password, false))
console.log('accounts ok')

// ── files + catalog ────────────────────────────────────────────────────────────
const uploaded = new Map<string, string>()
async function upload(filename: string, alt: string) {
  if (uploaded.has(filename)) return uploaded.get(filename)!
  const bytes = readFileSync(join(ASSETS, filename))
  const file = new File([bytes], filename, { type: 'image/jpeg' })
  const row = await fileService.upload(SHOP, file, { alt })
  uploaded.set(filename, row.url)
  return row.url
}

const rows = parseCsv(readFileSync(join(ASSETS, 'products.csv'), 'utf8'))
const collectionIds = new Map<string, string>()
for (const c of COLLECTIONS) {
  const col = await collectionService.create(SHOP, {
    title: c.title,
    description: c.description,
    descriptionHtml: `<p>${c.description}</p>`,
  })
  collectionIds.set(c.title, col.id)
}

const created: { id: string; title: string; collections: string[] }[] = []
for (const p of rows) {
  const meta = CATALOG[p.name]
  if (!meta) throw new Error(`No catalog entry for ${p.name}`)
  const imageUrl = await upload(p.asset, meta.alt ?? p.name)
  const brand = p.brand ? (VENDORS[p.brand] ?? p.brand) : meta.vendor
  const description = rebrand(p.description)
  const groups = p.optionGroups
  const stock = meta.stock ?? []
  const input = {
    title: meta.title ?? p.name,
    status: meta.status ?? 'active',
    description,
    descriptionHtml: `<p>${description}</p>${meta.extraHtml ?? ''}`,
    vendor: brand ?? 'Northfield',
    productType: meta.type,
    tags: meta.tags,
    images: [{ url: imageUrl, alt: meta.alt ?? p.name }],
    seo: meta.seo ? { title: meta.seo, description: description.slice(0, 155) } : undefined,
    ...(groups.length
      ? {
          options: groups.map((name, i) => ({
            name: titleCase(name),
            values: [...new Set(p.variants.map((v) => v.values[i]!))],
          })),
          variants: p.variants.map((v, i) => ({
            options: Object.fromEntries(groups.map((g, gi) => [titleCase(g), v.values[gi]!])),
            sku: v.sku,
            priceCents: Math.round(v.price * 100 * (meta.priceFactor ?? 1)),
            compareAtPriceCents: meta.compareAt ? Math.round(v.price * 100 * meta.compareAt) : null,
            inventoryQuantity: stock[i] ?? stock[0] ?? 40,
          })),
        }
      : {
          variants: [
            {
              sku: p.variants[0]!.sku,
              priceCents: Math.round(p.variants[0]!.price * 100 * (meta.priceFactor ?? 1)),
              compareAtPriceCents: meta.compareAt ? Math.round(p.variants[0]!.price * 100 * meta.compareAt) : null,
              inventoryQuantity: stock[0] ?? 40,
            },
          ],
        }),
  }
  const product = await productService.create(SHOP, input as never)
  created.push({ id: product.id, title: product.title, collections: meta.collections })
  for (const c of meta.collections) await collectionService.addProduct(SHOP, collectionIds.get(c)!, product.id)
}
// Collection cover images: the first product's photo
for (const c of COLLECTIONS) {
  const first = rows.find((r) => CATALOG[r.name]?.collections.includes(c.title))
  if (first) await collectionService.update(SHOP, collectionIds.get(c.title)!, { imageUrl: uploaded.get(first.asset) })
}
// Products are listed newest first: spread their creation over the last year
await db.execute(sql`
  update products set
    created_at = localtimestamp - make_interval(days => 120 + (abs(hashtext(id::text)) % 240)),
    updated_at = localtimestamp - make_interval(days => (abs(hashtext(slug)) % 60))
  where shop_id = ${SHOP}`)
await db.execute(sql`update files set created_at = localtimestamp - make_interval(days => 120 + (abs(hashtext(id::text)) % 240)) where shop_id = ${SHOP}`)
await db.execute(sql`update collections set created_at = localtimestamp - make_interval(days => 200 + (abs(hashtext(id::text)) % 150)) where shop_id = ${SHOP}`)
console.log(`catalog ok: ${created.length} products, ${COLLECTIONS.length} collections`)

// ── checkout settings ──────────────────────────────────────────────────────────
await channelService.getDefault(SHOP)
for (const r of [
  { name: 'Standard shipping (3–6 business days)', priceCents: 695, freeAboveCents: 10000, active: true },
  { name: 'Express shipping (1–2 business days)', priceCents: 1895, freeAboveCents: null, active: true },
  { name: 'Freight delivery — furniture', priceCents: 7900, freeAboveCents: null, active: true },
  { name: 'Local pickup — SE Division St', priceCents: 0, freeAboveCents: null, active: true },
  { name: 'Holiday overnight', priceCents: 3200, freeAboveCents: null, active: false },
])
  await checkoutSettings.createShippingRate(SHOP, r)
for (const m of [
  {
    name: 'Bank transfer',
    additionalDetails: 'Pay by ACH or wire. Orders ship once the transfer clears (usually 1–2 business days).',
    instructions:
      'Send the order total to Northfield Supply Company LLC, Umpqua Bank, routing 123006800, account 4410 2287 19. Put your order number in the memo.',
    active: true,
  },
  {
    name: 'Pay at pickup',
    additionalDetails: 'Card or cash at our Portland shop. Only for local pickup orders.',
    instructions: 'We will email you when your order is ready. Bring your order number.',
    active: true,
  },
  { name: 'Purchase order (wholesale accounts)', additionalDetails: 'Net 30 for approved accounts.', instructions: null, active: false },
])
  await checkoutSettings.createPaymentMethod(SHOP, m)

const days = (n: number) => new Date(Date.now() + n * 86_400_000)
for (const d of [
  { code: 'WELCOME10', type: 'percentage', value: 10, oncePerCustomer: true, active: true },
  { code: 'FREESHIP', type: 'free_shipping', value: 0, minSubtotalCents: 5000, active: true },
  { code: 'PLANTPARENT', type: 'fixed_amount', value: 500, minSubtotalCents: 3000, active: true },
  { code: 'FILMWEEK15', type: 'percentage', value: 15, active: false, startsAt: days(-70), endsAt: days(-63) },
  { code: 'SPRINGDESK', type: 'percentage', value: 20, usageLimit: 150, active: true, startsAt: days(-200), endsAt: days(-140) },
  { code: 'BFCM25', type: 'percentage', value: 25, active: true, startsAt: days(10), endsAt: days(14) },
  { code: 'LOYAL20', type: 'fixed_amount', value: 2000, minSubtotalCents: 15000, oncePerCustomer: true, active: true },
  { code: 'STAFF30', type: 'percentage', value: 30, active: true, usageLimit: 40 },
  { code: 'REI-SWAP', type: 'fixed_amount', value: 1500, active: false, usageLimit: 25 },
] as const)
  await discountService.create(SHOP, { minSubtotalCents: null, usageLimit: null, oncePerCustomer: false, startsAt: null, endsAt: null, ...d } as never)

for (const t of [
  { countryCode: 'US', province: 'CA', name: 'California sales tax', ratePercent: '7.25' },
  { countryCode: 'US', province: 'WA', name: 'Washington sales tax', ratePercent: '6.5' },
  { countryCode: 'US', province: 'NY', name: 'New York sales tax', ratePercent: '8.875' },
  { countryCode: 'US', province: 'TX', name: 'Texas sales tax', ratePercent: '6.25' },
  { countryCode: 'US', province: 'IL', name: 'Illinois sales tax', ratePercent: '6.25' },
  { countryCode: 'CA', province: 'ON', name: 'HST', ratePercent: '13' },
  { countryCode: 'CA', province: 'BC', name: 'GST + PST', ratePercent: '12' },
  { countryCode: 'GB', province: null, name: 'VAT', ratePercent: '20' },
  { countryCode: 'DE', province: null, name: 'MwSt', ratePercent: '19' },
])
  await taxService.create(SHOP, t as never).catch((e: Error) => console.warn('tax', t.name, e.message))
console.log('checkout settings ok')

// ── pages + menus ──────────────────────────────────────────────────────────────
const pages: Record<string, { id: string; title: string }> = {}
for (const p of [
  {
    key: 'about',
    title: 'About us',
    published: true,
    bodyHtml:
      '<p>Northfield started in 2019 as a weekend stall at the Portland Saturday Market, selling refurbished film cameras out of two milk crates. Today we are a team of six in a small shop on SE Division Street.</p><p>We stock things we use ourselves: a desk setup that lasts, cameras worth carrying, gear for getting outside and plants that survive a Pacific Northwest winter. Every film camera is tested by hand before it ships.</p><h2>Visit</h2><p>2114 SE Division St, Portland, OR 97202<br>Tue–Sat 10am–6pm, Sun 11am–4pm</p>',
  },
  {
    key: 'shipping',
    title: 'Shipping & returns',
    published: true,
    bodyHtml:
      '<h2>Shipping</h2><p>Orders placed before 1pm Pacific ship the same business day. Standard shipping is free on orders over $100 in the contiguous US. Furniture ships by freight in 7–10 business days; we will call to book a delivery window.</p><h2>Returns</h2><p>Return unused items within 30 days for a full refund. Plants can\'t be returned, but if one arrives damaged send us a photo within 48 hours and we will replace it. Vintage cameras carry a 90-day functional warranty.</p>',
  },
  {
    key: 'faq',
    title: 'FAQ',
    published: true,
    bodyHtml:
      '<h3>Do you ship plants in winter?</h3><p>Yes, with heat packs from November to March. We hold plant orders if the forecast at your address is below 20°F.</p><h3>Do vintage cameras come with film?</h3><p>Every tested camera ships with one roll of Portra 400 so you can start right away.</p><h3>Can I pick up my order?</h3><p>Choose "Local pickup" at checkout and we will email you when it is ready, usually within two hours.</p>',
  },
  { key: 'contact', title: 'Contact', published: true, bodyHtml: '<p>Email hello@northfieldsupply.co or call (503) 555-0148, Tue–Sat 10am–6pm Pacific.</p>' },
  {
    key: 'wholesale',
    title: 'Wholesale program',
    published: false,
    bodyHtml: '<p>DRAFT — terms for cafés and offices buying plants and furniture in bulk. Waiting on pricing from Sam.</p>',
  },
  {
    key: 'film',
    title: 'A beginner\'s guide to shooting film',
    published: true,
    bodyHtml:
      '<p>Picked up your first film camera? Start with ISO 400 film, shoot in daylight and don\'t worry about every frame. Our favourite first roll: a walk around your neighbourhood at golden hour.</p><ol><li>Load the film in the shade.</li><li>Set the ISO dial to match the box.</li><li>Meter for the shadows, the film will take care of the highlights.</li></ol>',
  },
]) {
  const page = await pageService.create(SHOP, p)
  pages[p.key] = page
}
const colId = (t: string) => collectionIds.get(t)!
await menuService.create(SHOP, {
  handle: 'main-menu',
  title: 'Main menu',
  items: [
    { id: randomUUID(), title: 'Home', type: 'frontpage', items: [] },
    {
      id: randomUUID(),
      title: 'Shop',
      type: 'catalog',
      items: COLLECTIONS.filter((c) => c.menu).map((c) => ({
        id: randomUUID(),
        title: c.title,
        type: 'collection' as const,
        resourceId: colId(c.title),
        items: [],
      })),
    },
    { id: randomUUID(), title: 'Best sellers', type: 'collection', resourceId: colId('Best Sellers'), items: [] },
    { id: randomUUID(), title: 'Film guide', type: 'page', resourceId: pages.film!.id, items: [] },
    { id: randomUUID(), title: 'About', type: 'page', resourceId: pages.about!.id, items: [] },
  ],
} as never)
await menuService.create(SHOP, {
  handle: 'footer',
  title: 'Footer menu',
  items: ['shipping', 'faq', 'contact', 'about'].map((k) => ({
    id: randomUUID(),
    title: pages[k]!.title,
    type: 'page' as const,
    resourceId: pages[k]!.id,
    items: [],
  })),
} as never)
console.log('content ok')

// ── customers + orders ─────────────────────────────────────────────────────────
const result = await seedOrders(SHOP)
console.log(`orders ok: ${result.orders} orders, ${result.customers} customers`)

await seedExtras(SHOP, owner.id, staffUsers[1]!.id)
console.log('extras ok')

// Accounts were created "today"; backdate them so the shop looks established
await db.execute(sql`update "user" set created_at = localtimestamp - interval '410 days' where email = ${OWNER.email}`)
await db.execute(sql`update "user" set created_at = localtimestamp - interval '240 days' where email = ${STAFF[0]!.email}`)
await db.execute(sql`update "user" set created_at = localtimestamp - interval '75 days' where email = ${STAFF[1]!.email}`)
await db.execute(sql`update shops set created_at = localtimestamp - interval '410 days' where id = ${SHOP}`)

console.log(`Done. Sign in at /admin/login as ${OWNER.email} / ${OWNER.password}`)
process.exit(0)

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase()).replace('Ram', 'RAM').replace('Cpu', 'CPU').replace('Hdd', 'HDD')
}
void and
