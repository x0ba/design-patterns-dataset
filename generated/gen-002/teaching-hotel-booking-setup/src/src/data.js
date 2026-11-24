// Seed data for Tamarack House, as the system stands before Gwen starts configuring Spring 2027.

export const TERM = {
  name: 'Spring 2027',
  lastName: 'Fall 2026',
  lastSaved: 'Aug 28, 2026',
  weeks: 15,
  startsIn: '6 weeks',
  students: 26,
};

export const FEATURE_LIBRARY = [
  'Roll-in shower',
  'Walk-in shower',
  'Tub/shower',
  'Tub with transfer bench',
  'Grab bars',
  'Visual door alert',
  'Lowered closet rod',
  'Desk',
  'Mini-fridge',
  'Courtyard view',
  'Street view',
  'Treetop view',
  'Vaulted ceiling',
  'Connecting door',
  'Sofa bed',
  'Parlor',
  'Soaking tub',
  'Kitchenette',
];

export const ROOM_TYPES = ['Queen', 'Double-Double', 'King', 'Accessible King', 'Suite'];

export const ACTIONS = [
  { id: 'create', group: 'Reservations', label: 'Create a reservation', hint: 'Book new stays by phone, online or walk-in', short: 'Create reservation' },
  { id: 'checkin', group: 'Reservations', label: 'Check a guest in', hint: 'Assign a room, verify ID, take the card', short: 'Check-in' },
  { id: 'checkout', group: 'Reservations', label: 'Check a guest out', hint: 'Review the folio and settle the balance', short: 'Check-out' },
  { id: 'modify', group: 'Reservations', label: 'Change dates or guest details', hint: 'Edit an existing reservation', short: 'Modify reservation' },
  { id: 'move', group: 'Reservations', label: 'Move a reservation to another room', hint: 'Relocate a guest, including overbooking walks', short: 'Move reservation' },
  { id: 'cancel', group: 'Reservations', label: 'Cancel a reservation', hint: 'Cancel and apply the plan’s cancellation policy', short: 'Cancel reservation' },
  { id: 'override', group: 'Money', label: 'Override a rate', hint: 'Charge something other than the rate plan price', short: 'Override rate' },
  { id: 'waiveLco', group: 'Money', label: 'Waive late checkout fee', hint: 'Remove the fee from the folio', short: 'Waive late checkout fee' },
  { id: 'waiveCancel', group: 'Money', label: 'Waive cancellation fee', hint: 'Cancel without applying the penalty', short: 'Waive cancellation fee' },
  { id: 'refund', group: 'Money', label: 'Issue a refund', hint: 'Return a deposit or payment to the card', short: 'Issue refund' },
  { id: 'noshow', group: 'Money', label: 'Charge a no-show fee', hint: 'Bill the guarantee card after the arrival date passes', short: 'Charge no-show fee' },
];

export const CANCEL_OPTIONS = [
  { id: '24h', label: '24 hours before arrival', short: '24 hours', hours: 24 },
  { id: '48h', label: '48 hours before arrival', short: '48 hours', hours: 48 },
  { id: '72h', label: '72 hours before arrival', short: '72 hours', hours: 72 },
  { id: '7d', label: '7 days before arrival', short: '7 days', hours: 168 },
  { id: '14d', label: '14 days before arrival', short: '14 days', hours: 336 },
  { id: 'nonref', label: 'Non-refundable', short: 'Non-refundable', hours: Infinity },
];

export const PENALTY_OPTIONS = [
  { id: 'first-night', label: 'First night plus tax' },
  { id: 'full-stay', label: 'Entire stay' },
];

export const DEPOSIT_OPTIONS = [
  { id: 'none', label: 'None (card guarantee only)', short: 'None' },
  { id: 'first-night', label: 'First night at booking', short: 'First night' },
  { id: 'half', label: '50% of the stay at booking', short: '50% of stay' },
  { id: 'full', label: 'Full prepayment', short: 'Prepaid in full' },
];

