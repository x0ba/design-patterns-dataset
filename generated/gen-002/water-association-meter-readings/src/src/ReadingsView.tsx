import { Dispatch, Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BILLS_DUE, CONNECTIONS, CYCLE, Connection, Entry, ROUTES, Route } from './data';
import { Evaluation, evaluate, fmt, parseReading } from './logic';
import { Action, State } from './store';
import { Check, Chevron, Circle, Lock, Search, Stop, Warn } from './icons';
import ReviewPanel from './ReviewPanel';
import LockDialog from './LockDialog';

type Tab = 'all' | Route | 'review';

interface Props {
  state: State;
  evs: Record<string, Evaluation>;
  dispatch: Dispatch<Action>;
  onLocked: () => void;
  onOpenBills: () => void;
}

interface Toast {
  id: number;
  meter: string;
  text: string;
  flag: boolean;
}

/* ------------------------------------------------------------------ */
/* One row of the entry sheet                                          */
/* ------------------------------------------------------------------ */
interface RowProps {
  conn: Connection;
  entry: Entry;
  ev: Evaluation;
  locked: boolean;
  showRoute: boolean;
  open: boolean;
  onToggle: () => void;
  onCommit: (meter: string, value: number | null) => void;
  registerInput: (meter: string, el: HTMLInputElement | null) => void;
  move: (meter: string, dir: 1 | -1) => void;
}

function CheckCell({ conn, entry, ev, open, onToggle, locked }: { conn: Connection; entry: Entry; ev: Evaluation; open: boolean; onToggle: () => void; locked: boolean }) {
  if (!ev.entered) return <span className="check check--empty">Not entered yet</span>;
  const r = entry.resolution;

  if (ev.open && ev.main) {
    const err = ev.main.severity === 'error';
    return (
      <button className={`flagbtn flagbtn--${err ? 'error' : 'warn'}`} onClick={onToggle} aria-expanded={open} aria-controls={`panel-${conn.meter}`}>
        {err ? <Stop width={20} height={20} /> : <Warn width={20} height={20} />}
        <span className="flagbtn-text">
          <span>{ev.main.short}</span>
          <span className="flagbtn-act">{open ? 'Hide details' : 'Review'}</span>
        </span>
      </button>
    );
  }

  if (r) {
    const label = r.type === 'corrected' ? 'Corrected' : r.type === 'replaced' ? 'Meter swap counted' : 'Reviewed, kept';
    return (
      <div className="check-resolved">
        <button className="donebtn" onClick={onToggle} aria-expanded={open} aria-controls={`panel-${conn.meter}`} title={r.note}>
          <Check width={18} height={18} /> {label}
        </button>
        <span className="check-note" title={r.note}>
          {r.note}
        </span>
      </div>
    );
  }

  if (ev.flags.some((f) => f.code === 'replaced-ok')) {
    return (
      <span className="check check--ok">
        <Check width={18} height={18} /> New meter counted in
      </span>
    );
  }
  if (conn.status !== 'active') {
    return (
      <span className="check check--ok">
        <Check width={18} height={18} /> Near zero, as expected
      </span>
    );
  }
  void locked;
  return (
    <span className="check check--ok">
      <Check width={18} height={18} /> Looks normal
    </span>
  );
}

