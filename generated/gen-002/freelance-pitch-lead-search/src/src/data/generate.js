// Builds the mock index around the hand-written anchors.
// Deterministic (seeded), so every load shows the same articles and calls.
import { ANCHOR_ARTICLES, NAMED_CALLS } from './anchors.js';
import { OUTLETS } from './outlets.js';
import { indexArticle, matchesQuery, tokenize } from '../lib/search.js';
import { addDays, dayNum } from '../lib/dates.js';

// The search Priya ran first. Its result set is sized to the 340 she saw.
export const OPENING_QUERY = 'bee virus';
export const OPENING_TOTAL = 340;

function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261117);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const chance = (p) => rnd() < p;
const dateBetween = (start, end) => addDays(start, int(0, dayNum(end) - dayNum(start)));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const POOLS = {
  place: ['Wisconsin', 'Iowa', 'Minnesota', 'Illinois', 'Michigan', 'Ohio', 'the Upper Midwest', 'the Corn Belt', 'the Driftless', 'the Great Lakes', 'Northern California', 'the Pacific Northwest', 'Ontario', 'New England', 'the Central Valley', 'Texas', 'the Mid-Atlantic', 'Indiana', 'Missouri', 'Vermont'],
  city: ['Milwaukee', 'Chicago', 'Minneapolis', 'Detroit', 'Madison', 'Columbus', 'Cleveland', 'Des Moines', 'Omaha', 'Indianapolis', 'St. Louis', 'Toronto', 'Portland', 'Boston', 'Philadelphia', 'Denver', 'Kansas City', 'Grand Rapids'],
  season: ['wet spring', 'hot summer', 'hard winter', 'long autumn', 'cold spring', 'dry August'],
  scale: ['regional', 'state-level', 'national', 'multi-year', 'county-by-county'],
  noun: ['funding', 'genetics', 'nutrition', 'weather', 'paperwork', 'trade'],
  cause: ['varroa mites', 'poor forage', 'pesticide drift', 'neonicotinoid seed coatings', 'drought stress', 'queen failure', 'frequent hive moves', 'shrinking floral diversity'],
  cause2: ['agricultural runoff', 'road salt', 'stormwater overflows', 'nitrate runoff', 'aging lead service lines'],
  role: ['beekeepers', 'commercial operators', 'extension agents', 'apiary inspectors', 'hobbyists in three counties'],
  institution: ['a state university lab', 'an extension service', 'a federal bee survey', 'a university entomology department', 'a regional diagnostic lab'],
  verb: ['vanishing', 'shifting north', 'hard to find', 'getting smaller'],
  adjPollinator: ['getting worse faster than expected', 'uneven across regions', 'harder to measure than it looks', 'more local than the headlines suggest'],
  adjMoney: ['patchy', 'shrinking', 'rising slowly', 'tied to one budget cycle'],
  species: ['carp', 'garlic mustard', 'emerald ash borer', 'phragmites', 'zebra mussels', 'stiltgrass', 'hemlock woolly adelgid'],
  river: ['Fox', 'Wisconsin', 'Rock', 'Maumee', 'Kalamazoo', 'Des Plaines'],
  lake: ['Erie', 'Michigan', 'Winnebago'],
  state: ['Wisconsin', 'Iowa', 'Minnesota', 'Michigan', 'Ohio', 'Illinois', 'Indiana'],
  // Only used in set A. Every set-A summary carries one of these, so each one contains "virus".
  virusClause: ['deformed wing virus', 'a virus that spreads between colonies', 'virus loads that peak in late summer', 'Israeli acute paralysis virus', 'virus and mite co-infections', 'a virus carried in by mites', 'black queen cell virus'],
  irrTopic: ['business', 'technology', 'sports', 'travel', 'food', 'culture', 'politics', 'education', 'labor', 'real estate', 'music', 'transportation', 'energy', 'film', 'books'],
  relTopic: ['environment', 'wildlife', 'water quality', 'climate adaptation', 'agriculture', 'urban planning', 'pollinators', 'science news'],
  region: ['Midwest', 'Great Lakes', 'Upper Midwest', 'Rust Belt', 'Plains', 'Northeast'],
  section: ['news', 'features', 'local', 'science', 'urban', 'markets'],
};

