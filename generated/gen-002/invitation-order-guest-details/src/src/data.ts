export type VerifyKey = 'zipcity' | 'apt' | 'typo' | 'zip' | 'state' | 'house';

export type Flag =
  | { type: 'verify'; key: VerifyKey }
  | { type: 'dup'; twin: string }
  | { type: 'swap'; original: string; fixed: string; first: string; last: string }
  | { type: 'intl'; guess: 'Canada' | 'Philippines' };

export type Guest = {
  id: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  country: string; // '' = not set yet
  src: 'import' | 'typed';
  flag?: Flag;
  ack?: boolean;
};

export type EventState = {
  names: string;
  host: string;
  date: string; // YYYY-MM-DD
  ceremonyTime: string; // HH:MM
  ceremonyVenue: string;
  ceremonyAddress: string;
  receptionTime: string;
  receptionVenue: string;
  rsvpBy: string; // free text, as typed
  website: string;
  returnName: string;
  returnLine1: string;
  returnCity: string;
};

export const initialEvent: EventState = {
  names: 'Hannah Mei Liu & Marcus James Reyes',
  host: 'together with their families',
  date: '2027-05-15',
  ceremonyTime: '16:00',
  ceremonyVenue: 'St. Francis of Assisi Church',
  ceremonyAddress: '1066 26th St, Sacramento, CA 95816',
  receptionTime: '18:00',
  receptionVenue: 'The Firehouse Pavilion',
  rsvpBy: 'June 1, 2027',
  website: 'paperlark.wedding/hannah-and-marcus',
  returnName: 'Hannah Liu & Marcus Reyes',
  returnLine1: '2741 T St',
  returnCity: 'Sacramento, CA 95816',
};

export const ORDER = {
  number: 'PL-4471-9083',
  design: 'Garden Arch',
  pricePerSet: 4.85,
  orderBy: '2026-12-04',
  deliverBy: '2027-02-01',
  today: '2026-11-17',
};

// name | line1 | line2 | city | region | postal
type Row = [string, string, string, string, string, string];
const US = 'United States';

