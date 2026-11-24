// Word pools and sentence templates used by the archive generator to fill
// the back issues that are not hand-written. Templates use {slot} markers.

export const NEIGHBORHOODS = [
  ['Lower Millrace', 'Riverside blocks below the mill, home to Millrace Green and the Mill Road footbridge.'],
  ['Tannery Flats', 'Low streets along the millrace where the tanneries once stood. Now mostly family homes.'],
  ['Mill Hill', 'The town center: council chambers, the library branch and the middle school.'],
  ['Cedar Hollow', 'Wooded lots, the Cedar Hollow Pavilion and the community garden on Cedar Lane.'],
  ['Kettle Hill', 'Steep streets above the river with the best views and the most holiday lights.'],
  ['Canal Park', 'Shops and parish life along the old canal towpath, with the St. Brendan’s hall.'],
  ['Foundry Row', 'Brick rowhouses built for foundry workers, with the fire house on the corner.'],
  ['Hickory Ridge', 'Hillside subdivision with the recreation center and the elementary school.'],
  ['Bellwood', 'Quiet residential streets around the chapel and the old streetcar right-of-way.'],
  ['Stonebridge', 'Park land along the feeder creek, with the stone culvert and the sled hill.'],
  ['Eastgate', 'The Eastgate Avenue corridor, the community hall and the volunteer fire company.'],
  ['Foxglove Heights', 'Newer houses, a block-party tradition and the Foxglove fire station.'],
  ['Marsh Landing', 'The low wetland edge with the pond, the nature trail and winter skating.'],
  ['Upper Commons', 'Open fields and the old commons, now shared between the county and neighbors.'],
];

// Featured streets are always included; the rest are generated from stems.
export const FEATURED_STREETS = {
  'Tannery Street': 'Tannery Flats',
  'Mill Road': 'Lower Millrace',
  'Orchard Lane': 'Kettle Hill',
  'Kettle Hill Road': 'Kettle Hill',
  'Canal Street': 'Canal Park',
  'Foxglove Court': 'Foxglove Heights',
  'Foundry Street': 'Foundry Row',
  'Chapel Lane': 'Bellwood',
  'Hickory Ridge Road': 'Hickory Ridge',
  'Eastgate Avenue': 'Eastgate',
};

export const STREET_STEMS = [
  'Adams', 'Birch', 'Briar', 'Calder', 'Carver', 'Cherry', 'Clover', 'Coal', 'Cooper', 'Crane',
  'Dover', 'Elm', 'Fairview', 'Ferry', 'Fox', 'Garden', 'Glen', 'Harbor', 'Heron', 'Hollis',
  'Ivy', 'Juniper', 'Kiln', 'Laurel', 'Lilac', 'Locust', 'Maple', 'Meadow', 'Mercer', 'Mulberry',
  'Oak', 'Pearl', 'Pine', 'Quarry', 'Rail', 'Reed', 'Rowan', 'Sawmill', 'Spring', 'Sycamore',
  'Thistle', 'Union', 'Vine', 'Walnut', 'Willow', 'Wren', 'Beacon', 'Copper', 'Dayton', 'Eaton',
  'Franklin', 'Grove', 'Hazel', 'Ingram', 'Jasper', 'Keystone', 'Linden', 'Nash', 'Orion', 'Prospect',
  'Quincy', 'Ridge', 'Salem', 'Tillman', 'Vernon', 'Warren', 'Whitney', 'Yardley', 'Bramble', 'Canton',
];
export const STREET_SUFFIXES = ['Street', 'Avenue', 'Road', 'Lane', 'Court', 'Place', 'Terrace', 'Drive'];

