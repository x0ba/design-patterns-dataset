import { useState, type ReactNode } from 'react'
import {
  ALIAS_GROUPS,
  ALIASES,
  FILES,
  GIT_IDENTITY,
  MACHINES,
  MINIMAL_PRESET,
  NODE_PLUGINS,
  PI_HAS,
  PLUGINS,
  SEGMENTS,
  SETTINGS,
  SHARED_SETTINGS,
  type GroupId,
  type MachineId,
  type SettingDef,
  type SettingValue,
} from './data'
import { BASELINE, effectiveSettings, snapshotOf, useStore } from './store'
import { aliasCount, fileCount, fmtMs, impact, piOverrides, pluginCount, promptMs, segCount } from './derive'
import { Callout, Check, Dot, Icon, MName, Scope, Switch, relTime } from './ui'
import { PromptCost, PromptLine } from './PromptPreview'
import { UpConflict } from './Conflicts'

/* ---------------- header shared by setup + review ---------------- */

export function PiHeader() {
  const { state, update, go, toast } = useStore()
  const m = MACHINES.pi
  const onReview = state.view.kind === 'review'
  const imp = impact(state)
  const overrides = piOverrides(state)
  return (
    <header className="mhead">
      <div className="mhead-top">
        <div className="mhead-title">
          <Dot m="pi" size={12} />
          <h1>{m.name}</h1>
          {state.piApplied ? (
            <span className={'pill ' + (imp.piWrites.length ? 'warn' : 'ok')}>
              {imp.piWrites.length ? `Synced ${relTime(state.piApplied.at)} · ${imp.piWrites.length} pending` : 'Synced just now'}
            </span>
          ) : (
            <span className="pill new">Never synced</span>
          )}
        </div>
        <div className="mhead-actions">
          <button
            className={'lock-toggle' + (state.locked ? '' : ' open')}
            onClick={() => {
              update((d) => {
                d.locked = !d.locked
              })
              toast(state.locked ? 'thinkpad-x1 and mac-mini-studio are now editable' : 'Other machines locked again')
            }}
            title="While locked, nothing you do here can change thinkpad-x1 or mac-mini-studio"
          >
            <Icon name={state.locked ? 'lock' : 'unlock'} />
            {state.locked ? 'Other machines locked' : 'Other machines editable'}
          </button>
          {overrides > 0 && !onReview && (
            <button
              className="btn ghost"
              onClick={() => {
                update((d) => {
                  d.configs.pi = structuredClone(BASELINE.configs.pi)
                })
                toast('pi-media reset to inherit everything')
              }}
            >
              <Icon name="undo" /> Reset pi-media
            </button>
          )}
        </div>
      </div>
      <div className="mhead-meta">
        <span>{m.os}</span>
        <span>{m.cpu}</span>
        <span className="mono">{m.host}</span>
        <span>{m.role}</span>
        <span>Added {relTime(m.added)}</span>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={!onReview} className={'tab' + (!onReview ? ' active' : '')} onClick={() => go({ kind: 'machine', id: 'pi' })}>
          <span className="tab-step">1</span> Choose what it inherits
          {overrides > 0 && <span className="tab-count">{overrides}</span>}
        </button>
        <button role="tab" aria-selected={onReview} className={'tab' + (onReview ? ' active' : '')} onClick={() => go({ kind: 'review' })}>
          <span className="tab-step">2</span> Compare &amp; apply
          <span className="tab-count muted">{imp.piWrites.length} files</span>
        </button>
      </div>
    </header>
  )
}

/* ---------------- section wrapper ---------------- */

function Section({ id, title, meta, children, desc }: { id: string; title: string; meta?: ReactNode; desc?: ReactNode; children: ReactNode }) {
  return (
    <section className="section" id={id}>
      <div className="section-head">
        <h2>{title}</h2>
        {meta && <div className="section-meta">{meta}</div>}
      </div>
      {desc && <p className="section-desc">{desc}</p>}
      {children}
    </section>
  )
}

/* ---------------- aliases ---------------- */

