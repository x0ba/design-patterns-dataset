export type Edition = '2018' | '2021' | '2024'
export type AudienceId = 'reviewers' | 'inspectors' | 'counter' | 'public'
export type Lang = 'en' | 'es' | 'vi'

export const TODAY = '2026-11-17'
export const EFFECTIVE_2024 = '2027-01-01'
export const ADOPTED_2024 = '2026-10-21'
export const LAST_SYNC = '2026-11-03'

export const CITY = 'City of Lindenwood'

export const EDITIONS: { id: Edition; label: string; status: string; amendments: number; note: string }[] = [
  { id: '2018', label: '2018 edition', status: 'Archived', amendments: 19, note: 'Read-only archive' },
  { id: '2021', label: '2021 edition', status: 'Current', amendments: 24, note: 'In force for applications filed before Jan 1, 2027' },
  { id: '2024', label: '2024 edition', status: 'Adopted', amendments: 31, note: 'Adopted Oct 21, 2026 · effective Jan 1, 2027' },
]

export const AUDIENCES: { id: AudienceId; name: string; short: string; size: string; detail: string }[] = [
  { id: 'reviewers', name: 'Plan reviewers', short: 'Plan reviewers', size: '22 staff', detail: 'Desktop, reviewing submitted permit applications' },
  { id: 'inspectors', name: 'Field inspectors', short: 'Field inspectors', size: '24 staff', detail: 'Tablets, often with no signal on site' },
  { id: 'counter', name: 'Counter staff', short: 'Counter staff', size: '9 staff', detail: 'Permit counter, answering walk-in questions' },
  { id: 'public', name: 'Public', short: 'Public', size: '~4,200 visits/mo', detail: 'Homeowners, contractors and design professionals' },
]

export interface AudienceSettings {
  editionRule: 'fixed' | 'permit-date'
  fixedEdition: '2021' | '2024'
  fallback: '2021' | '2024' | 'in-force'
  amendments: 'inline' | 'margin' | 'collapsed'
  summaries: boolean
  grade: number
  es: boolean
  vi: boolean
  notice: boolean
  noticeText: string
  noticeUntil: string
  bundle: Edition[]
}
export type Settings = Record<AudienceId, AudienceSettings>

const STAFF_NOTICE =
  'The 2024 Building Code and its 31 local amendments take effect January 1, 2027. Applications filed before that date are still reviewed under the 2021 edition.'
const PUBLIC_NOTICE =
  'The 2024 Building Code takes effect January 1, 2027. If you applied for your permit before that date, your project is still reviewed under the 2021 edition. Use the edition tabs to read either one.'

const base = (over: Partial<AudienceSettings> = {}): AudienceSettings => ({
  editionRule: 'fixed',
  fixedEdition: '2021',
  fallback: 'in-force',
  amendments: 'inline',
  summaries: false,
  grade: 8,
  es: false,
  vi: false,
  notice: false,
  noticeText: STAFF_NOTICE,
  noticeUntil: '2027-04-01',
  bundle: ['2021'],
  ...over,
})

// What is live today: everyone sees 2021, inline amendments, summaries for the public only, grade 8.
export const PUBLISHED: Settings = {
  reviewers: base(),
  inspectors: base(),
  counter: base(),
  public: base({ summaries: true, es: true, noticeText: PUBLIC_NOTICE, noticeUntil: '2027-07-01' }),
}

// Priya's working draft: the changes she described, not yet submitted.
export const DRAFT_START: Settings = {
  reviewers: base({ editionRule: 'permit-date', fallback: 'in-force' }),
  inspectors: base({ editionRule: 'permit-date', fallback: 'in-force', bundle: ['2021', '2024'] }),
  counter: base(),
  public: base({
    fixedEdition: '2024',
    summaries: true,
    es: true,
    notice: true,
    noticeText: PUBLIC_NOTICE,
    noticeUntil: '2027-07-01',
  }),
}

/* ---------- Offline bundle sizing (GB) ---------- */
export const BUNDLE_CURRENT_GB = 1.8
export const BUNDLE_PARTS: Record<Edition, number> = { '2018': 1.3, '2021': 1.62, '2024': 1.74 }
export const BUNDLE_SHARED_BASE = 0.18 // memo archive, forms, search index
export const BUNDLE_HEADROOM = 0.5

