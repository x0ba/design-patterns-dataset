// Mock catalog for the Snow Blowers subcategory. Generated from a fixed seed so every load
// shows the same 412 products. Counts match the category snapshot:
//   138 single-stage, 201 two-stage, 47 three-stage, 26 electric/battery; 7 brands.
// Stock flags are calibrated to the inventory snapshot:
//   61% of products in stock somewhere nationally (251 of 412),
//   Northeast 22% (91), Midwest 58% (239), Southeast 8% (33), Southwest 6% (25), West 17% (70).

import { REGIONS } from '../domain/types';
import type { AttributeId, Product, Region, Stage } from '../domain/types';

const SEED = 20261116;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(SEED);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rng() * items.length)];
const between = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const chance = (p: number): boolean => rng() < p;

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

interface BrandSpec {
  brand: string;
  code: string;
  power: 'Gas' | 'Battery';
  series: Record<Stage, string>;
  counts: Record<Stage, number>;
  platform?: string;
}

const BRAND_SPECS: BrandSpec[] = [
  {
    brand: 'Ironridge',
    code: 'IR',
    power: 'Gas',
    series: { single: 'Scout', two: 'Bulldog', three: 'Summit', electric: '' },
    counts: { single: 22, two: 66, three: 14, electric: 0 },
  },
  {
    brand: 'Tamarack Works',
    code: 'TW',
    power: 'Gas',
    series: { single: 'Timber Lite', two: 'Ridgeback', three: 'Trailmaster', electric: '' },
    counts: { single: 34, two: 48, three: 9, electric: 0 },
  },
  {
    brand: 'Blackwater Tools',
    code: 'BT',
    power: 'Gas',
    series: { single: 'Lodge', two: 'Stormfront', three: 'Glacier', electric: '' },
    counts: { single: 41, two: 29, three: 8, electric: 0 },
  },
  {
    brand: 'Coldbrook',
    code: 'CB',
    power: 'Gas',
    series: { single: 'Brookside', two: 'Frostline', three: 'Arctic Pro', electric: '' },
    counts: { single: 17, two: 35, three: 9, electric: 0 },
  },
  {
    brand: 'Redfield Outdoor',
    code: 'RO',
    power: 'Gas',
    series: { single: 'Cedar', two: 'Ironwood', three: 'Polar', electric: '' },
    counts: { single: 24, two: 23, three: 7, electric: 0 },
  },
  {
    brand: 'Voltaris',
    code: 'VX',
    power: 'Battery',
    series: { single: '', two: '', three: '', electric: 'Flurry' },
    counts: { single: 0, two: 0, three: 0, electric: 14 },
    platform: 'Voltaris 60V',
  },
  {
    brand: 'Northpeak',
    code: 'NP',
    power: 'Battery',
    series: { single: '', two: '', three: '', electric: 'Drift' },
    counts: { single: 0, two: 0, three: 0, electric: 12 },
    platform: 'Northpeak 40V',
  },
];

const STAGES: Stage[] = ['single', 'two', 'three', 'electric'];
const STAGE_NUM: Record<Stage, string> = { single: '1', two: '2', three: '3', electric: 'E' };
const STAGE_LABEL: Record<Stage, string> = {
  single: 'Single-Stage',
  two: 'Two-Stage',
  three: 'Three-Stage',
  electric: 'Cordless',
};
const WIDTHS: Record<Stage, number[]> = {
  single: [20, 22, 24, 18],
  two: [22, 24, 26, 28],
  three: [28, 30, 32, 34],
  electric: [18, 20, 21],
};
const DISPLACEMENT: Record<Exclude<Stage, 'electric'>, number[]> = {
  single: [196, 208, 224],
  two: [254, 271, 291],
  three: [357, 389, 420],
};
const PRICE_RANGE: Record<Stage, [number, number]> = {
  single: [229, 599],
  two: [629, 1899],
  three: [1799, 3299],
  electric: [279, 899],
};
const REVIEWS_MAX: Record<Stage, number> = { single: 900, two: 1150, three: 190, electric: 420 };
const REVIEWS_MIN: Record<Stage, number> = { single: 18, two: 12, three: 4, electric: 6 };
const UNITS_RANGE: Record<Stage, [number, number]> = {
  single: [30, 640],
  two: [25, 520],
  three: [3, 95],
  electric: [4, 210],
};

// Pricing ends in 9 the way shelf prices do.
function shelfPrice(raw: number): number {
  return Math.round(raw / 10) * 10 - 1;
}

