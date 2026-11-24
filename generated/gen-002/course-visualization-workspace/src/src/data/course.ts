// Mock course data for VIZ 120 · Visual Explanation of Data · Fall 2026

export const COURSE = {
  code: 'VIZ 120',
  title: 'Visual Explanation of Data',
  term: 'Fall 2026',
  instructor: 'Prof. Marisol Teague',
  enrolled: 140,
  lecture: 'Tue 11:00am–12:20pm · Peterson Hall 108',
};

export const STUDENT = {
  name: 'Dana Okafor',
  initials: 'DO',
  pid: 'A17734021',
  major: 'Cognitive Science, 2nd year',
  section: 'B04',
};

// Fixed "now": Tuesday of week 6, late afternoon.
export const NOW_ISO = '2026-11-17T16:42:00-08:00';

export type ModuleId = 'perception' | 'encoding' | 'interaction' | 'narrative';

export const MODULES: { id: ModuleId; name: string; weeks: number[]; color: string; blurb: string }[] = [
  { id: 'perception', name: 'Perception', weeks: [1, 2], color: '#7a5aa6', blurb: 'What the visual system does for free, and where it fails.' },
  { id: 'encoding', name: 'Encoding', weeks: [3, 4, 5], color: '#1f6f6a', blurb: 'Mapping data to marks and channels, and designing for comparison.' },
  { id: 'interaction', name: 'Interaction', weeks: [6, 7, 8], color: '#b4562e', blurb: 'Letting people ask the next question of a chart.' },
  { id: 'narrative', name: 'Narrative', weeks: [9, 10], color: '#3e5f9c', blurb: 'Sequencing, framing and annotation for an audience.' },
];

export interface Week {
  n: number;
  module: ModuleId;
  title: string;
  dates: string;
  lectureDate: string;
  summary: string;
  status: 'past' | 'current' | 'future';
  missed?: boolean;
}

export const WEEKS: Week[] = [
  { n: 1, module: 'perception', title: 'Seeing data: preattentive processing', dates: 'Oct 12–16', lectureDate: 'Tue Oct 13', summary: 'Pop-out, visual search, and the limits of attention.', status: 'past' },
  { n: 2, module: 'perception', title: 'Graphical perception and color', dates: 'Oct 19–23', lectureDate: 'Tue Oct 20', summary: 'Ranking channels by accuracy; perceptual color spaces.', status: 'past' },
  { n: 3, module: 'encoding', title: 'Marks, channels and tables', dates: 'Oct 26–30', lectureDate: 'Tue Oct 27', summary: 'Expressiveness and effectiveness; arranging tabular data.', status: 'past' },
  { n: 4, module: 'encoding', title: 'Grammars of graphics', dates: 'Nov 2–6', lectureDate: 'Tue Nov 3', summary: 'Layered grammar, Vega-Lite, and specifying a chart declaratively.', status: 'past' },
  { n: 5, module: 'encoding', title: 'Comparison by design', dates: 'Nov 9–13', lectureDate: 'Tue Nov 10', summary: 'Juxtapose, superimpose, or explicitly encode: designing charts for comparison.', status: 'past', missed: true },
  { n: 6, module: 'interaction', title: 'Interaction techniques', dates: 'Nov 16–20', lectureDate: 'Tue Nov 17', summary: 'Overview first, zoom and filter, details on demand.', status: 'current' },
  { n: 7, module: 'interaction', title: 'Brushing, linking and coordinated views', dates: 'Nov 23–27', lectureDate: 'Tue Nov 24', summary: 'Multiple views that talk to each other. (No section Thu: Thanksgiving.)', status: 'future' },
  { n: 8, module: 'interaction', title: 'Latency and exploratory analysis', dates: 'Nov 30–Dec 4', lectureDate: 'Tue Dec 1', summary: 'How response time changes what people explore.', status: 'future' },
  { n: 9, module: 'narrative', title: 'Narrative structures', dates: 'Dec 7–11', lectureDate: 'Tue Dec 8', summary: 'Author-driven vs reader-driven stories; genres of narrative vis.', status: 'future' },
  { n: 10, module: 'narrative', title: 'Rhetoric and framing', dates: 'Dec 14–18', lectureDate: 'Tue Dec 15', summary: 'How titles, annotation and defaults steer interpretation.', status: 'future' },
];

export interface Reading {
  id: string;
  week: number;
  authors: string;
  year: number;
  title: string;
  source: string;
  pages: string;
  minutes: number;
  required: boolean;
  usedIn?: string;
  abstract: string;
  note?: string;
  question?: string;
}