const typed: Row[] = [
  ['Mr. and Mrs. David Liu', '6620 Pocket Rd', '', 'Sacramento', 'CA', '95831'],
  ['Mrs. Wen-Hua Liu', '2540 Sutterville Rd', 'Apt 11', 'Sacramento', 'CA', '95822'],
  ['Carol and James Chen', '2118 Fair Oaks Blvd', '', 'Sacramento', 'CA', '95825'],
  ['Jessica Liu', '3401 Telegraph Ave', 'Apt 2', 'Oakland', 'CA', '94609'],
  ['Michael and Sarah Liu', '308 Joaquin Ave', '', 'San Leandro', 'CA', '94577'],
  ['Rebecca Tanaka', '1190 Valencia St', 'Apt 3B', 'San Francisco', 'CA', '94110'],
  ['Mr. and Mrs. Paul Hendricks', '9930 Fair Oaks Blvd', '', 'Fair Oaks', 'CA', '95628'],
  ['Alexis Moreno', '3315 3rd Ave', 'Apt 210', 'Sacramento', 'CA', '95817'],
  ['Brittany Nguyen', '5530 H St', 'Unit 6', 'Sacramento', 'CA', '95819'],
  ['Chloe Abrams', '719 Lincoln Way', '', 'Auburn', 'CA', '95603'],
  ['Tyrone and Alicia Banks', '8180 Calvine Rd', '', 'Sacramento', 'CA', '95828'],
  ['Sarah Kleinman', '3944 Cypress Ave', '', 'Sacramento', 'CA', '95820'],
  ['Dr. Helen Cho', '1255 Sutter St', 'Apt 14', 'San Francisco', 'CA', '94109'],
  ['Monique Laurent', '4308 Elmhurst Dr', '', 'San Jose', 'CA', '95126'],
  ['Mr. and Mrs. Gary Yamamoto', '1623 Arcade Blvd', '', 'Sacramento', 'CA', '95815'],
  ['Erin and Colin Walsh', '412 NW 23rd Ave', 'Apt 5', 'Portland', 'OR', '97210'],
  ['Danielle Foster', '1717 E Pike St', 'Unit 402', 'Seattle', 'WA', '98122'],
  ['Marisa Kapoor', '2205 N Central Ave', 'Apt 8', 'Phoenix', 'AZ', '85004'],
  ['Paul and Hye-jin Seo', '1530 Armacost Ave', '', 'Los Angeles', 'CA', '90025'],
  ['Katherine Ellison', '2931 Adams Ave', '', 'San Diego', 'CA', '92116'],
  ['Omar Haddad', '1104 W 6th St', 'Apt 215', 'Austin', 'TX', '78703'],
  ['Lauren Schiavone', '2750 N Lakewood Ave', '', 'Chicago', 'IL', '60614'],
  ['Amy and Josh Berkowitz', '388 Union St', 'Apt 4R', 'Brooklyn', 'NY', '11231'],
  ['Leilani Kahale', '1452 Makiki St', 'Apt 7', 'Honolulu', 'HI', '96822'],
  ['Mr. and Mrs. Richard Stallworth', '1805 Sherwood Way', '', 'Roseville', 'CA', '95661'],
  ['Nadia Petrova', '2650 Wyda Way', '', 'Sacramento', 'CA', '95825'],
  ['Colleen Murphy', '5071 Carlson Dr', '', 'Sacramento', 'CA', '95819'],
  ['Trevor Nakagawa', '922 3rd St', 'Apt 3', 'Davis', 'CA', '95616'],
  ['Mr. and Mrs. Alvin Teo', '15 Cobble Hill Ct', '', 'Folsom', 'CA', '95630'],
  ['Dr. Rina Shah', '3020 Fulton Ave', 'Unit 9', 'Sacramento', 'CA', '95821'],
  ['Wendy Zhang', '1944 Alhambra Blvd', '', 'Sacramento', 'CA', '95816'],
  ['Harold and Ruth Feldman', '6240 Riverside Blvd', '', 'Sacramento', 'CA', '95831'],
  ['Ms. Gloria Santiago', '4412 Tallyho Dr', '', 'Sacramento', 'CA', '95826'],
];

