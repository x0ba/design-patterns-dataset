// ~6 months of backdated customers and orders, inserted into ShopNex's own tables the same way the repo's
// `pnpm demo:orders` script does (modules/api/scripts/lib/demo-orders.ts), with a richer mix: refunds, partial
// fulfilments, taxes, notes, several shipping methods and payment methods, returning customers.
import { eq, sql } from 'drizzle-orm'
import { db, schema } from '../../modules/db/src/index.ts'
import { channelService } from '../../modules/channels/src/index.ts'

const FIRST = ['Ava', 'Liam', 'Noah', 'Mia', 'Ethan', 'Zoe', 'Lucas', 'Chloe', 'Mason', 'Ella', 'Leo', 'Nora', 'Maya', 'Owen', 'Isla', 'Theo', 'Aria', 'Felix', 'Hana', 'Diego', 'Ingrid', 'Kofi', 'Ravi', 'Sofia', 'Mateo', 'Yuki', 'Amara', 'Callum', 'Freya', 'Jonah', 'Lena', 'Marcus', 'Nadia', 'Oscar', 'Priyanka', 'Quinn', 'Rosa', 'Tobias', 'Uma', 'Wes', 'Ximena', 'Yusuf', 'Zara', 'Beatriz', 'Caleb', 'Dana', 'Elif', 'Grant', 'Harper', 'Imani']
const LAST = ['Carter', 'Nguyen', 'Silva', 'Keller', 'Ortiz', 'Ivanov', 'Rossi', 'Haas', 'Moreau', 'Kim', 'Okafor', 'Lindqvist', 'Patel', 'Brennan', 'Tanaka', 'Mendoza', 'Fischer', 'Adeyemi', 'Kowalski', 'Hughes', 'Bergström', 'Delgado', 'Murphy', 'Achebe', 'Larsen', 'Sato', 'Novak', 'Reyes', 'Walsh', 'Chen', "O'Connell", 'Abara', 'Petrov', 'Hall', 'Yamamoto', 'Duarte', 'Ferreira', 'Gallagher', 'Singh', 'Vasquez']
const MAIL = ['gmail.com', 'gmail.com', 'gmail.com', 'icloud.com', 'outlook.com', 'yahoo.com', 'proton.me', 'fastmail.com', 'hey.com']
const STREETS = ['NE Alberta St', 'SE Hawthorne Blvd', 'Market Street', 'Elm Ave', 'Valencia St', 'Bedford Ave', 'W Armitage Ave', 'Queen St W', 'Pine St', 'Oak Lane', 'Commercial Dr', 'S Congress Ave', 'Maple Court', 'Lakeview Rd', 'N Williams Ave']
const PLACES = [
  { city: 'Portland', province: 'OR', countryCode: 'US', zip: '97214', w: 9 },
  { city: 'Seattle', province: 'WA', countryCode: 'US', zip: '98103', w: 5 },
  { city: 'San Francisco', province: 'CA', countryCode: 'US', zip: '94110', w: 4 },
  { city: 'Oakland', province: 'CA', countryCode: 'US', zip: '94612', w: 2 },
  { city: 'Los Angeles', province: 'CA', countryCode: 'US', zip: '90026', w: 3 },
  { city: 'Brooklyn', province: 'NY', countryCode: 'US', zip: '11211', w: 3 },
  { city: 'Austin', province: 'TX', countryCode: 'US', zip: '78704', w: 2 },
  { city: 'Chicago', province: 'IL', countryCode: 'US', zip: '60647', w: 2 },
  { city: 'Denver', province: 'CO', countryCode: 'US', zip: '80205', w: 2 },
  { city: 'Bend', province: 'OR', countryCode: 'US', zip: '97701', w: 2 },
  { city: 'Boise', province: 'ID', countryCode: 'US', zip: '83702', w: 1 },
  { city: 'Vancouver', province: 'BC', countryCode: 'CA', zip: 'V5L 3X2', w: 2 },
  { city: 'Toronto', province: 'ON', countryCode: 'CA', zip: 'M6J 1H4', w: 1 },
  { city: 'London', province: null, countryCode: 'GB', zip: 'E8 3RL', w: 1 },
  { city: 'Berlin', province: null, countryCode: 'DE', zip: '10437', w: 1 },
]
const TAX: Record<string, { title: string; rate: number }> = {
  'US-CA': { title: 'California sales tax', rate: 7.25 },
  'US-WA': { title: 'Washington sales tax', rate: 6.5 },
  'US-NY': { title: 'New York sales tax', rate: 8.875 },
  'US-TX': { title: 'Texas sales tax', rate: 6.25 },
  'US-IL': { title: 'Illinois sales tax', rate: 6.25 },
  'CA-ON': { title: 'HST', rate: 13 },
  'CA-BC': { title: 'GST + PST', rate: 12 },
  'GB-': { title: 'VAT', rate: 20 },
  'DE-': { title: 'MwSt', rate: 19 },
}
const NOTES = [
  'Gift — please leave out the packing slip.',
  'Please leave on the back porch, the front step gets rain.',
  'Can you double-box the camera? Last one arrived with a dent in the box.',
  'Birthday present for my sister, any chance it ships before Friday?',
  'Buzzer is broken, call 503-555-0177 when you arrive',
  'Local pickup Saturday afternoon',
  'Same address as my last order but apt # changed to 4B',
  'Is the lens compatible with an FM2? If not please hold the order and email me.',
  'pls no styrofoam',
]
const DISCOUNTS = [
  { code: 'WELCOME10', kind: 'pct', value: 10 },
  { code: 'PLANTPARENT', kind: 'fixed', value: 500 },
  { code: 'FREESHIP', kind: 'ship', value: 0 },
  { code: 'FILMWEEK15', kind: 'pct', value: 15 },
  { code: 'SPRINGDESK', kind: 'pct', value: 20 },
  { code: 'LOYAL20', kind: 'fixed', value: 2000 },
]
const CARRIERS = [
  { company: 'USPS', prefix: '9400 1118 9922 ', url: (n: string) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n.replace(/ /g, '')}` },
  { company: 'UPS', prefix: '1Z 999 AA1 ', url: (n: string) => `https://www.ups.com/track?tracknum=${n.replace(/ /g, '')}` },
  { company: 'FedEx', prefix: '7731 ', url: (n: string) => `https://www.fedex.com/fedextrack/?trknbr=${n.replace(/ /g, '')}` },
]

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const minutesAgo = (minutes: number) => sql`localtimestamp - make_interval(mins => ${Math.max(0, Math.round(minutes))})`