export const READINGS: Reading[] = [
  { id: 'r01', week: 1, authors: 'Munzner, T.', year: 2014, title: 'What’s Vis, and Why Do It? (Ch. 1)', source: 'Visualization Analysis & Design', pages: 'pp. 1–19', minutes: 35, required: true, abstract: 'Defines visualization as an external representation that augments human capability, and introduces the what–why–how framework used throughout the course.' },
  { id: 'r02', week: 1, authors: 'Healey, C. G. & Enns, J. T.', year: 2012, title: 'Attention and Visual Memory in Visualization and Computer Graphics', source: 'IEEE TVCG 18(7)', pages: 'pp. 1170–1188', minutes: 50, required: true, abstract: 'Surveys preattentive processing, feature hierarchies, change blindness and their implications for visualization design.' },
  { id: 'r03', week: 1, authors: 'Cleveland, W. S. & McGill, R.', year: 1984, title: 'Graphical Perception: Theory, Experimentation, and Application to the Development of Graphical Methods', source: 'Journal of the American Statistical Association 79(387)', pages: 'pp. 531–554', minutes: 45, required: false, abstract: 'The original ranking of elementary perceptual tasks — position, length, angle, area — by judgment accuracy.' },
  { id: 'r04', week: 2, authors: 'Munzner, T.', year: 2014, title: 'Marks and Channels (Ch. 5)', source: 'Visualization Analysis & Design', pages: 'pp. 94–114', minutes: 35, required: true, abstract: 'Marks as geometric primitives, channels as their visual properties; expressiveness and effectiveness principles.' },
  { id: 'r05', week: 2, authors: 'Szafir, D. A.', year: 2018, title: 'Modeling Color Difference for Visualization Design', source: 'IEEE TVCG 24(1)', pages: 'pp. 392–401', minutes: 40, required: true, abstract: 'Shows that perceived color difference depends on mark size and type, and offers models for picking discriminable palettes.' },
  { id: 'r06', week: 2, authors: 'Ware, C.', year: 2021, title: 'Visual Salience and Finding Information (Ch. 5, excerpt)', source: 'Information Visualization: Perception for Design, 4th ed.', pages: 'pp. 139–158', minutes: 30, required: false, abstract: 'How salience guides search, and how to design so the important thing is the thing that pops out.' },
  { id: 'r07', week: 3, authors: 'Bertin, J.', year: 1983, title: 'The Properties of the Graphic System (excerpt)', source: 'Semiology of Graphics', pages: 'pp. 42–61', minutes: 30, required: true, abstract: 'Bertin’s visual variables and their levels of organization: associative, selective, ordered, quantitative.' },
  { id: 'r08', week: 3, authors: 'Munzner, T.', year: 2014, title: 'Arrange Tables (Ch. 7)', source: 'Visualization Analysis & Design', pages: 'pp. 144–175', minutes: 45, required: true, abstract: 'Keys and values, axis orientation, and layouts from scatterplots to matrices.' },
  { id: 'r09', week: 3, authors: 'Heer, J. & Bostock, M.', year: 2010, title: 'Crowdsourcing Graphical Perception: Using Mechanical Turk to Assess Visualization Design', source: 'Proc. ACM CHI', pages: 'pp. 203–212', minutes: 35, required: false, abstract: 'Replicates Cleveland & McGill online and extends it to new chart types and design parameters.' },
  { id: 'r10', week: 4, authors: 'Wickham, H.', year: 2010, title: 'A Layered Grammar of Graphics', source: 'Journal of Computational and Graphical Statistics 19(1)', pages: 'pp. 3–28', minutes: 50, required: true, abstract: 'Charts as layers of data, aesthetic mappings, geoms, stats, scales, coordinates and facets.' },
  { id: 'r11', week: 4, authors: 'Satyanarayan, A., Moritz, D., Wongsuphasawat, K. & Heer, J.', year: 2017, title: 'Vega-Lite: A Grammar of Interactive Graphics', source: 'IEEE TVCG 23(1)', pages: 'pp. 341–350', minutes: 40, required: true, abstract: 'A high-level grammar for composing views (layer, concat, facet, repeat) and interactions.' },
  { id: 'r12', week: 4, authors: 'Munzner, T.', year: 2014, title: 'Map Color and Other Channels (Ch. 10)', source: 'Visualization Analysis & Design', pages: 'pp. 218–243', minutes: 40, required: false, abstract: 'Colormaps for categorical, ordered and diverging data, plus size, angle and shape channels.' },
  {
    id: 'r13', week: 5, authors: 'Javed, W., McDonnel, B. & Elmqvist, N.', year: 2010, title: 'Graphical Perception of Multiple Time Series', source: 'IEEE TVCG 16(6)', pages: 'pp. 927–934', minutes: 40, required: true, usedIn: 'PS4',
    abstract: 'Compares four techniques for showing several time series at once — simple line graphs, braided graphs, small multiples and horizon graphs — on local (find the max at a point) and dispersed (compare slopes, discriminate) tasks. Shared-space techniques win for local comparisons; split-space techniques hold up better for dispersed tasks as the number of series grows.',
    note: 'PS4 Task 3 asks you to cite this paper. Focus on Table 2 and Section 6 (design implications). You can skim the statistical analysis.',
    question: 'Which of your three PS4 encodings supports a “local” comparison best, and which a “dispersed” one?',
  },
  {
    id: 'r14', week: 5, authors: 'Talbot, J., Setlur, V. & Anand, A.', year: 2014, title: 'Four Experiments on the Perception of Bar Charts', source: 'IEEE TVCG 20(12)', pages: 'pp. 2152–2160', minutes: 35, required: true,
    abstract: 'Revisits Cleveland & McGill’s bar chart tasks, isolating the effects of distractor bars, separation and alignment on ratio judgments.',
    note: 'Read Experiments 1 and 4 closely; they come back in the week 5 lecture at 37:15.',
  },
  {
    id: 'r15', week: 5, authors: 'Kosara, R. & Skau, D.', year: 2016, title: 'Judgment Error in Pie Chart Variations', source: 'EuroVis Short Papers', pages: 'pp. 91–95', minutes: 20, required: false,
    abstract: 'Tests whether people read pie charts by angle, arc length or area, with donut and exploded variants.',
  },
  { id: 'r16', week: 6, authors: 'Shneiderman, B.', year: 1996, title: 'The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations', source: 'Proc. IEEE Symposium on Visual Languages', pages: 'pp. 336–343', minutes: 30, required: true, abstract: 'The visual information-seeking mantra: overview first, zoom and filter, then details on demand.' },
  { id: 'r17', week: 6, authors: 'Heer, J. & Shneiderman, B.', year: 2012, title: 'Interactive Dynamics for Visual Analysis', source: 'Communications of the ACM 55(4)', pages: 'pp. 45–54', minutes: 40, required: true, abstract: 'A taxonomy of twelve interactive dynamics grouped into data and view specification, view manipulation, and process and provenance.' },
  { id: 'r18', week: 7, authors: 'Yi, J. S., Kang, Y., Stasko, J. & Jacko, J.', year: 2007, title: 'Toward a Deeper Understanding of the Role of Interaction in Information Visualization', source: 'IEEE TVCG 13(6)', pages: 'pp. 1224–1231', minutes: 35, required: true, abstract: 'Seven categories of user intent: select, explore, reconfigure, encode, abstract/elaborate, filter, connect.' },
  { id: 'r19', week: 7, authors: 'Munzner, T.', year: 2014, title: 'Manipulate View (Ch. 11)', source: 'Visualization Analysis & Design', pages: 'pp. 244–262', minutes: 35, required: false, abstract: 'Change over time, select, navigate: the design space of view manipulation.' },
  { id: 'r20', week: 8, authors: 'Liu, Z. & Heer, J.', year: 2014, title: 'The Effects of Interactive Latency on Exploratory Visual Analysis', source: 'IEEE TVCG 20(12)', pages: 'pp. 2122–2131', minutes: 40, required: true, abstract: 'An added 500 ms of latency reduced how much of the data people explored and how many insights they reported.' },
  { id: 'r21', week: 9, authors: 'Segel, E. & Heer, J.', year: 2010, title: 'Narrative Visualization: Telling Stories with Data', source: 'IEEE TVCG 16(6)', pages: 'pp. 1139–1148', minutes: 45, required: true, abstract: 'Seven genres of narrative visualization and the design dimensions that separate author-driven from reader-driven stories.' },
  { id: 'r22', week: 9, authors: 'Hullman, J. & Diakopoulos, N.', year: 2011, title: 'Visualization Rhetoric: Framing Effects in Narrative Visualization', source: 'IEEE TVCG 17(12)', pages: 'pp. 2231–2240', minutes: 40, required: true, abstract: 'Information access, provenance, mapping, linguistic and procedural rhetoric in published visualizations.' },
  { id: 'r23', week: 10, authors: 'Kosara, R. & Mackinlay, J.', year: 2013, title: 'Storytelling: The Next Step for Visualization', source: 'IEEE Computer 46(5)', pages: 'pp. 44–50', minutes: 25, required: false, abstract: 'Argues for presentation as a first-class concern in visualization research and tools.' },
];

