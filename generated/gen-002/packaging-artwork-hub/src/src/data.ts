import { rng, pick, int, addDays, slug, eanCheck, hashStr, Rng } from './util';
import { PAPRIKA_TEXT, RegText, CATEGORY_MASTER } from './regtext';

export const TODAY = '2026-11-17';
export const NOW_TIME = '10:44';

export type Status = 'approved' | 'in_review' | 'superseded' | 'draft' | 'archived';
export type Shape = 'pouch' | 'pillow' | 'flowwrap' | 'tablet' | 'carton' | 'tin' | 'jar' | 'stick' | 'multipack';

export const LANGS: Record<string, string> = {
  pl: 'Polish', cs: 'Czech', sk: 'Slovak', hu: 'Hungarian', de: 'German', fr: 'French', it: 'Italian', nl: 'Dutch',
  sv: 'Swedish', fi: 'Finnish', da: 'Danish', nb: 'Norwegian', en: 'English', es: 'Spanish', pt: 'Portuguese',
  el: 'Greek', ro: 'Romanian', bg: 'Bulgarian', hr: 'Croatian', lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian',
};

export interface Country { id: string; code: string; name: string; region: string; langs: string[]; gs1: string }
export const REGIONS = ['Central Europe', 'DACH', 'Benelux', 'Nordics', 'UK & Ireland', 'Western Europe', 'Southern Europe', 'Southeast Europe', 'Baltics'];
export const REGION_SHORT: Record<string, string> = {
  'Central Europe': 'CE', DACH: 'DACH', Benelux: 'BNL', Nordics: 'NORD', 'UK & Ireland': 'UKI', 'Western Europe': 'WE',
  'Southern Europe': 'SEU', 'Southeast Europe': 'SEE', Baltics: 'BAL',
};
const C = (id: string, name: string, region: string, langs: string[], gs1: string): Country => ({ id, code: id.toUpperCase(), name, region, langs, gs1 });
export const COUNTRIES: Country[] = [
  C('pl', 'Poland', 'Central Europe', ['pl'], '590'),
  C('cz', 'Czechia', 'Central Europe', ['cs'], '859'),
  C('sk', 'Slovakia', 'Central Europe', ['sk'], '858'),
  C('hu', 'Hungary', 'Central Europe', ['hu'], '599'),
  C('de', 'Germany', 'DACH', ['de'], '400'),
  C('at', 'Austria', 'DACH', ['de'], '900'),
  C('ch', 'Switzerland', 'DACH', ['de', 'fr', 'it'], '760'),
  C('nl', 'Netherlands', 'Benelux', ['nl'], '871'),
  C('be', 'Belgium', 'Benelux', ['nl', 'fr'], '541'),
  C('se', 'Sweden', 'Nordics', ['sv'], '730'),
  C('fi', 'Finland', 'Nordics', ['fi', 'sv'], '641'),
  C('dk', 'Denmark', 'Nordics', ['da'], '570'),
  C('no', 'Norway', 'Nordics', ['nb'], '709'),
  C('gb', 'United Kingdom', 'UK & Ireland', ['en'], '501'),
  C('ie', 'Ireland', 'UK & Ireland', ['en'], '539'),
  C('fr', 'France', 'Western Europe', ['fr'], '300'),
  C('es', 'Spain', 'Southern Europe', ['es'], '840'),
  C('it', 'Italy', 'Southern Europe', ['it'], '800'),
  C('pt', 'Portugal', 'Southern Europe', ['pt'], '560'),
  C('gr', 'Greece', 'Southern Europe', ['el'], '520'),
  C('ro', 'Romania', 'Southeast Europe', ['ro'], '594'),
  C('bg', 'Bulgaria', 'Southeast Europe', ['bg'], '380'),
  C('hr', 'Croatia', 'Southeast Europe', ['hr'], '385'),
  C('lt', 'Lithuania', 'Baltics', ['lt'], '477'),
  C('lv', 'Latvia', 'Baltics', ['lv'], '475'),
  C('ee', 'Estonia', 'Baltics', ['et'], '474'),
];
export const COUNTRY: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
const COUNTRY_ORDER: Record<string, number> = Object.fromEntries(COUNTRIES.map((c, i) => [c.id, i]));

/** Markets that sell one physical pack with a shared multilingual artwork. */
export const SHARED_GROUPS: { ids: string[]; code: string; label: string }[] = [
  { ids: ['cz', 'sk'], code: 'CZSK', label: 'Czech/Slovak bilingual' },
  { ids: ['gb', 'ie'], code: 'GBIE', label: 'UK/Ireland shared' },
  { ids: ['lt', 'lv', 'ee'], code: 'BALT', label: 'Baltic trilingual' },
];

export interface Person { short: string; full: string; role: string; scope: string; office: string; email: string }
const P = (short: string, full: string, role: string, scope: string, office: string, email: string): Person => ({ short, full, role, scope, office, email });
export const REVIEWERS: Record<string, Person> = {
  nowak: P('K. Nowak', 'Katarzyna Nowak', 'Regulatory reviewer', 'Poland', 'Warsaw', 'katarzyna.nowak@northvale.com'),
  svoboda: P('P. Svoboda', 'Petra Svoboda', 'Regulatory reviewer', 'Czechia & Slovakia', 'Prague', 'petra.svoboda@northvale.com'),
  szabo: P('Á. Szabó', 'Ádám Szabó', 'Regulatory reviewer', 'Hungary', 'Budapest', 'adam.szabo@northvale.com'),
  hoffmann: P('L. Hoffmann', 'Lena Hoffmann', 'Regulatory reviewer', 'DACH', 'Hamburg', 'lena.hoffmann@northvale.com'),
  devries: P('P. de Vries', 'Pieter de Vries', 'Regulatory reviewer', 'Benelux', 'Rotterdam', 'pieter.devries@northvale.com'),
  lindqvist: P('S. Lindqvist', 'Sanna Lindqvist', 'Regulatory reviewer', 'Nordics', 'Stockholm', 'sanna.lindqvist@northvale.com'),
  gallagher: P('O. Gallagher', 'Orla Gallagher', 'Regulatory reviewer', 'UK & Ireland', 'Leeds', 'orla.gallagher@northvale.com'),
  dubois: P('C. Dubois', 'Claire Dubois', 'Regulatory reviewer', 'France', 'Paris', 'claire.dubois@northvale.com'),
  ferrer: P('L. Ferrer', 'Lucía Ferrer', 'Regulatory reviewer', 'Spain & Portugal', 'Madrid', 'lucia.ferrer@northvale.com'),
  romano: P('G. Romano', 'Giulia Romano', 'Regulatory reviewer', 'Italy & Greece', 'Milan', 'giulia.romano@northvale.com'),
  popescu: P('A. Popescu', 'Andrei Popescu', 'Regulatory reviewer', 'Southeast Europe', 'Bucharest', 'andrei.popescu@northvale.com'),
  kazlauskiene: P('R. Kazlauskienė', 'Rūta Kazlauskienė', 'Regulatory reviewer', 'Baltics', 'Vilnius', 'ruta.kazlauskiene@northvale.com'),
};
const REVIEWER_BY_COUNTRY: Record<string, string> = {
  pl: 'nowak', cz: 'svoboda', sk: 'svoboda', hu: 'szabo', de: 'hoffmann', at: 'hoffmann', ch: 'hoffmann', nl: 'devries', be: 'devries',
  se: 'lindqvist', fi: 'lindqvist', dk: 'lindqvist', no: 'lindqvist', gb: 'gallagher', ie: 'gallagher', fr: 'dubois', es: 'ferrer', pt: 'ferrer',
  it: 'romano', gr: 'romano', ro: 'popescu', bg: 'popescu', hr: 'popescu', lt: 'kazlauskiene', lv: 'kazlauskiene', ee: 'kazlauskiene',
};
export const reviewerFor = (countryId: string) => REVIEWERS[REVIEWER_BY_COUNTRY[countryId]];

export const DESIGNERS = ['E. Zielińska', 'T. Wiśniewski', 'H. Dvořáková', 'J. Brandt', 'I. Horáková', 'M. Lindgren', 'R. Okoye'];
export const PREPRESS = 'R. Mazur (Prepress)';