function makeProduct(
  spec: BrandSpec,
  stage: Stage,
  index: number,
  usedItems: Set<string>,
): Product {
  let item: string;
  do {
    item = String(between(1000000, 9999999));
  } while (usedItems.has(item));
  usedItems.add(item);

  const width = pick(WIDTHS[stage]);
  const isBattery = stage === 'electric';
  const [pMin, pMax] = PRICE_RANGE[stage];
  const reviews = between(REVIEWS_MIN[stage], REVIEWS_MAX[stage]);
  const [uMin, uMax] = UNITS_RANGE[stage];

  let startType: Product['startType'];
  if (isBattery) startType = 'Push-button start';
  else if (stage === 'single') startType = chance(0.6) ? 'Recoil start' : 'Electric start';
  else if (stage === 'two') startType = chance(0.85) ? 'Electric start' : 'Recoil start';
  else startType = 'Electric start';

  let driveType: Product['driveType'];
  if (stage === 'single') driveType = chance(0.7) ? 'Push' : 'Self-propelled';
  else if (stage === 'two') driveType = 'Self-propelled';
  else if (stage === 'three') driveType = chance(0.6) ? 'Track drive' : 'Self-propelled';
  else driveType = chance(0.6) ? 'Push' : 'Self-propelled';

  let chuteControl: Product['chuteControl'];
  if (isBattery) chuteControl = 'Push-button';
  else if (stage === 'single') chuteControl = 'Manual';
  else if (stage === 'two') chuteControl = chance(0.65) ? 'Manual' : 'Remote';
  else chuteControl = chance(0.8) ? 'Remote' : 'Manual';

  const nameTail =
    startType === 'Electric start'
      ? ' with Electric Start'
      : startType === 'Recoil start'
        ? ' with Recoil Start'
        : ' with Push-Button Start';

  const name = isBattery
    ? `${spec.brand} ${width}-in. ${spec.platform?.split(' ').pop()} Cordless ${spec.series.electric} Snow Blower${nameTail}`
    : `${spec.brand} ${width}-in. ${STAGE_LABEL[stage]} ${spec.series[stage]} Gas Snow Blower${nameTail}`;

  return {
    item,
    model: `${spec.code}-${STAGE_NUM[stage]}${String(index + 1).padStart(3, '0')}`,
    name,
    brand: spec.brand,
    stage,
    clearingWidth: width,
    powerSource: spec.power,
    startType,
    price: shelfPrice(between(pMin, pMax)),
    rating: Math.round((3.4 + rng() * 1.4) * 10) / 10,
    reviews,
    driveType,
    chuteControl,
    batteryPlatform: isBattery ? (spec.platform ?? null) : null,
    engineDisplacement: isBattery ? null : pick(DISPLACEMENT[stage as Exclude<Stage, 'electric'>]),
    warranty: isBattery
      ? chance(0.6)
        ? '3 years'
        : '5 years'
      : chance(0.5)
        ? '2 years'
        : chance(0.7)
          ? '3 years'
          : '5 years',
    headlights:
      stage === 'three' ? chance(0.9) : stage === 'two' ? chance(0.5) : false,
    unitsSold30d: between(uMin, uMax),
    inStock: { Northeast: false, Midwest: false, Southeast: false, Southwest: false, West: false },
  };
}

function assignStock(products: Product[]): void {
  const indexes = shuffle(products.map((_, i) => i));
  const anywhere = indexes.slice(0, 251);
  const midwest = new Set(shuffle(anywhere.slice()).slice(0, 239));
  const outsideMidwest = anywhere.filter((i) => !midwest.has(i));
  const midwestList = shuffle([...midwest]);
  const northeast = new Set([...outsideMidwest, ...midwestList.slice(0, 91 - outsideMidwest.length)]);
  const sample = (n: number) => new Set(shuffle(anywhere.slice()).slice(0, n));
  const sets: Record<Region, Set<number>> = {
    Northeast: northeast,
    Midwest: midwest,
    Southeast: sample(33),
    Southwest: sample(25),
    West: sample(70),
  };
  products.forEach((p, i) => {
    for (const region of REGIONS) p.inStock[region] = sets[region].has(i);
  });
}

function buildCatalog(): Product[] {
  const products: Product[] = [];
  const usedItems = new Set<string>();
  for (const spec of BRAND_SPECS) {
    for (const stage of STAGES) {
      for (let i = 0; i < spec.counts[stage]; i++) {
        products.push(makeProduct(spec, stage, i, usedItems));
      }
    }
  }
  assignStock(products);
  return products.sort((a, b) => a.item.localeCompare(b.item));
}

export const PRODUCTS: readonly Product[] = buildCatalog();

/** Value a product carries for a shopper-facing attribute, or null when it has none. */
export function attributeValue(p: Product, id: AttributeId): string | null {
  switch (id) {
    case 'clearing-width':
      return `${p.clearingWidth} in.`;
    case 'stage':
      return p.stage === 'electric' ? 'Electric / battery' : STAGE_LABEL[p.stage];
    case 'power-source':
      return p.powerSource;
    case 'start-type':
      return p.startType;
    case 'brand':
      return p.brand;
    case 'price': {
      if (p.price < 400) return 'Under $400';
      if (p.price < 800) return '$400–$799';
      if (p.price < 1500) return '$800–$1,499';
      return '$1,500 and up';
    }
    case 'rating':
      if (p.rating >= 4) return '4 stars and up';
      if (p.rating >= 3) return '3 stars and up';
      return 'Under 3 stars';
    case 'drive-type':
      return p.driveType;
    case 'chute-control':
      return p.chuteControl;
    case 'battery-platform':
      return p.batteryPlatform;
    case 'engine-displacement':
      return p.engineDisplacement === null ? null : `${p.engineDisplacement} cc`;
    case 'warranty':
      return p.warranty;
    case 'headlights':
      return p.headlights ? 'Yes' : 'No';
  }
}

export const BRANDS: readonly string[] = [...new Set(BRAND_SPECS.map((s) => s.brand))];
