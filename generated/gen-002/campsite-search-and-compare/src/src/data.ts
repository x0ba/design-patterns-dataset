// Mock data for Pitchfinder. Deterministic (seeded) so the app opens in the same state every time.

export const TRIP = {
  origin: 'Sacramento, CA',
  checkIn: 'Sat, May 22',
  checkOut: 'Tue, May 25',
  year: 2027,
  nights: ['Sat May 22', 'Sun May 23', 'Mon May 24'],
  nightsShort: ['Sat', 'Sun', 'Mon'],
};
export const REGION_TOTAL = 2314;
export const RESERVATION_FEE = 8;

export type Operator =
  | 'State park'
  | 'County park'
  | 'National forest'
  | 'Private'
  | 'Regional park'
  | 'State recreation area';
export type GenPolicy = 'none' | 'limited' | 'allowed';
export type SiteType = 'Tent' | 'RV' | 'Walk-in' | 'Group';
export type Shade = 'Full' | 'Partial' | 'Sun';
export type LoopKind = 'tent' | 'mixed' | 'rv' | 'walkin' | 'group';

export interface Amenities {
  flushToilets: boolean;
  showers: boolean;
  potableWater: boolean;
  playground: boolean;
  lakeAccess: boolean;
  campStore: boolean;
}
export interface Review {
  author: string;
  date: string;
  stars: number;
  text: string;
  party?: string;
}
export interface Mention {
  label: string;
  count: number;
  tone: 'good' | 'warn';
}
export interface Pt {
  x: number;
  y: number;
}
export interface Loop {
  id: string;
  kind: LoopKind;
  desc: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  top: boolean; // loop sits above the main road
  restrooms: Pt[];
  generators: boolean;
  shadeBias: number;
}
export interface Site {
  id: string;
  cgId: string;
  number: string;
  loop: string;
  type: SiteType;
  shade: Shade;
  maxPeople: number;
  maxVehicles: number;
  restroomM: number;
  open: [boolean, boolean, boolean];
  price: number;
  x: number;
  y: number;
  tentPad: string | null;
  carryM?: number;
  tags: string[];
}
export interface WaterBody {
  kind: 'Lake' | 'Reservoir' | 'River';
  name: string;
  swim: string;
}
export interface MapFeatures {
  playground: Pt | null;
  store: Pt | null;
  beach: Pt | null;
  parking: Pt | null;
  entrance: Pt;
}
export interface Campground {
  id: string;
  name: string;
  operator: Operator;
  region: string;
  driveMin: number;
  priceMin: number;
  priceMax: number;
  amenities: Amenities;
  water: WaterBody | null;
  generator: { policy: GenPolicy; text: string };
  quietHours: string;
  rating: number;
  reviewCount: number;
  shadePct: number;
  bikeNote: string | null;
  showerNote: string | null;
  elevationFt: number;
  blurb: string;
  totalSites: number;
  loops: Loop[];
  sites: Site[];
  features: MapFeatures;
  openAll: number;
  openAny: number;
  openPct: number;
  siteTypes: SiteType[];
  mentions: Mention[];
  reviews: Review[];
  seed: number;
}

// ---------- RNG ----------
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
const between = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo);
const intBetween = (r: Rng, lo: number, hi: number) => Math.floor(between(r, lo, hi + 1));

// ---------- Map geometry ----------
export const MAP_W = 900;
export const MAP_H = 560;
export const ROAD_Y = 255;
export const LAKE_Y = 478;
export const M_PER_UNIT = 0.75;

const SLOTS = {
  lakeLeft: { cx: 285, cy: 362, top: false },
  lakeRight: { cx: 575, cy: 362, top: false },
  topLeft: { cx: 175, cy: 150, top: true },
  topCenter: { cx: 445, cy: 140, top: true },
  topRight: { cx: 735, cy: 160, top: true },
};
type SlotName = keyof typeof SLOTS;

