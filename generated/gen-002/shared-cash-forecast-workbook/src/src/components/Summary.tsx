import { useState } from 'react';
import { FLOOR, OPENING, WEEKS, WATCH_BAND } from '../data';
import { useApp } from '../ctx';
import { V11_END, fmtDate, fmtM } from '../model';

export function Summary() {
  const { checks } = useApp();
  const blockers = checks.filter((c) => c.level === 'block').length;
  return (
    <section className="summary">
      <Chart />
      <div className="checklist">
        <div className="cl-head">
          <span>Before Kathleen can lock</span>
          <span className={'cl-count' + (blockers ? ' bad' : ' good')}>{blockers ? `${blockers} blocking` : 'Ready to send'}</span>
        </div>
        <ul>
          {checks.map((c) => (
            <li key={c.id} className={'cl-item lvl-' + c.level}>
              <span className="cl-icon" aria-hidden>
                {c.level === 'ok' ? '✓' : c.level === 'block' ? '!' : c.level === 'warn' ? '~' : 'i'}
              </span>
              <div className="cl-text" title={c.detail ? `${c.title}. ${c.detail}` : c.title}>
                <span className="cl-title">{c.title}</span>
                {c.detail && <span className="cl-detail">{c.detail}</span>}
              </div>
              <div className="cl-actions">
                {c.actions.map((a) => (
                  <button key={a.label} className="link" onClick={a.run}>
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Chart() {
  const { bal, s, dispatch } = useApp();
  const [hover, setHover] = useState<number | null>(null);
  const W = 470, H = 112, padL = 34, padR = 10, padT = 12, padB = 15;
  const vals = [...bal.end, ...(V11_END.filter((v) => v != null) as number[]), FLOOR];
  const min = Math.floor((Math.min(...vals) - 4000) / 10000) * 10000;
  const max = Math.ceil((Math.max(...vals) + 2000) / 10000) * 10000;
  const x = (w: number) => padL + (w * (W - padL - padR)) / (WEEKS.length - 1);
  const y = (v: number) => padT + ((max - v) * (H - padT - padB)) / (max - min);
  const path = (arr: (number | null)[]) =>
    arr.map((v, w) => (v == null ? '' : `${w === 0 || arr[w - 1] == null ? 'M' : 'L'}${x(w).toFixed(1)},${y(v).toFixed(1)}`)).join(' ');
  const ticks: number[] = [];
  for (let t = min; t <= max; t += 10000) ticks.push(t);
  const sel = s.selection?.kind === 'balance' ? s.selection.week : null;
  const low = Math.min(...bal.end);
  const lowW = bal.end.indexOf(low);

  return (
    <div className="chart">
      <div className="chart-head">
        <span className="chart-title">Ending cash, consolidated</span>
        <span className="legend">
          <i className="lg-cur" />Draft <i className="lg-v11" />v11 <i className="lg-floor" />$25M floor
        </span>
      </div>
      <div className="chart-kpi">
        <span className="muted">Low point</span>
        <b className={low < FLOOR ? 'neg' : low - FLOOR < WATCH_BAND ? 'warnc' : ''}>{fmtM(low)}</b>
        <span>wk {lowW + 1} · {fmtDate(WEEKS[lowW])}</span>
        <span className={'chip ' + (low < FLOOR ? 'chip-bad' : 'chip-ok')}>{fmtM(low - FLOOR, true)} vs floor</span>
        {V11_END[lowW] != null && <span className="chip">{fmtM(low - V11_END[lowW]!, true)} vs v11</span>}
        <span className="muted">· opening {fmtM(OPENING)} (bank, Nov 13)</span>
      </div>
      <svg width={W} height={H} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={padL - 5} y={y(t) + 3} className="axis" textAnchor="end">{t / 1000}M</text>
          </g>
        ))}
        <rect x={padL} y={y(FLOOR)} width={W - padL - padR} height={Math.max(0, y(min) - y(FLOOR))} className="below-floor" />
        <line x1={padL} x2={W - padR} y1={y(FLOOR)} y2={y(FLOOR)} className="floor-line" />
        <path d={path(V11_END)} className="v11-line" />
        <path d={path(bal.end)} className="cur-line" />
        {bal.end.map((v, w) => (
          <g key={w}>
            <text x={x(w)} y={H - 4} className={'axis' + (sel === w ? ' axis-sel' : '')} textAnchor="middle">{w + 1}</text>
            <circle cx={x(w)} cy={y(v)} r={v < FLOOR ? 4.5 : 3} className={v < FLOOR ? 'pt pt-bad' : 'pt'} />
            {v < FLOOR && (
              <text x={x(w)} y={y(v) + 15} className="pt-label" textAnchor="middle">{fmtM(v)}</text>
            )}
            <rect
              x={x(w) - 15} y={padT - 10} width={30} height={H - padT - padB + 10} className="hit"
              onMouseEnter={() => setHover(w)}
              onClick={() => dispatch({ type: 'select', sel: { kind: 'balance', week: w }, tab: 'inspector' })}
            />
          </g>
        ))}
        {sel != null && <line x1={x(sel)} x2={x(sel)} y1={padT - 6} y2={H - padB} className="sel-line" />}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(x(hover) + 10, W - 150) }}>
          <b>Wk {hover + 1} · {fmtDate(WEEKS[hover])}</b>
          <div>Draft <span className={bal.end[hover] < FLOOR ? 'neg' : ''}>{fmtM(bal.end[hover])}</span></div>
          <div>v11 {V11_END[hover] != null ? fmtM(V11_END[hover]!) : 'not in v11'}</div>
          <div className="muted">Click for the bridge</div>
        </div>
      )}
    </div>
  );
}
