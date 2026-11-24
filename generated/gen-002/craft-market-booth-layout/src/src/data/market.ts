import type { Draft, Placement, Placements, Vendor } from '../lib/types';
import { HALL } from './venue';

// 44 accepted vendors. Gym booths are numbered G01-G34 and hallway spots H01-H10.
export const VENDORS: Vendor[] = [
  // ---- Gym ----
  v('riverbend-stoneware', 'G01', 'Riverbend Stoneware', 'Ceramics', '3x2', false, 0, 'Mugs and bowls on their own shelf. No table needed.'),
  v('kiln-clover', 'G02', 'Kiln & Clover Ceramics', 'Ceramics', '3x3', false, 1, 'Tiles and trivets. Prefers a corner spot so the display faces two aisles.'),
  v('clayhouse-pottery', 'G03', 'Clayhouse Pottery', 'Ceramics', '3x3', true, 1, 'Wheel demo at 11 and 1. Needs the wall outlet for the wheel.'),
  v('thistle-glaze', 'G04', 'Thistle & Glaze Ceramics', 'Ceramics', '3x3', false, 1, 'Dessert plates and mugs. Card reader works on phone signal.'),
  v('wildrose-clay', 'G05', 'Wildrose Clay Studio', 'Ceramics', '3x2', false, 1, 'Ornaments and small dishes. One display shelf.'),
  v('silver-fern', 'G06', 'Silver Fern Jewelry', 'Jewelry', '3x3', false, 1, 'Not next to face painting.', ['juniper-lane']),
  v('tidewater-beads', 'G07', 'Tidewater Beads', 'Jewelry', '3x2', false, 1, 'Finished bracelets and bead kits.'),
  v('oriel-metalworks', 'G08', 'Oriel Metalworks', 'Jewelry', '3x3', false, 1, 'Hand-stamped brass cuffs. Needs a lockable drawer under the table.'),
  v('fernhill-wire', 'G09', 'Fernhill Wire Jewelry', 'Jewelry', '3x2', false, 0, 'Wall rack only, no table.'),
  v('halcyon-gemstone', 'G10', 'Halcyon Gemstone Co.', 'Jewelry', '3x3', false, 1, 'Loose stones and settings. Cashbox sits on the table.'),
  v('bramble-cider', 'G11', 'Bramble Cider', 'Food', '3x3', true, 2, 'Needs outlet, hot liquids.', [], 'Accepted 16 Nov (late)'),
  v('crumb-crust', 'G12', 'Crumb & Crust Bakery', 'Food', '3x3', false, 1, 'Sourdough and cinnamon rolls. Sells out by 2 pm, so bring extra trays.'),
  v('maple-street', 'G13', 'Maple Street Fudge', 'Food', '3x2', false, 1, 'Sample cubes on a tray at the front table.'),
  v('sundial-kettle', 'G14', 'Sundial Kettle Corn', 'Food', '3x3', false, 1, 'Propane burner sits at the back. Keep draped fabric away from it.'),
  v('little-wren-tea', 'G15', 'Little Wren Tea House', 'Food', '3x3', false, 1, 'Brews from thermos urns. No outlet needed.'),
  v('tallgrass-textile', 'G16', 'Tallgrass Textile Studio', 'Textiles', '3x3', true, 1, 'Sewing demo on the hour. Needs outlet and a stool.'),
  v('loom-lantern', 'G17', 'Loom & Lantern Weavers', 'Textiles', '3x3', false, 1, 'Table loom demo Saturdays. Scarves on the table.'),
  v('moss-thread', 'G18', 'Moss & Thread Knits', 'Textiles', '3x2', false, 1, 'Hats, mittens and kids’ socks.'),
  v('patchwork-pantry', 'G19', 'Patchwork Pantry', 'Textiles', '3x3', false, 1, 'Quilts hang on a 2 m rail. One table for small goods.'),
  v('indigo-hands', 'G20', 'Indigo Hands Dyeworks', 'Textiles', '3x3', false, 1, 'Tie-dye samples on a clothesline across the back.'),
  v('fieldnote-linen', 'G21', 'Fieldnote Linen', 'Textiles', '3x2', false, 0, 'Tea towels on a hanging rack.'),
  v('ironwood-ash', 'G22', 'Ironwood & Ash Woodworks', 'Woodwork', '3x3', true, 1, 'Sander runs for demos. Needs outlet.'),
  v('harbor-light', 'G23', 'Harbor Light Woodworks', 'Woodwork', '3x3', true, 1, 'Scroll saw for ornaments and small signs.'),
  v('cedar-pine', 'G24', 'Cedar & Pine Cutting Boards', 'Woodwork', '3x2', false, 1, 'Boards to order. 12 in stock.'),
  v('burl-bevel', 'G25', 'Burl & Bevel Woodcraft', 'Woodwork', '3x3', false, 1, 'Wooden bowls and spoons.'),
  v('wrens-woodshop', 'G26', 'Wren’s Woodshop', 'Woodwork', '3x2', false, 0, 'Birdhouses on a shelf.'),
  v('little-makers', 'G27', 'Little Makers Lab', "Kids' activities", '3x3', true, 1, 'Glue-gun craft station for under-8s. Needs outlet.'),
  v('juniper-lane', 'G28', 'Juniper Lane Face Painting', "Kids' activities", '3x3', false, 1, 'Two chairs and a mirror. The queue forms on the aisle side, keep it open.', ['silver-fern']),
  v('bright-bean', 'G29', 'Bright Bean Bookmarks', "Kids' activities", '3x2', false, 1, 'Bookmark kits, $3 per child.'),
  v('paper-pals', 'G30', 'Paper Pals Origami Corner', "Kids' activities", '3x2', false, 1, 'Floor cushions for kids and one table for paper.'),
  v('sprout-sparkle', 'G31', 'Sprout & Sparkle Crafts', "Kids' activities", '3x3', false, 1, 'Seed-paper kits and pressed-flower cards.'),
  v('hollow-oak-candle', 'G32', 'Hollow Oak Candle Co.', 'Candles', '3x2', false, 1, 'Beeswax tealights.', [], 'Accepted 16 Nov (late)'),
  v('wickline-candle', 'G33', 'Wickline Candle Works', 'Candles', '3x3', false, 1, 'Unscented pillars. Battery tealights only, no open flame.'),
  v('lamplight-candle', 'G34', 'Lamplight Candle Co.', 'Candles', '3x2', false, 1, 'Hand-poured soy tins.'),
  // ---- Front hallway (single side, 2 m spots) ----
  v('ember-oat', 'H01', 'Ember & Oat Soy Candles', 'Candles', 'hall', false, 0, 'Gift tins on a shelf, no table needed.'),
  v('copper-kettle', 'H02', 'Copper Kettle Jewelry', 'Jewelry', 'hall', false, 1, 'Hammered earrings.'),
  v('stitch-sprig', 'H03', 'Stitch & Sprig Knitwear', 'Textiles', 'hall', false, 1, 'Sweaters and scarves.'),
  v('puddle-pine', 'H04', 'Puddle & Pine Nature Crafts', "Kids' activities", 'hall', false, 1, 'Pinecone ornament kits for kids.'),
  v('honey-hollow', 'H05', 'Honey Hollow Shortbread', 'Food', 'hall', false, 1, 'Shortbread tins, baked off site.'),
  v('sparrow-hill', 'H06', 'Sparrow Hill Ceramics', 'Ceramics', 'hall', false, 1, 'Espresso cups and saucers.'),
  v('little-cove', 'H07', 'Little Cove Woodcraft', 'Woodwork', 'hall', false, 1, 'Wooden puzzles for kids.'),
  v('blue-heron', 'H08', 'Blue Heron Bags', 'Textiles', 'hall', false, 1, 'Hand-stitched canvas totes.'),
  v('pebble-pearl', 'H09', 'Pebble & Pearl Jewelry', 'Jewelry', 'hall', false, 0, 'Freshwater pearl bracelets on a wall rack.'),
  v('gingerbread-co', 'H10', 'Gingerbread & Co.', 'Food', 'hall', false, 1, 'Gingerbread house kits, boxed to take home.'),
];

