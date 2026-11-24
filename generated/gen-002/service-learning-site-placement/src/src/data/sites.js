// 34 community partner sites for Spring 2027.
//
// capacity: spring seats offered. filled: students already placed in the
// baseline roster (before any changes made in this app).
// campusMin: transit minutes from the Main Quad (office transit export).
// stop / routes: nearest stop and the lines that serve it.

export const SITES = [
  // ---- Food pantries ----
  {
    id: 'site-01', name: 'Eastside Community Pantry', type: 'Food pantry', neighborhood: 'Eastside',
    address: '2210 Alder St', x: 4.6, y: 0.4, routes: ['Route 7'], stop: 'Alder & 14th (Route 7)',
    campusMin: 22, slots: ['WD-AM', 'WD-PM', 'SAT'], capacity: 8, filled: 5,
  },
  {
    id: 'site-02', name: 'Southport Neighbors Food Shelf', type: 'Food pantry', neighborhood: 'Southport',
    address: '418 Pier Ave', x: -2.6, y: -2.1, routes: ['Route 12', 'Blue Line'], stop: 'Southport Ave Station',
    campusMin: 14, slots: ['WD-AM', 'WD-PM', 'WD-EVE'], capacity: 5, filled: 5,
  },
  {
    id: 'site-03', name: 'Midtown Loaves & Lentils', type: 'Food pantry', neighborhood: 'Midtown',
    address: '905 Chestnut Ave', x: 1.1, y: 1.4, routes: ['Route 31', 'Blue Line'], stop: 'Midtown Plaza Station',
    campusMin: 8, slots: ['WD-AM', 'WD-PM', 'WD-EVE', 'SAT'], capacity: 4, filled: 4,
  },
  {
    id: 'site-04', name: 'Riverbend Harvest Table', type: 'Food pantry', neighborhood: 'Riverbend',
    address: '3300 Olive Rd', x: 5.1, y: 3.1, routes: ['Route 44', 'Blue Line'], stop: 'Riverbend Crossing Station',
    campusMin: 27, slots: ['WD-PM', 'SAT'], capacity: 4, filled: 3,
  },
  {
    id: 'site-05', name: 'Westfield Family Pantry', type: 'Food pantry', neighborhood: 'Westfield',
    address: '77 Mercer Blvd', x: -5.3, y: 1.9, routes: ['Route 22'], stop: 'Westfield & Mercer (Route 22)',
    campusMin: 38, slots: ['WD-AM', 'SAT'], capacity: 4, filled: 4,
  },
  {
    id: 'site-06', name: 'Parkview Mutual Aid Pantry', type: 'Food pantry', neighborhood: 'Parkview',
    address: '1624 Summit Ave', x: 3.1, y: 5.6, routes: ['Route 31', 'Route 44'], stop: 'Parkview Loop',
    campusMin: 34, slots: ['WD-PM', 'WD-EVE'], capacity: 3, filled: 3,
  },
  {
    id: 'site-07', name: 'Oak Flats Food Shelf', type: 'Food pantry', neighborhood: 'Oak Flats',
    address: '640 Juniper Way', x: -4.0, y: 5.1, routes: ['Route 22'], stop: 'Oak Flats Loop (Route 22)',
    campusMin: 48, slots: ['WD-AM', 'WD-PM'], capacity: 2, filled: 2,
  },

  // ---- Tutoring ----
  {
    id: 'site-08', name: 'Harbor Literacy Project', type: 'Tutoring', neighborhood: 'Harbor',
    address: '112 Wharf St', x: -3.4, y: -4.0, routes: ['Route 12', 'Blue Line'], stop: 'Harbor Terminal Station',
    campusMin: 19, slots: ['WD-PM', 'WD-EVE', 'SAT'], capacity: 6, filled: 6,
  },
  {
    id: 'site-09', name: 'Midtown Homework Club', type: 'Tutoring', neighborhood: 'Midtown',
    address: '1150 Cypress St', x: 1.9, y: 1.5, routes: ['Route 31', 'Blue Line'], stop: 'Midtown Plaza Station',
    campusMin: 9, slots: ['WD-PM', 'WD-EVE'], capacity: 8, filled: 6,
  },
  {
    id: 'site-10', name: 'Cedar Hill Reading Room', type: 'Tutoring', neighborhood: 'Cedar Hill',
    address: '2701 Cedar St', x: 2.7, y: 3.0, routes: ['Route 9', 'Blue Line'], stop: 'Cedar Street Station',
    campusMin: 24, slots: ['WD-PM', 'WD-EVE', 'SAT'], capacity: 6, filled: 5,
  },
  {
    id: 'site-11', name: 'Southport After-School Tutors', type: 'Tutoring', neighborhood: 'Southport',
    address: '230 Harbor Blvd', x: -1.9, y: -3.4, routes: ['Route 12', 'Blue Line'], stop: 'Southport Ave Station',
    campusMin: 15, slots: ['WD-PM', 'WD-EVE'], capacity: 8, filled: 7,
  },
  {
    id: 'site-12', name: 'Riverbend Math Lab', type: 'Tutoring', neighborhood: 'Riverbend',
    address: '4450 Olive Rd', x: 6.0, y: 4.4, routes: ['Route 44'], stop: 'Riverbend & Olive (Route 44)',
    campusMin: 31, slots: ['WD-PM', 'WD-EVE'], capacity: 4, filled: 2,
  },
  {
    id: 'site-13', name: 'Parkview Writing Center', type: 'Tutoring', neighborhood: 'Parkview',
    address: '2980 Summit Ave', x: 2.4, y: 5.4, routes: ['Route 31', 'Route 44'], stop: 'Parkview Loop',
    campusMin: 33, slots: ['WD-AM', 'WD-PM'], capacity: 4, filled: 4,
  },
  {
    id: 'site-14', name: 'Eastside Study Hall', type: 'Tutoring', neighborhood: 'Eastside',
    address: '1385 Fifth Ave', x: 3.9, y: 1.1, routes: ['Route 7', 'Blue Line'], stop: 'Eastgate Station',
    campusMin: 16, slots: ['WD-PM', 'WD-EVE', 'SAT'], capacity: 5, filled: 5,
  },
  {
    id: 'site-15', name: 'Westfield Reading Partners', type: 'Tutoring', neighborhood: 'Westfield',
    address: '58 Mercer Blvd', x: -4.8, y: 2.6, routes: ['Route 22'], stop: 'Westfield & Mercer (Route 22)',
    campusMin: 40, slots: ['WD-AM', 'WD-PM', 'SAT'], capacity: 3, filled: 3,
  },

  // ---- Refugee resettlement ----
  {
    id: 'site-16', name: 'Northgate Refugee Welcome Center', type: 'Refugee resettlement', neighborhood: 'Northgate',
    address: '4000 Ferry Rd', x: 1.9, y: 7.8, routes: ['Route 31'], stop: 'Northgate & Ferry (Route 31)',
    campusMin: 51, slots: ['WD-AM', 'WD-PM', 'SAT'], capacity: 10, filled: 3,
  },
  {
    id: 'site-17', name: 'Riverbend Newcomers Circle', type: 'Refugee resettlement', neighborhood: 'Riverbend',
    address: '1200 Fairgrounds Rd', x: 4.8, y: 2.8, routes: ['Route 44', 'Blue Line'], stop: 'Fairgrounds Station',
    campusMin: 26, slots: ['WD-PM', 'WD-EVE', 'SAT'], capacity: 4, filled: 2,
  },
  {
    id: 'site-18', name: 'Eastside Newcomer Family Services', type: 'Refugee resettlement', neighborhood: 'Eastside',
    address: '515 Pine St', x: 5.0, y: -0.9, routes: ['Route 7'], stop: 'Eastgate & Pine (Route 7)',
    campusMin: 24, slots: ['WD-AM', 'WD-PM'], capacity: 4, filled: 3,
  },
  {
    id: 'site-19', name: 'Harbor Arrivals Network', type: 'Refugee resettlement', neighborhood: 'Harbor',
    address: '88 Pier Ave', x: -3.0, y: -3.6, routes: ['Route 12', 'Blue Line'], stop: 'Harbor Terminal Station',
    campusMin: 21, slots: ['WD-AM', 'WD-PM', 'WD-EVE'], capacity: 2, filled: 2,
  },

  // ---- Legal clinics ----
  {
    id: 'site-20', name: "Cedar Hill Tenants' Legal Clinic", type: 'Legal clinic', neighborhood: 'Cedar Hill',
    address: '2440 Cedar Ave', x: 2.2, y: 3.4, routes: ['Route 9', 'Blue Line'], stop: 'Cedar Street Station',
    campusMin: 22, slots: ['WD-PM', 'WD-EVE'], capacity: 3, filled: 2,
  },
  {
    id: 'site-21', name: 'Harbor Immigration Help Desk', type: 'Legal clinic', neighborhood: 'Harbor',
    address: '201 Wharf St', x: -4.4, y: -3.2, routes: ['Route 12', 'Blue Line'], stop: 'Harbor Terminal Station',
    campusMin: 18, slots: ['WD-EVE', 'SAT'], capacity: 3, filled: 3,
  },
  {
    id: 'site-22', name: 'Midtown Eviction Defense Clinic', type: 'Legal clinic', neighborhood: 'Midtown',
    address: '760 Chestnut Ave', x: 0.5, y: 1.9, routes: ['Route 31', 'Blue Line'], stop: 'Midtown Plaza Station',
    campusMin: 10, slots: ['WD-PM', 'WD-EVE'], capacity: 3, filled: 3,
  },
  {
    id: 'site-23', name: 'Westfield Consumer Rights Clinic', type: 'Legal clinic', neighborhood: 'Westfield',
    address: '14 Mercer Blvd', x: -6.0, y: 0.8, routes: ['Route 22'], stop: 'Westfield & Mercer (Route 22)',
    campusMin: 42, slots: ['WD-AM', 'WD-PM'], capacity: 2, filled: 1,
  },

  // ---- Senior centers ----
  {
    id: 'site-24', name: 'Cedar Street Senior Center', type: 'Senior center', neighborhood: 'Cedar Hill',
    address: '2519 Cedar St', x: 3.1, y: 2.7, routes: ['Route 9', 'Blue Line'], stop: 'Cedar Street Station',
    campusMin: 23, slots: ['WD-EVE'], capacity: 4, filled: 1,
  },
  {
    id: 'site-25', name: 'Southport Senior Commons', type: 'Senior center', neighborhood: 'Southport',
    address: '500 Pier Ave', x: -2.8, y: -1.7, routes: ['Route 12', 'Blue Line'], stop: 'Southport Ave Station',
    campusMin: 12, slots: ['WD-AM', 'WD-PM'], capacity: 5, filled: 4,
  },
  {
    id: 'site-26', name: 'Parkview Active Adults', type: 'Senior center', neighborhood: 'Parkview',
    address: '3190 Summit Ave', x: 3.8, y: 5.1, routes: ['Route 31', 'Route 44'], stop: 'Parkview Loop',
    campusMin: 36, slots: ['WD-AM', 'WD-PM'], capacity: 4, filled: 4,
  },
  {
    id: 'site-27', name: 'Oak Flats Senior Center', type: 'Senior center', neighborhood: 'Oak Flats',
    address: '1500 Juniper Way', x: -3.4, y: 4.4, routes: ['Route 22'], stop: 'Oak Flats Loop (Route 22)',
    campusMin: 50, slots: ['WD-AM', 'SAT'], capacity: 3, filled: 2,
  },
  {
    id: 'site-28', name: 'Midtown Senior Hub', type: 'Senior center', neighborhood: 'Midtown',
    address: '615 Elm St', x: 0.9, y: -1.2, routes: ['Route 31', 'Blue Line'], stop: 'Campus Central Station',
    campusMin: 6, slots: ['WD-AM', 'WD-PM'], capacity: 5, filled: 5,
  },

  // ---- Community gardens ----
  {
    id: 'site-29', name: 'Midtown Community Garden', type: 'Community garden', neighborhood: 'Midtown',
    address: '300 Elm Ct', x: 0.9, y: 0.3, routes: ['Route 31', 'Blue Line'], stop: 'Campus Central Station',
    campusMin: 5, slots: ['WD-AM', 'WD-PM', 'SAT'], capacity: 6, filled: 4,
  },
  {
    id: 'site-30', name: 'Riverbend Growers Collective', type: 'Community garden', neighborhood: 'Riverbend',
    address: '4700 Olive Rd', x: 6.2, y: 2.6, routes: ['Route 44', 'Blue Line'], stop: 'Riverbend Crossing Station',
    campusMin: 29, slots: ['WD-AM', 'WD-PM', 'SAT'], capacity: 8, filled: 6,
  },
  {
    id: 'site-31', name: 'Oak Flats Garden Commons', type: 'Community garden', neighborhood: 'Oak Flats',
    address: '90 Juniper Way', x: -5.0, y: 6.0, routes: ['Route 22'], stop: 'Oak Flats Loop (Route 22)',
    campusMin: 52, slots: ['WD-AM', 'SAT'], capacity: 4, filled: 2,
  },
  {
    id: 'site-32', name: 'Eastside Alder Park Garden', type: 'Community garden', neighborhood: 'Eastside',
    address: '2290 Alder St', x: 5.4, y: -0.2, routes: ['Route 7'], stop: 'Alder & 14th (Route 7)',
    campusMin: 25, slots: ['WD-PM', 'SAT'], capacity: 4, filled: 3,
  },
  {
    id: 'site-33', name: 'Harbor Waterfront Garden', type: 'Community garden', neighborhood: 'Harbor',
    address: '40 Wharf St', x: -5.4, y: -5.2, routes: ['Route 12', 'Blue Line'], stop: 'Harbor Terminal Station',
    campusMin: 24, slots: ['WD-AM', 'WD-PM'], capacity: 3, filled: 3,
  },
  {
    id: 'site-34', name: 'Parkview Rooftop Garden', type: 'Community garden', neighborhood: 'Parkview',
    address: '2202 Summit Ave', x: 2.0, y: 6.6, routes: ['Route 31'], stop: 'Parkview Loop',
    campusMin: 37, slots: ['WD-AM', 'WD-PM'], capacity: 3, filled: 1,
  },
];
