export type AvailStatus = 'available' | 'partial' | 'not_operating' | 'no_form';

export interface Availability {
  status: AvailStatus;
  /** December days the truck is NOT available (for partial) */
  unavailable: number[];
  summary: string;
  ownerNote?: string;
  received?: string; // human readable
  isNew?: boolean; // received over the weekend, not yet reviewed
}

export interface NoShow {
  date: string;
  zone: string;
  note: string;
}

export interface Truck {
  id: string;
  name: string;
  owner: string;
  phone: string;
  cuisine: string;
  permit: string;
  permitType: 'standard' | 'premium';
  permitExpires: string; // ISO date
  /** December day the permit lapses after (if it expires in December) */
  permitLastDay?: number;
  renewal?: string;
  guarantee: number;
  availability: Availability;
  noShows: NoShow[];
  warning?: string;
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const daysWhere = (pred: (dow: number) => boolean) =>
  range(1, 31).filter((d) => pred(new Date(2026, 11, d).getDay()));

type Seed = [
  id: string,
  name: string,
  owner: string,
  cuisine: string,
  permit: string,
  expires: string,
  premium?: boolean,
];

const SEEDS: Seed[] = [
  ['smoke-sesame', 'Smoke & Sesame', 'Daniel Okafor', 'Korean BBQ', 'MFV-21-0114', '2027-06-30', true],
  ['la-cazuela', 'La Cazuela Roja', 'Graciela Mendoza', 'Oaxacan', 'MFV-22-0231', '2027-03-31'],
  ['bao-down', 'Bao Down', 'Kevin Tran', 'Taiwanese bao', 'MFV-23-0377', '2027-08-31'],
  ['rolling-pierogi', 'The Rolling Pierogi', 'Agnieszka Nowak', 'Polish', 'MFV-22-0208', '2027-02-28'],
  ['masala-wheels', 'Masala Wheels', 'Priya Raman', 'South Indian', 'MFV-20-0062', '2027-05-31', true],
  ['curbside-crepes', 'Curbside Crêpes', 'Élodie Martin', 'French crêpes', 'MFV-24-0512', '2027-09-30'],
  ['big-island', 'Big Island Plate', 'Keoni Kahale', 'Hawaiian plate lunch', 'MFV-21-0149', '2027-04-30', true],
  ['tacos-guero', 'Tacos El Güero', 'Ramón Villalobos', 'Tacos', 'MFV-19-0021', '2027-01-31', true],
  ['nonnas', 'Nonna’s Meatball Co.', 'Gina Russo', 'Italian', 'MFV-23-0390', '2027-07-31'],
  ['fire-fennel', 'Fire & Fennel', 'Thomas Achterberg', 'Wood-fired pizza', 'MFV-22-0266', '2027-10-31'],
  ['seoul-sister', 'Seoul Sister', 'Jiyoon Park', 'Korean street food', 'MFV-23-0412', '2026-12-04'],
  ['brisket-bros', 'Brisket Brothers', 'Marcus Hayes', 'Texas BBQ', 'MFV-20-0077', '2027-06-30', true],
  ['pho-real', 'Pho Real', 'Linh Nguyen', 'Vietnamese', 'MFV-21-0133', '2027-03-31', true],
  ['falafel-frontier', 'Falafel Frontier', 'Samir Haddad', 'Lebanese', 'MFV-20-0088', '2027-02-28', true],
  ['arepa-express', 'Arepa Express', 'Valentina Rojas', 'Venezuelan', 'MFV-24-0541', '2027-11-30'],
  ['grilled-cheese-lab', 'The Grilled Cheese Lab', 'Hannah Feldman', 'Sandwiches', 'MFV-23-0355', '2027-05-31'],
  ['jollof-junction', 'Jollof Junction', 'Adaeze Nwosu', 'West African', 'MFV-24-0498', '2027-08-31'],
  ['green-fork', 'Green Fork', 'Maya Lindqvist', 'Vegan bowls', 'MFV-22-0247', '2027-04-30'],
  ['dumpling-dynasty', 'Dumpling Dynasty', 'Wei Zhang', 'Chinese dumplings', 'MFV-21-0170', '2027-09-30'],
  ['lobster-pot', 'Lobster Pot Rolls', 'Patrick Doyle', 'Seafood', 'MFV-22-0219', '2027-04-30'],
  ['sabor-peruano', 'Sabor Peruano', 'Luis Quispe', 'Peruvian', 'MFV-23-0331', '2027-06-30'],
  ['kebab-korner', 'Kebab Korner', 'Emre Yilmaz', 'Turkish', 'MFV-22-0195', '2026-12-15'],
  ['mac-attack', 'Mac Attack', 'Tyler Brooks', 'Mac & cheese', 'MFV-24-0466', '2027-07-31'],
  ['island-jerk', 'Island Jerk Shack', 'Andre Campbell', 'Jamaican', 'MFV-21-0158', '2027-01-31'],
  ['ramen-roadhouse', 'Ramen Roadhouse', 'Kenji Morita', 'Ramen', 'MFV-23-0402', '2027-10-31'],
  ['philly-phactor', 'Philly Phactor', 'Joe DeMarco', 'Cheesesteaks', 'MFV-22-0274', '2027-03-31'],
  ['empanada-cart', 'Empanada Cart Co.', 'Sofía Herrera', 'Argentine empanadas', 'MFV-24-0520', '2027-11-30'],
  ['gyro-hero', 'Gyro Hero', 'Nikos Papadakis', 'Greek', 'MFV-19-0035', '2027-02-28', true],
  ['waffle-wagon', 'Waffle Wagon', 'Bethany Clarke', 'Waffles & desserts', 'MFV-23-0418', '2026-12-31'],
  ['cajun-crawl', 'Cajun Crawl', 'Remy Thibodeaux', 'Cajun', 'MFV-23-0364', '2027-05-31'],
  ['pupuseria-ceiba', 'Pupusería La Ceiba', 'Ana Martínez', 'Salvadoran', 'MFV-22-0283', '2027-08-31', true],
  ['banh-mi-bros', 'Banh Mi Bros', 'Duc Pham', 'Vietnamese sandwiches', 'MFV-23-0347', '2027-04-30'],
  ['chowder-hound', 'Chowder Hound', 'Colleen Murphy', 'Soups & chowder', 'MFV-21-0181', '2027-12-31'],
  ['burger-barge', 'The Burger Barge', 'Eric Lindgren', 'Burgers', 'MFV-20-0094', '2027-06-30', true],
  ['spice-route', 'Spice Route Express', 'Farhan Qureshi', 'Pakistani', 'MFV-24-0487', '2027-09-30'],
  ['hot-dog-haven', 'Hot Dog Haven', 'Leon Schultz', 'Hot dogs', 'MFV-22-0259', '2027-03-31'],
  ['thai-tuk-tuk', 'Thai Tuk Tuk', 'Siriporn Chaiyasit', 'Thai', 'MFV-21-0126', '2027-07-31', true],
  ['pan-de-oro', 'Pan de Oro', 'Rosa Delgado', 'Mexican bakery & coffee', 'MFV-23-0383', '2027-01-31'],
  ['southern-fried', 'Southern Fried', 'Tasha Coleman', 'Fried chicken', 'MFV-22-0291', '2027-10-31'],
  ['addis-kitchen', 'Addis Kitchen', 'Meseret Alemu', 'Ethiopian', 'MFV-24-0503', '2027-08-31'],
  ['poke-wave', 'Poke Wave', 'Malia Fonoti', 'Poke', 'MFV-23-0426', '2027-05-31'],
  ['bratwurst-brigade', 'Bratwurst Brigade', 'Klaus Becker', 'German', 'MFV-22-0238', '2027-02-28'],
  ['sushi-burrito', 'Sushi Burrito Co.', 'Aiko Tanaka', 'Japanese fusion', 'MFV-24-0475', '2027-06-30'],
  ['coffee-caboose', 'The Coffee Caboose', 'Ruth Abernathy', 'Coffee & pastries', 'MFV-21-0162', '2027-11-30'],
  ['birria-boss', 'Birria Boss', 'Hector Salazar', 'Birria & quesatacos', 'MFV-21-0141', '2027-04-30', true],
  ['momo-mobile', 'Momo Mobile', 'Tenzin Dorje', 'Himalayan dumplings', 'MFV-24-0529', '2027-09-30'],
  ['lumpia-lane', 'Lumpia Lane', 'Joy Dela Cruz', 'Filipino', 'MFV-23-0369', '2027-03-31'],
  ['shawarma-station', 'Shawarma Station', 'Rami Khoury', 'Shawarma', 'MFV-22-0222', '2027-07-31'],
  ['mother-clucker', 'Mother Clucker', 'Brianna Walsh', 'Chicken sandwiches', 'MFV-24-0458', '2027-10-31'],
  ['los-primos', 'Taquería Los Primos', 'Javier Ortiz', 'Tacos & tortas', 'MFV-21-0177', '2027-02-28'],
  ['hearth-rye', 'Hearth & Rye', 'Owen Gallagher', 'Deli sandwiches', 'MFV-23-0395', '2027-08-31'],
  ['curry-hurry', 'Curry in a Hurry', 'Sunita Patel', 'North Indian', 'MFV-22-0250', '2027-01-31'],
  ['gumbo-ya-ya', 'Gumbo Ya Ya', 'Delphine Broussard', 'Creole', 'MFV-24-0534', '2027-12-31'],
  ['kimchi-kart', 'Kimchi Kart', 'Min-ho Lee', 'Korean fusion', 'MFV-23-0341', '2027-06-30'],
  ['churro-champs', 'Churro Champs', 'Isabel Fuentes', 'Churros & desserts', 'MFV-24-0491', '2027-04-30'],
  ['mezze-mobile', 'Mezze Mobile', 'Layla Aziz', 'Mediterranean', 'MFV-22-0263', '2027-09-30'],
  ['wingin-it', 'Wingin’ It', 'Darius Freeman', 'Wings', 'MFV-23-0359', '2027-05-31'],
  ['paella-pan', 'Paella Pan', 'Carmen Ruiz', 'Spanish', 'MFV-24-0516', '2027-07-31'],
  ['soul-bowl', 'Soul Bowl', 'Kendra Jackson', 'Soul food', 'MFV-21-0189', '2027-03-31'],
  ['pasty-wagon', 'The Pasty Wagon', 'Glyn Treharne', 'Cornish pasties', 'MFV-23-0433', '2027-10-31'],
  ['frank-bean', 'Frank & Bean', 'Sam Okonkwo', 'Coffee & breakfast', 'MFV-22-0286', '2027-11-30'],
  ['mar-azul', 'Cevichería Mar Azul', 'Diego Paredes', 'Ceviche', 'MFV-24-0547', '2027-08-31'],
];

const AVAILABLE: Availability = { status: 'available', unavailable: [], summary: 'Available all month' };

const AVAIL_OVERRIDES: Record<string, Availability> = {
  // ---- Six forms received over the weekend (Nov 14–15), not yet reviewed ----
  'bao-down': {
    status: 'not_operating',
    unavailable: range(1, 31),
    summary: 'Not operating in December',
    ownerNote: 'Transmission went out on the truck. Shop says mid-January at the earliest. Sorry for the late notice. — Kevin',
    received: 'Sat, Nov 14 · 9:12 PM',
    isNew: true,
  },
  'arepa-express': {
    status: 'partial',
    unavailable: range(19, 31),
    summary: 'Dec 1–18 only',
    ownerNote: 'Flying to Maracaibo on the 19th for the holidays, back Jan 2.',
    received: 'Sun, Nov 15 · 11:40 AM',
    isNew: true,
  },
  'jollof-junction': {
    status: 'partial',
    unavailable: daysWhere((d) => d === 0 || d === 6),
    summary: 'Weekdays only',
    ownerNote: 'Booked for catering every weekend in December.',
    received: 'Sat, Nov 14 · 2:03 PM',
    isNew: true,
  },
  'momo-mobile': {
    status: 'available',
    unavailable: [],
    summary: 'Available all month',
    received: 'Sat, Nov 14 · 10:26 AM',
    isNew: true,
  },
  'pho-real': {
    status: 'available',
    unavailable: [],
    summary: 'Available all month',
    ownerNote: 'Would love more Riverside if anything opens up.',
    received: 'Sun, Nov 15 · 7:58 PM',
    isNew: true,
  },
  'gumbo-ya-ya': {
    status: 'partial',
    unavailable: daysWhere((d) => d === 1),
    summary: 'Not Mondays',
    ownerNote: 'Mondays are prep days now that we cater for St. Brigid’s.',
    received: 'Sun, Nov 15 · 3:17 PM',
    isNew: true,
  },

  // ---- Forms on file before the weekend ----
  'lobster-pot': {
    status: 'not_operating',
    unavailable: range(1, 31),
    summary: 'Not operating (seasonal)',
    ownerNote: 'Off season until April.',
    received: 'Oct 28',
  },
  'poke-wave': {
    status: 'not_operating',
    unavailable: range(1, 31),
    summary: 'Not operating (seasonal)',
    ownerNote: 'Closed for winter, back in March.',
    received: 'Nov 2',
  },
  'curbside-crepes': {
    status: 'partial',
    unavailable: range(21, 31),
    summary: 'Dec 1–20 only',
    received: 'Nov 5',
  },
  'chowder-hound': {
    status: 'partial',
    unavailable: daysWhere((d) => d === 0 || d === 6),
    summary: 'Weekdays only',
    received: 'Nov 3',
  },
  'coffee-caboose': {
    status: 'partial',
    unavailable: daysWhere((d) => d === 0 || d === 6),
    summary: 'Weekdays only',
    received: 'Oct 30',
  },
  'frank-bean': {
    status: 'partial',
    unavailable: daysWhere((d) => d === 0 || d === 5 || d === 6),
    summary: 'Mon–Thu only',
    received: 'Nov 9',
  },
  'paella-pan': {
    status: 'partial',
    unavailable: daysWhere((d) => d >= 1 && d <= 4),
    summary: 'Fri–Sun only',
    received: 'Nov 6',
  },
  'ramen-roadhouse': {
    status: 'partial',
    unavailable: range(24, 27),
    summary: 'Not Dec 24–27',
    received: 'Nov 4',
  },
  'mezze-mobile': {
    status: 'partial',
    unavailable: [...range(1, 4)],
    summary: 'From Dec 5',
    ownerNote: 'Back from equipment inspection Dec 5.',
    received: 'Nov 10',
  },
  'kimchi-kart': {
    status: 'partial',
    unavailable: range(28, 31),
    summary: 'Not Dec 28–31',
    received: 'Nov 11',
  },
  'southern-fried': {
    status: 'partial',
    unavailable: daysWhere((d) => d === 2),
    summary: 'Not Tuesdays',
    received: 'Nov 7',
  },
};

const NO_FORM = [
  'hot-dog-haven',
  'cajun-crawl',
  'mac-attack',
  'wingin-it',
  'pasty-wagon',
  'bratwurst-brigade',
  'sushi-burrito',
  'churro-champs',
  'philly-phactor',
];

const NO_SHOWS: Record<string, NoShow[]> = {
  'mac-attack': [
    { date: 'Thu, Nov 5', zone: 'University Ave', note: 'No call. Zone monitor confirmed empty at 11:15.' },
    { date: 'Fri, Nov 13', zone: 'Medical District', note: 'Texted at 12:40 — generator failure.' },
  ],
  'philly-phactor': [
    { date: 'Tue, Nov 3', zone: 'Library Commons', note: 'Arrived 13:05, outside window. Logged as no-show.' },
  ],
  'green-fork': [
    { date: 'Sat, Nov 7', zone: 'Harbor Walk', note: 'Flat tire, called in 9:50. Excused-with-notice requested.' },
  ],
};

export const TRUCKS: Truck[] = SEEDS.map(([id, name, owner, cuisine, permit, expires, premium], i) => {
  const t: Truck = {
    id,
    name,
    owner,
    phone: `(503) 555-01${String(10 + ((i * 37) % 89)).padStart(2, '0')}`,
    cuisine,
    permit,
    permitType: premium ? 'premium' : 'standard',
    permitExpires: expires,
    guarantee: premium ? 8 : 4,
    availability: AVAIL_OVERRIDES[id]
      ? AVAIL_OVERRIDES[id]
      : NO_FORM.includes(id)
        ? { status: 'no_form', unavailable: [], summary: 'Form not returned', ownerNote: undefined }
        : { ...AVAILABLE, received: ['Oct 27', 'Oct 31', 'Nov 2', 'Nov 4', 'Nov 6', 'Nov 9', 'Nov 12'][i % 7] },
    noShows: NO_SHOWS[id] ?? [],
  };
  if (expires.startsWith('2026-12')) t.permitLastDay = Number(expires.slice(8, 10));
  return t;
});

const tById = (id: string) => TRUCKS.find((t) => t.id === id)!;
tById('mac-attack').warning = 'Attendance warning issued Nov 13 (2 no-shows in 30 days). A third no-show suspends tier A eligibility for January.';
tById('kebab-korner').renewal = 'Renewal application received Nov 9 — waiting on fire inspection (scheduled Dec 3).';
tById('seoul-sister').renewal = 'No renewal application on file. Reminder letter sent Oct 30.';
tById('waffle-wagon').renewal = 'Renewal approved Nov 12 — new permit effective Jan 1.';

export const TRUCK_BY_ID: Record<string, Truck> = Object.fromEntries(TRUCKS.map((t) => [t.id, t]));
