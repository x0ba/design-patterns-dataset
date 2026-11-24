import { useState, type ReactNode } from 'react';
import type { AppModel, PlanState } from './App';
import {
  ALERTS, BAKERY, BREAK_END, BURST_AT, CATEGORIES, CROPS, EVENT_END, GUILD, INITIAL_SETTINGS, LEFT_AT,
  RESTOCK_AT, START, TRADES, fmtClock, fmtDur, fmtTime, minsToLabel, outcome, shiftPreset, tierOf,
  type Alert, type CategoryId, type Outcome,
} from './data';
import {
  GoldenEgg, IconArrowRight, IconBan, IconBell, IconBellOff, IconCheck, IconInbox, IconMoon, IconPhone,
  IconShield, IconSkip, IconStar, IconSwap, IconUndo, IconUsers, Lantern, Lavender, Pie, Pumpkin, Wheat,
} from './icons';

const H = 3_600_000;
const glyph = { pumpkin: Pumpkin, lavender: Lavender, wheat: Wheat };

export default function Tonight({ m }: { m: AppModel }) {
  return (
    <main className="tonight">
      <section className="col col-left" aria-label="What changed since you left">
        <SinceYouLeft m={m} />
        <NightLog m={m} />
      </section>
      <section className="col col-mid" aria-label="Break plan">
        <BreakPlan m={m} />
      </section>
      <section className="col col-right" aria-label="Guild, trades and alerts">
        <GuildEvent m={m} />
        <ShiftCard m={m} />
        <Trades m={m} />
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Left column                                                         */
/* ------------------------------------------------------------------ */

function SinceYouLeft({ m }: { m: AppModel }) {
  const { now } = m;
  const pending = TRADES.filter((t) => m.trades[t.id] === 'pending').length;
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="eyebrow">Since you left at {fmtTime(LEFT_AT)}</div>
          <h2>What changed in Plumhollow</h2>
        </div>
        <span className="muted small">{fmtDur(now.getTime() - LEFT_AT.getTime())} away</span>
      </div>

      <div className="change-group">
        <div className="change-label">Fields · 3 ready</div>
        {CROPS.map((c) => {
          const G = glyph[c.id];
          const left = c.spoilsAt ? c.spoilsAt.getTime() - now.getTime() : null;
          const urgent = left !== null && left < 1.5 * H;
          return (
            <div className="crop-row" key={c.id}>
              <span className="glyph"><G size={24} /></span>
              <div className="crop-main">
                <div className="crop-name">{c.name} ×{c.qty}</div>
                <div className="muted small">{c.plot} · ready {fmtTime(c.readyAt)}</div>
              </div>
              <div className={`crop-keep ${urgent ? 'urgent' : ''}`}>
                {c.spoilsAt === null ? (
                  <span>Never spoils</span>
                ) : left! <= 0 ? (
                  <span>Spoiled</span>
                ) : urgent ? (
                  <>
                    <strong>Spoils {fmtTime(c.spoilsAt)}</strong>
                    <span>in {fmtDur(left!)}</span>
                  </>
                ) : (
                  <span>Keeps till {fmtTime(c.spoilsAt)} tmrw</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="change-group">
        <div className="change-label">Bakery</div>
        <div className="crop-row">
          <span className="glyph"><Pie size={24} /></span>
          <div className="crop-main">
            <div className="crop-name">Apple pies · 2 of 5 done</div>
            <div className="pips" aria-label="2 of 5 pies done">
              {Array.from({ length: BAKERY.total }).map((_, i) => (
                <span key={i} className={i < 2 ? 'pip done' : i === 2 ? 'pip baking' : 'pip'} />
              ))}
            </div>
          </div>
          <div className="crop-keep">
            <span>Next {fmtTime(BAKERY.nextAt)}</span>
            <span className="warn-text">Tray fills at 3</span>
          </div>
        </div>
      </div>

      <div className="change-group compact">
        <div className="mini-stat">
          <IconSwap size={16} />
          <span><strong>{pending}</strong> trade request{pending === 1 ? '' : 's'}</span>
        </div>
        <div className="mini-stat">
          <IconUsers size={16} />
          <span>Fennwick watered your orchard</span>
        </div>
        <div className="mini-stat">
          <Lantern size={16} />
          <span>Shop restocks {fmtTime(RESTOCK_AT)}</span>
        </div>
        <div className="mini-stat">
          <IconInbox size={16} />
          <span>Barn: {m.barn.lavender} lavender · {m.barn.goldenEgg} golden egg{m.barn.goldenEgg === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}

const catName = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!.name;

const catTone: Record<CategoryId, string> = {
  cropReady: 'green', cropSpoil: 'orange', production: 'amber', animals: 'amber',
  eventDeadline: 'lav', eventMilestone: 'lav', guildMention: 'lav', guildChat: 'lav',
  trades: 'blue', friendVisits: 'blue', gifts: 'blue',
  shopRestock: 'rose', dailyRewards: 'rose', news: 'rose',
};

const outcomeLabel: Record<Outcome, string> = {
  delivered: 'Would still buzz',
  held: 'Held for 6:30 AM summary',
  off: 'Turned off',
  filtered: 'Blocked by sender filter',
};

function NightLog({ m }: { m: AppModel }) {
  const [filter, setFilter] = useState<'all' | 'burst'>('all');
  const changed = JSON.stringify(m.saved) !== JSON.stringify(INITIAL_SETTINGS);
  const sorted = [...ALERTS].sort((a, b) => b.at.getTime() - a.at.getTime());
  const burst = sorted.filter((a) => a.at.getTime() === BURST_AT.getTime());
  const earlier = sorted.filter((a) => a.at.getTime() !== BURST_AT.getTime());
  const quietCount = ALERTS.filter((a) => outcome(a, m.saved, m.close, m.others) !== 'delivered').length;

  const row = (a: Alert) => {
    const o = outcome(a, m.saved, m.close, m.others);
    const muted = changed && o !== 'delivered';
    return (
      <li key={a.id} className={`log-row ${muted ? 'muted-row' : ''}`}>
        <span className={`log-dot tone-${catTone[a.cat]}`} />
        <div className="log-main">
          <div className="log-title">{a.title}</div>
          {a.body && <div className="log-body">{a.body}</div>}
          <div className="log-meta">
            <span>{catName(a.cat)}</span>
            {changed && (
              <span className={`log-outcome o-${o}`}>
                {o === 'delivered' ? <IconBell size={12} /> : <IconBellOff size={12} />}
                {outcomeLabel[o]}
              </span>
            )}
          </div>
        </div>
        <time className="log-time">{fmtTime(a.at)}</time>
      </li>
    );
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="eyebrow">Alert log</div>
          <h2>{ALERTS.length} alerts since {fmtTime(LEFT_AT)}</h2>
        </div>
        <div className="seg small-seg" role="group" aria-label="Filter alerts">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'burst' ? 'on' : ''} onClick={() => setFilter('burst')}>Last 6</button>
        </div>
      </div>

      {changed && (
        <div className="log-note">
          <IconMoon size={14} /> With your new settings, {quietCount} of these would have stayed quiet.
        </div>
      )}

      {m.actions.length > 0 && (
        <ul className="log-list">
          {m.actions.map((a) => (
            <li key={a.id} className="log-row you">
              <span className="log-dot tone-you"><IconCheck size={10} /></span>
              <div className="log-main"><div className="log-title">{a.text}</div></div>
              <time className="log-time">{fmtTime(a.at)}</time>
            </li>
          ))}
        </ul>
      )}

      <div className="burst-head">
        <IconPhone size={14} /> {fmtTime(BURST_AT)} · 6 arrived at once
      </div>
      <ul className="log-list">{burst.map(row)}</ul>

      {filter === 'all' && (
        <>
          <div className="burst-head plain">Earlier tonight</div>
          <ul className="log-list">{earlier.map(row)}</ul>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Middle column: break plan                                           */
/* ------------------------------------------------------------------ */

interface PlanItem {
  id: string;
  title: string;
  why: ReactNode;
  mins: number;
  where: 'In game' | 'Here';
  tag?: { tone: string; text: string };
  icon: ReactNode;
  pts?: number;
  action?: { label: string; run: () => void };
}

function BreakPlan({ m }: { m: AppModel }) {
  const { now } = m;
  const pumpkinsLeft = CROPS[0].spoilsAt!.getTime() - now.getTime();
  const breakLeftMs = BREAK_END.getTime() - now.getTime();
  const breakTotal = (BREAK_END.getTime() - START.getTime()) / 60000;
  const elapsed = Math.min(breakTotal, (now.getTime() - START.getTime()) / 60000);

  const items: PlanItem[] = [
    {
      id: 'pumpkins',
      title: 'Harvest pumpkins ×40',
      why: <>They spoil at 3:15 AM — {fmtDur(pumpkinsLeft)} from now, after your break is over. This is the one that can’t wait.</>,
      mins: 1,
      where: 'In game',
      tag: { tone: 'urgent', text: 'Spoils 3:15 AM' },
      icon: <Pumpkin size={26} />,
    },
    {
      id: 'crates',
      title: 'Deliver 4 pumpkin crates to the festival',
      why: <>+160 points before they’d spoil. Also answers Thornbury’s “any spare pumpkins?” in guild chat.</>,
      mins: 3,
      where: 'In game',
      pts: 160,
      tag: { tone: 'guild', text: '+160 pts' },
      icon: <IconStar size={22} />,
    },
    {
      id: 'june',
      title: 'Accept June_bug’s trade',
      why: <>10 of your 12 barn lavender for a golden egg. Fair price from a close friend; your 25 fresh lavender restocks you.</>,
      mins: 1,
      where: 'Here',
      tag: { tone: 'friend', text: 'Close friend' },
      icon: <GoldenEgg size={24} />,
      action: m.trades.june === 'pending' ? { label: 'Accept', run: () => m.setTrade('june', 'accepted') } : undefined,
    },
    {
      id: 'pies',
      title: 'Collect 2 apple pies & deliver them',
      why: <>+60 points, and empties the bakery tray (holds 3) so all 5 pies finish by {fmtTime(BAKERY.allDoneIfCollected)} instead of stopping at 3.</>,
      mins: 1,
      where: 'In game',
      pts: 60,
      tag: { tone: 'guild', text: '+60 pts' },
      icon: <Pie size={24} />,
    },
    {
      id: 'harvest',
      title: 'Harvest lavender & wheat',
      why: <>No rush on either — lavender keeps until 1:30 AM tomorrow, wheat never spoils. Worth it only to free the fields.</>,
      mins: 1,
      where: 'In game',
      icon: <Wheat size={24} />,
    },
    {
      id: 'replant',
      title: 'Replant all 3 fields',
      why: <>Pumpkins take 6h, so they’d be ready around {minsToLabel(8 * 60 + 50)} — after your shift ends.</>,
      mins: 2,
      where: 'In game',
      icon: <Lavender size={24} />,
    },
    {
      id: 'alerts',
      title: 'Quiet your phone for the rest of the shift',
      why: <>Only the festival deadline and trades from {m.close.join(' & ')} get through until 6:30 AM.</>,
      mins: 1,
      where: 'Here',
      icon: <IconBellOff size={22} />,
      action: !m.saved.quietOn ? { label: 'Turn on', run: m.applyShift } : undefined,
    },
  ];

  const st = (id: string): PlanState => m.plan[id] ?? 'todo';
  const todo = items.filter((i) => st(i.id) === 'todo');
  const planned = todo.reduce((s, i) => s + i.mins, 0);
  const doneCount = items.filter((i) => st(i.id) === 'done').length;
  const leftMin = Math.max(0, breakLeftMs / 60000);
  const over = planned - leftMin;
  const scale = (v: number) => `${(v / breakTotal) * 100}%`;

  return (
    <div className="card plan-card">
      <div className="card-head">
        <div>
          <div className="eyebrow">Your break · {fmtTime(START)}–{fmtTime(BREAK_END)}</div>
          <h2>Worth doing in the next {Math.ceil(leftMin)} minutes</h2>
        </div>
        <div className="plan-count">
          <strong>{doneCount}</strong>/{items.length} done
        </div>
      </div>

      <div className="budget">
        <div className="budget-track" aria-hidden="true">
          <span className="budget-elapsed" style={{ width: scale(elapsed) }} />
          {(() => {
            let x = elapsed;
            return todo.map((i) => {
              const left = x;
              x += i.mins;
              const w = Math.max(0, Math.min(i.mins, breakTotal - left));
              return (
                <span
                  key={i.id}
                  className={`budget-seg ${i.tag?.tone ?? 'plain'} ${left + i.mins > breakTotal ? 'overflow' : ''}`}
                  style={{ left: scale(left), width: scale(w) }}
                  title={`${i.title} · ${i.mins} min`}
                />
              );
            });
          })()}
        </div>
        <div className="budget-legend">
          <span>{fmtTime(START)}</span>
          <span className={over > 0.05 ? 'over-text' : ''}>
            {breakLeftMs <= 0
              ? 'Break’s over — the rest can wait for next time'
              : over > 0.05
                ? `${planned} min planned · ${Math.ceil(over)} min over — skip something`
                : `${planned} min planned · ${fmtClock(breakLeftMs)} left · ${Math.floor(leftMin - planned)} min spare`}
          </span>
          <span>{fmtTime(BREAK_END)}</span>
        </div>
      </div>

      <ol className="plan-list">
        {items.map((i, idx) => {
          const s = st(i.id);
          return (
            <li key={i.id} className={`plan-item s-${s}`}>
              <button
                className="check"
                aria-label={s === 'done' ? `Mark “${i.title}” not done` : `Mark “${i.title}” done`}
                aria-pressed={s === 'done'}
                onClick={() => (s !== 'done' && i.action ? i.action.run() : m.setPlan(i.id, s === 'done' ? 'todo' : 'done'))}
                disabled={(i.id === 'june' && m.trades.june !== 'pending') || (i.id === 'alerts' && m.saved.quietOn)}
              >
                {s === 'done' ? <IconCheck size={14} /> : <span className="num">{idx + 1}</span>}
              </button>
              <span className="plan-icon">{i.icon}</span>
              <div className="plan-main">
                <div className="plan-title">
                  {i.title}
                  {i.tag && s !== 'done' && <span className={`tag t-${i.tag.tone}`}>{i.tag.text}</span>}
                </div>
                <div className="plan-why">{i.why}</div>
              </div>
              <div className="plan-side">
                <span className="mins">{i.mins} min</span>
                <span className={`where ${i.where === 'Here' ? 'here' : ''}`}>{i.where === 'Here' ? 'Do it here' : 'In game'}</span>
                {s === 'todo' && i.action && (
                  <button className="btn btn-primary btn-sm" onClick={i.action.run}>{i.action.label}</button>
                )}
                {s === 'todo' && !i.action && (
                  <button className="link-btn" onClick={() => m.setPlan(i.id, 'skipped')}>
                    <IconSkip size={12} /> Skip
                  </button>
                )}
                {s === 'skipped' && (
                  <button className="link-btn" onClick={() => m.setPlan(i.id, 'todo')}>
                    <IconUndo size={12} /> Add back
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="can-wait">
        <div className="change-label">Can wait — skip these tonight</div>
        <div className="wait-row">
          <Lantern size={20} />
          <div>
            <strong>Limited shop restock at {fmtTime(RESTOCK_AT)}</strong>
            <span>You’ll be on shift. Restocked items stay up for 24 hours.</span>
          </div>
        </div>
        <div className="wait-row">
          <IconBan size={18} />
          <div>
            <strong>xXFarmlordXx’s pumpkin offer</strong>
            <span>A stranger offering 120 coins for ~360 coins of pumpkins — and you need them for crates.</span>
          </div>
          {m.trades.farmlord === 'pending' ? (
            <button className="btn btn-ghost btn-sm" onClick={() => m.setTrade('farmlord', 'declined')}>Decline</button>
          ) : (
            <span className="resolved small"><IconCheck size={13} /> {m.trades.farmlord === 'blocked' ? 'Blocked' : 'Declined'}</span>
          )}
        </div>
        <div className="wait-row">
          <IconUsers size={18} />
          <div>
            <strong>14 guild chat messages</strong>
            <span>Thornbury’s pumpkin ask is the only one meant for you, and the crate delivery covers it.</span>
          </div>
        </div>
        <div className="wait-row">
          <IconStar size={18} />
          <div>
            <strong>Daily reward (day 12 streak)</strong>
            <span>Your streak is safe until midnight tonight.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Right column                                                        */
/* ------------------------------------------------------------------ */

function GuildEvent({ m }: { m: AppModel }) {
  const { now } = m;
  const elapsedH = Math.max(0, (now.getTime() - START.getTime()) / H);
  const leftMs = EVENT_END.getTime() - now.getTime();
  const points = Math.min(GUILD.goal, Math.floor(GUILD.pointsAtStart + GUILD.pacePerHour * elapsedH));
  const projected = Math.round(GUILD.pointsAtStart + GUILD.pacePerHour * ((EVENT_END.getTime() - START.getTime()) / H));
  const short = GUILD.goal - projected;
  const planPts = (['crates', 'pies'] as const)
    .filter((id) => (m.plan[id] ?? 'todo') !== 'skipped')
    .reduce((s, id) => s + (id === 'crates' ? 160 : 60), 0);
  const withPlan = projected + planPts;
  const pct = (v: number) => `${Math.min(100, (v / GUILD.goal) * 100)}%`;

  return (
    <div className="card event-card">
      <div className="card-head">
        <div>
          <div className="eyebrow">{GUILD.name} · {GUILD.members} members · {GUILD.onlineNow} online</div>
          <h2>{GUILD.event}</h2>
        </div>
        <div className="countdown">
          <span>Ends {fmtTime(EVENT_END)}</span>
          <strong>{fmtDur(leftMs)}</strong>
        </div>
      </div>

      <div className="event-num">
        <strong>{points.toLocaleString()}</strong>
        <span>/ {GUILD.goal.toLocaleString()} pts</span>
        <span className="pct">{Math.floor((points / GUILD.goal) * 100)}%</span>
      </div>

      <div className="ev-bar" aria-label={`${points} of ${GUILD.goal} points`}>
        <span className="ev-plan" style={{ width: pct(withPlan) }} />
        <span className="ev-proj" style={{ width: pct(projected) }} />
        <span className="ev-now" style={{ width: pct(points) }} />
      </div>
      <div className="ev-legend">
        <span><i className="sw now" /> Now</span>
        <span><i className="sw proj" /> On pace by {fmtTime(EVENT_END)}</span>
        <span><i className="sw plan" /> + your plan</span>
      </div>

      <div className={`insight ${withPlan >= GUILD.goal ? 'good' : 'warn'}`}>
        {short > 0 ? (
          <>
            At tonight’s pace ({GUILD.pacePerHour.toLocaleString()} pts/hr) the guild ends around{' '}
            <strong>{projected.toLocaleString()} — {short.toLocaleString()} short</strong>.{' '}
            {planPts > 0 ? (
              withPlan >= GUILD.goal ? (
                <>Your crates and pies (+{planPts}) would close the gap.</>
              ) : (
                <>Your plan adds +{planPts}, still {(GUILD.goal - withPlan).toLocaleString()} short.</>
              )
            ) : (
              <>Crates (+160) and pies (+60) from your plan would close the gap.</>
            )}
          </>
        ) : (
          <>On pace to finish. Your plan adds +{planPts}.</>
        )}
      </div>

      <div className="contrib">
        {GUILD.top.map((p) => (
          <div key={p.name} className={`contrib-row ${p.me ? 'me' : ''}`}>
            <span className="contrib-name">{p.me ? 'You' : p.name}</span>
            <span className="contrib-bar"><span style={{ width: `${(p.pts / 1240) * 100}%` }} /></span>
            <span className="contrib-pts">
              {p.pts.toLocaleString()}
              {p.me && planPts > 0 && <em> → {(p.pts + planPts).toLocaleString()}</em>}
            </span>
          </div>
        ))}
      </div>
      <div className="muted small reward">Reward if completed: {GUILD.reward}</div>
    </div>
  );
}

function Trades({ m }: { m: AppModel }) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="eyebrow">Trade requests</div>
          <h2>{TRADES.filter((t) => m.trades[t.id] === 'pending').length || 'No'} waiting</h2>
        </div>
      </div>
      <div className="trade-list">
        {TRADES.map((t) => {
          const tier = tierOf(t.from, m.close, m.others);
          const st = m.trades[t.id];
          return (
            <div key={t.id} className={`trade ${st !== 'pending' ? 'resolved-trade' : ''}`}>
              <div className="trade-top">
                <span className={`av av-${tier}`}>{t.from.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase()}</span>
                <div className="trade-who">
                  <strong>{t.from}</strong>
                  <span className={`tier tier-${tier}`}>
                    {tier === 'close' ? <><IconShield size={11} /> Close friend</> : tier === 'friend' ? 'Friend' : 'Not a friend'}
                  </span>
                </div>
                <time className="muted small">{fmtTime(t.receivedAt)}</time>
              </div>
              <div className="trade-deal">
                <div><span className="muted small">They want</span><strong>{t.wants}</strong></div>
                <IconArrowRight size={16} />
                <div><span className="muted small">You get</span><strong>{t.offers}</strong></div>
              </div>
              <div className={`trade-note ${t.verdict}`}>{t.note}</div>
              {t.id === 'june' && st === 'pending' && (
                <div className="muted small">You have {m.barn.lavender} lavender in the barn → {m.barn.lavender - 10} after.</div>
              )}
              <div className="trade-actions">
                {st === 'pending' ? (
                  t.verdict === 'fair' ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => m.setTrade(t.id, 'accepted')}>
                        <IconCheck size={14} /> Accept
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => m.setTrade(t.id, 'declined')}>Decline</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => m.setTrade(t.id, 'declined')}>Decline</button>
                      <button className="btn btn-ghost btn-sm danger" onClick={() => m.setTrade(t.id, 'blocked')}>
                        <IconBan size={14} /> Decline & block
                      </button>
                    </>
                  )
                ) : (
                  <>
                    <span className="resolved">
                      <IconCheck size={14} />
                      {st === 'accepted' ? 'Accepted — golden egg is in your barn' : st === 'blocked' ? 'Declined and blocked' : 'Declined'}
                    </span>
                    <button className="link-btn" onClick={() => m.setTrade(t.id, 'pending')}><IconUndo size={12} /> Undo</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShiftCard({ m }: { m: AppModel }) {
  const total = ALERTS.length;
  const current = ALERTS.filter((a) => outcome(a, m.saved, m.close, m.others) === 'delivered').length;
  const preview = shiftPreset(m.saved);
  const previewCount = ALERTS.filter((a) => outcome(a, preview, m.close, m.others) === 'delivered').length;
  const onCount = CATEGORIES.filter((c) => m.saved.enabled[c.id]).length;
  const breaking = CATEGORIES.filter((c) => m.saved.enabled[c.id] && m.saved.breakthrough[c.id]);

  if (m.saved.quietOn) {
    return (
      <div className="card shift-card calm">
        <div className="card-head">
          <div>
            <div className="eyebrow"><IconMoon size={13} /> Quiet hours on</div>
            <h2>{minsToLabel(m.saved.quietStart)} – {minsToLabel(m.saved.quietEnd)}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={m.goAlerts}>Edit</button>
        </div>
        <div className="muted small" style={{ marginBottom: 8 }}>Still allowed to buzz you:</div>
        <ul className="allow-list">
          {breaking.length === 0 && <li>Nothing — fully silent</li>}
          {breaking.map((c) => (
            <li key={c.id}>
              <IconBell size={14} />
              {c.id === 'trades'
                ? `Trade requests from ${m.saved.quietTradeFrom === 'close' ? m.close.join(' & ') : 'friends'}`
                : c.name}
            </li>
          ))}
        </ul>
        <div className="shift-compare">
          <div><strong>{current}</strong><span>of tonight’s {total} alerts would have reached you</span></div>
        </div>
        {m.saved.digest && <div className="muted small">Everything else waits for one summary at {minsToLabel(m.saved.quietEnd)}.</div>}
      </div>
    );
  }

  return (
    <div className="card shift-card">
      <div className="card-head">
        <div>
          <div className="eyebrow"><IconBell size={13} /> Alerts right now</div>
          <h2>All {onCount} types on, no quiet hours</h2>
        </div>
      </div>
      <div className="shift-compare two">
        <div className="was"><strong>{current}</strong><span>alerts reached you tonight</span></div>
        <IconArrowRight size={18} />
        <div className="would"><strong>{previewCount}</strong><span>with shift quiet hours</span></div>
      </div>
      <div className="preset-desc">
        <div><IconMoon size={14} /><span>10:00 PM – 6:30 AM, every night</span></div>
        <div><IconBell size={14} /><span>Only these get through: <strong>guild event deadline</strong> and <strong>trades from {m.close.join(' & ')}</strong></span></div>
        <div><IconInbox size={14} /><span>Everything else waits for one summary at 6:30 AM</span></div>
      </div>
      <div className="row gap">
        <button className="btn btn-primary" onClick={m.applyShift}><IconMoon size={15} /> Turn on shift quiet hours</button>
        <button className="btn btn-ghost" onClick={m.goAlerts}>Fine-tune</button>
      </div>
    </div>
  );
}