const FIRST = ['Maya', 'Daniel', 'Keiko', 'Samuel', 'Adaeze', 'Tomas', 'Lillian', 'Rafael', 'Hannah', 'Oluwaseun', 'Greta', 'Vikram', 'Noor', 'Ethan', 'Marisol', 'Jun', 'Sofia', 'Caleb', 'Amara', 'Yusuf', 'Clara', 'Theo', 'Ngozi', 'Aiden', 'Rosa', 'Kofi', 'Elena', 'Marcus', 'Ingrid', 'Felix', 'Dana', 'Wendell', 'Layla', 'Sunil', 'Bridget', 'Hector', 'Miriam', 'Callum', 'Imogen', 'Reza', 'Nadine', 'Owen', 'Esme', 'Kwame', 'Lucía', 'Tobias', 'Mina', 'Gabriel', 'Harriet', 'Ravi', 'Joanna', 'Silas', 'Odette', 'Pablo', 'Frances', 'Dorian', 'Anika', 'Lorenzo', 'Beatriz', 'Cole', 'Yara', 'Ned', 'Arjun', 'Wren'];
const LAST = ['Alvarez', 'Brandt', 'Chukwu', 'Delacroix', 'Eriksen', 'Fairbanks', 'Gallardo', 'Hollis', 'Ibarra', 'Jankowski', 'Kaur', 'Mensah', 'Nakamura', 'Okafor', 'Petrakis', 'Quill', 'Renner', 'Sandoval', 'Thibodeaux', 'Ueda', 'Vasquez', 'Yildiz', 'Zelenka', 'Abernathy', 'Bautista', 'Castellano', 'Dorsey', 'Engstrom', 'Fitzgerald', 'Gustafson', 'Haverford', 'Iwasaki', 'Jorgensen', 'Kowalczyk', 'Lund', 'Marchetti', 'Novak', 'Oyelaran', 'Prescott', 'Rademaker', 'Tanaka', 'Underwood', 'Varga', 'Winslow', 'Achebe', 'Bergstrom', 'Costa', 'Dahl', 'Evanko', 'Frey', 'Holm', 'Lindahl', 'Pruitt', 'Sorensen', 'Whitfield'];

const SECTION_WORDS = {
  News: [350, 900],
  Local: [300, 700],
  Analysis: [900, 1500],
  Science: [700, 1400],
  Feature: [2000, 4000],
  Opinion: [700, 1000],
  'Field notes': [800, 1500],
  Dispatch: [400, 700],
};

// Templates are grouped so each headline family gets summaries that fit it.
// Set A (bee + virus) and sets B/C (no virus) are kept apart so the opening query returns exactly OPENING_TOTAL results.
const GROUPS_A = [
  {
    heads: [
      'Honey bee losses hit {pct} percent again, with virus and mites in the mix',
      'Why {place} beekeepers are losing more colonies every winter',
      '{pct} percent of colonies lost: a {season} of bees and virus in {place}',
      'The slow loss of honey bee colonies in {place}',
      'Colony collapse is over, the losses are not: notes from {place}',
    ],
    sums: [
      'Survey data from {n} apiaries shows losses concentrated in a {season}, with {virusClause} cited by most beekeepers interviewed.',
      'A {scale} count of honey bee colonies in {place} found losses of {pct} percent, and {virusClause} was present in many of the dead hives.',
      'Beekeepers who lost hives this year point to {virusClause}, but many say the testing that would prove it is slow and expensive.',
      '{role} describe honey bee losses that began in a {season} and never fully recovered, alongside a look at {virusClause}.',
    ],
  },
  {
    heads: [
      'The virus question: why honey bee health is hard to measure',
      'Virus, varroa, and a hard winter: notes from {city} bee yards',
      'Bees, virus and the numbers nobody agrees on',
      'Mites, {cause} and virus: the case for better hive checks',
      'Honey bees, virus and the {noun} gap nobody is funding',
    ],
    sums: [
      'Researchers at {institution} link {cause} to colony failure in honey bees, and {virusClause} shows up in many of the dead hives they sampled.',
      'A {scale} look at honey bee health finds {virusClause} in {pct} percent of sampled colonies, though the testing method is still disputed.',
      'The piece explains how {virusClause} spreads between colonies, and why a single lab test often misses it in early samples.',
      'Commercial and hobby beekeepers disagree about how much {virusClause} matters next to {cause}.',
    ],
  },
  {
    heads: [
      'Beekeepers in {city} say {cause} is making colony losses worse',
      'Inside {place} apiaries where colonies keep dying',
      'How one {city} club tracks bee health, virus and all',
      'Urban bee yards in {city} lose colonies to virus and a crowded summer',
      'After a {season} of losses, {place} beekeepers look for answers',
      'Why hobby beekeepers are hit harder by virus than commercial operators',
    ],
    sums: [
      'Hobby beekeepers in {city} compare notes on {virusClause}, {cause}, and what the spring checks missed.',
      'A club of about {n} members in {city} logs every hive, and the logs show {virusClause} arriving in late summer.',
      'Walking through one apiary in {place}, the piece follows a beekeeper from the first dead colony to the lab report on {virusClause}.',
      'Backyard and rooftop keepers in {city} describe the losses, and the new hive checks they are adding because of {virusClause}.',
    ],
  },
  {
    heads: [
      'What the latest bee survey gets wrong about colony losses',
      'The honey bee problem in {place} is a {noun} problem',
      'Why keepers in {place} are changing how they test for virus',
      'Winter losses in {place}: a {scale} survey of bees and virus',
    ],
    sums: [
      'The {scale} survey counted {n} managed colonies but did not sample for {virusClause}, which the authors now say skewed the results.',
      'State inspectors and extension agents in {place} are debating whether colonies should be tested for {virusClause} before they move.',
      'Funding for honey bee health research in {place} has grown, but most of it has gone to {cause} rather than {virusClause}.',
    ],
  },
];