export function bundleSize(editions: Edition[]): number {
  if (!editions.length) return 0
  let s = BUNDLE_SHARED_BASE
  editions.forEach((e) => (s += BUNDLE_PARTS[e]))
  // figures and tables shared between editions are stored once
  if (editions.includes('2021') && editions.includes('2024')) s -= 0.45
  if (editions.includes('2018') && editions.length > 1) s -= 0.2
  return Math.round(s * 100) / 100
}

export interface Tablet { inspector: string; device: string; freeGb: number }
export const TABLETS: Tablet[] = [
  { inspector: 'Andre Whitaker', device: 'iPad Air · 256 GB', freeGb: 41.2 },
  { inspector: 'Beatriz Soto', device: 'iPad 10th gen · 64 GB', freeGb: 9.6 },
  { inspector: 'Calvin Ng', device: 'iPad 10th gen · 64 GB', freeGb: 1.0 },
  { inspector: 'Danielle Okoye', device: 'iPad Air · 256 GB', freeGb: 63.8 },
  { inspector: 'Elijah Brandt', device: 'iPad 10th gen · 64 GB', freeGb: 7.3 },
  { inspector: 'Farah Haddad', device: 'iPad Air · 256 GB', freeGb: 38.0 },
  { inspector: 'Gregory Lindqvist', device: 'iPad 10th gen · 64 GB', freeGb: 2.4 },
  { inspector: 'Hannah Kowalczyk', device: 'iPad Air · 256 GB', freeGb: 52.5 },
  { inspector: 'Isaiah Brooks', device: 'iPad 10th gen · 64 GB', freeGb: 11.1 },
  { inspector: 'Jun Watanabe', device: 'iPad Air · 256 GB', freeGb: 47.9 },
  { inspector: 'Katarzyna Nowak', device: 'iPad 10th gen · 64 GB', freeGb: 5.8 },
  { inspector: 'Luis Ortega', device: 'iPad Air · 256 GB', freeGb: 70.3 },
  { inspector: 'Maya Fernandes', device: 'iPad 10th gen · 64 GB', freeGb: 8.4 },
  { inspector: 'Nolan Pierce', device: 'iPad Air · 256 GB', freeGb: 33.6 },
  { inspector: 'Oksana Melnyk', device: 'iPad 10th gen · 64 GB', freeGb: 12.7 },
  { inspector: 'Pedro Alvarado', device: 'iPad 10th gen · 64 GB', freeGb: 0.8 },
  { inspector: 'Quincy Adeyemi', device: 'iPad Air · 256 GB', freeGb: 58.2 },
  { inspector: 'Rosa Delgado', device: 'iPad 10th gen · 64 GB', freeGb: 6.9 },
  { inspector: 'Samir Patel', device: 'iPad Air · 256 GB', freeGb: 44.4 },
  { inspector: 'Tanya Beaumont', device: 'iPad 10th gen · 64 GB', freeGb: 10.2 },
  { inspector: 'Umar Siddiqui', device: 'iPad Air · 256 GB', freeGb: 36.1 },
  { inspector: 'Valerie Tran', device: 'iPad 10th gen · 64 GB', freeGb: 1.1 },
  { inspector: 'Wendell Hayes', device: 'iPad 10th gen · 64 GB', freeGb: 1.9 },
  { inspector: 'Ximena Cruz', device: 'iPad Air · 256 GB', freeGb: 49.0 },
]

/* ---------- Code sections (excerpts for preview) ---------- */
type Tri = { en: string; es: string; vi?: string }
export interface Section {
  id: string
  num: string
  title: string
  chapter: string
  text: Record<'2021' | '2024', string[]>
  amend: Record<'2021' | '2024', { id: string; text: string }>
  changeNote: string
  summary: Record<'2021' | '2024', Tri>
}

