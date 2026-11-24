import { PINS } from '../data/pins.js';
import { STEPS } from '../data/steps.js';
import { NOTES } from '../data/notes.js';
import { FLOORS, ROOM_LABEL, BUILDINGS, BOATHOUSE_REF } from '../data/property.js';
import { PIN_TYPES } from '../data/types.js';
import { describeFrom } from './geo.js';

export const PIN_BY_ID = Object.fromEntries(PINS.map((p) => [p.id, p]));

export function shortTitle(title) {
  return title.split(/ [–—] | \(/)[0];
}

export const FLOOR_LABEL = {
  ground: 'Ground floor',
  upper: 'Upper floor',
  crawl: 'Crawlspace',
  site: 'Property',
};

// "Utility room · Ground floor", "Crawlspace · north wall", "Property · 30 m W of boathouse".
export function pinLocation(pin) {
  if (pin.loc === 'site') {
    const b = BOATHOUSE_REF;
    return `Property · ${describeFrom(b, pin)} of the boathouse`;
  }
  if (pin.loc === 'crawl') return 'Crawlspace';
  return `${ROOM_LABEL[pin.room]} · ${FLOOR_LABEL[pin.loc]}`;
}

export function pinPlaceLabel(pin) {
  if (pin.loc === 'site') return 'On the property';
  return ROOM_LABEL[pin.room] || FLOOR_LABEL[pin.loc];
}

export function stepsForPin(pinId) {
  return STEPS.filter((s) => s.pins.includes(pinId));
}

export function notesForPins(pinIds, notes = NOTES) {
  return notes.filter((n) => (n.pins || []).some((p) => pinIds.includes(p)));
}

export function floorOfPin(pin) {
  return pin.loc === 'site' ? null : pin.loc;
}

export function buildingOfSite(pin) {
  return BUILDINGS.find(
    (b) => pin.x >= b.x && pin.x <= b.x + b.w && pin.y >= b.y && pin.y <= b.y + b.h,
  );
}

export const FLOOR_LIST = Object.values(FLOORS);
export { PIN_TYPES };
