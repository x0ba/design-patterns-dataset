// Catalog definition for the seed: product rows come from Vendure's MIT-licensed mock data (products.csv + Unsplash
// photos in ../assets/vendure); this file gives them shop-specific titles, vendors, collections, stock and status.

export type CsvProduct = {
  name: string
  description: string
  asset: string
  brand: string | null
  optionGroups: string[]
  variants: { values: string[]; sku: string; price: number }[]
}

export function parseCsv(text: string): CsvProduct[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field.trim())
      field = ''
    } else if (c === '\n') {
      row.push(field.trim())
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field || row.length) rows.push([...row, field.trim()])
  const out: CsvProduct[] = []
  const seenSku = new Set<string>()
  for (const r of rows.slice(1)) {
    if (r.length < 9) continue
    if (r[0]) {
      const facets = r[4]!.split('|')
      out.push({
        name: r[0],
        description: r[2]!,
        asset: r[3]!.split('|')[0]!,
        brand: facets.find((f) => f.startsWith('brand:'))?.slice(6) ?? null,
        optionGroups: r[5] ? r[5].split('|').map((g) => g.split(':')[0]!) : [],
        variants: [],
      })
    }
    const p = out[out.length - 1]!
    let sku = r[7]!
    while (seenSku.has(sku)) sku = `${sku}-${p.variants.length + 1}`
    seenSku.add(sku)
    p.variants.push({ values: r[6] ? r[6].split('|') : [], sku, price: Number(r[8]) })
  }
  return out
}

// Real brands in the source data → fictional vendors this shop carries
export const VENDORS: Record<string, string> = {
  Apple: 'Lumen Works',
  Logitech: 'Kestrel',
  Samsung: 'Orbis Display',
  Corsair: 'Ridgeline Components',
  ADMI: 'Ridgeline Components',
  Seagate: 'Harbor Storage',
  Polaroid: 'Instaframe',
  Nikkon: 'Halden Optics',
  Agfa: 'Halden Optics',
  Manfrotto: 'Fieldtrip',
  Kodak: 'Halden Optics',
  Sony: 'Orbis Display',
  Rolleiflex: 'Halden Optics',
  Pinarello: 'Cascade Cycles',
  Everlast: 'Ironside Athletic',
  Nike: 'Stride Lab',
  Adidas: 'Vantage Athletic',
  Converse: 'Stride Lab',
  Wilson: 'Courtline',
}
const WORDS: [RegExp, string][] = [
  [/Logitech/g, 'Kestrel'],
  [/Samsung/g, 'Orbis'],
  [/Corsair/g, 'Ridgeline'],
  [/Seagate/g, 'Harbor'],
  [/Polaroid/g, 'Instaframe'],
  [/Nikon/g, 'Halden'],
  [/Kodak/g, 'Halden'],
  [/Adidas|adidas/g, 'Vantage'],
  [/Nike/g, 'Stride Lab'],
  [/Converse/g, 'Stride Lab'],
  [/Wilson/g, 'Courtline'],
  [/Everlast/g, 'Ironside'],
  [/Hyperdunkz?/g, 'Skyline'],
  [/[Uu]ltraboost/g, 'Cloudlift'],
  [/Apple/g, 'Lumen'],
]
export const rebrand = (s: string) => WORDS.reduce((acc, [re, to]) => acc.replace(re, to), s.replace(/\s+/g, ' ').trim())

