import { RepairLog, Outcome } from './types';
import { mulberry32, pick, int, weighted, Rng } from './rng';
import { VOLUNTEERS } from './people';
import { secondSaturday } from './docs';

// Hand-entered logs that matter for mixers and for "hums but won't turn" faults
const CURATED: RepairLog[] = [
  {
    id: 'log-2024-03-mm',
    date: '2024-03-09',
    item: 'Sunbeam Mixmaster 2346 stand mixer',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    model: '2346',
    product: 'Stand mixer',
    category: 'Kitchen appliances',
    fault: 'Hums when switched on but the beaters won’t spin at any speed. Worked fine last month.',
    outcome: 'fixed',
    fixer: 'Dev Raman',
    notes:
      'Both carbon brushes worn down to about 3/16 in, and the left one was sticking in its holder. Fitted a new pair from the parts drawer (1/4 in square). Cleaned the commutator with fine glass paper. Runs on all 12 speeds. The brush caps are either side of the motor housing — service manual p.14.',
    minutes: 40,
    parts: 'Carbon brush pair, 1/4 in square (parts drawer B)',
  },
  {
    id: 'log-2024-09-mm',
    date: '2024-09-14',
    item: 'Sunbeam Mixmaster 2348 stand mixer',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    model: '2348',
    product: 'Stand mixer',
    category: 'Kitchen appliances',
    fault: 'Humming noise, beaters don’t spin on the low settings. Smelled warm after a minute.',
    outcome: 'partly',
    fixer: 'Maureen Talbot',
    notes:
      'Brushes fine (over 3/8 in left). Speed-control governor contacts badly pitted and not closing on settings 1–5. Dressed the contacts with a points file — now starts on 6 and above but still stalls on low. Needs a new governor contact plate (see manual p.17 and the 2340-series parts list). Owner will order one and come back.',
    minutes: 55,
  },
  {
    id: 'log-2023-05-mm',
    date: '2023-05-13',
    item: 'Sunbeam Mixmaster 2350 stand mixer',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    model: '2350',
    product: 'Stand mixer',
    category: 'Kitchen appliances',
    fault: 'Bowl turntable sticks — bowl won’t turn freely while mixing.',
    outcome: 'fixed',
    fixer: 'Alan Whitcombe',
    notes: 'Old grease under the turntable had gone hard. Cleaned and re-greased. Wrote it up as a repair note in the library.',
    minutes: 25,
  },
  {
    id: 'log-2025-02-mm',
    date: '2025-02-08',
    item: 'Sunbeam Mixmaster 2346 stand mixer',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    model: '2346',
    product: 'Stand mixer',
    category: 'Kitchen appliances',
    fault: 'Speed dial loose — knob moves but speed stays the same.',
    outcome: 'fixed',
    fixer: 'Lucia Ferreira',
    notes: 'Grub screw in the dial knob had backed out. Re-seated on the flat of the shaft and tightened with a drop of thread lock.',
    minutes: 15,
  },
  {
    id: 'log-2026-04-mm',
    date: '2026-04-11',
    item: 'Sunbeam Mixmaster 2348 stand mixer',
    brand: 'Sunbeam',
    family: 'Mixmaster',
    model: '2348',
    product: 'Stand mixer',
    category: 'Kitchen appliances',
    fault: 'Power cord frayed where it enters the base.',
    outcome: 'fixed',
    fixer: 'Gerald Pryce',
    notes: 'Fitted a new 2-core cord and strain relief bush. PAT tested OK.',
    minutes: 30,
    parts: '2-core 0.75 mm² cord, strain relief bush',
  },
  {
    id: 'log-2023-11-kw',
    date: '2023-11-11',
    item: 'Kenwood Chef A701 stand mixer',
    brand: 'Kenwood',
    family: 'Chef',
    model: 'A701',
    product: 'Stand mixer',
    category: 'Kitchen appliances',
    fault: 'Hums but the beater won’t turn.',
    outcome: 'fixed',
    fixer: 'Tomasz Nowak',
    notes: 'Gearbox grease had set solid. Stripped, cleaned and re-greased the planetary gears. Brushes were fine.',
    minutes: 70,
  },
  {
    id: 'log-2025-06-mx',
    date: '2025-06-14',
    item: 'Moulinex Masterchef 350 food processor',
    brand: 'Moulinex',
    family: 'Masterchef',
    model: '350',
    product: 'Food processor',
    category: 'Kitchen appliances',
    fault: 'Hums, blade doesn’t spin.',
    outcome: 'not',
    fixer: 'Priya Venkatesan',
    notes: 'Motor runs free. Drive coupling under the bowl is cracked through. Part no longer made — suggested a 3D-printed replacement.',
    minutes: 35,
  },
  {
    id: 'log-2024-07-fan',
    date: '2024-07-13',
    item: 'Pifco 1088 desk fan',
    brand: 'Pifco',
    model: '1088',
    product: 'Desk fan',
    category: 'Heating & fans',
    fault: 'Hums but the blades won’t turn unless you push them.',
    outcome: 'fixed',
    fixer: 'Femi Adeyemi',
    notes: 'Dry sleeve bearings. Cleaned the shaft, oiled both bearings with light machine oil. Starts on its own now.',
    minutes: 20,
  },
  {
    id: 'log-2026-01-hb',
    date: '2026-01-10',
    item: 'Hamilton Beach 62682 hand mixer',
    brand: 'Hamilton Beach',
    model: '62682',
    product: 'Hand mixer',
    category: 'Kitchen appliances',
    fault: 'Hums, beaters don’t turn.',
    outcome: 'fixed',
    fixer: 'Hana Sato',
    notes: 'One brush spring had snapped so the brush wasn’t touching the commutator. Fitted a spare brush and spring from the drawer.',
    minutes: 30,
  },
  {
    id: 'log-2025-10-gr',
    date: '2025-10-11',
    item: 'Garrard SP25 turntable',
    brand: 'Garrard',
    model: 'SP25',
    product: 'Turntable',
    category: 'Audio & hi-fi',
    fault: 'Motor hums, platter won’t spin.',
    outcome: 'fixed',
    fixer: 'Sam Kowalczyk',
    notes: 'Idler wheel rubber had hardened and glazed. Cleaned and roughened it, oiled the motor bearing. Speed steady at 33 and 45.',
    minutes: 45,
  },
];