const imported: Row[] = [
  ['Mr. and Mrs. Ernesto Reyes', '4821 Gloria Dr', '', 'Sacramento', 'CA', '95822'],
  ['Cristina Reyes', '912 Alhambra Blvd', 'Apt 4', 'Sacramento', 'CA', '95816'],
  ['Aunt Rose & Uncle Ben', '5612 Riverside Blvd', '', 'Sacramento', 'CA', '95831'],
  ['Daniel and Emily Reyes', '7733 Tangerine Way', '', 'Citrus Heights', 'CA', '95610'],
  ['Ms. Teresa Alvarado', '3108 Fruitridge Rd', '', 'Sacramento', 'CA', '95820'],
  ['Joaquin Mendoza', '1650 Howe Ave', 'Unit 12', 'Sacramento', 'CA', '95825'],
  ['Brian and Kayla Sutherland', '2411 Garden Hwy', '', 'Sacramento', 'CA', '95833'],
  ['Dr. Priya Ramanathan', '1500 Q St', 'Apt 306', 'Sacramento', 'CA', '95811'],
  ['Tomas & Elena Villareal', '8920 Elk Grove Blvd', '', 'Elk Grove', 'CA', '95624'],
  ['Carlos Dominguez', '6141 Franklin Blvd', '', 'Sacramento', 'CA', '95824'],
  ['Naomi Fischer', '435 Main St', '', 'Woodland', 'CA', '95695'],
  ['Jennifer Park', '2040 F St', 'Apt 2', 'Sacramento', 'CA', '95811'],
  ['The Okafor Family', '3377 Land Park Dr', '', 'Sacramento', 'CA', '95818'],
  ['Ryan Takahashi', '5005 J St', '', 'Sacramento', 'CA', '95819'],
  ['Kevin and Alicia Brandt', '4730 Marysville Blvd', '', 'Sacramento', 'CA', '95815'],
  ['Samuel Adeyemi', '2201 Fulton Ave', 'Apt 118', 'Sacramento', 'CA', '95825'],
  ['Mr. and Mrs. Anthony Villanueva', '9101 Bruceville Rd', '', 'Elk Grove', 'CA', '95758'],
  ['Grace Villanueva', '331 Oak Ave', '', 'West Sacramento', 'CA', '95691'],
  ['Isabella Moretti', '1818 Sutterville Rd', '', 'Sacramento', 'CA', '95822'],
  ['Jamal and Courtney Hughes', '7425 Rush River Dr', '', 'Sacramento', 'CA', '95831'],
  ['Elijah Brennan', '612 Pacific Ave', '', 'Davis', 'CA', '95616'],
  ['Wesley Chu', '2933 Riverside Blvd', 'Apt 7', 'Sacramento', 'CA', '95818'],
  ['Mr. and Mrs. Ramon Delgado', '118 Hazel Ave', '', 'Folsom', 'CA', '95630'],
  ['Olivia and Theo Lindgren', '4455 Sunrise Blvd', '', 'Rancho Cordova', 'CA', '95742'],
  ['Priscilla Okoye', '9006 Power Inn Rd', '', 'Sacramento', 'CA', '95826'],
  ['Mr. Gerald Whitaker', '5890 Auburn Blvd', '', 'Sacramento', 'CA', '95841'],
  ['Hector and Luz Ibarra', '3420 Northgate Blvd', '', 'Sacramento', 'CA', '95834'],
  ['Dominic Ferraro', '1700 Broadway', 'Apt 12', 'Sacramento', 'CA', '95818'],
  ['Sophie Larsen', '1215 21st St', '', 'Sacramento', 'CA', '95811'],
  ['Ethan and Maya Goldberg', '1810 Sierra Gardens Dr', '', 'Roseville', 'CA', '95661'],
  ['Ms. Rosalinda Pascual', '6905 Windbridge Dr', '', 'Sacramento', 'CA', '95831'],
  ['Dr. Nathaniel Osei', '850 Howe Ave', 'Unit 4B', 'Sacramento', 'CA', '95825'],
  ['Camille Dubois', '1630 N St', 'Apt 9', 'Sacramento', 'CA', '95811'],
  ['Andre and Simone Baptiste', '4980 Freeport Blvd', '', 'Sacramento', 'CA', '95822'],
  ['Julian Cortez', '3622 Stockton Blvd', '', 'Sacramento', 'CA', '95820'],
  ['Mr. and Mrs. Walter Hollis', '17 Sandpiper Ct', '', 'Elk Grove', 'CA', '95757'],
  ['Bianca Rossi', '2760 Marconi Ave', '', 'Sacramento', 'CA', '95821'],
  ['Mateo and Sofia Herrera', '5212 Elvas Ave', '', 'Sacramento', 'CA', '95819'],
  ['Dr. Alejandra Villanueva-Santos & Family', '950 La Sierra Dr', '', 'Sacramento', 'CA', '95864'],
  ['Peter Kowalczyk', '4205 Lemon Hill Ave', '', 'Sacramento', 'CA', '95820'],
  ['Rev. and Mrs. Thomas Abernathy', '611 Vernon St', '', 'Roseville', 'CA', '95678'],
  ['Lena Bui', '1920 Del Paso Blvd', '', 'Sacramento', 'CA', '95815'],
  ['Mr. and Mrs. Calvin Reeves', '5127 Kiefer Blvd', '', 'Sacramento', 'CA', '95826'],
];

const mk = (src: 'import' | 'typed', rows: Row[], start: number): Guest[] =>
  rows.map((r, i) => ({
    id: `${src[0]}${String(start + i).padStart(2, '0')}`,
    name: r[0], line1: r[1], line2: r[2], city: r[3], region: r[4], postal: r[5],
    country: US, src,
  }));

const G = (id: string, src: 'import' | 'typed', r: Row, country: string, flag?: Flag): Guest => ({
  id, src, name: r[0], line1: r[1], line2: r[2], city: r[3], region: r[4], postal: r[5], country, flag,
});

