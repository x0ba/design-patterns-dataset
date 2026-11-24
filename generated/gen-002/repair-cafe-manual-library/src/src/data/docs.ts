import { Doc, DocType, Scan } from './types';
import { mulberry32, pick, weighted, int, Rng } from './rng';
import { VOLUNTEERS, FORMER } from './people';

export const FEATURED_ID = 'sb-mm-2346-sm';

const K = 'Kitchen appliances';

// ---------------------------------------------------------------------------
// The 27 Sunbeam documents, entered by hand
// ---------------------------------------------------------------------------
const SUNBEAM: Doc[] = [
  {
    id: FEATURED_ID,
    type: 'service',
    title: 'Sunbeam Mixmaster 2346 / 2348 Service Manual',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    models: ['2346', '2348'],
    category: K,
    product: 'Stand mixer',
    yearFrom: 1994,
    yearTo: 1994,
    language: 'English',
    scan: 'faded',
    pages: 22,
    contributor: 'Ruth Okonjo',
    added: '2025-06-14',
    note: 'Photocopy from a retired service agent. Faded but complete. Motor, brushes and speed control are the same on both models — see p.4.',
    contents: [
      { title: 'Specifications', page: 3 },
      { title: '2346 vs 2348 differences', page: 4 },
      { title: 'Taking it apart', page: 5, endPage: 8 },
      { title: 'Troubleshooting chart', page: 9, endPage: 10, key: true },
      { title: 'Wiring diagram', page: 11, key: true },
      { title: 'Motor & commutator', page: 12, endPage: 13 },
      { title: 'Carbon brushes', page: 14, endPage: 15, key: true },
      { title: 'Speed control (governor)', page: 16, endPage: 17, key: true },
      { title: 'Gearbox & grease', page: 18 },
      { title: 'Turntable & bowl', page: 19 },
      { title: 'Electrical tests', page: 20 },
      { title: 'Parts list', page: 21, endPage: 22 },
    ],
  },
  {
    id: 'sb-mm-2346-um',
    type: 'user',
    title: 'Sunbeam Mixmaster 2346 Use & Care Book',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    models: ['2346'],
    category: K,
    product: 'Stand mixer',
    yearFrom: 1993,
    yearTo: 1997,
    language: 'English',
    scan: 'good',
    pages: 12,
    contributor: 'Joan Ellery',
    added: '2023-02-11',
    note: 'Owner’s booklet. Speed guide and beater fitting, no repair information.',
    contents: [
      { title: 'Important safeguards', page: 2 },
      { title: 'Fitting beaters & bowls', page: 4 },
      { title: 'Speed guide (1–12)', page: 6 },
      { title: 'Cleaning', page: 10 },
      { title: 'Warranty', page: 12 },
    ],
  },
  {
    id: 'sb-mm-2340-pl',
    type: 'parts',
    title: 'Sunbeam Mixmaster 2340 Series Parts List',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    models: ['2341', '2344', '2346', '2348'],
    category: K,
    product: 'Stand mixer',
    yearFrom: 1992,
    yearTo: 1998,
    language: 'English',
    scan: 'partial',
    pages: 4,
    contributor: 'Alan Whitcombe',
    added: '2024-10-12',
    note: 'Page 3 (gearbox parts) was missing from the copy we were given.',
    missingPages: [3],
    contents: [
      { title: 'Housing & controls', page: 1 },
      { title: 'Motor, brushes, governor', page: 2 },
      { title: 'Attachments', page: 4 },
    ],
  },
  {
    id: 'sb-mm-2360-wd',
    type: 'wiring',
    title: 'Sunbeam Mixmaster 2360 / 2365 Wiring Diagram',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    models: ['2360', '2365'],
    category: K,
    product: 'Stand mixer',
    yearFrom: 1999,
    yearTo: 2004,
    language: 'English',
    scan: 'good',
    pages: 1,
    contributor: 'Tomasz Nowak',
    added: '2024-04-13',
    note: 'Later electronic speed control — not the same as the 2340 series governor.',
  },
  {
    id: 'sb-mm-2360-um',
    type: 'user',
    title: 'Sunbeam Mixmaster 2360 / 2365 Instruction Booklet',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    models: ['2360', '2365'],
    category: K,
    product: 'Stand mixer',
    yearFrom: 1999,
    yearTo: 2004,
    language: 'English',
    scan: 'good',
    pages: 16,
    contributor: 'Hana Sato',
    added: '2025-01-11',
  },
  {
    id: 'sb-mm-01401-sm',
    type: 'service',
    title: 'Sunbeam Mixmaster 01401 / 01402 Service Manual',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    models: ['01401', '01402'],
    category: K,
    product: 'Stand mixer',
    yearFrom: 1978,
    yearTo: 1984,
    language: 'English',
    scan: 'faded',
    pages: 18,
    contributor: 'Peter Halloran',
    added: '2020-09-12',
  },
  {
    id: 'sb-mm-01401-wd',
    type: 'wiring',
    title: 'Sunbeam Mixmaster 01401 Wiring Diagram',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    models: ['01401'],
    category: K,
    product: 'Stand mixer',
    yearFrom: 1978,
    yearTo: 1984,
    language: 'English',
    scan: 'partial',
    pages: 1,
    contributor: 'Peter Halloran',
    added: '2020-09-12',
    note: 'Left edge cut off in the scan.',
  },
  {
    id: 'sb-mm-2355-um',
    type: 'user',
    title: 'Sunbeam Mixmaster Heritage 2355 Instruction Book',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    models: ['2355'],
    category: K,
    product: 'Stand mixer',
    yearFrom: 1997,
    yearTo: 2001,
    language: 'English',
    scan: 'good',
    pages: 14,
    contributor: 'Maureen Talbot',
    added: '2023-08-12',
  },
  {
    id: 'sb-mm-2350-rn',
    type: 'note',
    title: 'Mixmaster 2350 — sticking turntable, clean and re-grease',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    models: ['2350'],
    category: K,
    product: 'Stand mixer',
    yearFrom: 1995,
    yearTo: 1999,
    language: 'English',
    scan: 'good',
    pages: 2,
    contributor: 'Alan Whitcombe',
    added: '2023-05-13',
  },
  { id: 'sb-hm-2485-um', type: 'user', title: 'Sunbeam Hand Mixer 2485 Use & Care', brand: 'Sunbeam', models: ['2485'], category: K, product: 'Hand mixer', yearFrom: 1995, yearTo: 1999, language: 'English', scan: 'good', pages: 8, contributor: 'Priya Venkatesan', added: '2024-02-10' },
  { id: 'sb-osk-4815-sm', type: 'service', title: 'Sunbeam Oskar 4815 Food Processor Service Manual', brand: 'Sunbeam', family: 'Oskar', models: ['4815', '4817'], category: K, product: 'Food processor', yearFrom: 1988, yearTo: 1993, language: 'English', scan: 'good', pages: 20, contributor: 'Dev Raman', added: '2022-11-12' },
  { id: 'sb-osk-4815-um', type: 'user', title: 'Sunbeam Oskar 4815 Owner’s Guide', brand: 'Sunbeam', family: 'Oskar', models: ['4815'], category: K, product: 'Food processor', yearFrom: 1988, yearTo: 1993, language: 'English', scan: 'faded', pages: 24, contributor: 'Maureen Talbot', added: '2022-03-12' },
  { id: 'sb-ta9200-um', type: 'user', title: 'Sunbeam Café Series TA9200 Toaster Instructions', brand: 'Sunbeam', models: ['TA9200'], category: K, product: 'Toaster', yearFrom: 2005, yearTo: 2010, language: 'English', scan: 'good', pages: 10, contributor: 'Hana Sato', added: '2025-03-08' },
  { id: 'sb-3802-wd', type: 'wiring', title: 'Sunbeam Radiant Control Toaster 3802 Wiring Diagram', brand: 'Sunbeam', models: ['3802'], category: K, product: 'Toaster', yearFrom: 1985, yearTo: 1990, language: 'English', scan: 'faded', pages: 1, contributor: 'Gerald Pryce', added: '2021-07-10' },
  { id: 'sb-ke6400-um', type: 'user', title: 'Sunbeam Conica KE6400 Kettle Instructions', brand: 'Sunbeam', models: ['KE6400'], category: K, product: 'Kettle', yearFrom: 2008, yearTo: 2013, language: 'English', scan: 'good', pages: 6, contributor: 'Femi Adeyemi', added: '2024-06-08' },
  { id: 'sb-fp5600-sm', type: 'service', title: 'Sunbeam Electric Frypan FP5600 Service Manual', brand: 'Sunbeam', models: ['FP5600'], category: K, product: 'Electric frypan', yearFrom: 1991, yearTo: 1996, language: 'English', scan: 'partial', pages: 14, contributor: 'Irene Duffy', added: '2019-11-09', missingPages: [7, 8] },
  { id: 'sb-fp5600-um', type: 'user', title: 'Sunbeam Electric Frypan FP5600 Recipe & Instruction Book', brand: 'Sunbeam', models: ['FP5600'], category: K, product: 'Electric frypan', yearFrom: 1991, yearTo: 1996, language: 'English', scan: 'good', pages: 32, contributor: 'Joan Ellery', added: '2020-02-08' },
  { id: 'sb-pb7600-pl', type: 'parts', title: 'Sunbeam Blender PB7600 Parts List', brand: 'Sunbeam', models: ['PB7600'], category: K, product: 'Blender', yearFrom: 2009, yearTo: 2014, language: 'English', scan: 'good', pages: 3, contributor: 'Marcus Bell', added: '2025-09-13' },
  { id: 'sb-em3820-um', type: 'user', title: 'Sunbeam Café Crema EM3820 Espresso Machine Instructions', brand: 'Sunbeam', models: ['EM3820'], category: K, product: 'Espresso machine', yearFrom: 2002, yearTo: 2007, language: 'English', scan: 'good', pages: 28, contributor: 'Priya Venkatesan', added: '2023-10-14' },
  { id: 'sb-em3820-sm', type: 'service', title: 'Sunbeam Café Crema EM3820 Service Manual', brand: 'Sunbeam', models: ['EM3820'], category: K, product: 'Espresso machine', yearFrom: 2002, yearTo: 2007, language: 'English', scan: 'faded', pages: 36, contributor: 'Dev Raman', added: '2024-01-13' },
  { id: 'sb-bm4500-um', type: 'user', title: 'Sunbeam Bakehouse BM4500 Breadmaker Instructions', brand: 'Sunbeam', models: ['BM4500'], category: K, product: 'Bread maker', yearFrom: 2000, yearTo: 2005, language: 'English', scan: 'good', pages: 40, contributor: 'Maureen Talbot', added: '2021-04-10' },
  { id: 'sb-rc5600-um', type: 'user', title: 'Sunbeam Rice Cooker RC5600 Instructions', brand: 'Sunbeam', models: ['RC5600'], category: K, product: 'Rice cooker', yearFrom: 2006, yearTo: 2012, language: 'English', scan: 'good', pages: 12, contributor: 'Hana Sato', added: '2025-08-09' },
  { id: 'sb-sr6250-um', type: 'user', title: 'Sunbeam Steam Iron SR6250 Instructions', brand: 'Sunbeam', models: ['SR6250'], category: 'Irons & laundry', product: 'Steam iron', yearFrom: 2003, yearTo: 2008, language: 'English', scan: 'good', pages: 8, contributor: 'Bridget Lacey', added: '2022-06-11' },
  { id: 'sb-1210-wd', type: 'wiring', title: 'Sunbeam Steam or Dry Iron 1210 Wiring Diagram', brand: 'Sunbeam', models: ['1210'], category: 'Irons & laundry', product: 'Steam iron', yearFrom: 1968, yearTo: 1975, language: 'English', scan: 'faded', pages: 1, contributor: 'Colin Marsh', added: '2019-05-11' },
  { id: 'sb-bl5141-wd', type: 'wiring', title: 'Sunbeam Electric Blanket Controller BL5141 Wiring Diagram', brand: 'Sunbeam', models: ['BL5141'], category: 'Heating & fans', product: 'Electric blanket', yearFrom: 2004, yearTo: 2010, language: 'English', scan: 'good', pages: 2, contributor: 'Femi Adeyemi', added: '2023-12-09' },
  { id: 'sb-he3000-um', type: 'user', title: 'Sunbeam Fan Heater HE3000 Instructions', brand: 'Sunbeam', models: ['HE3000'], category: 'Heating & fans', product: 'Fan heater', yearFrom: 1996, yearTo: 2001, language: 'English', scan: 'good', pages: 6, contributor: 'Femi Adeyemi', added: '2024-11-09' },
  { id: 'sb-sm555-sm', type: 'service', title: 'Sunbeam Shavemaster 555 Service Manual', brand: 'Sunbeam', family: 'Shavemaster', models: ['555'], category: 'Personal care', product: 'Shaver', yearFrom: 1962, yearTo: 1968, language: 'English', scan: 'faded', pages: 16, contributor: 'Peter Halloran', added: '2019-08-10' },
];

