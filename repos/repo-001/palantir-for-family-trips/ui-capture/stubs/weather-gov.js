// Generates static api.weather.gov-shaped JSON documents (points, forecast,
// hourly forecast, stations, latest observation) for the two locations the app
// asks about. Emitted into the static build under /__stub/weather.gov/.
export const WEATHER_STUB_ROOT = '/__stub/weather.gov'

const TARGETS = [
  { lat: 37.8586, lng: -120.2142, office: 'STO', gx: 94, gy: 52, city: 'Groveland', station: 'KO22', stationName: 'Columbia Airport', baseHigh: 58, baseLow: 34 },
  { lat: 37.8108, lng: -119.8744, office: 'HNX', gx: 61, gy: 118, city: 'Yosemite Valley', station: 'YYVC1', stationName: 'Yosemite Valley', baseHigh: 51, baseLow: 29 },
]

const PATTERN = [
  { day: 'Sunny', night: 'Clear', d: 0 },
  { day: 'Mostly Sunny', night: 'Mostly Clear', d: 1 },
  { day: 'Partly Sunny', night: 'Partly Cloudy', d: -2 },
  { day: 'Chance Rain Showers', night: 'Rain Showers Likely', d: -7, pop: 40 },
  { day: 'Rain Showers Likely', night: 'Chance Rain Showers', d: -10, pop: 60 },
  { day: 'Mostly Sunny', night: 'Mostly Clear', d: -4 },
  { day: 'Sunny', night: 'Clear', d: -1 },
  { day: 'Sunny', night: 'Clear', d: 2 },
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function isoLocal(date) {
  // Pacific Standard Time offset (-08:00) as NWS returns for these offices in winter.
  const t = new Date(date.getTime() - 8 * 3600 * 1000)
  return `${t.toISOString().slice(0, 19)}-08:00`
}

function forecastPeriods(t, now) {
  const start = new Date(now); start.setUTCHours(14, 0, 0, 0) // 6 AM PST
  const periods = []
  for (let i = 0; i < 14; i += 1) {
    const dayIdx = Math.floor(i / 2); const isDay = i % 2 === 0
    const p = PATTERN[dayIdx % PATTERN.length]
    const s = new Date(start.getTime() + i * 12 * 3600 * 1000); const e = new Date(s.getTime() + 12 * 3600 * 1000)
    const dn = DAY_NAMES[new Date(s.getTime() - 8 * 3600 * 1000).getUTCDay()]
    const temp = isDay ? t.baseHigh + p.d : t.baseLow + Math.round(p.d / 2)
    const short = isDay ? p.day : p.night
    periods.push({
      number: i + 1,
      name: i === 0 ? 'Today' : i === 1 ? 'Tonight' : isDay ? dn : `${dn} Night`,
      startTime: isoLocal(s), endTime: isoLocal(e), isDaytime: isDay,
      temperature: temp, temperatureUnit: 'F', temperatureTrend: '',
      probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: p.pop ? (isDay ? p.pop : p.pop - 10) : null },
      windSpeed: isDay ? '5 to 10 mph' : '0 to 5 mph', windDirection: isDay ? 'W' : 'E',
      icon: `https://api.weather.gov/icons/land/${isDay ? 'day' : 'night'}/${p.pop ? 'rain_showers' : 'few'},${p.pop || 0}?size=medium`,
      shortForecast: short,
      detailedForecast: `${short}, with a ${isDay ? 'high' : 'low'} near ${temp}. ${isDay ? 'West wind 5 to 10 mph.' : 'Light east wind.'}${p.pop ? ` Chance of precipitation is ${p.pop}%.` : ''}`,
    })
  }
  return periods
}

