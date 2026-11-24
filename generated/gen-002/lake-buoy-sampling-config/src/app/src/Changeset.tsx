import { ICE, TODAY, addDays, daysBetween, fmtDate, fmtDow } from './data'
import { useApp } from './store'

export function Changeset() {
  const { st, groups, impacts, actions, locked } = useApp()
  const { retrieval, scheduled, reasons } = st
  const missing = groups.filter((g) => !(reasons[g.key] ?? '').trim())
  const condDecided = groups.some((g) => (g.area === 'units' && g.field === 'cond') || (g.area === 'export' && g.targets.includes('reyes')))
  const toIce = daysBetween(retrieval.date, ICE.full.from)
  const minDate = addDays(TODAY, 1)
  const canSchedule = groups.length > 0 && missing.length === 0 && retrieval.date >= minDate

  return (
    <aside className="cs">
      <div className="cs-head">
        <div className="cs-title">
          <h2>Winter 2026–27</h2>
          <span className={`badge ${scheduled ? 'accent' : 'edit'}`}>{scheduled ? 'Scheduled' : 'Draft'}</span>
        </div>
        <p className="cs-sub">Copied from Winter 2025–26 today, 07:58 · changes below are against that profile</p>
      </div>

      <div className="cs-body">
        <section className="cs-sec switch-over">
          <h3>Switch-over</h3>
          <div className="so-grid">
            <label htmlFor="ret-date">Main Buoy retrieval</label>
            <div className="so-inputs">
              <input id="ret-date" type="date" value={retrieval.date} min={minDate} disabled={locked}
                onChange={(e) => e.target.value && actions.setRetrieval({ date: e.target.value < minDate ? minDate : e.target.value })} />
              <input type="time" value={retrieval.time} step={1800} disabled={locked} aria-label="Switch-over time"
                onChange={(e) => e.target.value && actions.setRetrieval({ time: e.target.value })} />
            </div>
          </div>
          <p className="so-line">
            Open Water 2026 stays live until <strong>{fmtDow(retrieval.date)}, {retrieval.time} CST</strong>. Nothing in this draft reaches a logger before then.
          </p>
          <label className="check">
            <input type="checkbox" checked={retrieval.holdForLog} disabled={locked} onChange={(e) => actions.setRetrieval({ holdForLog: e.target.checked })} />
            <span>If the buoy pull slips, hold until retrieval is logged in the field log</span>
          </label>
          <p className={`so-ice ${toIce < 0 ? 'bad' : toIce <= 2 ? 'tight' : ''}`}>
            {toIce > 0 ? `${toIce} day${toIce > 1 ? 's' : ''} before` : toIce === 0 ? 'Same day as' : `${-toIce} day${toIce < -1 ? 's' : ''} after`} the earliest full ice-cover estimate ({fmtDate(ICE.full.from, false)}). Skim ice likely {fmtDate(ICE.skim.from, false)}–{ICE.skim.to.slice(8)}.
          </p>
        </section>

        <section className="cs-sec">
          <h3>Changes <span className="count">{groups.length}</span></h3>
          {groups.length === 0 && <p className="empty">Identical to Winter 2025–26 so far.</p>}
          <ol className="changes">
            {groups.map((g) => {
              const reason = reasons[g.key] ?? ''
              return (
                <li key={g.key} className={`change ${!reason.trim() ? 'needs' : ''}`}>
                  <div className="ch-top">
                    <button className="ch-title" onClick={() => actions.goto(g.view, g.area === 'qa' ? { qa: g.field } : g.area === 'sensor' ? { dep: null } : {})}>{g.title}</button>
                    {!locked && <button className="link small" onClick={() => actions.revert(g)}>Revert</button>}
                  </div>
                  <div className="ch-diff">
                    <span className="from">{g.from}</span><span className="arr">→</span><span className="to">{g.to}</span>
                  </div>
                  <div className="ch-scope">
                    {g.scope.length > 1 && <span className="n">{g.scope.length} ×</span>} {g.scope.join(', ')}
                  </div>
                  <textarea
                    rows={reason.length > 70 ? 3 : 2}
                    placeholder="Reason — goes into the change history"
                    value={reason}
                    disabled={locked}
                    onChange={(e) => actions.setReason(g.key, e.target.value)}
                  />
                </li>
              )
            })}
          </ol>
        </section>

        {(impacts.length > 0 || !condDecided) && (
          <section className="cs-sec">
            <h3>Before you schedule</h3>
            <ul className="impacts">
              {!condDecided && (
                <li className="impact req">
                  <button className="link" onClick={() => actions.setView('exports')}>Ana Lucía Reyes asked for conductivity in µS/cm</button>
                  <span> — station-wide or her export only? Not decided. Doesn't block scheduling.</span>
                </li>
              )}
              {impacts.map((i) => (
                <li key={i.key} className={`impact ${i.level}`}>
                  <span>{i.text}</span>{' '}
                  {i.key === 'cal' && !locked ? (
                    <button className="link small" onClick={() => actions.ackCal(true)}>Accept, keep them running</button>
                  ) : (
                    <button className="link small" onClick={() => actions.setView(i.view)}>View</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="cs-foot">
        {scheduled ? (
          <>
            <div className="sched-msg">
              <strong>Scheduled</strong> — {scheduled.count} change{scheduled.count === 1 ? '' : 's'} switch over {fmtDow(retrieval.date)}, {retrieval.time} CST{retrieval.holdForLog ? ', once retrieval is logged' : ''}.
            </div>
            <button className="btn" onClick={actions.unschedule}>Unschedule to edit</button>
          </>
        ) : (
          <>
            {missing.length > 0 && groups.length > 0 && (
              <div className="foot-note">{missing.length} change{missing.length > 1 ? 's need' : ' needs'} a reason</div>
            )}
            <button className="btn primary" disabled={!canSchedule} onClick={actions.schedule}>
              Schedule for {fmtDow(retrieval.date)}, {retrieval.time}
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