const GROUPS_B = [
  {
    heads: [
      'Honey bee colonies down {pct} percent after a mild winter, survey says',
      'A {season} of pollinator decline in {place}, in numbers',
      'Why bumblebee counts keep falling in {place}',
      'Pollinator decline is {adjPollinator}, researchers say',
      'Native bees are {verb} in {place}, and nobody counted them',
      'The hobby beekeeper who counted {n} bee species in one backyard',
    ],
    sums: [
      'Count data from {n} sites and interviews with {role} point to {cause} as the main pressure on bee populations in {place}.',
      'Field surveys in {place} track how {cause} and a {season} changed bee numbers, with a clear split between wild and managed colonies.',
      'A {scale} review of pollinator research finds gaps in the data for {place}, and the authors argue for better counts before new rules.',
    ],
  },
  {
    heads: [
      'Mason bees and the {city} garden boom',
      'The case for planting for bees in {city} parks',
      'Bee-friendly lawns are gaining ground in {place} suburbs',
      'Hive inspections are back on the agenda in {city}',
      'Urban beekeeping rules differ across {place}. Here is how they stack up',
    ],
    sums: [
      'Planting programs in {city} now count pollinator-friendly beds, and the parks department says {n} new beds went in this spring.',
      'Residents in {place} suburbs are replacing turf with flowering plants, and the piece checks whether the new habitat holds bees through August.',
      'Hive inspection rules vary from one city council to the next, and the piece compares what {city} requires with its neighbors.',
      'A mason bee project in {city} shows how small gardens can add nesting sites, though the scientists say the effect is hard to measure.',
    ],
  },
  {
    heads: [
      'Pesticide drift, {cause}, and the bee question in {place}',
      'Beekeeping cooperatives in {place} want a bigger share of {noun} money',
      'Honey harvests shrink as {place} colonies struggle through a {season}',
      'Beekeepers say the pollinator story has been told wrong for years',
      'Pollinator decline and the farm-edge habitat fight in {place}',
    ],
    sums: [
      'Regulators in {place} are weighing limits on neonicotinoid seed coatings, and beekeepers say the evidence on {cause} is still thin.',
      'Beekeeping cooperatives say grant money has gone to {noun} programs while colony losses keep rising.',
      'Farm-edge habitat programs in {place} pay growers to leave strips of flowers, and early counts show bees returning to some fields.',
    ],
  },
];

