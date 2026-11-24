/*
 * Givehours mock data: Theo Lindqvist's December 2026 plan.
 *
 * Snapshot taken Tuesday, November 17, 2026, just after 12:00 pm, when
 * December sign-ups opened at Cascade Harvest Food Bank and Whisker Haven.
 *
 * Row formats (kept compact on purpose):
 *   food / shelter : [date, start, end, place, role, capacity, spotsOpen]
 *       spotsOpen is what is still open to sign up, not counting Theo.
 *   tutoring       : [date, start, end]
 */
const GH_DATA = {
  today: '2026-11-17',
  todayLabel: 'Tue, Nov 17 · 12:06 pm',
  monthLabel: 'December 2026',
  holidayFrom: '2026-12-21', // holiday-week warehouse slots run Dec 21–31

  defaultCap: 20, // hours per month Theo set as his ceiling
  bufferMinutes: 30, // travel buffer between commitments at different places

  person: { name: 'Theo Lindqvist', initials: 'TL' },

  orgs: {
    food: { name: 'Cascade Harvest Food Bank', short: 'Cascade Harvest' },
    shelter: { name: 'Whisker Haven Cat Shelter', short: 'Whisker Haven' },
    tutoring: { name: 'ReadUp Adult Learning', short: 'ReadUp tutoring' }
  },

  // Fixed, all-day commitments that block sign-ups.
  blocks: [
    { id: 'trip', from: '2026-12-02', to: '2026-12-04', label: 'Spokane work trip' },
    { id: 'family-1', from: '2026-12-12', to: '2026-12-13', label: 'Family weekend' },
    { id: 'family-2', from: '2026-12-25', to: '2026-12-27', label: 'Family weekend' }
  ],

  // Standing Wednesday climbing night. Start time is not in Theo's notes,
  // so 5–10 pm is an assumption the UI states openly.
  climbing: { weekday: 3, start: '17:00', end: '22:00' },

  // Grace Okonjo's availability for the learner side of the tutoring plan.
  tutoringWindow: { weekdays: [2, 4], earliest: '19:00', satStart: '08:00', satEnd: '12:00' },

  // Shifts Theo already holds when the app opens.
  initialHolds: ['sh-04', 'sh-20'],

  history: { novTotal: 22.5, novFood: 9, novShelter: 6, novTutoring: 7.5, ytd: 214 },

  food: [
    ['2026-12-01', '13:00', '16:00', 'Eastside Pantry', 'Packing', 10, 7],
    ['2026-12-02', '09:00', '12:00', 'Main Warehouse', 'Sorting', 20, 12],
    ['2026-12-02', '13:00', '16:00', 'Main Warehouse', 'Packing', 12, 5],
    ['2026-12-03', '13:00', '16:00', 'Eastside Pantry', 'Packing', 10, 8],
    ['2026-12-04', '09:00', '13:00', 'Main Warehouse', 'Sorting', 20, 15],
    ['2026-12-04', '13:00', '16:00', 'Eastside Pantry', 'Packing', 10, 6],
    ['2026-12-05', '09:00', '12:00', 'Main Warehouse', 'Sorting', 20, 14],
    ['2026-12-05', '13:00', '17:00', 'Eastside Pantry', "Driver's assistant", 4, 2],
    ['2026-12-07', '09:00', '12:00', 'Main Warehouse', 'Packing', 16, 9],
    ['2026-12-07', '13:00', '16:00', 'Eastside Pantry', "Driver's assistant", 4, 2],
    ['2026-12-08', '13:00', '16:00', 'Eastside Pantry', 'Packing', 10, 6],
    ['2026-12-09', '09:00', '13:00', 'Main Warehouse', 'Sorting', 20, 11],
    ['2026-12-09', '13:00', '17:00', 'Main Warehouse', "Driver's assistant", 4, 1],
    ['2026-12-10', '09:00', '12:00', 'Eastside Pantry', 'Packing', 10, 4],
    ['2026-12-10', '13:00', '16:00', 'Main Warehouse', 'Sorting', 20, 8],
    ['2026-12-11', '09:00', '12:00', 'Main Warehouse', 'Sorting', 20, 7],
    ['2026-12-11', '13:00', '16:00', 'Main Warehouse', 'Packing', 16, 10],
    ['2026-12-12', '09:00', '13:00', 'Main Warehouse', 'Sorting', 20, 13],
    ['2026-12-12', '13:00', '16:00', 'Eastside Pantry', 'Packing', 10, 8],
    ['2026-12-14', '09:00', '12:00', 'Main Warehouse', 'Packing', 16, 12],
    ['2026-12-14', '13:00', '17:00', 'Main Warehouse', "Driver's assistant", 4, 4],
    ['2026-12-15', '09:00', '12:00', 'Main Warehouse', 'Sorting', 20, 10],
    ['2026-12-15', '13:00', '16:00', 'Eastside Pantry', "Driver's assistant", 4, 2],
    ['2026-12-16', '09:00', '12:00', 'Main Warehouse', 'Sorting', 20, 9],
    ['2026-12-16', '13:00', '17:00', 'Main Warehouse', "Driver's assistant", 4, 3],
    ['2026-12-17', '09:00', '12:00', 'Eastside Pantry', 'Packing', 10, 5],
    ['2026-12-18', '09:00', '12:00', 'Main Warehouse', 'Sorting', 20, 6],
    ['2026-12-18', '13:00', '16:00', 'Main Warehouse', 'Packing', 16, 10],
    ['2026-12-19', '09:00', '12:00', 'Main Warehouse', 'Sorting', 20, 4],
    ['2026-12-19', '13:00', '17:00', 'Eastside Pantry', "Driver's assistant", 4, 2],
    ['2026-12-21', '09:00', '13:00', 'Main Warehouse', 'Sorting', 20, 0],
    ['2026-12-21', '13:00', '17:00', 'Main Warehouse', 'Packing', 16, 1],
    ['2026-12-22', '09:00', '12:00', 'Eastside Pantry', 'Packing', 12, 3],
    ['2026-12-22', '13:00', '17:00', 'Eastside Pantry', "Driver's assistant", 4, 1],
    ['2026-12-23', '09:00', '13:00', 'Main Warehouse', 'Sorting', 20, 2],
    ['2026-12-23', '13:00', '16:00', 'Main Warehouse', 'Packing', 16, 6],
    ['2026-12-24', '09:00', '12:00', 'Eastside Pantry', 'Packing', 12, 5],
    ['2026-12-26', '09:00', '12:00', 'Main Warehouse', 'Sorting', 20, 14],
    ['2026-12-28', '09:00', '13:00', 'Main Warehouse', 'Sorting', 20, 9],
    ['2026-12-28', '13:00', '16:00', 'Main Warehouse', 'Packing', 16, 8],
    ['2026-12-29', '13:00', '16:00', 'Eastside Pantry', 'Packing', 12, 9],
    ['2026-12-29', '13:00', '17:00', 'Eastside Pantry', "Driver's assistant", 4, 3],
    ['2026-12-30', '09:00', '12:00', 'Main Warehouse', 'Sorting', 20, 11],
    ['2026-12-30', '13:00', '17:00', 'Main Warehouse', "Driver's assistant", 4, 2],
    ['2026-12-31', '09:00', '12:00', 'Eastside Pantry', 'Packing', 12, 7],
    ['2026-12-31', '13:00', '16:00', 'Main Warehouse', 'Packing', 16, 10]
  ],

  shelter: [
    ['2026-12-01', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 3],
    ['2026-12-01', '18:00', '20:00', 'Main Cattery', 'Socializing', 8, 5],
    ['2026-12-02', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 4],
    ['2026-12-03', '18:00', '20:00', 'Main Cattery', 'Feeding', 6, 2],
    ['2026-12-05', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 4],
    ['2026-12-05', '13:00', '15:00', 'Main Cattery', 'Socializing', 8, 5],
    ['2026-12-06', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 4],
    ['2026-12-07', '18:00', '20:00', 'Main Cattery', 'Feeding', 6, 2],
    ['2026-12-08', '10:00', '12:00', 'Main Cattery', 'Socializing', 8, 6],
    ['2026-12-09', '18:00', '20:00', 'Main Cattery', 'Feeding', 6, 3],
    ['2026-12-10', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 5],
    ['2026-12-10', '18:00', '20:00', 'Main Cattery', 'Socializing', 8, 6],
    ['2026-12-11', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 1],
    ['2026-12-12', '10:00', '12:00', 'Main Cattery', 'Socializing', 8, 4],
    ['2026-12-12', '13:00', '15:00', 'Adoption Fair (off-site)', 'Adoption-event helper', 10, 6],
    ['2026-12-13', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 2],
    ['2026-12-14', '18:00', '20:00', 'Main Cattery', 'Feeding', 6, 4],
    ['2026-12-15', '10:00', '12:00', 'Main Cattery', 'Socializing', 8, 7],
    ['2026-12-16', '18:00', '20:00', 'Main Cattery', 'Feeding', 6, 3],
    ['2026-12-17', '18:00', '20:00', 'Main Cattery', 'Socializing', 8, 5],
    ['2026-12-18', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 4],
    ['2026-12-19', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 3],
    ['2026-12-19', '13:00', '15:00', 'Adoption Fair (off-site)', 'Adoption-event helper', 10, 6],
    ['2026-12-20', '10:00', '12:00', 'Main Cattery', 'Socializing', 8, 5],
    ['2026-12-21', '18:00', '20:00', 'Main Cattery', 'Feeding', 6, 2],
    ['2026-12-22', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 0],
    ['2026-12-23', '18:00', '20:00', 'Main Cattery', 'Socializing', 8, 3],
    ['2026-12-24', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 2],
    ['2026-12-26', '10:00', '12:00', 'Main Cattery', 'Feeding', 6, 4],
    ['2026-12-28', '10:00', '12:00', 'Main Cattery', 'Socializing', 8, 6],
    ['2026-12-30', '18:00', '20:00', 'Main Cattery', 'Feeding', 6, 4]
  ],

  // Theo's standing tutoring sessions with Grace Okonjo: Tue and Thu, 7–8 pm.
  tutoring: [
    ['2026-12-01', '19:00', '20:00'],
    ['2026-12-03', '19:00', '20:00'],
    ['2026-12-08', '19:00', '20:00'],
    ['2026-12-10', '19:00', '20:00'],
    ['2026-12-15', '19:00', '20:00'],
    ['2026-12-17', '19:00', '20:00'],
    ['2026-12-22', '19:00', '20:00'],
    ['2026-12-24', '19:00', '20:00'],
    ['2026-12-29', '19:00', '20:00'],
    ['2026-12-31', '19:00', '20:00']
  ]
};
