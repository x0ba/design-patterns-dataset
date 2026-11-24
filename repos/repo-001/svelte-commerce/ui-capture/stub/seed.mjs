// Generates .ui-capture/stub/db.json — the data the local Litekart API stub serves.
// Catalog: Vendure's open sample catalog (products.csv + Unsplash photos from @vendure/create),
// reshaped into Litekart's product/category records. Everything else (store, customer, orders,
// addresses, wishlist, reviews, blog, pages, FAQs, coupons) is generated here, deterministically.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const NOW = new Date('2026-11-17T10:00:00Z')

// ---------- deterministic RNG ----------
let seed = 20261117
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const daysAgo = (d, h = int(8, 21), m = int(0, 59)) => {
	const t = new Date(NOW.getTime() - d * 86400000)
	t.setUTCHours(h, m, int(0, 59), 0)
	return t.toISOString()
}
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const round2 = (n) => Math.round(n * 100) / 100
let idc = 1000
const id = (p) => `${p}_${(idc++).toString(36)}${Math.floor(rnd() * 1e8).toString(36)}`

// ---------- CSV ----------
function parseCsv(text) {
	const rows = []
	let row = [], field = '', q = false
	for (let i = 0; i < text.length; i++) {
		const c = text[i]
		if (q) {
			if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
			else if (c === '"') q = false
			else field += c
		} else if (c === '"') q = true
		else if (c === ',') { row.push(field); field = '' }
		else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
		else if (c !== '\r') field += c
	}
	if (field || row.length) { row.push(field); rows.push(row) }
	const head = rows.shift().map((h) => h.trim())
	return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])))
}

const IMG = (f) => `/api/media/${f}`
const csv = parseCsv(fs.readFileSync(path.join(here, 'data/products.csv'), 'utf8'))

// ---------- categories ----------
const catDefs = [
	{ name: 'Electronics', img: 'jakob-owens-274337-unsplash.jpg', desc: 'Laptops, monitors, cameras and the cables that hold a desk together.' },
	{ name: 'Computers', parent: 'Electronics', facet: 'Computers', img: 'alexandru-acea-686569-unsplash.jpg', desc: 'Workstations, displays, storage and peripherals.' },
	{ name: 'Camera & Photo', parent: 'Electronics', facet: 'Photo', img: 'eniko-kis-663725-unsplash.jpg', desc: 'Film classics, compact digitals, lenses and tripods.' },
	{ name: 'Home & Garden', img: 'paul-weaver-1120584-unsplash.jpg', desc: 'Furniture, lighting and plants for every room and balcony.' },
	{ name: 'Furniture', parent: 'Home & Garden', facet: 'Furniture', img: 'nathan-fertig-249917-unsplash.jpg', desc: 'Sofas, chairs, side tables and lighting.' },
	{ name: 'Plants', parent: 'Home & Garden', facet: 'Plants', img: 'alex-rodriguez-santibanez-200278-unsplash.jpg', desc: 'Low-maintenance indoor plants, outdoor ferns and garden tools.' },
	{ name: 'Sports & Outdoor', img: 'michael-guite-571169-unsplash.jpg', desc: 'Bikes, tents, balls and training kit.' },
	{ name: 'Equipment', parent: 'Sports & Outdoor', facet: 'Equipment', img: 'neonbrand-428982-unsplash.jpg', desc: 'Everything for the court, the trail and the garage gym.' },
	{ name: 'Footwear', parent: 'Sports & Outdoor', facet: 'Footwear', img: 'thomas-serer-420833-unsplash.jpg', desc: 'Running shoes, high-tops and everyday sneakers.' }
]
const categories = catDefs.map((c, i) => ({
	id: `cat_${slugify(c.name)}`,
	name: c.name,
	slug: slugify(c.name),
	description: c.desc,
	thumbnail: IMG(c.img),
	img: IMG(c.img),
	banner: IMG(c.img),
	isActive: true,
	isFeatured: true,
	isMegamenu: true,
	isInternal: false,
	path: c.parent ? `${slugify(c.parent)}/${slugify(c.name)}` : slugify(c.name),
	level: c.parent ? 1 : 0,
	rank: i,
	link: `/${slugify(c.name)}`,
	parentCategoryId: c.parent ? `cat_${slugify(c.parent)}` : null,
	facet: c.facet || c.name,
	metaTitle: c.name,
	metaDescription: c.desc,
	createdAt: daysAgo(560 - i),
	updatedAt: daysAgo(40 - i)
}))
const catByFacet = Object.fromEntries(categories.map((c) => [c.facet, c]))

