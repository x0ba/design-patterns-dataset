// Generates src/data/specimens.json: a deterministic mock dataset for the
// Penstemon sheets in the lobby kiosk. Run with `npm run generate-data`.
//
// Fixed facts the kiosk relies on (checked at the end of this script):
//   - 312 Penstemon sheets across 14 species (by current name)
//   - 47 sheets from Lane County
//   - Lane County dates span 1898-2019
//   - 3 sheets on loan and not imaged
//   - the 1938 Detling sheet (OSU-V-118204) and the 1952 Callow sheet that
//     was once determined as P. rattanii (OSU-V-103562) are both inside the
//     ten-mile, spring window around Coyote Hollow.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '..', 'src', 'data');
const OUT_FILE = join(OUT_DIR, 'specimens.json');

const PRESERVE = { lat: 44.0213, lon: -123.0446 };
const SEED = 20261117;

// ---------- deterministic randomness ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const between = (lo, hi) => lo + (hi - lo) * rand();
const intBetween = (lo, hi) => Math.floor(between(lo, hi + 1));
const choose = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function weighted(items) {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = rand() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------- counts that the kiosk must reproduce ----------
// total = sheets whose CURRENT name is this species (all counties)
// lane  = of those, sheets from Lane County
// old   = plausible superseded names used for re-identified sheets
const SPECIES = [
  { epithet: 'cardwellii', total: 39, lane: 7, old: ['serrulatus', 'gracilis'] },
  { epithet: 'serrulatus', total: 41, lane: 9, old: ['gracilis', 'cardwellii', 'procerus'] },
  { epithet: 'rattanii', total: 13, lane: 0, old: ['serrulatus', 'gracilis'] },
  { epithet: 'procerus', total: 22, lane: 4, old: ['gracilis', 'confertus'] },
  { epithet: 'richardsonii', total: 18, lane: 2, old: ['gracilis', 'deustus'] },
  { epithet: 'deustus', total: 19, lane: 0, old: ['richardsonii', 'gracilis'] },
  { epithet: 'davidsonii', total: 17, lane: 3, old: ['gracilis', 'ovatus'] },
  { epithet: 'confertus', total: 24, lane: 4, old: ['procerus', 'gracilis'] },
  { epithet: 'wilcoxii', total: 15, lane: 1, old: ['gracilis', 'laetus'] },
  { epithet: 'laetus', total: 20, lane: 3, old: ['digitalis', 'gracilis'] },
  { epithet: 'digitalis', total: 25, lane: 5, old: ['laetus', 'gracilis'] },
  { epithet: 'nemorosus', total: 16, lane: 2, old: ['gracilis', 'ovatus'] },
  { epithet: 'ovatus', total: 27, lane: 5, old: ['nemorosus', 'gracilis'] },
  { epithet: 'fruticosus', total: 16, lane: 2, old: ['gracilis', 'richardsonii'] },
];

const COLLECTORS = [
  'H. M. Calder', 'E. P. Sayre', 'R. E. Callow', 'A. Lindqvist', 'N. Varga',
  'C. J. Whitcombe', 'P. Auclair', 'D. Okonkwo-Reyes', 'M. A. Hollister',
  'T. W. Brandvold', 'S. K. Ishida', 'G. F. Lattimer', 'W. R. Ostrander',
  'B. L. Quiring', 'F. Mirabal', 'K. L. Vance', 'I. Halvorsen', 'O. M. Desrosiers',
  'V. T. Nakamura', 'A. J. Penrose', 'L. E. Detling', 'J. S. Teague', 'M. Tallent',
  'E. Rasmussen', 'Q. Ferreira', 'D. H. Ambler',
];
const DETERMINERS = ['J. S. Teague', 'A. Lindqvist', 'S. K. Ishida', 'W. R. Ostrander', 'N. Varga', 'K. L. Vance'];

const CONDITIONS = [
  'Complete specimen, leaves and flowers intact.',
  'Fragmentary: one flowering stem with basal leaves.',
  'Good condition. Minor insect damage to lower leaves.',
  'Flowers largely dropped; seed capsules present.',
  'Mounted on archival board. Label typed and taped at left edge.',
  'Brittle. Several flowers detached and kept in a packet.',
  'Good. Some fading of corolla color.',
  'Mold damage on lower stem; upper specimen sound.',
  'Stem broken in two and rejoined with reinforcement strips.',
  'Excellent. Full inflorescence and roots present.',
];

// Localities. Distances from the preserve decide which are "near".
const LANE_LOCALITIES = [
  { name: 'Coyote Hollow, oak savanna by creek', county: 'Lane', lat: 44.0206, lon: -123.0462, elev: 1120, habitat: 'Oak savanna, seasonally wet swale', weight: 3 },
  { name: 'Coyote Hollow, grassy bench above road', county: 'Lane', lat: 44.0240, lon: -123.0431, elev: 1180, habitat: 'Grassland with scattered Oregon white oak', weight: 2 },
  { name: 'Spencer Butte, north slope', county: 'Lane', lat: 43.9975, lon: -123.0575, elev: 1040, habitat: 'Open rock outcrop, shallow soil', weight: 2 },
  { name: "Skinner's Butte, Eugene", county: 'Lane', lat: 44.0590, lon: -123.0880, elev: 680, habitat: 'Basalt knob, mixed oak and grass', weight: 2 },
  { name: 'Mount Pisgah, lower trail', county: 'Lane', lat: 43.9960, lon: -122.8890, elev: 1400, habitat: 'Forest edge over basalt talus', weight: 1 },
  { name: 'Amazon Creek, Eugene', county: 'Lane', lat: 44.0275, lon: -123.1020, elev: 430, habitat: 'Riparian edge, ash and willow bottom', weight: 1 },
  { name: 'Fern Ridge Reservoir, Perkins Peninsula', county: 'Lane', lat: 44.0176, lon: -123.0964, elev: 380, habitat: 'Reservoir shoreline, sandy disturbed ground', weight: 1 },
  { name: 'Hendricks Park, Eugene', county: 'Lane', lat: 44.0427, lon: -123.0934, elev: 720, habitat: 'Dry oak woodland with rock outcrops', weight: 1 },
  { name: 'Creswell, Ferry Creek bottoms', county: 'Lane', lat: 43.9227, lon: -122.9263, elev: 530, habitat: 'Wet meadow edge along fence line', weight: 1 },
  { name: 'Coburg Hills, south-facing bank', county: 'Lane', lat: 44.1310, lon: -123.0395, elev: 620, habitat: 'Shrubby bank at Douglas-fir edge', weight: 1 },
  { name: 'Armitage Park, Springfield', county: 'Lane', lat: 44.0520, lon: -122.9980, elev: 470, habitat: 'Mowed margin of oak-ash woodland', weight: 1 },
  { name: 'Cottage Grove, Row River road', county: 'Lane', lat: 43.7975, lon: -123.0580, elev: 560, habitat: 'Roadcut at conifer edge', weight: 2 },
  { name: 'Lorane, Mosby Creek', county: 'Lane', lat: 43.9100, lon: -123.3330, elev: 720, habitat: 'Creek bank in Oregon white oak woodland', weight: 1 },
  { name: 'Veneta, Fern Ridge outlet', county: 'Lane', lat: 44.0470, lon: -123.3600, elev: 420, habitat: 'Pasture edge, seasonally flooded', weight: 1 },
  { name: 'Junction City, Long Tom River', county: 'Lane', lat: 44.2170, lon: -123.2040, elev: 380, habitat: 'Gravel bar margin', weight: 1 },
  { name: 'Oakridge, Willamette Pass road', county: 'Lane', lat: 43.7518, lon: -122.5121, elev: 2100, habitat: 'Montane forest opening, roadside', weight: 2 },
  { name: 'McKenzie Bridge, river terrace', county: 'Lane', lat: 44.1846, lon: -122.1606, elev: 1420, habitat: 'Open gravel terrace under ponderosa pine', weight: 2 },
  { name: 'Blue River, Quentin Creek', county: 'Lane', lat: 44.1820, lon: -122.3290, elev: 1350, habitat: 'Burned clearcut edge', weight: 1 },
  { name: 'Florence, Siuslaw dunes', county: 'Lane', lat: 43.9826, lon: -124.1000, elev: 60, habitat: 'Sand dune hollow with shore pine', weight: 1 },
  { name: 'Triangle Lake, forest road', county: 'Lane', lat: 44.0240, lon: -123.4000, elev: 1020, habitat: 'Forest road cut, moist', weight: 1 },
];

const OTHER_LOCALITIES = [
  { name: 'Newberry Crater, Paulina Lake road', county: 'Deschutes', lat: 43.7050, lon: -121.2920, elev: 5600, habitat: 'Pumice flat under lodgepole pine' },
  { name: 'Tumalo Falls trailhead', county: 'Deschutes', lat: 44.0490, lon: -121.6520, elev: 4200, habitat: 'Rocky slope in mixed conifer' },
  { name: 'Crater Lake rim, Discovery Point', county: 'Klamath', lat: 42.9130, lon: -122.1270, elev: 7200, habitat: 'Rim rock, subalpine' },
  { name: 'Fort Klamath, Sun Creek', county: 'Klamath', lat: 42.6280, lon: -122.0300, elev: 4700, habitat: 'Wet meadow edge' },
  { name: 'Diamond Peak, Umpqua National Forest', county: 'Douglas', lat: 43.5470, lon: -122.1450, elev: 5800, habitat: 'Open slope at red fir edge' },
  { name: 'Foster Reservoir shoreline', county: 'Linn', lat: 44.4010, lon: -122.6350, elev: 720, habitat: 'Reservoir gravel, disturbed bank' },
  { name: 'Dimple Hill, Corvallis', county: 'Benton', lat: 44.5710, lon: -123.3210, elev: 480, habitat: 'Dry grassland with oak' },
  { name: 'Mount Ashland, ski area road', county: 'Jackson', lat: 42.0770, lon: -122.7100, elev: 6300, habitat: 'Roadside, mixed conifer' },
  { name: 'Illinois River canyon, Oak Flat', county: 'Josephine', lat: 42.3040, lon: -123.9470, elev: 1100, habitat: 'Serpentine outcrop' },
  { name: 'Forest Park, Balch Creek', county: 'Multnomah', lat: 45.5680, lon: -122.7750, elev: 700, habitat: 'Shaded trail edge, second-growth fir' },
  { name: 'Timberline Lodge meadow', county: 'Clackamas', lat: 45.3320, lon: -121.7090, elev: 6000, habitat: 'Subalpine meadow' },
  { name: 'Yaquina Head, headland', county: 'Lincoln', lat: 44.6740, lon: -124.0790, elev: 150, habitat: 'Coastal bluff, grass' },
  { name: 'Lost Lake, forest margin', county: 'Hood River', lat: 45.4060, lon: -121.8980, elev: 3000, habitat: 'Forest margin, moist' },
  { name: 'Mosier, Rowena bluff', county: 'Wasco', lat: 45.6320, lon: -121.2470, elev: 900, habitat: 'Basalt bluff, dry' },
  { name: 'Steens Mountain, Kiger Gorge', county: 'Harney', lat: 42.6100, lon: -118.7300, elev: 6400, habitat: 'Rocky canyon wall' },
  { name: 'Hart Mountain, Warner Peak road', county: 'Lake', lat: 42.3720, lon: -119.8020, elev: 7000, habitat: 'Sagebrush steppe edge' },
  { name: 'Anthony Lakes road', county: 'Baker', lat: 44.8880, lon: -118.2220, elev: 7000, habitat: 'Subalpine talus' },
  { name: 'Wallowa Lake meadow', county: 'Wallowa', lat: 45.2470, lon: -117.2000, elev: 4400, habitat: 'Moist meadow' },
  { name: 'Ladd Canyon roadcut', county: 'Union', lat: 45.0300, lon: -117.9700, elev: 3500, habitat: 'Roadcut, dry grass' },
  { name: 'Sunset Bay, dune margin', county: 'Coos', lat: 43.3380, lon: -124.2310, elev: 90, habitat: 'Dune margin, sandy' },
  { name: 'Chetco Bar, Brookings', county: 'Curry', lat: 42.0430, lon: -124.0250, elev: 240, habitat: 'Serpentine ridge' },
  { name: 'Cove Palisades, rim rock', county: 'Jefferson', lat: 44.6250, lon: -121.1710, elev: 2300, habitat: 'Basalt rim rock' },
  { name: 'Detroit Lake, Breitenbush road', county: 'Marion', lat: 44.7410, lon: -122.1500, elev: 1600, habitat: 'Roadside, conifer edge' },
  { name: 'Baker Creek, McMinnville', county: 'Yamhill', lat: 45.2280, lon: -123.2190, elev: 380, habitat: 'Creek bank, oak' },
  { name: 'Oswald West State Park', county: 'Tillamook', lat: 45.5600, lon: -123.9600, elev: 120, habitat: 'Coastal forest edge' },
  { name: 'Ochoco Pass, roadside', county: 'Crook', lat: 44.3040, lon: -120.2000, elev: 4700, habitat: 'Roadside, ponderosa pine' },
  { name: 'Strawberry Mountains, Slide Creek', county: 'Grant', lat: 44.2450, lon: -118.7220, elev: 5600, habitat: 'Open slope, mixed conifer' },
];

const HANDCRAFTED_CATALOGS = {
  coyoteHollow1938: 'OSU-V-118204',
  rattanii1952: 'OSU-V-103562',
  earliestLane1898: 'OSU-V-101187',
  latestSpring2019: 'OSU-V-166930',
};

// ---------- helpers ----------
const usedCatalog = new Set(Object.values(HANDCRAFTED_CATALOGS));
function nextCatalog() {
  for (;;) {
    const n = `OSU-V-${intBetween(100000, 199999)}`;
    if (!usedCatalog.has(n)) {
      usedCatalog.add(n);
      return n;
    }
  }
}

function phenologyFor(month) {
  if (month >= 3 && month <= 5) return chance(0.7) ? 'flowering' : 'vegetative';
  if (month >= 6 && month <= 8) return chance(0.6) ? 'fruiting' : 'flowering and fruiting';
  if (month >= 9 && month <= 11) return chance(0.7) ? 'fruiting' : 'not recorded';
  return chance(0.6) ? 'vegetative' : 'not recorded';
}

const r4 = (n) => Math.round(n * 10000) / 10000;

// ---------- hand-made records (the anchors of the demo) ----------
const handcrafted = [
  {
    catalogNumber: HANDCRAFTED_CATALOGS.coyoteHollow1938,
    determinations: [
      { name: 'Penstemon serrulatus', year: 1938, by: 'L. E. Detling', kind: 'original' },
      { name: 'Penstemon cardwellii', year: 1991, by: 'N. Varga', kind: 'annotation' },
    ],
    collector: 'L. E. Detling',
    collectorNumber: '2216',
    date: { year: 1938, month: 5, day: 14 },
    locality: 'rocky slope above Coyote Cr., 1,200 ft',
    county: 'Lane',
    latitude: 44.0231,
    longitude: -123.0418,
    uncertaintyM: 250,
    elevationFt: 1200,
    habitat: 'Rocky slope, oak-fir margin, southwest exposure',
    phenology: 'flowering',
    condition: 'Two flowering stems, leaves largely intact. Slight foxing along label margin.',
    imaged: true,
    loanNote: null,
  },
  {
    catalogNumber: HANDCRAFTED_CATALOGS.rattanii1952,
    determinations: [
      { name: 'Penstemon rattanii', year: 1952, by: 'R. E. Callow', kind: 'original' },
      { name: 'Penstemon serrulatus', year: 1976, by: 'J. S. Teague', kind: 'determination' },
    ],
    collector: 'R. E. Callow',
    collectorNumber: '0431',
    date: { year: 1952, month: 4, day: 19 },
    locality: 'Coyote Hollow, open oak slope by creek',
    county: 'Lane',
    latitude: 44.0198,
    longitude: -123.0462,
    uncertaintyM: 400,
    elevationFt: 1130,
    habitat: 'Oak woodland margin, creek bank',
    phenology: 'flowering',
    condition: 'Single flowering stem; basal leaves fragmentary. Typed label.',
    imaged: true,
    loanNote: null,
  },
  {
    catalogNumber: HANDCRAFTED_CATALOGS.earliestLane1898,
    determinations: [
      { name: 'Penstemon gracilis', year: 1898, by: 'H. M. Calder', kind: 'original' },
      { name: 'Penstemon procerus', year: 1964, by: 'A. Lindqvist', kind: 'determination' },
    ],
    collector: 'H. M. Calder',
    collectorNumber: 's.n.',
    date: { year: 1898, month: 7, day: 2 },
    locality: "Skinner's Butte, Eugene, open ground",
    county: 'Lane',
    latitude: 44.0590,
    longitude: -123.0880,
    uncertaintyM: 1200,
    elevationFt: 680,
    habitat: 'Basalt knob, mixed oak and grass',
    phenology: 'fruiting',
    condition: 'Old label in ink, partly faded. Several capsules.',
    imaged: true,
    loanNote: null,
  },
  {
    catalogNumber: HANDCRAFTED_CATALOGS.latestSpring2019,
    determinations: [
      { name: 'Penstemon laetus', year: 2019, by: 'K. L. Vance', kind: 'original' },
    ],
    collector: 'K. L. Vance',
    collectorNumber: '1184',
    date: { year: 2019, month: 4, day: 27 },
    locality: 'Spencer Butte, north slope, rock outcrop',
    county: 'Lane',
    latitude: 43.9975,
    longitude: -123.0575,
    uncertaintyM: 120,
    elevationFt: 1040,
    habitat: 'Open rock outcrop, shallow soil',
    phenology: 'flowering',
    condition: 'Complete plant with roots partly intact.',
    imaged: true,
    loanNote: null,
  },
];

// ---------- generated records ----------
function generated(epithet, loc) {
  const month = intBetween(1, 12);
  const dist = milesBetween(PRESERVE.lat, PRESERVE.lon, loc.lat, loc.lon);
  const nearSpring = loc.county === 'Lane' && dist <= 10 && month >= 3 && month <= 5;
  // Keep generated Lane sheets from disturbing the handcrafted extremes:
  // nothing before 1900, nothing after 2018, and no near spring sheet before 1940.
  let year;
  if (loc.county !== 'Lane') year = intBetween(1901, 2024);
  else if (nearSpring) year = intBetween(1940, 2018);
  else year = intBetween(1900, 2018);

  const collector = choose(COLLECTORS);
  const determinations = [];
  const spec = SPECIES.find((s) => s.epithet === epithet);
  if (chance(0.12)) {
    const oldEpithet = choose(spec.old);
    determinations.push({ name: `Penstemon ${oldEpithet}`, year, by: collector, kind: 'original' });
    determinations.push({
      name: `Penstemon ${epithet}`,
      year: Math.min(2024, year + intBetween(3, 40)),
      by: choose(DETERMINERS),
      kind: 'determination',
    });
  } else {
    determinations.push({ name: `Penstemon ${epithet}`, year, by: collector, kind: 'original' });
  }

  const catalogNumber = nextCatalog();
  const lowerNearSpring = nearSpring;
  return {
    catalogNumber,
    determinations,
    collector,
    collectorNumber: chance(0.08) ? 's.n.' : String(intBetween(1, 4800)),
    date: { year, month, day: intBetween(1, 28) },
    locality: loc.name,
    county: loc.county,
    latitude: r4(loc.lat + between(-0.0025, 0.0025)),
    longitude: r4(loc.lon + between(-0.0025, 0.0025)),
    uncertaintyM: choose([30, 60, 120, 250, 400, 800, 1500, 3000]),
    elevationFt: Math.round((loc.elev + intBetween(-40, 40)) / 10) * 10,
    habitat: loc.habitat,
    phenology: phenologyFor(month),
    condition: choose(CONDITIONS),
    imaged: true,
    loanNote: null,
    _lowerNearSpring: lowerNearSpring, // stripped before output
    _epithet: epithet,
  };
}

// ---------- assemble ----------
const laneSpecies = [];
for (const sp of SPECIES) for (let i = 0; i < sp.lane; i++) laneSpecies.push(sp.epithet);
for (const hc of ['cardwellii', 'serrulatus', 'procerus', 'laetus']) {
  laneSpecies.splice(laneSpecies.indexOf(hc), 1);
}
const otherSpecies = [];
for (const sp of SPECIES) for (let i = 0; i < sp.total - sp.lane; i++) otherSpecies.push(sp.epithet);

if (laneSpecies.length !== 43) throw new Error(`lane generated count ${laneSpecies.length}`);
if (otherSpecies.length !== 265) throw new Error(`other generated count ${otherSpecies.length}`);

const generatedLane = shuffle(laneSpecies).map((ep) => {
  const loc = weighted(LANE_LOCALITIES);
  return generated(ep, loc);
});
const generatedOther = shuffle(otherSpecies).map((ep) => {
  const loc = choose(OTHER_LOCALITIES);
  return generated(ep, loc);
});

// Historic "rattanii" names on two sheets outside Lane County: sheets that now
// read serrulatus but were first determined as P. rattanii.
let historicRattanii = 0;
for (const rec of generatedOther) {
  if (historicRattanii >= 2) break;
  if (rec._epithet !== 'serrulatus' || rec.determinations.length !== 1) continue;
  const y = rec.determinations[0].year;
  rec.determinations = [
    { name: 'Penstemon rattanii', year: y, by: rec.collector, kind: 'original' },
    { name: 'Penstemon serrulatus', year: Math.min(2024, y + 20), by: choose(DETERMINERS), kind: 'determination' },
  ];
  historicRattanii++;
}

// Three sheets on loan, not imaged: one Lane County, two elsewhere.
const farLane = (r) => milesBetween(PRESERVE.lat, PRESERVE.lon, r.latitude, r.longitude) > 10;
const loanPicks = [];
const laneLoan = generatedLane.find((r) => farLane(r) && r.date.year >= 1960);
if (!laneLoan) throw new Error('no far Lane sheet available for the loan case');
loanPicks.push(laneLoan);
for (const rec of generatedOther) {
  if (loanPicks.length >= 3) break;
  if (rec.determinations.length === 1 && rec._epithet !== 'rattanii') loanPicks.push(rec);
}
for (const rec of loanPicks) {
  rec.imaged = false;
  rec.loanNote = 'On loan to a partner institution. Not imaged; label transcription only.';
  rec.condition = 'Out on loan. Condition to be recorded on return.';
}

// Two year-only dates (no month): one Lane County, one elsewhere.
const yearOnly = [];
const laneYearOnly = generatedLane.find((r) => farLane(r) && r.date.year < 1990 && !loanPicks.includes(r));
const otherYearOnly = generatedOther.find((r) => !loanPicks.includes(r) && r.determinations.length === 1);
for (const rec of [laneYearOnly, otherYearOnly]) {
  if (!rec) continue;
  rec.date = { year: rec.date.year, month: null, day: null };
  rec.phenology = 'not recorded';
  yearOnly.push(rec);
}

// Strip private helper fields and add handcrafted sheets.
function clean(rec) {
  const { _lowerNearSpring, _epithet, ...rest } = rec;
  return rest;
}
const handcraftedClean = handcrafted;
const all = [...handcraftedClean, ...generatedLane.map(clean), ...generatedOther.map(clean)];

// Derived current name from the latest determination.
for (const rec of all) {
  const sorted = [...rec.determinations].sort((a, b) => a.year - b.year);
  rec.determinations = sorted;
  rec.currentName = sorted[sorted.length - 1].name;
}
all.sort((a, b) => a.catalogNumber.localeCompare(b.catalogNumber));

// ---------- verification ----------
const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
};