export interface DatasetVersion {
  v: number;
  date: string;
  author: string;
  rows: string;
  size: string;
  range: string;
  counters: number;
  changes: string[];
  warning?: string;
}

export interface Dataset {
  id: string;
  name: string;
  week: number;
  summary: string;
  source: string;
  grain: string;
  rows: string;
  format: string;
  columns: { name: string; type: string; desc: string }[];
  usedIn?: string[];
  versions?: DatasetVersion[];
  requiredVersion?: number;
  license: string;
}

export const BIKE_VERSIONS: DatasetVersion[] = [
  { v: 1, date: 'Sun Nov 8', author: 'Prof. Teague', rows: '10,958', size: '412 KB', range: 'Jan 2019 – Dec 2023', counters: 6, changes: ['Initial upload for lecture 5 demo: daily counts at 6 counters, 2019–2023.'], warning: 'Contains duplicated rows at Harbor Dr for June 2021 (counter swap). Superseded by v2.' },
  { v: 2, date: 'Mon Nov 9', author: 'Jordan Whitfield (TA)', rows: '10,928', size: '411 KB', range: 'Jan 2019 – Dec 2023', counters: 6, changes: ['Removed 30 duplicated Harbor Dr rows from June 2021.', 'Added `counter_status` column (ok / offline).'] },
  { v: 3, date: 'Tue Nov 10', author: 'Prof. Teague', rows: '14,604', size: '548 KB', range: 'Jan 2019 – Sep 2025', counters: 6, changes: ['Extended through September 2025 (city open-data refresh).', 'Kept the University Ave outage (Mar–May 2021) as missing values on purpose — PS4 asks you to handle it.', 'Frozen for PS4. This version will not change.'] },
  { v: 4, date: 'Fri Nov 13', author: 'Jordan Whitfield (TA)', rows: '350,496', size: '11.8 MB', range: 'Jan 2019 – Sep 2025', counters: 6, changes: ['Added hourly granularity (`hour` column) for the PS5 interaction exercises.', 'Daily totals are identical to v3.'] },
  { v: 5, date: 'Sat Nov 14', author: 'Jordan Whitfield (TA)', rows: '350,496', size: '12.1 MB', range: 'Jan 2019 – Sep 2025', counters: 6, changes: ['Imputed the University Ave outage from seasonal neighbours (flag `imputed = true`).', 'Renamed columns to snake_case.'], warning: 'Imputed values change University Ave totals for 2021 by about 9%. Not valid for PS4.' },
  { v: 6, date: 'Sun Nov 15', author: 'Jordan Whitfield (TA)', rows: '417,600', size: '14.6 MB', range: 'Jan 2019 – Oct 2025', counters: 10, changes: ['Added 4 counters installed in 2025 (Mission Bay Dr, Imperial Ave, El Cajon Blvd, Rose Canyon).', 'Added October 2025.', 'Default “latest” download for the final project.'], warning: 'Latest version, but not the PS4 version. Includes imputed values and extra counters.' },
];