// ---------- products ----------
const products = []
let cur = null
const brandPrefix = new Set(['Logitech', 'Samsung', 'Corsair', 'Seagate', 'Polaroid', 'Kodak', 'Sony', 'Manfrotto', 'Everlast', 'Wilson', 'Pinarello', 'Rolleiflex'])
const tagsPool = ['Bestseller', 'New arrival', 'Staff pick', 'Gift idea', 'Limited stock', 'Eco-friendly']
for (const r of csv) {
	if (r.name) {
		const facets = r.facets.split('|').filter(Boolean).map((f) => f.split(':'))
		const brand = facets.find((f) => f[0] === 'brand')?.[1] || null
		const cats = facets.filter((f) => f[0] === 'category').map((f) => catByFacet[f[1]]).filter(Boolean)
		const colors = facets.filter((f) => f[0] === 'color').map((f) => f[1])
		const title = brand && brandPrefix.has(brand) ? `${brand} ${r.name}` : r.name
		const images = r.assets.split('|').filter(Boolean).map(IMG)
		const createdDays = int(20, 520)
		cur = {
			id: `prod_${slugify(r.name)}`,
			title,
			name: title,
			slug: slugify(title),
			description: `<p>${r.description}</p>`,
			shortDescription: r.description.split('. ')[0] + '.',
			brand,
			brandName: brand,
			colors,
			categories: cats,
			categoryId: cats[cats.length - 1]?.id || null,
			images: images.join(','),
			thumbnail: images[0],
			featuredImage: images[0],
			optionGroups: r.optionGroups ? r.optionGroups.split('|').map((g) => g.replace(/^size:/, '')) : [],
			variantsRaw: [],
			createdAt: daysAgo(createdDays),
			updatedAt: daysAgo(int(1, Math.min(createdDays, 60))),
			tags: rnd() < 0.45 ? [pick(tagsPool)] : []
		}
		products.push(cur)
	}
	cur.variantsRaw.push({ values: r.optionValues ? r.optionValues.split('|') : [], sku: r.sku, price: Number(r.price), stock: Number(r.stockOnHand || 100) })
}
// realistic stock / sale / ratings mix
const soldOut = new Set(['vintage-folding-camera', 'tent', 'orchid'])
const lowStock = new Set(['twin-lens-camera', 'leather-sofa', 'bonsai-tree', 'pinarello-road-bike'])
for (const p of products) {
	const onSale = rnd() < 0.35
	p.options = p.optionGroups.map((g, gi) => ({
		id: `opt_${p.slug}_${gi}`,
		title: g.replace('shoe-', ''),
		name: g.replace('shoe-', ''),
		type: 'radio',
		values: [...new Set(p.variantsRaw.map((v) => v.values[gi]))].map((val, vi) => ({ id: `optv_${p.slug}_${gi}_${vi}`, value: val, title: val }))
	}))
	p.variants = p.variantsRaw.map((v, vi) => {
		const price = v.price
		const mrp = onSale ? round2(Math.ceil(price * (1.12 + rnd() * 0.25)) - 0.01) : price
		let stock = soldOut.has(p.id.replace('prod_', '')) ? 0 : lowStock.has(p.id.replace('prod_', '')) || lowStock.has(p.slug) ? int(1, 4) : int(8, 140)
		return {
			id: `var_${p.slug}_${vi}`,
			productId: p.id,
			title: v.values.length ? v.values.join(' / ') : 'Default',
			sku: v.sku,
			price,
			mrp,
			stock,
			allowBackorder: false,
			manageInventory: true,
			img: p.thumbnail,
			options: v.values.map((val, gi) => ({ id: `vo_${p.slug}_${vi}_${gi}`, optionId: p.options[gi].id, value: val, variantId: `var_${p.slug}_${vi}` })),
			variantRank: vi
		}
	})
	delete p.variantsRaw
	delete p.optionGroups
	const v0 = p.variants[0]
	Object.assign(p, {
		price: v0.price,
		mrp: v0.mrp,
		sku: v0.sku,
		stock: p.variants.reduce((s, v) => s + v.stock, 0),
		hasStock: p.variants.some((v) => v.stock > 0),
		active: true,
		status: 'published',
		type: 'physical',
		vendorId: 'vendor_main',
		currency: 'USD',
		popularity: int(5, 980),
		rank: int(0, 50),
		isFeatured: false,
		allowBackorder: false,
		manageInventory: true,
		returnAllowed: true,
		replaceAllowed: true,
		weightUnit: 'kg',
		dimensionUnit: 'cm',
		metaTitle: p.title,
		metaDescription: p.shortDescription,
		keywords: [p.brand, ...p.categories.map((c) => c.name)].filter(Boolean).join(', '),
		ratingCount: 0,
		avgRating: 0,
		reviewCount: 0
	})
}
const featuredSlugs = ['laptop', 'grey-fabric-sofa', 'instant-camera', 'ultraboost-running-shoe', 'modern-cafe-chair', 'monstera-plant', 'compact-digital-camera', 'freerun-running-shoe', 'leather-sofa', 'assorted-indoor-succulents', 'pinarello-road-bike', 'samsung-curvy-monitor', 'corsair-clacky-keyboard', 'polaroid-instant-camera', 'wooden-side-desk', 'hanging-plant']
for (const p of products) if (featuredSlugs.includes(p.slug) || featuredSlugs.includes(p.id.replace('prod_', ''))) p.isFeatured = true
const bySlug = Object.fromEntries(products.flatMap((p) => [[p.slug, p], [p.id.replace('prod_', ''), p]]))

