import { EVENTS, RULE_BY_ID, type AlertEvent } from '../data/alerts';
import { ROSTER, participant } from '../data/roster';
import { Badge, SectionLabel, type Tone } from '../components/ui';
import { activeSnooze, closedEscalations, heldGroups, openEscalations, closureOf, type HeldGroup } from '../state/derive';
import { useStore } from '../state/store';
import type { Selection } from '../state/types';
import { HOUR, NOW, durationLabel, hhmm, sensorDay, stamp } from '../lib/time';
import { DetailRouter } from './DetailRouter';

const SEVERITY_TONE: Record<string, Tone> = {
  Safety: 'safety',
  Protocol: 'protocol',
  Advisory: 'advisory',
  Info: 'info',
};

const SNOOZABLE = new Set(['STEP-01', 'SENS-03', 'SYNC-01', 'MEAL-02']);

function isSel(sel: Selection, kind: Selection['kind'], key: string): boolean {
  if (sel.kind !== kind) return false;
  if (sel.kind === 'event') return sel.id === key;
  if (sel.kind === 'participant') return sel.pid === key;
  return false;
}

export function AttentionView() {
  const { state, dispatch } = useStore();
  const open = openEscalations(state);
  const closed = closedEscalations(state);
  const held = heldGroups().filter((g) => !activeSnooze(state, g.pid, g.ruleId));
  const heldTotal = held.reduce((n, g) => n + g.events.length, 0);
  const sensorChange = ROSTER.filter((p) => sensorDay(p.insertedMs, NOW) === 10);
  const escalatedTotal = EVENTS.filter((e) => e.handling === 'escalated').length;
  const sel = state.selection;

  const select = (s: Selection) => dispatch({ type: 'select', selection: s });

  return (
    <div className="attention">
      <aside className="queue" aria-label="Attention queue">
        <div className="tiles">
          <div className="tile">
            <span className="tile-label">Last 24 h</span>
            <strong>{EVENTS.length}</strong>
            <span className="tile-sub">events</span>
          </div>
          <div className="tile tile-safety">
            <span className="tile-label">Escalated</span>
            <strong>{escalatedTotal}</strong>
            <span className="tile-sub">{open.length} still open</span>
          </div>
          <div className="tile">
            <span className="tile-label">Held overnight</span>
            <strong>{heldTotal}</strong>
            <span className="tile-sub">released 06:00</span>
          </div>
        </div>

        <SectionLabel count={open.length}>Open escalations</SectionLabel>
        <div className="esc-list">
          {open.map((e) => (
            <EscalationCard
              key={e.id}
              event={e}
              selected={isSel(sel, 'event', e.id)}
              onSelect={() => select({ kind: 'event', id: e.id })}
            />
          ))}
          {open.length === 0 && <div className="notice notice-ok">Nothing escalated is open.</div>}
        </div>

        <SectionLabel count={sensorChange.length + openGapCount(open)}>Due today</SectionLabel>
        <ul className="due-list">
          {open
            .filter((e) => e.ruleId.startsWith('GAP'))
            .map((e) => {
              const p = participant(e.pid);
              const threshold = p.lastUploadMs + 12 * HOUR;
              return (
                <li key={`due-${e.id}`}>
                  <button type="button" className="row-btn" onClick={() => select({ kind: 'event', id: e.id })}>
                    <span className="time mono">{hhmm(threshold)}</span>
                    <span>
                      <strong>{p.id}</strong> replacement visit threshold: 12 h without data
                    </span>
                    <span className="muted">in {durationLabel(threshold - NOW)}</span>
                  </button>
                </li>
              );
            })}
          {sensorChange.map((p) => (
            <li key={`sc-${p.id}`}>
              <button type="button" className="row-btn" onClick={() => select({ kind: 'participant', pid: p.id })}>
                <span className="time mono">Today</span>
                <span>
                  <strong>{p.id}</strong> scheduled sensor change, day 10 (inserted {stamp(p.insertedMs).split(',')[0]})
                </span>
                <span className="muted">record</span>
              </button>
            </li>
          ))}
        </ul>

        <SectionLabel count={held.length}>Held overnight, released 06:00</SectionLabel>
        <p className="section-note">Non-safety alerts from 22:00 to 06:00. Safety and protocol alerts always go through.</p>
        <ul className="held-list">
          {held.map((g) => (
            <HeldRow
              key={g.key}
              group={g}
              selected={sel.kind === 'snooze' && sel.pid === g.pid && sel.ruleId === g.ruleId}
              onSnooze={() => select({ kind: 'snooze', pid: g.pid, ruleId: g.ruleId })}
              onOpen={() => select({ kind: 'participant', pid: g.pid })}
            />
          ))}
          {held.length === 0 && <li className="muted small">Nothing was held, or everything held is snoozed.</li>}
        </ul>

        {closed.length > 0 && (
          <>
            <SectionLabel count={closed.length}>Closed in the last 24 h</SectionLabel>
            <ul className="closed-list">
              {closed.map((e) => {
                const c = closureOf(e, state);
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`row-btn ${isSel(sel, 'event', e.id) ? 'selected' : ''}`}
                      onClick={() => select({ kind: 'event', id: e.id })}
                    >
                      <span className="time mono">{hhmm(e.at)}</span>
                      <span>
                        <strong>{e.pid}</strong> {RULE_BY_ID[e.ruleId].name}
                        <span className="muted block">Closed {c ? hhmm(c.at) : ''} · {c?.by}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </aside>

      <section className="detail" aria-label="Selected item">
        <DetailRouter selection={sel} />
      </section>
    </div>
  );
}

function openGapCount(open: AlertEvent[]): number {
  return open.filter((e) => e.ruleId.startsWith('GAP')).length;
}

function EscalationCard({ event, selected, onSelect }: { event: AlertEvent; selected: boolean; onSelect: () => void }) {
  const rule = RULE_BY_ID[event.ruleId];
  const p = participant(event.pid);
  return (
    <button
      type="button"
      className={`esc-card ${selected ? 'selected' : ''} ${rule.severity === 'Safety' ? 'safety' : 'protocol'}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="esc-top">
        <Badge tone={SEVERITY_TONE[rule.severity]}>{rule.severity}</Badge>
        <span className="mono">{p.id}</span>
        <span className="esc-time">{hhmm(event.at)} · open {durationLabel(NOW - event.at)}</span>
      </div>
      <strong className="esc-title">{rule.name}</strong>
      <span className="esc-msg">{event.message}</span>
      <span className="esc-cta">{selected ? 'Showing below' : 'Review'} →</span>
    </button>
  );
}

function HeldRow({
  group,
  selected,
  onSnooze,
  onOpen,
}: {
  group: HeldGroup;
  selected: boolean;
  onSnooze: () => void;
  onOpen: () => void;
}) {
  const rule = RULE_BY_ID[group.ruleId];
  const snoozeable = SNOOZABLE.has(group.ruleId);
  return (
    <li className={`held-row ${selected ? 'selected' : ''}`}>
      <div className="held-main">
        <button type="button" className="link-btn" onClick={onOpen}>
          <strong className="mono">{group.pid}</strong>
        </button>
        <span>{rule.name}</span>
        <span className="count-pill">{group.events.length}</span>
      </div>
      <div className="held-times mono">{group.events.map((e) => hhmm(e.at)).join(' · ')}</div>
      {snoozeable && (
        <div className="held-actions">
          <button type="button" className="btn small" onClick={onSnooze}>
            Snooze {group.ruleId === 'STEP-01' ? 'step alerts' : 'this alert'}…
          </button>
        </div>
      )}
    </li>
  );
}