export function walkMinutes(m: number) {
  // A family with kids walks about 50 m a minute.
  const mins = m / 50;
  if (mins < 1) return 'under 1 min walk';
  return `${Math.round(mins)} min walk`;
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

interface LoopSpec {
  id: string;
  kind: LoopKind;
  count: number;
  slot?: SlotName;
  restrooms: number;
  generators?: boolean;
  shadeBias?: number;
  desc?: string;
}

function buildLoopGeometry(spec: LoopSpec, r: Rng): Loop {
  if (spec.kind === 'walkin') {
    // Restroom sits at the walk-in parking lot.
    return {
      id: spec.id,
      kind: spec.kind,
      desc: spec.desc ?? '',
      cx: 805,
      cy: 405,
      rx: 80,
      ry: 50,
      top: false,
      restrooms: [{ x: 842, y: 318 }],
      generators: false,
      shadeBias: spec.shadeBias ?? 0,
    };
  }
  const s = SLOTS[spec.slot ?? 'topLeft'];
  const small = spec.kind === 'group' || spec.count <= 10;
  const rx = small ? 62 : spec.count > 30 ? 112 : 100;
  const ry = small ? 34 : 58;
  const restrooms: Pt[] = [];
  const base = between(r, 0, Math.PI * 2);
  for (let i = 0; i < spec.restrooms; i++) {
    let ang = base + (i * Math.PI * 2) / spec.restrooms;
    // keep restrooms away from the entry spur
    const entry = s.top ? Math.PI / 2 : -Math.PI / 2;
    const d = Math.atan2(Math.sin(ang - entry), Math.cos(ang - entry));
    if (Math.abs(d) < 0.5) ang += 0.9;
    restrooms.push({ x: s.cx + Math.cos(ang) * (rx - 14), y: s.cy + Math.sin(ang) * (ry - 13) });
  }
  return {
    id: spec.id,
    kind: spec.kind,
    desc: spec.desc ?? '',
    cx: s.cx,
    cy: s.cy,
    rx,
    ry,
    top: s.top,
    restrooms,
    generators: !!spec.generators,
    shadeBias: spec.shadeBias ?? 0,
  };
}

function typeForLoop(kind: LoopKind, r: Rng): SiteType {
  if (kind === 'walkin') return 'Walk-in';
  if (kind === 'group') return 'Group';
  const x = r();
  if (kind === 'tent') return x < 0.88 ? 'Tent' : 'RV';
  if (kind === 'mixed') return x < 0.55 ? 'Tent' : 'RV';
  return x < 0.1 ? 'Tent' : 'RV';
}

interface CgSiteParams {
  cgId: string;
  shadePct: number;
  avail: number; // 0..1, higher = more open
  priceMin: number;
  priceMax: number;
  hasLake: boolean;
  features: MapFeatures;
}

function layoutSites(loops: Loop[], specs: LoopSpec[], p: CgSiteParams, r: Rng): Site[] {
  const sites: Site[] = [];
  loops.forEach((loop, li) => {
    const spec = specs[li];
    const n = spec.count;
    const positions: Pt[] = [];
    if (loop.kind === 'walkin') {
      // Walk-in sites sit between the parking lot and the water, along a footpath.
      for (let i = 0; i < n; i++) {
        const col = i % 5;
        const row = Math.floor(i / 5);
        positions.push({
          x: 742 + col * 30 + (row % 2) * 12 + between(r, -4, 4),
          y: 368 + row * 34 + between(r, -4, 4),
        });
      }
    } else {
      const entry = loop.top ? Math.PI / 2 : -Math.PI / 2;
      const gap = 0.42;
      const span = Math.PI * 2 - gap * 2;
      const off = loop.kind === 'group' ? 26 : 19;
      for (let i = 0; i < n; i++) {
        const ang = entry + gap + (span * (i + 0.5)) / n;
        positions.push({
          x: loop.cx + Math.cos(ang) * (loop.rx + off),
          y: loop.cy + Math.sin(ang) * (loop.ry + off),
        });
      }
    }
    positions.forEach((pos, i) => {
      const type = typeForLoop(loop.kind, r);
      const restroomUnits = Math.min(...loop.restrooms.map((rr) => dist(rr, pos)));
      const restroomM = Math.max(8, Math.round(restroomUnits * M_PER_UNIT));
      // shade
      const sp = Math.min(0.97, Math.max(0.05, p.shadePct / 100 + loop.shadeBias));
      const sr = r();
      const shade: Shade = sr < sp * 0.6 ? 'Full' : sr < sp * 1.08 ? 'Partial' : 'Sun';
      // availability
      let a = p.avail;
      if (loop.kind === 'group') a *= 0.4;
      if (loop.kind === 'walkin') a *= 1.25;
      const ar = r();
      let open: [boolean, boolean, boolean];
      if (ar < a * 0.62) open = [true, true, true];
      else if (ar < a * 1.5) {
        const combos: [boolean, boolean, boolean][] = [
          [true, false, false],
          [false, true, true],
          [true, true, false],
          [false, false, true],
          [false, true, false],
          [true, false, true],
        ];
        open = pick(r, combos);
      } else open = [false, false, false];

      const lakeView = p.hasLake && (loop.kind === 'walkin' || (!loop.top && pos.y > loop.cy + 20));
      let price = p.priceMin;
      if (type === 'RV') price = p.priceMax;
      if (type === 'Group') price = p.priceMax;
      if (type === 'Tent' && lakeView) price = Math.min(p.priceMax, p.priceMin + 10);
      if (type === 'Walk-in') price = Math.max(28, p.priceMin - 5);

      const maxPeople = type === 'Group' ? pick(r, [25, 30, 40]) : type === 'Walk-in' ? pick(r, [4, 6, 6]) : type === 'RV' ? 8 : pick(r, [6, 6, 8, 4]);
      const maxVehicles = type === 'Group' ? 6 : type === 'Walk-in' ? 1 : type === 'RV' ? 2 : pick(r, [2, 2, 1]);
      const tentPad =
        type === 'RV'
          ? r() < 0.45
            ? null
            : '12 × 12 ft'
          : type === 'Group'
            ? 'Space for 6+ tents'
            : pick(r, ['12 × 12 ft', '14 × 14 ft', '12 × 16 ft', '10 × 12 ft']);

      const tags: string[] = [];
      if (lakeView) tags.push('Lake view');
      if (p.features.playground && dist(p.features.playground, pos) < 95) tags.push('Near playground');
      if (loop.generators) tags.push('Generator loop');
      if (restroomM < 22) tags.push('Right by restroom');
      if (Math.abs(pos.y - ROAD_Y) < 36 && loop.kind !== 'walkin') tags.push('Near main road');
      let carryM: number | undefined;
      if (type === 'Walk-in' && p.features.parking) {
        carryM = Math.round(dist(p.features.parking, pos) * M_PER_UNIT);
      }
      const number = loop.kind === 'walkin' ? `W${i + 1}` : loop.kind === 'group' ? `G${i + 1}` : `${loop.id}${i + 1}`;
      sites.push({
        id: `${p.cgId}-${number}`,
        cgId: p.cgId,
        number,
        loop: loop.id,
        type,
        shade,
        maxPeople,
        maxVehicles,
        restroomM,
        open,
        price,
        x: pos.x,
        y: pos.y,
        tentPad,
        carryM,
        tags,
      });
    });
  });
  // Ensure at least one site is open for the whole stay (the search only returns these).
  if (!sites.some((s) => s.open.every(Boolean))) {
    const s = sites.find((x) => x.type === 'Tent') ?? sites[0];
    s.open = [true, true, true];
  }
  return sites;
}

const LOOP_DESC: Record<LoopKind, string> = {
  tent: 'Mostly tent sites',
  mixed: 'Tents and small RVs',
  rv: 'RV sites with hookups',
  walkin: 'Walk-in: park in the lot, carry gear to the site',
  group: 'Large group sites (25+ people)',
};

function assemble(
  base: Omit<Campground, 'loops' | 'sites' | 'openAll' | 'openAny' | 'openPct' | 'siteTypes' | 'features' | 'totalSites'>,
  specs: LoopSpec[],
  avail: number,
  r: Rng,
): Campground {
  const hasLake = !!base.water;
  const features: MapFeatures = {
    entrance: { x: 330, y: 18 },
    store: base.amenities.campStore ? { x: 528, y: 44 } : null,
    playground: null,
    beach: hasLake && base.amenities.lakeAccess ? { x: 330, y: LAKE_Y + 14 } : null,
    parking: specs.some((s) => s.kind === 'walkin') ? { x: 800, y: 312 } : null,
  };
  const loops = specs.map((s) => {
    const l = buildLoopGeometry(s, r);
    if (!l.desc) l.desc = LOOP_DESC[s.kind];
    return l;
  });
  if (base.amenities.playground) {
    const host = loops.find((l) => !l.top && l.kind !== 'group' && l.kind !== 'walkin') ?? loops[0];
    // Playground sits in the open ground just outside a lower loop, toward the water.
    features.playground = { x: host.cx - host.rx - 34, y: Math.min(host.cy + 62, LAKE_Y - 46) };
  }
  const sites = layoutSites(loops, specs, {
    cgId: base.id,
    shadePct: base.shadePct,
    avail,
    priceMin: base.priceMin,
    priceMax: base.priceMax,
    hasLake,
    features,
  }, r);
  const openAll = sites.filter((s) => s.open.every(Boolean)).length;
  const openAny = sites.filter((s) => s.open.some(Boolean)).length;
  const siteTypes = Array.from(new Set(sites.map((s) => s.type)));
  return {
    ...base,
    loops,
    sites,
    features,
    totalSites: sites.length,
    openAll,
    openAny,
    openPct: Math.round((openAny / sites.length) * 100),
    siteTypes,
  };
}

// ---------- Hand-built campgrounds (Renee's saved ones) ----------

function pineHollow(): Campground {
  const r = mulberry32(1401);
  const specs: LoopSpec[] = [
    { id: 'A', kind: 'tent', count: 30, slot: 'lakeLeft', restrooms: 2, shadeBias: 0, desc: 'Lakeside tent loop · 2-min walk to the swim beach' },
    { id: 'B', kind: 'mixed', count: 32, slot: 'lakeRight', restrooms: 2, shadeBias: -0.05, desc: 'Lakeside · tents and small trailers' },
    { id: 'C', kind: 'rv', count: 34, slot: 'topRight', restrooms: 2, generators: true, shadeBias: -0.3, desc: 'RV loop with hookups · generators allowed in set hours' },
    { id: 'D', kind: 'tent', count: 28, slot: 'topLeft', restrooms: 1, shadeBias: 0.22, desc: 'Upper pines · tents only · deepest shade, dead-end loop' },
    { id: 'W', kind: 'walkin', count: 12, restrooms: 0, desc: 'Walk-in sites on the water · carry gear from the lot' },
    { id: 'G', kind: 'group', count: 4, slot: 'topCenter', restrooms: 1, desc: 'Group sites for 25–40 people' },
  ];
  const cg = assemble(
    {
      id: 'pine-hollow',
      name: 'Pine Hollow Lakeside',
      operator: 'State park',
      region: 'Gold Country lakes',
      driveMin: 100,
      priceMin: 35,
      priceMax: 65,
      amenities: { flushToilets: true, showers: true, potableWater: true, playground: true, lakeAccess: true, campStore: true },
      water: { kind: 'Reservoir', name: 'Pine Hollow Reservoir', swim: 'Roped-off swim beach, shallow and sandy. No lifeguard.' },
      generator: { policy: 'limited', text: 'Only in Loop C (RV loop), 8–10 am and 4–8 pm. Not allowed in tent loops.' },
      quietHours: '10 pm – 6 am',
      rating: 4.5,
      reviewCount: 1284,
      shadePct: 68,
      bikeNote: 'Paved loops, 15 mph limit. Loop D is a dead end with little traffic.',
      showerNote: 'Coin showers, 25¢ for 2 minutes. One building per loop.',
      elevationFt: 1850,
      blurb: 'Big pine-shaded state park on a quiet reservoir. Sandy swim beach, junior ranger talks on Saturdays, and paved loops that kids bike all day.',
      mentions: [
        { label: 'Clean, hot showers', count: 31, tone: 'good' },
        { label: 'Swim beach is great for kids', count: 26, tone: 'good' },
        { label: 'Kids bike the paved loops', count: 18, tone: 'good' },
        { label: 'Mosquitoes in late May', count: 14, tone: 'warn' },
        { label: 'Loop C is loud', count: 9, tone: 'warn' },
      ],
      reviews: [
        { author: 'Marisol T.', date: 'Jun 2026', stars: 4, party: 'Family of 5', text: 'Came the last weekend of May. Mosquitoes in late May were no joke near the lake loops, so bring repellent and maybe a screen tent. Otherwise perfect: the kids biked the paved loop for hours.' },
        { author: 'Kevin O.', date: 'Aug 2026', stars: 3, party: 'Couple', text: 'Loop C is loud. RV generators right up to 8 pm and one group playing music past quiet hours. Loop D is much quieter and shadier if you are in a tent.' },
        { author: 'Priya S.', date: 'Jul 2026', stars: 5, party: 'Family of 4', text: 'Showers are coin-op (25¢ for 2 min) but clean and hot. The beach is roped off and shallow, and our 5-year-old loved it.' },
        { author: 'Jordan L.', date: 'Sep 2026', stars: 5, party: 'Family of 3', text: 'Our site in loop A was steps from the bathroom, which was great at 2 am with a potty-training toddler. Lights from the building were a little bright, though.' },
        { author: 'Dana R.', date: 'Jun 2026', stars: 4, party: 'Friends', text: 'Walk-in sites are gorgeous, right on the water, but it is a real haul with a cooler. Bring a wagon.' },
        { author: 'Ben H.', date: 'Oct 2026', stars: 5, party: 'Family of 4', text: 'Friendly rangers, junior ranger program on Saturdays. Book early: holiday weekends fill fast.' },
      ],
      seed: 14,
    },
    specs,
    0.21,
    r,
  );
  return cg;
}

function cedarFlat(): Campground {
  const r = mulberry32(2202);
  const specs: LoopSpec[] = [
    { id: 'A', kind: 'tent', count: 22, slot: 'lakeLeft', restrooms: 1, shadeBias: 0.1, desc: 'Riverside tent loop · next to the swimming hole' },
    { id: 'B', kind: 'mixed', count: 24, slot: 'topLeft', restrooms: 1, shadeBias: 0.05, desc: 'Cedar grove · tents and trailers' },
    { id: 'C', kind: 'rv', count: 18, slot: 'topRight', restrooms: 1, shadeBias: -0.1, desc: 'Full-hookup RV sites · no generators needed' },
  ];
  return assemble(
    {
      id: 'cedar-flat',
      name: 'Cedar Flat Family Camp',
      operator: 'Private',
      region: 'American River canyon',
      driveMin: 135,
      priceMin: 48,
      priceMax: 95,
      amenities: { flushToilets: true, showers: true, potableWater: true, playground: true, lakeAccess: true, campStore: true },
      water: { kind: 'River', name: 'South Fork swimming hole', swim: 'Calm river swimming hole with a gravel beach, plus a heated pool (open 10 am – 6 pm).' },
      generator: { policy: 'none', text: 'No generators anywhere. RV sites have electric hookups instead.' },
      quietHours: '9 pm – 8 am',
      rating: 4.7,
      reviewCount: 436,
      shadePct: 78,
      bikeNote: 'Gravel-and-paved kids’ bike loop, 5 mph camp speed limit.',
      showerNote: 'Free hot showers, cleaned twice a day.',
      elevationFt: 2600,
      blurb: 'Family-run camp under big incense cedars. Free showers, a heated pool, a river swimming hole and Saturday-night s’mores at the store.',
      mentions: [
        { label: 'Free hot showers', count: 22, tone: 'good' },
        { label: 'Pool plus river swimming', count: 19, tone: 'good' },
        { label: 'Really quiet at night', count: 15, tone: 'good' },
        { label: 'Pricier than state parks', count: 11, tone: 'warn' },
        { label: 'Some sites close together', count: 7, tone: 'warn' },
      ],
      reviews: [
        { author: 'Alicia M.', date: 'Aug 2026', stars: 5, party: 'Family of 4', text: 'First time camping with our kids and it was the right call. Quiet hours start at 9 and they actually enforce them. Free showers were spotless.' },
        { author: 'Tom W.', date: 'Jul 2026', stars: 4, party: 'Family of 5', text: 'More expensive than the state parks but you get a pool and a really calm swimming hole. Sites in loop B are a little close together.' },
        { author: 'Grace K.', date: 'May 2026', stars: 5, party: 'Family of 4', text: 'Memorial Day was full but never felt rowdy. Kids rode bikes around the loop until dark.' },
        { author: 'Luis P.', date: 'Sep 2026', stars: 4, party: 'Couple', text: 'No generators is a huge plus. Camp store has firewood, ice and s’mores kits.' },
      ],
      seed: 22,
    },
    specs,
    0.22,
    r,
  );
}

function manzanitaShores(): Campground {
  const r = mulberry32(3303);
  const specs: LoopSpec[] = [
    { id: 'A', kind: 'mixed', count: 30, slot: 'lakeLeft', restrooms: 2, shadeBias: -0.1, generators: true, desc: 'Lakefront · tents and RVs' },
    { id: 'B', kind: 'tent', count: 26, slot: 'lakeRight', restrooms: 1, shadeBias: 0.05, generators: true, desc: 'Tent loop near the boat ramp' },
    { id: 'C', kind: 'rv', count: 28, slot: 'topRight', restrooms: 1, generators: true, shadeBias: -0.2, desc: 'RV loop · generators 8 am – 8 pm' },
    { id: 'W', kind: 'walkin', count: 8, restrooms: 0, desc: 'Walk-in sites on the point · carry gear from the lot' },
  ];
  return assemble(
    {
      id: 'manzanita-shores',
      name: 'Manzanita Shores',
      operator: 'County park',
      region: 'Sierra foothills',
      driveMin: 65,
      priceMin: 32,
      priceMax: 58,
      amenities: { flushToilets: true, showers: true, potableWater: true, playground: false, lakeAccess: true, campStore: true },
      water: { kind: 'Lake', name: 'Manzanita Lake', swim: 'Open beach next to the boat ramp. Water warms up by June.' },
      generator: { policy: 'limited', text: 'Allowed 8 am – 8 pm in all loops.' },
      quietHours: '10 pm – 7 am',
      rating: 4.1,
      reviewCount: 692,
      shadePct: 52,
      bikeNote: 'Paved main road; loops are short.',
      showerNote: 'Free showers, one building. Lines on weekend mornings.',
      elevationFt: 1200,
      blurb: 'Close-in county park on a busy little lake. Easy drive, a decent beach and boat rentals; shade is patchy.',
      mentions: [
        { label: 'Lake beach and boat rentals', count: 20, tone: 'good' },
        { label: 'Easy drive from Sacramento', count: 14, tone: 'good' },
        { label: 'Not much shade', count: 16, tone: 'warn' },
        { label: 'Mosquitoes in late May', count: 9, tone: 'warn' },
        { label: 'Shower lines on weekend mornings', count: 8, tone: 'warn' },
      ],
      reviews: [
        { author: 'Rachel D.', date: 'Jun 2026', stars: 4, party: 'Family of 4', text: 'Only an hour from home, which is great with kids. Get a site in loop B if you want any shade at all.' },
        { author: 'Sam N.', date: 'May 2026', stars: 3, party: 'Family of 3', text: 'Mosquitoes in late May were bad at dusk. Showers had a line at 8 am Saturday.' },
        { author: 'Hannah B.', date: 'Aug 2026', stars: 5, party: 'Friends', text: 'Rented a kayak right from the beach. Clean bathrooms.' },
      ],
      seed: 33,
    },
    specs,
    0.3,
    r,
  );
}

// ---------- Generated campgrounds ----------
const FIRST = [
  'Granite', 'Black Oak', 'Sugar Pine', 'Willow', 'Alder', 'Aspen', 'Juniper', 'Quail', 'Coyote', 'Elk', 'Fern',
  'Lupine', 'Madrone', 'Buckeye', 'Bluejay', 'Osprey', 'Heron', 'Fox', 'Badger', 'Silver', 'Hidden', 'Sunset', 'Deer',
  'Bear', 'Red Fir', 'White Oak', 'Live Oak', 'Tamarack', 'Dogwood', 'Laurel', 'Spruce', 'Sycamore', 'Cottonwood',
  'Golden', 'Kingfisher', 'Otter', 'Beaver', 'Wren', 'Larkspur', 'Yarrow', 'Cascade', 'Mossy', 'Echo', 'Twin Pines',
  'Ponderosa', 'Bitterbrush', 'Mule Deer', 'Steelhead', 'Rainbow', 'Lone Pine', 'Shady', 'Indigo', 'Bramble', 'Thimbleberry',
];
const SECOND = [
  'Hollow', 'Flat', 'Creek', 'Meadow', 'Point', 'Cove', 'Springs', 'Ridge', 'Bar', 'Bend', 'Grove', 'Landing', 'Shores',
  'Canyon', 'Basin', 'Gulch', 'Narrows', 'Knoll', 'Glen', 'Crossing', 'Valley',
];
const REGIONS: { name: string; drive: [number, number] }[] = [
  { name: 'Sacramento River Delta', drive: [30, 70] },
  { name: 'American River canyon', drive: [45, 120] },
  { name: 'Sierra foothills', drive: [45, 110] },
  { name: 'Gold Country lakes', drive: [60, 120] },
  { name: 'Lake Tahoe', drive: [110, 170] },
  { name: 'Yuba River', drive: [70, 130] },
  { name: 'Feather River', drive: [90, 160] },
  { name: 'Clear Lake area', drive: [110, 160] },
  { name: 'Napa & Sonoma', drive: [70, 120] },
  { name: 'Russian River', drive: [120, 170] },
  { name: 'Stanislaus forest', drive: [120, 180] },
  { name: 'Bay Area hills', drive: [80, 140] },
  { name: 'Sonoma coast', drive: [140, 180] },
];
const FIRST_NAMES = ['Maya', 'Chris', 'Ana', 'Derek', 'Lena', 'Omar', 'Julie', 'Wes', 'Tasha', 'Nate', 'Rosa', 'Eli', 'Kim', 'Paul', 'Ines', 'Theo', 'Carmen', 'Raj', 'Molly', 'Andre'];
const MONTHS = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'];

function generated(i: number, used: Set<string>): Campground {
  const r = mulberry32(9000 + i * 7919);
  let name = '';
  while (!name || used.has(name)) {
    name = `${pick(r, FIRST)} ${pick(r, SECOND)}`;
  }
  used.add(name);
  const opRoll = r();
  const operator: Operator =
    opRoll < 0.26 ? 'National forest' : opRoll < 0.46 ? 'Private' : opRoll < 0.64 ? 'State park' : opRoll < 0.8 ? 'County park' : opRoll < 0.9 ? 'Regional park' : 'State recreation area';
  const region = pick(r, REGIONS);
  const driveMin = Math.min(180, Math.round(between(r, region.drive[0], region.drive[1]) / 5) * 5);
  const developed = operator === 'National forest' ? r() < 0.32 : r() < 0.62;
  const flush = developed ? r() < 0.96 : r() < 0.12;
  const showers = flush && (developed ? r() < 0.78 : r() < 0.1);
  const waterRoll = r();
  const water: WaterBody | null =
    waterRoll < 0.34
      ? { kind: 'Lake', name: `${name.split(' ')[0]} Lake`, swim: pick(r, ['Small sandy beach, no lifeguard.', 'Rocky shoreline; water shoes help.', 'Swim area roped off in summer.']) }
      : waterRoll < 0.46
        ? { kind: 'Reservoir', name: `${name.split(' ')[0]} Reservoir`, swim: pick(r, ['Swim beach near the day-use area.', 'Steep banks; swim from the beach only.']) }
        : waterRoll < 0.6
          ? { kind: 'River', name: `${region.name.split(' ')[0]} River`, swim: pick(r, ['Calm pools in summer; fast in spring runoff.', 'Gravel bar swimming hole.']) }
          : null;
  const lakeAccess = !!water && (water.kind !== 'River' || r() < 0.7);
  const shadePct = Math.round(between(r, 15, 92));
  const genRoll = r();
  const policy: GenPolicy = operator === 'Private' ? (genRoll < 0.55 ? 'none' : genRoll < 0.9 ? 'limited' : 'allowed') : genRoll < 0.22 ? 'none' : genRoll < 0.72 ? 'limited' : 'allowed';
  const genText =
    policy === 'none'
      ? 'No generators allowed.'
      : policy === 'limited'
        ? pick(r, ['Allowed 8 am – 8 pm.', 'Allowed 8–10 am and 5–8 pm.', 'Only in RV loops, 8 am – 8 pm.', 'Allowed 7 am – 9 pm.'])
        : 'Allowed any time outside quiet hours.';
  const bike = developed && r() < 0.68;
  const priceMin = Math.max(28, Math.round(between(r, developed ? 30 : 28, operator === 'Private' ? 62 : 46)));
  const priceMax = Math.min(95, priceMin + Math.round(between(r, 6, 42)));
  const rating = Math.round(between(r, 3.4, 4.9) * 10) / 10;
  const reviewCount = Math.round(Math.pow(r(), 2) * 1600 + 14);
  const total = Math.round(between(r, 18, 170));
  const avail = between(r, 0.08, 0.36);

  // Loop plan
  const specs: LoopSpec[] = [];
  let remaining = total;
  const hasWalkin = r() < 0.28 && total > 30;
  const hasGroup = r() < 0.3 && total > 40;
  const walkN = hasWalkin ? intBetween(r, 5, 12) : 0;
  const groupN = hasGroup ? intBetween(r, 2, 4) : 0;
  remaining -= walkN + groupN;
  const nLoops = Math.max(1, Math.min(hasGroup ? 4 : 5, Math.round(remaining / 30)));
  const slotsOrder: SlotName[] = water
    ? ['lakeLeft', 'lakeRight', 'topLeft', 'topRight', 'topCenter']
    : ['topLeft', 'lakeLeft', 'topRight', 'lakeRight', 'topCenter'];
  const usableSlots = hasGroup ? slotsOrder.filter((s) => s !== 'topCenter') : slotsOrder;
  const kinds: LoopKind[] = [];
  for (let k = 0; k < nLoops; k++) kinds.push(k === nLoops - 1 && nLoops > 1 ? 'rv' : k === 0 ? 'tent' : pick(r, ['tent', 'mixed', 'mixed', 'rv'] as LoopKind[]));
  const per = Math.floor(remaining / nLoops);
  kinds.forEach((kind, k) => {
    const count = k === nLoops - 1 ? remaining - per * (nLoops - 1) : per;
    specs.push({
      id: String.fromCharCode(65 + k),
      kind,
      count: Math.min(40, count),
      slot: usableSlots[k],
      restrooms: count >= 26 ? 2 : 1,
      generators: policy !== 'none' && (genText.includes('RV loops') ? kind === 'rv' : true),
      shadeBias: kind === 'rv' ? -0.2 : between(r, -0.08, 0.15),
    });
  });
  if (hasWalkin) specs.push({ id: 'W', kind: 'walkin', count: walkN, restrooms: 0 });
  if (hasGroup) specs.push({ id: 'G', kind: 'group', count: groupN, slot: 'topCenter', restrooms: 1 });

  const amenities: Amenities = {
    flushToilets: flush,
    showers,
    potableWater: developed || r() < 0.4,
    playground: developed && r() < 0.45,
    lakeAccess,
    campStore: developed && r() < 0.5,
  };

  // Mentions
  const mentions: Mention[] = [];
  const m = (label: string, tone: 'good' | 'warn') => mentions.push({ label, count: intBetween(r, 4, 28), tone });
  if (showers) m(pick(r, ['Clean showers', 'Hot showers', 'Showers are well kept']), 'good');
  if (!flush) m('Vault toilets only', 'warn');
  if (lakeAccess) m(pick(r, ['Nice swimming', 'Kids loved the beach', 'Easy water access']), 'good');
  if (shadePct > 65) m('Lots of shade', 'good');
  if (shadePct < 35) m('Hot, little shade', 'warn');
  if (water && r() < 0.5) m('Mosquitoes in late May', 'warn');
  if (policy === 'allowed') m('Generator noise', 'warn');
  if (bike) m('Good for kids on bikes', 'good');
  if (rating < 3.8) m(pick(r, ['Bathrooms need work', 'Sites are close together', 'Road noise at night']), 'warn');
  if (rating >= 4.5) m(pick(r, ['Friendly hosts', 'Beautiful sites', 'Very quiet']), 'good');
  mentions.sort((a, b) => b.count - a.count);

  const reviews: Review[] = mentions.slice(0, 3).map((mm, k) => ({
    author: `${pick(r, FIRST_NAMES)} ${String.fromCharCode(65 + intBetween(r, 0, 25))}.`,
    date: pick(r, MONTHS),
    stars: Math.max(2, Math.min(5, Math.round(rating + (mm.tone === 'warn' ? -1 : 0.3) + (k === 2 ? 0.4 : 0)))),
    party: pick(r, ['Family of 4', 'Family of 3', 'Couple', 'Friends', 'Family of 5']),
    text:
      mm.tone === 'good'
        ? `${mm.label}. ${pick(r, ['We would come back.', 'Booked again for next summer.', 'Great spot for a long weekend.', 'Exactly what we hoped for.'])}`
        : `${mm.label}. ${pick(r, ['Otherwise a fine stay.', 'Plan around it.', 'Pick your site carefully.', 'Not a dealbreaker for us.'])}`,
  }));

  const id = name.toLowerCase().replace(/[^a-z]+/g, '-');
  const suffix = operator === 'Private' ? pick(r, ['Family Camp', 'Campground', 'RV & Tent Park', 'Camp Resort']) : pick(r, ['Campground', 'Campground', 'Lakeside', 'Recreation Area']);
  const fullName = `${name} ${water || suffix !== 'Lakeside' ? suffix : 'Campground'}`;

  return assemble(
    {
      id: `${id}-${i}`,
      name: fullName,
      operator,
      region: region.name,
      driveMin,
      priceMin,
      priceMax,
      amenities,
      water,
      generator: { policy, text: genText },
      quietHours: pick(r, ['10 pm – 6 am', '10 pm – 7 am', '10 pm – 8 am', '9 pm – 7 am']),
      rating,
      reviewCount,
      shadePct,
      bikeNote: bike ? pick(r, ['Paved loops, low traffic.', 'Paved roads, 10 mph limit.', 'Flat paved loops.']) : null,
      showerNote: showers ? pick(r, ['Coin showers.', 'Free hot showers.', 'Showers in the main restroom building.']) : null,
      elevationFt: Math.round(between(r, 50, 6400) / 50) * 50,
      blurb: `${developed ? 'Developed' : 'Rustic'} ${operator.toLowerCase()} campground in the ${region.name} area${water ? `, on ${water.name}` : ''}.`,
      mentions,
      reviews,
      seed: i + 40,
    },
    specs,
    avail,
    r,
  );
}

function buildAll(): Campground[] {
  const hand = [pineHollow(), cedarFlat(), manzanitaShores()];
  const used = new Set<string>(['Pine Hollow', 'Cedar Flat', 'Manzanita Shores']);
  const list: Campground[] = [...hand];
  for (let i = 0; list.length < 338; i++) list.push(generated(i, used));
  return list;
}

export const CAMPGROUNDS: Campground[] = buildAll();
export const CG_BY_ID: Record<string, Campground> = Object.fromEntries(CAMPGROUNDS.map((c) => [c.id, c]));

export const GLOSSARY: Record<string, { term: string; def: string }> = {
  'walk-in': {
    term: 'Walk-in site',
    def: 'You park in a shared lot and carry your gear to the site on a short path. Quieter and often prettier, but plan on several trips with a cooler and kids’ stuff (a wagon helps).',
  },
  primitive: {
    term: 'Primitive',
    def: 'Few or no facilities: no running water, and a vault (pit) toilet or none at all. Pitchfinder hides these when you ask for flush toilets.',
  },
  vault: {
    term: 'Vault toilet',
    def: 'A non-flushing toilet over a sealed tank. Usually clean enough, but no sinks or running water.',
  },
  hookups: {
    term: 'Hookups',
    def: 'Electric, water or sewer connections for RVs. You don’t need them with a tent.',
  },
  loop: {
    term: 'Loop',
    def: 'Campgrounds are split into loops: a one-way road lined with sites, usually with its own restroom. Different loops can feel very different (quiet vs. busy, shady vs. sunny).',
  },
  generator: {
    term: 'Generator hours',
    def: 'When RV campers may run gas generators for power. They hum loudly, so tent campers usually want to be far from loops that allow them.',
  },
  quiet: {
    term: 'Quiet hours',
    def: 'Overnight hours when campers must keep noise down. Hosts or rangers enforce them.',
  },
  potable: {
    term: 'Potable water',
    def: 'Drinkable tap water from spigots around the campground.',
  },
  tentpad: {
    term: 'Tent pad',
    def: 'A flat, cleared spot for your tent. A typical 4-person tent is about 8 × 7 ft, so a 10 × 12 ft pad or bigger fits it.',
  },
  rv: {
    term: 'RV site',
    def: 'A paved or gravel pad sized for a motorhome or trailer, often with hookups. Some allow a tent alongside; some don’t have a flat spot for one.',
  },
  group: {
    term: 'Group site',
    def: 'A big site for 25 or more people, priced for a crowd. Not worth it for one family.',
  },
};
