import { useEffect, useRef, useState } from 'react';
import { CLIENT, POOL, RECIPES, SLOTS, SLOT_HINT, SLOT_LABEL, Slot } from './data';
import { Issue, RULES, dayTotals, itemChecks, leftoverOf } from './logic';
import { DayState, useStore } from './store';
import {
  IAlert, IBook, ICheck, IChevron, IChevronR, IClock, ILeftover, IQuestion, IRuler, ISpark, ISwap, IUndo, IX,
} from './icons';

export function PlanView() {
  return (
    <div className="plan">
      <DayRail />
      <DayView />
    </div>
  );
}

function dayBadge(d: DayState, open: Issue[]) {
  if (d.status === 'queued') return <span className="rb rb-queued">Not drafted</span>;
  if (d.status === 'drafting') return <span className="rb rb-drafting"><span className="spin" /> Drafting</span>;
  if (d.status === 'redrafting') return <span className="rb rb-drafting"><span className="spin" /> Redrafting</span>;
  if (d.status === 'accepted') return <span className="rb rb-ok"><ICheck size={12} /> Accepted</span>;
  const hard = open.filter((x) => !x.pending).length;
  const pend = open.filter((x) => x.pending).length;
  return (
    <span className="rb-group">
      {hard > 0 && <span className="rb rb-bad"><IAlert size={11} /> {hard}</span>}
      {pend > 0 && <span className="rb rb-pend"><IQuestion size={11} /> {pend}</span>}
      {hard === 0 && pend === 0 && <span className="rb rb-review">Ready</span>}
    </span>
  );
}

function DayRail() {
  const { days, selected, setSelected, setExpanded, openIssues, readiness, go } = useStore();
  const allOpen = days.flatMap((d) => openIssues(d.def.n));
  const hard = allOpen.filter((x) => !x.pending);
  const pend = allOpen.filter((x) => x.pending);
  const drafted = days.filter((d) => d.status !== 'queued' && d.status !== 'drafting').length;
  const nextIssue = () => {
    const after = hard.find((x) => x.day > selected) || hard[0] || pend[0];
    if (after) go(after.day, after.slot === 'day' ? undefined : after.slot);
  };
  const row = (d: DayState) => {
    const open = openIssues(d.def.n);
    return (
      <button
        key={d.def.n}
        className={`rail-row ${selected === d.def.n ? 'is-sel' : ''} st-${d.status}`}
        onClick={() => {
          setSelected(d.def.n);
          setExpanded(null);
        }}
      >
        <span className="rr-n">Day {d.def.n}</span>
        <span className="rr-d">
          {d.def.dow} {d.def.date.split(' ')[1]}
          {d.def.note === 'Thanksgiving' && <span className="rr-hol" title="Thanksgiving">●</span>}
        </span>
        <span className="rr-b">{dayBadge(d, open)}</span>
      </button>
    );
  };
  return (
    <aside className="rail">
      <div className="rail-sum">
        <div className="rs-line">
          <span className="rs-big">{readiness.accepted}</span>
          <span className="rs-of">of 14 days accepted</span>
        </div>
        <div className="rs-bar">
          <span className="rs-acc" style={{ width: `${(readiness.accepted / 14) * 100}%` }} />
          <span className="rs-dr" style={{ width: `${((drafted - readiness.accepted) / 14) * 100}%` }} />
        </div>
        <div className="rs-meta">{drafted} drafted · {14 - drafted} to go</div>
        {hard.length > 0 || pend.length > 0 ? (
          <button className="rs-issues" onClick={nextIssue}>
            {hard.length > 0 && <span className="t-bad"><IAlert size={13} /> {hard.length} to resolve</span>}
            {pend.length > 0 && <span className="t-pend"><IQuestion size={13} /> {pend.length} waiting on answer</span>}
            <span className="rs-next">Next <IChevronR size={13} /></span>
          </button>
        ) : (
          <div className="rs-clean"><ICheck size={13} /> No open issues</div>
        )}
      </div>
      <div className="rail-list">
        <div className="rail-week">Week 1 <span>Nov 23 – 29</span></div>
        {days.slice(0, 7).map(row)}
        <div className="rail-week">Week 2 <span>Nov 30 – Dec 6</span></div>
        {days.slice(7).map(row)}
      </div>
    </aside>
  );
}

