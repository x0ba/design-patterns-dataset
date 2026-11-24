import { ALIASES, FILES, PLUGINS, SEGMENTS, type MachineId } from './data'
import { BASELINE, snapshotOf, type AppState, type Snapshot } from './model'
import { changedFiles, includes } from './render'

export function aliasCount(m: MachineId, s: Snapshot): number {
  const cfg = s.configs[m]
  const piUp = m === 'pi' && !!s.conflicts.up
  let n = ALIASES.filter(
    (a) => cfg.aliasGroups[a.group] && !cfg.aliasOff.includes(`${a.group}:${a.name}`) && !(piUp && a.name === 'up'),
  ).length
  if (piUp) n++
  if (m === 'mac') n++ // local alias ql
  return n
}

export function segCount(m: MachineId, s: Snapshot) {
  return SEGMENTS.filter((x) => s.configs[m].segments[x.id]).length
}

export function pluginCount(m: MachineId, s: Snapshot) {
  return PLUGINS.filter((p) => !s.configs[m].pluginsOff.includes(p.file)).length
}

export function fileCount(m: MachineId, s: Snapshot) {
  return FILES.filter((f) => includes(f.path, m, s)).length
}

export const PROMPT_BASE_MS: Record<MachineId, number> = { thinkpad: 2.1, mac: 1.8, pi: 5.4 }

export function promptMs(m: MachineId, s: Snapshot) {
  return PROMPT_BASE_MS[m] + SEGMENTS.filter((x) => s.configs[m].segments[x.id]).reduce((a, x) => a + x.cost[m], 0)
}

export function fmtMs(ms: number) {
  return ms >= 10 ? `${Math.round(ms)} ms` : `${ms.toFixed(1)} ms`
}

export interface Impact {
  thinkpad: string[]
  mac: string[]
  piWrites: string[]
}

export function impact(state: AppState): Impact {
  const now = snapshotOf(state)
  const piBase = state.piApplied?.snapshot
  return {
    thinkpad: changedFiles('thinkpad', BASELINE, now),
    mac: changedFiles('mac', BASELINE, now),
    piWrites: piBase ? changedFiles('pi', piBase, now) : FILES.filter((f) => includes(f.path, 'pi', now)).map((f) => f.path),
  }
}

export function piOverrides(state: AppState): number {
  const c = state.configs.pi
  const b = BASELINE.configs.pi
  let n = 0
  for (const k of Object.keys(c.aliasGroups) as (keyof typeof c.aliasGroups)[]) if (c.aliasGroups[k] !== b.aliasGroups[k]) n++
  n += c.aliasOff.length
  for (const k of Object.keys(c.segments) as (keyof typeof c.segments)[]) if (c.segments[k] !== b.segments[k]) n++
  n += c.pluginsOff.length + c.filesOff.length
  if (c.identity !== b.identity) n++
  n += Object.keys(c.settings).length
  return n
}
