// Mock warehouse data for Fernhollow Goods — Unit 4.
// Everything is generated deterministically so the app always opens in the same state.

export type RowId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Level = 1 | 2 | 3 | 4;
export type SizeKey = 'S' | 'M' | 'L';

export interface Bin {
  id: string;
  row: RowId;
  bay: number;
  level: Level;
  w: number; // inches (width along the row)
  d: number; // inches (depth)
  h: number; // inches (clear height)
  limitLb: number;
  distFt: number; // walking distance to packing bench
  shelfIn: number; // shelf deck height from floor
}

export interface Sku {
  id: string;
  name: string;
  category: string;
  unitLb: number;
  picks30: number;
}

export interface StockLine {
  binId: string;
  skuId: string;
  units: number;
}

export interface ShipmentSize {
  key: SizeKey;
  skuId: string;
  name: string;
  short: string;
  units: number;
  unitLb: number;
  box: { w: number; d: number; h: number };
  perCarton: number;
  cartons: number;
  forecastPicks30: number;
}

// ---------------------------------------------------------------------------
// Layout
export const ROWS: RowId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
export const BAYS_PER_ROW: Record<RowId, number> = { A: 9, B: 9, C: 9, D: 9, E: 8, F: 9 };
export const LEVEL_HEIGHT: Record<Level, number> = { 1: 24, 2: 18, 3: 18, 4: 14 };
export const SHELF_DECK: Record<Level, number> = { 1: 4, 2: 32, 3: 54, 4: 76 };
export const LEVEL_LABEL: Record<Level, string> = {
  1: 'Floor',
  2: 'Waist',
  3: 'Chest',
  4: 'Overhead',
};
export const LEVEL_NOTE: Record<Level, string> = {
  1: 'Bend to pick',
  2: 'Golden zone',
  3: 'Easy reach',
  4: 'Step stool',
};
export const HEAVY_OVERHEAD_LB = 5; // team rule: nothing over 5 lb per unit on the top shelf

export function binId(row: RowId, bay: number, level: number) {
  return `${row}${bay}-${level}`;
}

function walkDistance(row: RowId, bay: number) {
  const r = ROWS.indexOf(row);
  return Math.round(12 + r * 8 + (bay - 1) * 5.5);
}

export const BINS: Bin[] = [];
for (const row of ROWS) {
  for (let bay = 1; bay <= BAYS_PER_ROW[row]; bay++) {
    for (let level = 1 as Level; level <= 4; level = (level + 1) as Level) {
      // End bays of rows A–D are short (36 in) because of the west cross-aisle.
      const w = bay === 9 && row !== 'F' ? 36 : 48;
      BINS.push({
        id: binId(row, bay, level),
        row,
        bay,
        level,
        w,
        d: 24,
        h: LEVEL_HEIGHT[level],
        limitLb: level === 4 ? 60 : 150,
        distFt: walkDistance(row, bay),
        shelfIn: SHELF_DECK[level],
      });
    }
  }
}
export const BIN_BY_ID: Record<string, Bin> = Object.fromEntries(BINS.map((b) => [b.id, b]));

// ---------------------------------------------------------------------------
// Incoming shipment
export const SHIPMENT = {
  po: 'PO-2291',
  vendor: 'Ashgrove Ceramics',
  arrives: 'Thu, Nov 19',
  arrivesNote: 'Freight window 9–11 am · roll-up door',
  cartons: 18,
  product: 'Speckled Stoneware Planter',
};