export interface Printer { id: string; name: string; city: string; country: string; contact: string; role: string; email: string; phone: string; address: string; accepts: string; ftp: string }
const PR = (id: string, name: string, city: string, country: string, contact: string, role: string, email: string, phone: string, address: string): Printer => ({
  id, name, city, country, contact, role, email, phone, address,
  accepts: 'PDF/X-4, 1-bit TIFF for barcodes, ink list CMYK + up to 3 spot colours', ftp: `sftp://${id}.partners.northvale.com`,
});
export const PRINTERS: Record<string, Printer> = {
  drukpol: PR('drukpol', 'Drukpol S.A.', 'Łódź', 'Poland', 'Piotr Kamiński', 'Prepress coordinator', 'p.kaminski@drukpol.pl', '+48 42 683 40 12', 'ul. Wólczańska 225, 93-005 Łódź'),
  moravia: PR('moravia', 'Tiskárna Moravia Flex s.r.o.', 'Brno', 'Czechia', 'Lucie Benešová', 'Repro & prepress', 'benesova@moraviaflex.cz', '+420 543 211 870', 'Vídeňská 104, 619 00 Brno'),
  pannon: PR('pannon', 'Pannon Flexo Kft.', 'Győr', 'Hungary', 'Gábor Kiss', 'Customer service lead', 'gabor.kiss@pannonflexo.hu', '+36 96 512 330', 'Ipari park 14, 9027 Győr'),
  flexoprint: PR('flexoprint', 'Flexoprint Nord GmbH', 'Bremen', 'Germany', 'Sabine Krüger', 'Druckvorstufe', 's.krueger@flexoprint-nord.de', '+49 421 380 66 0', 'Hansator 12, 28217 Bremen'),
  vanhouten: PR('vanhouten', 'Drukkerij Van Houten B.V.', 'Tilburg', 'Netherlands', 'Bram Jansen', 'Prepress', 'b.jansen@vanhouten.nl', '+31 13 455 72 00', 'Ringbaan-Oost 300, 5013 CD Tilburg'),
  nordflex: PR('nordflex', 'Nordflex Pack AB', 'Norrköping', 'Sweden', 'Erik Holm', 'Original & prepress', 'erik.holm@nordflex.se', '+46 11 470 22 10', 'Malmgatan 8, 602 23 Norrköping'),
  pennine: PR('pennine', 'Pennine Flexibles Ltd', 'Halifax', 'United Kingdom', 'Rachel Dobson', 'Artwork controller', 'r.dobson@penninefx.co.uk', '+44 1422 380 455', 'Shay Lane, Halifax HX3 6RQ'),
  lys: PR('lys', 'Imprimerie du Lys', 'Lille', 'France', 'Julien Morel', 'Prépresse', 'j.morel@imprimeriedulys.fr', '+33 3 20 54 18 90', '45 rue de Tournai, 59000 Lille'),
  adda: PR('adda', 'Grafiche Adda S.p.A.', 'Lecco', 'Italy', 'Marco Bellini', 'Prestampa', 'm.bellini@graficheadda.it', '+39 0341 288 410', 'Via dell’Industria 22, 23900 Lecco'),
  levante: PR('levante', 'Flexográfica Levante S.L.', 'Valencia', 'Spain', 'Ana Ruiz', 'Preimpresión', 'ana.ruiz@flexolevante.es', '+34 961 340 255', 'Polígono Fuente del Jarro, 46988 Paterna'),
  tipoflex: PR('tipoflex', 'Tipoflex S.R.L.', 'Cluj-Napoca', 'Romania', 'Ioana Mureșan', 'Prepress', 'ioana.muresan@tipoflex.ro', '+40 264 450 118', 'Str. Traian Vuia 208, 400397 Cluj-Napoca'),
  baltprint: PR('baltprint', 'Baltprint UAB', 'Kaunas', 'Lithuania', 'Tomas Petrauskas', 'Prepress', 't.petrauskas@baltprint.lt', '+370 37 401 220', 'Pramonės pr. 16, 51327 Kaunas'),
};
const PRINTER_BY_COUNTRY: Record<string, string> = {
  pl: 'drukpol', cz: 'moravia', sk: 'moravia', hu: 'pannon', de: 'flexoprint', at: 'flexoprint', ch: 'flexoprint', nl: 'vanhouten', be: 'vanhouten',
  se: 'nordflex', fi: 'nordflex', dk: 'nordflex', no: 'nordflex', gb: 'pennine', ie: 'pennine', fr: 'lys', es: 'levante', pt: 'levante', it: 'adda',
  gr: 'adda', ro: 'tipoflex', bg: 'tipoflex', hr: 'tipoflex', lt: 'baltprint', lv: 'baltprint', ee: 'baltprint',
};

// ───────────────────────────── Categories & formats ─────────────────────────────

export interface FormatDef { code: string; name: string; kind: string; shape: Shape; material: string }
const F = (code: string, name: string, kind: string, shape: Shape, material: string): FormatDef => ({ code, name, kind, shape, material });
const M_POUCH = 'OPP 20 µm / metallised OPP 20 µm laminate';
const M_BAG = 'OPP 20 µm / metallised OPP 18 µm laminate';
const M_FLOW = 'Cold-seal OPP 35 µm, white-pearlised';
const M_CARTON = 'GC2 folding boxboard 350 g/m²';
const M_TIN = 'Tinplate 0.18 mm, offset-lithographed';
const M_MULTI = 'Transparent OPP 30 µm flow-pack outer';
export const CATEGORIES: Record<string, { label: string; formats: FormatDef[] }> = {
  crisps: { label: 'Potato crisps', formats: [F('B040', '40 g bag', 'Pillow bag', 'pillow', M_BAG), F('B090', '90 g bag', 'Pillow bag', 'pillow', M_BAG), F('P150', '150 g pouch', 'Stand-up pouch', 'pouch', M_POUCH), F('M625', '6×25 g multipack', 'Multipack outer', 'multipack', M_MULTI), F('B200', '200 g sharing bag', 'Pillow bag', 'pillow', M_BAG)] },
  chocolate: { label: 'Chocolate bars', formats: [F('W045', '45 g bar', 'Flow-wrap', 'flowwrap', M_FLOW), F('T100', '100 g tablet', 'Tablet wrap', 'tablet', 'Paper 60 g/m² sleeve + aluminium foil'), F('M445', '4×45 g multipack', 'Multipack outer', 'multipack', M_MULTI), F('P180', '180 g sharing pouch', 'Stand-up pouch', 'pouch', M_POUCH)] },
  sweets: { label: 'Boiled sweets & pastilles', formats: [F('B150', '150 g bag', 'Pillow bag', 'pillow', M_BAG), F('R040', '40 g roll', 'Stick roll', 'stick', 'Paper/aluminium roll wrap'), F('N200', '200 g tin', 'Tin', 'tin', M_TIN)] },
  biscuits: { label: 'Biscuits & cereal bars', formats: [F('K200', '200 g pack', 'Flow-pack', 'flowwrap', M_FLOW), F('K400', '400 g twin pack', 'Flow-pack', 'flowwrap', M_FLOW), F('W035', '35 g bar', 'Flow-wrap', 'flowwrap', M_FLOW), F('M535', '5×35 g multipack', 'Carton', 'carton', M_CARTON)] },
  popcorn: { label: 'Popcorn', formats: [F('B080', '80 g bag', 'Pillow bag', 'pillow', M_BAG), F('B170', '170 g sharing bag', 'Pillow bag', 'pillow', M_BAG), F('M320', '3×20 g multipack', 'Multipack outer', 'multipack', M_MULTI), F('C270', '3×90 g microwave carton', 'Carton', 'carton', M_CARTON)] },
  wafers: { label: 'Wafers', formats: [F('W045', '45 g bar', 'Flow-wrap', 'flowwrap', M_FLOW), F('K180', '180 g pack', 'Flow-pack', 'flowwrap', M_FLOW), F('N250', '250 g tin', 'Tin', 'tin', M_TIN), F('P300', '300 g pouch', 'Stand-up pouch', 'pouch', M_POUCH)] },
  pretzels: { label: 'Pretzels', formats: [F('B150', '150 g bag', 'Pillow bag', 'pillow', M_BAG), F('B250', '250 g bag', 'Pillow bag', 'pillow', M_BAG), F('M625', '6×25 g multipack', 'Multipack outer', 'multipack', M_MULTI)] },
  premium: { label: 'Premium chocolate', formats: [F('T100', '100 g tablet', 'Tablet wrap', 'tablet', 'Paper 60 g/m² sleeve + aluminium foil'), F('T035', '35 g mini tablet', 'Tablet wrap', 'tablet', 'Paper 60 g/m² sleeve + aluminium foil'), F('C200', '200 g gift box', 'Carton', 'carton', M_CARTON)] },
  nuts: { label: 'Nuts', formats: [F('B150', '150 g bag', 'Pillow bag', 'pillow', M_BAG), F('B300', '300 g bag', 'Pillow bag', 'pillow', M_BAG), F('J400', '400 g jar', 'Jar + label', 'jar', 'PET jar, in-mould label PP 60 µm')] },
  gummies: { label: 'Gummies', formats: [F('B100', '100 g bag', 'Pillow bag', 'pillow', M_BAG), F('B200', '200 g bag', 'Pillow bag', 'pillow', M_BAG), F('P400', '400 g pouch', 'Stand-up pouch', 'pouch', M_POUCH), F('M1020', '10×20 g multipack', 'Multipack outer', 'multipack', M_MULTI)] },
  corn: { label: 'Corn & tortilla snacks', formats: [F('B075', '75 g bag', 'Pillow bag', 'pillow', M_BAG), F('B175', '175 g bag', 'Pillow bag', 'pillow', M_BAG), F('J300', '300 g dip jar', 'Jar + label', 'jar', 'Glass jar, paper label 80 g/m²')] },
  pralines: { label: 'Pralines & gifting', formats: [F('C200', '200 g gift box', 'Carton', 'carton', M_CARTON), F('C400', '400 g gift box', 'Carton', 'carton', M_CARTON), F('B150', '150 g bag', 'Pillow bag', 'pillow', M_BAG)] },
  shortbread: { label: 'Shortbread', formats: [F('K150', '150 g carton', 'Carton', 'carton', M_CARTON), F('N400', '400 g tin', 'Tin', 'tin', M_TIN), F('W040', '40 g twin pack', 'Flow-wrap', 'flowwrap', M_FLOW)] },
  gum: { label: 'Gum & mints', formats: [F('S014', '14 g stick pack', 'Stick pack', 'stick', 'Paper/aluminium stick wrap'), F('J060', '60 g bottle', 'Bottle + label', 'jar', 'PP bottle, shrink sleeve PETG 40 µm'), F('N050', '50 g tin', 'Tin', 'tin', M_TIN)] },
};

