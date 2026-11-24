/**
 * Seed generator: writes realistic .blockout project folders + global stage
 * presets into .ui-capture/data using Blockout's OWN engine (schema
 * factories, choreography engine, motion library, camera-move presets,
 * serializer) — the same code paths the app uses when a filmmaker stages
 * things by hand. Bundled with esbuild by seed/build.sh.
 */
import { mkdirSync, writeFileSync, rmSync, utimesSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  createProject,
  createScene,
  createShot,
  createEntity,
  createActorMark,
  createCameraMark,
  serializeProject,
  parseProject
} from '../../src/engine/schema'
import { newId } from '../../src/engine/ids'
import { ASSET_CATALOG } from '../../src/engine/assets'
import { buildRoutine, type RoutineSpec } from '../../src/engine/choreography'
import { choreographMotion } from '../../src/engine/sequences'
import { CAMERA_MOVE_PRESETS } from '../../src/engine/camera-moves'
import { ShotEvaluator } from '../../src/engine/evaluate'
import { headingOf } from '../../src/engine/path'
import type {
  ProjectDoc,
  Scene,
  Shot,
  Entity,
  GaitId,
  LightingPresetId,
  RigId,
  AspectId,
  BlockingTake,
  V3
} from '../../src/engine/types'

const DATA = resolve(process.argv[2] ?? join(process.cwd(), '.ui-capture', 'data'))
const PROJECTS = join(DATA, 'projects')
const PRESETS = join(DATA, 'presets')
const DEG = Math.PI / 180

/* ------------------------------ helpers ------------------------------- */

let rngState = 20251117
function rnd(): number {
  rngState = (rngState * 1664525 + 1013904223) >>> 0
  return rngState / 4294967296
}
const between = (a: number, b: number): number => a + (b - a) * rnd()

const C = {
  red: '#e5484d',
  amber: '#f5a524',
  green: '#46a758',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  teal: '#14b8a6',
  orange: '#f97316'
}

interface Ctx {
  scene: Scene
  take: BlockingTake
}

function newScene(doc: ProjectDoc, name: string, lighting: LightingPresetId, env?: Partial<Scene['environment']>): Ctx {
  const scene = createScene(doc.scenes.length + 1)
  scene.name = name
  scene.environment = { ...scene.environment, lighting, ...env }
  scene.shots = []
  doc.scenes.push(scene)
  return { scene, take: scene.blocking[0]! }
}

function put(
  ctx: Ctx,
  assetId: string,
  x: number,
  z: number,
  opts: {
    name?: string
    label?: string
    color?: string
    rotDeg?: number
    y?: number
    scale?: number
    params?: Record<string, number | string>
    exclude?: boolean
  } = {}
): Entity {
  if (!ASSET_CATALOG.some((a) => a.id === assetId)) throw new Error(`unknown asset ${assetId}`)
  const e = createEntity(assetId, opts.name ?? opts.label ?? defaultName(assetId), { x, y: opts.y ?? 0, z })
  if (opts.rotDeg !== undefined) e.transform.rotationY = opts.rotDeg * DEG
  if (opts.scale !== undefined) e.transform.scale = opts.scale
  if (opts.label) e.label = { text: opts.label, color: opts.color ?? C.amber }
  if (opts.params) e.params = opts.params
  if (opts.exclude) e.excludeFromExport = true
  ctx.scene.entities.push(e)
  return e
}

