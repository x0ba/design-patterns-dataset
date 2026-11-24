import { useEffect, useState } from 'react';
import { LOCK_AT, person, lineById } from '../data';
import { useApp } from '../ctx';
import { fmtTime } from '../model';
import { Avatar } from './Avatar';

export function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

export function TopBar() {
  const { s, now, checks, openLock, openSignoff, dispatch } = useApp();
  useTick(1000);
  const t = now();
  const left = Math.max(0, LOCK_AT.getTime() - t.getTime());
  const h = Math.floor(left / 3600e3);
  const m = Math.floor((left % 3600e3) / 60e3);
  const sec = Math.floor((left % 60e3) / 1e3);
  const blockers = checks.filter((c) => c.level === 'block').length;
  const live = Object.entries(s.presence).filter(([, p]) => p) as [string, NonNullable<(typeof s.presence)[string]>][];

  return (
    <header className="topbar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <rect x="1" y="1" width="20" height="20" rx="5" fill="#0f766e" />
          <path d="M5 14.5l3.5-4 3 2.5L17 7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Cashweek</span>
      </div>
      <div className="doc">
        <div className="doc-title">
          13-week cash forecast <span className="pill pill-draft">v12 draft</span>
          {s.signoff.status === 'submitted' && <span className="pill pill-sent">With Kathleen for sign-off</span>}
        </div>
        <div className="doc-sub">FY2027 Q1 · Weeks of Nov 16, 2026 – Feb 8, 2027 · 4 entities · $000s</div>
      </div>
      <div className="spacer" />
      <div className="presence">
        {live.map(([id, p]) => (
          <button
            key={id}
            className="pres"
            title={`${person[id].name}: ${p.status}`}
            onClick={() => {
              if (id === 'raj' && s.payrollLock.holder === 'raj') openLock();
              else dispatch({ type: 'select', sel: { kind: 'cell', lineId: p.lineId, week: p.week }, tab: 'inspector' });
            }}
          >
            <Avatar id={id} size={24} ring />
            <span className="pres-txt">
              <b>{person[id].first}</b>
              <span>{id === 'raj' && s.payrollLock.holder === 'raj' ? 'Payroll · locked' : lineById[p.lineId].name.replace('Vendor AP — ', 'AP · ')}</span>
            </span>
          </button>
        ))}
        <span className="pres-others" title="Online, not in the workbook: Aisha Grant, Kathleen Moore (in meetings until 2:30 pm), Denise Okafor">
          <Avatar id="aisha" size={20} dim />
          <Avatar id="kathleen" size={20} dim />
          <Avatar id="denise" size={20} dim />
        </span>
      </div>
      <div className={'countdown' + (left < 30 * 60e3 ? ' urgent' : '')} title="Kathleen Moore locks and publishes at 3:00 pm">
        <span className="cd-label">Locks {fmtTime(LOCK_AT)}</span>
        <span className="cd-time">{h}h {String(m).padStart(2, '0')}m <small>{String(sec).padStart(2, '0')}s</small></span>
      </div>
      {s.signoff.status === 'submitted' ? (
        <button className="btn" onClick={() => dispatch({ type: 'recall' })}>Recall from Kathleen</button>
      ) : (
        <button className="btn btn-primary" onClick={openSignoff}>
          Send to Kathleen{blockers ? <span className="btn-badge">{blockers}</span> : null}
        </button>
      )}
      <div className="me" title="Helen Szabo · Senior Treasury Analyst · Consolidation owner">
        <Avatar id="helen" size={28} />
      </div>
    </header>
  );
}
