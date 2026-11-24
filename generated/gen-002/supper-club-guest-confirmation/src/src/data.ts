// Mock data for the Nov 29 Polish Harvest dinner. No backend: everything here is
// fixture data loaded into the app on first visit.

export const CAPACITY = 24;
export const SEAT_PRICE = 85;
export const PROCESSING_RATE = 0.034; // 3.4% card processing fee
export const VENUE_DEPOSIT = 600;
export const REVERSAL_WINDOW_MS = 24 * 60 * 60 * 1000;

export const DINNER = {
  title: 'Polish Harvest',
  courses: 7,
  date: new Date(2026, 10, 29), // Sunday, Nov 29 2026
  venue: 'Northside Press (converted print shop)',
  pastDinners: 11,
  avgNoShows: 2,
};

export interface Dietary {
  note: string;
  conflict: boolean;
  detail?: string;
}

export interface Card {
  brand: 'Visa' | 'Mastercard' | 'Amex';
  last4: string;
  expiry: string; // MM/YY
}

export type Kind = 'member' | 'group' | 'guest';

export interface Request {
  id: string;
  kind: Kind;
  name: string;            // leader / requester (guests: the guest's name)
  partyNames: string[];    // everyone in the seat block (group: all names)
  hostName?: string;       // guests only: the member who added them
  founding: boolean;
  joinedOn?: string;       // ISO date, members only
  dinnersAttended?: number;
  dietary?: Dietary | null;
  card: Card;
  partySize: number;
  requestedAt: string;     // ISO timestamp
}

