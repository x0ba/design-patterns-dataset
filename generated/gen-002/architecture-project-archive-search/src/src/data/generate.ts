import { FEATURED, makeSheets } from './featured'
import { int, mulberry32, pick, shuffle, type Rng } from './rng'
import type { Pattern, Project, SheetKind } from './types'
import { AWARDS, BUILDING_TYPES, CITIES, LEADS_EARLY, LEADS_LATE, LEADS_MID } from './vocab'

export const TOTALS = { projects: 1840, drawings: 64300, photos: 22100, specDocs: 3900 }

const PLACES = [
  'Northgate', 'Juniper Ridge', 'Cascade View', 'Willow Bend', 'Harbor Point', 'Maple Valley', 'Elk Run', 'Bridgeport', 'Fairview',
  'Lakewood', 'Pine Hollow', 'Silver Lake', 'Cedar Hills', 'Alder Creek', 'Hawthorne', 'Riverbend', 'Orchard Park', 'Sunnyslope',
  'Marymoor', 'Tillicum', 'Rainier Vista', 'Columbia Heights', 'Kingsgate', 'Shoreline', 'Fircrest', 'Meridian', 'Garfield',
  'Laurelhurst', 'Sellwood', 'Montavilla', 'Hayden Lake', 'Rimrock', 'Ponderosa', 'Crestview', 'Discovery Bay', 'Old Mill',
  'Foundry District', 'Southport', 'Sandpoint', 'Twin Bridges', 'Larch Mountain', 'Wedgwood', 'Sylvan', 'Beacon Hill', 'Ironwood',
  'Quarry Ridge', 'Mill Creek', 'Cottonwood', 'Prospect Hill', 'Eastlake', 'Tumwater Falls', 'Gold Bar', 'Spring Creek',
]
const STREETS = [
  'Fourth Avenue', 'Union Street', 'Alder Street', 'Market Street', 'Broadway', 'Division Street', 'Main Street', 'Jefferson Street',
  'Pacific Avenue', 'Commercial Street', 'Front Street', 'Water Street', 'Grand Avenue', 'Yesler Way', 'Belmont', 'Holgate', 'Mercer Street',
  'Cherry Street', 'Lincoln Way', 'Hawthorne Boulevard',
]
const PEOPLE = [
  'Maya Angelou', 'Chief Joseph', 'Fred Korematsu', 'Wing Luke', 'Thurgood Marshall', 'Rachel Carson', 'Bertha Landes', 'Ida B. Wells',
  'Roberto Clemente', 'Cesar Chavez', 'Daniel Inouye', 'Billy Frank Jr.', 'Grace Hopper', 'Sally Ride', 'Minoru Yamasaki', 'Mary Ann Shadd',
]
const UNIV_CITY: Record<string, string> = {
  'Northlake University': 'Seattle, WA',
  'Cascadia State University': 'Bellingham, WA',
  'Puget Sound Technical College': 'Tacoma, WA',
  'Columbia Basin University': 'Kennewick, WA',
  'Willamette Pacific University': 'Salem, OR',
  'Inland Northwest University': 'Spokane, WA',
  'Evergreen Valley College': 'Olympia, WA',
  'Salish Sea Community College': 'Everett, WA',
  'Snake River State University': 'Boise, ID',
  'High Desert University': 'Bend, OR',
}
const UNIVS = Object.keys(UNIV_CITY)
const HALLS = ['Engineering Commons', 'Student Union', 'Residence Hall', 'Center for the Arts', 'Nursing Education Building', 'Business School', 'Recreation Center', 'Learning Commons', 'Hall of Sciences']
const HEALTH = [
  ['St. Brendan Health', 'St. Brendan Medical Center'],
  ['Cascade Regional Health', 'Cascade Regional Medical Center'],
  ['Mercy Ridge Health', 'Mercy Ridge Hospital'],
  ['Providence Hill Medical', 'Providence Hill Hospital'],
  ['Valley Crest Health', 'Valley Crest Medical Center'],
  ['Columbia Basin Health', 'Columbia Basin Regional Hospital'],
  ['Harbor Behavioral Health', 'Harbor Behavioral Health Center'],
] as const
const HEALTH_CITIES: Record<string, string[]> = {
  'St. Brendan Health': ['Tacoma, WA', 'Seattle, WA', 'Olympia, WA'],
  'Cascade Regional Health': ['Olympia, WA', 'Tacoma, WA', 'Everett, WA'],
  'Mercy Ridge Health': ['Salem, OR', 'Eugene, OR', 'Portland, OR'],
  'Providence Hill Medical': ['Portland, OR', 'Hillsboro, OR', 'Vancouver, WA'],
  'Valley Crest Health': ['Boise, ID', 'Spokane, WA', "Coeur d'Alene, ID"],
  'Columbia Basin Health': ['Kennewick, WA', 'Yakima, WA', 'Spokane, WA'],
  'Harbor Behavioral Health': ['Seattle, WA', 'Bellingham, WA', 'Everett, WA'],
}
const HEALTH_WINGS = ['Surgical Pavilion', 'Emergency Department Expansion', 'Cancer Center', 'Women’s & Infants Tower', 'Outpatient Clinic', 'Central Plant & Loading', 'Imaging Center', 'Inpatient Tower Renovation', 'Rehabilitation Center']
const COMPANIES = [
  'Larchmont Software', 'Tidewater Biologics', 'Ellison Freight', 'Foundry Robotics', 'Kestrel Outdoor', 'Mountain Ledger Bank',
  'Halyard Logistics', 'Cobalt Bay Games', 'Orca Analytics', 'Pinnacle Timber Co.', 'Sitka Mutual Insurance', 'Northwind Coffee Roasters',
]
const DEVELOPERS = [
  'Crescent Ridge Development', 'Alder & Pike Partners', 'Meridian Urban', 'Stillwater Housing', 'Gable Street Capital',
  'Westline Properties', 'Copperleaf Communities', 'Two Rivers Housing Authority',
]
function transitFor(city: string) {
  const c = cityName(city)
  if (['Seattle', 'Bellevue', 'Redmond', 'Renton'].includes(c)) return 'Metro Cascade Transit'
  if (['Tacoma', 'Everett', 'Olympia'].includes(c)) return 'Sound County Transit'
  if (['Spokane', "Coeur d'Alene", 'Yakima', 'Kennewick'].includes(c)) return 'Inland Valley Transit Authority'
  if (['Portland', 'Hillsboro', 'Vancouver'].includes(c)) return 'TriRiver Transit'
  if (c === 'Boise') return 'Treasure Valley Transit'
  return `${c} Transit`
}
const districtFor = (city: string) => (['Seattle', 'Tacoma', 'Spokane', 'Portland', 'Everett'].includes(cityName(city)) ? `${cityName(city)} Public Schools` : `${cityName(city)} School District`)
const APTS = ['The Larkin', 'The Halden', 'The Marlowe', 'The Vireo', 'The Copperline', 'The Arbor', 'The Wren', 'The Fennimore', 'The Sedge', 'The Kittredge']

