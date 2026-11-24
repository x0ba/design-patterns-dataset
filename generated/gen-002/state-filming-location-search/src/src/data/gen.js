import { makeRand } from './rng.js'
import { COUNTIES, CAPITAL, driveFrom, countyByName } from './geo.js'
import { SURNAMES, FIRST, TOWN_PRE, TOWN_SUF, MAIN_ST } from './names.js'
import { availability } from './dates.js'
import { COURTHOUSES, YARDS } from './specials.js'

const R = makeRand(20260418)
const { pick, int, chance, weighted } = R

// ---------- towns ----------
const towns = []
const usedTown = new Set()
const SEAT = { Ashby: 'Ashby Falls', Brannock: 'Brannock Springs', Calder: 'Calder Mills', Colfax: 'Colfax Junction' }
function townName() {
  for (;;) {
    const n = pick(TOWN_PRE) + pick(TOWN_SUF)
    if (!usedTown.has(n)) { usedTown.add(n); return n }
  }
}
function makeTown(county, name, seat, dx, dy) {
  const x = Math.round(county.x + dx), y = Math.round(county.y + dy)
  const nights = weighted([[0, 22], [1, 28], [2, 24], [3, 16], [4, 10]])
  const t = {
    name, county: county.name, seat, x, y,
    drive: name === 'Ellery' ? 6 : driveFrom(x, y, county.roadFactor),
    rules: {
      maxNights: nights,
      hours: pick(['8 PM – 6 AM', '9 PM – 6 AM', '7 PM – 5 AM', '10 PM – 6 AM', '6 PM – 6 AM']),
      noticeDays: pick([21, 30, 30, 45, 45, 60, 75, 90]),
      councilVote: chance(0.42),
      feePerNight: pick([0, 250, 400, 600, 600, 850, 1200]),
      policeDetail: pick(['1 officer per intersection, billed to production', 'Two-officer detail, billed to production', 'City provides detail at no charge', 'Off-duty officers, production hires']),
      clerk: `${pick(FIRST)} ${pick(SURNAMES)}`,
    },
  }
  towns.push(t)
  return t
}
for (const c of COUNTIES) {
  makeTown(c, SEAT[c.name] || c.name, true, (R.f() - 0.5) * 8, (R.f() - 0.5) * 8)
  const n = int(2, 4)
  for (let i = 0; i < n; i++) makeTown(c, townName(), false, (R.f() - 0.5) * 100, (R.f() - 0.5) * 90)
}
// The capital
const hollis = countyByName['Hollis']
const ellery = { name: 'Ellery', county: 'Hollis', seat: true, x: CAPITAL.x, y: CAPITAL.y, drive: 6, rules: { maxNights: 2, hours: '9 PM – 6 AM', noticeDays: 45, councilVote: true, feePerNight: 1200, policeDetail: 'Capitol Police detail, billed to production', clerk: 'Rosalind Okafor' } }
towns.push(ellery)
export const TOWNS = towns
const townByName = Object.fromEntries(towns.map((t) => [t.name, t]))
const townsByCounty = {}
for (const t of towns) (townsByCounty[t.county] ||= []).push(t)

