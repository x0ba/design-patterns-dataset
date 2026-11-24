import { ALIAS_GROUPS, MAC_LOCAL_CHANGES, MACHINES, SETTINGS, type MachineId } from './data'
import { snapshotOf, useStore } from './store'
import { aliasCount, fileCount, fmtMs, impact, pluginCount, promptMs, segCount } from './derive'
import { Callout, Dot, Icon, relTime } from './ui'
import { PromptLine } from './PromptPreview'

export function MachinePage({ id }: { id: Exclude<MachineId, 'pi'> }) {
  const { state, update, go, toast } = useStore()
  const m = MACHINES[id]
  const snap = snapshotOf(state)
  const imp = impact(state)
  const pending = imp[id]
  const cfg = state.configs[id]
  const isMac = id === 'mac'
  const unpushed = isMac && !state.macPushed
  const synced = isMac && state.macPushed ? 'just now' : relTime(m.lastSynced)

  const overrides = SETTINGS.filter((s) => cfg.settings[s.key] !== undefined)
  const ownGroups = ALIAS_GROUPS.filter((g) => g.scope === id)

  const stats = [
    ['Aliases', aliasCount(id, snap)],
    ['Prompt', `${segCount(id, snap)} segments · ${fmtMs(promptMs(id, snap))}`],
    ['Neovim plugins', pluginCount(id, snap)],
    ['Files', fileCount(id, snap)],
  ] as const

  return (
    <div className="page">
      <header className="mhead">
        <div className="mhead-top">
          <div className="mhead-title">
            <Dot m={id} size={12} />
            <h1>{m.name}</h1>
            {unpushed ? (
              <span className="pill warn">3 local changes not pushed</span>
            ) : pending.length ? (
              <span className="pill warn">{pending.length} file{pending.length === 1 ? '' : 's'} pending</span>
            ) : (
              <span className="pill ok">In sync</span>
            )}
            {id === 'thinkpad' && <span className="pill">Primary</span>}
          </div>
          <div className="mhead-actions">
            <button className="btn ghost" onClick={() => go({ kind: 'machine', id: 'pi' })}>
              <Dot m="pi" /> Back to pi-media setup
            </button>
          </div>
        </div>
        <div className="mhead-meta">
          <span>{m.os}</span>
          <span>{m.cpu}</span>
          <span className="mono">{m.host}</span>
          <span>{m.role}</span>
          <span>Last synced {synced}</span>
        </div>
      </header>

      <div className="mpage">
        <div className="mpage-main">
          {state.locked && (
            <Callout tone="info">
              <strong>Locked.</strong> While you set up pi-media, nothing in Dotwell can change {m.name}. Use the lock button on pi-media's page to unlock.
            </Callout>
          )}

          <div className="stat-cards">
            {stats.map(([k, v]) => (
              <div key={k} className="stat-card">
                <div className="stat-card-k">{k}</div>
                <div className="stat-card-v">{v}</div>
              </div>
            ))}
          </div>

          {unpushed && (
            <section className="section">
              <div className="section-head">
                <h2>Local changes on {m.name}</h2>
                <div className="section-meta">
                  <span className="stat warn-text">Not pushed · {relTime(m.lastSynced)} since last sync</span>
                </div>
              </div>
              <p className="section-desc">
                These edits were made on the Mac directly. Dotwell won't write to {m.name} until they're pushed, so nothing gets overwritten.
              </p>
              <div className="changes">
                {MAC_LOCAL_CHANGES.map((c) => (
                  <div key={c.file} className="change">
                    <div className="change-head">
                      <code>{c.file}</code>
                      <span className="muted small">
                        {c.summary} · {c.when}
                      </span>
                    </div>
                    <pre className="mini-diff">
                      {c.removed.map((l) => (
                        <div key={l} className="del">
                          − {l}
                        </div>
                      ))}
                      {c.added.map((l) => (
                        <div key={l} className="add">
                          + {l}
                        </div>
                      ))}
                    </pre>
                    {c.file === '~/.zprofile' && !state.conflicts.cargo && (
                      <div className="change-warn">
                        <Icon name="warn" size={12} /> Adds <code>~/.cargo/bin</code> to PATH a second time.{' '}
                        <button className="link" onClick={() => go({ kind: 'conflicts' })}>
                          Resolve conflict
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="section-foot">
                <button
                  className="btn primary"
                  onClick={() => {
                    update((d) => {
                      d.macPushed = true
                    })
                    toast('Pushed 3 changes from mac-mini-studio')
                  }}
                >
                  Push 3 changes to the shared repo
                </button>
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-head">
              <h2>Pending from Dotwell</h2>
            </div>
            {pending.length === 0 ? (
              <p className="section-desc">Nothing. {m.name}'s rendered files match what it last received.</p>
            ) : (
              <>
                <p className="section-desc">These files will change on {m.name}'s next sync:</p>
                <ul className="plain-list">
                  {pending.map((p) => (
                    <li key={p}>
                      <code>{p}</code>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Set on this machine only</h2>
            </div>
            <div className="rows">
              {overrides.map((s) => (
                <div key={s.key} className="row">
                  <div className="row-main">
                    <div className="row-title">{s.label}</div>
                    <div className="row-sub">{s.where}</div>
                  </div>
                  <code>{String(cfg.settings[s.key])}</code>
                </div>
              ))}
              {ownGroups.map((g) => (
                <div key={g.id} className="row">
                  <div className="row-main">
                    <div className="row-title">
                      <span className="mono">{g.label}</span> alias group
                    </div>
                    <div className="row-sub">Only machines with {g.needs} get this group</div>
                  </div>
                  <code>{cfg.aliasGroups[g.id] ? 'on' : 'off'}</code>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="mpage-side">
          <div className="term-block">
            <div className="term-label">
              <span>Prompt on {m.name}</span>
              <span className="cost">~{fmtMs(promptMs(id, snap))}</span>
            </div>
            <PromptLine m={id} snap={snap} />
          </div>
          <div className="facts vertical">
            {m.facts.map((f) => (
              <div key={f.label} className="fact">
                <span className="fact-label">{f.label}</span>
                <span className="fact-val">{f.value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
