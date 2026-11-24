import { useEffect, useRef, useState } from 'react'
import { Reel, Chevron, Link, Help } from './Icons.jsx'
import { mmss } from '../data/time.js'

const KEYS = [
  ['Space', 'Play / pause'],
  ['← →', 'Step 10 minutes (hold Shift for 1 hour)'],
  ['Page Up / Down', 'Jump a day'],
  ['[  ]', 'Previous / next chapter'],
  ['1 2 3 4', 'Speed 0.5× 1× 2× 4×'],
  ['B', 'Bookmark this moment'],
  ['I  O', 'Set clip In / Out'],
  ['C', 'Captions on / off'],
]

export default function Header({ R, replays, onSwitch, onCopyLink, onCopyNotes, showKeys, setShowKeys }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])

  return (
    <header className="topbar">
      <div className="brand">
        <Reel />
        <div>
          <div className="brand-name">Hazereel</div>
          <div className="brand-sub">Eastbank Clean Air Collective</div>
        </div>
      </div>

      <div className="replay-picker" ref={menuRef}>
        <button className="replay-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="replay-label">Replay</span>
          <span className="replay-title">{R.meta.title}</span>
          <span className="replay-dates">{R.meta.dates}</span>
          <Chevron />
        </button>
        {open && (
          <ul className="replay-menu" role="listbox" aria-label="Choose a replay">
            {replays.map((r) => (
              <li key={r.id} role="option" aria-selected={r.id === R.meta.id}>
                <button onClick={() => { onSwitch(r.id); setOpen(false) }} className={r.id === R.meta.id ? 'on' : ''}>
                  <span className="rm-title">{r.title}</span>
                  <span className="rm-meta">
                    {r.dates} · {r.frames.toLocaleString()} frames · {r.sensorCount} sensors + 1 regional monitor
                  </span>
                  <span className="rm-meta">
                    {r.narration ? `Narrated by ${r.narration.narrator} · ${mmss(r.narration.total)} · ${r.narration.chapters.length} chapters` : 'No narration recorded'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="topbar-right">
        <button className="btn ghost" onClick={onCopyLink} title="Copy a link that opens this replay at this moment">
          <Link /> Copy link to this moment
        </button>
        <button className="btn ghost" onClick={onCopyNotes} title="Copy your bookmarks and clip times as plain text, ready to paste into your speaking notes">
          Copy my notes
        </button>
        <div className="keys-wrap">
          <button className="btn icon" aria-label="Keyboard shortcuts" aria-expanded={showKeys} onClick={() => setShowKeys((v) => !v)}>
            <Help />
          </button>
          {showKeys && (
            <div className="keys-pop" role="dialog" aria-label="Keyboard shortcuts">
              <h3>Keyboard shortcuts</h3>
              <dl>
                {KEYS.map(([k, d]) => (
                  <div key={k}>
                    <dt><kbd>{k}</kbd></dt>
                    <dd>{d}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
        <div className="who" title="Signed in">
          <span className="avatar" aria-hidden="true">TV</span>
          <span className="who-name">Teodoro Vance</span>
        </div>
      </div>
    </header>
  )
}