// ───────────────────────────── Brands ─────────────────────────────

interface BrandDef { id: string; name: string; code: string; cat: string; color: string; ink: string; skus: number; manager: string; lines: string[] }
const BRAND_DEFS: BrandDef[] = [
  { id: 'crunchwell', name: 'Crunchwell', code: 'CW', cat: 'crisps', color: '#c8411b', ink: '#fff6e6', skus: 148, manager: 'D. Okafor', lines: ['Paprika', 'Sea Salt', 'Salt & Vinegar', 'Cheese & Onion', 'Sour Cream & Chive', 'Smoked Bacon', 'Sweet Chilli', 'Ridged Original', 'Lightly Salted Oven Baked'] },
  { id: 'halvi', name: 'Halvi', code: 'HV', cat: 'chocolate', color: '#5b2a86', ink: '#f7efe2', skus: 184, manager: 'S. Varga', lines: ['Milk Classic', 'Hazelnut Crunch', 'Caramel Swirl', 'Whole Almond', 'Dark 70%', 'Biscuit Crisp', 'Salted Caramel', 'Cookie Dough', 'Orange Twist', 'Mint Crisp', 'White Raspberry', 'Peanut Butter', 'Coconut', 'Fruit & Nut', 'Toffee Crunch', 'Honeycomb', 'Strawberry Cream', 'Triple Layer', 'Mini Bites Mix', 'Rice Crisp', 'Coffee Cream', 'Pistachio'] },
  { id: 'pebbleton', name: 'Pebbleton', code: 'PB', cat: 'sweets', color: '#1f7a8c', ink: '#fffbea', skus: 131, manager: 'A. Lambert', lines: ['Fruit Drops', 'Sherbet Lemons', 'Blackcurrant Pastilles', 'Eucalyptus & Menthol', 'Honey & Lemon', 'Butterscotch', 'Cola Drops', 'Mixed Berry', 'Sugar-Free Fruit', 'Liquorice Allsorts', 'Rhubarb & Custard', 'Pear Drops', 'Aniseed Twists', 'Strawberry Chews', 'Tropical Mix', 'Winter Spice', 'Cherry Menthol'] },
  { id: 'mornbrook', name: 'Mornbrook', code: 'MB', cat: 'biscuits', color: '#b07a2a', ink: '#fffaf0', skus: 176, manager: 'F. Novak', lines: ['Oat Digestive', 'Chocolate Digestive', 'Golden Oat Bar', 'Apple & Cinnamon Bar', 'Berry Granola Bar', 'Honey Nut Bar', 'Breakfast Biscuits Original', 'Breakfast Biscuits Cocoa', 'Rich Tea', 'Ginger Snaps', 'Fig Rolls', 'Custard Creams', 'Bourbon Creams', 'Wholegrain Crackers', 'Rye Crispbread', 'Seeded Thins', 'Lemon Shortcake', 'Protein Bar Peanut', 'Protein Bar Cocoa'] },
  { id: 'tidewick', name: 'Tidewick', code: 'TW', cat: 'popcorn', color: '#2b4c7e', ink: '#fff4d6', skus: 84, manager: 'M. Rossi', lines: ['Sweet & Salty', 'Sea Salt', 'Toffee', 'Salted Caramel', 'Butter', 'Sour Cream & Onion', 'Cheddar', 'Chilli & Lime', 'Microwave Butter', 'Microwave Salted', 'Cinema Sweet'] },
  { id: 'ferrolo', name: 'Ferrolo', code: 'FR', cat: 'wafers', color: '#8a3b12', ink: '#fdf3df', skus: 152, manager: 'G. Conti', lines: ['Hazelnut Wafer', 'Cocoa Wafer', 'Vanilla Wafer', 'Lemon Wafer', 'Milk Chocolate Coated', 'Dark Chocolate Coated', 'Wafer Rolls Hazelnut', 'Wafer Rolls Cocoa', 'Mini Wafers Mix', 'Coconut Wafer', 'Peanut Wafer', 'Strawberry Wafer', 'Tiramisu Wafer', 'Wafer Cubes Hazelnut', 'Wafer Cubes Cocoa', 'Caramel Wafer'] },
  { id: 'saltmarsh', name: 'Saltmarsh', code: 'SM', cat: 'pretzels', color: '#355e3b', ink: '#f4efe3', skus: 97, manager: 'H. Becker', lines: ['Classic Twists', 'Salted Sticks', 'Sesame Sticks', 'Honey Mustard Bites', 'Sourdough Knots', 'Cheese Bites', 'Wholegrain Twists', 'Pretzel Thins', 'Chocolate Dipped', 'Everything Seasoning', 'Mini Pretzels', 'Salt & Pepper Rings'] },
  { id: 'brindle-oak', name: 'Brindle & Oak', code: 'BO', cat: 'premium', color: '#2e2a26', ink: '#e9d8a6', skus: 163, manager: 'C. Whitfield', lines: ['Madagascar 72%', 'Ecuador 85%', 'Ghana Milk 40%', 'Sea Salt Dark', 'Almond & Sea Salt Milk', 'Raspberry Dark', 'Orange & Cardamom', 'Hazelnut Praline Milk', 'Coffee Bean Dark', 'Ginger Dark', 'Caramelised Milk', 'Pistachio Milk', 'Cherry & Almond Dark', 'Mint Dark', 'Chilli Dark', 'Oat Milk Vegan', 'Gift Selection', 'Advent Collection'] },
  { id: 'kipfer', name: 'Kipfer', code: 'KP', cat: 'nuts', color: '#a5531f', ink: '#fff7e8', skus: 118, manager: 'J. Weber', lines: ['Salted Peanuts', 'Dry Roasted Peanuts', 'Honey Roasted Peanuts', 'Cashews Salted', 'Almonds Smoked', 'Mixed Nuts Deluxe', 'Pistachios Salted', 'Chilli Coated Peanuts', 'Wasabi Peas Mix', 'Nut & Raisin', 'Student Mix', 'Macadamia Sea Salt', 'Coated Peanuts Paprika', 'Pecan Maple'] },
  { id: 'lumo', name: 'Lumo', code: 'LM', cat: 'gummies', color: '#d6336c', ink: '#fff0f6', skus: 159, manager: 'N. Jensen', lines: ['Fruit Bears', 'Sour Worms', 'Cola Bottles', 'Peach Rings', 'Fizzy Mix', 'Watermelon Slices', 'Tropical Gummies', 'Vegan Fruit Mix', 'Sugar-Reduced Bears', 'Liquorice Wheels', 'Strawberry Laces', 'Jelly Beans', 'Marshmallow Twists', 'Sour Cherries', 'Fruit Hearts', 'Mega Mix', 'Halloween Mix', 'Easter Chicks', 'Kids Vitamin Gummies', 'Cherry Cola Bites'] },
  { id: 'ostra', name: 'Ostra', code: 'OS', cat: 'corn', color: '#e0a100', ink: '#2a1a00', skus: 102, manager: 'L. Moreno', lines: ['Tortilla Lightly Salted', 'Tortilla Chilli', 'Tortilla Cheese', 'Corn Puffs Cheese', 'Corn Puffs Ketchup', 'Nachos Sharing', 'Salsa Dip Mild', 'Salsa Dip Hot', 'Cheese Dip', 'Corn Rings Paprika', 'Corn Rings Salted', 'Lime & Sea Salt', 'Smoky BBQ'] },
  { id: 'velmora', name: 'Velmora', code: 'VM', cat: 'pralines', color: '#7d1d3f', ink: '#f6e7c1', skus: 141, manager: 'E. Fontaine', lines: ['Classic Assortment', 'Hazelnut Pralines', 'Dark Truffles', 'Milk Truffles', 'Champagne Truffles', 'Cherry Liqueur', 'Marzipan Bites', 'Nougat Selection', 'Caramel Hearts', 'Gold Gift Box', 'Mini Pralines', 'Christmas Selection', 'Easter Eggs', 'Coffee Pralines', 'Coconut Pralines'] },
  { id: 'dunmere', name: 'Dunmere', code: 'DM', cat: 'shortbread', color: '#1d4e89', ink: '#f8f1e2', skus: 96, manager: 'K. Fraser', lines: ['All Butter Fingers', 'Petticoat Tails', 'Rounds', 'Chocolate Chip', 'Stem Ginger', 'Lemon Zest', 'Millionaire’s', 'Oat & Honey', 'Gift Tin', 'Highland Selection', 'Gluten-Free Fingers', 'Mini Rounds'] },
  { id: 'zesta', name: 'Zesta', code: 'ZS', cat: 'gum', color: '#0f9d75', ink: '#f0fff8', skus: 109, manager: 'P. Laine', lines: ['Peppermint Gum', 'Spearmint Gum', 'Strawberry Gum', 'Watermelon Gum', 'Whitening Gum', 'Peppermint Mints', 'Spearmint Mints', 'Extra Strong Mints', 'Cool Breath Mints', 'Lemon Mints', 'Cherry Mints', 'Liquorice Mints', 'Gum Bottle Peppermint', 'Gum Bottle Spearmint'] },
];

