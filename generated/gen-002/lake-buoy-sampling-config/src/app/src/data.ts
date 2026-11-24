// Mock data for Lake Tamarack Field Station — Sondewell
export const TODAY = '2026-11-17'
export const NOW_LABEL = 'Tue Nov 17, 08:24 CST'

export type DepId = 'MB' | 'UN' | 'US' | 'SM'
export type VarKey =
  | 'wt' | 'do' | 'cond' | 'chl' | 'fdom' | 'ph' | 'turb' | 'par'
  | 'airt' | 'wind' | 'baro' | 'precip' | 'rad' | 'snow' | 'pres'

export interface Deployment {
  id: DepId
  name: string
  short: string
  where: string
  power: string
  telemetry: string
  lastContact: string
  battery: number
}

export const DEPLOYMENTS: Deployment[] = [
  { id: 'MB', name: 'Main Buoy', short: 'Main', where: 'Deep hole, 15.8 m water depth', power: '2 × 100 Ah AGM, 160 W solar', telemetry: 'LTE modem', lastContact: '08:20', battery: 13.04 },
  { id: 'UN', name: 'Under-Ice Mooring North', short: 'North', where: 'North basin, 14 m', power: '100 Ah AGM, ice-tethered surface unit', telemetry: 'Iridium SBD', lastContact: '06:02', battery: 12.71 },
  { id: 'US', name: 'Under-Ice Mooring South', short: 'South', where: 'South bay, 9 m', power: '100 Ah AGM, ice-tethered surface unit', telemetry: 'Iridium SBD', lastContact: '06:04', battery: 12.66 },
  { id: 'SM', name: 'Shore Met Station', short: 'Shore', where: 'Boathouse point, 3 m above lake', power: '70 Ah AGM, 90 W solar', telemetry: 'LTE modem', lastContact: '08:15', battery: 12.88 },
]
export const depById = Object.fromEntries(DEPLOYMENTS.map((d) => [d.id, d])) as Record<DepId, Deployment>

export interface Sensor {
  id: string
  dep: DepId
  variable: string
  varKey: VarKey
  position: string
  model: string
  serial: string
  calibrated: string
  calIntervalDays: number
}

const S = (id: string, dep: DepId, variable: string, varKey: VarKey, position: string, model: string, serial: string, calibrated: string, calIntervalDays = 365): Sensor =>
  ({ id, dep, variable, varKey, position, model, serial, calibrated, calIntervalDays })