// ---------- helpers ----------
const PRODS = [
  ['Hollow County', 'series'], ['Salt Line', 'feature'], ['The Marrow Road', 'series'], ['Quiet Harbor', 'series'], ['Dry Creek', 'feature'],
  ["Night Shift at Pike's", 'series'], ['Cold Open', 'feature'], ['Paper Lanterns', 'series'], ['Ninety Miles West', 'feature'], ['Graves & Gable', 'series'],
  ['Last Train to Calder', 'feature'], ['Ember Season', 'series'], ['Small Mercies', 'feature'], ['County Line', 'series'], ['The Undertow', 'series'],
  ['Whistle Stop', 'feature'], ['Tallow', 'feature'], ['Neon Gospel', 'music video'], ['Brightwater', 'commercial'], ['Redbud', 'series'],
  ['Lowlight', 'feature'], ['The Ferrymen', 'series'], ['Open Range Motel', 'feature'], ['Sparrow Hill', 'series'], ['Cinder & Salt', 'commercial'],
]
function productions(n) {
  const out = []
  const used = new Set()
  for (let i = 0; i < n; i++) {
    const [title, kind] = pick(PRODS)
    if (used.has(title)) continue
    used.add(title)
    out.push({ title, kind, season: kind === 'series' ? 'S' + int(1, 3) : null, year: int(2016, 2025) })
  }
  return out.sort((a, b) => b.year - a.year)
}
const decadeOf = (y) => Math.floor(y / 10) * 10 + 's'
function styleFor(y) {
  if (y < 1860) return pick(['Federal', 'Greek Revival'])
  if (y < 1900) return pick(['Victorian Italianate', 'Second Empire', 'Queen Anne', 'Victorian Gothic'])
  if (y < 1930) return pick(['Neoclassical', 'Craftsman', 'Beaux-Arts', 'Colonial Revival'])
  if (y < 1946) return pick(['Art Deco', 'Colonial Revival', 'Streamline Moderne'])
  if (y < 1966) return pick(['Mid-century Modern', 'Ranch', 'International Style'])
  if (y < 1986) return pick(['Brutalist', 'Modernist', 'Contemporary'])
  return pick(['Postmodern', 'Contemporary', 'Utilitarian'])
}
function lookEras(y, boost70 = 0.18) {
  const e = new Set([decadeOf(y)])
  if (y < 1970 && chance(boost70)) e.add('1970s')
  if (chance(0.12)) e.add(pick(['1950s', '1960s', '1980s']))
  return [...e].sort()
}
function blackoutsFor(reasons, pBase = 0.24) {
  const out = []
  if (!chance(pBase)) return out
  const n = chance(0.25) ? 2 : 1
  for (let i = 0; i < n; i++) {
    const inWin = chance(0.6)
    const startDay = inWin ? int(0, 70) : int(-120, 300)
    const base = Date.parse('2027-02-20T12:00:00Z') + startDay * 86400000
    const len = int(3, chance(0.12) ? 60 : 18)
    out.push({ from: new Date(base).toISOString().slice(0, 10), to: new Date(base + len * 86400000).toISOString().slice(0, 10), reason: pick(reasons) })
  }
  return out
}
const BLK_PRIVATE = ['Owner traveling', 'Family event', 'Spring planting', 'Existing booking', 'Contractor work scheduled', 'Seasonal tenant turnover']
const BLK_PUBLIC = ['Scheduled maintenance', 'Council session calendar', 'Election-related use', 'Spring program schedule', 'Held for another production', 'Capital repair work']
const SUMMARY_END = {
  interior: 'Interior and exterior both available.',
}
function contactFor(ownerType, role, status, overrides = {}) {
  const name = `${pick(FIRST)} ${pick(SURNAMES)}`
  const lc = `2026-${pick(['08', '09', '10', '10', '11'])}-${String(int(1, 28)).padStart(2, '0')}`
  const notes = {
    active: pick(['Responsive; open to filming and has hosted crews before.', 'Replied within a day to the last inquiry. Wants 2 weeks’ notice for site visits.', 'Supportive; asks that tours be scheduled through the front office.', 'Open to filming. Prefers weekday walk-throughs.']),
    unresponsive: pick(['No reply to 3 emails and 1 voicemail since the first inquiry.', 'Last contact went unanswered; office line goes to voicemail.', 'Mailbox full on the last two calls. No reply to the email follow-up.']),
    declined: pick(['Declined filming following a 2025 incident with a prior crew.', 'Owner no longer accepts filming requests.', 'Declined; property is being marketed for sale.']),
  }
  return { name, role, status, lastContact: lc, note: notes[status], phone: `(${pick(['507', '612', '218', '320'])}) 555-${String(int(100, 999)).padStart(4, '0')}`, ...overrides }
}
const ownerNames = (type, town) => type === 'State' ? pick(['State Facilities Division', 'State Department of Transportation', 'State Historic Preservation Office', 'State Lands Commission']) : type === 'Municipal' ? `City of ${town}` : null