const CW_LINES: Record<string, { code: string; color: string }> = {
  Paprika: { code: 'PAP', color: '#c8411b' },
  'Sea Salt': { code: 'SEA', color: '#2d6fa3' },
  'Salt & Vinegar': { code: 'SVN', color: '#3f8a5a' },
  'Cheese & Onion': { code: 'CHO', color: '#1f8f7a' },
  'Sour Cream & Chive': { code: 'SCC', color: '#6aa84f' },
  'Smoked Bacon': { code: 'SBC', color: '#8b2c2c' },
  'Sweet Chilli': { code: 'SCH', color: '#d0342c' },
  'Ridged Original': { code: 'RDG', color: '#c99a1b' },
  'Lightly Salted Oven Baked': { code: 'LSB', color: '#4b8fbf' },
};
const LINE_PALETTE = ['#c8411b', '#2d6fa3', '#3f8a5a', '#8b2c2c', '#c99a1b', '#6a4c93', '#1f8f7a', '#d0342c', '#4b8fbf', '#b5487a', '#7a6a2f', '#2f5d62', '#e07a1f', '#5b6ee1'];

// ───────────────────────────── Types ─────────────────────────────

export interface Step { step: string; who: string; date?: string; state: 'done' | 'pending' | 'waiting'; note?: string }
export interface Version {
  n: number; status: Status; file: string; sizeMb: number; pages: number;
  uploaded: string; uploadedBy: string; approvedAt?: string; approvedBy?: string;
  supersededAt?: string; supersededBy?: number; summary: string; changes: string[]; trail: Step[];
  recycling: 'mobius' | 'eu'; style: 'legacy' | 'refresh'; regRev?: number;
}
export interface Artwork { id: string; code: string; label: string; marketIds: string[]; langs: string[]; versions: Version[]; ean: string }
export interface MarketEntry {
  id: string; country: Country; artworkId: string; dielineId: string; sku: string; material: string; printerId: string;
  erp: string; launched: string;
  brand: Brand; line: Line; format: Format;
}
export interface ArchivedFile { file: string; label: string; archivedAt: string; covered: string[]; note: string; sizeMb: number }
export interface Format {
  id: string; code: string; name: string; kind: string; shape: Shape; material: string;
  markets: MarketEntry[]; artworks: Record<string, Artwork>; archived: ArchivedFile[];
  brand: Brand; line: Line;
}
export interface Line { id: string; name: string; code: string; color: string; formats: Format[]; brand: Brand; launched: string }
export interface Brand { id: string; name: string; code: string; cat: string; category: string; color: string; ink: string; skuCount: number; manager: string; lines: Line[] }

export interface Dieline {
  id: string; code: string; title: string; shape: Shape; w: number; h: number; d: number; material: string;
  rev: string; updated: string; supplier: string; notes: string; eurohole: boolean; revisions: { rev: string; date: string; note: string }[];
}

// ───────────────────────────── Version generation ─────────────────────────────

const GENERIC_CHANGES = [
  'Nutrition table updated to reformulated recipe',
  'Brand refresh: new wordmark and product photography',
  'Importer address updated after entity change',
  '“May contain” statement aligned with allergen review',
  'Barcode moved clear of the back seal',
  'Recycling guidance updated to local requirements',
  'Promotional flash removed',
  'Net quantity typography increased to legal minimum height',
  'Translation corrections from regulatory review',
  'Best-before window enlarged for new coder',
];

function trailFor(r: Rng, uploaded: string, uploadedBy: string, manager: string, reviewer: Person, approvedAt: string | undefined, pending: boolean): Step[] {
  const brandDate = addDays(uploaded, int(r, 1, 4));
  if (pending) {
    return [
      { step: 'Artwork uploaded', who: uploadedBy, date: uploaded, state: 'done' },
      { step: 'Brand review', who: `${manager} (Brand manager)`, date: brandDate, state: 'done' },
      { step: 'Regulatory review', who: `${reviewer.short} (${reviewer.role}, ${reviewer.scope})`, state: 'pending', note: `Assigned ${brandDate}` },
      { step: 'Prepress check', who: PREPRESS, state: 'waiting' },
    ];
  }
  return [
    { step: 'Artwork uploaded', who: uploadedBy, date: uploaded, state: 'done' },
    { step: 'Brand review', who: `${manager} (Brand manager)`, date: brandDate, state: 'done' },
    { step: 'Regulatory review', who: `${reviewer.short} (${reviewer.role}, ${reviewer.scope})`, date: approvedAt, state: 'done' },
    { step: 'Prepress check', who: PREPRESS, date: approvedAt ? addDays(approvedAt, 1) : undefined, state: 'done' },
  ];
}

function genVersions(seed: string, filePrefix: string, reviewer: Person, manager: string): Version[] {
  const r = rng(seed);
  const approvedCount = int(r, 1, 5);
  const lastApproved = addDays('2025-01-06', int(r, 0, 660));
  const dates: string[] = [lastApproved];
  for (let i = 1; i < approvedCount; i++) dates.unshift(addDays(dates[0], -int(r, 110, 330)));
  const vs: Version[] = [];
  dates.forEach((d, i) => {
    const n = i + 1;
    const uploaded = addDays(d, -int(r, 6, 18));
    const by = pick(r, DESIGNERS);
    vs.push({
      n, status: 'approved', file: `${filePrefix}_v${n}.pdf`, sizeMb: +(8 + r() * 14).toFixed(1), pages: 2,
      uploaded, uploadedBy: by, approvedAt: d, approvedBy: reviewer.short,
      summary: n === 1 ? 'First artwork for this market' : pick(r, GENERIC_CHANGES), changes: [],
      trail: trailFor(r, uploaded, by, manager, reviewer, d, false), recycling: 'mobius', style: d < '2025-03-01' ? 'legacy' : 'refresh',
    });
  });
  for (let i = 0; i < vs.length - 1; i++) {
    vs[i].status = 'superseded';
    vs[i].supersededAt = vs[i + 1].approvedAt;
    vs[i].supersededBy = vs[i + 1].n;
  }
  const roll = r();
  if (roll < 0.2) {
    const n = vs.length + 1;
    const uploaded = addDays(TODAY, -int(r, 3, 24));
    const by = pick(r, DESIGNERS);
    vs.push({
      n, status: 'in_review', file: `${filePrefix}_v${n}.pdf`, sizeMb: +(8 + r() * 14).toFixed(1), pages: 2, uploaded, uploadedBy: by,
      summary: pick(r, GENERIC_CHANGES), changes: [], trail: trailFor(r, uploaded, by, manager, reviewer, undefined, true), recycling: r() < 0.5 ? 'eu' : 'mobius', style: 'refresh',
    });
  } else if (roll < 0.27) {
    const n = vs.length + 1;
    const uploaded = addDays(TODAY, -int(r, 1, 12));
    const by = pick(r, DESIGNERS);
    vs.push({
      n, status: 'draft', file: `${filePrefix}_v${n}_draft.pdf`, sizeMb: +(8 + r() * 14).toFixed(1), pages: 2, uploaded, uploadedBy: by,
      summary: pick(r, GENERIC_CHANGES), changes: [],
      trail: [{ step: 'Artwork uploaded', who: by, date: uploaded, state: 'done' }, { step: 'Brand review', who: `${manager} (Brand manager)`, state: 'waiting', note: 'Not yet submitted' }],
      recycling: 'mobius', style: 'refresh',
    });
  }
  return vs;
}

// ───────────────────────────── Dieline library (340) ─────────────────────────────

