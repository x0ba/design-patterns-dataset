/*
 * Studiotrace seed data: "Crumb & Kettle Identity" (Brand Systems).
 *
 * The app opens at the moment this snapshot describes: Tuesday, November 17, 2026, 4:40 p.m. Pacific.
 * Hex values are the student's own. Palette names, mockup copy, and prompts are working text for this project.
 */
(function (root) {
  'use strict';

  var TYPES = [
    { key: 'menu', code: 'MB', label: 'Menu board', dims: '24 × 36 in poster mounted at the counter', w: 600, h: 800, wm: 58 },
    { key: 'bag', code: 'PB', label: 'Pastry bag', dims: '6 × 8 in paper bag, three palette colors at most', w: 600, h: 700, wm: 84 },
    { key: 'decal', code: 'WD', label: 'Window decal', dims: 'Vinyl, up to 48 in wide, applied inside the glass', w: 800, h: 450, wm: 80 },
    { key: 'loyalty', code: 'LC', label: 'Loyalty card', dims: '3.5 × 2 in card, front only', w: 700, h: 400, wm: 44 },
    { key: 'ig', code: 'IG', label: 'Instagram post', dims: '1080 × 1080 px feed post', w: 800, h: 800, wm: 64 }
  ];

  var VARIATIONS = [
    { n: 1, name: 'Tight', k: 0.8, note: '8 px grid and 12 px section gaps' },
    { n: 2, name: 'Standard', k: 1, note: '12 px grid and 18 px section gaps' },
    { n: 3, name: 'Open', k: 1.3, note: '16 px grid and 28 px section gaps' }
  ];

  var PALETTE = [
    { name: 'Roast', hex: '#3B2A20' },
    { name: 'Cream', hex: '#F4E9D8' },
    { name: 'Saffron', hex: '#C9A227' },
    { name: 'Sage', hex: '#7A8B6F' },
    { name: 'White', hex: '#FFFFFF' }
  ];

  // The five color slots every mockup uses. "default" is the palette color the AI applies to that slot.
  var SLOTS = [
    { key: 'bg', label: 'Background', default: '#F4E9D8' },
    { key: 'ink', label: 'Ink', default: '#3B2A20' },
    { key: 'accent', label: 'Accent', default: '#C9A227' },
    { key: 'band', label: 'Band', default: '#7A8B6F' },
    { key: 'onBand', label: 'Text on band', default: '#FFFFFF' }
  ];

  var COPY = {
    menu: {
      sub: 'Bread and coffee, baked and brewed on Alder Street',
      groups: [
        { title: 'Bread', items: [['Country sourdough', '$9.00'], ['Brown butter cardamom bun', '$4.25'], ['Rye and caraway boule', '$8.50']] },
        { title: 'Coffee', items: [['Kettle pour-over, single origin', '$4.00'], ['Oat flat white', '$4.75'], ['Hibiscus cold brew', '$4.50']] }
      ],
      foot: "Ask for the day's bake"
    },
    bag: { kicker: 'Baked every morning', band: 'Alder Street · Walk in or pick up' },
    decal: { sub: 'Bread and coffee, Alder Street', hours: 'Open Tuesday to Sunday', time: '7 a.m. to 2 p.m.', band: 'Walk in, or order ahead' },
    loyalty: { no: 'No. 0214', copy: 'Collect 8 stamps, take home a free loaf.', member: 'Member since 2026' },
    ig: { kicker: 'This Saturday', head: 'Sourdough Saturdays', sub: 'Pre-order by Friday noon. Pick up from 8 a.m.' }
  };

  var COPY_LINE = {
    menu: 'Bread: country sourdough $9.00, brown butter cardamom bun $4.25, rye and caraway boule $8.50. Coffee: kettle pour-over $4.00, oat flat white $4.75, hibiscus cold brew $4.50. Footer: "Ask for the day\'s bake."',
    bag: 'Kicker "Baked every morning". Band "Alder Street · Walk in or pick up".',
    decal: 'Hours "Open Tuesday to Sunday, 7 a.m. to 2 p.m." Band "Walk in, or order ahead".',
    loyalty: 'Front copy "Collect 8 stamps, take home a free loaf." Card number "No. 0214". Band "Member since 2026".',
    ig: 'Kicker "This Saturday". Headline "Sourdough Saturdays". Sub "Pre-order by Friday noon. Pick up from 8 a.m.".'
  };

  var SOURCES = ['wordmark-v3.svg', 'palette-v2', 'type-pairing-v1', 'brief p.2'];

  function promptFor(typeKey, n) {
    var t = TYPES.filter(function (x) { return x.key === typeKey; })[0];
    var v = VARIATIONS[n - 1];
    return 'Apply the Crumb & Kettle identity to a ' + t.label.toLowerCase() + ' (' + t.dims + '). ' +
      'Use wordmark-v3.svg as drawn. Do not redraw, retype, or substitute any letter, including the ampersand. ' +
      'Use only these colors: Roast #3B2A20, Cream #F4E9D8, Saffron #C9A227, Sage #7A8B6F, White #FFFFFF. ' +
      'Body type: Source Serif 4. ' +
      'Spacing variation ' + n + ' (' + v.name.toLowerCase() + '): ' + v.note + '. ' +
      'Copy: ' + COPY_LINE[typeKey] + ' Keep the layout and copy identical across the three variations.';
  }

  var DEFAULT_DESIGN = { bg: '#F4E9D8', ink: '#3B2A20', accent: '#C9A227', band: '#7A8B6F', onBand: '#FFFFFF' };
  var TERRACOTTA = '#B8603F'; // Not in palette-v2. Introduced by the model in two outputs.

  function design(over) {
    var d = {};
    Object.keys(DEFAULT_DESIGN).forEach(function (k) { d[k] = DEFAULT_DESIGN[k]; });
    Object.keys(over || {}).forEach(function (k) { d[k] = over[k]; });
    return d;
  }

  function out(typeKey, n, run, at, seconds, o) {
    var code = TYPES.filter(function (x) { return x.key === typeKey; })[0].code;
    var base = {
      id: code + '-' + n,
      type: typeKey,
      n: n,
      run: run,
      status: 'delivered',
      at: at,
      seconds: seconds,
      design: design(),
      ampersand: 'student',
      sources: SOURCES.slice(),
      prompt: promptFor(typeKey, n),
      decision: null,
      decidedAt: null,
      discardNote: null
    };
    return Object.assign(base, o || {});
  }

  function pending(typeKey, n, run) {
    var o = out(typeKey, n, run, null, null, { status: 'pending', design: null });
    return o;
  }

  var OUTPUTS = [
    out('menu', 1, 'RUN-A', '2026-11-11T13:52:00-08:00', 74, { decision: 'kept', decidedAt: '2026-11-15T16:10:00-08:00' }),
    out('menu', 2, 'RUN-A', '2026-11-11T13:53:00-08:00', 68, { decision: 'discarded', decidedAt: '2026-11-16T09:52:00-08:00', discardNote: 'Standard spacing crowds the coffee prices. Variation 1 already covers the tight look.' }),
    out('menu', 3, 'RUN-A', '2026-11-11T13:55:00-08:00', 81, { design: design({ band: TERRACOTTA }) }),

    out('bag', 1, 'RUN-B', '2026-11-12T10:15:00-08:00', 71, { decision: 'kept', decidedAt: '2026-11-16T09:40:00-08:00' }),
    out('bag', 2, 'RUN-B', '2026-11-12T10:17:00-08:00', 77, { ampersand: 'glyph' }),
    out('bag', 3, 'RUN-B', '2026-11-12T10:19:00-08:00', 69),

    out('decal', 1, 'RUN-C', '2026-11-13T14:59:00-08:00', 88, { ampersand: 'glyph' }),
    out('decal', 2, 'RUN-C', '2026-11-13T15:01:00-08:00', 79, { design: design({ accent: TERRACOTTA }) }),
    out('decal', 3, 'RUN-C', '2026-11-13T15:04:00-08:00', 83),

    out('loyalty', 1, 'RUN-D', '2026-11-14T11:28:00-08:00', 62),
    out('loyalty', 2, 'RUN-D', '2026-11-14T11:30:00-08:00', 66),
    pending('loyalty', 3, 'RUN-E'),

    pending('ig', 1, 'RUN-E'),
    pending('ig', 2, 'RUN-E'),
    pending('ig', 3, 'RUN-E')
  ];

  var RUNS = [
    { id: 'RUN-A', at: '2026-11-11T13:48:00-08:00', types: 'Menu board, variations 1–3', requested: 3, delivered: 3, status: 'Complete', note: '' },
    { id: 'RUN-B', at: '2026-11-12T10:14:00-08:00', types: 'Pastry bag, variations 1–3', requested: 3, delivered: 3, status: 'Complete', note: '' },
    { id: 'RUN-C', at: '2026-11-13T14:58:00-08:00', types: 'Window decal, variations 1–3', requested: 3, delivered: 3, status: 'Complete', note: '' },
    { id: 'RUN-D', at: '2026-11-14T11:26:00-08:00', types: 'Loyalty card, variations 1–3', requested: 3, delivered: 2, status: 'Partial', note: 'Loyalty card variation 3 timed out after 300 s and was not retried in this run.' },
    { id: 'RUN-E', at: '2026-11-16T17:18:00-08:00', types: 'Loyalty card variation 3, Instagram post variations 1–3', requested: 4, delivered: 0, status: 'Queued', note: 'Expected Nov 18.' }
  ];

  var TRAIL = [
    { at: '2026-10-28T16:05:00-07:00', actor: 'student', text: 'Uploaded wordmark-v3.svg. Letters and ampersand drawn by hand.' },
    { at: '2026-11-03T10:12:00-08:00', actor: 'student', text: 'Saved palette-v2: Roast, Cream, Saffron, Sage, White.' },
    { at: '2026-11-10T09:30:00-08:00', actor: 'student', text: 'Created the task: 5 applications × 3 spacing variations. Set four rules for the model.' },
    { at: '2026-11-11T13:55:00-08:00', actor: 'model', text: 'RUN-A delivered MB-1, MB-2, MB-3 (3 of 3).' },
    { at: '2026-11-12T10:19:00-08:00', actor: 'model', text: 'RUN-B delivered PB-1, PB-2, PB-3 (3 of 3).' },
    { at: '2026-11-13T15:04:00-08:00', actor: 'model', text: 'RUN-C delivered WD-1, WD-2, WD-3 (3 of 3).' },
    { at: '2026-11-14T11:30:00-08:00', actor: 'model', text: 'RUN-D delivered LC-1, LC-2 (2 of 3). LC-3 timed out.' },
    { at: '2026-11-15T16:10:00-08:00', actor: 'student', text: 'Kept MB-1 for submission.' },
    { at: '2026-11-16T09:40:00-08:00', actor: 'student', text: 'Kept PB-1 for submission.' },
    { at: '2026-11-16T09:52:00-08:00', actor: 'student', text: 'Discarded MB-2: standard spacing crowds the coffee prices.' },
    { at: '2026-11-16T17:18:00-08:00', actor: 'model', text: 'RUN-E queued: LC-3 (retry) and IG-1 to IG-3. Expected Nov 18.' }
  ];

  var SEED = {
    now: '2026-11-17T16:40:00-08:00',
    critique: '2026-11-20T09:00:00-08:00',
    model: 'claude-sonnet-5-5',
    student: { name: 'Nayeli Brandt', program: 'Graphic Design AAS, year 2', initials: 'NB' },
    course: { name: 'Brand Systems', instructor: 'Dana Whitfield' },
    project: { name: 'Crumb & Kettle Identity', client: 'Crumb & Kettle' },
    types: TYPES,
    variations: VARIATIONS,
    palette: PALETTE,
    slots: SLOTS,
    copy: COPY,
    outputs: OUTPUTS,
    runs: RUNS,
    trail: TRAIL,

    wordmark: {
      file: 'wordmark-v3.svg',
      version: 'v3',
      drawnOn: '2026-10-28',
      format: 'Vector (SVG), hand-lettered in Roast',
      note: 'Crumb and Kettle are hand-lettered. The ampersand is hand-drawn too.'
    },

    typePairing: {
      display: 'Hand lettering, for the wordmark and section heads',
      text: 'Source Serif 4, for body copy and prices',
      file: 'type-pairing-v1'
    },

    brief: {
      file: 'crumb-and-kettle-brief.pdf',
      pages: 2,
      received: 'Oct 20, 2026',
      about: 'Crumb & Kettle is a counter-service bakery and coffee bar on Alder Street. It bakes sourdough and cardamom buns each morning and pours from a kettle at the counter. The owners want the identity to feel handmade and unfussy, and to read the same on paper, in a window, and on a phone.',
      goal: 'One identity that reads as the same shop on a menu board, a pastry bag, a front window, a loyalty card, and Instagram.',
      deliverables: [
        'A wordmark and a palette, both drawn and chosen by the student',
        'Five applications, each in three spacing variations (15 outputs)',
        'A one-page note on spacing and color use'
      ],
      notes: [
        'Menu board body copy must read at arm’s length.',
        'The pastry bag prints in three palette colors at most.',
        'The window decal is applied from the inside, so text must read mirror-free from the street.'
      ],
      dates: [
        { label: 'Student critique', at: 'Fri, Nov 20 · 9:00 a.m.' },
        { label: 'Client review', at: 'Wed, Dec 2' }
      ]
    },

    policy: {
      course: 'Brand Systems',
      instructor: 'Dana Whitfield',
      rules: [
        { tag: 'Allowed', text: 'Layout, spacing, color application within the approved palette, and placement of approved assets.' },
        { tag: 'Not allowed', text: 'Drawing, redrawing, retyping, or substituting a core mark, including the wordmark and its ampersand.' },
        { tag: 'Required', text: 'Disclose every AI-touched element in the contribution record as student-made, AI-made, or AI-made and student-edited.' },
        { tag: 'Required', text: 'Log each generation with its prompt, model version, time, and source assets.' }
      ]
    },

    rules: [
      { id: 'wordmark', text: 'Use wordmark-v3.svg as drawn. Do not redraw, retype, or substitute any letter, including the ampersand.' },
      { id: 'palette', text: 'Use only the five palette-v2 colors.' },
      { id: 'type', text: 'Set body type in Source Serif 4 only.' },
      { id: 'spacing', text: 'Change spacing between variations. Keep layout and copy the same across variations.' }
    ],

    revisions: [],
    exportedAt: null
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEED;
  }
  root.STUDIOTRACE_SEED = SEED;
})(typeof window !== 'undefined' ? window : globalThis);