// ---------- the customer ----------
const user = {
	id: 'usr_megan_okafor',
	firstName: 'Megan',
	lastName: 'Okafor',
	name: 'Megan Okafor',
	email: 'megan.okafor@fastmail.com',
	phone: '+14155550172',
	password: 'Northfield!2026',
	role: 'user',
	active: true,
	verified: true,
	avatar: null,
	gender: 'female',
	dob: '1991-04-09',
	storeId: 'store_northfield',
	createdAt: daysAgo(486),
	updatedAt: daysAgo(12)
}

const addresses = [
	{ firstName: 'Megan', lastName: 'Okafor', address_1: '2147 Folsom Street', address_2: 'Apt 3B', city: 'San Francisco', state: 'CA', zip: '94110', countryCode: 'US', country: 'United States', phone: '+14155550172', email: user.email, isPrimary: true, isResidential: true, landmark: 'Buzzer 3B, side gate', createdAt: daysAgo(486) },
	{ firstName: 'Megan', lastName: 'Okafor', address_1: 'Tidewater Design Studio', address_2: '575 Market St, Floor 11', city: 'San Francisco', state: 'CA', zip: '94105', countryCode: 'US', country: 'United States', phone: '+14155550172', email: user.email, isPrimary: false, isResidential: false, landmark: 'Leave with front desk', createdAt: daysAgo(301) },
	{ firstName: 'Grace', lastName: 'Okafor', address_1: '88 Linden Ridge Rd', address_2: '', city: 'Portland', state: 'OR', zip: '97219', countryCode: 'US', country: 'United States', phone: '+15035550148', email: 'grace.okafor@gmail.com', isPrimary: false, isResidential: true, landmark: '', createdAt: daysAgo(210) },
	{ firstName: 'Megan', lastName: 'Okafor', address_1: '14 Cypress Point Lane', address_2: 'Cabin 2', city: 'Mendocino', state: 'CA', zip: '95460', countryCode: 'US', country: 'United States', phone: '+14155550172', email: user.email, isPrimary: false, isResidential: true, landmark: 'Gravel drive past the mailbox cluster', createdAt: daysAgo(97) }
].map((a, i) => ({ id: `addr_${i + 1}`, userId: user.id, deliveryInstructions: a.landmark || null, updatedAt: a.createdAt, ...a }))

// ---------- orders ----------
const statusTimeline = {
	Delivered: ['Placed', 'Confirmed', 'Shipped', 'Out for delivery', 'Delivered'],
	Shipped: ['Placed', 'Confirmed', 'Shipped'],
	Processing: ['Placed', 'Confirmed'],
	Pending: ['Placed'],
	Cancelled: ['Placed', 'Cancelled'],
	Returned: ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Return requested', 'Returned']
}
const carriers = ['UPS Ground', 'USPS Priority Mail', 'FedEx Home Delivery', 'OnTrac']
const orderPlan = [
	// [daysAgo, status, paymentStatus, items[[slug, variantIdx, qty]], addrIdx, payment, coupon]
	[473, 'Delivered', 'paid', [['grey-fabric-sofa', 0, 1]], 0, 'stripe'],
	[461, 'Delivered', 'paid', [['assorted-indoor-succulents', 0, 2], ['hand-trowel', 0, 1], ['tulip-pot', 0, 3]], 0, 'stripe'],
	[430, 'Delivered', 'paid', [['logitech-wireless-optical-mouse', 0, 1], ['corsair-clacky-keyboard', 0, 1]], 1, 'stripe'],
	[402, 'Returned', 'refunded', [['samsung-curvy-monitor', 1, 1]], 1, 'stripe'],
	[388, 'Delivered', 'paid', [['samsung-32-inch-monitor', 0, 1], ['ethernet-cable', 0, 2]], 1, 'stripe', 'DESK15'],
	[352, 'Delivered', 'paid', [['polaroid-instant-camera', 0, 1]], 2, 'paypal'],
	[340, 'Cancelled', 'refunded', [['leather-sofa', 0, 1]], 0, 'stripe'],
	[318, 'Delivered', 'paid', [['ultraboost-running-shoe', 1, 1], ['skipping-rope', 0, 1]], 0, 'stripe'],
	[297, 'Delivered', 'paid', [['bonsai-tree', 0, 1], ['aloe-vera', 0, 2], ['spiky-cactus', 0, 1]], 2, 'stripe'],
	[270, 'Delivered', 'paid', [['wilson-tennis-ball', 0, 4], ['wilson-basketball', 0, 1]], 0, 'cod'],
	[244, 'Delivered', 'paid', [['modern-cafe-chair', 0, 2], ['modern-cafe-chair', 1, 2], ['light-shade', 0, 1]], 0, 'stripe', 'WELCOME10'],
	[221, 'Delivered', 'paid', [['seagate-hard-drive', 2, 1], ['high-performance-ram', 2, 2]], 1, 'stripe'],
	[199, 'Delivered', 'paid', [['camera-lens', 0, 1], ['manfrotto-tripod', 0, 1]], 0, 'paypal'],
	[176, 'Returned', 'refunded', [['freerun-running-shoe', 0, 1]], 0, 'stripe'],
	[150, 'Delivered', 'paid', [['hanging-plant', 0, 2], ['fern-blechnum-gibbum', 0, 2]], 3, 'stripe'],
	[131, 'Delivered', 'paid', [['wooden-side-desk', 0, 1], ['wooden-stool', 0, 2]], 3, 'stripe'],
	[112, 'Delivered', 'paid', [['tablet', 1, 1]], 2, 'stripe', 'FALLTECH'],
	[88, 'Delivered', 'paid', [['cruiser-skateboard', 0, 1], ['everlast-boxing-gloves', 0, 1]], 0, 'stripe'],
	[63, 'Delivered', 'paid', [['bedside-table', 0, 2], ['comfy-padded-chair', 0, 1]], 0, 'stripe'],
	[41, 'Delivered', 'paid', [['hi-top-basketball-shoe', 2, 1], ['allstar-sneakers', 1, 1]], 0, 'paypal'],
	[26, 'Cancelled', 'failed', [['compact-digital-camera', 0, 1]], 0, 'stripe'],
	[19, 'Delivered', 'paid', [['guardian-lion-statue', 0, 2]], 3, 'stripe'],
	[9, 'Shipped', 'paid', [['laptop', 1, 1], ['usb-cable', 0, 1]], 1, 'stripe'],
	[5, 'Shipped', 'paid', [['pureboost-running-shoe', 1, 1], ['runx-running-shoe', 0, 1]], 0, 'stripe'],
	[2, 'Processing', 'paid', [['balloon-chair', 0, 1], ['orchid', 0, 1], ['black-eaves-chair', 0, 2]], 0, 'stripe'],
	[0, 'Pending', 'pending', [['nikkormat-slr-camera', 0, 1]], 0, 'cod']
]
const couponDefs = [
	{ code: 'WELCOME10', type: 'percent', value: 10, minimumOrderAmount: 50, maxDiscount: 40, description: '10% off your first order over $50', validTo: daysAgo(-400) },
	{ code: 'DESK15', type: 'percent', value: 15, minimumOrderAmount: 200, maxDiscount: 75, description: '15% off desk setups over $200 — monitors, keyboards and storage', validTo: daysAgo(-45) },
	{ code: 'FALLTECH', type: 'fixed', value: 25, minimumOrderAmount: 250, maxDiscount: 25, description: '$25 off electronics orders over $250', validTo: daysAgo(-14) },
	{ code: 'FREESHIP', type: 'free_shipping', value: 0, minimumOrderAmount: 35, maxDiscount: 15, description: 'Free standard shipping on orders over $35', validTo: daysAgo(-90) },
	{ code: 'GREENTHUMB', type: 'percent', value: 20, minimumOrderAmount: 30, maxDiscount: 20, description: '20% off plants and planters this month', validTo: daysAgo(-21) }
]
const coupons = couponDefs.map((c, i) => ({ id: `cpn_${i + 1}`, active: true, ...c, amount: c.value, createdAt: daysAgo(200 - i * 30) }))