let seq = 1000
const nextId = () => 'LOC-' + String(++seq).padStart(5, '0')
const statusRoll = () => weighted([['active', 66], ['unresponsive', 22], ['declined', 12]])
const photoCount = () => weighted([[int(8, 16), 40], [int(17, 30), 38], [int(31, 60), 22]])

// ---------- courthouses ----------
const library = []
for (const c of COURTHOUSES) {
  const county = countyByName[c.county]
  const t = townByName[SEAT[c.county] || c.county] || towns.find((x) => x.county === c.county && x.seat)
  const x = t.x, y = t.y
  const owner = c.ownerType || 'Municipal'
  const status = c.status || 'active'
  const lead = c.lead || int(10, 45)
  const loc = {
    id: nextId(), name: `${c.county} County Courthouse`, county: c.county, town: t.name, type: 'Courthouse',
    ownerType: owner, ownerName: owner === 'State' ? 'State Court Administration' : `${c.county} County Board of Commissioners`,
    contact: contactFor(owner, pick(['County Facilities Director', 'Court Administrator', 'Clerk of Court']), status, c.contact || {}),
    yearBuilt: c.year, styles: c.styles, lookEras: c.eras,
    sqft: c.sqft || int(18000, 70000), ceilingFt: c.ceiling || int(14, 28), power: c.power || pick(['Full 200A service', 'Full 200A service', 'Limited — 100A', 'Generator tie-in']),
    parking: c.parking || int(25, 140), drive: Math.max(4, driveFrom(x + (R.f() - 0.5) * 4, y + (R.f() - 0.5) * 4, county.roadFactor)), x, y,
    photos: c.photos || photoCount(),
    productions: c.productions || (chance(0.4) ? productions(int(1, 2)) : []),
    permitLead: lead, permitIssuer: owner === 'State' ? 'State Court Administration' : `${c.county} County Facilities Office`,
    rate: c.rate || pick([900, 1200, 1500, 1800, 2200]),
    blackouts: c.blackouts || blackoutsFor(['Court calendar — jury trials', 'Capital repair work', 'Election-related use'], 0.2),
    features: c.balcony ? ['balcony gallery', ...(c.features || [])] : (c.features || []),
    shootModes: ['interior', 'exterior'],
    summary: c.summary || `A ${c.year} ${c.styles[0].toLowerCase()} courthouse in ${t.name}${c.balcony ? ' with a public balcony gallery' : ''}. ${c.eras.includes('1970s') ? 'Interior reads as 1970s.' : 'Interior is ' + c.eras[0] + ' in character.'}`,
    court: { courtrooms: c.courtrooms || int(1, 4), gallerySeats: c.balcony ? int(40, 120) : int(40, 110), balcony: !!c.balcony, sessionDays: c.sessionDays || 'Mon–Thu', filmDays: c.filmDays || 'Fri–Sun and court holidays', security: pick(['Screening at main entrance', 'Sheriff’s deputy on site during filming', 'Badge access after hours']) },
    ref: c.ref,
  }
  library.push(loc)
}

// ---------- rail yards ----------
for (const y of YARDS) {
  const county = countyByName[y.county]
  const t = townByName[y.town] || makeTown(county, y.town, false, 20, 10)
  const owner = y.ownerType
  const loc = {
    id: nextId(), name: y.name, county: y.county, town: t.name, type: 'Rail yard',
    ownerType: owner, ownerName: y.ownerName,
    contact: contactFor(owner, y.role, y.status, y.contact || {}),
    yearBuilt: y.year, styles: ['Industrial'], lookEras: y.eras,
    sqft: Math.round(y.acres * 43560), ceilingFt: y.ceiling || 0, power: y.power, parking: y.parking, drive: driveFrom(t.x, t.y, county.roadFactor), x: t.x, y: t.y,
    photos: y.photos, productions: y.productions || [], permitLead: y.lead, permitIssuer: owner === 'State' ? 'State DOT Right-of-Way Office' : 'Owner agreement + railroad safety briefing',
    rate: y.rate, blackouts: y.blackouts || [], features: y.features, shootModes: ['exterior', 'interior'],
    summary: y.summary,
    yard: { disused: y.disused, status: y.disusedNote, trackMiles: y.track, acres: y.acres, structures: y.structures, traffic: y.traffic, safety: y.safety, access: y.access },
  }
  library.push(loc)
}