export const DATASETS: Dataset[] = [
  {
    id: 'sd-bike-counts', name: 'San Diego bike counts, 2019–2025', week: 5,
    summary: 'Daily bicycle counts from automated counters on six city bike routes, from the City of San Diego open-data portal. PS4 uses v3; later versions add hourly rows, imputed gaps and new counters.',
    source: 'City of San Diego Open Data — Mobility counters', grain: 'one row per counter per day', rows: '14,604 (v3)', format: 'CSV',
    columns: [
      { name: 'date', type: 'date', desc: 'Local calendar date (YYYY-MM-DD)' },
      { name: 'counter_id', type: 'string', desc: 'Short ID, e.g. HBR-01' },
      { name: 'location', type: 'string', desc: 'Human-readable counter location' },
      { name: 'neighborhood', type: 'string', desc: 'City planning neighborhood' },
      { name: 'count', type: 'integer', desc: 'Bicycles detected, both directions; empty when offline' },
      { name: 'counter_status', type: 'string', desc: '“ok” or “offline”' },
    ],
    usedIn: ['PS4', 'Lecture 5 demo', 'PS5 (v4)'], versions: BIKE_VERSIONS, requiredVersion: 3, license: 'ODC-BY 1.0',
  },
  { id: 'coffee-exports', name: 'Global coffee exports by country, 1990–2024', week: 3, summary: 'Annual green-coffee exports (60-kg bags) for 52 exporting countries. Used for the PS2 redesign exercise.', source: 'International Coffee Organization, historical data', grain: 'country × crop year', rows: '1,820', format: 'CSV', columns: [{ name: 'country', type: 'string', desc: 'Exporting country' }, { name: 'crop_year', type: 'string', desc: 'e.g. 2023/24' }, { name: 'bags_60kg', type: 'integer', desc: 'Exports in 60-kg bags' }, { name: 'type', type: 'string', desc: 'Arabica / Robusta / Mixed' }], usedIn: ['PS2'], license: 'Educational use' },
  { id: 'dining-waste', name: 'Campus dining waste, daily kg', week: 2, summary: 'Daily pre- and post-consumer food waste weighed at five campus dining halls, Sep 2023 – Jun 2026.', source: 'Campus Sustainability Office', grain: 'hall × day × stream', rows: '9,315', format: 'CSV', columns: [{ name: 'date', type: 'date', desc: 'Service date' }, { name: 'hall', type: 'string', desc: 'Dining hall' }, { name: 'stream', type: 'string', desc: 'pre-consumer / post-consumer / compost' }, { name: 'kg', type: 'number', desc: 'Weight in kilograms' }], usedIn: ['PS3'], license: 'Campus internal — do not redistribute' },
  { id: 'scripps-sst', name: 'Scripps Pier sea-surface temperature, daily 1916–2025', week: 2, summary: 'One of the longest continuous ocean temperature records on the Pacific coast.', source: 'Shore Stations Program', grain: 'one row per day', rows: '39,812', format: 'CSV', columns: [{ name: 'date', type: 'date', desc: 'Sample date' }, { name: 'sst_c', type: 'number', desc: 'Surface temperature, °C' }, { name: 'flag', type: 'string', desc: 'QC flag' }], usedIn: ['PS3'], license: 'Public domain' },
  { id: 'colour-naming', name: 'Color-naming survey (class, week 2)', week: 2, summary: 'Anonymous responses from this class naming 48 color swatches.', source: 'VIZ 120 in-class survey, Oct 20', grain: 'response × swatch', rows: '6,288', format: 'CSV', columns: [{ name: 'response_id', type: 'string', desc: 'Anonymous ID' }, { name: 'swatch_hex', type: 'string', desc: 'Swatch shown' }, { name: 'name', type: 'string', desc: 'Free-text color name' }], license: 'Class use only' },
  { id: 'cm-replication', name: 'Cleveland–McGill replication (week 1 lab)', week: 1, summary: 'Your class’s proportion judgments for position, length, angle and area stimuli.', source: 'VIZ 120 lab, Oct 13', grain: 'participant × trial', rows: '11,200', format: 'CSV', columns: [{ name: 'participant', type: 'string', desc: 'Anonymous ID' }, { name: 'task', type: 'string', desc: 'Stimulus type' }, { name: 'true_pct', type: 'number', desc: 'True proportion' }, { name: 'judged_pct', type: 'number', desc: 'Reported proportion' }], usedIn: ['PS1'], license: 'Class use only' },
  { id: 'trolley-ridership', name: 'Trolley ridership by station, 2018–2025', week: 4, summary: 'Monthly average weekday boardings for 62 light-rail stations.', source: 'Regional transit agency ridership reports', grain: 'station × month', rows: '5,952', format: 'CSV', columns: [{ name: 'station', type: 'string', desc: 'Station name' }, { name: 'line', type: 'string', desc: 'Blue / Orange / Green / Copper' }, { name: 'month', type: 'date', desc: 'First of month' }, { name: 'avg_weekday', type: 'integer', desc: 'Average weekday boardings' }], license: 'Public' },
  { id: 'co2-mlo', name: 'Mauna Loa CO₂, monthly 1958–2025', week: 4, summary: 'The Keeling curve: monthly mean atmospheric CO₂ in ppm.', source: 'Scripps CO₂ Program / NOAA GML', grain: 'one row per month', rows: '812', format: 'CSV', columns: [{ name: 'month', type: 'date', desc: 'Month' }, { name: 'co2_ppm', type: 'number', desc: 'Monthly mean' }, { name: 'deseasonalized', type: 'number', desc: 'Trend component' }], license: 'Public domain' },
  { id: 'life-gdp', name: 'Life expectancy and GDP per capita, 1960–2023', week: 3, summary: 'World Bank indicators for 217 economies.', source: 'World Bank World Development Indicators', grain: 'country × year', rows: '13,888', format: 'CSV', columns: [{ name: 'country', type: 'string', desc: 'Economy' }, { name: 'year', type: 'integer', desc: 'Year' }, { name: 'life_exp', type: 'number', desc: 'Years at birth' }, { name: 'gdp_pc', type: 'number', desc: 'Constant 2015 US$' }], license: 'CC BY 4.0' },
  { id: 'reservoirs', name: 'California reservoir storage, weekly 2000–2025', week: 6, summary: 'Storage as % of capacity for 12 major reservoirs — used in this week’s interaction demo.', source: 'California Data Exchange Center', grain: 'reservoir × week', rows: '15,624', format: 'CSV', columns: [{ name: 'reservoir', type: 'string', desc: 'Reservoir' }, { name: 'week', type: 'date', desc: 'Week start' }, { name: 'pct_capacity', type: 'number', desc: '% of capacity' }], usedIn: ['Lecture 6 demo'], license: 'Public' },
  { id: 'hurricanes', name: 'Atlantic hurricane tracks (HURDAT2), 1980–2024', week: 7, summary: 'Six-hourly positions and intensity for named Atlantic storms.', source: 'NOAA National Hurricane Center', grain: 'storm × 6-hour fix', rows: '28,431', format: 'CSV', columns: [{ name: 'storm_id', type: 'string', desc: 'e.g. AL092022' }, { name: 'datetime', type: 'datetime', desc: 'UTC' }, { name: 'lat', type: 'number', desc: 'Latitude' }, { name: 'lon', type: 'number', desc: 'Longitude' }, { name: 'wind_kt', type: 'integer', desc: 'Max sustained wind' }], usedIn: ['PS5'], license: 'Public domain' },
  { id: 'olympic-100m', name: 'Olympic 100 m final times, 1896–2024', week: 9, summary: 'Medal-round results for men’s and women’s 100 m.', source: 'Compiled from official Olympic results', grain: 'athlete × final', rows: '412', format: 'CSV', columns: [{ name: 'year', type: 'integer', desc: 'Games' }, { name: 'event', type: 'string', desc: 'Men / Women' }, { name: 'athlete', type: 'string', desc: 'Name' }, { name: 'time_s', type: 'number', desc: 'Seconds' }], license: 'Educational use' },
  { id: 'library-rooms', name: 'Library study-room bookings, 2023–2025', week: 8, summary: 'Hourly study-room reservations across three campus libraries.', source: 'University Library', grain: 'room × hour', rows: '187,300', format: 'CSV', columns: [{ name: 'room', type: 'string', desc: 'Room ID' }, { name: 'start', type: 'datetime', desc: 'Booking start' }, { name: 'party_size', type: 'integer', desc: 'People' }], license: 'Campus internal' },
  { id: 'county-unemployment', name: 'US county unemployment, monthly 2010–2024', week: 10, summary: 'Local Area Unemployment Statistics for 3,142 counties — final project option.', source: 'Bureau of Labor Statistics LAUS', grain: 'county × month', rows: '565,560', format: 'CSV', columns: [{ name: 'fips', type: 'string', desc: 'County FIPS' }, { name: 'month', type: 'date', desc: 'Month' }, { name: 'rate', type: 'number', desc: 'Unemployment rate %' }], usedIn: ['Final project'], license: 'Public domain' },
];