export const SIZES: ShipmentSize[] = [
  {
    key: 'S',
    skuId: 'PL-SPK-06',
    name: 'Ceramic Planter Speckle 6in',
    short: '6 in · Small',
    units: 120,
    unitLb: 1.8,
    box: { w: 7, d: 7, h: 7 },
    perCarton: 20,
    cartons: 6,
    forecastPicks30: 150,
  },
  {
    key: 'M',
    skuId: 'PL-SPK-08',
    name: 'Ceramic Planter Speckle 8in',
    short: '8 in · Medium',
    units: 140,
    unitLb: 3.6,
    box: { w: 9.5, d: 9.5, h: 8.5 },
    perCarton: 20,
    cartons: 7,
    forecastPicks30: 220,
  },
  {
    key: 'L',
    skuId: 'PL-SPK-10',
    name: 'Ceramic Planter Speckle 10in',
    short: '10 in · Large',
    units: 80,
    unitLb: 7.9,
    box: { w: 11.5, d: 11.5, h: 11 },
    perCarton: 16,
    cartons: 5,
    forecastPicks30: 100,
  },
];
export const SIZE_BY_KEY: Record<SizeKey, ShipmentSize> = Object.fromEntries(
  SIZES.map((s) => [s.key, s]),
) as Record<SizeKey, ShipmentSize>;

// ---------------------------------------------------------------------------
// Seeded RNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261116);
const rint = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1));

// ---------------------------------------------------------------------------
// SKUs
type SkuSeed = [code: string, name: string, category: string, unitLb: number, picks?: number];

const planterLines: [string, string][] = [
  ['RIB', 'Ribbed Ivory'],
  ['MOS', 'Moss Glaze'],
  ['CHD', 'Charcoal Dimple'],
  ['SND', 'Sandstone Bowl'],
  ['SGR', 'Sage Ripple'],
  ['BLF', 'Blush Footed'],
  ['OCT', 'Ochre Tapered'],
  ['MDC', 'Midnight Cylinder'],
  ['CRF', 'Cream Fluted'],
  ['FCK', 'Forest Crackle'],
];
const planterSeeds: SkuSeed[] = [];
const sizeLb: Record<string, number> = { '4in': 0.9, '6in': 1.7, '8in': 3.4, '10in': 7.2 };
for (const [code, line] of planterLines) {
  for (const s of ['4in', '6in', '8in']) {
    planterSeeds.push([`PL-${code}-${s.replace('in', '').padStart(2, '0')}`, `Ceramic Planter ${line} ${s}`, 'Planters', sizeLb[s]]);
  }
}
for (const [code, line] of planterLines.slice(0, 4)) {
  planterSeeds.push([`PL-${code}-10`, `Ceramic Planter ${line} 10in`, 'Planters', sizeLb['10in']]);
}
planterSeeds.push(
  ['PL-TER-04', 'Terracotta Pot Classic 4in', 'Planters', 0.7],
  ['PL-TER-06', 'Terracotta Pot Classic 6in', 'Planters', 1.5],
  ['PL-TER-08', 'Terracotta Pot Classic 8in', 'Planters', 3.1],
  ['PL-TER-12', 'Terracotta Pot Classic 12in', 'Planters', 8.4],
  ['PL-HNG-06', 'Hanging Planter Matte White 6in', 'Planters', 1.6],
  ['PL-HNG-08', 'Hanging Planter Matte White 8in', 'Planters', 2.9],
  ['PL-WAL-05', 'Wall Planter Half-Moon 5in', 'Planters', 1.2],
);