export const COLLECTIONS: { title: string; description: string; menu?: boolean }[] = [
  { title: 'Workspace & Tech', description: 'Monitors, keyboards and the small things that make a desk work for eight hours a day.', menu: true },
  { title: 'Cameras & Film', description: 'Hand-tested vintage film cameras, instant cameras and the lenses and tripods to go with them.', menu: true },
  { title: 'Outdoor & Sport', description: 'Bikes, tents and gear for weekends outside.', menu: true },
  { title: 'Running & Footwear', description: 'Road and trail shoes, plus everyday sneakers.', menu: true },
  { title: 'Houseplants', description: 'Low-maintenance plants grown by a nursery in Canby, Oregon. Shipped in insulated boxes.', menu: true },
  { title: 'Furniture & Lighting', description: 'Chairs, side tables and lighting for small apartments.', menu: true },
  { title: 'Best Sellers', description: 'What our customers keep coming back for.' },
  { title: 'Gifts Under $50', description: 'Easy gifts that ship in a day.' },
  { title: 'Holiday Gift Guide 2026', description: 'Our picks for the holidays — goes live on the storefront Nov 24.' },
]

type Meta = {
  title?: string
  type: string
  collections: string[]
  tags: string[]
  vendor?: string
  status?: 'active' | 'draft' | 'archived'
  stock?: number[]
  priceFactor?: number
  compareAt?: number
  alt?: string
  seo?: string
  extraHtml?: string
}

const W = 'Workspace & Tech'
const C = 'Cameras & Film'
const O = 'Outdoor & Sport'
const R = 'Running & Footwear'
const P = 'Houseplants'
const F = 'Furniture & Lighting'
const B = 'Best Sellers'
const G = 'Gifts Under $50'
const H = 'Holiday Gift Guide 2026'