export interface ProblemSet {
  n: number;
  title: string;
  due: string;
  dueISO: string;
  points: number;
  status: 'graded' | 'submitted' | 'draft' | 'not released';
  score?: string;
  week: number;
}

export const PROBLEM_SETS: ProblemSet[] = [
  { n: 1, title: 'Perceptual judgments lab', due: 'Thu Oct 22, 11:59pm', dueISO: '2026-10-22T23:59:00-07:00', points: 20, status: 'graded', score: '18 / 20', week: 2 },
  { n: 2, title: 'Marks and channels redesign', due: 'Thu Oct 29, 11:59pm', dueISO: '2026-10-29T23:59:00-07:00', points: 20, status: 'graded', score: '17.5 / 20', week: 3 },
  { n: 3, title: 'Color and scale', due: 'Thu Nov 5, 11:59pm', dueISO: '2026-11-05T23:59:00-08:00', points: 20, status: 'graded', score: '19 / 20', week: 4 },
  { n: 4, title: 'Encoding comparisons', due: 'Thu Nov 19, 11:59pm', dueISO: '2026-11-19T23:59:00-08:00', points: 20, status: 'draft', week: 6 },
  { n: 5, title: 'Interactive exploration', due: 'Thu Dec 10, 11:59pm', dueISO: '2026-12-10T23:59:00-08:00', points: 20, status: 'not released', week: 8 },
];