const otherSeeds: SkuSeed[] = [
  // Saucers & inner pots
  ['SC-TER-04', 'Terracotta Saucer 4in', 'Saucers & inserts', 0.3],
  ['SC-TER-06', 'Terracotta Saucer 6in', 'Saucers & inserts', 0.5],
  ['SC-TER-08', 'Terracotta Saucer 8in', 'Saucers & inserts', 0.8],
  ['SC-TER-10', 'Terracotta Saucer 10in', 'Saucers & inserts', 1.2],
  ['SC-CLR-06', 'Clear Saucer 6in (5-pack)', 'Saucers & inserts', 0.4],
  ['SC-CLR-08', 'Clear Saucer 8in (5-pack)', 'Saucers & inserts', 0.6],
  ['SC-CLR-10', 'Clear Saucer 10in (5-pack)', 'Saucers & inserts', 0.8],
  ['SC-IVY-06', 'Ceramic Saucer Ivory 6in', 'Saucers & inserts', 0.7],
  ['SC-IVY-08', 'Ceramic Saucer Ivory 8in', 'Saucers & inserts', 1.0],
  ['NP-04-10', 'Nursery Pot 4in (10-pack)', 'Saucers & inserts', 0.5],
  ['NP-06-10', 'Nursery Pot 6in (10-pack)', 'Saucers & inserts', 0.9],
  ['NP-08-05', 'Nursery Pot 8in (5-pack)', 'Saucers & inserts', 0.9],
  ['SW-INS-06', 'Self-Watering Insert 6in', 'Saucers & inserts', 0.4],
  ['SW-INS-08', 'Self-Watering Insert 8in', 'Saucers & inserts', 0.5],
  // Hanging
  ['HG-MAC-NAT', 'Macramé Hanger Natural 36in', 'Hanging & display', 0.3],
  ['HG-MAC-CHR', 'Macramé Hanger Charcoal 36in', 'Hanging & display', 0.3],
  ['HG-HOOK-BR', 'Brass Ceiling Hook (2-pack)', 'Hanging & display', 0.2],
  ['HG-WALL-BR', 'Wall Bracket Swivel Black', 'Hanging & display', 0.6],
  ['ST-MID-08', 'Mid-Century Plant Stand 8in', 'Hanging & display', 2.4],
  ['ST-MID-10', 'Mid-Century Plant Stand 10in', 'Hanging & display', 2.9],
  ['ST-MID-12', 'Mid-Century Plant Stand 12in', 'Hanging & display', 3.5],
  ['ST-IRN-12', 'Iron Plant Stand Black 12in', 'Hanging & display', 4.8],
  ['ST-BAM-TR', 'Bamboo Plant Stand 3-Tier', 'Hanging & display', 6.5],
  ['ST-CRN-TL', 'Corner Plant Shelf Tall', 'Hanging & display', 9.8],
  // Soil & media
  ['SM-ARD-04', 'Aroid Mix 4qt', 'Soil & media', 3.1],
  ['SM-ARD-08', 'Aroid Mix 8qt', 'Soil & media', 6.0],
  ['SM-SUC-04', 'Succulent & Cactus Mix 4qt', 'Soil & media', 4.2],
  ['SM-SUC-08', 'Succulent & Cactus Mix 8qt', 'Soil & media', 8.1],
  ['SM-IND-08', 'Indoor Potting Mix 8qt', 'Soil & media', 7.4],
  ['SM-IND-16', 'Indoor Potting Mix 16qt', 'Soil & media', 13.8],
  ['SM-ORC-04', 'Orchid Bark 4qt', 'Soil & media', 2.2],
  ['SM-PER-08', 'Perlite Coarse 8qt', 'Soil & media', 1.6],
  ['SM-CHR-02', 'Horticultural Charcoal 2qt', 'Soil & media', 1.1],
  ['SM-SPH-01', 'Sphagnum Moss 1 lb', 'Soil & media', 1.1],
  ['SM-LEC-05', 'LECA Clay Pebbles 5L', 'Soil & media', 4.6],
  ['SM-PUM-04', 'Pumice 4qt', 'Soil & media', 3.4],
  ['SM-COI-BR', 'Coco Coir Brick 650g', 'Soil & media', 1.5],
  ['SM-LAV-02', 'Lava Rock Top Dressing 2 lb', 'Soil & media', 2.1],
  ['SM-PEB-02', 'White Pebbles Top Dressing 2 lb', 'Soil & media', 2.1],
  ['SM-SHT-01', 'Sheet Moss 1 sq ft', 'Soil & media', 0.3],
  ['SM-RDM-04', 'Preserved Reindeer Moss 4oz', 'Soil & media', 0.3],
  // Fertilizer & plant food (front-bay ones are added separately below)
  ['FZ-LIQ-32', 'Liquid Fertilizer 32oz Refill', 'Fertilizer', 2.3],
  ['FZ-SPK-30', 'Fertilizer Spikes (30-pack)', 'Fertilizer', 0.6],
  ['FZ-FLF-08', 'Fiddle Leaf Fig Food 8oz', 'Fertilizer', 0.6],
  ['FZ-MON-08', 'Monstera Plant Food 8oz', 'Fertilizer', 0.6],
  ['FZ-CAL-08', 'Calathea Plant Food 8oz', 'Fertilizer', 0.6],
  ['FZ-CIT-08', 'Citrus & Herb Food 8oz', 'Fertilizer', 0.6],
  // Pest & plant care
  ['PC-NEM-16', 'Neem Oil Spray 16oz', 'Pest & care', 1.2],
  ['PC-SOP-16', 'Insecticidal Soap 16oz', 'Pest & care', 1.2],
  ['PC-STK-20', 'Yellow Sticky Traps (20-pack)', 'Pest & care', 0.3],
  ['PC-GNT-08', 'Fungus Gnat Bits 8oz', 'Pest & care', 0.6],
  ['PC-SHN-08', 'Leaf Shine Spray 8oz', 'Pest & care', 0.6],
  ['PC-SYS-08', 'Systemic Granules 8oz', 'Pest & care', 0.6],
  ['PC-DIA-01', 'Diatomaceous Earth 1 lb', 'Pest & care', 1.1],
  ['PC-ROT-02', 'Rooting Hormone Gel 2oz', 'Pest & care', 0.2],
  ['PC-PRB-08', 'Probiotic Root Booster 8oz', 'Pest & care', 0.6],
  ['PC-WIP-30', 'Leaf Wipes (30-pack)', 'Pest & care', 0.4],
  // Tools & watering
  ['TL-PRN-BY', 'Bypass Pruners', 'Tools & watering', 0.5],
  ['TL-SNP-PR', 'Precision Snips', 'Tools & watering', 0.2],
  ['TL-BON-SC', 'Bonsai Scissors', 'Tools & watering', 0.3],
  ['TL-SCP-03', 'Soil Scoop Set (3)', 'Tools & watering', 0.5],
  ['TL-MAT-CV', 'Repotting Mat Waxed Canvas', 'Tools & watering', 1.0],
  ['TL-MST-MT', 'Moisture Meter', 'Tools & watering', 0.3],
  ['TL-MIS-BR', 'Plant Mister Brass 250ml', 'Tools & watering', 0.6],
  ['TL-MIS-PL', 'Plant Mister Amber 300ml', 'Tools & watering', 0.4],
  ['TL-CAN-BK', 'Long-Spout Watering Can 1.5L Black', 'Tools & watering', 1.4],
  ['TL-CAN-SG', 'Watering Can 1L Sage', 'Tools & watering', 1.1],
  ['TL-CAN-BR', 'Watering Can 2L Brushed Brass', 'Tools & watering', 2.0],
  ['TL-SPK-04', 'Self-Watering Spikes (4)', 'Tools & watering', 0.5],
  ['TL-LBL-50', 'Bamboo Plant Labels (50)', 'Tools & watering', 0.3],
  ['TL-LBL-CU', 'Copper Plant Labels (10)', 'Tools & watering', 0.2],
  ['TL-TIE-30', 'Plant Tie Wire 30m', 'Tools & watering', 0.2],
  ['TL-TIE-VC', 'Soft Plant Ties Velcro', 'Tools & watering', 0.2],
  ['TL-GLV-MD', 'Garden Gloves Olive M', 'Tools & watering', 0.3],
  ['TL-GLV-LG', 'Garden Gloves Olive L', 'Tools & watering', 0.3],
  ['TL-APR-CV', 'Canvas Potting Apron', 'Tools & watering', 0.8],
  ['TL-TRW-MN', 'Mini Trowel & Rake Set', 'Tools & watering', 0.6],
  // Supports
  ['SP-MOS-24', 'Moss Pole 24in', 'Supports', 1.1],
  ['SP-MOS-36', 'Moss Pole 36in', 'Supports', 1.6],
  ['SP-MOS-EX', 'Extendable Moss Pole Kit', 'Supports', 2.2],
  ['SP-COI-24', 'Coir Totem 24in', 'Supports', 1.2],
  ['SP-BAM-18', 'Bamboo Stakes 18in (25)', 'Supports', 0.7],
  ['SP-HOP-SM', 'Trellis Hoop Small', 'Supports', 0.3],
  ['SP-HOP-LG', 'Trellis Hoop Large', 'Supports', 0.5],
  ['SP-CLP-20', 'Plant Clips (20)', 'Supports', 0.1],
  ['SP-WIR-TR', 'Wire Trellis Fan 18in', 'Supports', 0.4],
  // Grow lights & humidity
  ['GL-CLP-10', 'Clip Grow Light 10W', 'Light & humidity', 1.3],
  ['GL-BLB-E26', 'Grow Bulb E26 9W', 'Light & humidity', 0.3],
  ['GL-BAR-24', 'Grow Light Bar 24in', 'Light & humidity', 1.9],
  ['GL-STD-TR', 'Grow Light Floor Stand', 'Light & humidity', 5.6],
  ['GL-TMR-SP', 'Smart Plug Timer', 'Light & humidity', 0.3],
  ['HU-TRY-10', 'Pebble Humidity Tray Round 10in', 'Light & humidity', 1.4],
  ['HU-TRY-16', 'Humidity Tray Rect 16in', 'Light & humidity', 1.9],
  ['HU-MIN-WH', 'Mini Humidifier White', 'Light & humidity', 1.7],
  ['HU-HYG-DG', 'Digital Hygrometer', 'Light & humidity', 0.2],
  // Cutting kits & propagation
  ['CK-PTH-GL', 'Pothos Cutting Kit', 'Cutting kits', 0.4, 96],
  ['CK-PHB-BR', 'Philodendron Brasil Cutting Kit', 'Cutting kits', 0.4, 58],
  ['CK-MAD-AD', 'Monstera Adansonii Cutting Kit', 'Cutting kits', 0.4, 71],
  ['CK-SOH-CR', 'String of Hearts Cutting Kit', 'Cutting kits', 0.3, 44],
  ['CK-TRD-NN', 'Tradescantia Nanouk Cutting Kit', 'Cutting kits', 0.3, 39],
  ['CK-HOY-CR', 'Hoya Carnosa Cutting Kit', 'Cutting kits', 0.3, 52],
  ['CK-SCI-SL', 'Scindapsus Silver Cutting Kit', 'Cutting kits', 0.3, 33],
  ['CK-PEP-HP', 'Peperomia Hope Cutting Kit', 'Cutting kits', 0.3, 27],
  ['PR-CLP-10', 'Propagation Clips (10)', 'Cutting kits', 0.1],
  ['PR-PLG-12', 'Rooting Plugs (12)', 'Cutting kits', 0.2],
  ['PR-DOM-SM', 'Propagation Dome Tray', 'Cutting kits', 1.1],
  // Bulbs & seeds
  ['BL-AMR-RL', 'Amaryllis Bulb Kit Red Lion', 'Bulbs & seeds', 1.8, 61],
  ['BL-AMR-AP', 'Amaryllis Bulb Kit Apple Blossom', 'Bulbs & seeds', 1.8, 38],
  ['BL-PPW-05', 'Paperwhite Bulb Kit (5)', 'Bulbs & seeds', 1.4, 46],
  ['SD-HRB-KT', 'Kitchen Herb Seed Kit', 'Bulbs & seeds', 1.2],
  ['SD-MCG-KT', 'Microgreens Grow Kit', 'Bulbs & seeds', 1.5],
  ['SD-CAT-KT', 'Cat Grass Kit', 'Bulbs & seeds', 0.9],
  // Gifting
  ['GF-BOX-SM', 'Holiday Gift Box Small', 'Gifting', 0.4, 49],
  ['GF-BOX-MD', 'Holiday Gift Box Medium', 'Gifting', 0.6, 41],
  ['GF-BOX-LG', 'Holiday Gift Box Large', 'Gifting', 0.9, 17],
  ['GF-SLV-06', 'Kraft Gift Sleeve 6in', 'Gifting', 0.1],
  ['GF-SLV-08', 'Kraft Gift Sleeve 8in', 'Gifting', 0.1],
  ['GF-CRD-ST', 'Gift Card & Envelope Set', 'Gifting', 0.1],
  ['GF-BKL-PC', 'Plant Care Booklet', 'Gifting', 0.2],
  ['GF-RIB-RD', 'Velvet Ribbon Spool Red', 'Gifting', 0.3],
  ['GF-RIB-GR', 'Velvet Ribbon Spool Forest', 'Gifting', 0.3],
  ['GF-TAG-25', 'Holiday Gift Tags (25)', 'Gifting', 0.1],
  ['GF-STK-50', 'Fernhollow Seal Stickers (50)', 'Gifting', 0.1],
  ['GF-CRD-WF', 'Holiday Card Winter Fern', 'Gifting', 0.1],
  ['GF-TIS-SG', 'Tissue Paper Sage (50 sheets)', 'Gifting', 0.4],
  ['SM-BON-02', 'Bonsai Soil Mix 2qt', 'Soil & media', 2.6],
  ['SM-SED-08', 'Seed Starting Mix 8qt', 'Soil & media', 5.1],
  ['PC-CPR-16', 'Copper Fungicide Spray 16oz', 'Pest & care', 1.2],
  ['TL-MSH-20', 'Drainage Mesh Squares (20)', 'Tools & watering', 0.1],
  ['TL-FNL-03', 'Watering Bottle Tops (3)', 'Tools & watering', 0.2],
  ['TL-TRN-RP', 'Repotting Turntable', 'Tools & watering', 2.7],
  ['CK-RHT-TT', 'Rhaphidophora Tetrasperma Cutting Kit', 'Cutting kits', 0.3, 31],
  ['CK-SYN-PK', 'Syngonium Pink Cutting Kit', 'Cutting kits', 0.3, 24],
  ['GL-BLB-GU', 'Grow Bulb GU10 7W', 'Light & humidity', 0.2],
  ['SP-JUT-50', 'Jute Twine Roll 50m', 'Supports', 0.4],
];