const orders = orderPlan.map(([d, status, paymentStatus, items, addrIdx, paymentMethod, couponCode], i) => {
	const createdAt = daysAgo(d)
	const orderNo = `NF-${(24117 + i * 37 + (i % 5) * 11).toString()}`
	const lineItems = items.map(([slug, vi, qty], li) => {
		const p = bySlug[slug]
		if (!p) throw new Error('unknown product ' + slug)
		const v = p.variants[vi]
		return {
			id: `li_${orderNo}_${li}`,
			productId: p.id,
			variantId: v.id,
			qty,
			title: p.title,
			slug: p.slug,
			sku: v.sku,
			thumbnail: p.thumbnail,
			img: p.thumbnail,
			variantTitle: v.title === 'Default' ? '' : v.title,
			price: v.price,
			mrp: v.mrp,
			subtotal: round2(v.price * qty),
			total: round2(v.price * qty),
			discount: 0,
			tax: 0,
			status,
			product: { id: p.id, title: p.title, slug: p.slug, thumbnail: p.thumbnail, sku: v.sku },
			variant: { id: v.id, title: v.title, sku: v.sku, price: v.price, mrp: v.mrp, options: v.options }
		}
	})
	const subtotal = round2(lineItems.reduce((s, l) => s + l.subtotal, 0))
	const cpn = couponCode ? coupons.find((c) => c.code === couponCode) : null
	let discount = 0
	if (cpn) discount = round2(cpn.type === 'percent' ? Math.min(subtotal * cpn.value / 100, cpn.maxDiscount) : cpn.value)
	const shippingCharges = subtotal >= 75 ? 0 : 7.95
	const tax = round2((subtotal - discount) * 0.08625)
	const total = round2(subtotal - discount + shippingCharges + tax)
	const steps = statusTimeline[status]
	const orderHistory = steps.map((s, si) => ({
		id: `oh_${orderNo}_${si}`,
		status: s,
		title: s,
		comment: s === 'Shipped' ? `Handed to ${carriers[i % carriers.length]} — tracking 1Z${(884200 + i * 97).toString()}A0${si}` : s === 'Cancelled' ? (paymentStatus === 'failed' ? 'Payment authorisation declined by card issuer' : 'Cancelled at customer request before dispatch') : s === 'Return requested' ? 'Customer reported: colour noticeably different from photos' : null,
		createdAt: daysAgo(Math.max(d - si * (s === 'Delivered' ? 2 : 1), 0))
	}))
	const addr = addresses[addrIdx]
	return {
		id: `ord_${orderNo}`,
		orderNo,
		parentOrderNo: orderNo,
		cartId: `cart_hist_${i}`,
		userId: user.id,
		email: user.email,
		phone: user.phone,
		status,
		paymentStatus,
		paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'paypal' ? 'PayPal' : 'Card (Stripe)',
		paymentProvider: paymentMethod,
		currencyCode: 'USD',
		currencySymbol: '$',
		qty: lineItems.reduce((s, l) => s + l.qty, 0),
		subtotal,
		discount,
		discountAmount: discount,
		savingAmount: round2(lineItems.reduce((s, l) => s + (l.mrp - l.price) * l.qty, 0) + discount),
		coupon: cpn ? { code: cpn.code, description: cpn.description } : null,
		couponCode: cpn?.code || null,
		shippingCharges,
		codCharges: paymentMethod === 'cod' ? 2.5 : 0,
		tax,
		total: round2(total + (paymentMethod === 'cod' ? 2.5 : 0)),
		amount: round2(total + (paymentMethod === 'cod' ? 2.5 : 0)),
		lineItems,
		items: lineItems,
		orderHistory,
		fulfillments: ['Shipped', 'Delivered', 'Returned'].includes(status) ? [{ id: `ful_${orderNo}`, carrier: carriers[i % carriers.length], trackingNumber: `1Z${(884200 + i * 97).toString()}A01`, trackingUrl: null, createdAt: daysAgo(Math.max(d - 2, 0)) }] : [],
		shippingRate: { name: 'Standard shipping', estimatedMinDays: 3, estimatedMaxDays: 6 },
		shippingAddress: addr,
		billingAddress: addresses[0],
		shippingAddressId: addr.id,
		billingAddressId: addresses[0].id,
		storeId: 'store_northfield',
		createdAt,
		updatedAt: orderHistory[orderHistory.length - 1].createdAt
	}
}).reverse()

