// Transcribed page content for documents whose scans have been indexed page by page.
// Each page is a list of blocks rendered as a "scanned" sheet.

export type FigKind = 'exploded' | 'wiring' | 'brush' | 'brushWear' | 'governor' | 'contacts' | 'motor' | 'gearbox' | 'turntable' | 'cover';

export type Block =
  | { k: 'h'; t: string }
  | { k: 'h2'; t: string }
  | { k: 'p'; t: string }
  | { k: 'ol'; items: string[] }
  | { k: 'ul'; items: string[] }
  | { k: 'table'; head: string[]; rows: string[][]; widths?: number[] }
  | { k: 'fig'; fig: FigKind; caption: string; h?: number }
  | { k: 'warn'; t: string }
  | { k: 'hand'; t: string; at?: 'right' | 'left' }
  | { k: 'cover'; brand: string; title: string; sub: string; models: string; form: string };

export interface Page {
  n: number;
  title: string;
  blocks: Block[];
}

const HDR = 'MIXMASTER® 2346 · 2348 SERVICE MANUAL';

export const MANUAL_HEADER: Record<string, string> = {
  'sb-mm-2346-sm': HDR,
  'sb-mm-2340-pl': 'MIXMASTER® 2340 SERIES — REPLACEMENT PARTS',
  'sb-mm-2346-um': 'MIXMASTER® MIXER — USE AND CARE',
};