// ---------------------------------------------------------------------------
// The other 1,385 documents, generated from realistic brand/product patterns
// ---------------------------------------------------------------------------
interface BrandSpec {
  brand: string;
  fmt: string[]; // # = digit, @ = capital letter
  products: string[];
  years: [number, number];
  fam?: Record<string, string>; // model pattern -> product line name
}

interface CategorySpec {
  name: string;
  count: number; // non-Sunbeam documents
  brands: BrandSpec[];
  noteTopics: string[];
}

const CATS: CategorySpec[] = [
  {
    name: K,
    count: 318 - 22,
    brands: [
      { brand: 'Kenwood', fmt: ['A###', 'KM###', 'FP###'], products: ['Stand mixer', 'Food processor', 'Hand mixer', 'Blender'], years: [1962, 2015], fam: { 'A###': 'Chef', 'KM###': 'Chef' } },
      { brand: 'KitchenAid', fmt: ['K45SS', '5KSM###', 'KSM##'], products: ['Stand mixer', 'Blender'], years: [1975, 2018], fam: { '5KSM###': 'Artisan', 'K45SS': 'Classic' } },
      { brand: 'Breville', fmt: ['BES###', 'BTA###', 'BJE###'], products: ['Espresso machine', 'Toaster', 'Juicer', 'Sandwich toaster'], years: [1985, 2019] },
      { brand: 'Moulinex', fmt: ['@@###', 'Masterchef ###'], products: ['Food processor', 'Blender', 'Hand mixer', 'Deep fryer'], years: [1970, 2012] },
      { brand: 'Russell Hobbs', fmt: ['#####', 'K#'], products: ['Kettle', 'Toaster', 'Coffee maker', 'Slow cooker'], years: [1960, 2020] },
      { brand: 'Hamilton Beach', fmt: ['6####', '4####', '5####'], products: ['Hand mixer', 'Blender', 'Slow cooker', 'Coffee maker'], years: [1975, 2018] },
      { brand: 'Morphy Richards', fmt: ['4####', '2####'], products: ['Toaster', 'Kettle', 'Bread maker', 'Slow cooker'], years: [1965, 2016] },
      { brand: 'Philips', fmt: ['HR####', 'HD####'], products: ['Blender', 'Coffee maker', 'Juicer', 'Deep fryer', 'Food processor'], years: [1980, 2019] },
      { brand: 'Braun', fmt: ['KM ##', 'MR ###', 'KF ##'], products: ['Food processor', 'Hand mixer', 'Coffee maker'], years: [1960, 2010] },
      { brand: 'Magimix', fmt: ['####', 'CS ####'], products: ['Food processor', 'Juicer'], years: [1975, 2015] },
      { brand: 'Oster', fmt: ['####', 'BVLB##'], products: ['Blender', 'Hand mixer', 'Bread maker'], years: [1965, 2012] },
      { brand: 'Cuisinart', fmt: ['DLC-#', 'CBT-###', 'DCC-####'], products: ['Food processor', 'Blender', 'Coffee maker'], years: [1978, 2018] },
      { brand: 'Dualit', fmt: ['#####', 'DPP#'], products: ['Toaster', 'Kettle'], years: [1970, 2019] },
      { brand: 'Tefal', fmt: ['FR####', 'KO####', 'TT####'], products: ['Deep fryer', 'Kettle', 'Toaster'], years: [1985, 2017] },
      { brand: 'Bosch', fmt: ['MUM####', 'MCM####'], products: ['Stand mixer', 'Food processor'], years: [1980, 2018] },
      { brand: 'Rival', fmt: ['####', '#####'], products: ['Slow cooker', 'Mincer'], years: [1971, 2005] },
      { brand: 'Waring', fmt: ['WPB##', 'BB###'], products: ['Blender'], years: [1955, 2010] },
      { brand: 'Panasonic', fmt: ['SD-###', 'NN-@###'], products: ['Bread maker', 'Microwave oven'], years: [1985, 2016] },
    ],
    noteTopics: ['replacing the thermal fuse', 'drive belt replacement', 'gearbox re-grease', 'descaling and element test', 'pop-up latch spring', 'switch contacts cleaned', 'new mains lead and strain relief', 'motor coupling replacement'],
  },
  {
    name: 'Audio & hi-fi',
    count: 196,
    brands: [
      { brand: 'Technics', fmt: ['SL-####', 'SU-V###', 'RS-M###'], products: ['Turntable', 'Amplifier', 'Cassette deck'], years: [1972, 2002] },
      { brand: 'Pioneer', fmt: ['PL-###', 'SX-###', 'CT-F###'], products: ['Turntable', 'Receiver', 'Cassette deck'], years: [1970, 2005] },
      { brand: 'Sony', fmt: ['TC-K###', 'CDP-###', 'ICF-####'], products: ['Cassette deck', 'CD player', 'Portable radio'], years: [1975, 2012] },
      { brand: 'Marantz', fmt: ['PM-##', '####', 'CD-##'], products: ['Amplifier', 'Receiver', 'CD player'], years: [1970, 2010] },
      { brand: 'Roberts', fmt: ['R###', 'RD-##', 'RT###'], products: ['Portable radio', 'DAB radio'], years: [1960, 2018] },
      { brand: 'Grundig', fmt: ['Satellit ####', 'RTV ###'], products: ['Portable radio', 'Receiver'], years: [1960, 1995] },
      { brand: 'Akai', fmt: ['GX-###D', 'AM-U##', 'CS-###'], products: ['Reel-to-reel', 'Amplifier', 'Cassette deck'], years: [1968, 1995] },
      { brand: 'Yamaha', fmt: ['A-###', 'CR-###', 'KX-###'], products: ['Amplifier', 'Receiver', 'Cassette deck'], years: [1975, 2010] },
      { brand: 'Garrard', fmt: ['SP##', '###', 'AP##'], products: ['Turntable'], years: [1955, 1980] },
      { brand: 'Dual', fmt: ['CS ###', '1###'], products: ['Turntable'], years: [1965, 1990] },
      { brand: 'JVC', fmt: ['RC-M##', 'KD-###', 'TD-W###'], products: ['Boombox', 'Cassette deck'], years: [1975, 2000] },
      { brand: 'Bush', fmt: ['TR###', 'VTR###'], products: ['Portable radio'], years: [1958, 1985] },
      { brand: 'Revox', fmt: ['B##', 'A##'], products: ['Reel-to-reel', 'Amplifier'], years: [1967, 1995] },
    ],
    noteTopics: ['belt size and fitting', 'cleaning the tape heads', 'idler wheel refurbishment', 'replacing dried capacitors', 'noisy volume pot cleaning', 'stylus and cartridge alignment', 'dial cord restringing'],
  },
  {
    name: 'Lamps & lighting',
    count: 88,
    brands: [
      { brand: 'Anglepoise', fmt: ['Model ####', 'Type ##'], products: ['Desk lamp', 'Floor lamp'], years: [1935, 2015] },
      { brand: 'Herbert Terry', fmt: ['####'], products: ['Desk lamp'], years: [1935, 1975] },
      { brand: 'Philips', fmt: ['TL ##', 'SL-##'], products: ['Fluorescent fitting', 'Table lamp'], years: [1965, 2010] },
      { brand: 'Mathmos', fmt: ['Astro', 'Telstar'], products: ['Lava lamp'], years: [1965, 2015] },
      { brand: 'Artemide', fmt: ['Tolomeo', 'Tizio'], products: ['Desk lamp'], years: [1972, 2015] },
      { brand: 'Habitat', fmt: ['###.###'], products: ['Table lamp', 'Floor lamp', 'Pendant'], years: [1975, 2015] },
      { brand: 'Thorn', fmt: ['Popular Pack ###', 'EM###'], products: ['Fluorescent fitting'], years: [1960, 2000] },
    ],
    noteTopics: ['rewiring with new flex', 'replacing the in-line switch', 'fluorescent starter and choke test', 'spring tension adjustment', 'lampholder replacement'],
  },
  {
    name: 'Power tools',
    count: 124,
    brands: [
      { brand: 'Black & Decker', fmt: ['D###', 'BD###', 'KR###'], products: ['Drill', 'Jigsaw', 'Sander', 'Circular saw'], years: [1960, 2018] },
      { brand: 'Bosch', fmt: ['PSB ###', 'PST ###', 'GSR ##-#'], products: ['Drill', 'Jigsaw', 'Cordless drill'], years: [1975, 2019] },
      { brand: 'Makita', fmt: ['6###D', 'HP####', '9###'], products: ['Cordless drill', 'Drill', 'Angle grinder'], years: [1980, 2019] },
      { brand: 'DeWalt', fmt: ['DW###', 'DCD###'], products: ['Router', 'Cordless drill', 'Circular saw'], years: [1990, 2019] },
      { brand: 'Ryobi', fmt: ['R18PD#', 'ERO-###'], products: ['Cordless drill', 'Sander'], years: [1995, 2019] },
      { brand: 'Skil', fmt: ['####', '#### H'], products: ['Circular saw', 'Jigsaw', 'Planer'], years: [1970, 2015] },
      { brand: 'Metabo', fmt: ['SBE ###', 'W ###'], products: ['Drill', 'Angle grinder'], years: [1980, 2018] },
    ],
    noteTopics: ['brush replacement', 'chuck removal', 'switch replacement', 'gearbox re-grease', 'battery pack rebuild', 'cord and strain relief'],
  },
  {
    name: 'Garden equipment',
    count: 71,
    brands: [
      { brand: 'Flymo', fmt: ['HV###', 'E##', 'Micro Lite'], products: ['Lawnmower'], years: [1970, 2015] },
      { brand: 'Qualcast', fmt: ['Concorde ##', 'Panther ##'], products: ['Lawnmower'], years: [1965, 2010] },
      { brand: 'Mountfield', fmt: ['SP###', 'HP###'], products: ['Lawnmower'], years: [1985, 2018] },
      { brand: 'Bosch', fmt: ['Rotak ##', 'AHS ##-##', 'ART ##'], products: ['Lawnmower', 'Hedge trimmer', 'Strimmer'], years: [1995, 2019] },
      { brand: 'Stihl', fmt: ['FS ##', 'MS ###', 'HS ##'], products: ['Strimmer', 'Chainsaw', 'Hedge trimmer'], years: [1985, 2019] },
      { brand: 'Black & Decker', fmt: ['GT###', 'GL###', 'GW####'], products: ['Hedge trimmer', 'Strimmer', 'Leaf blower'], years: [1985, 2018] },
    ],
    noteTopics: ['blade sharpening and balancing', 'replacing the spool feed', 'cable and switch box', 'drive belt'],
  },
  {
    name: 'Sewing machines',
    count: 112,
    brands: [
      { brand: 'Singer', fmt: ['###K', '###', '####'], products: ['Sewing machine'], years: [1910, 2010] },
      { brand: 'Bernina', fmt: ['Record ###', '###'], products: ['Sewing machine'], years: [1950, 2010] },
      { brand: 'Brother', fmt: ['XL-####', 'LS-####', 'M####'], products: ['Sewing machine', 'Overlocker'], years: [1975, 2018] },
      { brand: 'Janome', fmt: ['####', 'J#-##'], products: ['Sewing machine', 'Overlocker'], years: [1975, 2018] },
      { brand: 'Frister & Rossmann', fmt: ['Cub #', 'Model ###'], products: ['Sewing machine'], years: [1950, 1990] },
      { brand: 'Pfaff', fmt: ['###', 'Hobby ####'], products: ['Sewing machine'], years: [1950, 2010] },
      { brand: 'Jones', fmt: ['Model ##', 'Brother ###'], products: ['Sewing machine'], years: [1930, 1980] },
      { brand: 'Elna', fmt: ['Supermatic', 'Lotus', '####'], products: ['Sewing machine'], years: [1952, 2005] },
    ],
    noteTopics: ['timing the hook', 'tension assembly strip-down', 'motor belt and foot pedal', 'bobbin case adjustment', 'oiling points'],
  },
  {
    name: 'Vacuum cleaners',
    count: 97,
    brands: [
      { brand: 'Hoover', fmt: ['U####', 'Junior ####', 'TH####'], products: ['Upright vacuum', 'Cylinder vacuum'], years: [1950, 2016] },
      { brand: 'Electrolux', fmt: ['Z###', 'Model ###'], products: ['Cylinder vacuum'], years: [1955, 2012] },
      { brand: 'Dyson', fmt: ['DC##', 'V#'], products: ['Upright vacuum', 'Cylinder vacuum', 'Handheld vacuum'], years: [1995, 2020] },
      { brand: 'Vax', fmt: ['####', 'V-###'], products: ['Carpet washer', 'Cylinder vacuum'], years: [1985, 2015] },
      { brand: 'Miele', fmt: ['S####', 'S###i'], products: ['Cylinder vacuum'], years: [1985, 2018] },
      { brand: 'Numatic', fmt: ['HVR###', 'NRV###'], products: ['Cylinder vacuum'], years: [1985, 2019] },
    ],
    noteTopics: ['motor brush replacement', 'belt and brush-roll', 'cable rewind repair', 'clearing blocked hose'],
  },
  {
    name: 'Irons & laundry',
    count: 64 - 2,
    brands: [
      { brand: 'Morphy Richards', fmt: ['4####', '3####'], products: ['Steam iron', 'Trouser press'], years: [1960, 2015] },
      { brand: 'Rowenta', fmt: ['DW####', 'DG####'], products: ['Steam iron', 'Steam generator'], years: [1980, 2018] },
      { brand: 'Philips', fmt: ['GC####'], products: ['Steam iron', 'Steam generator'], years: [1985, 2019] },
      { brand: 'Tefal', fmt: ['FV####', 'GV####'], products: ['Steam iron', 'Steam generator'], years: [1990, 2018] },
      { brand: 'Hotpoint', fmt: ['####', 'TDL##'], products: ['Spin dryer', 'Tumble dryer'], years: [1960, 2010] },
    ],
    noteTopics: ['thermostat and thermal fuse', 'descaling the soleplate', 'cord replacement', 'spin dryer brake band'],
  },
  {
    name: 'Heating & fans',
    count: 79 - 2,
    brands: [
      { brand: 'Dimplex', fmt: ['###', 'OFRC##', 'DXF##'], products: ['Fan heater', 'Oil-filled radiator', 'Convector heater'], years: [1975, 2018] },
      { brand: 'Vornado', fmt: ['###', '####'], products: ['Desk fan', 'Pedestal fan'], years: [1990, 2018] },
      { brand: 'Honeywell', fmt: ['HZ-###', 'HT-###'], products: ['Fan heater', 'Desk fan'], years: [1990, 2016] },
      { brand: 'Dreamland', fmt: ['####', 'Intelliheat ##'], products: ['Electric blanket'], years: [1980, 2018] },
      { brand: 'Belling', fmt: ['###', 'Model ##'], products: ['Convector heater', 'Fan heater'], years: [1955, 2000] },
      { brand: 'Pifco', fmt: ['####'], products: ['Desk fan', 'Fan heater'], years: [1955, 1995] },
    ],
    noteTopics: ['thermal cutout replacement', 'fan bearing oiling', 'controller fault finding', 'element continuity test'],
  },
  {
    name: 'Clocks & watches',
    count: 41,
    brands: [
      { brand: 'Smiths', fmt: ['Sectric ###', 'Model ###'], products: ['Electric clock', 'Mantel clock', 'Alarm clock'], years: [1932, 1975] },
      { brand: 'Metamec', fmt: ['####'], products: ['Mantel clock', 'Wall clock'], years: [1950, 1985] },
      { brand: 'Westclox', fmt: ['Big Ben', 'Baby Ben', '##-###'], products: ['Alarm clock'], years: [1930, 1990] },
      { brand: 'Junghans', fmt: ['W###', 'J###'], products: ['Wall clock', 'Mantel clock'], years: [1950, 2000] },
      { brand: 'Seiko', fmt: ['QXA###', '####'], products: ['Wall clock', 'Quartz movement'], years: [1975, 2015] },
    ],
    noteTopics: ['cleaning a synchronous movement', 'quartz movement swap', 'alarm spring and bell'],
  },
  {
    name: 'TV & video',
    count: 58,
    brands: [
      { brand: 'Sony', fmt: ['KV-####', 'SLV-###', 'CCD-TR###'], products: ['CRT television', 'VCR', 'Camcorder'], years: [1975, 2008] },
      { brand: 'Panasonic', fmt: ['NV-####', 'TX-##@@#'], products: ['VCR', 'CRT television'], years: [1978, 2008] },
      { brand: 'JVC', fmt: ['HR-D###', 'GR-###'], products: ['VCR', 'Camcorder'], years: [1978, 2005] },
      { brand: 'Ferguson', fmt: ['Videostar ####', 'TX ##'], products: ['VCR', 'Portable TV'], years: [1975, 1995] },
      { brand: 'Hitachi', fmt: ['VT-###', 'CPT####'], products: ['VCR', 'CRT television'], years: [1978, 2005] },
    ],
    noteTopics: ['pinch roller and idler', 'loading belt replacement', 'safety note: CRT discharge'],
  },
  {
    name: 'Computers & phones',
    count: 46,
    brands: [
      { brand: 'GPO', fmt: ['Model ###', 'Trimphone'], products: ['Telephone'], years: [1959, 1985] },
      { brand: 'BT', fmt: ['Converse ###', 'Decor ###'], products: ['Telephone'], years: [1985, 2010] },
      { brand: 'Nokia', fmt: ['####', '####i'], products: ['Mobile phone'], years: [1997, 2010] },
      { brand: 'Apple', fmt: ['A####'], products: ['Laptop', 'Mobile phone'], years: [2006, 2019] },
      { brand: 'Amstrad', fmt: ['PCW####', 'CPC ###'], products: ['Home computer'], years: [1984, 1992] },
      { brand: 'Commodore', fmt: ['C##', 'VIC-##', 'A###'], products: ['Home computer'], years: [1980, 1994] },
      { brand: 'Epson', fmt: ['LX-###', 'Stylus ###'], products: ['Printer'], years: [1985, 2010] },
    ],
    noteTopics: ['battery replacement', 'keyboard membrane repair', 'charging port cleaning', 'dial mechanism service'],
  },
  {
    name: 'Personal care',
    count: 63 - 1,
    brands: [
      { brand: 'Braun', fmt: ['Series # ###', '####', 'HD ###'], products: ['Shaver', 'Hair dryer', 'Toothbrush'], years: [1965, 2018] },
      { brand: 'Philips', fmt: ['HQ####', 'HP####'], products: ['Shaver', 'Hair dryer'], years: [1965, 2018] },
      { brand: 'Remington', fmt: ['R-###', 'D####', 'HC####'], products: ['Shaver', 'Hair dryer', 'Hair clipper'], years: [1960, 2018] },
      { brand: 'BaByliss', fmt: ['####@', '####'], products: ['Hair dryer', 'Curling tongs'], years: [1990, 2018] },
      { brand: 'Wahl', fmt: ['####', '####-###'], products: ['Hair clipper'], years: [1970, 2018] },
      { brand: 'Carmen', fmt: ['C##', '####'], products: ['Heated rollers', 'Hair dryer'], years: [1970, 2005] },
    ],
    noteTopics: ['cutter head cleaning', 'replacing the heater element', 'battery swap', 'thermal fuse'],
  },
  {
    name: 'Toys & games',
    count: 32,
    brands: [
      { brand: 'Hornby', fmt: ['R###', 'R.###'], products: ['Model locomotive', 'Train controller'], years: [1960, 2015] },
      { brand: 'Scalextric', fmt: ['C###', 'C.###'], products: ['Slot car set'], years: [1960, 2015] },
      { brand: 'Tomy', fmt: ['####', 'Omnibot ####'], products: ['Robot toy', 'Electronic game'], years: [1975, 2005] },
      { brand: 'Mattel', fmt: ['####', '@####'], products: ['Electronic game'], years: [1975, 2010] },
      { brand: 'Meccano', fmt: ['Set #', 'Motor No. #'], products: ['Construction set'], years: [1950, 1995] },
    ],
    noteTopics: ['motor brushes and magnet', 'pickup and track contacts', 'battery terminal corrosion'],
  },
  {
    name: 'Bicycles',
    count: 23,
    brands: [
      { brand: 'Sturmey-Archer', fmt: ['AW', 'S3X', 'SRF#'], products: ['3-speed hub', 'Dynamo hub'], years: [1936, 2015] },
      { brand: 'Raleigh', fmt: ['Chopper Mk#', 'Twenty', 'Wayfarer'], products: ['Bicycle'], years: [1960, 2000] },
      { brand: 'Shimano', fmt: ['Nexus SG-#C##', 'RD-M###'], products: ['3-speed hub', 'Derailleur'], years: [1985, 2018] },
      { brand: 'Brompton', fmt: ['M#L', 'S#E'], products: ['Bicycle'], years: [1988, 2019] },
    ],
    noteTopics: ['hub strip and re-grease', 'indicator chain adjustment', 'bottom bracket service'],
  },
];

