export type MachineId = 'thinkpad' | 'mac' | 'pi'
export type OsFamily = 'arch' | 'macos' | 'debian'
export type GroupId = 'git' | 'docker' | 'pacman' | 'homebrew'
export type SegId = 'directory' | 'git_branch' | 'git_status' | 'python' | 'battery' | 'cmd_duration' | 'time'

export const NOW = new Date('2026-11-16T14:32:00')

export interface Fact {
  label: string
  value: string
  warn?: boolean
}

export interface Machine {
  id: MachineId
  name: string
  os: string
  family: OsFamily
  cpu: string
  host: string
  role: string
  color: string
  lastSynced: Date | null
  added: Date
  facts: Fact[]
}

export const MACHINES: Record<MachineId, Machine> = {
  thinkpad: {
    id: 'thinkpad',
    name: 'thinkpad-x1',
    os: 'Arch Linux',
    family: 'arch',
    cpu: 'x86_64',
    host: 'thinkpad-x1.lan',
    role: 'Primary',
    color: 'var(--m-thinkpad)',
    lastSynced: new Date('2026-11-16T12:31:00'),
    added: new Date('2024-03-02T19:10:00'),
    facts: [
      { label: 'Kernel', value: '6.11.8-arch1-1' },
      { label: 'Shell', value: 'zsh 5.9' },
      { label: 'Neovim', value: '0.10.2' },
      { label: 'Node.js', value: '22.11.0' },
      { label: 'starship', value: '1.21.1' },
      { label: 'Display', value: '2880×1800, Wayland (Hyprland)' },
      { label: 'Battery', value: 'BAT0, 57 Wh' },
    ],
  },
  mac: {
    id: 'mac',
    name: 'mac-mini-studio',
    os: 'macOS 15 Sequoia',
    family: 'macos',
    cpu: 'arm64 (M2)',
    host: 'mac-mini-studio.local',
    role: 'Studio desk',
    color: 'var(--m-mac)',
    lastSynced: new Date('2026-11-07T21:48:00'),
    added: new Date('2025-01-18T11:02:00'),
    facts: [
      { label: 'Version', value: 'macOS 15.1 (24B83)' },
      { label: 'Shell', value: 'zsh 5.9' },
      { label: 'Neovim', value: '0.10.2 (Homebrew)' },
      { label: 'Node.js', value: '22.9.0 (Homebrew)' },
      { label: 'starship', value: '1.20.1' },
      { label: 'Display', value: 'Studio Display 5K' },
      { label: 'Battery', value: 'none (desktop)' },
    ],
  },
  pi: {
    id: 'pi',
    name: 'pi-media',
    os: 'Raspberry Pi OS Bookworm',
    family: 'debian',
    cpu: 'aarch64 (Pi 5, 8 GB)',
    host: 'pi-media.local',
    role: 'Home media server',
    color: 'var(--m-pi)',
    lastSynced: null,
    added: new Date('2026-11-16T14:24:00'),
    facts: [
      { label: 'Kernel', value: '6.6.51 rpi-2712' },
      { label: 'Login shell', value: 'bash (zsh 5.9 too)' },
      { label: 'Neovim', value: '0.10.2' },
      { label: 'Node.js', value: 'not installed', warn: true },
      { label: 'git-delta', value: 'not installed', warn: true },
      { label: 'starship', value: '1.21.1' },
      { label: 'Docker', value: '27.3.1' },
      { label: 'Display', value: 'none attached' },
      { label: 'Battery', value: 'none', warn: true },
      { label: 'Storage', value: 'microSD + 2 TB SSD' },
    ],
  },
}

export const MACHINE_ORDER: MachineId[] = ['thinkpad', 'mac', 'pi']

/* ---------------- Aliases ---------------- */

export interface AliasGroup {
  id: GroupId
  label: string
  scope: 'shared' | MachineId
  needs: string
  note: string
}

