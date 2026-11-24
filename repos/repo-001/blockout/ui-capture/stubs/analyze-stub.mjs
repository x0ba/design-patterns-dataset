// Stand-in for src/main/analyze.ts (Claude vision + structured output).
// Returns the same { ok, layout } shape the real call produces, picking a
// plausible staging based on the reference file's name.

const LAYOUTS = [
  {
    match: /diner|cafe|coffee|booth|restaurant/i,
    layout: {
      entities: [
        { assetId: 'env.diner', x: 0, z: 0, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 },
        { assetId: 'furniture.kitchenTable', x: 0.2, z: -2.4, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 },
        { assetId: 'person.woman', x: -0.5, z: -2.4, rotationDeg: 270, pose: 'sit', label: 'MARGO', labelColor: '#e5484d', scale: 1 },
        { assetId: 'person.man', x: 0.9, z: -2.4, rotationDeg: 90, pose: 'sit', label: 'DESMOND', labelColor: '#3b82f6', scale: 1 },
        { assetId: 'prop.mug', x: -0.15, z: -2.35, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 },
        { assetId: 'prop.mug', x: 0.55, z: -2.45, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 },
        { assetId: 'person.elderly', x: 2.6, z: -4.1, rotationDeg: 200, pose: 'stand', label: 'WAITRESS', labelColor: '#f5a524', scale: 1 }
      ],
      lighting: 'interiorWarm',
      camera: { x: 2.1, y: 1.25, z: 0.6, panDeg: 38, tiltDeg: -6, focalLength: 40 },
      notes:
        'Two-shot across a diner booth, camera at seated eye-line from the aisle. Waitress is soft in the background — swap to a longer lens if you want her compressed closer.'
    }
  },
  {
    match: /street|alley|night|car|chase/i,
    layout: {
      entities: [
        { assetId: 'env.alley', x: 0, z: 0, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 },
        { assetId: 'person.man', x: -0.6, z: -6, rotationDeg: 180, pose: 'stand', label: 'RUNNER', labelColor: '#e5484d', scale: 1 },
        { assetId: 'person.man', x: 0.8, z: -11, rotationDeg: 180, pose: 'stand', label: 'COP', labelColor: '#3b82f6', scale: 1 },
        { assetId: 'prop.dumpster', x: 2.2, z: -4.5, rotationDeg: 90, pose: 'stand', label: '', labelColor: '', scale: 1 },
        { assetId: 'prop.trashcan', x: -2.1, z: -3, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 },
        { assetId: 'prop.streetlightSingle', x: -2.6, z: -9, rotationDeg: 90, pose: 'stand', label: '', labelColor: '', scale: 1 }
      ],
      lighting: 'night',
      camera: { x: 0, y: 1.1, z: 1.5, panDeg: 0, tiltDeg: 2, focalLength: 85 },
      notes:
        'Long-lens head-on chase down an alley — the 85mm stacks the pursuer right behind the runner. Low camera, single sodium streetlight as key.'
    }
  }
]

const DEFAULT = {
  entities: [
    { assetId: 'env.houseInterior', x: 0, z: 0, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 },
    { assetId: 'furniture.couch', x: 0, z: -3.2, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 },
    { assetId: 'person.woman', x: -0.4, z: -3.1, rotationDeg: 0, pose: 'sit', label: 'JUNE', labelColor: '#a855f7', scale: 1 },
    { assetId: 'person.man', x: 1.6, z: -1.6, rotationDeg: 300, pose: 'stand', label: 'THEO', labelColor: '#46a758', scale: 1 },
    { assetId: 'furniture.lamp', x: -1.5, z: -3.4, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 },
    { assetId: 'furniture.sideTable', x: -1.4, z: -3.2, rotationDeg: 0, pose: 'stand', label: '', labelColor: '', scale: 1 }
  ],
  lighting: 'interiorWarm',
  camera: { x: -1.2, y: 1.4, z: 1.8, panDeg: -12, tiltDeg: -8, focalLength: 32 },
  notes:
    'Living-room confrontation: she stays seated, he stands over her screen-right. Camera slightly high and wide to keep both in a single frame; the practical lamp reads as the key.'
}

export async function analyzeStub(fileName) {
  // Real calls take ~30–90 s; keep a short beat so the toast is visible.
  await new Promise((r) => setTimeout(r, 2500))
  const hit = LAYOUTS.find((l) => l.match.test(fileName))
  return { ok: true, layout: structuredClone(hit ? hit.layout : DEFAULT) }
}
