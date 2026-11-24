import type { Device, HistoryDay, HistoryEvent, Holiday, Person, PersonId, Routine, Step } from './types';

/** "Now" inside the app: Tuesday, Nov 17 2026, 7:42 PM */
export const NOW = { date: '2026-11-17', minutes: 19 * 60 + 42 };

export const HOUSEHOLD = { name: 'Fairweather Home', timezone: 'America/Chicago (CST)' };

export const PEOPLE: Person[] = [
  { id: 'emeka', name: 'Emeka', role: 'Parent · admin', phoneId: 'phone-emeka', initials: 'EF', color: '#2f6f8f' },
  { id: 'ruth', name: 'Ruth', role: 'Parent', phoneId: 'phone-ruth', initials: 'RF', color: '#9a5b8c' },
  { id: 'ada', name: 'Ada', role: 'Age 15', phoneId: 'phone-ada', initials: 'AF', color: '#c0702f' },
  { id: 'tobi', name: 'Tobi', role: 'Age 11', phoneId: 'phone-tobi', initials: 'TF', color: '#3f8a5a' },
];

export const personById = (id: PersonId) => PEOPLE.find((p) => p.id === id)!;

export const DEVICES: Device[] = [
  // 11 lights
  { id: 'lr-ceiling', name: 'Living Room Ceiling', type: 'light', room: 'Living Room', dimmable: true, state: '80%', on: true, code: 'living_room.ceiling' },
  { id: 'lr-floor', name: 'Living Room Floor Lamp', type: 'light', room: 'Living Room', dimmable: true, state: '60%', on: true, code: 'living_room.floor_lamp' },
  { id: 'lr-shelf', name: 'Bookshelf Light Strip', type: 'light', room: 'Living Room', dimmable: true, state: '40%', on: true, code: 'living_room.bookshelf_strip' },
  { id: 'kit-pendants', name: 'Kitchen Pendants', type: 'light', room: 'Kitchen', dimmable: true, state: '70%', on: true, code: 'kitchen.pendants' },
  { id: 'kit-cabinet', name: 'Under-Cabinet Lights', type: 'light', room: 'Kitchen', dimmable: false, state: 'On', on: true, code: 'kitchen.under_cabinet' },
  { id: 'hall-night', name: 'Hall Night-Light', type: 'light', room: 'Upstairs Hall', dimmable: true, state: 'Off', on: false, code: 'hall.night_light' },
  { id: 'porch', name: 'Front Porch Light', type: 'light', room: 'Outside', dimmable: false, state: 'On', on: true, code: 'outside.porch' },
  { id: 'primary-lamp', name: 'Bedside Lamp', type: 'light', room: 'Primary Bedroom', dimmable: true, state: 'Off', on: false, code: 'primary_bedroom.lamp' },
  { id: 'ada-desk', name: "Ada's Desk Lamp", type: 'light', room: "Ada's Room", dimmable: true, state: 'Off', on: false, code: 'ada_room.desk_lamp' },
  { id: 'tobi-ceiling', name: "Tobi's Ceiling Light", type: 'light', room: "Tobi's Room", dimmable: true, state: '100%', on: true, code: 'tobi_room.ceiling' },
  { id: 'garage', name: 'Garage Light', type: 'light', room: 'Garage', dimmable: false, state: 'Off', on: false, code: 'garage.light' },
  // 3 plugs
  { id: 'plug-coffee', name: 'Coffee Maker', type: 'plug', room: 'Kitchen', state: 'Off', on: false, code: 'kitchen.coffee_maker' },
  { id: 'plug-aquarium', name: 'Aquarium Pump', type: 'plug', room: "Tobi's Room", state: 'On · 6 W', on: true, code: 'tobi_room.aquarium_pump' },
  { id: 'plug-string', name: 'Porch String Lights', type: 'plug', room: 'Outside', state: 'Off', on: false, code: 'outside.string_lights' },
  // thermostat
  { id: 'thermo', name: 'Hallway Thermostat', type: 'thermostat', room: 'Downstairs Hall', state: 'Heat to 68° · now 67.5°', on: true, code: 'hall.thermostat' },
  // 2 door sensors
  { id: 'door-front', name: 'Front Door', type: 'door', room: 'Entry', state: 'Closed · opened 7:02 PM', on: false, code: 'entry.front_door' },
  { id: 'door-back', name: 'Patio Door', type: 'door', room: 'Kitchen', state: 'Closed · opened 6:24 PM', on: false, code: 'kitchen.patio_door' },
  // router + 4 per-device Wi-Fi controls
  { id: 'router', name: 'Mesh Router', type: 'router', room: 'Utility Closet', state: 'Online · 31 clients', on: true, code: 'network.router' },
  { id: 'wifi-ada-tablet', name: "Ada's Tablet", type: 'wifi', room: 'Wi-Fi client', state: 'Online', on: true, person: 'ada', code: 'wifi.ada_tablet' },
  { id: 'wifi-tobi-tablet', name: "Tobi's Tablet", type: 'wifi', room: 'Wi-Fi client', state: 'Online', on: true, person: 'tobi', code: 'wifi.tobi_tablet' },
  { id: 'wifi-tobi-console', name: "Tobi's Game Console", type: 'wifi', room: 'Wi-Fi client', state: 'Online', on: true, person: 'tobi', code: 'wifi.tobi_console' },
  { id: 'wifi-lr-tv', name: 'Living Room TV', type: 'wifi', room: 'Wi-Fi client', state: 'Online', on: true, code: 'wifi.living_room_tv' },
  // 4 phones for presence
  { id: 'phone-emeka', name: "Emeka's Phone", type: 'phone', room: 'Presence', state: 'Home', on: true, person: 'emeka', code: 'emeka.phone' },
  { id: 'phone-ruth', name: "Ruth's Phone", type: 'phone', room: 'Presence', state: 'Home', on: true, person: 'ruth', code: 'ruth.phone' },
  { id: 'phone-ada', name: "Ada's Phone", type: 'phone', room: 'Presence', state: 'Away · since 3:38 PM', on: false, person: 'ada', code: 'ada.phone' },
  { id: 'phone-tobi', name: "Tobi's Phone", type: 'phone', room: 'Presence', state: 'Home', on: true, person: 'tobi', code: 'tobi.phone' },
  // hub
  { id: 'hub', name: 'Housewire Hub', type: 'hub', room: 'Utility Closet', state: 'Online · fw 4.12.1', on: true, code: 'network.hub' },
];