export const ALIAS_GROUPS: AliasGroup[] = [
  { id: 'git', label: 'git', scope: 'shared', needs: 'git', note: 'Shared by every machine' },
  { id: 'docker', label: 'docker', scope: 'shared', needs: 'docker', note: 'Shared by every machine' },
  { id: 'pacman', label: 'pacman', scope: 'thinkpad', needs: 'pacman', note: 'Came from thinkpad-x1 (Arch)' },
  { id: 'homebrew', label: 'homebrew', scope: 'mac', needs: 'brew', note: 'Came from mac-mini-studio' },
]

export interface Alias {
  name: string
  cmd: string
  group: GroupId
}

const A = (group: GroupId, rows: [string, string][]): Alias[] => rows.map(([name, cmd]) => ({ name, cmd, group }))

export const ALIASES: Alias[] = [
  ...A('git', [
    ['g', 'git'],
    ['gs', 'git status -sb'],
    ['ga', 'git add'],
    ['gap', 'git add -p'],
    ['gc', 'git commit -v'],
    ['gca', 'git commit -v --amend'],
    ['gcm', 'git commit -m'],
    ['gco', 'git checkout'],
    ['gsw', 'git switch'],
    ['gb', 'git branch'],
    ['gbd', 'git branch -d'],
    ['gd', 'git diff'],
    ['gds', 'git diff --staged'],
    ['gl', 'git pull --rebase'],
    ['gp', 'git push'],
    ['gpf', 'git push --force-with-lease'],
    ['glo', 'git log --oneline --graph --decorate -20'],
    ['gst', 'git stash'],
    ['gstp', 'git stash pop'],
    ['grb', 'git rebase'],
    ['grbi', 'git rebase -i'],
    ['gcp', 'git cherry-pick'],
    ['gf', 'git fetch --all --prune'],
    ['gwt', 'git worktree'],
    ['grs', 'git restore'],
    ['grss', 'git restore --staged'],
  ]),
  ...A('docker', [
    ['d', 'docker'],
    ['dc', 'docker compose'],
    ['dcu', 'docker compose up -d'],
    ['dcd', 'docker compose down'],
    ['dcl', 'docker compose logs -f --tail=100'],
    ['dcr', 'docker compose restart'],
    ['dcp', 'docker compose pull'],
    ['dps', 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"'],
    ['dpa', 'docker ps -a'],
    ['di', 'docker images'],
    ['dex', 'docker exec -it'],
    ['dlog', 'docker logs -f'],
    ['dprune', 'docker system prune -f'],
    ['dvol', 'docker volume ls'],
    ['dnet', 'docker network ls'],
    ['dstats', 'docker stats --no-stream'],
  ]),
  ...A('pacman', [
    ['up', 'sudo pacman -Syu'],
    ['pac', 'sudo pacman -S'],
    ['pacs', 'pacman -Ss'],
    ['pacr', 'sudo pacman -Rns'],
    ['pacq', 'pacman -Qi'],
    ['pacl', 'pacman -Ql'],
    ['paco', 'pacman -Qdt'],
    ['pacclean', 'sudo paccache -rk2'],
    ['yup', 'yay -Syu'],
    ['mirrors', 'sudo reflector --latest 20 --sort rate --save /etc/pacman.d/mirrorlist'],
    ['pacfiles', 'pacman -F'],
    ['paclog', 'tail -n 50 /var/log/pacman.log'],
  ]),
  ...A('homebrew', [
    ['up', 'brew update && brew upgrade'],
    ['bi', 'brew install'],
    ['bs', 'brew search'],
    ['bu', 'brew uninstall'],
    ['bl', 'brew list'],
    ['bo', 'brew outdated'],
    ['bcl', 'brew cleanup --prune=7'],
    ['bdr', 'brew doctor'],
    ['bci', 'brew install --cask'],
    ['bbd', 'brew bundle dump --force --file=~/.Brewfile'],
  ]),
]

export const UP_APT_DEFAULT = 'sudo apt update && sudo apt full-upgrade'

/* ---------------- Prompt ---------------- */

export interface Segment {
  id: SegId
  label: string
  module: string
  desc: string
  cost: Record<MachineId, number>
}

export const SEGMENTS: Segment[] = [
  { id: 'directory', label: 'Directory', module: 'directory', desc: 'Current path, truncated to the repo root', cost: { thinkpad: 0.3, mac: 0.2, pi: 0.6 } },
  { id: 'git_branch', label: 'Git branch', module: 'git_branch', desc: 'Branch name when inside a repo', cost: { thinkpad: 1.8, mac: 1.4, pi: 6.2 } },
  { id: 'git_status', label: 'Git dirty count', module: 'git_status', desc: 'Runs git status on every prompt', cost: { thinkpad: 14, mac: 11, pi: 92 } },
  { id: 'python', label: 'Python venv', module: 'python', desc: 'Active virtualenv and interpreter version', cost: { thinkpad: 1.1, mac: 0.9, pi: 3.4 } },
  { id: 'battery', label: 'Battery', module: 'battery', desc: 'Charge level; also feeds the tmux status bar', cost: { thinkpad: 2.6, mac: 1.2, pi: 41 } },
  { id: 'cmd_duration', label: 'Command duration', module: 'cmd_duration', desc: 'Shown when a command takes over 2 s', cost: { thinkpad: 0.1, mac: 0.1, pi: 0.1 } },
  { id: 'time', label: 'Clock', module: 'time', desc: 'HH:MM at the end of the prompt line', cost: { thinkpad: 0.1, mac: 0.1, pi: 0.2 } },
]

export const MINIMAL_PRESET: SegId[] = ['directory', 'git_branch', 'cmd_duration']

/* ---------------- Neovim plugins ---------------- */

export interface Plugin {
  file: string
  repo: string
  lines: number
  needs: string[]
  desc: string
}

export const PLUGINS: Plugin[] = [
  { file: 'telescope.lua', repo: 'nvim-telescope/telescope.nvim', lines: 64, needs: ['ripgrep'], desc: 'Fuzzy finder' },
  { file: 'telescope-fzf-native.lua', repo: 'nvim-telescope/telescope-fzf-native.nvim', lines: 9, needs: ['make', 'gcc'], desc: 'Native sorter for telescope' },
  { file: 'treesitter.lua', repo: 'nvim-treesitter/nvim-treesitter', lines: 47, needs: ['gcc'], desc: 'Syntax trees, 18 parsers' },
  { file: 'lspconfig.lua', repo: 'neovim/nvim-lspconfig', lines: 81, needs: [], desc: 'LSP: ruff, pylsp, lua_ls' },
  { file: 'mason.lua', repo: 'williamboman/mason.nvim', lines: 22, needs: [], desc: 'Installs LSP servers and tools' },
  { file: 'nvim-cmp.lua', repo: 'hrsh7th/nvim-cmp', lines: 58, needs: [], desc: 'Completion engine' },
  { file: 'luasnip.lua', repo: 'L3MON4D3/LuaSnip', lines: 19, needs: [], desc: 'Snippets' },
  { file: 'conform.lua', repo: 'stevearc/conform.nvim', lines: 31, needs: [], desc: 'Format on save (ruff, stylua, shfmt)' },
  { file: 'nvim-lint.lua', repo: 'mfussenegger/nvim-lint', lines: 18, needs: [], desc: 'Linters (shellcheck, hadolint)' },
  { file: 'gitsigns.lua', repo: 'lewis6991/gitsigns.nvim', lines: 36, needs: [], desc: 'Git hunks in the sign column' },
  { file: 'fugitive.lua', repo: 'tpope/vim-fugitive', lines: 12, needs: [], desc: ':Git commands' },
  { file: 'lualine.lua', repo: 'nvim-lualine/lualine.nvim', lines: 27, needs: [], desc: 'Status line' },
  { file: 'which-key.lua', repo: 'folke/which-key.nvim', lines: 24, needs: [], desc: 'Keymap hints' },
  { file: 'oil.lua', repo: 'stevearc/oil.nvim', lines: 21, needs: [], desc: 'Edit directories like buffers' },
  { file: 'mini.lua', repo: 'echasnovski/mini.nvim', lines: 29, needs: [], desc: 'mini.surround, mini.ai, mini.pairs' },
  { file: 'tokyonight.lua', repo: 'folke/tokyonight.nvim', lines: 15, needs: [], desc: 'Colour scheme' },
  { file: 'todo-comments.lua', repo: 'folke/todo-comments.nvim', lines: 11, needs: ['ripgrep'], desc: 'Highlight TODO / FIXME' },
  { file: 'trouble.lua', repo: 'folke/trouble.nvim', lines: 20, needs: [], desc: 'Diagnostics list' },
  { file: 'harpoon.lua', repo: 'ThePrimeagen/harpoon', lines: 33, needs: [], desc: 'Pinned file jumps' },
  { file: 'undotree.lua', repo: 'mbbill/undotree', lines: 8, needs: [], desc: 'Undo history tree' },
  { file: 'nvim-dap.lua', repo: 'mfussenegger/nvim-dap', lines: 44, needs: [], desc: 'Debug adapter protocol' },
  { file: 'dap-python.lua', repo: 'mfussenegger/nvim-dap-python', lines: 14, needs: ['debugpy'], desc: 'Python debugging via debugpy' },
  { file: 'neotest.lua', repo: 'nvim-neotest/neotest', lines: 38, needs: [], desc: 'Test runner (pytest adapter)' },
  { file: 'copilot.lua', repo: 'zbirenbaum/copilot.lua', lines: 26, needs: ['node'], desc: 'GitHub Copilot suggestions' },
  { file: 'copilot-cmp.lua', repo: 'zbirenbaum/copilot-cmp', lines: 10, needs: ['node'], desc: 'Copilot as a cmp source' },
  { file: 'markdown-preview.lua', repo: 'iamcco/markdown-preview.nvim', lines: 16, needs: ['node'], desc: 'Live Markdown preview in a browser' },
  { file: 'typescript-tools.lua', repo: 'pmizio/typescript-tools.nvim', lines: 23, needs: ['node'], desc: 'TypeScript LSP via tsserver' },
]

export const NODE_PLUGINS = PLUGINS.filter((p) => p.needs.includes('node')).map((p) => p.file)

export const PI_HAS: Record<string, boolean> = {
  ripgrep: true,
  make: true,
  gcc: true,
  debugpy: true,
  node: false,
}

/* ---------------- Files ---------------- */

export type FileGroup = 'Shell' | 'Prompt' | 'Neovim' | 'Git' | 'Terminal' | 'SSH' | 'Misc'

export interface TrackedFile {
  path: string
  group: FileGroup
  lines: number
  templated: boolean
  plugin?: string
  note?: string
}

export const PLUGIN_DIR = '~/.config/nvim/lua/plugins/'

export const FILES: TrackedFile[] = [
  { path: '~/.zshrc', group: 'Shell', lines: 312, templated: true },
  { path: '~/.zshenv', group: 'Shell', lines: 18, templated: true },
  { path: '~/.zprofile', group: 'Shell', lines: 9, templated: true },
  { path: '~/.config/zsh/aliases.zsh', group: 'Shell', lines: 78, templated: true },
  { path: '~/.config/zsh/functions.zsh', group: 'Shell', lines: 141, templated: false },
  { path: '~/.config/starship.toml', group: 'Prompt', lines: 64, templated: true },
  { path: '~/.config/nvim/init.lua', group: 'Neovim', lines: 48, templated: false },
  ...PLUGINS.map((p) => ({ path: PLUGIN_DIR + p.file, group: 'Neovim' as const, lines: p.lines, templated: false, plugin: p.file })),
  { path: '~/.gitconfig', group: 'Git', lines: 46, templated: true },
  { path: '~/.config/git/ignore', group: 'Git', lines: 22, templated: false },
  { path: '~/.tmux.conf', group: 'Terminal', lines: 58, templated: true },
  { path: '~/.config/alacritty/alacritty.toml', group: 'Terminal', lines: 41, templated: true, note: 'Only read when a display is attached' },
  { path: '~/.ssh/config', group: 'SSH', lines: 37, templated: true },
  { path: '~/.editorconfig', group: 'Misc', lines: 16, templated: false },
  { path: '~/.config/htop/htoprc', group: 'Misc', lines: 33, templated: false },
]

/* ---------------- Settings ---------------- */

export type SettingKey =
  | 'fontSize'
  | 'fontFamily'
  | 'theme'
  | 'editor'
  | 'histsize'
  | 'tmuxPrefix'
  | 'pager'
  | 'signingKey'
  | 'sshAgent'

export type SettingValue = string | number | null

export interface SettingDef {
  key: SettingKey
  label: string
  where: string
  kind: 'number' | 'select' | 'text' | 'readonly'
  options?: string[]
  min?: number
  max?: number
}

export const SETTINGS: SettingDef[] = [
  { key: 'fontSize', label: 'Editor font size', where: 'alacritty.toml · font.size', kind: 'number', min: 8, max: 28 },
  { key: 'fontFamily', label: 'Editor font', where: 'alacritty.toml · font.normal', kind: 'select', options: ['JetBrainsMono Nerd Font', 'Iosevka Term', 'Fira Code', 'Hack Nerd Font'] },
  { key: 'theme', label: 'Colour theme', where: 'alacritty, nvim, tmux', kind: 'select', options: ['tokyonight-night', 'tokyonight-day', 'catppuccin-mocha', 'gruvbox-dark'] },
  { key: 'editor', label: 'Default $EDITOR', where: '.zshrc · .gitconfig', kind: 'select', options: ['nvim', 'vim', 'nano'] },
  { key: 'histsize', label: 'Shell history size', where: '.zshrc · HISTSIZE', kind: 'select', options: ['10000', '50000', '200000'] },
  { key: 'tmuxPrefix', label: 'tmux prefix', where: '.tmux.conf', kind: 'select', options: ['C-a', 'C-b', 'C-Space'] },
  { key: 'pager', label: 'git pager', where: '.gitconfig · core.pager', kind: 'select', options: ['delta', 'less -FRX'] },
  { key: 'signingKey', label: 'git signing key', where: '.gitconfig · user.signingkey', kind: 'readonly' },
  { key: 'sshAgent', label: 'SSH agent', where: '.ssh/config · .zprofile', kind: 'readonly' },
]

export const SHARED_SETTINGS: Record<SettingKey, SettingValue> = {
  fontSize: 13,
  fontFamily: 'JetBrainsMono Nerd Font',
  theme: 'tokyonight-night',
  editor: 'nvim',
  histsize: '50000',
  tmuxPrefix: 'C-a',
  pager: 'delta',
  signingKey: null,
  sshAgent: null,
}

export const GIT_IDENTITY = { name: 'Tomasz Kowalczyk', email: 'tomasz.kowalczyk@fastmail.com' }

export const MAC_LOCAL_CHANGES = [
  {
    file: '~/.zprofile',
    summary: 'rustup added its env line',
    added: ['. "$HOME/.cargo/env"    # added by rustup-init'],
    removed: [] as string[],
    when: 'Nov 9, 22:14',
  },
  {
    file: '~/.config/alacritty/alacritty.toml',
    summary: 'window opacity 0.96 → 1.0',
    added: ['opacity = 1.0'],
    removed: ['opacity = 0.96'],
    when: 'Nov 11, 20:03',
  },
  {
    file: '~/.config/zsh/aliases.zsh',
    summary: 'new alias ql',
    added: ["alias ql='qlmanage -p'"],
    removed: [] as string[],
    when: 'Nov 13, 19:41',
  },
]