export const SENSORS: Sensor[] = [
  // Main Buoy — 13
  S('mb-tc', 'MB', 'Water temperature', 'wt', '0.5–12 m · 12 nodes', 'NexSens T-Node FR chain', 'TN21-0418', '2026-03-30'),
  S('mb-do1', 'MB', 'Dissolved oxygen', 'do', '1 m', 'YSI EXO Optical DO', '21E101845', '2026-08-12', 180),
  S('mb-cond', 'MB', 'Specific conductance', 'cond', '1 m', 'YSI EXO Cond/Temp', '21D100912', '2026-08-12', 180),
  S('mb-chl', 'MB', 'Chlorophyll a', 'chl', '1 m', 'YSI EXO Total Algae PC', '20K104477', '2026-08-12', 180),
  S('mb-fdom', 'MB', 'fDOM', 'fdom', '1 m', 'YSI EXO fDOM', '21A102230', '2026-08-12', 180),
  S('mb-ph', 'MB', 'pH', 'ph', '1 m', 'YSI EXO pH', '22B100331', '2026-08-12', 120),
  S('mb-turb', 'MB', 'Turbidity', 'turb', '1 m', 'YSI EXO Turbidity', '21C103118', '2026-08-12', 180),
  S('mb-do10', 'MB', 'Dissolved oxygen', 'do', '10 m', 'PME miniDOT', '7450-218843', '2026-06-03', 180),
  S('mb-wind', 'MB', 'Wind speed & direction', 'wind', 'Mast 3.2 m', 'R.M. Young 05106 Marine', 'WM142207', '2026-04-20'),
  S('mb-airt', 'MB', 'Air temperature & RH', 'airt', 'Mast 2.5 m', 'Vaisala HMP155', 'T4520113', '2026-04-20'),
  S('mb-par', 'MB', 'PAR (surface)', 'par', 'Mast 2.8 m', 'LI-COR LI-190R', 'Q112384', '2026-04-20', 730),
  S('mb-uwpar', 'MB', 'PAR (underwater)', 'par', '2 m', 'LI-COR LI-192', 'UWQ10471', '2026-04-20', 730),
  S('mb-baro', 'MB', 'Barometric pressure', 'baro', 'Logger box', 'Vaisala PTB110', 'P2910447', '2026-04-20', 730),
  // Under-Ice Mooring North — 7
  S('un-tc', 'UN', 'Water temperature', 'wt', '1–13 m · 9 loggers', 'RBRsolo³ T string', '207731–207739', '2026-07-15'),
  S('un-do3', 'UN', 'Dissolved oxygen', 'do', '3 m', 'PME miniDOT', '7450-301127', '2026-09-29', 180),
  S('un-do13', 'UN', 'Dissolved oxygen', 'do', '13 m', 'PME miniDOT', '7450-188206', '2026-04-18', 180),
  S('un-cond', 'UN', 'Specific conductance', 'cond', '12 m', 'RBRduet³ C.T', '211904', '2026-07-15'),
  S('un-chl', 'UN', 'Chlorophyll a', 'chl', '2 m', 'Turner Cyclops-7F, wiped', '2101447', '2026-06-10'),
  S('un-par', 'UN', 'PAR (under-ice)', 'par', '2 m', 'Apogee SQ-420X', '3381', '2026-06-10', 730),
  S('un-pres', 'UN', 'Water pressure', 'pres', '13.5 m', 'RBRsolo³ D', '208420', '2026-07-15', 730),
  // Under-Ice Mooring South — 5
  S('us-tc', 'US', 'Water temperature', 'wt', '1–8 m · 6 loggers', 'RBRsolo³ T string', '207740–207745', '2026-07-15'),
  S('us-do2', 'US', 'Dissolved oxygen', 'do', '2 m', 'PME miniDOT', '7450-301129', '2026-09-29', 180),
  S('us-do8', 'US', 'Dissolved oxygen', 'do', '8 m', 'PME miniDOT', '7450-188211', '2026-04-18', 180),
  S('us-cond', 'US', 'Specific conductance', 'cond', '8 m', 'Onset HOBO U24-001', '20984411', '2026-07-15'),
  S('us-pres', 'US', 'Water pressure', 'pres', '8.6 m', 'Onset HOBO U20L-04', '21077302', '2026-07-15', 730),
  // Shore Met Station — 6
  S('sm-airt', 'SM', 'Air temperature & RH', 'airt', '2 m', 'Campbell EE181', 'E1811093', '2026-05-02'),
  S('sm-wind', 'SM', 'Wind speed & direction', 'wind', '10 m mast', 'Gill WindSonic 2D', '22180031', '2026-05-02', 730),
  S('sm-baro', 'SM', 'Barometric pressure', 'baro', 'Enclosure', 'Campbell CS106', 'N3420115', '2026-05-02', 730),
  S('sm-precip', 'SM', 'Precipitation', 'precip', 'Alter shield', 'OTT Pluvio² L (heated)', '410447', '2026-05-02'),
  S('sm-rad', 'SM', 'Shortwave radiation', 'rad', '2 m arm', 'Kipp & Zonen SMP3', '225118', '2026-05-02', 730),
  S('sm-snow', 'SM', 'Snow depth', 'snow', '2 m arm', 'Campbell SR50A', '9921', '2026-05-02', 730),
]
export const sensorById = Object.fromEntries(SENSORS.map((s) => [s.id, s])) as Record<string, Sensor>

export const VAR_LABEL: Record<VarKey, string> = {
  wt: 'Water temperature', do: 'Dissolved oxygen', cond: 'Specific conductance', chl: 'Chlorophyll a',
  fdom: 'fDOM', ph: 'pH', turb: 'Turbidity', par: 'PAR', airt: 'Air temperature', wind: 'Wind speed',
  baro: 'Barometric pressure', precip: 'Precipitation', rad: 'Shortwave radiation', snow: 'Snow depth', pres: 'Water pressure',
}

export const UNIT_OPTIONS: Record<VarKey, string[]> = {
  wt: ['°C'], do: ['mg/L', '% sat'], cond: ['mS/cm', 'µS/cm'], chl: ['µg/L', 'RFU'], fdom: ['QSU', 'RFU'],
  ph: ['pH'], turb: ['FNU'], par: ['µmol m⁻² s⁻¹'], airt: ['°C'], wind: ['m/s'], baro: ['hPa'],
  precip: ['mm'], rad: ['W/m²'], snow: ['cm'], pres: ['dbar'],
}

// ---------- Profiles ----------
export interface SensorSetting { interval: number; active: boolean }
export interface QASetting { min?: number; max?: number; roc?: number; persist?: number }
export interface PowerSetting { cutoff: number; uplinkH: number; below: 'suspend-uplink' | 'suspend-uplink-halve' }
export interface ProfileConfig {
  sensors: Record<string, SensorSetting>
  units: Record<VarKey, string>
  qa: Record<string, QASetting>
  power: Record<DepId, PowerSetting>
  overrides: Record<string, Partial<Record<VarKey, string>>>
  retrieved: Record<DepId, boolean>
}