// Slow-moving fertilizer that currently sits in the bays closest to packing.
export const FRONT_FERTILIZER: { sku: SkuSeed; bins: [string, number, number][] }[] = [
  { sku: ['FZ-LIQ-08', 'Liquid Fertilizer 8oz', 'Fertilizer', 0.6, 22], bins: [['A1-1', 140, 92], ['A1-2', 140, 95], ['A1-3', 130, 88]] },
  { sku: ['FZ-GRN-02', 'Slow-Release Granules 2 lb', 'Fertilizer', 2.1, 14], bins: [['A2-1', 64, 90], ['A2-2', 58, 84]] },
  { sku: ['FZ-ORC-08', 'Orchid Bloom Booster 8oz', 'Fertilizer', 0.6, 9], bins: [['A2-3', 96, 71]] },
  { sku: ['FZ-WRM-04', 'Worm Castings 4qt', 'Fertilizer', 5.2, 11], bins: [['A3-1', 26, 94], ['A3-2', 22, 81]] },
  { sku: ['FZ-CAC-08', 'Cactus & Succulent Feed 8oz', 'Fertilizer', 0.6, 6], bins: [['A3-3', 120, 77]] },
  { sku: ['FZ-FSH-16', 'Fish Emulsion 16oz', 'Fertilizer', 1.1, 8], bins: [['B1-1', 92, 86], ['B1-2', 88, 83]] },
  { sku: ['FZ-KLP-16', 'Liquid Kelp Concentrate 16oz', 'Fertilizer', 1.1, 4], bins: [['B2-1', 72, 68]] },
];
export const FRONT_FERTILIZER_BINS = FRONT_FERTILIZER.flatMap((f) => f.bins.map((b) => b[0]));