const cityName = (c: string) => c.split(',')[0]

type Who = { name: string; client: string; sector: string; city?: string }

function identity(r: Rng, type: string, city: string): Who {
  const place = pick(r, PLACES)
  const cn = cityName(city)
  switch (type) {
    case 'Parking': {
      const k = r()
      if (k < 0.25) {
        const [client, hosp] = pick(r, HEALTH.slice(1))
        return { name: `${hosp} ${pick(r, ['Garage', 'Parking Structure', 'Visitor Garage', 'Staff Garage'])} ${pick(r, ['A', 'C', 'D', 'East', 'West', 'North'])}`, client, sector: 'Healthcare', city: pick(r, HEALTH_CITIES[client]) }
      }
      if (k < 0.45) {
        const u = pick(r, UNIVS)
        return { name: `${u} Parking Structure ${int(r, 2, 9)}`, client: u, sector: 'Higher Education', city: UNIV_CITY[u] }
      }
      if (k < 0.62) {
        return { name: `${place} ${pick(r, ['Park & Ride', 'Transit Garage', 'Station Garage'])}`, client: transitFor(city), sector: 'Transit' }
      }
      if (k < 0.82) {
        return { name: `${pick(r, STREETS)} ${pick(r, ['Garage', 'Public Parking', 'Parking Structure'])}`, client: `City of ${cn}`, sector: 'Municipal' }
      }
      return { name: `${place} ${pick(r, ['Retail Garage', 'Office Garage', 'Mixed-Use Garage'])}`, client: pick(r, DEVELOPERS), sector: 'Private Developer' }
    }
    case 'Healthcare': {
      const [client, hosp] = pick(r, HEALTH)
      const hc = pick(r, HEALTH_CITIES[client])
      return r() < 0.7
        ? { name: `${hosp} ${pick(r, HEALTH_WINGS)}`, client, sector: 'Healthcare', city: hc }
        : { name: `${place} ${pick(r, ['Community Clinic', 'Medical Office Building', 'Urgent Care', 'Dialysis Center'])}`, client, sector: 'Healthcare', city: hc }
    }
    case 'Multifamily Housing':
      return r() < 0.5
        ? { name: `${pick(r, APTS)} at ${place}`, client: pick(r, DEVELOPERS), sector: 'Private Developer' }
        : { name: `${pick(r, STREETS)} ${pick(r, ['Lofts', 'Commons', 'Family Housing', 'Senior Housing', 'Flats'])}`, client: pick(r, DEVELOPERS), sector: 'Private Developer' }
    case 'K–12 Education': {
      const k = r()
      const client = districtFor(city)
      if (k < 0.4) return { name: `${pick(r, PEOPLE)} Elementary School`, client, sector: 'K–12 Public' }
      if (k < 0.7) return { name: `${place} ${pick(r, ['Middle School', 'High School Modernization', 'High School'])}`, client, sector: 'K–12 Public' }
      return { name: `${pick(r, PEOPLE)} ${pick(r, ['Middle School', 'K–8 School', 'STEM Academy'])}`, client, sector: 'K–12 Public' }
    }
    case 'Higher Education': {
      const u = pick(r, UNIVS)
      return { name: `${u} ${pick(r, HALLS)}`, client: u, sector: 'Higher Education', city: UNIV_CITY[u] }
    }
    case 'Office & Workplace': {
      const c = pick(r, COMPANIES)
      return r() < 0.5
        ? { name: `${c} Headquarters`, client: c, sector: 'Corporate' }
        : { name: `${int(r, 100, 1900)} ${pick(r, STREETS)}`, client: pick(r, DEVELOPERS), sector: 'Private Developer' }
    }
    case 'Civic & Municipal':
      return {
        name: r() < 0.5 ? `${cn} ${pick(r, ['City Hall', 'Municipal Court', 'Public Works Operations Center', 'Emergency Operations Center', 'Permit Center'])}` : `${place} ${pick(r, ['Fire Station', 'Police Precinct', 'Community Services Building'])}${r() < 0.5 ? ' ' + int(r, 2, 31) : ''}`,
        client: `City of ${cn}`,
        sector: 'Municipal',
      }
    case 'Transit':
      return { name: `${place} ${pick(r, ['Transit Center', 'Station', 'Bus Base', 'Light Rail Station', 'Operations & Maintenance Facility'])}`, client: transitFor(city), sector: 'Transit' }
    case 'Cultural & Performing Arts':
      return { name: `${place} ${pick(r, ['Arts Center', 'Museum Expansion', 'Performing Arts Hall', 'Heritage Center', 'Community Theater'])}`, client: `${place} ${pick(r, ['Arts Foundation', 'Historical Society', 'Cultural Trust'])}`, sector: 'Nonprofit & Cultural' }
    case 'Library':
      return { name: `${place} ${pick(r, ['Branch Library', 'Library & Community Room', 'Public Library'])}`, client: `${cn} Public Library`, sector: 'Municipal' }
    case 'Recreation':
      return { name: `${place} ${pick(r, ['Aquatic Center', 'Community Center', 'Recreation Center', 'Boathouse', 'Park Pavilion'])}`, client: `${cn} Parks & Recreation`, sector: 'Municipal' }
    case 'Laboratory':
      return r() < 0.5
        ? (() => {
            const u = pick(r, UNIVS)
            return { name: `${u} ${pick(r, ['Life Sciences Building', 'Chemistry Labs', 'Research Annex'])}`, client: u, sector: 'Higher Education', city: UNIV_CITY[u] }
          })()
        : { name: `${pick(r, ['Tidewater Biologics', 'Foundry Robotics', 'Orca Analytics'])} ${pick(r, ['R&D Building', 'Lab Fit-out', 'Pilot Plant'])}`, client: pick(r, COMPANIES), sector: 'Corporate' }
    default: {
      const c = pick(r, COMPANIES)
      return { name: `${c} ${pick(r, ['Office Interiors, Floors ' + int(r, 3, 9) + '–' + int(r, 10, 14), 'Workplace Refresh', 'Studio Fit-out'])}`, client: c, sector: 'Corporate' }
    }
  }
}

