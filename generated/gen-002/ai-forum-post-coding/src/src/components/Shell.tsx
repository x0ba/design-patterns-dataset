import type { ReactNode } from 'react'
import { Activity, BookMarked, GitCompareArrows, LayoutDashboard, Layers, Pause, Play, RotateCcw, ShieldAlert, Tags } from 'lucide-react'
import { useStore } from '../store'
import { navigate, useRoute } from '../lib/router'
import { fmtInt, fmtUSD } from '../lib/format'
import { CODED_TOTAL, CORPUS_TOTAL } from '../data/corpus'
import { DISAGREEMENTS } from '../data/corpus'
import { THRESHOLD, V3_STATS, failing } from '../lib/stats'
import { changedCodes } from '../lib/draft'

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <rect width="26" height="26" rx="6" fill="#1f5a6b" />
      <rect x="5" y="6.5" width="16" height="2.6" rx="1.3" fill="#cfe3e8" />
      <rect x="5" y="11.7" width="10" height="2.6" rx="1.3" fill="#f5cf5a" />
      <rect x="16.5" y="11.7" width="4.5" height="2.6" rx="1.3" fill="#cfe3e8" />
      <rect x="5" y="16.9" width="13" height="2.6" rx="1.3" fill="#cfe3e8" />
    </svg>
  )
}

export function TopBar() {
  const s = useStore()
  const total = CODED_TOTAL
  const run2 = s.runs.find((r) => r.id === 2)
  return (
    <header className="topbar">
      <a className="brand" href="#/overview" aria-label="Threadcoder home">
        <Logo />
        <span>Threadcoder</span>
      </a>
      <div className="crumb">
        <span className="crumb-label">Project</span>
        <strong>Mutual-aid forums, 2021–24</strong>
      </div>

      <div className={`runchip ${s.runMode}`} role="status" aria-live="polite">
        <span className="runchip-dot" aria-hidden />
        {s.runMode === 'running' && (<>
          <strong>Run 1 running</strong>
          <span className="sep">·</span><span>codebook v3</span>
          <span className="sep">·</span><span className="num">{fmtInt(total)} / {fmtInt(CORPUS_TOTAL)} posts</span>
        </>)}
        {s.runMode === 'paused' && (<>
          <strong>Run 1 paused</strong>
          <span className="sep">·</span><span>codebook v3</span>
          <span className="sep">·</span><span className="num">{fmtInt(total)} / {fmtInt(CORPUS_TOTAL)} posts</span>
        </>)}
        {s.runMode === 'restarted' && (<>
          <strong>Run 2 running</strong>
          <span className="sep">·</span><span>codebook v4</span>
          <span className="sep">·</span><span className="num">{fmtInt(run2?.done ?? 0)} / {fmtInt(CORPUS_TOTAL - total)} new posts</span>
        </>)}
      </div>

      <div className="topbar-right">
        <div className="spend" title="Estimated model spend for this project">
          <span className="crumb-label">Spend</span>
          <strong className="num">{fmtUSD(s.spend)}</strong>
        </div>
        {s.runMode === 'running' && (
          <button className="btn btn-primary" onClick={s.pause}><Pause size={15} /> Pause run</button>
        )}
        {s.runMode === 'paused' && (<>
          <button className="btn btn-ghost" onClick={s.resume}><Play size={15} /> Resume with v3</button>
          <button className="btn btn-primary" onClick={() => navigate('runs')}><RotateCcw size={15} /> Restart…</button>
        </>)}
        <div className="avatar" title="Priya Ramaswamy, PhD candidate" aria-label="Signed in as Priya Ramaswamy">PR</div>
      </div>
    </header>
  )
}

function NavItem({ to, icon, label, badge, active, title }: { to: string; icon: ReactNode; label: string; badge?: ReactNode; active: boolean; title?: string }) {
  return (
    <a href={`#/${to}`} className={`nav-item ${active ? 'on' : ''}`} aria-current={active ? 'page' : undefined} title={title}>
      {icon}<span>{label}</span>{badge !== undefined && <em>{badge}</em>}
    </a>
  )
}

export function SideNav() {
  const { segs } = useRoute()
  const s = useStore()
  const cur = segs[0] ?? 'overview'
  const tagged = Object.values(s.tags).filter((t) => t.cause).length
  const fails = failing(V3_STATS)
  const draftChanged = s.draft ? changedCodes(s.draft).length : 0
  return (
    <nav className="sidenav" aria-label="Main">
      <div className="nav-group">
        <NavItem to="overview" icon={<LayoutDashboard size={17} />} label="Overview" active={cur === 'overview'} />
        <NavItem to="disagreements" icon={<GitCompareArrows size={17} />} label="Disagreements" badge={`${tagged}/${DISAGREEMENTS.length}`} title={`${tagged} of ${DISAGREEMENTS.length} disagreements tagged`} active={cur === 'disagreements'} />
        <NavItem to="codebook" icon={<BookMarked size={17} />} label="Codebook"
          badge={s.published ? 'v4' : s.draft ? (draftChanged ? 'draft v4' : 'v3') : 'v3'} active={cur === 'codebook'} />
        <NavItem to="runs" icon={<Layers size={17} />} label="Runs" active={cur === 'runs'} />
        <NavItem to="labels" icon={<Tags size={17} />} label="Labels" badge={fmtInt(CODED_TOTAL)} active={cur === 'labels'} />
        <NavItem to="activity" icon={<Activity size={17} />} label="Activity" active={cur === 'activity'} />
      </div>
      <div className="nav-gate">
        <div className="nav-gate-head"><ShieldAlert size={15} /> Policy gate: blocked</div>
        <p>
          {fails.length} of 9 codes under κ {THRESHOLD.toFixed(2)}:{' '}
          {fails.map((f) => `${f.code === 'request' ? 'request for help' : f.code} ${f.kappa.toFixed(2)}`).join(', ')}.
        </p>
        <p className="nav-gate-sub">0 labels accepted into the dataset.</p>
      </div>
    </nav>
  )
}