// ---------------------------------------------------------------------------
// Generated logs: everyday café repairs (no humming motors — those are above)
// ---------------------------------------------------------------------------
interface FaultSpec {
  fault: string;
  fixed: string;
  partly?: string;
  not?: string;
  parts?: string;
}
interface ItemSpec {
  product: string;
  category: string;
  items: [string, string][]; // [brand, model]
  faults: FaultSpec[];
}

const ITEMS: ItemSpec[] = [
  {
    product: 'Toaster', category: 'Kitchen appliances',
    items: [['Dualit', '20245'], ['Russell Hobbs', '18780'], ['Morphy Richards', '44380'], ['Breville', 'BTA720'], ['Sunbeam', 'TA9200'], ['Tefal', 'TT3650']],
    faults: [
      { fault: 'Lever won’t stay down.', fixed: 'Crumbs jammed the latch and the electromagnet contacts were dirty. Cleaned out and checked the timer board.', not: 'Timer board burnt near the relay. No spare board available.' },
      { fault: 'Only one side toasts.', fixed: 'Broken element wire on the left slot. Crimped a joint with a ceramic connector.', partly: 'Joined the element but it is very thin elsewhere — told owner it may not last.' },
      { fault: 'Burning smell and smoke.', fixed: 'Crumb tray full and a crust stuck against an element. Cleaned out, PAT tested OK.' },
    ],
  },
  {
    product: 'Kettle', category: 'Kitchen appliances',
    items: [['Russell Hobbs', 'K2'], ['Morphy Richards', '43615'], ['Philips', 'HD9339'], ['Dualit', '72815'], ['Sunbeam', 'KE6400'], ['Tefal', 'KO2501']],
    faults: [
      { fault: 'Doesn’t switch off when it boils.', fixed: 'Steam tube blocked with scale. Descaled and cleared the tube; switches off reliably.', partly: 'Descaled; now switches off but slowly. Thermostat is tired.' },
      { fault: 'Leaks from the base.', fixed: 'Element seal perished. Fitted a new seal from the spares box.', not: 'Crack in the plastic body by the handle. Can’t be sealed safely.' },
      { fault: 'Light comes on but no heat.', fixed: 'Thermal fuse open. Replaced with a matching 240 °C fuse.', parts: 'Thermal fuse 240 °C', not: 'Element open circuit. No replacement available.' },
    ],
  },
  {
    product: 'Food processor', category: 'Kitchen appliances',
    items: [['Kenwood', 'FP730'], ['Magimix', '4200'], ['Cuisinart', 'DLC-7'], ['Braun', 'KM 32'], ['Sunbeam', '4815']],
    faults: [
      { fault: 'Won’t start with the lid on.', fixed: 'Safety interlock rod cracked. Glued and reinforced with a sleeve; interlock still works.', partly: 'Bodged the interlock tab; owner advised to buy a new lid.' },
      { fault: 'Smells of burning after a few seconds.', fixed: 'Motor vents clogged with flour. Cleaned out and checked brushes.', not: 'Motor winding scorched. Not economical.' },
    ],
  },
  {
    product: 'Blender', category: 'Kitchen appliances',
    items: [['Oster', '4655'], ['Philips', 'HR2100'], ['Waring', 'BB155'], ['Kenwood', 'BL335']],
    faults: [
      { fault: 'Jug leaks around the blade.', fixed: 'Blade assembly gasket split. Replaced the gasket.', parts: 'Blade gasket' },
      { fault: 'Speed buttons don’t all work.', fixed: 'Sticky residue under the switch membrane. Cleaned with isopropyl.', partly: 'Two of five speeds working after cleaning.' },
    ],
  },
  {
    product: 'Coffee maker', category: 'Kitchen appliances',
    items: [['Russell Hobbs', '20680'], ['Philips', 'HD7546'], ['Cuisinart', 'DCC-1200'], ['Breville', 'BES870']],
    faults: [
      { fault: 'Water won’t come through.', fixed: 'Heavily scaled. Three rounds of citric acid descale.', not: 'Pump not running. Replacement pump not available for this model.' },
      { fault: 'Hot plate doesn’t heat.', fixed: 'Loose spade connector on the hot plate element. Re-crimped.' },
    ],
  },
  {
    product: 'Slow cooker', category: 'Kitchen appliances',
    items: [['Rival', '3100'], ['Morphy Richards', '48701'], ['Hamilton Beach', '33967']],
    faults: [
      { fault: 'Doesn’t get hot on low.', fixed: 'Selector switch contact burnt on the low position. Cleaned and re-tensioned.', partly: 'Low setting works intermittently. Owner will look for a new switch.' },
    ],
  },
  {
    product: 'Table lamp', category: 'Lamps & lighting',
    items: [['Habitat', 'Cosmo'], ['Anglepoise', 'Type 75'], ['Herbert Terry', '1227'], ['Philips', 'SL-25'], ['Artemide', 'Tizio']],
    faults: [
      { fault: 'Flickers when touched.', fixed: 'Loose connection at the lampholder. Rewired with new flex and a new lampholder.', parts: 'B22 lampholder, 2-core flex' },
      { fault: 'Switch broken.', fixed: 'Replaced the in-line rocker switch.' },
      { fault: 'No light with a new bulb.', fixed: 'Flex broken inside the arm. Rewired through the arm.', not: 'Transformer for the low-voltage bulb is dead; part unobtainable.' },
    ],
  },
  {
    product: 'Vacuum cleaner', category: 'Vacuum cleaners',
    items: [['Hoover', 'Junior U1104'], ['Dyson', 'DC07'], ['Numatic', 'HVR200'], ['Miele', 'S5211'], ['Vax', 'V-021']],
    faults: [
      { fault: 'Lost suction.', fixed: 'Blockage in the hose at the bend. Cleared and washed filters.' },
      { fault: 'Brush roll not turning.', fixed: 'Drive belt snapped. Fitted a new belt.', parts: 'Drive belt' },
      { fault: 'Cuts out after a few minutes.', fixed: 'Thermal cut-out tripping from a blocked filter. Cleaned filters.', partly: 'Runs longer but still cuts out. Motor bearings worn.' },
      { fault: 'Cable won’t rewind.', fixed: 'Rewind spring detached from the drum. Re-hooked and pre-tensioned.', not: 'Rewind spring broken. Spare not stocked.' },
    ],
  },
  {
    product: 'Radio', category: 'Audio & hi-fi',
    items: [['Roberts', 'R300'], ['Roberts', 'RD-60'], ['Grundig', 'Satellit 2000'], ['Sony', 'ICF-7600'], ['Bush', 'TR130']],
    faults: [
      { fault: 'Crackles when you turn the volume.', fixed: 'Dirty volume pot. Cleaned with contact cleaner.' },
      { fault: 'No sound, dial lights up.', fixed: 'Speaker lead broken at the solder tag. Re-soldered.', not: 'Output transistor failed. Couldn’t source a replacement.' },
      { fault: 'Tuning dial doesn’t move the pointer.', fixed: 'Dial cord slipped off. Restrung the cord.' },
    ],
  },
  {
    product: 'Cassette deck', category: 'Audio & hi-fi',
    items: [['Technics', 'RS-M235'], ['Sony', 'TC-K611'], ['Yamaha', 'KX-393'], ['Akai', 'CS-702']],
    faults: [
      { fault: 'Eats tapes.', fixed: 'Pinch roller glazed and take-up idler slipping. Cleaned roller, fitted new idler tyre.', parts: 'Idler tyre' },
      { fault: 'Plays slow and wobbly.', fixed: 'Capstan belt stretched. Fitted a new belt.', parts: 'Capstan belt' },
    ],
  },
  {
    product: 'Turntable', category: 'Audio & hi-fi',
    items: [['Technics', 'SL-1500'], ['Pioneer', 'PL-12D'], ['Dual', 'CS 505'], ['Pioneer', 'PL-112D']],
    faults: [
      { fault: 'Runs fast.', fixed: 'Belt on the wrong pulley step. Refitted and checked speed with a strobe disc.' },
      { fault: 'One channel missing.', fixed: 'Cartridge tag wire loose. Pushed home and checked.', partly: 'Fitted a used stylus; second channel now weak but present.' },
    ],
  },
  {
    product: 'Drill', category: 'Power tools',
    items: [['Black & Decker', 'BD154'], ['Bosch', 'PSB 650'], ['Makita', 'HP1640'], ['Metabo', 'SBE 600']],
    faults: [
      { fault: 'Sparks a lot and smells.', fixed: 'Brushes worn to the stop. Fitted new brushes and cleaned the commutator.', parts: 'Carbon brushes' },
      { fault: 'Chuck slips.', fixed: 'Chuck jaws gummed. Cleaned and lubricated.', not: 'Chuck threads stripped. Owner to buy a replacement chuck.' },
      { fault: 'Only works when trigger held at an angle.', fixed: 'Trigger switch worn. Fitted a new switch.', parts: 'Trigger switch' },
    ],
  },
  {
    product: 'Hedge trimmer', category: 'Garden equipment',
    items: [['Black & Decker', 'GT250'], ['Bosch', 'AHS 50-16'], ['Stihl', 'HS 45']],
    faults: [
      { fault: 'Blades jam.', fixed: 'Blades rusted and bent at the tip. Straightened, sharpened and oiled.' },
      { fault: 'Cuts out intermittently.', fixed: 'Cable damaged near the handle. Shortened and refitted.' },
    ],
  },
  {
    product: 'Lawnmower', category: 'Garden equipment',
    items: [['Flymo', 'HV300'], ['Qualcast', 'Concorde 32'], ['Bosch', 'Rotak 34']],
    faults: [
      { fault: 'Won’t cut cleanly.', fixed: 'Blade blunt and out of balance. Sharpened and balanced.' },
      { fault: 'Won’t start.', fixed: 'Safety switch lever cracked. Glued and reinforced.', not: 'Motor seized. Not worth repairing.' },
    ],
  },
  {
    product: 'Sewing machine', category: 'Sewing machines',
    items: [['Singer', '201K'], ['Singer', '99K'], ['Bernina', 'Record 730'], ['Brother', 'XL-2600'], ['Janome', '2041'], ['Jones', 'Model 15'], ['Pfaff', '130']],
    faults: [
      { fault: 'Skips stitches.', fixed: 'Needle in back to front and hook timing slightly out. Re-timed the hook.', partly: 'Better with a new needle; timing still a little off.' },
      { fault: 'Thread bunches under the fabric.', fixed: 'Upper tension wrongly threaded. Rethreaded and showed the owner.' },
      { fault: 'Hand wheel very stiff.', fixed: 'Old oil gone to varnish. Cleaned with solvent and re-oiled all points.' },
      { fault: 'Foot pedal doesn’t control speed.', fixed: 'Carbon pile in the pedal worn. Replaced the pedal with a spare.', parts: 'Foot pedal' },
    ],
  },
  {
    product: 'Steam iron', category: 'Irons & laundry',
    items: [['Rowenta', 'DW5080'], ['Philips', 'GC2990'], ['Tefal', 'FV3830'], ['Morphy Richards', '300250']],
    faults: [
      { fault: 'Spits brown water.', fixed: 'Scaled. Descaled and flushed.' },
      { fault: 'Doesn’t heat up.', fixed: 'Thermal fuse open. Replaced.', not: 'Element open circuit. Not repairable.' },
      { fault: 'Cord sparks at the back.', fixed: 'Cord frayed at the swivel. New cord fitted.', parts: 'Iron cord' },
    ],
  },
  {
    product: 'Fan heater', category: 'Heating & fans',
    items: [['Dimplex', 'DXF20'], ['Honeywell', 'HZ-510'], ['Belling', 'Model 20'], ['Sunbeam', 'HE3000']],
    faults: [
      { fault: 'Blows cold air only.', fixed: 'Thermal cutout open. Replaced cutout and cleaned dust from the element.', parts: 'Thermal cutout' },
      { fault: 'Rattles.', fixed: 'Fan blade loose on the shaft. Tightened the set screw.' },
    ],
  },
  {
    product: 'Electric blanket', category: 'Heating & fans',
    items: [['Dreamland', 'Intelliheat 16'], ['Sunbeam', 'BL5141']],
    faults: [
      { fault: 'Controller light on, no heat.', fixed: 'Connector pins at the blanket end corroded. Cleaned.', not: 'Heating wire broken inside. Advised not to use.' },
    ],
  },
  {
    product: 'Clock', category: 'Clocks & watches',
    items: [['Smiths', 'Sectric 451'], ['Metamec', '1074'], ['Westclox', 'Big Ben'], ['Junghans', 'W738']],
    faults: [
      { fault: 'Stops after a few hours.', fixed: 'Dried oil in the movement. Cleaned and oiled.', partly: 'Runs a day now; needs a full strip-down.' },
      { fault: 'Alarm doesn’t ring.', fixed: 'Hammer bent away from bell. Re-bent and adjusted.' },
    ],
  },
  {
    product: 'Laptop', category: 'Computers & phones',
    items: [['Apple', 'A1278'], ['Apple', 'A1466'], ['Dell', 'Latitude E6410']],
    faults: [
      { fault: 'Won’t charge.', fixed: 'Charging port full of lint. Cleaned; charges again.', not: 'Charging circuit failed. Referred to a specialist.' },
      { fault: 'Very slow.', fixed: 'Replaced the hard drive with an SSD the owner brought. Reinstalled the OS.' },
    ],
  },
  {
    product: 'Telephone', category: 'Computers & phones',
    items: [['GPO', 'Model 746'], ['BT', 'Converse 2200'], ['GPO', 'Trimphone']],
    faults: [
      { fault: 'Doesn’t ring.', fixed: 'Ringer wire off a terminal. Reconnected.' },
      { fault: 'Dial doesn’t return.', fixed: 'Governor in the dial gummed. Cleaned and lubricated.' },
    ],
  },
  {
    product: 'Hair dryer', category: 'Personal care',
    items: [['BaByliss', '5737U'], ['Philips', 'HP8230'], ['Braun', 'HD 580'], ['Remington', 'D3080']],
    faults: [
      { fault: 'Cuts out after a minute.', fixed: 'Intake grille clogged with hair. Cleaned; thermal cutout no longer trips.' },
      { fault: 'No heat on any setting.', fixed: 'Heater element wire snapped at the terminal. Re-terminated.', not: 'Element burnt through in the middle.' },
    ],
  },
  {
    product: 'Shaver', category: 'Personal care',
    items: [['Braun', 'Series 3 340'], ['Philips', 'HQ6900'], ['Remington', 'R-500']],
    faults: [
      { fault: 'Battery doesn’t hold charge.', fixed: 'Replaced NiMH cell with a tagged replacement.', parts: 'NiMH AA tagged cell' },
    ],
  },
  {
    product: 'Model locomotive', category: 'Toys & games',
    items: [['Hornby', 'R2711'], ['Hornby', 'R.350'], ['Scalextric', 'C.278']],
    faults: [
      { fault: 'Runs jerkily.', fixed: 'Pickups and wheels dirty. Cleaned; replaced worn motor brushes.' },
    ],
  },
  {
    product: 'Bicycle hub', category: 'Bicycles',
    items: [['Sturmey-Archer', 'AW'], ['Shimano', 'Nexus SG-3C41']],
    faults: [
      { fault: 'Slips in second gear.', fixed: 'Indicator chain out of adjustment. Adjusted at the toggle.', partly: 'Adjusted; slips occasionally under load. Pawls likely worn.' },
    ],
  },
];