export interface QARule {
  id: string
  varKey: VarKey
  kind: 'range' | 'roc' | 'flat' | 'cal'
  scope: string
  flag: string
  note?: string
}
export const QA_RULES: QARule[] = [
  { id: 'wt-range', varKey: 'wt', kind: 'range', scope: 'All thermistors & sonde temperature', flag: 'R' },
  { id: 'wt-roc', varKey: 'wt', kind: 'roc', scope: 'Thermistor chains (North, South, Main)', flag: 'S' },
  { id: 'do-range', varKey: 'do', kind: 'range', scope: 'All DO sondes', flag: 'R' },
  { id: 'do-roc', varKey: 'do', kind: 'roc', scope: 'All DO sondes', flag: 'S' },
  { id: 'cond-range', varKey: 'cond', kind: 'range', scope: 'EXO, RBRduet, HOBO U24', flag: 'R' },
  { id: 'chl-range', varKey: 'chl', kind: 'range', scope: 'EXO Total Algae, Cyclops-7F', flag: 'R' },
  { id: 'par-range', varKey: 'par', kind: 'range', scope: 'All PAR sensors', flag: 'R' },
  { id: 'airt-range', varKey: 'airt', kind: 'range', scope: 'Main Buoy & Shore Met', flag: 'R' },
  { id: 'wind-range', varKey: 'wind', kind: 'range', scope: 'Main Buoy & Shore Met', flag: 'R' },
  { id: 'wt-flat', varKey: 'wt', kind: 'flat', scope: 'Thermistor chains', flag: 'F', note: 'identical consecutive samples' },
  { id: 'cal-age', varKey: 'do', kind: 'cal', scope: 'Every sensor, against its own interval', flag: 'C', note: 'past calibration interval' },
]

export const FLAG_CODES: { code: string; label: string; auto: boolean }[] = [
  { code: 'P', label: 'Pass', auto: true },
  { code: 'R', label: 'Out of range', auto: true },
  { code: 'S', label: 'Spike / rate of change', auto: true },
  { code: 'F', label: 'Flatline (stuck sensor)', auto: true },
  { code: 'C', label: 'Calibration past interval', auto: true },
  { code: 'I', label: 'Ice-affected', auto: false },
  { code: 'M', label: 'Missing / no telemetry', auto: false },
]

const sensorsBase = (fn: (s: Sensor) => SensorSetting) => Object.fromEntries(SENSORS.map((s) => [s.id, fn(s)]))

const baseQA: Record<string, QASetting> = {
  'wt-range': { min: -0.5, max: 30 },
  'wt-roc': { roc: 1.5, persist: 0 },
  'do-range': { min: 0, max: 20 },
  'do-roc': { roc: 2.0, persist: 0 },
  'cond-range': { min: 0.005, max: 1.0 },
  'chl-range': { min: 0, max: 400 },
  'par-range': { min: 0, max: 2500 },
  'airt-range': { min: -45, max: 40 },
  'wind-range': { min: 0, max: 60 },
  'wt-flat': { roc: 6 },
  'cal-age': {},
}
const baseUnits: Record<VarKey, string> = {
  wt: '°C', do: 'mg/L', cond: 'mS/cm', chl: 'µg/L', fdom: 'QSU', ph: 'pH', turb: 'FNU', par: 'µmol m⁻² s⁻¹',
  airt: '°C', wind: 'm/s', baro: 'hPa', precip: 'mm', rad: 'W/m²', snow: 'cm', pres: 'dbar',
}
const baseOverrides = (): Record<string, Partial<Record<VarKey, string>>> => ({
  reyes: {}, okafor: {}, gleon: { cond: 'µS/cm' }, dnr: {}, lindqvist: {},
})

const winterSensors = (s: Sensor): SensorSetting => {
  if (s.dep === 'MB') return { interval: 10, active: false }
  const m: Record<string, number> = {
    'un-tc': 10, 'un-do3': 10, 'un-do13': 10, 'un-cond': 10, 'un-chl': 10, 'un-par': 30, 'un-pres': 30,
    'us-tc': 10, 'us-do2': 10, 'us-do8': 10, 'us-cond': 30, 'us-pres': 30,
    'sm-airt': 10, 'sm-wind': 10, 'sm-baro': 30, 'sm-precip': 10, 'sm-rad': 10, 'sm-snow': 30,
  }
  return { interval: m[s.id], active: true }
}

