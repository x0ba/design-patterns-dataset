import { useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarDays, Check, Globe, HardDrive, Lock, Monitor, RotateCcw, Tablet, Users, Landmark, Plus } from 'lucide-react'
import { useStore, isLocked } from './store'
import {
  AUDIENCES, AudienceId, AudienceSettings, BUNDLE_CURRENT_GB, BUNDLE_PARTS, EDITIONS, EFFECTIVE_2024, Edition, LAST_SYNC, PERMITS, TABLETS, TODAY, bundleSize,
} from './data'
import { audienceChanged, audienceRows, bundleFit, daysBetween, fmtDate, resolveEdition, summaryGrades } from './logic'
import { Chip, Field, Seg, Switch } from './ui'
import Reader from './Reader'

const ICON: Record<AudienceId, typeof Users> = { reviewers: Monitor, inspectors: Tablet, counter: Landmark, public: Globe }

export default function Audiences() {
  const { s } = useStore()
  const toEffective = daysBetween(TODAY, EFFECTIVE_2024)
  return (
    <div className="page">
      <section className="editions" aria-label="Code editions held">
        <div className="editions-list">
          {EDITIONS.map((e) => (
            <div key={e.id} className={`ed-card ed-${e.id}`}>
              <div className="ed-top"><Chip ed={e.id} /><span className="ed-status">{e.status}</span></div>
              <div className="ed-meta"><b>{e.amendments}</b> local amendments</div>
              <div className="ed-note">{e.note}</div>
            </div>
          ))}
        </div>
        <div className="countdown">
          <CalendarDays size={18} />
          <div>
            <b>{toEffective} days</b> until the 2024 edition takes effect
            <span>Applications filed before Jan 1, 2027 stay on 2021.</span>
          </div>
        </div>
      </section>

      <div className="cols">
        <AudienceList />
        <SettingsForm key={s.audience} />
        <PreviewPane key={s.audience + 'p'} />
      </div>
    </div>
  )
}

function AudienceList() {
  const { s, d } = useStore()
  return (
    <aside className="aud-list" aria-label="Audiences">
      <h2 className="col-h">Audiences</h2>
      {AUDIENCES.map((a) => {
        const Icon = ICON[a.id]
        const pub = s.published[a.id], dr = s.draft[a.id]
        const ch = audienceChanged(pub, dr, a.id)
        const nowEd = resolveEdition(pub, null)
        const aft = dr.editionRule === 'fixed' ? dr.fixedEdition : 'by date'
        return (
          <button key={a.id} className={`aud ${s.audience === a.id ? 'on' : ''}`} onClick={() => d({ type: 'audience', id: a.id })} aria-pressed={s.audience === a.id}>
            <span className="aud-ic"><Icon size={17} /></span>
            <span className="aud-main">
              <span className="aud-name">{a.name}{ch && <i className="dot" title="Changed in draft" />}</span>
              <span className="aud-size">{a.size}</span>
              <span className="aud-flow">
                <Chip ed={nowEd.edition} />
                <ArrowRight size={12} />
                {aft === 'by date' ? <span className="chip chip-date">by date</span> : <Chip ed={aft as '2021' | '2024'} />}
              </span>
            </span>
          </button>
        )
      })}
      <p className="aud-foot">Each row shows the default edition now and after publishing.</p>
    </aside>
  )
}

