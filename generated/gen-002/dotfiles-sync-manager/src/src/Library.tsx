import { useState } from 'react'
import { ALIAS_GROUPS, ALIASES, FILES, MACHINE_ORDER, type GroupId } from './data'
import { snapshotOf, useStore } from './store'
import { includes, lineCount, render } from './render'
import { Dot, Icon, MName } from './ui'

function Mark({ on }: { on: boolean }) {
  return on ? (
    <span className="mark on" aria-label="yes">
      <Icon name="check" size={12} />
    </span>
  ) : (
    <span className="mark off" aria-label="no">
      –
    </span>
  )
}

export function FilesPage() {
  const { state } = useStore()
  const snap = snapshotOf(state)
  const [q, setQ] = useState('')
  const rows = FILES.filter((f) => f.path.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tracked files</h1>
          <p className="sub">
            {FILES.length} files in the shared repo. Line counts are what each machine gets after templating. pi-media shows your current draft.
          </p>
        </div>
        <label className="search">
          <Icon name="search" />
          <input placeholder="Filter by path" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </header>
      <div className="page-body">
        <table className="table">
          <thead>
            <tr>
              <th>Path</th>
              <th>Group</th>
              <th>Kind</th>
              {MACHINE_ORDER.map((m) => (
                <th key={m} className="num">
                  <MName m={m} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.path}>
                <td>
                  <code>{f.path}</code>
                </td>
                <td className="muted">{f.group}</td>
                <td>{f.templated ? <span className="tag">templated</span> : <span className="muted small">plain</span>}</td>
                {MACHINE_ORDER.map((m) => (
                  <td key={m} className="num mono">
                    {includes(f.path, m, snap) ? lineCount(render(f.path, m, snap)) : <Mark on={false} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AliasesPage() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<GroupId | 'all'>('all')
  const rows = ALIASES.filter(
    (a) => (group === 'all' || a.group === group) && (a.name.includes(q) || a.cmd.toLowerCase().includes(q.toLowerCase())),
  )
  const has = (m: (typeof MACHINE_ORDER)[number], a: (typeof ALIASES)[number]) => {
    const cfg = state.configs[m]
    if (m === 'pi' && a.name === 'up' && state.conflicts.up) return false
    return cfg.aliasGroups[a.group] && !cfg.aliasOff.includes(`${a.group}:${a.name}`)
  }
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Aliases</h1>
          <p className="sub">{ALIASES.length} aliases, grouped by where they came from.</p>
        </div>
        <label className="search">
          <Icon name="search" />
          <input placeholder="Search name or command" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </header>
      <div className="page-body">
        <div className="filters" style={{ marginBottom: 14 }}>
          <button className={'chip' + (group === 'all' ? ' active' : '')} onClick={() => setGroup('all')}>
            All <span className="chip-n">{ALIASES.length}</span>
          </button>
          {ALIAS_GROUPS.map((g) => (
            <button key={g.id} className={'chip' + (group === g.id ? ' active' : '')} onClick={() => setGroup(g.id)}>
              {g.scope !== 'shared' && <Dot m={g.scope} size={6} />} {g.label} <span className="chip-n">{ALIASES.filter((a) => a.group === g.id).length}</span>
            </button>
          ))}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Alias</th>
              <th>Command</th>
              <th>Group</th>
              {MACHINE_ORDER.map((m) => (
                <th key={m} className="num">
                  <MName m={m} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.group + a.name} className={a.name === 'up' && !state.conflicts.up ? 'row-conflict' : ''}>
                <td>
                  <code className="alias-name">{a.name}</code>
                  {a.name === 'up' && !state.conflicts.up && <span className="tag warn">conflict</span>}
                </td>
                <td>
                  <code className="muted">{a.cmd}</code>
                </td>
                <td className="muted">{a.group}</td>
                {MACHINE_ORDER.map((m) => (
                  <td key={m} className="num">
                    <Mark on={has(m, a)} />
                  </td>
                ))}
              </tr>
            ))}
            {state.conflicts.up && (group === 'all' || q === 'up') && (
              <tr>
                <td>
                  <code className="alias-name">up</code> <span className="tag">per-OS</span>
                </td>
                <td>
                  <code className="muted">{state.conflicts.up.pi}</code>
                </td>
                <td className="muted">system</td>
                <td className="num">
                  <Mark on={false} />
                </td>
                <td className="num">
                  <Mark on={false} />
                </td>
                <td className="num">
                  <Mark on />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