const GROUPS_C = [
  {
    heads: [
      'Urban farms in {city} are growing more than vegetables',
      'Rooftop growing in {city} runs into zoning, water and insurance',
      'How {city} plans to feed itself when the {season} runs short',
      'Urban agriculture grants in {city} reach {n} new growers',
      'The {city} community garden that became a neighborhood hub',
    ],
    sums: [
      'Growers and planners in {city} describe permits, water access and the first harvest of a rooftop plot.',
      'The city says {n} new growers have joined its urban agriculture program, but few plots have reliable water or insurance.',
      'A community garden in {city} now runs a food pantry, a seed library and a waiting list of {n} families.',
      'Urban farmers in {city} say the hardest part of the first season is the permits, not the soil.',
    ],
  },
  {
    heads: [
      'Invasive {species} spread up {river} tributaries after a warm {season}',
      'Lake {lake} algae blooms return earlier this {season}',
      'Great Lakes water quality improves, but {cause2} still threatens {place}',
      'Great Lakes {city} pipes, {cause2}, and the cost of clean water',
      'Invasive species funding in the Midwest is {adjMoney}',
      'Midwest {species} rules: what changed in {state} this year',
    ],
    sums: [
      'County land managers say the {species} problem has moved faster than the budget, and the {river} watershed group wants a new survey.',
      'Volunteer monitors tracked the spread at {n} sites this season, and most of the new sightings came from boat launches.',
      'The story follows river watershed groups that weigh the cost of {cause2} each season.',
      'A {scale} survey of {state} residents finds most want faster action, but few know who pays for it.',
    ],
  },
  {
    heads: [
      'Community science is changing how {place} counts its wildlife',
      'Community science projects in {state} track {noun} in new ways',
    ],
    sums: [
      'Volunteers in {state} submitted {n} observations this year, and scientists say the counts are now good enough to shape policy.',
      'A {scale} program in {place} trains residents to log wildlife on their own land, and officials are starting to use the data.',
    ],
  },
];

const A_ANGLES = ['Hive losses & beekeeper economics', 'Pesticide link', 'Policy & funding', 'Wild pollinator surveys', 'Identification & lab news', 'Personal essay'];
const B_ANGLES = ['Wild pollinator surveys', 'Pesticide link', 'City rules & urban hives', 'Policy & funding', 'Field report', 'Hive losses & beekeeper economics', 'Overwintering & feed'];
const C_ANGLES = ['Water & runoff', 'Invasive species', 'Urban growing', 'Policy & funding', 'Field report', 'Community science'];
const A_EXTRA_TAGS = ['Pollinator decline', 'Pesticides', 'Policy', 'Research & surveys', 'Urban beekeeping'];
const B_TAGS = ['Pollinator decline', 'Pesticides', 'Policy', 'Research & surveys', 'Urban beekeeping'];
const C_TAGS = ['Policy', 'Research & surveys', 'Pesticides'];

// One set of slot values per article, shared by its headline and summary.
function slots() {
  const s = { pct: String(int(22, 58)), n: String(int(4, 60)) };
  for (const key of Object.keys(POOLS)) s[key] = pick(POOLS[key]);
  return s;
}

function fill(tpl, s) {
  return tpl.replace(/\{(\w+)\}/g, (_, key) => {
    if (!(key in s)) throw new Error(`Unknown template slot: ${key}`);
    return s[key];
  });
}

function authorFor(outlet) {
  const authorType = outlet.freelance && chance(0.6) ? 'freelance' : 'staff';
  return { author: `${pick(FIRST)} ${pick(LAST)}`, authorType };
}

function sectionAndWords(preferred) {
  const section = preferred || pick(Object.keys(SECTION_WORDS));
  const [lo, hi] = SECTION_WORDS[section] || SECTION_WORDS.News;
  return { section, words: int(lo, hi) };
}

const SEEN = new Set(ANCHOR_ARTICLES.map((a) => a.headline));
const OPENING_TOKENS = tokenize(OPENING_QUERY);

function build(prefix, idx, headline, summary, outlet, tags, angle, date, section) {
  const { author, authorType } = authorFor(outlet);
  const { words } = sectionAndWords(section);
  return indexArticle({
    id: `${prefix}-${String(idx).padStart(4, '0')}`,
    headline,
    summary,
    outletId: outlet.id,
    author,
    authorType,
    date,
    section,
    words: words || 600,
    tags,
    angle,
  });
}