const LANGS: [string, number][] = [
  ['English', 86],
  ['German', 5],
  ['French', 4],
  ['Dutch', 2],
  ['Italian', 1.5],
  ['Polish', 1],
  ['Spanish', 0.5],
];

const TYPES: [DocType, number][] = [
  ['user', 38],
  ['service', 24],
  ['wiring', 14],
  ['parts', 12],
  ['note', 12],
];

const SCANS: [Scan, number][] = [
  ['good', 62],
  ['faded', 26],
  ['partial', 12],
];

const CONTRIBUTORS: [string, number][] = [
  ...VOLUNTEERS.map((v) => [v.name, v.name === 'Ruth Okonjo' ? 9 : 4] as [string, number]),
  ...FORMER.map((n) => [n, 3] as [string, number]),
];

function fillFmt(r: Rng, fmt: string): string {
  let out = '';
  for (const ch of fmt) {
    if (ch === '#') out += String(int(r, 0, 9));
    else if (ch === '@') out += 'ABCDEFGHJKLMNPRSTUVWXY'[int(r, 0, 21)];
    else out += ch;
  }
  // avoid leading zero on pure-number models
  if (/^0\d/.test(out)) out = String(int(r, 1, 9)) + out.slice(1);
  return out;
}

function variant(r: Rng, m: string): string {
  const roll = r();
  const numMatch = m.match(/(\d+)(?!.*\d)/);
  if (roll < 0.5 && numMatch) {
    const n = numMatch[1];
    const bumped = String(Number(n) + int(r, 1, 4)).padStart(n.length, '0');
    return m.slice(0, numMatch.index) + bumped + m.slice((numMatch.index ?? 0) + n.length);
  }
  return m + pick(r, ['A', 'B', 'E', 'S', 'X', '/1']);
}

