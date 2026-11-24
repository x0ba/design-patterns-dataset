import { NOW, fmtTime } from '../lib/time';

export function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" aria-hidden="true">B</span>
        <div>
          <div className="brand-name">Baylight</div>
          <div className="brand-site">Northlight Studios · Front desk</div>
        </div>
      </div>

      <div className="clock" aria-live="off">
        <div className="clock-date">Monday 16 November 2026</div>
        <div className="clock-time">{fmtTime(NOW)}</div>
      </div>

      <div className="shift">
        <div className="shift-row">
          <span className="shift-dot" aria-hidden="true" />
          <span>
            <b>Kofi Mensah</b> on the desk until 6:00 PM
          </span>
        </div>
        <div className="shift-row muted">
          <span className="shift-dot idle" aria-hidden="true" />
          <span>Jas on from 6:00 PM to close</span>
        </div>
      </div>
    </header>
  );
}