const importedBase = mk('import', imported, 1);
const typedBase = mk('typed', typed, 1);
const idOf = (list: Guest[], name: string) => list.find((g) => g.name === name)!.id;

const flaggedTyped: Guest[] = [
  G('t90', 'typed', ['Rose and Benjamin Tan', '5612 Riverside Blvd', '', 'Sacramento', 'CA', '95831'], US,
    { type: 'dup', twin: idOf(importedBase, 'Aunt Rose & Uncle Ben') }),
  G('t91', 'typed', ['Jen Park', '2040 F St #2', '', 'Sacramento', 'CA', '95811'], US,
    { type: 'dup', twin: idOf(importedBase, 'Jennifer Park') }),
  G('t92', 'typed', ['Chidi & Ada Okafor', '3377 Land Park Dr', '', 'Sacramento', 'CA', '95818'], US,
    { type: 'dup', twin: idOf(importedBase, 'The Okafor Family') }),
  G('t93', 'typed', ['Natalie Brooks', '812 Sycamore Ln', '', 'Davis', 'CA', '95818'], US, { type: 'verify', key: 'zipcity' }),
  G('t94', 'typed', ['Kimberly and Aaron Lindqvist', '9482 Laguna Springs Dr', '', 'Elk Grove', 'CA', ''], US, { type: 'verify', key: 'zip' }),
  G('t95', 'typed', ['Ms. Denise Castellanos', '14050 Greenback Ln', '', 'Citrus Heights', 'CA', '95610'], US, { type: 'verify', key: 'house' }),
  G('t96', 'typed', ['Jasmine Wong', '1840 W 4th Ave', '', 'Vancouver', 'BC', 'V6J 1M4'], '', { type: 'intl', guess: 'Canada' }),
  G('t97', 'typed', ['Tasha & Jordan Williams \u{1F48D}', '2306 Broadway', '', 'Sacramento', 'CA', '95818'], US),
];

const swapRow = (first: string, last: string, r: Row, id: string): Guest =>
  G(id, 'import', [`${first} ${last}`, r[1], r[2], r[3], r[4], r[5]], US,
    { type: 'swap', original: `${first} ${last}`, fixed: `${last} ${first}`, first, last });

const flaggedImport: Guest[] = [
  swapRow('Santos', 'Gabriel', ['', '5714 Stockton Blvd', '', 'Sacramento', 'CA', '95824'], 'i90'),
  swapRow('Patel', 'Anjali', ['', '1801 L St', 'Apt 5', 'Sacramento', 'CA', '95811'], 'i91'),
  swapRow('Nakamura', 'Kenji', ['', '880 Cherry Ln', '', 'West Sacramento', 'CA', '95691'], 'i92'),
  swapRow('Whitfield', 'Dana', ['', '2455 Land Park Dr', '', 'Sacramento', 'CA', '95818'], 'i93'),
  G('i94', 'import', ['Lola Remedios Reyes', '1832 Taft Ave', 'Malate', 'Manila', 'NCR', '1004'], '', { type: 'intl', guess: 'Philippines' }),
  G('i95', 'import', ['Marisol Quintero', '2210 Capitol Ave', '', 'Sacramento', 'CA', '95816'], US, { type: 'verify', key: 'apt' }),
  G('i96', 'import', ['Mr. and Mrs. Alan Prescott', '3190 Foslom Blvd', '', 'Sacramento', 'CA', '95816'], US, { type: 'verify', key: 'typo' }),
  G('i97', 'import', ['Tyler and Jessie Hammond', '2338 SE Division St', '', 'Portland', 'CA', '97214'], US, { type: 'verify', key: 'state' }),
];

// Hannah typed hers first; Marcus's spreadsheet was pasted in afterwards.
// Flagged rows are spread through each list rather than bunched at the end.
const place = (base: Guest[], flagged: Guest[]) => {
  const out = [...base];
  const step = Math.floor(out.length / (flagged.length + 1));
  flagged.forEach((f, k) => out.splice(4 + k * (step + 1), 0, f));
  return out;
};

export const initialGuests: Guest[] = [
  ...place(typedBase, flaggedTyped),
  ...place(importedBase, flaggedImport),
];
