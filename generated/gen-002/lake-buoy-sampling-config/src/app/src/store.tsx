import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  CONSUMERS, DEPLOYMENTS, ICE, INITIAL_REASONS, PROFILES, QA_RULES, SENSORS, VAR_LABEL, calStatus, cloneConfig, depById,
  fmtInterval, fmtUplink, initialDraft, sensorById,
  type DepId, type PowerSetting, type ProfileConfig, type QASetting, type SensorSetting, type VarKey,
} from './data'

export type View = 'sensors' | 'qa' | 'power' | 'exports' | 'history' | 'profiles'

export interface Change {
  area: 'sensor' | 'units' | 'qa' | 'power' | 'export'
  field: string
  target: string
  from: string
  to: string
}
export interface ChangeGroup {
  key: string
  area: Change['area']
  title: string
  from: string
  to: string
  scope: string[]
  view: View
  targets: string[]
  field: string
}
export interface Impact { level: 'warn' | 'info'; text: string; view: View; key: string }

interface Retrieval { date: string; time: string; holdForLog: boolean }
interface State {
  view: View
  draft: ProfileConfig
  reasons: Record<string, string>
  retrieval: Retrieval
  scheduled: null | { at: string; count: number }
  calAck: boolean
  pinDnr: boolean
  depFilter: DepId | null
  qaFocus: string
  scrollQA: boolean
  flash: string | null
}

const SOURCE = PROFILES.w2526.config
const LIVE = PROFILES.ow26.config

export const sensorShort = (id: string) => {
  const s = sensorById[id]
  const v: Partial<Record<VarKey, string>> = { wt: 'thermistors', do: 'DO', cond: 'SpCond', chl: 'chl a', par: 'PAR', pres: 'pressure', airt: 'air temp', wind: 'wind', baro: 'baro', precip: 'precip', rad: 'radiation', snow: 'snow depth' }
  const pos = s.varKey === 'wt' ? '' : /^\d/.test(s.position) ? ` ${s.position}` : ''
  return `${depById[s.dep].short} ${v[s.varKey] ?? s.variable}${pos}`
}

export const fmtQA = (ruleId: string, q: QASetting, condUnit: string) => {
  const rule = QA_RULES.find((r) => r.id === ruleId)!
  const unit = rule.varKey === 'cond' ? condUnit : rule.varKey === 'wt' || rule.varKey === 'airt' ? '°C' : rule.varKey === 'do' ? 'mg/L' : rule.varKey === 'chl' ? 'µg/L' : rule.varKey === 'par' ? 'µmol m⁻² s⁻¹' : rule.varKey === 'wind' ? 'm/s' : ''
  const k = rule.varKey === 'cond' && condUnit === 'µS/cm' ? 1000 : 1
  if (rule.kind === 'range') return `${fmtNum((q.min ?? 0) * k)} to ${fmtNum((q.max ?? 0) * k)} ${unit}`
  if (rule.kind === 'roc') return `${q.roc?.toFixed(1)} ${unit} / 10 min${q.persist ? ` · only if it reverts within ${q.persist} sample${q.persist > 1 ? 's' : ''}` : ''}`
  if (rule.kind === 'flat') return `${q.roc} identical samples`
  return 'per-sensor interval'
}
export const fmtNum = (n: number) => (Math.abs(n) < 1 && n !== 0 ? String(+n.toFixed(3)) : String(+n.toFixed(2))).replace('-', '−')

