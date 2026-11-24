import { SENSORS, SENSOR_BY_KEY, HOTSPOT } from './geo.js'

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r())

// cosine-eased interpolation through [hour, value] control points
function curve(points) {
  return (h) => {
    if (h <= points[0][0]) return points[0][1]
    for (let i = 1; i < points.length; i++) {
      if (h <= points[i][0]) {
        const [h0, v0] = points[i - 1]
        const [h1, v1] = points[i]
        const u = (h - h0) / (h1 - h0)
        return v0 + (v1 - v0) * (1 - Math.cos(Math.PI * u)) / 2
      }
    }
    return points[points.length - 1][1]
  }
}

const LOW = { Millrace: 0.9, Linden: 0.8, "Cooper's Ferry": 0.7, 'Foundry Row': 0.5, 'Alder Terrace': 0.4, 'Sycamore Hill': 0.1 }

const night = (hourOfDay) => (Math.cos((2 * Math.PI * (hourOfDay - 4)) / 24) + 1) / 2
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))

export function generate(sc) {
  const rand = mulberry32(sc.seed)
  const N = sc.frames
  const sensors = SENSORS.filter((s) => s.num <= sc.sensorCount)
  const R = curve(sc.regional)
  const hod = (f) => (sc.startHour + f / 6) % 24

  const ar = (sd, phi = 0.85) => {
    const a = new Float32Array(N)
    let e = 0
    for (let i = 0; i < N; i++) {
      e = phi * e + sd * gauss(rand)
      a[i] = e
    }
    return a
  }

  // regional monitor ------------------------------------------------------
  const regN = ar(0.03)
  const regRh = ar(2.5, 0.9)
  const regional = { corrected: new Float32Array(N), rh: new Float32Array(N) }
  for (let f = 0; f < N; f++) {
    regional.corrected[f] = Math.max(2, R(f / 6) * (1 + regN[f]))
    regional.rh[f] = Math.min(96, Math.max(28, 46 + 34 * night(hod(f)) + regRh[f]))
  }

  // volunteer sensors -----------------------------------------------------
  const out = sensors.map((s) => {
    const low = LOW[s.hood]
    const bias = 0.1 * gauss(rand)
    const nz = ar(0.045)
    const nz2 = ar(0.02, 0.5)
    const rhN = ar(2.5, 0.9)
    const rhOff = 5 * low + 3 * gauss(rand)
    const corrected = new Float32Array(N)
    const raw = new Float32Array(N)
    const rh = new Float32Array(N)
    const online = new Uint8Array(N).fill(1)
    const drop = sc.dropouts[s.key]
    for (let f = 0; f < N; f++) {
      const nt = night(hod(f))
      const local = 1 + bias + (low - 0.5) * 0.35 * nt + (0.5 - low) * 0.12 * (1 - nt)
      let v = R(f / 6) * local * (1 + nz[f])
      for (const sg of sc.surges) {
        const d = Math.hypot(s.x - sg.cx, s.y - sg.cy)
        v += sg.amp * Math.exp(-(d * d) / (2 * sg.sigma * sg.sigma)) * sg.g(f) * (1 + 0.5 * nz[f])
      }
      v = Math.max(1.5, v)
      const hum = Math.min(97, Math.max(25, 46 + 34 * nt + rhOff + rhN[f]))
      corrected[f] = v
      rh[f] = hum
      raw[f] = v * (1 + 0.0042 * Math.max(0, hum - 35)) * (1 + nz2[f])
      if (drop && f >= drop[0] && (drop[1] == null || f < drop[1])) online[f] = 0
    }
    return { ...s, corrected, raw, rh, online }
  })

  // pin the headline peak exactly ------------------------------------------
  if (sc.pin) {
    const ps = out.find((s) => s.key === sc.pin.key)
    const k = sc.pin.value / ps.corrected[sc.pin.frame]
    for (let f = sc.pin.frame - 16; f <= sc.pin.frame + 16; f++) {
      const w = 1 + (k - 1) * Math.exp(-(((f - sc.pin.frame) / 7) ** 2))
      ps.corrected[f] *= w
      ps.raw[f] *= w
    }
    for (const s of out) {
      for (let f = 0; f < N; f++) {
        const cap = s === ps ? sc.pin.value - 3 - 2.5 * Math.min(Math.abs(f - sc.pin.frame), 4) : sc.pin.value - 17
        if (!(s === ps && f === sc.pin.frame) && s.corrected[f] > cap) {
          const k2 = cap / s.corrected[f]
          s.corrected[f] = cap
          s.raw[f] *= k2
        }
      }
    }
    ps.corrected[sc.pin.frame] = sc.pin.value
  }
  for (const s of out) {
    for (let f = 0; f < N; f++) {
      s.corrected[f] = Math.round(s.corrected[f] * 10) / 10
      s.raw[f] = Math.round(s.raw[f] * 10) / 10
      s.rh[f] = Math.round(s.rh[f])
    }
  }
  for (let f = 0; f < N; f++) regional.corrected[f] = Math.round(regional.corrected[f] * 10) / 10

  // derived network series --------------------------------------------------
  const series = {}
  for (const metric of ['corrected', 'raw']) {
    const school = new Float32Array(N)
    const median = new Float32Array(N)
    for (let f = 0; f < N; f++) {
      const sch = out.filter((s) => s.school && s.online[f]).map((s) => s[metric][f])
      school[f] = sch.length ? sch.reduce((a, b) => a + b, 0) / sch.length : NaN
      const all = out.filter((s) => s.online[f]).map((s) => s[metric][f]).sort((a, b) => a - b)
      const m = all.length >> 1
      median[f] = all.length % 2 ? all[m] : (all[m - 1] + all[m]) / 2
    }
    series[metric] = { school, median }
  }
  const offline = new Uint8Array(N)
  for (let f = 0; f < N; f++) offline[f] = out.reduce((n, s) => n + (s.online[f] ? 0 : 1), 0)

  // headline peak ------------------------------------------------------------
  let peak = { value: -1, frame: 0, sensor: null }
  for (const s of out)
    for (let f = 0; f < N; f++) if (s.online[f] && s.corrected[f] > peak.value) peak = { value: s.corrected[f], frame: f, sensor: s.key }

  return { N, sensors: out, regional, series, offline, peak }
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------
export const f = (day, h, m = 0) => day * 144 + h * 6 + Math.round(m / 10) // day = days since start

export function smokeWeekScenario() {
  const peakF = f(4, 2, 40) // Tue Sep 15 2:40 a.m.
  const onset = f(3, 22, 30) // Mon Sep 14 10:30 p.m.
  const surgeNoise = mulberry32(99)
  const jitter = Array.from({ length: 1008 }, () => 1 + 0.07 * gauss(surgeNoise))
  return {
    seed: 14,
    frames: 1008,
    sensorCount: 46,
    startHour: 0,
    regional: [
      [0, 6], [12, 7], [16, 9], [19, 18], [22, 29], [24, 33],
      [30, 40], [36, 44], [42, 48], [48, 46],
      [54, 49], [60, 38], [66, 43], [72, 45],
      [78, 52], [84, 40], [90, 37], [96, 36],
      [99, 41], [101, 54], [101.8, 82], [102.6, 104], [103.2, 110], [104.5, 128], [108, 152], [114, 140], [120, 114],
      [126, 104], [132, 122], [138, 94], [144, 66],
      [150, 42], [156, 22], [162, 15], [168, 11],
    ],
    surges: [
      {
        cx: HOTSPOT.x,
        cy: HOTSPOT.y,
        sigma: 82,
        amp: 228,
        g: (fr) => {
          if (fr < onset - 4) return 0
          if (fr <= peakF) return Math.pow(smooth((fr - (onset - 4)) / (peakF - onset + 4)), 1.5) * jitter[fr]
          return Math.exp(-(fr - peakF) / 11) * jitter[fr]
        },
      },
    ],
    dropouts: {
      M3: [f(2, 6, 20), null], // Millrace, Sun-Mon
      A4: [f(2, 21, 50), f(3, 9, 0)], // Alder Terrace, back Monday morning
      S4: [f(3, 14, 30), null], // Sycamore Hill
      L9: [f(4, 3, 20), f(4, 14, 0)], // a few doors from the school, 40 minutes after the peak
      C5: [f(4, 13, 40), f(5, 8, 30)], // Cooper's Ferry
    },
    pin: { key: 'L-s1', frame: peakF, value: 287 },
  }
}

export function fireworksScenario() {
  // Fri Jul 3 12:00 -> Mon Jul 6 12:00, 2026
  const r = mulberry32(704)
  const burst = (center) => {
    const bursts = []
    for (let i = 0; i < 26; i++) bursts.push([f(1, 9, 10) + Math.round(r() * 16), 0.25 + r() * 0.75])
    return (fr) => {
      let g = 0
      for (const [t0, a] of bursts) if (fr >= t0) g += a * Math.exp(-(fr - t0) / 5) * 0.34
      if (fr > f(1, 9, 0)) g += 0.28 * smooth((fr - f(1, 9, 0)) / 20) * Math.exp(-Math.max(0, fr - f(1, 11, 50)) / 30)
      return Math.min(1.05, g)
    }
  }
  const small = (t0, t1) => (fr) => (fr >= t0 && fr <= t1 ? 0.13 * Math.sin(((fr - t0) / (t1 - t0)) * Math.PI) : 0)
  return {
    seed: 4,
    frames: 432,
    sensorCount: 44,
    startHour: 12,
    regional: [[0, 9], [12, 10], [24, 8], [32, 8], [35, 12], [37, 20], [40, 24], [44, 14], [50, 9], [72, 8], [80, 8], [84, 9], [96, 8], [120, 8], [144, 8]],
    surges: [
      { cx: 386, cy: 181, sigma: 85, amp: 150, g: burst() }, // Linden Park
      { cx: 330, cy: 70, sigma: 70, amp: 90, g: burst() }, // Foundry Row lot
      { cx: 300, cy: 60, sigma: 160, amp: 40, g: small(f(0, 9, 0), f(0, 11, 30)) },
      { cx: 500, cy: 300, sigma: 120, amp: 35, g: small(f(2, 9, 10), f(2, 11, 0)) },
    ],
    dropouts: { C5: [f(2, 0, 0), f(2, 6, 0)] },
    pin: null,
  }
}

export function harlowScenario() {
  // Fri Aug 22 -> Tue Aug 26 2025, 5 days
  return {
    seed: 25,
    frames: 720,
    sensorCount: 38,
    startHour: 0,
    regional: [
      [0, 8], [14, 10], [24, 18], [32, 44], [40, 78], [47, 102], [52, 96], [60, 128], [66, 175], [72, 168],
      [80, 150], [90, 164], [96, 148], [104, 126], [112, 110], [120, 70], [132, 40], [144, 28],
    ],
    surges: [{ cx: 560, cy: 200, sigma: 140, amp: 40, g: (fr) => (fr > f(1, 20, 0) && fr < f(2, 14, 0) ? smooth((fr - f(1, 20, 0)) / 30) * (1 - smooth((fr - f(2, 8, 0)) / 36)) : 0) }],
    dropouts: { F4: [f(2, 4, 0), f(3, 6, 0)], M3: [f(3, 12, 0), null] },
    pin: null,
  }
}