const MIXMASTER_SM: Page[] = [
  {
    n: 1,
    title: 'Cover',
    blocks: [
      { k: 'cover', brand: 'SUNBEAM', title: 'MIXMASTER® Mixer', sub: 'SERVICE MANUAL', models: 'Models 2346 · 2348', form: 'Form No. SM-2346-94 · Printed in U.S.A. · 1994' },
      { k: 'p', t: 'For use by Authorized Sunbeam Service Stations only. This manual covers the 12-speed MIXMASTER mixer with governor speed control, models 2346 and 2348.' },
    ],
  },
  {
    n: 2,
    title: 'Contents & safety',
    blocks: [
      { k: 'h', t: 'Contents' },
      {
        k: 'table',
        head: ['Section', 'Page'],
        widths: [80, 20],
        rows: [
          ['Specifications', '3'],
          ['Model differences 2346 / 2348', '4'],
          ['Disassembly', '5 – 8'],
          ['Troubleshooting chart', '9 – 10'],
          ['Wiring diagram', '11'],
          ['Motor, armature and commutator', '12 – 13'],
          ['Carbon brushes', '14 – 15'],
          ['Speed control (governor)', '16 – 17'],
          ['Gearbox and lubrication', '18'],
          ['Turntable and bowl', '19'],
          ['Electrical tests', '20'],
          ['Replacement parts', '21 – 22'],
        ],
      },
      { k: 'h2', t: 'Safety' },
      { k: 'warn', t: 'Always unplug the mixer before removing any cover. Capacitor C1 may hold a small charge — short its leads with an insulated screwdriver before handling.' },
      { k: 'p', t: 'After any repair, perform a dielectric strength (hi-pot) or insulation resistance test between the line cord prongs and all exposed metal parts.' },
    ],
  },
  {
    n: 3,
    title: 'Specifications',
    blocks: [
      { k: 'h', t: 'Specifications' },
      {
        k: 'table',
        head: ['Item', 'Value'],
        rows: [
          ['Rated voltage', '120 V AC, 60 Hz'],
          ['Rated power', '235 watts'],
          ['Motor type', 'Universal (series wound), 2 carbon brushes'],
          ['Speed control', 'Centrifugal governor, 12 settings'],
          ['No-load speed, setting 12', '1,050 – 1,150 beater rpm'],
          ['No-load speed, setting 1', '320 – 380 beater rpm'],
          ['Thermal protector', 'Auto-reset, opens at 135 °C'],
          ['Line cord', '2-wire, 18 AWG SPT-2, 6 ft'],
          ['Net weight', '2346: 9.2 lb · 2348: 9.8 lb'],
        ],
      },
      { k: 'p', t: 'Speeds are measured at the beater sockets with beaters removed. A mixer running more than 10% below these figures at setting 12 should be checked for worn brushes (page 14) or a dirty commutator (page 13).' },
    ],
  },
  {
    n: 4,
    title: '2346 vs 2348 differences',
    blocks: [
      { k: 'h', t: 'Model Differences' },
      { k: 'p', t: 'Models 2346 and 2348 share the same motor, carbon brushes, governor speed control, switch, gearbox and wiring. All electrical service procedures in this manual apply to both models.' },
      {
        k: 'table',
        head: ['', '2346', '2348'],
        rows: [
          ['Motor & brushes', 'Same', 'Same'],
          ['Governor / speed control', 'Same', 'Same'],
          ['Gearbox', 'Same', 'Same'],
          ['Colour', 'White', 'Almond'],
          ['Large bowl', '4 qt glass', '4 qt glass'],
          ['Small bowl', '1½ qt glass', '1½ qt glass'],
          ['Dough hooks', '—', 'Included'],
          ['Juice extractor', '—', 'Included (fits attachment hub)'],
          ['Attachment hub cover', 'Plain', 'With latch'],
        ],
      },
      { k: 'hand', t: 'same motor — don’t worry which one it is!  R.O.', at: 'right' },
      { k: 'p', t: 'The model number is moulded on the underside of the base. On early production it may be printed on a paper label which can wear away.' },
    ],
  },
  {
    n: 5,
    title: 'Exploded view',
    blocks: [
      { k: 'h', t: 'Disassembly — Exploded View' },
      { k: 'fig', fig: 'exploded', caption: 'Fig. 1 — Main assemblies. Numbers refer to the parts list on page 21.', h: 420 },
    ],
  },
  {
    n: 6,
    title: 'Beaters, bowl & base',
    blocks: [
      { k: 'h', t: 'Disassembly — Beaters, Bowl and Base' },
      { k: 'ol', items: [
        'Unplug the mixer. Press the beater ejector and remove both beaters.',
        'Lift the mixer head off the base by pressing the head release button and lifting straight up.',
        'Remove the bowl and the turntable (lift off; it is retained only by its centre post).',
        'Turn the base over. Remove the four rubber feet to expose the base screws if the base is to be dismantled.',
      ]},
      { k: 'p', t: 'Note: Brush and governor service does not require removal of the base. Work on the mixer head only.' },
    ],
  },
  {
    n: 7,
    title: 'Top cover',
    blocks: [
      { k: 'h', t: 'Disassembly — Top Cover' },
      { k: 'ol', items: [
        'Pull the speed control dial straight off its shaft. Note the flat on the shaft for reassembly.',
        'Remove the two screws under the dial and the one screw at the rear of the handle.',
        'Lift the top cover off the motor housing. Take care not to strain the leads to the switch.',
      ]},
      { k: 'p', t: 'With the cover removed the governor contact plate is visible at the rear of the motor (see page 16). The carbon brush caps are accessible from outside without removing the top cover (see page 14).' },
    ],
  },
  {
    n: 8,
    title: 'Motor housing',
    blocks: [
      { k: 'h', t: 'Disassembly — Motor Housing' },
      { k: 'ol', items: [
        'Remove both carbon brushes (page 14) before removing the armature, to avoid chipping them.',
        'Remove the four long screws through the gear case and lift the gear case away.',
        'Withdraw the armature from the field. Keep the thrust washers in order.',
      ]},
      { k: 'fig', fig: 'motor', caption: 'Fig. 2 — Motor housing, side view', h: 240 },
    ],
  },
  {
    n: 9,
    title: 'Troubleshooting chart',
    blocks: [
      { k: 'h', t: 'Troubleshooting Chart' },
      {
        k: 'table',
        head: ['Symptom', 'Possible cause', 'Check / remedy', 'Page'],
        widths: [24, 30, 36, 10],
        rows: [
          ['Motor will not run, no hum', 'No supply; open thermal protector; faulty switch; broken cord', 'Continuity test cord and switch', '20'],
          ['Motor hums but will not run', 'Worn or sticking carbon brushes', 'Brush length less than ¼ in — replace both', '14'],
          ['', 'Governor contacts open or pitted', 'Inspect and clean contacts', '17'],
          ['', 'Gears or beaters jammed', 'Turn beater sockets by hand', '18'],
          ['', 'Open armature coil', 'Bar-to-bar resistance test', '20'],
          ['Runs on high settings only', 'Governor contacts dirty or out of adjustment', 'Clean, then adjust contact gap', '17'],
          ['Speed surges up and down', 'Governor spring weak; contacts sticking', 'Adjust; replace contact plate', '17'],
        ],
      },
      { k: 'hand', t: 'hum + no spin = brushes first (easy), then governor', at: 'left' },
    ],
  },
  {
    n: 10,
    title: 'Troubleshooting (cont.)',
    blocks: [
      { k: 'h', t: 'Troubleshooting Chart (continued)' },
      {
        k: 'table',
        head: ['Symptom', 'Possible cause', 'Check / remedy', 'Page'],
        widths: [24, 30, 36, 10],
        rows: [
          ['Excessive sparking at vents', 'Worn brushes; dirty or scored commutator', 'Replace brushes; clean commutator', '13 – 14'],
          ['Motor runs hot, smells', 'Shorted field coil; tight gears', 'Resistance test; check grease', '18, 20'],
          ['Beaters run, bowl does not turn', 'Turntable dirty or bowl not seated', 'Clean turntable post', '19'],
          ['Radio / TV interference', 'Capacitor C1 open', 'Replace C1', '11'],
          ['Noisy gears', 'Lack of grease; worn worm gear', 'Re-grease or replace', '18'],
        ],
      },
    ],
  },
  {
    n: 11,
    title: 'Wiring diagram',
    blocks: [
      { k: 'h', t: 'Wiring Diagram' },
      { k: 'fig', fig: 'wiring', caption: 'Fig. 3 — Schematic, models 2346 and 2348. Governor contacts G are closed at rest and open at the selected speed; resistor R1 keeps the motor turning while they are open.', h: 380 },
      { k: 'p', t: 'C1 0.1 µF 250 V AC suppression capacitor. R1 1,500 Ω 5 W wire-wound. TP thermal protector, auto-reset.' },
    ],
  },
  {
    n: 12,
    title: 'Motor removal',
    blocks: [
      { k: 'h', t: 'Motor — Armature Removal' },
      { k: 'p', t: 'Remove the carbon brushes first (page 14). Remove the governor contact plate (page 17) and the gear case. The armature can then be withdrawn from the front of the housing.' },
      { k: 'p', t: 'Inspect the armature shaft bearings for wear. Bearings are oil-impregnated bronze; add two drops of SAE 20 oil to each felt wick on reassembly.' },
    ],
  },
  {
    n: 13,
    title: 'Armature & commutator',
    blocks: [
      { k: 'h', t: 'Armature and Commutator' },
      { k: 'p', t: 'A dark, evenly polished commutator is normal. If the commutator is blackened, grooved or has burnt bars, clean it with No. 00 sandpaper (never emery cloth) while rotating the armature by hand. Blow out carbon dust.' },
      { k: 'p', t: 'Burnt bars in pairs usually indicate an open armature coil — check bar-to-bar resistance (page 20).' },
      { k: 'warn', t: 'Do not use emery cloth on the commutator. Metallic particles will short the bars.' },
    ],
  },
  {
    n: 14,
    title: 'Carbon brushes — replacement',
    blocks: [
      { k: 'h', t: 'Carbon Brushes — Inspection and Replacement' },
      { k: 'p', t: 'Worn carbon brushes are the most common cause of a motor that hums but will not run. Brushes should be inspected whenever the mixer runs slowly, sparks, or fails to start.' },
      { k: 'fig', fig: 'brush', caption: 'Fig. 4 — Brush cap (A), spring (B) and carbon brush (C). One each side of the motor housing.', h: 220 },
      { k: 'ol', items: [
        'Unplug the mixer. Remove the beaters.',
        'The two brush caps (A) are on the left and right sides of the motor housing, behind the vents. Unscrew each cap with a wide flat screwdriver.',
        'Withdraw spring (B) and carbon brush (C) together. Note which way round the curved face of the brush sits — it must go back the same way.',
        'Measure the brush length. Replace BOTH brushes if either is shorter than ¼ in (6 mm). See page 15.',
        'Check that the brush slides freely in its holder. A sticking brush causes the same symptoms as a worn one.',
        'Refit, screw caps down finger-tight plus ¼ turn. Run at setting 1 for two minutes to bed in new brushes.',
      ]},
      { k: 'hand', t: 'spare pairs in parts drawer B  — R.O. 2025', at: 'right' },
    ],
  },
  {
    n: 15,
    title: 'Carbon brushes — specification',
    blocks: [
      { k: 'h', t: 'Carbon Brushes — Specification' },
      {
        k: 'table',
        head: ['', 'Value'],
        rows: [
          ['Cross section', '¼ in × ¼ in (6.35 mm square)'],
          ['New length', '½ in (12.7 mm)'],
          ['Replace when shorter than', '¼ in (6 mm)'],
          ['Spring free length', '⅝ in'],
          ['Part number (pair with springs)', '2340-118'],
        ],
      },
      { k: 'fig', fig: 'brushWear', caption: 'Fig. 5 — Brush wear limit', h: 160 },
      { k: 'p', t: 'Always replace brushes in pairs. If the commutator is grooved, clean it (page 13) before fitting new brushes or they will wear rapidly.' },
    ],
  },
  {
    n: 16,
    title: 'Speed control — how it works',
    blocks: [
      { k: 'h', t: 'Speed Control (Governor) — Operation' },
      { k: 'p', t: 'Speed is controlled by a centrifugal governor on the rear end of the armature shaft. As the motor speeds up, the governor flyweights move outward and push the plunger against the movable contact arm, opening governor contacts G.' },
      { k: 'p', t: 'When the contacts open, current flows through resistor R1 only, and the motor slows. The contacts close again and the cycle repeats many times per second, holding the speed steady. Turning the speed dial moves the stationary contact via a cam, changing the speed at which the contacts open.' },
      { k: 'fig', fig: 'governor', caption: 'Fig. 6 — Governor assembly: flyweights (D), plunger (E), contact arm (F), contacts (G), speed cam (H)', h: 240 },
      { k: 'p', t: 'If the contacts fail to close, the motor receives only the reduced current through R1. It will hum and may not start, particularly on low settings.' },
    ],
  },
  {
    n: 17,
    title: 'Speed control — contacts & adjustment',
    blocks: [
      { k: 'h', t: 'Speed Control — Contacts and Adjustment' },
      { k: 'h2', t: 'Cleaning the contacts' },
      { k: 'ol', items: [
        'Remove the top cover (page 7).',
        'Inspect governor contacts G. Light pitting may be dressed with a fine contact file or burnishing tool. Do not use sandpaper.',
        'Badly pitted or burnt contacts: replace the governor contact plate, part no. 2340-205.',
      ]},
      { k: 'fig', fig: 'contacts', caption: 'Fig. 7 — Contact gap adjustment', h: 150 },
      { k: 'h2', t: 'Adjusting' },
      { k: 'ol', items: [
        'Set the dial to 12. Contacts should just touch with the motor stopped.',
        'Loosen adjusting screw J and move the stationary contact until the no-load speed at setting 12 is within specification (page 3).',
        'Check that the mixer starts and runs smoothly at setting 1.',
      ]},
    ],
  },
  {
    n: 18,
    title: 'Gearbox & grease',
    blocks: [
      { k: 'h', t: 'Gearbox and Lubrication' },
      { k: 'fig', fig: 'gearbox', caption: 'Fig. 8 — Worm and beater gears', h: 200 },
      { k: 'p', t: 'Remove all old grease. Repack with 1 oz of Sunbeam gear lubricant, part no. 2340-301, or an equivalent food-safe NLGI 0 grease. Do not overfill — excess grease will reach the commutator.' },
      { k: 'p', t: 'If the beater sockets cannot be turned by hand with the motor brushes removed, the gears are jammed or the grease has set solid.' },
    ],
  },
  {
    n: 19,
    title: 'Turntable & bowl',
    blocks: [
      { k: 'h', t: 'Turntable and Bowl' },
      { k: 'fig', fig: 'turntable', caption: 'Fig. 9 — Turntable on base post', h: 180 },
      { k: 'p', t: 'The bowl is turned by the beaters, not by a motor. If the bowl does not turn, check that the turntable rotates freely on its post and that the bowl is seated on the turntable. Clean the post and apply a trace of food-safe grease.' },
      { k: 'p', t: 'Use the small-bowl position (shift lever forward) with the 1½ qt bowl.' },
    ],
  },
  {
    n: 20,
    title: 'Electrical tests',
    blocks: [
      { k: 'h', t: 'Electrical Tests' },
      { k: 'p', t: 'All readings taken with the mixer unplugged, speed dial at 12, at room temperature.' },
      {
        k: 'table',
        head: ['Test', 'Between', 'Normal reading'],
        rows: [
          ['Line cord + switch', 'Plug prongs, switch ON, brushes in', '18 – 24 Ω'],
          ['Field coil (each half)', 'Field leads', '4.5 – 6 Ω'],
          ['Armature, bar to bar', 'Adjacent commutator bars', '1.0 – 1.4 Ω, all equal'],
          ['Governor resistor R1', 'R1 terminals', '1,400 – 1,600 Ω'],
          ['Governor contacts', 'Contact terminals, dial at 12', 'Less than 0.5 Ω'],
          ['Thermal protector', 'TP leads', 'Continuity'],
          ['Insulation', 'Prongs to metal parts', 'More than 2 MΩ'],
        ],
      },
      { k: 'p', t: 'A reading of about 1,500 Ω across the plug with the switch on and dial at 12 means the governor contacts are open — see page 17.' },
    ],
  },
  {
    n: 21,
    title: 'Parts list',
    blocks: [
      { k: 'h', t: 'Replacement Parts' },
      {
        k: 'table',
        head: ['Ref.', 'Part no.', 'Description', 'Qty'],
        widths: [10, 20, 58, 12],
        rows: [
          ['1', '2340-010', 'Top cover, white (2346)', '1'],
          ['1', '2340-011', 'Top cover, almond (2348)', '1'],
          ['2', '2340-022', 'Speed control dial', '1'],
          ['3', '2340-040', 'Switch assembly', '1'],
          ['4', '2340-101', 'Armature assembly', '1'],
          ['5', '2340-110', 'Field assembly', '1'],
          ['6', '2340-118', 'Carbon brush & spring, pair', '1'],
          ['7', '2340-120', 'Brush cap', '2'],
          ['8', '2340-201', 'Governor assembly', '1'],
          ['9', '2340-205', 'Governor contact plate with R1', '1'],
          ['10', '2340-230', 'Capacitor C1, 0.1 µF', '1'],
        ],
      },
    ],
  },
  {
    n: 22,
    title: 'Parts list (cont.) & notes',
    blocks: [
      { k: 'h', t: 'Replacement Parts (continued)' },
      {
        k: 'table',
        head: ['Ref.', 'Part no.', 'Description', 'Qty'],
        widths: [10, 20, 58, 12],
        rows: [
          ['11', '2340-250', 'Thermal protector', '1'],
          ['12', '2340-260', 'Line cord with strain relief', '1'],
          ['13', '2340-301', 'Gear lubricant, 1 oz', '1'],
          ['14', '2340-310', 'Worm gear', '1'],
          ['15', '2340-320', 'Beater gear', '2'],
          ['16', '2340-400', 'Turntable', '1'],
          ['17', '2340-450', 'Juice extractor (2348 only)', '1'],
        ],
      },
      { k: 'h2', t: 'Service notes' },
      { k: 'p', t: 'Return the mixer to the customer with brushes bedded in and all twelve speeds checked. Record the service date on the label inside the base.' },
      { k: 'hand', t: '2340-118 still listed by appliance spares shops (2025)', at: 'left' },
    ],
  },
];