const pagesFor = (r: Rng, t: DocType) =>
  t === 'service' ? int(r, 12, 72) : t === 'user' ? int(r, 4, 40) : t === 'wiring' ? int(r, 1, 3) : t === 'parts' ? int(r, 2, 12) : int(r, 1, 4);

function titleFor(t: DocType, brand: string, product: string, models: string[], topic: string, lang: string): string {
  const m = models.join(' / ');
  const local: Record<string, Record<DocType, string>> = {
    German: { service: 'Reparaturanleitung', user: 'Bedienungsanleitung', wiring: 'Schaltplan', parts: 'Ersatzteilliste', note: 'Reparaturnotiz' },
    French: { service: 'Manuel de service', user: 'Mode d’emploi', wiring: 'Schéma électrique', parts: 'Liste des pièces', note: 'Note de réparation' },
    Dutch: { service: 'Servicehandleiding', user: 'Gebruiksaanwijzing', wiring: 'Bedradingsschema', parts: 'Onderdelenlijst', note: 'Reparatienotitie' },
    Italian: { service: 'Manuale di servizio', user: 'Istruzioni per l’uso', wiring: 'Schema elettrico', parts: 'Elenco ricambi', note: 'Nota di riparazione' },
    Polish: { service: 'Instrukcja serwisowa', user: 'Instrukcja obsługi', wiring: 'Schemat elektryczny', parts: 'Lista części', note: 'Notatka z naprawy' },
    Spanish: { service: 'Manual de servicio', user: 'Manual de instrucciones', wiring: 'Esquema eléctrico', parts: 'Lista de piezas', note: 'Nota de reparación' },
  };
  if (t === 'note') return `${brand} ${m} — ${topic}`;
  if (lang !== 'English' && local[lang]) return `${brand} ${m} ${local[lang][t]}`;
  const suffix: Record<DocType, string> = {
    service: 'Service Manual',
    user: t === 'user' && r0(models) ? 'Instructions' : 'Owner’s Manual',
    wiring: 'Wiring Diagram',
    parts: 'Parts List',
    note: '',
  };
  return `${brand} ${product} ${m} ${suffix[t]}`;
}
const r0 = (models: string[]) => models[0].length % 2 === 0;