export const FIRST_NAMES = [
  'Agnes', 'Albert', 'Alma', 'Andre', 'Angela', 'Arthur', 'Beatrice', 'Bernadette', 'Carl', 'Celia',
  'Cyrus', 'Dana', 'Dolores', 'Dominic', 'Edna', 'Eleanor', 'Elias', 'Esther', 'Felix', 'Gloria',
  'Gordon', 'Hannah', 'Harold', 'Helena', 'Ida', 'Irene', 'Isaac', 'Jolene', 'Joseph', 'Julia',
  'Karl', 'Kiera', 'Lamar', 'Leona', 'Lorraine', 'Marcus', 'Margaret', 'Mariana', 'Mateo', 'Mildred',
  'Nadia', 'Nelson', 'Nora', 'Owen', 'Patrice', 'Quentin', 'Renee', 'Roman', 'Rosalind', 'Sadie',
  'Sergio', 'Simone', 'Stella', 'Talia', 'Theodore', 'Vera', 'Vincent', 'Wanda', 'Xavier', 'Yolanda',
  'Zelda', 'Brian', 'Carol', 'Denise', 'Ellis', 'Gwen', 'Hal', 'Janet', 'Keith', 'Lydia',
];
export const LAST_NAMES = [
  'Abernathy', 'Alvarez', 'Bachman', 'Baptiste', 'Beaudry', 'Brennan', 'Caruso', 'Chandler', 'Cifuentes', 'Dalrymple',
  'Demetriou', 'Donnelly', 'Eckhart', 'Emerson', 'Fairbanks', 'Feeney', 'Fontaine', 'Galloway', 'Garrity', 'Gruber',
  'Haddad', 'Hallinan', 'Hartigan', 'Iwasaki', 'Jablonski', 'Kaczmarek', 'Kellerman', 'Kim', 'Kozak', 'Lindqvist',
  'Lombardi', 'Mahoney', 'Marchetti', 'McIver', 'Moffat', 'Nakamura', 'Nowicki', 'Oduya', 'Pelletier', 'Quinlan',
  'Radke', 'Rasmussen', 'Renner', 'Rooney', 'Salazar', 'Schaefer', 'Sokolov', 'Stroud', 'Szabo', 'Tanaka',
  'Thibodeaux', 'Underhill', 'Vance', 'Vasquez', 'Wallace', 'Weatherby', 'Wojcik', 'Yates', 'Zielinski', 'Ashby',
  'Bruckner', 'Corrigan', 'Dunmore', 'Esposito', 'Farrow', 'Gilroy', 'Hobart', 'Ingersoll', 'Jurgens', 'Kessler',
  'Lacey', 'Murphy', 'Novak', 'Orchard', 'Prentice', 'Reyes', 'Sandoval', 'Tiernan', 'Varga', 'Whitcomb',
];

export const ORGS = [
  'St. Brendan’s Parish', 'the Millrace Library branch', 'the Eastgate Volunteer Fire Co.', 'the Cedar Hollow Garden Club',
  'the Kettle Hill Block Association', 'the Foundry Row Mutual Aid Group', 'Scout Troop 14', 'the Bellwood Chapel',
  'the Canal Park Food Pantry', 'the Marsh Landing Pond Committee', 'the Hickory Ridge Recreation Center',
  'the Stonebridge Trail Crew', 'the Upper Commons Historical Society', 'the Mill Hill Lions Club', 'the Foxglove Heights Neighbors',
  'the Lower Millrace Improvement Group', 'the Millrace Youth Center', 'the Eastgate Senior Lunch Program',
];
export const THINGS = [
  'crosswalk', 'community garden', 'second recycling drop-off', 'after-school reading program', 'seasonal farmers market',
  'bike repair clinic', 'street tree planting', 'bus shelter', 'playground upgrade', 'park bench program', 'sidewalk ramp',
  'pocket park', 'Saturday cleanup day', 'neighborhood watch sign program', 'stormwater drain repair', 'summer concert series',
  'book exchange box', 'tool library', 'free tax clinic', 'senior exercise class', 'winter coat drive', 'pet adoption fair',
  'footpath repair', 'streetlight upgrade', 'accessible ramp', 'basketball court', 'community oven',
];
export const SCHOOLS = [
  'Millrace Middle School', 'Eastgate Elementary', 'Canal Park Elementary', 'Hickory Ridge Elementary', 'Foxglove Heights Elementary',
  'Millrace High School', 'Cedar Hollow Primary',
];
export const PLACES = [
  'St. Brendan’s hall', 'the Millrace library', 'the Cedar Hollow Pavilion', 'the Eastgate community hall', 'the Bellwood Chapel',
  'the Foundry Row fire house', 'the Kettle Hill Park gate', 'the Mill Hill town hall', 'the Hickory Ridge rec center', 'Millrace Green',
];
export const ROLE_WORDS = [
  'Longtime Crossing Guard', 'Church Organist', 'Machinist', 'Mail Carrier', 'School Cook', 'Volunteer Firefighter', 'Neighborhood Baker',
  'Bus Driver', 'Hardware Store Owner', 'Parish Bookkeeper', 'Playground Monitor', 'Piano Teacher', 'Tailor', 'Carpenter',
];
export const HOBBIES = [
  'Restores vintage clocks in a shop on the back porch.',
  'Coaches youth soccer every fall and spring.',
  'Volunteers at the food pantry on Tuesdays.',
  'Keeps bees on the side lot and sells honey at the market.',
  'Runs a Sunday walking group for seniors.',
  'Plays bass in a jazz trio that performs at the library.',
  'Has photographed the neighborhood since the 1980s.',
  'Sings in the parish choir and teaches a Saturday music class.',
];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SEASONS = ['spring', 'summer', 'fall', 'winter'];
export const MONEY = ['$850', '$1,200', '$3,400', '$7,500', '$12,000', '$18,500', '$25,000', '$48,000'];