// ---------- main street segments ----------
const MS_FEATS = [
  ['brick storefronts', 'diagonal parking'], ['brick storefronts', 'neon signage'], ['Italianate cornices', 'awnings'], ['courthouse square', 'brick storefronts'],
  ['1970s storefronts', 'mid-century signage'], ['Art Deco facades', 'marquee theater'], ['brick storefronts', 'clock tower'], ['wide boulevard', 'mid-century signage'],
  ['brick paving', 'gas lamps'], ['1970s storefronts', 'diagonal parking'],
]
const segTowns = R.shuffle(towns.filter((t) => t.name !== 'Ellery'))
let segCount = 0
// force a healthy number near the capital so the shortlist decision is real
const near = segTowns.filter((t) => t.drive <= 90)
const far = segTowns.filter((t) => t.drive > 90)
const chosen = [...near.slice(0, 30), ...far.slice(0, 104), ellery, ...near.slice(30, 35)].slice(0, 140)
for (const t of chosen) {
  const county = countyByName[t.county]
  const st = pick(MAIN_ST)
  const f = pick(MS_FEATS)
  const blocks = pick(['100–300', '100–400', '200–500', '100–200', '300–600'])
  const y = int(1885, 1960)
  const status = statusRoll()
  const eras = [decadeOf(y)]
  if (f.some((x) => x.includes('1970s'))) eras.push('1970s')
  if (chance(0.25) && !eras.includes('1970s')) eras.push('1970s')
  const loc = {
    id: nextId(), name: `${st}, ${t.name}`, county: t.county, town: t.name, type: 'Main street segment',
    ownerType: 'Municipal', ownerName: `City of ${t.name}`,
    contact: contactFor('Municipal', pick(['City Clerk', 'Public Works Director', 'Special Events Coordinator']), chance(0.84) ? 'active' : status, { name: t.rules.clerk }),
    yearBuilt: y, styles: [styleFor(y)], lookEras: [...new Set(eras)].sort(),
    sqft: 0, ceilingFt: 0, power: pick(['Street-level power drops available', 'Hydrant + municipal tie-ins', 'Generator required', 'Limited — 60A drops']), parking: int(30, 180),
    drive: t.drive, x: t.x + (R.f() - 0.5) * 3, y: t.y + (R.f() - 0.5) * 3,
    photos: photoCount(), productions: chance(0.3) ? productions(int(1, 2)) : [],
    permitLead: Math.max(14, t.rules.noticeDays - (t.rules.councilVote ? 0 : 10)), permitIssuer: `${t.name} City Clerk — special events permit`,
    rate: t.rules.feePerNight, blackouts: blackoutsFor(['Farmers market season', 'Spring festival', 'Road resurfacing', 'Parade route', 'Held for another production'], 0.3),
    features: f, shootModes: ['exterior'],
    summary: '',
    street: {
      blocks, lengthFt: int(900, 2100), widthFt: pick([48, 56, 60, 66, 72]), storefronts: int(14, 42), occupiedPct: int(55, 95),
      closure: { ...t.rules, parkingDisplaced: int(18, 90) },
    },
  }
  const nightsTxt = t.rules.maxNights === 0 ? 'The city does not permit overnight closures; daytime lane closures only.' : t.rules.maxNights === 1 ? 'The city allows one overnight closure at a time.' : `The city allows up to ${t.rules.maxNights} consecutive overnight closures${t.rules.councilVote ? ', subject to a council vote' : ''}.`
  loc.summary = `${blocks} blocks of ${f[0]} lining a ${loc.street.widthFt}-foot-wide ${st.toLowerCase()}, with ${f[1]}. ${nightsTxt}`
  library.push(loc)
  segCount++
}