check(all.length === 312, `total ${all.length} != 312`);
const laneRecs = all.filter((r) => r.county === 'Lane');
check(laneRecs.length === 47, `lane ${laneRecs.length} != 47`);

const currentCounts = {};
for (const r of all) {
  const ep = r.currentName.split(' ')[1];
  currentCounts[ep] = (currentCounts[ep] || 0) + 1;
}
for (const sp of SPECIES) {
  check(currentCounts[sp.epithet] === sp.total, `${sp.epithet} current ${currentCounts[sp.epithet]} != ${sp.total}`);
}
check(Object.keys(currentCounts).length === 14, `species count ${Object.keys(currentCounts).length}`);

const yearOf = (r) => r.date.year;
const laneYears = laneRecs.map(yearOf);
check(Math.min(...laneYears) === 1898, `lane min year ${Math.min(...laneYears)}`);
check(Math.max(...laneYears) === 2019, `lane max year ${Math.max(...laneYears)}`);

const nearSpringLane = laneRecs.filter((r) => {
  const d = milesBetween(PRESERVE.lat, PRESERVE.lon, r.latitude, r.longitude);
  return d <= 10 && r.date.month >= 3 && r.date.month <= 5;
});
const nearSpringSorted = [...nearSpringLane].sort((a, b) => a.date.year - b.date.year || a.date.month - b.date.month);
check(nearSpringSorted[0].catalogNumber === HANDCRAFTED_CATALOGS.coyoteHollow1938, `earliest near spring is ${nearSpringSorted[0].catalogNumber}`);
check(nearSpringSorted.at(-1).catalogNumber === HANDCRAFTED_CATALOGS.latestSpring2019, `latest near spring is ${nearSpringSorted.at(-1).catalogNumber}`);