const PARTS_LIST: Page[] = [
  {
    n: 1,
    title: 'Housing & controls',
    blocks: [
      { k: 'h', t: 'Mixmaster 2340 Series — Housing and Controls' },
      { k: 'p', t: 'Applies to models 2341, 2344, 2346 and 2348 unless noted.' },
      { k: 'table', head: ['Part no.', 'Description', 'Models'], rows: [
        ['2340-010', 'Top cover, white', '2341, 2346'],
        ['2340-011', 'Top cover, almond', '2344, 2348'],
        ['2340-022', 'Speed control dial', 'All'],
        ['2340-040', 'Switch assembly', 'All'],
        ['2340-060', 'Head release button & spring', 'All'],
        ['2340-070', 'Beater ejector', 'All'],
      ]},
    ],
  },
  {
    n: 2,
    title: 'Motor, brushes, governor',
    blocks: [
      { k: 'h', t: 'Motor, Brushes and Governor' },
      { k: 'table', head: ['Part no.', 'Description', 'Models'], rows: [
        ['2340-101', 'Armature assembly', 'All'],
        ['2340-110', 'Field assembly', 'All'],
        ['2340-118', 'Carbon brush & spring, pair', 'All'],
        ['2340-120', 'Brush cap', 'All'],
        ['2340-201', 'Governor assembly', 'All'],
        ['2340-205', 'Governor contact plate with resistor', 'All'],
        ['2340-230', 'Suppression capacitor', 'All'],
        ['2340-250', 'Thermal protector', 'All'],
      ]},
      { k: 'hand', t: 'brushes same for all four', at: 'right' },
    ],
  },
  {
    n: 4,
    title: 'Attachments',
    blocks: [
      { k: 'h', t: 'Bowls and Attachments' },
      { k: 'table', head: ['Part no.', 'Description', 'Models'], rows: [
        ['2340-400', 'Turntable', 'All'],
        ['2340-410', 'Large bowl, 4 qt glass', 'All'],
        ['2340-411', 'Small bowl, 1½ qt glass', 'All'],
        ['2340-430', 'Beaters, pair', 'All'],
        ['2340-440', 'Dough hooks, pair', '2344, 2348'],
        ['2340-450', 'Juice extractor', '2348'],
      ]},
    ],
  },
];

export const TRANSCRIBED: Record<string, Page[]> = {
  'sb-mm-2346-sm': MIXMASTER_SM,
  'sb-mm-2340-pl': PARTS_LIST,
};

export function blockText(b: Block): string {
  switch (b.k) {
    case 'h':
    case 'h2':
    case 'p':
    case 'warn':
    case 'hand':
      return b.t;
    case 'ol':
    case 'ul':
      return b.items.join(' ');
    case 'table':
      return [b.head.join(' '), ...b.rows.map((r) => r.join(' '))].join(' ');
    case 'fig':
      return b.caption;
    case 'cover':
      return `${b.brand} ${b.title} ${b.sub} ${b.models} ${b.form}`;
  }
}

export const pageText = (p: Page) => p.title + ' ' + p.blocks.map(blockText).join(' ');
