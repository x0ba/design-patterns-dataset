import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import {
  ENTITIES, FLOOR, PAYROLL_WEEKS, SECTIONS, V11, WATCH_BAND, WEEKS, WEEK_TAGS, entityById, person, type Line,
} from '../data';
import { editBlockReason, useApp } from '../ctx';
import { delta, fmtDate, fmtDeltaK, fmtK, linesFor, sum, weekFlows } from '../model';
import { Avatar } from './Avatar';
import { CellEditor } from './CellEditor';

type RowKey = string; // line id or 'END'

export function GridView() {
  const { s, dispatch, bal } = useApp();
  const wrap = useRef<HTMLDivElement>(null);
  const lines = linesFor(s.entity);
  const rows: RowKey[] = useMemo(() => {
    const r: RowKey[] = [];
    SECTIONS.forEach((sec) => lines.filter((l) => l.section === sec.id).forEach((l) => r.push(l.id)));
    if (s.entity === 'all') r.push('END');
    return r;
  }, [lines, s.entity]);

  // which cells have notes missing / threads
  const cellInfo = useMemo(() => {
    const unx = new Set<string>();
    const changedBy = new Map<string, string>();
    for (const e of s.edits) {
      const k = e.lineId + ':' + e.week;
      changedBy.set(k, e.by);
      if (!e.note && Math.abs(delta(e)) >= 500) unx.add(k);
    }
    const thr = new Set<string>();
    for (const t of s.threads) {
      if (t.status !== 'open') continue;
      thr.add(t.anchor.kind === 'cell' ? t.anchor.lineId + ':' + t.anchor.week : 'END:' + t.anchor.week);
    }
    return { unx, thr, changedBy };
  }, [s.edits, s.threads]);

  const presenceAt = useMemo(() => {
    const m = new Map<string, string>();
    Object.entries(s.presence).forEach(([id, p]) => p && m.set(p.lineId + ':' + p.week, id));
    return m;
  }, [s.presence]);

  const presenceRow = useMemo(() => {
    const m = new Map<string, string>();
    Object.entries(s.presence).forEach(([id, p]) => p && m.set(p.lineId, id));
    return m;
  }, [s.presence]);

  // scroll selection into view
  useEffect(() => {
    const sel = s.selection;
    if (!sel || !wrap.current) return;
    const key = sel.kind === 'cell' ? `${sel.lineId}:${sel.week}` : sel.kind === 'balance' ? `END:${sel.week}` : `row:${sel.lineId}`;
    const el = wrap.current.querySelector(`[data-key="${key}"]`) as HTMLElement | null;
    if (!el) return;
    const w = wrap.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const footerH = 112, headerH = 44, labelW = 222;
    if (r.top < w.top + headerH) wrap.current.scrollTop -= w.top + headerH - r.top + 8;
    else if (r.bottom > w.bottom - footerH && !key.startsWith('END')) wrap.current.scrollTop += r.bottom - (w.bottom - footerH) + 8;
    if (r.left < w.left + labelW) wrap.current.scrollLeft -= w.left + labelW - r.left + 8;
    else if (r.right > w.right) wrap.current.scrollLeft += r.right - w.right + 8;
  }, [s.selection]);

  const select = (lineId: string, week: number) => dispatch({ type: 'select', sel: { kind: 'cell', lineId, week }, tab: 'inspector' });
  const tryEdit = (lineId: string, week: number) => {
    const why = editBlockReason(s, lineId);
    if (why) {
      select(lineId, week);
      dispatch({ type: 'toast', text: why });
    } else {
      dispatch({ type: 'select', sel: { kind: 'cell', lineId, week } });
      dispatch({ type: 'startEdit', cell: { lineId, week } });
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (s.editing) return;
    const sel = s.selection;
    if (!sel || sel.kind === 'line') return;
    const row = sel.kind === 'cell' ? sel.lineId : 'END';
    const week = sel.week;
    let ri = rows.indexOf(row);
    let w = week;
    if (e.key === 'ArrowDown') ri = Math.min(rows.length - 1, ri + 1);
    else if (e.key === 'ArrowUp') ri = Math.max(0, ri - 1);
    else if (e.key === 'ArrowLeft') w = Math.max(0, w - 1);
    else if (e.key === 'ArrowRight') w = Math.min(WEEKS.length - 1, w + 1);
    else if ((e.key === 'Enter' || e.key === 'F2') && sel.kind === 'cell') {
      e.preventDefault();
      tryEdit(sel.lineId, sel.week);
      return;
    } else return;
    e.preventDefault();
    const rk = rows[ri];
    dispatch({ type: 'select', sel: rk === 'END' ? { kind: 'balance', week: w } : { kind: 'cell', lineId: rk, week: w } });
  };

  const isSel = (lineId: string, w: number) => s.selection?.kind === 'cell' && s.selection.lineId === lineId && s.selection.week === w;
  const flows = weekFlows(s.values, lines);
  const totalCol = (arr: number[]) => sum(arr);
  const lock = s.payrollLock;

  const renderLine = (l: Line) => {
    const vals = s.values[l.id];
    const prior = V11[l.id];
    const locked = l.group === 'payroll' && !!lock.holder;
    const own = l.owner === 'helen';
    const rowPres = presenceRow.get(l.id);
    const lineSel = s.selection?.kind === 'line' && s.selection.lineId === l.id;
    const rowTotal = totalCol(vals);
    const priorTotal = sum(prior.map((v, w) => v ?? vals[w]));
    return (
      <tr key={l.id} className={'r-line' + (locked ? ' r-locked' : '') + (own ? ' r-own' : '')}>
        <th
          className={'lbl' + (lineSel ? ' sel' : '')}
          data-key={'row:' + l.id}
          onClick={() => dispatch({ type: 'select', sel: { kind: 'line', lineId: l.id }, tab: 'inspector' })}
        >
          <div className="lbl-in">
            <Avatar id={l.owner} size={16} />
            <span className="lbl-name" title={`${l.name}${l.detail ? ` (${l.detail})` : ''} · ${entityById[l.entity].name} · owner ${person[l.owner].name}`}>{l.name}</span>
            <span className="ent">{l.entity === 'SS' ? 'SS' : l.entity}</span>
            {locked && (
              <span className="lock-tag" title={`Locked by ${person[lock.holder!].name}`}>
                <LockIcon /> {person[lock.holder!].first}
              </span>
            )}
            {!locked && rowPres && rowPres !== 'helen' && (
              <span className="pres-tag" style={{ ['--c' as string]: person[rowPres].color }}>{person[rowPres].first}</span>
            )}
            {own && <span className="own-tag">yours</span>}
          </div>
        </th>
        {vals.map((v, w) => {
          const k = l.id + ':' + w;
          const p = prior[w];
          const changed = p == null ? false : p !== v;
          const pres = presenceAt.get(k);
          const fl = s.flash[k];
          const cls = [
            'c',
            changed && 'chg',
            cellInfo.unx.has(k) && 'unx',
            cellInfo.thr.has(k) && 'thr',
            isSel(l.id, w) && 'sel',
            PAYROLL_WEEKS.has(w) && 'pw',
            v < 0 && 'n',
          ].filter(Boolean).join(' ');
          let txt: string;
          if (s.viewMode === 'delta') txt = p == null ? '' : changed ? fmtDeltaK(v - p) : '';
          else txt = fmtK(v);
          return (
            <td
              key={w}
              className={cls}
              data-key={k}
              onClick={() => select(l.id, w)}
              onDoubleClick={() => tryEdit(l.id, w)}
              style={pres ? { ['--pc' as string]: person[pres].color } : undefined}
            >
              <span key={fl ?? 0} className={fl ? 'flash' : ''}>
                <span className={s.viewMode === 'delta' && changed ? (v - (p ?? 0) < 0 ? 'dn' : 'up') : ''}>{txt}</span>
              </span>
              {pres && <span className="pres-flag" style={{ background: person[pres].color }}>{person[pres].first}</span>}
            </td>
          );
        })}
        <td className="c tot">
          {s.viewMode === 'delta' ? (
            <span className={rowTotal - priorTotal < 0 ? 'dn' : rowTotal - priorTotal > 0 ? 'up' : ''}>{rowTotal === priorTotal ? '' : fmtDeltaK(rowTotal - priorTotal)}</span>
          ) : (
            fmtK(rowTotal)
          )}
        </td>
      </tr>
    );
  };

  const lowHead = bal.end.map((v) => v - FLOOR);

  return (
    <div className="grid-area">
      <div className="toolbar">
        <div className="seg" role="tablist">
          <button className={s.viewMode === 'values' ? 'on' : ''} onClick={() => dispatch({ type: 'viewMode', mode: 'values' })}>Values</button>
          <button className={s.viewMode === 'delta' ? 'on' : ''} onClick={() => dispatch({ type: 'viewMode', mode: 'delta' })}>Change vs v11</button>
        </div>
        <div className="seg">
          <button className={s.entity === 'all' ? 'on' : ''} onClick={() => dispatch({ type: 'entity', entity: 'all' })}>All entities</button>
          {ENTITIES.map((e) => (
            <button key={e.id} className={s.entity === e.id ? 'on' : ''} onClick={() => dispatch({ type: 'entity', entity: e.id })} title={e.name}>
              {e.short}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="legend-grid">
          <span><i className="k-chg" />Changed since v11</span>
          <span><i className="k-unx" />No note</span>
          <span><i className="k-thr" />Open thread</span>
          <span><i className="k-lck" />Locked</span>
        </div>
      </div>
      <div className="grid-wrap" ref={wrap} tabIndex={0} onKeyDown={onKey}>
        <table className="grid">
          <thead>
            <tr>
              <th className="lbl corner">
                <div className="corner-in">
                  <span>Cash line</span>
                  <span className="muted">$000s</span>
                </div>
              </th>
              {WEEKS.map((d, w) => (
                <th
                  key={w}
                  className={'wk' + (s.selection && 'week' in s.selection && s.selection.week === w ? ' wk-sel' : '')}
                  onClick={() => s.entity === 'all' && dispatch({ type: 'select', sel: { kind: 'balance', week: w }, tab: 'inspector' })}
                >
                  <div className="wk-n">Wk {w + 1}</div>
                  <div className="wk-d">{fmtDate(d)}</div>
                  <div className="wk-tags">
                    {PAYROLL_WEEKS.has(w) && <span className="tag-pr" title="Biweekly payroll (Friday)">PR</span>}
                    {WEEK_TAGS[w] && <span className="tag-hol" title={WEEK_TAGS[w]}>{WEEK_TAGS[w]}</span>}
                    {w === 12 && <span className="tag-new" title="Added at roll-forward; not in v11">new</span>}
                  </div>
                </th>
              ))}
              <th className="wk tot-h"><div className="wk-n">13-wk</div><div className="wk-d">total</div></th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((sec) => {
              const ls = lines.filter((l) => l.section === sec.id);
              if (!ls.length) return null;
              const sub = WEEKS.map((_, w) => sum(ls.map((l) => s.values[l.id][w])));
              const subPrior = WEEKS.map((_, w) => sum(ls.map((l) => V11[l.id][w] ?? s.values[l.id][w])));
              return [
                <tr key={sec.id} className="r-sec">
                  <th className="lbl">
                    <div className="lbl-in"><span className="sec-name">{sec.label}</span><span className="muted">{ls.length} line{ls.length > 1 ? 's' : ''}</span></div>
                  </th>
                  {sub.map((v, w) => (
                    <td key={w} className={'c' + (v < 0 ? ' n' : '')}>
                      {s.viewMode === 'delta' ? (w === 12 ? '' : v === subPrior[w] ? '' : <span className={v - subPrior[w] < 0 ? 'dn' : 'up'}>{fmtDeltaK(v - subPrior[w])}</span>) : fmtK(v)}
                    </td>
                  ))}
                  <td className="c tot">{s.viewMode === 'delta' ? '' : fmtK(sum(sub))}</td>
                </tr>,
                ...ls.map(renderLine),
              ];
            })}
          </tbody>
          <tfoot>
            <tr className="r-net">
              <th className="lbl"><div className="lbl-in"><span className="sec-name">Net cash flow{s.entity !== 'all' ? ` · ${entityById[s.entity].short}` : ''}</span></div></th>
              {flows.map((v, w) => <td key={w} className={'c' + (v < 0 ? ' n' : '')}>{fmtK(v)}</td>)}
              <td className="c tot">{fmtK(sum(flows))}</td>
            </tr>
            {s.entity === 'all' ? (
              <>
                <tr className="r-beg">
                  <th className="lbl"><div className="lbl-in"><span>Beginning balance</span><span className="muted">bank actual Nov 13</span></div></th>
                  {bal.begin.map((v, w) => <td key={w} className="c">{fmtK(v)}</td>)}
                  <td className="c tot" />
                </tr>
                <tr className="r-end">
                  <th className="lbl"><div className="lbl-in"><span className="sec-name">Ending balance</span></div></th>
                  {bal.end.map((v, w) => {
                    const k = 'END:' + w;
                    const sel = s.selection?.kind === 'balance' && s.selection.week === w;
                    const head = v - FLOOR;
                    return (
                      <td
                        key={w}
                        data-key={k}
                        className={'c' + (head < 0 ? ' breach' : head < WATCH_BAND ? ' tight' : '') + (sel ? ' sel' : '') + (cellInfo.thr.has(k) ? ' thr' : '')}
                        onClick={() => dispatch({ type: 'select', sel: { kind: 'balance', week: w }, tab: 'inspector' })}
                      >
                        {fmtK(v)}
                      </td>
                    );
                  })}
                  <td className="c tot" />
                </tr>
                <tr className="r-head">
                  <th className="lbl"><div className="lbl-in"><span>Headroom vs $25.0M floor</span></div></th>
                  {lowHead.map((v, w) => (
                    <td key={w} className={'c' + (v < 0 ? ' neg' : v < WATCH_BAND ? ' warnt' : ' muted')}>{v < 0 ? fmtK(v) : fmtK(v)}</td>
                  ))}
                  <td className="c tot" />
                </tr>
              </>
            ) : (
              <tr className="r-note">
                <th className="lbl" colSpan={1}><div className="lbl-in muted">Balances</div></th>
                <td colSpan={14} className="pooled">
                  Cash is pooled at the network level, so balances and the floor only apply to All entities.{' '}
                  <button className="link" onClick={() => dispatch({ type: 'entity', entity: 'all' })}>Show all entities</button>
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      {s.editing && <CellEditor key={s.editing.lineId + s.editing.week} lineId={s.editing.lineId} week={s.editing.week} container={wrap} />}
    </div>
  );
}

export function LockIcon() {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden>
      <rect x="0.5" y="4" width="8" height="5.5" rx="1" fill="currentColor" />
      <path d="M2.2 4V2.8a2.3 2.3 0 014.6 0V4" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