export const PROFILES: Record<'ow26' | 'w2526' | 'storm', { name: string; status: string; span: string; note: string; config: ProfileConfig }> = {
  ow26: {
    name: 'Open Water 2026',
    status: 'Live',
    span: 'Active since Apr 28, 2026',
    note: 'All four deployments in water. 10-min sampling throughout; snow depth off.',
    config: {
      sensors: sensorsBase((s) => ({ interval: s.id === 'un-pres' || s.id === 'us-pres' || s.id === 'sm-baro' ? 15 : 10, active: s.id !== 'sm-snow' })),
      units: { ...baseUnits },
      qa: { ...baseQA, 'chl-range': { min: 0, max: 400 } },
      power: {
        MB: { cutoff: 11.8, uplinkH: 0.25, below: 'suspend-uplink' },
        UN: { cutoff: 11.9, uplinkH: 1, below: 'suspend-uplink' },
        US: { cutoff: 11.9, uplinkH: 1, below: 'suspend-uplink' },
        SM: { cutoff: 11.9, uplinkH: 0.25, below: 'suspend-uplink' },
      },
      overrides: baseOverrides(),
      retrieved: { MB: false, UN: false, US: false, SM: false },
    },
  },
  w2526: {
    name: 'Winter 2025–26',
    status: 'Archived',
    span: 'Nov 24, 2025 – Apr 28, 2026',
    note: 'Main Buoy out. Moorings on Iridium every 6 h.',
    config: {
      sensors: sensorsBase(winterSensors),
      units: { ...baseUnits },
      qa: { ...baseQA },
      power: {
        MB: { cutoff: 11.8, uplinkH: 0.25, below: 'suspend-uplink' },
        UN: { cutoff: 12.1, uplinkH: 6, below: 'suspend-uplink' },
        US: { cutoff: 12.1, uplinkH: 6, below: 'suspend-uplink' },
        SM: { cutoff: 12.1, uplinkH: 1, below: 'suspend-uplink' },
      },
      overrides: baseOverrides(),
      retrieved: { MB: true, UN: false, US: false, SM: false },
    },
  },
  storm: {
    name: 'Storm Mode',
    status: 'Overlay',
    span: 'Manual or auto: Shore Met wind > 14 m/s sustained 20 min',
    note: 'Temporary overlay. Thermistors and met to 2 min, rate limits relaxed. Last used Jul 11, 2026.',
    config: {
      sensors: sensorsBase((s) => ({ interval: ['wt', 'airt', 'wind', 'baro'].includes(s.varKey) ? 2 : 10, active: s.id !== 'sm-snow' })),
      units: { ...baseUnits },
      qa: { ...baseQA, 'wt-roc': { roc: 3.0, persist: 0 } },
      power: {
        MB: { cutoff: 11.8, uplinkH: 0.25, below: 'suspend-uplink' },
        UN: { cutoff: 11.9, uplinkH: 1, below: 'suspend-uplink' },
        US: { cutoff: 11.9, uplinkH: 1, below: 'suspend-uplink' },
        SM: { cutoff: 11.9, uplinkH: 0.25, below: 'suspend-uplink' },
      },
      overrides: baseOverrides(),
      retrieved: { MB: false, UN: false, US: false, SM: false },
    },
  },
}

export const cloneConfig = (c: ProfileConfig): ProfileConfig => JSON.parse(JSON.stringify(c))

// The draft as Mareike left it: copied from Winter 2025–26 this morning, DO sondes already moved to 30 min.
export function initialDraft(): ProfileConfig {
  const d = cloneConfig(PROFILES.w2526.config)
  for (const id of ['un-do3', 'un-do13', 'us-do2', 'us-do8']) d.sensors[id].interval = 30
  return d
}
export const INITIAL_REASONS: Record<string, string> = {
  'sensor|interval|10 min|30 min': 'Under-ice O₂ drawdown is slow; 30 min resolves it and saves ~18% logger power through March.',
}

// ---------- Power history ----------
export const LAST_WINTER_POWER: Record<DepId, string> = {
  MB: 'Out of water last winter',
  UN: 'Min 11.96 V on Jan 22 (air −31 °C). Below 12.1 V for 41 h; uplink suspended Jan 21–23.',
  US: 'Min 12.04 V on Feb 6. Below 12.1 V for 9 h.',
  SM: 'Min 12.22 V on Jan 22. Never reached cutoff.',
}