function hourlyPeriods(t, now) {
  const start = new Date(now); start.setUTCMinutes(0, 0, 0)
  const out = []
  for (let i = 0; i < 48; i += 1) {
    const s = new Date(start.getTime() + i * 3600 * 1000)
    const hour = (s.getUTCHours() + 16) % 24
    const curve = Math.sin(((hour - 9) / 24) * Math.PI * 2)
    const temp = Math.round((t.baseHigh + t.baseLow) / 2 + curve * ((t.baseHigh - t.baseLow) / 2))
    const isDay = hour >= 7 && hour < 17
    out.push({
      number: i + 1, name: '', startTime: isoLocal(s), endTime: isoLocal(new Date(s.getTime() + 3600 * 1000)), isDaytime: isDay,
      temperature: temp, temperatureUnit: 'F', temperatureTrend: '',
      probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: 2 },
      dewpoint: { unitCode: 'wmoUnit:degC', value: -1.7 }, relativeHumidity: { unitCode: 'wmoUnit:percent', value: isDay ? 38 : 71 },
      windSpeed: isDay ? '7 mph' : '3 mph', windDirection: isDay ? 'W' : 'ENE',
      icon: `https://api.weather.gov/icons/land/${isDay ? 'day' : 'night'}/few?size=small`,
      shortForecast: isDay ? 'Sunny' : 'Clear', detailedForecast: '',
    })
  }
  return out
}

export function buildWeatherFiles(now = new Date()) {
  const files = {}
  const root = WEATHER_STUB_ROOT
  TARGETS.forEach((t) => {
    const grid = `${root}/gridpoints/${t.office}/${t.gx},${t.gy}`
    const stationUrl = `${root}/stations/${t.station}`
    files[`points/${t.lat},${t.lng}`] = {
      '@context': ['https://geojson.org/geojson-ld/geojson-context.jsonld'],
      id: `https://api.weather.gov/points/${t.lat},${t.lng}`, type: 'Feature',
      geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
      properties: {
        '@id': `https://api.weather.gov/points/${t.lat},${t.lng}`, cwa: t.office, gridId: t.office, gridX: t.gx, gridY: t.gy,
        forecast: `${grid}/forecast`, forecastHourly: `${grid}/forecast-hourly`, forecastGridData: grid,
        observationStations: `${grid}/stations`,
        relativeLocation: { type: 'Feature', geometry: { type: 'Point', coordinates: [t.lng, t.lat] }, properties: { city: t.city, state: 'CA', distance: { unitCode: 'wmoUnit:m', value: 2410 }, bearing: { unitCode: 'wmoUnit:degree_(angle)', value: 112 } } },
        timeZone: 'America/Los_Angeles', radarStation: t.office === 'STO' ? 'KDAX' : 'KHNX',
      },
    }
    const gen = { updateTime: isoLocal(new Date(now.getTime() - 50 * 60 * 1000)), generatedAt: isoLocal(now), units: 'us', forecastGenerator: 'BaselineForecastGenerator', elevation: { unitCode: 'wmoUnit:m', value: t.office === 'STO' ? 914.4 : 1219.2 } }
    files[`gridpoints/${t.office}/${t.gx},${t.gy}/forecast`] = { type: 'Feature', properties: { ...gen, periods: forecastPeriods(t, now) } }
    files[`gridpoints/${t.office}/${t.gx},${t.gy}/forecast-hourly`] = { type: 'Feature', properties: { ...gen, forecastGenerator: 'HourlyForecastGenerator', periods: hourlyPeriods(t, now) } }
    files[`gridpoints/${t.office}/${t.gx},${t.gy}/stations`] = {
      type: 'FeatureCollection',
      features: [{ id: stationUrl, type: 'Feature', geometry: { type: 'Point', coordinates: [t.lng + 0.05, t.lat + 0.08] }, properties: { '@id': stationUrl, stationIdentifier: t.station, name: t.stationName, timeZone: 'America/Los_Angeles' } }],
    }
    files[`stations/${t.station}/observations/latest`] = {
      id: `${stationUrl}/observations/latest`, type: 'Feature',
      properties: {
        station: stationUrl, timestamp: isoLocal(new Date(now.getTime() - 35 * 60 * 1000)),
        textDescription: t.office === 'STO' ? 'Clear' : 'Mostly Clear',
        temperature: { unitCode: 'wmoUnit:degC', value: t.office === 'STO' ? 11.1 : 6.7, qualityControl: 'V' },
        dewpoint: { unitCode: 'wmoUnit:degC', value: -2.2, qualityControl: 'V' },
        windDirection: { unitCode: 'wmoUnit:degree_(angle)', value: 270 },
        windSpeed: { unitCode: 'wmoUnit:km_h-1', value: 9.36, qualityControl: 'V' },
        relativeHumidity: { unitCode: 'wmoUnit:percent', value: 39.4 },
      },
    }
  })
  return files
}