export const CATALOG: Record<string, Meta> = {
  Laptop: { title: 'Lumen Air Laptop', type: 'Laptop', collections: [W, H], tags: ['laptop', 'refurbished'], stock: [6, 3, 0, 2], extraHtml: '<p><strong>Certified refurbished.</strong> New battery, 1-year warranty.</p>' },
  Tablet: { title: 'Lumen Slate Tablet', type: 'Tablet', collections: [W], tags: ['tablet'], stock: [14, 9] },
  'Wireless Optical Mouse': { title: 'Kestrel Silent Wireless Mouse', type: 'Mouse', collections: [W, G, B], tags: ['bestseller', 'accessories'], stock: [112] },
  '32-Inch Monitor': { title: '32" 4K UHD Monitor', type: 'Monitor', collections: [W], tags: ['monitor', '4k'], stock: [7] },
  'Curvy Monitor': { title: 'Curved 1800R Monitor', type: 'Monitor', collections: [W], tags: ['monitor'], stock: [11, 4], compareAt: 1.2 },
  'High Performance RAM': { title: 'Ridgeline Vengeance DDR4 RAM', type: 'Components', collections: [W], tags: ['components'], stock: [0, 18, 9], status: 'archived' },
  'Gaming PC': { title: 'Ridgeline Studio Desktop PC', type: 'Desktop', collections: [W], tags: ['desktop', 'build-to-order'], stock: [2, 1, 3, 0] },
  'Hard Drive': { title: 'Harbor 3.5" Desktop Hard Drive', type: 'Storage', collections: [W], tags: ['storage'], stock: [25, 31, 12, 8, 0] },
  'Clacky Keyboard': { title: 'Clacky Mechanical Keyboard (TKL)', type: 'Keyboard', collections: [W, B, H], tags: ['bestseller', 'keyboard'], stock: [38] },
  'Ethernet Cable': { title: 'Cat6 Ethernet Cable, 10 ft', type: 'Cable', collections: [W, G], tags: ['accessories', 'cable'], stock: [240] },
  'USB Cable': { title: 'Braided USB-C Cable, 1.5 m', type: 'Cable', collections: [W, G], tags: ['accessories', 'cable'], stock: [3], priceFactor: 0.28 },
  'Instant Camera': { title: 'Instaframe Now+ Instant Camera', type: 'Camera', collections: [C, B, H], tags: ['bestseller', 'instant', 'gift'], stock: [22] },
  'Camera Lens': { title: 'Halden 50mm f/1.8 Prime Lens', type: 'Lens', collections: [C], tags: ['lens'], stock: [9] },
  'Vintage Folding Camera': { title: 'Vintage Folding Camera (1950s)', type: 'Camera', collections: [C], tags: ['vintage', 'one-of-a-kind', 'film'], stock: [1], priceFactor: 0.072, extraHtml: '<p>One of a kind. Bellows light-tight, shutter tested at all speeds.</p>' },
  Tripod: { title: 'Fieldtrip Compact Travel Tripod', type: 'Tripod', collections: [C, G], tags: ['accessories'], stock: [44], priceFactor: 2.6 },
  'Instamatic Camera': { title: 'Instamatic 104 (Tested)', type: 'Camera', collections: [C, G], tags: ['vintage', 'film', 'gift'], stock: [5], priceFactor: 2.2 },
  'Compact Digital Camera': { title: 'Orbis RX Compact Digital Camera', type: 'Camera', collections: [C], tags: ['digital'], stock: [4], status: 'draft' },
  'Nikkormat SLR Camera': { title: 'Halden FTn 35mm SLR + 50mm Lens', type: 'Camera', collections: [C, B, H], tags: ['vintage', 'film', 'bestseller'], stock: [3], priceFactor: 0.52 },
  'Compact SLR Camera': { title: 'Compact 35mm SLR Body', type: 'Camera', collections: [C], tags: ['vintage', 'film'], stock: [0], priceFactor: 0.45 },
  'Twin Lens Camera': { title: 'Twin Lens Reflex 6x6 Camera', type: 'Camera', collections: [C], tags: ['vintage', 'film', 'medium-format'], stock: [2] },
  'Road Bike': { title: 'Cascade Dogma Carbon Road Bike', type: 'Bike', collections: [O], tags: ['bike', 'special-order'], stock: [1] },
  'Skipping Rope': { title: 'Speed Jump Rope', type: 'Fitness', collections: [O, G], tags: ['fitness'], stock: [67], priceFactor: 1.5 },
  'Boxing Gloves': { title: 'Ironside Pro Training Gloves', type: 'Fitness', collections: [O, G], tags: ['fitness'], stock: [19], priceFactor: 1.2 },
  Tent: { title: 'Ridgeback 2-Person Backpacking Tent', type: 'Camping', collections: [O, H], tags: ['camping', 'bestseller'], stock: [13] },
  'Cruiser Skateboard': { title: 'Retro Cruiser Skateboard 27"', type: 'Skate', collections: [O, G], tags: ['skate', 'gift'], stock: [21], priceFactor: 1.8 },
  Football: { title: 'Match Soccer Ball, Size 5', type: 'Ball', collections: [O], tags: ['ball'], stock: [30], priceFactor: 0.6 },
  'Tennis Ball': { title: 'Championship Tennis Balls (3-pack)', type: 'Ball', collections: [O, G], tags: ['ball'], stock: [150] },
  Basketball: { title: 'Indoor/Outdoor Basketball', type: 'Ball', collections: [O, G], tags: ['ball'], stock: [26] },
  'Ultraboost Running Shoe': { title: 'Cloudlift Road Running Shoe', type: 'Running shoe', collections: [R, B], tags: ['running', 'bestseller'], stock: [4, 12, 9, 2], compareAt: 1.3 },
  'Freerun Running Shoe': { title: 'Stride Lab Freerun', type: 'Running shoe', collections: [R], tags: ['running'], stock: [6, 8, 0, 3] },
  'Hi-Top Basketball Shoe': { title: 'Skyline Hi-Top Court Shoe', type: 'Court shoe', collections: [R], tags: ['basketball'], stock: [0, 0, 1, 0], status: 'archived' },
  'Pureboost Running Shoe': { title: 'Vantage Pure Trainer', type: 'Running shoe', collections: [R], tags: ['running'], stock: [10, 15, 12, 7] },
  'RunX Running Shoe': { title: 'Vantage RunX Everyday Trainer', type: 'Running shoe', collections: [R, G], tags: ['running', 'sale'], stock: [18, 22, 20, 9], compareAt: 1.45 },
  'Allstar Sneakers': { title: 'Classic Canvas High-Top Sneaker', type: 'Sneaker', collections: [R, B], tags: ['sneaker', 'bestseller'], stock: [14, 30, 25, 11] },
  'Spiky Cactus': { title: 'Golden Barrel Cactus, 4" pot', type: 'Plant', collections: [P, G], tags: ['plant', 'low-light', 'pet-safe'], stock: [48] },
  'Tulip Pot': { title: 'Potted Tulips (seasonal)', type: 'Plant', collections: [P], tags: ['plant', 'seasonal'], stock: [0], status: 'draft' },
  'Hanging Plant': { title: 'String of Pearls Hanging Basket', type: 'Plant', collections: [P, B], tags: ['plant', 'bestseller'], stock: [16] },
  'Aloe Vera': { title: 'Aloe Vera, 6" pot', type: 'Plant', collections: [P, G], tags: ['plant', 'easy-care'], stock: [72], priceFactor: 2 },
  'Fern Blechnum Gibbum': { title: 'Silver Lady Fern', type: 'Plant', collections: [P], tags: ['plant', 'humidity'], stock: [23], priceFactor: 2.5 },
  'Assorted Indoor Succulents': { title: 'Succulent Sampler (set of 6)', type: 'Plant', collections: [P, G, B, H], tags: ['plant', 'gift', 'bestseller'], stock: [35] },
  Orchid: { title: 'White Phalaenopsis Orchid', type: 'Plant', collections: [P, H], tags: ['plant', 'gift'], stock: [8] },
  'Bonsai Tree': { title: 'Juniper Bonsai Starter Tree', type: 'Plant', collections: [P, G], tags: ['plant', 'gift'], stock: [12], priceFactor: 2 },
  'Guardian Lion Statue': { title: 'Stone Guardian Lion Statue', type: 'Decor', collections: [F], tags: ['outdoor', 'decor'], stock: [2] },
  'Hand Trowel': { title: 'Stainless Hand Trowel', type: 'Garden tool', collections: [P, G], tags: ['garden'], stock: [58], priceFactor: 3 },
  'Balloon Chair': { title: 'Balloon Accent Chair', type: 'Chair', collections: [F], tags: ['chair'], stock: [0], status: 'archived' },
  'Grey Fabric Sofa': { title: 'Ash Grey 3-Seat Sofa', type: 'Sofa', collections: [F], tags: ['sofa', 'freight'], stock: [3], priceFactor: 3 },
  'Leather Sofa': { title: 'Cognac Leather Recliner Sofa', type: 'Sofa', collections: [F], tags: ['sofa', 'freight'], stock: [1] },
  'Light Shade': { title: 'Paper Pendant Light Shade', type: 'Lighting', collections: [F, G], tags: ['lighting'], stock: [27] },
  'Wooden Side Desk': { title: 'Oak Writing Desk', type: 'Desk', collections: [F, W], tags: ['desk', 'freight'], stock: [5], priceFactor: 2.4 },
  'Comfy Padded Chair': { title: 'Padded Lounge Chair', type: 'Chair', collections: [F], tags: ['chair'], stock: [7] },
  'Black Eaves Chair': { title: 'Eaves Dining Chair, Black', type: 'Chair', collections: [F], tags: ['chair'], stock: [24] },
  'Wooden Stool': { title: 'Solid Pine Step Stool', type: 'Stool', collections: [F, G], tags: ['stool'], stock: [40], priceFactor: 2.5 },
  'Bedside Table': { title: 'Ash Bedside Table', type: 'Table', collections: [F], tags: ['table'], stock: [9] },
  'Modern Cafe Chair': { title: 'Bentwood Café Chair', type: 'Chair', collections: [F, B], tags: ['chair', 'bestseller'], stock: [12, 6, 0] },
}