// Bins that are empty or partly empty today (fill %). Anything not listed is stocked 66–98%.
const OPEN_BINS: Record<string, number> = {
  'A1-4': 30,
  'B1-4': 0,
  'C2-2': 45,
  'C4-1': 0,
  'C4-2': 15,
  'B6-3': 0,
  'D5-1': 0,
  'D5-4': 0,
  'E3-2': 25,
  'E6-1': 0,
  'E6-2': 0,
  'E7-1': 0,
  'E8-1': 0,
  'E8-2': 0,
  'E8-3': 0,
  'F5-1': 0,
  'F5-4': 0,
  'F6-1': 0,
  'F6-2': 0,
  'F6-3': 0,
  'F7-1': 0,
  'F7-2': 0,
  'F7-3': 0,
  'F8-1': 0,
  'F8-2': 0,
  'F8-3': 0,
  'F8-4': 0,
  'F9-1': 0,
  'F9-2': 0,
  'F9-3': 0,
  'F9-4': 0,
};

// Bins with specific, hand-set contents.
const FIXED: { binId: string; skuCode: string; units: number; fill: number }[] = [
  { binId: 'D3-2', skuCode: 'CK-PTH-GL', units: 210, fill: 74 },
  { binId: 'A1-4', skuCode: 'TL-LBL-50', units: 40, fill: 30 },
  { binId: 'C2-2', skuCode: 'SC-CLR-08', units: 36, fill: 45 },
  { binId: 'C4-2', skuCode: 'GF-SLV-08', units: 60, fill: 15 },
  { binId: 'E3-2', skuCode: 'HU-TRY-16', units: 18, fill: 25 },
];

