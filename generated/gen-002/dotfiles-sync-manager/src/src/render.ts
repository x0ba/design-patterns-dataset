import {
  ALIAS_GROUPS,
  ALIASES,
  FILES,
  GIT_IDENTITY,
  MACHINES,
  PLUGIN_DIR,
  PLUGINS,
  SEGMENTS,
  type MachineId,
} from './data'
import { BASELINE, effectiveSettings, type Snapshot } from './model'

const FOLD = '\u0000'
const fold = (n: number, label: string) => `${FOLD}${n}|${label}`
const auto = (label: string) => `${FOLD}A|${label}`

export function isFold(line: string) {
  return line.startsWith(FOLD)
}
export function parseFold(line: string): { n: number; label: string } {
  const [n, label] = line.slice(1).split('|')
  return { n: Number(n), label }
}

interface Ctx {
  m: MachineId
  snap: Snapshot
}

function header(path: string, m: MachineId, comment = '#') {
  return `${comment} ${path} · Dotwell · ${MACHINES[m].name}`
}

function zshrc({ m, snap }: Ctx): string[] {
  const fam = MACHINES[m].family
  const s = effectiveSettings(snap.configs[m])
  const plugins =
    fam === 'arch'
      ? [
          'source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh',
          'source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh',
        ]
      : fam === 'macos'
        ? [
            'source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh',
            'source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh',
          ]
        : [
            'source /usr/share/zsh-autosuggestions/zsh-autosuggestions.zsh',
            'source /usr/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh',
          ]
  const fzf =
    fam === 'arch'
      ? ['source /usr/share/fzf/key-bindings.zsh', 'source /usr/share/fzf/completion.zsh']
      : fam === 'macos'
        ? ['source <(fzf --zsh)']
        : ['source /usr/share/doc/fzf/examples/key-bindings.zsh', 'source /usr/share/doc/fzf/examples/completion.zsh']
  const clip =
    fam === 'arch'
      ? ["alias pbcopy='wl-copy'", "alias pbpaste='wl-paste'"]
      : fam === 'macos'
        ? ['# pbcopy / pbpaste are native']
        : ['# headless: no clipboard aliases']
  return [
    header('~/.zshrc', m),
    '# Edit in Dotwell. Local edits are picked up as changes on the next sync.',
    '',
    fold(21, 'setopt autocd extendedglob interactivecomments no_beep …'),
    '',
    'HISTFILE="$XDG_STATE_HOME/zsh/history"',
    `HISTSIZE=${s.histsize}`,
    `SAVEHIST=${s.histsize}`,
    'setopt share_history hist_ignore_all_dups hist_reduce_blanks',
    '',
    '# plugins',
    ...plugins,
    '',
    '# fzf',
    ...fzf,
    '',
    fold(46, 'completion: zstyle rules, compinit cache, uv and docker completions'),
    '',
    `export EDITOR=${s.editor}`,
    `export VISUAL=${s.editor}`,
    'export MANPAGER="nvim +Man!"',
    '',
    '# clipboard',
    ...clip,
    '',
    auto('vi-mode, keybindings, autoloaded widgets, directory hashes'),
    '',
    'source "$XDG_CONFIG_HOME/zsh/aliases.zsh"',
    'source "$XDG_CONFIG_HOME/zsh/functions.zsh"',
    '',
    'eval "$(starship init zsh)"',
  ]
}

function zshenv({ m, snap }: Ctx): string[] {
  const skipCargo = m === 'mac' && snap.conflicts.cargo === 'skip-shared'
  return [
    header('~/.zshenv', m),
    'export XDG_CONFIG_HOME="$HOME/.config"',
    'export XDG_DATA_HOME="$HOME/.local/share"',
    'export XDG_STATE_HOME="$HOME/.local/state"',
    'export XDG_CACHE_HOME="$HOME/.cache"',
    '',
    'export PATH="$HOME/.local/bin:$PATH"',
    ...(skipCargo ? ['# ~/.cargo/bin comes from rustup\'s env in .zprofile on this machine'] : ['export PATH="$HOME/.cargo/bin:$PATH"']),
    '',
    auto('GOPATH, PYTHONSTARTUP, LESSHISTFILE, RIPGREP_CONFIG_PATH'),
  ]
}

