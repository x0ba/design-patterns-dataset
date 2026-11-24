// Settings an established shop has: custom fields (with values), a headless channel, storefront keys, API tokens,
// webhook endpoints with a delivery history, and older timestamps on settings rows.
import { eq, sql } from 'drizzle-orm'
import { db, schema } from '../../modules/db/src/index.ts'
import { customFieldService } from '../../modules/custom-fields/src/index.ts'
import { channelService } from '../../modules/channels/src/index.ts'
import { createApiToken, createStorefrontKey } from '../../modules/tenancy/src/index.ts'
import { webhookService } from '../../modules/webhooks/src/index.ts'

export async function seedExtras(shopId: string, ownerId: string, staffId: string) {
  // ── custom fields ──
  const fields = [
    { resource: 'product', key: 'care_instructions', label: 'Care instructions', type: 'text', storefront: true },
    { resource: 'product', key: 'film_format', label: 'Film format', type: 'choice', options: ['35mm', '120 (medium format)', 'Instant', 'Digital'], storefront: true },
    { resource: 'product', key: 'warranty_months', label: 'Warranty (months)', type: 'number', storefront: true },
    { resource: 'product', key: 'tested_by', label: 'Tested by', type: 'text', storefront: false },
    { resource: 'order', key: 'gift_wrap', label: 'Gift wrap', type: 'boolean', storefront: true },
    { resource: 'order', key: 'packed_by', label: 'Packed by', type: 'choice', options: ['Priya', 'Sam', 'Jordan'], storefront: false },
    { resource: 'customer', key: 'wholesale', label: 'Wholesale account', type: 'boolean', storefront: false },
    { resource: 'customer', key: 'source', label: 'How they found us', type: 'choice', options: ['Instagram', 'Saturday Market', 'Google', 'Friend', 'Newsletter'], storefront: false },
  ] as const
  for (const f of fields) await customFieldService.create(shopId, { ...f, options: 'options' in f ? [...f.options] : undefined } as never, db)

  const products = await db.select({ id: schema.products.id, title: schema.products.title, productType: schema.products.productType, tags: schema.products.tags }).from(schema.products).where(eq(schema.products.shopId, shopId))
  for (const p of products) {
    const cf: Record<string, string | number | boolean> = {}
    if (p.productType === 'Plant') cf.care_instructions = p.title.includes('Cactus') || p.title.includes('Aloe') || p.title.includes('Succulent') ? 'Bright light, water every 2–3 weeks. Let the soil dry out completely.' : p.title.includes('Fern') ? 'Indirect light, keep the soil moist, mist twice a week.' : 'Bright indirect light. Water when the top inch of soil is dry.'
    if (p.productType === 'Camera') {
      cf.film_format = p.title.includes('Instant') || p.title.includes('Instaframe') ? 'Instant' : p.title.includes('6x6') || p.title.includes('Folding') ? '120 (medium format)' : p.title.includes('Digital') ? 'Digital' : '35mm'
      if (p.tags.includes('vintage')) {
        cf.warranty_months = 3
        cf.tested_by = p.title.length % 2 ? 'Jordan — shutter speeds checked, light seals replaced' : 'Sam'
      } else cf.warranty_months = 12
    }
    if (['Laptop', 'Desktop', 'Monitor', 'Tablet'].includes(p.productType ?? '')) cf.warranty_months = p.tags.includes('refurbished') ? 12 : 24
    if (Object.keys(cf).length) await db.update(schema.products).set({ customFields: cf }).where(eq(schema.products.id, p.id))
  }
  // Some orders were gift wrapped / packed by someone; a few customers are wholesale and have a source
  await db.execute(sql`update orders set custom_fields = jsonb_build_object('gift_wrap', true, 'packed_by', (array['Priya','Sam','Jordan'])[1 + abs(hashtext(id::text)) % 3])
    where shop_id = ${shopId} and abs(hashtext(id::text)) % 11 = 0`)
  await db.execute(sql`update orders set custom_fields = jsonb_build_object('packed_by', (array['Priya','Sam','Sam'])[1 + abs(hashtext(id::text)) % 3])
    where shop_id = ${shopId} and fulfillment_status = 'fulfilled' and custom_fields = '{}'::jsonb and abs(hashtext(id::text)) % 3 = 0`)
  await db.execute(sql`update customers set custom_fields = jsonb_build_object('source', (array['Instagram','Saturday Market','Google','Friend','Newsletter','Instagram'])[1 + abs(hashtext(email)) % 6])
    where shop_id = ${shopId} and abs(hashtext(email)) % 3 = 0`)
  await db.execute(sql`update customers set custom_fields = custom_fields || '{"wholesale": true}'::jsonb
    where shop_id = ${shopId} and id in (select customer_id from orders where shop_id = ${shopId} and shipping_address->>'company' is not null)`)

  // ── channels + keys ──
  const online = await channelService.getDefault(shopId)
  const headless = await channelService.create(shopId, { name: 'Mobile app (headless)', type: 'headless', autoPublish: true } as never)
  await createStorefrontKey(shopId, 'Astro storefront — production', online.id)
  await createStorefrontKey(shopId, 'Astro storefront — staging', online.id)
  await createStorefrontKey(shopId, 'iOS app', headless.id)

  // ── API tokens ──
  const tokens = [
    { name: 'Inventory sync (Google Sheets)', scopes: ['read_products', 'write_products'] },
    { name: 'Accounting export — QuickBooks', scopes: ['read_orders', 'read_customers'] },
    { name: 'Klaviyo newsletter sync', scopes: ['read_customers', 'read_orders', 'read_discounts'] },
    { name: 'Old Zapier test token', scopes: ['read_orders'] },
  ] as const
  const tokenIds: string[] = []
  for (const t of tokens) {
    const row = await createApiToken(shopId, { name: t.name, scopes: [...t.scopes], createdById: t.name.startsWith('Old') ? staffId : ownerId })
    tokenIds.push(row.id)
  }
  await db.execute(sql`update api_tokens set created_at = now() - make_interval(days => 30 + (abs(hashtext(id::text)) % 200)) where shop_id = ${shopId}`)
  await db.execute(sql`update api_tokens set last_used_at = now() - make_interval(mins => 5 + (abs(hashtext(name)) % 4000)) where shop_id = ${shopId} and name not like 'Old%'`).catch(() => {})

  // ── webhooks + delivery history ──
  const hooks = [
    { url: 'https://hooks.zapier.com/hooks/catch/18273645/3kq9xw1/', description: 'Zapier → Slack #orders channel', topics: ['order.created', 'order.paid'], active: true },
    { url: 'https://fulfillment.northfieldsupply.co/webhooks/shopnex', description: 'Packing station label printer', topics: ['order.paid', 'order.cancelled', 'order.fulfilled'], active: true },
    { url: 'https://api.klaviyo-relay.northfieldsupply.co/shopnex', description: 'Newsletter sync', topics: ['customer.created', 'customer.updated', 'customer.erased'], active: true },
    { url: 'https://requestbin.example.net/r/7f3k2', description: 'Debugging inventory sync (turn off)', topics: ['inventory.updated', 'product.updated'], active: false },
  ] as const
  const recentOrders = await db.select({ id: schema.orders.id, orderNumber: schema.orders.orderNumber, totalCents: schema.orders.totalCents, createdAt: schema.orders.createdAt }).from(schema.orders).where(eq(schema.orders.shopId, shopId)).orderBy(sql`created_at desc`).limit(40)
  let i = 0
  for (const h of hooks) {
    const endpoint = await webhookService.create(shopId, { ...h, topics: [...h.topics] })
    if (!h.url.includes('requestbin')) {
      for (const o of recentOrders.slice(0, h.topics[0].startsWith('order') ? 25 : 8)) {
        const topic = h.topics[i % h.topics.length]!
        i++
        const failed = h.url.includes('fulfillment') && i % 9 === 0
        await db.insert(schema.webhookDeliveries).values({
          shopId,
          endpointId: endpoint.id,
          topic,
          body: JSON.stringify({ id: o.id, order_number: o.orderNumber, total_cents: o.totalCents }),
          status: failed ? 'failed' : 'succeeded',
          attempts: failed ? 6 : 1,
          nextAttemptAt: o.createdAt,
          lastAttemptAt: o.createdAt,
          responseStatus: failed ? 502 : 200,
          lastError: failed ? 'Bad Gateway (upstream timed out after 10s)' : null,
          createdAt: o.createdAt,
        })
      }
    }
  }
  await db.execute(sql`update webhook_endpoints set created_at = now() - make_interval(days => 40 + (abs(hashtext(url)) % 150)) where shop_id = ${shopId}`)

  // Discount usage from the seeded orders
  await db.execute(sql`insert into discount_redemptions (discount_id, order_id, customer_id, created_at)
    select d.id, o.id, o.customer_id, o.created_at from orders o join discounts d on d.shop_id = o.shop_id and d.code = any(o.discount_codes)
    where o.shop_id = ${shopId} and o.cancelled_at is null`)
  await db.execute(sql`update discounts d set usage_count = (select count(*) from discount_redemptions r where r.discount_id = d.id) where d.shop_id = ${shopId}`)
  await db.execute(sql`update discounts set usage_count = 40 where shop_id = ${shopId} and code = 'STAFF30'`)

  // Settings rows created "today" by the seed: give them believable ages
  for (const table of ['shipping_rates', 'payment_methods', 'discounts', 'tax_rates', 'pages', 'menus', 'custom_field_definitions', 'storefront_keys', 'channels']) {
    await db.execute(sql.raw(`update ${table} set created_at = localtimestamp - make_interval(days => 20 + (abs(hashtext(id::text)) % 300)) where shop_id = '${shopId}'`)).catch((e: Error) => console.warn(table, e.message))
  }
}