// ---------------------------------------------------------------------------
// Build SKU list
export const SKUS: Sku[] = [];
const SKU_BY_CODE: Record<string, Sku> = {};
function addSku([code, name, category, unitLb, picks]: SkuSeed) {
  const sku: Sku = { id: code, name, category, unitLb, picks30: picks ?? 0 };
  SKUS.push(sku);
  SKU_BY_CODE[code] = sku;
  return sku;
}
for (const f of FRONT_FERTILIZER) addSku(f.sku);
for (const s of [...planterSeeds, ...otherSeeds]) addSku(s);
for (const size of SIZES) addSku([size.skuId, size.name, 'Planters', size.unitLb, 0]);

// Picks for SKUs that didn't get a hand-set value — skewed: most items are slow.
const handPicked: Record<string, number> = {
  'PL-RIB-06': 63,
  'PL-RIB-08': 48,
  'PL-MOS-06': 55,
  'SM-ARD-04': 64,
  'SP-MOS-24': 47,
  'PC-NEM-16': 36,
  'TL-MST-MT': 42,
  'PL-TER-06': 40,
};
for (const s of SKUS) {
  if (SIZES.some((z) => z.skuId === s.id)) continue;
  if (s.picks30) continue;
  if (handPicked[s.id] != null) {
    s.picks30 = handPicked[s.id];
    continue;
  }
  const r = rand();
  s.picks30 = r < 0.55 ? rint(1, 12) : r < 0.85 ? rint(10, 26) : rint(24, 38);
}

