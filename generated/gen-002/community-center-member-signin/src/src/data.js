// Mock data for the Hawthorne Commons front desk, Tuesday 17 November 2026.

export const CENTER = {
  name: 'Hawthorne Commons Community Center',
  short: 'Hawthorne Commons',
  activeMembers: 1240,
  lapsedRecords: 3100,
};

export const VOLUNTEER = {
  name: 'Raj Patel',
  initials: 'RP',
  role: 'Volunteer',
  shiftEnds: '1:00 PM',
  canMerge: true,
};

// Kiosk clock starts here and then runs in real time.
export const START_TIME = new Date(2026, 10, 17, 9, 51, 20);

export const PROGRAMS = [
  {
    id: 'knit',
    name: 'Knitting Circle',
    start: [10, 0],
    end: [12, 0],
    room: 'Craft Room',
    directions: 'down the hall, second door on the left',
    capacity: 20,
    signedIn: 14,
  },
  {
    id: 'yoga',
    name: "Seniors' Chair Yoga",
    start: [11, 0],
    end: [11, 45],
    room: 'Main Hall',
    directions: 'straight ahead past the notice board',
    capacity: 15,
    signedIn: 9,
  },
  {
    id: 'lunch',
    name: 'Community Lunch',
    start: [12, 30],
    end: [13, 30],
    room: 'Dining Room',
    directions: 'through the double doors by the kitchen',
    capacity: 60,
    signedIn: 38,
    mealCutoff: [11, 30],
    isMeal: true,
  },
  {
    id: 'teen',
    name: 'Teen Homework Club',
    start: [15, 30],
    end: [17, 30],
    room: 'Library Nook',
    directions: 'upstairs, first room on the right',
    capacity: 12,
    signedIn: 0,
    minAge: 11,
    maxAge: 17,
    guardianUnder: 16,
  },
];

// The possible match the system flagged from Doreen's name + address.
export const MATCH = {
  id: '04417',
  firstName: 'Doreen',
  lastName: 'Kowalski',
  street: '2418 SE Alder Street',
  city: 'Portland',
  state: 'OR',
  zip: '97214',
  phoneLast4: '3391',
  lastVisit: 'April 2019',
  history: 'Pottery: Wheel Throwing',
  status: 'Lapsed',
  joined: 'February 2019',
};

export const NEXT_NEW_MEMBER_ID = '05863';

// What Doreen has already typed when we open on her screen.
export const DOREEN_START = {
  firstName: 'Doreen',
  lastName: 'Mitchell',
  preferredName: '',
  previousNames: [],
  street: '2418 SE Alder Street',
  unit: '',
  city: 'Portland',
  state: 'OR',
  zip: '97214',
  phone: '503 503 238 3391',
  email: '',
  dobMonth: '',
  dobDay: '',
  dobYear: '',
  ecName: '',
  ecRelationship: '',
  ecRelationshipOther: '',
  ecPhone: '',
  access: [],
  accessNote: '',
  photo: null,
  heard: '',
  heardOther: '',
};

export const QUEUE_START = [
  { id: 'q1', name: 'Harold Benn', memberId: '01128', programs: ['knit'], note: 'Regular · Tuesdays' },
  { id: 'q2', name: 'Marisol Ortega', memberId: '02790', programs: ['knit', 'lunch'], note: 'Regular · brings her own needles' },
  { id: 'q3', name: 'Wendell Okafor', memberId: '00862', programs: ['yoga', 'lunch'], note: 'Uses the hearing loop' },
];

export const ACTIVITY_START = [
  { time: '9:47 AM', text: 'Agnes Pruitt signed in · Knitting Circle' },
  { time: '9:45 AM', text: 'Bev Lindqvist signed in · Knitting Circle, Lunch' },
  { time: '9:41 AM', text: 'Tomás Reyes signed in · Chair Yoga' },
];

// Members who can sign in from the home screen search.
export const DIRECTORY = [
  { name: 'Harold Benn', memberId: '01128', phoneLast4: '7710' },
  { name: 'Marisol Ortega', memberId: '02790', phoneLast4: '4462' },
  { name: 'Wendell Okafor', memberId: '00862', phoneLast4: '0195' },
  { name: 'Agnes Pruitt', memberId: '00311', phoneLast4: '8823' },
  { name: 'Bev Lindqvist', memberId: '01954', phoneLast4: '2207' },
  { name: 'Tomás Reyes', memberId: '03302', phoneLast4: '5568' },
  { name: 'Lorraine Haddad', memberId: '02215', phoneLast4: '9031' },
  { name: 'Gus Abernathy', memberId: '00477', phoneLast4: '1146' },
  { name: 'Nkechi Bamidele', memberId: '04081', phoneLast4: '3720' },
  { name: 'Peggy Sorensen', memberId: '01690', phoneLast4: '6604' },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const RELATIONSHIPS = ['Daughter', 'Son', 'Sister', 'Brother', 'Friend', 'Neighbor', 'Other'];

export const ACCESS_OPTIONS = [
  'Step-free entry',
  'Chair with arms or back support',
  'Large-print handouts',
  'Hearing loop',
  'Seat near the door',
];

export const HEARD_OPTIONS = [
  'A friend or neighbor',
  'Library flyer',
  'The center newsletter',
  'Church or faith group',
  'Walked or drove past',
  'Website or social media',
  'Other',
  'Prefer not to say',
];

export const MERGE_REASONS = [
  { id: 'name-change', label: 'Name change, confirmed in person', note: 'Previous surname Kowalski (maiden name). Same person and same address, confirmed with member at the desk.' },
  { id: 'same-person', label: 'Same person, new details', note: 'Confirmed in person that she is the member on record #04417. Updating contact details.' },
  { id: 'other', label: 'Other reason', note: '' },
];
