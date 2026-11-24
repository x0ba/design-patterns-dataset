// Generates the LRT timetable the app's /api/lrt/state function reads.
// The real timetable lives in the maintainer's private data repo (see
// .gitignore: trips-*.json), so this builds an equivalent one from the
// published MLM service pattern: first trains 06:30, last departures 23:15
// (Mon–Thu) / 23:59 (Fri, Sat–Sun), denser headways in the commuter peaks,
// run times from the real track length between stations, 25–35 s dwells.
// Output: .ui-capture/lrt-data/trips-{mon_thu,friday,sat_sun}.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const require = createRequire(resolve(repo, 'package.json'))
const nearestPointOnLine = require('@turf/nearest-point-on-line').default
const lineLength = require('@turf/length').default

const lines = JSON.parse(readFileSync(resolve(repo, 'public/data/lrt-lines.json'), 'utf8'))
const stations = new Map(JSON.parse(readFileSync(resolve(repo, 'public/data/stations.json'), 'utf8')).map(s => [s.id, s]))

// Deterministic jitter so the timetable looks hand-made rather than computed.
let seed = 20261117
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)

// Headway (minutes) by line, schedule type and minute of day.
function headway(lineId, type, m) {
  const weekday = type !== 'sat_sun'
  const amPeak = m >= 7 * 60 + 30 && m < 9 * 60 + 30
  const pmPeak = m >= 17 * 60 + 30 && m < 19 * 60 + 30
  const late = m >= 22 * 60
  const early = m < 7 * 60
  if (lineId === 'taipa') {
    if (early || late) return 10
    if (weekday && (amPeak || pmPeak)) return 4
    return weekday ? 6 : 5
  }
  if (lineId === 'hengqin') {
    if (early || late) return 12
    if (weekday && (amPeak || pmPeak)) return 6
    return 8
  }
  // seac_pai_van
  if (early || late) return 12
  if (weekday && (amPeak || pmPeak)) return 8
  return 10
}

function stationKm(line) {
  const len = lineLength(line.geometry, { units: 'kilometers' })
  const kms = line.stations.map(id => {
    const s = stations.get(id)
    const p = nearestPointOnLine(line.geometry, { type: 'Point', coordinates: s.coordinates }, { units: 'kilometers' })
    return p.properties.location
  })
  return { len, kms }
}

function buildTrips(type) {
  const trips = []
  const lastDep = type === 'mon_thu' ? 23 * 60 + 15 : 23 * 60 + 59
  for (const line of lines) {
    const { kms } = stationKm(line)
    for (const direction of ['forward', 'backward']) {
      const order = direction === 'forward' ? line.stations.map((id, i) => [id, kms[i]]) : line.stations.map((id, i) => [id, kms[i]]).reverse()
      // Seac Pai Van and Hengqin are short shuttles; offset them so the
      // trains interleave with the Taipa Line at Union Hospital / Lotus.
      let t = 6 * 60 + 30 + (direction === 'backward' ? 2 : 0) + (line.id === 'taipa' ? 0 : 3)
      let n = 0
      while (t <= lastDep) {
        const entries = []
        let clock = t
        order.forEach(([stationId, km], i) => {
          if (i > 0) {
            const dist = Math.abs(km - order[i - 1][1])
            // ~36 km/h average between stops, plus accel/brake allowance.
            clock += (dist / 36) * 60 + 0.45
          }
          const arrival = Math.round(clock * 100) / 100
          const terminal = i === order.length - 1
          const dwell = i === 0 ? 0.5 : terminal ? 0.5 : (25 + Math.round(rand() * 10)) / 60
          const departure = Math.round((arrival + dwell) * 100) / 100
          entries.push({ stationId, arrivalMinutes: arrival, departureMinutes: departure })
          clock = departure
        })
        trips.push({ id: `${line.id}-${type}-${direction === 'forward' ? 'f' : 'b'}-${String(++n).padStart(3, '0')}`, lineId: line.id, direction, scheduleType: type, entries })
        t += headway(line.id, type, t)
      }
    }
  }
  return trips
}

const outDir = resolve(here, 'lrt-data')
mkdirSync(outDir, { recursive: true })
for (const type of ['mon_thu', 'friday', 'sat_sun']) {
  const trips = buildTrips(type)
  writeFileSync(resolve(outDir, `trips-${type}.json`), JSON.stringify(trips))
  console.log(type, trips.length, 'trips')
}