function v(
  id: string,
  boothNo: string,
  name: string,
  category: Vendor['category'],
  size: Vendor['size'],
  power: boolean,
  tables: number,
  notes: string,
  keepAway: string[] = [],
  lateNote?: string,
): Vendor {
  return { id, boothNo, name, category, size, power, tables, notes, keepAway, lateNote };
}

const VENDOR_BY_ID = new Map(VENDORS.map((x) => [x.id, x]));

/** Build placements from [vendorId, x, y, outletId?] rows. Sizes come from each vendor's request. */
function build(rows: Array<[string, number, number, string?]>): Placements {
  const out: Placements = {};
  for (const [id, x, y, outlet] of rows) {
    const vd = VENDOR_BY_ID.get(id);
    if (!vd) throw new Error(`Unknown vendor ${id}`);
    const dims = vd.size === 'hall'
      ? { w: HALL.boothDepth, h: HALL.boothDepth }
      : { w: 3, h: vd.size === '3x2' ? 2 : 3 };
    const p: Placement = { x, y, w: dims.w, h: dims.h, outlet: vd.power && outlet ? outlet : null };
    out[id] = p;
  }
  return out;
}

const HALL_ROWS: Array<[string, number, number]> = [
  ['ember-oat', 0, 0],
  ['copper-kettle', 2, 0],
  ['stitch-sprig', 4, 0],
  ['puddle-pine', 6, 0],
  ['honey-hollow', 8, 0],
  ['sparrow-hill', 10, 0],
  ['little-cove', 12, 0],
  ['blue-heron', 14, 0],
  ['pebble-pearl', 16, 0],
  ['gingerbread-co', 18, 0],
];