export const deviceById = (id: string) => DEVICES.find((d) => d.id === id);

export const DEVICE_GROUPS: { type: Device['type']; label: string }[] = [
  { type: 'light', label: 'Lights' },
  { type: 'plug', label: 'Smart plugs' },
  { type: 'thermostat', label: 'Climate' },
  { type: 'door', label: 'Door sensors' },
  { type: 'router', label: 'Network' },
  { type: 'wifi', label: 'Wi-Fi controls' },
  { type: 'phone', label: 'Presence (phones)' },
  { type: 'hub', label: 'Hub' },
];

export const HOLIDAYS: Holiday[] = [
  { date: '2026-11-11', name: 'Veterans Day' },
  { date: '2026-11-25', name: 'Thanksgiving Break' },
  { date: '2026-11-26', name: 'Thanksgiving Day' },
  { date: '2026-11-27', name: 'Thanksgiving Break' },
  { date: '2027-01-04', name: 'Teacher Work Day' },
  { date: '2027-01-18', name: 'Martin Luther King Jr. Day' },
];

export const SWIM = { person: 'ada' as PersonId, days: [2, 4], start: 18 * 60, end: 20 * 60 + 30, place: 'Lakeside Aquatic Center' };

export const ROUTINES: Routine[] = [
  {
    id: 'r-morning', name: 'Morning Lights', enabled: true, icon: 'sun',
    trigger: 'Mon–Fri at 6:15 AM',
    steps: ['Kitchen Pendants → 70% over 5 min', 'Under-Cabinet Lights on', 'Hall Night-Light off', 'Thermostat heat to 69°'],
    lastRun: 'Today, 6:15 AM', lastResult: 'ok',
  },
  {
    id: 'r-coffee', name: 'Coffee at 6:20', enabled: true, icon: 'plug',
    trigger: 'Mon–Fri at 6:20 AM',
    steps: ['Coffee Maker plug on', 'Wait 45 min → Coffee Maker off'],
    lastRun: 'Today, 6:20 AM', lastResult: 'ok',
  },
  {
    id: 'r-afterschool', name: 'After-School Check-In', enabled: true, icon: 'home',
    trigger: 'Ada or Tobi arrives home, 2–6 PM',
    steps: ['Only on school days (not holiday)', 'Notify Emeka & Ruth: “{name} is home”', 'Kitchen Pendants → 60%'],
    lastRun: 'Today, 3:21 PM', lastResult: 'ok',
  },
  {
    id: 'r-porch', name: 'Porch Light at Sunset', enabled: true, icon: 'moon',
    trigger: 'Sunset (4:52 PM today)',
    steps: ['Front Porch Light on', 'At 11:00 PM → Front Porch Light off'],
    lastRun: 'Today, 4:52 PM', lastResult: 'ok',
  },
  {
    id: 'r-frontdoor', name: 'Front Door Left Open', enabled: true, icon: 'door',
    trigger: 'Front Door open longer than 5 min',
    steps: ['Only if thermostat is heating or cooling', 'Notify everyone home: “Front door is open”', 'Pause thermostat until door closes'],
    lastRun: 'Sun, Nov 15, 2:11 PM', lastResult: 'ok',
  },
  {
    id: 'r-eco', name: 'Overnight Eco Heat', enabled: true, icon: 'thermo',
    trigger: 'Daily at 10:30 PM',
    steps: ['Thermostat heat to 64°', 'At 5:45 AM → heat to 68°', 'Skip if anyone is away overnight'],
    lastRun: 'Yesterday, 10:30 PM', lastResult: 'ok',
  },
  {
    id: 'r-sleepin', name: 'Weekend Sleep-In', enabled: true, icon: 'bed',
    trigger: 'Sat & Sun at 8:30 AM',
    steps: ['Kitchen Pendants → 50%', 'Coffee Maker plug on', 'Hall Night-Light off'],
    lastRun: 'Sun, Nov 15, 8:30 AM', lastResult: 'ok',
  },
  {
    id: 'r-away', name: 'Away Mode', enabled: false, icon: 'lock',
    trigger: 'When all 4 phones leave home',
    steps: ['Turn off all lights', 'Thermostat heat to 60°', 'Living Room Floor Lamp on 7–10 PM (randomized)', 'Porch String Lights off', 'Notify Emeka & Ruth', 'Door opened → alert immediately'],
    lastRun: 'Aug 22, 9:04 AM', lastResult: 'ok',
  },
  {
    id: 'r-string', name: 'Holiday String Lights', enabled: false, icon: 'spark',
    trigger: 'Sunset, Dec 1 – Jan 6',
    steps: ['Porch String Lights on', 'At 10:00 PM → off', 'Skip if nobody is home'],
    lastRun: 'Jan 6, 10:00 PM', lastResult: 'ok',
  },
];

