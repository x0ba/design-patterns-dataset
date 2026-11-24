import { useEffect, useMemo, useState } from 'react'
import { FILES, MACHINES, type MachineId } from './data'
import { snapshotOf, useStore, type Snapshot } from './store'
import { diffLines, fileStatus, isFold, lineCount, parseFold, render, toRows, type FileStatus, type Row } from './render'
import { fmtMs, impact, pluginCount, promptMs } from './derive'
import { Callout, Check, Dot, Icon, MName } from './ui'
import { PiHeader } from './PiSetup'

type Filter = 'all' | 'differs' | 'same' | 'left-only' | 'right-only'

const STATUS_LABEL: Record<FileStatus, string> = {
  same: 'Same',
  differs: 'Differs',
  'left-only': 'Not on pi-media',
  'right-only': 'Only on pi-media',
}

function shortPath(p: string) {
  return p.replace('~/.config/nvim/lua/plugins/', 'nvim/plugins/').replace('~/.config/', '~/.config/')
}

function Line({ text }: { text: string }) {
  if (isFold(text)) {
    const f = parseFold(text)
    return (
      <span className="fold-line">
        ⋯ {f.n} line{f.n === 1 ? '' : 's'} · {f.label}
      </span>
    )
  }
  return <span>{text.replace(/\t/g, '    ') || ' '}</span>
}

function DiffView({ path, left, snap }: { path: string; left: MachineId; snap: Snapshot }) {
  const a = render(path, left, snap)
  const b = render(path, 'pi', snap)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  useEffect(() => setExpanded(new Set()), [path, left])

  const rows: Row[] = useMemo(() => {
    if (a && b) return toRows(diffLines(a, b))
    if (a) return toRows(diffLines(a, []))
    if (b) return toRows(diffLines([], b))
    return []
  }, [a?.join('\n'), b?.join('\n')])

  // collapse long equal runs
  type Block = { kind: 'rows'; rows: Row[] } | { kind: 'gap'; id: number; rows: Row[] }
  const blocks: Block[] = []
  let i = 0
  while (i < rows.length) {
    if (rows[i].kind !== 'eq') {
      const start = i
      while (i < rows.length && rows[i].kind !== 'eq') i++
      blocks.push({ kind: 'rows', rows: rows.slice(start, i) })
      continue
    }
    const start = i
    while (i < rows.length && rows[i].kind === 'eq') i++
    const run = rows.slice(start, i)
    const isFirst = start === 0
    const isLast = i === rows.length
    const keepHead = isFirst ? 0 : 3
    const keepTail = isLast ? 0 : 3
    if (run.length > keepHead + keepTail + 2 && !expanded.has(start) && rows.some((r) => r.kind !== 'eq')) {
      blocks.push({ kind: 'rows', rows: run.slice(0, keepHead) })
      blocks.push({ kind: 'gap', id: start, rows: run.slice(keepHead, run.length - keepTail) })
      blocks.push({ kind: 'rows', rows: run.slice(run.length - keepTail) })
    } else blocks.push({ kind: 'rows', rows: run })
  }

  const st = fileStatus(path, left, 'pi', snap)
  const f = FILES.find((x) => x.path === path)!

  return (
    <div className="diff">
      <div className="diff-head">
        <div className="diff-path">
          <code>{path}</code>
          <span className={'status-pill ' + st}>{STATUS_LABEL[st].replace('pi-media', 'pi-media')}</span>
          {f.templated && <span className="tag">templated</span>}
        </div>
        <div className="diff-cols">
          <div>
            <MName m={left} /> <span className="muted">· {a ? `${lineCount(a)} lines` : 'not present'}</span>
          </div>
          <div>
            <MName m="pi" /> <span className="muted">after apply · {b ? `${lineCount(b)} lines` : 'not written'}</span>
          </div>
        </div>
      </div>
      {st === 'left-only' && (
        <div className="diff-note">
          <Callout tone="info">
            pi-media won't get this file. {f.plugin ? 'Skipped in Neovim plugins.' : 'Turned off in Tracked files.'}
          </Callout>
        </div>
      )}
      {st === 'same' && rows.length > 0 && (
        <div className="diff-note">
          <Callout tone="ok">Identical apart from the machine name in the header comment.</Callout>
        </div>
      )}
      <div className="diff-body" role="table" aria-label={`Diff of ${path}`}>
        {blocks.map((blk, bi) =>
          blk.kind === 'gap' ? (
            <button
              key={'g' + bi}
              className="gap-row"
              onClick={() =>
                setExpanded((s) => {
                  const n = new Set(s)
                  n.add(blk.id)
                  return n
                })
              }
            >
              Show {blk.rows.length} unchanged row{blk.rows.length === 1 ? '' : 's'}
            </button>
          ) : (
            blk.rows.map((r, ri) => (
              <div key={bi + '-' + ri} className={'drow ' + r.kind} role="row">
                <span className="ln">{r.l && !isFold(r.l.text) ? r.l.n : ''}</span>
                <span className={'dcell left' + (r.l ? '' : ' empty')}>{r.l && <Line text={r.l.text} />}</span>
                <span className="ln">{r.r && !isFold(r.r.text) ? r.r.n : ''}</span>
                <span className={'dcell right' + (r.r ? '' : ' empty')}>{r.r && <Line text={r.r.text} />}</span>
              </div>
            ))
          ),
        )}
      </div>
    </div>
  )
}