export const SECTIONS: Section[] = [
  {
    id: '105.2',
    num: '105.2',
    title: 'Work exempt from permit',
    chapter: 'Chapter 1 · Administration',
    text: {
      '2021': [
        'A permit is not required for the following work, provided it does not violate this code or the Lindenwood Zoning Code:',
        '1. One-story detached accessory structures used as tool and storage sheds or playhouses, where the floor area is 120 square feet or less.',
        '2. Fences not over 7 feet high.',
        '3. Retaining walls not over 4 feet high, measured from the bottom of the footing to the top of the wall, unless they support a surcharge.',
        '4. Water tanks supported directly on grade, with a capacity of 5,000 gallons or less and a height-to-diameter ratio of 2 to 1 or less.',
      ],
      '2024': [
        'A permit is not required for the following work, provided it does not violate this code or the Lindenwood Zoning Code:',
        '1. One-story detached accessory structures used as tool and storage sheds or playhouses, where the floor area is 120 square feet or less.',
        '2. Fences not over 7 feet high.',
        '3. Retaining walls not over 4 feet high, measured from the bottom of the footing to the top of the wall, unless they support a surcharge.',
        '4. Water tanks supported directly on grade, with a capacity of 5,000 gallons or less and a height-to-diameter ratio of 2 to 1 or less.',
      ],
    },
    amend: {
      '2021': { id: 'LA-21-02', text: 'Item 2 is amended to read: Fences not over 6 feet high. A fence in a front setback shall not exceed 4 feet.' },
      '2024': {
        id: 'LA-24-03',
        text: 'Item 1 is amended to read: … where the floor area is 200 square feet or less and the structure is not located in a utility easement. Item 2 is amended to read: Fences not over 6 feet high. A fence in a front setback shall not exceed 4 feet, and a fence on a corner lot shall keep the sight triangle clear.',
      },
    },
    changeNote: 'Local shed exemption grows from 120 to 200 sq ft; corner-lot sight-triangle condition added for fences.',
    summary: {
      '2021': {
        en: 'You do not need a permit for some small projects. These include a storage shed up to 120 square feet, a fence up to 6 feet tall, a retaining wall up to 4 feet tall, and a water tank up to 5,000 gallons. A fence in the front yard can be only 4 feet tall. Zoning rules still apply, so check your setbacks before you build.',
        es: 'No necesita permiso para algunos proyectos pequeños. Entre ellos están un cobertizo de hasta 120 pies cuadrados, una cerca de hasta 6 pies de altura, un muro de contención de hasta 4 pies de altura y un tanque de agua de hasta 5,000 galones. Una cerca en el frente del lote puede medir solo 4 pies de altura. Las reglas de zonificación siguen aplicándose, así que revise los retranqueos antes de construir.',
        vi: 'Bạn không cần giấy phép cho một số công trình nhỏ, như nhà kho dưới 120 foot vuông, hàng rào cao tối đa 6 foot, tường chắn cao tối đa 4 foot và bể nước tối đa 5.000 gallon. Hàng rào phía trước nhà chỉ được cao 4 foot. Quy định phân vùng vẫn áp dụng, vì vậy hãy kiểm tra khoảng lùi trước khi xây.',
      },
      '2024': {
        en: 'You do not need a permit for some small projects. These include a storage shed up to 200 square feet, a fence up to 6 feet tall, a retaining wall up to 4 feet tall, and a water tank up to 5,000 gallons. A shed cannot sit on a utility easement. A front-yard fence can be only 4 feet tall. A fence on a corner lot must not block drivers’ view. Zoning rules still apply, so check your setbacks first.',
        es: 'No necesita permiso para algunos proyectos pequeños. Entre ellos están un cobertizo de hasta 200 pies cuadrados, una cerca de hasta 6 pies de altura, un muro de contención de hasta 4 pies de altura y un tanque de agua de hasta 5,000 galones. Un cobertizo no puede estar sobre una servidumbre de servicios públicos. Una cerca en el frente del lote puede medir solo 4 pies. Una cerca en una esquina no debe bloquear la vista de los conductores. Las reglas de zonificación siguen aplicándose, así que revise primero los retranqueos.',
        vi: 'Bạn không cần giấy phép cho một số công trình nhỏ, như nhà kho tối đa 200 foot vuông, hàng rào cao tối đa 6 foot, tường chắn cao tối đa 4 foot và bể nước tối đa 5.000 gallon. Nhà kho không được đặt trên đất dành cho tiện ích công cộng. Hàng rào ở góc phố không được che tầm nhìn của người lái xe. Quy định phân vùng vẫn áp dụng, vì vậy hãy kiểm tra khoảng lùi trước.',
      },
    },
  },
  {
    id: '903.2.8',
    num: '903.2.8',
    title: 'Group R — automatic sprinkler systems',
    chapter: 'Chapter 9 · Fire Protection',
    text: {
      '2021': ['An automatic sprinkler system installed in accordance with Section 903.3 shall be provided throughout all buildings with a Group R fire area.'],
      '2024': ['An automatic sprinkler system installed in accordance with Section 903.3 shall be provided throughout all buildings with a Group R fire area.'],
    },
    amend: {
      '2021': { id: 'LA-21-11', text: 'Exception: Detached Group R-3 buildings with a fire area of 3,600 square feet or less, on a lot with a fire hydrant within 400 feet, are not required to have an automatic sprinkler system.' },
      '2024': { id: 'LA-24-14', text: 'The exception in the 2021 local amendment is deleted. Group R-3 buildings shall be sprinklered regardless of size. Group R-2 buildings three stories or fewer may use an NFPA 13R system where attic spaces are also protected.' },
    },
    changeNote: 'Small detached R-3 sprinkler exception removed; NFPA 13R allowed for R-2 up to three stories with attic protection.',
    summary: {
      '2021': {
        en: 'Most homes and apartments need a sprinkler system. A small detached house of 3,600 square feet or less can skip it. A fire hydrant must be within 400 feet of the lot.',
        es: 'La mayoría de las casas y los apartamentos necesitan un sistema de rociadores. Una casa independiente pequeña, de 3,600 pies cuadrados o menos, puede omitirlo. Debe haber un hidrante a menos de 400 pies del lote.',
      },
      '2024': {
        en: 'All new homes and apartments need a sprinkler system. The old exception for small detached houses no longer applies. An apartment building up to three stories can use a lighter system, called 13R. The attic must be covered too.',
        es: 'Todas las casas y los apartamentos nuevos necesitan un sistema de rociadores. La antigua excepción para casas independientes pequeñas ya no se aplica. Un edificio de apartamentos de hasta tres pisos puede usar un sistema más ligero, llamado 13R. El ático también debe estar protegido.',
      },
    },
  },
  {
    id: '1507.2',
    num: '1507.2',
    title: 'Asphalt shingles',
    chapter: 'Chapter 15 · Roof Assemblies',
    text: {
      '2021': ['Asphalt shingles shall be fastened to solid or closely fitted deck material, except where the shingles are specifically designed to be applied over spaced sheathing. Asphalt shingles shall comply with ASTM D3462 and shall be installed in accordance with the manufacturer’s instructions.'],
      '2024': ['Asphalt shingles shall be fastened to solid or closely fitted deck material, except where the shingles are specifically designed to be applied over spaced sheathing. Asphalt shingles shall comply with ASTM D3462 and shall be installed in accordance with the manufacturer’s instructions.'],
    },
    amend: {
      '2021': { id: 'LA-21-19', text: 'A new asphalt shingle roof may be installed over one existing layer. Re-roofing over two or more existing layers is not permitted.' },
      '2024': { id: 'LA-24-26', text: 'Existing roof coverings shall be removed to the deck before a new covering is installed. The deck shall be inspected before underlayment is placed.' },
    },
    changeNote: 'Re-roofing over an existing layer is no longer allowed; deck inspection added before underlayment.',
    summary: {
      '2021': {
        en: 'Shingles must be nailed to a solid roof deck. Follow the maker’s instructions. You may put a new layer over one old layer. You may not have more than two layers in all.',
        es: 'Las tejas deben clavarse a una cubierta de techo sólida. Siga las instrucciones del fabricante. Puede colocar una capa nueva sobre una capa vieja. No puede haber más de dos capas en total.',
      },
      '2024': {
        en: 'Shingles must be nailed to a solid roof deck. Follow the maker’s instructions. All old roofing must come off before new shingles go on. The city must inspect the bare roof deck before the underlayment is put down.',
        es: 'Las tejas deben clavarse a una cubierta de techo sólida. Siga las instrucciones del fabricante. Todo el techado viejo debe retirarse antes de instalar las tejas nuevas. La ciudad debe inspeccionar la cubierta desnuda antes de colocar la membrana de base.',
      },
    },
  },
  {
    id: '1612.4',
    num: '1612.4',
    title: 'Design and construction in flood hazard areas',
    chapter: 'Chapter 16 · Structural Design',
    text: {
      '2021': ['Buildings and structures constructed in whole or in part in flood hazard areas, including flood hazard areas that coincide with other hazards, shall be designed and constructed in accordance with ASCE 24.'],
      '2024': ['Buildings and structures constructed in whole or in part in flood hazard areas, including flood hazard areas that coincide with other hazards, shall be designed and constructed in accordance with ASCE 24.'],
    },
    amend: {
      '2021': { id: 'LA-21-15', text: 'The lowest floor, including the basement, shall be elevated at least 1 foot above the base flood elevation.' },
      '2024': { id: 'LA-24-19', text: 'The lowest floor, including the basement, shall be elevated at least 2 feet above the base flood elevation. Mechanical and electrical equipment shall be placed at or above that elevation.' },
    },
    changeNote: 'Freeboard raised from 1 ft to 2 ft; mechanical and electrical equipment now covered.',
    summary: {
      '2021': {
        en: 'Is your building in a flood zone? Then its lowest floor must sit at least 1 foot above the expected flood level. The design must also follow the national flood standard, ASCE 24.',
        es: '¿Su edificio está en una zona inundable? Entonces su piso más bajo debe estar al menos 1 pie por encima del nivel de inundación previsto. El diseño también debe seguir la norma nacional de inundaciones, ASCE 24.',
      },
      '2024': {
        en: 'Is your building in a flood zone? Then its lowest floor must sit at least 2 feet above the expected flood level. Heating, cooling and electrical equipment must be raised to the same height. The design must also follow the national flood standard, ASCE 24.',
        es: '¿Su edificio está en una zona inundable? Entonces su piso más bajo debe estar al menos 2 pies por encima del nivel de inundación previsto. Los equipos de calefacción, aire acondicionado y electricidad deben elevarse a la misma altura. El diseño también debe seguir la norma nacional de inundaciones, ASCE 24.',
        vi: 'Tòa nhà của bạn có nằm trong vùng ngập lụt không? Nếu có, tầng thấp nhất phải cao hơn mực nước lũ dự kiến ít nhất 2 foot. Thiết bị sưởi, làm mát và điện cũng phải được nâng lên cùng độ cao. Thiết kế phải tuân theo tiêu chuẩn quốc gia ASCE 24.',
      },
    },
  },
  {
    id: '1809.5',
    num: '1809.5',
    title: 'Frost protection',
    chapter: 'Chapter 18 · Soils and Foundations',
    text: {
      '2021': [
        'Except where otherwise protected from frost, foundations and other permanent supports of buildings and structures shall be protected from the effects of frost. Protection shall be provided by one or more of the following methods:',
        '1. Extending below the frost line of the locality.',
        '2. Constructing in accordance with ASCE 32.',
        '3. Erecting on solid rock.',
      ],
      '2024': [
        'Except where otherwise protected from frost, foundations and other permanent supports of buildings and structures shall be protected from the effects of frost. Protection shall be provided by one or more of the following methods:',
        '1. Extending below the frost line of the locality.',
        '2. Constructing in accordance with ASCE 32.',
        '3. Erecting on solid rock.',
      ],
    },
    amend: {
      '2021': { id: 'LA-21-17', text: 'The frost line of the locality is 30 inches below finished grade.' },
      '2024': { id: 'LA-24-22', text: 'The frost line of the locality is 36 inches below finished grade.' },
    },
    changeNote: 'Local frost line deepened from 30 to 36 inches.',
    summary: {
      '2021': {
        en: 'Footings must reach below the depth where the ground freezes. Frozen ground can push a building up. In Lindenwood that depth is 30 inches. You can also use a frost-protected design, or build on solid rock.',
        es: 'Las zapatas deben llegar por debajo de la profundidad a la que se congela el suelo. El suelo congelado puede levantar un edificio. En Lindenwood esa profundidad es de 30 pulgadas. También puede usar un diseño protegido contra heladas o construir sobre roca sólida.',
        vi: 'Móng phải nằm sâu hơn độ sâu mà đất bị đóng băng. Đất đóng băng có thể đẩy công trình lên. Ở Lindenwood, độ sâu đó là 30 inch. Bạn cũng có thể dùng thiết kế chống băng giá hoặc xây trên nền đá cứng.',
      },
      '2024': {
        en: 'Footings must reach below the depth where the ground freezes. Frozen ground can push a building up. In Lindenwood that depth is now 36 inches. You can also use a frost-protected design, or build on solid rock.',
        es: 'Las zapatas deben llegar por debajo de la profundidad a la que se congela el suelo. El suelo congelado puede levantar un edificio. En Lindenwood esa profundidad ahora es de 36 pulgadas. También puede usar un diseño protegido contra heladas o construir sobre roca sólida.',
        vi: 'Móng phải nằm sâu hơn độ sâu mà đất bị đóng băng. Đất đóng băng có thể đẩy công trình lên. Ở Lindenwood, độ sâu đó nay là 36 inch. Bạn cũng có thể dùng thiết kế chống băng giá hoặc xây trên nền đá cứng.',
      },
    },
  },
]

