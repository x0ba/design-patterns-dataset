// The 46 pinned items. Each sits at a real place: a building floor (floor id + room id + plan x/y)
// or on the site (loc 'site' + site x/y in metres). Notes are from the family's records.
//
// Fields: id, type, title, loc ('site' | 'ground' | 'upper' | 'crawl'), room, x, y,
//         notes, by (last edited by), at (last edited, ISO), doc (manual id, optional)

export const PINS = [
  // ---------- Site (property) ----------
  {
    id: 'S1', type: 'Propane', loc: 'site', x: 44, y: 16,
    title: 'Propane tank, 500 gal — Lakes Gas acct 88-2140',
    notes:
      'East of the driveway, 30 m west of the boathouse. The service valve is on top of the tank: turn it clockwise until it stops, hand-tight only. Tank read 35% on 25 Apr 2026.',
    by: 'Pete', at: '2026-04-25T10:15', doc: 'propane-account',
  },
  {
    id: 'S2', type: 'Septic', loc: 'site', x: 16.5, y: 50.5,
    title: 'Septic cleanout cap (by the birch clump)',
    notes:
      'Black plastic cap, west of the driveway at the edge of the birch clump. Lift it, then press it back down so it seats. Do not pour antifreeze into the septic. Antifreeze goes in traps and toilets only.',
    by: 'Pete', at: '2025-10-19T16:40',
  },
  {
    id: 'S4', type: 'Drain', loc: 'site', x: 53, y: 41,
    title: 'Outdoor shower blowout port',
    notes:
      'Threaded fitting at the base of the shower riser, on the east wall of the cabin. Attach the compressor, run it until no water comes out of the shower head. Keep under 40 psi.',
    by: 'Pete', at: '2025-10-19T15:55',
  },
  {
    id: 'S5', type: 'Quirk', loc: 'site', x: 53.4, y: 38.4,
    title: 'Outdoor shower: hot tap is slow',
    notes:
      'Hot water takes about six minutes to reach the head. Run the hot tap first and wait before you step in.',
    by: 'Kari', at: '2026-06-27T18:05',
  },
  {
    id: 'S6', type: 'Outdoor', loc: 'site', x: 9, y: 40,
    title: 'Well cap (stake marker)',
    notes:
      'The cap sits about 30 cm below grade under the metal stake. Do not drive or mow over it. Pete mows around the stake.',
    by: 'Pete', at: '2025-10-19T14:30',
  },
  {
    id: 'S7', type: 'Appliance', loc: 'site', x: 11.2, y: 35.6,
    title: 'Goulds well pump — owner’s manual',
    notes:
      'The pump is down the well, not in the house. This manual is pinned here so you can read it before you open the cap.',
    by: 'Pete', at: '2025-10-19T14:35', doc: 'goulds',
  },
  {
    id: 'S8', type: 'Electrical', loc: 'site', x: 71.5, y: 13.5,
    title: 'Boat lift power switch',
    notes:
      'Inside the boathouse on the left door frame. Switch it off, then turn off breaker #21 in the mudroom panel.',
    by: 'Pete', at: '2025-10-19T16:05',
  },
  {
    id: 'S9', type: 'Appliance', loc: 'site', x: 77, y: 11,
    title: 'Boat lift motor — manual',
    notes:
      'Motor is on the boathouse rear wall. Lower the lift fully before switching power off.',
    by: 'Pete', at: '2025-10-19T16:10', doc: 'boat-lift',
  },
  {
    id: 'S12', type: 'Quirk', loc: 'site', x: 33, y: 61.5,
    title: 'Woodshed: mouse bait station',
    notes:
      'Bait station is under the back shelf. Kari replaced the bait in June 2026. Check it before you close the shed.',
    by: 'Kari', at: '2026-06-27T17:50',
  },
  {
    id: 'S13', type: 'Quirk', loc: 'site', x: 71, y: 61,
    title: 'Outhouse: spare rolls and lime',
    notes:
      'Spare rolls live in the tin on the back shelf. Lime bucket is under the seat. The door sticks in cold weather, so pull it firmly.',
    by: 'Kari', at: '2026-06-27T17:58',
  },
  {
    id: 'S15', type: 'Access', loc: 'site', x: 20, y: 90,
    title: 'Driveway gate (lift, do not force)',
    notes:
      'Lift the latch and swing the gate toward the road. The hinge pin is loose, so lift the gate as you swing it. The key is on the mudroom hook.',
    by: 'Pete', at: '2025-10-19T14:20',
  },
  {
    id: 'S17', type: 'Drain', loc: 'site', x: 62, y: 37.5,
    title: 'Bunkhouse kitchen tap (leave open)',
    notes:
      'Open this tap after the bunkhouse drain valve (step 10) and leave it open. The lines won’t empty if the tap is closed.',
    by: 'Pete', at: '2025-10-19T15:30',
  },
  {
    id: 'S18', type: 'Appliance', loc: 'site', x: 60, y: 35.5,
    title: 'Bunkhouse water heater — manual',
    notes:
      'Point-of-use electric heater above the bunkhouse sink. Switch off at its own breaker (#17 in the mudroom panel) before draining.',
    by: 'Pete', at: '2025-10-19T15:40', doc: 'bunkhouse-heater',
  },

  // ---------- Main cabin: utility room (ground floor) ----------
  {
    id: 'G1', type: 'Shutoff', loc: 'ground', room: 'utility', x: 3.9, y: 7.3,
    title: 'Main water shutoff – red handle, left of pressure tank',
    notes:
      'This is the main. It is a quarter-turn ball valve: turn the red handle until it lies across the pipe. Close it after the well breaker is off, and before you open any drain.',
    by: 'Pete', at: '2025-10-19T14:55',
  },
  {
    id: 'G2', type: 'Shutoff', loc: 'ground', room: 'utility', x: 5.6, y: 7.3,
    title: 'Pressure tank isolation valve – green handle, right of tank',
    notes:
      'NOT the main. This valve only cuts the pressure tank off from the pipes for service. Leave it open while you winterize. Closing the red main is enough.',
    by: 'Pete', at: '2025-10-19T15:00',
  },
  {
    id: 'G3', type: 'Drain', loc: 'ground', room: 'utility', x: 4.7, y: 6.5,
    title: 'Pressure tank drain cock (brass, base of tank)',
    notes:
      'Open this after the main is closed. Water runs out into a bucket or the floor drain until it stops. Leave it open all winter.',
    by: 'Pete', at: '2025-10-19T15:05',
  },
  {
    id: 'G4', type: 'Appliance', loc: 'ground', room: 'utility', x: 5.5, y: 8.6,
    title: 'Rheem water heater — manual',
    notes:
      'Electric 40-gallon tank. Breaker #9 in the mudroom panel. The shutdown section explains draining before power is switched off.',
    by: 'Pete', at: '2025-10-19T15:10', doc: 'rheem',
  },
  {
    id: 'G5', type: 'Drain', loc: 'ground', room: 'utility', x: 5.5, y: 6.6,
    title: 'Water heater drain valve (base of Rheem)',
    notes:
      'Attach a garden hose and run it to the floor drain. Open the upstairs and kitchen taps first so air can get in, or the tank will not empty.',
    by: 'Pete', at: '2025-10-19T15:12',
  },
  {
    id: 'G6', type: 'Appliance', loc: 'ground', room: 'utility', x: 4.7, y: 7.9,
    title: 'Well pressure tank — manual',
    notes:
      'Keep the air charge at 38 psi with the tank empty. Check it with the gauge on the top of the tank in April.',
    by: 'Pete', at: '2025-10-19T15:15', doc: 'pressure-tank',
  },

  // ---------- Mudroom (ground floor) ----------
  {
    id: 'M1', type: 'Electrical', loc: 'ground', room: 'mudroom', x: 1.0, y: 8.6,
    title: 'Main electrical panel — 24 circuits, all labelled',
    notes:
      'Every circuit is labelled in marker and on the printed schedule taped inside the door. Read the schedule before you switch anything off.',
    by: 'Pete', at: '2026-04-25T10:30', doc: 'circuit-schedule',
  },
  {
    id: 'M2', type: 'Electrical', loc: 'ground', room: 'mudroom', x: 1.6, y: 8.6,
    title: 'Well pump breaker #14 (WELL PUMP)',
    notes:
      'Renumbered in the 2025 panel rewire. It used to be #12. Turn it off before you close the main, or the pump runs dry.',
    by: 'Pete', at: '2025-10-19T14:45',
  },
  {
    id: 'M3', type: 'Electrical', loc: 'ground', room: 'mudroom', x: 2.1, y: 8.6,
    title: 'Water heater breaker #9 (240 V)',
    notes:
      'Turn it off before you drain the Rheem so the elements do not fire with no water in the tank.',
    by: 'Pete', at: '2025-10-19T14:50',
  },
  {
    id: 'M4', type: 'Electrical', loc: 'ground', room: 'mudroom', x: 2.6, y: 8.6,
    title: 'Guest bunkhouse breaker #17',
    notes:
      'Powers the bunkhouse, including its point-of-use heater. Unplug the bunkhouse fridge before you switch this off.',
    by: 'Pete', at: '2025-10-19T14:52',
  },
  {
    id: 'M5', type: 'Electrical', loc: 'ground', room: 'mudroom', x: 3.1, y: 8.6,
    title: 'Boathouse breaker #21 (boat lift)',
    notes:
      'Switch off after the lift is lowered. The matching switch is inside the boathouse.',
    by: 'Pete', at: '2025-10-19T14:54',
  },
  {
    id: 'M7', type: 'Access', loc: 'ground', room: 'mudroom', x: 0.3, y: 7.0,
    title: 'Spare keys cabinet',
    notes:
      'Keys for the bunkhouse, the boathouse and the driveway gate are on labelled hooks. The front-door key is the brass one on the left.',
    by: 'Pete', at: '2025-10-19T14:25',
  },

  // ---------- Kitchen ----------
  {
    id: 'K1', type: 'Drain', loc: 'ground', room: 'kitchen', x: 8.4, y: 8.6,
    title: 'Kitchen sink tap (open and leave open)',
    notes:
      'Open it for the whole draining sequence (steps 6–9). Only close it once the traps have antifreeze in them.',
    by: 'Pete', at: '2025-10-19T15:20',
  },
  {
    id: 'K2', type: 'Drain', loc: 'ground', room: 'kitchen', x: 8.0, y: 7.4,
    title: 'Kitchen sink trap (under sink)',
    notes:
      'Pour a cup of non-toxic RV antifreeze into the drain. Pete switched to RV antifreeze in 2025.',
    by: 'Pete', at: '2025-10-19T15:22',
  },
  {
    id: 'K3', type: 'Safety', loc: 'ground', room: 'kitchen', x: 6.3, y: 6.4,
    title: 'Fire extinguisher (kitchen, 10 lb ABC)',
    notes:
      'Gauge is in the green. Inspected October 2025. Hangs by the pantry door.',
    by: 'Pete', at: '2025-10-19T15:25',
  },

  // ---------- Living room ----------
  {
    id: 'L1', type: 'Appliance', loc: 'ground', room: 'living', x: 0.4, y: 4.9,
    title: 'Rinnai wall furnace — manual',
    notes:
      'Propane wall furnace on the west wall. The shutdown section covers the gas control and the pilot. Relight in spring only after reading section 6.',
    by: 'Pete', at: '2026-04-25T10:40', doc: 'rinnai',
  },
  {
    id: 'L2', type: 'Shutoff', loc: 'ground', room: 'living', x: 2.8, y: 5.5,
    title: 'Furnace thermostat — set to OFF',
    notes:
      'Set to OFF, not HEAT, by the door to the mudroom. The furnace’s gas control is a separate step (step 20).',
    by: 'Pete', at: '2025-10-19T15:30',
  },
  {
    id: 'L3', type: 'Propane', loc: 'ground', room: 'living', x: 0.4, y: 4.1,
    title: 'Rinnai gas control knob (inside the furnace cabinet)',
    notes:
      'Turn the knob to OFF. Do not turn it to PILOT. The pilot goes out when the knob is off, which is what you want.',
    by: 'Pete', at: '2025-10-19T15:32',
  },
  {
    id: 'L4', type: 'Chimney', loc: 'ground', room: 'living', x: 4.6, y: 0.5,
    title: 'Chimney damper lever (fireplace, south wall)',
    notes:
      'Push the lever all the way in until it clicks. The stop is loose, so check the damper is closed by looking up the flue with a flashlight.',
    by: 'Pete', at: '2025-10-19T15:35',
  },
  {
    id: 'L5', type: 'Quirk', loc: 'ground', room: 'living', x: 6.4, y: 2.2,
    title: 'Hearth board creaks — step on the left board',
    notes:
      'The board in front of the fireplace creaks loudly. Step on the left-hand board to keep it quiet.',
    by: 'Kari', at: '2026-06-27T17:40',
  },

  // ---------- Bedroom 1 and Bath 1 (ground floor) ----------
  {
    id: 'B1', type: 'Quirk', loc: 'ground', room: 'bed1', x: 13.4, y: 4.4,
    title: 'Bedroom 1 window: sash painted shut',
    notes:
      'Use the flat screwdriver in the drawer under the bedside table. Don’t force it from outside.',
    by: 'Kari', at: '2026-06-27T17:30',
  },
  {
    id: 'B2', type: 'Safety', loc: 'ground', room: 'bed1', x: 11.5, y: 5.5,
    title: 'Smoke and CO alarm (bedroom hall)',
    notes:
      'Battery replaced October 2025. Press and hold the test button for five seconds to check it.',
    by: 'Pete', at: '2025-10-19T15:40',
  },
  {
    id: 'T1', type: 'Drain', loc: 'ground', room: 'bath1', x: 13.2, y: 7.4,
    title: 'Bath 1 shower trap (under the shower)',
    notes:
      'Pour RV antifreeze into the drain until it shows at the drain opening. Wait five minutes before you move on.',
    by: 'Pete', at: '2025-10-19T15:45',
  },
  {
    id: 'T2', type: 'Drain', loc: 'ground', room: 'bath1', x: 11.2, y: 7.0,
    title: 'Bath 1 toilet — tank and bowl',
    notes:
      'Flush until the tank is empty and sponge out what is left. Pour a cup of antifreeze into the bowl.',
    by: 'Pete', at: '2025-10-19T15:48',
  },

  // ---------- Upper floor ----------
  {
    id: 'U1', type: 'Drain', loc: 'upper', room: 'bath2', x: 8.4, y: 8.4,
    title: 'Bath 2 sink — highest tap in the house',
    notes:
      'Open this first, before any other tap. Opening the high point lets the lines drain back down.',
    by: 'Pete', at: '2025-10-19T15:50',
  },
  {
    id: 'U2', type: 'Drain', loc: 'upper', room: 'bath2', x: 7.0, y: 7.3,
    title: 'Bath 2 toilet',
    notes:
      'Flush until the tank is empty. Pour a cup of antifreeze into the bowl after the tank is drained.',
    by: 'Pete', at: '2025-10-19T15:52',
  },
  {
    id: 'U3', type: 'Drain', loc: 'upper', room: 'bath2', x: 8.4, y: 5.0,
    title: 'Bath 2 tub trap (under the tub)',
    notes:
      'Pour RV antifreeze into the drain until it shows at the opening. Wait five minutes.',
    by: 'Pete', at: '2025-10-19T15:54',
  },

  // ---------- Crawlspace ----------
  {
    id: 'C1', type: 'Access', loc: 'crawl', room: 'crawl', x: 6.6, y: 8.9,
    title: 'North crawlspace hatch (exterior, north wall)',
    notes:
      'The hatch lifts out. Latch it on the way out. The bunkhouse drain valve is 1.5 m in from this hatch, see the next pin.',
    by: 'Pete', at: '2025-10-19T16:00',
  },
  {
    id: 'C2', type: 'Drain', loc: 'crawl', room: 'crawl', x: 6.6, y: 7.5,
    title: 'Bunkhouse drain valve — under the north hatch, 1.5 m in',
    notes:
      'Ball valve: turn to open. In 2025 it moved here from under the bunkhouse floor, so you no longer have to crawl under the bunkhouse. Leave it open all winter.',
    by: 'Pete', at: '2025-10-19T16:02',
  },
  {
    id: 'C3', type: 'Shutoff', loc: 'crawl', room: 'crawl', x: 12.8, y: 3.0,
    title: 'Outdoor shower supply valve (east side)',
    notes:
      'Close this before you open the low-point drain. Otherwise the water keeps running in.',
    by: 'Pete', at: '2025-10-19T16:05',
  },
  {
    id: 'C4', type: 'Drain', loc: 'crawl', room: 'crawl', x: 12.4, y: 1.6,
    title: 'Outdoor shower low-point drain',
    notes:
      'Open after the supply valve is closed. Water drains out here, not from the shower head.',
    by: 'Pete', at: '2025-10-19T16:06',
  },
  {
    id: 'C5', type: 'Electrical', loc: 'crawl', room: 'crawl', x: 8.2, y: 4.5,
    title: 'Heat tape plug (supply line, south beam)',
    notes:
      'Unplug once the lines are empty. Heat tape left on in a dry line can overheat.',
    by: 'Pete', at: '2025-10-19T16:08',
  },
  {
    id: 'C6', type: 'Appliance', loc: 'crawl', room: 'crawl', x: 2.0, y: 2.0,
    title: 'Crawlspace dehumidifier — manual',
    notes:
      'Empty the bucket, unplug it, and leave the bucket out so it dries. The filter is checked each spring.',
    by: 'Kari', at: '2026-06-27T17:20', doc: 'dehumidifier',
  },
];