export async function seedOrders(shopId: string, days = 185) {
  const [shop] = await db.select().from(schema.shops).where(eq(schema.shops.id, shopId))
  const channel = await channelService.getDefault(shopId)
  const variants = await db
    .select({
      productId: schema.products.id,
      productTitle: schema.products.title,
      vendor: schema.products.vendor,
      tags: schema.products.tags,
      status: schema.products.status,
      createdAt: schema.products.createdAt,
      variantId: schema.productVariants.id,
      variantTitle: schema.productVariants.title,
      optionsKey: schema.productVariants.optionsKey,
      sku: schema.productVariants.sku,
      priceCents: schema.productVariants.priceCents,
      imageUrl: sql<string | null>`(select pi.url from product_images pi where pi.product_id = ${schema.products.id} order by pi.position limit 1)`,
    })
    .from(schema.productVariants)
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(eq(schema.products.shopId, shopId))
    .orderBy(schema.products.title, schema.productVariants.optionsKey)
  const sellable = variants.filter((v) => v.status !== 'draft')
  const byProduct = new Map<string, typeof variants>()
  for (const v of sellable) byProduct.set(v.productId, [...(byProduct.get(v.productId) ?? []), v])
  const products = [...byProduct.values()]
  // Cheap things and bestsellers sell more often; a $2,500 bike rarely
  const weights = products.map((p) => {
    const price = p[0]!.priceCents
    let w = price < 3000 ? 5 : price < 10000 ? 4 : price < 30000 ? 2 : price < 100000 ? 0.7 : 0.2
    if (p[0]!.tags.includes('bestseller')) w *= 3
    if (p[0]!.status === 'archived') w *= 0.5
    return w
  })
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  const rand = rng(20261117)
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!
  const placeWeights = PLACES.reduce((a, p) => a + p.w, 0)
  const pickPlace = () => {
    let r = rand() * placeWeights
    return PLACES.find((p) => (r -= p.w) < 0) ?? PLACES[0]!
  }
  const weightedProduct = () => {
    let r = rand() * totalWeight
    return products.find((_, i) => (r -= weights[i]!) < 0) ?? products[0]!
  }

  type Person = { first: string; last: string; email: string; phone: string | null; place: (typeof PLACES)[number]; street: string; apt: string | null; company: string | null }
  const people: Person[] = []
  const usedEmails = new Set<string>()
  const newPerson = (): number => {
    const first = pick(FIRST)
    const last = pick(LAST)
    const style = rand()
    const handle = (style < 0.4 ? `${first}.${last}` : style < 0.7 ? `${first[0]}${last}` : style < 0.85 ? `${first}${last}${Math.floor(rand() * 90 + 10)}` : `${first}_${last[0]}`)
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '')
    let email = `${handle}@${pick(MAIL)}`
    while (usedEmails.has(email)) email = email.replace('@', `${Math.floor(rand() * 9)}@`)
    usedEmails.add(email)
    people.push({
      first,
      last,
      email,
      phone: rand() < 0.55 ? `+1 ${pick(['503', '971', '206', '415', '510', '718', '512', '312'])}-555-${String(Math.floor(rand() * 9000 + 1000))}` : null,
      place: pickPlace(),
      street: `${Math.floor(rand() * 4800 + 12)} ${pick(STREETS)}`,
      apt: rand() < 0.3 ? `Apt ${Math.floor(rand() * 40 + 1)}${pick(['', 'A', 'B', ''])}` : null,
      company: rand() < 0.08 ? pick(['Stumptown Design Studio', 'Ferngully Café', 'Hollis & Park Architects', 'Riverbend Dental']) : null,
    })
    return people.length - 1
  }
  const nextPerson = () => {
    if (people.length > 5 && rand() < 0.36) return Math.floor(Math.pow(rand(), 1.8) * people.length)
    return newPerson()
  }

  const now = new Date()
  const nowMinuteOfDay = now.getHours() * 60 + now.getMinutes()
  type Planned = {
    ago: number
    person: number
    lines: { v: (typeof variants)[number]; quantity: number }[]
    discount: (typeof DISCOUNTS)[number] | null
    shipping: { title: string; code: string; priceCents: number }
    payment: string
    outcome: 'fulfilled' | 'partial' | 'paid' | 'pending' | 'cancelled' | 'refunded' | 'partially_refunded'
    note: string | null
  }
  const planned: Planned[] = []
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 86_400_000)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const growth = 0.8 + ((days - d) / days) * 1.1
    // A spring sale bump and the run-up to the holidays
    const promo = d > 140 && d < 147 ? 1.8 : d < 20 ? 1.25 : 1
    const count = Math.max(0, Math.round((1.4 + rand() * 2.4) * growth * promo * (weekend ? 1.35 : 1) - 0.6))
    for (let n = 0; n < count; n++) {
      const minuteOfDay = Math.floor((8 + rand() * rand() * 14 + rand() * 3) * 60) % 1440
      const ago = d * 1440 + (nowMinuteOfDay - minuteOfDay)
      if (ago < 5) continue
      const lineCount = rand() < 0.62 ? 1 : rand() < 0.7 ? 2 : rand() < 0.7 ? 3 : 4
      const chosen = new Set<string>()
      const lines: Planned['lines'] = []
      for (let l = 0; l < lineCount; l++) {
        const options = weightedProduct()
        if (chosen.has(options[0]!.productId)) continue
        chosen.add(options[0]!.productId)
        const cheap = options[0]!.priceCents < 2500
        lines.push({ v: pick(options), quantity: rand() < (cheap ? 0.6 : 0.88) ? 1 : cheap ? 2 + Math.floor(rand() * 3) : 2 })
      }
      const person = nextPerson()
      const p = people[person]!
      const subtotal = lines.reduce((s, l) => s + l.v.priceCents * l.quantity, 0)
      const heavy = lines.some((l) => l.v.tags.includes('freight'))
      const localPickup = p.place.city === 'Portland' && rand() < 0.25
      const shipping = heavy
        ? { title: 'Freight delivery — furniture', code: 'freight', priceCents: 7900 }
        : localPickup
          ? { title: 'Local pickup — SE Division St', code: 'pickup', priceCents: 0 }
          : rand() < 0.17
            ? { title: 'Express shipping (1–2 business days)', code: 'express', priceCents: 1895 }
            : { title: 'Standard shipping (3–6 business days)', code: 'standard', priceCents: subtotal >= 10000 ? 0 : 695 }
      const age = ago / 1440
      const r = rand()
      const outcome: Planned['outcome'] =
        r < 0.035
          ? 'cancelled'
          : r < 0.055 && age > 10
            ? 'refunded'
            : r < 0.075 && age > 7
              ? 'partially_refunded'
              : age < 1.5 && r < 0.55
                ? 'pending'
                : age < 3
                  ? rand() < 0.15 && lines.length > 1
                    ? 'partial'
                    : 'paid'
                  : r < 0.1
                    ? 'paid'
                    : r < 0.13 && lines.length > 1
                      ? 'partial'
                      : 'fulfilled'
      const payment = localPickup && rand() < 0.5 ? 'Pay at pickup' : rand() < 0.82 ? 'Credit card' : 'Bank transfer'
      // Bank transfers stay unpaid until the money arrives; pickup orders are paid at the counter
      let finalOutcome = outcome
      if (payment === 'Bank transfer' && age < 3.5 && (outcome === 'paid' || outcome === 'partial') && rand() < 0.7) finalOutcome = 'pending'
      if (payment === 'Pay at pickup' && age < 2 && outcome === 'paid') finalOutcome = 'pending'
      // Discount codes only during the time they existed
      let discount: Planned['discount'] = null
      if (rand() < 0.16) {
        const options = DISCOUNTS.filter((x) => (x.code === 'FILMWEEK15' ? d >= 63 && d <= 70 : x.code === 'SPRINGDESK' ? d >= 140 && d <= 200 : true))
        discount = pick(options)
        if (discount.code === 'LOYAL20' && subtotal < 15000) discount = DISCOUNTS[0]!
      }
      planned.push({
        ago,
        person,
        lines,
        discount,
        shipping,
        payment,
        outcome: finalOutcome,
        note: rand() < 0.07 ? pick(NOTES) : null,
      })
    }
  }
  planned.sort((a, b) => b.ago - a.ago)

  let orderNumber = shop!.nextOrderNumber
  await db.transaction(async (tx) => {
    const firstOrder = new Map<number, number>()
    for (const o of planned) if (!firstOrder.has(o.person)) firstOrder.set(o.person, o.ago)
    const customerIds = new Map<number, string>()
    for (const [index, ago] of firstOrder) {
      const p = people[index]!
      const [row] = await tx
        .insert(schema.customers)
        .values({
          shopId,
          email: p.email,
          name: rand() < 0.04 ? null : `${p.first} ${p.last}`,
          phone: p.phone,
          createdAt: minutesAgo(ago + 3),
          updatedAt: minutesAgo(Math.max(0, ago - rand() * 20000)),
        })
        .returning({ id: schema.customers.id })
      customerIds.set(index, row!.id)
    }
    // A few newsletter-only / account-only customers who never ordered
    for (let i = 0; i < 14; i++) {
      const idx = newPerson()
      const p = people[idx]!
      await tx.insert(schema.customers).values({
        shopId,
        email: p.email,
        name: i % 4 === 0 ? null : `${p.first} ${p.last}`,
        phone: null,
        createdAt: minutesAgo(Math.floor(rand() * days * 1440)),
      })
    }

    for (const o of planned) {
      const person = people[o.person]!
      const subtotalCents = o.lines.reduce((s, l) => s + l.v.priceCents * l.quantity, 0)
      let shippingCents = o.shipping.priceCents
      let discountCents = 0
      if (o.discount?.kind === 'pct') discountCents = Math.round((subtotalCents * o.discount.value) / 100)
      if (o.discount?.kind === 'fixed') discountCents = Math.min(o.discount.value, subtotalCents)
      let shippingDiscount = 0
      if (o.discount?.kind === 'ship') {
        shippingDiscount = shippingCents
        shippingCents = 0
      }
      const taxInfo = TAX[`${person.place.countryCode}-${person.place.province ?? ''}`]
      const taxCents = taxInfo ? Math.round(((subtotalCents - discountCents) * taxInfo.rate) / 100) : 0
      const totalCents = subtotalCents + shippingCents - discountCents + taxCents
      const cancelled = o.outcome === 'cancelled'
      const paid = !['pending', 'cancelled'].includes(o.outcome)
      const pending = o.outcome === 'pending'
      const refundAmount = o.outcome === 'refunded' ? totalCents : o.outcome === 'partially_refunded' ? o.lines[0]!.v.priceCents : 0
      const financialStatus = cancelled
        ? 'voided'
        : o.outcome === 'refunded'
          ? 'refunded'
          : o.outcome === 'partially_refunded'
            ? 'partially_refunded'
            : pending
              ? o.payment === 'Credit card' ? 'authorized' : 'pending'
              : 'paid'
      const fulfillmentStatus =
        o.outcome === 'fulfilled' || o.outcome === 'partially_refunded' || o.outcome === 'refunded'
          ? 'fulfilled'
          : o.outcome === 'partial'
            ? 'partially_fulfilled'
            : 'unfulfilled'
      const address = {
        firstName: person.first,
        lastName: person.last,
        company: person.company,
        address1: person.street,
        address2: person.apt,
        phone: person.phone,
        city: person.place.city,
        province: person.place.province,
        countryCode: person.place.countryCode,
        zip: person.place.zip,
      }
      const card = o.payment === 'Credit card'
      const [order] = await tx
        .insert(schema.orders)
        .values({
          shopId,
          channelId: channel.id,
          orderNumber: orderNumber++,
          customerId: customerIds.get(o.person)!,
          email: person.email,
          phone: person.phone,
          financialStatus,
          fulfillmentStatus,
          cancelledAt: cancelled ? minutesAgo(o.ago - 90) : null,
          cancelReason: cancelled ? pick(['customer', 'customer', 'inventory', 'declined', 'fraud'] as const) : null,
          currency: shop!.currency,
          subtotalCents,
          shippingCents,
          taxCents,
          discountCents,
          totalCents,
          taxLines: taxInfo && taxCents ? [{ title: taxInfo.title, ratePercent: taxInfo.rate, amountCents: taxCents }] : [],
          discountCodes: o.discount ? [o.discount.code] : [],
          shippingAddress: o.shipping.code === 'pickup' ? null : address,
          billingAddress: address,
          paymentGateway: card ? 'stripe' : 'manual',
          paymentMethodName: o.payment,
          paymentInstructions: o.payment === 'Bank transfer' ? 'Send the order total to Northfield Supply Company LLC, Umpqua Bank. Put your order number in the memo.' : null,
          note: o.note,
          createdAt: minutesAgo(o.ago),
          updatedAt: minutesAgo(Math.max(0, o.ago - 1440 * 2)),
        })
        .returning({ id: schema.orders.id })
      const orderId = order!.id

      let left = discountCents
      await tx.insert(schema.orderItems).values(
        o.lines.map((l, i) => {
          const share = i === o.lines.length - 1 ? left : Math.round((discountCents * l.v.priceCents * l.quantity) / subtotalCents)
          left -= share
          return {
            orderId,
            productId: l.v.productId,
            variantId: l.v.variantId,
            title: l.v.productTitle,
            variantTitle: l.v.optionsKey === '' ? null : l.v.variantTitle,
            sku: l.v.sku,
            vendor: l.v.vendor || null,
            imageUrl: l.v.imageUrl,
            unitPriceCents: l.v.priceCents,
            quantity: l.quantity,
            discountCents: share,
          }
        }),
      )
      await tx.insert(schema.orderShippingLines).values({
        orderId,
        title: o.shipping.title,
        code: o.shipping.code,
        priceCents: o.shipping.priceCents,
        discountCents: shippingDiscount,
      })
      const gateway = card ? 'stripe' : 'manual'
      const ext = () => (card ? `pi_3Q${Math.floor(rand() * 1e12).toString(36)}${Math.floor(rand() * 1e12).toString(36)}` : null)
      if (pending && card) {
        await tx.insert(schema.orderTransactions).values({ orderId, kind: 'authorization', status: 'success', gateway, amountCents: totalCents, currency: shop!.currency, externalId: ext(), processedAt: minutesAgo(o.ago - 1) })
      }
      if (cancelled && card) {
        await tx.insert(schema.orderTransactions).values({ orderId, kind: 'authorization', status: 'success', gateway, amountCents: totalCents, currency: shop!.currency, externalId: ext(), processedAt: minutesAgo(o.ago - 1) })
        await tx.insert(schema.orderTransactions).values({ orderId, kind: 'void', status: 'success', gateway, amountCents: totalCents, currency: shop!.currency, processedAt: minutesAgo(o.ago - 90) })
      }
      if (paid) {
        await tx.insert(schema.orderTransactions).values({
          orderId,
          kind: 'sale',
          status: 'success',
          gateway,
          amountCents: totalCents,
          currency: shop!.currency,
          externalId: ext(),
          processedAt: minutesAgo(card ? o.ago - 1 : o.ago - 60 * (12 + rand() * 30)),
        })
      }
      if (refundAmount) {
        await tx.insert(schema.orderTransactions).values({
          orderId,
          kind: 'refund',
          status: 'success',
          gateway,
          amountCents: refundAmount,
          currency: shop!.currency,
          externalId: card ? `re_3Q${Math.floor(rand() * 1e12).toString(36)}` : null,
          processedAt: minutesAgo(o.ago - 1440 * (6 + rand() * 4)),
        })
      }
      if (fulfillmentStatus !== 'unfulfilled' && o.shipping.code !== 'pickup') {
        const carrier = o.shipping.code === 'freight' ? null : pick(CARRIERS)
        const number = carrier ? `${carrier.prefix}${String(Math.floor(rand() * 1e8)).padStart(8, '0')}` : null
        await tx.insert(schema.fulfillments).values({
          orderId,
          trackingCompany: carrier?.company ?? 'Pacific Freight Lines',
          trackingNumber: number ?? `PFL-${Math.floor(rand() * 900000 + 100000)}`,
          trackingUrl: carrier && number ? carrier.url(number) : null,
          createdAt: minutesAgo(o.ago - 60 * (6 + rand() * 40)),
        })
      } else if (fulfillmentStatus !== 'unfulfilled') {
        await tx.insert(schema.fulfillments).values({ orderId, createdAt: minutesAgo(o.ago - 60 * (2 + rand() * 20)) })
      }
    }
    await tx.update(schema.shops).set({ nextOrderNumber: orderNumber }).where(eq(schema.shops.id, shopId))
  })
  return { orders: planned.length, customers: people.length }
}
