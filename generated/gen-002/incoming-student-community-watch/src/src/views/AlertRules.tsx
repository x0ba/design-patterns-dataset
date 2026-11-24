import { useMemo, useState } from 'react';
import { useStore, nowMs } from '../store';
import {
  CATEGORIES, CURRENT_RULES, SUGGESTED_RULES, ESCALATE_LABEL, WINDOWS, simulate, catById, inSession,
  type Rules, type Route, type CatId, type EscalateTo, type AlertEvent,
} from '../data/alerts';
import { ME } from '../data/community';
import { Btn, Check, Pill, hhmm, dayTime } from '../components/ui';

const ROUTES: { id: Route; label: string; hint: string }[] = [
  { id: 'now', label: 'Interrupt me', hint: 'Immediately, on the channels below' },
  { id: 'digest', label: 'Digest', hint: 'Bundled into your digest' },
  { id: 'leaders', label: 'Leaders', hint: 'Goes to the covering leader; counted in your digest' },
  { id: 'off', label: 'Off', hint: 'Stays in the queue only' },
];

const hours = Array.from({ length: 24 }, (_, i) => i);
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

function RouteSeg({ value, onChange, critical }: { value: Route; onChange: (r: Route) => void; critical: boolean }) {
  return (
    <div className="seg seg-route" role="radiogroup">
      {ROUTES.map((r) => (
        <button key={r.id} role="radio" aria-checked={value === r.id} title={r.hint}
          className={`${value === r.id ? 'on' : ''} r-${r.id}${critical && value === r.id && r.id !== 'now' ? ' risky' : ''}`}
          onClick={() => onChange(r.id)}>{r.label}</button>
      ))}
    </div>
  );
}

function EventLine({ e, tag }: { e: AlertEvent; tag?: string }) {
  const c = catById(e.cat);
  return (
    <li className="ev-line">
      <span className="mono">{hhmm(e.at)}</span>
      <span className={`ev-cat ${c.critical ? 'crit' : ''}`}>{c.label}</span>
      <span className="ev-text">{e.text}{e.source === 'detection' && <span className="muted"> · auto-detected</span>}</span>
      {tag && <span className="ev-tag">{tag}</span>}
    </li>
  );
}