export const PS4_RUBRIC = [
  { id: 'enc', name: 'Encoding choices', pts: 6, levels: ['Three encodings, but two are near-identical or don’t serve the comparison', 'Three distinct encodings; rationale for at least one', 'Three distinct encodings spanning juxtapose / superimpose / explicit, each motivated by a comparison task'] },
  { id: 'data', name: 'Data handling', pts: 4, levels: ['Wrong version or counters; outage silently interpolated', 'Correct v3 data; outage handled but not disclosed', 'Correct v3 monthly totals; University Ave outage shown as missing and labelled'] },
  { id: 'read', name: 'Readability', pts: 4, levels: ['Missing titles, units or legend', 'Labelled but requires effort to decode', 'Direct labels, units, sensible aspect ratio and ordering'] },
  { id: 'just', name: 'Justification', pts: 6, levels: ['Describes charts but doesn’t compare them', 'Compares encodings; cites one source', '300–400 words; cites Javed et al. (2010) and lecture 5; names the task each chart serves best'] },
];

export const TAS = [
  { name: 'Priya Venkataraman', section: 'B04', time: 'Thu 2:00–2:50pm', room: 'Center Hall 216', office: 'Wed 10–11am, CSE B260', email: 'pvenkataraman', mine: true },
  { name: 'Jordan Whitfield', section: 'A01', time: 'Wed 9:00–9:50am', room: 'Center Hall 212', office: 'Mon 1–2pm, Zoom', email: 'jwhitfield' },
  { name: 'Mei-Lin Ostrander', section: 'A02', time: 'Wed 4:00–4:50pm', room: 'Warren Lecture Hall 2111', office: 'Tue 3–4pm, CSE B260', email: 'mostrander' },
  { name: 'Tomás Echeverría', section: 'B01', time: 'Thu 10:00–10:50am', room: 'Center Hall 220', office: 'Fri 11am–12pm, CSE B260', email: 'techeverria' },
  { name: 'Hana Kobayashi', section: 'B02', time: 'Thu 12:00–12:50pm', room: 'Center Hall 216', office: 'Wed 2–3pm, Zoom', email: 'hkobayashi' },
  { name: 'Ade Oyelaran', section: 'B03', time: 'Fri 9:00–9:50am', room: 'Solis Hall 107', office: 'Thu 4–5pm, CSE B260', email: 'aoyelaran' },
];

// ---------- Week 5 lecture ----------
export const LECTURE5 = {
  title: 'Lecture 5 — Comparison by design',
  date: 'Tue Nov 10',
  duration: 74 * 60 + 12,
  chapters: [
    { t: 0, title: 'Housekeeping and PS3 returns', deck: 'a', slides: [0, 1] },
    { t: 280, title: 'Recap: channels ranked by accuracy', deck: 'a', slides: [2, 4] },
    { t: 685, title: 'Three ways to compare: juxtapose, superimpose, explicitly encode', deck: 'a', slides: [5, 9] },
    { t: 1490, title: 'Multiple time series — Javed et al. (2010)', deck: 'a', slides: [10, 13] },
    { t: 2235, title: 'Bar chart experiments — Talbot et al. (2014)', deck: 'a', slides: [14, 16] },
    { t: 2910, title: 'Pies, donuts and angle judgments', deck: 'a', slides: [17, 19] },
    { t: 3485, title: 'PS4 walkthrough: bike counts v3', deck: 'b', slides: [0, 11], ps4: true },
    { t: 4180, title: 'Q&A', deck: 'b', slides: [11, 11] },
  ],
};