const PARKING_MATS = ['Precast concrete', 'Post-tensioned concrete', 'Cast-in-place concrete', 'Galvanized steel', 'Stainless steel cable mesh', 'Green screen (planted)', 'Metal panel', 'Brick masonry', 'Terracotta', 'Photovoltaic canopy']
const BUILDING_MATS = ['Curtain wall glazing', 'Brick masonry', 'Terracotta', 'Fiber cement', 'Zinc cladding', 'Metal panel', 'Mass timber (CLT)', 'Glulam', 'Cast-in-place concrete', 'Precast concrete', 'Stone', 'Channel glass', 'Weathering steel', 'Wood siding']

function patternFor(m: string): [Pattern, string] {
  if (m === 'Perforated metal') return ['perf-round', '#a7aaa9']
  if (m === 'Expanded metal mesh') return ['mesh', '#aeb0ad']
  if (m === 'Stainless steel cable mesh') return ['cable', '#b8b6b0']
  if (m === 'Green screen (planted)') return ['green', '#b5b2a8']
  if (m.includes('concrete')) return ['precast', '#c9c4ba']
  if (m === 'Brick masonry') return ['brick', '#9a5a43']
  if (m === 'Curtain wall glazing' || m === 'Channel glass') return ['glass', '#7f939c']
  if (m === 'Mass timber (CLT)' || m === 'Glulam' || m === 'Wood siding') return ['timber', '#a27b52']
  if (m === 'Terracotta') return ['terracotta', '#b8704d']
  if (m === 'Zinc cladding' || m === 'Metal panel' || m === 'Galvanized steel') return ['zinc', '#76797b']
  if (m === 'Weathering steel') return ['zinc', '#7a4a2e']
  if (m === 'Stone') return ['fibercement', '#cfc6b5']
  return ['fibercement', '#d2cdc2']
}

