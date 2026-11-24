import { useState } from 'react';
import type { AppModel } from './App';
import {
  ALERTS, CATEGORIES, INITIAL_SETTINGS, fmtTime, minsToLabel, outcome, shiftPreset,
  type Category, type CategoryId, type Outcome, type Settings,
} from './data';
import { IconBell, IconBellOff, IconInbox, IconMoon, IconShield, IconX } from './icons';

const GROUPS: Category['group'][] = ['Village', 'Guild', 'Friends & trades', 'Shop & news'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_OPTS = Array.from({ length: 48 }, (_, i) => i * 30);

function countChanges(a: Settings, b: Settings) {
  let n = 0;
  for (const c of CATEGORIES) {
    if (a.enabled[c.id] !== b.enabled[c.id]) n++;
    if (a.breakthrough[c.id] !== b.breakthrough[c.id]) n++;
  }
  (['tradeFrom', 'quietTradeFrom', 'quietOn', 'quietStart', 'quietEnd', 'digest'] as const).forEach((k) => {
    if (a[k] !== b[k]) n++;
  });
  if (a.quietDays.join() !== b.quietDays.join()) n++;
  return n;
}

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  );
}

export default function AlertsView({ m, dirty }: { m: AppModel; dirty: boolean }) {
  const d = m.draft;
  const set = (patch: Partial<Settings>) => m.setDraft({ ...d, ...patch });
  const setCat = (key: 'enabled' | 'breakthrough', id: CategoryId, v: boolean) =>
    m.setDraft({ ...d, [key]: { ...d[key], [id]: v } });

  const tonightCount = (id: CategoryId) => ALERTS.filter((a) => a.cat === id).length;
  const outcomes = ALERTS.map((a) => ({ a, o: outcome(a, d, m.close, m.others) }));
  const by = (o: Outcome) => outcomes.filter((x) => x.o === o);
  const delivered = by('delivered');
  const held = by('held');
  const silenced = [...by('off'), ...by('filtered')];
  const presetActive = JSON.stringify(shiftPreset(d)) === JSON.stringify(d);
  const changes = countChanges(d, m.saved);

  return (
    <main className="alerts-view">
      <div className="alerts-main">
        <div className="page-head">
          <div>
            <div className="eyebrow">Alert settings · applies to your phone</div>
            <h1>What’s allowed to interrupt you</h1>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            disabled={JSON.stringify(d) === JSON.stringify(INITIAL_SETTINGS)}
            onClick={() => m.setDraft(INITIAL_SETTINGS)}
          >
            Reset to defaults
          </button>
        </div>

        <div className={`preset-banner ${presetActive ? 'active' : ''}`}>
          <div className="preset-icon"><IconMoon size={22} /></div>
          <div className="preset-text">
            <strong>Shift setup</strong>
            <span>
              Quiet 10 PM–6:30 AM. Only the guild event deadline and trades from close friends ({m.close.join(', ')}) get through.
              The rest waits for a morning summary. Daytime alerts stay as they are.
            </span>
          </div>
          {presetActive ? (
            <span className="preset-on">Applied{dirty ? ' (not saved yet)' : ''}</span>
          ) : (
            <button className="btn btn-primary" onClick={() => m.setDraft(shiftPreset(d))}>Use shift setup</button>
          )}
        </div>

        <div className="cat-legend">
          <span>Alert type</span>
          <span className="cl-count">Tonight</span>
          <span className="cl-break">Break through quiet hours</span>
          <span className="cl-on">On</span>
        </div>

        {GROUPS.map((g) => (
          <div className="cat-group" key={g}>
            <div className="change-label">{g}</div>
            {CATEGORIES.filter((c) => c.group === g).map((c) => {
              const on = d.enabled[c.id];
              const bt = d.breakthrough[c.id];
              const n = tonightCount(c.id);
              const changed = on !== m.saved.enabled[c.id] || bt !== m.saved.breakthrough[c.id];
              return (
                <div key={c.id} className={`cat-row ${on ? '' : 'off'} ${changed ? 'changed' : ''}`}>
                  <div className="cat-main">
                    <div className="cat-name">{c.name}</div>
                    <div className="cat-desc">{c.desc}</div>
                    {c.id === 'trades' && on && (
                      <div className="trade-rules">
                        <div className="rule">
                          <span>Accept requests from</span>
                          <div className="seg small-seg">
                            {(['anyone', 'friends', 'close'] as const).map((v) => (
                              <button key={v} className={d.tradeFrom === v ? 'on' : ''} onClick={() => set({ tradeFrom: v })}>
                                {v === 'anyone' ? 'Anyone' : v === 'friends' ? `Friends (${m.close.length + m.others.length})` : `Close friends (${m.close.length})`}
                              </button>
                            ))}
                          </div>
                        </div>
                        {bt && d.quietOn && d.tradeFrom !== 'close' && (
                          <div className="rule">
                            <span>During quiet hours, only from</span>
                            <div className="seg small-seg">
                              {(['close', 'friends'] as const).map((v) => (
                                <button key={v} className={d.quietTradeFrom === v ? 'on' : ''} onClick={() => set({ quietTradeFrom: v })}>
                                  {v === 'close' ? `Close friends (${m.close.length})` : 'All friends'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`cat-count ${n ? '' : 'zero'}`}>{n || '—'}</span>
                  <label className={`bt ${!d.quietOn || !on ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on && bt}
                      disabled={!d.quietOn || !on}
                      onChange={(e) => setCat('breakthrough', c.id, e.target.checked)}
                    />
                    <span className="bt-box" />
                    <span className="bt-text">{!d.quietOn ? 'Quiet hours off' : bt && on ? 'Gets through' : 'Waits'}</span>
                  </label>
                  <Toggle on={on} label={`${c.name} alerts`} onChange={(v) => setCat('enabled', c.id, v)} />
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ height: 80 }} />
      </div>

      <aside className="alerts-side">
        <QuietCard d={d} set={set} />
        <Replay delivered={delivered.map((x) => x.a)} held={held.length} silenced={silenced.length} digest={d.digest} quietEnd={d.quietEnd} />
        <Tiers m={m} />
      </aside>

      {dirty && (
        <div className="save-bar" role="region" aria-label="Unsaved changes">
          <span>
            <strong>{changes} unsaved change{changes === 1 ? '' : 's'}</strong> · tonight that’s {delivered.length} of {ALERTS.length} alerts reaching you
          </span>
          <div className="row gap">
            <button className="btn btn-ghost" onClick={m.discardDraft}>Discard</button>
            <button className="btn btn-primary" onClick={m.saveDraft}>Save alert settings</button>
          </div>
        </div>
      )}
    </main>
  );
}

function QuietCard({ d, set }: { d: Settings; set: (p: Partial<Settings>) => void }) {
  const hrs = ((d.quietEnd - d.quietStart + 1440) % 1440) / 60;
  return (
    <div className={`card quiet-card ${d.quietOn ? 'on' : ''}`}>
      <div className="card-head">
        <div>
          <div className="eyebrow"><IconMoon size={13} /> Quiet hours</div>
          <h2>{d.quietOn ? `${minsToLabel(d.quietStart)} – ${minsToLabel(d.quietEnd)}` : 'Off'}</h2>
        </div>
        <Toggle on={d.quietOn} label="Quiet hours" onChange={(v) => set({ quietOn: v })} />
      </div>
      <div className={`quiet-body ${d.quietOn ? '' : 'dim'}`}>
        <div className="time-row">
          <label>
            <span>From</span>
            <select value={d.quietStart} disabled={!d.quietOn} onChange={(e) => set({ quietStart: +e.target.value })}>
              {TIME_OPTS.map((t) => <option key={t} value={t}>{minsToLabel(t)}</option>)}
            </select>
          </label>
          <label>
            <span>Until</span>
            <select value={d.quietEnd} disabled={!d.quietOn} onChange={(e) => set({ quietEnd: +e.target.value })}>
              {TIME_OPTS.map((t) => <option key={t} value={t}>{minsToLabel(t)}</option>)}
            </select>
          </label>
          <span className="muted small hrs">{hrs}h</span>
        </div>
        <div className="days" role="group" aria-label="Nights quiet hours start">
          {DAYS.map((l, i) => (
            <button
              key={i}
              disabled={!d.quietOn}
              aria-pressed={d.quietDays[i]}
              title={`${DAY_NAMES[i]} night`}
              className={d.quietDays[i] ? 'on' : ''}
              onClick={() => set({ quietDays: d.quietDays.map((v, j) => (j === i ? !v : v)) })}
            >
              {l}
            </button>
          ))}
          <span className="muted small">nights</span>
        </div>
        <label className="digest">
          <Toggle on={d.digest} disabled={!d.quietOn} label="Morning summary" onChange={(v) => set({ digest: v })} />
          <span>
            <strong>Morning summary</strong>
            <span className="muted small">Held alerts arrive as one notification at {minsToLabel(d.quietEnd)}</span>
          </span>
        </label>
      </div>
    </div>
  );
}

function Replay({ delivered, held, silenced, digest, quietEnd }: {
  delivered: typeof ALERTS; held: number; silenced: number; digest: boolean; quietEnd: number;
}) {
  return (
    <div className="card replay">
      <div className="card-head">
        <div>
          <div className="eyebrow">Tonight, replayed with these settings</div>
          <h2><span className="big">{delivered.length}</span> of {ALERTS.length} would buzz</h2>
        </div>
      </div>
      <div className="replay-bar" aria-hidden="true">
        <span className="r-del" style={{ flex: delivered.length }} />
        <span className="r-held" style={{ flex: held }} />
        <span className="r-off" style={{ flex: silenced }} />
      </div>
      <div className="replay-legend">
        <span><i className="sw r-del" /> {delivered.length} buzz</span>
        <span><i className="sw r-held" /> {held} held{digest ? ` → ${minsToLabel(quietEnd)} summary` : ' silently'}</span>
        <span><i className="sw r-off" /> {silenced} off</span>
      </div>
      <ul className="replay-list">
        {delivered.map((a) => (
          <li key={a.id}>
            <IconBell size={13} />
            <span>{a.title}</span>
            <time>{fmtTime(a.at)}</time>
          </li>
        ))}
        {delivered.length === 0 && (
          <li className="muted"><IconBellOff size={13} /> Nothing would have buzzed</li>
        )}
      </ul>
    </div>
  );
}

function Tiers({ m }: { m: AppModel }) {
  const [adding, setAdding] = useState('');
  const remove = (n: string) => {
    m.setTiers(m.close.filter((x) => x !== n), [...m.others, n].sort((a, b) => a.localeCompare(b)));
    m.toast(`${n} moved to friends`);
  };
  const add = (n: string) => {
    if (!n) return;
    m.setTiers([...m.close, n], m.others.filter((x) => x !== n));
    setAdding('');
    m.toast(`${n} is now a close friend`);
  };
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="eyebrow"><IconShield size={13} /> Friend tiers</div>
          <h2>{m.close.length} close · {m.others.length} friends</h2>
        </div>
      </div>
      <div className="chips">
        {m.close.map((n) => (
          <span key={n} className="chip">
            <span className="av av-close sm">{n.charAt(0).toUpperCase()}</span>
            {n}
            <button aria-label={`Remove ${n} from close friends`} onClick={() => remove(n)}><IconX size={12} /></button>
          </span>
        ))}
      </div>
      <div className="add-row">
        <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Choose a friend to add">
          <option value="">Add a close friend…</option>
          {[...m.others].sort((a, b) => a.localeCompare(b)).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" disabled={!adding} onClick={() => add(adding)}>Add</button>
      </div>
      <div className="muted small tier-note">
        <IconInbox size={13} /> Close friends can be allowed through quiet hours. Tier changes apply right away.
      </div>
    </div>
  );
}