// ---------------------------------------------------------------------------
// Stock placement
export const STOCK: StockLine[] = [];
export const BASE_FILL: Record<string, number> = {};

for (const f of FRONT_FERTILIZER) {
  for (const [bin, units, fill] of f.bins) {
    STOCK.push({ binId: bin, skuId: f.sku[0], units });
    BASE_FILL[bin] = fill;
  }
}
for (const fx of FIXED) {
  STOCK.push({ binId: fx.binId, skuId: fx.skuCode, units: fx.units });
  BASE_FILL[fx.binId] = fx.fill;
}
for (const [id, fill] of Object.entries(OPEN_BINS)) {
  if (BASE_FILL[id] == null) BASE_FILL[id] = fill;
}

const fixedCodes = new Set([...FIXED.map((f) => f.skuCode), ...FRONT_FERTILIZER.map((f) => f.sku[0])]);
const toPlace = SKUS.filter((s) => !fixedCodes.has(s.id) && !SIZES.some((z) => z.skuId === s.id));
const freeBins = BINS.filter((b) => BASE_FILL[b.id] == null);

// Light SKUs first go to overhead bins, heavy SKUs to floor/waist.
const overhead = freeBins.filter((b) => b.level === 4);
const lower = freeBins.filter((b) => b.level !== 4);
const light = toPlace.filter((s) => s.unitLb <= 1.2);
const heavy = toPlace.filter((s) => s.unitLb > 1.2);
function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
shuffle(overhead);
shuffle(lower);
shuffle(light);
shuffle(heavy);