export const DIELINES: Record<string, Dieline> = {};
const DIELINE_SUPPLIERS = ['Amcor Flexibles template', 'Constantia template', 'Drukpol template', 'Huhtamaki template', 'Mondi template', 'In-house (Regional Design Centre)', 'Smurfit Westrock template', 'Crown Packaging template'];
function dims(code: string, shape: Shape, r: Rng): [number, number, number] {
  const g = Number(code.replace(/\D/g, '').slice(-3)) || 100;
  const j = () => int(r, -6, 6);
  switch (shape) {
    case 'pouch': return [Math.round(150 + g * 0.25) + j(), Math.round(220 + g * 0.35) + j(), 40 + int(r, 0, 3) * 5];
    case 'pillow': return [Math.round(140 + g * 0.45) + j(), Math.round(180 + g * 0.5) + j(), 0];
    case 'flowwrap': return [Math.round(110 + g * 0.3) + j(), Math.round(70 + g * 0.2) + j(), 0];
    case 'tablet': return [Math.round(150 + g * 0.2) + j(), Math.round(80 + g * 0.1) + j(), 12];
    case 'carton': return [Math.round(160 + g * 0.2) + j(), Math.round(110 + g * 0.12) + j(), 35 + int(r, 0, 4) * 5];
    case 'tin': return [Math.round(90 + g * 0.18) + j(), Math.round(60 + g * 0.05) + j(), 0];
    case 'jar': return [Math.round(200 + g * 0.1) + j(), Math.round(70 + g * 0.05) + j(), 0];
    case 'stick': return [Math.round(70 + g * 0.5) + j(), Math.round(55 + g * 0.3) + j(), 0];
    case 'multipack': return [Math.round(240 + g * 0.08) + j(), Math.round(300 + g * 0.1) + j(), 0];
  }
}
(function buildDielines() {
  const defs = new Map<string, FormatDef>();
  Object.values(CATEGORIES).forEach((c) => c.formats.forEach((f) => defs.set(f.code, f)));
  const codes = [...defs.keys()].sort();
  const others = codes.filter((c) => c !== 'P150');
  const remaining = 340 - 11;
  const base = Math.floor(remaining / others.length);
  let extra = remaining - base * others.length;
  const counts: Record<string, number> = { P150: 11 };
  others.forEach((c) => { counts[c] = base + (extra-- > 0 ? 1 : 0); });
  codes.forEach((code) => {
    const fd = defs.get(code)!;
    for (let i = 1; i <= counts[code]; i++) {
      const id = `DL-${code}-${String(i).padStart(2, '0')}`;
      const r = rng(id);
      const [w, h, d] = dims(code, fd.shape, r);
      const revN = int(r, 0, 4);
      const updated = addDays('2021-02-01', int(r, 0, 1960));
      const revisions = [];
      let rd = updated;
      for (let k = revN; k >= 0; k--) {
        revisions.push({ rev: String.fromCharCode(65 + k), date: rd, note: k === 0 ? 'Initial release' : pick(r, ['Seal width increased by 2 mm', 'Barcode zone repositioned', 'Bleed extended to 3 mm', 'Tear notch moved', 'Eye-mark position updated for new line', 'Gusset depth corrected']) });
        rd = addDays(rd, -int(r, 120, 400));
      }
      DIELINES[id] = {
        id, code, title: `${fd.kind} · ${fd.name}`, shape: fd.shape, w, h, d, material: fd.material,
        rev: String.fromCharCode(65 + revN), updated, supplier: pick(r, DIELINE_SUPPLIERS), eurohole: fd.shape === 'pillow' ? r() < 0.4 : false,
        notes: 'Keep critical text 5 mm inside seals. Barcode zone on back panel, lower right.', revisions,
      };
    }
  });
  DIELINES['DL-P150-07'] = {
    ...DIELINES['DL-P150-07'], title: 'Stand-up pouch · 150 g', w: 190, h: 275, d: 45, rev: 'C', updated: '2025-06-10', supplier: 'Drukpol template', eurohole: false, material: M_POUCH,
    notes: 'Tear notches both sides, 28 mm below top edge. Top seal 12 mm, side seals 8 mm, K-seal bottom gusset 45 mm. Barcode zone 40 × 30 mm on back panel lower right, min. 8 mm clear of side seal. Eye-mark 6 × 12 mm, back panel top left.',
    revisions: [
      { rev: 'C', date: '2025-06-10', note: 'Bottom gusset K-seal angle changed for faster line speed; artwork area unchanged' },
      { rev: 'B', date: '2024-02-05', note: 'Tear notch moved from 32 mm to 28 mm; barcode zone enlarged' },
      { rev: 'A', date: '2023-01-16', note: 'Initial release for Central Europe and DACH 150 g pouch' },
    ],
  };
  DIELINES['DL-P150-09'] = {
    ...DIELINES['DL-P150-09'], title: 'Stand-up pouch · 150 g (euro-hole)', w: 190, h: 285, d: 45, rev: 'B', updated: '2025-09-22', supplier: 'Nordflex template', eurohole: true, material: M_POUCH,
    notes: 'As DL-P150-07 with +10 mm header and euro-hole for peg display. Keep logos below the 22 mm header zone.',
    revisions: [
      { rev: 'B', date: '2025-09-22', note: 'Euro-hole moved 2 mm down to clear top seal' },
      { rev: 'A', date: '2024-04-08', note: 'Initial release for Benelux, Nordics and Switzerland' },
    ],
  };
})();
const DIELINES_BY_CODE: Record<string, string[]> = {};
Object.values(DIELINES).forEach((d) => {
  if (d.id === 'DL-P150-07' || d.id === 'DL-P150-09') return;
  (DIELINES_BY_CODE[d.code] ||= []).push(d.id);
});

// ───────────────────────────── Build structure ─────────────────────────────

export const BRANDS: Brand[] = [];

function lineCode(name: string, used: Set<string>): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  let c = words.length >= 3 ? words.slice(0, 3).map((w) => w[0]).join('') : words.length === 2 ? words[0].slice(0, 2) + words[1][0] : words[0].slice(0, 3);
  c = c.toUpperCase();
  let k = 2;
  let out = c;
  while (used.has(out)) out = c.slice(0, 2) + k++;
  used.add(out);
  return out;
}

function makeArtworks(fmt: Format, prefix: string, seedBase: string, manager: string) {
  const ids = fmt.markets.map((m) => m.country.id);
  const assigned = new Set<string>();
  for (const g of SHARED_GROUPS) {
    const present = g.ids.filter((x) => ids.includes(x));
    if (present.length >= 2) {
      const langs = [...new Set(present.flatMap((x) => COUNTRY[x].langs))];
      const code = present.length === g.ids.length ? g.code : present.map((x) => x.toUpperCase()).join('');
      const rev = reviewerFor(present[0]);
      fmt.artworks[code.toLowerCase()] = {
        id: code.toLowerCase(), code, label: g.label, marketIds: present, langs,
        versions: genVersions(`${seedBase}-${code}`, `${prefix}_${code}`, rev, manager), ean: '',
      };
      present.forEach((x) => assigned.add(x));
    }
  }
  for (const id of ids) {
    if (assigned.has(id)) continue;
    const c = COUNTRY[id];
    fmt.artworks[id] = {
      id, code: c.code, label: c.langs.length > 1 ? `${c.name} multilingual` : `${c.name}`, marketIds: [id], langs: c.langs,
      versions: genVersions(`${seedBase}-${id}`, `${prefix}_${c.code}`, reviewerFor(id), manager), ean: '',
    };
  }
  fmt.markets.forEach((m) => {
    m.artworkId = Object.values(fmt.artworks).find((a) => a.marketIds.includes(m.country.id))!.id;
  });
  Object.values(fmt.artworks).forEach((a) => {
    const r = rng(`ean-${prefix}-${a.code}`);
    const c = COUNTRY[a.marketIds[0]];
    a.ean = eanCheck(c.gs1 + String(int(r, 1000, 9999)) + String(int(r, 10000, 99999)));
  });
}

function makeEntry(brand: Brand, line: Line, fmt: Format, cid: string, r: Rng): MarketEntry {
  return {
    id: cid, country: COUNTRY[cid], artworkId: '', dielineId: '', sku: `${brand.code}-${line.code}-${fmt.code}-${cid.toUpperCase()}`,
    material: fmt.material, printerId: PRINTER_BY_COUNTRY[cid], erp: String(41000000 + int(r, 0, 8999999)), launched: addDays('2019-03-01', int(r, 0, 2000)),
    brand, line, format: fmt,
  };
}
const sortCountries = (ids: string[]) => ids.sort((a, b) => COUNTRY_ORDER[a] - COUNTRY_ORDER[b]);

