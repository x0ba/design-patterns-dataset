// Mock data for Olive & Ember, week of Nov 9–15, 2026.
// Hours are tipped hours from the timeclock; `fri` is Friday dinner hours.

export const RESTAURANT = { name: 'Olive & Ember', city: 'Oakland, CA', state: 'California' };
export const MANAGER = { name: 'Gabriela Moretti', title: 'General manager' };

export const POINTS = { Server: 10, Bartender: 9, Busser: 5, Host: 4, 'Line cook': 3, 'Prep cook': 3, Dishwasher: 3 };

export const PEOPLE = [
  { id: 'lucia', name: 'Lucia Ferraro', role: 'Server', group: 'FOH', hours: 44.0, fri: 8.0 },
  { id: 'ines', name: 'Ines Okafor', role: 'Server', group: 'FOH', hours: 41.0, fri: 7.5 },
  { id: 'mateo', name: 'Mateo Brandt', role: 'Server', group: 'FOH', hours: 43.5, fri: 8.0 },
  { id: 'hannah', name: 'Hannah Cho', role: 'Server', group: 'FOH', hours: 38.5, fri: 0 },
  { id: 'rafael', name: 'Rafael Quintero', role: 'Server', group: 'FOH', hours: 42.0, fri: 7.0 },
  { id: 'sloane', name: 'Sloane Whitaker', role: 'Server', group: 'FOH', hours: 36.0, fri: 0 },
  { id: 'noor', name: 'Noor Haddad', role: 'Server', group: 'FOH', hours: 41.0, fri: 7.5 },
  { id: 'jonah', name: 'Jonah Bell', role: 'Bartender', group: 'FOH', hours: 42.5, fri: 8.5 },
  { id: 'camille', name: 'Camille Dubois', role: 'Bartender', group: 'FOH', hours: 40.0, fri: 7.5 },
  { id: 'andre', name: 'Andre Walker', role: 'Busser', group: 'FOH', hours: 41.0, fri: 7.5 },
  { id: 'meiling', name: 'Mei-Ling Tan', role: 'Busser', group: 'FOH', hours: 38.5, fri: 7.0 },
  { id: 'zoe', name: 'Zoe Kaplan', role: 'Host', group: 'FOH', hours: 36.0, fri: 7.0 },
  { id: 'santiago', name: 'Santiago Reyes', role: 'Line cook', group: 'BOH', hours: 46.0, fri: 8.5 },
  { id: 'fatima', name: 'Fatima Yusuf', role: 'Prep cook', group: 'BOH', hours: 42.5, fri: 8.0 },
  { id: 'tomas', name: 'Tomás Herrera', role: 'Dishwasher', group: 'BOH', hours: 40.0, fri: 9.0 },
].map((p) => ({ ...p, points: POINTS[p.role] }));

export const EXCLUDED = [
  { id: 'gabriela', name: 'Gabriela Moretti', role: 'General manager' },
  { id: 'marco', name: 'Marco Delacroix', role: 'Shift lead' },
];

export const FOH_SHARE = 0.8;

// All amounts in cents.
export const CARD_TOTAL = 1184260; // $11,842.60 from the POS
export const LATE_TOTAL = 21400; // $214.00 on three Friday checks
export const CARD_ASSIGNED = CARD_TOTAL - LATE_TOTAL; // $11,628.60
export const SHIFTS = 41;
export const TIPPED_HOURS = 612.5;

export const LATE_CHECKS = [
  { no: '4417', table: 'Table 12', by: 'Lucia Ferraro', closed: '11:42 PM', tip: 9600 },
  { no: '4421', table: 'Table 4', by: 'Ines Okafor', closed: '11:51 PM', tip: 5800 },
  { no: '4424', table: 'Table 7', by: 'Mateo Brandt', closed: '12:08 AM Sat', tip: 6000 },
];

export const SERVICES = [
  { id: 'tue-d', label: 'Tue Nov 10 · Dinner' },
  { id: 'wed-d', label: 'Wed Nov 11 · Dinner' },
  { id: 'thu-d', label: 'Thu Nov 12 · Dinner' },
  { id: 'fri-d', label: 'Fri Nov 13 · Dinner' },
  { id: 'sat-l', label: 'Sat Nov 14 · Lunch' },
  { id: 'sat-d', label: 'Sat Nov 14 · Dinner' },
  { id: 'sun-l', label: 'Sun Nov 15 · Lunch' },
  { id: 'sun-d', label: 'Sun Nov 15 · Dinner' },
];

const c = (service, personId, dollars) => ({ id: `${service}-${personId}`, service, personId, amount: dollars * 100, dest: 'pool', added: false });

// 22 declarations, $1,306.00 in total, imported from the POS tip-out screen.
export const CASH_SEED = [
  c('tue-d', 'lucia', 42), c('tue-d', 'hannah', 28),
  c('wed-d', 'ines', 55), c('wed-d', 'rafael', 36), c('wed-d', 'jonah', 40),
  c('thu-d', 'mateo', 64), c('thu-d', 'noor', 48), c('thu-d', 'camille', 52),
  c('fri-d', 'lucia', 118), c('fri-d', 'ines', 96), c('fri-d', 'mateo', 104), c('fri-d', 'jonah', 87),
  c('sat-l', 'hannah', 34), c('sat-l', 'rafael', 29),
  c('sat-d', 'lucia', 112), c('sat-d', 'noor', 90), c('sat-d', 'camille', 74), c('sat-d', 'sloane', 61),
  c('sun-l', 'ines', 38), c('sun-l', 'sloane', 27),
  c('sun-d', 'rafael', 41), c('sun-d', 'hannah', 30),
];

export const PROVIDERS = ['Gusto', 'ADP Run', 'Paychex Flex', 'QuickBooks Payroll', 'Square Payroll', 'Other (generic CSV)'];

export const SETUP_STEPS = [
  { id: 'restaurant', title: 'Add your restaurant', detail: 'Olive & Ember · Oakland, CA' },
  { id: 'pos', title: 'Connect your POS', detail: 'Card tips and cash declarations import nightly' },
  { id: 'clock', title: 'Connect your timeclock', detail: 'Tipped hours import with each punch' },
  { id: 'staff', title: 'Import staff and roles', detail: '16 people on staff, plus 1 shift lead' },
  { id: 'points', title: 'Set points by role', detail: 'Server 10 · Bartender 9 · Busser 5 · Host 4 · Kitchen 3' },
  { id: 'split', title: 'Set the front/back-of-house split', detail: '80% front of house · 20% back of house' },
  { id: 'excluded', title: 'Choose who is excluded from the pool', detail: 'Managers excluded' },
  { id: 'state', title: 'Confirm state rules', detail: 'Check the tip rules Kittyline applies for California' },
  { id: 'payroll', title: 'Set up payroll export', detail: 'Choose where Kittyline sends your payout file' },
];