export function diffConfig(a: ProfileConfig, b: ProfileConfig): Change[] {
  const out: Change[] = []
  for (const s of SENSORS) {
    const x = a.sensors[s.id], y = b.sensors[s.id]
    if (x.active !== y.active) out.push({ area: 'sensor', field: 'active', target: s.id, from: x.active ? 'On' : 'Off', to: y.active ? 'On' : 'Off' })
    if (x.interval !== y.interval) out.push({ area: 'sensor', field: 'interval', target: s.id, from: fmtInterval(x.interval), to: fmtInterval(y.interval) })
  }
  for (const k of Object.keys(a.units) as VarKey[]) if (a.units[k] !== b.units[k]) out.push({ area: 'units', field: k, target: k, from: a.units[k], to: b.units[k] })
  for (const r of QA_RULES) {
    const x = a.qa[r.id], y = b.qa[r.id]
    if (JSON.stringify(x) !== JSON.stringify(y)) out.push({ area: 'qa', field: r.id, target: r.id, from: fmtQA(r.id, x, a.units.cond), to: fmtQA(r.id, y, a.units.cond) })
  }
  for (const d of DEPLOYMENTS) {
    const x = a.power[d.id], y = b.power[d.id]
    if (x.cutoff !== y.cutoff) out.push({ area: 'power', field: 'cutoff', target: d.id, from: `${x.cutoff.toFixed(1)} V`, to: `${y.cutoff.toFixed(1)} V` })
    if (x.uplinkH !== y.uplinkH) out.push({ area: 'power', field: 'uplinkH', target: d.id, from: `every ${fmtUplink(x.uplinkH)}`, to: `every ${fmtUplink(y.uplinkH)}` })
    if (x.below !== y.below) out.push({ area: 'power', field: 'below', target: d.id, from: BELOW_LABEL[x.below], to: BELOW_LABEL[y.below] })
  }
  for (const c of CONSUMERS) {
    const x = a.overrides[c.id] ?? {}, y = b.overrides[c.id] ?? {}
    const keys = new Set([...Object.keys(x), ...Object.keys(y)]) as Set<VarKey>
    for (const k of keys) if (x[k] !== y[k]) out.push({ area: 'export', field: k, target: c.id, from: x[k] ?? 'station unit', to: y[k] ?? 'station unit' })
  }
  return out
}

export const BELOW_LABEL: Record<PowerSetting['below'], string> = {
  'suspend-uplink': 'Stop uplink, keep logging',
  'suspend-uplink-halve': 'Stop uplink, halve sampling',
}

const FIELD_TITLE: Record<string, string> = { interval: 'Sampling interval', active: 'Sensor state', cutoff: 'Low-battery cutoff', uplinkH: 'Satellite / modem uplink', below: 'Below-cutoff behaviour' }

export function groupChanges(changes: Change[]): ChangeGroup[] {
  const map = new Map<string, ChangeGroup>()
  for (const c of changes) {
    let key: string, title: string, scope: string, view: View
    if (c.area === 'sensor') {
      key = `sensor|${c.field}|${c.from}|${c.to}`
      title = c.field === 'active' ? (c.to === 'Off' ? 'Turn sensor off' : 'Turn sensor on') : FIELD_TITLE[c.field]
      scope = sensorShort(c.target); view = 'sensors'
    } else if (c.area === 'power') {
      key = `power|${c.field}|${c.from}|${c.to}`
      title = FIELD_TITLE[c.field]; scope = depById[c.target as DepId].name; view = 'power'
    } else if (c.area === 'units') {
      key = `units|${c.field}`
      title = `Station unit · ${VAR_LABEL[c.field as VarKey]}`; scope = 'Every deployment and every export without its own override'; view = 'exports'
    } else if (c.area === 'qa') {
      key = `qa|${c.field}`
      const r = QA_RULES.find((x) => x.id === c.field)!
      title = `QA · ${VAR_LABEL[r.varKey]} ${r.kind === 'roc' ? 'rate of change' : r.kind === 'range' ? 'range' : r.kind === 'flat' ? 'flatline' : 'calibration age'}`
      scope = r.scope; view = 'qa'
    } else {
      key = `export|${c.target}|${c.field}`
      const con = CONSUMERS.find((x) => x.id === c.target)!
      title = `Export override · ${VAR_LABEL[c.field as VarKey]}`; scope = `${con.name} (${con.owner})`; view = 'exports'
    }
    const g = map.get(key)
    if (g) { g.scope.push(scope); g.targets.push(c.target) }
    else map.set(key, { key, area: c.area, title, from: c.from, to: c.to, scope: [scope], view, targets: [c.target], field: c.field })
  }
  return [...map.values()]
}