/** Gym rows: booths sit on four rows (y = 0, 4.8, 9.6, 14.4) with 1.8 m aisles between them. */
const GYM_V3: Array<[string, number, number, string?]> = [
  ['riverbend-stoneware', 0, 0],
  ['kiln-clover', 3, 0],
  ['ironwood-ash', 6, 0, 'O1'],
  ['loom-lantern', 9, 0],
  ['clayhouse-pottery', 12, 0, 'O2'],
  ['crumb-crust', 15, 0],
  ['patchwork-pantry', 19.2, 0], // overlaps the north exit corridor
  ['wickline-candle', 24, 0],
  ['little-makers', 0, 4.8, 'O3'],
  ['juniper-lane', 3, 4.8],
  ['silver-fern', 6, 4.8], // touching juniper-lane (face painting)
  ['tidewater-beads', 9, 4.8],
  ['thistle-glaze', 12, 4.8],
  ['burl-bevel', 15, 4.8],
  ['sundial-kettle', 18, 4.8],
  ['oriel-metalworks', 21, 4.8],
  ['moss-thread', 24, 4.8],
  ['fernhill-wire', 0, 9.6],
  ['cedar-pine', 3, 9.6],
  ['maple-street', 6, 9.6],
  ['paper-pals', 9, 9.6],
  ['indigo-hands', 12, 9.6],
  ['halcyon-gemstone', 15, 9.6],
  ['fieldnote-linen', 18, 9.6],
  ['wildrose-clay', 21, 9.6],
  ['lamplight-candle', 0, 14.4],
  ['wrens-woodshop', 6, 14.4],
  ['little-wren-tea', 9, 14.4],
  ['bright-bean', 15, 14.4],
  ['tallgrass-textile', 18, 14.4, 'O5'],
  ['sprout-sparkle', 21, 14.4],
  ['harbor-light', 24, 14.4, 'O6'],
];

// Earlier draft, before the fire marshal's corridor note and the jewelry request.
const GYM_V2: Array<[string, number, number, string?]> = GYM_V3.map((row) => {
  if (row[0] === 'patchwork-pantry') return ['patchwork-pantry', 18, 0];
  if (row[0] === 'silver-fern') return ['silver-fern', 9, 0];
  if (row[0] === 'loom-lantern') return ['loom-lantern', 6, 4.8];
  return row;
}) as Array<[string, number, number, string?]>;

export const DRAFTS: Draft[] = [
  {
    id: 'v3',
    name: 'v3 current',
    savedAt: 'Mon 16 Nov, 9:14 pm',
    placements: build([...GYM_V3, ...HALL_ROWS]),
  },
  {
    id: 'v2',
    name: 'v2 Nov 3',
    savedAt: 'Tue 3 Nov, 7:40 pm',
    placements: build([...GYM_V2, ...HALL_ROWS]),
  },
];

export const INITIAL_DRAFT_ID = 'v3';