function weightedCountries(r: Rng, n: number): string[] {
  const W: Record<string, number> = { pl: 3, cz: 2.4, sk: 2.2, hu: 2, de: 3, at: 2, ch: 1.4, nl: 2, be: 1.6, se: 1.5, fi: 1.2, dk: 1.2, no: 1, gb: 2.6, ie: 1.8, fr: 2, es: 1.4, it: 1.5, pt: 0.8, gr: 0.7, ro: 1.2, bg: 0.8, hr: 0.8, lt: 0.9, lv: 0.8, ee: 0.8 };
  return sortCountries(
    COUNTRIES.map((c) => ({ id: c.id, k: Math.pow(r(), 1 / W[c.id]) }))
      .sort((a, b) => b.k - a.k)
      .slice(0, n)
      .map((x) => x.id),
  );
}

function buildFormat(brand: Brand, line: Line, def: FormatDef, countries: string[], seed: string): Format {
  const fmt: Format = { id: def.code.toLowerCase(), code: def.code, name: def.name, kind: def.kind, shape: def.shape, material: def.material, markets: [], artworks: {}, archived: [], brand, line };
  const r = rng(seed);
  fmt.markets = sortCountries([...countries]).map((cid) => makeEntry(brand, line, fmt, cid, r));
  makeArtworks(fmt, `${brand.code}_${line.code}_${def.code}`, seed, brand.manager);
  const pool = DIELINES_BY_CODE[def.code] || [];
  const primary = pick(r, pool);
  const secondary = pick(r, pool);
  fmt.markets.forEach((m) => { m.dielineId = r() < 0.25 ? secondary : primary; });
  return fmt;
}

function handPaprika150(brand: Brand, line: Line): Format {
  const def = CATEGORIES.crisps.formats.find((f) => f.code === 'P150')!;
  const fmt: Format = { id: 'p150', code: 'P150', name: def.name, kind: def.kind, shape: def.shape, material: def.material, markets: [], artworks: {}, archived: [], brand, line };
  const ids = ['pl', 'cz', 'sk', 'hu', 'de', 'at', 'ch', 'nl', 'be', 'se', 'fi'];
  const r = rng('cw-pap-p150');
  fmt.markets = ids.map((cid) => makeEntry(brand, line, fmt, cid, r));
  makeArtworks(fmt, 'CW_PAP_P150', 'cw-pap-p150', brand.manager);
  const shared07 = ['pl', 'cz', 'sk', 'hu', 'de', 'at'];
  fmt.markets.forEach((m) => { m.dielineId = shared07.includes(m.country.id) ? 'DL-P150-07' : 'DL-P150-09'; });
  const pl = fmt.markets.find((m) => m.id === 'pl')!;
  pl.erp = '41207735';
  pl.launched = '2024-02-12';

  const nowak = REVIEWERS.nowak;
  const mgr = 'D. Okafor';
  const done = (step: string, who: string, date: string, note?: string): Step => ({ step, who, date, state: 'done', note });
  const regStep = (rv: Person) => `${rv.short} (${rv.role}, ${rv.scope})`;
  const appr = (n: number, prefix: string, uploaded: string, by: string, brandD: string, apprD: string, rv: Person, summary: string, changes: string[], style: 'legacy' | 'refresh', regRev: number): Version => ({
    n, status: 'approved', file: `${prefix}_v${n}.pdf`, sizeMb: +(14 + n * 0.9).toFixed(1), pages: 2, uploaded, uploadedBy: by,
    approvedAt: apprD, approvedBy: rv.short, summary, changes, recycling: 'mobius', style, regRev,
    trail: [done('Artwork uploaded', by, uploaded), done('Brand review', `${mgr} (Brand manager)`, brandD), done('Regulatory review', regStep(rv), apprD), done('Prepress check', PREPRESS, addDays(apprD, 1))],
  });
  const plV: Version[] = [
    appr(1, 'CW_PAP_P150_PL', '2024-01-22', 'E. Zielińska', '2024-01-26', '2024-02-12', nowak, 'First Poland-only artwork, split out of the Central Europe regional artwork', ['Polish-only ingredient panel replaces the four-language CE panel', 'Polish importer address added', 'Uses dieline DL-P150-07 rev B'], 'legacy', 1),
    appr(2, 'CW_PAP_P150_PL', '2024-09-10', 'E. Zielińska', '2024-09-13', '2024-10-01', nowak, 'Importer address updated after entity change', ['Importer changed to Northvale Foods Polska Sp. z o.o.', 'Customer care phone number updated'], 'legacy', 2),
    appr(3, 'CW_PAP_P150_PL', '2025-10-27', 'T. Wiśniewski', '2025-11-03', '2025-11-18', nowak, 'Brand refresh: new Crunchwell wordmark and paprika illustration', ['New Crunchwell wordmark (brand refresh 2025)', 'New paprika illustration on front panel', 'Back panel layout rebuilt to DL-P150-07 rev C'], 'refresh', 2),
    appr(4, 'CW_PAP_P150_PL', '2026-08-21', 'E. Zielińska', '2026-08-27', '2026-09-03', nowak, 'Nutrition table updated to 2026 recipe', ['Salt per 100 g changed 1.4 g → 1.3 g (2026 recipe)', 'Regulatory text RT-PL-CW-PAP updated to rev 3', '“May contain” statement now lists mustard'], 'refresh', 3),
  ];
  plV[3].sizeMb = 18.4;
  for (let i = 0; i < 3; i++) Object.assign(plV[i], { status: 'superseded', supersededAt: plV[i + 1].approvedAt, supersededBy: i + 2 });
  plV.push({
    n: 5, status: 'in_review', file: 'CW_PAP_P150_PL_v5.pdf', sizeMb: 18.9, pages: 2, uploaded: '2026-11-12', uploadedBy: 'T. Wiśniewski',
    summary: 'New recycling mark: EU harmonised sorting label', changes: ['Adds EU harmonised sorting label (plastic) on back panel, 18 × 18 mm', 'Removes the Mobius loop from the side gusset', 'Ingredient panel and barcode unchanged from v4'],
    recycling: 'eu', style: 'refresh', regRev: 3,
    trail: [done('Artwork uploaded', 'T. Wiśniewski', '2026-11-12'), done('Brand review', `${mgr} (Brand manager)`, '2026-11-14'), { step: 'Regulatory review', who: regStep(nowak), state: 'pending', note: 'Assigned 14 Nov 2026 · due 21 Nov 2026' }, { step: 'Prepress check', who: PREPRESS, state: 'waiting' }],
  });
  fmt.artworks.pl.versions = plV;
  fmt.artworks.pl.ean = '5902187413379';

  const sv = REVIEWERS.svoboda;
  const czV: Version[] = [
    appr(1, 'CW_PAP_P150_CZSK', '2024-01-22', 'H. Dvořáková', '2024-01-26', '2024-02-12', sv, 'First Czech/Slovak bilingual artwork, split out of the Central Europe regional artwork', ['Bilingual cs/sk ingredient panel', 'Shared EAN for Czechia and Slovakia'], 'legacy', 1),
    appr(2, 'CW_PAP_P150_CZSK', '2024-05-06', 'H. Dvořáková', '2024-05-09', '2024-05-21', sv, 'Translation corrections from regulatory review', ['Slovak allergen wording corrected'], 'legacy', 1),
    appr(3, 'CW_PAP_P150_CZSK', '2024-11-04', 'I. Horáková', '2024-11-07', '2024-11-25', sv, 'Promotional flash “+20 % zdarma” removed', ['Promo flash removed from front panel'], 'legacy', 1),
    appr(4, 'CW_PAP_P150_CZSK', '2025-10-20', 'I. Horáková', '2025-10-24', '2025-11-12', sv, 'Brand refresh: new Crunchwell wordmark and paprika illustration', ['New wordmark and illustration'], 'refresh', 2),
    appr(5, 'CW_PAP_P150_CZSK', '2026-02-09', 'H. Dvořáková', '2026-02-12', '2026-02-26', sv, 'Barcode moved clear of the back seal', ['Barcode shifted 6 mm left'], 'refresh', 2),
    appr(6, 'CW_PAP_P150_CZSK', '2026-07-01', 'H. Dvořáková', '2026-07-06', '2026-07-14', sv, 'Nutrition table updated to 2026 recipe', ['Salt per 100 g changed 1.4 g → 1.3 g', 'RT-CZ-CW-PAP and RT-SK-CW-PAP rev 3'], 'refresh', 3),
  ];
  for (let i = 0; i < 5; i++) Object.assign(czV[i], { status: 'superseded', supersededAt: czV[i + 1].approvedAt, supersededBy: i + 2 });
  czV.push({
    n: 7, status: 'in_review', file: 'CW_PAP_P150_CZSK_v7.pdf', sizeMb: 19.6, pages: 2, uploaded: '2026-11-10', uploadedBy: 'H. Dvořáková',
    summary: 'New recycling mark: EU harmonised sorting label', changes: ['Adds EU harmonised sorting label (plastic) on back panel', 'Removes the Mobius loop from the side gusset'], recycling: 'eu', style: 'refresh', regRev: 3,
    trail: [done('Artwork uploaded', 'H. Dvořáková', '2026-11-10'), done('Brand review', `${mgr} (Brand manager)`, '2026-11-13'), { step: 'Regulatory review', who: regStep(sv), state: 'pending', note: 'Assigned 13 Nov 2026 · due 20 Nov 2026' }, { step: 'Prepress check', who: PREPRESS, state: 'waiting' }],
  });
  fmt.artworks.czsk.versions = czV;
  fmt.artworks.czsk.ean = '8590412873320';

  // Make sure the remaining 150 g artworks have no stray drafts/reviews and plausible histories.
  ['hu', 'de', 'at', 'ch', 'nl', 'be', 'se', 'fi'].forEach((id) => {
    const a = fmt.artworks[id];
    a.versions = a.versions.filter((v) => v.status === 'approved' || v.status === 'superseded');
  });

  fmt.archived = [
    {
      file: 'CW_PAP_150_CE_FINAL.pdf', label: 'Legacy Central Europe regional artwork (four-language)', archivedAt: '2024-02-12', covered: ['pl', 'cz', 'sk', 'hu'], sizeMb: 22.7,
      note: 'One regional artwork used for Poland, Czechia, Slovakia and Hungary until February 2024, when it was split into separate market entries. Nutrition values, importer addresses and the dieline revision are out of date. Do not send to print.',
    },
  ];
  return fmt;
}