// ---------- reviews ----------
const reviewers = ['Daniel Ruiz', 'Hannah Lindqvist', 'Marcus Bell', 'Aiko Tanaka', 'Priya Raman', 'Tom Whitaker', 'Leila Haddad', 'Sean O\'Brien', 'Chloe Martin', 'Ravi Patel', 'Ines Duarte', 'Jordan Kim', 'Beth Calloway', 'Oluwaseun Ade', 'Nora Fitzgerald', 'Kenji Mori', 'Alana Brooks', 'Wes Hartmann']
const reviewTexts = {
	5: ['Exactly as described and arrived two days early. Packaging was minimal but sturdy.', 'Honestly better than I expected for the price. Have recommended it to two friends already.', 'Second one I\'ve bought — the first is still going strong after a year of daily use.', 'Great quality, fast shipping, no complaints at all.', 'Love it. Looks even better in person than in the photos.'],
	4: ['Really solid. Only knocking a star because assembly instructions were a bit vague.', 'Good value. Colour is slightly warmer than the photos but I actually prefer it.', 'Does the job well. Shipping took about a week, which was fine.', 'Very happy overall — would be five stars if it came with a carry bag.'],
	3: ['It\'s okay. Works as advertised but feels a little cheaper than I hoped.', 'Decent, but sizing runs small — order up a size.', 'Fine for the price. Customer service was helpful when I had a question.'],
	2: ['Arrived with a scuff on one corner. Support sent a replacement part, but it took a while.', 'Not for me — returned it. Return process was easy though.'],
	1: ['Stopped working after three weeks. Waiting on a warranty replacement.']
}
const reviews = []
for (const p of products) {
	const n = soldOut.has(p.slug) ? int(1, 3) : int(0, 9)
	for (let k = 0; k < n; k++) {
		const r = rnd()
		const rating = r < 0.52 ? 5 : r < 0.8 ? 4 : r < 0.91 ? 3 : r < 0.97 ? 2 : 1
		const name = pick(reviewers)
		reviews.push({ id: id('rev'), productId: p.id, product: { id: p.id, title: p.title, slug: p.slug, thumbnail: p.thumbnail }, rating, message: null, review: pick(reviewTexts[rating]), name, userName: name, variantId: p.variants[int(0, p.variants.length - 1)].id, user: { firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' ') }, isVerified: rnd() < 0.8, active: true, createdAt: daysAgo(int(3, 400)) })
	}
}
// Megan's own reviews of things she bought
const mine = [['grey-fabric-sofa', 5, 'Our living room finally feels finished. The fabric has survived a toddler and a cat for over a year — spot cleans well with just water.'], ['polaroid-instant-camera', 4, 'Gave this to my sister for her birthday and she takes it everywhere. Film is pricey, but that is the point I guess.'], ['modern-cafe-chair', 5, 'Bought two mint and two pearl for the breakfast nook. Comfortable for long brunches.'], ['samsung-curvy-monitor', 2, 'Had a cluster of stuck pixels on the left edge — returned it. Refund showed up within five days though.'], ['bonsai-tree', 4, 'Healthy and well packed. Lost a few leaves in the first week while it acclimatised, now thriving by the window.']]
for (const [slug, rating, message] of mine) {
	const p = bySlug[slug]
	reviews.push({ id: id('rev'), productId: p.id, product: { id: p.id, title: p.title, slug: p.slug, thumbnail: p.thumbnail }, rating, review: message, message, name: user.name, userId: user.id, userName: user.name, variantId: p.variants[0].id, user: { firstName: user.firstName, lastName: user.lastName }, isVerified: true, active: true, createdAt: daysAgo(int(30, 300)) })
}
for (const p of products) {
	const rs = reviews.filter((r) => r.productId === p.id)
	p.ratingCount = rs.length
	p.reviewCount = rs.length
	p.avgRating = rs.length ? round2(rs.reduce((s, r) => s + r.rating, 0) / rs.length) : 0
	p.rating = p.avgRating
}