function DayView() {
  const s = useStore();
  const { days, selected, setSelected, setExpanded, issuesByDay, overrides, accept, reopen } = s;
  const idx = days.findIndex((d) => d.def.n === selected);
  const d = days[idx];
  const [rejecting, setRejecting] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setRejecting(false);
    scroller.current?.scrollTo({ top: 0 });
  }, [selected]);

  if (d.status === 'queued' || d.status === 'drafting') {
    return (
      <section className="dayview" ref={scroller}>
        <DayHead d={d} idx={idx} setSelected={setSelected} />
        <div className="empty-day">
          {d.status === 'drafting' ? (
            <>
              <div className="ed-spin"><span className="spin big" /></div>
              <h3>The assistant is drafting Day {d.def.n}</h3>
              <p>It’ll appear here when it’s ready for review.</p>
            </>
          ) : (
            <>
              <div className="ed-icon"><ISpark size={26} /></div>
              <h3>Day {d.def.n} isn’t drafted yet</h3>
              <p>
                {s.yog === null
                  ? 'The assistant paused after Day 9 and is waiting for your answer about lactose-free yogurt. Days 10–14 are drafted once you answer.'
                  : 'Queued — the assistant will draft this day shortly.'}
              </p>
              {s.yog === null && <p className="ed-hint">Answer in the assistant panel on the right →</p>}
            </>
          )}
          <div className="ghost-slots">
            {SLOTS.map((sl) => (
              <div key={sl} className="ghost-slot">
                <span>{SLOT_LABEL[sl]}</span>
                <i />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const issues = issuesByDay[d.def.n] || [];
  const open = issues.filter((x) => !overrides[x.key]);
  const kept = issues.filter((x) => overrides[x.key]);
  const blocking = open.length;
  const redrafting = d.status === 'redrafting';

  return (
    <section className="dayview" ref={scroller}>
      <DayHead d={d} idx={idx} setSelected={setSelected}>
        {d.status === 'accepted' ? (
          <>
            <span className="acc-pill"><ICheck size={14} /> Accepted</span>
            <button className="btn btn-ghost" onClick={() => reopen(d.def.n)}>Reopen</button>
          </>
        ) : (
          <>
            <button className="btn btn-quiet" disabled={redrafting} onClick={() => setRejecting((v) => !v)}>
              <IX size={14} /> Reject day…
            </button>
            <button
              className="btn btn-primary"
              disabled={blocking > 0 || redrafting}
              title={blocking ? `Resolve ${blocking} open issue${blocking > 1 ? 's' : ''} first` : 'Accept this day'}
              onClick={() => accept(d.def.n)}
            >
              <ICheck size={14} /> Accept day
            </button>
          </>
        )}
      </DayHead>
      {blocking > 0 && d.status === 'review' && (
        <div className="block-note">
          <IAlert size={13} /> Accept is locked until {blocking === 1 ? 'this issue is' : `these ${blocking} issues are`} resolved or kept with a note.
        </div>
      )}
      {rejecting && <RejectPanel n={d.def.n} onClose={() => setRejecting(false)} />}
      {redrafting && (
        <div className="redraft-note">
          <span className="spin" /> The assistant is redrafting this day from your note…
        </div>
      )}
      <Totals d={d} />
      {(open.length > 0 || kept.length > 0) && (
        <div className="issues">
          {open.map((x) => (
            <IssueCard key={x.key} iss={x} />
          ))}
          {kept.map((x) => (
            <KeptCard key={x.key} iss={x} />
          ))}
        </div>
      )}
      <div className={`items ${redrafting ? 'is-dim' : ''}`}>
        {SLOTS.map((sl) => (
          <ItemRow key={sl} d={d} idx={idx} slot={sl} issues={open.filter((x) => x.slot === sl)} />
        ))}
      </div>
      <p className="foot-note">
        Every item is checked against Tom’s intake record (Nov 10), your targets (Nov 12) and your standing
        instructions. Click an item to see its source, servings and checks.
      </p>
    </section>
  );
}

function DayHead({ d, idx, setSelected, children }: { d: DayState; idx: number; setSelected: (n: number) => void; children?: React.ReactNode }) {
  const full: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
  return (
    <header className="day-head">
      <div className="dh-main">
        <div className="eyebrow">
          Week {d.def.n <= 7 ? 1 : 2} · Day {d.def.n} of 14{d.version > 1 ? ` · version ${d.version}` : ''}
        </div>
        <h2>
          {full[d.def.dow]}, {d.def.date}
        </h2>
        <div className="dh-tags">
          {d.def.weekday ? (
            <span className="tag"><IClock size={12} /> Weekday · 30-min rule applies</span>
          ) : (
            <span className="tag tag-soft">Weekend · batch-cook day</span>
          )}
          {d.def.note && <span className={`tag ${d.def.note === 'Thanksgiving' ? 'tag-hol' : 'tag-soft'}`}>{d.def.note}</span>}
        </div>
      </div>
      <div className="dh-actions">
        {children}
        <div className="dh-nav">
        <button className="icon-btn" disabled={idx === 0} onClick={() => setSelected(d.def.n - 1)} aria-label="Previous day">
          <IChevron size={16} className="rot90" />
        </button>
        <button className="icon-btn" disabled={idx === 13} onClick={() => setSelected(d.def.n + 1)} aria-label="Next day">
          <IChevron size={16} className="rot-90" />
        </button>
        </div>
      </div>
    </header>
  );
}

function Totals({ d }: { d: DayState }) {
  const t = dayTotals(d.def);
  const T = CLIENT.targets;
  const kOk = Math.abs(t.kcal - T.kcal) / T.kcal <= 0.05;
  const pOk = t.p >= T.protein * 0.95;
  const fState = t.fib < T.fibMin ? 'bad' : t.fib > T.fibMax ? 'warn' : 'ok';
  const mains = [t.carbs.breakfast, t.carbs.lunch, t.carbs.dinner];
  const ratio = Math.max(...mains) / Math.min(...mains);
  const cOk = ratio <= 1.45;
  const max = 80;
  return (
    <div className="totals">
      <Metric label="Energy" value={t.kcal.toLocaleString()} unit="kcal" target={`target ${T.kcal.toLocaleString()}`} state={kOk ? 'ok' : 'warn'} />
      <Metric label="Protein" value={String(t.p)} unit="g" target={`target ${T.protein} g`} state={pOk ? 'ok' : 'warn'} />
      <Metric label="Fiber" value={String(t.fib)} unit="g" target={`target ${T.fibMin}–${T.fibMax} g`} state={fState} />
      <div className={`metric metric-carbs st-${cOk ? 'ok' : 'warn'}`}>
        <div className="m-label">Carb spread <span className="m-sub">{t.c} g/day · {cOk ? 'even' : 'uneven'}</span>{cOk ? <ICheck size={12} className="m-ic" /> : <IAlert size={12} className="m-ic" />}</div>
        <div className="carb-bars">
          {SLOTS.map((s) => (
            <div key={s} className="cb" title={`${SLOT_LABEL[s]}: ${t.carbs[s]} g carbs`}>
              <div className="cb-col">
                <span className={`cb-fill ${s.startsWith('snack') ? 'is-snack' : ''}`} style={{ height: `${Math.min(100, (t.carbs[s] / max) * 100)}%` }} />
              </div>
              <span className="cb-g">{t.carbs[s]}</span>
              <span className="cb-l">{s === 'breakfast' ? 'B' : s === 'lunch' ? 'L' : s === 'dinner' ? 'D' : 'S'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="metric metric-cost">
        <div className="m-label">Food cost</div>
        <div className="m-val">${t.cost.toFixed(2)}<span className="m-unit">/day</span></div>
        <div className="m-target">≈ ${(t.cost * 7).toFixed(0)} / week</div>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, target, state }: { label: string; value: string; unit: string; target: string; state: string }) {
  return (
    <div className={`metric st-${state}`}>
      <div className="m-label">
        {label}
        {state === 'ok' ? <ICheck size={12} className="m-ic" /> : <IAlert size={12} className="m-ic" />}
      </div>
      <div className="m-val">
        {value}
        <span className="m-unit">{unit}</span>
      </div>
      <div className="m-target">{target}</div>
    </div>
  );
}

function IssueCard({ iss }: { iss: Issue }) {
  const { applyFix, override, go, setExpanded } = useStore();
  const [keeping, setKeeping] = useState(false);
  const [note, setNote] = useState('');
  if (iss.pending) {
    return (
      <div className="issue is-pend">
        <IQuestion size={16} className="iss-ic" />
        <div className="iss-body">
          <div className="iss-title">{iss.title}</div>
          <div className="iss-detail">{iss.detail}</div>
        </div>
        <button
          className="btn btn-quiet btn-sm"
          onClick={() => {
            const el = document.getElementById('yog-question');
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.classList.remove('flash');
            void el?.offsetWidth;
            el?.classList.add('flash');
          }}
        >
          Answer question →
        </button>
      </div>
    );
  }
  return (
    <div className={`issue ${iss.by === 'record' ? 'is-missed' : ''}`}>
      <IAlert size={16} className="iss-ic" />
      <div className="iss-body">
        <div className="iss-title">
          {iss.title}
          {iss.rule === 'yogurt' ? (
            <span className="by by-ai"><ISpark size={11} /> Swap proposed by assistant</span>
          ) : iss.by === 'assistant' ? (
            <span className="by by-ai"><ISpark size={11} /> Flagged by assistant</span>
          ) : (
            <span className="by by-rec"><IRuler size={11} /> Caught by record check · not flagged by assistant</span>
          )}
        </div>
        <div className="iss-detail">{iss.detail}</div>
        {keeping ? (
          <div className="keep-row">
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={iss.rule === 'time' ? 'e.g. Only 15 min hands-on — fine for Tom' : 'Why keep it? (saved on the plan)'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') override(iss, note.trim());
                if (e.key === 'Escape') setKeeping(false);
              }}
            />
            <button className="btn btn-sm btn-dark" onClick={() => override(iss, note.trim())}>Keep with note</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setKeeping(false)}>Cancel</button>
          </div>
        ) : (
          <div className="iss-actions">
            {iss.fix && (
              <button className="btn btn-sm btn-fix" onClick={() => applyFix(iss)}>
                <ISwap size={13} /> {iss.fix.label}
              </button>
            )}
            <button className="btn btn-sm btn-ghost" onClick={() => setKeeping(true)}>Keep anyway…</button>
            {iss.slot !== 'day' && (
              <button className="btn btn-sm btn-link" onClick={() => { go(iss.day, iss.slot as Slot); setTimeout(() => document.getElementById(`item-${iss.day}-${iss.slot}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 30); }}>
                See sources
              </button>
            )}
            {iss.slot === 'day' && iss.fix && (
              <button className="btn btn-sm btn-link" onClick={() => setExpanded(`${iss.day}:${iss.fix!.slot}`)}>
                See {SLOT_LABEL[iss.fix.slot].toLowerCase()}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KeptCard({ iss }: { iss: Issue }) {
  const { overrides, clearOverride } = useStore();
  return (
    <div className="issue is-kept">
      <ICheck size={15} className="iss-ic" />
      <div className="iss-body">
        <div className="iss-title">
          {iss.title} <span className="by by-kept">Kept by you</span>
        </div>
        <div className="iss-detail">“{overrides[iss.key]}”</div>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={() => clearOverride(iss.key)}>
        <IUndo size={13} /> Reopen
      </button>
    </div>
  );
}

function RejectPanel({ n, onClose }: { n: number; onClose: () => void }) {
  const { reject } = useStore();
  const [note, setNote] = useState('');
  const chips = ['Too much prep for a shift day', 'Swap the dinner', 'Too similar to the day before', 'Less tofu — he’s unsure about it', 'More filling breakfast'];
  return (
    <div className="reject">
      <div className="rj-title">What should change on Day {n}?</div>
      <div className="rj-sub">The assistant redrafts the day from your note and runs the record check again. Name a meal to change only that one.</div>
      <div className="chips">
        {chips.map((c) => (
          <button key={c} className="chip" onClick={() => setNote((v) => (v ? `${v}. ${c}` : c))}>{c}</button>
        ))}
      </div>
      <textarea autoFocus rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Swap the dinner — he’s on a late shift that night" />
      <div className="rj-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-dark btn-sm"
          disabled={!note.trim()}
          onClick={() => {
            reject(n, note.trim());
            onClose();
          }}
        >
          Reject &amp; send to assistant
        </button>
      </div>
    </div>
  );
}

function ItemRow({ d, idx, slot, issues }: { d: DayState; idx: number; slot: Slot; issues: Issue[] }) {
  const { expanded, setExpanded, defs, ctx, swapSlot } = useStore();
  const key = `${d.def.n}:${slot}`;
  const open = expanded === key;
  const r = RECIPES[d.def.slots[slot]];
  const lo = leftoverOf(defs, idx, slot);
  const checks = itemChecks(r, d.def, lo, ctx);
  const fails = issues.filter((x) => !x.pending);
  const pend = issues.filter((x) => x.pending);
  const state = fails.length ? 'bad' : pend.length ? 'pend' : 'ok';
  const src = r.src;

  return (
    <div className={`item st-${state} ${open ? 'is-open' : ''}`} id={`item-${d.def.n}-${slot}`}>
      <button className="item-row" onClick={() => setExpanded(open ? null : key)} aria-expanded={open}>
        <div className="it-slot">
          <span className="it-slot-l">{SLOT_LABEL[slot]}</span>
          <span className="it-slot-h">{SLOT_HINT[slot]}</span>
        </div>
        <div className="it-main">
          <div className="it-name">{r.name}</div>
          <div className="it-meta">
            <span className={`src src-${src.kind}`}>
              {src.kind === 'bank' ? <IBook size={12} /> : <IRuler size={12} />}
              {src.code}
              <span className="src-k">{src.kind === 'bank' ? 'Recipe bank' : 'Serving reference'}</span>
            </span>
            {lo ? (
              <span className="meta"><ILeftover size={12} /> Leftover · Day {lo} dinner</span>
            ) : (
              <span className={`meta ${d.def.weekday && r.total > 30 ? 'meta-bad' : ''}`}><IClock size={12} /> {r.total} min</span>
            )}
            {fails.map((x) => (
              <span key={x.key} className="meta meta-bad"><IAlert size={12} /> {x.rule === 'allergy' ? 'Possible cashew' : x.rule === 'fodmap' ? 'High FODMAP' : x.rule === 'time' ? 'Over 30 min' : x.rule === 'yogurt' ? 'Yogurt' : 'Check'}</span>
            ))}
            {pend.map((x) => (
              <span key={x.key} className="meta meta-pend"><IQuestion size={12} /> Yogurt — awaiting answer</span>
            ))}
          </div>
        </div>
        <div className="it-mac">
          <span><b>{r.kcal}</b> kcal</span>
          <span><b>{r.p}</b> g P</span>
          <span><b>{r.c}</b> g C</span>
          <span><b>{r.fib}</b> g fiber</span>
        </div>
        <div className="it-state">
          {state === 'ok' ? <ICheck size={15} /> : state === 'pend' ? <IQuestion size={15} /> : <IAlert size={15} />}
          <IChevron size={15} className={`it-chev ${open ? 'is-up' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="item-detail">
          <div className="id-col">
            <div className="id-h">Ingredients &amp; servings used</div>
            <table className="ing">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Used</th>
                  <th>FODMAP reference</th>
                </tr>
              </thead>
              <tbody>
                {r.ing.map((x, k) => (
                  <tr key={k} className={`f-${x.f}`}>
                    <td>
                      {x.n}
                      {x.tags?.includes('treenut-maybe') && <span className="ing-flag">may contain cashew</span>}
                      {x.tags?.includes('lfy') && <span className="ing-flag ing-flag-pend">yogurt question</span>}
                    </td>
                    <td className="num">{x.amt}</td>
                    <td>
                      <span className={`fdot f-${x.f}`} />
                      <span className="ref-code">{x.code}</span> {x.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="id-why">
              <ISpark size={13} />
              <div>
                <b>Assistant’s reasoning: </b>
                {r.why}
              </div>
            </div>
          </div>
          <div className="id-side">
            <div className="id-h">Source</div>
            <div className="src-card">
              {src.kind === 'bank' ? (
                <>
                  <div className="sc-top"><IBook size={14} /> <b>{src.code}</b> · Practice recipe bank</div>
                  <div className="sc-name">{r.name}</div>
                  <div className="sc-meta">{src.rev} · {r.active} min hands-on, {r.total} min total · ${r.cost.toFixed(2)}/serving</div>
                  <div className="sc-tags">
                    {src.tags.map((t) => (
                      <span key={t} className="mini-tag">{t}</span>
                    ))}
                    {!src.tags.includes('Low-FODMAP') && <span className="mini-tag mini-bad">Not tagged low-FODMAP</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="sc-top"><IRuler size={14} /> <b>FODMAP serving reference</b></div>
                  <div className="sc-name">Built from reference servings — not a bank recipe</div>
                  <div className="sc-meta">Entries: {[...new Set(r.ing.map((x) => x.code).filter(Boolean))].join(', ')} · ${r.cost.toFixed(2)}/serving</div>
                </>
              )}
            </div>
            <div className="id-h">Checked against Tom’s record</div>
            <ul className="checks">
              {checks.map((c) => {
                const rule = RULES.find((x) => x.id === c.rule)!;
                return (
                  <li key={c.rule} className={`ck ck-${c.status}`}>
                    <span className="ck-ic">
                      {c.status === 'pass' ? <ICheck size={13} /> : c.status === 'fail' ? <IAlert size={13} /> : c.status === 'pending' ? <IQuestion size={13} /> : <span className="na">–</span>}
                    </span>
                    <div>
                      <div className="ck-l">{rule.label}</div>
                      <div className="ck-d">{c.detail}</div>
                      <div className="ck-from">{rule.from}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <SwapPicker d={d} idx={idx} slot={slot} onSwap={(to) => swapSlot(d.def.n, slot, to, 'your choice')} />
          </div>
        </div>
      )}
    </div>
  );
}

function SwapPicker({ d, idx, slot, onSwap }: { d: DayState; idx: number; slot: Slot; onSwap: (to: string) => void }) {
  const { defs, ctx } = useStore();
  const [open, setOpen] = useState(false);
  const cur = d.def.slots[slot];
  const pool = [...new Set([...POOL[slot], ...(slot === 'snack1' ? POOL.snack2 : slot === 'snack2' ? POOL.snack1 : [])])].filter((x) => x !== cur);
  if (!open)
    return (
      <button className="btn btn-sm btn-ghost swap-open" onClick={() => setOpen(true)}>
        <ISwap size={13} /> Replace with another option…
      </button>
    );
  return (
    <div className="swap-list">
      <div className="id-h">Alternatives that fit this slot</div>
      {pool.map((id) => {
        const r = RECIPES[id];
        const tmp = { ...d.def, slots: { ...d.def.slots, [slot]: id } };
        const tmpDefs = defs.map((x, i) => (i === idx ? tmp : x));
        const ch = itemChecks(r, tmp, leftoverOf(tmpDefs, idx, slot), ctx);
        const bad = ch.filter((c) => c.status === 'fail' || c.status === 'pending');
        return (
          <button key={id} className={`swap-opt ${bad.length ? 'is-bad' : ''}`} onClick={() => onSwap(id)}>
            <span className="so-n">{r.name}</span>
            <span className="so-m">
              {r.src.code} · {r.total} min · {r.kcal} kcal · {r.fib} g fiber
            </span>
            {bad.length > 0 && <span className="so-bad"><IAlert size={11} /> {bad.map((b) => RULES.find((x) => x.id === b.rule)!.label).join('; ')}</span>}
          </button>
        );
      })}
      <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>Close</button>
    </div>
  );
}