(function buildBrands() {
  for (const bd of BRAND_DEFS) {
    const brand: Brand = { id: bd.id, name: bd.name, code: bd.code, cat: bd.cat, category: CATEGORIES[bd.cat].label, color: bd.color, ink: bd.ink, skuCount: bd.skus, manager: bd.manager, lines: [] };
    BRANDS.push(brand);
    const used = new Set<string>();
    const cat = CATEGORIES[bd.cat];
    const lineObjs: Line[] = bd.lines.map((name, i) => {
      const cw = bd.id === 'crunchwell' ? CW_LINES[name] : undefined;
      const code = cw ? cw.code : lineCode(name, used);
      if (cw) used.add(code);
      const r = rng(`line-${bd.id}-${name}`);
      return { id: slug(name), name, code, color: cw ? cw.color : LINE_PALETTE[(hashStr(name) + i) % LINE_PALETTE.length], formats: [], brand, launched: addDays('2012-01-01', int(r, 0, 4800)) };
    });
    brand.lines = lineObjs;
    let hand = 0;
    if (bd.id === 'crunchwell') {
      const pap = lineObjs[0];
      const f = cat.formats;
      pap.formats = [
        buildFormat(brand, pap, f[0], ['pl', 'cz', 'sk', 'hu', 'de', 'at', 'nl', 'be', 'gb', 'ie', 'se', 'dk'], 'cw-pap-b040'),
        buildFormat(brand, pap, f[1], ['pl', 'cz', 'sk', 'hu', 'de', 'at', 'ch', 'nl', 'be', 'fr'], 'cw-pap-b090'),
        handPaprika150(brand, pap),
        buildFormat(brand, pap, f[3], ['pl', 'de', 'at', 'nl', 'gb'], 'cw-pap-m625'),
      ];
      hand = 38;
    }
    const gen = lineObjs.filter((l) => l.formats.length === 0);
    const total = bd.skus - hand;
    const base = Math.floor(total / gen.length);
    let extra = total - base * gen.length;
    gen.forEach((line) => {
      const n = base + (extra-- > 0 ? 1 : 0);
      const r = rng(`alloc-${bd.id}-${line.id}`);
      let nf = Math.min(cat.formats.length, int(r, 2, 4), n);
      const defs = cat.formats.map((f) => ({ f, k: r() })).sort((a, b) => a.k - b.k).slice(0, nf).map((x) => x.f);
      defs.sort((a, b) => cat.formats.indexOf(a) - cat.formats.indexOf(b));
      const weights = defs.map(() => 0.6 + r());
      const sum = weights.reduce((a, b) => a + b, 0);
      const parts = weights.map((w) => Math.max(1, Math.floor((w / sum) * n)));
      let diff = n - parts.reduce((a, b) => a + b, 0);
      let k = 0;
      while (diff !== 0) {
        const idx = k++ % parts.length;
        if (diff > 0) { parts[idx]++; diff--; } else if (parts[idx] > 1) { parts[idx]--; diff++; }
      }
      line.formats = defs.map((def, i) => buildFormat(brand, line, def, weightedCountries(rng(`mk-${bd.id}-${line.id}-${def.code}`), Math.min(parts[i], COUNTRIES.length)), `${bd.id}-${line.id}-${def.code}`));
    });
  }
})();

// ───────────────────────────── Indexes & lookups ─────────────────────────────

export const ALL_ENTRIES: MarketEntry[] = [];
BRANDS.forEach((b) => b.lines.forEach((l) => l.formats.forEach((f) => f.markets.forEach((m) => ALL_ENTRIES.push(m)))));
export const TOTALS = {
  brands: BRANDS.length,
  lines: BRANDS.reduce((a, b) => a + b.lines.length, 0),
  skus: ALL_ENTRIES.length,
  dielines: Object.keys(DIELINES).length,
};
export const DIELINE_USAGE: Record<string, MarketEntry[]> = {};
ALL_ENTRIES.forEach((m) => (DIELINE_USAGE[m.dielineId] ||= []).push(m));

export const findBrand = (b?: string) => BRANDS.find((x) => x.id === b);
export const findLine = (b?: string, l?: string) => findBrand(b)?.lines.find((x) => x.id === l);
export const findFormat = (b?: string, l?: string, f?: string) => findLine(b, l)?.formats.find((x) => x.id === f);
export const findEntry = (b?: string, l?: string, f?: string, m?: string) => findFormat(b, l, f)?.markets.find((x) => x.id === m);
export const artworkOf = (m: MarketEntry) => m.format.artworks[m.artworkId];
export const approvedOf = (a: Artwork) => a.versions.find((v) => v.status === 'approved');
export const pendingOf = (a: Artwork) => a.versions.filter((v) => v.status === 'in_review' || v.status === 'draft');

export const pathOf = {
  brand: (b: Brand) => `/b/${b.id}`,
  line: (l: Line) => `/b/${l.brand.id}/${l.id}`,
  format: (f: Format) => `/b/${f.brand.id}/${f.line.id}/${f.id}`,
  entry: (m: MarketEntry) => `/b/${m.brand.id}/${m.line.id}/${m.format.id}/${m.id}`,
  version: (m: MarketEntry, n: number) => `/b/${m.brand.id}/${m.line.id}/${m.format.id}/${m.id}/v${n}`,
};

// ───────────────────────────── Regulatory text library ─────────────────────────────

export interface RegBlock {
  id: string; country: Country; lang: string; brand: Brand; line: Line; rev: number; approvedAt: string; reviewer: Person;
  status: 'approved' | 'in_review'; text?: RegText; master: { denomination: string; ingredients: string; allergen: string }; entries: MarketEntry[];
}
export const REG_BLOCKS: Record<string, RegBlock> = {};
export const REG_BY_COUNTRY: Record<string, RegBlock[]> = {};
ALL_ENTRIES.forEach((m) => {
  m.country.langs.forEach((lang) => {
    const multi = m.country.langs.length > 1;
    const id = `RT-${m.country.code}-${m.brand.code}-${m.line.code}${multi ? '-' + lang.toUpperCase() : ''}`;
    let b = REG_BLOCKS[id];
    if (!b) {
      const r = rng(id);
      const isPap = m.brand.id === 'crunchwell' && m.line.id === 'paprika';
      b = {
        id, country: m.country, lang, brand: m.brand, line: m.line,
        rev: isPap ? 3 : int(r, 1, 5),
        approvedAt: isPap ? (m.country.id === 'pl' ? '2026-08-28' : addDays('2026-06-15', int(r, 0, 40))) : addDays('2024-06-01', int(r, 0, 880)),
        reviewer: reviewerFor(m.country.id), status: !isPap && r() < 0.05 ? 'in_review' : 'approved',
        text: isPap ? PAPRIKA_TEXT[lang] : undefined,
        master: CATEGORY_MASTER[m.brand.cat](m.line.name), entries: [],
      };
      REG_BLOCKS[id] = b;
      (REG_BY_COUNTRY[m.country.id] ||= []).push(b);
    }
    b.entries.push(m);
  });
});
Object.values(REG_BY_COUNTRY).forEach((arr) => arr.sort((a, b) => a.brand.name.localeCompare(b.brand.name) || a.line.name.localeCompare(b.line.name) || a.lang.localeCompare(b.lang)));

/** Regulatory blocks printed on a market entry's artwork (one per language; shared packs pull from each sharing country). */
export function regBlocksFor(m: MarketEntry): RegBlock[] {
  const art = artworkOf(m);
  const out: RegBlock[] = [];
  art.marketIds.forEach((cid) => {
    const c = COUNTRY[cid];
    c.langs.forEach((lang) => {
      const id = `RT-${c.code}-${m.brand.code}-${m.line.code}${c.langs.length > 1 ? '-' + lang.toUpperCase() : ''}`;
      if (REG_BLOCKS[id] && !out.includes(REG_BLOCKS[id])) out.push(REG_BLOCKS[id]);
    });
  });
  // keep own country first
  return out.sort((a, b) => (a.country.id === m.country.id ? -1 : 0) - (b.country.id === m.country.id ? -1 : 0));
}