const FACADE: Record<string, string[]> = {
  'Perforated metal': ['Perforated aluminum screen panels over the {struct} frame', 'Perforated metal rainscreen with a {mood} hole pattern', 'Perforated steel sunshades on the south and west faces'],
  'Expanded metal mesh': ['Expanded metal mesh screen in framed panels', 'Expanded aluminum mesh over the {struct} spandrels'],
  'Stainless steel cable mesh': ['Stainless cable net with a {mood} vine planting plan', 'Woven stainless cable mesh guard screen at each level'],
  'Green screen (planted)': ['Modular planted green screen on welded-wire trellis', 'Planted trellis bays between {struct} piers'],
  'Precast concrete': ['Acid-etched precast spandrels with {mood} reveals', 'Sandblasted precast panels with punched openings'],
  'Post-tensioned concrete': ['Exposed post-tensioned slab edges with painted guard cables', 'Board-formed concrete upturns and stair cores'],
  'Cast-in-place concrete': ['Board-formed concrete with {mood} tie-hole layout', 'Exposed concrete frame with infill glazing'],
  'Galvanized steel': ['Galvanized steel guardrails and stair enclosures', 'Galvanized steel fins at each column line'],
  'Metal panel': ['Flat-lock metal panel rainscreen in two tones', 'Corrugated metal panel cladding with {mood} reveals'],
  'Brick masonry': ['Running-bond brick with corbelled {mood} bands', 'Brick veneer with stack-bond accent panels'],
  Terracotta: ['Terracotta baguette screen over curtain wall', 'Extruded terracotta rainscreen in {mood} glazes'],
  'Photovoltaic canopy': ['Roof-level PV canopy over the top deck'],
  'Curtain wall glazing': ['Unitized curtain wall with {mood} fritted spandrels', 'Stick-built curtain wall with deep vertical caps'],
  'Fiber cement': ['Fiber-cement panel rainscreen in a {mood} module', 'Fiber-cement lap siding with metal trim'],
  'Zinc cladding': ['Standing-seam zinc cladding', 'Pre-weathered zinc panels with recessed windows'],
  'Mass timber (CLT)': ['Exposed CLT floor plates behind a glazed ground floor', 'CLT structure with metal-panel envelope'],
  Glulam: ['Glulam post-and-beam frame with clerestory glazing', 'Exposed glulam roof structure and timber soffits'],
  Stone: ['Basalt stone base with plaster above', 'Honed limestone panels on a curtain wall'],
  'Channel glass': ['Channel-glass lantern at the entry', 'Translucent channel-glass stair towers'],
  'Weathering steel': ['Weathering steel panels with laser-cut reveals', 'Weathering steel fins and entry canopy'],
  'Wood siding': ['Vertical cedar siding with a charred finish', 'Western red cedar rainscreen'],
}
const MOODS = ['staggered', 'irregular', 'tight', 'loose', 'graduated', 'muted', 'warm', 'shadow-line']