/* ---------------- apply modal ---------------- */

const STEPS = (n: number, plugins: number, chsh: boolean, lazy: boolean, ms: number, first: boolean) =>
  [
    'Connecting to tomasz@pi-media.local',
    first ? 'Checking target paths: none exist yet, nothing to back up' : `Saving current versions of ${n} file${n === 1 ? '' : 's'} to ~/.local/share/dotwell/previous/`,
    `Writing ${n} file${n === 1 ? '' : 's'}${first ? ' and linking them into ~' : ''}`,
    chsh ? 'chsh -s /usr/bin/zsh tomasz' : null,
    lazy ? `nvim --headless "+Lazy! sync" +qa · ${plugins} plugins` : null,
    `Timing a fresh prompt over SSH: ${fmtMs(ms)}`,
  ].filter(Boolean) as string[]

function ApplyModal({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useStore()
  const imp = impact(state)
  const snap = snapshotOf(state)
  const [chsh, setChsh] = useState(!state.piApplied)
  const [lazy, setLazy] = useState(!state.piApplied || imp.piWrites.some((p) => p.includes('/nvim/')))
  const [phase, setPhase] = useState<'confirm' | 'running' | 'done'>('confirm')
  const [step, setStep] = useState(0)
  const [frozen, setFrozen] = useState<string[] | null>(null)
  const live = STEPS(imp.piWrites.length, pluginCount('pi', snap), chsh, lazy, promptMs('pi', snap), !state.piApplied)
  const steps = frozen ?? live

  useEffect(() => {
    if (phase !== 'running') return
    if (step >= steps.length) {
      update((d) => {
        d.piApplied = { at: new Date('2026-11-16T14:32:00'), snapshot: structuredClone(snapshotOf(d)) }
      })
      setPhase('done')
      return
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), step === 2 || step === 4 ? 900 : 550)
    return () => window.clearTimeout(t)
  }, [phase, step, steps.length, update])

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && phase !== 'running' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [phase, onClose])

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && phase !== 'running' && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="apply-title">
        <div className="modal-head">
          <h3 id="apply-title">
            {phase === 'done' ? 'pi-media is set up' : `Apply ${imp.piWrites.length} files to pi-media`}
          </h3>
          {phase !== 'running' && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          )}
        </div>

        {phase === 'confirm' && (
          <>
            <div className="modal-body">
              <div className="scope-box">
                <div className="scope-line pi">
                  <Dot m="pi" />
                  <div>
                    <strong>pi-media</strong>
                    <div className="muted small">
                      {imp.piWrites.length} files over SSH. Dotwell keeps a copy in <code>~/.local/share/dotwell/previous/</code> so you can roll back.
                    </div>
                  </div>
                </div>
                {(['thinkpad', 'mac'] as const).map((m) => (
                  <div key={m} className={'scope-line' + (imp[m].length ? ' warn' : ' ok')}>
                    <Dot m={m} />
                    <div>
                      <strong>{MACHINES[m].name}</strong>
                      <div className="small">
                        {imp[m].length === 0 ? (
                          <span className="ok-text">
                            <Icon name="check" size={12} /> Nothing written. Its rendered files are byte-identical to before.
                          </span>
                        ) : (
                          <span className="warn-text">
                            Not written now. {imp[m].length} file{imp[m].length === 1 ? '' : 's'} will change on its next sync: {imp[m].map(shortPath).join(', ')}
                            {m === 'mac' && !state.macPushed && '. Its 3 unpushed local changes stay put.'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="opt-list">
                <Check on={chsh} onChange={setChsh}>
                  <span>
                    Make zsh the login shell on pi-media <span className="muted">· it's /bin/bash now</span>
                  </span>
                </Check>
                <Check on={lazy} onChange={setLazy}>
                  <span>
                    Install Neovim plugins now <span className="muted">· {pluginCount('pi', snap)} plugins, about 40 s on the Pi</span>
                  </span>
                </Check>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setFrozen(live)
                  setPhase('running')
                  setStep(0)
                }}
              >
                Apply to pi-media only
              </button>
            </div>
          </>
        )}

        {phase !== 'confirm' && (
          <div className="modal-body">
            <ol className="steps">
              {steps.map((s, i) => (
                <li key={s} className={i < step || phase === 'done' ? 'done' : i === step ? 'doing' : ''}>
                  <span className="step-ico">{i < step || phase === 'done' ? <Icon name="check" size={12} /> : i === step ? <span className="spin" /> : null}</span>
                  <span className="mono small">{s}</span>
                </li>
              ))}
            </ol>
            {phase === 'done' && (
              <Callout tone="ok">
                Done. thinkpad-x1 and mac-mini-studio weren't contacted. Log in with <code>ssh pi-media</code> to try the new prompt.
              </Callout>
            )}
          </div>
        )}
        {phase === 'done' && (
          <div className="modal-foot">
            <button
              className="btn primary"
              onClick={() => {
                onClose()
                toast('pi-media synced')
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- page ---------------- */

export function Review() {
  const { state, update, go } = useStore()
  const snap = snapshotOf(state)
  const left = state.compareWith
  const [filter, setFilter] = useState<Filter>('differs')
  const [modal, setModal] = useState(false)
  const imp = impact(state)

  const statuses = useMemo(() => FILES.map((f) => ({ f, st: fileStatus(f.path, left, 'pi', snap) })), [JSON.stringify(snap), left])
  const counts: Record<Filter, number> = {
    all: statuses.length,
    differs: statuses.filter((s) => s.st === 'differs').length,
    same: statuses.filter((s) => s.st === 'same').length,
    'left-only': statuses.filter((s) => s.st === 'left-only').length,
    'right-only': statuses.filter((s) => s.st === 'right-only').length,
  }
  const visible = statuses.filter((s) => filter === 'all' || s.st === filter)
  const [sel, setSel] = useState<string>('~/.zshrc')
  const selected = visible.some((v) => v.f.path === sel) ? sel : visible[0]?.f.path

  const pending = state.piApplied && imp.piWrites.length === 0

  return (
    <div className="page">
      <PiHeader />
      <div className="review">
        <div className="review-bar">
          <div className="review-vs">
            <span className="muted">Comparing</span>
            <span className="mname">
              <Dot m="pi" /> pi-media <span className="muted">after apply</span>
            </span>
            <span className="muted">with</span>
            <div className="seg-toggle" role="group" aria-label="Compare with">
              {(['thinkpad', 'mac'] as const).map((m) => (
                <button
                  key={m}
                  className={left === m ? 'active' : ''}
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
          <div className="filters" role="group" aria-label="Filter files">
            {(
              [
                ['differs', 'Differs'],
                ['left-only', `Not on pi-media`],
                ['same', 'Same'],
                ['all', 'All'],
              ] as [Filter, string][]
            ).map(([k, label]) => (
              <button key={k} className={'chip' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>
                {label} <span className="chip-n">{counts[k]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="review-grid">
          <div className="flist">
            {visible.length === 0 && <div className="empty-note">No files in this view.</div>}
            {visible.map(({ f, st }) => (
              <button key={f.path} className={'fitem' + (selected === f.path ? ' active' : '')} onClick={() => setSel(f.path)}>
                <span className={'fstat ' + st} aria-label={STATUS_LABEL[st]} />
                <span className="fitem-path">{shortPath(f.path)}</span>
                {imp.piWrites.includes(f.path) && state.piApplied && <span className="tag warn">pending</span>}
              </button>
            ))}
          </div>
          {selected ? <DiffView path={selected} left={left} snap={snap} /> : <div className="diff empty-note">Pick a file.</div>}
        </div>
      </div>
      <div className="apply-bar">
        <div className="apply-summary">
          <span className="apply-item">
            <Dot m="pi" /> <strong>{imp.piWrites.length}</strong> file{imp.piWrites.length === 1 ? '' : 's'} to write on pi-media
          </span>
          <span className={'apply-item ' + (imp.thinkpad.length ? 'warn' : 'ok')}>
            <Dot m="thinkpad" /> thinkpad-x1 {imp.thinkpad.length ? `· ${imp.thinkpad.length} changed on next sync` : 'untouched'}
          </span>
          <span className={'apply-item ' + (imp.mac.length ? 'warn' : 'ok')}>
            <Dot m="mac" /> mac-mini-studio {imp.mac.length ? `· ${imp.mac.length} changed on next sync` : 'untouched'}
          </span>
          {!state.conflicts.up && (
            <button className="link warn-text small" onClick={() => go({ kind: 'machine', id: 'pi' })}>
              <Icon name="warn" size={12} /> <code>up</code> conflict open: pi-media won't get an <code>up</code> alias
            </button>
          )}
        </div>
        <div className="btn-row">
          <button className="btn ghost" onClick={() => go({ kind: 'machine', id: 'pi' })}>
            <Icon name="back" /> Back to choices
          </button>
          <button className="btn primary" disabled={!!pending} onClick={() => setModal(true)}>
            {pending ? 'Nothing to apply' : `Apply to pi-media`}
          </button>
        </div>
      </div>
      {modal && <ApplyModal onClose={() => setModal(false)} />}
    </div>
  )
}
