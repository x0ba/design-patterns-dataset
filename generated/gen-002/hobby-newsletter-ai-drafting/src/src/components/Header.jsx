import { ISSUE, TASK } from '../data/draft.js'
import { Doc } from './Icons.jsx'

export default function Header({ state, dispatch }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">L</span>
        <div>
          <div className="brand-name">Eastside Ledger Desk</div>
          <div className="brand-sub">{ISSUE.newsletter} · Doug Ferreira</div>
        </div>
      </div>
      <nav className="crumbs" aria-label="Where you are">
        <span>Issue of Thu, Nov 19</span>
        <span className="crumb-sep">/</span>
        <strong>{ISSUE.section}</strong>
        <span className="crumb-sep">/</span>
        <span>Review the assistant’s draft</span>
      </nav>
      <div className="send-info">
        <div>
          <div className="send-label">Goes out</div>
          <div className="send-when">{ISSUE.sendsAt}</div>
        </div>
        <div className="send-divider" />
        <div>
          <div className="send-label">To</div>
          <div className="send-when">{ISSUE.subscribers} neighbors</div>
        </div>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'modal', modal: { type: 'preview' } })}>
          <Doc /> Assembled section
        </button>
      </div>
    </header>
  )
}

export function TaskBar({ state, dispatch }) {
  const open = state.taskOpen
  return (
    <div className={'taskbar' + (open ? ' open' : '')}>
      <span className="task-tag">Your instruction · {TASK.askedAt}</span>
      <p className="task-text">“{TASK.instruction}”</p>
      <button className="link-btn" onClick={() => dispatch({ type: 'toggleTask' })} aria-expanded={open}>
        {open ? 'Show less' : 'Show all'}
      </button>
    </div>
  )
}