function facadeText(r: Rng, mats: string[], type: string) {
  const struct = mats.find((m) => m.includes('concrete'))?.split(' ')[0].toLowerCase() ?? (type === 'Parking' ? 'precast' : 'steel')
  const lead = (pick(r, FACADE[mats[0]] ?? ['Rainscreen cladding'])).replace('{struct}', struct).replace('{mood}', pick(r, MOODS))
  const second = mats[1] && FACADE[mats[1]] ? '; ' + pick(r, FACADE[mats[1]]).replace('{struct}', struct).replace('{mood}', pick(r, MOODS)).toLowerCase() : ''
  return lead + second + '.'
}

function summaryText(r: Rng, type: string, levels: number, stalls: number | undefined, sf: number) {
  const ksf = `${Math.round(sf / 1000)},000 sf`
  switch (type) {
    case 'Parking':
      return `${levels}-level, ${stalls}-stall garage${pick(r, [' with ground-floor retail liner', ' with EV charging on two levels', ' over a bike hub and transit plaza', ' replacing a surface lot', ' with a public roof deck', ''])}.`
    case 'Healthcare':
      return `${ksf} ${pick(r, ['addition', 'renovation and addition', 'new building'])} ${pick(r, ['kept fully operational through construction', 'organized around a daylit public concourse', 'with a dedicated ambulance entry', 'built in four phases'])}.`
    case 'K–12 Education':
      return `${ksf} school for ${int(r, 4, 16) * 100} students ${pick(r, ['around a central learning commons', 'with a shared gym and community wing', 'on a constrained urban site', 'designed for net-zero energy'])}.`
    case 'Multifamily Housing':
      return `${levels}-story, ${int(r, 6, 32) * 10}-unit building ${pick(r, ['over podium parking', 'with ground-floor retail', 'with a courtyard and shared roof deck', 'of affordable family housing'])}.`
    case 'Interiors':
      return `${ksf} interior ${pick(r, ['workplace refresh', 'fit-out', 'consolidation'])} across ${Math.max(1, Math.round(levels / 2))} floors.`
    default:
      return `${ksf}, ${levels}-story ${type.toLowerCase()} building ${pick(r, ['with a public ground floor', 'targeting LEED Gold', 'on a former industrial site', 'renovated from a 1950s structure', ''])}.`.replace(' .', '.')
  }
}