// ---------- everything else ----------
const OTHER = {
  'Residence': { w: 17, owner: 'Private', yb: [1880, 2012], sqft: [1600, 9500], ceil: [8, 12], park: [2, 14], modes: ['interior', 'exterior'], feats: [['staircase', 'porch'], ['wood paneling', 'fireplace'], ['sunroom', 'garden'], ['mid-century kitchen', 'built-ins'], ['wraparound porch'], ['pool', 'patio']], name: (s) => pick([`${s} House`, `${s} Residence`, `The ${s} Estate`, `${s} Farmhouse`]), what: (o) => `Privately owned ${o.style.toLowerCase()} home` },
  'Farm or barn': { w: 8, owner: 'Private', yb: [1890, 1990], sqft: [2000, 22000], ceil: [14, 34], park: [10, 80], modes: ['exterior', 'interior'], feats: [['hay loft', 'open fields'], ['silo', 'gravel lot'], ['milking parlor'], ['orchard', 'farm stand']], name: (s) => pick([`${s} Dairy Farm`, `${s} Hay Barn`, `${s} Orchard`, `${s} Family Farm`]), what: () => 'Working farm property' },
  'Retail storefront': { w: 6, owner: 'Private', yb: [1900, 1985], sqft: [900, 9000], ceil: [10, 18], park: [4, 40], modes: ['interior', 'exterior'], feats: [['display windows', 'tin ceiling'], ['neon signage'], ['1970s storefronts', 'lunch counter']], name: (s, t) => pick([`${s} Hardware`, `${s} Dry Goods`, `${t} Five & Dime`, `${s} Pharmacy`, `${s} Furniture Co.`]), what: () => 'Former retail space' },
  'Diner or restaurant': { w: 5, owner: 'Private', yb: [1940, 1995], sqft: [1200, 5200], ceil: [9, 14], park: [10, 60], modes: ['interior', 'exterior'], feats: [['counter seating', 'chrome fixtures'], ['vinyl booths', 'neon signage'], ['1970s storefronts', 'wood paneling']], name: (s, t) => pick([`${s}’s Diner`, `The ${t} Grill`, `${s} Family Restaurant`, `${t} Truck Stop Cafe`]), what: () => 'Operating diner' },
  'Church': { w: 4, owner: 'Private', yb: [1860, 1975], sqft: [2400, 16000], ceil: [18, 46], park: [15, 120], modes: ['interior', 'exterior'], feats: [['stained glass', 'choir loft'], ['bell tower', 'wood pews'], ['balcony gallery', 'pipe organ'], ['fellowship hall']], name: (s, t) => pick([`St. ${pick(['Brendan', 'Agnes', 'Stephen', 'Jerome', 'Cecilia'])} Church, ${t}`, `${t} First Methodist Church`, `${t} Lutheran Church`, `${s} Memorial Chapel`]), what: () => 'Congregation-owned sanctuary' },
  'School': { w: 5, owner: 'Municipal', yb: [1910, 1982], sqft: [12000, 90000], ceil: [10, 24], park: [30, 200], modes: ['interior', 'exterior'], feats: [['gymnasium', 'corridors'], ['auditorium', 'lockers'], ['balcony gallery', 'auditorium'], ['cafeteria', 'classrooms']], name: (s, t) => pick([`${t} High School`, `${s} Elementary School`, `${t} Junior High`, `${s} Consolidated School`]), what: () => 'School building' },
  'Warehouse or industrial': { w: 7, owner: 'Private', yb: [1900, 1995], sqft: [8000, 160000], ceil: [16, 40], park: [20, 250], modes: ['interior', 'exterior'], feats: [['loading docks', 'concrete floors'], ['steel trusses', 'skylights'], ['rail spur']], name: (s) => pick([`${s} Cold Storage`, `${s} Freight Warehouse`, `${s} Machine Works`, `${s} Distribution Center`]), what: (o) => 'Industrial building' },
  'Office building': { w: 4, owner: 'Private', yb: [1920, 1995], sqft: [6000, 120000], ceil: [9, 16], park: [20, 300], modes: ['interior', 'exterior'], feats: [['marble lobby', 'elevators'], ['open floor plate'], ['1970s interior', 'drop ceilings']], name: (s, t) => pick([`${s} Building`, `${t} Savings & Loan`, `${s} Insurance Building`, `${t} Professional Plaza`]), what: () => 'Office building' },
  'Hospital or clinic': { w: 2, owner: 'Private', yb: [1925, 1990], sqft: [9000, 140000], ceil: [9, 13], park: [30, 400], modes: ['interior'], feats: [['patient corridors', 'surgical suite'], ['1970s interior', 'nurses station']], name: (s, t) => pick([`${t} Memorial Hospital (closed)`, `${s} Community Clinic`, `${t} Sanitarium`]), what: () => 'Medical facility' },
  'Hotel or motel': { w: 3, owner: 'Private', yb: [1925, 1985], sqft: [4000, 60000], ceil: [8, 16], park: [20, 120], modes: ['interior', 'exterior'], feats: [['neon signage', 'courtyard pool'], ['lobby', 'guest rooms'], ['ballroom']], name: (s, t) => pick([`The ${s} Hotel`, `${t} Motor Lodge`, `${s} Inn`, `Starlite Motel, ${t}`]), what: () => 'Hotel property' },
  'Theater or auditorium': { w: 2.5, owner: 'Municipal', yb: [1912, 1978], sqft: [5000, 28000], ceil: [24, 52], park: [10, 90], modes: ['interior', 'exterior'], feats: [['balcony gallery', 'proscenium'], ['balcony gallery', 'marquee theater'], ['orchestra seating', 'fly loft']], name: (s, t) => pick([`${t} Opera House`, `The ${s} Theatre`, `${t} Civic Auditorium`, `Rialto Theatre, ${t}`]), what: () => 'Historic performance hall' },
  'Town hall': { w: 3, owner: 'Municipal', yb: [1895, 1980], sqft: [4000, 30000], ceil: [10, 22], park: [15, 90], modes: ['interior', 'exterior'], feats: [['council chambers', 'wood paneling'], ['council chambers', 'balcony gallery'], ['council chambers', '1970s interior'], ['clock tower', 'rotunda']], name: (s, t) => pick([`${t} City Hall`, `${t} Town Hall`, `${t} Municipal Building`]), what: () => 'Municipal building' },
  'Library': { w: 2, owner: 'Municipal', yb: [1900, 1985], sqft: [3000, 30000], ceil: [10, 28], park: [10, 80], modes: ['interior', 'exterior'], feats: [['reading room', 'stacks'], ['mezzanine', 'wood paneling']], name: (s, t) => pick([`${t} Public Library`, `${s} Carnegie Library`, `${t} Free Library`]), what: () => 'Public library' },
  'Armory or station': { w: 2.5, owner: 'State', yb: [1900, 1980], sqft: [5000, 40000], ceil: [14, 36], park: [20, 150], modes: ['interior', 'exterior'], feats: [['drill hall', 'vehicle bays'], ['holding cells', 'dispatch room']], name: (s, t) => pick([`${t} National Guard Armory`, `${t} Fire Station No. ${int(1, 4)}`, `${t} Police Annex`]), what: () => 'Public safety building' },
  'Waterfront': { w: 3, owner: 'Private', yb: [1900, 2005], sqft: [0, 0], ceil: [0, 0], park: [6, 80], modes: ['exterior'], feats: [['boat ramp', 'pier'], ['lakeshore', 'cabins'], ['marina']], name: (s, t) => pick([`${s} Lake Landing`, `${t} Marina`, `${s} Point Cabins`, `${t} Boat Launch`]), what: () => 'Waterfront site' },
  'Quarry or mine': { w: 2, owner: 'Private', yb: [1890, 1970], sqft: [0, 0], ceil: [0, 0], park: [10, 200], modes: ['exterior'], feats: [['rock faces', 'haul roads'], ['flooded pit', 'conveyor ruins']], name: (s) => pick([`${s} Limestone Quarry`, `${s} Sand & Gravel Pit`, `Old ${s} Iron Mine`]), what: () => 'Disused extraction site' },
  'Bridge or roadway': { w: 2, owner: 'State', yb: [1920, 1985], sqft: [0, 0], ceil: [0, 0], park: [0, 30], modes: ['exterior'], feats: [['steel truss', 'river crossing'], ['overpass', 'rural two-lane']], name: (s, t) => pick([`${s} Creek Truss Bridge`, `County Road ${int(4, 90)} Overpass`, `${t} Lift Bridge`]), what: () => 'Roadway structure' },
  'Park or open land': { w: 3, owner: 'Municipal', yb: [1900, 2000], sqft: [0, 0], ceil: [0, 0], park: [10, 300], modes: ['exterior'], feats: [['bandstand', 'tree-lined paths'], ['open meadow', 'trailhead']], name: (s, t) => pick([`${t} Riverfront Park`, `${s} Memorial Park`, `${t} Fairgrounds`]), what: () => 'Public green space' },
  'Cemetery': { w: 1, owner: 'Municipal', yb: [1850, 1960], sqft: [0, 0], ceil: [0, 0], park: [6, 40], modes: ['exterior'], feats: [['iron gates', 'old-growth oaks']], name: (s, t) => pick([`${t} Hillside Cemetery`, `${s} Memorial Gardens`]), what: () => 'Historic cemetery' },
  'Gas station or garage': { w: 2, owner: 'Private', yb: [1930, 1985], sqft: [800, 4500], ceil: [10, 16], park: [4, 24], modes: ['exterior', 'interior'], feats: [['vintage pumps', 'service bays'], ['neon signage', '1970s storefronts']], name: (s, t) => pick([`${s} Garage`, `${t} Service Station`, `${s} Tire & Auto`]), what: () => 'Roadside service station' },
  'Train depot': { w: 1.5, owner: 'Municipal', yb: [1885, 1930], sqft: [1500, 9000], ceil: [12, 24], park: [8, 60], modes: ['interior', 'exterior'], feats: [['platform', 'waiting room'], ['freight house', 'telegraph office']], name: (s, t) => pick([`${t} Depot`, `${t} Union Station`, `${s} Freight House`]), what: () => 'Former railroad depot' },
  'Grain elevator or mill': { w: 3, owner: 'Private', yb: [1900, 1975], sqft: [3000, 40000], ceil: [20, 90], park: [10, 80], modes: ['exterior', 'interior'], feats: [['concrete silos', 'rail spur'], ['water wheel', 'brick mill']], name: (s, t) => pick([`${t} Cooperative Elevator`, `${s} Flour Mill`, `${s} Grain & Feed`]), what: () => 'Disused agricultural-industrial site' },
  'Campus building': { w: 2, owner: 'State', yb: [1890, 1985], sqft: [8000, 120000], ceil: [10, 30], park: [30, 400], modes: ['interior', 'exterior'], feats: [['lecture hall', 'quadrangle'], ['1970s interior', 'brutalist concrete'], ['balcony gallery', 'lecture hall']], name: (s, t) => pick([`${s} Hall, ${t} State College`, `${t} Student Union`, `${s} Science Building`]), what: () => 'State college building' },
}
const otherKeys = Object.keys(OTHER)
const wPairs = otherKeys.map((k) => [k, OTHER[k].w])
const TARGET = 4200
while (library.length < TARGET) {
  const type = weighted(wPairs)
  const cfg = OTHER[type]
  const t = chance(0.04) ? ellery : pick(towns)
  const county = countyByName[t.county]
  const s = pick(SURNAMES)
  const y = int(cfg.yb[0], cfg.yb[1])
  const style = styleFor(y)
  const feats = pick(cfg.feats)
  const ownerType = type === 'Residence' || cfg.owner === 'Private' ? (chance(0.07) ? 'Municipal' : 'Private') : cfg.owner === 'State' ? (chance(0.8) ? 'State' : 'Municipal') : (chance(0.1) ? 'Private' : 'Municipal')
  const status = statusRoll()
  const eras = lookEras(y, feats.includes('1970s interior') ? 1 : 0.18)
  if (feats.includes('1970s interior') && !eras.includes('1970s')) eras.push('1970s')
  const hasSq = cfg.sqft[1] > 0
  const x = t.x + (R.f() - 0.5) * 10, yy = t.y + (R.f() - 0.5) * 10
  const name = cfg.name(s, t.name)
  const loc = {
    id: nextId(), name, county: t.county, town: t.name, type,
    ownerType, ownerName: ownerType === 'Private' ? (type === 'Residence' ? `${s} family` : `${pick(SURNAMES)} Holdings LLC`) : ownerNames(ownerType, t.name),
    contact: contactFor(ownerType, ownerType === 'Private' ? 'Owner' : 'Facilities manager', status),
    yearBuilt: y, styles: [style], lookEras: eras.sort(),
    sqft: hasSq ? int(cfg.sqft[0], cfg.sqft[1]) : 0, ceilingFt: hasSq ? int(cfg.ceil[0], cfg.ceil[1]) : 0,
    power: pick(['Full 200A service', 'Full 200A service', 'Limited — 100A', 'Generator required', 'Three-phase available']),
    parking: int(cfg.park[0], cfg.park[1]), drive: t.name === 'Ellery' ? int(4, 14) : Math.max(4, driveFrom(x, yy, county.roadFactor)), x, y: yy,
    photos: photoCount(), productions: chance(0.33) ? productions(int(1, 3)) : [],
    permitLead: ownerType === 'Private' ? int(3, 21) : int(14, 60), permitIssuer: ownerType === 'Private' ? 'Owner agreement (no permit)' : ownerType === 'State' ? 'State Facilities Division' : `${t.name} City Clerk`,
    rate: ownerType === 'Private' ? pick([500, 800, 1000, 1500, 2500, 3500]) : pick([300, 600, 900, 1200]),
    blackouts: blackoutsFor(ownerType === 'Private' ? BLK_PRIVATE : BLK_PUBLIC, 0.22),
    features: feats, shootModes: cfg.modes,
    summary: '',
  }
  loc.summary = `${cfg.what({ style })} in ${t.name}, ${t.county} County. ${style}, built ${y}${hasSq ? `, about ${loc.sqft.toLocaleString('en-US')} sq ft` : ''}. Notable: ${feats.join(', ')}.`
  library.push(loc)
}

// finalize
for (const l of library) {
  l.avail = availability(l.blackouts)
  l.lastProduction = l.productions[0] || null
  l.blob = [l.name, l.county, l.town, l.type, l.styles.join(' '), l.lookEras.join(' '), l.features.join(' '), l.summary].join(' ').toLowerCase()
}
export const LIBRARY = library
export const BY_ID = Object.fromEntries(library.map((l) => [l.id, l]))
export const findByName = (n) => library.find((l) => l.name === n)
export const COUNTS = {
  total: library.length,
  courthouses: library.filter((l) => l.type === 'Courthouse').length,
  balcony: library.filter((l) => l.type === 'Courthouse' && l.court.balcony).length,
  streets: library.filter((l) => l.type === 'Main street segment').length,
  yards: library.filter((l) => l.type === 'Rail yard').length,
  dotYards: library.filter((l) => l.type === 'Rail yard' && l.ownerType === 'State').length,
}
