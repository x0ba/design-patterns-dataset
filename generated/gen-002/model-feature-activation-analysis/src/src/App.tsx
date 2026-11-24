import { useState } from 'react'
import { db, LAYERS, N, NF, gid } from './data/db'
import { useApp, type Page } from './store'
import { Icon, Star } from './ui'
import { Explorer } from './components/Explorer'
import { Detail } from './components/Detail'
import { Notebook, Bookmarks, Runs } from './components/Pages'

function TopBar() {
  const { select, setPage, page } = useApp()
  const [v, setV] = useState('')
  const [err, setErr] = useState(false)
  const go = () => {
    const m = v.trim().match(/^L?(\d+)\s*[#:,\s]\s*#?(\d+)$/i)
    if (m) {
      const li = LAYERS.indexOf(+m[1]), i = +m[2]
      if (li >= 0 && i < NF) { select(gid(li, i)); setErr(false); setV(''); if (page === 'runs') setPage('explorer'); return }
    }
    setErr(true)
  }
  return (
    <header className="topbar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="7" fill="#2342c4" /><circle cx="11" cy="20" r="3" fill="#fff" /><circle cx="21" cy="11" r="3" fill="#ffd43b" /><circle cx="22" cy="22" r="2" fill="#fff" opacity=".7" /></svg>
        Featurescope
      </div>
      <div className="crumbs">
        <span>OLMo-1B</span><i>/</i><span>SAE sweep · resid_post</span><i>/</i><b>8 layers · {N.toLocaleString()} features</b>
      </div>
      <div className="spacer" />
      <form className={`jump ${err ? 'err' : ''}`} onSubmit={(e) => { e.preventDefault(); go() }}>
        <Icon n="search" size={14} />
        <input value={v} onChange={(e) => { setV(e.target.value); setErr(false) }} placeholder="Jump to feature: L12 #4021" aria-label="Jump to feature" />
        {err && <span className="jump-err">Use layer and index, e.g. L12 #4021 (layers 2–16, even)</span>}
      </form>
      <div className="user"><span className="avatar">KM</span><span>Kofi Mensah</span></div>
    </header>
  )
}

function Sidebar() {
  const { page, setPage, ws, openHypothesis, activeHyp, setView } = useApp()
  const nb = Object.keys(ws.bookmarks).length
  const item = (p: Page, icon: string, label: string, badge?: string | number) => (
    <button className={`nav ${page === p ? 'on' : ''}`} onClick={() => setPage(p)} aria-current={page === p ? 'page' : undefined}>
      <Icon n={icon} /> <span>{label}</span>{badge !== undefined && <em>{badge}</em>}
    </button>
  )
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="nav-group">
        {item('explorer', 'explore', 'Feature explorer')}
        {item('notebook', 'notebook', 'Working notes', 3)}
        {item('bookmarks', 'bookmark', 'Bookmarks', nb)}
        {item('runs', 'runs', 'Training runs', 8)}
      </div>
      <div className="side-t">Hypotheses</div>
      <div className="hyps">
        {ws.hyps.map((h) => (
          <button key={h.id} className={`hy ${activeHyp === h.id && page === 'explorer' ? 'on' : ''}`} onClick={() => openHypothesis(h.id)} title="Open this hypothesis’s view in the explorer">
            <span className="hid">{h.id}</span>
            <span className="hy-t">{h.title}</span>
            <span className={`dot s-${h.status.replace(' ', '-')}`} title={h.status} />
          </button>
        ))}
      </div>
      <div className="side-t">Saved slices</div>
      <div className="side-slices">
        <button className="slice" onClick={() => { setView({ layers: LAYERS.map((l) => l === 12), tab: 'scatter', sel: 'cluster', hlCluster: true, brush: null, q: '' }); setPage('explorer') }}><i style={{ background: '#c2185b' }} /><span>L12 code cluster</span><em>34</em></button>
        <button className="slice" onClick={() => { setView({ layers: LAYERS.map(() => true), tab: 'layers', sel: 'dI', hlCluster: false, brush: null, q: '' }); setPage('explorer') }}><i style={{ background: '#1f8a9a' }} /><span>Dense exceptions</span></button>
        <button className="slice" onClick={() => { setView({ layers: LAYERS.map((l) => l >= 8), tab: 'scatter', zoom: 'dense', sel: 'dN', hlCluster: false, brush: null, q: '' }); setPage('explorer') }}><i style={{ background: '#d9822b' }} /><span>Late dense (L8+)</span></button>
      </div>
      <div className="side-foot">
        <div><b>Workshop deadline</b><span>Dec 8 · 3 weeks</span></div>
        <div><b>Lab meeting</b><span>Tomorrow, Nov 18</span></div>
      </div>
    </nav>
  )
}

export function App() {
  const { page } = useApp()
  return (
    <div className={`app page-${page}`}>
      <TopBar />
      <Sidebar />
      <main className="main">
        {page === 'explorer' && <Explorer />}
        {page === 'notebook' && <Notebook />}
        {page === 'bookmarks' && <Bookmarks />}
        {page === 'runs' && <Runs />}
      </main>
      {page !== 'runs' && <Detail />}
    </div>
  )
}

export { db, Star }