const DETAIL_POOL: Record<string, string[]> = {
  'Perforated metal': ['Perforated Panel Elevations', 'Panel Attachment at Spandrel', 'Screen Corner Detail'],
  'Expanded metal mesh': ['Mesh Panel Frame', 'Mesh Attachment at Slab Edge'],
  'Stainless steel cable mesh': ['Cable Net Tensioning Hardware'],
  'Green screen (planted)': ['Trellis & Planter Details'],
  'Precast concrete': ['Precast Spandrel Connections', 'Precast Joint Details'],
  'Post-tensioned concrete': ['PT Slab Edge & Guard Cable'],
  'Brick masonry': ['Masonry Wall Sections', 'Brick Shelf Angle Detail'],
  'Curtain wall glazing': ['Curtain Wall Head, Sill & Jamb', 'Curtain Wall at Slab Edge'],
  'Mass timber (CLT)': ['CLT Panel Connections', 'Timber-to-Concrete Transfer'],
  Glulam: ['Glulam Beam Seat Details'],
  Terracotta: ['Terracotta Baguette Attachment'],
  'Zinc cladding': ['Zinc Panel Wall Sections'],
  'Metal panel': ['Metal Panel Wall Sections'],
  'Fiber cement': ['Rainscreen Wall Sections'],
}
const GENERIC_DETAILS = ['Typical Wall Section', 'Roof Edge & Parapet', 'Stair Details', 'Guardrail & Handrail Details', 'Entry Canopy Details', 'Window Head & Sill']
const SCALES = ['3" = 1\'-0"', '1 1/2" = 1\'-0"', '1" = 1\'-0"', '3/4" = 1\'-0"']

function genSheets(r: Rng, id: string, mats: string[], cy: number) {
  const titles: string[] = []
  for (const m of mats) for (const t of DETAIL_POOL[m] ?? []) if (r() < 0.75) titles.push(t)
  const n = int(r, 2, 6)
  for (const t of shuffle(r, [...GENERIC_DETAILS])) if (titles.length < n) titles.push(t)
  const issued = `${cy}-${String(int(r, 1, 12)).padStart(2, '0')}-${String(int(r, 1, 28)).padStart(2, '0')}`
  const series = int(r, 5, 5) * 100 + int(r, 0, 6) * 10
  return makeSheets(
    id,
    issued,
    titles.slice(0, Math.max(n, 2)).map((t, i): [string, string, SheetKind, string] => [
      `A-${series + i + 1}`,
      t,
      t.includes('Elevation') ? 'Elevation' : t.includes('Section') ? 'Section' : 'Detail',
      pick(r, SCALES),
    ]),
  )
}

const SPEC_FOR: Record<string, string> = {
  'Precast concrete': '03 41 00',
  'Post-tensioned concrete': '03 38 00',
  'Cast-in-place concrete': '03 30 00',
  'Brick masonry': '04 20 00',
  'Mass timber (CLT)': '06 17 19',
  Glulam: '06 18 00',
  'Metal panel': '07 42 13',
  'Zinc cladding': '07 42 13',
  'Fiber cement': '07 46 46',
  'Curtain wall glazing': '08 44 13',
  'Channel glass': '08 45 00',
  'Photovoltaic canopy': '26 31 00',
  'Green screen (planted)': '32 93 00',
  Terracotta: '07 42 43',
}

function normalize(list: Project[], key: 'drawings' | 'photos' | 'specDocs', target: number, r: Rng) {
  const fixed = list.filter((p) => p.featured).reduce((s, p) => s + p[key], 0)
  const gen = list.filter((p) => !p.featured)
  const raw = gen.reduce((s, p) => s + p[key], 0)
  const k = (target - fixed) / raw
  for (const p of gen) p[key] = Math.max(key === 'specDocs' ? 1 : 2, Math.round(p[key] * k))
  let diff = target - list.reduce((s, p) => s + p[key], 0)
  while (diff !== 0) {
    const p = gen[Math.floor(r() * gen.length)]
    const step = diff > 0 ? 1 : -1
    if (p[key] + step >= (key === 'specDocs' ? 1 : 2)) {
      p[key] += step
      diff -= step
    }
  }
}