function defaultName(assetId: string): string {
  const tail = assetId.split('.')[1] ?? assetId
  return tail.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

function marry(child: Entity, parent: Entity): void {
  child.attachedTo = parent.id
  const dx = child.transform.position.x - parent.transform.position.x
  const dz = child.transform.position.z - parent.transform.position.z
  const c = Math.cos(-parent.transform.rotationY)
  const s = Math.sin(-parent.transform.rotationY)
  child.attachedLocal = {
    x: dx * c - dz * s,
    y: child.transform.position.y - parent.transform.position.y,
    z: dx * s + dz * c,
    rotY: child.transform.rotationY - parent.transform.rotationY
  }
}

/** Hand-blocked path: [x, z, time, gait?, hold?] */
type Beat = [number, number, number, GaitId?, number?]
function block(take: BlockingTake, e: Entity, beats: Beat[]): void {
  const marks = beats.map(([x, z, t, gait, hold]) => {
    const m = createActorMark({ x, y: 0, z }, t, gait ?? 'walk')
    if (hold) m.hold = hold
    return m
  })
  if (marks[0]) e.transform.position = { ...marks[0].position }
  let track = take.tracks.find((t) => t.entityId === e.id)
  if (!track) take.tracks.push((track = { entityId: e.id, marks: [] }))
  track.marks.push(...marks)
}

function motion(take: BlockingTake, e: Entity, presetId: string, duration: number, startT = 0): void {
  const marks = choreographMotion(presetId, { ...e.transform.position }, e.transform.rotationY, duration, startT)
  if (!marks) throw new Error(`unknown motion ${presetId}`)
  let track = take.tracks.find((t) => t.entityId === e.id)
  if (!track) take.tracks.push((track = { entityId: e.id, marks: [] }))
  track.marks.push(
    ...marks.map((m) => ({
      id: newId('mark'),
      time: m.time,
      hold: m.hold,
      easeIn: m.easeIn,
      easeOut: m.easeOut,
      position: { ...m.position },
      gait: m.gait as GaitId,
      joints: m.joints ? { ...m.joints } : undefined
    }))
  )
}

function routine(ctx: Ctx, spec: Omit<RoutineSpec, 'seed'> & { seed?: number }, at: { x: number; z: number; heading: number }, labels: [string, string][] = []): Entity[] {
  const specs = buildRoutine({ seed: Math.floor(rnd() * 1e9), ...spec } as RoutineSpec, { origin: at })
  const out: Entity[] = []
  specs.forEach((es, i) => {
    const e = createEntity(es.assetId, es.name, { ...es.position })
    e.transform.rotationY = es.rotationY
    const l = labels[i]
    if (l) {
      e.label = { text: l[0], color: l[1] }
      e.name = l[0]
    } else if (es.label) e.label = { ...es.label }
    ctx.scene.entities.push(e)
    out.push(e)
    if (es.marks.length)
      ctx.take.tracks.push({
        entityId: e.id,
        marks: es.marks.map((m) => ({
          id: newId('mark'),
          time: m.time,
          hold: m.hold,
          easeIn: m.easeIn,
          easeOut: m.easeOut,
          position: { ...m.position },
          gait: m.gait,
          arriveHeading: m.arriveHeading,
          joints: m.joints ? { ...m.joints } : undefined
        }))
      })
  })
  return out
}

interface ShotOpts {
  name: string
  duration: number
  aspect?: AspectId
  fps?: number
  rig?: RigId
  rigIntensity?: number
  sensor?: Shot['camera']['sensorId']
  notes?: string
  subject?: Entity
  /** Camera-move preset id from the Library's camera moves. */
  move?: string
  /** Start camera offset from the subject: [dx, height, dz, focal]. */
  from?: [number, number, number, number]
  /** Hand-set camera marks: [x,y,z, lookAtX, lookAtY, lookAtZ, time, focal] */
  marks?: [number, number, number, number, number, number, number, number][]
  take?: BlockingTake
  draftOf?: Shot
  bank?: string[]
}

function aim(from: V3, to: V3): { pan: number; tilt: number } {
  const d = { x: to.x - from.x, y: 0, z: to.z - from.z }
  const flat = Math.hypot(d.x, d.z)
  return { pan: headingOf(d), tilt: Math.atan2(to.y - from.y, flat) }
}

function shot(ctx: Ctx, o: ShotOpts): Shot {
  const s = createShot(ctx.scene, o.name)
  s.duration = o.duration
  s.fps = o.fps ?? 24
  s.aspect = o.aspect ?? '2.39:1'
  s.camera.rig = o.rig ?? 'sticks'
  s.camera.rigIntensity = o.rigIntensity ?? 0.5
  s.camera.sensorId = o.sensor ?? 'super35'
  s.camera.seed = Math.floor(rnd() * 1e9)
  s.blockingTakeId = (o.take ?? ctx.take).id
  if (o.notes) s.notes = o.notes
  s.cameraName = 'A'

  if (o.marks) {
    for (const [x, y, z, lx, ly, lz, t, f] of o.marks) {
      const { pan, tilt } = aim({ x, y, z }, { x: lx, y: ly, z: lz })
      s.camera.marks.push(createCameraMark({ x, y, z }, t, pan, tilt, f))
    }
  } else if (o.subject) {
    const subj = o.subject
    const ev = new ShotEvaluator(ctx.scene, s)
    const sample = (t: number) => {
      const st = ev.evaluate(t).entities.find((e) => e.entityId === subj.id)
      const p = st?.position ?? subj.transform.position
      return { x: p.x, y: p.y, z: p.z, heading: st?.heading ?? subj.transform.rotationY }
    }
    const p0 = sample(0)
    const [dx, h, dz, f] = o.from ?? [2.5, 1.6, 5, 35]
    const cam = { x: p0.x + dx, y: h, z: p0.z + dz }
    const { pan, tilt } = aim(cam, { x: p0.x, y: 1.4, z: p0.z })
    const preset = o.move ? CAMERA_MOVE_PRESETS.find((p) => p.id === o.move) : undefined
    if (o.move && !preset) throw new Error(`unknown camera move ${o.move}`)
    if (preset) {
      const specs = preset.generate({
        subjectAt: sample,
        subjectHeight: ev.subjectHeight(subj.id),
        camera: { ...cam, pan, tilt, focalLength: f },
        duration: o.duration
      })
      s.camera.marks = specs.map((m) => ({ id: newId('cmark'), ...m, position: { ...m.position } }))
      if (preset.track) s.camera.trackEntityId = subj.id
    } else {
      s.camera.marks.push(createCameraMark(cam, 0, pan, tilt, f))
    }
  }
  if (o.bank) {
    s.cameraBank = o.bank.map((name, i) => {
      const cam = structuredClone(s.camera)
      cam.seed = Math.floor(rnd() * 1e9)
      cam.marks = cam.marks.map((m) => ({
        ...m,
        id: newId('cmark'),
        position: { x: m.position.x - 2.5 * (i + 1), y: m.position.y, z: m.position.z + 1.2 },
        focalLength: [85, 24, 50][i % 3]!
      }))
      return { name, camera: cam }
    })
  }
  if (o.draftOf) {
    s.draftOf = o.draftOf.id
    ;(ctx.scene.drafts ??= []).push(s)
  } else ctx.scene.shots.push(s)
  return s
}

function forkTake(ctx: Ctx, name: string): BlockingTake {
  const t: BlockingTake = structuredClone(ctx.take)
  t.id = newId('take')
  t.name = name
  t.tracks.forEach((tr) => tr.marks.forEach((m) => (m.id = newId('mark'))))
  ctx.scene.blocking.push(t)
  return t
}

function writeProject(doc: ProjectDoc, folderName: string, modified: Date, opts: { autosaveNewer?: boolean } = {}): string {
  const folder = join(PROJECTS, `${folderName}.blockout`)
  mkdirSync(join(folder, 'assets'), { recursive: true })
  mkdirSync(join(folder, 'exports'), { recursive: true })
  const json = serializeProject(doc)
  const check = parseProject(json)
  if (!check.doc) throw new Error(`${folderName}: ${JSON.stringify(check.issues)}`)
  // Sanity: every shot/draft must evaluate to finite camera + entity states.
  for (const sc of check.doc.scenes)
    for (const sh of [...sc.shots, ...(sc.drafts ?? [])]) {
      const ev = new ShotEvaluator(sc, sh)
      for (let t = 0; t <= sh.duration; t += 0.5) {
        const st = ev.evaluate(t)
        const bad = [st.camera.position, ...st.entities.map((e) => e.position)].some(
          (p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)
        )
        if (bad || !Number.isFinite(st.camera.pan) || !Number.isFinite(st.camera.vfov))
          throw new Error(`${folderName} ${sc.name} ${sh.name}: non-finite state at t=${t}`)
      }
    }
  writeFileSync(join(folder, 'project.json'), json)
  utimesSync(join(folder, 'project.json'), modified, modified)
  mkdirSync(join(folder, '.autosave'), { recursive: true })
  writeFileSync(join(folder, '.autosave', 'project.autosave.json'), json)
  utimesSync(join(folder, '.autosave', 'project.autosave.json'), modified, modified)
  return folder
}

function writeExport(folder: string, sceneName: string, shotName: string, when: Date, profile: { id: string; name: string }, prompt: string, extra: Record<string, unknown> = {}): void {
  const stamp = when.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dir = join(folder, 'exports', sceneName.replace(/[^A-Za-z0-9 _-]/g, '-'), `Shot-${shotName}`, `export-${stamp}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'prompt.txt'), prompt + '\n')
  writeFileSync(
    join(dir, 'metadata.json'),
    JSON.stringify({ generator: { app: 'Blockout', schema: 1 }, profile, shot: { name: shotName, ...extra }, exportedAt: when.toISOString() }, null, 2)
  )
}

const day = (iso: string): Date => new Date(iso)

/* ======================================================================
 * PROJECT 1 — "Low Tide" (short film, the one the user has open)
 * ==================================================================== */

function lowTide(): ProjectDoc {
  const doc = createProject('Low Tide')
  doc.scenes = []
  doc.settings.defaultProfileId = 'seedance-2'

  /* --- SC 1: harbor lot, night --------------------------------------- */
  {
    const ctx = newScene(doc, 'EXT. HARBOR PARKING LOT – NIGHT', 'night', { fog: 0.35, sunAzimuth: 2.2, sunElevation: 0.15 })
    put(ctx, 'env.parkingLot', 0, 0)
    const maya = put(ctx, 'person.woman', -6, 6, { label: 'MAYA', color: C.red, rotDeg: 180, params: { height: 1.68 } })
    const dex = put(ctx, 'person.man', 3.2, -4.5, { label: 'DEX', color: C.blue, rotDeg: 140, params: { height: 1.86, build: 1.15 } })
    const sedan = put(ctx, 'vehicle.sedan', -6.5, 8.5, { name: "Maya's Corolla", rotDeg: 180 })
    const pickup = put(ctx, 'vehicle.pickup', 4.4, -5.6, { name: "Dex's F-150", rotDeg: 90 })
    put(ctx, 'vehicle.suv', -1.2, 9.2, { rotDeg: 0 })
    put(ctx, 'vehicle.van', 8.5, 4, { rotDeg: 270, name: 'Fish market van' })
    put(ctx, 'prop.streetlightSingle', -3, 1.5)
    put(ctx, 'prop.streetlightSingle', 6, -2)
    put(ctx, 'prop.dumpster', 9.5, -7, { rotDeg: 90 })
    put(ctx, 'prop.trafficCone', 1.4, 2)
    put(ctx, 'prop.trafficCone', 2.1, 2.4)
    put(ctx, 'prop.fence', 0, -11, { scale: 1.4 })
    put(ctx, 'prop.crate', 7.5, -8)
    put(ctx, 'prop.pallet', 7.9, -9.2)
    put(ctx, 'prop.barrel', 10.2, -5.4)
    put(ctx, 'animal.cat', 9.1, -6.2, { name: 'Stray cat', rotDeg: 210 })
    put(ctx, 'prop.phoneBooth', -9, -3, { rotDeg: 90 })
    void sedan
    void pickup
    block(ctx.take, maya, [
      [-6, 6, 0, 'stand', 0.8],
      [-4, 2.5, 2.6, 'walk'],
      [-0.5, -1.5, 5.4, 'walk'],
      [1.8, -3.2, 7.2, 'walk', 1.5]
    ])
    block(ctx.take, dex, [
      [3.2, -4.5, 0, 'stand', 6.2],
      [2.6, -3.6, 7.6, 'walk', 1]
    ])
    const s1a = shot(ctx, {
      name: '1A', duration: 9, rig: 'crane', subject: maya, move: 'crane-down-intro', from: [4, 6, 8, 24],
      notes: 'Opening. Crane down off the sodium light onto MAYA getting out of the car. Hold wide long enough to read the empty lot.'
    })
    shot(ctx, {
      name: '1B', duration: 7.5, rig: 'steadicam', rigIntensity: 0.35, subject: maya, move: 'follow-behind',
      notes: 'Steadicam behind Maya, she walks into DEX. Keep his truck in frame left.'
    })
    shot(ctx, { name: '1C', duration: 4, rig: 'dolly', subject: dex, move: 'slow-push-in', from: [-1.5, 1.6, 3.2, 50], notes: 'Dex CU — slow push as he clocks her. 50 → 65mm?' })
    shot(ctx, { name: '1D', duration: 4, rig: 'sticks', subject: maya, from: [1.4, 1.55, -3, 65], notes: 'REV on Maya. Match eyeline from 1C.' })
    shot(ctx, { name: '1A', duration: 9, rig: 'drone', subject: maya, move: 'drone-rise-pullback', from: [2, 3, 6, 24], draftOf: s1a, notes: 'v1 — drone version. Too much like a car commercial, keeping crane.' })
    ctx.scene.drafts!.at(-1)!.name = '1A v1'
  }

  /* --- SC 2: diner, dawn ---------------------------------------------- */
  {
    const ctx = newScene(doc, 'INT. GULL DINER – DAWN', 'interiorWarm', { sunAzimuth: 1.1, sunElevation: 0.25 })
    put(ctx, 'env.diner', 0, 0)
    const table = put(ctx, 'furniture.kitchenTable', 0, -2.4)
    const maya = put(ctx, 'person.woman', -0.6, -2.4, { label: 'MAYA', color: C.red, rotDeg: 270, params: { pose: 'sit', height: 1.68 } })
    const eli = put(ctx, 'person.elderly', 0.7, -2.4, { label: 'ELI', color: C.green, rotDeg: 90, params: { pose: 'sit' } })
    const rosa = put(ctx, 'person.woman', 3.2, -5, { label: 'ROSA (waitress)', color: C.amber, rotDeg: 200 })
    put(ctx, 'prop.mug', -0.2, -2.35, { name: "Maya's coffee" })
    put(ctx, 'prop.mug', 0.35, -2.5)
    put(ctx, 'prop.plate', 0.3, -2.3, { name: 'Untouched eggs' })
    put(ctx, 'prop.newspaper', 0.5, -2.6)
    put(ctx, 'furniture.counter', 3.5, -3.5, { rotDeg: 90 })
    put(ctx, 'furniture.stool', 2.6, -2.6)
    put(ctx, 'furniture.stool', 2.6, -3.4)
    put(ctx, 'furniture.stool', 2.6, -4.2)
    const trucker = put(ctx, 'person.man', 2.6, -3.4, { name: 'Trucker at counter', rotDeg: 270, params: { pose: 'sit', build: 1.3 } })
    put(ctx, 'furniture.window', -1.6, -2.4, { rotDeg: 90, scale: 1.2 })
    put(ctx, 'prop.clock', 0, -6.2)
    put(ctx, 'prop.cashRegister', 3.5, -5.6)
    void table
    motion(ctx.take, maya, 'drink-seated', 2.5, 1.0)
    motion(ctx.take, eli, 'argue-point', 3, 3.2)
    motion(ctx.take, trucker, 'eat-seated', 6)
    block(ctx.take, rosa, [
      [3.2, -5, 0, 'stand', 1],
      [1.5, -3.2, 3, 'walk', 1.6],
      [3.0, -4.6, 6.5, 'walk']
    ])
    const s2a = shot(ctx, {
      name: '2A', duration: 8, rig: 'sticks', subject: maya, from: [3.4, 1.25, 2.2, 32], bank: ['B'],
      notes: 'Master two-shot from the aisle. Cam B on the long lens through the window for the cutaway.'
    })
    shot(ctx, { name: '2B', duration: 6, rig: 'sticks', subject: eli, from: [-1.9, 1.15, 0.9, 50], notes: "OTS Maya → Eli. Keep the coffee in the foreground, it pays off in sc 6." })
    shot(ctx, { name: '2C', duration: 6, rig: 'sticks', subject: maya, from: [1.9, 1.15, -0.9, 50], notes: 'OTS Eli → Maya (REV of 2B).' })
    shot(ctx, { name: '2D', duration: 3.5, rig: 'handheld', rigIntensity: 0.25, subject: rosa, from: [1.5, 1.5, 2.5, 35], notes: 'Insert: Rosa tops up the coffee. Optional.' })
    shot(ctx, { name: '2A v1', duration: 8, rig: 'dolly', subject: maya, move: 'arc-and-push', from: [3.4, 1.25, 2.2, 28], draftOf: s2a, notes: 'Arc version — nice but fights the dialogue.' })
    shot(ctx, { name: '2A v2', duration: 8, rig: 'steadicam', subject: eli, move: 'orbit-45-low', from: [3, 1.1, 2.6, 32], draftOf: s2a })
  }

  /* --- SC 3: alley chase, night --------------------------------------- */
  {
    const ctx = newScene(doc, 'EXT. CANNERY ALLEY – NIGHT', 'night', { fog: 0.5 })
    put(ctx, 'env.alley', 0, 0)
    const runners = routine(
      ctx,
      { kind: 'chase', performers: 3, durationS: 10, ending: 'escape' },
      { x: 0, z: 8, heading: 0 },
      [['MAYA', C.red], ['DEX', C.blue], ['KOVAC', C.purple]]
    )
    put(ctx, 'prop.dumpster', 2.2, -2, { rotDeg: 90 })
    put(ctx, 'prop.trashcan', -2.2, 1.4)
    put(ctx, 'prop.trashcan', -2.3, 2.2)
    put(ctx, 'prop.crate', 2.1, 3.5)
    put(ctx, 'prop.crate', 2.4, 4.2, { y: 0, scale: 0.8 })
    put(ctx, 'prop.ladder', -2.6, -6, { rotDeg: 90 })
    put(ctx, 'prop.streetlightSingle', -2.8, -9)
    put(ctx, 'prop.fence', 0, -16, { name: 'Chain-link (vault)' })
    put(ctx, 'prop.barrel', 1.8, -11)
    put(ctx, 'vehicle.motorcycle', -1.8, -13, { rotDeg: 30 })
    shot(ctx, { name: '3A', duration: 10, rig: 'handheld', rigIntensity: 0.8, subject: runners[0], move: 'lead-the-subject', notes: 'Lead Maya down the alley — handheld, 24mm, stay ahead of her.' })
    shot(ctx, { name: '3B', duration: 6, rig: 'steadicam', subject: runners[1], move: 'side-track-left', notes: 'Profile track through the crates.' })
    shot(ctx, { name: '3C', duration: 4, rig: 'sticks', subject: runners[0], from: [0.5, 0.4, -6, 16], notes: 'Low wide at the fence — she vaults over camera. Need the exact vault mark.' })
    shot(ctx, { name: '3D', duration: 5, rig: 'drone', subject: runners[2], move: 'overhead-track-follow' })
  }

  /* --- SC 4: warehouse fight ------------------------------------------ */
  {
    const ctx = newScene(doc, 'INT. COLD STORAGE WAREHOUSE – NIGHT', 'interiorCool', { fog: 0.2 })
    put(ctx, 'env.warehouse', 0, 0)
    const fighters = routine(
      ctx,
      { kind: 'fight', performers: 2, durationS: 12, style: 'brawl', ending: 'finish' },
      { x: 0, z: -2, heading: 0 },
      [['DEX', C.blue], ['KOVAC', C.purple]]
    )
    const thugs: [string, number, number, number][] = [['THUG 1', -3.5, -5, 40], ['THUG 2', 3.8, -4.4, 320], ['THUG 3', 2.9, 1.5, 220]]
    for (const [name, x, z, r] of thugs) {
      const t = put(ctx, 'person.man', x, z, { label: name, color: C.orange, rotDeg: r, params: { build: 1.2 } })
      motion(ctx.take, t, 'arms-crossed-settle', 12)
    }
    const maya = put(ctx, 'person.woman', -5.5, 3.5, { label: 'MAYA', color: C.red, rotDeg: 150, params: { pose: 'crouch' } })
    motion(ctx.take, maya, 'wall-press-peek', 4, 6)
    for (let i = 0; i < 6; i++) put(ctx, 'prop.crate', -6 + i * 0.9, -7.5, { scale: 1.2 })
    for (let i = 0; i < 4; i++) put(ctx, 'prop.pallet', 6, -6 + i * 1.3, { rotDeg: 90 })
    put(ctx, 'prop.barrel', 5.2, 2.4)
    put(ctx, 'prop.barrel', 5.8, 2.9)
    put(ctx, 'prop.scaffold', -7, -2, { rotDeg: 90 })
    put(ctx, 'vehicle.truck', 2, 9, { rotDeg: 180, name: 'Reefer truck', exclude: false })
    put(ctx, 'furniture.filingCabinet', 7.2, -1)
    put(ctx, 'furniture.desk', 7, 0.4, { rotDeg: 270 })
    shot(ctx, { name: '4A', duration: 12, rig: 'steadicam', rigIntensity: 0.45, subject: fighters[0], move: 'orbit-180', notes: 'Oner. Orbit around the fight, land on Kovac going down. Choreo from the Choreographer (brawl, seed locked).' })
    shot(ctx, { name: '4B', duration: 5, rig: 'handheld', rigIntensity: 0.9, subject: fighters[1], move: 'snap-zoom-punch', notes: 'Punch-in on the haymaker. Very shaky.' })
    shot(ctx, { name: '4C', duration: 4, rig: 'sticks', subject: maya, from: [1.2, 0.9, 2.2, 85], notes: 'Maya POV-ish: hiding behind the scaffold, long lens.' })
    const alt = forkTake(ctx, 'Alt — Dex loses')
    shot(ctx, { name: '4D', duration: 6, rig: 'crane', subject: fighters[0], move: 'boom-over', take: alt, notes: 'Alt ending uses the "Dex loses" take. Waiting on notes from Priya before deleting.' })
  }

  /* --- SC 5: rooftop, blue hour --------------------------------------- */
  {
    const ctx = newScene(doc, 'EXT. HOSPITAL ROOFTOP – BLUE HOUR', 'blueHourSky', { sunAzimuth: 4.4, sunElevation: 0.02 })
    put(ctx, 'env.rooftop', 0, 0)
    const maya = put(ctx, 'person.woman', -0.8, -3.2, { label: 'MAYA', color: C.red, rotDeg: 10 })
    const eli = put(ctx, 'person.elderly', 1.2, -1.6, { label: 'ELI', color: C.green, rotDeg: 300, params: { pose: 'sit' } })
    put(ctx, 'furniture.wheelchair', 1.2, -1.6, { rotDeg: 300 })
    put(ctx, 'prop.bench', -2.5, 0.5)
    put(ctx, 'prop.flagpole', 4.5, -5)
    put(ctx, 'prop.helicopter', -6, 6, { rotDeg: 45, name: 'Medevac (bg)' })
    motion(ctx.take, maya, 'look-around-wary', 3, 0.5)
    block(ctx.take, maya, [
      [-0.8, -3.2, 4, 'stand', 0.5],
      [0.4, -2.2, 6.5, 'walk', 3]
    ])
    motion(ctx.take, eli, 'nod-yes', 2, 7)
    shot(ctx, { name: '5A', duration: 10, rig: 'drone', subject: maya, move: 'drone-orbit-high', from: [6, 8, 6, 24], aspect: '2.39:1', notes: 'Wide establishing — city lights coming on. Golden-hour sky is too warm, try blue hour (done).' })
    shot(ctx, { name: '5B', duration: 7, rig: 'dolly', subject: eli, move: 'slow-push-in', from: [-2, 1.2, 2.5, 50], notes: "Eli's line: \"You don't get the tide back.\"" })
    shot(ctx, { name: '5C', duration: 6, rig: 'sticks', subject: maya, from: [2.5, 1.6, 1.5, 85] })
  }

  /* --- SC 6: club ---------------------------------------------------- */
  {
    const ctx = newScene(doc, 'INT. THE BRINE (CLUB) – NIGHT', 'club', { fog: 0.6 })
    put(ctx, 'env.nightclub', 0, 0)
    const dancers = routine(
      ctx,
      { kind: 'dance', performers: 8, durationS: 12, style: 'hiphop', formation: 'vShape', canon: true, formationChange: true, bpm: 98 },
      { x: 0, z: -3, heading: 0 }
    )
    const kovac = put(ctx, 'person.man', 4.5, 1.5, { label: 'KOVAC', color: C.purple, rotDeg: 230 })
    put(ctx, 'furniture.bar', 5.5, 2.5, { rotDeg: 270 })
    put(ctx, 'furniture.stool', 4.8, 2.0)
    put(ctx, 'furniture.stool', 4.8, 3.0)
    put(ctx, 'prop.wineglass', 5.3, 1.6)
    put(ctx, 'prop.microphone', 0, -7.2)
    const maya = put(ctx, 'person.woman', -6, 5, { label: 'MAYA', color: C.red, rotDeg: 135 })
    block(ctx.take, maya, [
      [-6, 5, 0, 'stand', 1],
      [-3, 2.5, 4, 'walk'],
      [2.8, 1.8, 9, 'walk', 2]
    ])
    motion(ctx.take, kovac, 'drink-standing', 4)
    shot(ctx, { name: '6A', duration: 12, rig: 'crane', subject: dancers[0], move: 'crane-up-reveal', from: [0, 1.5, 7, 24], notes: 'Dance floor reveal. 98 bpm — music cue TBD.' })
    shot(ctx, { name: '6B', duration: 9, rig: 'steadicam', subject: maya, move: 'follow-behind', notes: 'Maya cuts through the dancers toward Kovac.' })
    shot(ctx, { name: '6C', duration: 4, rig: 'sticks', subject: kovac, from: [-1.4, 1.6, -2, 85], aspect: '2.39:1' })
    shot(ctx, { name: '6D', duration: 6, rig: 'handheld', subject: dancers[3], move: 'dutch-orbit', aspect: '9:16', notes: 'Vertical cut for the teaser. ' })
  }

  /* --- SC 7: beach, golden hour ---------------------------------------- */
  {
    const ctx = newScene(doc, 'EXT. NORTH JETTY BEACH – GOLDEN HOUR', 'goldenHourSky', { sunAzimuth: 4.9, sunElevation: 0.12 })
    put(ctx, 'env.beach', 0, 0)
    const maya = put(ctx, 'person.woman', -4, 4, { label: 'MAYA', color: C.red, rotDeg: 200 })
    const dog = put(ctx, 'animal.dog', -6, 3, { label: 'BISCUIT', color: C.amber })
    put(ctx, 'prop.rock', 3, -6, { scale: 2.2 })
    put(ctx, 'prop.rock', 4.5, -5.2, { scale: 1.3 })
    put(ctx, 'vehicle.boat', 8, -12, { rotDeg: 75, name: 'Ferry (distant)', scale: 1.6 })
    put(ctx, 'prop.campfire', -1.5, -1)
    put(ctx, 'vehicle.boat', -9, -14, { rotDeg: 110 })
    block(ctx.take, maya, [
      [-4, 4, 0, 'walk'],
      [0, -2, 6, 'walk'],
      [2.5, -5, 10, 'walk', 4]
    ])
    block(ctx.take, dog, [
      [-6, 3, 0, 'jog'],
      [-1, -1, 3, 'run'],
      [3, -3, 6, 'run'],
      [3.4, -4.4, 9, 'walk', 3]
    ])
    shot(ctx, { name: '7A', duration: 14, rig: 'drone', subject: maya, move: 'drone-rise-pullback', from: [-3, 2, 6, 24], notes: 'FINAL SHOT. Rise up and away as she reaches the rocks. Seedance 15s max — trimmed to 14.' })
    shot(ctx, { name: '7B', duration: 6, rig: 'steadicam', subject: dog, move: 'lead-follow-front', from: [0, 0.6, -3, 24] })
    shot(ctx, { name: '7C', duration: 5, rig: 'sticks', subject: maya, from: [3, 1.5, 2, 135], notes: 'Long lens silhouette against the sun.' })
  }

  return doc
}

/* ======================================================================
 * Other projects on disk
 * ==================================================================== */

function insuranceSpot(): ProjectDoc {
  const doc = createProject('Coastline Mutual – "Fender Bender" 30s')
  doc.scenes = []
  doc.settings.defaultProfileId = 'veo-3.1'
  const ctx = newScene(doc, 'EXT. SUBURBAN STREET – DAY', 'middaySky')
  put(ctx, 'env.residentialStreet', 0, 0)
  const car1 = put(ctx, 'vehicle.sedan', -1.2, 12, { rotDeg: 0, label: 'HERO CAR', color: C.blue })
  const car2 = put(ctx, 'vehicle.suv', -1.2, -2, { rotDeg: 0 })
  const dad = put(ctx, 'person.man', 2.8, -1, { label: 'DAD', color: C.green })
  const kid = put(ctx, 'person.child', 3.3, -0.6, { label: 'KID', color: C.pink })
  put(ctx, 'prop.mailbox', 4, 1)
  put(ctx, 'prop.fireHydrant', 3.6, -4)
  put(ctx, 'prop.tree', 6, 3)
  put(ctx, 'prop.tree', 6, -7)
  put(ctx, 'animal.dog', 5, -2.5)
  block(ctx.take, car1, [[-1.2, 12, 0, 'run'], [-1.2, 1.2, 3, 'walk', 4]])
  motion(ctx.take, dad, 'facepalm', 3, 3.2)
  motion(ctx.take, kid, 'cheer-jump', 2, 3.4)
  void car2
  shot(ctx, { name: '1A', duration: 6, aspect: '16:9', rig: 'sticks', subject: car1, from: [6, 1.4, -4, 35], notes: 'The tap. Comedic beat — hold on Dad after impact.' })
  shot(ctx, { name: '1B', duration: 4, aspect: '9:16', rig: 'handheld', subject: dad, move: 'crash-in', notes: 'Social cutdown, 9:16.' })
  const ctx2 = newScene(doc, 'INT. KITCHEN – DAY (APP DEMO)', 'interiorCool')
  put(ctx2, 'env.houseInterior', 0, 0)
  put(ctx2, 'furniture.kitchenTable', 0, -2)
  const mom = put(ctx2, 'person.woman', -0.6, -2, { label: 'MOM', color: C.purple, rotDeg: 270, params: { pose: 'sit' } })
  put(ctx2, 'prop.phone', -0.3, -2)
  put(ctx2, 'furniture.fridge', 2.5, -4)
  motion(ctx2.take, mom, 'texting', 5)
  shot(ctx2, { name: '2A', duration: 5, aspect: '16:9', rig: 'dolly', subject: mom, move: 'slow-push-in', from: [1.5, 1.2, 1.5, 50], notes: 'Claim filed in 90 seconds — screen replace in post.' })
  return doc
}

function musicVideo(): ProjectDoc {
  const doc = createProject('Neon Static – "Glass Hours" MV')
  doc.scenes = []
  doc.settings.defaultProfileId = 'kling-2'
  const ctx = newScene(doc, 'STAGE – PERFORMANCE', 'club', { fog: 0.7 })
  put(ctx, 'env.stage', 0, 0)
  const crew = routine(ctx, { kind: 'dance', performers: 12, durationS: 10, style: 'robot', formation: 'twoRows', mirror: true, bpm: 120 }, { x: 0, z: -2, heading: 0 })
  const singer = put(ctx, 'person.woman', 0, 1.5, { label: 'VESNA', color: C.pink })
  put(ctx, 'prop.microphone', 0, 1.2)
  put(ctx, 'prop.guitar', -2.5, 1.2)
  motion(ctx.take, singer, 'slow-sway', 10)
  shot(ctx, { name: '1A', duration: 10, aspect: '9:16', rig: 'crane', subject: singer, move: 'spiral-in-descend', notes: 'Chorus 1' })
  shot(ctx, { name: '1B', duration: 8, aspect: '9:16', rig: 'steadicam', subject: crew[4], move: 'orbit-360' })
  const ctx2 = newScene(doc, 'EXT. ROOFTOP – NIGHT', 'night')
  put(ctx2, 'env.rooftop', 0, 0)
  const s = put(ctx2, 'person.woman', 0, -2, { label: 'VESNA', color: C.pink })
  motion(ctx2.take, s, 'arm-wave', 6)
  shot(ctx2, { name: '2A', duration: 6, aspect: '9:16', rig: 'drone', subject: s, move: 'spiral-out-ascend' })
  return doc
}

function pitchTest(): ProjectDoc {
  const doc = createProject('Generator bake-off (Seedance vs Veo vs LTX)')
  doc.scenes = []
  const ctx = newScene(doc, 'TEST – WALK & TURN', 'day')
  const a = put(ctx, 'person.man', 0, 4, { label: 'A', color: C.amber })
  put(ctx, 'prim.cube', 2, -2)
  put(ctx, 'prim.wall', 0, -5)
  block(ctx.take, a, [[0, 4, 0], [0, -1, 4, 'walk', 1]])
  shot(ctx, { name: 'T1', duration: 5, aspect: '16:9', subject: a, from: [3, 1.6, 2, 35] })
  shot(ctx, { name: 'T2', duration: 5, aspect: '16:9', subject: a, move: 'side-track-right' })
  return doc
}

function untitled(): ProjectDoc {
  const doc = createProject('Untitled 3')
  const sc = doc.scenes[0]!
  sc.entities.push(createEntity('env.coffeeShop', 'Coffee shop', { x: 0, y: 0, z: 0 }))
  return doc
}

/* ------------------------------ presets ------------------------------ */

function preset(name: string, savedAt: string, build: (ctx: Ctx) => void): void {
  const doc = createProject('preset')
  doc.scenes = []
  const ctx = newScene(doc, name, 'day')
  build(ctx)
  const payload = {
    presetVersion: 1,
    name,
    environment: ctx.scene.environment,
    entities: ctx.scene.entities,
    blocking: ctx.scene.blocking
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  const id = `${slug}-${new Date(savedAt).getTime().toString(36)}`
  writeFileSync(
    join(PRESETS, `${id}.json`),
    JSON.stringify({ id, name, savedAt, entityCount: payload.entities.length, payload }, null, 2)
  )
}

function writePresets(): void {
  mkdirSync(PRESETS, { recursive: true })
  preset('Diner booth two-hander', '2026-07-21T19:02:11.000Z', (c) => {
    c.scene.environment.lighting = 'interiorWarm'
    put(c, 'env.diner', 0, 0)
    put(c, 'furniture.kitchenTable', 0, -2.4)
    put(c, 'person.woman', -0.6, -2.4, { label: 'A', color: C.red, rotDeg: 270, params: { pose: 'sit' } })
    put(c, 'person.man', 0.7, -2.4, { label: 'B', color: C.blue, rotDeg: 90, params: { pose: 'sit' } })
    put(c, 'prop.mug', -0.2, -2.35)
    put(c, 'prop.mug', 0.35, -2.5)
  })
  preset('Car interior – front seats', '2026-08-02T23:40:55.000Z', (c) => {
    c.scene.environment.lighting = 'night'
    put(c, 'env.carInterior', 0, 0)
    put(c, 'person.man', -0.4, 0, { label: 'DRIVER', color: C.blue, params: { pose: 'sit' } })
    put(c, 'person.woman', 0.4, 0, { label: 'PASSENGER', color: C.red, params: { pose: 'sit' } })
  })
  preset('Warehouse standoff (5)', '2026-09-14T03:12:30.000Z', (c) => {
    c.scene.environment.lighting = 'interiorCool'
    put(c, 'env.warehouse', 0, 0)
    ;[-3, -1.5, 0, 1.5, 3].forEach((x, i) => put(c, 'person.man', x, i % 2 ? -2 : -3, { label: `T${i + 1}`, color: C.orange, rotDeg: 180 }))
    put(c, 'prop.crate', -5, -6)
    put(c, 'prop.crate', -4.1, -6)
  })
  preset('Dance floor – 8 count, V formation', '2026-10-03T21:48:07.000Z', (c) => {
    c.scene.environment.lighting = 'club'
    put(c, 'env.nightclub', 0, 0)
    routine(c, { kind: 'dance', performers: 8, durationS: 8, style: 'party', formation: 'vShape', bpm: 104 }, { x: 0, z: -3, heading: 0 })
  })
  preset('Interview – single + B-cam', '2026-06-11T16:20:00.000Z', (c) => {
    c.scene.environment.lighting = 'interiorWarm'
    put(c, 'env.office', 0, 0)
    put(c, 'furniture.armchair', 0, -2, { rotDeg: 20 })
    put(c, 'person.man', 0, -2, { label: 'SUBJECT', color: C.teal, rotDeg: 20, params: { pose: 'sit' } })
    put(c, 'prop.tripod', 1.5, 0.5)
    put(c, 'furniture.lamp', -1.2, -2.6)
  })
  preset('Backyard BBQ crowd', '2026-08-30T00:05:44.000Z', (c) => {
    c.scene.environment.lighting = 'goldenHourSky'
    put(c, 'env.backyard', 0, 0)
    put(c, 'prop.bbqGrill', 2, -2)
    put(c, 'prop.picnicTable', -1, -3)
    put(c, 'prop.patioUmbrellaTable', -3.5, 0)
    for (let i = 0; i < 7; i++) put(c, i % 3 === 0 ? 'person.woman' : i % 3 === 1 ? 'person.man' : 'person.child', between(-4, 4), between(-5, 1), { rotDeg: between(0, 360) })
  })
  preset('alley chase start', '2026-09-28T05:31:19.000Z', (c) => {
    c.scene.environment.lighting = 'night'
    put(c, 'env.alley', 0, 0)
    routine(c, { kind: 'chase', performers: 2, durationS: 8, ending: 'caught' }, { x: 0, z: 8, heading: 0 })
  })
}

/* ------------------------------- main -------------------------------- */

if (existsSync(DATA)) rmSync(DATA, { recursive: true, force: true })
mkdirSync(PROJECTS, { recursive: true })

const pitch = writeProject(pitchTest(), 'Generator bake-off', day('2026-06-03T18:22:00Z'))
writeExport(pitch, 'TEST – WALK & TURN', 'T1', day('2026-06-03T18:40:00Z'), { id: 'ltx-2.3', name: 'LTX-2.3' }, 'A man walks toward camera and stops, turning to his left. Static camera, 35mm.')
writeProject(insuranceSpot(), 'Coastline Mutual Fender Bender', day('2026-07-09T22:10:00Z'))
writeProject(musicVideo(), 'Neon Static Glass Hours', day('2026-08-24T04:51:00Z'))
writeProject(untitled(), 'Untitled 3', day('2026-10-19T15:02:00Z'))
const lt = writeProject(lowTide(), 'Low Tide', day('2026-11-16T23:47:00Z'))
writeExport(lt, 'EXT. HARBOR PARKING LOT – NIGHT', '1A', day('2026-10-28T02:15:00Z'), { id: 'seedance-2', name: 'Seedance 2.0' },
  'Night, empty harbor parking lot under a single sodium streetlight, light fog. A woman (MAYA) gets out of a sedan and walks toward a man leaning on a pickup truck. Camera cranes down from high and wide to eye level.', { duration: 9, fps: 24, aspect: '2.39:1' })
writeExport(lt, 'INT. GULL DINER – DAWN', '2A', day('2026-11-02T19:30:00Z'), { id: 'veo-3.1', name: 'Veo 3.1' },
  'Dawn inside a warm diner. A woman and an older man sit across a booth table, coffee between them; a waitress passes behind. Static two-shot from the aisle, 32mm.', { duration: 8, fps: 24, aspect: '2.39:1' })
writeExport(lt, 'INT. COLD STORAGE WAREHOUSE – NIGHT', '4A', day('2026-11-14T06:05:00Z'), { id: 'kling-2', name: 'Kling 2.x' },
  'A brawl between two men in a cold blue warehouse, three onlookers. Steadicam orbits 180 degrees around the fight and ends on the loser falling.', { duration: 12, fps: 24, aspect: '2.39:1' })
writePresets()
writeFileSync(join(DATA, 'recent.json'), JSON.stringify({ folder: lt }, null, 2))
console.log(`seeded ${DATA}`)
