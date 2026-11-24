import { MACHINES, MACHINE_ORDER, FILES, ALIASES } from './data'
import { useStore } from './store'
import { Dot, Icon, relTime } from './ui'
import { impact } from './derive'

export function Sidebar() {
  const { state, go } = useStore()
  const v = state.view
  const conflicts = (state.conflicts.up ? 0 : 1) + (state.conflicts.cargo ? 0 : 1)
  const imp = impact(state)

  const status = (id: (typeof MACHINE_ORDER)[number]) => {
    if (id === 'pi') {
      if (!state.piApplied) return { text: 'New · never synced', tone: 'new' }
      return imp.piWrites.length
        ? { text: `${imp.piWrites.length} file${imp.piWrites.length === 1 ? '' : 's'} to apply`, tone: 'warn' }
        : { text: 'Synced just now', tone: '' }
    }
    if (id === 'mac') {
      if (state.macPushed) return { text: 'Synced just now', tone: '' }
      return { text: `${relTime(MACHINES.mac.lastSynced)} · 3 unpushed`, tone: 'warn' }
    }
    return { text: `${MACHINES.thinkpad.role} · ${relTime(MACHINES.thinkpad.lastSynced)}`, tone: '' }
  }

  const active = (id: string) => (v.kind === 'machine' && v.id === id) || (id === 'pi' && v.kind === 'review')

  return (
    <aside className="sidebar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
          <rect width="32" height="32" rx="8" fill="#1d1c1a" />
          <circle cx="11" cy="16" r="3.2" fill="#f5f3ef" />
          <circle cx="21" cy="16" r="3.2" fill="#14a090" />
        </svg>
        <span>Dotwell</span>
      </div>

      <div className="side-label">Machines</div>
      <nav className="side-list">
        {MACHINE_ORDER.map((id) => {
          const st = status(id)
          return (
            <button key={id} className={'side-machine' + (active(id) ? ' active' : '')} onClick={() => go({ kind: 'machine', id })}>
              <Dot m={id} size={9} />
              <span className="side-machine-text">
                <span className="side-machine-name">{MACHINES[id].name}</span>
                <span className={'side-machine-status ' + st.tone}>{st.text}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="side-label">Library</div>
      <nav className="side-list">
        <button className={'side-item' + (v.kind === 'files' ? ' active' : '')} onClick={() => go({ kind: 'files' })}>
          <Icon name="file" />
          <span>Tracked files</span>
          <span className="count">{FILES.length}</span>
        </button>
        <button className={'side-item' + (v.kind === 'aliases' ? ' active' : '')} onClick={() => go({ kind: 'aliases' })}>
          <Icon name="alias" />
          <span>Aliases</span>
          <span className="count">{ALIASES.length}</span>
        </button>
        <button className={'side-item' + (v.kind === 'conflicts' ? ' active' : '')} onClick={() => go({ kind: 'conflicts' })}>
          <Icon name="conflict" />
          <span>Conflicts</span>
          {conflicts > 0 ? <span className="count alert">{conflicts}</span> : <span className="count">0</span>}
        </button>
      </nav>

      <div className="side-foot">
        <div className="side-foot-row">
          <Icon name="sync" size={13} />
          <span>Shared layer · git@nas:dotfiles.git</span>
        </div>
        <div className="side-foot-row muted">Dotwell 0.9.4</div>
      </div>
    </aside>
  )
}