const assignment: { bin: Bin; sku: Sku }[] = [];
const lightQueue = [...light];
for (const b of overhead) {
  const s = lightQueue.shift();
  if (s) assignment.push({ bin: b, sku: s });
}
const lowerQueue = shuffle([...heavy, ...lightQueue]);
let li = 0;
for (const b of lower) {
  const s = lowerQueue[li % lowerQueue.length];
  li++;
  assignment.push({ bin: b, sku: s });
}
// Any SKU that didn't land anywhere shares a lower bin with another item.
const placed = new Set(assignment.map((a) => a.sku.id));
const unplaced = toPlace.filter((s) => !placed.has(s.id));
unplaced.forEach((s, i) => {
  const host = assignment.filter((a) => a.bin.level !== 4)[i * 3 + 1];
  assignment.push({ bin: host.bin, sku: s });
});

const binLoad: Record<string, number> = {};
for (const { bin, sku } of assignment) {
  if (BASE_FILL[bin.id] == null) BASE_FILL[bin.id] = rint(66, 98);
  const shared = assignment.filter((a) => a.bin.id === bin.id).length;
  const budget = (bin.limitLb * (0.35 + rand() * 0.5)) / shared;
  const already = binLoad[bin.id] ?? 0;
  let units = Math.max(6, Math.floor(budget / sku.unitLb));
  units = Math.min(units, sku.unitLb < 0.4 ? 240 : sku.unitLb < 1 ? 160 : 90);
  while (units > 4 && already + units * sku.unitLb > bin.limitLb * 0.92) units -= 2;
  binLoad[bin.id] = already + units * sku.unitLb;
  STOCK.push({ binId: bin.id, skuId: sku.id, units });
}

export const SKU_BY_ID: Record<string, Sku> = Object.fromEntries(SKUS.map((s) => [s.id, s]));

export function stockForBin(id: string) {
  return STOCK.filter((s) => s.binId === id);
}
export function binsForSku(skuId: string) {
  return STOCK.filter((s) => s.skuId === skuId);
}
export function unitsOnHand(skuId: string) {
  return binsForSku(skuId).reduce((a, s) => a + s.units, 0);
}

// Starting plan: Priya has already put the small planters on the two light top shelves up front.
export const INITIAL_ALLOCATIONS: { size: SizeKey; binId: string; units: number }[] = [
  { size: 'S', binId: 'A1-4', units: 25 },
  { size: 'S', binId: 'B1-4', units: 33 },
];