function SettingsForm() {
  const { s, d } = useStore()
  const id = s.audience
  const aud = AUDIENCES.find((a) => a.id === id)!
  const pub = s.published[id], dr = s.draft[id]
  const locked = isLocked(s)
  const patch = (p: Partial<AudienceSettings>) => d({ type: 'patch', id, patch: p })
  const changed = audienceChanged(pub, dr, id)
  const ruleLabel = (x: AudienceSettings) => (x.editionRule === 'fixed' ? `${x.fixedEdition}` : 'by permit date')
  const ruleWas = pub.editionRule !== dr.editionRule || pub.fixedEdition !== dr.fixedEdition || (dr.editionRule === 'permit-date' && pub.fallback !== dr.fallback)
    ? ruleLabel(pub) : null
  const grades = summaryGrades()
  const over = grades.filter((g) => g.grade > dr.grade)
  const allowDate = id !== 'public'

  return (
    <section className="form" aria-label={`${aud.name} settings`}>
      <div className="form-h">
        <div>
          <h2 className="col-h">{aud.name}</h2>
          <p className="form-sub">{aud.size} · {aud.detail}</p>
        </div>
        {changed && !locked && (
          <button className="btn btn-ghost btn-sm" onClick={() => d({ type: 'resetAudience', id })}><RotateCcw size={13} /> Revert</button>
        )}
      </div>

      {locked && (
        <div className="callout callout-lock"><Lock size={15} />
          <span>{s.user === 'marcus' ? 'You are reviewing as approver. Settings are read-only.' : 'Locked while the draft awaits approval. Withdraw it on the Review tab to edit.'}</span>
        </div>
      )}

      {id === 'counter' && !changed && !locked && (
        <div className="callout callout-warn">
          <AlertTriangle size={15} />
          <div>
            <b>Not in your draft yet.</b> Counter staff would still open 2021 after Jan 1, when new applications fall under 2024.
            <button className="linklike" onClick={() => patch({ editionRule: 'permit-date', fallback: 'in-force' })}>Match plan reviewers</button>
          </div>
        </div>
      )}

      <fieldset disabled={locked}>
        <Field label="Default edition" was={ruleWas} >
          {allowDate ? (
            <div className="rcards">
              <label className={`rcard ${dr.editionRule === 'permit-date' ? 'on' : ''}`}>
                <input type="radio" name="rule" checked={dr.editionRule === 'permit-date'} onChange={() => patch({ editionRule: 'permit-date' })} />
                <span className="rc-body">
                  <b>Match the permit’s application date</b>
                  <span>Filed before Jan 1, 2027 opens 2021. Filed on or after opens 2024.</span>
                  {dr.editionRule === 'permit-date' && (
                    <span className="rc-sub">
                      <label htmlFor="fallback">With no permit open, show</label>
                      <select id="fallback" value={dr.fallback} onChange={(e) => patch({ fallback: e.target.value as AudienceSettings['fallback'] })}>
                        <option value="in-force">Edition in force today</option>
                        <option value="2021">2021</option>
                        <option value="2024">2024</option>
                      </select>
                    </span>
                  )}
                </span>
              </label>
              <label className={`rcard ${dr.editionRule === 'fixed' ? 'on' : ''}`}>
                <input type="radio" name="rule" checked={dr.editionRule === 'fixed'} onChange={() => patch({ editionRule: 'fixed' })} />
                <span className="rc-body">
                  <b>One edition for everyone</b>
                  <span>Everyone in this audience opens the same edition.</span>
                  {dr.editionRule === 'fixed' && (
                    <span className="rc-sub">
                      <Seg label="Edition" value={dr.fixedEdition} onChange={(v) => patch({ fixedEdition: v })} options={[{ v: '2021', label: '2021' }, { v: '2024', label: '2024' }]} />
                    </span>
                  )}
                </span>
              </label>
            </div>
          ) : (
            <Seg label="Edition" value={dr.fixedEdition} onChange={(v) => patch({ fixedEdition: v })} options={[{ v: '2021', label: '2021 edition' }, { v: '2024', label: '2024 edition' }]} />
          )}
          {!allowDate && <p className="hint">Visitors can switch editions on the page. This sets what opens first.</p>}
        </Field>

        <Field label="Local amendments" was={pub.amendments !== dr.amendments ? pub.amendments : null}
          hint={dr.amendments === 'inline' ? 'Amendment text appears right under the code text it changes.' : dr.amendments === 'margin' ? 'Amendment text sits in a side column next to the code text.' : 'Amendments are collapsed under each section until opened.'}>
          <Seg label="Amendment display" value={dr.amendments} onChange={(v) => patch({ amendments: v })}
            options={[{ v: 'inline', label: 'Inline' }, { v: 'margin', label: 'Margin' }, { v: 'collapsed', label: 'Collapsed' }]} />
        </Field>

        <Field label="Plain-language summaries" was={pub.summaries !== dr.summaries ? (pub.summaries ? 'on' : 'off') : null}>
          <div className="row-sw">
            <Switch checked={dr.summaries} onChange={(v) => patch({ summaries: v })} label="Plain-language summaries" />
            <span>{dr.summaries ? 'Shown above each section' : 'Off'}</span>
          </div>
        </Field>

        {dr.summaries && (
          <>
            <Field label="Reading-level target" was={pub.grade !== dr.grade ? `grade ${pub.grade}` : null}
              hint={over.length === 0 ? `All ${grades.length} English summaries in this preview read at or below grade ${dr.grade}.` : undefined}>
              <div className="range">
                <input type="range" min={4} max={12} step={1} value={dr.grade} onChange={(e) => patch({ grade: +e.target.value })} aria-label="Reading-level target grade" />
                <output>Grade {dr.grade}</output>
              </div>
              {over.length > 0 && (
                <p className="hint warn-text">{over.length} of {grades.length} English summaries in this preview read above grade {dr.grade}: {over.map((o) => `§${o.id} (${o.ed})`).slice(0, 4).join(', ')}{over.length > 4 ? '…' : ''}.</p>
              )}
            </Field>

            <Field label="Summary languages" was={pub.es !== dr.es || pub.vi !== dr.vi ? `English${pub.es ? ', Spanish' : ''}${pub.vi ? ', Vietnamese' : ''}` : null}>
              <div className="checks">
                <label className="check"><input type="checkbox" checked disabled /> English</label>
                <label className="check"><input type="checkbox" checked={dr.es} onChange={(e) => patch({ es: e.target.checked })} /> Spanish <em>complete</em></label>
                <label className="check"><input type="checkbox" checked={dr.vi} onChange={(e) => patch({ vi: e.target.checked })} /> Vietnamese <em className="partial">40% written</em></label>
                <div className="progress" aria-label="Vietnamese summaries 40% complete"><span style={{ width: '40%' }} /></div>
                {dr.vi && <p className="hint warn-text">Where a Vietnamese summary is missing, readers see the English one with a note. Try it in the preview: open a section and choose VI.</p>}
                {!dr.vi && <p className="hint">Leave off until more of the Vietnamese summaries are done.</p>}
              </div>
            </Field>
          </>
        )}

        <Field label="Transition notice" was={pub.notice !== dr.notice ? (pub.notice ? 'shown' : 'not shown') : null}>
          <div className="row-sw">
            <Switch checked={dr.notice} onChange={(v) => patch({ notice: v })} label="Transition notice" />
            <span>{dr.notice ? 'Banner above the code text' : 'No banner'}</span>
          </div>
          {dr.notice && (
            <div className="notice-edit">
              <label htmlFor="ntext">Wording</label>
              <textarea id="ntext" rows={4} value={dr.noticeText} onChange={(e) => patch({ noticeText: e.target.value })} />
              <div className="notice-meta">
                <label htmlFor="nuntil">Show until</label>
                <input id="nuntil" type="date" value={dr.noticeUntil} min={TODAY} onChange={(e) => patch({ noticeUntil: e.target.value })} />
                <span>{dr.noticeText.length} characters</span>
              </div>
            </div>
          )}
        </Field>

        {id === 'inspectors' && <BundleCard dr={dr} patch={patch} pub={pub} />}
      </fieldset>
    </section>
  )
}