// ---------- Data consumers ----------
export interface Consumer {
  id: string
  name: string
  owner: string
  role: string
  cadence: string
  vars: { dep: DepId; varKey: VarKey }[]
  ingest: string
  lastDelivered: string
}
export const CONSUMERS: Consumer[] = [
  {
    id: 'reyes', name: 'Under-ice thesis export', owner: 'Ana Lucía Reyes', role: 'PhD candidate, Okafor Lab',
    cadence: 'Daily CSV, 06:00', vars: [{ dep: 'UN', varKey: 'wt' }, { dep: 'UN', varKey: 'cond' }, { dep: 'UN', varKey: 'do' }, { dep: 'US', varKey: 'cond' }],
    ingest: 'Reads into R scripts by hand', lastDelivered: 'Nov 17, 06:00',
  },
  {
    id: 'okafor', name: 'Okafor Lab dashboard', owner: 'Prof. Daniel Okafor', role: 'Faculty, Limnology',
    cadence: 'Hourly JSON', vars: [{ dep: 'MB', varKey: 'wt' }, { dep: 'MB', varKey: 'do' }, { dep: 'MB', varKey: 'chl' }, { dep: 'UN', varKey: 'wt' }, { dep: 'UN', varKey: 'do' }, { dep: 'UN', varKey: 'chl' }, { dep: 'UN', varKey: 'cond' }],
    ingest: 'Dashboard labels axes from the unit in each record', lastDelivered: 'Nov 17, 08:00',
  },
  {
    id: 'gleon', name: 'GLEON network stream', owner: 'Global Lake Ecological Observatory Network', role: 'External network',
    cadence: 'Daily, 02:00 UTC', vars: [{ dep: 'MB', varKey: 'wt' }, { dep: 'MB', varKey: 'do' }, { dep: 'MB', varKey: 'cond' }, { dep: 'UN', varKey: 'wt' }, { dep: 'UN', varKey: 'do' }, { dep: 'UN', varKey: 'cond' }],
    ingest: 'Network standard; units pinned', lastDelivered: 'Nov 17, 02:00 UTC',
  },
  {
    id: 'dnr', name: 'State DNR long-term lakes feed', owner: 'Tom Brandvold', role: 'DNR Water Resources',
    cadence: 'Daily CSV, 05:00', vars: [{ dep: 'UN', varKey: 'wt' }, { dep: 'UN', varKey: 'do' }, { dep: 'UN', varKey: 'cond' }, { dep: 'US', varKey: 'wt' }, { dep: 'US', varKey: 'do' }, { dep: 'SM', varKey: 'snow' }],
    ingest: 'Automated parser; assumes mS/cm per 2023 data agreement, ignores header', lastDelivered: 'Nov 17, 05:00',
  },
  {
    id: 'lindqvist', name: 'Ice phenology project', owner: 'Prof. Ruth Lindqvist', role: 'Faculty, Geography',
    cadence: 'Daily CSV, 07:00', vars: [{ dep: 'UN', varKey: 'wt' }, { dep: 'UN', varKey: 'par' }, { dep: 'SM', varKey: 'airt' }, { dep: 'SM', varKey: 'snow' }, { dep: 'SM', varKey: 'rad' }],
    ingest: 'Manual download', lastDelivered: 'Nov 17, 07:00',
  },
]

export const REYES_REQUEST = {
  from: 'Ana Lucía Reyes',
  date: 'Nov 14',
  text: 'Could the under-ice conductivity come through in µS/cm this winter? My earlier chapters and the Okafor Lab archive are all in µS/cm, and I keep converting by hand. Only need it for my export if that’s easier.',
}

// ---------- Seeded RNG ----------
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- Last winter thermistor series (10-min) ----------
export interface Series {
  id: string
  label: string
  start: number // ms
  values: number[]
  mixing: [number, number][] // index ranges reviewed as real mixing events
  faults: number[] // indices reviewed as sensor faults
}
const START = Date.UTC(2026, 0, 4, 6) // Jan 4 2026
const N = 76 * 144 // through Mar 21

function makeSeries(id: string, label: string, seed: number, base: number, drift: number, nMix: number, nFault: number, sign: 1 | -1): Series {
  const r = rng(seed)
  const v = new Array<number>(N)
  for (let i = 0; i < N; i++) {
    const t = i / N
    v[i] = base + drift * t + 0.06 * Math.sin(i / 37) + 0.03 * Math.sin(i / 211 + seed) + (r() - 0.5) * 0.012
  }
  const mixing: [number, number][] = []
  const used: boolean[] = new Array(N).fill(false)
  let guard = 0
  while (mixing.length < nMix && guard++ < 500) {
    const s = 200 + Math.floor(r() * (N - 600))
    const hold = 18 + Math.floor(r() * 54) // 3–12 h
    const rec = 36 + Math.floor(r() * 108)
    const e = s + 2 + hold + rec
    let clash = false
    for (let k = s - 60; k < e + 60; k++) if (used[k]) { clash = true; break }
    if (clash) continue
    const amp = sign * (1.6 + r() * 0.9)
    const ramp = r() < 0.55 ? 1 : 2
    for (let k = s; k < e; k++) {
      used[k] = true
      const j = k - s
      let f: number
      if (j < ramp) f = (j + 1) / ramp
      else if (j < ramp + hold) f = 1 - 0.1 * ((j - ramp) / hold)
      else f = 0.9 * (1 - (j - ramp - hold) / rec)
      v[k] += amp * f
    }
    mixing.push([s, e])
  }
  const faults: number[] = []
  guard = 0
  while (faults.length < nFault && guard++ < 500) {
    const i = 100 + Math.floor(r() * (N - 200))
    if (used[i - 2] || used[i] || used[i + 2]) continue
    used[i] = true
    v[i] += (r() < 0.7 ? 1 : -1) * (4 + r() * 7)
    faults.push(i)
  }
  mixing.sort((a, b) => a[0] - b[0])
  faults.sort((a, b) => a - b)
  return { id, label, start: START, values: v.map((x) => Math.round(x * 1000) / 1000), mixing, faults }
}

