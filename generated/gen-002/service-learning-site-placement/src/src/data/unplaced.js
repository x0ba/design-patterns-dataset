// The 27 students still waiting for a Spring 2027 placement.
// availability: time slots the student can attend (see SLOTS in network.js).
// mode: how the student gets around. "Drives" students are not held to the
// transit-time limit.

export const UNPLACED = [
  // ---- Weekday evenings only (9) ----
  { id: 'S-2001', name: 'Marcus Elwell', course: 'SW 220', neighborhood: 'Cedar Hill', mode: 'Light rail', availability: ['WD-EVE'] },
  { id: 'S-2002', name: 'Hannah Brisbois', course: 'EDUC 215', neighborhood: 'Riverbend', mode: 'Bus + light rail', availability: ['WD-EVE'] },
  { id: 'S-2003', name: 'Tomasz Wierzba', course: 'SOC 140', neighborhood: 'Eastside', mode: 'Bus', availability: ['WD-EVE', 'SAT'] },
  { id: 'S-2004', name: 'Aaliyah Monroe', course: 'PUBH 101', neighborhood: 'Harbor', mode: 'Light rail', availability: ['WD-EVE'] },
  { id: 'S-2005', name: 'Daniel Huang', course: 'URBS 180', neighborhood: 'Southport', mode: 'Bus + light rail', availability: ['WD-EVE'] },
  { id: 'S-2006', name: 'Esperanza Lozano', course: 'GERO 205', neighborhood: 'Parkview', mode: 'Bus', availability: ['WD-EVE'] },
  { id: 'S-2007', name: 'Kofi Asante', course: 'SW 220', neighborhood: 'Midtown', mode: 'Bus + light rail', availability: ['WD-EVE', 'SAT'] },
  { id: 'S-2008', name: 'Lena Sørensen', course: 'EDUC 215', neighborhood: 'Westfield', mode: 'Drives', availability: ['WD-EVE'] },
  { id: 'S-2009', name: 'Ruth Abernathy', course: 'GERO 205', neighborhood: 'Oak Flats', mode: 'Bus', availability: ['WD-EVE'] },

  // ---- Daytime and Saturday (18) ----
  { id: 'S-2010', name: 'Sam Okonkwo-Reyes', course: 'SOC 140', neighborhood: 'Northgate', mode: 'Bus', availability: ['WD-AM', 'WD-PM'] },
  { id: 'S-2011', name: 'Yuki Tanaka', course: 'PUBH 101', neighborhood: 'Midtown', mode: 'Bus + light rail', availability: ['WD-PM', 'SAT'] },
  { id: 'S-2012', name: 'Brianna Coll', course: 'EDUC 215', neighborhood: 'Eastside', mode: 'Bus', availability: ['WD-AM', 'WD-PM'] },
  { id: 'S-2013', name: 'Omar Haddad', course: 'SW 220', neighborhood: 'Parkview', mode: 'Bus', availability: ['WD-AM', 'WD-PM'] },
  { id: 'S-2014', name: 'Grace Lindqvist', course: 'URBS 180', neighborhood: 'Westfield', mode: 'Bus', availability: ['WD-AM', 'SAT'] },
  { id: 'S-2015', name: 'Nadia Farouk', course: 'PUBH 101', neighborhood: 'Oak Flats', mode: 'Bus', availability: ['WD-AM', 'SAT'] },
  { id: 'S-2016', name: 'Benjamin Choi', course: 'EDUC 215', neighborhood: 'Harbor', mode: 'Bus + light rail', availability: ['WD-PM', 'SAT'] },
  { id: 'S-2017', name: 'Priscila Mendes', course: 'SOC 140', neighborhood: 'Riverbend', mode: 'Bus + light rail', availability: ['WD-AM', 'WD-PM'] },
  { id: 'S-2018', name: 'Ethan Graybill', course: 'GERO 205', neighborhood: 'Southport', mode: 'Bus + light rail', availability: ['WD-AM', 'WD-PM'] },
  { id: 'S-2019', name: 'Mariam Yusuf', course: 'SOC 140', neighborhood: 'Cedar Hill', mode: 'Light rail', availability: ['WD-PM', 'SAT'] },
  { id: 'S-2020', name: 'Jonah Pemberton', course: 'PUBH 101', neighborhood: 'Eastside', mode: 'Bus', availability: ['SAT'] },
  { id: 'S-2021', name: 'Chloe Varga', course: 'URBS 180', neighborhood: 'Midtown', mode: 'Bus + light rail', availability: ['WD-AM', 'SAT'] },
  { id: 'S-2022', name: 'Samuel Adjei', course: 'SW 220', neighborhood: 'Southport', mode: 'Light rail', availability: ['WD-AM', 'WD-PM'] },
  { id: 'S-2023', name: 'Ingrid Solberg', course: 'GERO 205', neighborhood: 'Northgate', mode: 'Bus', availability: ['WD-AM', 'WD-PM', 'SAT'] },
  { id: 'S-2024', name: 'Rafael Ocampo', course: 'EDUC 215', neighborhood: 'Midtown', mode: 'Bus', availability: ['WD-PM', 'SAT'] },
  { id: 'S-2025', name: 'Hye-jin Park', course: 'PUBH 101', neighborhood: 'Riverbend', mode: 'Drives', availability: ['WD-AM', 'WD-PM', 'SAT'] },
  { id: 'S-2026', name: 'Dorian Whitfield', course: 'SOC 140', neighborhood: 'Harbor', mode: 'Light rail', availability: ['WD-AM', 'SAT'] },
  { id: 'S-2027', name: 'Leticia Ramos', course: 'URBS 180', neighborhood: 'Parkview', mode: 'Bus', availability: ['WD-PM', 'SAT'] },
];