function BundleCard({ dr, pub, patch }: { dr: AudienceSettings; pub: AudienceSettings; patch: (p: Partial<AudienceSettings>) => void }) {
  const [all, setAll] = useState(false)
  const fit = bundleFit(dr.bundle)
  const toggle = (e: Edition, on: boolean) => patch({ bundle: on ? [...dr.bundle, e] : dr.bundle.filter((x) => x !== e) })
  const missing = dr.editionRule === 'permit-date' ? (['2021', '2024'] as Edition[]).filter((e) => !dr.bundle.includes(e)) : dr.editionRule === 'fixed' && !dr.bundle.includes(dr.fixedEdition) ? [dr.fixedEdition] : []
  const shown = all ? TABLETS.map((t) => ({ t, bad: t.freeGb < fit.need })) : fit.short.map((t) => ({ t, bad: true }))
  const ago = daysBetween(LAST_SYNC, TODAY)
  return (
    <div className="bundle" id="bundle">
      <div className="bundle-h">
        <HardDrive size={16} />
        <h3>Offline bundle</h3>
        <span className="muted">Synced {fmtDate(LAST_SYNC).replace(", 2026","")} · {ago} days ago</span>
      </div>
      <div className="checks bundle-checks">
        {(['2021', '2024', '2018'] as Edition[]).map((e) => (
          <label key={e} className="check">
            <input type="checkbox" checked={dr.bundle.includes(e)} onChange={(ev) => toggle(e, ev.target.checked)} />
            <Chip ed={e} /> {e === '2018' ? 'Archived edition' : e === '2021' ? 'Current edition' : 'Adopted edition'}
            <em>{BUNDLE_PARTS[e].toFixed(2)} GB</em>
          </label>
        ))}
      </div>
      {missing.length > 0 && (
        <div className="callout callout-warn"><AlertTriangle size={15} />
          <div>This audience opens by {dr.editionRule === 'fixed' ? 'fixed edition' : 'permit date'}, so the bundle needs {missing.join(' and ')}.
            {missing.map((m) => <button key={m} className="linklike" onClick={() => toggle(m, true)}><Plus size={11} /> Add {m}</button>)}
          </div>
        </div>
      )}
      <dl className="bundle-size">
        <div><dt>Current bundle</dt><dd>{BUNDLE_CURRENT_GB.toFixed(1)} GB</dd></div>
        <div className="arrow"><ArrowRight size={14} /></div>
        <div><dt>After publish</dt><dd><b>{fit.size.toFixed(2)} GB</b><span>{fit.extra > 0 ? `+${fit.extra.toFixed(2)} GB per tablet` : 'no extra space needed'}</span></dd></div>
      </dl>
      <p className="hint">Figures and tables shared by 2021 and 2024 are stored once. Estimate, includes the memo archive and search index.</p>
      <div className={`fit ${fit.short.length ? 'bad' : 'good'}`}>
        {fit.short.length === 0 ? <Check size={15} /> : <AlertTriangle size={15} />}
        <span>
          {fit.short.length === 0
            ? `All ${TABLETS.length} tablets have room (needs ${fit.need.toFixed(1)} GB free, including ${0.5} GB headroom).`
            : `${TABLETS.length - fit.short.length} of ${TABLETS.length} tablets have room. ${fit.short.length} need ${fit.need.toFixed(1)} GB free before they can sync.`}
        </span>
      </div>
      {(fit.short.length > 0 || all) && (
        <table className="tablets">
          <thead><tr><th>Inspector</th><th>Device</th><th className="num">Free</th></tr></thead>
          <tbody>
            {shown.map(({ t, bad }) => (
              <tr key={t.inspector} className={bad ? 'low' : ''}>
                <td>{t.inspector}</td><td>{t.device}</td><td className="num">{t.freeGb.toFixed(1)} GB</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="linklike" onClick={() => setAll(!all)}>{all ? 'Show only tablets that need space' : `Show all ${TABLETS.length} tablets`}</button>
      {pub.bundle.join() !== dr.bundle.join() && <span className="was" style={{ marginLeft: 12 }}>Live now: {pub.bundle.join(' + ')} · {bundleSize(pub.bundle).toFixed(1)} GB</span>}
    </div>
  )
}

type Ctx = { sel: string; date: string }

function PreviewPane() {
  const { s } = useStore()
  const id = s.audience
  const aud = AUDIENCES.find((a) => a.id === id)!
  const [mode, setMode] = useState<'after' | 'now'>('after')
  const [ctx, setCtx] = useState<Ctx>({ sel: PERMITS[1].id, date: '2027-01-02' })
  const settings = mode === 'after' ? s.draft[id] : s.published[id]
  const decisions = mode === 'after' ? s.decisions : s.pubDecisions
  const hp = mode === 'after' ? s.historicalPublic : s.pubHistoricalPublic
  const usesDate = settings.editionRule === 'permit-date'
  const appDate = !usesDate || ctx.sel === 'none' ? null : ctx.sel === 'custom' ? ctx.date || null : PERMITS.find((p) => p.id === ctx.sel)!.applied
  const res = resolveEdition(settings, appDate)
  const rows = audienceRows(s.published[id], s.draft[id], id).filter((r) => r.changed)

  return (
    <section className="preview" aria-label="Preview">
      <div className="preview-h">
        <div>
          <h2 className="col-h">Preview</h2>
          <p className="form-sub">What {aud.name.toLowerCase()} {mode === 'after' ? 'will get after publishing' : 'get today'}</p>
        </div>
        <Seg label="Preview state" value={mode} onChange={setMode} options={[{ v: 'now', label: 'Live now' }, { v: 'after', label: 'After publish' }]} />
      </div>

      {usesDate && (
        <div className="ctx">
          <label htmlFor="permit">Open permit</label>
          <select id="permit" value={ctx.sel} onChange={(e) => setCtx({ ...ctx, sel: e.target.value })}>
            {PERMITS.map((p) => <option key={p.id} value={p.id}>{p.id} · filed {fmtDate(p.applied)} · {p.title}</option>)}
            <option value="custom">Test a different filing date…</option>
            <option value="none">No permit open</option>
          </select>
          {ctx.sel === 'custom' && (
            <div className="ctx-date">
              <input type="date" aria-label="Application date" value={ctx.date} onChange={(e) => setCtx({ ...ctx, date: e.target.value })} />
              <button className="btn btn-ghost btn-sm" onClick={() => setCtx({ ...ctx, date: '2026-12-31' })}>Dec 31, 2026</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCtx({ ...ctx, date: '2027-01-01' })}>Jan 1, 2027</button>
            </div>
          )}
        </div>
      )}

      <div className="resolved" aria-live="polite">
        <span>Opens to</span><Chip ed={res.edition} /><p>{res.reason}</p>
      </div>

      <div className={`frame ${id === 'inspectors' ? 'frame-tablet' : ''}`}>
        <Reader key={`${id}-${mode}-${res.edition}`} audience={id} settings={settings} edition={res.edition} decisions={decisions} historicalPublic={hp} bundle={settings.bundle} />
      </div>

      {mode === 'after' && rows.length > 0 && (
        <p className="preview-foot"><b>{rows.length} change{rows.length > 1 ? 's' : ''} vs live:</b> {rows.map((r) => r.label).join(', ')}.</p>
      )}
    </section>
  )
}