// Section templates. "headlines" and "decks" pick one at random. "body" is a
// pool of sentences; each paragraph is built from 2–3 of them.
export const TEMPLATES = {
  'Front Page': {
    headlines: [
      '{hood} Gets {money} for {thing}',
      'Council Votes on {thing} After Long Debate',
      'Volunteers Turn Out for the {season} Cleanup Across {hood}',
      '{org} Announces New Hours for {season}',
      'Parish and Park Groups Team Up on {thing}',
    ],
    decks: [
      'The money will be spent over the next year, with the first work starting in {month}.',
      'Residents of {hood} filled the hall on {day} to ask questions about the plan.',
    ],
    body: [
      'The plan calls for {thing} along {street}, with work expected to start in {month}.',
      '{person}, who has lived in {hood} for {num} years, said the response has been better than anyone expected.',
      'Organizers say the project is on schedule and that volunteers are still needed on {day} mornings.',
      'The group has raised {money} so far and is asking for help with supplies and food.',
      'Public works estimates the work will take about {num} weeks once it begins.',
      'The {hood} Improvement Group will post updates on its bulletin board outside the library.',
    ],
  },
  'Neighborhood News': {
    headlines: [
      '{org} Plans {thing} for {season}',
      '{hood} Residents Push for {thing}',
      '{street} Repaving Set to Begin in {month}',
      '{org} Opens {thing} on {street}',
      'Block Party Returns to {hood}',
      '{person} Retires After {num} Years at {org}',
      '{hood} Garden Club Adds {thing}',
      'Neighbors Clean Up {street} Ahead of the {season} Fair',
      '{hood} Volunteers Host {season} Drive',
      '{person} Named Coordinator of {org}',
    ],
    decks: [
      'Organizers expect about {num} people and say {thing} is the main draw.',
      'The work is expected to take {num} weeks and will be paid for with {money} raised locally.',
      'Residents of {hood} met on {day} to talk over the plan.',
    ],
    body: [
      'The effort began in {month} when a handful of neighbors met at {place} to talk about {thing}.',
      '{person}, who has lived on {street} for {num} years, said the response has been better than anyone expected.',
      'Organizers say the work is on schedule and that volunteers are still needed on {day} mornings.',
      'The group has raised {money} so far and is asking for help with supplies and food.',
      'Anyone interested can attend the next planning meeting at {place} on {day} at 7 p.m.',
      'The {hood} Improvement Group will post updates on its bulletin board outside the library.',
      'Several residents on {street} said they had been waiting since {year} for something like this.',
    ],
  },
  'Council Watch': {
    headlines: [
      'Council Delays Vote on {street} {thing}',
      'Council Approves {money} for {street} Repairs',
      'Zoning Board Hears Plan for {thing} near {hood}',
      'Budget Hearing Draws {num} Residents',
      'Council Tables {thing} Ordinance',
      '{hood} Asks Council for Speed Limit Change',
      'Council Splits 4–3 on {thing}',
    ],
    decks: [
      'The vote came after {num} residents spoke at {day}’s session.',
      'Supporters and opponents on {street} disagreed about cost and timing.',
    ],
    body: [
      'Councilmember {person} asked for more time to review the proposal, which would cost about {money}.',
      'Public works estimates the work will take about {num} weeks once it starts in {month}.',
      'Residents of {hood} said they had been asking for action for years, and several brought photographs of the street.',
      'The ordinance will return to the agenda at the next regular session, unless the chair calls a special meeting first.',
      'Staff recommended approval with two conditions: a traffic study and a public notice period of 30 days.',
    ],
  },
  Schools: {
    headlines: [
      '{school} Students Earn Regional Honors',
      '{school} Adds {thing} to {season} Schedule',
      '{school} Board Approves {thing}',
      '{school} Parents Organize {thing}',
      '{school} Teams Head to {season} Tournament',
    ],
    decks: [
      'The program begins in {month} and is open to all students in grade {grade} and up.',
      'Principal {person} said the school is grateful to families who volunteered this year.',
    ],
    body: [
      'Principal {person} said the program was built with help from parents and local volunteers.',
      'Students will meet on {day} afternoons in {place}, and transportation will be provided for those who need it.',
      'Sign-up forms went home in backpacks this week, and the first session is set for {month}.',
      'The board will review the results at the end of the {season} term.',
    ],
  },
  Letters: {
    headlines: [
      'Letter: Thanks to {org}',
      'Letter: The {thing} on {street} Needs Attention',
      'Letter: Support the {thing}',
      'Letters: {street} Parking Is Out of Control',
      'Letter: {org} Did a Good Job This {season}',
    ],
    decks: [''],
    body: [
      'To the editor: I have lived on {street} for {num} years, and I want to say what a difference {org} has made.',
      'Please keep the {thing} in the budget. Many of us on {street} use it every week.',
      'I hope the council will listen to the people who turned out at the {month} meeting.',
      'Thank you for printing this letter, and for all the work the paper does to keep us informed.',
    ],
    sig: '{person}, {hood}',
  },
  Obituaries: {
    headlines: [
      '{person}, {num}, {role}',
      '{person}, {num}, Longtime Volunteer',
    ],
    decks: [
      'Friends remember {person} for the many years of service to {hood}.',
    ],
    body: [
      '{person} died in {month} at home on {street}, at the age of {num}.',
      'Born in {hood} in the years after the war, {person} spent most of a working life in the trades and most of a retirement in the neighborhood.',
      'Services will be held at the parish hall, and donations may be made to {org} in his or her name.',
      'Survivors include a daughter, two grandchildren and many friends from {hood}.',
    ],
  },
  Events: {
    headlines: [
      'Plans for {thing} Set for {hood} This {season}',
      '{org} Hosts {thing} on {day}',
      'Library Adds {thing} This {season}',
    ],
    decks: [
      'Doors open at 6 p.m. and the event is free to the public.',
    ],
    body: [
      'Doors open at 6 p.m. and the event is free to the public. Organizers ask guests to bring a dish to share or a little cash for supplies.',
      'The event will be held at {place}, rain or shine, with a backup date set for the following {day}.',
      'Children are welcome, and volunteers will be on hand to help with parking and set-up.',
    ],
  },
  'Then & Now': {
    headlines: [
      'Then & Now: {street} in {year} and Today',
      'Then & Now: {place}, {year} and {year2}',
    ],
    decks: [
      'A photo from the Millrace County Historical Society shows the same corner as it looked decades ago.',
    ],
    body: [
      'A {year} photograph from the Millrace County Historical Society shows {street} from the corner of {street2}.',
      'Most of the houses are still standing, though the porches and the trees have changed a good deal.',
      'Someone took the same picture from the same spot this month, holding the camera at about the same height.',
    ],
  },
};