export default function AlertRules() {
  const saved = useStore((s) => s.rules);
  const savedAt = useStore((s) => s.rulesSavedAt);
  const act = useStore((s) => s.act);
  const [draft, setDraft] = useState<Rules>(saved);
  const [win, setWin] = useState<(typeof WINDOWS)[number]['id']>('week');
  const [tested, setTested] = useState<number | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const from = WINDOWS.find((w) => w.id === win)!.from;

  const base = useMemo(() => simulate(CURRENT_RULES, from), [from]);
  const sim = useMemo(() => simulate(draft, from), [draft, from]);
  const maxDay = Math.max(1, ...base.perDay.map((d) => d.count));

  const setRoute = (id: CatId, r: Route) => setDraft({ ...draft, routes: { ...draft.routes, [id]: r } });
  const toggleException = (id: CatId, v: boolean) =>
    setDraft({ ...draft, quietExceptions: v ? [...draft.quietExceptions, id] : draft.quietExceptions.filter((x) => x !== id) });

  const save = () => act('Alert rules saved — active now', () => ({ rules: draft, rulesSavedAt: nowMs() }),
    { log: `Alert rules updated: interrupt for ${CATEGORIES.filter((c) => draft.routes[c.id] === 'now').map((c) => c.label.toLowerCase()).join(', ')}; ${draft.sessionMode === 'sms' ? 'SMS during sessions' : 'push during sessions'}${draft.escalateTo !== 'none' ? `; escalate after ${draft.escalateAfter} min to ${ESCALATE_LABEL[draft.escalateTo]}` : ''}` });

  const critCats = CATEGORIES.filter((c) => c.critical);
  const routineCats = CATEGORIES.filter((c) => !c.critical);
  const criticalMissed = sim.criticalNotImmediate;
  const wbToday = { cur: '11:02 · push while you were in Session C (unread)', next: '' };
  const wbDetect = draft.includeDetections && draft.routes.wellbeing === 'now';
  wbToday.next = draft.routes.wellbeing !== 'now' ? 'Not an interruption under this draft' :
    `${wbDetect ? '10:49' : '11:02'} · ${draft.sessionMode === 'sms' && draft.channels.sms ? 'SMS + push' : 'push'} during Session C` +
    (draft.escalateTo !== 'none' && draft.escalateAfter > 0 ? ` → ${ESCALATE_LABEL[draft.escalateTo].split(' ·')[0]} at ${wbDetect ? hhmm(new Date(2026, 7, 13, 10, 49 + draft.escalateAfter).getTime()) : hhmm(new Date(2026, 7, 13, 11, 2 + draft.escalateAfter).getTime())} if unacknowledged` : '');

  const rowFor = (c: (typeof CATEGORIES)[number]) => (
    <tr key={c.id}>
      <td>
        <div className="rule-label">{c.label}</div>
        <div className="muted small">{c.desc}</div>
      </td>
      <td><RouteSeg value={draft.routes[c.id]} onChange={(r) => setRoute(c.id, r)} critical={c.critical} /></td>
      <td className="center">
        <input type="checkbox" aria-label={`${c.label} during quiet hours`} disabled={draft.routes[c.id] !== 'now' || !draft.quietEnabled}
          checked={draft.quietExceptions.includes(c.id) && draft.routes[c.id] === 'now'} onChange={(e) => toggleException(c.id, e.target.checked)} />
      </td>
    </tr>
  );

  return (
    <div className="page rules-page">
      <div className="page-head">
        <div>
          <h1>Alert rules</h1>
          <p className="page-sub">Choose what interrupts you, what waits for the digest, and what goes straight to leaders. The replay on the right shows what this week would have looked like.</p>
        </div>
        <div className="row-gap">
          <Btn onClick={() => setDraft(SUGGESTED_RULES)} disabled={JSON.stringify(draft) === JSON.stringify(SUGGESTED_RULES)}>Use suggested: safety, wellbeing &amp; money only</Btn>
        </div>
      </div>

      <div className="rules-grid">
        <div className="rules-editor">
          <section className="rcard">
            <h2>What reaches you</h2>
            <table className="rule-table">
              <thead><tr><th>Category</th><th>Route</th><th className="center">Through quiet hours</th></tr></thead>
              <tbody>
                <tr className="group-row"><td colSpan={3}>Needs staff fast</td></tr>
                {critCats.map(rowFor)}
                <tr className="group-row"><td colSpan={3}>Routine questions & conduct</td></tr>
                {routineCats.map(rowFor)}
              </tbody>
            </table>
            <Check checked={draft.includeDetections} onChange={(v) => setDraft({ ...draft, includeDetections: v })}>
              Also alert on <b>auto-detected</b> signals (distress language, payment terms from unverified accounts) — not only on student reports
            </Check>
          </section>

          <section className="rcard">
            <h2>When you’re away from your desk</h2>
            <div className="field-label">Interruptions go to</div>
            <div className="row-gap wrap">
              <Check checked={draft.channels.desk} onChange={(v) => setDraft({ ...draft, channels: { ...draft.channels, desk: v } })}>This console (sound)</Check>
              <Check checked={draft.channels.push} onChange={(v) => setDraft({ ...draft, channels: { ...draft.channels, push: v } })}>Phone push</Check>
              <Check checked={draft.channels.sms} onChange={(v) => setDraft({ ...draft, channels: { ...draft.channels, sms: v } })}>Text message to •••• {ME.phoneLast4}</Check>
            </div>
            <div className="field-label">During orientation sessions <span className="muted">(from your calendar — next: Session D, 13:30–15:00)</span></div>
            <div className="seg">
              <button className={draft.sessionMode === 'same' ? 'on' : ''} onClick={() => setDraft({ ...draft, sessionMode: 'same' })}>Same as at desk</button>
              <button className={draft.sessionMode === 'sms' ? 'on' : ''} onClick={() => setDraft({ ...draft, sessionMode: 'sms', channels: { ...draft.channels, sms: true } })}>Text message + silent push</button>
            </div>
            <div className="field-label">If you don’t acknowledge a safety, wellbeing or money alert</div>
            <div className="row-gap wrap">
              <span>within</span>
              <select className="select" value={draft.escalateAfter} onChange={(e) => setDraft({ ...draft, escalateAfter: Number(e.target.value) as Rules['escalateAfter'] })} aria-label="Minutes">
                <option value={0}>— never —</option><option value={5}>5 min</option><option value={10}>10 min</option><option value={15}>15 min</option>
              </select>
              <span>send it to</span>
              <select className="select" value={draft.escalateTo} onChange={(e) => setDraft({ ...draft, escalateTo: e.target.value as EscalateTo })} aria-label="Escalate to">
                {(Object.keys(ESCALATE_LABEL) as EscalateTo[]).map((k) => <option key={k} value={k}>{ESCALATE_LABEL[k]}</option>)}
              </select>
            </div>
            {(draft.escalateAfter === 0) !== (draft.escalateTo === 'none') && <div className="warn-line">Pick both a time and a person, or escalation won’t happen.</div>}
            <div className="row-gap" style={{ marginTop: 12 }}>
              <Btn small kind="ghost" onClick={() => setTested(nowMs())} disabled={!draft.channels.sms && !draft.channels.push}>Send a test alert to my phone</Btn>
              {tested && <span className="muted small">Test sent {hhmm(tested)} via {[draft.channels.push && 'push', draft.channels.sms && 'text message'].filter(Boolean).join(' and ')}</span>}
            </div>
          </section>

          <section className="rcard">
            <h2>Digest & quiet hours</h2>
            <div className="row-gap wrap">
              <span>Send a digest every</span>
              <select className="select" value={draft.digestHours} onChange={(e) => setDraft({ ...draft, digestHours: Number(e.target.value) as Rules['digestHours'] })} aria-label="Digest frequency">
                <option value={1}>hour</option><option value={2}>2 hours</option><option value={4}>4 hours</option><option value={8}>8 hours</option>
              </select>
              <span className="muted small">Leader-routed items appear as counts, e.g. “9 meal-plan questions, 8 answered”.</span>
            </div>
            <div className="row-gap wrap" style={{ marginTop: 12 }}>
              <Check checked={draft.quietEnabled} onChange={(v) => setDraft({ ...draft, quietEnabled: v })}>Quiet hours from</Check>
              <select className="select" disabled={!draft.quietEnabled} value={draft.quietStart} onChange={(e) => setDraft({ ...draft, quietStart: Number(e.target.value) })} aria-label="Quiet start">{hours.map((h) => <option key={h} value={h}>{hh(h)}</option>)}</select>
              <span>to</span>
              <select className="select" disabled={!draft.quietEnabled} value={draft.quietEnd} onChange={(e) => setDraft({ ...draft, quietEnd: Number(e.target.value) })} aria-label="Quiet end">{hours.map((h) => <option key={h} value={h}>{hh(h)}</option>)}</select>
              <span className="muted small">Exceptions are set per category above.</span>
            </div>
          </section>
        </div>

        <aside className="rules-preview">
          <div className="rp-head">
            <h2>Replay</h2>
            <div className="seg seg-sm">
              {WINDOWS.map((w) => <button key={w.id} className={win === w.id ? 'on' : ''} onClick={() => setWin(w.id)}>{w.label}</button>)}
            </div>
          </div>
          <div className="rp-compare">
            <div><div className="rp-k">This morning’s rules</div><div className="rp-big muted">{base.interrupts.length}</div><div className="rp-k">interruptions</div></div>
            <div className="rp-arrow">→</div>
            <div><div className="rp-k">{dirty ? 'This draft' : savedAt ? 'Active now' : 'Unchanged'}</div><div className="rp-big">{sim.interrupts.length}</div><div className="rp-k">interruptions</div></div>
          </div>
          <dl className="rp-facts">
            <dt>Routine items that interrupted you</dt><dd>{sim.routineInterrupts}</dd>
            <dt>Sent to leaders instead</dt><dd>{sim.leaders.length}</dd>
            <dt>Waited for your digest</dt><dd>{sim.digest.length}</dd>
            <dt>Held for quiet hours</dt><dd>{sim.deferred.length}</dd>
          </dl>

          {win === 'week' && (
            <div className="bars">
              {base.perDay.map((d, i) => (
                <div className="bar-col" key={d.label}>
                  <div className="bar-pair">
                    <span className="bar cur" style={{ height: `${(d.count / maxDay) * 100}%` }} title={`Current: ${d.count}`} />
                    <span className="bar next" style={{ height: `${(sim.perDay[i].count / maxDay) * 100}%` }} title={`Draft: ${sim.perDay[i].count}`} />
                  </div>
                  <div className="bar-label">{d.label}</div>
                </div>
              ))}
              <div className="bar-legend"><span className="lg cur" />This morning’s rules <span className="lg next" />{dirty ? 'Draft' : savedAt ? 'Active now' : 'Unchanged'}</div>
            </div>
          )}

          <div className="rp-case">
            <div className="rp-k">Today’s Hartwell wellbeing post would have reached you</div>
            <div className="rp-case-row"><span className="tag">Actual</span>{wbToday.cur}</div>
            <div className="rp-case-row next"><span className="tag">{dirty ? 'Draft' : 'Now'}</span>{wbToday.next}</div>
          </div>

          {criticalMissed.length > 0 ? (
            <div className="rp-warn">
              <div className="rp-warn-title">{criticalMissed.length} safety, wellbeing or money {criticalMissed.length === 1 ? 'event' : 'events'} would <u>not</u> interrupt you right away</div>
              <ul className="ev-list">{criticalMissed.slice(-6).map((e) => <EventLine key={e.id} e={e} tag={e.source === 'detection' && !draft.includeDetections ? 'detection off' : draft.routes[e.cat] !== 'now' ? draft.routes[e.cat] : 'quiet hours'} />)}</ul>
            </div>
          ) : (
            <div className="rp-ok">Every safety, wellbeing and money event in this window reaches you immediately.</div>
          )}

          <div className="rp-k" style={{ marginTop: 14 }}>Would have interrupted you ({sim.interrupts.length})</div>
          <ul className="ev-list scroll">
            {[...sim.interrupts].reverse().map((e) => <EventLine key={e.id} e={e} tag={inSession(e.at) ? (draft.sessionMode === 'sms' && draft.channels.sms ? 'in session · text' : 'in session · push') : undefined} />)}
          </ul>
        </aside>
      </div>

      <div className={`savebar${dirty ? ' show' : ''}`}>
        <span>{dirty ? 'Unsaved changes to your alert rules' : ''}</span>
        <span className="spacer" />
        <Btn kind="ghost" onClick={() => setDraft(saved)}>Discard</Btn>
        <Btn kind="primary" onClick={save}>Save and turn on</Btn>
      </div>
      {!dirty && savedAt && <div className="saved-note">Saved {dayTime(savedAt)} · <Pill tone="green">Active</Pill></div>}
    </div>
  );
}