const loans = all.filter((r) => !r.imaged);
check(loans.length === 3, `loan count ${loans.length}`);
const rattaniiCurrent = all.filter((r) => r.currentName === 'Penstemon rattanii');
check(rattaniiCurrent.length === 13, `rattanii current ${rattaniiCurrent.length}`);
check(rattaniiCurrent.every((r) => r.county !== 'Lane'), 'current rattanii in Lane');
const rattaniiAnyHistory = all.filter((r) => r.determinations.some((d) => d.name === 'Penstemon rattanii'));
check(rattaniiAnyHistory.length === 16, `rattanii any-history ${rattaniiAnyHistory.length}`);
const laneRattanii = rattaniiAnyHistory.filter((r) => r.county === 'Lane');
check(laneRattanii.length === 1 && laneRattanii[0].catalogNumber === HANDCRAFTED_CATALOGS.rattanii1952, 'lane rattanii history mismatch');

const yearOnlyCount = all.filter((r) => r.date.month === null).length;
check(yearOnlyCount === 2, `year-only count ${yearOnlyCount}`);

if (failures.length) {
  console.error('Data checks failed:\n  ' + failures.join('\n  '));
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(all, null, 1) + '\n');

// ---------- summary ----------
const fmt = (r) => `${r.catalogNumber} ${r.currentName} ${r.date.year}-${r.date.month ?? '??'} ${r.collector} ${r.collectorNumber} ${r.locality}`;
console.log(`Wrote ${all.length} sheets to ${OUT_FILE}`);
console.log('Lane County:', laneRecs.length, 'years', Math.min(...laneYears), '-', Math.max(...laneYears));
console.log('Near spring Lane sheets (<=10 mi):', nearSpringSorted.length);
for (const r of nearSpringSorted) console.log('  ', fmt(r), r.imaged ? '' : '[loan]');
console.log('Rattanii current:', rattaniiCurrent.length, '| any history:', rattaniiAnyHistory.length);
console.log('On loan:', loans.map((r) => r.catalogNumber + ' ' + r.county).join(', '));
console.log('Year-only:', all.filter((r) => r.date.month === null).map((r) => r.catalogNumber + ' ' + r.county + ' ' + r.date.year).join(', '));