export interface Slide { title: string; bullets: string[]; kind?: 'title' | 'chart-juxt' | 'chart-super' | 'chart-explicit' | 'chart-gap' | 'versions' }

export const DECKS: Record<'a' | 'b', { id: string; title: string; file: string; size: string; slides: Slide[] }> = {
  a: {
    id: 'deck-5a', title: 'L5 — Comparison by design', file: 'VIZ120_L5_comparison.pdf', size: '6.2 MB',
    slides: [
      { title: 'Comparison by design', bullets: ['VIZ 120 · Lecture 5 · Tue Nov 10', 'Encoding module, week 3 of 3'], kind: 'title' },
      { title: 'Housekeeping', bullets: ['PS3 grades released — regrade requests open until Fri Nov 13', 'PS4 brief is live; walkthrough at the end of today', 'Critique Round 3 opens Sun Nov 15, closes Tue Nov 17 11:59pm'] },
      { title: 'Recap: not all channels are equal', bullets: ['Position on a common scale > position on unaligned scales > length > angle > area > color saturation', 'Cleveland & McGill (1984); Heer & Bostock (2010)'] },
      { title: 'Accuracy is task-relative', bullets: ['“Which is bigger?” vs “how much bigger?” vs “what is the trend?”', 'Same chart can be great at one and poor at another'] },
      { title: 'Today’s question', bullets: ['When a reader must compare A and B, where should A and B live on the page?'] },
      { title: 'Three strategies (Gleicher et al., 2011)', bullets: ['Juxtapose — side by side, separate views', 'Superimpose — same space, overlaid', 'Explicitly encode — compute the relationship and show it'] },
      { title: 'Juxtaposition', bullets: ['Small multiples share a scale and a layout', 'Costs: eye movement, memory between views'], kind: 'chart-juxt' },
      { title: 'Superimposition', bullets: ['One frame, many series', 'Costs: clutter, occlusion, color-legend lookups'], kind: 'chart-super' },
      { title: 'Explicit encoding', bullets: ['Plot the difference, the ratio, or an index (2019 = 100)', 'Costs: the reader loses the raw values'], kind: 'chart-explicit' },
      { title: 'Choosing among them', bullets: ['How many items? How aligned must they be? Is the relationship itself the message?'] },
      { title: 'Javed, McDonnel & Elmqvist (2010)', bullets: ['Line graphs, braided graphs, small multiples, horizon graphs', '2, 4 or 8 series; local vs dispersed tasks'] },
      { title: 'Results: local tasks', bullets: ['Shared-space techniques (lines, braided) fastest for “which series is highest at time t?”'] },
      { title: 'Results: dispersed tasks', bullets: ['Split-space (small multiples, horizon) more robust as series count grows', 'Accuracy for lines degrades at 8 series'] },
      { title: 'Design implications', bullets: ['Few series + point comparison → superimpose', 'Many series + trend comparison → juxtapose with a shared scale'] },
      { title: 'Talbot, Setlur & Anand (2014)', bullets: ['Ratio judgments between two marked bars', 'Distractors and separation matter less than expected'] },
      { title: 'Adjacent vs separated bars', bullets: ['Adjacent bars: slightly more accurate', 'Aligned baselines matter more than adjacency'] },
      { title: 'Takeaway for bars', bullets: ['Start at zero. Keep the comparison pair on a common baseline.'] },
      { title: 'Pies, donuts and arcs', bullets: ['Kosara & Skau (2016): people appear to read area/arc more than angle'] },
      { title: 'When a pie is fine', bullets: ['Part-to-whole with 2–3 parts; one is clearly dominant'] },
      { title: 'When it isn’t', bullets: ['Comparing parts across several pies → use aligned bars'] },
    ],
  },
  b: {
    id: 'deck-5b', title: 'PS4 walkthrough — bike counts v3', file: 'VIZ120_PS4_walkthrough.pdf', size: '2.1 MB',
    slides: [
      { title: 'PS4 · Encoding comparisons', bullets: ['Due Thu Nov 19, 11:59pm · 20 points', 'Draft peer critique: Round 3, due Tue Nov 17'], kind: 'title' },
      { title: 'The question', bullets: ['How did bike traffic at four counters change, 2019 – Sep 2025, and how do they compare to each other?'] },
      { title: 'The data: San Diego bike counts — v3 only', bullets: ['Datasets → San Diego bike counts → pick version 3', 'v4–v6 exist for PS5 and the final project; don’t use them here'], kind: 'versions' },
      { title: 'Use these four counters', bullets: ['HBR-01 Harbor Dr · UNV-02 University Ave', '30T-03 30th St · PBB-04 Pacific Beach Boardwalk'] },
      { title: 'Aggregate to monthly totals', bullets: ['Sum `count` per counter per month', 'Don’t average — months have different lengths… and you’ll see why that matters'] },
      { title: 'The University Ave outage', bullets: ['Counter offline Mar–May 2021: `count` is empty', 'Show it as missing. Do not interpolate. Label it.'], kind: 'chart-gap' },
      { title: 'Three encodings', bullets: ['One that juxtaposes, one that superimposes, one that explicitly encodes', 'Your call which is which'] },
      { title: 'Things that lose points', bullets: ['Dual y-axes', 'Rainbow palettes for 4 categories', 'Truncated bar baselines'] },
      { title: 'The write-up', bullets: ['300–400 words', 'For each chart: which comparison task does it serve best?', 'Cite Javed et al. (2010) and this lecture'] },
      { title: 'Critique Round 3', bullets: ['Upload a work-in-progress draft by Sun Nov 15', 'You’ll review two classmates’ drafts, 4 criteria each', 'Reviews released Wed morning — time to revise'] },
      { title: 'Office hours this week', bullets: ['Extra PS4 hours Wed Nov 18, 4–6pm, CSE B260'] },
      { title: 'Questions?', bullets: ['Post in the PS4 discussion thread or bring them to section'], kind: 'title' },
    ],
  },
};

