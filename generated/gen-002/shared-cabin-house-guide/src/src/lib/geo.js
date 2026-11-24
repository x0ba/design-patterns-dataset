// Plane geometry for the site map. Coordinates are metres: x east, y north.

export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Compass bearing (0 = N, 90 = E) from a to b, in degrees.
export function bearing(a, b) {
  const deg = (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compass(deg) {
  return POINTS[Math.round(deg / 22.5) % 16];
}

// Human phrasing like "30 m W of the boathouse".
export function describeFrom(from, to) {
  const d = Math.round(distance(from, to));
  const dir = compass(bearing(from, to));
  return `${d} m ${dir}`;
}
