// PM2.5 categories (US EPA 2024 breakpoints, µg/m³), plain-language names.
export const CATS = [
  { key: 'good', name: 'Good', short: 'Good', range: '0–9', max: 9.0, fill: '#5db36b', ink: '#10231a' },
  { key: 'moderate', name: 'Moderate', short: 'Moderate', range: '9–35', max: 35.4, fill: '#f3d54e', ink: '#2a2406' },
  { key: 'usg', name: 'Unhealthy for sensitive groups', short: 'Sensitive groups', range: '36–55', max: 55.4, fill: '#f29a3d', ink: '#2c1703' },
  { key: 'unhealthy', name: 'Unhealthy', short: 'Unhealthy', range: '56–125', max: 125.4, fill: '#cc3b32', ink: '#ffffff' },
  { key: 'very', name: 'Very unhealthy', short: 'Very unhealthy', range: '126–225', max: 225.4, fill: '#80359a', ink: '#ffffff' },
  { key: 'haz', name: 'Hazardous', short: 'Hazardous', range: '226+', max: Infinity, fill: '#651a2c', ink: '#ffffff' },
]
export function cat(v) {
  for (const c of CATS) if (v <= c.max) return c
  return CATS[CATS.length - 1]
}
export const fmt = (v) => (Number.isFinite(v) ? Math.round(v).toString() : '–')