// ---------- Critique round 3 ----------
export const CRITIQUE_CRITERIA = [
  { id: 'fit', name: 'Encoding fits the comparison', prompt: 'Does each chart make the comparison it claims to make easy? Name the comparison task it supports best.' },
  { id: 'accuracy', name: 'Perceptual accuracy', prompt: 'Scales, baselines, aspect ratio, and the University Ave outage — could any of these mislead a reader?' },
  { id: 'readability', name: 'Readability', prompt: 'Titles, units, legends or direct labels, color choices. What did you have to work to decode?' },
  { id: 'revision', name: 'One concrete revision', prompt: 'Suggest the single change that would most improve this draft, specifically enough to act on.' },
];

export const RATING_LABELS = ['Not yet', 'Developing', 'Solid', 'Exemplary'];

export interface PeerDraft {
  id: string;
  author: string;
  submitted: string;
  chartTitle: string;
  chartKind: 'stacked' | 'bars-truncated';
  authorNote: string;
  askedFor: string;
  attemptsShown: number;
}

export const PEER_DRAFTS: PeerDraft[] = [
  {
    id: 'A-0817', author: 'Student 31', submitted: 'Sun Nov 15, 9:48pm', chartKind: 'stacked',
    chartTitle: 'Monthly bike counts at four counters, 2019–2025 (stacked)',
    authorNote: 'I stacked the four counters so you can see the total and each counter at once. The big summer peaks are mostly Pacific Beach. I wasn’t sure what to do about the University Ave gap so I left it.',
    askedFor: 'Is stacking a reasonable way to compare the counters, or should I split them up?',
    attemptsShown: 1,
  },
  {
    id: 'A-0952', author: 'Student 77', submitted: 'Mon Nov 16, 1:12am', chartKind: 'bars-truncated',
    chartTitle: 'Annual bike counts by counter (thousands)',
    authorNote: 'Grouped bars by year. I started the axis at 30k because otherwise the differences between years were hard to see. 2025 only goes through September.',
    askedFor: 'Does the y-axis feel misleading? And is it OK to show 2025 as a partial year?',
    attemptsShown: 1,
  },
];

export const CRITIQUE_HISTORY = [
  { round: 1, on: 'PS2 drafts', due: 'Tue Oct 27', given: 2, received: 2, status: 'Complete' },
  { round: 2, on: 'PS3 drafts', due: 'Tue Nov 3', given: 2, received: 2, status: 'Complete' },
];

export const ANNOUNCEMENTS = [
  { when: 'Today, 12:31pm', who: 'Prof. Teague', title: 'Lecture 6 recording is up', body: 'Recording and slides for “Interaction techniques” are posted under Week 6. The reservoir demo notebook is in Datasets.' },
  { when: 'Sun Nov 15, 6:02pm', who: 'Jordan Whitfield (TA)', title: 'Bike counts v6 posted — PS4 still uses v3', body: 'v6 adds new counters for the final project. If you started PS4 on the latest version, switch your draft to v3 before Thursday.' },
  { when: 'Fri Nov 13, 3:15pm', who: 'Prof. Teague', title: 'Extra PS4 office hours', body: 'Wed Nov 18, 4–6pm in CSE B260. Bring your three attempts.' },
];

export function shortAuthors(authors: string) {
  const first = authors.split(',')[0];
  if (!authors.includes(' & ')) return first;
  const [before, after] = authors.split(' & ');
  const commas = (before.match(/,/g) || []).length;
  return commas <= 1 ? `${first} & ${after.split(',')[0]}` : `${first} et al.`;
}