function zprofile({ m, snap }: Ctx): string[] {
  const fam = MACHINES[m].family
  const lines = [header('~/.zprofile', m)]
  if (fam === 'macos') {
    lines.push('eval "$(/opt/homebrew/bin/brew shellenv)"')
    if (snap.conflicts.cargo !== 'drop-rustup') lines.push('. "$HOME/.cargo/env"    # added by rustup-init')
  } else if (fam === 'arch') {
    lines.push('systemctl --user import-environment PATH')
  } else {
    lines.push('# login over SSH: nothing to start')
  }
  lines.push('', auto('umask, ulimit, keychain hints'))
  return lines
}

function aliases({ m, snap }: Ctx): string[] {
  const cfg = snap.configs[m]
  const piUp = m === 'pi' && snap.conflicts.up
  const groups = ALIAS_GROUPS.filter((g) => cfg.aliasGroups[g.id])
  const out: string[] = []
  const body: string[] = []
  let total = 0
  for (const g of groups) {
    const rows = ALIASES.filter((a) => a.group === g.id && !cfg.aliasOff.includes(`${a.group}:${a.name}`)).filter(
      (a) => !(piUp && a.name === 'up'),
    )
    total += rows.length
    body.push(`# ── ${g.label} ${'─'.repeat(Math.max(2, 40 - g.label.length))}`)
    for (const a of rows) body.push(`alias ${a.name}='${a.cmd}'`)
    if (m === 'mac' && g.id === 'homebrew') {
      body.push("alias ql='qlmanage -p'")
      total++
    }
    body.push('')
  }
  if (piUp) {
    body.push('# ── system (per-OS, from resolved conflict) ──', `alias up='${snap.conflicts.up!.pi}'`, '')
    total++
  }
  out.push(header('~/.config/zsh/aliases.zsh', m), `# ${total} aliases`, '', ...body)
  out.push(auto('named directories: hash -d src=~/src  notes=~/notes …'))
  return out
}

function starship({ m, snap }: Ctx): string[] {
  const seg = snap.configs[m].segments
  const on = SEGMENTS.filter((s) => seg[s.id])
  const fmt = '$username$hostname' + on.map((s) => '$' + s.module).join('')
  const out = [
    header('~/.config/starship.toml', m),
    '"$schema" = "https://starship.rs/config-schema.json"',
    '',
    'format = """',
    fmt,
    '$character"""',
    '',
    'add_newline = false',
    'command_timeout = 400',
    '',
    '[hostname]',
    'ssh_only = true',
    "format = '[$hostname]($style) '",
    '',
  ]
  const sections: Record<string, string[]> = {
    directory: ['[directory]', 'truncation_length = 3', 'truncate_to_repo = true', "style = 'bold cyan'"],
    git_branch: ['[git_branch]', "symbol = '⎇ '", "format = 'on [$symbol$branch]($style) '"],
    git_status: ['[git_status]', "format = '([\\[$all_status$ahead_behind\\]]($style) )'", 'ignore_submodules = true'],
    python: ['[python]', "format = 'via [${symbol}(${version} )(\\($virtualenv\\) )]($style)'", 'detect_extensions = []'],
    battery: ['[battery]', "full_symbol = '🔋 '", "discharging_symbol = '🪫 '", '[[battery.display]]', 'threshold = 30', "style = 'bold red'"],
    cmd_duration: ['[cmd_duration]', 'min_time = 2_000', "format = 'took [$duration]($style) '"],
    time: ['[time]', 'disabled = false', "time_format = '%H:%M'", "format = 'at [$time]($style) '"],
  }
  for (const s of on) out.push(...sections[s.id], '')
  out.push(auto('[character], [username], palette'))
  return out
}

function gitconfig({ m, snap }: Ctx): string[] {
  const cfg = snap.configs[m]
  const s = effectiveSettings(cfg)
  const out = [header('~/.gitconfig', m)]
  if (cfg.identity) {
    out.push('[user]', `\tname = ${GIT_IDENTITY.name}`, `\temail = ${GIT_IDENTITY.email}`)
    if (s.signingKey) out.push(`\tsigningkey = ${s.signingKey}`)
  } else {
    out.push('# [user] not set on this machine')
  }
  if (s.signingKey) out.push('[gpg]', '\tformat = ssh', '[commit]', '\tgpgsign = true')
  out.push('[init]', '\tdefaultBranch = main', '[pull]', '\trebase = true', '[core]', `\teditor = ${s.editor}`, `\tpager = ${s.pager}`)
  if (s.pager === 'delta') out.push('[interactive]', '\tdiffFilter = delta --color-only', '[delta]', '\tnavigate = true', '\tside-by-side = false')
  out.push('', auto('[alias], [rerere], [diff] algorithm = histogram, [merge] conflictstyle = zdiff3'))
  return out
}