export const WINTER_SERIES: Series[] = [
  makeSeries('n3', 'North · 3 m', 11, 1.25, 0.35, 13, 3, 1),
  makeSeries('n5', 'North · 5 m', 23, 2.75, 0.3, 10, 2, -1),
  makeSeries('s2', 'South · 2 m', 37, 1.05, 0.4, 15, 3, 1),
]

export interface FlagResult { flagged: number[]; onMixing: number; onFault: number; faultsCaught: number; faultsTotal: number; other: number }
export function runRoc(s: Series, thr: number, persist: number): FlagResult {
  const v = s.values
  const flagged: number[] = []
  for (let i = 1; i < v.length; i++) {
    const d = Math.abs(v[i] - v[i - 1])
    if (d <= thr) continue
    if (persist > 0) {
      let returns = false
      for (let k = 1; k <= persist && i + k < v.length; k++) {
        if (Math.abs(v[i + k] - v[i - 1]) <= thr) { returns = true; break }
      }
      if (!returns) continue
    }
    flagged.push(i)
  }
  const faultSet = new Set(s.faults)
  let onMixing = 0, onFault = 0, other = 0
  const caught = new Set<number>()
  for (const i of flagged) {
    if (faultSet.has(i)) { onFault++; caught.add(i) }
    else if (faultSet.has(i - 1)) { onFault++ }
    else if (s.mixing.some(([a, b]) => i >= a && i <= b)) onMixing++
    else other++
  }
  return { flagged, onMixing, onFault, faultsCaught: caught.size, faultsTotal: s.faults.length, other }
}

// numbers for the March review note, computed from the same data
const lastWinterTotals = WINTER_SERIES.map((s) => runRoc(s, 1.5, 0)).reduce(
  (a, r) => ({ n: a.n + r.flagged.length, mix: a.mix + r.onMixing, fault: a.fault + r.onFault }),
  { n: 0, mix: 0, fault: 0 },
)
export const LAST_WINTER_ROC = lastWinterTotals

// ---------- Change history (212 edits since 2021) ----------
export interface HistoryEntry {
  id: number
  date: string // ISO date
  time: string
  author: string
  scope: string
  change: string
  reason: string
  pending?: boolean
}

const KEY_ENTRIES: Omit<HistoryEntry, 'id'>[] = [
  { date: '2021-03-08', time: '14:12', author: 'Mareike Holt', scope: 'Station', change: 'Imported configuration from CR1000X logger programs as baseline', reason: 'Moving station config into Sondewell; logger programs remain the fallback.' },
  { date: '2021-04-26', time: '10:40', author: 'Mareike Holt', scope: 'Profiles', change: 'Created profile Open Water 2021', reason: 'First season managed in Sondewell.' },
  { date: '2021-11-30', time: '09:05', author: 'Mareike Holt', scope: 'Profiles', change: 'Activated Winter 2021–22; Main Buoy marked retrieved', reason: 'Buoy out Nov 29, skim ice in north bay.' },
  { date: '2022-07-21', time: '16:48', author: 'Mareike Holt', scope: 'Profiles', change: 'Created Storm Mode overlay (thermistors & met to 2 min)', reason: 'Okafor Lab wants high-res mixing during storms after Jul 19 event.' },
  { date: '2023-02-14', time: '11:20', author: 'Mareike Holt', scope: 'Under-Ice North · power', change: 'Low-battery cutoff 11.9 → 12.1 V', reason: 'Logger browned out Feb 9 at −29 °C; lost 3 days of data.' },
  { date: '2023-05-02', time: '13:37', author: 'Mareike Holt', scope: 'Exports', change: 'Added consumer State DNR long-term lakes feed (station units)', reason: '2023 data agreement; DNR parser expects mS/cm.' },
  { date: '2024-06-18', time: '15:02', author: 'Mareike Holt', scope: 'Exports', change: 'GLEON stream: pinned conductivity to µS/cm', reason: 'Network standard.' },
  { date: '2025-11-24', time: '08:50', author: 'Mareike Holt', scope: 'Profiles', change: 'Activated Winter 2025–26; Main Buoy marked retrieved', reason: 'Buoy out Nov 24.' },
  { date: '2026-01-23', time: '09:14', author: 'Mareike Holt', scope: 'Under-Ice North · chlorophyll', change: 'Flag I applied to Cyclops-7F, Jan 6 → end of season', reason: 'Wiper frozen in place; readings stuck at 0.4 µg/L.' },
  { date: '2026-03-19', time: '15:31', author: 'Mareike Holt', scope: 'QA · water temp rate of change', change: `Reviewed ${LAST_WINTER_ROC.n} S flags on under-ice thermistors; ${LAST_WINTER_ROC.mix} reclassified P (mixing events)`, reason: '1.5 °C / 10 min is too tight under ice — real mixing fronts trip it. Revisit before next winter.' },
  { date: '2026-04-18', time: '12:06', author: 'Mareike Holt', scope: 'Under-Ice North & South · DO', change: 'Calibration recorded: miniDOT 7450-188206, 7450-188211', reason: 'Spring service before ice-off pull; 2-point (saturated / zero).' },
  { date: '2026-04-28', time: '10:22', author: 'Mareike Holt', scope: 'Profiles', change: 'Activated Open Water 2026; Main Buoy redeployed', reason: 'Ice-off Apr 21; buoy in Apr 27.' },
  { date: '2026-07-11', time: '17:45', author: 'Mareike Holt', scope: 'Profiles', change: 'Storm Mode auto-triggered (Shore Met 16.2 m/s), ended 23:10', reason: 'Automatic.' },
  { date: '2026-08-12', time: '14:18', author: 'Mareike Holt', scope: 'Main Buoy · EXO2', change: 'Calibration recorded: EXO DO, Cond, Total Algae, fDOM, pH, Turbidity', reason: 'Mid-season service.' },
  { date: '2026-09-29', time: '11:03', author: 'Mareike Holt', scope: 'Under-Ice North & South · DO', change: 'Replaced shallow miniDOTs; serials 7450-301127, 7450-301129', reason: 'Old units battery-swapped and sent for factory service. Deep units stay — no diver until spring.' },
  { date: '2026-10-21', time: '10:47', author: 'Mareike Holt', scope: 'Shore Met · snow depth', change: 'Cleaned SR50A transducer; reference distance re-measured 2.004 m', reason: 'Pre-winter check.' },
]

