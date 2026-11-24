// Pin types, with the colour used for markers and chips.
export const PIN_TYPES = {
  Shutoff: { color: '#b4532a', hint: 'Valves that stop water or gas' },
  Electrical: { color: '#b98100', hint: 'Breakers, switches and plugs' },
  Drain: { color: '#2b6f8e', hint: 'Drain valves, traps and taps to open' },
  Appliance: { color: '#56606b', hint: 'Appliances with a manual pinned to them' },
  Propane: { color: '#8a5a2b', hint: 'Propane tank and gas controls' },
  Septic: { color: '#6f7a2a', hint: 'Septic tank and cleanout' },
  Chimney: { color: '#7d3b2a', hint: 'Chimney and damper' },
  Access: { color: '#7a4f7a', hint: 'Hatches, gates, keys' },
  Quirk: { color: '#a13d6b', hint: 'Things that behave oddly' },
  Safety: { color: '#c0262d', hint: 'Extinguishers and alarms' },
  Outdoor: { color: '#3d7a4f', hint: 'Other outside items' },
};

export const TYPE_NAMES = Object.keys(PIN_TYPES);
