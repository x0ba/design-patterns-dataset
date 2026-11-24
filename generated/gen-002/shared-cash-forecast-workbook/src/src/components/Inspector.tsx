import { useEffect, useRef, useState } from 'react';
import { FLOOR, V11, V11_OPENING, VERSIONS, WEEKS, entityById, lineById, person, type Thread } from '../data';
import { editBlockReason, useApp } from '../ctx';
import { V11_END, breachWeeks, bridge, delta, fmtDeltaK, fmtK, fmtM, fmtMoneyK, fmtTime, fmtWhen, sum, weekLabel, weekRange } from '../model';
import { Avatar } from './Avatar';
import { EditRow } from './EditRow';
import { ThreadView } from './Threads';

export function Inspector() {
  const { s } = useApp();
  const sel = s.selection;
  if (!sel)
    return (
      <div className="empty">
        <p>Select a cell to see who changed it, when and why.</p>
        <p className="muted">Click an ending balance to see what moved it since v11.</p>
      </div>
    );
  if (sel.kind === 'balance') return <BalanceInspector week={sel.week} />;
  if (sel.kind === 'line') return <LineInspector lineId={sel.lineId} />;
  return <CellInspector lineId={sel.lineId} week={sel.week} />;
}

function anchoredThreads(threads: Thread[], match: (t: Thread) => boolean) {
  return threads.filter(match).sort((a, b) => (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1));
}