const ROUTINE: { scope: string; change: string; reason: string; months: number[] }[] = [
  { scope: 'Main Buoy · EXO2', change: 'Wiper interval 30 → 15 min', reason: 'Biofouling on optics during bloom.', months: [6, 7, 8] },
  { scope: 'Main Buoy · chlorophyll', change: 'Range upper limit 200 → 400 µg/L', reason: 'Bloom values were real, not sensor error.', months: [7, 8] },
  { scope: 'Main Buoy · turbidity', change: 'Rate-of-change limit 20 → 40 FNU / 10 min', reason: 'Storm resuspension flagged as spikes.', months: [6, 7, 9] },
  { scope: 'Main Buoy · thermistor chain', change: 'Node {n} replaced; serial updated', reason: 'Node failed open circuit.', months: [6, 7, 8] },
  { scope: 'Main Buoy · DO 1 m', change: 'Calibration recorded', reason: 'Routine 2-point calibration.', months: [5, 8] },
  { scope: 'Main Buoy · pH', change: 'Calibration recorded (pH 4/7/10)', reason: 'Routine.', months: [5, 7, 9] },
  { scope: 'Shore Met · precipitation', change: 'Orifice heater on below +2 °C', reason: 'Snow capping the gauge.', months: [10, 11] },
  { scope: 'Shore Met · wind', change: 'Storm Mode trigger 15 → 14 m/s', reason: 'Missed onset of Jun storm by 25 min.', months: [6, 7] },
  { scope: 'Under-Ice North · PAR', change: 'Interval 10 → 30 min', reason: 'Under-ice light changes slowly.', months: [11, 12] },
  { scope: 'Under-Ice South · conductivity', change: 'Interval 10 → 30 min', reason: 'HOBO battery life under ice.', months: [11, 12] },
  { scope: 'Under-Ice North · power', change: 'Uplink 3 h → 6 h', reason: 'Iridium budget and battery.', months: [12, 1] },
  { scope: 'Under-Ice South · thermistor chain', change: 'Flag I applied, top logger', reason: 'Logger frozen into ice.', months: [1, 2] },
  { scope: 'Main Buoy · DO 10 m', change: 'Rate-of-change limit 1.0 → 2.0 mg/L / 10 min', reason: 'Turnover produces real fast changes.', months: [9, 10] },
  { scope: 'Exports · Okafor Lab dashboard', change: 'Cadence daily → hourly', reason: 'Requested by D. Okafor for class use.', months: [9] },
  { scope: 'Main Buoy · telemetry', change: 'Modem power-cycle schedule 04:00 daily', reason: 'Modem hangs every few days.', months: [5, 6, 7, 8] },
  { scope: 'Main Buoy · fDOM', change: 'Calibration recorded', reason: 'Routine.', months: [5, 8] },
  { scope: 'Shore Met · air temperature', change: 'Range lower limit −40 → −45 °C', reason: 'Jan cold snap hit −41.3 °C (real).', months: [1, 2] },
  { scope: 'Main Buoy · turbidity', change: 'Calibration recorded', reason: 'Routine.', months: [5, 8] },
  { scope: 'QA · flatline', change: 'Flatline window 4 → 6 samples', reason: 'Under-ice temps legitimately stable for 40 min.', months: [12, 1, 2] },
  { scope: 'Profiles', change: 'Storm Mode triggered manually', reason: 'NWS severe thunderstorm warning.', months: [6, 7, 8] },
  { scope: 'Profiles', change: 'Storm Mode ended', reason: 'Wind below 8 m/s for 2 h.', months: [6, 7, 8] },
  { scope: 'Under-Ice North · DO 3 m', change: 'Calibration recorded', reason: 'Routine.', months: [4, 10] },
  { scope: 'Main Buoy · wind', change: 'Heading offset 2° → 4°', reason: 'Compass check against shore bearing.', months: [5, 6] },
  { scope: 'Shore Met · snow depth', change: 'Activated for winter', reason: 'First snow forecast.', months: [10, 11] },
  { scope: 'Shore Met · snow depth', change: 'Deactivated for summer', reason: 'Snow gone; reflections off grass.', months: [4, 5] },
]

