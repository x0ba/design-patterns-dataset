// Seven appliance manuals (each pinned to its real place) plus other documents attached to pins.
// Excerpts are the shutdown and winterizing sections as written in the house binder.

export const MANUALS = [
  {
    id: 'goulds',
    title: 'Goulds submersible well pump — owner’s manual',
    short: 'Goulds well pump',
    pin: 'S7',
    pages: 24,
    updated: 'Binder copy, 2019',
    excerpt: [
      { head: 'Before you shut down', text: 'Switch off the pump breaker at the panel before you close the main. Running a submersible pump with no water flowing overheats it.' },
      { head: 'Freeze protection', text: 'The pump and the drop pipe stay in the well. Draining is done at the pressure tank and the bunkhouse valve, not at the pump.' },
      { head: 'In spring', text: 'Restore power only after the pressure tank has been refilled and the main is open. Run each tap until water is steady, then check the pressure switch.' },
    ],
  },
  {
    id: 'rheem',
    title: 'Rheem water heater — owner’s manual',
    short: 'Rheem water heater',
    pin: 'G4',
    pages: 20,
    updated: 'Binder copy, 2017',
    excerpt: [
      { head: 'Vacation shutdown', text: 'Turn off the power at the breaker. Close the cold-water inlet valve. Open a hot tap so air enters the tank.' },
      { head: 'Draining', text: 'Attach a hose to the drain valve at the bottom of the tank and run it to a drain. The tank empties by gravity; open the valve fully.' },
      { head: 'Refilling', text: 'Close the drain valve, open the cold inlet, and run the hot tap until air stops spitting. Restore power only after the tank is full.' },
    ],
  },
  {
    id: 'rinnai',
    title: 'Rinnai propane wall furnace — owner’s manual',
    short: 'Rinnai wall furnace',
    pin: 'L1',
    pages: 36,
    updated: 'Binder copy, 2015',
    excerpt: [
      { head: 'Shutdown', text: 'Set the thermostat to OFF. Turn the gas control knob to OFF. The pilot goes out with the knob, so no separate step is needed.' },
      { head: 'Section 6: relighting', text: 'Turn the knob to PILOT, hold it in, and light the pilot. Keep the knob held for 30 seconds after the flame starts. Only relight after the propane is back on at the tank.' },
      { head: 'Clearance', text: 'Keep 1 m clear of the furnace face. Do not store anything on the wall above it.' },
    ],
  },
  {
    id: 'pressure-tank',
    title: 'Well pressure tank — manual',
    short: 'Pressure tank',
    pin: 'G6',
    pages: 8,
    updated: 'Binder copy, 2020',
    excerpt: [
      { head: 'Draining the tank', text: 'Close the main, then open the drain cock at the base until flow stops. Leave the cock open over winter so any leftover water can drain out.' },
      { head: 'Air charge', text: 'Check the air charge with the tank empty. The target is 38 psi. Adjust with a tire pump at the valve on top of the tank.' },
      { head: 'Isolation valve', text: 'The green-handle valve only isolates the tank for service. It does not shut off the house.' },
    ],
  },
  {
    id: 'bunkhouse-heater',
    title: 'Bunkhouse point-of-use water heater — manual',
    short: 'Bunkhouse water heater',
    pin: 'S18',
    pages: 6,
    updated: 'Binder copy, 2021',
    excerpt: [
      { head: 'Before draining', text: 'Switch off power at the breaker (#17 in the mudroom panel). Let the heater cool to room temperature before you open anything on it.' },
      { head: 'Draining', text: 'Open the lowest tap in the bunkhouse. The unit itself does not have a separate drain valve.' },
    ],
  },
  {
    id: 'dehumidifier',
    title: 'Crawlspace dehumidifier — manual',
    short: 'Crawlspace dehumidifier',
    pin: 'C6',
    pages: 14,
    updated: 'Binder copy, 2023',
    excerpt: [
      { head: 'Storage', text: 'Unplug the unit. Empty the bucket and leave it out so the interior can dry.' },
      { head: 'Filter', text: 'Clean or replace the filter each spring. Kari replaced it in June 2026.' },
    ],
  },
  {
    id: 'boat-lift',
    title: 'Boat lift motor — manual',
    short: 'Boat lift motor',
    pin: 'S9',
    pages: 16,
    updated: 'Binder copy, 2018',
    excerpt: [
      { head: 'Before winter', text: 'Lower the lift fully into the water. Then switch off the power switch inside the boathouse and turn off breaker #21.' },
      { head: 'Spring check', text: 'Before restoring power, check the cable for ice damage at the motor end.' },
    ],
  },
];

// Documents that are not appliance manuals.
export const OTHER_DOCS = [
  {
    id: 'circuit-schedule',
    title: 'Main panel circuit schedule (2 pages)',
    short: 'Circuit schedule',
    pin: 'M1',
    pages: 2,
    updated: 'Printed copy taped inside the panel door, updated Apr 2026',
    excerpt: [
      { head: 'Circuits in use', text: '#9 water heater (240 V) · #14 well pump (WELL PUMP) · #17 guest bunkhouse · #21 boathouse and boat lift.' },
      { head: 'Changes', text: 'Circuits renumbered in the 2025 panel rewire. Circuit #14 was #12 before.' },
    ],
  },
  {
    id: 'propane-account',
    title: 'Lakes Gas delivery account — acct 88-2140',
    short: 'Propane account',
    pin: 'S1',
    pages: 1,
    updated: 'Last delivery on record, Apr 2026',
    excerpt: [
      { head: 'Tank', text: '500-gallon tank, east of the driveway. Account 88-2140.' },
      { head: 'Level', text: 'Gauge read 35% on 25 Apr 2026, after the winter season.' },
    ],
  },
];

export const ALL_DOCS = [...MANUALS, ...OTHER_DOCS];
export const DOC_BY_ID = Object.fromEntries(ALL_DOCS.map((d) => [d.id, d]));