function build(): Project[] {
  const r = mulberry32(20261116)
  const featuredTypes = new Map<string, number>()
  for (const p of FEATURED) featuredTypes.set(p.type, (featuredTypes.get(p.type) ?? 0) + 1)

  const types: string[] = []
  for (const [t, n] of BUILDING_TYPES) for (let i = 0; i < n - (featuredTypes.get(t) ?? 0); i++) types.push(t)
  shuffle(r, types)

  const years: number[] = []
  const weights: number[] = []
  for (let y = 1994; y <= 2026; y++) {
    years.push(y)
    weights.push((0.6 + (y - 1994) * 0.05) * (y === 2026 ? 0.6 : 1))
  }
  const wsum = weights.reduce((a, b) => a + b, 0)
  const sampleYear = () => {
    let x = r() * wsum
    for (let i = 0; i < years.length; i++) if ((x -= weights[i]) <= 0) return years[i]
    return 2025
  }

  const names = new Set(FEATURED.map((p) => p.name))
  const out: Project[] = []
  for (const type of types) {
    const year = sampleYear()
    let city = pick(r, CITIES)
    let who = identity(r, type, city)
    for (let k = 0; k < 30 && names.has(who.name); k++) who = identity(r, type, city)
    for (let ph = 2; names.has(who.name); ph++) who = { ...who, name: `${who.name.replace(/ Phase \d+$/, '')} Phase ${ph}` }
    names.add(who.name)
    if (who.city) city = who.city

    const isParking = type === 'Parking'
    const pool = [...(isParking ? PARKING_MATS : BUILDING_MATS)]
    const allowPerf = !(isParking && year >= 2012 && year <= 2024)
    if (r() < (isParking ? 0.1 : 0.045) && allowPerf) pool.unshift('Perforated metal')
    else if (r() < 0.03 && allowPerf) pool.unshift('Expanded metal mesh')
    const mats: string[] = []
    if (pool[0] === 'Perforated metal' || pool[0] === 'Expanded metal mesh') mats.push(pool.shift()!)
    const nm = int(r, 2, 4)
    while (mats.length < nm) {
      const m = pick(r, pool)
      if (!mats.includes(m)) mats.push(m)
    }
    if (mats.includes('Perforated metal') && r() < 0.5) mats.push('Anodized aluminum')

    let levels = isParking ? int(r, 3, 8) : int(r, 1, 6)
    const stalls = isParking ? levels * int(r, 70, 150) : undefined
    const sizeSf = isParking ? (stalls ?? 0) * int(r, 310, 360) : int(r, 8, 180) * 1000 * (type === 'Healthcare' ? 2 : 1)
    if (!isParking) levels = Math.min(type === 'Multifamily Housing' ? 8 : 7, Math.max(type === 'Multifamily Housing' ? 4 : 1, Math.round(sizeSf / 30000) + int(r, 0, 1)))
    const [pattern, body] = patternFor(mats[0])
    const commissionYear = year - int(r, 1, 3)

    const specs = new Set<string>()
    for (const m of mats) if (SPEC_FOR[m]) specs.add(SPEC_FOR[m])
    if (r() < 0.6) specs.add('05 50 00')
    if (isParking && r() < 0.5) specs.add('11 12 00')
    if (r() < 0.2) specs.add('10 14 00')
    if (r() < 0.15) specs.add('05 73 00')
    if (r() < 0.12) specs.add('26 56 00')

    const awardPool = AWARDS.filter((a) => {
      if (a.startsWith('WoodWorks')) return mats.some((m) => m.includes('timber') || m === 'Glulam' || m === 'Wood siding')
      if (a.startsWith('Learning By Design')) return type === 'K–12 Education' || type === 'Higher Education'
      if (a.startsWith('Healthcare Design')) return type === 'Healthcare'
      if (a.startsWith('IPMI')) return isParking
      if (a.startsWith('IIDA')) return type === 'Interiors' || type === 'Office & Workplace'
      if (a.startsWith('AIA Portland')) return city.endsWith('OR')
      if (a.startsWith('AIA Seattle')) return city.endsWith('WA')
      if (a.startsWith('AIA Washington')) return city.endsWith('WA') && (who.sector === 'Municipal' || who.sector === 'Transit')
      return true
    })
    const award = r() < 0.075 ? [`${pick(r, awardPool)}, ${Math.min(2026, year + int(r, 0, 1))}`] : []
    const drawings = Math.round((isParking ? 50 : 30) + Math.sqrt(sizeSf) * (0.2 + r() * 0.15))
    const lead = year < 2004 ? pick(r, LEADS_EARLY) : year < 2013 ? pick(r, r() < 0.8 ? LEADS_MID : LEADS_EARLY) : pick(r, r() < 0.8 ? LEADS_LATE : LEADS_MID)

    out.push({
      id: '',
      commissionYear,
      seq: 0,
      year,
      name: who.name,
      client: who.client,
      sector: who.sector,
      type,
      city,
      lead,
      materials: mats,
      awards: award,
      specs: [...specs].sort(),
      drawings,
      photos: int(r, 4, 24) + (award.length ? 10 : 0),
      specDocs: int(r, 1, 3),
      facade: facadeText(r, mats, type),
      summary: summaryText(r, type, levels, stalls, sizeSf),
      pattern,
      body,
      sky: int(r, 0, 2),
      levels,
      sizeSf,
      stalls,
      featured: false,
      referenced: r() < 0.3 ? int(r, 1, 4) : 0,
      detailSheets: [],
      breakdown: { plans: 0, elevations: 0, sections: 0, details: 0, consultant: 0 },
      related: [],
    })
  }

  // project numbers: commission year + sequence, skipping numbers used by featured projects
  const taken = new Set(FEATURED.map((p) => p.id))
  const byCy = new Map<number, Project[]>()
  for (const p of out) byCy.set(p.commissionYear, [...(byCy.get(p.commissionYear) ?? []), p])
  for (const [cy, list] of byCy) {
    let seq = 0
    for (const p of list) {
      do seq += r() < 0.7 ? 1 : 2
      while (taken.has(`${cy}-${String(seq).padStart(3, '0')}`))
      p.seq = seq
      p.id = `${cy}-${String(seq).padStart(3, '0')}`
    }
  }

  // 05 75 00 appears in exactly 41 projects
  const needSpec = 41 - FEATURED.filter((p) => p.specs.includes('05 75 00')).length
  const metalFirst = shuffle(r, out.filter((p) => p.materials.includes('Perforated metal') || p.materials.includes('Expanded metal mesh')))
  const metalSecond = shuffle(r, out.filter((p) => !metalFirst.includes(p) && (p.materials.includes('Metal panel') || p.materials.includes('Weathering steel'))))
  for (const p of [...metalFirst, ...metalSecond].slice(0, needSpec)) p.specs = [...p.specs, '05 75 00'].sort()

  const all = [...FEATURED, ...out]
  normalize(all, 'drawings', TOTALS.drawings, r)
  normalize(all, 'photos', TOTALS.photos, r)
  normalize(all, 'specDocs', TOTALS.specDocs, r)

  for (const p of out) {
    p.detailSheets = genSheets(mulberry32(p.seq * 7919 + p.commissionYear), p.id, p.materials, p.commissionYear)
    const d = p.drawings
    const details = Math.max(p.detailSheets.length, Math.round(d * 0.18))
    const plans = Math.round(d * 0.32)
    const elevations = Math.round(d * 0.1)
    const sections = Math.round(d * 0.1)
    p.breakdown = { plans, elevations, sections, details, consultant: Math.max(0, d - plans - elevations - sections - details) }
  }

  return all.sort((a, b) => b.id.localeCompare(a.id))
}

