import { useEffect, useMemo, useState } from 'react';
import { CLIENT, NOW_LABEL, RECIPES, SHOP_CATS, ShopItem } from './data';
import { useStore } from './store';
import {
  IAlert, IBook, ICal, ICart, ICheck, IFile, ILeaf, ILock, IQuestion, IRuler, ISpark, IUndo, IUser, IX,
} from './icons';

// ─── Top bar ───────────────────────────────────
export function TopBar() {
  return (
    <div className="topbar">
      <div className="brand">
        <ILeaf size={20} />
        <span className="brand-n">Sorrel</span>
        <span className="brand-p">Practice</span>
      </div>
      <nav className="nav">
        <a>Today</a>
        <a className="is-on">Clients</a>
        <a>Calendar</a>
        <a>Messages <span className="nav-c">3</span></a>
        <a>Recipe bank</a>
        <a>Billing</a>
      </nav>
      <div className="tb-right">
        <span className="tb-time">{NOW_LABEL}</span>
        <span className="avatar" title="Rebecca Haddad, RD">RH</span>
      </div>
    </div>
  );
}

// ─── Client bar ────────────────────────────────
export function ClientBar() {
  const { setRecordOpen, setSendOpen, readiness, sent, setSent, event } = useStore();
  return (
    <div className="clientbar">
      <div className="cb-left">
        <div className="crumb">Clients <span>/</span> Tom Brennan <span>/</span> Plans</div>
        <div className="cb-title">
          <h1>14-day low-FODMAP elimination plan</h1>
          <span className="cb-start"><ICal size={13} /> Starts {CLIENT.start}</span>
        </div>
        <div className="cb-chips">
          <button className="client-id" onClick={() => setRecordOpen(true)}>
            <span className="cid-av">TB</span>
            <span><b>Tom Brennan</b>, 52 · IBS-D</span>
          </button>
          <span className="rchip rchip-bad"><IAlert size={12} /> Tree-nut allergy: cashew, pistachio</span>
          <span className="rchip">Metformin 500 mg BID</span>
          <span className="rchip">Dislikes fish</span>
          <span className="rchip">Basic cook</span>
          <span className="rchip">Rotating shifts</span>
          <span className="rchip">~$120/wk groceries</span>
          <button className="rchip rchip-link" onClick={() => setRecordOpen(true)}>Intake record →</button>
        </div>
      </div>
      <div className="cb-right">
        {sent ? (
          <div className="sent-box">
            <div className="sb-l"><ICheck size={14} /> Scheduled to send</div>
            <div className="sb-t">{sent}</div>
            <button
              className="btn-link sm"
              onClick={() => {
                setSent(null);
                event('You cancelled the scheduled send');
              }}
            >
              Cancel send
            </button>
          </div>
        ) : (
          <>
            <div className="due">
              <span className="due-l">Send to Tom by</span>
              <span className="due-d">Fri, Nov 20 <em>· 3 days</em></span>
            </div>
            <button className={`btn ${readiness.ready ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSendOpen(true)}>
              {readiness.ready ? 'Send to Tom…' : <><ILock size={13} /> Review &amp; send…</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Tabs() {
  const { tab, setTab, days, w2, explainer, w1Stale } = useStore();
  const drafted = days.filter((d) => d.status !== 'queued' && d.status !== 'drafting').length;
  const accepted = days.filter((d) => d.status === 'accepted').length;
  const stale = w1Stale.added.length + w1Stale.removed.length > 0;
  return (
    <div className="tabs" role="tablist">
      <button role="tab" className={tab === 'plan' ? 'is-on' : ''} onClick={() => setTab('plan')}>
        Meal plan <span className="tab-c">{accepted}/{drafted} accepted · {drafted}/14 drafted</span>
      </button>
      <button role="tab" className={tab === 'shopping' ? 'is-on' : ''} onClick={() => setTab('shopping')}>
        <ICart size={14} /> Shopping list <span className="tab-c">{w2 ? 'Wk 1 + 2' : 'Wk 1 only'}</span>
        {stale && <span className="tab-dot" title="Out of date" />}
      </button>
      <button role="tab" className={tab === 'explainer' ? 'is-on' : ''} onClick={() => setTab('explainer')}>
        <IFile size={14} /> Client explainer
        <span className="tab-c">{explainer === 'queued' ? 'Not started' : explainer === 'drafting' ? 'Drafting…' : explainer === 'drafted' ? 'Needs review' : 'Reviewed'}</span>
      </button>
    </div>
  );
}

// ─── Shopping ──────────────────────────────────
export function Shopping() {
  const { w1Items, w2, w1Stale, updateW1, w1Updating, have, toggleHave, phase, yog } = useStore();
  const [week, setWeek] = useState<1 | 2>(1);
  const items: ShopItem[] | null = week === 1 ? w1Items : w2;
  const stale = w1Stale.added.length + w1Stale.removed.length > 0;
  const total = items ? items.reduce((a, b) => a + b.price, 0) : 0;
  const net = items ? items.filter((x) => !have.has(x.id)).reduce((a, b) => a + b.price, 0) : 0;
  const pct = Math.min(100, (net / CLIENT.budget) * 100);

  return (
    <div className="shop">
      <div className="shop-main">
        <div className="seg">
          <button className={week === 1 ? 'is-on' : ''} onClick={() => setWeek(1)}>Week 1 · Nov 23–29</button>
          <button className={week === 2 ? 'is-on' : ''} onClick={() => setWeek(2)}>
            Week 2 · Nov 30–Dec 6 {!w2 && <span className="seg-sub">not drafted</span>}
          </button>
        </div>
        {week === 1 && stale && (
          <div className="stale">
            <IAlert size={15} />
            <div>
              <b>The plan changed since this list was drafted.</b>
              <div className="stale-d">
                {w1Stale.added.length > 0 && (
                  <div><em>Added</em>{w1Stale.added.map((r) => <span key={r}>{RECIPES[r].name}</span>)}</div>
                )}
                {w1Stale.removed.length > 0 && (
                  <div><em>Removed</em>{w1Stale.removed.map((r) => <span key={r}>{RECIPES[r].name}</span>)}</div>
                )}
              </div>
            </div>
            <button className="btn btn-sm btn-dark" onClick={updateW1} disabled={w1Updating}>
              {w1Updating ? <><span className="spin sm light" /> Updating…</> : 'Ask assistant to update list'}
            </button>
          </div>
        )}
        {!items ? (
          <div className="empty-day small">
            <div className="ed-icon"><ICart size={24} /></div>
            <h3>Week 2 list isn’t drafted yet</h3>
            <p>
              {phase === 'paused'
                ? 'The assistant drafts it after days 10–14, which are waiting on your yogurt answer.'
                : 'The assistant drafts it as soon as days 10–14 are done.'}
            </p>
          </div>
        ) : (
          <div className="shop-cats">
            {SHOP_CATS.map((cat) => {
              const rows = items.filter((x) => x.cat === cat);
              if (!rows.length) return null;
              return (
                <div key={cat} className="shop-cat">
                  <div className="sc-h">
                    {cat}
                    <span>${rows.reduce((a, b) => a + b.price, 0).toFixed(2)}</span>
                  </div>
                  {rows.map((x) => {
                    const flagged = x.id === 'honey' || x.id === 'pesto';
                    return (
                      <label key={x.id} className={`shop-row ${have.has(x.id) ? 'is-have' : ''}`}>
                        <input type="checkbox" checked={have.has(x.id)} onChange={() => toggleHave(x.id)} />
                        <span className="sr-n">
                          {x.name}
                          {flagged && <span className="sr-flag"><IAlert size={11} /> {x.id === 'honey' ? 'for flagged Day 4 granola' : 'for flagged Day 6 pesto'}</span>}
                          {yog === null && (x.id === 'lfyogurt' || x.id === 'w2yogurt') && <span className="sr-flag sr-pend"><IQuestion size={11} /> depends on yogurt answer</span>}
                          {x.for.length > 0 && week === 1 && (
                            <span className="sr-for">{[...new Set(x.for.filter((r) => RECIPES[r]).map((r) => RECIPES[r].src.code))].slice(0, 4).join(' · ')}</span>
                          )}
                        </span>
                        <span className="sr-q">{x.qty}</span>
                        <span className="sr-p">${x.price.toFixed(2)}</span>
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <aside className="shop-side">
        <div className="card">
          <div className="card-l">Estimated cost · week {week}</div>
          <div className="big-num">{items ? `$${net.toFixed(2)}` : '—'}</div>
          <div className="budget-bar"><span style={{ width: `${pct}%` }} className={net > CLIENT.budget ? 'over' : ''} /></div>
          <div className="card-sub">
            {items ? (net <= CLIENT.budget ? `$${(CLIENT.budget - net).toFixed(2)} under his ~$${CLIENT.budget} weekly budget` : `$${(net - CLIENT.budget).toFixed(2)} over budget`) : 'Budget ~$120/week'}
          </div>
          {items && have.size > 0 && (
            <div className="card-sub">Full list ${total.toFixed(2)} · excluding {items.filter((x) => have.has(x.id)).length} item(s) he already has</div>
          )}
        </div>
        <div className="card card-plain">
          <div className="card-l">How this list was built</div>
          <ul className="how">
            <li>Quantities cover every item in the week’s accepted and draft days, including the second dinner portion for next-day lunches.</li>
            <li>Prices are the assistant’s estimates from regional grocery averages, rounded.</li>
            <li>Tick anything Tom already has — it comes off the estimate.</li>
            <li>Label checks are written into item names (onion/garlic, nut-free).</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

// ─── Explainer ─────────────────────────────────
export function Explainer() {
  const { explainer, setExplainer, yog, phase, event } = useStore();
  if (explainer === 'queued' || explainer === 'drafting') {
    return (
      <div className="explainer-empty">
        <div className="empty-day small">
          <div className="ed-icon">{explainer === 'drafting' ? <span className="spin big" /> : <IFile size={24} />}</div>
          <h3>{explainer === 'drafting' ? 'The assistant is drafting the explainer…' : 'The explainer isn’t started yet'}</h3>
          <p>
            {explainer === 'drafting'
              ? 'It’ll be ready to review in a moment.'
              : phase === 'paused'
                ? 'It’s the last step in the task, after days 10–14 and the week 2 shopping list. The assistant is paused on your yogurt question.'
                : 'It’s queued after the week 2 shopping list.'}
          </p>
          <div className="ex-outline">
            <div className="id-h">Planned outline</div>
            <ol>
              <li>What the elimination phase is (and isn’t)</li>
              <li>How to use the plan on shift days</li>
              <li>Foods to lean on / foods to pause</li>
              <li>Label checks for his tree-nut allergy</li>
              <li>Thanksgiving, Nov 26</li>
              <li>When to message you</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }
  const yogLine = yog === 'no' ? '' : yog === 'limit' ? ', lactose-free yogurt (one ¾-cup serving a day)' : ', lactose-free yogurt';
  return (
    <div className="explainer">
      <div className="paper-wrap">
        <article className="paper" contentEditable={explainer !== 'reviewed'} suppressContentEditableWarning spellCheck={false}>
          <div className="pp-brand"><ILeaf size={16} /> Rebecca Haddad, RD · Digestive nutrition</div>
          <h1>Your first two weeks: the low-FODMAP elimination phase</h1>
          <div className="pp-sub">For Tom Brennan · Starts Monday, November 23</div>
          <h2>What we’re doing</h2>
          <p>
            For two weeks you’ll eat foods that are low in FODMAPs — carbohydrates that some guts struggle to absorb and that can set off IBS
            symptoms like urgency, cramping and bloating. This isn’t forever. Afterwards we’ll bring foods back one group at a time to learn
            which ones bother you.
          </p>
          <h2>Using your plan on shift days</h2>
          <p>
            Each day has 3 meals and 2 snacks. Go by your shift, not the clock: “breakfast” is your first meal after you wake up. Try not to go
            more than 4–5 hours without eating. Spreading carbs across the day helps keep your blood sugar steady. Most dinners make two
            portions — the second one is tomorrow’s lunch. Weekday recipes take 30 minutes or less.
          </p>
          <h2>Amounts matter</h2>
          <p>Some foods are fine in small amounts but not large ones. A firm banana is fine; a very ripe one isn’t. Stick to the amounts in the plan.</p>
          <div className="pp-cols">
            <div>
              <h3>Lean on</h3>
              <ul>
                <li>Oats, rice, quinoa, potatoes, corn tortillas, spelt sourdough</li>
                <li>Eggs, chicken, turkey, beef, pork, firm tofu</li>
                <li>Lactose-free milk, aged cheddar{yogLine}</li>
                <li>Carrots, spinach, bok choy, green beans, peppers</li>
                <li>Kiwi, oranges, strawberries, blueberries, firm bananas</li>
                <li>Peanuts, peanut butter, pumpkin and sunflower seeds</li>
                <li>Garlic-infused oil, green tops of scallions, herbs</li>
              </ul>
            </div>
            <div>
              <h3>Pause for now</h3>
              <ul>
                <li>Onion and garlic — including powders in sauces, spice mixes, stock and deli meat</li>
                <li>Regular milk, ice cream, soft cheeses{yog === 'no' ? ', all yogurt' : ''}</li>
                <li>Beans and chickpeas (small amounts of canned lentils are OK)</li>
                <li>Apples, pears, mango, watermelon, dried fruit</li>
                <li>Honey, agave, high-fructose corn syrup</li>
                <li>Mushrooms, cauliflower, asparagus</li>
              </ul>
            </div>
          </div>
          <h2>Your nut allergy</h2>
          <p>
            Keep avoiding all tree nuts, not only cashew and pistachio. Check labels on pesto, dairy-free cheese and sauces — cashew is a common
            hidden ingredient. Peanuts are fine; they’re a legume.
          </p>
          <h2>Thanksgiving (Thursday, Nov 26)</h2>
          <p>
            If you’re at a family meal, turkey, plain potatoes, green beans and carrots are good choices. Skip stuffing, gravy and pie — they
            usually contain onion, garlic or wheat. If you’re working, just follow the plan.
          </p>
          <h2>Medication and when to message me</h2>
          <p>
            Keep taking metformin with meals as prescribed, and don’t skip meals on long shifts. Message me through the portal if symptoms get
            worse, you’re unsure about a food, or a day doesn’t fit your schedule.
          </p>
          <div className="pp-foot">Food lists are based on the FODMAP serving reference used to build your plan. This sheet doesn’t replace advice from your doctor.</div>
        </article>
      </div>
      <aside className="ex-side">
        <div className="card">
          <div className="card-l">Status</div>
          <div className={`ex-status ${explainer === 'reviewed' ? 'ok' : ''}`}>
            {explainer === 'reviewed' ? <><ICheck size={14} /> Reviewed by you</> : 'Drafted · needs your review'}
          </div>
          <p className="card-sub">Click into the page to edit any text before you mark it reviewed.</p>
          {explainer === 'reviewed' ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setExplainer('drafted')}><IUndo size={13} /> Reopen for edits</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => { setExplainer('reviewed'); event('You marked the explainer reviewed'); }}>
              <ICheck size={13} /> Mark reviewed
            </button>
          )}
        </div>
        <div className="card card-plain">
          <div className="card-l">Drafted from</div>
          <ul className="how">
            <li><IUser size={12} /> Intake record (Nov 10): allergy, metformin, shifts, cooking level</li>
            <li><IRuler size={12} /> FODMAP serving reference — food lists</li>
            <li><IBook size={12} /> Practice handout “Starting low-FODMAP” (rev. Jul 2026)</li>
            <li><ISpark size={12} /> Your answer on lactose-free yogurt: {yog === 'yes' ? 'tolerates it' : yog === 'limit' ? 'one serving a day' : yog === 'no' ? 'leave it out' : '—'}</li>
          </ul>
        </div>
        <div className="card card-plain">
          <div className="card-l">Readability</div>
          <div className="read-row"><span>Reading level</span><b>Grade 7</b></div>
          <div className="read-row"><span>Length</span><b>1 page · 410 words</b></div>
        </div>
      </aside>
    </div>
  );
}

// ─── Record drawer ─────────────────────────────
export function RecordDrawer() {
  const { setRecordOpen } = useStore();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setRecordOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [setRecordOpen]);
  return (
    <div className="overlay" onClick={() => setRecordOpen(false)}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="dr-head">
          <div className="cid-av lg">TB</div>
          <div>
            <h2>Tom Brennan</h2>
            <div className="dr-sub">52 · he/him · Telehealth client since Nov 10, 2026 · Referred by Dr. Anita Shah (GI)</div>
          </div>
          <button className="icon-btn" onClick={() => setRecordOpen(false)} aria-label="Close"><IX size={18} /></button>
        </div>
        <div className="dr-body">
          <section>
            <h3>Diagnosis</h3>
            <dl>
              <dt>Primary</dt><dd>IBS-D (Rome IV), diagnosed Oct 2026 by GI. Celiac serology negative.</dd>
              <dt>Other</dt><dd>Prediabetes — HbA1c 6.1% (Sep 2026)</dd>
              <dt>Symptoms</dt><dd>Urgency most mornings, cramping after large meals, worse on night-shift weeks</dd>
            </dl>
          </section>
          <section className="sec-alert">
            <h3><IAlert size={14} /> Allergies</h3>
            <dl>
              <dt>Tree nuts</dt><dd>Cashew and pistachio — hives and lip swelling (2019). Carries an epinephrine auto-injector.</dd>
            </dl>
          </section>
          <section>
            <h3>Medications</h3>
            <dl>
              <dt>Metformin</dt><dd>500 mg twice daily with meals, for prediabetes</dd>
              <dt>Loperamide</dt><dd>As needed, about once a week</dd>
            </dl>
          </section>
          <section>
            <h3>Lifestyle</h3>
            <dl>
              <dt>Work</dt><dd>Warehouse supervisor, rotating shifts (days / evenings / nights, changes weekly)</dd>
              <dt>Cooking</dt><dd>Basic — comfortable with sheet-pan, stovetop, rice cooker</dd>
              <dt>Kitchen</dt><dd>Microwave at work most shifts; no fridge on night shift</dd>
              <dt>Groceries</dt><dd>About $120 a week, shops Sundays</dd>
              <dt>Household</dt><dd>Lives with partner, who eats the same dinners</dd>
            </dl>
          </section>
          <section>
            <h3>Food preferences &amp; history</h3>
            <dl>
              <dt>Dislikes</dt><dd>Fish and seafood of any kind</dd>
              <dt>Breakfast</dt><dd><mark>“Breakfast is usually toast or cereal. Occasional lactose-free yogurt.”</mark></dd>
              <dt>Typical lunch</dt><dd>Gas-station sandwich or fast food on shift</dd>
              <dt>Drinks</dt><dd>3–4 coffees a day, energy drink on nights</dd>
            </dl>
          </section>
          <section>
            <h3>Targets <span className="sec-by">set by you · Nov 12</span></h3>
            <dl>
              <dt>Energy</dt><dd>About 2,100 kcal / day</dd>
              <dt>Protein</dt><dd>95 g / day</dd>
              <dt>Fiber</dt><dd>25–30 g / day</dd>
              <dt>Carbohydrate</dt><dd>Spread evenly across meals and snacks for blood-sugar control</dd>
            </dl>
          </section>
          <section>
            <h3>Standing instructions <span className="sec-by">yours</span></h3>
            <dl>
              <dt>All plans</dt><dd>No recipes over 30 minutes on weekdays</dd>
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}

// ─── Send modal ────────────────────────────────
export function SendModal() {
  const { readiness, setSendOpen, setSent, event, setTab, yog, go, days, openIssues, w1Stale } = useStore();
  const [when, setWhen] = useState<'fri' | 'now'>('fri');
  const [msg, setMsg] = useState(
    'Hi Tom — here’s your 14-day plan for the elimination phase starting Monday, plus a shopping list for each week and a one-page guide. Read the guide first. Message me with any questions before you shop on Sunday. — Rebecca',
  );
  const firstOpen = useMemo(() => days.find((d) => openIssues(d.def.n).length > 0), [days, openIssues]);
  const firstUnaccepted = days.find((d) => d.status !== 'accepted');
  const items = [
    { ok: yog !== null, label: 'Answer the assistant’s question about yogurt', act: () => { setSendOpen(false); document.getElementById('yog-question')?.scrollIntoView({ block: 'center' }); } },
    { ok: readiness.open === 0, label: readiness.open ? `Resolve ${readiness.open} open issue${readiness.open > 1 ? 's' : ''}` : 'No open issues', act: () => { setSendOpen(false); if (firstOpen) go(firstOpen.def.n); } },
    { ok: readiness.accepted === 14, label: `Accept all 14 days (${readiness.accepted} accepted)`, act: () => { setSendOpen(false); if (firstUnaccepted) go(firstUnaccepted.def.n); } },
    { ok: readiness.w1Fresh && readiness.w2, label: !readiness.w2 ? 'Week 2 shopping list (not drafted yet)' : !readiness.w1Fresh ? `Update week 1 shopping list (${w1Stale.added.length + w1Stale.removed.length} change${w1Stale.added.length + w1Stale.removed.length > 1 ? 's' : ''})` : 'Shopping lists for both weeks', act: () => { setSendOpen(false); setTab('shopping'); } },
    { ok: readiness.explainer === 'reviewed', label: readiness.explainer === 'reviewed' ? 'Explainer reviewed' : readiness.explainer === 'drafted' ? 'Review the explainer' : 'Explainer (not drafted yet)', act: () => { setSendOpen(false); setTab('explainer'); } },
  ];
  return (
    <div className="overlay center" onClick={() => setSendOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mo-head">
          <h2>Send plan to Tom</h2>
          <button className="icon-btn" onClick={() => setSendOpen(false)} aria-label="Close"><IX size={18} /></button>
        </div>
        <div className="mo-body">
          <div className="id-h">Before it can go out</div>
          <ul className="ready">
            {items.map((x) => (
              <li key={x.label} className={x.ok ? 'ok' : ''}>
                <span className="rd-ic">{x.ok ? <ICheck size={13} /> : <span className="rd-o" />}</span>
                <span className="rd-l">{x.label}</span>
                {!x.ok && <button className="btn-link sm" onClick={x.act}>Go →</button>}
              </li>
            ))}
          </ul>
          <div className="id-h">Message · via client portal</div>
          <textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} disabled={!readiness.ready} />
          <div className="attach">
            <span><IFile size={13} /> Meal plan, 14 days (PDF)</span>
            <span><ICart size={13} /> Shopping lists, wk 1–2</span>
            <span><IFile size={13} /> Low-FODMAP explainer</span>
          </div>
          <div className="when">
            <label className={when === 'fri' ? 'is-on' : ''}>
              <input type="radio" checked={when === 'fri'} onChange={() => setWhen('fri')} disabled={!readiness.ready} /> Schedule for Fri, Nov 20 at 9:00 am
            </label>
            <label className={when === 'now' ? 'is-on' : ''}>
              <input type="radio" checked={when === 'now'} onChange={() => setWhen('now')} disabled={!readiness.ready} /> Send now
            </label>
          </div>
        </div>
        <div className="mo-foot">
          {!readiness.ready && <span className="mo-why"><ILock size={13} /> Sending unlocks when everything above is checked.</span>}
          <button className="btn btn-ghost" onClick={() => setSendOpen(false)}>Close</button>
          <button
            className="btn btn-primary"
            disabled={!readiness.ready}
            onClick={() => {
              const label = when === 'fri' ? 'Fri, Nov 20 · 9:00 am' : 'Sent Tue, Nov 17';
              setSent(label);
              setSendOpen(false);
              event(when === 'fri' ? 'You scheduled the plan to send Fri, Nov 20 at 9:00 am' : 'You sent the plan to Tom');
            }}
          >
            {when === 'fri' ? 'Schedule send' : 'Send now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastView() {
  const { toast, setToast, undo } = useStore();
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast, setToast]);
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id}>
      <ICheck size={14} />
      <span>{toast.text}</span>
      {toast.undo && (
        <button
          onClick={() => {
            undo();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