export function impactsOf(draft: ProfileConfig, retrieval: Retrieval, calAck: boolean): Impact[] {
  const out: Impact[] = []
  // calibration
  const overdue = SENSORS.filter((s) => draft.sensors[s.id].active && !draft.retrieved[s.dep] && calStatus(s).overdue)
  if (overdue.length && !calAck) {
    out.push({ level: 'warn', key: 'cal', view: 'sensors', text: `${overdue.length} active DO sonde${overdue.length > 1 ? 's' : ''} past calibration interval (${overdue.map((s) => sensorShort(s.id)).join(', ')}). Every sample will carry flag C until they can be serviced after ice-out.` })
  }
  // consumers losing data
  for (const c of CONSUMERS) {
    const lost = c.vars.filter((v) => {
      const sensors = SENSORS.filter((s) => s.dep === v.dep && s.varKey === v.varKey)
      const wasOn = sensors.some((s) => SOURCE.sensors[s.id].active && !SOURCE.retrieved[s.dep])
      const isOn = sensors.some((s) => draft.sensors[s.id].active && !draft.retrieved[s.dep])
      return wasOn && !isOn
    })
    if (lost.length) out.push({ level: 'info', key: `lost-${c.id}`, view: 'exports', text: `${c.name} stops receiving ${lost.map((v) => `${depById[v.dep].short} ${VAR_LABEL[v.varKey].toLowerCase()}`).join(', ')}.` })
  }
  // station-wide unit change
  if (draft.units.cond !== SOURCE.units.cond) {
    const hit = CONSUMERS.filter((c) => c.vars.some((v) => v.varKey === 'cond') && !draft.overrides[c.id]?.cond)
    if (hit.length) out.push({ level: hit.some((c) => c.id === 'dnr') ? 'warn' : 'info', key: 'cond-unit', view: 'exports', text: `Conductivity switches to ${draft.units.cond} for ${hit.map((c) => c.name).join(', ')}.${hit.some((c) => c.id === 'dnr') ? ' The DNR parser ignores headers and assumes mS/cm.' : ''}` })
  }
  // ice timing
  if (retrieval.date > ICE.full.from) out.push({ level: 'warn', key: 'ice', view: 'sensors', text: `Retrieval date is after the earliest full ice-cover estimate (${ICE.full.from.slice(5).replace('-', '/')}).` })
  return out
}