export const REQUESTS: Request[] = [
  // Founding members (9 solo requests)
  { id: 'R-01', kind: 'member', name: 'Halina Brzezinska', partyNames: ['Halina Brzezinska'], founding: true, joinedOn: '2019-03-12', dinnersAttended: 10, dietary: null, card: { brand: 'Visa', last4: '4417', expiry: '08/28' }, partySize: 1, requestedAt: '2026-11-04T19:12:00' },
  { id: 'R-02', kind: 'member', name: 'Marek Dudek', partyNames: ['Marek Dudek'], founding: true, joinedOn: '2019-05-04', dinnersAttended: 9, dietary: null, card: { brand: 'Mastercard', last4: '0932', expiry: '02/28' }, partySize: 1, requestedAt: '2026-11-06T08:40:00' },
  { id: 'R-03', kind: 'member', name: 'Tadeusz Nowicki', partyNames: ['Tadeusz Nowicki'], founding: true, joinedOn: '2019-06-22', dinnersAttended: 11, dietary: null, card: { brand: 'Amex', last4: '1008', expiry: '03/28' }, partySize: 1, requestedAt: '2026-11-03T21:05:00' },
  { id: 'R-04', kind: 'member', name: 'Agnieszka Pawlak', partyNames: ['Agnieszka Pawlak'], founding: true, joinedOn: '2020-01-15', dinnersAttended: 8, dietary: null, card: { brand: 'Visa', last4: '2261', expiry: '05/27' }, partySize: 1, requestedAt: '2026-11-05T12:30:00' },
  { id: 'R-05', kind: 'member', name: 'Janusz Wróbel', partyNames: ['Janusz Wróbel'], founding: true, joinedOn: '2019-09-30', dinnersAttended: 7, dietary: null, card: { brand: 'Visa', last4: '7753', expiry: '12/27' }, partySize: 1, requestedAt: '2026-11-08T07:55:00' },
  { id: 'R-06', kind: 'member', name: 'Beata Lisowska', partyNames: ['Beata Lisowska'], founding: true, joinedOn: '2020-02-08', dinnersAttended: 10, dietary: null, card: { brand: 'Mastercard', last4: '5540', expiry: '09/28' }, partySize: 1, requestedAt: '2026-11-10T16:20:00' },
  { id: 'R-07', kind: 'member', name: 'Stanisław Mazur', partyNames: ['Stanisław Mazur'], founding: true, joinedOn: '2019-04-18', dinnersAttended: 6, dietary: null, card: { brand: 'Visa', last4: '3019', expiry: '01/28' }, partySize: 1, requestedAt: '2026-11-07T09:14:00' },
  { id: 'R-08', kind: 'member', name: 'Zofia Rutkowska', partyNames: ['Zofia Rutkowska'], founding: true, joinedOn: '2020-03-01', dinnersAttended: 9, dietary: null, card: { brand: 'Amex', last4: '1127', expiry: '06/29' }, partySize: 1, requestedAt: '2026-11-11T20:47:00' },
  { id: 'R-09', kind: 'member', name: 'Wojciech Sadowski', partyNames: ['Wojciech Sadowski'], founding: true, joinedOn: '2019-11-02', dinnersAttended: 8, dietary: null, card: { brand: 'Visa', last4: '6684', expiry: '04/27' }, partySize: 1, requestedAt: '2026-11-12T13:03:00' },

  // Other members (15 solo requests)
  { id: 'R-10', kind: 'member', name: 'Hana Ishikawa', partyNames: ['Hana Ishikawa'], founding: false, joinedOn: '2021-06-14', dinnersAttended: 7, dietary: null, card: { brand: 'Visa', last4: '9102', expiry: '10/27' }, partySize: 1, requestedAt: '2026-11-07T18:22:00' },
  { id: 'R-11', kind: 'member', name: 'Declan Murphy', partyNames: ['Declan Murphy'], founding: false, joinedOn: '2021-08-02', dinnersAttended: 5, dietary: null, card: { brand: 'Mastercard', last4: '4481', expiry: '11/26' }, partySize: 1, requestedAt: '2026-11-09T11:45:00' },
  { id: 'R-12', kind: 'member', name: 'Lena Hoffmann', partyNames: ['Lena Hoffmann'], founding: false, joinedOn: '2022-01-20', dinnersAttended: 6, dietary: { note: 'Coeliac (celiac)', conflict: true, detail: 'The pierogi course contains wheat.' }, card: { brand: 'Visa', last4: '1190', expiry: '07/28' }, partySize: 1, requestedAt: '2026-11-13T07:10:00' },
  { id: 'R-13', kind: 'member', name: 'Priya Raman', partyNames: ['Priya Raman'], founding: false, joinedOn: '2021-10-05', dinnersAttended: 4, dietary: { note: 'Vegan', conflict: true, detail: 'The fixed menu includes meat, fish and dairy in most courses.' }, card: { brand: 'Visa', last4: '8815', expiry: '03/28' }, partySize: 1, requestedAt: '2026-11-14T22:01:00' },
  { id: 'R-14', kind: 'member', name: 'Owen Blackwood', partyNames: ['Owen Blackwood'], founding: false, joinedOn: '2022-03-11', dinnersAttended: 4, dietary: null, card: { brand: 'Amex', last4: '3341', expiry: '02/27' }, partySize: 1, requestedAt: '2026-11-02T10:30:00' },
  { id: 'R-15', kind: 'member', name: 'Simone Laurent', partyNames: ['Simone Laurent'], founding: false, joinedOn: '2022-05-29', dinnersAttended: 3, dietary: null, card: { brand: 'Mastercard', last4: '7712', expiry: '12/28' }, partySize: 1, requestedAt: '2026-11-12T15:38:00' },
  { id: 'R-16', kind: 'member', name: 'Kofi Mensah', partyNames: ['Kofi Mensah'], founding: false, joinedOn: '2020-11-18', dinnersAttended: 8, dietary: null, card: { brand: 'Visa', last4: '0278', expiry: '06/28' }, partySize: 1, requestedAt: '2026-11-01T08:02:00' },
  { id: 'R-17', kind: 'member', name: 'Maren Lindqvist', partyNames: ['Maren Lindqvist'], founding: false, joinedOn: '2023-02-14', dinnersAttended: 2, dietary: null, card: { brand: 'Visa', last4: '5067', expiry: '09/27' }, partySize: 1, requestedAt: '2026-11-15T10:04:00' },
  { id: 'R-18', kind: 'member', name: 'Theo Vance', partyNames: ['Theo Vance'], founding: false, joinedOn: '2023-04-03', dinnersAttended: 2, dietary: null, card: { brand: 'Mastercard', last4: '2236', expiry: '12/28' }, partySize: 1, requestedAt: '2026-11-15T18:30:00' },
  { id: 'R-19', kind: 'member', name: 'Ilse Brandt', partyNames: ['Ilse Brandt'], founding: false, joinedOn: '2021-03-27', dinnersAttended: 5, dietary: null, card: { brand: 'Visa', last4: '6109', expiry: '04/28' }, partySize: 1, requestedAt: '2026-11-10T09:50:00' },
  { id: 'R-20', kind: 'member', name: 'Samir Haddad', partyNames: ['Samir Haddad'], founding: false, joinedOn: '2022-09-08', dinnersAttended: 3, dietary: null, card: { brand: 'Visa', last4: '4902', expiry: '08/27' }, partySize: 1, requestedAt: '2026-11-11T12:12:00' },
  { id: 'R-21', kind: 'member', name: 'Gwen Osei', partyNames: ['Gwen Osei'], founding: false, joinedOn: '2023-01-09', dinnersAttended: 1, dietary: null, card: { brand: 'Amex', last4: '7720', expiry: '05/28' }, partySize: 1, requestedAt: '2026-11-13T19:40:00' },
  { id: 'R-22', kind: 'member', name: 'Pavel Novak', partyNames: ['Pavel Novak'], founding: false, joinedOn: '2020-07-22', dinnersAttended: 6, dietary: null, card: { brand: 'Mastercard', last4: '3650', expiry: '10/28' }, partySize: 1, requestedAt: '2026-11-06T17:25:00' },
  { id: 'R-23', kind: 'member', name: 'Noor Abbasi', partyNames: ['Noor Abbasi'], founding: false, joinedOn: '2023-06-30', dinnersAttended: 1, dietary: { note: 'Shellfish allergy', conflict: false, detail: 'No shellfish on the menu.' }, card: { brand: 'Visa', last4: '8854', expiry: '01/29' }, partySize: 1, requestedAt: '2026-11-14T08:45:00' },
  { id: 'R-24', kind: 'member', name: 'Matteo Ferraro', partyNames: ['Matteo Ferraro'], founding: false, joinedOn: '2022-12-02', dinnersAttended: 3, dietary: null, card: { brand: 'Visa', last4: '1523', expiry: '07/27' }, partySize: 1, requestedAt: '2026-11-08T13:58:00' },

  // Group requests (3 member accounts, party sizes 4, 2, 2)
  { id: 'R-25', kind: 'group', name: 'Cassidy Reyes', partyNames: ['Cassidy Reyes', 'Jun Park', 'Esme Kowal', 'Rafael Ortiz'], founding: false, joinedOn: '2021-09-19', dinnersAttended: 6, dietary: null, card: { brand: 'Visa', last4: '2794', expiry: '02/28' }, partySize: 4, requestedAt: '2026-11-05T14:06:00' },
  { id: 'R-26', kind: 'group', name: 'Dina Okafor', partyNames: ['Dina Okafor', 'Sam Whitcombe'], founding: false, joinedOn: '2020-08-14', dinnersAttended: 4, dietary: null, card: { brand: 'Visa', last4: '6601', expiry: '09/28' }, partySize: 2, requestedAt: '2026-11-09T20:15:00' },
  { id: 'R-27', kind: 'group', name: 'Ruth Adeyemi', partyNames: ['Ruth Adeyemi', 'Ben Hollis'], founding: false, joinedOn: '2021-02-01', dinnersAttended: 5, dietary: null, card: { brand: 'Mastercard', last4: '9936', expiry: '12/27' }, partySize: 2, requestedAt: '2026-11-02T09:21:00' },

  // Guests added by members (4 requests, each a single seat)
  { id: 'R-28', kind: 'guest', name: 'Anika Solberg', partyNames: ['Anika Solberg'], hostName: 'Hana Ishikawa', founding: false, dietary: null, card: { brand: 'Visa', last4: '3388', expiry: '10/28' }, partySize: 1, requestedAt: '2026-11-12T11:17:00' },
  { id: 'R-29', kind: 'guest', name: 'Felix Greer', partyNames: ['Felix Greer'], hostName: 'Declan Murphy', founding: false, dietary: null, card: { brand: 'Visa', last4: '4026', expiry: '04/27' }, partySize: 1, requestedAt: '2026-11-13T16:55:00' },
  { id: 'R-30', kind: 'guest', name: 'Irina Petrov', partyNames: ['Irina Petrov'], hostName: 'Kofi Mensah', founding: false, dietary: null, card: { brand: 'Mastercard', last4: '1709', expiry: '03/28' }, partySize: 1, requestedAt: '2026-11-15T09:31:00' },
  { id: 'R-31', kind: 'guest', name: 'Tomasz Kaczor', partyNames: ['Tomasz Kaczor'], hostName: 'Pavel Novak', founding: false, dietary: null, card: { brand: 'Visa', last4: '7430', expiry: '11/26' }, partySize: 1, requestedAt: '2026-11-16T08:55:00' },
];

// Fixed mock "now": Monday Nov 16 2026, 9:40 PM local. Requests close tonight at 11:59 PM.
export const MOCK_NOW = new Date(2026, 10, 16, 21, 40, 0).getTime();
export const REQUESTS_CLOSE = new Date(2026, 10, 16, 23, 59, 0).getTime();

// Full refund through Nov 22 (7 days before dinner); 50% from Nov 23.
export const FULL_REFUND_THROUGH = new Date(2026, 10, 22, 23, 59, 59).getTime();
export const PARTIAL_REFUND_RATE = 0.5;
