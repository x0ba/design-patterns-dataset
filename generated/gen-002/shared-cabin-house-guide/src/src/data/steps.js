// Fall closing procedure: 22 steps. Each step is tied to one or more pins.
// Four steps were marked "changed 2025" by Pete; those carry changedNote.
// done: state at the moment the app opens (Saturday 14 Nov 2026, afternoon).

export const STEP_GROUPS = [
  { id: 'power', label: 'Power and heat', steps: [1, 4] },
  { id: 'water', label: 'Water system', steps: [5, 11] },
  { id: 'outside', label: 'Outdoor shower', steps: [12, 14] },
  { id: 'traps', label: 'Traps and heat tape', steps: [15, 17] },
  { id: 'close', label: 'Boathouse, propane and close-up', steps: [18, 22] },
];

export const STEPS = [
  {
    n: 1, title: 'Check the main panel',
    how: 'Open the mudroom panel. Confirm all 24 circuits are labelled and the printed schedule is still taped inside the door.',
    pins: ['M1'], done: { by: 'Ellen', at: '2026-11-14T13:50' },
  },
  {
    n: 2, title: 'Set the furnace thermostat to OFF',
    how: 'Set it to OFF rather than HEAT. The furnace stays off until you turn the propane back on in spring.',
    pins: ['L2'], done: { by: 'Ellen', at: '2026-11-14T14:05' },
  },
  {
    n: 3, title: 'Switch off water heater breaker #9',
    how: 'Turn off breaker #9 before you drain the Rheem, so the elements never fire with no water in the tank.',
    pins: ['M3'], done: { by: 'Ellen', at: '2026-11-14T14:12' },
  },
  {
    n: 4, title: 'Switch off well pump breaker #14',
    how: 'Turn breaker #14 off before you close the main, so the pump is not running with no water flowing.',
    pins: ['M2'], changedNote: 'The 2025 panel rewire renumbered this circuit. It was #12; the label now reads WELL PUMP.',
    done: { by: 'Ellen', at: '2026-11-14T14:31' },
  },
  {
    n: 5, title: 'Close the main water shutoff',
    how: 'Turn the red handle a quarter-turn until it lies across the pipe. Do not use the green-handle valve on the right of the pressure tank.',
    pins: ['G1'], lookalikes: ['G2'],
    lookNote: 'Two valves by the pressure tank. The red one on the left is the main. The green one on the right only isolates the tank.',
  },
  {
    n: 6, title: 'Open the highest tap to start draining',
    how: 'Open the upstairs Bath 2 sink and leave it open. It is the high point of the system, so opening it lets the lines drain back down.',
    pins: ['U1'],
  },
  {
    n: 7, title: 'Open the kitchen tap',
    how: 'Open the kitchen tap and leave it open for the rest of the draining.',
    pins: ['K1'],
  },
  {
    n: 8, title: 'Drain the pressure tank',
    how: 'Open the brass cock at the base of the tank into a bucket or floor drain until it stops dripping. Leave it open.',
    pins: ['G3'],
  },
  {
    n: 9, title: 'Drain the water heater',
    how: 'Attach a hose to the drain valve at the base of the Rheem and run it to the floor drain. Open a hot tap first so air can get in.',
    pins: ['G5'],
  },
  {
    n: 10, title: 'Open the bunkhouse drain valve',
    how: 'Under the north crawlspace hatch, 1.5 m in. Turn the ball valve to open. Leave it open all winter.',
    pins: ['C2'], changedNote: 'The valve moved from under the bunkhouse floor to the north hatch, 1.5 m in. You no longer need to crawl under the bunkhouse.',
  },
  {
    n: 11, title: 'Open the bunkhouse sink tap',
    how: 'Open the bunkhouse kitchen tap after the drain valve. Leave it open, or the lines will not empty.',
    pins: ['S17'],
  },
  {
    n: 12, title: 'Close the outdoor shower supply valve',
    how: 'In the crawlspace, east side. Close it before you open the low-point drain.',
    pins: ['C3'],
  },
  {
    n: 13, title: 'Open the outdoor shower low-point drain',
    how: 'Open the drain in the crawlspace after the supply valve is closed. Water runs out here, not from the shower head.',
    pins: ['C4'],
  },
  {
    n: 14, title: 'Blow out the outdoor shower lines',
    how: 'Connect the compressor at the blowout port on the cabin’s east wall. Run it until no water comes out of the shower head. Keep under 40 psi.',
    pins: ['S4'],
  },
  {
    n: 15, title: 'Put RV antifreeze in the traps',
    how: 'Kitchen sink, Bath 1 shower and Bath 2 tub. Pour non-toxic RV antifreeze into each drain until it shows at the opening.',
    pins: ['K2', 'T1', 'U3'], changedNote: 'Use non-toxic RV antifreeze in the traps, not automotive antifreeze.',
  },
  {
    n: 16, title: 'Empty toilets and add antifreeze to the bowls',
    how: 'Flush each toilet until the tank is empty, then pour a cup of antifreeze into the bowl. Bath 1 and Bath 2.',
    pins: ['T2', 'U2'],
  },
  {
    n: 17, title: 'Unplug the heat tape',
    how: 'Unplug the heat tape in the crawlspace once the lines are empty. Heat tape left on in a dry line can overheat.',
    pins: ['C5'],
  },
  {
    n: 18, title: 'Turn off the boat lift',
    how: 'Lower the lift fully, switch off the power switch inside the boathouse, then turn off breaker #21 in the mudroom panel.',
    pins: ['M5', 'S8'],
  },
  {
    n: 19, title: 'Turn the propane down at the tank',
    how: 'Turn the service valve on top of the tank clockwise until it stops. Hand-tight only. The regulator at the house stays where it is.',
    pins: ['S1'], changedNote: 'Close the valve at the tank, not the regulator at the house.',
  },
  {
    n: 20, title: 'Shut the gas control on the Rinnai',
    how: 'Turn the gas control knob inside the furnace cabinet to OFF. Do not turn it to PILOT.',
    pins: ['L3'],
  },
  {
    n: 21, title: 'Close the chimney damper',
    how: 'Push the lever in until it clicks. Check the damper is closed by looking up the flue with a flashlight.',
    pins: ['L4'],
  },
  {
    n: 22, title: 'Lock up and check the septic cap',
    how: 'Latch the north crawlspace hatch, check the septic cleanout cap is seated by the birch clump, and lock the front door.',
    pins: ['C1', 'S2'],
  },
];

export const STEP_BY_N = Object.fromEntries(STEPS.map((s) => [s.n, s]));