function useStore() {
  const [st, setSt] = useState<State>(() => ({
    view: 'sensors',
    draft: initialDraft(),
    reasons: { ...INITIAL_REASONS },
    retrieval: { date: '2026-12-02', time: '09:00', holdForLog: true },
    scheduled: null,
    calAck: false,
    pinDnr: true,
    depFilter: null,
    qaFocus: 'wt-roc',
    scrollQA: false,
    flash: null,
  }))

  const changes = useMemo(() => diffConfig(SOURCE, st.draft), [st.draft])
  const groups = useMemo(() => groupChanges(changes), [changes])
  const impacts = useMemo(() => impactsOf(st.draft, st.retrieval, st.calAck), [st.draft, st.retrieval, st.calAck])
  const locked = !!st.scheduled

  const edit = (fn: (d: ProfileConfig) => void) => setSt((s) => {
    if (s.scheduled) return s
    const d = cloneConfig(s.draft); fn(d); return { ...s, draft: d }
  })

  const actions = {
    setView: (view: View) => setSt((s) => ({ ...s, view })),
    goto: (view: View, opts: { dep?: DepId | null; qa?: string } = {}) => setSt((s) => ({ ...s, view, depFilter: opts.dep !== undefined ? opts.dep : s.depFilter, qaFocus: opts.qa ?? s.qaFocus, scrollQA: !!opts.qa })),
    clearScrollQA: () => setSt((s) => ({ ...s, scrollQA: false })),
    setDepFilter: (depFilter: DepId | null) => setSt((s) => ({ ...s, depFilter })),
    setSensor: (ids: string[], patch: Partial<SensorSetting>) => edit((d) => { for (const id of ids) Object.assign(d.sensors[id], patch) }),
    setUnit: (k: VarKey, unit: string) => edit((d) => { d.units[k] = unit }),
    setQA: (id: string, patch: Partial<QASetting>) => edit((d) => { d.qa[id] = { ...d.qa[id], ...patch } }),
    setPower: (deps: DepId[], patch: Partial<PowerSetting>) => edit((d) => { for (const id of deps) Object.assign(d.power[id], patch) }),
    setOverride: (cid: string, k: VarKey, unit: string | null) => edit((d) => {
      const o = { ...(d.overrides[cid] ?? {}) }
      if (unit) o[k] = unit; else delete o[k]
      d.overrides[cid] = o
    }),
    // conductivity request decision
    decideCond: (choice: 'station' | 'export' | null, pinDnr: boolean) => edit((d) => {
      d.units.cond = SOURCE.units.cond
      d.overrides.reyes = { ...SOURCE.overrides.reyes }
      d.overrides.dnr = { ...SOURCE.overrides.dnr }
      if (choice === 'export') d.overrides.reyes.cond = 'µS/cm'
      if (choice === 'station') { d.units.cond = 'µS/cm'; if (pinDnr) d.overrides.dnr.cond = 'mS/cm' }
    }),
    setPinDnr: (v: boolean) => setSt((s) => ({ ...s, pinDnr: v })),
    revert: (g: ChangeGroup) => edit((d) => {
      if (g.area === 'sensor') for (const id of g.targets) (d.sensors[id] as unknown as Record<string, unknown>)[g.field] = (SOURCE.sensors[id] as unknown as Record<string, unknown>)[g.field]
      if (g.area === 'power') for (const id of g.targets as DepId[]) (d.power[id] as unknown as Record<string, unknown>)[g.field] = (SOURCE.power[id] as unknown as Record<string, unknown>)[g.field]
      if (g.area === 'units') d.units[g.field as VarKey] = SOURCE.units[g.field as VarKey]
      if (g.area === 'qa') d.qa[g.field] = { ...SOURCE.qa[g.field] }
      if (g.area === 'export') for (const cid of g.targets) {
        const o = { ...(d.overrides[cid] ?? {}) }
        const src = SOURCE.overrides[cid]?.[g.field as VarKey]
        if (src) o[g.field as VarKey] = src; else delete o[g.field as VarKey]
        d.overrides[cid] = o
      }
    }),
    setReason: (key: string, text: string) => setSt((s) => ({ ...s, reasons: { ...s.reasons, [key]: text } })),
    setRetrieval: (patch: Partial<Retrieval>) => setSt((s) => (s.scheduled ? s : { ...s, retrieval: { ...s.retrieval, ...patch } })),
    ackCal: (v: boolean) => setSt((s) => ({ ...s, calAck: v })),
    schedule: () => setSt((s) => ({ ...s, scheduled: { at: `${s.retrieval.date}T${s.retrieval.time}`, count: groups.length }, flash: 'scheduled' })),
    unschedule: () => setSt((s) => ({ ...s, scheduled: null, flash: null })),
    clearFlash: () => setSt((s) => ({ ...s, flash: null })),
  }

  return { st, changes, groups, impacts, locked, actions, SOURCE, LIVE }
}

type Store = ReturnType<typeof useStore>
const Ctx = createContext<Store | null>(null)
export function StoreProvider({ children }: { children: ReactNode }) {
  const s = useStore()
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>
}
export const useApp = () => useContext(Ctx)!