function alacritty({ m, snap }: Ctx): string[] {
  const s = effectiveSettings(snap.configs[m])
  const fam = MACHINES[m].family
  const opacity = m === 'mac' ? '1.0' : '0.96' // mac-mini's local change
  const themeFile = String(s.theme).replace('-', '_')
  return [
    header('~/.config/alacritty/alacritty.toml', m),
    '[general]',
    `import = ["~/.config/alacritty/themes/${themeFile}.toml"]`,
    'live_config_reload = true',
    '',
    '[font]',
    `size = ${Number(s.fontSize).toFixed(1)}`,
    '',
    '[font.normal]',
    `family = "${s.fontFamily}"`,
    'style = "Regular"',
    '',
    '[window]',
    'padding = { x = 8, y = 6 }',
    `decorations = "${fam === 'macos' ? 'Buttonless' : fam === 'arch' ? 'None' : 'Full'}"`,
    `opacity = ${opacity}`,
    ...(fam === 'macos' ? ['option_as_alt = "Both"'] : []),
    '',
    auto('[keyboard] bindings, [selection], [cursor] style'),
  ]
}

function tmux({ m, snap }: Ctx): string[] {
  const cfg = snap.configs[m]
  const s = effectiveSettings(cfg)
  const prefix = String(s.tmuxPrefix)
  const key = prefix.replace('C-', '')
  const right = cfg.segments.battery ? "'#(~/.local/bin/battery-pct) │ %H:%M '" : "' %H:%M '"
  return [
    header('~/.tmux.conf', m),
    `set -g prefix ${prefix}`,
    'unbind C-b',
    `bind ${key === 'Space' ? 'Space' : key} send-prefix`,
    'set -g mouse on',
    'set -g base-index 1',
    'set -g default-terminal "tmux-256color"',
    'set -sa terminal-overrides ",alacritty:RGB"',
    '',
    auto('pane navigation, copy-mode-vi bindings, status bar colours'),
    '',
    `set -g status-right ${right}`,
  ]
}

function sshConfig({ m }: Ctx): string[] {
  const fam = MACHINES[m].family
  return [
    header('~/.ssh/config', m),
    'Host *',
    '  AddKeysToAgent yes',
    ...(fam === 'macos' ? ['  UseKeychain yes'] : []),
    '  IdentityFile ~/.ssh/id_ed25519',
    '  ServerAliveInterval 30',
    '  ServerAliveCountMax 4',
    '',
    'Host nas',
    '  HostName 192.168.1.20',
    '  User tomasz',
    '',
    ...(m === 'pi' ? [] : ['Host pi-media', '  HostName pi-media.local', '  User tomasz', '']),
    auto('github.com, router, hospital-vpn jump host'),
  ]
}

function generic(path: string, m: MachineId): string[] {
  if (path.startsWith(PLUGIN_DIR)) {
    const p = PLUGINS.find((x) => PLUGIN_DIR + x.file === path)!
    return [header(path, m, '--'), 'return {', `  "${p.repo}",`, auto(p.desc), '}']
  }
  if (path.endsWith('init.lua'))
    return [
      header(path, m, '--'),
      'vim.g.mapleader = " "',
      'require("config.options")',
      'require("config.keymaps")',
      '',
      auto('lazy.nvim bootstrap'),
      '',
      'require("lazy").setup({ spec = { import = "plugins" }, checker = { enabled = false } })',
    ]
  return [header(path, m), auto('identical on every machine')]
}

const RENDERERS: Record<string, (c: Ctx) => string[]> = {
  '~/.zshrc': zshrc,
  '~/.zshenv': zshenv,
  '~/.zprofile': zprofile,
  '~/.config/zsh/aliases.zsh': aliases,
  '~/.config/starship.toml': starship,
  '~/.gitconfig': gitconfig,
  '~/.config/alacritty/alacritty.toml': alacritty,
  '~/.tmux.conf': tmux,
  '~/.ssh/config': sshConfig,
}

function raw(path: string, m: MachineId, snap: Snapshot): string[] {
  const r = RENDERERS[path]
  return r ? r({ m, snap }) : generic(path, m)
}