export const INITIAL_STEPS: Step[] = [
  { id: 's-trigger', type: 'schedule', time: 20 * 60 + 15, days: [0, 1, 2, 3, 4] },
  { id: 's-schoolnight', type: 'expr', label: 'School night, not a holiday', expr: 'weekday in [Sun..Thu] and not holiday(today)' },
  { id: 's-kidshome', type: 'presence', label: 'Either kid is home', people: ['ada', 'tobi'], mode: 'any', state: 'home' },
  { id: 's-dim', type: 'lights', label: 'Dim the living room', deviceIds: ['lr-ceiling', 'lr-floor', 'lr-shelf'], on: true, brightness: 30, fade: 120 },
  { id: 's-nightlight', type: 'lights', label: 'Hall night-light on', deviceIds: ['hall-night'], on: true, brightness: 20, fade: 0 },
  { id: 's-notify', type: 'notify', label: 'Heads-up to parents', recipients: ['emeka', 'ruth'], message: 'Wind-down started: living room dimmed, hall night-light on. Tablets go offline at 8:45.' },
  { id: 's-wait', type: 'waitUntil', time: 20 * 60 + 45 },
  { id: 's-tobi-wifi', type: 'wifi', label: "Pause Tobi's tablet", deviceIds: ['wifi-tobi-tablet'], pause: true },
  {
    id: 's-swim', type: 'branch', label: 'Ada back late from swim?',
    expr: 'weekday in ada.swim_days and now() < ada.swim_ends + 30m',
    then: [
      { id: 's-swim-wait', type: 'waitUntil', time: 21 * 60 + 15 },
      { id: 's-swim-wifi', type: 'wifi', label: "Pause Ada's tablet (late)", deviceIds: ['wifi-ada-tablet'], pause: true },
    ],
    else: [
      { id: 's-ada-wifi', type: 'wifi', label: "Pause Ada's tablet", deviceIds: ['wifi-ada-tablet'], pause: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Event history: last 7 days (Tue Nov 10 – Mon Nov 16)

const tm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

type Raw = [string, ...(string | number)[]];

function build(rows: Raw[]): HistoryEvent[] {
  const out: HistoryEvent[] = [];
  for (const [time, kind, a, b, by] of rows as [string, string, string, string | number, string?][]) {
    const t = tm(time);
    if (kind === 'p') out.push({ t, kind: 'presence', person: a as PersonId, state: b as 'home' | 'away' });
    else if (kind === 'd') {
      out.push({ t, kind: 'door', device: a, state: 'open' });
      out.push({ t: t + 1, kind: 'door', device: a, state: 'closed' });
    } else if (kind === 'l') out.push({ t, kind: 'light', device: a, brightness: b as number, by });
  }
  return out.sort((x, y) => x.t - y.t);
}

const schoolMorning: Raw[] = [
  ['06:15', 'l', 'kit-pendants', 70, 'Morning Lights'],
  ['06:15', 'l', 'hall-night', 0, 'Morning Lights'],
  ['07:02', 'p', 'emeka', 'away'],
  ['07:02', 'd', 'door-front'],
  ['07:34', 'p', 'ada', 'away'],
  ['07:34', 'd', 'door-front'],
  ['07:51', 'p', 'tobi', 'away'],
  ['07:52', 'p', 'ruth', 'away'],
  ['07:52', 'd', 'door-front'],
  ['08:00', 'l', 'kit-pendants', 0, 'Ruth'],
];

export const HISTORY: HistoryDay[] = [
  {
    // Tue — swim night. Ada goes straight from school to practice.
    date: '2026-11-10',
    events: build([
      ...schoolMorning,
      ['15:19', 'p', 'tobi', 'home'],
      ['15:20', 'd', 'door-front'],
      ['15:20', 'l', 'kit-pendants', 60, 'After-School Check-In'],
      ['16:41', 'p', 'emeka', 'home'],
      ['16:42', 'd', 'door-front'],
      ['16:52', 'l', 'porch', 100, 'Porch Light at Sunset'],
      ['17:46', 'l', 'lr-ceiling', 80, 'Emeka'],
      ['17:58', 'p', 'ruth', 'home'],
      ['17:59', 'd', 'door-front'],
      ['18:10', 'l', 'lr-floor', 60, 'Ruth'],
      ['18:10', 'l', 'lr-shelf', 40, 'Ruth'],
      ['18:24', 'd', 'door-back'],
      ['19:31', 'l', 'tobi-ceiling', 100, 'Tobi'],
      ['20:52', 'p', 'ada', 'home'],
      ['20:53', 'd', 'door-front'],
      ['20:55', 'l', 'ada-desk', 70, 'Ada'],
      ['21:12', 'l', 'tobi-ceiling', 0, 'Tobi'],
      ['22:31', 'l', 'lr-ceiling', 0, 'Ruth'],
      ['22:31', 'l', 'lr-floor', 0, 'Ruth'],
      ['22:31', 'l', 'lr-shelf', 0, 'Ruth'],
      ['22:47', 'l', 'ada-desk', 0, 'Ada'],
    ]),
  },
  {
    // Wed — Veterans Day, no school. Everyone mostly home.
    date: '2026-11-11',
    events: build([
      ['08:42', 'l', 'kit-pendants', 50, 'Emeka'],
      ['10:05', 'p', 'ada', 'away'],
      ['10:05', 'd', 'door-front'],
      ['13:30', 'p', 'ruth', 'away'],
      ['13:31', 'd', 'door-front'],
      ['14:48', 'p', 'ada', 'home'],
      ['14:49', 'd', 'door-front'],
      ['16:20', 'd', 'door-back'],
      ['16:52', 'l', 'porch', 100, 'Porch Light at Sunset'],
      ['17:05', 'l', 'lr-ceiling', 90, 'Emeka'],
      ['17:40', 'p', 'ruth', 'home'],
      ['17:41', 'd', 'door-front'],
      ['18:15', 'l', 'lr-floor', 60, 'Ruth'],
      ['19:02', 'd', 'door-back'],
      ['21:48', 'l', 'tobi-ceiling', 0, 'Tobi'],
      ['23:05', 'l', 'lr-ceiling', 0, 'Emeka'],
      ['23:05', 'l', 'lr-floor', 0, 'Emeka'],
    ]),
  },
  {
    // Thu — swim night; Ada gets a ride home early. Ruth turns the ceiling back up.
    date: '2026-11-12',
    events: build([
      ...schoolMorning,
      ['15:22', 'p', 'tobi', 'home'],
      ['15:23', 'd', 'door-front'],
      ['15:23', 'l', 'kit-pendants', 60, 'After-School Check-In'],
      ['16:35', 'p', 'emeka', 'home'],
      ['16:36', 'd', 'door-front'],
      ['16:51', 'l', 'porch', 100, 'Porch Light at Sunset'],
      ['17:40', 'l', 'lr-ceiling', 75, 'Emeka'],
      ['17:40', 'l', 'lr-floor', 60, 'Emeka'],
      ['18:02', 'p', 'ruth', 'home'],
      ['18:03', 'd', 'door-front'],
      ['18:41', 'd', 'door-back'],
      ['19:20', 'l', 'lr-shelf', 40, 'Tobi'],
      ['20:38', 'l', 'lr-ceiling', 70, 'Ruth'],
      ['20:41', 'p', 'ada', 'home'],
      ['20:42', 'd', 'door-front'],
      ['20:44', 'l', 'ada-desk', 70, 'Ada'],
      ['21:05', 'l', 'tobi-ceiling', 0, 'Tobi'],
      ['22:20', 'l', 'lr-ceiling', 0, 'Ruth'],
      ['22:20', 'l', 'lr-floor', 0, 'Ruth'],
      ['22:20', 'l', 'lr-shelf', 0, 'Ruth'],
      ['22:58', 'l', 'ada-desk', 0, 'Ada'],
    ]),
  },
  {
    // Fri — movie night, not a school night
    date: '2026-11-13',
    events: build([
      ...schoolMorning,
      ['15:18', 'p', 'tobi', 'home'],
      ['15:19', 'd', 'door-front'],
      ['15:47', 'p', 'ada', 'home'],
      ['15:48', 'd', 'door-front'],
      ['16:30', 'p', 'emeka', 'home'],
      ['16:31', 'd', 'door-front'],
      ['16:50', 'l', 'porch', 100, 'Porch Light at Sunset'],
      ['17:30', 'p', 'ruth', 'home'],
      ['17:31', 'd', 'door-front'],
      ['18:00', 'l', 'lr-ceiling', 60, 'Ruth'],
      ['19:30', 'l', 'lr-ceiling', 15, 'Emeka'],
      ['19:30', 'l', 'lr-shelf', 30, 'Emeka'],
      ['22:40', 'l', 'lr-ceiling', 0, 'Emeka'],
      ['22:40', 'l', 'lr-shelf', 0, 'Emeka'],
    ]),
  },
  {
    // Sat
    date: '2026-11-14',
    events: build([
      ['08:30', 'l', 'kit-pendants', 50, 'Weekend Sleep-In'],
      ['09:40', 'p', 'ada', 'away'],
      ['09:41', 'd', 'door-front'],
      ['10:15', 'p', 'emeka', 'away'],
      ['10:15', 'p', 'tobi', 'away'],
      ['10:16', 'd', 'door-front'],
      ['12:50', 'p', 'emeka', 'home'],
      ['12:50', 'p', 'tobi', 'home'],
      ['12:51', 'd', 'door-front'],
      ['14:05', 'd', 'door-back'],
      ['16:49', 'l', 'porch', 100, 'Porch Light at Sunset'],
      ['17:20', 'p', 'ada', 'home'],
      ['17:21', 'd', 'door-front'],
      ['17:45', 'l', 'lr-ceiling', 80, 'Ruth'],
      ['18:30', 'l', 'lr-floor', 60, 'Ruth'],
      ['23:10', 'l', 'lr-ceiling', 0, 'Emeka'],
      ['23:10', 'l', 'lr-floor', 0, 'Emeka'],
    ]),
  },
  {
    // Sun — Ruth and the kids at Grandma's for dinner, back after 9.
    date: '2026-11-15',
    events: build([
      ['08:30', 'l', 'kit-pendants', 50, 'Weekend Sleep-In'],
      ['13:58', 'd', 'door-front'],
      ['14:05', 'd', 'door-front'],
      ['14:11', 'd', 'door-front'],
      ['15:30', 'p', 'ruth', 'away'],
      ['15:30', 'p', 'ada', 'away'],
      ['15:31', 'p', 'tobi', 'away'],
      ['15:31', 'd', 'door-front'],
      ['16:48', 'l', 'porch', 100, 'Porch Light at Sunset'],
      ['17:30', 'l', 'lr-ceiling', 60, 'Emeka'],
      ['18:45', 'd', 'door-back'],
      ['21:06', 'p', 'ruth', 'home'],
      ['21:06', 'p', 'ada', 'home'],
      ['21:07', 'p', 'tobi', 'home'],
      ['21:07', 'd', 'door-front'],
      ['21:30', 'l', 'tobi-ceiling', 100, 'Tobi'],
      ['21:52', 'l', 'tobi-ceiling', 0, 'Ruth'],
      ['22:15', 'l', 'lr-ceiling', 0, 'Emeka'],
    ]),
  },
  {
    // Mon — ordinary school night, no swim
    date: '2026-11-16',
    events: build([
      ...schoolMorning,
      ['15:21', 'p', 'tobi', 'home'],
      ['15:21', 'd', 'door-front'],
      ['15:21', 'l', 'kit-pendants', 60, 'After-School Check-In'],
      ['15:44', 'p', 'ada', 'home'],
      ['15:45', 'd', 'door-front'],
      ['16:20', 'l', 'ada-desk', 70, 'Ada'],
      ['16:44', 'p', 'emeka', 'home'],
      ['16:44', 'd', 'door-front'],
      ['16:52', 'l', 'porch', 100, 'Porch Light at Sunset'],
      ['17:50', 'l', 'lr-ceiling', 80, 'Emeka'],
      ['17:55', 'p', 'ruth', 'home'],
      ['17:56', 'd', 'door-front'],
      ['18:05', 'l', 'lr-floor', 60, 'Ruth'],
      ['18:05', 'l', 'lr-shelf', 40, 'Ruth'],
      ['18:31', 'd', 'door-back'],
      ['19:40', 'l', 'tobi-ceiling', 100, 'Tobi'],
      ['21:20', 'l', 'tobi-ceiling', 0, 'Tobi'],
      ['22:25', 'l', 'lr-ceiling', 0, 'Ruth'],
      ['22:25', 'l', 'lr-floor', 0, 'Ruth'],
      ['22:25', 'l', 'lr-shelf', 0, 'Ruth'],
      ['22:40', 'l', 'ada-desk', 0, 'Ada'],
    ]),
  },
];

export const DEFAULT_TEST_DATE = '2026-11-10';