const rooms = [
  { id: 'r101', number: '101', floor: 1, type: 'Accessible King', bed: '1 king bed', maxOcc: 2, accessible: true, rate: 159,
    features: ['Tub with transfer bench', 'Grab bars', 'Visual door alert', 'Courtyard view'] },
  { id: 'r102', number: '102', floor: 1, type: 'Queen', bed: '1 queen bed', maxOcc: 2, accessible: false, rate: 119,
    features: ['Street view', 'Desk', 'Tub/shower'] },
  { id: 'r103', number: '103', floor: 1, type: 'Queen', bed: '1 queen bed', maxOcc: 2, accessible: false, rate: 119,
    features: ['Courtyard view', 'Desk', 'Tub/shower'] },
  { id: 'r104', number: '104', floor: 1, type: 'Double-Double', bed: '2 double beds', maxOcc: 4, accessible: false, rate: 139,
    features: ['Courtyard view', 'Mini-fridge', 'Tub/shower'] },
  { id: 'r201', number: '201', floor: 2, type: 'Queen', bed: '1 queen bed', maxOcc: 2, accessible: false, rate: 129,
    features: ['Street view', 'Desk', 'Tub/shower'] },
  { id: 'r202', number: '202', floor: 2, type: 'Queen', bed: '1 queen bed', maxOcc: 2, accessible: false, rate: 129,
    features: ['Courtyard view', 'Desk', 'Walk-in shower'] },
  { id: 'r203', number: '203', floor: 2, type: 'Double-Double', bed: '2 double beds', maxOcc: 4, accessible: false, rate: 149,
    features: ['Street view', 'Mini-fridge', 'Tub/shower'] },
  { id: 'r204', number: '204', floor: 2, type: 'King', bed: '1 king bed', maxOcc: 2, accessible: false, rate: 179,
    features: ['Courtyard view', 'Desk', 'Connecting door', 'Walk-in shower'] },
  { id: 'r205', number: '205', floor: 2, type: 'King', bed: '1 king bed', maxOcc: 2, accessible: false, rate: 179,
    features: ['Courtyard view', 'Desk', 'Connecting door', 'Tub/shower'] },
  { id: 'r301', number: '301', floor: 3, type: 'Queen', bed: '1 queen bed', maxOcc: 3, accessible: false, rate: 139,
    features: ['Treetop view', 'Vaulted ceiling', 'Desk', 'Walk-in shower'] },
  { id: 'r302', number: '302', floor: 3, type: 'Queen', bed: '1 queen bed', maxOcc: 3, accessible: false, rate: 139,
    features: ['Treetop view', 'Vaulted ceiling', 'Desk', 'Walk-in shower'] },
  { id: 'r303', number: '303', floor: 3, type: 'Double-Double', bed: '2 double beds', maxOcc: 4, accessible: false, rate: 159,
    features: ['Treetop view', 'Vaulted ceiling', 'Mini-fridge', 'Tub/shower'] },
];

const rates = [
  { id: 'standard', name: 'Standard', status: 'active', pricing: { mode: 'percent', value: 0 }, start: null, end: null,
    minStay: 1, cancel: '24h', penalty: 'first-night', deposit: 'none',
    desc: 'Rack rate for phone, walk-in and direct bookings.' },
  { id: 'aaa', name: 'AAA member', status: 'active', pricing: { mode: 'percent', value: -10 }, start: null, end: null,
    minStay: 1, cancel: '24h', penalty: 'first-night', deposit: 'none',
    desc: 'Valid AAA card shown at check-in.' },
  { id: 'faculty', name: 'Faculty & staff', status: 'active', pricing: { mode: 'percent', value: -15 }, start: null, end: null,
    minStay: 1, cancel: '24h', penalty: 'first-night', deposit: 'none',
    desc: 'Campus ID required. Not combinable with other discounts.' },
  { id: 'parents', name: 'Parents’ Weekend package', status: 'active', pricing: { mode: 'percent', value: 15 },
    start: '2026-10-16', end: '2026-10-18', minStay: 2, cancel: '72h', penalty: 'first-night', deposit: 'first-night',
    desc: 'Breakfast for two each morning and 1 p.m. late checkout included.' },
  { id: 'extended', name: 'Extended Stay (5+ nights)', status: 'active', pricing: { mode: 'percent', value: -20 }, start: null, end: null,
    minStay: 5, cancel: 'nonref', penalty: 'full-stay', deposit: 'half',
    desc: 'Discounted rate for stays of five nights or more, billed up front.' },
  { id: 'graduation', name: 'Graduation Weekend', status: 'draft', pricing: { mode: 'percent', value: 25 },
    start: '2027-05-15', end: '2027-05-17', minStay: 2, cancel: '7d', penalty: 'first-night', deposit: 'half',
    desc: 'Commencement weekend rate for families and returning alumni.' },
];