function AliasSection() {
  const { state, update } = useStore()
  const cfg = state.configs.pi
  const [open, setOpen] = useState<GroupId | null>(null)
  const snap = snapshotOf(state)
  const n = aliasCount('pi', snap)
  const changed = ALIAS_GROUPS.some((g) => cfg.aliasGroups[g.id] !== BASELINE.configs.pi.aliasGroups[g.id]) || cfg.aliasOff.length > 0

  return (
    <Section
      id="sec-aliases"
      title="Shell aliases"
      meta={
        <>
          <span className="stat">
            <strong>{n}</strong> of {ALIASES.length}
          </span>
          <Scope kind={changed ? 'override' : 'inherited'} />
        </>
      }
      desc="Groups shared by every machine are on. Groups that came from one machine stay off unless pi-media has that tool."
    >
      <div className="rows">
        {ALIAS_GROUPS.map((g) => {
          const on = cfg.aliasGroups[g.id]
          const items = ALIASES.filter((a) => a.group === g.id)
          const offCount = items.filter((a) => cfg.aliasOff.includes(`${a.group}:${a.name}`)).length
          const missing = g.id === 'pacman' || g.id === 'homebrew'
          return (
            <div key={g.id} className={'row-wrap' + (open === g.id ? ' open' : '')}>
              <div className="row">
                <Switch
                  on={on}
                  label={`Include ${g.label} aliases`}
                  onChange={(v) =>
                    update((d) => {
                      d.configs.pi.aliasGroups[g.id] = v
                    })
                  }
                />
                <div className="row-main">
                  <div className="row-title">
                    <span className="mono">{g.label}</span>
                    <span className="muted">
                      {on ? `${items.length - offCount} of ${items.length}` : `${items.length} aliases`}
                    </span>
                  </div>
                  <div className="row-sub">
                    {g.scope === 'shared' ? 'Shared by every machine' : <>From <MName m={g.scope as MachineId} /></>}
                    {missing && (
                      <span className={on ? 'warn-text' : 'muted'}>
                        {' '}
                        · <code>{g.needs}</code> isn't installed on pi-media
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn ghost sm" onClick={() => setOpen(open === g.id ? null : g.id)} aria-expanded={open === g.id}>
                  {open === g.id ? 'Hide' : 'Show'} aliases
                  <span className={'chev' + (open === g.id ? ' down' : '')}>
                    <Icon name="chev" size={12} />
                  </span>
                </button>
              </div>
              {open === g.id && (
                <div className="alias-grid">
                  {items.map((a) => {
                    const key = `${a.group}:${a.name}`
                    const aOn = on && !cfg.aliasOff.includes(key)
                    return (
                      <div key={key} className={'alias-item' + (aOn ? '' : ' off')}>
                        <Check
                          on={aOn}
                          label={`Include alias ${a.name}`}
                          onChange={(v) =>
                            update((d) => {
                              const c = d.configs.pi
                              if (v) {
                                c.aliasGroups[g.id] = true
                                c.aliasOff = c.aliasOff.filter((x) => x !== key)
                              } else if (!c.aliasOff.includes(key)) c.aliasOff.push(key)
                            })
                          }
                        >
                          <code className="alias-name">{a.name}</code>
                        </Check>
                        <code className="alias-cmd" title={a.cmd}>
                          {a.cmd}
                        </code>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!state.conflicts.up ? (
        <div className="sub-block">
          <UpConflict compact />
        </div>
      ) : (
        <div className="sub-block">
          <Callout tone="ok">
            pi-media gets <code>alias up='{state.conflicts.up.pi}'</code> from the resolved conflict.
          </Callout>
        </div>
      )}
    </Section>
  )
}

/* ---------------- prompt ---------------- */

function PromptSection() {
  const { state, update } = useStore()
  const seg = state.configs.pi.segments
  const snap = snapshotOf(state)
  const max = Math.max(...SEGMENTS.map((s) => s.cost.pi))
  const isMinimal = SEGMENTS.every((s) => seg[s.id] === MINIMAL_PRESET.includes(s.id))
  const isAll = SEGMENTS.every((s) => seg[s.id])

  return (
    <Section
      id="sec-prompt"
      title="Prompt"
      meta={
        <>
          <span className="stat">
            <strong>{segCount('pi', snap)}</strong> of {SEGMENTS.length} segments
          </span>
          <span className={'stat' + (promptMs('pi', snap) > 50 ? ' slow' : '')}>~{fmtMs(promptMs('pi', snap))} on pi-media</span>
          <Scope kind={isAll ? 'inherited' : 'override'} />
        </>
      }
      desc={
        <>
          Times are from <code>starship timings</code>, run on pi-media during its first check-in. Over SSH, each one adds to every prompt.
        </>
      }
    >
      <div className="preset-row">
        <span className="muted">Preset</span>
        <button
          className={'seg-btn' + (isAll ? ' active' : '')}
          onClick={() =>
            update((d) => {
              for (const s of SEGMENTS) d.configs.pi.segments[s.id] = true
            })
          }
        >
          Same as shared · 7
        </button>
        <button
          className={'seg-btn' + (isMinimal ? ' active' : '')}
          onClick={() =>
            update((d) => {
              for (const s of SEGMENTS) d.configs.pi.segments[s.id] = MINIMAL_PRESET.includes(s.id)
            })
          }
        >
          Minimal for SSH · directory, branch, duration
        </button>
      </div>
      <div className="rows">
        {SEGMENTS.map((s) => {
          const on = seg[s.id]
          const hint =
            s.id === 'battery'
              ? 'pi-media has no battery. The module still probes for one on every prompt.'
              : s.id === 'git_status'
                ? 'Runs git status in ~/media-stack on the microSD card.'
                : null
          return (
            <div key={s.id} className="row">
              <Switch
                on={on}
                label={`Show ${s.label} segment`}
                onChange={(v) =>
                  update((d) => {
                    d.configs.pi.segments[s.id] = v
                  })
                }
              />
              <div className="row-main">
                <div className="row-title">
                  <span>{s.label}</span>
                  <code className="muted small">{s.module}</code>
                </div>
                <div className="row-sub">
                  {hint && on ? <span className="warn-text">{hint}</span> : s.desc}
                </div>
              </div>
              <div className="cost-cell">
                <div className="bar">
                  <span className={'bar-fill' + (on ? '' : ' off') + (s.cost.pi > 30 ? ' slow' : '')} style={{ width: `${Math.max(2, (s.cost.pi / max) * 100)}%` }} />
                </div>
                <span className={'cost-num' + (s.cost.pi > 30 && on ? ' slow' : '')}>{fmtMs(s.cost.pi)}</span>
                <span className="cost-other" title="Same segment on thinkpad-x1">
                  <Dot m="thinkpad" size={6} /> {fmtMs(s.cost.thinkpad)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ---------------- neovim ---------------- */

function PluginSection() {
  const { state, update } = useStore()
  const off = state.configs.pi.pluginsOff
  const snap = snapshotOf(state)
  const nodeOn = NODE_PLUGINS.filter((f) => !off.includes(f))
  return (
    <Section
      id="sec-nvim"
      title="Neovim plugins"
      meta={
        <>
          <span className="stat">
            <strong>{pluginCount('pi', snap)}</strong> of {PLUGINS.length} specs
          </span>
          <Scope kind={off.length ? 'override' : 'inherited'} />
        </>
      }
      desc={
        <>
          Each plugin is one file in <code>~/.config/nvim/lua/plugins/</code>. A skipped file isn't written to pi-media, so lazy.nvim never loads it. <code>init.lua</code> stays the same.
        </>
      }
    >
      {nodeOn.length > 0 ? (
        <Callout
          tone="warn"
          action={
            <button
              className="btn sm"
              onClick={() =>
                update((d) => {
                  for (const f of NODE_PLUGINS) if (!d.configs.pi.pluginsOff.includes(f)) d.configs.pi.pluginsOff.push(f)
                })
              }
            >
              Skip {nodeOn.length === 1 ? 'it' : `these ${nodeOn.length}`}
            </button>
          }
        >
          Node.js isn't installed on pi-media. {nodeOn.length === NODE_PLUGINS.length ? 'These' : `${nodeOn.length} of these`} need it:{' '}
          {nodeOn.map((f, i) => (
            <span key={f}>
              <code>{f.replace('.lua', '')}</code>
              {i < nodeOn.length - 1 ? ', ' : ''}
            </span>
          ))}
          .
        </Callout>
      ) : (
        <Callout tone="ok">No plugins that need Node.js. lazy.nvim on pi-media will install {pluginCount('pi', snap)} plugins.</Callout>
      )}
      <div className="plugin-grid">
        {PLUGINS.map((p) => {
          const on = !off.includes(p.file)
          const missing = p.needs.filter((n) => !PI_HAS[n])
          return (
            <div key={p.file} className={'plugin' + (on ? '' : ' off') + (missing.length && on ? ' bad' : '')}>
              <Check
                on={on}
                label={`Include ${p.file}`}
                onChange={(v) =>
                  update((d) => {
                    const c = d.configs.pi
                    c.pluginsOff = v ? c.pluginsOff.filter((x) => x !== p.file) : [...c.pluginsOff, p.file]
                  })
                }
              >
                <span className="plugin-name">{p.file.replace('.lua', '')}</span>
              </Check>
              <div className="plugin-desc">{p.desc}</div>
              {p.needs.length > 0 && (
                <div className="needs">
                  {p.needs.map((n) => (
                    <span key={n} className={'need' + (PI_HAS[n] ? '' : ' missing')}>
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ---------------- git ---------------- */

function GitSection() {
  const { state, update } = useStore()
  const cfg = state.configs.pi
  const s = effectiveSettings(cfg)
  const pagerOverride = cfg.settings.pager !== undefined
  return (
    <Section
      id="sec-git"
      title="Git"
      meta={<Scope kind={!cfg.identity || pagerOverride ? 'override' : 'inherited'} />}
      desc={<>Renders into <code>~/.gitconfig</code>.</>}
    >
      <div className="rows">
        <div className="row">
          <Switch
            on={cfg.identity}
            label="Inherit git identity"
            onChange={(v) =>
              update((d) => {
                d.configs.pi.identity = v
              })
            }
          />
          <div className="row-main">
            <div className="row-title">Identity</div>
            <div className="row-sub mono">
              {GIT_IDENTITY.name} &lt;{GIT_IDENTITY.email}&gt;
            </div>
          </div>
          <Scope kind="shared" />
        </div>
        <div className="row">
          <span className="row-lock" title="Set on thinkpad-x1 only">
            <Icon name="lock" />
          </span>
          <div className="row-main">
            <div className="row-title">Commit signing</div>
            <div className="row-sub">
              The SSH signing key lives on thinkpad-x1 only and won't be copied. Commits made on pi-media won't be signed.
            </div>
          </div>
          <Scope kind="thinkpad" />
        </div>
        <div className="row">
          <span className="row-lock muted">
            <Icon name="terminal" />
          </span>
          <div className="row-main">
            <div className="row-title">
              Pager <code className="small">{s.pager}</code>
            </div>
            <div className="row-sub">
              {s.pager === 'delta' ? (
                <span className="warn-text">git-delta isn't installed on pi-media. git log and git diff will fail to page.</span>
              ) : (
                'Plain less on pi-media. Other machines keep delta.'
              )}
            </div>
          </div>
          {s.pager === 'delta' ? (
            <button
              className="btn sm"
              onClick={() =>
                update((d) => {
                  d.configs.pi.settings.pager = 'less -FRX'
                })
              }
            >
              Use less here
            </button>
          ) : (
            <button
              className="btn ghost sm"
              onClick={() =>
                update((d) => {
                  delete d.configs.pi.settings.pager
                })
              }
            >
              <Icon name="undo" /> Inherit delta
            </button>
          )}
        </div>
      </div>
    </Section>
  )
}

/* ---------------- per-machine settings ---------------- */

function SettingControl({ def, value, onChange }: { def: SettingDef; value: SettingValue; onChange: (v: SettingValue) => void }) {
  if (def.kind === 'number')
    return (
      <div className="stepper">
        <button aria-label={`Decrease ${def.label}`} onClick={() => onChange(Math.max(def.min ?? 0, Number(value) - 1))}>
          −
        </button>
        <input
          type="number"
          value={Number(value)}
          min={def.min}
          max={def.max}
          aria-label={def.label}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isNaN(n)) onChange(Math.min(def.max ?? 99, Math.max(def.min ?? 0, n)))
          }}
        />
        <button aria-label={`Increase ${def.label}`} onClick={() => onChange(Math.min(def.max ?? 99, Number(value) + 1))}>
          +
        </button>
      </div>
    )
  if (def.kind === 'select')
    return (
      <select className="select" value={String(value)} onChange={(e) => onChange(e.target.value)} aria-label={def.label}>
        {def.options!.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    )
  return <span>{value ?? '—'}</span>
}

function SettingsSection() {
  const { state, update, toast } = useStore()
  const [nudge, setNudge] = useState<MachineId | null>(null)
  const others: MachineId[] = ['thinkpad', 'mac']
  const overrides = Object.keys(state.configs.pi.settings).length

  const setVal = (m: MachineId, def: SettingDef, v: SettingValue) =>
    update((d) => {
      const c = d.configs[m]
      const shared = SHARED_SETTINGS[def.key]
      const norm = def.kind === 'number' ? Number(v) : v
      if (norm === shared) delete c.settings[def.key]
      else c.settings[def.key] = norm
    })

  return (
    <Section
      id="sec-settings"
      title="Per-machine settings"
      meta={
        <>
          <span className="stat">
            <strong>{overrides}</strong> pi-media override{overrides === 1 ? '' : 's'}
          </span>
        </>
      }
      desc="A value set in the pi-media column applies to pi-media only. Empty cells inherit the shared value."
    >
      {nudge && state.locked && (
        <Callout
          tone="info"
          action={
            <div className="btn-row">
              <button className="btn ghost sm" onClick={() => setNudge(null)}>
                Keep locked
              </button>
              <button
                className="btn sm"
                onClick={() => {
                  update((d) => {
                    d.locked = false
                  })
                  setNudge(null)
                  toast('thinkpad-x1 and mac-mini-studio are now editable')
                }}
              >
                Unlock
              </button>
            </div>
          }
        >
          {MACHINES[nudge].name} is locked while you set up pi-media, so nothing here can change it by accident.
        </Callout>
      )}
      <div className="matrix-wrap">
        <table className="matrix">
          <colgroup>
            <col className="c-set" />
            <col className="c-shared" />
            <col className="c-m" />
            <col className="c-m" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>Setting</th>
              <th>Shared</th>
              {others.map((m) => (
                <th key={m} className="m-col">
                  <MName m={m} />
                  <div className="m-col-sub">
                    <Icon name={state.locked ? 'lock' : 'unlock'} size={11} /> {state.locked ? 'locked' : 'editable'}
                  </div>
                </th>
              ))}
              <th className="pi-col">
                <MName m="pi" />
              </th>
            </tr>
          </thead>
          <tbody>
            {SETTINGS.map((def) => {
              const shared = SHARED_SETTINGS[def.key]
              const piOv = state.configs.pi.settings[def.key]
              const piVal = piOv !== undefined ? piOv : shared
              return (
                <tr key={def.key}>
                  <td>
                    <div className="set-label">{def.label}</div>
                    <div className="set-where">{def.where}</div>
                  </td>
                  <td className="mono muted">{shared ?? '—'}</td>
                  {others.map((m) => {
                    const ov = state.configs[m].settings[def.key]
                    const val = ov !== undefined ? ov : shared
                    const editable = !state.locked && def.kind !== 'readonly'
                    const changed = ov !== BASELINE.configs[m].settings[def.key]
                    return (
                      <td key={m} className={'m-cell' + (ov !== undefined ? ' has-ov' : '') + (changed ? ' changed' : '')}>
                        {editable ? (
                          <SettingControl def={def} value={val} onChange={(v) => setVal(m, def, v)} />
                        ) : (
                          <button className="cell-btn" onClick={() => def.kind !== 'readonly' && setNudge(m)} disabled={def.kind === 'readonly'} title={ov !== undefined ? String(ov) : undefined}>
                            {ov !== undefined ? <span className="mono">{String(ov)}</span> : <span className="inherit-dash">inherits</span>}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className={'pi-cell' + (piOv !== undefined ? ' has-ov' : '')}>
                    {def.kind === 'readonly' ? (
                      <span className="muted small">
                        {def.key === 'signingKey' ? 'Not set: stays on thinkpad-x1' : 'Not set: uses the agent forwarded over SSH'}
                      </span>
                    ) : (
                      <div className={'pi-cell-inner' + (piOv === undefined ? ' inheriting' : '')} title={piOv === undefined ? 'Inherits the shared value' : 'Set for pi-media only'}>
                        <SettingControl def={def} value={piVal} onChange={(v) => setVal('pi', def, v)} />
                        {piOv !== undefined ? (
                          <button
                            className="icon-btn"
                            title="Reset to shared value"
                            aria-label={`Reset ${def.label} to shared`}
                            onClick={() =>
                              update((d) => {
                                delete d.configs.pi.settings[def.key]
                              })
                            }
                          >
                            <Icon name="undo" size={13} />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/* ---------------- files ---------------- */

function FilesSection() {
  const { state, update, go } = useStore()
  const snap = snapshotOf(state)
  const cfg = state.configs.pi
  const nonPlugin = FILES.filter((f) => !f.plugin)
  const groups = [...new Set(nonPlugin.map((f) => f.group))]
  return (
    <Section
      id="sec-files"
      title="Tracked files"
      meta={
        <>
          <span className="stat">
            <strong>{fileCount('pi', snap)}</strong> of {FILES.length} files
          </span>
          <Scope kind={cfg.filesOff.length ? 'override' : 'inherited'} />
        </>
      }
      desc="Templated files get each machine's values when Dotwell writes them. Plugin specs follow your Neovim choices above."
    >
      <div className="file-list">
        {groups.map((g) => (
          <div key={g} className="file-group">
            <div className="file-group-label">{g}</div>
            {nonPlugin
              .filter((f) => f.group === g)
              .map((f) => {
                const on = !cfg.filesOff.includes(f.path)
                return (
                  <div key={f.path} className={'file-row' + (on ? '' : ' off')}>
                    <Switch
                      on={on}
                      label={`Write ${f.path} to pi-media`}
                      onChange={(v) =>
                        update((d) => {
                          const c = d.configs.pi
                          c.filesOff = v ? c.filesOff.filter((x) => x !== f.path) : [...c.filesOff, f.path]
                        })
                      }
                    />
                    <code className="file-path">{f.path}</code>
                    {f.templated && <span className="tag">templated</span>}
                    {f.note && <span className="muted small">{f.note}</span>}
                    <span className="file-lines">{f.lines} lines</span>
                  </div>
                )
              })}
            {g === 'Neovim' && (
              <div className="file-row plugin-summary">
                <span className="row-lock muted">
                  <Icon name="file" />
                </span>
                <code className="file-path">~/.config/nvim/lua/plugins/*.lua</code>
                <span className="muted small">
                  {pluginCount('pi', snap)} of {PLUGINS.length} specs ·{' '}
                  <button className="link" onClick={() => document.getElementById('sec-nvim')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                    set in Neovim plugins
                  </button>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="section-foot">
        <button className="btn primary" onClick={() => go({ kind: 'review' })}>
          Compare pi-media with thinkpad-x1 <Icon name="arrow" />
        </button>
      </div>
    </Section>
  )
}

/* ---------------- right panel ---------------- */

export function ResultPanel() {
  const { state, update, go, toast } = useStore()
  const snap = snapshotOf(state)
  const other = state.compareWith
  const imp = impact(state)
  const es = (m: MachineId) => effectiveSettings(snap.configs[m])

  const rows: { label: string; a: ReactNode; b: ReactNode; differ: boolean }[] = [
    { label: 'Aliases', a: aliasCount(other, snap), b: aliasCount('pi', snap), differ: aliasCount(other, snap) !== aliasCount('pi', snap) },
    { label: 'Prompt segments', a: segCount(other, snap), b: segCount('pi', snap), differ: segCount(other, snap) !== segCount('pi', snap) },
    { label: 'Neovim plugins', a: pluginCount(other, snap), b: pluginCount('pi', snap), differ: pluginCount(other, snap) !== pluginCount('pi', snap) },
    { label: 'Files', a: fileCount(other, snap), b: fileCount('pi', snap), differ: fileCount(other, snap) !== fileCount('pi', snap) },
    { label: 'Editor font size', a: es(other).fontSize, b: es('pi').fontSize, differ: es(other).fontSize !== es('pi').fontSize },
    { label: 'Commit signing', a: es(other).signingKey ? 'on' : 'off', b: 'off', differ: !!es(other).signingKey },
    { label: 'git pager', a: es(other).pager, b: es('pi').pager, differ: es(other).pager !== es('pi').pager },
  ]

  return (
    <aside className="result">
      <div className="result-head">
        <div className="result-title">What pi-media will get</div>
        <div className="seg-toggle" role="group" aria-label="Compare with">
          {(['thinkpad', 'mac'] as const).map((m) => (
            <button
              key={m}
              className={state.compareWith === m ? 'active' : ''}
              onClick={() =>
                update((d) => {
                  d.compareWith = m
                })
              }
            >
              <Dot m={m} size={7} /> {MACHINES[m].name}
            </button>
          ))}
        </div>
      </div>

      <div className="term-block">
        <div className="term-label">
          <MName m={other} />
          <PromptCost m={other} snap={snap} />
        </div>
        <PromptLine m={other} snap={snap} />
      </div>
      <div className="term-block">
        <div className="term-label">
          <span className="mname">
            <Dot m="pi" />
            pi-media <span className="muted">over SSH</span>
          </span>
          <PromptCost m="pi" snap={snap} before={BASELINE} />
        </div>
        <PromptLine m="pi" snap={snap} ssh />
      </div>

      <table className="cmp">
        <thead>
          <tr>
            <th />
            <th>
              <MName m={other} />
            </th>
            <th>
              <MName m="pi" />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className={r.differ ? 'differ' : ''}>
              <td>{r.label}</td>
              <td className="mono">{r.a}</td>
              <td className="mono">{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="impact">
        <div className="impact-title">
          <Icon name="shield" /> When you apply
        </div>
        <div className="impact-row">
          <Dot m="pi" />
          <span>pi-media</span>
          <span className="impact-val">
            {imp.piWrites.length} file{imp.piWrites.length === 1 ? '' : 's'} written
          </span>
        </div>
        <div className={'impact-row' + (imp.thinkpad.length ? ' warn' : ' ok')}>
          <Dot m="thinkpad" />
          <span>thinkpad-x1</span>
          <span className="impact-val">
            {imp.thinkpad.length ? (
              <>
                <Icon name="warn" size={12} /> {imp.thinkpad.length} file{imp.thinkpad.length === 1 ? '' : 's'} change on next sync
                {JSON.stringify(state.configs.thinkpad) !== JSON.stringify(BASELINE.configs.thinkpad) && (
                  <button
                    className="link small"
                    onClick={() => {
                      update((d) => {
                        d.configs.thinkpad = structuredClone(BASELINE.configs.thinkpad)
                      })
                      toast('Reverted your edits to thinkpad-x1')
                    }}
                  >
                    Revert
                  </button>
                )}
              </>
            ) : (
              <>
                <Icon name="check" size={12} /> untouched
              </>
            )}
          </span>
        </div>
        <div className={'impact-row' + (imp.mac.length ? ' warn' : ' ok')}>
          <Dot m="mac" />
          <span>mac-mini-studio</span>
          <span className="impact-val">
            {imp.mac.length ? (
              <>
                <Icon name="warn" size={12} /> {imp.mac.length} file{imp.mac.length === 1 ? '' : 's'} change on next sync
                {JSON.stringify(state.configs.mac) !== JSON.stringify(BASELINE.configs.mac) && (
                  <button
                    className="link small"
                    onClick={() => {
                      update((d) => {
                        d.configs.mac = structuredClone(BASELINE.configs.mac)
                      })
                      toast('Reverted your edits to mac-mini-studio')
                    }}
                  >
                    Revert
                  </button>
                )}
              </>
            ) : (
              <>
                <Icon name="check" size={12} /> untouched
              </>
            )}
          </span>
        </div>
      </div>

      <button className="btn primary block" onClick={() => go({ kind: 'review' })}>
        Review {imp.piWrites.length} files <Icon name="arrow" />
      </button>
    </aside>
  )
}

/* ---------------- page ---------------- */

const NAV = [
  ['sec-aliases', 'Aliases'],
  ['sec-prompt', 'Prompt'],
  ['sec-nvim', 'Neovim'],
  ['sec-git', 'Git'],
  ['sec-settings', 'Settings'],
  ['sec-files', 'Files'],
] as const

export function PiSetup() {
  const m = MACHINES.pi
  return (
    <div className="page">
      <PiHeader />
      <div className="setup">
        <div className="setup-main">
          <div className="probe">
            <div className="probe-head">
              <span>
                <strong>First check-in from pi-media</strong> <span className="muted">· {relTime(new Date('2026-11-16T14:25:00'))} over SSH</span>
              </span>
              <nav className="jump">
                {NAV.map(([id, label]) => (
                  <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                    {label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="facts">
              {m.facts.map((f) => (
                <div key={f.label} className={'fact' + (f.warn ? ' warn' : '')}>
                  <span className="fact-label">{f.label}</span>
                  <span className="fact-val">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
          <AliasSection />
          <PromptSection />
          <PluginSection />
          <GitSection />
          <SettingsSection />
          <FilesSection />
        </div>
        <ResultPanel />
      </div>
    </div>
  )
}