function Row({ conn, entry, ev, locked, showRoute, open, onToggle, onCommit, registerInput, move }: RowProps) {
  const committed = entry.reading != null ? fmt(entry.reading) : '';
  const [draft, setDraft] = useState(committed);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const caret = useRef<number | null>(null);

  useEffect(() => setDraft(committed), [committed]);
  useLayoutEffect(() => {
    if (caret.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });

  const draftNum = parseReading(draft);
  const dirty = draftNum !== entry.reading;
  // Live preview of use while typing (only when the number is already above last month's)
  const preview = dirty && draftNum != null && !ev.isReplaced && draftNum >= conn.prev ? draftNum - conn.prev : null;

  const commit = () => {
    if (dirty) onCommit(conn.meter, draftNum);
  };

  const state = !ev.entered ? 'empty' : ev.open ? (ev.main?.severity === 'error' ? 'error' : 'warn') : entry.resolution ? 'done' : 'ok';
  const route = ROUTES[conn.route];

  return (
    <tr id={`row-${conn.meter}`} className={`row row--${state} ${open ? 'row--open' : ''}`}>
      <td className="c-meter">
        <span className="meter-id mono">{conn.meter}</span>
        <span className="line-no">
          {showRoute ? `${route.short} · ` : ''}line {conn.line}
        </span>
      </td>
      <td className="c-member">
        <span className="member">{conn.member}</span>
        <span className="tags">
          {conn.status !== 'active' && <span className={`tag tag--${conn.status}`}>{conn.status === 'vacant' ? 'Vacant' : 'Seasonal'}</span>}
          {conn.replacedOn && <span className="tag tag--meter">New meter {conn.replacedOn}</span>}
          {conn.knownIssue && <span className="tag tag--issue">{conn.knownIssue.short}</span>}
        </span>
      </td>
      <td className="c-num mono">{fmt(conn.prev)}</td>
      <td className="c-num mono c-avg">{fmt(conn.avg)}</td>
      <td className="c-input">
        <input
          ref={(el) => {
            inputRef.current = el;
            registerInput(conn.meter, el);
          }}
          className={`numbox numbox--row ${state === 'error' ? 'numbox--error' : state === 'warn' ? 'numbox--warn' : ''}`}
          inputMode="numeric"
          autoComplete="off"
          readOnly={locked}
          aria-label={`New reading for ${conn.meter}, ${conn.member}`}
          value={draft}
          onChange={(e) => {
            const el = e.target;
            const pos = el.selectionStart ?? el.value.length;
            const digitsBefore = el.value.slice(0, pos).replace(/\D/g, '').length;
            const digits = el.value.replace(/\D/g, '').slice(0, 7);
            const formatted = digits ? fmt(parseInt(digits, 10)) : '';
            let p = 0;
            let seen = 0;
            while (p < formatted.length && seen < digitsBefore) {
              if (/\d/.test(formatted[p])) seen++;
              p++;
            }
            caret.current = p;
            setDraft(formatted);
          }}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || (e.key === 'ArrowDown' && !e.altKey)) {
              e.preventDefault();
              commit();
              move(conn.meter, 1);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              commit();
              move(conn.meter, -1);
            } else if (e.key === 'Escape') {
              setDraft(committed);
            }
          }}
        />
      </td>
      <td className="c-num c-usage">
        {preview != null ? (
          <span className="mono usage usage--preview" title="Not saved yet — press Enter">
            {fmt(preview)}
          </span>
        ) : ev.usage != null && !dirty ? (
          <span className="mono usage">{fmt(ev.usage)}</span>
        ) : (
          <span className="usage usage--none">—</span>
        )}
      </td>
      <td className="c-check">
        <CheckCell conn={conn} entry={entry} ev={ev} open={open} onToggle={onToggle} locked={locked} />
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* The whole readings screen                                           */
/* ------------------------------------------------------------------ */
export default function ReadingsView({ state, evs, dispatch, onLocked, onOpenBills }: Props) {
  const [tab, setTab] = useState<Tab>('creek');
  const [query, setQuery] = useState('');
  const [openMeter, setOpenMeter] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [jump, setJump] = useState<{ meter: string | null; focus: boolean; align: 'center' | 'start' } | null>(null);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const scroller = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const toastId = useRef(0);

  const locked = state.locked;

  // ---- counts ----
  const stats = useMemo(() => {
    const entered = CONNECTIONS.filter((c) => evs[c.meter].entered);
    const open = CONNECTIONS.filter((c) => evs[c.meter].open);
    const byRoute = (r: Route) => {
      const all = CONNECTIONS.filter((c) => c.route === r);
      return { total: all.length, done: all.filter((c) => evs[c.meter].entered).length };
    };
    const reviewed = CONNECTIONS.filter((c) => evs[c.meter].entered && !evs[c.meter].open && state.entries[c.meter].resolution).length;
    const next = CONNECTIONS.find((c) => !evs[c.meter].entered && c.route === 'creek') ?? CONNECTIONS.find((c) => !evs[c.meter].entered) ?? null;
    return { entered: entered.length, open, north: byRoute('north'), creek: byRoute('creek'), reviewed, next, remaining: CONNECTIONS.length - entered.length };
  }, [evs, state.entries]);

  // ---- rows on screen ----
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONNECTIONS.filter((c) => {
      if (tab === 'north' || tab === 'creek') {
        if (c.route !== tab) return false;
      } else if (tab === 'review') {
        if (!evs[c.meter].open) return false;
      }
      if (q && !(c.member.toLowerCase().includes(q) || c.meter.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [tab, query, evs]);

  // ---- jump / scroll handling ----
  useEffect(() => {
    if (!jump) return;
    const el = jump.meter ? document.getElementById(`row-${jump.meter}`) : null;
    if (el) {
      el.scrollIntoView({ block: jump.align, behavior: 'auto' });
      if (jump.focus) inputs.current.get(jump.meter!)?.focus({ preventScroll: true });
    } else if (scroller.current) {
      scroller.current.scrollTop = 0;
    }
    setJump(null);
  }, [jump]);

  // Opening position when the screen first appears: next empty line, cursor in the box.
  useEffect(() => {
    if (stats.next) setJump({ meter: stats.next.meter, focus: true, align: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeTab = (t: Tab) => {
    setTab(t);
    setOpenMeter(null);
    setQuery('');
    if (t === 'north' || t === 'creek') {
      const first = CONNECTIONS.find((c) => c.route === t && !evs[c.meter].entered);
      setJump({ meter: first?.meter ?? null, focus: !!first && !locked, align: 'center' });
    } else if (t === 'all') {
      setJump({ meter: stats.next?.meter ?? null, focus: false, align: 'center' });
    } else {
      setJump({ meter: null, focus: false, align: 'start' });
    }
  };

  const goTo = (meter: string, openPanel: boolean) => {
    const c = CONNECTIONS.find((x) => x.meter === meter)!;
    if (tab !== 'all' && tab !== 'review' && tab !== c.route) setTab(c.route);
    if (tab === 'review' && !evs[meter].open) setTab(c.route);
    setQuery('');
    setOpenMeter(openPanel ? meter : null);
    setJump({ meter, focus: !openPanel && !locked, align: openPanel ? 'start' : 'center' });
  };

  const registerInput = useCallback((meter: string, el: HTMLInputElement | null) => {
    if (el) inputs.current.set(meter, el);
    else inputs.current.delete(meter);
  }, []);

  const move = (meter: string, dir: 1 | -1) => {
    const i = rows.findIndex((r) => r.meter === meter);
    const target = rows[i + dir];
    if (!target) {
      if (dir === 1) showToast({ meter, text: 'That was the last line on this list.' }, false);
      return;
    }
    const el = inputs.current.get(target.meter);
    el?.focus({ preventScroll: true });
    // keep the active row clear of the sticky header
    document.getElementById(`row-${target.meter}`)?.scrollIntoView({ block: 'nearest' });
  };

  const showToast = (t: { meter: string; text: string }, flag: boolean) => {
    window.clearTimeout(toastTimer.current);
    toastId.current += 1;
    setToast({ ...t, id: toastId.current, flag });
    toastTimer.current = window.setTimeout(() => setToast(null), flag ? 9000 : 3500);
  };

  const onCommit = (meter: string, value: number | null) => {
    dispatch({ type: 'setReading', meter, value });
    const c = CONNECTIONS.find((x) => x.meter === meter)!;
    if (openMeter === meter) setOpenMeter(null);
    if (value == null) return;
    // Preview the result so we can tell Gordon right away if the reading looks wrong.
    const e = state.entries[meter];
    const probe = { ...e, reading: value, confirmedKey: null };
    const r = evaluate(c, probe);
    if (r.open && r.main) showToast({ meter, text: `${c.member.split(',')[0]} (${meter}): ${r.main.short.toLowerCase()}` }, true);
    else setToast((cur) => (cur && cur.flag ? null : cur));
  };

  // Close the review panel with Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openMeter && !lockOpen) setOpenMeter(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [openMeter, lockOpen]);

  const readyToLock = stats.remaining === 0 && stats.open.length === 0;
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All routes', count: CONNECTIONS.length },
    { id: 'north', label: 'North Ridge', count: 31 },
    { id: 'creek', label: 'Creek Road', count: 27 },
    { id: 'review', label: 'Needs review', count: stats.open.length },
  ];

  const routeInfo = tab === 'north' || tab === 'creek' ? ROUTES[tab] : null;

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1>Enter meter readings</h1>
          <p className="page-sub">
            Billing cycle <b>{CYCLE.label}</b> · type each number from the paper sheets
          </p>
        </div>
        <div className="deadline" title="Bills are due out to members by this date">
          <span className="deadline-label">Bills go out</span>
          <span className="deadline-date">{BILLS_DUE.label}</span>
          <span className="deadline-left">{BILLS_DUE.daysLeft} days left</span>
        </div>
      </div>

      {locked && (
        <div className="banner banner--locked" role="status">
          <Lock width={22} height={22} />
          <div>
            <b>This cycle is locked ({state.lockedOn}).</b> Readings are final and the bills are ready.
          </div>
          <button className="btn btn--primary" onClick={onOpenBills}>
            Go to bills
          </button>
          <button
            className="btn"
            onClick={() => {
              if (window.confirm('Reopen the cycle for changes? Bills will go back to draft until you lock it again.')) dispatch({ type: 'unlock' });
            }}
          >
            Reopen cycle
          </button>
        </div>
      )}

      <div className="layout">
        <section className="sheet" aria-label="Meter reading sheet">
          <div className="toolbar">
            <div className="tabs" role="tablist" aria-label="Which meters to show">
              {tabs.map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'tab--on' : ''} ${t.id === 'review' && t.count > 0 ? 'tab--alert' : ''}`} onClick={() => changeTab(t.id)}>
                  {t.label} <span className="tab-count">{t.count}</span>
                </button>
              ))}
            </div>
            <label className="search">
              <Search width={18} height={18} />
              <input type="search" placeholder="Find a name or meter" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a member name or meter number" />
            </label>
          </div>

          {routeInfo && (
            <div className="sheetinfo">
              Paper sheet for <b>{routeInfo.name}</b> — read by <b>{routeInfo.reader}</b> on {routeInfo.readOn}
            </div>
          )}
          <div className="scroller" ref={scroller}>
            <table className="grid">
              <caption className="sr-only">Meter readings for the October 15 to November 15 cycle</caption>
              <thead>
                <tr>
                  <th className="c-meter">Meter</th>
                  <th className="c-member">Member</th>
                  <th className="c-num">
                    Previous reading <small>Oct 15</small>
                  </th>
                  <th className="c-num">
                    12-mo average <small>gal / month</small>
                  </th>
                  <th className="c-input">
                    New reading <small>from paper sheet</small>
                  </th>
                  <th className="c-num">
                    Use <small>gallons</small>
                  </th>
                  <th className="c-check">Check</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const entry = state.entries[c.meter];
                  const ev = evs[c.meter];
                  const isOpen = openMeter === c.meter;
                  return (
                    <Fragment key={c.meter}>
                      <Row conn={c} entry={entry} ev={ev} locked={locked} showRoute={tab === 'all' || tab === 'review'} open={isOpen} onToggle={() => setOpenMeter(isOpen ? null : c.meter)} onCommit={onCommit} registerInput={registerInput} move={move} />
                      {isOpen && (
                        <tr className="panel-row" id={`panel-${c.meter}`}>
                          <td colSpan={7}>
                            <ReviewPanel conn={c} entry={entry} ev={ev} locked={locked} dispatch={dispatch} onClose={() => setOpenMeter(null)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty">
                      {tab === 'review' ? (
                        <>
                          <Check width={28} height={28} className="ico-ok" />
                          <p>Nothing needs review right now.</p>
                        </>
                      ) : (
                        <p>No member or meter matches “{query}”.</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="statusbar" aria-live="polite">
            {toast ? (
              <div className={`status ${toast.flag ? 'status--flag' : ''}`} role="status">
                {toast.flag && <Warn width={20} height={20} />}
                <span>{toast.text}</span>
                {toast.flag && (
                  <button
                    className="status-btn"
                    onClick={() => {
                      goTo(toast.meter, true);
                      setToast(null);
                    }}
                  >
                    Review now
                  </button>
                )}
              </div>
            ) : (
              <div className="status status--hint">
                <kbd>Enter</kbd> saves and moves to the next line · <kbd>↑</kbd> <kbd>↓</kbd> move between lines · <kbd>Esc</kbd> undoes what you just typed
              </div>
            )}
          </div>
        </section>

        {/* -------------------------------- side rail -------------------------------- */}
        <aside className="rail" aria-label="Cycle progress">
          <section className="card">
            <p className="big">
              <span className="mono">{stats.entered}</span> <span className="big-of">of {CONNECTIONS.length} readings entered</span>
            </p>
            <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={CONNECTIONS.length} aria-valuenow={stats.entered} aria-label="Readings entered">
              <div className="bar-fill" style={{ width: `${(stats.entered / CONNECTIONS.length) * 100}%` }} />
            </div>
            <ul className="routes">
              {(['north', 'creek'] as Route[]).map((r) => {
                const s = stats[r];
                const done = s.done === s.total;
                return (
                  <li key={r}>
                    <button className="routebtn" onClick={() => changeTab(r)}>
                      <span className="routebtn-name">
                        {ROUTES[r].name} <small>{ROUTES[r].reader}</small>
                      </span>
                      <span className={`routebtn-count ${done ? 'is-done' : ''}`}>
                        {done && <Check width={16} height={16} />}
                        <span className="mono">
                          {s.done}/{s.total}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {stats.next && !locked && (
              <button className="nextbtn" onClick={() => goTo(stats.next!.meter, false)}>
                <span className="nextbtn-label">Next to enter</span>
                <span className="nextbtn-what">
                  {stats.next.member.split(',')[0]} · {ROUTES[stats.next.route].short} line {stats.next.line}
                </span>
                <Chevron width={18} height={18} />
              </button>
            )}
          </section>

          <section className="card card--grow">
            <h2 className="card-title">
              Needs your review
              <span className={`count ${stats.open.length ? 'count--alert' : 'count--ok'}`}>{stats.open.length}</span>
            </h2>
            {stats.open.length === 0 ? (
              <p className="muted">
                <Check width={18} height={18} className="ico-ok" /> Nothing flagged. {stats.reviewed > 0 && `${stats.reviewed} reviewed.`}
              </p>
            ) : (
              <ul className="attn">
                {stats.open.map((c) => {
                  const ev = evs[c.meter];
                  const err = ev.main?.severity === 'error';
                  return (
                    <li key={c.meter}>
                      <button className={`attn-item ${err ? 'attn-item--error' : ''}`} onClick={() => goTo(c.meter, true)}>
                        {err ? <Stop width={20} height={20} /> : <Warn width={20} height={20} />}
                        <span className="attn-text">
                          <span className="attn-who">
                            <span className="mono">{c.meter}</span> {c.member.split(',')[0]}
                          </span>
                          <span className="attn-why">{ev.main?.short}</span>
                        </span>
                        <Chevron width={18} height={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card card--lock">
            <h2 className="card-title">Lock the cycle</h2>
            <ul className="checklist">
              <li className={stats.remaining === 0 ? 'is-done' : ''}>
                {stats.remaining === 0 ? <Check width={20} height={20} /> : <Circle width={20} height={20} />}
                {stats.remaining === 0 ? 'All 58 readings entered' : `${stats.remaining} readings still to enter`}
              </li>
              <li className={stats.open.length === 0 ? 'is-done' : ''}>
                {stats.open.length === 0 ? <Check width={20} height={20} /> : <Circle width={20} height={20} />}
                {stats.open.length === 0 ? 'No flags left to review' : `${stats.open.length} ${stats.open.length === 1 ? 'flag' : 'flags'} still to review`}
              </li>
            </ul>
            {locked ? (
              <button className="btn btn--lock" onClick={onOpenBills}>
                <Lock width={20} height={20} /> Locked — see bills
              </button>
            ) : (
              <button className="btn btn--lock" aria-disabled={!readyToLock} onClick={() => readyToLock && setLockOpen(true)}>
                <Lock width={20} height={20} /> Lock cycle
              </button>
            )}
            <p className="hint">{readyToLock || locked ? 'You’ll get a final check before anything locks.' : 'Available once both items above are done.'}</p>
          </section>
        </aside>
      </div>

      {lockOpen && (
        <LockDialog
          state={state}
          evs={evs}
          onCancel={() => setLockOpen(false)}
          onConfirm={() => {
            dispatch({ type: 'lock' });
            setLockOpen(false);
            onLocked();
          }}
        />
      )}
    </div>
  );
}