function isoDate(r: Rng): string {
  // added on a café Saturday between 2019 and October 2026
  const y = int(r, 2019, 2026);
  const m = y === 2026 ? int(r, 1, 10) : int(r, 1, 12);
  return secondSaturday(y, m);
}

export function secondSaturday(y: number, m: number): string {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 Sun..6 Sat
  const firstSat = 1 + ((6 - first + 7) % 7);
  const d = firstSat + 7;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function generate(): Doc[] {
  const r = mulberry32(19940214);
  const out: Doc[] = [];
  const seen = new Set<string>();
  let n = 0;
  for (const cat of CATS) {
    let made = 0;
    let guard = 0;
    while (made < cat.count && guard++ < cat.count * 20) {
      const b = pick(r, cat.brands);
      const fmt = pick(r, b.fmt);
      const family = b.fam?.[fmt];
      const product = family && /mixer/i.test(b.products[0]) ? b.products[0] : pick(r, b.products);
      const m1 = fillFmt(r, fmt);
      if (/234\d/.test(m1)) continue; // keep the Mixmaster numbers unambiguous
      const models = r() < 0.32 ? [m1, variant(r, m1)] : [m1];
      if (models.some((m) => /234\d/.test(m))) continue;
      const type = weighted(r, TYPES);
      const lang = type === 'note' ? 'English' : weighted(r, LANGS);
      const key = `${b.brand}|${models[0]}|${type}|${lang}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const span = int(r, 0, 8);
      const yFrom = int(r, b.years[0], Math.max(b.years[0], b.years[1] - span));
      const scan = weighted(r, SCANS);
      const pages = pagesFor(r, type);
      const topic = pick(r, cat.noteTopics);
      const doc: Doc = {
        id: `d${String(++n).padStart(4, '0')}`,
        type,
        title: titleFor(type, family ? `${b.brand} ${family}` : b.brand, product, models, topic, lang),
        brand: b.brand,
        family,
        models,
        category: cat.name,
        product,
        yearFrom: yFrom,
        yearTo: Math.min(b.years[1], yFrom + span),
        language: lang,
        scan,
        pages,
        contributor: weighted(r, CONTRIBUTORS),
        added: isoDate(r),
      };
      if (scan === 'partial' && pages > 2) {
        const miss = new Set<number>();
        const k = int(r, 1, Math.min(3, pages - 1));
        while (miss.size < k) miss.add(int(r, 2, pages));
        doc.missingPages = [...miss].sort((a, b) => a - b);
      }
      out.push(doc);
      made++;
    }
  }
  return out;
}

export const DOCS: Doc[] = [...SUNBEAM, ...generate()];

export const DOC_BY_ID = new Map(DOCS.map((d) => [d.id, d]));

export const CATEGORIES = CATS.map((c) => c.name);