const scenarios = [
  { id: 's01', title: 'Phone reservation for a family of four', topic: 'reservations', difficulty: 'Beginner', week: 1, needs: ['create'], ratePlan: null },
  { id: 's02', title: 'Check in a pre-registered guest', topic: 'checkin', difficulty: 'Beginner', week: 1, needs: ['checkin'], ratePlan: null },
  { id: 's03', title: 'Check out and review the folio', topic: 'checkin', difficulty: 'Beginner', week: 2, needs: ['checkout'], ratePlan: null },
  { id: 's04', title: 'Change dates on an existing reservation', topic: 'reservations', difficulty: 'Beginner', week: 2, needs: ['modify'], ratePlan: null },
  { id: 's05', title: 'Late checkout request from a business traveler', topic: 'checkin', difficulty: 'Intermediate', week: 5, needs: ['waiveLco'], ratePlan: null },
  { id: 's06', title: 'Verify a AAA card and apply the member rate', topic: 'rates', difficulty: 'Intermediate', week: 4, needs: [], ratePlan: 'aaa' },
  { id: 's07', title: 'Parents’ weekend package inquiry', topic: 'rates', difficulty: 'Intermediate', week: 6, needs: [], ratePlan: 'parents' },
  { id: 's08', title: 'Cancel inside the 24-hour window', topic: 'cancellations', difficulty: 'Intermediate', week: 6, needs: ['waiveCancel'], ratePlan: 'standard' },
  { id: 's09', title: 'Walk-in guest, one room left', topic: 'walkins', difficulty: 'Intermediate', week: 4, needs: ['create', 'checkin'], ratePlan: 'standard' },
  { id: 's10', title: 'Overbooked arrival: relocate a guest', topic: 'walkins', difficulty: 'Advanced', week: 5, needs: ['move'], ratePlan: null },
  { id: 's11', title: 'Group block: six rooms for a wedding party', topic: 'groups', difficulty: 'Advanced', week: 8, needs: ['create'], ratePlan: null },
  { id: 's12', title: 'Rooming list and cutoff date for a group', topic: 'groups', difficulty: 'Advanced', week: 8, needs: ['modify'], ratePlan: null },
  { id: 's13', title: 'Guest disputes the nightly rate at checkout', topic: 'disputes', difficulty: 'Advanced', week: 9, needs: ['override'], ratePlan: 'standard' },
  { id: 's14', title: 'No-show: charge the first night', topic: 'noshow', difficulty: 'Advanced', week: 11, needs: ['noshow'], ratePlan: null },
];

export const TOPICS = [
  { id: 'reservations', label: 'Reservations' },
  { id: 'checkin', label: 'Check-in & check-out' },
  { id: 'rates', label: 'Rates & packages' },
  { id: 'cancellations', label: 'Cancellations' },
  { id: 'walkins', label: 'Walk-ins & overbookings' },
  { id: 'groups', label: 'Group blocks' },
  { id: 'disputes', label: 'Rate disputes' },
  { id: 'noshow', label: 'No-show charging' },
];

const allow = (...ids) => Object.fromEntries(ACTIONS.map((a) => [a.id, ids.includes(a.id) ? 'yes' : 'no']));

const roles = [
  { id: 'agent', name: 'First-term Desk Agent', short: 'Desk Agent', term: 'First term', students: 19,
    perms: allow('create', 'checkin', 'checkout', 'modify', 'move', 'cancel', 'override', 'waiveLco', 'waiveCancel', 'noshow') },
  { id: 'lead', name: 'Second-term Shift Lead', short: 'Shift Lead', term: 'Second term', students: 7,
    perms: allow('create', 'checkin', 'checkout', 'modify', 'move', 'cancel', 'override', 'waiveLco', 'waiveCancel', 'refund', 'noshow') },
];

export const INITIAL = {
  rooms,
  rates,
  scenarios,
  roles,
  tax: { lodgingPct: 11, feePerNight: 2 },
  flags: { taxConfirmed: false },
  published: null,
};

// Last term's saved settings: the same inn, a little cheaper and with last term's tax rate.
export function buildLastTerm() {
  const c = JSON.parse(JSON.stringify(INITIAL));
  const rateBack = { r301: 129, r302: 129, r303: 149 };
  c.rooms.forEach((r) => { if (rateBack[r.id]) r.rate = rateBack[r.id]; });
  c.rates = c.rates.filter((r) => r.id !== 'graduation');
  c.tax = { lodgingPct: 10.5, feePerNight: 2 };
  return { rooms: c.rooms, rates: c.rates, scenarios: c.scenarios, roles: c.roles, tax: c.tax };
}
export const LAST_TERM = buildLastTerm();
