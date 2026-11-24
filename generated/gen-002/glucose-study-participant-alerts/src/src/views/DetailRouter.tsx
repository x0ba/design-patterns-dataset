import { EVENT_BY_ID, RULE_BY_ID, type AlertEvent, type Handling } from '../data/alerts';
import { participant } from '../data/roster';
import { Badge, Facts, Panel, type Tone } from '../components/ui';
import { closureOf } from '../state/derive';
import { useStore } from '../state/store';
import type { Selection } from '../state/types';
import { NOW, durationLabel, hhmm, stamp } from '../lib/time';
import { GapPanel } from './GapPanel';
import { ParticipantDetail } from './ParticipantDetail';
import { SnoozePanel } from './SnoozePanel';
import { TriagePanel } from './TriagePanel';

const HANDLING_LABEL: Record<Handling, string> = {
  delivered: 'Delivered when it fired',
  held: 'Held by quiet hours (22:00 to 06:00); released 06:00',
  escalated: 'Escalated to the on-call coordinator',
  suppressed: 'Suppressed by an active snooze',
};

const SEVERITY_TONE: Record<string, Tone> = {
  Safety: 'safety',
  Protocol: 'protocol',
  Advisory: 'advisory',
  Info: 'info',
};

export function DetailRouter({ selection }: { selection: Selection }) {
  if (selection.kind === 'participant') {
    return <ParticipantDetail pid={selection.pid} />;
  }
  if (selection.kind === 'snooze') {
    return <SnoozePanel pid={selection.pid} ruleId={selection.ruleId} />;
  }
  return <EventRouter id={selection.id} />;
}

function EventRouter({ id }: { id: string }) {
  const { state } = useStore();
  const event = EVENT_BY_ID[id];
  if (!event) {
    return <div className="notice">That alert is no longer in the queue.</div>;
  }
  const closed = !!closureOf(event, state);
  if (event.ruleId === 'SAFE-00') return <TriagePanel event={event} />;
  if ((event.ruleId === 'GAP-06' || event.ruleId === 'GAP-03' || event.ruleId === 'GAP-12') && !closed) {
    return <GapPanel event={event} />;
  }
  return <EventDetail event={event} />;
}

export function EventDetail({ event }: { event: AlertEvent }) {
  const { state } = useStore();
  const p = participant(event.pid);
  const rule = RULE_BY_ID[event.ruleId];
  const closure = closureOf(event, state);
  return (
    <div className="detail-stack">
      <div className="detail-head">
        <div>
          <div className="eyebrow">Alert {event.id}</div>
          <h2>
            {rule.name}
          </h2>
          <p className="sub">
            {p.id} · {stamp(event.at)}
          </p>
        </div>
        <div className="head-badges">
          <Badge tone={SEVERITY_TONE[rule.severity]}>{rule.severity}</Badge>
          <Badge tone={event.handling === 'escalated' && !closure ? 'safety' : 'muted'}>
            {closure ? 'Closed' : event.handling === 'escalated' ? 'Open' : 'Logged'}
          </Badge>
        </div>
      </div>

      <Panel title="Event">
        <p>{event.message}</p>
        <Facts
          rows={[
            ['Rule', `${rule.id} · ${rule.action}`],
            ['Severity', rule.severity],
            ['Quiet hours', rule.bypassesQuiet ? 'Always delivered' : 'Held 22:00 to 06:00'],
            ['Handling', HANDLING_LABEL[event.handling]],
            ['Time', `${hhmm(event.at)} (${durationLabel(NOW - event.at)} ago)`],
          ]}
        />
      </Panel>

      {closure && (
        <Panel title="Closure">
          <div className="notice notice-ok">
            <strong>{stamp(closure.at)} · {closure.by}</strong>
            <div>{closure.note}</div>
          </div>
        </Panel>
      )}
    </div>
  );
}