// ---------- wishlist ----------
const wishlist = ['leather-sofa', 'pinarello-road-bike', 'twin-lens-camera', 'vintage-folding-camera', 'tent', 'gaming-pc', 'compact-digital-camera', 'orchid', 'kodak-instamatic-camera', 'football'].map((s, i) => {
	const p = bySlug[s]
	return { id: `wl_${i + 1}`, userId: user.id, productId: p.id, variantId: p.variants[0].id, product: p, variant: p.variants[0], createdAt: daysAgo(int(4, 260)) }
})

// ---------- blogs, pages, faqs ----------
const blogDefs = [
	['How we pack a 90 kg sofa so it arrives without a scratch', 'grey-fabric-sofa', 'Behind the scenes', 'Every sofa leaves our Oakland warehouse in three layers: a breathable cotton sleeve, corner blocks cut from recycled cardboard, and a double-wall carton. Here is why we stopped using bubble wrap in 2025, what the drivers asked us to change, and how damage claims fell from 4.1% to 0.6%.'],
	['Five houseplants that survive a north-facing apartment', 'hanging-plant', 'Plant care', 'Low light is not no light. Ferns, aloe and a surprisingly forgiving cactus will cope with a north window if you get the watering right. Our plant buyer Lucía shares the routine she uses in her own Sunset District flat.'],
	['Film is back: choosing your first instant camera', 'polaroid-instant-camera', 'Guides', 'Instant film sales have tripled since 2021. We compare the instant, instamatic and twin-lens cameras we stock, what film each takes and what a pack really costs per photo.'],
	['A desk setup for under $600 that does not look like an office', 'wooden-side-desk', 'Guides', 'A wooden desk, a single good monitor and a keyboard you enjoy typing on. Our picks, with the cable management tricks that keep it tidy.'],
	['Running shoe sizing: why your 44 is not my 44', 'ultraboost-running-shoe', 'Guides', 'European sizes differ by brand and even by model. We measured every running shoe we carry and put the inner lengths in one table.'],
	['Winter bonsai care, without the mystique', 'bonsai-tree', 'Plant care', 'Your bonsai is a tree, not a houseplant. Cooler nights are good for it. Here is how to water, where to place it, and when to stop worrying about falling leaves.'],
	['Our returns, by the numbers (2026 edition)', 'samsung-curvy-monitor', 'Behind the scenes', 'Last year 3.2% of orders came back. Monitors and shoes lead the list. What we learned, and the product page changes we made because of it.'],
	['Repairing a leather sofa scratch at home', 'leather-sofa', 'Care & repair', 'A light scratch on aniline leather often disappears with warmth and a drop of conditioner. Deeper ones need a filler. Step-by-step, with photos from our workshop.'],
	['Weekend kit: what we pack for a coastal camping trip', 'tent', 'Outdoors', 'Two nights on the Mendocino coast, one tent, a lot of fog. The gear list from our customer support team’s annual trip.']
]
const blogs = blogDefs.map(([title, slug, cat, excerpt], i) => {
	const p = bySlug[slug]
	return {
		id: `blog_${i + 1}`,
		title,
		slug: slugify(title),
		excerpt,
		summary: excerpt,
		description: excerpt,
		content: `<p>${excerpt}</p><p>We have been selling ${p.title.toLowerCase()}s for a while now, and the questions we get most often are surprisingly practical. This post collects the answers our team gives over email and chat, in one place.</p><h2>What to look for</h2><p>Start with how you will actually use it day to day. Measure your space twice, read the care notes, and check the return window before you buy anything large.</p><h2>Our take</h2><p>If you are on the fence, message us — a real person from the Oakland team replies, usually within a business day.</p>`,
		category: cat,
		tags: [cat],
		img: p.thumbnail,
		thumbnail: p.thumbnail,
		featuredImage: p.thumbnail,
		author: pick(['Lucía Ferreira', 'Ben Adeyemi', 'Hana Sato', 'Megan Doyle']),
		active: true,
		status: 'published',
		createdAt: daysAgo(15 + i * 37),
		updatedAt: daysAgo(10 + i * 37)
	}
})
const pageDefs = [
	['About us', 'about-us', 'Northfield Supply Co. started in 2019 as a two-person shop in a shared Oakland warehouse. We now ship furniture, plants, cameras and outdoor gear across the US from the same building — just with more shelves.'],
	['Privacy policy', 'privacy-policy', 'We collect only what we need to fulfil your orders: your name, contact details, shipping address and order history. Card details are processed by our payment provider and never stored on our servers. You can ask us to export or delete your data at any time by emailing privacy@northfieldsupply.co.'],
	['Terms & Conditions', 'terms-and-conditions', 'By placing an order you agree to these terms. Prices are in US dollars and include applicable sales tax at checkout. We reserve the right to cancel orders affected by pricing errors, in which case you are refunded in full.'],
	['Shipping policy', 'shipping-policy', 'Orders over $75 ship free within the contiguous US. Standard delivery takes 3–6 business days; large furniture is delivered by freight in 7–12 business days with a scheduled delivery window.'],
	['Contact us', 'contact-us', 'Questions about an order, sizing or plant care? Email hello@northfieldsupply.co or call +1 (510) 555-0139, Monday to Friday 9am–5pm Pacific. Our showroom at 1450 Third Street, Oakland is open for pickups on Saturdays 10am–2pm.'],
	['Refund policy', 'refund-policy', 'Return any unused item within 30 days for a full refund. Plants are covered by a 14-day health guarantee. Refunds are issued to the original payment method within 5 business days of the return reaching us.']
]
const pages = pageDefs.map(([title, slug, text], i) => ({ id: `page_${i + 1}`, title, name: title, slug, link: `/${slug}`, content: `<p>${text}</p>`, description: text, active: true, status: 'published', createdAt: daysAgo(500 - i * 10), updatedAt: daysAgo(30 + i) }))
const faqs = [
	['How long does delivery take?', 'Standard orders arrive in 3–6 business days. Furniture ships by freight and takes 7–12 business days; we will text you to book a delivery window.'],
	['Do you ship outside the US?', 'Not yet. We ship to all 50 states, including Alaska and Hawaii (plants excluded due to agricultural rules).'],
	['Can I change my order after placing it?', 'Yes, as long as it has not shipped. Reply to your confirmation email or message us from your account page.'],
	['What if my plant arrives damaged?', 'Send us a photo within 14 days and we will replace it or refund you — no need to send it back.'],
	['Do you offer assembly?', 'Sofas and tables arrive fully assembled or need only legs attached. Chairs are shipped assembled.'],
	['Which payment methods do you accept?', 'All major cards via Stripe, PayPal, and cash on delivery for orders under $500.']
].map(([q, a], i) => ({ id: `faq_${i + 1}`, question: q, answer: a, title: q, description: a, active: true, rank: i, createdAt: daysAgo(300 - i) }))