export const PROJECTS: Project[] = build()
export const BY_ID = new Map(PROJECTS.map((p) => [p.id, p]))

const relCache = new Map<string, { project: Project; count: number }[]>()
export function relatedFor(p: Project) {
  const hit = relCache.get(p.id)
  if (hit) return hit
  let res: { project: Project; count: number }[]
  if (p.related.length) {
    res = p.related.map((x) => ({ project: BY_ID.get(x.id)!, count: x.count })).filter((x) => x.project)
  } else {
    const r = mulberry32(p.seq * 31 + p.year)
    res = PROJECTS.filter((q) => q.id !== p.id)
      .map((q) => {
        let s = 0
        if (q.type === p.type) s += 3
        s += q.materials.filter((m) => p.materials.includes(m)).length * 2
        s -= Math.abs(q.year - p.year) * 0.25
        if (q.lead === p.lead) s += 1
        return { q, s }
      })
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map(({ q }) => ({ project: q, count: int(r, 2, 5) }))
      .sort((a, b) => b.count - a.count)
  }
  relCache.set(p.id, res)
  return res
}

export const SPEC_COUNTS = (() => {
  const m = new Map<string, number>()
  for (const p of PROJECTS) for (const s of p.specs) m.set(s, (m.get(s) ?? 0) + 1)
  return m
})()
