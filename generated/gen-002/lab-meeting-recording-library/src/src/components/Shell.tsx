import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ACTIONS, PRESENT_DATE, TODAY } from '../data/recordings'
import { ME } from '../data/people'
import { daysBetween, shortDate, weekday } from '../lib/format'
import { jumpChapter, pause, play, getState, skipBy, stepRate } from '../lib/player'
import { go, useRoute } from '../lib/router'
import { Avatar, Legend } from './bits'
import { Icon } from './Icon'
import { PlayerBar } from './PlayerBar'

const NAV: { to: string; key: string; label: string; icon: 'compass' | 'library' | 'tasks' }[] = [
  { to: '/', key: '', label: 'Catch-up', icon: 'compass' },
  { to: '/library', key: 'library', label: 'Library', icon: 'library' },
  { to: '/actions', key: 'actions', label: 'Action items', icon: 'tasks' },
]

export function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const route = useRoute()
  const section = route.path[0] ?? ''
  const q = route.path[0] === 'search' ? route.query.get('q') ?? '' : ''
  const [help, setHelp] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const prev = useRef('/')
  const days = daysBetween(TODAY, PRESENT_DATE)
  const mineOpen = ACTIONS.filter((a) => a.owner === 'me' && !a.done).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
      if (e.key === 'Escape') {
        setHelp(false)
        if (typing) el.blur()
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      const s = getState()
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          s.playing ? pause() : play()
          break
        case 'j':
          skipBy(-15)
          break
        case 'l':
          skipBy(30)
          break
        case 'ArrowLeft':
          skipBy(-5)
          break
        case 'ArrowRight':
          skipBy(5)
          break
        case '[':
          stepRate(-1)
          break
        case ']':
          stepRate(1)
          break
        case 'n':
          jumpChapter(1)
          break
        case 'p':
          jumpChapter(-1)
          break
        case '/':
          e.preventDefault()
          input.current?.focus()
          break
        case '?':
          setHelp((h) => !h)
          break
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === ' ' && el.tagName === 'BUTTON') e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const onSearch = (v: string) => {
    if (route.path[0] !== 'search') prev.current = window.location.hash.replace(/^#/, '') || '/'
    if (!v) go(prev.current, true)
    else go(`/search?q=${encodeURIComponent(v)}`, true)
  }

  return (
    <div className="app">
      <aside className="side">
        <a className="brand" href="#/" aria-label="Labminutes home">
          <span className="brand-mark"><Icon name="wave" size={22} /></span>
          <span>Labminutes</span>
        </a>
        <div className="labbox">
          <div className="labbox-name">Halvorsen Lab</div>
          <div className="labbox-sub">Coastal ecology</div><div className="labbox-sub">14 members</div>
        </div>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <a key={n.key} href={`#${n.to}`} className={`nav${section === n.key || (n.key === 'library' && section === 'rec') ? ' on' : ''}`} aria-current={section === n.key ? 'page' : undefined}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.key === 'actions' && <span className="badge" title={`${mineOpen} open and assigned to you`}>{mineOpen}</span>}
              {n.key === 'library' && <span className="count">6</span>}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-legend">
            <div className="eyebrow">On every timeline</div>
            <Legend />
            <div className="legend-2">
              <span><i className="mk-me-sw" />Your name</span>
              <span><i className="mk-dec-sw" />Decision</span>
            </div>
            <div className="legend-3">Darker shading is what you’ve already heard.</div>
          </div>
          <div className="me-card">
            <Avatar id="me" size={34} />
            <div>
              <div className="me-name">{ME.name}</div>
              <div className="me-role">{ME.role}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <label className="search">
            <Icon name="search" size={17} />
            <input
              ref={input}
              type="search"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search every transcript — try “cytometer” or “authorship”"
              aria-label="Search transcripts"
            />
            <kbd>/</kbd>
          </label>
          <button className="deadline" onClick={() => go('/actions')} title="Your cruise data plan presentation">
            <span className="dl-dot" />
            <span>
              <b>Cruise data plan</b> · {weekday(PRESENT_DATE)} {shortDate(PRESENT_DATE)}
            </span>
            <span className="dl-days">{days} days</span>
          </button>
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            <Icon name="keyboard" size={19} />
          </button>
        </header>
        <div className={`scroll${wide ? ' fixed' : ''}`} id="scroll">
          {children}
        </div>
      </div>

      <PlayerBar />

      {help && (
        <div className="modal-back" onClick={() => setHelp(false)}>
          <div className="modal" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Keyboard shortcuts</h2>
              <button className="icon-btn" onClick={() => setHelp(false)} aria-label="Close"><Icon name="x" /></button>
            </div>
            <dl>
              {[
                ['Space / k', 'Play or pause'],
                ['j / l', 'Back 15 s / forward 30 s'],
                ['← / →', 'Back / forward 5 s'],
                ['[ / ]', 'Slower / faster'],
                ['p / n', 'Previous / next chapter'],
                ['/', 'Search transcripts'],
              ].map(([k, v]) => (
                <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}