function buildHistory(): HistoryEntry[] {
  const r = rng(2021)
  const out: Omit<HistoryEntry, 'id'>[] = [...KEY_ENTRIES]
  const authorsFor = (year: number) => {
    if (year === 2021 || year === 2022) return ['Mareike Holt', 'Mareike Holt', 'Mareike Holt', 'Mareike Holt', 'Jonas Feld']
    if (year === 2023 || year === 2024) return ['Mareike Holt', 'Mareike Holt', 'Mareike Holt', 'Mareike Holt', 'Lena Bauer']
    return ['Mareike Holt']
  }
  const target = 212
  const perYear = new Map<string, number>()
  let guard = 0
  while (out.length < target && guard++ < 50000) {
    const t = ROUTINE[Math.floor(r() * ROUTINE.length)]
    const month = t.months[Math.floor(r() * t.months.length)]
    const year = 2021 + Math.floor(r() * 6)
    if (year === 2021 && month < 4) continue
    if (year === 2026 && month > 10) continue
    const seasonal = ['Jonas Feld', 'Lena Bauer']
    const auths = authorsFor(year)
    let author = auths[Math.floor(r() * auths.length)]
    if (seasonal.includes(author) && (month < 5 || month > 9)) author = 'Mareike Holt'
    const day = 1 + Math.floor(r() * 28)
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (date > '2026-11-16') continue
    const k = `${ROUTINE.indexOf(t)}|${year}`
    const repeatable = /Calibration|Storm Mode|Wiper|pH/.test(t.change + t.scope)
    if ((perYear.get(k) ?? 0) >= (repeatable ? 3 : 1)) continue
    perYear.set(k, (perYear.get(k) ?? 0) + 1)
    const time = `${String(7 + Math.floor(r() * 10)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}`
    out.push({ date, time, author, scope: t.scope, change: t.change.replace('{n}', String(2 + Math.floor(r() * 10))), reason: t.reason })
  }
  out.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1))
  return out.map((e, i) => ({ ...e, id: out.length - i }))
}
export const HISTORY: HistoryEntry[] = buildHistory()

// ---------- Ice outlook ----------
export const ICE = {
  skim: { from: '2026-11-25', to: '2026-11-28' },
  full: { from: '2026-12-04', to: '2026-12-10' },
  source: 'Station ice model + NWS 10-day, updated 06:00',
}

// ---------- Helpers ----------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const parseISO = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)) }
export const fmtDate = (d: string, withYear = true) => { const x = parseISO(d); return `${MON[x.getUTCMonth()]} ${x.getUTCDate()}${withYear ? `, ${x.getUTCFullYear()}` : ''}` }
export const fmtDow = (d: string) => { const x = parseISO(d); return `${DOW[x.getUTCDay()]} ${MON[x.getUTCMonth()]} ${x.getUTCDate()}` }
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000)
export const addDays = (d: string, n: number) => { const x = new Date(parseISO(d).getTime() + n * 86400000); return x.toISOString().slice(0, 10) }
export const calStatus = (s: Sensor) => {
  const age = daysBetween(s.calibrated, TODAY)
  const due = addDays(s.calibrated, s.calIntervalDays)
  return { age, due, overdue: age > s.calIntervalDays, soon: !(age > s.calIntervalDays) && s.calIntervalDays - age <= 30 }
}
export const fmtInterval = (m: number) => (m >= 60 ? `${m / 60} h` : `${m} min`)
export const fmtUplink = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${h} h`)