const banners = [
	{ id: 'ban_1', title: 'The Autumn Living Edit', subtitle: 'Sofas, side tables and lighting for longer evenings in', img: IMG('nathan-fertig-249917-unsplash.jpg'), link: '/products?categories=furniture', type: 'hero', groupTitle: 'Hero', active: true },
	{ id: 'ban_2', title: 'Film never left', subtitle: 'Instant, twin-lens and folding cameras — tested in our studio', img: IMG('eniko-kis-663725-unsplash.jpg'), link: '/products?categories=camera-and-photo', type: 'hero', groupTitle: 'Hero', active: true },
	{ id: 'ban_3', title: 'Green up your desk', subtitle: 'Easy-care plants from $6.75', img: IMG('alex-rodriguez-santibanez-200278-unsplash.jpg'), link: '/products?categories=plants', type: 'hero', groupTitle: 'Hero', active: true }
]

// ---------- store record (Litekart /api/stores/public-details) ----------
const base = JSON.parse(fs.readFileSync(path.join(repo, 'src/lib/core/connectors/default-store.json'), 'utf8'))
const on = (k, extra = {}) => (base.plugins[k] = { ...(base.plugins[k] || {}), active: true, ...extra })
on('isWishlist'); on('isProductReviewsAndRatings'); on('isDiscountCoupons'); on('isGuestCheckout'); on('megamenu'); on('newsletter'); on('socialSharingButtons'); on('isTags')
on('search', { placeholder: 'Search sofas, cameras, plants…' })
const store = {
	...base,
	id: 'store_northfield',
	name: 'Northfield Supply Co.',
	slug: 'northfield',
	domain: 'localhost',
	description: 'Furniture, plants, cameras and outdoor gear — chosen, tested and shipped from Oakland, California.',
	metaTitle: 'Northfield Supply Co. — Home, tech & outdoor goods',
	metaDescription: 'Furniture, plants, cameras and outdoor gear, shipped from Oakland, California. Free shipping over $75.',
	businessName: 'Northfield Supply Co.',
	businessLegalName: 'Northfield Supply Company LLC',
	businessEmail: 'hello@northfieldsupply.co',
	businessPhone: '+1 (510) 555-0139',
	address_1: '1450 Third Street, Unit 6',
	address_2: 'Jack London Square',
	city: 'Oakland',
	state: 'CA',
	zipCode: '94607',
	productImageAspectRatio: '1:1',
	isEmailMandatory: true,
	loginType: 'EMAIL',
	theme: {
		name: 'default',
		// Homepage copy & imagery the merchant set in the admin (deep-merged over the theme defaults).
		content: {
			editorial: {
				hero: {
					eyebrow: 'Autumn 2026',
					titleLead: 'Well-made things for',
					titleAccent: 'home, desk & trail',
					text: 'Sofas that survive toddlers, cameras that still take film, plants that forgive a missed watering — tested by our team in Oakland before they go on the shelf.',
					primaryCta: 'Shop new arrivals',
					primaryHref: '/products',
					secondaryCta: 'Browse categories',
					secondaryHref: '/categories',
					image: IMG('nathan-fertig-249917-unsplash.jpg'),
					imageAlt: 'A sunlit living room with a grey fabric sofa and side table',
					note: 'Free shipping over $75 · 30-day returns · Plants guaranteed for 14 days'
				},
				marquee: ['Free shipping on orders over $75', '30-day easy returns', '14-day plant health guarantee', 'Ships from Oakland, CA', 'New arrivals every Thursday'],
				categories: {
					eyebrow: 'Browse',
					title: 'Shop by category',
					viewAll: 'All categories',
					viewAllHref: '/categories',
					tiles: [
						{ label: 'Furniture', href: '/furniture', image: IMG('kari-shea-398668-unsplash.jpg') },
						{ label: 'Plants', href: '/plants', image: IMG('alex-rodriguez-santibanez-200278-unsplash.jpg') },
						{ label: 'Cameras', href: '/camera-and-photo', image: IMG('eniko-kis-663725-unsplash.jpg') },
						{ label: 'Footwear', href: '/footwear', image: IMG('thomas-serer-420833-unsplash.jpg') }
					]
				},
				featured: { eyebrow: 'Staff picks', title: 'What we are loving this month', viewAll: 'View all', viewAllHref: '/products' },
				banner: {
					eyebrow: 'From the Journal',
					title: 'Film never left',
					text: 'Instant, twin-lens and folding cameras — and a plain-English guide to what each one costs per photo.',
					cta: 'Read the guide',
					href: '/blog',
					image: IMG('eniko-kis-663725-unsplash.jpg'),
					imageAlt: 'A vintage film camera on a wooden table'
				},
				assurances: [
					{ icon: 'truck', title: 'Free shipping', text: 'On orders over $75' },
					{ icon: 'returns', title: 'Easy returns', text: '30 days, prepaid label' },
					{ icon: 'shield', title: 'Secure checkout', text: 'Stripe & PayPal' },
					{ icon: 'support', title: 'Real people', text: 'Replies within one business day' }
				],
				newsletter: { eyebrow: 'The Thursday letter', title: 'New arrivals, first', text: 'One email a week: what landed in the warehouse, a care tip, and the occasional members-only code.', cta: 'Subscribe', privacy: 'No spam. Unsubscribe anytime.' }
			}
		}
	},
	menu: [
		{ name: 'Header', menuId: 'header', link: null, items: [
			{ id: 'h1', link: '/', name: 'Home' },
			{ id: 'h2', link: '/products', name: 'Shop all' },
			{ id: 'h3', link: '/furniture', name: 'Furniture' },
			{ id: 'h4', link: '/plants', name: 'Plants' },
			{ id: 'h5', link: '/camera-and-photo', name: 'Cameras' },
			{ id: 'h6', link: '/sports-and-outdoor', name: 'Outdoor' },
			{ id: 'h7', link: '/blog', name: 'Journal' }
		] },
		base.menu.find((m) => m.menuId === 'footer')
	],
	paymentMethods: [
		{ id: 'pm_stripe', name: 'Credit / debit card', value: 'stripe', provider: 'stripe', active: true, isCod: false, color: '#635bff', imgUrl: null, rank: 1 },
		{ id: 'pm_paypal', name: 'PayPal', value: 'paypal', provider: 'paypal', active: true, isCod: false, rank: 2 },
		{ id: 'pm_cod', name: 'Cash on delivery', value: 'cod', provider: 'cod', active: true, isCod: true, rank: 3 }
	],
	megamenu: categories.filter((c) => !c.parentCategoryId).map((c) => ({ id: c.id, name: c.name, slug: c.slug, link: `/${c.slug}`, img: c.thumbnail, children: categories.filter((k) => k.parentCategoryId === c.id).map((k) => ({ id: k.id, name: k.name, slug: k.slug, link: `/${k.slug}`, img: k.thumbnail, children: [] })) })),
	createdAt: daysAgo(900),
	updatedAt: daysAgo(3)
}

const db = { store, categories, products, user, addresses, orders, reviews, wishlist, blogs, pages, faqs, coupons, banners, popularSearches: ['sofa', 'instant camera', 'succulents', 'running shoes', 'monitor', 'bonsai', 'desk chair'] }
fs.writeFileSync(path.join(here, 'db.json'), JSON.stringify(db, null, 1))
console.log(`db.json: ${products.length} products, ${categories.length} categories, ${orders.length} orders, ${reviews.length} reviews, ${wishlist.length} wishlist, ${blogs.length} blogs`)
