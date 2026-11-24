import { Place, HAWORTH_CENTER, POLAR_SCOUT, POLAR_SCOUT_BEARING, POLAR_SCOUT_GAP_KM } from '../data';
import { destination, distanceKm, toVec, fromVec, norm, add, V3 } from './geo';
import { FlyOpts, rangeForViewKm } from '../engine/Engine';

export type Tab = 'about' | 'sun' | 'compare';

export function midpoint(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const m = norm(add(toVec(a.lat, a.lon), toVec(b.lat, b.lon)) as V3);
  return fromVec(m);
}

export function haworthRimPoint() {
  return destination(HAWORTH_CENTER.lat, HAWORTH_CENTER.lon, POLAR_SCOUT_BEARING, HAWORTH_CENTER.diameter / 2);
}

export function viewFor(place: Place, tab: Tab, compare: Place | null, closeUp: boolean): FlyOpts {
  if (tab === 'compare' && compare) {
    const m = midpoint(place, compare);
    const d = distanceKm(place.lat, place.lon, compare.lat, compare.lon);
    return { ...m, range: Math.min(4.9, rangeForViewKm(Math.max(d * 2.1, 500))), tilt: 0, duration: 2.0 };
  }
  const isFeature = place.type === 'feature';
  if (place.key === 'f:haworth' || (place.key === 'r:polar-scout' && closeUp)) {
    if (closeUp) {
      const rim = haworthRimPoint();
      const mid = destination(rim.lat, rim.lon, POLAR_SCOUT_BEARING, POLAR_SCOUT_GAP_KM / 2);
      return { ...mid, range: rangeForViewKm(10.5), tilt: 0, duration: 1.8 };
    }
    if (tab === 'sun') {
      const c = destination(HAWORTH_CENTER.lat, HAWORTH_CENTER.lon, 180, 6);
      return { ...c, range: rangeForViewKm(118), tilt: 52, duration: 1.8 };
    }
    const c = destination(HAWORTH_CENTER.lat, HAWORTH_CENTER.lon, 180, 22);
    return { ...c, range: rangeForViewKm(138), tilt: 0, duration: 1.6 };
  }
  if (place.key === 'r:polar-scout') {
    const c = destination(POLAR_SCOUT.lat, POLAR_SCOUT.lon, POLAR_SCOUT_BEARING + 180, 9);
    return { ...c, range: rangeForViewKm(46), tilt: tab === 'sun' ? 45 : 0, duration: 1.6 };
  }
  let viewKm = 150;
  if (isFeature) {
    const f = place.feature!;
    viewKm = Math.max(f.diameter * (f.kind === 'crater' ? 2.3 : 1.35), f.parent ? 24 : 34);
  }
  const tilt = tab === 'sun' && isFeature && place.feature!.kind === 'crater' ? 42 : 0;
  return { lat: place.lat, lon: place.lon, range: rangeForViewKm(viewKm), tilt, duration: 1.8 };
}
