import { FLOOR, LOCK_AT, VERSIONS, WEEKS } from '../data';
import { useApp } from '../ctx';
import { fmtDate, fmtM, fmtTime, fmtDay } from '../model';
import { Avatar } from './Avatar';

export function Versions() {
  const { s, bal } = useApp();
  const low = Math.min(...bal.end);
  const lowW = bal.end.indexOf(low);
  const lows = [low, ...VERSIONS.map((v) => v.low)];
  const mx = Math.max(...lows), mn = Math.min(...lows, FLOOR);
  const barW = (v: number) => 20 + ((v - mn) / (mx - mn || 1)) * 90;
  return (
    <div className="versions">
      <div className="list-head">
        <span>FY2027 Q1 · 11 published, 1 draft</span>
      </div>
      <p className="muted small pad">Only Kathleen Moore (Assistant Treasurer) can lock and publish. The CFO office sees published versions only.</p>
      <div className="ver ver-draft">
        <div className="ver-n">v12</div>
        <div className="ver-main">
          <div>
            <b>Draft</b> · {s.signoff.status === 'submitted' ? `sent to Kathleen ${fmtTime(s.signoff.at!)}` : `locks ${fmtDay(LOCK_AT)}, ${fmtTime(LOCK_AT)}`}
          </div>
          <div className="muted small">{s.edits.length} edits since v11 · wks of {fmtDate(WEEKS[0])} – {fmtDate(WEEKS[12])}</div>
        </div>
        <div className="ver-low">
          <span className={low < FLOOR ? 'neg' : ''}>{fmtM(low)}</span>
          <span className="muted small">low · {fmtDate(WEEKS[lowW])}</span>
          <span className="vbar"><i className={low < FLOOR ? 'b-neg' : 'b-pos'} style={{ width: barW(low) }} /></span>
        </div>
      </div>
      {VERSIONS.map((v) => (
        <div key={v.v} className={'ver' + (v.v === 11 ? ' ver-base' : '')}>
          <div className="ver-n">v{v.v}</div>
          <div className="ver-main">
            <div>
              <Avatar id={v.by} size={14} /> Published {fmtDay(v.published)}, {fmtTime(v.published)}
              {v.v === 11 && <span className="pill pill-base">Comparison base</span>}
            </div>
            <div className="muted small">{v.edits} edits{v.note ? ` · ${v.note}` : ''}</div>
          </div>
          <div className="ver-low">
            <span>{fmtM(v.low)}</span>
            <span className="muted small">low · {fmtDate(v.lowWeek)}</span>
            <span className="vbar"><i className="b-base" style={{ width: barW(v.low) }} /></span>
          </div>
        </div>
      ))}
    </div>
  );
}
