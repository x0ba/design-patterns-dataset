import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Selection } from './types'
import { useStore } from './store'
import { Sheet } from './Sheet'
import { Inspector } from './Inspector'
import { Panel, type Tab } from './Panel'
import { ReadThrough } from './ReadThrough'
import { runChecks } from './checks'
import { ROSTER } from './data'
import * as op from './ops'
import { IAlert, ICheck, IPlay, IPrint, IRedo, ISend, IUndo, IClose } from './icons'
import { nowLabel, uid, untilChangeover } from './util'

const PAGE_W = 1040
const PAGE_H = 735
const SIDE_W = 360

export function App() {
  const { state, dispatch, edit, editComments } = useStore()
  const { doc, comments, agreed } = state.present
  const locked = state.status === 'sent'

  const [sel, setSel] = useState<Selection>({ kind: 'none' })
  const [placing, setPlacing] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('comments')
  const [over, setOver] = useState(0)
  const [reading, setReading] = useState(false)
  const [speaker, setSpeaker] = useState(ROSTER[0].name)
  const [focusReq, setFocusReq] = useState<{ id: string; n: number } | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; n: number } | null>(null)
  const [, tick] = useState(0)
  const [scale, setScale] = useState(1)
  const fileRef = useRef<HTMLInputElement>(null)

  /* the clock on the screen drives the countdown to the changeover */
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 20000)
    return () => clearInterval(t)
  }, [])

  /* fit the one-page sheet into the space beside the side panel */
  useLayoutEffect(() => {
    const fit = () => {
      const w = window.innerWidth - SIDE_W - 36
      const h = window.innerHeight - 64 - 36 - 52
      setScale(Math.max(0.5, Math.min(1, w / PAGE_W, h / PAGE_H)))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const say = useCallback((msg: string) => setToast({ msg, n: Date.now() }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (state.cleared) say(`That edit cleared ${state.cleared.count} huddle ${state.cleared.count === 1 ? 'agreement' : 'agreements'}`)
  }, [state.cleared?.seq]) // eslint-disable-line react-hooks/exhaustive-deps

  /* undo / redo from the keyboard when nobody is typing */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      if ((e.target as HTMLElement).closest('input,textarea,select')) return
      e.preventDefault()
      dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  /* drop selections that point at things that no longer exist */
  useEffect(() => {
    if (sel.kind === 'step' && !doc.steps.some((s) => s.id === sel.id)) setSel({ kind: 'none' })
    if (sel.kind === 'callout' && !doc.callouts.some((c) => c.id === sel.id)) setSel({ kind: 'none' })
    if (sel.kind === 'photo' && !doc.photos.some((x) => x.id === sel.id)) setSel({ kind: 'none' })
  }, [doc, sel])

  const checks = useMemo(() => runChecks(doc, comments, agreed, over), [doc, comments, agreed, over])
  const ready = checks.every((c) => c.ok)
  const openComments = comments.filter((c) => !c.resolved).length

  const pulse = (id: string | null) => {
    setHighlight(id)
    if (id) setTimeout(() => setHighlight((h) => (h === id ? null : h)), 1800)
  }

  const send = () => {
    if (!ready) {
      setTab('review')
      const first = checks.find((c) => !c.ok)
      say(first ? `Not ready yet: ${first.detail}` : 'Not ready yet')
      return
    }
    dispatch({ type: 'send' })
    setSel({ kind: 'none' })
    setTab('review')
    say(`Sent to ${doc.reviewer.name} for sign-off`)
  }

  const addPhotoFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      edit(
        op.addPhoto({
          id: uid('p'),
          file: f.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Photo',
          caption: '',
          takenAt: nowLabel(),
          kind: 'upload',
          src: String(reader.result),
        }),
      )
    }
    reader.readAsDataURL(f)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M5 6h14M5 12h14M5 18h8" />
            </svg>
          </span>
          Huddlesheet
        </div>
        <div className="doc-id">
          <span className="mono">{doc.id}</span>
          <span className={`status${locked ? ' sent' : ''}`}>{locked ? 'With quality lead' : 'Draft'}</span>
        </div>
        <div className="deadline" title="Next changeover on Line 3">
          <b>13:30</b> changeover · {untilChangeover()}
        </div>
        <div className="spacer" />
        <div className="clock mono">{nowLabel()}</div>
        <button className="tbtn icon" aria-label="Undo" title="Undo" disabled={!state.past.length || locked} onClick={() => dispatch({ type: 'undo' })}>
          <IUndo size={24} />
        </button>
        <button className="tbtn icon" aria-label="Redo" title="Redo" disabled={!state.future.length || locked} onClick={() => dispatch({ type: 'redo' })}>
          <IRedo size={24} />
        </button>
        <button className="tbtn icon" aria-label="Print the sheet" title="Print the sheet" onClick={() => window.print()}>
          <IPrint size={24} />
        </button>
        <button className="tbtn" onClick={() => setReading(true)}>
          <IPlay size={20} /> Read through
        </button>
        {locked ? (
          <button className="tbtn" onClick={() => dispatch({ type: 'recall' })}>
            Recall to edit
          </button>
        ) : (
          <button className={`tbtn primary${ready ? '' : ' soft'}`} aria-disabled={!ready} onClick={send}>
            <ISend size={20} /> Send for sign-off
          </button>
        )}
      </header>

      <div className="work">
        <main
          className="stage"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('sheet-wrap')) {
              setSel({ kind: 'none' })
              setPlacing(null)
            }
          }}
        >
          <div className="sheet-wrap" style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
            <div className={`sheet-scale${over > 0 ? ' over' : ''}${locked ? ' locked' : ''}`} style={{ transform: `scale(${scale})`, width: PAGE_W, height: PAGE_H }}>
              <Sheet
                doc={doc}
                comments={comments}
                sel={sel}
                setSel={setSel}
                edit={edit}
                locked={locked}
                scale={scale}
                placing={placing}
                setPlacing={setPlacing}
                onFit={setOver}
                onOpenComments={() => setTab('comments')}
                onAddPhoto={() => fileRef.current?.click()}
                focusReq={focusReq}
                highlight={highlight}
              />
            </div>
          </div>

          <div className="stagebar">
            <span className={`fitchip${over > 0 ? ' bad' : ''}`}>
              {over > 0 ? <IAlert size={18} /> : <ICheck size={18} strokeWidth={3} />}
              {over > 0 ? `Too long for one page (about ${Math.ceil(over)} px over)` : 'Fits on one page'}
            </span>
            <span className="muted">
              {doc.steps.length} steps · {doc.photos.length} photos · {doc.callouts.length} marks
              {openComments > 0 && ` · ${openComments} open comment${openComments > 1 ? 's' : ''}`}
            </span>
            <span className="spacer" />
            <span className="muted">{locked ? 'Locked while with the quality lead' : 'Changes are kept in this browser tab'}</span>
          </div>
        </main>

        <aside className="side">
          <Inspector
            doc={doc}
            sel={sel}
            setSel={setSel}
            edit={edit}
            locked={locked}
            placing={placing}
            setPlacing={setPlacing}
            toast={say}
            focusStep={(id) => setFocusReq({ id, n: Date.now() })}
            onAddPhoto={() => fileRef.current?.click()}
          />
          <Panel
            tab={tab}
            setTab={setTab}
            doc={doc}
            comments={comments}
            agreed={agreed}
            locked={locked}
            sel={sel}
            setSel={setSel}
            edit={edit}
            editComments={editComments}
            toggleAgree={(id) => dispatch({ type: 'agree', id })}
            checks={checks}
            ready={ready}
            onSend={send}
            onRecall={() => dispatch({ type: 'recall' })}
            cleared={state.cleared}
            toast={say}
            pulse={pulse}
            speaker={speaker}
            setSpeaker={setSpeaker}
            onReadThrough={() => setReading(true)}
          />
        </aside>
      </div>

      {toast && (
        <div className="toast" role="status" key={toast.n}>
          <span>{toast.msg}</span>
          {state.past.length > 0 && !locked && /deleted|removed|cleared|reworded|now uses|Copied/.test(toast.msg) && (
            <button
              onClick={() => {
                dispatch({ type: 'undo' })
                setToast(null)
              }}
            >
              <IUndo size={18} /> Undo
            </button>
          )}
          <button className="x" aria-label="Dismiss" onClick={() => setToast(null)}>
            <IClose size={18} />
          </button>
        </div>
      )}

      {reading && (
        <ReadThrough
          doc={doc}
          agreed={agreed}
          toggleAgree={(id) => dispatch({ type: 'agree', id })}
          editComments={editComments}
          speaker={speaker}
          setSpeaker={setSpeaker}
          toast={say}
          onClose={() => setReading(false)}
          onFix={(id) => {
            setReading(false)
            setSel({ kind: 'step', id })
            setFocusReq({ id, n: Date.now() })
          }}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) addPhotoFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