const FIXERS: [string, number][] = VOLUNTEERS.map((v) => [v.name, 1]);

function generate(count: number): RepairLog[] {
  const r: Rng = mulberry32(20230114);
  const sessions: string[] = [];
  for (let y = 2023; y <= 2026; y++)
    for (let m = 1; m <= 12; m++) {
      if (y === 2026 && m > 10) break;
      sessions.push(secondSaturday(y, m));
    }
  const out: RepairLog[] = [];
  for (let i = 0; i < count; i++) {
    const spec = pick(r, ITEMS);
    const [brand, model] = pick(r, spec.items);
    const f = pick(r, spec.faults);
    const options: [Outcome, number][] = [['fixed', 66]];
    if (f.partly) options.push(['partly', 14]);
    if (f.not) options.push(['not', 20]);
    const outcome = weighted(r, options);
    const notes = outcome === 'fixed' ? f.fixed : outcome === 'partly' ? f.partly! : f.not!;
    out.push({
      id: `log-${String(i + 1).padStart(3, '0')}`,
      date: sessions[Math.floor((i / count) * sessions.length)],
      item: `${brand} ${model} ${spec.product.toLowerCase()}`,
      brand,
      model,
      product: spec.product,
      category: spec.category,
      fault: f.fault,
      outcome,
      fixer: weighted(r, FIXERS),
      notes,
      minutes: int(r, 2, 14) * 5,
      parts: outcome === 'fixed' ? f.parts : undefined,
    });
  }
  return out;
}

export const LOGS: RepairLog[] = [...CURATED, ...generate(340 - CURATED.length)].sort((a, b) =>
  b.date.localeCompare(a.date),
);
