// Geography and transit network for the mock city.
//
// Coordinates are kilometres east (x) and north (y) of the university's
// Main Quad, which sits at (0, 0). The map is schematic: it keeps relative
// positions and line order, not true street geometry.

export const CAMPUS = { name: 'University Main Quad', x: 0, y: 0 };

export const SLOTS = {
  'WD-AM': 'Weekday mornings',
  'WD-PM': 'Weekday afternoons',
  'WD-EVE': 'Weekday evenings',
  SAT: 'Saturdays',
};

export const SLOT_ORDER = ['WD-AM', 'WD-PM', 'WD-EVE', 'SAT'];

export const ORG_TYPES = {
  'Food pantry': { short: 'Pantry', color: '#b45309' },
  Tutoring: { short: 'Tutoring', color: '#1d4ed8' },
  'Refugee resettlement': { short: 'Refugee', color: '#7e22ce' },
  'Legal clinic': { short: 'Legal', color: '#0f766e' },
  'Senior center': { short: 'Senior', color: '#be185d' },
  'Community garden': { short: 'Garden', color: '#15803d' },
};

// Mock syllabus map: which partner types each course's placement guide lists.
// Used only for the "fits course" hint; it never blocks an assignment.
export const COURSES = {
  'SOC 140': { title: 'Immigration and Society', fit: ['Refugee resettlement', 'Legal clinic'] },
  'PUBH 101': { title: 'Introduction to Public Health', fit: ['Food pantry', 'Senior center', 'Community garden'] },
  'EDUC 215': { title: 'Literacy in Practice', fit: ['Tutoring'] },
  'GERO 205': { title: 'Aging and Community', fit: ['Senior center'] },
  'URBS 180': { title: 'Urban Food Systems', fit: ['Food pantry', 'Community garden'] },
  'SW 220': { title: 'Community Organizing and Advocacy', fit: ['Legal clinic', 'Refugee resettlement'] },
};

export const NEIGHBORHOODS = [
  { id: 'Midtown', x: 1.2, y: 0.8, lines: ['Route 31', 'Route 9', 'Blue Line'] },
  { id: 'Eastside', x: 4.6, y: 0.6, lines: ['Route 7', 'Blue Line'] },
  { id: 'Cedar Hill', x: 2.8, y: 3.0, lines: ['Route 9', 'Blue Line'] },
  { id: 'Riverbend', x: 5.6, y: 3.6, lines: ['Route 44', 'Blue Line'] },
  { id: 'Parkview', x: 3.0, y: 6.0, lines: ['Route 31', 'Route 44'] },
  { id: 'Northgate', x: 1.9, y: 8.0, lines: ['Route 31'] },
  { id: 'Harbor', x: -3.8, y: -4.4, lines: ['Route 12', 'Blue Line'] },
  { id: 'Southport', x: -2.4, y: -2.8, lines: ['Route 12', 'Blue Line'] },
  { id: 'Westfield', x: -5.6, y: 1.8, lines: ['Route 22'] },
  { id: 'Oak Flats', x: -4.4, y: 5.6, lines: ['Route 22'] },
];

export const STATIONS = [
  { name: 'Harbor Terminal Station', x: -3.6, y: -4.4 },
  { name: 'Southport Ave Station', x: -2.2, y: -2.6 },
  { name: 'Campus Central Station', x: 0.6, y: -0.4 },
  { name: 'Midtown Plaza Station', x: 1.6, y: 0.9 },
  { name: 'Cedar Street Station', x: 2.6, y: 2.4, extension: true },
  { name: 'Eastgate Station', x: 3.7, y: 2.0, extension: true },
  { name: 'Fairgrounds Station', x: 4.6, y: 3.4, extension: true },
  { name: 'Riverbend Crossing Station', x: 5.6, y: 3.6, extension: true },
];

// Polylines drawn on the map. Blue Line is light rail; the rest are bus routes.
export const LINES = [
  {
    id: 'Blue Line',
    kind: 'rail',
    points: [[-3.6, -4.4], [-2.2, -2.6], [0.6, -0.4], [1.6, 0.9], [2.6, 2.4], [3.7, 2.0], [4.6, 3.4], [5.6, 3.6]],
  },
  { id: 'Route 7', kind: 'bus', points: [[0.2, 0.2], [2.2, 0.3], [4.6, 0.4], [5.6, -0.6]] },
  { id: 'Route 9', kind: 'bus', points: [[1.2, 0.8], [2.5, 1.6], [3.0, 3.0], [2.0, 4.2]] },
  { id: 'Route 12', kind: 'bus', points: [[0.2, -0.2], [-1.0, -1.6], [-2.4, -2.8], [-3.8, -4.6]] },
  { id: 'Route 22', kind: 'bus', points: [[0.0, 0.2], [-2.6, 0.9], [-5.8, 1.9], [-4.4, 5.6]] },
  { id: 'Route 31', kind: 'bus', points: [[1.2, 0.8], [1.1, 3.6], [2.8, 5.8], [1.9, 8.0]] },
  { id: 'Route 44', kind: 'bus', points: [[4.6, 0.4], [5.6, 2.4], [5.4, 3.8], [3.1, 5.6]] },
];