function anchorMatchCount() {
  return ANCHOR_ARTICLES.map(indexArticle).filter((a) => matchesQuery(a, OPENING_TOKENS)).length;
}

// Bee-beat outlets carry most of the bee coverage, weighted by how often they run it.
const BEE_BEAT_WEIGHTS = {
  'modern-apiarist': 3,
  'heartland-farm': 3,
  'urban-harvest': 2,
  'ordinary-garden': 2,
  'prairie-dispatch': 2,
  'great-lakes-ledger': 2,
  'wildlife-wire': 2,
  'turf-and-trellis': 2,
  'dane-county-gazette': 2,
  'ridgeway-daily': 2,
  'harrow-heath': 1,
  'continental-review': 1,
  'public-ground': 1,
  'mosaic-detroit': 1,
  'chicago-field-notes': 1,
  'metro-sentinel': 1,
  'tallgrass-times': 1,
  'river-county-courier': 1,
  'northern-plains-wire': 1,
  'lantern-county-post': 1,
  'red-oak-chronicle': 1,
  'pine-hollow-gazette': 1,
  'cedar-ridge-gazette': 1,
  'fieldnotes-quarterly': 1,
};
const BEE_BEAT = OUTLETS.flatMap((o) => Array(BEE_BEAT_WEIGHTS[o.id] || 0).fill(o));

// Set A: stories about bee decline that mention the virus. Sized so the
// opening query returns OPENING_TOTAL results in total.
function generateSetA() {
  const needed = OPENING_TOTAL - anchorMatchCount();
  const out = [];
  let guard = 0;
  while (out.length < needed && guard < 50000) {
    guard += 1;
    const outlet = pick(BEE_BEAT);
    const group = pick(GROUPS_A);
    const s = slots();
    const headline = cap(fill(pick(group.heads), s));
    if (SEEN.has(headline)) continue;
    const summary = cap(fill(pick(group.sums), s));
    const tags = ['Colony disease'];
    if (chance(0.6)) tags.push(pick(A_EXTRA_TAGS));
    if (chance(0.25)) tags.push('Urban beekeeping');
    const date = chance(0.35)
      ? dateBetween('2026-05-17', '2026-11-16')
      : dateBetween('2023-01-05', '2026-05-16');
    const a = build('g-a', out.length + 1, headline, summary, outlet, [...new Set(tags)], pick(A_ANGLES), date, pick(['News', 'Feature', 'Analysis', 'Local', 'Science', 'Field notes', 'Dispatch']));
    if (matchesQuery(a, OPENING_TOKENS)) {
      out.push(a);
      SEEN.add(headline);
    }
  }
  return out;
}

const TOPICS_NO_COLONY = ['Urban beekeeping', 'Pollinator decline', 'Pesticides', 'Policy', 'Research & surveys'];

// Set B: pollinator and bee stories that never mention the virus.
function generateSetB(count) {
  const out = [];
  while (out.length < count) {
    const outlet = pick(OUTLETS);
    const group = pick(GROUPS_B);
    const s = slots();
    const headline = cap(fill(pick(group.heads), s));
    if (SEEN.has(headline)) continue;
    const summary = cap(fill(pick(group.sums), s));
    const tags = [pick(TOPICS_NO_COLONY)];
    if (chance(0.5)) tags.push(pick(B_TAGS));
    const date = chance(0.3) ? dateBetween('2026-05-17', '2026-11-16') : dateBetween('2023-01-05', '2026-05-16');
    const a = build('g-b', out.length + 1, headline, summary, outlet, [...new Set(tags)], pick(B_ANGLES), date, pick(['News', 'Feature', 'Analysis', 'Science', 'Field notes', 'Opinion']));
    if (matchesQuery(a, OPENING_TOKENS)) continue;
    out.push(a);
    SEEN.add(headline);
  }
  return out;
}