/* ---------- Permits for preview ---------- */
export const PERMITS = [
  { id: 'BP-2026-07318', title: 'Rooftop mechanical screen, Alder Street Lofts', applied: '2026-09-18' },
  { id: 'BP-2026-08902', title: '22-unit apartment building, 3 stories', applied: '2026-10-27' },
  { id: 'BP-2026-09544', title: 'Single-family addition with new footings', applied: '2026-11-10' },
]

/* ---------- Interpretation memos ---------- */
export type Decision = 'retire' | 'historical' | 'keep'
export interface Memo {
  id: string
  title: string
  issued: string
  section: string
  changed: boolean
  flagged: boolean
  openPermits: number
  change?: string
  note?: string
}

const CHANGED_SECTIONS = new Set(['105.2', '903.2.8', '1507.2', '1612.4', '1809.5', '1011.5.4', '107.3.4.1'])
const FLAGGED = new Set(['IM-2018-011', 'IM-2023-018', 'IM-2024-013', 'IM-2020-004', 'IM-2019-017', 'IM-2020-002'])

const CHANGE_BY_SECTION: Record<string, string> = {
  '105.2': 'LA-24-03 raises the shed exemption to 200 sq ft and adds a corner-lot sight-triangle condition.',
  '903.2.8': 'LA-24-14 removes the small detached R-3 sprinkler exception and allows NFPA 13R for R-2 up to three stories.',
  '1507.2': 'LA-24-26 requires full tear-off to the deck and adds a deck inspection before underlayment.',
  '1612.4': 'LA-24-19 raises flood freeboard from 1 ft to 2 ft and covers mechanical and electrical equipment.',
  '1809.5': 'LA-24-22 deepens the local frost line from 30 to 36 inches.',
  '1011.5.4': '2024 §1011.5.4 tightens the riser-height tolerance and LA-24-09 removes the existing-building relaxation.',
  '107.3.4.1': '2024 §107.3.4.1 adds a 30-day limit on deferred submittals under LA-24-01.',
}