// ───────────────────────────── Shared assets ─────────────────────────────

export type AssetKind = 'logos' | 'legal' | 'recycling';
export interface Asset { id: string; kind: AssetKind; name: string; variant: string; formats: string[]; updated: string; usage: string; brandId?: string; icon: string; status: 'current' | 'withdrawn' | 'new' }
export const ASSETS: Asset[] = [];
BRANDS.forEach((b, i) => {
  [['primary', 'Primary wordmark (full colour)'], ['mono', 'Mono wordmark (black / white)'], ['reversed', 'Reversed wordmark (on brand colour)']].forEach(([v, label], k) => {
    ASSETS.push({ id: `logo-${b.id}-${v}`, kind: 'logos', name: `${b.name} ${label.split(' (')[0].toLowerCase()}`, variant: label, formats: ['AI', 'PDF', 'SVG', 'PNG'], updated: addDays('2025-02-03', (i * 23 + k * 7) % 300), usage: k === 0 ? 'Front panel. Minimum width 22 mm on packs under 50 g, 30 mm otherwise. Clear space = height of the “C” counter.' : k === 1 ? 'Single-colour print, outer cases, technical drawings.' : 'Use on the brand colour field only; never on photography.', brandId: b.id, icon: `logo:${v}`, status: 'current' });
  });
});
const A = (id: string, kind: AssetKind, name: string, variant: string, updated: string, usage: string, icon: string, status: Asset['status'] = 'current'): Asset => ({ id, kind, name, variant, formats: ['AI', 'PDF', 'SVG'], updated, usage, icon, status });
ASSETS.push(
  A('legal-e-mark', 'legal', 'Estimated sign ℮', 'Metrology mark', '2023-04-11', 'Place directly after the net quantity, same line, minimum 3 mm high. Required on all EU packs sold by weight.', 'emark'),
  A('legal-registered', 'legal', 'Registered trademark ®', 'Superscript', '2022-09-30', 'After the brand wordmark on the front panel only. Not used in Switzerland on the Halvi wordmark (pending registration).', 'reg'),
  A('legal-green-dot', 'legal', 'Der Grüne Punkt', 'Two-colour', '2023-11-02', 'Licence-based. Only on packs for markets listed in the licence register (DE, AT, CZ, SK, HU, PL legacy). Being phased out from 2026 artworks — check market guidance.', 'greendot'),
  A('legal-age', 'legal', 'Choking hazard warning (under 3)', 'Pictogram + text', '2024-03-18', 'Required for hard-boiled sweets and gum sold loose; Pebbleton and Zesta only.', 'age'),
  A('legal-fsc', 'legal', 'FSC® Mix label', 'Licence FSC-C104512', '2025-07-01', 'Board cartons only (GC2). Licence code must match the board supplier.', 'fsc'),
  A('legal-vegan', 'legal', 'Vegan Society trademark', 'Approved products only', '2025-01-20', 'Brindle & Oak Oat Milk Vegan and Lumo Vegan Fruit Mix only.', 'vegan'),
  A('legal-nutri', 'legal', 'Nutri-Score A–E', 'Five variants', '2026-01-12', 'Voluntary; used in FR, BE, DE, NL, CH, AT. Must be recalculated with the 2024 algorithm.', 'nutri'),
  A('rec-eu-plastic', 'recycling', 'EU harmonised sorting label — plastic', '2026 graphic, 18 × 18 mm', '2026-09-15', 'New harmonised label for flexible plastic packs. Being introduced market-by-market from Q4 2026; first in PL and CZ/SK (150 g pouch v5/v7, in review). Place on back panel, not on seals.', 'eu', 'new'),
  A('rec-eu-paper', 'recycling', 'EU harmonised sorting label — paper & board', '2026 graphic', '2026-09-15', 'Cartons and paper sleeves. Same rollout as the plastic label.', 'eupaper', 'new'),
  A('rec-mobius', 'recycling', 'Mobius loop with material code', 'PP 5 / OTHER 7', '2022-05-04', 'Current mark on most flexible packs. Being replaced by the EU harmonised label as markets switch over.', 'mobius'),
  A('rec-triman', 'recycling', 'Triman + Info-tri', 'France only', '2025-04-28', 'Mandatory for France. Use the Citeo generator for the Info-tri panel.', 'triman'),
  A('rec-tidyman', 'recycling', 'Tidyman', 'Generic litter mark', '2021-10-13', 'Optional on small packs. Do not combine with the EU harmonised label on packs under 50 cm².', 'tidyman'),
  A('rec-oprl', 'recycling', 'OPRL “Recycle with bags at large supermarkets”', 'UK only', '2024-11-05', 'UK flexible plastic packs. Not used for Ireland-only artworks.', 'oprl'),
  A('rec-segreguj', 'recycling', 'Polish sorting pictogram (yellow bin)', 'Withdrawn', '2023-06-20', 'Withdrawn Feb 2024 — replaced by the Mobius loop, which is now being replaced by the EU harmonised label.', 'bin', 'withdrawn'),
);

// ───────────────────────────── Team guidelines ─────────────────────────────

export interface Guide { id: string; title: string; summary: string; updated: string; owner: string }
export const GUIDES: Guide[] = [
  { id: 'structure', title: 'How Packroom is organised', summary: 'Brand › Product line › Pack format › Market › Artwork version. Regions are groupings, not folders.', updated: '2026-06-02', owner: 'E. Zielińska' },
  { id: 'naming', title: 'File naming', summary: 'BRAND_LINE_FORMAT_MARKET_vN.pdf — how to read and write file names, and the legacy names you will still see.', updated: '2026-03-17', owner: 'R. Mazur' },
  { id: 'versions', title: 'Versions and approval statuses', summary: 'Draft → In review → Approved → Superseded. Only one approved version per market entry at a time.', updated: '2026-04-09', owner: 'K. Nowak' },
  { id: 'shared', title: 'Shared and multilingual artworks', summary: 'Czechia/Slovakia, UK/Ireland and the Baltics sell one physical pack. What that means for edits and approvals.', updated: '2025-11-20', owner: 'H. Dvořáková' },
  { id: 'printers', title: 'Sending files to printers', summary: 'Always send the approved version with its dieline. Use a printer pack link, never email attachments.', updated: '2026-10-01', owner: 'R. Mazur' },
  { id: 'reviewers', title: 'Regional regulatory reviewers', summary: 'Who approves what, by market.', updated: '2026-07-22', owner: 'K. Nowak' },
];

// ───────────────────────────── Name decoding ─────────────────────────────

const BRAND_BY_CODE: Record<string, Brand> = Object.fromEntries(BRANDS.map((b) => [b.code, b]));
export interface NamePart { text: string; label: string; meaning: string }
export function decodeFileName(file: string): NamePart[] {
  const base = file.replace(/\.pdf$/i, '');
  const parts = base.split('_');
  const brand = BRAND_BY_CODE[parts[0]];
  const out: NamePart[] = [];
  parts.forEach((p, i) => {
    if (i === 0) out.push({ text: p, label: 'Brand', meaning: brand ? brand.name : 'Unknown brand code' });
    else if (i === 1) {
      const line = brand?.lines.find((l) => l.code === p);
      out.push({ text: p, label: 'Product line', meaning: line ? line.name : 'Unknown line code' });
    } else if (i === 2) {
      const all = Object.values(CATEGORIES).flatMap((c) => c.formats);
      const f = all.find((x) => x.code === p);
      out.push({ text: p, label: 'Pack format', meaning: f ? f.name : /^\d+$/.test(p) ? `${p} g (legacy name, no format type)` : 'Unknown format' });
    } else if (/^v\d+$/.test(p)) out.push({ text: p, label: 'Version', meaning: `Version ${p.slice(1)}` });
    else if (p === 'draft') out.push({ text: p, label: 'Status suffix', meaning: 'Draft — not submitted for review' });
    else if (p === 'FINAL') out.push({ text: p, label: 'Legacy suffix', meaning: '“FINAL” was used before 2024 instead of version numbers. Not a status.' });
    else if (p === 'CE') out.push({ text: p, label: 'Region (legacy)', meaning: 'Central Europe regional artwork — pre-2024 only. Regions are no longer used in file names.' });
    else {
      const g = SHARED_GROUPS.find((x) => x.code === p);
      const c = COUNTRY[p.toLowerCase()];
      out.push({ text: p, label: 'Market', meaning: g ? `${g.label} (${g.ids.map((x) => COUNTRY[x].name).join(', ')})` : c ? c.name : p.length > 2 ? 'Combined markets' : 'Unknown market' });
    }
  });
  return out;
}
