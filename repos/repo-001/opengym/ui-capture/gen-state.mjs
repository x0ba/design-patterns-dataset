// Builds the profile of an established openGym user: Jonas Keller, lifting since early March 2026.
// Three-day full body until late May (those routines now sit in an "Archive" folder), then a
// four-day upper/lower split plus Saturday cardio. Holidays, a work trip, a flu week and a tweaked
// back leave gaps (with day notes); weigh-ins, monthly tape measurements, notes, a gym card.
//
// Everything goes through the app's own pure helpers: createRoutine (routine-write.js) for the
// routines and buildLoggedWorkout + appendLoggedWorkout (log-workout.js, the code behind the MCP
// log_workout tool) for each session, so the records are the shape the app itself writes.
import { createRoutine } from '../frontend/src/lib/routine-write.js'
import { buildLoggedWorkout, appendLoggedWorkout } from '../frontend/src/lib/log-workout.js'
import { emptyMeasurement } from '../frontend/src/lib/measurements.js'

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = rng(1203), brnd = rng(77), mrnd = rng(4242)
const pick = arr => arr[Math.floor(rnd() * arr.length)]
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const r1 = x => Math.round(x * 10) / 10
const roundTo = (w, step) => Math.round(w / step) * step
const at = (isoDate, h, m) => new Date(`${isoDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime()

export function buildState({ now = Date.now() } = {}) {
  const S = {
    unit: 'kg', lang: 'en', theme: 'dark', accent: 'lime', body: 'male', restSec: 120, effort: 'rir',
    targetW: 82, weekStart: 1, weighIn: false, warmupAuto: 'compounds', workoutView: 'list',
    routines: [], week: {}, dayPlan: {}, workouts: [], bodyweight: [], measurements: [], measurementEnabled: ['neck', 'shoulders', 'chest', 'waist', 'hips', 'upperArmLeft', 'upperArmRight', 'thighLeft', 'thighRight', 'calfLeft', 'calfRight', 'bodyFat'],
    customEx: [], exWeights: {}, dayNotes: {}, dayForm: {}, exNotes: {}, favEx: ['0025', '0043', '0032', '0652'],
    reminder: { on: true, time: '17:30', tz: 'Europe/Zurich', nudge: true, tone: 'friendly' },
    gymCards: [
      { id: 'gc1', label: 'Kraftwerk Oerlikon', value: 'KWO-0048213-JK', fmt: 'qrcode' },
      { id: 'gc2', label: 'Hotel gym Munich (guest)', value: '4006381333931', fmt: 'ean13' },
    ],
    lastGymCardId: 'gc1',
    equipProfiles: [], activeEquipId: null,
  }

  // ---------- routines ----------
  const mk = (name, exercises, extra = {}) => {
    const { routine, problems } = createRoutine(S, { name, exercises }, { id: 'r_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') })
    if (problems) throw new Error(name + ': ' + JSON.stringify(problems))
    Object.assign(routine, extra)
    return routine
  }
  const R = {
    fbA: mk('Full Body A', [
      { exercise: '0043', sets: 3, reps: 5, rest_sec: 180 }, { exercise: '0025', sets: 3, reps: 5, rest_sec: 180 },
      { exercise: '0027', sets: 3, reps: 8 }, { exercise: '0463', sets: 3, seconds: 40, rest_sec: 60 },
    ], { folder: 'Archive', emoji: 'figureStrength' }),
    fbB: mk('Full Body B', [
      { exercise: '0043', sets: 3, reps: 5, rest_sec: 180 }, { exercise: '1162', sets: 3, reps: 5, rest_sec: 150 },
      { exercise: '0032', sets: 2, reps: 5, rest_sec: 180 }, { exercise: '2330', sets: 3, reps: 10 }, { exercise: '0472', sets: 3, reps: 10, rest_sec: 60 },
    ], { folder: 'Archive' }),
    upA: mk('Upper A – Strength', [
      { exercise: '0025', sets: 4, reps: 6, rest_sec: 180, note: 'Pause the first rep on the chest' }, { exercise: '0027', sets: 4, reps: 8 },
      { exercise: '1162', sets: 3, reps: 8 }, { exercise: '0652', sets: 3, reps: 8 }, { exercise: '0201', sets: 3, reps: 12, rest_sec: 75 },
      { exercise: '0031', sets: 3, reps: 10, rest_sec: 75 },
    ]),
    loA: mk('Lower A – Squat', [
      { exercise: '0043', sets: 4, reps: 5, rest_sec: 210 }, { exercise: '0085', sets: 3, reps: 8, rest_sec: 150 },
      { exercise: '0739', sets: 3, reps: 10 }, { exercise: '0586', sets: 3, reps: 12, rest_sec: 75 }, { exercise: '0594', sets: 4, reps: 12, rest_sec: 60 },
    ]),
    upB: mk('Upper B – Volume', [
      { exercise: '0314', sets: 4, reps: 10 }, { exercise: '0861', sets: 4, reps: 10 }, { exercise: '0405', sets: 3, reps: 10 },
      { exercise: '0334', sets: 4, reps: 15, rest_sec: 60 }, { exercise: '0203', sets: 3, reps: 15, rest_sec: 60 },
      { exercise: '0313', sets: 3, reps: 12, rest_sec: 60 }, { exercise: '0814', sets: 3, reps: 10 },
    ]),
    loB: mk('Lower B – Hinge', [
      { exercise: '0032', sets: 3, reps: 4, rest_sec: 240, note: 'Reset every rep, no touch-and-go' }, { exercise: '2290', sets: 3, reps: 8 },
      { exercise: '1060', sets: 3, reps: 10 }, { exercise: '0585', sets: 3, reps: 15, rest_sec: 60 },
      { exercise: '0472', sets: 3, reps: 12, rest_sec: 60 }, { exercise: '0857', sets: 3, reps: 10, rest_sec: 60 },
    ]),
    cardio: mk('Saturday cardio', [{ exercise: '1161', sets: 1 }, { exercise: '2197', sets: 1 }]),
    hotel: mk('Hotel room 30 min', [
      { exercise: '0662', sets: 4, reps: 15 }, { exercise: '3743', sets: 3, reps: 12 }, { exercise: '0276', sets: 3, reps: 12 },
      { exercise: '0463', sets: 3, seconds: 45 },
    ], { folder: 'Travel' }),
  }
  S.week = { 1: [R.upA.id], 2: [R.loA.id], 4: [R.upB.id], 5: [R.loB.id], 6: [R.cardio.id] }

  // ---------- load model ----------
  // [start kg, kg at end of May, kg in mid November, plate step]
  const LOAD = {
    '0043': [60, 92.5, 115, 2.5], '0025': [50, 67.5, 82.5, 2.5], '0027': [40, 57.5, 72.5, 2.5], '1162': [30, 40, 50, 2.5],
    '0032': [80, 120, 150, 5], '2330': [45, 57.5, 65, 2.5], '0472': [0, 0, 0, 1], '0463': [0, 0, 0, 1],
    '0085': [70, 70, 110, 5], '0739': [120, 120, 200, 10], '0586': [35, 35, 50, 2.5], '0594': [40, 40, 60, 5],
    '0652': [0, 0, 10, 2.5], '0201': [22.5, 22.5, 32.5, 2.5], '0031': [25, 25, 35, 2.5],
    '0314': [22, 22, 32, 2], '0861': [50, 50, 70, 5], '0405': [16, 16, 24, 2], '0334': [8, 8, 12, 1], '0203': [20, 20, 30, 2.5],
    '0313': [12, 12, 18, 2], '0814': [0, 0, 15, 2.5], '2290': [14, 14, 24, 2], '1060': [60, 60, 110, 10], '0585': [40, 40, 60, 5],
    '0857': [0, 0, 0, 1], '0662': [0, 0, 0, 1], '3743': [0, 0, 0, 1], '0276': [0, 0, 0, 1],
  }
  const T0 = new Date('2026-03-02T12:00:00'), T1 = new Date('2026-05-24T12:00:00'), T2 = new Date('2026-11-16T12:00:00')
  // Setbacks: the holiday and the flu cost strength for a couple of weeks.
  const setback = d => {
    const t = +d
    const after = (from, weeks, loss) => t >= +new Date(from) && t < +new Date(from) + weeks * 7 * 864e5 ? loss * (1 - (t - +new Date(from)) / (weeks * 7 * 864e5)) : 0
    return after('2026-08-23', 3, 0.1) + after('2026-10-19', 2, 0.07)
  }
  const loadFor = (id, d) => {
    const [a, b, c, step] = LOAD[id] || [20, 20, 25, 2.5]
    let w = d <= T1 ? a + (b - a) * ((d - T0) / (T1 - T0)) : b + (c - b) * Math.pow((d - T1) / (T2 - T1), 0.8)
    w *= 1 - setback(d)
    return Math.max(0, roundTo(w, step))
  }

  // ---------- calendar ----------
  const NOTES = {
    '2026-04-06': { tag: 'rest', text: 'Easter Monday, gym closed' },
    '2026-05-01': { tag: 'rest', text: 'Labour day, went hiking on the Uetliberg instead' },
    '2026-06-30': { tag: 'rest', text: 'Moving flat. Carried a washing machine up four floors, counts as training' },
    '2026-09-21': { tag: 'injured', text: 'Tweaked lower back on the last deadlift single. Skipping lower days this week, walking and mobility only' },
    '2026-09-22': { tag: 'injured', text: 'Back still stiff' },
    '2026-09-25': { tag: 'injured', text: '' },
  }
  // Only the first day of a stretch gets the words; the rest are tagged, now and then with a line.
  const range = (from, to, note, extra = {}) => {
    for (let d = new Date(from + 'T12:00:00'); iso(d) <= to; d.setDate(d.getDate() + 1)) {
      const k = iso(d)
      NOTES[k] = k === from ? note : { tag: note.tag, text: extra[k] || '' }
    }
  }
  range('2026-08-08', '2026-08-22', { tag: 'travel', text: 'Sardinia with Lea. Swimming and gelato, no barbells' }, { '2026-08-14': 'Did push-ups and lunges on the beach, 20 min', '2026-08-20': 'Hike to Tiscali, 6 h' })
  range('2026-09-14', '2026-09-18', { tag: 'travel', text: 'Work trip to Munich, hotel gym is a joke' })
  range('2026-10-12', '2026-10-17', { tag: 'sick', text: 'Flu, 38.9 this morning' }, { '2026-10-14': 'Fever gone, still wiped out', '2026-10-17': 'Better. Back Monday, light' })
  for (const [k, v] of Object.entries(NOTES)) if (k < iso(new Date(now))) S.dayNotes[k] = { ...v, _ts: at(k, 21, 0) }

  const SESSION_NOTES = [
    'Felt strong today', 'Gym packed, had to wait for the rack', 'Short on sleep, kept it moving',
    'Left shoulder a bit cranky on the presses, kept the bench at RIR 2', 'New belt, much more stable on squats',
    'Great pump, music on point', 'Elbow tendon sore after curls, swap to hammer next time?',
    'Five-a-side football last night, legs still heavy', 'Grip gave out on the rows before my back did. Straps next time.',
    'Lea came along and tried deadlifts for the first time',
    'Everything moved fast. The deload week paid off. Bench felt like 70 kg even though it was 80 on the bar.',
  ]
  const EX_NOTES = {
    '0043': ['Depth good on all sets', 'Knees caved a little on the last rep', 'Bar position lower, felt better'],
    '0025': ['Touch and go, no bounce', 'Spotter on the last set', 'Grip one finger wider'],
    '0032': ['Hook grip up to the top set', 'Mixed grip on the last set'],
    '0652': ['Full dead hang every rep', 'Last set with the band'],
  }

  // ---------- history ----------
  const rir0 = d => {
    const wk = Math.floor((d - T0) / (7 * 864e5))
    return wk % 6 === 5 ? 4 : 2.8 - (wk % 6) * 0.35
  }
  let customAdded = false
  const plan = []
  for (let d = new Date(T0); iso(d) < iso(new Date(now)); d.setDate(d.getDate() + 1)) {
    const day = new Date(d), key = iso(day), dow = day.getDay()
    const note = NOTES[key]
    if (note && note.tag !== 'injured' && !(note.tag === 'travel' && key >= '2026-09-14' && key <= '2026-09-18')) continue
    let routine = null
    if (day <= T1) routine = dow === 1 || dow === 5 ? (Math.floor((day - T0) / (7 * 864e5)) % 2 ? R.fbB : R.fbA) : dow === 3 ? (Math.floor((day - T0) / (7 * 864e5)) % 2 ? R.fbA : R.fbB) : null
    else routine = { 1: R.upA, 2: R.loA, 4: R.upB, 5: R.loB, 6: R.cardio }[dow] || null
    if (key >= '2026-09-14' && key <= '2026-09-18' && (dow === 1 || dow === 3)) routine = R.hotel
    if (note?.tag === 'injured' && routine && /Lower/.test(routine.name)) routine = null
    if (!routine) continue
    if (routine === R.cardio && rnd() < 0.35) continue
    if (rnd() < 0.08) continue                        // missed for no recorded reason
    plan.push({ key, day, routine })
  }

  for (const { key, day, routine } of plan) {
    const isCardio = routine === R.cardio
    const morning = rnd() < 0.12
    const h = isCardio ? 9 + Math.floor(rnd() * 2) : morning ? 6 : 17 + Math.floor(rnd() * 3)
    const m = morning ? 45 : Math.floor(rnd() * 59)
    const exercises = []
    let totalSets = 0
    for (const slot of routine.ex) {
      if (isCardio) {
        if (slot.id === '1161') exercises.push({ exercise: '1161', sets: [{ minutes: 15 + Math.floor(rnd() * 3) * 5, distance: r1(3 + rnd() * 1.4) }] })
        else exercises.push({ exercise: '2197', sets: [{ minutes: 20 + Math.floor(rnd() * 3) * 5, speed: r1(8.5 + rnd() * 2), incline: pick([0, 1, 1, 2]) }] })
        continue
      }
      if (rnd() < 0.05 && routine.ex.length > 4) continue          // skipped an accessory
      const w = loadFor(slot.id, day)
      const nSets = slot.sets - (rnd() < 0.06 ? 1 : 0)
      const sets = []
      const compound = ['0043', '0025', '0032', '1162'].includes(slot.id)
      if (compound && rnd() < 0.7) {
        sets.push({ reps: 8, weight: roundTo(w * 0.5, 2.5) || 20, warmup: true })
        sets.push({ reps: 4, weight: roundTo(w * 0.75, 2.5) || 20, warmup: true })
      }
      for (let i = 0; i < nSets; i++) {
        if (slot.sec) { sets.push({ seconds: slot.sec + Math.floor(rnd() * 3) * 5, weight: 0 }); continue }
        const drop = i === nSets - 1 && rnd() < 0.5 ? (rnd() < 0.35 ? 2 : 1) : 0
        const reps = Math.max(1, slot.reps - drop + (rnd() < 0.08 ? 1 : 0))
        const s = { reps, weight: w }
        if (day > T1 && rnd() < 0.7) s.rir = Math.max(0, Math.min(5, Math.round(rir0(day) + (nSets - 1 - i) * 0.6 - (drop ? 1 : 0) + (rnd() - 0.5))))
        if (drop === 2 && rnd() < 0.4) { delete s.rir; s.failure = true }
        sets.push(s)
      }
      totalSets += sets.length
      const ex = { exercise: slot.id, sets }
      if (EX_NOTES[slot.id] && rnd() < 0.12) ex.note = pick(EX_NOTES[slot.id])
      exercises.push(ex)
    }
    // From September Upper B gets the gym's viking press machine tacked on, a custom exercise.
    if (routine === R.upB && key >= '2026-09-03') {
      exercises.push({ exercise: 'Kraftwerk viking press', createCustom: !customAdded, bodyPart: 'shoulders',
        sets: [0, 1, 2].map(() => ({ reps: 10, weight: key < '2026-10-01' ? 15 : 20 })) })
      customAdded = true
      totalSets += 3
    }
    const durationMin = isCardio ? exercises.reduce((a, e) => a + e.sets[0].minutes, 0) + 8 : Math.round(totalSets * 2.6 + 8 + rnd() * 14)
    const input = { date: key, start: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, durationMin, name: routine.name, exercises }
    if (rnd() < 0.11) input.note = pick(SESSION_NOTES)
    if (morning && rnd() < 0.3) input.note = pick(['Did this at 7am before work. Never again', 'Early session, gym empty. Could get used to this'])
    const built = buildLoggedWorkout(S, input, { now })
    if (built.problems) throw new Error(key + ' ' + routine.name + ': ' + JSON.stringify(built.problems))
    built.workout.routineIds = [routine.id]
    built.workout.routineId = routine.id
    const bw = S.bodyweight.length ? S.bodyweight[S.bodyweight.length - 1].w : null
    if (bw) built.workout.bw = bw
    appendLoggedWorkout(S, built, { now })
    // Weigh-ins are interleaved with the history so `bw` above reads the latest one.
  }

  // ---------- body weight ----------
  // 84.6 kg in March, cut to ~80.5 by late June, then a slow lean gain to ~81.8; holiday bump.
  const bwAt = d => {
    const t = (d - T0) / 864e5
    let w = t < 115 ? 84.6 - 4.1 * (t / 115) : 80.5 + 1.3 * ((t - 115) / (T2 - T0 - 115 * 864e5) * 864e5)
    if (iso(d) >= '2026-08-23' && iso(d) < '2026-09-10') w += 1.2 * (1 - (d - new Date('2026-08-23')) / (18 * 864e5))
    if (iso(d) >= '2026-10-12' && iso(d) < '2026-10-25') w -= 0.9
    return w
  }
  for (let d = new Date('2026-02-26T12:00:00'); iso(d) <= iso(new Date(now)); d.setDate(d.getDate() + 1)) {
    const key = iso(d)
    if (NOTES[key]?.tag === 'travel' && brnd() < 0.85) continue
    if (brnd() < (d.getDay() === 0 || d.getDay() === 6 ? 0.75 : 0.35)) continue
    const t = at(key, 6 + Math.floor(brnd() * 2), Math.floor(brnd() * 59))
    if (t > now) continue
    S.bodyweight.push({ d: key, w: r1(bwAt(d) + (brnd() - 0.5) * 0.9), t })
  }
  // A typo the user never fixed (messy real data): 18.24 instead of 81.24 would be absurd, so a
  // more plausible slip, a weigh-in after a big dinner.
  const late = S.bodyweight.find(b => b.d === '2026-07-12'); if (late) { late.w = r1(late.w + 1.6); late.t = at(late.d, 22, 40) }
  // Workouts carry the weigh-in of their day or the one before.
  for (const w of S.workouts) {
    const prev = S.bodyweight.filter(b => b.d <= w.d).pop()
    if (prev) w.bw = prev.w
  }

  // ---------- measurements ----------
  const mdates = ['2026-03-01', '2026-03-29', '2026-05-03', '2026-05-31', '2026-06-28', '2026-07-26', '2026-09-06', '2026-10-04', '2026-11-01', '2026-11-15']
  mdates.forEach((key, i) => {
    const p = i / (mdates.length - 1)
    const cut = Math.min(1, i / 4)
    const e = emptyMeasurement(key)
    e.t = at(key, 8, 15)
    e.waist = r1(91.5 - 6.2 * cut + 0.9 * Math.max(0, p - 0.5) + (mrnd() - 0.5) * 0.6)
    e.chest = r1(102.5 - 1.2 * cut + 2.6 * p + (mrnd() - 0.5) * 0.5)
    e.shoulders = i % 3 === 1 ? null : r1(118 + 3.5 * p + (mrnd() - 0.5) * 0.5)
    e.upperArmLeft = r1(34.6 + 1.8 * p + (mrnd() - 0.5) * 0.3)
    e.upperArmRight = r1(35.0 + 1.8 * p + (mrnd() - 0.5) * 0.3)
    e.thighLeft = i === 6 ? null : r1(57.5 + 1.9 * p + (mrnd() - 0.5) * 0.4)
    e.thighRight = i === 6 ? null : r1(57.9 + 1.9 * p + (mrnd() - 0.5) * 0.4)
    e.hips = r1(100.5 - 2.4 * cut + 0.6 * p)
    e.neck = i % 2 ? null : r1(39.5 - 0.4 * cut)
    e.calfLeft = i < 2 ? null : r1(38.0 + 0.5 * p)
    e.calfRight = i < 2 ? null : r1(38.3 + 0.5 * p)
    e.bodyFat = i === 2 || i === 7 ? null : r1(21.8 - 4.4 * cut + 0.6 * Math.max(0, p - 0.5) + (mrnd() - 0.5) * 0.5)
    S.measurements.push(e)
  })

  // ---------- the rest ----------
  // Confirmed working weights: the newest top set of each exercise.
  for (const w of S.workouts) for (const e of w.entries || []) {
    const top = Math.max(0, ...(e.sets || []).filter(s => s.done && s.phase !== 'warmup').map(s => Number(s.w) || 0))
    if (top > 0) S.exWeights[e.id] = { w: top, d: w.d }
  }
  S.exNotes = {
    '0739': 'Seat on notch 5, feet high and shoulder-width',
    '0861': 'Wide V-handle, not the narrow one',
    '0586': 'Machine by the window, pad just above the heels',
    '0043': 'Low bar. Safety pins on hole 9',
  }
  S.dayForm = {}
  for (const w of S.workouts.slice(-14)) {
    S.dayForm[w.d] = { sleep: 2 + Math.floor(mrnd() * 3), energy: 2 + Math.floor(mrnd() * 3), sore: 1 + Math.floor(mrnd() * 3), stress: 1 + Math.floor(mrnd() * 3), _ts: Number(w.start) - 60000 }
  }
  S.dailyForm = true
  return S
}