const NOTES: Record<string, string> = {
  'IM-2018-011': 'Building Official: the relaxation this memo grants is deleted by LA-24-09. Retire.',
  'IM-2023-018': 'Building Official: deck inspection is now written into LA-24-26, so the memo adds nothing. Retire.',
  'IM-2024-013': 'Building Official: the sight-triangle rule is now in LA-24-03. Retire.',
  'IM-2020-004': 'Building Official: the temporary outdoor-dining allowances expired with the 2022 emergency order. Retire.',
  'IM-2019-017': 'Building Official: sidewalk fencing is now handled by a Public Works right-of-way permit. Retire.',
  'IM-2020-002': 'Building Official: remote inspections for minor interior work are now covered by the written inspection policy. Retire.',
}

// id, title, issued, section, open 2021-edition permits citing it
const RAW: [string, string, string, string, number][] = [
  ['IM-2016-002', 'Measuring fence height on sloped lots', '2016-03-08', '105.2', 6],
  ['IM-2016-005', 'Egress window sill height in basement bedrooms', '2016-06-14', '1031.3', 0],
  ['IM-2016-009', 'Guard height at open-sided stair landings', '2016-10-02', '1015.2', 0],
  ['IM-2017-001', 'Storage sheds on utility easements', '2017-01-19', '105.2', 4],
  ['IM-2017-004', 'Re-roofing over existing wood shakes', '2017-03-27', '1507.2', 3],
  ['IM-2017-008', 'Frost depth for freestanding decks', '2017-05-30', '1809.5', 5],
  ['IM-2017-011', 'Structural review for rooftop solar arrays', '2017-09-12', '1607.13', 0],
  ['IM-2017-014', 'Accessible route at tenant improvements', '2017-11-20', '1104.1', 0],
  ['IM-2018-002', 'Fire-rated shaft enclosures at elevator hoistways', '2018-02-06', '713.4', 0],
  ['IM-2018-006', 'Sprinkler exception for detached garages', '2018-04-24', '903.2.8', 2],
  ['IM-2018-009', 'Special inspection of post-installed anchors', '2018-07-17', '1705.1.1', 0],
  ['IM-2018-011', 'Stair riser tolerance in existing buildings', '2018-08-29', '1011.5.4', 1],
  ['IM-2018-015', 'Occupant load for assembly uses under 50 people', '2018-12-04', '1004.5', 0],
  ['IM-2019-003', 'Flood elevation certificates for additions', '2019-02-12', '1612.4', 7],
  ['IM-2019-006', 'Separation at live-work units', '2019-04-09', '420.3', 0],
  ['IM-2019-010', 'Egress from mezzanines in converted warehouses', '2019-06-25', '1006.3', 0],
  ['IM-2019-013', 'Fire resistance of exterior walls near property lines', '2019-09-17', '705.5', 0],
  ['IM-2019-017', 'Temporary construction fencing near sidewalks', '2019-11-05', '3306.1', 0],
  ['IM-2020-002', 'Remote inspections for minor interior work', '2020-04-14', '110.3', 0],
  ['IM-2020-004', 'Outdoor dining structures and tents', '2020-05-26', '3103.1', 0],
  ['IM-2020-007', 'Occupancy classification of commissary kitchens', '2020-07-21', '303.3', 0],
  ['IM-2020-011', 'Exit signs at converted retail frontage', '2020-10-06', '1013.1', 0],
  ['IM-2020-014', 'Deferred submittals for fire sprinkler shop drawings', '2020-12-08', '107.3.4.1', 3],
  ['IM-2021-001', 'Deferred submittals for truss design drawings', '2021-01-12', '107.3.4.1', 8],
  ['IM-2021-003', 'Re-roofing with synthetic underlayment', '2021-02-23', '1507.2', 9],
  ['IM-2021-006', 'Mass timber char depth documentation', '2021-04-13', '602.4', 0],
  ['IM-2021-009', 'Foundation drainage at hillside lots', '2021-06-01', '1805.4', 0],
  ['IM-2021-012', 'Elevator machine room clearances', '2021-08-10', '3006.4', 0],
  ['IM-2021-015', 'Energy-code coordination for window replacement', '2021-10-19', '1301.1', 0],
  ['IM-2021-018', 'Guards at roof decks', '2021-12-07', '1015.6', 0],
  ['IM-2022-002', 'Sprinkler coverage in attics of three-story apartments', '2022-02-01', '903.2.8', 5],
  ['IM-2022-005', 'Flood-resistant equipment on the ground floor', '2022-03-22', '1612.4', 4],
  ['IM-2022-008', 'Grading permits for fill under 50 cubic yards', '2022-05-17', 'J103.2', 0],
  ['IM-2022-010', 'Stair width in existing historic buildings', '2022-07-12', '1011.2', 0],
  ['IM-2022-013', 'Door swing at electrical rooms', '2022-09-06', '1010.2', 0],
  ['IM-2022-016', 'Accessory dwelling unit fire separation', '2022-11-15', '420.2', 0],
  ['IM-2023-001', 'Cold-formed steel fire-resistance listings', '2023-01-24', '721.1', 0],
  ['IM-2023-004', 'Frost depth credit for insulated foundations', '2023-03-14', '1809.5', 6],
  ['IM-2023-007', 'Shed exemption near property lines', '2023-05-02', '105.2', 3],
  ['IM-2023-009', 'Retaining wall height at stepped terraces', '2023-06-20', '105.2', 2],
  ['IM-2023-012', 'Smoke control for atrium stairs', '2023-08-29', '909.3', 0],
  ['IM-2023-015', 'Plan review of EV charger installations', '2023-10-10', '406.2', 0],
  ['IM-2023-018', 'Re-roofing and roof deck inspection', '2023-12-05', '1507.2', 4],
  ['IM-2024-002', 'Egress width for small restaurants', '2024-02-13', '1005.3', 0],
  ['IM-2024-005', 'Substantial improvement determinations in flood zones', '2024-04-02', '1612.4', 6],
  ['IM-2024-008', 'Alternative handrail extensions at stairs', '2024-05-21', '1014.6', 0],
  ['IM-2024-010', 'Sprinkler requirement for remodeled duplexes', '2024-07-09', '903.2.8', 3],
  ['IM-2024-013', 'Corner-lot fences and sight triangles', '2024-09-03', '105.2', 2],
  ['IM-2024-016', 'Weatherproofing of exterior wall penetrations', '2024-10-22', '1404.4', 0],
  ['IM-2024-019', 'Fire-rated glazing in corridor walls', '2024-12-10', '716.1', 0],
  ['IM-2025-001', 'Hot-work permits at occupied buildings', '2025-01-14', '3303.1', 0],
  ['IM-2025-003', 'Structural observation for hillside retaining systems', '2025-02-04', '1704.6', 0],
  ['IM-2025-004', 'Smoke alarm placement in loft sleeping areas', '2025-02-25', '907.2', 0],
  ['IM-2025-006', 'Window opening control devices above the second floor', '2025-03-18', '1015.8', 0],
  ['IM-2025-008', 'Fire department access at gated communities', '2025-04-08', '503.6', 0],
  ['IM-2025-010', 'Roof drainage and secondary overflow at flat roofs', '2025-05-13', '1502.2', 0],
  ['IM-2025-011', 'Equivalent facilitation for single-user restrooms', '2025-06-03', '2902.1.2', 0],
  ['IM-2025-013', 'Occupancy changes from office to residential', '2025-06-24', '310.1', 0],
  ['IM-2025-015', 'Wood-frame podium separation at parking levels', '2025-07-15', '510.2', 0],
  ['IM-2025-017', 'Seismic bracing of rooftop mechanical units', '2025-08-12', '1613.1', 0],
  ['IM-2025-018', 'Dwelling-unit entry door width in existing buildings', '2025-09-02', '1010.1.1', 0],
  ['IM-2025-020', 'Fire-blocking in cavity walls with exterior insulation', '2025-09-30', '718.2', 0],
  ['IM-2025-022', 'Stair pressurization testing documentation', '2025-10-21', '909.20', 0],
  ['IM-2025-024', 'Photovoltaic roof setbacks for fire access', '2025-11-18', '1511.1', 0],
  ['IM-2025-026', 'Self-closing devices on dwelling-unit doors', '2025-12-09', '715.4', 0],
  ['IM-2026-001', 'Temporary certificates of occupancy for phased projects', '2026-01-13', '111.3', 0],
  ['IM-2026-003', 'Alternative materials review for engineered bamboo', '2026-02-03', '104.11', 0],
  ['IM-2026-004', 'Elevator lobby smoke barriers', '2026-02-24', '3006.2', 0],
  ['IM-2026-006', 'Detectable warnings at transit-adjacent entrances', '2026-03-17', '1111.2', 0],
  ['IM-2026-008', 'Group E storm shelter occupant load', '2026-04-07', '423.4', 0],
  ['IM-2026-009', 'Combustible exterior balcony construction', '2026-04-28', '1406.3', 0],
  ['IM-2026-011', 'Fire alarm voice evacuation in mid-rise offices', '2026-05-19', '907.5.2.2', 0],
  ['IM-2026-013', 'Existing-building egress upgrades in change of use', '2026-06-09', '1006.2', 0],
  ['IM-2026-014', 'Bicycle storage rooms and fire separation', '2026-06-30', '508.2', 0],
  ['IM-2026-016', 'Structural review of green roofs', '2026-07-21', '1607.14', 0],
  ['IM-2026-017', 'Temporary shoring at adjacent excavations', '2026-08-11', '3307.1', 0],
  ['IM-2026-019', 'Door hardware at residential bathrooms', '2026-09-01', '1010.2.4', 0],
  ['IM-2026-020', 'Inspection of fire-stopping at pipe penetrations', '2026-09-22', '714.4', 0],
  ['IM-2026-022', 'Slab-on-grade moisture mitigation under finish flooring', '2026-10-13', '1907.1', 0],
  ['IM-2026-023', 'Guard openings at stair stringers', '2026-10-27', '1015.4', 0],
  ['IM-2026-024', 'Exterior lighting at egress discharge', '2026-11-04', '1008.1', 0],
  ['IM-2016-011', 'Mixed-occupancy separation for ground-floor retail', '2016-12-13', '508.4', 0],
  ['IM-2017-016', 'Handrail graspability on existing stairs', '2017-12-12', '1014.3', 0],
  ['IM-2018-017', 'Interior finish classification in corridors', '2018-12-18', '803.1', 0],
  ['IM-2019-019', 'Parapet height at rooftop terraces', '2019-12-03', '1503.4', 0],
  ['IM-2021-020', 'Fire extinguisher cabinets in exit access corridors', '2021-12-21', '906.1', 0],
  ['IM-2022-018', 'Seating layout review for small assembly rooms', '2022-12-13', '1030.2', 0],
]

export const MEMOS: Memo[] = RAW.map(([id, title, issued, section, open]) => ({
  id,
  title,
  issued,
  section,
  changed: CHANGED_SECTIONS.has(section),
  flagged: FLAGGED.has(id),
  openPermits: open,
  change: CHANGED_SECTIONS.has(section) ? CHANGE_BY_SECTION[section] : undefined,
  note: NOTES[id],
})).sort((a, b) => (a.issued < b.issued ? -1 : 1))

export const MEMO_TOTAL = MEMOS.length // 87
export const MEMOS_NEEDING_DECISION = MEMOS.filter((m) => m.changed || m.flagged)