// Set C: wider environment and urban-growing stories with no bees at all.
function generateSetC(count) {
  const out = [];
  while (out.length < count) {
    const outlet = pick(OUTLETS);
    const group = pick(GROUPS_C);
    const s = slots();
    const headline = cap(fill(pick(group.heads), s));
    if (SEEN.has(headline)) continue;
    const summary = cap(fill(pick(group.sums), s));
    const tags = [pick(C_TAGS)];
    let date;
    const r = rnd();
    if (r < 0.08) date = dateBetween('2026-11-14', '2026-11-16');
    else if (r < 0.3) date = dateBetween('2026-05-17', '2026-11-13');
    else date = dateBetween('2023-01-05', '2026-05-16');
    const a = build('g-c', out.length + 1, headline, summary, outlet, tags, pick(C_ANGLES), date, pick(['News', 'Local', 'Analysis', 'Feature', 'Field notes', 'Opinion']));
    if (matchesQuery(a, OPENING_TOKENS)) continue;
    out.push(a);
    SEEN.add(headline);
  }
  return out;
}

export const ARTICLES = [
  ...ANCHOR_ARTICLES.map(indexArticle),
  ...generateSetA(),
  ...generateSetB(360),
  ...generateSetC(540),
];

// ---- Open calls -----------------------------------------------------------

const CALL_NOTES = [
  'Pitch with a named source.',
  'Send three clips with your pitch.',
  'Local angles get priority.',
  'We pay on acceptance.',
  'Please include your rate in the pitch.',
  'Two-paragraph pitches only.',
  'Drafts are welcome after an accepted pitch.',
];
const EDITOR_TITLES = ['Features Editor', 'Managing Editor', 'Commissioning Editor', 'Deputy Editor', 'Section Editor', 'Newsletter Editor', 'Senior Editor', 'Ideas Editor'];
const IRR_CALL_TPL = ['Seeking {irrTopic} features for our {section} desk', 'Freelance {irrTopic} writer wanted', 'Pitches on {irrTopic} for our weekly edition', '{irrTopic} reporting, {region} focus'];
const REL_CALL_TPL = ['Seeking {relTopic} reporting for our {section} desk', 'Freelance {relTopic} reporter, {region} focus', 'Pitches wanted: {relTopic} from the {region}', 'Explainers on {relTopic} for general readers', 'Field reporting on {relTopic}, {region} focus'];

function generatedCall(i, outlet, relevant) {
  const title = cap(fill(pick(relevant ? REL_CALL_TPL : IRR_CALL_TPL), slots()));
  const topics = relevant ? [...new Set([pick(['Environment', 'Science', 'Agriculture', 'Wildlife', 'Water', 'Climate']), pick(['Environment', 'Wildlife', 'Science'])])] : [pick(POOLS.irrTopic).replace(/^./, (c) => c.toUpperCase())];
  const pay = chance(0.6) ? { type: 'word', amount: Math.round((0.5 + rnd() * 1.5) * 20) / 20 } : { type: 'flat', amount: int(6, 30) * 50 };
  const wordMin = pick([300, 600, 800, 1000, 1200, 1500, 2000]);
  const wordMax = wordMin + pick([200, 400, 600, 900, 1200, 1500]);
  return {
    id: `g-call-${String(i).padStart(3, '0')}`,
    outletId: outlet.id,
    title,
    editor: { name: `${pick(FIRST)} ${pick(LAST)}`, title: pick(EDITOR_TITLES) },
    topics,
    pay,
    wordMin,
    wordMax,
    deadline: dateBetween('2026-11-18', '2027-01-20'),
    posted: dateBetween('2026-10-01', '2026-11-16'),
    note: pick(CALL_NOTES),
  };
}

const NAMED_OUTLET_IDS = new Set(OUTLETS.filter((o) => o.history || o.editor).map((o) => o.id));
const FREELANCE_OUTLETS = OUTLETS.filter((o) => o.freelance);
const BACKGROUND_FREELANCE = FREELANCE_OUTLETS.filter((o) => !NAMED_OUTLET_IDS.has(o.id));

// 50 relevant calls come from the background outlets; the rest are off-beat calls spread across all freelance outlets.
const generatedCalls = [];
for (let i = 1; i <= 128; i += 1) {
  if (i <= 50) generatedCalls.push(generatedCall(i, pick(BACKGROUND_FREELANCE), true));
  else generatedCalls.push(generatedCall(i, pick(FREELANCE_OUTLETS), false));
}

export const CALLS = [...NAMED_CALLS, ...generatedCalls];