const autoCache = new Map<string, number>()
function autoSize(path: string): number {
  if (!autoCache.has(path)) {
    const target = FILES.find((f) => f.path === path)!.lines
    const lines = raw(path, 'thinkpad', BASELINE)
    let count = 0
    for (const l of lines) {
      if (!isFold(l)) count++
      else if (!l.startsWith(FOLD + 'A|')) count += parseFold(l).n
    }
    autoCache.set(path, Math.max(3, target - count))
  }
  return autoCache.get(path)!
}

export function includes(path: string, m: MachineId, snap: Snapshot): boolean {
  const cfg = snap.configs[m]
  if (cfg.filesOff.includes(path)) return false
  if (path.startsWith(PLUGIN_DIR) && cfg.pluginsOff.includes(path.slice(PLUGIN_DIR.length))) return false
  return true
}

export function render(path: string, m: MachineId, snap: Snapshot): string[] | null {
  if (!includes(path, m, snap)) return null
  const n = autoSize(path)
  return raw(path, m, snap).map((l) => (l.startsWith(FOLD + 'A|') ? fold(n, l.slice(3)) : l))
}

export function lineCount(lines: string[] | null): number {
  if (!lines) return 0
  return lines.reduce((acc, l) => acc + (isFold(l) ? parseFold(l).n : 1), 0)
}

/* ---------------- diff ---------------- */

export type Op = { t: 'eq' | 'del' | 'add'; a?: string; b?: string; an?: number; bn?: number }

function normalizeForCompare(l: string) {
  // header line differs only by machine name; treat as equal when comparing machines
  return l.replace(/ · Dotwell · [\w-]+$/, ' · Dotwell')
}

export function diffLines(a: string[], b: string[]): Op[] {
  const A = a.map(normalizeForCompare)
  const B = b.map(normalizeForCompare)
  const n = A.length
  const m = B.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const ops: Op[] = []
  let i = 0
  let j = 0
  let an = 1
  let bn = 1
  const step = (l: string) => (isFold(l) ? parseFold(l).n : 1)
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) {
      ops.push({ t: 'eq', a: a[i], b: b[j], an, bn })
      an += step(a[i])
      bn += step(b[j])
      i++
      j++
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      ops.push({ t: 'add', b: b[j], bn })
      bn += step(b[j])
      j++
    } else {
      ops.push({ t: 'del', a: a[i], an })
      an += step(a[i])
      i++
    }
  }
  return ops
}

export interface Row {
  kind: 'eq' | 'chg' | 'del' | 'add'
  l?: { n: number; text: string }
  r?: { n: number; text: string }
}

export function toRows(ops: Op[]): Row[] {
  const rows: Row[] = []
  let k = 0
  while (k < ops.length) {
    const o = ops[k]
    if (o.t === 'eq') {
      rows.push({ kind: 'eq', l: { n: o.an!, text: o.a! }, r: { n: o.bn!, text: o.b! } })
      k++
      continue
    }
    const dels: Op[] = []
    const adds: Op[] = []
    while (k < ops.length && ops[k].t !== 'eq') {
      if (ops[k].t === 'del') dels.push(ops[k])
      else adds.push(ops[k])
      k++
    }
    const len = Math.max(dels.length, adds.length)
    for (let x = 0; x < len; x++) {
      const d = dels[x]
      const a = adds[x]
      rows.push({
        kind: d && a ? 'chg' : d ? 'del' : 'add',
        l: d ? { n: d.an!, text: d.a! } : undefined,
        r: a ? { n: a.bn!, text: a.b! } : undefined,
      })
    }
  }
  return rows
}

export function sameContent(a: string[] | null, b: string[] | null): boolean {
  if (a === null || b === null) return a === b
  if (a.length !== b.length) return false
  return a.every((l, i) => normalizeForCompare(l) === normalizeForCompare(b[i]))
}

export function exactSame(a: string[] | null, b: string[] | null): boolean {
  if (a === null || b === null) return a === b
  return a.length === b.length && a.every((l, i) => l === b[i])
}

export type FileStatus = 'same' | 'differs' | 'left-only' | 'right-only'

export function fileStatus(path: string, left: MachineId, right: MachineId, snap: Snapshot): FileStatus {
  const a = render(path, left, snap)
  const b = render(path, right, snap)
  if (a && !b) return 'left-only'
  if (!a && b) return 'right-only'
  return sameContent(a, b) ? 'same' : 'differs'
}

/** Files whose rendered output for machine m would change between two snapshots. */
export function changedFiles(m: MachineId, before: Snapshot, after: Snapshot): string[] {
  return FILES.filter((f) => !exactSame(render(f.path, m, before), render(f.path, m, after))).map((f) => f.path)
}
