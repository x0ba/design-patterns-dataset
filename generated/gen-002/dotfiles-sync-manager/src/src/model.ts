import { SHARED_SETTINGS, type GroupId, type MachineId, type SegId, type SettingKey, type SettingValue } from './data'

export interface MachineConfig {
  aliasGroups: Record<GroupId, boolean>
  aliasOff: string[] // "group:name"
  segments: Record<SegId, boolean>
  pluginsOff: string[]
  filesOff: string[]
  identity: boolean
  settings: Partial<Record<SettingKey, SettingValue>>
}

export type View =
  | { kind: 'machine'; id: MachineId }
  | { kind: 'review' }
  | { kind: 'files' }
  | { kind: 'aliases' }
  | { kind: 'conflicts' }

export interface Conflicts {
  up: null | { pi: string }
  cargo: null | 'drop-rustup' | 'skip-shared'
}

export interface AppState {
  view: View
  configs: Record<MachineId, MachineConfig>
  conflicts: Conflicts
  locked: boolean
  macPushed: boolean
  piApplied: null | { at: Date; snapshot: Snapshot }
  compareWith: 'thinkpad' | 'mac'
  toast: null | { text: string; id: number }
}

export interface Snapshot {
  configs: Record<MachineId, MachineConfig>
  conflicts: Conflicts
  macPushed: boolean
}

const allSegs = (): Record<SegId, boolean> => ({
  directory: true,
  git_branch: true,
  git_status: true,
  python: true,
  battery: true,
  cmd_duration: true,
  time: true,
})

export const INITIAL_CONFIGS: Record<MachineId, MachineConfig> = {
  thinkpad: {
    aliasGroups: { git: true, docker: true, pacman: true, homebrew: false },
    aliasOff: [],
    segments: allSegs(),
    pluginsOff: [],
    filesOff: [],
    identity: true,
    settings: { signingKey: '~/.ssh/id_ed25519_sign.pub', sshAgent: 'systemd user ssh-agent' },
  },
  mac: {
    aliasGroups: { git: true, docker: true, pacman: false, homebrew: true },
    aliasOff: [],
    segments: allSegs(),
    pluginsOff: [],
    filesOff: [],
    identity: true,
    settings: { fontSize: 15, sshAgent: 'macOS Keychain' },
  },
  pi: {
    aliasGroups: { git: true, docker: true, pacman: false, homebrew: false },
    aliasOff: [],
    segments: allSegs(),
    pluginsOff: [],
    filesOff: [],
    identity: true,
    settings: {},
  },
}

export const INITIAL_CONFLICTS: Conflicts = { up: null, cargo: null }

export const BASELINE: Snapshot = {
  configs: INITIAL_CONFIGS,
  conflicts: INITIAL_CONFLICTS,
  macPushed: false,
}

export function effectiveSettings(cfg: MachineConfig): Record<SettingKey, SettingValue> {
  return { ...SHARED_SETTINGS, ...cfg.settings }
}

export function snapshotOf(s: AppState | Snapshot): Snapshot {
  return { configs: s.configs, conflicts: s.conflicts, macPushed: s.macPushed }
}