function BalanceInspector({ week }: { week: number }) {
  const { s, bal, dispatch, askEditor, now } = useApp();
  const [showZero, setShowZero] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const v = bal.end[week];
  const v11 = V11_END[week];
  const br = bridge(s.edits, week);
  const max = Math.max(1, ...br.moving.map((i) => Math.abs(i.delta)), Math.abs(br.opening));
  const threads = anchoredThreads(s.threads, (t) => t.anchor.kind === 'balance' && t.anchor.week === week);
  const breaches = breachWeeks(bal.end);
  useEffect(() => {
    if (s.focusMitigation && ta.current) {
      ta.current.focus();
      ta.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [s.focusMitigation]);

  return (
    <div className="insp">
      <div className="insp-head">
        <div className="insp-kicker">Ending balance · consolidated</div>
        <div className="insp-title">{weekLabel(week)}</div>
        <div className="insp-big">
          <span className={v < FLOOR ? 'neg' : ''}>{fmtM(v)}</span>
          <span className={'chip ' + (v < FLOOR ? 'chip-bad' : 'chip-ok')}>{fmtM(v - FLOOR, true)} vs floor</span>
          {v11 != null && <span className="chip">{fmtM(v - v11, true)} vs v11</span>}
        </div>
      </div>

      {v11 == null ? (
        <p className="muted pad">Wk 13 was added at roll-forward, so there's no v11 figure to compare against.</p>
      ) : (
        <section className="sec">
          <h4>What moved wk {week + 1} since v11</h4>
          <div className="bridge">
            <div className="br-row br-end">
              <span>v11 published {fmtWhen(VERSIONS[0].published, now())}</span>
              <b>{fmtM(v11)}</b>
            </div>
            {br.opening !== 0 && (
              <div className="br-row">
                <div className="br-who"><span className="av av-sys">BK</span></div>
                <div className="br-main">
                  <div className="br-line">Opening balance: bank actual vs v11</div>
                  <div className="muted small">Nov 13 close {fmtK(V11_OPENING + br.opening)} vs {fmtK(V11_OPENING)} forecast</div>
                </div>
                <Bar v={br.opening} max={max} />
              </div>
            )}
            {br.moving.map((it) => {
              const l = lineById[it.lineId];
              const askId = it.by === 'aisha' ? 't-aisha' : 't-ask-' + it.by;
              const asked = s.threads.find((t) => t.id === askId);
              const notes = [...new Set(it.edits.map((e) => e.note).filter(Boolean))];
              return (
                <div
                  key={it.key}
                  className={'br-row clickable' + (it.missingNote ? ' br-unx' : '')}
                  onClick={() => dispatch({ type: 'select', sel: { kind: 'cell', lineId: it.lineId, week: it.edits[it.edits.length - 1].week } })}
                >
                  <div className="br-who"><Avatar id={it.by} size={20} /></div>
                  <div className="br-main">
                    <div className="br-line">
                      <b>{it.by === 'helen' ? 'You' : person[it.by].name}</b> · {l.name} <span className="ent">{entityById[l.entity].short}</span>
                    </div>
                    <div className="muted small">
                      {weekRange(it.weeks)} · {it.edits.length} edit{it.edits.length > 1 ? 's' : ''}, {fmtWhen(it.edits[it.edits.length - 1].at, now())}
                    </div>
                    {it.missingNote ? (
                      <div className="br-flag" onClick={(e) => e.stopPropagation()}>
                        <span className="badge-unx">No note</span>
                        {it.by !== 'helen' && (
                          <button className="link" onClick={() => askEditor(it.by)}>
                            {asked ? (asked.messages.some((m) => m.by === it.by) ? 'Read reply' : 'Open thread') : `Ask ${person[it.by].first} why`}
                          </button>
                        )}
                      </div>
                    ) : (
                      notes[0] && <div className="br-note">“{notes[0]}”{notes.length > 1 ? ` +${notes.length - 1} more` : ''}</div>
                    )}
                  </div>
                  <Bar v={it.delta} max={max} />
                </div>
              );
            })}
            {br.netZero.length > 0 && (
              <button className="br-row br-zero" onClick={() => setShowZero(!showZero)}>
                <span>{br.netZero.length} timing shift{br.netZero.length > 1 ? 's' : ''} net to $0 by wk {week + 1}</span>
                <span className="muted">{showZero ? 'Hide' : 'Show'}</span>
              </button>
            )}
            {showZero &&
              br.netZero.map((it) => (
                <div key={it.key} className="br-row br-sub" onClick={() => dispatch({ type: 'select', sel: { kind: 'cell', lineId: it.lineId, week: it.weeks[0] } })}>
                  <Avatar id={it.by} size={16} />
                  <span className="small">{lineById[it.lineId].name} <span className="ent">{entityById[lineById[it.lineId].entity].short}</span> · {weekRange(it.weeks)}</span>
                </div>
              ))}
            <div className="br-row br-end">
              <span>Draft v12, now</span>
              <b className={v < FLOOR ? 'neg' : ''}>{fmtM(v)}</b>
            </div>
          </div>
        </section>
      )}

      {breaches.length > 0 && (
        <section className="sec">
          <h4>Mitigation for Kathleen</h4>
          <p className="muted small pad">
            Goes into the sign-off memo. Kathleen won't publish a breach without the cause and the plan.
          </p>
          <textarea
            ref={ta}
            className="mitig"
            rows={4}
            value={s.floorNote}
            onChange={(e) => dispatch({ type: 'floorNote', text: e.target.value })}
            placeholder={`e.g. Wk ${breaches[0] + 1} dip is timing on Mercy Ridge collections (Epic scrubber outage). Plan: draw $X from the investment pool on Dec 17, reverse in wk 8 after the UPL wire.`}
          />
          <div className="levers">
            <span className="muted small">Lever you own:</span>
            <button
              className="btn btn-sm"
              disabled={!!editBlockReason(s, 'F4')}
              onClick={() => {
                dispatch({ type: 'select', sel: { kind: 'cell', lineId: 'F4', week: breaches[0] } });
                dispatch({ type: 'startEdit', cell: { lineId: 'F4', week: breaches[0] } });
              }}
            >
              Investment pool draw, wk {breaches[0] + 1}
            </button>
            <span className="muted small">needs {fmtMoneyK(FLOOR - bal.end[breaches[0]])} to clear</span>
          </div>
        </section>
      )}

      {threads.length > 0 && (
        <section className="sec">
          <h4>Threads on this balance</h4>
          {threads.map((t) => <ThreadView key={t.id} thread={t} inline />)}
        </section>
      )}
    </div>
  );
}

function Bar({ v, max }: { v: number; max: number }) {
  const w = Math.max(3, Math.round((Math.abs(v) / max) * 64));
  return (
    <div className="br-amt">
      <span className={v < 0 ? 'neg' : 'pos'}>{fmtMoneyK(v, true)}</span>
      <span className="br-bar"><i className={v < 0 ? 'b-neg' : 'b-pos'} style={{ width: w }} /></span>
    </div>
  );
}

function OwnerBlock({ lineId }: { lineId: string }) {
  const { s, dispatch } = useApp();
  const l = lineById[lineId];
  const why = editBlockReason(s, lineId);
  const o = person[l.owner];
  const lock = l.group === 'payroll' && s.payrollLock.holder ? s.payrollLock : null;
  return (
    <div className="owner">
      <div className="owner-row">
        <Avatar id={l.owner} size={26} />
        <div>
          <div><b>{l.owner === 'helen' ? 'You' : o.name}</b> <span className="muted">owner</span></div>
          <div className="muted small">{o.title}</div>
        </div>
        {l.backup && <div className="muted small backup">Backup: {person[l.backup].name}</div>}
      </div>
      {lock ? (
        <div className="perm perm-lock">
          <b>Locked by {person[lock.holder!].first}</b> since {fmtTime(lock.since)}. No one else can edit payroll lines until {person[lock.holder!].first} releases them.
        </div>
      ) : why ? (
        <div className="perm">{why}</div>
      ) : (
        <div className="perm perm-ok">You own this line. Double-click a week or press Enter to edit.</div>
      )}
      {!why && s.selection?.kind === 'cell' && (
        <button className="btn btn-sm btn-primary" onClick={() => dispatch({ type: 'startEdit', cell: { lineId, week: (s.selection as { week: number }).week } })}>
          Edit wk {(s.selection as { week: number }).week + 1}
        </button>
      )}
    </div>
  );
}

function CellInspector({ lineId, week }: { lineId: string; week: number }) {
  const { s, dispatch } = useApp();
  const l = lineById[lineId];
  const v = s.values[lineId][week];
  const p = V11[lineId][week];
  const edits = s.edits.filter((e) => e.lineId === lineId && e.week === week).slice().reverse();
  const threads = anchoredThreads(s.threads, (t) => t.anchor.kind === 'cell' && t.anchor.lineId === lineId && t.anchor.week === week);
  const here = Object.entries(s.presence).find(([, pr]) => pr && pr.lineId === lineId && pr.week === week);
  return (
    <div className="insp">
      <div className="insp-head">
        <div className="insp-kicker">{entityById[l.entity].name}{l.detail ? ` · ${l.detail}` : ''}</div>
        <div className="insp-title">{l.name}</div>
        <div className="muted">{weekLabel(week)}</div>
        <div className="vals3">
          <div><span className="muted small">Draft</span><b>{fmtK(v)}</b></div>
          <div><span className="muted small">v11</span><b>{p == null ? 'n/a' : fmtK(p)}</b></div>
          <div><span className="muted small">Change</span><b className={p != null && v - p < 0 ? 'neg' : p != null && v - p > 0 ? 'pos' : ''}>{p == null ? 'new wk' : fmtDeltaK(v - p)}</b></div>
        </div>
        {here && (
          <div className="here" style={{ ['--c' as string]: person[here[0]].color }}>
            <Avatar id={here[0]} size={16} /> {person[here[0]].first} is in this cell right now
          </div>
        )}
      </div>
      <OwnerBlock lineId={lineId} />
      <section className="sec">
        <h4>History since v11 <span className="muted">({edits.length})</span></h4>
        {edits.length === 0 ? <p className="muted small pad">Unchanged since v11.</p> : edits.map((e) => <EditRow key={e.id} e={e} showLine={false} />)}
      </section>
      <section className="sec">
        <h4>
          Threads
          {threads.length === 0 && (
            <button
              className="link right"
              onClick={() =>
                dispatch({
                  type: 'createThread',
                  thread: {
                    id: `t-c-${lineId}-${week}-${s.threads.length}`,
                    anchor: { kind: 'cell', lineId, week },
                    title: `${l.name}, wk ${week + 1}`,
                    status: 'open',
                    messages: [],
                  },
                })
              }
            >
              + Start a thread{l.owner !== 'helen' ? ` with ${person[l.owner].first}` : ''}
            </button>
          )}
        </h4>
        {threads.length === 0 ? <p className="muted small pad">No comments on this cell.</p> : threads.map((t) => <ThreadView key={t.id} thread={t} inline />)}
      </section>
    </div>
  );
}

function LineInspector({ lineId }: { lineId: string }) {
  const { s } = useApp();
  const l = lineById[lineId];
  const vals = s.values[lineId];
  const prior = V11[lineId];
  const edits = s.edits.filter((e) => e.lineId === lineId).slice().reverse();
  const tot = sum(vals);
  const ptot = sum(prior.slice(0, 12) as number[]);
  const all = [...vals, ...(prior.filter((x) => x != null) as number[])];
  const mn = Math.min(0, ...all), mx = Math.max(0, ...all);
  const W = 320, H = 70;
  const x = (w: number) => 6 + (w * (W - 12)) / 12;
  const y = (v: number) => 6 + ((mx - v) * (H - 12)) / (mx - mn || 1);
  const path = (a: (number | null)[]) => a.map((v, w) => (v == null ? '' : `${w ? 'L' : 'M'}${x(w)},${y(v)}`)).join(' ');
  return (
    <div className="insp">
      <div className="insp-head">
        <div className="insp-kicker">{entityById[l.entity].name}{l.detail ? ` · ${l.detail}` : ''}</div>
        <div className="insp-title">{l.name}</div>
        <div className="vals3">
          <div><span className="muted small">13-wk total</span><b>{fmtK(tot)}</b></div>
          <div><span className="muted small">Wks 1–12 vs v11</span><b className={sum(vals.slice(0, 12)) - ptot < 0 ? 'neg' : ''}>{fmtDeltaK(sum(vals.slice(0, 12)) - ptot)}</b></div>
          <div><span className="muted small">Edits</span><b>{edits.length}</b></div>
        </div>
        <svg width={W} height={H} className="spark">
          <line x1={6} x2={W - 6} y1={y(0)} y2={y(0)} className="grid-line" />
          <path d={path(prior)} className="v11-line" />
          <path d={path(vals)} className="cur-line" />
          {WEEKS.map((_, w) => <text key={w} x={x(w)} y={H} className="axis" textAnchor="middle">{w + 1}</text>)}
        </svg>
      </div>
      <OwnerBlock lineId={lineId} />
      <section className="sec">
        <h4>All edits on this line <span className="muted">({edits.length})</span></h4>
        {edits.length === 0 ? <p className="muted small pad">Unchanged since v11.</p> : edits.map((e) => <EditRow key={e.id} e={e} compact />)}
      </section>
      <p className="muted small pad">Net change from these edits: {fmtDeltaK(sum(edits.map(delta)))}</p>
    </div>
  );
}
