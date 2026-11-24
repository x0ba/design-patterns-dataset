import { nf } from '../utils.js'
export default function NeedsRail({ needs, computed, activeId, onSelect, shortlist }) {
  return (
    <aside className="rail" aria-label="Needs in this request">
      <div className="rail-head"><h2>Needs</h2><span>{needs.length} in this request</span></div>
      <ol className="needs">
        {needs.map((n, i) => {
          const c = computed[n.id]
          const sl = (shortlist[n.id] || []).length
          return (
            <li key={n.id}>
              <button className={'need' + (n.id === activeId ? ' on' : '')} onClick={() => onSelect(n.id)} aria-current={n.id === activeId}>
                <span className="need-n">{i + 1}</span>
                <span className="need-body">
                  <b>{n.title}</b>
                  <q>{n.ask}</q>
                  <span className="need-stats">
                    <em>{c.shown.length} candidate{c.shown.length === 1 ? '' : 's'}</em>
                    <span className={'need-sl' + (sl ? ' has' : '')}>{sl} shortlisted</span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="rail-note">
        <h3>From the production</h3>
        <p>“We’d like everything within reach of one hotel, so nothing farther than 90 minutes from the capital. Two nights of main-street closure is the hard requirement. We shoot nights.”</p>
        <small>— Priya Raman, location manager</small>
      </div>
      <div className="rail-note quiet">
        <h3>How matching works</h3>
        <p>Type your need in plain words. Terms are read into the chips under the box; switch any off to widen the search. Drive times are from the Capitol in Ellery.</p>
      </div>
    </aside>
  )
}
